# Handoff — make the product team finish tickets without John (from session cap-split-rule-1009, 2026-10-09)

## Goal (John, 2026-10-09)
Take the five directives from the night of 2026-10-08 one at a time and, for each, fix the ROOT CAUSE so the Development Manager (or any governance agent) can finish this kind of ticket on its own next time. Not "finish the ticket" — remove the reason it needed John or a session.

## What the last session proved (do not redo)
- The cap-split rule is built and on dev: AGT-445 (public.rule_capped_ticket + DRAIN-CAP-SPLIT), AGT-446 (pattern 172; CAP-SCOPE rules), AGT-447 (dm-guardrails duty; runbook 5a), AGT-448 (ds-guardrails stop-and-send; guard test agt-448-cap-split-guard), AGT-449 (capability rule-cap-case + scripts/rule-cap-case.js; cycle card names it). Findings 627376b1, 5861d44e, dd603ab9 and the governance-hygiene finding (runbook ceiling RCA) are open for the Development Manager's review.
- Dry run of the rule on stand-in agents: AGT-427 split, AGT-336 split, AGT-390 waive, AGT-394 split (John judged the cut right). Method: answer key signed BEFORE running; three in a row; fresh agents per run; blind to outcomes.
- The AGT-449 route is proven only with a stand-in answer (reversible waive on AGT-427, undone). NOT proven: a real model turn on a live cap case, or a cycle following the card's `next:` line. Proving it on AGT-427 slice 2 is the first job.

## The five directives and what blocks each (hypotheses — VERIFY FIRST, they come from one session's reading)
1. `a738da38` rule every gate card — done; 1 card (54b42eea, the 20-assignment bar) went to John. RCA question: why can a card still escalate to John when John keeps only money, dev->main and hiring/switching agents (memory: manager-decides-by-default)? Fix at decide-gated-card's ruling classes.
2. `418095d5` pick uses Victoria's scores — marked done, half built. AGT-427 (partial, need_score NULL): slice 2 (severity first in prime_directive_queue/drain_epic_next) needs the cap route. The routine will NOT pick it (unscored; pace gate) — run it attended, or pin it.
3. `2458c24b` Victoria can write a 0 — AGT-433 slice 3 built, held by gate card 6de36a22 (ships past 3 stale tests). Root cause upstream: the suite is already red on dev (AGT-304 "38 regression suites fail"), so unattended ships past red are refused. Fix candidates: a Development Manager rule to accept when the delta is 0 newly red against a credentialed named baseline; and clear AGT-304.
4. `0078af4d` Victoria fills the active projects — AGT-432 delivered, directive row still in_progress (reason cited: decision dde78dc0, Tuesday's fire repeats the 8-ticket source replacement until the third directive ships). RCA question: should a directive close itself when its ticket settles? Check settle-ship.
5. `3c1cc23d` pin the north star once per agent — AGT-434 built on branch session/cycle-20261009-1150, migration will not apply (safety probe outruns the connector's 60 s). Gate card 7334ac41. Fix: make the probe fit or give a path for long migrations; also decide the agent-level pin design.
Also open: AGT-398 (waits on question q-agt-398-user-agent-prefix, card 355d431e), AGT-340 (card 4e825bc6).

## Method for each directive (RCA-fix loop, the one that worked)
1. State the use case in one line. Verify the blocker with a fresh measurement (query, log, run).
2. Ask: who SHOULD have been able to decide/do this, and what stopped them? Name the fence (rule, guardrail, pick gate, infrastructure limit, missing route).
3. Fix the fence at the right layer (rule text in its single home, capability route, pick/gate function, infrastructure) — one ticket per root cause, filed john-named, chained with blocked_by.
4. Dry run on stand-in agents with an answer key signed before the run (3 in a row) when the fix is a judgment rule.
5. Build through Designer -> Builder -> verifier (docs/runbooks/session-setup.md 3e/3f). Prove once live on a real ticket, reversibly.
6. Close the loop: a guard test that fails if the fence returns.

## Traps found (carry forward)
- Capture a CREDENTIALED baseline on the unchanged tree and NAME every red in the kickoff BASELINE block, or the verifier blocks as "no baseline handed". Node 24 on this Windows machine crashes on exit after a network call (3221226505/127): trust the printed result line.
- runner-cycle.md is 380,977 of 381,000 bytes (agt-138 needs < 380,980); any runbook edit must be byte-neutral. Carry procedure in scripts / capability rows / the cycle card.
- decision_patterns is append-only: a rule is a NEW criterion; the old one is retagged.
- render-cycle-card.js --write needs --cycle-id --ticket --decision=; ses-378d is red on the unchanged tree.
- Rows of ACTIVE agents (dm-/ds-guardrails, Intents, capabilities) are John's by agent-roster-inert; a john-named ticket is the agreed ticket (AGENT-ROW-AGREED-TICKET), before-image first under a decision.
- A kickoff takes caps from class_autonomy (P10 - Tooling = 48/49); do not pass 3/4 by habit.
- Never hand-edit a kickoff: re-assemble. Designer sub-agents can write the kickoff/harvest files themselves (SendMessage) to keep entities out.
- The pick withholds unscored tickets (need_score < 3): any filed remainder must carry the parent's score (rule_capped_ticket copies it).

## Cross-cutting fences still open (each stops automation, whatever the ticket)
Stale red tests (AGT-304); the 60 s migration limit; the full runbook (finding filed: governance hygiene + Auditor weekly check); gate cards that wait on John.

## Opening prompt for the new session
"Continue the product-team self-completion RCA. Read docs/harvests/HANDOFF-product-team-self-completion-1009.md and memory project-cap-split-rule-2026-10-09. Start with directive 2: run AGT-427 slice 2 through the new cap route attended, then take directives 3, 4, 5 one at a time with the RCA-fix loop. Design session first; walk me through each root cause before any kickoff."
