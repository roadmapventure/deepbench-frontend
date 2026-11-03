#!/usr/bin/env node
// DeepBench v7.0.942 | scripts/open-session.js | AGT-460
//
// THE TEN STEPS EVERY SESSION OPENS WITH, as a script instead of as 900 lines of prose a session
// re-reads and re-types. `docs/runbooks/session-setup.md` steps 1 through 3b, in the runbook's own
// order, and then the two numbers that decide how long this session may run at all.
//
// WHY A SCRIPT. The open sequence is deterministic: the worktree name, the branch point, the
// `.env.local` copy, the inflight marker, the atomic ticket claim, the counters. Every one of those
// is a mechanism, and pattern:9 says never spend a model call where a mechanism serves. A session
// that reads the procedure and performs it by hand gets the order right most of the time, which is
// the failure mode worth removing: the steps that get dropped are the ones nothing visibly breaks
// without (the `.env.local` copy, step 2b's staging), and they break something hours later in a
// different session.
//
// WHAT IT DOES NOT DO. It does not decide. The ticket is named on the command line; this script
// claims it or reports who holds it. It never picks a ticket, never re-tiers one, never writes a
// status, never records a decision -- those are judgment writes and they belong to the session.
//
// THE TWO CLAIMS IT CANNOT MAKE ITSELF. `--version` and `--ids=` print §3/§3b's SQL for the
// operator's one Supabase-connector call rather than faking a number: PostgREST's write API takes
// column values, not the arithmetic those two statements need. `scripts/lib/session-db.mjs`'s header
// carries the measurement and the precedent. The steps still appear in the plan, in order, with the
// statement to run -- an omitted step is how a counter gets read-and-incremented instead.
//
//   node scripts/open-session.js --name=<short-session-name> --ticket=<ID> \
//     [--version] [--ids=<PREFIX>:<N>] [--dry-run] [--json] [--repo=<shared checkout>]
//
// Exit 0  — the open sequence ran (or, with --dry-run, the plan is sound and the meter was read).
// Exit 2  — `no-credentials` (SUPABASE_URL / SUPABASE_SERVICE_KEY unset) or the worktree already
//           exists. Both are "this session cannot open here", and both are the reader's to fix.
// Exit 3  — `claim-held`: the atomic claim returned 0 rows. Prints `claimed_by` and `claimed_at`, so
//           the report names WHO holds the ticket rather than only that it is held. Rule B40: take
//           the next queued ticket; never work one a live peer holds.

import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import {
  budget, claimIds, claimTicket, claimVersion, credentials, meter, noCredentials,
} from "./lib/session-db.mjs";

const WHO = "open-session";
const EXIT_OK = 0;
const EXIT_CANNOT_OPEN = 2;
const EXIT_CLAIM_HELD = 3;

// `.env.local` carries PUBLISHABLE VALUES ONLY — John's ruling d7670e18, enforced by
// tests/regression/ses-260-env-local-publishable-only.test.mjs. The copy this script makes is
// filtered to these prefixes/names, so a shared checkout whose copy has grown a privileged key back
// cannot propagate it into a new worktree. A privileged key is borrowed BY NAME from
// public.runner_secrets for the one command that needs it, never written to a file.
export const PUBLISHABLE = Object.freeze(["SUPABASE_URL", "ALLOWED_ORIGIN"]);
export const PUBLISHABLE_PREFIX = "VITE_";
export const PRIVILEGED = Object.freeze([
  "ANTHROPIC_API_KEY", "OPENAI_API_KEY", "SUPABASE_SERVICE_KEY", "VERCEL_TOKEN",
  "VERCEL_AUTOMATION_BYPASS_SECRET",
]);

export function isPublishable(name) {
  if (PRIVILEGED.includes(name)) return false;
  return PUBLISHABLE.includes(name) || name.startsWith(PUBLISHABLE_PREFIX);
}

// Splits an `.env.local` body into the lines a worktree copy may carry and the names it must not.
// Comments and blanks travel; a `KEY=` line is judged on its KEY.
export function filterEnvLocal(body) {
  const kept = [];
  const dropped = [];
  for (const line of String(body).split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line);
    if (!m) { kept.push(line); continue; }
    if (isPublishable(m[1])) kept.push(line); else dropped.push(m[1]);
  }
  return { body: kept.join("\n"), dropped };
}

export function parseArgs(argv) {
  const arg = name => {
    const hit = argv.find(a => a === `--${name}` || a.startsWith(`--${name}=`));
    if (hit === undefined) return undefined;
    return hit.includes("=") ? hit.slice(hit.indexOf("=") + 1) : true;
  };
  const name = arg("name");
  const ticket = arg("ticket");
  const errors = [];
  if (typeof name !== "string" || !name.trim()) errors.push("--name=<short-session-name> is required: the worktree, the branch, the inflight file and the claim all carry it");
  if (typeof ticket !== "string" || !ticket.trim()) errors.push("--ticket=<ID> is required: rule B40 claims the ticket at pick time, and a claim nobody can re-assert is worse than none");
  let ids = null;
  const rawIds = arg("ids");
  if (typeof rawIds === "string" && rawIds.trim()) {
    const m = /^([A-Za-z]+)\s*:\s*(\d+)$/.exec(rawIds.trim());
    if (!m) errors.push(`--ids must read <PREFIX>:<N>, got ${JSON.stringify(rawIds)}`);
    else ids = { prefix: m[1].toUpperCase(), n: Number(m[2]) };
  } else if (rawIds === true) {
    errors.push("--ids needs its block size: --ids=<PREFIX>:<N>, where N is how many rows you are about to file");
  }
  return {
    errors,
    name: typeof name === "string" ? name.trim() : "",
    ticket: typeof ticket === "string" ? ticket.trim() : "",
    wantVersion: arg("version") === true || typeof arg("version") === "string",
    ids,
    dryRun: arg("dry-run") === true,
    json: arg("json") === true,
    repo: typeof arg("repo") === "string" ? arg("repo") : null,
  };
}

function git(repo, args) {
  // `git -C "<path>" …`, never a `cd && …` compound (CLAUDE.md hard rule). execFileSync passes the
  // argument vector straight to git with no shell, so there is no compound to form.
  return execFileSync("git", ["-C", repo, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

// The ten steps, named once so the plan, the run and the JSON all read from one list. `step` is the
// runbook's own number, which is what makes this greppable against the procedure it executes.
export function planFor(opts, paths) {
  return [
    { n: 1, step: "1", title: "check the worktree name for a collision",
      detail: `git -C "${paths.repo}" worktree list — a generic name collides under 5–7 concurrent sessions, so the name carries a topic hint` },
    { n: 2, step: "1", title: "fetch origin dev",
      detail: `git -C "${paths.repo}" fetch origin dev — this repo's remote default is main, so the branch point is named explicitly` },
    { n: 3, step: "1", title: "add the worktree, branched explicitly from origin/dev",
      detail: `git -C "${paths.repo}" worktree add "${paths.worktreeRel}" -b "session/${opts.name}" origin/dev` },
    { n: 4, step: "1b", title: "copy .env.local in, publishable values only",
      detail: `${paths.envSource} → ${paths.envTarget}; ${PUBLISHABLE.join(", ")} and ${PUBLISHABLE_PREFIX}* travel, the five privileged names never do (ruling d7670e18)` },
    { n: 5, step: "1c", title: "work against the worktree path for the rest of the session",
      detail: `${paths.worktree} — never the shared checkout, and state this path verbatim in any sub-agent's prompt` },
    { n: 6, step: "2", title: "create the inflight marker",
      detail: `${paths.inflightRel} — one line; it is the only signal that tells a quiet worktree apart from an abandoned one` },
    { n: 7, step: "2b", title: "stage the marker for the first commit",
      detail: `git -C "${paths.worktree}" add "${paths.inflightRel}" — creating it is not enough; it does its job only once it is on origin/dev (SES-23)` },
    { n: 8, step: "2c", title: "claim the ticket atomically",
      detail: `one UPDATE … RETURNING on ${opts.ticket}: 1 row → yours, 0 rows → exit 3 naming the holder. updated_at left untouched (SES-316)` },
    { n: 9, step: "3", title: "claim the version number atomically",
      detail: opts.wantVersion
        ? "§3's UPDATE … RETURNING over the Supabase connector — the write IS the reservation, so no re-check before push"
        : "not requested (--version); claim it the moment this session needs one, never by reading CLAUDE-STATE.md and incrementing" },
    { n: 10, step: "3b", title: "claim the feature/backlog ID block atomically",
      detail: opts.ids
        ? `§3b's INSERT … ON CONFLICT for ONE block of ${opts.ids.n} ${opts.ids.prefix}- ids over the Supabase connector`
        : "not requested (--ids=<PREFIX>:<N>); when you file N rows, claim one block of N — never one id hand-counted up" },
  ];
}

function pathsFor(opts) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const repo = opts.repo ?? path.resolve(here, "..");
  const worktreeRel = path.posix.join(".claude", "worktrees", opts.name);
  return {
    repo,
    worktreeRel,
    worktree: path.join(repo, ".claude", "worktrees", opts.name),
    envSource: path.join(repo, ".env.local"),
    envTarget: path.join(repo, ".claude", "worktrees", opts.name, ".env.local"),
    inflightRel: path.posix.join("inflight", `${opts.name}.md`),
  };
}

async function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  if (opts.errors.length) {
    for (const e of opts.errors) console.error(`${WHO}: ${e}`);
    return process.exit(EXIT_CANNOT_OPEN);
  }
  // The credential gate comes first and is never skipped on --dry-run: the meter and the budget are
  // read in both modes, and a dry run that silently omitted its database half would print a plan
  // that looks complete while saying nothing about whether this session may run at all.
  if (!credentials().ok) return noCredentials(WHO);

  const paths = pathsFor(opts);
  const plan = planFor(opts, paths);
  const out = {
    name: opts.name, ticket: opts.ticket, dry_run: opts.dryRun,
    worktree: paths.worktree, branch: `session/${opts.name}`,
    steps: plan.map(s => ({ n: s.n, step: s.step, title: s.title, detail: s.detail })),
  };

  // Step 1's collision check, run in both modes — it is a read, and it is the one step whose answer
  // changes whether the rest of the plan is legal at all.
  const exists = fs.existsSync(paths.worktree);
  out.worktree_exists = exists;
  if (exists) {
    console.error(`${WHO}: worktree-exists — ${paths.worktree} is already there. Pick a more specific `
      + "<short-session-name> (include a topic hint, not just a date), or finish and remove that worktree first.");
    if (opts.json) console.log(JSON.stringify({ ...out, exit: EXIT_CANNOT_OPEN, reason: "worktree-exists" }, null, 2));
    return process.exit(EXIT_CANNOT_OPEN);
  }

  if (!opts.dryRun) {
    try {
      git(paths.repo, ["fetch", "origin", "dev"]);
      git(paths.repo, ["worktree", "add", paths.worktreeRel, "-b", `session/${opts.name}`, "origin/dev"]);
    } catch (e) {
      console.error(`${WHO}: worktree-add-failed — ${String(e.stderr ?? e.message).trim()}`);
      return process.exit(EXIT_CANNOT_OPEN);
    }
    // Step 1b. A missing source is a finding, not a silent skip: a worktree without `.env.local`
    // hits a blank page at Supabase-client construction the first time anything reads import.meta.env.
    if (fs.existsSync(paths.envSource)) {
      const { body, dropped } = filterEnvLocal(fs.readFileSync(paths.envSource, "utf8"));
      fs.writeFileSync(paths.envTarget, body);
      out.env_local = { copied: true, dropped };
      if (dropped.length) {
        console.warn(`${WHO}: .env.local — dropped ${dropped.join(", ")} from the copy; `
          + "`.env.local` carries publishable values only, and the shared copy has grown one back (ruling d7670e18).");
      }
    } else {
      out.env_local = { copied: false, dropped: [] };
      console.warn(`${WHO}: .env.local — ${paths.envSource} is not there, so the worktree has none. `
        + "Any dev-server preview or Node test in it will fail at Supabase-client construction.");
    }
    // Step 2. The marker, right after the worktree — not when something else happens to be edited.
    const inflightDir = path.join(paths.worktree, "inflight");
    fs.mkdirSync(inflightDir, { recursive: true });
    fs.writeFileSync(path.join(paths.worktree, paths.inflightRel),
      `${opts.name} — working ${opts.ticket}.\n`);
    // Step 2b. Explicitly staged, because a marker nothing committed is invisible to every peer.
    try { git(paths.worktree, ["add", paths.inflightRel]); out.inflight = { created: true, staged: true }; }
    catch (e) {
      out.inflight = { created: true, staged: false, error: String(e.stderr ?? e.message).trim() };
      console.warn(`${WHO}: the inflight marker was created but not staged — stage it in your first commit (SES-23).`);
    }
  }

  // Step 2c. The atomic claim. On --dry-run it is NOT made: a dry run that claimed a board ticket
  // would be a write wearing a plan's clothes.
  if (opts.dryRun) {
    out.claim = { attempted: false, why: "--dry-run makes no claim; rule B40's claim happens on the real open" };
  } else {
    const claim = await claimTicket(opts.ticket, opts.name);
    out.claim = { attempted: true, ok: claim.ok, rows: claim.ok ? 1 : claim.rows ?? 0 };
    if (!claim.ok) {
      out.claim.claimed_by = claim.claimed_by ?? null;
      out.claim.claimed_at = claim.claimed_at ?? null;
      console.error(`${WHO}: claim-held — ${opts.ticket} is held. claimed_by=${claim.claimed_by ?? "(none)"} `
        + `claimed_at=${claim.claimed_at ?? "(none)"}. ${claim.reason} Take the next queued ticket (rule B40).`);
      if (opts.json) console.log(JSON.stringify({ ...out, exit: EXIT_CLAIM_HELD, reason: "claim-held" }, null, 2));
      return process.exit(EXIT_CLAIM_HELD);
    }
  }

  // Steps 3 and 3b — the statements to run over the connector, never a number this script invented.
  if (opts.wantVersion) out.version_claim = claimVersion(opts.name);
  if (opts.ids) out.id_claim = claimIds(opts.ids.prefix, opts.ids.n);

  // Then the meter (with its age and its source) and the session's own length rule.
  out.meter = await meter();
  out.budget = await budget();

  const m = out.meter;
  const b = out.budget;
  const meterLine = m.reading
    ? `meter: all_models ${m.all_models_pct ?? "—"}% · 5h ${m.session_5h_pct ?? "—"}% · fable ${m.fable_pct ?? "—"}% `
      + `· age_minutes ${m.age_minutes} · source ${m.source} · stale_hours ${m.stale_hours} · ${m.stale ? "STALE" : "fresh"}`
    : `meter: no reading at all · age_minutes — · source — · ${m.note}`;
  const budgetLine = `budget: session_max_tickets ${b.session_max_tickets} · session_max_context_tokens `
    + `${b.session_max_context_tokens} · daily_max_tokens_millions ${b.daily_max_tokens_millions}`;
  const summary = `${WHO}: ${opts.dryRun ? "planned" : "opened"} ${opts.name} on ${opts.ticket} — `
    + `${plan.length} steps, worktree ${paths.worktree}, branch session/${opts.name}, `
    + `claim ${out.claim.attempted ? (out.claim.ok ? "held by this session" : "not held") : "not attempted (--dry-run)"}, `
    + `${b.rule}`;
  out.meter_line = meterLine;
  out.budget_line = budgetLine;
  out.summary = summary;

  if (opts.json) {
    console.log(JSON.stringify({ ...out, exit: EXIT_OK }, null, 2));
  } else {
    console.log(`${WHO}: ${opts.dryRun ? "PLAN" : "OPEN"} — ${opts.name} on ${opts.ticket}`);
    for (const s of plan) console.log(`  ${String(s.n).padStart(2)}. [step ${s.step}] ${s.title} — ${s.detail}`);
    if (out.version_claim) console.log(`\n§3 version claim — run over the ${out.version_claim.channel}:\n${out.version_claim.sql}`);
    if (out.id_claim?.sql) console.log(`\n§3b id-block claim — run over the ${out.id_claim.channel}:\n${out.id_claim.sql}`);
    console.log(`\n${meterLine}`);
    console.log(budgetLine);
    console.log(summary);
  }
  return process.exit(EXIT_OK);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  await main();
}

export { main, EXIT_OK, EXIT_CANNOT_OPEN, EXIT_CLAIM_HELD };
