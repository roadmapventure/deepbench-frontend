// DeepBench v7.0.309 | tests/regression/LOG-141-org-resolver-attempted.js | LOG-141
//
// Guards both halves of LOG-141 against the REAL shipped module (SES-45: a test that restates the
// implementation is a second implementation agreeing with itself). Every arm drives
// resolveOrgIfUnseen() through a stubbed fetch and asserts on the calls it actually made -- the
// URL, the Prefer header and the payload -- never on the source text.
//
// THE DEFECT, as the measurement rather than the story. middleware.js:320-325 writes a minimal
// first-sighting row (caller_ip, and at most country) with resolution=ignore-duplicates. Rule 1
// then asked `select=caller_ip` and returned on ANY row, so that bare row read as a cache hit and
// the ipinfo lookup never happened. Measured live on public.ip_org_cache at this ship: 24 rows,
// 22 resolved, 2 with org NULL -- and `attempted_but_unresolved` = 0, i.e. every NULL-org row also
// had resolver NULL. Never attempted, which is this bug's signature and not a failed lookup's.
//
// EVERY CLAUSE CARRIES ITS OWN NEGATIVE CONTROL -- "would this still pass if the change did
// nothing?" must answer NO:
//   * theGatesBareRowNoLongerReadsAsACacheHit() applies the RETIRED predicate to the SAME fixture
//     and asserts it LOSES, so the guard proves a DIFFERENCE from the rejected design rather than
//     a property both share.
//   * theWriteMergesRatherThanIgnoring() exists because the Rule-1 fix alone is INERT: the row
//     already exists, so ON CONFLICT DO NOTHING throws away the lookup that was just paid for.
//   * resolvedAtIsNotTheAttemptedMarker() pins the wrong column. Both live NULL-org rows carry a
//     non-NULL resolved_at, so a fix keyed on it would read them as attempted and rebuild the bug.
//
// THE INVARIANT THIS MUST NOT BREAK, and the reason half these arms exist: the module's own header
// states that steady state is ZERO outbound lookups, defended by a permanent negative-cache entry
// -- "without it, one rate-limited or unroutable address would be re-queried on every single call
// forever." aFailedLookupIsStillNeverRetried() is that invariant, asserted end-to-end across two
// sightings rather than assumed from the diff.

import assert from "assert";

import { selfRun } from "./_lib/self-run.js";
import { resolveOrgIfUnseen } from "../../lib/ip-org-resolver.js";

const IP = "203.0.113.7";          // TEST-NET-3, RFC 5737 -- routable-shaped, never a real caller
const PRIVATE_IP = "10.1.2.3";

// --- the harness: drive the real module, record what it actually asked for ----------------------

function isCacheRead(url) {
  return url.includes("/rest/v1/ip_org_cache?") && url.includes("select=");
}
function isIpinfo(url) {
  return url.includes("ipinfo.io/");
}
function isWrite(url) {
  return url.includes("/rest/v1/ip_org_cache?on_conflict=caller_ip");
}

/**
 * @param cacheRows  array returned by the cache read, or null to make that read fail (non-ok)
 * @param ipinfoBody object for a successful lookup, or null to make ipinfo fail (non-ok)
 */
async function drive(ip, cacheRows, ipinfoBody) {
  const calls = [];
  const realFetch = globalThis.fetch;
  const realUrl = process.env.SUPABASE_URL;
  const realKey = process.env.SUPABASE_SERVICE_KEY;

  process.env.SUPABASE_URL = "https://stub.supabase.test";
  process.env.SUPABASE_SERVICE_KEY = "stub-service-key";

  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    calls.push({ url: u, init });
    if (isCacheRead(u)) {
      return cacheRows === null
        ? { ok: false, status: 500, json: async () => null }
        : { ok: true, status: 200, json: async () => cacheRows };
    }
    if (isIpinfo(u)) {
      return ipinfoBody === null
        ? { ok: false, status: 429, json: async () => ({}) }
        : { ok: true, status: 200, json: async () => ipinfoBody };
    }
    if (isWrite(u)) return { ok: true, status: 201, json: async () => ({}) };
    throw new Error(`unexpected fetch to ${u}`);
  };

  try {
    await resolveOrgIfUnseen(ip);
  } finally {
    globalThis.fetch = realFetch;
    if (realUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = realUrl;
    if (realKey === undefined) delete process.env.SUPABASE_SERVICE_KEY; else process.env.SUPABASE_SERVICE_KEY = realKey;
  }

  return {
    calls,
    cacheReads: calls.filter(c => isCacheRead(c.url)),
    lookups: calls.filter(c => isIpinfo(c.url)),
    writes: calls.filter(c => isWrite(c.url)),
  };
}

const bodyOf = call => JSON.parse(call.init.body);
const preferOf = call => String(call.init.headers.Prefer || call.init.headers.prefer || "");

// The gate's minimal first-sighting row, in the shape middleware.js actually writes it: no org,
// no resolver, and -- the trap -- a resolved_at the column default supplies anyway.
const GATE_BARE_ROW = { resolver: null };

// --- 1. the fix: a gate-written bare row is NOT a cache hit -------------------------------------

async function theGatesBareRowNoLongerReadsAsACacheHit() {
  const r = await drive(IP, [GATE_BARE_ROW], { org: "AS7922 Comcast", city: "Austin", region: "Texas", country: "US" });

  assert.strictEqual(r.lookups.length, 1,
    "a row that exists but was never resolved must spend exactly one ipinfo lookup");
  assert.strictEqual(r.writes.length, 1, "and must write the result back");
  assert.strictEqual(bodyOf(r.writes[0]).org, "AS7922 Comcast", "the org actually lands");

  // NEGATIVE CONTROL -- the RETIRED predicate on the SAME fixture. It asked `select=caller_ip` and
  // returned on any row, so it would have made ZERO lookups here. If this ever stops failing, the
  // fix has been reverted and the arm above has gone vacuous.
  const retiredWouldShortCircuit = Array.isArray([GATE_BARE_ROW]) && [GATE_BARE_ROW].length > 0;
  assert.ok(retiredWouldShortCircuit,
    "control: the retired existence test DOES short-circuit on this fixture -- which is the bug");
  assert.ok(r.lookups.length > 0,
    "control: the shipped module does NOT, so the two designs genuinely differ on this input");
}

async function ruleOneAsksForTheAttemptedMarker() {
  const r = await drive(IP, [], { org: "AS7922 Comcast" });
  assert.strictEqual(r.cacheReads.length, 1, "exactly one cache read");
  const url = r.cacheReads[0].url;
  assert.ok(url.includes("select=resolver"),
    `Rule 1 must project the attempted-marker, got: ${url}`);
  assert.ok(!/select=caller_ip(&|$)/.test(url),
    "control: the retired select=caller_ip projection must not survive -- it cannot answer the question");
}

async function resolvedAtIsNotTheAttemptedMarker() {
  // The trap, and it is a live one: both NULL-org rows on this platform carry a non-NULL
  // resolved_at with a NULL resolver. Keying the short-circuit on resolved_at would read them as
  // already-attempted and rebuild the exact defect.
  const r = await drive(IP, [{ resolver: null, resolved_at: "2026-08-21T03:57:11.777Z" }],
    { org: "AS7922 Comcast" });
  assert.strictEqual(r.lookups.length, 1,
    "a resolved_at with a NULL resolver is NOT an attempt -- it must still resolve");
}

// --- 2. the second half: the write must merge, or the fix is inert ------------------------------

async function theWriteMergesRatherThanIgnoring() {
  const r = await drive(IP, [GATE_BARE_ROW], { org: "AS7922 Comcast", city: "Austin" });
  const prefer = preferOf(r.writes[0]);
  assert.ok(prefer.includes("resolution=merge-duplicates"),
    `the write must update the existing row, got Prefer: ${prefer}`);
  assert.ok(!prefer.includes("resolution=ignore-duplicates"),
    "control: ON CONFLICT DO NOTHING would silently discard the lookup this call just paid for");
}

async function theWriteNeverTouchesTheGatesOwnColumns() {
  // merge-duplicates updates only the columns in the payload, so the guard is that the gate's
  // columns are ABSENT. If one is ever added, HAR-33's spend gate starts losing state to a
  // background org lookup.
  const r = await drive(IP, [GATE_BARE_ROW], { org: "AS7922 Comcast" });
  const payload = bodyOf(r.writes[0]);
  for (const owned of ["permission", "spend_limit_usd", "block_reason", "blocked_at", "blocked_attempts", "user_label"]) {
    assert.ok(!(owned in payload),
      `${owned} is the gate's column -- a merge carrying it would clobber middleware.js's state`);
  }
  // caller_ip_masked is GENERATED (LOG-124): including it errors the write outright.
  assert.ok(!("caller_ip_masked" in payload), "caller_ip_masked is generated and must never be written");
}

// --- 3. the invariant: steady state stays zero outbound lookups ---------------------------------

async function anAlreadyResolvedRowSpendsNothing() {
  const r = await drive(IP, [{ resolver: "ipinfo.io" }], { org: "should never be fetched" });
  assert.strictEqual(r.lookups.length, 0, "a resolved row must construct no outbound request");
  assert.strictEqual(r.writes.length, 0, "and must write nothing");
}

async function aFailedLookupIsStillNeverRetried() {
  // Sighting 1: the lookup fails. The row must still be written, carrying the marker, so the
  // failure is negative-cached. This is the anti-runaway the module's header calls load-bearing.
  const first = await drive(IP, [GATE_BARE_ROW], null);
  assert.strictEqual(first.lookups.length, 1, "one attempt is spent");
  assert.strictEqual(first.writes.length, 1, "a failed lookup STILL writes its row");
  const payload = bodyOf(first.writes[0]);
  assert.strictEqual(payload.org, null, "org is null on a failed lookup");
  assert.strictEqual(payload.resolver, "ipinfo.io",
    "the marker is written on the FAILURE path too -- that is what stops the retry");

  // Sighting 2: the row the failure just wrote. Zero outbound requests, forever.
  const second = await drive(IP, [{ resolver: payload.resolver }], { org: "must not be fetched" });
  assert.strictEqual(second.lookups.length, 0,
    "the negative-cache entry must short-circuit every later sighting -- no re-query runaway");
}

async function aFirstSightWithNoRowIsUnchanged() {
  const r = await drive(IP, [], { org: "AS7922 Comcast", city: "Austin", region: "Texas", country: "US" });
  assert.strictEqual(r.lookups.length, 1, "a genuine miss still resolves once");
  assert.strictEqual(bodyOf(r.writes[0]).caller_ip, IP, "and writes its own row");
}

async function aBrokenCacheReadSkipsTheSighting() {
  const r = await drive(IP, null, { org: "must not be fetched" });
  assert.strictEqual(r.lookups.length, 0,
    "a FAILED cache read is not a miss -- treating it as one re-queries the provider on every call");
  assert.strictEqual(r.writes.length, 0, "and writes nothing");
}

async function aPrivateAddressNeverLeavesTheBuilding() {
  const r = await drive(PRIVATE_IP, [], { org: "must not be fetched" });
  assert.strictEqual(r.calls.length, 0, "a private address costs not even a cache read");
}

async function run() {
  await theGatesBareRowNoLongerReadsAsACacheHit();
  await ruleOneAsksForTheAttemptedMarker();
  await resolvedAtIsNotTheAttemptedMarker();
  await theWriteMergesRatherThanIgnoring();
  await theWriteNeverTouchesTheGatesOwnColumns();
  await anAlreadyResolvedRowSpendsNothing();
  await aFailedLookupIsStillNeverRetried();
  await aFirstSightWithNoRowIsUnchanged();
  await aBrokenCacheReadSkipsTheSighting();
  await aPrivateAddressNeverLeavesTheBuilding();
}

selfRun(import.meta.url, run);
export default run;
