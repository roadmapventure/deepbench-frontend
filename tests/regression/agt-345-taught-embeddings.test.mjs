// DeepBench v7.0.775 | tests/regression/agt-345-taught-embeddings.test.mjs | AGT-345
//
// FEATURE: AGT-345 -- a user-taught item saved with no embedding is never found by in-app search,
// and nobody was told. Before this ticket reembedOnEdit() returned null on unchanged text without
// ever reading `embedding`, so the app could not embed such a row unless its text changed; and
// nothing under scripts/ or tests/ looked for a null embedding at all.
//
// OFFLINE BY CONSTRUCTION for arms (a)-(f) (pattern:76): globalThis.fetch is replaced and the three
// keys are stubs for (a)-(c); (d)-(f) hand sweep() their own fetchImpl. All are restored in `finally`.
// Arm (g) is the one live arm and it is READ-ONLY: two GETs, no write, no model call.
//
// ARMS (kickoff §5 T1):
//   (a) THE DISCRIMINATOR / REPAIR -- PATCH an unchanged title on a row whose embedding is null:
//       one row read (selecting `embedding`), one embed of the stored text, saved with it, one log.
//   (b) CONTROL -- the same PATCH on a row that HAS an embedding: zero embeds.
//   (c) CONTROL -- a status-only PATCH on a null-embedding row: zero reads, zero embeds.
//   (d) sweep(): one null row of 11 -> code 1, the row named, the key never printed.
//   (e) sweep(): no null row of 11 -> code 0, `11 of 11`.
//   (f) sweep(): empty url or key (fetchImpl never called), HTTP 500, a throwing fetchImpl -> code 2,
//       every line `NOT RUN`.
//   (g) LIVE -- the real sweep over the real rows; NOT RUN without credentials or when it cannot read.
//
// DRY-RUN against the unchanged tree (3e554e1e, before this change): (b), (c) pass; (a) fails (zero
// embeds); (d)-(g) fail at import -- scripts/check-taught-embeddings.js does not exist. Each arm is
// graded on its own and the script is imported INSIDE arms (d)-(g) so that claim is observable.

import assert from "assert";
import { selfRun, notRun } from "./_lib/self-run.js";

import loadEntries from "../../api/load-entries.js";

// Captured before STUB_ENV is applied: arm (g) is the only arm that may see the real ones.
const REAL_URL = process.env.SUPABASE_URL;
const REAL_KEY = process.env.SUPABASE_SERVICE_KEY;
const REAL_FETCH = globalThis.fetch;

const STUB_ENV = {
  SUPABASE_URL: "http://stub.invalid",
  SUPABASE_SERVICE_KEY: "stub",
  OPENAI_API_KEY: "stub",
};
const R = { title: "Passcode", content: "say bosco", agent_id: "brittany", category: "Internal" };
const EMBEDDING = [0.1, 0.2, 0.3];
const SWEEP_URL = "http://stub.invalid";
const SWEEP_KEY = "sweep-key-never-printed";
const ELEVEN = Array.from({ length: 11 }, (_, i) => ({ id: `row-${i + 1}` }));

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

// sweep()'s own fetch: the null read and the all-items read are told apart by the URL sweep() sends.
function sweepFetch({ nullRows, allRows }) {
  const calls = [];
  const impl = async (url, init = {}) => {
    const u = String(url);
    calls.push({ url: u, init });
    return answer(200, u.includes("embedding=is.null") ? nullRows : allRows);
  };
  return { impl, calls };
}

const loadSweep = async () => (await import("../../scripts/check-taught-embeddings.js")).sweep;

// ---------------------------------------------------------------------------------------------
const ARMS = {
  async "a-DISCRIMINATOR-an-unchanged-title-on-a-null-embedding-row-embeds-and-saves"() {
    const r = await call("PATCH", { id: "i1", title: "Passcode" }, [{ ...R, embedding: null }]);
    assert.strictEqual(r.statusCode, 200, `PATCH must answer 200, got ${r.statusCode} ${JSON.stringify(r.payload)}`);
    const embeds = r.rec.embeds();
    assert.strictEqual(embeds.length, 1, `an edit on an item with no embedding must send exactly one embedding request, got ${embeds.length}`);
    const reads = r.rec.reads();
    assert.strictEqual(reads.length, 1, `exactly one row read, got ${reads.length}`);
    assert.ok(reads[0].url.includes("select=title,content,agent_id,embedding"),
      `the row read must select the embedding, got ${reads[0].url}`);
    assert.strictEqual(embeds[0].body.input, "Passcode\n\nsay bosco", "the embed input is the stored title over the stored content");
    const patches = r.rec.writes("PATCH");
    assert.strictEqual(patches.length, 1, `exactly one PATCH, got ${patches.length}`);
    assert.deepStrictEqual(patches[0].body, { title: "Passcode", embedding: EMBEDDING }, "the PATCH body is exactly the title + the fresh embedding");
    assert.strictEqual(r.rec.logs().length, 1, `exactly one ai_activity_log write, got ${r.rec.logs().length}`);
  },

  async "b-CONTROL-an-embedded-item-with-unchanged-text-embeds-nothing"() {
    const r = await call("PATCH", { id: "i1", title: "Passcode" }, [{ ...R, embedding: "[0.1,0.2,0.3]" }]);
    assert.strictEqual(r.statusCode, 200, `PATCH must answer 200, got ${r.statusCode}`);
    assert.strictEqual(r.rec.embeds().length, 0, "an item that already has an embedding and whose text did not change must not be re-embedded");
    assert.deepStrictEqual(r.rec.writes("PATCH")[0].body, { title: "Passcode" }, "the PATCH body is exactly the title");
  },

  async "c-CONTROL-a-status-toggle-on-a-null-embedding-row-reads-and-embeds-nothing"() {
    const r = await call("PATCH", { id: "i1", status: "disabled" }, [{ ...R, embedding: null }]);
    assert.strictEqual(r.statusCode, 200, `PATCH must answer 200, got ${r.statusCode}`);
    assert.strictEqual(r.rec.reads().length, 0, "an edit with no title or content must not read the row");
    assert.strictEqual(r.rec.embeds().length, 0, "an edit with no title or content must not embed");
  },

  async "d-sweep-names-the-item-with-no-embedding-and-answers-1"() {
    const sweep = await loadSweep();
    const f = sweepFetch({
      nullRows: [{ id: "7c6e812b", title: "T", agent_id: "brittany", tenant_id: "global" }],
      allRows: ELEVEN,
    });
    const out = await sweep({ url: SWEEP_URL, key: SWEEP_KEY, fetchImpl: f.impl });
    assert.strictEqual(out.code, 1, `one item with no embedding must answer code 1, got ${out.code}`);
    assert.strictEqual(out.rows.length, 1, `exactly one row reported, got ${out.rows.length}`);
    assert.ok(out.lines.some(l => l.includes("7c6e812b") && l.includes('"T"')),
      `a line must name the item by id and title, got ${JSON.stringify(out.lines)}`);
    assert.ok(!out.lines.some(l => l.includes(SWEEP_KEY)), "no line may hold the key");
  },

  async "e-sweep-answers-0-when-every-item-has-an-embedding"() {
    const sweep = await loadSweep();
    const f = sweepFetch({ nullRows: [], allRows: ELEVEN });
    const out = await sweep({ url: SWEEP_URL, key: SWEEP_KEY, fetchImpl: f.impl });
    assert.strictEqual(out.code, 0, `no item with a null embedding must answer code 0, got ${out.code}`);
    assert.ok(out.lines.some(l => l.includes("11 of 11")), `a line must hold "11 of 11", got ${JSON.stringify(out.lines)}`);
  },

  async "f-sweep-that-could-not-read-is-NOT-RUN-never-a-pass"() {
    const sweep = await loadSweep();
    const allNotRun = (out, what) => {
      assert.strictEqual(out.code, 2, `${what} must answer code 2, got ${out.code}`);
      assert.ok(out.lines.length > 0 && out.lines.every(l => l.includes("NOT RUN")),
        `${what}: every line must hold NOT RUN, got ${JSON.stringify(out.lines)}`);
    };

    for (const [what, args] of [
      ["an empty url", { url: "", key: SWEEP_KEY }],
      ["an empty key", { url: SWEEP_URL, key: "" }],
    ]) {
      const f = sweepFetch({ nullRows: [], allRows: ELEVEN });
      allNotRun(await sweep({ ...args, fetchImpl: f.impl }), what);
      assert.strictEqual(f.calls.length, 0, `${what}: fetchImpl must never be called, got ${f.calls.length} call(s)`);
    }

    allNotRun(
      await sweep({ url: SWEEP_URL, key: SWEEP_KEY, fetchImpl: async () => answer(500, { message: "boom" }) }),
      "a read answering HTTP 500",
    );
    allNotRun(
      await sweep({ url: SWEEP_URL, key: SWEEP_KEY, fetchImpl: async () => { throw new Error("socket closed"); } }),
      "a throwing fetchImpl",
    );
  },

  async "g-LIVE-every-active-user-taught-item-has-an-embedding"() {
    const part = "the live sweep of user-taught items";
    if (!REAL_URL || !REAL_KEY) {
      notRun(part, "SUPABASE_URL and SUPABASE_SERVICE_KEY are not set in this run");
      return;
    }
    const sweep = await loadSweep();
    const out = await sweep({ url: REAL_URL, key: REAL_KEY, fetchImpl: REAL_FETCH });
    if (out.code === 2) {
      notRun(part, out.lines.join(" | "));
      return;
    }
    assert.strictEqual(out.code, 0, `${out.lines.join(" | ")} -- live data, not this build`);
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
  console.log(`  [AGT-345] ${passed.length} of ${Object.keys(ARMS).length} arms passed: ${passed.map(n => n.split("-")[0]).join(",") || "none"}`);
  if (failed.length) assert.fail(`${failed.length} arm(s) failed -- ` + failed.join(" | "));
  return passed;
}

selfRun(import.meta.url, run);
export default run;
