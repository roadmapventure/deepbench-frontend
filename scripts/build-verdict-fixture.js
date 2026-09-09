#!/usr/bin/env node
// DeepBench v7.0.440 | scripts/build-verdict-fixture.js | SES-337 -- THE 30 RECORDED VERDICTS
// BECOME A FIXTURE THE VERIFIER IS REPLAYED AGAINST, and the thing to read twice is WHY THE
// RECONSTRUCTION DOES NOT COME FROM `runner_cycles.push_sha`.
//
// SES-337's kickoff (§4) says each fixture row carries "the inputs the verifier had (diff via
// `git diff <base>...<sha>` reconstructed from `push_sha` on the cycle row, the kickoff file at that
// version, the three gate outputs as stored in `reasoning`)". MEASURED 2026-09-09 rather than
// assumed: `push_sha` is a column on `runner_cycles`, not on `runner_verdicts`, and the 23 most
// recent verdicts all belong to ONE attended cycle (`a8000000-...-a8`) whose `push_sha` is a single
// value written once at the start of the sitting (`6bdf6a89`, v7.0.425). One sha shared by 23
// verdicts of 18 different tickets cannot identify any of their diffs. Following the kickoff's
// literal wording would have produced 23 fixture rows all carrying the same wrong diff -- a fixture
// that reproduces nothing while looking complete, which is the exact failure a reproduction test
// exists to catch.
//
// SO THE SHA IS RESOLVED FROM THE VERDICT'S OWN `version` PLUS ITS `backlog_id`, against the commit
// log. That pair is on the verdict row itself, and this repo's commit subjects are
// `v<version> <TICKET> <summary>` by STANDARDS.md Section 1. Where `push_sha` IS per-verdict useful
// -- the six pre-2026-09-09 rows, whose cycles are one-ticket cycles -- it is used directly and the
// row says so in `sha_source`. A row that resolves to no commit, or to more than one candidate
// ship commit, is marked `available: false` WITH ITS REASON and is excluded from the count. That
// exclusion is the honest half: an unreconstructable input is missing evidence, and the Verifier's
// own guardrails say missing evidence blocks.
//
// WHAT IS *NOT* A SHIP COMMIT. Prep commits carry the same `v<version>` prefix -- `... kickoff`,
// `design records: ...`, `render: ...`, `close-out ...`, `fix: ...` -- and diffing one of those
// against its parent hands the agent a doc change to grade as if it were the ticket. They are
// filtered by subject, and a version+ticket pair left with zero candidates after the filter is
// UNAVAILABLE rather than silently downgraded to the prep commit.
//
// THE GATE OUTPUTS ARE THE RECORDED ONES, NEVER RE-RUN. Re-running today's gates against an old
// tree measures today's suite, not the evidence that verdict was given on -- and the stored
// `gate_build` / `gate_regression` / `gate_hygiene` columns plus `reasoning` are exactly what the
// judgment was handed. `mechanical` is re-derived from those three by the SHIPPED `verdictFor()`,
// imported rather than restated, so the fixture cannot drift from the function it models.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/build-verdict-fixture.js
//   [--limit=30] [--out=tests/fixtures/verdicts-30.json]

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { spawnSync } from "child_process";
import { fileURLToPath, pathToFileURL } from "url";
import { verdictFor, autoDoneEligibility, DIFF_CAP, KICKOFF_CAP } from "./verifier.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");

export const sha256 = s => crypto.createHash("sha256").update(String(s), "utf8").digest("hex");

const arg = (n, d) => {
  const hit = process.argv.find(a => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : d;
};

// A prep commit wears the ship's version number. These are the subject shapes that are NOT the
// ticket's own diff; the list is deliberately conservative -- a subject this does not recognise
// becomes an extra candidate, which makes the row ambiguous and therefore UNAVAILABLE, never a
// silent wrong pick.
// `kickoff` is matched only where it is a WORD of its own: the AGT-65 ship subject reads
// "... design-kickoff capability ...", and a bare /\bkickoff/ threw that real ship commit away as
// prep -- found by this script's own first run, which is why the lookbehind is here.
const PREP_SUBJECT = /(?<![-\w])(kickoffs?|design records|close-out|render:|render —|prerequisites|fix:)/i;

function gitIn(repo, args) {
  const r = spawnSync("git", args, { cwd: repo, encoding: "utf8", maxBuffer: 128 * 1024 * 1024 });
  if (r.error || r.status !== 0) return null;
  return String(r.stdout);
}
const git = args => gitIn(REPO, args);

export function cap(text, limit, what) {
  const s = String(text ?? "");
  if (s.length <= limit) return s;
  return `${s.slice(0, limit)}\n\n[TRUNCATED: this ${what} is ${s.length} characters and was cut at ${limit}. You have NOT seen all of it -- treat anything you would need the rest to judge as missing evidence.]`;
}

async function rest(base, key, q) {
  const res = await fetch(`${base.replace(/\/+$/, "")}/rest/v1/${q}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`Supabase REST ${res.status}: ${await res.text()}`);
  return res.json();
}

async function rpc(base, key, fn, body) {
  const res = await fetch(`${base.replace(/\/+$/, "")}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return Array.isArray(rows) ? rows[0] ?? null : rows;
}

// version + ticket -> the ONE ship commit, or a named reason there is none.
function resolveSha(subjects, version, ticket) {
  const all = subjects.filter(s => s.subject.startsWith(`${version} `) && s.subject.includes(ticket));
  if (!all.length) return { sha: null, reason: `no commit whose subject is "${version} ... ${ticket} ..."` };
  const ships = all.filter(s => !PREP_SUBJECT.test(s.subject));
  if (!ships.length) return { sha: null, reason: `${all.length} commit(s) matched ${version}/${ticket} but every one is a prep commit (kickoff / design records / render / close-out / fix)` };
  if (ships.length > 1) return { sha: null, reason: `${ships.length} ship commits matched ${version}/${ticket} (${ships.map(s => s.sha.slice(0, 8)).join(", ")}) -- ambiguous, so which diff the verdict saw cannot be established` };
  return { sha: ships[0].sha, subject: ships[0].subject, reason: null };
}

// The kickoff the ship was built from. Preferred by version prefix; a ticket shipped under a
// multi-ticket kickoff (v7.0.435 covers SES-332/333/334) is found by name instead.
function findKickoff(version, ticket) {
  const dir = path.join(REPO, "docs", "kickoffs");
  let names;
  try { names = fs.readdirSync(dir); } catch { return { path: null, reason: "docs/kickoffs is unreadable" }; }
  const byVersion = names.filter(n => n.startsWith(`${version}-`));
  // A multi-ticket kickoff names its members as a RUN -- `v7.0.435-SES-332-333-334-...`,
  // `v7.0.431-AGT-65-66-...` -- so `SES-333` never appears as a literal substring of the file that
  // actually specced it. Match the bare number too, but only inside a filename already carrying the
  // ticket's own prefix, so `SES-333` cannot resolve onto an `AGT-333`.
  const [prefix, num] = String(ticket).split("-");
  const namesTicket = n =>
    n.includes(ticket) || (!!num && n.includes(`${prefix}-`) && new RegExp(`-${num}(?=[-.])`).test(n));
  const byTicket = names.filter(namesTicket);
  const pick = byVersion.find(namesTicket) || byVersion[0] || byTicket.sort().pop();
  if (!pick) return { path: null, reason: `no kickoff doc for ${version} or ${ticket}` };
  return { path: path.posix.join("docs/kickoffs", pick), reason: null };
}

// THE ONE PLACE A FIXTURE'S DIFF AND KICKOFF ARE PRODUCED, called by the generator when it computes
// the digests AND by the replay when it rebuilds the evidence. Two copies of this would be two
// definitions of "the inputs the verifier had", and the digest check would then be comparing a
// fixture against a second implementation of itself.
//
// Returns { diff, kickoff, errors } -- `errors` is the load-bearing half: a diff that cannot be
// rebuilt, or one that no longer hashes to what was judged, is MISSING EVIDENCE and the caller must
// treat it as such. Silence on a rewritten history is exactly the failure the digests exist for.
export function rawInputs(repo, sha, kickoffPath) {
  const errors = [];
  const rawDiff = gitIn(repo, ["diff", `${sha}^`, sha]);
  let diff = null;
  if (rawDiff === null) errors.push(`git diff ${String(sha).slice(0, 8)}^..${String(sha).slice(0, 8)} could not be read in ${repo}`);
  else diff = cap(rawDiff, DIFF_CAP, "diff");

  // THE KICKOFF IS NOT ALWAYS IN THE SHIP'S OWN TREE, and assuming it is cost this script a false
  // exclusion on its second run: `SES-340` shipped at `6bdf6a89` while its kickoff was committed
  // afterwards in that version's `design records` commit, so `git show <ship>:<kickoff>` fails on a
  // doc that plainly exists. The fallback reads the same path at HEAD and the row SAYS WHICH -- a
  // provenance note, never a silent substitution, because "the spec the builder worked from" and
  // "the spec as it stands today" are different claims about the same file.
  let kickoff = null, kickoffSource = null;
  if (!kickoffPath) errors.push("no kickoff doc was resolved for this ship");
  else {
    const atShip = gitIn(repo, ["show", `${sha}:${kickoffPath}`]);
    if (atShip !== null) { kickoff = cap(atShip, KICKOFF_CAP, "document"); kickoffSource = `at the ship commit ${String(sha).slice(0, 8)}`; }
    else {
      const atHead = gitIn(repo, ["show", `HEAD:${kickoffPath}`]);
      if (atHead === null) errors.push(`${kickoffPath} is readable neither at ${String(sha).slice(0, 8)} nor at HEAD`);
      else { kickoff = cap(atHead, KICKOFF_CAP, "document"); kickoffSource = "at HEAD -- the doc was committed after the ship it specced"; }
    }
  }
  return { diff, kickoff, kickoffSource, errors };
}

export function materializeInputs(repo, fixture) {
  const i = fixture?.inputs;
  if (!fixture?.sha || !i) return { diff: null, kickoff: null, errors: ["the fixture carries no resolved sha"] };
  const got = rawInputs(repo, fixture.sha, i.kickoff_path);
  const errors = [...got.errors];
  if (got.diff !== null && i.diff_sha256 && sha256(got.diff) !== i.diff_sha256) {
    errors.push(`the diff at ${fixture.sha.slice(0, 8)} no longer hashes to the one this verdict was judged on (${got.diff.length} bytes now, ${i.diff_bytes} then) -- history moved under the fixture`);
  }
  if (got.kickoff !== null && i.kickoff_sha256 && sha256(got.kickoff) !== i.kickoff_sha256) {
    errors.push(`${i.kickoff_path} at ${fixture.sha.slice(0, 8)} no longer hashes to the copy this verdict was judged on`);
  }
  return { ...got, errors };
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) { console.error("build-verdict-fixture: SUPABASE_URL and SUPABASE_SERVICE_KEY are required."); process.exit(2); }
  const limit = Number(arg("limit", "30"));
  const out = path.resolve(REPO, arg("out", "tests/fixtures/verdicts-30.json"));

  const rows = await rest(url, key,
    `runner_verdicts?select=id,created_at,cycle_id,backlog_id,version,verdict,gate_build,gate_regression,gate_hygiene,reasoning,auto_done_eligible,auto_done_reason,epic_name,priority_class&order=created_at.desc&limit=${limit}`);
  // `runner_verdicts.cycle_id` carries no foreign key to `runner_cycles` (measured 2026-09-09:
  // PostgREST refuses the embed), so the cycles are read in one second call and joined here.
  const cycleIds = [...new Set(rows.map(r => r.cycle_id).filter(Boolean))];
  const cycles = cycleIds.length
    ? await rest(url, key, `runner_cycles?select=id,push_sha,stamp,trigger&id=in.(${cycleIds.join(",")})`)
    : [];
  const cycleById = new Map(cycles.map(c => [c.id, c]));
  for (const r of rows) r.runner_cycles = cycleById.get(r.cycle_id) ?? null;

  const log = (git(["log", "--all", "--format=%H%x09%s"]) || "").trim().split("\n")
    .filter(Boolean).map(l => { const [sha, ...rest] = l.split("\t"); return { sha, subject: rest.join("\t") }; });

  // push_sha is only an identifier where it is not shared. Count first, then use.
  const shaCounts = new Map();
  for (const r of rows) {
    const s = r.runner_cycles?.push_sha;
    if (s) shaCounts.set(s, (shaCounts.get(s) || 0) + 1);
  }

  // THE LADDER ANSWER, READ LIVE AND LABELLED AS SUCH. `class_autonomy()`'s row at verdict time is
  // not stored anywhere -- `runner_verdicts` keeps only the sentence it produced -- so this is
  // today's rung, not that day's. It is included because the Intent's own method tells the agent to
  // BLOCK on a missing input, and handing it a null ladder would make every fixture block for a
  // reason that has nothing to do with the delivery. The recorded `auto_done_reason` texts on the
  // approve rows name "rung 20 >= auto_done_rung 3" for `P10 - Tooling`, which is what this lookup
  // returns today -- measured agreement on the rows that carry it, not an assumption about all of
  // them, and `class_autonomy_source` says so on every row.
  const classes = [...new Set(rows.map(r => r.priority_class).filter(Boolean))];
  const autonomy = new Map();
  for (const c of classes) autonomy.set(c, await rpc(url, key, "class_autonomy", { p_priority_class: c }));

  const fixtures = [];
  for (const r of rows) {
    const push = r.runner_cycles?.push_sha || null;
    const pushUnique = push && shaCounts.get(push) === 1 && log.some(l => l.sha.startsWith(push));
    let sha = null, shaSource = null, unavailable = null, subject = null;
    if (pushUnique) {
      sha = log.find(l => l.sha.startsWith(push)).sha;
      shaSource = "runner_cycles.push_sha (unique to this verdict)";
      subject = log.find(l => l.sha === sha).subject;
    } else {
      const res = resolveSha(log, r.version || "", r.backlog_id || "");
      if (res.sha) { sha = res.sha; subject = res.subject; shaSource = `resolved from version+ticket (push_sha ${push ? `is shared by ${shaCounts.get(push)} of these verdicts` : "is null"})`; }
      else unavailable = res.reason;
    }

    let changedFiles = null, diff = null, kickoff = null, kickoffPath = null, kickoffSource = null;
    if (sha) {
      const names = git(["diff", "--name-only", `${sha}^`, sha]);
      if (names === null) unavailable = `git diff ${sha.slice(0, 8)}^..${sha.slice(0, 8)} could not be read`;
      else {
        changedFiles = names.split("\n").map(s => s.trim()).filter(Boolean);
        if (!changedFiles.length) unavailable = `${sha.slice(0, 8)} has an empty diff against its parent`;
        const k = findKickoff(r.version || "", r.backlog_id || "");
        kickoffPath = k.path;
        // THE SAME FUNCTION THE REPLAY WILL CALL, so the digests below are digests of exactly what
        // the replay rebuilds -- not of a second, subtly different assembly of the same evidence.
        const got = rawInputs(REPO, sha, k.path);
        diff = got.diff; kickoff = got.kickoff; kickoffSource = got.kickoffSource;
        if (got.errors.length && !unavailable) unavailable = got.errors.join("; ") + (k.reason ? ` (${k.reason})` : "");
      }
    }

    const gates = { build: r.gate_build, regression: r.gate_regression, hygiene: r.gate_hygiene };
    // Re-derived by the SHIPPED function from the RECORDED gate statuses -- never re-run.
    const mechanical = verdictFor(gates);
    const codeEligibility = autoDoneEligibility({
      verdict: mechanical.verdict,
      epicName: r.epic_name,
      // Every fixture row is a Governance Agents / Selfbuild epic under a project that was
      // `executing` when the verdict was given; the recorded `auto_done_eligible` is the ground
      // truth for that, so it is carried rather than re-derived from today's projects table.
      epicProjectExecuting: true,
      priorityClass: r.priority_class,
      changedFiles,
      projectExecuting: true,
      classAutonomy: autonomy.get(r.priority_class) ?? null,
    });

    fixtures.push({
      verdict_id: r.id,
      created_at: r.created_at,
      cycle_id: r.cycle_id,
      cycle_stamp: r.runner_cycles?.stamp ?? null,
      backlog_id: r.backlog_id,
      version: r.version,
      recorded: {
        verdict: r.verdict,
        auto_done_eligible: r.auto_done_eligible,
        auto_done_reason: r.auto_done_reason,
      },
      available: !unavailable,
      unavailable_reason: unavailable,
      sha,
      sha_source: shaSource,
      commit_subject: subject,
      inputs: unavailable ? null : {
        backlog_id: r.backlog_id,
        version: r.version,
        base: `${sha}^`,
        changed_files: changedFiles,
        gates,
        gate_detail: r.reasoning,
        mechanical,
        epic_name: r.epic_name,
        priority_class: r.priority_class,
        class_autonomy: autonomy.get(r.priority_class) ?? null,
        class_autonomy_source: "public.class_autonomy() read at fixture-build time -- today's rung, not the rung at verdict time (that row is not stored)",
        epic_project_executing: true,
        project_executing: true,
        code_eligibility: codeEligibility,
        // THE DIFF AND THE KICKOFF ARE STORED BY REFERENCE, NOT BY CONTENT, and that is a
        // correctness choice before it is a size one. Inlining all 27 came to 2.6 MB, and a
        // committed copy of a diff is a SECOND copy of the repo's own history: it can rot away from
        // the commit it claims to be while the fixture keeps reporting a clean replay. The digest
        // below is what makes the reference safe -- the replay materialises the diff from git and
        // asserts it hashes to what was judged, so a rewritten history is a loud failure rather than
        // a quiet substitution. Materialised by `materializeInputs()`.
        kickoff_path: kickoffPath,
        kickoff_source: kickoffSource,
        kickoff_bytes: kickoff === null ? null : kickoff.length,
        kickoff_sha256: kickoff === null ? null : sha256(kickoff),
        diff_bytes: diff === null ? null : diff.length,
        diff_sha256: diff === null ? null : sha256(diff),
      },
    });
  }

  const usable = fixtures.filter(f => f.available).length;
  const payload = {
    generated_by: "scripts/build-verdict-fixture.js (SES-337)",
    source: "public.runner_verdicts, newest first",
    requested: limit,
    returned: fixtures.length,
    usable,
    excluded: fixtures.length - usable,
    fixtures,
  };
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(payload, null, 2), "utf8");
  console.log(`build-verdict-fixture: ${fixtures.length} verdicts, ${usable} usable, ${fixtures.length - usable} excluded -> ${path.relative(REPO, out)}`);
  for (const f of fixtures.filter(x => !x.available)) console.log(`  EXCLUDED ${f.backlog_id} ${f.version} (${f.verdict_id.slice(0, 8)}): ${f.unavailable_reason}`);
}

// Entry-guarded: `materializeInputs()` is imported by tests/verifier/ses-337-verifier-reproduction
// and by the dispatcher, and a module that regenerates the fixture on import would rewrite the very
// file the importer is about to assert against.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch(e => { console.error(`build-verdict-fixture: ${e.message}`); process.exit(2); });
}
