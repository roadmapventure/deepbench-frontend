// DeepBench v7.0.152 | tests/regression/LOG-128-automated-caller-split.js | LOG-128
// FEATURE: LOG-128 — Category A (unit) SEAM PROOF, persisted per SES-009a.
//
// PROOF TYPE: seam proof, labelled as such — it imports the repo's own buildByCaller() and runs it
// against a fixture. It does NOT render the AI Audit screen or read live Supabase.
//
// The rule this locks in: in By Caller, automated traffic that carries no visitor_id must not be
// merged into the org row its address happens to resolve to — but ONLY when the default-off
// `log-128-automated-caller-split` flag is on, and ONLY for the closed regression/script/
// session-test source list. The flag's OFF state must reproduce the pre-LOG-128 grouping exactly.
//
// Why the ON assertion is the discriminating half: with the change absent, buildByCaller() ignores
// a fourth argument, so the ON call returns ONE group where this test requires TWO. The OFF
// assertion alone would pass vacuously against unmodified code — it is here to prove the flag's
// default is a real no-op, not to prove the feature exists.
//
// Placeholder Supabase env only so the module graph loads under plain `node`
// (src/lib/supabase.js falls back to process.env); no network call is made here.

import assert from "assert";
import { selfRun } from "./_lib/self-run.js";

// One masked address, three cookie-less rows: an automated one, a browser one, and a NULL-source
// one. This is the live shape LOG-128 was filed for — measured 2026-08-22, xxx.xx.33.12 held 210
// regression + 2 script + 616 ui rows in a single "AS16591 Google Fiber Inc." bucket.
// ip_org_cache rows are keyed through the same ipKeyOf()/maskIp() path the log rows are, so the
// fixture carries the column that path actually reads (caller_ip_masked) rather than a plausible
// alias — a mis-shaped org row silently yields a masked-address label instead of an org name.
const IP = "203.0.113.0";
const ORG = "AS64496 Example Networks Inc.";
const ORG_ROWS = [{ caller_ip_masked: IP, org: ORG }];

function rows() {
  return [
    { caller_ip_masked: IP, visitor_id: null, call_source: "regression", request_host: "h", model: "claude-sonnet-4-6", cost: 1, ts: "2026-08-01T00:00:00Z" },
    { caller_ip_masked: IP, visitor_id: null, call_source: "ui",         request_host: "h", model: "claude-sonnet-4-6", cost: 2, ts: "2026-08-02T00:00:00Z" },
    { caller_ip_masked: IP, visitor_id: null, call_source: null,         request_host: "h", model: "claude-sonnet-4-6", cost: 4, ts: "2026-08-03T00:00:00Z" },
  ];
}

export default async function run() {
  if (!process.env.VITE_SUPABASE_URL) process.env.VITE_SUPABASE_URL = "http://localhost:54321";
  if (!process.env.VITE_SUPABASE_ANON_KEY) process.env.VITE_SUPABASE_ANON_KEY = "regression-placeholder";
  const { buildByCaller } = await import("../../src/hooks/useAIActivity.js");
  const { AUTOMATED_NOVID_SOURCES } = await import("../../src/lib/callerBuckets.js");

  // ── 1. Flag OFF (opts omitted entirely) — today's behaviour, byte-for-byte ──
  const off = buildByCaller(rows(), [], ORG_ROWS);
  assert.strictEqual(
    off.length, 1,
    "flag OFF: all three cookie-less rows at one address must stay in ONE By Caller group (the pre-LOG-128 grouping)"
  );
  assert.strictEqual(off[0].calls, 3, "flag OFF: the single group counts all three rows");
  assert.ok(Math.abs(off[0].cost - 7) < 1e-9, "flag OFF: the single group sums all three costs");

  // ── 2. Flag ON — the automated row, and only it, splits out ──
  const on = buildByCaller(rows(), [], ORG_ROWS, { splitAutomated: true });
  assert.strictEqual(
    on.length, 2,
    "flag ON: the regression row must form its own bucket, leaving ui + NULL in the original one"
  );

  const automated = on.find(g => / — Automated$/.test(String(g.label)));
  const browser = on.find(g => !/ — Automated$/.test(String(g.label)));
  assert.ok(automated, "flag ON: exactly one group must carry the ' — Automated' label suffix");
  assert.ok(browser, "flag ON: the non-automated group must survive under its original org label");

  assert.strictEqual(
    automated.calls, 1,
    "flag ON: the automated bucket holds ONLY the regression row — a 'ui' or NULL row moving with it is the over-split failure"
  );
  assert.strictEqual(
    browser.calls, 2,
    "flag ON: the 'ui' row and the NULL-call_source row both stay put (NULL is the pre-LOG-121 unknown, never evidence of automation)"
  );
  assert.strictEqual(
    browser.label, ORG,
    "flag ON: the untouched group keeps its resolved org label unchanged"
  );
  assert.strictEqual(
    automated.label, `${ORG} — Automated`,
    "flag ON: the automated bucket is named from the SAME org, so John can see the two halves belong to one address"
  );

  // ── 3. Conservation — a redistribution, never a change to the totals ──
  const onCalls = on.reduce((s, g) => s + g.calls, 0);
  const onCost = on.reduce((s, g) => s + g.cost, 0);
  assert.strictEqual(onCalls, off[0].calls, "flag ON must conserve total calls — the same rows, redistributed");
  assert.ok(Math.abs(onCost - off[0].cost) < 1e-9, "flag ON must conserve total cost — the same rows, redistributed");

  // ── 4. The source list stays closed — NULL and 'ui' are not automation ──
  assert.ok(!AUTOMATED_NOVID_SOURCES.has("ui"), "'ui' must never be treated as automated traffic");
  assert.ok(!AUTOMATED_NOVID_SOURCES.has(null), "a NULL call_source must never be treated as automated traffic");
  for (const s of ["regression", "script", "session-test"]) {
    assert.ok(AUTOMATED_NOVID_SOURCES.has(s), `'${s}' must be in the automated source list`);
  }

  // ── 5. A row with its own visitor_id never moves, whatever its call_source ──
  const withVid = buildByCaller(
    [{ caller_ip_masked: IP, visitor_id: "v-1", call_source: "regression", request_host: "h", model: "claude-sonnet-4-6", cost: 1, ts: "2026-08-01T00:00:00Z" }],
    [], ORG_ROWS, { splitAutomated: true }
  );
  assert.strictEqual(withVid.length, 1, "a row carrying its own visitor id keeps its visitor identity");
  assert.ok(
    !/ — Automated$/.test(String(withVid[0].label)),
    "a row with a visitor id must never be re-keyed into an automated address bucket — it has a real identity already"
  );
}

selfRun(import.meta.url, run);
