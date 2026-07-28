// DeepBench v6.3.193 | scripts/chi-true-regression.mjs | SES-29 -- CHI true end-to-end regression
// driver (24 cases): walks routing->answer->gate->display for direct answers, the full Forecast
// journey (Theories->Theory Result->commit->resolve) for the 6 Forecast questions, the D2 review
// extension on any flagged direct answer, the D6 live news door as case 24, the D4 five-try
// rejection probe on any guardrail block, and Owen's AGT-35 content-context judge on every final
// artifact. Runbook: docs/runbooks/CHI-TRUE-REGRESSION.md (locked decisions D1-D6, Appendix A call
// spec, verified against MarketIntelligenceScreen.jsx 2026-07-28). Committed once so every future
// regression run (any session, any model) executes byte-identical code. The call()/unwrap idiom
// mirrors the verified shape from AGT-35's own kickoff test (docs/kickoffs/v6.3.192-AGT-35-...md),
// with span_id added alongside trace_id. This is an execution HELPER only -- it does not run the
// browser leg (runbook §6) and does not decide pass/fail beyond the runbook's own mechanical rules.

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const SCREEN_PATH = path.join(REPO_ROOT, "src", "screens", "MarketIntelligenceScreen.jsx");

const ENDPOINT = "https://deepbench-frontend-git-dev-roadmapventures-projects.vercel.app/api/capabilities/execute";
const FETCH_ARTICLE_ENDPOINT = "https://deepbench-frontend-git-dev-roadmapventures-projects.vercel.app/api/fetch-article";

// ---- auth ----
function loadBypassSecret() {
  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) return process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  const envPath = path.join(REPO_ROOT, ".env.local");
  if (existsSync(envPath)) {
    const line = readFileSync(envPath, "utf8").split("\n").find(l => l.startsWith("VERCEL_AUTOMATION_BYPASS_SECRET="));
    if (line) return line.slice(line.indexOf("=") + 1).trim();
  }
  console.error("FATAL: VERCEL_AUTOMATION_BYPASS_SECRET not found in process.env or .env.local beside the repo root.");
  process.exit(1);
}
const BYPASS_SECRET = loadBypassSecret();
const HDRS = { "Content-Type": "application/json", "x-vercel-protection-bypass": BYPASS_SECRET };

// ---- CLI flags ----
const argv = process.argv.slice(2);
function flagValue(name) {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
}
const ONLY = flagValue("--only") || null;
const LIMIT_RAW = flagValue("--limit");
const LIMIT = LIMIT_RAW !== undefined ? Number(LIMIT_RAW) : null;
const SKIP_JUDGE = argv.includes("--skip-judge");

// ================================================================================================
// Task 1 -- question extraction (never retype the 23). Regex over the screen's own source text;
// the driver never hand-maintains a copy of the question set.
// ================================================================================================

function extractBlock(source, constName, expectArray) {
  const marker = `const ${constName} = `;
  const startIdx = source.indexOf(marker);
  if (startIdx === -1) {
    console.error(`FATAL: const ${constName} not found in MarketIntelligenceScreen.jsx -- the screen changed, review the baseline (docs/runbooks/CHI-TRUE-REGRESSION.md §2) before re-running.`);
    process.exit(1);
  }
  let i = startIdx + marker.length;
  while (/\s/.test(source[i])) i++;
  const openChar = source[i];
  const closeChar = openChar === "[" ? "]" : "}";
  if ((expectArray && openChar !== "[") || (!expectArray && openChar !== "{")) {
    console.error(`FATAL: ${constName} does not start with the expected ${expectArray ? "[" : "{"} -- the screen changed, review the baseline before re-running.`);
    process.exit(1);
  }
  let depth = 0, end = -1;
  for (let j = i; j < source.length; j++) {
    if (source[j] === openChar) depth++;
    else if (source[j] === closeChar) { depth--; if (depth === 0) { end = j; break; } }
  }
  if (end === -1) {
    console.error(`FATAL: could not find the end of ${constName}'s block -- the screen changed, review the baseline before re-running.`);
    process.exit(1);
  }
  return source.slice(i, end + 1);
}

function extractQuestions(block) {
  const re = /\{\s*id:\s*"([^"]+)"\s*,\s*label:\s*"([^"]*)"\s*\}/g;
  const out = [];
  let m;
  while ((m = re.exec(block))) out.push({ id: m[1], label: m[2] });
  return out;
}

// D3 locked baseline (runbook §2) -- the 6 Forecast questions and their fixed resolutions. Every
// other extracted question is a direct answer. Not extracted from the screen (the screen carries
// no resolution concept) -- this is the runbook's own locked contract, reproduced verbatim.
const RESOLUTIONS = {
  "upgrade-cycles": "edit",
  "smartphone-growth": "accept",
  "elevate-mobility": "accept",
  "emea-emerging": "accept",
  "southeast-asia": "info_only",
  "latin-america": "reject",
};

function extractCases() {
  if (!existsSync(SCREEN_PATH)) {
    console.error(`FATAL: screen source not found at ${SCREEN_PATH}`);
    process.exit(1);
  }
  const source = readFileSync(SCREEN_PATH, "utf8");
  const staticQ = extractQuestions(extractBlock(source, "STATIC_QUESTION", false));
  const pool = extractQuestions(extractBlock(source, "ROTATING_POOL", true));
  const tail = extractQuestions(extractBlock(source, "FIXED_DRAWER_TAIL", true));
  if (staticQ.length !== 1) { console.error(`FATAL: STATIC_QUESTION -- expected 1 question, extracted ${staticQ.length}. The screen changed; review the baseline before re-running.`); process.exit(1); }
  if (pool.length !== 10) { console.error(`FATAL: ROTATING_POOL -- expected 10 questions, extracted ${pool.length}. The screen changed; review the baseline before re-running.`); process.exit(1); }
  if (tail.length !== 12) { console.error(`FATAL: FIXED_DRAWER_TAIL -- expected 12 questions, extracted ${tail.length}. The screen changed; review the baseline before re-running.`); process.exit(1); }

  const ordered = [...staticQ, ...pool, ...tail]; // STATIC #1, POOL #2-11, TAIL #12-23 (runbook §2 order)
  const cases = ordered.map((q, idx) => ({
    n: idx + 1,
    id: q.id,
    label: q.label,
    expected_journey: RESOLUTIONS[q.id] ? "forecast" : "direct",
    resolution: RESOLUTIONS[q.id] || null,
  }));
  // Case 24 -- the news door (D6). No fixed text; built at runtime from Jordan's first live card.
  cases.push({ n: 24, id: "news-first-card", label: null, expected_journey: "direct", resolution: null, isNewsDoor: true });
  return { cases, extractedCount: ordered.length };
}

// ================================================================================================
// Task 2 -- the driver. Shared call()/unwrap (verified idiom, AGT-35 kickoff v6.3.192 -- span_id
// added). Continue loop (HAR-17 contract): any {status:'in_progress', job_id} continues; a body
// carrying `recovery` is a recorded recovery and does not count against the 10-continue cap.
// ================================================================================================

async function postJSON(url, body) {
  const res = await fetch(url, { method: "POST", headers: HDRS, body: JSON.stringify(body) });
  let json;
  try { json = await res.json(); } catch { throw new Error(`non-JSON response (HTTP ${res.status}) from ${url}`); }
  if (!res.ok) {
    const err = new Error(json?.error || `HTTP ${res.status} from ${url}`);
    err.status = res.status;
    err.failureClass = json?.failureClass;
    err.upstreamStatus = json?.upstreamStatus;
    throw err;
  }
  return json;
}

function unwrapTerminal(body) {
  if (body && body.status) return body;
  return { ...(body?.content || {}), trace_id: body?.trace_id, span_id: body?.span_id };
}

async function call(payload, ctx) {
  let body = await postJSON(ENDPOINT, { ...payload, tenant_id: "global", stream: false });
  let continues = 0;
  while (body && body.status === "in_progress") {
    if (body.recovery) {
      ctx.recoveries.push(body.recovery);
    } else {
      continues++;
      if (continues > 10) throw new Error("continue loop exceeded cap (10) without recovery");
    }
    body = await postJSON(ENDPOINT, { action: "continue", job_id: body.job_id, stream: false });
  }
  const unwrapped = unwrapTerminal(body);
  if (unwrapped.trace_id) ctx.trace_ids.push(unwrapped.trace_id);
  return unwrapped;
}

// ---- artifact flattening (§5 -- fixed field order, every run, so runs are comparable) ----
function flattenDisplay(display) {
  const parts = [display.headline, display.body];
  if (Array.isArray(display.key_data_points) && display.key_data_points.length) {
    parts.push("Key data points: " + display.key_data_points.map(String).join("; "));
  } else if (display.key_data_points) {
    parts.push("Key data points: " + String(display.key_data_points));
  }
  return parts.filter(Boolean).join("\n");
}
function flattenTheoryTest(test) {
  const parts = [];
  if (test.supports) parts.push("Supports: " + test.supports);
  if (test.complicates) parts.push("Complicates: " + test.complicates);
  if (test.consider) parts.push("Consider: " + test.consider);
  return parts.join("\n");
}
function flattenForecastDraft(patch) {
  const parts = [patch.proposed_action];
  if (patch.critique) parts.push("Critique: " + patch.critique);
  return parts.filter(Boolean).join("\n");
}
function flattenRejection(gate) {
  const parts = [];
  if (gate.guardrail?.reason) parts.push(gate.guardrail.reason);
  if (gate.guardrail?.rule_violated) parts.push("Rule violated: " + gate.guardrail.rule_violated);
  if (gate.triage) parts.push(String(gate.triage));
  return parts.filter(Boolean).join("\n");
}

// ---- Owen's AGT-35 content-context judge (D5) -- the only content judgment anywhere here ----
async function judgeArtifact({ artifact_type, artifact_content, question, ctx }) {
  const verdict = await call({
    capability_slug: "quality-gate", intent_slug: "qg-content-context-intent", agent_id: "owen",
    task_context: { artifact_type, artifact_content, question },
  }, ctx);
  const failed_criteria = [];
  for (const k of ["named_entities_present", "quantitative_content_present", "actionable_guidance_present"]) {
    if (!verdict[k] || verdict[k].result !== true) failed_criteria.push(k);
  }
  if (verdict.platform_language_detected && verdict.platform_language_detected.result === true) failed_criteria.push("platform_language_detected");
  return { artifact: artifact_type, pass: verdict.pass === true, failed_criteria, evidence: verdict };
}

// ---- A2 steps 3-5 + A3's shared tail (Theory Result -> commit -> resolve) ----
async function runHypTail({ flaggedQuestion, flaggedAnswer, intentForTest, picked, resolution, ctx, judgeVerdicts }) {
  const test = await call({
    capability_slug: "hypothesis-evaluation", intent_slug: "hyp-hypothesis-test-intent", agent_id: "priya",
    task_context: { hypothesis: picked, intent: intentForTest, flagged_question: flaggedQuestion, flagged_answer: flaggedAnswer, prior_hypothesis_test: null },
  }, ctx);
  await call({
    capability_slug: "hypothesis-evaluation", intent_slug: "hyp-hypothesis-test-display-intent", agent_id: "priya",
    task_context: { supports: test.supports, complicates: test.complicates, consider: test.consider, confidence: test.confidence },
  }, ctx);
  if (!SKIP_JUDGE) judgeVerdicts.push(await judgeArtifact({ artifact_type: "theory_test", artifact_content: flattenTheoryTest(test), question: flaggedQuestion, ctx }));

  if (resolution === "info_only") return { terminal: "info_only" };

  const jointText = [test.supports, test.complicates, test.consider].filter(Boolean).join("\n");
  await call({
    capability_slug: "memory-consolidation", intent_slug: "reasoner-intent", agent_id: "elena",
    task_context: { original_question: flaggedQuestion, flagged_answer: flaggedAnswer, committed_hypothesis: picked, intent: intentForTest, hypothesis_test: jointText, was_override: false },
  }, ctx);
  const patch = await call({
    capability_slug: "data-analysis", intent_slug: "data-patch-intent", agent_id: "nadia",
    task_context: { disputed_chunk_id: null, correction: picked, user_reasoning: jointText },
  }, ctx);

  if (resolution === "edit") {
    const editedCorrection = `${picked} — reviewed and confirmed against current quarter data.`;
    const editResolve = await call({
      action: "resolve", confirmation_id: patch.confirmation_id, resolution: "edit",
      edited_task_context: { disputed_chunk_id: null, correction: editedCorrection, user_reasoning: editedCorrection },
    }, ctx);
    if (!SKIP_JUDGE) judgeVerdicts.push(await judgeArtifact({ artifact_type: "forecast_draft", artifact_content: flattenForecastDraft(editResolve), question: flaggedQuestion, ctx }));
    await call({ action: "resolve", confirmation_id: editResolve.confirmation_id, resolution: "accept", edited_task_context: null }, ctx);
    return { terminal: "edit_then_accept" };
  }

  if (!SKIP_JUDGE) judgeVerdicts.push(await judgeArtifact({ artifact_type: "forecast_draft", artifact_content: flattenForecastDraft(patch), question: flaggedQuestion, ctx }));
  await call({ action: "resolve", confirmation_id: patch.confirmation_id, resolution: resolution === "reject" ? "reject" : "accept", edited_task_context: null }, ctx);
  return { terminal: resolution };
}

// ---- D4 rejection probe -- 4 more fresh full-journey tries (5 total), verbatim reasons ----
async function runRejectionProbe({ question, extraFields, firstTryGuardrail, ctx, judgeVerdicts }) {
  const tries = [{ accepted: false, rule_violated: firstTryGuardrail?.rule_violated ?? null, reason: firstTryGuardrail?.reason ?? null }];
  for (let i = 0; i < 4; i++) {
    await call({ capability_slug: "channel-intelligence", intent_slug: "ci-routing-intent", agent_id: "marcus", task_context: { goal: question }, runtime_context: "" }, ctx);
    const qa = await call({ capability_slug: "channel-intelligence", intent_slug: "ci-answer-intent", agent_id: "marcus", task_context: { goal: question, ...extraFields }, runtime_context: "" }, ctx);
    const gate = await call({
      capability_slug: "quality-gate", intent_slug: "qg-review-intent", agent_id: "owen",
      task_context: { question, candidate_answer: qa.answer, confidence_tier: qa.confidence_tier, citations: qa.citations, agent_id: "marcus", capability_slug: "channel-intelligence", intent_slug: "ci-answer-intent", ...extraFields },
    }, ctx);
    if (gate.guardrail?.result === "block") {
      tries.push({ accepted: false, rule_violated: gate.guardrail.rule_violated ?? null, reason: gate.guardrail.reason ?? null });
    } else {
      tries.push({ accepted: true, rule_violated: null, reason: null });
      if (!SKIP_JUDGE) judgeVerdicts.push(await judgeArtifact({ artifact_type: "answer", artifact_content: gate.final_answer || qa.answer, question, ctx }));
    }
  }
  return { tries };
}

// ---- A1 direct answer (+ D2 review extension) ----
async function runDirectCaseJourney(question, ctx, judgeVerdicts, extraFields = {}) {
  const routing = await call({ capability_slug: "channel-intelligence", intent_slug: "ci-routing-intent", agent_id: "marcus", task_context: { goal: question }, runtime_context: "" }, ctx);
  const qa = await call({ capability_slug: "channel-intelligence", intent_slug: "ci-answer-intent", agent_id: "marcus", task_context: { goal: question, ...extraFields }, runtime_context: "" }, ctx);
  const gate = await call({
    capability_slug: "quality-gate", intent_slug: "qg-review-intent", agent_id: "owen",
    task_context: { question, candidate_answer: qa.answer, confidence_tier: qa.confidence_tier, citations: qa.citations, agent_id: "marcus", capability_slug: "channel-intelligence", intent_slug: "ci-answer-intent", ...extraFields },
  }, ctx);

  if (gate.guardrail?.result === "block") {
    if (!SKIP_JUDGE) judgeVerdicts.push(await judgeArtifact({ artifact_type: "rejection", artifact_content: flattenRejection(gate), question, ctx }));
    const probe = await runRejectionProbe({ question, extraFields, firstTryGuardrail: gate.guardrail, ctx, judgeVerdicts });
    return { actual_journey: routing.intent === "qa" ? "direct" : "forecast", terminal: "rejected", flagged: false, resolution_applied: null, probe, rejectionOccurred: true };
  }

  const finalAnswer = gate.final_answer || qa.answer;
  const needsReviewInput = qa.needs_review || gate.eval?.result === "revise";
  const display = await call({
    capability_slug: "channel-intelligence", intent_slug: "ci-answer-display-intent", agent_id: "marcus",
    task_context: { answer: finalAnswer, citations: qa.citations, confidence_tier: qa.confidence_tier, needs_review: needsReviewInput, review_reason: qa.review_reason, ...extraFields },
  }, ctx);
  const flaggedOut = display.needs_review ?? needsReviewInput;
  if (!SKIP_JUDGE) judgeVerdicts.push(await judgeArtifact({ artifact_type: "answer", artifact_content: flattenDisplay(display), question, ctx }));

  let resolution_applied = null;
  if (flaggedOut) {
    const flaggedAnswerText = flattenDisplay(display);
    const hyp = await call({
      capability_slug: "hypothesis-evaluation", intent_slug: "hyp-generation-intent", agent_id: "priya",
      task_context: { flagged_question: question, flagged_answer: flaggedAnswerText, review_reason: display.review_reason ?? qa.review_reason ?? null },
    }, ctx);
    const picked = hyp.hypotheses?.[0] ?? null;
    await runHypTail({ flaggedQuestion: question, flaggedAnswer: flaggedAnswerText, intentForTest: "theory", picked, resolution: "accept", ctx, judgeVerdicts });
    resolution_applied = "accept";
  }

  const actual_journey = (routing.intent === "qa" ? "direct" : "forecast") + (flaggedOut ? "+review" : "");
  return { actual_journey, terminal: "display", flagged: !!flaggedOut, resolution_applied, probe: null, rejectionOccurred: false };
}

// ---- A2 Forecast journey ----
async function runForecastCaseJourney(caseObj, ctx, judgeVerdicts) {
  const question = caseObj.label;
  const routing = await call({ capability_slug: "channel-intelligence", intent_slug: "ci-routing-intent", agent_id: "marcus", task_context: { goal: question }, runtime_context: "" }, ctx);
  const hyp = await call({
    capability_slug: "hypothesis-evaluation", intent_slug: "hyp-generation-intent", agent_id: "priya",
    task_context: { flagged_question: question, flagged_answer: "", review_reason: "user-initiated, no explicit claim extracted" },
  }, ctx);
  const picked = hyp.hypotheses?.[0] ?? null;
  const tail = await runHypTail({ flaggedQuestion: question, flaggedAnswer: "", intentForTest: routing.intent, picked, resolution: caseObj.resolution, ctx, judgeVerdicts });
  return { actual_journey: routing.intent === "qa" ? "direct" : "forecast", terminal: tail.terminal, flagged: false, resolution_applied: caseObj.resolution, probe: null, rejectionOccurred: false };
}

// ---- A4 news door (D6, case 24) ----
async function runNewsDoorCaseJourney(_caseObj, ctx, judgeVerdicts) {
  const cardsResp = await call({ capability_slug: "web-search-news", intent_slug: "ws-news-search-intent", agent_id: "jordan", task_context: {} }, ctx);
  const cards = Array.isArray(cardsResp.cards) ? cardsResp.cards : [];
  if (cards.length === 0) throw new Error("news door: Jordan returned zero cards");
  const card = cards[0];

  let articleContent = null, articleSource = null, articleDegraded = false;
  const artRes = await fetch(FETCH_ARTICLE_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: card.url }) });
  if (artRes.ok) {
    const data = await artRes.json();
    articleContent = data.text || null;
    articleSource = data.source || null;
  } else {
    articleDegraded = true; // fail-open, matches the screen's own behavior -- not an infra death
  }

  const question = `New industry development: ${card.headline}. What does this mean for our channel program positioning?`;
  const extraFields = { article_content: articleContent, article_source: articleSource, article_url: card.url };
  const result = await runDirectCaseJourney(question, ctx, judgeVerdicts, extraFields);
  return { ...result, card_headline: card.headline, card_url: card.url, article_source: articleSource, article_degraded: articleDegraded };
}

function executeCaseJourney(caseObj, ctx, judgeVerdicts) {
  if (caseObj.isNewsDoor) return runNewsDoorCaseJourney(caseObj, ctx, judgeVerdicts);
  if (caseObj.resolution) return runForecastCaseJourney(caseObj, ctx, judgeVerdicts);
  return runDirectCaseJourney(caseObj.label, ctx, judgeVerdicts);
}

// ================================================================================================
// Task 3 -- the report.
// ================================================================================================

function finalizeCase({ n, id, expected_journey, actual_journey, terminal, wall_ms, flagged, resolution_applied, ctx, probe, judgeVerdicts, rejectionOccurred, infraDeath, infraError }) {
  const fail_causes = [];
  if (infraDeath) fail_causes.push(`infra_death: ${infraError || "unrecovered transient failure"}`);
  if (rejectionOccurred) fail_causes.push("rejection");
  const bucket = actual_journey ? actual_journey.split("+")[0] : null;
  if (!infraDeath && bucket !== expected_journey) fail_causes.push(`journey_deviation (expected ${expected_journey}, got ${actual_journey})`);
  if (!SKIP_JUDGE && !infraDeath && judgeVerdicts.some(v => v.pass !== true)) fail_causes.push("judge_fail");
  return {
    n, id, expected_journey, actual_journey, terminal, wall_ms, flagged, resolution_applied,
    recoveries: ctx.recoveries, trace_ids: ctx.trace_ids,
    probe, judge_verdicts: judgeVerdicts, case_pass: fail_causes.length === 0, fail_causes,
  };
}

async function runOneCase(caseObj) {
  console.log(`[${caseObj.n}/24] ${caseObj.id} -- running...`);
  const t0 = Date.now();
  let attempt = 0, lastError = null, outcome = null;
  // Transient-death handling (runbook §4 tail note): one fresh full re-run of the whole case on any
  // thrown error; a second death is an infra-class FAIL, no probe.
  while (attempt < 2 && !outcome) {
    attempt++;
    const ctx = { recoveries: [], trace_ids: [] };
    const judgeVerdicts = [];
    try {
      const result = await executeCaseJourney(caseObj, ctx, judgeVerdicts);
      outcome = { ...result, ctx, judgeVerdicts };
    } catch (e) {
      lastError = e;
    }
  }
  const wall_ms = Date.now() - t0;
  const record = outcome
    ? finalizeCase({
        n: caseObj.n, id: caseObj.id, expected_journey: caseObj.expected_journey,
        actual_journey: outcome.actual_journey, terminal: outcome.terminal, wall_ms,
        flagged: outcome.flagged, resolution_applied: outcome.resolution_applied,
        ctx: outcome.ctx, probe: outcome.probe || null, judgeVerdicts: outcome.judgeVerdicts,
        rejectionOccurred: !!outcome.rejectionOccurred, infraDeath: false,
      })
    : finalizeCase({
        n: caseObj.n, id: caseObj.id, expected_journey: caseObj.expected_journey,
        actual_journey: null, terminal: "infra_death", wall_ms, flagged: false,
        resolution_applied: caseObj.resolution || null, ctx: { recoveries: [], trace_ids: [] },
        probe: null, judgeVerdicts: [], rejectionOccurred: false, infraDeath: true, infraError: lastError?.message,
      });
  console.log(`[${caseObj.n}/24] ${caseObj.id} -- ${record.case_pass ? "PASS" : "FAIL"} (${record.terminal}, ${wall_ms}ms)${record.fail_causes.length ? " causes=" + record.fail_causes.join(",") : ""}`);
  return record;
}

async function main() {
  const { cases, extractedCount } = extractCases();

  let selected = cases;
  if (ONLY) {
    selected = cases.filter(c => c.id === ONLY);
    if (selected.length === 0) {
      console.error(`FATAL: --only ${ONLY} matched no case id (24 cases total: ${cases.map(c => c.id).join(", ")})`);
      process.exit(1);
    }
  } else if (LIMIT !== null) {
    if (Number.isNaN(LIMIT) || LIMIT < 0) { console.error("FATAL: --limit must be a non-negative integer"); process.exit(1); }
    selected = cases.slice(0, LIMIT);
  }

  if (SKIP_JUDGE) {
    console.log("########################################");
    console.log("# NOT A VALID REGRESSION RUN            #");
    console.log("# --skip-judge active: NO content judged #");
    console.log("########################################");
  }

  const run_start = new Date().toISOString();
  const results = [];
  for (const c of selected) results.push(await runOneCase(c));
  const run_end = new Date().toISOString();

  const run_pass_server_side = results.length === 0 ? null : results.every(r => r.case_pass);
  const report = {
    run_start, run_end,
    cases: results,
    run_pass_server_side, // browser leg (runbook §6) is outside this script and outside this field
    banner: SKIP_JUDGE ? "NOT A VALID REGRESSION RUN — --skip-judge active, no content judged" : null,
    totals: { baseline_cases: 24, extracted: extractedCount, cases_run: results.length },
  };

  console.log("REPORT_JSON_START");
  console.log(JSON.stringify(report, null, 2));
  console.log("REPORT_JSON_END");
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });
