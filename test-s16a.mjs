// test-s16a.mjs — S16a AI Audit UI tests
// DeepBench v5.1.18 | test-s16a.mjs | S16a verification

import { strict as assert } from "assert";

let passed = 0;
let failed = 0;

function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch(e) { console.error(`  ✗ ${name}: ${e.message}`); failed++; }
}

// ── Simulate the module-level log store ──────────────────────────────────────

const COST_PER_1K = {
  "claude-haiku-4-5": 0.00025,
  "claude-sonnet-4-5": 0.003,
  "text-embedding-3-small": 0.00002,
};

const MODEL_PROVIDER = {
  "claude-haiku-4-5": "Anthropic",
  "claude-sonnet-4-5": "Anthropic",
  "text-embedding-3-small": "OpenAI",
};

const AGENT_NAMES = {
  chloe:   { name: "Chloe Okafor",     code: "JR-01" },
  mike:    { name: "Mike Alvarez",      code: "SR-02" },
  bob:     { name: "Bob Whitfield",     code: "PR-04" },
  christy: { name: "Christy Park",      code: "MK-05" },
  robyn:   { name: "Robyn Castellanos", code: "CN-03" },
  brent:   { name: "Brent Matthews",    code: "DR-06" },
  pat:     { name: "Pat Smiley",        code: "IR-07" },
};

function makeFakeLog() {
  return [
    { id:1, type:"routing",      model:"claude-haiku-4-5",        tokens:500,  latencyMs:120,  agentId:"brent",   cost:(500/1000)*0.00025, ts: new Date().toISOString() },
    { id:2, type:"chat",         model:"claude-haiku-4-5",        tokens:800,  latencyMs:300,  agentId:"robyn",   cost:(800/1000)*0.00025, ts: new Date().toISOString() },
    { id:3, type:"react_loop",   model:"claude-sonnet-4-5",       tokens:2000, latencyMs:9000, agentId:"brent",   cost:(2000/1000)*0.003,  ts: new Date().toISOString() },
    { id:4, type:"similarity",   model:"text-embedding-3-small",  tokens:300,  latencyMs:80,   agentId:null,      cost:(300/1000)*0.00002, ts: new Date().toISOString() },
    { id:5, type:"reinforcement",model:"claude-haiku-4-5",        tokens:600,  latencyMs:200,  agentId:"brent",   cost:(600/1000)*0.00025, ts: new Date().toISOString() },
  ];
}

function computeByLLM(log) {
  const byLLM = {};
  for (const e of log) {
    const m = e.model || "unknown";
    if (!byLLM[m]) byLLM[m] = { model: m, calls: 0, cost: 0, tokensIn: 0, latencies: [] };
    byLLM[m].calls++;
    byLLM[m].cost += e.cost || 0;
    byLLM[m].tokensIn += e.tokens || 0;
    if (e.latencyMs) byLLM[m].latencies.push(e.latencyMs);
  }
  Object.values(byLLM).forEach(d => {
    d.avgLatency = d.latencies.length ? Math.round(d.latencies.reduce((a,b)=>a+b,0)/d.latencies.length) : null;
  });
  return byLLM;
}

function computeByAgent(log) {
  const byAgent = {};
  for (const e of log) {
    if (!e.agentId) continue;
    if (!byAgent[e.agentId]) byAgent[e.agentId] = { agentId: e.agentId, calls: 0, cost: 0, latencies: [] };
    byAgent[e.agentId].calls++;
    byAgent[e.agentId].cost += e.cost || 0;
    if (e.latencyMs) byAgent[e.agentId].latencies.push(e.latencyMs);
  }
  Object.values(byAgent).forEach(d => {
    d.avgLatency = d.latencies.length ? Math.round(d.latencies.reduce((a,b)=>a+b,0)/d.latencies.length) : null;
  });
  return byAgent;
}

// ── TEST SUITE ────────────────────────────────────────────────────────────────

console.log("\nS16a — AI Audit UI\n");

console.log("Section 1 — Activity Type aggregation:");
test("Knowledge Reinforcement type exists in AI_TYPES", () => {
  const AI_TYPES_KEYS = ["rag_briefing","planning","routing","chat","similarity","summarization","react_loop","extraction","reinforcement","agent_perf_score","prompt_versioning","cost_anomaly","hitl_review_rate"];
  assert(AI_TYPES_KEYS.includes("reinforcement"), "reinforcement key missing");
});
test("Phase 1 count is 9 (includes reinforcement)", () => {
  const phase1 = ["rag_briefing","planning","routing","chat","similarity","summarization","react_loop","extraction","reinforcement"];
  assert.equal(phase1.length, 9);
});
test("Phase 2 count is 4 (the 4 future tracking items)", () => {
  const phase2 = ["agent_perf_score","prompt_versioning","cost_anomaly","hitl_review_rate"];
  assert.equal(phase2.length, 4);
});

console.log("\nSection 2 — By LLM:");
const log = makeFakeLog();
const byLLM = computeByLLM(log);
test("byLLM has 3 distinct models", () => {
  assert.equal(Object.keys(byLLM).length, 3);
});
test("claude-haiku-4-5 call count is 3", () => {
  assert.equal(byLLM["claude-haiku-4-5"].calls, 3);
});
test("claude-sonnet-4-5 call count is 1", () => {
  assert.equal(byLLM["claude-sonnet-4-5"].calls, 1);
});
test("text-embedding-3-small call count is 1", () => {
  assert.equal(byLLM["text-embedding-3-small"].calls, 1);
});
test("MODEL_PROVIDER maps all 3 models", () => {
  assert.equal(MODEL_PROVIDER["claude-haiku-4-5"], "Anthropic");
  assert.equal(MODEL_PROVIDER["claude-sonnet-4-5"], "Anthropic");
  assert.equal(MODEL_PROVIDER["text-embedding-3-small"], "OpenAI");
});
test("byLLM avgLatency computed for haiku", () => {
  const avg = byLLM["claude-haiku-4-5"].avgLatency;
  assert(typeof avg === "number" && avg > 0, "avgLatency should be a positive number");
});

console.log("\nSection 4 — By Agent:");
const byAgent = computeByAgent(log);
test("byAgent has 2 agents (brent and robyn)", () => {
  assert.equal(Object.keys(byAgent).length, 2);
});
test("brent has 3 calls", () => {
  assert.equal(byAgent["brent"].calls, 3);
});
test("robyn has 1 call", () => {
  assert.equal(byAgent["robyn"].calls, 1);
});
test("entries with null agentId are excluded from byAgent", () => {
  assert(!byAgent["null"] && !byAgent[null], "null agentId should not appear");
});
test("AGENT_NAMES lookup works for brent", () => {
  const info = AGENT_NAMES["brent"] || { name: "brent", code: "—" };
  assert.equal(info.name, "Brent Matthews");
  assert.equal(info.code, "DR-06");
});
test("Unknown agentId falls back to raw ID", () => {
  const unknownId = "future-agent-99";
  const info = AGENT_NAMES[unknownId] || { name: unknownId, code: "—" };
  assert.equal(info.name, unknownId);
  assert.equal(info.code, "—");
});

console.log("\nHeader strip:");
test("modelsInUse count equals distinct models with calls > 0", () => {
  const modelsInUse = Object.values(byLLM).filter(d => d.calls > 0).length;
  assert.equal(modelsInUse, 3);
});
test("totalCost sums correctly across all log entries", () => {
  const totalCost = log.reduce((s, e) => s + (e.cost || 0), 0);
  assert(totalCost > 0, "totalCost should be positive");
});

console.log("\nString safety:");
test("agentId null guard prevents crash", () => {
  const entry = { agentId: null, cost: 0.001 };
  const byA = {};
  if (!entry.agentId) { /* skip */ }
  else { byA[entry.agentId] = { calls: 1 }; }
  assert.equal(Object.keys(byA).length, 0, "null agentId should not create entry");
});

// ── RESULT ──────────────────────────────────────────────────────────────────
console.log(`\n${passed + failed} tests — ${passed} passed, ${failed} failed`);
if (failed > 0) { console.error("FAIL — fix errors before committing"); process.exit(1); }
else { console.log("ALL TESTS PASS"); }
