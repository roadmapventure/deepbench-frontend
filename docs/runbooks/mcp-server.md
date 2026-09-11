<!-- DeepBench v7.0.450 | docs/runbooks/mcp-server.md | LOG-149 -- the `reasoning` refusal no longer
     "presents as silence". That sentence was true and is now dated: since LOG-149 a refusal is caught
     in callModel() before parseModelTurn() ever sees the empty content, surfaces as a PERMANENT
     `anthropic-refusal` fault instead of an `in_progress` recovery, and lands a $0 ledger row carrying
     `call_facts.stop_reason = 'refusal'` -- so the failure is now visible in the log rather than
     inferable only from a hung job. The rename rule itself is unchanged and still binding: never name
     a schema property `reasoning`. One sentence amended; ses-347-account-field-refusal.test.mjs and
     its Intent sweep are untouched and still green. -->
<!-- DeepBench v7.0.447 | docs/runbooks/mcp-server.md | SES-347 -- the "known blocker" section is
     replaced: the API refusal is FIXED (vf-verdict-intent's `reasoning` property renamed to
     `findings`), SES-339's "shortening the account description clears it" is corrected with the 2x2
     that disproves it, and the 55-second per-request abort ceiling the refusal was hiding is named
     as a separate open defect -->
<!-- DeepBench v7.0.445 | docs/runbooks/mcp-server.md | SES-339 -- "Verify a foreign repository" added
     below; per-tool input contracts noted under "What is and is not exposed" -->
<!-- DeepBench v7.0.444 | docs/runbooks/mcp-server.md | MCP-3 -- the DeepBench MCP server -->

# The DeepBench MCP server

`POST /api/mcp` — JSON-RPC 2.0 over the MCP **Streamable HTTP** transport, implemented in
`api/_lib/mcp.js` with no SDK and no new dependency. **The URL is a `vercel.json` rewrite onto
`/api/capabilities/execute?transport=mcp`, not a route of its own (`SES-346`, `v7.0.446`):** the
Hobby plan caps a deployment at 12 serverless functions and this file was the 13th, which refused
every dev build for eight versions. Nothing a client sees changed — same URL, same methods, same
headers. Do not move it back under `api/`. Methods: `initialize`,
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
listed in `TOOL_INPUT_SCHEMAS` (`api/_lib/mcp.js`) also declares which `task_context` fields it *requires*:
the list publishes them inside `inputSchema.properties.task_context`, and `tools/call` enforces them
**before dispatch** — a missing or empty required field is a `-32602` naming every field it is short
(`error.data.missing` carries the machine-readable list) and **no model call is spent**. Extra keys
are never refused; they are serialized into the prompt like any other. Today the table has exactly
one entry, `verify-ship`, below.

Every `tools/call` runs the one generic executor (`runCapability`), so it logs an agent turn with
`call_source = 'mcp'` and `screen_origin = 'mcp'`. That pair is the only evidence an outside client
ever used DeepBench; `api/_lib/mcp.js` writes no `ai_activity_log` row of its own.

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
| `findings` | The findings, each with the evidence it rests on. This is the part worth reading. **Called `reasoning` before `SES-347`** — renamed because the API refused every request carrying a property of that name; see the section below. |
| `pm_lens` / `architect_lens` | The two positions the Verifier holds simultaneously: did it deliver what was asked, and is it built in a way the codebase can carry. |
| `missing_evidence` | Non-empty means it graded around a hole. A `block` with this populated is "I could not tell", not "this is bad". |
| `auto_done_eligible` / `auto_done_reason` | **DeepBench-internal. Ignore it outside this platform.** |

**Auto-done never applies to a foreign repository.** That bar is charter decision 2 plus the trust
ladder plus `runner_verdicts` — machinery that exists only inside DeepBench and reads rows this call
never touches. Outside, `auto_done_eligible` is a field the schema requires the model to fill and
nothing acts on; the verdict and its reasoning are the whole deliverable. Nothing is written to any
DeepBench ledger by this call either — the only trace is the `ai_activity_log` row every capability
turn writes, carrying `call_source = 'mcp'`.

### The refusal that used to block this, and what replaced it (`SES-347`, 2026-09-09)

**Fixed.** `SES-339`'s QA found that a complete, contract-satisfying `verify-ship` call reached the
executor, assembled, posted to the Anthropic API — and the API refused it before the model saw it,
`stop_reason: "refusal"`, `stop_details.category: "reasoning_extraction"`, empty content, 6 runs out
of 6. The tool result was a non-terminal `{"status":"in_progress", ...}` with a `recovery` block,
never a verdict.

**The cause was the property NAME, and this is the correction to `SES-339`'s own write-up.** The
trigger is the **tool definition**, not the prompt — a trivial system prompt and a trivial user
message with this tool attached refuse identically. Within the tool it is the pairing of
`db-assembly.js`'s platform-injected `account` receipt (`ACCOUNT_FIELD_SPEC`, LAV-28b) with a schema
property literally named **`reasoning`**. `SES-339` also reported that SHORTENING the `account`
description clears it. **It does not, on the request the platform actually sends.** Replaying the
captured production request body one mutation at a time, five runs per cell:

| `account` description | property name | refusals |
|---|---|---|
| 398 chars (as shipped) | `reasoning` | 5/5 |
| 118 chars (shortened) | `reasoning` | 5/5 |
| 398 chars (as shipped) | `findings` | 0/5 |
| 118 chars (shortened) | `findings` | 0/5 |

`SES-339`'s opposite result came from a probe with a different `max_tokens` and no `tool_choice`;
that shape sits on the other side of the classifier's threshold, where the short description does
clear it. **A probe that is not the shipped request shape is not a measurement of the shipped
request** — this cost `SES-347` a false green before its own end-to-end call caught it.

**The fix:** `vf-verdict-intent`'s `reasoning` property is now **`findings`** (stored schema and
`method`, decision `821638ba`, before-image kept), and `scripts/verifier.js`'s `reconcileJudgment()`
reads `agent.findings`. `ACCOUNT_FIELD_SPEC` is deliberately unchanged — it is measurably not the
cause, and it is the half that cannot move anyway, since every capability's contract carries it. The
other two Intents declaring `reasoning` — `agent-selection-intent`,
`pattern-vocabulary-review-intent` — were measured in the shipped request shape at **0/3 refusals**
and are deliberately left alone.

Proven end to end after the rename: the foreign-repository call returned a real `block` with both
lens positions, `auto_done_eligible: false` for the right reason (no ladder governs that repository),
populated `missing_evidence`, and the `account` receipt — `ai_activity_log` row `41374`, trace
`c2ec0419-cbb2-438b-b98b-5f56176cd1db`, 1276 in / 3568 out on `claude-fable-5-1`.

**Never name a schema property `reasoning`.** Any Intent reachable through the executor gets
`account` injected beside it and the whole request is then refused — and it presents as silence
(`in_progress` forever), not as an error — before `LOG-149` (`v7.0.450`); since then a refusal
surfaces as a permanent `anthropic-refusal` failure and lands a $0 ledger row with
`call_facts.stop_reason = 'refusal'`. `tests/regression/ses-347-account-field-refusal.test.mjs`
sweeps every Intent for the name and fails on a new one.

### Still open, and it is NOT the refusal — the 55-second per-request ceiling

With the refusal cleared, a full `verify-ship` verdict takes **54–57 s** to generate (~3,800 output
tokens on `claude-fable-5-1`), and `api/prompt/request-receivable.js`'s
`postToAnthropicWithRetry()` aborts every single request at `Math.min(55000, remainingMs)` — a hard
cap a longer `_deadline` does not lift. So the call lands on either side of the line run to run: it
returned a complete verdict in 54 s, and `{"status":"in_progress"}` with
`recovery.fault: "TimeoutError"` at 56 s and 57 s. This is a **separate, pre-existing defect** that
the refusal was hiding, not part of `SES-347`; it needs its own ticket (raise the cap for this lane,
stream the response, or resume the checkpoint the recovery block already wrote).

Regression cover: `tests/regression/ses-339-verify-over-mcp.test.mjs`.
