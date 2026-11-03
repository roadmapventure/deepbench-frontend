#!/usr/bin/env node
// DeepBench v7.0.942 | scripts/close-session.js | AGT-460
//
// THE SIX STEPS EVERY SESSION CLOSES WITH, in the one order that is correct, from
// `docs/runbooks/session-setup.md` steps 4-6 and §2c's release rule.
//
// THE ORDER IS THE WHOLE POINT, and it is not this script's invention — it is John's ruling
// `q-claim-release-order` (yes, 2026-08-21, `SES-106`). The old wording said to release the claim in
// the same UPDATE that set the final status, which contradicts the re-assert-before-push gate: a
// session that lets go at the status write has nothing left to re-assert at the push. So:
//
//   1. the gates        — the related suite and `npm run build`, both green or nothing ships
//   2. re-assert        — register B42, BEFORE any push; 0 rows is exit 2 `claim-lost`
//   3. the marker       — delete `inflight/<name>.md`, in the close-out commit (step 5)
//   4. the push         — fetch, rebase, `git push origin HEAD:dev` (step 4)
//   5. the recompute    — `SELECT public.recompute_backlog_queue();` (register B4)
//   6. the release      — ONE guarded UPDATE, AFTER the push, never in the status write (§2c)
//
// and then the worktree removal, which is handed to the caller rather than run: `git worktree
// remove` is executed from the SHARED CHECKOUT against a worktree this process is standing in, and a
// script that deletes its own working directory mid-run leaves the shell somewhere that no longer
// exists. The two commands are printed instead, which is also what the runbook's step 6 asks a
// session to do once its work is merged.
//
// WHY THE RE-ASSERT COMES BEFORE THE PUSH AND NOT AFTER. A claim can move while a session works —
// it expires after 6h, and a peer may legitimately have taken the ticket. Pushing first and
// discovering it second means the tree already carries work filed against a ticket this session no
// longer holds, which is the state nothing downstream can untangle. So the re-assert is a gate, it
// is a READ (re-claiming would reset `claimed_at` and quietly extend a window that should be
// expiring), and `claim-lost` stops the run with nothing pushed.
//
//   node scripts/close-session.js --name=<short-session-name> --ticket=<ID> [--dry-run] [--json]
//
// Exit 0 — the close sequence ran (or, with --dry-run, the gates were named and the claim is still
//          this session's).
// Exit 1 — a gate was red. Nothing is pushed on red, and the scope is never widened to make it
//          green; the output is the finding.
// Exit 2 — `no-credentials`, or `claim-lost`: the re-assert returned 0 rows, so this session does
//          not hold the ticket any more. Reached BEFORE any push, and it names the holder.

import fs from "fs";
import path from "path";
import { execFileSync, spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { credentials, noCredentials, reassertClaim, recomputeBacklogQueue, releaseClaim } from "./lib/session-db.mjs";

const WHO = "close-session";
const EXIT_OK = 0;
const EXIT_RED = 1;
const EXIT_CANNOT_CLOSE = 2;

export function parseArgs(argv) {
  const arg = name => {
    const hit = argv.find(a => a === `--${name}` || a.startsWith(`--${name}=`));
    if (hit === undefined) return undefined;
    return hit.includes("=") ? hit.slice(hit.indexOf("=") + 1) : true;
  };
  const name = arg("name");
  const ticket = arg("ticket");
  const errors = [];
  if (typeof name !== "string" || !name.trim()) errors.push("--name=<short-session-name> is required: it is what the claim, the branch and the inflight marker are keyed on");
  if (typeof ticket !== "string" || !ticket.trim()) errors.push("--ticket=<ID> is required: the re-assert and the guarded release are both per-ticket");
  return {
    errors,
    name: typeof name === "string" ? name.trim() : "",
    ticket: typeof ticket === "string" ? ticket.trim() : "",
    dryRun: arg("dry-run") === true,
    json: arg("json") === true,
    worktree: typeof arg("worktree") === "string" ? arg("worktree") : null,
    repo: typeof arg("repo") === "string" ? arg("repo") : null,
  };
}

function git(cwd, args) {
  // `git -C "<path>" …`, never a `cd && …` compound (CLAUDE.md hard rule). No shell is involved.
  return execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

// The related set, measured rather than guessed: the tests that can SEE the files this session
// changed (`scripts/related-tests.js`, AGT-391). The full suite runs weekly and before a release.
export function relatedSet(worktree) {
  const r = spawnSync("node", [path.join(worktree, "scripts", "related-tests.js"), "--diff=origin/dev"],
    { cwd: worktree, encoding: "utf8" });
  if (r.status !== 0) return { error: `related-tests.js exited ${r.status}: ${String(r.stderr ?? "").trim()}` };
  return { set: String(r.stdout ?? "").trim() };
}

async function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  if (opts.errors.length) {
    for (const e of opts.errors) console.error(`${WHO}: ${e}`);
    return process.exit(EXIT_CANNOT_CLOSE);
  }
  if (!credentials().ok) return noCredentials(WHO);

  const here = path.dirname(fileURLToPath(import.meta.url));
  const worktree = opts.worktree ?? path.resolve(here, "..");
  const repo = opts.repo ?? worktree;
  const inflightRel = path.posix.join("inflight", `${opts.name}.md`);
  const out = { name: opts.name, ticket: opts.ticket, dry_run: opts.dryRun, worktree, steps: [] };

  const say = line => { if (!opts.json) console.log(line); };
  const record = (n, title, state, detail) => {
    out.steps.push({ n, title, state, detail });
    say(`  ${n}. ${title} — ${state}${detail ? `: ${detail}` : ""}`);
  };

  say(`${WHO}: ${opts.dryRun ? "PLAN" : "CLOSE"} — ${opts.name} on ${opts.ticket}`);

  // --- 1. the gates ----------------------------------------------------------------------------
  // On --dry-run they are NAMED, not run: a dry run exists to check the ORDER and the claim, and
  // running the suite and a full build to answer that question would make the cheap check expensive
  // enough that nobody runs it.
  const related = relatedSet(worktree);
  if (related.error) {
    record(1, "the gates", "CANNOT MEASURE", related.error);
    out.exit = EXIT_RED;
    if (opts.json) console.log(JSON.stringify(out, null, 2));
    return process.exit(EXIT_RED);
  }
  out.related_set = related.set;
  if (opts.dryRun) {
    // The set's NAMES are deliberately not printed on this line. A dry run's first line must not
    // mention sending anything to the remote — step 2 can still stop the run with `claim-lost` and
    // nothing sent — and a test basename is not under this script's control (one of them is
    // `agt-525-tail-push.test.mjs`). The count is the part a reader acts on; `--json` carries the set.
    record(1, "the gates", "named (--dry-run)",
      `node tests/regression/run-all.js --only=<the related set: ${related.set ? related.set.split(",").length : 0} tests> then npm run build`);
  } else {
    const suite = spawnSync("node", ["tests/regression/run-all.js", `--only=${related.set}`],
      { cwd: worktree, encoding: "utf8" });
    const suiteOut = `${suite.stdout ?? ""}${suite.stderr ?? ""}`;
    const summaryLine = (suiteOut.match(/^.*\b\d+\s*\/\s*\d+\b.*$/m) ?? [""])[0].trim();
    out.regression_summary = summaryLine;
    if (suite.status !== 0) {
      record(1, "the gates", "RED (related suite)", summaryLine || `run-all.js exited ${suite.status}`);
      out.exit = EXIT_RED;
      if (opts.json) console.log(JSON.stringify(out, null, 2));
      return process.exit(EXIT_RED);
    }
    const build = spawnSync("npm", ["run", "build"], { cwd: worktree, encoding: "utf8" });
    out.build = build.status === 0 ? "exit 0" : `exit ${build.status}`;
    if (build.status !== 0) {
      record(1, "the gates", "RED (npm run build)", String(build.stderr ?? "").trim().slice(-800));
      out.exit = EXIT_RED;
      if (opts.json) console.log(JSON.stringify(out, null, 2));
      return process.exit(EXIT_RED);
    }
    record(1, "the gates", "green", `${summaryLine} · npm run build exit 0`);
  }

  // --- 2. re-assert the claim — BEFORE anything irreversible ------------------------------------
  // Register B42. A read with the holder guard in the filter: a row comes back only while this
  // session still holds the claim, so 0 rows IS `claim-lost`.
  const held = await reassertClaim(opts.ticket, opts.name);
  out.reassert = { held: held.held, rows: held.rows };
  if (!held.held) {
    out.reassert.claimed_by = held.claimed_by ?? null;
    out.reassert.claimed_at = held.claimed_at ?? null;
    record(2, "re-assert the claim", "claim-lost",
      `0 rows for claimed_by='${opts.name}' — claimed_by=${held.claimed_by ?? "(none)"} claimed_at=${held.claimed_at ?? "(none)"}`);
    console.error(`${WHO}: claim-lost — ${opts.ticket} is no longer claimed by '${opts.name}'. `
      + `claimed_by=${held.claimed_by ?? "(none)"} claimed_at=${held.claimed_at ?? "(none)"}. `
      + "Nothing was sent to the remote. Re-claim the ticket, or hand the work to whoever holds it.");
    out.exit = EXIT_CANNOT_CLOSE;
    out.reason = "claim-lost";
    if (opts.json) console.log(JSON.stringify(out, null, 2));
    return process.exit(EXIT_CANNOT_CLOSE);
  }
  record(2, "re-assert the claim", "still this session's", `1 row, claimed_at ${held.claimed_at}`);

  // --- 3. the inflight marker -------------------------------------------------------------------
  // Deleted in the close-out commit — it is this session's job to remove it, not the next session's
  // to notice it is stale.
  const inflightAbs = path.join(worktree, inflightRel);
  if (opts.dryRun) {
    record(3, "delete the inflight marker", "named (--dry-run)", `${inflightRel}${fs.existsSync(inflightAbs) ? "" : " (not present)"}`);
  } else if (fs.existsSync(inflightAbs)) {
    fs.rmSync(inflightAbs);
    try { git(worktree, ["add", inflightRel]); } catch { /* staged by the close-out commit instead */ }
    record(3, "delete the inflight marker", "deleted and staged", inflightRel);
  } else {
    record(3, "delete the inflight marker", "nothing to delete", `${inflightRel} is not present`);
  }

  // --- 4. fetch, rebase, push HEAD:dev ----------------------------------------------------------
  // `HEAD:dev`, never bare `git push origin dev` (CLAUDE.md hard rule): worktrees share one set of
  // local refs, so a bare `dev` refspec resolves to whichever local branch is named `dev` — the
  // shared checkout's, deliberately never kept current — and not this worktree's HEAD.
  if (opts.dryRun) {
    record(4, "fetch, rebase, send HEAD:dev", "named (--dry-run)",
      "git fetch origin dev; git rebase origin/dev; git push origin HEAD:dev");
  } else {
    try {
      git(worktree, ["fetch", "origin", "dev"]);
      git(worktree, ["rebase", "origin/dev"]);
      git(worktree, ["push", "origin", "HEAD:dev"]);
      out.push_sha = git(worktree, ["rev-parse", "HEAD"]).trim();
      record(4, "fetch, rebase, send HEAD:dev", "landed", out.push_sha);
    } catch (e) {
      record(4, "fetch, rebase, send HEAD:dev", "REFUSED", String(e.stderr ?? e.message).trim().slice(-800));
      console.error(`${WHO}: the remote refused. If it is a non-fast-forward, another concurrent session `
        + "merged first: re-fetch, re-rebase, retry once. The claim is still this session's and is NOT released.");
      out.exit = EXIT_RED;
      if (opts.json) console.log(JSON.stringify(out, null, 2));
      return process.exit(EXIT_RED);
    }
  }

  // --- 5. the queue recompute -------------------------------------------------------------------
  // Register B4: the board's queue numbers are materialized, and completed/removed/new-ticket are
  // recompute events. One idempotent call; a board that did not move changes 0 rows.
  if (opts.dryRun) {
    record(5, "recompute the backlog queue", "named (--dry-run)", "SELECT public.recompute_backlog_queue();");
  } else {
    const rq = await recomputeBacklogQueue();
    out.recompute = { ok: rq.ok, status: rq.status };
    record(5, "recompute the backlog queue", rq.ok ? "done" : `REFUSED (${rq.status})`, "SELECT public.recompute_backlog_queue();");
  }

  // --- 6. the one guarded release, AFTER the push -----------------------------------------------
  // The holder guard is the point: a session can never clear a claim that has since moved. No
  // `updated_at` (SES-316) — a release is the claim's mirror image, so it is coordination too, and a
  // release that stamped `updated_at` would make the decision this session just recorded
  // un-restorable one statement after the push.
  if (opts.dryRun) {
    record(6, "release the claim", "named (--dry-run)",
      `UPDATE public.backlog_items SET claimed_by = NULL, claimed_at = NULL WHERE backlog_id = '${opts.ticket}' AND claimed_by = '${opts.name}';`);
  } else {
    const rel = await releaseClaim(opts.ticket, opts.name);
    out.release = { released: rel.released, rows: rel.rows };
    record(6, "release the claim", rel.released ? "released" : `NOT released (${rel.rows} rows)`,
      rel.released ? "one guarded UPDATE, after the push" : "the guard held: the claim had already moved");
  }

  // Then the worktree, handed over rather than run — see the header for why.
  out.worktree_removal = [
    `git -C "${repo}" worktree remove "${path.posix.join(".claude", "worktrees", opts.name)}"`,
    `git -C "${repo}" branch -D "session/${opts.name}"`,
  ];
  const summary = `${WHO}: ${opts.dryRun ? "planned" : "closed"} ${opts.name} on ${opts.ticket} — `
    + `6 steps${out.push_sha ? `, HEAD:dev at ${out.push_sha}` : ""}, claim `
    + `${out.release?.released ? "released after the push" : opts.dryRun ? "release named, not made" : "NOT released"}`;
  out.summary = summary;
  out.exit = EXIT_OK;

  if (opts.json) {
    console.log(JSON.stringify(out, null, 2));
  } else {
    console.log(`\nthen remove the worktree, from the shared checkout:`);
    for (const c of out.worktree_removal) console.log(`  ${c}`);
    console.log(summary);
  }
  return process.exit(EXIT_OK);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  await main();
}

export { main, EXIT_OK, EXIT_RED, EXIT_CANNOT_CLOSE };
