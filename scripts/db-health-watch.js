#!/usr/bin/env node
// DeepBench v7.0.731 | scripts/db-health-watch.js | AGT-277 -- A WATCHER OUTSIDE THE DATABASE.
//
// WHY THIS EXISTS, measured live on 2026-09-29 rather than recalled. `cron.job` jobid 5
// `db-health-tick` (`*/5 * * * *`, active) is the only thing that notices the database has stopped
// answering -- and it runs INSIDE the database it measures. `cron.job_run_details` for that jobid
// holds EIGHT consecutive `failed` runs between 04:05:00Z and 04:40:00Z that morning, every one of
// them `job startup timeout`, and `public.db_health_readings` carries the matching hole:
// `04:00:00.657808+00` -> `04:45:00.487736+00`, FORTY-FIVE MINUTES, the only gap over 400 s in 554
// rows. Nobody was told. `db_health_tick()` does file a `db-health-readings-gap` finding for
// exactly this shape -- but only ON RECOVERY, because the tick has to run again to notice, and a
// tick that never returns files nothing. A sensor cannot report its own outage.
//
// SO THIS RUNS OUTSIDE, ON SOMEBODY ELSE'S CLOCK (GitHub Actions; the workflow this build ships is
// `docs/design/agt-277-db-health-watch.yml`, which John copies to `.github/workflows/` on `main`).
// It reads over PostgREST with `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` and PRINTS NEITHER, ever.
//
// AND IT FILES UNDER A DIFFERENT SLUG. `db-health-tick`'s own gap finding is
// `db-health-readings-gap`; this one is `db-health-silent`. Two slugs because they are two
// different claims: the tick's says "there WAS a hole, and I am back"; this one says "there is a
// hole RIGHT NOW, and nothing inside is going to tell you."
//
// THE CONTRACT IS THE EXIT CODE:
//   0  fresh   -- a completed reading exists and is no older than the live window.
//   1  silent  -- the newest completed reading is older than the window, or there is none at all.
//                 One finding is filed through the one intake; the reason goes to stderr.
//   2  cannot judge -- credentials absent, PostgREST refused, `window_minutes` absent or not a
//                 number, or the filing itself failed. FAIL CLOSED (ARCHITECTURE.md §19o): a probe
//                 that cannot read the database must never answer "fine".
//
// EXIT 2 IS THE TOTAL-OUTAGE ALERT, and that is the design rather than a gap in it. If the database
// is gone, both reads fail; the job exits non-zero, GitHub fails the run and emails it -- the same
// visible-failure contract `.github/workflows/meter-reader.yml` documents for its own host. There is
// no second channel to build and no new secret to hold.
//
// THE WINDOW IS READ LIVE, NEVER HARDCODED. `runner_settings.db_health_thresholds.window_minutes`
// (id 1) is the same number `public.db_health_level()` grades against -- 15 at this ship. Move the
// setting and this probe moves with it; copy the 15 into this file and the day it changes the
// probe silently disagrees with the gate it exists to back up.
//
// THE FINGERPRINT CANNOT MOVE WHILE AN OUTAGE RUNS, and that is why the varying evidence lives in
// `locations[].text` and NOT in `locations[].location`. `fingerprint()` is
// `kind|locationKeys|normalize(governing_fact)` and `locationKey()` reads `loc.location` only
// (scripts/audit-ledger.js:190-197), so a timestamp in the text is invisible to it. One outage
// therefore files ONE row: the second and third run of the same silence classify `seen`. Putting
// the timestamp in `location` instead would mint a fresh finding every ten minutes, which is a
// pager, not a ledger.
//
// Flags: `--dry-run` (judge and print, file nothing) · `--json` (one object on stdout).

import path from "path";
import { fileURLToPath } from "url";
import { ingestFindings } from "./audit-ledger.js";

// The two reads, spelled once. `level=not.is.null` is what makes a reading COMPLETED: `fired_at` is
// stamped when the tick starts, and a row whose tick died mid-flight sits there with `level` NULL
// (live example at this ship: id 573, fired 17:45:00.801343+00, every measurement column null).
// Counting that row as a reading would let the watcher report "fresh" off a tick that never
// finished -- the exact failure it is built to catch.
export const SETTINGS_QUERY = "runner_settings?select=db_health_thresholds&id=eq.1";
export const READING_QUERY =
  "db_health_readings?select=id,fired_at,level&level=not.is.null&order=fired_at.desc&limit=1";

export const CHECK_SLUG = "db-health-silent";
export const FOUND_BY = "db-health-watch";
export const SESSION_NAME = "db-health-watch";
export const FINDING_KIND = "other";
export const FINDING_FAMILY = "service";
export const FINDING_TYPE = "defect";
export const FINDING_CONFIDENCE = "high";
export const FINDING_LOCATION = "public.db_health_readings";

export const GOVERNING_FACT =
  "A health reading must complete inside the window, and the check that proves it must run outside "
  + "the database: pg_cron db-health-tick cannot report its own outage.";

export const PROPOSED_RESOLUTION =
  "Restart the database health tick (AGT-237(d)) and confirm a completed reading inside the window.";

// Pure -- argv to options. Anything unrecognised is a usage error (exit 2), never a silent default:
// a scheduled job that quietly ignored a misspelt `--dry-run` would file for real every ten minutes.
export function parseArgs(argv) {
  const opts = { dryRun: false, json: false };
  for (const a of argv ?? []) {
    if (a === "--dry-run") opts.dryRun = true;
    else if (a === "--json") opts.json = true;
    else return { error: `unrecognised argument ${JSON.stringify(a)} (accepts --dry-run, --json)` };
  }
  return opts;
}

// Pure -- the settings rows PostgREST answered, to the window in minutes, or null when the setting
// is absent or not a positive number. null is exit 2, never a default: a probe that invented its
// own window would be grading against a rule nobody set.
export function windowMinutesFrom(rows) {
  const t = Array.isArray(rows) ? rows[0]?.db_health_thresholds : null;
  const w = Number(t?.window_minutes);
  return Number.isFinite(w) && w > 0 ? w : null;
}

// Pure -- the verdict, and the ONE place the comparison lives so the test can drive it without a
// transport. `<=` and not `<`: a reading exactly at the window edge is inside it, the same
// direction `db_health_level()` grades (`b.age > b.w` is unsafe, `=` is not).
export function verdictFor({ rows, windowMinutes, now }) {
  const row = Array.isArray(rows) ? rows[0] : null;
  const firedAt = row?.fired_at ?? null;
  const t = firedAt ? Date.parse(firedAt) : NaN;
  if (!Number.isFinite(t)) {
    // No completed reading at all -- silent, not "cannot judge". The read SUCCEEDED and its answer
    // was "nothing has finished": that is the outage, stated by the database itself.
    return { verdict: "silent", ageMinutes: null, firedAt: null, windowMinutes, checkedAt: new Date(now).toISOString() };
  }
  const ageMinutes = (now - t) / 60000;
  return {
    verdict: ageMinutes <= windowMinutes ? "fresh" : "silent",
    ageMinutes,
    firedAt,
    windowMinutes,
    checkedAt: new Date(now).toISOString(),
  };
}

// Pure -- the finding, exactly as the kickoff words it. EVERY VARYING FACT IS IN `text`; `location`
// is the bare table name, so the fingerprint is stable across a whole outage (see the header).
export function findingFor(v) {
  const age = v.ageMinutes === null ? null : v.ageMinutes.toFixed(1);
  const text = age === null
    ? `no completed reading at all; the window is ${v.windowMinutes} min; probed from outside at ${v.checkedAt}`
    : `newest completed reading at ${v.firedAt}, ${age} min old; the window is ${v.windowMinutes} min; `
      + `probed from outside at ${v.checkedAt}`;
  return {
    kind: FINDING_KIND,
    check_slug: CHECK_SLUG,
    family: FINDING_FAMILY,
    finding_type: FINDING_TYPE,
    confidence: FINDING_CONFIDENCE,
    governing_fact: GOVERNING_FACT,
    locations: [{ location: FINDING_LOCATION, text }],
    proposed_resolution: PROPOSED_RESOLUTION,
  };
}

// --- PostgREST ----------------------------------------------------------------------------------
//
// `get`/`post` are handed to ingestFindings() as ITS transports (the injection seam at
// scripts/audit-ledger.js:438), which is why they match that contract exactly: get(q) -> rows,
// post(table, body) -> resolves, and NEITHER swallows a transport failure. A read that did not
// happen would classify a carried finding as new, and an append whose before-image did not land is
// a row §19v cannot reverse.
//
// `res.status` rather than `res.ok`: a real Response has both, an injected stub has the one the
// test can build, and deriving the bit keeps the two paths identical.
export function transports(env, doFetch) {
  const base = String(env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = String(env.SUPABASE_SERVICE_KEY ?? "");
  // The key rides in headers and NEVER in a message, a URL or a log line (the prompt's standing
  // rule, and §19v's). Every error below names the query, never the credential.
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const body = async res => { try { return await res.text(); } catch { return ""; } };
  const ok = res => Number(res?.status) >= 200 && Number(res?.status) < 300;
  return {
    async get(q) {
      const res = await doFetch(`${base}/rest/v1/${q}`, { headers });
      const text = await body(res);
      if (!ok(res)) throw new Error(`GET ${q} -> HTTP ${res?.status}: ${String(text).slice(0, 200)}`);
      let rows;
      try { rows = JSON.parse(text); } catch (e) { throw new Error(`GET ${q} -> unparseable answer: ${e.message}`); }
      if (!Array.isArray(rows)) throw new Error(`GET ${q} -> answer is not an array of rows`);
      return rows;
    },
    async post(table, payload) {
      const res = await doFetch(`${base}/rest/v1/${table}`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify(payload),
      });
      // `return=minimal` is answered 201 with a ZERO-BYTE body, so nothing here parses one -- the
      // defect AGT-172 spent 24 cycles chasing in scripts/staff-watch.js.
      const text = await body(res);
      if (!ok(res)) throw new Error(`POST ${table} -> HTTP ${res?.status}: ${String(text).slice(0, 200)}`);
    },
  };
}

// --- the run --------------------------------------------------------------------------------
//
// Everything injectable, so the whole contract is testable without a database and without a clock:
// `doFetch`, `now`, `out`, `err`, and `ingest` (ingestFindings itself in production).
export async function main(argv, {
  env = process.env, doFetch = fetch, now = () => Date.now(),
  out = s => process.stdout.write(`${s}\n`), err = s => process.stderr.write(`${s}\n`),
  ingest = ingestFindings,
} = {}) {
  const args = parseArgs(argv);
  if (args.error) { err(`db-health-watch: ${args.error}`); return 2; }
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    err("db-health-watch: SUPABASE_URL and SUPABASE_SERVICE_KEY are required -- nothing was read (exit 2 is never a pass)");
    return 2;
  }

  const { get, post } = transports(env, doFetch);

  let windowMinutes;
  let rows;
  try {
    windowMinutes = windowMinutesFrom(await get(SETTINGS_QUERY));
    if (windowMinutes === null) {
      err("db-health-watch: runner_settings.db_health_thresholds carries no positive window_minutes -- cannot judge (§19o)");
      return 2;
    }
    rows = await get(READING_QUERY);
  } catch (e) {
    err(`db-health-watch: could not read the database -- ${e.message}`);
    return 2;
  }

  const v = verdictFor({ rows, windowMinutes, now: now() });
  const age = v.ageMinutes === null ? null : Number(v.ageMinutes.toFixed(1));

  if (v.verdict === "fresh") {
    const line = `db-health-watch: fresh -- newest completed reading ${v.firedAt}, ${age} min old; window ${windowMinutes} min`;
    if (args.json) out(JSON.stringify({ verdict: "fresh", exit: 0, age_minutes: age, window_minutes: windowMinutes, fired_at: v.firedAt, checked_at: v.checkedAt, filed: 0 }));
    else out(line);
    return 0;
  }

  const finding = findingFor(v);
  const why = v.firedAt === null
    ? `no completed db_health_readings row exists at all; the window is ${windowMinutes} min`
    : `newest completed reading ${v.firedAt} is ${age} min old; the window is ${windowMinutes} min`;

  let result;
  try {
    result = await ingest({
      findings: [finding], foundBy: FOUND_BY, findingType: FINDING_TYPE,
      sessionName: SESSION_NAME, get, post, apply: !args.dryRun,
    });
  } catch (e) {
    // The verdict stands, but the filing did not land -- and a silence nobody recorded is exactly
    // the hole this probe exists to close, so it fails closed rather than exiting 1 as if it had.
    err(`db-health-watch: SILENT -- ${why}; and the finding could not be filed: ${e.message}`);
    return 2;
  }

  err(`db-health-watch: SILENT -- ${why}. ${finding.check_slug}: ${result.written} filed, ${result.reseen} already seen this week${args.dryRun ? " (--dry-run: nothing written)" : ""}`);
  if (args.json) {
    out(JSON.stringify({
      verdict: "silent", exit: 1, age_minutes: age, window_minutes: windowMinutes,
      fired_at: v.firedAt, checked_at: v.checkedAt, filed: result.written, reseen: result.reseen,
      check_slug: CHECK_SLUG, dry_run: args.dryRun,
    }));
  }
  return 1;
}

// Importing this module for its exports must never run the CLI (SES-176). exitCode, not exit():
// process.exit() while fetch's socket is still closing trips a libuv assertion on Windows.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  process.exitCode = await main(process.argv.slice(2));
}
