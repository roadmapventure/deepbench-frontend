---
paths:
  - src/screens/**
  - src/AppShell.jsx
  - src/main.jsx
---
# Autonomous surface changes — Automated mode only

Applies ONLY to Automated-mode sessions (runner-stamped — see docs/GOVERNANCE-MODES.md).
Manual Design & Build sessions are untouched by this file.

- Zero deleted lines in existing `src/screens/*` and `src/AppShell.jsx` (`git diff --numstat`
  vs origin/dev). Additions to an existing screen: one import + one flag-guarded mount, only.
- New screens ship route AND nav entry inert behind a default-off flag (a data row, `HAR-41` —
  never a code constant). New work lives in new files.
- A diff that deletes lines here is an appearance change: flagged or gated, never shipped bare.

Rationale: `docs/ARCHITECTURE.md` §19v (lane routing / exposure rule).
