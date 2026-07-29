# CHI-91 — a news-card article that can't be read explains itself

Filed 2026-07-29 (`S-LOG-109-design`), folded into `LOG-109` on John's explicit call. Shipped
v6.3.216 (`e89d465`). This file holds the detail; `docs/FEATURES.md`'s row is the pointer.

## The problem

`api/fetch-article` knows exactly why it failed at the instant it fails — 403, or 200-with-84-
characters, or a timeout — and then collapses every case into a generic 500/502.
`MarketIntelligenceScreen.jsx` wrote `res.status` to a browser console nobody reads and submitted
`article_content: null`. So the user saw an unexplained non-answer, and Marcus Webb — GEO CSO
Expert was given no explanation either.

## Why it exists as its own row

`LOG-109` was scoped as pure observability: it makes the cause *decidable after the fact* for
whoever reads AI Audit. It does not change what the user sees. John asked whether the new data
ever finishes the Q&A or is "just a logging service," which surfaced this as the separate,
user-facing half. He chose to fold it in rather than defer it.

## The §19j split — why the screen is allowed to speak here

`.claude/rules/agent-section-rendering.md` forbids the screen writing copy an **agent** failed to
supply. That governs an agent's structured output; it does not govern a platform fault report.
`HAR-15`'s `CREDIT_EXHAUSTED_TEXT` is the standing carve-out, tagged in-file as "Platform fault
report, not agent content (§19j)." A publisher blocking DeepBench is DeepBench reporting its own
failure.

The agent's half goes the other way round, and must: the screen passes **facts**
(`article_unavailable_reason: { http_status, extraction_outcome }`) and `ci-answer-intent`'s
`method` tells Marcus Webb — GEO CSO Expert to phrase them himself. Passing him a prewritten
sentence would be the actual §19j violation.

`HAR-15`'s other half applies to the copy: it is honest about whether retrying helps. A blocked
publisher and an unreadable page fail identically forever; a timeout may not.

## Approved copy (John, 2026-07-29 — verbatim, do not reword)

- `This publisher didn't respond in time — retrying may work. Answering from the headline alone.`
- `This page had no readable article text — retrying won't help. Answering from the headline alone.`
- `This publisher blocks automated readers — retrying won't help. Answering from the headline alone.`

## Verified live 2026-07-29 (gate items 8 and 9)

- **Item 8 PASS.** Given the facts, Marcus Webb — GEO CSO Expert opens *"The source article on EMEA
  distributor consolidation could not be retrieved, so I cannot ground this analysis in the specific
  industry trend. Working from the headline and channel expertise alone:"* — his own words, business
  framing, no status code, no field name, not the screen's sentence.
- **Item 9 PASS, and it was worth testing.** The screen spreads the key unconditionally
  (`task_context: { goal, ...backgroundContext }` — no null-stripping), so on a *successful* fetch
  `article_unavailable_reason` is present with a `null` value while the Skill instruction triggers on
  the field being "carried." Suspected defect. Measured instead of patched: given a real article plus
  the null key, he opens *"The article describes a consolidation that's already reshaping EMEA's
  two-tier channel"* and cites it throughout — substantively identical to the no-key control. The
  present-but-null key is harmless.
- **`articleFaultText` in the live browser bundle** — all three sentences exact, `may work` only for
  the timeout case, `null` returns `null` so no empty bubble renders.

## What is still unverified (gate items 6, 7, 11)

**Seeing the bubble actually render in the chat.** Blocked by `SES-47`'s Vercel cap — 129 deploys in
the rolling 24 h window, and no build fired for `e89d465` or for a follow-up poke commit (17 minutes,
zero builds). A local Vite server has no `/api`, so no news cards load at all (`SES-55`'s gap).

What remains unproven is narrow: the one-line
`setMessages(prev => [...prev, buildMessage({ kind: "error", text: faultText })])` — the identical
mechanism four existing error bubbles in the same file already use, unchanged by this session. One
news-card click on the dev URL after any future build closes items 6, 7 and 11 together.

## Residue — deliberately not covered

When the **fallback succeeds**, the user still silently receives an AI-search summary instead of the
real article, with no indication. Confirmed live this session: `example.com` fell back, the route
returned `200 / ai_summarized`, `primary_failure` was `null`, and no bubble fires — correct per this
scope, but the user is still not told. Marcus Webb — GEO CSO Expert *is* told, via the
`article_source: 'ai_summarized'` that has flowed since `CHI-33`. Closing this needs its own copy
decision from John.
