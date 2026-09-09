# Runner model lanes — repo-side snapshot of `public.runner_model_lanes`

<!-- GENERATED FILE — do not hand-edit. Regenerate with:
     SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node scripts/export-governance-snapshot.js
     The table in Supabase is the authority; this file is its only in-repo copy and the
     input scripts/render-rule-blocks.js's {{lanes}} marker reads. -->

**Lanes:** 3 · **Payload sha256:** `9f0f7eb0620cc679f418bc9444b0db963e6538d7d467f752c9be405389688648`

Cell escaping matches `docs/governance/RULES-SNAPSHOT.md`: `\` → `\\`, `|` → `\|`, newline → `\n`.
An empty cell is SQL NULL; the marker `\e` is a stored empty string. Every cell is padded with
exactly one space per side, and a reader removes one character per side rather than trimming.
Row order is fixed (orchestrator, judgment, mechanical), not alphabetical — the order a cycle
actually escalates through.

| Lane | Model id | Purpose |
|---|---|---|
| orchestrator | claude-opus-5 | Parent cycle: orchestrates, codes, QAs, ships (register B21). |
| judgment | claude-fable-5-1 | Judgment-dense delegated steps: kickoff design for P1-P5, root-cause diagnosis, invention scoring, P1-P4 classification (register B21). |
| mechanical | claude-sonnet-5 | Mechanical delegated steps: doc sweeps, imports, formatting (register B21). |
