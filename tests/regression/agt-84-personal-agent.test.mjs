// DeepBench v7.0.697 | tests/regression/agt-84-personal-agent.test.mjs | AGT-84, extended by AGT-154
// and AGT-106
//
// AGT-106 extends the same three parts rather than opening a parallel file (pattern:17), because the
// change is four READ_MAP values and three KIND_FILTERS entries in the script these parts already
// pin: (b) gains the four judgment capabilities' kinds, (f) gains the REVIEWED_POSTINGS mirror with
// match-finder as its control, and (e) gains the one arm that is actual proof -- a LIVE render whose
// prompt carries a market_requirement record and a reviewed posting record BY ID and carries no raw
// intake card. The shape assertions in (b) and (f) cannot show that the shelf stopped being empty;
// only the render can (pattern:73, pattern:129).
//
// DeepBench v7.0.686 | tests/regression/agt-84-personal-agent.test.mjs | AGT-84, extended by AGT-154
//
// AGT-154 adds the twelfth capability (career-linkedin-alerts) and four seams to the same script, so
// its proofs land here rather than in a parallel file (pattern:17): the 12th READ_MAP key is exactly
// what turns part (b) red, and a red a feature itself causes is fixed inside that feature
// (pattern:124). New parts (f)-(i) and four live assertions are marked AGT-154 below.
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
//       AGT-106: strengths-gaps, posting-review, match-finder and growth-review each read
//       market_requirement and posting, and growth-review also reads evidence and resume_fact.
//   (c) STATIC -- validateAnswer refuses an unknown kind and a missing title, accepts a titled log.
//   (d) STATIC -- pickPostings over the real normalizeBoard() of Greenhouse and Lever fixtures keeps
//       "Senior Product Manager", drops "Staff Engineer", drops a stored url and a repeated one.
//   (f) STATIC (AGT-154) -- KIND_FILTERS is keyed by CAPABILITY: match-finder's posting filter drops
//       a reviewed row and keeps a new one, and the alert slug has NO entry, so alert review sees
//       every posting (its reposting and already-applied rules read the old ones). AGT-106: the
//       three reviewed-posting readers hold the mirror predicate -- status:new out, "read" and a
//       missing status in -- with match-finder's answer on the same row as the control.
//   (g) STATIC (AGT-154) -- loadInput() reads the file by its SHAPE: a JSON file carrying a `cards`
//       array becomes {intake, input:null}; a text file becomes {input, intake:null}. Control: JSON
//       with no `cards` array stays raw text.
//   (h) STATIC (AGT-154) -- validateAnswer refuses a titled `posting` whose data.url carries a
//       tracking form, and one whose linkedin_job_id and url disagree; it accepts the canonical
//       pair. Control: the same items with the url corrected are accepted, so the refusals are not
//       firing on the title or the kind.
//   (i) STATIC (AGT-154) -- the seed file carries the capability, the three new jm- slugs, both
//       verdict/act enum strings, two inline Knowledge rows and the seven appended must_not rules,
//       and names no agent id but jerry. Controls: a spliced agent id is caught, and dropping one
//       must_not string is caught.
//   (e) LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, else NOT RUN) -- --render for the resume review
//       reports >= 30 records, > 4000 prompt bytes and the judgment lane's model; --write inserts
//       exactly 2 rows (the item + the run log), read back by id, deleted after; a refused answer
//       exits 2 and writes nothing. READ_MAP's keys equal the live career-* capabilities.
//       AGT-106: a strengths-gaps render over --target=pe-saas loads strictly more records than the
//       resume review beside it (both read PROFILE; before this ticket strengths-gaps loaded FEWER)
//       and its prompt carries a real market_requirement id and a real reviewed posting id, while
//       the raw status:new intake card's id is absent.
//   (j) LIVE (AGT-268) -- postingOrigin() splits by `source`: `fetch-postings <date>` is `fetched`,
//       `career-<slug> <date>` is `write-back`. Then the pinning arm: a match-finder render, one
//       real write-back posting written through --write carrying BOTH data.text and status:'new'
//       (so it enters match-finder's own filter and would raise any text-based or unfiltered
//       count), a second render, and the assertion that posting_coverage.fetched is UNCHANGED
//       while write_backs rose by exactly 1. Control premise: fetched >= 1 before, so an all-zero
//       implementation cannot pass vacuously. Before-image and tagged cleanup around the write.
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
import os from "os";
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

// Sorted, and twelve since AGT-154 added career-linkedin-alerts.
const CAREER_SLUGS = [
  "career-cover-letter", "career-evidence-mining", "career-growth-review", "career-interview-prep",
  "career-intro-pitch", "career-linkedin-alerts", "career-market-watch", "career-match-finder",
  "career-outreach-plan", "career-posting-review", "career-resume-review", "career-strengths-gaps",
];
const ALERTS = "career-linkedin-alerts";
// AGT-106: the four capabilities whose Intents grade against market requirements and postings, and
// the three of them that want the reviewed rows rather than the raw intake cards (match-finder keeps
// its own new-only filter, which is this list's control in part (f)).
const JUDGMENT_SLUGS = [
  "career-strengths-gaps", "career-posting-review", "career-match-finder", "career-growth-review",
];
const REVIEWED_POSTING_READERS = ["career-strengths-gaps", "career-posting-review", "career-growth-review"];
const SEED_REL = "docs/design/agt-154-linkedin-alerts-seed.sql";
// The seven strings AGT-154 appends to jm-guardrails.must_not, in order (harvest AGT-154 section 3d).
const APPENDED_MUST_NOT = [
  "apply to, message or contact anyone",
  "click an email link - rebuild the job URL from the id",
  "log into LinkedIn or any job site",
  "change the mailbox (flag, move, delete, reply)",
  "share personal data outside career_records",
  "spend money",
  "estimate pay - stated pay only",
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
  assert.strictEqual(CAREER_SLUGS.length, 12, `CAREER_SLUGS has ${CAREER_SLUGS.length} entries, expected 12`);
  assert.deepStrictEqual(Object.keys(READ_MAP).sort(), CAREER_SLUGS, "READ_MAP keys are not exactly the 12 career-* slugs");
  for (const [slug, kinds] of Object.entries(READ_MAP)) {
    assert.ok(Array.isArray(kinds) && kinds.length, `READ_MAP["${slug}"] reads no kinds`);
    for (const k of kinds) assert.ok(KINDS.includes(k), `READ_MAP["${slug}"] reads unknown kind "${k}"`);
  }
  assert.ok(READ_MAP["career-match-finder"].includes("posting"), "match-finder does not read postings");
  // AGT-106: the four judgment capabilities read what their Intents grade against. Before this
  // ticket strengths-gaps and posting-review read PROFILE alone, match-finder had no
  // market_requirement, and growth-review read four kinds -- so every WORTH and gap clause in those
  // Intents was graded over records that were never loaded (finding b115bc51: sample_size 0).
  for (const slug of JUDGMENT_SLUGS) {
    for (const k of ["market_requirement", "posting"]) {
      assert.ok(READ_MAP[slug].includes(k),
        `READ_MAP["${slug}"] does not read ${k} -- it is ${JSON.stringify(READ_MAP[slug])}`);
    }
  }
  for (const k of ["evidence", "resume_fact"]) {
    assert.ok(READ_MAP["career-growth-review"].includes(k),
      `READ_MAP["career-growth-review"] does not read ${k} -- its must rule cannot grade a rung ` +
      `without an evidence record to cite (finding b115bc51)`);
  }
  // AGT-154: alert review reads the history its rules need -- postings (reposting, already-applied)
  // and log rows (already-applied stated in words) -- plus the profile it scores fit against.
  assert.deepStrictEqual(READ_MAP[ALERTS],
    ["resume_fact", "target", "ladder_rung", "evidence", "network_contact", "posting", "log"],
    `READ_MAP["${ALERTS}"] is ${JSON.stringify(READ_MAP[ALERTS])}`);
  assert.strictEqual(REPOS.length, 6, `REPOS has ${REPOS.length} entries, expected 6`);
  return ["read-map-is-the-12-career-slugs", "read-map-kinds-all-known", "alerts-reads-postings-and-log",
          "four-judgment-caps-read-market-requirement-and-posting", "growth-review-reads-evidence-and-resume-fact"];
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
// Part (f) -- STATIC (AGT-154): KIND_FILTERS is keyed by capability, not by kind
// ---------------------------------------------------------------------------------------------
async function partF() {
  const { KIND_FILTERS } = await load();
  const mf = KIND_FILTERS["career-match-finder"];
  assert.ok(mf && typeof mf.posting === "function", "KIND_FILTERS has no career-match-finder.posting filter");
  assert.strictEqual(mf.posting({ data: { status: "reviewed" } }), false, "match-finder kept a reviewed posting");
  assert.strictEqual(mf.posting({ data: { status: "new" } }), true, "match-finder dropped a new posting");
  // The point of re-keying: the filter is match-finder's alone. An entry here would silently hide
  // the reposting history and the already-applied rows the alert review's rules are counted over.
  assert.strictEqual(KIND_FILTERS[ALERTS], undefined,
    `KIND_FILTERS["${ALERTS}"] exists -- alert review must see every posting row`);
  assert.ok(!Object.prototype.hasOwnProperty.call(KIND_FILTERS, "posting"),
    "KIND_FILTERS still carries a top-level `posting` key -- it is keyed by kind, not by capability");

  // AGT-106: the three readers whose Intents select postings "that carry pay" or "past their
  // verdict" hold the MIRROR of match-finder's predicate on the same per-capability seam. The two
  // rows that discriminate are the ones the two predicates disagree on: a raw status:new intake card
  // (no pay, no verdict) is dropped, a reviewed row is kept, and a row with NO status is kept --
  // status:new is written by construction, so absence is not newness.
  for (const slug of REVIEWED_POSTING_READERS) {
    const f = KIND_FILTERS[slug];
    assert.ok(f && typeof f.posting === "function", `KIND_FILTERS has no ${slug}.posting filter`);
    assert.strictEqual(f.posting({ data: { status: "new" } }), false, `${slug} kept a raw status:new intake card`);
    assert.strictEqual(f.posting({ data: { status: "read" } }), true, `${slug} dropped a reviewed (status:read) posting`);
    assert.strictEqual(f.posting({ data: {} }), true, `${slug} dropped a posting carrying no status at all`);
    // Control: match-finder's own filter answers the OPPOSITE on the same row, so these are
    // genuinely complementary predicates and not one shared function reached twice.
    assert.strictEqual(mf.posting({ data: { status: "new" } }), !f.posting({ data: { status: "new" } }),
      `match-finder and ${slug} agree on a status:new posting -- the mirror is not in force`);
    assert.strictEqual(mf.posting({ data: { status: "read" } }), !f.posting({ data: { status: "read" } }),
      `match-finder and ${slug} agree on a reviewed posting -- the mirror is not in force`);
  }
  return ["kind-filters-keyed-by-capability", "match-finder-filter-unchanged", "alerts-has-no-filter",
          "reviewed-postings-filter-for-three-readers"];
}

// ---------------------------------------------------------------------------------------------
// Part (g) -- STATIC (AGT-154): loadInput reads the file by its shape
// ---------------------------------------------------------------------------------------------
const FIXTURE_JOB_ID = "4000000009";
const FIXTURE_INTAKE = {
  cards: [{ job_id: FIXTURE_JOB_ID, url: `https://www.linkedin.com/jobs/view/${FIXTURE_JOB_ID}/`, title: "Senior Product Manager" }],
};

function writeTmp(name, body) {
  const file = path.join(os.tmpdir(), `agt-154-${RUN}-${name}`);
  fs.writeFileSync(file, body, "utf8");
  return file;
}

async function partG() {
  const { loadInput } = await load();
  assert.strictEqual(typeof loadInput, "function", "loadInput is not exported from the script");

  const jsonFile = writeTmp("intake.json", JSON.stringify(FIXTURE_INTAKE));
  const asIntake = loadInput(jsonFile);
  assert.strictEqual(asIntake.input, null, `an intake file left input set: ${JSON.stringify(asIntake.input)}`);
  assert.ok(asIntake.intake && Array.isArray(asIntake.intake.cards), "an intake file did not parse into intake.cards");
  assert.strictEqual(asIntake.intake.cards.length, 1, `intake.cards.length is ${asIntake.intake.cards.length}, expected 1`);
  assert.strictEqual(asIntake.intake.cards[0].job_id, FIXTURE_JOB_ID, "the card's job_id did not survive the parse");

  const textFile = writeTmp("pasted.txt", "Senior Product Manager at Acme -- pasted by hand, not JSON.");
  const asText = loadInput(textFile);
  assert.strictEqual(asText.intake, null, `a text file produced an intake: ${JSON.stringify(asText.intake)}`);
  assert.ok(typeof asText.input === "string" && asText.input.includes("pasted by hand"), "a text file lost its raw text");

  // Control: it is the `cards` array that decides, not "the file happens to be JSON".
  const noCards = writeTmp("nocards.json", JSON.stringify({ fetched_at: "2026-09-28", jobs: [] }));
  const asOther = loadInput(noCards);
  assert.strictEqual(asOther.intake, null, "JSON with no cards array was taken as an intake -- the shape check does not discriminate");
  assert.ok(typeof asOther.input === "string", "JSON with no cards array lost its raw text");
  for (const f of [jsonFile, textFile, noCards]) fs.rmSync(f, { force: true });
  return ["loadinput-parses-an-intake", "loadinput-keeps-text-raw", "control-json-without-cards-stays-text"];
}

// ---------------------------------------------------------------------------------------------
// Part (h) -- STATIC (AGT-154): no tracking url, and a posting's id and url must agree
// ---------------------------------------------------------------------------------------------
const posting = data => ({ records_to_write: [{ kind: "posting", title: "Senior Product Manager", data }] });

async function partH() {
  const { validateAnswer } = await load();

  const tracked = validateAnswer(posting({ url: "https://www.linkedin.com/comm/jobs/view/1/?trackingId=abc" }));
  assert.ok(tracked.error && !tracked.ok, `validateAnswer accepted a tracking url: ${JSON.stringify(tracked)}`);

  const mismatch = validateAnswer(posting({ linkedin_job_id: "1", url: "https://example.com/" }));
  assert.ok(mismatch.error && !mismatch.ok, `validateAnswer accepted a posting whose url is not its job id's: ${JSON.stringify(mismatch)}`);
  assert.ok(/linkedin_job_id/.test(mismatch.error), `the refusal does not name the mismatch: ${mismatch.error}`);

  const good = validateAnswer(posting({ linkedin_job_id: "1", url: "https://www.linkedin.com/jobs/view/1/" }));
  assert.ok(good.ok && !good.error, `validateAnswer refused the canonical id/url pair: ${JSON.stringify(good)}`);

  // Controls: the refusals fire on the URL, not on the kind or the title. The same titled posting
  // with the url corrected is accepted, and a non-posting kind carrying a tracking url is still
  // refused -- the tracking rule is not scoped to postings.
  const otherKind = validateAnswer({ records_to_write: [{ kind: "log", title: "ran", data: { url: "https://x.test/?otpToken=zz" } }] });
  assert.ok(otherKind.error, "a tracking url on a non-posting kind was accepted -- the rule is scoped too narrowly");
  const idNoUrlCheckNeeded = validateAnswer({ records_to_write: [{ kind: "posting", title: "p", data: { company: "Acme" } }] });
  assert.ok(idNoUrlCheckNeeded.ok, `a posting with no url at all was refused: ${JSON.stringify(idNoUrlCheckNeeded)}`);
  return ["refuses-tracking-url", "refuses-id-url-mismatch", "accepts-canonical-pair", "control-tracking-rule-not-posting-only"];
}

// ---------------------------------------------------------------------------------------------
// Part (i) -- STATIC (AGT-154): the seed carries what was designed, and names no other agent
// ---------------------------------------------------------------------------------------------
const escapeRe = t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function seedNamesAgents(seed, ids) {
  // The Skill text is what reaches the database; the file's own -- comments are not a Skill row.
  const body = seed.split("\n").filter(l => !l.trim().startsWith("--")).join("\n");
  return ids.filter(id => id && id.toLowerCase() !== "jerry" && new RegExp("\\b" + escapeRe(id) + "\\b", "i").test(body));
}

async function liveAgentIds() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/agents?select=id`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) assert.fail(`agents?select=id failed: HTTP ${res.status} ${await res.text()}`);
  return (await res.json()).map(r => r.id);
}

async function partI() {
  const results = [];
  assert.ok(fs.existsSync(path.join(ROOT, SEED_REL)), `${SEED_REL} does not exist`);
  const seed = read(SEED_REL);

  for (const slug of [ALERTS, "jm-linkedin-alerts-intent", "jm-knowledge-posting-verification", "jm-knowledge-act-call"]) {
    assert.ok(seed.includes(slug), `the seed does not carry "${slug}"`);
  }
  for (const phrase of ["could not verify", "apply with prep"]) {
    assert.ok(seed.includes(phrase), `the seed does not carry the enum value "${phrase}"`);
  }
  const inline = seed.split('{"source":"inline"}').length - 1;
  assert.strictEqual(inline, 2, `the seed carries ${inline} inline Knowledge rows, expected 2 (SES-341)`);
  results.push("seed-carries-the-capability-and-three-skills", "seed-knowledge-rows-are-inline");

  // AGT-90: the claude-fable family REJECTS a stored temperature, and all 15 earlier jm- rows carry
  // NULL. The kickoff's harvest still said "temperature 0, as the jm- rows" -- true when it was
  // measured, false since v7.0.568 -- so the first apply turned agt-90 red on these three rows.
  // Pinned here so the seed file cannot drift back, with agt-90 guarding the live board.
  const fableRows = [...seed.matchAll(/'claude-fable-5-1',\s*\d+,\s*([A-Za-z0-9.]+),/g)].map(m => m[1]);
  assert.strictEqual(fableRows.length, 3, `expected 3 fable Skill rows in the seed, found ${fableRows.length}`);
  assert.deepStrictEqual(fableRows, ["NULL", "NULL", "NULL"],
    `a seeded fable row stores a temperature (AGT-90 rejects it): ${JSON.stringify(fableRows)}`);
  // Control: the matcher really reads that column -- a 0 spliced back in is caught.
  const withTemp = seed.replace("'claude-fable-5-1', 12000, NULL,", "'claude-fable-5-1', 12000, 0,");
  assert.notStrictEqual(withTemp, seed, "control setup failed: the intent row's model/token/temperature tuple moved");
  assert.ok([...withTemp.matchAll(/'claude-fable-5-1',\s*\d+,\s*([A-Za-z0-9.]+),/g)].map(m => m[1]).includes("0"),
    "control: a temperature spliced back into a fable row was not caught");
  results.push("seed-fable-rows-store-no-temperature", "control-spliced-temperature-caught");

  for (const rule of APPENDED_MUST_NOT) {
    assert.ok(seed.includes(rule), `the seed does not append the must_not rule "${rule}"`);
  }
  // The seed must APPEND, never rewrite: the update concatenates onto the stored list.
  assert.ok(/guardrails->'must_not'\)\s*\|\|/.test(seed),
    "the seed does not concatenate onto the existing must_not -- an append must not rewrite the list");
  results.push(`seed-appends-the-seven-must-not-rules (${APPENDED_MUST_NOT.length})`);

  // Control: dropping one rule is caught, so the loop above is not vacuous. The rule is removed
  // EVERYWHERE -- it appears twice on purpose (the append, and the seed's own DO-block assertion),
  // and a control that struck only one copy would be satisfied by the other and prove nothing.
  const victim = APPENDED_MUST_NOT[6];
  const dropped = seed.split(victim).join("something else");
  assert.notStrictEqual(dropped, seed, `control setup failed: "${victim}" is not in the seed verbatim`);
  assert.strictEqual(seed.split(victim).length - 1, 2,
    `"${victim}" appears ${seed.split(victim).length - 1} times in the seed, expected 2 (the append and the DO block)`);
  assert.ok(!dropped.includes(victim), "control: a dropped must_not rule was not caught");
  results.push("control-dropped-must-not-rule-caught");

  // Rule #1 over the Skill text: no agent id but jerry.
  let ids = await liveAgentIds();
  let source = "live agents?select=id";
  if (!ids) {
    const { AGENTS } = await import("../../src/data/agents.js");
    ids = AGENTS.map(a => a.id);
    source = "src/data/agents.js";
  }
  assert.ok(ids.length > 1, `too few agent ids from ${source}`);
  assert.ok(new RegExp("\\bsam\\b", "i").test("ask sam now") && !new RegExp("\\bsam\\b", "i").test("samples"),
    "word-boundary regex self-check failed");
  const named = seedNamesAgents(seed, ids);
  assert.deepStrictEqual(named, [], `the seed names another agent (Rule #1), ids from ${source}: ${named.join(", ")}`);
  const other = ids.find(id => id.toLowerCase() !== "jerry");
  const anchorText = "Hold the rule that turns a verdict and a fit into one of four calls.";
  const spliced = seed.replace(anchorText, `${anchorText} Hand it to ${other}.`);
  assert.notStrictEqual(spliced, seed, "control setup failed: the jm-knowledge-act-call objective is not in the seed verbatim");
  assert.ok(seedNamesAgents(spliced, ids).includes(other), `control: a spliced agent id "${other}" was not caught`);
  results.push(`seed-names-no-other-agent (${ids.length} ids, ${source})`, "control-spliced-agent-id-caught");
  return results;
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

  // AGT-154 LIVE: the seeded rows are actually there -- the capability wired to its Intent, the
  // seven links, the assignment, and the appended never-rules.
  const alertCap = await getJson(`capabilities?slug=eq.${ALERTS}&select=slug,default_intent_slug,execution_type,tenant_id`);
  assert.strictEqual(alertCap.length, 1, `capabilities has ${alertCap.length} rows for ${ALERTS}, expected 1`);
  assert.strictEqual(alertCap[0].default_intent_slug, "jm-linkedin-alerts-intent",
    `${ALERTS}.default_intent_slug is ${alertCap[0].default_intent_slug}`);
  const links = await getJson(`capability_skill_profiles?capability_slug=eq.${ALERTS}&select=skill_profile_slug,display_order&order=display_order.asc`);
  assert.deepStrictEqual(links.map(l => l.skill_profile_slug),
    ["jm-identity", "jm-knowledge-method", "jm-behavior", "jm-linkedin-alerts-intent",
     "jm-knowledge-posting-verification", "jm-knowledge-act-call", "jm-guardrails"],
    `${ALERTS} links are ${JSON.stringify(links.map(l => l.skill_profile_slug))}`);
  const assigned = await getJson(`agent_capability_assignments?capability_slug=eq.${ALERTS}&select=agent_id,tenant_id`);
  assert.strictEqual(assigned.length, 1, `${ALERTS} has ${assigned.length} assignments, expected 1`);
  const rails = await getJson("skill_profiles?slug=eq.jm-guardrails&select=guardrails");
  const mustNot = rails[0]?.guardrails?.must_not || [];
  // The seven are asserted by NAME; the count is reported, because the list grows by John's word and
  // a pinned total would go red on a change this ticket did not make (it already had: the kickoff
  // measured 6 on 09-25, live carried 8 on 09-28).
  for (const rule of APPENDED_MUST_NOT) {
    assert.ok(mustNot.includes(rule), `jm-guardrails.must_not is missing "${rule}"`);
  }
  assert.ok(mustNot.length >= APPENDED_MUST_NOT.length + 8,
    `jm-guardrails.must_not holds ${mustNot.length} entries -- the seven were appended to a list of at least 8`);
  console.log(`  [AGT-154] live rows: 1 capability, ${links.length} links, ${assigned.length} assignment, must_not ${mustNot.length} (7 appended)`);
  results.push("alerts-capability-links-and-guardrails-live");

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

  // AGT-106 LIVE -- the proof, not the shape. Part (b) can only show the map now NAMES the kinds;
  // what the ticket claims is that four capabilities were reading an empty shelf, and only a real
  // render shows the shelf is stocked. Three ids picked live: a pe-saas market_requirement (M), a
  // pe-saas posting past its verdict (P) and a raw status:new intake card (N). The prompt must carry
  // M and P and must NOT carry N -- the last is what proves REVIEWED_POSTINGS is in force rather
  // than the filter simply being absent.
  const oneId = async q => (await getJson(`career_records?${q}&select=id&limit=1`))[0]?.id;
  const M = await oneId("kind=eq.market_requirement&target_row=eq.pe-saas");
  const P = await oneId("kind=eq.posting&target_row=eq.pe-saas&data->>status=neq.new");
  const N = await oneId("kind=eq.posting&data->>status=eq.new");
  if (!M || !P || !N) {
    notRun("the AGT-106 live arm (strengths-gaps carries requirements and reviewed postings)",
      `career_records has nothing to discriminate with: pe-saas market_requirement ${M}, reviewed ` +
      `pe-saas posting ${P}, raw status:new posting ${N}. Measured 2026-09-28: 132 / 162 / 148 rows, ` +
      `and the render carried M and P and not N (strengths-gaps --target=pe-saas 108 -> 186 records).`);
  } else {
    const sgFile = path.join(os.tmpdir(), `agt-106-${RUN}-strengths-gaps.md`);
    try {
      const sg = runScript(["--render", "--agent=jerry", "--capability=career-strengths-gaps",
        "--target=pe-saas", `--out=${sgFile}`, "--json"], env);
      assert.strictEqual(sg.status, 0, `--render for career-strengths-gaps exited ${sg.status}: ${sg.stderr.trim()}`);
      const sgOut = JSON.parse(sg.stdout.trim());
      console.log(`  [AGT-106] strengths-gaps --target=pe-saas: records_loaded=${sgOut.records_loaded} ` +
        `prompt_bytes=${sgOut.prompt_bytes} vs resume-review ${out.records_loaded} over the same target`);
      // Both read PROFILE over the same target, so resume-review is the live yardstick: strengths-gaps
      // loaded FEWER than it before this ticket (108 vs 112 on 2026-09-28) and must load strictly
      // more now. A pinned absolute count would go red every time a resume_fact row is added.
      assert.ok(sgOut.records_loaded > out.records_loaded,
        `strengths-gaps loaded ${sgOut.records_loaded} records and the resume review ${out.records_loaded} -- ` +
        `it reads two kinds more over the same target, so it cannot load fewer`);
      const sgMd = fs.readFileSync(sgFile, "utf8");
      assert.ok(sgMd.includes(M), `the strengths-gaps prompt carries no market_requirement record (${M})`);
      assert.ok(sgMd.includes(P), `the strengths-gaps prompt carries no reviewed posting record (${P})`);
      assert.ok(!sgMd.includes(N), `the strengths-gaps prompt carries the raw status:new intake card ${N} -- ` +
        `REVIEWED_POSTINGS is not filtering`);
      console.log(`  [AGT-106] prompt carries market_requirement ${M} and reviewed posting ${P}; raw card ${N} absent`);
      results.push("strengths-gaps-carries-requirements-and-priced-postings");
    } finally {
      fs.rmSync(sgFile, { force: true });
    }
  }

  // AGT-154 LIVE: the render carries the intake card and both enum vocabularies into the prompt.
  const intakeFile = writeTmp("live-intake.json", JSON.stringify(FIXTURE_INTAKE));
  const mdFile = path.join(os.tmpdir(), `agt-154-${RUN}-render.md`);
  try {
    const ar = runScript(["--render", "--agent=jerry", `--capability=${ALERTS}`,
      `--input-file=${intakeFile}`, `--out=${mdFile}`, "--json"], env);
    assert.strictEqual(ar.status, 0, `--render for ${ALERTS} exited ${ar.status}: ${ar.stderr.trim()}`);
    const aout = JSON.parse(ar.stdout.trim());
    console.log(`  [AGT-154] render: model=${aout.model} records_loaded=${aout.records_loaded} prompt_bytes=${aout.prompt_bytes}`);
    assert.ok(aout.records_loaded >= 60, `${ALERTS} loaded ${aout.records_loaded} records, expected >= 60 -- it must see every posting, not only the new ones`);
    assert.ok(aout.prompt_bytes > 4000, `${ALERTS} prompt is ${aout.prompt_bytes} bytes, expected > 4000`);
    assert.strictEqual(aout.model, expected, `${ALERTS} rendered model ${aout.model}, the judgment lane runs ${expected}`);
    const md = fs.readFileSync(mdFile, "utf8");
    for (const needle of [FIXTURE_JOB_ID, "could not verify", "apply with prep"]) {
      assert.ok(md.includes(needle), `the rendered prompt does not carry "${needle}"`);
    }
    // Discriminating: alert review counts postings match-finder's filter hides, so it loads strictly
    // more records than match-finder over the same database.
    const mf = runScript(["--render", "--agent=jerry", "--capability=career-match-finder", "--json"], env);
    assert.strictEqual(mf.status, 0, `--render for career-match-finder exited ${mf.status}: ${mf.stderr.trim()}`);
    const mfOut = JSON.parse(mf.stdout.trim());
    console.log(`  [AGT-154] match-finder still filtered: records_loaded=${mfOut.records_loaded} vs alerts ${aout.records_loaded}`);
    assert.ok(aout.records_loaded > mfOut.records_loaded,
      `alert review loaded ${aout.records_loaded} and match-finder ${mfOut.records_loaded} -- the per-capability filter is not in force`);
    results.push("alerts-render-carries-intake-and-enums", "match-finder-filter-still-narrower");
  } finally {
    for (const f of [intakeFile, mdFile]) fs.rmSync(f, { force: true });
  }

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

  // -------------------------------------------------------------------------------------------
  // (j) AGT-268 -- provenance comes from `source`, and a write-back never moves the fetched count.
  // Block-scoped so its own before/after names cannot collide with the AGT-84 write above.
  // -------------------------------------------------------------------------------------------
  {
    const { postingOrigin, postingCoverage } = await load();
    assert.strictEqual(postingOrigin({ source: "fetch-postings 2026-09-25" }), "fetched",
      "a `fetch-postings <date>` source is not read as a fetched posting");
    assert.strictEqual(postingOrigin({ source: "career-market-watch 2026-09-27" }), "write-back",
      "a `career-<slug> <date>` source is not read as a capability write-back");
    assert.deepStrictEqual(postingCoverage([]), { fetched: 0, fetched_with_text: 0, write_backs: 0 },
      "postingCoverage over no postings is not the zero triple");
    results.push("posting-origin-splits-by-source");

    const render = () => {
      const r = runScript(["--render", "--agent=jerry", "--capability=career-match-finder", "--json"], env);
      assert.strictEqual(r.status, 0, `--render for career-match-finder exited ${r.status}: ${r.stderr.trim()}`);
      return JSON.parse(r.stdout.trim());
    };

    const beforeCov = render();
    console.log(`  [AGT-268] before: ${JSON.stringify(beforeCov.posting_coverage)}`);
    // Control premise -- an implementation that counts nothing at all cannot pass this arm.
    assert.ok(beforeCov.posting_coverage && beforeCov.posting_coverage.fetched >= 1,
      `control premise: match-finder sees ${JSON.stringify(beforeCov.posting_coverage)} -- expected fetched >= 1`);

    const pSession = "agt-268-regression-" + RUN;
    const pTagged = async () => getJson(`career_records?session_name=eq.${pSession}&select=id`);
    assert.strictEqual((await pTagged()).length, 0, `control premise: rows already tagged ${pSession}`);
    try {
      // The fixture carries data.text AND status:'new', so it lands inside match-finder's own
      // filter: a text-based or unfiltered count would move `fetched`. Only a count keyed on
      // `source` leaves it alone. No data.url, so validateAnswer applies no url rule.
      const pAnswer = {
        summary: "agt-268 fixture",
        records_to_write: [{ kind: "posting", title: "AGT-268 fixture posting", data: { status: "new", text: "fixture text" } }],
      };
      const pw = runScript(["--write", "--agent=jerry", "--capability=career-match-finder",
        `--answer=${JSON.stringify(pAnswer)}`, `--session-name=${pSession}`], env);
      assert.strictEqual(pw.status, 0, `--write of the AGT-268 fixture exited ${pw.status}: ${pw.stderr.trim()}`);

      const afterCov = render();
      console.log(`  [AGT-268] after:  ${JSON.stringify(afterCov.posting_coverage)}`);
      assert.strictEqual(afterCov.posting_coverage.fetched, beforeCov.posting_coverage.fetched,
        `a capability write-back moved the fetched count from ${beforeCov.posting_coverage.fetched} to ${afterCov.posting_coverage.fetched}`);
      assert.strictEqual(afterCov.posting_coverage.write_backs, beforeCov.posting_coverage.write_backs + 1,
        `write_backs went ${beforeCov.posting_coverage.write_backs} -> ${afterCov.posting_coverage.write_backs}, expected +1`);
      results.push("write-back-does-not-move-the-fetched-count");
    } finally {
      const pGone = await fetch(`${base}/rest/v1/career_records?session_name=eq.${pSession}`, { method: "DELETE", headers: hdr });
      if (!pGone.ok) console.log(`  [AGT-268] WARNING: fixture cleanup failed (HTTP ${pGone.status}) -- delete session_name=${pSession} by hand`);
      console.log(`  [AGT-268] after-image for session_name=${pSession}: ${JSON.stringify(await pTagged())}`);
    }
    assert.strictEqual((await pTagged()).length, 0, "AGT-268 fixture rows survived the cleanup");
  }

  return results;
}

async function run() {
  const results = [];
  results.push(...partA());
  results.push(...(await partB()));
  results.push(...(await partC()));
  results.push(...(await partD()));
  results.push(...(await partF()));
  results.push(...(await partG()));
  results.push(...(await partH()));
  results.push(...(await partI()));
  results.push(...(await partE()));
  return results;
}

selfRun(import.meta.url, run);
export default run;
