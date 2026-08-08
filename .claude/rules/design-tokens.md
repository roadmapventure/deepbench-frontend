---
paths:
  - src/**/*.js
  - src/**/*.jsx
---
# Design tokens — single source

Never hardcode color, font, or spacing values in a component. Import from
`src/tokens.js` — the Treasury palette and fonts are defined there once. A literal
hex or font-family value in a component is the bug, not a shortcut.

Rationale + the palette/font values: `docs/STYLE-GUIDE.md`, `docs/ARCHITECTURE.md` §13.
