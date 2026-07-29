// DeepBench v6.3.208 | tests/regression/LOG-83-resolve-agent-role.js | LOG-83
// FEATURE: LOG-83 — Category A (unit), persisted per SES-009a.
//
// The rule this locks in: the AI Audit "By Agent" list resolves an agent's HUMAN ROLE
// TITLE (from src/data/agents.js), not an internal code, for its second line. resolveAgent
// was extracted to src/components/resolveAgent.js (a sibling with no JSX) precisely so this
// test can import it under plain `node` without parsing AIActivityPanel.jsx's React/JSX.
//
// Asserts:
//   1. A real agent id resolves to name + role (marcus -> Marcus Webb / GEO CSO Expert).
//   2. A bare code still resolves by code, and now carries the role (PP-01 -> Michelle /
//      Project Manager).
//   3. An unknown id returns a DEFINED role (the '—' fallback), never undefined.

import assert from "assert";
import { resolveAgent } from "../../src/components/resolveAgent.js";
import { selfRun } from "./_lib/self-run.js";

export default async function run() {
  // ── 1. Real id -> name + real role, not a code ──
  const marcus = resolveAgent("marcus");
  assert.strictEqual(marcus.name, "Marcus Webb", "marcus resolves to Marcus Webb");
  assert.strictEqual(marcus.role, "GEO CSO Expert", "marcus carries his real role title, not a code");

  // ── 2. Bare code still resolves (Michelle's PP-01) and now carries role ──
  const michelle = resolveAgent("PP-01");
  assert.strictEqual(michelle.name, "Michelle Manning", "PP-01 resolves by code to Michelle Manning");
  assert.strictEqual(michelle.role, "Project Manager", "PP-01 carries Michelle's role title");

  // ── 3. Unknown id -> defined role fallback, never undefined ──
  const unknown = resolveAgent("nope");
  assert.notStrictEqual(unknown.role, undefined, "an unknown id must still return a defined role");
  assert.strictEqual(unknown.role, "—", "an unknown id's role falls back to the em-dash placeholder");
}

selfRun(import.meta.url, run);
