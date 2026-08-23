// DeepBench v7.0.187 | tests/regression/SES-121-claude-surface-boundary.js | SES-121
// FEATURE: the `.claude/`-mutable surface may be shrunk, but `.claude/rules/` is NOT part of the
// shrinkable surface — 23 live source files name those paths in their `**Read first:**` headers.
//
// WHY THIS TEST EXISTS RATHER THAN A SENTENCE IN A DOC. SES-121's title reads "shrink the
// .claude/-mutable surface", and the obvious way to shrink a directory is to move its biggest
// subdirectory. `.claude/rules/` IS the biggest — 14 of the 21 tracked files — so it is exactly
// what a later sweeper reaches for. It is also the one part that must not move: measured
// 2026-08-23, 23 files under src/ api/ lib/ scripts/ carry a literal `.claude/rules/<name>.md`
// path in a header comment, 12 of the 14 rule files have a single creation commit, and ZERO
// blocked tickets trace to them. Moving it is a 23-file source edit that buys nothing.
//
// A doc sentence saying "don't do the obvious thing" is the class of rule this platform has had
// to convert into structure nine times (SES-86 phase 3, v7.0.146, SES-101, SES-111, SES-127,
// SES-128, SES-129, SES-143, SES-116). This is that conversion for this boundary: the invariant
// is checked, not asserted.
//
// The check is also the phase-2 correctness gate. When John approves the relocation
// (docs/harvests/SES-121.md §5), the three SKILL.md bodies move to docs/runbooks/ and each
// SKILL.md stays as a thin loader. Assertion E fires if a body is moved and its loader deleted —
// which silently removes the skill, because the harness discovers skills by that exact path.
//
// NEGATIVE CONTROL (assertion B): the same checker, run against a fixture in which one rule file
// is absent, must report that file and its referrers. Without it, assertion A is indistinguishable
// from a checker that returns [] unconditionally.
//
// No network, no credentials, no database, no git. It reads the repo tree.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..");

const CODE_DIRS = ["src", "api", "lib", "scripts"];
const CODE_EXT = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const RULE_REF = /\.claude\/rules\/([A-Za-z0-9._-]+\.md)/g;

// The three skills SES-121 proposes to hollow out. Each must keep a loader at this exact path.
export const LOADER_PATHS = [
  ".claude/skills/session-setup/SKILL.md",
  ".claude/skills/session-hygiene/SKILL.md",
  ".claude/skills/triage/SKILL.md",
];

function walk(dir, out = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".git") continue;
      walk(full, out);
    } else if (CODE_EXT.has(path.extname(e.name))) {
      out.push(full);
    }
  }
  return out;
}

// Every `.claude/rules/<file>.md` named by a live source file, mapped to the files naming it.
// Pure over its inputs so the negative control can drive it with a fixture.
export function collectRuleRefs(root, files, readFile = p => fs.readFileSync(p, "utf8")) {
  const refs = new Map();
  for (const f of files) {
    let text;
    try { text = readFile(f); } catch { continue; }
    for (const m of text.matchAll(RULE_REF)) {
      const rel = ".claude/rules/" + m[1];
      if (!refs.has(rel)) refs.set(rel, new Set());
      refs.get(rel).add(path.relative(root, f).split(path.sep).join("/"));
    }
  }
  return refs;
}

// A reference is dangling when the rule file it names is not on disk. `exists` is injectable so
// the negative control can hide one file without touching the repo.
export function danglingRuleRefs(root, refs, exists = rel => fs.existsSync(path.join(root, rel))) {
  const bad = [];
  for (const [rel, referrers] of refs) {
    if (!exists(rel)) bad.push({ rule: rel, referrers: [...referrers].sort() });
  }
  return bad.sort((a, b) => a.rule.localeCompare(b.rule));
}

async function run() {
  const codeFiles = CODE_DIRS.flatMap(d => walk(path.join(ROOT, d)));
  const refs = collectRuleRefs(ROOT, codeFiles);

  // ---- A. No live source file names a `.claude/rules/` path that does not exist. ------------
  const dangling = danglingRuleRefs(ROOT, refs);
  assert.deepStrictEqual(
    dangling, [],
    "SES-121: live source files name `.claude/rules/` paths that are not on disk — the rules " +
    "directory was moved or renamed without repointing its readers. " +
    JSON.stringify(dangling)
  );

  // ---- B. NEGATIVE CONTROL: the checker must actually discriminate. -------------------------
  // Hide exactly one rule file that assertion A just proved present, and require it to surface
  // with its real referrers. If A passes while B fails, A was vacuous.
  const [victim] = [...refs.keys()].sort();
  assert.ok(victim, "SES-121: no `.claude/rules/` reference found in src/ api/ lib/ scripts/ at all");
  const control = danglingRuleRefs(ROOT, refs, rel => rel !== victim && fs.existsSync(path.join(ROOT, rel)));
  assert.strictEqual(
    control.length, 1,
    `SES-121 negative control: hiding ${victim} should surface exactly one dangling rule, got ${control.length}`
  );
  assert.strictEqual(control[0].rule, victim, "SES-121 negative control: wrong rule surfaced");
  assert.ok(
    control[0].referrers.length > 0,
    `SES-121 negative control: ${victim} surfaced with no referrers — the map lost its provenance`
  );

  // ---- C. The coverage the boundary rests on is still real. ---------------------------------
  // 23 live source files named `.claude/rules/` when this shipped. The floor is deliberately
  // below that: this fires when the coupling has genuinely gone, which is the only condition
  // under which the "do not move rules/" boundary should be re-argued.
  const referringFiles = new Set([...refs.values()].flatMap(s => [...s]));
  assert.ok(
    referringFiles.size >= 20,
    `SES-121: only ${referringFiles.size} live source files still name \`.claude/rules/\` (23 at ` +
    `v7.0.187). The coupling that makes moving that directory expensive may be gone — re-measure ` +
    "before treating docs/harvests/SES-121.md §5's out-of-scope call as still true."
  );

  // ---- D. The scope boundary is written down where phase 2 will read it. ---------------------
  // Fails on the pre-change tree: the harvest doc did not exist before v7.0.187.
  const harvest = path.join(ROOT, "docs", "harvests", "SES-121.md");
  assert.ok(fs.existsSync(harvest), "SES-121: docs/harvests/SES-121.md is missing — phase 2 has no scope record");
  const text = fs.readFileSync(harvest, "utf8");
  assert.ok(
    /Explicitly NOT in scope/i.test(text) && /`\.claude\/rules\/\*?`?\s*\(14 files\)\s*—\s*leave alone/i.test(text),
    "SES-121: docs/harvests/SES-121.md no longer states that `.claude/rules/` is out of scope — " +
    "that boundary is the whole reason this test exists"
  );

  // ---- E. Phase-2 gate: hollowing a skill must not delete its loader. ------------------------
  for (const rel of LOADER_PATHS) {
    assert.ok(
      fs.existsSync(path.join(ROOT, rel)),
      `SES-121: ${rel} is gone. The harness discovers skills by that exact path, so moving the ` +
      "body to docs/runbooks/ without leaving the loader silently removes the skill (harvest §5)."
    );
  }
}

export default run;
selfRun(import.meta.url, run);
