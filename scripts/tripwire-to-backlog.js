#!/usr/bin/env node
// DeepBench v7.0.301 | scripts/tripwire-to-backlog.js | SES-205
// FEATURE: SES-205 -- the truth tripwire's findings become `public.backlog_items` rows instead of
// console output nobody re-reads. Third and last piece of the SES-176 remainder (pieces 1 and 2
// shipped as SES-200, v7.0.243).
//
// THE DEFECT, measured live 2026-08-29T01:46Z before a line was written, not recalled:
// `node scripts/check-session-docs.js` prints 33 FLAG and 6 WARN findings to stdout and exits 0,
// in a CI job whose own closing line reads "Report only -- nothing auto-fixed". Nothing in the
// repo or the database persists a finding, so nothing can tell a NEW finding from one printed on
// every run for a week.
//
// FILING IS NOT FIXING. This script performs exactly one kind of write -- an INSERT into
// public.backlog_items, each one preceded by its before-image row -- and never an UPDATE, a
// DELETE, or any DDL. The fix for anything it files runs the full session ceremony in a later
// cycle, like any other backlog ticket. Same boundary heal-engine.js keeps, and this script is
// deliberately built in that engine's shape (detect / dedup / `--apply --cycle-id --backlog-ids`,
// ids passed IN because the script never mints its own) rather than re-deriving one.
//
// -- THE SIGNATURE IS THE CHECK ID, and `detail` is why -------------------------------------
// A finding is {check, severity, detail}. Hashing `detail` is the obvious move and it is wrong,
// measured rather than argued: check 6's detail reads "docs/STANDARDS.md is 52.0 KB, over the
// ~34 KB baseline" -- that figure moves on every ship -- and check 3d's 18 findings differ only
// by which ticket id and char count they name. A detail hash files a NEW ticket on every run,
// which is this ticket's own defect one level down.
//
// Digit-collapsing the detail (heal-engine's normalizeErrorClass) fixes the numbers and not the
// subject: check 3d would still shatter into 18 signatures keyed on 18 ticket ids.
//
// So the signature is `tripwire|check|<id>`, hashed sha256/12 in heal-engine's own format so the
// same substring dedup works unchanged. THE HASH ADDS NO ENTROPY OVER THE CHECK ID and this
// comment says so rather than implying otherwise -- it is a token format inherited so the two
// engines dedup alike, never a derivation. Do not "strengthen" it by folding the detail back in;
// that is the duplicate-per-run failure above, wearing a hash's clothes.
//
// -- AGGREGATION: ONE ROW PER CHECK CLASS, and it is the same decision ----------------------
// The ticket's own worked example is the constraint: "18 of today's 33 FLAGs are check 3d
// over-cap descriptions, one per ticket, so filing them one-for-one would bury the board rather
// than surface it." Within one check every finding shares a rule and a fix shape -- clearing
// check 3d is ONE job (trim descriptions into docs/harvests/), not eighteen. The member list
// lives in the description, so the row stays accurate as members come and go while the signature
// does not move.
//
// There is deliberately NO threshold to tune. heal-engine needs one because a single failed hop
// is noise; a tripwire FLAG is already a rule this platform wrote down and then broke.
//
// -- WHAT NEVER FILES, as two decisions rather than two omissions ---------------------------
//   * WARN never files. Read the live WARNs: check 3c says "these are later-tier rows (compliant,
//     nothing to do)", 3e says "not new drift -- expected until it lands", 14 says "HISTORICAL
//     kickoffs predating this lint -- a migration backlog, not new drift". The tripwire itself
//     classifies them as known and deferred; a ticket each is board noise for decided work.
//   * A GATING check never files. GATING_CHECKS/GATING_SEVERITY are IMPORTED from
//     check-session-docs.js, never copied. A gating FLAG fails CI (`--gate`, exit 1), so it
//     cannot go unnoticed -- and going unnoticed is the entire problem this ticket solves.
//     Because the set is imported, widening SES-199's gating policy widens this exclusion with
//     it, and the two cannot drift.
//
// Known limitation, stated rather than hidden (heal-engine's v1 dedup has the same shape): a
// check that files once never files again, because the dedup matches CLOSED tickets too -- even
// if its member set later turns over completely. That is the right default for an unattended
// loop, and the live member list is always one command away (`node scripts/check-session-docs.js`).
//
// Usage:
//   node scripts/tripwire-to-backlog.js [--apply] [--cycle-id=<uuid>] [--backlog-ids=<ids>]
//                                       [--max-filings=<n>] [--json]
//
//   --apply           Actually file tickets. Default is a DRY RUN that writes nothing.
//   --cycle-id=<uuid> Required with --apply. The open runner_cycles row every before-image row is
//                     bound to (runner_before_images.cycle_id is a real FK).
//   --backlog-ids=<>  Required with --apply. Comma-separated SES- ids the CYCLE claimed as ONE
//                     contiguous feature_id_counter block. This script never mints an id.
//   --max-filings=<n> Hard cap on tickets filed in one run. Default 3.
//   --json            Single-line machine-readable summary instead of prose.
//
// Exit codes:
//   0  ran cleanly -- nothing new to file, or --apply filed everything it detected
//   1  dry run detected eligible check classes that are not yet filed (the runner's signal to
//      claim an id block and re-run with --apply)
//   2  could not run -- missing env, REST failure, or --apply without a cycle id / ids. NEVER a
//      pass: same contract export-backlog-snapshot.js and heal-engine.js keep.

import crypto from "node:crypto";
import { pathToFileURL } from "node:url";

import {
  collectFindings,
  GATING_CHECKS,
  GATING_SEVERITY,
} from "./check-session-docs.js";

export const TRIPWIRE_SOURCE_FILE = "tripwire-to-backlog";
export const TRIPWIRE_PREFIX = "SES";
export const DEFAULT_MAX_FILINGS = 3;

// A check with more members than this is stamped 'M' rather than 'S': eighteen over-cap
// descriptions is not a one-shape one-cycle fix. John's filing rule, directive db84b784.
export const SIZE_S_MAX_MEMBERS = 3;

// ---------------------------------------------------------------------------
// Pure half -- findings in, drafts out. No network, no disk, no process.exit, so
// tests/regression/SES-205-tripwire-backlog.js drives the REAL functions against fixtures.
// ---------------------------------------------------------------------------

// FLAG only, and never a gating check. Both halves are decisions -- see the header.
export function eligibleFindings(findings, opts = {}) {
  const gating = opts.gatingChecks ?? GATING_CHECKS;
  const severity = opts.gatingSeverity ?? GATING_SEVERITY;
  return (findings ?? []).filter((f) => {
    if (!f || f.severity !== "FLAG") return false;
    // The gating exclusion is scoped by severity exactly as SES-199 scopes it, so a non-FLAG
    // gating check (none today) would not be silently exempted by a coarser test.
    if (severity === "FLAG" && gating.has(String(f.check))) return false;
    return true;
  });
}

export function signatureOf(check) {
  const key = `tripwire|check|${check}`;
  return {
    key,
    hash: crypto.createHash("sha256").update(key).digest("hex").slice(0, 12),
  };
}

// Groups eligible findings by check id. Insertion order is the tripwire's own report order, which
// is stable across runs, so the id block a cycle claims maps to the same classes it was shown in
// the dry run.
export function aggregate(findings, opts = {}) {
  const groups = new Map();
  for (const f of eligibleFindings(findings, opts)) {
    const check = String(f.check);
    let group = groups.get(check);
    if (!group) {
      const sig = signatureOf(check);
      group = { check, sigKey: sig.key, sigHash: sig.hash, members: [] };
      groups.set(check, group);
    }
    group.members.push(f.detail);
  }
  // Biggest class first: the check with the most members is the one most able to bury the report.
  return [...groups.values()].sort(
    (a, b) => b.members.length - a.members.length || a.check.localeCompare(b.check),
  );
}

// `existingDescriptions` is the description strings of already-filed tripwire tickets; membership
// is a substring test on the sig hash, which is exactly what the REST dedup query does.
export function detect(findings, existingDescriptions = [], opts = {}) {
  const groups = aggregate(findings, opts);
  const alreadyFiled = [];
  const detections = [];
  for (const group of groups) {
    const filed = (existingDescriptions ?? []).some(
      (d) => typeof d === "string" && d.includes(group.sigHash),
    );
    if (filed) alreadyFiled.push(group);
    else detections.push(group);
  }
  return { detections, alreadyFiled, classesSeen: groups.length };
}

export function sizeStampFor(group) {
  return group.members.length > SIZE_S_MAX_MEMBERS ? "M" : "S";
}

function firstClause(detail, max = 90) {
  const oneLine = String(detail ?? "").replace(/\s+/g, " ").trim();
  const cut = oneLine.split(" -- ")[0];
  return cut.length > max ? `${cut.slice(0, max)}…` : cut;
}

// Builds the exact row that will be inserted. Pure, so the guard can assert the evidence block's
// shape -- above all that the sig hash is present, which is what makes the dedup work at all.
export function buildTicketDraft(group, backlogId, opts = {}) {
  const n = group.members.length;
  const title =
    `[Tripwire] session-hygiene check ${group.check}: ` +
    `${n} flagged ${n === 1 ? "finding" : "findings"} with no owning ticket`;

  const memberLines = group.members.map((d) => `  - ${d}`).join("\n");

  const description = [
    `**P10 - Tooling.** **Auto-filed by the truth tripwire (\`SES-205\`) — not yet triaged by a human.**`,
    ``,
    `\`scripts/check-session-docs.js\` check **${group.check}** is reporting ${n} \`FLAG\` ` +
      `${n === 1 ? "finding" : "findings"} on every run, and until this ticket nothing owned them.`,
    ``,
    `Tripwire signature: \`${group.sigHash}\``,
    `Check: \`${group.check}\` · Severity: \`FLAG\` · Members at filing: **${n}**`,
    `Filed at: ${(opts.now ?? new Date()).toISOString()}`,
    ``,
    `Findings at filing time — the LIVE list may differ, and this snapshot is not the authority:`,
    memberLines,
    ``,
    `Reproduce:`,
    "```",
    `node scripts/check-session-docs.js`,
    "```",
    ``,
    `Filing is not fixing — this ticket rides the normal queue and the full session ceremony, as ` +
      `heal tickets do. One row per CHECK CLASS is deliberate: within a check the findings share a ` +
      `rule and a fix shape, and one row per finding would bury the board rather than surface it ` +
      `(\`SES-205\`). The signature is the check id, so this class files once; a re-run updates ` +
      `nothing and files nothing.`,
  ].join("\n");

  const ordinal = Number.parseInt(String(backlogId).split("-")[1], 10);

  return {
    backlog_id: backlogId,
    // 'next', not heal's 'now': doc drift is not user-blocking, and 'now' would push it ahead of
    // the members of John's named drain. ck_backlog_type_when_promoted rejects a blank `type` on a
    // now/next row, so `type` is set -- read off the live table ('Tooling', 144 rows), not guessed.
    tier: "next",
    type: "Tooling",
    priority_class: "P10 - Tooling",
    title,
    description,
    status: "open",
    source_file: TRIPWIRE_SOURCE_FILE,
    row_ordinal: ordinal,
    // John, directive db84b784: every ticket a cycle files is stamped at filing.
    // gate_count 0 -- a doc-drift fix crosses no external gate.
    size_stamp: sizeStampFor(group),
    gate_count: 0,
    session_ref: `S-${backlogId} (auto-filed by SES-205 tripwire)`,
  };
}

// Same contract as heal-engine's: ids come from ONE atomic feature_id_counter block claimed by the
// cycle (CLAUDE.md; SES-18 is the collision that rule is written from). This script never mints
// one, so it can never file more tickets than it was given ids for.
export function parseBacklogIds(raw, prefix = TRIPWIRE_PREFIX) {
  if (!raw) return { error: "--apply requires --backlog-ids=<comma-separated ids>" };
  const ids = String(raw).split(",").map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0) return { error: "--backlog-ids was empty" };
  const bad = ids.filter((id) => !new RegExp(`^${prefix}-\\d+$`).test(id));
  if (bad.length > 0) {
    return { error: `--backlog-ids contains malformed id(s): ${bad.join(", ")} (expected ${prefix}-<number>)` };
  }
  if (new Set(ids).size !== ids.length) return { error: "--backlog-ids contains duplicates" };
  return { ids };
}

// ---------------------------------------------------------------------------
// Supabase REST
// ---------------------------------------------------------------------------

function restHeaders(key, extra = {}) {
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}

async function fetchTripwireDescriptions(base, key) {
  const url =
    `${base}/rest/v1/backlog_items?source_file=eq.${encodeURIComponent(TRIPWIRE_SOURCE_FILE)}` +
    `&select=description`;
  let res;
  try {
    res = await fetch(url, { headers: restHeaders(key) });
  } catch (e) {
    return { error: `could not read already-filed tripwire tickets: ${e.message}` };
  }
  if (!res.ok) {
    let body = "";
    try { body = await res.text(); } catch { /* best effort */ }
    return { error: `tripwire ticket read returned HTTP ${res.status}: ${body}` };
  }
  try {
    const rows = await res.json();
    return { descriptions: rows.map((r) => r.description) };
  } catch (e) {
    return { error: `tripwire ticket read returned unparseable JSON: ${e.message}` };
  }
}

// §19v: "No before-image logged -> the write does not happen." The before-image is inserted first,
// and only its success authorises the ticket insert. row_data = NULL encodes "this row did not
// exist before", so a Reverse of a tripwire filing is a DELETE of that pk, not a restore -- the
// INSERT convention SES-89 introduced and runner-cycle.md step 8b writes down.
async function insertBeforeImage(base, key, cycleId, pkValue) {
  let res;
  try {
    res = await fetch(`${base}/rest/v1/runner_before_images`, {
      method: "POST",
      headers: restHeaders(key, { "Content-Type": "application/json", Prefer: "return=representation" }),
      body: JSON.stringify({ cycle_id: cycleId, table_name: "backlog_items", pk_value: pkValue, row_data: null }),
    });
  } catch (e) {
    return { error: `could not write the before-image: ${e.message}` };
  }
  if (!res.ok) {
    let body = "";
    try { body = await res.text(); } catch { /* best effort */ }
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
    try { body = await res.text(); } catch { /* best effort */ }
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

  const maxFilings = Number.parseInt(argValue("max-filings", String(DEFAULT_MAX_FILINGS)), 10);
  if (!Number.isFinite(maxFilings) || maxFilings < 1) fail(2, "--max-filings must be a positive integer");

  let findings;
  try {
    findings = collectFindings();
  } catch (e) {
    fail(2, `the tripwire itself could not run: ${e.message}`);
  }

  const existing = await fetchTripwireDescriptions(base, key);
  if (existing.error) fail(2, existing.error);

  const { detections, alreadyFiled, classesSeen } = detect(findings, existing.descriptions);

  if (!APPLY) {
    const payload = {
      apply: false,
      findingsTotal: findings.length,
      eligibleFindings: eligibleFindings(findings).length,
      classesSeen,
      alreadyFiled: alreadyFiled.map((g) => ({ check: g.check, sigHash: g.sigHash, members: g.members.length })),
      detections: detections.map((g) => ({
        check: g.check, sigHash: g.sigHash, members: g.members.length, sizeStamp: sizeStampFor(g),
      })),
    };
    if (detections.length === 0) {
      return finish(0, payload,
        `tripwire-to-backlog: nothing new to file — ${classesSeen} eligible check class(es), ` +
        `${alreadyFiled.length} already filed.`);
    }
    const lines = detections
      .slice(0, maxFilings)
      .map((g) => `  - [${g.sigHash}] check ${g.check}: ${g.members.length} FLAG finding(s), size ${sizeStampFor(g)}`)
      .join("\n");
    return finish(1, payload,
      `tripwire-to-backlog: ${detections.length} eligible check class(es) not yet filed ` +
      `(showing up to ${maxFilings}):\n${lines}\n\n` +
      `Claim ${Math.min(detections.length, maxFilings)} ${TRIPWIRE_PREFIX} id(s) as ONE ` +
      `feature_id_counter block, then re-run with --apply --cycle-id=<uuid> --backlog-ids=<ids>.`);
  }

  const cycleId = argValue("cycle-id", "");
  if (!cycleId) fail(2, "--apply requires --cycle-id=<uuid> (every before-image row is bound to it)");
  const parsed = parseBacklogIds(argValue("backlog-ids", ""));
  if (parsed.error) fail(2, parsed.error);

  const toFile = detections.slice(0, Math.min(maxFilings, parsed.ids.length));
  const filed = [];
  for (let i = 0; i < toFile.length; i += 1) {
    const group = toFile[i];
    const backlogId = parsed.ids[i];
    const img = await insertBeforeImage(base, key, cycleId, backlogId);
    if (img.error) fail(2, `${backlogId}: ${img.error}`);
    const ins = await insertTicket(base, key, buildTicketDraft(group, backlogId));
    if (ins.error) fail(2, `${backlogId}: ${ins.error}`);
    filed.push({ backlogId, check: group.check, sigHash: group.sigHash, members: group.members.length });
  }

  return finish(0,
    { apply: true, filed, detected: detections.length, classesSeen },
    filed.length === 0
      ? "tripwire-to-backlog: nothing to file."
      : `tripwire-to-backlog: filed ${filed.length} ticket(s):\n` +
        filed.map((f) => `  - ${f.backlogId} — check ${f.check} (${f.members} finding(s), sig ${f.sigHash})`).join("\n"));
}

// Importing this module for its exports must never run the CLI -- the same guard
// check-session-docs.js, heal-engine.js and export-backlog-snapshot.js already keep.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}
