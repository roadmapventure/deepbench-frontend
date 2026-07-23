# DeepBench — Rules & Reference (pointer index)

> Read only when you hit a specific pattern or rule question mid-session. Not required
> at session start. Every rule has exactly one home; this file points to it, never
> restates it — so a rule can't go stale in two places at once.

- **Versioning & session naming** → `docs/STANDARDS.md` §1. Version numbers are claimed
  atomically from Supabase per the `session-setup` skill (`CLAUDE.md`'s Atomic-counters hard rule) — never hand-incremented.
- **Session scope** (1 feature / max 3 files / max 4 tasks / Node test + `npm run build`
  before commit / STOP on compacting / no `dev → main` without John) → `docs/STANDARDS.md` §2.
- **Design tokens, palette, fonts** → `src/tokens.js` (the values) + `docs/STYLE-GUIDE.md`.
  Never hardcode token values anywhere else.
- **Agent roster** → `src/data/agents.js` (identity/display fields only; prompts and
  capability logic live in Supabase) + `docs/STANDARDS.md` §11 (required fields) +
  `docs/ARCHITECTURE.md` §14 (config model). No hardcoded roster tables or counts in docs.
- **Step operations** (`initializeStepsFromSupabase` / `…FromFirstPlan` / `updateStepsFromPlan`)
  → `docs/ARCHITECTURE.md` §15.
- **AI call standards** (model selection, structured output, explicit `max_tokens`, `✦ AI`
  badge) → `docs/ARCHITECTURE.md` §12.
- **Critical code patterns** (string safety, `sessionStorage` before `navigate()`, `useRef`
  on remount, base64 file upload) → `docs/STANDARDS.md` §5 (checklist) / §8 (BUG-9).
- **Supabase schema** → `docs/ARCHITECTURE.md` §9, with the Library/Reasoning stores in
  §19c / §19f.
- **Pre-commit checklist** → `docs/STANDARDS.md` §5.
- **Stack / URLs / repos** → `docs/ARCHITECTURE.md` §10–11.
