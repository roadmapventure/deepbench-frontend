// DeepBench v7.0.792 | api/_lib/mcp.js | AGT-390 -- a second deterministic handler, `agent-teach`, is
// registered by NAME (the Intent row `agent-teach-intent` declares it), and runDeterministic() hands
// every handler the matched MCP key's NAME as handler_context.caller_key_name, so a taught row records
// which caller taught it. The key's value still never leaves keysMatch(). No slug conditional added.
//
// DeepBench v7.0.771 | api/_lib/mcp.js | AGT-338 slice 2 -- the own-knowledge rule. A capability
// whose Intent row carries `traits.any_agent = true` assembles with `any_agent: true`; visibleRows()
// drops such a row from every non-admin address, and runDeterministic() hands the fact to the
// handler, which otherwise reads only the holder's own knowledge. A generic trait read -- no id or
// slug is named here. No model call added.
//
// DeepBench v7.0.766 | api/_lib/mcp.js | AGT-338 -- a team has one MCP address. The segment after
// `/api/mcp/` is now resolved to a SET of agents by resolveAddress(): no segment is every agent (the
// admin address), 64 lowercase hex is a team's address and names that team's members, and anything
// else is one agent id exactly as AGT-333 shipped it. visibleRows() -- still the ONE visibility
// function -- narrows to that set AFTER the lane rule, so a team address lists one tool per member
// and an agent added to the team later appears on the same connection with no reconnect. On any
// non-admin address `initialize` names the agents available (connectionInstructions()).
// `teams.address` is the team's secret: it is used only as a filter value and is never selected,
// logged or returned. A failed team read is an error, never an empty list. No model call added.
//
// DeepBench v7.0.754 | api/_lib/mcp.js | AGT-336 -- the tool list asks the one "who may see this
// agent" check. public.agents now carries an owner and a sharing level (owner_id, sharing,
// shared_with), and shared/agent-visibility.js is the single place that reads them. The agents read
// below names those columns through AGENT_ACCESS_COLUMNS, and assembleCapabilityRows() passes its
// agents through visibleAgents() before it picks a holder -- so a capability whose only holder the
// viewer may not see is dropped the same way a capability with no active holder already is. NOTHING
// IS ENFORCED YET: nobody signs in, no caller passes a viewer, and a null viewer sees everything, so
// the list is byte-for-byte what it was. visibleRows() is untouched by this ticket.
//
// DeepBench v7.0.756 | api/_lib/mcp.js | AGT-333 -- every agent has its own MCP address.
// `/api/mcp/<agent id>` is a second vercel.json rewrite onto this same handler carrying
// `agent=<id>`; addressedAgentId() reads that one query value and visibleRows() -- still the ONE
// visibility function -- narrows to the rows that agent holds, AFTER the lane rule. So an agent's
// address shows at most what the same caller already sees for that agent on `/api/mcp`, an unknown
// id shows nothing, and `/api/mcp` itself (no `agent` value) lists and accepts exactly what it did.
// The comparison is the row's own `agent_id` against the request's value, never a literal (§19b).
//
// DeepBench v7.0.684 | api/_lib/mcp.js | AGT-163 -- an MCP key's NAME becomes the caller's visitor_id.
// Every `call_source = 'mcp'` row in `ai_activity_log` carried `visitor_id NULL` (all 32, measured
// 2026-09-28) while the web path attributes 3,518 of 4,283. IP capture already works over the wire
// (3 of the 4 genuinely remote calls carry `caller_ip`); IDENTITY was the whole gap, because an MCP
// client sends no cookie and no `x-db-visitor-id`, and the one signal it does send -- its key -- was
// read as a single secret and reduced to a boolean right here, discarding WHICH key matched.
// Now: readMcpKeys() reads every `runner_secrets` row named `MCP_*` by name in one call,
// resolveCallerKey() constant-time-matches the presented `x-deepbench-mcp-key` against all of them,
// and mcpAttribution() -- the one core BOTH seams call -- writes the matched row's NAME into the
// call's `visitor_id`. `MCP_API_KEY` remains the sole governance unlock. THE VALUE NEVER LEAVES
// keysMatch(): no key is minted, printed, logged or committed by this file or its tests, and no
// column, grant or screen changed -- `known_callers` (`match_type 'visitor_id'`) already resolves a
// visitor_id to a display name. Adding a caller is one `runner_secrets` row and no deploy.
//
// DeepBench v7.0.682 | api/_lib/mcp.js | AGT-162 -- a capability can now answer a `tools/call`
// WITHOUT a model call. Until this ticket every tools/call reached runThroughExecutor() ->
// runCapability(), so an outside platform asking DeepBench for an agent's scaffold paid for a model
// turn and got prose ABOUT the scaffold instead of the scaffold. The seam is a READ of the column
// that has carried this fact since AG-13: `capabilities.execution_type`. `deterministic` goes to
// runDeterministic(), `ai` goes to the same executor it always did, and there is still no `if` on a
// slug anywhere in this file -- DETERMINISTIC_HANDLERS is keyed on the handler NAME the Intent row
// declares in `traits.handler`, exactly as api/prompt/request-receivable.js's HANDLERS is keyed on
// `format_contract.handler`. A `deterministic` row whose Intent names no handler is DROPPED from the
// list rather than advertised, the same posture already taken for a capability with no active holder.
//
// WHY NOT `resources/*`, which is the obvious MCP answer and was rejected on the spec: a resource is
// APPLICATION-driven -- the user or host attaches it -- so the calling model cannot fetch it itself,
// which is the entire use case. `resources/list` would also be a second inventory that visibleRows()
// does not govern, with no `capabilities` row behind it (§19b). The reasoning is docs/harvests/AGT-162.md §2.
//
// AND THE INPUT CONTRACT MOVED HOME. TOOL_INPUT_SCHEMAS' own comment below named the condition for
// retiring the table -- "the SECOND capability that needs one". This is it, so the second contract
// ships as DATA (`skill_profiles.traits.input_schema`), read generically and published in tools/list
// beside the code-side entry. `verify-ship` stays in the table for the reason stated there.
//
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
import { handle as agentBundleHandle } from './handlers/agent-bundle.js';
import { handle as agentTeachHandle } from './handlers/agent-teach.js';
import { withRequestContext, getRequestContext, runWithCallSource } from '../../lib/request-context.js';
import { visibleAgents, AGENT_ACCESS_COLUMNS } from '../../shared/agent-visibility.js';

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
    sbSelect(`agents?select=id,name,role,lane,is_active,${AGENT_ACCESS_COLUMNS}`),
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
export function assembleCapabilityRows({ capabilities = [], assignments = [], agents = [], intents = [], viewer = null }) {
  const agentById = new Map(visibleAgents(agents, viewer).map(a => [a.id, a]));
  const intentBySlug = new Map(intents.map(s => [s.slug, s]));

  const holderBySlug = new Map();
  for (const a of assignments) {
    const agent = agentById.get(a.agent_id);
    if (!agent || agent.is_active !== true) continue;
    if (!holderBySlug.has(a.capability_slug)) holderBySlug.set(a.capability_slug, agent);
  }

  const rows = [];
  for (const c of capabilities) {
    // A "group" is a set of Skills a user built on Personnel, never a tool (add-capability).
    if (c.execution_type === 'group') continue;
    const holder = holderBySlug.get(c.slug);
    if (!holder) continue;
    const intent = c.default_intent_slug ? intentBySlug.get(c.default_intent_slug) : null;
    const schema = intent && intent.traits && intent.traits.schema;
    // FEATURE: AGT-162 -- the two data-side halves of a deterministic tool: WHO runs it
    // (`traits.handler`, resolved against DETERMINISTIC_HANDLERS by name) and WHAT it requires
    // (`traits.input_schema`, the home TOOL_INPUT_SCHEMAS' comment names for the second contract).
    const handler = (intent && intent.traits && intent.traits.handler) || null;
    const inputSchema = intent && intent.traits && intent.traits.input_schema;
    const executionType = c.execution_type || 'ai';
    // A DETERMINISTIC ROW WITH NO HANDLER CANNOT RUN, so it is dropped rather than advertised --
    // the same rule the holder check above applies, for the same reason: listing it would publish a
    // tool that answers every call with an internal error. An `ai` row needs no handler and keeps
    // its place, which is why this reads the column rather than the handler's presence alone.
    if (executionType === 'deterministic' && !handler) continue;
    rows.push({
      slug: c.slug,
      name: c.name || c.slug,
      description: c.description || '',
      execution_type: executionType,
      handler,
      // Only an object is usable as an input contract; anything else is dropped rather than half-read.
      input_schema: inputSchema && typeof inputSchema === 'object' && !Array.isArray(inputSchema) ? inputSchema : null,
      default_intent_slug: c.default_intent_slug || null,
      any_agent: !!(intent && intent.traits && intent.traits.any_agent === true),
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
 *
 * FEATURE: AGT-333 -- THE PER-AGENT ADDRESS NARROWS HERE, AFTER THE LANE RULE, never instead of it.
 * `agentId` is what addressedAgentId() read from the request: `undefined` / `null` is the admin
 * address (`/api/mcp`) and changes nothing -- every caller that passes no `agentId` gets exactly the
 * rows it got before this ticket. Any other value keeps only the rows whose own `agent_id` equals
 * it, so an address can only ever SUBTRACT from what the lane rule already allowed: a governance
 * agent's address is empty without the key, and an id no row carries (unknown, or '') is empty for
 * everyone. The row's column against the request's value -- no agent is named in this file.
 *
 * The request's value is bound to `addressed` because agt-162 and agt-163's static guards flag ANY
 * identity comparison on an agent id in this file, literal or not.
 *
 * FEATURE: AGT-338 -- AN ADDRESS IS A SET OF AGENTS. `agentIds` is what resolveAddress() returned:
 * `null` / `undefined` is every agent (the admin address), otherwise an array of ids -- a team's
 * members, one agent, or nobody (`[]`, which lists nothing for everyone). `agentId` stays for the
 * existing callers and is read as the one-member set, so both spellings run the same membership
 * test and there is still one rule. The set can only SUBTRACT, exactly as before: the lane rule is
 * applied to every team member, so a governance agent on a team is listed only with the key.
 *
 * FEATURE: AGT-338 -- THE OWN-KNOWLEDGE RULE (slice 2). A row whose Intent carries the any-agent
 * fact (`any_agent: true`, read from `traits.any_agent` in assembleCapabilityRows()) is a tool that
 * can read ANY agent's knowledge, so it is listed on the admin address only: on every set -- a team,
 * one agent, even its own holder's address -- it is dropped, and because `tools/call` runs this same
 * function it is `Unknown tool` there too. The row's own fact, never a slug.
 */
export function visibleRows(rows, { governanceUnlocked, agentId: addressed, agentIds }) {
  const set = agentIds !== undefined && agentIds !== null ? agentIds : (addressed !== undefined && addressed !== null ? [addressed] : null);
  return rows.filter(
    r => (r.lane === 'product' || governanceUnlocked === true) && (!set || (set.includes(r.agent_id) && r.any_agent !== true)),
  );
}

/**
 * FEATURE: AGT-333 -- WHICH AGENT THIS REQUEST ADDRESSED, read once from the rewrite's query value.
 * Pure.
 *
 * `null` means the admin address: `/api/mcp` rewrites with `transport=mcp` and no `agent`, so the
 * key is absent and nothing is narrowed. `/api/mcp/<id>` rewrites with `agent=<id>`, returned
 * trimmed. ANYTHING ELSE FAILS CLOSED TO '' -- an empty value, or the array a repeated `agent`
 * parameter arrives as -- because '' matches no row, whereas answering `null` there would turn a
 * malformed agent address into the admin address.
 */
export function addressedAgentId(query) {
  if (!query || query.agent === undefined) return null;
  return typeof query.agent === 'string' ? query.agent.trim() : '';
}

// FEATURE: AGT-338 -- the shape of a team's address: `teams.address` defaults to 64 lowercase hex.
// The longest agent id is 40 characters, so the two cannot be confused.
const TEAM_ADDRESS_SHAPE = /^[0-9a-f]{64}$/;

/**
 * FEATURE: AGT-338 -- the agents on the team that holds this address. An address no team holds is
 * the empty list. `address` is used only as the filter value: it is never selected, logged or
 * returned. A failed read throws (sbSelect), and the caller lets it.
 */
async function readTeamAgentIds(address) {
  const teams = await sbSelect(`teams?address=eq.${address}&select=id&limit=1`);
  if (!teams.length) return [];
  const members = await sbSelect(`agent_teams?team_id=eq.${teams[0].id}&select=agent_id`);
  return members.map(m => m.agent_id);
}

/**
 * FEATURE: AGT-338 -- THE ONE ADDRESS RESOLVER. An address is a set of agents: `null` is every
 * agent (the admin address), otherwise an array of ids for visibleRows()'s `agentIds`.
 *
 * No segment -> `null`. A malformed one ('' from addressedAgentId()) -> `[]`, never `null`, so a
 * broken address can never become the admin address. 64 lowercase hex -> that team's members, read
 * live on every request, which is why an agent added later appears on the same connection. Anything
 * else -> that one agent id, exactly as AGT-333 shipped it. A failed team read throws: answering
 * `[]` there would tell a tester her team is empty when the database is down.
 *
 * `readTeam` is injected so the unit arm can prove WHICH branch asked the team reader.
 */
export async function resolveAddress(query, readTeam = readTeamAgentIds) {
  const segment = addressedAgentId(query);
  if (segment === null) return null;
  if (segment === '') return [];
  if (TEAM_ADDRESS_SHAPE.test(segment)) return await readTeam(segment);
  return [segment];
}

/**
 * FEATURE: AGT-338 -- WHO IS AVAILABLE ON THIS CONNECTION, for `initialize`. Pure.
 *
 * The admin address (`scoped` false) answers the base text byte for byte. Any other address names
 * each distinct agent once, in row order, from the same rows tools/list will show -- so the roster
 * sentence and the tool list cannot disagree. The names are the rows' own `agent_name`; none is
 * written in this file.
 */
export function connectionInstructions(rows, scoped) {
  if (!scoped) return SERVER_INSTRUCTIONS;
  const names = [...new Set(rows.map(r => r.agent_name))];
  if (!names.length) return SERVER_INSTRUCTIONS + ' No agent is available at this address.';
  return SERVER_INSTRUCTIONS + ' Agents available on this connection: ' + names.join(', ') + '. When the user names one, call that agent\'s tool.';
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
 *
 * FEATURE: AGT-162 -- `spec` became a parameter so the contract can come from EITHER home: the code
 * table above, or the row's own `traits.input_schema`. The validation is unchanged and there is one
 * copy of it; only where the spec was read from moved.
 */
export function validateToolInput(slug, taskContext, spec = TOOL_INPUT_SCHEMAS[slug]) {
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
  // AGT-162: the code table first, then the row's own data-side contract. Both publish identically,
  // which is the point -- a client cannot tell (and should not care) which home a contract came from.
  const inputSpec = TOOL_INPUT_SCHEMAS[row.slug] || row.input_schema;
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

let keysCache = { rows: null, at: 0 };

/**
 * FEATURE: AGT-163 -- EVERY `MCP_*` ROW IS A KEY, and the read is one call, not one per key.
 *
 * Until this ticket this function read exactly one secret and the caller reduced it to a boolean,
 * so the server knew THAT it had been called with a valid key and never WHICH -- which is why all 32
 * `call_source = 'mcp'` rows in `ai_activity_log` carry `visitor_id NULL`. An MCP client sends no
 * cookie and no `x-db-visitor-id` (lib/request-context.js), so the key is its only identity signal.
 *
 * The name pattern IS the registry: adding a tester costs one `runner_secrets` row and no deploy
 * (.claude/rules/capabilities-are-data.md's posture, applied to credentials). `MCP_API_KEY` keeps its
 * separate job -- it alone unlocks the governance lane, see resolveCallerKey() -- but every matched
 * row's NAME becomes the call's attribution. No value is ever returned past keysMatch().
 */
async function readMcpKeys() {
  const now = Date.now();
  if (keysCache.at && now - keysCache.at < SECRET_TTL_MS) return keysCache.rows;
  let rows = [];
  try {
    // `like.MCP_*` is PostgREST's wildcard form; `_` is also a SQL LIKE single-char wildcard, so the
    // prefix is re-checked here rather than trusted to the filter.
    const raw = await sbSelect('runner_secrets?name=like.MCP_*&select=name,value');
    rows = (Array.isArray(raw) ? raw : []).filter(
      r =>
        r &&
        typeof r.name === 'string' &&
        r.name.startsWith('MCP_') &&
        typeof r.value === 'string' &&
        r.value !== '',
    );
  } catch (e) {
    // FAILS CLOSED. An unreadable secret list means no governance tools and no key attribution,
    // never all of them. One line, never a value and never a name count that implies one.
    console.error(`[mcp] could not read MCP_* keys: ${e && e.message ? e.message : String(e)}`);
    rows = [];
  }
  keysCache = { rows, at: now };
  return rows;
}

/**
 * FEATURE: AGT-163 -- the presented key, resolved to a NAME.
 *
 * NO EARLY RETURN, on purpose: every row is compared on every call, so the work done does not depend
 * on which row matched or on how many rows sit before it. keysMatch() is already constant-time per
 * comparison; stopping at the first hit would leak the ordinal through the clock.
 *
 * `governanceUnlocked` stays exactly what it was -- a match on `MCP_API_KEY` and nothing else -- so a
 * tester's key attributes his calls without widening what he can see.
 */
export function resolveCallerKey(presented, rows) {
  let name = null;
  for (const row of Array.isArray(rows) ? rows : []) {
    if (row && keysMatch(presented, row.value)) name = row.name;
  }
  return { name, governanceUnlocked: name === SECRET_NAME };
}

/**
 * FEATURE: AGT-163 -- THE ONE ATTRIBUTION CORE both seams call.
 *
 * runThroughExecutor() and runDeterministic() each establish the same attribution, and two copies of
 * this object literal is two answers waiting to disagree (the `screenOrigin: 'mcp'` spread already
 * existed twice). The matched key's NAME goes into `visitorId` -- the plumbing identity slot
 * ARCHITECTURE §19k reserves for exactly this, a non-browser caller with no other way to fill it --
 * and a `known_callers` row with `match_type 'visitor_id'` on that NAME labels it in the AI Audit,
 * so no column, no grant and no screen changes.
 *
 * A keyless caller is untouched: whatever `x-db-visitor-id` it sent still stands, else null.
 * THE VALUE NEVER ARRIVES HERE -- only the name does.
 */
export function mcpAttribution(ctx, callerKeyName) {
  return {
    ...ctx,
    screenOrigin: 'mcp',
    visitorId: callerKeyName || (ctx && ctx.visitorId) || null,
  };
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
          instructions: deps.instructions ? await deps.instructions() : SERVER_INSTRUCTIONS,
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
async function runThroughExecutor({ row, intentSlug, taskContext, callerKeyName = null }) {
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
    // Spread first: runWithCallSource writes callSource last, so the real caller's ip / device
    // attribution rides through untouched while screen_origin becomes 'mcp' and AGT-163's key name
    // takes the visitor slot.
    mcpAttribution(ctx, callerKeyName),
  );
}

/**
 * FEATURE: AGT-162 -- THE DETERMINISTIC SEAM, and the registry that serves it.
 *
 * Keyed on the handler NAME the Intent row declares, never on a capability slug: the same shape as
 * api/prompt/request-receivable.js's HANDLERS, which dispatches on `format_contract.handler`. A
 * second map rather than that one because the `content` a handler here receives is the CALLER's
 * task_context, while request-receivable.js's handlers receive the MODEL's structured output after a
 * turn. Same signature, different provenance; merging them is filed residue, not this ticket.
 */
export const DETERMINISTIC_HANDLERS = Object.freeze({ 'agent-bundle': agentBundleHandle, 'agent-teach': agentTeachHandle });

/**
 * The deterministic twin of runThroughExecutor(). It establishes the SAME attribution -- call_source
 * and screen_origin 'mcp', the real caller's ip/device/visitor carried through -- so the audit row
 * the handler writes is indistinguishable from a model call's in every respect EXCEPT the one that
 * matters: no model, no tokens, no cost. That absence is the ticket's own proof.
 *
 * `governanceUnlocked` is forwarded rather than re-derived: the handler applies the same lane rule to
 * the agent it was ASKED about that visibleRows() applies to the tool list, and a second derivation
 * is a second answer waiting to disagree with the first.
 */
export async function runDeterministic({ row, taskContext, governanceUnlocked, callerKeyName = null }) {
  const ctx = getRequestContext();
  const handle = DETERMINISTIC_HANDLERS[row.handler];
  // Unreachable through assembleCapabilityRows(), which drops a handler-less deterministic row --
  // this catches a handler named in data that no deployment carries, which is a real failure mode
  // the moment a migration lands before the code that serves it.
  if (!handle) throw new Error(`No deterministic handler named "${row.handler}" is registered in this deployment`);
  const result = await runWithCallSource(
    'mcp',
    () =>
      handle({
        agent_id: row.agent_id,
        tenant_id: row.tenant_id,
        content: taskContext,
        handler_context: {
          governance_unlocked: governanceUnlocked === true,
          any_agent: row.any_agent === true,
          // FEATURE: AGT-390 -- the matched key's NAME (null for a keyless caller), never its value.
          caller_key_name: callerKeyName || null,
        },
      }),
    mcpAttribution(ctx, callerKeyName),
  );
  return toToolResult({ content: result }, row);
}

export async function callToolThroughExecutor({
  name,
  args,
  rows,
  execute = runThroughExecutor,
  executeDeterministic = runDeterministic,
  governanceUnlocked = false,
  // AGT-163: the matched key's NAME, resolved once per request in visible() and forwarded to both
  // seams. `null` is a keyless caller, which attributes exactly as it did before this ticket.
  callerKeyName = null,
}) {
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
  const inputCheck = validateToolInput(row.slug, taskContext, TOOL_INPUT_SCHEMAS[row.slug] || row.input_schema);
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
    // FEATURE: AGT-162 -- ONE COLUMN READ, and it is the whole branch. Not a slug, not a handler
    // lookup, not a second registry of names this file knows: the capability's own declared
    // `execution_type`, the column buildSignatureConfig() already stamps into every call_facts and
    // toTool() already prints in the description. Everything `ai` takes the path it always took.
    if (row.execution_type === 'deterministic') {
      return await executeDeterministic({ row, taskContext, governanceUnlocked, callerKeyName });
    }
    const result = await execute({ row, intentSlug, taskContext, callerKeyName });
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

  // Scope, resolved once per request and shared by list and call. AGT-162: the KEY'S VERDICT rides
  // alongside the rows rather than being recomputed, because a deterministic handler applies the
  // same lane rule to the agent it was asked ABOUT that visibleRows() applies to the tool list --
  // one derivation, two consumers, exactly as listing and calling already share one visibility function.
  let scopePromise = null;
  const visible = async () => {
    if (!scopePromise) {
      scopePromise = (async () => {
        const [all, keys, agentIds] = await Promise.all([fetchCapabilityRows(), readMcpKeys(), resolveAddress(req.query)]);
        // AGT-163: one resolution, three consumers -- the lane gate, the deterministic handler's
        // own lane rule, and the attribution written on the call's audit row.
        const { name, governanceUnlocked } = resolveCallerKey(req.headers[GOVERNANCE_KEY_HEADER], keys);
        // AGT-338: `scoped` is "this is not the admin address" -- it decides only whether
        // `initialize` names the agents on the connection.
        return { rows: visibleRows(all, { governanceUnlocked, agentIds }), governanceUnlocked, callerKeyName: name, scoped: agentIds !== null };
      })();
    }
    return scopePromise;
  };

  const response = await dispatchJsonRpc(message, {
    listTools: async () => (await visible()).rows.map(toTool),
    callTool: async ({ name, args }) => {
      const { rows, governanceUnlocked, callerKeyName } = await visible();
      return callToolThroughExecutor({ name, args, rows, governanceUnlocked, callerKeyName });
    },
    // AGT-338: the admin address reads nothing and answers what it always did. On any other address
    // the roster comes from the same visible() the list and the call use; if that read fails the
    // handshake still completes with the base text, and tools/list reports the failure itself.
    instructions: async () => {
      if (addressedAgentId(req.query) === null) return SERVER_INSTRUCTIONS;
      try {
        const v = await visible();
        return connectionInstructions(v.rows, v.scoped);
      } catch {
        return SERVER_INSTRUCTIONS;
      }
    },
  });

  // A notification is owed 202 Accepted with no body -- literally, per the transport spec.
  if (response === null) return res.status(202).end();
  return res.status(200).json(response);
}

export const mcpHandler = withRequestContext(handler);
