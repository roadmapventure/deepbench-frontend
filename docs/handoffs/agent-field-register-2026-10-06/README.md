# Handoff: the Agent Field Register (discovery-1005, 2026-10-06)

**From:** `discovery-1005` (a discovery session with John on agent training and MCP)
**To:** the session that starts updating functionality and the UI from John's analysis
**Status:** INPUT. John's decisions are recorded here and nothing has been built from them yet.

## What this is

A table of every field a DeepBench agent carries plus every data element the Personnel page
shows, built so John could mark up what to change. 113 rows. Each row says where the data lives,
whether the Personnel page shows it, whether it is sent to an AI client in a handover answer,
whether an AI client can update it (the Teach tool, `AGT-390`), and whether anything ever
updates it. The yellow columns (Reviewed, Your decision, Your note) are John's.

It was a published artifact with its own small database. The artifact is the live copy; this
folder is the backup that lets anyone recreate it.

- Live artifact: https://claude.ai/artifact/CyLXYhju9s9nW7Lyb2LbsE (private to John)
- Snapshot taken 2026-10-06, page version 15.

## Files

| File | What it is |
|---|---|
| `snapshot.json` | All 113 documents, every column, John's decisions and notes included |
| `decisions.md` | A readable list of the 64 rows John decided or noted, with counts by decision |
| `register.html` | The page source, exactly as published (version 15) |
| `to-batch.cjs` | Turns `snapshot.json` back into ArtifactData batch files |

## To recreate the artifact

1. Publish `register.html` with the Artifact tool. Declare these capabilities, exactly:
   `{"db": {"rules": [{"path": "fields", "read": "view", "write": "interact"}]}, "user": {}}`.
2. Run `node docs/handoffs/agent-field-register-2026-10-06/to-batch.cjs <a scratch folder>`.
3. For each `batch-N.json` it writes, call ArtifactData with `action: "batch"`, the new
   artifact's `url`, and that file's contents as `writes`.
4. Read one collection back (`action: "list"`, collection `fields`) and check 113 documents.

Documents are plain JSON; the store has no schema. The page keeps its column choices and order in
the viewer's own browser, so those are not in the snapshot and do not need restoring.

## What John decided (counts of rows; a row can carry several)

| Decision | Rows |
|---|---|
| Move to Future View | 28 |
| Discuss | 15 |
| Add an editor | 15 |
| Add to AI client | 8 |
| Hide from AI client | 7 |
| Remove from page | 6 |
| System should update | 4 |
| AI Client can update | 2 |
| Add to Personnel page | 1 |

67 rows are marked Reviewed: Complete; none are on Hold. 12 rows carry a note, all questions to
discuss. The full list is in `decisions.md`.

## What the analysis found (verify before building on any of it)

All of this was measured on 2026-10-05 and 2026-10-06 against the code on `origin/dev` and the
live database. Treat it as a pointer to re-check.

- Nothing in the product writes the `agents` table after creation, except the Remove agent button
  (`archive_private_agent`). The table has no `updated_at`. Rating and usage count are 0 on all 37
  agents.
- Two handover designs exist: `deterministic` (hands the taught material to the AI client, no model
  runs; every agent made on the create screen, plus Brittany) and `ai` (DeepBench's model answers
  from the agent's Skills; the roster agents).
- The `AGT-390` Teach tool inserts a new `agent_configs` row on every call. The Playbook page
  edits only the first `always` and first `never` guardrail row, so a second one taught from an AI
  client is sent to clients but never shown there.
- The handover sends every role prompt and every output format, default or not, and drops the
  `voice` section.
- `data_room_access` is returned to AI clients and is not displayed anywhere in the UI.
- The Personnel page mixes real data with hardcoded text and sample data: the ACTIVE badge, the
  Bureau of Procurement Intelligence heading, Reports Run, Documents, Active Work Assignments, and
  the Update Cadence and Visibility lines are constants.
- `/api/mcp` and `/api/mcp/<agent id>` list and run `ai` Capabilities for any caller who clears the
  access gate, with no key. John ruled this waits while only private agents are being created.
  Filed as audit finding `mcp-ai-capabilities-open`.

## Not verified

- Whether archiving an agent also turns off its AI link.
- What the Skill hover card on the Profile tab shows.
- Whether any agent has Report Card rows.
- Where the model path uses a training entry's priority.
- Whether the handover returns the origin and date tags `AGT-390` writes.

## Where to start

John's plan is to use this register to decide what to update first. Start with the 15 rows marked
Discuss and the 12 rows with a note, one at a time, then the groups he decided.
