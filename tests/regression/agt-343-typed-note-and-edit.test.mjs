// DeepBench v7.0.768 | tests/regression/agt-343-typed-note-and-edit.test.mjs | AGT-343
//
// FEATURE: AGT-343 -- a typed note is its own item, and editing an item's text refreshes its
// embedding. Before this ticket PATCH on api/load-entries.js took no `content` and never wrote
// `embedding`, though the embedded text is title + content -- an edited item kept being found by
// its OLD text. And no stored fact told a typed note from a file.
//
// OFFLINE BY CONSTRUCTION (pattern:76): globalThis.fetch is replaced for the whole run and the
// three keys are stubs, so no arm can reach a database or OpenAI. All four are restored in `finally`.
//
// ARMS (kickoff §5 T1), driven through the default export of api/load-entries.js:
//   (a) POST with kind "note": stored as category `Note`, read back as kind `note`; one embed, one log.
//   (b) the same POST without `kind`: the caller's category stands; kind `file`.
//   (c) GET: rows with categories `Note`, `Internal` read back as kinds `note`, `file`.
//   (d) THE DISCRIMINATOR -- PATCH content: one embed of the NEW text, saved with it.
//   (e) PATCH title: the embed input is the new title over the STORED content.
//   (f) CONTROL -- PATCH status only: zero embeds, zero row reads.
//   (g) PATCH an unchanged title + priority: one row read, zero embeds.
//   (h) PATCH with no stored row -> 404; a blank title -> 400; neither embeds nor writes.
//
// DRY-RUN against the unchanged tree (124c4ad0, before this change): (f) passes; every other arm
// fails. Each arm is graded on its own so that claim is observable rather than asserted -- the
// namespace import below keeps a missing export from failing the whole file at link time.
//
// THE STUB'S PATCH ANSWER is the stored row with the sent body laid over it, which is what
// PostgREST returns under `Prefer: return=representation` (the whole updated row, never just the
// sent columns). Every assertion on what was SENT reads the recorded request body, not this answer.

import assert from "assert";
import { selfRun } from "./_lib/self-run.js";

import * as knowledgeWrite from "../../lib/knowledge-write.js";
import loadEntries from "../../api/load-entries.js";

const STUB_ENV = {
  SUPABASE_URL: "http://stub.invalid",
  SUPABASE_SERVICE_KEY: "stub",
  OPENAI_API_KEY: "stub",
};
const STORED = { title: "Passcode", content: "say bosco", agent_id: "brittany", category: "Note" };
const EMBEDDING = [0.1, 0.2, 0.3];

const answer = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  text: async () => JSON.stringify(body),
});

// One recorder per arm: every call is kept, and `storedRows` is what a knowledge_entries read returns.
function makeFetch(storedRows) {
  const calls = [];
  const stub = async (url, init = {}) => {
    const u = String(url);
    const method = init.method ? String(init.method).toUpperCase() : null;
    const body = init.body ? JSON.parse(init.body) : null;
    calls.push({ url: u, method, body });
    if (u.includes("api.openai.com")) {
      return answer(200, { data: [{ embedding: EMBEDDING }], usage: { total_tokens: 7 } });
    }
    if (u.includes("/ai_activity_log")) return answer(201, []);
    if (u.includes("/knowledge_entries")) {
      if (method === null || method === "GET") return answer(200, storedRows);
      if (method === "POST") return answer(200, [body]);
      if (method === "PATCH") return answer(200, [{ ...(storedRows[0] || {}), ...body }]);
    }
    return answer(200, []);
  };
  const of = pred => calls.filter(pred);
  return {
    stub,
    calls,
    embeds: () => of(c => c.url.includes("api.openai.com")),
    logs: () => of(c => c.url.includes("/ai_activity_log")),
    reads: () => of(c => c.url.includes("/knowledge_entries") && (c.method === null || c.method === "GET")),
    writes: m => of(c => c.url.includes("/knowledge_entries") && c.method === m),
  };
}

async function call(method, body, storedRows = []) {
  const rec = makeFetch(storedRows);
  globalThis.fetch = rec.stub;
  const out = { statusCode: null, payload: undefined };
  const held = {};
  const res = {
    setHeader(k, v) { held[String(k).toLowerCase()] = v; },
    getHeader(k) { return held[String(k).toLowerCase()]; },
    status(code) { out.statusCode = code; return res; },
    json(payload) { out.payload = payload; return res; },
    end() { return res; },
  };
  await loadEntries({ method, headers: {}, query: {}, body }, res);
  return { ...out, rec };
}

const keys = o => Object.keys(o || {}).sort();

// ---------------------------------------------------------------------------------------------
const ARMS = {
  async "a-typed-note-is-stored-as-Note-and-read-back-as-kind-note"() {
    const r = await call("POST", { title: "Passcode", content: "say bosco", kind: "note", category: "Standards", agent_id: "brittany" });
    assert.strictEqual(r.statusCode, 200, `POST must answer 200, got ${r.statusCode} ${JSON.stringify(r.payload)}`);
    const posts = r.rec.writes("POST");
    assert.strictEqual(posts.length, 1, `exactly one knowledge_entries save, got ${posts.length}`);
    const saved = posts[0].body;
    assert.strictEqual(saved.category, "Note", `a typed note must be saved with category Note, got ${JSON.stringify(saved.category)}`);
    assert.strictEqual(saved.source, "user", "a typed note is a trainer's item: source user");
    assert.ok(Array.isArray(saved.embedding) && saved.embedding.length === 3, "the saved row must carry the embedding of 3");
    assert.ok(!("kind" in saved), "`kind` must never enter the saved payload -- knowledge_entries has no such column");
    const embeds = r.rec.embeds();
    assert.strictEqual(embeds.length, 1, `exactly one embedding request, got ${embeds.length}`);
    assert.strictEqual(embeds[0].body.input, "Passcode\n\nsay bosco", "the embedded text is title + content");
    assert.strictEqual(r.rec.logs().length, 1, `exactly one ai_activity_log write, got ${r.rec.logs().length}`);
    assert.strictEqual(r.payload.entry.kind, "note", `the response entry must read back as kind note, got ${JSON.stringify(r.payload.entry.kind)}`);
    assert.strictEqual(knowledgeWrite.MAX_EMBED_CHARS, 12000, "MAX_EMBED_CHARS must be exported at module level and be 12000");
  },

  async "b-no-kind-keeps-the-callers-category-and-reads-back-as-file"() {
    const r = await call("POST", { title: "Passcode", content: "say bosco", category: "Standards", agent_id: "brittany" });
    assert.strictEqual(r.statusCode, 200, `POST must answer 200, got ${r.statusCode}`);
    assert.strictEqual(r.rec.writes("POST")[0].body.category, "Standards", "without kind the caller's category stands");
    assert.strictEqual(r.payload.entry.kind, "file", `an item that is not a note reads back as kind file, got ${JSON.stringify(r.payload.entry.kind)}`);
  },

  async "c-get-reads-kind-from-the-stored-category"() {
    const r = await call("GET", undefined, [
      { id: "n1", title: "N", content: "n", category: "Note" },
      { id: "f1", title: "F", content: "f", category: "Internal" },
    ]);
    assert.strictEqual(r.statusCode, 200, `GET must answer 200, got ${r.statusCode}`);
    assert.deepStrictEqual(r.payload.entries.map(e => e.kind), ["note", "file"],
      "GET must say which item is a typed note and which is a file");
  },

  async "d-DISCRIMINATOR-a-content-edit-embeds-the-new-text-and-saves-it"() {
    const r = await call("PATCH", { id: "i1", content: "say rosco" }, [STORED]);
    assert.strictEqual(r.statusCode, 200, `PATCH must answer 200, got ${r.statusCode} ${JSON.stringify(r.payload)}`);
    const embeds = r.rec.embeds();
    assert.strictEqual(embeds.length, 1, `a content edit must send exactly one embedding request, got ${embeds.length}`);
    assert.strictEqual(embeds[0].body.input, "Passcode\n\nsay rosco", "the embed input is the stored title over the NEW content");
    const patches = r.rec.writes("PATCH");
    assert.strictEqual(patches.length, 1, `exactly one PATCH, got ${patches.length}`);
    assert.deepStrictEqual(keys(patches[0].body), ["content", "embedding"], "the PATCH body is exactly content + embedding");
    assert.strictEqual(patches[0].body.content, "say rosco", "the new content must be saved");
    assert.deepStrictEqual(patches[0].body.embedding, EMBEDDING, "the embedding saved is the one the request returned");
    assert.strictEqual(r.rec.logs().length, 1, `exactly one ai_activity_log write, got ${r.rec.logs().length}`);
    assert.strictEqual(r.payload.entry.kind, "note", `the edited note still reads back as kind note, got ${JSON.stringify(r.payload.entry.kind)}`);
  },

  async "e-a-title-edit-embeds-the-new-title-over-the-stored-content"() {
    const r = await call("PATCH", { id: "i1", title: "Code" }, [STORED]);
    assert.strictEqual(r.statusCode, 200, `PATCH must answer 200, got ${r.statusCode}`);
    const embeds = r.rec.embeds();
    assert.strictEqual(embeds.length, 1, `a title edit must send exactly one embedding request, got ${embeds.length}`);
    assert.strictEqual(embeds[0].body.input, "Code\n\nsay bosco", "the embed input is the NEW title over the stored content");
    assert.deepStrictEqual(keys(r.rec.writes("PATCH")[0].body), ["embedding", "title"], "the PATCH body is exactly title + embedding");
  },

  async "f-CONTROL-a-status-toggle-embeds-nothing-and-reads-nothing"() {
    const r = await call("PATCH", { id: "i1", status: "disabled" }, [STORED]);
    assert.strictEqual(r.statusCode, 200, `PATCH must answer 200, got ${r.statusCode}`);
    assert.strictEqual(r.rec.embeds().length, 0, "a status toggle must not embed");
    assert.strictEqual(r.rec.reads().length, 0, "a status toggle must not read the row");
    assert.deepStrictEqual(r.rec.writes("PATCH")[0].body, { status: "disabled" }, "the PATCH body is exactly the status");
  },

  async "g-unchanged-text-is-read-but-not-re-embedded"() {
    const r = await call("PATCH", { id: "i1", title: "Passcode", priority: 10 }, [STORED]);
    assert.strictEqual(r.statusCode, 200, `PATCH must answer 200, got ${r.statusCode}`);
    assert.strictEqual(r.rec.reads().length, 1, `a supplied title must be compared to the stored row: one read, got ${r.rec.reads().length}`);
    assert.strictEqual(r.rec.embeds().length, 0, "text that did not change must not be re-embedded");
    assert.deepStrictEqual(r.rec.writes("PATCH")[0].body, { title: "Passcode", priority: 10 }, "the PATCH body is exactly title + priority");
  },

  async "h-a-missing-row-is-404-and-a-blank-title-is-400"() {
    const gone = await call("PATCH", { id: "i1", content: "x" }, []);
    assert.strictEqual(gone.statusCode, 404, `an edit to a row that does not exist must answer 404, got ${gone.statusCode}`);
    assert.strictEqual(gone.rec.embeds().length, 0, "404: nothing is embedded");
    assert.strictEqual(gone.rec.writes("PATCH").length, 0, "404: nothing is written");

    const blank = await call("PATCH", { id: "i1", title: " " }, [STORED]);
    assert.strictEqual(blank.statusCode, 400, `a blank title must be refused with 400, got ${blank.statusCode}`);
    assert.strictEqual(blank.rec.embeds().length, 0, "400: nothing is embedded");
    assert.strictEqual(blank.rec.writes("PATCH").length, 0, "400: nothing is written");
  },
};

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
  console.log(`  [AGT-343] ${passed.length} of ${Object.keys(ARMS).length} arms passed: ${passed.map(n => n.split("-")[0]).join(",") || "none"}`);
  if (failed.length) assert.fail(`${failed.length} arm(s) failed -- ` + failed.join(" | "));
  return passed;
}

selfRun(import.meta.url, run);
export default run;
