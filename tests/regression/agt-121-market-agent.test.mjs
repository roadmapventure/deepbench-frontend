// DeepBench v7.0.583 | tests/regression/agt-121-market-agent.test.mjs | AGT-121
//
// FEATURE: AGT-121 -- the call path for a product-lane marketing agent (first one: Nathan Laan, product
// marketing): scripts/market-agent.js reads the capability's market_records and platform rows,
// assembles the prompt through assemblePrompt() in-process (§19b), and writes a checked answer back.
//
// PARTS, matching the kickoff's Task 3:
//   (a) STATIC -- the source imports assemblePrompt from ../api/prompt/db-assembly.js and
//       renderAssembly/resolveJudgmentModel from ./agent-prompt.js; the agent's name and the personal
//       lane's table match only on `//` lines (§19d/§19e Rule #1, pattern:13). Negative controls
//       splice each into a code line and the check must fail.
//   (b) STATIC -- READ_MAP's keys are exactly the 11 live pmm-* slugs; every kind it reads is in KINDS.
//   (c) STATIC -- validateMarketAnswer accepts a synthetic valid answer and refuses: status approved,
//       a weak lead, a feature moat at 3 months called durable, moat_found true with a temporary moat,
//       a public trade_secret, a 201-char napkin note, a missing napkin_left. A kind/title-only
//       validator accepts every one of those, so it fails this part (the discriminating check).
//   (d) LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, else NOT RUN) -- --render for pmm-why-deepbench with
//       a synthetic 2-entry Napkin file reports napkin_entries 2, > 20000 prompt bytes and the judgment
//       lane's model; --write for pmm-market-size inserts exactly 1 market_size draft, read back by
//       id, deleted after; a refused answer exits 2 and writes nothing.
//
// BASELINE (`node scripts/baseline-red-set.js --tests=tests/regression/agt-121-market-agent.test.mjs`,
// unchanged tree):
//   baseline-red-set: these paths do not exist, so no baseline was measured:
//       tests/regression/agt-121-market-agent.test.mjs
// New file: the whole file is the red set. On the unchanged tree scripts/market-agent.js is absent,
// so every static part throws.
//
// FIXTURES ARE SYNTHETIC: no Napkin text, no real person, no price.

import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCRIPT_REL = "scripts/market-agent.js";
const SCRIPT = path.join(ROOT, SCRIPT_REL);
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const RUN = randomUUID().slice(0, 8);

const PMM_SLUGS = [
  "pmm-competitors", "pmm-customer-profile", "pmm-feature-benefits", "pmm-feature-signals",
  "pmm-market-size", "pmm-messaging", "pmm-moat-and-ip", "pmm-objections", "pmm-pricing-proposals",
  "pmm-release-notes", "pmm-why-deepbench",
];

async function load() {
  return import(pathToFileURL(SCRIPT).href);
}

// ---------------------------------------------------------------------------------------------
// Part (a) -- STATIC: one assembly path; the agent name and career_records only in comments
// ---------------------------------------------------------------------------------------------
const AGENT_NAME = /\bnathan\b/;
const PERSONAL_TABLE = /career_records/;
const onlyInComments = (src, re) => src.split("\n").every(l => !re.test(l) || l.trim().startsWith("//"));

function usesTheOneAssemblyPath(src) {
  const code = src.split("\n").filter(l => !l.trim().startsWith("//")).join("\n");
  return code.includes("import { assemblePrompt } from '../api/prompt/db-assembly.js'")
    && code.includes("import { renderAssembly, resolveJudgmentModel } from './agent-prompt.js'")
    && /assemblePrompt\(\{/.test(code)
    && !/child_process/.test(code);
}

function partA() {
  const results = [];
  assert.ok(fs.existsSync(SCRIPT), `${SCRIPT_REL} does not exist`);
  const src = read(SCRIPT_REL);

  assert.ok(usesTheOneAssemblyPath(src), `${SCRIPT_REL} does not import the two assembly modules, or spawns a process`);
  results.push("both-assembly-imports");
  const dropped = src.replace("import { assemblePrompt } from '../api/prompt/db-assembly.js';\n", "");
  assert.notStrictEqual(dropped, src, "control setup failed: the assemblePrompt import line not found verbatim");
  assert.ok(!usesTheOneAssemblyPath(dropped), "control: a copy without the assemblePrompt import still passes");
  results.push("control-missing-import-fails");

  assert.ok(onlyInComments(src, AGENT_NAME), `${SCRIPT_REL} names the agent outside a // comment line`);
  results.push("agent-name-only-in-comments");
  const anchor = "const TENANT = 'global';";
  const spliceName = src.replace(anchor, `${anchor}\nconst agent = 'nathan';`);
  assert.notStrictEqual(spliceName, src, `control setup failed: \`${anchor}\` not found verbatim`);
  assert.ok(!onlyInComments(spliceName, AGENT_NAME), "control: a copy with the agent name spliced in still passes");
  results.push("control-spliced-agent-name-fails");

  assert.ok(onlyInComments(src, PERSONAL_TABLE), `${SCRIPT_REL} reaches career_records outside a // comment line`);
  results.push("career-records-only-in-comments");
  const spliceTable = src.replace(anchor, `${anchor}\nconst T = 'career_records';`);
  assert.ok(!onlyInComments(spliceTable, PERSONAL_TABLE), "control: a copy with career_records spliced in still passes");
  results.push("control-spliced-career-records-fails");
  return results;
}

// ---------------------------------------------------------------------------------------------
// Part (b) -- STATIC: the read map covers exactly the 11 capabilities, over known kinds
// ---------------------------------------------------------------------------------------------
async function partB() {
  const { READ_MAP, KINDS, PLATFORM } = await load();
  assert.strictEqual(KINDS.length, 13, `KINDS has ${KINDS.length} entries, expected 13`);
  assert.ok(!KINDS.includes("log"), "KINDS carries `log`, which market_records does not allow");
  assert.deepStrictEqual(Object.keys(READ_MAP).sort(), PMM_SLUGS, "READ_MAP keys are not exactly the 11 pmm-* slugs");
  for (const [slug, kinds] of Object.entries(READ_MAP)) {
    assert.ok(Array.isArray(kinds) && kinds.length, `READ_MAP["${slug}"] reads no kinds`);
    for (const k of kinds) assert.ok(KINDS.includes(k), `READ_MAP["${slug}"] reads unknown kind "${k}"`);
  }
  assert.deepStrictEqual(PLATFORM["pmm-moat-and-ip"], ["inventive", "catalog"], "moat-and-ip platform reads");
  assert.deepStrictEqual(PLATFORM["pmm-feature-signals"], ["shipped", "open"], "feature-signals platform reads");
  assert.deepStrictEqual(PLATFORM["pmm-market-size"], [], "market-size platform reads");
  return ["read-map-is-the-11-pmm-slugs", "read-map-kinds-all-known", "platform-map-per-kickoff"];
}

// ---------------------------------------------------------------------------------------------
// Part (c) -- STATIC: validateMarketAnswer, synthetic fixtures only
// ---------------------------------------------------------------------------------------------
const ct = (over = {}) => ({
  competitor: "Example Vendor A", why_not: "Synthetic reason the vendor does not do it today.",
  evidence: ["synthetic-source-1"], moat_type: "data", time_to_copy_months: 18, verdict: "durable", ...over,
});

function validAnswer() {
  return {
    lead: { claim: "Synthetic lead claim", proof: ["synthetic-proof"], copy_test: ct() },
    records_to_write: [{
      kind: "message", title: "Synthetic message", audience: "customer", status: "draft",
      data: { copy_tests: [ct()] },
    }],
    napkin_notes: [{ entry_id: "syn-1", note: "Used as a synthetic message." }],
    napkin_left: ["syn-2"],
  };
}

// A validator that checks only kind and title -- the shape personal-agent.js's validateAnswer has.
const KIND_TITLE_ONLY = (KINDS) => (answer) => {
  if (!Array.isArray(answer?.records_to_write)) return { error: "no records_to_write" };
  for (const i of answer.records_to_write) {
    if (!KINDS.includes(i.kind) || !i.title) return { error: "kind/title" };
  }
  return { ok: true };
};

function refusals() {
  const cases = [];
  const approved = validAnswer(); approved.records_to_write[0].status = "approved";
  cases.push(["status-approved", approved, "pmm-messaging"]);
  const weakLead = validAnswer(); weakLead.lead.copy_test = ct({ moat_type: "feature", time_to_copy_months: 3, verdict: "weak" });
  cases.push(["weak-lead", weakLead, "pmm-messaging"]);
  const featureDurable = validAnswer(); featureDurable.records_to_write[0].data.copy_tests = [ct({ moat_type: "feature", time_to_copy_months: 3, verdict: "durable" })];
  cases.push(["feature-3-durable", featureDurable, "pmm-messaging"]);
  const moat = {
    moat_found: true,
    moat: { name: "Synthetic moat", sentence: "s", proof: ["p"], copy_test: ct({ verdict: "temporary" }) },
    records_to_write: [], napkin_notes: [], napkin_left: [],
  };
  cases.push(["moat-found-temporary", moat, "pmm-moat-and-ip"]);
  const ip = {
    moat_found: false, closest_candidate: { claim: "c", copy_test: ct({ verdict: "temporary" }), to_make_durable: "t" },
    records_to_write: [{ kind: "ip_asset", title: "Synthetic asset", status: "proposed",
      data: { ip_type: "trade_secret", proof: ["synthetic-ticket"], public_today: true, flag_for_counsel: false } }],
    napkin_notes: [], napkin_left: [],
  };
  cases.push(["public-trade-secret", ip, "pmm-moat-and-ip"]);
  const longNote = validAnswer(); longNote.napkin_notes[0].note = "x".repeat(201);
  cases.push(["note-201-chars", longNote, "pmm-messaging"]);
  const noLeft = validAnswer(); delete noLeft.napkin_left;
  cases.push(["no-napkin-left", noLeft, "pmm-messaging"]);
  return cases;
}

async function partC() {
  const { validateMarketAnswer, KINDS } = await load();
  const results = [];
  const good = validateMarketAnswer(validAnswer(), "pmm-messaging");
  assert.ok(good.ok && !good.error, `validateMarketAnswer refused the synthetic valid answer: ${JSON.stringify(good)}`);
  results.push("validate-accepts-synthetic-valid");

  const naive = KIND_TITLE_ONLY(KINDS);
  let naiveAccepted = 0;
  for (const [name, answer, slug] of refusals()) {
    const r = validateMarketAnswer(answer, slug);
    assert.ok(r.error && !r.ok, `validateMarketAnswer accepted ${name}: ${JSON.stringify(r)}`);
    results.push(`validate-refuses-${name}`);
    if (naive(answer).ok) naiveAccepted += 1;
  }
  // Discrimination: a kind/title-only validator lets at least the five content refusals through.
  assert.ok(naiveAccepted >= 5, `control: a kind/title-only validator refused ${7 - naiveAccepted} of 7 -- the fixtures do not discriminate`);
  results.push("control-kind-title-only-validator-fails");

  // The correction exemption (decision 247bcab1), as a pair so it cannot widen silently.
  const slug = "pmm-why-deepbench";
  const correction = validateMarketAnswer({
    records_to_write: [{ kind: "correction", title: "Synthetic cut", status: "draft", data: { capability: slug } }],
    napkin_notes: [], napkin_left: [],
  }, slug);
  assert.ok(correction.ok && !correction.error, `a correction without copy_tests was refused for ${slug}: ${JSON.stringify(correction)}`);
  results.push("validate-accepts-correction-without-copy-tests");
  const competitor = validateMarketAnswer({
    records_to_write: [{ kind: "competitor", title: "Synthetic competitor", status: "draft", data: {} }],
    napkin_notes: [], napkin_left: [],
  }, slug);
  assert.ok(competitor.error && !competitor.ok, `a competitor without copy_tests was accepted for ${slug}: ${JSON.stringify(competitor)}`);
  results.push("validate-refuses-competitor-without-copy-tests");
  return results;
}

// ---------------------------------------------------------------------------------------------
// Part (d) -- LIVE: render numbers, the write/delete pair, a refused write
// ---------------------------------------------------------------------------------------------
function runScript(args, env) {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { cwd: ROOT, env: { ...process.env, ...env }, encoding: "utf8" });
  return { status: r.status, stdout: r.stdout || "", stderr: r.stderr || "" };
}

async function partD() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("the live arm (--render numbers, --write insert/read/delete, refused write)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent. Measured live when this shipped (2026-09-24): " +
      "--render for pmm-why-deepbench with a synthetic 2-entry Napkin reported napkin_entries 2, " +
      "43279 prompt bytes, model claude-opus-5; --write inserted exactly 1 market_size draft, read back and deleted.");
    return [];
  }
  const results = [];
  const base = url.replace(/\/+$/, "");
  const hdr = { apikey: key, Authorization: `Bearer ${key}` };
  const env = { SUPABASE_URL: url, SUPABASE_SERVICE_KEY: key };
  const getJson = async q => {
    const r = await fetch(`${base}/rest/v1/${q}`, { headers: hdr });
    if (!r.ok) assert.fail(`GET ${q.split("?")[0]} -> HTTP ${r.status} ${await r.text()}`);
    return r.json();
  };

  const { READ_MAP } = await load();
  const caps = await getJson("capabilities?slug=like.pmm-*&select=slug");
  assert.deepStrictEqual(caps.map(c => c.slug).sort(), Object.keys(READ_MAP).sort(), "READ_MAP keys differ from the live pmm-* capabilities");
  results.push("read-map-matches-live-capabilities");

  // Render with a synthetic 2-entry Napkin file.
  const napkinFile = path.join(os.tmpdir(), `agt-121-napkin-${RUN}.json`);
  fs.writeFileSync(napkinFile, JSON.stringify([
    { id: `syn-${RUN}-1`, title: "Synthetic entry one", body: "placeholder" },
    { id: `syn-${RUN}-2`, title: "Synthetic entry two", body: "placeholder" },
  ]), "utf8");
  const lanes = await getJson("runner_model_lanes?select=lane,model_id");
  const judgment = lanes.find(l => l.lane === "judgment")?.model_id;
  assert.ok(judgment, "runner_model_lanes carries no judgment row");
  const rpc = await fetch(`${base}/rest/v1/rpc/judgment_model`, { method: "POST", headers: { ...hdr, "Content-Type": "application/json" }, body: "{}" });
  const inForce = rpc.ok ? [].concat(await rpc.json())[0]?.model_id : null;
  let r;
  try {
    r = runScript(["--render", "--agent=nathan", "--capability=pmm-why-deepbench", `--napkin-file=${napkinFile}`, "--json"], env);
  } finally {
    fs.rmSync(napkinFile, { force: true });
  }
  assert.strictEqual(r.status, 0, `--render exited ${r.status}: ${r.stderr.trim()}`);
  const out = JSON.parse(r.stdout.trim());
  console.log(`  [AGT-121] render: model=${out.model} since=${out.since} records_loaded=${out.records_loaded} napkin_entries=${out.napkin_entries} prompt_bytes=${out.prompt_bytes} (judgment lane ${judgment}, in force ${inForce})`);
  assert.strictEqual(out.napkin_entries, 2, `--render reported ${out.napkin_entries} Napkin entries, expected 2`);
  assert.ok(out.prompt_bytes > 20000, `--render prompt is ${out.prompt_bytes} bytes, expected > 20000`);
  const expected = inForce && inForce !== judgment ? inForce : judgment;
  assert.strictEqual(out.model, expected, `--render printed model ${out.model}, the judgment lane runs ${expected}`);
  assert.ok(r.stderr.includes(`# model: ${out.model}`), "--render did not print `# model: <id>` on stderr");
  results.push("render-napkin-entries-bytes-and-judgment-model");

  // Write -- before-image first: this run's session tag must hold no rows.
  const session = `agt-121-regression-${RUN}`;
  const tagged = async () => getJson(`market_records?session_name=eq.${session}&select=id`);
  const before = await tagged();
  console.log(`  [AGT-121] before-image for session_name=${session}: ${JSON.stringify(before)}`);
  assert.strictEqual(before.length, 0, `control premise: rows already tagged ${session}`);

  const refusedAnswer = { records_to_write: [{ kind: "market_size", title: "x", status: "approved" }], napkin_notes: [], napkin_left: [] };
  const refused = runScript(["--write", "--agent=nathan", "--capability=pmm-market-size",
    `--answer=${JSON.stringify(refusedAnswer)}`, `--session-name=${session}`], env);
  assert.strictEqual(refused.status, 2, `--write with status approved exited ${refused.status}, expected 2`);
  assert.strictEqual((await tagged()).length, 0, "a refused --write still inserted rows");
  results.push("refused-write-exits-2-writes-nothing");

  let ids = [];
  try {
    const answer = {
      summary: "agt-121 synthetic fixture run",
      records_to_write: [{ kind: "market_size", title: "agt-121 synthetic fixture", status: "draft", audience: "internal",
        data: { segment: "synthetic segment", method: "synthetic" } }],
      napkin_notes: [], napkin_left: [],
    };
    const w = runScript(["--write", "--agent=nathan", "--capability=pmm-market-size",
      `--answer=${JSON.stringify(answer)}`, `--session-name=${session}`], env);
    assert.strictEqual(w.status, 0, `--write exited ${w.status}: ${w.stderr.trim()}`);
    const wout = JSON.parse(w.stdout.trim());
    ids = wout.ids || [];
    assert.strictEqual(wout.inserted, 1, `--write reported ${wout.inserted} rows, expected exactly 1`);
    assert.deepStrictEqual(wout.napkin_notes, [], "--write did not echo the answer's napkin_notes");
    const rows = await getJson(`market_records?id=in.(${ids.join(",")})&select=id,kind,title,status,audience,source,session_name`);
    assert.strictEqual(rows.length, 1, `read back ${rows.length} rows by id, expected 1`);
    assert.strictEqual(rows[0].kind, "market_size", "the fixture was not stored as market_size");
    assert.strictEqual(rows[0].status, "draft", "the fixture was not stored as a draft");
    assert.ok(/^pmm-market-size \d{4}-\d{2}-\d{2}$/.test(rows[0].source), `source is not '<slug> <ISO date>': ${rows[0].source}`);
    assert.strictEqual((await tagged()).length, 1, "the session tag holds other than the 1 written row");
    results.push("write-inserts-exactly-one-row");
  } finally {
    const gone = await fetch(`${base}/rest/v1/market_records?session_name=eq.${session}`, { method: "DELETE", headers: hdr });
    if (!gone.ok) console.log(`  [AGT-121] WARNING: fixture cleanup failed (HTTP ${gone.status}) -- delete session_name=${session} by hand`);
    console.log(`  [AGT-121] after-image for session_name=${session}: ${JSON.stringify(await tagged())} (deleted ids ${JSON.stringify(ids)})`);
  }
  assert.strictEqual((await tagged()).length, 0, "fixture rows survived the cleanup");
  results.push("fixture-rows-deleted");
  return results;
}

async function run() {
  const results = [];
  results.push(...partA());
  results.push(...(await partB()));
  results.push(...(await partC()));
  results.push(...(await partD()));
  return results;
}

selfRun(import.meta.url, run);
export default run;
