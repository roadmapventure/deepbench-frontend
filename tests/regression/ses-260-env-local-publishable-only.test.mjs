// DeepBench v7.0.381 | tests/regression/ses-260-env-local-publishable-only.test.mjs | SES-260 (M4, built ahead by John's order)
//
// John's ruling d7670e18: a `.env.local` copy may carry ONLY publishable values. SES-258 removed
// SUPABASE_SERVICE_KEY from every copy; SES-260 removes the rest — ANTHROPIC_API_KEY, OPENAI_API_KEY,
// VERCEL_TOKEN, VERCEL_AUTOMATION_BYPASS_SECRET — after giving each a sanctioned home (the Vercel
// project env pulled per session to a scratch file OUTSIDE the repo; runner_secrets; the Vercel
// CLI's own login). Three arms:
//
//   * SCAN arm (runs wherever a .env.local exists): every .env.local under the repo root and under
//     .claude/worktrees/* carries none of the five forbidden names. Declared NOT RUN where no copy
//     exists (CI, a fresh clone) rather than passing on nothing. The scanner is a pure function with
//     its own negative control below.
//   * DOC arm (always runs): session-setup.md step 1b names the pull pattern and the scratch
//     location, and STANDARDS.md rule 5 names the session env file as the credential source.
//   * Nothing here reads a secret VALUE: only the name before '=' is inspected.
//
// Invocation: node tests/regression/ses-260-env-local-publishable-only.test.mjs

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
// A worktree's REPO is .claude/worktrees/<name>; the shared checkout is two levels up from there.
const SHARED = /[\\/]\.claude[\\/]worktrees[\\/][^\\/]+$/.test(REPO) ? path.resolve(REPO, "..", "..", "..") : REPO;

export const FORBIDDEN = ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "VERCEL_TOKEN", "VERCEL_AUTOMATION_BYPASS_SECRET", "SUPABASE_SERVICE_KEY"];

// Pure: returns the forbidden NAMES present in an env-file body. Values are never returned.
export function forbiddenNamesIn(body) {
  const names = new Set();
  for (const raw of String(body).split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=/.exec(raw);
    if (m && FORBIDDEN.includes(m[1])) names.add(m[1]);
  }
  return [...names];
}

function envCopies() {
  const out = [];
  const root = path.join(SHARED, ".env.local");
  if (fs.existsSync(root)) out.push(root);
  const wt = path.join(SHARED, ".claude", "worktrees");
  if (fs.existsSync(wt)) {
    for (const d of fs.readdirSync(wt)) {
      const p = path.join(wt, d, ".env.local");
      if (fs.existsSync(p)) out.push(p);
    }
  }
  return out;
}

const read = rel => fs.readFileSync(path.join(REPO, rel), "utf8").replace(/\r\n/g, "\n");

const DOC_CLAUSES = [
  {
    id: "session-setup-names-the-pull-pattern", file: "docs/runbooks/session-setup.md",
    test: s => /vercel env pull/.test(s) && /session\.env/.test(s) && /never inside the repo/.test(s),
    breaks: s => s.replace(/vercel env pull/g, "vercel env list"),
    detail: "step 1b must tell a session how to get credentials for a live test without putting them in the repo",
  },
  {
    id: "standards-rule-5-names-the-session-env", file: "docs/STANDARDS.md",
    test: s => /--env-file-if-exists=<scratch>\/session\.env/.test(s),
    breaks: s => s.split("--env-file-if-exists=<scratch>/session.env").join("--env-file-if-exists=.env.local"),
    detail: "the specced suite command must point credentialed arms at the pulled session env, not at .env.local, which now carries only publishable values",
  },
];

async function run() {
  const results = [];

  // negative control for the scanner itself: it must SEE a forbidden name and IGNORE a publishable one
  assert.deepStrictEqual(forbiddenNamesIn("VITE_SUPABASE_URL=x\nANTHROPIC_API_KEY=y\n# OPENAI_API_KEY=z\n"), ["ANTHROPIC_API_KEY"],
    "control: the scanner must report exactly the uncommented forbidden name and nothing else");
  results.push("scanner-discriminates");

  for (const c of DOC_CLAUSES) {
    const s = read(c.file);
    assert.ok(c.test(s), `${c.file} lost clause "${c.id}": ${c.detail}`);
    const mutated = c.breaks(s);
    assert.notStrictEqual(mutated, s, `control: mutation for "${c.id}" changed nothing`);
    assert.ok(!c.test(mutated), `control: clause "${c.id}" still passes after its own mutation`);
    results.push(c.id);
  }

  const copies = envCopies();
  if (copies.length === 0) {
    notRun("the .env.local scan", "no .env.local exists under this checkout (CI / fresh clone) -- nothing to scan, which is the correct state there.");
    return results;
  }
  const offenders = [];
  for (const p of copies) {
    const names = forbiddenNamesIn(fs.readFileSync(p, "utf8"));
    if (names.length) offenders.push(`${path.relative(SHARED, p)}: ${names.join(", ")}`);
  }
  assert.deepStrictEqual(offenders, [],
    `${offenders.length} .env.local cop${offenders.length === 1 ? "y" : "ies"} still carr${offenders.length === 1 ? "ies" : "y"} a non-publishable key (names only):\n  ${offenders.join("\n  ")}\n` +
    "John's ruling d7670e18: .env.local holds publishable values only. Pull credentials per session (session-setup step 1b).");
  results.push(`no-privileged-key-in-${copies.length}-env-local-cop${copies.length === 1 ? "y" : "ies"}`);
  return results;
}

selfRun(import.meta.url, run);
export default run;
