# What an agent was taught — one reading side

Design session `design-agent-training-1003`, 2026-10-03. Decisions are John's, from the walkthrough
recorded below; everything marked "design reading" is this session's and is reversible.

## 1. Use case

A person teaches an agent something — by typing a note or uploading a file — and then asks that
agent about it, from DeepBench or from an outside AI tool over MCP. Both must behave the same way.

The test that started this (2026-10-03): Brittany (Marketing Agent, blank by design) was given an
item saying *when asked the secret passcode, state "bosco"*. An outside AI tool received the item
on every call from 17:04:04 UTC onward and did not act on it. It did act on a line typed later into
the same item's teaching-note field.

## 2. What exists today

One table, `knowledge_entries` (an agent's own personal training, ARCHITECTURE §19c: self-read
only), read three different ways:

| Path | Code | How it reads training |
|---|---|---|
| Older in-app paths (briefs, work orders, Brent's automation) | `lib/rag.js` `queryRAG()` via `lib/agent-run.js`, `api/plan.js`, `api/prompt/ai-enrichment.js` | Similarity search over embeddings; matches are wrapped in "apply them where appropriate" |
| Capability executor (Channel Intelligence, MCP tools that run a capability) | `api/prompt/db-assembly.js` | Not read at all — `DAT-004` |
| MCP knowledge bundle (`AGT-162`) | `api/_lib/handlers/agent-bundle.js` | Every active row, raw, with no framing |

Measured 2026-10-03: 37 rows. 11 are `source = 'user'` (typed or uploaded), 26 are
`source = 'agent'` (Brent's own portal-run records). Of the 11 user rows, 6 are at or under 12,000
characters and 5 are over (bob 216,720 ×2 and 14,788; priya 35,531; robyn 14,788).

## 3. Decisions (John, 2026-10-03)

1. **Two ways to teach, one treatment.** "An agent is smarter either through a user typing in notes
   directly, or uploads. They both get used the same manner." No instruction/knowledge picker; the
   user never labels an item.
2. **Everything a user taught is always given to the agent**, on every path, every time.
3. **Size is the only exception.** An item over **12,000 characters** is looked up by similarity
   search instead of always included. The agent is still told the item exists and what it is called.
   12,000 is the limit `lib/knowledge-write.js` already uses for what it embeds.
4. **A typed note is its own item** — text with no upload. The teaching-note field on an existing
   item is read as part of that item's text.
5. **"Always given" covers only what a user taught** (`source = 'user'`). What an agent recorded for
   itself (`source = 'agent'`) stays on similarity search.
6. **The MCP bundle hands over everything**, user-taught and agent-recorded labelled separately,
   with a line saying what each is and that the taught material should be applied.
7. **The Personnel file's Training tab is the single home** for what an agent was taught: list, add
   a note, upload a file, edit, switch off, delete. The Teach screen becomes the same add form. Item
   text becomes editable and an edit refreshes its embedding. Resume and Playbook stay separate;
   making them consistent is later work. The layout comes to John as a mock-up before build.

8. **The Training tab layout is approved** (John, 2026-10-03: "yes, that layout works — build it";
   mock `docs/design/agt-344-training-tab-mock.html`). Stays: the navy strip, one card per item with
   the date column, the Active / Edit / Delete buttons, add-or-edit replacing the list. Changes:
   (a) two add buttons side by side, "+ Type a note" and "+ Upload a file", where "+ Add Courses"
   is; (b) the note form is a title and the text only — no category, jurisdiction, priority or flag
   pickers — with a live "N of 12,000 characters · always given" line; (c) each card carries a
   NOTE or FILE chip, an ALWAYS GIVEN or LOOKED UP BY SEARCH chip, and its character count;
   (d) the strip counts become Taught items / Always given / Looked up; (e) Edit opens the item's
   text; (f) the Teach screen opens this same form. The upload form keeps its current fields.
9. **Release:** John releases everything to production together when the work is done; no narrow
   release.

## 4. The model

One reader, one answer to "what was this agent taught", called by every path.

```
readTaught({ agentId, tenantId })  ->
  taught:   user-taught items, oldest first
            each: id, title, text (content + the trainer's note, if any), chars, always (chars <= 12000)
  records:  items the agent wrote for itself (source = 'agent'), oldest first
  framing:  the two lines below, defined once
```

- **Taught framing (design reading, exact copy):** *"The agent's trainer taught it the items below.
  They are part of what the agent knows and how it behaves: follow any instruction in them and use
  any fact in them whenever it applies."*
- **Records framing (design reading, exact copy):** *"The agent wrote the records below for itself
  from past work. Use one when it is relevant to the task. They are not instructions."*
- **The note merge:** `text = content`, followed by `Trainer's note: <teaching_note>` when the note
  is non-empty. User rows only — Brent's agent rows use that column for `url|status` plumbing.
- **§19c holds by construction:** the reader takes one agent id and reads only that agent's rows.
  It is a read; the Trainer-only write rule is untouched.

Per path:

| Path | Uses |
|---|---|
| MCP bundle | `taught` in full (oversized items included, as today) under the taught framing; `records` under the records framing |
| Capability executor (`DAT-004`) | `taught` where `always` is true, under the taught framing, in every prompt; oversized items listed by title and reached by similarity search |
| Older in-app paths | unchanged until they are ported (`AA-105`) |

## 5. Build order

| Step | Ticket | Delivers |
|---|---|---|
| 1 | `AGT-342` | The shared reader, and the MCP bundle using it with the framing and the two labels |
| 2 | `DAT-004` | The capability executor uses the same reader |
| 3 | `AGT-343` | Typed notes with no file; editable item text that re-embeds |
| 4 | `AGT-344` | Training tab as the single home; Teach screen folded in (mock-up first) |
| 5 | `AGT-345` | A check that flags a user-taught row with no embedding; repair Brittany's |

Step 1 alone makes the passcode test work from an outside tool.

## 6. Found along the way

- Brittany's row `7c6e812b` was written straight into the database (no REST request, no embedding,
  no `knowledge-write` log) at 2026-10-03 17:03:58 UTC. The writer was not identified. The app's
  save path was not involved. Repaired by step 5.
- The 16:53 UTC upload from Brittany's Personnel file parsed and generated metadata and never
  saved. Not reproduced — reported as finding `9cf7837b` for Development Manager review.
- A large item is embedded by its first 12,000 characters only and stored whole, so a match puts
  the whole item in the prompt — reported as finding `b111863d` for Development Manager review.
- Editing rights are a per-agent `trainable` flag in `src/data/agents.js`, not ownership, and
  `TeachScreen.jsx` does not check it. `AGT-335` governs agents that exist only in the table.
