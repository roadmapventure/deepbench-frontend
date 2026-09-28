#!/usr/bin/env node
// DeepBench v7.0.668 | scripts/regrade-cohort.js | AGT-245 slice 1 of 3 -- the re-grade cohort,
// frozen once, with each ship's before/after commit pair resolved.
//
// THE ONE THING A LATER READER MUST NOT UNDO: THE PAIR COMES FROM COMMIT SUBJECTS, NOT FROM
// `runner_verdicts.graded_sha`. Since SES-336 the Builder pushes BEFORE the verifier runs, so
// `graded_sha` is dev HEAD at grade time -- a moving target that belongs to whoever pushed last,
// not to the ticket being graded. Measured on this clone 2026-09-28: `AGT-199`'s latest verdict
// (v7.0.656) records `351e2aff`, whose subject is `v7.0.653 AGT-186 ...` -- a peer's commit, two
// tickets away from the one it is filed under. A re-grade that diffed or checked out `graded_sha`
// would re-run the suite on somebody else's tree and record the answer against this ticket. So the
// resolver reads the log: own commits are the ancestors of HEAD whose subject BEGINS with the
// verdict's `version` plus a space AND contains the `backlog_id` plus a space. `graded_sha` is
// carried into the frozen row as evidence and as the thing the pair is checked AGAINST -- it is
// never the pair.
//
// WHY "BEGINS WITH", AND WHY BOTH HALVES. STANDARDS.md Section 1 makes every commit subject
// `v<version> <TICKET> <summary>`, so the version is a prefix and the id is a word inside. A
// subject that merely CONTAINS the version -- a close-out naming the version it re-rendered, a
// revert quoting the one it undid -- is somebody else's commit talking about this ship, and
// pulling it into the range would widen the pair silently. The id test needs its trailing space
// for the same reason `AGT-17` must not match `AGT-170`.
//
// REFUSAL IS AN ANSWER HERE, and the ticket says so: an unresolvable ship is refused, never
// approximated. Three classes, each naming itself in `reason`:
//   * `no-version`        -- the verdict row's `version` is NULL. One row in the frozen cohort
//                            (`AGT-202`) is exactly this, and a resolver that fell back to
//                            `graded_sha` for it would hand slice 2 a peer's tree to re-grade.
//   * `no-own-commit`     -- the version+id pair matches nothing in this clone's history.
//   * `interleaved: <shas>` -- a peer's commit sits INSIDE `base..ship`, so the ship's tree is not
//                            this ticket's change alone and re-running the suite on it would grade
//                            the peer's work too. 14 of the 15 refusals in the frozen cohort.
// A refused row carries `base_sha: null, ship_sha: null`. Publishing a best-guess pair beside a
// `refused` status is exactly how an approximation gets read as a measurement later.
//
// FROZEN ONCE, NEVER RECOMPUTED. `--freeze` refuses to overwrite an existing cohort file. The
// predicate is live and the board moves under it -- 79 `delivered` tickets yesterday, 80 today --
// so a cohort re-derived on each read is a target that never closes: slice 3's backfill would
// never finish a list that grows while it is being worked. The file is the cohort; progress
// against it is derivable live from `runner_verdicts` and needs no second table.
//
// NO MODEL CALL, NO SPEND, NO DATABASE WRITE, NO MIGRATION. `--freeze` reads Supabase and the git
// log and writes one JSON file. `--list` reads that file and prints. Nothing here decides anything
// a human or a later slice cannot re-derive from the two sources named in the file.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/regrade-cohort.js --freeze --cycle=<uuid>
//   node scripts/regrade-cohort.js --list
//
// Flags:
//   --freeze          Resolve the cohort and write it. Refuses if the file already exists.
//   --cycle=<uuid>    Required with --freeze; recorded as `frozen_by_cycle`.
//   --list            Re-read the frozen file and print its counts and every row.
//   --out=<path>      Cohort file (default docs/design/agt-245-regrade-cohort.json).
//
// Exit codes: 0 the requested action completed. 2 a usage error, a missing credential, or a
//             refusal to overwrite the frozen file -- nothing is written on any of them.

import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");

export const COHORT_PATH = "docs/design/agt-245-regrade-cohort.json";

// The predicate, as one sentence, stored in the file. A reader of the JSON must be able to say what
// the 71 rows ARE without re-reading this script -- and slice 3 must be able to tell a row that
// left the cohort from a row that was never in it.
export const COHORT_PREDICATE =
  "backlog_items.status = 'delivered' AND the ticket's LATEST runner_verdicts row (by created_at) " +
  "has verdict = 'block', gate_build = 'green', gate_hygiene = 'green', gate_regression = 'red' -- " +
  "blocked by the regression gate alone. Frozen once (AGT-245 slice 1); the predicate is live and " +
  "the board moves under it, so this file, not a re-run of the query, is the cohort.";

// --- the pure core -----------------------------------------------------------------------------

// A commit's own-ness, as one testable predicate. Exported so the guard can assert the two halves
// separately rather than through the whole walk.
export function isOwnSubject(subject, version, backlogId) {
  const s = subject === null || subject === undefined ? "" : String(subject);
  const v = typeof version === "string" ? version.trim() : "";
  const id = typeof backlogId === "string" ? backlogId.trim() : "";
  if (!v || !id) return false;
  return s.startsWith(`${v} `) && s.includes(`${id} `);
}

// `%P` is a space-separated parent list; a merge has two and the root has none. The first is the
// one the ship sat on top of, which is the "before" tree a re-grade wants.
function firstParent(parent) {
  const p = parent === null || parent === undefined ? "" : String(parent).trim();
  if (!p) return null;
  const [first] = p.split(/\s+/);
  return first || null;
}

function shaOf(entry) {
  const s = entry && entry.sha !== null && entry.sha !== undefined ? String(entry.sha) : "";
  return s || null;
}

// log: [{sha, parent, subject}], NEWEST FIRST -- `git log --format='%H %P %s' HEAD` order.
// Returns { ship, base, own, intruders }. Never throws, and never guesses: an empty version, an
// empty id, an empty log or no matching commit all return the all-null/empty shape, which
// cohortRow() turns into a named refusal rather than a pair.
export function ownCommitRange({ log, version, backlogId } = {}) {
  const empty = { ship: null, base: null, own: [], intruders: [] };
  if (!Array.isArray(log) || log.length === 0) return empty;
  const v = typeof version === "string" ? version.trim() : "";
  const id = typeof backlogId === "string" ? backlogId.trim() : "";
  if (!v || !id) return empty;

  const ownIdx = [];
  for (let i = 0; i < log.length; i++) {
    if (isOwnSubject(log[i] && log[i].subject, v, id)) ownIdx.push(i);
  }
  if (ownIdx.length === 0) return empty;

  const newest = ownIdx[0];
  const oldest = ownIdx[ownIdx.length - 1];
  const ship = shaOf(log[newest]);
  const base = firstParent(log[oldest] && log[oldest].parent);
  const own = ownIdx.map(i => shaOf(log[i])).filter(Boolean);

  // `base..ship` on a newest-first linear walk is exactly the slice [newest .. oldest]: every entry
  // reachable from ship and not from base. Anything in it that is not own is an intruder, and it is
  // collected NEWEST FIRST so the reason string reads in the same order as the log a human will
  // check it against.
  const intruders = [];
  for (let i = newest; i <= oldest; i++) {
    if (!isOwnSubject(log[i] && log[i].subject, v, id)) {
      const s = shaOf(log[i]);
      if (s) intruders.push(s);
    }
  }
  return { ship, base, own, intruders };
}

// verdict: the runner_verdicts row. range: ownCommitRange()'s return.
// historyShas: OPTIONAL Set/array of every sha in the walked log, used only to answer
// `graded_sha_in_history`. It is a third input because that question cannot be answered from the
// other two -- `graded_sha` is frequently a commit that is in history but is nobody's own. When it
// is not supplied the field is `null`, meaning NOBODY LOOKED; `false` is reserved for "looked, and
// the sha is not in this clone's history", which is a real finding (2 of the 70 distinct
// `graded_sha`s in the frozen cohort) and must not be confused with an unasked question.
export function cohortRow({ verdict, range, historyShas } = {}) {
  const v = verdict || {};
  const r = range || {};
  const ship = r.ship === undefined ? null : r.ship;
  const base = r.base === undefined ? null : r.base;
  const own = Array.isArray(r.own) ? r.own : [];
  const intruders = Array.isArray(r.intruders) ? r.intruders : [];

  const version = v.version === undefined || v.version === null || String(v.version).trim() === ""
    ? null : String(v.version);
  const graded = v.graded_sha === undefined || v.graded_sha === null ? null : String(v.graded_sha);

  let gradedInHistory = null;
  if (historyShas) {
    const has = historyShas instanceof Set
      ? s => historyShas.has(s)
      : s => Array.isArray(historyShas) && historyShas.includes(s);
    gradedInHistory = graded ? has(graded) : false;
  }

  let status = "refused";
  let reason = "";
  if (!version) {
    reason = "no-version";
  } else if (!ship || own.length === 0) {
    reason = "no-own-commit";
  } else if (!base) {
    // The oldest own commit is the root of history, so there is no "before" tree to diff against.
    // Not reachable in the frozen cohort; named rather than silently folded into no-own-commit.
    reason = "no-base-commit";
  } else if (intruders.length) {
    reason = `interleaved: ${intruders.join(" ")}`;
  } else {
    status = "resolved";
  }

  return {
    backlog_id: v.backlog_id === undefined ? null : v.backlog_id,
    version,
    graded_sha: graded,
    verdict_id: v.id === undefined ? null : v.id,
    // A refused row carries NO pair. See the header: a best guess printed beside `refused` is read
    // as a measurement by the next reader, and slice 2 would re-grade it.
    base_sha: status === "resolved" ? base : null,
    ship_sha: status === "resolved" ? ship : null,
    status,
    reason,
    graded_sha_in_history: gradedInHistory,
  };
}

// --- the io half -------------------------------------------------------------------------------

async function rest(base, key, q) {
  const res = await fetch(`${base.replace(/\/+$/, "")}/rest/v1/${q}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`Supabase REST ${res.status}: ${await res.text()}`);
  return res.json();
}

// ONE walk of the log, reused by all 71 rows. `%H %P %s` -- sha, parent list, subject -- split on
// the first two spaces only, because a subject contains spaces and an em dash and must survive
// intact for the prefix test.
export function parseLog(text) {
  const out = [];
  for (const line of String(text || "").split("\n")) {
    if (!line.trim()) continue;
    const firstSpace = line.indexOf(" ");
    if (firstSpace < 0) continue;
    const sha = line.slice(0, firstSpace);
    const rest2 = line.slice(firstSpace + 1);
    const secondSpace = rest2.indexOf(" ");
    // A root commit has an empty `%P`, so `%H %P %s` collapses to two fields with a double space.
    const parent = secondSpace < 0 ? rest2 : rest2.slice(0, secondSpace);
    const subject = secondSpace < 0 ? "" : rest2.slice(secondSpace + 1);
    out.push({ sha, parent, subject });
  }
  return out;
}

function gitLog() {
  const r = spawnSync("git", ["-C", REPO, "log", "--format=%H %P %s", "HEAD"],
    { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`git log failed: ${r.stderr || r.stdout}`);
  return parseLog(r.stdout);
}

function gitHead() {
  const r = spawnSync("git", ["-C", REPO, "rev-parse", "HEAD"], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`git rev-parse HEAD failed: ${r.stderr || r.stdout}`);
  return r.stdout.trim();
}

// The cohort's membership query, run once. Latest verdict per delivered ticket, then the
// four-column predicate. Ordering ASC and letting the last row win is the "latest" rule, applied in
// one place so the frozen file and any later audit of it agree on what "latest" meant.
export async function readCohortVerdicts(base, key) {
  const delivered = await rest(base, key, "backlog_items?select=backlog_id&status=eq.delivered&limit=5000");
  const ids = new Set(delivered.map(d => d.backlog_id));
  const verdicts = await rest(base, key,
    "runner_verdicts?select=id,created_at,backlog_id,version,verdict,gate_build,gate_regression,gate_hygiene,graded_sha" +
    "&order=created_at.asc&limit=20000");
  const latest = new Map();
  for (const v of verdicts) if (ids.has(v.backlog_id)) latest.set(v.backlog_id, v);
  return [...latest.values()].filter(v =>
    v.verdict === "block" && v.gate_build === "green" && v.gate_hygiene === "green" && v.gate_regression === "red");
}

function short(sha) { return sha ? String(sha).slice(0, 8) : "-"; }

function counts(rows) {
  const resolved = rows.filter(r => r.status === "resolved").length;
  return { total: rows.length, resolved, refused: rows.length - resolved };
}

export function renderList(doc) {
  const rows = Array.isArray(doc.rows) ? doc.rows : [];
  const c = counts(rows);
  const lines = [];
  lines.push(`${COHORT_PATH} — frozen ${doc.frozen_at} by cycle ${doc.frozen_by_cycle}, dev_head ${short(doc.dev_head)}`);
  lines.push(`${c.total} rows, ${c.resolved} resolved, ${c.refused} refused`);
  for (const r of rows) {
    if (r.status === "resolved") {
      lines.push(`  ${r.backlog_id} ${r.version} resolved base ${short(r.base_sha)} … ship ${short(r.ship_sha)}` +
        `  (graded_sha ${short(r.graded_sha)}${r.graded_sha_in_history === false ? ", NOT in history" : ""})`);
    } else {
      lines.push(`  ${r.backlog_id} ${r.version || "(no version)"} refused ${r.reason}`);
    }
  }
  return lines.join("\n");
}

async function freeze(outAbs, cycleId) {
  if (fs.existsSync(outAbs)) {
    console.error(`regrade-cohort: ${COHORT_PATH} already exists. The cohort is frozen ONCE (AGT-245 §5 task 2) — ` +
      `re-deriving it against a live predicate would silently move the list slice 3 is working. Nothing written.`);
    process.exit(2);
  }
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!base || !key) {
    console.error("regrade-cohort: --freeze needs SUPABASE_URL and SUPABASE_SERVICE_KEY. Nothing written.");
    process.exit(2);
  }
  const log = gitLog();
  const historyShas = new Set(log.map(e => e.sha));
  const verdicts = await readCohortVerdicts(base, key);
  const rows = verdicts
    .map(verdict => cohortRow({
      verdict,
      range: ownCommitRange({ log, version: verdict.version, backlogId: verdict.backlog_id }),
      historyShas,
    }))
    .sort((a, b) => String(a.backlog_id).localeCompare(String(b.backlog_id)));

  const doc = {
    frozen_at: new Date().toISOString(),
    frozen_by_cycle: cycleId,
    dev_head: gitHead(),
    predicate: COHORT_PREDICATE,
    rows,
  };
  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  fs.writeFileSync(outAbs, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
  console.log(renderList(doc));
}

function list(outAbs) {
  if (!fs.existsSync(outAbs)) {
    console.error(`regrade-cohort: ${COHORT_PATH} does not exist — run --freeze first.`);
    process.exit(2);
  }
  console.log(renderList(JSON.parse(fs.readFileSync(outAbs, "utf8"))));
}

async function main(argv) {
  const arg = n => { const hit = argv.find(a => a.startsWith(`--${n}=`)); return hit ? hit.slice(n.length + 3) : null; };
  const outAbs = path.resolve(REPO, arg("out") || COHORT_PATH);
  if (argv.includes("--freeze")) {
    const cycleId = arg("cycle");
    if (!cycleId) {
      console.error("regrade-cohort: --freeze needs --cycle=<uuid> — the frozen file records who froze it. Nothing written.");
      process.exit(2);
    }
    await freeze(outAbs, cycleId);
    return;
  }
  if (argv.includes("--list")) { list(outAbs); return; }
  console.error("regrade-cohort: pass --freeze --cycle=<uuid>, or --list. See the header for the contract.");
  process.exit(2);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main(process.argv.slice(2)).catch(err => { console.error(`regrade-cohort: ${err.message}`); process.exit(2); });
}
