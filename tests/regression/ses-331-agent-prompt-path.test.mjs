// DeepBench v7.0.426 | tests/regression/ses-331-agent-prompt-path.test.mjs | SES-331 -- ONE
// prompt-assembly path for an agent run inside a session.
//
// WHAT IS BEING PINNED, and the shape a lazier guard would pass vacuously.
//
// (1) THE DISCRIMINATOR IS THE DEEP-EQUAL AGAINST A LIVE assemblePrompt() CALL, NOT AN IMPORT
// CHECK. It is easy to assert `scripts/agent-prompt.js` contains the string "assemblePrompt" -- that
// passes against a script that imports it and then builds its own sections anyway, which is exactly
// the defect SES-331 exists to prevent (a session hand-building the prompt is a second copy of the
// executor's assembly). So part (a) runs the REAL SCRIPT as a subprocess, calls the REAL
// assemblePrompt() in-process with the same inputs, and deep-equals `sections` and `format_contract`.
// A re-implementation could only pass this by accident. The negative control is explicit: the same
// predicate is run against a MUTATED copy of the assembly and must REJECT it -- a comparison that
// cannot reject a mutant is measuring nothing.
//
// (2) THE ACTIVITY-LOG SEAM IS PINNED WITHOUT CREDENTIALS, AND THAT HALF ALWAYS RUNS. SES-331's one
// allowed lib/ edit makes logActivity() RETURN its write promise so a CLI can await it. The risk is
// not that the return value is wrong, it is that the REQUEST PATH changed. Part (d) below is a
// seam proof (STANDARDS.md Section 4's labelled third option): globalThis.fetch is intercepted, the
// real logActivity() is driven, and the POST it issues -- url, method, header set, and the full
// parsed body -- is asserted, plus the property that matters most for waitUntil(): the returned
// promise RESOLVES on ok, on non-ok, on a network throw, and on a missing key. It never rejects.
//
// (3) THE `session` CALL SOURCE IS ASSERTED THROUGH THE ALLOWLIST, NOT AS A STRING. `session` is
// only writable because lib/request-context.js allowlists it; ai_activity_log has NO check
// constraint on call_source (read out of pg_constraint 2026-09-09), so that Set is the only gate.
// Part (e) drives the real runWithCallSource() and asserts both directions -- 'session' survives,
// an invented source still lands null.
//
// (4) SES-395 ADDS PART (f): the judgment lane falls back to the orchestrator model when
// public.judgment_model() says Fable is past its share. It is a stub-fetch seam proof -- fetchImpl
// is injected, so it always runs -- and its discriminator is the NON-judgment assembly driven
// through the SAME stub: a function that overrode everything would pass a degrade-only clause while
// silently dropping the Builder's own orchestrator-lane call onto whatever the RPC said.
//
// WHICH BRANCH FIRED IS ANNOUNCED. Parts (c), (d), (e) and (f) are source/in-process and always run.
// Parts (a) and (b) touch Supabase and declare themselves NOT RUN via notRun() when the credentials
// are absent, rather than passing quietly -- an invisible gap is indistinguishable from coverage.

import assert from "assert";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PROMPT_SCRIPT = path.join(ROOT, "scripts/agent-prompt.js");
const LOG_SCRIPT = path.join(ROOT, "scripts/agent-log.js");
const RUNBOOK = path.join(ROOT, "docs/runbooks/session-setup.md");

const AGENT = "owen";
const CAPABILITY = "bench-report-card";
const TENANT = "global";
const TRACE = "ses-331-regression-fixture";
const CALL_SOURCE = "session";

const hasCreds = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
const CRED_HINT =
  "set SUPABASE_URL and SUPABASE_SERVICE_KEY (runner_secrets, exported inline per " +
  "docs/runbooks/session-setup.md step 1b) and re-run the suite";

// The comparison under test AND the thing the negative control is run against. Deliberately a
// function rather than two inline asserts: a control that runs different code from the real check
// proves nothing about the real check.
function assemblyMatches(fromScript, fromLibrary) {
  try {
    assert.deepStrictEqual(fromScript.sections, fromLibrary.sections);
    assert.deepStrictEqual(fromScript.format_contract, fromLibrary.format_contract);
    return true;
  } catch {
    return false;
  }
}

async function supabaseRows(query) {
  const key = process.env.SUPABASE_SERVICE_KEY;
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${query}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!r.ok) throw new Error(`Supabase read failed: HTTP ${r.status} ${await r.text().catch(() => "")}`);
  return r.json();
}

async function run() {
  // ---------------------------------------------------------------------------------------------
  // (c) The runbook section exists and names BOTH scripts. Source-only; always runs.
  // ---------------------------------------------------------------------------------------------
  const runbook = fs.readFileSync(RUNBOOK, "utf8");
  assert.ok(/^### 3f\. Running a governance agent from a session/m.test(runbook),
    "docs/runbooks/session-setup.md is missing its §3f heading");
  const sectionStart = runbook.indexOf("### 3f. Running a governance agent from a session");
  const sectionEnd = runbook.indexOf("### 4. Fetch, rebase", sectionStart);
  assert.ok(sectionEnd > sectionStart, "§3f must sit above §4 -- an empty slice cannot fail honestly");
  const section = runbook.slice(sectionStart, sectionEnd);
  assert.ok(section.includes("scripts/agent-prompt.js"), "§3f must name scripts/agent-prompt.js");
  assert.ok(section.includes("scripts/agent-log.js"), "§3f must name scripts/agent-log.js");
  assert.ok(/never hand-build the prompt/i.test(section), "§3f must state the never-hand-build rule");
  assert.ok(section.includes("llm.model"), "§3f must say the model comes from the assembly");
  console.log("  (c) runbook §3f present, names both scripts and all three rules -- PASS");

  // ---------------------------------------------------------------------------------------------
  // (d) SEAM PROOF over lib/activity-log.js -- the request path is unchanged. No credentials, no
  //     network: globalThis.fetch is replaced for the duration.
  // ---------------------------------------------------------------------------------------------
  const { logActivity } = await import("../../lib/activity-log.js");
  const realFetch = globalThis.fetch;
  const savedUrl = process.env.SUPABASE_URL;
  const savedKey = process.env.SUPABASE_SERVICE_KEY;
  let captured = null;
  try {
    process.env.SUPABASE_URL = "https://seam.example";
    process.env.SUPABASE_SERVICE_KEY = "seam-key";

    globalThis.fetch = async (url, init) => {
      captured = { url, init };
      return { ok: true, status: 201, text: async () => "" };
    };
    const ok = await logActivity({
      agentId: AGENT, aiType: CAPABILITY, feature: "seam", model: "claude-opus-5",
      inputTokens: 1, outputTokens: 2, traceId: "seam",
    });
    assert.strictEqual(ok.ok, true, "an ok POST must resolve { ok: true }");

    assert.strictEqual(captured.url, "https://seam.example/rest/v1/ai_activity_log",
      "the POST target changed -- that is a request-path change, not a return-value change");
    assert.strictEqual(captured.init.method, "POST");
    assert.strictEqual(captured.init.headers.Prefer, "return=minimal",
      "Prefer must stay return=minimal: switching it to return=representation would change what " +
      "every one of the 26 callers sends, to save this script one read-back");
    const body = JSON.parse(captured.init.body);
    assert.strictEqual(body.agent_id, AGENT);
    assert.strictEqual(body.ai_type, CAPABILITY);
    assert.strictEqual(body.model, "claude-opus-5");
    assert.strictEqual(body.input_tokens, 1);
    assert.strictEqual(body.output_tokens, 2);
    assert.strictEqual(body.call_facts, null, "an empty fact set must still write NULL, never {}");
    assert.strictEqual(body.call_source, null, "off-request, with no context, call_source is NULL");

    // The three failure shapes. Every one must RESOLVE -- waitUntil() must never be handed a
    // rejected promise, which is the one behaviour a careless refactor of the .catch() would break.
    globalThis.fetch = async () => ({ ok: false, status: 401, text: async () => "no" });
    const denied = await logActivity({ aiType: CAPABILITY, feature: "seam" });
    assert.strictEqual(denied.ok, false, "a non-ok POST must resolve { ok: false }");
    assert.ok(denied.error.includes("no"), "the error body must reach the caller");

    globalThis.fetch = async () => { throw new Error("socket hang up"); };
    const thrown = await logActivity({ aiType: CAPABILITY, feature: "seam" });
    assert.strictEqual(thrown.ok, false);
    assert.ok(/socket hang up/.test(thrown.error));

    delete process.env.SUPABASE_SERVICE_KEY;
    captured = null;
    const skipped = await logActivity({ aiType: CAPABILITY, feature: "seam" });
    assert.strictEqual(skipped.skipped, true, "a missing key must report the skip, never succeed silently");
    assert.strictEqual(captured, null, "a missing key must issue no request at all");

    const noType = await logActivity({ feature: "seam" });
    assert.strictEqual(noType.skipped, true);
  } finally {
    globalThis.fetch = realFetch;
    if (savedUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = savedUrl;
    if (savedKey === undefined) delete process.env.SUPABASE_SERVICE_KEY; else process.env.SUPABASE_SERVICE_KEY = savedKey;
  }
  console.log("  (d) activity-log seam proof: POST unchanged, all four outcomes resolve -- PASS");

  // ---------------------------------------------------------------------------------------------
  // (e) The `session` call source, through the real allowlist, both directions.
  // ---------------------------------------------------------------------------------------------
  const { runWithCallSource, getRequestContext } = await import("../../lib/request-context.js");
  const allowed = runWithCallSource(CALL_SOURCE, () => getRequestContext());
  assert.strictEqual(allowed.callSource, CALL_SOURCE,
    "'session' must be allowlisted in lib/request-context.js -- there is no DB constraint behind it");
  const invented = runWithCallSource("governance", () => getRequestContext());
  assert.strictEqual(invented.callSource, null,
    "an un-allowlisted source must still land NULL -- the negative control on the same gate");
  const smuggled = runWithCallSource("governance", () => getRequestContext(), { callSource: "ui" });
  assert.strictEqual(smuggled.callSource, null,
    "runWithCallSource()'s `extra` must not be able to override callSource (spread-first ordering)");
  const tagged = runWithCallSource(CALL_SOURCE, () => getRequestContext(), { visitorId: "cycle-1" });
  assert.strictEqual(tagged.visitorId, "cycle-1", "`extra` must fill the visitorId slot --cycle uses");
  console.log("  (e) call_source allowlist: 'session' in, invented out, no override -- PASS");

  // ---------------------------------------------------------------------------------------------
  // (f) SES-395 SEAM PROOF over scripts/agent-prompt.js's resolveJudgmentModel(). No credentials,
  //     no network: fetchImpl is injected, so this half ALWAYS runs.
  //
  //     WHAT WOULD PASS VACUOUSLY, and is therefore controlled for. A clause that only asserts the
  //     degraded case passes against a function that overrides EVERY assembly -- which would drop
  //     the Builder's own orchestrator-lane call onto whatever the RPC said, silently. So the
  //     non-judgment assembly is asserted in the same shape, against the same stub, and the RPC is
  //     asserted NEVER TO HAVE BEEN CALLED for it: the fence is equality against the judgment
  //     lane's model_id, and a fence that still spends the round trip is a fence that is not there.
  // ---------------------------------------------------------------------------------------------
  const { resolveJudgmentModel } = await import("../../scripts/agent-prompt.js");
  const LANES = [
    { lane: "orchestrator", model_id: "claude-opus-5" },
    { lane: "judgment", model_id: "claude-fable-5-1" },
    { lane: "mechanical", model_id: "claude-sonnet-5" },
  ];
  // Returns the stub plus the URLs it was asked for, so "was the RPC spent?" is assertable.
  const stub = (rpcRows, { lanesStatus = 200, rpcStatus = 200 } = {}) => {
    const seen = [];
    const fetchImpl = async (url) => {
      seen.push(String(url));
      const rpc = String(url).includes("/rpc/judgment_model");
      const status = rpc ? rpcStatus : lanesStatus;
      return { ok: status >= 200 && status < 300, status, json: async () => (rpc ? rpcRows : LANES) };
    };
    return { fetchImpl, seen };
  };
  const OPTS = { supabaseUrl: "https://seam.example/", headers: { apikey: "seam" } };

  // (f1) the judgment lane, past its share: the override and the note.
  const degradedStub = stub([{ model_id: "claude-opus-5", reason: "fable_rest", fable_pct: 94, fable_share: 57.14 }]);
  const degraded = await resolveJudgmentModel(
    { llm: { model: "claude-fable-5-1" } }, { ...OPTS, fetchImpl: degradedStub.fetchImpl });
  assert.deepStrictEqual(degraded, { model: "claude-opus-5", reason: "fable_rest", from: "claude-fable-5-1" },
    "a judgment-lane assembly whose judgment_model() answers the orchestrator model must be overridden, " +
    "and must carry both the reason and the model it came FROM -- a bare model id cannot be audited");
  assert.ok(degradedStub.seen.some(u => u.includes("/rpc/judgment_model")),
    "the degrade path must actually ask public.judgment_model() -- a hard-coded answer is not a reading");

  // (f2) THE CONTROL: the orchestrator's own assembly, the SAME stub answering the same way.
  const untouchedStub = stub([{ model_id: "claude-opus-5", reason: "fable_rest" }]);
  const untouched = await resolveJudgmentModel(
    { llm: { model: "claude-opus-5" } }, { ...OPTS, fetchImpl: untouchedStub.fetchImpl });
  assert.deepStrictEqual(untouched, { model: "claude-opus-5", reason: "lane" },
    "a NON-judgment assembly must never be overridden and must never claim a degrade -- the fence is " +
    "equality against runner_model_lanes' judgment row, not the agent or the capability");
  assert.ok(!untouchedStub.seen.some(u => u.includes("/rpc/judgment_model")),
    "a non-judgment assembly still spent the judgment_model() round trip -- the equality fence is not fencing");

  // (f3) Fable inside its share: same lane, no degrade, and `from` stays absent so the caller's
  //      `Boolean(lane.from)` test cannot print a lane line for a lane that did not move.
  const laneStub = stub([{ model_id: "claude-fable-5-1", reason: "lane" }]);
  const held = await resolveJudgmentModel(
    { llm: { model: "claude-fable-5-1" } }, { ...OPTS, fetchImpl: laneStub.fetchImpl });
  assert.deepStrictEqual(held, { model: "claude-fable-5-1", reason: "lane" },
    "judgment_model() returning the lane's own model is the ordinary case, not a degrade");

  // (f4) A REST failure keeps the stored model and WARNS -- never silent, never a throw. The gate
  //      degrading the lane must not be able to stop a session running an agent at all.
  const brokenStub = stub([], { rpcStatus: 500 });
  const broken = await resolveJudgmentModel(
    { llm: { model: "claude-fable-5-1" } }, { ...OPTS, fetchImpl: brokenStub.fetchImpl });
  assert.strictEqual(broken.model, "claude-fable-5-1", "a REST failure must keep the assembly's own model");
  assert.strictEqual(broken.reason, "lane");
  assert.ok(/HTTP 500/.test(broken.warning || ""),
    "a REST failure must surface the status in a warning the caller prints -- a silent fallback is " +
    "indistinguishable from Fable having headroom");
  assert.ok(!("from" in broken), "a failed check must not report itself as a degrade");

  // (f5) The script's own two output seams, read out of the source rather than restated: the JSON
  //      note key and the text lane line. Without this, (f1)-(f4) could all pass while main() never
  //      applied the answer to anything.
  const promptSrc = fs.readFileSync(PROMPT_SCRIPT, "utf8");
  assert.ok(/lane_note/.test(promptSrc), "scripts/agent-prompt.js must set llm.lane_note for the --json reader");
  assert.ok(/# lane: judgment degraded to \$\{lane\.model\} \(\$\{lane\.reason\}\)/.test(promptSrc),
    "scripts/agent-prompt.js must print the `# lane: judgment degraded to <model> (<reason>)` header line");
  assert.ok(/const degraded = Boolean\(lane\.from\)/.test(promptSrc),
    "the lane line must be gated on `from` -- printing it every run is a note nobody reads, and " +
    "printing it never is the SES-395 change not shipping");
  console.log("  (f) SES-395 judgment-lane fallback: degrade, fence, hold, REST-failure warn -- PASS");

  // ---------------------------------------------------------------------------------------------
  // (a) + (b) LIVE ARMS.
  // ---------------------------------------------------------------------------------------------
  if (!hasCreds()) {
    notRun("SES-331 (a) script-vs-library assembly equality", CRED_HINT);
    notRun("SES-331 (b) agent-log.js writes one row with call_source=session", CRED_HINT);
    console.log("  (a)+(b) NOT RUN -- no Supabase credentials in this environment");
    return;
  }

  // (a) -- the discriminator.
  //
  // AMENDED BY SES-332, and the amendment is the point rather than a repair. This guard used to run
  // the script with NO --intent and compare it against assemblePrompt() with `intent_slug` unset,
  // because the two meant the same thing. They no longer do: an omitted --intent now resolves to the
  // capability's own `capabilities.default_intent_slug` (the AGT-67 defect -- an omitted flag silently
  // dropped every Intent Skill, so the prompt assembled with no schema, no handler and no output
  // contract, and nothing errored). `--intent=none` is the flag that still means AA-188's deliberate
  // no-intent assembly, so THAT is what this equality is driven with. The fallback itself is pinned
  // as its own clause immediately below, because an equality run on one branch says nothing about the
  // other -- and the other is the one that changed.
  const raw = execFileSync(process.execPath,
    [PROMPT_SCRIPT, `--agent=${AGENT}`, `--capability=${CAPABILITY}`, "--intent=none", "--json"],
    { encoding: "utf8", env: process.env });
  const fromScript = JSON.parse(raw);

  const { assemblePrompt } = await import("../../api/prompt/db-assembly.js");
  const fromLibrary = await assemblePrompt({
    capability_slug: CAPABILITY, agent_id: AGENT, tenant_id: TENANT, task_context: {},
  });

  assert.ok(fromLibrary.sections.length > 0,
    "the fixture capability assembled zero sections -- the equality below would be vacuous");
  assert.ok(assemblyMatches(fromScript, fromLibrary),
    "scripts/agent-prompt.js did not produce assemblePrompt()'s own output -- it is assembling, not calling");

  // Negative control: the SAME predicate, one section's content changed. It must reject.
  const mutated = JSON.parse(JSON.stringify(fromLibrary));
  mutated.sections[0].content = `${mutated.sections[0].content} (mutant)`;
  assert.strictEqual(assemblyMatches(fromScript, mutated), false,
    "the comparison accepted a mutated assembly -- it cannot discriminate and is not a test");

  // The other branch of the same contract (SES-332): an OMITTED --intent must equal the library
  // called with the capability's stored default_intent_slug, and must NOT equal the no-intent
  // assembly. The second half is the discriminator -- without it this clause passes on the old,
  // broken behaviour, where omitting the flag produced exactly the no-intent assembly.
  const defaultIntent = (await supabaseRows(
    `capabilities?slug=eq.${encodeURIComponent(CAPABILITY)}&tenant_id=eq.${TENANT}&select=default_intent_slug`))[0]?.default_intent_slug;
  assert.ok(defaultIntent,
    `capability ${CAPABILITY} declares no default_intent_slug -- this clause would be vacuous`);
  const fromScriptDefaulted = JSON.parse(execFileSync(process.execPath,
    [PROMPT_SCRIPT, `--agent=${AGENT}`, `--capability=${CAPABILITY}`, "--json"],
    { encoding: "utf8", env: process.env }));
  const fromLibraryDefaulted = await assemblePrompt({
    capability_slug: CAPABILITY, agent_id: AGENT, tenant_id: TENANT, task_context: {},
    intent_slug: defaultIntent,
  });
  assert.ok(assemblyMatches(fromScriptDefaulted, fromLibraryDefaulted),
    `an omitted --intent must assemble as intent_slug="${defaultIntent}" -- AGT-67's defect was that `
    + "it silently assembled with NO Intent Skill, so the prompt carried no schema and no handler");
  assert.strictEqual(assemblyMatches(fromScriptDefaulted, fromLibrary), false,
    "the defaulted assembly is identical to the no-intent one -- the fallback is not firing, which is "
    + "the exact broken state SES-332 fixed");

  // The rendered path too: the script's prompt must carry the section labels the assembly declares.
  const rendered = execFileSync(process.execPath,
    [PROMPT_SCRIPT, `--agent=${AGENT}`, `--capability=${CAPABILITY}`],
    { encoding: "utf8", env: process.env });
  for (const s of fromLibrary.sections.filter(s => s.content)) {
    assert.ok(rendered.includes(`=== ${s.label} ===`),
      `rendered prompt is missing the "${s.label}" section header the assembly declares`);
  }
  console.log(`  (a) LIVE: ${fromLibrary.sections.length} sections deep-equal, mutant rejected -- PASS`);

  // (b) -- one row, session-sourced, deleted afterwards, before-image printed first.
  const before = await supabaseRows(
    `ai_activity_log?trace_id=eq.${encodeURIComponent(TRACE)}&select=id,call_source,created_at`);
  console.log(`  (b) before-image for trace_id=${TRACE}: ${JSON.stringify(before)}`);
  assert.strictEqual(before.length, 0,
    `the fixture trace id already has ${before.length} row(s) -- a stale row would make "exactly one" meaningless`);

  execFileSync(process.execPath, [LOG_SCRIPT,
    `--agent=${AGENT}`, `--capability=${CAPABILITY}`, "--model=claude-opus-5",
    `--ai-type=${CAPABILITY}`, `--feature=${CAPABILITY}:report-card-intent:depth0`,
    "--input-tokens=11", "--output-tokens=7", "--latency-ms=1234", `--trace=${TRACE}`,
  ], { encoding: "utf8", env: process.env });

  const after = await supabaseRows(
    `ai_activity_log?trace_id=eq.${encodeURIComponent(TRACE)}&select=id,call_source,model,ai_type,input_tokens,output_tokens`);
  try {
    assert.strictEqual(after.length, 1, `expected exactly one row, found ${after.length}`);
    assert.strictEqual(after[0].call_source, CALL_SOURCE,
      `the row must carry call_source='${CALL_SOURCE}', found ${JSON.stringify(after[0].call_source)}`);
    // LOG-81: the AI Audit's header counts real model calls, and isCountableCall() is
    // `!!e.model && !e.isPairedDup`. A row with a NULL model would be written and then invisible.
    assert.ok(after[0].model, "the row must name a model or LOG-81's Total Calls will not count it");
    assert.strictEqual(after[0].input_tokens, 11);
    assert.strictEqual(after[0].output_tokens, 7);
  } finally {
    const key = process.env.SUPABASE_SERVICE_KEY;
    await fetch(`${process.env.SUPABASE_URL}/rest/v1/ai_activity_log?trace_id=eq.${encodeURIComponent(TRACE)}`,
      { method: "DELETE", headers: { apikey: key, Authorization: `Bearer ${key}` } });
  }
  const cleaned = await supabaseRows(
    `ai_activity_log?trace_id=eq.${encodeURIComponent(TRACE)}&select=id`);
  assert.strictEqual(cleaned.length, 0, "the fixture row was not cleaned up");
  console.log(`  (b) LIVE: one row written with call_source=${CALL_SOURCE}, then deleted -- PASS`);
}

export default run;
selfRun(import.meta.url, run);
