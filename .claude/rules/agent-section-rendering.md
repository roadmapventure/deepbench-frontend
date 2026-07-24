---
paths:
  - src/screens/**/*.jsx
---
# Rendering an agent's structured output

The screen holds no content policy. Render what the agent returned; render
nothing where it returned nothing.

Never write copy an agent failed to supply — no placeholder line, no "not
provided" label, no forced heading over an empty section. If content should be
guaranteed, guarantee it at the agent level (Skill instruction, guardrail,
reviewing agent), never in screen code. Removing hardcoding is the platform's
premise; a screen-authored sentence in an agent's card is hardcoding wearing a
helpful face.

Never render an agent-authored field straight into JSX with an `x.text || x`
fallback — when `text` is empty or null the object itself reaches React and
crashes the whole page (`CHI-65`: `{text, citations}`, React error #31). Unwrap
to a string, or render nothing. Not crashing is the screen's only job here; it
is a type guard, not a content decision.

Rationale: `docs/ARCHITECTURE.md` §19j.
