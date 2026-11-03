<!-- DeepBench v7.0.942 | docs/runbooks/session-decisions.md | AGT-460 — THE CUT. `session-setup.md` reached 900 lines, which is a file every session is told to read FIRST and before any orientation read, so its length was a tax on every single session this repo runs. This file is the half that is not the procedure: §3c (filing a ticket), §3d (recording a decision), §3f (running a governance agent), §3g (the meter reader) and the Reverse handle, MOVED here verbatim rather than rewritten — a summary of a procedure is not a procedure, and the whole point of the move is that nothing was re-typed. The sections KEEP their original numbers: a number that changed would orphan every cross-reference in the repo, and the numbers are what sessions, tests and kickoffs cite. `session-setup.md` is a FLAT sibling of this file, not a parent — it holds steps 1-3b, §3e, steps 4-6 and the Exception, and one line in it points here. Which clause lives where is asserted by `tests/regression/agt-460-session-scripts.test.mjs` arm C. -->

# Session Decisions — Filing, Deciding, Governance Agents, the Meter, and Reversing

The judgment half of a session, moved out of `docs/runbooks/session-setup.md` whole (`AGT-460`,
`v7.0.942`). That file is the procedure a session RUNS — worktree, counters, inflight, push, and now
`scripts/open-session.js` / `scripts/close-session.js`. This file is what a session DECIDES: how a
ticket is filed, how a decision is recorded, how a governance agent is run, where the meter comes
from, and how John reverses any of it. Section numbers are the originals and are deliberately
unchanged.

---

### 3c. File a new backlog ticket — the canonical INSERT (`SES-83` phase (e), 2026-08-21)

Tickets are filed straight into `public.backlog_items` — never into the `FEATURES*.md` stubs.
Claim the `backlog_id` first (step 3b, one block call per prefix), then file with this shape;
every column below is load-bearing:

```sql
INSERT INTO backlog_items
  (backlog_id, tier, type, priority_class, title, description, status, epic_id,
   source_file, session_ref, row_ordinal,
   filed_at, scope_origin, size_stamp, predicted_cycles, defer_status, scope_rationale, milestone,
   enhancement_claim)
SELECT '<PREFIX-N>', '<now|next|later>', '<Type from SCREEN-INVENTORY taxonomy>',
       '<named P-class — REQUIRED at filing, register B9>',
       '<one-line human title — never the class string>',
       '<description; convention opens with the bolded named class>',
       'open',
       (SELECT id FROM epics WHERE name = '<epic name>')::uuid,  -- or NULL for no epic
       'session-<short-session-name>', '<short-session-name> <yyyy-mm-dd>',
       coalesce(max(row_ordinal),0)+1,
       now(),                                   -- filed_at: the created date (never created_at, M5-04)
       '<original|gate-review|john-named|discovered|pre-existing|enhancement|victoria-placed>',   -- scope_origin (FILE-MATRIX)
       '<S|M|L>', <predicted cycles, >= 1>, '<no|maybe|yes>',           -- size_stamp, predicted_cycles, defer_status
       '<scope_rationale: WHY it belongs — "Goal N, <name>: …" — REQUIRED on a Selfbuild ticket, M5-03>',
       '<M0..M7 the ticket serves, or NULL>',                           -- milestone (SES-304)
       '<claim>'         -- outcome claim (SES-309): '<scoreboard column>: up|down' or 'none: <why>' — NULL reads unclaimed
  FROM backlog_items
RETURNING backlog_id, priority_class;
```

- **A Selfbuild ticket declares its outcome claim at filing (`SES-309`, 2026-09-02, `v7.0.390`).**
  `enhancement_claim` is the number the ticket says it will move — one `platform_scoreboard`
  column and a direction, `'<metric>: up|down'` — and the eight metric names are exactly
  `noship_cycles_week`, `noship_tokens_week`, `shipped_cycles_week`, `tokens_per_shipped_cycle`,
  `cycles_per_shipped_ticket`, `cron_silence_hours`, `hygiene_flags`, `questions_to_john_week`
  (`SES-413` slice 4, `v7.0.523` — questions that reached John in the trailing 7 days, target
  zero). **`'none: <why no scoreboard number applies>'` is a valid and honest answer, and most
  chartered work is that kind** — a
  tooling ticket that records state in its own table moves nothing on the board, and saying so on
  the row is the point. `public.outcome_claim_is_valid()` is the check constraint
  (`ck_backlog_outcome_claim`), so a typo or an invented metric name is rejected at filing rather
  than discovered as a silent `unmeasurable` three days later. Leaving it NULL is still legal and
  reads **`unclaimed`** on `public.ticket_outcome` — which is a reviewer-visible filing omission,
  not a verdict.
- **`priority_class` is mandatory at filing** (register B9 — nothing enters the board
  undecided), always the full named form (`P10 - Tooling`), `· FLAGGED` suffix only on
  `P9 - Bug Fixes` pixel-moving fixes.
- **`scope_rationale` is the review bucket's promotion criterion (`M5-03`, `SES-295`, 2026-09-02):**
  a Selfbuild ticket filed on or after 2026-08-21 with no rationale is **never picked** — not by the
  drain, not by the pre-boot gate — until one is written. Name the charter goal it advances
  (`docs/SELFBUILD-CHARTER.md` "Goals"), one or two sentences. The other matrix fields
  (`scope_origin`, `size_stamp`, `predicted_cycles`, `defer_status`) are fail-LOUD (`FILE-MATRIX`):
  a missing one is flagged, not refused. **`scope_origin='enhancement'` is the one exception, and it
  refuses rather than flags (`EL-01`):** an enhancement row missing `scope_rationale`,
  `enhancement_claim` or `predicted_cycles` is **unbuildable** — not picked and not flagged-but-picked
  — enforced in `public.drain_epic_next()` and `public.prime_directive_queue()`
  (`ses283_enhancement_lane`). Note that the lane is shut today and this rule is how to file into it
  correctly when it opens, not an invitation to try: `runner_settings.invention_requires_epic` is
  `true`, so `public.file_invention_proposal()` raises, and `backlog_items` holds exactly **one** row
  with `scope_origin='enhancement'` in its entire history (filed 2026-08-23). `SES-369` and `SES-430`
  own that gate; `AGT-93` only made the filing rule findable and correct.
- **`row_ordinal` is NOT NULL** — omit it and the INSERT fails (found live filing `SES-96`,
  2026-08-21); the `SELECT … max+1` form above handles it.
- **`title` is the human sentence.** Phases (a)/(b) imported the class string into `title` for
  old rows — that is the trap, not the convention.
- **Then run `SELECT public.recompute_backlog_queue();`** — a new classed ticket is a queue
  recompute event (register B4), and without it the ticket has no queue number and is invisible
  to "Next up".
- **AN AUTOMATION TICKET CLAIMS THE TOP OF JOHN'S LANE, AND ONE CALL DOES IT — use it INSTEAD of
  the plain recompute above (`SES-101`, function shipped `v7.0.147`, wired in here `v7.0.203`):**

  ```sql
  SELECT public.claim_automation_lane_top('<PREFIX-N>');
  ```

  John's ruling, question `q-lane-top` answered **yes** 2026-08-21T20:47Z, from his directive
  `48ae1939` line 4: *"if you create more automation tickets keep making them top of queue."* So the
  slot is `min(open lane) − 1`, **never `max + 1`**.

  **This bullet is the half of `SES-101` that sat unfinished for two days, and the reason is worth
  one sentence:** the function has assigned `automation_rank` since `v7.0.147`, but **nothing called
  it at filing time**, so a newly filed automation ticket landed in the class-sorted backlog — the
  exact failure the lane was built to end. Measured when the function shipped: the last three
  automation tickets filed had been hand-assigned to the *bottom* of the lane (`SES-99` = 7,
  `SES-100` = 8, `SES-101` = 9), the opposite of what John answered. It could not be fixed until now
  because this procedure lived under `.claude/`, which an unattended cycle may not write
  (register B39); `SES-121` moved the body here in `v7.0.198`, and this is the first thing that move
  paid for.

  Three properties, so nobody re-derives them: it is **idempotent** (a ticket already at the open
  lane's minimum is left alone, so a second call cannot ratchet it further negative); it **runs the
  queue recompute itself**, which is why it replaces rather than follows the bullet above; and it
  reads the **open** lane only, so `done`/`removed` tickets keep their historical rank (`ADM-1` = 1)
  without competing. A ticket that is **not** automation work takes the plain recompute and nothing
  else — do not call this on an ordinary ticket to "be safe": it would put unrelated work above
  John's own queue.
- **`epic_id` is optional and defaults to no epic.** Look it up by NAME (`epics.name` is
  UNIQUE), never by pasting a uuid. Epic creation is ask-first (John, 2026-08-22) — only
  `Automation` is pre-authorized, so a session that wants a NEW epic asks first rather than
  inserting one.

### 3d. Record a decision — the attended session's own (`SES-286`, `v7.0.395`)

<!-- FEATURE: SES-286 (b) — the attended path calls the decision ledger part (a) built. -->
An attended session makes judgment writes too, and they are the same kind of thing an unattended
cycle's are: **what counts as a decision and what does not is defined once, in
`docs/runbooks/runner-cycle.md` step 7b** — read the list there rather than reasoning from this
page. When this session resolves, defers, re-tiers, re-homes, removes or re-scopes a ticket, rules
a gate or amends a directive, record it in the same transaction as the write:

```sql
DO $$
DECLARE
  v_dec uuid;
  v_img jsonb;
BEGIN
  v_dec := public.record_decision(
    NULL, '<short-session-name>',
    '<kind>',
    '<TICKET-ID or NULL>',
    '<one-sentence summary of what you decided>',
    '<the reasoning — what you read, what you ruled, why>',
    public.ladder_work_class('<the ticket''s priority_class, or NULL>')
  );

  SELECT to_jsonb(b) INTO v_img
    FROM public.backlog_items b WHERE b.backlog_id = '<TICKET-ID>';
  INSERT INTO public.runner_before_images
    (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  VALUES (NULL, '<short-session-name>', 'backlog_items', (v_img->>'id'), v_img, v_dec);  -- pk_value is the row's PRIMARY KEY (the uuid in v_img->>'id'), never the ticket id: reverse_decision() addresses a row by its pk and refuses one it cannot cast (SES-286b follow-up, measured: a ticket-id pk_value reversed nothing and reported refused=1)

  UPDATE public.backlog_items
     SET <the judgment>, updated_at = now()
   WHERE backlog_id = '<TICKET-ID>';
END $$;
```

<!-- FEATURE: SES-004 -->
**The `reasoning` above also names the criteria it relied on, as `pattern:N` tokens** — exactly what
`docs/runbooks/runner-cycle.md` step 7b requires of a cycle's own decisions (`pattern:0` = no
standing pattern applied — new judgment) — and the same trigger on `runner_decisions` stores them
in `public.runner_decision_patterns`, identically for both the attended and unattended path.

- **`cycle_id` NULL, `session_name` set — that is the whole difference from the unattended shape.**
  `record_decision()` raises unless exactly one of the two is present
  (`ck_decision_attribution`), and an attended session is the `session_name` half. Pass the same
  `<short-session-name>` your worktree and inflight file already carry.
- **One transaction, and it is not a style choice.** Step 7b carries the reason in full: `now()` is
  frozen for the length of a transaction, so the decision's `decided_at` and every write it makes
  carry the same stamp — and `reverse_decision()` refuses any row whose live `updated_at` postdates
  that stamp (`SES-316`; it used to compare against the *image's* `created_at`). Split this into two
  statements and `decided_at` lands in the first while the write lands in the second, so the row
  postdates its own decision and the reversal restores nothing — now reported honestly as
  `outcome = 'refused'`, but still an undo that did not happen.
- **Put the handle on the ticket and in your close-out note:**
  `Decision <id> — reversible until <expires_at, CST>: select public.reverse_decision('<id>', 'John', '<why>');`
- Before-images you already wrote without a decision id are adopted rather than re-taken:
  `public.attach_before_images('<decision id>', ARRAY['<image id>']::uuid[])` fills `decision_id`
  only where it is still NULL.
- **`attach_before_images()` REFUSES the whole call if any image names a table
  `reverse_decision()` cannot replay (`SES-399`, `v7.0.502`).** The restorable tables are the
  seventeen `public.reversible_tables()` returns — the twin of `reverse_decision()`'s own
  `k_allowed`, widened 7 → 14 by `SES-364`, to 15 by `AGT-86` slice 1b (`v7.0.543`:
  `audit_findings`, whose ruling band restores and whose INSERT undo the ledger guard refuses —
  read `restored_unverified`, it has no `updated_at`), to 16 by `AGT-152` (`v7.0.597`:
  `model_assignments`) and to 17 by `AGT-240` D8 (`v7.0.662`: `projects`). Name anything else and
  the call raises, **nothing is
  attached, not even the restorable images in the same batch**, and the message lists every
  offending image id with its table. *Why all-or-nothing:* a partial attach would hand you a
  decision whose undo set quietly omits rows — §19v's promise (*"no before-image logged → the
  write does not happen"*) broken one level down, and reported as success. *Why at attach time:*
  the handle you paste into your close-out note above is a promise that a Reverse will restore
  the row, and until this shipped the enumerated attach would write that promise over any table
  at all. If the table genuinely should be restorable, widen `reversible_tables()` **and**
  `reverse_decision()`'s `k_allowed` in the same migration; the tie is asserted once, by the
  migration's own trailing `DO` block, so later drift presents as a loud false refusal here
  rather than as a silent unbacked promise.
- **`record_ship_decision()`'s bulk sweep is deliberately NOT guarded, and do not "fix" that.**
  It adopts the cycle's whole image set through its own
  `UPDATE public.runner_before_images … WHERE cycle_id = … AND decision_id IS NULL`, never
  through `attach_before_images()`, and adopting the ledger rows is intended — its body says so:
  *"the honest report, rather than an undo set that quietly omits rows."* Measured at `SES-399`:
  **43 live decisions carry at least one image outside the fourteen, and 39 of them are
  `kind='ship'`**, so extending the guard to the sweep would refuse nearly every ship. The four
  that are not ships (3 `directive`, 1 `gate`, 9 images over `projects`, `runner_card_asks`,
  `runner_migration_downs`, `runner_model_lanes`) came through the enumerated attach and are
  exactly what the refusal above now stops.

### 3f. Running a governance agent from a session (`SES-331`, `v7.0.426`)

A session may run a governance agent itself — over the database, on subscription tokens — instead of
paying for the executor's API call. Two commands, both credentialed from `runner_secrets` per 1b:

```
node scripts/agent-prompt.js --agent=<agents.id> --capability=<slug> [--intent=<slug>] [--task=<json>]
node scripts/agent-log.js --agent=… --capability=… --model=… --ai-type=… --feature=… \
  --input-tokens=N --output-tokens=N [--latency-ms=N] [--trace=<id>] [--cycle=<runner_cycles.id>]
```

- **Never hand-build the prompt.** `agent-prompt.js` calls `assemblePrompt()` and renders with
  `api/prompt/ai-enrichment.js`'s own `renderSection()` / `assemblePhaseSplit()` — the executor's
  code, not a copy. A session that pastes its own system prompt together is a second assembly, which
  is the drift this whole project exists to end. Paste the script's output into the sub-agent.
- **The model comes from the assembly**, `llm.model` in `--json` — never from memory and never from
  the session's own default. Where the capability names none, take the lane from
  `public.runner_model_lanes`.
- **The log row is mandatory, not a courtesy** (`.claude/rules/capability-logging.md`: every Layer-3
  execution logs, no exceptions — a session is a different runner, not an exemption). `agent-log.js`
  writes it through `logActivity()` with `call_source = 'session'`, exits **2** if the row did not
  land, and prints the `ai_activity_log.id` it read back. `--ai-type` must already be a
  `SERVICE_CATALOG` slug; the script refuses an unknown one rather than inventing it.
- Neither script makes a model call, and `agent-prompt.js` performs no retrieval — a
  fetched-per-call `knowledge` section renders empty and is named on stderr.

#### The two runs every attended session makes (`SES-359`)

§3f says a session *may* run a governance agent. These two it **does**: the design and the build are
The Designer's and The Builder's work in an attended session exactly as they are in an unattended
cycle (`runner-cycle.md` steps 6 and 7), and an attended session that hand-designs or hand-builds is
a second assembly — the drift the bullet above forbids, arriving through the one door nobody watches.
Measured 2026-09-12: `ai_activity_log` held **2** Designer and **1** Builder rows, all 2026-09-09
fixtures, across the 12 kickoffs written since; the attended ships `SES-347`, `SES-355` and `SES-368`
carry `kickoff_link IS NULL`. Both runs are yours, in order:

**(a) The design run — `design-kickoff`, the `judgment` lane.** The command is `runner-cycle.md`
step 6 statement 1's, unchanged, with `cycle_id` set to the **supervised** cycle id you inserted in
§3e (not a new one — the attended cycle row is the one the verdict will hang off):

```
SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node scripts/agent-prompt.js \
  --agent=designer --capability=design-kickoff --intent=ds-kickoff-intent \
  --task='{"ticket":{…},"version":"v<your version>","cycle_id":"<the supervised cycle id>","caps":{"files":N,"tasks":M},"worktree":"<absolute path>"}'
```

Run the rendered prompt as a sub-agent on the `judgment` lane (`runner_model_lanes`, read — never a
literal). Then, on its answer:

```
node scripts/verifier.js --check-kickoff=<the returned kickoff_path>
```

**Before** you save anything. Exit 1 is a named deviation, never a quiet trim — re-assemble, do not
edit the kickoff by hand. On exit 0, write the returned `kickoff_markdown` to the returned
`kickoff_path` and a non-null `harvest_markdown` to `docs/harvests/<ID>.md`, both in **one** commit.
Then ONE write, before-image first, because `SES-112`'s check refuses `designed` without a link:

```sql
DO $$
DECLARE v_dec uuid; v_img jsonb;
BEGIN
  v_dec := public.record_decision(
    NULL, '<session>', 'design-kickoff', '<ID>',
    'Kickoff designed for <ID>', '<what you read and what you ruled>',
    public.ladder_work_class('<the ticket''s priority_class>'));
  SELECT to_jsonb(b) INTO v_img FROM public.backlog_items b WHERE b.backlog_id = '<ID>';
  INSERT INTO public.runner_before_images
    (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
  VALUES (NULL, '<session>', 'backlog_items', (v_img->>'id'), v_img, v_dec);
  UPDATE public.backlog_items
     SET kickoff_link = '<kickoff_path>', design_status = 'designed', updated_at = now()
   WHERE backlog_id = '<ID>';
END $$;
```

Then log the run — mandatory per the bullet above, not a courtesy:

```
node scripts/agent-log.js --agent=designer --capability=design-kickoff --model=<the assembly's llm.model> \
  --ai-type=agent-turn --feature=design-kickoff:ds-kickoff-intent:depth0 \
  --input-tokens=N --output-tokens=N --cycle=<the supervised cycle id> --patterns-applied=<answer.patterns_applied>
```

Exit 2 is a finding: the row did not land, so the run is unattributable and the count above stays
wrong. Fix it; never carry on around it.

**(b) The build run — `build-ticket`, the `orchestrator` lane.** The command is `runner-cycle.md`
step 7 statement 1's, unchanged:

```
SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node scripts/agent-prompt.js \
  --agent=builder --capability=build-ticket --intent=bd-build-intent \
  --task='{"kickoff_path":"docs/kickoffs/…","worktree":"<absolute path>","branch":"<your session branch>","version":"v<your version>","cycle_id":"<the supervised cycle id>","caps":{"files":N,"tasks":M}}'
```

Spawn the rendered prompt via the `Agent` tool with `model` set to the assembly's own `llm.model`
(read it out of `--json`; an omitted `model` inherits this session's and burns the wrong quota), and
prepend the worktree line and the stop-line to it — the same two orientation lines `CLAUDE-DESIGN.md`
Step 5a has always prepended, which are *where* to work and where the job ends, never task content.
On `outcome = 'pushed'`, that `push_sha` is the ship point: write it to your cycle row
(`runner_cycles.push_sha`). On `outcome = 'blocked'`, nothing shipped — do not finish it by hand.
The Builder runs the kickoff's related set, never the full suite (`AGT-391`):
`node tests/regression/run-all.js --only=<the related set>`, credentialed, against the kickoff's
BASELINE block; the full suite runs weekly and before a release (`docs/runbooks/release-to-main.md`). Before the spawn, measure where it can be measured (`AGT-451`): credentialed `node scripts/pre-build-baseline.js --kickoff=<the kickoff path> --out=$S/pre-build-baseline-<the supervised cycle id>.txt`; paste its block into the Builder's opening line; §3e's verifier reads the same file.
Then log this run too:

```
node scripts/agent-log.js --agent=builder --capability=build-ticket --model=<the assembly's llm.model> \
  --ai-type=agent-turn --feature=build-ticket:bd-build-intent:depth0 \
  --input-tokens=N --output-tokens=N --cycle=<the supervised cycle id> --patterns-applied=<answer.patterns_applied>
```

**(c) The one exception, and it is narrow:** a session whose ticket edits the governance agents' own
Skill rows (self-certification, `AGT-67`) may compose its prompt by hand and says so in its SESSION
section. Nothing else qualifies — "the agent was slow", "the ticket is small" and "I already know
what it would say" are the three that have to stay refused for the rule to mean anything.

### 3g. The meter reader — John's machine feeds the pace gate (`SES-374`, `v7.0.455`)

The weekly pace gate (`M5-16`) and the rest wall (`M5-06`) read the freshest
`public.runner_usage_readings` row. The meter was first readable only on John's machine — the Claude
Code CLI's `/usage` under his subscription login — and since `SES-398` the routine reads it itself
(first bullet below). `scripts/read-usage-meter.js` is the machine read, made a scheduled task:

```
node scripts/read-usage-meter.js --dry-run     # parse only, prints the three numbers
node scripts/read-usage-meter.js               # writes one row, source 'meter-reader'
```

- <!-- FEATURE: SES-398 --> **The primary writer is the routine itself: `source = 'routine-self-read'`
  (`SES-398`, `v7.0.489`).** Every fire's first action (`docs/runbooks/routine-prompt.md` step 1)
  runs one pinned `claude -p` call, turns its `rate_limit_event` into one `INSERT` (or one
  `NO_READING <reason>` line, which writes nothing and lands in the cycle row's notes), and only then
  asks `runner_should_boot()` — so a firing routine grades a reading minutes old. `fable_pct` is NULL
  when the call carried no Fable window, never a guess; `judgment_model()` then grades the newest
  same-week reading that does carry one. The laptop task and the GitHub workflow below are unchanged
  and are the backups: they keep the meter fresh between fires and whenever a self-read prints
  `NO_READING`.
- **Credentials are not in `.env.local`** (ruling `d7670e18`, 1b above). They live DPAPI-encrypted at
  `%USERPROFILE%\.deepbench\supabase-meter-reader.dpapi`, readable only by John's account on this
  machine, written once by `node scripts/read-usage-meter.js --store-credentials` with
  `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in the environment (neither value is printed). A session
  running the script by hand with those two variables set uses them instead.
- **Install, once, as John (the task runs only while he is logged on):**

```
copy /Y C:\Projects\deepbench-frontend\scripts\read-usage-meter.js %USERPROFILE%\.deepbench\read-usage-meter.js
schtasks /Create /F /SC MINUTE /MO 30 /TN "DeepBench meter reader" /TR "\"C:\Program Files\nodejs\node.exe\" --no-deprecation %USERPROFILE%\.deepbench\read-usage-meter.js"
```

  **Then lift the power condition — found live at the first install (2026-09-11, a laptop on battery):**
  `schtasks /Create` defaults to *start only on AC power*, so the task sits *Queued* and never runs
  unplugged. One line, PowerShell, as John:

```
powershell -NoProfile -Command "Set-ScheduledTask -TaskName 'DeepBench meter reader' -Settings (New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 5)) | Out-Null; Start-ScheduledTask -TaskName 'DeepBench meter reader'"
```

  Check it: `schtasks /Query /TN "DeepBench meter reader" /V /FO LIST` shows *Last Result: 0*; the
  table gains a `source = 'meter-reader'` row every 30 minutes. Remove it with
  `schtasks /Delete /F /TN "DeepBench meter reader"`.
- **Exit 2 is a finding, never a fake row:** the CLI logged out (`claude auth login` fixes it), the
  output did not parse (the CLI changed its wording — `tests/regression/ses-374-meter-reader.test.mjs`
  pins the 2026-09-11 shape), missing credentials, or a refused insert. A reading older than 2h with
  the task installed means the task is failing; read *Last Result* first.
- **The task runs a COPY under `%USERPROFILE%.deepbench`, never the repo** — found live at the first
  install: the shared checkout sits on `dev-stale-local-do-not-use` and did not carry the script, so
  the task exited 1 (module not found) with no row. The script is self-contained (no repo imports),
  so the copy is the whole install. When `scripts/read-usage-meter.js` changes, re-run the `copy`
  line; `tests/regression/ses-374-meter-reader.test.mjs` guards the repo copy, and a task whose
  copy is stale shows up as *Last Result* ≠ 0 or a parser exit 2, never as a wrong number.

- **The always-on reader (`SES-388`, `v7.0.484`, 2026-09-14, John: "we need to be able to update the
  meter when my computer is off").** `.github/workflows/meter-reader.yml` runs
  `node scripts/read-usage-meter.js --via-headers` every 30 minutes on GitHub, so a sleeping laptop no
  longer means a sleeping runner — three fires refused `meter_stale` on the night of 2026-09-13.
  **It does not install the CLI, and that is measured rather than a preference:** the repository secret
  `CLAUDE_CODE_OAUTH_TOKEN` is minted by `claude setup-token`, and on runner `34864955276` that token
  signs in (`claude auth status` → oauth_token) but `/api/oauth/usage` answers **403
  `oauth_scope_insufficient` (needs `user:profile`)** while `claude -p "/usage"` prints the session cost
  summary instead of the three meter lines. `--via-headers` takes the SAME three numbers off the
  rate-limit headers of two one-token `POST /v1/messages` calls under that same token (runs
  `34864955276` and `34865128090`): `anthropic-ratelimit-unified-5h-utilization` and `-7d-utilization`
  plus both `-reset` epochs on `claude-haiku-4-5-20251001`, and `-7d_oi-utilization` — the Fable week —
  on `claude-fable-5-1`. Two output tokens a reading, no prompt content, nothing logged. The flag is the
  only difference: `--dry-run` and `--json` work in both modes and the default CLI path is unchanged.
- **Which writer wrote a row, and what failure looks like.** A GitHub row is
  `source = 'meter-reader-headers'` with that runner's hostname in `note`; John's machine still writes
  `source = 'meter-reader'`. Both may run — `runner_should_boot()` reads the newest row whatever wrote
  it. A non-zero exit fails the job and GitHub emails it: `no-token` / `headers-refused` means the token
  is missing or expired (re-run `claude setup-token`, replace the secret), and `parse` **names the header
  that went missing** — `tests/regression/ses-374-meter-reader.test.mjs` pins the 2026-09-14 header shape
  beside the 2026-09-11 CLI shape, so a header rename shows up as a red test rather than as a silent
  stream of exit-2s. Trigger it by hand from the Actions tab (`workflow_dispatch`) after any change. A
  cloud routine cannot read `/usage` — measured 2026-09-13 (probe run
  `cse_01XgcrXWKfp2qZ4BokzfrL22`), the cloud harness signs in with a session token — but it CAN be
  the reader <!-- FEATURE: SES-398 -->: measured 2026-09-15 (run `cse_01Xayc1PeKmwhEgJamT6PFuX`,
  Claude Code 2.1.272), a one-line `claude -p --output-format stream-json --verbose` call's
  `rate_limit_event` carries `rate_limit_info.unifiedWindows` — `five_hour` 0.05, `seven_day` 0.63 and,
  on `claude-fable-5-1` only, `seven_day_overage_included` 0.94 — which is the self-read in the first
  bullet; John's laptop Claude Code 2.1.218 emits no such field. The workflow file can
  only be pushed by John (the sessions' PAT lacks the workflow scope), and GitHub schedules only from the
  default branch — so the copy that actually fires is the one on `main`.

---

## Reversing a decision — John's handle (`SES-286`, `v7.0.395` — `M6-02`, `M6-06`)

<!-- FEATURE: SES-286 (b) — the undo is one line, and this is where it is written down. -->
One line, from any session or straight over the Supabase MCP:

```sql
select public.reverse_decision('<decision id>', 'John', '<why>');
```

**What it does.** It restores the rows the decision touched — each from the *oldest* image recorded
under that decision, i.e. the state before the decision touched it, restored in place rather than
re-created; it writes before-images of everything the reversal itself writes; it marks the decision
`reversed` with the actor and the reason; it demotes the work class the decision named (rung −1
floored at 0, streak 0); and it records the reversal as its own `kind = 'reversal'` decision row.

<!-- FEATURE: SES-320 — reversing a finalised ship also undoes the sweep's close. -->
**Reversing a FINALISED SHIP decision undoes the close the window sweep wrote, in the same restore
(`SES-320`, `v7.0.412`).** The sweep's `done` write carries a before-image under the ship decision's
OWN id, so the close is part of that one decision's undo set rather than a second decision for the
same delivery: the ticket comes back out of `done` to the state its **oldest** image under that
decision records — which is what it held **before the ship**, not `delivered` — and the
`REVERT-FORWARD REQUESTED` directive is queued exactly as before. Measured on a rolled-back fixture
at that ship: `outcome = applied`, `restored = 1`, `refused_written_since = 0`, ticket `done` →
`open`, one directive queued. **This works only because the sweep's close does not bump
`updated_at`** — it runs 72 hours after `decided_at`, so a bump would make the guard below refuse
the ticket on its own ship's Reverse.

**Read the counts, not just the outcome.** It returns `outcome`, `restored`,
`restored_unverified`, `refused`, `refused_written_since`, `demoted`, `reversal_id` and a `reason`
sentence. A row outside the allowlist of tables a decision may legitimately have changed, and a row
without a single-column primary key, are counted `refused` and left alone — and `outcome` can still
read `applied`, in which case the `reason` sentence says *"read the counts, not the outcome"* itself.
`restored_unverified` is a table with no `updated_at` column: the row was written, and the doubt is
reported rather than hidden.

<!-- FEATURE: SES-316 — the third outcome, and the counter that explains it. -->
**`outcome = 'partial'` means some rows were written after the decision and were left alone — read
`refused_written_since`** (`SES-316`). That counter is kept apart from `refused` because it means
something different: `refused` says *"that row was never this decision's to undo"*, while
`refused_written_since` says *"your undo did not happen to this row"*. The three outcomes are
exact — **`applied`** (nothing was written since), **`partial`** (something was, and something was
still restored: the decision IS marked reversed and the rung DOES demote), and **`refused`** (something
was, and *nothing* was restored: the decision is **not** marked reversed, no rung moves, and no
reversal row is left behind, so you can decide whether the later write or the undo should win and
call it again).

**Where the ids are.** The standing brief's *Open decisions* block is the page to read — it lands
in `SES-286` part (c) (`v7.0.396`, the *Open decisions* block of `docs/runbooks/standing-brief.md`); the same list is one query:

```sql
SELECT id, decided_at, kind, backlog_id, summary, expires_at
  FROM public.runner_decisions WHERE status = 'open' ORDER BY expires_at;
```

**It works inside the window and after it.** A decision already `final` still reverses, and a late
reversal still demotes — silence buys the promotion, it does not buy immunity. The one thing it
refuses is reversing a reversal: undoing one would re-apply the decision it undid, which is a new
decision and gets recorded as one, with its own window.

---
