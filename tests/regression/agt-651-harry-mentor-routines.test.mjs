// DeepBench v7.0.1011 | tests/regression/agt-651-harry-mentor-routines.test.mjs | AGT-651 -- Harry's mentor routines, the two-draft blend, the proof measures, and the Library sync script
// Kickoff: docs/kickoffs/v7.0.1011-AGT-651-harry-mentor-routines-sync.md section 5, T3.
//
//   A  TESTIMONY FOLDERS -- productSnapshotText() over a fixture repo holding registers/x.md (and one file in every other
//      excluded folder) never carries their text or names, and never OPENS a path under one (every fs read and listing is
//      recorded). Control: a non-excluded folder and the architecture / patch-notes headings DO appear.
//   B  CONNECTIONS -- a fixture export with the notes preamble, 3 people at 2 companies, splits into exactly 2 sections,
//      heading = company, body lines `First Last — Position — Connected On`. Control: no header row is refused.
//   C  MANIFEST REFUSAL -- --manifest inside the repo exits 2 with the refusal before any credential is read; control: a
//      manifest outside the repo with no credentials gets past the refusal and fails on the credentials instead.
//   D  RUNBOOK -- the four routine blocks each open with the STEP 0 meter stop byte for byte (control: one character off
//      fails); the study block names no model id and no routine id (each pattern proved to fire on a violating copy); the
//      ask table, step 1c, step 6b, the proof measures and the Saturday cron are present.
//   E  LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY + LIBRARY_SYNC_MANIFEST, else notRun) -- `--dry-run --only=documents`
//      over the real manifest exits 0 and prints a summary with unchanged >= 30. The manifest path is supplied by the
//      session through LIBRARY_SYNC_MANIFEST; it never lives in this file.
//
// Pre-change on the unchanged tree: scripts/library-sync.js does not exist, so the import fails and every arm is red.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { EXCLUDED_DIRS, productSnapshotText, parseConnections, isInsideRepo } from "../../scripts/library-sync.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT = path.join(ROOT, "scripts", "library-sync.js");
const RUNBOOK = path.join(ROOT, "docs", "runbooks", "strategy-agent.md");
const lf = t => String(t).replace(/\r\n/g, "\n");

const MARKERS = {
  daily: ["<!-- HARRY-DAILY-BRIEF-PROMPT-BEGIN -->", "<!-- HARRY-DAILY-BRIEF-PROMPT-END -->"],
  weekly: ["<!-- HARRY-WEEKLY-REVIEW-PROMPT-BEGIN -->", "<!-- HARRY-WEEKLY-REVIEW-PROMPT-END -->"],
  readiness: ["<!-- HARRY-READINESS-CHECK-PROMPT-BEGIN -->", "<!-- HARRY-READINESS-CHECK-PROMPT-END -->"],
  study: ["<!-- HARRY-WEEKLY-STUDY-PROMPT-BEGIN -->", "<!-- HARRY-WEEKLY-STUDY-PROMPT-END -->"],
};

function tmpdir(tag) { return fs.mkdtempSync(path.join(os.tmpdir(), `agt651-${tag}-`)); }

function armA() {
  const repo = tmpdir("repo");
  const MARKER = ["TESTIMONY", "MARKER", "7f3a"].join("_");
  assert.deepEqual(EXCLUDED_DIRS, ["registers", "notes", "audit", "canon", "consultant", "trials", "survey", "ask_log"]);
  for (const d of EXCLUDED_DIRS) {
    fs.mkdirSync(path.join(repo, d));
    fs.writeFileSync(path.join(repo, d, d === "registers" ? "x.md" : "y.md"), `# ${MARKER} heading\n${MARKER} body\n`);
  }
  fs.mkdirSync(path.join(repo, "widgets"));
  fs.writeFileSync(path.join(repo, "DASHBOARD_ARCHITECTURE.md"), "# Arch Top\n\nbody text never copied\n## Arch Layer Two\n");
  fs.writeFileSync(path.join(repo, "PATCH_NOTES.md"), "# Patch v1.2\n- a line\n");
  fs.writeFileSync(path.join(repo, "README.md"), "# Readme heading not read\n");

  const touched = [];
  const orig = { readFileSync: fs.readFileSync, readdirSync: fs.readdirSync, statSync: fs.statSync, openSync: fs.openSync };
  for (const k of Object.keys(orig)) fs[k] = (p, ...a) => { touched.push(String(p)); return orig[k].call(fs, p, ...a); };
  let text;
  try { text = productSnapshotText(repo, { gitLog: () => ["subject one", "subject two"] }); }
  finally { Object.assign(fs, orig); }

  const under = touched.filter(p => EXCLUDED_DIRS.some(d => path.resolve(p).toLowerCase().startsWith(path.join(repo, d).toLowerCase())));
  assert.deepEqual(under, [], "the snapshot opened or listed a path under a testimony folder");
  assert.ok(!text.includes(MARKER), "testimony text reached the snapshot");
  assert.ok(!/registers|x\.md/.test(text), "registers/x.md is named in the snapshot");
  for (const d of EXCLUDED_DIRS) assert.ok(!text.includes(`- ${d}/`), `excluded folder ${d} is listed`);
  // Controls: the same reader DOES carry what it should, so the absence above is the exclusion, not an empty snapshot.
  assert.ok(text.includes("- widgets/"), "control: a non-excluded folder is listed");
  assert.ok(text.includes("- Arch Top") && text.includes("- Arch Layer Two"), "control: architecture headings are read");
  assert.ok(text.includes("- Patch v1.2"), "control: patch-notes headings are read");
  assert.ok(text.includes("- subject one"), "control: commit subjects are carried");
  assert.ok(!text.includes("body text never copied") && !text.includes("Readme heading"), "only headings of the two named files are read");
  assert.ok(touched.some(p => /DASHBOARD_ARCHITECTURE\.md$/.test(p)), "control: the recorder saw the reads it should");
  fs.rmSync(repo, { recursive: true, force: true });
  return ["A-testimony-folders-excluded", "A-control-snapshot-carries-headings"];
}

function armB() {
  const csv = [
    "Notes:",
    "\"When exporting your connection data, you may notice that some of the email addresses are missing.\"",
    "",
    "First Name,Last Name,URL,Email Address,Company,Position,Connected On",
    "Ann,Alpha,https://x/a,,Acme Corp,Buyer,01 Jan 2025",
    "Bob,Beta,https://x/b,,Acme Corp,Director,02 Feb 2025",
    "Cy,Gamma,https://x/c,,Globex,Analyst,03 Mar 2025",
    "",
  ].join("\r\n");
  const { sections } = parseConnections(csv);
  assert.equal(sections.length, 2, "3 people at 2 companies -> 2 sections");
  const acme = sections.find(([h]) => h === "Acme Corp");
  assert.ok(acme, "a section headed by the company");
  assert.deepEqual(acme[1].split("\n"), ["Ann Alpha — Buyer — 01 Jan 2025", "Bob Beta — Director — 02 Feb 2025"]);
  assert.equal(sections.find(([h]) => h === "Globex")[1], "Cy Gamma — Analyst — 03 Mar 2025");
  assert.ok(!sections.some(([h, b]) => /Notes|When exporting/.test(h + b)), "the preamble is skipped");
  assert.throws(() => parseConnections("Notes:\nno header here\n"), /no header row/, "control: an export with no header row is refused");
  return ["B-connections-two-sections", "B-control-no-header-refused"];
}

function armC() {
  const env = { ...process.env };
  delete env.SUPABASE_URL; delete env.SUPABASE_SERVICE_KEY; delete env.OPENAI_API_KEY;
  const inside = path.join(ROOT, "docs", "manifest.json");
  const r = spawnSync(process.execPath, [SCRIPT, `--manifest=${inside}`, "--dry-run"], { env, encoding: "utf8" });
  assert.equal(r.status, 2, `a manifest inside the repo exits 2 (got ${r.status}: ${r.stderr})`);
  assert.match(r.stderr, /--manifest must be outside the repository/);
  assert.equal(r.stdout.trim(), "", "nothing printed on stdout after the refusal");

  const outDir = tmpdir("manifest");
  const outside = path.join(outDir, "manifest.json");
  fs.writeFileSync(outside, "[]");
  const c = spawnSync(process.execPath, [SCRIPT, `--manifest=${outside}`, "--dry-run"], { env, encoding: "utf8" });
  assert.notEqual(c.status, 2, "control: a manifest outside the repo is not refused");
  assert.match(c.stderr, /SUPABASE_URL and SUPABASE_SERVICE_KEY must be set/, "control: it gets past the refusal to the credential check");
  fs.rmSync(outDir, { recursive: true, force: true });

  assert.ok(isInsideRepo(path.join(ROOT, "a", "b.json")) && isInsideRepo(ROOT), "isInsideRepo: inside");
  assert.ok(!isInsideRepo(path.join(path.dirname(ROOT), "elsewhere.json")), "isInsideRepo: a sibling path is outside");
  return ["C-manifest-inside-repo-refused", "C-control-outside-passes-refusal"];
}

function armD() {
  const md = lf(fs.readFileSync(RUNBOOK, "utf8"));
  const lines = md.split("\n");
  const humor = lf(fs.readFileSync(path.join(ROOT, "docs", "runbooks", "humorist-agent.md"), "utf8")).split("\n");
  const STEP0 = humor.find(l => l.startsWith("STEP 0 — WEEKLY METER STOP"));
  assert.ok(STEP0, "the humorist runbook carries the STEP 0 line");
  const blocks = {};
  for (const [name, [begin, end]] of Object.entries(MARKERS)) {
    for (const m of [begin, end]) assert.equal(lines.filter(l => l === m).length, 1, `${m} is a whole line exactly once`);
    const a = lines.indexOf(begin), b = lines.indexOf(end);
    assert.ok(a >= 0 && b > a, `${name} markers in order`);
    blocks[name] = lines.slice(a + 1, b);
  }
  assert.equal(Object.keys(blocks).length, 4, "four routine blocks");
  for (const [name, block] of Object.entries(blocks)) {
    assert.equal(block[0], STEP0, `${name} block opens with the STEP 0 meter stop, byte for byte`);
    assert.notEqual(STEP0.replace("2026-10-17", "2026-10-18"), block[0], `control: a ${name} line 1 one character off fails`);
  }
  const study = blocks.study.join("\n");
  const forbidden = [
    ["model id", /\b(claude-(opus|sonnet|haiku|fable)-\d|gpt-\d|text-embedding-)/i, "claude-fable-5-1"],
    ["routine id", /trig_[A-Za-z0-9]/, "trig_01abc"],
  ];
  for (const [what, re, violation] of forbidden) {
    assert.ok(!re.test(study), `the study block names no ${what}`);
    assert.ok(re.test(study + "\n" + violation), `control: a ${what} is detectable when present`);
  }
  assert.ok(!/trig_/.test(md), "the runbook carries no routine id");
  assert.ok(/3 to 5 pieces/.test(study) && /at most 2/.test(study) && /90 days/.test(study) && /ONE summary/.test(study), "study block: reading, discovery cap, retirement, one summary");
  assert.ok(md.includes("`0 13 * * 6` (UTC)"), "the Saturday cron");
  assert.ok(/^Step 1b — the mentor review\. .*strategy-mentor-review/m.test(blocks.readiness.join("\n")), "readiness block step 1b runs the mentor review");
  assert.ok(/^\| `study` \| `strategy-weekly-study` \|$/m.test(md), "ask table: study");
  assert.ok(/^\| `mentor review` \| `strategy-mentor-review` \|$/m.test(md), "ask table: mentor review");
  assert.ok(/^\| `tick …` \| .*--tick=<ids> \[--untick=<ids>\]/m.test(md), "ask table: tick");
  assert.ok(/^1c\. \*\*Two-draft blend/m.test(md) && md.includes("<scratch>-a.json") && md.includes("<scratch>-b.json") && md.includes("data.draft:'blend'"), "step 1c two-draft blend");
  assert.ok(/^6b\. \*\*Session-end tick list/m.test(md) && md.includes('"yes 1, 3; no 2"'), "step 6b tick list");
  assert.ok(/^### The proof measures/m.test(md) && /slip rule/i.test(md) && /New-information rate/.test(md), "the proof measures");
  assert.ok(md.includes("Waiting on you · Today's brief · Scoreboard · Track record · This week's study · Offering menu · Acquirer watch · Targets and warm paths · Roadmap · Library health · History"), "the Desk's section order");
  assert.ok(/^## \(f\) The Library sync/m.test(md) && md.includes("scripts/library-sync.js"), "the Library sync paragraph");
  assert.ok(/^1b\. \*\*Outside research first \(AGT-648\)/m.test(md), "AGT-648 step 1b kept");
  return ["D-four-blocks-step0", "D-study-no-model-no-routine-id", "D-runbook-sections"];
}

async function armE() {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY, manifest = process.env.LIBRARY_SYNC_MANIFEST;
  if (!url || !key || url.includes("placeholder") || !manifest) {
    notRun("E live dry-run over the real manifest", "needs SUPABASE_URL, SUPABASE_SERVICE_KEY and LIBRARY_SYNC_MANIFEST (the session's manifest path) in env");
    return [];
  }
  const r = spawnSync(process.execPath, [SCRIPT, `--manifest=${manifest}`, "--only=documents", "--dry-run"], { encoding: "utf8", env: process.env, timeout: 300000 });
  assert.equal(r.status, 0, `dry-run exits 0 (got ${r.status}): ${r.stderr.split("\n").filter(l => /library-sync|FAIL/.test(l)).join(" | ").slice(0, 400)}`);
  const sum = JSON.parse(r.stdout.trim().split("\n").pop());
  assert.deepEqual(Object.keys(sum), ["added", "versioned", "unchanged", "sections", "files", "embedded"]);
  assert.ok(sum.unchanged >= 30, `unchanged ${sum.unchanged} >= 30`);
  assert.equal(sum.embedded, 0, "a dry run embeds nothing");
  return [`E-live-dry-run-unchanged-${sum.unchanged}`];
}

async function run() {
  return [...armA(), ...armB(), ...armC(), ...armD(), ...(await armE())];
}

selfRun(import.meta.url, run);
export default run;
