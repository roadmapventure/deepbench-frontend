// DeepBench v7.0.820 | scripts/pull-scaffold.mjs | AGT-401
//
// WHAT THIS IS. One deterministic `tools/call` against a LIVE MCP address, and a measurement of the
// reply. It answers the only question AGT-401 asks: what does an AI client actually RECEIVE when it
// pulls an agent's scaffold? Not what the assembler is supposed to produce -- what came back over
// the wire. So the raw body is written to disk byte for byte (`--out`) and every number printed is
// derived from that same body by measureReply(), which is pure and exported for the regression
// test. Nothing here judges, proposes, or writes to Supabase; there is no model call and no spend.
//
// WHY THE MEASUREMENT IS A PURE FUNCTION, SEPARATE FROM THE FETCH. The evidence file and the
// evidence prose have to agree, forever, without a network. A reader (or a test, or a later
// session) re-measures the committed JSON and must get the identical numbers the markdown claims --
// so measureReply() takes TEXT, never a socket, and the test drives it on an inline fixture with no
// credentials at all. A script that printed its counts from the live response object instead would
// leave the committed file and the committed prose unable to check each other.
//
// TWO ADDRESSES, AND THEY ARE NOT INTERCHANGEABLE (ARCHITECTURE.md §19e Rule #1). An agent address
// `/api/mcp/<id>` lists only that agent's own tools, so an own-knowledge tool there needs no
// argument: `task_context` is `{}` and the route already knows whose scaffold is meant. A tool whose
// Intent carries `traits.any_agent = true` can read ANY agent's knowledge and is therefore listed on
// the admin address `/api/mcp` ONLY (api/_lib/mcp.js visibleRows()); there the target is named in
// `task_context.agent_id`. Hence `--address=admin` and `--tool=<slug>`: an agent with no bundle tool
// of its own is reachable only that way, and pretending otherwise would be a tool call against a
// route that answers `Unknown tool`.
//
// SECRETS BY NAME, NEVER ON A COMMAND LINE AND NEVER PRINTED. Each header secret is read from this
// process's env first; anything absent is fetched from `public.runner_secrets` BY NAME using
// SUPABASE_URL + SUPABASE_SERVICE_KEY. Values are held in local variables, sent as headers, and
// never logged, never written to `--out`, never interpolated into a message. A secret that is absent
// everywhere simply omits its header and SAYS SO on stderr -- the gate secret GATE_BYPASS_SECRET is
// genuinely not in `runner_secrets` (AGT-401 measured both addresses answering 200 without it), and
// a script that hard-failed on it would be unrunnable for a header nobody needs.
//
// Usage:
//   node scripts/pull-scaffold.mjs --agent=brittany --out=docs/harvests/AGT-401-brittany.json
//   node scripts/pull-scaffold.mjs --agent=nathan --tool=dan-db-assembly --address=admin \
//     --out=docs/harvests/AGT-401-nathan.json
//
// Flags:
//   --agent=<id>        Required. The agent whose scaffold is being pulled.
//   --out=<path>        Required. Where the raw reply body is written, byte for byte.
//   --tool=<slug>       Default `<agent>-knowledge`.
//   --address=<id|admin> Default `<agent>`. `admin` posts to `/api/mcp`.
//   --origin=<url>      Default DEV_ORIGIN from scripts/check-deploy-serving.js.
//   --timeout=<seconds> Default 60.
//
// Exit codes: 0 the call answered with `result.isError === false` and the body is on disk
//             1 the reply is an MCP error (`isError` true, or a JSON-RPC `error`)
//             2 could not run: bad flags, non-200, unparseable body, no network

import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { DEV_ORIGIN } from "./check-deploy-serving.js";

// The three request headers, by the env/`runner_secrets` NAME each one carries
// (docs/runbooks/mcp-server.md). `required: false` means a missing value omits the header rather
// than failing the run.
export const HEADER_SECRETS = Object.freeze([
  { header: "x-vercel-protection-bypass", name: "VERCEL_AUTOMATION_BYPASS_SECRET", required: true },
  { header: "x-deepbench-mcp-key", name: "MCP_API_KEY", required: false },
  { header: "x-db-gate-bypass", name: "GATE_BYPASS_SECRET", required: false },
]);

const DEFAULT_TIMEOUT_S = 60;

function arg(name, fallback = undefined) {
  const hit = process.argv.slice(2).find(a => a.startsWith(`--${name}=`));
  return hit === undefined ? fallback : hit.slice(name.length + 3);
}

// --------------------------------------------------------------------------------------------
// THE MEASUREMENT -- pure, text in, facts out. No network, no env, no clock.
// --------------------------------------------------------------------------------------------
//
// `bodyText` is the raw HTTP body. The envelope is JSON-RPC; `result.content[0].text` is the
// bundle, itself a JSON string (api/_lib/handlers/agent-bundle.js returns the object,
// api/_lib/mcp.js stringifies it with two-space indent). Both layers are parsed here so every
// count traces to the committed bytes.
//
// `origin_tag_present` / `created_at_present` scan EVERY collection of objects the bundle hands a
// client -- the three `agent_configs` projections and the taught/record/index items -- because the
// question p3 asks is whether ANY provenance column leaks to a client, not whether one particular
// array leaks it. Own-property presence, so a key explicitly set to null still counts as present:
// a leaked column that happens to be null today is still a leaked column.
export function measureReply(bodyText) {
  const envelope = JSON.parse(stripEventStream(bodyText));
  if (envelope.error) {
    throw new Error(`the reply is a JSON-RPC error, not a bundle: ${JSON.stringify(envelope.error)}`);
  }
  const text = envelope?.result?.content?.[0]?.text;
  if (typeof text !== "string") {
    throw new Error("the reply carries no result.content[0].text -- not a tools/call bundle reply");
  }
  const bundle = JSON.parse(text);

  const sections = (bundle.sections || []).map(s => ({
    slug: s.slug,
    label: s.label,
    type: s.type,
    content_chars: typeof s.content === "string" ? s.content.length : 0,
    fetch_method: s.fetch_instruction ? (s.fetch_instruction.method ?? null) : null,
  }));

  const ragSections = (bundle.sections || []).filter(s => s.type === "rag");
  const knowledge_empty_with_fetch = ragSections.filter(
    s => (s.content === null || s.content === undefined || s.content === "") && s.fetch_instruction != null,
  ).length;

  // The EXECUTION PLAN section is declared by a Skill that lists `reflect`
  // (api/prompt/db-assembly.js). Three states, not two: absent is a different fact from present
  // and empty, and conflating them would hide exactly the case p2 is about.
  const plan = (bundle.sections || []).find(s => s.label === "EXECUTION PLAN");
  const execution_plan = !plan ? "absent" : (plan.content ? "filled" : "empty");

  const taughtItems = bundle.taught?.items || [];
  const recordItems = bundle.records?.items || [];
  const scanned = [
    ...(bundle.role_prompts || []),
    ...(bundle.guardrails || []),
    ...(bundle.output_formats || []),
    ...taughtItems,
    ...recordItems,
    ...(bundle.knowledge_entries || []),
  ].filter(o => o && typeof o === "object");
  const carries = key => scanned.some(o => Object.prototype.hasOwnProperty.call(o, key));

  return {
    agent_id: bundle.agent?.id ?? null,
    text_chars: text.length,
    keys: Object.keys(bundle),
    no_inference: bundle.no_inference,
    sections,
    knowledge_sections: ragSections.length,
    knowledge_empty_with_fetch,
    execution_plan,
    role_prompts: (bundle.role_prompts || []).length,
    guardrails: (bundle.guardrails || []).length,
    output_formats: (bundle.output_formats || []).length,
    taught: taughtItems.length,
    records: recordItems.length,
    origin_tag_present: carries("origin") || carries("origin_caller"),
    created_at_present: carries("created_at"),
    library_tier: bundle.library?.tier ?? null,
  };
}

// Defensive only: the MCP transport answers `application/json` on both addresses (measured
// 2026-10-08), but the protocol permits an `text/event-stream` frame and a client that fell over on
// one would be reporting its own parser as a platform fact. The LAST `data:` payload is the reply.
export function stripEventStream(bodyText) {
  const text = String(bodyText ?? "").trim();
  if (!text.startsWith("event:") && !text.startsWith("data:")) return text;
  const frames = text.split(/\r?\n/).filter(l => l.startsWith("data:")).map(l => l.slice(5).trim());
  if (!frames.length) throw new Error("an event-stream body carried no data: frame");
  return frames[frames.length - 1];
}

// --------------------------------------------------------------------------------------------
// The live call
// --------------------------------------------------------------------------------------------

// Reads one secret by NAME from public.runner_secrets. Returns the value or null; the value is
// returned, never printed, and the name is all that ever appears in a message.
async function secretByName(name, base, key) {
  const url = `${base.replace(/\/+$/, "")}/rest/v1/runner_secrets?name=eq.${encodeURIComponent(name)}&select=value`;
  const res = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`runner_secrets read failed for ${name}: HTTP ${res.status}`);
  const rows = await res.json();
  return rows.length && rows[0].value ? rows[0].value : null;
}

export async function resolveHeaders() {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  const headers = {
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
  };
  const omitted = [];
  for (const s of HEADER_SECRETS) {
    let value = process.env[s.name] || null;
    if (!value && base && key) value = await secretByName(s.name, base, key);
    if (value) headers[s.header] = value;
    else if (s.required) throw new Error(`${s.name} is absent from both the environment and runner_secrets -- the call cannot pass Vercel protection`);
    else omitted.push(s.name);
  }
  return { headers, omitted };
}

async function main() {
  const agent = arg("agent");
  const out = arg("out");
  if (!agent || !out) {
    console.error("usage: node scripts/pull-scaffold.mjs --agent=<id> --out=<path> [--tool=<slug>] [--address=<id|admin>]");
    process.exit(2);
  }
  const tool = arg("tool", `${agent}-knowledge`);
  const address = arg("address", agent);
  const origin = (arg("origin", DEV_ORIGIN) || DEV_ORIGIN).replace(/\/+$/, "");
  const timeoutMs = Number(arg("timeout", String(DEFAULT_TIMEOUT_S))) * 1000;

  // §19e Rule #1: the agent address carries no target, the admin address names one.
  const url = address === "admin" ? `${origin}/api/mcp` : `${origin}/api/mcp/${encodeURIComponent(address)}`;
  const task_context = address === "admin" ? { agent_id: agent } : {};
  const payload = { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: tool, arguments: { task_context } } };

  let headers, omitted;
  try {
    ({ headers, omitted } = await resolveHeaders());
  } catch (e) {
    console.error(`pull-scaffold: ${e.message}`);
    process.exit(2);
  }
  for (const name of omitted) console.error(`pull-scaffold: ${name} absent -- its header is omitted`);

  console.log(`POST ${url}`);
  console.log(`tool: ${tool}  task_context: ${JSON.stringify(task_context)}`);

  let res, body;
  try {
    res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });
    body = await res.text();
  } catch (e) {
    console.error(`pull-scaffold: the call did not complete: ${e.message}`);
    process.exit(2);
  }

  console.log(`HTTP ${res.status}`);
  if (res.status !== 200) {
    console.error(`pull-scaffold: non-200 -- body follows verbatim\n${body}`);
    process.exit(2);
  }

  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, body);
  console.log(`wrote ${Buffer.byteLength(body)} bytes to ${out}`);

  let measured;
  try {
    measured = measureReply(body);
  } catch (e) {
    console.error(`pull-scaffold: the body is on disk but could not be measured: ${e.message}`);
    process.exit(2);
  }
  console.log(JSON.stringify(measured, null, 2));

  const envelope = JSON.parse(stripEventStream(body));
  if (envelope.result?.isError !== false) {
    console.error(`pull-scaffold: result.isError is ${JSON.stringify(envelope.result?.isError)} -- not a clean pull`);
    process.exit(1);
  }
  process.exit(0);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}
