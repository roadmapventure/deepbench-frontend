// DeepBench v7.0.741 | tests/regression/agt-146-model-watch-routine.test.mjs | AGT-281 -- arm D's
// registry pin moves from six routines to seven: `victoria-reorg` (id null, the model-watch and
// jerry-linkedin-alerts reason -- the routine is created by an attended session, AGT-281 §7). Nothing
// else in this file moves: model-watch's own id, file and markers are asserted by value below and are
// byte-unchanged.
// DeepBench v7.0.728 | tests/regression/agt-146-model-watch-routine.test.mjs | AGT-156 -- arm D's
// registry pin moves from five routines to six: `jerry-linkedin-alerts` (id null, the model-watch
// precedent) joined the drift check. The pin is the point -- a routine may only be added
// deliberately, in a session that says so here.
// DeepBench v7.0.691 | tests/regression/agt-146-model-watch-routine.test.mjs | AGT-155 -- arm D's
// registry pin moves from four routines to five: `market` (trig_015K3zgtnMztuNritHxC6uSW) joined the
// drift check. The pin is the point -- a routine may only be added deliberately, in a session that
// says so here.
// DeepBench v7.0.678 | tests/regression/agt-146-model-watch-routine.test.mjs | AGT-146
// FEATURE: AGT-146 -- the model-watch routine runs the Model Assignment capability on schedule.
// docs/runbooks/model-watch-routine.md is the SOURCE and the routine is the copy (ARCHITECTURE.md
// §19v); scripts/check-routine-prompt.js is what compares the two. Kickoff:
// docs/kickoffs/v7.0.595-AGT-146-model-watch-routine.md §6, QA (a)-(e).
//
//   A  DRIFT CHECK -- the real block as --prompt -> exit 0, findings []; one character changed at
//      block line 2 -> exit 1, ONE finding, location 1 routine/model-watch/prompt (the NAME, because
//      the routine does not exist yet and its id is null); the same drifted text as --routine=auditor
//      -> a DIFFERENT fingerprint (control: the key is the routine, not the text); --routine=other
//      -> exit 2.
//   B  BLOCK CONTENT -- carries the canonical-copy pointer, `steps 0-6`, runner_decisions and
//      `Claude models only`; carries NO model id, NO trigger id, NO `<lower case>` placeholder and no
//      word about sending anything to John. Each forbidden pattern is proved to have teeth on a
//      deliberately violating copy of the same text.
//   C  RUNBOOK -- the table and the steps name every command, function and literal the routine runs
//      on; <= 40,960 bytes.
//   D  REGISTRY -- ROUTINES keys are exactly runner, auditor, researcher, model-watch, market,
//      jerry-linkedin-alerts (AGT-156), victoria-reorg (AGT-281); the three
//      pre-existing ids are byte-unchanged and model-watch's is null; the three sibling suites
//      (agt-102, ses-355, agt-86h) still exit 0 against the changed finding() signature.
//   E  LIVE (credentialed, else notRun) -- the step-3 pair algebra on the real rows: every release
//      candidate is a later-released, non-deprecated, claude-% member of its row's own family, no
//      pair appears twice, and today the query yields exactly lane/orchestrator -> claude-opus-5-5;
//      every Friday downgrade candidate is strictly cheaper than its row's model. Price is read from
//      public.model_pricing -- model_catalog carries no price column.
//
// AMENDED AGAINST THE KICKOFF, deliberately, both named in the ship report:
//   * QA (d) says ROUTINES keys are "exactly runner, auditor, model-watch". AGT-138 (v7.0.608) added
//     `researcher` after this kickoff was written. The live set is four, and deleting a shipped
//     routine to satisfy a stale QA line would be the defect. Asserted as four.
//   * QA (e) says "the runbook's release query". This suite reaches Supabase over PostgREST only and
//     cannot execute arbitrary SQL, so arm E asserts the PAIR ALGEBRA the runbook specifies against
//     the live rows and separately asserts the runbook's SQL text carries each governing clause. The
//     un-run half -- the SQL statement itself, executed by Postgres -- is declared through notRun().
//
// Pre-change: A-D fail on origin/dev (no runbook, no ROUTINES entry, no file); E has no pair to run.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { fingerprint } from "../../scripts/audit-ledger.js";
import { ROUTINES } from "../../scripts/check-routine-prompt.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT = path.join(ROOT, "scripts", "check-routine-prompt.js");
const RUNBOOK = path.join(ROOT, "docs", "runbooks", "model-watch-routine.md");
const BEGIN = "<!-- MODEL-WATCH-ROUTINE-PROMPT-BEGIN -->";
const END = "<!-- MODEL-WATCH-ROUTINE-PROMPT-END -->";
const SIZE_CAP = 40960;
const lf = t => String(t).replace(/\r\n/g, "\n");

function blockLines(md) {
  const lines = lf(md).split("\n");
  const a = lines.indexOf(BEGIN), b = lines.indexOf(END);
  assert.ok(a >= 0 && b > a, "model-watch prompt markers present");
  return lines.slice(a + 1, b);
}

function check(args) {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { cwd: ROOT, encoding: "utf8" });
  return { code: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

// The step-3 release query, as algebra over the same rows the SQL joins.
export function releasePairs(assignments, catalog) {
  const byId = new Map(catalog.map(c => [c.model_id, c]));
  const out = [];
  for (const a of assignments) {
    const c = byId.get(a.model_id);
    if (!c) continue;                                     // the SQL's inner join drops it
    const curDate = String(c.released_on ?? c.first_seen).slice(0, 10);
    const n = catalog
      .filter(x => x.family === c.family && x.model_id !== c.model_id
        && x.released_on !== null && x.released_on !== undefined
        && String(x.released_on).slice(0, 10) > curDate
        && x.deprecated_on === null && String(x.model_id).startsWith("claude-"))
      .sort((p, q) => String(q.released_on).localeCompare(String(p.released_on)))[0];
    if (n) out.push({ job_kind: a.job_kind, job_key: a.job_key, candidate: n.model_id, cur_date: curDate, family: c.family });
  }
  return out;
}

// The step-3 Friday downgrade query: the highest-priced model strictly cheaper than the row's.
export function downgradePairs(assignments, catalog, pricing) {
  const byId = new Map(catalog.map(c => [c.model_id, c]));
  const price = new Map(pricing.map(p => [p.model, Number(p.input_per_1k)]));
  const out = [];
  for (const a of assignments) {
    const mine = price.get(a.model_id);
    if (mine === undefined) continue;                     // the SQL's join to model_pricing
    const n = pricing
      .filter(p => Number(p.input_per_1k) < mine)
      .map(p => ({ model: p.model, price: Number(p.input_per_1k), cat: byId.get(p.model) }))
      .filter(x => x.cat && x.cat.deprecated_on === null && String(x.model).startsWith("claude-"))
      .sort((p, q) => q.price - p.price)[0];
    if (n) out.push({ job_kind: a.job_kind, job_key: a.job_key, candidate: n.model, cur_price: mine, cand_price: n.price });
  }
  return out;
}

// Every alias bound to public.model_catalog that is then used to qualify input_per_1k. Price lives
// on public.model_pricing; model_catalog has no price column, so any hit here is a query that would
// fail at runtime (kickoff §2 read input_per_1k as a model_catalog column -- it is not one).
export function catalogPriceRefs(text) {
  const out = [];
  for (const m of String(text).matchAll(/model_catalog\s+(?:as\s+)?([a-z]\w*)/gi)) {
    const alias = m[1];
    if (new RegExp(`\\b${alias}\\.input_per_1k\\b`).test(text)) out.push(alias);
  }
  return [...new Set(out)];
}

async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`${name}: ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agt146-"));
  const write = (n, t) => { const p = path.join(tmp, n); fs.writeFileSync(p, t); return p; };
  const readOut = p => JSON.parse(fs.readFileSync(p, "utf8"));
  const md = fs.readFileSync(RUNBOOK, "utf8");
  const lines = blockLines(md);
  const block = lines.join("\n");

  try {
    await arm("A drift check", async () => {
      const okOut = path.join(tmp, "a.json");
      const r0 = check(["--routine=model-watch", `--prompt=${write("a.txt", block)}`, `--out=${okOut}`]);
      assert.equal(r0.code, 0, `exit 0 on the real block (got ${r0.code}: ${r0.stderr})`);
      const j = readOut(okOut);
      assert.deepEqual(j.findings, [], "no findings on the real block");
      assert.equal(j.found_by, "check-routine-prompt:model-watch");
      assert.deepEqual([j.carried, j.gone], [[], []]);

      // Block line 2 is the blank separator between paragraph 1 and 2. Drifting it is the STRONGER
      // control, not the weaker one: a comparator that trimmed or collapsed blank lines would miss
      // this and pass a prompt whose paragraphs had been run together.
      assert.equal(lines[1], "", "block line 2 is the blank paragraph separator");
      const d = [...lines];
      d[1] = "X";
      const dPath = write("b2.txt", d.join("\n"));
      const dOut = path.join(tmp, "b2.json");
      const r1 = check(["--routine=model-watch", `--prompt=${dPath}`, `--out=${dOut}`]);
      assert.equal(r1.code, 1, `exit 1 on drift (got ${r1.code}: ${r1.stderr})`);
      const f = readOut(dOut).findings;
      assert.equal(f.length, 1, "exactly one finding");
      assert.equal(f[0].check_slug, "routine-prompt-drift");
      assert.equal(f[0].kind, "contradiction");
      assert.equal(f[0].confidence, "high");
      // The routine was created 2026-09-29 (status-0929), so the location now carries its id; the
      // NAME fallback still holds for any routine registered before its id exists.
      assert.equal(f[0].locations[0].location, "routine/trig_01QTxphS7u5dzD5HdChCBzjV/prompt",
        "the created routine locates by its trigger id, never by the string 'null'");
      assert.ok(!f[0].locations[0].location.includes("null"), "no `routine/null/prompt`");
      assert.equal(f[0].locations[0].text, "X", "location 1 quotes the first differing live line");
      assert.match(f[0].locations[1].location, /^docs\/runbooks\/model-watch-routine\.md:\d+$/);
      const repoNo = Number(f[0].locations[1].location.split(":")[1]);
      assert.equal(lf(md).split("\n")[repoNo - 1], lines[1], "the repo line number points at that line");

      // Control: the SAME drifted text against another routine is a different fingerprint -- the key
      // is the routine, not the text.
      const aOut = path.join(tmp, "bA.json");
      assert.equal(check(["--routine=auditor", `--prompt=${dPath}`, `--out=${aOut}`]).code, 1,
        "auditor control drifts on this text");
      const fA = readOut(aOut).findings;
      assert.notEqual(fingerprint(fA[0]), fingerprint(f[0]),
        "control: another routine's drift is another fingerprint");

      // A drift on a DIFFERENT line of the same routine is the SAME fingerprint (one routine, one
      // finding per week, whatever line moved).
      const d2 = [...lines];
      d2[0] = d2[0].replace(/^DEEPBENCH /, "");
      assert.notEqual(d2[0], lines[0], "a word was deleted at line 1");
      const o2 = path.join(tmp, "b1.json");
      assert.equal(check(["--routine=model-watch", `--prompt=${write("b1.txt", d2.join("\n"))}`, `--out=${o2}`]).code, 1);
      assert.equal(fingerprint(readOut(o2).findings[0]), fingerprint(f[0]),
        "same routine's drift on another line: one fingerprint");

      assert.equal(check(["--routine=other", `--prompt=${dPath}`]).code, 2, "--routine=other exits 2");
      assert.equal(check([`--prompt=${dPath}`]).code, 2, "a missing --routine exits 2");
      const usage = check([`--prompt=${dPath}`]).stderr;
      assert.match(usage, /model-watch/, "the usage message names model-watch");

      // CRLF + a trailing newline is the ONLY normalization; a trailing space is still drift.
      assert.equal(check(["--routine=model-watch", `--prompt=${write("c.txt", lines.join("\r\n") + "\r\n\n")}`]).code, 0,
        "CRLF + trailing newline is equal");
      assert.equal(check(["--routine=model-watch", `--prompt=${write("c2.txt", block + " ")}`]).code, 1,
        "control: a trailing space is drift");
    });

    await arm("B block content", async () => {
      for (const s of ["docs/runbooks/model-watch-routine.md", "steps 0-6", "runner_decisions", "Claude models only"]) {
        assert.ok(block.includes(s), `the block carries ${JSON.stringify(s)}`);
      }
      const forbidden = [
        ["a model id", /claude-[a-z]+-\d/, "claude-opus-5-5"],
        ["a trigger id", /trig_/, "trig_01BCzPdanZ1YiK956dAqU6YN"],
        ["an unfilled placeholder", /<[a-z ]+>/, "<routine id>"],
        ["anything sent to John", /notif|phone|push to John/i, "push to John"],
      ];
      for (const [what, re, violation] of forbidden) {
        assert.ok(!re.test(block), `the block carries no ${what}`);
        // Teeth: the same pattern DOES fire on a copy that violates it, so a green arm above means
        // the block is clean -- not that the regex never matches anything (LOO-013).
        assert.ok(re.test(block + "\n" + violation), `control: ${what} is detectable when present`);
      }
      assert.ok(lines.length <= 25, `the block is ${lines.length} lines (cap 25)`);
      assert.equal(lines.filter(l => l.trim() !== "").length, 4, "four paragraphs, as the auditor's block");
    });

    await arm("C runbook", async () => {
      for (const s of [
        "model-watch", "30 9 * * *", "env_01GuEzm2nCHbCB5SumvQVEQ1", "2026-11-01", "30 10 * * *",
        "--routine=model-watch --prompt=$S/prompt.txt", "review_model_watch(NULL", "apply_model_assignment(",
        "scripts/model-trial.js", "scripts/sync-routine-models.js", "'model-report'", "interval '28 days'",
        "MONEY waiting on John",
      ]) {
        assert.ok(md.includes(s), `the runbook names ${JSON.stringify(s)}`);
      }
      const bytes = Buffer.byteLength(md, "utf8");
      assert.ok(bytes <= SIZE_CAP, `runbook is ${bytes} B (cap ${SIZE_CAP})`);
      // The runbook must not have re-grown AGT-102's placeholder in its own table.
      assert.ok(!md.includes("<routine id>"), "no `<routine id>` placeholder in the table");
      // Price comes from model_pricing, never a column on model_catalog (the kickoff §2 read it as
      // one; scripts/model-assignment.js and §S both join the two tables).
      assert.ok(md.includes("public.model_pricing"), "the downgrade query names public.model_pricing");
      // Precisely: no alias BOUND to model_catalog may qualify input_per_1k. A crude line-level
      // regex is wrong here -- the downgrade query legitimately names `model_catalog c2` and
      // `mp2.input_per_1k` on one line, binding two different tables.
      assert.deepEqual(catalogPriceRefs(md), [], "no input_per_1k is read off a model_catalog alias");
      assert.deepEqual(
        catalogPriceRefs("join public.model_catalog c9 on true where c9.input_per_1k < 1"),
        ["c9"], "control: an input_per_1k read off a catalog alias IS detected");
      // Step 3's exit-4 clause must be the AMENDED one: the orchestrator lane has an evidence path.
      assert.ok(md.includes("build-ticket:bd-build-intent:depth0"),
        "step 3 names the orchestrator lane's replayable feature");
      // §S's superseded sentence may be QUOTED in the amendment note (that is the record of what
      // changed), but must never stand as the rule in step 3 itself. Every occurrence must sit on a
      // blockquote line.
      const supersededOn = lf(md).split("\n")
        .filter(l => l.includes("or capability pair has no evidence path"));
      assert.equal(supersededOn.length, 1, "the superseded sentence appears exactly once");
      assert.ok(supersededOn[0].trimStart().startsWith(">"),
        "the superseded sentence appears only inside the amendment note, never as step 3's rule");
      assert.ok(/Amended against/i.test(md), "the amendment is recorded in the runbook, not silent");
    });

    await arm("D registry", async () => {
      assert.deepEqual(Object.keys(ROUTINES).sort(),
        ["auditor", "jerry-linkedin-alerts", "market", "model-watch", "researcher", "runner", "victoria-reorg"],
        "seven routines: AGT-281 added victoria-reorg");
      assert.equal(ROUTINES.runner.id, "trig_017TZ3JZcLBK6AYH6DKURqMH", "runner id unchanged");
      assert.equal(ROUTINES.auditor.id, "trig_01BCzPdanZ1YiK956dAqU6YN", "auditor id unchanged");
      assert.equal(ROUTINES.researcher.id, "trig_01862LsK4ZQF8PTgQoK2cgCV", "researcher id unchanged");
      assert.equal(ROUTINES["model-watch"].id, "trig_01QTxphS7u5dzD5HdChCBzjV", "model-watch id filled once the routine exists (2026-09-29)");
      assert.equal(ROUTINES["model-watch"].file, "model-watch-routine.md");
      assert.equal(ROUTINES["model-watch"].begin, BEGIN);
      assert.equal(ROUTINES["model-watch"].end, END);
      // finding()'s signature changed; the three suites that exercise it must still exit 0.
      for (const sib of ["agt-102-routine-prompt-drift.test.mjs", "ses-355-routine-prompt.test.mjs",
                         "agt-86h-auditor-routine.test.mjs"]) {
        const r = spawnSync(process.execPath, [path.join(ROOT, "tests", "regression", sib)],
          { cwd: ROOT, encoding: "utf8" });
        assert.equal(r.status, 0, `${sib} still green (got ${r.status}): ${(r.stdout ?? "").slice(-400)}`);
      }
    });

    await arm("E live pairs", async () => {
      const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
      const key = process.env.SUPABASE_SERVICE_KEY ?? "";
      if (!url || !key) {
        notRun("AGT-146 arm E (the step-3 pair algebra on live rows)",
          "SUPABASE_URL + SUPABASE_SERVICE_KEY absent -- model_assignments / model_catalog / model_pricing are unreadable here. Credentialed run: STANDARDS.md Section 2 rule 5");
        return;
      }
      const get = async q => {
        const res = await fetch(`${url}/rest/v1/${q}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
        const text = await res.text();
        if (!res.ok) throw new Error(`GET ${q} -> HTTP ${res.status} ${text.slice(0, 240)}`);
        return JSON.parse(text);
      };
      const assignments = await get("model_assignments?select=job_kind,job_key,model_id&order=job_kind,job_key");
      const catalog = await get("model_catalog?select=model_id,family,released_on,first_seen,deprecated_on");
      const pricing = await get("model_pricing?select=model,input_per_1k");
      assert.ok(assignments.length > 0 && catalog.length > 0 && pricing.length > 0, "the three tables have rows");

      const rel = releasePairs(assignments, catalog);
      const byId = new Map(catalog.map(c => [c.model_id, c]));
      for (const p of rel) {
        const cand = byId.get(p.candidate);
        assert.ok(cand, `candidate ${p.candidate} is a catalog row`);
        assert.equal(cand.family, p.family, "a release candidate is in its row's own family");
        assert.ok(String(cand.released_on).slice(0, 10) > p.cur_date,
          `${p.candidate} released ${cand.released_on} is later than ${p.cur_date}`);
        assert.equal(cand.deprecated_on, null, `${p.candidate} is not deprecated`);
        assert.ok(String(cand.model_id).startsWith("claude-"), `${p.candidate} is a Claude model`);
      }
      const keys = rel.map(p => `${p.job_kind}/${p.job_key}->${p.candidate}`);
      assert.equal(new Set(keys).size, keys.length, "no pair appears twice");
      assert.deepEqual(keys, ["lane/orchestrator->claude-opus-5-5"],
        `today the release query is exactly the Opus 5.5 trial (got ${JSON.stringify(keys)})`);

      // Teeth: deprecate the candidate and the single pair must disappear -- the filter is load-
      // bearing, not decoration. Read-only: the mutation is on the local copy, never on the table.
      const deprecated = catalog.map(c => c.model_id === "claude-opus-5-5" ? { ...c, deprecated_on: "2026-09-27" } : c);
      assert.deepEqual(releasePairs(assignments, deprecated), [], "control: a deprecated candidate yields no pair");
      // Teeth: an undated catalog is no release evidence at all.
      assert.deepEqual(releasePairs(assignments, catalog.map(c => ({ ...c, released_on: null }))), [],
        "control: with no released_on anywhere there is no release pair");

      const down = downgradePairs(assignments, catalog, pricing);
      assert.ok(down.length > 0, "the Friday downgrade query yields pairs");
      for (const p of down) {
        assert.ok(p.cand_price < p.cur_price,
          `${p.job_kind}/${p.job_key}: ${p.candidate} at ${p.cand_price} is cheaper than ${p.cur_price}`);
        const cand = byId.get(p.candidate);
        assert.equal(cand.deprecated_on, null, `${p.candidate} is not deprecated`);
        assert.ok(String(p.candidate).startsWith("claude-"), `${p.candidate} is a Claude model`);
      }
      const dKeys = down.map(p => `${p.job_kind}/${p.job_key}->${p.candidate}`);
      assert.equal(new Set(dKeys).size, dKeys.length, "no downgrade pair appears twice");
      // The cheapest row can have no cheaper Claude model: that job must simply produce no pair.
      const cheapest = [...pricing].filter(p => String(p.model).startsWith("claude-"))
        .sort((a, b) => Number(a.input_per_1k) - Number(b.input_per_1k))[0];
      assert.deepEqual(downgradePairs([{ job_kind: "lane", job_key: "x", model_id: cheapest.model }], catalog, pricing), [],
        `control: the cheapest Claude model (${cheapest.model}) has nothing to downgrade to`);

      console.log(`    E release ${JSON.stringify(keys)} | downgrade ${JSON.stringify(dKeys)}`);
      notRun("AGT-146 arm E (the runbook's SQL statement executed by Postgres)",
        "this suite reaches Supabase over PostgREST, which cannot run arbitrary SQL. Arm E asserts the PAIR ALGEBRA the runbook specifies against the live rows, and arm C asserts the SQL text carries each governing clause; the statement itself is exercised when the routine fires.");
    });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  if (failures.length) throw new Error(failures.join(" | "));
}

export default run;
selfRun(import.meta.url, run);
