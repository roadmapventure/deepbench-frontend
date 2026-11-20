#!/usr/bin/env node
// DeepBench v7.0.1074 | scripts/read-usage-meter.js | AGT-310 -- a plan-limit rejection becomes one alert and, after it lifts, a no-run row per missed window.
// DeepBench v7.0.1067 | scripts/read-usage-meter.js | AGT-617 -- the 5h headers are optional; a reading without them is written with session NULL.
// DeepBench v7.0.484 | scripts/read-usage-meter.js | SES-388 -- --via-headers: the always-on reader.
// DeepBench v7.0.455 | scripts/read-usage-meter.js | SES-374 -- the scheduled meter reader.
//
// WHY THIS EXISTS. The weekly pace gate (M5-16) and the rest wall (M5-06) read the freshest
// public.runner_usage_readings row. On 2026-09-11, the first unattended day, every row was written
// by an attended session running `claude -p "/usage"` by hand (SES-82's closer); a cloud cycle has
// no access to the meter, so between attended reads the gate ran on a stale number (recorded 14
// while the meter read 16) and a chained cycle stopped itself on an inference instead of a fact.
// This script is that hand-run command, made a scheduled task on John's machine.
//
// WHAT IT DOES. Runs the Claude Code CLI's /usage under John's subscription login, parses the three
// meter lines, and inserts ONE runner_usage_readings row (source 'meter-reader', slot 'scheduled').
// Never prints or stores the OAuth token; never prints the service key.
//
// ALWAYS-ON MODE (SES-388): --via-headers. A `claude setup-token` OAuth token cannot read the meter the
// CLI way -- MEASURED on GitHub runner 34864955276, that token signs in but /api/oauth/usage answers 403
// oauth_scope_insufficient (needs user:profile) and `claude -p "/usage"` prints the session cost summary
// instead of the meter. MEASURED on runs 34864955276 and 34865128090, the SAME token gets the meter back in
// the rate-limit headers of a one-token POST to /v1/messages: 5h and 7d utilization plus both reset instants
// on claude-haiku-4-5-20251001, and -7d_oi- (the Fable week, 0.91) on claude-fable-5-1. That is what
// --via-headers reads, which is why the always-on reader runs on GitHub with no CLI installed at all.
//
// CREDENTIALS -- and why they are not in .env.local. John's ruling d7670e18 (SES-260): .env.local
// carries publishable values only. The service key therefore lives DPAPI-encrypted under John's
// Windows profile (%USERPROFILE%\.deepbench\supabase-meter-reader.dpapi), readable only by his
// account on this machine, written once by `--store-credentials` (below). Environment variables
// SUPABASE_URL / SUPABASE_SERVICE_KEY take precedence when present (a session running this by hand).
//
// Usage:
//   node scripts/read-usage-meter.js                  read the meter, write one row, print the id
//   node scripts/read-usage-meter.js --dry-run        read and parse, write nothing, print the numbers
//   node scripts/read-usage-meter.js --json           machine-readable output
//   node scripts/read-usage-meter.js --via-headers    read the meter from the rate-limit headers of two
//         one-token API calls instead of the CLI (needs CLAUDE_CODE_OAUTH_TOKEN); writes source
//         'meter-reader-headers'. --dry-run and --json work here too; the default CLI path is unchanged.
//   node scripts/read-usage-meter.js --store-credentials   (Windows) read SUPABASE_URL and
//         SUPABASE_SERVICE_KEY from the environment and write the DPAPI file; prints neither value
//
// Exit codes (the shape every check-* script in this repo uses):
//   0  a row was written (or --dry-run parsed cleanly)
//   2  cannot run -- the CLI is logged out ("OAuth session expired": John runs `claude auth login`),
//      the output did not parse, credentials are missing, or the insert was refused. The reason is
//      named on stderr and in --json. Under --via-headers two more reasons appear: 'no-token' (no
//      CLAUDE_CODE_OAUTH_TOKEN in the environment) and 'headers-refused' (the API turned the probe
//      down). A reading older than 2h while this task is installed is the
//      finding the standing brief should raise; this script never fakes a row to hide one.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ARGV = process.argv.slice(2);
const DRY = ARGV.includes("--dry-run");
const JSON_OUT = ARGV.includes("--json");
const STORE = ARGV.includes("--store-credentials");
const VIA_HEADERS = ARGV.includes("--via-headers");
export const CRED_FILE = path.join(os.homedir(), ".deepbench", "supabase-meter-reader.dpapi");
export const CLI_ARGS = ["-p", "/usage", "--model", "claude-haiku-4-5", "--max-turns", "1", "--output-format", "text"];

// ---------------------------------------------------------------------------
// Pure: parse the CLI's text output.
//   "Current session: 22% used · resets Sep 11, 3:10pm (America/Chicago)"
//   "Current week (all models): 10% used · resets Sep 18, 1am (America/Chicago)"
//   "Current week (Fable): 18% used · resets Sep 18, 1am (America/Chicago)"
// Returns { session5hPct, allModelsPct, fablePct, resets: {session, week} } or, when a required line
// is missing, { error } naming which. A logged-out CLI is reported as error 'cli-logged-out'.
// ---------------------------------------------------------------------------
export function parseUsage(text) {
  const s = String(text || "");
  if (/OAuth session expired|not logged in|Please run .*claude auth login|claude auth login/i.test(s) &&
      !/Current week \(all models\)/.test(s)) {
    return { error: "cli-logged-out", detail: "the Claude Code CLI has no live login on this machine; run `claude auth login`" };
  }
  const pick = (label) => {
    const re = new RegExp(`^\\s*${label}:\\s*(\\d+(?:\\.\\d+)?)%\\s*used(?:\\s*[·\\-]\\s*resets\\s*(.+?))?\\s*$`, "m");
    const m = re.exec(s);
    return m ? { pct: Number(m[1]), resets: m[2] ? m[2].trim() : null } : null;
  };
  const session = pick("Current session");
  const week = pick("Current week \\(all models\\)");
  const fable = pick("Current week \\(Fable\\)");
  if (!week) return { error: "parse", detail: "no 'Current week (all models): N% used' line in the CLI output" };
  if (!fable) return { error: "parse", detail: "no 'Current week (Fable): N% used' line in the CLI output" };
  if (!session) return { error: "parse", detail: "no 'Current session: N% used' line in the CLI output" };
  for (const [name, v] of [["session", session], ["all models", week], ["Fable", fable]]) {
    if (!(v.pct >= 0 && v.pct <= 100)) return { error: "parse", detail: `${name} percentage ${v.pct} is outside 0..100` };
  }
  return {
    session5hPct: session.pct,
    allModelsPct: week.pct,
    fablePct: fable.pct,
    resets: { session: session.resets, week: week.resets },
  };
}

// ---------------------------------------------------------------------------
// Pure: the SAME three numbers, taken from rate-limit headers instead of CLI text (SES-388).
//
// Two plain objects of LOWER-CASED header name -> value: the headers of the general-model call and
// the headers of the Fable call. The general call carries the 5h and the 7d utilization and both
// reset instants; only the Fable call carries `-7d_oi-`, which is the Fable week. Utilizations are
// fractions (0.57 = 57%); resets are epoch SECONDS, rendered in America/Chicago in the same shape
// the CLI prints, so a row's note reads the same whichever reader wrote it.
// Returns parseUsage's shape, or { error: "parse", detail } NAMING the header that was missing.
// ---------------------------------------------------------------------------
export const RATE_LIMIT_HEADERS = {
  session: "anthropic-ratelimit-unified-5h-utilization",
  week: "anthropic-ratelimit-unified-7d-utilization",
  fable: "anthropic-ratelimit-unified-7d_oi-utilization",
  sessionReset: "anthropic-ratelimit-unified-5h-reset",
  weekReset: "anthropic-ratelimit-unified-7d-reset",
};
export const METER_TIMEZONE = "America/Chicago";

// "Sep 18, 1am (America/Chicago)" / "Sep 14, 12:40pm (America/Chicago)" -- minutes only when they are
// not :00, which is exactly how the CLI renders the same instants. Intl only, no library.
export function formatResetInstant(epochSeconds, timeZone = METER_TIMEZONE) {
  const n = Number(epochSeconds);
  if (!Number.isFinite(n) || n <= 0) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
  }).formatToParts(new Date(n * 1000));
  const at = (t) => (parts.find((p) => p.type === t) || {}).value;
  if (!at("month") || !at("hour") || !at("dayPeriod")) return null;
  const clock = at("minute") === "00" ? at("hour") : `${at("hour")}:${at("minute")}`;
  return `${at("month")} ${at("day")}, ${clock}${String(at("dayPeriod")).toLowerCase()} (${timeZone})`;
}

function lowerKeys(headers) {
  const out = {};
  for (const [k, v] of Object.entries(headers || {})) out[String(k).toLowerCase()] = v;
  return out;
}

export function parseRateLimitHeaders(generalHeaders, fableHeaders) {
  const general = lowerKeys(generalHeaders);
  const fable = lowerKeys(fableHeaders);
  const missing = (name, where) => ({ error: "parse", detail: `no '${name}' header on the ${where} response` });
  const pct = (bag, name, where) => {
    const raw = bag[name];
    if (raw === undefined || raw === null || raw === "") return missing(name, where);
    const util = Number(raw);
    if (!Number.isFinite(util)) return { error: "parse", detail: `'${name}' on the ${where} response is not a number: ${String(raw).slice(0, 40)}` };
    const value = Math.round(util * 100);
    if (!(value >= 0 && value <= 100)) return { error: "parse", detail: `'${name}' utilization ${util} is outside 0..1` };
    return { value };
  };
  const reset = (bag, name, where) => {
    const raw = bag[name];
    if (raw === undefined || raw === null || raw === "") return missing(name, where);
    const rendered = formatResetInstant(raw);
    if (!rendered) return { error: "parse", detail: `'${name}' on the ${where} response is not an epoch second: ${String(raw).slice(0, 40)}` };
    return { value: rendered };
  };
  // AGT-617: the 5h pair is OPTIONAL -- absent reads null, present but malformed still refuses.
  const absent = (bag, name) => bag[name] === undefined || bag[name] === null || bag[name] === "";
  const week = pct(general, RATE_LIMIT_HEADERS.week, "general-model");
  if (week.error) return week;
  const fableWeek = pct(fable, RATE_LIMIT_HEADERS.fable, "Fable");
  if (fableWeek.error) return fableWeek;
  const weekReset = reset(general, RATE_LIMIT_HEADERS.weekReset, "general-model");
  if (weekReset.error) return weekReset;
  const session = absent(general, RATE_LIMIT_HEADERS.session) ? { value: null } : pct(general, RATE_LIMIT_HEADERS.session, "general-model");
  if (session.error) return session;
  const sessionReset = absent(general, RATE_LIMIT_HEADERS.sessionReset) ? { value: null } : reset(general, RATE_LIMIT_HEADERS.sessionReset, "general-model");
  if (sessionReset.error) return sessionReset;
  return {
    session5hPct: session.value,
    allModelsPct: week.value,
    fablePct: fableWeek.value,
    resets: { session: sessionReset.value, week: weekReset.value },
  };
}

// ---------------------------------------------------------------------------
// The two one-token calls whose HEADERS are the reading. Made for their headers, not their answer:
// max_tokens 1, no prompt content, nothing logged -- this is not an api/ route and it bills two
// output tokens. The Fable call is a second request because only a Fable-model response carries the
// `-7d_oi-` utilization; the general call is the one that carries both reset instants.
// ---------------------------------------------------------------------------
export const HEADER_MODELS = { general: "claude-haiku-4-5-20251001", fable: "claude-fable-5-1" };
export const MESSAGES_URL = "https://api.anthropic.com/v1/messages";
export const HEADER_PROBE_TIMEOUT_MS = 20000;

function headerBag(res) {
  const h = res && res.headers;
  if (!h) return {};
  if (typeof h.forEach === "function" && typeof h.get === "function") {
    const out = {};
    h.forEach((v, k) => { out[String(k).toLowerCase()] = v; });
    return out;
  }
  return lowerKeys(h);
}

async function probeMeter(model, token, fetchImpl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEADER_PROBE_TIMEOUT_MS);
  try {
    const res = await fetchImpl(MESSAGES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "anthropic-beta": "oauth-2025-04-20",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1,
        system: "You are Claude Code, Anthropic's official CLI for Claude.",
        messages: [{ role: "user", content: "hi" }],
      }),
      signal: controller.signal,
    });
    if (!(res.status >= 200 && res.status < 300)) {
      let text = "";
      try { text = await res.text(); } catch { /* a body we cannot read is still a refusal */ }
      // AGT-310: the status and the response headers ride back with the refusal. A 429 on the
      // general probe is the plan refusing the reader itself, and its anthropic-ratelimit-unified-*
      // headers are the only facts anyone will ever have about that refusal.
      return { error: "headers-refused", detail: `${model} HTTP ${res.status}: ${String(text).slice(0, 200)}`, status: res.status, headers: headerBag(res) };
    }
    return { headers: headerBag(res) };
  } catch (e) {
    return { error: "headers-refused", detail: `${model} request failed: ${(e && e.message) || String(e)}` };
  } finally {
    clearTimeout(timer);
  }
}

export async function readViaHeaders(token, fetchImpl = fetch) {
  const general = await probeMeter(HEADER_MODELS.general, token, fetchImpl);
  // AGT-310: marked as the GENERAL probe's refusal. Only this call's 429 means the plan refused us;
  // the Fable probe's 429 is a refusal of the Fable model and must not raise a plan-limit alert.
  if (general.error) return { ...general, general: true };
  const fable = await probeMeter(HEADER_MODELS.fable, token, fetchImpl);
  if (fable.error) return fable;
  return parseRateLimitHeaders(general.headers, fable.headers);
}
// ---------------------------------------------------------------------------
// Credentials: env first, then the DPAPI file (Windows only).
// ---------------------------------------------------------------------------
function powershell(command) {
  const r = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", command], { encoding: "utf8" });
  if (r.status !== 0) throw new Error((r.stderr || r.stdout || "powershell failed").trim().split("\n")[0]);
  return r.stdout;
}

export function loadCredentials(env = process.env) {
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY) return { url: env.SUPABASE_URL, key: env.SUPABASE_SERVICE_KEY, from: "env" };
  if (process.platform !== "win32") return { error: "no-credentials", detail: "SUPABASE_URL / SUPABASE_SERVICE_KEY are not set and the DPAPI store is Windows-only" };
  if (!fs.existsSync(CRED_FILE)) return { error: "no-credentials", detail: `${CRED_FILE} does not exist -- run --store-credentials once with the two variables in the environment` };
  try {
    const out = powershell(
      `$s = (Get-Content '${CRED_FILE.replace(/'/g, "''")}' | Select-Object -First 1).Trim() | ConvertTo-SecureString; ` +
      `[Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))`);
    const j = JSON.parse(out.trim());
    if (!j.url || !j.key) return { error: "no-credentials", detail: "the DPAPI file decrypted but carries no url/key" };
    return { url: j.url, key: j.key, from: "dpapi" };
  } catch (e) {
    return { error: "no-credentials", detail: `could not decrypt ${CRED_FILE}: ${e.message}` };
  }
}

function storeCredentials() {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return fail("no-credentials", "--store-credentials needs SUPABASE_URL and SUPABASE_SERVICE_KEY in the environment");
  if (process.platform !== "win32") return fail("no-credentials", "--store-credentials is Windows-only (DPAPI)");
  fs.mkdirSync(path.dirname(CRED_FILE), { recursive: true });
  const payload = JSON.stringify({ url, key }).replace(/'/g, "''");
  powershell(
    `$sec = ConvertTo-SecureString '${payload}' -AsPlainText -Force; ` +
    `ConvertFrom-SecureString $sec | Out-File -Encoding ascii '${CRED_FILE.replace(/'/g, "''")}'`);
  const back = loadCredentials({});
  if (back.error) return fail("no-credentials", `stored, but read-back failed: ${back.detail}`);
  return finish(0, { stored: CRED_FILE, url }, `stored DPAPI credentials at ${CRED_FILE} (url ${url}; key not shown)`);
}

// ---------------------------------------------------------------------------
// Run the CLI. On Windows the npm launcher is claude.cmd, which needs a shell.
// ---------------------------------------------------------------------------
export function runCli() {
  // On Windows the npm launcher is claude.cmd; spawnSync can run a .cmd only through the shell, and
  // CLI_ARGS carries no user input, so the DEP0190 concatenation warning is not a vector here.
  const win = process.platform === "win32";
  const r = spawnSync(win ? "claude.cmd" : "claude", CLI_ARGS, {
    encoding: "utf8", shell: win, timeout: 120000,
    env: { ...process.env, MSYS_NO_PATHCONV: "1" },
  });
  return { status: r.status, stdout: r.stdout || "", stderr: r.stderr || "", error: r.error ? r.error.message : null };
}

async function insertReading(creds, parsed, viaHeaders = false) {
  const body = {
    taken_at: new Date().toISOString(),
    fable_pct: parsed.fablePct,
    all_models_pct: parsed.allModelsPct,
    session_5h_pct: parsed.session5hPct,
    // SES-388: a headers reading is a different sensor on the same meter, so the row says which one
    // took it. Nothing branches on this -- runner_should_boot() reads the newest row whatever wrote it.
    source: viaHeaders ? "meter-reader-headers" : "meter-reader",
    // slot is CHECK-constrained to morning | night | adhoc (the two John-typed slots plus the rest);
    // the row's provenance is `source`, so a scheduled read is an adhoc-slot row from the reader.
    slot: "adhoc",
    note: viaHeaders
      ? `scripts/read-usage-meter.js (SES-388) via rate-limit headers on ${os.hostname()}; week resets ${parsed.resets.week || "?"}; session resets ${parsed.resets.session || "?"}`
      : `scripts/read-usage-meter.js (SES-374) on ${os.hostname()}; week resets ${parsed.resets.week || "?"}; session resets ${parsed.resets.session || "?"}`,
  };
  const res = await fetch(`${creds.url.replace(/\/+$/, "")}/rest/v1/runner_usage_readings?select=id,taken_at,all_models_pct`, {
    method: "POST",
    headers: { apikey: creds.key, Authorization: `Bearer ${creds.key}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`PostgREST ${res.status}: ${text.slice(0, 200)}`);
  const rows = JSON.parse(text);
  return rows[0];
}

// Exit by setting process.exitCode and returning, never process.exit(): on Node 24 / Windows a hard
// exit while fetch's handles are still closing trips a libuv assertion (UV_HANDLE_CLOSING) and the
// process aborts with 127 -- which a scheduled task would record as a failure on a run that wrote.
function finish(code, obj, line) {
  if (JSON_OUT) console.log(JSON.stringify({ exitCode: code, ...obj }));
  else console.log(line);
  process.exitCode = code;
}
function fail(reason, detail) {
  if (JSON_OUT) console.log(JSON.stringify({ exitCode: 2, reason, detail }));
  else console.error(`read-usage-meter: cannot run -- ${reason}: ${detail}`);
  process.exitCode = 2;
}

// The half both readers share: print it, or write the row and print what was written. `viaHeaders`
// only decides the row's provenance -- the numbers arrive already in parseUsage's shape either way.
async function report(parsed, viaHeaders) {
  if (DRY) return finish(0, { dryRun: true, ...parsed }, `dry-run: session ${parsed.session5hPct ?? "?"}% · week all models ${parsed.allModelsPct}% · week Fable ${parsed.fablePct}% (resets ${parsed.resets.week || "?"}); nothing written`);
  const creds = loadCredentials();
  if (creds.error) return fail(creds.error, creds.detail);
  try {
    const row = await insertReading(creds, parsed, viaHeaders);
    // AGT-310: the reading is the job and the notice rides on it -- noteLimit() swallows its own
    // failures and never touches the exit code.
    await noteLimit({ allModelsPct: parsed.allModelsPct, resets: parsed.resets.week });
    return finish(0, { id: row.id, takenAt: row.taken_at, ...parsed, credentials: creds.from },
      `wrote runner_usage_readings ${row.id}: week all models ${parsed.allModelsPct}% · Fable ${parsed.fablePct}% · session ${parsed.session5hPct ?? "?"}% (credentials: ${creds.from})`);
  } catch (e) {
    return fail("insert-refused", e.message);
  }
}

// ---------------------------------------------------------------------------
// AGT-310 (v7.0.1074): the plan-limit notice. Both halves are the blocks `P` (pure) and `W` (I/O)
// of docs/harvests/AGT-310.md, where every QA number in the kickoff was produced by running them.
// ---------------------------------------------------------------------------
export const NOTICE_SOURCE = "meter-reader";
export const NO_RUN_STAMP = "meter-reader (no run)";
export const NO_RUN_STEP = "no run -- pre-boot refusal (plan limit rejected)";
export const MAX_WINDOWS = 400;

// Pure: the one decision. null = write nothing. `sinceKey` is the taken_at of the newest reading
// BELOW the warning line, so every fire of one climb or one outage builds the same fingerprint.
export function limitNotice({ schedulerOn, warnPct, allModelsPct = null, rejected = false, sinceKey, seenAtMs, resets = null, overage = null, headers = "" }) {
  if (schedulerOn !== true) return null;
  const pct = allModelsPct === null ? null : Number(allModelsPct);
  const bound = rejected === true || (pct !== null && pct >= 100);
  const warn = !bound && Number.isFinite(Number(warnPct)) && warnPct !== null && pct !== null && pct >= Number(warnPct);
  if (!bound && !warn) return null;
  const seen = formatResetInstant(Math.floor(seenAtMs / 1000)) || "?";
  const key = sinceKey || "none";
  if (warn) return {
    kind: "warn", fingerprint: `plan-limit-warn:${key}`, john_call: null,
    summary: `Claude plan week is at ${pct}% (warning line ${Number(warnPct)}%). At 100% scheduled cloud runs are refused before they start. Resets ${resets || "not reported"}.`,
    detail: `Read ${seen} by the meter reader, outside any run. Scheduler is on. Last reading under the line: ${key}. Nothing is changed or bought by this notice.`,
  };
  return {
    kind: "bound", fingerprint: `plan-limit-bound:${key}`, john_call: "money",
    summary: `Claude plan limit reached: scheduled cloud runs are being refused before they start. First seen ${seen}. Resets ${resets || "not reported"}. Extra usage (overage): ${overage || "not reported"}.`,
    detail: `Seen by the meter reader, outside any run: ${rejected ? "the plan answered HTTP 429 to the reader's own call" : `the meter read ${pct}%`}. Scheduler is on. Last reading under the warning line: ${key}. This notice changes no limit and buys nothing; buying extra usage stays yours.${headers ? ` Headers: ${headers}` : ""}`,
  };
}

// Pure: what a 429 said about itself. Only anthropic-ratelimit-unified-* headers, verbatim.
export function rejectionFacts(headers) {
  const bag = Object.entries(headers || {}).map(([k, v]) => [String(k).toLowerCase(), String(v)])
    .filter(([k]) => k.startsWith("anthropic-ratelimit-unified-")).sort();
  const over = bag.filter(([k]) => k.includes("overage")).map(([k, v]) => `${k}=${v}`).join(", ");
  const reset = bag.find(([k]) => k === "anthropic-ratelimit-unified-7d-reset");
  return {
    headers: bag.map(([k, v]) => `${k}=${v}`).join(", ").slice(0, 900),
    overage: over || null,
    resets: reset ? formatResetInstant(reset[1]) : null,
  };
}

// Pure: the scheduled windows in [fromIso, toIso) that hold no routine fire.
export function missedWindows({ fromIso, toIso, cronMinute, intervalHours, fireIsos }) {
  const H = 3600000, step = Math.max(1, Number(intervalHours) || 1) * H;
  const from = Date.parse(fromIso), to = Date.parse(toIso);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return [];
  const fires = (fireIsos || []).map((s) => Date.parse(s));
  let w = Math.floor(from / H) * H + Number(cronMinute) * 60000;
  if (w < from) w += H;
  const out = [];
  for (; w < to && out.length < MAX_WINDOWS; w += step) {
    if (!fires.some((f) => f >= w && f < w + step)) out.push(new Date(w).toISOString());
  }
  return out;
}

export function noRunRow(windowIso, fingerprint) {
  return {
    started_at: windowIso, ended_at: windowIso, heartbeat_at: windowIso,
    stamp: NO_RUN_STAMP, trigger: "scheduled", outcome: "did_not_run", last_step: NO_RUN_STEP,
    notes: `No run: the Claude plan limit refused this scheduled fire before it started. Written after the limit lifted by scripts/read-usage-meter.js (AGT-310) from john_alerts ${fingerprint}.`,
  };
}

async function rest(creds, pathAndQuery, init, fetchImpl) {
  const res = await fetchImpl(`${creds.url.replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`, {
    ...(init || {}),
    headers: { apikey: creds.key, Authorization: `Bearer ${creds.key}`, "Content-Type": "application/json", ...((init && init.headers) || {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${pathAndQuery.split("?")[0]} HTTP ${res.status}: ${String(text).slice(0, 160)}`);
  return text ? JSON.parse(text) : [];
}
const enc = encodeURIComponent;

// obs is { allModelsPct, resets } after a reading was written, or { rejected: true, headers } after
// the GENERAL probe answered 429. Throws on any refused call; the caller prints and carries on.
export async function watchLimit(creds, obs, fetchImpl = fetch, nowMs = Date.now()) {
  const [s] = await rest(creds, "runner_settings?select=scheduler_on,plan_limit_warn_pct,cron_minute,interval_hours&id=eq.1", null, fetchImpl);
  if (!s) throw new Error("runner_settings row 1 not found");
  const warnPct = Number(s.plan_limit_warn_pct);
  const [under] = await rest(creds, `runner_usage_readings?select=taken_at&all_models_pct=lt.${warnPct}&order=taken_at.desc&limit=1`, null, fetchImpl);
  const rejected = obs.rejected === true;
  const facts = rejected ? rejectionFacts(obs.headers) : { headers: "", overage: null, resets: obs.resets || null };
  const notice = limitNotice({
    schedulerOn: s.scheduler_on, warnPct, allModelsPct: rejected ? null : obs.allModelsPct, rejected,
    sinceKey: under ? under.taken_at : null, seenAtMs: nowMs, resets: facts.resets, overage: facts.overage, headers: facts.headers,
  });
  const out = { kind: notice ? notice.kind : "clear", wrote: false, noRunRows: 0 };
  if (notice) {
    const rows = await rest(creds, "john_alerts?on_conflict=fingerprint", {
      method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
      body: JSON.stringify({ source: NOTICE_SOURCE, summary: notice.summary, detail: notice.detail, fingerprint: notice.fingerprint, john_call: notice.john_call, ref_table: "runner_usage_readings" }),
    }, fetchImpl);
    out.wrote = rows.length === 1;
  }
  // The ledger is written only AFTER the limit lifts: a `scheduled` row written during the outage
  // would reset public.runner_silence()'s clock and hide the silence it exists to report.
  if (!rejected && Number(obs.allModelsPct) < warnPct) {
    const [alert] = await rest(creds, `john_alerts?select=fingerprint,created_at&source=eq.${NOTICE_SOURCE}&fingerprint=like.plan-limit-bound:*&order=created_at.desc&limit=1`, null, fetchImpl);
    if (alert) {
      const [end] = await rest(creds, `runner_usage_readings?select=taken_at&taken_at=gt.${enc(alert.created_at)}&all_models_pct=lt.${warnPct}&order=taken_at.asc&limit=1`, null, fetchImpl);
      if (end) {
        const fires = await rest(creds, `runner_cycles?select=started_at&trigger=neq.supervised&started_at=gte.${enc(alert.created_at)}&started_at=lt.${enc(end.taken_at)}&order=started_at.asc&limit=2000`, null, fetchImpl);
        const windows = missedWindows({ fromIso: alert.created_at, toIso: end.taken_at, cronMinute: s.cron_minute, intervalHours: s.interval_hours, fireIsos: fires.map((f) => f.started_at) });
        if (windows.length) {
          await rest(creds, "runner_cycles", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(windows.map((w) => noRunRow(w, alert.fingerprint))) }, fetchImpl);
          out.noRunRows = windows.length;
        }
      }
    }
  }
  return out;
}
// Best-effort by construction: the reading is the job, the notice rides on it. Nothing here may
// change the exit code, and --dry-run writes nothing.
async function noteLimit(obs) {
  if (DRY) return;
  try {
    const creds = loadCredentials();
    if (creds.error) throw new Error(`${creds.error}: ${creds.detail}`);
    const w = await watchLimit(creds, obs);
    console.error(`limit-watch: ${w.kind} wrote=${w.wrote} no-run rows=${w.noRunRows}`);
  } catch (e) {
    console.error(`limit-watch: could not check -- ${(e && e.message) || String(e)}`);
  }
}

async function main() {
  if (STORE) return storeCredentials();
  if (VIA_HEADERS) {
    const token = process.env.CLAUDE_CODE_OAUTH_TOKEN;
    if (!token) return fail("no-token", "--via-headers needs CLAUDE_CODE_OAUTH_TOKEN in the environment (mint one with `claude setup-token`); the token is never printed or stored");
    const viaHeaders = await readViaHeaders(token);
    // AGT-310: the meter reader is the only sensor that runs OUTSIDE a cycle, so it is the only
    // thing that can report a limit refusing cycles before they boot. The read still fails: exit 2.
    if (viaHeaders.status === 429 && viaHeaders.general) await noteLimit({ rejected: true, headers: viaHeaders.headers });
    if (viaHeaders.error) return fail(viaHeaders.error, viaHeaders.detail);
    return report(viaHeaders, true);
  }
  const cli = runCli();
  if (cli.error) return fail("cli-missing", `could not start the Claude Code CLI: ${cli.error}`);
  const parsed = parseUsage(cli.stdout + "\n" + cli.stderr);
  if (parsed.error) return fail(parsed.error, parsed.detail + (cli.status ? ` (CLI exit ${cli.status})` : ""));
  return report(parsed, false);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
