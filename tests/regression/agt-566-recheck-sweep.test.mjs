// DeepBench v7.0.939 | tests/regression/agt-566-recheck-sweep.test.mjs | AGT-566 -- the recheck
// sweep. The TEN non-retired `market_records` rows that still carried one of the three wrong strings
// `AGT-470` found are swept through `public.apply_claim_recheck`: THREE `corrected` (the string is in
// a RENDERED field -- retire + one same-kind `draft` replacement carrying `supersedes`) and SEVEN
// `holds` (the string is a quoted wrong value, a `data.matrix` cell, or a source-access date --
// `data.recheck` merged into the live row, the row kept). Calls and uuids:
// docs/design/agt-566-recheck-sweep.sql. Kickoff: docs/kickoffs/v7.0.939-AGT-566-recheck-sweep.md T2.
//
//   A ROWS -- C1-C3 read `retired`, each superseded by EXACTLY ONE row (same `kind`, `draft`,
//     `data.recheck.verdict` `corrected`, `reason` starting `AGT-566 sweep`); H1-H7 read NOT
//     `retired` with verdict `holds` and the same prefix; and for all TEN live rows -- the three
//     replacements and the seven kept -- `recordHead(row).title` and `.head` hold none of the three
//     strings. `recordHead` is IMPORTED from scripts/agent-prompt.js, never re-created here: the
//     render's own 240-character head is the thing under test, so a local copy would grade this
//     test's arithmetic instead of the prompt's (AGT-550 owns that function).
//   B RENDER -- the pmm-competitors render (the live command the sweep exists for) exits 0, its
//     `records: ` line parses, none of C1-C3's ids render, each replacement id does, and no rendered
//     `title` or `head` holds any of the three strings. The whole-prompt counts and how many sit
//     inside a `"date":"2026-10-05T` value are REPORTED, never asserted: `2026-10-05` legitimately
//     survives as the `created_at` of H5 and H7, which is the row's own history and not a fact this
//     sweep may rewrite, so an assertion on a raw text count would be an assertion about creation
//     timestamps.
//
// READ-ONLY: every call here is a GET or a `--render`, which writes no row; the only file written is
// the temp `--out` prompt, deleted in `finally` (pattern:76).
//
// THE DISCRIMINATOR. The sweep is NOT findable by `AGT-566`: the writer hardcodes `'AGT-470'` into
// `record_decision`'s handle and into `data.recheck.ticket`, so arm A reads the `reason` PREFIX.
// Pre-change on `origin/dev` arm A fails at its first assertion: `fe667377`, `22215386` and
// `91aec8e4` read `draft` with 0 superseding rows, and not one of the ten rows carries
// `data.recheck` at all (measured credentialed on tree 5cdfc2a before the first call: ten rows
// non-retired, `data->'recheck'` NULL on every one). Post-sweep the same read finds 3 retired + 3
// drafts and 7 stamped `holds`.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { recordHead } from "../../scripts/agent-prompt.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MARKET = path.join(ROOT, "scripts", "market-agent.js");

// The exact select the render itself uses, so `recordHead()` sees the same columns here as there.
const RECORD_FIELDS = "id,kind,title,body,data,audience,status,created_at";
const RECORDS_PREFIX = "records: ";
const REASON_PREFIX = "AGT-566 sweep";

// The three wrong strings, named once. `WRONG` is what may never render; the date is reported only.
const WRONG = ["Grok Bot for Enterprise", "Spend Visibility module", "2026-10-05"];
const DATE_VALUE = '"date":"2026-10-05T';

// The ten rows, by the kickoff's own labels, so a failure names which call is wrong.
const CORRECTED = [
  ["C1", "fe667377-66cc-4c2e-aa6b-b9434fc5930e"],
  ["C2", "22215386-a4ad-40aa-a0f5-7260c96e9343"],
  ["C3", "91aec8e4-e608-4b90-800d-856ca90c3223"],
];
const HELD = [
  ["H1", "63aa1ad2-d138-460f-b23e-1ef9b7b281bf"],
  ["H2", "52ec2a55-2159-4f86-bd1b-7fdf56b39c95"],
  ["H3", "0f14dc6b-8311-4a1f-b30b-950e0554cfff"],
  ["H4", "ff952010-6df8-42f0-aba3-00ae969343fd"],
  ["H5", "f22e4c8d-6805-43ab-96fd-db902059a718"],
  ["H6", "e014e2cb-4f6f-4cd6-99be-2276b975ced8"],
  ["H7", "8f683e41-9329-489a-b372-7615b2372b54"],
];

const occurrences = (hay, needle) => hay.split(needle).length - 1;

// One head, checked against all three strings at once, so a failure says WHICH string in WHICH field.
function headIsClean(label, row) {
  const head = recordHead(row);
  for (const s of WRONG) {
    assert.equal(occurrences(String(head.title ?? ""), s), 0,
      `${label} (${head.id}): the rendered title must not hold "${s}"`);
    assert.equal(occurrences(String(head.head ?? ""), s), 0,
      `${label} (${head.id}): the rendered 240-character head must not hold "${s}"`);
  }
  return head;
}

async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`${name}: ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  const credentialed = Boolean(url && key);
  const svc = { apikey: key, Authorization: `Bearer ${key}` };
  const get = async (q) => {
    const r = await fetch(`${url}/rest/v1/${q}`, { headers: svc });
    assert.equal(r.status, 200, `GET ${q} -- HTTP ${r.status}`);
    return r.json();
  };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agt566-"));
  // Arm A hands arm B the replacement ids it found, so neither arm hardcodes a uuid the sweep minted.
  let replacements = [];

  try {
    await arm("A rows", async () => {
      if (!credentialed) {
        notRun("AGT-566 arm A (the ten swept rows)",
          "SUPABASE_URL + SUPABASE_SERVICE_KEY absent -- market_records is unreadable here, so the row half is UNVERIFIED. Credentialed run: STANDARDS.md Section 2 rule 5");
        return;
      }
      const ids = [...CORRECTED, ...HELD].map(([, id]) => id);
      const rows = await get(`market_records?id=in.(${ids.join(",")})&select=${RECORD_FIELDS}`);
      assert.equal(rows.length, 10, `all ten swept rows still exist (got ${rows.length}) -- a sweep destroys no row`);
      const byId = new Map(rows.map(r => [r.id, r]));

      // CORRECTED: retired, and superseded by EXACTLY ONE row. "Exactly one" is the assertion that
      // catches a rerun of a non-idempotent call, which inserts a second replacement.
      const found = [];
      for (const [label, id] of CORRECTED) {
        const row = byId.get(id);
        assert.ok(row, `${label} (${id}) is readable`);
        assert.equal(row.status, "retired", `${label} (${id}) is retired by its corrected recheck`);
        const reps = await get(`market_records?supersedes=eq.${id}&select=${RECORD_FIELDS}`);
        assert.equal(reps.length, 1,
          `${label} (${id}) is superseded by EXACTLY ONE row, not ${reps.length} -- apply_claim_recheck is not idempotent`);
        const rep = reps[0];
        assert.equal(rep.kind, row.kind, `${label}: the replacement is the SAME kind (${row.kind}), never 'correction'`);
        assert.equal(rep.status, "draft", `${label}: the replacement is a draft, so the render reads it`);
        assert.equal(rep.data?.recheck?.verdict, "corrected", `${label}: the replacement's data.recheck.verdict is 'corrected'`);
        assert.ok(String(rep.data?.recheck?.reason ?? "").startsWith(REASON_PREFIX),
          `${label}: the replacement's reason starts "${REASON_PREFIX}" -- the sweep's only findable mark (the handle is AGT-470)`);
        headIsClean(`${label} replacement`, rep);
        found.push([label, rep.id]);
      }
      replacements = found;

      // HELD: never retired (kickoff section 7), stamped `holds`, text untouched.
      for (const [label, id] of HELD) {
        const row = byId.get(id);
        assert.ok(row, `${label} (${id}) is readable`);
        assert.notEqual(row.status, "retired", `${label} (${id}) is NOT retired -- a held row is kept`);
        assert.equal(row.data?.recheck?.verdict, "holds", `${label} (${id}): data.recheck.verdict is 'holds'`);
        assert.ok(String(row.data?.recheck?.reason ?? "").startsWith(REASON_PREFIX),
          `${label} (${id}): the reason starts "${REASON_PREFIX}"`);
        const noReps = await get(`market_records?supersedes=eq.${id}&select=id`);
        assert.equal(noReps.length, 0, `${label} (${id}): a held row has no replacement`);
        headIsClean(label, row);
      }
      console.log(`    A: 3 retired + 3 replacements (${found.map(([l, i]) => `${l}=${i}`).join(" ")}), 7 held, 10 clean heads`);
    });

    await arm("B render", async () => {
      if (!credentialed) {
        notRun("AGT-566 arm B (the pmm-competitors render)",
          "SUPABASE_URL + SUPABASE_SERVICE_KEY absent -- the render cannot read market_records here, so the prompt half is UNVERIFIED. Credentialed run: STANDARDS.md Section 2 rule 5");
        return;
      }
      assert.equal(replacements.length, 3,
        "arm A must have found the three replacement ids -- arm B grades the render against them, never a hardcoded uuid");

      const out = path.join(tmp, "pmm-competitors.txt");
      const r = spawnSync(process.execPath,
        [MARKET, "--render", "--agent=nathan", "--capability=pmm-competitors", "--json", `--out=${out}`],
        { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
      assert.equal(r.status, 0, `the pmm-competitors render exits 0 (got ${r.status}: ${(r.stderr ?? "").slice(-400)})`);
      const json = JSON.parse(r.stdout.trim().split("\n").pop());
      const text = fs.readFileSync(out, "utf8");

      const line = text.split("\n").find(l => l.startsWith(RECORDS_PREFIX));
      assert.ok(line, "the rendered prompt carries a `records: ` line");
      const value = JSON.parse(line.slice(RECORDS_PREFIX.length));
      const entries = Object.values(value).flat();
      assert.ok(entries.length > 0,
        "the records section is not empty -- an empty read would pass every 'does not render' check vacuously");

      const rendered = new Set(entries.map(e => e.id));
      for (const [label, id] of CORRECTED) {
        assert.equal(rendered.has(id), false, `${label} (${id}) is retired, so it does NOT render`);
      }
      for (const [label, id] of replacements) {
        assert.equal(rendered.has(id), true, `${label}'s replacement (${id}) DOES render -- the correction reached the prompt`);
      }
      for (const e of entries) {
        for (const s of WRONG) {
          assert.equal(occurrences(String(e.title ?? ""), s), 0, `no rendered title holds "${s}" (${e.id})`);
          assert.equal(occurrences(String(e.head ?? ""), s), 0, `no rendered head holds "${s}" (${e.id})`);
        }
      }

      // REPORTED, never asserted -- see the header. The date's survivors are creation timestamps.
      const report = WRONG.map(s => `${s}=${occurrences(text, s)}`).join(" ");
      console.log(`    B: records_loaded=${json.records_loaded} prompt_bytes=${json.prompt_bytes} entries=${entries.length}`);
      console.log(`    B REPORT whole-prompt counts: ${report}`);
      console.log(`    B REPORT of the "2026-10-05" hits, ${occurrences(text, DATE_VALUE)} sit inside a ${DATE_VALUE} value`);
    });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
    assert.equal(fs.existsSync(tmp), false, "the temp render is deleted");
  }

  if (failures.length) throw new Error(`${failures.length} arm(s) failed -- ${failures.join(" | ")}`);
}

selfRun(import.meta.url, run);
export default run;
