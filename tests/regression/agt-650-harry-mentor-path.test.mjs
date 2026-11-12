// DeepBench v7.0.1010 | tests/regression/agt-650-harry-mentor-path.test.mjs | AGT-650 -- the strategy consultant's mentor call path
// Kickoff: docs/kickoffs/v7.0.1010-AGT-650-harry-mentor-call-path.md section 5, T4.
//
//   A  MAPS -- twenty STRATEGY_KINDS; the two new slugs' read maps, Library sections and skip kinds;
//      strategy-advise adds decision/target/case; every strategy slug but curate reads memory and
//      product, the study and the mentor review read sources, advise/brief/mentor review read goals.
//   B  WRITE CHECK -- every per-kind rule, the market check, the patent candidate, the customer test and
//      updates_to_write, each refusal paired with a passing control that differs only in the broken
//      field; planUpdates (kind mismatch, a fact expired before 14 days, merged data) and planTick
//      (confirm, approve, drop, refusals) on in-memory rows; parseArgs for --tick/--untick.
//   C  RANKED READ (offline) -- libraryHits sends the ask to rpc/library_search as or-joined terms and
//      reports full_text; when the RPC throws it returns no hits and `trust` (the fallback that fired is
//      asserted by name); libraryPlan puts hits first by score, reads a section-only hit by its sections,
//      then the wanted sections in trust order; with OPENAI_API_KEY set and fetch stubbed, the query is
//      embedded through lib/vector-search.js, p_embedding reaches the RPC, the method is
//      full_text+vector, and one ai_activity_log row is posted; an embedding failure degrades to
//      full_text. rankTrim keeps the question's rows first inside the budget.
//   D  LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, else notRun) -- an advise render for "who would acquire
//      a procurement analytics startup" carries >= 1 Library text item the AGT-648 stem scorer would not
//      have picked (both id lists printed), the `product` block with dev_version_counter's version, a
//      `goals` block, and prompt_bytes < 150000; each of the five existing strategy renders is < 150000.
//   E  LIVE TICK -- a throwaway catalog row and a throwaway pending fact naming it in data.conflicts;
//      --tick confirms the fact (a confirmed_fact Library row), supersedes the catalog row; then both
//      Library rows and the fact are cleaned by marking them superseded -- never deleted.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  STRATEGY_KINDS, STRATEGY_READ_MAP, LIBRARY_SECTIONS, LIBRARY_TEXT_SKIP_KINDS, EXTRA_READS, LIBRARY_BYTES, LIBRARY_ITEM_CHARS,
  STRATEGY_DEFAULT_QUERY, STRATEGY_TEAM_BYTES, MEMORY_BYTES,
  validateStrategyAnswer, planUpdates, planTick, grantInsertSql, parseArgs,
  libraryHits, libraryPlan, searchTerms, strategyQuery, rankTrim,
  stemsOf, overlap, LIBRARY_MATCH_MIN,
} from "../../scripts/personal-agent.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const AGENT = path.join(ROOT, "scripts", "personal-agent.js");
const OLD_SLUGS = ["strategy-advise", "strategy-daily-brief", "strategy-library-curate", "strategy-readiness-check", "strategy-weekly-review"];
const NEW_SLUGS = ["strategy-weekly-study", "strategy-mentor-review"];
const U1 = "00000000-0000-4000-8000-000000000001";
const U2 = "00000000-0000-4000-8000-000000000002";
const U3 = "00000000-0000-4000-8000-000000000003";

const one = (kind, data, extra = {}) => ({ records_to_write: [{ kind, title: "t", data, ...extra }] });
const ok = (answer, why) => {
  const r = validateStrategyAnswer(answer);
  assert.equal(r.ok, true, `${why} passes (errors: ${JSON.stringify(r.errors)})`);
};
const refused = (answer, re, why) => {
  const r = validateStrategyAnswer(answer);
  assert.equal(r.ok, false, `${why} is refused`);
  assert.ok(r.errors.some(e => re.test(e)), `${why}: an error matches ${re} (got ${JSON.stringify(r.errors)})`);
};
const MC = { competitors: [{ name: "Acme", url: "https://acme.example", ships: "partial" }], verdict: "white_space", checked_on: "2026-11-12" };

async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`${name}: ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agt650-"));

  try {
    await arm("A maps", async () => {
      assert.equal(STRATEGY_KINDS.length, 20, "twenty strategy kinds");
      for (const k of ["decision", "commitment", "study", "source", "method", "case", "kpi", "target", "fact"]) assert.ok(STRATEGY_KINDS.includes(k), `kind ${k}`);
      assert.deepEqual(STRATEGY_READ_MAP["strategy-weekly-study"], ["source", "study", "case", "research"]);
      assert.deepEqual(STRATEGY_READ_MAP["strategy-mentor-review"], ["call", "method", "source", "study", "grade", "kpi", "commitment"]);
      for (const k of ["decision", "target", "case"]) assert.ok(STRATEGY_READ_MAP["strategy-advise"].includes(k), `advise reads ${k}`);
      for (const [slug, kinds] of Object.entries(STRATEGY_READ_MAP)) for (const k of kinds) assert.ok(STRATEGY_KINDS.includes(k), `${slug} reads ${k}`);
      assert.deepEqual(LIBRARY_SECTIONS["strategy-weekly-study"], []);
      assert.deepEqual(LIBRARY_SECTIONS["strategy-mentor-review"], ["goals", "value"]);
      for (const s of NEW_SLUGS) assert.deepEqual(LIBRARY_TEXT_SKIP_KINDS[s], ["resume", "cover_letter"], `${s} skips career documents`);
      const reads = s => [].concat(EXTRA_READS[s] ?? []);
      for (const s of [...OLD_SLUGS, ...NEW_SLUGS]) {
        const curate = s === "strategy-library-curate";
        for (const k of ["memory", "product"]) assert.equal(reads(s).includes(k), !curate, `${s} ${curate ? "does not read" : "reads"} ${k}`);
        assert.equal(reads(s).includes("sources"), NEW_SLUGS.includes(s), `${s} sources`);
        assert.equal(reads(s).includes("goals"), ["strategy-advise", "strategy-daily-brief", "strategy-mentor-review"].includes(s), `${s} goals`);
      }
      assert.equal(LIBRARY_BYTES, 60000, "LIBRARY_BYTES is kept");
      assert.equal(LIBRARY_ITEM_CHARS, 12000, "LIBRARY_ITEM_CHARS is kept");
      assert.equal(MEMORY_BYTES, 20000);
      assert.ok(STRATEGY_DEFAULT_QUERY["strategy-daily-brief"] && STRATEGY_DEFAULT_QUERY["strategy-weekly-review"] && STRATEGY_DEFAULT_QUERY["strategy-weekly-study"]);
      assert.equal(strategyQuery({ ask: " q ", capability: "strategy-daily-brief" }), "q", "the ask wins");
      assert.equal(strategyQuery({ capability: "strategy-daily-brief" }), STRATEGY_DEFAULT_QUERY["strategy-daily-brief"], "no ask: the default");
      assert.equal(strategyQuery({ capability: "strategy-readiness-check" }), null, "control: no ask and no default is no query");
    });

    await arm("B write check", async () => {
      // study
      ok(one("study", { url: "https://x.example", topic: 3 }, { body: "short" }), "a study");
      refused(one("study", { topic: 3 }), /data\.url/, "a study with no url");
      refused(one("study", { url: "https://x.example", topic: 7 }), /topic must be/, "a study with topic 7");
      refused(one("study", { url: "https://x.example", topic: 0 }), /topic must be/, "a study with topic 0");
      refused(one("study", { url: "https://x.example", topic: 3 }, { body: "x".repeat(1501) }), /over 1500/, "a 1,501-character study");
      ok(one("study", { url: "https://x.example", topic: 6 }, { body: "x".repeat(1500) }), "control: 1,500 characters, topic 6");
      // source
      ok(one("source", { url: "https://s.example", status: "active" }), "a source");
      refused(one("source", { status: "active" }), /data\.url/, "a source with no url");
      refused(one("source", { url: "https://s.example", status: "paused" }), /data\.status must be one of active\|retired/, "a source with status paused");
      ok(one("source", { url: "https://s.example", status: "retired" }), "control: a retired source");
      // case
      refused(one("case", {}), /data\.url/, "a case with no url");
      ok(one("case", { url: "https://c.example" }), "control: a case with a url");
      // commitment
      ok(one("commitment", { due: "2026-12-01", status: "open" }), "an open commitment");
      refused(one("commitment", { due: "Dec 1", status: "open" }), /YYYY-MM-DD/, "a commitment with a free-text due");
      refused(one("commitment", { due: "2026-12-01", status: "late" }), /open\|done\|dropped/, "a commitment with status late");
      refused(one("commitment", { due: "2026-12-01", status: "done" }), /evidence/, "a done commitment with no evidence");
      ok(one("commitment", { due: "2026-12-01", status: "done", evidence: "shipped" }), "control: done with evidence");
      // decision
      refused(one("decision", { reason: "r" }), /decided_on/, "a decision with no decided_on");
      refused(one("decision", { decided_on: "2026-11-12" }), /reason/, "a decision with no reason");
      ok(one("decision", { decided_on: "2026-11-12", reason: "r" }), "control: a decision with both");
      // method
      refused(one("method", { status: "approved" }), /only --tick approves/, "a method written approved");
      ok(one("method", { status: "proposed" }), "control: a proposed method");
      // fact
      refused(one("fact", { status: "pending" }), /statement/, "a fact with no statement");
      refused(one("fact", { statement: "s", status: "confirmed" }), /only --tick confirms/, "a fact written confirmed");
      ok(one("fact", { statement: "s", status: "pending" }), "control: a pending fact");
      // kpi
      const kpi = { metric: "m", value: 3, as_of: "2026-11-12", basis: "measured" };
      ok(one("kpi", kpi), "a kpi");
      for (const k of ["metric", "value", "as_of"]) {
        const d = { ...kpi }; delete d[k];
        refused(one("kpi", d), new RegExp(`data\\.${k}`), `a kpi with no ${k}`);
      }
      refused(one("kpi", { ...kpi, basis: "guess" }), /measured\|john/, "a kpi with basis guess");
      ok(one("kpi", { ...kpi, basis: "john", value: 0 }), "control: basis john, value 0");
      // target
      refused(one("target", { type: "acquirer" }), /company/, "a target with no company");
      refused(one("target", { company: "Co", type: "investor" }), /acquirer\|partner\|buyer/, "a target typed investor");
      ok(one("target", { company: "Co", type: "partner" }), "control: a partner target");
      // call: outcome needs scored_on; a customer test needs test/hypothesis/measure
      refused(one("call", { outcome: "right" }), /scored_on/, "a call outcome with no scored_on");
      ok(one("call", { outcome: "right", scored_on: "2026-11-12" }), "control: an outcome with scored_on");
      ok(one("call", {}), "control: a call with no outcome");
      refused(one("call", { test: "pricing", hypothesis: "h", measure: "m" }), /segment\|message\|feature/, "a test of an unknown type");
      refused(one("call", { test: "segment", measure: "m" }), /hypothesis/, "a segment test with no hypothesis");
      refused(one("call", { test: "segment", hypothesis: "h" }), /measure/, "a segment test with no measure");
      ok(one("call", { test: "segment", hypothesis: "h", measure: "m" }), "control: a full segment test");
      // market check, on offer and roadmap
      for (const kind of ["offer", "roadmap"]) {
        refused(one(kind, {}), /market_check/, `${kind} with no market_check`);
        ok(one(kind, { market_check: MC }), `control: ${kind} with a market_check`);
        refused(one(kind, { market_check: { ...MC, verdict: "unknown" } }), /verdict/, `${kind} with verdict unknown`);
        refused(one(kind, { market_check: { ...MC, checked_on: "" } }), /checked_on/, `${kind} with no checked_on`);
        refused(one(kind, { market_check: { ...MC, competitors: [{ name: "Acme", url: "https://a", ships: "maybe" }] } }), /competitors\[0\]/, `${kind} with ships maybe`);
        refused(one(kind, { market_check: { ...MC, competitors: [] } }), /searched/, `${kind} with no competitor and no searched`);
        ok(one(kind, { market_check: { ...MC, competitors: [], searched: "gov procurement analytics vendors" } }), `control: ${kind} with competitors [] and searched`);
        refused(one(kind, { market_check: { ...MC, verdict: "crowded" } }), /differentiator/, `${kind} crowded with no differentiator`);
        ok(one(kind, { market_check: { ...MC, verdict: "crowded", differentiator: "d" } }), `control: ${kind} crowded with a differentiator`);
        refused(one(kind, { market_check: MC, patent: { candidate: true, why: "w", prior_art: [] } }), /prior-art/, `${kind} patent candidate with no prior art`);
        ok(one(kind, { market_check: MC, patent: { candidate: true, why: "w", prior_art: ["https://patents.example/1"] } }), `control: ${kind} patent with prior art`);
      }
      ok(one("offer", { market_check: MC, proposed_price: 5000, price_basis: "comparables" }), "the AGT-644 price rule still passes with a basis");
      refused(one("offer", { market_check: MC, proposed_price: 5000 }), /price_basis/, "the AGT-644 price rule still refuses");
      ok(one("brief", { draft: "blend" }), "data.draft is accepted on any record");

      // updates_to_write shape
      const upd = u => ({ records_to_write: [], updates_to_write: [u] });
      ok(upd({ id: U1, kind: "commitment", set: { status: "done", evidence: "e" } }), "a commitment update");
      refused(upd({ id: U1, kind: "commitment", set: { due: "2026-12-30" } }), /set\.due is not an updatable key/, "a commitment update of due");
      refused(upd({ id: U1, kind: "decision", set: { reason: "x" } }), /cannot be updated/, "a decision update");
      refused(upd({ id: "nope", kind: "source", set: { score: 1 } }), /not a uuid/, "an update with a bad id");
      ok(upd({ id: U1, kind: "source", set: { score: 2, uses: 3 } }), "control: a source score update");
      refused(upd({ id: U1, kind: "fact", set: { status: "confirmed" } }), /only set status "expired"/, "a fact update to confirmed");
      ok(upd({ id: U1, kind: "fact", set: { status: "expired" } }), "control: a fact update to expired");
      refused({ records_to_write: [], updates_to_write: {} }, /must be an array/, "updates_to_write as an object");

      // planUpdates against live rows
      const now = Date.parse("2026-11-30T00:00:00Z");
      const live = [
        { id: U1, kind: "commitment", data: { due: "2026-12-01", status: "open" }, created_at: "2026-11-01T00:00:00Z" },
        { id: U2, kind: "fact", data: { statement: "s", status: "pending" }, created_at: "2026-11-20T00:00:00Z" },
        { id: U3, kind: "fact", data: { statement: "s", status: "pending" }, created_at: "2026-11-01T00:00:00Z" },
      ];
      let p = planUpdates([{ id: U1, kind: "commitment", set: { status: "done" } }], live, now);
      assert.ok(p.errors.some(e => /evidence/.test(e)), `merged: done with no evidence is refused (${p.errors})`);
      p = planUpdates([{ id: U1, kind: "commitment", set: { status: "done", evidence: "e" } }], live, now);
      assert.deepEqual(p.errors, [], "control: done with evidence");
      assert.deepEqual(p.patches, [{ id: U1, data: { due: "2026-12-01", status: "done", evidence: "e" } }], "the patch is the merged data");
      p = planUpdates([{ id: U1, kind: "source", set: { score: 1 } }], live, now);
      assert.ok(p.errors.some(e => /is a commitment/.test(e)), "a kind mismatch is refused");
      p = planUpdates([{ id: U2, kind: "fact", set: { status: "expired" } }], live, now);
      assert.ok(p.errors.some(e => /before 14 days/.test(e)), "a 10-day-old fact cannot expire");
      p = planUpdates([{ id: U3, kind: "fact", set: { status: "expired" } }], live, now);
      assert.deepEqual(p.errors, [], "control: a 29-day-old fact expires");
      p = planUpdates([{ id: "00000000-0000-4000-8000-0000000000ff", kind: "fact", set: { status: "expired" } }], live, now);
      assert.ok(p.errors.some(e => /not a strategy_records row/.test(e)), "an unknown id is refused");

      // planTick
      const rows = [
        { id: U1, kind: "fact", data: { statement: "RMV has two clients", status: "pending", conflicts: [U3] } },
        { id: U2, kind: "method", data: { status: "proposed" } },
        { id: U3, kind: "fact", data: { statement: "x", status: "pending" } },
      ];
      const t = planTick(rows, [U1, U2], [U3], { agent: "agentx", today: "2026-11-12" });
      assert.deepEqual(t.errors, []);
      assert.equal(t.facts.length, 1);
      assert.deepEqual(t.facts[0].library, { kind: "confirmed_fact", section: "facts", trust: "john_confirmed", sensitivity: "personal_private",
        title: "RMV has two clients", body: "RMV has two clients", doc_date: "2026-11-12", origin: "agentx-tick" }, "the Library row");
      assert.deepEqual(t.facts[0].conflicts, [U3]);
      assert.deepEqual(t.methods, [{ id: U2, data: { status: "approved", approved_on: "2026-11-12" } }]);
      assert.deepEqual(t.drops, [{ id: U3, data: { statement: "x", status: "dropped" } }]);
      const bad = planTick([{ id: U1, kind: "decision", data: {} }, { id: U2, kind: "method", data: { status: "approved" } }], [U1, U2], [], { agent: "a", today: "d" });
      assert.ok(bad.errors.some(e => /only fact and method/.test(e)), "a decision cannot be ticked");
      assert.ok(bad.errors.some(e => /not proposed/.test(e)), "an approved method cannot be ticked again");
      assert.ok(planTick([], [U1], [], { agent: "a", today: "d" }).errors.some(e => /not a strategy_records row/.test(e)), "a missing id is refused");
      assert.match(grantInsertSql("agentx"), /INSERT INTO public\.personal_source_grants \(agent_id, kind\) VALUES \('agentx', 'confirmed_fact'\)/);

      // parseArgs
      const a = parseArgs([`--tick=${U1},${U2}`, `--untick=${U3}`, "--agent=agentx"]);
      assert.equal(a.mode, "tick");
      assert.deepEqual([a.tick, a.untick], [[U1, U2], [U3]]);
      assert.match(parseArgs([`--tick=${U1}`]).error, /--agent/, "--tick needs --agent");
      assert.match(parseArgs(["--tick=abc", "--agent=x"]).error, /not a uuid/, "a non-uuid is refused");
      assert.match(parseArgs([`--tick=${U1}`, `--untick=${U1}`, "--agent=x"]).error, /named twice/, "an id ticked and unticked is refused");
      assert.match(parseArgs([`--untick=${U1}`, "--render", "--agent=x", "--capability=strategy-advise"]).error, /only with --tick/, "--untick outside --tick is refused");
      assert.equal(parseArgs(["--tick=", `--untick=${U1}`, "--agent=x"]).mode, "tick", "untick alone is allowed");
    });

    await arm("C ranked read (offline)", async () => {
      assert.equal(searchTerms("Who would acquire a procurement-analytics startup?"), "who or would or acquire or procurement-analytics or startup");
      const calls = [];
      const db = { rpc: async (name, body) => { calls.push({ name, body }); return [{ source_id: "b", section_id: null, score: 2 }, { source_id: "c", section_id: "c1", score: 1 }]; } };
      const saved = { key: process.env.OPENAI_API_KEY, url: process.env.SUPABASE_URL, skey: process.env.SUPABASE_SERVICE_KEY };
      delete process.env.OPENAI_API_KEY;
      let r = await libraryHits(db, "who would acquire");
      assert.equal(calls.length, 1);
      assert.equal(calls[0].name, "library_search", "the RPC path is called");
      assert.equal(calls[0].body.p_query, "who or would or acquire", "with the ask as terms");
      assert.equal(calls[0].body.p_embedding, undefined, "no key: no embedding");
      assert.equal(r.method, "full_text");
      assert.equal(r.hits.length, 2);
      const failing = { rpc: async () => { throw new Error("HTTP 500 boom"); } };
      r = await libraryHits(failing, "who would acquire");
      assert.deepEqual(r, { hits: [], method: "trust" }, "an RPC error falls back to the trust order (method `trust`, no hits)");

      const catalog = [
        { id: "a", kind: "document", section: "value", trust: "extracted", doc_date: "2026-01-01" },
        { id: "b", kind: "document", section: "market", trust: "outside", doc_date: "2026-01-01" },
        { id: "c", kind: "document", section: "identity", trust: "john_authored", doc_date: "2026-01-01" },
        { id: "d", kind: "document", section: "value", trust: "john_confirmed", doc_date: "2026-01-01" },
        { id: "e", kind: "resume", section: "value", trust: "john_confirmed", doc_date: "2026-01-01" },
        { id: "g", kind: "vision", section: "goals", trust: "vision", doc_date: "2026-01-01" },
      ];
      const hits = [{ source_id: "b", section_id: null, score: 2 }, { source_id: "c", section_id: "c1", score: 1 }, { source_id: "e", section_id: null, score: 9 }, { source_id: "g", section_id: null, score: 5 }];
      const opts = { wanted: new Set(["value"]), skipKinds: new Set(["resume"]), skipSections: new Set(["goals"]) };
      const plan = libraryPlan(catalog, hits, opts);
      assert.deepEqual(plan.map(p => p.id), ["b", "c", "d", "a"], "hits by score, then wanted sections by trust; skipped kind and section absent");
      assert.equal(plan[0].sections, null, "a catalog-level hit is read whole");
      assert.deepEqual([...plan[1].sections], ["c1"], "a section-only hit outside the sections is read by its sections");
      assert.deepEqual(libraryPlan(catalog, [], opts).map(p => p.id), ["d", "a"], "control: no hits is the trust order of the wanted sections");

      // The vector path, fetch stubbed: OpenAI answers, the AI Audit row is posted.
      const realFetch = globalThis.fetch;
      const seen = [];
      process.env.OPENAI_API_KEY = "sk-test-offline";
      process.env.SUPABASE_URL = "https://offline.invalid";
      process.env.SUPABASE_SERVICE_KEY = "offline-key";
      try {
        globalThis.fetch = async (url, init) => {
          seen.push({ url: String(url), body: init?.body ? JSON.parse(init.body) : null });
          if (String(url).includes("api.openai.com")) return new Response(JSON.stringify({ data: [{ embedding: [0.1, 0.2, 0.3] }], usage: { total_tokens: 7 } }), { status: 200 });
          return new Response("", { status: 201 });
        };
        calls.length = 0;
        r = await libraryHits(db, "who would acquire", { agentId: "agentx" });
        assert.equal(r.method, "full_text+vector", "with a key the ranking is fused");
        assert.equal(calls[0].body.p_embedding, JSON.stringify([0.1, 0.2, 0.3]), "the embedding reaches the RPC");
        const openai = seen.find(s => s.url.includes("api.openai.com"));
        assert.ok(openai && openai.body.model === "text-embedding-3-small" && openai.body.input === "who would acquire", "embedContent embedded the query");
        const audit = seen.find(s => s.url.includes("/rest/v1/ai_activity_log"));
        assert.ok(audit, "the embedding call is logged to ai_activity_log");
        assert.equal(audit.body.model, "text-embedding-3-small");
        assert.equal(audit.body.input_tokens, 7);
        assert.equal(audit.body.feature, "strategy-ranked-read");
        // An embedding failure degrades to full text, never to no ranking.
        globalThis.fetch = async () => new Response("quota", { status: 429 });
        calls.length = 0;
        r = await libraryHits(db, "who would acquire");
        assert.equal(r.method, "full_text", "an embedding failure ranks full-text only");
        assert.equal(calls[0].body.p_embedding, undefined);
      } finally {
        globalThis.fetch = realFetch;
        for (const [k, v] of [["OPENAI_API_KEY", saved.key], ["SUPABASE_URL", saved.url], ["SUPABASE_SERVICE_KEY", saved.skey]]) {
          if (v === undefined) delete process.env[k]; else process.env[k] = v;
        }
      }

      // rankTrim
      const rows = Array.from({ length: 40 }, (_, i) => ({ id: i, text: i === 3 ? "acquisition of procurement analytics vendors" : `filler row number ${i}` }));
      const kept = rankTrim(rows, "who would acquire a procurement analytics company", 400);
      assert.ok(Buffer.byteLength(JSON.stringify(kept)) <= 400, "inside the budget");
      assert.equal(kept[0].id, 3, "the row the question matches comes first");
      assert.equal(kept[1].id, 39, "then the newest");
      assert.equal(rankTrim(rows.slice(0, 2), "q", 10000).length, 2, "control: a read under budget is untouched");
      const week = rankTrim({ since: "s", cycles: rows, decisions: rows }, null, 800);
      assert.equal(week.since, "s", "an object keeps its scalar fields");
      assert.ok(Buffer.byteLength(JSON.stringify(week)) <= 800 && week.cycles.length > 0 && week.decisions.length > 0, "its arrays share the budget");
      assert.ok(Object.values(STRATEGY_TEAM_BYTES).every(n => Number.isInteger(n) && n > 0));
    });

    const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
    const key = process.env.SUPABASE_SERVICE_KEY ?? "";
    const live = Boolean(url && key);
    const env = { ...process.env };
    delete env.OPENAI_API_KEY; // the live arms run full-text only (no embedding key in runner_secrets)
    const svc = { apikey: key, Authorization: `Bearer ${key}` };
    const render = (cap, ask) => {
      const out = path.join(tmp, `${cap}.md`);
      const r = spawnSync(process.execPath, [AGENT, "--render", "--agent=harry", `--capability=${cap}`, ...(ask ? [`--ask=${ask}`] : []), `--out=${out}`, "--json"],
        { encoding: "utf8", env, maxBuffer: 1 << 26, timeout: 240000 });
      assert.equal(r.status, 0, `${cap} renders (got ${r.status}: ${(r.stderr ?? "").slice(-400)})`);
      return { json: JSON.parse(r.stdout.trim().split("\n").pop()), text: fs.readFileSync(out, "utf8") };
    };
    const block = (text, name) => {
      const line = text.split("\n").find(l => l.startsWith(`${name}: `));
      return line ? JSON.parse(line.slice(name.length + 2)) : null;
    };

    await arm("D live renders", async () => {
      if (!live) {
        notRun("AGT-650 arm D (ranked advise render, product block, five renders under 150000)",
          "SUPABASE_URL + SUPABASE_SERVICE_KEY absent -- the Library is unreadable here, so the live half is UNVERIFIED. Arms A-C DID run. Credentialed run: STANDARDS.md Section 2 rule 5");
        return;
      }
      const ASK = "who would acquire a procurement analytics startup";
      const { json, text } = render("strategy-advise", ASK);
      assert.ok(json.prompt_bytes < 150000, `advise prompt_bytes ${json.prompt_bytes} < 150000`);
      const lib = block(text, "library");
      assert.ok(lib && Array.isArray(lib.text), "the render carries a library block");
      assert.equal(lib.ranked_by, "full_text", "the Library was ranked by library_search (full text)");
      const newIds = lib.text.map(t => t.id);
      // The AGT-648 stem scorer's pick, recomputed over the same catalog.
      const wanted = new Set(LIBRARY_SECTIONS["strategy-advise"]);
      const skip = new Set(LIBRARY_TEXT_SKIP_KINDS["strategy-advise"]);
      const askStems = stemsOf(ASK);
      const oldIds = lib.catalog.filter(c => !skip.has(c.kind)
        && ((c.section && wanted.has(c.section)) || overlap(askStems, stemsOf([c.title, c.purpose, c.section, c.kind].join(" "))) >= LIBRARY_MATCH_MIN)).map(c => c.id);
      console.log(`    D old stem-scorer ids (${oldIds.length}): ${oldIds.join(",")}`);
      console.log(`    D new ranked ids (${newIds.length}): ${newIds.join(",")}`);
      const fresh = newIds.filter(id => !oldIds.includes(id));
      assert.ok(fresh.length >= 1, "at least one Library item the stem scorer would not have picked");
      assert.ok(oldIds.length > 0, "control: the old scorer picks something over this catalog, so the difference is real");
      console.log(`    D picked only by the ranked read: ${fresh.join(",")}`);

      const v = await (await fetch(`${url}/rest/v1/dev_version_counter?select=major,minor,patch&limit=1`, { headers: svc })).json();
      const version = `${v[0].major}.${v[0].minor}.${v[0].patch}`;
      const product = block(text, "product");
      assert.ok(product, "the render carries a product block");
      assert.equal(product.version, version, `the product block names the current version ${version}`);
      assert.ok(Array.isArray(product.open_by_need) && product.open_by_need.length <= 25 && Array.isArray(product.shipped_30_days) && product.shipped_30_days.length <= 25);
      for (const t of [...product.open_by_need, ...product.shipped_30_days]) assert.deepEqual(Object.keys(t).sort(), ["backlog_id", "status", "title"], "tickets carry backlog_id, title, status only");
      assert.ok(block(text, "goals"), "the advise render carries a goals block");
      assert.ok(!lib.text.some(t => lib.catalog.find(c => c.id === t.id)?.section === "goals"), "goals items travel once, in the goals block");

      const sizes = [];
      for (const cap of OLD_SLUGS) {
        const r = render(cap, cap === "strategy-advise" ? "test" : null);
        sizes.push(`${cap} ${r.json.prompt_bytes}`);
        assert.ok(r.json.prompt_bytes < 150000, `${cap} prompt_bytes ${r.json.prompt_bytes} < 150000`);
        assert.equal(block(r.text, "product") !== null, cap !== "strategy-library-curate", `${cap} product block`);
      }
      console.log(`    D five renders: ${sizes.join("; ")}`);
    });

    await arm("E live tick", async () => {
      if (!live) {
        notRun("AGT-650 arm E (--tick round trip)", "SUPABASE_URL + SUPABASE_SERVICE_KEY absent -- no rows to tick. Arm B covered planTick offline.");
        return;
      }
      const post = async (table, row) => {
        const r = await fetch(`${url}/rest/v1/${table}`, { method: "POST", headers: { ...svc, "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify(row) });
        assert.ok(r.ok, `insert ${table}: HTTP ${r.status} ${await r.clone().text()}`);
        return (await r.json())[0];
      };
      const patch = async (table, id, body) => {
        const r = await fetch(`${url}/rest/v1/${table}?id=eq.${id}`, { method: "PATCH", headers: { ...svc, "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify(body) });
        assert.ok(r.ok, `patch ${table}: HTTP ${r.status}`);
        return (await r.json())[0];
      };
      const getRow = async (table, id) => (await (await fetch(`${url}/rest/v1/${table}?id=eq.${id}&select=*`, { headers: svc })).json())[0];
      const stamp = new Date().toISOString();
      const catalog = await post("personal_sources", { kind: "document", title: `AGT-650 QA throwaway catalog row ${stamp}`, body: "throwaway", section: "log", sensitivity: "personal_private", origin: "agt-650-qa" });
      const fact = await post("strategy_records", { kind: "fact", title: "AGT-650 QA throwaway fact", body: null, source: "agt-650-qa", session_name: "code-agt-650",
        data: { statement: `AGT-650 QA throwaway fact ${stamp}`, status: "pending", conflicts: [catalog.id], qa: "agt-650" } });
      let libId = null;
      try {
        const r = spawnSync(process.execPath, [AGENT, `--tick=${fact.id}`, "--agent=harry"], { encoding: "utf8", env, timeout: 120000 });
        assert.equal(r.status, 0, `--tick exits 0 (got ${r.status}: ${(r.stderr ?? "").slice(-400)})`);
        const out = JSON.parse(r.stdout.trim().split("\n").pop());
        libId = out.library_ids?.[0] ?? null;
        assert.deepEqual({ confirmed: out.confirmed, superseded: out.superseded, approved: out.approved, dropped: out.dropped }, { confirmed: 1, superseded: 1, approved: 0, dropped: 0 });
        const lib = await getRow("personal_sources", libId);
        assert.equal(lib.kind, "confirmed_fact");
        assert.equal(lib.section, "facts");
        assert.equal(lib.trust, "john_confirmed");
        assert.equal(lib.origin, "harry-tick");
        assert.equal(lib.body, fact.data.statement);
        const old = await getRow("personal_sources", catalog.id);
        assert.equal(old.status, "superseded", "the conflicting catalog row is superseded");
        assert.equal(old.superseded_by, libId, "by the new confirmed fact");
        const f = await getRow("strategy_records", fact.id);
        assert.equal(f.data.status, "confirmed");
        assert.equal(f.data.library_id, libId);
        // A second tick of the same fact is refused (it is no longer pending) and writes nothing.
        const again = spawnSync(process.execPath, [AGENT, `--tick=${fact.id}`, "--agent=harry"], { encoding: "utf8", env, timeout: 120000 });
        assert.equal(again.status, 2, "control: a confirmed fact cannot be ticked again");
        assert.match(again.stderr, /not pending/);
        console.log(`    E tick: fact ${fact.id} -> Library ${libId}; catalog ${catalog.id} superseded`);
      } finally {
        // Clean by marking superseded -- never a DELETE.
        if (libId) await patch("personal_sources", libId, { status: "superseded", superseded_by: catalog.id });
        const c = await getRow("personal_sources", catalog.id);
        if (c?.status !== "superseded") await patch("personal_sources", catalog.id, { status: "superseded" });
        const f = await getRow("strategy_records", fact.id);
        await patch("strategy_records", fact.id, { data: { ...f.data, status: "superseded", qa_cleaned: stamp } });
      }
    });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  if (failures.length) throw new Error(failures.join(" | "));
}

export default run;
selfRun(import.meta.url, run);
