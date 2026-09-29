// DeepBench v7.0.704 | tests/regression/agt-268-posting-populations.test.mjs | AGT-268
//
// FEATURE: AGT-268 -- a capability write-back must not be counted as a posting the platform fetched.
// `career_records` held ONE kind for two populations: 148 rows a fetch wrote (all carrying
// `data.text`) and 162 rows Jerry's own capabilities wrote back through `records_to_write` (all with
// an empty `data.text`, 79 of them on a url a fetch row already held). So the 2026-09-27 market watch
// reported "68 of 216 fetched postings had no text" -- a coverage metric measuring its own
// write-backs. Over fetch rows alone the figure is 0 of 148.
//
// THE FIX HAS TWO HALVES AND THIS FILE GRADES BOTH: the code forks a `posting` write-back on a
// provable fact -- does a posting row already hold this `data.url` -- PATCHing that row when it does
// and inserting the new kind `posting_note` when it does not; and the migration
// `agt268_posting_note_backfill` reclassifies the 162 historical write-backs. `kind:'posting'` is
// left with exactly one creator, `fetchPostings()`.
//
// PARTS, matching the kickoff's QA section:
//   (a) SOURCE, on fixtures, ALWAYS RUNS -- planPostingWriteBacks() returns `patch` with the merged
//       data for an item whose url is in byUrl AND `insert` with kind `posting_note` for one that is
//       not: the PAIR, never one half, because either alone is satisfiable by a function that ignores
//       byUrl. Controls: the same item flips branch when the url is taken out of byUrl (so the fork
//       reads byUrl, not the item); `data.text` survives an item that omits it (the whole defect);
//       a non-posting item comes back untouched and by reference; a posting item with no url at all
//       lands as `posting_note`; and NO plan entry ever inserts `kind:'posting'`.
//   (b) STATIC -- KINDS carries `posting_note`; the five READ_MAP entries that read `posting` read it
//       too; every KIND_FILTERS entry that filters `posting` carries the same predicate for
//       `posting_note` (without it the new kind arrives UNFILTERED, and match-finder -- whose filter
//       exists to hand it only jobs it has not judged -- would be served every reviewed write-back);
//       both de-dup reads ask for `kind=in.(posting,posting_note)`. Controls: a copy with the widened
//       read reverted fails the read check, and a copy with the posting_note filters removed fails
//       the filter check.
//   (c) LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY; declared NOT RUN otherwise, never silently
//       skipped) -- (i) `kind='posting'` is 148 rows, every one fetch-sourced; (ii) no `kind='posting'`
//       row has an empty `data.text`; (iii) THE PIN -- `--write` an answer carrying two `kind:'posting'`
//       items, one url copied from a live fetch row and one url no row holds, then assert the
//       `kind='posting'` count is STILL 148, the fetch row's `data` now carries the item's keys with
//       its `text` intact, and the second item landed as `posting_note`. Before-image first, restored
//       and deleted after.
//
// IT FAILS IF THE CHANGE DOES NOTHING: on the pre-change tree planPostingWriteBacks is not exported
// at all (part (a) throws), READ_MAP/KINDS carry no `posting_note` (part (b)), and the PIN's write
// takes `kind='posting'` from 148 to 149 while (ii) finds 162 empty-text rows.
//
// WHILE THE MIGRATION IS PENDING, part (c) DECLARES ITSELF NOT RUN rather than failing or quietly
// passing (pattern:77). The gate is narrow and is a fact about the tree, not a mood: `posting_note`
// rows = 0 AND career-sourced `posting` rows > 0 -- the exact pre-backfill signature. A text-less
// FETCH row, or any other shape, is a real failure and goes red. The whole arm runs the moment the
// cycle applies the migration.
//
// PRIVATE DATA. career_records is John's; this file prints counts and ids only, never a record.

import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCRIPT_REL = "scripts/personal-agent.js";
const SCRIPT = path.join(ROOT, SCRIPT_REL);
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const RUN = randomUUID().slice(0, 8);

// The measured populations this ticket separates (REST, service key, 2026-09-29, pre-migration):
// 310 = 148 fetch-sourced (all with text) + 162 career-sourced (all text-less).
const FETCHED = 148;
const WRITE_BACKS = 162;
// The five capabilities whose READ_MAP entry reads postings, and so must read the notes beside them.
const POSTING_READERS = [
  "career-strengths-gaps", "career-posting-review", "career-match-finder",
  "career-growth-review", "career-linkedin-alerts",
];
const WIDENED_READ = "kind=in.(posting,posting_note)";

function load() {
  return import(pathToFileURL(SCRIPT).href);
}

function runScript(args, env) {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { cwd: ROOT, env: { ...process.env, ...env }, encoding: "utf8" });
  return { status: r.status, stdout: r.stdout || "", stderr: r.stderr || "" };
}

// ---------------------------------------------------------------------------------------------
// Part (a) -- SOURCE: the pure fork, both branches, on fixtures
// ---------------------------------------------------------------------------------------------
async function partA() {
  const { planPostingWriteBacks } = await load();
  assert.strictEqual(typeof planPostingWriteBacks, "function",
    `${SCRIPT_REL} does not export planPostingWriteBacks -- the write-back fork has no pure home`);
  const results = ["plan-posting-write-backs-exported"];

  const KNOWN = "https://jobs.ashbyhq.com/acme/known-1";
  const UNKNOWN = "https://boards.greenhouse.io/acme/jobs/999999";
  const stored = { status: "new", url: KNOWN, title: "Senior Product Manager", company: "Acme", text: "THE JOB TEXT" };
  const byUrl = new Map([[KNOWN, { id: "11111111-1111-1111-1111-111111111111", data: stored }]]);

  const hit = { kind: "posting", title: "Senior Product Manager", data: { url: KNOWN, status: "read", fit: 4, verdict: "worth it" } };
  const miss = { kind: "posting", title: "Group PM, Platform", data: { url: UNKNOWN, status: "read", fit: 2 } };
  const log = { kind: "log", title: "career-posting-review ran", data: { note: "untouched" } };

  const plan = planPostingWriteBacks([hit, miss, log], byUrl);
  assert.strictEqual(plan.length, 3, `the plan has ${plan.length} entries for 3 items -- it must be one per item, in order`);

  // THE PAIR. Either half alone is satisfiable by a function that ignores byUrl entirely.
  assert.strictEqual(plan[0].action, "patch", `an item whose url IS stored planned "${plan[0].action}", expected patch`);
  assert.strictEqual(plan[0].id, "11111111-1111-1111-1111-111111111111", "the patch names the wrong row id");
  assert.strictEqual(plan[1].action, "insert", `an item whose url is NOT stored planned "${plan[1].action}", expected insert`);
  assert.strictEqual(plan[1].kind, "posting_note",
    `an unseen-url write-back lands as kind "${plan[1].kind}" -- it must be posting_note, or it is counted as a fetched posting again`);
  assert.strictEqual(plan[1].item.kind, "posting_note", "the inserted row still carries kind posting");
  results.push("known-url-patches-and-unknown-url-inserts-a-posting-note");

  // The merge: shallow, the item wins, and `text` -- the one field only a fetch supplies -- survives
  // an item that never mentions it. That single key is the whole defect this ticket fixes.
  assert.deepStrictEqual(plan[0].data, {
    status: "read", url: KNOWN, title: "Senior Product Manager", company: "Acme",
    text: "THE JOB TEXT", fit: 4, verdict: "worth it",
  }, "the patched data is not the stored row's data with the item's keys merged over it");
  assert.strictEqual(plan[0].data.text, "THE JOB TEXT", "the merge dropped data.text -- a write-back must never blank the fetched text");
  assert.strictEqual(plan[0].data.status, "read", "the item's own status did not win the merge");
  results.push("merge-is-shallow-item-wins-text-survives");

  // CONTROL: the same item, byUrl empty -> the other branch. So the fork reads byUrl and is not a
  // property of the item (LOO-013: assert WHICH branch fired).
  const flipped = planPostingWriteBacks([hit], new Map());
  assert.strictEqual(flipped[0].action, "insert",
    "with byUrl empty the same item still planned a patch -- the fork does not read the stored urls");
  assert.strictEqual(flipped[0].kind, "posting_note", "with byUrl empty the item did not become a posting_note");
  results.push("control-same-item-flips-branch-with-byurl-empty");

  // A non-posting item passes through untouched, by reference: nothing here rewrites a log, an
  // evidence row or a correction.
  assert.strictEqual(plan[2].action, "insert", "a log item did not plan an insert");
  assert.strictEqual(plan[2].kind, "log", `a log item planned kind "${plan[2].kind}"`);
  assert.strictEqual(plan[2].item, log, "the log item was copied or rewritten -- non-posting items pass through unchanged");
  results.push("non-posting-items-pass-through-unchanged");

  // A posting write-back with no url at all is still a note, never a fetched posting.
  const noUrl = planPostingWriteBacks([{ kind: "posting", title: "A title seen on a search page" }], byUrl);
  assert.strictEqual(noUrl[0].kind, "posting_note", `a posting item with no data.url planned kind "${noUrl[0].kind}"`);
  results.push("url-less-posting-item-is-a-note");

  // THE INVARIANT: no plan entry ever inserts kind posting, so fetchPostings() stays its one creator.
  const every = planPostingWriteBacks([hit, miss, log, { kind: "posting", title: "no url" }], byUrl);
  assert.ok(!every.some(p => p.action === "insert" && p.kind === "posting"),
    "a plan entry inserts kind posting -- then a capability is a second creator of fetched postings");
  results.push("no-plan-entry-inserts-kind-posting");

  // The object form of byUrl works too, so a caller holding a plain map is not silently ignored.
  const asObject = planPostingWriteBacks([hit], { [KNOWN]: { id: "abc", data: stored } });
  assert.strictEqual(asObject[0].action, "patch", "byUrl passed as a plain object was ignored");
  results.push("byurl-accepts-a-map-or-an-object");
  return results;
}

// ---------------------------------------------------------------------------------------------
// Part (b) -- STATIC: the kind, the readers, the filters, the de-dup reads
// ---------------------------------------------------------------------------------------------
function filtersMirrorTheNewKind(mod) {
  return Object.entries(mod.KIND_FILTERS).every(([, f]) =>
    !f.posting || (typeof f.posting_note === "function"
      && f.posting_note({ data: { status: "new" } }) === f.posting({ data: { status: "new" } })
      && f.posting_note({ data: { status: "read" } }) === f.posting({ data: { status: "read" } })));
}

async function partB() {
  const mod = await load();
  const { KINDS, READ_MAP, KIND_FILTERS } = mod;
  const results = [];

  assert.ok(KINDS.includes("posting_note"),
    `KINDS is ${JSON.stringify(KINDS)} -- validateAnswer refuses any kind it omits, so a posting_note write would be refused`);
  assert.ok(KINDS.includes("posting"), "KINDS lost `posting`");
  results.push("kinds-carries-posting-note");

  for (const slug of POSTING_READERS) {
    assert.ok(READ_MAP[slug]?.includes("posting"), `READ_MAP["${slug}"] no longer reads posting`);
    assert.ok(READ_MAP[slug].includes("posting_note"),
      `READ_MAP["${slug}"] reads posting but not posting_note -- after the backfill it would see ${WRITE_BACKS} fewer rows than before`);
  }
  for (const [slug, kinds] of Object.entries(READ_MAP)) {
    assert.ok(!kinds.includes("posting_note") || kinds.includes("posting"),
      `READ_MAP["${slug}"] reads posting_note without posting`);
    for (const k of kinds) assert.ok(KINDS.includes(k), `READ_MAP["${slug}"] reads unknown kind "${k}"`);
  }
  results.push("five-posting-readers-also-read-the-notes");

  // The filters: same predicate, new kind. Match-finder is the discriminating case -- its filter
  // exists to hand it only jobs it has not judged, and an unfiltered kind would re-open every one.
  const mf = KIND_FILTERS["career-match-finder"];
  assert.strictEqual(typeof mf?.posting_note, "function", "career-match-finder has no posting_note filter");
  assert.strictEqual(mf.posting_note({ data: { status: "new" } }), true, "match-finder drops a status:new note");
  assert.strictEqual(mf.posting_note({ data: { status: "read" } }), false,
    "match-finder keeps an already-reviewed note -- the 162 write-backs would be re-served as fresh jobs");
  for (const slug of ["career-strengths-gaps", "career-posting-review", "career-growth-review"]) {
    const f = KIND_FILTERS[slug];
    assert.strictEqual(typeof f?.posting_note, "function", `${slug} has no posting_note filter`);
    assert.strictEqual(f.posting_note({ data: { status: "read" } }), true, `${slug} drops a reviewed note`);
    assert.strictEqual(f.posting_note({ data: { status: "new" } }), false, `${slug} keeps a raw status:new note`);
    assert.strictEqual(mf.posting_note({ data: { status: "read" } }), !f.posting_note({ data: { status: "read" } }),
      `${slug} and match-finder agree on a reviewed note -- the mirror is not in force for the new kind`);
  }
  assert.ok(filtersMirrorTheNewKind(mod), "some KIND_FILTERS entry filters posting but not posting_note");
  results.push("kind-filters-mirror-the-new-kind");

  // The two de-dup reads. A `posting_note` this session's answers wrote must keep a later fetch and a
  // later alert intake from re-opening the same job as a brand-new status:new card.
  const src = read(SCRIPT_REL);
  // Code only: the header comments name the widened read too, and a check that counted those would
  // grade the documentation rather than the query.
  const code = src.split("\n").filter(l => !l.trim().startsWith("//")).join("\n");
  const widened = code.split(WIDENED_READ).length - 1;
  assert.strictEqual(widened, 2,
    `${SCRIPT_REL} has ${widened} reads asking for ${WIDENED_READ}, expected 2 (the fetch-postings de-dup and the alert-intake known-job read)`);
  assert.ok(!code.includes("kind=eq.posting&select=data"),
    `${SCRIPT_REL} still carries a de-dup read of kind=eq.posting&select=data -- it cannot see the notes`);
  results.push("both-de-dup-reads-cover-both-kinds");

  // CONTROL: revert one widened read in a copy and the same check must fail.
  const reverted = code.replace(WIDENED_READ, "kind=eq.posting");
  assert.notStrictEqual(reverted, code, `control setup failed: "${WIDENED_READ}" not found verbatim`);
  assert.strictEqual(reverted.split(WIDENED_READ).length - 1, 1,
    "control: a copy with one read reverted still shows 2 widened reads -- the check does not discriminate");
  results.push("control-reverted-de-dup-read-is-caught");

  // CONTROL: the filter check catches a KIND_FILTERS entry that forgot the new kind.
  const noMirror = { KIND_FILTERS: { "career-match-finder": { posting: r => r?.data?.status === "new" } } };
  assert.ok(!filtersMirrorTheNewKind(noMirror),
    "control: an entry filtering posting with no posting_note filter passes the mirror check");
  results.push("control-missing-posting-note-filter-is-caught");
  return results;
}

// ---------------------------------------------------------------------------------------------
// Part (c) -- LIVE: the two populations, and the pin the ticket asks for
// ---------------------------------------------------------------------------------------------
async function partC() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  const ARM = "the live arm (fetched population, no text-less fetch row, and the write-back pin)";
  if (!url || !key) {
    notRun(ARM,
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent. Measured live 2026-09-29 before the change: " +
      `kind=posting held ${FETCHED + WRITE_BACKS} rows -- ${FETCHED} fetch-sourced, all carrying text, and ` +
      `${WRITE_BACKS} career-sourced, all text-less, ${79} of them on a url a fetch row already held.`);
    return [];
  }
  const results = [];
  const base = url.replace(/\/+$/, "");
  const hdr = { apikey: key, Authorization: `Bearer ${key}` };
  const json = { ...hdr, "Content-Type": "application/json" };
  const env = { SUPABASE_URL: url, SUPABASE_SERVICE_KEY: key };
  const getJson = async q => {
    const r = await fetch(`${base}/rest/v1/${q}`, { headers: hdr });
    if (!r.ok) assert.fail(`GET ${q.split("?")[0]} -> HTTP ${r.status} ${await r.text()}`);
    return r.json();
  };
  const countOf = async q => {
    const r = await fetch(`${base}/rest/v1/${q}&select=id`, { headers: { ...hdr, Prefer: "count=exact", Range: "0-0" } });
    if (!r.ok) assert.fail(`COUNT ${q.split("?")[0]} -> HTTP ${r.status} ${await r.text()}`);
    await r.text();
    return Number(String(r.headers.get("content-range") || "/0").split("/")[1]);
  };

  const postings = await countOf("career_records?kind=eq.posting");
  const notes = await countOf("career_records?kind=eq.posting_note");
  const nonFetch = await countOf("career_records?kind=eq.posting&source=not.like.fetch-postings*");
  console.log(`  [AGT-268] live populations: kind=posting ${postings} (${nonFetch} not fetch-sourced), kind=posting_note ${notes}`);

  // THE ONE DECLARED GAP, and it is a fact about the tree rather than a mood: the backfill has not
  // been applied yet. Any other shape -- a text-less FETCH row, notes present but postings still
  // mixed -- falls through to the assertions below and goes red.
  if (notes === 0 && nonFetch > 0) {
    notRun(ARM,
      `migration agt268_posting_note_backfill is not applied yet: kind=posting holds ${postings} rows, ${nonFetch} of them ` +
      `career-sourced write-backs, and kind=posting_note holds 0. career_records_kind_check also still refuses ` +
      `posting_note (probed live 2026-09-29: INSERT rejected 23514), so the pin's write cannot land either. ` +
      `Expected once applied: ${FETCHED} / ${WRITE_BACKS}, and 0 of ${FETCHED} fetched postings without text ` +
      `(the 2026-09-27 runs reported 68 of 216, counting the write-backs).`);
    return results;
  }

  // (i) + (ii) The fetched population is what a fetch wrote, and all of it carries text to read.
  assert.strictEqual(nonFetch, 0, `${nonFetch} kind=posting rows do not carry a fetch-postings source -- the populations are still mixed`);
  const textless = await countOf("career_records?kind=eq.posting&or=(data->>text.is.null,data->>text.eq.)");
  assert.strictEqual(textless, 0,
    `${textless} kind=posting rows have no data.text -- only a fetch supplies text, so a text-less fetched posting is a real coverage gap`);
  assert.strictEqual(postings, FETCHED, `kind=posting holds ${postings} rows, expected ${FETCHED} fetch-sourced rows`);
  console.log(`  [AGT-268] the 2026-09-27 figure restated over fetch rows alone: 0 of ${postings} fetched postings had no text (reported: 68 of 216)`);
  results.push("fetched-population-is-fetch-written-and-carries-text");

  // (iii) THE PIN. Two posting items: one url copied from a live fetch row, one url no row holds.
  const [target] = await getJson("career_records?kind=eq.posting&source=like.fetch-postings*&data->>url=not.is.null&select=id,data,source&order=created_at.asc&limit=1");
  assert.ok(target?.data?.url, "no fetch-sourced posting row carries a data.url to write back against");
  const before = target.data;                       // BEFORE-IMAGE, restored in the finally below
  const session = `agt268-${RUN}`;
  const unseen = `https://jobs.ashbyhq.com/agt268-test/${RUN}-never-fetched`;
  const answer = {
    summary: "AGT-268 regression fixture",
    records_to_write: [
      { kind: "posting", title: `AGT-268 write-back ${RUN}`, data: { url: before.url, status: "read", fit: 3, agt268_probe: RUN } },
      { kind: "posting", title: `AGT-268 unseen job ${RUN}`, data: { url: unseen, status: "read", agt268_probe: RUN } },
    ],
  };
  const answerFile = path.join(os.tmpdir(), `agt-268-${RUN}-answer.json`);
  fs.writeFileSync(answerFile, JSON.stringify(answer), "utf8");
  let ids = [];
  try {
    const w = runScript(["--write", "--agent=jerry", "--capability=career-posting-review",
      `--answer=${answerFile}`, `--session-name=${session}`], env);
    assert.strictEqual(w.status, 0, `--write exited ${w.status}: ${w.stderr.trim()}`);
    const out = JSON.parse(w.stdout.trim());
    ids = out.ids || [];
    console.log(`  [AGT-268] --write: ${JSON.stringify(out)}`);
    assert.strictEqual(out.patched, 1, `--write patched ${out.patched} rows, expected exactly 1 (the fetched row the first item names)`);
    assert.deepStrictEqual(out.patched_ids, [target.id], "the patch landed on a different row than the one holding the url");

    // The count did not move: a write-back is not a new fetched posting.
    const after = await countOf("career_records?kind=eq.posting");
    assert.strictEqual(after, postings,
      `kind=posting went ${postings} -> ${after} across one write-back -- before this ticket that is exactly what happened`);
    results.push("write-back-does-not-grow-the-fetched-population");

    // The fetched row now carries the item's keys, and still carries its text.
    const [patched] = await getJson(`career_records?id=eq.${target.id}&select=data,source,session_name`);
    assert.strictEqual(patched.data.agt268_probe, RUN, "the fetched row did not take the write-back's keys");
    assert.strictEqual(patched.data.status, "read", "the fetched row's status was not updated by the write-back");
    assert.strictEqual(patched.data.url, before.url, "the patch changed the row's url");
    assert.strictEqual(patched.data.text, before.text, "the patch changed the fetched row's text");
    assert.strictEqual(patched.source, target.source, "the patch rewrote the fetched row's source -- it is still the row a fetch created");
    results.push("fetched-row-carries-the-write-backs-keys");

    // The second item -- a job no fetch ever stored -- landed as its own kind.
    const landed = await getJson(`career_records?session_name=eq.${session}&select=id,kind,title,source&order=kind.asc`);
    const kinds = landed.map(r => r.kind).sort();
    assert.deepStrictEqual(kinds, ["log", "posting_note"],
      `the write landed kinds ${JSON.stringify(kinds)} -- expected the run log plus one posting_note, and NO second kind=posting row`);
    results.push("unseen-url-landed-as-a-posting-note");
  } finally {
    fs.rmSync(answerFile, { force: true });
    const restore = await fetch(`${base}/rest/v1/career_records?id=eq.${target.id}`, {
      method: "PATCH", headers: { ...json, Prefer: "return=representation" }, body: JSON.stringify({ data: before }),
    });
    if (!restore.ok) console.log(`  [AGT-268] WARNING: restoring the before-image of ${target.id} failed (HTTP ${restore.status}) -- restore data by hand`);
    const gone = await fetch(`${base}/rest/v1/career_records?session_name=eq.${session}`, { method: "DELETE", headers: hdr });
    if (!gone.ok) console.log(`  [AGT-268] WARNING: fixture cleanup failed (HTTP ${gone.status}) -- delete session_name=${session} by hand`);
    console.log(`  [AGT-268] cleanup: before-image restored on ${target.id}, fixture rows deleted (inserted ids ${JSON.stringify(ids)})`);
  }
  const [restored] = await getJson(`career_records?id=eq.${target.id}&select=data`);
  assert.deepStrictEqual(restored.data, before, "the fetched row's before-image was not restored");
  assert.strictEqual((await getJson(`career_records?session_name=eq.${session}&select=id`)).length, 0, "fixture rows survived the cleanup");
  assert.strictEqual(await countOf("career_records?kind=eq.posting"), postings, "the fetched population changed across this test");
  results.push("before-image-restored-and-fixtures-deleted");
  return results;
}

async function run() {
  const results = [];
  results.push(...(await partA()));
  results.push(...(await partB()));
  results.push(...(await partC()));
  return results;
}

selfRun(import.meta.url, run);
export default run;
