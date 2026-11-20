// DeepBench v7.0.1077 | tests/regression/agt-354-taught-pieces.test.mjs | AGT-354 -- a long taught item is stored and searched by piece.
//
// FEATURE: AGT-354 -- lib/knowledge-write.js embedded an item's first 12,000 characters only and
// queryRAG() rendered a matched item whole, so nothing past character 12,000 of a long taught item
// was searchable and a match injected the whole item. A long item is now also stored as overlapping
// 4,000-character pieces (knowledge_entry_pieces), each with its own embedding, and the search goes
// through match_knowledge_pieces, which returns the matching piece.
//
// OFFLINE BY CONSTRUCTION for arms (b)-(j) (pattern:76): the real SUPABASE_URL, SUPABASE_SERVICE_KEY
// and globalThis.fetch are captured first, the three keys are then stubs and fetch is a recorder;
// all of it is restored in `finally`. Arms (a) and (k) read repo files and perform no fetch. Arms
// (l) and (m) are the live arms and are READ-ONLY: POSTs to a `stable` function and one GET, no
// write, no model call.
//
// ARMS (kickoff §5 T1, harvest block T):
//   (a) MIRROR -- docs/design/agt-354-taught-pieces.sql carries the applied migration.
//   (b) SPLIT -- splitIntoPieces() is pure: 12,000 -> none, 12,001 -> 4, 216,720 -> 61, overlap 400.
//   (c) SAVE, LONG -- 5 embeddings, the item row first, then one DELETE and one POST of 4 pieces.
//   (d) SAVE, SHORT -- 1 embedding, no pieces written (a save over an id still clears its pieces).
//   (e) REPAIR -- the route T8 uses: an unchanged edit on a long item with no pieces writes them.
//   (f) ALREADY IN PIECES -- the same edit writes nothing.
//   (g) LONG TO SHORT -- the pieces of an item that stopped being long are removed.
//   (h) A FAILED EMBED REMOVES NOTHING -- every piece is embedded before anything is deleted.
//   (i) THE SEARCH RETURNS THE PIECE -- rpc/match_knowledge_pieces, and the `part N of M` label.
//   (j) THE EXCLUSION IS THE CALLER'S -- p_exclude_always_for is whatever the caller passed.
//   (k) THE EXECUTOR PASSES IT -- only when the prompt it is enriching holds the taught section.
//   (l) LIVE -- the function answers, and no row it returns is longer than a piece.
//   (m) LIVE -- the exclusion leaves out that agent's always-given items and nothing else.
//
// DISCRIMINATOR (kickoff §6 QA 1): `1 of 13` on the unchanged tree (only (a)), `13 of 13` after T4.
// lib/knowledge-write.js and lib/rag.js are imported with `await import()` INSIDE each arm and read
// off the namespace, never as named imports at the top of this file: on the unchanged tree a missing
// export must fail its own arm rather than the whole module, which is what makes that claim
// observable rather than asserted.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

// Captured before STUB_ENV is applied: arms (l) and (m) are the only arms that may see the real ones.
const REAL_URL = process.env.SUPABASE_URL;
const REAL_KEY = process.env.SUPABASE_SERVICE_KEY;
const REAL_FETCH = globalThis.fetch;

const STUB_ENV = {
  SUPABASE_URL: "http://stub.invalid",
  SUPABASE_SERVICE_KEY: "stub",
  OPENAI_API_KEY: "stub",
};

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const LONG = "x".repeat(12001);
const SHORT = "say bosco";
const EMBEDDING = [0.1];
const PIECES = "/knowledge_entry_pieces";

const answer = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  text: async () => JSON.stringify(body),
});

// One recorder per arm. Every call is kept {url, method, body}; `failEmbedOn` answers 500 to that
// one embedding request and 200 to the others, which is how arm (h) proves the ordering inside
// writePieces() rather than describing it.
function recorder({ storedRows = [], pieceRows = [], rpcRows = [], failEmbedOn = null } = {}) {
  const calls = [];
  let embedN = 0;
  const stub = async (url, init = {}) => {
    const u = String(url);
    const method = init.method ? String(init.method).toUpperCase() : "GET";
    const body = init.body ? JSON.parse(init.body) : null;
    calls.push({ url: u, method, body });
    if (u.includes("api.openai.com")) {
      embedN += 1;
      if (failEmbedOn !== null && embedN === failEmbedOn) return answer(500, {});
      return answer(200, { data: [{ embedding: EMBEDDING }], usage: { total_tokens: 1 } });
    }
    if (u.includes("/ai_activity_log")) return answer(201, []);
    if (u.includes(PIECES)) {
      if (method === "GET") return answer(200, pieceRows);
      return answer(201, []);
    }
    if (u.includes("/rpc/")) return answer(200, rpcRows);
    if (u.includes("/knowledge_entries")) {
      if (method === "GET") return answer(200, storedRows);
      if (method === "POST" || method === "PATCH") return answer(200, [{ ...body, id: body?.id || "e1" }]);
    }
    return answer(200, []);
  };
  globalThis.fetch = stub;
  const of = pred => calls.filter(pred);
  return {
    calls,
    embeds: () => of(c => c.url.includes("api.openai.com")),
    rpcs: () => of(c => c.url.includes("/rpc/")),
    pieces: () => of(c => c.url.includes(PIECES)),
    piecesOf: m => of(c => c.url.includes(PIECES) && c.method === m),
    entries: m => of(c => c.url.includes("/knowledge_entries") && c.method === m),
    indexOf: pred => calls.findIndex(pred),
  };
}

const writeMod = () => import("../../lib/knowledge-write.js");
const ragMod = () => import("../../lib/rag.js");

const readRepo = rel => fs.readFileSync(path.join(REPO, rel), "utf8");
const occurrences = (haystack, needle) => haystack.split(needle).length - 1;

// Arms (l) and (m): 1536 numbers, the first 1 and the rest 0.
const PROBE = Array.from({ length: 1536 }, (_, i) => (i === 0 ? 1 : 0));

async function callPieces(body) {
  const res = await REAL_FETCH(`${REAL_URL}/rest/v1/rpc/match_knowledge_pieces`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: REAL_KEY,
      Authorization: `Bearer ${REAL_KEY}`,
    },
    body: JSON.stringify({
      query_embedding: PROBE,
      match_threshold: -1,
      match_count: 1000,
      p_tenant_id: "global",
      p_agent_id: null,
      p_exclude_always_for: null,
      ...body,
    }),
  });
  return { status: res.status, rows: await res.json() };
}

// ---------------------------------------------------------------------------------------------
const ARMS = {
  // (a) The applied migration has a mirror in the repo, and it is the one that was applied.
  async "a-MIRROR-the-migration-is-mirrored-in-the-repo"() {
    const sql = readRepo("docs/design/agt-354-taught-pieces.sql");
    for (const needle of [
      "create table public.knowledge_entry_pieces",
      "create function public.match_knowledge_pieces(",
      "left(s.content, 12000)",
      "AGT354 gate",
    ]) {
      assert.ok(sql.includes(needle), `the mirror must hold ${JSON.stringify(needle)}`);
    }
    assert.strictEqual(
      occurrences(sql, "from public, anon, authenticated;"), 2,
      "the table and the function must each be closed to anon and authenticated BY NAME (.claude/rules/supabase-column-grants.md)",
    );
  },

  // (b) Pure, so it is asserted directly: the only arm that needs neither fetch nor credentials.
  async "b-SPLIT-a-long-item-is-cut-into-overlapping-pieces-and-a-short-one-is-not"() {
    const { splitIntoPieces } = await writeMod();
    assert.deepStrictEqual(splitIntoPieces("x".repeat(12000)), [],
      "an item at 12,000 characters is whole in its own embedding and has no pieces");

    const long = splitIntoPieces("x".repeat(12001));
    assert.strictEqual(long.length, 4, `12,001 characters must cut into 4 pieces, got ${long.length}`);
    assert.strictEqual(long[3].length, 1201, `the last piece of 12,001 must be 1,201 characters, got ${long[3].length}`);

    const huge = splitIntoPieces("x".repeat(216720));
    assert.strictEqual(huge.length, 61, `216,720 characters must cut into 61 pieces, got ${huge.length}`);
    assert.strictEqual(huge[60].length, 720, `the last piece of 216,720 must be 720 characters, got ${huge[60].length}`);

    const alpha = Array.from({ length: 20000 }, (_, i) => String.fromCharCode(97 + (i % 26))).join("");
    const cut = splitIntoPieces(alpha);
    assert.deepStrictEqual(cut.map(p => p.length), [4000, 4000, 4000, 4000, 4000, 2000],
      "20,000 characters must cut into five whole pieces and a 2,000-character tail");
    assert.strictEqual(cut[1].slice(0, 5), alpha.slice(3600, 3605),
      "the second piece must start 400 characters before the first one ended (the overlap)");

    for (const [n, set] of [[12001, long], [216720, huge], [20000, cut]]) {
      assert.ok(set.every(p => p.length <= 4000), `no piece of ${n} characters may be longer than 4,000`);
    }
  },

  // (c) THE WRITE SIDE. The item row is saved first; its pieces are embedded, then replaced.
  async "c-SAVE-LONG-embeds-every-piece-and-writes-them-after-the-item-row"() {
    const { embedAndUpsertEntry } = await writeMod();
    const rec = recorder();
    await embedAndUpsertEntry({ title: "T", content: LONG, agent_id: "a" });

    assert.strictEqual(rec.embeds().length, 5,
      `a 12,001-character save must embed the item and its 4 pieces (5 requests), got ${rec.embeds().length}`);

    const itemPost = rec.indexOf(c => c.url.includes("/knowledge_entries") && c.method === "POST");
    const firstPiece = rec.indexOf(c => c.url.includes(PIECES));
    assert.ok(itemPost >= 0 && firstPiece > itemPost,
      "the item row must be saved before any pieces call -- a piece references the item");

    const del = rec.piecesOf("DELETE");
    const post = rec.piecesOf("POST");
    assert.strictEqual(del.length, 1, `exactly one pieces DELETE, got ${del.length}`);
    assert.ok(del[0].url.endsWith("/rest/v1/knowledge_entry_pieces?entry_id=eq.e1"),
      `the DELETE must be scoped to the saved item, got ${del[0].url}`);
    assert.strictEqual(post.length, 1, `exactly one pieces POST, got ${post.length}`);
    assert.ok(rec.calls.indexOf(del[0]) < rec.calls.indexOf(post[0]),
      "the item's old pieces must be removed before the new ones are inserted");

    const rows = post[0].body;
    assert.ok(Array.isArray(rows) && rows.length === 4, `the POST must carry 4 piece rows, got ${JSON.stringify(rows).slice(0, 120)}`);
    assert.deepStrictEqual(rows.map(r => r.piece_no), [1, 2, 3, 4], "the pieces must be numbered 1..4 in order");
    assert.deepStrictEqual(rows.map(r => r.content.length), [4000, 4000, 4000, 1201], "the piece lengths");
    assert.ok(rows.every(r => r.entry_id === "e1"), "every piece must carry the saved item's id");
    assert.ok(rows.every(r => Array.isArray(r.embedding) && r.embedding.length > 0), "every piece must carry its own embedding");
  },

  // (d) CONTROL. A short item makes no new embedding call and no piece.
  async "d-SAVE-SHORT-writes-no-pieces-and-a-save-over-an-id-clears-what-it-held"() {
    const { embedAndUpsertEntry } = await writeMod();

    const fresh = recorder();
    await embedAndUpsertEntry({ title: "T", content: SHORT, agent_id: "a" });
    assert.strictEqual(fresh.embeds().length, 1, `a short new save must embed once, got ${fresh.embeds().length}`);
    assert.strictEqual(fresh.pieces().length, 0, `a short new save must make no pieces call, got ${fresh.pieces().length}`);

    const over = recorder();
    await embedAndUpsertEntry({ id: "e9", title: "T", content: SHORT, agent_id: "a" });
    assert.strictEqual(over.embeds().length, 1, `a short save over an id must embed once, got ${over.embeds().length}`);
    const del = over.piecesOf("DELETE");
    assert.strictEqual(del.length, 1, `a save over an id must clear that item's pieces exactly once, got ${del.length}`);
    assert.ok(del[0].url.endsWith("entry_id=eq.e9"), `the DELETE must be scoped to e9, got ${del[0].url}`);
    assert.strictEqual(over.piecesOf("POST").length, 0, "a short item has no pieces to insert");
  },

  // (e) THE REPAIR ROUTE T8 TAKES. reembedOnEdit() returns null on unchanged text that already has
  // an embedding, so without this clause the deployed PATCH would do nothing at all.
  async "e-REPAIR-an-unchanged-edit-gives-a-long-item-the-pieces-it-never-had"() {
    const { reembedOnEdit } = await writeMod();
    const rec = recorder({ storedRows: [{ title: "T", content: LONG, agent_id: "a", embedding: "[0.1]" }], pieceRows: [] });

    const out = await reembedOnEdit({ id: "e1", title: "T" });
    assert.strictEqual(out, null, "unchanged text with an embedding is not re-embedded at the item level");
    assert.strictEqual(rec.embeds().length, 4, `only the 4 pieces are embedded, got ${rec.embeds().length}`);
    assert.strictEqual(rec.piecesOf("GET").length, 1, "the item is asked once whether it already holds pieces");
    assert.strictEqual(rec.piecesOf("DELETE").length, 1, "its pieces are replaced");
    const post = rec.piecesOf("POST");
    assert.strictEqual(post.length, 1, `exactly one pieces POST, got ${post.length}`);
    assert.strictEqual(post[0].body.length, 4, `4 piece rows, got ${post[0].body.length}`);
  },

  // (f) CONTROL for (e): the repair is idempotent, so T8 may send any item twice.
  async "f-ALREADY-IN-PIECES-the-same-edit-embeds-nothing-and-writes-nothing"() {
    const { reembedOnEdit } = await writeMod();
    const rec = recorder({
      storedRows: [{ title: "T", content: LONG, agent_id: "a", embedding: "[0.1]" }],
      pieceRows: [{ piece_no: 1 }],
    });

    const out = await reembedOnEdit({ id: "e1", title: "T" });
    assert.strictEqual(out, null, "unchanged text with an embedding is not re-embedded");
    assert.strictEqual(rec.embeds().length, 0, `an item that already holds pieces must embed nothing, got ${rec.embeds().length}`);
    assert.strictEqual(rec.piecesOf("GET").length, 1, "it is asked once");
    assert.strictEqual(rec.piecesOf("DELETE").length, 0, "nothing is removed");
    assert.strictEqual(rec.piecesOf("POST").length, 0, "nothing is inserted");
  },

  // (g) The pieces of an item that stopped being long are removed, so the search cannot return a
  // piece of text the item no longer holds.
  async "g-LONG-TO-SHORT-removes-the-pieces-and-the-control-touches-nothing"() {
    const { reembedOnEdit } = await writeMod();
    const shrink = recorder({ storedRows: [{ title: "T", content: LONG, agent_id: "a", embedding: "[0.1]" }], pieceRows: [] });
    const out = await reembedOnEdit({ id: "e1", content: SHORT });
    assert.ok(Array.isArray(out), `changed text must be re-embedded, got ${JSON.stringify(out)}`);
    assert.strictEqual(shrink.embeds().length, 1, `one embedding for the shortened item, got ${shrink.embeds().length}`);
    assert.strictEqual(shrink.piecesOf("GET").length, 0, "an item that was long needs no asking -- its pieces go either way");
    assert.strictEqual(shrink.piecesOf("DELETE").length, 1, "its pieces must be removed");
    assert.strictEqual(shrink.piecesOf("POST").length, 0, "a short item has no pieces to insert");

    const control = recorder({ storedRows: [{ title: "T", content: SHORT, agent_id: "a", embedding: "[0.1]" }], pieceRows: [] });
    const none = await reembedOnEdit({ id: "e1", title: "T" });
    assert.strictEqual(none, null, "CONTROL: an unchanged short item is not re-embedded");
    assert.strictEqual(control.embeds().length, 0, `CONTROL: no embedding, got ${control.embeds().length}`);
    assert.strictEqual(control.pieces().length, 0, `CONTROL: no pieces call at all, got ${control.pieces().length}`);
  },

  // (h) THE ORDERING INSIDE writePieces(). Every piece is embedded before anything is removed, so a
  // half-written set of pieces cannot replace a whole one.
  async "h-A-FAILED-EMBED-REMOVES-NOTHING"() {
    const { reembedOnEdit } = await writeMod();
    const rec = recorder({
      storedRows: [{ title: "T", content: LONG, agent_id: "a", embedding: "[0.1]" }],
      pieceRows: [],
      failEmbedOn: 3,
    });

    await assert.rejects(
      () => reembedOnEdit({ id: "e1", title: "T" }),
      "a failed piece embedding must reject the edit, never answer as though it saved",
    );
    assert.strictEqual(rec.piecesOf("DELETE").length, 0, "nothing may be removed when an embedding failed");
    assert.strictEqual(rec.piecesOf("POST").length, 0, "nothing may be inserted when an embedding failed");
  },

  // (i) THE READ SIDE. The search goes to the new function and renders the piece, labelled as one.
  async "i-THE-SEARCH-RETURNS-THE-PIECE-never-the-whole-item"() {
    const { queryRAG } = await ragMod();
    const row = {
      id: "e1", title: "T", content: "PIECE", jurisdiction: "All", priority: 50,
      agent_id: "a", similarity: 0.9, piece_no: 3, piece_count: 4,
    };
    const rec = recorder({ rpcRows: [row] });
    const out = await queryRAG({ queryText: "q", agentId: "a" });

    const rpcs = rec.rpcs();
    assert.strictEqual(rpcs.length, 1, `exactly one RPC call, got ${rpcs.length}`);
    assert.ok(rpcs[0].url.endsWith("/rest/v1/rpc/match_knowledge_pieces"),
      `the search must call match_knowledge_pieces, got ${rpcs[0].url}`);
    assert.deepStrictEqual(
      Object.keys(rpcs[0].body).sort(),
      ["match_count", "match_threshold", "p_agent_id", "p_exclude_always_for", "p_tenant_id", "query_embedding"],
      "the RPC body carries exactly the function's six arguments",
    );
    assert.strictEqual(rpcs[0].body.p_exclude_always_for, null,
      "a caller that passed no exclusion excludes nothing -- three of the four callers render no taught section");

    assert.ok(out.context.includes("PIECE"), "the piece's own text is what is rendered");
    assert.ok(out.context.includes("--- KNOWLEDGE BASE ENTRY: T (part 3 of 4) ---"),
      `the reader of the prompt must be told it is an excerpt, got ${JSON.stringify(out.context.slice(0, 160))}`);
    assert.deepStrictEqual(out.chunks[0], { id: "e1", title: "T", similarity: 0.9, agent_id: "a", piece_no: 3 },
      "the chunk carries the piece number, so two pieces of one item are told apart");
    assert.strictEqual(out.matchCount, 1, `matchCount 1, got ${out.matchCount}`);

    // CONTROL: an item with no pieces is matched on its own embedding and renders exactly as before.
    const whole = recorder({ rpcRows: [{ ...row, piece_no: null, piece_count: 0 }] });
    const wholeOut = await queryRAG({ queryText: "q", agentId: "a" });
    assert.ok(wholeOut.context.includes("--- KNOWLEDGE BASE ENTRY: T ---"),
      `a whole item must render with no part label, got ${JSON.stringify(wholeOut.context.slice(0, 160))}`);
    assert.strictEqual(wholeOut.chunks[0].piece_no, null, "a whole item's chunk has no piece number");
    assert.strictEqual(whole.rpcs().length, 1, "one RPC call for the control too");
  },

  // (j) The exclusion is an argument, never a rule inside the shared search.
  async "j-THE-EXCLUSION-IS-THE-CALLERS"() {
    const { queryRAG } = await ragMod();
    const rec = recorder({ rpcRows: [] });
    await queryRAG({ queryText: "q", agentId: "a", excludeAlwaysFor: "michelle" });
    const rpcs = rec.rpcs();
    assert.strictEqual(rpcs.length, 1, `exactly one RPC call, got ${rpcs.length}`);
    assert.strictEqual(rpcs[0].body.p_exclude_always_for, "michelle",
      "the caller's exclusion must reach the function verbatim");
  },

  // (k) THE ONE CALLER THAT EXCLUDES, and the fact it attributes from: what the assembly did.
  async "k-THE-EXECUTOR-PASSES-IT-only-when-the-prompt-holds-the-taught-section"() {
    const src = readRepo("api/prompt/ai-enrichment.js");
    assert.ok(src.includes("excludeAlwaysFor: taughtAgentId,"),
      "the executor's RAG fetch must pass the exclusion");
    assert.ok(src.includes('sections.some(s => s.slug === "taught") ? (pr_agent_id || effectiveAgentId) : null'),
      "the exclusion must be attributed from the taught section the assembly actually rendered, not from configuration");
  },

  // (l) LIVE, READ-ONLY. The function exists, is callable by the service role, and no row it returns
  // is longer than the bound -- the whole point of the ticket, asserted against the real rows.
  async "l-LIVE-every-row-the-function-returns-is-bounded"() {
    const part = "AGT-354 arm l (live function)";
    if (!REAL_URL || !REAL_KEY || !REAL_FETCH) {
      notRun(part, "SUPABASE_URL and SUPABASE_SERVICE_KEY are not set in this run");
      return;
    }
    const { status, rows } = await callPieces({});
    assert.strictEqual(status, 200,
      `match_knowledge_pieces must answer 200 (404 means the migration is not applied), got ${status} ${JSON.stringify(rows).slice(0, 200)}`);
    assert.ok(Array.isArray(rows), `the answer must be a list of rows, got ${JSON.stringify(rows).slice(0, 200)}`);

    for (const r of rows) {
      assert.ok(String(r.content ?? "").length <= 12000,
        `no row may be longer than 12,000 characters: ${r.id} is ${String(r.content ?? "").length}`);
      if (r.piece_no === null || r.piece_no === undefined) {
        assert.strictEqual(r.piece_count, 0, `an item returned whole must have no pieces: ${r.id} reports ${r.piece_count}`);
      } else {
        assert.ok(Number.isInteger(r.piece_no) && r.piece_no >= 1, `a piece is numbered from 1: ${r.id} reports ${r.piece_no}`);
        assert.ok(String(r.content ?? "").length <= 4000,
          `a piece may not be longer than 4,000 characters: ${r.id} piece ${r.piece_no} is ${String(r.content ?? "").length}`);
        assert.ok(r.piece_count >= r.piece_no,
          `piece ${r.piece_no} of ${r.id} claims a count of ${r.piece_count}`);
      }
    }
  },

  // (m) LIVE, READ-ONLY. The exclusion removes exactly the agent's always-given items and nothing
  // else -- the control call is what makes the second call's absence mean something.
  async "m-LIVE-the-exclusion-leaves-out-those-items-and-only-those"() {
    const part = "AGT-354 arm m (live exclusion)";
    if (!REAL_URL || !REAL_KEY || !REAL_FETCH) {
      notRun(part, "SUPABASE_URL and SUPABASE_SERVICE_KEY are not set in this run");
      return;
    }
    const res = await REAL_FETCH(
      `${REAL_URL}/rest/v1/knowledge_entries?source=eq.user&status=eq.active&tenant_id=eq.global&select=id,agent_id,content`,
      { headers: { apikey: REAL_KEY, Authorization: `Bearer ${REAL_KEY}` } },
    );
    assert.strictEqual(res.status, 200, `the items read must answer 200, got ${res.status}`);
    const all = await res.json();
    const kept = all.filter(r => String(r.content ?? "").length <= 12000);
    if (!kept.length) {
      notRun(part, "no active user-taught item of at most 12,000 characters exists in tenant global");
      return;
    }
    const first = [...kept].sort((a, b) => String(a.agent_id).localeCompare(String(b.agent_id)) || String(a.id).localeCompare(String(b.id)))[0];
    const agent = first.agent_id;
    const S = new Set(kept.filter(r => r.agent_id === agent).map(r => r.id));

    const control = await callPieces({ p_agent_id: agent });
    assert.strictEqual(control.status, 200, `the control call must answer 200, got ${control.status}`);
    assert.ok(control.rows.some(r => S.has(r.id)),
      `CONTROL: without the exclusion at least one of ${agent}'s always-given items must be found, got none of ${S.size}`);

    const excluded = await callPieces({ p_agent_id: agent, p_exclude_always_for: agent });
    assert.strictEqual(excluded.status, 200, `the excluding call must answer 200, got ${excluded.status}`);
    const leaked = excluded.rows.filter(r => S.has(r.id)).map(r => r.id);
    assert.deepStrictEqual(leaked, [],
      `the exclusion must leave out every always-given item of ${agent}, found ${JSON.stringify(leaked.slice(0, 5))}`);

    const kept2 = new Set(excluded.rows.map(r => r.id));
    const dropped = control.rows.filter(r => !S.has(r.id) && !kept2.has(r.id)).map(r => r.id);
    assert.deepStrictEqual(dropped, [],
      `the exclusion must drop nothing else, lost ${JSON.stringify(dropped.slice(0, 5))}`);
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
      } finally {
        globalThis.fetch = realFetch;
      }
    }
  } finally {
    globalThis.fetch = realFetch;
    for (const [k, v] of Object.entries(realEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
  console.log(`  [AGT-354] ${passed.length} of ${Object.keys(ARMS).length} arms passed: ${passed.map(n => n.split("-")[0]).join(",") || "none"}`);
  if (failed.length) assert.fail(`${failed.length} arm(s) failed -- ` + failed.join(" | "));
  return passed;
}

selfRun(import.meta.url, run);
export default run;
