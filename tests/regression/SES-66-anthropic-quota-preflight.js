// DeepBench v7.0.313 | tests/regression/SES-66-anthropic-quota-preflight.js | SES-66 -- the
// Anthropic cap pre-flight tells a real account cap apart from an ordinary 400, and says when
// access returns.
//
// WHAT IS BEING PINNED, and it is one decision rather than a behaviour sweep. The 2026-07-30
// incident's whole symptom was the string "Anthropic call failed: 400". 400 is also what the API
// returns for a malformed request, a bad model id, or a missing field -- so the naive check,
// `status === 400 -> capped`, passes the incident's own fixture and is still wrong: it reports
// every ordinary request bug as an account-wide cap and sends a session to wait out a limit it is
// not under. The shipped classifier keys on the MESSAGE. Clause `ordinary-400-is-not-a-cap` and
// the behavioural control below are the two halves that prove those are different implementations
// rather than the same one described twice.
//
// THE NEGATIVE CONTROL IS THE RETIRED FORM, applied to the SAME fixture and asserted to LOSE
// (the SES-213 lesson: assert a DIFFERENCE from the rejected behaviour, never a property both
// share). `retiredStatusOnlyClassify` is that rejected implementation, kept here and nowhere else,
// and arm 7 asserts it calls the ordinary 400 a cap while the shipped one does not.
//
// THE OTHER HALF, which is what stops this guard licensing a "simplify the classifier" sweep: a
// 429 and a 401 must NOT be collapsed into one rule. 429 is a cap with no message needed; 401 is a
// bad key and is `unknown`, because reporting a credential failure as a cap tells a session to
// wait for a reset that will never come. Arms 4 and 5 pin the pair, in opposite directions.
//
// Needs no credentials and no network: `classify` is pure, and the one probe arm drives the real
// `probe()` through an injected stub fetch. Guards v7.0.313.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";
import { classify, parseResetsAt, errorMessageOf, probe } from "../../scripts/check-anthropic-quota.js";
import { MODELS } from "../../shared/models.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT = path.join(ROOT, "scripts/check-anthropic-quota.js");

// ---- fixtures ----------------------------------------------------------------------------------
// The cap message is quoted from the incident SES-66 was filed on, not invented. The ordinary-400
// message is the API's own shape for a malformed request -- the population the retired form
// misclassifies.
const CAP_MESSAGE =
  "You have reached your specified API usage limits. You will regain access on 2026-08-01 at 00:00 UTC";
const err = message => ({ type: "error", error: { type: "invalid_request_error", message } });

const CAPPED_400 = { status: 400, body: err(CAP_MESSAGE) };
const ORDINARY_400 = { status: 400, body: err("messages: at least one message is required") };
const OK_200 = { status: 200, body: { type: "message", content: [{ type: "text", text: "" }] } };
const RATE_429 = { status: 429, body: err("Number of requests has exceeded your rate limit") };
const AUTH_401 = { status: 401, body: err("invalid x-api-key") };
const GATEWAY_502 = { status: 502, body: null };

// THE RETIRED IMPLEMENTATION -- the status-only rule this ship rejected. It lives here so the
// control exercises the real rejected logic rather than a description of it.
export function retiredStatusOnlyClassify(status) {
  if (status === 200) return { verdict: "clear", exitCode: 0 };
  if (status === 400 || status === 429) return { verdict: "capped", exitCode: 1 };
  return { verdict: "unknown", exitCode: 2 };
}

// ---- source-level clauses ----------------------------------------------------------------------
// Each clause reads the shipped script. `breaks` must flip its own clause to false; the SES-158
// vacuity meta-check below drives that.
export const CLAUSES = [
  {
    id: "probe-is-an-inference-call",
    detail:
      "the probe must POST /v1/messages -- a GET /v1/models returns 200 for a fully-capped " +
      "account, so a metadata probe reports 'clear' on the exact state this check exists to catch",
    test: s => /const API_URL = "https:\/\/api\.anthropic\.com\/v1\/messages"/.test(s),
    breaks: s => s.replace('/v1/messages"', '/models"'),
  },
  {
    id: "probe-stays-one-token",
    detail:
      "max_tokens must stay 1 -- the probe is billable, and its whole licence is that the bill is " +
      "a rounding error against the suite it gates",
    test: s => /max_tokens: 1,/.test(s),
    breaks: s => s.replace("max_tokens: 1,", "max_tokens: 256,"),
  },
  {
    id: "model-id-comes-from-shared-models",
    detail:
      "the model must be MODELS.HAIKU from shared/models.js, never a literal -- STANDARDS.md " +
      "Section 12's canonical-id rule, which check-model-ids.js enforces server-side",
    test: s => /import \{ MODELS \} from "\.\.\/shared\/models\.js"/.test(s) && /model: MODELS\.HAIKU,/.test(s),
    breaks: s => s.replace("model: MODELS.HAIKU,", 'model: "claude-haiku-4-5",'),
  },
  {
    id: "cannot-run-is-exit-2-not-exit-0",
    detail:
      "a missing ANTHROPIC_API_KEY must exit 2, never 0 -- the three-way contract " +
      "check-deploy-current.js states, where an unrunnable check is never reported as a pass",
    test: s => /ANTHROPIC_API_KEY is not set[\s\S]{0,80}resetsAt: null/.test(s)
      && /if \(!apiKey\) \{\s*emit\(\{\s*verdict: "unknown",\s*exitCode: 2,/.test(s),
    breaks: s => s.replace(
      'if (!apiKey) {\n    emit({\n      verdict: "unknown",\n      exitCode: 2,',
      'if (!apiKey) {\n    emit({\n      verdict: "clear",\n      exitCode: 0,'
    ),
  },
  {
    id: "the-message-rule-is-written-down",
    detail:
      "the script must carry its own forbidden edit in its header, so the next reader decides by " +
      "the rule rather than by shortening the classifier to a status test",
    test: s => /KEYS ON THE MESSAGE, NEVER ON THE STATUS ALONE/.test(s),
    breaks: s => s.replace("KEYS ON THE MESSAGE, NEVER ON THE STATUS ALONE", "reads the response"),
  },
];

export default async function run() {
  const src = fs.readFileSync(SCRIPT, "utf8");

  // 1-5: the shipped source satisfies every clause.
  for (const c of CLAUSES) {
    assert.ok(c.test(src), `${c.id} -- ${c.detail}`);
  }

  // SES-158's vacuity meta-check: every clause must FAIL against its own broken source.
  for (const c of CLAUSES) {
    assert.ok(
      !c.test(c.breaks(src)),
      `${c.id} is VACUOUS -- it still passes after its own breaks() mutation, so it pins nothing`
    );
  }

  // --- behavioural arms, one variable each -----------------------------------------------------

  // arm 1: the incident's own response is a cap, and the reset instant is recovered from it.
  const capped = classify(CAPPED_400.status, CAPPED_400.body);
  assert.strictEqual(capped.verdict, "capped", "the 2026-07-30 cap message must classify as capped");
  assert.strictEqual(capped.exitCode, 1, "a cap must exit 1");
  assert.strictEqual(
    capped.resetsAt, "2026-08-01T00:00:00Z",
    `SES-66 asks for the reset behaviour to be RECORDED -- got ${JSON.stringify(capped.resetsAt)}`
  );

  // arm 2: THE DISCRIMINATING ONE. An ordinary 400 carries the same status and must NOT be a cap.
  const ordinary = classify(ORDINARY_400.status, ORDINARY_400.body);
  assert.strictEqual(
    ordinary.verdict, "unknown",
    "an ordinary 400 must be 'unknown' -- reporting a request bug as an account cap sends a " +
    "session to wait out a limit it is not under"
  );
  assert.strictEqual(ordinary.exitCode, 2, "an unrecognised failure must exit 2, never 1 and never 0");

  // arm 3: a successful call is clear.
  const clear = classify(OK_200.status, OK_200.body);
  assert.strictEqual(clear.verdict, "clear");
  assert.strictEqual(clear.exitCode, 0);

  // arm 4: 429 is a cap with no message needed.
  assert.strictEqual(classify(RATE_429.status, RATE_429.body).verdict, "capped");

  // arm 5: 401 is NOT a cap -- the opposite direction of arm 4, so the two cannot be collapsed.
  const auth = classify(AUTH_401.status, AUTH_401.body);
  assert.strictEqual(
    auth.verdict, "unknown",
    "a bad key must not read as a cap -- it would tell a session to wait for a reset that never comes"
  );

  // arm 6: an unreadable body must not throw; it is 'unknown'.
  assert.strictEqual(classify(GATEWAY_502.status, GATEWAY_502.body).verdict, "unknown");
  assert.strictEqual(errorMessageOf(null), "");

  // arm 7: THE NEGATIVE CONTROL. The retired status-only rule, on the SAME fixture, must LOSE.
  const retired = retiredStatusOnlyClassify(ORDINARY_400.status);
  assert.strictEqual(
    retired.verdict, "capped",
    "the retired status-only form should call the ordinary 400 a cap -- if it does not, this " +
    "control proves nothing and the guard is not discriminating"
  );
  assert.notStrictEqual(
    retired.verdict, ordinary.verdict,
    "the shipped classifier and the retired one agreed on the ordinary 400 -- there is no " +
    "difference here to guard"
  );
  // ...and they must still AGREE on the incident's own fixture, which is why the naive form
  // survived review in the first place. This is the arm that shows the control is fair.
  assert.strictEqual(
    retiredStatusOnlyClassify(CAPPED_400.status).verdict, capped.verdict,
    "both forms should agree on the real cap -- the difference must be the ordinary 400, not the cap"
  );

  // arm 8: a cap whose message carries no reset is still a cap; the instant is reported, never
  // required. The rolling-vs-fixed-window question SES-66 flags as unconfirmed is not guessed at.
  const noReset = classify(400, err("You have reached your specified API usage limits."));
  assert.strictEqual(noReset.verdict, "capped");
  assert.strictEqual(noReset.resetsAt, null, "an absent reset must be null, never an invented date");
  assert.strictEqual(parseResetsAt("nothing here"), null);

  // arm 9: probe() wires a real response through classify, and sends the one-token body. Driven
  // through the shipped probe() with a stub fetch -- the real implementation, no network.
  let sent = null;
  const stub = async (url, init) => {
    sent = { url, init };
    return { status: 400, json: async () => CAPPED_400.body };
  };
  const probed = await probe({ apiKey: "test-key", timeoutMs: 5000, fetchImpl: stub });
  assert.strictEqual(probed.verdict, "capped", "probe() must classify the response it received");
  assert.strictEqual(probed.resetsAt, "2026-08-01T00:00:00Z");
  const body = JSON.parse(sent.init.body);
  assert.strictEqual(body.max_tokens, 1, "the probe must stay one token");
  assert.strictEqual(body.model, MODELS.HAIKU, "the probe must use the canonical Haiku id");
  assert.strictEqual(sent.init.headers["x-api-key"], "test-key");
}

selfRun(import.meta.url, run);
