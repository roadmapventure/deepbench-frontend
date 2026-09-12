// DeepBench v7.0.468 | tests/regression/ses-343-verdict-severity.test.mjs | SES-343 -- THE SEVERITY
// MODEL ON THE VERDICT CONTRACT, graded on the 27 judgments that exposed it and at the seam that
// records them.
//
// WHAT IS PINNED, and where a lazier guard would go vacuously green.
//
// (A) THE REAL JUDGMENTS, NOT STRINGS THIS FILE MADE UP. `tests/fixtures/verdicts-30-judgments.json`
// holds 27 verdicts a live `verify-ship` agent actually produced, and the fixture's own snapshot of
// `vf-verdict-intent`'s schema. Measured on origin/dev 2026-09-12: 17 of those 27 are REJECTED by
// `validateAgentVerdict()` -- 17 on `architect_lens` (1,212-1,464 chars against maxLength 1,200), 3
// on `pm_lens`, none on any other key. Under `{ truncate: true }` all 27 must validate and exactly
// those 17 must carry a `truncations` entry. A test written against invented strings would keep
// passing through a change that only ever handled the shapes the author imagined.
//
// (B) THE CONTROL IS THE SAME 27 WITH NO OPTION, AND IT IS THE HALF THAT PROVES THE FLAG DOES THE
// WORK. Without it, part (A) is equally green under an implementation that truncates unconditionally
// -- which would silently loosen `run-project.js:605` and `rank-backlog.js:159`, both of which call
// this validator with no options and must keep the strict contract they were written against. So the
// default is asserted to still reject exactly 17, each with a /maxLength/ error.
//
// (C) THE DECISIVE KEYS STAY FATAL, PROVEN BY MAKING ONE OF THEM OVERFLOW. `backlog_id` given
// `maxLength: 3` in a scratch copy of the schema must still be an ERROR with `truncations` EMPTY:
// a severity model that cut `backlog_id` to "AGT" would put a verdict on a ticket that does not
// exist, which is the exact failure `verdictIdentityMismatch()` was shipped for. The four other
// mutants -- a `verdict` outside the enum, an `auto_done_eligible` of `"true"`, a `missing_evidence`
// of `"none"`, a deleted `architect_lens` -- are the shapes `{ truncate: true }` must NOT swallow:
// only a length overflow on a non-decisive key is forgiven, never a type, an enum or a missing key.
//
// (D) THE NOTE NAMES THE DECISIVE KEYS, AND THE ASSERTION IS TIED TO `DECISIVE_KEYS` ITSELF, so
// adding a fifth decisive key and leaving the sentence behind goes red here rather than quietly
// promising a reader something the code no longer does.
//
// (E) THE SEAM, RUN AS A PROCESS AGAINST THE LIVE INTENT ROW. (A)-(D) grade the function; they say
// nothing about whether pass two actually reaches `recordJudgedVerdict()` with the cut verdict. The
// AGT-63 v7.0.428 judgment is the one measured in the ticket: on origin/dev
// `--judge=session --dry-run --json` on it exits 2 with
// `schema_errors: ["\"architect_lens\" is 1464 characters, over the schema's maxLength 1200"]` and
// writes nothing. Here it must exit 0 or 1 -- never 2 -- and the payload must carry the truncation
// and the note. CREDENTIALED: the Intent's schema is read live, so this part is declared not-run
// without SUPABASE_URL / SUPABASE_SERVICE_KEY rather than faked against the fixture's copy.
//
// `--dry-run`, SO THERE IS NO WRITE OF ANY KIND. `recorded: false` is asserted, not assumed: a seam
// proof that inserted a real `runner_verdicts` row would poison the rolling telemetry the reviewer
// lane reads (SES-181's rule), and the assertion is what keeps this file honest about that. The two
// scratch files it writes live under `os.tmpdir()` and are removed in a `finally`.

import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import * as V from "../../scripts/verifier.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const JUDGMENTS = path.join(ROOT, "tests", "fixtures", "verdicts-30-judgments.json");

// The counts measured on this fixture 2026-09-12, before the change. Literals on purpose: if the
// fixture is ever regenerated these numbers move, and that is a fact about the ledger the reader
// must be told rather than a threshold this file should quietly follow.
const TOTAL = 27;
const OVERFLOWING = 17;
const ARCHITECT_OVERFLOWS = 17;
const PM_OVERFLOWS = 3;
const LENS_CAP = 1200;

// The ticket's own measured example -- the same judgment part (E) spawns the verifier on.
const AGT63 = { ticket: "AGT-63", version: "v7.0.428", from: 1464, to: 1200 };

const clone = v => JSON.parse(JSON.stringify(v));

export default async function run() {
  // The export assertion FIRST, and before any fixture work: on unchanged source `truncationNote`
  // does not exist, and a file that got as far as part (A) before saying so would report the
  // severity model as broken rather than as absent.
  assert.strictEqual(typeof V.truncationNote, "function",
    "scripts/verifier.js exports no truncationNote() -- the severity model (SES-343) is not in this tree");
  assert.ok(Array.isArray(V.DECISIVE_KEYS) && V.DECISIVE_KEYS.length,
    "scripts/verifier.js exports no DECISIVE_KEYS, so nothing states which misses stay fatal");

  const fx = JSON.parse(fs.readFileSync(JUDGMENTS, "utf8"));
  const schema = fx.intent_schema;
  assert.ok(schema && schema.required?.length,
    `${path.relative(ROOT, JUDGMENTS)} carries no snapshot of the Intent's schema, so the judgments below are graded against nothing`);
  assert.strictEqual(fx.judgments.length, TOTAL,
    `the fixture holds ${fx.judgments.length} judgments; the counts asserted here were measured on ${TOTAL}`);

  // ---- (A) all 27 validate under { truncate: true }, exactly 17 are cut ------------------------
  const before = clone(fx.judgments);
  let cut = 0, cutEntries = 0, architect = 0, pm = 0, untouched = 0;
  fx.judgments.forEach((j, i) => {
    const r = V.validateAgentVerdict(schema, j, { truncate: true });
    assert.ok(r.ok,
      `judgment ${i} (${j.backlog_id} ${j.version}) still fails its own contract under { truncate: true }: ${r.errors.join("; ")}`);
    assert.ok(Array.isArray(r.truncations), `judgment ${i} returned no truncations array`);
    if (r.truncations.length) {
      cut++;
      cutEntries += r.truncations.length;
      for (const t of r.truncations) {
        assert.ok(!V.DECISIVE_KEYS.includes(t.key), `a DECISIVE key ("${t.key}") was cut on judgment ${i} -- decisive misses are fatal, never truncated`);
        assert.strictEqual(t.to, schema.properties[t.key].maxLength,
          `judgment ${i}: ${t.key} was cut to ${t.to}, not to the schema's own maxLength ${schema.properties[t.key].maxLength}`);
        assert.strictEqual(t.from, j[t.key].length, `judgment ${i}: ${t.key}'s reported "from" is not the input's length`);
        assert.strictEqual(r.value[t.key].length, t.to,
          `judgment ${i}: ${t.key} is ${r.value[t.key].length} characters in the returned value, not the ${t.to} it was reported cut to`);
        if (t.key === "architect_lens") architect++;
        if (t.key === "pm_lens") pm++;
      }
    } else {
      untouched++;
      // Nothing was cut, so the caller must get its OWN object back -- not a copy that a later
      // reader could mistake for an edited one.
      assert.strictEqual(r.value, j, `judgment ${i} was not truncated, but the returned value is not the input object`);
      assert.deepStrictEqual(r.value, before[i], `judgment ${i} came back changed despite no truncation`);
    }
  });
  assert.strictEqual(cut, OVERFLOWING, `${cut} of ${TOTAL} judgments were truncated; ${OVERFLOWING} overflow the Intent's maxLength`);
  assert.strictEqual(architect, ARCHITECT_OVERFLOWS, `${architect} architect_lens truncations, expected ${ARCHITECT_OVERFLOWS}`);
  assert.strictEqual(pm, PM_OVERFLOWS, `${pm} pm_lens truncations, expected ${PM_OVERFLOWS}`);
  assert.strictEqual(untouched, TOTAL - OVERFLOWING, `${untouched} judgments were left alone, expected ${TOTAL - OVERFLOWING}`);
  // 17 judgments carry 20 cuts, because 3 of them overflow BOTH lenses -- the entry count and the
  // judgment count are different numbers and a guard that conflated them would be measuring neither.
  assert.strictEqual(architect + pm, cutEntries, "a judgment was cut on a key other than the two lenses -- the measurement this ticket was sized against no longer holds");
  assert.strictEqual(cutEntries, ARCHITECT_OVERFLOWS + PM_OVERFLOWS, `${cutEntries} truncation entries across ${cut} judgments, expected ${ARCHITECT_OVERFLOWS + PM_OVERFLOWS}`);

  // THE INPUT IS NOT MUTATED. The SES-337 replay keeps its own copy of what the agent said and
  // compares it to what the platform would record; an in-place slice would make those two the same
  // object and the comparison vacuous.
  assert.deepStrictEqual(fx.judgments, before,
    "validateAgentVerdict({ truncate: true }) mutated the caller's judgments in place");

  // ---- (B) THE CONTROL: the same 27 with no option still reject exactly 17 ---------------------
  let strictRejects = 0;
  for (const j of fx.judgments) {
    const r = V.validateAgentVerdict(schema, j);
    assert.deepStrictEqual(r.truncations, [], `${j.backlog_id} ${j.version}: the strict default truncated something`);
    if (!r.ok) {
      strictRejects++;
      for (const e of r.errors) {
        assert.match(e, /maxLength/,
          `${j.backlog_id} ${j.version} is rejected by the strict default for a reason that is not a length: ${e}`);
      }
    }
  }
  assert.strictEqual(strictRejects, OVERFLOWING,
    `the strict default (no options) rejected ${strictRejects} of ${TOTAL}; it must still reject the same ${OVERFLOWING}, or run-project.js:605 and rank-backlog.js:159 have been loosened without asking`);

  // ---- (C) decisive keys stay fatal; only a non-decisive LENGTH is forgiven --------------------
  // THE BASE IS A JUDGMENT ALREADY INSIDE THE CAP, deliberately: mutating one of the 17 overflowing
  // ones would leave a lens truncation in every result below and `truncations` could never be
  // asserted empty -- the assertion that proves the DECISIVE key was rejected rather than cut.
  const sample = fx.judgments.find(j => V.validateAgentVerdict(schema, j).ok);
  assert.ok(sample, "no judgment in the fixture satisfies the schema strictly, so part (C) has no clean base to mutate");

  const cappedId = clone(schema);
  cappedId.properties.backlog_id = { ...(cappedId.properties.backlog_id || {}), type: "string", maxLength: 3 };
  const idRes = V.validateAgentVerdict(cappedId, sample, { truncate: true });
  assert.strictEqual(idRes.ok, false,
    "backlog_id over its maxLength was truncated instead of rejected -- a cut identity key records a verdict against a ticket nobody filed");
  assert.deepStrictEqual(idRes.truncations, [], "a DECISIVE key was reported as truncated");
  assert.ok(idRes.errors.some(e => e.includes("backlog_id")), `the rejection does not name backlog_id: ${idRes.errors.join("; ")}`);

  const mutants = [
    ["verdict", { ...clone(sample), verdict: "approved" }],
    ["auto_done_eligible", { ...clone(sample), auto_done_eligible: "true" }],
    ["missing_evidence", { ...clone(sample), missing_evidence: "none" }],
    ["architect_lens", (() => { const m = clone(sample); delete m.architect_lens; return m; })()],
  ];
  for (const [key, mutant] of mutants) {
    const r = V.validateAgentVerdict(schema, mutant, { truncate: true });
    assert.strictEqual(r.ok, false, `{ truncate: true } accepted a verdict whose "${key}" does not satisfy the schema`);
    assert.ok(r.errors.some(e => e.includes(key)), `the rejection for "${key}" does not name it: ${r.errors.join("; ")}`);
  }

  // ---- (D) the note -------------------------------------------------------------------------
  assert.strictEqual(V.truncationNote([]), "", "an empty truncation list must produce no note at all, not an empty-ish sentence");
  const note = V.truncationNote([
    { key: "architect_lens", from: AGT63.from, to: AGT63.to },
    { key: "pm_lens", from: 1261, to: LENS_CAP },
  ]);
  assert.ok(note.includes(`architect_lens ${AGT63.from}->${AGT63.to}`), `the note does not say what was cut: ${note}`);
  assert.ok(note.includes("pm_lens 1261->1200"), `the note names only the first of two cuts: ${note}`);
  for (const key of V.DECISIVE_KEYS) {
    assert.ok(note.includes(key),
      `the note promises the decisive keys were untouched but never names "${key}" -- DECISIVE_KEYS and the sentence have drifted`);
  }

  // ---- (E) THE SEAM: pass two records the cut verdict instead of exiting 2 ---------------------
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    notRun("the pass-two seam proof",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY are absent, and pass two reads vf-verdict-intent's schema live -- grading it against the fixture's copy instead would prove the function, which parts (A)-(D) already do, and not the seam. Run: node --env-file=.env.local tests/regression/ses-343-verdict-severity.test.mjs");
    return;
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ses-343-"));
  try {
    // `findings` is the live schema's name for what the fixture recorded as `reasoning` (SES-347's
    // rename); `verdict_id` is the fixture's own bookkeeping and was never part of the contract.
    const agt63 = fx.judgments.find(j => j.backlog_id === AGT63.ticket && j.version === AGT63.version);
    assert.ok(agt63, `the fixture no longer holds the ${AGT63.ticket} ${AGT63.version} judgment this seam proof is measured on`);
    assert.strictEqual(agt63.architect_lens.length, AGT63.from,
      `${AGT63.ticket} ${AGT63.version}'s architect_lens is ${agt63.architect_lens.length} characters, not the ${AGT63.from} measured -- the seam assertion below would grade a different cut`);
    const judgment = clone(agt63);
    judgment.findings = judgment.reasoning;
    delete judgment.reasoning;
    delete judgment.verdict_id;
    const verdictFile = path.join(dir, "verdict.json");
    const contextFile = path.join(dir, "context.json");
    fs.writeFileSync(verdictFile, JSON.stringify(judgment), "utf8");
    fs.writeFileSync(contextFile, JSON.stringify({ gates: { build: "green", regression: "green", hygiene: "green" } }), "utf8");

    const r = spawnSync(process.execPath, [
      "scripts/verifier.js", "--judge=session",
      `--ticket=${AGT63.ticket}`, `--version=${AGT63.version}`,
      `--verdict-file=${verdictFile}`, `--context-file=${contextFile}`,
      "--dry-run", "--json",
    ], { cwd: ROOT, encoding: "utf8" });

    const output = `${r.stdout || ""}${r.stderr || ""}`;
    assert.notStrictEqual(r.status, 2,
      `pass two exited 2 on a judgment whose only defect is a long lens -- that is the defect SES-343 fixes, unchanged. Output: ${output.slice(0, 600)}`);
    assert.ok(r.status === 0 || r.status === 1, `pass two exited ${r.status}; a judged run exits 0 (approve) or 1 (block). Output: ${output.slice(0, 600)}`);

    let payload;
    try {
      payload = JSON.parse((r.stdout || "").trim());
    } catch (e) {
      throw new Error(`--json did not print a parseable payload (${e.message}). Output: ${output.slice(0, 600)}`);
    }
    assert.notStrictEqual(payload.kind, "cannot-run", `pass two could not run: ${JSON.stringify(payload).slice(0, 600)}`);
    assert.deepStrictEqual(payload.truncations, [{ key: "architect_lens", from: AGT63.from, to: AGT63.to }],
      `the payload does not carry the one cut this judgment needs: ${JSON.stringify(payload.truncations)}`);
    assert.ok(String(payload.reasoning).includes("Truncated to the Intent's maxLength"),
      "the cut is not stated in the reasoning that reaches runner_verdicts -- a silently shortened lens is indistinguishable from one the agent wrote short");
    assert.strictEqual(payload.recorded, false, "the seam proof is --dry-run and must record NOTHING; a row here poisons the reviewer lane's telemetry");

    console.log(`  SES-343 seam: ${AGT63.ticket} ${AGT63.version} judged (exit ${r.status}, verdict ${payload.verdict}), architect_lens ${AGT63.from}->${AGT63.to}, recorded=false`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

selfRun(import.meta.url, run);
