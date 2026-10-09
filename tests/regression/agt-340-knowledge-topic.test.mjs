// DeepBench v7.0.831 | tests/regression/agt-340-knowledge-topic.test.mjs | AGT-340
//
// FEATURE: AGT-340 -- the Knowledge tool answers a TOPIC. The `<id>-knowledge` tool (handler
// `agent-bundle`) gains one optional input, `topic`. Without it the hand-over is what it has always
// been: every taught item and every record, under the two whole-package framings. With it the
// handler embeds the topic once through lib/rag.js's queryRAG(), narrows `taught`, `records` and
// `knowledge_entries` to the matched ids, and says so in the framing. The matched ids and the
// retrieval method are logged; THE TOPIC TEXT IS NOT STORED ANYWHERE (harvest §4 call 5 -- whether
// DeepBench may keep the user's own words is a gated question for John, not this ticket's to answer).
//
// OFFLINE BY CONSTRUCTION (pattern:76): globalThis.fetch is replaced and the three keys are stubs
// for arms (a)-(e), so none of them can reach a database or OpenAI, and all are restored in
// `finally`. Each arm is graded on its own and imports the modules it needs inside itself, so a
// missing export fails that arm and not the whole run.
//
// WHY LOG ROWS ARE SELECTED BY `feature` AND NEVER BY COUNT. Measured on the unchanged handler
// before this test was written (harvest §2): one no-topic handle() already POSTs TWO ai_activity_log
// rows -- Eleanor's catalog denial (`librarian`) and the hand-over's own (`dan-db-assembly`) -- so a
// topic call posts THREE. An assertion on the number of log rows would grade the librarian's
// bookkeeping, not this feature; every assertion below picks its row by `feature`.
//
// ARMS (kickoff v7.0.831 §5 T1):
//   (a) pure narrowKnowledge(): an id list narrows both lists and re-frames; [] is "nothing matched";
//       null is the whole package under read-taught.js's own framings. CONTROL: the three calls do
//       not agree -- a narrowing that ignored its argument would fail all three at once.
//   (b) no topic: 0 embeddings, 0 match_knowledge, no retrieval_method on the log row, 3 items.
//       CONTROL: the whole-package framings, so (b) is provably not a narrowed answer.
//   (c) THE DISCRIMINATOR -- a topic: exactly 1 embedding, exactly 1 match_knowledge POST carrying
//       p_agent_id, the two lists narrowed by kind, both log rows' facts, and the topic text in
//       neither the database traffic nor the return. Second half: zero matches -> the method is
//       logged with no ids, both lists say nothing matched. CONTROL: (c) differs from (b) on every
//       one of those axes.
//   (d) a topic with no OPENAI_API_KEY is REFUSED by name -- never presented as "nothing matched"
//       (harvest §4 call 6). CONTROL: 0 embeddings, and the message names the key.
//   (e) another agent's id with a topic is still "Unknown agent", refused before any embedding --
//       the own-knowledge rule (AGT-338 slice 2) is not reachable through the new input.
// LIVE:
//   (f) SUPABASE_URL + SUPABASE_SERVICE_KEY, else NOT RUN: both Intent rows publish the optional
//       `topic` input. Read-only; RED until the migration agt340_knowledge_topic is applied.
//
// BASELINE: RED on the unchanged tree -- narrowKnowledge() and the four TOPIC framings do not
// exist, and a topic makes 0 embeddings because the handler never imports lib/rag.js.

import assert from "assert";
import { selfRun, notRun } from "./_lib/self-run.js";

const STUB_ENV = {
  SUPABASE_URL: "http://stub.invalid",
  SUPABASE_SERVICE_KEY: "stub",
  OPENAI_API_KEY: "stub",
};

// agt-390's holder, plus the one column the bundle projects that the teach tool does not.
const HOLDER = { id: "zoe-k3x9ab", name: "Zoe", lane: "product", is_active: true, owner_id: null, sharing: "private", shared_with: null, data_room_access: [] };
const TOPIC = "refund windows";
const INTENT_SLUGS = ["agent-bundle-intent", "agent-bundle-any-intent"];

// Two taught items (a trainer's, `source: "user"`) and one record the agent wrote for itself.
// shapeTaught() splits them, so a narrowing that matched k2 and k3 must land one in each list --
// which is what makes (c)'s expectation discriminating rather than "some items came back".
const ROWS = [
  { id: "k1", title: "Shipping", content: "Parcels leave within a day.", teaching_note: null, source: "user" },
  { id: "k2", title: "Refunds", content: "A refund is open for 30 days.", teaching_note: null, source: "user" },
  { id: "k3", title: "A past refund call", content: "The customer asked about day 31.", teaching_note: "url|ok", source: "agent" },
];

const answer = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  text: async () => JSON.stringify(body),
});

// One recorder per call: every request is kept, with its body, so an assertion can look at what was
// sent and not only at how many were sent. `matches` is what the vector RPC answers with, which is
// the one knob each (c) half turns.
function recorder({ agents = [HOLDER], entries = ROWS, matches = [] } = {}) {
  const calls = [];
  const stub = async (url, init = {}) => {
    const u = String(url);
    const method = init.method ? String(init.method).toUpperCase() : "GET";
    let body = null;
    if (init.body) { try { body = JSON.parse(init.body); } catch { body = String(init.body); } }
    calls.push({ url: u, method, body });
    if (u.includes("api.openai.com")) return answer(200, { data: [{ embedding: [0.1, 0.2, 0.3] }], usage: { total_tokens: 7 } });
    if (u.includes("/rpc/match_knowledge")) return answer(200, matches);
    if (u.includes("/ai_activity_log")) return answer(201, []);
    if (u.includes("/rest/v1/agents")) return answer(200, agents);
    if (u.includes("/knowledge_entries")) return answer(200, entries);
    return answer(200, []);
  };
  const of = pred => calls.filter(pred);
  return {
    stub,
    calls,
    embeds: () => of(c => c.url.includes("api.openai.com")),
    searches: () => of(c => c.method === "POST" && c.url.includes("/rpc/match_knowledge")),
    logs: feature => of(c => c.method === "POST" && c.url.includes("/ai_activity_log") && c.body?.feature === feature),
    // Every request that went at the database, i.e. everything that is not the embedding endpoint.
    dbCalls: () => of(c => c.url.includes("stub.invalid")),
  };
}

function withFetch(rec) {
  globalThis.fetch = rec.stub;
  return rec;
}

const ids = list => list.map(i => i.id);
const call = (content, handler_context = {}) => ({ agent_id: HOLDER.id, tenant_id: "global", content, handler_context });

// ---------------------------------------------------------------------------------------------
const ARMS = {
  async "a-narrow-knowledge-is-pure-and-reframes"() {
    const { shapeTaught, TAUGHT_FRAMING, RECORDS_FRAMING } = await import("../../lib/read-taught.js");
    const h = await import("../../api/_lib/handlers/agent-bundle.js");
    assert.strictEqual(typeof h.narrowKnowledge, "function", "api/_lib/handlers/agent-bundle.js exports no narrowKnowledge()");
    for (const name of ["TAUGHT_TOPIC_FRAMING", "TAUGHT_TOPIC_NONE", "RECORDS_TOPIC_FRAMING", "RECORDS_TOPIC_NONE"]) {
      assert.strictEqual(typeof h[name], "string", `api/_lib/handlers/agent-bundle.js exports no ${name}`);
    }
    const kn = shapeTaught(ROWS);

    // One matched id, and it is a TAUGHT one: the taught list keeps exactly it, and the records
    // list -- which matched nothing -- says so rather than coming back whole.
    const one = h.narrowKnowledge(kn, ["k2"]);
    assert.deepStrictEqual(ids(one.taught.items), ["k2"], `(a) taught narrowed to ${JSON.stringify(ids(one.taught.items))}`);
    assert.strictEqual(one.taught.framing, h.TAUGHT_TOPIC_FRAMING, "(a) a narrowed taught list must carry TAUGHT_TOPIC_FRAMING");
    assert.deepStrictEqual(ids(one.records.items), [], `(a) records narrowed to ${JSON.stringify(ids(one.records.items))}`);
    assert.strictEqual(one.records.framing, h.RECORDS_TOPIC_NONE, "(a) an empty records list must carry RECORDS_TOPIC_NONE");

    // Nothing matched at all: both lists empty, both framings the "none" pair.
    const none = h.narrowKnowledge(kn, []);
    assert.deepStrictEqual([ids(none.taught.items), ids(none.records.items)], [[], []], "(a) [] must narrow both lists to nothing");
    assert.strictEqual(none.taught.framing, h.TAUGHT_TOPIC_NONE, "(a) [] must frame taught as TAUGHT_TOPIC_NONE");
    assert.strictEqual(none.records.framing, h.RECORDS_TOPIC_NONE, "(a) [] must frame records as RECORDS_TOPIC_NONE");

    // No topic was asked: the whole package, framed by lib/read-taught.js as it always was.
    const whole = h.narrowKnowledge(kn, null);
    assert.deepStrictEqual(ids(whole.taught.items), ["k1", "k2"], `(a) null must keep every taught item, got ${JSON.stringify(ids(whole.taught.items))}`);
    assert.deepStrictEqual(ids(whole.records.items), ["k3"], `(a) null must keep every record, got ${JSON.stringify(ids(whole.records.items))}`);
    assert.strictEqual(whole.taught.items.length + whole.records.items.length, 3, "(a) null must hand over all 3 items");
    assert.strictEqual(whole.taught.framing, TAUGHT_FRAMING, "(a) null must keep lib/read-taught.js's TAUGHT_FRAMING");
    assert.strictEqual(whole.records.framing, RECORDS_FRAMING, "(a) null must keep lib/read-taught.js's RECORDS_FRAMING");

    // CONTROL: the three answers are genuinely different objects. A narrowKnowledge() that ignored
    // its second argument -- the likeliest wrong implementation -- would return the whole package
    // three times and satisfy none of these.
    assert.notStrictEqual(one.taught.framing, whole.taught.framing, "CONTROL: a narrowed list is framed the same as the whole package");
    assert.notStrictEqual(none.taught.framing, one.taught.framing, "CONTROL: 'nothing matched' is framed the same as 'here are the matches'");
    assert.ok(whole.taught.items.length > one.taught.items.length, "CONTROL: narrowing did not reduce the taught list");
    // Pure: the input is not mutated, so the handler's own `kn` is still the whole package after.
    assert.deepStrictEqual([ids(kn.taught), ids(kn.records)], [["k1", "k2"], ["k3"]], "(a) narrowKnowledge mutated its input");
  },

  async "b-no-topic-hands-over-everything-and-searches-nothing"() {
    const { handle } = await import("../../api/_lib/handlers/agent-bundle.js");
    const { TAUGHT_FRAMING, RECORDS_FRAMING } = await import("../../lib/read-taught.js");
    const rec = withFetch(recorder());
    const out = await handle(call({}));

    assert.strictEqual(rec.embeds().length, 0, `(b) a call with no topic embedded ${rec.embeds().length} time(s)`);
    assert.strictEqual(rec.searches().length, 0, `(b) a call with no topic searched ${rec.searches().length} time(s)`);
    assert.strictEqual(out.taught.items.length + out.records.items.length, 3, "(b) the whole package is 3 items");
    assert.strictEqual(out.knowledge_entries.length, 3, "(b) knowledge_entries must index all 3 items");
    // CONTROL: the whole-package framings, so this arm cannot be mistaken for a narrowed answer.
    assert.strictEqual(out.taught.framing, TAUGHT_FRAMING, "CONTROL: (b) is framed as a narrowed list");
    assert.strictEqual(out.records.framing, RECORDS_FRAMING, "CONTROL: (b) is framed as a narrowed list");

    const [row] = rec.logs("dan-db-assembly");
    assert.ok(row, "(b) no ai_activity_log row with feature dan-db-assembly was posted");
    assert.ok(!("retrieval_method" in (row.body.call_facts || {})),
      `(b) a call with no topic logged retrieval_method: ${JSON.stringify(row.body.call_facts)}`);
    assert.ok(!("retrieved_chunk_ids" in (row.body.call_facts || {})),
      `(b) a call with no topic logged retrieved_chunk_ids: ${JSON.stringify(row.body.call_facts)}`);
    // No new key on the return, either (.claude/rules/agent-data-visibility.md).
    assert.ok(!("lookup" in out) && !("topic" in out), `(b) the return grew a key: ${Object.keys(out).join(",")}`);
  },

  async "c-the-discriminator-a-topic-narrows-the-package-and-logs-the-matched-ids"() {
    const { handle } = await import("../../api/_lib/handlers/agent-bundle.js");
    const h = await import("../../api/_lib/handlers/agent-bundle.js");
    const rec = withFetch(recorder({ matches: [{ id: "k2" }, { id: "k3" }] }));
    const out = await handle(call({ topic: TOPIC }));

    // Exactly one embedding and exactly one search -- not zero (the unchanged handler) and not one
    // per item.
    assert.strictEqual(rec.embeds().length, 1, `(c) a topic embedded ${rec.embeds().length} time(s), expected 1`);
    const searches = rec.searches();
    assert.strictEqual(searches.length, 1, `(c) a topic searched ${searches.length} time(s), expected 1`);
    // §19c: the search is scoped to the TARGET agent, never platform-wide.
    assert.strictEqual(searches[0].body.p_agent_id, HOLDER.id, `(c) match_knowledge was called with p_agent_id ${JSON.stringify(searches[0].body.p_agent_id)}`);
    assert.strictEqual(searches[0].body.p_tenant_id, "global", `(c) match_knowledge was called with p_tenant_id ${JSON.stringify(searches[0].body.p_tenant_id)}`);

    // The two matched ids land in the list each one BELONGS to -- k2 is a taught item, k3 a record.
    assert.deepStrictEqual(ids(out.taught.items), ["k2"], `(c) taught came back as ${JSON.stringify(ids(out.taught.items))}`);
    assert.deepStrictEqual(ids(out.records.items), ["k3"], `(c) records came back as ${JSON.stringify(ids(out.records.items))}`);
    assert.strictEqual(out.taught.framing, h.TAUGHT_TOPIC_FRAMING, "(c) the taught list is not framed as narrowed");
    assert.strictEqual(out.records.framing, h.RECORDS_TOPIC_FRAMING, "(c) the records list is not framed as narrowed");
    assert.deepStrictEqual(out.knowledge_entries.map(e => [e.id, e.kind]), [["k2", "taught"], ["k3", "record"]],
      `(c) the index came back as ${JSON.stringify(out.knowledge_entries)}`);

    // The embedding's own log row: a real model and real tokens on an MCP path for the first time.
    const [embedRow] = rec.logs("knowledge-retrieval");
    assert.ok(embedRow, "(c) no ai_activity_log row with feature knowledge-retrieval was posted");
    assert.strictEqual(embedRow.body.model, "text-embedding-3-small", `(c) the lookup row's model is ${JSON.stringify(embedRow.body.model)}`);
    assert.strictEqual(embedRow.body.input_tokens, 7, `(c) the lookup row's input_tokens is ${JSON.stringify(embedRow.body.input_tokens)}`);
    assert.strictEqual(embedRow.body.agent_id, HOLDER.id, `(c) the lookup row's agent_id is ${JSON.stringify(embedRow.body.agent_id)}`);

    // The hand-over's own row: the two existing §19k keys, and the target it was for.
    const [bundleRow] = rec.logs("dan-db-assembly");
    assert.ok(bundleRow, "(c) no ai_activity_log row with feature dan-db-assembly was posted");
    assert.strictEqual(bundleRow.body.call_facts.retrieval_method, "similarity-search",
      `(c) the hand-over row's retrieval_method is ${JSON.stringify(bundleRow.body.call_facts.retrieval_method)}`);
    assert.deepStrictEqual(bundleRow.body.call_facts.retrieved_chunk_ids, ["k2", "k3"],
      `(c) the hand-over row's retrieved_chunk_ids is ${JSON.stringify(bundleRow.body.call_facts.retrieved_chunk_ids)}`);
    assert.strictEqual(bundleRow.body.call_facts.target_agent_id, HOLDER.id,
      `(c) the hand-over row's target_agent_id is ${JSON.stringify(bundleRow.body.call_facts.target_agent_id)}`);

    // NOTHING STORES THE TOPIC TEXT. The embedding endpoint necessarily receives it; no request at
    // the database may, and it may not come back in the answer either. This is harvest §4 call 5 --
    // the gated question stays unanswered by this build.
    for (const c of rec.dbCalls()) {
      assert.ok(!JSON.stringify(c.body ?? null).includes(TOPIC),
        `(c) the topic text reached a database request: ${c.method} ${c.url}`);
    }
    assert.ok(!JSON.stringify(out).includes(TOPIC), "(c) the topic text came back in the return");
    assert.ok(!("topic" in out) && !("lookup" in out), `(c) the return grew a key: ${Object.keys(out).join(",")}`);

    // ----- the other half: the search ran and found nothing (LOG-37c's convention) -------------
    const rec0 = withFetch(recorder({ matches: [] }));
    const empty = await handle(call({ topic: TOPIC }));
    assert.strictEqual(rec0.embeds().length, 1, "(c) the no-match half must still embed once");
    assert.strictEqual(empty.taught.items.length + empty.records.items.length, 0,
      `(c) the no-match half handed over ${empty.taught.items.length + empty.records.items.length} item(s)`);
    assert.strictEqual(empty.knowledge_entries.length, 0, "(c) the no-match half must index nothing");
    assert.strictEqual(empty.taught.framing, h.TAUGHT_TOPIC_NONE, "(c) the no-match half must frame taught as TAUGHT_TOPIC_NONE");
    assert.strictEqual(empty.records.framing, h.RECORDS_TOPIC_NONE, "(c) the no-match half must frame records as RECORDS_TOPIC_NONE");
    const [emptyRow] = rec0.logs("dan-db-assembly");
    assert.ok(emptyRow, "(c) the no-match half posted no dan-db-assembly row");
    assert.strictEqual(emptyRow.body.call_facts.retrieval_method, "similarity-search",
      "(c) a search that found nothing must still log retrieval_method -- method present with no ids IS the no-match signature");
    assert.ok(!("retrieved_chunk_ids" in emptyRow.body.call_facts),
      `(c) a search that found nothing logged retrieved_chunk_ids: ${JSON.stringify(emptyRow.body.call_facts)}`);

    // CONTROL: the two halves differ on exactly the axis the feature is about, so neither could be
    // passing by accident on a handler that always returns the same thing.
    assert.notStrictEqual(out.taught.framing, empty.taught.framing, "CONTROL: matches and no-matches are framed identically");
  },

  async "d-a-topic-with-no-openai-key-is-refused-by-name"() {
    const { handle } = await import("../../api/_lib/handlers/agent-bundle.js");
    const rec = withFetch(recorder({ matches: [{ id: "k2" }] }));
    const saved = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
      await assert.rejects(
        () => handle(call({ topic: TOPIC })),
        e => {
          assert.ok(/OPENAI_API_KEY/.test(e.message), `(d) the refusal does not name the key: ${e.message}`);
          return true;
        },
        "(d) a topic with no OPENAI_API_KEY must be refused, never answered as 'nothing matched'",
      );
      // CONTROL: refused BEFORE spending anything, and the refusal is about the key and not a
      // silently empty answer -- queryRAG() returns an empty result for a missing key, which is
      // exactly the shape this arm exists to rule out (harvest §4 call 6, follow-on 3).
      assert.strictEqual(rec.embeds().length, 0, `(d) ${rec.embeds().length} embedding(s) were attempted with no key`);
      assert.strictEqual(rec.searches().length, 0, `(d) ${rec.searches().length} search(es) were attempted with no key`);
    } finally {
      if (saved === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = saved;
    }
    // CONTROL: with the key back, the same call is answered -- so (d) failed for the key and not
    // for some unrelated reason.
    const rec2 = withFetch(recorder({ matches: [{ id: "k2" }] }));
    const ok = await handle(call({ topic: TOPIC }));
    assert.deepStrictEqual(ids(ok.taught.items), ["k2"], "CONTROL: (d)'s call does not succeed once the key is back");
    assert.strictEqual(rec2.embeds().length, 1, "CONTROL: (d)'s call does not embed once the key is back");
  },

  async "e-another-agents-id-with-a-topic-is-still-unknown-agent"() {
    const { handle } = await import("../../api/_lib/handlers/agent-bundle.js");
    const rec = withFetch(recorder({ matches: [{ id: "k2" }] }));
    await assert.rejects(
      () => handle(call({ agent_id: "other-1", topic: "x" })),
      e => {
        assert.strictEqual(e.message, "Unknown agent: other-1", `(e) the refusal reads ${JSON.stringify(e.message)}`);
        return true;
      },
      "(e) the own-knowledge rule must still refuse another agent's id when a topic is passed",
    );
    // CONTROL: refused before any spend -- the new input cannot be used to search another agent's
    // knowledge even by accident.
    assert.strictEqual(rec.embeds().length, 0, `(e) ${rec.embeds().length} embedding(s) ran for another agent's id`);
    assert.strictEqual(rec.searches().length, 0, `(e) ${rec.searches().length} search(es) ran for another agent's id`);
  },
};

// ---------------------------------------------------------------------------------------------
// (f) LIVE -- read-only: the two Intent rows publish the optional input.
// ---------------------------------------------------------------------------------------------
async function liveTopicInput() {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!base || !key) {
    notRun("(f) both Knowledge-tool Intent rows publish the optional `topic` input",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY are not set -- read them from public.runner_secrets by name and export them inline, per docs/STANDARDS.md Section 2 rule 5");
    return [];
  }
  const q = `skill_profiles?slug=in.(${INTENT_SLUGS.join(",")})&select=slug,traits`;
  const res = await fetch(`${base.replace(/\/+$/, "")}/rest/v1/${q}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  assert.ok(res.ok, `(f) skill_profiles -> HTTP ${res.status}`);
  const rows = await res.json();
  assert.strictEqual(rows.length, 2, `(f) expected the 2 Knowledge-tool Intent rows, got ${rows.length}`);
  for (const row of rows) {
    const props = row.traits?.input_schema?.properties || {};
    assert.strictEqual(props.topic?.type, "string",
      `(f) ${row.slug} does not publish a string \`topic\` input -- its properties are ${JSON.stringify(Object.keys(props))}`);
    // CONTROL: the edit ADDED an input and took nothing away -- `agent_id` is still published and
    // `topic` is still optional, so no connected AI client's existing call stops validating.
    assert.strictEqual(props.agent_id?.type, "string", `(f) ${row.slug} lost its agent_id input`);
    assert.ok(!(row.traits?.input_schema?.required || []).includes("topic"),
      `(f) ${row.slug} made topic REQUIRED -- it must stay optional`);
  }
  return ["f-live-both-intent-rows-publish-topic"];
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
  console.log(`  [AGT-340] ${passed.length} of ${Object.keys(ARMS).length} offline arms passed: ${passed.map(n => n.split("-")[0]).join(",") || "none"}`);
  if (failed.length) assert.fail(`${failed.length} arm(s) failed -- ` + failed.join(" | "));
  passed.push(...(await liveTopicInput()));
  return passed;
}

selfRun(import.meta.url, run);
export default run;
