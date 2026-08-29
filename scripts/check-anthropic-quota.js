#!/usr/bin/env node
// DeepBench v7.0.313 | scripts/check-anthropic-quota.js | SES-66
// FEATURE: SES-66 -- the account-wide Anthropic usage cap gets the pre-flight check the Vercel
// deploy quota has had since SES-015, so a session stops discovering it mid-run.
//
// THE GAP THIS CLOSES, quoted from the ticket rather than paraphrased: on 2026-07-30
// (`design-dat-16`) every live regression call failed instantly with `Anthropic call failed: 400`,
// root cause *"You have reached your specified API usage limits. You will regain access on
// 2026-08-01 at 00:00 UTC"* -- an account-wide cap, not a code or deploy defect. An untouched,
// unrelated case (`south-korea-coop`) failed identically, which is what proved it cross-cutting.
// SES-66's own words: *"Unlike SES-33's Vercel deploy-quota gate (check-deploy-current.js), there
// is no pre-flight check for this"* -- a session only discovers it mid-run, after already spending
// wall-clock on a call that was going to 400 regardless. Confirmed still true 2026-08-29 by
// listing scripts/ on an unedited tree: check-deploy-current.js is there, nothing is here.
//
// WHY THE PROBE IS AN INFERENCE CALL AND NOT `GET /v1/models`, which is the obvious cheaper move
// and is the wrong one. The cap blocks INFERENCE; a metadata read is not gated by a spend limit,
// so `/v1/models` returns 200 for a fully-capped account and the check reports "clear" on exactly
// the state it exists to catch. A pre-flight that cannot fail is worse than none, because a
// session then trusts it. The probe is therefore the smallest real call that exists: the canonical
// Haiku model, `max_tokens: 1`, a one-character prompt -- billable, and the bill is a rounding
// error against the wall-clock of a regression suite that was going to 400 anyway.
//
// THE CLASSIFICATION KEYS ON THE MESSAGE, NEVER ON THE STATUS ALONE -- this is the whole of the
// script's judgment and the one edit it forbids. The incident's symptom was literally
// "Anthropic call failed: 400", and 400 is the status the API also returns for an invalid request,
// a bad model id, or a malformed body. `status === 400 -> capped` would report every ordinary
// request bug as an account cap and send a session to wait out a limit it is not under. So a 400
// is a cap only when the body says it is; every other 400 is `unknown`, which exits 2.
//
// Usage: node scripts/check-anthropic-quota.js [--json] [--timeout=<seconds>]
// Reads ANTHROPIC_API_KEY from the environment (runner_secrets; never written to a file).
// Exit codes -- deliberately the same three-way contract as check-deploy-current.js:
//   0  clear   -- a live inference call succeeded; live QA may run
//   1  capped  -- the account is over a usage limit; live calls will fail regardless of the change
//   2  cannot run -- no API key, the API was unreachable, or the response shape was not recognised
//
// Exit 2 is deliberately distinct from exit 1: an unrunnable check must never be reported as a
// pass, and must never be confused with a real cap either. Same rule the deploy gate states, and
// the same rule step 7's other checks (`check-version-claim.js`, `export-backlog-snapshot.js`)
// already carry.

import { MODELS } from "../shared/models.js";
import { pathToFileURL } from "url";

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

function arg(name, fallback) {
  const prefix = `--${name}=`;
  const hit = process.argv.find(a => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

// ---------------------------------------------------------------------------
// Pure decision logic -- exported so tests/regression/SES-66-anthropic-quota-preflight.js
// can exercise every branch without a network call or a credential. Same seam
// check-deploy-current.js uses for the same reason.
// ---------------------------------------------------------------------------

// The live cap message, quoted from the 2026-07-30 incident:
//   "You have reached your specified API usage limits. You will regain access on
//    2026-08-01 at 00:00 UTC"
// Matched on the durable half of the sentence. `credit balance is too low` is the sibling
// wording the same account-level gate produces when the cap is a balance rather than a
// configured limit; both mean "no inference until a human acts", which is the one thing a
// caller needs to know.
const CAP_PATTERNS = [
  /reached your specified api usage limit/i,
  /usage limit/i,
  /credit balance is too low/i,
  /quota (?:has been )?exceeded/i,
];

// "You will regain access on 2026-08-01 at 00:00 UTC" -- the reset instant the message carries.
// SES-66 asks for the cap's reset behaviour to be RECORDED "once observed again"; extracting it
// here is what makes that a property of the check rather than something a human must notice and
// write down. Absent from the message -> null, reported as unknown rather than guessed at: the
// rolling-vs-fixed-window question the ticket flags as unconfirmed is not settled by this script.
export function parseResetsAt(message) {
  if (typeof message !== "string") return null;
  const m = /regain access on\s+(\d{4}-\d{2}-\d{2})(?:\s+at\s+(\d{2}:\d{2}))?\s*UTC/i.exec(message);
  if (!m) return null;
  return `${m[1]}T${m[2] || "00:00"}:00Z`;
}

// Pull the human message out of whatever shape came back. The API's error envelope is
// { type: "error", error: { type, message } }; a proxy or a gateway can return something else
// entirely, and a body that is not an object must not throw here -- an unreadable body is
// `unknown`, which is exit 2, which is honest.
export function errorMessageOf(body) {
  if (!body || typeof body !== "object") return typeof body === "string" ? body : "";
  if (body.error && typeof body.error === "object" && typeof body.error.message === "string") {
    return body.error.message;
  }
  if (typeof body.message === "string") return body.message;
  return "";
}

/**
 * @returns {{verdict: "clear"|"capped"|"unknown", exitCode: 0|1|2, reason: string, resetsAt: string|null}}
 */
export function classify(status, body) {
  const message = errorMessageOf(body);

  if (status === 200) {
    return { verdict: "clear", exitCode: 0, reason: "a live inference call succeeded", resetsAt: null };
  }

  // 429 is the API's own "you are over a limit" status and needs no message to be trusted.
  // It covers the per-minute rate limit as well as a quota, and both mean the same thing to a
  // caller about to run a suite: not now.
  if (status === 429) {
    return {
      verdict: "capped",
      exitCode: 1,
      reason: message || "HTTP 429 -- rate or quota limit",
      resetsAt: parseResetsAt(message),
    };
  }

  // THE DISCRIMINATING BRANCH. A 400 is a cap only when the body says so. The retired form
  // `status === 400 -> capped` is pinned as a losing negative control in this script's guard.
  if (CAP_PATTERNS.some(re => re.test(message))) {
    return { verdict: "capped", exitCode: 1, reason: message, resetsAt: parseResetsAt(message) };
  }

  // Everything else -- an ordinary 400, a 401 on a bad key, a 5xx, a gateway body we cannot
  // read. None of these is evidence of a cap, and reporting one as a pass would be worse still.
  return {
    verdict: "unknown",
    exitCode: 2,
    reason: message ? `HTTP ${status} -- ${message}` : `HTTP ${status} -- unrecognised response`,
    resetsAt: null,
  };
}

// ---------------------------------------------------------------------------
// The probe
// ---------------------------------------------------------------------------

export async function probe({ apiKey, timeoutMs, fetchImpl = fetch }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(API_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "anthropic-version": API_VERSION,
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        model: MODELS.HAIKU,
        max_tokens: 1,
        messages: [{ role: "user", content: "." }],
      }),
    });
    let body = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    return classify(res.status, body);
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const json = process.argv.includes("--json");
  const timeoutMs = Number(arg("timeout", "20")) * 1000;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  const emit = result => {
    if (json) {
      console.log(JSON.stringify(result));
    } else {
      const head = { clear: "CLEAR", capped: "CAPPED", unknown: "CANNOT RUN" }[result.verdict];
      console.log(`${head} -- ${result.reason}`);
      if (result.resetsAt) console.log(`access returns: ${result.resetsAt}`);
    }
    process.exit(result.exitCode);
  };

  // No key is "cannot run", never "clear". The check is unavailable, and an unavailable check
  // that reports a pass is the failure every other gate in this repo is written to avoid.
  if (!apiKey) {
    emit({
      verdict: "unknown",
      exitCode: 2,
      reason: "ANTHROPIC_API_KEY is not set -- the cap cannot be probed from here",
      resetsAt: null,
    });
    return;
  }

  try {
    emit(await probe({ apiKey, timeoutMs }));
  } catch (err) {
    // A transport failure is not a cap either. Named, exit 2.
    emit({
      verdict: "unknown",
      exitCode: 2,
      reason: `the Anthropic API could not be reached: ${err && err.message ? err.message : String(err)}`,
      resetsAt: null,
    });
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main();
}
