# SES-359 — Attended sessions design and build through the Designer and the Builder: the Designer's reasoning, harvested

<!-- DeepBench v7.0.462 | docs/harvests/SES-359.md | Written by the Designer (design-kickoff, unattended cycle 64ac63af-0882-444e-95dd-bc0b7aef4fc2, 2026-09-12). This is the overflow the kickoff docs/kickoffs/v7.0.462-SES-359-*.md links once from §1 and never requires. The build does not read this file; every fact a task depends on is in the kickoff. The ticket's original full text is above this section in the same file when the two are merged; move, never delete. -->

## Premise revalidation (measured 2026-09-12, live Supabase + this clone at origin/dev)

- **Log rows by governance agent** (`ai_activity_log` joined to `agents` on `agent_id`, `lane = 'governance'`): The Designer (`GV-04`) **2** rows, The Builder (`GV-05`) **1** row, all `call_source = 'session'`, all 2026-09-09 (the SES-331 first-run fixtures). Nothing since — although 12 kickoffs have been written by unattended cycles in between. By contrast The Prioritizer has 568 `session` rows and The Researcher 9. The two agents this ticket is about are the two nobody logs.
- **Why the unattended path is silent too:** `grep -c "agent-log.js" docs/runbooks/runner-cycle.md` is **0**. Steps 6 and 7 run `scripts/agent-prompt.js` sub-agents (lines 2682-2691, 2802-2810) and never write the row `docs/runbooks/session-setup.md` §3f calls "mandatory, not a courtesy". Same mechanism, same missing line, so it is folded in as task 5 rather than filed: the ticket's own QA ("a Designer and a Builder log row") would otherwise be satisfiable only by attended sessions while the cycles kept running unlogged.
- **`kickoff_link` has moved since the ticket was filed.** `backlog_items` with `status in ('done','delivered')` and `updated_at >= 2026-09-08`: 12 rows carry a link (`LOG-149`, `SES-360`, `SES-354`, `SES-352`, `SES-353`, `SES-373`, `AGT-69`, `SES-374`, `SES-367`, `SES-376`, `SES-371` — unattended — and `AGT-80`, attended 2026-09-12, hand-written); 22 rows do not, among them the attended ships `SES-347`, `SES-355`, `SES-368`. The ticket's "0 of the tickets done since 2026-09-08" is stale; the attended-path premise (no assembled kickoff, no log row) holds.
- **Verdict rows and shas.** Attended ships now have supervised cycle rows with `push_sha` (`SES-368` → `90e38cb5`, `SES-355` → `c87062bb`, `SES-374` → `9000e368`, `AGT-80` → `f262d1d1`) and `runner_verdicts` rows (all `block`, self-certifying paths). `runner_verdicts` has **no sha column** (`id, created_at, cycle_id, backlog_id, version, verdict, gate_build, gate_regression, gate_hygiene, reasoning, auto_done_eligible, auto_done_reason, epic_name, priority_class, ladder_applied_at`); the verdict-to-ship join key is `SES-345`'s (open, `kickoff_link NULL`) and is not built here.
- **`--kickoff=` reaches the verifier on the unattended path only:** `runner-cycle.md:2869` passes it since the SES-376 second half; `session-setup.md:449-450` (§3e, the attended verifier call) does not. Task 2(d).
- **Lane declarations already exist informally:** `v7.0.454-SES-360` (labelled "SES-359's declaration"), `v7.0.457-SES-367`, `v7.0.459-SES-376` carry a `Lanes` line; `v7.0.447`, `448`, `455`, `456`, `458`, `460`, `461` do not. Nothing checks for it: `--check-kickoff` measures bytes only (`verifier.js:1094-1102`).
- **The regex was run against the real files before it was written into the kickoff:** SES-360 / SES-367 / SES-376 → `null`; SES-368 / SES-347 → finding. SES-360's line reads "`executor` — none, $0." — four non-word characters between `executor` and `none`, which is why the executor-none pattern allows `\W{0,8}`.
- **An "undeclared executor call" cannot be read off the log today.** `lib/request-context.js:78`: `ALLOWED_CALL_SOURCES = ui, script, regression, session-test, session, mcp` — there is no executor value, zero rows have one, and a runner-driven API call would land as the inferred `script`, indistinguishable from a maintenance script. `ai_activity_log` has no cycle column; `agent-log.js` puts `--cycle` into `visitor_id` on purpose (its header, §19k signature). The Verifier's log cross-check therefore needs a labelling ticket first (see residue) and is a declared remainder, not a task.
- **Live `ds-kickoff-intent`:** schema `required` is the nine keys (`backlog_id, premise, kickoff_path, kickoff_markdown, files, tasks, model, qa_discriminator, harvest_markdown`); no `lanes`; method carries steps (1)–(6). `agents.designer` and `agents.builder` are `is_active = true`, `lane = 'governance'`.
- `backlog_items.SES-359`: `status open`, `kickoff_link NULL`, `design_status NULL`. Premise alive.

## The scope split, and which side each piece falls on

**Buildable by an unattended cycle (the kickoff's eight tasks):** `scripts/verifier.js` (self-certifying path — refuses auto-done, does not refuse the build), `docs/runbooks/session-setup.md` (its body was moved out of `.claude/` by `SES-121` for exactly this), `CLAUDE-DESIGN.md` (repo root; not one of the four harness files — `ARCHITECTURE.md:2615-2616` names `api/capabilities/execute.js`, `api/prompt/db-assembly.js`, `ai-enrichment.js`, `request-receivable.js`), `docs/STANDARDS.md`, `docs/runbooks/runner-cycle.md`, `docs/SELFBUILD-RETIREMENT-LEDGER.md`, two test files. No task writes under `.claude/` (register B39): the `.claude/skills/session-setup/SKILL.md` loader is untouched. No Supabase write at all.

**Gated (held for a session John attends; SES-376 precedent, decision `42e8442d` form):** `ds-kickoff-intent`'s schema and method, and `docs/design/ga-agents-seed.sql` lines 85-90 with them — `.claude/rules/agent-roster-inert.md` last bullet and `runner-cycle.md:4312-4313`; rung 22 buys nothing there. SES-376 also held its runbook edit, but only because arming a refusal whose counterpart instruction was gated would wedge the runner; task 5's log line has no Skill-row counterpart, so it ships.

**Exact text for the attended session (so it can be pasted, not re-derived):**

- `traits.schema.properties.lanes`: `{"type":"array","minItems":1,"items":{"type":"object","required":["lane","reason"],"properties":{"lane":{"enum":["session","executor","none"]},"reason":{"type":"string","maxLength":200},"dollar_band":{"type":["string","null"]}}}}`; add `"lanes"` to `required`.
- `method`, appended after step (6): *(7) LANES (SES-359): declare in `lanes` and on one `Lanes:` line in the SESSION section the lane of every model call the build will make — session (subscription) | executor (API dollars, with dollar_band) | none — each with one line of reason; `node scripts/verifier.js --check-kickoff` refuses a kickoff without the line.*
- Seed: the same two edits on the `ds-kickoff-intent` INSERT; one `record_decision(... 'directive', 'SES-359' ...)` with a `runner_before_images` row per Skill row, as `runner-cycle.md` 3318-3346.

## Governing architecture

- §19b (capabilities as data): the lane rule is a property of the kickoff's shape and of the Intent row (gated half); the check in `verifier.js` reads a file, never an agent id. §19k: every Layer-3 execution logs — the log line is the ticket's centre, and `agent-log.js` writes through `logActivity()`.
- Rule #1 (§19d/§19e): the runbooks name `--agent=designer` / `--agent=builder` as operator commands, which `session-setup.md` §3f already does for `researcher`; no data row written by this ticket names another agent.
- §19v: `scripts/verifier.js` is in `SELF_CERTIFYING_PATHS`, so the verdict refuses the auto-done bar by design; the kickoff's §7 says so.

## Alternatives weighed

1. **A new `check-session-docs.js` check, as the ticket's QA words it.** Rejected: its gating set is closed at 9/10/11 (`SES-199`, header) and a non-gating WARN is not a refusal. The refusal the ticket wants now has a natural home the ticket predates by two days — `--check-kickoff` (SES-376, 2026-09-12) — and the verdict path's `--kickoff=` block, which the runbook already arms.
2. **The Verifier's executor cross-check now.** Rejected for want of a data shape (above). Doing it "inert as shipped" a second time in two days would be a check whose QA cannot fail.
3. **Exempt SES-368 inside the lane check versus retargeting `ses-376`'s clause (C).** Retarget: clause (C) proves placement ahead of the credential check and needs any within-cap, lane-declared file; this ticket's own kickoff is the honest fixture and SES-368 stays in clause (A) for the byte count.
4. **Reconcile STANDARDS.md §3's "11 sections" with the seven-section shape while adding the lane line.** Rejected as scope: `SES-76-kickoff-dryrun-rule.js:180` pins `11. Write kickoff doc with all 11 required sections` in `CLAUDE-DESIGN.md`, so the reconciliation is a two-doc, one-test change of its own (the drift SES-376's harvest already named).
5. **Session-lane default written into the Skill row instead of the docs.** Gated; the docs carry the wording now and the row inherits it byte-identically when John's session lands it — the SES-376 order.

## What this does not do

- It does not write the verdict-row sha (`SES-345`), does not add an executor `call_source`, and does not touch `bd-build-intent` (its method already says "read the kickoff, the ticket row it names and every file it names").
- It does not back-fill `Lanes:` lines into the seven kickoffs without one; the verdict-path block is one-directional and only reaches kickoffs step 7a / §3e hands it from now on.
- It does not change what an attended session may do for a Skill-row edit: the named exception keeps the hand-composed prompt for exactly that case (self-certification, `AGT-67`).

## QA reasoning

The discriminator is the pair on real files with no credentials: `--check-kickoff` on `v7.0.448-SES-368-weekly-pace-gate.md` exits 0 today (`within 8192`, measured this cycle) and 1 after (`kickoff-no-lanes`), while `v7.0.459-SES-376-kickoff-size-cap.md` exits 0 both times. The docs half is a count that cannot be faked by prose: `agent-log.js` occurrences in `runner-cycle.md` go 0 → 2. This kickoff is 8,162 bytes, carries its own `Lanes:` line, and exits 0 on both checks — the ticket's lane rule run on itself, as SES-376's cap was.

## Residue for the orchestrator (not the build's)

- File a row: *an executor call made for a runner cycle labels itself (`call_source = 'executor'` in `lib/request-context.js`'s allowlist) and stamps the cycle id in `visitor_id`*, so the Verifier's "undeclared executor call" refusal has a query to stand on. It is the prerequisite for the half of SES-359 this cycle could not build.
- The `STANDARDS.md` §3 "11 sections" versus seven-section drift (SES-376 residue) is still unfiled by title; it now also blocks any tidier wording of `CLAUDE-DESIGN.md` item 11.
- The gated card for the `lanes` schema + method step (7) + seed carries the exact text above. Decide the card on filing (SES-373 / the SES-376 lesson: an undecided `gated_before_build` row reddens `ses-285` assertion 6 and `ses-373` assertion 1).
- `SES-345` is the dependency for the last of the ticket's four rows (the verdict's sha); nothing here pre-empts it.
