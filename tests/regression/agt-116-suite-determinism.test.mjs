// DeepBench v7.0.657 | tests/regression/agt-116-suite-determinism.test.mjs | AGT-116
//
// FEATURE: AGT-116 -- THE REGRESSION SUITE GIVES THE SAME ANSWER TWICE. Measured on an unchanged
// tree: two back-to-back credentialed runs of run-all.js gave 296/320 then 295/320, differing by
// LOG-132's wall clock. A FAIL list that moves between two runs of one commit grades the live world,
// not the change (pattern:162). The fix: a failed network call to the database is a NOT RUN (exit 2),
// never a FAIL, observed by one fetch watcher (tests/regression/_lib/transport-watch.js) rather than
// by matching the failure message.
//
// NO LIVE DATABASE. A local stub HTTP server IS SUPABASE_URL for every child this test spawns, so the
// test is deterministic by construction and costs nothing.
//
//   (A) PURE -- an incidentOf() table, with the negatives that keep the watcher from laundering real
//       failures: a 500 with no transport code, a 400, a 503 from a FOREIGN origin, a code-less
//       TypeError, and the deliberate `http://127.0.0.1:1` control.
//   (B) run-all.js --dir=<tmp> over fixtures written at test time:
//       B1 {pass, 503-throw, child-503-throw} -> exit 2, zero [FAIL], and NOT A FULL RUN names both
//          503 fixtures. The child fixture proves NODE_OPTIONS carries the watcher to children.
//       B2 {pass, 503-throw, 500-throw} -> exit 1, [FAIL] for the 500 fixture ONLY.
//       B3 {foreign-origin-503-throw} -> exit 1, [FAIL]: a foreign origin is never an incident.
//   (C) the 503 fixture run directly (selfRun) -> exit 2 and `[NOT RUN]`, never `[FAIL]`.
//
// RED ON THE UNCHANGED TREE: B1's 503 fixtures print [FAIL] and run-all.js exits 1; (C) prints
// [FAIL] and exits 1.

import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import http from "http";
import { spawn } from "child_process";
import { fileURLToPath, pathToFileURL } from "url";
import { selfRun } from "./_lib/self-run.js";
import { incidentOf, TRANSPORT_STATUSES, TRANSPORT_BODY_CODES } from "./_lib/transport-watch.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RUN_ALL = path.join(HERE, "run-all.js");
const SELF_RUN_URL = pathToFileURL(path.join(HERE, "_lib", "self-run.js")).href;

function stubServer(handler) {
  return new Promise(resolve => {
    const srv = http.createServer(handler);
    srv.listen(0, "127.0.0.1", () => resolve({ srv, origin: `http://127.0.0.1:${srv.address().port}` }));
  });
}

function run(cmd, args, env) {
  return new Promise(resolve => {
    const child = spawn(cmd, args, { env, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    child.stdout.on("data", d => { out += d; });
    child.stderr.on("data", d => { out += d; });
    child.on("close", code => resolve({ code, out }));
  });
}

// The child env: the stub is the database, and NO inherited watcher -- when this test itself runs
// inside run-all.js, the parent's log and NODE_OPTIONS must not leak into the child suite.
function childEnv(dbOrigin) {
  const env = { ...process.env, SUPABASE_URL: dbOrigin, SUPABASE_SERVICE_KEY: "agt116-stub" };
  delete env.DEEPBENCH_TRANSPORT_LOG;
  delete env.NODE_OPTIONS;
  return env;
}

const fixture = body => `import { selfRun } from ${JSON.stringify(SELF_RUN_URL)};
async function run() {
${body}
}
export default run;
selfRun(import.meta.url, run);
`;

const FETCH_THROW = p => `  const r = await fetch(process.env.SUPABASE_URL + ${JSON.stringify(p)});
  if (!r.ok) throw new Error("database said " + r.status);`;

function writeFixtures(dir, names, foreignOrigin) {
  fs.mkdirSync(dir, { recursive: true });
  const bodies = {
    "a-pass.mjs": "  return;",
    "b-db-503.mjs": FETCH_THROW("/rest/v1/down"),
    "c-db-500.mjs": FETCH_THROW("/rest/v1/broken"),
    "d-child-503.mjs": `  const { spawnSync } = await import("child_process");
  const r = spawnSync(process.execPath, ["-e", ${JSON.stringify(
      "fetch(process.env.SUPABASE_URL + '/rest/v1/down').then(r => process.exit(r.ok ? 0 : 1))")}], { encoding: "utf8" });
  if (r.status !== 0) throw new Error("child exited " + r.status);`,
    "e-foreign-503.mjs": `  const r = await fetch(${JSON.stringify(`${foreignOrigin}/rest/v1/down`)});
  if (!r.ok) throw new Error("foreign host said " + r.status);`,
  };
  for (const n of names) fs.writeFileSync(path.join(dir, n), fixture(bodies[n]));
}

const lines = (out, marker) => out.split(/\r?\n/).map(l => l.trim()).filter(l => l.startsWith(marker));

async function main() {
  // --- (A) pure incidentOf() table ---------------------------------------------------------------
  const DB = "https://db.example.supabase.co";
  const at = p => `${DB}${p}`;
  const withCause = code => Object.assign(new TypeError("fetch failed"), { cause: Object.assign(new Error("x"), { code }) });
  const timeout = Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" });
  const positives = [
    ...TRANSPORT_STATUSES.map(s => [`HTTP ${s}`, { url: at("/rest/v1/t"), status: s }]),
    ...TRANSPORT_BODY_CODES.map(c => [`500 + ${c}`, { url: at("/rest/v1/t"), status: 500, bodyCode: c }]),
    ["ECONNRESET on the cause chain", { url: at("/rest/v1/t"), error: withCause("ECONNRESET") }],
    ["UND_ERR_CONNECT_TIMEOUT on the cause chain", { url: at("/rest/v1/t"), error: withCause("UND_ERR_CONNECT_TIMEOUT") }],
    ["TimeoutError", { url: at("/rest/v1/rpc/x"), error: timeout }],
  ];
  for (const [what, call] of positives) {
    const inc = incidentOf(call, DB);
    assert.ok(typeof inc === "string" && inc.length > 0 && !inc.includes("\n"), `${what} must be a one-line incident; got ${inc}`);
  }
  const negatives = [
    ["a 500 with no transport code (a real server error)", { url: at("/rest/v1/t"), status: 500, bodyCode: "XX000" }],
    ["a 500 with no body code at all", { url: at("/rest/v1/t"), status: 500 }],
    ["a 400", { url: at("/rest/v1/t"), status: 400, bodyCode: "57014" }],
    ["a 200", { url: at("/rest/v1/t"), status: 200 }],
    ["a 503 from a FOREIGN origin", { url: "https://api.other.example/rest/v1/t", status: 503 }],
    ["the deliberate 127.0.0.1:1 control", { url: "http://127.0.0.1:1/x", error: withCause("ECONNREFUSED") }],
    ["a code-less TypeError", { url: at("/rest/v1/t"), error: new TypeError("x is not a function") }],
    ["a same-host different-port 503", { url: "https://db.example.supabase.co:8443/rest/v1/t", status: 503 }],
  ];
  for (const [what, call] of negatives) {
    assert.strictEqual(incidentOf(call, DB), null, `${what} must NOT be an incident -- or the watcher launders failures`);
  }
  assert.strictEqual(incidentOf({ url: at("/x"), status: 503 }, undefined), null, "no SUPABASE_URL -> nothing is the database");

  // --- stubs -------------------------------------------------------------------------------------
  // `connection: close` on every stub response: a pooled keep-alive socket still open at
  // process.exit() is the Windows libuv abort (exit 3221226505 = 0xC0000409, measured on this
  // test's first run), which would make an exit-code assertion grade the platform, not the rule.
  const db = await stubServer((req, res) => {
    if (req.url.startsWith("/rest/v1/down")) { res.writeHead(503, { "content-type": "application/json", connection: "close" }); res.end('{"code":"PGRST002","message":"schema cache"}'); return; }
    if (req.url.startsWith("/rest/v1/broken")) { res.writeHead(500, { "content-type": "application/json", connection: "close" }); res.end('{"code":"XX000","message":"internal"}'); return; }
    res.writeHead(200, { "content-type": "application/json", connection: "close" }); res.end("[]");
  });
  const foreign = await stubServer((req, res) => { res.writeHead(503, { connection: "close" }); res.end("down"); });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agt116-"));
  const env = childEnv(db.origin);

  try {
    // --- (B1) an outage: exit 2, zero [FAIL], NOT A FULL RUN names the 503 fixtures ---------------
    const d1 = path.join(tmp, "b1");
    writeFixtures(d1, ["a-pass.mjs", "b-db-503.mjs", "d-child-503.mjs"], foreign.origin);
    const b1 = await run(process.execPath, [RUN_ALL, `--dir=${d1}`], env);
    assert.deepStrictEqual(lines(b1.out, "[FAIL]"), [],
      `B1: an outage must produce ZERO [FAIL] lines; got:\n${b1.out}`);
    assert.strictEqual(b1.code, 2, `B1: an outage must exit 2 (never 0, never 1); got ${b1.code}:\n${b1.out}`);
    const nr1 = lines(b1.out, "[NOT RUN]").join("\n");
    assert.ok(/\[NOT RUN\] b-db-503\.mjs -- transport/.test(nr1), `B1: the 503 fixture is [NOT RUN] -- transport; got:\n${b1.out}`);
    assert.ok(/\[NOT RUN\] d-child-503\.mjs -- transport/.test(nr1),
      `B1: the CHILD's 503 must reach the runner (NODE_OPTIONS carries the watcher); got:\n${b1.out}`);
    assert.ok(lines(b1.out, "[PASS]").some(l => l.includes("a-pass.mjs")), "B1: the passing fixture still passes");
    const notice = b1.out.split(/\r?\n/).find(l => l.startsWith("NOT A FULL RUN:")) || "";
    assert.ok(notice.includes("b-db-503.mjs") && notice.includes("d-child-503.mjs"),
      `B1: NOT A FULL RUN names both transport fixtures; got: ${notice}`);
    assert.ok(b1.out.includes("regression suite: 1/3 passed"), `B1: the pass count excludes the not-run tests; got:\n${b1.out}`);

    // --- (B2) a real 500 stays a FAIL beside an outage: exit 1, [FAIL] for it only ----------------
    const d2 = path.join(tmp, "b2");
    writeFixtures(d2, ["a-pass.mjs", "b-db-503.mjs", "c-db-500.mjs"], foreign.origin);
    const b2 = await run(process.execPath, [RUN_ALL, `--dir=${d2}`], env);
    assert.strictEqual(b2.code, 1, `B2: a real failure exits 1 even beside an outage; got ${b2.code}:\n${b2.out}`);
    const f2 = lines(b2.out, "[FAIL]");
    assert.ok(f2.length === 1 && f2[0].startsWith("[FAIL] c-db-500.mjs"),
      `B2: [FAIL] for the 500 fixture ONLY -- a 500 without a transport code is laundered otherwise; got:\n${b2.out}`);

    // --- (B3) a foreign-origin 503 is the test's own business: FAIL ---------------------------------
    const d3 = path.join(tmp, "b3");
    writeFixtures(d3, ["e-foreign-503.mjs"], foreign.origin);
    const b3 = await run(process.execPath, [RUN_ALL, `--dir=${d3}`], env);
    assert.strictEqual(b3.code, 1, `B3: a foreign-origin 503 is not an incident, so it exits 1; got ${b3.code}:\n${b3.out}`);
    assert.ok(lines(b3.out, "[FAIL]").some(l => l.startsWith("[FAIL] e-foreign-503.mjs")), `B3: [FAIL] for it; got:\n${b3.out}`);

    // --- (C) the 503 fixture run directly: selfRun applies the same rule --------------------------
    const c = await run(process.execPath, [path.join(d1, "b-db-503.mjs")], env);
    assert.strictEqual(c.code, 2, `C: a direct run through an outage exits 2; got ${c.code}:\n${c.out}`);
    assert.ok(/\[NOT RUN\] b-db-503\.mjs -- transport/.test(c.out) && !c.out.includes("[FAIL]"),
      `C: prints [NOT RUN] ... transport and never [FAIL]; got:\n${c.out}`);

    console.log(`[AGT-116] incidentOf ${positives.length} positives / ${negatives.length} negatives; ` +
      `run-all B1 exit ${b1.code} (0 FAIL), B2 exit ${b2.code} (FAIL c-db-500 only), B3 exit ${b3.code}; direct run exit ${c.code}`);
  } finally {
    db.srv.close();
    foreign.srv.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

export default main;
selfRun(import.meta.url, main);
