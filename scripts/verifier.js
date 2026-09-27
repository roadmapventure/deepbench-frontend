#!/usr/bin/env node
// DeepBench v7.0.500 | scripts/verifier.js | SES-403 -- `--regrade`: A SHIP BLOCKED FOR A CAUSE
// OUTSIDE ITSELF CAN BE GRADED AGAIN, and the thing to read twice is that this branch RUNS NO GATE.
// Measured live 2026-09-15: SES-379/383/388/390/394/395/398 are all `delivered`, each with its
// latest and only `runner_verdicts` row a `block`, `gate_build` green on all seven, the reds
// entirely `regression` and/or `hygiene`; `runner_decisions` holds zero `kind='ship'` rows for any
// of them, and `record_ship_decision()`'s first refusal means none can ever be written. Seven
// deliveries permanently unshippable for somebody else's red.
//
// THE MAPPING IS THE MECHANISM (`GATE_CI_JOBS`, mirrored by `public.ci_jobs_for_gates`): this
// file's three gate keys collapse onto CI's two blocking jobs -- `build` -> `Build (blocking)`,
// `regression` AND `hygiene` -> `Tripwire + regression (blocking)`. A ship is re-gradable when
// every job its verdict's RED gates map to is `success` in the newest `ref='dev'` conclusion, that
// conclusion concluded AFTER the verdict, and no unreversed ship decision exists. The verdict comes
// from that conclusion and never from a local run: SES-352 makes CI the authority on dev green, and
// a re-run here would grade THIS worktree at THIS instant -- a different tree from either.
//
// A GREEN JOB IS EVIDENCE; A FAILING ONE IS NOT. Dev head CONTAINS this delivery, so a `success`
// job there proves the delivery does not break it -- and a `failure` proves nothing, because
// somebody else's commit can be the one breaking it. That asymmetry is the whole lane, and it is
// why `regradeGateResults()` re-grades only the gates the block was RED on and carries a gate the
// delivery already passed on its own tree forward unchanged. Importing dev head's failures onto
// gates this delivery passed would put back exactly the outside cause the ticket exists to remove.
//
// THE NEGATIVE CONTROL IS FREE AND NEEDS NO CODE. A ship blocked on its OWN diff has that diff in
// `dev`, so the job it broke is still `failure` at dev head; `regradable_ships()` never returns it
// and the flag refuses it at exit 2. A missing conclusion, a `skipped` gate, or a job absent from
// the run excludes just as hard -- the absence of evidence about dev head is never evidence that
// dev head is green.
//
// DeepBench v7.0.472 | scripts/verifier.js | SES-345 -- THE VERDICT ROW CARRIES THE SHA IT GRADED,
// and the thing to read twice is that leg 4 of the handoff was never missing a FACT, it was missing a
// JOIN KEY. `ship_handoff_census` has asked "does this ship have a sha?" since it was built, but it
// asked it of `runner_cycles.item_id` -- the CYCLE's claim about which ticket it ran. Measured live
// 2026-09-13: of 56 verdicts in 7 days, 32 hang off one shared attended cycle (`a8000000`, 23
// tickets, one `push_sha`), so for those the census's answer was about a cycle that graded 22 other
// tickets too. `graded_sha` is the VERDICT's own claim about the TREE, written by the lane that ran
// the gates, and `left(…,7)` is the join because attended cycles store short shas.
//
// READ ONCE, IN THE MECHANICAL LANE, AND CARRIED. Both judged lanes take the value out of the
// pass-one context file rather than calling `gradedShaFor()` again: pass two runs after the sub-agent
// has spoken, and a `git rev-parse` at that point names the tree the JUDGMENT was filed on. The whole
// point of the key is that it names the tree the GATES ran on, and those are not always the same tree.
//
// DeepBench v7.0.471 | scripts/verifier.js | SES-344 slice 1 -- THE SHIP REPORT ENTERS THE JUDGE'S
// CONTRACT, and the thing to read twice is that SEVEN OF THE EIGHT DISAGREEMENTS THE REPRODUCTION
// COUNTED AGAINST THE AGENT WERE DEFECTS IN WHAT THIS FILE HANDED IT. Adjudicated 2026-09-13
// against the eight ship commit bodies (`tests/fixtures/verdicts-30-adjudication.json`, quotes
// re-derived from `git log -1 --format=%B <sha>`): 1 is the harness (SES-336's 639,956-char diff
// cut at 400,000 inside `docs/backlog/BACKLOG-SNAPSHOT.md`, ahead of the runbook hunk the judgment
// needed), 6 named evidence that WAS in the commit body the contract never carried, and 1
// (SES-321) names evidence that exists nowhere the platform can hand over -- one-line body, cycle
// notes 0 bytes -- so that block stands. The old bar counted all 8 as the agent's error.
//
// SO TWO KEYS MOVE, AND NEITHER IS A LOOSENING OF THE BAR. `ship_report` carries
// `commit_messages` (`git log --format=%B <base>..HEAD`) and `cycle_notes`
// (`runner_cycles.notes`, where runbook step 7 stores the Builder's report) into BOTH judge lanes
// -- the same evidence key in each, for the reason `code_eligibility` below already records: the
// same key carrying less content in one lane than the other is the lane-shaped difference this
// file's own SES-337 note calls a defect. And `diffFor()` now ORDERS the diff instead of raising
// `DIFF_CAP`: the ticket's own hunks first, the four re-rendered artifacts (`DIFF_LAST`) last.
//
// ORDERING, NOT A BIGGER CAP, deliberately. Any fixed number re-creates SES-336 at a bigger
// snapshot; git's alphabetical order is what put a re-rendered board ahead of the code under
// judgment, and that is the thing to fix. The cap stays declared and stays visible in the payload
// -- an agent that cannot tell its diff was cut would certify a change it never saw.
//
// DeepBench v7.0.468 | scripts/verifier.js | SES-343 -- THE OUTPUT CONTRACT STOPS VOIDING VALID
// VERDICTS, and the thing to read twice is that the contract did not get looser: it got a SEVERITY
// MODEL. `validateAgentVerdict()` made every schema miss fatal, so a judgment whose `architect_lens`
// ran 1,464 characters against the Intent's 1,200 was thrown away whole -- exit 2, no
// `runner_verdicts` row, the model's actual verdict on the ship lost. Measured 2026-09-12 by
// replaying the 27 recorded judgments in tests/fixtures/verdicts-30-judgments.json against the
// fixture's own `intent_schema`: 17 of 27 rejected, 17 on `architect_lens` (1,212-1,464 chars), 3 on
// `pm_lens`, and NONE on any other key. A decisive miss stays fatal; a presentation overflow is cut
// to the schema's own maxLength, recorded in `truncations`, and said out loud on the row. The
// schema itself is untouched -- it is data on the Intent row (ARCHITECTURE §19b), and the fix
// belongs in the reader because an active governance agent's Skill row is gated (§19v).
//
// DeepBench v7.0.462 | scripts/verifier.js | SES-359 -- THE KICKOFF DECLARES ITS LANES, and the
// thing to read twice is that this is a SECOND refusal wired through the SAME two ends SES-376
// built, not a new mechanism: `--check-kickoff=<path>` refuses the DRAFT that carries no `Lanes:`
// line, and the verdict block refuses a DELIVERY whose `--kickoff=` carries none. Size and lanes
// are graded in that order at both ends -- an over-cap kickoff is refused on size first, because a
// kickoff nobody will accept at all should not be told about its second defect.
//
// WHY A DECLARATION AND NOT A MEASUREMENT. Measured live 2026-09-12: `ai_activity_log` holds 2
// Designer and 1 Builder rows, all 2026-09-09 fixtures, from 12 kickoffs since -- the runs are not
// logged, so which lane paid for a kickoff cannot be read off the log after the fact. Until it can,
// the kickoff says so itself, in one line, before the build starts. `lib/request-context.js`'s six
// `call_source` values still include no executor (the declared remainder), which is exactly why an
// `executor` lane must carry a dollar band: the band is the only number anyone can check it against.
//
// DeepBench v7.0.459 | scripts/verifier.js | SES-376 -- THE KICKOFF HAS A SIZE CAP, measured in
// BYTES, and the thing to read twice is that NOTHING MEASURED A KICKOFF BEFORE THIS. `KICKOFF_CAP`
// (60,000 chars) only ever truncated the judge's copy; it refuses nothing, and at that limit it has
// never fired. Measured 2026-09-12: the five unattended kickoffs v7.0.450-454 are 46,492 / 17,862 /
// 35,129 / 21,295 / 55,824 bytes, against attended ones at 4,924 and 3,445. `KICKOFF_BYTE_CAP` is
// the refusal at 8,192, and it has two ends: `--check-kickoff=<path>` refuses the DRAFT (the first
// branch of main(), ahead of the credential check, because step 6 runs before a cycle has anything
// to authenticate for), and the verdict block after `verdictFor()` refuses a DELIVERY whose
// `--kickoff=` is over cap, for the case where the first was skipped or the file was edited after.
//
// AS SHIPPED THE SECOND END IS INERT, and that is deliberate rather than unfinished: runbook step 7a
// does not pass `--kickoff=` yet, so `kickoffPath` is empty on every production run. Arming it is an
// attended runbook edit (card 1d57ebca). The code lands first so arming is one line in a doc.
//
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
//   --changed-files=<p> SES-379. A file holding THIS DELIVERY'S changed-file list -- a JSON array of
//                       repo-relative paths, or one path per line. It is the Builder's own `files`
//                       array, passed IN the way step 4a passes CI's conclusion in, because since
//                       SES-336 the Builder PUSHES BEFORE 7a RUNS: `origin/dev` and `HEAD` are then
//                       one commit and the git half below is empty BY CONSTRUCTION, not because
//                       nothing changed. Git stays the fallback when the flag is absent. A list that
//                       resolves EMPTY or UNREADABLE becomes null, which BLOCKS -- a caller who
//                       passed the flag and got nothing is never silently downgraded to the git
//                       list, because that downgrade is indistinguishable from a clean delivery.
//   --dry-run           Run the gates and print the verdict; write nothing, need no credentials.
//   --json              Single-line machine-readable output.
//   --repo=<path>       Repo root the gates run in. Defaults to this file's parent directory.
//   --judge=<mode>      AGT-67. `none` (default) is the mechanical-only behaviour every existing
//                       caller gets. `session` splits the run in two (see below). `executor` POSTs
//                       to the capability executor and finishes in one run -- NOT proven live.
//   --verdict-file=<p>  AGT-67, `--judge=session` pass two: the sub-agent's JSON verdict.
//   --context-file=<p>  AGT-67: override the derived `<scratch>/verify-<ticket>.json` path.
//   --scratch=<dir>     AGT-67: where the judgment context is written. Defaults to os.tmpdir().
//   --kickoff=<path>    AGT-67: the kickoff doc handed to the agent as part of its evidence. Since
//                       SES-376 an over-cap kickoff here also forces the verdict to BLOCK.
//   --check-kickoff=<p> SES-376: measure ONE kickoff against KICKOFF_BYTE_CAP and exit. Runs no
//                       gate, reads no board, needs no credentials -- it is the FIRST branch of
//                       main(), ahead of the credential check, so step 6 can call it at the moment
//                       the kickoff is drafted (before the cycle has anything else to check).
//                       0 = within cap, 1 = over cap OR no lane declaration (SES-359) OR the
//                       declaration is unattested (AGT-187), 2 = nothing could be measured.
//                       A green with no --answer carries `attested:false` and says so in `attests`:
//                       it grades a line's PRESENCE, never its author.
//   --answer=<path>     AGT-187, OPTIONAL and only with --check-kickoff. The Designer's own answer
//                       JSON; its `kickoff_markdown` is compared byte-for-byte with the file on
//                       disk. Equal -> exit 0, `attested:true`. Different -> exit 1,
//                       `kickoff-unattested-declaration`, naming the byte delta and the first
//                       differing line, because a caller that patched the refusal's own remedy into
//                       the file would otherwise collect a green over its own bytes. Unreadable JSON
//                       or no `kickoff_markdown` -> exit 2, NEVER a green.
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
//      verdict that misses the Intent's schema on a DECISIVE key -- `verdict`, `backlog_id`,
//      `version`, `auto_done_eligible` -- or in any other way the schema names. SES-343: a
//      presentation field over its maxLength is NOT one of those; both judged lanes cut it to the
//      schema's own limit, note the cut on the row, and record the verdict). Distinct from 1 on purpose: 1 is a
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
import { renderingCycleFinding } from "./render-claude-state.js";
import { shipCardFinding } from "./render-claude-state.js";

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

// ---------------------------------------------------------------------------
// FEATURE: AGT-170 -- THE REGRESSION GATE GRADES THE DELTA, NEVER THE SUITE'S ABSOLUTE EXIT CODE.
// ---------------------------------------------------------------------------
//
// READ THE DIRECTION OUT LOUD, because it is the OPPOSITE of every other rule in this file. The
// kickoff checks above (`kickoffCapFinding`, `kickoffLaneFinding`) and the SES-403 re-grade all move
// one way only, approve -> block; each of their headers says so, and says so because a rule that can
// turn a red into a green is the rule that can launder a ship. This one IS that rule: it is the
// file's one RED -> GREEN move. So it is fenced by three things rather than trusted:
//
//   1. IT REQUIRES A BASELINE THAT WAS HANDED TO IT. No baseline -> the absolute exit code stands,
//      untouched. It never measures its own baseline, because a baseline measured on the tree being
//      graded is the tree vouching for itself.
//   2. IT REQUIRES A PROVEN NAME-WISE SUBSET. Every `[FAIL]` name in this run must also be a `[FAIL]`
//      name in the baseline. One name that is not -> red, and the reason names it.
//   3. IT RECORDS BOTH LISTS. `standing` and `newlyRed` go to the payload and into `gateDetail`, so a
//      subset claim is quoted from the grader that made the call, never re-derived from a second run
//      by whoever reads it later (the three-parties-measuring-one-baseline defect
//      `scripts/baseline-red-set.js`'s header records).
//
// WHY IT EXISTS, measured on this clone at `e6676adc` rather than argued: `gateStatus`'s whole rule is
// `exitCode === 0 ? "green" : "red"`, and the suite was standing red -- 18-19 of 298 files, none of
// them anybody's current diff -- so every delivery was graded on somebody else's red and no ship
// could pass. `grep -ci baseline scripts/verifier.js` was `0`: there was no baseline anywhere.
//
// THE FAILING SET IS RECOVERABLE BY NAME, which is what makes this a mechanism rather than a waiver:
// `tests/regression/run-all.js:150` prints `  [FAIL] <file> -- <message>` on stdout, and the gate
// already captures that output for `summarizeGateOutput`. Nothing new is run and nothing is trusted.
//
// DELIBERATELY INERT AS SHIPPED, and named here so nobody reads the silence as a bug -- the same
// disposition `kickoffCapFinding` and `kickoffLaneFinding` shipped on, for the same reason. No
// runbook step passes `--regression-baseline=` yet, so `baseline` is null on every production run and
// the gate grades the absolute exit code exactly as it did before this ship. ARMING IT IS AN EDIT TO
// THREE FILES AT ONCE, which is why it is not in this delivery and is not one line in a doc: any byte
// change to `docs/runbooks/runner-cycle.md` also requires (1) `docs/runbooks/cycle-card.md`
// re-rendered in the same commit, because the card's header carries a sha256 of the runbook
// (`SES-377`, `scripts/render-cycle-card.js --write`), and (2) `BYTES_AT_SHIP` in
// `tests/regression/ses-413d-questions-scoreboard.test.mjs` re-measured and re-pinned in the same
// commit (`ses-424f` asserts the pair agrees). Measured on this tree: arming it inside AGT-170's
// 3-file cap left 8 tests newly red, so the doc half is a separate attended edit. The code lands
// first so that arming it is a doc change and a re-render rather than a code change nobody wants to
// make under time pressure at the ship point.

// Pure. The `[FAIL]` names in a gate's output, sorted and unique. NAMES ONLY -- "newly red BY NAME"
// is the comparison, so the message body is deliberately dropped: a test that fails with a different
// assertion message this run is the same standing red, not a new one, and reading the message would
// make every re-worded failure look newly red.
//
// ANCHORED AT THE START OF THE LINE, and that is the mutant the guard is written around. A failure
// MESSAGE can itself contain `[FAIL]` -- a test that asserts about this very suite's output prints
// exactly that -- and a scan for `[FAIL]` anywhere in the line would harvest a name out of a message
// body and put a file in the failing set that never ran. So the line is trimmed (same trim
// `summarizeGateOutput` does, for the same reason: `run-all.js` indents these two spaces), it must
// START with the marker, and the name is the FIRST token after it.
export function failingTestsFrom(output) {
  const names = [];
  for (const raw of String(output ?? "").split("\n")) {
    const line = raw.trim();
    if (!line.startsWith("[FAIL]")) continue;
    const name = line.slice("[FAIL]".length).trim().split(/\s+/)[0];
    if (name && !names.includes(name)) names.push(name);
  }
  return names.sort();
}

// Pure. The names `run-all.js` declared it did NOT fully run, sorted and unique.
//
// WHY A SECOND PARSE AT ALL, which is AGT-170 slice 2's whole reason for existing. `failingTestsFrom`
// answers "which tests failed", and slice 1 built the delta out of that answer alone -- so a test
// ABSENT from the baseline's `[FAIL]` lines was read as green on the unchanged tree. That inference is
// only sound for a run that ran everything. `tests/regression/run-all.js:166-175` prints one
// `NOT A FULL RUN:` line naming every test that declared a not-run part, and `:147` still counts those
// tests `[PASS]` -- so the baseline's own output says "I never verified this" and slice 1 could not
// hear it. Measured on this cycle's captures: the shipped rule named
// `ses-413d-questions-scoreboard.test.mjs` newly red off a baseline that never ran it, and the other
// arm named `agt-103-auditor-home.test.mjs` the same way. Two runs, two manufactured reds, and a
// manufactured red costs a streak (`docs/ARCHITECTURE.md` §19v: the verdict is the ladder's input).
//
// LINE-ANCHORED, for the same mutant `failingTestsFrom` is anchored against and it is not a
// hypothetical here: a failing test that asserts about this suite's own summary prints the notice
// INSIDE its `[FAIL] name -- message` body, and a scan for the marker anywhere in the line would
// harvest 71 names out of one message and mark the whole suite unverified. So the line is trimmed
// (`run-all.js` does not indent this one, but a caller may hand over an indented capture) and it must
// START with the marker.
//
// THE NAMES ARE THE `.js`/`.mjs` TOKENS BETWEEN THE FIRST `(` AND THE LAST `)`, because the notice's
// own prose carries parentheses nowhere else but its tail sentence carries none -- `(${partialTests
// .join(", ")})` is the only bracketed span, and taking the LAST `)` rather than the first survives a
// future file name containing one. The `/\.m?js$/` filter is what keeps the count words ("71 tests")
// and any prose fragment out of the set.
//
// NO NOTICE -> `[]`, AND THAT IS THE CORRECT DEFAULT rather than a fail-open one: `run-all.js` prints
// the line iff `notRunParts > 0`, so its absence means the run declared nothing not-run, and for such
// a run absence from `[FAIL]` genuinely IS green. The fail-closed direction lives in the caller --
// `unverified` only ever ADDS names a delta must not call newly red.
export function notRunTestsFrom(output) {
  const MARKER = "NOT A FULL RUN:";
  const names = [];
  for (const raw of String(output ?? "").split("\n")) {
    const line = raw.trim();
    if (!line.startsWith(MARKER)) continue;
    const open = line.indexOf("(");
    const close = line.lastIndexOf(")");
    if (open === -1 || close <= open) continue;
    for (const token of line.slice(open + 1, close).split(",")) {
      const name = token.trim();
      if (/\.m?js$/.test(name) && !names.includes(name)) names.push(name);
    }
  }
  return names.sort();
}

// Pure. The regression gate's status once the delta is taken into account.
//
//   absolute    what `gateStatus` said about the run: 'green' | 'red' | 'skipped'.
//   baseline    the `[FAIL]` names from a run on the UNCHANGED tree, or null for "none handed over".
//   post        the `[FAIL]` names from this run.
//   unverified  (AGT-170 slice 2) the names that baseline run declared it did NOT fully run, minus the
//               ones it also failed. Null or absent -> nothing was declared and every post name is
//               either standing or newly red, exactly as slice 1 graded it.
//
// Returns { status, standing, newlyRed, unverifiedInBaseline, reason }. `standing`, `newlyRed` and
// `unverifiedInBaseline` are the recorded lists of fence 3 above; `reason` is built here rather than at
// the call site for the reason `verdictFor`'s header gives -- a claim composed by its reader has no
// fixed home.
//
// AGT-170 SLICE 2 -- THE THIRD BUCKET, AND WHY IT IS NOT A FOURTH STATUS. Slice 1 partitioned `post`
// into two: in the baseline -> standing, otherwise -> newly red. That `otherwise` was the bug. A test
// the baseline never ran is not evidence of anything, so calling it newly red is an accusation this
// delivery cannot answer -- and the verdict is the ladder's input (`docs/ARCHITECTURE.md` §19v), so the
// accusation costs a streak. Measured on this cycle's own captures, BOTH arms slice 1 graded named a
// test out of the baseline's 71-name not-run list and nothing else: `newlyRed` minus that list was `[]`
// twice over.
//
// THE STATUS IS UNCHANGED IN EVERY CASE, which is the whole safety argument for touching a red -> green
// rule a second time. An unverified red still blocks: `newlyRed` empty with `unverifiedInBaseline`
// non-empty returns `absolute` -- the suite's own exit code, untouched, the same answer slice 1 gave.
// What changes is only the CLAIM attached to the block. The ship does not move; the false accusation and
// the streak reset it drives do.
//
// EVERY EXIT THAT IS NOT A PROVEN SUBSET LEAVES THE ABSOLUTE ANSWER ALONE. There are four of them
// and they are listed together on purpose, because the fail-closed direction is the whole safety
// argument for a red -> green rule:
//
//   - `baseline == null` (no flag, unreadable file, empty file) -> the absolute exit code stands.
//   - `absolute !== 'red'` -> unchanged, which is what keeps SES-181's THIRD value alive: a
//     'skipped' gate (the suite never produced an exit status) must never become green here, and a
//     rule written as `red ? ... : 'green'` would have done exactly that.
//   - a `post` that is not an array -> nobody parsed this run's failures, and "nobody looked" is not
//     "no failures" (the `ciJobsForGates` refusal, same sentence).
//   - a red run that named NO failing test -> there is nothing to prove a subset OVER. A suite that
//     exits 1 after crashing before its first `[FAIL]` line has an empty failing set, and an empty
//     set is trivially a subset of any baseline -- so the naive rule would read the most total
//     failure the suite can have as the cleanest possible green. It stays red.
export const REGRESSION_NO_BASELINE_REASON =
  "no baseline handed to the gate; the absolute exit code stands — fail closed (AGT-170)";

export function regressionDelta({ absolute, baseline, post, unverified }) {
  // Every fail-closed exit reports `unverifiedInBaseline: null` for the same reason it reports the other
  // two lists as null -- nothing was graded, so no list may be published as if it had been. `[]` here
  // would read as the positive fact "the baseline ran everything", off a baseline nobody parsed.
  const none = (status, reason) => ({ status, standing: null, newlyRed: null, unverifiedInBaseline: null, reason });

  if (baseline === null || baseline === undefined) return none(absolute, REGRESSION_NO_BASELINE_REASON);
  if (!Array.isArray(baseline)) {
    return none(absolute, `baseline is ${typeof baseline}, not a list of names; the absolute exit code stands -- fail closed (AGT-170)`);
  }
  if (absolute !== "red") {
    return none(absolute, `absolute gate is ${absolute}, not red -- the delta only ever moves a red, so this is untouched (AGT-170)`);
  }
  if (!Array.isArray(post)) {
    return none("red", "this run's failing set was never parsed, so no red can be shown to be in the baseline -- fail closed (AGT-170)");
  }

  const baselineNames = baseline.map(n => String(n));
  const postNames = post.map(n => String(n));
  // `unverified` is advisory and may be absent -- slice 1's callers pass three keys, and a reader that
  // handed over no not-run set must grade exactly as slice 1 did rather than differently-by-accident.
  const unverifiedNames = Array.isArray(unverified) ? unverified.map(n => String(n)) : [];

  // ONE PASS, THREE BUCKETS, AND THE ORDER OF THE TESTS IS THE PRECEDENCE RULE. `baseline` is checked
  // FIRST, so a name in both lists is standing: `run-all.js:157-162` drains the not-run buffer on the
  // FAIL arm too, and a test that failed is a proven red whatever else it skipped. 2 of this cycle's 18
  // baseline reds sit in both lists, so this is the measured case and not a defensive nicety. (The
  // reader already subtracts `names` from `unverified`, so this is belt and braces on purpose: the
  // function is exported and pure, and a caller that partitions differently must not be able to turn a
  // proven standing red into an unverified one -- that is the only direction here that could launder a
  // ship.)
  const standing = [];
  const unverifiedInBaseline = [];
  const newlyRed = [];
  for (const n of postNames) {
    if (baselineNames.includes(n)) standing.push(n);
    else if (unverifiedNames.includes(n)) unverifiedInBaseline.push(n);
    else newlyRed.push(n);
  }

  // STILL FIRST, AND STILL BEFORE THE EMPTY-LIST TESTS BELOW. An empty `post` gives all three buckets
  // empty, which the green test would read as a proven subset -- the most total failure the suite can
  // have graded as its cleanest green. Keeping this exit ahead of them is the whole reason slice 1 wrote
  // it here, and slice 2 adds a third empty list without changing that.
  if (!postNames.length) {
    return { status: "red", standing, newlyRed, unverifiedInBaseline: null,
      reason: `regression exited non-zero and named NO failing test, so there is no failing set to ` +
        `prove against the ${baselineNames.length}-name baseline -- fail closed (AGT-170)` };
  }
  if (newlyRed.length) {
    return { status: "red", standing, newlyRed, unverifiedInBaseline,
      reason: `regression RED on ${newlyRed.length} newly red ${newlyRed.length === 1 ? "test" : "tests"} ` +
        `this delivery must answer for: ${newlyRed.join(", ")} (absent from the ${baselineNames.length}-name ` +
        `baseline). ${standing.length} other red ${standing.length === 1 ? "test is" : "tests are"} standing (AGT-170)` };
  }
  // THE THIRD STATE. No name this run failed is absent from the baseline's knowledge, but at least one is
  // a test the baseline DECLARED it never ran -- so there is no green to prove and no accusation to make.
  // The status returned is `absolute`, which is provably "red" by the guard at the top of this function;
  // it is written as `absolute` rather than the literal so the rule reads as what it is -- the suite's own
  // exit code stands, the delta declining to move it -- rather than as a coincidence of two reds agreeing.
  if (unverifiedInBaseline.length) {
    const u = unverifiedInBaseline.length;
    return { status: absolute, standing, newlyRed, unverifiedInBaseline,
      reason: `regression ${absolute.toUpperCase()} and the absolute exit code STANDS: ${u} red ` +
        `${u === 1 ? "test is" : "tests are"} absent from the ${baselineNames.length}-name baseline's ` +
        `[FAIL] lines but named in its NOT A FULL RUN notice, so the unchanged tree never ran ` +
        `${u === 1 ? "it" : "them"} and ${u === 1 ? "it is" : "they are"} UNVERIFIED rather than newly ` +
        `red: ${unverifiedInBaseline.join(", ")}. 0 tests are newly red; ${standing.length} ` +
        `${standing.length === 1 ? "is" : "are"} standing. Nothing is cleared -- an unverified red blocks ` +
        `exactly as before, it is just not charged to this delivery (AGT-170)` };
  }
  return { status: "green", standing, newlyRed, unverifiedInBaseline,
    reason: `regression GREEN on the delta: all ${standing.length} red ${standing.length === 1 ? "test" : "tests"} ` +
      `in this run are in the ${baselineNames.length}-name baseline BY NAME (${standing.join(", ")}), and 0 are ` +
      `newly red. The suite's absolute exit code is red and stays reported as such (AGT-170)` };
}

// AGT-170's file half, kept beside the pure core rather than inline at the call site so the
// fail-closed cases are one readable list. Returns { names, source }: `names` is null for every case
// that is not a real baseline, and `source` SAYS WHICH -- "no --regression-baseline passed" and "the
// file was there and unreadable" are different facts about a ship that stayed blocked, and a single
// null would make them the same fact. Same rule as the ladder and project lookups above.
//
// AN EMPTY FILE IS NOT AN EMPTY BASELINE. A zero-byte or whitespace-only file is the shape a
// redirect that never ran leaves behind (`... > $S/baseline.txt` where the command died), and reading
// it as "no test was red on the unchanged tree" would turn every standing red into a newly red one --
// the fail-closed direction, but for the wrong reason and with a misleading report. It is null, and
// the source says the file was empty. A file with real content and no `[FAIL]` line IS an empty
// baseline, legitimately: the unchanged tree was green, so anything red here is this delivery's.
//
// AGT-170 SLICE 2 -- THE THIRD KEY, `unverified`, AND WHY ABSENCE FROM `[FAIL]` IS NOT ENOUGH. Slice 1
// returned `names` and nothing else, so the delta had exactly two buckets: a post name the baseline
// carried was standing, and every other post name was newly red. That second bucket silently asserted
// "the unchanged tree ran this test and it passed" -- a claim the baseline's output cannot support when
// the run declared parts not-run. `notRunTestsFrom` reads that declaration, and `unverified` is it MINUS
// `names`.
//
// `names` OUTRANKS `unverified`, AND THAT PRECEDENCE IS A LIVE CASE, NOT A NICETY. `run-all.js:157-162`
// drains the not-run buffer on the FAIL arm too -- deliberately, per its own comment: "a test that
// declared a part and then failed still owns that declaration" -- so a test can appear in BOTH the
// `[FAIL]` list and the notice. Measured on this cycle's baseline capture, 2 of its 18 red names
// (`agt-132-finding-routes.test.mjs`, `agt-86a-rulings-and-alerts.test.mjs`) sit in both. Such a test is
// a PROVEN red on the unchanged tree -- whatever it also skipped, it demonstrably failed -- so it must
// stay standing rather than become unverified, or a real standing red would stop being provable and the
// delta would lose the only bucket that can be shown green.
//
// THE NULL EXITS KEEP `unverified: null`, never `[]`. An empty list means "the baseline ran everything";
// a baseline that was never read has no such fact to report, and reporting `[]` would let a downstream
// reader conclude a full run from a file that does not exist. Same reasoning the null `names` above
// already carries, and the same reasoning the delta's `unverifiedInBaseline: null` carries below.
export function readRegressionBaseline(baselinePath, readFile = (f) => fs.readFileSync(f, "utf8")) {
  if (!baselinePath) return { names: null, unverified: null, source: "no --regression-baseline passed; the gate grades the absolute exit code (AGT-170)" };
  let text;
  try { text = readFile(baselinePath); }
  catch (e) { return { names: null, unverified: null, source: `--regression-baseline=${baselinePath} could not be read (${e.message}); the gate grades the absolute exit code (AGT-170)` }; }
  if (!String(text).trim()) return { names: null, unverified: null, source: `--regression-baseline=${baselinePath} is empty; the gate grades the absolute exit code (AGT-170)` };
  const names = failingTestsFrom(text);
  const unverified = notRunTestsFrom(text).filter(n => !names.includes(n));
  return { names, unverified,
    source: `${baselinePath} (${names.length} red on the unchanged tree, ${unverified.length} never run)` };
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

// FEATURE: SES-403 -- THE MAPPING IS THE MECHANISM, and this is its repo-side home.
//
// The three gate keys above collapse onto CI's TWO blocking jobs (`.github/workflows/ci.yml`
// L169, L188): `build` is decided by `Build (blocking)`, and `regression` AND `hygiene` are both
// decided by `Tripwire + regression (blocking)` -- that job runs the tripwire and the suite in one
// checkout. `public.ci_jobs_for_gates(text[])` is the database's copy of exactly this table, and
// `regradable_ships()` lists through it; this one is what the flag re-grades through, so the
// lister and the re-grade cannot answer the same question two ways.
//
// A CONSTANT RATHER THAN A LITERAL AT TWO CALL SITES, for the SES-199 GATES reason one screen up:
// a later widening or narrowing of the job set shows up in this file's diff and in its guard's,
// never silently.
export const GATE_CI_JOBS = Object.freeze({
  build: "Build (blocking)",
  regression: "Tripwire + regression (blocking)",
  hygiene: "Tripwire + regression (blocking)",
});

// Gate keys -> the DISTINCT CI job names that decide them.
//
// AN UNMAPPED KEY THROWS. A fourth entry added to GATES and not to GATE_CI_JOBS must stop a
// re-grade dead rather than contribute no job and let the remaining ones vouch for the delivery --
// "every job in the list is green" over a list that quietly lost a member is the whole defect this
// lane must not have. Same refusal the SQL function raises, for the same reason.
export function ciJobsForGates(gateKeys) {
  if (!Array.isArray(gateKeys)) {
    throw new Error(`ciJobsForGates: expected an array of gate keys, got ${gateKeys === null ? "null" : typeof gateKeys} -- a null gate list is "nobody looked", never "no red gates"`);
  }
  const out = [];
  for (const raw of gateKeys) {
    const job = GATE_CI_JOBS[String(raw ?? "").trim().toLowerCase()];
    if (!job) {
      throw new Error(`ciJobsForGates: gate key "${raw}" maps to no CI job. The mapping is ${Object.entries(GATE_CI_JOBS).map(([k, v]) => `${k} -> "${v}"`).join("; ")}; a new gate key needs a job here before any ship can be re-graded on it.`);
    }
    // regression and hygiene share one job, and asking twice about the same job is one question.
    if (!out.includes(job)) out.push(job);
  }
  return out;
}

// FEATURE: SES-403 -- the verdict a CI conclusion supports, or the named reason there is none.
//
//   gates  the PRIOR verdict's stored gate statuses ({ build, regression, hygiene }).
//   jobs   the newest `ref='dev'` conclusion's `jobs` array ([{ name, conclusion }]).
//
// Returns { ok, gateResults, source, reason }.
//
// WHICH GATES CI RE-GRADES, AND WHY IT IS NOT ALL OF THEM. The evidence a green CI job gives is
// ONE-DIRECTIONAL, and the whole lane turns on that asymmetry:
//
//   * A job that is `success` at dev head is proof about THIS delivery, because dev head CONTAINS
//     this delivery. A gate that was red and whose job is now green is genuinely green.
//   * A job that is `failure` at dev head proves nothing about this delivery -- somebody else's
//     commit can be the one breaking it. That is the entire premise of this ticket, so importing
//     that failure onto a gate this delivery already PASSED on its own tree would re-introduce the
//     outside cause the lane exists to remove.
//
// So a gate the prior verdict recorded GREEN stays green (it was proven on the delivery's own
// tree), and only a RED gate is re-graded from its CI job. `regradable_ships()` applies the same
// asymmetry when it lists -- every job the RED gates map to must be `success` -- which is what
// keeps the lister and the flag from answering one question two ways. `source` records which half
// each gate came from, so the row can say it rather than leaving a reader to assume.
//
// TWO REFUSALS, both the fail-closed direction this file takes everywhere else:
//
//   * A SKIPPED PRIOR GATE. `skipped` means the check never produced an exit status at all
//     (gateStatus()'s three-value return). CI's conclusion says nothing about a check that did not
//     run here, so no job can clear it and the block stands.
//   * A MISSING CONCLUSION, or a conclusion carrying no job for a gate being re-graded. The absence
//     of evidence about dev head is never evidence that dev head is green.
export function regradeGateResults({ gates, jobs } = {}) {
  const prior = gates || {};
  const skipped = GATES.filter(g => prior[g.key] === "skipped");
  if (skipped.length) {
    return { ok: false, gateResults: null, source: null,
      reason: `the prior verdict records ${skipped.map(g => g.label).join(", ")} as SKIPPED -- a check that never produced an exit status is not something a CI conclusion can clear. The block stands and nothing is recorded.` };
  }
  if (!Array.isArray(jobs) || jobs.length === 0) {
    return { ok: false, gateResults: null, source: null,
      reason: `there is no CI conclusion to re-grade against (${Array.isArray(jobs) ? "the conclusion carries an empty job list" : "none could be read"}) -- the absence of evidence about dev head is never evidence that dev head is green.` };
  }
  const byName = new Map(jobs.filter(j => j && j.name !== undefined && j.name !== null)
    .map(j => [String(j.name), j.conclusion ?? null]));
  const gateResults = {};
  const source = {};
  const absent = [];
  for (const g of GATES) {
    if (prior[g.key] === "green") {
      gateResults[g.key] = "green";
      source[g.key] = "carried from the prior verdict -- this delivery already passed it on its own tree";
      continue;
    }
    const [job] = ciJobsForGates([g.key]);
    if (!byName.has(job)) { absent.push(`${g.label} -> "${job}"`); continue; }
    const conclusion = byName.get(job);
    gateResults[g.key] = conclusion === "success" ? "green" : "red";
    source[g.key] = `CI job "${job}" = ${conclusion ?? "null"}`;
  }
  if (absent.length) {
    return { ok: false, gateResults: null, source: null,
      reason: `the CI conclusion carries no job for ${absent.join(", ")} -- an absent job says nothing about that gate, and reading silence as green is exactly what this lane may not do.` };
  }
  return { ok: true, gateResults, source,
    reason: GATES.map(g => `${g.label}=${gateResults[g.key]} (${source[g.key]})`).join("; ") };
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
//
// SES-343 -- THAT REASONING IS ABOUT THE DECISIVE KEYS, AND ONLY THEM. `verdict`, `backlog_id`,
// `version` and `auto_done_eligible` ARE the judgment: a miss on any of them is still fatal, for
// exactly the reason above. A `pm_lens` or `architect_lens` that ran 1,464 characters against a
// 1,200 maxLength is not an absent judgment -- it is a present one whose PRESENTATION field ran
// long, and throwing the whole row away over it records nothing at all. Measured on
// tests/fixtures/verdicts-30-judgments.json: 17 of 27 real judgments are rejected today, every one
// of them on a lens length and on nothing else. Under `{ truncate: true }` a non-decisive overflow
// is cut to the schema's own maxLength, recorded in `truncations`, and said out loud in the row's
// reasoning through truncationNote(); the default is byte-identical to the old behaviour, so
// run-project.js and rank-backlog.js keep the strict contract they were written against.
export const DECISIVE_KEYS = Object.freeze(["backlog_id", "version", "verdict", "auto_done_eligible"]);

export function validateAgentVerdict(schema, value, { truncate = false } = {}) {
  const errors = [];
  const truncations = [];
  // The input is NEVER mutated: `out` stays the caller's own object until something is actually
  // cut, and becomes a shallow copy at that moment. A caller that keeps its original (the SES-337
  // replay does) must still see what the agent really said.
  let out = value;
  const typeOf = v => (v === null ? "null" : Array.isArray(v) ? "array" : typeof v);
  const typeOk = (v, t) => {
    const want = Array.isArray(t) ? t : [t];
    return want.some(w => (w === "integer" ? Number.isInteger(v)
      : w === "number" ? typeof v === "number"
      : w === "object" ? v !== null && typeOf(v) === "object"
      : typeOf(v) === w));
  };
  if (!schema || typeof schema !== "object") {
    return { ok: false, errors: ["no schema was read from the Intent Skill, so the agent's verdict could not be validated -- unknown is not innocent"], truncations, value };
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, errors: [`the agent's verdict must be a JSON object; got ${typeOf(value)}`], truncations, value };
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
      if (truncate && !DECISIVE_KEYS.includes(key)) {
        truncations.push({ key, from: v.length, to: spec.maxLength });
        if (out === value) out = { ...value };
        out[key] = v.slice(0, spec.maxLength);
      } else {
        errors.push(`"${key}" is ${v.length} characters, over the schema's maxLength ${spec.maxLength}`);
      }
    }
    if (spec.items && spec.items.type && Array.isArray(v)) {
      const badAt = v.findIndex(item => !typeOk(item, spec.items.type));
      if (badAt !== -1) errors.push(`"${key}"[${badAt}] must be ${JSON.stringify(spec.items.type)}`);
    }
  }
  return { ok: errors.length === 0, errors, truncations, value: out };
}

// The cut, said out loud on the row itself. A truncation nobody can read in `runner_verdicts` is
// indistinguishable from a lens the agent wrote short, and the whole point of cutting rather than
// rejecting is that the reader can still tell what happened to the text they are reading.
//
// THE DECISIVE KEYS ARE NAMED IN THE PROSE ON PURPOSE, so the row says what was NOT touched as well
// as what was. tests/regression/ses-343-verdict-severity.test.mjs asserts every DECISIVE_KEYS entry
// appears here -- adding a fifth decisive key and leaving this sentence behind goes red there
// rather than quietly promising something the code no longer does.
export function truncationNote(truncations) {
  if (!Array.isArray(truncations) || truncations.length === 0) return "";
  const list = truncations.map(t => `${t.key} ${t.from}->${t.to}`).join(", ");
  return `Truncated to the Intent's maxLength before recording (SES-343): ${list} chars; `
    + `verdict, backlog_id, version and auto_done_eligible were not touched.`;
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
//
// SES-379: "BEFORE ITS PUSH" HAS NOT BEEN TRUE SINCE SES-336, AND THIS FUNCTION'S EMPTY ANSWER IS
// THE SHAPE OF THAT. The Builder now pushes as part of finishing, so by the time step 7a runs
// `origin/dev` and `HEAD` are ONE COMMIT and the working tree is clean: both views return nothing
// and this returns `[]` on every unattended cycle, whatever the delivery changed. `[]` is not a
// lie -- it is the honest answer to the question git was asked -- but it is the answer to the WRONG
// question, and selfCertificationBlock([]) does not block (SES-181 pins that boundary, correctly).
// So this is now the FALLBACK, not the source: resolveDeliveryFiles() below prefers the list the
// Builder hands in through --changed-files, and an empty resolution becomes null rather than a
// clean bill. Measured 2026-09-15: verdicts SES-377/v7.0.463 and SES-359/v7.0.462 both recorded
// `auto_done_eligible = true` with "the diff touches none of ..." on pushes that had changed
// scripts/check-session-docs.js.
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

// FEATURE: SES-379 -- WHICH LIST THE CHARTER-PREMISE-3 CHECK IS ACTUALLY GRADED ON.
//
// Pure, exported, and the ONLY place `[]` becomes `null`. That placement is the whole ticket:
// SES-181 pins `selfCertificationBlock([]).blocked === false` with a comment forbidding the
// coercion, and it is right to -- down there `[]` means "I read the delivery and nothing relevant
// changed", which must stay a real answer or every clean delivery blocks forever. Up HERE `[]`
// means something different and opposite: "the resolution produced no list at all", which is the
// SES-336 post-push git answer and the caller who passed a flag pointing at an empty file. Same
// bytes, different question, so the conversion belongs at the seam that knows which question was
// asked -- never at the boundary that only sees the answer.
//
//   explicit  the caller's own list (the Builder's `files` array), or null/undefined when no
//             --changed-files flag was given. AN ARRAY IS A CLAIM AND AN EMPTY ARRAY IS A FAILED
//             ONE: it resolves to null and blocks.
//   gitList   changedFilesFor()'s answer -- the fallback, and null when git could not be read.
//
// The non-empty explicit case takes the UNION with git rather than replacing it, because every
// extra path can only move the result toward refusal: a path the Builder forgot to declare but git
// saw is exactly the path premise 3 exists to catch, and nothing in SELF_CERTIFYING_PATHS is made
// safer by dropping it.
export function resolveDeliveryFiles({ explicit, gitList } = {}) {
  const clean = list => {
    const out = [];
    for (const p of list) {
      const s = String(p ?? "").trim();
      if (s && !out.includes(s)) out.push(s);
    }
    return out;
  };

  if (Array.isArray(explicit)) {
    // THE EMPTY CLAIM IS TESTED BEFORE THE UNION, and that order is the fail-closed half of this
    // ticket rather than a style choice: unioning first would let a caller whose flag file was
    // empty or unreadable land on git's list -- the exact silent downgrade --changed-files exists
    // to refuse -- and on a PRE-push cycle, where git is not yet empty, it would look like it
    // worked. Cleaned first too, so a file of nothing but blank lines is the same empty claim.
    const want = clean(explicit);
    if (!want.length) return null;
    return clean([...want, ...(Array.isArray(gitList) ? gitList : [])]);
  }
  if (!Array.isArray(gitList)) return null;      // git could not answer -- unknown is not innocent
  return gitList.length ? gitList : null;        // SES-336: empty here means "asked after the push"
}

// The --changed-files reader. Returns { files, source } rather than a bare array so main() can tell
// "the flag named a file holding nothing" from "the flag named a file that could not be read" --
// both block, but the ledger has to say WHICH, for the same reason `auto_done_reason` distinguishes
// "the ladder declined" from "nobody asked the ladder".
//
// UNREADABLE AND UNPARSEABLE BOTH COME BACK AS AN EMPTY LIST, never as "no flag": resolveDeliveryFiles
// above turns an empty explicit array into null, so a broken flag lands on the block and can never
// fall through to the git list it was passed to replace.
export function readChangedFilesFile(absPath) {
  let raw;
  try { raw = fs.readFileSync(absPath, "utf8"); }
  catch (e) { return { files: [], source: "UNREADABLE", detail: e.message }; }

  const text = String(raw).trim();
  let items;
  // `{` counts as JSON HERE, not just `[`, and it is the fail-closed half of this reader: a caller
  // who wrote `{"files":[...]}` handed us a document, and line-splitting it would produce one
  // "path" that matches nothing in SELF_CERTIFYING_PATHS -- a non-empty list that silently grades
  // the delivery clean. A shape we do not understand is UNREADABLE, never one long filename.
  if (text.startsWith("[") || text.startsWith("{")) {
    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) return { files: [], source: "UNREADABLE", detail: "JSON is not an array of paths" };
      items = parsed;
    } catch (e) { return { files: [], source: "UNREADABLE", detail: `unparseable JSON: ${e.message}` }; }
  } else {
    items = text.split("\n");
  }
  const files = [];
  for (const it of items) {
    const s = String(it ?? "").trim();
    if (s && !files.includes(s)) files.push(s);
  }
  return { files, source: "builder list", detail: "" };
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
    return { status: "skipped", fails: null, detail: `spawn threw: ${e.message}` };
  }
  if (res.error) return { status: "skipped", fails: null, detail: `could not run: ${res.error.message}` };
  // A signal kill leaves status null -- gateStatus() reads that as skipped, which is why the raw
  // status is passed through rather than defaulted to a number here.
  const status = gateStatus({ ran: true, exitCode: res.status });
  const tail = summarizeGateOutput({ stdout: res.stdout, stderr: res.stderr });
  // AGT-170: the FAILING SET BY NAME, for the regression gate only. `[FAIL] <file>` is
  // `tests/regression/run-all.js`'s vocabulary and nothing else prints it -- `npm run build` and the
  // hygiene tripwire fail with their own prose -- so a name list off either of those would be an
  // empty array masquerading as a measurement, and `regressionDelta()` reads an empty failing set
  // under a red as the fail-closed case precisely because it cannot be told apart from that.
  // Returned rather than re-parsed at the call site: the delta must grade the OUTPUT THIS GATE RAN,
  // and a second parse of a string that has since been capped to DETAIL_CAP is a different string.
  const fails = gate.key === "regression"
    ? failingTestsFrom(`${res.stdout || ""}\n${res.stderr || ""}`)
    : null;
  return { status, fails, detail: `exit ${res.status === null ? "signal " + res.signal : res.status}${tail ? " -- " + tail.slice(0, DETAIL_CAP) : ""}` };
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

// FEATURE: SES-344 -- the ship report's own cap, and the four files that go LAST in the diff.
//
// `SHIP_REPORT_CAP` is the same shape as `KICKOFF_CAP`: a declared truncation on the judge's copy,
// never a refusal. 60,000 characters is roughly twenty of this repo's longest commit bodies; it has
// never fired on a real `<base>..HEAD` range, and when it does the reader is told in the marker
// `cap()` appends rather than being handed a silently short report.
//
// `DIFF_LAST` IS AN ORDERING, NOT AN EXCLUSION, and the difference is the whole point: every one of
// these four files still reaches the judge, they just reach it after the hunks the ticket is about.
// They are the platform's RE-RENDERED ARTIFACTS -- `export-backlog-snapshot.js`,
// `render-claude-state.js`, `render-standing-brief.js` and the RULES-SNAPSHOT export write them
// wholesale on almost every ship, so their diffs are large, mechanical, and never the thing under
// judgment. Measured on SES-336 (`bc73354e`): a 639,956-character diff cut by `DIFF_CAP` at 400,000
// INSIDE `docs/backlog/BACKLOG-SNAPSHOT.md`, alphabetically ahead of the
// `docs/runbooks/runner-cycle.md` hunk that was the ticket -- so the agent blocked, correctly, on a
// file it had been sent and could not see. A code list rather than a data row because the scripts
// that produce these files are code; a new re-rendered artifact is a one-line change here.
export const SHIP_REPORT_CAP = 60_000;
export const DIFF_LAST = Object.freeze([
  "docs/backlog/BACKLOG-SNAPSHOT.md",
  "CLAUDE-STATE.md",
  "docs/runbooks/standing-brief.md",
  "docs/governance/RULES-SNAPSHOT.md",
]);

// FEATURE: SES-376 -- THE KICKOFF HAS A SIZE CAP, and this is a SECOND constant beside KICKOFF_CAP
// on purpose: the two measure different things in different units for different readers.
// `KICKOFF_CAP` is a truncation limit in CHARACTERS on the judge's copy -- it protects the prompt,
// it never refuses anything, and at 60,000 it has never fired on a real kickoff. This one is a
// REFUSAL threshold in BYTES on what the Designer is allowed to hand the Builder at all.
//
// BYTES, NOT CHARACTERS, and that is not pedantry -- it is the mutant the guard is written around.
// Measured 2026-09-12 on the five unattended kickoffs v7.0.450-454: each is 157-314 bytes longer
// than its `.length`, because em dashes, arrows and typographic quotes are multi-byte in UTF-8. A
// `.length` comparison would quietly grant a kickoff up to ~4% more than the cap says, and the size
// of that grant would vary with how much punctuation the Designer happened to use. `"é".repeat(4097)`
// -- 4,097 characters, 8,194 bytes -- is the case the regression test uses to prove which unit is
// doing the work.
export const KICKOFF_BYTE_CAP = 8192;

// FEATURE: AGT-187 -- WHOSE JOB THE REFUSAL IS, stated on the finding rather than implied by prose.
//
// Both refusals used to close with an imperative aimed at nobody in particular ("add one Lanes:
// line"), and the agent that reads a refusal is the ORCHESTRATOR holding the file, not the Designer
// who assembled it. Measured on cycle a1e84644: the orchestrator read that sentence literally,
// appended the 49-byte line itself, and the re-run went green -- so the green certified a lane
// declaration its own caller had written. `remedy_owner` names the agent the re-assembly belongs to
// and `remedy` names the ONE command that performs it, so no reader has to infer either.
export const KICKOFF_REMEDY_OWNER = "designer";

// Null is the answer for "within cap", never `false`: the caller carries this straight into the
// payload as `kickoff_over_cap`, where a `false` would read as a measurement that was taken and a
// `null` reads as nothing to report. The reason text names the ticket AND the remedy, because the
// agent that reads it is the Designer being asked to re-assemble, not a human with the runbook open.
export function kickoffCapFinding(text) {
  const bytes = Buffer.byteLength(String(text ?? ""), "utf8");
  if (bytes <= KICKOFF_BYTE_CAP) return null;
  return {
    bytes,
    cap: KICKOFF_BYTE_CAP,
    remedy_owner: KICKOFF_REMEDY_OWNER,
    remedy: `re-assemble design-kickoff ONCE with "over_cap":{"bytes":${bytes},"cap":${KICKOFF_BYTE_CAP}} in task_context; the caller never trims the file`,
    reason: `kickoff over cap: ${bytes} bytes > ${KICKOFF_BYTE_CAP} (SES-376) -- seven sections only; reasoning belongs in docs/harvests/<ID>.md`,
  };
}

// FEATURE: AGT-187 -- WHICH LINE THE TWO DOCUMENTS FIRST DISAGREE ON.
//
// 1-BASED, and the number is the point of the whole payload: "the answer is 49 bytes shorter" says a
// line went missing, "line 8" says WHICH, and line 8 of a kickoff is the `Lanes:` declaration this
// ticket exists over. Returns null only when the two strings are identical, so a caller can branch on
// the return rather than re-comparing. Compared line by line rather than by character offset because
// the reader is being pointed at a line of a markdown file, not at a byte of a buffer.
export function firstDifferingLine(a, b) {
  const left = String(a ?? "").split("\n");
  const right = String(b ?? "").split("\n");
  const n = Math.max(left.length, right.length);
  for (let i = 0; i < n; i++) {
    if (left[i] !== right[i]) {
      return { line: i + 1, answer: left[i] ?? null, file: right[i] ?? null };
    }
  }
  return null;
}

// FEATURE: SES-359 -- THE LANE DECLARATION, graded on the LINE rather than on the document.
//
// THE LINE, NOT THE FILE, and that is the whole shape of the check. A kickoff that says the word
// "executor" anywhere in its TASKS -- and several do, because the executor is a thing this platform
// builds -- would satisfy or violate a document-wide regex for reasons that have nothing to do with
// what it is declaring. So the first line carrying `Lanes` and a colon is located once, and every
// subsequent test reads THAT STRING. A kickoff with no such line is refused, which is the case the
// check exists for: `v7.0.447-SES-347` and `v7.0.448-SES-368` shipped with no lane declaration at
// all, and nothing anywhere said so.
//
// CASE-SENSITIVE `Lanes`, deliberately. `lanes = []` in a code block is not a declaration, and a
// case-insensitive match would read it as one -- the regression test pins that string as a negative
// control rather than leaving the choice to look like an oversight.
//
// THE EXECUTOR CLAUSE IS THE ONLY CONDITIONAL ONE. `session` and `none` cost subscription tokens or
// nothing, so naming them is the whole declaration. `executor` spends API dollars, and a declaration
// that spends dollars without saying how many is not a declaration -- so an `executor` lane must
// either be disclaimed (`executor none`, the ordinary case) or carry a band (`$1-3`). `\W{0,8}`
// between the word and `none` is what lets the real wordings through: "`executor` none",
// "executor — none", "executor: none" are all the same statement in different punctuation.
export function kickoffLaneFinding(text) {
  const line = String(text ?? "").match(/^[^\n]*\bLanes\b[^\n]*:[^\n]*$/m);
  const declared = line
    && /\b(session|executor|none)\b/.test(line[0])
    && (!/\bexecutor\b/.test(line[0]) || /\bexecutor\b\W{0,8}none\b/.test(line[0]) || /\$\s?\d/.test(line[0]));
  if (declared) return null;
  return {
    kind: "kickoff-no-lanes",
    remedy_owner: KICKOFF_REMEDY_OWNER,
    remedy: 're-assemble design-kickoff ONCE with "no_lanes":true; the caller never supplies the line',
    reason: 'kickoff has no lane declaration (SES-359) -- the Designer re-assembles design-kickoff ONCE with "no_lanes":true; a Lanes: line supplied by the caller is not a declaration the Designer made',
  };
}

// FEATURE: AGT-185 -- THE SCOPE PAIR A VERDICT GRADED AGAINST, SAID OUT LOUD.
//
// WHY A GREEN NEEDS IT (ARCHITECTURE.md 19v -- a green declares what it did NOT grade). Before this,
// `extra_files`/`extra_tasks` appeared in this file ONLY inside a comment: the class_autonomy() row
// was fetched, `auto_done` was read off it, and the file/task pair the ship was actually measured
// against was never printed. A later reader of an approve had nothing to read but the flat 3/4 --
// which is the BASELINE, and the cap for no class sitting above `runner_settings.cap_relax_rung`.
//
// THE ROW IS THE ARGUMENT AND THE GRANT IS NEVER RE-DERIVED HERE. `public.class_autonomy(text)` is
// the one home for what a rung buys (SES-122a; its thresholds are stored columns, SES-146). This
// function adds no judgment to the row -- it sums the row's OWN extras onto the baseline and names
// both halves in the note, so a reader can check the arithmetic against the row beside it. There is
// no rung comparison, no threshold and no per-class number anywhere in this file.
//
// THE BASELINE IS THE ONE NUMBER THAT HAS TO BE NAMED, and it is named once, as a default argument
// rather than an inline literal, because no column holds it: measured this cycle, class_autonomy
// returns work_class / rung / streak / auto_done / extra_files / extra_tasks and nothing else. Its
// one home in prose is `docs/STANDARDS.md` Section 2, which is what every statement of it cites; a
// caller that ever gets a stored source overrides the argument and this file loses even that.
//
// AN UNREAD ROW PRINTS NO PAIR -- the fail-closed half, and the reason this returns a note in the
// same shape `ladderNote` uses rather than a number. A null row, a row whose extras are not finite
// numbers, a failed RPC, no credentials, no class: all of them yield `{files: null, tasks: null}`
// and a sentence saying the pair was not graded. Printing the baseline in that case would be a
// silent 3/4 -- a verdict asserting a cap nobody looked up, which is the defect, not the degrade.
//
// PURE AND EXPORTED, the same shape as `kickoffLaneFinding` above and for the same reason: the
// suite grades all three readings (a widened class, a baseline class, an unread row) without
// running a verdict or reaching Supabase.
export const SCOPE_BASELINE = { files: 3, tasks: 4 };

export function classCapPair(row, baseline = SCOPE_BASELINE) {
  const extraFiles = row?.extra_files;
  const extraTasks = row?.extra_tasks;
  if (!Number.isFinite(extraFiles) || !Number.isFinite(extraTasks)) {
    return {
      files: null,
      tasks: null,
      note: " (scope pair NOT graded: class_autonomy's extras were not read, so what this class earned is unknown -- no pair is printed, because the baseline is not the cap of any class above cap_relax_rung)",
    };
  }
  const files = baseline.files + extraFiles;
  const tasks = baseline.tasks + extraTasks;
  return {
    files,
    tasks,
    note: ` (scope pair graded against ${files} files / ${tasks} tasks -- the ${baseline.files}/${baseline.tasks} baseline plus class_autonomy's ${extraFiles}/${extraTasks} for work class ${row.work_class ?? "(unnamed)"} at rung ${row.rung ?? "(blank)"})`,
  };
}

// FEATURE: AGT-189 -- THE BUILDER'S DECLARED MODEL, graded against the live `orchestrator` lane.
//
// THE MODEL ID IS AN ARGUMENT, NEVER A LITERAL IN THIS FILE, and that is why this function takes a
// second parameter instead of knowing the answer. `public.runner_model_lanes` is the source of
// truth for which model a lane runs (ARCHITECTURE.md 19b -- routing lives in data, not code), and
// John retunes it: a model id baked in here would keep passing every kickoff that names the OLD
// model and refusing every kickoff that names the new one, for as long as nobody noticed -- a green
// that grades nothing (19v, pattern:2, pattern:93). A grep of this file for ANY model id returns 0
// and must keep returning 0 -- agt-189's suite pins that; the caller reads the row each run and
// hands the answer in.
//
// THE LINE, NOT THE FILE -- the same shape as `kickoffLaneFinding` above, for the same reason. A
// kickoff's CONTEXT and TASKS name model ids all the time (AGT-189's own does), so a document-wide
// search would pass on a string that declares nothing. The first line carrying `Model` and a colon
// is located once and that string is graded.
//
// THE `Lanes:` FALLBACK IS A REAL SHIPPED SHAPE, not a courtesy: `v7.0.609-AGT-134` has no
// `Model` line at all and declares the build model on its `Lanes:` line ("design and build both
// **orchestrator**", naming the lane's model inline). Refusing that shape would invalidate a
// kickoff that DID declare its model, so the Lanes line is read when there is no Model line. Measured over the 25 kickoffs
// `v7.0.600`-`v7.0.626` as they shipped: 23 pass, and the 2 that refuse (`v7.0.600:7`,
// `v7.0.614:8`) both put the Builder on `mechanical` when runbook step 7 runs it on `orchestrator`.
// AGT-189 corrected `v7.0.614:8` in the same commit as this clause; `v7.0.600:7` carries the same
// wrong declaration and is filed, not patched -- it is outside this ticket's three files.
//
// CONTAINS, NEVER EQUALS. A kickoff may legitimately name another lane's model in the same line --
// `v7.0.615` declares the judgment lane's `claude-fable-5-1` and its degrade in one breath. The
// claim graded here is "the Builder's model is named on this line", not "no other model is".
//
// NULL WHEN `orchestratorModel` IS FALSY, and that direction is forced. This clause runs at runbook
// step 6 on every cycle, and four shipped tests spawn `--check-kickoff` with both credentials
// deleted from the child env and demand 0 or 1. A clause that refused every kickoff it could not
// grade would wedge the entire runner -- far worse than the bug it fixes. So an unreadable row is
// NOT GRADED, never a refusal, and saying so is the caller's job.
export function kickoffBuilderModelFinding(text, orchestratorModel) {
  if (!orchestratorModel) return null;
  const s = String(text ?? "");
  const modelLine = s.match(/^[^\n]*\bModel\b[^\n]*:[^\n]*$/m);
  const lanesLine = s.match(/^[^\n]*\bLanes\b[^\n]*:[^\n]*$/m);
  const line = modelLine ? modelLine[0] : (lanesLine ? lanesLine[0] : null);
  if (line && line.includes(orchestratorModel)) return null;
  const where = modelLine
    ? "its first Model: line"
    : (line ? "its Lanes: line (it carries no Model: line)" : "no Model: line and no Lanes: line");
  return {
    kind: "kickoff-no-lanes",
    clause: "builder-model",
    remedy_owner: KICKOFF_REMEDY_OWNER,
    remedy: 're-assemble design-kickoff ONCE with "no_lanes":true; the caller never edits the Model line',
    reason: `kickoff does not declare the Builder's model (AGT-189): the live \`orchestrator\` row of \`runner_model_lanes\` reads \`${orchestratorModel}\`, and ${where} does not name it${line ? ` -- the line read was: ${line.trim()}` : ""}. runner-cycle.md step 7 runs the Builder on the \`orchestrator\` lane, so that is the model the kickoff's Model bullet must name; the lane table's purpose column says what a lane is FOR, never which lane the Builder runs ON. The Designer re-assembles design-kickoff ONCE with "no_lanes":true; a Model line supplied by the caller is not a declaration the Designer made.`,
  };
}

// FEATURE: AGT-194 half (b) -- THE VERDICT SAYS OUT LOUD WHEN THE SHA IT GRADED HAS NO CI
// CONCLUSION OF ITS OWN. REPORTED, NEVER A GATE.
//
// THE MEASURED GAP, read from `public.ci_run_conclusions` and `public.runner_verdicts` at this ship
// rather than reasoned about. 82 of 535 conclusion rows (15.3%) carry a CANCELLED blocking job,
// because until half (a) of this ticket every dev push shared one concurrency group and each new push
// cancelled the last. And 16 of 127 verdict rows carrying a `graded_sha` name a sha with no
// conclusion row AT ALL -- every one of them `verdict=block`, 7 provable ancestors of dev HEAD.
// Nothing anywhere said so. The runner's step 4a asks "how did CI grade this ship?" and the honest
// answer for one ship in six was "could not tell", delivered as silence.
//
// IT IS REPORTED AND NEVER ENFORCED, and that is the ticket's own constraint rather than a soft
// start. No branch below assigns to `verdict` or `reasoning`, and `verdictFor()` never reads this
// finding. A CI read that could flip a gate would re-grade every ship on the platform at once, on a
// fact about GitHub's schedulers rather than about the change -- and it would wedge the first cycle
// whose conclusion row simply had not been written yet. The guard
// (tests/regression/agt-194-ci-conclusion-per-sha.test.mjs) asserts the non-gating claim against this
// file's source with the `kickoffNoLanes` block as its positive control.
//
// FOUR CLAUSES, AND COLLAPSING ANY TWO WOULD ERASE THE FACT THE LEDGER IS READ FOR. "nobody could
// tell which tree was graded" (`no-graded-sha`), "the table could not be read" (`unreadable`), "the
// table WAS read and this sha is not in it" (`no-conclusion`) and "the run exists and a blocking job
// never finished" (`cancelled-blocking`) are four different facts about a ship, and a reader
// deciding whether to re-run CI needs to know which. `unreadable` is declared, never a silent empty:
// an unreachable table reported as "no conclusion exists" would manufacture the very finding this
// function exists to make trustworthy.
//
// A ROW WITH NO BLOCKING JOB IS NOT VACUOUSLY CLEAN. "every blocking job succeeded" is true of a row
// that names none, and returning null there would report a run that graded nothing as a graded ship.
// Non-blocking jobs are not consulted at all: `report-conclusion` is the job that WRITES this table,
// so grading the ship on its conclusion would be grading the messenger.
//
// PURE AND SYNC, over rows another function already read -- which is what lets the guard drive every
// branch with no credentials and no network (pattern:162 -- a check grades the change, never the live
// world).
export function ciConclusionFinding({ gradedSha, rows }) {
  const kind = "ci-conclusion-missing";
  const tail = "AGT-194: reported only -- this never changes the verdict. Half (a) of the same ticket " +
    "made each pushed sha its own concurrency group so a peer push can no longer cancel this one's " +
    "blocking jobs; a sha pushed BEFORE that landed may simply predate the fix.";

  if (!gradedSha) {
    return { kind, clause: "no-graded-sha", reason:
      `no CI conclusion could be looked up because this run's graded sha could not be read at all ` +
      `(gradedShaFor() returned null: no git, no checkout, or a non-hex HEAD). The verdict still ` +
      `stands on its gates -- but it cannot be joined to a CI run, so nothing here says whether CI ` +
      `ever graded this tree. ${tail}` };
  }
  if (!Array.isArray(rows)) {
    return { kind, clause: "unreadable", reason:
      `the CI conclusion for sha ${gradedSha} could NOT BE READ (ci_run_conclusions was unreachable, ` +
      `or no credentials were supplied). This is a declared gap, not a clean result: "the table could ` +
      `not be read" and "the table holds no run for this sha" are different facts and only one of them ` +
      `means a grade is missing. ${tail}` };
  }

  const row = rows.find(r => String(r?.commit_sha ?? "") === String(gradedSha)) ?? null;
  if (!row) {
    const came = rows.length
      ? `the read returned ${rows.length} row(s), none of them for this sha (` +
        `${rows.map(r => String(r?.commit_sha ?? "?")).join(", ")})`
      : "the table was read and holds no run for this sha";
    return { kind, clause: "no-conclusion", reason:
      `sha ${gradedSha} has NO CI conclusion: ${came}. A landed commit nothing ever graded -- 16 of ` +
      `127 verdict rows with a graded sha were in exactly this state at this ship, all 16 blocked. If ` +
      `CI is still running, the row appears when report-conclusion writes it. ${tail}` };
  }

  const jobs = Array.isArray(row.jobs) ? row.jobs : [];
  const blocking = jobs.filter(j => /blocking/i.test(String(j?.name ?? "")));
  if (!blocking.length) {
    return { kind, clause: "no-conclusion", reason:
      `sha ${gradedSha} has a ci_run_conclusions row (run ${row.run_id ?? "?"}` +
      `${row.concluded_at ? `, concluded ${row.concluded_at}` : ""}) but it names NO blocking job` +
      `${jobs.length ? ` -- the ${jobs.length} job(s) it does name are ` +
        `${jobs.map(j => String(j?.name ?? "?")).join(", ")}` : " and no jobs at all"}. Nothing ` +
      `blocking graded this tree, so the run is not a grade. ${tail}` };
  }

  const unfinished = blocking.filter(j => String(j?.conclusion ?? "") !== "success");
  if (!unfinished.length) return null;

  return { kind, clause: "cancelled-blocking", reason:
    `sha ${gradedSha} has a CI run (run ${row.run_id ?? "?"}` +
    `${row.concluded_at ? `, concluded ${row.concluded_at}` : ""}) whose blocking job(s) did not ` +
    `succeed: ${unfinished.map(j => `${String(j?.name ?? "?")} = ${String(j?.conclusion ?? "null")}`).join("; ")}` +
    `. A CANCELLED blocking job is the AGT-194 defect -- no grade was ever published for this sha, ` +
    `which is not the same as a red grade; a FAILURE is a real grade and the regression and build ` +
    `gates above already carry it. Read the conclusion beside each job name rather than the clause, ` +
    `which names this finding's motivating case. ${tail}` };
}

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
//
// SES-344: each view is now read TWICE -- once excluding `DIFF_LAST`, once for `DIFF_LAST` alone --
// and the two outputs are pushed in that order, so the cap (when it fires at all) falls inside a
// re-rendered board rather than inside the ticket. Each section says which half it is in its own
// header, because a judge told "you have the diff" and handed the artifacts first has been sent the
// same bytes and shown a different change. `limit` is a parameter rather than the constant so a
// test can drive the truncation path without a 400,000-character fixture; production passes none.
export function diffFor(repoRoot, base, { limit = DIFF_CAP } = {}) {
  const parts = [];
  for (const view of [["diff", base + "...HEAD"], ["diff"]]) {
    const runs = [
      { argv: [...view, "--", ".", ...DIFF_LAST.map(p => `:(exclude)${p}`)], label: "ticket files" },
      { argv: [...view, "--", ...DIFF_LAST], label: "re-rendered artifacts" },
    ];
    for (const { argv, label } of runs) {
      const r = spawnSync("git", argv, { cwd: repoRoot, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
      if (r.error || r.status !== 0) return `[UNREADABLE: git ${argv.join(" ")} failed -- the diff could not be read, which is missing evidence and fails closed]`;
      if (String(r.stdout).trim()) parts.push(`--- git ${argv.join(" ")} (${label}) ---\n${r.stdout}`);
    }
  }
  return cap(parts.join("\n"), limit, "diff");
}

// FEATURE: SES-344 -- THE COMMIT BODY IS EVIDENCE, and until this it was the only place six of the
// eight adjudicated disagreements' named evidence existed. The Builder's report is written into the
// commit message by contract (STANDARDS.md Section 1; the runbook's own report shape), and the
// judge was being asked whether the delivery carried its promised evidence while being handed
// everything about the delivery EXCEPT the place that evidence is written down.
//
// THE WHOLE RANGE, not `-1`: a cycle can land more than one commit between base and HEAD, and
// grading the last one is grading part of the delivery. Failure returns the same declared-unreadable
// marker shape the diff uses -- a missing ship report is missing evidence and fails closed, never a
// silently empty string that reads as "the Builder wrote nothing".
export function shipReportFor(repoRoot, base) {
  const r = spawnSync("git", ["log", "--format=%B", `${base}..HEAD`], { cwd: repoRoot, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.error || r.status !== 0) return "[UNREADABLE: git log failed -- ship report missing, fails closed]";
  return cap(r.stdout, SHIP_REPORT_CAP, "ship report");
}

// FEATURE: SES-345 -- THE VERDICT ROW CARRIES THE SHA IT GRADED, and the thing to read twice is that
// this is the handoff's FOURTH row gaining its JOIN KEY, not a new fact being measured. The census
// already asked "does this ship have a sha?" -- but it asked `runner_cycles.item_id`, which is the
// CYCLE's claim about which ticket it ran, never the VERDICT's claim about which tree it graded. A
// verdict and a push could disagree about the tree and nothing in the ledger could tell.
//
// `null` IS A REAL ANSWER AND IT IS NOT AN EXCEPTION. A run outside a git checkout, a `git` that is
// not on PATH, a repo root that does not exist: every one of them returns `null` and the row records
// `null`, because a verdict whose sha could not be read is still a verdict about the change, and
// throwing here would cost a valid judgment over a missing join key. The CHECK constraint on the
// column is what makes `null` distinguishable from a malformed value -- a non-hex string cannot
// reach the table at all.
export function gradedShaFor(repoRoot) {
  try {
    const r = spawnSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" });
    if (r.error || r.status !== 0) return null;
    const m = String(r.stdout || "").trim().match(/^[0-9a-f]{40}$/);
    return m ? m[0] : null;
  } catch {
    return null;
  }
}

// FEATURE: SES-344 -- the OTHER half of the delivery: runbook step 7 stores the Builder's report on
// `runner_cycles.notes`, and an unattended cycle's fullest account of what it did lives there and
// nowhere else the judge could see.
//
// `null` WITHOUT A CYCLE ID, AND "" IS NOT THE SAME ANSWER. `null` means nobody asked (a
// `--cycle-id`-less run: the local checks, the regression suite's imports); `""` means the row was
// read and the Builder wrote nothing -- which is exactly the finding SES-321's block rests on, so
// collapsing the two would erase it. An unreachable row is the declared-unreadable marker again,
// never a silent empty: "the notes could not be read" and "the notes are empty" are different facts
// about the delivery and the judge grades them differently.
export async function cycleNotesFor(supabaseUrl, supabaseKey, cycleId) {
  if (!cycleId) return null;
  try {
    const r = await rest(supabaseUrl, supabaseKey, `runner_cycles?select=notes&id=eq.${encodeURIComponent(cycleId)}&limit=1`);
    if (r.error) throw new Error(r.error);
    return r.rows?.[0]?.notes ?? "";
  } catch (e) {
    return `[UNREADABLE: runner_cycles.notes -- ${e.message}]`;
  }
}

// FEATURE: AGT-194 half (b), the READ -- separated from the judgment above so the judgment is a pure
// function a guard can drive through every branch, and this is the only part that needs the network.
// Shaped on cycleNotesFor() directly above.
//
// `null` ON EVERY FAILURE, AND `[]` IS NOT THE SAME ANSWER. `[]` means the table was read and holds
// no run for this sha -- the ticket's headline finding. `null` means it could not be read at all, and
// ciConclusionFinding() renders that as the DECLARED-unreadable clause. Returning `[]` for an
// unreachable table would manufacture the finding out of a network error, which is the one way a
// reported-only check can still mislead. A missing sha or missing credentials are the same unknown:
// unreadable, never clean.
export async function ciConclusionFor(supabaseUrl, supabaseKey, gradedSha) {
  if (!supabaseUrl || !supabaseKey || !gradedSha) return null;
  try {
    const r = await rest(supabaseUrl, supabaseKey,
      `ci_run_conclusions?select=commit_sha,run_id,concluded_at,jobs&commit_sha=eq.${encodeURIComponent(gradedSha)}&limit=1`);
    if (r.error) return null;
    return Array.isArray(r.rows) ? r.rows : null;
  } catch {
    return null;
  }
}

// THE ROW, as one pure function both lanes call. Exported so a guard can assert that the JUDGED
// lane records a row identical in SHAPE to the mechanical lane's without inserting anything into the
// live verdict ledger -- `runner_verdicts` gained no column for this ticket, and the agent's lens
// findings reach it through `reasoning`, which is the column that already exists to carry exactly
// that. A judged row that grew a key would be a schema change nobody asked for.
export function verdictRowFor({ cycleId, ticket, version, verdict, gateResults, reasoning, eligible, autoDoneReason, epicName, priorityClass, gradedSha }) {
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
    // SES-345: LAST key, deliberately -- the agt-67 shape guard compares key SETS between the two
    // lanes, so a key added here must be added for BOTH or that guard goes red, which is exactly the
    // protection it exists to give. `null` when the sha could not be read (gradedShaFor()'s note).
    graded_sha: gradedSha ?? null,
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
async function recordJudgedVerdict({ stored, agentVerdict, truncations = [], intentSlug, cycleId, ticket, version, dryRun, supabaseUrl, supabaseKey }) {
  const gateResults = stored.gates || {};
  const mechanical = stored.mechanical || verdictFor(gateResults);
  const codeEligibility = stored.code_eligibility || { eligible: false, reason: "the pass-one context carried no code eligibility, so the bar fails closed" };
  const r = reconcileJudgment({ mechanical, agent: agentVerdict, codeEligibility });

  const detailLine = GATES.map(g => `${g.label}=${gateResults[g.key] ?? "skipped"} [${(stored.gate_detail || {})[g.key] ?? "no detail recorded"}]`).join("\n  ");
  const reasoning = `${r.reasoning}\nJudged by ${VERIFIER_AGENT_ID}/${VERIFY_CAPABILITY} (intent ${intentSlug}).${stored.note ? ` ${stored.note}` : ""}\nGates: ${detailLine.replace(/\n\s+/g, " | ")}`;
  // SES-343: the cut is on the row (through `stored.note` -> `reasoning` above) AND on the console,
  // because the reader of a verdict whose lens stops mid-sentence is owed the reason in the place
  // they are reading it. Silent when nothing was cut.
  const truncatedLine = truncations.length
    ? `\n  truncated: ${truncations.map(t => `${t.key} ${t.from}->${t.to}`).join(", ")}`
    : "";
  // SES-345: THE SHA THE GATES RAN ON, read from the pass-one context file and never re-read here.
  // Pass two runs after the sub-agent has spoken, which can be minutes and (on a rebase) a different
  // HEAD; re-reading `git rev-parse` at this point would record the tree the JUDGMENT was filed on,
  // not the tree the GATES graded, and the whole value of the key is that it names the latter.
  const gradedSha = stored.graded_sha ?? null;
  const prose =
    `verifier verdict: ${r.verdict.toUpperCase()}${ticket ? ` on ${ticket}` : ""}${version ? ` (${version})` : ""} -- judged\n` +
    `  ${detailLine}\n` +
    `  ${r.reasoning.replace(/\n/g, "\n  ")}\n` +
    `  graded sha: ${gradedSha ?? "UNREADABLE"}\n` +
    `  auto-done eligible: ${r.eligible ? "YES" : "no"} -- ${r.reason}${truncatedLine}`;
  const payload = {
    ok: r.verdict === "approve",
    exitCode: r.verdict === "approve" ? 0 : 1,
    verdict: r.verdict, gates: gateResults, gateDetail: stored.gate_detail || {},
    reasoning, agent_verdict: agentVerdict.verdict, overrides: r.overrides, truncations,
    auto_done_eligible: r.eligible, auto_done_reason: r.reason,
    ticket: ticket || null, version: version || null,
    epic_name: stored.epic_name ?? null, priority_class: stored.priority_class ?? null,
    graded_sha: gradedSha,   // SES-345 -- the tree the gates ran on, as recorded on the row.
    judged_by: `${VERIFIER_AGENT_ID}/${VERIFY_CAPABILITY}`, intent_slug: intentSlug,
  };

  if (dryRun) {
    return emit({ code: payload.exitCode, payload: { ...payload, recorded: false }, prose: prose + "\n  --dry-run: nothing recorded." });
  }
  const ins = await insertVerdict({
    supabaseUrl, supabaseKey, cycleId, ticket, version, verdict: r.verdict, gateResults,
    reasoning, eligible: r.eligible, autoDoneReason: r.reason,
    epicName: stored.epic_name ?? null, priorityClass: stored.priority_class ?? null,
    gradedSha,
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

// FEATURE: SES-403 -- `--regrade`: re-grade a ship that was blocked for a cause OUTSIDE ITSELF.
//
// THE PREMISE, measured rather than argued (2026-09-15): seven `delivered` tickets each carry a
// single `runner_verdicts` row whose verdict is `block`, `gate_build` green on all seven, the reds
// entirely `regression` and/or `hygiene`. `runner_decisions` holds no `kind='ship'` row for any of
// them, and `record_ship_decision()`'s first refusal (`verdict is distinct from 'approve' -> raise`)
// means none can ever be written. They are stuck, and not one of them is stuck on its own diff.
//
// THIS BRANCH RUNS NO GATE, and that is the design rather than an economy. The verdict comes from
// CI's own conclusion on `dev` (SES-352: CI is the authority on dev green). A local re-run would
// grade THIS worktree at THIS instant, which is a different tree from the one the ship's block was
// about and a different tree from the one CI concluded on.
//
// WHY THE NEGATIVE CONTROL IS FREE. A ticket blocked on its OWN diff has that diff in `dev`, so the
// job it broke is still `failure` at dev head -- `regradable_ships()` never returns it, and (a)
// below refuses it at exit 2. Nothing has to be remembered for that case; it falls out of the rule.
//
// Exit codes follow the file's table exactly: 2 is "the re-grade could not run" (no credentials, a
// ticket the lister did not return, an unreadable conclusion, a failed insert) and is NOT a verdict;
// 1 is a verdict or a standing block (the ancestry check failed, or the re-grade still blocks); 0 is
// an approve, recorded, with its ship decision written.
async function regradeBranch({ repoRoot, ticket, cycleId, version, dryRun }) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  // No `--dry-run` relaxation on the READS: every fact this branch grades on is a row. `--dry-run`
  // means "write nothing", never "invent the board".
  const missing = [
    !supabaseUrl && "SUPABASE_URL", !supabaseKey && "SUPABASE_SERVICE_KEY",
    !ticket && "--ticket", !cycleId && "--cycle-id",
  ].filter(Boolean);
  if (missing.length) {
    return emit({ code: 2, payload: { ok: false, exitCode: 2, kind: "cannot-run", missing },
      prose: `verifier --regrade: missing ${missing.join(", ")}. Exiting 2 (the re-grade could not run) -- this is NOT a verdict, and the prior block stands untouched.` });
  }

  // ---- (a) THE LISTER IS THE AUTHORITY. -------------------------------------------------------
  // Not "does this ticket look stuck to me" -- `public.regradable_ships()` decides, and a ticket it
  // did not return is refused here rather than argued with. That is what makes the flag unable to
  // re-grade a ship blocked on its own diff even when a caller names one.
  const listed = await rest(supabaseUrl, supabaseKey, "rpc/regradable_ships", { method: "POST", body: "{}" });
  if (listed.error) {
    return emit({ code: 2, payload: { ok: false, exitCode: 2, kind: "cannot-run", error: listed.error },
      prose: `verifier --regrade: public.regradable_ships() could not be read (${listed.error}). Exiting 2 -- no verdict, nothing recorded.` });
  }
  const rows = Array.isArray(listed.rows) ? listed.rows : [];
  const row = rows.find(r => r && String(r.backlog_id) === String(ticket)) || null;
  if (!row) {
    return emit({ code: 2, payload: { ok: false, exitCode: 2, kind: "cannot-run", ticket, listed: rows.map(r => r.backlog_id) },
      prose: `verifier --regrade: public.regradable_ships() did not return ${ticket} (it returned: ${rows.map(r => r.backlog_id).join(", ") || "nothing"}).\n` +
        `A ship is re-gradable only when every CI job its verdict's RED gates map to is \`success\` in the newest ref='dev' conclusion, that conclusion concluded AFTER the verdict, and no unreversed ship decision exists. A ship blocked on its own diff has that diff in dev, so the job it broke is still failing there and it is never listed.\n` +
        `Exiting 2 -- this is NOT a verdict on ${ticket}; its prior block stands.` });
  }

  // ---- (b) THE ANCESTRY CHECK, and it is the whole join between the two trees. -----------------
  // CI concluded on `ci_sha`. The block was graded on `graded_sha`. If the graded tree is not an
  // ancestor of the CI tree, then the CI run's green says nothing about the delivery being
  // re-graded -- the commit may have been rebased away, reverted, or never landed at all.
  // ANY git error is the same answer as a non-ancestor: unknown is not innocent, and this is the
  // one place where reading "git could not tell" as "fine" would launder a ship nobody shipped.
  // NOTHING IS RECORDED on this path. A block that stands needs no second block row saying so.
  const gradedSha = row.graded_sha ?? null;
  const ciSha = row.ci_sha ?? null;
  let ancestryError = null;
  if (!gradedSha || !ciSha) {
    ancestryError = `the lister returned graded_sha=${gradedSha ?? "null"} and ci_sha=${ciSha ?? "null"}; an unrecorded sha cannot be placed in dev's history`;
  } else {
    const anc = spawnSync("git", ["merge-base", "--is-ancestor", gradedSha, ciSha], { cwd: repoRoot, encoding: "utf8" });
    if (anc.error) ancestryError = `git merge-base could not run: ${anc.error.message}`;
    else if (anc.status !== 0) {
      ancestryError = anc.status === 1
        ? `${gradedSha} is NOT an ancestor of the CI tree ${ciSha}`
        : `git merge-base --is-ancestor exited ${anc.status}: ${String(anc.stderr || "").trim() || "no stderr"}`;
    }
  }
  if (ancestryError) {
    return emit({ code: 1, payload: { ok: false, exitCode: 1, kind: "regrade-refused", recorded: false, ticket,
        prior_verdict_id: row.verdict_id, graded_sha: gradedSha, ci_sha: ciSha, ci_run_id: row.ci_run_id, error: ancestryError },
      prose: `verifier --regrade: REFUSED on ${ticket} -- ${ancestryError}.\n` +
        `  The CI conclusion is evidence about the tree it ran on; unless the graded tree is inside that tree's history, its green is not about this delivery.\n` +
        `  Exiting 1: the prior block (${row.verdict_id}) STANDS and NOTHING was recorded.` });
  }

  // ---- (c) THE GATE RESULTS, from CI's jobs through the same mapping the lister used. ----------
  // Two reads rather than one: the prior verdict's own gate statuses (so a `skipped` gate refuses
  // here as well as in the lister) and the conclusion's job array (which the lister's return shape
  // does not carry). Both by primary key, so neither can describe a different row than the one the
  // lister named.
  const prev = await rest(supabaseUrl, supabaseKey,
    `runner_verdicts?select=id,gate_build,gate_regression,gate_hygiene,epic_name,priority_class&id=eq.${encodeURIComponent(row.verdict_id)}&limit=1`);
  if (prev.error || !Array.isArray(prev.rows) || !prev.rows[0]) {
    return emit({ code: 2, payload: { ok: false, exitCode: 2, kind: "cannot-run", error: prev.error || `no runner_verdicts row ${row.verdict_id}` },
      prose: `verifier --regrade: could not read the prior verdict ${row.verdict_id} (${prev.error || "no such row"}). Exiting 2 -- no verdict, nothing recorded.` });
  }
  const priorRow = prev.rows[0];
  const conc = await rest(supabaseUrl, supabaseKey,
    `ci_run_conclusions?select=commit_sha,run_id,concluded_at,jobs&run_id=eq.${encodeURIComponent(row.ci_run_id)}&limit=1`);
  if (conc.error) {
    return emit({ code: 2, payload: { ok: false, exitCode: 2, kind: "cannot-run", error: conc.error },
      prose: `verifier --regrade: could not read ci_run_conclusions for run ${row.ci_run_id} (${conc.error}). Exiting 2 -- no verdict, nothing recorded.` });
  }
  const conclusion = Array.isArray(conc.rows) ? conc.rows[0] : null;
  const graded = regradeGateResults({
    gates: { build: priorRow.gate_build, regression: priorRow.gate_regression, hygiene: priorRow.gate_hygiene },
    jobs: conclusion ? conclusion.jobs : null,
  });
  if (!graded.ok) {
    return emit({ code: 1, payload: { ok: false, exitCode: 1, kind: "regrade-refused", recorded: false, ticket,
        prior_verdict_id: row.verdict_id, ci_run_id: row.ci_run_id, error: graded.reason },
      prose: `verifier --regrade: REFUSED on ${ticket} -- ${graded.reason}\n  Exiting 1: the prior block (${row.verdict_id}) STANDS and NOTHING was recorded.` });
  }
  const gateResults = graded.gateResults;
  const { verdict, reasoning: verdictReasoning } = verdictFor(gateResults);
  const jobNames = ciJobsForGates(row.red_gates || []);

  // ---- (d) ONE row. Same insertVerdict() both other lanes go through, same payload shape. ------
  //
  // `graded_sha` IS THE CI TREE, deliberately. SES-345's key names the tree the gates ran on, and
  // here the gates ran in CI on `ci_sha` -- writing this worktree's HEAD would record a tree nobody
  // graded. `auto_done_eligible` is FALSE unconditionally: a re-grade is a second look at an
  // existing delivery, never its own ladder grant, and this branch never reads class_autonomy().
  const reasoning =
    `${verdictReasoning}\n` +
    `SES-403 re-grade of ${ticket}: the prior verdict ${row.verdict_id} (${row.version ?? "no version"}) blocked on ${(row.red_gates || []).join(", ") || "(no red gate recorded)"}, ` +
    `which CI decides through ${jobNames.map(j => `"${j}"`).join(" and ") || "(no job)"}. Re-graded against the newest ref='dev' conclusion: run ${row.ci_run_id}, sha ${row.ci_sha}, concluded ${row.ci_concluded_at}. ` +
    `Gates: ${graded.reason} ` +
    `The graded tree ${gradedSha} is an ancestor of ${ciSha}. NO GATE WAS RUN LOCALLY -- CI is the authority on dev green (SES-352), and a local run would grade a different tree at a different instant.`;
  const autoDoneReason =
    `auto-done does not apply to a re-grade: this is a second look at an existing delivery graded from CI's conclusion, not a fresh delivery, and the trust ladder was not asked (SES-403).`;

  const prose =
    `verifier --regrade verdict: ${verdict.toUpperCase()} on ${ticket}${version ? ` (${version})` : ""} -- from CI run ${row.ci_run_id}\n` +
    `  ${GATES.map(g => `${g.label}=${gateResults[g.key]} [${graded.source[g.key]}]`).join("\n  ")}\n` +
    `  prior verdict: ${row.verdict_id} (red: ${(row.red_gates || []).join(", ") || "none recorded"})\n` +
    `  graded sha: ${ciSha} (CI's tree; ${gradedSha} is an ancestor of it)\n` +
    `  auto-done eligible: no -- ${autoDoneReason}`;

  const payload = {
    ok: verdict === "approve", exitCode: verdict === "approve" ? 0 : 1,
    kind: "regrade", verdict, gates: gateResults, gate_source: graded.source, reasoning,
    ticket, version: version || null,
    prior_verdict_id: row.verdict_id, prior_version: row.version ?? null,
    red_gates: row.red_gates || [], ci_jobs: jobNames,
    ci_sha: ciSha, ci_run_id: row.ci_run_id, ci_concluded_at: row.ci_concluded_at,
    graded_sha: ciSha, auto_done_eligible: false, auto_done_reason: autoDoneReason,
    epic_name: priorRow.epic_name ?? null, priority_class: priorRow.priority_class ?? null,
  };

  if (dryRun) {
    return emit({ code: payload.exitCode, payload: { ...payload, recorded: false, ship_decision_id: null },
      prose: `${prose}\n  --dry-run: nothing recorded.` });
  }

  const ins = await insertVerdict({
    supabaseUrl, supabaseKey, cycleId, ticket, version, verdict, gateResults, reasoning,
    eligible: false, autoDoneReason,
    epicName: priorRow.epic_name ?? null, priorityClass: priorRow.priority_class ?? null,
    gradedSha: ciSha,
  });
  if (ins.error) {
    return emit({ code: 2, payload: { ...payload, recorded: false, error: ins.error },
      prose: `${prose}\n  RECORDING FAILED: ${ins.error}\n  Exiting 2 -- the re-grade above was reached but is not in the ledger, so it is not assertable.` });
  }

  // ---- (e) ON APPROVE ONLY: the ship decision the block made unwritable. -----------------------
  // A BLOCK EMITS AND STOPS. Its block row is the record, and SES-402 reads those later; manufacturing
  // a ship decision for a delivery that still does not pass is the one thing record_ship_decision()'s
  // first refusal exists to prevent, and routing around it here would be that refusal defeated.
  if (verdict !== "approve") {
    return emit({ code: 1, payload: { ...payload, recorded: true, verdict_id: ins.rowId, ship_decision_id: null },
      prose: `${prose}\n  recorded as runner_verdicts ${ins.rowId}\n  Still a block: no ship decision written, and that row is what SES-402 reads.` });
  }
  const ship = await rest(supabaseUrl, supabaseKey, "rpc/record_ship_decision", {
    method: "POST",
    body: JSON.stringify({
      p_cycle_id: cycleId, p_backlog_id: ticket, p_version: version || row.version || null,
      p_push_sha: ciSha, p_verdict_id: ins.rowId,
    }),
  });
  if (ship.error) {
    return emit({ code: 2, payload: { ...payload, recorded: true, verdict_id: ins.rowId, ship_decision_id: null, error: ship.error },
      prose: `${prose}\n  recorded as runner_verdicts ${ins.rowId}\n  record_ship_decision FAILED: ${ship.error}\n  Exiting 2 -- the approve is in the ledger but the ship it authorises is not, which is a half-written handoff rather than a verdict.` });
  }
  const shipId = Array.isArray(ship.rows) ? ship.rows[0] : ship.rows;
  return emit({ code: 0, payload: { ...payload, recorded: true, verdict_id: ins.rowId, ship_decision_id: shipId ?? null },
    prose: `${prose}\n  recorded as runner_verdicts ${ins.rowId}\n  ship decision: ${shipId ?? "(none returned)"} -- its window closes through the tail's ordinary sweep.` });
}

async function main() {
  const repoRoot = arg("repo", path.resolve(__dirname, ".."));

  // ---- SES-376: the kickoff size check, and it is the FIRST branch on purpose. ----------------
  //
  // It runs BEFORE the credential check below because of WHEN its caller calls it: runbook step 6
  // measures a kickoff the Designer has just drafted, before the delivery exists, and a measurement
  // that demanded SUPABASE_URL to count bytes in a local file would be unrunnable exactly there --
  // and an unrunnable check is a check that gets dropped. Nothing in this branch reads the board,
  // runs a gate, or writes a row, so there is nothing for a credential to authorise.
  //
  // 2 for an unreadable file, never 1. Same distinction the exit-code table already draws: 1 is a
  // judgement about the kickoff ("it is too big"), 2 is the absence of one ("there was nothing to
  // measure"). A caller that collapses them would treat a typo'd path as a passing cap check.
  const checkKickoffPath = arg("check-kickoff", "");
  if (checkKickoffPath) {
    const abs = path.resolve(repoRoot, checkKickoffPath);
    let text;
    try {
      text = fs.readFileSync(abs, "utf8");
    } catch (e) {
      return emit({ code: 2, payload: { ok: false, exitCode: 2, kind: "cannot-run", error: `kickoff unreadable: ${e.message}`, path: checkKickoffPath },
        prose: `verifier: could not read the kickoff at ${checkKickoffPath} (${e.message}). Exiting 2 -- this is NOT a cap verdict, it is the absence of one.` });
    }
    const finding = kickoffCapFinding(text);
    if (finding) {
      return emit({ code: 1, payload: { ok: false, exitCode: 1, kind: "kickoff-over-cap", ...finding }, prose: finding.reason });
    }
    // SES-359: the lane declaration, graded AFTER the cap and only when the cap passed. Same exit
    // code, because both are the same verdict to the caller -- "this draft is not the kickoff yet"
    // -- and runbook step 6 already treats exit 1 as a named deviation to re-assemble against.
    const lanes = kickoffLaneFinding(text);
    if (lanes) {
      return emit({ code: 1, payload: { ok: false, exitCode: 1, ...lanes }, prose: lanes.reason });
    }
    // ---- AGT-189: the Builder's DECLARED MODEL, graded against the lane row, read live. ------
    //
    // THE ROW IS READ HERE AND NOWHERE ELSE IN THIS BRANCH, because the answer must come from
    // `public.runner_model_lanes` on the run rather than from a string in this file (19b,
    // pattern:2/pattern:93). `kickoffBuilderModelFinding` stays pure and takes it as an argument.
    //
    // FAIL NOT-GRADED, NEVER REFUSED, WHEN THE ROW CANNOT BE READ -- missing credentials, an
    // unreachable endpoint, an empty result. This branch is the FIRST in main() precisely because
    // step 6 must be runnable with nothing but a local file (see the SES-376 header above), and
    // `ses-376`, `ses-359`, `ses-378h` and every `agt-187` arm spawn it with both credentials
    // deleted from the child env, demanding 0 or 1. Refusing every kickoff whose lane row was
    // unreadable would turn all four red and wedge every cycle -- a far worse failure than the
    // ungraded green it replaces. So the exit code is untouched and the green SAYS it did not grade
    // (`builder_model_note`): an unproven claim is declared, never quietly made (19v).
    let orchestratorModel = null;
    let builderModelNote = "";
    {
      const laneUrl = process.env.SUPABASE_URL;
      const laneKey = process.env.SUPABASE_SERVICE_KEY;
      if (!laneUrl || !laneKey) {
        builderModelNote = `NOT GRADED (AGT-189): the Builder's model was not checked -- ${[!laneUrl && "SUPABASE_URL", !laneKey && "SUPABASE_SERVICE_KEY"].filter(Boolean).join(" and ")} absent, so the live \`orchestrator\` row of runner_model_lanes could not be read. Exit code unchanged -- this green does NOT say the kickoff names the Builder's model.`;
      } else {
        // A DEADLINE, because "not graded" only protects the runner if the read cannot HANG. An
        // 8-second abort lands in `rest()`'s own catch and comes back as an `error`, which is the
        // not-graded path below -- the same direction as absent credentials, never a refusal.
        const laneRes = await rest(laneUrl, laneKey, "runner_model_lanes?lane=eq.orchestrator&select=model_id",
          { signal: AbortSignal.timeout(8000) });
        if (laneRes.error) {
          builderModelNote = `NOT GRADED (AGT-189): the Builder's model was not checked -- runner_model_lanes was unreadable (${laneRes.error}). Exit code unchanged.`;
        } else if (!Array.isArray(laneRes.rows) || !laneRes.rows.length || !laneRes.rows[0].model_id) {
          builderModelNote = "NOT GRADED (AGT-189): the Builder's model was not checked -- runner_model_lanes returned no `orchestrator` row to grade against. Exit code unchanged.";
        } else {
          orchestratorModel = String(laneRes.rows[0].model_id);
        }
      }
    }
    const builderModel = kickoffBuilderModelFinding(text, orchestratorModel);
    if (builderModel) {
      return emit({ code: 1, payload: { ok: false, exitCode: 1, ...builderModel, orchestrator_lane_model: orchestratorModel }, prose: builderModel.reason });
    }
    // ---- AGT-187: THE THIRD CLAUSE -- the green says WHOSE declaration it graded. -------------
    //
    // ORDER IS cap -> lanes -> attestation, and it is not interchangeable: the first two grade the
    // DOCUMENT and can refuse it outright, so a document that is not a kickoff yet must never be
    // measured against an answer. Attestation is the last question, asked only of a file that has
    // already passed both.
    //
    // WHAT THE GREEN USED TO MEAN. `kickoffLaneFinding` grades a LINE'S PRESENCE (its own header
    // says so, deliberately), which is the right check and the wrong claim: the exit 0 was read as
    // "the Designer declared its lanes" when all it proved was that the bytes on disk carry the
    // line. On cycle a1e84644 the orchestrator supplied line 8 itself after the refusal and the
    // re-run went green over 7,781 bytes of which 49 were its own -- a gate whose green is not
    // evidence (ARCHITECTURE.md 19v).
    //
    // 2, NEVER A GREEN, for an answer that cannot be read. Same distinction the branch already
    // draws twice above: 1 is a judgement about the kickoff, 2 is the absence of one. A caller that
    // passed `--answer` and got an exit 0 out of an unparseable file would have been handed the
    // strongest claim this branch can make on the weakest evidence it has.
    const bytes = Buffer.byteLength(text, "utf8");
    const answerPath = arg("answer", "");
    if (answerPath) {
      const answerAbs = path.resolve(repoRoot, answerPath);
      let answer;
      try {
        answer = JSON.parse(fs.readFileSync(answerAbs, "utf8"));
      } catch (e) {
        return emit({ code: 2, payload: { ok: false, exitCode: 2, kind: "cannot-run", error: `answer unreadable JSON: ${e.message}`, path: answerPath },
          prose: `verifier: --answer=${answerPath} is not readable JSON (${e.message}). Exiting 2 -- this is NOT an attestation verdict, it is the absence of one.` });
      }
      const declared = answer && typeof answer.kickoff_markdown === "string" ? answer.kickoff_markdown : null;
      if (declared === null) {
        return emit({ code: 2, payload: { ok: false, exitCode: 2, kind: "cannot-run", error: "answer carries no kickoff_markdown string", path: answerPath },
          prose: `verifier: --answer=${answerPath} carries no \`kickoff_markdown\` string, so there is nothing to attest the kickoff against. Exiting 2 -- never a green.` });
      }
      const answerBytes = Buffer.byteLength(declared, "utf8");
      const diff = firstDifferingLine(declared, text);
      if (diff) {
        const reason = `kickoff-unattested-declaration: the file on disk is ${bytes} bytes, the Designer's answer declared ${answerBytes} (delta ${bytes - answerBytes >= 0 ? "+" : ""}${bytes - answerBytes}); they first differ at line ${diff.line} (AGT-187). The green would attest to a declaration nobody made -- re-assemble, never patch the file.`;
        return emit({ code: 1, payload: { ok: false, exitCode: 1, kind: "kickoff-unattested-declaration", attested: false,
          bytes, answer_bytes: answerBytes, byte_delta: bytes - answerBytes, first_differing_line: diff.line,
          cap: KICKOFF_BYTE_CAP, remedy_owner: KICKOFF_REMEDY_OWNER,
          remedy: 're-assemble design-kickoff ONCE and commit its own bytes; the caller never edits the kickoff into shape',
          reason }, prose: reason });
      }
      return emit({ code: 0, payload: { ok: true, exitCode: 0, kind: "kickoff-within-cap", bytes, cap: KICKOFF_BYTE_CAP, attested: true,
        answer_bytes: answerBytes, byte_delta: 0,
        builder_model: orchestratorModel, builder_model_note: builderModelNote,
        attests: "the Designer's own answer carries these exact bytes -- the Lanes: line is the Designer's" },
        prose: `kickoff ${bytes} bytes, within ${KICKOFF_BYTE_CAP} (SES-376), and ATTESTED: the Designer's answer carries these exact bytes (AGT-187)` });
    }
    return emit({ code: 0, payload: { ok: true, exitCode: 0, kind: "kickoff-within-cap", bytes, cap: KICKOFF_BYTE_CAP, attested: false,
      builder_model: orchestratorModel, builder_model_note: builderModelNote,
      attests: "a Lanes: line is present -- NOT that the Designer wrote it" },
      prose: `kickoff ${bytes} bytes, within ${KICKOFF_BYTE_CAP} (SES-376). UNATTESTED (AGT-187): a Lanes: line is present -- NOT that the Designer wrote it. Pass --answer=<path> to attest it.` });
  }

  const dryRun = process.argv.includes("--dry-run");
  const cycleId = arg("cycle-id", "");
  const ticket = arg("ticket", "");
  const version = arg("version", "");

  // ---- SES-403: `--regrade`, and it RETURNS BEFORE THE GATE LOOP on purpose. ------------------
  //
  // Placed here, second, for the same reason `--check-kickoff` is first: what this branch grades is
  // not this worktree. It runs no gate, assembles no prompt and reaches no judge -- so every lane
  // below it would be doing work whose result it must not use. Its own credential check lives
  // inside regradeBranch() because it needs `--ticket` and `--cycle-id` too, which the general
  // check below does not require.
  //
  // AGT-170 DOES NOT REACH THIS BRANCH, and that is a decision rather than an oversight. A re-grade
  // reads CI job CONCLUSIONS, and a conclusion is ABSOLUTE: `Tripwire + regression (blocking)` at dev
  // head says success or failure about a tree this process never ran and holds no `[FAIL]` names for,
  // so there is no failing set to prove a subset over and nothing here to hand a baseline to. The
  // asymmetry that lane already rests on covers the standing-red case on its own -- a `success` job
  // proves the delivery does not break it, and a `failure` proves nothing and lists nothing.
  if (process.argv.includes("--regrade")) {
    return regradeBranch({ repoRoot, ticket, cycleId, version, dryRun });
  }

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
  // FEATURE: AGT-170 -- the baseline the regression gate grades its delta against: the saved
  // stdout+stderr of a `run-all.js` run on the UNCHANGED tree, captured by runbook step 7 before the
  // build's first edit. A PATH RATHER THAN A RUN, and that is the whole safety property: this process
  // cannot measure the baseline itself without measuring the tree it is grading, which is the tree
  // vouching for itself. Absent, unreadable, or empty -> null -> `regressionDelta()` leaves the
  // absolute exit code alone. No flag is the ordinary case for an attended cycle and it costs nothing
  // but the grading the platform already had.
  const regressionBaselinePath = arg("regression-baseline", "");
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
    // SES-343: `{ truncate: true }` -- a decisive miss still exits 2 below; a presentation field
    // over the Intent's maxLength is cut here and the cut is carried to the row rather than costing
    // the whole judgment. Everything downstream reads `valid.value`, never the raw file, so the
    // identity check and the recorded verdict grade the SAME object that gets written.
    const valid = validateAgentVerdict(rows.schema, agentVerdict, { truncate: true });
    if (!valid.ok) {
      return emit({ code: 2, payload: { ok: false, exitCode: 2, kind: "cannot-run", schema_errors: valid.errors },
        prose: `verifier: the agent's verdict does not satisfy Intent "${rows.intentSlug}"'s schema:\n  - ${valid.errors.join("\n  - ")}\nExiting 2 and recording NOTHING -- a verdict that fails its own contract is not a judgment about the change, and writing the mechanical verdict in its place would launder an approve the agent never validly gave.` });
    }
    const judged = valid.value;
    const wrongDelivery = verdictIdentityMismatch(judged, { ticket, version });
    if (wrongDelivery.length) {
      return emit({ code: 2, payload: { ok: false, exitCode: 2, kind: "cannot-run", identity_errors: wrongDelivery },
        prose: `verifier: the agent's verdict is not about this delivery:\n  - ${wrongDelivery.join("\n  - ")}\nExiting 2 and recording NOTHING -- a stale or foreign verdict file passes the schema perfectly, and runner_verdicts is exactly the row nobody re-derives later.` });
    }
    stored.note = [stored.note, truncationNote(valid.truncations)].filter(Boolean).join(" ");
    return recordJudgedVerdict({ stored, agentVerdict: judged, truncations: valid.truncations, intentSlug: rows.intentSlug, cycleId, ticket, version, dryRun, supabaseUrl, supabaseKey });
  }

  const gateResults = {};
  const gateDetail = {};
  const gateFails = {};
  for (const gate of GATES) {
    const r = runGate(gate, repoRoot);
    gateResults[gate.key] = r.status;
    gateDetail[gate.key] = r.detail;
    if (r.fails) gateFails[gate.key] = r.fails;
  }

  // ---- FEATURE: AGT-170 -- THE REGRESSION GATE'S STATUS BECOMES THE DELTA'S. -------------------
  //
  // ONLY WHAT "REGRESSION GREEN" MEANS CHANGES, and everything downstream is deliberately untouched:
  // `verdictFor` still approves iff all three gates are green, `verdictRowFor` still writes the three
  // statuses into their own columns, and `ck_runner_verdicts_fail_closed` still refuses an approve
  // that is not all-green. The delta decides ONE of the three inputs; it does not soften the rule
  // that reads them. A ship with a newly red test, a red build or a red tripwire blocks exactly as
  // before.
  //
  // THE ABSOLUTE ANSWER IS NEVER OVERWRITTEN, only re-graded beside itself: `regression_absolute`
  // carries what the suite's exit code actually said, `gateDetail.regression` keeps its `exit 1 --
  // [FAIL] ...` tail and gains the delta line, and both lists reach `--json`. A reader who wants to
  // know whether the suite passed can still find out; what they can no longer do is read a red the
  // delivery did not cause as this delivery's red.
  const baselineRead = readRegressionBaseline(regressionBaselinePath);
  const regressionAbsolute = gateResults.regression;
  //
  // AGT-170 SLICE 2: `unverified` rides in beside `baseline`. Both come off the SAME read of the SAME
  // file, so the two lists cannot describe different baselines -- the defect
  // `scripts/baseline-red-set.js`'s header records, applied one level down.
  const delta = regressionDelta({
    absolute: regressionAbsolute,
    baseline: baselineRead.names,
    post: gateFails.regression ?? null,
    unverified: baselineRead.unverified,
  });
  gateResults.regression = delta.status;
  gateDetail.regression = `${gateDetail.regression} | delta: ${delta.standing === null ? "not graded" : delta.standing.length} standing, ` +
    `${delta.newlyRed === null ? "not graded" : delta.newlyRed.length} newly red` +
    `${delta.newlyRed && delta.newlyRed.length ? ` [${delta.newlyRed.join(", ")}]` : ""}` +
    // Slice 2: the third count, and it is NAMED rather than counted alone for the same reason the newly
    // red list is -- this line is what a later reader sees, and "1 unverified" with no name sends them
    // back to re-run the suite to find out which. Silent when the count is 0 or nothing was graded, so a
    // full-run baseline's detail line is byte-identical to slice 1's.
    `${delta.unverifiedInBaseline && delta.unverifiedInBaseline.length ? `, ${delta.unverifiedInBaseline.length} unverified in baseline [${delta.unverifiedInBaseline.join(", ")}]` : ""}` +
    ` -- ${delta.reason}`;

  let { verdict, reasoning } = verdictFor(gateResults);

  // FEATURE: SES-376 -- an over-cap kickoff BLOCKS the delivery it belongs to, not just the draft.
  //
  // WHY BOTH ENDS. The step-6 `--check-kickoff` branch above refuses the kickoff at the moment it is
  // written; this refuses a DELIVERY whose kickoff is over cap, which is the case where step 6 was
  // skipped, bypassed, or the kickoff was edited after it passed. The gate half can only be trusted
  // if the ship half cannot be reached around it.
  //
  // ONE DIRECTION ONLY, like every other rule in this file: it can turn approve into block, never
  // block into approve. `reasoning` is PREPENDED rather than replaced -- the red gate that was
  // already the reason is still the reason, and an over-cap kickoff must not erase it from the row.
  //
  // DELIBERATELY INERT AS SHIPPED, and named so nobody reads the silence as a bug: runbook step 7a
  // does not yet pass `--kickoff=`, so `kickoffPath` is empty on every production run and this block
  // does nothing. Arming it is an attended edit to the runbook (card 1d57ebca). The code lands first
  // so that arming it is one line in a doc rather than a code change nobody wants to make under time
  // pressure at the ship point.
  //
  // An UNREADABLE kickoff leaves the finding null here rather than blocking: `readCapped()` below
  // already puts `[UNREADABLE: ...]` into the agent's evidence, where the judgment can see it and
  // act, and manufacturing a cap block out of a missing file would report the wrong defect.
  let kickoffOverCap = null;
  if (kickoffPath) {
    try { kickoffOverCap = kickoffCapFinding(fs.readFileSync(path.resolve(repoRoot, kickoffPath), "utf8")); }
    catch { kickoffOverCap = null; }
  }
  if (kickoffOverCap) {
    verdict = "block";
    reasoning = kickoffOverCap.reason + " | " + reasoning;
  }

  // FEATURE: SES-359 -- the delivery half of the lane declaration, computed exactly as the cap
  // finding above is and for the same reason: the draft check can only be trusted if the ship
  // cannot be reached around it. Same one direction (approve -> block, never the reverse), same
  // PREPEND rather than replace (a red gate stays the reason it already was), and the same inertness
  // as shipped -- it fires only once a caller passes `--kickoff=`, which task 2 of this ticket adds
  // to the attended runbook line and card 1d57ebca still owes step 7a.
  let kickoffNoLanes = null;
  if (kickoffPath) {
    try { kickoffNoLanes = kickoffLaneFinding(fs.readFileSync(path.resolve(repoRoot, kickoffPath), "utf8")); }
    catch { kickoffNoLanes = null; }
  }
  if (kickoffNoLanes) {
    verdict = "block";
    reasoning = kickoffNoLanes.reason + " | " + reasoning;
  }

  // FEATURE: AGT-174 -- THE STATE RENDER SAYS WHEN IT IS PUBLISHING THE PREVIOUS SHIP. NON-GATING.
  //
  // THE MEASURED GAP. `scripts/render-claude-state.js` filters the ledger on `push_sha IS NOT NULL`
  // and takes no cycle argument, so a close-out that renders BEFORE writing its own `push_sha` to
  // `runner_cycles` renders a ledger it is not in: the file's top row is the PREVIOUS ship, and
  // CLAUDE-STATE.md publishes that as the version in dev. Live on this tree: `034876e5~1`'s line 4
  // names v7.0.619 / `3c489041` while the cycle writing it was `f4e24696` (v7.0.618). The ordering
  // that avoids it is already written down (runner-cycle.md:2928-2929 and :3253-3254) -- what was
  // missing was anything that NOTICED when it had been missed. This is that.
  //
  // IT IS REPORTED, NEVER ENFORCED, AND THAT IS THE TICKET'S OWN CONSTRAINT, not a soft start. This
  // block assigns nothing to the mechanical lane's two outputs: no branch below may turn this
  // finding into a block. The renderer keeps exactly ONE deliberate exit 2 (a body that lost the
  // standing-brief link, John's fail-closed condition on gated card 37b22393), and a second way to
  // refuse -- here or there -- would wedge EVERY close-out on the platform behind a lag the cycle
  // cannot fix from inside its own render. Compare the two blocks above, which DO block: the
  // difference is deliberate and the guard
  // (tests/regression/agt-174-state-render-self.test.mjs) asserts it against this file's source,
  // with the `kickoffNoLanes` block above as its positive control.
  //
  // NO SPAWN, NO WRITE. `renderingCycleFinding` is a pure function over text already on disk, so
  // importing it does not make this script a script that writes to the tree -- the property the
  // header calls the one most likely to be eroded. UNREADABLE stays null: the file is absent on a
  // fresh clone before the first render, and manufacturing a finding out of a missing file would
  // report the wrong defect (the same reasoning the kickoff blocks above give for their catch).
  // `!cycleId` is NOT MEASURED rather than clean, and `prose` below says so in words.
  let stateRenderCycle = null;
  try {
    stateRenderCycle = renderingCycleFinding(
      fs.readFileSync(path.join(repoRoot, "CLAUDE-STATE.md"), "utf8"), cycleId);
  } catch {
    stateRenderCycle = null;
  }

  // FEATURE: AGT-199 -- THE STATE RENDER SAYS WHEN ITS BULLET WAS WRITTEN BEFORE ITS SHIP CARD. NON-GATING.
  //
  // THE MEASURED GAP, and it is a DIFFERENT one from AGT-174 above rather than a second reading of it.
  // Step 7a renders CLAUDE-STATE.md (`runner-cycle.md:3024-3029`); step 9 files the ship card
  // (`:4007-4010`); nothing re-renders after. `renderBullet` prints the card's `plain_after` and
  // `plain_worth`, so a render that runs before the card exists commits the bare ticket line and the
  // briefing John judges from (`docs/ARCHITECTURE.md` §19v) never gains the card's sentence. Live, 2 of
  // tonight's 5 close-outs: `git show ed368c9d:CLAUDE-STATE.md` line 12 is the bare `` **`AGT-194`**. ``
  // committed 06:17:12Z while that cycle's card `ab5bcbb4` was created 06:17:49Z; `f8fc2c91` line 12 is the
  // same for `AGT-195`. The block above is blind to it BY CONSTRUCTION: it reads only the ledger pin, and
  // on both of those files the pin is right -- `renderingCycleFinding` returns null on exactly the renders
  // whose bullets are card-less. The predicate that sees it is the render itself, which is why this block
  // reads the cycle row and its ship card and hands both to `renderBullet`'s own comparison.
  //
  // REPORTED, NEVER ENFORCED, on AGT-174's precedent and its reason: this block assigns nothing to the
  // mechanical lane's two outputs, and no branch below may turn this finding into a block. At 7a the card
  // is not yet filed, so this line reads *card-missing* on every honest cycle and says so in those words
  // -- a line that only appeared on a finding would leave its reader unable to tell the ordering from a
  // build of the verifier that does not look. The guard
  // (tests/regression/agt-199-ship-card-render.test.mjs) asserts the non-gating property against this
  // file's source with the `kickoffNoLanes` block above as its positive control.
  //
  // NOT MEASURED IS NEVER CLEAN, and the note says which kind: no cycle id, no credentials, a ledger read
  // that failed or returned no row, or a CLAUDE-STATE.md this process could not read (absent on a fresh
  // clone before the first render). Each is a reason this could not be checked, not evidence that it is
  // fine -- the same distinction the block above draws for `!cycleId`.
  let stateRenderCard = null;
  let stateRenderCardNote = "";
  if (!cycleId) {
    stateRenderCardNote = "not measured (no --cycle-id)";
  } else if (!supabaseUrl || !supabaseKey) {
    stateRenderCardNote = "not measured (no credentials)";
  } else {
    const cardCycleQ = `runner_cycles?select=id,started_at,trigger,model,version,item_id,push_sha&id=eq.${encodeURIComponent(cycleId)}&limit=1`;
    const cardShipQ = `runner_items?select=backlog_id,cycle_id,title,plain_after,plain_worth&kind=eq.ship&cycle_id=eq.${encodeURIComponent(cycleId)}&order=created_at.desc&limit=1`;
    const cr = await rest(supabaseUrl, supabaseKey, cardCycleQ);
    const kr = await rest(supabaseUrl, supabaseKey, cardShipQ);
    const cardCycleRow = ((cr && cr.rows) || [])[0] || null;
    if (cr && cr.error) stateRenderCardNote = `not measured (ledger read failed: ${cr.error})`;
    else if (kr && kr.error) stateRenderCardNote = `not measured (ledger read failed: ${kr.error})`;
    else if (!cardCycleRow) stateRenderCardNote = `not measured (ledger read failed: no runner_cycles row for ${String(cycleId).slice(0, 8)})`;
    else {
      try {
        stateRenderCard = shipCardFinding(
          fs.readFileSync(path.join(repoRoot, "CLAUDE-STATE.md"), "utf8"),
          cardCycleRow, ((kr && kr.rows) || [])[0] || null);
      } catch {
        stateRenderCard = null;
        stateRenderCardNote = "not measured (CLAUDE-STATE.md unreadable)";
      }
      if (!stateRenderCard && !stateRenderCardNote) {
        stateRenderCardNote = "the committed bullet is a byte-exact render of the ship card that exists";
      }
    }
  }

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
  // AGT-185: the pair, derived from the row above and from nothing else, so the verdict can print
  // what it graded against. `null` files/tasks when the row was not read -- see classCapPair().
  const capPair = classCapPair(classAutonomy);

  const base = arg("base", "origin/dev");
  // FEATURE: SES-379 -- THE RESOLUTION SEAM, and the only place `[]` becomes `null`. See
  // resolveDeliveryFiles() for why it may not live one level down in selfCertificationBlock().
  const gitChangedFiles = changedFilesFor(repoRoot, base);
  const changedFilesArg = arg("changed-files", null);
  const explicitRead = changedFilesArg
    ? readChangedFilesFile(path.resolve(repoRoot, changedFilesArg))
    : null;
  const changedFiles = resolveDeliveryFiles({
    explicit: explicitRead ? explicitRead.files : null,
    gitList: gitChangedFiles,
  });
  // Stored in auto_done_reason because the ledger is the only place this survives, and a verdict
  // that blocked on "could not be read" is unactionable without knowing which half was empty.
  const changedFileSource = explicitRead
    ? (explicitRead.source === "UNREADABLE"
        ? `UNREADABLE (${changedFilesArg}: ${explicitRead.detail})`
        : `builder list, ${changedFiles ? changedFiles.length : 0} paths`)
    : (gitChangedFiles === null
        ? "UNREADABLE (git could not answer)"
        : `git diff vs ${base}, ${gitChangedFiles.length} paths`);
  // FEATURE: SES-345 -- read ONCE, here, beside the diff the gates were run against, and carried from
  // this point into every lane. Both judged lanes read it back out of the context file rather than
  // calling this again: see recordJudgedVerdict()'s note on why a second read is a different fact.
  const gradedSha = gradedShaFor(repoRoot);

  // AGT-194: read ONCE, here, beside the sha it is about, and carried from this point into the prose,
  // the --json payload and BOTH judge lanes. NOTHING below may turn it into a gate -- see
  // ciConclusionFinding()'s header for why a CI read that could flip a verdict re-grades every ship
  // on the platform at once.
  const ciConclusion = ciConclusionFinding({
    gradedSha,
    rows: await ciConclusionFor(supabaseUrl, supabaseKey, gradedSha),
  });

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
  const autoDoneReason = elig.reason + lookupNote + primeNote + ladderNote + skillNote +
    ` (changed-file source: ${changedFileSource})`;

  const detailLine = GATES.map(g => `${g.label}=${gateResults[g.key]} [${gateDetail[g.key]}]`).join("\n  ");
  const prose =
    `verifier verdict: ${verdict.toUpperCase()}${ticket ? ` on ${ticket}` : ""}${version ? ` (${version})` : ""}\n` +
    `  ${detailLine}\n` +
    `  ${reasoning}\n` +
    `  graded sha: ${gradedSha ?? "UNREADABLE"}\n` +
    `  auto-done eligible: ${elig.eligible ? "YES" : "no"} -- ${autoDoneReason}\n` +
    // AGT-185: one line, ALWAYS printed, never part of the verdict -- the file/task pair this ship
    // was measured against, or the sentence saying nobody looked it up. Never a silent 3/4.
    `  SCOPE PAIR: ${capPair.files === null
      ? "not graded -- class_autonomy's extras were not read this run, so this verdict asserts no cap"
      : `${capPair.files} files / ${capPair.tasks} tasks${capPair.note}`}\n` +
    // AGT-174: one line, always printed, never part of the verdict. The three cases are different
    // facts and read differently: the lag with its remedy, "pins this cycle" (the ordering held),
    // and "not measured" (nobody passed a cycle id, so nothing could be checked).
    `  CLAUDE-STATE: ${stateRenderCycle ? stateRenderCycle.reason
      : cycleId ? "pins this cycle as the newest pushed row"
      : "not measured (no --cycle-id)"}\n` +
    // AGT-199: one line, ALWAYS printed, never part of the verdict -- a sibling fact to the line above
    // and not a restatement of it: that one says WHOSE ship this file publishes, this one says whether
    // the bullet it published was written before that cycle's ship card existed. The clean case and each
    // not-measured kind are stated in words, in `stateRenderCardNote`.
    `  CLAUDE-STATE CARD: ${stateRenderCard ? stateRenderCard.reason : stateRenderCardNote}\n` +
    // AGT-194: one line, ALWAYS printed, never part of the verdict. The clean case is stated in
    // words too -- a line that appeared only on a finding would leave its reader unable to tell
    // "CI graded this sha green" from "this build of the verifier does not look".
    `  CI CONCLUSION: ${ciConclusion ? `[${ciConclusion.clause}] ${ciConclusion.reason}`
      : "every blocking CI job for this sha concluded success"}`;

  const payload = {
    ok: verdict === "approve",
    exitCode: verdict === "approve" ? 0 : 1,
    verdict, gates: gateResults, gateDetail, reasoning,
    // SES-345: UNLIKE the reported-only keys below, this one IS stored in its own column -- the
    // handoff's fourth row needs a join key to `runner_cycles.push_sha`, and free text in
    // `auto_done_reason` is not joinable.
    graded_sha: gradedSha,
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
    // AGT-185: the pair the row above resolves to -- { files, tasks, note }, files/tasks null when
    // the row was not read. Reported, never stored in its own column and no migration: AGT-174's
    // precedent, AGT-170's convention. Derived ONLY from `class_autonomy` beside it, so a reader
    // can check it against that row instead of trusting this key.
    class_cap_pair: capPair,
    // SES-376: null when the kickoff is within cap or none was passed; the finding object when it
    // is over. Reported, never stored in its own column -- it reaches the ledger through `reasoning`
    // above, which the block already prepended it to.
    kickoff_over_cap: kickoffOverCap,
    // SES-359: same shape, same reasons -- null when the kickoff declares its lanes or none was
    // passed, the finding object when it does not. Reported, never stored in its own column.
    kickoff_no_lanes: kickoffNoLanes,
    // AGT-174: the finding object when this render publishes someone else's ship, null when it pins
    // this cycle OR when no cycle id was passed (`prose` above keeps those two apart in words).
    // Reported, never stored in its own column and no migration -- AGT-170's convention above.
    state_render_cycle: stateRenderCycle,
    // AGT-199: the finding object when the committed bullet was rendered before this cycle's ship card
    // existed (or disagrees with it), null when the bullet is a byte-exact render of a card that does
    // exist OR when it could not be measured (`prose` above keeps those apart in words). Reported, never
    // stored in its own column and no migration -- AGT-174's precedent, AGT-170's convention.
    state_render_card: stateRenderCard,
    // AGT-194: the finding object when this sha has no CI conclusion of its own, null when every
    // blocking job succeeded. Reported, never stored in its own column and NO MIGRATION -- AGT-174's
    // precedent and AGT-170's convention; the fact reaches the ledger through `reasoning` nowhere and
    // through this key only, because it is not a judgment about the change.
    ci_conclusion: ciConclusion,
    // AGT-170: the delta's five facts, reported and never stored in their own columns -- the
    // Designer's recorded call (JOHN-0925-DESIGNER-DECIDES): no new `runner_verdicts` column and no
    // migration, the lists ride `--json` and `gateDetail`. `gates.regression` above is the GRADED
    // status; `regression_absolute` is what the suite's own exit code said, so the two can be
    // compared by whoever reads the row instead of being one value that lost its history.
    //
    // THE FAILING LIST IS QUOTED FROM THE GRADER, WHICH IS THE POINT OF PUBLISHING IT. The subset
    // claim was decided against `regression_fails` and `regression_baseline_source`; a reader who
    // re-ran the suite to check it would be grading a different instant -- the same reasoning
    // SES-403's header gives for never re-running the gates during a re-grade.
    regression_absolute: regressionAbsolute,
    regression_standing: delta.standing,
    regression_newly_red: delta.newlyRed,
    // AGT-170 slice 2: the third list, published for the same reason as the other two -- a block whose
    // reason says a test was never verified must let its reader check WHICH, from the grader that made
    // the call rather than from a second run of a different instant. Null on every fail-closed exit and
    // on a baseline that declared a full run; never stored in its own column (no migration, no
    // `runner_verdicts` column -- the Designer's recorded call, JOHN-0925-DESIGNER-DECIDES).
    regression_unverified_in_baseline: delta.unverifiedInBaseline,
    regression_fails: gateFails.regression ?? null,
    regression_baseline_source: baselineRead.source,
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
      // SES-345: given to BOTH judge lanes, same key, same content, for the reason
      // `code_eligibility` below records -- and it is the value pass two writes to the row, so the
      // sha the agent was shown is provably the sha the ledger records.
      graded_sha: gradedSha,
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
      // SES-376: the agent sees the cap finding beside the kickoff text, so it can see that the
      // mechanical lane already blocked on size rather than having to re-measure to agree. Given to
      // BOTH judge lanes for the reason `code_eligibility` above records: the same evidence key
      // carrying less content in one lane than the other is the lane-shaped difference this file's
      // own SES-337 note calls out as a defect.
      kickoff_over_cap: kickoffOverCap,
      // SES-359: given to BOTH judge lanes, for the reason the key above records -- the same
      // evidence carrying less content in one lane than the other is the lane-shaped difference
      // this file's own SES-337 note calls out as a defect.
      kickoff_no_lanes: kickoffNoLanes,
      // AGT-174: given to BOTH judge lanes, same key, same content, for the reason
      // `code_eligibility` above records -- the same evidence key carrying less content in one lane
      // than the other is the lane-shaped difference this file's SES-337 note calls out as a defect.
      state_render_cycle: stateRenderCycle,
      // AGT-199: given to BOTH judge lanes, same key, same content, for the reason
      // `code_eligibility` above records -- the same evidence key carrying less content in one lane
      // than the other is the lane-shaped difference this file's SES-337 note calls out as a defect.
      state_render_card: stateRenderCard,
      // AGT-194: given to BOTH judge lanes, same key, same content, for the reason
      // `code_eligibility` above records -- the same evidence key carrying less content in one lane
      // than the other is the lane-shaped difference this file's SES-337 note calls out as a defect.
      ci_conclusion: ciConclusion,
      diff: diffFor(repoRoot, base),
      // SES-344: the delivery's own account of itself, in both halves -- the commit bodies between
      // base and HEAD, and the cycle row's notes. Given to BOTH judge lanes, same key, same content,
      // for the reason `code_eligibility` above records.
      ship_report: {
        commit_messages: shipReportFor(repoRoot, base),
        cycle_notes: await cycleNotesFor(supabaseUrl, supabaseKey, cycleId),
      },
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
      graded_sha: gradedSha,              // SES-345 -- see the session lane's note above.
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
      kickoff_over_cap: kickoffOverCap,   // SES-376 -- see the session lane's note above.
      kickoff_no_lanes: kickoffNoLanes,   // SES-359 -- same.
      state_render_cycle: stateRenderCycle,  // AGT-174 -- see the session lane's note above.
      state_render_card: stateRenderCard,    // AGT-199 -- same: BOTH lanes, same key, same content.
      ci_conclusion: ciConclusion,        // AGT-194 -- same: BOTH lanes, same key, same content.
      diff: diffFor(repoRoot, base),
      ship_report: {                      // SES-344 -- see the session lane's note above.
        commit_messages: shipReportFor(repoRoot, base),
        cycle_notes: await cycleNotesFor(supabaseUrl, supabaseKey, cycleId),
      },
    };
    const call = await callExecutor({ intentSlug: rows.intentSlug, taskContext: judgeCtx, tenant: arg("tenant", "global") });
    if (call.error) {
      return emit({ code: 2, payload: { ...payload, recorded: false, error: call.error },
        prose: `${prose}\n  the capability executor could not be reached: ${call.error}\n  Exiting 2 -- no verdict. (--judge=executor is an unproven path; --judge=none is the degrade.)` });
    }
    // SES-343: the same severity model as the session lane above -- one rule for both judged lanes,
    // so an executor verdict and a session verdict cannot be graded by two different contracts.
    const valid = validateAgentVerdict(rows.schema, call.verdict, { truncate: true });
    if (!valid.ok) {
      return emit({ code: 2, payload: { ok: false, exitCode: 2, kind: "cannot-run", schema_errors: valid.errors },
        prose: `${prose}\n  the executor's verdict does not satisfy Intent "${rows.intentSlug}"'s schema:\n  - ${valid.errors.join("\n  - ")}\n  Exiting 2, recording nothing.` });
    }
    const judged = valid.value;
    const wrongDelivery = verdictIdentityMismatch(judged, { ticket, version });
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
      backlog_id: ticket, version: version || null, graded_sha: gradedSha,   // SES-345
      gates: gateResults, gate_detail: gateDetail,
      mechanical: { verdict, reasoning }, epic_name: epicName, priority_class: priorityClass,
      code_eligibility: { ...elig, reason: autoDoneReason },
      note: `--judge=executor; trace ${call.traceId ?? "(none returned)"}; api cost ${cost.usd === null ? `UNKNOWN (${cost.note})` : `$${cost.usd}`}`,
    };
    stored.note = [stored.note, truncationNote(valid.truncations)].filter(Boolean).join(" ");
    return recordJudgedVerdict({ stored, agentVerdict: judged, truncations: valid.truncations, intentSlug: rows.intentSlug, cycleId, ticket, version, dryRun, supabaseUrl, supabaseKey });
  }

  if (dryRun) {
    return emit({ code: payload.exitCode, payload: { ...payload, recorded: false }, prose: prose + "\n  --dry-run: nothing recorded." });
  }

  const ins = await insertVerdict({
    supabaseUrl, supabaseKey, cycleId, ticket, version, verdict, gateResults,
    reasoning: `${reasoning}\nGates: ${detailLine.replace(/\n\s+/g, " | ")}`,
    eligible: elig.eligible, autoDoneReason, epicName, priorityClass, gradedSha,
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
