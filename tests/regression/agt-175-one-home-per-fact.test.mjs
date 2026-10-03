// DeepBench v7.0.645 | tests/regression/agt-175-one-home-per-fact.test.mjs | AGT-175 --
// FOUR RUNBOOK LINES STOPPED RESTATING WHAT A ROW OR A FUNCTION DECIDES, AND THIS FILE IS WHAT
// KEEPS THEM POINTING INSTEAD OF SAYING IT AGAIN.
//
// THE DEFECT, measured on the unedited tree 2026-09-27 rather than recalled. Step 4c's
// once-per-day precondition existed only as PROSE: `scripts/rank-backlog.js` declared the
// `SCHEDULED-AGENT: rank-backlog` notes prefix and never read `runner_cycles` at all, so with
// cycle `90323ce7-5436-4187-9698-64b161780ac4` already ended at `2026-09-27T05:54:25.79+00:00`
// -- the same America/Chicago day -- pass one still assembled a 148,851-byte prompt and exited 3.
// A sentence a reader is trusted to honour is not a guard. The other three lines had rotted the
// way a restated fact always does: step 5(b) still said the executing projects were "three today"
// where the live board read five, and step 7 still offered `partial` as a cycle close although
// `runner_cycles_outcome_check` REJECTS it (a probe insert answers 400 / 23514, and `partial`
// appears 0 times in 1,000 rows).
//
// WHAT EACH ARM CAN ACTUALLY GO RED ON, because an arm that cannot fail pins nothing:
//
// (a) THE GUARD, BY VALUE, THROUGH AN INJECTED READER -- no network. The same-day and prior-day
//     instants are 55 minutes apart and straddle CDT midnight (05:00Z), so a fixed-offset day key
//     answers this pair wrong; only a real America/Chicago date does. The query the reader is
//     handed is asserted too, because a guard that reads the wrong table or drops `limit=1` is
//     still "a guard" by every other measure here. Plus the WIRING: `rankedTodayCycle` must be
//     called before the `projects` read, since a refusal that fires after the board read has
//     already spent what it exists to save.
// (b)-(d) THE THREE RUNBOOK LINES, each scoped to its own passage and each with a control that
//     fails a blanket delete: step 4e must KEEP the precondition sentence step 4c gave up (4e's
//     script does that check itself too, and its wording is its own home), and the five cycle
//     outcomes are read out of the runbook's own Language paragraph rather than typed in here --
//     hardcoding them would make this file the sixth home for the fact it is defending.
// (e) THE RULE ROW, through the snapshot the truth tripwire reads (checks 9/10/11), asserting BOTH
//     directions: the dead platform sentence is gone AND every word of John's is still there. A
//     test that only checked the removal would pass an edit that deleted his ruling with it.
// (f) The byte ceiling, because (b)-(d) add prose to a file that sat 997 bytes under it.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";
// A NAMESPACE import, deliberately: a named import of `rankedTodayCycle` is a LINK-time error on a
// tree where it does not exist yet, and a file that cannot load reports one red for six arms. This
// way arm (a) fails as an assertion and (b)-(f) still report their own verdicts.
import * as rankBacklog from "../../scripts/rank-backlog.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RUNBOOK_REL = "docs/runbooks/runner-cycle.md";
const SCRIPT_REL = "scripts/rank-backlog.js";
const SNAPSHOT_REL = "docs/governance/RULES-SNAPSHOT.md";
const CEILING = 381000;                       // SES-336's ceiling on the runbook
const RULE_ID = "JOHN-0925-RESEARCHER-ROUTINE";

// 10:00Z on 2026-09-27 is 05:00 CDT the same day.
const STARTED_AT = "2026-09-27T10:00:00.000Z";
// The real row this cycle measured: 05:54Z = 00:54 CDT, still 2026-09-27 in Chicago.
const SAME_DAY = "2026-09-27T05:54:25.79+00:00";
// 55 minutes earlier: 23:59 CDT on 2026-09-26. A UTC-day comparison calls this the same day.
const PRIOR_DAY = "2026-09-27T04:59:00+00:00";

const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

/** The passage between two headings, so an arm cannot be satisfied by a phrase somewhere else. */
function section(md, startsWith, endsWith) {
  const from = md.indexOf(startsWith);
  assert.ok(from >= 0, `${RUNBOOK_REL}: could not find the passage starting "${startsWith}"`);
  const to = md.indexOf(endsWith, from + startsWith.length);
  assert.ok(to > from, `${RUNBOOK_REL}: could not find "${endsWith}" after "${startsWith}"`);
  return md.slice(from, to);
}

// ---- (a) the guard, by value, through an injected reader -----------------------------------
async function armGuard() {
  const script = read(SCRIPT_REL);
  const { rankedTodayCycle, NOTES_PREFIX } = rankBacklog;
  assert.strictEqual(typeof rankedTodayCycle, "function",
    `${SCRIPT_REL} must export rankedTodayCycle() — the once-per-day precondition was prose only, and a prose guard checks nothing`);

  const asked = [];
  const reader = (rows) => (pathAndQuery) => { asked.push(pathAndQuery); return Promise.resolve(rows); };

  const hit = await rankedTodayCycle(STARTED_AT, reader([{ id: "90323ce7", ended_at: SAME_DAY }]));
  assert.deepStrictEqual(hit, { id: "90323ce7", ended_at: SAME_DAY },
    "a prior cycle that ended on the SAME America/Chicago day must come back as the row, so the caller can name it");

  assert.strictEqual(await rankedTodayCycle(STARTED_AT, reader([{ id: "x", ended_at: PRIOR_DAY }])), null,
    `${PRIOR_DAY} is 23:59 CDT on the PREVIOUS Chicago day — a re-rank is due, and a UTC-day or fixed-offset key gets this wrong`);
  assert.strictEqual(await rankedTodayCycle(STARTED_AT, reader([])), null,
    "no prior scheduled re-rank at all must read `null`, never a refusal");

  await assert.rejects(() => rankedTodayCycle(STARTED_AT, reader(null)), /non-array/,
    "a precondition read that came back non-array must THROW — answering `null` would wave an unknown day through into a second ranking");

  // The read itself: one indexed row off the right table, filtered by this job's own prefix.
  const q = asked[0];
  assert.ok(q.startsWith("runner_cycles?"), `the precondition must read runner_cycles, got "${q}"`);
  assert.ok(q.includes(encodeURIComponent(NOTES_PREFIX)),
    `the read must filter on the ${NOTES_PREFIX} notes prefix — an unfiltered read answers for somebody else's cycle`);
  assert.ok(q.includes("ended_at=not.is.null") && q.includes("order=ended_at.desc") && q.includes("limit=1"),
    `the read must take the LATEST ENDED row and only one, got "${q}"`);

  // THE WIRING. Before the board, or the refusal costs exactly what it saves.
  const iGuard = script.indexOf("await rankedTodayCycle(startedAt)");
  const iBoard = script.indexOf("projects?status=eq.executing");
  assert.ok(iGuard > 0, `${SCRIPT_REL}: passOne() must call rankedTodayCycle(startedAt)`);
  assert.ok(iGuard < iBoard,
    `${SCRIPT_REL}: the precondition must be checked BEFORE the projects read (guard at ${iGuard}, board at ${iBoard})`);
  assert.ok(/already run today \(America\/Chicago\)/.test(script),
    `${SCRIPT_REL}: the refusal must print \`already run today (America/Chicago)\` — the line step 4c now cites`);
  assert.ok(/import \{ sameChicagoDay \} from '\.\/ticket-owner\.js'/.test(script),
    `${SCRIPT_REL}: the day key must be IMPORTED from ./ticket-owner.js, never a second copy of the DST arithmetic`);

  return "guard";
}

// ---- (b) step 4c cites the script instead of restating its precondition ----------------------
function armStep4c() {
  const md = read(RUNBOOK_REL);
  const step4c = section(md, "**4c. Board re-rank", "**4d.");
  assert.ok(step4c.includes("running the command IS the check"),
    "step 4c must carry step 4e's idiom — running the command IS the check");
  assert.ok(step4c.includes("already run today"),
    "step 4c must say that `already run today` on exit 0 is the precondition answered");
  assert.ok(!/Precondition: no `runner_cycles` row/.test(step4c),
    "step 4c must NOT restate the notes-prefix/ended_at mechanics — that is what `rankedTodayCycle()` decides");
  assert.ok(!step4c.includes("the step-4b shape"),
    "step 4c must not point at step 4b for its shape — 4b is retired; the shape is the two-pass shape");

  // THE SCOPE CONTROL: 4e keeps its own sentence, so this was an edit and not a blanket delete.
  const step4e = section(md, "**4e. Ticket hygiene", "\n## ");
  assert.ok(/Precondition: no `runner_cycles` row/.test(step4e),
    "step 4e must KEEP its own precondition sentence — 4c's edit must not have deleted the phrase everywhere it appears");

  return "step-4c";
}

// ---- (c) step 5(b) reads the owner off the queue ---------------------------------------------
function armStep5b() {
  const md = read(RUNBOOK_REL);
  const clauseB = section(md, "**(b)** `--project`", "**(c)**");
  assert.ok(!/three today/.test(clauseB),
    "step 5(b) must not restate how many projects are executing — it read `three today` against a live 5");
  assert.ok(!/ranked by `priority`/.test(clauseB),
    "step 5(b) must not restate the queue's own ordering");
  assert.ok(clauseB.includes("lane_note"),
    "step 5(b) must point at the queue's first row carrying its owning project in `lane_note`");
  assert.ok(clauseB.includes("prime_directive_queue()"),
    "step 5(b) must name the function that carries the owner, so the reader knows where to look");

  return "step-5b";
}

// ---- (d) step 7 offers no cycle outcome outside the five -------------------------------------
function armStep7Outcomes() {
  const md = read(RUNBOOK_REL);
  // The five are READ from the runbook's own Language paragraph. Typing them here would make this
  // file another home for them.
  const lang = section(md, "**Language (John, 2026-08-20", "In anything John reads");
  const FIVE = [...lang.matchAll(/`([a-z_]+)`/g)].map(m => m[1])
    .filter(w => !["runner_cycles", "noop", "proposal"].includes(w));
  assert.deepStrictEqual(FIVE.slice().sort(),
    ["did_not_run", "failed", "gated_before_build", "reverted", "shipped"].sort(),
    "the Language paragraph must still name the five cycle outcomes — every assertion below is read off it");

  const bullet = section(md, "3. **`outcome = 'blocked'`", "\n\n");
  assert.ok(bullet.includes("gated_before_build"), "the blocked bullet must still close the cycle `gated_before_build`");
  assert.ok(bullet.includes("shipped"),
    "the blocked bullet must offer `shipped` for the part that genuinely finished and pushed");
  for (const retired of ["noop", "proposal"]) {
    assert.ok(!bullet.includes(`\`${retired}\``), `the blocked bullet must not name the retired outcome \`${retired}\``);
  }
  // Every status word the bullet names that is NOT one of the five must be marked as the TICKET's,
  // in the same sentence. `partial` is the case this ticket is about: the check constraint rejects
  // it on a cycle, and `scripts/settle-ship.js` settles it on the row.
  const NON_CYCLE = ["partial", "delivered", "done"];
  for (const sentence of bullet.split(/(?<=\.)\s+/)) {
    for (const word of NON_CYCLE) {
      if (!sentence.includes(`\`${word}\``)) continue;
      assert.ok(/TICKET/.test(sentence),
        `the blocked bullet offers \`${word}\` as a CYCLE close — \`runner_cycles_outcome_check\` rejects anything outside ${FIVE.join("/")}; `
        + `say it settles the TICKET or drop it. Sentence: "${sentence.trim()}"`);
    }
  }

  return `step-7-outcomes (${FIVE.length} cycle outcomes)`;
}

// ---- (e) the rule row, through the snapshot the tripwire reads -------------------------------
function armRuleRow() {
  const snapshot = read(SNAPSHOT_REL);
  const ruleLine = snapshot.split("\n").find(l => l.startsWith(`| ${RULE_ID} `));
  assert.ok(ruleLine, `${SNAPSHOT_REL} must carry the ${RULE_ID} row`);
  assert.ok(!ruleLine.includes("stays as it is"),
    `${RULE_ID} must stop saying runner step 4b "stays as it is" — AGT-138 slice 1 retired it at v7.0.608, so the rule was the stale copy`);
  assert.ok(ruleLine.includes("its own routine"),
    `${RULE_ID} must keep John's ruling that the Researcher runs as its own routine`);
  assert.ok(ruleLine.includes("researcher runs early saturday morning, so it reviews the past week"),
    `${RULE_ID} must keep John's verbatim words — the amendment touches the trailing platform sentence only`);
  assert.ok(ruleLine.includes("32091fdb") && ruleLine.includes("AGT-138"),
    `${RULE_ID} must keep its decision handle and ticket citation`);
  assert.ok(/docs\/runbooks\/runner-cycle\.md step 4b is the live home/.test(ruleLine),
    `${RULE_ID} must now POINT at the live home for step 4b rather than predicting it`);

  return "rule-row";
}

// ---- (f) the byte ceiling --------------------------------------------------------------------
// A GUARD, NOT A MUTATION CONTROL, and said so rather than counted as one: the runbook sat at
// 380,003 B before this ticket, so this arm was GREEN on the unedited tree and could only have gone
// red if (b)-(d) had spent the 997 bytes of headroom. It is here because (b)-(d) add prose to the
// file SES-336 capped.
function armByteCeiling() {
  const bytes = Buffer.byteLength(read(RUNBOOK_REL), "utf8");
  assert.ok(bytes <= CEILING,
    `${RUNBOOK_REL} is ${bytes} bytes against SES-336's ceiling of ${CEILING} — this edit had to free bytes before adding any`);
  return `byte-ceiling (${bytes}B <= ${CEILING})`;
}

// EVERY ARM REPORTS, THEN THE FILE FAILS ONCE. A test that dies on its first assertion tells a
// reader which arm broke and nothing about the other five, and the whole point of a six-arm
// mutation control is measuring each arm against the tree before the change.
async function run() {
  const arms = [["a", armGuard], ["b", armStep4c], ["c", armStep5b],
                ["d", armStep7Outcomes], ["e", armRuleRow], ["f", armByteCeiling]];
  const green = [];
  const red = [];
  for (const [letter, fn] of arms) {
    try { green.push(`(${letter}) ${await fn()}`); }
    catch (e) { red.push(`(${letter}) ${e.message}`); }
  }
  if (red.length) {
    throw new Error(`${red.length} of ${arms.length} arms red:\n       - ` + red.join("\n       - "));
  }
  console.log(`[AGT-175] ${green.join(" · ")}`);
  return green;
}

selfRun(import.meta.url, run);
export default run;
