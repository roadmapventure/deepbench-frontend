// DeepBench v7.0.731 | tests/regression/agt-277-db-health-watch.test.mjs | AGT-277 -- the watcher
// that runs OUTSIDE the database notices a silence the database itself cannot report.
//
// WHAT THIS GUARDS, and why each case discriminates (STANDARDS.md Section 4, the LOO-013 lesson --
// assert WHICH branch fired, never just "it exited"):
//   A  PURE -- scripts/db-health-watch.js driven end to end over an injected PostgREST and an
//      injected clock, through the REAL ingestFindings() so the classification under test is the
//      shipped one and not a restatement of it. The four cases are the kickoff's own §6:
//        1  a completed reading 45.0 min old against a 15 min window -> silent, exit 1, EXACTLY one
//           finding appended, fingerprint F.   (A probe that never fires fails here.)
//        2  the SAME reading 4.0 min old -> fresh, exit 0, zero findings, post never called at all.
//           (A probe that always fires fails here.)
//        3  three consecutive silent runs over ONE outage -> ONE append; runs 2 and 3 classify
//           `seen` on the same F although each run's evidence text carries a different timestamp.
//           (A probe that files per run fails here.)
//        4  no completed reading at all -> silent, exit 1. window_minutes absent -> exit 2, nothing
//           filed. PostgREST 500 -> exit 2, nothing filed. No credentials -> exit 2. Bad flag -> 2.
//           (A probe that swallows an unreadable database and reports "fresh" fails here.)
//      Plus the controls: the fingerprint MUST move when the `location` moves (otherwise case 3
//      would pass on a fingerprint that is simply constant), and case 2 is the same row as case 1
//      with only the clock moved (otherwise "fresh" could be coming from a different fixture).
//   B  LIVE, READ-ONLY (SUPABASE_URL + SUPABASE_SERVICE_KEY; notRun otherwise) -- the window reads
//      back a positive number from runner_settings, and the REAL 2026-09-29 outage
//      (04:00:00.657808+00 -> 04:45:00.487736+00, the only gap over 400 s in the table) is still
//      there and replays through the pure verdict as `silent` at 45.0 min. Nothing is written:
//      a regression run never mutates working data (pattern:76), and `audit_findings` is
//      append-only and off reversible_tables() -- a row filed here could not be taken back.
//
// DRY-RUN against the tree before this ticket: A fails at import (scripts/db-health-watch.js does
// not exist) and B fails at its first assertion for the same reason (verdictFor is unimportable).
//
// BOTH ARMS ARE GREEN WITHOUT THE WORKFLOW. docs/design/agt-277-db-health-watch.yml is copied to
// .github/workflows/ on `main` by John (the one attended step); nothing below depends on it.

import assert from "assert";
import { selfRun, notRun } from "./_lib/self-run.js";
import { fingerprint, ingestFindings } from "../../scripts/audit-ledger.js";
import {
  main, verdictFor, findingFor, windowMinutesFrom, parseArgs,
  CHECK_SLUG, FINDING_LOCATION, GOVERNING_FACT,
} from "../../scripts/db-health-watch.js";

// A distinctive sentinel, not "k": the no-leak assertion at the end of arm A greps every printed
// line for this exact string, and a one-character key would match half the English in them.
const ENV = { SUPABASE_URL: "https://example.invalid", SUPABASE_SERVICE_KEY: "SENTINEL-service-key-never-printed" };
const WINDOW = 15;
const FIRED = "2026-09-29T04:00:00.657808+00:00";
const RECOVERED = "2026-09-29T04:45:00.487736+00:00";

const res = (status, body) => ({ status, text: async () => (typeof body === "string" ? body : JSON.stringify(body)) });

// An injected PostgREST that is enough of one for ingestFindings() to run against: the two reads
// this script makes, the ledger read the intake makes, and the two appends it makes. `ledger` is
// mutated by an append, which is what lets case 3 run three times against one growing ledger.
function fakeRest({ settings, readings, ledger = [], readingsStatus = 200 }) {
  const posts = [];
  const gets = [];
  const doFetch = async (url, init = {}) => {
    const q = String(url).split("/rest/v1/")[1] ?? "";
    if ((init.method ?? "GET") === "GET") {
      gets.push(q);
      if (q.startsWith("runner_settings")) return res(200, settings);
      if (q.startsWith("db_health_readings")) return res(readingsStatus, readingsStatus === 200 ? readings : "boom");
      if (q.startsWith("audit_findings")) return res(200, ledger);
      return res(404, `no fixture for ${q}`);
    }
    const table = q.split("?")[0];
    const body = JSON.parse(init.body);
    posts.push({ table, body });
    if (table === "audit_findings") {
      ledger.push({ fingerprint: body.fingerprint, iso_week: body.iso_week, status: body.status, locations: body.locations });
    }
    return res(201, "");          // Prefer: return=minimal -- 201 with a zero-byte body (AGT-172).
  };
  return { doFetch, posts, gets, ledger };
}

const appended = posts => posts.filter(p => p.table === "audit_findings");
const images = posts => posts.filter(p => p.table === "runner_before_images");

const runWatch = async (rest, atIso, argv = []) => {
  const lines = [];
  const code = await main(argv, {
    env: ENV, doFetch: rest.doFetch, now: () => Date.parse(atIso),
    out: s => lines.push(s), err: s => lines.push(s), ingest: ingestFindings,
  });
  return { code, lines };
};

const SETTINGS = [{ db_health_thresholds: { window_minutes: WINDOW, amber_probe_ms: 3000 } }];
const READING = [{ id: 416, fired_at: FIRED, level: "green" }];

async function armPure() {
  // --- argument and settings parsing, both directions -----------------------------------------
  assert.deepStrictEqual(parseArgs([]), { dryRun: false, json: false });
  assert.deepStrictEqual(parseArgs(["--dry-run", "--json"]), { dryRun: true, json: true });
  assert.ok(parseArgs(["--dryrun"]).error, "a misspelt flag must be a usage error, never a silent default");
  assert.strictEqual(windowMinutesFrom(SETTINGS), WINDOW);
  for (const bad of [[], [{}], [{ db_health_thresholds: {} }], [{ db_health_thresholds: { window_minutes: 0 } }],
    [{ db_health_thresholds: { window_minutes: "soon" } }]]) {
    assert.strictEqual(windowMinutesFrom(bad), null, `windowMinutesFrom(${JSON.stringify(bad)}) must be null, never a default`);
  }

  // The fingerprint under test, and the control that proves it is not simply constant.
  const at45 = verdictFor({ rows: READING, windowMinutes: WINDOW, now: Date.parse(RECOVERED) });
  const F = fingerprint(findingFor(at45));
  const moved = fingerprint({ ...findingFor(at45), locations: [{ location: "public.something_else", text: "x" }] });
  assert.notStrictEqual(moved, F, "control: the fingerprint must move when the location moves");
  assert.strictEqual(findingFor(at45).locations[0].location, FINDING_LOCATION,
    "the location must carry NO timestamp -- locationKey() is the fingerprint material");
  assert.ok(/45\.0 min old/.test(findingFor(at45).locations[0].text),
    `the evidence text must name the age; got ${findingFor(at45).locations[0].text}`);

  // --- case 1: 45.0 min old against a 15 min window -> silent, exit 1, exactly one finding ------
  const r1 = fakeRest({ settings: SETTINGS, readings: READING });
  const c1 = await runWatch(r1, RECOVERED);
  assert.strictEqual(c1.code, 1, `45 min of silence must exit 1; got ${c1.code}\n${c1.lines.join("\n")}`);
  assert.strictEqual(appended(r1.posts).length, 1, `exactly one finding; got ${appended(r1.posts).length}`);
  assert.strictEqual(images(r1.posts).length, 1, "one before-image, written BEFORE the append (§19v)");
  assert.strictEqual(r1.posts[0].table, "runner_before_images", "the before-image must be the FIRST write");
  const row = appended(r1.posts)[0].body;
  assert.strictEqual(row.fingerprint, F, `the filed row must carry fingerprint F; got ${row.fingerprint}`);
  assert.strictEqual(row.check_slug, CHECK_SLUG, `the slug must be ${CHECK_SLUG} -- db-health-tick's own gap finding is a different one`);
  assert.strictEqual(row.family, "service");
  assert.strictEqual(row.finding_type, "defect");
  assert.strictEqual(row.confidence, "high");
  assert.strictEqual(row.governing_fact, GOVERNING_FACT);
  assert.strictEqual(row.cycle_id, null, "attribution is the session, never both (ck_before_image_attribution)");
  assert.strictEqual(images(r1.posts)[0].body.session_name, "db-health-watch");
  assert.strictEqual(images(r1.posts)[0].body.cycle_id, null);
  assert.strictEqual(images(r1.posts)[0].body.row_data, null, "the row did not exist before");
  assert.ok(c1.lines.some(l => /SILENT/.test(l)), `the reason must be stated; got\n${c1.lines.join("\n")}`);

  // --- case 2: the SAME reading, 4.0 min old -> fresh, exit 0, nothing posted -------------------
  const r2 = fakeRest({ settings: SETTINGS, readings: READING });
  const c2 = await runWatch(r2, "2026-09-29T04:04:00.657808+00:00");
  assert.strictEqual(c2.code, 0, `4 min old must exit 0; got ${c2.code}\n${c2.lines.join("\n")}`);
  assert.strictEqual(r2.posts.length, 0, `a fresh reading must POST nothing at all; got ${JSON.stringify(r2.posts)}`);
  assert.ok(!r2.gets.some(q => q.startsWith("audit_findings")),
    "a fresh reading must not even read the ledger -- the intake is never entered");
  // The edge, both sides: exactly at the window is inside it; one millisecond past is not.
  assert.strictEqual(verdictFor({ rows: READING, windowMinutes: WINDOW, now: Date.parse(FIRED) + WINDOW * 60000 }).verdict, "fresh");
  assert.strictEqual(verdictFor({ rows: READING, windowMinutes: WINDOW, now: Date.parse(FIRED) + WINDOW * 60000 + 1 }).verdict, "silent");

  // --- case 3: three runs over ONE outage -> one append, then `seen`, `seen` --------------------
  const r3 = fakeRest({ settings: SETTINGS, readings: READING });
  const codes = [];
  for (const at of ["2026-09-29T04:20:00Z", "2026-09-29T04:30:00Z", "2026-09-29T04:40:00Z"]) {
    codes.push((await runWatch(r3, at)).code);
  }
  assert.deepStrictEqual(codes, [1, 1, 1], "every run of an outage reports silent");
  assert.strictEqual(appended(r3.posts).length, 1,
    `one outage files ONE row; got ${appended(r3.posts).length} -- the fingerprint moved with the evidence text`);
  assert.strictEqual(images(r3.posts).length, 1, "and exactly one before-image, not one per run");
  assert.strictEqual(appended(r3.posts)[0].body.fingerprint, F);
  // Discriminating control: the three runs really did carry DIFFERENT evidence -- so the single
  // append above is the `seen` classification firing, not three identical strings coinciding.
  const texts = ["2026-09-29T04:20:00Z", "2026-09-29T04:30:00Z", "2026-09-29T04:40:00Z"].map(at =>
    findingFor(verdictFor({ rows: READING, windowMinutes: WINDOW, now: Date.parse(at) })).locations[0].text);
  assert.strictEqual(new Set(texts).size, 3, `the three runs must carry three different texts; got ${JSON.stringify(texts)}`);
  assert.strictEqual(new Set(texts.map((t, i) =>
    fingerprint(findingFor(verdictFor({ rows: READING, windowMinutes: WINDOW, now: Date.parse(["2026-09-29T04:20:00Z", "2026-09-29T04:30:00Z", "2026-09-29T04:40:00Z"][i]) }))))).size, 1,
    "and one fingerprint across all three");

  // --- case 4: no reading at all; then the two ways to be unable to judge -----------------------
  const r4 = fakeRest({ settings: SETTINGS, readings: [] });
  const c4 = await runWatch(r4, RECOVERED);
  assert.strictEqual(c4.code, 1, `no completed reading at all is SILENT (exit 1), not a pass; got ${c4.code}`);
  assert.strictEqual(appended(r4.posts).length, 1, "and it files the finding");
  assert.ok(/no completed reading at all/.test(appended(r4.posts)[0].body.locations[0].text),
    `the evidence must say there was none; got ${appended(r4.posts)[0].body.locations[0].text}`);
  assert.strictEqual(appended(r4.posts)[0].body.fingerprint, F,
    "the same outage under a different symptom is the same finding -- the location did not move");

  const r5 = fakeRest({ settings: [{ db_health_thresholds: { amber_probe_ms: 3000 } }], readings: READING });
  const c5 = await runWatch(r5, RECOVERED);
  assert.strictEqual(c5.code, 2, `an absent window_minutes must fail closed to 2; got ${c5.code}\n${c5.lines.join("\n")}`);
  assert.strictEqual(r5.posts.length, 0, "and file nothing");
  assert.ok(!r5.gets.some(q => q.startsWith("db_health_readings")), "and never reach the reading it cannot grade");

  const r6 = fakeRest({ settings: SETTINGS, readings: READING, readingsStatus: 500 });
  const c6 = await runWatch(r6, RECOVERED);
  assert.strictEqual(c6.code, 2, `a PostgREST 500 must be 2, never 0; got ${c6.code}\n${c6.lines.join("\n")}`);
  assert.strictEqual(r6.posts.length, 0, "and file nothing");

  const noCreds = [];
  assert.strictEqual(await main([], { env: {}, out: s => noCreds.push(s), err: s => noCreds.push(s) }), 2,
    "no credentials is exit 2, never a pass");
  assert.ok(noCreds.some(l => !/SUPABASE_SERVICE_KEY=/.test(l)), "and says so without printing a key");
  const badFlag = [];
  assert.strictEqual(await main(["--nope"], { env: ENV, out: s => badFlag.push(s), err: s => badFlag.push(s) }), 2);

  // --dry-run judges and files nothing.
  const r7 = fakeRest({ settings: SETTINGS, readings: READING });
  const c7 = await runWatch(r7, RECOVERED, ["--dry-run", "--json"]);
  assert.strictEqual(c7.code, 1, "--dry-run still reports the silence");
  assert.strictEqual(r7.posts.length, 0, `--dry-run must write nothing; got ${JSON.stringify(r7.posts)}`);
  const json = JSON.parse(c7.lines.find(l => l.startsWith("{")));
  assert.strictEqual(json.verdict, "silent");
  assert.strictEqual(json.filed, 0);
  assert.strictEqual(json.window_minutes, WINDOW);
  assert.strictEqual(json.age_minutes, 45, `--json must carry the measured age; got ${json.age_minutes}`);

  // No credential ever reaches stdout/stderr, on any path above.
  for (const l of [...c1.lines, ...c2.lines, ...c5.lines, ...c6.lines, ...c7.lines]) {
    assert.ok(!l.includes(ENV.SUPABASE_SERVICE_KEY), `a printed line carried the service key: ${l}`);
  }
  return `7 pure runs: exit 1/0/1,1,1/1/2/2/1, one append per outage, fingerprint ${F}`;
}

async function armLive(base, key) {
  const h = { apikey: key, Authorization: `Bearer ${key}` };
  const settings = await (await fetch(`${base}/rest/v1/runner_settings?id=eq.1&select=db_health_thresholds`, { headers: h })).json();
  const w = windowMinutesFrom(settings);
  assert.ok(Number.isFinite(w) && w > 0,
    `runner_settings.db_health_thresholds.window_minutes must be a positive number; got ${JSON.stringify(settings?.[0]?.db_health_thresholds)}`);

  // The real outage, still in the table: 04:00:00.657808+00 completes, then NOTHING until
  // 04:45:00.487736+00. Read by the script's own query shape, restricted to that morning.
  const rows = await (await fetch(
    `${base}/rest/v1/db_health_readings?select=id,fired_at,level&level=not.is.null`
    + `&fired_at=gte.2026-09-29T03:55:00Z&fired_at=lte.2026-09-29T04:50:00Z&order=fired_at.asc`,
    { headers: h })).json();
  const firedAts = rows.map(r => r.fired_at);
  assert.ok(firedAts.includes("2026-09-29T04:00:00.657808+00:00"),
    `the 04:00 reading is gone from db_health_readings; got ${JSON.stringify(firedAts)}`);
  assert.ok(firedAts.includes("2026-09-29T04:45:00.487736+00:00"),
    `the 04:45 recovery reading is gone; got ${JSON.stringify(firedAts)}`);
  const i = firedAts.indexOf("2026-09-29T04:00:00.657808+00:00");
  assert.strictEqual(firedAts[i + 1], "2026-09-29T04:45:00.487736+00:00",
    `something now sits inside the 45-minute gap: ${JSON.stringify(firedAts.slice(i, i + 3))}`);

  // It replays through the pure verdict as `silent` at 45.0 min against the LIVE window.
  const v = verdictFor({
    rows: [{ fired_at: "2026-09-29T04:00:00.657808+00:00" }],
    windowMinutes: w,
    now: Date.parse("2026-09-29T04:45:00.487736+00:00"),
  });
  assert.strictEqual(v.verdict, "silent", `the real 45-minute gap must read silent against a ${w} min window`);
  assert.strictEqual(v.ageMinutes.toFixed(1), "45.0", `the gap measures ${v.ageMinutes} min, expected 45.0`);
  // Control, same live window: the reading one tick before it was NOT silent at its own next tick.
  const ok = verdictFor({
    rows: [{ fired_at: "2026-09-29T03:55:00.465547+00:00" }],
    windowMinutes: w,
    now: Date.parse("2026-09-29T04:00:00.657808+00:00"),
  });
  assert.strictEqual(ok.verdict, "fresh", "control: a normal 5-minute tick must read fresh, or `silent` means nothing");
  return `window ${w} min live; the 2026-09-29 04:00->04:45 gap replays silent at 45.0 min`;
}

async function run() {
  const results = [await armPure()];
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!base || !key) {
    notRun("the live arm (window_minutes reads back a number; the 2026-09-29 45-minute gap replays silent)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent. Canonical invocation: STANDARDS.md Section 2 rule 5.");
  } else {
    results.push(await armLive(base, key));
  }
  console.log(`[AGT-277] ${results.join("; ")}`);
  return results;
}

selfRun(import.meta.url, run);
export default run;
