#!/usr/bin/env node
// DeepBench v7.0.108 | scripts/heal-engine.js | SES-89
// FEATURE: SES-89 -- the Heal engine (ARCHITECTURE.md §19v's third engine). Reads the platform's
// own failure ledger, groups failures into recurring signatures, and auto-files evidenced
// `P9 - Bug Fixes` backlog tickets that then ride the normal queue.
//
// DETECTION NEVER AUTO-FIXES. This script performs exactly one kind of write -- an INSERT into
// public.backlog_items, each one preceded by its before-image row -- and never an UPDATE, a
// DELETE, or any DDL. The fix for anything it files runs the full session ceremony in a later
// cycle, like any other backlog ticket.
//
// -- Why durable_hops and not ai_activity_log ------------------------------------------------
// The SES-89 ticket text says to read "ai_activity_log error rates and anomalies". Verified live
// 2026-08-20 against the real table: `ai_activity_log` has 34,449 rows and 28 columns, and NONE
// of them is a status/error/success field. The only error-adjacent data in it is
// `call_facts.http_status`, which appears on 28 rows ever, 5 of them non-200 (all
// `article-extraction`, all late July). There is no error rate in there to read.
//
// The platform's real error ledger is `public.durable_hops`: 260 rows with status='failed', all
// 260 carrying non-null, mechanically classifiable error text (vs 1,198 complete / 322
// in_progress, which carry none). That is what v1 reads. The ticket's other three signals were
// dropped for cause, recorded here so a later session does not re-litigate them:
//   * regression trends -- no table persists suite results; the output exists only in session
//     transcripts, so there is nothing to query.
//   * Vercel logs -- no verified access path to runtime logs exists in this repo
//     (check-deploy-current.js reads deployment state, not logs). Inventing one would be a claim
//     without a source.
//   * stale in_progress hops -- checkpoint/resume semantics make "stuck" versus "legitimately
//     parked" a judgment call, and v1 should not automate a judgment call.
// The `call_facts.http_status` rows are the documented v1.1 extension point: same signature
// pipeline, deliberately not built on a 5-row population.
//
// -- The threshold, and why it is 3-in-14-days ----------------------------------------------
// Measured against all 260 failed hops: 30 distinct signatures -- 16 with >=3 occurrences, 6
// with exactly 2, 8 singletons. At >=3 the 16 real signatures fire and every singleton and
// doubleton stays quiet. At >=2 the noise files. At >=5 the `quality-gate` /
// "operation was aborted due to timeout" signature -- 6 occurrences spread over 6 distinct days,
// a genuine slow-burn defect -- would never file at all. The window is 14 days rather than 7
// because slow-burn signatures accumulate across weeks; idempotency comes from the dedup below,
// never from the window.
//
// -- Dedup: derivable from existing rows, no new table --------------------------------------
// Every ticket this engine files carries the literal line "Heal signature: `<sig_hash>`" in its
// description. Before filing, the engine asks backlog_items for any row with
// source_file='heal-engine' whose description contains that hash, in ANY status. If one exists,
// the signature never files again. The runner fires every 3 hours; without this it would file
// the same defect eight times a day forever.
//
// Known v1 limitation, stated rather than hidden: a signature that was fixed and later recurs
// will NOT re-file, because the dedup matches closed tickets too. That is the right default for
// an unattended loop, and recurrence detection is the natural v1.1 alongside the http_status
// detector.
//
// Usage:
//   node scripts/heal-engine.js [--apply] [--cycle-id=<uuid>] [--backlog-ids=<ids>]
//                               [--window-days=<n>] [--threshold=<n>] [--max-filings=<n>]
//                               [--until=<iso>] [--json]
//
//   --apply           Actually file tickets. Default is a DRY RUN that writes nothing.
//   --cycle-id=<uuid> Required with --apply. The open runner_cycles row every before-image row
//                     is bound to (runner_before_images.cycle_id is a real FK).
//   --backlog-ids=<>  Required with --apply. Comma-separated ids the CYCLE claimed atomically
//                     (e.g. LOO-38,LOO-39). This script never mints an id itself -- see the
//                     "Why this script does NOT claim its own ids" note below.
//   --window-days=<n> Lookback window. Default 14.
//   --threshold=<n>   Occurrences within the window before a signature files. Default 3.
//   --max-filings=<n> Hard cap on tickets filed in one run. Default 3.
//   --until=<iso>     Move the window's END, for QA against historical data. Default now.
//   --json            Single-line machine-readable summary instead of prose.
//
// Exit codes:
//   0  ran cleanly -- nothing new to file, or --apply filed everything it detected
//   1  dry run detected signatures that are over threshold and not yet filed. This is the
//      signal a runner cycle acts on, the same "there is drift" role --check plays in
//      scripts/export-backlog-snapshot.js.
//   2  cannot run -- missing env, a Supabase REST failure, or --apply without a valid
//      --cycle-id. Deliberately distinct from 1: an unrunnable check must never read as a pass,
//      and must not be confused with a real detection either.
//
// Env (read from process.env only -- never hardcoded, never printed):
//   SUPABASE_URL           Project REST base, e.g. https://xxxx.supabase.co
//   SUPABASE_SERVICE_KEY   Service-role key. Required: DAT-18 left anon/authenticated with zero
//                          write privileges on backlog_items, so filing needs the service role.
//
// Pure helpers (normalizeErrorClass, signatureOf, detect, buildTicketDraft) are exported so the
// regression test can exercise the detector with zero network and zero disk access. The
// network/CLI path only runs when this file is executed directly -- see the pathToFileURL guard
// at the bottom.

import crypto from "crypto";
import { pathToFileURL } from "url";

const PAGE_SIZE = 500;
const MAX_PAGES = 200;

const DEFAULT_WINDOW_DAYS = 14;
const DEFAULT_THRESHOLD = 3;
const DEFAULT_MAX_FILINGS = 3;

// The prefix heal tickets are filed under. durable_hops is LOO's documented domain
// (docs/SCREEN-INVENTORY.md: LOO == the agent-to-agent delegation mechanism and its
// checkpoint/resume ledger), so a failure signature read out of that table is a LOO finding.
// An individual root cause may really be HAR-side; each ticket says so, and SES-85's
// classification sweep may rebucket.
const HEAL_PREFIX = "LOO";

// The sentinel that marks a row as machine-filed. It is also what keeps heal rows out of the
// markdown files' (source_file, row_ordinal) space, and what any future markdown->DB
// reconciliation must add to its ignore-list.
const HEAL_SOURCE_FILE = "heal-engine";

const HOP_COLUMNS = ["id", "capability_slug", "status", "error", "created_at"];

// ---------------------------------------------------------------------------
// Pure core -- no network, no disk, no clock beyond what is passed in
// ---------------------------------------------------------------------------

// An error class is the first line of the error text with digit-runs collapsed, so that
// "Anthropic call failed: 529" and "Anthropic call failed: 500" are recognised as one recurring
// defect rather than two singletons. Only the first line, because the tail is usually a stack or
// a payload echo that differs on every occurrence and would shatter the grouping.
export function normalizeErrorClass(errorText) {
  if (typeof errorText !== "string") return "";
  const firstLine = errorText.split("\n")[0].trim();
  return firstLine.replace(/\d+/g, "N").slice(0, 120);
}

export function signatureOf(hop) {
  const capability = hop.capability_slug || "(none)";
  const errorClass = normalizeErrorClass(hop.error);
  const key = `${capability}|${errorClass}`;
  return {
    capability,
    errorClass,
    key,
    hash: crypto.createHash("sha256").update(key).digest("hex").slice(0, 12),
  };
}

// Groups failed hops into signatures, drops everything under threshold, drops everything already
// filed, and returns the survivors newest-pain-first (highest count wins; ties broken by most
// recent occurrence, so a fresh regression outranks an equally-sized stale one).
//
// `existingDescriptions` is the list of description strings from already-filed heal tickets;
// membership is tested by substring on the sig hash, which is exactly what the SQL dedup does.
export function detect(failedHops, existingDescriptions, opts = {}) {
  const threshold = opts.threshold ?? DEFAULT_THRESHOLD;
  const windowStart = opts.windowStart instanceof Date ? opts.windowStart : null;
  const windowEnd = opts.windowEnd instanceof Date ? opts.windowEnd : null;

  const groups = new Map();

  for (const hop of failedHops) {
    if (hop.status !== "failed") continue;
    if (!hop.error) continue;

    const at = new Date(hop.created_at);
    if (Number.isNaN(at.getTime())) continue;
    if (windowStart && at < windowStart) continue;
    if (windowEnd && at > windowEnd) continue;

    const sig = signatureOf(hop);
    let group = groups.get(sig.key);
    if (!group) {
      group = {
        capability: sig.capability,
        errorClass: sig.errorClass,
        sigHash: sig.hash,
        count: 0,
        firstSeen: at,
        lastSeen: at,
        samples: [],
      };
      groups.set(sig.key, group);
    }

    group.count += 1;
    if (at < group.firstSeen) group.firstSeen = at;
    if (at > group.lastSeen) group.lastSeen = at;
    // Keep up to 3 real hop ids as evidence. §19d: every claim traces to a row.
    if (group.samples.length < 3) {
      group.samples.push({ id: hop.id, at: hop.created_at, error: hop.error });
    }
  }

  const alreadyFiled = [];
  const detections = [];

  for (const group of groups.values()) {
    if (group.count < threshold) continue;
    const filed = existingDescriptions.some((d) => typeof d === "string" && d.includes(group.sigHash));
    if (filed) {
      alreadyFiled.push(group);
      continue;
    }
    detections.push(group);
  }

  detections.sort((a, b) => b.count - a.count || b.lastSeen - a.lastSeen);

  return { detections, alreadyFiled, signaturesSeen: groups.size };
}

function excerpt(text, max = 300) {
  const oneLine = String(text ?? "").replace(/\s+/g, " ").trim();
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}

// Builds the exact row that will be inserted. Kept pure so the regression test can assert the
// evidence block's shape -- particularly that the sig hash and at least one real hop id are
// present, which is what makes the ticket traceable and the dedup work.
export function buildTicketDraft(group, backlogId, opts = {}) {
  const windowDays = opts.windowDays ?? DEFAULT_WINDOW_DAYS;
  const threshold = opts.threshold ?? DEFAULT_THRESHOLD;
  const windowStart = opts.windowStart ? opts.windowStart.toISOString() : "(unbounded)";
  const windowEnd = opts.windowEnd ? opts.windowEnd.toISOString() : "(now)";

  const shortClass = group.errorClass.length > 60
    ? `${group.errorClass.slice(0, 60)}…`
    : group.errorClass;

  const title = `[Heal] ${group.capability}: ${shortClass} (${group.count}× in ${windowDays}d)`;

  const sampleLines = group.samples
    .map((s) => `  - \`${s.id}\` @ ${s.at} — ${excerpt(s.error)}`)
    .join("\n");

  const description = [
    `**P9 - Bug Fixes.** **Auto-filed by the Heal engine (\`SES-89\`) — not yet triaged by a human.**`,
    ``,
    `A recurring failure signature crossed the filing threshold in \`public.durable_hops\`.`,
    ``,
    `Heal signature: \`${group.sigHash}\``,
    `Capability: \`${group.capability}\``,
    `Error class: \`${group.errorClass}\``,
    `Occurrences: **${group.count}** (threshold ${threshold} within a ${windowDays}-day window)`,
    `Window: ${windowStart} → ${windowEnd}`,
    `First seen in window: ${group.firstSeen.toISOString()}`,
    `Last seen in window: ${group.lastSeen.toISOString()}`,
    ``,
    `Evidence — real \`durable_hops\` rows:`,
    sampleLines,
    ``,
    `Reproduce:`,
    "```sql",
    `select id, capability_slug, created_at, error`,
    `from public.durable_hops`,
    `where status = 'failed'`,
    `  and capability_slug = '${group.capability}'`,
    `  and left(regexp_replace(split_part(error, E'\\n', 1), '[0-9]+', 'N', 'g'), 120) = '${group.errorClass.replace(/'/g, "''")}'`,
    `order by created_at desc;`,
    "```",
    ``,
    `Detection never auto-fixes — this ticket rides the normal queue and the full session ceremony.`,
    `Triage note: classify the failure against the \`failureClass\` contract`,
    `(\`.claude/rules/transient-failure-recovery.md\`) before assuming it is a defect — a transient`,
    `class that already recovered is not the same bug as a permanent one that surfaced.`,
  ].join("\n");

  const ordinal = Number.parseInt(String(backlogId).split("-")[1], 10);

  return {
    backlog_id: backlogId,
    tier: "now",
    type: "Task Success Rate",
    priority_class: "P9 - Bug Fixes",
    title,
    description,
    // 'missing' is the only open status the live CHECK constraint allows
    // (done/partial/missing). Register B6's filed/queued lifecycle vocabulary is not live yet;
    // widening the constraint here would preempt SES-83 (d)/(e)'s gated design.
    status: "missing",
    source_file: HEAL_SOURCE_FILE,
    row_ordinal: ordinal,
    session_ref: `S-${backlogId} (auto-filed by SES-89 Heal engine)`,
  };
}

// ---------------------------------------------------------------------------
// Supabase REST
// ---------------------------------------------------------------------------

function restHeaders(key, extra = {}) {
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}

async function restGet(base, key, pathAndQuery) {
  let res;
  try {
    res = await fetch(`${base}${pathAndQuery}`, { headers: restHeaders(key) });
  } catch (e) {
    return { error: `could not reach the Supabase REST endpoint: ${e.message}` };
  }
  if (!res.ok) {
    let body = "";
    try {
      body = await res.text();
    } catch {
      // best effort -- an unreadable body is still a failure, just a less descriptive one
    }
    return { error: `Supabase REST returned HTTP ${res.status} ${res.statusText}: ${body}` };
  }
  try {
    const json = await res.json();
    if (!Array.isArray(json)) {
      return { error: "Supabase REST returned a non-array response for a select query" };
    }
    return { rows: json };
  } catch (e) {
    return { error: `Supabase REST returned unparseable JSON: ${e.message}` };
  }
}

// Paginates on a SHORT page, never on a row-count assumption, with a hard ceiling against a
// non-converging offset -- same contract as scripts/export-backlog-snapshot.js. A detector that
// silently sees only the first page would under-count signatures and quietly stop filing.
async function fetchFailedHops(base, key, sinceIso) {
  const cols = HOP_COLUMNS.join(",");
  let all = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const offset = page * PAGE_SIZE;
    const q =
      `/rest/v1/durable_hops?select=${cols}&status=eq.failed&created_at=gte.${encodeURIComponent(sinceIso)}` +
      `&order=created_at.asc&limit=${PAGE_SIZE}&offset=${offset}`;
    const { rows, error } = await restGet(base, key, q);
    if (error) return { error };
    all = all.concat(rows);
    if (rows.length < PAGE_SIZE) return { hops: all };
  }
  return {
    error: `hit the hard page ceiling (${MAX_PAGES} pages) without a short page — refusing to ` +
      `assume durable_hops is fully paginated, since that would silently under-count signatures`,
  };
}

async function fetchHealTicketDescriptions(base, key) {
  let all = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const offset = page * PAGE_SIZE;
    const q =
      `/rest/v1/backlog_items?select=backlog_id,description&source_file=eq.${HEAL_SOURCE_FILE}` +
      `&order=row_ordinal.asc&limit=${PAGE_SIZE}&offset=${offset}`;
    const { rows, error } = await restGet(base, key, q);
    if (error) return { error };
    all = all.concat(rows);
    if (rows.length < PAGE_SIZE) return { tickets: all };
  }
  return { error: `hit the hard page ceiling paginating existing heal tickets` };
}

// -- Why this script does NOT claim its own ids ----------------------------------------------
// CLAUDE.md's atomic-counter hard rule: ids come from ONE call that claims a contiguous block of
// N against public.feature_id_counter -- never read-the-max-and-increment, and never claim one
// id and hand-count the rest (that hand-count is the mechanism behind every recorded ID
// collision in this repo, including one that reached shipped Supabase content).
//
// That claim is an UPDATE ... RETURNING with arithmetic in it, which PostgREST cannot express:
// there is no RPC for it in this project (verified live 2026-08-20 -- public has no
// claim_feature_ids function, and adding one would be a schema change this P10 - Tooling ticket
// has no mandate for). So the engine does not claim ids at all. The runner cycle claims the
// block through the Supabase connector, using the exact SQL in
// .claude/skills/session-setup/SKILL.md §3b, and passes the result in via --backlog-ids.
//
// This keeps the atomic claim in the one place that can do it correctly, and keeps this script
// honest: it never invents an id, and it files at most as many tickets as it was given ids for.
export function parseBacklogIds(raw, prefix = HEAL_PREFIX) {
  if (!raw) return { error: "--apply requires --backlog-ids=<comma-separated ids>" };
  const ids = String(raw)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length === 0) return { error: "--backlog-ids was empty" };
  const bad = ids.filter((id) => !new RegExp(`^${prefix}-\\d+$`).test(id));
  if (bad.length > 0) {
    return { error: `--backlog-ids contains malformed id(s): ${bad.join(", ")} (expected ${prefix}-<number>)` };
  }
  const seen = new Set(ids);
  if (seen.size !== ids.length) return { error: "--backlog-ids contains duplicates" };
  return { ids };
}

// §19v: "No before-image logged -> the write does not happen." The before-image is inserted
// first, and only its success authorises the ticket insert.
//
// row_data = NULL encodes "this row did not exist before" -- so a Reverse of a heal filing is a
// DELETE of that pk, not a restore. Every pre-existing before-image row in this system records
// an UPDATE (non-null row_data); this INSERT convention is introduced by SES-89 and is written
// down in docs/runbooks/runner-cycle.md step 8b rather than left implicit.
async function insertBeforeImage(base, key, cycleId, pkValue) {
  let res;
  try {
    res = await fetch(`${base}/rest/v1/runner_before_images`, {
      method: "POST",
      headers: restHeaders(key, { "Content-Type": "application/json", Prefer: "return=representation" }),
      body: JSON.stringify({
        cycle_id: cycleId,
        table_name: "backlog_items",
        pk_value: pkValue,
        row_data: null,
      }),
    });
  } catch (e) {
    return { error: `could not write the before-image: ${e.message}` };
  }
  if (!res.ok) {
    let body = "";
    try {
      body = await res.text();
    } catch {
      // best effort
    }
    return { error: `before-image insert returned HTTP ${res.status}: ${body}` };
  }
  return { ok: true };
}

async function insertTicket(base, key, row) {
  let res;
  try {
    res = await fetch(`${base}/rest/v1/backlog_items`, {
      method: "POST",
      headers: restHeaders(key, { "Content-Type": "application/json", Prefer: "return=representation" }),
      body: JSON.stringify(row),
    });
  } catch (e) {
    return { error: `could not insert the ticket: ${e.message}` };
  }
  if (!res.ok) {
    let body = "";
    try {
      body = await res.text();
    } catch {
      // best effort
    }
    return { error: `ticket insert returned HTTP ${res.status}: ${body}` };
  }
  return { ok: true };
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
  if (JSON_OUT) {
    console.log(JSON.stringify({ ok: false, exitCode: code, error: message }));
  } else {
    console.error(message);
  }
  process.exit(code);
}

function finish(code, payload, prose) {
  if (JSON_OUT) {
    console.log(JSON.stringify({ ok: true, exitCode: code, ...payload }));
  } else {
    console.log(prose);
  }
  process.exit(code);
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    fail(2, "SUPABASE_URL and SUPABASE_SERVICE_KEY must both be set (exit 2 = could not run, never a pass).");
  }

  const cycleId = argValue("cycle-id", null);
  if (APPLY && !cycleId) {
    fail(2, "--apply requires --cycle-id=<uuid>: every write needs a before-image bound to a real open cycle.");
  }
  if (APPLY && !argValue("backlog-ids", null)) {
    fail(
      2,
      "--apply requires --backlog-ids=<comma-separated ids>: the cycle claims the id block atomically " +
        "through the Supabase connector (session-setup SKILL.md §3b) and passes it in.",
    );
  }

  const windowDays = Number.parseInt(argValue("window-days", String(DEFAULT_WINDOW_DAYS)), 10);
  const threshold = Number.parseInt(argValue("threshold", String(DEFAULT_THRESHOLD)), 10);
  const maxFilings = Number.parseInt(argValue("max-filings", String(DEFAULT_MAX_FILINGS)), 10);
  if (!Number.isFinite(windowDays) || !Number.isFinite(threshold) || !Number.isFinite(maxFilings)) {
    fail(2, "--window-days, --threshold and --max-filings must be integers.");
  }

  const untilRaw = argValue("until", null);
  const windowEnd = untilRaw ? new Date(untilRaw) : new Date();
  if (Number.isNaN(windowEnd.getTime())) {
    fail(2, `--until=${untilRaw} is not a parseable ISO timestamp.`);
  }
  const windowStart = new Date(windowEnd.getTime() - windowDays * 24 * 60 * 60 * 1000);

  const base = supabaseUrl.replace(/\/+$/, "");

  const hopsResult = await fetchFailedHops(base, supabaseKey, windowStart.toISOString());
  if (hopsResult.error) fail(2, hopsResult.error);

  const ticketsResult = await fetchHealTicketDescriptions(base, supabaseKey);
  if (ticketsResult.error) fail(2, ticketsResult.error);

  const existingDescriptions = ticketsResult.tickets.map((t) => t.description);

  const { detections, alreadyFiled, signaturesSeen } = detect(hopsResult.hops, existingDescriptions, {
    threshold,
    windowStart,
    windowEnd,
  });

  const summary = {
    window: { start: windowStart.toISOString(), end: windowEnd.toISOString(), days: windowDays },
    threshold,
    failedHopsInWindow: hopsResult.hops.length,
    signaturesSeen,
    alreadyFiled: alreadyFiled.length,
    detections: detections.map((d) => ({
      sigHash: d.sigHash,
      capability: d.capability,
      errorClass: d.errorClass,
      count: d.count,
      firstSeen: d.firstSeen.toISOString(),
      lastSeen: d.lastSeen.toISOString(),
      sampleHopIds: d.samples.map((s) => s.id),
    })),
  };

  if (detections.length === 0) {
    finish(
      0,
      { ...summary, filed: [] },
      `Heal engine: ${hopsResult.hops.length} failed hops in the last ${windowDays}d, ` +
        `${signaturesSeen} signature(s), ${alreadyFiled.length} already filed, nothing new to file.`,
    );
  }

  if (!APPLY) {
    const lines = detections.map(
      (d) => `  - [${d.sigHash}] ${d.capability}: ${d.errorClass} — ${d.count}× (last ${d.lastSeen.toISOString()})`,
    );
    finish(
      1,
      { ...summary, filed: [] },
      `Heal engine (dry run): ${detections.length} signature(s) over threshold and not yet filed:\n` +
        `${lines.join("\n")}\n` +
        `Re-run with --apply --cycle-id=<uuid> to file them (max ${maxFilings} per run).`,
    );
  }

  const claim = parseBacklogIds(argValue("backlog-ids", null));
  if (claim.error) fail(2, claim.error);

  // File no more than we have ids for. Running out of ids is not an error -- the remainder is
  // reported as deferred, exactly like the --max-filings cap.
  const toFile = detections.slice(0, Math.min(maxFilings, claim.ids.length));

  const filed = [];
  for (let i = 0; i < toFile.length; i++) {
    const group = toFile[i];
    const backlogId = claim.ids[i];
    const draft = buildTicketDraft(group, backlogId, { windowDays, threshold, windowStart, windowEnd });
    const rowId = crypto.randomUUID();

    const bi = await insertBeforeImage(base, supabaseKey, cycleId, rowId);
    if (bi.error) fail(2, `${bi.error} — refusing to file ${backlogId} without its before-image (§19v).`);

    const ins = await insertTicket(base, supabaseKey, { id: rowId, ...draft });
    if (ins.error) fail(2, ins.error);

    filed.push({ backlogId, id: rowId, sigHash: group.sigHash, capability: group.capability, count: group.count });
  }

  const skipped = detections.length - toFile.length;
  finish(
    0,
    { ...summary, filed },
    `Heal engine: filed ${filed.length} ticket(s) — ${filed.map((f) => f.backlogId).join(", ")}.` +
      (skipped > 0 ? ` ${skipped} more over threshold, deferred to the next run by --max-filings.` : ""),
  );
}

// Importing this module must never hit the network or file anything -- the regression test
// imports it for the pure detector. Only direct invocation runs the CLI.
const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  main().catch((e) => fail(2, `unexpected failure: ${e.stack || e.message}`));
}
