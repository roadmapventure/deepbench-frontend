#!/usr/bin/env node
// DeepBench v7.0.467 | scripts/tripwire-to-backlog.js | SES-205 + AGT-70 slice 3 (--from-ledger)
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
// -- `--from-ledger` SWITCHES THE SOURCE AND NOTHING ELSE (AGT-70 slice 3, v7.0.467) --------
// The Auditor's weekly judgment run files nothing to the board. Its findings land in
// `public.audit_findings`, John reads them, and a finding he RULED and left `open` is the ledger's
// "file it" state -- that, and only that, becomes a backlog row here. So this flag re-points the
// detector at a second source; the filing half underneath it (dedup by substring, before-image
// first, ids passed in, the 0/1/2 exit contract) is the same code path the tripwire uses, because
// two filing engines is the drift this script was written to end.
//
// THREE GATES, and each is a decision rather than a filter that happened to be convenient:
//   * `ruled_by IS NOT NULL` -- the Auditor never files its own findings. A model finding a
//     contradiction is a candidate; John reading it is what makes it work. Without this gate the
//     weekly run writes straight to the board and the ledger's whole point is gone.
//   * `status = 'open'` -- `resolved` and `not-a-defect` are John's other two answers. A ruled row
//     left open is the one that means "yes, and it still needs doing".
//   * `confidence = 'high'` -- the corpus detector's own grading. Medium and low rows are for the
//     weekly report to show him, not for the board to carry.
// And one cap: LEDGER_WEEKLY_CAP rows per ISO WEEK, counted from `backlog_items.created_at` against
// isoWeekStart() -- a Monday 00:00Z floor, never a rolling 7 days (which lets four rows file across
// any eight days without once looking over the cap). The cap is the blast radius: a bad week of
// rulings costs the board three rows, not thirty.
//
// Usage:
//   node scripts/tripwire-to-backlog.js [--apply] [--cycle-id=<uuid>] [--backlog-ids=<ids>]
//                                       [--max-filings=<n>] [--json]
//   node scripts/tripwire-to-backlog.js --from-ledger [--apply] [--cycle-id=<uuid>]
//                                       [--backlog-ids=<ids>] [--json]
//
//   --from-ledger     File from public.audit_findings (ruled, open, high) instead of the tripwire.
//                     DRY RUN by default, exactly like the tripwire path -- --apply is still the
//                     only thing that writes.
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
// AGT-70 slice 3: the ISO-week calendar is IMPORTED from the ledger's own script, never re-derived
// here. `iso_week` is that file's column and `date -u +%G-W%V` in runbook step 4d is that file's
// week -- a second implementation of "which week is it" is a cap that disagrees with the report.
import { isoWeekStart } from "./audit-ledger.js";

export const TRIPWIRE_SOURCE_FILE = "tripwire-to-backlog";
export const TRIPWIRE_PREFIX = "SES";
export const DEFAULT_MAX_FILINGS = 3;

// AGT-70 slice 3. `source_file` is the dedup scope AND the ignore-key any future markdown→DB
// reconciliation must carry (the same note heal-engine's rows have in runner-cycle.md step 8b).
export const LEDGER_SOURCE_FILE = "audit-ledger";
// Three per ISO week. Deliberately NOT --max-filings: that flag caps one RUN, and a cap that resets
// every run caps nothing when the runner fires every few hours.
export const LEDGER_WEEKLY_CAP = 3;

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
// Pure half, ledger source (AGT-70 slice 3) -- rows in, drafts out. Same contract as the tripwire
// half above it: no network, no disk, no process.exit, so the regression test drives the REAL
// functions against fixtures.
// ---------------------------------------------------------------------------

// The three gates, then one row per FINGERPRINT. The fingerprint is the ledger's identity (it
// survives a re-wrap and a line-number shift -- scripts/audit-ledger.js's header says why), so the
// same contradiction found again in a later week is the SAME finding and must not file twice. When
// a fingerprint appears more than once, the EARLIEST `ruled_at` wins: that is the ruling that made
// it filable, and keeping the latest would let a re-ruling walk the row forward in the queue.
// Input order is preserved for the survivors -- the CLI reads `order=ruled_at`, so the caller's
// order is already "oldest ruling first", which is the order they should file in.
export function ledgerEligible(rows) {
  const keep = new Map();
  for (const r of rows ?? []) {
    if (!r) continue;
    if (r.status !== "open") continue;
    if (r.confidence !== "high") continue;
    if (r.ruled_by == null || String(r.ruled_by) === "") continue;
    const fp = String(r.fingerprint);
    const seen = keep.get(fp);
    // String compare is right for an ISO-8601 timestamp and for `null` handled explicitly: a row
    // with no ruled_at cannot be "earlier" than one that has one, it is simply not preferred.
    if (!seen) { keep.set(fp, r); continue; }
    const a = seen.ruled_at == null ? "" : String(seen.ruled_at);
    const b = r.ruled_at == null ? "" : String(r.ruled_at);
    if (b !== "" && (a === "" || b < a)) keep.set(fp, r);
  }
  return [...keep.values()];
}

// `existingDescriptions` is the description strings of already-filed LEDGER tickets; membership is
// a substring test on the FINGERPRINT, which is exactly what the description carries and exactly
// what the REST dedup query pulls -- the same shape detect() uses with the tripwire's sig hash.
//
// THE CAP IS APPLIED AFTER THE DEDUP, NOT BEFORE, and that ordering is load-bearing: a row that is
// already filed must never consume a slot, or three filed findings would wedge the cap shut for
// every ISO week that followed.
export function ledgerDetect(eligible, existingDescriptions = [], opts = {}) {
  const weeklyCap = Number.isFinite(opts.weeklyCap) ? opts.weeklyCap : LEDGER_WEEKLY_CAP;
  const filedThisWeek = Number.isFinite(opts.filedThisWeek) ? opts.filedThisWeek : 0;
  const capLeft = Math.max(0, weeklyCap - filedThisWeek);

  const alreadyFiled = [];
  const unfiled = [];
  for (const row of eligible ?? []) {
    const fp = String(row?.fingerprint ?? "");
    const filed = fp !== "" && (existingDescriptions ?? []).some(
      (d) => typeof d === "string" && d.includes(fp),
    );
    if (filed) alreadyFiled.push(row);
    else unfiled.push(row);
  }
  return { detections: unfiled.slice(0, capLeft), alreadyFiled, capLeft };
}

export function ledgerSizeStampFor(row) {
  return (row?.locations?.length ?? 0) > SIZE_S_MAX_MEMBERS ? "M" : "S";
}

// Builds the exact row that will be inserted. Pure, so the guard can assert that the FINGERPRINT is
// present in the description -- which is what makes the dedup above work at all. Deliberately the
// same shape as buildTicketDraft(): same tier, same type, same priority_class, same gate_count, no
// `scope_origin` on either. Two filing paths that stamp their rows differently are two boards.
export function buildLedgerTicketDraft(row, backlogId, opts = {}) {
  const now = opts.now ?? new Date();
  const locations = Array.isArray(row?.locations) ? row.locations : [];
  const title = `[Auditor] ${row.kind}: ${firstClause(row.governing_fact)}`;

  const locationLines = locations
    .map((l) => `  - \`${l?.location ?? ""}\` — "${l?.text ?? ""}"`)
    .join("\n");

  const description = [
    `**P10 - Tooling.** **Auto-filed from the Auditor's ledger (\`AGT-70\`) on John's ruling — not yet a fix.**`,
    ``,
    `\`public.audit_findings\` row \`${row.fingerprint}\` (${row.kind}, confidence ${row.confidence}, ` +
      `first seen ${row.iso_week}) was ruled by ${row.ruled_by} on ${String(row.ruled_at ?? "").slice(0, 10)} ` +
      `and left \`open\`, which is the ledger's "file it" state.`,
    ``,
    `Ledger fingerprint: \`${row.fingerprint}\``,
    `Ruling: ${row.ruling}`,
    `Filed at: ${now.toISOString()}`,
    ``,
    `**Fact in dispute:** ${row.governing_fact}`,
    ``,
    `**Locations (verbatim at filing):**`,
    locationLines,
    ``,
    `**Proposed resolution:** ${row.proposed_resolution}`,
    ``,
    `Reproduce:`,
    "```",
    `node scripts/audit-ledger.js --report=${row.iso_week}`,
    "```",
    ``,
    `Filing is not fixing — this ticket rides the normal queue and the full session ceremony, as ` +
      `tripwire and heal tickets do. The fingerprint above is the dedupe key: the same finding files ` +
      `once, and a re-run files nothing. At most ${LEDGER_WEEKLY_CAP} ledger rows file per ISO week ` +
      `(\`LEDGER_WEEKLY_CAP\`).`,
  ].join("\n");

  const ordinal = Number.parseInt(String(backlogId).split("-")[1], 10);

  return {
    backlog_id: backlogId,
    tier: "next",
    type: "Tooling",
    priority_class: "P10 - Tooling",
    title,
    description,
    status: "open",
    source_file: LEDGER_SOURCE_FILE,
    row_ordinal: ordinal,
    // The member list here is the finding's LOCATIONS -- the passages in dispute. Eight homes to
    // reconcile is not a one-shape one-cycle fix, which is the same reading sizeStampFor() gives
    // the tripwire's member count.
    size_stamp: ledgerSizeStampFor(row),
    gate_count: 0,
    session_ref: `S-${backlogId} (auto-filed from the Auditor's ledger, AGT-70)`,
  };
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

// AGT-70 slice 3. The three gates are pushed into the QUERY as well as being re-asserted by
// ledgerEligible(): the query keeps the read small and the pure function keeps the rule testable
// from fixtures. Columns are NAMED and never `select=*` -- `.claude/rules/supabase-column-grants.md`
// (a column-list grant turns a star select into a 403), and naming them is also what makes it
// visible that this read touches no column outside the ledger's own.
async function fetchLedgerRows(base, key) {
  const url =
    `${base}/rest/v1/audit_findings?select=id,fingerprint,iso_week,kind,locations,governing_fact,` +
    `confidence,proposed_resolution,status,ruling,ruled_by,ruled_at` +
    `&status=eq.open&confidence=eq.high&ruled_by=not.is.null&order=ruled_at`;
  let res;
  try {
    res = await fetch(url, { headers: restHeaders(key) });
  } catch (e) {
    return { error: `could not read the Auditor's ledger: ${e.message}` };
  }
  if (!res.ok) {
    let body = "";
    try { body = await res.text(); } catch { /* best effort */ }
    return { error: `audit_findings read returned HTTP ${res.status}: ${body}` };
  }
  try {
    const rows = await res.json();
    if (!Array.isArray(rows)) return { error: "audit_findings read came back non-array" };
    return { rows };
  } catch (e) {
    return { error: `audit_findings read returned unparseable JSON: ${e.message}` };
  }
}

// `created_at` rides along with the description because BOTH dedup facts come off the same rows:
// which fingerprints are filed at all (any week), and how many landed since this ISO week's Monday.
// One read, two questions -- a second count query could disagree with the first by a row.
async function fetchLedgerFilings(base, key) {
  const url =
    `${base}/rest/v1/backlog_items?select=description,created_at` +
    `&source_file=eq.${encodeURIComponent(LEDGER_SOURCE_FILE)}`;
  let res;
  try {
    res = await fetch(url, { headers: restHeaders(key) });
  } catch (e) {
    return { error: `could not read already-filed ledger tickets: ${e.message}` };
  }
  if (!res.ok) {
    let body = "";
    try { body = await res.text(); } catch { /* best effort */ }
    return { error: `ledger ticket read returned HTTP ${res.status}: ${body}` };
  }
  try {
    const rows = await res.json();
    return { rows: Array.isArray(rows) ? rows : [] };
  } catch (e) {
    return { error: `ledger ticket read returned unparseable JSON: ${e.message}` };
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
const FROM_LEDGER = ARGV.includes("--from-ledger");

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

// AGT-70 slice 3. The ledger source, end to end. Everything below the detect() call is the same
// sequence the tripwire path runs -- before-image, insert, one id per filing, never an id minted
// here -- because the filing contract is the thing that must not have two versions.
async function mainFromLedger(base, key) {
  const led = await fetchLedgerRows(base, key);
  if (led.error) fail(2, led.error);
  const filings = await fetchLedgerFilings(base, key);
  if (filings.error) fail(2, filings.error);

  const now = new Date();
  const weekStart = isoWeekStart(now);
  const filedThisWeek = filings.rows.filter(
    (r) => typeof r.created_at === "string" && r.created_at >= weekStart,
  ).length;

  const eligible = ledgerEligible(led.rows);
  const { detections, alreadyFiled, capLeft } = ledgerDetect(
    eligible,
    filings.rows.map((r) => r.description),
    { filedThisWeek, weeklyCap: LEDGER_WEEKLY_CAP },
  );

  const payload = {
    source: "ledger",
    apply: APPLY,
    ruledOpen: eligible.length,
    filedThisWeek,
    weeklyCap: LEDGER_WEEKLY_CAP,
    capLeft,
    alreadyFiled: alreadyFiled.map((r) => ({ fingerprint: r.fingerprint, kind: r.kind })),
    detections: detections.map((r) => ({
      fingerprint: r.fingerprint, kind: r.kind, sizeStamp: ledgerSizeStampFor(r),
    })),
  };

  if (!APPLY) {
    const prose =
      `tripwire-to-backlog --from-ledger: ${eligible.length} ruled finding(s), ` +
      `${alreadyFiled.length} already filed, ${detections.length} to file ` +
      `(cap ${capLeft} left this week)`;
    if (detections.length === 0) return finish(0, payload, prose);
    const lines = detections
      .map((r) => `  - [${r.fingerprint}] ${r.kind}, size ${ledgerSizeStampFor(r)} — ruled by ${r.ruled_by}`)
      .join("\n");
    return finish(1, payload,
      `${prose}\n${lines}\n\n` +
      `Claim ${detections.length} ${TRIPWIRE_PREFIX} id(s) as ONE feature_id_counter block, then ` +
      `re-run with --from-ledger --apply --cycle-id=<uuid> --backlog-ids=<ids>.`);
  }

  const cycleId = argValue("cycle-id", "");
  if (!cycleId) fail(2, "--apply requires --cycle-id=<uuid> (every before-image row is bound to it)");
  const parsed = parseBacklogIds(argValue("backlog-ids", ""));
  if (parsed.error) fail(2, parsed.error);

  const toFile = detections.slice(0, parsed.ids.length);
  const filed = [];
  for (let i = 0; i < toFile.length; i += 1) {
    const row = toFile[i];
    const backlogId = parsed.ids[i];
    // SES-407: the before-image is keyed by the backlog_items ROW UUID, never the backlog_id text --
    // reverse_decision() refuses a pk_value it cannot cast to uuid, so a text key restores nothing.
    // Mint the id here and hand the SAME one to the ticket insert, so the image points at the row.
    const rowId = crypto.randomUUID();
    const img = await insertBeforeImage(base, key, cycleId, rowId);
    if (img.error) fail(2, `${backlogId}: ${img.error}`);
    const ins = await insertTicket(base, key, { id: rowId, ...buildLedgerTicketDraft(row, backlogId, { now }) });
    if (ins.error) fail(2, `${backlogId}: ${ins.error}`);
    filed.push({ backlogId, fingerprint: row.fingerprint, kind: row.kind });
  }

  return finish(0,
    { ...payload, filed },
    filed.length === 0
      ? "tripwire-to-backlog --from-ledger: nothing to file."
      : `tripwire-to-backlog --from-ledger: filed ${filed.length} ticket(s):\n` +
        filed.map((f) => `  - ${f.backlogId} — ${f.kind} (fingerprint ${f.fingerprint})`).join("\n"));
}

async function main() {
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!base || !key) fail(2, "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (exit 2 = could not run, never a pass).");

  // The SOURCE branches here and nowhere else: the tripwire's own collect/aggregate/detect is not
  // even reached on a --from-ledger run, so a check-session-docs.js failure cannot take the ledger
  // path down with it.
  if (FROM_LEDGER) return mainFromLedger(base, key);

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
    // SES-407: see the ledger loop above -- the image is keyed by the row uuid, minted here and
    // reused as the ticket's id so the two agree.
    const rowId = crypto.randomUUID();
    const img = await insertBeforeImage(base, key, cycleId, rowId);
    if (img.error) fail(2, `${backlogId}: ${img.error}`);
    const ins = await insertTicket(base, key, { id: rowId, ...buildTicketDraft(group, backlogId) });
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
