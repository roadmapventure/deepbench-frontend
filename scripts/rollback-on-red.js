#!/usr/bin/env node
// DeepBench v7.0.332 | scripts/rollback-on-red.js | SES-182 slice 1
// FEATURE: SES-182 -- auto-rollback on red. Slice 1 of the kickoff v7.0.324 design: record the
// rolling "last green state", and on an attributable CI red decide between reverting a CODE-ONLY
// range and carding everything else. John authorised the build 2026-08-30 (card 2c136c5b, Q2
// "BUILD NOW"); Q1 is settled and enforced here -- see THE VERIFIER IS NOT A TRIGGER below.
//
// -- WHAT THIS SCRIPT IS, AND THE TWO THINGS IT DELIBERATELY IS NOT ------------------------
// It is a DECISION ENGINE plus a ledger writer. It is not a daemon (the runner's own blocker
// sweeps at runbook steps 4 and 8 invoke it, so the cadence is cycle cadence), and it is NOT a
// pusher.
//
// IT NEVER RUNS git AND NEVER PUSHES, and that is a named deviation from the kickoff's wording
// rather than a gap. The kickoff says the actuator performs revert-forward; the push in this
// platform is gated by machinery that lives in the CYCLE, not in a script -- the ticket-claim
// re-assertion (runbook step 0), the issued-version proof (SES-153) and the fetch/rebase/retry
// ladder (B42). A script with independent push authority would route around all three, which is
// the SES-019 shape (never reach the same effect through a path the gate does not watch). So the
// engine emits `revert_plan` -- the exact sha range and command -- and the cycle executes it
// through the push gates it already passes. Same boundary heal-engine.js and tripwire-to-backlog.js
// keep, and the same reason ids are passed IN to those: the script never mints its own authority.
//
// THE CI CONCLUSION IS PASSED IN, never fetched. Measured at this ship: `public.runner_secrets`
// holds ANTHROPIC_API_KEY, SCRATCH_SUPABASE_SERVICE_KEY, SUPABASE_SERVICE_KEY, SUPABASE_URL,
// VERCEL_AUTOMATION_BYPASS_SECRET and VERCEL_TOKEN -- and no GitHub credential of any kind. The
// cycle reads CI through its own GitHub tooling and hands the conclusion here. A script that
// invented a credential path would be the only thing in the platform holding one.
//
// -- THE VERIFIER IS NOT A TRIGGER (John, 2026-08-30, card 2c136c5b, Q1) -------------------
// His ruling, recorded verbatim on the card: auto-revert triggers on CI-red and deploy-red ONLY
// (facts); a verifier BLOCK freezes the ship and cards him (judgment). His reason is a
// measurement, not a preference -- the lane's first 15 recorded blocks were all false (SES-213),
// so revert power waits for an earned track record, which is M6's graduation subject. THE EDIT
// THIS SHIP FORBIDS: adding a verdict/block trigger to decide(). `verifier` is rejected by
// TRIGGER_SOURCES with that reason named, and the guard pins it.
//
// -- WHY THE WATERMARK, AND NOT A COMMIT-MESSAGE SCAN -------------------------------------
// "Is there a migration in this range?" cannot be answered from the diff: migrations in this
// platform exist only in the database -- the repo has no .sql files -- so a file-based test would
// report EVERY range code-only, which is the one direction that must never be wrong (it would
// auto-revert a schema change believing it was text). A commit-message scan is no better: it
// trusts prose a cycle wrote about itself.
//
// The green pointer therefore stores `migration_watermark` -- the latest applied migration version
// at green time -- and the test is whether it MOVED. That is a fact read from the database on both
// sides, it needs no down-capture ledger (which is slice 2), and it fails closed by construction:
// an unknown watermark on either side is treated exactly as a moved one.
//
// -- FAIL DIRECTIONS, each chosen so the wrong answer is recoverable ------------------------
//   green run                    -> record the pointer. A sweep that cannot read CI records
//                                   nothing, so the pointer goes STALE, never wrong.
//   red, not attributable to an  -> NO ACTION AT ALL. An attended push, or a sha no cycle claims,
//   unattended cycle                is not this machine's to undo. The machine yields to humans.
//   red, no green anchor         -> card only. There is nothing to roll back TO.
//   red, watermark moved/unknown -> card only, reason named. An un-rolled-back migration plus a
//                                   loud card is recoverable; a wrong down applied to production
//                                   is not.
//   red, code-only, attributable -> revert plan + card. The one automatic path.
//
// -- NAMED DEFERRALS (slice 2/3, and they are deferrals rather than omissions) --------------
//   * DOWN CAPTURE at apply time (`runner_migration_downs` ships as SCHEMA ONLY here) and
//     migration-range rollback.
//   * DEPLOY-SERVING-RED as a second trigger. John's Q1 answer names it a valid trigger; the
//     deploy probe is a different read (the Vercel bypass header, runbook step 4) and it earns
//     its own slice. TRIGGER_SOURCES admits it as a value NOW so the vocabulary cannot drift,
//     and decide() treats it exactly like ci-red once a caller passes it.
//   * DATA RESTORE. The kickoff's slice-1 line reads "revert-forward + before-image restore +
//     card". This engine REPORTS the before-images in the reverted range on the card -- count and
//     tables -- and does not replay them. Replaying rows needs per-table pk resolution and an
//     insert/update/delete discrimination that a wrong guess writes into production; it is a
//     slice with its own QA, not a bullet inside this one. Stated on the card rather than left to
//     be discovered.

import crypto from "crypto";
import { pathToFileURL } from "url";

// The kinds of evidence that may fire a rollback. `verifier` is deliberately ABSENT -- see the
// header. Kept as data rather than an if-chain so the guard can assert the set itself.
export const TRIGGER_SOURCES = ["ci-red", "deploy-red"];

// verifier.js's fail-closed rule, applied one storey out: `skipped` is not `green`. A run is green
// only if every job it reports actually concluded success.
export const GREEN_CONCLUSION = "success";

export const GREEN_STATE_RETENTION = 50;

export const ACTIONS = {
  RECORD_GREEN: "record-green",
  REVERT_AND_CARD: "revert-and-card",
  CARD_ONLY: "card-only",
  NONE: "none",
};

// ---------------------------------------------------------------------------
// Pure half -- facts in, a decision out. No network, no disk, no process.exit,
// so every clause below is testable without a live run.
// ---------------------------------------------------------------------------

// Green iff there is at least one job AND every job concluded success. The empty run is NOT green:
// "nothing reported" is the shape a cancelled or still-queued run has, and reading it as green is
// how a pointer gets set to a commit CI never graded.
export function isRunGreen(jobs) {
  if (!Array.isArray(jobs) || jobs.length === 0) return false;
  return jobs.every((j) => (j?.conclusion ?? null) === GREEN_CONCLUSION);
}

// A range is code-only iff the migration watermark is KNOWN on both sides and unchanged. Any
// unknown is treated as moved -- unknown is not innocent (verifier.js's own phrasing for a diff
// git cannot read).
export function rangeIsCodeOnly(greenWatermark, currentWatermark) {
  if (greenWatermark === null || greenWatermark === undefined || greenWatermark === "") return false;
  if (currentWatermark === null || currentWatermark === undefined || currentWatermark === "") return false;
  return String(greenWatermark) === String(currentWatermark);
}

// Attribution is positive-only: a sha is this machine's to undo iff a runner_cycles row claims it
// as its own push. An attended session's push and a sha nobody claims are the SAME answer here --
// not mine -- and that is deliberate. Slice 1 cannot tell them apart, and the kickoff's own
// negative control ("an unattributable red produces no action") wants the fail-closed reading.
export function attributionOf(headSha, cycles) {
  if (!headSha || !Array.isArray(cycles)) return null;
  const head = String(headSha);
  const hit = cycles.find((c) => {
    const sha = c?.push_sha ? String(c.push_sha) : "";
    if (!sha) return false;
    return sha === head || head.startsWith(sha) || sha.startsWith(head);
  });
  return hit ? { cycleId: hit.id ?? null, version: hit.version ?? null, sha: hit.push_sha } : null;
}

// The whole rule, in one place, returning a named reason for every branch. A branch that returned
// a bare action would put the "why" on the card's author instead of in the engine, which is how
// two homes for one rule start.
export function decide(facts = {}) {
  const {
    trigger = "ci-red",
    jobs = [],
    headSha = null,
    greenAnchor = null,
    currentWatermark = null,
    cycles = [],
  } = facts;

  if (!TRIGGER_SOURCES.includes(trigger)) {
    return {
      action: ACTIONS.NONE,
      reason:
        `trigger '${trigger}' is not a rollback trigger (admitted: ${TRIGGER_SOURCES.join(", ")}). ` +
        `A verifier block freezes the ship and cards John -- it never auto-reverts (John, 2026-08-30, Q1).`,
    };
  }

  if (isRunGreen(jobs)) {
    return {
      action: ACTIONS.RECORD_GREEN,
      reason: `all ${jobs.length} blocking job(s) concluded ${GREEN_CONCLUSION} -- this commit becomes the green anchor.`,
    };
  }

  const failed = jobs
    .filter((j) => (j?.conclusion ?? null) !== GREEN_CONCLUSION)
    .map((j) => `${j?.name ?? "(unnamed job)"}=${j?.conclusion ?? "no conclusion"}`);
  const redDetail = jobs.length === 0 ? "the run reported no jobs" : failed.join(", ");

  const attribution = attributionOf(headSha, cycles);
  if (!attribution) {
    return {
      action: ACTIONS.NONE,
      reason:
        `${trigger} (${redDetail}) but ${headSha ? `sha ${headSha}` : "the head sha"} is not claimed by any ` +
        `runner cycle -- an attended push or an unattributable one is not this machine's to undo.`,
      redDetail,
    };
  }

  if (!greenAnchor || !greenAnchor.commit_sha) {
    return {
      action: ACTIONS.CARD_ONLY,
      reason: `${trigger} (${redDetail}) on unattended push ${headSha}, but no green state has ever been recorded -- there is nothing to roll back to.`,
      attribution,
      redDetail,
    };
  }

  if (!rangeIsCodeOnly(greenAnchor.migration_watermark, currentWatermark)) {
    return {
      action: ACTIONS.CARD_ONLY,
      reason:
        `${trigger} (${redDetail}) on unattended push ${headSha}. The migration watermark ` +
        `${describeWatermark(greenAnchor.migration_watermark)} -> ${describeWatermark(currentWatermark)}, ` +
        `so the range is not code-only: NO automatic schema action is taken and no revert is planned. ` +
        `Down capture is slice 2.`,
      attribution,
      greenAnchor,
      redDetail,
    };
  }

  return {
    action: ACTIONS.REVERT_AND_CARD,
    reason:
      `${trigger} (${redDetail}) on unattended push ${headSha}; the migration watermark is unchanged at ` +
      `${describeWatermark(currentWatermark)}, so the range is code-only and reversible by revert-forward.`,
    attribution,
    greenAnchor,
    redDetail,
    revertPlan: revertPlanFor(greenAnchor.commit_sha, headSha),
  };
}

function describeWatermark(w) {
  return w === null || w === undefined || w === "" ? "(unknown)" : String(w);
}

// Revert-forward, never history rewrite: a new commit that undoes the range, so every existing
// checkout stays valid. The cycle runs this behind its own push gates.
export function revertPlanFor(greenSha, headSha) {
  return {
    from: greenSha,
    to: headSha,
    strategy: "revert-forward",
    command: `git revert --no-edit --no-commit ${greenSha}..${headSha} && git commit -m "revert to green ${greenSha}"`,
  };
}

// The incident card. It is filed as `gated_before_build` and that is a DECISION, not a fudge --
// see the kickoff's "the collision the design did not settle". runner_items_kind_check admits
// exactly 'ship' and 'gated_before_build' (read from pg_get_constraintdef at this ship), and
// build-briefing.mjs renders §5 from `ship`/`test` and §6 from `gated_before_build` and NOTHING
// else -- so a new `incident` kind would file a card that renders on no surface John reads, which
// is the one outcome an incident card must never have. §6 already asks the two questions this card
// asks: Accept = the rollback was right, Reverse = put it back.
//
// backlog_id stays NULL and the human reference goes in display_ref -- SES-116: backlog_id is a
// JOIN KEY and composing a reference into it silently broke 63 of 80 card->ticket joins.
export function buildIncidentCard(decision, ctx = {}) {
  const { cycleId = null, headSha = null, beforeImages = [], trigger = "ci-red" } = ctx;
  const reverted = decision.action === ACTIONS.REVERT_AND_CARD;
  const shortSha = headSha ? String(headSha).slice(0, 7) : "(unknown sha)";

  const imageTables = [...new Set(beforeImages.map((i) => i.table_name))].sort();
  const dataRecord =
    beforeImages.length === 0
      ? "No before-images were written in the reverted range, so no data was changed by it."
      : `${beforeImages.length} before-image(s) across ${imageTables.length} table(s) (${imageTables.join(", ")}) ` +
        `were written in this range. They are REPORTED, not replayed -- data restore is a named slice-2 deferral.`;

  return {
    kind: "gated_before_build",
    backlog_id: null,
    display_ref: `SES-182 incident - ${trigger} on ${shortSha}`,
    cycle_id: cycleId,
    title: reverted
      ? `Auto-rollback: ${trigger} on ${shortSha} was reverted to the last green state`
      : `Auto-rollback held: ${trigger} on ${shortSha} was NOT reverted, and here is exactly why`,
    value_case: decision.reason,
    before_after: reverted
      ? `Before: dev served ${shortSha}, red. After: dev is back at green ${String(decision.greenAnchor?.commit_sha ?? "").slice(0, 7)} by revert-forward (no history rewrite).`
      : `Before and after: dev still serves ${shortSha}. Nothing was reverted -- the reason above names why, and this card is the whole of the action taken.`,
    qa_evidence: [
      `Trigger: ${trigger}. Red detail: ${decision.redDetail ?? "(none recorded)"}.`,
      `Attribution: cycle ${decision.attribution?.cycleId ?? "(none)"}${decision.attribution?.version ? ` (${decision.attribution.version})` : ""}.`,
      `Green anchor: ${decision.greenAnchor?.commit_sha ?? "(none recorded)"}${decision.greenAnchor?.migration_watermark ? ` @ watermark ${decision.greenAnchor.migration_watermark}` : ""}.`,
      dataRecord,
      reverted ? `Revert plan: ${decision.revertPlan?.command}` : "Revert plan: none -- see the reason.",
    ].join("\n"),
    plain_cant: reverted
      ? "A push of mine went red on dev and stayed red until you noticed it."
      : "A push of mine went red on dev and I could not safely undo it on my own.",
    plain_after: reverted
      ? "I put dev back to the last state that passed, and this card is me telling you I did."
      : "I left dev exactly as it is and brought you the evidence instead of guessing.",
    plain_worth: "Accept if the call was right. Reverse puts the change back and undoes my rollback.",
  };
}

export function signatureOf(trigger, headSha) {
  return crypto.createHash("sha256").update(`rollback|${trigger}|${headSha}`).digest("hex").slice(0, 12);
}

// ---------------------------------------------------------------------------
// Supabase REST -- the impure half
// ---------------------------------------------------------------------------

function restHeaders(key, extra = {}) {
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}

async function rest(base, key, path, init = {}) {
  let res;
  try {
    res = await fetch(`${base}/rest/v1/${path}`, { ...init, headers: restHeaders(key, init.headers ?? {}) });
  } catch (e) {
    return { error: e.message };
  }
  if (!res.ok) {
    let body = "";
    try { body = await res.text(); } catch { /* best effort */ }
    return { error: `HTTP ${res.status}: ${body}` };
  }
  if (init.method && init.method !== "GET" && !(init.headers?.Prefer ?? "").includes("return=representation")) {
    return { rows: [] };
  }
  try {
    return { rows: await res.json() };
  } catch (e) {
    return { error: `unparseable JSON: ${e.message}` };
  }
}

export async function readGreenAnchor(base, key) {
  const r = await rest(base, key, "runner_green_states?select=commit_sha,migration_watermark,observed_at,version&order=observed_at.desc&limit=1");
  if (r.error) return { error: `could not read the green anchor: ${r.error}` };
  return { anchor: r.rows[0] ?? null };
}

export async function readPushingCycles(base, key) {
  const r = await rest(base, key, "runner_cycles?select=id,push_sha,version&push_sha=not.is.null&order=started_at.desc&limit=200");
  if (r.error) return { error: `could not read pushing cycles: ${r.error}` };
  return { cycles: r.rows };
}

export async function readBeforeImages(base, key, cycleId) {
  if (!cycleId) return { images: [] };
  const r = await rest(base, key, `runner_before_images?select=table_name,pk_value&cycle_id=eq.${encodeURIComponent(cycleId)}`);
  if (r.error) return { error: `could not read before-images: ${r.error}` };
  return { images: r.rows };
}

// §19v: no before-image logged -> the write does not happen. row_data = NULL encodes "this row did
// not exist before", so a Reverse of a filing is a DELETE of that pk -- the INSERT convention
// SES-89 introduced and runbook step 8b writes down.
async function insertBeforeImage(base, key, cycleId, tableName, pkValue) {
  const r = await rest(base, key, "runner_before_images", {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ cycle_id: cycleId, table_name: tableName, pk_value: pkValue, row_data: null }),
  });
  return r.error ? { error: `before-image insert failed: ${r.error}` } : { ok: true };
}

export async function recordGreenState(base, key, row) {
  const img = await insertBeforeImage(base, key, row.observed_by_cycle, "runner_green_states", row.commit_sha);
  if (img.error) return img;
  const r = await rest(base, key, "runner_green_states?on_conflict=commit_sha", {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(row),
  });
  return r.error ? { error: `green state upsert failed: ${r.error}` } : { ok: true, row: r.rows[0] ?? null };
}

export async function fileIncidentCard(base, key, card) {
  const img = await insertBeforeImage(base, key, card.cycle_id, "runner_items", card.display_ref);
  if (img.error) return img;
  const r = await rest(base, key, "runner_items", {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(card),
  });
  return r.error ? { error: `incident card insert failed: ${r.error}` } : { ok: true, id: r.rows[0]?.id ?? null };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const ARGV = process.argv.slice(2);
const JSON_OUT = ARGV.includes("--json");
const APPLY = ARGV.includes("--apply");

function argValue(name, fallback) {
  const hit = ARGV.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function fail(code, message) {
  if (JSON_OUT) console.log(JSON.stringify({ ok: false, exitCode: code, error: message }));
  else console.error(message);
  process.exit(code);
}

function finish(code, payload, prose) {
  if (JSON_OUT) console.log(JSON.stringify({ ok: true, exitCode: code, ...payload }));
  else console.log(prose);
  process.exit(code);
}

async function main() {
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!base || !key) fail(2, "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (exit 2 = could not run, never a pass).");

  const trigger = argValue("trigger", "ci-red");
  const headSha = argValue("sha", null);
  const cycleId = argValue("cycle-id", null);
  const runId = argValue("run-id", null);
  const version = argValue("version", null);
  const currentWatermark = argValue("watermark", null);
  const jobsRaw = argValue("jobs", null);

  if (!headSha) fail(2, "--sha=<head sha> is required.");
  let jobs;
  try {
    jobs = jobsRaw ? JSON.parse(jobsRaw) : [];
  } catch (e) {
    fail(2, `--jobs must be a JSON array of {name, conclusion}: ${e.message}`);
  }

  const anchorRes = await readGreenAnchor(base, key);
  if (anchorRes.error) fail(2, anchorRes.error);
  const cyclesRes = await readPushingCycles(base, key);
  if (cyclesRes.error) fail(2, cyclesRes.error);

  const decision = decide({
    trigger,
    jobs,
    headSha,
    greenAnchor: anchorRes.anchor,
    currentWatermark,
    cycles: cyclesRes.cycles,
  });

  if (!APPLY) {
    finish(0, { decision, applied: false }, `${decision.action}: ${decision.reason}\n(dry run -- pass --apply to write)`);
  }
  if (!cycleId) fail(2, "--cycle-id is required with --apply (it stamps every before-image).");

  if (decision.action === ACTIONS.RECORD_GREEN) {
    const res = await recordGreenState(base, key, {
      commit_sha: headSha,
      ci_run_id: runId,
      migration_watermark: currentWatermark,
      version,
      observed_by_cycle: cycleId,
    });
    if (res.error) fail(2, res.error);
    finish(0, { decision, applied: true }, `${decision.action}: ${decision.reason}`);
  }

  if (decision.action === ACTIONS.NONE) {
    finish(0, { decision, applied: false }, `${decision.action}: ${decision.reason}`);
  }

  const imgRes = await readBeforeImages(base, key, decision.attribution?.cycleId ?? null);
  if (imgRes.error) fail(2, imgRes.error);

  const card = buildIncidentCard(decision, {
    cycleId,
    headSha,
    beforeImages: imgRes.images,
    trigger,
  });
  const filed = await fileIncidentCard(base, key, card);
  if (filed.error) fail(2, filed.error);

  finish(
    0,
    { decision, applied: true, cardId: filed.id, revertPlan: decision.revertPlan ?? null },
    `${decision.action}: ${decision.reason}\ncard ${filed.id}` +
      (decision.revertPlan ? `\nrun this behind the cycle's push gates:\n  ${decision.revertPlan.command}` : "")
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((e) => fail(2, `rollback-on-red crashed: ${e.stack ?? e.message}`));
}
