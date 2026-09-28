<!-- DeepBench v7.0.236 | runbooks/standing-brief.md | SES-177 (b) — THE DERIVABLE HALF OF THIS FILE IS
     NOW A GENERATED BLOCK, and the judgment paragraph below it is untouched. Part (a) (v7.0.228, the
     stamp beneath this one) named this remainder and REFUSED it, correctly: extracting the census /
     drain state / scheduler settings back OUT of that paragraph is a surgical edit on prose that
     interleaves them with judgment. That refusal stands. This ship does not extract anything — it
     renders the live facts into a marked block ABOVE the paragraph.
     WHY IT COULD NOT WAIT, measured live 2026-08-24T23:2xZ rather than argued: every derivable number
     in the paragraph had drifted — open 561 -> 581, numbered 561 -> 591, rows 611 -> 670, designed
     16 -> 15, needs-desktop 0 -> 2, needs-john 1 -> 9, NULL 546 -> 549, drain 11-of-18 -> 3-of-10 —
     and ONE of them was not merely stale but operationally wrong: the paragraph says the scheduler
     runs every 3 hours (12/3/6/9 on John's clock) and runner_settings.interval_hours had been 1 since
     22:03Z that day. Every session reads that sentence at start, so a quiet night read from it is read
     from a false premise. A hand-maintained second home for a table's fact is the exact defect class
     SES-177 was filed against, reproduced inside the file part (a) created.
     THE GUARANTEE AN EDITOR MUST NOT WEAKEN: scripts/render-standing-brief.js may only change bytes
     BETWEEN the two markers, and it asserts that rather than intending it — it splices, then compares
     head and tail byte-for-byte with what it read and exits 2 writing nothing on any difference. It
     also refuses before any network call if the "**Next session:**" sentinel is gone. The v7.0.197
     briefing wipe (a rebuild from a source not covering the whole file, publishing a skeleton over
     real content) is therefore unreachable here, not merely guarded against.
     NO TIMESTAMP IN THE BLOCK, following export-backlog-snapshot.js rather than inventing a second
     convention: provenance is a payload sha256, so a ship that moved no board fact rewrites nothing
     and --check stays meaningful. Guarded by tests/regression/SES-177b-standing-brief-block.js. -->
<!-- DeepBench v7.0.228 | runbooks/standing-brief.md | SES-177 — THE STANDING BRIEF, split out of
     CLAUDE-STATE.md on John's decision (gated card 37b22393, Accept, 2026-08-24): "derivable facts are
     generated from tables; the standing 'Next session' JUDGMENT PROSE moves VERBATIM to the new
     docs/runbooks/standing-brief.md, and the generated CLAUDE-STATE.md links to it. Nothing is dropped
     and nothing is hand-copied."
     WHY THIS FILE EXISTS RATHER THAN A RENDERER SECTION, and it is the whole reason the ticket was gated
     before it was built: this prose was 7,715 of CLAUDE-STATE.md's 14,489 chars — 53% of the file — and
     NO TABLE HOLDS IT. A renderer built to the ticket's original letter would have regenerated from
     sources covering 43% and destroyed the rest, which is the v7.0.197 briefing failure exactly (a
     rebuild from an incomplete source published the skeleton and wiped what was not in it).
     THE BLOCK BELOW WAS MOVED BYTE-FOR-BYTE. It is not a summary, not a rewrite, and must not be
     "tidied" into one. Its sha256 at the move is recorded in docs/SESSIONS.md under this version, and
     tests/regression/SES-177-claude-state-renderer.js fails if CLAUDE-STATE.md ever loses its link to
     this file — the fail-closed condition John asked for in the same sentence. -->

# DeepBench — Standing Brief

> Read this at session start, alongside `CLAUDE-STATE.md`. That file now carries only what is derived
> from tables (current version, prior version, the last three sessions). Everything below is standing
> judgment context — board census, drain state, automation-lane rules, scheduler settings and the
> standing filing rules — and is maintained by hand, deliberately.

<!-- BEGIN GENERATED — scripts/render-standing-brief.js — do not hand-edit inside this block -->
## Live board state — generated, do not hand-edit — *as of 2026-09-28 08:00Z (Sep 28, 3:00 AM CST)*

> Rendered from the tables by `scripts/render-standing-brief.js` at every ship. **Every number below is derived; nothing here is maintained by hand.** The judgment prose beneath this block is the opposite — hand-maintained, deliberately, and this script never writes outside these markers. Where the two disagree about a number, this block is right and the sentence below is stale: say so rather than reconciling them by hand.

**Board census** — *as of 2026-09-28 08:00Z (Sep 28, 3:00 AM CST).* **691 open tickets**, 666 numbered, **25 open-but-unnumbered**, 1000 rows total.

| `status` | rows | share of board |
|---|---:|---:|
| `open` | 513 | 51.3% |
| `done` | 254 | 25.4% |
| `delivered` | 84 | 8.4% |
| `removed` | 55 | 5.5% |
| `partial` | 48 | 4.8% |
| `removal proposed` | 46 | 4.6% |

**`design_status` among OPEN tickets** — *as of 2026-09-28 08:00Z (Sep 28, 3:00 AM CST).* Reads for selection (`SES-114`); `NULL` is *not* `auto`, it is not-yet-triaged and no cycle may backfill it.

| `design_status` | open rows | selection effect |
|---|---:|---|
| `NULL` | 609 | full ceremony — not yet triaged |
| `needs-decision` | 37 | — |
| `designed` | 29 | **not a skip** — build from `kickoff_link` (step 6 fast path) |
| `needs-desktop` | 14 | skipped, `record_skip()` — needs a session John attends (B39) |
| `auto` | 1 | full ceremony |
| `needs-john` | 1 | skipped, `record_skip()` — John decides on a card |

**Scheduler and automation settings** — *as of 2026-09-28 08:00Z (Sep 28, 3:00 AM CST).* §2b of the briefing, John's own switches, binding via `scheduler_gate()` at step 1b:

- Scheduler: **on**, every **1 hour** on John's clock grid (America/Chicago hours divisible by the interval — `SES-151`, DST-proof).
- Cron minute **40**, manual-fire tolerance **±10 min** (a start outside it is treated as a manual fire and is never paced).
- Standing daily max: **196M tokens**. This is rung 3 of five, **below** the 48h stale floor: a standing number must not defeat the staleness brake.

**Standing epic drain** — *as of 2026-09-28 08:00Z (Sep 28, 3:00 AM CST).* Created only by John; the runner may read one, never write one (`drain_epic_next()` property 5). The finish line is drawn from the members he **named** (`runner_drain_scope`), never the live `now` tier (`SES-142`) — and within that list it is the members a milestone **gate ruled required** (`milestone_required`, `SES-310`) whenever the list carries such a ruling, every named member otherwise.

- **No drain standing.** Selection is the class-sorted board exactly as it is with no drain declared.

**Proposed projects** — *as of 2026-09-28 08:00Z (Sep 28, 3:00 AM CST).* A project whose batch finished proposes the next one (`AGT-240`): The Auditor grades what it built, The Development Manager proposes ONE project with its tickets and why. Its tickets are normal backlog rows the runner does not pick until you say yes. **0 proposed.**

- **None** — a measured none: no finished batch has proposed a project.

**Open decisions** — *as of 2026-09-28 08:00Z (Sep 28, 3:00 AM CST).* Decisions made under `M6-02` that are still inside their reversal window (`runner_settings.reversal_window_hours` = 72h). Silence finalises them; to reverse one, run the line beside it (`docs/runbooks/session-setup.md` § Reversing a decision).

- `33ccb39e` · reversal · `AGT-136` · reversal of design-ruling decision 6cceb721-f763-4239-9913-545684738751 -- applied: 1 restored, 0 restored-unverified,… · finalises Sep 28, 2:29 AM CST · `select public.reverse_decision('33ccb39e-15fe-4ba0-b00d-7159cf9930df','John','<why>');`
- `cf078adf` · ticket-status · `AGT-109` · AGT-109 partial -> delivered: settle-ship misread its kickoff. · finalises Sep 28, 9:51 AM CST · `select public.reverse_decision('cf078adf-54b3-4382-9419-1533970b0a1f','John','<why>');`
- `6dea3a9a` · classification · — · board ordered: 1 ticket(s) given an automation_rank · finalises Sep 28, 10:48 AM CST · `select public.reverse_decision('6dea3a9a-f1f2-41bb-9139-4ba0ea580e45','John','<why>');`
- `aa048a00` · hygiene · `AGT-79` · Ticket Owner: 14 derivable cell fix(es) on 12 row(s) — cost 5 · claim 9 · type 0 · finalises Sep 28, 10:58 AM CST · `select public.reverse_decision('aa048a00-d819-44c3-8266-0285c5412bd8','John','<why>');`
- `4324bbb2` · re-scope · — · Created project Security (planned, priority 7) and moved 8 security-type tickets into it: AGT-98, AGT-130, DAT-9, DAT-2… · finalises Sep 28, 10:58 AM CST · `select public.reverse_decision('4324bbb2-ca32-42d1-968b-51f4e6c14f8e','John','<why>');`
- `a763fca4` · ticket-scope · `AGT-128` · AGT-128 premise revalidated alive and its kickoff accepted: design_status designed, kickoff_link set to the v7.0.586 ki… · finalises Sep 28, 11:12 AM CST · `select public.reverse_decision('a763fca4-02fa-4dab-a489-0281e8bac98f','John','<why>');`
- `32091fdb` · re-scope · — · Created executing projects Dev Manager Capabilities (priority 2) and Agent Training (priority 3), shifted lower project… · finalises Sep 28, 11:26 AM CST · `select public.reverse_decision('32091fdb-fc44-4d54-9973-e927562d950b','John','<why>');`
- `f6044e9a` · re-scope · — · Pinned queue order AGT-129, AGT-131, AGT-137 so the pick honors project priority (Auditor Enhancements 1, Dev Manager C… · finalises Sep 28, 11:26 AM CST · `select public.reverse_decision('f6044e9a-a49a-4f1d-b738-d36eed66dcd2','John','<why>');`
- `75f90774` · directive · — · Hired Nathan Laan (MK-06, Product Marketing Manager): agents.is_active false -> true, on John's hire word. · finalises Sep 28, 11:45 AM CST · `select public.reverse_decision('75f90774-7550-403c-a86a-bc52a5d4b41e','John','<why>');`
- `1524aa89` · ticket-scope · `AGT-129` · AGT-129 premise revalidated alive and its kickoff accepted: design_status designed, kickoff_link set to the v7.0.587 ki… · finalises Sep 28, 12:00 PM CST · `select public.reverse_decision('1524aa89-6563-433b-9634-3ef6d979c449','John','<why>');`
- `34bb7ed0` · ticket-status · `AGT-129` · Close-out: AGT-129 settles 'partial' · finalises Sep 28, 12:31 PM CST · `select public.reverse_decision('34bb7ed0-4d93-47b4-b7fc-2547f4cb29e8','John','<why>');`
- `904d4e02` · ticket-status · `AGT-129` · AGT-129 corrected from partial to delivered: settle-ship read a conditional that never fired, which is the very defect… · finalises Sep 28, 12:32 PM CST · `select public.reverse_decision('904d4e02-644a-459a-8397-fc2ef374071f','John','<why>');`
- `4e2493fc` · design-kickoff · `AGT-142` · Kickoff designed for AGT-142 · finalises Sep 28, 1:37 PM CST · `select public.reverse_decision('4e2493fc-7482-47cf-adbc-9275ec0c97ed','John','<why>');`
- `1632c363` · design-kickoff · `AGT-143` · Kickoff designed for AGT-143; prose strip split to AGT-147 · finalises Sep 28, 1:46 PM CST · `select public.reverse_decision('1632c363-42c2-495d-b38a-f59d1e22e92b','John','<why>');`
- `55363b7e` · ship · `AGT-142` · AGT-142 delivered at 3a6ef707 (verifier block on standing reds) · finalises Sep 28, 2:01 PM CST · `select public.reverse_decision('55363b7e-acef-4e14-805b-250057d553a5','John','<why>');`
- `ae827412` · design-kickoff · `AGT-144` · Kickoff designed for AGT-144; trial runner split to AGT-148 · finalises Sep 28, 2:02 PM CST · `select public.reverse_decision('ae827412-6c18-4654-a3c9-6bda8633d7cd','John','<why>');`
- `60486619` · design-kickoff · `AGT-147` · Kickoff designed for AGT-147; three-doc remainder split to AGT-149 · finalises Sep 28, 2:10 PM CST · `select public.reverse_decision('60486619-4874-4eac-85e1-ad7caa69f5ba','John','<why>');`
- `5eac431e` · design-kickoff · `AGT-145` · Kickoff designed for AGT-145: attended routine pin sync with plan/verify/record/undo and a pending-sync record · finalises Sep 28, 2:10 PM CST · `select public.reverse_decision('5eac431e-20cf-463d-b815-1b575bf4dbdb','John','<why>');`
- `9382564d` · design-kickoff · `AGT-148` · Kickoff designed for AGT-148 (recorded-turn replay); AGT-144 harvest step 2 amended; driver split to AGT-150; build/orc… · finalises Sep 28, 2:12 PM CST · `select public.reverse_decision('9382564d-ee88-4818-b0a9-2ace03279a7b','John','<why>');`
- `8a47b82c` · ship · `AGT-143` · AGT-143 delivered at 97386afb (verifier block on standing reds) · finalises Sep 28, 2:20 PM CST · `select public.reverse_decision('8a47b82c-4855-48a7-a099-7723a6faefd8','John','<why>');`
- `b343342c` · design-kickoff · `AGT-146` · Kickoff designed for AGT-146; attended session will create two routines from the one block to keep John's approved Frid… · finalises Sep 28, 2:20 PM CST · `select public.reverse_decision('b343342c-8a41-4c5f-97b8-71e3ff99ad8d','John','<why>');`
- `09edc466` · learning · `SES-159` · class-loop learning claims for P3 - Investor Value · finalises Sep 28, 2:25 PM CST · `select public.reverse_decision('09edc466-cfdb-499f-bff4-7de7f0885a7e','John','<why>');`
- `dca8d972` · agent-row · `AGT-144` · AGT-144: the Development Manager gains the model-assignment capability — 3 Skills (2 Intent, 1 Knowledge), 1 capability… · finalises Sep 28, 2:32 PM CST · `select public.reverse_decision('dca8d972-e010-4539-a6d4-02cbb28c4fde','John','<why>');`
- `a72c08d1` · ship · `AGT-144` · AGT-144 delivered at d245dce7 (verifier block); defects filed as AGT-152 · finalises Sep 28, 2:48 PM CST · `select public.reverse_decision('a72c08d1-ed1e-4e93-b9f0-518c34788145','John','<why>');`
- `57576a9c` · ship · `AGT-148` · AGT-148 delivered at 815be48e (verifier block on standing reds) · finalises Sep 28, 3:16 PM CST · `select public.reverse_decision('57576a9c-bfa8-4eb6-bbdd-5199641b9f1f','John','<why>');`
- `c5682083` · design-kickoff · `AGT-153` · Kickoff designed for AGT-153: zero-dependency read-only IMAP client · finalises Sep 28, 3:16 PM CST · `select public.reverse_decision('c5682083-5633-44d9-ab5e-b8cd346bd4b5','John','<why>');`
- `ad1209ac` · design-kickoff · `AGT-152` · Kickoff designed for AGT-152; test/doc repair split to AGT-157 · finalises Sep 28, 3:16 PM CST · `select public.reverse_decision('ad1209ac-b6a3-43ab-858f-a79f611698a5','John','<why>');`
- `f8488e71` · ticket-status · `AGT-131` · Close-out: AGT-131 settles 'delivered' · finalises Sep 28, 3:20 PM CST · `select public.reverse_decision('f8488e71-3e76-48f2-a985-67bf342045d5','John','<why>');`
- `d71aef1a` · design-kickoff · `AGT-151` · Kickoff designed for AGT-151 (Builder-turn replay as the orchestrator-lane trial); verify-ship split to AGT-158 · finalises Sep 28, 3:25 PM CST · `select public.reverse_decision('d71aef1a-163d-4ee2-b47d-3240977e93d4','John','<why>');`
- `d69db1ec` · ship · `AGT-153` · AGT-153 delivered (verifier block on standing reds, no new red from this change) · finalises Sep 28, 3:44 PM CST · `select public.reverse_decision('d69db1ec-eef1-4e7d-9971-6248c507b49e','John','<why>');`
- `5a9950fc` · ship · `AGT-152` · AGT-152 delivered (verifier block on standing reds, no new red from this change) · finalises Sep 28, 3:44 PM CST · `select public.reverse_decision('5a9950fc-37ae-4729-b8ca-fb28f4c2f4fa','John','<why>');`
- `7c1f795d` · design-kickoff · `AGT-154` · Kickoff designed for AGT-154: career-linkedin-alerts capability on Jerry · finalises Sep 28, 3:44 PM CST · `select public.reverse_decision('7c1f795d-086b-4915-a38e-af3b47f60b29','John','<why>');`
- `d60e404b` · rollback · — · Auto-rollback held: ci-red on fced087 was not reverted (card-only) · finalises Sep 28, 4:00 PM CST · `select public.reverse_decision('d60e404b-54ce-4e6d-beea-e57cd38ff86b','John','<why>');`
- `60cfc0dc` · classification · — · board ordered: 6 ticket(s) given an automation_rank · finalises Sep 29, 1:51 AM CST · `select public.reverse_decision('60cfc0dc-4848-430c-93b7-9dca07f2953d','John','<why>');`
- `ed127bf1` · hygiene · `AGT-79` · Ticket Owner: 1 derivable cell fix(es) on 1 row(s) — cost 1 · claim 0 · type 0 · finalises Sep 29, 1:56 AM CST · `select public.reverse_decision('ed127bf1-cb7f-40c4-8a1c-bd9301265e5e','John','<why>');`
- `f38d0291` · agent-row · `AGT-137` · AGT-137: re-pin dm-knowledge-cycle-card e16c0b75fa29cc58 → f5444ac51be95df0 · finalises Sep 29, 2:14 AM CST · `select public.reverse_decision('f38d0291-2259-4473-a12b-721a2e9d0bea','John','<why>');`
- **25 ticket-status decisions** finalising Sep 29, 2:43 AM CST → Sep 29, 11:45 PM CST · one batch, listed by query rather than one line each: `select id, backlog_id, summary, expires_at from public.runner_decisions where status='open' and kind='ticket-status' order by expires_at;` · reverse any one with `select public.reverse_decision('<id>','John','<why>');`
- `66fdc55d` · rule · `AGT-135` · AGT-135: filed John's seven rulings of 2026-09-25 as governance_rules rows JOHN-0925-* with his verbatim words · finalises Sep 29, 3:24 AM CST · `select public.reverse_decision('66fdc55d-0436-4b2b-89ac-14ab6fe3b205','John','<why>');`
- `69e1947c` · agent-row · `AGT-135` · AGT-135: carried the same rulings into the Designer, Auditor and Researcher Skill rows (ds-guardrails, au-knowledge-hom… · finalises Sep 29, 3:24 AM CST · `select public.reverse_decision('69e1947c-810e-40a8-8ee3-a3c8824eec6f','John','<why>');`
- `59e5e346` · agent-row · `AGT-140` · AGT-140: re-pin dm-knowledge-cycle-card f5444ac51be95df0 → 2ba263050860812c · finalises Sep 29, 4:49 AM CST · `select public.reverse_decision('59e5e346-172d-4117-b404-0185044d48b4','John','<why>');`
- `9d259d44` · design · `AGT-132` · AGT-132's premise is alive and its kickoff is docs/kickoffs/v7.0.605-AGT-132-finding-routes.md — slice 1 of 2, five tas… · finalises Sep 29, 5:11 AM CST · `select public.reverse_decision('9d259d44-903f-4f59-a433-584633243dfc','John','<why>');`
- `6de16905` · agent-row · `AGT-132` · AGT-132: the review intent learns source, type and routing · finalises Sep 29, 5:27 AM CST · `select public.reverse_decision('6de16905-f4c3-485a-93c3-848f18eae937','John','<why>');`
- `01355a51` · learning · `SES-159` · class-loop learning claims for P3 - Investor Value · finalises Sep 29, 5:59 AM CST · `select public.reverse_decision('01355a51-a8fa-4b84-8134-2b94f2cfbe0e','John','<why>');`
- `a905ce0e` · design · `AGT-138` · AGT-138's premise is alive and its kickoff is docs/kickoffs/v7.0.608-AGT-138-researcher-weekly-routine.md — nine tasks… · finalises Sep 29, 6:44 AM CST · `select public.reverse_decision('a905ce0e-9e9c-4e64-a6b3-3cd261a3f573','John','<why>');`
- `2800fb74` · agent-row · `AGT-132` · AGT-132 slice 2: the runner-chain guardrail moves to the run-project Intent · finalises Sep 29, 6:45 AM CST · `select public.reverse_decision('2800fb74-d700-4a95-b04b-cdf403f0f010','John','<why>');`
- `c2318e42` · agent-row · `AGT-138` · AGT-138: re-pin dm-knowledge-cycle-card 2ba263050860812c → 10917f0a49bc2b0b · finalises Sep 29, 6:58 AM CST · `select public.reverse_decision('c2318e42-befa-4787-a78b-1f0a85edbcc5','John','<why>');`
- `2ddefc51` · ticket · `AGT-138` · AGT-138: supersede SES-369 and SES-430 — step 4b's invention pass is retired from the cycle, so the filing gate they de… · finalises Sep 29, 7:07 AM CST · `select public.reverse_decision('2ddefc51-bd0f-4148-b689-2783994fc01e','John','<why>');`
- `736279b4` · agent-row · `AGT-134` · AGT-134: dm-audit-review-intent.method gains the upkeep paragraph — routine-prompt drift is the manager's own ruling, r… · finalises Sep 29, 8:16 AM CST · `select public.reverse_decision('736279b4-9f93-48d1-a573-3e582dc66923','John','<why>');`
- `216358e9` · design · `AGT-136` · AGT-136's premise is alive and its kickoff is docs/kickoffs/v7.0.611-AGT-136-designer-ruling-desk.md — seven tasks over… · finalises Sep 29, 8:29 AM CST · `select public.reverse_decision('216358e9-8c5a-496c-8fb1-fada635870a8','John','<why>');`
- `bfef1549` · agent-row · `AGT-133` · AGT-133: re-pin dm-knowledge-cycle-card 10917f0a49bc2b0b → 18a15447dc340890 · finalises Sep 29, 8:31 AM CST · `select public.reverse_decision('bfef1549-3c68-40b9-8ad4-892a62d6609a','John','<why>');`
- `0638bcf6` · agent-row · `AGT-133` · AGT-133: re-pin dm-knowledge-cycle-card 18a15447dc340890 → cbcbdc90be07ad03 · finalises Sep 29, 8:34 AM CST · `select public.reverse_decision('0638bcf6-aec7-42e8-b31d-f59ef9b93dde','John','<why>');`
- `4de0cfc3` · agent-row · `AGT-133` · AGT-133: re-pin dm-knowledge-cycle-card 18a15447dc340890 → cbcbdc90be07ad03 · finalises Sep 29, 8:44 AM CST · `select public.reverse_decision('4de0cfc3-2f54-4409-8761-861f2fc3a272','John','<why>');`
- `4da5d668` · agent-row · `AGT-133` · AGT-133: re-pin dm-knowledge-cycle-card cbcbdc90be07ad03 → ca71a87ec822eb9a · finalises Sep 29, 8:53 AM CST · `select public.reverse_decision('4da5d668-5637-49ca-9b30-006b631b7077','John','<why>');`
- `486ea564` · mid-build-defect · `AGT-133` · Three defects the Builder found outside AGT-133's scope were CAPTURED as findings, not fixed and not filed as tickets · finalises Sep 29, 9:12 AM CST · `select public.reverse_decision('486ea564-0fd0-4c81-ab19-38868e975caa','John','<why>');`
- `553d4c4f` · ticket · `AGT-116` · Homed AGT-116 (P10 - Tooling) into Agent Training at automation_rank 2, standing in for The Development Manager. · finalises Sep 29, 9:49 AM CST · `select public.reverse_decision('553d4c4f-4222-43d5-9614-27c0d575d4e4','John','<why>');`
- `0457c839` · ticket · `AGT-159` · Filed AGT-159 (P10 - Tooling) into Dev Manager Capabilities, blocked by AGT-133: the backlog review agreed 2026-09-25 a… · finalises Sep 29, 9:54 AM CST · `select public.reverse_decision('0457c839-bbcd-4c03-9a84-fe46fd5ad5f7','John','<why>');`
- `6a59b140` · ticket · `AGT-160` · Filed AGT-160 (P10 - Tooling) into Agent Training: an agreed 2026-09-25 workstream that was never filed. · finalises Sep 29, 9:55 AM CST · `select public.reverse_decision('6a59b140-cf17-48bc-b479-9618c769c97b','John','<why>');`
- `768e9845` · ticket · `AGT-161` · Filed AGT-161 (P10 - Tooling) into Agent Training: an agreed 2026-09-25 workstream that was never filed. · finalises Sep 29, 9:55 AM CST · `select public.reverse_decision('768e9845-c5cf-4de1-9410-d7dc1fa19834','John','<why>');`
- `7c1567d8` · filing · — · Audit review 2026-W39: 75 findings → 20 tickets, 2 not-a-defect, 0 carried, 4 escalated · finalises Sep 29, 3:03 PM CST · `select public.reverse_decision('7c1567d8-3727-404b-b0d4-8cba29c85c0b','John','<why>');`
- `6d04a37d` · filing · — · Audit review 2026-W39: 6 findings → 3 tickets, 0 not-a-defect, 0 carried, 0 escalated · finalises Sep 29, 4:02 PM CST · `select public.reverse_decision('6d04a37d-bf66-426e-bf70-4be8e40d3b12','John','<why>');`
- `ae46811d` · filing · — · Audit review 2026-W39: 6 findings → 2 tickets, 0 not-a-defect, 0 carried, 0 escalated · finalises Sep 29, 5:36 PM CST · `select public.reverse_decision('ae46811d-7230-4c3b-9d89-df5cfa6021e6','John','<why>');`
- `6cd4e798` · filing · — · Audit review 2026-W39: 3 findings → 0 tickets, 0 not-a-defect, 0 carried, 0 escalated · finalises Sep 29, 6:30 PM CST · `select public.reverse_decision('6cd4e798-712d-44a3-a196-196c3992f1bb','John','<why>');`
- `bbfab41e` · filing · — · Audit review 2026-W39: 3 findings → 0 tickets, 0 not-a-defect, 0 carried, 0 escalated · finalises Sep 29, 7:04 PM CST · `select public.reverse_decision('bbfab41e-3bba-4a3c-9326-886c260d9602','John','<why>');`
- `f87fdd2d` · filing · — · Audit review 2026-W39: 3 findings → 0 tickets, 0 not-a-defect, 0 carried, 0 escalated · finalises Sep 29, 7:21 PM CST · `select public.reverse_decision('f87fdd2d-b115-4f95-a69c-1f43a950e185','John','<why>');`
- `b22a122c` · filing · — · Audit review 2026-W39: 6 findings → 2 tickets, 0 not-a-defect, 0 carried, 0 escalated · finalises Sep 29, 8:18 PM CST · `select public.reverse_decision('b22a122c-d21f-4516-ba68-0ca6593cbc1c','John','<why>');`
- `35bf4496` · filing · — · Audit review 2026-W39: 7 findings → 2 tickets, 0 not-a-defect, 0 carried, 0 escalated · finalises Sep 29, 9:05 PM CST · `select public.reverse_decision('35bf4496-cdaa-4ffe-8737-f907626fa7e3','John','<why>');`
- `e37fa37d` · filing · — · Audit review 2026-W39: 5 findings → 0 tickets, 0 not-a-defect, 0 carried, 0 escalated · finalises Sep 29, 9:14 PM CST · `select public.reverse_decision('e37fa37d-3384-43f7-83d9-f6d733f893e4','John','<why>');`
- `0779bff3` · removal-proposal · `AGT-178` · AGT-178 premise is dead: the constraint it is about does not exist, none of the 27 rows is on a live worklist, and a ru… · finalises Sep 29, 9:47 PM CST · `select public.reverse_decision('0779bff3-1b5f-49b1-b808-47093ec0a1cc','John','<why>');`
- `d52b6b85` · agent-row · `AGT-183` · AGT-183: re-pin dm-knowledge-cycle-card ca71a87ec822eb9a → 9894a9f4f1698214 · finalises Sep 29, 10:33 PM CST · `select public.reverse_decision('d52b6b85-c38a-43d7-acec-aac1084637a7','John','<why>');`
- `244aa0d7` · filing · — · Audit review 2026-W39: 15 findings → 6 tickets, 0 not-a-defect, 0 carried, 0 escalated · finalises Sep 29, 10:40 PM CST · `select public.reverse_decision('244aa0d7-d5f3-4ad6-bbea-7b823086add2','John','<why>');`
- `bb2951d6` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=no-calls · finalises Sep 29, 10:50 PM CST · `select public.reverse_decision('bb2951d6-4120-42d3-8465-053932c6b700','John','<why>');`
- `10b12453` · ticket-scope · `AGT-187` · AGT-187 ships part (a) only — the kickoff-green attestation in scripts/verifier.js — and rules part (b)'s fifth staff-w… · finalises Sep 29, 11:02 PM CST · `select public.reverse_decision('10b12453-90be-453e-9691-031a5306a373','John','<why>');`
- `9ed5b106` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · finalises Sep 29, 11:44 PM CST · `select public.reverse_decision('9ed5b106-e976-45c1-9f6f-772dadd2651a','John','<why>');`
- `fe78eba9` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · finalises Sep 29, 11:45 PM CST · `select public.reverse_decision('fe78eba9-d159-4bbd-81b9-db396fa327e0','John','<why>');`
- `f65918c0` · gate · `AGT-191` · Captured, not fixed now: run-project.js refuses its own cycle's claim and blames a peer that does not exist. · finalises Sep 29, 11:54 PM CST · `select public.reverse_decision('f65918c0-5c9a-40a6-abfa-7617441dc1e4','John','<why>');`
- `dcdf9026` · ticket-scope · `AGT-191` · AGT-191 is scoped to three files and four tasks: key the ledger's ship-card map on cycle_id, assert bullet provenance b… · finalises Sep 30, 12:04 AM CST · `select public.reverse_decision('dcdf9026-2506-4981-b567-1919bcb842e5','John','<why>');`
- **46 ticket-status decisions** finalising Sep 30, 12:14 AM CST → Sep 30, 11:59 PM CST · one batch, listed by query rather than one line each: `select id, backlog_id, summary, expires_at from public.runner_decisions where status='open' and kind='ticket-status' order by expires_at;` · reverse any one with `select public.reverse_decision('<id>','John','<why>');`
- **35 resolve decisions** finalising Sep 30, 12:14 AM CST → Sep 30, 11:59 PM CST · one batch, listed by query rather than one line each: `select id, backlog_id, summary, expires_at from public.runner_decisions where status='open' and kind='resolve' order by expires_at;` · reverse any one with `select public.reverse_decision('<id>','John','<why>');`
- `20fdce09` · filing · — · Audit review 2026-W39: 20 findings → 6 tickets, 0 not-a-defect, 0 carried, 1 escalated · finalises Sep 30, 12:23 AM CST · `select public.reverse_decision('20fdce09-e8c3-4fa0-9178-1a5d50d71693','John','<why>');`
- `f91e50d3` · learning · `SES-159` · class-loop learning claims for P3 - Investor Value · finalises Sep 30, 12:43 AM CST · `select public.reverse_decision('f91e50d3-eda6-4b11-9045-2ce31944223f','John','<why>');`
- `94e451d9` · classification · — · board ordered: 40 ticket(s) given an automation_rank · finalises Sep 30, 12:54 AM CST · `select public.reverse_decision('94e451d9-5842-4c64-af66-cfbd96bccb33','John','<why>');`
- `2a648167` · hygiene · `AGT-79` · Ticket Owner: 23 derivable cell fix(es) on 17 row(s) — cost 6 · claim 17 · type 0 · finalises Sep 30, 12:54 AM CST · `select public.reverse_decision('2a648167-8a2d-4761-9cc6-61b458a8a994','John','<why>');`
- `33b26422` · ticket-scope · `AGT-196` · AGT-196 is scoped to the scanner itself — the allowlist reason path, the vercel_bypass capture, a new guard asserting b… · finalises Sep 30, 1:14 AM CST · `select public.reverse_decision('33b26422-8f71-419c-87d2-3410842670f0','John','<why>');`
- `c0834ca4` · learning · `SES-159` · class-loop learning claims for P3 - Investor Value · finalises Sep 30, 1:38 AM CST · `select public.reverse_decision('c0834ca4-578e-4378-a9d3-caf9127902bb','John','<why>');`
- `8354a368` · ticket-scope · `AGT-196` · Corrected the purge counts on the undecided AGT-168 card faca2a75 from measurement: 46 files becomes 42 in three places… · finalises Sep 30, 1:46 AM CST · `select public.reverse_decision('8354a368-2b2f-4db2-a602-b9f9a85e274d','John','<why>');`
- `c6452393` · removal · `AGT-200` · AGT-200 removal proposed: its premise is dead — the missing constraint is a recorded drop by a later migration, not a s… · finalises Sep 30, 1:57 AM CST · `select public.reverse_decision('c6452393-c05b-4ebd-a1ba-1f421663cde8','John','<why>');`
- `fb3a5c02` · filing · — · Audit review 2026-W39: 8 findings → 2 tickets, 0 not-a-defect, 0 carried, 0 escalated · finalises Sep 30, 2:05 AM CST · `select public.reverse_decision('fb3a5c02-8100-4d82-a08e-bb300c65d07e','John','<why>');`
- `a3222898` · ticket-scope · `AGT-199` · AGT-199 ships half (1) only: a pure shipCardFinding() in the renderer, wired non-gating into the verifier, with a guard… · finalises Sep 30, 2:11 AM CST · `select public.reverse_decision('a3222898-1f68-4360-a4e3-fdaad70b1372','John','<why>');`
- `d7beb8cb` · rollback · — · Auto-rollback held: ci-red on 9cbb621 was not reverted (card-only) · finalises Sep 30, 3:00 AM CST · `select public.reverse_decision('d7beb8cb-e54c-4269-9197-ee0302a16ded','John','<why>');`
- **22 agent-row decisions** finalising Sep 30, 3:17 AM CST → Sep 30, 8:57 PM CST · one batch, listed by query rather than one line each: `select id, backlog_id, summary, expires_at from public.runner_decisions where status='open' and kind='agent-row' order by expires_at;` · reverse any one with `select public.reverse_decision('<id>','John','<why>');`
- `66d006e6` · ticket-scope · `AGT-166` · AGT-166 is scoped as slice 1 of a board burn-down: two migrations, the audit's own pagination bug, three guard files, a… · finalises Sep 30, 3:23 AM CST · `select public.reverse_decision('66d006e6-856a-420c-aeab-646b2dad8e32','John','<why>');`
- `929e4c24` · hygiene · — · AGT-166: 546 homeless open/partial rows homed to Backlog Intake by ID prefix · finalises Sep 30, 3:29 AM CST · `select public.reverse_decision('929e4c24-19d1-4e55-a82c-6397e0f64a97','John','<why>');`
- `8aa6bca4` · rollback · — · Auto-rollback held: ci-red on d0dd792 was not reverted (card-only) · finalises Sep 30, 3:43 AM CST · `select public.reverse_decision('8aa6bca4-4e6b-4189-bbf3-bbc3dae3b133','John','<why>');`
- `8f00db55` · filing · — · Audit review 2026-W39: 18 findings → 7 tickets, 0 not-a-defect, 0 carried, 0 escalated · finalises Sep 30, 4:07 AM CST · `select public.reverse_decision('8f00db55-8078-4c0c-a70d-d4c2933a7dd9','John','<why>');`
- `675e8812` · gate · `AGT-171` · Withdrew my own gated_before_build card 19acc2ab: the over-cap refusal it recorded was measured against a draft, and th… · finalises Sep 30, 4:54 AM CST · `select public.reverse_decision('675e8812-5b2b-4281-a5ca-b3b407bbb6ab','John','<why>');`
- `772bb3b8` · ticket-scope · `AGT-166` · Slice 2 of 2 is scoped as the Ticket Owner's thirteenth check plus its batch fence and judge-answer write path — four f… · finalises Sep 30, 5:00 AM CST · `select public.reverse_decision('772bb3b8-960f-43e6-ae8f-93c2fb8f9e1c','John','<why>');`
- `4df45c61` · removal · `SES-378` · SES-378 removed: its 8 slices shipped (v7.0.488 -> v7.0.517) and SES-424 succeeds it by name · finalises Sep 30, 5:00 AM CST · `select public.reverse_decision('4df45c61-649b-4a0a-94e1-baa7dcbe4f69','John','<why>');`
- `fe5a84e1` · governance · `AGT-167` · OD-21 amended: chain_max_noship_streak now bounds the per-chain streak AND lane (c)'s per-ticket fence · finalises Sep 30, 5:01 AM CST · `select public.reverse_decision('fe5a84e1-efc6-4ec6-89be-dc304a0c9e01','John','<why>');`
- `4719da74` · rollback · — · Auto-rollback held: ci-red on c79c273 was not reverted (card-only) · finalises Sep 30, 5:57 AM CST · `select public.reverse_decision('4719da74-386c-4706-aba9-c0a8b77e86be','John','<why>');`
- `543117e3` · ticket-scope · `AGT-179` · AGT-179 is scoped to four tasks: record SES-418's disposition on its own row under one decision, declare the lockstep t… · finalises Sep 30, 6:02 AM CST · `select public.reverse_decision('543117e3-0005-4a5f-8d56-bed95e104c46','John','<why>');`
- `346e12d8` · filing · `AGT-223` · AGT-179 task 4: files the work-quality audit's false ship-summary attribution as its own row -- AGT-179's own "replace… · finalises Sep 30, 6:11 AM CST · `select public.reverse_decision('346e12d8-774f-42f0-a03d-2d965d7e4612','John','<why>');`
- `b9fcb131` · filing · — · Audit review 2026-W39: 26 findings → 9 tickets, 0 not-a-defect, 0 carried, 0 escalated · finalises Sep 30, 6:32 AM CST · `select public.reverse_decision('b9fcb131-8761-4cf4-8055-3d9d29a4a1f7','John','<why>');`
- `78fd1597` · filing · — · Audit review 2026-W39: 7 findings → 2 tickets, 0 not-a-defect, 0 carried, 1 escalated · finalises Sep 30, 6:56 AM CST · `select public.reverse_decision('78fd1597-6165-4854-95f2-d49e6e324606','John','<why>');`
- `0adc9f26` · ticket-scope · `AGT-185` · AGT-185 is scoped to stop the flat 3/4 pair travelling: the numbers never conflicted, so the fix is the runbook's dupli… · finalises Sep 30, 7:06 AM CST · `select public.reverse_decision('0adc9f26-795a-44df-bee9-ba47a020ef8d','John','<why>');`
- `afe09f98` · governance · `AGT-181` · AGT-181: three row corrections under one handle — runner_items 0f29c005 before_after 10,561 -> 10,763 bytes; governance… · finalises Sep 30, 7:14 AM CST · `select public.reverse_decision('afe09f98-cc64-4087-a61f-6a5b1c3221cd','John','<why>');`
- `e0bd5ebe` · filing · — · Audit review 2026-W39: 5 findings → 1 tickets, 0 not-a-defect, 0 carried, 0 escalated · finalises Sep 30, 7:52 AM CST · `select public.reverse_decision('e0bd5ebe-37ab-4fb5-9965-5d6bd29922fd','John','<why>');`
- `bfd04abf` · gate · — · Gate cards ruled by cycle d12643db-499a-40ab-9075-e59b227bf575: 11 card(s) — {"john": 1, "accept": 3, "rework": 5, "ret… · finalises Sep 30, 8:00 AM CST · `select public.reverse_decision('bfd04abf-9413-4a6d-bb61-bb4c63e84868','John','<why>');`
- `acbeb08b` · design-kickoff · `AGT-173` · AGT-173 — kickoff v7.0.652 pinned and design_status set to designed (R3+R4) · finalises Sep 30, 8:16 AM CST · `select public.reverse_decision('acbeb08b-6f01-4376-a53b-89c428e7fabd','John','<why>');`
- `4ac223d0` · ticket-scope · `AGT-188` · AGT-188 is scoped to the two live halves — a cycle identity on the briefing build and a derived tail last_step — with b… · finalises Sep 30, 8:24 AM CST · `select public.reverse_decision('4ac223d0-18d5-4784-960d-66da936b23f4','John','<why>');`
- `ef59daaa` · ticket-scope · `AGT-116` · Inventoried three more live-world-grading regression instances on AGT-116 (SES-177, SES-261, agt-133 arm D) rather than… · finalises Sep 30, 9:41 AM CST · `select public.reverse_decision('ef59daaa-1e35-4910-b746-cbcc779c0221','John','<why>');`
- `f960b347` · removal · `ZFIX-42435609` · Leaked regression fixture removed from the pickable set: ZFIX-42435609 · finalises Sep 30, 10:58 AM CST · `select public.reverse_decision('f960b347-8710-49d6-bec7-2747fe4b4f74','John','<why>');`
- `151cb154` · ticket-scope · `AGT-112` · Recorded a live recurrence of the cycle-card Knowledge drift on AGT-112: two cycles re-pinned the row six minutes apart… · finalises Sep 30, 11:48 AM CST · `select public.reverse_decision('151cb154-06f3-4a9e-b3c3-8fd487cc191b','John','<why>');`
- `89e91a55` · design-kickoff · `AGT-116` · Kickoff designed for AGT-116 · finalises Sep 30, 12:47 PM CST · `select public.reverse_decision('89e91a55-8c1c-45f0-9790-b56acc76ccf5','John','<why>');`
- `4036456d` · filing · — · Audit review 2026-W39: 8 findings → 4 tickets, 0 not-a-defect, 0 carried, 3 escalated · finalises Sep 30, 1:08 PM CST · `select public.reverse_decision('4036456d-cc91-4c0a-8e08-23114198f209','John','<why>');`
- `312cbadd` · ship · `AGT-116` · AGT-116 delivered: the suite gives the same answer three times · finalises Sep 30, 1:38 PM CST · `select public.reverse_decision('312cbadd-b0ea-473e-a882-eb024c112c47','John','<why>');`
- `0fd4999f` · design-kickoff · `AGT-237` · Kickoff designed for AGT-237 · finalises Sep 30, 1:38 PM CST · `select public.reverse_decision('0fd4999f-05e5-4bfa-9221-c5c67fe4bf50','John','<why>');`
- `24672af4` · john-ruling · `AGT-170` · John approves arming AGT-170 delta grading now · finalises Sep 30, 1:48 PM CST · `select public.reverse_decision('24672af4-e969-407f-8207-40eb2503976a','John','<why>');`
- `919ea390` · ship · `AGT-237` · AGT-237 partial: database health readings and gate live; restart is the remainder · finalises Sep 30, 2:13 PM CST · `select public.reverse_decision('919ea390-7c18-44a5-9dfb-3d4cf3afd4de','John','<why>');`
- `ec290251` · design-kickoff · `AGT-170` · Kickoff designed for AGT-170 (arming) · finalises Sep 30, 2:24 PM CST · `select public.reverse_decision('ec290251-63d2-4898-bc79-73622c8c38af','John','<why>');`
- `26846255` · ship · `AGT-170` · AGT-170 done: the regression gate grades the delta, first approve since 2026-09-16 · finalises Sep 30, 2:42 PM CST · `select public.reverse_decision('26846255-ce11-480a-aae3-a227a66aeb4b','John','<why>');`
- `72987cbb` · design-kickoff · `AGT-238` · Kickoff designed for AGT-238 (slice 1 of 2) · finalises Sep 30, 2:42 PM CST · `select public.reverse_decision('72987cbb-d35d-45b4-a479-4908e6b5d423','John','<why>');`
- `901381b1` · design-kickoff · `AGT-239` · Kickoff designed for AGT-239 · finalises Sep 30, 3:06 PM CST · `select public.reverse_decision('901381b1-5e2d-4a94-999c-a7d86ec73f78','John','<why>');`
- `7c42c2c0` · design-kickoff · `AGT-240` · Kickoff designed for AGT-240 · finalises Sep 30, 3:06 PM CST · `select public.reverse_decision('7c42c2c0-0a94-4eab-af7d-64e482b9a0a1','John','<why>');`
- `9b3d7da9` · ship · `AGT-238` · AGT-238 slice 1 shipped: leverage first, tickets only from findings · finalises Sep 30, 3:20 PM CST · `select public.reverse_decision('9b3d7da9-c25a-4492-b948-939c9c990a11','John','<why>');`
- `796f5a2a` · ship · `AGT-239` · AGT-239 done: the Auditor checks outcomes first · finalises Sep 30, 3:36 PM CST · `select public.reverse_decision('796f5a2a-57ae-4fd3-8400-f0f09dcb54ec','John','<why>');`
- `9347b344` · directive · `AGT-240` · AGT-240 (f): 4 epic(s) of executing projects locked; 40 open Auditor Enhancements ticket(s) filed on or after 2026-09-2… · finalises Sep 30, 3:43 PM CST · `select public.reverse_decision('9347b344-ee7e-41a9-b144-1230386ca33f','John','<why>');`
- `33b801dd` · ship · `AGT-240` · AGT-240 done: projects get a finish line · finalises Sep 30, 4:05 PM CST · `select public.reverse_decision('33b801dd-b937-426c-b012-02ebe4ddb4ee','John','<why>');`
- `7ad14901` · home · `AGT-162` · MCP POC tickets get the scope_rationale the pick path requires · finalises Sep 30, 4:14 PM CST · `select public.reverse_decision('7ad14901-0233-42fd-a6f8-e77172b04012','John','<why>');`
- `fbf2572b` · john-ruling · — · Runner hard stop at 98% weekly usage (start cutoff 97) · finalises Sep 30, 4:16 PM CST · `select public.reverse_decision('fbf2572b-580b-4f95-832b-928d81c3ed2e','John','<why>');`
- `0dcf62f0` · leverage · — · AGT-238 leverage first: AGT-167, AGT-232, AGT-169, AGT-245, AGT-226 marked as leverage -- outranks project order · finalises Sep 30, 4:58 PM CST · `select public.reverse_decision('0dcf62f0-1b3f-4cf7-bcad-5168629458ef','John','<why>');`
- `99e4ea56` · rollback · — · Auto-rollback held: ci-red on de695c1 was not reverted (card-only) · finalises Sep 30, 6:02 PM CST · `select public.reverse_decision('99e4ea56-556c-4590-9086-858a70eff0be','John','<why>');`
- `7570ae1d` · leverage · — · AGT-238 leverage first: AGT-169, AGT-232, AGT-226, AGT-245, AGT-147, AGT-133 marked as leverage -- outranks project ord… · finalises Sep 30, 6:11 PM CST · `select public.reverse_decision('7570ae1d-1744-4b9d-82ae-6fcb9fe80fdb','John','<why>');`
- `060b6300` · hygiene · `AGT-79` · Ticket Owner: 31 derivable cell fix(es) on 31 row(s) — cost 5 · claim 1 · type 0 · revalidation 25 · finalises Sep 30, 6:53 PM CST · `select public.reverse_decision('060b6300-1861-4c83-8b9c-7c0bcf64a467','John','<why>');`
- `362c8d98` · governance · `AGT-169` · AGT-169: the Builder's out-of-kickoff defect is CAPTURED, not fixed now; and the half-applied decision 060b6300 is repo… · finalises Sep 30, 7:08 PM CST · `select public.reverse_decision('362c8d98-8b62-4339-b2f5-0dc72b6fecc1','John','<why>');`
- `57be7b53` · rollback · — · Auto-rollback held: ci-red on ba581e5 was not reverted (card-only) · finalises Sep 30, 7:08 PM CST · `select public.reverse_decision('57be7b53-a0d1-4dae-a24a-173009815245','John','<why>');`
- `30858617` · leverage · — · AGT-238 leverage first: AGT-147, AGT-226, AGT-232, AGT-133, AGT-245 marked as leverage -- outranks project order · finalises Sep 30, 7:15 PM CST · `select public.reverse_decision('30858617-6ffd-474f-a5aa-71dc5b2fa95f','John','<why>');`
- `05402051` · rollback · — · Auto-rollback held: ci-red on 8a727d2 was not reverted (card-only) · finalises Sep 30, 8:00 PM CST · `select public.reverse_decision('05402051-016e-458c-a09c-f27715f4a992','John','<why>');`
- `55db565e` · leverage · — · AGT-238 leverage first: AGT-133, AGT-245, AGT-232, AGT-226, AGT-238 marked as leverage -- outranks project order · finalises Sep 30, 8:07 PM CST · `select public.reverse_decision('55db565e-a0da-4980-807b-ef02189eeb3f','John','<why>');`
- `2451a7ba` · rollback · — · Auto-rollback held: ci-red on 9a51f0c was not reverted (card-only) · finalises Sep 30, 8:46 PM CST · `select public.reverse_decision('2451a7ba-a20d-446e-8280-b8f88a1ab404','John','<why>');`
- `8172e01e` · leverage · — · AGT-238 leverage first: AGT-245, AGT-232, AGT-226 marked as leverage -- outranks project order · finalises Sep 30, 8:52 PM CST · `select public.reverse_decision('8172e01e-c9fa-4698-b807-85fb66c0293b','John','<why>');`
- `a72cb5a5` · ship · `AGT-238` · AGT-238 shipped at v7.0.667 (53cb6e77eca0790f65c3e14c131b2af2e7b9c3f5) on verdict d21bc7dd-f148-4a75-972d-ee975250f467 · finalises Sep 30, 9:27 PM CST · `select public.reverse_decision('a72cb5a5-080a-4265-82f8-9dc0afd1467c','John','<why>');`
- `764eee98` · filing · — · Audit review 2026-W40: 28 findings → 3 tickets, 0 not-a-defect, 8 carried, 2 escalated · finalises Sep 30, 9:54 PM CST · `select public.reverse_decision('764eee98-9372-415a-ac4d-cad7a5275f43','John','<why>');`
- `ed2b93d0` · rollback · — · Auto-rollback held: ci-red on d365543 was not reverted (card-only) · finalises Sep 30, 9:59 PM CST · `select public.reverse_decision('ed2b93d0-1ebb-40fd-8936-43a910f15377','John','<why>');`
- `c11b24e4` · leverage · — · AGT-238 leverage first: AGT-226, AGT-166, AGT-237, AGT-150 marked as leverage -- outranks project order · finalises Sep 30, 10:08 PM CST · `select public.reverse_decision('c11b24e4-8928-4ff5-bc3e-27a52bd78de2','John','<why>');`
- `00b93277` · concurrency · — · AGT-238 concurrency from the corpus: 4 project(s) executing in the order auditor-enhancements, dev-manager-capabilities… · finalises Sep 30, 10:08 PM CST · `select public.reverse_decision('00b93277-eecd-4c30-bc13-3b4d39cf9947','John','<why>');`
- `521fe3e3` · leverage · — · AGT-238 leverage first: AGT-232, AGT-237, AGT-149, AGT-160 marked as leverage -- outranks project order · finalises Sep 30, 10:58 PM CST · `select public.reverse_decision('521fe3e3-fb27-416e-b351-523aa14c7efc','John','<why>');`
- `a3350adb` · concurrency · — · AGT-238 concurrency from the corpus: 4 project(s) executing in the order auditor-enhancements, dev-manager-capabilities… · finalises Sep 30, 10:58 PM CST · `select public.reverse_decision('a3350adb-7795-438d-89f0-29886bcff349','John','<why>');`
- `e3aea23a` · rollback · — · Auto-rollback held: ci-red on 837a8a5 was not reverted (card-only) · finalises Sep 30, 11:02 PM CST · `select public.reverse_decision('e3aea23a-288e-4cfb-bf45-a3934d106741','John','<why>');`
- `18e4f399` · filing · — · Audit review 2026-W40: 15 findings → 1 tickets, 0 not-a-defect, 5 carried, 0 escalated · finalises Sep 30, 11:10 PM CST · `select public.reverse_decision('18e4f399-236b-467b-8c2e-23e5f5ae4f4a','John','<why>');`
- `7fbfea6e` · leverage · — · AGT-238 leverage first: AGT-149, AGT-232, AGT-237, AGT-160 marked as leverage -- outranks project order · finalises Sep 30, 11:11 PM CST · `select public.reverse_decision('7fbfea6e-32b6-4783-bb84-82be722beb19','John','<why>');`
- `e00392fc` · concurrency · — · AGT-238 concurrency from the corpus: 3 project(s) executing in the order dev-manager-capabilities, auditor-enhancements… · finalises Sep 30, 11:11 PM CST · `select public.reverse_decision('e00392fc-6726-4c1f-86b4-b481d6480cc5','John','<why>');`
- `c339454a` · leverage · — · AGT-238 leverage first: AGT-160, AGT-237, AGT-157 marked as leverage -- outranks project order · finalises Sep 30, 11:17 PM CST · `select public.reverse_decision('c339454a-3c64-4820-a4fa-e43b52a6dcb3','John','<why>');`
- `19d199b9` · concurrency · — · AGT-238 concurrency from the corpus: 3 project(s) executing in the order dev-manager-capabilities, auditor-enhancements… · finalises Sep 30, 11:17 PM CST · `select public.reverse_decision('19d199b9-4d2e-43b6-b663-2d5a98a2dad7','John','<why>');`
- `3302bacd` · john-ruling · — · Routines run until John says stop: all automatic usage stops off · finalises Sep 30, 11:24 PM CST · `select public.reverse_decision('3302bacd-3ad3-42a0-93f0-92eefb53eaca','John','<why>');`
- `4d01d623` · john-ruling · — · MCP POC back to executing and pinned (John) · finalises Sep 30, 11:28 PM CST · `select public.reverse_decision('4d01d623-f6b6-40a2-924e-048a51ff6047','John','<why>');`
- `c0f010e2` · john-ruling · — · Trainer-Authored Agents set up as design-only: epic, 3 tickets held from the runner, project executing + pinned · finalises Sep 30, 11:33 PM CST · `select public.reverse_decision('c0f010e2-f651-452f-b1c6-3e67dd31704a','John','<why>');`
- `fb41fcd3` · classification · — · board ordered: 15 ticket(s) given an automation_rank · finalises Oct 1, 12:07 AM CST · `select public.reverse_decision('fb41fcd3-9407-420c-9b74-a7078ddb0ead','John','<why>');`
- `2fdf49dc` · hygiene · `AGT-79` · Ticket Owner: 14 derivable cell fix(es) on 12 row(s) — cost 3 · claim 3 · type 0 · revalidation 8 · finalises Oct 1, 12:16 AM CST · `select public.reverse_decision('2fdf49dc-311a-4bb3-b577-baa60b50c863','John','<why>');`
- `e09e4332` · mid-build-defect · `AGT-160` · Mid-build defect on AGT-160: fix-now, both limbs of the test held · finalises Oct 1, 12:20 AM CST · `select public.reverse_decision('e09e4332-9657-4e61-8fee-b549e5ec7c73','John','<why>');`
- `130f4cdc` · leverage · — · AGT-238 leverage first: AGT-166, AGT-237 marked as leverage -- outranks project order · finalises Oct 1, 12:22 AM CST · `select public.reverse_decision('130f4cdc-7b90-4c28-9d2c-de83ce14e45b','John','<why>');`
- `af2c5458` · concurrency · — · AGT-238 concurrency from the corpus: 4 project(s) executing in the order auditor-enhancements, agent-training, dev-mana… · finalises Oct 1, 12:22 AM CST · `select public.reverse_decision('af2c5458-7fbd-490e-9d8e-3900f126aa1f','John','<why>');`
- `15de5935` · ticket-status · `AGT-160` · Close-out: AGT-160 settles 'partial' · finalises Oct 1, 12:30 AM CST · `select public.reverse_decision('15de5935-85a7-49d0-9749-1946b910d8f3','John','<why>');`
- `da7aef15` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · finalises Oct 1, 12:30 AM CST · `select public.reverse_decision('da7aef15-95f8-4038-984b-190ffcbfae84','John','<why>');`
- `400e4e07` · learning · `SES-159` · class-loop learning claims for P3 - Investor Value · finalises Oct 1, 12:37 AM CST · `select public.reverse_decision('400e4e07-62f4-4bfe-a278-85b109c27ab6','John','<why>');`
- `24efe0e6` · ticket-status · `AGT-157` · Close-out: AGT-157 settles 'partial' · finalises Oct 1, 12:43 AM CST · `select public.reverse_decision('24efe0e6-8b37-4004-84b7-201149fab981','John','<why>');`
- `1dcbabaa` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · finalises Oct 1, 12:43 AM CST · `select public.reverse_decision('1dcbabaa-058b-4c83-9e42-7a71a4bbc0c9','John','<why>');`
- `87eb668e` · rollback · — · Auto-rollback held: ci-red on 0c7bc86 was not reverted (card-only) · finalises Oct 1, 12:44 AM CST · `select public.reverse_decision('87eb668e-ca91-4e5f-92d2-b16deee36c61','John','<why>');`
- `f187a23a` · filing · — · Audit review 2026-W40: 15 findings → 0 tickets, 2 not-a-defect, 6 carried, 1 escalated · finalises Oct 1, 12:52 AM CST · `select public.reverse_decision('f187a23a-3f09-4560-9094-4c195045944f','John','<why>');`
- `33d52dba` · learning · `SES-159` · class-loop learning claims for P3 - Investor Value · finalises Oct 1, 12:53 AM CST · `select public.reverse_decision('33d52dba-a55f-4e36-bdfa-010a9ccff10f','John','<why>');`
- `8c10799e` · leverage · — · AGT-238 leverage first: AGT-160, AGT-151, AGT-253 marked as leverage -- outranks project order · finalises Oct 1, 1:01 AM CST · `select public.reverse_decision('8c10799e-2ed9-4210-b7b9-4a2f133a509c','John','<why>');`
- `a8e896a3` · concurrency · — · AGT-238 concurrency from the corpus: 5 project(s) executing in the order auditor-enhancements, agent-training, dev-mana… · finalises Oct 1, 1:01 AM CST · `select public.reverse_decision('a8e896a3-24f4-4b17-84bd-1a3be690b107','John','<why>');`
- `4fb7083a` · hygiene · `AGT-79` · Ticket Owner: 13 derivable cell fix(es) on 13 row(s) — cost 0 · claim 0 · type 0 · revalidation 13 · finalises Oct 1, 1:02 AM CST · `select public.reverse_decision('4fb7083a-750b-4411-8285-750b4e251849','John','<why>');`
- `e6ef36c6` · hygiene · `AGT-79` · Ticket Owner: 25 derivable cell fix(es) on 25 row(s) — cost 0 · claim 0 · type 0 · revalidation 25 · finalises Oct 1, 1:02 AM CST · `select public.reverse_decision('e6ef36c6-248e-4288-a8b7-cee6ea526c7e','John','<why>');`
- `26010c8c` · ticket-status · `AGT-166` · Close-out: AGT-166 settles 'partial' · finalises Oct 1, 1:09 AM CST · `select public.reverse_decision('26010c8c-2e3b-41a4-8104-2ffa90bf9e4e','John','<why>');`
- `05467a33` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · finalises Oct 1, 1:09 AM CST · `select public.reverse_decision('05467a33-21d1-4554-997f-9aa8650c3869','John','<why>');`
- `a0dd5431` · leverage · — · AGT-238 leverage first: AGT-237, AGT-151 marked as leverage -- outranks project order · finalises Oct 1, 1:10 AM CST · `select public.reverse_decision('a0dd5431-3f06-4726-919b-a1c458361537','John','<why>');`
- `c538d187` · concurrency · — · AGT-238 concurrency from the corpus: 5 project(s) executing in the order auditor-enhancements, agent-training, dev-mana… · finalises Oct 1, 1:10 AM CST · `select public.reverse_decision('c538d187-f19b-415e-b377-7a0e73097156','John','<why>');`
- `ea89655a` · hygiene · `AGT-79` · Ticket Owner: 13 derivable cell fix(es) on 13 row(s) — cost 0 · claim 0 · type 0 · revalidation 13 · finalises Oct 1, 1:19 AM CST · `select public.reverse_decision('ea89655a-f6a8-4732-9d04-f1e061f87ea1','John','<why>');`
- `8b01d46f` · leverage · — · AGT-238 leverage first: AGT-151, AGT-146, AGT-161 marked as leverage -- outranks project order · finalises Oct 1, 1:25 AM CST · `select public.reverse_decision('8b01d46f-4387-461c-9bd8-f97674fcdaec','John','<why>');`
- `b73fb19b` · concurrency · — · AGT-238 concurrency from the corpus: 5 project(s) executing in the order dev-manager-capabilities, agent-training, mcp-… · finalises Oct 1, 1:25 AM CST · `select public.reverse_decision('b73fb19b-24a0-4b07-9b7d-e92ce0d27fad','John','<why>');`
- `1a93f530` · ticket-status · — · AGT-253: trainer-authored-agents becomes design-only and AGT-250/251/252 lose needs-desktop · finalises Oct 1, 1:42 AM CST · `select public.reverse_decision('1a93f530-f924-4e63-a268-d5356c0e1322','John','<why>');`
- `e57ee8b2` · ticket-status · `AGT-151` · Close-out: AGT-151 settles 'delivered' · finalises Oct 1, 1:51 AM CST · `select public.reverse_decision('e57ee8b2-a5da-4897-bb92-8e6287780a61','John','<why>');`
- `a268d292` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · finalises Oct 1, 1:51 AM CST · `select public.reverse_decision('a268d292-0686-4716-8fd2-81fb583be952','John','<why>');`
- `f6dee287` · leverage · — · AGT-238 leverage first: AGT-146, AGT-158, AGT-161 marked as leverage -- outranks project order · finalises Oct 1, 1:57 AM CST · `select public.reverse_decision('f6dee287-8912-41ef-922b-b4e806f1ff00','John','<why>');`
- `04c71c91` · concurrency · — · AGT-238 concurrency from the corpus: 5 project(s) executing in the order dev-manager-capabilities, agent-training, mcp-… · finalises Oct 1, 1:57 AM CST · `select public.reverse_decision('04c71c91-1817-4967-a854-9a6357df3252','John','<why>');`
- `0206e16c` · ticket-status · `AGT-253` · Restore needs-desktop on AGT-250/251/252: the AGT-253 migration that cleared it is live, but the runbook clause that st… · finalises Oct 1, 1:57 AM CST · `select public.reverse_decision('0206e16c-4260-4882-8cf5-a268e35e9727','John','<why>');`
- `2a0ee2ac` · leverage · — · AGT-238 leverage first: AGT-158, AGT-161, AGT-138, AGT-136 marked as leverage -- outranks project order · finalises Oct 1, 2:05 AM CST · `select public.reverse_decision('2a0ee2ac-abb6-4adf-a827-e82cd5113ced','John','<why>');`
- `e97170a4` · concurrency · — · AGT-238 concurrency from the corpus: 5 project(s) executing in the order dev-manager-capabilities, agent-training, audi… · finalises Oct 1, 2:05 AM CST · `select public.reverse_decision('e97170a4-2ebd-4952-8452-c138953280d4','John','<why>');`
- `91846581` · ticket-status · `AGT-158` · AGT-158 is deferred stuck, not built and not removed: its own stop condition fires — there are zero replayable verify-s… · finalises Oct 1, 2:21 AM CST · `select public.reverse_decision('91846581-8782-48df-b04c-856147cd4b4b','John','<why>');`
- `9d53f928` · ticket-status · `AGT-146` · Close-out: AGT-146 settles 'delivered' · finalises Oct 1, 2:29 AM CST · `select public.reverse_decision('9d53f928-275e-4b9e-aa7d-0d616560f515','John','<why>');`
- `3209ed6d` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · finalises Oct 1, 2:29 AM CST · `select public.reverse_decision('3209ed6d-bcf5-463b-adf5-016478ff8e53','John','<why>');`
- `7ce8c4ee` · leverage · — · AGT-238 leverage first: AGT-161, AGT-162, AGT-156 marked as leverage -- outranks project order · finalises Oct 1, 2:29 AM CST · `select public.reverse_decision('7ce8c4ee-80f8-4cdc-a56b-c179e2a38820','John','<why>');`
- `7e32dfc4` · concurrency · — · AGT-238 concurrency from the corpus: 3 project(s) executing in the order agent-training, dev-manager-capabilities, audi… · finalises Oct 1, 2:29 AM CST · `select public.reverse_decision('7e32dfc4-ead5-42ee-8fbf-2f6e84ab780f','John','<why>');`
- `43313e6f` · hygiene · `AGT-156` · AGT-156 blocked_by AGT-155: the routine cannot be registered before the leads step it invokes exists · finalises Oct 1, 2:35 AM CST · `select public.reverse_decision('43313e6f-b25e-4d81-bd98-3298bb5cd879','John','<why>');`
- `b60c5486` · leverage · — · AGT-238 leverage first: AGT-162 marked as leverage -- outranks project order · finalises Oct 1, 2:40 AM CST · `select public.reverse_decision('b60c5486-4a68-4a35-8d5e-cbe6ebb5e497','John','<why>');`
- `66962c64` · concurrency · — · AGT-238 concurrency from the corpus: 5 project(s) executing in the order agent-training, dev-manager-capabilities, audi… · finalises Oct 1, 2:40 AM CST · `select public.reverse_decision('66962c64-8abd-47b6-b7aa-bfa4cd3fbfe4','John','<why>');`
- `d377fcfc` · ticket-scope · `AGT-161` · AGT-161 is designed: kickoff v7.0.681 attested within cap, premise alive, and the skill-edit rule scopes one done-when… · finalises Oct 1, 2:43 AM CST · `select public.reverse_decision('d377fcfc-4532-46dc-8fe2-7a6d5327dafb','John','<why>');`
- `d256990c` · ticket-status · `AGT-136` · Close-out: AGT-136 settles 'partial' · finalises Oct 1, 2:55 AM CST · `select public.reverse_decision('d256990c-4016-4835-8795-4a555d4cde78','John','<why>');`
- `28a694c9` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · finalises Oct 1, 2:55 AM CST · `select public.reverse_decision('28a694c9-0cac-42bd-9094-1731c42f2ab9','John','<why>');`
- `e5c44598` · rollback · — · Auto-rollback held: ci-red on 0ee8d6b was not reverted (card-only) · finalises Oct 1, 2:56 AM CST · `select public.reverse_decision('e5c44598-e441-4e86-b842-c55d4289165c','John','<why>');`
- `eb81f6f7` · filing · — · Audit review 2026-W40: 12 findings → 3 tickets, 1 not-a-defect, 6 carried, 0 escalated · finalises Oct 1, 2:56 AM CST · `select public.reverse_decision('eb81f6f7-9afb-4009-81a9-fa54b2ef14bc','John','<why>');`

**145 final this week, 3 reversed this week** — *this week* is a **rolling 7 days** back from the stamp, not a calendar week and not a Friday-07:00Z reset: no such weekly-reset helper exists in this file or anywhere in `scripts/`, so a rolling window is what is used and is labelled as one. A reversal is the strongest negative signal the ladder takes (`M6-07`), so the second number is the one to read first.

**Decided for you** — *as of 2026-09-28 08:00Z (Sep 28, 3:00 AM CST).* What the runner DECIDED on your behalf, by CST day (`governance_rules.MANAGER-DECIDES-BY-DEFAULT`: *a daily list of what was decided, not questions*), with the questions that reached you anyway counted beside it — target zero. Not the `Open decisions` group above: that one is the undo list and drops a decision the moment it finalises; this one is the record of the day and keeps it. **47 decided on 2026-09-28**; **4 question(s) reached you in the last 7 days — target zero**; 21 still open.

| CST day | decided | reversed | questions to you |
|---|---:|---:|---:|
| `2026-09-28` | 47 | 1 | 0 |
| `2026-09-27` | 186 | 2 | 2 |
| `2026-09-26` | 66 | 0 | 0 |
| `2026-09-25` | 32 | 0 | 0 |
| `2026-09-24` | 39 | 0 | 2 |
| `2026-09-23` | 32 | 0 | 0 |
| `2026-09-22` | 0 | 0 | 0 |

- *2 decision(s) were read but fall outside the table:* the read window is a rolling 7×24h back from the stamp, the table is the seven CST days ending `2026-09-28`, and any render after CST midnight sees the gap between them. They are in no column above.

**The 47 decided on 2026-09-28** — newest first.

- `eb81f6f7` · filing · — · Audit review 2026-W40: 12 findings → 3 tickets, 1 not-a-defect, 6 carried, 0 escalated · open
- `e5c44598` · rollback · — · Auto-rollback held: ci-red on 0ee8d6b was not reverted (card-only) · open
- `28a694c9` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · open
- `d256990c` · ticket-status · `AGT-136` · Close-out: AGT-136 settles 'partial' · open
- `d377fcfc` · ticket-scope · `AGT-161` · AGT-161 is designed: kickoff v7.0.681 attested within cap, premise alive, and the skill-edit rule scopes one done-when… · open
- `66962c64` · concurrency · — · AGT-238 concurrency from the corpus: 5 project(s) executing in the order agent-training, dev-manager-capabilities, audi… · open
- `b60c5486` · leverage · — · AGT-238 leverage first: AGT-162 marked as leverage -- outranks project order · open
- `43313e6f` · hygiene · `AGT-156` · AGT-156 blocked_by AGT-155: the routine cannot be registered before the leads step it invokes exists · open
- `7e32dfc4` · concurrency · — · AGT-238 concurrency from the corpus: 3 project(s) executing in the order agent-training, dev-manager-capabilities, audi… · open
- `7ce8c4ee` · leverage · — · AGT-238 leverage first: AGT-161, AGT-162, AGT-156 marked as leverage -- outranks project order · open
- `33ccb39e` · reversal · `AGT-136` · reversal of design-ruling decision 6cceb721-f763-4239-9913-545684738751 -- applied: 1 restored, 0 restored-unverified,… · open
- `6cceb721` · design-ruling · `AGT-136` · Open questions ruled by cycle 3dd32ab7-762d-49ab-9e5e-65d2840bbe69: 1 question(s) — {"no": 1, "yes": 0, "john": 0, "wit… · reversed
- `3209ed6d` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · open
- `9d53f928` · ticket-status · `AGT-146` · Close-out: AGT-146 settles 'delivered' · open
- `91846581` · ticket-status · `AGT-158` · AGT-158 is deferred stuck, not built and not removed: its own stop condition fires — there are zero replayable verify-s… · open
- `e97170a4` · concurrency · — · AGT-238 concurrency from the corpus: 5 project(s) executing in the order dev-manager-capabilities, agent-training, audi… · open
- `2a0ee2ac` · leverage · — · AGT-238 leverage first: AGT-158, AGT-161, AGT-138, AGT-136 marked as leverage -- outranks project order · open
- `0206e16c` · ticket-status · `AGT-253` · Restore needs-desktop on AGT-250/251/252: the AGT-253 migration that cleared it is live, but the runbook clause that st… · open
- `04c71c91` · concurrency · — · AGT-238 concurrency from the corpus: 5 project(s) executing in the order dev-manager-capabilities, agent-training, mcp-… · open
- `f6dee287` · leverage · — · AGT-238 leverage first: AGT-146, AGT-158, AGT-161 marked as leverage -- outranks project order · open
- `a268d292` · resolve · — · Close-out cost resolved: cost_usd=0, cost_basis=subscription-lane · open
- `e57ee8b2` · ticket-status · `AGT-151` · Close-out: AGT-151 settles 'delivered' · open
- `1a93f530` · ticket-status · — · AGT-253: trainer-authored-agents becomes design-only and AGT-250/251/252 lose needs-desktop · open
- `b73fb19b` · concurrency · — · AGT-238 concurrency from the corpus: 5 project(s) executing in the order dev-manager-capabilities, agent-training, mcp-… · open
- `8b01d46f` · leverage · — · AGT-238 leverage first: AGT-151, AGT-146, AGT-161 marked as leverage -- outranks project order · open
- …and 22 more decided that day · `select id, kind, backlog_id, summary, status from public.runner_decisions where (decided_at at time zone 'America/Chicago')::date = '2026-09-28' order by decided_at desc;`

**Judgment classes** — *as of 2026-09-28 08:00Z (Sep 28, 3:00 AM CST).* What the corpus currently holds per pull test, live from `public.judgment_class_census` (`SES-84`; the same view `SES-159` reads). Ratification is a standing metric (John, 2026-08-23: a class is never finished being learned), never a finish line.

| class | ratified | proposed | rejected | total |
|---|---:|---:|---:|---:|
| `P1 - Improves John's Skills` | 7 | 31 | 6 | 44 |
| `P2 - Inventive` | 0 | 95 | 16 | 111 |
| `P3 - Investor Value` | 0 | 78 | 7 | 85 |
| `P4 - New Customers` | 1 | 37 | 3 | 41 |
| `neutral` | 0 | 83 | 30 | 113 |

- Newest proposed root claim for P1: *no proposed root claim*.
- Newest proposed root claim for P2: `VC-SYN-002` — Inventive features are the least-tested product goal because the bar John set — something competitors cannot easily copy — he has never applied to a real featu…
- Newest proposed root claim for P3: `VC-SYN-001` — Investor value is the least-defined product goal because nobody has yet said what an investor would check. The drafts agree on one reading: the buyer is a skep…
- Newest proposed root claim for P4: `VC-ROOT-004` — New features that win new customers. The bar is buy-pull — functionality that makes a customer say "I have to buy this." Administrative capability (accounts, b…

- **FLAG: 4 live claims still `unclassed`** — after `SES-84` this is zero by construction; a non-zero here is drift (a claim inserted without a classing decision) and needs one recorded decision, never a default.

**John-model** — *as of 2026-09-28 08:00Z (Sep 28, 3:00 AM CST).* How often a decision that leaned on a standing pattern of John's stood unreversed through its window, live from `public.john_model_signal` (`SES-004`; the criteria are `public.decision_patterns`, exported from `docs/JOHN-DECISION-PATTERNS.md`). A rate binds only from 30 finalised-or-reversed decisions (M7 gate, ruling iii).

- **98.8% agreement** over 331 finalised-or-reversed decisions (327 finalised unreversed, 4 reversed; 211 still open, 542 citing in total). A reversal is the strongest negative signal the ladder takes, so the second number is the one to read first.

| criterion | citing | final unreversed | reversed | open | rate |
|---|---:|---:|---:|---:|---:|
| `pattern:0` No standing pattern applied -- new judgment. | 283 | 169 | 1 | 113 | 99.4% |
| `pattern:137` P1–P4 are pull tests, not category labels — administrative expectations never q… | 78 | 77 | 0 | 1 | 100% |
| `pattern:9` Never spend a model call where a deterministic mechanism serves. | 55 | 3 | 0 | 52 | — |
| `pattern:14` When two code paths compute the same thing, build one shared core they both cal… | 51 | 1 | 0 | 50 | — |
| `pattern:85` Don't gate small, reversible calls on his approval — decide and flag. | 51 | 48 | 1 | 2 | 98% |

- A per-pattern `—` is not a zero: that criterion has not reached 30 finalised-or-reversed citations of its own, so it carries counts and no rate.

**Invention in use** — *as of 2026-09-28 08:00Z (Sep 28, 3:00 AM CST).* Criterion 7 (`docs/SELFBUILD-CHARTER.md`): at least one platform-originated feature — the Bench Report Card judge (`LOG-143`) — is measurably used by real visitors, live from `public.report_card_usage`. Counts only, never a rate.

- **7d:** 0 judge runs, 0 by real visitors (0 distinct).
- **30d:** 3 judge runs, 0 by real visitors (0 distinct).
- **all:** 3 judge runs, 0 by real visitors (0 distinct).

- *no real-visitor use yet.*

**Board by served class** — *as of 2026-09-28 08:00Z (Sep 28, 3:00 AM CST).* Which class each open ticket SERVES under the served-class test (`VC-MISSION-033`), ruled by The Prioritizer's `classify-ticket` and stored on `backlog_items.supports_class` — a ticket's own class is a different question and is not restated here.

| serves | open tickets |
|---|---:|
| `P1 - Improves John's Skills` | 82 |
| `P2 - Inventive` | 11 |
| `P3 - Investor Value` | 5 |
| `P4 - New Customers` | 2 |
| `P7 - Agent Creation` | 1 |
| *serves none* | 556 |

- *Negative ranks are John's own automation queue, seeded to sort ahead of anything assigned later (`SES-86`). The nightly re-rank writes 1..N and therefore sits below them — intended precedence, not a re-rank that failed.*

- **Top 5 by `automation_rank`:**
  -35. `SES-288` — A schema-range red can never be auto-reverted: one refused down-migration disables rollba… *(serves none)*
  1. `AGT-162` — MCP endpoint that returns a DeepBench agent's knowledge bundle, with no inference on Deep… *(serves none)*
  2. `AGT-163` — Access path: an MCP key for the outside tester, and attribution of his web-UI training by… *(serves none)*
  3. `AGT-164` — Create Brittany, a blank marketing agent for the outside tester, and give her Teach-scree… *(serves none)*
  3. `AGT-141` — Six active product agents have no Capability, so nothing can ever call them: Robyn Castel… *(serves none)*

- Last scheduled re-rank: Sep 28, 12:06 AM CST.

**Governance agents, last 7 days** — *as of 2026-09-28 08:00Z (Sep 28, 3:00 AM CST).* Whether the platform's own agents (`agents.lane = 'governance'`) are doing the development work, live from `public.governance_agent_usage` and `public.ship_handoff_census` (`SES-360`). A **rolling 7 days** back from render time, like the decision counts above. Counts and token sums only, never a rate.

| role | source | calls | input tokens | output tokens |
|---|---|---:|---:|---:|
| Governance — Development Manager | `session` | 105 (89 untokened) | 622861 | 361564 |
| Governance — Researcher | `session` | 2 (2 untokened) | 0 | 0 |
| Governance — Prioritizer | `session` | 15 (10 untokened) | 258652 | 3054 |
| Governance — Prioritizer | *unlabelled* | 631 (631 untokened) | 0 | 0 |
| Governance — Designer | `session` | 112 (100 untokened) | 1309762 | 195000 |
| Governance — Builder | `session` | 90 (83 untokened) | 1178256 | 138000 |
| Governance — Verifier | *no calls in the window* | 0 | — | — |
| Governance — Auditor | `session` | 28 (16 untokened) | 524196 | 88663 |
| Governance — Ticket Owner | `session` | 9 | 0 | 0 |

- **Ships with all four handoff rows: 39 of 74** ships in the window (`SES-345`'s four: `automation_rank`, `kickoff_link`, a per-ticket push sha, a verdict row). Missing per leg: kickoff_link 1, per-ticket sha 2, automation_rank 35, verdict 1.
- *unlabelled* is a NULL `call_source` — the pre-attribution unknown, never read as automation (`LOG-128`); `untokened` rows carry no token counts at all (deterministic handler rows), so a large call count beside a small token sum is that, not a cheap model.

**Auditor's ledger** — *as of 2026-09-28 08:00Z (Sep 28, 3:00 AM CST).* What `public.audit_findings` (`AGT-70`) holds and what has left it for the board. Counts only, never a rate. Latest week 2026-W40: **76 findings (26 open · 0 resolved · 3 not a defect)** — **0 ruled** open findings (a ruled, open, `high` row is what `tripwire-to-backlog.js --from-ledger` files, at most 3 per ISO week); **0 filed** to the board from the ledger so far (`source_file = 'audit-ledger'`).

| fingerprint | kind | confidence | fact | ruled |
|---|---|---|---|---|
| `009e789661bf3d3a` | other | high | Every MCP call is logged: which agent, which client, which taught entries went… | — |
| `138c643acb2bdd8c` | other | high | Ticket Owner check delivered-unaccepted holds open judgment rows a capability m… | — |
| `1f1dba3d3809a968` | other | high | build needed a fact the kickoff did not carry | — |
| `2186a662fa7abc8f` | other | high | Ticket Owner check cycles-over-quote holds open judgment rows a capability must… | — |
| `32da6396be5e06ad` | other | high | Ticket Owner check type-off-taxonomy holds open judgment rows a capability must… | — |
| `47f4c0dd8f3b714a` | other | high | build needed a fact the kickoff did not carry | — |
| `5a794eda6203a2e1` | other | high | build needed a fact the kickoff did not carry | — |
| `70fb7b18845d3389` | other | high | Prove one agent runs on a non-Claude model with no prompt edits -- Parity run:… | — |
| `86b3d4623eb752be` | other | high | build needed a fact the kickoff did not carry | — |
| `a497a60b23308e1d` | other | high | Score the MCP POC: taught-fact recall with the connector versus plain Claude, r… | — |
| `a62917636fc8091a` | other | high | assignment differs from the queue head | — |
| `ad897274af932131` | other | high | build needed a fact the kickoff did not carry | — |
| `addc028d1b494de6` | other | high | Ticket Owner check verdict-missing holds open judgment rows a capability must d… | — |
| `b2ef6c230dcf27a4` | other | high | Measure knowledge loss across sessions -- 30-day knowledge-retention run for on… | — |
| `be357147648b9773` | other | high | Ticket Owner check remainder-stranded holds open judgment rows a capability mus… | — |
| `c0235363de641431` | other | high | Ticket Owner check designed-closed holds open judgment rows a capability must d… | — |
| `c34280d88662dfcb` | other | high | MCP endpoint speaks Streamable HTTP with OAuth 2.1 so the same agent connects f… | — |
| `da23e674ed040a29` | other | high | Ticket Owner check size-missing holds open judgment rows a capability must deci… | — |
| `df1c3f5b8f688623` | other | high | kickoff over kickoff_byte_cap on first assembly | — |
| `e093401408ee1e14` | other | high | build needed a fact the kickoff did not carry | — |
| `e28e1b586124ee98` | other | high | build needed a fact the kickoff did not carry | — |
| `e2c2c390f2a15ef7` | other | high | Ticket Owner check quote-missing holds open judgment rows a capability must dec… | — |
| `e70152a1c6192eb9` | other | high | Ticket Owner check unrevalidated-30d holds open judgment rows a capability must… | — |
| `e8f927e17bfbc067` | other | high | build needed a fact the kickoff did not carry | — |
| `f2db2c9ae1e653af` | other | high | build needed a fact the kickoff did not carry | — |
| `f47f4ab7aba3d776` | other | high | build needed a fact the kickoff did not carry | — |

- *A finding leaves this table only by John's ruling — `resolved`, `not-a-defect`, or ruled and left `open` to file. Candidates a run found but nobody ingested live in `docs/audits/<week>-candidates.json`, not here.*

**Ticket hygiene, last night** — *as of 2026-09-28 08:00Z (Sep 28, 3:00 AM CST).* What the Ticket Owner (`AGT-79`) left on the board: `public.ticket_owner_findings` open rows by check, the newest `hygiene` decision and the newest nightly cycle row. Counts only, never a rate. **179 open findings** across 9 check(s).

| check | open | oldest | nights open |
|---|---:|---|---:|
| `verdict-missing` | 45 | Sep 12, 10:31 PM CST | 15 |
| `size-missing` | 35 | Sep 12, 10:31 PM CST | 15 |
| `delivered-unaccepted` | 27 | Sep 12, 10:31 PM CST | 15 |
| `type-off-taxonomy` | 23 | Sep 12, 10:31 PM CST | 15 |
| `designed-closed` | 16 | Sep 23, 7:50 PM CST | 4 |
| `quote-missing` | 12 | Sep 12, 10:31 PM CST | 15 |
| `unrevalidated-30d` | 12 | Sep 28, 1:12 AM CST | 0 |
| `remainder-stranded` | 6 | Sep 18, 5:38 AM CST | 9 |
| `cycles-over-quote` | 3 | Sep 12, 10:31 PM CST | 15 |

- Last run: `b04242fb` · shipped · Sep 28, 1:19 AM CST · 1012 rows · 192 findings (13 derivable · 179 judgment) · behind the fences: quote 525 · size 493 · cost 45 · verdict 97 · unrevalidated>30d 441 · attended-actual null 356 · revalidation 441 left (batch 25, carried 0) · retired 1 check / 118 rows · fixed 13 · findings +31 ~148 −111 · decision ea89655a-f6a8-4732-9d04-f1e061f87ea1 — reversible until 2026-10-01T06:19:51.154837+00:00 · judged 13/12/0 on claude-fable-5-1
- Judgment: **the newest night was judged** — 0 unjudged nights on top, over the newest 14 on record.
- Decision `43313e6f` · open · AGT-156 blocked_by AGT-155: the routine cannot be registered before the leads step it invokes exists · finalises Oct 1, 2:35 AM CST · `select public.reverse_decision('43313e6f-b25e-4d81-bd98-3298bb5cd879','John','<why>');`

**Staff watch** — *as of 2026-09-28 08:00Z (Sep 28, 3:00 AM CST).* What the Development Manager (`SES-378`) recorded about the runner's own agents: `public.runner_staff_findings` rows per `agent_id`, with the distinct fingerprints and the distinct CYCLES behind them. Counts only, never a rate. **52 finding(s)** across 2 agent(s).

| agent | findings | distinct fingerprints | distinct cycles | newest |
|---|---:|---:|---:|---|
| `designer` | 44 | 6 | 40 | Sep 28, 2:48 AM CST |
| `devmanager` | 8 | 4 | 8 | Sep 28, 2:35 AM CST |

**Human gates** — *as of 2026-09-28 08:00Z (Sep 28, 3:00 AM CST).* The two reads that say whether anything is waiting on a human: open `backlog_items` carrying `design_status = 'needs-john'`, and `gated_before_build` `runner_items` left with `decision IS NULL` (`M6-01`). Board state, written by no code in this repo — which is why it is REPORTED here and not asserted as a gate by the regression suite. **1 open `needs-john` ticket(s)**, **8 undecided `gated_before_build` card(s)**.

- **`needs-john` (1):** `AGT-110`
- **Undecided gated cards (8):** `54b42eea-be4f-434d-963a-6707873bc137`, `2d5441c7-5133-4b21-9768-7921dce0c409`, `e8fdfaee-667c-4d45-9f45-c759a134fffb`, `ceb5f4f4-0fa9-43b1-8011-4c72b4982fd2`, `1071fd92-59e8-4248-a831-ee551e5ad0a1` …and 3 more
- *Open is not wrong.* A card nobody has answered yet is a real board state; what it is NOT is a regression, so nothing in the suite goes red for it.

*Provenance: 1000 board rows, payload `sha256:ee4b7cb697978f91`, as of 2026-09-28 08:00Z (Sep 28, 3:00 AM CST). The stamp says when this was last read; the sha says whether it still matches the tables. `--check` compares the sha, never the stamp — a refreshed stamp over identical facts is not drift.*
<!-- END GENERATED — scripts/render-standing-brief.js -->

**Next session:** none required — the runner is live and works **John's automation queue** (canonical: `docs/RUNNER-GOV-0820-REQUIREMENTS.md`): the queue is the board's leading sort key, not a list to read (`automation_rank`, v7.0.133) — `ORDER BY queue` already honours it. Classes are always written named, **`P1 - Improves John's Skills` → `P10 - Tooling`**; outcomes as plain words (“did not run”, “gated before build”); budget is two-track (API dollars + token governor). John judges from the briefing page. Runner pause: disable `deepbench-runner` at claude.ai/code/routines. **Board census measured 2026-08-23T12:5xZ by runner cycle `363b5138`, taken from the board after its own close-out recompute rather than carried forward:** **561 open tickets, 561 numbered, 0 open-but-unnumbered**, 611 rows total, **the standing Automation drain now has a FIXED finish line** — from `v7.0.179` (`SES-142`) it works the **18 members John named** on directive `b74009ea`, stored as `runner_drain_scope` FK rows, and a ticket filed into the epic *after* that naming **never joins it**: it queues normally and waits for him. The live `now` tier had already drifted to 19 against his 18. `drain_epic_next()` retires when those 18 are `done`/`removed`, and returns the new outcome **`unscoped`** — never a live-tier fallback — for any future drain declared without a list. Queue/drain state as of **v7.0.196** (2026-08-23 ~17:00Z, `successional-review` close-out, 561 rows renumbered): `SES-140` — *the successor fire is refused by the platform* and `SES-151` — *the scheduler runs on John's clock grid* are both **`done`**; the drain's nearest open member `SES-84` — *the vision corpus* (`needs-john`) waits on John's briefing decisions, so cycles step past it (`SES-114`) and work the board (`SES-121` — *shrink the `.claude/`-mutable surface* went `done` at v7.0.198; procedure text now lives in `docs/runbooks/`, cycle-writable). **The board's `title` column is trustworthy for display for the first time** (`SES-91`, v7.0.177): 98 rows that held a bare priority-class string now carry a real authored title, and the only `^P[0-9]+ - ` title left is `ADM-1`, whose title is a real sentence behind a stale class prefix and is deliberately left for `SES-117` to **accommodate** rather than repair. `SES-119` is now `done` (v7.0.184 + v7.0.185): the briefing renders `public.backlog_display_title(title, description)` rather than the read-time `gist` workaround, and **`runner-cycle.md`'s Language block now requires a ticket's title wherever John reads its ID**. Step 5's `gist` expression deliberately stays — it is still correct for any future row filed the old way, and 50 of 562 open numbered tickets still fall back to it. **From v7.0.195 the chain runs IN-SESSION (`SES-140` FINAL)** — a cycle that actually ran one (`shipped`/`gated_before_build`/`reverted`) and whose drain still returns `pick` opens its next `runner_cycles` row (trigger `chained (drain continuation)`) **in the same session** and re-enters the runbook at step 1; session-spawning is retired as platform-unsupported (`runner-cycle.md` tail step (8) carries the evidence). A **wall-stopped cycle continues nothing**, which keeps the budget wall a brake rather than a metronome. Proven live 2026-08-23: cycles `1fcd687e` → `a11c94d2`, the first chained row in the runner's life. **The briefing-redesign epic is finished** — `SES-129`, its last member, shipped in cycle `ed1a5eb3`. **A new filing rule binds from this version:** `runner_items.backlog_id` takes a **bare** ticket id or NULL and is enforced by `ck_runner_items_backlog_id_bare`; the display string belongs in `display_ref`, and the briefing's id chip reads `coalesce(backlog_id, display_ref)` (`SES-116`, v7.0.174 — `runner-cycle.md` step 9). **`design_status` reads for selection (`SES-114`, v7.0.165); among OPEN tickets measured at the v7.0.198 close-out:** 16 `designed` (incl. `SES-101`, flipped from `needs-desktop` — its one remaining edit now lives in `docs/runbooks/session-setup.md` step 3c, cycle-writable), **0 `needs-desktop`**, **1 `needs-john`** (`SES-84`), 546 `NULL` = not yet triaged, deliberately not guessed to `auto`. Measured at the v7.0.198 close-out: **11 of John's 18 named members remain open** (`SES-121` retired from the list by going `done` this session); the only `needs-john` member is `SES-84` — the rest are buildable, the drain reaches them and can retire on them. **`CHI-89`** still holds its queue slot with its removal card undecided — visible to John and skipped by cycles, exactly as `SES-113` intended. **`SES-133` is still open at `partial`** — the other half of John's 2026-08-23 emergencies directive; it sits at queue 251 rather than at the top, because the drain reads the Automation epic's `now` tier in queue order and `SES-133` is not in that epic. **From v7.0.182 John's own switches govern the cadence** (`SES-143`): the briefing's **§2b Automation panel** carries a scheduler checkbox + an every-N-hours box (the generated block above is the only home for their live values — it renders `runner_settings` row 1 fresh each cycle, `SES-151`) and a drain checkbox, and `runner-cycle.md`'s **new step 1b** calls `public.scheduler_gate()` before anything else — a scheduled cycle arriving early closes `did_not_run` with *"paced by your scheduler setting"*, and with the scheduler off it closes *"scheduler off"*. **The cron is John's own routine switch** — a cycle cannot edit its own routine — and **from v7.0.196 (`SES-151`) the gate paces by John's clock grid**: a scheduled fire runs iff its row's `started_at` falls in an America/Chicago hour divisible by `runner_settings.interval_hours` — row 1, read live, never a number written here — and the routine's cron fires in that hour (DST-proof; the mixed-clock elapsed test that wrongly paced 3 of 9 hourly fires is dead, `q-hourly-interval-boundary` answered by ship). Two consequences worth knowing before reading a quiet night as a stall: the gate **fails open** on every unknown, and it governs **scheduled** fires only, so a standing drain's chained continuation cycles run regardless — while the Automation drain stands, **the chain and not the interval is what actually sets the pace**. A manual fire (off the cron grid) is never paced; whether that is what John wants is the one thing the spec leaves open, asked as `q-manual-fire-pacing`. **From v7.0.188 that gate actually fires** (`SES-146`): until then `scheduler_gate()` matched the trigger by exact equality against the bare word `scheduled`, so a cycle passing the verbatim line step 1b asks for — `trigger: scheduled` — fell through to *"not a scheduled cycle"* and skipped **both** the pacing branch and the `scheduler_on = false` branch, and the grid test compared `now()`-at-step-1b rather than the fire time against a hardcoded ±2. Both failed open, so the panel looked live and bound nothing. The trigger is now normalised, the grid is anchored to the cycle row's own `started_at`, and the tolerance is the column `runner_settings.grid_tolerance_min` (10). **Silence is not a “no”** on any open question. **From v7.0.183 the board's open status is `open`, never `missing`** (`SES-118`): `backlog_items_status_check` now allows exactly `('open','partial','done','removal proposed','removed')` and the retired value raises `23514` — 510 rows renamed, `updated_at` deliberately untouched so step 8c's 30-day revalidation sweep still sees the sinking tail. **That consequence closed at v7.0.189** (attended session `ses118-gated`, 2026-08-23): step 3c's INSERT now writes `'open'`, zero `'missing'` literals remain under `.claude/`, and `SES-118` is `done` — its gated card `76564dde` awaits John's decision on the briefing page.
