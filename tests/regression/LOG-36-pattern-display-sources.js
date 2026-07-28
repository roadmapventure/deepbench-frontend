// DeepBench v6.3.171 | tests/regression/LOG-36-pattern-display-sources.js | ABT-1a -- About screen: single Architecture tab, live-wired rebuild
// DeepBench v6.3.134 | tests/regression/LOG-36-pattern-display-sources.js | LOG-36
// FEATURE: LOG-36 — Category M (cross-reference consistency), persisted per SES-009a.
//
// The rule this locks in (ARCHITECTURE.md §19i's locked corollary, John's stated rule
// 2026-07-23): every pattern DISPLAY reads the log for which patterns exist and
// pattern_vocabulary for their names. No display file may derive a pattern NAME or a
// pattern COUNT from the static PATTERN_CATALOG — doing so is the reconciliation
// artifact §19i bans, just wearing a nicer coat.
//
// Deliberate, named allowances (out of scope for LOG-36, each its own session):
//   - AIActivityPanel.jsx's "Platform Roadmap" section WAS an allowance here (LOG-56
//     Site 1) — LOG-86 (v6.3.163) removed that drawer entirely, so the allowance was
//     deliberately retired per this test's own instruction, not deleted as a shortcut.
//     The file no longer imports PATTERN_CATALOG at all.
//   - AboutPanel.jsx's stat tile WAS the one allowed display expression (LOG-56 Site 4) —
//     allowance retired by S-ABT-1a (v6.3.171): the About panel now reads
//     ai_pattern_classification_rollup live (the same view the AI Audit panel's By Pattern
//     section reads) and imports no catalog at all. Retired deliberately per this test's own
//     instruction, not deleted as a shortcut.
//   - src/aiPatterns.js (LOG-57) hand-declared AI_PAT / AGENT_PATTERNS badges. Not a
//     PATTERN_CATALOG consumer today; asserted here so a future session can't quietly
//     make it one without tripping this test.
// lib/activity-log.js's VALID_PATTERN_SLUGS is write-path validation, not a display,
// and is deliberately outside this test's scan roots.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const SCAN_ROOTS = ["src/components", "src/screens"];

// No expression in src/ may read PATTERN_CATALOG for display anymore. The last allowance
// (AboutPanel.jsx's stat tile) was retired by S-ABT-1a (v6.3.171) — the panel's "AI patterns
// used" tile now counts ai_pattern_classification_rollup rows live. (AIActivityPanel.jsx's
// Platform Roadmap tier filter was retired earlier, LOG-86 / v6.3.163.) Assertion 1 below now
// enforces zero PATTERN_CATALOG references in every scanned display file.
const ALLOWANCES = [];
const ALLOWANCE_FILES = new Set(ALLOWANCES.map(a => a.file));

function listFiles(dir) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap(d =>
    d.isDirectory()
      ? listFiles(path.join(dir, d.name))
      : (/\.(js|jsx)$/.test(d.name) ? [path.join(dir, d.name)] : [])
  );
}

// Strips block comments, JSX comments and line comments so a *description* of
// PATTERN_CATALOG in a header comment never trips the scan — only real code does.
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ \t]*\/\/.*$/gm, "")
    .replace(/([^:])\/\/.*$/gm, "$1");
}

export default async function () {
  const files = SCAN_ROOTS.flatMap(listFiles);
  assert.ok(files.length > 0, "scan found no source files — check SCAN_ROOTS");

  // ── 1. No display file derives a pattern name or count from PATTERN_CATALOG ──
  const offenders = [];
  const seen = new Set();

  for (const rel of files) {
    const relPosix = rel.replace(/\\/g, "/");
    const code = stripComments(fs.readFileSync(path.join(ROOT, rel), "utf8"));
    for (const rawLine of code.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line.includes("PATTERN_CATALOG")) continue;

      // The import that carries an allowance is itself allowed.
      if (/^import\s/.test(line) && ALLOWANCE_FILES.has(relPosix)) continue;

      const hit = ALLOWANCES.find(a => a.file === relPosix && line.includes(a.expr));
      if (hit) { seen.add(hit.file); continue; }

      offenders.push(`${relPosix}: ${line}`);
    }
  }

  assert.strictEqual(
    offenders.length, 0,
    "PATTERN_CATALOG must not drive any pattern name or count in a display file " +
    "(ARCHITECTURE.md §19i corollary). Offending lines:\n  " + offenders.join("\n  ")
  );
  for (const a of ALLOWANCES) {
    assert.ok(
      seen.has(a.file),
      `${a.file}'s allowed expression was not found (${a.why}). If that code was moved or removed ` +
      "(LOG-56), update this allowance deliberately rather than deleting the check."
    );
  }

  // ── 2. src/aiPatterns.js (LOG-57): allowance is bounded, not open-ended ──
  // This file DOES read PATTERN_CATALOG today — LOG-20 sources its AI_PAT badge strings
  // from the catalog rather than hand-typing them. That is deliberately untouched by
  // LOG-36 (the badges are hand-declared intent on 8 screens, LOG-57's scope). The
  // allowance is pinned to exactly those two known lines so a future session cannot
  // quietly add a third, new catalog-derived display here without tripping this test.
  const aiPatternsPath = path.join(ROOT, "src/aiPatterns.js");
  if (fs.existsSync(aiPatternsPath)) {
    const lines = stripComments(fs.readFileSync(aiPatternsPath, "utf8"))
      .split(/\r?\n/).map(l => l.trim()).filter(l => l.includes("PATTERN_CATALOG"));
    const KNOWN = [
      "import { PATTERN_CATALOG } from '../shared/ai-patterns.js';",
      "const patternNamesBySlug = new Map(PATTERN_CATALOG.map(p => [p.slug, p.name]));",
    ];
    for (const line of lines) {
      assert.ok(
        KNOWN.includes(line),
        `src/aiPatterns.js has a NEW PATTERN_CATALOG use beyond LOG-20's known name lookup: "${line}". ` +
        "Pattern names on a display must come from pattern_vocabulary (§19i corollary)."
      );
    }
  }

  // ── 3. The name resolvers are defined in exactly one place and imported elsewhere ──
  const hookRel = "src/hooks/useAIActivity.js";
  const hookSrc = fs.readFileSync(path.join(ROOT, hookRel), "utf8");
  for (const fn of ["humanizeSlug", "usePatternVocabulary"]) {
    assert.ok(
      new RegExp(`export function ${fn}\\b`).test(hookSrc),
      `${fn} must be exported from ${hookRel} — it is the single platform-wide definition`
    );
  }
  const allSrc = ["src"].flatMap(listFiles).concat(["src/hooks/useAIActivity.js"]);
  for (const rel of new Set(allSrc)) {
    if (rel.replace(/\\/g, "/") === hookRel) continue;
    const code = stripComments(fs.readFileSync(path.join(ROOT, rel), "utf8"));
    for (const fn of ["humanizeSlug", "usePatternVocabulary"]) {
      assert.ok(
        !new RegExp(`function\\s+${fn}\\b`).test(code),
        `${rel.replace(/\\/g, "/")} redefines ${fn} — it must import the one in ${hookRel}`
      );
    }
  }

  // ── 4. The catalog-derived counters are gone from the hook's public surface ──
  for (const dead of ["patternsActiveCount", "patternsCatalogTotal", "PATTERN_NAME_BY_SLUG"]) {
    assert.ok(
      !stripComments(hookSrc).includes(dead),
      `${dead} is catalog-derived and was removed by LOG-36 — it must not come back`
    );
  }
  assert.ok(
    /patternsLoggedCount/.test(hookSrc),
    "useAIActivity() must expose patternsLoggedCount (the live logged-pattern count)"
  );

  // ── 5. The real implementation: the log alone decides which buckets exist ──
  // Placeholder Supabase env only so the module graph loads under plain `node`
  // (src/lib/supabase.js falls back to process.env); no network call is made here.
  if (!process.env.VITE_SUPABASE_URL) process.env.VITE_SUPABASE_URL = "http://localhost:54321";
  if (!process.env.VITE_SUPABASE_ANON_KEY) process.env.VITE_SUPABASE_ANON_KEY = "regression-placeholder";
  const { computeByPattern, humanizeSlug } = await import("../../src/hooks/useAIActivity.js");

  assert.deepStrictEqual(
    computeByPattern([]), {},
    "an empty log must produce zero pattern buckets — no static catalog seeding"
  );

  const out = computeByPattern(
    [{ type: "planning", ts: "2099-01-01T00:00:00Z", cost: 1, patternsUsed: ["prompt-chaining", "rag"] }],
    new Map([["prompt-chaining", { name: "Prompt Chaining", description: "A governed, cited description." }]])
  );
  assert.strictEqual(Object.keys(out).length, 2, "only the two logged slugs may bucket");
  assert.strictEqual(out["prompt-chaining"].name, "Prompt Chaining", "governed name comes from the vocabulary");
  // A governed pattern must surface Susan Smith (Trainer)'s researched description, never a blank
  // line and never PATTERN_CATALOG.desc. Regression guard for the first cut of LOG-36, which
  // selected only (pattern_slug, name) and left the two researched rows emptier than the
  // unresearched ones.
  assert.strictEqual(out["prompt-chaining"].desc, "A governed, cited description.", "governed description comes from the vocabulary");
  assert.strictEqual(out["rag"].desc, "Auto-detected — not yet catalogued", "an ungoverned slug keeps the not-yet-catalogued caption");
  assert.strictEqual(out["rag"].name, humanizeSlug("rag"), "unmatched slug falls back to humanizeSlug, never a catalog name");
  assert.strictEqual(out["rag"].name, "Rag", "the approved expected value — an alias table to 'RAG' is banned");
}
