#!/usr/bin/env node
/**
 * scripts/check-decision-pattern-quotes.js  (SES-90 — Tooling · P10 - Tooling)
 *
 * Ship gate for docs/JOHN-DECISION-PATTERNS.md: every quoted phrase inside a criterion's
 * "Seen in:" evidence that points at an IN-REPO corpus must appear verbatim in that corpus.
 * The file exists because a fabricated or half-remembered instance teaches a wrong prior to
 * every autonomous decision downstream (three near-miss fabrications preceded this gate).
 *
 * Rules:
 *  - Corpora: docs/SESSIONS.md and docs/FEATURES-ARCHIVE.md (the file's own footer contract),
 *    plus docs/harvests/*.md — also in-repo and greppable; the seed set (criteria 1–5) grounds
 *    its `design-log-38-0724` quotes there. A quote passes if it appears in any corpus file.
 *  - Entries whose "Seen in:" cites the local session archive (the SES-90 pass — matched by
 *    the phrase "local archive" or a `~/.claude/projects` / C--Projects/<uuid>.jsonl path) are
 *    SKIPPED with a count: that archive is not in git and cannot be checked here.
 *  - "The seed set" section (criteria 1–5, distilled live in `design-log-38-0724` before this
 *    file's corpus contract existed) is SKIPPED with its own count — its conversation was never
 *    recorded in an in-repo corpus, and re-litigating it here would fail entries that were
 *    correct when written. New entries never get this exemption.
 *  - If an outer quote is not found, its inner 'single-quoted' segments are tried instead —
 *    the doc marks the verbatim kernel with inner quotes when the outer text is paraphrase.
 *  - Matching normalizes whitespace and curly quotes/apostrophes on both sides, and strips the
 *    quote's leading/trailing punctuation (American style places the sentence's own .,;: inside
 *    the closing quote mark — that punctuation belongs to the doc, not the recorded exchange).
 *  - Quotes shorter than MIN_QUOTE_LEN are ignored (too generic to discriminate).
 *
 * Exit 0: all checkable quotes found. Exit 1: any missing quote (each listed), or the doc /
 * a corpus file is unreadable. Plain Node, no dependencies. Run from anywhere:
 *   node scripts/check-decision-pattern-quotes.js [--repo <repo-root>]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MIN_QUOTE_LEN = 8;

// --- locate the repo root -----------------------------------------------------------------
let repoRoot = null;
const argv = process.argv.slice(2);
const ri = argv.indexOf('--repo');
if (ri !== -1 && argv[ri + 1]) repoRoot = path.resolve(argv[ri + 1]);
if (!repoRoot) {
  // walk up from this script's own location (scripts/ -> repo root), then from cwd
  const starts = [path.dirname(__dirname), process.cwd()];
  for (const start of starts) {
    let dir = start;
    for (let i = 0; i < 6; i++) {
      if (fs.existsSync(path.join(dir, 'docs', 'JOHN-DECISION-PATTERNS.md'))) { repoRoot = dir; break; }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    if (repoRoot) break;
  }
}
if (!repoRoot) {
  console.error('check-decision-pattern-quotes: cannot locate repo root (docs/JOHN-DECISION-PATTERNS.md). Pass --repo <path>.');
  process.exit(1);
}

const DOC = path.join(repoRoot, 'docs', 'JOHN-DECISION-PATTERNS.md');
const CORPORA = [
  path.join(repoRoot, 'docs', 'SESSIONS.md'),
  // docs/SESSIONS.md's OWN ARCHIVED HALF, and leaving it out is what made this gate red for
  // 60 quotes (SES-246, v7.0.328). Commit 0de0ea57 (v7.0.213, "SESSIONS.md rotated") moved the
  // pre-2026-06-07 history out of docs/SESSIONS.md into this file -- AFTER SES-79 and SES-90 had
  // cited those passages against docs/SESSIONS.md. The quotes did not become fabricated; the
  // corpus moved out from under them, and the list here was never updated with it. Measured on
  // an unedited origin/dev@3864a154: 60 failures, 55 of them resolved by this one line, ZERO
  // ungroundable anywhere in the repo.
  // THIS IS THE ROTATION-SHAPED HOLE, NOT A ONE-OFF: the next rotation will do it again unless
  // the archives are picked up by pattern. Hence the glob below rather than a second literal.
  path.join(repoRoot, 'docs', 'FEATURES-ARCHIVE.md'),
];
// Any further docs/SESSIONS-ARCHIVE-*.md rotations join automatically. Deliberately a prefix
// match on SESSIONS-ARCHIVE rather than "every .md in docs/": widening the corpus to the whole
// tree would let a quote ground against a kickoff doc, a vision file -- or against
// JOHN-DECISION-PATTERNS.md ITSELF, which would make every quote trivially self-grounding and
// the gate vacuous. The corpus is session HISTORY plus harvests, and nothing else.
for (const f of fs.readdirSync(path.join(repoRoot, 'docs'))) {
  if (/^SESSIONS-ARCHIVE-.*\.md$/.test(f)) CORPORA.push(path.join(repoRoot, 'docs', f));
}
// docs/harvests/*.md are in-repo session harvests — the seed set's quotes live there.
const harvestsDir = path.join(repoRoot, 'docs', 'harvests');
if (fs.existsSync(harvestsDir)) {
  for (const f of fs.readdirSync(harvestsDir)) {
    if (f.endsWith('.md')) CORPORA.push(path.join(harvestsDir, f));
  }
}

function readOrDie(p) {
  try { return fs.readFileSync(p, 'utf8'); }
  catch (e) { console.error(`check-decision-pattern-quotes: cannot read ${p}: ${e.message}`); process.exit(1); }
}

// Normalize for matching: curly quotes/apostrophes -> straight, collapse all whitespace runs.
function normalize(s) {
  return s
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/\s+/g, ' ')
    .trim();
}

const doc = readOrDie(DOC);
const corpusText = CORPORA.map(p => normalize(readOrDie(p)));

// --- split the doc into numbered criterion entries ----------------------------------------
// Entries start with a bold number: **N. ...** ; everything until the next entry/section rule.
const entryRe = /^\*\*(\d+)\.\s/m;
// Determine the seed-set section's span so its entries can be exempted (see header).
let seedStart = -1, seedEnd = -1;
const seedHeading = doc.match(/^##\s+The seed set.*$/m);
if (seedHeading) {
  seedStart = seedHeading.index;
  const nextHeading = doc.slice(seedStart + seedHeading[0].length).search(/^##\s+/m);
  seedEnd = nextHeading === -1 ? doc.length : seedStart + seedHeading[0].length + nextHeading;
}
const parts = doc.split(/^(?=\*\*\d+\.\s)/m);
const entries = [];
let cursor = 0;
for (const part of parts) {
  const m = part.match(entryRe);
  if (m) {
    const pos = doc.indexOf(part, cursor);
    // An entry ends at the next entry, heading, or horizontal rule — otherwise the last entry
    // of a section swallows whatever follows it (found live: the SES-90 amendments subsection
    // merged into #100's text, and its "local archive" phrase silently flipped #100 to skipped).
    const cut = part.search(/\r?\n(?:#{2,3}\s|---\s*(?:\r?\n|$))/);
    const text = cut === -1 ? part : part.slice(0, cut);
    entries.push({ num: Number(m[1]), text, seed: pos >= seedStart && pos < seedEnd && seedStart !== -1 });
    cursor = pos + 1;
  }
}

const LOCAL_ARCHIVE_RE = /local archive|~\/\.claude\/projects|C--Projects\/[0-9a-f-]+\.jsonl/i;

// Extract quoted phrases from an entry's "Seen in:" portion(s).
// Quotes are written with straight or curly double quotes in this doc.
function extractQuotes(seenText) {
  const quotes = [];
  const re = /[“"]([^“”"]+)[”"]/g;
  let m;
  while ((m = re.exec(seenText)) !== null) {
    // Strip the doc's own punctuation riding inside the closing quote mark.
    const q = normalize(m[1]).replace(/^[\s.,;:!?…—-]+|[\s.,;:!?…—-]+$/g, '');
    if (q.length >= MIN_QUOTE_LEN) quotes.push(q);
  }
  return quotes;
}

// Inner 'single-quoted' verbatim kernels inside an outer paraphrase quote.
function extractInner(q) {
  const inner = [];
  const re = /'([^']{8,})'/g;
  let m;
  while ((m = re.exec(q)) !== null) {
    const k = m[1].replace(/^[\s.,;:!?…—-]+|[\s.,;:!?…—-]+$/g, '');
    if (k.length >= MIN_QUOTE_LEN) inner.push(k);
  }
  return inner;
}

let checkedEntries = 0, skippedLocal = 0, skippedSeed = 0, checkedQuotes = 0, noQuoteEntries = 0;
const failures = [];

for (const entry of entries) {
  // \s+ not a space: the doc hard-wraps at ~100 cols and can split "*Seen in:*" across a line
  // break (found live on entry #112, which silently fell out of both the checked and skipped sets).
  const seenIdx = entry.text.search(/\*Seen\s+in:/);
  const seenText = seenIdx === -1 ? '' : entry.text.slice(seenIdx);
  if (entry.seed) { skippedSeed++; continue; }
  if (!seenText) { noQuoteEntries++; continue; }

  // Normalize before testing: the doc hard-wraps at ~100 cols, so "local archive" can be
  // split across a line break — the raw text would miss it (found live on entries 101/104/118/128).
  if (LOCAL_ARCHIVE_RE.test(normalize(seenText))) { skippedLocal++; continue; }

  const quotes = extractQuotes(seenText);
  if (quotes.length === 0) { noQuoteEntries++; continue; }

  checkedEntries++;
  for (const q of quotes) {
    checkedQuotes++;
    let found = corpusText.some(c => c.includes(q));
    if (!found) {
      // Fallback: the outer quote is paraphrase; check its inner verbatim kernels.
      const kernels = extractInner(q);
      found = kernels.length > 0 && kernels.every(k => corpusText.some(c => c.includes(k)));
    }
    if (!found) failures.push({ num: entry.num, quote: q });
  }
}

console.log(`Entries parsed: ${entries.length}`);
console.log(`In-repo entries checked: ${checkedEntries} (${checkedQuotes} quoted phrases)`);
console.log(`Local-archive entries skipped (not in git, by design): ${skippedLocal}`);
console.log(`Seed-set entries skipped (pre-contract, see header): ${skippedSeed}`);
console.log(`Entries with no extractable quote (paraphrase-only evidence): ${noQuoteEntries}`);

if (failures.length > 0) {
  console.error(`\nFAIL — ${failures.length} quoted phrase(s) not found verbatim in any in-repo corpus (docs/SESSIONS.md, docs/FEATURES-ARCHIVE.md, docs/harvests/*.md):`);
  for (const f of failures) {
    console.error(`  #${f.num}: "${f.quote}"`);
  }
  console.error('\nA quote that cannot be grepped back to its corpus is treated as fabricated. Fix the quote or the citation.');
  process.exit(1);
}

console.log('\nPASS — every checkable quote grounds to its corpus.');
process.exit(0);
