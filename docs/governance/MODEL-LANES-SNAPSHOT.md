# Runner model lanes — repo-side snapshot of `public.runner_model_lanes`

<!-- GENERATED FILE — do not hand-edit. Regenerate with:
     SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node scripts/export-governance-snapshot.js
     The table in Supabase is the authority; this file is its only in-repo copy and the
     input scripts/render-rule-blocks.js's {{lanes}} marker reads. -->

**Lanes:** 3 · **Payload sha256:** `bbf86c70d04e38fd5e64747b965df534018a03e8e2e5913cfdb5a433f484582e`

Cell escaping matches `docs/governance/RULES-SNAPSHOT.md`: `\` → `\\`, `|` → `\|`, newline → `\n`.
An empty cell is SQL NULL; the marker `\e` is a stored empty string. Every cell is padded with
exactly one space per side, and a reader removes one character per side rather than trimming.
Row order is fixed (orchestrator, judgment, mechanical), not alphabetical — the order a cycle
actually escalates through.

| Lane | Model id | Purpose |
|---|---|---|
| orchestrator | claude-opus-5 | Parent cycle: orchestrates, codes, QAs, ships (register B21). |
| judgment | claude-fable-5 | Judgment-dense delegated steps: kickoff design for P1-P5, root-cause diagnosis, invention scoring, P1-P4 classification (register B21). |
| mechanical | claude-sonnet-5 | Mechanical delegated steps: doc sweeps, imports, formatting (register B21). |
