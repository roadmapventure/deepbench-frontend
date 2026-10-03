// DeepBench v7.0.435 | tests/regression/ses-332-first-run.test.mjs | SES-332 -- the Prioritizer's
// first run over the whole open board.
//
// WHAT IS BEING PINNED, AND THE SHAPE A LAZIER GUARD WOULD PASS VACUOUSLY.
//
// (1) THE LIVE ARM'S DISCRIMINATOR IS "ZERO TYPELESS OPEN ROWS", WHICH WAS 223 THE HOUR BEFORE THIS
// SHIPPED. A guard that asserted "some rows have a type" would have passed on the unedited board --
// 344 of 567 already did. The kickoff's own QA question is the right one: would this pass if the run
// wrote nothing? No: 223 rows would still be typeless. Part (a) asserts exactly that, plus the two
// properties the write path is supposed to guarantee and could plausibly break -- every served class
// carries a reason (ck_backlog_supports_reason_with_class exists, but the CONSTRAINT is not proof the
// handler populates it; a NULL supports_class with a stranded reason passes the constraint and would
// mean the reason was written against nothing), and every served class is in the NAMED form.
//
// (2) THE `priority_class` GUARD IS ASSERTED ON THE PATH TAKEN, NOT ON THE OUTPUT. This is the rule
// SES-332 actually turns on: never overwrite an existing class. Asserting "the board still has
// classes" proves nothing -- it would pass if every class had been rewritten to something else. So
// part (c) drives the REAL driver's own code (normalizeType, validate) and part (d) proves the
// substitution BRANCH exists and is reached, by reading the driver's source for the read-back-then-
// substitute shape and then MUTATING it and asserting the check rejects the mutant. A comparison
// that cannot reject a mutant is measuring nothing (SES-135's rule).
//
// (3) THE `--intent` FALLBACK IS PINNED BOTH DIRECTIONS. The residue fix makes an omitted --intent
// mean the capability's default_intent_slug. The failure mode it replaces is SILENT: the prompt still
// assembles, just with no Intent Skill at all, so a one-direction test ("--intent omitted produces a
// prompt") passes on the broken behaviour. Part (b) asserts the omitted-flag prompt is BYTE-IDENTICAL
// to the explicit-flag one AND that `--intent=none` still produces the shorter, AA-188 assembly --
// which is the property that proves the deliberate no-intent path was not destroyed by the fix.
//
// WHICH BRANCH FIRED IS ANNOUNCED. Parts (c) and (d) are source/in-process and always run. Parts (a)
// and (b) touch Supabase and declare themselves NOT RUN via notRun() when credentials are absent,
// rather than passing quietly.

import assert from "assert";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { validate, normalizeType } from "../../scripts/prioritizer-first-run.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DRIVER = path.join(ROOT, "scripts/prioritizer-first-run.mjs");
const PROMPT_SCRIPT = path.join(ROOT, "scripts/agent-prompt.js");
const P1_LIST = path.join(ROOT, "docs/design/2026-09-09-p1-served-list.md");

const CLASS_FORM = /^P([1-9]|10) - /;
const hasCreds = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
const CRED_HINT =
  "set SUPABASE_URL and SUPABASE_SERVICE_KEY (runner_secrets, exported inline per " +
  "docs/runbooks/session-setup.md step 1b) and re-run the suite";

async function rows(query) {
  const key = process.env.SUPABASE_SERVICE_KEY;
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${query}`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  return r.json();
}

// The predicate part (d)'s negative control is run against. A function, not two inline asserts: a
// control that runs different code from the real check proves nothing about the real check.
function hasReadBackSubstitution(source) {
  // The three things that together ARE the guard: read the stored row at write time, branch on a
  // stored class existing, and assign the STORED value over the ruling's.
  return /await rest\(`backlog_items\?backlog_id=eq/.test(source)
    && /if \(stored\.priority_class\)/.test(source)
    && /priority_class = stored\.priority_class/.test(source);
}

async function run() {
  const source = fs.readFileSync(DRIVER, "utf8");

  // ---- (c) the driver's own validation, in process -------------------------------------------
  // Both directions on every clause that can let a bad ruling through. `schema.required` is passed
  // as the real Intent schema's key list so a shortened list cannot make this pass.
  const required = ["backlog_id", "priority_class", "supports_class", "supports_reason", "type",
    "claim_refs", "confidence", "account"];
  const good = {
    backlog_id: "SES-332", priority_class: "P10 - Tooling", supports_class: null,
    supports_reason: null, type: "Tooling", claim_refs: [], confidence: "high", account: "Classed one ticket.",
  };
  assert.deepStrictEqual(validate(good, { required }), [], "a well-formed ruling must produce no problems");

  const bareDigit = validate({ ...good, priority_class: "P10" }, { required });
  assert.ok(bareDigit.some(p => /named class/.test(p)),
    "a bare digit must be refused -- the named form is John's ratified convention and the board's only gate");

  const servedNoRef = validate({ ...good, supports_class: "P1 - Improves John's Skills", supports_reason: "because" }, { required });
  assert.ok(servedNoRef.some(p => /claim_ref/.test(p)),
    "a non-null supports_class with no claim_ref must be refused (pz-guardrails' own must clause)");

  const servedNoReason = validate({ ...good, supports_class: "P1 - Improves John's Skills", supports_reason: "", claim_refs: ["VC-MISSION-033"] }, { required });
  assert.ok(servedNoReason.some(p => /supports_reason/.test(p)),
    "a served class with no reason must be refused before it reaches the DB constraint");

  const tooLong = validate({ ...good, supports_class: "P1 - Improves John's Skills", supports_reason: "x".repeat(301), claim_refs: ["VC-MISSION-033"] }, { required });
  assert.ok(tooLong.some(p => /maxLength/.test(p)), "the schema's 300-char maxLength must be enforced by the driver");

  assert.ok(validate({ ...good, confidence: "certain" }, { required }).some(p => /confidence/.test(p)),
    "a confidence outside high|medium|low must be refused");
  // `delete`, not `account: undefined`: a spread with an undefined value still CREATES the key, so
  // hasOwnProperty() is true and the fixture would be testing nothing. (Caught by this test's own
  // first run.)
  const noAccount = { ...good };
  delete noAccount.account;
  assert.ok(validate(noAccount, { required }).some(p => /account/.test(p)),
    "a missing required key must be reported by name");

  // Type normalization: canonical, synonym, case-variant, and a refusal. The refusal is the clause
  // that matters -- pz-guardrails forbids inventing a type, and a normalizer that passed anything
  // through would make that guardrail unenforceable.
  assert.strictEqual(normalizeType("Tooling").type, "Tooling");
  assert.strictEqual(normalizeType("feature").type, "Feature", "case drift must normalize, not branch the board");
  assert.strictEqual(normalizeType("Bug Fixes").type, "Bug", "the board's own synonym must fold to the canonical value");
  assert.strictEqual(normalizeType("chore").type, "Tech Debt");
  assert.ok(normalizeType("Refactoring").error, "a type outside the taxonomy must be an error, never a guess");
  assert.strictEqual(normalizeType(null).type, null, "a null type must stay null, never become a default");
  console.log("  (c) driver validation + type normalization, both directions -- PASS");

  // ---- (d) the never-overwrite guard exists, and the check can reject a mutant ----------------
  assert.ok(hasReadBackSubstitution(source),
    "scripts/prioritizer-first-run.mjs must read the stored priority_class back at write time and "
    + "substitute it -- SES-332's rule is that the first run never overwrites John's classes, and a "
    + "rule enforced only in the sub-agent's prompt is a rule a model eventually breaks");
  const mutant = source.replace("priority_class = stored.priority_class", "priority_class = ruling.priority_class");
  assert.notStrictEqual(mutant, source, "the mutation did not apply -- this control is vacuous, fix the pattern");
  assert.ok(!hasReadBackSubstitution(mutant),
    "the guard check accepted a driver that writes the RULING's class over the stored one -- it is measuring nothing");

  // The disagreement half of the same rule: a differing ruling has to go somewhere, or the run
  // silently discards the Prioritizer's actual opinion.
  assert.ok(/appendFileSync\(disagreementsFile/.test(source),
    "a differing class ruling must be recorded to the disagreements file -- suppressing it would make "
    + "the never-overwrite rule cost the run its whole judgment");
  assert.ok(fs.existsSync(P1_LIST), `${path.relative(ROOT, P1_LIST)} must exist -- it is John's review artifact`);
  console.log("  (d) never-overwrite guard present, negative control rejects the mutant -- PASS");

  if (!hasCreds()) {
    notRun("(a) the board's post-run state", CRED_HINT);
    notRun("(b) the --intent fallback against the live capability row", CRED_HINT);
    return;
  }

  // ---- (a) LIVE: the board after the first run -------------------------------------------------
  const board = await rows("backlog_items?status=in.(open,partial)"
    + "&select=backlog_id,type,priority_class,supports_class,supports_reason&limit=5000");
  assert.ok(board.length > 100, `expected the full open board, got ${board.length} rows`);

  const typeless = board.filter(r => !r.type || !String(r.type).trim());
  assert.strictEqual(typeless.length, 0,
    `${typeless.length} open/partial rows still have no type (223 did before SES-332): `
    + typeless.slice(0, 8).map(r => r.backlog_id).join(", "));

  const classless = board.filter(r => !r.priority_class || !CLASS_FORM.test(r.priority_class));
  assert.strictEqual(classless.length, 0,
    `${classless.length} open/partial rows carry no named priority class: `
    + classless.slice(0, 8).map(r => r.backlog_id).join(", "));

  const served = board.filter(r => r.supports_class);
  assert.ok(served.length > 0, "no open ticket carries a served class -- the first run's second half wrote nothing");
  const badForm = served.filter(r => !CLASS_FORM.test(r.supports_class));
  assert.strictEqual(badForm.length, 0,
    `${badForm.length} served classes are not in the named form: ${badForm.slice(0, 5).map(r => r.backlog_id).join(", ")}`);
  const noReason = served.filter(r => !r.supports_reason || !String(r.supports_reason).trim());
  assert.strictEqual(noReason.length, 0,
    `${noReason.length} served classes carry no reason: ${noReason.slice(0, 5).map(r => r.backlog_id).join(", ")}`);
  // The inverse, which the DB constraint does NOT catch: a reason written against no class means the
  // reason was authored about something and then the class was dropped.
  const strandedReason = board.filter(r => !r.supports_class && r.supports_reason && String(r.supports_reason).trim());
  assert.strictEqual(strandedReason.length, 0,
    `${strandedReason.length} rows carry a supports_reason with no supports_class: `
    + strandedReason.slice(0, 5).map(r => r.backlog_id).join(", "));

  console.log(`  (a) LIVE: ${board.length} open/partial rows, 0 typeless, ${served.length} served, `
    + "every served class named and reasoned -- PASS");

  // ---- (b) LIVE: the --intent fallback, both directions ---------------------------------------
  const runPrompt = args => execFileSync(process.execPath, [PROMPT_SCRIPT, ...args],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: process.env });
  const base = ["--agent=prioritizer", "--capability=classify-ticket", '--task={"backlog_id":"SES-332"}'];
  const explicit = runPrompt([...base, "--intent=pz-classify-intent"]);
  const fallback = runPrompt(base);
  assert.strictEqual(fallback, explicit,
    "an omitted --intent must assemble the SAME prompt as the capability's default_intent_slug -- "
    + "AGT-67's defect was that it silently assembled with NO Intent Skill at all");
  const none = runPrompt([...base, "--intent=none"]);
  assert.notStrictEqual(none, explicit,
    "--intent=none must still produce AA-188's deliberate no-intent assembly -- the fallback must not "
    + "make the intentional path unreachable");
  assert.ok(none.length < explicit.length,
    "the no-intent assembly must be SHORTER (the Intent section is dropped); it was not, so the flag "
    + "is being ignored rather than honoured");
  console.log("  (b) LIVE: --intent omitted == explicit default, --intent=none still drops the Intent -- PASS");
}

export default run;
selfRun(import.meta.url, run);
