// DeepBench v7.0.561 | tests/regression/agt-84-personal-agent.test.mjs | AGT-84
//
// FEATURE: AGT-84 -- the call path for a personal-lane agent (first one: Jerry Maguire, the career
// agent): scripts/personal-agent.js reads the capability's career_records, assembles the prompt
// through assemblePrompt() in-process (§19b -- never hand-built, never a shelled-out --task), writes
// the sub-agent's answer back, and fetches public job postings.
//
// PARTS, matching the kickoff's Task 3:
//   (a) STATIC -- the source imports assemblePrompt from ../api/prompt/db-assembly.js and
//       renderAssembly/resolveJudgmentModel from ./agent-prompt.js; it spawns no process and passes
//       no --task; the agent name matches only on `//` lines (§19d/§19e Rule #1, pattern:13).
//       Negative controls: a copy with `agent = 'jerry'` spliced in fails the name check, and a copy
//       with a child_process import spliced in fails the one-path check.
//   (b) STATIC -- READ_MAP's keys are exactly the 11 career-* slugs; every kind it reads is in KINDS.
//   (c) STATIC -- validateAnswer refuses an unknown kind and a missing title, accepts a titled log.
//   (d) STATIC -- pickPostings over the real normalizeBoard() of Greenhouse and Lever fixtures keeps
//       "Senior Product Manager", drops "Staff Engineer", drops a stored url and a repeated one.
//   (e) LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, else NOT RUN) -- --render for the resume review
//       reports >= 30 records, > 4000 prompt bytes and the judgment lane's model; --write inserts
//       exactly 2 rows (the item + the run log), read back by id, deleted after; a refused answer
//       exits 2 and writes nothing. READ_MAP's keys equal the live career-* capabilities.
//
// BASELINE (`node scripts/baseline-red-set.js --tests=tests/regression/agt-84-personal-agent.test.mjs`,
// unchanged tree, exit 2):
//   baseline-red-set: these paths do not exist, so no baseline was measured:
//       tests/regression/agt-84-personal-agent.test.mjs
// New file: the whole file is the red set. On the unchanged tree scripts/personal-agent.js is absent,
// so every static part throws on the import.
//
// PRIVATE DATA. career_records is John's; this test prints counts and fixture ids only, never a record.

import assert from "assert";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCRIPT_REL = "scripts/personal-agent.js";
const SCRIPT = path.join(ROOT, SCRIPT_REL);
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const RUN = randomUUID().slice(0, 8);

const CAREER_SLUGS = [
  "career-cover-letter", "career-evidence-mining", "career-growth-review", "career-interview-prep",
  "career-intro-pitch", "career-market-watch", "career-match-finder", "career-outreach-plan",
  "career-posting-review", "career-resume-review", "career-strengths-gaps",
];

async function load() {
  return import(pathToFileURL(SCRIPT).href);
}

// ---------------------------------------------------------------------------------------------
// Part (a) -- STATIC: one assembly path, and the agent name only in comments
// ---------------------------------------------------------------------------------------------
const codeLines = src => src.split("\n").filter(l => !l.trim().startsWith("//"));

function nameOnlyInComments(src) {
  return src.split("\n").every(l => !/\bjerry\b/.test(l) || l.trim().startsWith("//"));
}

function usesTheOneAssemblyPath(src) {
  const code = codeLines(src).join("\n");
  return code.includes("import { assemblePrompt } from '../api/prompt/db-assembly.js'")
    && code.includes("import { renderAssembly, resolveJudgmentModel } from './agent-prompt.js'")
    && /assemblePrompt\(\{/.test(code)
    && !/child_process/.test(code)
    && !/--task\b/.test(code);
}

function partA() {
  const results = [];
  assert.ok(fs.existsSync(SCRIPT), `${SCRIPT_REL} does not exist`);
  const src = read(SCRIPT_REL);

  assert.ok(usesTheOneAssemblyPath(src),
    `${SCRIPT_REL} does not import assemblePrompt from '../api/prompt/db-assembly.js' and ` +
    `{ renderAssembly, resolveJudgmentModel } from './agent-prompt.js', or it spawns a process / passes --task`);
  results.push("one-assembly-path");

  const shelled = src.replace("import fs from 'fs';", "import fs from 'fs';\nimport { execFileSync } from 'child_process';");
  assert.notStrictEqual(shelled, src, "control setup failed: `import fs from 'fs';` not found verbatim -- fix the mutation string");
  assert.ok(!usesTheOneAssemblyPath(shelled), "control: a copy importing child_process still passes the one-path check -- it does not discriminate");
  results.push("control-shelled-out-copy-fails");

  assert.ok(nameOnlyInComments(src), `${SCRIPT_REL} names the agent outside a // comment line -- the script must be agent-agnostic`);
  results.push("agent-name-only-in-comments");

  const spliced = src.replace("const TENANT = 'global';", "const TENANT = 'global';\nconst agent = 'jerry';");
  assert.notStrictEqual(spliced, src, "control setup failed: `const TENANT = 'global';` not found verbatim -- fix the mutation string");
  assert.ok(!nameOnlyInComments(spliced), "control: a copy with agent = 'jerry' spliced in still passes -- the name check does not discriminate");
  results.push("control-spliced-agent-name-fails");
  return results;
}

// ---------------------------------------------------------------------------------------------
// Part (b) -- STATIC: the read map covers exactly the 11 capabilities, over known kinds
// ---------------------------------------------------------------------------------------------
async function partB() {
  const { READ_MAP, KINDS, REPOS } = await load();
  assert.strictEqual(KINDS.length, 11, `KINDS has ${KINDS.length} entries, expected 11`);
  assert.deepStrictEqual(Object.keys(READ_MAP).sort(), CAREER_SLUGS, "READ_MAP keys are not exactly the 11 career-* slugs");
  for (const [slug, kinds] of Object.entries(READ_MAP)) {
    assert.ok(Array.isArray(kinds) && kinds.length, `READ_MAP["${slug}"] reads no kinds`);
    for (const k of kinds) assert.ok(KINDS.includes(k), `READ_MAP["${slug}"] reads unknown kind "${k}"`);
  }
  assert.ok(READ_MAP["career-match-finder"].includes("posting"), "match-finder does not read postings");
  assert.strictEqual(REPOS.length, 6, `REPOS has ${REPOS.length} entries, expected 6`);
  return ["read-map-is-the-11-career-slugs", "read-map-kinds-all-known"];
}

// ---------------------------------------------------------------------------------------------
// Part (c) -- STATIC: validateAnswer refuses both bad shapes, accepts the good one
// ---------------------------------------------------------------------------------------------
async function partC() {
  const { validateAnswer } = await load();
  const unknownKind = validateAnswer({ records_to_write: [{ kind: "foo", title: "x" }] });
  assert.ok(unknownKind.error && !unknownKind.ok, `validateAnswer accepted an unknown kind: ${JSON.stringify(unknownKind)}`);
  const noTitle = validateAnswer({ records_to_write: [{ kind: "log" }] });
  assert.ok(noTitle.error && !noTitle.ok, `validateAnswer accepted an item with no title: ${JSON.stringify(noTitle)}`);
  const good = validateAnswer({ records_to_write: [{ kind: "log", title: "t" }] });
  assert.ok(good.ok && !good.error, `validateAnswer refused a titled log item: ${JSON.stringify(good)}`);
  const noArray = validateAnswer({ summary: "no list" });
  assert.ok(noArray.error, "validateAnswer accepted an answer with no records_to_write");
  return ["validate-refuses-unknown-kind", "validate-refuses-missing-title", "validate-accepts-titled-log"];
}

// ---------------------------------------------------------------------------------------------
// Part (d) -- STATIC: pickPostings over real Greenhouse / Lever shapes
// ---------------------------------------------------------------------------------------------
async function partD() {
  const { pickPostings, normalizeBoard } = await load();
  const gh = normalizeBoard("greenhouse", { jobs: [
    { title: "Senior Product Manager", absolute_url: "https://boards.greenhouse.io/acme/jobs/1", content: "&lt;p&gt;Own the roadmap&lt;/p&gt;" },
    { title: "Staff Engineer", absolute_url: "https://boards.greenhouse.io/acme/jobs/2", content: "" },
    { title: "Senior Product Manager", absolute_url: "https://boards.greenhouse.io/acme/jobs/1", content: "" },
  ] });
  const lv = normalizeBoard("lever", [
    { text: "Senior Product Manager", hostedUrl: "https://jobs.lever.co/beta/10", descriptionPlain: "Lead a team" },
    { text: "Staff Engineer", hostedUrl: "https://jobs.lever.co/beta/11", descriptionPlain: "" },
    { text: "Senior Product Manager, Payments", hostedUrl: "https://jobs.lever.co/beta/12", descriptionPlain: "" },
  ]);
  assert.strictEqual(gh[0].text, "Own the roadmap", `normalizeBoard(greenhouse) did not strip the HTML: "${gh[0].text}"`);
  const stored = ["https://jobs.lever.co/beta/12"];
  const kept = pickPostings([...gh, ...lv], [], stored);
  const urls = kept.map(p => p.url);
  assert.deepStrictEqual(urls, ["https://boards.greenhouse.io/acme/jobs/1", "https://jobs.lever.co/beta/10"],
    `pickPostings kept ${JSON.stringify(urls)}`);
  assert.ok(kept.every(p => p.title === "Senior Product Manager"), "a non-product title survived");
  const byTarget = pickPostings([{ title: "Head of Platform", url: "https://x/1" }], ["head of platform"], []);
  assert.strictEqual(byTarget.length, 1, "a target data.titles entry did not keep its matching posting");
  return ["postings-keep-product-titles", "postings-drop-engineer", "postings-dedupe-stored-and-repeated-url"];
}

// ---------------------------------------------------------------------------------------------
// Part (e) -- LIVE: render numbers, the write/delete pair, a refused write
// ---------------------------------------------------------------------------------------------
function runScript(args, env) {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { cwd: ROOT, env: { ...process.env, ...env }, encoding: "utf8" });
  return { status: r.status, stdout: r.stdout || "", stderr: r.stderr || "" };
}

async function partE() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("the live arm (--render numbers, --write insert/read/delete, refused write)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent. Measured live when this shipped (2026-09-23): " +
      "--render for career-resume-review --target=pe-saas loaded 34 records, 24793 prompt bytes, model claude-fable-5-1; " +
      "--write inserted exactly 2 rows, read back by id and deleted.");
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
  const caps = await getJson("capabilities?slug=like.career-*&select=slug");
  assert.deepStrictEqual(caps.map(c => c.slug).sort(), Object.keys(READ_MAP).sort(), "READ_MAP keys differ from the live career-* capabilities");
  results.push("read-map-matches-live-capabilities");

  // Render.
  const lanes = await getJson("runner_model_lanes?select=lane,model_id");
  const judgment = lanes.find(l => l.lane === "judgment")?.model_id;
  assert.ok(judgment, "runner_model_lanes carries no judgment row");
  const rpc = await fetch(`${base}/rest/v1/rpc/judgment_model`, { method: "POST", headers: { ...hdr, "Content-Type": "application/json" }, body: "{}" });
  const inForce = rpc.ok ? [].concat(await rpc.json())[0]?.model_id : null;
  const r = runScript(["--render", "--agent=jerry", "--capability=career-resume-review", "--target=pe-saas", "--json"], env);
  assert.strictEqual(r.status, 0, `--render exited ${r.status}: ${r.stderr.trim()}`);
  const out = JSON.parse(r.stdout.trim());
  console.log(`  [AGT-84] render: model=${out.model} records_loaded=${out.records_loaded} prompt_bytes=${out.prompt_bytes} (judgment lane ${judgment}, in force ${inForce})`);
  assert.ok(out.records_loaded >= 30, `--render loaded ${out.records_loaded} records, expected >= 30`);
  assert.ok(out.prompt_bytes > 4000, `--render prompt is ${out.prompt_bytes} bytes, expected > 4000`);
  // The lane's model -- or, only while the judgment lane is degraded, the model public.judgment_model() puts in force.
  const expected = inForce && inForce !== judgment ? inForce : judgment;
  assert.strictEqual(out.model, expected, `--render printed model ${out.model}, the judgment lane runs ${expected}`);
  assert.ok(r.stderr.includes(`# model: ${out.model}`), "--render did not print `# model: <id>` on stderr");
  results.push("render-loads-records-and-judgment-model");

  // Write -- before-image first: this run's session tag must hold no rows.
  const session = `agt-84-regression-${RUN}`;
  const tagged = async () => getJson(`career_records?session_name=eq.${session}&select=id`);
  const before = await tagged();
  console.log(`  [AGT-84] before-image for session_name=${session}: ${JSON.stringify(before)}`);
  assert.strictEqual(before.length, 0, `control premise: rows already tagged ${session}`);

  // A refused answer writes nothing.
  const refused = runScript(["--write", "--agent=jerry", "--capability=career-resume-review",
    `--answer=${JSON.stringify({ records_to_write: [{ kind: "foo", title: "x" }] })}`, `--session-name=${session}`], env);
  assert.strictEqual(refused.status, 2, `--write with an unknown kind exited ${refused.status}, expected 2`);
  assert.strictEqual((await tagged()).length, 0, "a refused --write still inserted rows");
  results.push("refused-write-exits-2-writes-nothing");

  let ids = [];
  try {
    const answer = { summary: "agt-84 fixture run", records_to_write: [{ kind: "log", title: "agt-84 fixture" }] };
    const w = runScript(["--write", "--agent=jerry", "--capability=career-resume-review",
      `--answer=${JSON.stringify(answer)}`, `--session-name=${session}`], env);
    assert.strictEqual(w.status, 0, `--write exited ${w.status}: ${w.stderr.trim()}`);
    const wout = JSON.parse(w.stdout.trim());
    ids = wout.ids || [];
    assert.strictEqual(wout.inserted, 2, `--write reported ${wout.inserted} rows, expected exactly 2`);
    const rows = await getJson(`career_records?id=in.(${ids.join(",")})&select=id,kind,title,data,source,session_name`);
    assert.strictEqual(rows.length, 2, `read back ${rows.length} rows by id, expected 2`);
    const item = rows.find(x => x.title === "agt-84 fixture");
    const runLog = rows.find(x => x.title === "career-resume-review ran");
    assert.ok(item && item.kind === "log", "the fixture item was not stored as a log row");
    assert.ok(runLog && runLog.kind === "log", "the run log row is missing");
    assert.deepStrictEqual(runLog.data, { summary: "agt-84 fixture run" }, `the run log's data is not the answer's non-array fields: ${JSON.stringify(runLog.data)}`);
    assert.ok(rows.every(x => /^career-resume-review \d{4}-\d{2}-\d{2}$/.test(x.source)), "source is not '<slug> <ISO date>'");
    assert.strictEqual((await tagged()).length, 2, "the session tag holds other than the 2 written rows");
    results.push("write-inserts-exactly-two-rows");
  } finally {
    const gone = await fetch(`${base}/rest/v1/career_records?session_name=eq.${session}`, { method: "DELETE", headers: hdr });
    if (!gone.ok) console.log(`  [AGT-84] WARNING: fixture cleanup failed (HTTP ${gone.status}) -- delete session_name=${session} by hand`);
    console.log(`  [AGT-84] after-image for session_name=${session}: ${JSON.stringify(await tagged())} (deleted ids ${JSON.stringify(ids)})`);
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
  results.push(...(await partE()));
  return results;
}

selfRun(import.meta.url, run);
export default run;
