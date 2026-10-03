// DeepBench v7.0.649 | tests/regression/agt-181-audit-one-liners.test.mjs | AGT-181 --
// SEVEN ONE-LINE CORRECTIONS FROM THE 2026-W39 AUDIT REVIEW, AND THE PAIRED ARMS THAT KEEP EACH
// ONE CORRECTED: four wrong numbers, two retired mechanisms named as live, one lane declaration.
//
// WHAT WAS WRONG, re-measured on the unedited tree this turn rather than carried from the ticket:
//
// (1) `git show 8535c001 -- docs/runbooks/runner-cycle.md` removes 10,763 bytes and adds ONE
//     202-byte pointer line; 380980 - 10763 + 202 = 370419 exactly. The ses-413d comment said
//     "10,561 B out, 199 B in" and its own arithmetic landed on 370,618 -- 199 bytes from the
//     figure on the next line of the same sentence. `BYTES_AT_SHIP` was never wrong (379,993 since
//     v7.0.645) and is a leave-alone control here, not a target.
// (2) The AGT-138 ship card (`runner_items` 0f29c005) carried the same understated 10,561.
// (3) Two comments cited the failure-seam cost mapper by LINE -- `:1218` in its own file and
//     `:1254` from the test -- and the mapper sits at `:1255`. A self-citation by number is a
//     third home for a fact the file already owns, so both now point RELATIVELY. The one cross-file
//     citation that remains (`api/capabilities/execute.js:1297`) is kept BECAUSE it is true, and
//     arm (c) reads that exact line to prove it rather than trusting it.
// (4) `docs/kickoffs/v7.0.600-...md:7` still declared the build on the `mechanical` lane with
//     `claude-sonnet-5`. AGT-189 (v7.0.629) corrected that reading but was outside its three-file
//     cap, so the kickoff itself was never amended and `--check-kickoff` refused it.
// (5) `audit_findings_found_by_single` was dropped by migration `20260926114350`; the live enforcer
//     is trigger `audit_findings_guard()` (AGT-132 slice 2). Two comments still named the CHECK as
//     the thing refusing a joined `found_by`.
// (6) `governance_rules:OD-19` restated the once-per-day precondition AGT-175 moved INTO
//     `rankedTodayCycle()` -- a fourth home for one fact (ARCHITECTURE §19b).
// (7) `runner_cycles:7b4e2926`'s `DEVIATIONS (1)` still read 29 where the Auditor's own appended
//     correction on the same row says "It is 30 before this ship and 29 after".
//
// EVERY ARM IS PAIRED -- the corrected string present AND the wrong string absent -- because an
// arm that only looks for the new text passes on a file that carries both, which is exactly the
// state four of these seven sites were in (a correction appended beside the wrong number).
//
// ARMS (b), (f) and (g) ARE LIVE-ROW ARMS. With no SUPABASE_URL / SUPABASE_SERVICE_KEY they
// declare NOT RUN and are never counted green: a row correction cannot be proven from the repo,
// and a silent pass there would be this file lying about the half it could not read (SES-180).

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
// A NAMESPACE import: a named import of a helper this tree may not carry is a LINK-time error, and
// a file that cannot load reports one red for seven arms.
import * as verifier from "../../scripts/verifier.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const SES413D_REL = "tests/regression/ses-413d-questions-scoreboard.test.mjs";
const RECEIVABLE_REL = "api/prompt/request-receivable.js";
const EXECUTE_REL = "api/capabilities/execute.js";
const AGT176_REL = "tests/regression/agt-176-unmeasured-not-zero.test.mjs";
const KICKOFF_REL = "docs/kickoffs/v7.0.600-AGT-151-build-trial-orchestrator-lane.md";
const LEDGER_REL = "scripts/audit-ledger.js";
const RUNREVIEW_REL = "scripts/audit-run-review.js";
const SNAPSHOT_REL = "docs/governance/RULES-SNAPSHOT.md";

// The mapper both comments point at. Byte-identical in the two files, which is why naming it by
// line number was tempting and why naming it by TEXT is stable.
const MAPPER = "costUsd: mc.billed === false ? 0 : undefined,";
// The one numbered cross-file citation the correction deliberately keeps, asserted by reading it.
const EXECUTE_CITED_LINE = 1297;

const ITEM_ID = "0f29c005-d313-4e03-8e81-3782cb25f221";   // the AGT-138 ship card
const RULE_ID = "OD-19";
const CYCLE_ID = "7b4e2926-9280-4dd5-9d38-834aab69ea20";  // the AGT-177 cycle row

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

/** A live PostgREST read, or null when this environment has no credentials to make one. */
async function live(pathAndQuery) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) return null;
  const rows = await res.json();
  return Array.isArray(rows) ? rows : null;
}

const CREDS_HINT = "Export both from public.runner_secrets by name and re-run: "
  + "SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node tests/regression/run-all.js";

// ---- (a) the v7.0.608 re-pin arithmetic, re-derived from the comment's own digits --------------
// NOT a fixed string: the four numbers are parsed out of the sentence and the subtraction is done
// here, so a future edit that changes one of them and not the others goes red on the arithmetic
// instead of on a string nobody re-measured.
function armRepinArithmetic() {
  const src = read(SES413D_REL);
  const m = /([\d,]+) B out, ([\d,]+) B in \(the pointer line\): (\d+) ->\s*\/\/ (\d+) B, ([\d,]+) B under the ceiling/.exec(src);
  assert.ok(m, `${SES413D_REL} must still carry the v7.0.608 re-pin sentence in its measured form `
    + `"<out> B out, <in> B in (the pointer line): <from> -> <to> B, <slack> B under the ceiling"`);
  const n = (s) => Number(String(s).replace(/,/g, ""));
  const [out, inn, from, to] = [n(m[1]), n(m[2]), n(m[3]), n(m[4])];
  assert.strictEqual(from - out + inn, to,
    `${SES413D_REL}: the re-pin must ADD UP -- ${from} - ${out} + ${inn} = ${from - out + inn}, but the same `
    + `sentence lands on ${to}. Measured at the commit: 10,763 B came out and one 202 B pointer line went in `
    + `(git show 8535c001 -- docs/runbooks/runner-cycle.md), and 380980 - 10763 + 202 = 370419.`);
  assert.ok(!/10,561 B out, 199 B in/.test(src),
    `${SES413D_REL} must not carry the wrong pair "10,561 B out, 199 B in" -- it lands on 370,618, not on the `
    + `370419 printed one line later`);
  // THE LEAVE-ALONE CONTROL. This ticket corrects the historical prose, never the live pin -- and the
  // control is stated as "not the v7.0.608 figure" rather than as a number, because the pin moves
  // every time anyone edits the runbook (379,993 at v7.0.645, 380,270 at v7.0.648) and whether it
  // MATCHES the file is ses-424f:291's job. Pinning a value here would make this file a second home
  // for it and go red on a peer's legitimate re-pin.
  const pin = /export const BYTES_AT_SHIP = (\d+);/.exec(src);
  assert.ok(pin, `${SES413D_REL} must still export BYTES_AT_SHIP`);
  assert.notStrictEqual(Number(pin[1]), to,
    `${SES413D_REL}: BYTES_AT_SHIP must not be the v7.0.608 figure ${to} -- the ticket's claim that it "stays ${to}" `
    + `is stale; the pin is the CURRENT runbook size and only the historical prose above it was corrected`);
  assert.strictEqual(n(m[5]), 381000 - to,
    `${SES413D_REL}: "${m[5]} B under the ceiling" must still be the slack under SES-336's 381000 ceiling at ${to} B`);
  return `re-pin arithmetic (${from} - ${out} + ${inn} = ${to})`;
}

// ---- (b) the AGT-138 ship card carries the measured removal -----------------------------------
async function armShipCard() {
  const rows = await live(`runner_items?id=eq.${ITEM_ID}&select=before_after`);
  if (!rows) return { notRun: `the ${ITEM_ID} before_after read needs SUPABASE_URL / SUPABASE_SERVICE_KEY` };
  assert.strictEqual(rows.length, 1, `runner_items ${ITEM_ID} must be exactly one row, got ${rows.length}`);
  const field = String(rows[0].before_after ?? "");
  assert.ok(field.includes("lines 1860-1992, 10,763 bytes"),
    `runner_items ${ITEM_ID}.before_after must read "lines 1860-1992, 10,763 bytes" -- the measured removal at 8535c001`);
  assert.ok(!field.includes("10,561 bytes"),
    `runner_items ${ITEM_ID}.before_after must not still carry 10,561 bytes beside the corrected figure`);
  assert.ok(field.includes("370,419 bytes (from 380,980)"),
    `runner_items ${ITEM_ID}.before_after must keep the two file sizes it already had right -- this correction is `
    + `the removal figure only`);
  return "ship card 10,763 bytes";
}

// ---- (c) the failure-seam mapper is cited relatively, and the kept citation is TRUE ------------
function armMapperCitations() {
  const receivable = read(RECEIVABLE_REL);
  const agt176 = read(AGT176_REL);
  const executeLines = read(EXECUTE_REL).split("\n");

  assert.ok(receivable.includes(`cost mappers (the failure-seam mapper below, \`${EXECUTE_REL}:${EXECUTE_CITED_LINE}\`)`),
    `${RECEIVABLE_REL} must cite its OWN mapper relatively ("the failure-seam mapper below") and keep `
    + `${EXECUTE_REL}:${EXECUTE_CITED_LINE}`);
  assert.ok(agt176.includes(`cost mappers (the failure-seam mapper in that file, \`${EXECUTE_REL}:${EXECUTE_CITED_LINE}\`)`),
    `${AGT176_REL} must cite the mapper in that file relatively and keep ${EXECUTE_REL}:${EXECUTE_CITED_LINE}`);
  assert.ok(!receivable.includes("`:1218` here"),
    `${RECEIVABLE_REL} must not cite its own mapper as \`:1218\` -- the mapper is not there, and a self-citation by `
    + `line is a second home for a fact the file owns`);
  assert.ok(!agt176.includes("`:1254` there"),
    `${AGT176_REL} must not cite the mapper as \`:1254\` -- the same stale number, a third home for it`);

  // THE REFERENTS, so "below" and "in that file" are not pointing at nothing.
  const iComment = receivable.indexOf("cost mappers (the failure-seam mapper below");
  const iMapper = receivable.indexOf(MAPPER);
  assert.ok(iMapper > iComment && iComment >= 0,
    `${RECEIVABLE_REL}: the mapper "${MAPPER}" must exist BELOW the comment that says "below" `
    + `(comment at ${iComment}, mapper at ${iMapper})`);
  assert.strictEqual((executeLines[EXECUTE_CITED_LINE - 1] ?? "").trim(), MAPPER,
    `${EXECUTE_REL}:${EXECUTE_CITED_LINE} must still BE the mapper -- it is the one numbered citation this `
    + `correction keeps, so it is asserted rather than trusted; line ${EXECUTE_CITED_LINE} reads `
    + `"${(executeLines[EXECUTE_CITED_LINE - 1] ?? "").trim()}"`);
  return `mapper cited relatively (${EXECUTE_REL}:${EXECUTE_CITED_LINE} verified)`;
}

// ---- (d) the v7.0.600 kickoff declares the lane it actually ran on -----------------------------
function armLaneDeclaration() {
  const text = read(KICKOFF_REL);
  const line7 = text.split("\n")[6] ?? "";
  assert.ok(line7.startsWith("- **Model:**"), `${KICKOFF_REL}:7 must still be the Model bullet, got "${line7.slice(0, 40)}"`);
  for (const want of ["claude-opus-5", "orchestrator", "step 7(1)", "AGT-189", "v7.0.629", "three-file cap"]) {
    assert.ok(line7.includes(want), `${KICKOFF_REL}:7 must name ${want} -- AGT-189 corrected this reading at v7.0.629`);
  }
  assert.ok(!/mechanical|claude-sonnet-5/.test(line7),
    `${KICKOFF_REL}:7 must no longer declare the build on the mechanical lane with claude-sonnet-5 -- runbook step 7(1) `
    + `runs the Builder on \`orchestrator\`; the line read: "${line7}"`);
  // The cap, which is what makes this a one-line correction and not a rewrite: the file sat 83 B
  // under SES-376's ceiling, and the verifier refuses an over-cap kickoff before any other check.
  assert.strictEqual(typeof verifier.kickoffCapFinding, "function",
    "scripts/verifier.js must export kickoffCapFinding() -- the cap this correction had to fit inside");
  assert.strictEqual(verifier.kickoffCapFinding(text), null,
    `${KICKOFF_REL} is ${Buffer.byteLength(text, "utf8")} bytes against the ${verifier.KICKOFF_BYTE_CAP}-byte cap `
    + `(SES-376) -- --check-kickoff refuses an over-cap kickoff FIRST, so a longer Model line trades one refusal for another`);
  // SCOPE CONTROL: line 7 only. The Session and Feature bullets above it are untouched.
  assert.ok((text.split("\n")[5] ?? "").includes("`v7.0.600`, claimed. **Feature:** `AGT-151`"),
    `${KICKOFF_REL}:6 must be unchanged -- this correction is line 7 only`);
  return `lane declaration (${Buffer.byteLength(text, "utf8")}B within cap)`;
}

// ---- (e) the live enforcer is named where the dropped CHECK used to be ------------------------
function armFindingsGuard() {
  const ledger = read(LEDGER_REL);
  const runreview = read(RUNREVIEW_REL);
  for (const [rel, src] of [[LEDGER_REL, ledger], [RUNREVIEW_REL, runreview]]) {
    assert.ok(/trigger `audit_findings_guard\(\)`/i.test(src),
      `${rel} must name the LIVE enforcer, trigger audit_findings_guard(), where it named the CHECK`);
    assert.ok(src.includes("migration `20260926114350` dropped the CHECK `audit_findings_found_by_single`"),
      `${rel} must say which migration dropped audit_findings_found_by_single, so the next reader does not go looking for it`);
  }
  assert.ok(!ledger.includes("`audit_findings_found_by_single` (NOT VALID) refuses"),
    `${LEDGER_REL} must not present the dropped CHECK as the thing refusing a joined found_by`);
  assert.ok(!/`audit_findings_found_by_single`\n\s*\/\/ refuses a joined value/.test(runreview),
    `${RUNREVIEW_REL} must not present the dropped CHECK as the thing refusing a joined value`);
  // The surviving claims in each sentence, which a blanket delete would have taken with it.
  assert.ok(ledger.includes("rows that already carry one are history the append-only guard will not let anyone repair"),
    `${LEDGER_REL} must keep the 27 history rows claim -- only the enforcer's name changed`);
  assert.ok(runreview.includes("refuses a joined value, so this is one string, never a list"),
    `${RUNREVIEW_REL} must keep the one-string claim -- only the enforcer's name changed`);
  // SCOPE CONTROL: the two unrelated claims the kickoff left alone.
  assert.ok(ledger.includes("runner_before_images.ck_before_image_attribution"),
    `${LEDGER_REL} must keep its ck_before_image_attribution sentence -- a different constraint, still live`);
  assert.ok(ledger.includes("§19v: every INSERT is preceded by its own runner_before_images row"),
    `${LEDGER_REL} must keep its §19v sentence`);
  return "audit_findings_guard() named in both";
}

// ---- (f) OD-19 points at the function that owns the precondition -------------------------------
async function armRuleRow() {
  const KEEP_VERCEL = "the Vercel cron `10 9 * * *` was retired with its route and `vercel.json` declares no crons";
  const KEEP_CITE = "canonical: `scripts/rank-backlog.js` (`SES-346`, ledger 53)";

  // The snapshot half needs no credentials, and the tripwire (checks 9/10/11) reads it.
  const snapshot = read(SNAPSHOT_REL);
  const ruleLine = snapshot.split("\n").find(l => l.startsWith(`| ${RULE_ID} `));
  assert.ok(ruleLine, `${SNAPSHOT_REL} must carry the ${RULE_ID} row`);
  assert.ok(ruleLine.includes("`rankedTodayCycle()` in `scripts/rank-backlog.js`"),
    `${SNAPSHOT_REL}: ${RULE_ID} must CITE rankedTodayCycle() rather than restate what it decides`);
  assert.ok(!ruleLine.includes("SCHEDULED-AGENT: rank-backlog"),
    `${SNAPSHOT_REL}: ${RULE_ID} must not restate the notes-prefix mechanics -- AGT-175 moved that into the function`);
  assert.ok(ruleLine.includes(KEEP_VERCEL) && ruleLine.includes(KEEP_CITE),
    `${SNAPSHOT_REL}: ${RULE_ID} must keep the retired-cron sentence and the SES-346 / ledger-53 citation`);

  const rows = await live(`governance_rules?id=eq.${RULE_ID}&select=statement,status,enforcement,canonical_doc,superseded_by`);
  if (!rows) return { notRun: `the live ${RULE_ID} row read needs SUPABASE_URL / SUPABASE_SERVICE_KEY (the snapshot half passed)` };
  assert.strictEqual(rows.length, 1, `governance_rules ${RULE_ID} must be exactly one row, got ${rows.length}`);
  const row = rows[0];
  assert.ok(String(row.statement).includes("`rankedTodayCycle()` in `scripts/rank-backlog.js`"),
    `governance_rules ${RULE_ID}.statement must cite rankedTodayCycle() -- the registry is the authority, the snapshot its copy`);
  assert.ok(!String(row.statement).includes("SCHEDULED-AGENT: rank-backlog"),
    `governance_rules ${RULE_ID}.statement must not restate the notes-prefix / ended_at mechanics`);
  assert.ok(String(row.statement).includes(KEEP_VERCEL) && String(row.statement).includes(KEEP_CITE),
    `governance_rules ${RULE_ID}.statement must keep the retired-cron sentence and the SES-346 / ledger-53 citation`);
  assert.strictEqual(row.status, "live", `${RULE_ID}.status must stay live`);
  assert.strictEqual(row.enforcement, "script", `${RULE_ID}.enforcement must stay script`);
  assert.strictEqual(row.canonical_doc, "docs/design/2026-09-09-operational-defaults-census.md#OD-19",
    `${RULE_ID}.canonical_doc must be untouched`);
  assert.strictEqual(row.superseded_by, null, `${RULE_ID} must not be superseded by this amendment`);
  // The row and its in-repo copy must not have drifted in the same breath.
  assert.ok(ruleLine.includes(String(row.statement)),
    `${SNAPSHOT_REL}'s ${RULE_ID} row must carry the LIVE statement verbatim -- re-run scripts/export-governance-snapshot.js`);
  return "OD-19 cites rankedTodayCycle()";
}

// ---- (g) the deviation line agrees with the Auditor's correction on its own row ----------------
async function armDeviationLine() {
  const rows = await live(`runner_cycles?id=eq.${CYCLE_ID}&select=notes`);
  if (!rows) return { notRun: `the ${CYCLE_ID} notes read needs SUPABASE_URL / SUPABASE_SERVICE_KEY` };
  assert.strictEqual(rows.length, 1, `runner_cycles ${CYCLE_ID} must be exactly one row, got ${rows.length}`);
  const notes = String(rows[0].notes ?? "");
  // SCOPED TO DEVIATIONS (1), and that scoping is load-bearing: the Auditor's own correction later
  // in the same field QUOTES the old wording ("would be red 29 times on the unchanged tree"), so a
  // negative assertion over the whole field would demand the deletion of the evidence this
  // correction defers to.
  const iDev = notes.indexOf("DEVIATIONS (");
  assert.ok(iDev >= 0, `runner_cycles ${CYCLE_ID}.notes must still carry its DEVIATIONS block`);
  const iNext = notes.indexOf(" (2) ", iDev);
  assert.ok(iNext > iDev, `runner_cycles ${CYCLE_ID}.notes: could not find the end of DEVIATIONS (1)`);
  const dev1 = notes.slice(iDev, iNext);
  assert.ok(dev1.includes("red 30 times on the unchanged tree (30 of 57"),
    `runner_cycles ${CYCLE_ID} DEVIATIONS (1) must read 30 -- the Auditor measured 30 before that ship and 29 after`);
  assert.ok(dev1.includes("corrected from 29 — see STEP 9 AUDITOR below"),
    `runner_cycles ${CYCLE_ID} DEVIATIONS (1) must flag the correction, or the Auditor's appended quote reads as a `
    + `contradiction of the line above it`);
  assert.ok(!/red 29 times on the unchanged tree|\(29 of 57/.test(dev1),
    `runner_cycles ${CYCLE_ID} DEVIATIONS (1) must not still carry the 29 figure`);
  // COHERENCE CONTROL: the Auditor's own appended sentence is what this correction defers to, so
  // an edit that "fixed" the line by deleting that quote would be a different defect, not a fix.
  assert.ok(notes.includes("It is 30 before this ship and 29 after"),
    `runner_cycles ${CYCLE_ID} must keep the Auditor's appended correction verbatim -- the deviation line points at it`);
  return "DEVIATIONS (1) reads 30";
}

// EVERY ARM REPORTS, THEN THE FILE FAILS ONCE. Seven arms measured one at a time against the
// unedited tree is the whole point; a throw on the first assertion would tell a reader nothing
// about the other six. A notRun arm is neither green nor red -- it is declared.
async function run() {
  const arms = [["a", armRepinArithmetic], ["b", armShipCard], ["c", armMapperCitations],
                ["d", armLaneDeclaration], ["e", armFindingsGuard], ["f", armRuleRow],
                ["g", armDeviationLine]];
  const green = [];
  const red = [];
  const skipped = [];
  for (const [letter, fn] of arms) {
    try {
      const out = await fn();
      if (out && typeof out === "object" && out.notRun) skipped.push(`(${letter}) ${out.notRun}`);
      else green.push(`(${letter}) ${out}`);
    } catch (e) { red.push(`(${letter}) ${e.message}`); }
  }
  if (skipped.length) {
    notRun(`AGT-181 ${skipped.map(s => s.slice(0, 3)).join("")}`,
      `${skipped.length} live-row arm(s) could not be read here: ${skipped.join(" · ")}. A row correction cannot be `
      + `proven from the repo, so these arms are declared rather than passed. ${CREDS_HINT}`);
  }
  if (red.length) {
    throw new Error(`${red.length} of ${arms.length} arms red:\n       - ` + red.join("\n       - "));
  }
  console.log(`[AGT-181] ${green.join(" · ")}`);
  return green;
}

selfRun(import.meta.url, run);
export default run;
