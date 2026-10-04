// DeepBench v7.0.769 | tests/regression/agt-350-activity-type.test.mjs | AGT-350 -- the Activity
// tab's Connected from card as a four-column table: Network, Type, Count, Last. Pure: no network,
// no model, no esbuild.
//
// Each arm discriminates a wrong build: substring or prefix matching types the "Google LLC Guest
// Network" row "AI tool server"; lower-casing types "google llc" "AI tool server"; a time-only Last
// fails the two-day arm; a kept note fails the `"note" in card` arm.

import assert from "node:assert/strict";
import { selfRun } from "./_lib/self-run.js";
import { DATA_CENTRE_OWNERS, networkType, formatCentralShort, activityView } from "../../src/lib/personnelActivity.js";

const row = (created_at, caller_ip_masked) => ({
  agent_id: "dan", call_source: "mcp", call_facts: { target_agent_id: "priv" }, created_at, caller_ip_masked,
});
const g1 = row("2026-10-03T19:44:00Z", "xxx.xx.0.1");
const g2 = row("2026-10-03T17:00:00Z", "xxx.xx.0.1");
const f = row("2026-10-03T20:26:00Z", "xxx.xx.0.2");
const t = row("2026-10-03T18:30:00Z", "xxx.xx.0.3");
const m = row("2026-10-03T17:56:00Z", "xxx.xx.0.4");
const u = row("2026-10-03T15:00:00Z", "xxx.xx.0.5");
const late = row("2026-10-04T05:30:00Z", "xxx.xx.0.1");

const orgs = [
  { caller_ip_masked: "xxx.xx.0.1", org: "AS396982 Google LLC", city: "Columbus", region: "Ohio" },
  { caller_ip_masked: "xxx.xx.0.2", org: "AS16591 Google Fiber Inc.", city: "Austin", region: "Texas" },
  { caller_ip_masked: "xxx.xx.0.3", org: "AS64500 Google LLC Guest Network", city: "Dallas", region: "Texas" },
  { caller_ip_masked: "xxx.xx.0.4", org: "AS8075 Microsoft Corporation", city: "Des Moines", region: "Iowa" },
];

export default async function run() {
  // One Central day: Last is the time alone.
  const view = activityView({ agentId: "priv", rows: [g1, g2, f, t, m, u], orgs });
  const card = view.cards[1];
  assert.equal(card.title, "Connected from");
  assert.deepEqual(card.columns, ["Network", "Type", "Count", "Last"]);
  assert.equal("note" in card, false, "the Connected from card carries no note");
  assert.deepEqual(card.rows, [
    ["Google LLC · Columbus, Ohio", "AI tool server", "2", "2:44 PM"],
    ["Google Fiber Inc. · Austin, Texas", "Home or office", "1", "3:26 PM"],
    ["Google LLC Guest Network · Dallas, Texas", "Home or office", "1", "1:30 PM"],
    ["Microsoft Corporation · Des Moines, Iowa", "AI tool server", "1", "12:56 PM"],
    ["Unknown network", "—", "1", "10:00 AM"],
  ]);

  // Two Central days: every row's Last carries its date.
  const two = activityView({ agentId: "priv", rows: [g1, g2, f, t, m, u, late], orgs });
  const rows2 = two.cards[1].rows;
  assert.deepEqual(rows2[0], ["Google LLC · Columbus, Ohio", "AI tool server", "3", "Oct 4, 12:30 AM"]);
  assert.equal(rows2[1][3], "Oct 3, 3:26 PM");

  // No address and no retired note reaches either view.
  for (const v of [view, two]) {
    const json = JSON.stringify(v);
    assert.equal(json.includes("xxx."), false, "the view carries no address");
    assert.equal(json.includes("not the person's location"), false, "the retired note is gone");
  }

  // Type is exact, case-sensitive list membership.
  assert.equal(networkType("google llc"), "Home or office");
  assert.equal(networkType(null), "—");
  assert.deepEqual(DATA_CENTRE_OWNERS, [
    "Akamai Technologies, Inc.", "Amazon.com, Inc.", "Cloudflare, Inc.", "Fastly, Inc.",
    "Google LLC", "Iron Mountain Data Center", "Microsoft Corporation",
  ]);

  // The short stamp itself, both forms.
  assert.equal(formatCentralShort("2026-10-03T19:44:00Z"), "2:44 PM");
  assert.equal(formatCentralShort("2026-10-03T19:44:00Z", true), "Oct 3, 2:44 PM");

  // No rows -> the card's honest empty state.
  const none = activityView({ agentId: "priv", rows: [], orgs });
  assert.deepEqual(none.cards[1].rows, []);
  assert.equal(none.cards[1].emptyText, "No connections yet");
}

selfRun(import.meta.url, run);
