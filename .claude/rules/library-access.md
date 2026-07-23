---
paths:
  - lib/librarian.js
  - lib/search-harness.js
---
# The Library / Reasoning stores — one path, never shared

`the_library` has exactly one write path — the broker in `lib/search-harness.js`
(`lib/librarian.js`'s exports are thin wrappers). `knowledge_entries`, `the_library`,
and `the_reasoning` are physically separate stores that never share a code path — no
file but `lib/search-harness.js` imports their primitives, and dispatch is by the
generic `store` field, never an identity conditional. Physical separation is the
trust boundary; do not merge it behind a flag.

Rationale: `docs/ARCHITECTURE.md` §19c, §19f.
