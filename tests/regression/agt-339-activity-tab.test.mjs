// DeepBench v7.0.758 | tests/regression/agt-339-activity-tab.test.mjs | AGT-339 -- the view behind
// a private agent's Activity tab. Pure: no network, no model, no esbuild.
//
// Each arm discriminates a wrong build: counting connections by agent_id gives 1 not 2; counting
// every mcp row gives 3; UTC dates give 1 day not 2 (the two connections straddle midnight Central);
// no price fallback gives $0.0000; and the masked address must never reach the view.

import assert from "node:assert/strict";
import { selfRun } from "./_lib/self-run.js";
import { ACTIVITY_COLUMNS, activityView, formatCentral } from "../../src/lib/personnelActivity.js";

const A = { agent_id: "priv", call_source: "mcp", call_facts: { target_agent_id: "priv" }, latency_ms: null,
  created_at: "2026-10-04T04:30:00Z", caller_ip_masked: "xxx.xx.1.1" };
const B = { agent_id: "dan", call_source: "mcp", latency_ms: 400, created_at: "2026-10-04T05:30:00Z", caller_ip_masked: "xxx.xx.2.2",
  call_facts: { target_agent_id: "priv", knowledge_entries: 3, role_prompts: 1, guardrails: 2, sections: 4, library_tier: "denied-no-access" } };
const D = { agent_id: "dan", call_source: "mcp", call_facts: { target_agent_id: "other" }, latency_ms: 900,
  created_at: "2026-10-02T15:00:00Z", caller_ip_masked: "xxx.xx.3.3" };
const E = { agent_id: "priv", call_source: "ui", model: "text-embedding-3-small", input_tokens: 7, output_tokens: 0,
  cost_usd: 0, patterns_used: ["rag", "embeddings"], created_at: "2026-10-03T16:00:00Z" };
const F = { agent_id: "priv", call_source: "ui", model: "claude-sonnet-4-6", input_tokens: 3092, output_tokens: 344,
  cost_usd: null, created_at: "2026-10-03T16:01:00Z" };

const orgs = [{ caller_ip_masked: "xxx.xx.2.2", org: "AS396982 Google LLC", city: "Columbus", region: "Ohio" }];
const entries = [
  { status: "active", createdAt: "2026-10-03T16:00:00Z" },
  { status: "active", createdAt: "2026-10-03T16:05:00Z" },
  { status: "disabled", createdAt: "2026-10-03T17:00:00Z" },
];

const values = card => card.rows.map(r => r[1]);
const keys = card => card.rows.map(r => r[0]);

export default async function run() {
  const view = activityView({ agentId: "priv", rows: [B, A, F, E, D], orgs, entries });
  assert.equal(view.empty, false, "two connections -> not empty");
  assert.deepEqual(view.cards.map(c => c.title), ["Connections", "Connected from", "Knowledge delivered", "Training"]);
  const [c1, c2, c3, c4] = view.cards;

  // Card 1 -- Connections, Days active, Average response time, First connection.
  assert.deepEqual(values(c1).slice(0, 4), ["2", "2", "400 ms", "Oct 3, 2026, 11:30 PM CT"]);

  // Card 2 -- network groups, the named one (latest) first; the AS number dropped.
  assert.deepEqual(keys(c2), ["Google LLC · Columbus, Ohio", "Unknown network"]);

  // Card 3 -- the newest connection's facts; a denied tier reads "No access".
  assert.deepEqual(values(c3), ["3", "1", "2", "4", "No access"]);

  // Card 4 -- Lessons taught, (Last taught skipped), Model calls, Tokens, Cost; then the note.
  assert.deepEqual(keys(c4), ["Lessons taught", "Last taught", "Model calls", "Tokens", "Cost"]);
  const v4 = values(c4);
  assert.deepEqual([v4[0], v4[2], v4[3], v4[4]], ["2", "2", "3,443", "$0.0144"]);
  // Last taught -- the latest ACTIVE lesson, in the screen-mapped shape (PersonnelScreen.jsx maps the
  // API's created_at to createdAt). The disabled entry is the newest of the three, so a build that
  // ignores status reads 12:00 PM instead.
  assert.equal(v4[1], formatCentral("2026-10-03T16:05:00Z"), "Last taught is the latest active lesson");
  assert.equal(v4[1], "Oct 3, 2026, 11:05 AM CT");
  assert.equal(c4.note, "AI patterns used in DeepBench: RAG, Embeddings (1 call)");

  // No address, masked or otherwise, reaches the view.
  assert.equal(JSON.stringify(view).includes("xxx."), false, "the view carries no address");

  // No connection for this agent -> empty.
  const none = activityView({ agentId: "priv", rows: [D, E, F], orgs, entries });
  assert.equal(none.empty, true, "rows [D,E,F] hold no connection for priv");

  // The read never asks for the raw address column.
  assert.equal(ACTIVITY_COLUMNS.split(",").includes("caller_ip"), false, "ACTIVITY_COLUMNS lacks caller_ip");
}

selfRun(import.meta.url, run);
