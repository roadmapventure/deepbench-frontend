// DeepBench v7.0.372 | tests/regression/ses-276-heal-v2.test.mjs | SES-276 — heal v2: the widened
// inputs, the classifier that refuses to heal the runner's own noise, and fix-confirmation.
//
// FEATURE: SES-276
//
// WHAT THIS GUARDS, and why each clause is the one that would catch the engine going wrong:
//
//   1. THREE STREAMS, ONE SHAPE. A fixture failure in each of durable_hops, ci_run_conclusions and
//      runner_cycles must produce a normalised record. Remove a fetcher and its clause goes red —
//      the fetchers are read out of the shipped source (they are module-private by design, since
//      importing this file must never touch the network), so deleting one is caught rather than
//      merely making the live run quieter.
//   2. THE CLASSIFIER DISCRIMINATES, AND THE ASSERTION IS ON THE CLASSIFICATION, NEVER ON A COUNT.
//      A count-based assertion passes for a classifier that files nothing at all, which is the
//      exact bug shape this ticket is most at risk of shipping.
//   3. `unclassified` FILES NOTHING. So does `process`. Only `product` files.
//   4. FIX-CONFIRMATION BOTH WAYS: a signature that goes quiet for its window is confirmed-fixed;
//      one that comes back is a recurrence against the ORIGINAL and is suppressed from filing.
//   5. VACUITY CONTROL. The fixture set is non-empty and every branch is proven reached — a green
//      run in which no branch fired is not a pass (`.claude/rules` / SES-176's own rule, and the
//      failure mode `LOO-013` cost a false pass to).
//
// FIXTURES ARE REAL SHAPES, measured live against the three tables on 2026-09-02 and not invented:
//   * durable_hops — 1,782 rows, 260 `failed`, newest row of ANY status 2026-08-23 (dead 10 days).
//   * ci_run_conclusions — 57 rows through 2026-09-02, 32 carrying a failed job, and every one of
//     those 32 names the SAME single failing job, "Tripwire + regression (blocking)". Three sit on
//     a commit the runner pushed, and all three concluded inside that cycle's own open window.
//   * runner_cycles — 365 rows, 6 with outcome='failed', every one of the 6 carrying a
//     stall-watchdog / closed-by-successor / concurrent-race banner in its notes.
//
// No network, no credentials, no disk beyond reading the engine's own source.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

import {
  STREAM_HOPS,
  STREAM_CI,
  STREAM_CYCLES,
  CLASS_PRODUCT,
  CLASS_PROCESS,
  CLASS_UNCLASSIFIED,
  DEFAULT_CONFIRMATION_WINDOW_DAYS,
  RUNNER_RACE_GRACE_MINUTES,
  KNOWN_RUNNER_RACES,
  normaliseStreams,
  normaliseCiRow,
  classifyRecord,
  detectSignatures,
  assessConfirmations,
  buildSignatureStateRows,
  buildTicketDraft,
} from "../../scripts/heal-engine.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ENGINE_SRC = fs.readFileSync(path.join(REPO, "scripts", "heal-engine.js"), "utf8");

const WINDOW_START = new Date("2026-08-19T00:00:00Z");
const WINDOW_END = new Date("2026-09-02T00:00:00Z");

const AMBIGUOUS_JOB = "Tripwire + regression (blocking)";
const BUILD_JOB = "Build (blocking)";

// Every branch the classifier can reach is recorded here as it is reached, and clause 5 asserts the
// set. A branch that stops being exercised must fail this file, not quietly stop being covered.
const BRANCHES_REACHED = new Set();
function reached(name) { BRANCHES_REACHED.add(name); }

function hopRow(id, capability, error, iso) {
  return { id, capability_slug: capability, status: "failed", error, created_at: iso };
}

function ciRow(runId, sha, iso, failingJobs) {
  const names = [BUILD_JOB, AMBIGUOUS_JOB];
  return {
    run_id: runId,
    commit_sha: sha,
    concluded_at: iso,
    jobs: names.map((name) => ({ name, conclusion: failingJobs.includes(name) ? "failure" : "success" })),
  };
}

function cycleRow(id, iso, notes, trigger = "scheduled") {
  return { id, started_at: iso, ended_at: iso, outcome: "failed", trigger, notes, push_sha: null, item_id: null };
}

// The runner-push ledger the SES-261 race match reads. Shapes copied from the live rows.
const RACED_SHA = "798b3b9b8791bd554b306f2d8d6bbc22279b8532";
const RACED_PUSHES = [
  { cycleId: "27cd58a9-0a25-4a88-95c6-b00c645fc7c3", sha: RACED_SHA, startedAt: "2026-08-31T18:13:12Z", endedAt: "2026-08-31T18:49:14Z" },
];
const RACED_CTX = { now: WINDOW_END, runnerPushes: RACED_PUSHES, runnerPushShas: new Set([RACED_SHA]) };
// The SAME context with the race marker removed: the runner never pushed that commit.
const NO_RACE_CTX = { now: WINDOW_END, runnerPushes: [], runnerPushShas: new Set() };

// ---------------------------------------------------------------------------
// 1. Three streams, one shape
// ---------------------------------------------------------------------------
function threeStreamsOneShape() {
  const { records, rowsRead, produced } = normaliseStreams({
    hops: [hopRow("h1", "quality-gate", "Anthropic call failed: 529", "2026-08-25T00:00:00Z")],
    ciRuns: [
      ciRow(33586498578, "561da66be899947360f9b003139b065cc372e0a1", "2026-09-01T03:20:01Z", []),
      ciRow(33580267521, "b879391f55bcaad10b33363411350806c1f3de69", "2026-09-01T01:41:24Z", [AMBIGUOUS_JOB]),
    ],
    cycles: [cycleRow("039d1477-898d-4143-b9a5-c039e7fb0ff6", "2026-08-25T16:42:51Z", "[CLOSED BY STALL WATCHDOG (SES-194, v7.0.230) …]")],
  });

  const streams = records.map((r) => r.stream).sort();
  assert.deepStrictEqual(
    streams,
    [STREAM_CI, STREAM_HOPS, STREAM_CYCLES].sort(),
    "each of the three streams must produce exactly one normalised record from its fixture failure — " +
      "this is the clause that goes red if a fetcher or a normaliser is removed",
  );

  // Every record carries the four things the kickoff requires at minimum.
  for (const rec of records) {
    assert.ok(rec.stream, "a record must name its source stream");
    assert.ok(rec.occurredAt, "a record must say when it occurred");
    assert.ok(rec.errorClass !== undefined && rec.scope, "a record must carry the material a signature is built from");
    assert.match(rec.rowLink, /public\.\w+/, "a record must link back to the row it came from (§19d)");
  }

  // A GREEN CI run is not a failure record, but its row was still READ. Reporting the two
  // separately is what stops a dead stream reading as an unread one.
  assert.strictEqual(rowsRead[STREAM_CI], 2, "both CI rows were read");
  assert.strictEqual(produced[STREAM_CI], 1, "only the run with a failing job produces a record");

  // durable_hops is KEPT, and its emptiness reports as a measured zero rather than as absence.
  const dead = normaliseStreams({ hops: [], ciRuns: [], cycles: [] });
  assert.strictEqual(dead.rowsRead[STREAM_HOPS], 0);
  assert.strictEqual(dead.produced[STREAM_HOPS], 0);
  reached("dead-stream-reports-zero");

  // The three fetchers are module-private (importing this file must never hit the network), so the
  // "remove a fetcher and this goes red" property is asserted against the shipped source.
  for (const table of [STREAM_HOPS, STREAM_CI, STREAM_CYCLES]) {
    assert.ok(
      new RegExp(`restGetAll\\(base, key, "${table}"`).test(ENGINE_SRC),
      `the engine must still read public.${table} — a stream that is not fetched cannot be classified, ` +
        "and durable_hops in particular is dead today but NOT retired",
    );
  }
  reached("all-three-streams-fetched");
}

// ---------------------------------------------------------------------------
// 2. The classifier discriminates — asserted on the CLASSIFICATION, never a count
// ---------------------------------------------------------------------------
function classifierDiscriminates() {
  // (a) A CI failure whose only failing job is the ambiguous one, on a commit the runner pushed,
  //     concluding inside that cycle's own open window: the SES-261 race. `process`, files nothing.
  const racedRun = ciRow(33426662625, RACED_SHA, "2026-08-31T18:46:29Z", [AMBIGUOUS_JOB]);
  const raced = normaliseCiRow(racedRun);
  const racedVerdict = classifyRecord(raced, RACED_CTX);
  assert.strictEqual(
    racedVerdict.classification,
    CLASS_PROCESS,
    "a CI red that is the runner grading its own in-flight close is process noise, never a product defect",
  );
  assert.match(racedVerdict.reason, /ci-grades-the-cycles-own-close|SES-261/,
    "the process verdict must name the race it matched — an unexplained verdict is not evidence");
  reached(CLASS_PROCESS);

  // (b) THE SAME RECORD WITH THE RACE MARKER REMOVED. One variable changes: the runner-push
  //     ledger no longer contains that commit. The verdict must CHANGE — that is what proves the
  //     marker is load-bearing rather than decorative.
  const unraced = classifyRecord(normaliseCiRow(racedRun), NO_RACE_CTX);
  assert.notStrictEqual(
    unraced.classification,
    CLASS_PROCESS,
    "CONTROL: with the race marker gone the same row must NOT still classify process — if it does, " +
      "the matcher is not reading the marker at all and every CI red is being laundered as noise",
  );
  assert.strictEqual(
    unraced.classification,
    CLASS_UNCLASSIFIED,
    "and it must land on `unclassified`, not `product`: ci_run_conclusions.jobs records job-level " +
      "conclusions only, so a red on the job that runs BOTH the governance tripwire and the " +
      "regression suite cannot be attributed to either half. 29 of the 32 live CI failures sit on a " +
      "commit the runner did not push, and promoting those to product would file the exact noise " +
      "this ticket exists to refuse",
  );
  reached(CLASS_UNCLASSIFIED);

  // (c) A failing job that CANNOT be produced by runner state — it checks out the commit and
  //     builds it — is `product`, on a commit the runner did not push.
  const built = classifyRecord(
    normaliseCiRow(ciRow(33999999999, "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef", "2026-09-01T12:00:00Z", [BUILD_JOB])),
    NO_RACE_CTX,
  );
  assert.strictEqual(
    built.classification,
    CLASS_PRODUCT,
    "a red `Build (blocking)` holds no credential and races nothing a cycle is doing — it is a real break",
  );
  reached(CLASS_PRODUCT);

  // (d) The race matcher must NOT swallow a build break that happens to land inside a cycle window.
  const builtDuringRace = classifyRecord(
    normaliseCiRow(ciRow(33888888888, RACED_SHA, "2026-08-31T18:46:29Z", [BUILD_JOB, AMBIGUOUS_JOB])),
    RACED_CTX,
  );
  assert.strictEqual(
    builtDuringRace.classification,
    CLASS_PRODUCT,
    "CONTROL: a build break inside the pushing cycle's window is still a build break — a race matcher " +
      "that is not restricted to the ambiguous job set would launder it into process noise",
  );
  reached("race-matcher-restricted-to-ambiguous-job");

  // (e) The three runner_cycles race markers, each on a real live notes banner.
  const watchdog = classifyRecord(
    normaliseStreams({ cycles: [cycleRow("039d1477-898d-4143-b9a5-c039e7fb0ff6", "2026-08-25T16:42:51Z", "[CLOSED BY STALL WATCHDOG (SES-194, v7.0.230) at 2026-08-25T16:42:51Z …]")] }).records[0],
    NO_RACE_CTX,
  );
  assert.strictEqual(watchdog.classification, CLASS_PROCESS, "a stall-watchdog close is bookkeeping, not a defect");

  const successor = classifyRecord(
    normaliseStreams({ cycles: [cycleRow("633fe486-d557-4d94-b346-48e09c178e19", "2026-08-21T08:24:00Z", "CLOSED BY CYCLE 12953ca8 (v7.0.117, 2026-08-21T08:2xZ), not by itself.")] }).records[0],
    NO_RACE_CTX,
  );
  assert.strictEqual(successor.classification, CLASS_PROCESS, "a closed-by-successor row is bookkeeping, not a defect");

  const lease = classifyRecord(
    normaliseStreams({ cycles: [cycleRow("e36d4379-d2e8-41b1-8bd3-6e1ea5f53f2f", "2026-08-20T20:24:00Z", "Race with concurrent cycle 4da5a7bd (session/cycle-20260820-2006, started 20:07:43Z, 17s before mine).")] }).records[0],
    NO_RACE_CTX,
  );
  assert.strictEqual(lease.classification, CLASS_PROCESS, "a lease race is the runner's own coordination problem");

  // (f) A failed cycle whose notes match NO marker is `unclassified`, not silently process.
  //     Guessing here is how the engine would either heal a ghost or miss a real platform break.
  const unknownCycle = classifyRecord(
    normaliseStreams({ cycles: [cycleRow("00000000-0000-4000-8000-000000000000", "2026-08-26T00:00:00Z", "Something nobody has written a marker for yet.")] }).records[0],
    NO_RACE_CTX,
  );
  assert.strictEqual(
    unknownCycle.classification,
    CLASS_UNCLASSIFIED,
    "CONTROL: an unrecognised failed cycle must NOT default to process — that would make every future " +
      "platform break invisible to the heal engine",
  );
  reached("unknown-cycle-is-unclassified");

  // (g) The race registry itself must still be non-empty and stream-scoped.
  assert.ok(KNOWN_RUNNER_RACES.length >= 4, "the four measured races must still be registered");
  assert.ok(
    KNOWN_RUNNER_RACES.every((r) => [STREAM_HOPS, STREAM_CI, STREAM_CYCLES].includes(r.stream)),
    "every race entry must be scoped to a real stream",
  );
  assert.ok(Number.isFinite(RUNNER_RACE_GRACE_MINUTES) && RUNNER_RACE_GRACE_MINUTES > 0,
    "the race grace is a named constant, never a bare literal at the call site");
}

// ---------------------------------------------------------------------------
// 3. Only `product` files
// ---------------------------------------------------------------------------
function onlyProductFiles() {
  const opts = { threshold: 3, windowStart: WINDOW_START, windowEnd: WINDOW_END };

  // Three raced CI failures — one signature, classified process. Files NOTHING.
  const racedRuns = [
    ciRow(1, RACED_SHA, "2026-08-31T18:20:00Z", [AMBIGUOUS_JOB]),
    ciRow(2, RACED_SHA, "2026-08-31T18:30:00Z", [AMBIGUOUS_JOB]),
    ciRow(3, RACED_SHA, "2026-08-31T18:46:29Z", [AMBIGUOUS_JOB]),
  ];
  const process_ = detectSignatures(normaliseStreams({ ciRuns: racedRuns }).records, [], { ...opts, ctx: RACED_CTX });
  assert.strictEqual(process_.detections.length, 0, "a process signature over threshold must file nothing");
  assert.strictEqual(process_.withheld.length, 1, "and it must be REPORTED as withheld, never silently dropped");
  assert.strictEqual(process_.withheld[0].classification, CLASS_PROCESS);

  // The same three with the race marker gone: unclassified. Also files nothing — for a different,
  // recorded reason.
  const unclassified = detectSignatures(normaliseStreams({ ciRuns: racedRuns }).records, [], { ...opts, ctx: NO_RACE_CTX });
  assert.strictEqual(unclassified.detections.length, 0, "an unclassified signature must file nothing");
  assert.strictEqual(unclassified.withheld[0].classification, CLASS_UNCLASSIFIED);

  // MIXED evidence is not evidence: the live CI signature has 3 process members and 29
  // unclassified ones under ONE hash. A group verdict taken from the majority or the first member
  // would file exactly that.
  const mixedCtx = { now: WINDOW_END, runnerPushes: RACED_PUSHES, runnerPushShas: new Set([RACED_SHA]) };
  const mixed = detectSignatures(
    normaliseStreams({
      ciRuns: [
        ciRow(4, RACED_SHA, "2026-08-31T18:30:00Z", [AMBIGUOUS_JOB]),                                    // process (raced)
        ciRow(5, "aea0c64c171c7f7adfbe2233e7f0efe5fb96d6a5", "2026-09-01T01:18:05Z", [AMBIGUOUS_JOB]),   // unclassified
        ciRow(6, "0ac7bc81c3e51e89552c16aba1887f14051dabdf", "2026-09-01T00:50:23Z", [AMBIGUOUS_JOB]),   // unclassified
      ],
    }).records,
    [],
    { ...opts, ctx: mixedCtx },
  );
  assert.strictEqual(mixed.detections.length, 0, "a mixed-classification signature must never file");
  assert.strictEqual(
    mixed.withheld[0].classification,
    CLASS_UNCLASSIFIED,
    "a group whose members disagree collapses to unclassified — mixed evidence is not evidence",
  );
  reached("mixed-group-collapses-to-unclassified");

  // POSITIVE CONTROL — a product signature over threshold DOES file. Without this every clause
  // above would pass for an engine that files nothing at all, ever.
  const productRecords = normaliseStreams({
    hops: [
      hopRow("11111111-1111-4111-8111-111111111111", "quality-gate", "Anthropic call failed: 529", "2026-08-25T00:00:00Z"),
      hopRow("22222222-2222-4222-8222-222222222222", "quality-gate", "Anthropic call failed: 500", "2026-08-26T00:00:00Z"),
      hopRow("33333333-3333-4333-8333-333333333333", "quality-gate", "Anthropic call failed: 503", "2026-08-27T00:00:00Z"),
    ],
  }).records;
  const fires = detectSignatures(productRecords, [], { ...opts, ctx: NO_RACE_CTX });
  assert.strictEqual(fires.detections.length, 1, "POSITIVE CONTROL: a product signature over threshold must file");
  assert.strictEqual(fires.detections[0].classification, CLASS_PRODUCT);
  assert.strictEqual(fires.detections[0].count, 3, "the 529/500/503 collapse to ONE signature of three");

  // The filed draft carries its stream, its classification and a real row id.
  const draft = buildTicketDraft(fires.detections[0], "LOO-99", {
    windowDays: 14,
    threshold: 3,
    windowStart: WINDOW_START,
    windowEnd: WINDOW_END,
    confirmationWindowDays: DEFAULT_CONFIRMATION_WINDOW_DAYS,
  });
  assert.ok(draft.description.includes(fires.detections[0].sigHash), "the sig hash is the dedup key and must be present");
  assert.ok(draft.description.includes("11111111-1111-4111-8111-111111111111"), "a real row id must be present (§19d)");
  assert.ok(draft.description.includes(`Source stream: \`${STREAM_HOPS}\``), "the ticket must name the stream it came from");
  assert.ok(draft.description.includes(`Classification: **${CLASS_PRODUCT}**`), "the ticket must carry its classification");
  assert.ok(draft.description.includes("M5-12"), "M5-12 binds the row: it holds at partial until non-recurrence is confirmed");
  assert.ok(
    draft.description.includes(`${DEFAULT_CONFIRMATION_WINDOW_DAYS} quiet days`),
    "the confirmation window must be stated on the ticket, from the named constant",
  );
}

// ---------------------------------------------------------------------------
// 4. Fix-confirmation, both directions
// ---------------------------------------------------------------------------
function fixConfirmation() {
  const now = new Date("2026-09-02T00:00:00Z");
  const HASH_QUIET = "aaaaaaaaaaaa";
  const HASH_BACK = "bbbbbbbbbbbb";
  const HASH_UNFILED = "cccccccccccc";
  const HASH_FRESH = "dddddddddddd";

  const states = [
    // Filed, and silent since well before the window opened.
    { sig_hash: HASH_QUIET, backlog_id: "LOO-40", state: "watching", last_seen_at: "2026-08-20T00:00:00Z", confirmation_window_days: DEFAULT_CONFIRMATION_WINDOW_DAYS, recurrence_count: 0 },
    // Already confirmed fixed — and it is back.
    { sig_hash: HASH_BACK, backlog_id: "LOO-41", state: "confirmed_fixed", last_seen_at: "2026-08-10T00:00:00Z", confirmation_window_days: DEFAULT_CONFIRMATION_WINDOW_DAYS, recurrence_count: 0 },
    // Never filed: process/unclassified or below threshold. There is no fix to confirm.
    { sig_hash: HASH_UNFILED, backlog_id: null, state: "watching", last_seen_at: "2026-07-01T00:00:00Z", confirmation_window_days: DEFAULT_CONFIRMATION_WINDOW_DAYS, recurrence_count: 0 },
    // Filed, quiet — but not for long enough yet.
    { sig_hash: HASH_FRESH, backlog_id: "LOO-42", state: "watching", last_seen_at: "2026-08-31T00:00:00Z", confirmation_window_days: DEFAULT_CONFIRMATION_WINDOW_DAYS, recurrence_count: 0 },
  ];

  const seen = new Map([[HASH_BACK, { count: 4, lastSeen: new Date("2026-09-01T12:00:00Z") }]]);
  const out = assessConfirmations(states, seen, { now, confirmationWindowDays: DEFAULT_CONFIRMATION_WINDOW_DAYS });

  assert.deepStrictEqual(
    out.confirmed.map((c) => c.sigHash),
    [HASH_QUIET],
    "exactly the filed signature that went quiet for its whole window is confirmed-fixed",
  );
  assert.strictEqual(out.confirmed[0].backlogId, "LOO-40", "the verdict is recorded against the ticket that filed it");
  assert.strictEqual(
    out.confirmed[0].confirmationWindowDays,
    DEFAULT_CONFIRMATION_WINDOW_DAYS,
    "the verdict carries the window that produced it, read from the row",
  );
  reached("confirmed-fixed");

  assert.deepStrictEqual(
    out.recurred.map((r) => r.sigHash),
    [HASH_BACK],
    "a signature that reappears after confirmation is a recurrence",
  );
  assert.strictEqual(out.recurred[0].backlogId, "LOO-41",
    "the recurrence is recorded against the ORIGINAL ticket, not filed as a fresh duplicate");
  assert.strictEqual(out.recurred[0].recurrenceCount, 1, "the count increments from the row's own value");
  assert.ok(out.suppressed.has(HASH_BACK), "and the recurring signature is suppressed from filing a duplicate");
  reached("recurrence");

  const stillWatchingHashes = out.stillWatching.map((s) => s.sigHash).sort();
  assert.deepStrictEqual(stillWatchingHashes, [HASH_UNFILED, HASH_FRESH].sort(),
    "an unfiled signature and a not-yet-quiet-enough one both stay watching");
  const unfiled = out.stillWatching.find((s) => s.sigHash === HASH_UNFILED);
  assert.match(unfiled.reason, /no ticket was ever filed/,
    "CONTROL: a signature nobody ever fixed cannot have a fix that held — it must never be confirmed-fixed");
  reached("unfiled-never-confirmed");

  // THE WINDOW IS LOAD-BEARING, and it comes from the ROW. Same facts, a longer window on the row:
  // the confirmation must not fire. A confirmation that ignored the window would pass above and
  // fail here.
  const longer = assessConfirmations(
    states.map((s) => (s.sig_hash === HASH_QUIET ? { ...s, confirmation_window_days: 60 } : s)),
    seen,
    { now, confirmationWindowDays: DEFAULT_CONFIRMATION_WINDOW_DAYS },
  );
  assert.deepStrictEqual(longer.confirmed, [],
    "CONTROL: widen the row's own confirmation window and the same quiet signature must NOT be confirmed — " +
      "if it still is, the window is being ignored and the verdict means nothing");

  // A recurrence must not file a duplicate through the detector either.
  const opts = { threshold: 3, windowStart: WINDOW_START, windowEnd: WINDOW_END, ctx: NO_RACE_CTX };
  const productRecords = normaliseStreams({
    hops: [
      hopRow("h1", "quality-gate", "Parse failed and retry also failed", "2026-08-25T00:00:00Z"),
      hopRow("h2", "quality-gate", "Parse failed and retry also failed", "2026-08-26T00:00:00Z"),
      hopRow("h3", "quality-gate", "Parse failed and retry also failed", "2026-08-27T00:00:00Z"),
    ],
  }).records;
  const wouldFile = detectSignatures(productRecords, [], opts);
  assert.strictEqual(wouldFile.detections.length, 1, "baseline: this product signature does file");
  const suppressed = detectSignatures(productRecords, [], {
    ...opts,
    suppressedSignatures: new Set([wouldFile.detections[0].sigHash]),
  });
  assert.strictEqual(suppressed.detections.length, 0,
    "the SAME signature marked as a recurrence must not file a second ticket");
  assert.strictEqual(suppressed.withheld.length, 1, "and the suppression must be reported, not silent");

  // The persisted row keeps a previously filed signature's ticket link when it is seen again.
  // Without this the upsert would null backlog_id and break SES-303's read seam.
  const rows = buildSignatureStateRows(wouldFile.groups, {
    now,
    confirmationWindowDays: DEFAULT_CONFIRMATION_WINDOW_DAYS,
    filedByHash: new Map(),
    existingByHash: new Map([[wouldFile.detections[0].sigHash, {
      sig_hash: wouldFile.detections[0].sigHash,
      backlog_id: "LOO-38",
      filed_at: "2026-08-25T00:00:00Z",
      first_seen_at: "2026-08-01T00:00:00Z",
      state: "watching",
      recurrence_count: 2,
    }]]),
  });
  const row = rows.find((r) => r.sig_hash === wouldFile.detections[0].sigHash);
  assert.strictEqual(row.backlog_id, "LOO-38",
    "CONTROL: re-seeing a filed signature must NOT null its backlog_id — that link is SES-303's read seam");
  assert.strictEqual(row.first_seen_at, "2026-08-01T00:00:00.000Z", "first_seen_at is the earliest ever seen, not this run's");
  assert.strictEqual(row.recurrence_count, 2, "a prior recurrence count is carried forward, never reset");
  assert.strictEqual(row.confirmation_window_days, DEFAULT_CONFIRMATION_WINDOW_DAYS,
    "the window is persisted on every row so a later verdict can be read with the window that produced it");
}

// ---------------------------------------------------------------------------
// 5. Vacuity control — a green run in which no branch fired is not a pass
// ---------------------------------------------------------------------------
function vacuityControl() {
  for (const branch of [
    CLASS_PRODUCT,
    CLASS_PROCESS,
    CLASS_UNCLASSIFIED,
    "confirmed-fixed",
    "recurrence",
    "unfiled-never-confirmed",
    "mixed-group-collapses-to-unclassified",
    "race-matcher-restricted-to-ambiguous-job",
    "unknown-cycle-is-unclassified",
    "dead-stream-reports-zero",
    "all-three-streams-fetched",
  ]) {
    assert.ok(
      BRANCHES_REACHED.has(branch),
      `VACUITY CONTROL: branch \`${branch}\` was never reached by this run's fixtures, so whatever ` +
        "this file asserted about it proved nothing. A green run where every branch was skipped is not a pass.",
    );
  }

  // And the engine must never be run in apply mode from a test path (design rule: v1's
  // insertTicket and insertBeforeImage write real rows). This file imports the module, which must
  // be inert.
  assert.ok(
    /const invokedDirectly = process\.argv\[1\] && import\.meta\.url === pathToFileURL/.test(ENGINE_SRC),
    "importing heal-engine.js must never run main() — the guard that keeps this test from writing real rows",
  );
  // No test may hand the engine the apply flag: v1's insertTicket and insertBeforeImage paths write
  // real rows. This file cannot, because it never spawns a process and never touches process.argv —
  // asserted against its own source rather than promised in a comment.
  // The needles are ASSEMBLED rather than written out, because a literal here would match itself
  // and make the guard permanently red — which is exactly what happened on this file's first run.
  const selfSrc = fs.readFileSync(fileURLToPath(import.meta.url), "utf8");
  const forbidden = ["child" + "_process", "exec" + "Sync", "spawn" + "Sync", "--" + "apply"];
  for (const needle of forbidden) {
    assert.ok(
      !selfSrc.includes(needle),
      `this test must not contain \`${needle}\` — the engine's only writing path is its CLI, and a ` +
        "test that can reach it can file real backlog rows",
    );
  }
}

export default async function run() {
  threeStreamsOneShape();
  classifierDiscriminates();
  onlyProductFiles();
  fixConfirmation();
  vacuityControl();
}

selfRun(import.meta.url, run);
