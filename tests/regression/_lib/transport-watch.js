// DeepBench v7.0.657 | tests/regression/_lib/transport-watch.js | AGT-116 -- transport is not a
// verdict. One fetch watcher tells the suite that a test's database call never got an answer, so a
// test that threw during an outage is reported NOT RUN (exit 2) instead of FAIL.
//
// THE DEFECT, measured on an unchanged tree: two back-to-back credentialed runs of run-all.js gave
// 296/320 and then 295/320. The difference was the live world (a slow or unreachable database), not
// the code under test -- and a FAIL list that changes between two runs of one commit cannot grade a
// change (pattern:162: a check grades the change, never the live world).
//
// WHY A WATCHER AND NOT STRING MATCHING on the failure message: a message is the test author's prose
// and can contain anything -- LOG-132's own message carries the word "57014" whatever happened. The
// watcher observes the actual network call, so the classification is a fact about the call.
//
// ORIGIN-SCOPED, and that is load-bearing: an incident is ONLY a call to the database origin (the
// origin of SUPABASE_URL, read at call time). A test that deliberately fetches a dead port as its own
// control (`http://127.0.0.1:1`) or a foreign host is grading its own behaviour, never an outage.
//
// NARROW ON PURPOSE. A 500 without one of the transport body codes is a real server error the change
// may have caused, so it stays a FAIL -- otherwise this watcher launders failures. A TypeError with no
// transport code anywhere on its cause chain is a bug, not an outage.
//
// CHILD PROCESSES. The module self-installs on import when DEEPBENCH_TRANSPORT_LOG is set, so
// `NODE_OPTIONS=--import=<this file's URL>` covers every node child a test spawns. Every process
// appends to the same log file, one JSON line per incident; a runner compares the log's size before
// and after a test to learn whether that test (or its children) saw one.

import fs from "fs";
import os from "os";
import path from "path";

export const TRANSPORT_STATUSES = [502, 503, 504];
// Read from the JSON body ONLY when the status is >= 500. PGRST002 = PostgREST could not reach the
// schema cache (database down); 57014 = statement cancelled by the server's timeout.
export const TRANSPORT_BODY_CODES = ["PGRST002", "57014"];
export const TRANSPORT_ERROR_CODES = [
  "ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EAI_AGAIN", "ENOTFOUND",
  "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_HEADERS_TIMEOUT", "UND_ERR_SOCKET",
];

export const LOG_ENV = "DEEPBENCH_TRANSPORT_LOG";
const WATCHED = Symbol.for("deepbench.agt116.transportWatch");

function originOf(u) {
  try { return new URL(String(u)).origin; } catch { return null; }
}

function pathOf(u) {
  try { return new URL(String(u)).pathname; } catch { return String(u); }
}

// The transport code on an error or anywhere on its `.cause` chain, else null.
function transportCodeOf(error) {
  const seen = new Set();
  for (let e = error; e && typeof e === "object" && !seen.has(e); e = e.cause) {
    seen.add(e);
    if (e.name === "TimeoutError") return "TimeoutError";
    if (typeof e.code === "string" && TRANSPORT_ERROR_CODES.includes(e.code)) return e.code;
  }
  return null;
}

// Pure. A one-line incident string, or null. `dbOrigin` is the SUPABASE_URL (or its origin).
export function incidentOf({ url, status, bodyCode, error } = {}, dbOrigin) {
  const want = originOf(dbOrigin);
  const got = originOf(url);
  if (!want || !got || want !== got) return null;
  const where = pathOf(url);
  if (error) {
    const code = transportCodeOf(error);
    return code ? `${code} on ${where}` : null;
  }
  if (TRANSPORT_STATUSES.includes(status)) return `HTTP ${status} on ${where}`;
  if (status >= 500 && TRANSPORT_BODY_CODES.includes(String(bodyCode))) return `HTTP ${status} ${bodyCode} on ${where}`;
  return null;
}

function record(incident) {
  const file = process.env[LOG_ENV];
  if (!file) return;
  try {
    fs.appendFileSync(file, JSON.stringify({ pid: process.pid, incident }) + "\n");
  } catch { /* best effort: a watcher that cannot write must never break the test it watches */ }
}

function urlOfInput(input) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input && input.url ? input.url : String(input);
}

// Wraps globalThis.fetch once. Idempotent: a second call is a no-op.
export function installTransportWatch() {
  const original = globalThis.fetch;
  if (typeof original !== "function" || original[WATCHED]) return;
  const watched = async function (input, init) {
    const url = urlOfInput(input);
    const dbOrigin = process.env.SUPABASE_URL;
    let res;
    try {
      res = await original(input, init);
    } catch (error) {
      const inc = incidentOf({ url, error }, dbOrigin);
      if (inc) record(inc);
      throw error;
    }
    if (res && res.status >= 500 && originOf(url) && originOf(url) === originOf(dbOrigin)) {
      let bodyCode = null;
      if (!TRANSPORT_STATUSES.includes(res.status)) {
        try { const j = await res.clone().json(); bodyCode = j && j.code != null ? String(j.code) : null; } catch { /* not JSON */ }
      }
      const inc = incidentOf({ url, status: res.status, bodyCode }, dbOrigin);
      if (inc) record(inc);
    }
    return res;
  };
  watched[WATCHED] = true;
  globalThis.fetch = watched;
}

export function logSize(file = process.env[LOG_ENV]) {
  try { return fs.statSync(file).size; } catch { return 0; }
}

// The incident strings appended to the log since `byteOffset`.
export function incidentsSince(byteOffset = 0, file = process.env[LOG_ENV]) {
  if (!file) return [];
  let buf;
  try { buf = fs.readFileSync(file); } catch { return []; }
  return buf.subarray(byteOffset).toString("utf8").split("\n").filter(Boolean).map(l => {
    try { return JSON.parse(l).incident || l; } catch { return l; }
  });
}

// Sets up a log for this process and its node children, once. Returns { file, created }.
// Used by run-all.js at the top of main() and by selfRun() on a direct run.
export function ensureTransportWatch() {
  let created = false;
  if (!process.env[LOG_ENV]) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agt116-transport-"));
    const file = path.join(dir, "incidents.jsonl");
    fs.writeFileSync(file, "");
    process.env[LOG_ENV] = file;
    created = true;
  }
  const flag = `--import=${import.meta.url}`;
  const current = process.env.NODE_OPTIONS || "";
  if (!current.includes("transport-watch.js")) {
    process.env.NODE_OPTIONS = current ? `${current} ${flag}` : flag;
  }
  installTransportWatch();
  return { file: process.env[LOG_ENV], created };
}

export function removeTransportLog(file) {
  try { fs.rmSync(path.dirname(file), { recursive: true, force: true }); } catch { /* best effort */ }
}

if (process.env[LOG_ENV]) installTransportWatch();
