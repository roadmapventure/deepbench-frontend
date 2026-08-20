// DeepBench v7.0.108 | tests/regression/SES-89-heal-detector.js | SES-89
// FEATURE: SES-89 -- the Heal engine's detector. Guards the three properties that decide whether
// an unattended 3-hour loop files useful tickets or floods the backlog with noise:
//
//   1. Signature normalization actually merges what should merge. "Anthropic call failed: 529"
//      and "Anthropic call failed: 500" are one recurring defect, not two singletons; if the
//      digit-collapse regressed, every varying-code failure would shatter into singletons and
//      the engine would silently stop filing anything.
//   2. The threshold discriminates. This is the red control: a fixture containing ONLY
//      singletons and doubletons must produce ZERO detections. A detector that files
//      unconditionally passes assertion 1 and fails here -- which is the whole point, because
//      "it found something" is worthless unless "it found nothing" is also reachable.
//   3. Dedup suppresses a signature whose hash already appears in an existing ticket's
//      description. Without this the same defect files eight times a day, forever.
//
// Plus the evidence contract: a filed ticket must carry the sig hash (the dedup key) and at
// least one REAL durable_hops id (§19d -- every claim traces to a row). A ticket that says
// "something failed a lot" without a row id is not evidence, and a later session could not
// verify it.
//
// No network, no credentials, no disk: the fixtures below are verbatim copies of rows verified
// live against public.durable_hops on 2026-08-20 (the real capability slugs and error strings,
// with their real shapes). Importing scripts/heal-engine.js must not touch Supabase -- if the
// pathToFileURL guard at the bottom of that file ever regressed, this test would hang or fail
// on a missing env var, which is itself worth catching.

import assert from "assert";
import { selfRun } from "./_lib/self-run.js";
import {
  normalizeErrorClass,
  signatureOf,
  detect,
  buildTicketDraft,
  parseBacklogIds,
} from "../../scripts/heal-engine.js";

// Real error first-lines, copied verbatim from failed rows in public.durable_hops.
const ANTHROPIC_529 = "Anthropic call failed: 529";
const ANTHROPIC_500 = "Anthropic call failed: 500";
const PARSE_FAILED = "Parse failed and retry also failed";
const TIMEOUT = "The operation was aborted due to timeout";

function hop(id, capability, error, isoDate) {
  return { id, capability_slug: capability, status: "failed", error, created_at: isoDate };
}

const WINDOW_START = new Date("2026-07-01T00:00:00Z");
const WINDOW_END = new Date("2026-08-01T00:00:00Z");

// ---------------------------------------------------------------------------
// 1. Signature normalization
// ---------------------------------------------------------------------------
function normalization() {
  assert.strictEqual(
    normalizeErrorClass(ANTHROPIC_529),
    "Anthropic call failed: N",
    "digit runs must collapse to N so varying status codes group as one signature",
  );
  assert.strictEqual(
    normalizeErrorClass(ANTHROPIC_529),
    normalizeErrorClass(ANTHROPIC_500),
    "529 and 500 of the same failure must normalize to the SAME class -- otherwise every " +
      "varying-code failure shatters into singletons and never reaches threshold",
  );

  // Only the first line survives: the tail is usually a stack or payload echo that differs on
  // every occurrence and would defeat the grouping entirely.
  assert.strictEqual(
    normalizeErrorClass(`${PARSE_FAILED}\n    at Object.parse (/var/task/api/foo.js:41:9)`),
    PARSE_FAILED,
    "only the first line of the error is the class",
  );

  // Different capabilities are different signatures even with identical error text -- a parse
  // failure in quality-gate is not the same defect as one in data-room-custody.
  const a = signatureOf(hop("x", "quality-gate", PARSE_FAILED, "2026-07-20T00:00:00Z"));
  const b = signatureOf(hop("y", "data-room-custody", PARSE_FAILED, "2026-07-20T00:00:00Z"));
  assert.notStrictEqual(a.hash, b.hash, "capability is part of the signature key");
  assert.match(a.hash, /^[0-9a-f]{12}$/, "sig hash is 12 hex chars");
}

// ---------------------------------------------------------------------------
// 2. Threshold -- the RED CONTROL
// ---------------------------------------------------------------------------
function thresholdDiscriminates() {
  // Fixture A: nothing recurring. Four singletons and one doubleton -- the exact noise shape the
  // live table contains (verified: 8 singletons + 6 doubletons among 30 signatures).
  const noise = [
    hop("n1", "quality-gate", "supersedes_id lookup failed", "2026-07-10T00:00:00Z"),
    hop("n2", "web-search-news", "unexpected end of JSON input", "2026-07-11T00:00:00Z"),
    hop("n3", "data-analysis", "row not found", "2026-07-12T00:00:00Z"),
    hop("n4", "memory-consolidation", "conflict on upsert", "2026-07-13T00:00:00Z"),
    hop("n5", "channel-intelligence", TIMEOUT, "2026-07-14T00:00:00Z"),
    hop("n6", "channel-intelligence", TIMEOUT, "2026-07-15T00:00:00Z"),
  ];

  const quiet = detect(noise, [], { threshold: 3, windowStart: WINDOW_START, windowEnd: WINDOW_END });
  assert.strictEqual(
    quiet.detections.length,
    0,
    "RED CONTROL: only-singletons-and-a-doubleton must yield ZERO detections. A detector that " +
      "fires here would file the backlog full of one-off noise every three hours.",
  );
  assert.strictEqual(quiet.signaturesSeen, 5, "it must still SEE the signatures it declined to file");

  // Fixture B: one genuine recurring defect at exactly the threshold, mixed into the same noise.
  const withReal = noise.concat([
    hop("r1", "channel-intelligence", ANTHROPIC_529, "2026-07-20T00:00:00Z"),
    hop("r2", "channel-intelligence", ANTHROPIC_500, "2026-07-21T00:00:00Z"),
    hop("r3", "channel-intelligence", ANTHROPIC_529, "2026-07-22T00:00:00Z"),
  ]);

  const fired = detect(withReal, [], { threshold: 3, windowStart: WINDOW_START, windowEnd: WINDOW_END });
  assert.strictEqual(fired.detections.length, 1, "exactly the one real signature fires, not the noise");
  const d = fired.detections[0];
  assert.strictEqual(d.capability, "channel-intelligence");
  assert.strictEqual(d.errorClass, "Anthropic call failed: N");
  assert.strictEqual(d.count, 3, "the 529s and the 500 count as ONE signature of three");

  // Boundary: exactly 2 is silence, exactly 3 fires. Both directions, because a threshold that
  // is off by one in either direction is either a flood or a permanent no-op.
  const two = detect(withReal.slice(0, -1), [], {
    threshold: 3,
    windowStart: WINDOW_START,
    windowEnd: WINDOW_END,
  });
  assert.strictEqual(two.detections.length, 0, "2 occurrences must NOT file (threshold boundary)");

  // Window bounds are real: the same rows outside the window produce nothing.
  const outOfWindow = detect(withReal, [], {
    threshold: 3,
    windowStart: new Date("2026-08-10T00:00:00Z"),
    windowEnd: new Date("2026-08-20T00:00:00Z"),
  });
  assert.strictEqual(outOfWindow.detections.length, 0, "rows outside the window must not count");
}

// ---------------------------------------------------------------------------
// 3. Dedup
// ---------------------------------------------------------------------------
function dedupSuppresses() {
  const hops = [
    hop("r1", "quality-gate", PARSE_FAILED, "2026-07-20T00:00:00Z"),
    hop("r2", "quality-gate", PARSE_FAILED, "2026-07-21T00:00:00Z"),
    hop("r3", "quality-gate", PARSE_FAILED, "2026-07-22T00:00:00Z"),
  ];

  const first = detect(hops, [], { threshold: 3, windowStart: WINDOW_START, windowEnd: WINDOW_END });
  assert.strictEqual(first.detections.length, 1, "first sight of a recurring signature files");
  const sigHash = first.detections[0].sigHash;

  // Now pretend the ticket exists, exactly as the live dedup sees it: a description string
  // containing the hash.
  const existing = [`**P9 - Bug Fixes.** ...\n\nHeal signature: \`${sigHash}\`\n...`];
  const second = detect(hops, existing, {
    threshold: 3,
    windowStart: WINDOW_START,
    windowEnd: WINDOW_END,
  });
  assert.strictEqual(second.detections.length, 0, "an already-filed signature must never re-file");
  assert.strictEqual(second.alreadyFiled.length, 1, "and it must be reported as already-filed, not invisible");

  // An unrelated ticket must NOT suppress: dedup keyed on the wrong thing (e.g. capability
  // alone) would silence real, distinct defects.
  const unrelated = [`**P9 - Bug Fixes.** ...\n\nHeal signature: \`000000000000\`\n...`];
  const third = detect(hops, unrelated, {
    threshold: 3,
    windowStart: WINDOW_START,
    windowEnd: WINDOW_END,
  });
  assert.strictEqual(third.detections.length, 1, "a different signature's ticket must not suppress this one");
}

// ---------------------------------------------------------------------------
// 4. The evidence contract
// ---------------------------------------------------------------------------
function ticketCarriesItsEvidence() {
  const hops = [
    hop("11111111-1111-4111-8111-111111111111", "quality-gate", TIMEOUT, "2026-07-20T00:00:00Z"),
    hop("22222222-2222-4222-8222-222222222222", "quality-gate", TIMEOUT, "2026-07-21T00:00:00Z"),
    hop("33333333-3333-4333-8333-333333333333", "quality-gate", TIMEOUT, "2026-07-22T00:00:00Z"),
  ];
  const { detections } = detect(hops, [], {
    threshold: 3,
    windowStart: WINDOW_START,
    windowEnd: WINDOW_END,
  });
  const draft = buildTicketDraft(detections[0], "LOO-99", {
    windowDays: 14,
    threshold: 3,
    windowStart: WINDOW_START,
    windowEnd: WINDOW_END,
  });

  assert.strictEqual(draft.backlog_id, "LOO-99");
  assert.strictEqual(draft.priority_class, "P9 - Bug Fixes", "named form, never a bare digit (register B9)");
  assert.strictEqual(draft.status, "missing", "the only open status the live CHECK constraint allows");
  assert.strictEqual(draft.tier, "now");
  assert.strictEqual(draft.source_file, "heal-engine", "the sentinel the dedup query and any future reconciliation key on");
  assert.strictEqual(draft.row_ordinal, 99, "row_ordinal derives from the id, satisfying UNIQUE(source_file,row_ordinal)");

  assert.ok(
    draft.description.includes(detections[0].sigHash),
    "the description MUST carry the sig hash -- it is the dedup key; without it the engine " +
      "re-files this defect every three hours forever",
  );
  assert.ok(
    draft.description.includes("11111111-1111-4111-8111-111111111111"),
    "the description MUST carry at least one real durable_hops id (§19d: every claim traces to a row)",
  );
  assert.ok(
    draft.description.includes("Detection never auto-fixes"),
    "the ticket must say plainly that it was detected, not fixed",
  );
  assert.ok(draft.title.startsWith("[Heal] "), "heal tickets are identifiable at a glance in the backlog");
}

// ---------------------------------------------------------------------------
// 5. The id guard -- the engine must never invent a backlog id
// ---------------------------------------------------------------------------
// Ids are claimed by the CYCLE, in one atomic block against feature_id_counter, and passed in.
// This guard is what stops a malformed or hand-counted list from becoming malformed backlog_id
// values -- and a duplicate in the list would mean two tickets claiming one id, which is the
// exact collision class CLAUDE.md's atomic-counter rule exists to prevent.
function idGuard() {
  assert.deepStrictEqual(parseBacklogIds("LOO-38,LOO-39").ids, ["LOO-38", "LOO-39"]);
  assert.deepStrictEqual(parseBacklogIds(" LOO-38 , LOO-39 ").ids, ["LOO-38", "LOO-39"], "whitespace is tolerated");

  assert.ok(parseBacklogIds(null).error, "--apply with no ids must be an error, never a silent no-op");
  assert.ok(parseBacklogIds("").error, "empty ids must be an error");
  assert.ok(parseBacklogIds("LOO-38,LOO-38").error, "duplicate ids must be rejected -- two tickets, one id");
  assert.ok(parseBacklogIds("HAR-38").error, "a foreign prefix must be rejected");
  assert.ok(parseBacklogIds("LOO-abc").error, "a non-numeric id must be rejected");
  assert.ok(parseBacklogIds("LOO38").error, "a malformed id must be rejected");
}

export default async function run() {
  normalization();
  thresholdDiscriminates();
  dedupSuppresses();
  ticketCarriesItsEvidence();
  idGuard();
}

selfRun(import.meta.url, run);
