#!/usr/bin/env node
// DeepBench v7.0.978 | scripts/regrade-current.js | AGT-609 -- a blocked ship is re-graded under the
// rules that are current NOW, not the ones it was blocked under.
//
// THE PROBLEM, MEASURED. On 2026-11-08 the board held 94 `delivered` tickets whose LATEST verdict is
// a `block`. 38 of them were graded before 2026-09-29, under grading rules that have since changed
// three times; 30 were charged a red by `scripts/regrade-delivered.js`'s stricter own-changed-file
// rule, and 14 of THOSE read `regression GREEN on the delta` and were blocked by nothing else.
// Nothing on a verdict row said which rules graded it, so nobody -- no screen, no sweep, no human --
// could tell a block that is still true from one that is only still recorded. That is the whole
// defect: a judgment with no statement of the law it was made under cannot be revisited.
//
// WHAT THIS LANE IS. `scripts/verifier.js` now stamps every verdict with `rulesFingerprint()` -- a
// sha256 over the seven files that ARE the grading rules. `public.stale_blocked_verdicts(<that hex>)`
// answers ONE question off that stamp: which delivered tickets are still blocked under rules that are
// no longer current, have no standing ship decision, and have not already been re-graded under THESE
// rules. This script takes up to three of them, oldest first, grades each through verify-ship's own
// `gradeDelivery()`, and records what it found.
//
// THE FOUR THINGS A LATER READER MUST NOT UNDO.
//
// 1. IT OWNS NO GRADING RULE. There is no delta here, no own-tests charge, no gate list, no verdict
//    mapping of its own: `gradeDelivery()` in `scripts/verifier.js` is imported and called, and what
//    it returns is what this lane records. A lane that imported the pieces and reassembled the
//    sequence would be a SECOND copy of the rule that drifts the first moment step 7a's sequence
//    gains an input -- AGT-529 will add one. One home, two callers (§A call 1, pattern:14), and
//    `tests/regression/agt-609-regrade-current-rules.test.mjs` arm (E) guards it at the source level.
//
// 2. BUILD AND HYGIENE ARE GRADED AT DEV HEAD, ONCE PER INVOCATION; ONLY REGRESSION IS PER TICKET.
//    The ship under re-grade is already in `dev`, so a red build or a red tripwire at HEAD is
//    nobody's ship in particular -- it is the platform's. Charging it to a two-month-old delivery
//    would be an accusation about a tree that delivery never saw. So a red there is `ungradable`,
//    never `block` (§A call 2, SES-403's reasoning), and the two gates run through a memoising runner
//    so three attempts spend one build, not three. Regression is NEVER memoised: it is the per-ticket
//    question.
//
// 3. `ungradable` IS A LEDGER ROW AND NEVER A VERDICT. `ck_runner_verdicts_verdict` is approve|block
//    and every reader of that column assumes two values, so a third outcome goes where it belongs:
//    `public.runner_regrades`, whose `unique (prior_verdict_id, rules_fingerprint)` IS the rule "once
//    per rule set, and again the moment the rules change" (§A call 5). Nothing is ever cleared: a
//    block that is re-graded a block stays blocked and gets a row saying it was looked at again.
//
// 4. ONE TEST SLOT PER ATTEMPT, NEVER HELD ACROSS ATTEMPTS. `public.test_slots` capacity is 1 and
//    peers queue on it (scripts/test-slot.js). `gradeDelivery()` takes the slot around the regression
//    gate and releases it, so attempt 2 re-queues behind any peer cycle rather than starving it for
//    the length of three suites (§A call 7).
//
// WHY A BLOCK CARDS NOBODY. Directive 6f33ec28 (John, 2026-09-15): "the dev manager should have
// approved this without my interference". A re-grade that still blocks records its row and stops --
// the same discipline runner-cycle.md (7a-bis) already holds (§A call 8).
//
// NO MODEL CALL, NO SPEND, NO MIGRATION OF ITS OWN. Writes, per attempt, at most: one
// `runner_verdicts` row through `insertVerdict` (the one write point every lane shares), one
// `record_ship_decision()` on an approve, and exactly one `runner_regrades` row. `--dry-run` builds
// the identical payload and writes nothing.
//
// Usage:
//   node scripts/regrade-current.js --next --cycle-id=<uuid> [--max=3] [--dry-run] [--json]
//   node scripts/regrade-current.js --ticket=AGT-101 --cycle-id=<uuid> [--dry-run] [--json]
//                                   [--scratch=<dir>] [--repo=<dir>]
//
// Exits: 0 every attempt approved; 1 at least one block or ungradable row; 2 an attempt could not run
// and nothing was recorded for it; 3 nothing is stale (the lane finishing, not a failure).

import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

import {
  gradeDelivery, rulesFingerprint, runGate, insertVerdict, rest,
  readRegressionBaseline, suiteTests, verdictFor,
} from "./verifier.js";
import { parseLog, ownCommitRange, cohortRow } from "./regrade-cohort.js";
// The slot wrapper is taken here, not left to gradeDelivery's default, for ONE reason: its progress
// lines default to console.log, and under --json this script's stdout is the payload and nothing
// else. Found live by this ticket's own first run (cycle 7195393f, 2026-11-08): `test-slot: held
// <cycle>` landed on stdout ahead of the payload, so a caller doing a straight JSON.parse got a
// syntax error. `{ out: say }` routes it to stderr, exactly as regrade-delivered.js does.
import { withTestSlot } from "./test-slot.js";
import { relatedTests } from "./related-tests.js";
import { mentionedFiles, renderOut } from "./pre-build-baseline.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");

// The `reasoning` opening every verdict row THIS lane writes. It is how a later reader -- and the
// ledger's own uniqueness rule -- tells a re-grade row from the verify-ship row it re-graded, with no
// second list kept anywhere (pattern:16).
export const REGRADE_PREFIX = "AGT-609 re-grade under current rules of ";

export const MAX_DEFAULT = 3;

// --- the pure core -----------------------------------------------------------------------------

// WHICH TREE CAN ANSWER THIS TICKET'S REGRESSION QUESTION.
//
// PAIR is the honest answer and it is rarely available: the ticket's own commits isolate in this
// clone's history, so the suite can run on the tree before the delivery and the tree after it, and the
// difference is about this delivery and nothing else. AGT-245's resolver decides that -- `cohortRow`
// over `ownCommitRange` -- and a row it refuses is refused here under ITS reason rather than
// re-derived, because a second opinion formed here is exactly the approximation that resolver exists
// to prevent.
//
// DEV-HEAD is the fallback and it is NOT a pair: there is no unchanged tree, so there is no baseline
// and the grade is the absolute answer over the ticket's related set at HEAD. It can approve a ticket
// and it can never block one -- see `outcomeFor`.
//
// `deps-changed` IS ITS OWN REFUSAL. Both legs of a pair borrow ONE `node_modules` by symlink (an
// install per leg would cost more than the gate timeout allows and would change the tree being
// graded), so a pair whose own diff moves `package.json` or `package-lock.json` would run two
// different dependency sets as if they were one. That is not a pair; it is dev-head with extra steps.
export function pickMode({ row, log, haveSha, changed }) {
  const r = row || {};
  const resolved = cohortRow({
    verdict: { id: r.verdict_id, backlog_id: r.backlog_id, version: r.version, graded_sha: r.graded_sha },
    range: ownCommitRange({ log, version: r.version, backlogId: r.backlog_id }),
  });
  if (resolved.status !== "resolved") {
    return { mode: "dev-head", reason: String(resolved.reason || "").trim() || "refused-without-reason" };
  }
  const base = resolved.base_sha;
  const ship = resolved.ship_sha;
  const has = typeof haveSha === "function" ? haveSha : () => true;
  if (!has(base)) return { mode: "dev-head", reason: "base-sha-missing" };
  if (!has(ship)) return { mode: "dev-head", reason: "ship-sha-missing" };
  let files;
  try {
    files = typeof changed === "function" ? changed(base, ship) : changed;
  } catch (e) {
    return { mode: "dev-head", reason: `diff-unreadable: ${e.message}` };
  }
  if (!Array.isArray(files)) return { mode: "dev-head", reason: "diff-unreadable" };
  const deps = files.filter(f => f === "package.json" || f === "package-lock.json");
  if (deps.length) return { mode: "dev-head", reason: "deps-changed" };
  return { mode: "pair", base, ship, changed: files };
}

// THE OUTCOME MAPPING, and it is the ticket's own sentences rather than a rule invented here.
//
// `graded` is whatever `gradeDelivery()` returned. Three outcomes, and the third is the one this
// ticket exists to add: `ungradable` means NOBODY LOOKED SUCCESSFULLY, which is a different fact from
// "looked, and it still fails" and must never be recorded as the latter.
//
// A DEV-HEAD RED IS NEVER A BLOCK. There is no unchanged tree to compare against, so a red test at
// HEAD cannot be shown to be this delivery's -- it is as likely to be the platform's. Fail closed in
// the one direction that matters: the prior block stands, and the row says why nobody could tell.
export function outcomeFor({ mode, graded }) {
  const g = graded || {};
  if (g.coverage) {
    return { outcome: "ungradable",
      reason: `the baseline does not cover the set this re-grade would grade, so no answer could be ` +
        `measured: ${g.coverage.reason}. The prior block stands (AGT-457, AGT-609).` };
  }
  const gates = g.gateResults || {};
  const offAtHead = ["build", "hygiene"].filter(k => gates[k] !== "green");
  if (offAtHead.length) {
    return { outcome: "ungradable",
      reason: `${offAtHead.join(" and ")} ${offAtHead.length === 1 ? "is" : "are"} not green at dev HEAD ` +
        `(${offAtHead.map(k => `${k}=${gates[k]}`).join(", ")}), and a platform-wide red at HEAD is nobody's ` +
        `ship in particular -- charging it to this delivery would be an accusation about a tree it never ` +
        `saw. UNGRADABLE, never a block (AGT-609 §A call 2).` };
  }
  if (gates.regression === "green") {
    return { outcome: "approve",
      reason: `all three mechanical gates green under the current rules in ${mode} mode: ${g.reasoning}` };
  }
  if (mode === "pair") {
    const charged = (g.delta && Array.isArray(g.delta.newlyRed)) ? g.delta.newlyRed : [];
    if (charged.length) {
      return { outcome: "block",
        reason: `still a block under the current rules: ${charged.length} ` +
          `${charged.length === 1 ? "test is" : "tests are"} red on this delivery's own ship tree and absent ` +
          `from its own base tree (${charged.join(", ")}). ${g.reasoning}` };
    }
    return { outcome: "ungradable",
      reason: `the pair's regression gate is ${gates.regression} and NOTHING is charged to this delivery -- ` +
        `the reds are unverified, never measured, or the suite named none at all, so there is no green to ` +
        `prove and no accusation to make. UNGRADABLE: ${g.reasoning}` };
  }
  return { outcome: "ungradable",
    reason: `graded at dev HEAD with no unchanged tree to compare against, and regression is ` +
      `${gates.regression}: a red here cannot be shown to be this delivery's rather than the platform's. ` +
      `UNGRADABLE, never a block (AGT-609 §A call 4): ${g.reasoning}` };
}

// 0 approve, 1 block or ungradable, 2 cannot-run; the invocation takes the WORST of its attempts, and
// 3 -- nothing stale -- is the only code that is not one of them. An invocation that approved two
// tickets and could not run the third has not finished its work, and must not report that it has.
export function codeFor(outcome) {
  if (outcome === "approve") return 0;
  if (outcome === "block" || outcome === "ungradable") return 1;
  return 2;
}

export function exitFor(attempts) {
  if (!Array.isArray(attempts) || attempts.length === 0) return 3;
  const codes = attempts.map(a => (typeof a === "number" ? a : codeFor(a && a.outcome)));
  return codes.reduce((m, c) => (c > m ? c : m), 0);
}

// --- the io half -------------------------------------------------------------------------------

function git(root, args) {
  return spawnSync("git", ["-C", root, ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

function argOf(argv, name) {
  const hit = argv.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
}

function emit({ code, payload, prose, json }) {
  if (json) console.log(JSON.stringify(payload));
  else if (code === 0) console.log(prose);
  else console.error(prose);
  return code;
}

// Build and hygiene ONCE per invocation (point 2 of the header); regression never. Keyed on the gate
// and the tree, so a future caller that graded two trees could not be served one tree's answer twice.
function memoising(run) {
  const seen = new Map();
  return async (gate, root, env) => {
    if (!gate || gate.key === "regression") return run(gate, root, env);
    const k = `${gate.key}@${root}`;
    if (!seen.has(k)) seen.set(k, await run(gate, root, env));
    return seen.get(k);
  };
}

// The ticket's kickoff, for its DECLARED files. First match only: a ticket with two kickoffs has had
// two attempts at it and the earliest declaration is the one its verdict was graded against.
function kickoffFor(repo, row) {
  const version = row && row.version ? String(row.version).trim() : "";
  if (!version) return null;
  const dir = path.join(repo, "docs/kickoffs");
  let names;
  try { names = fs.readdirSync(dir).sort(); } catch { return null; }
  const prefix = `${version}-${row.backlog_id}-`;
  const hit = names.find(n => n.startsWith(prefix) && n.endsWith(".md"));
  return hit ? path.join(dir, hit) : null;
}

// One detached worktree at a sha, with the clone's node_modules borrowed by symlink. Removed by the
// caller's `finally` -- a leaked worktree makes the NEXT attempt's `git worktree add` fail on a path
// that already exists, which presents as a slot the lane can never use again.
function addWorktree({ repo, dir, sha }) {
  const add = git(repo, ["worktree", "add", "--detach", dir, sha]);
  if (add.status !== 0) {
    return { error: `git worktree add at ${String(sha).slice(0, 8)}: ${(add.stderr || add.stdout || `exit ${add.status}`).trim()}` };
  }
  const link = path.join(dir, "node_modules");
  try {
    if (!fs.existsSync(link)) {
      fs.symlinkSync(path.join(repo, "node_modules"), link, process.platform === "win32" ? "junction" : "dir");
    }
  } catch (e) {
    return { error: `node_modules could not be borrowed into ${dir}: ${e.message}` };
  }
  return { dir };
}

function removeWorktree(repo, dir) {
  git(repo, ["worktree", "remove", "--force", dir]);
}

// The base tree's own red set, measured by HEAD's instrument -- which is the point. A baseline
// measured by the base tree's OWN copy of the measuring script would be measured by a different
// instrument from the one grading the ship tree, and AGT-457 refuses exactly that.
function measureBaseline({ repo, baseDir, names, sha, cycleId, outFile, say }) {
  const abs = names
    .map(n => path.join(baseDir, "tests/regression", n))
    .filter(p => fs.existsSync(p));
  if (!abs.length) {
    return { error: `none of the ${names.length} related tests exist on the base tree, so there is nothing to measure there` };
  }
  say(`regrade-current: baseline — ${abs.length} of ${names.length} related tests on ${String(sha).slice(0, 8)}`);
  const r = spawnSync(process.execPath, [path.join(repo, "scripts/baseline-red-set.js"), `--tests=${abs.join(",")}`], {
    cwd: baseDir, encoding: "utf8", maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env, DEEPBENCH_TEST_SLOT: "held" },
  });
  if (r.error) return { error: `the base tree's baseline could not be measured: ${r.error.message}` };
  const block = String(r.stdout || "").trim();
  if (!block) return { error: `the base tree's baseline measured nothing (exit ${r.status}): ${(r.stderr || "").trim().slice(0, 400)}` };
  const text = renderOut({
    block, sha7: String(sha).slice(0, 7), iso: new Date().toISOString(), cycleId,
    declaredCount: names.length, full: false, suiteCount: 0,
  });
  try { fs.writeFileSync(outFile, text, "utf8"); }
  catch (e) { return { error: `the baseline could not be written to ${outFile}: ${e.message}` }; }
  return { file: outFile, measuredOn: abs.length };
}

// ONE ATTEMPT: pick the tree, grade it through gradeDelivery(), map the outcome. No write happens
// here -- `record()` below does that, so a dry run and a real run reach the identical grade.
async function attempt({ repo, scratch, row, log, head, cycleId, run, slot, say }) {
  const ticket = row.backlog_id;
  const picked = pickMode({
    row, log,
    haveSha: sha => git(repo, ["cat-file", "-e", `${sha}^{commit}`]).status === 0,
    changed: (base, ship) => {
      const d = git(repo, ["diff", "--name-only", base, ship]);
      if (d.status !== 0) throw new Error((d.stderr || `exit ${d.status}`).trim());
      return String(d.stdout || "").split("\n").map(s => s.trim()).filter(Boolean);
    },
  });

  if (picked.mode === "pair") {
    const baseDir = path.join(scratch, `regrade-current-${ticket}-base`);
    const shipDir = path.join(scratch, `regrade-current-${ticket}-ship`);
    const added = [];
    try {
      for (const [dir, sha] of [[baseDir, picked.base], [shipDir, picked.ship]]) {
        const w = addWorktree({ repo, dir, sha });
        if (w.error) return { ticket, mode: "pair", modeReason: "own commits isolate", error: w.error };
        added.push(dir);
      }
      let names;
      try { names = relatedTests({ root: shipDir, touched: picked.changed }); }
      catch (e) { return { ticket, mode: "pair", modeReason: "own commits isolate", error: `the related set could not be resolved on the ship tree: ${e.message}` }; }
      if (!names.length) names = suiteTests(shipDir);
      const measured = measureBaseline({
        repo, baseDir, names, sha: picked.base, cycleId, say,
        outFile: path.join(scratch, `regrade-current-${ticket}-baseline.txt`),
      });
      if (measured.error) return { ticket, mode: "pair", modeReason: "own commits isolate", error: measured.error };
      const baselineRead = readRegressionBaseline(measured.file);
      const graded = await gradeDelivery({
        repoRoot: repo, regressionRoot: shipDir, cycleId, baselineRead,
        graded: names, only: { path: null, names }, run, slot,
      });
      return {
        ticket, mode: "pair",
        modeReason: `this delivery's own commits isolate in history: base ${String(picked.base).slice(0, 8)} → ship ${String(picked.ship).slice(0, 8)}, ${picked.changed.length} files changed, dependencies untouched`,
        base: picked.base, ship: picked.ship, gradedSha: picked.ship, names, graded,
        baselineFile: measured.file,
      };
    } finally {
      for (const dir of added) removeWorktree(repo, dir);
    }
  }

  const kickoff = kickoffFor(repo, row);
  let declared = [];
  if (kickoff) {
    try { declared = mentionedFiles(fs.readFileSync(kickoff, "utf8")); } catch { declared = []; }
  }
  let names = [];
  if (declared.length) {
    try { names = relatedTests({ root: repo, touched: declared }); } catch { names = []; }
  }
  const widened = !names.length;
  if (widened) names = suiteTests(repo);
  const source =
    `no unchanged tree exists for ${ticket}: its commits could not be isolated (${picked.reason}); ` +
    `graded at dev HEAD ${String(head).slice(0, 8)} over ` +
    (widened
      ? `the FULL suite of ${names.length} tests (no kickoff-declared files to narrow it)`
      : `the ${names.length}-test related set of its ${declared.length} kickoff-declared files`) +
    ` (AGT-609)`;
  const baselineRead = { names: null, unverified: null, measured: null, instrument: null, present: false, source };
  const graded = await gradeDelivery({
    repoRoot: repo, cycleId, baselineRead, graded: null, only: { path: null, names },
    declared: { reason: source, source }, run, slot,
  });
  return {
    ticket, mode: "dev-head",
    modeReason: `no pair: ${picked.reason}. ${source}`,
    base: null, ship: null, gradedSha: head, names, graded, baselineFile: null,
  };
}

// THE WRITES, and they are the only ones. Order matters: the verdict row first (it is what the ship
// decision references), then the decision, then the ledger row that says this prior verdict has been
// answered under these rules. The ledger row goes LAST on purpose -- written first, a failure in
// between would mark the ticket answered when it is not, and the uniqueness rule would then refuse
// ever to look at it again under these rules.
async function record({ a, mapped, row, fp, cycleId, supabaseUrl, supabaseKey }) {
  const reasoning =
    `${REGRADE_PREFIX}${a.ticket}: prior ${row.verdict_id} (${row.version || "no version"}); ` +
    `rules ${row.rules_fingerprint ? String(row.rules_fingerprint).slice(0, 8) : "unstamped"}→${fp.slice(0, 8)}; ` +
    `mode ${a.mode} (${a.modeReason}). ${a.graded.reasoning}`;
  const autoDoneReason =
    "auto-done does not apply to a re-grade (AGT-609): a second look at an existing delivery, the ladder not asked.";

  let verdictId = null;
  let shipDecisionId = null;
  if (mapped.outcome !== "ungradable") {
    const ins = await insertVerdict({
      supabaseUrl, supabaseKey, cycleId, ticket: a.ticket, version: row.version,
      verdict: mapped.outcome, gateResults: a.graded.gateResults, reasoning,
      eligible: false, autoDoneReason,
      epicName: row.epic_name ?? null, priorityClass: row.priority_class ?? null,
      gradedSha: a.gradedSha,
    });
    if (ins.error) return { error: `the verdict row could not be written: ${ins.error}`, verdictId: null };
    verdictId = ins.rowId;
    if (mapped.outcome === "approve") {
      const ship = await rest(supabaseUrl, supabaseKey, "rpc/record_ship_decision", {
        method: "POST",
        body: JSON.stringify({
          p_cycle_id: cycleId, p_backlog_id: a.ticket, p_version: row.version,
          p_push_sha: a.gradedSha, p_verdict_id: verdictId,
        }),
      });
      // The approve ROW STANDS: it is in the ledger and it is true. What is missing is the ship it
      // authorises, which is a half-written handoff -- exit 2 for this attempt, as `--regrade` does.
      if (ship.error) {
        return { error: `the approve is recorded as ${verdictId} but record_ship_decision FAILED: ${ship.error}`, verdictId };
      }
      shipDecisionId = Array.isArray(ship.rows) ? ship.rows[0] : ship.rows;
    }
  }

  const led = await rest(supabaseUrl, supabaseKey, "runner_regrades", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      cycle_id: cycleId, backlog_id: a.ticket, prior_verdict_id: row.verdict_id,
      prior_fingerprint: row.rules_fingerprint ?? null, rules_fingerprint: fp,
      mode: a.mode, mode_reason: a.modeReason, outcome: mapped.outcome,
      verdict_id: verdictId, ship_decision_id: shipDecisionId ?? null,
      base_sha: a.base ?? null, ship_sha: a.ship ?? null, graded_sha: a.gradedSha ?? null,
      reason: mapped.reason,
    }),
  });
  if (led.error) return { error: `the re-grade ledger row could not be written: ${led.error}`, verdictId, shipDecisionId };
  const rowId = Array.isArray(led.rows) && led.rows[0] ? led.rows[0].id : null;
  return { verdictId, shipDecisionId, regradeId: rowId };
}

export async function main(argv, { env = process.env, out = null } = {}) {
  const json = argv.includes("--json");
  // UNDER --json, STDOUT IS THE PAYLOAD AND NOTHING ELSE. Progress goes to stderr: a caller that has
  // to strip prose off the front of a JSON document is a caller that will one day parse the prose.
  const say = out ?? (s => (json ? console.error(s) : console.log(s)));
  const dryRun = argv.includes("--dry-run");
  const next = argv.includes("--next");
  const ticket = argOf(argv, "ticket");
  const cycleId = argOf(argv, "cycle-id");
  const repo = path.resolve(argOf(argv, "repo") || REPO);
  const scratch = path.resolve(argOf(argv, "scratch") || env.DEEPBENCH_SCRATCH || os.tmpdir());
  const maxRaw = argOf(argv, "max");
  const max = ticket ? 1 : Math.max(1, Number.parseInt(maxRaw ?? String(MAX_DEFAULT), 10) || MAX_DEFAULT);

  const cannot = (kind, prose, extra = {}) => emit({
    code: 2, json,
    payload: { ok: false, exitCode: 2, kind, ticket: ticket || null, recorded: false, ...extra },
    prose: `regrade-current: ${prose}\n  Exiting 2 -- the re-grade COULD NOT RUN. This is NOT a verdict; every prior block stands and nothing was recorded.`,
  });

  if (next && ticket) {
    return cannot("ticket-and-next",
      `--ticket=${ticket} and --next are the same argument answered twice, and a run that honoured one would silently ` +
      `ignore the other. --next IS the pick: drop the ticket, or drop --next.`);
  }
  if (!next && !ticket) return cannot("missing-args", "one of --next or --ticket=<ID> is required.", { missing: ["--next|--ticket"] });

  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_KEY;
  // No --dry-run relaxation on the READS: every fact this grade rests on is a row. --dry-run means
  // "write nothing", never "invent the board". The cycle id is a WRITE input, so only it relaxes.
  const missing = [
    !supabaseUrl && "SUPABASE_URL", !supabaseKey && "SUPABASE_SERVICE_KEY",
    !cycleId && !dryRun && "--cycle-id",
  ].filter(Boolean);
  if (missing.length) return cannot("missing-args", `missing ${missing.join(", ")}.`, { missing });

  // (2) WHAT "CURRENT" IS. Null is fail-closed and exit 2: a sweep that could not read its own rules
  // cannot say which verdicts were graded under different ones, and a partial hash would read as an
  // answer forever after.
  const fp = rulesFingerprint(repo);
  if (fp === null) {
    return cannot("no-fingerprint",
      `a grading rule file under ${repo} is unreadable, so the current rules have no fingerprint and nothing can be ` +
      `shown to be stale. Run \`node scripts/verifier.js --rules-fingerprint\` for the list.`);
  }

  // (3) THE STALE SET, from the database's own definition of the word.
  const stale = await rest(supabaseUrl, supabaseKey, "rpc/stale_blocked_verdicts", {
    method: "POST", body: JSON.stringify({ p_fingerprint: fp }),
  });
  if (stale.error) return cannot("board-unreachable", `rpc/stale_blocked_verdicts failed: ${stale.error}`, { fingerprint: fp });
  const all = Array.isArray(stale.rows) ? stale.rows : [];
  let queue = all;
  if (ticket) {
    queue = all.filter(r => String(r.backlog_id) === String(ticket));
    if (!queue.length) {
      return cannot("not-stale",
        `${ticket} is not in the stale set for fingerprint ${fp.slice(0, 8)}. It becomes stale when its LATEST verdict is ` +
        `a block, its backlog status is \`delivered\`, that verdict's rules fingerprint differs from this tree's, it holds ` +
        `no unreversed \`ship\` decision, and no runner_regrades row already answers that verdict under these rules.`,
        { fingerprint: fp, stale_remaining: all.length });
    }
  }
  if (!queue.length) {
    return emit({ code: 3, json,
      payload: { ok: true, exitCode: 3, kind: "nothing-stale", fingerprint: fp, attempts: [], stale_remaining: 0 },
      prose: `regrade-current: NOTHING IS STALE under ${fp.slice(0, 12)} -- every blocked delivery has already been ` +
        `re-graded under these rules, or holds a ship decision.\n  Exiting 3 -- the lane finishing, not a failure.` });
  }

  // (4) ONE log walk, reused by every attempt.
  const logOut = git(repo, ["log", "--format=%H %P %s", "HEAD"]);
  if (logOut.status !== 0) return cannot("git-unreadable", `git log failed: ${(logOut.stderr || `exit ${logOut.status}`).trim()}`, { fingerprint: fp });
  const log = parseLog(logOut.stdout);
  const headOut = git(repo, ["rev-parse", "HEAD"]);
  const head = headOut.status === 0 ? String(headOut.stdout || "").trim() : null;
  if (!head) return cannot("git-unreadable", "git rev-parse HEAD produced no sha.", { fingerprint: fp });

  // (5) ONE memoising runner for the whole invocation: build and hygiene once at HEAD, regression per
  // attempt and never memoised (header point 2).
  const run = memoising(runGate);
  const slot = (slotEnv, fn) => withTestSlot(slotEnv, fn, { out: say });
  fs.mkdirSync(scratch, { recursive: true });

  const picked = queue.slice(0, max);
  const attempts = [];
  for (const row of picked) {
    say(`regrade-current: ${row.backlog_id} (${row.version || "no version"}) -- prior ${row.verdict_id}`);
    let a;
    try {
      a = await attempt({ repo, scratch, row, log, head, cycleId, run, slot, say });
    } catch (e) {
      a = { ticket: row.backlog_id, mode: "dev-head", modeReason: "the attempt threw", error: e && e.message ? e.message : String(e) };
    }
    if (a.error) {
      attempts.push({
        ticket: a.ticket, prior_verdict_id: row.verdict_id, prior_version: row.version ?? null,
        mode: a.mode, mode_reason: a.modeReason, outcome: "cannot-run", verdict_id: null, regrade_id: null,
        ship_decision_id: null, graded_sha: null, base_sha: a.base ?? null, ship_sha: a.ship ?? null,
        gates: null, reason: a.error, recorded: false,
      });
      continue;
    }
    const mapped = outcomeFor({ mode: a.mode, graded: a.graded });
    const shape = {
      ticket: a.ticket, prior_verdict_id: row.verdict_id, prior_version: row.version ?? null,
      mode: a.mode, mode_reason: a.modeReason, outcome: mapped.outcome,
      verdict_id: null, regrade_id: null, ship_decision_id: null,
      graded_sha: a.gradedSha ?? null, base_sha: a.base ?? null, ship_sha: a.ship ?? null,
      gates: a.graded.gateResults ?? null, reason: mapped.reason, recorded: false,
    };
    if (dryRun) { attempts.push(shape); continue; }
    const w = await record({ a, mapped, row, fp, cycleId, supabaseUrl, supabaseKey });
    if (w.error) {
      attempts.push({ ...shape, outcome: "cannot-run", verdict_id: w.verdictId ?? null,
        ship_decision_id: w.shipDecisionId ?? null, recorded: false,
        reason: `${mapped.reason} || RECORDING FAILED: ${w.error}` });
      continue;
    }
    attempts.push({ ...shape, verdict_id: w.verdictId ?? null, regrade_id: w.regradeId ?? null,
      ship_decision_id: w.shipDecisionId ?? null, recorded: true });
  }

  const code = exitFor(attempts);
  const payload = {
    ok: code === 0, exitCode: code, kind: "regrade-current", fingerprint: fp,
    attempts, stale_remaining: Math.max(0, all.length - attempts.filter(a => a.recorded).length),
  };
  const prose =
    `regrade-current under ${fp.slice(0, 12)} -- ${attempts.length} of ${all.length} stale ${all.length === 1 ? "ticket" : "tickets"} attempted\n` +
    attempts.map(a =>
      `  ${a.outcome.toUpperCase()} ${a.ticket} (${a.prior_version || "no version"}) [${a.mode}] ` +
      `${a.recorded ? `recorded ${a.regrade_id || "(no id)"}${a.verdict_id ? `, verdict ${a.verdict_id}` : ""}${a.ship_decision_id ? `, ship ${a.ship_decision_id}` : ""}` : "NOT recorded"}\n` +
      `    ${a.reason}`).join("\n") +
    (dryRun ? "\n  --dry-run: nothing recorded." : "");
  return emit({ code, json, payload, prose });
}

// SES-176: importing this module for its exports must never run the CLI, and exitCode rather than
// exit() so a pending write is never cut off mid-flight.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  process.exitCode = await main(process.argv.slice(2)).catch(err => {
    console.error(`regrade-current: ${err && err.stack ? err.stack : err}`);
    return 2;
  });
}
