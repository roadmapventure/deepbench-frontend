// DeepBench v7.0.684 | tests/regression/agt-163-mcp-key-attribution.test.mjs | AGT-163
//
// FEATURE: AGT-163 -- an MCP key's NAME becomes the caller's `visitor_id`, so an outside caller is
// identifiable in the AI Audit without a cookie, a header he cannot send, or a new column.
//
// THE GAP, measured 2026-09-28 on 9e2c9ddc: `ai_activity_log` carries 4,283 `ui` rows with
// `caller_ip` on 4,283 and `visitor_id` on 3,518 -- and 32 `call_source = 'mcp'` rows with
// `visitor_id` on ZERO. The 4 genuinely remote MCP calls carry `caller_ip` on 3, so capture over the
// wire already works; IDENTITY was the entire gap. An MCP client sends no cookie and no
// `x-db-visitor-id`, and its one signal -- the key on `x-deepbench-mcp-key` -- was read as a single
// secret and reduced to a boolean in api/_lib/mcp.js, discarding WHICH key matched.
//
// WHAT HAS TO STAY TRUE FOREVER, in one sentence: the matched row's NAME is written and its VALUE
// never leaves keysMatch(). Three of the five arms below exist to hold that line -- (b) asserts the
// attribution never equals a fixture value, (c) greps the shipped file for a value reaching the
// visitor slot, and (d) asserts on the NAME only and never prints what it read.
//
// FIVE ARMS:
//   (a) UNIT -- resolveCallerKey(): a tester key resolves to its own name with governance STILL
//       locked; the governance key resolves to its name and unlocks; a wrong / absent / empty
//       presentation resolves to null. CONTROL: the same tester value against the fixture MINUS the
//       tester row resolves to null -- which is what proves the match is against the row list and
//       not against anything the presented string carries with it.
//   (b) UNIT -- mcpAttribution(), the one core both seams call: a key name takes the visitor slot
//       over a self-declared `x-db-visitor-id`, `caller_ip` and `call_source` ride through
//       untouched, a keyless call keeps the header value, and a keyless call with no header is null.
//       Then two spies on callToolThroughExecutor(), one per execution path, each asserting it was
//       HANDED the key name -- because a core that is never called from the deterministic seam would
//       pass every assertion above it and attribute nothing on the path AGT-162 just shipped.
//   (c) STATIC -- the shipped file reads the rows by name pattern, calls the core from BOTH seams,
//       never routes a `.value` into the visitor slot, and still has no conditional on a literal
//       slug (.claude/rules/capabilities-are-data.md, unchanged by this ticket).
//   (d) LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, else NOT RUN) -- the real exported mcpHandler is
//       driven with the real `MCP_API_KEY` value, read by name into a local and never printed, AND a
//       competing `x-db-visitor-id` header. The audit row the call writes must say `MCP_API_KEY`,
//       which is both the precedence proof and the end-to-end one.
//   (e) LIVE GRANTS, BOTH DIRECTIONS (VITE_SUPABASE_ANON_KEY, else NOT RUN) -- `caller_ip` stays
//       denied to the browser key while the projection the AI Audit actually runs still returns a
//       row. Two directions because .claude/rules/supabase-column-grants.md records LOG-124: a
//       first remediation of this exact table reported success and left 476 rows of visitor IP
//       publicly readable, caught only because the QA asserted the denial AND the working read.
//
// WOULD THIS PASS IF NOTHING CHANGED? No. On 9e2c9ddc `resolveCallerKey` and `mcpAttribution` do not
// exist, so (a) and (b) fail at import; both spies see `callerKeyName === undefined`; (c)'s first
// two checks find neither the name pattern nor a second call site; and (d)'s row lands
// `visitor_id NULL`, as all 32 pre-existing `mcp` rows did.
//
// NO KEY IS MINTED, PRINTED OR COMMITTED BY THIS FILE. The fixture values below are literals that
// match no row anywhere; the only real key that enters this process is read by name at (d) and is
// never logged, echoed or asserted on.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

import {
  assembleCapabilityRows,
  callToolThroughExecutor,
  mcpAttribution,
  mcpHandler,
  resolveCallerKey,
} from "../../api/_lib/mcp.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(REPO, rel), "utf8");

// Two rows shaped exactly like the `runner_secrets?select=name,value` read the shipped code makes.
// Both values are inert literals: they are not keys, they match no row, and nothing here mints one.
const FIXTURE_KEYS = [
  { name: "MCP_API_KEY", value: "gov-fixture-value" },
  { name: "MCP_KEY_FX", value: "tester-fixture-value" },
];
const TESTER_NAME = "MCP_KEY_FX";
const TESTER_VALUE = "tester-fixture-value";
const GOV_VALUE = "gov-fixture-value";

/** The res double api/_lib/mcp.js's handler expects -- the same shape as mcp-3-server.test.mjs:435. */
function fixtureRes() {
  const captured = { statusCode: null, body: undefined, headers: {}, ended: false };
  const res = {
    setHeader(k, v) { captured.headers[String(k).toLowerCase()] = v; },
    status(code) { captured.statusCode = code; return res; },
    json(payload) { captured.body = payload; captured.ended = true; return res; },
    end() { captured.ended = true; return res; },
    write() {},
  };
  return { res, captured };
}

// ---------------------------------------------------------------------------------------------
// Part (a) -- resolveCallerKey(): the presented key resolves to a NAME
// ---------------------------------------------------------------------------------------------
function partA_resolveCallerKey() {
  const results = [];

  // THE TICKET'S OWN CASE: a tester's key names the caller and does NOT widen what he can see.
  const tester = resolveCallerKey(TESTER_VALUE, FIXTURE_KEYS);
  assert.strictEqual(tester.name, TESTER_NAME,
    `a matched MCP_* row must resolve to its own name, got ${JSON.stringify(tester.name)}`);
  assert.strictEqual(tester.governanceUnlocked, false,
    "a tester key must NOT unlock the governance lane -- MCP_API_KEY alone does that, and attribution is not authorisation");

  // The governance key keeps its separate job, and is attributed like any other.
  const gov = resolveCallerKey(GOV_VALUE, FIXTURE_KEYS);
  assert.strictEqual(gov.name, "MCP_API_KEY", `the governance key must resolve to its name, got ${JSON.stringify(gov.name)}`);
  assert.strictEqual(gov.governanceUnlocked, true, "MCP_API_KEY must still unlock the governance lane");

  // Nothing presented, or nothing matching, is a keyless caller -- never a partial identity.
  for (const [label, presented] of [["a wrong value", "wrong"], ["no header at all", undefined], ["an empty header", ""]]) {
    const miss = resolveCallerKey(presented, FIXTURE_KEYS);
    assert.deepStrictEqual({ ...miss }, { name: null, governanceUnlocked: false },
      `${label} must resolve to no name and a locked lane, got ${JSON.stringify(miss)}`);
  }
  results.push("resolve-names-the-matched-row-and-only-MCP_API_KEY-unlocks");

  // CONTROL. The same value, against a list with the tester row removed, must resolve to NOTHING.
  // Without this, an implementation that echoed the presented string (or matched on anything the
  // string itself carries) would satisfy every assertion above.
  const control = resolveCallerKey(TESTER_VALUE, FIXTURE_KEYS.filter(r => r.name !== TESTER_NAME));
  assert.strictEqual(control.name, null,
    `CONTROL: with the tester row absent the same value must match nothing, got ${JSON.stringify(control.name)} ` +
      "-- a name resolved here would mean the attribution is not coming from the row list");
  assert.strictEqual(control.governanceUnlocked, false, "CONTROL: an unmatched key must never unlock the lane");
  results.push("control-no-row-no-name");

  return results;
}

// ---------------------------------------------------------------------------------------------
// Part (b) -- mcpAttribution(), and both seams proven to receive the name
// ---------------------------------------------------------------------------------------------
async function partB_attributionCore() {
  const results = [];
  const ctx = { callSource: "mcp", callerIp: "203.0.113.9", visitorId: "hdr-self-declared" };

  // PRECEDENCE: a key-derived identity beats a self-declared header, because the header is a claim
  // and the key is a proof. The rest of the context is untouched.
  const named = mcpAttribution(ctx, TESTER_NAME);
  assert.strictEqual(named.visitorId, TESTER_NAME,
    `the matched key's name must take the visitor slot over a self-declared header, got ${JSON.stringify(named.visitorId)}`);
  assert.strictEqual(named.callerIp, "203.0.113.9",
    "the caller's ip must ride through untouched -- AGT-163 adds no IP code and must not disturb the capture that works");
  assert.strictEqual(named.screenOrigin, "mcp", "screen_origin must still become 'mcp'");
  assert.strictEqual(named.callSource, "mcp", "the rest of the request context must ride through untouched");

  // A KEYLESS CALLER IS UNCHANGED, which is the compatibility half of the call: whatever it declared
  // still stands, and with nothing declared the column stays null rather than inventing an identity.
  assert.strictEqual(mcpAttribution(ctx, null).visitorId, "hdr-self-declared",
    "a keyless caller must keep the x-db-visitor-id it sent");
  assert.strictEqual(mcpAttribution({ callSource: "mcp", callerIp: "203.0.113.9" }, null).visitorId, null,
    "a keyless caller that declared nothing must attribute null, never an empty string or a fabricated id");

  // THE CREDENTIAL BOUNDARY, asserted rather than assumed: no fixture VALUE may appear in the
  // attribution the audit row is written from, under any of the shapes above.
  const values = FIXTURE_KEYS.map(r => r.value);
  for (const [label, attributed] of [
    ["a matched key", mcpAttribution(ctx, TESTER_NAME)],
    ["a keyless call", mcpAttribution(ctx, null)],
  ]) {
    assert.ok(!values.includes(attributed.visitorId),
      `${label} put a KEY VALUE in the visitor slot -- the value must never leave keysMatch()`);
  }
  results.push("attribution-core-prefers-the-key-name-and-never-carries-a-value");

  // BOTH SEAMS, counted. Two spies standing in for the model executor and the deterministic handler:
  // each must be HANDED the key name. A core called from only one seam would leave every MCP call on
  // the other path unattributed -- exactly the state this ticket is fixing.
  const fixtureRows = assembleCapabilityRows({
    capabilities: [
      { slug: "fx-bundle", name: "Fixture Bundle", description: "Hands back a bundle.", execution_type: "deterministic", default_intent_slug: "fx-bundle-intent", tenant_id: "global" },
      { slug: "fx-model", name: "Fixture Model Capability", description: "Runs a model turn.", execution_type: "ai", default_intent_slug: null, tenant_id: "global" },
    ],
    assignments: [
      { agent_id: "fx-holder", capability_slug: "fx-bundle" },
      { agent_id: "fx-holder", capability_slug: "fx-model" },
    ],
    agents: [{ id: "fx-holder", name: "Fixture Holder", role: "Fixture Role", lane: "product", is_active: true }],
    intents: [{ slug: "fx-bundle-intent", traits: { handler: "fx-bundle-handler" } }],
  });

  const seen = { execute: [], executeDeterministic: [] };
  const spyArgs = {
    execute: async ({ callerKeyName }) => {
      seen.execute.push(callerKeyName);
      return { content: "a model wrote this" };
    },
    executeDeterministic: async ({ callerKeyName }) => {
      seen.executeDeterministic.push(callerKeyName);
      return { content: [{ type: "text", text: "{}" }], isError: false };
    },
  };

  for (const slug of ["fx-model", "fx-bundle"]) {
    await callToolThroughExecutor({
      name: slug,
      args: { task_context: { agent_id: "bob" } },
      rows: fixtureRows,
      governanceUnlocked: false,
      callerKeyName: TESTER_NAME,
      ...spyArgs,
    });
  }

  assert.deepStrictEqual(seen.execute, [TESTER_NAME],
    `the model executor must be handed the key name exactly once, got ${JSON.stringify(seen.execute)} ` +
      "-- `undefined` here means callToolThroughExecutor never forwards it");
  assert.deepStrictEqual(seen.executeDeterministic, [TESTER_NAME],
    `the deterministic seam must be handed the key name exactly once, got ${JSON.stringify(seen.executeDeterministic)}`);
  results.push("both-seams-receive-the-key-name");

  return results;
}

// ---------------------------------------------------------------------------------------------
// Part (c) -- STATIC: the shipped file's own shape
// ---------------------------------------------------------------------------------------------
// `typeof x.intent_slug === 'string'` is a TYPE check, not an identity conditional. This pair is
// COPIED VERBATIM from agt-162-agent-bundle-over-mcp.test.mjs (which took it from
// mcp-3-server.test.mjs part (d)) and kept identical on purpose, so the three checks cannot disagree
// about what "a slug conditional" means. The kickoff's bare /slug\s*===\s*['"]/ would fail on
// api/_lib/mcp.js:772's PRE-EXISTING `typeof args.intent_slug === 'string'` -- see the deviation note
// in the ship report. Both controls below prove the neutraliser did not simply swallow the check.
const stripComments = src => src.split("\n").filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
const hasIdentityConditional = src =>
  /agent_?[iI]d\s*===|capability_slug\s*===|slug\s*===\s*['"]/.test(
    src.replace(/typeof\s+[\w.$[\]'"]+\s*(===|!==)\s*['"][a-z]+['"]/g, "TYPECHECK"),
  );

function partC_static() {
  const results = [];
  const src = stripComments(read("api/_lib/mcp.js"));

  assert.ok(src.includes("name=like.MCP_*"),
    "api/_lib/mcp.js must read every runner_secrets row named MCP_* by NAME PATTERN -- a single eq. read is the pre-AGT-163 shape " +
      "and means a new tester costs a deploy instead of a row");

  const callSites = (src.match(/mcpAttribution\(ctx/g) || []).length;
  assert.ok(callSites >= 2,
    `both seams must call the ONE attribution core; found ${callSites} call site(s) of mcpAttribution(ctx -- ` +
      "two object literals is two answers waiting to disagree (pattern:14)");

  assert.strictEqual(/visitorId:\s*[^,}\n]*\.value/.test(src), false,
    "a key VALUE is being routed into the visitor slot in api/_lib/mcp.js -- only the NAME may ever leave keysMatch()");

  // Unchanged by this ticket, and re-asserted because the change touched dispatch: the MCP server
  // still knows nothing about what any capability does.
  assert.strictEqual(hasIdentityConditional(src), false,
    "a conditional on a literal capability slug or agent id appeared in api/_lib/mcp.js -- .claude/rules/capabilities-are-data.md forbids it");
  results.push("static-name-pattern-one-core-no-value-no-slug-conditional");

  // TWO CONTROLS, both needed: the check must catch a real conditional, and it must not have been
  // neutralised into always-green by the typeof exemption above.
  assert.ok(hasIdentityConditional("if (row.slug === 'dan-db-assembly') return bundle();"),
    "control: the identity-conditional check does not catch a spliced-in slug conditional -- it does not discriminate");
  assert.ok(!hasIdentityConditional("if (typeof args.intent_slug === 'string') return args.intent_slug;"),
    "control: a typeof check is being read as an identity conditional -- the neutraliser is not working");

  // And the same for the credential-boundary regex: prove it fires on the shape it exists to catch,
  // so its silence on the shipped file means something.
  assert.ok(/visitorId:\s*[^,}\n]*\.value/.test("visitorId: matched.value || null,"),
    "control: the value-in-the-visitor-slot regex does not catch a spliced-in leak -- its silence proves nothing");
  results.push("control-static-checks-discriminate");

  return results;
}

// ---------------------------------------------------------------------------------------------
// Part (d) -- LIVE: the real handler, the real key, the real audit row
// ---------------------------------------------------------------------------------------------
async function partD_live() {
  const results = [];
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the live arm (the real mcpHandler driven with the real MCP_API_KEY plus a competing x-db-visitor-id header; the audit row's visitor_id, caller_ip and model)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent -- read them from public.runner_secrets by name and export them inline, per docs/STANDARDS.md Section 2 rule 5. " +
        "Measured when this shipped (2026-09-28): the call answered 200 with isError false, and its ai_activity_log row carried " +
        "visitor_id 'MCP_API_KEY' (against a self-declared header saying otherwise), caller_ip '127.0.0.1' and model NULL.",
    );
    return results;
  }

  const base = url.replace(/\/+$/, "");
  const hdr = { apikey: key, Authorization: `Bearer ${key}` };
  const get = async q => {
    const res = await fetch(`${base}/rest/v1/${q}`, { headers: hdr });
    if (!res.ok) assert.fail(`Supabase read failed (${q.split("?")[0]}): HTTP ${res.status} ${await res.text()}`);
    return res.json();
  };

  // The one real key that enters this process. Read BY NAME into a local, handed straight to the
  // handler as a header, and never printed, echoed, asserted on or written anywhere.
  const secretRows = await get("runner_secrets?name=eq.MCP_API_KEY&select=value&limit=1");
  const govValue = secretRows[0] && secretRows[0].value;
  if (typeof govValue !== "string" || !govValue) {
    notRun(
      "the live arm (the real mcpHandler driven with the real MCP_API_KEY)",
      "no runner_secrets row named MCP_API_KEY is readable with these credentials -- this test never mints one, per AGT-163's credential boundary.",
    );
    return results;
  }

  const since = new Date().toISOString();
  const { res, captured } = fixtureRes();
  await mcpHandler(
    {
      method: "POST",
      headers: {
        "x-deepbench-mcp-key": govValue,
        // A real remote hop, so deriveCallerIp() has something true to capture. 127.0.0.1 rather
        // than a TEST-NET address so the once-ever ip->org resolve mints no junk ip_org_cache row.
        "x-forwarded-for": "127.0.0.1",
        // THE COMPETING CLAIM. The handler is given a self-declared visitor id on the very header a
        // script-sourced caller uses -- and the row below must still say MCP_API_KEY. This is the
        // precedence assertion, and it is meaningless without this header being present.
        "x-db-visitor-id": "self-declared-fixture",
        host: "deepbench.local",
      },
      body: {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "dan-db-assembly", arguments: { task_context: { agent_id: "bob" } } },
      },
    },
    res,
  );

  assert.strictEqual(captured.statusCode, 200,
    `the keyed tools/call must answer 200, got ${captured.statusCode} ${JSON.stringify(captured.body)}`);
  assert.strictEqual(captured.body && captured.body.result && captured.body.result.isError, false,
    `the bundle call must succeed, got ${JSON.stringify(captured.body && captured.body.error)}`);
  results.push("live-keyed-tools-call-answers-200");

  // The audit row. Filtered on created_at >= the moment before the call, so a parallel cycle's row
  // can never be the one graded (SES-382).
  let logRow = null;
  for (let attempt = 0; attempt < 8 && !logRow; attempt++) {
    const rows = await get(
      `ai_activity_log?feature=eq.dan-db-assembly&call_source=eq.mcp&created_at=gte.${encodeURIComponent(since)}` +
        "&select=visitor_id,caller_ip,model,screen_origin,created_at&order=created_at.desc&limit=5",
    );
    logRow = rows[0] || null;
    if (!logRow) await new Promise(r => setTimeout(r, 500));
  }
  assert.ok(logRow, "the keyed MCP call wrote no ai_activity_log row -- there is nothing to attribute");

  assert.strictEqual(logRow.visitor_id, "MCP_API_KEY",
    `THE TICKET: the call's visitor_id must be the matched key's NAME, got ${JSON.stringify(logRow.visitor_id)} ` +
      "-- null is the pre-AGT-163 state of all 32 mcp rows, and 'self-declared-fixture' would mean the header beat the key");
  assert.notStrictEqual(logRow.visitor_id, govValue,
    "the key's VALUE reached the audit row -- the credential boundary is broken");
  assert.strictEqual(logRow.caller_ip, "127.0.0.1",
    `the wire path's ip capture must be undisturbed, got ${JSON.stringify(logRow.caller_ip)}`);
  assert.strictEqual(logRow.model, null,
    `dan-db-assembly is deterministic and must log no model, got ${JSON.stringify(logRow.model)}`);
  console.log(`  [AGT-163] audit row: visitor_id=${logRow.visitor_id} caller_ip=${logRow.caller_ip} model=${logRow.model} screen_origin=${logRow.screen_origin}`);
  results.push("live-audit-row-carries-the-key-name-over-a-self-declared-header");

  return results;
}

// ---------------------------------------------------------------------------------------------
// Part (e) -- LIVE GRANTS, BOTH DIRECTIONS
//
// .claude/rules/supabase-column-grants.md, LOG-124: `caller_ip` on THIS table was publicly readable
// with nothing but the browser's anon key (476 rows), and the first remediation reported success
// while changing nothing. It was caught only because the QA asserted the denial AND a still-working
// read. AGT-163 writes an identity into a column the same anon key CAN read, so both directions are
// re-proven here rather than assumed from that fix.
// ---------------------------------------------------------------------------------------------
async function partE_grantsBothWays() {
  const results = [];
  const url = process.env.SUPABASE_URL;
  const anon = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    notRun(
      "the grants arm, both directions (anon must be DENIED ai_activity_log.caller_ip and must still be SERVED the AI Audit's own projection)",
      "VITE_SUPABASE_ANON_KEY absent -- export it inline from public.runner_secrets by name to run this half. " +
        "It is the browser key, so this arm cannot be substituted with the service key: the service key bypasses the very grant under test and would pass both directions vacuously.",
    );
    return results;
  }

  const base = url.replace(/\/+$/, "");
  const anonGet = q => fetch(`${base}/rest/v1/${q}`, { headers: { apikey: anon, Authorization: `Bearer ${anon}` } });

  // DIRECTION 1 -- the denial. A column-list grant makes naming caller_ip a hard failure.
  const denied = await anonGet("ai_activity_log?select=id,caller_ip&limit=1");
  assert.strictEqual(denied.ok, false,
    `the anon key read ai_activity_log.caller_ip (HTTP ${denied.status}) -- LOG-124 is back: every visitor's IP is publicly readable`);

  // DIRECTION 2 -- the read that must still work. Without this, a query failing for an unrelated
  // reason (a typo, a dropped table, a revoked role) would read as a passing lockdown.
  const served = await anonGet("ai_activity_log?select=id,visitor_id,caller_ip_masked,call_source&call_source=eq.mcp&limit=1");
  assert.strictEqual(served.ok, true,
    `the AI Audit's own projection is denied to the browser key (HTTP ${served.status} ${await served.text()}) -- the screen is broken, not secured`);
  const servedRows = await served.json();
  assert.strictEqual(servedRows.length, 1,
    `the AI Audit's projection returned ${servedRows.length} rows for call_source='mcp' -- the denial above proves nothing if the legitimate read returns nothing either`);
  results.push("grants-hold-both-ways-caller_ip-denied-audit-projection-served");

  return results;
}

async function run() {
  const results = [];
  results.push(...partA_resolveCallerKey());
  results.push(...(await partB_attributionCore()));
  results.push(...partC_static());
  results.push(...(await partD_live()));
  results.push(...(await partE_grantsBothWays()));
  return results;
}

selfRun(import.meta.url, run);
export default run;
