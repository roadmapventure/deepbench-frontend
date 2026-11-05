// DeepBench v7.0.942 | tests/regression/agt-460-session-scripts.test.mjs | AGT-460
//
// WHAT THIS PINS. `AGT-460` turned the session open and close sequences into two scripts and cut
// `docs/runbooks/session-setup.md` (900 lines, read FIRST by every session, before any orientation
// read) into two flat siblings. Three arms:
//
//   A  `open-session.js --dry-run --json` names all TEN open steps, puts `age_minutes` AND `source`
//      on the meter line, and both of `agt460_session_length`'s new columns on the budget line. With
//      BOTH keys removed it exits 2 `no-credentials`, naming each of them, rather than printing a
//      plan with its database half silently missing -- which is the failure a dry run must never
//      produce. BOTH is the load-bearing word since AGT-464: `SUPABASE_LEAN_KEY` or
//      `SUPABASE_SERVICE_KEY` will each open the script, so stripping one leaves the other working
//      and the gate unproven.
//
//   B  THE DISCRIMINATOR. `close-session.js --dry-run` against a claim held by another name exits 2
//      `claim-lost` and its stdout holds NO `push`. The re-assert is a GATE, and the gate is only
//      real if it stops the run BEFORE anything leaves the worktree -- register B42, and John's
//      `q-claim-release-order` ruling, which exist because a session that ships against a ticket it
//      no longer holds leaves a tree nothing downstream can untangle.
//
//      AND THE PAIR THAT MAKES IT DISCRIMINATING. An absence is not evidence on its own: a script
//      that never prints the word at all would pass the clause above while gating nothing. So the
//      SAME command, with the REAL holder's name, must reach the send step and DOES print it. One
//      run proves the gate fires; the other proves the needle can be found when it should be
//      (`STANDARDS.md` Section 4, the LOO-013 lesson: assert WHICH branch fired).
//
//   C  The cut landed: `session-setup.md` is under 400 lines, and each moved anchor resolves in
//      `session-decisions.md` and NOT in `session-setup.md`. With the inverse control -- §3e stayed
//      and must NOT be in the new file -- because a "cut" that copied both halves into both files
//      would satisfy every forward check and leave two homes for one procedure, which is the drift
//      the move exists to end. Plus: no fenced block appears in both files.
//
// NOTHING HERE MUTATES. Arms A and B read the board and the settings; the only writes either script
// would make are behind the claim it never gets (B) and behind `--dry-run` (both). No fixture ticket
// is filed and no claim is taken, because a regression run must never claim a real board ticket.
//
// Invocation: SUPABASE_URL=… SUPABASE_LEAN_KEY=… (or SUPABASE_SERVICE_KEY=…)
//             node tests/regression/agt-460-session-scripts.test.mjs

import assert from "assert";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const OPEN = path.join(ROOT, "scripts", "open-session.js");
const CLOSE = path.join(ROOT, "scripts", "close-session.js");
const SETUP_REL = "docs/runbooks/session-setup.md";
const DECISIONS_REL = "docs/runbooks/session-decisions.md";

// The runbook's own length, as a declared ceiling rather than a measurement of the day. 900 lines is
// what AGT-460 was filed against; 400 is the bar the cut had to clear.
const SETUP_CEILING_LINES = 400;
const OPEN_STEPS = 10;

// The two anchors the cut moved, each a line that exists exactly once in the pair of files.
const MOVED_ANCHORS = [
  "### 3c. File a new backlog ticket",
  "## Reversing a decision — John's handle",
];
// The section that deliberately did NOT move -- ses-311 pins §3e in session-setup.md.
const STAYED_ANCHOR = "### 3e. Run the verifier before you write `done`";

// CRLF is normalised on read for the reason every doc test in this suite states: this repo checks
// out CRLF on Windows and LF in CI, and a substring test that disagrees between the two is a false
// green on one of them.
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

// AGT-464: EITHER key opens the scripts, and the test's gate must agree with the module's gate or
// it reads not-run on exactly the lane the ticket exists to serve. `key` prefers the lean key for
// the same reason `credentials()` does. A lean-only environment cannot do the direct
// `backlog_items` read arm B's positive control needs -- the lean role holds no SELECT on that
// table, on purpose -- so that control declares itself not-run rather than failing; see arm B.
const creds = () => ({
  url: process.env.SUPABASE_URL,
  key: process.env.SUPABASE_LEAN_KEY || process.env.SUPABASE_SERVICE_KEY,
});
const hasCreds = () => Boolean(creds().url && creds().key);
const CRED_HINT =
  "set SUPABASE_URL and either SUPABASE_LEAN_KEY (the lean lane's own narrow key, from the cloud " +
  "environment's settings — docs/runbooks/lean-lane.md) or SUPABASE_SERVICE_KEY (by name from " +
  "runner_secrets, exported inline per docs/runbooks/session-setup.md step 1b) and re-run the suite";

function node(script, args, env = process.env) {
  const r = spawnSync("node", [script, ...args], { cwd: ROOT, encoding: "utf8", env });
  return { code: r.status, out: r.stdout ?? "", err: r.stderr ?? "" };
}

async function rest(pathAndQuery) {
  const { url, key } = creds();
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  return res.ok ? res.json() : null;
}

// --- Arm C: the cut -----------------------------------------------------------------------------

function theCutLanded(results) {
  const setup = read(SETUP_REL);
  const decisions = read(DECISIONS_REL);

  // Counted the way `wc -l` counts: a file ending in a newline would otherwise score one phantom
  // empty line and the bar would be measured against the wrong number.
  const lines = setup.replace(/\n$/, "").split("\n").length;
  assert.ok(lines < SETUP_CEILING_LINES,
    `${SETUP_REL} is ${lines} lines, against AGT-460's ${SETUP_CEILING_LINES}-line bar. This file is `
    + "read FIRST by every session, before any orientation read, so its length is a tax on every "
    + "session this repo runs — move a section to docs/runbooks/session-decisions.md rather than "
    + "raising the number.");
  results.push(`setup-under-${SETUP_CEILING_LINES}-lines`);

  for (const anchor of MOVED_ANCHORS) {
    assert.ok(decisions.includes(anchor),
      `${DECISIONS_REL} is missing the moved anchor "${anchor}" — the cut moves sections VERBATIM, `
      + "and a summary of a procedure is not a procedure");
    assert.ok(!setup.includes(anchor),
      `${SETUP_REL} still carries "${anchor}" after the move. Two homes for one procedure is the `
      + "exact drift the cut exists to end: an editor amends the copy they opened and the other "
      + "copy silently teaches the old rule.");
    results.push(`anchor-resolves-only-in-decisions: ${anchor.slice(0, 40)}`);
  }

  // THE INVERSE CONTROL. Every check above would also pass on a tree where BOTH halves were copied
  // into BOTH files, if the anchors had merely been deleted from one side. §3e is the section that
  // stayed, so it must be in session-setup.md and absent from the new file — which is only true of
  // a real split.
  assert.ok(setup.includes(STAYED_ANCHOR),
    `${SETUP_REL} lost §3e, which the cut deliberately KEPT (ses-311 pins the verifier step there)`);
  assert.ok(!decisions.includes(STAYED_ANCHOR),
    `${DECISIONS_REL} also carries §3e — the cut copied where it should have moved, so the control `
    + "that proves this is a split rather than a duplication has failed");
  results.push("3e-stayed-and-was-not-duplicated");

  // And no fenced procedure in two files — AGT-460's own STOP condition.
  const fences = src => new Set(
    [...src.matchAll(/```[a-z]*\n([\s\S]*?)```/g)].map(m => m[1].trim()).filter(Boolean));
  const both = [...fences(setup)].filter(f => fences(decisions).has(f));
  assert.deepStrictEqual(both, [],
    `${both.length} fenced block(s) live in BOTH files — a fenced procedure is the copy that gets `
    + `followed, so two of them is two sources of truth: ${both.map(f => f.slice(0, 60)).join(" / ")}`);
  results.push("no-fenced-procedure-in-two-files");

  // The pointer: session-setup.md must say where the moved half went, or the cut loses the reader.
  assert.ok(setup.includes(DECISIONS_REL),
    `${SETUP_REL} must name ${DECISIONS_REL} — a session that opens the procedure and finds §3c `
    + "simply gone has no way to reach it");
  results.push("setup-points-at-decisions");
}

// --- Arm A: open-session ------------------------------------------------------------------------

async function theOpenScriptNamesTenStepsAndReadsTheMeter(results) {
  const r = node(OPEN, ["--name=agt-460-regression-fixture", "--ticket=AGT-460", "--dry-run", "--json"]);
  assert.strictEqual(r.code, 0,
    `open-session.js --dry-run --json exited ${r.code}: ${r.err.trim() || r.out.slice(-400)}`);

  let plan;
  try { plan = JSON.parse(r.out); }
  catch { assert.fail(`--json did not emit parsable JSON: ${r.out.slice(0, 400)}`); }

  assert.strictEqual(plan.steps.length, OPEN_STEPS,
    `the plan names ${plan.steps.length} steps, not ${OPEN_STEPS}. The ten are session-setup.md's `
    + "1 → 3b in order; a dropped step is how the .env.local copy and SES-23's staging go missing.");
  assert.deepStrictEqual(plan.steps.map(s => s.n), Array.from({ length: OPEN_STEPS }, (_, i) => i + 1),
    "the ten steps must be numbered 1..10 in order — the order IS the procedure");
  results.push("open-names-ten-steps-in-order");

  // The meter is useless without its age and its writer: a 94% reading four hours old and a 94%
  // reading four minutes old are different facts, and which writer produced it is how a reader
  // tells a live meter from a stale laptop task.
  for (const needle of ["age_minutes", "source"]) {
    assert.ok(plan.meter_line.includes(needle),
      `the meter line must carry \`${needle}\`: "${plan.meter_line}"`);
  }
  results.push("meter-line-carries-age-and-source");

  // Both columns agt460_session_length added — the session length rule is unreadable without them.
  for (const col of ["session_max_tickets", "session_max_context_tokens"]) {
    assert.ok(plan.budget_line.includes(col),
      `the budget line must carry \`${col}\`: "${plan.budget_line}"`);
    assert.ok(Number.isInteger(plan.budget[col]),
      `budget.${col} must read a whole number from runner_settings, got ${JSON.stringify(plan.budget[col])}`);
  }
  results.push("budget-line-carries-both-new-columns");

  // A dry run must NOT claim. This is the half that keeps the suite safe to run on a live board.
  assert.strictEqual(plan.claim.attempted, false,
    "--dry-run attempted the claim — a dry run that claims a board ticket is a write wearing a plan's clothes");
  results.push("dry-run-claims-nothing");

  // The credential gate, with BOTH keys removed (AGT-464: either one opens the script, so deleting
  // only one proves nothing — the run would simply use the other and this assertion would read
  // green against a script that still had its database half). A plan printed without that half
  // would be a false all-clear about whether this session may run at all.
  const stripped = { ...process.env };
  delete stripped.SUPABASE_LEAN_KEY;
  delete stripped.SUPABASE_SERVICE_KEY;
  const bare = node(OPEN, ["--name=agt-460-regression-fixture", "--ticket=AGT-460", "--dry-run", "--json"], stripped);
  assert.strictEqual(bare.code, 2,
    `with SUPABASE_LEAN_KEY and SUPABASE_SERVICE_KEY both removed, open-session.js exited ${bare.code}, not 2`);
  assert.ok(/no-credentials/.test(bare.err),
    `exit 2 must name \`no-credentials\` so the reader gets the remedy: ${bare.err.slice(0, 300)}`);
  // BOTH names, because the remedy differs by which one the reader can actually get: the lean key is
  // John's one minting chore, the service key is step 1b. A message naming only one sends half the
  // readers to the wrong place.
  for (const name of ["SUPABASE_LEAN_KEY", "SUPABASE_SERVICE_KEY"]) {
    assert.ok(new RegExp(name).test(bare.err),
      `the message must name ${name}: either key opens the script, so the reader needs both remedies `
      + `— ${bare.err.slice(0, 300)}`);
  }
  results.push("no-credentials-exits-2-and-names-both-keys");
}

// --- Arm B: THE DISCRIMINATOR -------------------------------------------------------------------

async function theCloseScriptStopsBeforeThePush(results) {
  // A name no session can hold. The holder guard rides IN the filter, so this is a read that comes
  // back 0 rows whoever actually holds the ticket.
  const FOREIGN = "agt-460-regression-not-a-holder";

  // Any claimed, not-done ticket serves: the clause is "held by another name", and the guard is
  // holder-equality, not identity of the ticket.
  const held = await rest("backlog_items?claimed_by=not.is.null&status=neq.done&select=backlog_id,claimed_by&limit=1");
  if (!held || held.length === 0) {
    notRun("the discriminator's positive control",
      "no ticket on the board is claimed right now, so there is no real holder to run the second "
      + "half against. The claim-lost half below still ran; what is unproven is that `push` CAN "
      + "appear in this script's stdout, i.e. that its absence was caused by the gate.");
    const only = node(CLOSE, [`--name=${FOREIGN}`, "--ticket=AGT-460", "--dry-run"]);
    assert.strictEqual(only.code, 2, `close-session.js exited ${only.code}, not 2 claim-lost`);
    assert.ok(!/push/.test(only.out), "stdout reached the send step despite the lost claim");
    results.push("close-exits-2-claim-lost (control not run)");
    return;
  }
  const { backlog_id: ticket, claimed_by: holder } = held[0];

  // (i) THE GATE FIRES. Foreign name → exit 2, `claim-lost`, and nothing about sending.
  const lost = node(CLOSE, [`--name=${FOREIGN}`, `--ticket=${ticket}`, "--dry-run"]);
  assert.strictEqual(lost.code, 2,
    `close-session.js exited ${lost.code} against a claim held by '${holder}', not 2. The re-assert `
    + `is register B42's gate; an exit that is not 2 means the gate did not fire.`);
  assert.ok(/claim-lost/.test(lost.out + lost.err),
    `exit 2 must name \`claim-lost\`: ${(lost.out + lost.err).slice(0, 300)}`);
  assert.ok(!/push/.test(lost.out),
    "stdout mentions `push` on a run whose claim was lost. The gate's whole job is to stop BEFORE "
    + `anything leaves the worktree: ${lost.out.slice(0, 400)}`);
  assert.ok(lost.err.includes(holder),
    `the report must NAME who holds the ticket ('${holder}'), not only that it is held — a session `
    + `told "held" and not "held by whom" cannot hand the work over: ${lost.err.slice(0, 300)}`);
  results.push("close-exits-2-claim-lost-with-no-push-and-names-the-holder");

  // (ii) THE NEEDLE IS FINDABLE. Same command, the REAL holder's name: the run proceeds past the
  // gate and its stdout DOES carry the send step. Without this, (i)'s absence proves nothing.
  const kept = node(CLOSE, [`--name=${holder}`, `--ticket=${ticket}`, "--dry-run"]);
  assert.strictEqual(kept.code, 0,
    `with the real holder's name, close-session.js --dry-run exited ${kept.code}, not 0: `
    + `${kept.err.trim() || kept.out.slice(-400)}`);
  assert.ok(/push/.test(kept.out),
    "the held run's stdout does NOT mention `push` either, so arm (i)'s absence was never evidence "
    + "about the claim gate — this script would read green with no gate at all");
  assert.ok(/HEAD:dev/.test(kept.out) && !/push origin dev\b/.test(kept.out),
    "the send step must read `HEAD:dev`, never bare `push origin dev` (CLAUDE.md hard rule — "
    + "worktrees share one set of local refs)");
  results.push("close-proceeds-past-the-gate-for-the-real-holder-and-sends-HEAD:dev");
}

async function run() {
  const results = [];
  theCutLanded(results);

  if (!hasCreds()) {
    notRun("arms A and B (both scripts end-to-end)",
      `open-session.js and close-session.js both read Supabase — ${CRED_HINT}. Arm C above ran `
      + "against the source tree.");
    return results;
  }
  await theOpenScriptNamesTenStepsAndReadsTheMeter(results);
  await theCloseScriptStopsBeforeThePush(results);
  return results;
}

selfRun(import.meta.url, run);
export default run;
