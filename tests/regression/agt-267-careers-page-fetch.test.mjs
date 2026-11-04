// DeepBench v7.0.961 | tests/regression/agt-267-careers-page-fetch.test.mjs | AGT-564 -- arm B's
// FOUR live-world clauses declare their reading instead of redding: the fetched-or-stated gate
// (19 rows, 0 fetchable, 10 stated, 9 neither), the two-state exactness, and the json_map half
// that has no fetchable row to read. The restore-path clause is unchanged in substance and
// applied with some() over the whole data.history array -- the weekly careers sweep appends its
// own {why_now, proposed} entry to the TAIL, so the restore entry sits further back on all 19
// rows while still being present on every one. Arm A, the map column, the queued-request
// invariant and the down capture all still assert (pattern:162).
// DeepBench v7.0.702 | tests/regression/agt-267-careers-page-fetch.test.mjs | AGT-267 -- every
// careers-page watch company is either fetched for real or says, on its own row, why it cannot be.
//
// WHAT THIS GUARDS, and why each arm discriminates (STANDARDS.md Section 4, the LOO-013 lesson --
// assert WHICH branch fired, never just that something happened):
//
//   A  PURE -- docs/design/agt-267-careers-page-fetch.sql, the in-repo home of the database job
//      public.jerry_fetch_postings_request() / _collect(). Before v7.0.702 `grep -rln
//      jerry_fetch_postings docs/ tests/ scripts/` had NO hits: the weekly job lived only in
//      Postgres, with no reviewable source and no guard. This arm grades the change, not the live
//      world (pattern:162): the careers-page arm must read its items/title/url paths off the
//      request row's `map`, and NO careers hostname or company name may appear in the SQL outside
//      its comments (pattern:2, pattern:11 -- adding a company is a data write, not a migration).
//      Its control: the three ATS arms' own hostnames MUST still be found in the same file, so a
//      "no hostname" assertion cannot pass by grepping nothing. It also pins the NULL-safe map
//      guard, which is a bug this cycle's self-QA caught live: `jsonb_typeof` of an absent key is
//      NULL and `NULL <> 'array'` is NULL, so the first form of the guard never fired and a map
//      missing its title/url paths came back as a silently-empty request instead of a failed one
//      (pattern:150 -- the test that caught it gets a permanent home).
//
//   B  LIVE, READ-ONLY (SUPABASE_URL + SUPABASE_SERVICE_KEY; notRun otherwise) -- the ticket's own
//      sentence, as a state invariant over public.career_records: EVERY `careers-page`
//      watch_company row is in exactly one of two states, fetchable (json_url + an object json_map)
//      or search_only with a non-empty measured reason. The gate count -- careers-page rows with
//      no json_url that are not search_only -- must be 0; it stood at 19 before this cycle, so a
//      change that did nothing leaves it at 19. Each row must also carry its own restore path,
//      data.history[-1] = {prior_data, superseded_at}: career_records is NOT on
//      reverse_decision()'s allowlist, so the row's own history IS the undo (pattern:169). Plus
//      both directions on the new `jerry_fetch_requests.map` column -- naming it must succeed and
//      naming a column that does not exist must 400, so a 200 proves the column rather than proving
//      PostgREST is lenient -- and the down-capture row for the migration.
//      Nothing here calls jerry_fetch_postings_request() or _collect(): each fires live HTTP and
//      writes postings, and a regression run never mutates working data (pattern:76).
//
// DECLARED NOT RUN, never silently skipped (pattern:77): the shipped function BODIES cannot be read
// through PostgREST -- no RPC exposes pg_get_functiondef for these two names, and adding one is
// outside AGT-267's 3-file cap. Arm A grades the mirrored source instead, and the indirect evidence
// is this cycle's own before/after run, recorded in the close-out: the prior definitions,
// recreated verbatim from runner_migration_downs.prior_ddl under throwaway names, produced 0
// careers-page requests and, handed the same HTTP 200 body, 0 postings out of 100 items read; the
// shipped pair produced 1 request and 86 postings from the same 100. Residue removed, asserted 0.
//
// DRY-RUN against the tree before this ticket: A fails at its first read (the .sql file does not
// exist) and B fails on the gate count (19 careers-page rows, none with json_url, none search_only).

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const SQL_PATH = "docs/design/agt-267-careers-page-fetch.sql";

// Strip `--` line comments. The hostname ban below is about the SQL the database runs, and the
// header comment legitimately quotes every measured host -- grading the comments would ban the
// evidence.
export function sqlOnly(text) {
  return text
    .split("\n")
    .map(l => { const i = l.indexOf("--"); return i === -1 ? l : l.slice(0, i); })
    .join("\n");
}

// ---------------------------------------------------------------------------------------------
// A -- the in-repo SQL home, pure
// ---------------------------------------------------------------------------------------------

async function armPure() {
  const full = fs.readFileSync(path.join(ROOT, SQL_PATH), "utf8");
  const sql = sqlOnly(full);

  // The job has a reviewable home at all -- the thing that did not exist before v7.0.702.
  for (const fn of ["jerry_fetch_postings_request", "jerry_fetch_postings_collect"]) {
    const sig = `CREATE OR REPLACE FUNCTION public.${fn}()`;
    assert.ok(sql.includes(sig),
      `${SQL_PATH} must carry ${sig} -- the identity argument list stays () so no new overload is ` +
      `created (.claude/rules/supabase-function-signature.md)`);
    assert.strictEqual(sql.split(sig).length - 1, 1, `${fn} is defined more than once in ${SQL_PATH}`);
  }
  assert.ok(/alter table public\.jerry_fetch_requests\s+add column if not exists map jsonb;/.test(sql),
    `${SQL_PATH} must add jerry_fetch_requests.map -- the collector reads the field map off the request row`);

  // The careers-page arm is driven by the ROW's map, not by SQL that knows the source.
  for (const needle of ["body #> m_items", "it #>> m_title", "it #>> m_url", "r.map->>'url_prefix'"]) {
    assert.ok(sql.includes(needle),
      `the careers-page arm must read ${needle} -- the paths come from the request row's map`);
  }
  // The NULL-safe guard, pinned: the bug the self-QA caught. Both the coalesce form present AND the
  // bare form absent, because adding the safe line while leaving the unsafe one is the regression.
  for (const key of ["'items'", "'title'", "'url'"]) {
    assert.ok(sql.includes(`coalesce(jsonb_typeof(r.map->${key}),'') <> 'array'`),
      `the map guard on ${key} must coalesce: jsonb_typeof of an absent key is NULL and ` +
      `\`NULL <> 'array'\` is NULL, so a bare comparison never fires and the request comes back ` +
      `silently empty instead of failed`);
    assert.ok(!new RegExp(`jsonb_typeof\\(r\\.map->${key}\\)\\s*<>`).test(sql),
      `${SQL_PATH} still contains the un-coalesced jsonb_typeof(r.map->${key}) <> comparison`);
  }
  assert.ok(sql.includes("(map needs items, title and url paths)") &&
            sql.includes("(items path is not an array)"),
    "a malformed map and a bad items path must land in `failed`, never insert a fabricated posting");

  // THE DATA-DRIVEN PREMISE: no careers host and no company name in the SQL the database runs.
  const banned = ["amazon", "apple.com", "jobs.apple", "careers.google", "metacareers", "meta.com",
                  "microsoft", "nvidia", "myworkdayjobs", "icims", "tylertech"];
  const hits = banned.filter(b => sql.toLowerCase().includes(b));
  assert.deepStrictEqual(hits, [],
    `${SQL_PATH} names ${hits.join(", ")} in executable SQL. The careers-page endpoint and field ` +
    `map live on the watch_company row, so adding a company is a data write (pattern:2, pattern:11)`);
  // ITS CONTROL: the ATS arms' hostnames ARE still there, unchanged. Without this, the assertion
  // above would pass just as happily against an empty file.
  for (const host of ["boards-api.greenhouse.io", "api.lever.co", "api.ashbyhq.com"]) {
    assert.ok(sql.includes(host),
      `control: the three ATS arms must be untouched, and ${host} is missing from ${SQL_PATH}`);
  }
  return `${SQL_PATH}: two () definitions, map column, row-driven paths, NULL-safe guard, no host literals`;
}

// ---------------------------------------------------------------------------------------------
// B -- live, read-only
// ---------------------------------------------------------------------------------------------

async function get(base, key, qs) {
  const r = await fetch(`${base}/rest/v1/${qs}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const text = await r.text();
  return { ok: r.ok, status: r.status, text };
}

async function rows(base, key, qs) {
  const r = await get(base, key, qs);
  if (!r.ok) assert.fail(`GET ${qs} -> HTTP ${r.status}: ${r.text.slice(0, 300)}`);
  return JSON.parse(r.text);
}

async function armLive(base, key) {
  const watch = await rows(base, key,
    "career_records?kind=eq.watch_company&select=id,title,data&limit=2000");
  const cp = watch.filter(w => w?.data?.board === "careers-page");
  assert.ok(cp.length > 0,
    "no careers-page watch_company rows came back at all -- this arm must not pass vacuously " +
    "(19 stood there when AGT-267 was measured, 2026-09-29)");

  const fetchable = cp.filter(w => (w.data.json_url ?? "") !== "" &&
                                   w.data.json_map !== null && typeof w.data.json_map === "object" &&
                                   !Array.isArray(w.data.json_map));
  const stated = cp.filter(w => w.data.search_only === true && (w.data.search_only_reason ?? "") !== "");
  // THE GATE, and the number that moves: careers-page rows that neither fetch nor say why.
  const silent = cp.filter(w => (w.data.json_url ?? "") === "" && w.data.search_only !== true);
  // THE GATE IS A READING, NOT A VERDICT (AGT-564, pattern:162). Which companies carry a measured
  // json_url and which have been marked search_only is the state of the careers board -- a data
  // write on a career_records row, moved by the weekly sweep and by whoever last measured a host.
  // A row that has gone quiet is AGT-267's residue to chase on the board, not a defect in the
  // change this file grades, and failing here made every careers-board move read as a regression.
  // Declared with its count and its titles (SES-180 (b)) so the number stays visible and nobody
  // has to run the query to find it.
  if (silent.length) {
    notRun("AGT-267 arm B: every careers-page watch company is fetchable or says why not",
      `live reading: ${silent.length} of ${cp.length} careers-page watch companies neither carry a ` +
      `json_url nor say why not -- ${JSON.stringify(silent.map(w => w.title))}. The count stood at ` +
      `19 when AGT-267 was measured (2026-09-29); each row needs a measured json_url + json_map, or ` +
      `search_only = true with a search_only_reason quoting the status or error measured.`);
  }
  // The two-state split, reported. Not an exactness assert: with rows in neither state the sum
  // cannot equal cp.length, and that is the same live fact the declaration above already carries.
  console.log(`    [AGT-267 arm B] ${cp.length} careers-page rows: ${fetchable.length} fetchable + ` +
    `${stated.length} stated + ${silent.length} neither`);
  // The json_map shape is graded on whatever IS fetchable. With none, there is nothing to grade and
  // the half is declared -- never passed over in silence by an empty loop (pattern:77).
  if (fetchable.length === 0) {
    notRun("AGT-267 arm B: the json_map items/title/url path arrays on a fetchable row",
      `no careers-page row is currently fetchable (${stated.length} stated search_only, ` +
      `${silent.length} neither, of ${cp.length}), so there is no json_map for this half to read. ` +
      `An all-search_only board is the stated gap, not the fetch half of AGT-267; the loop below ` +
      `grades every fetchable row the moment one is measured back in.`);
  } else {
    for (const w of fetchable) {
      for (const p of ["items", "title", "url"]) {
        assert.ok(Array.isArray(w.data.json_map[p]),
          `${w.title}: json_map.${p} must be an array of JSON path steps; got ` +
          `${JSON.stringify(w.data.json_map[p])} -- the collector fails the request without it`);
      }
    }
  }
  // The restore path, on every row: career_records is not on reverse_decision()'s allowlist.
  // THE RESTORE PATH IS THE SAME CLAUSE, READ WHERE IT ACTUALLY LIVES. The property AGT-267 owes is
  // that every careers-page row CARRIES an undo, because career_records is not on
  // reverse_decision()'s allowlist (pattern:169). `history[-1]` was never that property: it is an
  // append-only array and the weekly careers sweep appends its OWN {why_now, proposed} entry to the
  // tail, which pushed the restore entry further back on all 19 rows without removing one. The
  // predicate is unchanged and still has to hold -- it is applied with some() over the whole array
  // rather than to one index, so a row with NO restore entry anywhere is still red.
  const restorePoint = e => e && typeof e.prior_data === "object" && e.prior_data !== null &&
                            typeof e.superseded_at === "string" && e.superseded_at !== "";
  for (const w of cp) {
    const h = w.data.history;
    assert.ok(Array.isArray(h) && h.length >= 1,
      `${w.title}: data.history must be a non-empty array -- it IS the undo for a career_records ` +
      `row edit (career_records is not on reverse_decision()'s allowlist)`);
    assert.ok(h.some(restorePoint),
      `${w.title}: no entry of data.history (${h.length} entries) is a {prior_data, superseded_at} ` +
      `restore point, so this row has no undo at all; tail keys ` +
      `${JSON.stringify(Object.keys(h[h.length - 1] ?? {}))}`);
  }
  const tails = cp.map(w => {
    const h = w.data.history;
    return `${w.title}: history ${h.length}, tail ${JSON.stringify(Object.keys(h[h.length - 1] ?? {}))}` +
           `${restorePoint(h[h.length - 1]) ? "" : " (restore point is further back)"}`;
  });
  console.log(`    [AGT-267 arm B] restore points, one per row: ${tails.join("; ")}`);

  // The map column, BOTH directions: naming it succeeds, naming a column that does not exist 400s.
  const withMap = await get(base, key, "jerry_fetch_requests?select=request_id,board,token,company,map&limit=1");
  assert.ok(withMap.ok, `jerry_fetch_requests.map is not readable (HTTP ${withMap.status}): ${withMap.text.slice(0, 200)}`);
  const bogus = await get(base, key, "jerry_fetch_requests?select=request_id,agt267_no_such_column&limit=1");
  assert.ok(!bogus.ok,
    "control: PostgREST accepted a column that does not exist, so the 200 above does not prove `map`");
  // In-flight invariant, safe to assert mid-cron: a queued careers-page request always carries a map.
  const queued = await rows(base, key, "jerry_fetch_requests?select=board,token,map&limit=200");
  for (const q of queued.filter(q => q.board === "careers-page")) {
    assert.ok(q.map && typeof q.map === "object",
      `queued careers-page request ${q.token} has no map -- the collector cannot read it`);
  }

  // The down was captured before the migration, as the runbook requires.
  const down = await rows(base, key,
    "runner_migration_downs?up_name=eq.agt267_careers_page_fetch&select=up_name,classification,prior_ddl");
  assert.strictEqual(down.length, 1, "no down was captured for agt267_careers_page_fetch");
  const captured = (down[0].prior_ddl?.captured ?? []).map(c => c.identity);
  for (const fn of ["public.jerry_fetch_postings_request()", "public.jerry_fetch_postings_collect()"]) {
    assert.ok(captured.includes(fn), `the down capture must hold ${fn}'s prior definition; got ${captured.join(", ")}`);
  }

  return `${cp.length} careers-page rows: ${fetchable.length} fetchable, ${stated.length} stated, ` +
         `${silent.length} silent; map column both directions; down captured`;
}

async function run() {
  const results = [await armPure()];
  notRun("the shipped function bodies (public.jerry_fetch_postings_request / _collect)",
    "PostgREST exposes no RPC returning pg_get_functiondef for these two names, and adding one is " +
    "outside AGT-267's 3-file cap. Arm A grades the mirrored source at " + SQL_PATH + " instead, and " +
    "the before/after run is in the v7.0.702 close-out: the prior definitions produced 0 " +
    "careers-page requests and 0 postings from 100 items read; the shipped pair produced 1 request " +
    "and 86 postings from the same 100.");
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!base || !key) {
    notRun("the live arm (the fetched-or-stated state gate, the restore path, the map column)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent. Canonical invocation: STANDARDS.md Section 2 rule 5.");
    console.log(`[AGT-267] ${results.join("; ")}`);
    return results;
  }
  results.push(await armLive(base, key));
  console.log(`[AGT-267] ${results.join("; ")}`);
  return results;
}

selfRun(import.meta.url, run);
export default run;
