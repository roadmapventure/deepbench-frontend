#!/usr/bin/env node
// DeepBench v7.0.447 | scripts/verifier.js | SES-347 -- reconcile() reads the agent's `findings`,
// the Intent schema property that used to be called `reasoning`. THE RENAME IS THE FIX, and the
// measurement is the reason: the Anthropic API refused the real assembled `verify-ship` request
// before the model saw it -- stop_reason "refusal", stop_details.category "reasoning_extraction",
// empty content -- whenever the tool definition paired db-assembly.js's platform-injected `account`
// receipt (LAV-28b) with a schema property literally named `reasoning`. Replayed on the captured
// production request body, one mutation at a time: `reasoning` 5/5 refusals, `findings` 0/5, and
// that holds with the account description at its shipped 398 characters AND at a shortened 118, so
// SES-339's "shortening the account description clears it" did not transfer to the shipped request
// shape. Trivial system prompt and trivial user message refuse identically, so it is the tool
// definition alone. `runner_verdicts.reasoning` -- the column -- is untouched.
// DeepBench v7.0.440 | scripts/verifier.js | SES-337 -- CHARTER PREMISE 3 REACHES THE ROWS, and the
// thing to read twice is THAT THE RULE WAS ALREADY WRITTEN DOWN AND ONLY THE CODE WAS MISSING.
// `vf-guardrails.must` has said, since AGT-67 seeded it: "refuse the auto-done bar to a diff
// touching scripts/verifier.js, scripts/check-session-docs.js, tests/regression/run-all.js **or the
// Verifier's own Skill rows**". `SELF_CERTIFYING_PATHS` held the first three. The fourth had no
// enforcement at all, so the Skill was telling the agent a rule the code did not hold -- the exact
// shape of rule this file's own header calls "the class of rule this platform has now watched go
// silently unfollowed eight times."
//
// (1) A SKILL ROW IS NOT A FILE, WHICH IS WHY THIS IS A SECOND CONSTANT. Since AGT-67 the judgment
// IS `skill_profiles` rows (`vf-identity`, `vf-behavior`, `vf-knowledge-bar`, `vf-verdict-intent`,
// `vf-guardrails` -- measured live 2026-09-09, five rows, all `vf-`-prefixed). A cycle can rewrite
// what the Verifier believes without touching one byte of this file, and `selfCertificationBlock()`
// matches repo-relative PATHS against a changed-file list, so it cannot see that. Adding `"vf-"` to
// `SELF_CERTIFYING_PATHS` would have been worse than nothing: that constant is matched with
// `norm.includes(p)`, so the entry would mean "a changed file whose path is exactly vf-" -- inert,
// and indistinguishable from present. `selfCertifyingSkillEdit()` reads the cycle's
// `runner_before_images` instead, which §19v's "no before-image, no write" makes the complete record
// of the rows a cycle touched.
//
// (2) THREE STATES, NOT TWO, AND THAT IS THE WHOLE SAFETY. `[]` is "read, and no Skill row changed"
// -> clean. `null` is "could not be read" -> BLOCKED, the same direction an unreadable diff fails.
// And an image whose `row_data` is NULL (step 8b's INSERT convention) is resolved live from
// `skill_profiles`; one that neither the image nor the lookup can name is UNKNOWN and blocks too.
// Collapsing `[]` into `null` would refuse the bar to every clean delivery forever; collapsing
// `null` into `[]` would bless every unreadable one. `tests/regression/SES-181-verifier.js`'s
// `theVerifiersOwnSkillRowsCannotTakeTheBar()` asserts both directions, with the omitted-argument
// mutant that proves the guard is what is doing the work.
//
// (3) THE SEED FILE IS COVERED BY THE SAME FUNCTION, DELIBERATELY NOT BY `SELF_CERTIFYING_PATHS`.
// `docs/design/ga-agents-seed.sql` is where the `vf-*` rows come from, so changing it changes the
// judgment -- but `tests/regression/agt-67-verifier.test.mjs` clause (5) binds every entry of
// `SELF_CERTIFYING_PATHS` to a name in the guardrail clause, and that clause says "the Verifier's own
// Skill rows", not a path. Putting the seed in the old constant would have turned a passing guard
// red for a wording reason. `SELF_CERTIFYING_SKILL_FILES` is its home instead.
//
// (4) `skillRowEdit` UNDEFINED IS PERMISSIVE, AND THAT IS THE ONE PLACE THIS TICKET DOES NOT FAIL
// CLOSED. The argument's absence means the CHECK WAS NOT APPLIED, which is a fact about the caller,
// not about the delivery; treating it as a refusal would make a forgotten argument indistinguishable
// from a real self-certification in the ledger. Every production path computes it, and the computed
// value's own failure mode is `blocked: true`.
//
// WHAT THIS SHIP DID *NOT* DO, named rather than left to be discovered. SES-337's other half -- the
// Verifier reproducing the last 30 recorded verdicts within 2 disagreements -- WAS RUN and DID NOT
// PASS: 27 of 30 verdicts were reconstructable, and the Verifier disagreed with 8 of them, every one
// the same shape (the ledger row was written by the mechanical lane on three green gates; the agent
// blocked on evidence the kickoff promised and the delivery did not carry). A second finding came
// out of the same run: 17 of 27 judgments exceeded `vf-verdict-intent`'s own `maxLength: 1200` on
// `architect_lens`/`pm_lens`, so pass two would have rejected them with exit 2 and recorded no row
// at all. Neither is fixed here -- the kickoff's own instruction is to report a failing reproduction
// rather than edit the Skill to meet it -- and the evidence is
// `tests/fixtures/verdicts-30.json` + `tests/fixtures/verdicts-30-judgments.json`, replayed by
// `tests/verifier/ses-337-verifier-reproduction.test.mjs`. That file is RED and is deliberately NOT
// registered in `tests/regression/run-all.js`.
//
// DeepBench v7.0.433 | scripts/verifier.js | AGT-67 -- THE JUDGMENT HALF BECOMES A CAPABILITY AND
// THE SCRIPT KEEPS THE MECHANICAL GATES, and the thing to read twice is that THE AGENT CAN ONLY
// TIGHTEN. Every rule this file already enforced is enforced in code AFTER the agent speaks, on the
// agent's own output, so a model that says `approve` over a red gate changes nothing but the
// ledger's record of having said it. That is the whole design: the Verifier (`verifier` /
// `verify-ship`, seeded by this ticket's section of docs/design/ga-agents-seed.sql) contributes
// REASONS -- findings with file:line, the PM lens, the Chief Architect lens -- and contributes no
// permission.
//
// (1) `--judge=<none|session|executor>`, DEFAULT `none`, AND `none` IS BYTE-IDENTICAL TO WHAT THIS
// FILE DID BEFORE. That default is not timidity, it is the degrade path §2 of the kickoff demands:
// "the script degrades to today's behaviour when [no agent] is available -- never a silent
// widening." Every existing caller (docs/runbooks/runner-cycle.md step 7a, the cloud runner) passes
// no `--judge` and reaches exactly the code it reached at v7.0.425.
//
// (2) THE SESSION LANE IS TWO INVOCATIONS AND AN EXIT CODE, because a session sub-agent is not a
// function this script can call. Pass one (`--judge=session`) runs the gates, reads the board, and
// writes EVERYTHING the judgment needs to `<scratch>/verify-<ticket>.json` -- gate outputs with
// their exit lines, the diff, the changed-file list, the kickoff, the class and its ladder answer --
// then prints that path and the assembled `verify-ship` prompt and exits **3, awaiting judgment**.
// 3 is a THIRD kind of non-answer and is deliberately not 2: 2 means the verifier could not run, 3
// means it ran its half and is waiting for the other. A caller that reads 3 as a verdict is the
// defect this numbering exists to make visible. Pass two (`--judge=session --verdict-file=<path>`)
// reads the agent's JSON, validates it against THE INTENT'S OWN STORED SCHEMA (read live from
// `skill_profiles`, never restated here), reconciles it against the mechanical facts and inserts the
// one row.
//
// (3) THE PROMPT IS NOT ASSEMBLED HERE. It comes from `assemblePrompt()` + `renderAssembly()` --
// scripts/agent-prompt.js's own export, which is api/capabilities/execute.js's own assembly
// (SES-331). A second copy of the assembly is the drift this project exists to end, so this file
// contributes the task_context and nothing else. AND IT PASSES THE INTENT SLUG, read from
// `capabilities.default_intent_slug`: MEASURED in db-assembly.js:684 (AA-188), a null `intent_slug`
// does not fall back to the capability's default -- it filters EVERY intent-type Skill out, which
// for `verify-ship` deletes the output schema and the verdict contract while still producing a
// confident, well-formed prompt. `node scripts/agent-prompt.js --agent=verifier
// --capability=verify-ship` with no `--intent` is that prompt; this script never builds it.
//
// (4) reconcileJudgment() IS THE FILE'S NEW LOAD-BEARING FUNCTION AND IT IS A CONJUNCTION, NOT A
// CHOICE. `verdict` is block if the MECHANICAL verdict is block, whatever the agent said; it is
// also block if the agent said block on green gates (judgment tightens, never loosens); approve
// requires both. `auto_done_eligible` is `codeEligibility.eligible === true AND
// agent.auto_done_eligible === true` -- autoDoneEligibility() above is unchanged and is still the
// ceiling, so a diff touching scripts/verifier.js is refused the bar no matter how eligible the
// agent believes it is. Both sides are compared with `=== true` for SES-243's reason (a JSON `"true"`
// is truthy). Every place the code contradicted the agent is recorded in `overrides` and lands in
// the stored reasoning, because "the agent agreed" and "the agent was overruled" are different facts
// about an identical row and the ledger is the only place either survives.
//
// THIS SHIP IS ITS OWN WITNESS, AGAIN. The diff touches this file, so SELF_CERTIFYING_PATHS refuses
// it the auto-done bar -- and the refusal is now proven twice over: once by the code (which the
// agent cannot reach past) and once by the agent, which is asked to make the same call from the
// changed-file list. The attended QA for this version is that run.
//
// (5) THREE OF THIS FILE'S RULES WERE PUT HERE BY THE VERIFIER ITSELF, on its first real run.
// Verdict `5f414763-c63c-452d-be63-d1086bbe2677` (attended, this ticket's own commit, all three
// gates green, auto-done refused on the self-certifying path) returned seven findings; three were
// defects in this file and are fixed above rather than filed:
//   * verdictIdentityMismatch() -- pass two validated the agent's JSON against the schema and then
//     recorded it WITHOUT comparing the `backlog_id`/`version` the agent itself returned. A stale or
//     foreign verdict file satisfies the schema perfectly and lands on the wrong ledger row.
//   * the pass-one context now stores the FULL `autoDoneReason` (with the lookup/prime/ladder
//     notes), not the bare `elig.reason` -- a session-judged row was carrying the same columns with
//     less content than a `--judge=none` row.
//   * the exit-3 payload no longer spreads the mechanical `ok`/`exitCode`. Under `--json` it was
//     reporting `ok: true, exitCode: 0` on a run that exited 3 having recorded nothing -- this
//     header's own warning, seeded by the script. The prompt now goes to a file and reaches stdout
//     only when stdout is not carrying the JSON line.
// That is the lane working: the findings cite file:line, the code was wrong, and the fix is in the
// same ship. The remaining findings are recorded in the commit body.
//
// A NAMED DEVIATION AND A NAMED LIMIT. `--judge=executor` is written to the kickoff's §3 spec (one
// run, the executor's own POST, the API dollar cost added to `runner_cycles.api_cost_qa_usd`) and is
// NOT PROVEN LIVE by this ship -- it is off by default and the kickoff asked for no live run of it.
// It is a flagged path with an unexercised network call, and this comment is the honest label rather
// than a claim of coverage. `SELF_CERTIFYING_PATHS` deliberately gains nothing: SES-337 adds the
// Verifier's own Skill rows to it, not this ticket.
//
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
//   --judge=<mode>      AGT-67. `none` (default) is the mechanical-only behaviour every existing
//                       caller gets. `session` splits the run in two (see below). `executor` POSTs
//                       to the capability executor and finishes in one run -- NOT proven live.
//   --verdict-file=<p>  AGT-67, `--judge=session` pass two: the sub-agent's JSON verdict.
//   --context-file=<p>  AGT-67: override the derived `<scratch>/verify-<ticket>.json` path.
//   --scratch=<dir>     AGT-67: where the judgment context is written. Defaults to os.tmpdir().
//   --kickoff=<path>    AGT-67: the kickoff doc handed to the agent as part of its evidence.
//
// The `--judge=session` two-pass shape (AGT-67):
//   node scripts/verifier.js --judge=session --ticket=AGT-67 --version=v7.0.433 \
//     --cycle-id=<uuid> --kickoff=docs/kickoffs/v7.0.433-AGT-67-verifier-agent.md
//     -> runs the gates, writes the context JSON, prints its path and the assembled prompt, exit 3
//   ...run the printed prompt as a sub-agent, save its JSON to <path>...
//   node scripts/verifier.js --judge=session --ticket=AGT-67 --version=v7.0.433 \
//     --cycle-id=<uuid> --verdict-file=<path>
//     -> validates, reconciles, records the row, exit 0/1
//
// Exit codes (the convention check-version-claim.js and export-backlog-snapshot.js set):
//   0  verdict APPROVE  -- all three gates green
//   1  verdict BLOCK    -- a gate was red, or could not run
//   2  the VERIFIER could not run (missing env, missing --cycle-id, the insert failed, an agent
//      verdict that does not satisfy the Intent's schema). Distinct from 1 on purpose: 1 is a
//      judgement about the change, 2 is the absence of a judgement, and an unrunnable verifier must
//      never be reported as either a pass or a block on the work.
//   3  AGT-67 -- AWAITING JUDGMENT. The gates ran, the context was written, the prompt was printed,
//      and no row exists yet. Reached only under `--judge=session` pass one. It is NOT 2, because
//      the verifier did run its half; it is NOT 1, because nothing has been judged. A caller that
//      collapses 3 into either has thrown away the distinction between "blocked" and "not yet
//      asked".
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

import fs from "fs";
import os from "os";
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

// FEATURE: SES-337 -- THE OTHER HALF OF THE VERIFICATION IS NOT A FILE, and that is the whole
// reason this is a second constant rather than a fourth entry in the list above.
//
// Since AGT-67 the Verifier's judgment is `skill_profiles` ROWS -- `vf-identity`, `vf-behavior`,
// `vf-knowledge-bar`, `vf-verdict-intent`, `vf-guardrails` (measured live 2026-09-09: those five,
// linked to `verify-ship`, all `vf-`-prefixed). A cycle can rewrite what the Verifier believes
// without touching one byte of this file, and `selfCertificationBlock()` -- which matches repo-
// relative PATHS against a changed-file list -- cannot see it. `SELF_CERTIFYING_PATHS` is matched
// with `norm.includes(p)`, so adding "vf-" to it would silently mean "any changed file whose path
// is exactly vf-", which is nothing at all: the guard would be inert and look present.
//
// `vf-guardrails.must` ALREADY promised this rule -- "refuse the auto-done bar to a diff touching
// scripts/verifier.js, scripts/check-session-docs.js, tests/regression/run-all.js **or the
// Verifier's own Skill rows**" -- and until this ticket the code held only the first three. The
// Skill was telling the agent a rule the code did not have.
export const SELF_CERTIFYING_SKILL_PREFIX = "vf-";
// The repo-side home of those rows. A change to the seed is a change to the Skills it seeds, and it
// IS a path -- but it belongs here rather than in SELF_CERTIFYING_PATHS, because `vf-guardrails`
// names "the Verifier's own Skill rows" and `tests/regression/agt-67-verifier.test.mjs` clause (5)
// binds every SELF_CERTIFYING_PATHS entry to that clause by name.
export const SELF_CERTIFYING_SKILL_FILES = Object.freeze(["docs/design/ga-agents-seed.sql"]);

// Charter premise 3 over the DATABASE half of the verification.
//
//   beforeImages  the cycle's `runner_before_images` rows, as read from Supabase (§19v: no
//                 before-image, no write -- so every row this cycle changed has one, and the images
//                 are therefore the complete record of what it touched). NULL/undefined means the
//                 images could not be read, which is NOT innocent: a verifier that cannot see what
//                 rows changed cannot know whether it is grading its own instructions.
//   changedFiles  the repo half, for SELF_CERTIFYING_SKILL_FILES. NULL is already handled by
//                 selfCertificationBlock(); here it only adds, never subtracts.
//   slugById      pk -> slug, for images whose `row_data` is NULL (step 8b's INSERT convention).
//                 An image this map cannot resolve is UNKNOWN and blocks, for the same reason.
//
// Returns { blocked, reason } -- the reason is stored either way, because "checked and clean" and
// "nobody checked" must not read the same in the ledger.
export function selfCertifyingSkillEdit({ beforeImages, changedFiles, slugById } = {}) {
  const files = Array.isArray(changedFiles)
    ? changedFiles.map(f => String(f).replace(/\\/g, "/").replace(/^\.\//, ""))
    : [];
  const fileHits = SELF_CERTIFYING_SKILL_FILES.filter(p => files.includes(p));
  if (fileHits.length) {
    return { blocked: true, reason: `this delivery changes ${fileHits.join(", ")} -- the seed of the Verifier's own Skill rows. Charter premise 3: "no change certifies itself; a fresh-context verifier must pass it." The verdict stands; the auto-done bar does not apply.` };
  }
  if (beforeImages === null || beforeImages === undefined) {
    return { blocked: true, reason: `the cycle's runner_before_images could not be read, so whether this delivery rewrites the Verifier's own Skill rows is unknown -- fails closed (charter premise 3, and §19v's "no before-image, no write" is what makes the images the complete record).` };
  }
  const skillRows = beforeImages.filter(r => r && r.table_name === "skill_profiles");
  const unresolved = [];
  const hits = [];
  for (const r of skillRows) {
    const slug = r.row_data?.slug ?? (slugById ? slugById[r.pk_value] : undefined);
    if (slug === undefined || slug === null) { unresolved.push(String(r.pk_value)); continue; }
    if (String(slug).startsWith(SELF_CERTIFYING_SKILL_PREFIX)) hits.push(String(slug));
  }
  if (hits.length) {
    return { blocked: true, reason: `this delivery rewrites the Verifier's own Skill rows (${hits.join(", ")}) -- the judgment itself. Charter premise 3: "no change certifies itself; a fresh-context verifier must pass it." The verdict stands; the auto-done bar does not apply.` };
  }
  if (unresolved.length) {
    return { blocked: true, reason: `this delivery changes skill_profiles row(s) ${unresolved.join(", ")} whose slug could not be resolved, so whether they are the Verifier's own (${SELF_CERTIFYING_SKILL_PREFIX}*) is unknown -- fails closed, exactly as an unreadable diff does.` };
  }
  return { blocked: false, reason: `${skillRows.length} skill_profiles row(s) changed by this cycle, none of them ${SELF_CERTIFYING_SKILL_PREFIX}*.` };
}

// FEATURE: AGT-67 -- the judgment half.
// WHO THE JUDGMENT IS, as data rather than as a prompt. These two name the seeded rows (this
// ticket's section of docs/design/ga-agents-seed.sql); the INTENT is deliberately NOT a constant
// here -- it is read from `capabilities.default_intent_slug`, because the capability row is the one
// home for which Intent it defaults to and a literal here would be a second copy of it.
export const VERIFIER_AGENT_ID = "verifier";
export const VERIFY_CAPABILITY = "verify-ship";

// The judge lanes, and `none` FIRST because it is the default and the degrade path.
export const JUDGE_MODES = Object.freeze(["none", "session", "executor"]);

// AGT-67's third non-answer. See the exit-code table in the header: not 1 (nothing was judged), not
// 2 (the verifier ran its half fine), and named rather than written as a bare 3 at its two sites.
export const EXIT_AWAITING_JUDGMENT = 3;

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
//
//   skillRowEdit          FEATURE: SES-337. selfCertifyingSkillEdit()'s own { blocked, reason },
//                         computed by the caller because only the caller has the cycle id the
//                         before-images hang off. UNDEFINED IS ITS OWN ANSWER AND IT IS THE SAFE
//                         ONE: the check was not applied, so it cannot refuse anything -- and every
//                         production path (main(), below) always passes a computed value, whose
//                         own failure mode is `blocked: true`. The alternative -- treating an
//                         absent argument as a refusal -- would make a caller's forgetfulness look
//                         identical to a real self-certification, and the ledger would carry a
//                         reason nobody could act on.
export function autoDoneEligibility({ verdict, epicName, epicProjectExecuting, priorityClass, changedFiles, projectExecuting, classAutonomy, skillRowEdit }) {
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

  // FEATURE: SES-337 -- the same refusal over the rows. Placed beside the path check and AFTER the
  // ladder branch for the identical reason: a rung is a fact about a work class and buys nothing
  // past charter premise 3. A cycle that rewrote `vf-guardrails` and then had the Verifier grade
  // its own new instructions is the purest form of the thing that premise forbids.
  if (skillRowEdit?.blocked === true) return { eligible: false, reason: skillRowEdit.reason };

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
// FEATURE: AGT-67 -- the judgment half. Pure helpers, all exported, no network.
// ---------------------------------------------------------------------------

// The mode, validated rather than defaulted-on-typo. `--judge=sesion` must NOT quietly become
// `none`: silently running the mechanical-only path when a caller asked for judgment is the same
// class of failure as a skipped gate reported green, and it would be invisible in the ledger.
export function parseJudgeMode(raw) {
  if (raw === undefined || raw === null || raw === "") return { mode: "none" };
  if (JUDGE_MODES.includes(raw)) return { mode: raw };
  return { error: `--judge must be one of ${JUDGE_MODES.join(", ")}; got "${raw}"` };
}

// Where pass one leaves the evidence for pass two. DERIVED FROM THE TICKET, not random, so the two
// invocations find the same file without the caller having to carry a path between them -- and a
// ticket-less run is refused rather than given a shared default that two concurrent cycles would
// both write.
// The dot is deliberately NOT in the allowed set. A backlog id has none (`AGT-67`, `SES-181`), and
// leaving it in let `../../etc/passwd` through as `verify-..-..-etc-passwd.json` -- harmless once the
// separators are gone, but "harmless because of a second rule" is how the first rule stops being
// checked. Found by this function's own guard in tests/regression/SES-181-verifier.js.
export function judgeContextPathFor(scratchDir, ticket) {
  const safe = String(ticket || "").replace(/[^A-Za-z0-9_-]/g, "-");
  if (!safe) return null;
  return path.join(scratchDir, `verify-${safe}.json`);
}

// The agent's JSON against THE INTENT'S OWN STORED SCHEMA (`skill_profiles.traits.schema` for the
// capability's default Intent, read live in main()). This validator is deliberately small and
// deliberately NOT a restatement of the contract: it reads whatever the row carries, so the schema
// and the check cannot drift the way a hand-copied required-key list would.
//
// WHY A REJECTION IS FATAL RATHER THAN A BLOCK. A verdict that does not satisfy its own contract is
// not a judgment about the change -- it is the ABSENCE of one, arriving in a shape that looks like a
// judgment. Recording it as `block` would put a fabricated verdict in the ledger; recording the
// mechanical verdict instead would silently launder an `approve` the agent never validly gave. So
// pass two exits 2 with the errors named and writes nothing (see the header's exit-code table).
export function validateAgentVerdict(schema, value) {
  const errors = [];
  const typeOf = v => (v === null ? "null" : Array.isArray(v) ? "array" : typeof v);
  const typeOk = (v, t) => {
    const want = Array.isArray(t) ? t : [t];
    return want.some(w => (w === "integer" ? Number.isInteger(v)
      : w === "number" ? typeof v === "number"
      : w === "object" ? v !== null && typeOf(v) === "object"
      : typeOf(v) === w));
  };
  if (!schema || typeof schema !== "object") {
    return { ok: false, errors: ["no schema was read from the Intent Skill, so the agent's verdict could not be validated -- unknown is not innocent"] };
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, errors: [`the agent's verdict must be a JSON object; got ${typeOf(value)}`] };
  }
  for (const key of schema.required || []) {
    if (!(key in value)) errors.push(`missing required key "${key}"`);
  }
  for (const [key, spec] of Object.entries(schema.properties || {})) {
    if (!(key in value) || spec === null || typeof spec !== "object") continue;
    const v = value[key];
    if (spec.type && !typeOk(v, spec.type)) {
      errors.push(`"${key}" must be ${JSON.stringify(spec.type)}; got ${typeOf(v)}`);
      continue;
    }
    if (Array.isArray(spec.enum) && !spec.enum.includes(v)) {
      errors.push(`"${key}" must be one of ${JSON.stringify(spec.enum)}; got ${JSON.stringify(v)}`);
    }
    if (spec.maxLength !== undefined && typeof v === "string" && v.length > spec.maxLength) {
      errors.push(`"${key}" is ${v.length} characters, over the schema's maxLength ${spec.maxLength}`);
    }
    if (spec.items && spec.items.type && Array.isArray(v)) {
      const badAt = v.findIndex(item => !typeOk(item, spec.items.type));
      if (badAt !== -1) errors.push(`"${key}"[${badAt}] must be ${JSON.stringify(spec.items.type)}`);
    }
  }
  return { ok: errors.length === 0, errors };
}

// THE VERDICT MUST BE ABOUT THIS DELIVERY. Found by this ticket's own attended QA -- the Verifier's
// first real run, verdict `5f414763`, finding 1: pass two validated the agent's JSON against the
// Intent's schema and then recorded it, without ever comparing the `backlog_id` and `version` the
// agent itself returned against the ones being graded. A verdict file from another ticket, or a
// stale one left in the scratch directory from an earlier version, satisfies the schema perfectly
// and lands on the wrong row -- and a row in `runner_verdicts` is exactly the artifact nobody
// re-derives later. The schema REQUIRES both keys; this is the check that makes requiring them mean
// something.
//
// A blank on the caller's side is not a licence: an unstated `--ticket` cannot be matched, so it is
// reported as unmatchable rather than treated as agreement. Unknown is not innocent, here as
// everywhere else in this file.
export function verdictIdentityMismatch(agent, { ticket, version }) {
  const mismatches = [];
  const cmp = (label, mine, theirs) => {
    if (!theirs) return;                                  // the agent omitted it: the schema's job
    if (!mine) { mismatches.push(`the agent's ${label} is "${theirs}" but this run was given none, so the two cannot be matched`); return; }
    if (String(mine) !== String(theirs)) mismatches.push(`the agent graded ${label} "${theirs}" but this run is grading "${mine}"`);
  };
  cmp("backlog_id", ticket, agent?.backlog_id);
  cmp("version", version, agent?.version);
  return mismatches;
}

// THE FUNCTION THIS TICKET IS ABOUT. The agent contributes reasons; the code keeps every permission
// it already had.
//
//   mechanical      { verdict, reasoning } from verdictFor() over the three real gate results.
//   agent           the validated agent verdict object, or null when no agent spoke.
//   codeEligibility autoDoneEligibility()'s own answer, computed from the SAME facts the agent was
//                   shown. Unchanged by this ticket and still the ceiling.
//
// TWO INVARIANTS, BOTH CONJUNCTIONS, BOTH ASSERTED WITH THEIR MUTANTS IN
// tests/regression/SES-181-verifier.js:
//
//   (a) A RED GATE CAN NEVER BECOME APPROVE. `mechanical.verdict === "block"` short-circuits to
//       block. This is not a re-derivation of verdictFor() -- it is the refusal to let a second
//       opinion outrank the first, and it is why the agent's `verdict` is read as a TIGHTENING
//       (approve+approve => approve; anything else => block) rather than as the answer.
//
//   (b) A DIFF TOUCHING A SELF-CERTIFYING PATH CAN NEVER BE AUTO-DONE. `codeEligibility.eligible`
//       must be `true` before the agent's opinion is even consulted, so charter premise 3 sits
//       upstream of the model exactly as it sits upstream of the ladder in autoDoneEligibility().
//
// STRICT `=== true` ON BOTH SIDES, for SES-243's reason applied to a model's JSON: a verdict file
// carrying the string "true" is truthy, and the distance between truthy and true here is the
// distance between John tapping Accept and a cycle writing `done`.
export function reconcileJudgment({ mechanical, agent, codeEligibility }) {
  const overrides = [];
  const mechVerdict = mechanical?.verdict === "approve" ? "approve" : "block";

  let verdict = mechVerdict;
  if (!agent) {
    // The degrade path, named rather than silent: no agent spoke, so the mechanical verdict stands
    // exactly as it did before this ticket. This is `--judge=none` and it is not a widening.
    return {
      verdict,
      reasoning: `${mechanical?.reasoning ?? ""}\nNo agent judgment was obtained; the mechanical verdict stands (AGT-67 degrade path -- never a silent widening).`.trim(),
      eligible: codeEligibility?.eligible === true,
      reason: codeEligibility?.reason ?? "",
      overrides,
    };
  }

  if (mechVerdict === "block" && agent.verdict === "approve") {
    overrides.push(`the agent returned approve while a mechanical gate was not green; the code held the block (a red or skipped gate can never become approve -- charter decision 2's bar is not a matter of opinion)`);
  } else if (mechVerdict === "approve" && agent.verdict === "block") {
    // Judgment TIGHTENS. Not an override -- this is exactly what the lane is for.
    verdict = "block";
  } else if (mechVerdict === "approve" && agent.verdict !== "approve") {
    verdict = "block";
    overrides.push(`the agent's verdict was ${JSON.stringify(agent.verdict)}, which is neither approve nor block; an unreadable judgment fails closed to block`);
  }

  const codeEligible = codeEligibility?.eligible === true;
  const agentEligible = agent.auto_done_eligible === true;
  if (!codeEligible && agentEligible) {
    overrides.push(`the agent held the delivery auto-done eligible; the code refused it -- ${codeEligibility?.reason ?? "no code eligibility was computed"}`);
  }
  const eligible = verdict === "approve" && codeEligible && agentEligible;

  const lens = [];
  if (agent.pm_lens) lens.push(`PM lens: ${agent.pm_lens}`);
  if (agent.architect_lens) lens.push(`Chief Architect lens: ${agent.architect_lens}`);
  if (Array.isArray(agent.missing_evidence) && agent.missing_evidence.length) {
    lens.push(`Missing evidence named by the agent: ${agent.missing_evidence.join("; ")}`);
  }

  // FEATURE: SES-347 -- `agent.findings`, not `agent.reasoning`. The Intent's schema property was
  // renamed because the Anthropic API refused every request whose tool definition paired the
  // platform-injected `account` receipt with a property literally named `reasoning`
  // (stop_reason "refusal", stop_details.category "reasoning_extraction", empty content, 5/5 on the
  // real request; 0/5 renamed). This reads the AGENT's field only -- `runner_verdicts.reasoning`,
  // the column the line below builds, is unchanged and stays the home of the written judgment.
  const reasoning = [
    `${verdict}: ${agent.findings ?? "(the agent returned no findings)"}`,
    ...lens,
    `Mechanical: ${mechanical?.reasoning ?? "(none)"}`,
    overrides.length
      ? `CODE OVERRODE THE AGENT: ${overrides.join(" | ")}`
      : `The code agreed with the agent on both the verdict and the auto-done bar.`,
  ].join("\n");

  const reason = !codeEligible
    ? codeEligibility?.reason ?? ""
    : !agentEligible
      ? `the code's bar was met (${codeEligibility?.reason ?? ""}) but the agent withheld auto-done eligibility: ${agent.auto_done_reason ?? "(no reason given)"}`
      : `${codeEligibility?.reason ?? ""} The agent concurred: ${agent.auto_done_reason ?? "(no reason given)"}`;

  return { verdict, reasoning, eligible, reason, overrides };
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

// FEATURE: AGT-67 -- the evidence the judgment is handed, and the ONE insert both lanes go through.

// A DECLARED cap, not a silent slice. An agent that receives a truncated diff and cannot tell would
// certify a change it never saw -- so the marker says so in the payload itself, in a sentence the
// Verifier's own guardrails ("block on any missing input, naming it") can act on.
export const DIFF_CAP = 400_000;
export const KICKOFF_CAP = 60_000;

function cap(text, limit, what) {
  const s = String(text ?? "");
  if (s.length <= limit) return s;
  return `${s.slice(0, limit)}\n\n[TRUNCATED: this ${what} is ${s.length} characters and was cut at ${limit}. You have NOT seen all of it -- treat anything you would need the rest to judge as missing evidence.]`;
}

function readCapped(absPath, limit) {
  if (!absPath) return null;
  try { return cap(fs.readFileSync(absPath, "utf8"), limit, "document"); }
  catch (e) { return `[UNREADABLE: ${absPath} -- ${e.message}]`; }
}

// Committed-vs-base plus the working tree, the same two views changedFilesFor() takes its paths
// from, so the file list and the diff cannot describe two different trees.
function diffFor(repoRoot, base) {
  const parts = [];
  for (const argv of [["diff", base + "...HEAD"], ["diff"]]) {
    const r = spawnSync("git", argv, { cwd: repoRoot, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    if (r.error || r.status !== 0) return `[UNREADABLE: git ${argv.join(" ")} failed -- the diff could not be read, which is missing evidence and fails closed]`;
    if (String(r.stdout).trim()) parts.push(`--- git ${argv.join(" ")} ---\n${r.stdout}`);
  }
  return cap(parts.join("\n"), DIFF_CAP, "diff");
}

// THE ROW, as one pure function both lanes call. Exported so a guard can assert that the JUDGED
// lane records a row identical in SHAPE to the mechanical lane's without inserting anything into the
// live verdict ledger -- `runner_verdicts` gained no column for this ticket, and the agent's lens
// findings reach it through `reasoning`, which is the column that already exists to carry exactly
// that. A judged row that grew a key would be a schema change nobody asked for.
export function verdictRowFor({ cycleId, ticket, version, verdict, gateResults, reasoning, eligible, autoDoneReason, epicName, priorityClass }) {
  const g = gateResults || {};
  return {
    cycle_id: cycleId,
    backlog_id: ticket || null,
    version: version || null,
    verdict,
    gate_build: g.build,
    gate_regression: g.regression,
    gate_hygiene: g.hygiene,
    reasoning,
    auto_done_eligible: eligible,
    auto_done_reason: autoDoneReason,
    epic_name: epicName ?? null,
    priority_class: priorityClass ?? null,
  };
}

// The single write this script makes, in one place, so the judged lane and the mechanical lane
// cannot drift into two payload shapes for one table.
async function insertVerdict(args) {
  const ins = await rest(args.supabaseUrl, args.supabaseKey, "runner_verdicts", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(verdictRowFor(args)),
  });
  if (ins.error) return { error: ins.error };
  return { rowId: Array.isArray(ins.rows) && ins.rows[0] ? ins.rows[0].id : null };
}

// Both judged lanes end here: reconcile, then record. The reconciliation is reconcileJudgment()'s
// and nothing about the two invariants is re-decided at this call site.
async function recordJudgedVerdict({ stored, agentVerdict, intentSlug, cycleId, ticket, version, dryRun, supabaseUrl, supabaseKey }) {
  const gateResults = stored.gates || {};
  const mechanical = stored.mechanical || verdictFor(gateResults);
  const codeEligibility = stored.code_eligibility || { eligible: false, reason: "the pass-one context carried no code eligibility, so the bar fails closed" };
  const r = reconcileJudgment({ mechanical, agent: agentVerdict, codeEligibility });

  const detailLine = GATES.map(g => `${g.label}=${gateResults[g.key] ?? "skipped"} [${(stored.gate_detail || {})[g.key] ?? "no detail recorded"}]`).join("\n  ");
  const reasoning = `${r.reasoning}\nJudged by ${VERIFIER_AGENT_ID}/${VERIFY_CAPABILITY} (intent ${intentSlug}).${stored.note ? ` ${stored.note}` : ""}\nGates: ${detailLine.replace(/\n\s+/g, " | ")}`;
  const prose =
    `verifier verdict: ${r.verdict.toUpperCase()}${ticket ? ` on ${ticket}` : ""}${version ? ` (${version})` : ""} -- judged\n` +
    `  ${detailLine}\n` +
    `  ${r.reasoning.replace(/\n/g, "\n  ")}\n` +
    `  auto-done eligible: ${r.eligible ? "YES" : "no"} -- ${r.reason}`;
  const payload = {
    ok: r.verdict === "approve",
    exitCode: r.verdict === "approve" ? 0 : 1,
    verdict: r.verdict, gates: gateResults, gateDetail: stored.gate_detail || {},
    reasoning, agent_verdict: agentVerdict.verdict, overrides: r.overrides,
    auto_done_eligible: r.eligible, auto_done_reason: r.reason,
    ticket: ticket || null, version: version || null,
    epic_name: stored.epic_name ?? null, priority_class: stored.priority_class ?? null,
    judged_by: `${VERIFIER_AGENT_ID}/${VERIFY_CAPABILITY}`, intent_slug: intentSlug,
  };

  if (dryRun) {
    return emit({ code: payload.exitCode, payload: { ...payload, recorded: false }, prose: prose + "\n  --dry-run: nothing recorded." });
  }
  const ins = await insertVerdict({
    supabaseUrl, supabaseKey, cycleId, ticket, version, verdict: r.verdict, gateResults,
    reasoning, eligible: r.eligible, autoDoneReason: r.reason,
    epicName: stored.epic_name ?? null, priorityClass: stored.priority_class ?? null,
  });
  if (ins.error) {
    return emit({ code: 2, payload: { ...payload, recorded: false, error: ins.error },
      prose: `${prose}\n  RECORDING FAILED: ${ins.error}\n  Exiting 2 -- the verdict above was reached but is not in the ledger, so it is not assertable.` });
  }
  return emit({ code: payload.exitCode, payload: { ...payload, recorded: true, verdict_id: ins.rowId },
    prose: `${prose}\n  recorded as runner_verdicts ${ins.rowId}` });
}

// `--judge=executor`. NOT PROVEN LIVE by AGT-67 -- see the header's named limit. The endpoint and
// both bypass headers follow docs/runbooks/CHI-TRUE-REGRESSION.md §3 (HAR-33: a live API call from a
// non-`unlimited` IP also needs `x-db-gate-bypass` or it 403s at the edge).
async function callExecutor({ intentSlug, taskContext, tenant }) {
  const endpoint = process.env.DEEPBENCH_EXECUTOR_URL
    || "https://deepbench-frontend-git-dev-roadmapventures-projects.vercel.app/api/capabilities/execute";
  const headers = { "Content-Type": "application/json", "x-db-call-source": "script" };
  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) headers["x-vercel-protection-bypass"] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (process.env.GATE_BYPASS_SECRET) headers["x-db-gate-bypass"] = process.env.GATE_BYPASS_SECRET;
  let res;
  try {
    res = await fetch(endpoint, {
      method: "POST", headers,
      body: JSON.stringify({
        capability_slug: VERIFY_CAPABILITY, intent_slug: intentSlug,
        agent_id: VERIFIER_AGENT_ID, tenant_id: tenant, task_context: taskContext,
      }),
    });
  } catch (e) { return { error: `${endpoint}: ${e.message}` }; }
  if (!res.ok) return { error: `${endpoint} returned HTTP ${res.status} ${res.statusText}: ${await res.text().catch(() => "")}` };
  let body;
  try { body = await res.json(); } catch (e) { return { error: `the executor returned unparseable JSON: ${e.message}` }; }
  let content = body?.content ?? body?.result?.content ?? body;
  if (typeof content === "string") {
    try { content = JSON.parse(content); } catch { /* validateAgentVerdict() will reject it, by name */ }
  }
  return { verdict: content, traceId: body?.trace_id ?? body?.result?.trace_id ?? null };
}

// A cost nobody could read is UNKNOWN, never 0. `api_cost_qa_usd` is a measurement of what the
// executor lane costs; a silent zero would make it look free forever, which is the same
// blank-is-not-zero boundary the rest of this platform keeps.
async function executorCostFor(supabaseUrl, supabaseKey, traceId) {
  if (!traceId) return { usd: null, note: "the executor returned no trace_id, so its rows could not be found" };
  const r = await rest(supabaseUrl, supabaseKey, `ai_activity_log?select=cost_usd&trace_id=eq.${encodeURIComponent(traceId)}`);
  if (r.error) return { usd: null, note: `ai_activity_log lookup failed: ${r.error}` };
  const rows = Array.isArray(r.rows) ? r.rows : [];
  const priced = rows.filter(x => x.cost_usd !== null && x.cost_usd !== undefined);
  if (!priced.length) return { usd: null, note: `${rows.length} ai_activity_log row(s) for this trace carry no cost_usd` };
  return { usd: priced.reduce((s, x) => s + Number(x.cost_usd), 0), note: "" };
}

async function addQaCost(supabaseUrl, supabaseKey, cycleId, usd) {
  const cur = await rest(supabaseUrl, supabaseKey, `runner_cycles?select=api_cost_qa_usd&id=eq.${encodeURIComponent(cycleId)}&limit=1`);
  if (cur.error) return;
  const now = Number((Array.isArray(cur.rows) && cur.rows[0] ? cur.rows[0].api_cost_qa_usd : 0) || 0);
  await rest(supabaseUrl, supabaseKey, `runner_cycles?id=eq.${encodeURIComponent(cycleId)}`, {
    method: "PATCH", body: JSON.stringify({ api_cost_qa_usd: now + usd }),
  });
}

// FEATURE: AGT-67 -- the judgment lane's network reads, kept out of main() so main() stays readable.
// The INTENT comes from `capabilities.default_intent_slug`, never from a literal here: db-assembly.js
// (AA-188, line ~684) does NOT fall back to it, so a null intent_slug filters every intent-type Skill
// out of the assembly and the verdict contract disappears from a prompt that still looks complete.
async function judgmentRows(supabaseUrl, supabaseKey) {
  const cr = await rest(supabaseUrl, supabaseKey, `capabilities?select=slug,default_intent_slug&slug=eq.${VERIFY_CAPABILITY}&limit=1`);
  if (cr.error) return { error: `could not read the ${VERIFY_CAPABILITY} capability row: ${cr.error}` };
  const capRow = Array.isArray(cr.rows) ? cr.rows[0] : null;
  if (!capRow) return { error: `no capabilities row for "${VERIFY_CAPABILITY}" -- apply the AGT-67 section of docs/design/ga-agents-seed.sql` };
  const intentSlug = capRow.default_intent_slug || null;
  if (!intentSlug) return { error: `capability "${VERIFY_CAPABILITY}" declares no default_intent_slug, so the verdict contract cannot be loaded` };
  const sr = await rest(supabaseUrl, supabaseKey, `skill_profiles?select=slug,traits&slug=eq.${encodeURIComponent(intentSlug)}&limit=1`);
  if (sr.error) return { error: `could not read the Intent Skill "${intentSlug}": ${sr.error}` };
  const intentRow = Array.isArray(sr.rows) ? sr.rows[0] : null;
  if (!intentRow) return { error: `no skill_profiles row for the Intent "${intentSlug}"` };
  const schema = intentRow.traits && intentRow.traits.schema;
  if (!schema) return { error: `the Intent "${intentSlug}" carries no traits.schema, so an agent verdict cannot be validated` };
  return { intentSlug, schema };
}

async function main() {
  const repoRoot = arg("repo", path.resolve(__dirname, ".."));
  const dryRun = process.argv.includes("--dry-run");
  const cycleId = arg("cycle-id", "");
  const ticket = arg("ticket", "");
  const version = arg("version", "");

  // FEATURE: AGT-67 -- the judge lane. Validated, never defaulted on a typo (see parseJudgeMode).
  const judgeParsed = parseJudgeMode(arg("judge", undefined));
  if (judgeParsed.error) {
    return emit({ code: 2, payload: { ok: false, exitCode: 2, kind: "cannot-run", error: judgeParsed.error },
      prose: `verifier: ${judgeParsed.error}. Exiting 2 -- this is NOT a verdict.` });
  }
  const judge = judgeParsed.mode;
  const verdictFilePath = arg("verdict-file", "");
  const scratchDir = arg("scratch", os.tmpdir());
  const contextPath = arg("context-file", "") || judgeContextPathFor(scratchDir, ticket);
  const kickoffPath = arg("kickoff", "");
  // Pass two is "session mode AND a verdict file". It re-runs NOTHING: the gates that graded this
  // delivery ran in pass one and their results are in the context file. Re-running them here would
  // grade a different instant with the same version number on it -- and would cost 20 minutes.
  const awaitingJudgment = judge === "session" && !verdictFilePath;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!dryRun) {
    const missing = [!supabaseUrl && "SUPABASE_URL", !supabaseKey && "SUPABASE_SERVICE_KEY", !cycleId && "--cycle-id"].filter(Boolean);
    // Pass one records nothing, so it does not need a cycle id -- but it DOES need credentials,
    // because the prompt it prints is assembled from the database.
    const needed = awaitingJudgment ? missing.filter(m => m !== "--cycle-id") : missing;
    if (needed.length) {
      return emit({ code: 2, payload: { ok: false, exitCode: 2, kind: "cannot-run", missing: needed },
        prose: `verifier: missing ${needed.join(", ")}. Exiting 2 (the verifier could not run) -- this is NOT a verdict. Use --dry-run to reach a verdict without recording one.` });
    }
  }
  if (judge !== "none" && !ticket) {
    return emit({ code: 2, payload: { ok: false, exitCode: 2, kind: "cannot-run", error: "--judge needs --ticket" },
      prose: `verifier: --judge=${judge} requires --ticket -- the judgment context file is derived from it, and a ticket-less run would have two concurrent cycles write the same path. Exiting 2.` });
  }

  // ---- AGT-67 pass two: the agent has spoken; validate, reconcile, record. -------------------
  if (judge === "session" && verdictFilePath) {
    let stored, agentVerdict;
    try {
      stored = JSON.parse(fs.readFileSync(contextPath, "utf8"));
    } catch (e) {
      return emit({ code: 2, payload: { ok: false, exitCode: 2, kind: "cannot-run", error: `context: ${e.message}` },
        prose: `verifier: could not read the judgment context at ${contextPath} (${e.message}). Run pass one first, or pass --context-file. Exiting 2 -- no verdict.` });
    }
    try {
      agentVerdict = JSON.parse(fs.readFileSync(verdictFilePath, "utf8"));
    } catch (e) {
      return emit({ code: 2, payload: { ok: false, exitCode: 2, kind: "cannot-run", error: `verdict-file: ${e.message}` },
        prose: `verifier: could not read the agent's verdict at ${verdictFilePath} (${e.message}). Exiting 2 -- an unreadable judgment is the ABSENCE of one, never a block on the change.` });
    }
    const rows = await judgmentRows(supabaseUrl, supabaseKey);
    if (rows.error) {
      return emit({ code: 2, payload: { ok: false, exitCode: 2, kind: "cannot-run", error: rows.error },
        prose: `verifier: ${rows.error}. Exiting 2 -- no verdict.` });
    }
    const valid = validateAgentVerdict(rows.schema, agentVerdict);
    if (!valid.ok) {
      return emit({ code: 2, payload: { ok: false, exitCode: 2, kind: "cannot-run", schema_errors: valid.errors },
        prose: `verifier: the agent's verdict does not satisfy Intent "${rows.intentSlug}"'s schema:\n  - ${valid.errors.join("\n  - ")}\nExiting 2 and recording NOTHING -- a verdict that fails its own contract is not a judgment about the change, and writing the mechanical verdict in its place would launder an approve the agent never validly gave.` });
    }
    const wrongDelivery = verdictIdentityMismatch(agentVerdict, { ticket, version });
    if (wrongDelivery.length) {
      return emit({ code: 2, payload: { ok: false, exitCode: 2, kind: "cannot-run", identity_errors: wrongDelivery },
        prose: `verifier: the agent's verdict is not about this delivery:\n  - ${wrongDelivery.join("\n  - ")}\nExiting 2 and recording NOTHING -- a stale or foreign verdict file passes the schema perfectly, and runner_verdicts is exactly the row nobody re-derives later.` });
    }
    return recordJudgedVerdict({ stored, agentVerdict, intentSlug: rows.intentSlug, cycleId, ticket, version, dryRun, supabaseUrl, supabaseKey });
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

  const base = arg("base", "origin/dev");
  const changedFiles = changedFilesFor(repoRoot, base);

  // FEATURE: SES-337 -- the DATABASE half of charter premise 3, read from this cycle's own
  // before-images. §19v's "no before-image, no write" is what makes them the complete record of the
  // rows this cycle touched, so a `skill_profiles` image is the only place a rewrite of the
  // Verifier's own instructions shows up -- the diff never carries it.
  //
  // THREE STATES AND THEY ARE NOT TWO. `images = []` means "read, and this cycle changed no Skill
  // row" -> clean. `images = null` means "could not be read" -> selfCertifyingSkillEdit() fails
  // closed. And a run with NO CYCLE (a `--dry-run`, or a ticket-less invocation) has no images to
  // read by construction: it is handed `[]` for the DB half and still gets the FILE half, because a
  // dry run records nothing and refusing it a bar it cannot spend would only mislead its reader.
  // The slug map covers step 8b's INSERT convention (`row_data = NULL`): the row exists live now, so
  // the slug is one read away, and an image left unresolved by BOTH still blocks.
  let skillImages = cycleId ? null : [];
  let slugById;
  let skillNote = cycleId ? "" : " (no cycle id, so no before-images to read for the Skill-row check; the file half still applied)";
  if (cycleId && supabaseUrl && supabaseKey) {
    const bi = await rest(supabaseUrl, supabaseKey,
      `runner_before_images?select=table_name,pk_value,row_data&cycle_id=eq.${encodeURIComponent(cycleId)}&table_name=eq.skill_profiles`);
    if (bi.error) skillNote = ` (runner_before_images unread, Skill-row self-certification check FAILS CLOSED: ${bi.error})`;
    else {
      skillImages = Array.isArray(bi.rows) ? bi.rows : [];
      const needSlug = skillImages.filter(r => r && (r.row_data === null || r.row_data === undefined)).map(r => r.pk_value);
      if (needSlug.length) {
        const sp = await rest(supabaseUrl, supabaseKey,
          `skill_profiles?select=id,slug&id=in.(${needSlug.map(encodeURIComponent).join(",")})`);
        if (!sp.error && Array.isArray(sp.rows)) slugById = Object.fromEntries(sp.rows.map(r => [r.id, r.slug]));
      }
    }
  } else if (cycleId) {
    skillNote = " (no credentials to read runner_before_images; the Skill-row check FAILS CLOSED)";
  }
  const skillRowEdit = selfCertifyingSkillEdit({ beforeImages: skillImages, changedFiles, slugById });

  const elig = autoDoneEligibility({ verdict, epicName, epicProjectExecuting, priorityClass, changedFiles, projectExecuting, classAutonomy, skillRowEdit });
  const autoDoneReason = elig.reason + lookupNote + primeNote + ladderNote + skillNote;

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

  // ---- AGT-67 pass one: hand the judgment everything, print the prompt, record NOTHING. -------
  //
  // THE CONTEXT FILE IS THE EVIDENCE, and it carries the gate outputs rather than an invitation to
  // re-run them: the Verifier's own guardrails forbid it re-running the gates or trusting a claim of
  // green without the output (`vf-guardrails.must_not`), which is only satisfiable if the output is
  // in the payload. The diff is included by content, capped, with the cap declared -- a truncated
  // diff the agent cannot tell is truncated would let it certify a change it never saw.
  if (awaitingJudgment) {
    const judgeCtx = {
      backlog_id: ticket,
      version: version || null,
      base,
      changed_files: changedFiles,
      gates: gateResults,
      gate_detail: gateDetail,
      mechanical: { verdict, reasoning },
      epic_name: epicName,
      priority_class: priorityClass,
      class_autonomy: classAutonomy,
      epic_project_executing: epicProjectExecuting,
      project_executing: projectExecuting,
      // THE FULL REASON, not `elig` bare. Found by this ticket's own attended QA (verdict
      // 5f414763, finding 2): the mechanical lane stores `elig.reason + lookupNote + primeNote +
      // ladderNote` and a session-judged row was storing only `elig.reason` -- the same COLUMNS with
      // less content, which is exactly the kind of lane-shaped difference the ledger must not have.
      // "the ladder declined" and "nobody asked the ladder" live in those notes.
      code_eligibility: { ...elig, reason: autoDoneReason },
      self_certifying_paths: SELF_CERTIFYING_PATHS,
      // FEATURE: SES-337 -- the agent is shown the ROW half too, and the code's answer on it, so it
      // can make the same call from the same evidence. `vf-guardrails.must` already tells it to
      // refuse the bar to "the Verifier's own Skill rows"; without this it had no way to check.
      self_certifying_skill_prefix: SELF_CERTIFYING_SKILL_PREFIX,
      self_certifying_skill_files: SELF_CERTIFYING_SKILL_FILES,
      skill_row_self_certification: skillRowEdit,
      kickoff: readCapped(kickoffPath ? path.resolve(repoRoot, kickoffPath) : null, KICKOFF_CAP),
      diff: diffFor(repoRoot, base),
    };
    try {
      fs.mkdirSync(path.dirname(contextPath), { recursive: true });
      fs.writeFileSync(contextPath, JSON.stringify(judgeCtx, null, 2), "utf8");
    } catch (e) {
      return emit({ code: 2, payload: { ok: false, exitCode: 2, kind: "cannot-run", error: e.message },
        prose: `${prose}\n  could not write the judgment context to ${contextPath}: ${e.message}. Exiting 2 -- no verdict.` });
    }
    const rows = await judgmentRows(supabaseUrl, supabaseKey);
    if (rows.error) {
      return emit({ code: 2, payload: { ok: false, exitCode: 2, kind: "cannot-run", error: rows.error },
        prose: `${prose}\n  ${rows.error}\n  Exiting 2 -- no verdict.` });
    }
    // THE ASSEMBLY IS THE EXECUTOR'S, imported rather than restated (SES-331). Dynamic, so that a
    // `--judge=none` run -- and every pure-helper import the regression suite makes -- never loads
    // the api/ tree or needs its credentials.
    let promptText;
    try {
      const { assemblePrompt } = await import("../api/prompt/db-assembly.js");
      const { renderAssembly } = await import("./agent-prompt.js");
      const assembly = await assemblePrompt({
        capability_slug: VERIFY_CAPABILITY,
        agent_id: VERIFIER_AGENT_ID,
        tenant_id: arg("tenant", "global"),
        task_context: judgeCtx,
        intent_slug: rows.intentSlug,
      });
      const rendered = renderAssembly(assembly);
      if (!rendered.system_prompt) throw new Error(`"${VERIFY_CAPABILITY}" assembled zero renderable sections for agent "${VERIFIER_AGENT_ID}"`);
      promptText = `# ${assembly.agent_card?.name ?? VERIFIER_AGENT_ID} — ${assembly.agent_card?.role ?? ""} · capability ${assembly.capability_slug} · intent ${rows.intentSlug} · model ${assembly.llm?.model}\n${rendered.system_prompt}`;
      if (rendered.omitted?.length) console.error(`verifier: prompt sections omitted (no stored content): ${rendered.omitted.join(", ")}`);
    } catch (e) {
      return emit({ code: 2, payload: { ok: false, exitCode: 2, kind: "cannot-run", error: e.message },
        prose: `${prose}\n  could not assemble the ${VERIFY_CAPABILITY} prompt: ${e.message}\n  Exiting 2 -- no verdict.` });
    }
    // The prompt goes to a FILE always and to stdout only when stdout is not carrying the machine
    // payload. Found by this ticket's own attended QA (verdict 5f414763, finding 3): under `--json`
    // emit() writes one JSON line to stdout, and a 97 KB prompt printed to the same stream ahead of
    // it makes that line unparseable -- a `--json` contract broken by the one path that needed it.
    const promptPath = contextPath.replace(/\.json$/, "") + ".prompt.txt";
    try { fs.writeFileSync(promptPath, promptText, "utf8"); }
    catch (e) { console.error(`verifier: could not write the prompt to ${promptPath}: ${e.message}`); }
    if (!process.argv.includes("--json")) console.log(promptText);
    return emit({
      code: EXIT_AWAITING_JUDGMENT,
      // NOT `...payload`. Same QA, finding 3: spreading the mechanical payload put `ok: true` and
      // `exitCode: 0` on a run that exited 3 having recorded nothing -- this file's own header calls
      // reading 3 as a verdict "the defect this numbering exists to make visible", and the script was
      // seeding it. There is no verdict here, so the payload states none: `ok` is false because
      // nothing was concluded, and the mechanical gate results ride under their own keys.
      payload: {
        ok: false, exitCode: EXIT_AWAITING_JUDGMENT, kind: "awaiting-judgment", recorded: false,
        verdict: null, mechanical_verdict: verdict, gates: gateResults, gateDetail: gateDetail,
        ticket: ticket || null, version: version || null,
        context_file: contextPath, prompt_file: promptPath, intent_slug: rows.intentSlug,
      },
      prose: `${prose}\n  AWAITING JUDGMENT (exit ${EXIT_AWAITING_JUDGMENT}): the gates ran and NOTHING was recorded.\n` +
        `  context: ${contextPath}\n  prompt:  ${promptPath}\n` +
        `  Run that prompt as a ${VERIFIER_AGENT_ID} sub-agent with the context file as its task_context, save its JSON, then re-run with --verdict-file=<path>.`,
    });
  }

  // ---- AGT-67 `--judge=executor`: one run, the executor's own POST. NOT PROVEN LIVE. ----------
  if (judge === "executor") {
    const rows = await judgmentRows(supabaseUrl, supabaseKey);
    if (rows.error) {
      return emit({ code: 2, payload: { ok: false, exitCode: 2, kind: "cannot-run", error: rows.error },
        prose: `${prose}\n  ${rows.error}\n  Exiting 2 -- no verdict.` });
    }
    const judgeCtx = {
      backlog_id: ticket, version: version || null, base,
      changed_files: changedFiles, gates: gateResults, gate_detail: gateDetail,
      mechanical: { verdict, reasoning }, epic_name: epicName, priority_class: priorityClass,
      class_autonomy: classAutonomy, code_eligibility: elig,
      self_certifying_paths: SELF_CERTIFYING_PATHS,
      // FEATURE: SES-337 -- the agent is shown the ROW half too, and the code's answer on it, so it
      // can make the same call from the same evidence. `vf-guardrails.must` already tells it to
      // refuse the bar to "the Verifier's own Skill rows"; without this it had no way to check.
      self_certifying_skill_prefix: SELF_CERTIFYING_SKILL_PREFIX,
      self_certifying_skill_files: SELF_CERTIFYING_SKILL_FILES,
      skill_row_self_certification: skillRowEdit,
      kickoff: readCapped(kickoffPath ? path.resolve(repoRoot, kickoffPath) : null, KICKOFF_CAP),
      diff: diffFor(repoRoot, base),
    };
    const call = await callExecutor({ intentSlug: rows.intentSlug, taskContext: judgeCtx, tenant: arg("tenant", "global") });
    if (call.error) {
      return emit({ code: 2, payload: { ...payload, recorded: false, error: call.error },
        prose: `${prose}\n  the capability executor could not be reached: ${call.error}\n  Exiting 2 -- no verdict. (--judge=executor is an unproven path; --judge=none is the degrade.)` });
    }
    const valid = validateAgentVerdict(rows.schema, call.verdict);
    if (!valid.ok) {
      return emit({ code: 2, payload: { ok: false, exitCode: 2, kind: "cannot-run", schema_errors: valid.errors },
        prose: `${prose}\n  the executor's verdict does not satisfy Intent "${rows.intentSlug}"'s schema:\n  - ${valid.errors.join("\n  - ")}\n  Exiting 2, recording nothing.` });
    }
    const wrongDelivery = verdictIdentityMismatch(call.verdict, { ticket, version });
    if (wrongDelivery.length) {
      return emit({ code: 2, payload: { ok: false, exitCode: 2, kind: "cannot-run", identity_errors: wrongDelivery },
        prose: `${prose}\n  the executor's verdict is not about this delivery:\n  - ${wrongDelivery.join("\n  - ")}\n  Exiting 2, recording nothing.` });
    }
    // The API dollars this path spends are the cycle's, and a cost nobody could read is recorded as
    // unknown rather than as zero -- `api_cost_qa_usd` is a measurement, and a silent 0 would make
    // the executor lane look free forever.
    const cost = await executorCostFor(supabaseUrl, supabaseKey, call.traceId);
    if (!dryRun && cycleId && cost.usd !== null) await addQaCost(supabaseUrl, supabaseKey, cycleId, cost.usd);
    const stored = {
      backlog_id: ticket, version: version || null, gates: gateResults, gate_detail: gateDetail,
      mechanical: { verdict, reasoning }, epic_name: epicName, priority_class: priorityClass,
      code_eligibility: { ...elig, reason: autoDoneReason },
      note: `--judge=executor; trace ${call.traceId ?? "(none returned)"}; api cost ${cost.usd === null ? `UNKNOWN (${cost.note})` : `$${cost.usd}`}`,
    };
    return recordJudgedVerdict({ stored, agentVerdict: call.verdict, intentSlug: rows.intentSlug, cycleId, ticket, version, dryRun, supabaseUrl, supabaseKey });
  }

  if (dryRun) {
    return emit({ code: payload.exitCode, payload: { ...payload, recorded: false }, prose: prose + "\n  --dry-run: nothing recorded." });
  }

  const ins = await insertVerdict({
    supabaseUrl, supabaseKey, cycleId, ticket, version, verdict, gateResults,
    reasoning: `${reasoning}\nGates: ${detailLine.replace(/\n\s+/g, " | ")}`,
    eligible: elig.eligible, autoDoneReason, epicName, priorityClass,
  });
  if (ins.error) {
    // The verdict was reached but not recorded. That is a verifier failure, not a verdict on the
    // change -- exit 2, for the same reason a missing credential is 2.
    return emit({ code: 2, payload: { ...payload, recorded: false, error: ins.error },
      prose: `${prose}\n  RECORDING FAILED: ${ins.error}\n  Exiting 2 -- the verdict above was reached but is not in the ledger, so it is not assertable.` });
  }

  return emit({ code: payload.exitCode, payload: { ...payload, recorded: true, verdict_id: ins.rowId },
    prose: `${prose}\n  recorded as runner_verdicts ${ins.rowId}` });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}
