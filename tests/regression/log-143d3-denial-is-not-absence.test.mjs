// DeepBench v7.0.420 | tests/regression/log-143d3-denial-is-not-absence.test.mjs | LOG-143 (d3) --
// an access denial on the by-id Library read is never reported as an absent source. (d1)/(d2)
// shipped the primitive (lookupRecordsWithContent()) and its wrapper (readContentByIds()), but
// readContentByIds() hardcoded `_access: { granted: true, tier: 'by-id' }` regardless of what the
// primitive actually found -- so an agent with no Library access got the SAME "not a the_library
// record" wording buildTraceFacts() writes for a genuine cross-store id. Measured live 2026-09-03:
// Owen (no data-room access at the time) ran a judge on trace 259616e3 and the section reported
// "None of the 13 retrieved chunk ids is a Library record" for 10 ids that really are the_library
// rows -- a denial read as an absence (C-rejected-17/18).
//
// WHAT IS BEING PINNED, and the two places a lazier guard would pass vacuously.
//
// (1) THE SECTION BUILDER MUST CHOOSE ITS SENTENCE FROM `_access`, NOT FROM RESOLUTION COUNT ALONE.
// A fixture read with `_access.granted: false` must render the "not readable" sentence and must
// NEVER render the phrase "not the_library records" -- that phrase is honest only when the read
// actually ran and found nothing, not when the agent could not read the store at all. MUTATION
// CONTROL: flip `granted` to true on the identical fixture (same records, same partial resolution)
// -- the phrase must then appear, proving the assertion above rejects a real regression rather than
// matching everything.
//
// (2) THE TIER MUST NAME THE DENIAL REASON. readContentByIds()'s `_access.tier` for a denied
// the_library read must start with `denied-` (e.g. `denied-no-room-scope`), never the unconditional
// `by-id` the pre-(d3) code always returned. MUTATION CONTROL: a build that reverts to hardcoding
// `granted: true, tier: 'by-id'` must fail this assertion.
//
// NO WRITE, NO EMBED, NO SPEND. The SOURCE arm calls buildTraceFacts()/readContentByIds() with a
// stubbed fetch (Library read never touches the network); the LIVE arm below runs one real
// Supabase read per case, no OpenAI call.

import assert from "assert";
import { selfRun, notRun } from "./_lib/self-run.js";

// ---- SOURCE ARM helpers -------------------------------------------------------------------------
//
// buildTraceFacts() reaches Supabase twice: once for ai_activity_log (the trace itself) and once,
// indirectly through readContentByIds(), for the_library. Stubbing global fetch lets the section
// builder run with zero credentials and zero network calls, so this arm needs none.
function makeTraceRow({ chunkIds }) {
  return {
    id: 1,
    agent_id: "eleanor",
    ai_type: "agent-turn",
    feature: "channel-intelligence:ci-answer-display-intent:depth0",
    call_facts: { retrieved_chunk_ids: chunkIds, assembled_skill_slugs: [] },
  };
}

// Builds a fetch stub: the first call (ai_activity_log) returns `traceRows`; any call after that
// is the_library's own PostgREST select, made from INSIDE lookupRecordsWithContent() -- so to force
// a denial before that select even runs, `roomLookupOutcome` short-circuits getCredentials() by
// stubbing the agents select too. `libraryRows` (only reached when access resolves) backs the
// content select.
function makeFetchStub({ traceRows, agentsRow, libraryRows }) {
  let call = 0;
  return async (url) => {
    call += 1;
    const u = String(url);
    if (u.includes("/rest/v1/ai_activity_log")) {
      return { ok: true, json: async () => traceRows };
    }
    if (u.includes("/rest/v1/agents")) {
      return { ok: true, json: async () => [agentsRow] };
    }
    if (u.includes("/rest/v1/the_library")) {
      return { ok: true, json: async () => libraryRows };
    }
    throw new Error(`makeFetchStub: unexpected URL on call ${call}: ${u}`);
  };
}

export default async function run() {
  // SOURCE arm needs SUPABASE_URL/SUPABASE_SERVICE_KEY to be *some* non-empty string to get past
  // the `!supabaseUrl || !supabaseKey` guards -- fetch itself is stubbed below, so the value never
  // reaches a real network call. If real credentials are ALREADY present (this session, or run-all.js
  // with .env.local), leave them exactly as they are: the stub matches on URL path, not host, so it
  // works against a real Supabase URL too. Only fill in placeholders when the vars are truly unset,
  // and restore that exact absence afterward -- this process also runs every OTHER test file in this
  // suite via run-all.js, and a leaked fake credential would make a later file's own credential-gate
  // check pass falsely, turning its LIVE arm into a real network call against a fake host.
  const hadUrl = Object.prototype.hasOwnProperty.call(process.env, "SUPABASE_URL");
  const hadKey = Object.prototype.hasOwnProperty.call(process.env, "SUPABASE_SERVICE_KEY");
  if (!process.env.SUPABASE_URL) process.env.SUPABASE_URL = "https://stub.example.test";
  if (!process.env.SUPABASE_SERVICE_KEY) process.env.SUPABASE_SERVICE_KEY = "stub-key";

  const { buildTraceFacts } = await import("../../api/prompt/ai-enrichment.js");
  const { readContentByIds } = await import("../../lib/search-harness.js");

  const CHUNK_IDS = ["11111111-1111-1111-1111-111111111111", "22222222-2222-2222-2222-222222222222"];

  // ── (1) SECTION BUILDER: denial vs absence, with the mutation control ────────────────────────
  const originalFetch = global.fetch;
  try {
    // Fixture agent: exists, but has NO Library access at all (data_room_access: [] and
    // uber_access: false) -- the real no-room-scope shape confirmed live against `bob`/`alex`/etc.
    // in public.agents this session, used here as a static fixture so this arm needs no credentials.
    const deniedAgentsRow = { data_room_access: [], uber_access: false };

    global.fetch = makeFetchStub({
      traceRows: [makeTraceRow({ chunkIds: CHUNK_IDS })],
      agentsRow: deniedAgentsRow,
      libraryRows: [], // never reached: access resolution denies before the_library is queried
    });

    const denied = await buildTraceFacts({ traceId: "t-denied", tenantId: "global", requestingAgentId: "no-access-fixture" });

    assert.match(denied.context, /RETRIEVED LIBRARY CHUNK TEXT: not readable/,
      "a denied Library read must render the 'not readable' sentence, not the resolved-count or " +
      "unresolved-count wording.");
    assert.match(denied.context, /no-access-fixture/,
      "the denial sentence must name the requesting agent that was denied.");
    assert.match(denied.context, /denied-no-room-scope/,
      "the denial sentence must name the specific denial tier, not a generic 'denied' word.");
    assert.match(denied.context, /NOT evidence about the run's sourcing/,
      "the denial sentence must say explicitly that this is an access condition, never sourcing evidence.");
    assert.ok(!denied.context.includes("not the_library records"),
      "a denied read must NEVER render 'not the_library records' -- that phrase claims the read ran " +
      "and found nothing, which is false when the read could not run at all (C-rejected-17/18).");

    // MUTATION CONTROL: the identical trace/ids, but the agent now has full access (uber_access) --
    // the read actually runs, finds nothing (the ids aren't real the_library rows), and the OLD
    // wording must reappear. If it doesn't, the assertion above proves nothing.
    const grantedAgentsRow = { data_room_access: [], uber_access: true };
    global.fetch = makeFetchStub({
      traceRows: [makeTraceRow({ chunkIds: CHUNK_IDS })],
      agentsRow: grantedAgentsRow,
      libraryRows: [], // resolves, finds zero matching rows -- a real absence, not a denial
    });
    const granted = await buildTraceFacts({ traceId: "t-granted", tenantId: "global", requestingAgentId: "uber-fixture" });
    assert.match(granted.context, /is a the_library record \(a different store, not a missing source\)/,
      "MUTATION CONTROL FAILED: flipping the fixture to a granted read must restore the " +
      "'not a the_library record' wording -- otherwise the denial assertion above is vacuous.");
    assert.match(granted.context, /THIS DOES NOT MEAN THE RUN WAS UNGROUNDED/,
      "a granted read that resolves nothing must still carry the existing (d1) reassurance sentence -- " +
      "this ticket adds a denial case, it does not remove the absence case's own wording.");
    assert.ok(!granted.context.includes("not readable"),
      "a granted read that simply found nothing must not render the denial sentence.");
  } finally {
    global.fetch = originalFetch;
  }

  // ── (2) readContentByIds()'s tier, with its own mutation control ─────────────────────────────
  try {
    global.fetch = makeFetchStub({
      traceRows: [],
      agentsRow: { data_room_access: [], uber_access: false },
      libraryRows: [],
    });
    const deniedRead = await readContentByIds({
      requestingAgentId: "no-access-fixture", store: "the_library", ids: CHUNK_IDS, tenantId: "global",
    });
    assert.equal(deniedRead._access.granted, false, "a denied the_library read must report granted:false");
    assert.match(deniedRead._access.tier, /^denied-/,
      "a denied the_library read's tier must start with 'denied-' -- the pre-(d3) code always " +
      "returned the unconditional 'by-id' here regardless of what the primitive found.");
    assert.equal(deniedRead._access.tier, "denied-no-room-scope");
    assert.equal(deniedRead.records.length, CHUNK_IDS.length,
      "a denied read must still return one stub per requested id -- never a dropped element.");
    for (const r of deniedRead.records) assert.equal(r.exists, false);

    global.fetch = makeFetchStub({
      traceRows: [],
      agentsRow: { data_room_access: [], uber_access: true },
      libraryRows: [],
    });
    const grantedRead = await readContentByIds({
      requestingAgentId: "uber-fixture", store: "the_library", ids: CHUNK_IDS, tenantId: "global",
    });
    assert.equal(grantedRead._access.granted, true);
    assert.equal(grantedRead._access.tier, "by-id",
      "MUTATION CONTROL FAILED: a resolved read must report tier 'by-id', not a 'denied-' tier.");
  } finally {
    global.fetch = originalFetch;
  }

  // Undo the placeholder credentials now, unconditionally -- before the LIVE arm's own credential
  // check reads process.env, and before any later test file in this same run-all.js process can
  // see them. Only ever removes a value THIS function put there (guarded by hadUrl/hadKey above);
  // a real pre-existing credential was never touched and is left exactly as found.
  if (!hadUrl) delete process.env.SUPABASE_URL;
  if (!hadKey) delete process.env.SUPABASE_SERVICE_KEY;

  // ── LIVE ARM: a real fixture agent with no access, and owen (now uber) ──────────────────────
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "LOG-143d3 live denial read",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent, so no real agents/the_library rows can be read " +
      "back. Re-run with credentials: node --env-file-if-exists=.env.local tests/regression/run-all.js"
    );
    return;
  }

  const { lookupRecordsWithContent } = await import("../../lib/librarian.js");

  // A real no-access agent row, read (never written) this session: public.agents holds several
  // rows with data_room_access: [] and uber_access: false (e.g. 'bob'). Read it fresh here rather
  // than trusting the earlier read-only survey, per "verify, never assert from memory."
  const agentsRes = await fetch(
    `${url}/rest/v1/agents?uber_access=eq.false&select=id,data_room_access&order=id.asc&limit=50`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  );
  assert.ok(agentsRes.ok, `could not read candidate fixture agents from public.agents (${agentsRes.status})`);
  const candidateAgents = await agentsRes.json();
  const noAccessAgent = candidateAgents.find(r => Array.isArray(r.data_room_access) && r.data_room_access.length === 0);
  if (!noAccessAgent) {
    notRun("LOG-143d3 live denial read", "no agent row with data_room_access:[] and uber_access:false exists to use as the denial fixture.");
    return;
  }

  const liveDenied = await lookupRecordsWithContent({
    requestingAgentId: noAccessAgent.id, tenantId: "global", ids: CHUNK_IDS,
  });
  assert.equal(liveDenied.denied, "no-room-scope",
    `agent ${noAccessAgent.id} (no data_room_access, no uber_access) must be denied with reason ` +
    "'no-room-scope', not read as an absence.");
  assert.equal(liveDenied.records.length, CHUNK_IDS.length);
  for (const r of liveDenied.records) assert.equal(r.exists, false);

  // owen is now uber_access:true (decision 462942fe) -- a live read for him must resolve (denied:
  // null), even though these two fixture ids are not real the_library rows.
  const liveOwen = await lookupRecordsWithContent({
    requestingAgentId: "owen", tenantId: "global", ids: CHUNK_IDS,
  });
  assert.equal(liveOwen.denied, null,
    "owen now has uber_access:true and must resolve (denied: null), never a denial tier.");
  assert.equal(liveOwen.records.length, CHUNK_IDS.length);
}

selfRun(import.meta.url, run);
