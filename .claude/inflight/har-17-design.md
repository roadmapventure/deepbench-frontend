Worktree `har-17-design` — design session on HAR-17 (Task Success Rate), transient-failure auto-recovery per §19o.

Decisions confirmed with John (to fold into ARCHITECTURE.md §19o + kickoff at close-out):
1. Classification stays exactly §19o's three transient classes; AA-126/AA-142 model-behavior guards stay permanent (0 occurrences in all 149 persisted failures, verified live 2026-07-28).
2. §19o open question on HAR-14 answered: present-but-empty joins the transient class in principle via HAR-14's own future session; classifier keys on validation-failure shape so no HAR-17 rework.
3. Visibility (supersedes drawer wording in §19o + `.claude/rules/transient-failure-recovery.md` — amend both at close-out): NO drawer row; recovery surfaces in the CHAT working-status line ("hit a snag, self-recovered"), and the displayed "expect >" estimate EXTENDS by the re-run cost.
4. Model: Fable 5 for kickoff + coding agent (inherit, no override).

Adversarial audit (workflow wf_618504d6-c0e, 8 agents, 92 failure paths, 3 lenses all broken=true) — design revised:
- Recovery classification/catch lives ONLY at runLoop()'s callModel() seam (per-site scoping): dispatch-interior/bookkeeping/sendRequest-stage failures stay non-recoverable in v1 (prevents deliverable duplication + terminal-turn loss).
- Recovery marker: NOT depth-keyed (unsound across resume re-entry); use per-row recovery ledger; marker writes must be CHECKED (patchDurableHopRow never checks res.ok — must fix for marker path).
- upstreamStatus captured structurally at request-receivable.js:227 (res.status read BEFORE body); statusless raw errors (TimeoutError/AbortError/TypeError/json-reject) transient ONLY at callModel site; statusless default bucket = permanent; 429-exhausted explicitly transient; classifier lives in execute.js, never request-receivable.js (shared by plan.js etc.).
- Client visibility mechanism: recovery flag rides the in_progress RESPONSE body (resolveInProgress sees it on every call site, streamed or not) — no SSE event, no onDelegationProgress sink, avoids LOO-17 streamed-closeout trap. workingStatus stores raw expectationMs; recovery payload carries agent_id/intent_slug for p90 extension. resolveInProgress: throw on status==='failed'; recovery continues excluded from MAX_CONTINUE_ITERATIONS.
- Persist enable_web_search on durable_hops (HAR-05 accepted-gap premise is false under HAR-17); delegationRetried doubling accepted+documented as bounded.
- Pre-existing LIVE bugs found (need own rows + fix-first ordering): (a) broker execute.js:547 + critique :809 lack nested in_progress/nested_checkpoint handling (today's budget checkpoint inside those chains already corrupts); (b) streamed 'continue' branch (execute.js:1365) lacks LOO-17 confirmation closeout.
- Scope: splits into HAR-17a (prereq nested-checkpoint fix) / HAR-17b (server seam) / HAR-17c (client status) — awaiting John's stop-gate approval.

Full verdict details: scratchpad har17-verdict-details.txt; full inventory: tasks/wvyu0hjx3.output.
