// DeepBench v6.3.218 | tests/regression/LOG-112-drawer-pattern-source.js | LOG-112
// FEATURE: LOG-112 — Category M (cross-reference consistency), persisted per SES-009a.
//
// The rule this locks in (.claude/rules/ai-pattern-signature.md, ARCHITECTURE.md §19k/§19l):
// NO pattern display reads the frozen legacy `patterns_used` field. A pattern NAME is derived
// at read time only, by the Log Displayer — and the CHI Agents drawer now takes its per-agent
// sub-row names from exactly that source (ai_pattern_classification_rollup.log_ids, joined in
// memory by buildAgentPatternRows()), the same read-time classification the Agent Routing
// drawer already reads through lib/tracePatterns.js.
//
// Before LOG-112 the drawer was the last display still on the retired field, and it showed:
// Eleanor Voss — The Librarian, headline `1,801 CALLS`, sub-row `Rag — 1.5s avg (3,450 calls)`.
// A sub-item larger than its own total, labelled with a humanized legacy slug.
//
// Asserts:
//   1. No file under src/screens or src/components references `patterns_used` in CODE
//      (comments stripped, same approach LOG-36-pattern-display-sources.js uses). This is
//      the anti-regression heart of the test.
//   2. buildActivitySummary() emits no `byPattern` on any agent, and does emit `rows` with
//      one {id, latencyMs} entry per INCLUDED row.
//   3. A row classifyRow() excludes as a paired duplicate wrapper half is absent from `rows`
//      (MI-72a's `include` guarantee, preserved by keeping the push inside that region).
//   4. buildAgentPatternRows() returns {} when nothing is verified — an agent with no gold
//      match gets no rows at all, never a zero-count bucket (§19l honest unclassified).
//   5. A row carrying two verified names counts once in each; a mapped row with no latency
//      contributes `calls` but leaves `avgLatency` null.
//   6. The keys are exactly the names the map supplied — no slug, no humanization, no
//      vocabulary lookup anywhere on this path.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const SCAN_ROOTS = ["src/components", "src/screens"];

function listFiles(dir) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap(d =>
    d.isDirectory()
      ? listFiles(path.join(dir, d.name))
      : (/\.(js|jsx)$/.test(d.name) ? [path.join(dir, d.name)] : [])
  );
}

// Strips block comments, JSX comments and line comments so a *description* of patterns_used
// in a header comment (there are many — LOG-79, MI-67, this session's own) never trips the
// scan; only real code does.
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ \t]*\/\/.*$/gm, "")
    .replace(/([^:])\/\/.*$/gm, "$1");
}

export default async function run() {
  // ── 1. No display file READS the frozen legacy field ──
  const files = SCAN_ROOTS.flatMap(listFiles);
  assert.ok(files.length > 0, "scan found no source files — check SCAN_ROOTS");

  const offenders = [];
  for (const rel of files) {
    const relPosix = rel.replace(/\\/g, "/");
    const code = stripComments(fs.readFileSync(path.join(ROOT, rel), "utf8"));
    for (const rawLine of code.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (line.includes("patterns_used")) offenders.push(`${relPosix}: ${line}`);
    }
  }
  assert.strictEqual(
    offenders.length, 0,
    "patterns_used is frozen legacy and must never be read by a display " +
    "(.claude/rules/ai-pattern-signature.md — pattern names are derived at read time only). " +
    "Offending lines:\n  " + offenders.join("\n  ")
  );

  // Placeholder Supabase env only so the module graph loads under plain `node`
  // (src/lib/supabase.js falls back to process.env); no network call is made here.
  if (!process.env.VITE_SUPABASE_URL) process.env.VITE_SUPABASE_URL = "http://localhost:54321";
  if (!process.env.VITE_SUPABASE_ANON_KEY) process.env.VITE_SUPABASE_ANON_KEY = "regression-placeholder";
  const { buildActivitySummary, buildAgentPatternRows } = await import("../../src/hooks/useAIActivity.js");

  // The real implementation, never a reimplementation. Pre-PAIR_LEGACY_CUTOFF_MS timestamps so
  // the AI-51 wrapper/agent-turn pairing heuristic is in force for assertion 3.
  const M = "claude-haiku-4-5-20251001";
  const T0 = Date.parse("2026-07-10T12:00:00Z");
  const at = ms => new Date(T0 + ms).toISOString();
  const rows = [
    // patterns_used is deliberately POPULATED on every row below and must influence nothing.
    { id: 1, agent_id: "eleanor", ai_type: "librarian",  feature: "librarian", model: null, created_at: at(0),  latency_ms: 12,  cost_usd: null, patterns_used: ["rag"] },
    { id: 3, agent_id: "eleanor", ai_type: "agent-turn", feature: "data-room-custody:library-catalog-intent:depth1", model: M, created_at: at(9e5), latency_ms: 800, cost_usd: 0.02, patterns_used: ["rag"] },
    // a terminal turn logged twice — capability wrapper + agent-turn within PAIR_WINDOW_MS
    { id: 4, agent_id: "marcus", ai_type: "channel-intelligence", feature: "request-receivable",     model: M, created_at: at(0),   latency_ms: 900, cost_usd: 0.05, patterns_used: ["rag"] },
    { id: 5, agent_id: "marcus", ai_type: "agent-turn",           feature: "channel-intelligence:a", model: M, created_at: at(500), latency_ms: 900, cost_usd: 0.05, patterns_used: ["rag"] },
  ];
  const turns = new Map();
  for (const r of rows) {
    if (r.ai_type !== "agent-turn") continue;
    if (!turns.has(r.agent_id)) turns.set(r.agent_id, []);
    turns.get(r.agent_id).push(new Date(r.created_at).getTime());
  }
  const summary = buildActivitySummary(rows, turns);

  // ── 2. No byPattern bucket survives; `rows` carries row identity instead ──
  for (const [agentId, d] of Object.entries(summary)) {
    assert.strictEqual(
      d.byPattern, undefined,
      `${agentId} still carries a byPattern bucket — buildActivitySummary() must not derive ` +
      "patterns from the log's frozen patterns_used field"
    );
  }
  assert.strictEqual(summary.eleanor.rows.length, 2, "one `rows` entry per included row");
  assert.deepStrictEqual(
    Object.keys(summary.eleanor.rows[0]).sort(), ["id", "latencyMs"],
    "a `rows` entry carries row identity + latency only — no pattern content"
  );

  // ── 3. The MI-72a `include` guarantee survives the move ──
  assert.strictEqual(
    summary.marcus.rows.length, 1,
    "the paired duplicate wrapper half must be excluded from `rows`, exactly as it is from byKind"
  );
  assert.strictEqual(summary.marcus.rows[0].id, 5, "the agent-turn is the half that is kept");

  // ── 4. Nothing verified -> no rows at all, never a zero-count bucket ──
  assert.deepStrictEqual(
    buildAgentPatternRows(summary.eleanor.rows, new Map()), {},
    "an agent whose rows matched no gold pattern gets NO rows — never an empty/zero bucket (§19l)"
  );
  assert.deepStrictEqual(buildAgentPatternRows([], new Map()), {}, "empty inputs yield no rows");
  assert.deepStrictEqual(buildAgentPatternRows(undefined, undefined), {}, "missing inputs are safe");

  // ── 5. Multi-name rows count once in each; a latency-less row still counts as a call ──
  const namesByLogId = new Map([
    [3, ["Retrieval-Augmented Generation"]],
    [5, ["Request Routing", "Output Guardrails"]],
  ]);
  const marcus = buildAgentPatternRows(summary.marcus.rows, namesByLogId);
  assert.strictEqual(Object.keys(marcus).length, 2, "one row carrying two verified names lands in both");
  assert.strictEqual(marcus["Request Routing"].calls, 1, "counted once in the first pattern");
  assert.strictEqual(marcus["Output Guardrails"].calls, 1, "counted once in the second pattern");

  const noLatency = buildAgentPatternRows(
    [{ id: 9, latencyMs: null }],
    new Map([[9, ["Agent Handoff"]]])
  );
  assert.strictEqual(noLatency["Agent Handoff"].calls, 1, "a latency-less row still counts as a call");
  assert.strictEqual(noLatency["Agent Handoff"].avgLatency, null, "…and leaves avgLatency null, never 0");

  // ── 6. Keys are exactly the supplied names — no slug, no humanization, no vocabulary ──
  const eleanor = buildAgentPatternRows(summary.eleanor.rows, namesByLogId);
  assert.deepStrictEqual(
    Object.keys(eleanor), ["Retrieval-Augmented Generation"],
    "the key is the Displayer's own governed pattern_name, verbatim"
  );
  assert.strictEqual(
    eleanor["Retrieval-Augmented Generation"].avgLatency, 800,
    "only the mapped (verified) row contributes latency — the deterministic read does not"
  );
  for (const legacy of ["rag", "Rag", "RAG"]) {
    assert.strictEqual(
      Object.prototype.hasOwnProperty.call(eleanor, legacy), false,
      `a bucket named "${legacy}" means the legacy patterns_used slug leaked back onto this surface`
    );
  }
}

selfRun(import.meta.url, run);
