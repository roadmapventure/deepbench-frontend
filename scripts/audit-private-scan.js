#!/usr/bin/env node
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
// Usage: node scripts/audit-private-scan.js [--out=<json>]
// Exit codes: 0 ran; 2 could not run (not a git checkout).

import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
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
  { kind: "vercel_bypass", group: 2,
    re: new RegExp("(bypass[\\s\\S]{0,80}?(?:value|secret)\\s*[:=]\\s*[`\"']?)" + NOT_PLACEHOLDER +
      "([A-Za-z0-9_-]{16,})", "gi") },
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
  { re: /SUPABASE_URL/, reason: "the project URL is public by design" },
  { re: /^sb_publishable_/, reason: "the publishable key ships in the browser bundle by design" },
];

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
        if (ALLOWLIST.some(a => a.re.test(value))) continue;
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
        if (v && h.text.includes(v) && !ALLOWLIST.some(a => a.re.test(v))) h.text = h.text.split(v).join(mask(v));
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

// Tracked files only (`git ls-files -z`), binary skipped by a NUL byte in the first 8 KB.
export function scanTree(rootAbs = ROOT) {
  const listed = execFileSync("git", ["-C", rootAbs, "ls-files", "-z"], { maxBuffer: 64 * 1024 * 1024 });
  const rels = listed.toString("utf8").split("\0").filter(Boolean);
  const hits = [];
  for (const rel of rels) {
    let buf;
    try { buf = fs.readFileSync(path.join(rootAbs, rel)); } catch { continue; }
    if (buf.subarray(0, BINARY_PROBE_BYTES).includes(0)) continue;
    hits.push(...scanText(rel, buf.toString("utf8")));
  }
  return aggregate(hits);
}

function arg(argv, name) {
  const hit = argv.find(a => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return undefined;
  const eq = hit.indexOf("=");
  return eq < 0 ? true : hit.slice(eq + 1);
}

async function main() {
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
