// DeepBench v7.0.536 | tests/regression/ses-424d-role-patterns.test.mjs | SES-424 slice 4
// (SES-416 build item 1) -- the three governance agents are assembled with the decision criteria
// TAGGED FOR THEIR ROLE, and the rows that carry them still match what the committed md renders to.
//
// WHAT WOULD BREAK SILENTLY WITHOUT THIS FILE, which is the only reason it is permanent. The row is
// a COPY of text whose source lives in git: docs/JOHN-DECISION-PATTERNS.md. A copy in a database
// goes stale the first time the md is edited and nothing says so -- the agents keep running, keep
// citing pattern numbers, and cite a list that no longer matches the file John edits. Arm (c) is
// the byte comparison that turns that into a red. It is deliberately NOT self-healing: repairing it
// is an UPDATE over an active agent's Knowledge, which AGENT-ROW-AGREED-TICKET wants imaged under a
// ticket that names the write.
//
// ARM (b) IS THE ONE THAT COULD GO VACUOUS, and its shape is the defence. "RENDER(designer) omits a
// criterion tagged manager" is satisfied by a renderer that omits EVERYTHING, or by a mutation that
// simply broke the parse. So (b) mutates one criterion's tag on a temp copy and then asserts BOTH
// directions over that same copy: designer must lose 163 AND manager must gain it. A renderer that
// dropped the entry, or a copy the parser could no longer read, fails the second half.
//
// TEMP COPIES, NEVER THE COMMITTED MD AND NEVER THE LIVE ROW. Cycles run in parallel against one
// clone and one database; the copy carries this process's pid and is removed in a `finally`.
// Nothing here writes to Supabase -- the rows were written once, by the build, under one decision
// handle (`scripts/render-role-patterns.js --write-rows`).
//
// NO MODEL CALL AND NO SPEND. Arm (c) spawns `scripts/agent-prompt.js`, which assembles the prompt
// from the database and prints it; it calls no model. Whether the agents DECIDE better now that
// they can read their own criteria is a question for the staff watch, not for a test that would
// bill an Anthropic call on every suite run.
//
// ONE VOCABULARY (STANDARDS.md Section 13): selfRun()/notRun() from _lib/self-run.js.

import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

import {
  ROLES, ROLE_NAMES, ROW_BYTE_CAP, LINK_DISPLAY_ORDER, SKILL_TYPE_SLUG,
  render, renderSha, knowledgeRow, readDoc,
} from "../../scripts/render-role-patterns.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DOC = path.join(ROOT, "docs/JOHN-DECISION-PATTERNS.md");
const PROMPT = path.join(ROOT, "scripts/agent-prompt.js");

// The two criteria this file drives, chosen because their tags DIFFER: 163 is the builder's and the
// designer's, 167 is the manager's. A pair that both roles carried could not tell a role-aware
// render from a render that ignores the tag entirely.
const BUILD_LINE = "- pattern:163 — One change, every home, one ship.";
const MANAGER_LINE_PREFIX = "- pattern:167 — ";

// MEASURED at this ship (v7.0.536, md source v7.0.515), not chosen: 136 / 92 / 73 of 171 criteria.
// These are a PIN, and a later mining pass that retags criteria is EXPECTED to red this file --
// that red is the reminder that the three live rows must be re-rendered and re-pinned in the same
// commit, under a ticket that names the write. Update the numbers there, never to quiet a red.
const EXPECTED_COUNTS = { designer: 136, builder: 92, manager: 73 };

// The decision handle's shape, asserted rather than the handle itself: a uuid written here would
// pin this test to one cycle's ship and would have to be edited by every later re-pin.
const DECISION_TICKET = "SES-424";
const DECISION_KIND = "agent-row";
const DECISION_SUMMARY_NEEDLE = "knowledge-patterns";
const MIN_IMAGES = 6;

const hasCreds = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
const CRED_HINT =
  "set SUPABASE_URL and SUPABASE_SERVICE_KEY (runner_secrets, exported inline per " +
  "docs/runbooks/session-setup.md step 1b) and re-run the suite";

const countPatternLines = text => text.split("\n").filter(l => l.startsWith("- pattern:")).length;

export default async function run_() {
  const md = readDoc(DOC);

  // ---- (a) the render is role-aware, capped, and the measured size ----------------------------
  const rendered = {};
  for (const role of ROLE_NAMES) {
    rendered[role] = render(md, role);
  }

  assert.ok(rendered.designer.includes(BUILD_LINE),
    `RENDER(designer) must carry "${BUILD_LINE}" -- criterion 163 is tagged \`builder, designer\` ` +
    `in docs/JOHN-DECISION-PATTERNS.md, and a designer render without it is a render that dropped ` +
    `a criterion the Designer is graded by`);
  assert.ok(rendered.builder.includes(BUILD_LINE),
    `RENDER(builder) must carry "${BUILD_LINE}" -- 163 names the builder too`);
  assert.ok(!rendered.manager.includes("pattern:163"),
    `RENDER(manager) must NOT carry pattern:163 -- it is tagged \`builder, designer\`. A manager ` +
    `render that carries it is a render ignoring applies_to, which is the whole point of the tag ` +
    `(SES-415) and of this row`);
  const managerLine = rendered.manager.split("\n").find(l => l.startsWith(MANAGER_LINE_PREFIX));
  assert.ok(managerLine,
    `RENDER(manager) must carry a "${MANAGER_LINE_PREFIX}" line -- 167 is tagged \`manager\`, and ` +
    `its absence would mean the manager's own criteria are being filtered out as well`);
  assert.ok(!rendered.designer.includes("pattern:167"),
    `RENDER(designer) must NOT carry pattern:167 -- tagged \`manager\`. Asserted in BOTH directions ` +
    `on purpose: a render that returned every criterion to everyone would pass the two positive ` +
    `assertions above on their own`);

  for (const role of ROLE_NAMES) {
    const bytes = Buffer.byteLength(rendered[role], "utf8");
    assert.ok(bytes <= ROW_BYTE_CAP,
      `RENDER(${role}) is ${bytes} bytes, over the ${ROW_BYTE_CAP}-byte cap. The cap IS the ` +
      `feature (pattern:168): a Knowledge row that crowds out the rest of the prompt is a ` +
      `regression in the assembly. Tighten the role tags in the md; never raise the cap.`);
    assert.equal(countPatternLines(rendered[role]), EXPECTED_COUNTS[role],
      `RENDER(${role}) has ${countPatternLines(rendered[role])} \`- pattern:\` lines, measured ` +
      `${EXPECTED_COUNTS[role]} at v7.0.536. If a mining pass retagged the md, re-render AND ` +
      `re-pin the three live rows in that same commit (node scripts/render-role-patterns.js ` +
      `--write-rows --cycle=<uuid> --decision=<uuid>) and update this number there -- never ` +
      `update it alone, which would leave the agents reading a list this file no longer measures.`);
    assert.ok(rendered[role].split("\n")[0].startsWith(`Decision patterns tagged ${role} `),
      `RENDER(${role}) line 1 must name the role and how to cite -- it is also the row's objective`);
    assert.ok(!rendered[role].endsWith("\n"),
      `RENDER(${role}) must not end in a newline: the stored \`method\` is compared byte for byte`);
  }

  // ---- (b) the tag is what selects, driven both ways over ONE mutated copy --------------------
  const mutatedText = md.replace(
    "**163. One change, every home, one ship.**\n*Applies to:* designer, builder.",
    "**163. One change, every home, one ship.**\n*Applies to:* manager.");
  assert.notEqual(mutatedText, md,
    `criterion 163's \`*Applies to:* designer, builder.\` marker is no longer in the md in the ` +
    `form this arm mutates -- point it at another criterion rather than deleting the arm; an ` +
    `unmutated copy would make both assertions below vacuous`);
  const copy = path.join(os.tmpdir(), `ses424d-${process.pid}-patterns.md`);
  fs.writeFileSync(copy, mutatedText, "utf8");
  try {
    const mutated = readDoc(copy);
    assert.ok(!render(mutated, "designer").includes("pattern:163"),
      `with 163 retagged to \`manager\`, RENDER(designer) must lose it -- it still has it, so the ` +
      `render is not reading applies_to at all`);
    assert.ok(render(mutated, "manager").includes(BUILD_LINE),
      `CONTROL: with 163 retagged to \`manager\`, RENDER(manager) must GAIN "${BUILD_LINE}". ` +
      `Without this half, the assertion above is equally satisfied by a mutation that broke the ` +
      `parse or by a renderer that dropped the entry, and the arm would measure neither.`);
    assert.equal(countPatternLines(render(mutated, "designer")), EXPECTED_COUNTS.designer - 1,
      `exactly ONE criterion should have moved: the designer render should be ` +
      `${EXPECTED_COUNTS.designer - 1} lines against the copy`);
  } finally {
    fs.rmSync(copy, { force: true });
  }

  // ---- (c) the live rows, their links, their images, and the assembled prompts -----------------
  if (!hasCreds()) {
    notRun(`SES-424d (c): the three live ${SKILL_TYPE_SLUG} rows, their links at display_order ` +
      `${LINK_DISPLAY_ORDER}, their before-images, and the assembled prompts`,
      `no Supabase credentials -- ${CRED_HINT}`);
    return;
  }

  const url = process.env.SUPABASE_URL.replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY;
  const rest = async p => {
    const r = await fetch(`${url}/rest/v1/${p}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    if (!r.ok) assert.fail(`GET ${p} -> ${r.status} ${await r.text()}`);
    return r.json();
  };

  for (const role of ROLE_NAMES) {
    const expected = knowledgeRow(md, role);
    const rows = await rest(`skill_profiles?slug=eq.${expected.slug}&select=id,slug,skill_type_slug,objective,method,traits`);
    assert.equal(rows.length, 1,
      `expected exactly one ${expected.slug} row, got ${rows.length}. It is written by ` +
      `\`node scripts/render-role-patterns.js --write-rows --cycle=<uuid> --decision=<uuid>\`, ` +
      `which images it first -- never by hand.`);
    const row = rows[0];
    assert.equal(row.skill_type_slug, SKILL_TYPE_SLUG);
    assert.equal(row.traits && row.traits.source, "inline",
      `${expected.slug}.traits.source must be "inline" -- api/prompt/db-assembly.js only inlines a ` +
      `knowledge Skill's stored text on that trait; without it the section renders EMPTY and is ` +
      `dropped, and the agent runs with no criteria while still returning a well-formed answer. ` +
      `Invisible in every other assertion here.`);
    assert.equal(String(row.method).replace(/\r\n?/g, "\n"), expected.method,
      `${expected.slug}.method must byte-equal what ${"docs/JOHN-DECISION-PATTERNS.md"} renders ` +
      `to for ${role}. It does not, so the agent is reading a list the committed md no longer ` +
      `produces. Re-render and re-pin under a ticket that names the write (AGENT-ROW-AGREED-TICKET).`);
    assert.equal(row.traits.source_sha256, renderSha(expected.method),
      `${expected.slug}.traits.source_sha256 must be the sha of its own rendered text -- a pin that ` +
      `does not match the bytes it pins cannot detect the next drift`);
    assert.equal(row.traits.role, role);
    assert.equal(row.traits.pattern_count, EXPECTED_COUNTS[role]);
    assert.equal(row.objective, expected.method.split("\n")[0],
      `${expected.slug}.objective must be the render's first line -- the section header and its ` +
      `first line must not say different things`);

    const links = await rest(
      `capability_skill_profiles?capability_slug=eq.${ROLES[role].capability}` +
      `&skill_profile_slug=eq.${expected.slug}&select=display_order,level,is_required`);
    assert.equal(links.length, 1,
      `${expected.slug} must be linked to ${ROLES[role].capability} exactly once, got ` +
      `${links.length} -- an unlinked Knowledge row is a row the agent never reads`);
    assert.equal(links[0].display_order, LINK_DISPLAY_ORDER);
    assert.equal(links[0].is_required, true);
  }

  // The decision and its images. Matched on SHAPE (ticket, kind, summary needle, unreversed), never
  // on one cycle's uuid: a later re-pin files its own handle and must satisfy this too.
  const decisions = await rest(
    `runner_decisions?backlog_id=eq.${DECISION_TICKET}&kind=eq.${DECISION_KIND}` +
    `&select=id,summary,status,reversed_at&order=decided_at.desc`);
  const seeding = decisions.filter(d =>
    String(d.summary || "").includes(DECISION_SUMMARY_NEEDLE) && !d.reversed_at && d.status !== "reversed");
  assert.ok(seeding.length >= 1,
    `no unreversed ${DECISION_TICKET} ${DECISION_KIND} decision whose summary names ` +
    `"${DECISION_SUMMARY_NEEDLE}" -- the three rows exist with no standing handle to undo them, ` +
    `which is the state §19v's before-image regime exists to prevent`);

  const images = await rest(
    `runner_before_images?decision_id=eq.${seeding[seeding.length - 1].id}` +
    `&select=table_name,pk_value,row_data`);
  assert.ok(images.length >= MIN_IMAGES,
    `the seeding decision ${seeding[seeding.length - 1].id} holds ${images.length} before-images, ` +
    `expected at least ${MIN_IMAGES} (three rows and three links). An agent-row write with no image ` +
    `is a write that cannot be undone.`);
  const inserts = images.filter(i => i.row_data === null);
  assert.ok(inserts.length >= MIN_IMAGES,
    `at least ${MIN_IMAGES} of that decision's images must carry row_data NULL -- the SES-89 ` +
    `convention for "this row did not exist yet", so the undo of the seed is a DELETE. Got ` +
    `${inserts.length}.`);
  for (const t of ["skill_profiles", "capability_skill_profiles"]) {
    assert.ok(images.some(i => i.table_name === t),
      `the seeding decision must image ${t} -- both halves of the write are undoable or neither is`);
  }

  // The assembly itself: the row exists, is linked, and is inlined is three facts; that the
  // Designer's PROMPT contains the line and the manager's does not is the one that matters.
  const assembled = (agent, capability) => {
    const r = spawnSync(process.execPath, [PROMPT, `--agent=${agent}`, `--capability=${capability}`],
      { cwd: ROOT, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
    assert.equal(r.status, 0, `agent-prompt.js --agent=${agent} exited ${r.status}\n${r.stderr}`);
    return r.stdout || "";
  };

  const designerPrompt = assembled("designer", ROLES.designer.capability);
  assert.ok(designerPrompt.includes(BUILD_LINE),
    `the assembled Designer prompt must contain "${BUILD_LINE}". It did NOT before this ticket ` +
    `(measured 0 occurrences on the unchanged tree), which is the hole this row closes: the ` +
    `agent was graded by a library its prompt never carried.`);
  const managerPrompt = assembled("devmanager", ROLES.manager.capability);
  assert.ok(!managerPrompt.includes("pattern:163"),
    `the assembled Development Manager prompt must NOT contain pattern:163 -- it is tagged ` +
    `\`builder, designer\`. A prompt carrying every criterion is the pre-SES-415 state wearing a ` +
    `role tag, and this assertion is the only one that would catch it end to end.`);
  assert.ok(managerPrompt.includes(MANAGER_LINE_PREFIX),
    `CONTROL: the assembled Development Manager prompt must contain "${MANAGER_LINE_PREFIX}" -- ` +
    `without it the assertion above passes equally well against a prompt with NO patterns in it`);
}

selfRun(import.meta.url, run_);
