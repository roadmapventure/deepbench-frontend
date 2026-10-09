// DeepBench v7.0.792 | tests/regression/agt-390-teach-tool.test.mjs | AGT-390
//
// FEATURE: AGT-390 -- the "Teach <name>" tool over MCP. A connected AI client can teach a customer
// agent a taught item, a role prompt, an output format or a guardrail; every row it writes carries
// origin `mcp` and the caller's key name, and every row DeepBench's own screens write carries origin
// `deepbench`. The date it was learned is the row's created_at.
//
// OFFLINE BY CONSTRUCTION (pattern:76): globalThis.fetch is replaced and the three keys are stubs for
// arms (a)-(f), so none of them can reach a database or OpenAI. All four are restored in `finally`.
// Each arm is graded on its own, and every module is imported inside the arm that needs it, so a
// missing export or file fails that arm and not the whole run.
//
// ARMS (kickoff v7.0.792 §5 T1):
//   (a) DETERMINISTIC_HANDLERS["agent-teach"] is the handler. CONTROL: it is not the bundle handler.
//   (b) teachCapabilityRow() is byte-identical to the backfill in docs/design/agt-390-teach-tool.sql
//       rendered for the same agent. CONTROL: it is not the knowledge row.
//   (c) THE DISCRIMINATOR -- handle(): taught -> one POST knowledge_entries (origin mcp, the key name,
//       source user, category Note, the holder's id); guardrail/never -> one POST agent_configs (name
//       never, is_default false, origin mcp); role_prompt -> the name is the title. Refused with no
//       POST: a guardrail with no side, kind `bogus`, another agent's id (even with any_agent on).
//       Through runDeterministic() the matched key's NAME reaches the saved row.
//   (d) load-entries GET selects and returns origin, origin_caller; its POST and agent-configs' POST
//       write origin `deepbench` -- CONTROL: a body claiming origin `mcp` is overwritten.
//   (e) createPrivateAgent() with no team: still three writes; the capabilities write is BOTH rows,
//       the assignments write is both assignments; a failed write's undo removes both slugs.
//   (f) RAW: PersonnelScreen shows originTag() and splits the MCP guardrails out; ResumeTab's
//       originTag() reads `<who> · learned <date>`.
// LIVE:
//   (g) SUPABASE_URL + SUPABASE_SERVICE_KEY, else NOT RUN: handle() on testjohn-w50rvr teaches one
//       never-guardrail and -- with OPENAI_API_KEY too, else that half is NOT RUN, since a taught item
//       is embedded -- one taught item; each row reads back origin mcp, origin_caller agt390-live.
//       Both rows are deleted in `finally`.
//   (h) SUPABASE_URL + SUPABASE_SERVICE_KEY, else NOT RUN: a `-teach` capability whose agent row is
//       gone is removed (its assignments first), and none remains.
//
// BASELINE: RED on the unchanged tree -- api/_lib/handlers/agent-teach.js does not exist, no
// teachCapabilityRow is exported, and nothing writes `origin`.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

const STUB_ENV = {
  SUPABASE_URL: "http://stub.invalid",
  SUPABASE_SERVICE_KEY: "stub",
  OPENAI_API_KEY: "stub",
};
const HOLDER = { id: "zoe-k3x9ab", name: "Zoe", lane: "product", is_active: true, owner_id: null, sharing: "private", shared_with: null };
const CREATED_AT = "2026-10-05T15:00:00+00:00";
const LIVE_AGENT = "testjohn-w50rvr";
const LIVE_KEY_NAME = "agt390-live";

const answer = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  text: async () => JSON.stringify(body),
});

// One recorder per call: every request is kept. Reads of `agents` answer with `agents`; a POST to
// knowledge_entries / agent_configs answers with the sent row plus an id and created_at, the way
// PostgREST answers under `Prefer: return=representation`.
function recorder({ agents = [HOLDER], entries = [] } = {}) {
  const calls = [];
  let n = 0;
  const stub = async (url, init = {}) => {
    const u = String(url);
    const method = init.method ? String(init.method).toUpperCase() : "GET";
    const body = init.body ? JSON.parse(init.body) : null;
    calls.push({ url: u, method, body });
    if (u.includes("api.openai.com")) return answer(200, { data: [{ embedding: [0.1, 0.2, 0.3] }], usage: { total_tokens: 7 } });
    if (u.includes("/ai_activity_log")) return answer(201, []);
    if (u.includes("/rest/v1/agents")) return answer(200, agents);
    if (u.includes("/knowledge_entries") || u.includes("/agent_configs")) {
      if (method === "GET") return answer(200, entries);
      if (method === "POST") return answer(201, [{ ...body, id: `row-${++n}`, created_at: CREATED_AT }]);
      return answer(200, []);
    }
    return answer(200, []);
  };
  const of = pred => calls.filter(pred);
  return {
    stub,
    calls,
    posts: table => of(c => c.method === "POST" && c.url.includes(`/rest/v1/${table}`)),
    embeds: () => of(c => c.url.includes("api.openai.com")),
    logs: () => of(c => c.url.includes("/ai_activity_log")),
    reads: table => of(c => c.method === "GET" && c.url.includes(`/rest/v1/${table}`)),
  };
}

function withFetch(rec) {
  globalThis.fetch = rec.stub;
  return rec;
}

function fakeRes() {
  const out = { statusCode: null, payload: undefined };
  const held = {};
  const res = {
    setHeader(k, v) { held[String(k).toLowerCase()] = v; },
    getHeader(k) { return held[String(k).toLowerCase()]; },
    status(code) { out.statusCode = code; return res; },
    json(payload) { out.payload = payload; return res; },
    end() { return res; },
  };
  return { res, out };
}

// The part-3 description of the SQL mirror, rendered for one agent: `a.name` becomes the name and
// every SQL string literal is unquoted ('' -> '). The SQL is the source of truth (T1 (b) pins it).
function sqlTeachRow({ id, name }) {
  const sql = read("docs/design/agt-390-teach-tool.sql");
  const m = sql.match(/select a\.id \|\| '-teach',\s*'Teach ' \|\| a\.name,\s*([\s\S]*?),\s*'deterministic', 'global', 'agent-teach-intent'/);
  assert.ok(m, "(b) the part-3 insert of docs/design/agt-390-teach-tool.sql was not found");
  const description = m[1].split("||").map(part => {
    const p = part.trim();
    if (p === "a.name") return name;
    assert.ok(/^'[\s\S]*'$/.test(p), `(b) an unexpected term in the SQL description: ${p}`);
    return p.slice(1, -1).replace(/''/g, "'");
  }).join("");
  return {
    slug: id + "-teach",
    name: "Teach " + name,
    description,
    execution_type: "deterministic",
    tenant_id: "global",
    default_intent_slug: "agent-teach-intent",
  };
}

// ---------------------------------------------------------------------------------------------
const ARMS = {
  async "a-the-teach-handler-is-registered-by-name"() {
    const mcp = await import("../../api/_lib/mcp.js");
    const teach = await import("../../api/_lib/handlers/agent-teach.js");
    const bundle = await import("../../api/_lib/handlers/agent-bundle.js");
    assert.strictEqual(typeof teach.handle, "function", "api/_lib/handlers/agent-teach.js exports no handle()");
    assert.strictEqual(mcp.DETERMINISTIC_HANDLERS["agent-teach"], teach.handle, "DETERMINISTIC_HANDLERS['agent-teach'] is not agent-teach.js's handle");
    // CONTROL: the registry maps names to different handlers -- the bundle is not the teach handler.
    assert.notStrictEqual(mcp.DETERMINISTIC_HANDLERS["agent-bundle"], teach.handle, "CONTROL: the bundle name resolves to the teach handler");
    assert.strictEqual(mcp.DETERMINISTIC_HANDLERS["agent-bundle"], bundle.handle, "CONTROL: the bundle handler is no longer registered");
  },

  async "b-the-teach-capability-row-is-the-sql-backfill-byte-for-byte"() {
    const { teachCapabilityRow, knowledgeCapabilityRow } = await import("../../lib/private-agent-create.js");
    assert.strictEqual(typeof teachCapabilityRow, "function", "lib/private-agent-create.js exports no teachCapabilityRow()");
    const zoe = { id: "zoe-k3x9ab", name: "Zoe" };
    assert.deepStrictEqual(teachCapabilityRow(zoe), sqlTeachRow(zoe), "teachCapabilityRow() is not the SQL mirror's row for Zoe");
    const apos = { id: "o-brien-aaaaaa", name: "O'Brien" };
    assert.deepStrictEqual(teachCapabilityRow(apos), sqlTeachRow(apos), "teachCapabilityRow() differs from the SQL for a name with an apostrophe");
    // CONTROL: the teach row is its own row, not the knowledge row renamed.
    assert.notDeepStrictEqual(teachCapabilityRow(zoe), knowledgeCapabilityRow(zoe), "CONTROL: the teach row equals the knowledge row");
  },

  async "c-DISCRIMINATOR-handle-writes-one-origin-tagged-row-per-kind"() {
    const { handle } = await import("../../api/_lib/handlers/agent-teach.js");
    const ctx = { governance_unlocked: false, any_agent: false, caller_key_name: "key-a" };
    const base = { agent_id: HOLDER.id, tenant_id: "global", handler_context: ctx };

    // taught -> one knowledge_entries POST.
    {
      const rec = withFetch(recorder());
      const out = await handle({ ...base, content: { kind: "taught", title: "Passcode", content: "say bosco", teaching_note: "on login" } });
      const posts = rec.posts("knowledge_entries");
      assert.strictEqual(posts.length, 1, `taught: ${posts.length} knowledge_entries POSTs, not 1`);
      assert.strictEqual(rec.posts("agent_configs").length, 0, "taught: an agent_configs row was written");
      const b = posts[0].body;
      assert.strictEqual(b.origin, "mcp", `taught: origin is ${JSON.stringify(b.origin)}, not mcp`);
      assert.strictEqual(b.origin_caller, "key-a", `taught: origin_caller is ${JSON.stringify(b.origin_caller)}, not key-a`);
      assert.strictEqual(b.source, "user", "taught: source is not user");
      assert.strictEqual(b.category, "Note", "taught: category is not Note");
      assert.strictEqual(b.agent_id, HOLDER.id, "taught: the row is not the holder's");
      assert.strictEqual(b.teaching_note, "on login", "taught: the teaching note was dropped");
      assert.strictEqual(rec.embeds().length, 1, "taught: not exactly one embedding");
      assert.deepStrictEqual(out.saved, { kind: "taught", id: "row-1", title: "Passcode", origin: "mcp", origin_caller: "key-a", created_at: CREATED_AT },
        `taught: saved is ${JSON.stringify(out.saved)}`);
      assert.strictEqual(out.undo, "Switch it off on Zoe's Training tab on DeepBench.", `taught: undo is ${JSON.stringify(out.undo)}`);
      assert.strictEqual(out.no_inference, true, "taught: no_inference is not true");
      const logs = rec.logs().filter(c => c.body && c.body.feature === "agent-teach");
      assert.strictEqual(logs.length, 1, `taught: ${logs.length} agent-teach activity rows, not 1`);
      assert.strictEqual(logs[0].body.ai_type, "deterministic", "taught: the activity row is not deterministic");
    }

    // guardrail / never -> one agent_configs POST, named by its side.
    {
      const rec = withFetch(recorder());
      const out = await handle({ ...base, content: { kind: "guardrail", side: "never", title: "No guessing", content: "Never guess a price." } });
      const posts = rec.posts("agent_configs");
      assert.strictEqual(posts.length, 1, `guardrail: ${posts.length} agent_configs POSTs, not 1`);
      assert.strictEqual(rec.posts("knowledge_entries").length, 0, "guardrail: a knowledge_entries row was written");
      assert.strictEqual(rec.embeds().length, 0, "guardrail: an embedding was paid for");
      const b = posts[0].body;
      assert.strictEqual(b.type, "guardrail", "guardrail: type is not guardrail");
      assert.strictEqual(b.name, "never", `guardrail: name is ${JSON.stringify(b.name)}, not never`);
      assert.strictEqual(b.text, "Never guess a price.", "guardrail: text is not the content");
      assert.strictEqual(b.is_default, false, "guardrail: is_default is not false");
      assert.strictEqual(b.origin, "mcp", "guardrail: origin is not mcp");
      assert.strictEqual(b.origin_caller, "key-a", "guardrail: origin_caller is not key-a");
      assert.strictEqual(b.agent_id, HOLDER.id, "guardrail: the row is not the holder's");
      assert.strictEqual(out.undo, "Delete it on Zoe's Playbook tab on DeepBench.", `guardrail: undo is ${JSON.stringify(out.undo)}`);
    }

    // role_prompt -> the name is the title; undo names the Resume tab.
    {
      const rec = withFetch(recorder());
      const out = await handle({ ...base, content: { kind: "role_prompt", side: "always", title: "Buyer coach", content: "You coach buyers." } });
      const posts = rec.posts("agent_configs");
      assert.strictEqual(posts.length, 1, `role_prompt: ${posts.length} agent_configs POSTs, not 1`);
      assert.strictEqual(posts[0].body.name, "Buyer coach", `role_prompt: name is ${JSON.stringify(posts[0].body.name)}, not the title`);
      assert.strictEqual(posts[0].body.type, "role_prompt", "role_prompt: type is not role_prompt");
      assert.strictEqual(out.undo, "Delete it on Zoe's Resume tab on DeepBench.", `role_prompt: undo is ${JSON.stringify(out.undo)}`);
    }

    // Refusals -- each writes nothing.
    const refusals = [
      [{ kind: "guardrail", title: "x", content: "y" }, ctx, "A guardrail needs side: always or never"],
      [{ kind: "bogus", title: "x", content: "y" }, ctx, "kind must be one of: taught, role_prompt, output_format, guardrail, specialty, bio, capability, skill"],
      [{ kind: "taught", title: "x", content: "y", agent_id: "someone-else" }, ctx, "Unknown agent: someone-else"],
      [{ kind: "taught", title: "x", content: "y", agent_id: "someone-else" }, { ...ctx, any_agent: true }, "Unknown agent: someone-else"],
    ];
    for (const [content, handler_context, message] of refusals) {
      const rec = withFetch(recorder());
      await assert.rejects(handle({ ...base, content, handler_context }), e => e.message === message,
        `${JSON.stringify(content)}: not refused with exactly "${message}"`);
      const written = rec.calls.filter(c => c.method === "POST" && !c.url.includes("/ai_activity_log"));
      assert.strictEqual(written.length, 0, `${JSON.stringify(content)}: the refusal still wrote ${written.length} row(s)`);
    }

    // An agent hidden or absent reads as Unknown agent, with no write.
    {
      const rec = withFetch(recorder({ agents: [] }));
      await assert.rejects(handle({ ...base, content: { kind: "taught", title: "x", content: "y" } }), e => e.message === `Unknown agent: ${HOLDER.id}`,
        "an absent holder is not refused as Unknown agent");
      assert.strictEqual(rec.posts("knowledge_entries").length, 0, "an absent holder still got a row");
    }

    // Through the MCP seam: the matched key's NAME reaches the saved row.
    {
      const mcp = await import("../../api/_lib/mcp.js");
      const rec = withFetch(recorder());
      const row = { slug: HOLDER.id + "-teach", handler: "agent-teach", agent_id: HOLDER.id, tenant_id: "global", any_agent: false, output_schema: { type: "object" } };
      const result = await mcp.runDeterministic({ row, taskContext: { kind: "guardrail", side: "always", title: "Cite", content: "Always cite." }, governanceUnlocked: false, callerKeyName: "MCP_KEY_A" });
      assert.strictEqual(result.isError, false, "runDeterministic: the teach call errored");
      const posts = rec.posts("agent_configs");
      assert.strictEqual(posts.length, 1, "runDeterministic: not one agent_configs POST");
      assert.strictEqual(posts[0].body.origin_caller, "MCP_KEY_A", `runDeterministic: origin_caller is ${JSON.stringify(posts[0].body.origin_caller)}, not the key's name`);
      // CONTROL: a keyless caller is null, never a guessed name.
      const rec2 = withFetch(recorder());
      await mcp.runDeterministic({ row, taskContext: { kind: "guardrail", side: "always", title: "Cite", content: "Always cite." }, governanceUnlocked: false });
      const keyless = rec2.posts("agent_configs")[0].body.origin_caller;
      assert.ok(keyless === undefined || keyless === null, `CONTROL: a keyless call carried a caller name: ${JSON.stringify(keyless)}`);
    }
  },

  async "d-deepbench-writes-are-tagged-deepbench-and-reads-return-origin"() {
    const loadEntries = (await import("../../api/load-entries.js")).default;
    const agentConfigs = (await import("../../api/agent-configs.js")).default;

    // load-entries GET: the select names both columns, and each entry carries them.
    {
      const rec = withFetch(recorder({ entries: [{ id: "e1", title: "T", content: "c", category: "Note", source: "user", origin: "mcp", origin_caller: "key-a", created_at: CREATED_AT }] }));
      const { res, out } = fakeRes();
      await loadEntries({ method: "GET", headers: {}, query: { agent_id: HOLDER.id }, body: undefined }, res);
      assert.strictEqual(out.statusCode, 200, `GET answered ${out.statusCode}`);
      const url = rec.reads("knowledge_entries")[0].url;
      const select = decodeURIComponent(url.split("select=")[1] || "").split("&")[0].split(",");
      assert.ok(select.includes("origin") && select.includes("origin_caller"), `GET select does not name origin,origin_caller: ${select.join(",")}`);
      assert.strictEqual(out.payload.entries[0].origin, "mcp", "GET: the entry carries no origin");
      assert.strictEqual(out.payload.entries[0].origin_caller, "key-a", "GET: the entry carries no origin_caller");
    }

    // load-entries POST: origin deepbench, even when the body claims mcp (CONTROL).
    {
      const rec = withFetch(recorder());
      const { res, out } = fakeRes();
      await loadEntries({ method: "POST", headers: {}, query: {}, body: { title: "T", content: "c", kind: "note", agent_id: HOLDER.id, origin: "mcp", origin_caller: "spoof" } }, res);
      assert.strictEqual(out.statusCode, 200, `POST answered ${out.statusCode} ${JSON.stringify(out.payload)}`);
      const b = rec.posts("knowledge_entries")[0].body;
      assert.strictEqual(b.origin, "deepbench", `load-entries POST: origin is ${JSON.stringify(b.origin)}, not deepbench`);
      assert.ok(b.origin_caller === undefined || b.origin_caller === null, `load-entries POST: origin_caller is ${JSON.stringify(b.origin_caller)}, not empty`);
    }

    // agent-configs POST: origin deepbench, the body's claim overwritten (CONTROL), same messages.
    {
      const rec = withFetch(recorder());
      const { res, out } = fakeRes();
      await agentConfigs({ method: "POST", headers: {}, query: {}, body: { agent_id: HOLDER.id, type: "guardrail", name: "never", text: "x", origin: "mcp", origin_caller: "spoof" } }, res);
      assert.strictEqual(out.statusCode, 201, `agent-configs POST answered ${out.statusCode} ${JSON.stringify(out.payload)}`);
      const b = rec.posts("agent_configs")[0].body;
      assert.strictEqual(b.origin, "deepbench", `agent-configs POST: origin is ${JSON.stringify(b.origin)}, not deepbench`);
      assert.ok(b.origin_caller === undefined || b.origin_caller === null, `agent-configs POST: origin_caller is ${JSON.stringify(b.origin_caller)}, not empty`);
      assert.strictEqual(out.payload.config.origin, "deepbench", "agent-configs POST: the answer is not the saved row");

      const bad = fakeRes();
      withFetch(recorder());
      await agentConfigs({ method: "POST", headers: {}, query: {}, body: { agent_id: HOLDER.id, type: "nope", name: "n", text: "t" } }, bad.res);
      assert.strictEqual(bad.out.statusCode, 400, `a bad type answered ${bad.out.statusCode}, not 400`);
      assert.strictEqual(bad.out.payload.error, "type must be one of: role_prompt, output_format, guardrail", "a bad type's message changed");
    }
  },

  async "e-a-new-agent-gets-both-capabilities-in-one-write"() {
    const { createPrivateAgent, knowledgeCapabilityRow, teachCapabilityRow } = await import("../../lib/private-agent-create.js");
    const calls = [];
    const sent = [];
    const fetchImpl = async (url, init = {}) => {
      const method = init.method || "GET";
      const table = String(url).split("/rest/v1/")[1].split("?")[0];
      calls.push(`${method} ${table}`);
      sent.push({ url: String(url), body: init.body ? JSON.parse(init.body) : null });
      const fail = failOn && `${method} ${table}` === failOn;
      return answer(fail ? 500 : method === "POST" ? 201 : 200, []);
    };
    let failOn = null;
    const deps = { supabaseUrl: "https://fake.supabase.test", supabaseKey: "fake-key", fetchImpl, suffix: () => "k3x9ab", log: async () => ({ ok: true }) };
    const zoe = { id: "zoe-k3x9ab", name: "Zoe" };

    await createPrivateAgent({ name: "Zoe" }, deps);
    assert.deepStrictEqual(calls, ["POST agents", "POST capabilities", "POST agent_capability_assignments"], `no team: the calls are ${JSON.stringify(calls)}`);
    assert.deepStrictEqual(sent[1].body, [knowledgeCapabilityRow(zoe), teachCapabilityRow(zoe)], "the capabilities write is not [knowledge, teach]");
    assert.deepStrictEqual(sent[2].body, [
      { agent_id: zoe.id, capability_slug: "zoe-k3x9ab-knowledge", tenant_id: "global" },
      { agent_id: zoe.id, capability_slug: "zoe-k3x9ab-teach", tenant_id: "global" },
    ], "the assignments write is not both assignments");

    // A failed assignments write removes both capabilities.
    calls.length = 0;
    sent.length = 0;
    failOn = "POST agent_capability_assignments";
    await assert.rejects(createPrivateAgent({ name: "Zoe" }, deps), "a failed assignments write did not reject");
    const capDelete = sent.find(s => s.url.includes("/rest/v1/capabilities?") && calls[sent.indexOf(s)] === "DELETE capabilities");
    assert.ok(capDelete, `no capabilities delete after the failure: ${JSON.stringify(calls)}`);
    assert.ok(capDelete.url.endsWith("capabilities?slug=in.(zoe-k3x9ab-knowledge,zoe-k3x9ab-teach)"), `the undo does not remove both slugs: ${capDelete.url}`);
  },

  async "f-the-screens-show-where-a-teaching-came-from"() {
    const screen = read("src/screens/PersonnelScreen.jsx");
    const tags = screen.split("originTag(").length - 1;
    assert.ok(tags >= 3, `PersonnelScreen calls originTag( ${tags} time(s), not at least 3`);
    assert.ok(screen.includes('r.origin === "mcp"'), 'PersonnelScreen does not split rows on r.origin === "mcp"');
    assert.ok(screen.includes('window.confirm("Delete this guardrail permanently?")'), "PersonnelScreen's MCP guardrail Delete asks no confirm");

    const tab = read("src/screens/personnel/ResumeTab.jsx");
    const m = tab.match(/export function originTag\(row\) \{\n([\s\S]*?)\n\}\n/);
    assert.ok(m, "ResumeTab.jsx exports no originTag(row)");
    const originTag = new Function("row", m[1]);
    const at = "2026-10-05T03:00:00Z"; // 10-04 22:00 in Chicago -- the date is Central, not UTC
    assert.strictEqual(originTag({ origin: "mcp", origin_caller: "key-a", created_at: at }), "MCP · key-a · learned Oct 4, 2026");
    assert.strictEqual(originTag({ origin: "mcp", origin_caller: null, created_at: at }), "MCP · learned Oct 4, 2026");
    assert.strictEqual(originTag({ origin: "deepbench", origin_caller: null, created_at: at }), "DeepBench · learned Oct 4, 2026");
    // CONTROL: a row with no origin shows nothing.
    assert.strictEqual(originTag({ origin: null, created_at: at }), null, "CONTROL: a row with no origin is tagged");
  },
};

// ---------------------------------------------------------------------------------------------
// LIVE
// ---------------------------------------------------------------------------------------------
function liveClient(base, key) {
  const rest = `${base.replace(/\/+$/, "")}/rest/v1/`;
  const hdr = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const get = async q => {
    const res = await fetch(rest + q, { headers: hdr });
    assert.ok(res.ok, `${q.split("?")[0]} -> HTTP ${res.status}`);
    return res.json();
  };
  const del = q => fetch(rest + q, { method: "DELETE", headers: { ...hdr, Prefer: "return=minimal" } });
  return { get, del };
}

async function liveTeach() {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!base || !key) {
    notRun("(g) the live teach: one never-guardrail and one taught item on testjohn-w50rvr, read back origin-tagged, then deleted",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY are not set -- this arm writes");
    return [];
  }
  // The taught half also embeds, so it needs OPENAI_API_KEY; the guardrail half runs without it.
  const canEmbed = !!process.env.OPENAI_API_KEY;
  const { handle } = await import("../../api/_lib/handlers/agent-teach.js");
  const { get, del } = liveClient(base, key);
  const handler_context = { governance_unlocked: false, any_agent: false, caller_key_name: LIVE_KEY_NAME };
  const results = [];
  let entryId = null;
  let configId = null;
  try {
    const guard = await handle({ agent_id: LIVE_AGENT, tenant_id: "global", handler_context,
      content: { kind: "guardrail", side: "never", title: "agt390", content: "AGT-390 live fixture: delete me." } });
    configId = guard.saved.id;
    const [c] = await get(`agent_configs?id=eq.${encodeURIComponent(configId)}&select=agent_id,type,name,is_default,origin,origin_caller,created_at`);
    assert.ok(c, "(g) the guardrail row is not in agent_configs");
    assert.deepStrictEqual([c.agent_id, c.type, c.name, c.is_default, c.origin, c.origin_caller], [LIVE_AGENT, "guardrail", "never", false, "mcp", LIVE_KEY_NAME],
      `(g) the guardrail row reads back ${JSON.stringify(c)}`);
    assert.ok(c.created_at, "(g) the guardrail row has no created_at");
    results.push("g-live-guardrail-origin-tagged");

    if (!canEmbed) {
      notRun("(g) the live taught item: one knowledge_entries row on testjohn-w50rvr read back origin mcp / agt390-live",
        "OPENAI_API_KEY is not set -- a taught item is embedded on save");
    } else {
      const taught = await handle({ agent_id: LIVE_AGENT, tenant_id: "global", handler_context,
        content: { kind: "taught", title: "agt390 live fixture", content: "AGT-390 live fixture: delete me." } });
      entryId = taught.saved.id;
      const [e] = await get(`knowledge_entries?id=eq.${encodeURIComponent(entryId)}&select=agent_id,source,category,origin,origin_caller,created_at`);
      assert.ok(e, "(g) the taught row is not in knowledge_entries");
      assert.deepStrictEqual([e.agent_id, e.source, e.category, e.origin, e.origin_caller], [LIVE_AGENT, "user", "Note", "mcp", LIVE_KEY_NAME],
        `(g) the taught row reads back ${JSON.stringify(e)}`);
      assert.ok(e.created_at, "(g) the taught row has no created_at");
      results.push("g-live-taught-origin-tagged");
    }
  } finally {
    if (entryId) await del(`knowledge_entries?id=eq.${encodeURIComponent(entryId)}`);
    if (configId) await del(`agent_configs?id=eq.${encodeURIComponent(configId)}`);
  }
  if (entryId) assert.strictEqual((await get(`knowledge_entries?id=eq.${encodeURIComponent(entryId)}&select=id`)).length, 0, "(g) the taught fixture remains");
  if (configId) assert.strictEqual((await get(`agent_configs?id=eq.${encodeURIComponent(configId)}&select=id`)).length, 0, "(g) the guardrail fixture remains");
  results.push("g-live-fixtures-removed");
  return results;
}

async function liveOrphans() {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!base || !key) {
    notRun("(h) the live sweep of -teach capabilities whose agent row is gone",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY are not set -- this arm deletes");
    return [];
  }
  const { get, del } = liveClient(base, key);
  const orphans = async () => {
    const caps = await get("capabilities?default_intent_slug=eq.agent-teach-intent&select=slug");
    const ids = caps.map(c => c.slug.replace(/-teach$/, ""));
    if (!ids.length) return [];
    const agents = await get(`agents?id=in.(${ids.map(encodeURIComponent).join(",")})&select=id`);
    const alive = new Set(agents.map(a => a.id));
    return caps.filter(c => !alive.has(c.slug.replace(/-teach$/, ""))).map(c => c.slug);
  };
  const found = await orphans();
  for (const slug of found) {
    await del(`agent_capability_assignments?capability_slug=eq.${encodeURIComponent(slug)}`);
    await del(`capabilities?slug=eq.${encodeURIComponent(slug)}`);
  }
  const left = await orphans();
  assert.deepStrictEqual(left, [], `(h) -teach capabilities with no agent remain: ${left.join(", ")}`);
  console.log(`  [AGT-390] (h) removed ${found.length} orphaned -teach capabilit${found.length === 1 ? "y" : "ies"}`);
  return ["h-live-no-orphaned-teach-capability"];
}

async function run() {
  const realFetch = globalThis.fetch;
  const realEnv = Object.fromEntries(Object.keys(STUB_ENV).map(k => [k, process.env[k]]));
  const passed = [];
  const failed = [];
  try {
    Object.assign(process.env, STUB_ENV);
    for (const [name, arm] of Object.entries(ARMS)) {
      try {
        await arm();
        passed.push(name);
      } catch (e) {
        failed.push(`${name}: ${e.message}`);
      }
    }
  } finally {
    globalThis.fetch = realFetch;
    for (const [k, v] of Object.entries(realEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
  console.log(`  [AGT-390] ${passed.length} of ${Object.keys(ARMS).length} offline arms passed: ${passed.map(n => n.split("-")[0]).join(",") || "none"}`);
  if (failed.length) assert.fail(`${failed.length} arm(s) failed -- ` + failed.join(" | "));
  passed.push(...(await liveTeach()));
  passed.push(...(await liveOrphans()));
  return passed;
}

selfRun(import.meta.url, run);
export default run;
