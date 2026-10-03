# design-agent-training-1003

Worktree: `.claude/worktrees/design-agent-training-1003` (branch `session/design-agent-training-1003`, from `origin/dev` @ fbbc053c).
Started 2026-10-03. Design session: one reading-side definition of "what this agent knows", shared by the in-app paths and the MCP knowledge bundle. Related: `DAT-004`, `AA-02`, `AA-105`, `AGT-162`.

## Walkthrough decisions (John, 2026-10-03)

- Q1 — agreed: taught material is one of two kinds. **Instruction**: always given to the agent, on every path, every time. **Knowledge**: looked up when relevant in-app; handed over in full to outside tools, labelled as reference material.
- Q2 — agreed: the upload's existing metadata model call suggests the kind; the user sees it and can change it before saving (Teach screen and Personnel Training tab); it can be changed later from the Training tab's edit view; existing entries become Knowledge.
- Q3 — John's simplification (his words): "an agent is smarter either through a user typing in notes directory, or uploads. They both get used the same manner." Two inputs (typed note, uploaded file), one treatment.
  - Confirmed by John 2026-10-03 ("yes, that's right"). A typed note is its own item (text with no upload); the note field on existing files is read as part of that item's text; the MCP bundle hands over everything with a line saying this is what the agent was taught and should apply. The reading: this replaces Q2's user-picked kind and Q1's labelled split with one rule — everything taught is always given to the agent on every path; only items too large to always include are looked up by search instead (size decides, not the user). Largest rows today: bob 216,720 chars, priya 35,531.
- Q4 — agreed: "always given" covers only what a user taught (`source = 'user'`, 11 rows today). What an agent recorded for itself (`source = 'agent'`, Brent's 26 run records) stays on similarity search. The MCP bundle hands over both, labelled separately.
- Q5 — agreed: the Personnel file's Training tab is the single home for what an agent was taught (list, add a note, upload a file, edit, switch off, delete); the Teach screen becomes the same add form; item text becomes editable and an edit refreshes its embedding; Resume and Playbook stay separate, consistency there is later work. Layout comes to John as a mock-up before build.
- Q6 — agreed: an item up to 12,000 characters is always given, larger is looked up by search. Build order: (1) one shared reader + MCP bundle uses it with the "apply this" framing and separate labels; (2) in-app executor uses the same reader (`DAT-004`); (3) typed notes without a file + editable text that re-embeds; (4) Training tab as single home, mock-up first; (5) a check for user-taught rows missing an embedding + repair Brittany's. John's go-ahead to write the design doc and the step 1 kickoff given 2026-10-03.

## Findings not yet filed

- Editing rights are a per-agent `trainable` flag in `src/data/agents.js`, not ownership; `TeachScreen.jsx` does not check it. Agents that exist only in the `agents` table get no editing until `AGT-335`.
- `lib/knowledge-write.js` embeds only the first 12,000 characters of an item and stores no chunks; a match returns the whole item (bob's 216,720-char row lands in the prompt whole).

- Brittany's `knowledge_entries` row `7c6e812b` was written straight into the database (no REST request, no embedding, no `knowledge-write` log) at 2026-10-03 17:03:58 UTC; source not identified. It still has no embedding.
- The 16:53 UTC upload from Brittany's Personnel file parsed and generated metadata but never saved; not reproduced.
- The MCP knowledge bundle hands over training entries raw, with no framing on how to treat them.
