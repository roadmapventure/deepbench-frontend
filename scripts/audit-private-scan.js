#!/usr/bin/env node
// DeepBench v7.0.613 | scripts/audit-private-scan.js | AGT-168 slice 1 -- THE SCAN CAN NOW GRADE A
// CHANGE INSTEAD OF THE TREE, which is what lets CI run it at all. THIS IS PURELY ADDITIVE: every
// line before the `--- AGT-168` divider further down is unchanged, so scanTree(), scanText(),
// trackedFiles(), DETECTORS, ALLOWLIST and aggregate() behave exactly as they did, and a run with
// no `--base` still prints `private-scan N findings` and exits 0 (measured at the ship: 17
// findings, exit 0, before and after).
//
// WHY A SECOND ENTRY POINT RATHER THAN WIRING scanTree() INTO CI. Measured on this tree at the
// ship, not recalled: 42 lines across 42 tracked files (48 hits, 6 false positives before AGT-196)
// already carry a `vercel_bypass` value --
// every one of them historical residue under docs/kickoffs/, newest v7.0.85, so the literal
// stopped propagating on its own. A CI step calling scanTree() would report those 48 standing
// lines on every single run and be red forever, and a check that is always red is a check nobody
// reads. THE GATE GRADES THE CHANGE, NEVER THE LIVE WORLD. The unit is the ADDED LINE, not the
// changed file: editing line 10 of a kickoff that carries the literal on line 155 stays green,
// and only a line this change adds can go red.
//
// THIS IS PROPHYLACTIC AND SAYS SO OUT LOUD: it stops the next line and removes none of the 42.
// Purging the existing ones is a 42-file edit that needs John's own waiver of the 3-file cap,
// and rotating the live bypass value is his alone. Neither is done here.
//
// FAIL CLOSED ON AN UNRESOLVABLE BASE -- exit 2, the same "could not run, never a pass" the
// tracked-listing failure already uses. An empty or absent `--base` VALUE is that case too: in CI
// it is the shape a missing default variable takes, and degrading it into the whole-tree run's
// exit 0 would be a gate reporting green on a scan it never performed.
//
// THE VALUE STILL NEVER LEAVES THE PROCESS. scanChange() hands every added line through the same
// scanText(), so a hit arrives already masked to its first four characters; the change-scoped
// printer emits that masked text and nothing else. Guarded by
// tests/regression/AGT-168-private-scan-change-scoped.js.
//
// Usage: node scripts/audit-private-scan.js [--out=<json>] [--base=<rev>]
// Exit codes: 0 ran clean; 1 the change added private info (--base only); 2 could not run.
// DeepBench v7.0.562 | scripts/audit-private-scan.js | AGT-100 -- trackedFiles() is THE tracked-file
// listing, and now the SHARED CORE: scanTree() below and walkRoot() in scripts/audit-corpus.js both
// mean "the files git tracks under this root", and two walkers answering that question separately
// drift. One core, two callers. Kickoff: docs/kickoffs/v7.0.562-AGT-100-extra-root-tracked-only.md.
//
// DeepBench v7.0.550 | scripts/audit-private-scan.js | AGT-86 slice 6
// FEATURE: AGT-86 slice 6 -- the private-info scan. The Auditor's full review reads THIS repo, and
// this repo is public: a credential, a personal address or a home-directory path in a tracked file
// is published the moment it is pushed. This module finds them deterministically (no model call,
// $0) and hands them to the ledger as ordinary `kind: "other"` findings under one check slug.
//
// THE DETECTOR TABLE IS C:/Projects/claude-config/sync.mjs's (AGT-86 slice 5, lines 21-40), copied
// rather than imported because that repo is a sibling clone and never a dependency of this one --
// the cloud routine may run with only this repo checked out. Two rows are added for what a public
// repo leaks that a config copy does not: `personal_email` (a personal-mail domain) and
// `personal_path` (a home directory). ORDER MATTERS, as in the source: the specific token formats
// fire first, and a later detector never re-reports a value an earlier one already took on that
// line (the `x-vercel-protection-bypass: <value>` header is one hit, not a vercel_bypass AND a
// secret_assignment).
//
// secret_assignment IS NARROWED, and measured: on 1,626 tracked files the generic KEY/TOKEN rule
// hit 15 lines, all false positives (identifiers, placeholders, prose). So a name carrying only
// KEY or TOKEN now needs a value with a DIGIT in it; a name carrying BYPASS, SECRET or PASSWORD
// keeps the wide rule, because the live bypass secret is 32 mixed-case letters with no digit.
//
// THE VALUE NEVER LEAVES THIS PROCESS. A finding carries the line with the value masked to its first
// four characters plus `****`; stdout carries counts only. A test asserts no finding text contains
// a planted value.
//
// OVER AGGREGATE_OVER (25) HITS OF ONE DETECTOR -> ONE finding at the stable location
// `audit-private/<detector>`, the AGT-86 slice 4 rule: the ledger is append-only, and 44 rows for
// one leaked value is board flooding. The stable location is what makes fingerprint() hold week to
// week while the line numbers move underneath it.
//
// Usage (as of AGT-168, superseded by the header above): node scripts/audit-private-scan.js [--out=<json>]
// Exit codes: 0 ran; 2 could not run (not a git checkout).

import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const CHECK_SLUG = "config-private-in-public";
export const AGGREGATE_OVER = 25;
const BINARY_PROBE_BYTES = 8192;

// --- the detector table (sync.mjs:21-40 + two public-repo rows) --------------------------------
const NOT_PLACEHOLDER = "(?!<REDACTED:)";
const NOT_REFERENCE = "(?!process\\.env|\\$|%|<REDACTED:)";
export const DETECTORS = [
  { kind: "pem_private_key", group: 0,
    re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
  { kind: "anthropic_key", group: 0, re: /\bsk-ant-[A-Za-z0-9_-]{16,}/g },
  { kind: "openai_key", group: 0, re: /\bsk-(?!ant-)[A-Za-z0-9_-]{20,}/g },
  { kind: "supabase_secret", group: 0, re: /\bsb_secret_[A-Za-z0-9_-]{10,}/g },
  { kind: "github_token", group: 0, re: /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/g },
  { kind: "jwt", group: 0, re: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g },
  { kind: "aws_key", group: 0, re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g },
  { kind: "vercel_bypass", group: 2,
    re: new RegExp("(x-vercel-protection-bypass[\"'`]?\\s*[:=]\\s*\\\\?[\"']?)" + NOT_PLACEHOLDER +
      "([^\\s\"'`\\\\<>&]{8,})", "gi") },
  // AGT-196: `(?!\s*\()` -- a capture immediately followed by a call's `(` is the CALLEE, never a
  // value (`const BYPASS_SECRET = loadBypassSecret();`). This is the syntactic discriminator that the
  // mixed-case class needs, and it belongs HERE rather than in the ALLOWLIST: the live bypass value is
  // itself 32 mixed-case alphanumerics, so widening the identifier row to `/^[A-Za-z][A-Za-z0-9_]+$/`
  // would allowlist all 42 real hits and silently delete the detector (measured, AGT-196 item 4).
  // `(?![A-Za-z0-9_-])` is what makes the lookahead bite: without it the greedy class BACKTRACKS one
  // character to dodge the `(`, so a callee of 17+ characters still reports as a shortened value
  // (measured: `loadTheBypassSecretX()` reported 19 of its 20 characters). Pinned to the maximal
  // identifier run first, the pair reports the whole name or nothing.
  { kind: "vercel_bypass", group: 2,
    re: new RegExp("(bypass[\\s\\S]{0,80}?(?:value|secret)\\s*[:=]\\s*[`\"']?)" + NOT_PLACEHOLDER +
      "([A-Za-z0-9_-]{16,})(?![A-Za-z0-9_-])(?!\\s*\\()", "gi") },
  { kind: "secret_assignment", group: 2,
    re: new RegExp("([A-Za-z0-9_.-]*(?:KEY|TOKEN|SECRET|PASSWORD|BYPASS)[A-Za-z0-9_]*\\\\?[\"']?\\s*[:=]\\s*\\\\?[\"']?)" +
      NOT_REFERENCE + "([^\\s\"'`,;)\\\\<>]{16,})", "gi"),
    accept: (name, value) => {
      if (!/^[A-Za-z0-9_-]{16,}$/.test(value)) return false;   // token-shaped, never an expression
      if (/BYPASS|SECRET|PASSWORD/i.test(name)) return true;
      return /[0-9]/.test(value);
    } },
  { kind: "personal_email", group: 0,
    re: /\b[A-Za-z0-9._%+-]+@(?:gmail|yahoo|outlook|hotmail|icloud|proton|protonmail|aol|live|me)\.com\b/gi,
    accept: (_name, value) => !/^noreply@/i.test(value) },
  { kind: "personal_path", group: 0,
    re: /(?:\b[A-Za-z]:(?:\\{1,2}|\/)Users(?:\\{1,2}|\/)|(?<![A-Za-z0-9_.-])\/Users\/)[A-Za-z0-9][A-Za-z0-9._-]*/g },
];

// Tested against the VALUE a detector captured. A hit whose value matches any row is not a leak.
export const ALLOWLIST = [
  { re: /your_[a-z_]+_here/i, reason: "placeholder (your_..._here)" },
  { re: /…/, reason: "placeholder (ellipsis)" },
  { re: /<[^>]*>/, reason: "placeholder (<...>)" },
  { re: /^[A-Z][A-Z0-9_]+$/, reason: "identifier -- names the variable, not its value" },
  { re: /^(?:process\.)?env\./, reason: "environment reference" },
  { re: /\$\{/, reason: "template reference" },
  // AGT-196: a brace-less shell reference. `docs/runbooks/mcp-server.md` documents the curl as
  // `-H "x-vercel-protection-bypass: $VERCEL_AUTOMATION_BYPASS_SECRET"`, which names the variable
  // and never its value -- but it carries no `${`, so the template row above never saw it.
  { re: /^\$[A-Za-z_][A-Za-z0-9_]*$/, reason: "shell variable reference -- names the variable, not its value" },
  { re: /SUPABASE_URL/, reason: "the project URL is public by design" },
  { re: /^sb_publishable_/, reason: "the publishable key ships in the browser bundle by design" },
];

// AGT-196 -- THE ONE ALLOWLIST ENTRY POINT. Every allowlist question in this module goes through
// here, so the skip guard in scanText() and its re-masking loop can never disagree about whether a
// value is a leak: a value the guard declined to report would otherwise be re-masked (harmless) or,
// worse, a value the guard allowlisted on the stripped form would stay unmasked in a neighbouring
// hit's text. One function, two callers.
//
// THE TRAILING-PUNCTUATION STRIP is the fix's other half. A detector's value class is deliberately
// wide -- row 1 accepts anything that is not whitespace or a quote -- so a header written in JS
// (`"x-vercel-protection-bypass": BYPASS_SECRET,`) hands the allowlist `BYPASS_SECRET,` WITH the
// comma, and `/^[A-Z][A-Z0-9_]+$/` does not match it. The identifier row is correct; what reached it
// was not. So every row is tested against the value AND against the value with trailing `,;.:)]}`
// removed, and the ROWS THEMSELVES ARE UNCHANGED -- widening a row to tolerate punctuation would
// widen what it accepts everywhere else too.
//
// Returns the matching row's `reason` (a string a report can print) or null. Never the value.
export function allowlistReason(value) {
  const v = String(value ?? "");
  const stripped = v.replace(/[,;.:)\]}]+$/, "");
  for (const a of ALLOWLIST) {
    if (a.re.test(v) || a.re.test(stripped)) return a.reason;
  }
  return null;
}

export function mask(value) {
  return `${String(value).slice(0, 4)}****`;
}

// Pure: one file's text in, hits out. A hit is {detector, location, rel, line, text}; `text` is
// already masked -- the raw value is never returned.
export function scanText(rel, text) {
  const hits = [];
  const lines = String(text).replace(/\r\n/g, "\n").split("\n");
  lines.forEach((line, idx) => {
    const taken = new Set();
    const seenKind = new Set();
    for (const d of DETECTORS) {
      d.re.lastIndex = 0;
      let m;
      const values = [];
      while ((m = d.re.exec(line)) !== null) {
        if (m[0].length === 0) { d.re.lastIndex++; continue; }
        const value = d.group === 0 ? m[0] : m[d.group];
        const name = d.group === 0 ? "" : (m[1] ?? "");
        if (!value || taken.has(value)) continue;
        if (d.accept && !d.accept(name, value)) continue;
        if (allowlistReason(value)) continue;   // AGT-196: one entry point, punctuation stripped
        values.push(value);
      }
      if (!values.length) continue;
      values.forEach(v => taken.add(v));
      if (seenKind.has(d.kind)) continue;   // one hit per detector per line
      seenKind.add(d.kind);
      let shown = line;
      for (const v of taken) shown = shown.split(v).join(mask(v));
      shown = shown.trim();
      if (shown.length > 200) shown = `${shown.slice(0, 200)}…`;
      hits.push({ detector: d.kind, rel, line: idx + 1, location: `${rel}:${idx + 1}`, text: `${d.kind}: ${shown}` });
    }
  });
  // A value taken by a later detector on the same line may appear unmasked in an earlier hit's text.
  for (const h of hits) {
    const line = lines[h.line - 1];
    for (const d of DETECTORS) {
      d.re.lastIndex = 0;
      let m;
      while ((m = d.re.exec(line)) !== null) {
        if (m[0].length === 0) { d.re.lastIndex++; continue; }
        const v = d.group === 0 ? m[0] : m[d.group];
        if (v && h.text.includes(v) && !allowlistReason(v)) h.text = h.text.split(v).join(mask(v));
      }
    }
  }
  return hits;
}

const governingFact = detector => `${detector} must not appear in a public repo`;

// Pure: hits in, findings out. Over AGGREGATE_OVER hits of one detector -> one finding.
export function aggregate(hits) {
  const byDetector = new Map();
  for (const h of hits) {
    if (!byDetector.has(h.detector)) byDetector.set(h.detector, []);
    byDetector.get(h.detector).push(h);
  }
  const findings = [];
  for (const [detector, list] of [...byDetector.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (list.length > AGGREGATE_OVER) {
      const files = [...new Set(list.map(h => h.rel))].sort();
      findings.push({
        check_slug: CHECK_SLUG,
        kind: "other",
        locations: [{ location: `audit-private/${detector}`, text: `${list.length} lines in ${files.length} files: ${files.join(", ")}` }],
        governing_fact: governingFact(detector),
        confidence: "high",
        proposed_resolution: `${list.length} lines in ${files.length} files carry a ${detector} value -- rotate it once, remove every copy from the tracked files, and keep it only in server-held config`,
      });
      continue;
    }
    for (const h of list) {
      findings.push({
        check_slug: CHECK_SLUG,
        kind: "other",
        locations: [{ location: h.location, text: h.text }],
        governing_fact: governingFact(detector),
        confidence: "high",
        proposed_resolution: `remove the ${detector} value from ${h.rel} (rotate it if it is a credential) and keep it only in server-held config`,
      });
    }
  }
  return findings;
}

// AGT-100 -- the paths `git ls-files -z` reports under rootAbs: relative to it, forward-slash, already
// sorted, ignored and untracked files absent, a tracked .gitignore present. Returns null for the ONE
// condition a caller may read as "there is no tracked listing here" -- rootAbs is not a git checkout.
// EVERY OTHER git failure THROWS, and that is the load-bearing half: a caller that fell back to a disk
// walk because git errored would read exactly the untracked files this function exists to exclude, so
// it fails closed (git missing, a permissions error, a broken index are all raised, never swallowed).
export function trackedFiles(rootAbs) {
  const r = spawnSync("git", ["-C", rootAbs, "ls-files", "-z"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.error) throw r.error;
  if (r.status !== 0) {
    if (/not a git repository/i.test(r.stderr ?? "")) return null;
    throw new Error(String(r.stderr ?? "").split("\n")[0] || `git ls-files exited ${r.status}`);
  }
  return r.stdout.split("\0").filter(Boolean);
}

// Tracked files only (trackedFiles(), `git ls-files -z`), binary skipped by a NUL byte in the first 8 KB.
export function scanTree(rootAbs = ROOT) {
  const rels = trackedFiles(rootAbs);
  // THIS repo is always a checkout, so null is a broken invocation, never a reason to scan the disk:
  // main()'s catch turns it into the exit-2 "could not run" line, never a clean "0 findings".
  if (rels === null) throw new Error("not a git checkout");
  const hits = [];
  for (const rel of rels) {
    let buf;
    try { buf = fs.readFileSync(path.join(rootAbs, rel)); } catch { continue; }
    if (buf.subarray(0, BINARY_PROBE_BYTES).includes(0)) continue;
    hits.push(...scanText(rel, buf.toString("utf8")));
  }
  return aggregate(hits);
}

// --- AGT-168: the change-scoped half ----------------------------------------------------------

// The `+` lines of `git diff --unified=0 <baseRev> HEAD`, as [{rel, line, text}] with `line` the
// REAL new-file line number read off each hunk header (`@@ -a,b +c,d @@` -> the next added line is
// c, then c+1, ...). `--unified=0` is what makes that arithmetic exact: with no context lines in
// the hunk, every line after the header is an addition or a deletion and nothing else.
//
// THROWS RATHER THAN RETURNING EMPTY when baseRev will not resolve, and that is the load-bearing
// half -- the same reasoning trackedFiles() already carries. An unresolvable base returning `[]`
// would read as "this change added nothing private", which is a gate passing a scan it never ran.
// CI clones at depth 1 (actions/checkout@v4 with no fetch-depth, SES-393), so the base object is
// genuinely absent there until the workflow fetches it, and that is exactly the case that must be
// loud.
export function addedLines(baseRev, rootAbs = ROOT) {
  const rev = String(baseRev ?? "");
  // A rev starting with `-` would be read by git as an option, never a commit.
  if (!rev || rev.startsWith("-")) throw new Error(`not a usable base revision: "${rev}"`);

  const resolved = spawnSync("git", ["-C", rootAbs, "rev-parse", "--verify", "--quiet", `${rev}^{commit}`],
    { encoding: "utf8" });
  if (resolved.error) throw resolved.error;
  if (resolved.status !== 0 || !resolved.stdout.trim()) {
    throw new Error(`base revision does not resolve to a commit in this checkout: ${rev}`);
  }

  const r = spawnSync("git",
    ["-C", rootAbs, "-c", "core.quotePath=false", "diff", "--unified=0", "--no-color", "--no-ext-diff",
      resolved.stdout.trim(), "HEAD"],
    { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(String(r.stderr ?? "").split("\n")[0] || `git diff exited ${r.status}`);

  const added = [];
  let rel = null;
  let next = 0;
  let prev = "";
  for (const raw of r.stdout.split("\n")) {
    // `+++ b/<path>` is a file header only where the previous line was its `--- ` twin. An ADDED
    // line whose own text begins with `++ ` arrives here as `+++ ...` and would otherwise be read
    // as a header, silently retargeting every hit after it.
    if (raw.startsWith("+++ ") && prev.startsWith("--- ")) {
      const target = raw.slice(4).trim();
      // /dev/null is a deletion: it adds no lines, and its hunks must not be attributed to
      // whatever file was named before it.
      rel = target === "/dev/null" ? null : target.replace(/^b\//, "").replace(/^"|"$/g, "");
      next = 0;
      prev = raw;
      continue;
    }
    prev = raw;
    if (raw.startsWith("--- ") || raw.startsWith("diff --git ")) continue;
    if (raw.startsWith("@@")) {
      const m = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(raw);
      next = m ? Number(m[1]) : 0;
      continue;
    }
    if (!rel || !next) continue;
    if (raw.startsWith("+")) {
      added.push({ rel, line: next, text: raw.slice(1) });
      next += 1;
    }
    // `-` lines and `\ No newline at end of file` consume no new-file line number.
  }
  return added;
}

// Hits (NOT findings -- no aggregate(), because a change-scoped run reports every added line it
// caught and one is already too many) for the lines this change added since baseRev. Each added
// line goes through the SAME scanText() the whole-tree path uses, so the detector table, the
// allowlist, the one-hit-per-detector-per-line rule and the masking are shared rather than
// reimplemented; scanText() numbers a lone line as 1, so the real new-file number is remapped back
// on to `line` and `location` here.
export function scanChange(baseRev, rootAbs = ROOT) {
  const hits = [];
  for (const a of addedLines(baseRev, rootAbs)) {
    for (const h of scanText(a.rel, a.text)) {
      h.line = a.line;
      h.location = `${a.rel}:${a.line}`;
      hits.push(h);
    }
  }
  return hits;
}

function arg(argv, name) {
  const hit = argv.find(a => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return undefined;
  const eq = hit.indexOf("=");
  return eq < 0 ? true : hit.slice(eq + 1);
}

async function main() {
  // AGT-168: the change-scoped gate, handled FIRST and returning before the ledger import -- CI
  // runs this path on a bare checkout, and a gate that needs a second module to load is a gate
  // with one more way to die than it has jobs.
  const base = arg(process.argv.slice(2), "base");
  if (base !== undefined) {
    if (typeof base !== "string" || base.trim() === "") {
      console.error("audit-private-scan: --base needs a revision (exit 2 = could not run, never a pass).");
      process.exit(2);
    }
    let hits;
    try {
      hits = scanChange(base.trim(), ROOT);
    } catch (e) {
      console.error(`audit-private-scan: could not scan the change (${e.message.split("\n")[0]}) (exit 2 = could not run, never a pass).`);
      process.exit(2);
    }
    // Already masked by scanText() -- the raw value never reaches this printer.
    for (const h of hits) console.log(`  ${h.location}  ${h.text}`);
    console.log(`private-scan (change-scoped) ${hits.length} hits vs ${base.trim()}`);
    if (hits.length > 0) {
      console.error(
        "This change ADDS private info to a public repo. Remove the value from the added line and keep " +
        "it only in server-held config; rotate it if it is a live credential. The standing lines this " +
        "scan deliberately ignores are AGT-168's later slice, not yours.");
    }
    process.exit(hits.length > 0 ? 1 : 0);
  }

  const { isoWeek } = await import("./audit-ledger.js");
  let findings;
  try {
    findings = scanTree(ROOT);
  } catch (e) {
    console.error(`audit-private-scan: could not list tracked files (${e.message.split("\n")[0]}) (exit 2 = could not run, never a pass).`);
    process.exit(2);
  }
  const out = arg(process.argv.slice(2), "out");
  if (typeof out === "string") {
    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    fs.writeFileSync(path.resolve(out), JSON.stringify({ week: isoWeek(new Date()), found_by: "auditor:private-scan", findings }, null, 2), "utf8");
  }
  console.log(`private-scan ${findings.length} findings`);
  process.exit(0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main();
}
