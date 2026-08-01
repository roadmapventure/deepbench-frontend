// DeepBench v7.0.0 | scripts/chi-true-regression.mjs | LAV-1a -- question extraction repointed from
// MarketIntelligenceScreen.jsx to src/data/chiQuestions.js, where the 23 questions now live (single
// source, shared with the Live Agent View screen). Same scrape, same order, same 1/10/12 counts --
// only the file it reads and the `export const` marker changed. Found by the regression gate itself,
// which hard-FATALed the moment the screen stopped declaring the consts.
// FEATURE: LAV-1a
// DeepBench v6.3.235 | scripts/chi-true-regression.mjs | AGT-47 -- the edit-resolve leg mirrors the
// screen's fix: runHypTail()'s `edit` branch carries the original theory-test text (jointText)
// alongside the reviewer's edit in edited_task_context.user_reasoning, instead of sending the edit
// alone. Case 6 (upgrade-cycles) is the only case hardcoded to `edit`, and its beta-gate criterion is
// measured against the edit-resolve artifact, so its forecast_draft was graded on input that never
// contained the figures. Mirrored deliberately, not extracted into a shared helper (SES-31 convention)
// DeepBench v6.3.234 | scripts/chi-true-regression.mjs | DAT-16 -- vitrine-tech (case 9) joins
// HONEST_GAP_IDS. Its question asks for a training-compliance gap at a partner whose completion
// rate is on record (40%, docs/APPLE-DATA-ROOM-SOURCE-DATA.md Scenario 2) but whose required
// threshold is not in any active Library row -- computing a gap needs a number the corpus was
// never given, the same shape already solved for cases 12/23. Membership widening only; no
// change to scoreVerdict() or extractCases()'s tagging logic. John's §8 baseline approval.
// DeepBench v6.3.233 | scripts/chi-true-regression.mjs | SES-65 -- a failure can never be reported
// without a cause. scoreVerdict()'s rich-answer branch took `pass` from Owen Marsh (Proofreader)'s own
// holistic flag but built failed_criteria from an independent three-criterion loop, so an artifact he
// failed on something outside that loop printed `case_pass: false, failed_criteria: []` -- a FAIL
// stating no reason, measured four times on case 9 vitrine-tech. (DAT-16, v6.3.234, has since moved
// case 9 into the honest-gap class -- that fixes case 9's rubric, not this defect: every one of the
// remaining 21 rich-answer cases could still print an empty cause list.) The list now carries the literal
// `holistic_verdict` in exactly that case, and judge_fail carries Owen's own critique inline the way
// infra_death and journey_deviation already did. Reporting only: `pass` is byte-unchanged on both
// branches, so no case changes verdict. Guarded by tests/regression/AGT-36-honest-gap-scoring.js §10.
// DeepBench v6.3.231 | scripts/chi-true-regression.mjs | SES-62 -- the news door mirrors the screen's
// TWO calls. CHI-92 (v6.3.227) split the news flow: ws-news-search-intent returns structured `stories`,
// then ws-news-display-intent carries those stories in task_context and Alex Reeves formats them into
// `cards`. This file still made only the first call and read a `cards` key that call has never carried,
// so regression test #24 -- a bucket-1 beta gate -- threw "zero cards" and recorded an infra_death on
// every run for the whole day CHI-92 shipped, before asking anything. The product was never broken;
// this was the mirror drifting by call SEQUENCE rather than by field, its third recurrence (SES-31
// field values, SES-57 payload fields, this). Guarded by tests/regression/SES-62-news-door-call-parity.js.
// DeepBench v6.3.230 | scripts/chi-true-regression.mjs | SES-57 -- the news door no longer builds its own
// news-card payload. runNewsDoorCaseJourney() calls the shared Article Context Resolver
// (src/lib/newsCardContext.js) that MarketIntelligenceScreen.jsx calls, so this run can no longer ask
// Marcus a question the shipped screen would never ask. Two divergences die with the copy: it never read
// the error body, so article_unavailable_reason (CHI-91) was silently missing and case 24's green verdict
// proved nothing; and it had no try, so a dropped connection recorded an infra_death where the screen
// fails open and still answers. The case record now also carries article_unavailable_reason -- WHY the
// article was unavailable, not just that it was. SES-31 fixed this same drift once, driver-side only;
// nothing coupled the two payloads, so the next added field diverged them again. The resolver is that
// coupling. Registered in platform_services as article-context-resolver (§19m).
// DeepBench v6.3.228 | scripts/chi-true-regression.mjs | DAT-12 -- every capability call in the run now
// carries retrieval_scope: "baseline", so the run reads the seed corpus by tag rather than whatever the
// previous run left behind (measured live 2026-07-29: 15 retrievable non-baseline leftovers, five of
// them near-duplicate copies of one upgrade-cycles answer competing for match_count's slots, plus four
// seed scenarios legitimately superseded and therefore invisible). A READ scope: the run writes nothing,
// so it cannot disturb the live screen and concurrent writes cannot disturb it. Recorded in the report's
// totals block. See docs/runbooks/CHI-TRUE-REGRESSION.md §1.
// DeepBench v6.3.225 | scripts/chi-true-regression.mjs | SES-29 -- CHI true end-to-end regression
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
// SES-31 (v6.3.202): payload-shape parity fixes -- pick hypotheses[0].text (never the object),
// screen-idiom sectionText()/plainDisplayText() unwraps in the flatten layer so no artifact can
// collapse to "[object Object]", news-door degradation threaded into the case record + a loud
// progress-line marker, and infra-death records now carry the last attempt's real ctx/judgeVerdicts
// instead of a fresh empty one. Root cause: docs/SESSIONS.md S-SES-29-rca findings 1-2.
// SES-31a (v6.3.210): finishes the same job -- Owen's qg-review-intent final_answer is an OBJECT
// {answer, citations, confidence_tier} (or null) when he regenerated a blocked answer, not a
// string; `gate.final_answer || qa.answer` let a truthy object leak through as the exact
// "[object Object]" class SES-31 just eliminated everywhere else. resolveGatedAnswer() now mirrors
// MarketIntelligenceScreen.jsx:1519's screen parity (swap the WHOLE triple, not just .answer) at
// both call sites, and a cheap assertString() runtime guard throws (never silently coerces) if a
// judge/display payload is ever handed a non-string again.
// AGT-36 (v6.3.220): runbook D7/§5b's `honest-gap` outcome class is now scored, not just described.
// Every case carries an `outcome_class` tagged by QUESTION ID (never case number), and the new pure,
// exported scoreVerdict() decides pass/fail: the rich-answer branch is byte-equivalent to the old
// inline scoring (still Owen's own overall `pass` flag), while the honest-gap branch implements §5b's
// table -- quantitative_content_present must be EXPLICITLY false, guidance required, platform
// language still barred, named entities informational only. Cases 12 (vietnam-reseller) and 23
// (south-korea-coop) exist to prove the agents REFUSE to produce a metric, so Owen's rich-answer
// rubric structurally could never pass them (runbook §7's exception). The class rides on ctx so no
// judgeArtifact call site changed, and it is recorded on every case record + the progress line.
// AGT-36b (v6.3.225): the honest-gap metric bar is now `asked_metric_present` -- does the artifact
// report a figure for the quantity the QUESTION asked about -- not the blunt
// quantitative_content_present, which only asks whether any number is present. Measured live in
// S-AGT-36: case 23's answer cleared the guidance and jargon bars and still failed, on an industry
// benchmark and a comparable partner's rate -- both real, correctly sourced, neither a South Korea
// co-op rate. quantitative_content_present becomes informational in this class; the rich-answer
// branch never reads the new key, so the other 22 cases score byte-identically. Owen judges the new
// criterion blind: his Skill is deliberately never told which questions carry the class.

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { resolveNewsCardContext } from "../src/lib/newsCardContext.js"; // FEATURE: SES-57

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
// FEATURE: LAV-1a -- the 23 questions moved out of the screen into their own module (single source,
// shared with the Live Agent View screen). Extraction below reads them there now; the old
// SCREEN_PATH scrape of MarketIntelligenceScreen.jsx hard-FATALed on every run once the screen
// stopped declaring them, and had no other reader in this file.
const QUESTIONS_PATH = path.join(REPO_ROOT, "src", "data", "chiQuestions.js");

// FEATURE: DAT-12 -- the read scope every capability call in this run carries. Named here rather than
// inlined so the value the run actually used is the value recorded in the report's totals block; a
// reader of REPORT_JSON can see the run was scoped without taking it on faith.
const RETRIEVAL_SCOPE = "baseline";

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
  // FEATURE: LAV-1a -- matches `export const NAME = ` (chiQuestions.js) as well as the bare
  // `const NAME = ` form the consts had while they lived in the screen.
  const marker = `export const ${constName} = `;
  const startIdx = source.indexOf(marker);
  if (startIdx === -1) {
    console.error(`FATAL: const ${constName} not found in src/data/chiQuestions.js -- the question set changed, review the baseline (docs/runbooks/CHI-TRUE-REGRESSION.md §2) before re-running.`);
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

// FEATURE: AGT-36 -- D7/§5b locked baseline (runbook §5b): the questions the Data Room is DESIGNED
// not to answer. Keyed by question id, never by case number: `n` is assigned from screen-extraction
// order, so a screen reorder would silently re-tag a different question. Adding or removing an id
// here is a baseline change -- runbook §8 rules apply (John's approval, in the runbook).
export const HONEST_GAP_IDS = new Set(["vietnam-reseller", "south-korea-coop", "vitrine-tech"]);

export function extractCases() {
  if (!existsSync(QUESTIONS_PATH)) {
    console.error(`FATAL: question source not found at ${QUESTIONS_PATH}`);
    process.exit(1);
  }
  const source = readFileSync(QUESTIONS_PATH, "utf8"); // FEATURE: LAV-1a -- was SCREEN_PATH
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
    // FEATURE: AGT-36 -- runbook §5b outcome class, tagged by question id (see HONEST_GAP_IDS).
    outcome_class: HONEST_GAP_IDS.has(q.id) ? "honest-gap" : "rich-answer",
  }));
  // Case 24 -- the news door (D6). No fixed text; built at runtime from Jordan's first live card.
  cases.push({ n: 24, id: "news-first-card", label: null, expected_journey: "direct", resolution: null, isNewsDoor: true, outcome_class: "rich-answer" });
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
  // FEATURE: DAT-12 -- every case, every hop, including the news door and the rejection probe: this
  // is the one place every capability call in this driver is born, so scoping it here is what makes
  // two runs comparable. The run reads the seed corpus by tag instead of whatever the previous run
  // left behind. It writes nothing -- a run cannot disturb the live screen, and concurrent sessions
  // writing to The Library during a run are harmless because every write lands untagged.
  // Deliberately NOT set on the `action: "continue"` post below: a resume replays a checkpointed hop
  // from durable_hops and carries its own scope with it.
  let body = await postJSON(ENDPOINT, { ...payload, tenant_id: "global", retrieval_scope: RETRIEVAL_SCOPE, stream: false });
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
// FEATURE: SES-31 (Task 2) -- mirrors the screen's own sectionText() (MarketIntelligenceScreen.jsx
// ~576-580): the Result drawer's sections arrive as {text, citations} (both hyp-hypothesis-test-
// intent's and intelligence-review-format's schemas), except on the AA-135/AA-137 string-content
// paths where the whole value is a plain string. String-coercing the object (the old `+ test.` /
// bare join bug, S-SES-29 finding #2) produced "[object Object]" straight into Elena's/Owen's
// payloads. Returns usable text or "", never an object.
export function sectionText(v) {
  if (typeof v === "string") return v.trim();
  if (v && typeof v.text === "string") return v.text.trim();
  return "";
}

// FEATURE: SES-31 (Task 2) -- key_data_points real field names verified live 2026-07-28 (Supabase
// `skill_profiles` qa-answer-format/intelligence-review-format schemas: {label, value, source,
// data_type, is_baseline[, reasoned_from_section]}, matching the screen's groupKeyDataPoints()/
// ActualDataPointsTable consumption at MarketIntelligenceScreen.jsx ~856-865). Formats "label:
// value" per point -- source/data_type are table-column metadata, not judge-readable prose. Also
// tolerates a plain-string point and a title/amount-keyed point (same defensive posture as
// sectionText(): never crash or blank on shape drift, never guess-fabricate content).
function formatKeyDataPoint(p) {
  if (typeof p === "string") return p.trim();
  if (!p || typeof p !== "object") return "";
  const label = typeof p.label === "string" ? p.label : (typeof p.title === "string" ? p.title : "");
  const value = typeof p.value === "string" ? p.value : (typeof p.amount === "string" ? p.amount : "");
  return [label, value].filter(Boolean).join(": ");
}

export function flattenDisplay(display) {
  const bodyText = Array.isArray(display.body)
    ? display.body.map(sectionText).filter(Boolean).join("\n\n")
    : sectionText(display.body);
  const parts = [display.headline, bodyText];
  if (Array.isArray(display.key_data_points) && display.key_data_points.length) {
    const formatted = display.key_data_points.map(formatKeyDataPoint).filter(Boolean).join("; ");
    if (formatted) parts.push("Key data points: " + formatted);
  }
  return parts.filter(Boolean).join("\n");
}

// FEATURE: SES-31 (Task 2) -- screen `plainText` parity (MarketIntelligenceScreen.jsx ~3907):
// headline + body texts only, NO key_data_points. This is what flows into `flagged_answer`
// (hyp-generation-intent / the A3 review-extension thread) -- flattenDisplay (with key_data_points)
// stays the judge input for the `answer` artifact itself.
export function plainDisplayText(display) {
  const bodyText = Array.isArray(display.body)
    ? display.body.map(sectionText).filter(Boolean).join("\n\n")
    : sectionText(display.body);
  return [display.headline, bodyText].filter(Boolean).join("\n\n");
}

export function flattenTheoryTest(test) {
  const parts = [];
  const supports = sectionText(test.supports);
  const complicates = sectionText(test.complicates);
  const consider = sectionText(test.consider);
  if (supports) parts.push("Supports: " + supports);
  if (complicates) parts.push("Complicates: " + complicates);
  if (consider) parts.push("Consider: " + consider);
  return parts.join("\n");
}

// FEATURE: SES-31 (Task 2) -- `proposed_action` is a 5-key object {action, content, chunk_id,
// confidence, version_note} (S-SES-29 finding #2), not a string -- read `.content` through
// sectionText()'s guard and prefix with the action verb when present (e.g. "[update] ...") so the
// edit/accept/reject distinction survives into judge-readable text. Critique line unchanged.
export function flattenForecastDraft(patch) {
  const action = patch.proposed_action;
  const content = sectionText(action && typeof action === "object" ? action.content : action);
  const actionLabel = action && typeof action.action === "string" ? action.action : null;
  const parts = [];
  if (content) parts.push(actionLabel ? `[${actionLabel}] ${content}` : content);
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

// FEATURE: SES-31a (Task 2) -- extends the existing "[object Object]" guard discipline (SES-31
// Task 2's flatten-layer unwraps) with a runtime assertion: any value about to be judged or
// displayed as prose must already be a real string. Throws naming the field and the received type
// rather than silently coercing -- a shape change upstream (schema drift, a missed unwrap) is a
// finding, consistent with the parent session's pickHypothesisText precedent (Task 1 above).
function assertString(value, fieldName) {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string, got ${value === null ? "null" : typeof value} -- ${JSON.stringify(value)}`);
  }
}

// FEATURE: AGT-36 -- runbook §5b's outcome-class scoring, pure and exported so it is testable
// without a live run. The rich-answer branch is byte-equivalent to what judgeArtifact() did
// before this function existed: `pass` still comes from Owen's own overall flag, and
// failed_criteria is still built the same way. The honest-gap branch implements §5b's table and
// deliberately DOES NOT read verdict.pass -- that flag encodes the rich-answer rubric, which
// structurally cannot pass a correct refusal (runbook §7's exception).
export function scoreVerdict(verdict, outcomeClass) {
  const failed_criteria = [];
  const isTrue  = k => verdict?.[k]?.result === true;
  const isFalse = k => verdict?.[k]?.result === false;

  if (outcomeClass === "honest-gap") {
    // FEATURE: AGT-36b -- the metric bar asks whether the ASKED-FOR figure is present.
    // named_entities_present and quantitative_content_present are informational only in this class.
    // asked_metric_present must be EXPLICITLY false -- an absent or malformed key fails, never
    // silently passes (the vacuous-pass guard, unchanged from v6.3.220).
    if (!isFalse("asked_metric_present"))        failed_criteria.push("asked_metric_present");
    if (!isTrue("actionable_guidance_present"))  failed_criteria.push("actionable_guidance_present");
    if (isTrue("platform_language_detected"))    failed_criteria.push("platform_language_detected");
    return { pass: failed_criteria.length === 0, failed_criteria };
  }

  for (const k of ["named_entities_present", "quantitative_content_present", "actionable_guidance_present"]) {
    if (!isTrue(k)) failed_criteria.push(k);
  }
  if (isTrue("platform_language_detected")) failed_criteria.push("platform_language_detected");
  // FEATURE: SES-65 -- a failure always names a cause. `pass` comes from Owen's own holistic flag
  // (runbook §5's bar) while failed_criteria is built from the loop above, so when he fails an
  // artifact on something none of those criteria cover the two disagree and the reason list comes
  // back EMPTY -- `case_pass: false, failed_criteria: []`, measured four times on case 9
  // vitrine-tech (reclassified honest-gap by DAT-16 after this was written; the defect is the
  // branch's, not that one case's). `holistic_verdict` is an honest name for what happened: Owen judged the artifact
  // as a whole and failed it. Reporting only -- `pass` is byte-unchanged, so nothing that passes
  // today starts failing. It is NOT a sixth criterion and never reaches Owen's Skill schema.
  const pass = verdict?.pass === true;
  if (!pass && failed_criteria.length === 0) failed_criteria.push("holistic_verdict");
  return { pass, failed_criteria };
}

// FEATURE: SES-64 -- pure and exported so it is testable without a live run, same pattern as
// scoreVerdict() (AGT-36). Case 24's outcome class is a property of THIS RUN's article-fetch
// outcome, not a fixed baseline membership fact -- runbook §5b/§8 baseline-change approval:
// John, 2026-08-01 (design-ses-64). HONEST_GAP_IDS is unchanged and still question-id-keyed;
// case 24's id ("news-first-card") never belongs there.
export function resolveNewsDoorOutcomeClass(articleDegraded) {
  return articleDegraded ? "honest-gap" : "rich-answer";
}

// ---- Owen's AGT-35 content-context judge (D5) -- the only content judgment anywhere here ----
async function judgeArtifact({ artifact_type, artifact_content, question, ctx }) {
  // FEATURE: SES-31a (Task 2) -- covers every judgeArtifact call site generically (one enforcement
  // point, not one assertion per caller): theory_test, forecast_draft, rejection, and answer (both
  // runDirectCaseJourney and runRejectionProbe).
  assertString(artifact_content, `artifact_content (${artifact_type})`);
  const verdict = await call({
    capability_slug: "quality-gate", intent_slug: "qg-content-context-intent", agent_id: "owen",
    task_context: { artifact_type, artifact_content, question },
  }, ctx);
  // FEATURE: AGT-36 -- the class rides on ctx (created per case, already passed to every one of the
  // six call sites), so scoring became class-aware without touching a single caller.
  const { pass, failed_criteria } = scoreVerdict(verdict, ctx?.outcome_class);
  // FEATURE: SES-65 -- Owen's own words, surfaced beside the criteria they explain. The reason was
  // never lost (the whole verdict has always ridden along as `evidence`), but a reader of the case
  // record had to dig it out; finalizeCase() now puts it on the run's FAIL line. Surfaced verbatim,
  // never rewritten, summarized, or truncated by the driver -- `evidence` is untouched.
  return { artifact: artifact_type, outcome_class: ctx?.outcome_class || "rich-answer", pass, failed_criteria, critique: verdict?.critique ?? null, evidence: verdict };
}

// FEATURE: SES-31 (Task 1) -- D1 semantics unchanged (still `[0]`, first-listed): pick the picked
// hypothesis's TEXT string, never the whole {id, text, rationale} object. The screen's own
// `chosenText` is exactly that `.text` (MarketIntelligenceScreen.jsx ~4197/4208); passing the
// object leaked the "H1" id label and the rationale's truncated chunk refs into Elena's/Nadia's
// commit payloads, where the Data Room UUID guards correctly denied them (S-SES-29 finding #1 --
// the guards are not the bug). A shape change (hypotheses[0] present but no string .text) is
// itself a finding -- fail loudly rather than silently passing null.
function pickHypothesisText(hyp) {
  const first = hyp.hypotheses?.[0];
  if (first === undefined) return null;
  if (typeof first.text !== "string") {
    throw new Error(`hyp-generation-intent returned hypotheses[0] with no string .text -- shape: ${JSON.stringify(first)}`);
  }
  return first.text;
}

// FEATURE: SES-31a (Task 1) -- Owen Marsh (Proofreader) returns final_answer as
// {answer, citations, confidence_tier} (or null) when he regenerated a blocked answer. Screen
// parity: MarketIntelligenceScreen.jsx:1519 swaps the WHOLE object (`retried ? gate.final_answer :
// qa`), then reads .answer/.citations/.confidence_tier off whichever won -- never just the answer
// string with the ORIGINAL qa's citations/confidence_tier. The driver's old `gate.final_answer ||
// qa.answer` both leaked the raw object as a truthy value ([object Object], the same class SES-31
// just eliminated everywhere else) and mismatched provenance (always qa.citations/confidence_tier
// even when the regenerated answer replaced the text). retried = !!gate?.final_answer (screen line
// 1492's own test). When retried, each field falls back individually to qa's value if the
// regenerated object omits it (only `answer` is load-bearing; citations/confidence_tier are
// optional in the qg-review-intent schema). Defensive: if gate.final_answer is a bare STRING
// (contract drift), treat it as the answer text and keep qa's citations/confidence_tier -- never
// dereference a string into undefined fields.
export function resolveGatedAnswer(gate, qa) {
  const retried = !!gate?.final_answer;
  if (!retried) {
    return { answer: qa.answer, citations: qa.citations, confidence_tier: qa.confidence_tier, retried: false };
  }
  const fa = gate.final_answer;
  if (typeof fa === "string") {
    return { answer: fa, citations: qa.citations, confidence_tier: qa.confidence_tier, retried: true };
  }
  return {
    answer: typeof fa?.answer === "string" ? fa.answer : qa.answer,
    citations: fa?.citations !== undefined ? fa.citations : qa.citations,
    confidence_tier: fa?.confidence_tier !== undefined ? fa.confidence_tier : qa.confidence_tier,
    retried: true,
  };
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

  const jointText = [test.supports, test.complicates, test.consider].map(sectionText).filter(Boolean).join("\n");
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
      // FEATURE: AGT-47 — mirrors the screen's onResolveConfirmation() edit branch: carry the
      // original theory-test text (jointText, already in scope above) alongside the reviewer's edit
      // instead of sending the edit alone. Deliberately mirrored, not extracted into a shared
      // helper — the driver mirrors the screen independently everywhere these two build a call.
      edited_task_context: { disputed_chunk_id: null, correction: editedCorrection, user_reasoning: [jointText, editedCorrection].filter(Boolean).join("\n") },
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
      // FEATURE: SES-31a (Task 1) -- resolveGatedAnswer() screen-parity swap; the judge always
      // receives the resolved ANSWER STRING, never Owen's raw {answer,citations,confidence_tier}
      // regenerated-answer object.
      if (!SKIP_JUDGE) judgeVerdicts.push(await judgeArtifact({ artifact_type: "answer", artifact_content: resolveGatedAnswer(gate, qa).answer, question, ctx }));
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

  // FEATURE: SES-31a (Task 1) -- resolveGatedAnswer() mirrors the screen's own whole-triple swap
  // (MarketIntelligenceScreen.jsx:1519): when Owen retried, ALL THREE fields (answer, citations,
  // confidence_tier) come from his regenerated answer, not just the text with the original qa's
  // citations/confidence_tier still attached.
  const resolved = resolveGatedAnswer(gate, qa);
  const needsReviewInput = qa.needs_review || gate.eval?.result === "revise";
  // FEATURE: SES-31a (Task 2) -- runtime guard: task_context.answer fed to ci-answer-display-intent
  // must be a string, never Owen's raw regenerated-answer object.
  assertString(resolved.answer, "task_context.answer (ci-answer-display-intent)");
  const display = await call({
    capability_slug: "channel-intelligence", intent_slug: "ci-answer-display-intent", agent_id: "marcus",
    task_context: { answer: resolved.answer, citations: resolved.citations, confidence_tier: resolved.confidence_tier, needs_review: needsReviewInput, review_reason: qa.review_reason, ...extraFields },
  }, ctx);
  const flaggedOut = display.needs_review ?? needsReviewInput;
  if (!SKIP_JUDGE) judgeVerdicts.push(await judgeArtifact({ artifact_type: "answer", artifact_content: flattenDisplay(display), question, ctx }));

  let resolution_applied = null;
  if (flaggedOut) {
    // FEATURE: SES-31 (Task 2) -- A3's `flagged_answer` is the final display's PLAIN text (runbook
    // A3), headline+body only, never key_data_points -- plainDisplayText() parity with the screen's
    // own `plainText` (MarketIntelligenceScreen.jsx ~3907). flattenDisplay() above stays the judge
    // input for the `answer` artifact; this is a separate, narrower string.
    const flaggedAnswerText = plainDisplayText(display);
    const hyp = await call({
      capability_slug: "hypothesis-evaluation", intent_slug: "hyp-generation-intent", agent_id: "priya",
      task_context: { flagged_question: question, flagged_answer: flaggedAnswerText, review_reason: display.review_reason ?? qa.review_reason ?? null },
    }, ctx);
    const picked = pickHypothesisText(hyp);
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
  const picked = pickHypothesisText(hyp);
  const tail = await runHypTail({ flaggedQuestion: question, flaggedAnswer: "", intentForTest: routing.intent, picked, resolution: caseObj.resolution, ctx, judgeVerdicts });
  return { actual_journey: routing.intent === "qa" ? "direct" : "forecast", terminal: tail.terminal, flagged: false, resolution_applied: caseObj.resolution, probe: null, rejectionOccurred: false };
}

// ---- A4 news door (D6, case 24) ----
async function runNewsDoorCaseJourney(_caseObj, ctx, judgeVerdicts) {
  // FEATURE: SES-62 -- mirrors MarketIntelligenceScreen.jsx:3784-3799 exactly. CHI-92 split the news
  // flow: Jordan searches and returns structured `stories`, then a second call is his display request
  // with those stories in task_context, and Alex Reeves formats them into `cards`. This function used
  // to make only the first call and read a `cards` key that call has never carried, so every run since
  // CHI-92 threw "zero cards" and regression test #24 -- a bucket-1 gate -- died before asking
  // anything. call() already unwraps body.content (unwrapTerminal, :207), so .stories and .cards are
  // read directly off each result, same as the screen reads them off callCapability().
  const search = await call({ capability_slug: "web-search-news", intent_slug: "ws-news-search-intent", agent_id: "jordan", task_context: {} }, ctx);
  const stories = Array.isArray(search.stories) ? search.stories : [];
  if (stories.length === 0) throw new Error("news door: Jordan returned zero stories");
  const display = await call({ capability_slug: "web-search-news", intent_slug: "ws-news-display-intent", agent_id: "jordan", task_context: { stories } }, ctx);
  const cards = Array.isArray(display.cards) ? display.cards : [];
  if (cards.length === 0) throw new Error("news door: Alex returned zero cards from " + stories.length + " stories");
  const card = cards[0];

  // FEATURE: SES-57 -- same Article Context Resolver the screen calls, so this run cannot ask Marcus
  // a question the product would never ask. Replaces this function's own copy of the fetch: the copy
  // never read the error body (so it had no reason to pass on) and had no try (so a dropped
  // connection killed the case while the screen fails open and still answers). SES-31's own
  // "200 with no text is degraded too" rule survives inside the resolver as `degraded: !text`.
  const { payload: extraFields, failure: articleFailure, degraded: articleDegraded } =
    await resolveNewsCardContext(card.url, FETCH_ARTICLE_ENDPOINT);

  // FEATURE: SES-64 -- runbook §5b/§8 baseline change: case 24 scores honest-gap when this run's
  // article could not be read, rich-answer when it could. ctx is the same mutable object
  // judgeArtifact() reads (L423) and finalizeCase() records (L670), so this is the only line that
  // needs to change -- no reordering, articleDegraded is already known before the answer/judge call.
  ctx.outcome_class = resolveNewsDoorOutcomeClass(articleDegraded);

  const question = `New industry development: ${card.headline}. What does this mean for our channel program positioning?`;
  const result = await runDirectCaseJourney(question, ctx, judgeVerdicts, extraFields);
  return { ...result, card_headline: card.headline, card_url: card.url, article_source: extraFields.article_source, article_degraded: articleDegraded, article_unavailable_reason: articleFailure };
}

function executeCaseJourney(caseObj, ctx, judgeVerdicts) {
  if (caseObj.isNewsDoor) return runNewsDoorCaseJourney(caseObj, ctx, judgeVerdicts);
  if (caseObj.resolution) return runForecastCaseJourney(caseObj, ctx, judgeVerdicts);
  return runDirectCaseJourney(caseObj.label, ctx, judgeVerdicts);
}

// ================================================================================================
// Task 3 -- the report.
// ================================================================================================

function finalizeCase({ n, id, expected_journey, actual_journey, terminal, wall_ms, flagged, resolution_applied, ctx, probe, judgeVerdicts, rejectionOccurred, infraDeath, infraError, card_headline, card_url, article_source, article_degraded, article_unavailable_reason }) {
  const fail_causes = [];
  if (infraDeath) fail_causes.push(`infra_death: ${infraError || "unrecovered transient failure"}`);
  if (rejectionOccurred) fail_causes.push("rejection");
  const bucket = actual_journey ? actual_journey.split("+")[0] : null;
  if (!infraDeath && bucket !== expected_journey) fail_causes.push(`journey_deviation (expected ${expected_journey}, got ${actual_journey})`);
  // FEATURE: SES-65 -- `judge_fail` was the one bare token on this list; infra_death and
  // journey_deviation have always carried their detail inline, and the per-case console line prints
  // fail_causes verbatim. Built from the FAILING verdicts only, so a passing artifact's critique
  // never pads the line.
  if (!SKIP_JUDGE && !infraDeath && judgeVerdicts.some(v => v.pass !== true)) {
    const detail = judgeVerdicts.filter(v => v.pass !== true).map(v => {
      const why = v.failed_criteria.join(", ");
      return v.critique ? `${v.artifact}: ${why} -- "${v.critique}"` : `${v.artifact}: ${why}`;
    }).join(" | ");
    fail_causes.push(`judge_fail (${detail})`);
  }
  return {
    n, id, expected_journey, actual_journey, terminal, wall_ms, flagged, resolution_applied,
    recoveries: ctx.recoveries, trace_ids: ctx.trace_ids,
    // FEATURE: AGT-36 -- runbook §5b's class on the record itself, so a reader of REPORT_JSON can
    // see which bar this case was scored against without re-deriving it from the question id.
    outcome_class: ctx?.outcome_class || "rich-answer",
    probe, judge_verdicts: judgeVerdicts, case_pass: fail_causes.length === 0, fail_causes,
    // FEATURE: SES-31 (Task 3) -- case 24's news-door identity/degradation fields, dropped by the
    // previous version of this function (S-SES-29 finding, a runbook §7 "report the degradation
    // prominently" breach). Present only on case 24's record; every other case's outcome never sets
    // these, so they stay correctly absent rather than showing up as literal `undefined` keys.
    ...(card_headline !== undefined ? { card_headline } : {}),
    ...(card_url !== undefined ? { card_url } : {}),
    ...(article_source !== undefined ? { article_source } : {}),
    ...(article_degraded !== undefined ? { article_degraded } : {}),
    // FEATURE: SES-57 -- WHY the article was unavailable, not just that it was. A bare
    // article_degraded true/false cannot tell a paywall from a publisher timeout even though
    // api/fetch-article.js classified it; this is the resolver's primary_failure, recorded verbatim.
    // null (article read) on case 24, absent on every other case and on an infra death.
    ...(article_unavailable_reason !== undefined ? { article_unavailable_reason } : {}),
  };
}

async function runOneCase(caseObj) {
  console.log(`[${caseObj.n}/24] ${caseObj.id} -- running...`);
  const t0 = Date.now();
  let attempt = 0, lastError = null, outcome = null;
  // FEATURE: SES-31 (Task 4) -- hoisted above the loop and reassigned at the TOP of each attempt
  // (before the try), so if every attempt throws, these still hold the LAST attempt's real ctx/
  // judgeVerdicts (both are mutated by reference inside executeCaseJourney, so whatever accumulated
  // before the throw survives) instead of a fresh empty ctx -- infra-death records must carry the
  // trace_ids/recoveries that actually accumulated before the death (S-SES-29 finding).
  // FEATURE: AGT-36 -- the class is on BOTH ctx objects, so an infra-death record carries it too.
  let lastCtx = { recoveries: [], trace_ids: [], outcome_class: caseObj.outcome_class || "rich-answer" };
  let lastJudge = [];
  // Transient-death handling (runbook §4 tail note): one fresh full re-run of the whole case on any
  // thrown error; a second death is an infra-class FAIL, no probe.
  while (attempt < 2 && !outcome) {
    attempt++;
    const ctx = { recoveries: [], trace_ids: [], outcome_class: caseObj.outcome_class || "rich-answer" };
    const judgeVerdicts = [];
    lastCtx = ctx;
    lastJudge = judgeVerdicts;
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
        card_headline: outcome.card_headline, card_url: outcome.card_url,
        article_source: outcome.article_source, article_degraded: outcome.article_degraded,
        article_unavailable_reason: outcome.article_unavailable_reason, // FEATURE: SES-57
      })
    : finalizeCase({
        n: caseObj.n, id: caseObj.id, expected_journey: caseObj.expected_journey,
        actual_journey: null, terminal: "infra_death", wall_ms, flagged: false,
        resolution_applied: caseObj.resolution || null, ctx: lastCtx,
        probe: null, judgeVerdicts: lastJudge, rejectionOccurred: false, infraDeath: true, infraError: lastError?.message,
      });
  // FEATURE: SES-31 (Task 3) -- loud degradation marker on the per-case progress line (runbook §7
  // "report the degradation prominently").
  const degradedMarker = record.article_degraded ? " *** ARTICLE DEGRADED ***" : "";
  // FEATURE: AGT-36 -- so a reader can see why a pass:false verdict from Owen did not fail the case.
  const classMarker = record.outcome_class === "honest-gap" ? " [honest-gap]" : "";
  console.log(`[${caseObj.n}/24] ${caseObj.id}${classMarker} -- ${record.case_pass ? "PASS" : "FAIL"} (${record.terminal}, ${wall_ms}ms)${record.fail_causes.length ? " causes=" + record.fail_causes.join(",") : ""}${degradedMarker}`);
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
    // FEATURE: DAT-12 -- recorded so a reader of REPORT_JSON can tell a scoped run from an unscoped
    // one. A run whose retrieval_scope is absent read whatever the previous run left behind and is
    // not comparable to a scoped run.
    totals: { baseline_cases: 24, extracted: extractedCount, cases_run: results.length, retrieval_scope: RETRIEVAL_SCOPE },
  };

  console.log("REPORT_JSON_START");
  console.log(JSON.stringify(report, null, 2));
  console.log("REPORT_JSON_END");
}

// FEATURE: SES-31 -- gate top-level execution so the flatten helpers stay importable (Part 1 Node
// test, Category N, imports them directly) without also kicking off a live 24-case run on import.
const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMainModule) {
  main().catch(e => { console.error("FATAL:", e); process.exit(1); });
}
