#!/usr/bin/env node
// DeepBench v7.0.1023 | scripts/audit-headroom.js | AGT-466 -- growth from a tracked history; runs in a fresh clone
// DeepBench v7.0.897 | scripts/audit-headroom.js | AGT-466
//
// THE WEEKLY HEADROOM, GROWTH AND PIN SENSOR. The governance surfaces that carry a byte bar had no
// sensor at all: `docs/runbooks/runner-cycle.md` measures 380,920 B under `agt-138`'s binding
// ratchet `bytes < 380980`, which is FIFTY-NINE bytes of room, and not one of the 1,422
// `audit_findings` rows measures capacity, growth or a pin. `au-behavior`'s twenty-four checks
// measure none of the three either. A bar that is only discovered by the build that trips it is a
// stop with no warning in front of it; this file is the warning.
//
// THREE QUESTIONS, ASKED DETERMINISTICALLY (pattern:9 -- no model call anywhere in this file):
//
//   config-headroom    a surface is NEARLY FULL (its free bytes are under WARN_FRACTION of its own
//                      bar) or is OUTGROWING its room (it grew since an earlier week, and at that
//                      rate the free bytes do not last WEEKS_AHEAD more weeks). One finding per
//                      surface, never one per rule, so a surface that is both tight AND growing is
//                      one row with both reasons named in its resolution.
//   config-sensor-gap  the history itself has a hole: the newest week this sensor recorded is
//                      OLDER than last week, so a week went by with nobody measuring. One finding,
//                      naming the three weeks, because a growth series with a hole in it reports a
//                      surface that has been growing for a month as brand new.
//   config-pin-drift   a rendered governance artifact no longer matches its source: the cycle card
//                      against `runner-cycle.md` (`render-cycle-card.js`), and the three role
//                      pattern rows against `JOHN-DECISION-PATTERNS.md`
//                      (`render-role-patterns.js --check-rows`). Each child's non-zero exit is ONE
//                      finding carrying that child's own last line as the evidence.
//
// THE BARS ARE BORROWED, NEVER RE-DECIDED. `ROW_BYTE_CAP` is imported from the script that enforces
// it. The runner-cycle bar is `agt-138`'s ratchet, 380,980, and NOT `SES-336`'s 381,000 ceiling:
// the ratchet is the tighter of the two and therefore the one a build actually hits, and
// `tests/regression/agt-466-governance-headroom.test.mjs` asserts each bar here against its home
// rather than against a number re-typed in this file.
//
// STRICT MEANS THE BAR IS EXCLUSIVE. `agt-138` asserts `bytes < bar`, so the last byte of a strict
// surface is not available and `free = bar - bytes - 1`. A non-strict cap refuses only `bytes >
// bar`, so `free = bar - bytes`. Getting this off by one is how a sensor says "1 B free" about a
// surface that is already over.
//
// GROWTH IS A MEASUREMENT OR IT IS `none`. `prev_bytes` comes from the newest entry this sensor
// itself recorded for the SAME location in an EARLIER iso week, read from the tracked file
// `docs/audits/headroom-history.json`. It is NOT read back out of `audit_findings`: a row only
// exists there for a week a surface was ALREADY alarming, so a roomy surface never has an earlier
// week to compare and its growth is invisible until the week it is already in trouble (measured
// 2026-11-13: ONE row filed in three weeks, 1 of 4 surfaces comparable). With no earlier entry the
// three growth fields read `none` -- never `delta=0`, which would claim a measurement nobody made
// and would make a growing surface look flat.
//
// IT RUNS IN A FRESH CLONE. Every specifier reached from this file is a Node builtin or a relative
// script that is itself builtin-only, which is what lets the Auditor's `$S` clone -- no
// `node_modules` in it -- run step 1 at all. 2026-W46's run died importing `@vercel/functions`,
// reached only through `audit-board.js` for one page-size constant, and the merge skipped the
// missing file silently (`SES-429`, `AGT-374`). Arm E of this file's test walks the specifiers.
//
// Usage:
//   node scripts/audit-headroom.js --out=$S/headroom.json --record
//   node scripts/audit-headroom.js --out=$S/headroom.json  (the same document, nothing recorded)
//   node scripts/audit-headroom.js                         (the same document, on stdout)
//
// Exit codes:
//   0  the run completed. FINDINGS ARE THE OUTPUT, NOT AN ERROR -- a non-zero exit here would make
//      the Auditor's step 1 abort on the very thing it is there to collect.
//   2  a bad argument, an unreadable surface, or a history file that is there but unreadable.
//
// Env (process.env only -- never hardcoded, never printed): SUPABASE_URL, SUPABASE_SERVICE_KEY, read
// for one purpose only -- whether the rows pin child can run. Nothing here reads or writes the
// database.
//
// ONE TRACKED FILE, WRITTEN ONLY UNDER `--record`. There is no REST call and no database write on
// any path in this file. The single thing it ever writes is `docs/audits/headroom-history.json`,
// and only when `--record` is passed; without that flag every path here is a read, and both pin
// children are themselves read-only checks. Ingest is scripts/audit-ledger.js, which reads the
// --out file unchanged; the routine that runs this is docs/runbooks/auditor-routine.md step 1.

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { isoWeek } from "./audit-ledger.js";
import { ROW_BYTE_CAP, ROLE_NAMES, ROLES, render, readDoc } from "./render-role-patterns.js";

export const CHECK_SLUGS = Object.freeze(["config-headroom", "config-pin-drift", "config-sensor-gap"]);
export const FOUND_BY = "auditor:headroom-checks";
export const WARN_FRACTION = 0.05;
export const WEEKS_AHEAD = 4;

/** The growth memory: one tracked file, committed, read by every run and written only by --record. */
export const HISTORY_REL = "docs/audits/headroom-history.json";

// `agt-138-researcher-routine.test.mjs`'s one-way ratchet, which asserts `bytes < PRE_CHANGE_BYTES`
// -- the binding bar on this surface, tighter than SES-336's 381,000 ceiling. The test asserts this
// number against that export; it is not a second decision about the bar.
export const RUNNER_CYCLE_REL = "docs/runbooks/runner-cycle.md";
export const RUNNER_CYCLE_BAR = 380980;

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const clip = (s, n) => (s.length <= n ? s : s.slice(0, n - 1) + "…");

// The frozen registry. One row for the runbook (measured from disk) and one per role (measured from
// what the register renders to today), each carrying the bar it is graded against and whether that
// bar is exclusive.
export const SURFACES = Object.freeze([
  Object.freeze({ location: "governance/runner-cycle.md", path: RUNNER_CYCLE_REL, bar: RUNNER_CYCLE_BAR, strict: true }),
  ...ROLE_NAMES.map(role => Object.freeze({
    location: `governance/${ROLES[role].slug}`, role, bar: ROW_BYTE_CAP, strict: false,
  })),
]);

export const RULES = Object.freeze({
  "config-headroom": "A governance surface under a byte bar must keep measurable room under it: a bar discovered by the build that trips it is a stop with no warning in front of it.",
  "config-pin-drift": "A rendered governance artifact must match the source it is rendered from; a pin that no longer matches is a copy claiming to be a view.",
  "config-sensor-gap": "The weekly sensor must leave a record every week: a growth series with a hole in it reports a surface that has been growing for a month as brand new.",
});
export const KINDS = Object.freeze({
  "config-headroom": "other", "config-pin-drift": "contradiction", "config-sensor-gap": "other",
});
export const TYPES = Object.freeze({
  "config-headroom": "gap", "config-pin-drift": "defect", "config-sensor-gap": "gap",
});
export const RESOLUTIONS = Object.freeze({
  "config-headroom": "Cut bytes from the surface, or move a section to its own home -- never raise the bar.",
  "config-pin-drift": "Re-render the artifact from its source in its own ticket, with the before-image an agent-row write owes, then re-run this child.",
  "config-sensor-gap": "Read why the Auditor did not run, or did not reach --record, in the missing week and file that cause; the series resumes on the next --record and the skipped weeks stay permanently absent.",
});

function finding(slug, location, text, fact, resolution) {
  return {
    check_slug: slug,
    kind: KINDS[slug],
    finding_type: TYPES[slug],
    locations: [{ location, text }],
    governing_fact: clip(fact, 300),
    confidence: "high",
    proposed_resolution: clip(resolution, 400),
  };
}

// --- the tracked history -----------------------------------------------------------------------
// Four pure functions over HISTORY_REL's `entries`, each {week, location, bytes, bar}. The file is
// the whole growth memory: no credentials, no REST, and a fresh clone carries it in the checkout.

/** Pure. The entries of a history document; `null`/`undefined` is an empty history, not an error. */
export function readHistory(text) {
  if (text == null) return [];
  const doc = JSON.parse(text);
  if (!Array.isArray(doc?.entries)) {
    throw new Error(`audit-headroom: ${HISTORY_REL} carries no \`entries\` array`);
  }
  return doc.entries;
}

/** Pure. The newest EARLIER week this sensor recorded for `location`, or two nulls. */
export function prevFromHistory(entries, location, week) {
  let best = null;
  for (const e of entries ?? []) {
    if (!e || e.location !== location) continue;
    if (typeof e.week !== "string" || !(e.week < week)) continue;
    if (best === null || e.week > best.week) best = e;
  }
  return best === null ? { prev_week: null, prev_bytes: null } : { prev_week: best.week, prev_bytes: best.bytes };
}

/**
 * Pure. This week's measurement written in: every entry for a measured location at THIS week is
 * dropped first, so a second --record in one week replaces rather than duplicating (QA 3).
 */
export function recordHistory(entries, surfaces, week) {
  const measured = new Set((surfaces ?? []).map(s => s.location));
  const kept = (entries ?? []).filter(e => !(e?.week === week && measured.has(e?.location)));
  const added = (surfaces ?? []).map(s => ({ week, location: s.location, bytes: s.bytes, bar: s.bar }));
  return [...kept, ...added].sort((a, b) =>
    a.week < b.week ? -1 : a.week > b.week ? 1
      : a.location < b.location ? -1 : a.location > b.location ? 1 : 0);
}

/** Pure. The iso week seven days before `nowIso` -- the week a weekly sensor should have recorded. */
export function prevWeekOf(nowIso) {
  return isoWeek(new Date(Date.parse(nowIso) - 7 * 86400000));
}

// --- check 1: headroom and growth --------------------------------------------------------------
//
// ONE FINDING PER SURFACE, and the resolution NAMES WHICH RULE FIRED. A row that only said "this
// surface is a finding" cannot be acted on and cannot be graded: the discriminator arm of
// agt-466-governance-headroom.test.mjs reads these clauses to prove the growth rule fires on its
// own, on a surface with plenty of absolute room.

export function freeOf(e) {
  return e.strict ? e.bar - e.bytes - 1 : e.bar - e.bytes;
}

export function pctUsed(e) {
  return (e.bytes / e.bar * 100).toFixed(2);
}

export function deltaOf(e) {
  return e.prev_bytes == null ? null : e.bytes - e.prev_bytes;
}

/** Pure. The one evidence shape the summary and the test both read. */
export function evidenceText(e) {
  const d = deltaOf(e);
  return `bytes=${e.bytes} bar=${e.bar} free=${freeOf(e)} pct_used=${pctUsed(e)} ` +
    `prev_week=${e.prev_week ?? "none"} prev_bytes=${e.prev_bytes ?? "none"} ` +
    `delta=${d == null ? "none" : d >= 0 ? `+${d}` : String(d)}`;
}

export function checkHeadroom(snap, ctx) {
  const warnFraction = ctx?.warnFraction ?? WARN_FRACTION;
  const weeksAhead = ctx?.weeksAhead ?? WEEKS_AHEAD;
  const out = [];
  for (const e of snap?.surfaces ?? []) {
    const free = freeOf(e);
    const delta = deltaOf(e);
    const floor = Math.ceil(e.bar * warnFraction);
    const tight = free < floor;
    const outgrowing = delta != null && delta > 0 && free <= delta * weeksAhead;
    if (!tight && !outgrowing) continue;
    const why = [];
    if (tight) why.push(`nearly full: ${free} B free is under the ${floor} B warning floor (${warnFraction * 100}% of the ${e.bar} B bar)`);
    if (outgrowing) why.push(`outgrowing its room: +${delta} B since ${e.prev_week}, so ${free} B free does not last ${weeksAhead} more weeks at that rate`);
    out.push(finding(
      "config-headroom",
      e.location,
      evidenceText(e),
      `${RULES["config-headroom"]} The bar on this surface is ${e.bar} B${e.strict ? ", exclusive (bytes must stay strictly under it)" : ""}.`,
      `${why.join("; ")}. ${RESOLUTIONS["config-headroom"]}`,
    ));
  }
  return out;
}

// --- check 2: the gap in the sensor's own memory ------------------------------------------------
//
// THE SENSOR GRADES ITSELF. Every other check here measures a surface; this one measures whether
// the measuring happened. It is deterministic and needs nothing but the entries as read: the
// newest week in the file, against the week before this one. An empty history is a first run, not
// a gap -- there is no week it failed to record.

export function checkSensorGap(snap, ctx) {
  const week = ctx?.week;
  const entries = snap?.entries ?? [];
  if (!week || !entries.length) return [];
  let last = null;
  for (const e of entries) {
    if (typeof e?.week !== "string") continue;
    if (last === null || e.week > last) last = e.week;
  }
  if (last === null || !(last < ctx?.prevWeek)) return [];
  return [finding(
    "config-sensor-gap",
    "governance/headroom-sensor",
    `last_recorded=${last} expected=${ctx.prevWeek} this_week=${week}`,
    `${RULES["config-sensor-gap"]} The newest week in ${HISTORY_REL} is ${last}, and last week was ${ctx.prevWeek}.`,
    RESOLUTIONS["config-sensor-gap"],
  )];
}

// --- check 3: the pins -------------------------------------------------------------------------
//
// The cycle-card child runs ALWAYS -- it compares two committed files and needs nothing but the
// tree. The rows child needs credentials, and with none it is SKIPPED AND NAMED, never counted
// green: an unrunnable check is not a passing check (render-role-patterns.js --check-rows says the
// same thing about itself, and exits 0 for exactly that reason).

export const PINS = Object.freeze([
  Object.freeze({
    name: "render-cycle-card --check",
    location: "audit-headroom/render-cycle-card",
    argv: Object.freeze(["scripts/render-cycle-card.js", "--check"]),
    needsCreds: false,
    subject: "docs/runbooks/cycle-card.md against docs/runbooks/runner-cycle.md",
  }),
  Object.freeze({
    name: "render-role-patterns --check-rows",
    location: "audit-headroom/render-role-patterns",
    argv: Object.freeze(["scripts/render-role-patterns.js", "--check-rows"]),
    needsCreds: true,
    subject: "the three role pattern rows against docs/JOHN-DECISION-PATTERNS.md",
  }),
]);

/** Pure. A child's own last non-empty line, clipped -- its words, never this file's summary of them. */
export function lastLine(result, max = 240) {
  const text = [result?.stderr, result?.stdout, result?.output].filter(s => typeof s === "string").join("\n");
  const lines = text.split("\n").map(s => s.trim()).filter(Boolean);
  if (!lines.length) return `the child exited ${result?.status ?? "with no status"} and printed nothing`;
  return clip(lines[lines.length - 1], max);
}

export function checkPinDrift(snap, ctx) {
  const spawn = ctx?.spawn;
  if (typeof spawn !== "function") {
    throw new Error("audit-headroom: ctx.spawn must be a function (argv) -> {status, stdout, stderr}");
  }
  const findings = [], skipped = [], ran = [];
  for (const pin of PINS) {
    if (pin.needsCreds && !ctx?.hasCreds) {
      skipped.push(`${pin.name} -- no SUPABASE_URL / SUPABASE_SERVICE_KEY, so NOTHING WAS READ; this is not a pass on ${pin.subject}`);
      continue;
    }
    const result = spawn(pin.argv);
    ran.push(pin.name);
    if (result?.status === 0) continue;
    findings.push(finding(
      "config-pin-drift",
      pin.location,
      lastLine(result),
      `${RULES["config-pin-drift"]} ${pin.name} grades ${pin.subject} and exited ${result?.status ?? "with no status"}.`,
      RESOLUTIONS["config-pin-drift"],
    ));
  }
  return { findings, skipped, ran };
}

export function runChecks(snap, ctx) {
  const headroom = checkHeadroom(snap, ctx);
  const gap = checkSensorGap(snap, ctx);
  const pins = checkPinDrift(snap, ctx);
  return { findings: [...headroom, ...gap, ...pins.findings], skipped: pins.skipped, ran: pins.ran };
}

// --- the CLI half (measurement, one tracked read, one file) ------------------------------------

function fail(message) {
  process.stderr.write(`audit-headroom: ${message}\n`);
  process.exit(2);
}

/** The bytes of every surface, from disk and from the register, with the growth fields still null. */
export function measureSurfaces(io) {
  return SURFACES.map(s => ({
    location: s.location,
    bar: s.bar,
    strict: s.strict,
    bytes: Buffer.byteLength(s.path ? io.readFile(s.path) : io.renderRole(s.role), "utf8"),
    prev_week: null,
    prev_bytes: null,
  }));
}

async function main() {
  const argv = process.argv.slice(2);
  for (const a of argv) {
    if (!/^--out=.+/.test(a) && a !== "--record") {
      fail(`unknown argument ${a} (only --out=<json> and --record)`);
    }
  }
  const outArg = argv.find(a => a.startsWith("--out="))?.slice(6);
  const record = argv.includes("--record");

  const hasCreds = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);

  let surfaces;
  try {
    const register = readDoc();
    surfaces = measureSurfaces({
      readFile: rel => fs.readFileSync(path.join(REPO, rel), "utf8"),
      renderRole: role => render(register, role),
    });
  } catch (e) {
    fail(`a surface could not be measured: ${e.message}`);
  }

  // The history AS READ -- the checks grade the memory this run inherited, never the one it is
  // about to write, or --record would erase the very gap config-sensor-gap exists to file.
  const historyPath = path.join(REPO, HISTORY_REL);
  let entries = [];
  try {
    entries = readHistory(fs.existsSync(historyPath) ? fs.readFileSync(historyPath, "utf8") : null);
  } catch (e) {
    fail(`${HISTORY_REL} is present but could not be read: ${e.message}`);
  }

  const now = new Date().toISOString();
  const week = isoWeek(now);
  const prevWeek = prevWeekOf(now);
  for (const e of surfaces) Object.assign(e, prevFromHistory(entries, e.location, week));
  const withPrev = surfaces.filter(e => e.prev_bytes != null).length;
  const growth = `history ${entries.length} entries; ${withPrev} of ${surfaces.length} surface(s) have an earlier week`;

  const ctx = {
    now,
    week,
    prevWeek,
    hasCreds,
    spawn: argvOf => spawnSync(process.execPath, [path.join(REPO, argvOf[0]), ...argvOf.slice(1)],
      { cwd: REPO, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }),
  };
  const { findings, skipped, ran } = runChecks({ surfaces, entries }, ctx);
  const doc = { week, found_by: FOUND_BY, findings };

  const lines = [`audit-headroom: ${week} · ${findings.length} findings · ${surfaces.length} surfaces · growth: ${growth}`];
  for (const e of surfaces) lines.push(`  ${e.location}: ${evidenceText(e)}`);
  for (const slug of CHECK_SLUGS) {
    lines.push(`  ${slug}: ${findings.filter(f => f.check_slug === slug).length} finding(s)`);
  }
  lines.push(`  pin children run: ${ran.join(", ") || "none"}`);
  for (const s of skipped) lines.push(`  SKIPPED, not green: ${s}`);
  if (record) {
    const next = recordHistory(entries, surfaces, week);
    fs.writeFileSync(historyPath, JSON.stringify({ entries: next }, null, 2) + "\n", "utf8");
    lines.push(`  recorded ${surfaces.length} surface(s) at ${week} into ${HISTORY_REL} (${next.length} entries)`);
  }
  if (outArg) {
    fs.writeFileSync(path.resolve(outArg), JSON.stringify(doc, null, 2) + "\n", "utf8");
    lines.push(`  wrote ${outArg}`);
  } else {
    lines.push(JSON.stringify(doc));
  }
  process.stdout.write(lines.join("\n") + "\n");
  process.exit(0);
}

// SES-176's contract: importing this module for its exports must never run the CLI.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main();
}
