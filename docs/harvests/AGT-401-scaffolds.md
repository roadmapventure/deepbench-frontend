# AGT-401 - what each AI client receives (v7.0.820, measured 2026-10-08)

Two live `tools/call` pulls against `dev`, each written to disk byte for byte and measured by the
pure `measureReply()` in `scripts/pull-scaffold.mjs`. Every number below is re-derivable from the
committed reply with `node -e 'import("./scripts/pull-scaffold.mjs").then(m => console.log(m.measureReply(require("fs").readFileSync("docs/harvests/AGT-401-brittany.json","utf8"))))'`,
and `tests/regression/agt-401-scaffold-evidence.test.mjs` re-derives them on every suite run, so this
file cannot drift from the bytes it describes. Measured facts only — there is no proposal here.

The two agents were chosen because they sit at opposite ends of the scaffold: Brittany holds taught
items and no Skills at all, Nathan holds Skills across eleven capabilities and nothing taught.

## Brittany — her own agent address

- **Address:** `POST https://deepbench-frontend-git-dev-roadmapventures-projects.vercel.app/api/mcp/brittany`
- **Tool:** `brittany-knowledge` (own-knowledge, `required []`), so `task_context` is `{}` — the
  address already names whose scaffold is meant (ARCHITECTURE §19e Rule #1).
- **HTTP status:** 200, `result.isError` false
- **Brittany reply chars: 2271** (`result.content[0].text`; 4428 bytes on the wire once the
  JSON-RPC envelope and its escaping are counted)
- **Keys (10):** `agent`, `role_prompts`, `guardrails`, `output_formats`, `sections`, `taught`, `records`, `knowledge_entries`, `library`, `no_inference` — `no_inference` is true

| slug | label | type | content chars | fetch method |
|---|---|---|---|---|
| _no sections_ | — | — | — | — |

```
Sections: 0. She holds no Skill Profiles, so the assembler produces nothing — no ROLE & IDENTITY, no BEHAVIOR, no CONSTRAINTS & GUARDRAILS. A client pulling Brittany receives her card (5 fields: id, name, role, specialty, bio) and what she was taught, and no instructions of any kind.
Knowledge sections: 0; 0 empty-with-fetch. Nothing to retrieve and nothing claiming it could be.
EXECUTION PLAN: absent. No Skill of hers lists `reflect`.
Origin and date tags: origin absent, created_at absent. Her 3 taught items arrive as `id, title, text, chars, always` and nothing else — live, "Needs a new couch" carries `origin 'mcp'` and a `created_at` on its row, and neither reaches the client.
Size: 2271 chars total, of which the taught block is 220 chars across 3 items (3 of them `always true`) plus 181 chars of framing. `records` 0, `knowledge_entries` 3 (the index over both). `library.data_room_access` [], tier `denied-no-access`, 0 records.
```

## Nathan — the admin address

- **Address:** `POST https://deepbench-frontend-git-dev-roadmapventures-projects.vercel.app/api/mcp`
- **Tool:** `dan-db-assembly` (holder `dan`, product lane, `traits.any_agent true`, `required ["agent_id"]`),
  so `task_context` is `{ "agent_id": "nathan" }`. Nathan holds no bundle tool of his own — his eleven
  are `pmm-*` — and an any-agent tool is listed on the admin address only, so this is the only route
  by which his scaffold is reachable at all.
- **HTTP status:** 200, `result.isError` false
- **Nathan reply chars: 172927** (`result.content[0].text`; 346041 bytes on the wire)
- **Keys (10):** `agent`, `role_prompts`, `guardrails`, `output_formats`, `sections`, `taught`, `records`, `knowledge_entries`, `library`, `no_inference` — `no_inference` is true. The
  same ten keys Brittany's reply carries; the shape does not vary by agent.

| slug | label | type | content chars | fetch method |
|---|---|---|---|---|
| `identity` | ROLE & IDENTITY | stored | 911 | — |
| `identity` | ROLE & IDENTITY | stored | 911 | — |
| `identity` | ROLE & IDENTITY | stored | 911 | — |
| `identity` | ROLE & IDENTITY | stored | 911 | — |
| `identity` | ROLE & IDENTITY | stored | 911 | — |
| `identity` | ROLE & IDENTITY | stored | 911 | — |
| `identity` | ROLE & IDENTITY | stored | 911 | — |
| `identity` | ROLE & IDENTITY | stored | 911 | — |
| `identity` | ROLE & IDENTITY | stored | 911 | — |
| `identity` | ROLE & IDENTITY | stored | 911 | — |
| `identity` | ROLE & IDENTITY | stored | 911 | — |
| `behavior` | BEHAVIOR | stored | 866 | — |
| `behavior` | BEHAVIOR | stored | 866 | — |
| `behavior` | BEHAVIOR | stored | 866 | — |
| `behavior` | BEHAVIOR | stored | 866 | — |
| `behavior` | BEHAVIOR | stored | 866 | — |
| `behavior` | BEHAVIOR | stored | 866 | — |
| `behavior` | BEHAVIOR | stored | 866 | — |
| `behavior` | BEHAVIOR | stored | 866 | — |
| `behavior` | BEHAVIOR | stored | 866 | — |
| `behavior` | BEHAVIOR | stored | 866 | — |
| `behavior` | BEHAVIOR | stored | 866 | — |
| `guardrails` | CONSTRAINTS & GUARDRAILS | stored | 944 | — |
| `guardrails` | CONSTRAINTS & GUARDRAILS | stored | 944 | — |
| `guardrails` | CONSTRAINTS & GUARDRAILS | stored | 944 | — |
| `guardrails` | CONSTRAINTS & GUARDRAILS | stored | 944 | — |
| `guardrails` | CONSTRAINTS & GUARDRAILS | stored | 944 | — |
| `guardrails` | CONSTRAINTS & GUARDRAILS | stored | 944 | — |
| `guardrails` | CONSTRAINTS & GUARDRAILS | stored | 944 | — |
| `guardrails` | CONSTRAINTS & GUARDRAILS | stored | 944 | — |
| `guardrails` | CONSTRAINTS & GUARDRAILS | stored | 944 | — |
| `guardrails` | CONSTRAINTS & GUARDRAILS | stored | 944 | — |
| `guardrails` | CONSTRAINTS & GUARDRAILS | stored | 944 | — |
| `knowledge-nl-knowledge-method` | BACKGROUND KNOWLEDGE | rag | 6053 | `inline` |
| `knowledge-nl-knowledge-method` | BACKGROUND KNOWLEDGE | rag | 6053 | `inline` |
| `knowledge-nl-knowledge-method` | BACKGROUND KNOWLEDGE | rag | 6053 | `inline` |
| `knowledge-nl-knowledge-method` | BACKGROUND KNOWLEDGE | rag | 6053 | `inline` |
| `knowledge-nl-knowledge-method` | BACKGROUND KNOWLEDGE | rag | 6053 | `inline` |
| `knowledge-nl-knowledge-method` | BACKGROUND KNOWLEDGE | rag | 6053 | `inline` |
| `knowledge-nl-knowledge-method` | BACKGROUND KNOWLEDGE | rag | 6053 | `inline` |
| `knowledge-nl-knowledge-method` | BACKGROUND KNOWLEDGE | rag | 6053 | `inline` |
| `knowledge-nl-knowledge-method` | BACKGROUND KNOWLEDGE | rag | 6053 | `inline` |
| `knowledge-nl-knowledge-method` | BACKGROUND KNOWLEDGE | rag | 6053 | `inline` |
| `knowledge-nl-knowledge-method` | BACKGROUND KNOWLEDGE | rag | 6053 | `inline` |

```
Sections: 44 rows, and they are 4 distinct sections each repeated 11 times — `identity`, `behavior`, `guardrails`, `knowledge-nl-knowledge-method`. The bundle assembles with no `capability_slug`, so every capability assigned to the agent is loaded and the Skills shared across all eleven render once per capability. Brittany cannot show this because she holds no Skills.
Knowledge sections: 11; 0 empty-with-fetch. His one Knowledge Skill (`knowledge-nl-knowledge-method`) arrives `fetch_method "inline"` with its 6053 chars of content already filled, so a client needs no retrieval to read it — and nothing arrives empty while claiming a fetch would help.
EXECUTION PLAN: absent. No Skill of his lists `reflect`, so the section `api/prompt/db-assembly.js` labels EXECUTION PLAN is never built.
Origin and date tags: origin absent, created_at absent. He has 0 taught items and 0 records, and his `agent_configs` projections are all empty (`role_prompts` 0, `guardrails` 0, `output_formats` 0) — those are read `select=type,name,text`, so no provenance column exists to leak.
Size: 172927 chars total — 76x Brittany's. Section content accounts for 96514 chars of it, but only 8774 chars of that is distinct: the repetition above costs 87740 chars, roughly 51% of everything the client receives. `library.data_room_access` [], tier `denied-no-access`, 0 records.
```

## Predictions (`docs/harvests/AGT-401.md` `## Predictions`)

- **p1 — CONFIRMED.** Nathan's one Knowledge Skill is `traits.source "inline"`: the section arrives
  with `fetch_instruction.method "inline"` and `content` filled (6053 chars), not as a RAG stub.
- **p2 — CONFIRMED.** No `EXECUTION PLAN` section in either reply (`execution_plan "absent"` both).
- **p3 — CONFIRMED.** No `origin`, `origin_caller` or `created_at` on any item or config in either
  reply. Brittany's taught items are exactly `id, title, text, chars, always`, and
  "Needs a new couch" — `origin 'mcp'` on its live row — hands the client none of it.
- **p4 — CONFIRMED.** Nathan: 0 configs, `taught.items` empty. Brittany: 3 taught, 0 Skills.
  Both `library.data_room_access []`.

## One measured fact nobody predicted

Nathan's reply is 44 section rows carrying 4 distinct sections. That is not a quirk of his row: it
is what "no `capability_slug`" means for any agent with more than one capability, and it puts the
same guardrail text in front of a client 11 times in one reply. It reads directly against
`.claude/rules/agent-data-visibility.md` ("Never render a role prompt, guardrail or taught item into
more than one assembled section"), and it is 51% of the bytes he hands over. AGT-401 is a
read-only pull and owns no `api/` file, so nothing was changed here — the fact is filed, with the
two replies as its evidence, for whoever owns the fix.
