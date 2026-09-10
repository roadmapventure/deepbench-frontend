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
