// DeepBench v7.0.631 | tests/regression/agt-194-ci-conclusion-per-sha.test.mjs | AGT-194 — EVERY
// PUSHED SHA KEEPS ITS OWN CI CONCLUSION, AND A VERDICT SAYS WHEN ITS OWN HAS NONE.
//
// THE DEFECT THIS GUARDS, measured live on `public.ci_run_conclusions` this cycle rather than
// reasoned about: `.github/workflows/ci.yml` held one concurrency group per REF
// (`group: ci-${{ github.ref }}`, `cancel-in-progress: true`) while 5-7 sessions push `dev` minutes
// apart, so every dev push sat in ONE group and each new push cancelled the last. 82 of 535 rows
// (15.3%) carry a CANCELLED blocking job — 82 on `Tripwire + regression (blocking)`, 8 on
// `Build (blocking)` — mean 3.4/day over 24 days, worst day 12. It is not only a peer problem: this
// chain's own ship `d524d6d0` had `Tripwire + regression (blocking)` CANCELLED at 01:53:42Z by its
// OWN close-out push 366s later. And 16 of 127 `runner_verdicts` rows with a `graded_sha` name a sha
// with no conclusion row at all; all 16 are `verdict=block`, 7 of them provable ancestors of dev
// HEAD — landed, blocked, and never graded by CI.
//
// FOUR ARMS, and what each proves is stated rather than implied. (A) and (B) are the pair: either
// alone passes a wrong fix.
//
//   (A) PER-SHA ON PUSH. The `group:` expression is extracted from ci.yml and EVALUATED for two
//       different shas on a push to dev; the two groups must DIFFER. This is the discriminator — on
//       the pre-fix tree both evaluate to `ci-refs/heads/dev`, identical, and (A) fails. A grep for
//       the string `github.sha` would pass a line that appends the sha in a dead branch; evaluating
//       the expression cannot.
//   (B) REF-WIDE ON pull_request. The same expression evaluated for two shas on `refs/pull/9/merge`
//       must produce the SAME string, and `cancel-in-progress` must still be true. Supersession on a
//       PR branch is wanted: a force-push should cancel the run it replaced. (B) is what fails if
//       the sha is appended unconditionally, which is why it is asserted and not assumed.
//   (C) THE YAML STILL PARSES, AND ITS STRUCTURE IS UNCHANGED. This is the highest-consequence arm
//       in the file. A malformed `${{ }}` expression does not fail one job — it makes the whole
//       WORKFLOW invalid, so nothing runs, no conclusion is ever published, and every cycle's CI
//       grade goes permanently "could not tell". That failure direction is strictly worse than the
//       bug being fixed, so the parse is asserted with a REAL parser (python3 + PyYAML, spawned) and
//       never with a regex. DECLARED, NEVER SILENT: with no python3/PyYAML the arm calls
//       notRun("C", …) rather than passing (SES-180 (b)).
//   (D) THE GAP IS VISIBLE IN THE VERDICT. `ciConclusionFinding` over real measured shapes, every
//       branch discriminated by CLAUSE rather than by "returns something" (the LOO-013 lesson:
//       assert WHICH branch fired). Pre-fix the import does not exist, so (D) cannot pass unchanged.
//
// WHAT THIS DOES NOT ASSERT, and must not: that a live pair of dev pushes a minute apart both ended
// with a concluded blocking job. That needs the new workflow already ON dev, so no QA inside the
// cycle that ships it can assert it (the kickoff declares it out of cycle; next cycle's discharge
// arm queries `ci_run_conclusions` for both of this cycle's shas). This file grades the CHANGE, never
// the live world (pattern:162) — it reads no ledger, needs no credentials, and asserts nothing about
// what GitHub Actions actually did.
//
// Invocation: node tests/regression/agt-194-ci-conclusion-per-sha.test.mjs
// (STANDARDS.md Section 2 rule 5 for the credentialed form; this test needs no credentials.)

import assert from "assert";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CI_REL = ".github/workflows/ci.yml";
const CI_ABS = path.join(REPO, CI_REL);

const SHA_A = "a".repeat(40);
const SHA_B = "b".repeat(40);

// ---------------------------------------------------------------------------------------------
// A MINIMAL GitHub Actions EXPRESSION EVALUATOR.
//
// WHY AN EVALUATOR AND NOT A STRING COMPARISON, which is the design choice in this file. Asserting
// the group line equals a literal would pass any expression that merely LOOKS right and would go red
// on a harmless reformat; it would also never notice that the push branch and the pull_request branch
// resolve the same way. Evaluating answers the question the runner actually asks — "do these two
// shas land in one group or two?" — which is the behaviour the ticket is about.
//
// The subset is exactly what this expression needs, with GitHub's real semantics: `&&` yields the
// first FALSY operand or the last, `||` the first TRUTHY operand or the last (so `false || ''` is
// `''`, not `false`), `''`/`false`/`0`/null are falsy, and interpolating a boolean renders
// "true"/"false". Anything outside the subset THROWS rather than being silently coerced — a guard
// that quietly evaluated an operator it does not implement would be reporting on a line it did not
// read.
// ---------------------------------------------------------------------------------------------

function tokenize(src) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === "'") {                       // GHA string literal; '' is an escaped quote
      let j = i + 1, lit = "";
      for (;;) {
        if (j >= src.length) throw new Error(`unterminated string literal in expression: ${src}`);
        if (src[j] === "'") {
          if (src[j + 1] === "'") { lit += "'"; j += 2; continue; }
          j++; break;
        }
        lit += src[j++];
      }
      out.push({ t: "str", v: lit }); i = j; continue;
    }
    if (src.startsWith("==", i) || src.startsWith("!=", i) || src.startsWith("&&", i) || src.startsWith("||", i)) {
      out.push({ t: "op", v: src.slice(i, i + 2) }); i += 2; continue;
    }
    if (c === "(" || c === ")" || c === ",") { out.push({ t: c }); i++; continue; }
    const m = /^[A-Za-z_][A-Za-z0-9_.\-*]*/.exec(src.slice(i));
    if (m) { out.push({ t: "name", v: m[0] }); i += m[0].length; continue; }
    const n = /^[0-9]+(\.[0-9]+)?/.exec(src.slice(i));
    if (n) { out.push({ t: "num", v: Number(n[0]) }); i += n[0].length; continue; }
    throw new Error(`unsupported character ${JSON.stringify(c)} in expression: ${src}`);
  }
  return out;
}

function truthy(v) {
  if (v === null || v === undefined) return false;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  return String(v) !== "";
}

export function ghaRender(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v);
}

function lookup(pathExpr, ctx) {
  const parts = pathExpr.split(".");
  let cur = ctx;
  for (const p of parts) {
    if (cur === null || typeof cur !== "object" || !(p in cur)) {
      throw new Error(`expression reads ${pathExpr}, which this evaluator's context does not define`);
    }
    cur = cur[p];
  }
  return cur;
}

// Recursive descent: or -> and -> comparison -> primary. GitHub's precedence.
function makeParser(tokens, src, ctx) {
  let pos = 0;
  const peek = () => tokens[pos];
  const eat = (t, v) => {
    const tk = tokens[pos];
    if (!tk || tk.t !== t || (v !== undefined && tk.v !== v)) {
      throw new Error(`expected ${v ?? t} at token ${pos} of: ${src}`);
    }
    pos++; return tk;
  };

  function primary() {
    const tk = peek();
    if (!tk) throw new Error(`expression ended early: ${src}`);
    if (tk.t === "(") { eat("("); const v = orExpr(); eat(")"); return v; }
    if (tk.t === "str") { pos++; return tk.v; }
    if (tk.t === "num") { pos++; return tk.v; }
    if (tk.t === "name") {
      pos++;
      if (peek() && peek().t === "(") {                    // function call
        eat("(");
        const args = [];
        if (peek() && peek().t !== ")") {
          args.push(orExpr());
          while (peek() && peek().t === ",") { eat(","); args.push(orExpr()); }
        }
        eat(")");
        if (tk.v !== "format") throw new Error(`unsupported function ${tk.v}() in expression: ${src}`);
        const tpl = ghaRender(args[0]);
        return tpl.replace(/\{(\d+)\}/g, (_, n) => ghaRender(args[Number(n) + 1]));
      }
      if (tk.v === "true") return true;
      if (tk.v === "false") return false;
      if (tk.v === "null") return null;
      return lookup(tk.v, ctx);
    }
    throw new Error(`unsupported token ${JSON.stringify(tk)} in expression: ${src}`);
  }

  function cmpExpr() {
    let left = primary();
    while (peek() && peek().t === "op" && (peek().v === "==" || peek().v === "!=")) {
      const op = eat("op").v;
      const right = primary();
      const eq = ghaRender(left) === ghaRender(right);   // both operands here are strings/booleans
      left = op === "==" ? eq : !eq;
    }
    return left;
  }

  function andExpr() {
    let left = cmpExpr();
    while (peek() && peek().t === "op" && peek().v === "&&") {
      eat("op", "&&");
      const right = cmpExpr();
      left = truthy(left) ? right : left;                // first falsy, else last
    }
    return left;
  }

  function orExpr() {
    let left = cmpExpr();
    while (peek() && peek().t === "op" && peek().v === "||") {
      eat("op", "||");
      const right = andExpr();
      left = truthy(left) ? left : right;                // first truthy, else last
    }
    return left;
  }

  return () => {
    // `||` binds loosest, so the entry point walks or -> and -> cmp; andExpr is reached through it.
    let left = andExpr();
    while (peek() && peek().t === "op" && peek().v === "||") {
      eat("op", "||");
      const right = andExpr();
      left = truthy(left) ? left : right;
    }
    if (pos !== tokens.length) throw new Error(`trailing tokens at ${pos} in: ${src}`);
    return left;
  };
}

// Pure. Substitutes every ${{ … }} span; text outside a span is literal.
export function evalGhaTemplate(tpl, ctx) {
  const s = String(tpl);
  let out = "", i = 0;
  for (;;) {
    const open = s.indexOf("${{", i);
    if (open < 0) { out += s.slice(i); break; }
    const close = s.indexOf("}}", open);
    if (close < 0) throw new Error(`unclosed \${{ in: ${s}`);
    out += s.slice(i, open);
    const expr = s.slice(open + 3, close);
    out += ghaRender(makeParser(tokenize(expr), expr, ctx)());
    i = close + 2;
  }
  return out;
}

// The concurrency block read out of the raw file, so (A) and (B) do not depend on a YAML parser
// being installed. FIRST occurrence and the top-level block only: a `concurrency:` nested under a
// job is a different setting and reading it here would answer the wrong question.
export function topLevelConcurrency(yamlText) {
  const lines = String(yamlText).split(/\r?\n/);
  const start = lines.findIndex(l => /^concurrency:\s*$/.test(l));
  assert.ok(start >= 0, `${CI_REL} must carry a top-level \`concurrency:\` block`);
  const block = {};
  for (let i = start + 1; i < lines.length; i++) {
    if (/^\S/.test(lines[i])) break;                     // dedented out of the block
    if (!lines[i].trim()) continue;
    const m = /^\s+([A-Za-z-]+):\s*(.*?)\s*$/.exec(lines[i]);
    if (m && !(m[1] in block)) block[m[1]] = m[2];
  }
  return block;
}

const GROUP_FOR = (expr, ctx) => evalGhaTemplate(expr, { github: ctx });

// --- (A) -------------------------------------------------------------------------------------
function pushGroupsAreOnePerSha(groupExpr) {
  const base = { event_name: "push", ref: "refs/heads/dev" };
  const a = GROUP_FOR(groupExpr, { ...base, sha: SHA_A });
  const b = GROUP_FOR(groupExpr, { ...base, sha: SHA_B });
  assert.notStrictEqual(a, b,
    `two different shas pushed to dev must land in DIFFERENT concurrency groups, or the second push ` +
    `cancels the first's blocking jobs and the first sha never gets a conclusion (82 of 535 measured ` +
    `rows). Both evaluated to ${JSON.stringify(a)} from group: ${groupExpr}`);
  assert.ok(a.includes(SHA_A) && b.includes(SHA_B),
    `each push group must carry its own sha; got ${JSON.stringify(a)} / ${JSON.stringify(b)}`);
  assert.ok(a.includes("refs/heads/dev"),
    `the ref must stay in the group so dev and main never share one; got ${JSON.stringify(a)}`);
  // `main` is covered by the SAME guard, because the condition tests event_name and not a branch.
  const m1 = GROUP_FOR(groupExpr, { event_name: "push", ref: "refs/heads/main", sha: SHA_A });
  const m2 = GROUP_FOR(groupExpr, { event_name: "push", ref: "refs/heads/main", sha: SHA_B });
  assert.notStrictEqual(m1, m2,
    "a push to main must be per-sha too — the guard is on event_name, never a branch test");
  assert.notStrictEqual(a, m1, "dev and main must never share a concurrency group");
}

// --- (B) -------------------------------------------------------------------------------------
function pullRequestGroupsStayRefWide(block) {
  const groupExpr = block.group;
  const base = { event_name: "pull_request", ref: "refs/pull/9/merge" };
  const a = GROUP_FOR(groupExpr, { ...base, sha: SHA_A });
  const b = GROUP_FOR(groupExpr, { ...base, sha: SHA_B });
  assert.strictEqual(a, b,
    `on pull_request the group must stay REF-wide so a force-push supersedes the run it replaced; ` +
    `appending the sha unconditionally breaks that. Got ${JSON.stringify(a)} vs ${JSON.stringify(b)} ` +
    `from group: ${groupExpr}`);
  assert.ok(!a.includes(SHA_A),
    `the pull_request group must carry no sha; got ${JSON.stringify(a)}`);
  assert.strictEqual(block["cancel-in-progress"], "true",
    "`cancel-in-progress: true` must STAY — it is what still cancels a superseded PR run; the fix is " +
    "the group key, never the cancel flag");
}

// --- (C) -------------------------------------------------------------------------------------
// A REAL PARSER, SPAWNED. The failure direction of a malformed expression is the entire workflow
// invalid — nothing runs, no conclusion is ever published — so this arm never accepts a regex as a
// parse. PyYAML resolves the unquoted key `on` to the BOOLEAN True (YAML 1.1), so the trigger block
// is read under either key rather than asserted to be there under the name the file spells.
function theWorkflowStillParses() {
  const py = spawnSync("python3", ["-c", `
import json, sys, yaml
d = yaml.safe_load(open(sys.argv[1]))
trig = d[True] if True in d else d.get('on')
print(json.dumps({
  "jobs": list(d["jobs"].keys()),
  "group": d["concurrency"]["group"],
  "group_type": type(d["concurrency"]["group"]).__name__,
  "cancel": d["concurrency"]["cancel-in-progress"],
  "triggers": trig,
  "name": d.get("name"),
}))
`, CI_ABS], { encoding: "utf8" });

  if (py.error || py.status === null) {
    notRun("C", `python3 could not be spawned (${py.error ? py.error.message : "no exit status"}), so ` +
      `the workflow was NOT parse-verified here. Re-run this test where python3 + PyYAML exist before ` +
      `trusting the ci.yml edit; arms A, B and D still ran.`);
    return false;
  }
  if (py.status !== 0 && /ModuleNotFoundError|No module named/.test(String(py.stderr))) {
    notRun("C", "PyYAML is not installed, so the workflow was NOT parse-verified here. Install pyyaml " +
      "and re-run before trusting the ci.yml edit; arms A, B and D still ran.");
    return false;
  }
  assert.strictEqual(py.status, 0,
    `${CI_REL} must load under a real YAML parser. A malformed \${{ }} expression makes the WHOLE ` +
    `workflow invalid, so nothing runs and no sha ever gets a conclusion — strictly worse than the ` +
    `bug AGT-194 fixes. python3 exited ${py.status}:\n${py.stderr}`);

  const d = JSON.parse(py.stdout);
  assert.strictEqual(d.group_type, "str",
    `concurrency.group must parse as ONE plain scalar string, not a list or map — got ${d.group_type}. ` +
    `An unquoted expression that YAML reads as a flow collection is the malformation this asserts against.`);
  assert.deepStrictEqual(d.jobs, ["build", "checks", "report-conclusion"],
    "the job set must be untouched by a concurrency edit — build (blocking), checks (blocking " +
    "tripwire + regression) and report-conclusion, which is what writes ci_run_conclusions at all");
  assert.strictEqual(d.cancel, true, "cancel-in-progress must still parse as the boolean true");
  assert.deepStrictEqual(d.triggers, {
    push: { branches: ["dev", "main"] },
    pull_request: { branches: ["dev", "main"] },
  }, "the trigger block must be untouched: push and pull_request, dev and main");
  assert.strictEqual(d.name, "CI", "the workflow name must be untouched");
  return true;
}

// --- (D) -------------------------------------------------------------------------------------
// Real measured shapes, not convenient ones. `2a4e6780…` is AGT-168's graded sha — one of the 16
// verdict rows naming a sha with no conclusion row. `d524d6d0…`'s job array is this chain's own
// cancelled ship, quoted from `ci_run_conclusions`.
const NO_ROW_SHA = "2a4e6780" + "0".repeat(32);
const CANCELLED_SHA = "d524d6d0" + "0".repeat(32);
const CANCELLED_JOBS = [
  { name: "Build (blocking)", conclusion: "success" },
  { name: "Tripwire + regression (blocking)", conclusion: "cancelled" },
];

async function theFindingNamesWhichGapFired() {
  const { ciConclusionFinding, ciConclusionFor } = await import("../../scripts/verifier.js");
  assert.strictEqual(typeof ciConclusionFinding, "function",
    "scripts/verifier.js must export ciConclusionFinding — a pure, sync finding over rows already read");
  assert.strictEqual(typeof ciConclusionFor, "function",
    "scripts/verifier.js must export ciConclusionFor — the read, separate from the judgment");

  // no-conclusion: the sha is known, the table has no row for it. The ticket's headline case.
  const none = ciConclusionFinding({ gradedSha: NO_ROW_SHA, rows: [] });
  assert.ok(none, "a sha with no conclusion row must produce a finding, never null");
  assert.strictEqual(none.clause, "no-conclusion",
    `a graded sha with no ci_run_conclusions row is clause no-conclusion; got ${none.clause}`);
  assert.ok(String(none.reason).includes(NO_ROW_SHA),
    "the reason must NAME the sha — a finding its reader cannot join to a commit is not actionable");

  // cancelled-blocking: the row exists and a blocking job was cancelled.
  const cancelled = ciConclusionFinding({ gradedSha: CANCELLED_SHA, rows: [
    { commit_sha: CANCELLED_SHA, run_id: 1, concluded_at: "2026-09-26T01:53:42Z", jobs: CANCELLED_JOBS },
  ] });
  assert.ok(cancelled, "a cancelled blocking job must produce a finding");
  assert.strictEqual(cancelled.clause, "cancelled-blocking",
    `a cancelled blocking job is clause cancelled-blocking, NOT no-conclusion — the row exists and the ` +
    `two are different facts about the ship; got ${cancelled.clause}`);
  assert.ok(String(cancelled.reason).includes("Tripwire + regression (blocking)"),
    "the reason must name each cancelled blocking job by name, or its reader cannot tell which grade " +
    "is missing");
  assert.ok(!String(cancelled.reason).includes("Build (blocking)"),
    "a blocking job that concluded success must NOT be listed as cancelled — naming every job would " +
    "make the finding unreadable and would not discriminate");

  // The clean case, and it is the ONLY null.
  const clean = ciConclusionFinding({ gradedSha: CANCELLED_SHA, rows: [
    { commit_sha: CANCELLED_SHA, run_id: 2, concluded_at: "2026-09-26T02:00:00Z", jobs: [
      { name: "Build (blocking)", conclusion: "success" },
      { name: "Tripwire + regression (blocking)", conclusion: "success" },
      { name: "Report conclusion", conclusion: "skipped" },     // non-blocking: never consulted
    ] },
  ] });
  assert.strictEqual(clean, null,
    "every blocking job success is the clean case and the only null; a non-blocking job's conclusion " +
    "is not consulted at all");

  // no-graded-sha and unreadable are DIFFERENT from no-conclusion, and collapsing them would erase
  // the distinction the ledger is read for: "nobody could tell which tree" vs "the table could not be
  // read" vs "the table was read and this sha is not in it".
  const noSha = ciConclusionFinding({ gradedSha: null, rows: [] });
  assert.ok(noSha && noSha.clause === "no-graded-sha",
    `a run whose graded sha could not be read is clause no-graded-sha; got ${noSha && noSha.clause}`);
  const unreadable = ciConclusionFinding({ gradedSha: NO_ROW_SHA, rows: null });
  assert.ok(unreadable && unreadable.clause === "unreadable",
    `rows === null is DECLARED-unreadable, never a silent empty that reads as "no conclusion exists"; ` +
    `got ${unreadable && unreadable.clause}`);

  // A row with no blocking job at all is not vacuously clean — nothing blocking concluded.
  const noBlocking = ciConclusionFinding({ gradedSha: CANCELLED_SHA, rows: [
    { commit_sha: CANCELLED_SHA, run_id: 3, jobs: [{ name: "Report conclusion", conclusion: "success" }] },
  ] });
  assert.ok(noBlocking && noBlocking.clause === "no-conclusion",
    `a row naming no blocking job is no-conclusion, not a vacuous null; got ${noBlocking && noBlocking.clause}`);

  // Every finding carries the three keys the prose line and the judge context read.
  for (const f of [none, cancelled, noSha, unreadable, noBlocking]) {
    for (const k of ["kind", "clause", "reason"]) {
      assert.ok(typeof f[k] === "string" && f[k],
        `every finding needs a non-empty ${k}; got ${JSON.stringify(f)}`);
    }
  }

  // REPORTED, NEVER A GATE. Asserted on the verifier's own source, with the two blocks that DO block
  // as the positive control — a pattern that matched nothing would otherwise pass vacuously.
  const src = fs.readFileSync(path.join(REPO, "scripts/verifier.js"), "utf8");
  const at = src.indexOf("const ciConclusion = ciConclusionFinding(");
  assert.ok(at > 0,
    "scripts/verifier.js must compute the finding into `ciConclusion` at one place, beside the sha it is about");
  const after = src.slice(at);
  const gatingBlock = src.slice(src.indexOf("if (kickoffNoLanes)"), at);
  for (const pat of [/verdict = "block"/, /reasoning = /]) {
    assert.match(gatingBlock, pat,
      `positive control: ${pat} must appear in the kickoffNoLanes block, which really does block — ` +
      "if it does not, the patterns below prove nothing");
  }
  const guard = after.slice(0, after.indexOf("const detailLine"));
  for (const pat of [/verdict = "block"/, /verdict = "approve"/, /reasoning = /]) {
    assert.doesNotMatch(guard, pat,
      `the CI-conclusion finding must NEVER touch the verdict or the reasoning (${pat}). A CI read ` +
      "that could flip a gate re-grades every ship on the platform at once, so it is reported only.");
  }
  assert.doesNotMatch(src.slice(src.indexOf("function verdictFor")).slice(0, 4000), /ciConclusion/,
    "verdictFor() must not read the CI-conclusion finding at all");

  // ONE ALWAYS-PRINTED PROSE LINE, and the same reported-only key in the payload AND both judge
  // contexts — SES-337's lesson: the same evidence key carrying less in one lane than the other is a
  // lane-shaped difference in the ledger.
  assert.match(src, /CI CONCLUSION: /,
    "the prose must carry one always-printed `CI CONCLUSION:` line, in every case including the clean one");
  // ANCHORED ON THE judgeCtx LITERALS THEMSELVES, on agt-174's precedent. Anchoring on
  // `graded_sha: gradedSha,` instead would be wrong here and measurably so: that string appears at SIX
  // sites in this file (the re-grade path and the row builder among them), so three of the six carry no
  // judge context at all and the assertion would report a defect that is not there.
  const literals = src.split(/const judgeCtx = \{/).slice(1);
  assert.strictEqual(literals.length, 2,
    `scripts/verifier.js must still have exactly two judgeCtx literals (session and executor); got ${literals.length}`);
  for (const [i, block] of literals.entries()) {
    assert.match(block.slice(0, 4000), /ci_conclusion: ciConclusion,/,
      `judgeCtx literal ${i + 1} must carry ci_conclusion: — the same evidence key in BOTH judge lanes, ` +
      "or one judge grades the ship with a fact about its CI grade that the other never sees (SES-337's lesson)");
  }
  // THREE `const payload = {` literals live in this file (two early exits and the verdict's own), so
  // `[1]` would grade the wrong one -- measured on this test's own first run rather than assumed. The
  // verdict payload is the one carrying the regression delta's keys.
  const payload = src.split("const payload = {").slice(1)
    .find(b => b.slice(0, 6000).includes("regression_baseline_source:"));
  assert.ok(payload, "scripts/verifier.js must still build the verdict `payload` literal");
  assert.match(payload.slice(0, 6000), /ci_conclusion: ciConclusion,/,
    "the --json payload must report the finding, reported-only: no new runner_verdicts column and no " +
    "migration (AGT-170's convention, AGT-174's precedent)");
}

async function run(/* ctx */) {
  const results = [];

  const block = topLevelConcurrency(fs.readFileSync(CI_ABS, "utf8"));
  assert.ok(block.group, `${CI_REL}'s concurrency block must carry a \`group:\``);

  pushGroupsAreOnePerSha(block.group);
  results.push("A-push-groups-are-one-per-sha-on-dev-and-main");

  pullRequestGroupsStayRefWide(block);
  results.push("B-pull_request-stays-ref-wide-with-cancel-in-progress-true");

  results.push(theWorkflowStillParses()
    ? "C-workflow-parses-under-PyYAML-structure-unchanged"
    : "C-DECLARED-NOT-RUN-no-python3-or-PyYAML");

  await theFindingNamesWhichGapFired();
  results.push("D-finding-discriminates-all-five-clauses-and-stays-non-gating");

  return results;
}

selfRun(import.meta.url, run);
export default run;
