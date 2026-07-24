---
paths:
  - src/screens/**/*.jsx
---
# Rendering an agent's structured output

Never render an agent-authored field straight into JSX with an `x.text || x`
fallback — when `text` is empty or null the object itself reaches React and
crashes the whole page (`CHI-65`: `{text, citations}`, React error #31). Unwrap to
a string, or render nothing; never let the object through.

Never write the copy an agent failed to supply. A missing finding is not the
screen's sentence to author — the content specialist who ran the analysis is the
only party that knows whether it looked. Platform placeholder text in an agent's
voice is the bug, not the fallback.

Never hide a section just because it came back empty — an absent section reads as
an oversight, not a finding. Show it with the agreed fallback line instead
(`No input at this time`), and never restyle that line to match real section
content: it is muted/italic on purpose, because the wording alone does not signal
that something broke.

Rationale + the two still-open questions: `docs/ARCHITECTURE.md` §19j.
