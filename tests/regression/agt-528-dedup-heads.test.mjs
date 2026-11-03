// DeepBench v7.0.936 | tests/regression/agt-528-dedup-heads.test.mjs | AGT-528 -- the dedup list is
// TICKET HEADS, and a body is read on demand through one door.
//
// THE DEFECT, measured live 2026-11-02 on the unchanged tree rather than reasoned about.
// `scripts/audit-review.js` shipped `description` for every open audit ticket, so
// `--prepare --week=2026-W45` built a 1,326,589 B context of which `open_audit_tickets` was
// 1,124,882 B -- 84.8%, 1,073,978 B of it descriptions -- against a 140,425 B worklist. The
// manager needs the dedup list to answer ONE question ("has this already been filed?"), and
// `backlog_id`, `title`, `status` answer it: the title is the key the ticket measured. All 273
// heads are 47,083 B, 4.2% of the block.
//
// TWO ARMS, each discriminating -- both FAIL on the tree before the change:
//   A  STATIC, zero network. The two shapes off ONE call pair: the default context's
//      `open_audit_tickets[0]` keys are exactly [backlog_id, title, status], the count is
//      declared alongside, the note NAMES the door (so the manager is never left guessing how to
//      read a body -- recorded call (b): the door is named INSIDE the context, no prompt row
//      changes), and `fullTickets: true` restores the whole-row form (recorded call (c)). Then the
//      door's own refusal: a malformed id exits 2 BEFORE credentials are read, which is what makes
//      the refusal reachable in a container that has none. Pre-change this arm dies at import --
//      `TICKET_BODY_DOOR` does not exist -- and the key list holds `description`.
//   B  LIVE (credentials, else notRun). The two --prepare doors over the real week, compared to
//      each other rather than to a remembered number: equal exit codes, the same ids in the same
//      order, no slim row carrying `description`, every full row carrying it, the declared count
//      equal to the array length in both, and the slim block strictly smaller. Then the body door
//      over a real id, whose `description` must equal the one the full door shipped -- the only
//      assertion that proves the body is still REACHABLE and not merely absent. Pre-change the
//      slim door does not exist, so the two outputs are byte-identical and the strict-inequality
//      assertion is red.
//
// READ-ONLY BY CONSTRUCTION (pattern:76): every call is a REST GET or a --prepare; no row is
// written, no row is deleted, and the two temp files are removed in a finally.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { buildTaskContext, TICKET_BODY_DOOR } from "../../scripts/audit-review.js";
import { isoWeek } from "../../scripts/audit-ledger.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT = path.join(ROOT, "scripts/audit-review.js");
const HEAD_KEYS = ["backlog_id", "title", "status"];
const FULL_KEYS = ["backlog_id", "title", "status", "description"];

const runScript = (args, env = {}) => spawnSync(process.execPath, [SCRIPT, ...args],
  { cwd: ROOT, env: { ...process.env, ...env }, encoding: "utf8", timeout: 180000 });

// The same one call, twice, differing in exactly one argument -- so a difference in the output is
// the argument's doing and nothing else's.
const CALL = extra => buildTaskContext({
  week: "2026-W39",
  findings: [{ id: "x1", fingerprint: "fpX", iso_week: "2026-W39", kind: "other" }],
  allRows: [],
  tickets: [{ backlog_id: "AGT-999", title: "t", status: "open", description: "d", extra: 1 }],
  ...extra,
});

const blockBytes = ctx => Buffer.byteLength(JSON.stringify(ctx.open_audit_tickets), "utf8");

async function run() {
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";

  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`${name}: ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };

  // --- A. the two shapes, and the door's refusal (no network, no credentials) --------------------
  await arm("A static", async () => {
    const slim = CALL();
    assert.deepEqual(Object.keys(slim.open_audit_tickets[0]), HEAD_KEYS,
      `the default context ships heads only; got ${JSON.stringify(Object.keys(slim.open_audit_tickets[0]))}`);
    assert.equal(slim.open_audit_ticket_count, 1, "the count is declared alongside the list");
    assert.ok(String(slim.open_audit_tickets_note).includes(TICKET_BODY_DOOR),
      `the note must name the body door verbatim; got ${JSON.stringify(slim.open_audit_tickets_note)}`);

    const full = CALL({ fullTickets: true });
    assert.deepEqual(Object.keys(full.open_audit_tickets[0]), FULL_KEYS,
      `fullTickets restores the whole row; got ${JSON.stringify(Object.keys(full.open_audit_tickets[0]))}`);
    assert.equal(full.open_audit_ticket_count, 1, "the count is the row count, not the key count");

    // Credentials deliberately blanked: the id check must fire first, so the refusal is the id's
    // and not the environment's.
    const dead = { SUPABASE_URL: "", SUPABASE_SERVICE_KEY: "" };
    const bad = runScript(["--ticket=bad"], dead);
    assert.equal(bad.status, 2, `--ticket=bad must exit 2; got ${bad.status}: ${bad.stderr}`);
    assert.ok(`${bad.stderr}${bad.stdout}`.includes("backlog ids like AGT-528"),
      `the id refusal must precede creds(); got ${bad.stderr || bad.stdout}`);
  });

  // --- B. the two --prepare doors over the live week, compared to each other --------------------
  if (!url || !key) {
    notRun("B live --prepare doors",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY not set; run with node --env-file-if-exists=.env.local");
  } else {
    await arm("B live", async () => {
      const W = isoWeek(new Date());
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agt528-"));
      const slimPath = path.join(dir, "slim.json");
      const fullPath = path.join(dir, "full.json");
      try {
        const s = runScript(["--prepare", `--week=${W}`, `--out=${slimPath}`]);
        const f = runScript(["--prepare", `--week=${W}`, "--full-tickets", `--out=${fullPath}`]);
        assert.equal(s.status, f.status,
          `both doors must agree on the exit code; slim ${s.status} vs full ${f.status}: ${s.stderr}${f.stderr}`);
        if (s.status === 3) {
          notRun("B live --prepare doors", `no open or carried findings in ${W} -- exit 3, nothing to compare`);
          return;
        }
        assert.equal(s.status, 0, `--prepare must exit 0; got ${s.status}: ${s.stderr}`);

        const slim = JSON.parse(fs.readFileSync(slimPath, "utf8"));
        const full = JSON.parse(fs.readFileSync(fullPath, "utf8"));
        assert.ok(full.open_audit_tickets.length > 0, "the live week must carry at least one open audit ticket to compare");
        assert.ok(slim.open_audit_tickets.every(t => !("description" in t)),
          "no slim row may carry a description");
        assert.ok(full.open_audit_tickets.every(t => "description" in t),
          "every --full-tickets row must carry its description");
        assert.deepEqual(slim.open_audit_tickets.map(t => t.backlog_id), full.open_audit_tickets.map(t => t.backlog_id),
          "the same ids in the same order -- the heads form drops keys, never rows");
        assert.equal(slim.open_audit_ticket_count, slim.open_audit_tickets.length, "slim: the declared count is the row count");
        assert.equal(full.open_audit_ticket_count, full.open_audit_tickets.length, "full: the declared count is the row count");

        const sb = blockBytes(slim);
        const fb = blockBytes(full);
        console.log(`      open_audit_tickets: slim ${sb.toLocaleString("en-US")} B vs full ${fb.toLocaleString("en-US")} B` +
          ` = ${(sb / fb * 100).toFixed(1)}% over ${full.open_audit_tickets.length} ticket(s)`);
        assert.ok(sb < fb, `the heads block must be strictly smaller; slim ${sb} vs full ${fb}`);

        // The body is still reachable -- absence of the key is only half the ticket.
        const id = full.open_audit_tickets[0].backlog_id;
        const d = runScript([`--ticket=${id}`]);
        assert.equal(d.status, 0, `--ticket=${id} must exit 0; got ${d.status}: ${d.stderr}`);
        const rows = JSON.parse(d.stdout);
        assert.equal(rows.length, 1, `--ticket=${id} returns exactly that row; got ${rows.length}`);
        assert.equal(rows[0].backlog_id, id, "the door returns the id it was asked for");
        assert.equal(rows[0].description, full.open_audit_tickets[0].description,
          "the body read on demand is the body the whole-row form shipped");
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });
  }

  if (failures.length) throw new Error(failures.join(" | "));
}

selfRun(import.meta.url, run);
export default run;
