// DeepBench v7.0.842 | tests/regression/agt-456-exclusive-drain.test.mjs | AGT-456 -- an exclusive drain holds the pick: while an exclusive queued drain still has an open member, every ticket outside its named scope is out of the pick.
//
// WHAT THIS PINS. A queued drain-epic marked `exclusive` with at least one open member OWNS the
// pick: pick_exclusions() puts every ticket outside that drain's named scope out of the queue with
// the reason 'outside the exclusive drain'. Before AGT-456 a 9-member Tooling drain stood while
// prime_directive_queue() answered 9 strangers (AGT-398 first) and nothing anywhere named a reason.
// public.add_to_drain() is the one path that extends such a drain's fixed named scope, and it
// refuses everything else. Four arms:
//   A. the mirror docs/design/agt-456-exclusive-drain.sql holds the column, the clause's own
//      reason string, the function, the REVOKE line, the decision kind and the gate sentinel. Each
//      needle carries a mutation control (delete it and the check must name it) plus the SES-158
//      changed-nothing assert, so a control that proves nothing is itself a failure.
//   B. live (service key, else notRun), READ-ONLY: if a queued exclusive drain with an open member
//      stands on the real board, then every drain/selfbuild ref the queue names sits in such a
//      drain's scope, and runner_should_boot().detail.pick is null or one of those members. This is
//      the discriminating arm -- on origin/dev's body the same board answered strangers, so the
//      assert fails there and passes here.
//   C. live (service key, else notRun): four bad add_to_drain calls each come back HTTP 400
//      carrying their own bracket word, and none of them records a ticket-scope decision.
//   D. the positive path is declared NOT RUN here -- it names a real ticket into a real drain on
//      the live board -- and quotes the migration's own rolled-back gate instead.
//
// WHY ARM B READS RATHER THAN WRITES. pattern:76: a regression run never mutates working data.
// Reaching the clause's positive branch means standing up a drain and a stranger on the live
// board, so the migration's trailing DO block does it inside a sub-block that ends in sentinel
// P0456 -- fixtures rolled back, migration committed -- and this file quotes that instead.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MIRROR_REL = "docs/design/agt-456-exclusive-drain.sql";
const OPEN_STATUSES_EXCLUDED = ["done", "removed"];

export const NEEDLES = [
  "ADD COLUMN exclusive boolean NOT NULL DEFAULT true",
  "'outside the exclusive drain'",
  "CREATE OR REPLACE FUNCTION public.add_to_drain(",
  "REVOKE ALL ON FUNCTION public.add_to_drain(uuid, text, text, uuid, text) FROM PUBLIC, anon, authenticated;",
  "'ticket-scope'",
  "P0456",
];

// Pure: which needles the text lacks.
export function missingNeedles(text, needles = NEEDLES) {
  return needles.filter(n => !text.includes(n));
}

// Pure: the refs a queue answer names in the two build lanes.
export function buildLaneRefs(rows) {
  return rows.filter(r => r && (r.lane === "drain" || r.lane === "selfbuild") && r.ref).map(r => r.ref);
}

function readMirror() {
  const p = path.join(ROOT, MIRROR_REL);
  assert.ok(fs.existsSync(p), `${MIRROR_REL} is missing -- the migration has no mirror`);
  return fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");   // CRLF-normalised
}

async function run() {
  const results = [];

  // --- A: the mirror ----------------------------------------------------------------------------
  const sql = readMirror();
  assert.deepStrictEqual(missingNeedles(sql), [], `the mirror lacks: ${JSON.stringify(missingNeedles(sql))}`);
  for (const n of NEEDLES) {
    const mutated = sql.split(n).join("");
    assert.notStrictEqual(mutated, sql, `control: deleting ${n} changed nothing (the SES-158 failure)`);
    assert.deepStrictEqual(missingNeedles(mutated, [n]), [n], `the check did not notice ${n} gone`);
  }
  assert.deepStrictEqual(missingNeedles(sql, []), [], "no needles, no findings");
  results.push("mirror-holds-column-clause-function-revoke-kind-sentinel");

  // --- live transport ---------------------------------------------------------------------------
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!base || !key) {
    notRun("the live arms (the board's own pick, and the four refusals)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent. Run: node --env-file-if-exists=.env.local tests/regression/agt-456-exclusive-drain.test.mjs");
  } else {
    const hdr = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
    const get = async q => {
      const r = await fetch(`${base}/rest/v1/${q}`, { headers: hdr });
      if (!r.ok) assert.fail(`GET ${q} -> HTTP ${r.status}: ${await r.text().catch(() => "")}`);
      return r.json();
    };
    const rpc = async (fn, body = {}) => {
      const r = await fetch(`${base}/rest/v1/rpc/${fn}`, { method: "POST", headers: hdr, body: JSON.stringify(body) });
      if (!r.ok) assert.fail(`rpc/${fn} -> HTTP ${r.status}: ${await r.text().catch(() => "")}`);
      return r.json();
    };

    // --- B: the board's own pick, read-only -----------------------------------------------------
    const queued = await get("runner_directives?type=eq.drain-epic&status=eq.queued&select=id,exclusive,epic_id");
    const exclusive = queued.filter(d => d.exclusive === true);
    let holders = [];
    for (const d of exclusive) {
      const scope = await get(`runner_drain_scope?directive_id=eq.${d.id}&select=backlog_id,item_id`);
      if (scope.length === 0) continue;
      const ids = scope.map(s => s.item_id);
      const members = await get(`backlog_items?id=in.(${ids.join(",")})&select=id,backlog_id,status`);
      const open = members.filter(m => !OPEN_STATUSES_EXCLUDED.includes(m.status));
      if (open.length > 0) holders.push({ id: d.id, refs: scope.map(s => s.backlog_id) });
    }

    if (exclusive.length === 0 || holders.length === 0) {
      notRun("the board's own pick under an exclusive drain (arm B)",
        `the live board carries ${queued.length} queued drain-epic directive(s), ${exclusive.length} of them exclusive and `
        + `${holders.length} of those with an open member. The clause only holds the pick while one does, so there is nothing `
        + "to measure here right now -- this is the ordinary quiet-board state, not a failure. Arm D quotes the migration's "
        + "own gate, which drove the branch under rolled-back fixtures.");
    } else {
      const allowed = new Set(holders.flatMap(h => h.refs));
      const refs = buildLaneRefs(await rpc("prime_directive_queue"));
      const strangers = refs.filter(r => !allowed.has(r));
      assert.deepStrictEqual(strangers, [],
        `an exclusive drain with an open member stands (${holders.map(h => h.id).join(", ")}), so every drain/selfbuild ref `
        + `must sit in its scope -- these do not: ${JSON.stringify(strangers)}`);
      results.push("exclusive-drain-holds-every-queue-ref");

      const boot = await rpc("runner_should_boot");
      assert.strictEqual(boot.length, 1, `runner_should_boot returned ${boot.length} rows, expected 1`);
      const pick = boot[0]?.detail?.pick ?? null;
      assert.ok(pick === null || allowed.has(pick.backlog_id),
        `the boot gate's pick must be null or a member of the exclusive drain, got ${JSON.stringify(pick)}`);
      results.push("boot-pick-is-null-or-a-named-member");
    }

    // --- C: the four refusals -------------------------------------------------------------------
    const decisions = () => get("runner_decisions?select=id&kind=eq.ticket-scope");
    const before = (await decisions()).length;
    const head = holders[0] ?? null;
    const headRow = head ? exclusive.find(d => d.id === head.id) : null;

    const refuse = async (label, body, word) => {
      const r = await fetch(`${base}/rest/v1/rpc/add_to_drain`, { method: "POST", headers: hdr, body: JSON.stringify(body) });
      const text = await r.text();
      assert.strictEqual(r.status, 400, `${label}: expected HTTP 400, got ${r.status}: ${text}`);
      assert.ok(text.includes("add_to_drain: "), `${label}: the refusal is not the function's own: ${text}`);
      assert.ok(text.includes(word), `${label}: the refusal lacks "${word}": ${text}`);
    };

    // [one author] is the first check, so any directive and ticket reach it.
    await refuse("no author", {
      p_directive: head?.id ?? "00000000-0000-4000-8000-000000000456",
      p_backlog_id: "AGT-456", p_reason: "agt-456 regression probe",
    }, "[one author]");

    // [no exclusive drain]: a uuid that names no queued exclusive drain-epic row.
    await refuse("no exclusive drain", {
      p_directive: "9f1d4c7a-0b2e-4d6f-8a31-c5e70b9d4562",
      p_backlog_id: "AGT-456", p_reason: "agt-456 regression probe", p_session_name: "agt456-test",
    }, "[no exclusive drain]");

    if (!head) {
      notRun("the [already a member] and [outside the epic] refusals (arm C)",
        "both need a live queued exclusive drain with an open member to aim at, and the board carries none right now. "
        + "The [one author] and [no exclusive drain] refusals above DID run. The migration's own gate drove all four "
        + "under rolled-back fixtures (arm D).");
    } else {
      await refuse("already a member", {
        p_directive: head.id, p_backlog_id: head.refs[0],
        p_reason: "agt-456 regression probe", p_session_name: "agt456-test",
      }, "[already a member]");

      const outside = await get(
        `backlog_items?epic_id=neq.${headRow.epic_id}&status=eq.open&epic_id=not.is.null&select=backlog_id&limit=1`);
      if (outside.length === 0) {
        notRun("the [outside the epic] refusal (arm C)",
          `no open ticket outside the head drain's epic (${headRow.epic_id}) exists to aim at, so the clause cannot be probed `
          + "from here. The other refusals above DID run; the gate drove this one too (arm D).");
      } else {
        await refuse("outside the epic", {
          p_directive: head.id, p_backlog_id: outside[0].backlog_id,
          p_reason: "agt-456 regression probe", p_session_name: "agt456-test",
        }, "[outside the epic]");
      }
    }
    results.push("refusals-each-400-with-their-bracket-word");

    assert.strictEqual((await decisions()).length, before,
      "a refused add_to_drain recorded a ticket-scope decision -- validation must precede every write");
    results.push("refusals-record-no-decision");
  }

  // --- D: the positive path ---------------------------------------------------------------------
  notRun("the positive path -- the clause's own branch, and a successful add_to_drain",
    "driving it means standing a queued exclusive drain and a stranger up on the LIVE board and naming a real ticket "
    + "into a real drain's fixed scope, which a permanent regression test must never do (pattern:76, the SES-196 / "
    + "SES-218 / SES-275 refusal), and this suite reaches Supabase only over PostgREST, which cannot open a transaction "
    + "to roll a fixture back. MEASURED IN THE MIGRATION INSTEAD: `agt456_exclusive_drain`'s trailing DO block writes "
    + "its fixtures inside a sub-block that ends in sentinel P0456, so every fixture write is undone while the migration "
    + "still commits, and the outer block RAISEs -- aborting the whole migration -- unless all five cases hold. The "
    + "cases it asserts, over fixtures ZFIX-45601..3 in epic ced3a7d0 (Tooling) and a fixture exclusive drain D over "
    + "ZFIX-45601, with every other queued drain set exclusive=false, John's spend walls and the lane cap lifted: "
    + "(A) ZFIX-45601 under an undecided gated_before_build card -> the queue's drain/selfbuild refs are {} and "
    + "runner_should_boot().reason = 'gate_cards_to_rule'; (A2) that card accepted and ZFIX-45601 blocked_by "
    + "ZFIX-45603 -> refs still {}; (D) add_to_drain(D, 'ZFIX-45603', 'gate', cycle 065fca46, NULL) -> refs exactly "
    + "{ZFIX-45603}, blocked_by NULL (an open member already waits on the ticket, so its own blocker is left alone), "
    + "images 1, exactly 1 new ticket-scope decision, and four refusals -- the repeat, AGT-398, a random uuid and an "
    + "authorless call -- carrying [already a member], [outside the epic], [no exclusive drain] and [one author] with "
    + "the decision count unchanged; (B) D set status='done' -> refs contain both ZFIX-45602 and ZFIX-45603, because a "
    + "drain with no open member left holds nothing; (C) THE CONTROL, D queued again but exclusive=false with "
    + "ZFIX-45601 re-carded -> ZFIX-45602 is back in refs, which is what proves the clause reads `exclusive` rather "
    + "than merely 'a queued drain exists'. Then exactly 1 pg_proc overload of each of pick_exclusions and "
    + "add_to_drain, and add_to_drain EXECUTE reading anon=false, authenticated=false, service_role=true. Applied "
    + "2026-10-10 ~07:41Z, result {\"success\":true}. THE CAVEAT, because a false green here would be invisible: the "
    + "gate's own `AGT-456 GATE PASSED` NOTICE body was NOT relayed by the apply channel, so nobody has read it and "
    + "it is quoted nowhere. What the success flag proves is what the gate was built to prove -- the outer block "
    + "RAISEs and aborts the entire migration unless every case above holds, so a COMMITTED migration is the pass. "
    + "What was re-read live afterwards, and is quoted in the mirror's header, is the effect: the queue's "
    + "drain/selfbuild refs went from 9 strangers (AGT-398 first) to {}, all 9 strangers now carry exactly "
    + "{outside the exclusive drain}, all 9 drain members carry their own reasons and none carries that one, "
    + "pickable_count 9 -> 0 with detail.pick NULL, and the gate left zero fixture residue behind.");

  return results;
}

selfRun(import.meta.url, run);
export default run;
