#!/usr/bin/env node
// DeepBench v7.0.389 | scripts/heal-engine.js | SES-308 -- A PENDING FIX-CONFIRMATION IS AN EXIT 1,
// so the unattended cycle actually applies it. SES-277 made the --apply path persist a verdict on a
// run with nothing new to file; this ship makes the DRY RUN say that there is one. Before it, the
// last third of the loop never ran unattended: runbook step 8b re-runs with --apply only on exit 1,
// exit 1 meant "signatures to file", and a confirmed fix is BY DEFINITION a run with nothing to
// file -- so the verdict was computed, printed in `confirmLine`, and thrown away, every cycle. Every
// row in public.runner_heal_signatures at this ship carried updated_at = 2026-09-02T16:14:42Z, the
// one supervised drill cycle; no unattended cycle had ever written signature state.
//
// FEATURE: SES-308
//
// THREE CHANGES, and the second is a latent defect the drill could not have seen:
//   1. `pendingVerdictCount()` is exported and pure, and the dry run's nothing-to-file path exits 1
//      when it is > 0. `pendingVerdicts` is in the JSON summary on EVERY exit path, and it counts
//      verdicts COMPUTED BUT NOT YET PERSISTED -- so under --apply it is 0, because they just
//      landed. That makes "exit 1 iff there is unfinished work" a contract a cycle can grade.
//   2. `assessConfirmations()` records a recurrence ONCE. A row already in state `recurred` with
//      `last_recurrence_at` set was reported as a NEW recurrence on every run while the signature
//      stayed in the 14-day window, and `verdictPatches()` would re-increment `recurrence_count`
//      each time. Harmless while nothing acted on the count -- and actively harmful the moment
//      change 1 makes every computed recurrence trigger an --apply. A sighting no later than the
//      stored `last_recurrence_at` is now `stillWatching` with a reason. The hash stays in
//      `suppressed`, so the detector still cannot file a duplicate for it.
//   3. `--apply` no longer demands `--backlog-ids` up front. FOUND LIVE THIS SESSION, and it makes
//      change 1's own instruction unrunnable without it: main()'s first gate failed 2 on
//      `APPLY && !--backlog-ids` BEFORE reaching the nothing-to-file branch, so the "re-run with
//      --apply --cycle-id=<uuid>, no ids needed" remedy this ship prints would have exited 2 every
//      time. The requirement now lives where it is actually needed -- `parseBacklogIds()`, after the
//      nothing-to-file branch returns -- so filing WITHOUT ids still exits 2, unchanged.
//
// DeepBench v7.0.372 | scripts/heal-engine.js | SES-276 -- HEAL v2. Three things change and one
// thing deliberately does not.
//
// FEATURE: SES-276
//
// 1. THE INPUTS ARE WIDENED, BECAUSE v1 GUARDED A DEAD LEDGER. Re-measured live 2026-09-02 rather
//    than quoted from the ticket: `durable_hops` holds 1,782 rows (260 `failed`) whose NEWEST row of
//    any status is 2026-08-23 -- dead for ten days -- while `ci_run_conclusions` holds 57 rows
//    through 2026-09-02, 32 of them carrying a failed job. v1 read only the first. The M4 gate
//    review's Chief Architect lens put it exactly: "a heal v2 that only re-files durable_hops
//    recurrences would guard an empty ledger while the actual failures stream past it."
//    `durable_hops` is KEPT. It is dead today, not retired -- a stream that resumes must not need a
//    code change to be seen again, and this run reports its zero as a zero rather than as absence.
//
// 2. EVERY RECORD IS CLASSIFIED, AND ONLY `product` MAY FILE. The PM lens's warning is a hard
//    design constraint and tonight supplied the evidence for it: most red CI runs are the runner's
//    OWN races, not product defects. Measured on the live table at this ship -- all 32 CI failures
//    name the same single failing job, and the three that sit on a commit the runner itself pushed
//    all concluded while that very cycle was still open (33426662625 / 27cd58a9, 33362760570 /
//    69725495, 33356302494 / d913b001 -- and all three of those cycles SHIPPED). A heal engine that
//    filed those would generate noise faster than the board can absorb it.
//
// 3. FIX-CONFIRMATION EXISTS. v1 filed a recurrence once and never learned whether the fix held.
//    `public.runner_heal_signatures` (migration `ses276_runner_heal_signatures`) now records, per
//    signature: confirmed-fixed when it goes quiet for the confirmation window, and a recurrence
//    against the ORIGINAL when it comes back -- never a fresh duplicate ticket. That table is
//    SES-303's read seam for outcome telemetry; this file does not otherwise touch it.
//
// WHAT DOES NOT CHANGE: detection never auto-fixes, the before-image precedes every insert, ids are
// never minted here, and a run without `--apply` writes NOTHING -- including to the new table.
//
// 4. [SES-277, 2026-09-02 -- FOUND BY THE SEEDED-FAILURE DRILL, the first time the loop was walked
//    end to end.] A run WITH `--apply` that has NOTHING NEW TO FILE still persists occurrence state
//    and the confirmation verdicts. Before this, `main()` finished early on "nothing new to file"
//    BEFORE the state upsert and the verdict PATCHes -- and a signature whose failure has STOPPED
//    is, by definition, a run with nothing new to file. So `confirmed_fixed` was reported in the
//    JSON and never written to the table: the drill's step 5 read `state = watching` after an
//    apply that had just printed "1 confirmed-fixed". `persistSignatureState()` is now the single
//    write path both branches use, and `verdictPatches()` is pure so the regression test can grade
//    the verdict shape without the network.
//
// -- THE ONE PLACE THIS SHIP DEPARTS FROM ITS OWN KICKOFF, said out loud rather than buried -------
// The kickoff's Task 2 offers the rule "a CI failure that reproduces on a commit the runner did not
// push is `product`". Implemented literally it would have filed noise: 29 of the 32 live CI
// failures sit on commits the runner did not push, and those are the manual governance ships whose
// reds the kickoff's own Section 2 measures as doc drift and races -- not product defects. So
// not-runner-pushed is RECORDED on every CI record and reported, but it is necessary, never
// sufficient. What promotes a CI failure to `product` is a failing job that CANNOT be produced by
// runner state (see DETERMINISTIC_CI_JOBS). Everything else is `unclassified`, and `unclassified`
// never files. Guessing here is how the engine heals ghosts.
//
// -- WHY A CI RECORD IS SO OFTEN `unclassified`, and it is a real evidential limit ---------------
// `ci_run_conclusions.jobs` is written by `.github/workflows/ci.yml`'s `report-conclusion` job as
// job-level conclusions ONLY -- two fixed names, each with `success`/`failure`, no step name and no
// log. The blocking `checks` job runs BOTH the session-docs tripwire (governance-doc drift: process)
// AND the regression suite (product). A red on that job therefore cannot be attributed to either
// half from this table, and the engine says `unclassified` instead of picking one. Two markers that
// would resolve it are provably unavailable today and are named so a later session does not go
// looking: the workflow posts with `on_conflict=commit_sha` + `resolution=merge-duplicates`, so a
// green re-run OVERWRITES the red row and "same sha later concluded success" can never be observed;
// and no step-level detail is published at all.
//
// DeepBench v7.0.183 | scripts/heal-engine.js | SES-118 -- the filed ticket's status literal
// tracks the renamed CHECK: 'missing' -> 'open'. This file was NOT on SES-118's own blast-radius
// list (which named recompute_backlog_queue(), the step-5 selection query and check-session-docs.js,
// all of which match done/removed/removal-proposed and never 'missing'); it was found by grepping
// the tree fresh. It is the one place that WRITES the value, so replacing the CHECK without this
// line would have made step 8b's heal sweep raise 23514 on the next recurring failure it detected
// -- a break that only shows up when something else has already gone wrong.
// DeepBench v7.0.108 | scripts/heal-engine.js | SES-89
// FEATURE: SES-89 -- the Heal engine (ARCHITECTURE.md §19v's third engine). Reads the platform's
// own failure ledger, groups failures into recurring signatures, and auto-files evidenced
// `P9 - Bug Fixes` backlog tickets that then ride the normal queue.
//
// DETECTION NEVER AUTO-FIXES. This script performs exactly one kind of write -- an INSERT into
// public.backlog_items, each one preceded by its before-image row -- and never an UPDATE, a
// DELETE, or any DDL. The fix for anything it files runs the full session ceremony in a later
// cycle, like any other backlog ticket.
//   [AMENDED BY SES-276.] It now performs a SECOND kind of write, also only under `--apply`: an
//   upsert into public.runner_heal_signatures, which is engine bookkeeping about signatures and
//   never a change to the board. Everything above still holds for backlog_items.
//
// -- Why durable_hops and not ai_activity_log ------------------------------------------------
// The SES-89 ticket text says to read "ai_activity_log error rates and anomalies". Verified live
// 2026-08-20 against the real table: `ai_activity_log` has 34,449 rows and 28 columns, and NONE
// of them is a status/error/success field. The only error-adjacent data in it is
// `call_facts.http_status`, which appears on 28 rows ever, 5 of them non-200 (all
// `article-extraction`, all late July). There is no error rate in there to read.
//
// The platform's real error ledger is `public.durable_hops`: 260 rows with status='failed', all
// 260 carrying non-null, mechanically classifiable error text (vs 1,198 complete / 322
// in_progress, which carry none). That is what v1 reads. The ticket's other three signals were
// dropped for cause, recorded here so a later session does not re-litigate them:
//   * regression trends -- no table persists suite results; the output exists only in session
//     transcripts, so there is nothing to query.
//   * Vercel logs -- no verified access path to runtime logs exists in this repo
//     (check-deploy-current.js reads deployment state, not logs). Inventing one would be a claim
//     without a source.
//   * stale in_progress hops -- checkpoint/resume semantics make "stuck" versus "legitimately
//     parked" a judgment call, and v1 should not automate a judgment call.
// The `call_facts.http_status` rows are the documented v1.1 extension point: same signature
// pipeline, deliberately not built on a 5-row population.
//
// -- The threshold, and why it is 3-in-14-days ----------------------------------------------
// Measured against all 260 failed hops: 30 distinct signatures -- 16 with >=3 occurrences, 6
// with exactly 2, 8 singletons. At >=3 the 16 real signatures fire and every singleton and
// doubleton stays quiet. At >=2 the noise files. At >=5 the `quality-gate` /
// "operation was aborted due to timeout" signature -- 6 occurrences spread over 6 distinct days,
// a genuine slow-burn defect -- would never file at all. The window is 14 days rather than 7
// because slow-burn signatures accumulate across weeks; idempotency comes from the dedup below,
// never from the window.
//
// -- Dedup: derivable from existing rows, no new table --------------------------------------
// Every ticket this engine files carries the literal line "Heal signature: `<sig_hash>`" in its
// description. Before filing, the engine asks backlog_items for any row with
// source_file='heal-engine' whose description contains that hash, in ANY status. If one exists,
// the signature never files again. The runner fires every 3 hours; without this it would file
// the same defect eight times a day forever.
//
// Known v1 limitation, stated rather than hidden: a signature that was fixed and later recurs
// will NOT re-file, because the dedup matches closed tickets too. That is the right default for
// an unattended loop, and recurrence detection is the natural v1.1 alongside the http_status
// detector.
//   [ANSWERED BY SES-276.] The recurrence is no longer invisible: it is RECORDED against the
//   original signature in runner_heal_signatures (state `recurred`, `recurrence_count`,
//   `last_recurrence_at`). Not re-filing stays the behaviour; not KNOWING was the defect.
//
// Usage:
//   node scripts/heal-engine.js [--apply] [--cycle-id=<uuid>] [--backlog-ids=<ids>]
//                               [--window-days=<n>] [--threshold=<n>] [--max-filings=<n>]
//                               [--confirmation-window-days=<n>] [--until=<iso>] [--json]
//
//   --apply           Actually file tickets and persist signature state. Default is a DRY RUN that
//                     writes nothing at all, to either table.
//   --cycle-id=<uuid> Required with --apply. The open runner_cycles row every before-image row
//                     is bound to (runner_before_images.cycle_id is a real FK).
//   --backlog-ids=<>  Required with --apply ONLY WHEN the dry run listed signatures to file
//                     (SES-308). Comma-separated ids the CYCLE claimed atomically (e.g.
//                     LOO-38,LOO-39). This script never mints an id itself -- see the "Why this
//                     script does NOT claim its own ids" note below. An --apply run whose only
//                     work is persisting fix-confirmation verdicts needs no ids and must not
//                     claim any: there is nothing to file, so a claimed block would be burnt.
//   --window-days=<n> Detection lookback window. Default 14.
//   --threshold=<n>   Occurrences within the window before a signature files. Default 3.
//   --max-filings=<n> Hard cap on tickets filed in one run. Default 3.
//   --confirmation-window-days=<n>
//                     Quiet period before a filed signature is recorded confirmed-fixed.
//                     Default DEFAULT_CONFIRMATION_WINDOW_DAYS.
//   --until=<iso>     Move the window's END, for QA against historical data. Default now.
//   --json            Single-line machine-readable summary instead of prose.
//
// Exit codes:
//   0  ran cleanly -- nothing new to file, or --apply filed everything it detected
//   1  the dry run has unfinished work for a cycle to apply. EITHER it detected signatures that
//      are over threshold, classified `product`, and not yet filed; OR [SES-308] it computed
//      fix-confirmation verdicts that are not yet persisted (`pendingVerdicts > 0`). Both are the
//      same "there is drift" signal --check plays in scripts/export-backlog-snapshot.js, and both
//      are answered by the same re-run with --apply. --backlog-ids is needed for the FIRST case
//      only; the JSON's `detections` array says which case fired.
//   2  cannot run -- missing env, a Supabase REST failure, --apply without a valid --cycle-id, or
//      --apply with signatures to file but no --backlog-ids. Deliberately distinct from 1: an
//      unrunnable check must never read as a pass, and must not be confused with a real detection
//      either.
//
// Env (read from process.env only -- never hardcoded, never printed):
//   SUPABASE_URL           Project REST base, e.g. https://xxxx.supabase.co
//   SUPABASE_SERVICE_KEY   Service-role key. Required: DAT-18 left anon/authenticated with zero
//                          write privileges on backlog_items, so filing needs the service role.
//                          runner_heal_signatures holds zero public grants for the same reason.
//
// Pure helpers (normalizeErrorClass, signatureOf, signatureOfRecord, the three normalisers,
// classifyRecord, detectSignatures, detect, buildTicketDraft, assessConfirmations) are exported so
// the regression tests can exercise the whole pipeline with zero network and zero disk access. The
// network/CLI path only runs when this file is executed directly -- see the pathToFileURL guard at
// the bottom.

import crypto from "crypto";
import { pathToFileURL } from "url";

const PAGE_SIZE = 500;
const MAX_PAGES = 200;

const DEFAULT_WINDOW_DAYS = 14;
const DEFAULT_THRESHOLD = 3;
const DEFAULT_MAX_FILINGS = 3;

// SES-276. The quiet period a filed signature must survive before the engine records it
// confirmed-fixed. NAMED, never a bare literal at the call site -- this codebase has paid for a
// bare literal three times (SES-146, SES-269) -- and additionally PERSISTED per row in
// runner_heal_signatures.confirmation_window_days, so a verdict always carries the window that
// produced it and a later change to this constant cannot silently restate old verdicts.
//
// 7 days rather than 14: the detection window is 14 (see the threshold note above), so a
// confirmation window of 14 could not distinguish "fixed" from "not yet re-detected" -- the
// signature would still be inside its own detection window when the verdict was taken. Half the
// detection window is the shortest span that is unambiguously outside it.
export const DEFAULT_CONFIRMATION_WINDOW_DAYS = 7;

// SES-276. How long after a runner cycle's own close a CI run may still be grading that cycle's
// push. Named because it is the tolerance on the SES-261 race match, not an arbitrary pad:
// measured on all three live runner-pushed CI failures, each concluded INSIDE its cycle's open
// window (33426662625 concluded 18:46:29 against cycle 27cd58a9 open 18:13:12->18:49:14), so the
// grace is slack for the close-out write landing before the run reports, never the thing that
// makes the match.
export const RUNNER_RACE_GRACE_MINUTES = 30;

// The prefix heal tickets are filed under. durable_hops is LOO's documented domain
// (docs/SCREEN-INVENTORY.md: LOO == the agent-to-agent delegation mechanism and its
// checkpoint/resume ledger), so a failure signature read out of that table is a LOO finding.
// An individual root cause may really be HAR-side; each ticket says so, and SES-85's
// classification sweep may rebucket.
const HEAL_PREFIX = "LOO";

// The sentinel that marks a row as machine-filed. It is also what keeps heal rows out of the
// markdown files' (source_file, row_ordinal) space, and what any future markdown->DB
// reconciliation must add to its ignore-list.
const HEAL_SOURCE_FILE = "heal-engine";

// SES-276: the fix-confirmation store. Migration `ses276_runner_heal_signatures`; down registered
// in runner_migration_downs as auto-downable.
const HEAL_STATE_TABLE = "runner_heal_signatures";

const HOP_COLUMNS = ["id", "capability_slug", "status", "error", "created_at"];
const CI_COLUMNS = ["run_id", "commit_sha", "jobs", "concluded_at"];
const CYCLE_COLUMNS = ["id", "started_at", "ended_at", "outcome", "trigger", "notes", "push_sha", "item_id"];

// ---------------------------------------------------------------------------
// SES-276: the three streams, and the one shape they are all normalised into
// ---------------------------------------------------------------------------

export const STREAM_HOPS = "durable_hops";
export const STREAM_CI = "ci_run_conclusions";
export const STREAM_CYCLES = "runner_cycles";
export const STREAMS = [STREAM_HOPS, STREAM_CI, STREAM_CYCLES];

export const CLASS_PRODUCT = "product";
export const CLASS_PROCESS = "process";
export const CLASS_UNCLASSIFIED = "unclassified";

// A CI job whose failure CANNOT be produced by runner state: it checks out the commit and runs
// `npm ci && npm run build`, reads no governance snapshot, holds no credential, and races nothing
// a cycle is doing. A red here is a real break on that tree. Measured at this ship: 0 of 57 live
// runs, so this branch has never fired on real data -- which is reported as a zero, not hidden.
const DETERMINISTIC_CI_JOBS = ["Build (blocking)"];

// The AMBIGUOUS job: one job runs the session-docs tripwire (governance-doc drift -> process) AND
// the regression suite (-> product), and `jobs` records only the job's own conclusion. All 32 live
// CI failures are exactly this job. Never promote a red here to `product` on job name alone.
const AMBIGUOUS_CI_JOBS = ["Tripwire + regression (blocking)"];

// -- Known runner races: the runner's own noise, never a product defect -----------------------
// Each entry carries the ticket that documented the race and a matcher over EVIDENCE ON THE ROW,
// never over a guess. A record matching one of these is `process`: counted, reported, never filed.
export const KNOWN_RUNNER_RACES = [
  {
    id: "ci-grades-the-cycles-own-close",
    ticket: "SES-261",
    stream: STREAM_CI,
    // EVIDENCE, measured live 2026-09-02: exactly three of the 32 failing CI runs sit on a commit
    // the runner itself pushed, and all three concluded while that cycle was still open or within
    // the grace of its close -- while all three of those cycles SHIPPED. That is CI grading a
    // cycle's own in-flight close (SES-261's CLAUDE-STATE freshness check against a ledger the
    // cycle has not finished writing), not a defect the cycle shipped.
    //
    // Restricted to the ambiguous job set on purpose: a `Build (blocking)` red cannot be caused by
    // an unfinished close-out write, so widening this matcher to any failing job would launder a
    // real build break into process noise.
    matches(rec, ctx = {}) {
      const jobs = rec?.raw?.failedJobs ?? [];
      if (jobs.length === 0) return false;
      if (!jobs.every((j) => AMBIGUOUS_CI_JOBS.includes(j))) return false;
      const push = (ctx.runnerPushes ?? []).find((p) => p.sha && p.sha === rec.raw.commitSha);
      if (!push) return false;
      const at = new Date(rec.occurredAt).getTime();
      const from = new Date(push.startedAt).getTime();
      const closedAt = push.endedAt ? new Date(push.endedAt).getTime() : (ctx.now ? ctx.now.getTime() : Date.now());
      const to = closedAt + RUNNER_RACE_GRACE_MINUTES * 60 * 1000;
      if (!Number.isFinite(at) || !Number.isFinite(from) || !Number.isFinite(to)) return false;
      return at >= from && at <= to;
    },
  },
  {
    id: "stall-watchdog-close",
    ticket: "SES-194",
    stream: STREAM_CYCLES,
    // EVIDENCE: register B37's watchdog sets outcome='failed' on a cycle that WENT SILENT and says
    // so in the notes in as many words -- "not a verdict on the work". Two of the six live failed
    // cycles (039d1477, e4074c97) carry exactly this banner.
    matches: (rec) => /CLOSED BY STALL WATCHDOG/i.test(rec?.detail ?? ""),
  },
  {
    id: "closed-by-successor",
    ticket: "B37",
    stream: STREAM_CYCLES,
    // EVIDENCE: three live rows (db8b9eee, 633fe486, ba8f2ce3) were closed `failed` by a LATER
    // cycle under the 24h evidence bar. Two of the three then appended their own correction saying
    // they were alive and working the whole time. Bookkeeping, not a defect.
    matches: (rec) => /CLOSED BY (SUCCESSOR|CYCLE)\b/i.test(rec?.detail ?? ""),
  },
  {
    id: "concurrent-cycle-race",
    ticket: "B31",
    stream: STREAM_CYCLES,
    // EVIDENCE: e36d4379 -- two cycles started 17 seconds apart, both built ADM-1, the loser was
    // marked failed. That race is what the runner_lease exists to prevent; it is the runner's own
    // coordination problem and the product is untouched by it.
    matches: (rec) => /\bRace with concurrent cycle\b/i.test(rec?.detail ?? ""),
  },
];

// ---------------------------------------------------------------------------
// Pure core -- no network, no disk, no clock beyond what is passed in
// ---------------------------------------------------------------------------

// An error class is the first line of the error text with digit-runs collapsed, so that
// "Anthropic call failed: 529" and "Anthropic call failed: 500" are recognised as one recurring
// defect rather than two singletons. Only the first line, because the tail is usually a stack or
// a payload echo that differs on every occurrence and would shatter the grouping.
export function normalizeErrorClass(errorText) {
  if (typeof errorText !== "string") return "";
  const firstLine = errorText.split("\n")[0].trim();
  return firstLine.replace(/\d+/g, "N").slice(0, 120);
}

export function signatureOf(hop) {
  const capability = hop.capability_slug || "(none)";
  const errorClass = normalizeErrorClass(hop.error);
  const key = `${capability}|${errorClass}`;
  return {
    capability,
    errorClass,
    key,
    hash: crypto.createHash("sha256").update(key).digest("hex").slice(0, 12),
  };
}

// SES-276. The signature of a normalised record.
//
// durable_hops keeps v1's EXACT key -- `${scope}|${errorClass}` with no stream prefix -- so a hash
// already written into a filed ticket's description stays the same hash and the substring dedup
// keeps working across this upgrade. (Zero heal tickets exist today, verified live at this ship,
// so nothing depends on it yet; it is preserved anyway because the day it matters is the day
// nobody would think to check.) The two new streams ARE namespaced by stream, which is what stops
// a CI job set colliding with a capability slug that happens to share a name.
export function signatureOfRecord(rec) {
  const scope = rec.scope || "(none)";
  const errorClass = rec.errorClass || "";
  const key = rec.stream === STREAM_HOPS
    ? `${scope}|${errorClass}`
    : `${rec.stream}|${scope}|${errorClass}`;
  return {
    stream: rec.stream,
    scope,
    errorClass,
    key,
    hash: crypto.createHash("sha256").update(key).digest("hex").slice(0, 12),
  };
}

// -- The three normalisers. Each returns ONE failure record or null ---------------------------
// Every record carries, at minimum: the source stream, when it occurred, the material a signature
// is built from, and a link back to the exact row it came from (§19d: every claim traces to a row).

export function normaliseHopRow(hop) {
  if (!hop || hop.status !== "failed" || !hop.error) return null;
  return {
    stream: STREAM_HOPS,
    rowRef: hop.id,
    rowLink: `public.durable_hops.id = ${hop.id}`,
    occurredAt: hop.created_at,
    scope: hop.capability_slug || "(none)",
    errorClass: normalizeErrorClass(hop.error),
    detail: hop.error,
    raw: hop,
  };
}

export function normaliseCiRow(run) {
  if (!run) return null;
  const jobs = Array.isArray(run.jobs) ? run.jobs : [];
  const failedJobs = jobs
    .filter((j) => String(j?.conclusion ?? "").toLowerCase() === "failure")
    .map((j) => String(j?.name ?? "(unnamed job)"))
    .sort();
  // A green run is not a failure record. It is still counted as a row read -- the caller reports
  // rows-read separately from records-produced, so "nothing failed" never reads as "nothing there".
  if (failedJobs.length === 0) return null;
  return {
    stream: STREAM_CI,
    rowRef: String(run.run_id),
    rowLink: `public.ci_run_conclusions.run_id = ${run.run_id} (commit ${run.commit_sha})`,
    occurredAt: run.concluded_at,
    scope: "ci-run",
    errorClass: `failing jobs: ${failedJobs.join(" + ")}`,
    detail: `run ${run.run_id} on commit ${run.commit_sha}: ${failedJobs.join(", ")} concluded failure`,
    raw: { runId: run.run_id, commitSha: run.commit_sha, failedJobs },
  };
}

export function normaliseCycleRow(cycle) {
  if (!cycle || cycle.outcome !== "failed") return null;
  const notes = cycle.notes || "(no notes)";
  return {
    stream: STREAM_CYCLES,
    rowRef: cycle.id,
    rowLink: `public.runner_cycles.id = ${cycle.id}`,
    // A failed cycle's failure time is its CLOSE, not its start -- five of the six live rows were
    // closed hours or days after they opened, by someone else.
    occurredAt: cycle.ended_at || cycle.started_at,
    scope: cycle.trigger || "(none)",
    errorClass: normalizeErrorClass(notes),
    detail: notes,
    raw: cycle,
  };
}

// Normalises all three streams behind one shape. Returns the records AND the per-stream row counts,
// because "durable_hops produced 0 records from 0 rows" and "durable_hops was not read" must never
// look the same in the report.
export function normaliseStreams({ hops = [], ciRuns = [], cycles = [] } = {}) {
  const records = [];
  const rowsRead = { [STREAM_HOPS]: hops.length, [STREAM_CI]: ciRuns.length, [STREAM_CYCLES]: cycles.length };
  const produced = { [STREAM_HOPS]: 0, [STREAM_CI]: 0, [STREAM_CYCLES]: 0 };

  for (const row of hops) {
    const rec = normaliseHopRow(row);
    if (rec) { records.push(rec); produced[STREAM_HOPS] += 1; }
  }
  for (const row of ciRuns) {
    const rec = normaliseCiRow(row);
    if (rec) { records.push(rec); produced[STREAM_CI] += 1; }
  }
  for (const row of cycles) {
    const rec = normaliseCycleRow(row);
    if (rec) { records.push(rec); produced[STREAM_CYCLES] += 1; }
  }

  return { records, rowsRead, produced };
}

// -- Classification -----------------------------------------------------------------------------
// `product` may file. `process` and `unclassified` never do. The reason is recorded on the record
// and travels into the report and, under --apply, into runner_heal_signatures.
export function classifyRecord(rec, ctx = {}) {
  const race = KNOWN_RUNNER_RACES.find((r) => r.stream === rec.stream && r.matches(rec, ctx));
  if (race) {
    return {
      classification: CLASS_PROCESS,
      reason: `known runner race \`${race.id}\` (${race.ticket}) — the runner's own noise, not a product failure`,
    };
  }

  if (rec.stream === STREAM_HOPS) {
    // A failed hop is a capability execution failing inside the product's own runtime, carrying a
    // real capability slug and real error text. This is v1's shipped behaviour preserved verbatim,
    // not a new claim -- and the filed ticket still carries v1's triage note pointing at the
    // failureClass contract, because a transient class that already recovered is not the same bug
    // as a permanent one.
    return {
      classification: CLASS_PRODUCT,
      reason: `a \`${rec.scope}\` capability execution failed in the product's own runtime (durable_hops carries the slug and the error text)`,
    };
  }

  if (rec.stream === STREAM_CI) {
    const failedJobs = rec.raw?.failedJobs ?? [];
    const deterministic = failedJobs.filter((j) => DETERMINISTIC_CI_JOBS.includes(j));
    if (deterministic.length > 0) {
      const pushed = ctx.runnerPushShas instanceof Set ? ctx.runnerPushShas.has(rec.raw?.commitSha) : false;
      return {
        classification: CLASS_PRODUCT,
        reason:
          `\`${deterministic.join(", ")}\` failed — a job that checks out the commit and builds it, ` +
          `holding no credential and racing nothing a cycle is doing, so its red cannot be runner state` +
          (pushed ? " (commit was runner-pushed, which does not soften a build break)" : " (commit was not runner-pushed)"),
      };
    }
    const pushed = ctx.runnerPushShas instanceof Set ? ctx.runnerPushShas.has(rec.raw?.commitSha) : false;
    return {
      classification: CLASS_UNCLASSIFIED,
      reason:
        `only ambiguous job(s) failed (\`${failedJobs.join(", ")}\`), and that job runs BOTH the ` +
        `governance-doc tripwire (process) and the regression suite (product); ci_run_conclusions.jobs ` +
        `records job-level conclusions only, so the two cannot be told apart from this row` +
        (pushed
          ? ". The commit was runner-pushed but the run falls outside the pushing cycle's window, so the SES-261 race does not explain it either"
          : ". The commit was not runner-pushed — recorded, but not on its own enough to call this a product failure"),
    };
  }

  if (rec.stream === STREAM_CYCLES) {
    // No known-race marker matched. A failed cycle with unrecognised notes is exactly the case
    // where guessing is worst: it could be a genuine platform break or a seventh flavour of
    // bookkeeping nobody has written a marker for yet. Report it and let a human look.
    return {
      classification: CLASS_UNCLASSIFIED,
      reason:
        "a failed runner cycle whose notes match no known-race marker — could be a real platform " +
        "break or an unrecorded flavour of runner bookkeeping, and this row cannot tell which",
    };
  }

  return { classification: CLASS_UNCLASSIFIED, reason: `unknown stream \`${rec.stream}\`` };
}

// -- Grouping ------------------------------------------------------------------------------------
// Groups classified records into signatures, drops everything under threshold, drops everything
// already filed or already recorded as a recurrence, and returns the survivors newest-pain-first
// (highest count wins; ties broken by most recent occurrence, so a fresh regression outranks an
// equally-sized stale one).
//
// A GROUP FILES ONLY IF EVERY MEMBER CLASSIFIED `product`. That is not defensive tidying: the
// live CI signature has 3 `process` members and 29 `unclassified` ones under ONE hash (the failing
// job set is identical across all 32), so a group verdict taken from the majority, the first
// member, or the strongest member would file the exact noise this ticket exists to refuse. Mixed
// evidence is not evidence.
export function detectSignatures(records, existingDescriptions = [], opts = {}) {
  const threshold = opts.threshold ?? DEFAULT_THRESHOLD;
  const windowStart = opts.windowStart instanceof Date ? opts.windowStart : null;
  const windowEnd = opts.windowEnd instanceof Date ? opts.windowEnd : null;
  const ctx = opts.ctx ?? {};
  const classify = opts.classify ?? classifyRecord;
  const suppressed = opts.suppressedSignatures instanceof Set ? opts.suppressedSignatures : new Set();

  const groups = new Map();
  const byClassification = { [CLASS_PRODUCT]: 0, [CLASS_PROCESS]: 0, [CLASS_UNCLASSIFIED]: 0 };
  const inWindow = [];

  for (const rec of records) {
    const at = new Date(rec.occurredAt);
    if (Number.isNaN(at.getTime())) continue;
    if (windowStart && at < windowStart) continue;
    if (windowEnd && at > windowEnd) continue;

    const { classification, reason } = classify(rec, ctx);
    rec.classification = classification;
    rec.classificationReason = reason;
    byClassification[classification] = (byClassification[classification] ?? 0) + 1;
    inWindow.push(rec);

    const sig = signatureOfRecord(rec);
    let group = groups.get(sig.key);
    if (!group) {
      group = {
        stream: rec.stream,
        // `capability` is v1's field name and stays -- SES-89's guard and buildTicketDraft both
        // read it. For the new streams it carries the record's scope.
        capability: sig.scope,
        scope: sig.scope,
        errorClass: sig.errorClass,
        sigHash: sig.hash,
        signatureKey: sig.key,
        count: 0,
        firstSeen: at,
        lastSeen: at,
        samples: [],
        classifications: new Set(),
        classificationReasons: [],
      };
      groups.set(sig.key, group);
    }

    group.count += 1;
    if (at < group.firstSeen) group.firstSeen = at;
    if (at > group.lastSeen) group.lastSeen = at;
    group.classifications.add(classification);
    if (group.classificationReasons.length < 3 && !group.classificationReasons.includes(reason)) {
      group.classificationReasons.push(reason);
    }
    // Keep up to 3 real row ids as evidence. §19d: every claim traces to a row.
    if (group.samples.length < 3) {
      group.samples.push({ id: rec.rowRef, at: rec.occurredAt, error: rec.detail, link: rec.rowLink });
    }
  }

  const alreadyFiled = [];
  const detections = [];
  const withheld = [];

  for (const group of groups.values()) {
    const classes = [...group.classifications];
    group.classification = classes.length === 1 ? classes[0] : CLASS_UNCLASSIFIED;
    group.classificationReason = classes.length === 1
      ? group.classificationReasons.join("; ")
      : `mixed evidence across ${group.count} occurrence(s) — members classified ${classes.sort().join(" + ")}; mixed evidence is not evidence`;

    if (group.count < threshold) continue;

    if (group.classification !== CLASS_PRODUCT) {
      withheld.push(group);
      continue;
    }
    if (suppressed.has(group.sigHash)) {
      // A recorded recurrence of a signature whose ticket already exists. Recorded against the
      // original (assessConfirmations), never re-filed as a duplicate.
      withheld.push(group);
      continue;
    }
    const filed = existingDescriptions.some((d) => typeof d === "string" && d.includes(group.sigHash));
    if (filed) {
      alreadyFiled.push(group);
      continue;
    }
    detections.push(group);
  }

  detections.sort((a, b) => b.count - a.count || b.lastSeen - a.lastSeen);

  return {
    detections,
    alreadyFiled,
    withheld,
    signaturesSeen: groups.size,
    groups: [...groups.values()],
    recordsInWindow: inWindow,
    byClassification,
  };
}

// v1's entry point, preserved exactly: hops in, the same three fields out. Kept because
// tests/regression/SES-89-heal-detector.js is the guard on the detector's discriminating
// properties and must keep exercising the shipped code path rather than a copy of it.
export function detect(failedHops, existingDescriptions, opts = {}) {
  const records = (failedHops ?? []).map(normaliseHopRow).filter(Boolean);
  const result = detectSignatures(records, existingDescriptions, opts);
  return {
    detections: result.detections,
    alreadyFiled: result.alreadyFiled,
    signaturesSeen: result.signaturesSeen,
  };
}

function excerpt(text, max = 300) {
  const oneLine = String(text ?? "").replace(/\s+/g, " ").trim();
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}

// The per-stream "prove it yourself" query that goes in the ticket. One per stream, because a
// durable_hops query pasted under a CI finding is worse than no query at all.
function reproduceBlock(group) {
  if (group.stream === STREAM_CI) {
    return [
      "```sql",
      `select run_id, commit_sha, concluded_at, jobs`,
      `from public.ci_run_conclusions c`,
      `where exists (select 1 from jsonb_array_elements(c.jobs) j where j->>'conclusion' = 'failure')`,
      `order by concluded_at desc;`,
      "```",
    ].join("\n");
  }
  if (group.stream === STREAM_CYCLES) {
    return [
      "```sql",
      `select id, started_at, ended_at, trigger, outcome, notes`,
      `from public.runner_cycles`,
      `where outcome = 'failed'`,
      `  and trigger = '${String(group.scope).replace(/'/g, "''")}'`,
      `order by started_at desc;`,
      "```",
    ].join("\n");
  }
  return [
    "```sql",
    `select id, capability_slug, created_at, error`,
    `from public.durable_hops`,
    `where status = 'failed'`,
    `  and capability_slug = '${group.capability}'`,
    `  and left(regexp_replace(split_part(error, E'\\n', 1), '[0-9]+', 'N', 'g'), 120) = '${group.errorClass.replace(/'/g, "''")}'`,
    `order by created_at desc;`,
    "```",
  ].join("\n");
}

// Builds the exact row that will be inserted. Kept pure so the regression test can assert the
// evidence block's shape -- particularly that the sig hash and at least one real row id are
// present, which is what makes the ticket traceable and the dedup work.
export function buildTicketDraft(group, backlogId, opts = {}) {
  const windowDays = opts.windowDays ?? DEFAULT_WINDOW_DAYS;
  const threshold = opts.threshold ?? DEFAULT_THRESHOLD;
  const confirmationWindowDays = opts.confirmationWindowDays ?? DEFAULT_CONFIRMATION_WINDOW_DAYS;
  const windowStart = opts.windowStart ? opts.windowStart.toISOString() : "(unbounded)";
  const windowEnd = opts.windowEnd ? opts.windowEnd.toISOString() : "(now)";
  const stream = group.stream ?? STREAM_HOPS;

  const shortClass = group.errorClass.length > 60
    ? `${group.errorClass.slice(0, 60)}…`
    : group.errorClass;

  const title = `[Heal] ${group.capability}: ${shortClass} (${group.count}× in ${windowDays}d)`;

  const sampleLines = group.samples
    .map((s) => `  - \`${s.id}\` @ ${s.at} — ${excerpt(s.error)}`)
    .join("\n");

  const description = [
    `**P9 - Bug Fixes.** **Auto-filed by the Heal engine (\`SES-89\`, v2 \`SES-276\`) — not yet triaged by a human.**`,
    ``,
    `A recurring failure signature crossed the filing threshold in \`public.${stream}\`.`,
    ``,
    `Heal signature: \`${group.sigHash}\``,
    `Source stream: \`${stream}\``,
    `Scope: \`${group.capability}\``,
    `Error class: \`${group.errorClass}\``,
    `Classification: **${group.classification ?? CLASS_PRODUCT}** — ${group.classificationReason ?? "(no reason recorded)"}`,
    `Occurrences: **${group.count}** (threshold ${threshold} within a ${windowDays}-day window)`,
    `Window: ${windowStart} → ${windowEnd}`,
    `First seen in window: ${group.firstSeen.toISOString()}`,
    `Last seen in window: ${group.lastSeen.toISOString()}`,
    ``,
    `Evidence — real \`${stream}\` rows:`,
    sampleLines,
    ``,
    `Reproduce:`,
    reproduceBlock(group),
    ``,
    `Detection never auto-fixes — this ticket rides the normal queue and the full session ceremony.`,
    `**\`M5-12\` binds this row: it holds at \`partial\` until non-recurrence is confirmed.** The Heal`,
    `engine records that verdict itself — signature \`${group.sigHash}\` is watched in`,
    `\`public.${HEAL_STATE_TABLE}\`, and goes \`confirmed_fixed\` only after ${confirmationWindowDays} quiet days`,
    `(\`confirmation_window_days\` on that row). A reappearance is recorded as a recurrence against`,
    `this ticket rather than filed as a duplicate.`,
    `Triage note: classify the failure against the \`failureClass\` contract`,
    `(\`.claude/rules/transient-failure-recovery.md\`) before assuming it is a defect — a transient`,
    `class that already recovered is not the same bug as a permanent one that surfaced.`,
  ].join("\n");

  const ordinal = Number.parseInt(String(backlogId).split("-")[1], 10);

  return {
    backlog_id: backlogId,
    tier: "now",
    type: "Task Success Rate",
    priority_class: "P9 - Bug Fixes",
    title,
    description,
    // 'open' is the only open status the live CHECK constraint allows
    // (open/partial/done/removal proposed/removed). SES-118 (v7.0.183) renamed it from
    // 'missing' -- markdown-audit-era vocabulary -- and replaced the CHECK in the same
    // migration, so this literal is load-bearing: the old value now raises 23514 on every
    // heal filing. Register B6's filed/queued lifecycle vocabulary is still not live;
    // widening the constraint here would preempt SES-83 (d)/(e)'s gated design.
    status: "open",
    source_file: HEAL_SOURCE_FILE,
    row_ordinal: ordinal,
    session_ref: `S-${backlogId} (auto-filed by SES-89 Heal engine, v2 SES-276)`,
  };
}

// -- SES-276 Task 3: fix-confirmation ------------------------------------------------------------
//
// The second half v1 never had. Given the persisted state rows and the signatures actually seen in
// THIS run's window, decide which watched signatures have gone quiet long enough to be called
// fixed, and which have come back.
//
// `seenSignatures` is a Map of sigHash -> { count, lastSeen: Date }.
//
// THREE PROPERTIES ARE LOAD-BEARING:
//   1. Only a signature that actually FILED a ticket can be confirmed-fixed. A signature nobody
//      ever fixed cannot have a fix that held; a row with no backlog_id stays `watching` forever,
//      which is honest rather than tidy.
//   2. The window comes from the ROW (`confirmation_window_days`), falling back to the named
//      constant. A verdict carries the window that produced it.
//   3. A reappearance after `confirmed_fixed` is a RECURRENCE against the original row -- state
//      goes `recurred`, the count increments, and the hash is returned in `suppressed` so the
//      detector cannot file a duplicate ticket for it.
export function assessConfirmations(stateRows, seenSignatures, opts = {}) {
  const now = opts.now instanceof Date ? opts.now : new Date();
  const fallbackWindow = opts.confirmationWindowDays ?? DEFAULT_CONFIRMATION_WINDOW_DAYS;
  const seen = seenSignatures instanceof Map ? seenSignatures : new Map();

  const confirmed = [];
  const recurred = [];
  const stillWatching = [];
  // FEATURE: SES-308 -- hashes whose recurrence is ALREADY on the row. They produce no new verdict,
  // but they stay in `suppressed`: the detector's duplicate-filing guard must not weaken just
  // because the verdict stopped being re-written.
  const recurrenceAlreadyRecorded = [];

  for (const row of stateRows ?? []) {
    const hash = row?.sig_hash;
    if (!hash) continue;
    const hit = seen.get(hash) ?? null;
    const windowDays = Number.isFinite(row.confirmation_window_days) && row.confirmation_window_days > 0
      ? row.confirmation_window_days
      : fallbackWindow;

    if (row.state === "confirmed_fixed" || row.state === "recurred") {
      if (hit) {
        const lastSeen = hit.lastSeen instanceof Date ? hit.lastSeen : now;
        // FEATURE: SES-308 -- a recurrence is a NEW recurrence only when the newest sighting is
        // later than the one already on the row. A signature stays in the 14-day detection window
        // for days after it recurs, so without this the same reappearance was re-reported (and
        // recurrence_count re-incremented by verdictPatches) on every run until it aged out. That
        // was invisible while nothing acted on the verdict; now that a computed verdict triggers an
        // --apply, it would make the cycle re-apply and re-increment on every fire.
        const recordedAt = row.state === "recurred" && row.last_recurrence_at
          ? new Date(row.last_recurrence_at)
          : null;
        if (recordedAt && !Number.isNaN(recordedAt.getTime()) && lastSeen.getTime() <= recordedAt.getTime()) {
          recurrenceAlreadyRecorded.push(hash);
          stillWatching.push({
            sigHash: hash,
            backlogId: row.backlog_id ?? null,
            reason: `recurrence already recorded at ${recordedAt.toISOString()}`,
          });
          continue;
        }
        recurred.push({
          sigHash: hash,
          backlogId: row.backlog_id ?? null,
          previousState: row.state,
          recurrenceCount: (Number.isFinite(row.recurrence_count) ? row.recurrence_count : 0) + 1,
          lastRecurrenceAt: lastSeen.toISOString(),
          occurrences: hit.count ?? 0,
          confirmationWindowDays: windowDays,
        });
      }
      continue;
    }

    // state === 'watching' (or anything unrecognised, which is treated as watching rather than
    // silently dropped -- an unknown state must not make a signature invisible).
    if (hit) {
      stillWatching.push({ sigHash: hash, backlogId: row.backlog_id ?? null, reason: "seen again in this window" });
      continue;
    }
    if (!row.backlog_id) {
      stillWatching.push({
        sigHash: hash,
        backlogId: null,
        reason: "no ticket was ever filed for this signature, so there is no fix to confirm",
      });
      continue;
    }
    const lastSeen = new Date(row.last_seen_at);
    if (Number.isNaN(lastSeen.getTime())) {
      stillWatching.push({ sigHash: hash, backlogId: row.backlog_id, reason: "last_seen_at is unreadable" });
      continue;
    }
    const quietMs = now.getTime() - lastSeen.getTime();
    const quietDays = quietMs / 86400000;
    if (quietMs >= windowDays * 86400000) {
      confirmed.push({
        sigHash: hash,
        backlogId: row.backlog_id,
        confirmedAt: now.toISOString(),
        quietDays: Math.round(quietDays * 100) / 100,
        confirmationWindowDays: windowDays,
      });
    } else {
      stillWatching.push({
        sigHash: hash,
        backlogId: row.backlog_id,
        reason: `quiet for ${Math.round(quietDays * 100) / 100}d of the ${windowDays}d confirmation window`,
      });
    }
  }

  return {
    confirmed,
    recurred,
    stillWatching,
    // FEATURE: SES-308 -- the union, not just this run's new verdicts. See recurrenceAlreadyRecorded.
    suppressed: new Set([...recurred.map((r) => r.sigHash), ...recurrenceAlreadyRecorded]),
  };
}

// FEATURE: SES-308. How many verdicts THIS RUN computed that are not yet on the table. Pure, so the
// regression test grades the contract with no network. It is the whole of the exit-1 decision in
// main()'s nothing-new-to-file branch: a confirmed fix is, by definition, a run with nothing new to
// file, so before this the dry run exited 0 and the runbook's "only re-run with --apply on exit 1"
// meant the verdict was computed and discarded on every unattended cycle.
export function pendingVerdictCount(confirmation) {
  return (confirmation?.confirmed?.length ?? 0) + (confirmation?.recurred?.length ?? 0);
}

// The rows this run would write to runner_heal_signatures. Pure, so the test can assert the shape
// without a network call, and so the dry run can REPORT them without writing them.
//
// THE UPSERT IS A WHOLE ROW, NOT A PATCH, and that is forced rather than chosen: eight columns on
// this table are NOT NULL without a default, and PostgREST evaluates the INSERT tuple (and its NOT
// NULL constraints) BEFORE `on_conflict` resolution — a partial payload raises instead of merging.
// So every field a previous run established has to be carried forward here explicitly. Dropping
// `existingByHash` would silently null a filed signature's `backlog_id` on its next sighting and
// break the very link SES-303 reads.
export function buildSignatureStateRows(groups, opts = {}) {
  const now = opts.now instanceof Date ? opts.now : new Date();
  const confirmationWindowDays = opts.confirmationWindowDays ?? DEFAULT_CONFIRMATION_WINDOW_DAYS;
  const filedByHash = opts.filedByHash instanceof Map ? opts.filedByHash : new Map();
  const existingByHash = opts.existingByHash instanceof Map ? opts.existingByHash : new Map();

  return groups.map((g) => {
    const prior = existingByHash.get(g.sigHash) ?? null;
    const filedNow = filedByHash.get(g.sigHash) ?? null;
    const backlogId = filedNow ?? prior?.backlog_id ?? null;
    const priorFirstSeen = prior?.first_seen_at ? new Date(prior.first_seen_at) : null;
    const firstSeen = priorFirstSeen && !Number.isNaN(priorFirstSeen.getTime()) && priorFirstSeen < g.firstSeen
      ? priorFirstSeen
      : g.firstSeen;
    return {
      sig_hash: g.sigHash,
      stream: g.stream,
      signature_key: g.signatureKey,
      scope: g.scope,
      error_class: g.errorClass,
      classification: g.classification ?? CLASS_UNCLASSIFIED,
      classification_reason: g.classificationReason ?? "(no reason recorded)",
      backlog_id: backlogId,
      filed_at: filedNow ? now.toISOString() : (prior?.filed_at ?? null),
      first_seen_at: firstSeen.toISOString(),
      last_seen_at: g.lastSeen.toISOString(),
      occurrences: g.count,
      // The occurrence pass never invents a verdict: it carries the prior state forward, and the
      // confirmation pass patches `confirmed_fixed` / `recurred` on top afterwards.
      state: prior?.state ?? "watching",
      confirmed_fixed_at: prior?.confirmed_fixed_at ?? null,
      recurrence_count: Number.isFinite(prior?.recurrence_count) ? prior.recurrence_count : 0,
      last_recurrence_at: prior?.last_recurrence_at ?? null,
      confirmation_window_days: confirmationWindowDays,
      updated_at: now.toISOString(),
    };
  });
}

// SES-277. The verdict PATCH payloads for one run, pure: [sigHash, fields] per confirmed-fixed and
// per recurrence. A patch, never an upsert -- see buildSignatureStateRows()'s header for why.
export function verdictPatches(confirmation, windowEnd) {
  const at = (windowEnd instanceof Date ? windowEnd : new Date()).toISOString();
  return [
    ...(confirmation?.confirmed ?? []).map((c) => [c.sigHash, {
      state: "confirmed_fixed",
      confirmed_fixed_at: c.confirmedAt,
      confirmation_window_days: c.confirmationWindowDays,
      updated_at: at,
    }]),
    ...(confirmation?.recurred ?? []).map((r) => [r.sigHash, {
      state: "recurred",
      recurrence_count: r.recurrenceCount,
      last_recurrence_at: r.lastRecurrenceAt,
      confirmation_window_days: r.confirmationWindowDays,
      updated_at: at,
    }]),
  ];
}

// SES-277. THE ONE WRITE PATH for signature state under --apply, used by BOTH the filing branch and
// the nothing-new-to-file branch. Occurrence rows first (carrying prior state forward), verdicts
// LAST so the upsert cannot overwrite a verdict decided in this same run. Returns the counts the
// report prints; fails loudly on any write error.
async function persistSignatureState(base, key, { groups, stateResult, confirmation, windowEnd, confirmationWindowDays, filedByHash }) {
  const stateRows = buildSignatureStateRows(groups, {
    now: windowEnd,
    confirmationWindowDays,
    filedByHash: filedByHash ?? new Map(),
    existingByHash: new Map(stateResult.states.map((s) => [s.sig_hash, s])),
  });
  const stateWrite = await upsertSignatureStates(base, key, stateRows);
  if (stateWrite.error) fail(2, stateWrite.error);
  const verdicts = verdictPatches(confirmation, windowEnd);
  for (const [sigHash, fields] of verdicts) {
    const patched = await patchSignatureState(base, key, sigHash, fields);
    if (patched.error) fail(2, patched.error);
  }
  return { stateRows: stateRows.length, verdictRows: verdicts.length };
}

// ---------------------------------------------------------------------------
// Supabase REST
// ---------------------------------------------------------------------------

function restHeaders(key, extra = {}) {
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}

async function restGet(base, key, pathAndQuery) {
  let res;
  try {
    res = await fetch(`${base}${pathAndQuery}`, { headers: restHeaders(key) });
  } catch (e) {
    return { error: `could not reach the Supabase REST endpoint: ${e.message}` };
  }
  if (!res.ok) {
    let body = "";
    try {
      body = await res.text();
    } catch {
      // best effort -- an unreadable body is still a failure, just a less descriptive one
    }
    return { error: `Supabase REST returned HTTP ${res.status} ${res.statusText}: ${body}` };
  }
  try {
    const json = await res.json();
    if (!Array.isArray(json)) {
      return { error: "Supabase REST returned a non-array response for a select query" };
    }
    return { rows: json };
  } catch (e) {
    return { error: `Supabase REST returned unparseable JSON: ${e.message}` };
  }
}

// Paginates on a SHORT page, never on a row-count assumption, with a hard ceiling against a
// non-converging offset -- same contract as scripts/export-backlog-snapshot.js. A detector that
// silently sees only the first page would under-count signatures and quietly stop filing.
async function restGetAll(base, key, table, query, label) {
  let all = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const offset = page * PAGE_SIZE;
    const q = `/rest/v1/${table}?${query}&limit=${PAGE_SIZE}&offset=${offset}`;
    const { rows, error } = await restGet(base, key, q);
    if (error) return { error };
    all = all.concat(rows);
    if (rows.length < PAGE_SIZE) return { rows: all };
  }
  return {
    error: `hit the hard page ceiling (${MAX_PAGES} pages) without a short page while reading ${label} — ` +
      `refusing to assume it is fully paginated, since that would silently under-count signatures`,
  };
}

async function fetchFailedHops(base, key, sinceIso) {
  const q = `select=${HOP_COLUMNS.join(",")}&status=eq.failed&created_at=gte.${encodeURIComponent(sinceIso)}&order=created_at.asc`;
  const { rows, error } = await restGetAll(base, key, "durable_hops", q, "durable_hops");
  return error ? { error } : { hops: rows };
}

// SES-276. Every conclusion in the window is READ; normaliseCiRow() decides which carry a failure.
// Reading only failures is not possible over PostgREST here anyway (the failure lives inside a
// jsonb array), and reading them all is what lets the report say "57 rows read, 32 produced a
// record" instead of only the second number.
async function fetchCiRunConclusions(base, key, sinceIso) {
  const q = `select=${CI_COLUMNS.join(",")}&concluded_at=gte.${encodeURIComponent(sinceIso)}&order=concluded_at.asc`;
  const { rows, error } = await restGetAll(base, key, "ci_run_conclusions", q, "ci_run_conclusions");
  return error ? { error } : { ciRuns: rows };
}

async function fetchFailedCycles(base, key, sinceIso) {
  const q = `select=${CYCLE_COLUMNS.join(",")}&outcome=eq.failed&started_at=gte.${encodeURIComponent(sinceIso)}&order=started_at.asc`;
  const { rows, error } = await restGetAll(base, key, "runner_cycles", q, "runner_cycles");
  return error ? { error } : { cycles: rows };
}

// Classification input, not a stream: the set of commits the runner itself pushed and the window
// each pushing cycle was open for. This is what makes the SES-261 race match evidence rather than
// a hunch. Unbounded by the detection window on purpose -- a cycle that pushed before the window
// can still be the cycle a CI run inside the window was grading.
async function fetchRunnerPushes(base, key) {
  const q = `select=id,push_sha,started_at,ended_at&push_sha=not.is.null&order=started_at.asc`;
  const { rows, error } = await restGetAll(base, key, "runner_cycles", q, "runner_cycles (pushes)");
  if (error) return { error };
  return {
    pushes: rows.map((r) => ({ cycleId: r.id, sha: r.push_sha, startedAt: r.started_at, endedAt: r.ended_at })),
  };
}

async function fetchHealTicketDescriptions(base, key) {
  const q = `select=backlog_id,description&source_file=eq.${HEAL_SOURCE_FILE}&order=row_ordinal.asc`;
  const { rows, error } = await restGetAll(base, key, "backlog_items", q, "existing heal tickets");
  return error ? { error } : { tickets: rows };
}

async function fetchSignatureState(base, key) {
  const q = `select=*&order=sig_hash.asc`;
  const { rows, error } = await restGetAll(base, key, HEAL_STATE_TABLE, q, HEAL_STATE_TABLE);
  return error ? { error } : { states: rows };
}

async function restWrite(base, key, table, body, extraHeaders = {}) {
  let res;
  try {
    res = await fetch(`${base}/rest/v1/${table}`, {
      method: "POST",
      headers: restHeaders(key, { "Content-Type": "application/json", Prefer: "return=representation", ...extraHeaders }),
      body: JSON.stringify(body),
    });
  } catch (e) {
    return { error: `could not write to ${table}: ${e.message}` };
  }
  if (!res.ok) {
    let text = "";
    try {
      text = await res.text();
    } catch {
      // best effort
    }
    return { error: `${table} write returned HTTP ${res.status}: ${text}` };
  }
  return { ok: true };
}

// -- Why this script does NOT claim its own ids ----------------------------------------------
// CLAUDE.md's atomic-counter hard rule: ids come from ONE call that claims a contiguous block of
// N against public.feature_id_counter -- never read-the-max-and-increment, and never claim one
// id and hand-count the rest (that hand-count is the mechanism behind every recorded ID
// collision in this repo, including one that reached shipped Supabase content).
//
// That claim is an UPDATE ... RETURNING with arithmetic in it, which PostgREST cannot express:
// there is no RPC for it in this project (verified live 2026-08-20 -- public has no
// claim_feature_ids function, and adding one would be a schema change this P10 - Tooling ticket
// has no mandate for). So the engine does not claim ids at all. The runner cycle claims the
// block through the Supabase connector, using the exact SQL in
// docs/runbooks/session-setup.md §3b, and passes the result in via --backlog-ids.
//
// This keeps the atomic claim in the one place that can do it correctly, and keeps this script
// honest: it never invents an id, and it files at most as many tickets as it was given ids for.
export function parseBacklogIds(raw, prefix = HEAL_PREFIX) {
  if (!raw) return { error: "--apply requires --backlog-ids=<comma-separated ids>" };
  const ids = String(raw)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length === 0) return { error: "--backlog-ids was empty" };
  const bad = ids.filter((id) => !new RegExp(`^${prefix}-\\d+$`).test(id));
  if (bad.length > 0) {
    return { error: `--backlog-ids contains malformed id(s): ${bad.join(", ")} (expected ${prefix}-<number>)` };
  }
  const seen = new Set(ids);
  if (seen.size !== ids.length) return { error: "--backlog-ids contains duplicates" };
  return { ids };
}

// §19v: "No before-image logged -> the write does not happen." The before-image is inserted
// first, and only its success authorises the ticket insert.
//
// row_data = NULL encodes "this row did not exist before" -- so a Reverse of a heal filing is a
// DELETE of that pk, not a restore. Every pre-existing before-image row in this system records
// an UPDATE (non-null row_data); this INSERT convention is introduced by SES-89 and is written
// down in docs/runbooks/runner-cycle.md step 8b rather than left implicit.
async function insertBeforeImage(base, key, cycleId, pkValue) {
  return restWrite(base, key, "runner_before_images", {
    cycle_id: cycleId,
    table_name: "backlog_items",
    pk_value: pkValue,
    row_data: null,
  });
}

async function insertTicket(base, key, row) {
  return restWrite(base, key, "backlog_items", row);
}

// SES-276. Engine bookkeeping, never a change to the board, and only ever under --apply.
async function upsertSignatureStates(base, key, rows) {
  if (rows.length === 0) return { ok: true };
  return restWrite(base, key, `${HEAL_STATE_TABLE}?on_conflict=sig_hash`, rows, {
    Prefer: "return=representation,resolution=merge-duplicates",
  });
}

// A verdict is a PATCH, never an upsert -- see buildSignatureStateRows()'s header for why a
// partial payload cannot go through the upsert path at all. It targets a row the occurrence pass
// has just written, so a 0-row PATCH would mean the state row vanished between the two writes and
// is reported rather than swallowed.
async function patchSignatureState(base, key, sigHash, fields) {
  let res;
  try {
    res = await fetch(`${base}/rest/v1/${HEAL_STATE_TABLE}?sig_hash=eq.${encodeURIComponent(sigHash)}`, {
      method: "PATCH",
      headers: restHeaders(key, { "Content-Type": "application/json", Prefer: "return=representation" }),
      body: JSON.stringify(fields),
    });
  } catch (e) {
    return { error: `could not patch ${HEAL_STATE_TABLE} row ${sigHash}: ${e.message}` };
  }
  if (!res.ok) {
    let text = "";
    try {
      text = await res.text();
    } catch {
      // best effort
    }
    return { error: `${HEAL_STATE_TABLE} patch returned HTTP ${res.status}: ${text}` };
  }
  let rows = [];
  try {
    rows = await res.json();
  } catch {
    rows = [];
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    return { error: `${HEAL_STATE_TABLE} patch for ${sigHash} matched no row — the verdict was not recorded` };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const ARGV = process.argv.slice(2);
const JSON_OUT = ARGV.includes("--json");
const APPLY = ARGV.includes("--apply");

function argValue(name, fallback) {
  const hit = ARGV.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function fail(code, message) {
  if (JSON_OUT) {
    console.log(JSON.stringify({ ok: false, exitCode: code, error: message }));
  } else {
    console.error(message);
  }
  process.exit(code);
}

function finish(code, payload, prose) {
  if (JSON_OUT) {
    console.log(JSON.stringify({ ok: true, exitCode: code, ...payload }));
  } else {
    console.log(prose);
  }
  process.exit(code);
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    fail(2, "SUPABASE_URL and SUPABASE_SERVICE_KEY must both be set (exit 2 = could not run, never a pass).");
  }

  const cycleId = argValue("cycle-id", null);
  if (APPLY && !cycleId) {
    fail(2, "--apply requires --cycle-id=<uuid>: every write needs a before-image bound to a real open cycle.");
  }
  // FEATURE: SES-308 -- this used to be a hard gate here, and it made this ship's own remedy
  // unrunnable: an --apply run whose only work is persisting fix-confirmation verdicts has nothing
  // to file and therefore no ids to pass, yet it failed 2 before ever reaching the nothing-to-file
  // branch. The requirement is unchanged where it actually applies -- parseBacklogIds() below,
  // reached only once there ARE detections to file -- so filing without ids still exits 2.

  const windowDays = Number.parseInt(argValue("window-days", String(DEFAULT_WINDOW_DAYS)), 10);
  const threshold = Number.parseInt(argValue("threshold", String(DEFAULT_THRESHOLD)), 10);
  const maxFilings = Number.parseInt(argValue("max-filings", String(DEFAULT_MAX_FILINGS)), 10);
  const confirmationWindowDays = Number.parseInt(
    argValue("confirmation-window-days", String(DEFAULT_CONFIRMATION_WINDOW_DAYS)),
    10,
  );
  if (![windowDays, threshold, maxFilings, confirmationWindowDays].every(Number.isFinite)) {
    fail(2, "--window-days, --threshold, --max-filings and --confirmation-window-days must be integers.");
  }

  const untilRaw = argValue("until", null);
  const windowEnd = untilRaw ? new Date(untilRaw) : new Date();
  if (Number.isNaN(windowEnd.getTime())) {
    fail(2, `--until=${untilRaw} is not a parseable ISO timestamp.`);
  }
  const windowStart = new Date(windowEnd.getTime() - windowDays * 24 * 60 * 60 * 1000);
  const sinceIso = windowStart.toISOString();

  const base = supabaseUrl.replace(/\/+$/, "");

  const hopsResult = await fetchFailedHops(base, supabaseKey, sinceIso);
  if (hopsResult.error) fail(2, hopsResult.error);

  const ciResult = await fetchCiRunConclusions(base, supabaseKey, sinceIso);
  if (ciResult.error) fail(2, ciResult.error);

  const cyclesResult = await fetchFailedCycles(base, supabaseKey, sinceIso);
  if (cyclesResult.error) fail(2, cyclesResult.error);

  const pushesResult = await fetchRunnerPushes(base, supabaseKey);
  if (pushesResult.error) fail(2, pushesResult.error);

  const ticketsResult = await fetchHealTicketDescriptions(base, supabaseKey);
  if (ticketsResult.error) fail(2, ticketsResult.error);

  const stateResult = await fetchSignatureState(base, supabaseKey);
  if (stateResult.error) fail(2, stateResult.error);

  const existingDescriptions = ticketsResult.tickets.map((t) => t.description);

  const { records, rowsRead, produced } = normaliseStreams({
    hops: hopsResult.hops,
    ciRuns: ciResult.ciRuns,
    cycles: cyclesResult.cycles,
  });

  const ctx = {
    now: windowEnd,
    runnerPushes: pushesResult.pushes,
    runnerPushShas: new Set(pushesResult.pushes.map((p) => p.sha)),
  };

  // Pass 1 groups and classifies. Its signature counts feed the confirmation pass, whose
  // `suppressed` set feeds pass 2 -- a recurrence must not be able to file a duplicate ticket.
  const firstPass = detectSignatures(records, existingDescriptions, {
    threshold,
    windowStart,
    windowEnd,
    ctx,
  });

  const seenSignatures = new Map(
    firstPass.groups.map((g) => [g.sigHash, { count: g.count, lastSeen: g.lastSeen }]),
  );
  const confirmation = assessConfirmations(stateResult.states, seenSignatures, {
    now: windowEnd,
    confirmationWindowDays,
  });

  const { detections, alreadyFiled, withheld, signaturesSeen, groups, byClassification } = detectSignatures(
    records,
    existingDescriptions,
    { threshold, windowStart, windowEnd, ctx, suppressedSignatures: confirmation.suppressed },
  );

  const summary = {
    window: { start: windowStart.toISOString(), end: windowEnd.toISOString(), days: windowDays },
    threshold,
    confirmationWindowDays,
    // Rows read vs records produced, per stream. A dead stream reports 0 and 0, which is a
    // measured zero -- never the same thing as not having been read.
    streams: STREAMS.map((s) => ({ stream: s, rowsRead: rowsRead[s], recordsProduced: produced[s] })),
    recordsInWindow: firstPass.recordsInWindow.length,
    byClassification,
    signaturesSeen,
    withheld: withheld.map((g) => ({
      sigHash: g.sigHash,
      stream: g.stream,
      classification: g.classification,
      count: g.count,
      reason: g.classificationReason,
    })),
    alreadyFiled: alreadyFiled.length,
    confirmation: {
      statesRead: stateResult.states.length,
      confirmedFixed: confirmation.confirmed,
      recurred: confirmation.recurred,
      stillWatching: confirmation.stillWatching.length,
    },
    detections: detections.map((d) => ({
      sigHash: d.sigHash,
      stream: d.stream,
      scope: d.scope,
      errorClass: d.errorClass,
      classification: d.classification,
      count: d.count,
      firstSeen: d.firstSeen.toISOString(),
      lastSeen: d.lastSeen.toISOString(),
      sampleRowIds: d.samples.map((s) => s.id),
    })),
  };

  const streamLine = STREAMS.map((s) => `${s} ${rowsRead[s]}→${produced[s]}`).join(", ");
  const classLine =
    `${byClassification[CLASS_PRODUCT]} product / ${byClassification[CLASS_PROCESS]} process / ` +
    `${byClassification[CLASS_UNCLASSIFIED]} unclassified`;
  const confirmLine =
    `fix-confirmation: ${stateResult.states.length} signature(s) tracked, ` +
    `${confirmation.confirmed.length} confirmed-fixed, ${confirmation.recurred.length} recurrence(s), ` +
    `${confirmation.stillWatching.length} still watching (window ${confirmationWindowDays}d).`;

  // FEATURE: SES-308. Verdicts this run computed that are NOT YET on the table. Under --apply they
  // are persisted below, so the number a completed apply reports is 0 by construction -- which is
  // what makes `exitCode === 1 iff there is unfinished work` a contract a cycle can grade.
  const computedVerdicts = pendingVerdictCount(confirmation);

  if (detections.length === 0) {
    // SES-277: nothing new to FILE is not nothing to WRITE. Under --apply the occurrence state and
    // this run's verdicts still land -- a confirmed fix is exactly a run with nothing new to file.
    let written = { stateRows: 0, verdictRows: 0 };
    if (APPLY) {
      written = await persistSignatureState(base, supabaseKey, {
        groups, stateResult, confirmation, windowEnd, confirmationWindowDays, filedByHash: new Map(),
      });
    }
    const quietProse =
      `Heal engine v2 (${APPLY ? "apply" : "dry run"}): rows→records ${streamLine}; ` +
      `${firstPass.recordsInWindow.length} record(s) in the last ${windowDays}d — ${classLine}; ` +
      `${signaturesSeen} signature(s), ${withheld.length} withheld (not product / recurrence), ` +
      `${alreadyFiled.length} already filed. Nothing new to file.` +
      (APPLY ? ` ${written.stateRows} state row(s) and ${written.verdictRows} verdict(s) written.` : "") +
      `\n${confirmLine}`;

    // FEATURE: SES-308 -- the whole ticket. A dry run holding an unpersisted verdict is unfinished
    // work, so it signals exit 1 exactly as a detection does, and step 8b's "re-run with --apply on
    // exit 1" finally reaches the loop's last third. It still writes NOTHING: exit 1 is a signal,
    // never a side effect.
    if (!APPLY && pendingVerdictCount(confirmation) > 0) {
      finish(
        1,
        { ...summary, filed: [], stateRowsWritten: 0, pendingVerdicts: computedVerdicts },
        `${quietProse}\n${computedVerdicts} fix-confirmation verdict(s) computed and NOT YET ` +
          `PERSISTED. Re-run with --apply --cycle-id=<uuid> — no --backlog-ids needed, nothing new ` +
          `to file. NOTHING WAS WRITTEN by this run — not backlog_items, not runner_before_images, ` +
          `not ${HEAL_STATE_TABLE}.`,
      );
    }
    finish(
      0,
      {
        ...summary,
        filed: [],
        stateRowsWritten: written.stateRows + written.verdictRows,
        pendingVerdicts: APPLY ? 0 : computedVerdicts,
      },
      quietProse,
    );
  }

  if (!APPLY) {
    const lines = detections.map(
      (d) => `  - [${d.sigHash}] ${d.stream} ${d.scope}: ${d.errorClass} — ${d.count}× (last ${d.lastSeen.toISOString()})`,
    );
    finish(
      1,
      // FEATURE: SES-308 -- `pendingVerdicts` rides EVERY exit path, not only the quiet branch, so a
      // cycle never has to read its absence as a zero.
      { ...summary, filed: [], stateRowsWritten: 0, pendingVerdicts: computedVerdicts },
      `Heal engine v2 (dry run): rows→records ${streamLine}; ` +
        `${firstPass.recordsInWindow.length} record(s) in the last ${windowDays}d — ${classLine}; ` +
        `${withheld.length} signature(s) withheld as not-product or recurrence.\n` +
        `${detections.length} product signature(s) over threshold and not yet filed:\n` +
        `${lines.join("\n")}\n${confirmLine}\n` +
        `${computedVerdicts} fix-confirmation verdict(s) also pending (SES-308).\n` +
        `Re-run with --apply --cycle-id=<uuid> --backlog-ids=… to file them (max ${maxFilings} per ` +
        `run) — ids are required here BECAUSE there are signatures to file. ` +
        `NOTHING WAS WRITTEN by this run — not backlog_items, not runner_before_images, not ${HEAL_STATE_TABLE}.`,
    );
  }

  const claim = parseBacklogIds(argValue("backlog-ids", null));
  if (claim.error) fail(2, claim.error);

  // File no more than we have ids for. Running out of ids is not an error -- the remainder is
  // reported as deferred, exactly like the --max-filings cap.
  const toFile = detections.slice(0, Math.min(maxFilings, claim.ids.length));

  const filed = [];
  const filedByHash = new Map();
  for (let i = 0; i < toFile.length; i++) {
    const group = toFile[i];
    const backlogId = claim.ids[i];
    const draft = buildTicketDraft(group, backlogId, {
      windowDays,
      threshold,
      windowStart,
      windowEnd,
      confirmationWindowDays,
    });
    const rowId = crypto.randomUUID();

    const bi = await insertBeforeImage(base, supabaseKey, cycleId, rowId);
    if (bi.error) fail(2, `${bi.error} — refusing to file ${backlogId} without its before-image (§19v).`);

    const ins = await insertTicket(base, supabaseKey, { id: rowId, ...draft });
    if (ins.error) fail(2, ins.error);

    filed.push({ backlogId, id: rowId, sigHash: group.sigHash, stream: group.stream, scope: group.scope, count: group.count });
    filedByHash.set(group.sigHash, backlogId);
  }

  // Signature state is persisted for EVERY signature seen, not only the filed ones: a process or
  // unclassified signature still needs its occurrence history for SES-303 to read, and a signature
  // that never filed is exactly the one whose "no ticket, nothing to confirm" verdict must be
  // visible rather than inferred from absence. Same write path as the nothing-to-file branch (SES-277).
  const written = await persistSignatureState(base, supabaseKey, {
    groups, stateResult, confirmation, windowEnd, confirmationWindowDays, filedByHash,
  });

  const skipped = detections.length - toFile.length;
  finish(
    0,
    // FEATURE: SES-308 -- 0 because persistSignatureState() above just landed them.
    { ...summary, filed, stateRowsWritten: written.stateRows + written.verdictRows, pendingVerdicts: 0 },
    `Heal engine v2: filed ${filed.length} ticket(s) — ${filed.map((f) => f.backlogId).join(", ")}.` +
      (skipped > 0 ? ` ${skipped} more over threshold, deferred to the next run by --max-filings.` : "") +
      `\n${confirmLine}`,
  );
}

// Importing this module must never hit the network or file anything -- the regression test
// imports it for the pure detector. Only direct invocation runs the CLI.
const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  main().catch((e) => fail(2, `unexpected failure: ${e.stack || e.message}`));
}
