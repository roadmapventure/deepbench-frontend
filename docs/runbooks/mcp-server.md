<!-- DeepBench v7.0.445 | docs/runbooks/mcp-server.md | SES-339 -- "Verify a foreign repository" added
     below; per-tool input contracts noted under "What is and is not exposed" -->
<!-- DeepBench v7.0.444 | docs/runbooks/mcp-server.md | MCP-3 -- the DeepBench MCP server -->

# The DeepBench MCP server

`POST /api/mcp` — JSON-RPC 2.0 over the MCP **Streamable HTTP** transport, implemented in
`api/mcp.js` with no SDK and no new dependency. Methods: `initialize`,
`notifications/initialized`, `ping`, `tools/list`, `tools/call`. Protocol versions offered:
`2025-11-25` (default) and `2025-06-18` — the handshake-based revisions, not the current
`2026-07-28` `server/discover` revision. `GET` returns 405 (no server-initiated SSE stream);
a notification returns 202 with no body; the server is stateless and issues no `MCP-Session-Id`.

## The two headers

| Header | What it does | Where the value lives |
|---|---|---|
| `x-db-gate-bypass` | Clears the HAR-33 per-IP edge gate in `middleware.js`, which fronts every `/api/*` route. Not needed from an IP with an `ip_org_cache.permission = 'unlimited'` row. | Vercel env `GATE_BYPASS_SECRET` |
| `x-deepbench-mcp-key` | Unlocks the **governance lane**. Nothing else — it is scope, never access. | `runner_secrets` row `MCP_API_KEY` |

Deployment protection also applies to the preview deployments, so a call to the dev URL adds
`x-vercel-protection-bypass` (`VERCEL_AUTOMATION_BYPASS_SECRET`), exactly as every other live API
test does.

## What is and is not exposed

One MCP tool per row in `capabilities` that has an **active** holder in
`agent_capability_assignments` — 18 product-lane tools without the key, 25 with it (measured
2026-09-09). The tool **name is the capability slug**, verbatim; the title is the capability's
`name`; the description is its `description` plus the holder's name, role and lane. Input schema is
always `{ task_context: object (required), intent_slug?: string }`; `intent_slug` defaults to the
capability's own `capabilities.default_intent_slug`, which the route must resolve because the
executor does not (AA-188). When that Intent Skill declares a `traits.schema`, it is published as
the tool's `outputSchema` and the answer comes back as `structuredContent` as well as text.

**Hidden without the key:** every capability whose holder is `agents.lane = 'governance'` (the seven
SES-330 agents), and — deliberately, failing closed — any holder whose lane is null or a value the
code has never seen. A `tools/call` naming a hidden tool is refused `-32602` with the *same* message
an entirely unknown tool gets, so the list cannot be probed. **Never exposed at all:** a capability
whose only holder is inactive (the executor would refuse it), and anything that is not a capability
— there are no MCP resources or prompts, and `capabilities` in `initialize` is exactly `{ tools: {} }`.

**Per-tool input contracts (`SES-339`).** Most tools take any `task_context` object. A capability
listed in `TOOL_INPUT_SCHEMAS` (`api/mcp.js`) also declares which `task_context` fields it *requires*:
the list publishes them inside `inputSchema.properties.task_context`, and `tools/call` enforces them
**before dispatch** — a missing or empty required field is a `-32602` naming every field it is short
(`error.data.missing` carries the machine-readable list) and **no model call is spent**. Extra keys
are never refused; they are serialized into the prompt like any other. Today the table has exactly
one entry, `verify-ship`, below.

Every `tools/call` runs the one generic executor (`runCapability`), so it logs an agent turn with
`call_source = 'mcp'` and `screen_origin = 'mcp'`. That pair is the only evidence an outside client
ever used DeepBench; `api/mcp.js` writes no `ai_activity_log` row of its own.

## Claude Desktop

`claude_desktop_config.json` — the remote endpoint through `mcp-remote`, which is what carries the
custom headers:

```json
{
  "mcpServers": {
    "deepbench": {
      "command": "npx",
      "args": [
        "-y", "mcp-remote",
        "https://deepbench-frontend-git-dev-roadmapventures-projects.vercel.app/api/mcp",
        "--transport", "http-only",
        "--header", "x-deepbench-mcp-key:${DEEPBENCH_MCP_KEY}",
        "--header", "x-vercel-protection-bypass:${DEEPBENCH_VERCEL_BYPASS}",
        "--header", "x-db-gate-bypass:${DEEPBENCH_GATE_BYPASS}"
      ],
      "env": {
        "DEEPBENCH_MCP_KEY": "<runner_secrets.MCP_API_KEY>",
        "DEEPBENCH_VERCEL_BYPASS": "<VERCEL_AUTOMATION_BYPASS_SECRET>",
        "DEEPBENCH_GATE_BYPASS": "<GATE_BYPASS_SECRET>"
      }
    }
  }
}
```

Drop the `x-deepbench-mcp-key` line to get the product-lane 18 only. Drop `x-db-gate-bypass` if the
machine's IP already holds an `unlimited` row.

## Checking it by hand

```bash
curl -s -X POST "$URL/api/mcp" \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -H "x-deepbench-mcp-key: $MCP_API_KEY" \
  -H "x-vercel-protection-bypass: $VERCEL_AUTOMATION_BYPASS_SECRET" \
  -H "x-db-gate-bypass: $GATE_BYPASS_SECRET" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

A 403 with `{"deepbench_gate":true}` is HAR-33, not MCP. Regression cover:
`tests/regression/mcp-3-server.test.mjs`.

## Verify a foreign repository

`verify-ship` is the one governance tool with a use outside this platform: hand it a diff, the
promise that diff was supposed to keep, and the output of three gates **you** ran, and the Verifier
(Marcus Webb — Delivery Verifier) grades it and says why. It is a **judgment, not a pipeline** — it
runs nothing in your repository, has no access to it, and cannot check a gate you did not run.

### 1. Produce the evidence, in your own repository

The three gates are yours to define; what matters is that each one carries a real exit code and real
output. In a repository with no DeepBench toolchain, the honest substitutes are whatever that project
actually uses:

```bash
# the diff being graded, and the files it touches
git diff origin/main...HEAD > /tmp/change.diff
git diff --name-only origin/main...HEAD

# gate 1 -- build. Whatever "does it still compile/load" means here.
node -e "require('./index.js'); console.log('loads clean')" ; echo "exit $?"

# gate 2 -- regression. Whatever test command this project has.
npm test 2>&1 | tail -40 ; echo "exit $?"

# gate 3 -- hygiene. Lint, format check, size tripwire -- whatever the project enforces.
npx eslint . 2>&1 | tail -20 ; echo "exit $?"
```

Capture each gate's **exit code and its output**. `vf-guardrails.must_not` forbids the Verifier to
accept a claim of green with no output, and since `SES-339` the route refuses it too, so a bare
`"pass"` with nothing to read is a `-32602` rather than a model call.

### 2. Call it

```bash
curl -s -X POST "$URL/api/mcp" \
  -H 'content-type: application/json' \
  -H "x-deepbench-mcp-key: $MCP_API_KEY" \
  -H "x-vercel-protection-bypass: $VERCEL_AUTOMATION_BYPASS_SECRET" \
  -H "x-db-gate-bypass: $GATE_BYPASS_SECRET" \
  -d @- <<'JSON'
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{
  "name":"verify-ship",
  "arguments":{"task_context":{
    "backlog_id":"ACME-1204",
    "version":"1.9.3",
    "diff":"diff --git a/index.js b/index.js\n-const RETRIES = 1;\n+const RETRIES = 3;\n",
    "kickoff":"Raise the retry count from 1 to 3 so a single transient failure no longer fails the job. No other behaviour changes.",
    "gates":{
      "build":{"exit":0,"output":"node -e \"require('./index.js')\" -> loads clean"},
      "regression":{"exit":0,"output":"14 passing, 0 failing"},
      "hygiene":{"exit":0,"output":"eslint: no problems"}
    },
    "changed_files":["index.js"],
    "standards":"Optional. Excerpts of the standards this change should be held to."
  }}}}
JSON
```

**Required:** `diff`, `kickoff`, `gates` (all three, each with an integer `exit` and non-empty
`output`), `changed_files` (non-empty, strings). **Optional:** `backlog_id`, `version`, `standards`,
`priority_class`, `ladder`.

### Three things to say out loud, or the verdict is a block every time

The route lets you omit the optional fields. **The Verifier does not.** Its Intent says *"if any of
those is missing, return block with `missing_evidence` naming it,"* and its Background Knowledge
names DeepBench's own three gate commands — so an otherwise perfect foreign-repository submission
comes back `block` on things that are true of every foreign repository. Measured on this ticket's own
QA, on a one-line change with three green gates: the bare call blocked on all three of these, and the
same call with the three sentences below returned `approve` with `missing_evidence: []`.

1. **Name the class and the ladder as not applicable** rather than leaving them out —
   `"priority_class": "not applicable -- not a DeepBench repository"` and a `ladder` saying no trust
   ladder governs this repository, so `auto_done_eligible` must be false. Named-as-absent and absent
   are different facts to a judge.
2. **Declare gate equivalence.** Add a line to the task context saying these three commands *are*
   this repository's build, regression and hygiene gates and that `npm run build`,
   `tests/regression/run-all.js` and `scripts/check-session-docs.js --gate` do not exist here.
   Without it the Verifier reads your gates as substitutes for the platform's and refuses them.
3. **Supply the pre-change red run.** The Verifier asks *"would this QA have passed if the change did
   nothing?"* — so give it the failing output from **before** the change, not only the green after.
   A green run alone is evidence of nothing and it will say so.

`scripts/verifier.js --judge=session` pass one writes exactly this object to its judgment-context
file, and that file is accepted verbatim: its `gates` are status strings with the exit codes and
output tails alongside in `gate_detail`, and the route reads that pairing as the same evidence.

### 3. Read the verdict

The answer comes back as `structuredContent` against `vf-verdict-intent`'s schema:

| Field | What it means |
|---|---|
| `verdict` | `approve` or `block` — does this change keep its promise. |
| `reasoning` | The findings, each with the evidence it rests on. This is the part worth reading. |
| `pm_lens` / `architect_lens` | The two positions the Verifier holds simultaneously: did it deliver what was asked, and is it built in a way the codebase can carry. |
| `missing_evidence` | Non-empty means it graded around a hole. A `block` with this populated is "I could not tell", not "this is bad". |
| `auto_done_eligible` / `auto_done_reason` | **DeepBench-internal. Ignore it outside this platform.** |

**Auto-done never applies to a foreign repository.** That bar is charter decision 2 plus the trust
ladder plus `runner_verdicts` — machinery that exists only inside DeepBench and reads rows this call
never touches. Outside, `auto_done_eligible` is a field the schema requires the model to fill and
nothing acts on; the verdict and its reasoning are the whole deliverable. Nothing is written to any
DeepBench ledger by this call either — the only trace is the `ai_activity_log` row every capability
turn writes, carrying `call_source = 'mcp'`.

### Known blocker, found by this ticket's own QA (2026-09-09) — the answer does not come back yet

A complete, contract-satisfying `verify-ship` call reaches the executor, assembles, and posts to the
Anthropic API — and the API refuses the request before the model sees it, deterministically, 6 runs
out of 6. The tool result is a non-terminal `{"status":"in_progress", ...}` with a `recovery` block,
never a verdict.

**Root cause, isolated against the live API rather than reasoned about.** The refusal is
`stop_reason: "refusal"`, `stop_details.category: "reasoning_extraction"`, with empty content — the
API's own classifier, not a model choice and not a DeepBench error. The trigger is the **tool
definition**, not the prompt: a trivial system prompt and a trivial user message with this tool
attached refuse identically. Within the tool, it is the pairing of `db-assembly.js`'s
platform-injected `account` field (`ACCOUNT_FIELD_SPEC`, LAV-28b — *"the act you performed this
turn… state only what you did"*) with a schema property literally named **`reasoning`**. Dropping
`account`, shortening its description, dropping `reasoning`, or renaming `reasoning` to `findings`
each clears the refusal on the otherwise byte-identical request; `max_tokens`, the cache split and
`tool_choice` do not. Three Intent Skills declare a `reasoning` property — `vf-verdict-intent`,
`agent-selection-intent`, `pattern-vocabulary-review-intent` — so this is platform-wide, not a
Verifier quirk. It is invisible everywhere else because the forced-`tool_choice` branch is only
taken by models that accept it, and this family (`claude-fable-*`, every governance agent since
`SES-334`) takes the auto branch.

The judgment itself is sound once the request is accepted: the replayed foreign-repository call
returned a real `approve` with both lens positions, `auto_done_eligible: false` for the right reason
(no ladder governs that repository), and `missing_evidence: []`. Nothing above is a defect in the
MCP route or in the input contract this ticket added — the refusal happens two layers below both.

Regression cover: `tests/regression/ses-339-verify-over-mcp.test.mjs`.
