#!/usr/bin/env node
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
//   node scripts/read-usage-meter.js --store-credentials   (Windows) read SUPABASE_URL and
//         SUPABASE_SERVICE_KEY from the environment and write the DPAPI file; prints neither value
//
// Exit codes (the shape every check-* script in this repo uses):
//   0  a row was written (or --dry-run parsed cleanly)
//   2  cannot run -- the CLI is logged out ("OAuth session expired": John runs `claude auth login`),
//      the output did not parse, credentials are missing, or the insert was refused. The reason is
//      named on stderr and in --json. A reading older than 2h while this task is installed is the
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

async function insertReading(creds, parsed) {
  const body = {
    taken_at: new Date().toISOString(),
    fable_pct: parsed.fablePct,
    all_models_pct: parsed.allModelsPct,
    session_5h_pct: parsed.session5hPct,
    source: "meter-reader",
    // slot is CHECK-constrained to morning | night | adhoc (the two John-typed slots plus the rest);
    // the row's provenance is `source`, so a scheduled read is an adhoc-slot row from the reader.
    slot: "adhoc",
    note: `scripts/read-usage-meter.js (SES-374) on ${os.hostname()}; week resets ${parsed.resets.week || "?"}; session resets ${parsed.resets.session || "?"}`,
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

async function main() {
  if (STORE) return storeCredentials();
  const cli = runCli();
  if (cli.error) return fail("cli-missing", `could not start the Claude Code CLI: ${cli.error}`);
  const parsed = parseUsage(cli.stdout + "\n" + cli.stderr);
  if (parsed.error) return fail(parsed.error, parsed.detail + (cli.status ? ` (CLI exit ${cli.status})` : ""));
  if (DRY) return finish(0, { dryRun: true, ...parsed }, `dry-run: session ${parsed.session5hPct}% · week all models ${parsed.allModelsPct}% · week Fable ${parsed.fablePct}% (resets ${parsed.resets.week || "?"}); nothing written`);
  const creds = loadCredentials();
  if (creds.error) return fail(creds.error, creds.detail);
  try {
    const row = await insertReading(creds, parsed);
    return finish(0, { id: row.id, takenAt: row.taken_at, ...parsed, credentials: creds.from },
      `wrote runner_usage_readings ${row.id}: week all models ${parsed.allModelsPct}% · Fable ${parsed.fablePct}% · session ${parsed.session5hPct}% (credentials: ${creds.from})`);
  } catch (e) {
    return fail("insert-refused", e.message);
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
