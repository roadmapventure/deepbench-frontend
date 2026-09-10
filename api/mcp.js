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
import { runCapability } from './capabilities/execute.js';
import { withRequestContext, getRequestContext, runWithCallSource } from '../lib/request-context.js';

// package.json is read through createRequire rather than an import attribute so the Vercel builder
// traces it as a plain dependency. A failure here costs the server its version string and nothing
// else, so it degrades to a literal rather than refusing to boot.
let PACKAGE_VERSION = '0.0.0';
try {
  PACKAGE_VERSION = createRequire(import.meta.url)('../package.json').version || '0.0.0';
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

export function toTool(row) {
  const holder = row.agent_role ? `${row.agent_name} -- ${row.agent_role}` : row.agent_name;
  const lane = row.lane ? `${row.lane} lane` : 'unclassified lane';
  const description =
    `${row.description}`.trim() +
    `\n\nRun by ${holder} (${lane}), ${row.execution_type} execution.`;
  const tool = {
    name: row.slug,
    title: row.name,
    description,
    inputSchema: {
      type: 'object',
      properties: {
        task_context: {
          type: 'object',
          description:
            'The task, as an object. Every non-empty key is serialized into the agent\'s prompt, ' +
            'so field names are part of the instruction.',
        },
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

async function callToolThroughExecutor({ name, args, rows }) {
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
  const intentSlug =
    args && typeof args.intent_slug === 'string' && args.intent_slug
      ? args.intent_slug
      : row.default_intent_slug;

  // AA-188: runCapability() does NOT fall back to capabilities.default_intent_slug when intent_slug
  // is null -- it assembles with every Intent Skill skipped. Resolving the default HERE is therefore
  // load-bearing, not a convenience, and it is a generic column read, never a slug conditional.
  const ctx = getRequestContext();
  try {
    const result = await runWithCallSource(
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

export default withRequestContext(handler);
