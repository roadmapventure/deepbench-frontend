// DeepBench v7.0.446 | api/_lib/mcp.js | SES-346 -- THIS FILE MOVED OUT OF api/ AND IS NO LONGER A
// SERVERLESS FUNCTION. Vercel's Hobby plan caps a deployment at 12 serverless functions and every
// top-level file under api/ outside an underscore-prefixed directory is one; MCP-3 made it 13 and
// SES-334's cron route had already made it 14, so EVERY dev deploy from v7.0.437 to v7.0.445 was
// REFUSED at build and dev served v7.0.434 for hours. The transport now rides the executor's own
// function: `/api/mcp` is a vercel.json rewrite to `/api/capabilities/execute?transport=mcp`, and
// that route's handler delegates here on its first statement. THE PUBLIC URL DID NOT CHANGE and
// nothing inside this file changed but the three relative import paths and the export's name --
// `export default` became `export const mcpHandler`, because a file under api/_lib/ is imported,
// never routed to. If you are about to move this back under api/, count the functions first:
// `node scripts/check-api-function-count.js --worktree=<path>` and
// `tests/regression/ses-346-twelve-functions.test.mjs` are the two that will tell you no.
// DeepBench v7.0.445 | api/mcp.js | SES-339 -- the Verifier's judgment is callable through MCP for
// any repository. `tools/call` used to accept ANY `task_context` object, so a partial submission
// bought a real model call and came back with a verdict reached on evidence that was never there.
// TOOL_INPUT_SCHEMAS (below) is the INPUT half of a contract whose OUTPUT half already shipped
// (the Intent Skill's `traits.schema` -> `outputSchema`): it is published in `tools/list` and
// enforced in `tools/call` BEFORE dispatch, so a missing field is a -32602 naming it and no
// executor call, never a model call spent on a judgment it cannot honestly make. Foreign-repository
// recipe: docs/runbooks/mcp-server.md, "Verify a foreign repository".
//
// DeepBench v7.0.444 | api/mcp.js | MCP-3 -- the generic capability executor, projected as an MCP
// server. Every DeepBench capability becomes an MCP tool with ZERO per-capability code: the tool
// list is a read of `capabilities` x `agent_capability_assignments` x `agents`, and `tools/call`
// hands the arguments to the SAME runCapability() every screen and every governance script already
// calls. Nothing here knows what any capability does (.claude/rules/capabilities-are-data.md) --
// there is no slug conditional in this file and there must never be one.
//
// WHY THIS EXISTS. John's ask is agents usable from Claude, ChatGPT and Office; MCP is the
// agent-to-tool standard those clients speak. ARCHITECTURE.md Section 19b already made capabilities
// data, so the whole server is a projection, not a second executor. If you find yourself adding a
// second execution path here, stop -- the bug is upstream.
//
// TRANSPORT: Streamable HTTP, JSON-RPC 2.0, the handshake-based revision. Verified against the
// published specification 2026-09-09, not recalled:
//   - The CURRENT spec revision is 2026-07-28, and it replaced the `initialize` handshake with a
//     mandatory `server/discover` RPC. This route deliberately implements the HANDSHAKE revision
//     instead (latest handshake-based version: 2025-11-25), because that is the subset the ticket
//     specs and the one today's desktop clients speak. Version negotiation below follows the
//     handshake spec's own rule: echo the client's version when we support it, otherwise answer
//     with the latest we do support.
//   - POST is the only method. A GET must return either an SSE stream or 405; this server offers
//     no server-initiated stream, so it returns 405 with the reason (spec, Transports section 2.3).
//   - A JSON-RPC *notification* (no `id`) MUST be answered 202 Accepted with NO body. A *request*
//     is answered with one `application/json` object. Both are implemented literally below.
//   - `MCP-Protocol-Version` is required on every request AFTER initialization, and an unsupported
//     value MUST be answered 400. The check deliberately skips the `initialize` message itself:
//     that is the request that establishes the version, so refusing it on the header the client has
//     not yet been told to send would make the handshake unreachable.
//
// STATELESS BY CONSTRUCTION -- no `MCP-Session-Id` is issued. Session ids are a MAY, and this route
// runs on serverless functions with no shared memory between invocations, so minting one would be a
// promise the next cold start could not keep. Every call carries its own key and its own arguments.
//
// TWO INDEPENDENT GATES, IN THIS ORDER:
//   1. The HAR-33 per-IP access gate. It is NOT applied in this file and must not be: `middleware.js`
//      matches `/api/:path*` at the edge, so this route sits behind exactly the same gate as
//      `/api/capabilities/execute` with no code here at all. A refused caller never reaches this
//      handler. Grep-anchor for the next reader who goes looking for a gate call in this file: there
//      isn't one, on purpose.
//   2. The governance key, `x-deepbench-mcp-key`, compared against the `MCP_API_KEY` row in
//      `runner_secrets`. It decides SCOPE, never access: without it a caller who passed the gate
//      sees and can call the product-lane capabilities only; with it the governance lane (the seven
//      SES-330 agents) is listed and callable too. FAILS CLOSED at every step -- a missing secret
//      row, an unreadable Supabase, a missing header, a wrong header and an unknown lane all
//      resolve to "product only", never to "everything".
//
// LANE FILTERING IS THE WHOLE SECURITY SURFACE OF THE LIST, so `tools/call` re-derives the visible
// set from the same function `tools/list` uses and refuses a name that is not in it. Listing and
// calling can never disagree, because there is one visibility function and both callers run it.
//
// LOGGING. This file writes NO ai_activity_log row of its own -- runCapability() logs the agent turn
// with the real token counts the instant the model answers, and a second row here would double the
// AI Audit's call count (the defect api/cron/rank-backlog.js documents at length). What this file
// DOES do is establish the attribution: runWithCallSource('mcp', ...) puts `call_source = 'mcp'`
// (added to lib/request-context.js's allowlist by this ticket) and `screen_origin = 'mcp'` into the
// request-scoped context the logger reads, while carrying the real caller's ip/device/visitor
// fields through unchanged. `ai_type` stays the capability slug, as everywhere -- no new
// SERVICE_CATALOG entry.

import { createRequire } from 'node:module';
import { timingSafeEqual } from 'node:crypto';
import { runCapability } from '../capabilities/execute.js';
import { withRequestContext, getRequestContext, runWithCallSource } from '../../lib/request-context.js';

// package.json is read through createRequire rather than an import attribute so the Vercel builder
// traces it as a plain dependency. A failure here costs the server its version string and nothing
// else, so it degrades to a literal rather than refusing to boot.
let PACKAGE_VERSION = '0.0.0';
try {
  PACKAGE_VERSION = createRequire(import.meta.url)('../../package.json').version || '0.0.0';
} catch {
  // keep the fallback
}

/**
 * The handshake-based protocol revisions this server speaks, newest first. 2025-06-18 is the
 * oldest that defines `outputSchema` / `structuredContent`, which every schema-carrying capability
 * here returns -- claiming an older one would be advertising a shape we cannot honour.
 */
export const SUPPORTED_PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18'];
export const LATEST_PROTOCOL_VERSION = SUPPORTED_PROTOCOL_VERSIONS[0];

export const SERVER_INFO = {
  name: 'deepbench',
  title: 'DeepBench',
  version: PACKAGE_VERSION,
};

const SERVER_INSTRUCTIONS =
  'Each tool is one DeepBench capability, executed by the agent that holds it. Pass the whole ' +
  'task as a `task_context` object -- every key you supply is serialized into the agent\'s prompt, ' +
  'so name the fields the way you would name them for a colleague. `intent_slug` is optional and ' +
  'defaults to the capability\'s own declared intent; override it only when you know the slug.';

// JSON-RPC 2.0 error codes, plus the one MCP adds nothing to.
const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;
const INTERNAL_ERROR = -32603;

const GOVERNANCE_KEY_HEADER = 'x-deepbench-mcp-key';
const SECRET_NAME = 'MCP_API_KEY';
const SECRET_TTL_MS = 60_000;

// ---------------------------------------------------------------------------------------------
// Supabase reads
// ---------------------------------------------------------------------------------------------

async function sbSelect(pathAndQuery) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY not configured');
  const res = await fetch(`${url.replace(/\/+$/, '')}/rest/v1/${pathAndQuery}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`Supabase read failed (${pathAndQuery.split('?')[0]}): HTTP ${res.status}`);
  const rows = await res.json();
  if (!Array.isArray(rows)) throw new Error(`Supabase read returned a non-array for ${pathAndQuery.split('?')[0]}`);
  return rows;
}

/**
 * FOUR FLAT READS, JOINED IN JS, deliberately -- not one PostgREST embed. `agent_capability_assignments`
 * joins `capabilities` on a text slug and `agents` on a text id, and an embed depends on a declared
 * foreign key existing for each; a flat read depends on nothing but the columns, which is the same
 * posture scripts/run-project.js already takes against these tables.
 */
export async function fetchCapabilityRows() {
  const [capabilities, assignments, agents, intents] = await Promise.all([
    sbSelect('capabilities?select=slug,name,description,execution_type,default_intent_slug,tenant_id'),
    sbSelect('agent_capability_assignments?select=agent_id,capability_slug'),
    sbSelect('agents?select=id,name,role,lane,is_active'),
    sbSelect('skill_profiles?skill_type_slug=eq.intent&select=slug,traits'),
  ]);
  return assembleCapabilityRows({ capabilities, assignments, agents, intents });
}

/**
 * Pure. Exported so the unit arm can build the same rows from a fixture set with no network.
 *
 * A capability with NO ACTIVE HOLDER is dropped entirely rather than listed: resolveCapabilityHolder()
 * in execute.js throws for exactly that case, so listing it would advertise a tool that cannot run.
 * That is the same is_active gate the executor applies, read from the same column.
 */
export function assembleCapabilityRows({ capabilities = [], assignments = [], agents = [], intents = [] }) {
  const agentById = new Map(agents.map(a => [a.id, a]));
  const intentBySlug = new Map(intents.map(s => [s.slug, s]));

  const holderBySlug = new Map();
  for (const a of assignments) {
    const agent = agentById.get(a.agent_id);
    if (!agent || agent.is_active !== true) continue;
    if (!holderBySlug.has(a.capability_slug)) holderBySlug.set(a.capability_slug, agent);
  }

  const rows = [];
  for (const c of capabilities) {
    const holder = holderBySlug.get(c.slug);
    if (!holder) continue;
    const intent = c.default_intent_slug ? intentBySlug.get(c.default_intent_slug) : null;
    const schema = intent && intent.traits && intent.traits.schema;
    rows.push({
      slug: c.slug,
      name: c.name || c.slug,
      description: c.description || '',
      execution_type: c.execution_type || 'ai',
      default_intent_slug: c.default_intent_slug || null,
      tenant_id: c.tenant_id || 'global',
      agent_id: holder.id,
      agent_name: holder.name || holder.id,
      agent_role: holder.role || '',
      lane: holder.lane || null,
      // Only an object schema can be an MCP outputSchema; anything else is dropped rather than
      // advertised, because a client validates structuredContent against whatever we publish.
      output_schema: schema && typeof schema === 'object' && schema.type === 'object' ? schema : null,
    });
  }
  return rows.sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
}

/**
 * THE ONE VISIBILITY FUNCTION. `tools/list` and `tools/call` both run it, so what is listed and
 * what is callable cannot drift apart.
 *
 * Product lane is open to any caller who cleared the HAR-33 gate. EVERYTHING ELSE -- the governance
 * lane, and equally a row whose lane is null or a value this code has never heard of -- needs the
 * key. Written as "is it product?" rather than "is it governance?" on purpose: a lane added to the
 * database tomorrow is hidden by default, which is the direction a mistake should fail in.
 */
export function visibleRows(rows, { governanceUnlocked }) {
  return rows.filter(r => r.lane === 'product' || governanceUnlocked === true);
}

// ---------------------------------------------------------------------------------------------
// FEATURE: SES-339 -- the INPUT contract
// ---------------------------------------------------------------------------------------------

/**
 * The three gates by name, in one place so the published schema and the validator below cannot
 * disagree about which three they are. These are `scripts/verifier.js`'s own GATES keys.
 */
export const GATE_KEYS_REQUIRED = Object.freeze(['build', 'regression', 'hygiene']);

/**
 * PER-CAPABILITY INPUT REQUIREMENTS, AS DATA. A lookup table, not a conditional: nothing here
 * changes WHAT runs or WHO runs it -- the row still decides the agent, the intent and the executor,
 * and there is still exactly one execution path. What a registry entry decides is only whether the
 * arguments carry the evidence the capability's own Guardrails already demand, and it decides that
 * by table lookup on the slug the client named. Adding a capability to this table is a data edit;
 * an `if` on a slug would be a second code path, and this file still must never grow one.
 *
 * WHY IT LIVES IN CODE TODAY AND WHERE IT BELONGS TOMORROW. The natural home is the Intent Skill
 * row that already carries the OUTPUT half (`skill_profiles.traits.schema` -> `outputSchema`), as
 * a sibling `traits.input_schema`. That is one clean generic read and no table at all -- but
 * `vf-verdict-intent` is one of the Verifier's OWN Skill rows, and SES-337 makes a cycle that
 * rewrites those ineligible for its own auto-done bar by construction. So the first entry ships as
 * code deliberately, and the SECOND capability that needs one is the signal to move the whole table
 * onto `traits.input_schema` and delete it. One entry is a table; two is a pattern hardening.
 *
 * THE `verify-ship` ENTRY IS THE VERIFIER'S OWN METHOD, TRANSCRIBED. `vf-verdict-intent.method`
 * says: "Your task_context carries backlog_id, version, the kickoff Markdown, the diff (or its
 * path), the three gate outputs with exit codes, the changed-file list, the class and its ladder
 * answer, and the standards excerpts... If any of those is missing, return block with
 * missing_evidence naming it." That instruction was the ONLY enforcement, which means the fail was
 * a model call away and depended on the model obeying. Required here are the four a judgment is
 * impossible without -- the diff (what changed), the kickoff (what was promised), the three gate
 * outputs (whether it works), and the changed-file list (the self-certification check). Class,
 * ladder and standards stay OPTIONAL because they bear on the auto-done bar, not on the verdict: a
 * foreign repository has no DeepBench class and no trust ladder, and refusing it those would make
 * the tool unusable for the case this ticket exists to serve.
 */
export const TOOL_INPUT_SCHEMAS = Object.freeze({
  'verify-ship': Object.freeze({
    description:
      'Everything the Verifier needs to grade one delivery. Run the three gates yourself and hand ' +
      'in their exit codes and output -- the Verifier never re-runs them and never accepts a claim ' +
      'of green without the output.',
    required: ['diff', 'kickoff', 'gates', 'changed_files'],
    properties: {
      diff: { type: 'string', description: 'The complete diff being graded, as text. Say so inside the text if it is truncated.' },
      kickoff: { type: 'string', description: 'What this change promised, as Markdown or prose. The promise the diff is graded against.' },
      gates: {
        type: 'object',
        description: 'The three gate results you ran yourself. Each is { exit: integer, output: string }.',
        required: GATE_KEYS_REQUIRED,
        properties: Object.fromEntries(
          GATE_KEYS_REQUIRED.map(k => [k, { type: 'object', required: ['exit', 'output'], properties: { exit: { type: 'integer' }, output: { type: 'string' } } }]),
        ),
      },
      changed_files: { type: 'array', items: { type: 'string' }, description: 'Every path this change touches. The self-certification check reads it.' },
      backlog_id: { type: 'string', description: 'Optional. The ticket id, echoed back in the verdict.' },
      version: { type: 'string', description: 'Optional. The version being graded, echoed back in the verdict.' },
      standards: { type: 'string', description: 'Optional. The standards excerpts this change should be held to.' },
      // OPTIONAL, BUT NOT FREE, and the description says so because the refusal cannot. Measured on
      // this ticket's own foreign-repository QA: the Verifier's Intent tells it to block naming any
      // missing input, and its Background Knowledge names DeepBench's own three gate commands -- so
      // a call that simply OMITS these blocks on "class and class_autonomy ladder answer absent"
      // and on gates that "are not the platform's three mechanical gates", every time. Saying
      // "not applicable, this is not a DeepBench repository" turns both blocks into an approve on
      // the same evidence. Named-as-absent and absent are different facts to a judge, exactly as
      // they are to scripts/verifier.js's own ladder note. Recipe: docs/runbooks/mcp-server.md.
      priority_class: { type: 'string', description: 'DeepBench P1-P10 class. Optional, but say "not applicable -- not a DeepBench repository" rather than omitting it: an omitted input is a block naming it.' },
      ladder: { type: 'object', description: 'The trust ladder answer for that class (verifier.js writes it as `class_autonomy`). Optional, but state it as not applicable rather than omitting it -- see priority_class.' },
    },
  }),
});

/**
 * ACCEPTS BOTH EVIDENCE SHAPES, and that is not laxity. `scripts/verifier.js --judge=session` pass
 * one writes the judgment context this tool was specced to accept verbatim, and it writes the gates
 * as `{ build: "pass", ... }` with the exit codes and output tails alongside in `gate_detail`. A
 * contract that refused the platform's OWN evidence file would be broken on arrival, so a status
 * string paired with its `gate_detail` entry counts as that gate's evidence. What is NOT negotiable
 * in either shape: three gates, each with something a reader could check. A bare "pass" with no
 * detail is a claim of green with no output, which is the one thing `vf-guardrails.must_not`
 * forbids the Verifier to accept.
 */
export function normalizeGateEvidence(gates, gateDetail) {
  const missing = [];
  if (!gates || typeof gates !== 'object' || Array.isArray(gates)) return { missing: ['gates'] };
  for (const key of GATE_KEYS_REQUIRED) {
    const value = gates[key];
    if (value === undefined || value === null || value === '') { missing.push(`gates.${key}`); continue; }
    if (typeof value === 'object' && !Array.isArray(value)) {
      if (!Number.isInteger(value.exit)) missing.push(`gates.${key}.exit`);
      if (typeof value.output !== 'string' || !value.output.trim()) missing.push(`gates.${key}.output`);
      continue;
    }
    if (typeof value === 'string') {
      const detail = gateDetail && typeof gateDetail === 'object' ? gateDetail[key] : undefined;
      if (typeof detail !== 'string' || !detail.trim()) missing.push(`gates.${key}.output`);
      continue;
    }
    missing.push(`gates.${key}`);
  }
  return { missing };
}

/**
 * THE ENFORCEMENT. Pure, exported, and it names every field it is missing in one answer rather than
 * one per round trip -- a caller assembling evidence for a foreign repository should learn the whole
 * gap on the first refusal.
 *
 * A capability with no registry entry is unconstrained, exactly as before this ticket: the generic
 * `task_context` object check in callToolThroughExecutor() is still the floor for all 25 tools.
 */
export function validateToolInput(slug, taskContext) {
  const spec = TOOL_INPUT_SCHEMAS[slug];
  if (!spec) return { ok: true, missing: [] };
  if (!taskContext || typeof taskContext !== 'object' || Array.isArray(taskContext)) {
    return { ok: false, missing: spec.required.slice() };
  }
  const missing = [];
  for (const field of spec.required) {
    const value = taskContext[field];
    if (field === 'gates') {
      missing.push(...normalizeGateEvidence(value, taskContext.gate_detail).missing);
      continue;
    }
    const declared = spec.properties[field] || {};
    if (declared.type === 'array') {
      // An EMPTY array is a missing field, not a satisfied one. "This change touches no files" is
      // not a delivery to grade, and treating [] as present is how a fail-closed check goes green
      // on nothing.
      if (!Array.isArray(value) || value.length === 0 || value.some(v => typeof v !== 'string' || !v.trim())) missing.push(field);
      continue;
    }
    if (typeof value !== 'string' || !value.trim()) missing.push(field);
  }
  return { ok: missing.length === 0, missing };
}

export function toTool(row) {
  const holder = row.agent_role ? `${row.agent_name} -- ${row.agent_role}` : row.agent_name;
  const lane = row.lane ? `${row.lane} lane` : 'unclassified lane';
  const description =
    `${row.description}`.trim() +
    `\n\nRun by ${holder} (${lane}), ${row.execution_type} execution.`;
  // SES-339: a registry entry PUBLISHES what tools/call enforces, so a client learns the contract
  // from the list instead of from a refusal. `additionalProperties` is deliberately left open --
  // every extra key is still serialized into the prompt, which is the executor's whole design.
  const inputSpec = TOOL_INPUT_SCHEMAS[row.slug];
  const taskContextSchema = {
    type: 'object',
    description: inputSpec
      ? `${inputSpec.description} Every extra key you supply is serialized into the agent's prompt too.`
      : 'The task, as an object. Every non-empty key is serialized into the agent\'s prompt, ' +
        'so field names are part of the instruction.',
  };
  if (inputSpec) {
    taskContextSchema.properties = inputSpec.properties;
    taskContextSchema.required = inputSpec.required;
  }
  const tool = {
    name: row.slug,
    title: row.name,
    description,
    inputSchema: {
      type: 'object',
      properties: {
        task_context: taskContextSchema,
        intent_slug: {
          type: 'string',
          description: row.default_intent_slug
            ? `Optional Intent Skill override. Defaults to "${row.default_intent_slug}".`
            : 'Optional Intent Skill slug. This capability declares no default intent.',
        },
      },
      required: ['task_context'],
      additionalProperties: false,
    },
  };
  if (row.output_schema) tool.outputSchema = row.output_schema;
  return tool;
}

// ---------------------------------------------------------------------------------------------
// The governance key
// ---------------------------------------------------------------------------------------------

let secretCache = { value: null, at: 0 };

async function readGovernanceSecret() {
  const now = Date.now();
  if (secretCache.at && now - secretCache.at < SECRET_TTL_MS) return secretCache.value;
  let value = null;
  try {
    const rows = await sbSelect(`runner_secrets?name=eq.${encodeURIComponent(SECRET_NAME)}&select=value&limit=1`);
    value = rows[0] && typeof rows[0].value === 'string' && rows[0].value ? rows[0].value : null;
  } catch (e) {
    // FAILS CLOSED. An unreadable secret means no governance tools, never all of them. One line,
    // never the value.
    console.error(`[mcp] could not read ${SECRET_NAME}: ${e && e.message ? e.message : String(e)}`);
    value = null;
  }
  secretCache = { value, at: now };
  return value;
}

/** Constant-time, and never throws on a length mismatch (timingSafeEqual does). */
export function keysMatch(presented, expected) {
  if (typeof presented !== 'string' || typeof expected !== 'string') return false;
  if (!presented || !expected) return false;
  const a = Buffer.from(presented, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// ---------------------------------------------------------------------------------------------
// The JSON-RPC dispatcher
// ---------------------------------------------------------------------------------------------

class RpcError extends Error {
  constructor(code, message, data) {
    super(message);
    this.code = code;
    this.data = data;
  }
}

function rpcResult(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function rpcError(id, code, message, data) {
  const error = { code, message };
  if (data !== undefined) error.data = data;
  return { jsonrpc: '2.0', id: id ?? null, error };
}

export function negotiateProtocolVersion(requested) {
  return SUPPORTED_PROTOCOL_VERSIONS.includes(requested) ? requested : LATEST_PROTOCOL_VERSION;
}

/**
 * The whole protocol, with every side effect injected.
 *
 * @param message  one parsed JSON-RPC message (batching is not supported -- the 2025-06-18 revision
 *                 removed it, so an array is an Invalid Request, not a loop).
 * @param deps     { listTools, callTool } -- both async, both supplied by the handler in production
 *                 and by fixtures in the unit arm.
 * @returns        a JSON-RPC response object, or `null` when the message was a notification and the
 *                 transport owes the client a bodyless 202.
 */
export async function dispatchJsonRpc(message, deps = {}) {
  if (Array.isArray(message)) {
    return rpcError(null, INVALID_REQUEST, 'JSON-RPC batching is not supported by this server');
  }
  if (!message || typeof message !== 'object') {
    return rpcError(null, INVALID_REQUEST, 'Request body must be a JSON-RPC 2.0 object');
  }
  if (message.jsonrpc !== '2.0') {
    return rpcError(message.id ?? null, INVALID_REQUEST, 'Missing or invalid "jsonrpc": expected "2.0"');
  }
  if (typeof message.method !== 'string' || !message.method) {
    return rpcError(message.id ?? null, INVALID_REQUEST, 'Missing "method"');
  }

  const isNotification = message.id === undefined || message.id === null;
  const { id, method, params } = message;

  // A notification is answered by the transport (202, no body) whatever it says. `initialized` is
  // the one this server actually expects; any other notification (cancelled, progress) is likewise
  // accepted and dropped, which is exactly what a server with no long-running streams owes them.
  if (isNotification) return null;

  try {
    switch (method) {
      case 'initialize':
        return rpcResult(id, {
          protocolVersion: negotiateProtocolVersion(params && params.protocolVersion),
          capabilities: { tools: {} },
          serverInfo: SERVER_INFO,
          instructions: SERVER_INSTRUCTIONS,
        });

      case 'ping':
        return rpcResult(id, {});

      case 'tools/list':
        return rpcResult(id, { tools: await deps.listTools() });

      case 'tools/call': {
        const name = params && params.name;
        if (typeof name !== 'string' || !name) {
          throw new RpcError(INVALID_PARAMS, 'tools/call requires a string "name"');
        }
        return rpcResult(id, await deps.callTool({ name, args: (params && params.arguments) || {} }));
      }

      default:
        return rpcError(id, METHOD_NOT_FOUND, `Method not found: ${method}`);
    }
  } catch (e) {
    if (e instanceof RpcError) return rpcError(id, e.code, e.message, e.data);
    // NEVER A STACK. The executor's own message is the useful half and the only half a remote
    // client is owed; the stack goes to the function log.
    console.error('[mcp] dispatch error:', e);
    return rpcError(id, INTERNAL_ERROR, e && e.message ? e.message : 'Internal error');
  }
}

// ---------------------------------------------------------------------------------------------
// tools/call -> the executor
// ---------------------------------------------------------------------------------------------

/**
 * Shapes one runCapability() return into an MCP tool result.
 *
 * `result.content` is request-receivable.js's `parsedResponse`: a STRING when the turn was plain
 * text, and the parsed OBJECT when the Intent forced an output schema. Structured content is only
 * attached when the tool actually published an outputSchema, because a client validates one against
 * the other. A non-terminal return (pending_confirmation, in_progress, depth_exceeded) carries no
 * `content` at all -- it is rendered as its own JSON rather than flattened into a lie about having
 * answered.
 */
export function toToolResult(result, row) {
  const raw = result ? result.content : undefined;
  const structured = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : null;
  let text;
  if (typeof raw === 'string') text = raw;
  else if (structured) text = JSON.stringify(structured, null, 2);
  else text = JSON.stringify(result ?? {}, null, 2);

  const out = { content: [{ type: 'text', text }], isError: false };
  if (structured && row && row.output_schema) out.structuredContent = structured;
  return out;
}

/**
 * THE EXECUTOR SEAM. Extracted by SES-339 so the refusal guard can be proven to stop SHORT of it:
 * a test that only watched the return value would pass whether or not the schema was enforced,
 * because both paths end in "no verdict". A spy passed in here can only be called if the guard let
 * the request through. Production never passes `execute`.
 */
async function runThroughExecutor({ row, intentSlug, taskContext }) {
  const ctx = getRequestContext();
  return runWithCallSource(
    'mcp',
    () =>
      runCapability({
        capability_slug: row.slug,
        intent_slug: intentSlug,
        agent_id: row.agent_id,
        task_context: taskContext,
        tenant_id: row.tenant_id,
      }),
    // Spread first: runWithCallSource writes callSource last, so the real caller's ip / device /
    // visitor attribution rides through untouched while screen_origin becomes 'mcp'.
    { ...ctx, screenOrigin: 'mcp' },
  );
}

export async function callToolThroughExecutor({ name, args, rows, execute = runThroughExecutor }) {
  const row = rows.find(r => r.slug === name);
  if (!row) {
    // The SAME message whether the tool does not exist or exists in the governance lane and this
    // caller has no key -- a distinct "exists but hidden" error would be an inventory oracle.
    throw new RpcError(INVALID_PARAMS, `Unknown tool: ${name}`);
  }
  const taskContext = args && args.task_context;
  if (!taskContext || typeof taskContext !== 'object' || Array.isArray(taskContext)) {
    throw new RpcError(INVALID_PARAMS, `${name} requires a "task_context" object argument`);
  }
  // FEATURE: SES-339 -- BEFORE DISPATCH, and the ordering is the ticket. A partial submission used
  // to reach the executor, spend a real model call, and come back with a verdict reached on evidence
  // that was never in the prompt. -32602 is a PROTOCOL error rather than an isError result on
  // purpose: the arguments are wrong, the tool never ran, and a client that re-plans on isError
  // would be re-planning around an answer nobody gave.
  const inputCheck = validateToolInput(row.slug, taskContext);
  if (!inputCheck.ok) {
    throw new RpcError(
      INVALID_PARAMS,
      `${name} requires task_context.${inputCheck.missing.join(', task_context.')} -- missing or empty, so the call was refused before it reached the agent`,
      { missing: inputCheck.missing },
    );
  }

  const intentSlug =
    args && typeof args.intent_slug === 'string' && args.intent_slug
      ? args.intent_slug
      : row.default_intent_slug;

  // AA-188: runCapability() does NOT fall back to capabilities.default_intent_slug when intent_slug
  // is null -- it assembles with every Intent Skill skipped. Resolving the default HERE is therefore
  // load-bearing, not a convenience, and it is a generic column read, never a slug conditional.
  try {
    const result = await execute({ row, intentSlug, taskContext });
    return toToolResult(result, row);
  } catch (e) {
    // MCP's own rule: a TOOL failure is a result with isError, not a protocol error, so the calling
    // model can see what went wrong and re-plan. Protocol failures above stay JSON-RPC errors.
    // Message only -- never a stack.
    console.error(`[mcp] ${row.slug} failed:`, e);
    return {
      content: [{ type: 'text', text: e && e.message ? e.message : 'capability execution failed' }],
      isError: true,
    };
  }
}

// ---------------------------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------------------------

const GET_EXPLANATION =
  'The DeepBench MCP endpoint is POST-only: send JSON-RPC 2.0 messages by HTTP POST. This server ' +
  'offers no server-initiated SSE stream, which the Streamable HTTP transport answers with 405.';

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  // Set on the route rather than in vercel.json: middleware.js's CORS_HEADERS constant documents
  // itself as mirroring vercel.json's three headers on /api/(.*), and widening that shared line for
  // one route would put the mirror out of true. execute.js already sets its own narrower value here,
  // so a route-scoped list is the established shape.
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, x-deepbench-mcp-key, MCP-Protocol-Version, Mcp-Session-Id',
  );
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: GET_EXPLANATION });

  let message = req.body;
  if (typeof message === 'string') {
    try {
      message = JSON.parse(message);
    } catch {
      return res.status(400).json(rpcError(null, PARSE_ERROR, 'Request body is not valid JSON'));
    }
  }

  // The version header is required on every request AFTER initialization; `initialize` is exempt
  // because it is the request that settles the version. An unsupported value is a 400 per spec.
  const declaredVersion = req.headers['mcp-protocol-version'];
  const isInitialize = message && typeof message === 'object' && message.method === 'initialize';
  if (declaredVersion && !isInitialize && !SUPPORTED_PROTOCOL_VERSIONS.includes(String(declaredVersion))) {
    return res.status(400).json(
      rpcError(null, INVALID_REQUEST, `Unsupported MCP-Protocol-Version: ${declaredVersion}`, {
        supported: SUPPORTED_PROTOCOL_VERSIONS,
      }),
    );
  }

  // Scope, resolved once per request and shared by list and call.
  let rowsPromise = null;
  const visible = async () => {
    if (!rowsPromise) {
      rowsPromise = (async () => {
        const [all, secret] = await Promise.all([fetchCapabilityRows(), readGovernanceSecret()]);
        const governanceUnlocked = keysMatch(req.headers[GOVERNANCE_KEY_HEADER], secret);
        return visibleRows(all, { governanceUnlocked });
      })();
    }
    return rowsPromise;
  };

  const response = await dispatchJsonRpc(message, {
    listTools: async () => (await visible()).map(toTool),
    callTool: async ({ name, args }) => callToolThroughExecutor({ name, args, rows: await visible() }),
  });

  // A notification is owed 202 Accepted with no body -- literally, per the transport spec.
  if (response === null) return res.status(202).end();
  return res.status(200).json(response);
}

export const mcpHandler = withRequestContext(handler);
