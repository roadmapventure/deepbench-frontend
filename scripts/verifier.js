#!/usr/bin/env node
// DeepBench v7.0.299 | scripts/verifier.js | SES-213 -- summarizeGateOutput(): the verdict ledger
// now records WHAT a gate blocked on. The retired `res.stderr || res.stdout` preferred stderr
// WHOLESALE, so all 26 block rows stored an unrelated GATE_BYPASS_SECRET warning and never the
// failing test. See that function's own header for the measurement. The ORDERING half of SES-213 is
// deliberately NOT in this file -- it is step 7a of docs/runbooks/runner-cycle.md, because a
// verifier that spawns render-claude-state.js would be a verifier that writes to the tree, and
// verdict-only is this file's founding property (see below).
//
// DeepBench v7.0.247 | scripts/verifier.js | SES-181 (Selfbuild M3 - Independent Verification)
//
// THE REVIEWER LANE, first rung: a VERDICT-ONLY, FAIL-CLOSED verifier. It runs the three mechanical
// gates over the change a cycle is about to ship, reaches approve/block with logged reasoning, and
// records the verdict in public.runner_verdicts. Built to John's accepted card 10de5fb5 (attended
// architect session 2026-08-25) and restated in directive cd278478.
//
// WHAT "VERDICT-ONLY" MEANS HERE, AND IT IS THE PROPERTY MOST LIKELY TO BE ERODED: this script
// CANNOT EDIT. It writes exactly one row -- its own verdict -- and touches no backlog_items row, no
// ticket status, no file in the tree. Charter, Multi-agent verification item 1: "verifier has fresh
// context, reads canonical rules + diff, never the author's conversation; verdict-only; cannot
// edit." A later edit that lets this script write a ticket's status has not extended the verifier,
// it has deleted the separation the whole lane exists for.
//
// AND "BLOCKS NOTHING", WHICH IS JOHN'S OWN SPLIT ON THE CARD -- "completes nothing, blocks nothing,
// scoreboard visible". At verdict one the exit code is INFORMATION, not a brake. No caller may use
// exit 1 to abort a ship: a `block` means the cycle ships `delivered` and cards John, which is
// exactly what it did before this file existed. The single consumer of `approve` is the interim
// auto-done bar wired at step 7a of docs/runbooks/runner-cycle.md, and that bar consumes
// approve + eligibility, never the bare exit code.
//
// FAIL-CLOSED IS NOT A SLOGAN, IT IS THE THIRD GATE VALUE. Each gate is green / red / SKIPPED, and
// skipped is NOT green. This is the SES-199 lesson generalised: that ticket shipped because
// check-session-docs.js ended in process.exit(0) on every path, so "tripwire green" -- a term the
// interim auto-done bar depends on -- could never be anything else. A verifier that approves when a
// gate could not run is the same defect with a bigger blast radius, so `approve` requires all three
// gates GREEN, asserted here AND by ck_runner_verdicts_fail_closed in the database. Two independent
// homes for one rule is deliberate: this script is not the only thing that can ever insert a row.
//
// THE THREE GATES ARE THE CHARTER'S, NOT A SET CHOSEN HERE. Decision 2, verbatim: "Interim bar until
// the M3 verifier exists: build + regression + hygiene tripwire ALL green -> auto-`done`; any red or
// skipped check still cards John." So GATES below is build / regression / hygiene, and the hygiene
// gate runs check-session-docs.js with `--gate` -- the SES-199 flag -- because the bare form always
// exits 0 and would make this gate a rubber stamp by construction.
//
// WHY THE ELIGIBILITY TEST READS THE BOARD AND NOT THE ARGV. Charter decision 2 scopes auto-done to
// "this project's P10 - Tooling deliveries" -- the Selfbuild epic family only, superseding SES-154's
// John-only-writer rule FOR THAT FAMILY AND NOTHING ELSE. A cycle passing its own --epic would be
// self-certifying its scope, so epic and priority class are read live from public.backlog_items via
// the ticket id. No ticket, or a ticket the board does not carry, is NOT eligible -- fail closed,
// with the reason named rather than a silent false.
//
// AND IT REFUSES TO GRADE ITSELF, IN CODE RATHER THAN BY CONVENTION. Charter premise 3: "no change
// certifies itself; a fresh-context verifier must pass it." A delivery whose diff touches this file
// or either of the other two gate scripts is ineligible for the auto-done bar however green it is --
// see SELF_CERTIFYING_PATHS. The first draft of this rule was a sentence in the runbook, which is
// the exact shape of rule this platform has watched go silently unfollowed eight times over, and the
// cycle most likely to forget it is the one editing this file. A diff that cannot be READ fails the
// same direction: unknown is not innocent.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... \
//     node scripts/verifier.js --cycle-id=<uuid> --ticket=SES-181 --version=v7.0.247
//   node scripts/verifier.js --dry-run            # run the gates, print the verdict, record nothing
//
// Flags:
//   --cycle-id=<uuid>   The cycle this verdict belongs to. Required unless --dry-run.
//   --ticket=<ID>       Bare ticket id. Without it the verdict is still recorded; eligibility is
//                       not, because it cannot be established.
//   --version=<vX.Y.Z>  The version being shipped, for the ledger.
//   --base=<ref>        Base ref the delivery's diff is taken against. Defaults to origin/dev.
//   --dry-run           Run the gates and print the verdict; write nothing, need no credentials.
//   --json              Single-line machine-readable output.
//   --repo=<path>       Repo root the gates run in. Defaults to this file's parent directory.
//
// Exit codes (the convention check-version-claim.js and export-backlog-snapshot.js set):
//   0  verdict APPROVE  -- all three gates green
//   1  verdict BLOCK    -- a gate was red, or could not run
//   2  the VERIFIER could not run (missing env, missing --cycle-id, the insert failed). Distinct
//      from 1 on purpose: 1 is a judgement about the change, 2 is the absence of a judgement, and
//      an unrunnable verifier must never be reported as either a pass or a block on the work.
//
// Env (process.env only -- never hardcoded, never printed):
//   SUPABASE_URL           Project REST base.
//   SUPABASE_SERVICE_KEY   Service-role key. runner_verdicts holds no anon/authenticated grants.
//
// Pure helpers (gateStatus, verdictFor, autoDoneEligibility) are exported so the regression suite
// drives every branch with no network and no subprocesses -- the seam-proof convention this repo's
// other checkers use. Guarded by tests/regression/SES-181-verifier.js.

import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The charter's interim bar, in order. `label` is what John reads; `argv` is what runs.
// Exported so a later widening or narrowing of the gating set shows up in this file's diff and in
// the regression test's, rather than silently -- the SES-199 GATING_CHECKS convention.
export const GATES = Object.freeze([
  Object.freeze({ key: "build", label: "build",
    cmd: "npm", argv: ["run", "build"] }),
  Object.freeze({ key: "regression", label: "regression suite",
    cmd: process.execPath, argv: ["tests/regression/run-all.js"] }),
  // --gate is SES-199's flag. The bare form always exits 0; using it here would make the hygiene
  // gate incapable of ever being red, which is the rubber stamp this lane exists to prevent.
  Object.freeze({ key: "hygiene", label: "hygiene tripwire",
    cmd: process.execPath, argv: ["scripts/check-session-docs.js", "--gate"] }),
]);

export const AUTO_DONE_EPIC_PREFIX = "Selfbuild";
export const AUTO_DONE_CLASS_PREFIX = "P10";

// The files that ARE the verification. A delivery whose diff touches one of these is graded by the
// code it just changed, so it may not take the auto-done bar -- charter premise 3, "no change
// certifies itself; a fresh-context verifier must pass it."
//
// THIS IS A CODE RULE ON PURPOSE. Its first draft lived in the runbook as a sentence every cycle had
// to remember, which is the exact class of rule this platform has now watched go silently unfollowed
// eight times (SES-86 phase 3, v7.0.146, SES-101, SES-111, SES-127, SES-128, SES-129, SES-143). The
// cycle most likely to forget it is the one editing this file.
export const SELF_CERTIFYING_PATHS = Object.freeze([
  "scripts/verifier.js",
  "scripts/check-session-docs.js",
  "tests/regression/run-all.js",
]);

function arg(name, fallback) {
  const prefix = `--${name}=`;
  const hit = process.argv.find(a => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

// A gate's outcome from its process result. THE THREE-VALUE RETURN IS THE POINT: `ran` false means
// the command never produced an exit status (spawn error, binary missing, killed by signal), and
// that is 'skipped', never 'green'. Collapsing skipped into either green or red loses the one
// distinction the charter's bar is written in ("any red OR SKIPPED check still cards John").
export function gateStatus({ ran, exitCode }) {
  if (!ran) return "skipped";
  if (exitCode === null || exitCode === undefined) return "skipped";
  return exitCode === 0 ? "green" : "red";
}

// How much of a gate's output the ledger keeps. Four [FAIL] lines plus a summary line legitimately
// exceed the 400 this used to be, and a reasoning that stops mid-failure is the defect in miniature.
export const DETAIL_CAP = 600;

// WHAT A GATE BLOCKED ON -- the second half of SES-213, and it is a fact about WHICH STREAM, not a
// formatting preference. This used to read `res.stderr || res.stdout`, which prefers stderr
// WHOLESALE: the first non-empty stream wins and the other is discarded entirely. Measured against
// the real output shape rather than assumed -- tests/regression/run-all.js:77 prints
// `[FAIL] <file> -- <message>` through console.log (STDOUT), while the ubiquitous
// `WARN: GATE_BYPASS_SECRET not found` is a console.warn (STDERR). So stderr was always non-empty,
// always won, and all 26 block rows in public.runner_verdicts recorded the warning and never the
// failing test. The verdict ledger could not say what it blocked on, which is why SES-213 needed a
// live reproduction instead of a query.
//
// THE RULE: read BOTH streams, and prefer the lines that name failures over the lines that merely
// came last. Position is not evidence.
//
// Pure and exported so its guard can test it directly instead of spawning a suite -- the tail it
// replaced was buried inside runGate() and was therefore only ever observable through a real
// 20-minute gate run, which is how it survived 26 rows.
export function summarizeGateOutput({ stdout, stderr }) {
  const lines = `${stdout || ""}\n${stderr || ""}`
    .split("\n").map(l => l.trim()).filter(Boolean);
  const fails = lines.filter(l => l.startsWith("[FAIL]"));
  // The pass count anchors the verdict, so it is preferred over the not-run notice when both are
  // present -- "96/97 passed" tells a reader how much of the suite the failure represents.
  const summary = lines.filter(l => /^regression suite:/.test(l))
    .concat(lines.filter(l => /^NOT A FULL RUN:/.test(l)));
  // No [FAIL] vocabulary (npm build, the hygiene tripwire) falls back to the last three lines of the
  // COMBINED output -- stderr is concatenated last, so an npm failure still ends on its own error.
  const chosen = fails.length ? [...fails.slice(0, 4), ...summary.slice(0, 1)] : lines.slice(-3);
  return chosen.join(" | ");
}

// The whole verdict rule, in one pure function.
//
//   gates  { build: 'green'|'red'|'skipped', regression: ..., hygiene: ... }
//
// Returns { verdict, reasoning }. `reasoning` is REQUIRED by the table's own CHECK, so it is built
// here rather than left to the caller: the charter's grounding rule is "every factual claim cites a
// checkable source or blocks", and a verdict whose reason is composed at the call site is a claim
// with no fixed home.
export function verdictFor(gates) {
  const rows = GATES.map(g => ({ key: g.key, label: g.label, status: gates[g.key] ?? "skipped" }));
  const green = rows.filter(r => r.status === "green");
  const red = rows.filter(r => r.status === "red");
  const skipped = rows.filter(r => r.status === "skipped");

  if (green.length === GATES.length) {
    return {
      verdict: "approve",
      reasoning: `approve: all ${GATES.length} mechanical gates green (${rows.map(r => r.label).join(", ")}). ` +
        `Verdict-only -- this completes nothing and blocks nothing by itself.`,
    };
  }
  const parts = [];
  if (red.length) parts.push(`RED: ${red.map(r => r.label).join(", ")}`);
  if (skipped.length) {
    parts.push(`COULD NOT RUN (fail-closed, counted as not green): ${skipped.map(r => r.label).join(", ")}`);
  }
  return {
    verdict: "block",
    reasoning: `block: ${parts.join("; ")}. Green: ${green.length ? green.map(r => r.label).join(", ") : "none"}. ` +
      `A block is the status quo -- the cycle ships delivered and cards John, exactly as before this lane existed.`,
  };
}

// Charter premise 3, as a test rather than as a sentence to remember.
//
//   changedFiles  repo-relative paths in this delivery's diff, or NULL when they could not be
//                 determined. NULL IS A REAL ANSWER AND IT BLOCKS: a verifier that cannot see what
//                 changed cannot know whether it is grading itself, and "could not tell" must fail
//                 the same direction as "yes" -- the whole file's fail-closed rule, applied here.
export function selfCertificationBlock(changedFiles) {
  if (changedFiles === null || changedFiles === undefined) {
    return { blocked: true, reason: `the delivery's changed-file list could not be read, so whether this change grades itself is unknown -- fails closed (charter premise 3, "no change certifies itself").` };
  }
  const norm = changedFiles.map(f => String(f).replace(/\\/g, "/").replace(/^\.\//, ""));
  const hits = SELF_CERTIFYING_PATHS.filter(p => norm.includes(p));
  if (hits.length) {
    return { blocked: true, reason: `this delivery changes ${hits.join(", ")} -- the verification itself. Charter premise 3: "no change certifies itself; a fresh-context verifier must pass it." The verdict stands; the auto-done bar does not apply.` };
  }
  return { blocked: false, reason: "" };
}

// Charter decision 2's scope test. Returns { eligible, reason } -- the reason is stored either way,
// because "not eligible" with no reason is indistinguishable from "nobody checked".
export function autoDoneEligibility({ verdict, epicName, priorityClass, changedFiles }) {
  if (verdict !== "approve") {
    return { eligible: false, reason: `verdict is ${verdict}; the interim auto-done bar requires approve (all three gates green).` };
  }
  if (!epicName) {
    return { eligible: false, reason: `no epic on the ticket -- charter decision 2 scopes auto-done to the ${AUTO_DONE_EPIC_PREFIX} epic family only, and an unknown epic fails closed.` };
  }
  if (!String(epicName).startsWith(AUTO_DONE_EPIC_PREFIX)) {
    return { eligible: false, reason: `epic '${epicName}' is outside the ${AUTO_DONE_EPIC_PREFIX} family; charter decision 2 supersedes SES-154's John-only-writer rule for that family and nothing else.` };
  }
  if (!String(priorityClass ?? "").startsWith(AUTO_DONE_CLASS_PREFIX)) {
    return { eligible: false, reason: `priority class '${priorityClass ?? "(none)"}' is not ${AUTO_DONE_CLASS_PREFIX} - Tooling; charter decision 2 approves auto-accept for tooling deliveries only.` };
  }
  // Checked LAST so that a ticket which otherwise qualifies gets the specific reason -- "you are
  // grading yourself" -- rather than a scope message that would send the next reader looking in the
  // wrong place.
  const self = selfCertificationBlock(changedFiles);
  if (self.blocked) return { eligible: false, reason: self.reason };

  return {
    eligible: true,
    reason: `all three gates green on a ${AUTO_DONE_EPIC_PREFIX} ${AUTO_DONE_CLASS_PREFIX} - Tooling delivery, and the diff touches none of ${SELF_CERTIFYING_PATHS.join(", ")} -- the interim bar of charter decision 2 is met. Reverse stays one tap away.`,
  };
}

// ---------------------------------------------------------------------------
// Gates
// ---------------------------------------------------------------------------

// The delivery's changed files: committed-vs-base plus anything still in the working tree, because a
// cycle runs this BEFORE its push and the change may be either. Returns null when git cannot answer
// -- selfCertificationBlock() reads null as "fails closed", never as "nothing changed".
function changedFilesFor(repoRoot, base) {
  const out = [];
  for (const argv of [["diff", "--name-only", `${base}...HEAD`], ["status", "--porcelain"]]) {
    const r = spawnSync("git", argv, { cwd: repoRoot, encoding: "utf8" });
    if (r.error || r.status !== 0) return null;
    for (const line of String(r.stdout).split("\n")) {
      const t = line.trim();
      if (!t) continue;
      // `git status --porcelain` prefixes a two-column status; `git diff --name-only` does not.
      out.push(argv[0] === "status" ? t.replace(/^.{2}\s+/, "").replace(/^.*\s->\s/, "") : t);
    }
  }
  return out;
}

function runGate(gate, repoRoot) {
  let res;
  try {
    res = spawnSync(gate.cmd, gate.argv, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
      timeout: 20 * 60 * 1000,
    });
  } catch (e) {
    return { status: "skipped", detail: `spawn threw: ${e.message}` };
  }
  if (res.error) return { status: "skipped", detail: `could not run: ${res.error.message}` };
  // A signal kill leaves status null -- gateStatus() reads that as skipped, which is why the raw
  // status is passed through rather than defaulted to a number here.
  const status = gateStatus({ ran: true, exitCode: res.status });
  const tail = summarizeGateOutput({ stdout: res.stdout, stderr: res.stderr });
  return { status, detail: `exit ${res.status === null ? "signal " + res.signal : res.status}${tail ? " -- " + tail.slice(0, DETAIL_CAP) : ""}` };
}

// ---------------------------------------------------------------------------
// Network
// ---------------------------------------------------------------------------

async function rest(base, key, pathAndQuery, init = {}) {
  const url = `${base.replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`;
  let res;
  try {
    res = await fetch(url, {
      ...init,
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers || {}) },
    });
  } catch (e) {
    return { error: `could not reach the Supabase REST endpoint: ${e.message}` };
  }
  if (!res.ok) {
    let body = "";
    try { body = await res.text(); } catch { /* an unreadable body is still a failure */ }
    return { error: `Supabase REST returned HTTP ${res.status} ${res.statusText}: ${body}` };
  }
  try {
    const text = await res.text();
    return { rows: text ? JSON.parse(text) : [] };
  } catch (e) {
    return { error: `Supabase REST returned unparseable JSON: ${e.message}` };
  }
}

function emit({ code, payload, prose }) {
  if (process.argv.includes("--json")) console.log(JSON.stringify(payload));
  else if (code === 0) console.log(prose);
  else console.error(prose);
  process.exit(code);
}

async function main() {
  const repoRoot = arg("repo", path.resolve(__dirname, ".."));
  const dryRun = process.argv.includes("--dry-run");
  const cycleId = arg("cycle-id", "");
  const ticket = arg("ticket", "");
  const version = arg("version", "");

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!dryRun) {
    const missing = [!supabaseUrl && "SUPABASE_URL", !supabaseKey && "SUPABASE_SERVICE_KEY", !cycleId && "--cycle-id"].filter(Boolean);
    if (missing.length) {
      return emit({ code: 2, payload: { ok: false, exitCode: 2, kind: "cannot-run", missing },
        prose: `verifier: missing ${missing.join(", ")}. Exiting 2 (the verifier could not run) -- this is NOT a verdict. Use --dry-run to reach a verdict without recording one.` });
    }
  }

  const gateResults = {};
  const gateDetail = {};
  for (const gate of GATES) {
    const r = runGate(gate, repoRoot);
    gateResults[gate.key] = r.status;
    gateDetail[gate.key] = r.detail;
  }

  const { verdict, reasoning } = verdictFor(gateResults);

  // Eligibility reads the board, never the argv -- see the header.
  let epicName = null;
  let priorityClass = null;
  let lookupNote = "";
  if (ticket && supabaseUrl && supabaseKey) {
    const q = `backlog_items?select=priority_class,epics(name)&backlog_id=eq.${encodeURIComponent(ticket)}&limit=1`;
    const r = await rest(supabaseUrl, supabaseKey, q);
    if (r.error) lookupNote = ` (ticket lookup failed: ${r.error})`;
    else if (r.rows.length) {
      priorityClass = r.rows[0].priority_class ?? null;
      epicName = r.rows[0].epics?.name ?? null;
    } else lookupNote = ` (no board row for ${ticket})`;
  } else if (!ticket) {
    lookupNote = " (no --ticket passed)";
  }

  const changedFiles = changedFilesFor(repoRoot, arg("base", "origin/dev"));
  const elig = autoDoneEligibility({ verdict, epicName, priorityClass, changedFiles });
  const autoDoneReason = elig.reason + lookupNote;

  const detailLine = GATES.map(g => `${g.label}=${gateResults[g.key]} [${gateDetail[g.key]}]`).join("\n  ");
  const prose =
    `verifier verdict: ${verdict.toUpperCase()}${ticket ? ` on ${ticket}` : ""}${version ? ` (${version})` : ""}\n` +
    `  ${detailLine}\n` +
    `  ${reasoning}\n` +
    `  auto-done eligible: ${elig.eligible ? "YES" : "no"} -- ${autoDoneReason}`;

  const payload = {
    ok: verdict === "approve",
    exitCode: verdict === "approve" ? 0 : 1,
    verdict, gates: gateResults, gateDetail, reasoning,
    auto_done_eligible: elig.eligible, auto_done_reason: autoDoneReason,
    ticket: ticket || null, version: version || null, epic_name: epicName, priority_class: priorityClass,
  };

  if (dryRun) {
    return emit({ code: payload.exitCode, payload: { ...payload, recorded: false }, prose: prose + "\n  --dry-run: nothing recorded." });
  }

  const ins = await rest(supabaseUrl, supabaseKey, "runner_verdicts", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      cycle_id: cycleId,
      backlog_id: ticket || null,
      version: version || null,
      verdict,
      gate_build: gateResults.build,
      gate_regression: gateResults.regression,
      gate_hygiene: gateResults.hygiene,
      reasoning: `${reasoning}\nGates: ${detailLine.replace(/\n\s+/g, " | ")}`,
      auto_done_eligible: elig.eligible,
      auto_done_reason: autoDoneReason,
      epic_name: epicName,
      priority_class: priorityClass,
    }),
  });
  if (ins.error) {
    // The verdict was reached but not recorded. That is a verifier failure, not a verdict on the
    // change -- exit 2, for the same reason a missing credential is 2.
    return emit({ code: 2, payload: { ...payload, recorded: false, error: ins.error },
      prose: `${prose}\n  RECORDING FAILED: ${ins.error}\n  Exiting 2 -- the verdict above was reached but is not in the ledger, so it is not assertable.` });
  }

  const rowId = Array.isArray(ins.rows) && ins.rows[0] ? ins.rows[0].id : null;
  return emit({ code: payload.exitCode, payload: { ...payload, recorded: true, verdict_id: rowId },
    prose: `${prose}\n  recorded as runner_verdicts ${rowId}` });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}
