# `CHI-95` — `api/fetch-article.js` returns 200 with a conversational refusal as article text

Detail moved out of `docs/FEATURES.md`'s row at filing time 2026-07-29 (`design-ses-57`) per
`CLAUDE-DESIGN.md` step 9's 2,000-char cap. Found while QA'ing `SES-57`; measured against the
deployed route, not inferred. Session narrative: `docs/SESSIONS.md`, `S-SES-57-design / S-SES-57`
(v6.3.230).

## The defect

`Beta-gate (bucket 1)`. The fallback path only checks `if (!summary)` (`api/fetch-article.js:114`),
so **any** non-empty string passes as article `text` and the route returns 200. The honest-gap path
`CHI-91`/`SES-57` built therefore can never fire: `res.ok` means the screen sets
`article_unavailable_reason: null`, and `ci-answer-intent`'s ARTICLE UNAVAILABLE clause is gated on
that key being present.

## Two real deployed calls, 2026-07-29

**Paywalled `wsj.com` URL** → `source: "ai_summarized"`, HTTP 200, 921 chars:

> "I was unable to directly access the specific WSJ article at that URL, as it is behind a paywall.
> However, I can share what related reporting from the Wall Street Journal and other sources reveals
> about AI chip demand in 2026, **which is likely the subject of that article**…"

A summary of *adjacent* reporting Claude *guessed* at, hedged as "likely the subject."

**Deliberately nonexistent `ft.com/content/does-not-exist-ses57`** → `source: "ai_summarized"`,
HTTP 200, 878 chars:

> "I'm sorry, but I'm unable to access that URL… appears to contain a path that suggests the page
> does not exist… Here's what I **can** do: 1. Web Search… 2. Paste the Text… How would you like to
> proceed?"

A chatbot's turn-taking prompt, delivered as the article.

Both arrive with `article_unavailable_reason: null`, so Marcus Webb — GEO CSO Expert analyzes them as
if they were the article. No fabrication in either case — but no honest gap either.

## Why bucket 1

Regression test #24 is a bucket-1 gate and Owen — Proofreader would judge content founded on a
guess. And it is `BETA.md` §1's "nothing lying" bar directly: a reviewer clicking a paywalled card
gets analysis of an article the platform never read, undisclosed.

The route *does* prefix `"(AI-summarized from search -- full text unavailable, likely paywalled or
bot-blocked)"`, so the disclosure exists **inside** `article_content`. Whether it reaches the user is
model-dependent — the instruction-only-wording class that has already lost repeatedly here
(`CHI-94`).

## Fix direction

Classify the fallback's own outcome rather than trusting non-emptiness. `usedWebSearch` is already
computed at `:111` and currently only feeds `patternsUsed` — if the search never fired, or the
summary declines, return the failure with `primary_failure` instead of 200. Then `SES-57`'s plumbing
carries a real reason and the gap acknowledgment fires.

## Relationship to `SES-57` — CORRECTED 2026-07-29 (`S-SES-62` QA)

**As filed, this row claimed the defect made the honest-gap path unreachable, so `SES-57`'s live
impact was latent and its QA items 6/7 were blocked on it. That was an overgeneralization from two
samples, and the first live run to reach a verdict supplied the counter-example.**

On that run the news card was `https://www.apple.com/newsroom/2026/07/apple-upgrade-launches-in-the-united-states/`.
The route returned a **real classified failure** — `{http_status: 401, extraction_outcome:
"not_attempted"}` — meaning the primary fetch got a 401 *and* the AI fallback also failed, so the
non-OK branch was taken. `SES-57`'s Article Context Resolver carried the reason through, and Marcus
Webb — GEO CSO Expert's answer (pulled from `deliverables`, not the judge's paraphrase) opened:

> "The article from Apple's newsroom could not be retrieved — the platform was unable to access the
> full text. I'm working from the headline alone, which tells me Apple has launched a new offering
> called \"Apple Upgrade\" in the United States, but I don't have the specifics of what it does…"

No status codes, no field names, then real reasoning from two cited Data Room facts. That is
`ci-answer-intent`'s ARTICLE UNAVAILABLE clause firing exactly as instructed — **so this row's own
inherited acceptance criterion (`SES-57`'s old QA item 6) is already satisfied**, and `SES-57` closed
on its revised gate the same session.

**What remains real and unfixed** is narrower than filed but still a `BETA.md` §1 "nothing lying"
defect: when the AI fallback *does* return something, a refusal or a guess passes as article text.
Both measured transcripts above stand unchanged. It no longer blocks any other row.

**Before sizing the fix, measure the branch split** — how often the route returns a real classified
failure (as here) versus a refusal-as-content (as in the WSJ/FT transcripts). The two measurements
that produced this row and the one that corrected it are three data points, not a distribution.

## Related

`SES-64` (Task Success Rate, `Beta-gate (bucket 1)`) came out of the same run: regression test #24
is hardcoded `outcome_class: "rich-answer"`, so the correct honest-gap answer quoted above was
scored against the rich-answer bar and failed `actionable_guidance_present`. Distinct from this row
— that is the test engine's rubric selection, not the route's classification.
