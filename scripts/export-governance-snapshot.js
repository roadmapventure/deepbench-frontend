#!/usr/bin/env node
// DeepBench v7.0.218 | scripts/export-governance-snapshot.js | SES-176 (M2 Truth Infrastructure)
//
// Regenerates docs/governance/RULES-SNAPSHOT.md from public.governance_rules -- the registry's only
// repo-side copy, and the input the truth tripwire (checks 9/10/11 in scripts/check-session-docs.js)
// reads. Same standing as docs/backlog/BACKLOG-SNAPSHOT.md: committed into every ship commit set, so
// the registry is restorable and its history has a git log.
//
// WHY A SNAPSHOT AND NOT A LIVE READ -- the constraint that produced this file. The truth checks live
// in check-session-docs.js, which is a SESSION-START tripwire, and that file's own header rules a live
// read out in terms this script must not quietly reverse:
//
//   "A network round trip does not belong in this path, and a checker that silently no-ops when
//    credentials are absent would reintroduce exactly the false all-clear being fixed here."
//
// public.governance_rules is additionally service_role-only -- SES-174 locked anon/authenticated to
// ZERO privileges (its kickoff asserts both directions) -- so a session-start read could not work
// without credentials even in principle. Hence the same answer SES-83 (c) reached for backlog_items:
// export to a deterministic in-repo file, and let the cheap path read that.
//
// DETERMINISM IS THE POINT. Two runs against an unchanged registry must produce a BYTE-IDENTICAL
// document, so a diff here always means the rules actually moved. That is why no timestamp appears in
// the body: provenance is the rule count plus a sha256 over the canonical payload. `updated_at` is
// deliberately NOT exported for the same reason -- it changes on writes that alter nothing a reader
// cares about, and exporting it would break the guarantee.
//
// DeepBench v7.0.402 | scripts/export-governance-snapshot.js | SES-313 -- a second output,
// docs/governance/MODEL-LANES-SNAPSHOT.md, exported from public.runner_model_lanes in the SAME
// run. Same reasoning as the header above, restated for a second table rather than re-argued: the
// runbook's {{lanes}} block (scripts/render-rule-blocks.js) needs an offline, credential-free read,
// and runner_model_lanes is service_role-only like every runner_ table (SES-78a), so a live read at
// session-start could not work here either. Fixed lane order (orchestrator, judgment, mechanical --
// the order John's own routing prose has always used, LANE_ORDER below), not alphabetical, so the
// rendered runbook block reads in the order a cycle actually escalates through rather than a-to-z.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/export-governance-snapshot.js
//
// Flags:
//   --worktree=<path>   Repo root. Defaults to process.cwd().
//   --out=<path>        Output file. Default docs/governance/RULES-SNAPSHOT.md relative to
//                       --worktree (or used verbatim if absolute).
//   --check             Do not write. Build the document it would produce and compare against disk.
//   --json              Print a single-line machine-readable JSON summary instead of prose.
//
// Exit codes (deliberately identical to export-backlog-snapshot.js):
//   0  wrote the snapshot, or its content was already unchanged, or --check found no drift
//   1  --check found drift -- the file on disk is stale or missing
//   2  cannot run -- a required env var is missing, the REST call failed, or its response could not
//      be parsed. Exit 2 is deliberately distinct from exit 1: an unrunnable export must never be
//      reported as a pass, and must not be confused with "the snapshot is stale" either.
//
// Env (read from process.env only -- never hardcoded, never printed):
//   SUPABASE_URL           Project REST base, e.g. https://xxxx.supabase.co
//   SUPABASE_SERVICE_KEY   Service-role key. Required: SES-174 left anon/authenticated with zero
//                          privileges on governance_rules.
//
// Pure helpers (esc, buildDocument, canonicalPayload) are exported so a QA harness can import this
// module and round-trip a generated document WITHOUT network access. The network/CLI path only runs
// when this file is executed directly -- see the pathToFileURL guard at the bottom.

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { pathToFileURL, fileURLToPath } from "url";

function arg(name, fallback) {
  const prefix = `--${name}=`;
  const hit = process.argv.find(a => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

// FEATURE: SES-282 — default the repo root to THIS SCRIPT'S OWN repo, not the caller's cwd.
// Found live 2026-09-01: invoked by absolute path from outside the worktree, the old
// `process.cwd()` default wrote docs/governance/RULES-SNAPSHOT.md into C:\Projects\ — OUTSIDE the
// repo entirely — and reported success. A generator that reports success while writing where
// nobody reads is the same class of defect as the item_id gap this ticket exists for: tooling that
// looks green and is measuring, or writing, the wrong thing. `--worktree=` still wins when given.
const SCRIPT_REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORKTREE = arg("worktree", SCRIPT_REPO_ROOT);
const JSON_OUT = process.argv.includes("--json");

const PAGE_SIZE = 500;
const MAX_PAGES = 40; // hard ceiling; the registry is 84 rows, this is a runaway backstop

// Column order is the document's column order and is part of the format contract. `updated_at` and
// `created_at` are deliberately absent -- see the determinism note in the header.
export const COLUMNS = ["id", "status", "enforcement", "source_group", "canonical_doc", "superseded_by", "statement"];

const HEADERS = ["Rule", "Status", "Enforcement", "Source group", "Canonical doc", "Superseded by", "Statement"];

// SES-313 -- runner_model_lanes columns and the fixed rendering order (see header note above).
export const LANE_COLUMNS = ["lane", "model_id", "purpose"];
const LANE_HEADERS = ["Lane", "Model id", "Purpose"];
export const LANE_ORDER = ["orchestrator", "judgment", "mechanical"];

// ---------------------------------------------------------------------------
// Cell escaping -- byte-for-byte the convention BACKLOG-SNAPSHOT.md uses, so
// check-session-docs.js's existing decodeCell() reads this file with no second
// decoder to keep in sync. Order matters: `\` -> `\\` FIRST, then `|`, then
// newline, so unescaping is a single left-to-right pass.
// An empty cell means SQL NULL; the literal marker `\e` means a stored empty string.
// ---------------------------------------------------------------------------
export function esc(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s === "") return "\\e";
  return s.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\r?\n/g, "\\n");
}

export function canonicalPayload(rules) {
  // Sorted by id so row order in the DB can never change the hash. Tab-joined because tab is the
  // one character the escaper above guarantees is not introduced.
  return [...rules]
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))
    .map(r => COLUMNS.map(c => esc(r[c])).join("\t"))
    .join("\n");
}

function sha256Hex(s) {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

// Rules sort by source_group, then by the NUMERIC part of the id where there is one, so B9 precedes
// B10 rather than following it -- the same lexical-vs-numeric correction recompute_backlog_queue()
// had to make for priority classes.
function ruleSortKey(r) {
  const id = String(r.id ?? "");
  const m = id.match(/^([A-Za-z-]*?)(\d+)([a-z]?)$/);
  return m ? [m[1], Number(m[2]), m[3]] : [id, Number.MAX_SAFE_INTEGER, ""];
}

function compareRules(a, b) {
  const ga = String(a.source_group ?? "");
  const gb = String(b.source_group ?? "");
  if (ga !== gb) return ga.localeCompare(gb);
  const ka = ruleSortKey(a);
  const kb = ruleSortKey(b);
  if (ka[0] !== kb[0]) return String(ka[0]).localeCompare(String(kb[0]));
  if (ka[1] !== kb[1]) return ka[1] - kb[1];
  if (ka[2] !== kb[2]) return String(ka[2]).localeCompare(String(kb[2]));
  return String(a.id).localeCompare(String(b.id));
}

export function buildDocument(rules) {
  const hash = sha256Hex(canonicalPayload(rules));
  const byStatus = new Map();
  for (const r of rules) {
    const k = String(r.status ?? "");
    byStatus.set(k, (byStatus.get(k) ?? 0) + 1);
  }
  const statusLine = [...byStatus.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, n]) => `${n} ${k}`)
    .join(" · ");

  const lines = [];
  lines.push("# Governance rules — repo-side snapshot of `public.governance_rules`");
  lines.push("");
  lines.push("<!-- GENERATED FILE — do not hand-edit. Regenerate with:");
  lines.push("     SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node scripts/export-governance-snapshot.js");
  lines.push("     The registry in Supabase is the authority; this file is its only in-repo copy and the");
  lines.push("     input the truth tripwire (checks 9/10/11, scripts/check-session-docs.js) reads. -->");
  lines.push("");
  lines.push(`**Rules:** ${rules.length} · **By status:** ${statusLine || "—"} · **Payload sha256:** \`${hash}\``);
  lines.push("");
  lines.push("Cell escaping matches `docs/backlog/BACKLOG-SNAPSHOT.md`: `\\` → `\\\\`, `|` → `\\|`, newline → `\\n`.");
  lines.push("An empty cell is SQL NULL; the marker `\\e` is a stored empty string. Every cell is padded with");
  lines.push("exactly one space per side, and a reader removes one character per side rather than trimming.");
  lines.push("");
  lines.push(`| ${HEADERS.join(" | ")} |`);
  lines.push(`|${HEADERS.map(() => "---").join("|")}|`);
  for (const r of [...rules].sort(compareRules)) {
    lines.push(`| ${COLUMNS.map(c => esc(r[c])).join(" | ")} |`);
  }
  lines.push("");
  return { text: lines.join("\n"), hash };
}

// SES-313 -- same escaping, same determinism contract, one table instead of 116 rows.
export function canonicalLanesPayload(lanes) {
  return LANE_ORDER
    .map(lane => lanes.find(r => String(r.lane) === lane))
    .filter(Boolean)
    .map(r => LANE_COLUMNS.map(c => esc(r[c])).join("\t"))
    .join("\n");
}

export function buildLanesDocument(lanes) {
  const hash = sha256Hex(canonicalLanesPayload(lanes));
  const ordered = LANE_ORDER.map(lane => lanes.find(r => String(r.lane) === lane)).filter(Boolean);
  const missing = LANE_ORDER.filter(lane => !lanes.some(r => String(r.lane) === lane));

  const lines = [];
  lines.push("# Runner model lanes — repo-side snapshot of `public.runner_model_lanes`");
  lines.push("");
  lines.push("<!-- GENERATED FILE — do not hand-edit. Regenerate with:");
  lines.push("     SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node scripts/export-governance-snapshot.js");
  lines.push("     The table in Supabase is the authority; this file is its only in-repo copy and the");
  lines.push("     input scripts/render-rule-blocks.js's {{lanes}} marker reads. -->");
  lines.push("");
  lines.push(`**Lanes:** ${ordered.length} · **Payload sha256:** \`${hash}\``);
  if (missing.length) lines.push(`**Missing lanes (registry incomplete):** ${missing.join(", ")}`);
  lines.push("");
  lines.push("Cell escaping matches `docs/governance/RULES-SNAPSHOT.md`: `\\` → `\\\\`, `|` → `\\|`, newline → `\\n`.");
  lines.push("An empty cell is SQL NULL; the marker `\\e` is a stored empty string. Every cell is padded with");
  lines.push("exactly one space per side, and a reader removes one character per side rather than trimming.");
  lines.push("Row order is fixed (orchestrator, judgment, mechanical), not alphabetical — the order a cycle");
  lines.push("actually escalates through.");
  lines.push("");
  lines.push(`| ${LANE_HEADERS.join(" | ")} |`);
  lines.push(`|${LANE_HEADERS.map(() => "---").join("|")}|`);
  for (const r of ordered) {
    lines.push(`| ${LANE_COLUMNS.map(c => esc(r[c])).join(" | ")} |`);
  }
  lines.push("");
  return { text: lines.join("\n"), hash };
}

async function fetchAllRules(supabaseUrl, supabaseKey) {
  const headers = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };
  const base = supabaseUrl.replace(/\/+$/, "");
  const cols = COLUMNS.join(",");

  let all = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const offset = page * PAGE_SIZE;
    const url = `${base}/rest/v1/governance_rules?select=${cols}&order=id.asc&limit=${PAGE_SIZE}&offset=${offset}`;
    let res;
    try {
      res = await fetch(url, { headers });
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
    let body;
    try {
      body = await res.json();
    } catch (e) {
      return { error: `Supabase REST returned unparseable JSON: ${e.message}` };
    }
    if (!Array.isArray(body)) {
      return { error: `Supabase REST returned a non-array payload for governance_rules` };
    }
    all = all.concat(body);
    if (body.length < PAGE_SIZE) return { rules: all };
  }
  return { error: `governance_rules paging exceeded MAX_PAGES (${MAX_PAGES}) -- refusing to write a possibly truncated snapshot` };
}

// SES-313 -- three rows, no paging needed; still reads through the identical REST/headers path so
// a credentials or connectivity failure fails the same way for both snapshots.
async function fetchAllLanes(supabaseUrl, supabaseKey) {
  const headers = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };
  const base = supabaseUrl.replace(/\/+$/, "");
  const cols = LANE_COLUMNS.join(",");
  const url = `${base}/rest/v1/runner_model_lanes?select=${cols}&order=lane.asc`;
  let res;
  try {
    res = await fetch(url, { headers });
  } catch (e) {
    return { error: `could not reach the Supabase REST endpoint for runner_model_lanes: ${e.message}` };
  }
  if (!res.ok) {
    let body = "";
    try {
      body = await res.text();
    } catch {
      // best effort -- an unreadable body is still a failure, just a less descriptive one
    }
    return { error: `Supabase REST returned HTTP ${res.status} ${res.statusText} for runner_model_lanes: ${body}` };
  }
  let body;
  try {
    body = await res.json();
  } catch (e) {
    return { error: `Supabase REST returned unparseable JSON for runner_model_lanes: ${e.message}` };
  }
  if (!Array.isArray(body)) {
    return { error: `Supabase REST returned a non-array payload for runner_model_lanes` };
  }
  return { lanes: body };
}

// SES-313 -- exit/print helpers no longer call process.exit() directly: two snapshots are now
// produced in one run, so main() collects a {code, summary, prose} result from each and combines
// them at the very end. Combined exit code is the WORST of the two (2 beats 1 beats 0) -- the same
// severity ordering documented in the header (2 = could not run, 1 = drift, 0 = clean), so one
// snapshot's failure can never be silently outvoted by the other's success.
function result(code, summary, prose) {
  return { code, summary, prose };
}

// One table's worth of the write-or-check logic, shared by both snapshots so they cannot drift
// from each other in behaviour. `label` names the row unit in prose ("rules" / "lanes").
function processSnapshot({ label, noun, rows, buildFn, outPath, CHECK, emptyIsFatal }) {
  if (emptyIsFatal && !rows.length) {
    return result(2,
      { mode: CHECK ? "check" : "write", [noun]: 0, error: `${label} returned ZERO rows` },
      `export-governance-snapshot: ${label} returned ZERO rows. Exiting 2 (cannot run) rather than writing an empty snapshot -- an empty registry would silently disarm every truth check that reads it.`
    );
  }

  const { text, hash } = buildFn(rows);
  const existing = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : null;
  const existed = existing !== null;
  const changed = existing !== text;

  if (CHECK) {
    if (!changed) {
      return result(0,
        { mode: "check", [noun]: rows.length, sha256: hash, changed: false, outPath },
        `export-governance-snapshot --check: no drift -- ${outPath} matches ${label} (${rows.length} ${noun}, sha256 ${hash}).`
      );
    }
    return result(1,
      { mode: "check", [noun]: rows.length, sha256: hash, changed: true, outPath },
      `export-governance-snapshot --check: DRIFT -- ${outPath} ${existed ? "does not match" : "is missing; "} ${label} currently has ${rows.length} ${noun} (sha256 ${hash}). Regenerate with: node scripts/export-governance-snapshot.js`
    );
  }

  if (!changed) {
    return result(0,
      { mode: "write", [noun]: rows.length, sha256: hash, changed: false, outPath },
      `export-governance-snapshot: unchanged -- ${outPath} already matches ${label} (${rows.length} ${noun}, sha256 ${hash}). Not touching the file.`
    );
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, text, "utf8");
  return result(0,
    { mode: "write", [noun]: rows.length, sha256: hash, changed: true, created: !existed, outPath },
    `export-governance-snapshot: ${existed ? "updated" : "created"} ${outPath} (${rows.length} ${noun}, sha256 ${hash}).`
  );
}

async function main() {
  const outArg = arg("out", "docs/governance/RULES-SNAPSHOT.md");
  const outPath = path.isAbsolute(outArg) ? outArg : path.join(WORKTREE, outArg);
  const lanesOutArg = arg("lanes-out", "docs/governance/MODEL-LANES-SNAPSHOT.md");
  const lanesOutPath = path.isAbsolute(lanesOutArg) ? lanesOutArg : path.join(WORKTREE, lanesOutArg);
  const CHECK = process.argv.includes("--check");

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    const missing = [!supabaseUrl && "SUPABASE_URL", !supabaseKey && "SUPABASE_SERVICE_KEY"].filter(Boolean).join(", ");
    if (JSON_OUT) console.log(JSON.stringify({ ok: false, exitCode: 2, error: `missing required env var(s): ${missing}` }));
    else console.error(`export-governance-snapshot: missing required env var(s): ${missing}. Exiting 2 (cannot run) -- this is NOT a pass, nothing was fetched.`);
    process.exit(2);
  }

  const [rulesFetch, lanesFetch] = await Promise.all([
    fetchAllRules(supabaseUrl, supabaseKey),
    fetchAllLanes(supabaseUrl, supabaseKey),
  ]);

  const results = [];

  if (rulesFetch.error) {
    results.push(result(2, { table: "governance_rules", error: rulesFetch.error },
      `export-governance-snapshot: ${rulesFetch.error}\nExiting 2 (cannot run) -- this is NOT a pass, the registry was never fully fetched.`));
  } else {
    results.push(processSnapshot({
      label: "the registry", noun: "rules", rows: rulesFetch.rules, buildFn: buildDocument,
      outPath, CHECK, emptyIsFatal: true,
    }));
  }

  if (lanesFetch.error) {
    results.push(result(2, { table: "runner_model_lanes", error: lanesFetch.error },
      `export-governance-snapshot: ${lanesFetch.error}\nExiting 2 (cannot run) -- this is NOT a pass, runner_model_lanes was never fully fetched.`));
  } else {
    results.push(processSnapshot({
      label: "runner_model_lanes", noun: "lanes", rows: lanesFetch.lanes, buildFn: buildLanesDocument,
      outPath: lanesOutPath, CHECK, emptyIsFatal: true,
    }));
  }

  const code = Math.max(...results.map(r => r.code));
  if (JSON_OUT) {
    console.log(JSON.stringify({ ok: code === 0, exitCode: code, results: results.map(r => ({ ...r.summary })) }));
  } else {
    for (const r of results) console.log(r.prose);
  }
  process.exit(code);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}
