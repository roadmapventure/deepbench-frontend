# HAR-38 — the per-IP spend cap: predicted, tripped, and lifted in one day

Filed by `audit-pattern-coverage-0810` (2026-08-10, from `ip_spend_report`); tripped and then
discharged the same evening by `design-log-138-0810`. Row: `docs/FEATURES.md`.

## As filed — the prediction

Beta-gate (bucket 1): a block here stops every live CHI run, so the 24-case regression pass cannot
complete. John's home IP `136.60.22.58` ("John — home", Google Fiber Austin) sat at **$9.8669 of
its $10.00 trial cap — $0.13 of headroom**, 1,237 llm_calls. Not theoretical: `136.60.33.12` (same
org, same city) was already `permission: blocked`, `block_reason: spend_cap`, blocked 2026-08-08
with 2 blocked attempts. The next demo or live-QA session could trip it mid-run.

## What actually happened, ~6 hours later

**2026-08-10 23:29 CST / 2026-08-11 00:29:48 UTC**, during `LOG-138`'s live QA: `136.60.22.58`
crossed to **$10.01 of $10.00**, 1,257 llm_calls, and the middleware wrote `permission: blocked`,
`block_reason: spend_cap`.

The important detail is what consumed the headroom: **one browser CHI run plus six
single-embedding probes** — an ordinary QA pass, not a demo and not a regression sweep. $0.13 was
not enough margin for a single routine session. Every model-triggering call from that address then
403'd, including John's own browsing of dev and bucket 1's 24-case re-baseline.

No duplicate row was filed for the event; this is the event `HAR-38` was opened for.

## First half discharged — John's decision, cap $10 → $20

Applied to `ip_org_cache` for `136.60.22.58`: `spend_limit_usd` 10.00 → 20.00, `permission`
`blocked` → `trial`, `block_reason` and `blocked_at` nulled. `blocked_attempts` (3) deliberately
kept as history.

**The trap, for the next session that "just raises the cap":**

```
middleware.js, in order:
  1. permission === 'unlimited'  -> pass
  2. permission === 'blocked'    -> REFUSE   <-- returns here, unconditionally
  3. geo check
  4. spent >= spend_limit_usd    -> refuse   <-- the cap is only compared HERE
```

Raising `spend_limit_usd` alone changes nothing while the row still says `blocked`, because step 2
returns before step 4 is ever reached. The row keeps 403ing at any cap. **Both fields must move
together.** This is easy to get wrong precisely because the block *reason* is `spend_cap`, which
invites the assumption that the cap value is what's being tested.

Verified live after the change: a real call to `/api/rag-query` returned 200 and logged its row.
Roughly $10 of headroom now stands against a pass that consumed ~$0.13-plus-change — about 2× one
QA pass, so a 24-case run should fit, but it is not unlimited. Check `ip_spend_report` before a
long run.

Knock-on: clearing the block also unblocked `LOG-138`'s one outstanding QA item (root `/` →
`live-agent-console`), which was re-run and passed — taking that session to 8 of 8 live.

## Withdrawn note

An earlier annotation on this row observed that `ip_org_cache.user_label` for this IP read
`Susan Onufer` while the row's own text called it "John — home", and flagged the discrepancy
without adjudicating it. **Withdrawn:** the concurrent `HAR-37`/`DAT-22` relabelling work has since
restored it to "John — home (Google Fiber 136.60.x; desktop+mobile, dev QA + production)". No
discrepancy remains.

## Still open — the second half, untouched

`GATE_BYPASS_SECRET` has no working retrieval path: the Vercel API redacts `sensitive` env values
on `decrypt=true` reads, and `vercel env pull` blanks every value. `S-LOG-137`'s two live calls, and
every live call since including `LOG-138`'s QA, proceeded on `x-vercel-protection-bypass` alone.
Needs a documented retrieval path (or a decision that the protection-bypass header is sufficient
and the gate-bypass header is retired from the QA playbook).
