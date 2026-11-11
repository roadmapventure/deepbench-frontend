// DeepBench v7.0.1006 | tests/regression/agt-644-strategy-agent.test.mjs | AGT-644 -- the strategy consultant's call path: a third record store, the Library read, the strategy write check, the runbook's three routine blocks
// Kickoff: docs/kickoffs/v7.0.1006-AGT-644-harry-call-path.md section 5, T4.
//
//   A  MAPS -- STRATEGY_READ_MAP's keys are exactly the five strategy-* slugs and every kind it reads
//      is one of the eleven STRATEGY_KINDS; LIBRARY_SECTIONS and EXTRA_READS cover the same five slugs;
//      READ_MAP and HUMOR_READ_MAP are byte-same as origin/dev (their source text, when git can show
//      it) and deep-equal to the pinned values; the agent id appears in the script only on `//` lines
//      (control: a copy with `const a = 'harry';` spliced in fails).
//   B  WRITE CHECK -- validateStrategyAnswer() passes a minimal brief; it refuses an unknown kind, an
//      empty title, an offer with proposed_price and no price_basis, and a curate label with section
//      `misc`. Each refusal is paired with a passing control that differs only in the broken field.
//   C  RUNBOOK -- the six marker lines appear once each as whole lines; line 1 of each of the three
//      blocks is the STEP 0 meter stop byte for byte (control: one character off fails); the three
//      crons are present; the file carries no model id and no `trig_` (each pattern proved to fire on
//      a violating copy).
//   D  LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, else notRun) -- `--render --agent=harry
//      --capability=strategy-advise --ask=test --json` exits 0 with prompt_bytes < 400000, and the
//      rendered text carries no slice of any personal_source_files `bytes` value (control: a spliced
//      slice is caught).
//
// Pre-change on the unchanged tree: the named imports below do not exist, so the module fails to
// link and every arm is red; the runbook does not exist; the render exits 2 ("not in the read map").

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  READ_MAP, HUMOR_READ_MAP, STRATEGY_READ_MAP, STRATEGY_KINDS, EXTRA_READS, LIBRARY_SECTIONS,
  validateStrategyAnswer,
} from "../../scripts/personal-agent.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const AGENT = path.join(ROOT, "scripts", "personal-agent.js");
const RUNBOOK = path.join(ROOT, "docs", "runbooks", "strategy-agent.md");
const lf = t => String(t).replace(/\r\n/g, "\n");

const SLUGS = ["strategy-advise", "strategy-daily-brief", "strategy-library-curate", "strategy-readiness-check", "strategy-weekly-review"];
const STEP0 = "STEP 0 — WEEKLY METER STOP (John, 2026-10-17). Before anything else, using the Supabase MCP tools, run: select ok, reason, all_models_pct, threshold from public.routine_meter_ok(); If ok is false, stop the run now: do no work, write nothing, send nothing, and make the first line of your final message exactly: SKIPPED: weekly meter <all_models_pct>% at or above the ceiling <threshold>% (<reason>). If that query itself fails, also stop and say: SKIPPED: meter check failed. Only when ok is true, continue with the instructions below.";
const MARKERS = {
  daily: ["<!-- HARRY-DAILY-BRIEF-PROMPT-BEGIN -->", "<!-- HARRY-DAILY-BRIEF-PROMPT-END -->"],
  weekly: ["<!-- HARRY-WEEKLY-REVIEW-PROMPT-BEGIN -->", "<!-- HARRY-WEEKLY-REVIEW-PROMPT-END -->"],
  readiness: ["<!-- HARRY-READINESS-CHECK-PROMPT-BEGIN -->", "<!-- HARRY-READINESS-CHECK-PROMPT-END -->"],
};
const CRONS = ["30 12 * * 1-5", "0 13 * * 1", "30 13 1 * *"];

// The pinned career and humor maps (agt-84 and agt-543 pin the same values).
const PROFILE = ["resume_fact", "target", "ladder_rung", "evidence"];
const PINNED_READ_MAP = {
  "career-resume-review": PROFILE, "career-intro-pitch": PROFILE, "career-cover-letter": PROFILE,
  "career-strengths-gaps": [...PROFILE, "market_requirement", "posting"],
  "career-posting-review": [...PROFILE, "market_requirement", "posting"],
  "career-match-finder": [...PROFILE, "market_requirement", "posting"],
  "career-interview-prep": ["resume_fact", "target", "network_contact", "log"],
  "career-outreach-plan": ["network_contact", "target"],
  "career-market-watch": ["target", "market_requirement", "watch_company", "posting"],
  "career-evidence-mining": ["evidence", "resume_fact", "target"],
  "career-growth-review": ["ladder_rung", "target", "log", "review", "evidence", "resume_fact", "market_requirement", "posting"],
  "career-linkedin-alerts": ["resume_fact", "target", "ladder_rung", "evidence", "network_contact", "posting", "log"],
};
const PINNED_HUMOR_READ_MAP = {
  "humor-weekly-draft": ["draft", "grade", "topic", "research", "phrase_set"],
  "humor-topic-scout": ["draft", "topic", "phrase_set"],
};

const nameOnlyInComments = src => lf(src).split("\n").every(l => !/\bharry\b/.test(l) || l.trim().startsWith("//"));
// The literal source text of one `export const NAME = {...};` block.
const blockOf = (src, name) => {
  const s = lf(src);
  const a = s.indexOf(`export const ${name} = {`);
  if (a < 0) return null;
  return s.slice(a, s.indexOf("\n};", a) + 3);
};

const ok = (answer, why) => {
  const r = validateStrategyAnswer(answer);
  assert.equal(r.ok, true, `${why} passes (errors: ${JSON.stringify(r.errors)})`);
};
const refused = (answer, re, why) => {
  const r = validateStrategyAnswer(answer);
  assert.equal(r.ok, false, `${why} is refused`);
  assert.ok(r.errors.some(e => re.test(e)), `${why}: an error matches ${re} (got ${JSON.stringify(r.errors)})`);
};

async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`${name}: ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agt644-"));

  try {
    await arm("A maps", async () => {
      assert.deepEqual(STRATEGY_KINDS, ["brief", "review", "readiness", "offer", "roadmap", "acquirer", "call", "gap", "research", "correction", "grade"]);
      assert.deepEqual(Object.keys(STRATEGY_READ_MAP).sort(), SLUGS);
      for (const [slug, kinds] of Object.entries(STRATEGY_READ_MAP)) {
        for (const k of kinds) assert.ok(STRATEGY_KINDS.includes(k), `${slug} reads ${k}, not a strategy kind`);
      }
      assert.deepEqual(Object.keys(LIBRARY_SECTIONS).sort(), SLUGS, "LIBRARY_SECTIONS covers the five slugs");
      for (const s of SLUGS) assert.ok([].concat(EXTRA_READS[s]).includes("library"), `${s} reads the library`);

      assert.deepEqual(READ_MAP, PINNED_READ_MAP, "READ_MAP is unchanged");
      assert.deepEqual(HUMOR_READ_MAP, PINNED_HUMOR_READ_MAP, "HUMOR_READ_MAP is unchanged");
      const src = fs.readFileSync(AGENT, "utf8");
      const dev = spawnSync("git", ["-C", ROOT, "show", "origin/dev:scripts/personal-agent.js"], { encoding: "utf8", maxBuffer: 1 << 26 });
      if (dev.status === 0 && dev.stdout) {
        for (const name of ["READ_MAP", "HUMOR_READ_MAP"]) {
          const was = blockOf(dev.stdout, name);
          assert.ok(was, `origin/dev carries ${name}`);
          assert.equal(blockOf(src, name), was, `${name} source text is byte-same as origin/dev`);
        }
      } else {
        console.log("    A: origin/dev not showable here -- the byte check fell back to the pinned deep-equal above");
      }

      assert.ok(nameOnlyInComments(src), "the agent id appears outside a `//` line of scripts/personal-agent.js");
      const spliced = src.replace("const TENANT = 'global';", "const TENANT = 'global';\nconst a = 'harry';");
      assert.notEqual(spliced, src, "control: the splice anchor exists");
      assert.ok(!nameOnlyInComments(spliced), "control: a spliced `const a = 'harry';` must fail the name check");
    });

    await arm("B write check", async () => {
      const brief = { records_to_write: [{ kind: "brief", title: "today", data: {} }] };
      ok(brief, "a minimal brief");

      refused({ records_to_write: [{ kind: "posting", title: "today", data: {} }] }, /unknown kind "posting"/, "an unknown kind");
      ok({ records_to_write: [{ kind: "review", title: "today", data: {} }] }, "control: the same record with a known kind");

      refused({ records_to_write: [{ kind: "brief", title: "  ", data: {} }] }, /has no title/, "an empty title");
      ok({ records_to_write: [{ kind: "brief", title: "t", data: {} }] }, "control: the same record with a title");

      refused({ records_to_write: [{ kind: "offer", title: "an offer", data: { proposed_price: 5000 } }] }, /price_basis/, "an offer with proposed_price and no price_basis");
      ok({ records_to_write: [{ kind: "offer", title: "an offer", data: { proposed_price: 5000, price_basis: "comparables" } }] }, "control: the same offer with a price_basis");
      ok({ records_to_write: [{ kind: "offer", title: "an offer", data: {} }] }, "control: an offer with no proposed price needs no basis");

      const label = { source_id: "00000000-0000-4000-8000-000000000001", section: "value", trust: "extracted", sensitivity: "reusable" };
      const curate = l => ({ records_to_write: [], labels: [l] });
      refused(curate({ ...label, section: "misc" }), /section "misc"/, "a curate label with section misc");
      ok(curate(label), "control: the same label with section value");
    });

    await arm("C runbook", async () => {
      const md = lf(fs.readFileSync(RUNBOOK, "utf8"));
      const lines = md.split("\n");
      const blocks = {};
      for (const [name, [begin, end]] of Object.entries(MARKERS)) {
        for (const m of [begin, end]) {
          assert.equal(lines.filter(l => l === m).length, 1, `${m} is a whole line exactly once`);
        }
        const a = lines.indexOf(begin), b = lines.indexOf(end);
        assert.ok(a >= 0 && b > a, `${name} markers in order`);
        blocks[name] = lines.slice(a + 1, b);
      }
      assert.equal(Object.keys(blocks).length, 3, "three routine blocks");
      const opensWithStep0 = block => block[0] === STEP0;
      for (const [name, block] of Object.entries(blocks)) {
        assert.ok(opensWithStep0(block), `${name} block line 1 is the STEP 0 meter stop, byte for byte`);
        const off = [STEP0.replace("2026-10-17", "2026-10-18"), ...block.slice(1)];
        assert.ok(!opensWithStep0(off), `control: a ${name} line 1 one character off fails`);
      }
      const humor = lf(fs.readFileSync(path.join(ROOT, "docs", "runbooks", "humorist-agent.md"), "utf8"));
      assert.ok(humor.split("\n").includes(STEP0), "the pinned STEP0 is the humorist runbook's own line");
      for (const cron of CRONS) assert.ok(md.includes(cron), `the runbook carries cron ${cron}`);
      const forbidden = [
        ["model id", /\bclaude-(opus|sonnet|haiku|fable)-\d/i, "claude-opus-5"],
        ["trigger id", /trig_/, "trig_01abc"],
      ];
      for (const [what, re, violation] of forbidden) {
        assert.ok(!re.test(md), `the runbook carries no ${what}`);
        assert.ok(re.test(md + "\n" + violation), `control: ${what} is detectable when present`);
      }
    });

    await arm("D live", async () => {
      const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
      const key = process.env.SUPABASE_SERVICE_KEY ?? "";
      if (!url || !key) {
        notRun("AGT-644 arm D (strategy-advise render, file bytes absent)",
          "SUPABASE_URL + SUPABASE_SERVICE_KEY absent -- the Library and strategy_records are unreadable here, so the live half is UNVERIFIED. Arms A-C DID run. Credentialed run: STANDARDS.md Section 2 rule 5");
        return;
      }
      const out = path.join(tmp, "render.md");
      const r = spawnSync(process.execPath, [AGENT, "--render", "--agent=harry", "--capability=strategy-advise", "--ask=test", `--out=${out}`, "--json"],
        { encoding: "utf8", env: { ...process.env }, maxBuffer: 1 << 26, timeout: 180000 });
      assert.equal(r.status, 0, `the render exits 0 (got ${r.status}: ${(r.stderr ?? "").slice(-400)})`);
      const j = JSON.parse(r.stdout.trim().split("\n").pop());
      assert.ok(Number.isFinite(j.prompt_bytes) && j.prompt_bytes > 0, `prompt_bytes is a number: ${r.stdout}`);
      assert.ok(j.prompt_bytes < 400000, `prompt_bytes ${j.prompt_bytes} is under 400000`);
      const text = fs.readFileSync(out, "utf8");

      const svc = { apikey: key, Authorization: `Bearer ${key}` };
      const f = await fetch(`${url}/rest/v1/personal_source_files?select=source_id,bytes&order=source_id.asc&limit=3`, { headers: svc });
      assert.equal(f.status, 200, `service key reads personal_source_files (HTTP ${f.status})`);
      const files = await f.json();
      const slices = files.map(x => String(x.bytes ?? "").replace(/^\\x/, "")).filter(h => h.length >= 64)
        .map(h => h.slice(Math.min(2000, h.length - 64), Math.min(2000, h.length - 64) + 64));
      for (const s of slices) assert.ok(!text.includes(s), "the render carries a slice of a personal_source_files bytes value");
      if (slices.length) assert.ok((text + slices[0]).includes(slices[0]), "control: a spliced slice is caught");
      console.log(`    D render: exit 0, model ${j.model}, prompt_bytes ${j.prompt_bytes}; ${slices.length} file byte slice(s) checked absent`);
    });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  if (failures.length) throw new Error(failures.join(" | "));
}

export default run;
selfRun(import.meta.url, run);
