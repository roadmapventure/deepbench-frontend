#!/usr/bin/env node
// DeepBench v7.0.1047 | scripts/hooks/repo-guards.js | SES-349 -- four of CLAUDE.md's hard rules as
// one tracked PreToolUse guard, so the enforcement travels with the repository instead of living on
// one machine.
//
// WHY. CLAUDE.md's own "Hooks are a local backstop, not the source of truth" paragraph names the
// hole this closes: the hooks that denied a `cd … &&` compound, a bare `origin dev` push, a
// committed `test-*.mjs`, and a src/ or api/ write from a `session/design-*` branch lived in
// `C:/Projects/.claude/` -- outside this repository, ungit-tracked, present on exactly one machine.
// A fresh clone, a CI runner, or a cloud cycle inherited the written rules and none of the
// enforcement. The DECISION now lives here, in a tracked file, with its wiring block beside it in
// scripts/hooks/settings-hooks.json.
//
// WHAT IS NOT DONE, AND NAMED. This module is NOT wired. Merging the wiring block into
// `.claude/settings.json` is a `.claude/` write only a session John attends may make (register
// B39), so nothing invokes this file yet; tests/regression/ses-349-repo-guards.test.mjs grades it
// directly and prints a `NOT WIRED` line for as long as that is true.
//
// TWO PROPERTIES ARE LOAD-BEARING.
//   1. A GUARD THAT ERRORS ALLOWS. Unparseable stdin, an unusable git, a throwing ctx helper: the
//      hook prints nothing and exits 0. A guard is a backstop, and a backstop that cannot read its
//      input must never become a wall across every tool call in the session.
//   2. THE CONTROLS ARE THE RULE. `git push origin HEAD:dev` -- the form the rule REQUIRES -- and a
//      forbidden refspec quoted inside a commit message must both pass, or the guard blocks the
//      very practice it exists to enforce. strip() blanks quoted strings before any match for
//      exactly that reason, and decide() is exported so each control is asserted without a process.

import fs from "fs";
import path from "path";
import { execFileSync, spawnSync } from "child_process";
import { pathToFileURL } from "url";

const SH = ["Bash", "PowerShell"];
export const GUARDS = [
  { name: "cd-compound", rule: "HR-NO-CD-COMPOUND", tools: SH },
  { name: "bare-dev-push", rule: "HR-PUSH-HEAD-DEV", tools: SH },
  { name: "unverified-commit", rule: "CAP-BUILD-GATE", tools: SH },
  { name: "design-branch-code", rule: null, tools: ["Edit", "Write"] },
];
const strip = c => String(c || "").replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, '""');
export function decide(input, ctx = {}) {
  const tool = input?.tool_name, c = strip(input?.tool_input?.command);
  if (SH.includes(tool)) {
    if (/(?:^|&&|\|\||[;|\n])\s*cd\s+[^&;|\n]+&&/.test(c)) return "cd-compound: use git -C <path>, never `cd <path> &&`";
    if (/\bgit\b[^;&|\n]*\bpush\b[^;&|\n]*\borigin\s+dev(?![\w:/.-])/.test(c)) return "bare-dev-push: push origin HEAD:dev";
    if (/\bgit\b[^;&|\n]*\bcommit\b/.test(c)) {
      const staged = ctx.staged ? ctx.staged() : [];
      const t = staged.find(s => s.status === "A" && /^test-.*\.m?js$/.test(path.basename(s.path)));
      if (t) return `unverified-commit: staged scratch test ${t.path}`;
      if (staged.some(s => /^(src|api)\//.test(s.path)) && ctx.build && !ctx.build()) return "unverified-commit: `npm run build` fails";
    }
  }
  if ((tool === "Edit" || tool === "Write") && /^session\/design-/.test(ctx.branch ? ctx.branch() : "") && /^(src|api)\//.test(ctx.rel ? ctx.rel() : ""))
    return "design-branch-code: no src/ or api/ edit on session/design-*";
  return null;
}

export function main(raw) {
  let input; try { input = JSON.parse(raw); } catch { return null; }
  const ti = input?.tool_input || {}, m = /\bgit\s+-C\s+(?:"([^"]+)"|(\S+))/.exec(ti.command || "");
  const dir = m ? m[1] || m[2] : ti.file_path ? path.dirname(ti.file_path) : input?.cwd || ".";
  const git = (...a) => { try { return execFileSync("git", ["-C", dir, ...a], { encoding: "utf8", stdio: "pipe" }).trim(); } catch { return ""; } };
  const top = () => git("rev-parse", "--show-toplevel");
  return decide(input, {
    branch: () => git("branch", "--show-current"),
    rel: () => top() && path.relative(top(), path.resolve(ti.file_path)).split(path.sep).join("/"),
    staged: () => git("diff", "--cached", "--name-status").split("\n").filter(Boolean).map(l => ({ status: l[0], path: l.split("\t").pop() })),
    build: () => !spawnSync("npm run build", { cwd: top() || dir, shell: true, stdio: "ignore" }).status,
  });
}
if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  const r = main(fs.readFileSync(0, "utf8"));
  if (r) console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: r } }));
}
