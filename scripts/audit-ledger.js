#!/usr/bin/env node
// DeepBench v7.0.464 | scripts/audit-ledger.js | AGT-70
// FEATURE: AGT-70 slice 1 -- the Auditor's findings ledger, its fingerprint, and the weekly report.
// This script is the ONLY writer of public.audit_findings: the table's trigger refuses every DELETE
// and every UPDATE outside {status, ruling, ruled_by, ruled_at}, so an append here is permanent.
//
// THE FINGERPRINT IS WHY THE LEDGER IS A LEDGER AND NOT A LOG. The same contradiction found again
// next week must be the SAME row, or a weekly audit files six copies of its own first week by
// December. So the identity is deliberately coarse:
//     kind | <locationKeys sorted, joined ","> | normalize(governing_fact)
// hashed sha256 and cut to 16 hex. locationKey() drops a trailing `:<line>` / `:<line>-<line>`,
// which is the load-bearing part: `docs/SELFBUILD-CHARTER.md:262-264` and the same passage at
// :271-273 after an edit above it are ONE finding, not two. A `table/pk/field` location has no
// line to drop and passes through unchanged. normalize() folds case, quoting (backtick, " and ')
// and whitespace runs, so re-wrapping a paragraph does not mint a new finding either.
//
// What the fingerprint is deliberately SENSITIVE to: `kind` (the same pair of passages read as a
// duplicate and read as a contradiction are different claims about them) and the location FILE
// (the same fact disputed in two different homes is a different dispute). tests/regression/
// agt-70-auditor.test.mjs pins both directions with controls, so neither drifts.
//
// The locationKeys are NOT de-duplicated before joining. That is the kickoff's formula verbatim
// (v7.0.464-AGT-70 section 4: "<sorted locationKeys joined ,>") and it is kept literal so the value
// is reproducible from the spec alone rather than from this file's reading of it. The consequence
// is real and stated rather than hidden: a finding citing two lines of ONE file carries that file
// twice, so adding a third citation in the same file changes the fingerprint. If a later slice
// wants set semantics ("the location homes", as the au-knowledge-homes Skill text words it), that
// is a decision with a migration for the rows already filed -- not a quiet edit here.
//
// FILING IS NOT RULING. Nothing in this script ever sets status to not-a-defect or writes a ruling
// of its own. `ruled_by`/`ruled_at` are stamped only for a row that ARRIVES already carrying a
// status other than open -- the fixture's two resolved findings, closed before filing -- and they
// record who filed that closure, never a judgment this script made.
//
// Usage:
//   node scripts/audit-ledger.js --ingest=<json> --week=<YYYY-Www> [--found-by=<s>]
//                                [--cycle-id=<uuid> --apply]
//   node scripts/audit-ledger.js --report=<YYYY-Www> [--write]
//
//   --ingest=<json>   A file in the fixture's shape: {week, found_by, findings:[...]}. Its
//                     top-level `week` and `found_by` are DEFAULTS; the flags win when given.
//   --apply           Actually append. Default is a DRY RUN that writes nothing at all.
//   --cycle-id=<uuid> Required with --apply: the open runner_cycles row every before-image binds to.
//   --report=<week>   Render that week's rows. --write puts them in docs/audits/<week>.md.
//
// Exit codes (the same contract tripwire-to-backlog.js and heal-engine.js keep):
//   0  ran cleanly -- nothing new to file, or --apply appended everything it detected
//   1  a DRY RUN found findings that are not in the ledger yet (the runner's signal to re-run
//      with --apply). An --apply run that filed them all is a clean run, not a signal.
//   2  could not run -- missing credentials, unreadable/invalid input, REST failure, or --apply
//      without a cycle id. NEVER a pass.
//
// §19v: every INSERT is preceded by its own runner_before_images row with row_data null, which
// encodes "this row did not exist before" -- so a Reverse of a filing is a DELETE of that pk. The
// before-image is written FIRST and only its success authorises the append (SES-89, step 8b).

import fs from "fs";
import path from "path";
import { createHash, randomUUID } from "crypto";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// --- pure half (imported by the regression test; no network, no disk, no process.exit) ---------

export function normalize(s) {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[`"']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// `docs/runbooks/runner-cycle.md:626` -> `docs/runbooks/runner-cycle.md`
// `api/prompt/request-receivable.js:274-279` -> `api/prompt/request-receivable.js`
// `skill_profiles/pz-identity/temperature` -> unchanged (no line to drop)
export function locationKey(loc) {
  const raw = typeof loc === "string" ? loc : String(loc?.location ?? "");
  return raw.replace(/:\d+(?:-\d+)?$/, "");
}

export function fingerprint(f) {
  const keys = (f?.locations ?? []).map(locationKey).sort();
  const material = `${f?.kind ?? ""}|${keys.join(",")}|${normalize(f?.governing_fact)}`;
  return createHash("sha256").update(material, "utf8").digest("hex").slice(0, 16);
}

const STATUS_ORDER = { open: 0, resolved: 1, "not-a-defect": 2 };
const CONFIDENCE_ORDER = { high: 0, medium: 1, low: 2 };

export function sortRows(rows) {
  return [...rows].sort((a, b) => {
    const s = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
    if (s !== 0) return s;
    const c = (CONFIDENCE_ORDER[a.confidence] ?? 99) - (CONFIDENCE_ORDER[b.confidence] ?? 99);
    if (c !== 0) return c;
    return String(a.fingerprint).localeCompare(String(b.fingerprint));
  });
}

// Pure: rows in, string out, so the test can hold it byte-stable. `first_seen` is attached by the
// caller (min iso_week for that fingerprint across the whole ledger); a row without one reads as
// first seen in its own week, which is true for every row of a first-ever ingest.
export function renderReport(week, rows) {
  const ordered = sortRows(rows);
  const count = s => ordered.filter(r => r.status === s).length;
  const out = [];
  out.push(`<!-- GENERATED by scripts/audit-ledger.js --report=${week} --write (AGT-70) from public.audit_findings — do not edit -->`);
  out.push("");
  out.push(`# Audit ${week} — ${ordered.length} findings (${count("open")} open · ${count("resolved")} resolved · ${count("not-a-defect")} not a defect)`);

  for (const r of ordered) {
    out.push("");
    out.push(`## ${r.fingerprint} · ${r.kind} · ${r.confidence} · ${r.status}`);
    out.push("");
    out.push(`**Fact:** ${r.governing_fact}`);
    out.push("");
    out.push("**Locations:**");
    for (const l of r.locations ?? []) {
      out.push(`- \`${l.location}\` — "${l.text}"`);
    }
    out.push("");
    out.push(`**Proposed resolution:** ${r.proposed_resolution}`);
    if (r.ruling) {
      out.push("");
      out.push(`**Ruling:** ${r.ruling} (${r.ruled_by ?? "unknown"}, ${String(r.ruled_at ?? "").slice(0, 10)})`);
    }
    out.push("");
    out.push(`First seen: ${r.first_seen ?? r.iso_week} · found by ${r.found_by}`);
  }
  return out.join("\n") + "\n";
}

// Rows as they go to PostgREST. Pure so the test can read the shape without a network.
export function toRow(finding, { week, foundBy, cycleId, id }) {
  const status = finding.status ?? "open";
  const ruled = status !== "open";
  return {
    id,
    fingerprint: fingerprint(finding),
    iso_week: week,
    kind: finding.kind,
    locations: finding.locations,
    governing_fact: finding.governing_fact,
    confidence: finding.confidence,
    proposed_resolution: finding.proposed_resolution,
    status,
    ruling: finding.ruling ?? null,
    ruled_by: ruled ? foundBy : null,
    ruled_at: ruled ? new Date().toISOString() : null,
    found_by: foundBy,
    cycle_id: cycleId ?? null,
  };
}

// --- CLI --------------------------------------------------------------------------------------

function fail(code, msg) {
  console.error(`audit-ledger: ${msg}`);
  process.exit(code);
}

function restHeaders(key, extra = {}) {
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}

function creds() {
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!base || !key) fail(2, "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (exit 2 = could not run, never a pass).");
  return { base, key };
}

async function restGet(base, key, pathAndQuery) {
  let res;
  try {
    res = await fetch(`${base}/rest/v1/${pathAndQuery}`, { headers: restHeaders(key) });
  } catch (e) {
    fail(2, `read failed: ${e.message}`);
  }
  if (!res.ok) fail(2, `read returned HTTP ${res.status}: ${await res.text().catch(() => "")}`);
  try {
    return await res.json();
  } catch (e) {
    fail(2, `read returned unparseable JSON: ${e.message}`);
  }
}

async function restPost(base, key, table, body) {
  let res;
  try {
    res = await fetch(`${base}/rest/v1/${table}`, {
      method: "POST",
      headers: restHeaders(key, { "Content-Type": "application/json", Prefer: "return=representation" }),
      body: JSON.stringify(body),
    });
  } catch (e) {
    return { error: `${table} insert failed: ${e.message}` };
  }
  if (!res.ok) return { error: `${table} insert returned HTTP ${res.status}: ${await res.text().catch(() => "")}` };
  return { ok: true };
}

function arg(argv, name) {
  const hit = argv.find(a => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return undefined;
  const eq = hit.indexOf("=");
  return eq < 0 ? true : hit.slice(eq + 1);
}

async function firstSeenByFingerprint(base, key, fps) {
  if (!fps.length) return new Map();
  const rows = await restGet(base, key, `audit_findings?select=fingerprint,iso_week&fingerprint=in.(${fps.join(",")})`);
  const map = new Map();
  for (const r of rows) {
    const cur = map.get(r.fingerprint);
    if (!cur || r.iso_week < cur) map.set(r.fingerprint, r.iso_week);
  }
  return map;
}

async function doIngest(argv) {
  const file = arg(argv, "ingest");
  const apply = arg(argv, "apply") === true;
  const cycleId = arg(argv, "cycle-id");
  if (apply && !cycleId) fail(2, "--apply requires --cycle-id=<uuid>: every append carries a before-image bound to an open cycle (§19v).");

  let doc;
  try {
    doc = JSON.parse(fs.readFileSync(path.resolve(ROOT, String(file)), "utf8"));
  } catch (e) {
    fail(2, `could not read --ingest=${file}: ${e.message}`);
  }
  const week = arg(argv, "week") ?? doc.week;
  const foundBy = arg(argv, "found-by") ?? doc.found_by;
  if (!week || !/^\d{4}-W\d{2}$/.test(String(week))) fail(2, `--week must be YYYY-Www (got ${week ?? "nothing"}).`);
  if (!foundBy) fail(2, "--found-by=<s> is required when the input file carries no top-level found_by.");
  const findings = Array.isArray(doc.findings) ? doc.findings : null;
  if (!findings) fail(2, "the --ingest file has no top-level `findings` array.");

  const { base, key } = creds();
  const fps = findings.map(fingerprint);
  const existing = await restGet(base, key, `audit_findings?select=fingerprint&iso_week=eq.${week}&fingerprint=in.(${fps.join(",")})`);
  const seenSet = new Set(existing.map(r => r.fingerprint));

  // Two findings in ONE file that fingerprint alike are the same finding: the ledger's UNIQUE
  // (fingerprint, iso_week) would refuse the second anyway, so it is counted seen, not appended.
  const filed = new Set(seenSet);
  let created = 0;
  let seen = 0;
  for (let i = 0; i < findings.length; i++) {
    if (filed.has(fps[i])) { seen++; continue; }
    filed.add(fps[i]);
    created++;
    if (!apply) continue;
    const id = randomUUID();
    const before = await restPost(base, key, "runner_before_images", {
      cycle_id: cycleId, table_name: "audit_findings", pk_value: id, row_data: null,
    });
    if (before.error) fail(2, `${before.error} -- no before-image, so the append does not happen (§19v).`);
    const row = await restPost(base, key, "audit_findings", toRow(findings[i], { week, foundBy, cycleId, id }));
    if (row.error) fail(2, row.error);
  }

  console.log(`ingest ${week}: ${findings.length} findings, ${created} new, ${seen} seen`);
  // A dry run that found unfiled work is the signal to re-run with --apply; an --apply run that
  // filed that work is a clean run.
  process.exit(!apply && created > 0 ? 1 : 0);
}

async function doReport(argv) {
  const week = String(arg(argv, "report"));
  if (!/^\d{4}-W\d{2}$/.test(week)) fail(2, `--report must be YYYY-Www (got ${week}).`);
  const { base, key } = creds();
  const rows = await restGet(base, key, `audit_findings?select=*&iso_week=eq.${week}`);
  const firstSeen = await firstSeenByFingerprint(base, key, rows.map(r => r.fingerprint));
  for (const r of rows) r.first_seen = firstSeen.get(r.fingerprint) ?? r.iso_week;

  const text = renderReport(week, rows);
  if (arg(argv, "write") === true) {
    const rel = path.join("docs", "audits", `${week}.md`);
    fs.mkdirSync(path.join(ROOT, "docs", "audits"), { recursive: true });
    fs.writeFileSync(path.join(ROOT, rel), text, "utf8");
    console.log(`report ${week}: ${rows.length} findings -> ${rel}`);
  } else {
    process.stdout.write(text);
  }
  process.exit(0);
}

async function main() {
  const argv = process.argv.slice(2);
  if (arg(argv, "ingest") !== undefined) return doIngest(argv);
  if (arg(argv, "report") !== undefined) return doReport(argv);
  fail(2, "nothing to do: pass --ingest=<json> --week=<YYYY-Www> or --report=<YYYY-Www>.");
}

// SES-176's contract: importing this module for its exports must never run the CLI.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main();
}
