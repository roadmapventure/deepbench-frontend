// DeepBench v7.0.862 | tests/regression/agt-487-held-source-echo.test.mjs | AGT-487 -- THE GUARD ON
// "A TICKET'S OWN JOHN SOURCE IS CITABLE ON ITS OWN ROW".
//
// WHAT IT GUARDS, and why each arm is shaped the way it is.
//
//   A  LIVE. `--prepare-list --project=tooling --json` through the real CLI, exit 3. The list is
//      TWO tickets and they are each other's control: AGT-237 holds
//      `john:runner_decisions:2c38d860-...`, a `kind='scope'` decision of John's that
//      `CANDIDATE_FILTER` does NOT hand over, so its proposal must carry the row's head as
//      `need_source_head` AND that key must be absent from `candidates`; AGT-304 holds a key that
//      IS a `john-ruling`, so it is in `candidates` and its head must be NULL -- the head is read
//      for the source the pool does not carry, never for every ticket. The head is graded against a
//      SEPARATE read of the decision row cut at `HEAD_CHARS`, never against a string pinned here:
//      John's words will change, and a pinned copy would pass by agreeing with this file.
//
//   B  OFFLINE, zero network, and the whole tooth of the ticket. `validateListVerdict()` over one
//      context: a `pass` echoing the key the ticket ALREADY HOLDS is accepted even though that key
//      is not a candidate; any OTHER non-candidate key on that same ticket is still refused and the
//      refusal still names the ticket; and a `john:` REPLACEMENT -- a different key that IS a
//      candidate -- is still refused by AGT-432's sentence (directive 0078af4d), which this change
//      must not have loosened. The exemption is for ONE row on ONE ticket, so the arm also proves
//      the second ticket gains nothing from the first ticket's held source. Dropping the
//      `src !== held` clause alone turns this arm red, which is the property worth a test.
//      It runs over a FIXTURE built with `buildListContext()` so it needs no credentials, and
//      ALSO over arm A's live context whenever arm A measured one -- the same three rules, once
//      against a shape this file controls and once against the board.
//
//   C  LIVE. The row the migration edited as DATA (pattern:2): `vc-reorganize-intent`'s `method`
//      holds `A TICKET'S OWN SOURCE IS ALWAYS CITABLE` EXACTLY ONCE and still holds
//      `0. FIT BEFORE GRADE` exactly once (AGT-486's step, which this one must not have disturbed).
//      Once, not "contains": a second apply of the patch would read as a pass on a `.includes()`
//      check. And `scripts/victoria-rows-mirror.js --check` must exit 0, so the repo's generated
//      record of the four rows cannot drift from the row this migration moved.
//
// WHY A AND C DECLARE notRun WITHOUT CREDENTIALS. The list door reads the board over PostgREST and
// the Skill row lives in Supabase; neither has an offline half. Arm B is the pure half and always
// runs. A test that silently skipped the live arms would print a green over the two things this
// ticket actually shipped (SES-180 (b)).
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO. It never runs `--apply-list`: the real apply is
// Victoria's turn, and a guard that wrote her verdict would move two live tickets every suite run
// (pattern:76). Every live read here is read-only, and no fixture row is inserted anywhere.

import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  HEAD_CHARS, CANDIDATE_HEAD, CANDIDATE_FILTER, buildListContext, validateListVerdict,
} from "../../scripts/requirement-check.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CLI = path.join(REPO, "scripts", "requirement-check.js");
const MIRROR = path.join(REPO, "scripts", "victoria-rows-mirror.js");

const BASE = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
const KEY = process.env.SUPABASE_SERVICE_KEY ?? "";
const CREDS = Boolean(BASE && KEY);

// §2's live board, named here because the arms have to say WHICH ticket they are grading. The ids
// are the subject of the ticket, not its data: the heads, scores and summaries are all read live.
const LIST = "tooling";
const HELD_TICKET = "AGT-237";          // its john: key is a `kind='scope'` decision — NOT a candidate
const CANDIDATE_TICKET = "AGT-304";     // its john: key IS a `john-ruling` — the control half

async function req(q) {
  const res = await fetch(`${BASE}/rest/v1/${q}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
  });
  const text = await res.text().catch(() => "");
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not json */ }
  return { ok: res.ok, status: res.status, text, json };
}
const describe = r => `HTTP ${r.status} ${String(r.text).slice(0, 300)}`;

function node(script, args) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: "utf8", env: process.env, timeout: 180000, maxBuffer: 64 * 1024 * 1024,
  });
}

// The three rules of arm B, over ANY context carrying the two tickets and their held keys. One
// function so the fixture and the live context are graded by the same assertions rather than by two
// copies that can disagree (pattern:14).
export function gradeHeldEcho({ ctx, heldKey, otherCandidateKey, where }) {
  const out = [];
  const say = m => out.push(`${where}: ${m}`);
  const keys = new Set(ctx.candidates.map(c => c.key));
  const score = p => (Number.isInteger(p?.need_score) && p.need_score > 0 ? p.need_score : 5);
  const held = ctx.proposals.find(p => p.backlog_id === HELD_TICKET);
  const ctrl = ctx.proposals.find(p => p.backlog_id === CANDIDATE_TICKET);
  assert.ok(held && ctrl, `${where}: the context must carry both ${HELD_TICKET} and ${CANDIDATE_TICKET}`);

  // The premise of the whole ticket: the held key is NOT in the pool it was handed.
  assert.equal(keys.has(heldKey), false,
    `${where}: ${HELD_TICKET}'s held key must NOT be a candidate — if it were, this ticket would ` +
    "have no problem to fix and the pool would have been widened (pattern:166)");
  assert.equal(keys.has(otherCandidateKey), true,
    `${where}: ${CANDIDATE_TICKET}'s key IS a candidate — the control half of every arm`);

  const answer = rows => ({
    list: ctx.list, account: "Ruled both tickets on the source each already carries", rows,
  });
  const row = (id, src, sc) => ({
    backlog_id: id, verdict: "pass", need_source: src, need_score: sc,
    reason: "the cited row asks for exactly what this ticket proposes to build",
  });
  const ctrlRow = row(CANDIDATE_TICKET, otherCandidateKey, score(ctrl));

  // (1) ACCEPTED: each ticket echoing its OWN held key. Zero refusals, not "fewer".
  const echo = validateListVerdict(answer([row(HELD_TICKET, heldKey, score(held)), ctrlRow]), ctx);
  assert.deepEqual(echo.refusals, [],
    `${where}: a pass echoing the key ${HELD_TICKET} already carries must raise NO refusal; got ` +
    JSON.stringify(echo.refusals));
  assert.equal(echo.ok, true, `${where}: and the answer as a whole is accepted`);
  say("echo accepted with zero refusals");

  // (2) REFUSED: any OTHER key that is not a candidate, on the same ticket. The exemption is for
  //     the one row the ticket holds, never a licence to compose a key.
  const invented = "john:runner_decisions:00000000-0000-0000-0000-000000000000";
  assert.equal(keys.has(invented), false, `${where}: the invented key must not be a candidate`);
  const made = validateListVerdict(answer([row(HELD_TICKET, invented, 5), ctrlRow]), ctx);
  assert.equal(made.ok, false, `${where}: a composed key on ${HELD_TICKET} is still refused`);
  assert.ok(made.refusals.some(r => r.startsWith(`${HELD_TICKET}:`) && /is not one of them/.test(r)),
    `${where}: and the refusal NAMES ${HELD_TICKET} with the membership sentence; got ` +
    JSON.stringify(made.refusals));
  say("a composed key on the same ticket is still refused by name");

  // (3) REFUSED: a `john:` REPLACEMENT -- a key that IS a candidate, but not the one the ticket
  //     holds. AGT-432's sentence (directive 0078af4d) is byte-unchanged and must still fire.
  const swap = validateListVerdict(answer([row(HELD_TICKET, otherCandidateKey, 5), ctrlRow]), ctx);
  assert.equal(swap.ok, false, `${where}: a john: replacement on ${HELD_TICKET} is still refused`);
  assert.ok(swap.refusals.some(r => r.startsWith(`${HELD_TICKET}:`) &&
    /a pass must echo it; an existing John-authored need_source is never replaced \(directive 0078af4d\)/.test(r)),
    `${where}: refused by AGT-432's own sentence, not by the membership rule; got ` +
    JSON.stringify(swap.refusals));
  // And the replacement is refused even though the key it named is a perfectly good candidate --
  // proof the echo rule, not membership, is what caught it.
  assert.equal(swap.refusals.filter(r => /is not one of them/.test(r)).length, 0,
    `${where}: the replacement key IS a candidate, so no membership refusal is expected; got ` +
    JSON.stringify(swap.refusals));
  say("a john: replacement is still refused by directive 0078af4d");

  // (4) THE EXEMPTION IS ONE TICKET WIDE. The control ticket may not cite the HELD ticket's key,
  //     which is the whole reason the head travels on the proposal and never in `candidates`.
  const borrowed = validateListVerdict(
    answer([row(HELD_TICKET, heldKey, score(held)), row(CANDIDATE_TICKET, heldKey, 5)]), ctx);
  assert.equal(borrowed.ok, false,
    `${where}: ${CANDIDATE_TICKET} may NOT cite ${HELD_TICKET}'s held key`);
  assert.ok(borrowed.refusals.some(r => r.startsWith(`${CANDIDATE_TICKET}:`) && /is not one of them/.test(r)),
    `${where}: and the refusal names ${CANDIDATE_TICKET}; got ${JSON.stringify(borrowed.refusals)}`);
  say("and no other ticket may borrow it");

  return out;
}

async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`[arm ${name}] FAIL -- ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };

  // Arm A hands its measured context to arm B. Null means arm A did not get that far, and arm B
  // grades its fixture alone rather than quietly passing over nothing.
  let liveCtx = null;
  let liveHeld = null;
  let liveCtrl = null;

  if (!CREDS) {
    notRun(`AGT-487 arm A — --prepare-list --project=${LIST} against the live board`,
      "SUPABASE_URL / SUPABASE_SERVICE_KEY are absent. The list door reads the projects, the " +
      "charters, the tickets and the row behind each held source over PostgREST; there is no " +
      "offline half of any of them. Run with node --env-file-if-exists=.env.local " +
      "tests/regression/run-all.js, or with the two secrets exported inline from " +
      "public.runner_secrets.");
    notRun("AGT-487 arm C — the vc-reorganize-intent method the migration edited",
      "the step the migration appended lives in skill_profiles and the mirror check reads the " +
      "same four rows over PostgREST; there is nothing in the repo to grade them against.");
  } else {
    // ---- A. THE DOOR, over the live board --------------------------------------------------------
    await arm(`A --prepare-list ${LIST}: the held source travels on its own proposal`, async () => {
      const prep = node(CLI, ["--prepare-list", `--project=${LIST}`, "--json"]);
      assert.equal(prep.status, 3,
        `--prepare-list must exit 3 (awaiting her ONE answer); got ${prep.status} stderr=${String(prep.stderr).slice(0, 800)}`);
      const prepared = JSON.parse(prep.stdout);
      assert.equal(prepared.list, LIST, "the context names the list it was given");
      assert.equal(prepared.tickets, 2,
        `${LIST} holds EXACTLY the two tickets this ticket was designed against; got ` +
        `${prepared.tickets} — if the board has moved, the board is right: re-measure (kickoff §7)`);
      const ctx = prepared.context;
      const ids = ctx.proposals.map(p => p.backlog_id).sort();
      assert.deepEqual(ids, [HELD_TICKET, CANDIDATE_TICKET].sort(),
        `both tickets and nothing else; got ${JSON.stringify(ids)}`);

      const held = ctx.proposals.find(p => p.backlog_id === HELD_TICKET);
      const ctrl = ctx.proposals.find(p => p.backlog_id === CANDIDATE_TICKET);
      const keys = new Set(ctx.candidates.map(c => c.key));

      // (1) THE PREMISE: the key AGT-237 carries is NOT in the pool. Measured, never assumed.
      assert.ok(!keys.has(String(held.need_source)),
        `${HELD_TICKET}'s own need_source ${held.need_source} must NOT be among the ` +
        `${keys.size} candidates — the pool stays John's unreversed rulings (CANDIDATE_FILTER)`);

      // (2) THE HEAD, against a SEPARATE read of the row, cut at HEAD_CHARS. Nothing pinned here.
      const parts = String(held.need_source).split(":");
      const table = parts[1];
      const id = parts.slice(2).join(":");
      const col = CANDIDATE_HEAD[table];
      assert.ok(col, `${table} must have a head column in CANDIDATE_HEAD; got ${JSON.stringify(col)}`);
      const row = await req(`${table}?id=eq.${encodeURIComponent(id)}&select=id,${encodeURIComponent(col)}&limit=1`);
      assert.ok(row.ok, `the held row must read; got ${describe(row)}`);
      assert.equal((row.json ?? []).length, 1, `${table} holds exactly one row with id ${id}`);
      const want = String(row.json[0][col] ?? "").slice(0, HEAD_CHARS);
      assert.equal(held.need_source_head, want,
        `${HELD_TICKET}'s need_source_head is the first ${HEAD_CHARS} characters of its own row's ` +
        `${col}, re-read here rather than pinned; got ${JSON.stringify(held.need_source_head)}`);
      assert.ok(String(held.need_source_head).length <= HEAD_CHARS,
        "and it travels as a HEAD, never a body");

      // (3) THE CONTROL: a ticket whose key IS a candidate gets NO head. The read is for the
      //     source the pool does not carry, not for every ticket.
      assert.ok(keys.has(String(ctrl.need_source)),
        `${CANDIDATE_TICKET}'s key IS a candidate (its decision is a john-ruling); got ` +
        `${ctrl.need_source}`);
      assert.equal(ctrl.need_source_head, null,
        `${CANDIDATE_TICKET}'s need_source_head must be NULL — its head is already in the pool; ` +
        `got ${JSON.stringify(ctrl.need_source_head)}`);

      // (4) AND NOTHING WAS APPENDED TO THE POOL. Every john:runner_decisions candidate is still an
      //     unreversed `john-ruling` and the held key is not among them, which is the rule
      //     AGT-432 set and this ticket must not have widened (pattern:166).
      const johnKeys = ctx.candidates.map(c => c.key).filter(k => k.startsWith("john:runner_decisions:"));
      const rulings = await req(
        `runner_decisions?select=id&${CANDIDATE_FILTER.runner_decisions}&limit=5000`);
      assert.ok(rulings.ok, `the ruling count must read; got ${describe(rulings)}`);
      assert.equal(johnKeys.length, (rulings.json ?? []).length,
        `the pool carries ALL of John's unreversed rulings and nothing else from that table: ` +
        `${johnKeys.length} keys vs ${(rulings.json ?? []).length} rows (AGT-432)`);

      liveCtx = ctx;
      liveHeld = String(held.need_source);
      liveCtrl = String(ctrl.need_source);
      console.log(`    [AGT-487 arm A] ${prepared.tickets} ticket(s), ${ctx.candidates.length} candidate(s), ` +
        `${HELD_TICKET} head ${JSON.stringify(String(held.need_source_head).slice(0, 60))} ` +
        `(${String(held.need_source_head).length} chars, not a candidate), ${CANDIDATE_TICKET} head null`);
    });
  }

  // ---- B. THE VALIDATOR, offline: the held key is citable and nothing else loosened -------------
  await arm("B validateListVerdict: a ticket's own held key passes, every other value does not", async () => {
    const HELD = "john:runner_decisions:11111111-1111-1111-1111-111111111111";
    const CAND = "john:runner_decisions:22222222-2222-2222-2222-222222222222";
    const ctx = buildListContext({
      project: LIST, epics: ["e1"],
      tickets: [
        { backlog_id: HELD_TICKET, title: "held", description: "d", status: "partial",
          need_source: HELD, need_score: 5, need_source_head: "John: the scope decision's first words" },
        { backlog_id: CANDIDATE_TICKET, title: "control", description: "d", status: "partial",
          need_source: CAND, need_score: 5 },
      ],
      candidates: [{ key: CAND, head: "the ruling's first words" }],
      kinds: ["john:runner_decisions"],
      charters: [{ slug: LIST, charter: "A charter, so a fit is answerable at all." }],
      fingerprint: "0".repeat(32),
    });

    // buildListContext carries the head ON THE PROPOSAL and adds nothing to the pool.
    const p = ctx.proposals.find(x => x.backlog_id === HELD_TICKET);
    assert.equal(p.need_source_head, "John: the scope decision's first words",
      "the proposal carries its own need_source_head");
    assert.equal(Object.keys(p).at(-1), "need_source_head",
      "and it is the proposal's LAST key — nothing else in the context moved");
    assert.equal(ctx.candidates.length, 1, "the pool is untouched: one candidate, the control's");
    assert.deepEqual(ctx.candidates.map(c => c.key), [CAND],
      "the held key is NOT in candidates — the head travels per proposal (pattern:166)");
    // A ticket with no head at all still renders the key, so the field is additive and never required.
    assert.equal(ctx.proposals.find(x => x.backlog_id === CANDIDATE_TICKET).need_source_head, null,
      "a proposal handed no head carries null, never undefined");

    for (const line of gradeHeldEcho({ ctx, heldKey: HELD, otherCandidateKey: CAND, where: "fixture" })) {
      console.log(`    [AGT-487 arm B] ${line}`);
    }

    // THE SAME THREE RULES over the live context, when arm A measured one. One grader, two shapes.
    if (liveCtx) {
      for (const line of gradeHeldEcho({
        ctx: liveCtx, heldKey: liveHeld, otherCandidateKey: liveCtrl, where: "live context",
      })) {
        console.log(`    [AGT-487 arm B] ${line}`);
      }
    } else {
      notRun("AGT-487 arm B — the same three rules over the LIVE context",
        "arm A did not measure one — no credentials, or arm A itself went red above. The fixture " +
        "half of this arm ran and is the tooth: dropping the src !== held clause reds it either way.");
    }
  });

  // ---- C. THE ROW THE MIGRATION EDITED, and the repo's generated record of it -------------------
  if (CREDS) {
    await arm("C vc-reorganize-intent: both headings once, and the mirror still matches", async () => {
      const sp = await req("skill_profiles?slug=eq.vc-reorganize-intent&select=slug,method");
      assert.ok(sp.ok, `the Skill row must read; got ${describe(sp)}`);
      assert.equal((sp.json ?? []).length, 1, "exactly ONE vc-reorganize-intent row");
      const method = String(sp.json[0].method ?? "");

      for (const heading of ["A TICKET'S OWN SOURCE IS ALWAYS CITABLE", "0. FIT BEFORE GRADE"]) {
        const hits = method.split(heading).length - 1;
        assert.equal(hits, 1,
          `the method carries ${JSON.stringify(heading)} exactly ONCE; got ${hits} — a second ` +
          "apply of the patch would read as a pass on a contains check, and AGT-486's step must " +
          "still stand");
      }
      // The step's own instruction, in the words the migration shipped: echo it, never replace it.
      for (const phrase of [
        "3a. A TICKET'S OWN SOURCE IS ALWAYS CITABLE.",
        "the first 200 characters of the row behind it as need_source_head",
        "echo it back exactly as given and score it",
        "never turn a ticket down for want of a candidate when it already carries one",
      ]) {
        assert.ok(method.includes(phrase), `the step carries ${JSON.stringify(phrase)} verbatim`);
      }

      // THE REPO'S RECORD OF THE SAME ROW. The mirror is GENERATED (AGT-452), so a migration that
      // moved the row without regenerating it leaves the repo asserting a row that no longer exists.
      const check = node(MIRROR, ["--check"]);
      assert.equal(check.status, 0,
        `victoria-rows-mirror.js --check must exit 0; got ${check.status} ` +
        `stdout=${String(check.stdout).slice(0, 600)} stderr=${String(check.stderr).slice(0, 600)}`);
      console.log(`    [AGT-487 arm C] method ${method.length} chars, both headings once, mirror --check clean`);
    });
  }

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n    ${failures.join("\n    ")}`);
}

selfRun(import.meta.url, run);
export default run;
