#!/usr/bin/env node
// DeepBench v7.0.425 | scripts/verifier.js | SES-340 -- THE SCOPE TEST IS A PROJECT STATUS, NOT A
// NAME, and the thing to read twice is that BOTH name-fenced facts in this file were reading a
// string where a row now exists. Measured live 2026-09-09, not recalled: `public.projects` holds
// `Governance Agents` (executing), `Selfbuild` (paused) and `Automation` (paused); every epic
// carries `project_id`; `public.epic_project_executing(uuid)` is the one SQL home for "this epic's
// project is executing"; and `prime_directive_queue()`'s `prime_standing` is now
// `EXISTS (projects WHERE status='executing')`. John's ask behind it, 2026-09-09: *"I should be
// able to simply state 'build the Governance Agents project' and away you go"* -- which is one
// status write, and cannot be a name prefix that every future project would have to be renamed to
// match.
//
// (1) THE EPIC TEST READS THE TICKET'S PROJECT. `AUTO_DONE_EPIC_PREFIX = "Selfbuild"` is gone;
// eligibility now asks `epicProjectExecuting === true`, a boolean resolved in main() by embedding
// `epics(name,project_id,projects(status))` through the `epics.project_id -> projects` foreign key.
// FAIL CLOSED IS UNCHANGED AND IS THE WHOLE SAFETY: null (no epic on the ticket, a failed lookup, no
// credentials) is NOT true, takes the narrow path, and is indistinguishable from a paused project in
// the permissive direction on purpose. The ladder bypass and selfCertificationBlock() are untouched
// -- a rung still skips the scope tests and still never skips charter premise 3.
//
// (2) THE §2f WIDENING LOOKUP OUTLIVED ITS ROW, WHICH IS THE DEFECT THIS HALF FIXES. §2f was keyed
// on a queued `runner_directives` row whose body opens `THE SELFBUILD PRIME DIRECTIVE`; that
// directive (`a0ef9525`) and the succession directive (`0970abad`) were closed `superseded` this
// same sitting under gate decision `96bbed72`, so the lookup went quietly false and the widening
// lapsed with nothing saying so. It is now `projects?select=id&status=eq.executing&limit=1` and the
// flag is `projectExecuting` -- the same shape, the same fail-closed default, keyed on the row that
// now carries the authority. `PRIME_DIRECTIVE_BODY_PREFIX` is deleted.
//
// THE TWO FLAGS ARE NOT ONE FLAG, and collapsing them is the mistake to avoid: `epicProjectExecuting`
// is about THIS ticket's epic, `projectExecuting` is about the board. They usually agree live -- but
// not always, and the disagreement is exactly the fail-closed case: the ticket lookup can succeed
// while the projects lookup errors, which leaves `projectExecuting` false and correctly re-imposes
// charter decision 2's class restriction on evidence that could not be read.
//
// NAMED DEVIATION (SES-196 convention): the LANE VALUE stayed `selfbuild` in
// `prime_directive_queue()`. `tests/regression/ses-281-m5-pick-enforcement.test.mjs` asserts on it;
// renaming it is out of this ticket's scope and is recorded in docs/SELFBUILD-RETIREMENT-LEDGER.md.
//
// DeepBench v7.0.398 | scripts/verifier.js | SES-122 (b) -- THE AUTO-DONE BAR IS NOW A LADDER FACT
// THIS SCRIPT READS, AND THIS SCRIPT FINALLY RUNS ON WINDOWS. Two hardcoded facts and one
// environment defect, all measured, all in this file.
//
// (1) THE BAR IS LADDER-DRIVEN, AND THE THING TO READ TWICE IS THAT THE LADDER GRANT BYPASSES THE
// EPIC RESTRICTION AS WELL AS THE CLASS ONE. Charter decision 2 scoped auto-done to the `Selfbuild`
// family's `P10 - Tooling` deliveries, and the M6 gate (docs/RUNNER-GOV-M6-REQUIREMENTS.md, "What M6
// promises", promise 2, decided 2026-09-02 on SES-122's own row) replaced that with a MEASUREMENT:
// *a rung buys auto-done eligibility for its class*, eligible when the class's rung >=
// `runner_settings.auto_done_rung`. That is a fact about the CLASS, not about the epic, so a class
// which has earned the rung takes the bar wherever its ticket sits -- `tooling` is at rung 13 with
// `auto_done_rung` 3, so a P10 ship auto-dones on any epic; `bug_fix` is at rung 1, so a
// `P9 - Bug Fixes` ship stays `delivered` until that class earns rung 3, Selfbuild epic or not.
// Charter decision 2's Selfbuild/P10 path and §2f's widening are RETAINED AS THE FLOOR beneath it,
// which is why nothing below was deleted.
//
// AND THE GRANT IS COMPUTED IN THE DATABASE, NOT HERE. `public.class_autonomy(text)` (shipped
// SES-122a, v7.0.397) is the ONE home for what a rung buys; this script reads its `auto_done`
// boolean and never re-derives it from `rung` and a threshold, because two homes for one comparison
// is how the threshold column stops being the threshold. FAIL CLOSED IS THE DEFAULT AND IT IS THE
// SAME DEFAULT §2f USES: no class row, a class the ladder does not track, a failed RPC, absent
// credentials -- all of them leave `classAutonomy` null, all of them fall through to charter
// decision 2's narrow path, and none of them widen anything. Unknown is not innocent. Note that
// `class_autonomy` returns `rung`/`streak` as NULL, not 0, for an untracked class (rung 0 is a REAL
// rung -- `invention` sits at it), so a falsy `rung` is never read here as "the bottom rung".
//
// THE SELF-CERTIFICATION REFUSAL OUTRANKS THE LADDER, and that is asserted rather than arranged: the
// grant does not return early, it only SKIPS the scope tests, so control still reaches
// selfCertificationBlock() on every path. A rung never lets a change grade itself -- charter premise
// 3 is not a class rule and no amount of earned autonomy reaches it. This ship is its own witness:
// the diff touches scripts/verifier.js, so `tooling` at rung 13 is refused the bar it just built.
//
// (2) runGate() QUOTED THE COMMAND, because for four months every attended verifier run on John's
// machine was a FALSE `block`. `shell: true` on win32 makes Node hand the whole command line to
// `cmd /d /s /c`, and `process.execPath` on that machine is `C:\Program Files\nodejs\node.exe` --
// unquoted, cmd split it at the space and the regression and hygiene gates both exited 1 with
// `'C:\Program' is not recognized`. MEASURED, not inferred: verdict `253aca14` (SES-301) records
// build green and those two gates red on exactly that message. The cloud runner is Linux, where
// `shell` is false and the command is passed as argv[0], which is why this survived every scheduled
// cycle -- and why SES-311's attended verifier step could not exist until it was fixed. The fix is
// spawnCommandFor(), pure and exported so its guard is a string assertion instead of a 20-minute
// gate run.
//
// DeepBench v7.0.322 | scripts/verifier.js | SES-243 -- the auto-done bar learns Prime Directive
// §2f, and the thing to read twice is WHY THE WIDENING IS A LOOKUP AND NOT A CONSTANT: §2f's own
// closing sentence is "at Selfbuild completion or revocation, §2f lapses", so a hardcoded boolean
// would have to be un-set by hand and would outlive the word that authorised it. It is read live
// from the directive row, anchored at the START of the body so rows that merely DISCUSS the
// directive (SES-243's own ticket text among them) cannot switch it on. THE DEFAULT IS THE SAFETY:
// absent, undefined, a failed lookup and a genuinely revoked directive are ONE answer -- not proven
// live -- and all keep charter decision 2's narrow P10 - Tooling rule, because unknown costs John
// one tap while the other direction costs him a `done` he never authorised. The EPIC restriction and
// the self-certification refusal are untouched; §2f's evidence-path half is deliberately NOT here
// (see the header note). Guarded by tests/regression/SES-243-prime-directive-autodone.js.
//
// DeepBench v7.0.299 | scripts/verifier.js | SES-213 -- summarizeGateOutput(): the verdict ledger
// now records WHAT a gate blocked on. The retired `res.stderr || res.stdout` preferred stderr
// WHOLESALE, so all 26 block rows stored an unrelated GATE_BYPASS_SECRET warning and never the
// failing test. See that function's own header for the measurement. The ORDERING half of SES-213 is
// deliberately NOT in this file -- it is step 7a of docs/runbooks/runner-cycle.md, because a
// verifier that spawns render-claude-state.js would be a verifier that writes to the tree, and
// verdict-only is this file's founding property (see below).
//
// DeepBench v7.0.247 | scripts/verifier.js | SES-181 (Selfbuild M3 - Independent Verification)
//
// THE REVIEWER LANE, first rung: a VERDICT-ONLY, FAIL-CLOSED verifier. It runs the three mechanical
// gates over the change a cycle is about to ship, reaches approve/block with logged reasoning, and
// records the verdict in public.runner_verdicts. Built to John's accepted card 10de5fb5 (attended
// architect session 2026-08-25) and restated in directive cd278478.
//
// WHAT "VERDICT-ONLY" MEANS HERE, AND IT IS THE PROPERTY MOST LIKELY TO BE ERODED: this script
// CANNOT EDIT. It writes exactly one row -- its own verdict -- and touches no backlog_items row, no
// ticket status, no file in the tree. Charter, Multi-agent verification item 1: "verifier has fresh
// context, reads canonical rules + diff, never the author's conversation; verdict-only; cannot
// edit." A later edit that lets this script write a ticket's status has not extended the verifier,
// it has deleted the separation the whole lane exists for.
//
// AND "BLOCKS NOTHING", WHICH IS JOHN'S OWN SPLIT ON THE CARD -- "completes nothing, blocks nothing,
// scoreboard visible". At verdict one the exit code is INFORMATION, not a brake. No caller may use
// exit 1 to abort a ship: a `block` means the cycle ships `delivered` and cards John, which is
// exactly what it did before this file existed. The single consumer of `approve` is the interim
// auto-done bar wired at step 7a of docs/runbooks/runner-cycle.md, and that bar consumes
// approve + eligibility, never the bare exit code.
//
// FAIL-CLOSED IS NOT A SLOGAN, IT IS THE THIRD GATE VALUE. Each gate is green / red / SKIPPED, and
// skipped is NOT green. This is the SES-199 lesson generalised: that ticket shipped because
// check-session-docs.js ended in process.exit(0) on every path, so "tripwire green" -- a term the
// interim auto-done bar depends on -- could never be anything else. A verifier that approves when a
// gate could not run is the same defect with a bigger blast radius, so `approve` requires all three
// gates GREEN, asserted here AND by ck_runner_verdicts_fail_closed in the database. Two independent
// homes for one rule is deliberate: this script is not the only thing that can ever insert a row.
//
// THE THREE GATES ARE THE CHARTER'S, NOT A SET CHOSEN HERE. Decision 2, verbatim: "Interim bar until
// the M3 verifier exists: build + regression + hygiene tripwire ALL green -> auto-`done`; any red or
// skipped check still cards John." So GATES below is build / regression / hygiene, and the hygiene
// gate runs check-session-docs.js with `--gate` -- the SES-199 flag -- because the bare form always
// exits 0 and would make this gate a rubber stamp by construction.
//
// WHY THE ELIGIBILITY TEST READS THE BOARD AND NOT THE ARGV. Charter decision 2 scopes auto-done to
// "this project's P10 - Tooling deliveries" -- the Selfbuild epic family only, superseding SES-154's
// John-only-writer rule FOR THAT FAMILY AND NOTHING ELSE. A cycle passing its own --epic would be
// self-certifying its scope, so epic and priority class are read live from public.backlog_items via
// the ticket id. No ticket, or a ticket the board does not carry, is NOT eligible -- fail closed,
// with the reason named rather than a silent false.
//
// AND THE CLASS HALF OF THAT SCOPE IS SUSPENDED WHILE THE PRIME DIRECTIVE STANDS (SES-243). §2f of
// directive a0ef9525 widened auto-done to "ANY Selfbuild-epic ship the verifier lane passes GREEN",
// and this script did not know it -- so every non-P10 Selfbuild ship landed `delivered` and cost
// John a tap he had already said should not be needed. The widening is read LIVE from the directive
// row so it lapses on its own terms; the EPIC restriction and the
// self-certification refusal below are untouched by it. HISTORICAL AS OF SES-340 (v7.0.425): the
// directive row is closed `superseded` and the lookup is now `projects.status = 'executing'`, so
// this paragraph records the rule's shape, not today's query -- see the SES-340 stamp at the top.
//
// WHAT §2f's OTHER HALF IS AND WHY IT IS NOT HERE, named rather than left to be found. §2f also says
// that where the verifier "structurally cannot grade" a ship -- a diff living in
// deepbench-backups-offsite, or a self-certifying-path edit -- the ship auto-dones on its recorded
// evidence plus a green CI run. That path deliberately does NOT belong in this file: implementing it
// here would have the verifier bless precisely the edits charter premise 3 bars it from grading, and
// SELF_CERTIFYING_PATHS is the invariant that would be laundered. It is a cycle-side judgement about
// evidence, not a verdict, and it stays outside this script.
//
// AND IT REFUSES TO GRADE ITSELF, IN CODE RATHER THAN BY CONVENTION. Charter premise 3: "no change
// certifies itself; a fresh-context verifier must pass it." A delivery whose diff touches this file
// or either of the other two gate scripts is ineligible for the auto-done bar however green it is --
// see SELF_CERTIFYING_PATHS. The first draft of this rule was a sentence in the runbook, which is
// the exact shape of rule this platform has watched go silently unfollowed eight times over, and the
// cycle most likely to forget it is the one editing this file. A diff that cannot be READ fails the
// same direction: unknown is not innocent.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... \
//     node scripts/verifier.js --cycle-id=<uuid> --ticket=SES-181 --version=v7.0.247
//   node scripts/verifier.js --dry-run            # run the gates, print the verdict, record nothing
//
// Flags:
//   --cycle-id=<uuid>   The cycle this verdict belongs to. Required unless --dry-run.
//   --ticket=<ID>       Bare ticket id. Without it the verdict is still recorded; eligibility is
//                       not, because it cannot be established.
//   --version=<vX.Y.Z>  The version being shipped, for the ledger.
//   --base=<ref>        Base ref the delivery's diff is taken against. Defaults to origin/dev.
//   --dry-run           Run the gates and print the verdict; write nothing, need no credentials.
//   --json              Single-line machine-readable output.
//   --repo=<path>       Repo root the gates run in. Defaults to this file's parent directory.
//
// Exit codes (the convention check-version-claim.js and export-backlog-snapshot.js set):
//   0  verdict APPROVE  -- all three gates green
//   1  verdict BLOCK    -- a gate was red, or could not run
//   2  the VERIFIER could not run (missing env, missing --cycle-id, the insert failed). Distinct
//      from 1 on purpose: 1 is a judgement about the change, 2 is the absence of a judgement, and
//      an unrunnable verifier must never be reported as either a pass or a block on the work.
//
// Env (process.env only -- never hardcoded, never printed):
//   SUPABASE_URL           Project REST base.
//   SUPABASE_SERVICE_KEY   Service-role key. runner_verdicts holds no anon/authenticated grants.
//
// Network (all reads except the one verdict insert; every failure path fails CLOSED):
//   GET  /rest/v1/backlog_items          the ticket's epic + priority class, read off the board.
//   GET  /rest/v1/runner_directives      the Prime Directive row, for §2f's widening (SES-243).
//   POST /rest/v1/rpc/class_autonomy     {"p_priority_class": <class>} -> one row
//                                        {work_class, rung, streak, auto_done, extra_files,
//                                        extra_tasks}. The `auto_done` boolean IS the ladder grant
//                                        (SES-122b); `extra_files`/`extra_tasks` are part (c)'s and
//                                        are deliberately not read here.
//   GET  /rest/v1/runner_settings        auto_done_rung, for the REASON TEXT ONLY -- the grant is
//                                        class_autonomy's answer, never a comparison redone here.
//   POST /rest/v1/runner_verdicts        the one write. Skipped entirely under --dry-run.
//
// Pure helpers (gateStatus, verdictFor, autoDoneEligibility, selfCertificationBlock,
// summarizeGateOutput, parsePorcelainPath, spawnCommandFor) are exported so the regression suite
// drives every branch with no network and no subprocesses -- the seam-proof convention this repo's
// other checkers use. autoDoneEligibility takes { verdict, epicName, epicProjectExecuting,
// priorityClass, changedFiles, projectExecuting, classAutonomy } (SES-340), where `classAutonomy` is
// class_autonomy()'s row (plus `auto_done_rung` folded in for the reason) or NULL when it could not
// be read -- null takes charter decision 2's narrow path, never the ladder's. Guarded by
// tests/regression/SES-181-verifier.js, tests/regression/SES-243-prime-directive-autodone.js and
// tests/regression/ses-340-projects-govern.test.mjs.

import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The charter's interim bar, in order. `label` is what John reads; `argv` is what runs.
// Exported so a later widening or narrowing of the gating set shows up in this file's diff and in
// the regression test's, rather than silently -- the SES-199 GATING_CHECKS convention.
export const GATES = Object.freeze([
  Object.freeze({ key: "build", label: "build",
    cmd: "npm", argv: ["run", "build"] }),
  Object.freeze({ key: "regression", label: "regression suite",
    cmd: process.execPath, argv: ["tests/regression/run-all.js"] }),
  // --gate is SES-199's flag. The bare form always exits 0; using it here would make the hygiene
  // gate incapable of ever being red, which is the rubber stamp this lane exists to prevent.
  Object.freeze({ key: "hygiene", label: "hygiene tripwire",
    cmd: process.execPath, argv: ["scripts/check-session-docs.js", "--gate"] }),
]);

// SES-340: a LABEL, where `AUTO_DONE_EPIC_PREFIX = "Selfbuild"` was a TEST. The retired constant was
// the scope rule itself -- `epicName.startsWith(it)` -- so the name and the fence were one thing and
// a project that was not called Selfbuild could not be built. The fence is now
// `epicProjectExecuting === true`, resolved from `projects.status`; this string only names it in the
// reasons the ledger stores, and nothing branches on its value.
export const AUTO_DONE_SCOPE = "executing project";
export const AUTO_DONE_CLASS_PREFIX = "P10";

// The files that ARE the verification. A delivery whose diff touches one of these is graded by the
// code it just changed, so it may not take the auto-done bar -- charter premise 3, "no change
// certifies itself; a fresh-context verifier must pass it."
//
// THIS IS A CODE RULE ON PURPOSE. Its first draft lived in the runbook as a sentence every cycle had
// to remember, which is the exact class of rule this platform has now watched go silently unfollowed
// eight times (SES-86 phase 3, v7.0.146, SES-101, SES-111, SES-127, SES-128, SES-129, SES-143). The
// cycle most likely to forget it is the one editing this file.
export const SELF_CERTIFYING_PATHS = Object.freeze([
  "scripts/verifier.js",
  "scripts/check-session-docs.js",
  "tests/regression/run-all.js",
]);

function arg(name, fallback) {
  const prefix = `--${name}=`;
  const hit = process.argv.find(a => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

// A gate's outcome from its process result. THE THREE-VALUE RETURN IS THE POINT: `ran` false means
// the command never produced an exit status (spawn error, binary missing, killed by signal), and
// that is 'skipped', never 'green'. Collapsing skipped into either green or red loses the one
// distinction the charter's bar is written in ("any red OR SKIPPED check still cards John").
export function gateStatus({ ran, exitCode }) {
  if (!ran) return "skipped";
  if (exitCode === null || exitCode === undefined) return "skipped";
  return exitCode === 0 ? "green" : "red";
}

// How much of a gate's output the ledger keeps. Four [FAIL] lines plus a summary line legitimately
// exceed the 400 this used to be, and a reasoning that stops mid-failure is the defect in miniature.
export const DETAIL_CAP = 600;

// WHAT A GATE BLOCKED ON -- the second half of SES-213, and it is a fact about WHICH STREAM, not a
// formatting preference. This used to read `res.stderr || res.stdout`, which prefers stderr
// WHOLESALE: the first non-empty stream wins and the other is discarded entirely. Measured against
// the real output shape rather than assumed -- tests/regression/run-all.js:77 prints
// `[FAIL] <file> -- <message>` through console.log (STDOUT), while the ubiquitous
// `WARN: GATE_BYPASS_SECRET not found` is a console.warn (STDERR). So stderr was always non-empty,
// always won, and all 26 block rows in public.runner_verdicts recorded the warning and never the
// failing test. The verdict ledger could not say what it blocked on, which is why SES-213 needed a
// live reproduction instead of a query.
//
// THE RULE: read BOTH streams, and prefer the lines that name failures over the lines that merely
// came last. Position is not evidence.
//
// Pure and exported so its guard can test it directly instead of spawning a suite -- the tail it
// replaced was buried inside runGate() and was therefore only ever observable through a real
// 20-minute gate run, which is how it survived 26 rows.
export function summarizeGateOutput({ stdout, stderr }) {
  const lines = `${stdout || ""}\n${stderr || ""}`
    .split("\n").map(l => l.trim()).filter(Boolean);
  const fails = lines.filter(l => l.startsWith("[FAIL]"));
  // The pass count anchors the verdict, so it is preferred over the not-run notice when both are
  // present -- "96/97 passed" tells a reader how much of the suite the failure represents.
  const summary = lines.filter(l => /^regression suite:/.test(l))
    .concat(lines.filter(l => /^NOT A FULL RUN:/.test(l)));
  // No [FAIL] vocabulary (npm build, the hygiene tripwire) falls back to the last three lines of the
  // COMBINED output -- stderr is concatenated last, so an npm failure still ends on its own error.
  const chosen = fails.length ? [...fails.slice(0, 4), ...summary.slice(0, 1)] : lines.slice(-3);
  return chosen.join(" | ");
}

// The whole verdict rule, in one pure function.
//
//   gates  { build: 'green'|'red'|'skipped', regression: ..., hygiene: ... }
//
// Returns { verdict, reasoning }. `reasoning` is REQUIRED by the table's own CHECK, so it is built
// here rather than left to the caller: the charter's grounding rule is "every factual claim cites a
// checkable source or blocks", and a verdict whose reason is composed at the call site is a claim
// with no fixed home.
export function verdictFor(gates) {
  const rows = GATES.map(g => ({ key: g.key, label: g.label, status: gates[g.key] ?? "skipped" }));
  const green = rows.filter(r => r.status === "green");
  const red = rows.filter(r => r.status === "red");
  const skipped = rows.filter(r => r.status === "skipped");

  if (green.length === GATES.length) {
    return {
      verdict: "approve",
      reasoning: `approve: all ${GATES.length} mechanical gates green (${rows.map(r => r.label).join(", ")}). ` +
        `Verdict-only -- this completes nothing and blocks nothing by itself.`,
    };
  }
  const parts = [];
  if (red.length) parts.push(`RED: ${red.map(r => r.label).join(", ")}`);
  if (skipped.length) {
    parts.push(`COULD NOT RUN (fail-closed, counted as not green): ${skipped.map(r => r.label).join(", ")}`);
  }
  return {
    verdict: "block",
    reasoning: `block: ${parts.join("; ")}. Green: ${green.length ? green.map(r => r.label).join(", ") : "none"}. ` +
      `A block is the status quo -- the cycle ships delivered and cards John, exactly as before this lane existed.`,
  };
}

// Charter premise 3, as a test rather than as a sentence to remember.
//
//   changedFiles  repo-relative paths in this delivery's diff, or NULL when they could not be
//                 determined. NULL IS A REAL ANSWER AND IT BLOCKS: a verifier that cannot see what
//                 changed cannot know whether it is grading itself, and "could not tell" must fail
//                 the same direction as "yes" -- the whole file's fail-closed rule, applied here.
export function selfCertificationBlock(changedFiles) {
  if (changedFiles === null || changedFiles === undefined) {
    return { blocked: true, reason: `the delivery's changed-file list could not be read, so whether this change grades itself is unknown -- fails closed (charter premise 3, "no change certifies itself").` };
  }
  const norm = changedFiles.map(f => String(f).replace(/\\/g, "/").replace(/^\.\//, ""));
  const hits = SELF_CERTIFYING_PATHS.filter(p => norm.includes(p));
  if (hits.length) {
    return { blocked: true, reason: `this delivery changes ${hits.join(", ")} -- the verification itself. Charter premise 3: "no change certifies itself; a fresh-context verifier must pass it." The verdict stands; the auto-done bar does not apply.` };
  }
  return { blocked: false, reason: "" };
}

// Charter decision 2's scope test, as re-homed on `projects.status` by SES-340 and as widened for an
// executing project's duration by §2f's successor. Returns { eligible, reason } -- the reason is
// stored either way, because "not eligible" with no reason is indistinguishable from "nobody
// checked".
//
//   epicProjectExecuting  SES-340. TRUE only when the ticket's epic was read AND its project's
//                         status came back `executing`. This replaced
//                         `epicName.startsWith("Selfbuild")`, and the replacement is the ticket: the
//                         old test made eligibility a property of a NAME, which anything can be
//                         given and which no second project could ever satisfy. It is now a property
//                         of a row John changes with one status write. NULL is the unknown -- no
//                         epic on the ticket, a failed lookup, no credentials -- and it fails closed
//                         onto the narrow path, exactly as the old `!epicName` branch did.
//                         `epicName` survives for the REASON TEXT only; nothing branches on it.
//
//   projectExecuting      TRUE only when a project was READ AND FOUND `executing`. Absent, undefined
//                         and false are all one answer -- "not proven live" -- and they all keep
//                         charter decision 2's narrow P10 rule. That default is the whole safety of
//                         this widening: a lookup that failed, a caller that never passed the flag,
//                         and a genuinely paused board must not be distinguishable from each other
//                         in the permissive direction, because the failure they would share is the
//                         runner widening its own autonomy on an absence of evidence. Unknown costs
//                         John one tap; the other direction costs him a `done` he never authorised.
//                         It is NOT the same fact as `epicProjectExecuting`: that one is about this
//                         ticket's epic, this one is about the board, and the case where they
//                         disagree is the case that matters -- a ticket lookup that succeeded beside
//                         a projects lookup that errored.
//
//   classAutonomy         public.class_autonomy(priority_class)'s single row -- { work_class, rung,
//                         auto_done, ... } -- with `auto_done_rung` folded in for the reason text,
//                         or NULL/undefined when it could not be read. THE LADDER GRANT IS
//                         `auto_done === true` AND NOTHING ELSE: strict, for exactly SES-243's
//                         reason (a REST layer that hands back the string "false" is truthy), and
//                         read rather than recomputed, because `rung >= auto_done_rung` has one home
//                         and it is the SQL function. NULL takes charter decision 2's path below --
//                         unknown is not innocent (M6 gate, promise 2; SES-122).
export function autoDoneEligibility({ verdict, epicName, epicProjectExecuting, priorityClass, changedFiles, projectExecuting, classAutonomy }) {
  if (verdict !== "approve") {
    return { eligible: false, reason: `verdict is ${verdict}; the interim auto-done bar requires approve (all three gates green).` };
  }
  // FEATURE: SES-122 (b) -- the auto-done bar becomes ladder-driven.
  // THE LADDER GRANT, AND IT DOES NOT `return` -- it only skips the two scope tests. That shape is
  // load-bearing: an early return here would hand the bar to a change that edits the verification
  // itself, because selfCertificationBlock() below is the thing it would have jumped over. Control
  // reaches that refusal on EVERY path through this function, ladder or no ladder.
  //
  // The grant bypasses the PROJECT test as well as the CLASS test. A rung is a measurement of a work
  // CLASS -- the M6 gate's words on SES-122's row are "a rung buys auto-done eligibility for its
  // class" -- so a class that has earned it takes the bar wherever its ticket sits. Charter decision
  // 2's project/P10 rule and §2f's widening survive underneath as the floor for every class that
  // has NOT earned it.
  const ladderGranted = classAutonomy?.auto_done === true;
  const widened = projectExecuting === true;

  if (!ladderGranted) {
    // SES-340. STRICT TRUE, for SES-243's reason applied to a third lookup: a REST layer that hands
    // back the string "false" is truthy, and every unknown here -- null, undefined, an epic with no
    // project, a paused project -- is one answer that keeps the narrow path.
    if (epicProjectExecuting !== true) {
      return { eligible: false, reason: `epic '${epicName ?? "(none)"}' belongs to no executing project (projects.status), so charter decision 2's scope -- an ${AUTO_DONE_SCOPE}'s deliveries -- is not met; an unknown or paused project fails closed. The ladder did not grant this class the bar either${describeLadder(classAutonomy)}.` };
    }
    // THE CLASS RESTRICTION IS CHARTER DECISION 2'S, AND THE WIDENING SUSPENDS IT -- it does not
    // delete it. The project test above still stands on both paths (the widening widens the CLASS,
    // never the scope), and so does the self-certification refusal below.
    if (!widened && !String(priorityClass ?? "").startsWith(AUTO_DONE_CLASS_PREFIX)) {
      return { eligible: false, reason: `priority class '${priorityClass ?? "(none)"}' is not ${AUTO_DONE_CLASS_PREFIX} - Tooling; charter decision 2 approves auto-accept for tooling deliveries only, and no executing project is proven live to widen it (a paused board and an unreadable projects table both fail closed here). The ladder did not grant this class the bar either${describeLadder(classAutonomy)}.` };
    }
  }
  // Checked LAST so that a ticket which otherwise qualifies gets the specific reason -- "you are
  // grading yourself" -- rather than a scope message that would send the next reader looking in the
  // wrong place. It is also the refusal a rung may never buy its way past: charter premise 3.
  const self = selfCertificationBlock(changedFiles);
  if (self.blocked) return { eligible: false, reason: self.reason };

  // The reason NAMES WHICH RULE GRANTED THE BAR, because the three are not the same authority and
  // the ledger is where that distinction has to survive: the ladder is a measurement M6 made
  // executable, decision 2 is standing charter, §2f is a directive John can revoke tonight.
  if (ladderGranted) {
    return {
      eligible: true,
      reason: `all three gates green, and the diff touches none of ${SELF_CERTIFYING_PATHS.join(", ")} -- class '${priorityClass ?? "(none)"}' is work class '${classAutonomy.work_class ?? "(unnamed)"}' at rung ${classAutonomy.rung ?? "(unread)"} >= auto_done_rung ${classAutonomy.auto_done_rung ?? "(unread)"}, so the ladder granted this class the bar (M6, SES-122). Epic '${epicName ?? "(none)"}'; a rung is a fact about the class, not about the epic. Reverse stays one tap away.`,
    };
  }
  return {
    eligible: true,
    reason: widened
      ? `all three gates green on a delivery in an ${AUTO_DONE_SCOPE} (epic '${epicName ?? "(none)"}') in class '${priorityClass ?? "(none)"}', and the diff touches none of ${SELF_CERTIFYING_PATHS.join(", ")} -- a project is executing, so the ${AUTO_DONE_CLASS_PREFIX} - Tooling restriction of charter decision 2 is suspended for its duration. Reverse stays one tap away.`
      : `all three gates green on a ${AUTO_DONE_CLASS_PREFIX} - Tooling delivery in an ${AUTO_DONE_SCOPE} (epic '${epicName ?? "(none)"}'), and the diff touches none of ${SELF_CERTIFYING_PATHS.join(", ")} -- the interim bar of charter decision 2 is met. Reverse stays one tap away.`,
  };
}

// FEATURE: SES-122 (b) -- "the ladder declined" and "nobody asked the ladder" read differently.
// What the ladder said, in a clause a refusal reason can carry. "The ladder did not grant it" and
// "nobody asked the ladder" are DIFFERENT FACTS about a ticket that stayed `delivered`, and the
// stored reason is the only place either one survives -- the same discipline as the Prime Directive
// note in main(). Not exported: it has no rule in it, only wording.
function describeLadder(classAutonomy) {
  if (classAutonomy === null || classAutonomy === undefined) {
    return " (class_autonomy was not read -- no credentials, no class, or the RPC failed; a rung nobody looked up grants nothing)";
  }
  if (classAutonomy.rung === null || classAutonomy.rung === undefined) {
    return ` (the trust ladder does not track work class '${classAutonomy.work_class ?? "(unclassed)"}', so it has no rung to spend -- NULL, which is not rung 0)`;
  }
  return ` (work class '${classAutonomy.work_class ?? "(unnamed)"}' is at rung ${classAutonomy.rung}, below auto_done_rung ${classAutonomy.auto_done_rung ?? "(unread)"})`;
}

// ---------------------------------------------------------------------------
// Gates
// ---------------------------------------------------------------------------

// The delivery's changed files: committed-vs-base plus anything still in the working tree, because a
// cycle runs this BEFORE its push and the change may be either. Returns null when git cannot answer
// -- selfCertificationBlock() reads null as "fails closed", never as "nothing changed".
// ONE PORCELAIN LINE -> ONE PATH. Pure and exported because the shape of this string is the whole
// of charter premise 3's reach, and it was WRONG (found live 2026-08-29 by SES-243's own QA, on the
// cycle that was editing scripts/verifier.js and was told its diff touched nothing).
//
// `git status --porcelain` is FIXED-WIDTH: two status columns, then a space, then the path. For a
// WORKTREE-ONLY modification the first column is a SPACE -- " M scripts/verifier.js". The retired
// form called line.trim() FIRST, which ate that column and left "M scripts/verifier.js"; the
// two-column strip `^.{2}\s+` then needed whitespace at offset 2 and found the "s" of "scripts", so
// it did not match and the status letter stayed welded to the path. The result matched no entry in
// SELF_CERTIFYING_PATHS ever, so the self-certification refusal was INERT for every unstaged change
// -- which is the state a cycle is in at step 7a by construction, because the verifier runs BEFORE
// the commit. Staged lines ("M  path", two real columns) survived the trim, which is why the rule
// appeared to work whenever anyone checked it against a staged tree.
//
// THE FIX IS TO STOP TRIMMING THE LEFT, not to widen the regex: the leading space IS data.
export function parsePorcelainPath(line) {
  const path = line.slice(3);                       // fixed-width prefix: XY + one space
  return path.replace(/^.*\s->\s/, "").trim();      // "R  old -> new" keeps the destination
}

function changedFilesFor(repoRoot, base) {
  const out = [];
  for (const argv of [["diff", "--name-only", `${base}...HEAD`], ["status", "--porcelain"]]) {
    const r = spawnSync("git", argv, { cwd: repoRoot, encoding: "utf8" });
    if (r.error || r.status !== 0) return null;
    for (const line of String(r.stdout).split("\n")) {
      if (!line.trim()) continue;
      // `git status --porcelain` prefixes a two-column status; `git diff --name-only` does not.
      const p = argv[0] === "status" ? parsePorcelainPath(line) : line.trim();
      if (p) out.push(p);
    }
  }
  return out;
}

// FEATURE: SES-122 (b) -- the verifier runs on Windows.
// THE COMMAND A GATE IS ACTUALLY SPAWNED WITH -- one expression, and it cost four months of false
// blocks (SES-122b). With `shell` true, spawnSync does NOT pass the command as argv[0]: on win32 it
// builds `cmd /d /s /c "<cmd> <args…>"` and hands the whole string to the shell, which then splits
// it on whitespace. `process.execPath` on John's machine is `C:\Program Files\nodejs\node.exe`, so
// the regression and hygiene gates were launched as `C:\Program` and exited 1 with
// `'C:\Program' is not recognized as an internal or external command`. MEASURED: verdict
// `253aca14` (SES-301) records build green and both node-spawned gates red on exactly that string --
// i.e. every attended verifier run on Windows was a `block` about the environment, not about the
// change, while the Linux cloud runner (`shell` false) never saw it.
//
// Quoting is applied ONLY when the shell will parse the string, because with `shell` false the
// command IS argv[0] and quotes would become part of the filename -- a path that then does not
// exist, which is the same defect pointed the other way. Idempotent on an already-quoted command so
// a future GATES entry that quotes itself is not double-wrapped.
//
// Pure and exported so its guard is a string assertion rather than a 20-minute gate run: the retired
// form was one inline argument to spawnSync and was therefore only observable by running the real
// gates on a Windows box with a space in its node path, which is how it survived.
export function spawnCommandFor(cmd, shell) {
  const s = String(cmd);
  if (!shell) return cmd;
  if (!/\s/.test(s)) return cmd;
  if (/^".*"$/.test(s)) return cmd;
  return `"${s}"`;
}

function runGate(gate, repoRoot) {
  let res;
  const shell = process.platform === "win32";
  try {
    res = spawnSync(spawnCommandFor(gate.cmd, shell), gate.argv, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      shell,
      timeout: 20 * 60 * 1000,
    });
  } catch (e) {
    return { status: "skipped", detail: `spawn threw: ${e.message}` };
  }
  if (res.error) return { status: "skipped", detail: `could not run: ${res.error.message}` };
  // A signal kill leaves status null -- gateStatus() reads that as skipped, which is why the raw
  // status is passed through rather than defaulted to a number here.
  const status = gateStatus({ ran: true, exitCode: res.status });
  const tail = summarizeGateOutput({ stdout: res.stdout, stderr: res.stderr });
  return { status, detail: `exit ${res.status === null ? "signal " + res.signal : res.status}${tail ? " -- " + tail.slice(0, DETAIL_CAP) : ""}` };
}

// ---------------------------------------------------------------------------
// Network
// ---------------------------------------------------------------------------

async function rest(base, key, pathAndQuery, init = {}) {
  const url = `${base.replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`;
  let res;
  try {
    res = await fetch(url, {
      ...init,
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers || {}) },
    });
  } catch (e) {
    return { error: `could not reach the Supabase REST endpoint: ${e.message}` };
  }
  if (!res.ok) {
    let body = "";
    try { body = await res.text(); } catch { /* an unreadable body is still a failure */ }
    return { error: `Supabase REST returned HTTP ${res.status} ${res.statusText}: ${body}` };
  }
  try {
    const text = await res.text();
    return { rows: text ? JSON.parse(text) : [] };
  } catch (e) {
    return { error: `Supabase REST returned unparseable JSON: ${e.message}` };
  }
}

function emit({ code, payload, prose }) {
  if (process.argv.includes("--json")) console.log(JSON.stringify(payload));
  else if (code === 0) console.log(prose);
  else console.error(prose);
  process.exit(code);
}

async function main() {
  const repoRoot = arg("repo", path.resolve(__dirname, ".."));
  const dryRun = process.argv.includes("--dry-run");
  const cycleId = arg("cycle-id", "");
  const ticket = arg("ticket", "");
  const version = arg("version", "");

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!dryRun) {
    const missing = [!supabaseUrl && "SUPABASE_URL", !supabaseKey && "SUPABASE_SERVICE_KEY", !cycleId && "--cycle-id"].filter(Boolean);
    if (missing.length) {
      return emit({ code: 2, payload: { ok: false, exitCode: 2, kind: "cannot-run", missing },
        prose: `verifier: missing ${missing.join(", ")}. Exiting 2 (the verifier could not run) -- this is NOT a verdict. Use --dry-run to reach a verdict without recording one.` });
    }
  }

  const gateResults = {};
  const gateDetail = {};
  for (const gate of GATES) {
    const r = runGate(gate, repoRoot);
    gateResults[gate.key] = r.status;
    gateDetail[gate.key] = r.detail;
  }

  const { verdict, reasoning } = verdictFor(gateResults);

  // Eligibility reads the board, never the argv -- see the header.
  //
  // SES-340: the select EMBEDS THROUGH THE FOREIGN KEY (`epics.project_id -> projects`, constraint
  // `epics_project_id_fkey`) rather than making a second round trip, so the epic and its project's
  // status are ONE read and cannot describe two different instants. `epicProjectExecuting` stays
  // NULL unless an epic row actually came back -- a ticket with no epic, a failed lookup and absent
  // credentials are all the same unknown, and unknown is not innocent.
  let epicName = null;
  let epicProjectExecuting = null;
  let priorityClass = null;
  let lookupNote = "";
  if (ticket && supabaseUrl && supabaseKey) {
    const q = `backlog_items?select=priority_class,epics(name,project_id,projects(status))&backlog_id=eq.${encodeURIComponent(ticket)}&limit=1`;
    const r = await rest(supabaseUrl, supabaseKey, q);
    if (r.error) lookupNote = ` (ticket lookup failed: ${r.error})`;
    else if (r.rows.length) {
      priorityClass = r.rows[0].priority_class ?? null;
      const epic = r.rows[0].epics ?? null;
      epicName = epic?.name ?? null;
      // An epic with no project row is a DEFINITE "no executing project", not an unknown -- it read
      // fine and the answer was nothing. Only a missing epic leaves this null.
      if (epic) epicProjectExecuting = epic.projects?.status === "executing";
      else lookupNote += ` (${ticket} carries no epic, so its project is unknown and the scope test fails closed)`;
    } else lookupNote = ` (no board row for ${ticket})`;
  } else if (!ticket) {
    lookupNote = " (no --ticket passed)";
  }

  // THE WIDENING, re-homed by SES-340 from a directive row onto `projects.status`. It was keyed on a
  // queued runner_directives row opening `THE SELFBUILD PRIME DIRECTIVE`; that directive is closed
  // `superseded` (gate decision 96bbed72), so the old lookup would now answer false forever and the
  // widening would have lapsed silently -- the exact rot the lookup-not-a-constant shape existed to
  // prevent, arriving through the row instead of through the constant.
  //
  // Every failure path still leaves this FALSE: no credentials, a REST error, or no executing
  // project. The note says which, so "not widened" is never indistinguishable from "nobody looked".
  let projectExecuting = false;
  let primeNote = "";
  if (supabaseUrl && supabaseKey) {
    const pq = `projects?select=id&status=eq.executing&limit=1`;
    const pr = await rest(supabaseUrl, supabaseKey, pq);
    if (pr.error) primeNote = ` (projects lookup failed, the class widening NOT applied: ${pr.error})`;
    else if (pr.rows.length) projectExecuting = true;
    else primeNote = " (no project is executing; charter decision 2's P10 - Tooling scope applies)";
  } else {
    primeNote = " (no credentials to read projects; charter decision 2's P10 - Tooling scope applies)";
  }

  // FEATURE: SES-122 (b) -- the class_autonomy() lookup.
  // THE TRUST LADDER'S ANSWER FOR THIS TICKET'S CLASS (SES-122b), read over PostgREST RPC from
  // public.class_autonomy(text) -- the ONE home for what a rung buys (SES-122a). The `auto_done`
  // boolean is taken as given and never re-derived from `rung` and the threshold here; a second copy
  // of that comparison is how `runner_settings.auto_done_rung` would stop being the threshold.
  //
  // EVERY FAILURE PATH LEAVES THIS NULL, exactly as the directive lookup above leaves its flag
  // false: no credentials, no class on the board, a REST error, an empty result. `null` takes
  // charter decision 2's narrow path in autoDoneEligibility(), so a lookup that could not run cannot
  // widen anything -- and the note says WHICH failure it was, because "the ladder did not grant it"
  // and "nobody asked the ladder" are different facts about a ticket that stayed `delivered`.
  //
  // auto_done_rung is fetched for the REASON TEXT ONLY. Its absence changes no decision -- the grant
  // is class_autonomy's answer -- so a failed settings read prints "(unread)" and stops there.
  let classAutonomy = null;
  let ladderNote = "";
  if (priorityClass && supabaseUrl && supabaseKey) {
    const cr = await rest(supabaseUrl, supabaseKey, "rpc/class_autonomy", {
      method: "POST",
      body: JSON.stringify({ p_priority_class: priorityClass }),
    });
    if (cr.error) ladderNote = ` (class_autonomy lookup failed, ladder grant NOT applied: ${cr.error})`;
    else {
      // A TABLE-returning function comes back as an array of rows; class_autonomy returns exactly
      // one, always (its own one-row subquery + LEFT JOIN), so an empty array is a real anomaly and
      // is reported rather than read as a permissive answer.
      const row = Array.isArray(cr.rows) ? cr.rows[0] : cr.rows;
      if (!row) ladderNote = " (class_autonomy returned no row -- treated as not read; charter decision 2's scope applies)";
      else {
        const sr = await rest(supabaseUrl, supabaseKey, "runner_settings?select=auto_done_rung&id=eq.1&limit=1");
        const threshold = !sr.error && Array.isArray(sr.rows) && sr.rows[0] ? sr.rows[0].auto_done_rung : null;
        classAutonomy = { ...row, auto_done_rung: threshold };
        if (sr.error) ladderNote = ` (auto_done_rung unread, reason text only: ${sr.error})`;
      }
    }
  } else if (!priorityClass) {
    ladderNote = " (no priority class to ask the ladder about; charter decision 2's scope applies)";
  } else {
    ladderNote = " (no credentials to read class_autonomy; charter decision 2's scope applies)";
  }

  const changedFiles = changedFilesFor(repoRoot, arg("base", "origin/dev"));
  const elig = autoDoneEligibility({ verdict, epicName, epicProjectExecuting, priorityClass, changedFiles, projectExecuting, classAutonomy });
  const autoDoneReason = elig.reason + lookupNote + primeNote + ladderNote;

  const detailLine = GATES.map(g => `${g.label}=${gateResults[g.key]} [${gateDetail[g.key]}]`).join("\n  ");
  const prose =
    `verifier verdict: ${verdict.toUpperCase()}${ticket ? ` on ${ticket}` : ""}${version ? ` (${version})` : ""}\n` +
    `  ${detailLine}\n` +
    `  ${reasoning}\n` +
    `  auto-done eligible: ${elig.eligible ? "YES" : "no"} -- ${autoDoneReason}`;

  const payload = {
    ok: verdict === "approve",
    exitCode: verdict === "approve" ? 0 : 1,
    verdict, gates: gateResults, gateDetail, reasoning,
    auto_done_eligible: elig.eligible, auto_done_reason: autoDoneReason,
    ticket: ticket || null, version: version || null, epic_name: epicName, priority_class: priorityClass,
    // Reported, never stored in their own columns: runner_verdicts carries no such field and adding
    // one would be a schema change this ticket did not ask for. The facts reach the ledger inside
    // auto_done_reason, which is the column that already exists to carry exactly this.
    // SES-340 renamed prime_directive_active -> project_executing and added the ticket's own answer.
    project_executing: projectExecuting,
    epic_project_executing: epicProjectExecuting,
    // Reported for the same reason and stored the same way: the ladder fact reaches the ledger
    // inside auto_done_reason, which is the free-text column that already exists to carry exactly
    // this. No new runner_verdicts column -- SES-122b asked for none.
    class_autonomy: classAutonomy,
  };

  if (dryRun) {
    return emit({ code: payload.exitCode, payload: { ...payload, recorded: false }, prose: prose + "\n  --dry-run: nothing recorded." });
  }

  const ins = await rest(supabaseUrl, supabaseKey, "runner_verdicts", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      cycle_id: cycleId,
      backlog_id: ticket || null,
      version: version || null,
      verdict,
      gate_build: gateResults.build,
      gate_regression: gateResults.regression,
      gate_hygiene: gateResults.hygiene,
      reasoning: `${reasoning}\nGates: ${detailLine.replace(/\n\s+/g, " | ")}`,
      auto_done_eligible: elig.eligible,
      auto_done_reason: autoDoneReason,
      epic_name: epicName,
      priority_class: priorityClass,
    }),
  });
  if (ins.error) {
    // The verdict was reached but not recorded. That is a verifier failure, not a verdict on the
    // change -- exit 2, for the same reason a missing credential is 2.
    return emit({ code: 2, payload: { ...payload, recorded: false, error: ins.error },
      prose: `${prose}\n  RECORDING FAILED: ${ins.error}\n  Exiting 2 -- the verdict above was reached but is not in the ledger, so it is not assertable.` });
  }

  const rowId = Array.isArray(ins.rows) && ins.rows[0] ? ins.rows[0].id : null;
  return emit({ code: payload.exitCode, payload: { ...payload, recorded: true, verdict_id: rowId },
    prose: `${prose}\n  recorded as runner_verdicts ${rowId}` });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}
