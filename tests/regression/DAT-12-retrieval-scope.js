// DeepBench v6.3.228 | tests/regression/DAT-12-retrieval-scope.js | DAT-12
// FEATURE: DAT-12 -- SES-009a persistence. A CHI regression run reads whatever the previous run left
// behind, so two runs are not comparable: every run leaves agent-authored rows in the_library that
// outrank the seed scenarios (measured live 2026-07-29: five near-duplicate copies of one upgrade-cycles
// answer competing for match_count's five slots), and four seed scenarios were legitimately superseded,
// which match_the_library's status='active' filter hides outright. retrieval_scope: 'baseline' reads by
// the is_baseline tag instead. It is a READ scope: nothing is written, reset, or repaired.
//
// Three halves, deliberately separated by what each can prove without credentials:
//
//   A. Structural -- always runs, no network, no credentials. Guards the properties that only source
//      can carry: the scope is threaded at exactly the intended sites, is never defaulted to
//      'baseline' anywhere, and is never read from Skill traits (reading it from traits would apply
//      the scope to live CHI permanently, the exact outcome DAT-12's constraint forbids).
//   B. Live corpus -- real queryLibrary() against the real corpus. Gated on Supabase + OpenAI
//      credentials; announces itself SKIPPED rather than passing quietly, because a green line that
//      proved nothing is the failure mode worth more than the coverage.
//   C. Deployed CHI journey -- two real ~60s LLM journeys against the dev deployment. Gated on the
//      bypass secret AND an explicit DAT12_LIVE_CHI=1 opt-in: STANDARDS.md Section 5 says run each
//      live scenario once, on purpose, and a paid two-minute leg must not fire on every credentialed
//      suite run just because .env.local happens to be loaded.
//
// The discriminator is assertion 2. `fe58cadd-...` is unreachable today by construction, so that
// assertion cannot pass vacuously -- and B1 asserts the row is STILL superseded before relying on it,
// because if a future session "repairs" that row to active, assertion 2 would start passing even if
// this whole feature were reverted.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..");
const read = (...p) => fs.readFileSync(path.join(ROOT, ...p), "utf8");

const TAG = "apple-cso-data-room";
// Scenario -- Elevate Mobility (India): Rapid Expansion. A 2026-07-01 seed row, retired by a
// legitimate agent supersede during a regression run.
const ELEVATE_BASELINE_ID = "fe58cadd-b16b-46dd-a8d3-360bf1550c49";
const QUERY = "What risks should we watch as Elevate Mobility rapidly expands in India?";

const ENDPOINT = "https://deepbench-frontend-git-dev-roadmapventures-projects.vercel.app/api/capabilities/execute";

// The six source sites the scope is allowed to appear at, and nowhere else.
const EXPECTED_SITES = [
  "lib/vector-search.js",
  "lib/librarian.js",
  "lib/search-harness.js",
  "api/prompt/ai-enrichment.js",
  "api/prompt/db-assembly.js",
  "api/capabilities/execute.js",
];

// Exported so a future session can reuse the check rather than re-deriving it.
export function countScopeMentions(source) {
  return (source.match(/retrieval_scope|retrievalScope|p_retrieval_scope/g) || []).length;
}

async function structural() {
  const src = {};
  for (const f of EXPECTED_SITES) src[f] = read(...f.split("/"));

  // A1. Threaded at every one of the six sites -- a missing hop makes the whole chain inert.
  for (const f of EXPECTED_SITES) {
    assert.ok(countScopeMentions(src[f]) > 0,
      `${f} no longer mentions retrieval_scope -- the passthrough chain is broken, and a broken hop fails SILENTLY (the scope is simply ignored and the run reads the unscoped corpus)`);
  }

  // A2. Never defaulted to 'baseline'. Absent is the default, forever: a default would scope live
  //     CHI's own reads, which is the outcome the read-scope design exists to avoid.
  for (const f of EXPECTED_SITES) {
    assert.ok(!/retrieval_?[Ss]cope\s*=\s*["']baseline["']/.test(src[f]),
      `${f} defaults retrieval_scope to 'baseline' -- absent must be the permanent default`);
    assert.ok(!/retrieval_?[Ss]cope\s*\|\|\s*["']baseline["']/.test(src[f]),
      `${f} falls back to 'baseline' -- absent must be the permanent default`);
  }

  // A3. Never read from Skill traits anywhere. This is a request-level value; sourcing it from Skill
  //     data would make the scope permanent for live CHI rather than per-run.
  for (const f of EXPECTED_SITES) {
    assert.ok(!/traits\??\.\s*retrieval_scope/.test(src[f]),
      `${f} reads retrieval_scope off traits -- it is a request-level value, never Skill data`);
  }

  // A4. extraRpcParams is spread LAST in the RPC body, so it can never shadow an existing key.
  const embedAndSearchSrc = src["lib/vector-search.js"].slice(
    src["lib/vector-search.js"].indexOf("export async function embedAndSearch")
  );
  assert.ok(embedAndSearchSrc.length > 0, "embedAndSearch() not found in lib/vector-search.js");
  const body = embedAndSearchSrc.match(/body:\s*JSON\.stringify\(\{[\s\S]*?\}\),/);
  assert.ok(body, "embedAndSearch()'s RPC body literal not found -- lib/vector-search.js changed shape");
  const spreadIdx = body[0].indexOf("...extraRpcParams");
  assert.ok(spreadIdx !== -1, "embedAndSearch() no longer spreads extraRpcParams into the RPC body");
  assert.ok(spreadIdx > body[0].indexOf("[scopeParam]"),
    "...extraRpcParams must be spread AFTER the existing keys -- spread first, it could silently shadow scopeParam or p_tenant_id");
  assert.ok(/extraRpcParams\s*=\s*\{\}/.test(src["lib/vector-search.js"]),
    "extraRpcParams must default to {} -- without the default, every existing caller's RPC body changes shape");

  // A5. the_reasoning and the_library_catalog must NOT receive the scope. the_reasoning has no
  //     is_baseline column at all (verified live: status and data_room_tag only), so the concept is
  //     structurally meaningless there; the catalog is a different query entirely.
  const harness = src["lib/search-harness.js"];
  const libBranch = harness.match(/if \(store === 'the_library'\)[\s\S]*?\n  \}/);
  assert.ok(libBranch, "queryContent()'s the_library branch not found -- lib/search-harness.js changed shape");
  assert.ok(countScopeMentions(libBranch[0]) > 0, "queryContent() must forward retrieval_scope on the the_library branch");
  for (const store of ["the_library_catalog", "the_reasoning"]) {
    const branch = harness.match(new RegExp(`if \\(store === '${store}'\\)[\\s\\S]*?\\n  \\}`));
    assert.ok(branch, `queryContent()'s ${store} branch not found`);
    assert.equal(countScopeMentions(branch[0]), 0,
      `queryContent() must NOT forward retrieval_scope to ${store} -- it has no is_baseline column to honor it`);
  }

  // A6. writeLibrary() is untouched. DAT-12 adds no write path; a retrieval scope leaking into the
  //     write side would mean the read-scope design was misread as a reset.
  const librarian = src["lib/librarian.js"];
  const writeFn = librarian.slice(librarian.indexOf("export async function writeLibrary"));
  assert.ok(writeFn.length > 0, "writeLibrary() not found in lib/librarian.js");
  assert.equal(countScopeMentions(writeFn), 0,
    "retrieval_scope appears inside writeLibrary() -- DAT-12 is a READ scope and adds no write path");

  // A7. The denial tier is defined in exactly one place, and the guard sits ahead of the credential
  //     checks so it is provably reachable with no network at all (assertion B4 below relies on it).
  assert.equal((librarian.match(/denied-unknown-retrieval-scope/g) || []).length, 1,
    "the unknown-scope denial tier must be defined in exactly one place");
  const queryFn = librarian.slice(librarian.indexOf("export async function queryLibrary"));
  assert.ok(
    queryFn.indexOf("denied-unknown-retrieval-scope") < queryFn.indexOf("denied-no-config"),
    "the retrieval_scope guard must be checked BEFORE the config check -- an illegal argument is wrong regardless of environment, and this ordering is what keeps the guard network-free"
  );

  // A8. execute.js keeps AA-83's posture: an explicit named param, never a req.body spread.
  assert.ok(!/\.\.\.\s*req\.body/.test(src["api/capabilities/execute.js"]),
    "execute.js must never spread req.body -- retrieval_scope is an explicit, named public param (AA-83)");

  // A9. No conditional keyed to an agent id or capability slug was introduced alongside the scope
  //     (.claude/rules/capabilities-are-data.md).
  for (const f of ["api/capabilities/execute.js", "api/prompt/db-assembly.js", "api/prompt/ai-enrichment.js"]) {
    for (const line of src[f].split("\n")) {
      if (!countScopeMentions(line)) continue;
      assert.ok(!/(agent_?[Ii]d|capability_slug)\s*===/.test(line),
        `${f} gates retrieval_scope on an identity conditional: ${line.trim()}`);
    }
  }
}

async function liveCorpus() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  const openai = process.env.OPENAI_API_KEY;

  const { queryLibrary } = await import("../../lib/librarian.js");

  // B4 runs unconditionally: the guard short-circuits before any credential or network use, which is
  // the property being asserted. `usage` absent proves no embedding ran -- a returned shape alone
  // would be a vacuous pass.
  const typo = await queryLibrary({
    requestingAgentId: "eleanor", queryText: QUERY, tenantId: "global",
    matchCount: 40, data_room_tag: TAG, retrieval_scope: "baseline_typo",
  });
  assert.equal(typo._librarian?.tier, "denied-unknown-retrieval-scope",
    `an unknown retrieval_scope must be denied, got tier=${typo._librarian?.tier}`);
  assert.equal(typo.matchCount, 0, "a denied scope must return no matches");
  assert.equal(typo.usage, undefined,
    "the guard must SHORT-CIRCUIT -- a `usage` object means an embedding call was made before the check fired");

  if (!url || !key || !openai) {
    console.log("  [DAT-12] live-corpus half SKIPPED -- no SUPABASE_URL / SUPABASE_SERVICE_KEY / " +
      "OPENAI_API_KEY in env (run with `node --env-file=.env.local tests/regression/run-all.js` to " +
      "include it). The structural half and the typo-guard short-circuit above DID run.");
    return;
  }

  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const res = await fetch(
    `${url}/rest/v1/the_library?data_room_tag=eq.${TAG}&is_baseline=eq.true&select=id,status`,
    { headers }
  );
  assert.ok(res.ok, `the_library baseline read failed: HTTP ${res.status}`);
  const baselineRows = await res.json();
  const baselineIds = new Set(baselineRows.map(r => r.id));
  assert.ok(baselineIds.size > 0, "no is_baseline rows found -- the seed corpus is gone");

  // B1. The discriminator's precondition. If this row is ever restored to 'active', assertion B3
  //     stops discriminating and would pass against a full revert of this feature.
  const elevate = baselineRows.find(r => r.id === ELEVATE_BASELINE_ID);
  assert.ok(elevate, `${ELEVATE_BASELINE_ID} (Elevate Mobility seed scenario) is no longer an is_baseline row`);
  assert.equal(elevate.status, "superseded",
    `${ELEVATE_BASELINE_ID} is now status='${elevate.status}', not 'superseded'. This test's discriminating ` +
    `power depended on that row being invisible to unscoped retrieval. Re-establish a superseded ` +
    `baseline row to assert against, or this assertion is vacuous -- do NOT simply relax it.`);

  const common = { requestingAgentId: "eleanor", queryText: QUERY, tenantId: "global", matchCount: 40, data_room_tag: TAG };

  // B2. Unscoped retrieval is unchanged: it still reaches non-baseline rows and still cannot see any
  //     superseded baseline row. This is the absent-parameter guarantee.
  const unscoped = await queryLibrary({ ...common });
  assert.equal(unscoped._librarian?.granted, true, "unscoped retrieval must still be granted");
  const unscopedIds = (unscoped.chunks || []).map(c => c.id);
  assert.ok(unscopedIds.length > 0, "unscoped retrieval returned nothing -- retrieval itself is broken");
  assert.ok(unscopedIds.some(id => !baselineIds.has(id)),
    "unscoped retrieval no longer returns any non-baseline row -- the absent-parameter path changed behavior, which is the one thing this change must never do");
  const supersededBaseline = new Set(baselineRows.filter(r => r.status !== "active").map(r => r.id));
  for (const id of unscopedIds) {
    assert.ok(!supersededBaseline.has(id),
      `unscoped retrieval returned ${id}, a non-active baseline row -- status='active' is no longer being honored on the default path`);
  }

  // B3. THE DISCRIMINATOR. Scoped retrieval reads by tag, so it reaches the superseded seed scenario
  //     and returns nothing outside the seed corpus.
  const scoped = await queryLibrary({ ...common, retrieval_scope: "baseline" });
  assert.equal(scoped._librarian?.granted, true, "scoped retrieval must be granted");
  const scopedIds = (scoped.chunks || []).map(c => c.id);
  assert.ok(scopedIds.includes(ELEVATE_BASELINE_ID),
    `retrieval_scope:'baseline' must reach ${ELEVATE_BASELINE_ID} (superseded seed scenario, unreachable today by construction); got ${JSON.stringify(scopedIds)}`);
  for (const id of scopedIds) {
    assert.ok(baselineIds.has(id),
      `retrieval_scope:'baseline' returned ${id}, which is not an is_baseline row -- the scope is not actually scoping`);
  }

  // B5. The two scopes really do differ on this corpus. Without this, B2 and B3 could both pass on a
  //     corpus where every row happened to be baseline, and the session would have proven nothing.
  assert.notDeepEqual(scopedIds, unscopedIds,
    "scoped and unscoped retrieval returned identical ids -- the scope had no observable effect");
}

async function liveChi() {
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (!secret || process.env.DAT12_LIVE_CHI !== "1") {
    console.log("  [DAT-12] deployed-CHI half SKIPPED -- set DAT12_LIVE_CHI=1 (with " +
      "VERCEL_AUTOMATION_BYPASS_SECRET in env) to run it. Two real ~60s LLM journeys and real spend; " +
      "opt-in by design per STANDARDS.md Section 5.");
    return;
  }
  const hdrs = { "Content-Type": "application/json", "x-vercel-protection-bypass": secret };

  async function journey(extra) {
    let body = await (await fetch(ENDPOINT, {
      method: "POST", headers: hdrs,
      body: JSON.stringify({
        capability_slug: "channel-intelligence",
        intent_slug: "ci-answer-intent",
        agent_id: "marcus",
        task_context: { goal: QUERY },
        tenant_id: "global",
        stream: false,
        ...extra,
      }),
    })).json();
    let continues = 0;
    while (body && body.status === "in_progress") {
      if (!body.recovery && ++continues > 10) throw new Error("continue loop exceeded cap (10)");
      body = await (await fetch(ENDPOINT, {
        method: "POST", headers: hdrs,
        body: JSON.stringify({ action: "continue", job_id: body.job_id, stream: false }),
      })).json();
    }
    if (body?.error) throw new Error(`execute failed: ${body.error}`);
    const content = body?.content || body || {};
    return { content, raw: JSON.stringify(content) };
  }

  // C4. Absent parameter: the journey still succeeds, and does not cite the baseline Elevate row.
  const plain = await journey({});
  assert.ok(plain.raw.length > 0, "unscoped CHI journey produced no content");
  assert.ok(!plain.raw.includes(ELEVATE_BASELINE_ID),
    "unscoped CHI answer cites the superseded baseline Elevate row -- status='active' is not being honored end to end");

  // C5. Scoped: the same journey reaches the seed scenario.
  const scoped = await journey({ retrieval_scope: "baseline" });
  assert.ok(scoped.raw.includes(ELEVATE_BASELINE_ID),
    `scoped CHI answer must cite ${ELEVATE_BASELINE_ID}; the scope did not reach the retrieval layer through the deployed harness`);
}

export default async function run() {
  await structural();
  await liveCorpus();
  await liveChi();
}

selfRun(import.meta.url, run);
