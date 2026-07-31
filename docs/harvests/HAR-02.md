# HAR-02 (Speed) — prompt caching: cost measurement 2026-07-31

Measured by `design-scaling-arch-0731` from Supabase `ai_activity_log`, last 30 days, deduplicated
per the `LOG-81` counting rule (model named; duplicate `agent-turn` halves of AI-51 pairs excluded
via same-trace/same-tokens/<10s match).

## Headline

- **Total Claude spend ≈ $195/30d** (list-price estimate from token sums; the table's own summed
  `cost_usd` was not used for this cut). Input tokens ≈ **72% of spend** (~$140), output ~28%.
- Haiku 4.5: 13,503 calls, 110.2M input / 7.1M output ≈ $110 + $35.
- Sonnet 4.6: 1,800 calls, 9.8M input / 1.3M output ≈ $29 + $19.
- Daily trend (raw rows, 10 days): busy QA days **$17–25/day** (Jul 28 ≈ $25, Jul 29–30 ≈ $17);
  quiet days $2–7. John's "$20/day" budget matches the busy-day rate, and busy days are
  regression/QA days — back-to-back identical-prefix calls inside the 5-minute cache TTL.

## Repeated-prefix floor (why caching pays)

Per capability, low-percentile input size used as proxy for the stable prompt base:

| feature (model=Haiku unless noted) | calls | input tok | avg in | p10 in |
|---|---|---|---|---|
| web-search-news:ws-news-search-intent:depth0 | 344 | 36.5M | 106K | 47K |
| request-receivable | 5,122 | 18.5M | 3.6K | 1.2K |
| project-manager:agent-selection-intent:depth1 | 1,323 | 15.1M | 11.4K | 8.7K |
| channel-intelligence:ci-answer-intent:depth0 | 771 | 6.4M | 8.3K | 3.4K |
| pattern-vocabulary-review:...:depth0 | 159 | 5.7M | 36.1K | 16.1K |
| quality-gate:qg-review-intent:depth0/1/2 | 1,488 | 8.2M | 4–7K | 3–6K |

Conservative floor: **≥⅓ of input tokens are stable repeated content** (calls × p10 across top
groups). True cacheable share is higher: multi-hop agent loops re-send the growing conversation
prefix on every hop, which prefix caching also captures. Cache reads bill ~0.1×; 5-min-TTL writes
1.25× (break-even at 2+ reads — regression runs clear that easily).

**Realistic effect of shipping HAR-02: 30–50% off the monthly bill, concentrated on heavy QA days.**

Side finding filed separately: `HAR-27` (web-search-news payload cost — 19% of total spend in 344
calls; a payload-shape fix, not a caching fix).
