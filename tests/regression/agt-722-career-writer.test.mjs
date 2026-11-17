// DeepBench v7.0.1052 | tests/regression/agt-722-career-writer.test.mjs | AGT-722 -- the career writer's call path: a fifth record store, the deny-aware Library read, the two write guards, the idea board as direction only, and the runbook's three routine blocks
// Kickoff: docs/kickoffs/v7.0.1052-AGT-722-laura-call-path.md section 5, T4.
//
//   A  MAPS -- WRITING_READ_MAP's (and WRITING_LIBRARY_SECTIONS') keys are exactly the five writing-* slugs; every kind it reads is one
//      of the ten WRITING_KINDS; the writing store reads every correction and grade; READ_MAP,
//      HUMOR_READ_MAP, STRATEGY_READ_MAP and SECURITY_READ_MAP are byte-same as origin/dev; the agent id
//      appears in the script only on `//` lines (control: a copy with `const a = 'laura';` spliced in fails).
//   B  WRITE CHECK -- validateWritingAnswer() passes a minimal draft answer; it refuses an unknown kind, a
//      model-written grade, an empty title, a proposal with no source, a practice with publisher_type
//      `blog`, a method with two URLs on one host, a method whose second source is a vendor practice, a
//      draft naming a FIXTURE blocked term (never the live list), and a draft body carrying its own
//      fact_candidate statement. Each refusal is paired with a passing control.
//   C  NAPKIN -- napkinDirection() keeps a validated fixture, drops a weak one and one with no note, and
//      every kept row carries direction_only: true.
//   D  DENY-AWARE READ (pure) -- a catalog fixture with a denied id and a client_private item in `works`
//      loses both for a writing slug and keeps both for a strategy slug (whose agent has no deny rows).
//   E  RUNBOOK -- three blocks, each line 1 === STEP 0 byte for byte (control: one char off fails); the
//      three crons; the first-Saturday stop line; no model id and no `trig_` (each pattern proved to fire).
//   F  LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, else notRun) -- the writing-draft render exits 0 under
//      200000 bytes and its Library carries no denied id (control: at least one denied id IS a current item
//      of a granted kind, so the check discriminates); the strategy-advise render exits 0 and its Library
//      catalog count equals the count computed independently from the tables (the deny filter is a no-op
//      for an agent with no deny rows). Renders only: no write.
//
// Pre-change on the unchanged tree: the named imports below do not exist, so the module fails to link and
// every arm is red; the runbook does not exist; the writing render exits 2 ("not in the read map").

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  READ_MAP, HUMOR_READ_MAP, STRATEGY_READ_MAP, SECURITY_READ_MAP, WRITING_READ_MAP, WRITING_KINDS, EXTRA_READS,
  LIBRARY_PRIVATE_SECTIONS, LIBRARY_COUNT_ONLY_KINDS, LIBRARY_SECTIONS, WRITING_LIBRARY_SECTIONS, storeFor, validateWritingAnswer, napkinDirection, libraryAllowed,
} from "../../scripts/personal-agent.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const AGENT = path.join(ROOT, "scripts", "personal-agent.js");
const RUNBOOK = path.join(ROOT, "docs", "runbooks", "career-writer-agent.md");
const STRATEGY_RUNBOOK = path.join(ROOT, "docs", "runbooks", "strategy-agent.md");
const lf = t => String(t).replace(/\r\n/g, "\n");

const SLUGS = ["writing-draft", "writing-predraft", "writing-tailor", "writing-watch", "writing-weekly-check"];
const STEP0 = "STEP 0 — WEEKLY METER STOP (John, 2026-10-17). Before anything else, using the Supabase MCP tools, run: select ok, reason, all_models_pct, threshold from public.routine_meter_ok(); If ok is false, stop the run now: do no work, write nothing, send nothing, and make the first line of your final message exactly: SKIPPED: weekly meter <all_models_pct>% at or above the ceiling <threshold>% (<reason>). If that query itself fails, also stop and say: SKIPPED: meter check failed. Only when ok is true, continue with the instructions below.";
const MARKERS = {
  predraft: ["<!-- LAURA-PREDRAFT-PROMPT-BEGIN -->", "<!-- LAURA-PREDRAFT-PROMPT-END -->"],
  check: ["<!-- LAURA-WEEKLY-CHECK-PROMPT-BEGIN -->", "<!-- LAURA-WEEKLY-CHECK-PROMPT-END -->"],
  watch: ["<!-- LAURA-WATCH-PROMPT-BEGIN -->", "<!-- LAURA-WATCH-PROMPT-END -->"],
};
const CRONS = ["30 13 * * 1-5", "0 13 * * 4", "0 14 * * 6"];
// Fixture rules only -- never the live blocked list.
const RULES = [{ data: { blocked_terms: ["Zorbex County", "Quillfen"] } }];

const nameOnlyInComments = src => lf(src).split("\n").every(l => !/\blaura\b/.test(l) || l.trim().startsWith("//"));
const blockOf = (src, name) => {
  const s = lf(src);
  const a = s.indexOf(`export const ${name} = {`);
  if (a < 0) return null;
  return s.slice(a, s.indexOf("\n};", a) + 3);
};

const check = (answer, opts) => validateWritingAnswer("writing-draft", answer, RULES, opts);
const ok = (answer, why, opts) => {
  const r = check(answer, opts);
  assert.equal(r.ok, true, `${why} passes (errors: ${JSON.stringify(r.errors)})`);
};
const refused = (answer, re, why, opts) => {
  const r = check(answer, opts);
  assert.equal(r.ok, false, `${why} is refused`);
  assert.ok(r.errors.some(e => re.test(e)), `${why}: an error matches ${re} (got ${JSON.stringify(r.errors)})`);
};
const one = (kind, data, extra = {}) => ({ records_to_write: [{ kind, title: "t", data, ...extra }] });
const PROPOSAL = { target: "linkedin", section: "About", current: "old", proposed: "new", reason: "clearer", source: "practice 1" };
const PRACTICE = { url: "https://www.example-recruiter.com/a", date: "2026-11-17", publisher_type: "recruiter" };
const METHOD = { sources: ["https://www.example-recruiter.com/a", "https://example-association.org/b"] };

async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`${name}: ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agt722-"));
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  const live = Boolean(url && key);

  try {
    await arm("A maps", async () => {
      assert.deepEqual(WRITING_KINDS, ["draft", "proposal", "match_report", "fact_candidate", "practice", "source", "method", "correction", "grade", "rule"]);
      assert.deepEqual(Object.keys(WRITING_READ_MAP).sort(), SLUGS);
      for (const [slug, kinds] of Object.entries(WRITING_READ_MAP)) {
        for (const k of kinds) assert.ok(WRITING_KINDS.includes(k), `${slug} reads ${k}, not a writing kind`);
        assert.ok(!kinds.includes("correction") && !kinds.includes("grade"), `${slug}: corrections and grades are read on every render, not by the map`);
      }
      const store = storeFor("writing-draft");
      assert.equal(store.table, "writing_records");
      assert.equal(store.allCorrections, true);
      assert.deepEqual(store.correctionKinds, ["correction", "grade"]);
      assert.equal(storeFor("security-advise").table, "security_records", "control: a security slug stays on its own store");
      const reads = s => [].concat(EXTRA_READS[s] ?? []);
      for (const s of SLUGS) for (const k of ["library", "goals"]) assert.ok(reads(s).includes(k), `${s} reads ${k}`);
      assert.ok(reads("writing-predraft").includes("postings_marked"), "the pre-draft reads the postings marked apply");
      assert.ok(!reads("writing-draft").includes("postings_marked"), "control: the draft does not");
      assert.ok(!reads("writing-watch").includes("career_writing"), "the watch reads method, not the record");
      for (const s of SLUGS) assert.deepEqual(LIBRARY_PRIVATE_SECTIONS[s], ["evidence", "value"], `${s} private sections`);
      assert.deepEqual(Object.keys(WRITING_LIBRARY_SECTIONS).sort(), SLUGS, "WRITING_LIBRARY_SECTIONS covers the five slugs");
      for (const s of SLUGS) assert.deepEqual([...WRITING_LIBRARY_SECTIONS[s]].sort(), ["approach", "evidence", "facts", "goals", "identity", "taste", "value", "works"], `${s} sections`);
      assert.ok(SLUGS.every(s => !(s in LIBRARY_SECTIONS)), "control: the strategy map stays the strategy slugs' own");
      assert.equal(LIBRARY_PRIVATE_SECTIONS["strategy-advise"], undefined, "control: a strategy slug has no private-section line");

      const src = fs.readFileSync(AGENT, "utf8");
      const dev = spawnSync("git", ["-C", ROOT, "show", "origin/dev:scripts/personal-agent.js"], { encoding: "utf8", maxBuffer: 1 << 26 });
      if (dev.status === 0 && dev.stdout) {
        for (const name of ["READ_MAP", "HUMOR_READ_MAP", "STRATEGY_READ_MAP", "SECURITY_READ_MAP"]) {
          const was = blockOf(dev.stdout, name);
          assert.ok(was, `origin/dev carries ${name}`);
          assert.equal(blockOf(src, name), was, `${name} source text is byte-same as origin/dev`);
        }
      } else {
        console.log("    A: origin/dev not showable here -- the byte check did not run");
        assert.ok(READ_MAP["career-resume-review"] && HUMOR_READ_MAP["humor-weekly-draft"] && STRATEGY_READ_MAP["strategy-advise"] && SECURITY_READ_MAP["security-advise"]);
      }
      assert.ok(nameOnlyInComments(src), "the agent id appears outside a `//` line of scripts/personal-agent.js");
      const spliced = src.replace("const TENANT = 'global';", "const TENANT = 'global';\nconst a = 'laura';");
      assert.notEqual(spliced, src, "control: the splice anchor exists");
      assert.ok(!nameOnlyInComments(spliced), "control: a spliced `const a = 'laura';` must fail the name check");
    });

    await arm("B write check", async () => {
      ok({ records_to_write: [{ kind: "draft", title: "Experience entry", body: "Led the product line.", data: { piece: "linkedin_experience" } }] }, "a minimal draft answer");

      refused(one("posting", {}), /unknown kind "posting"/, "an unknown kind");
      ok(one("match_report", {}), "control: the same record with a known kind");

      refused(one("grade", { score: 9, phrase: "sharp", record_id: "x" }), /principal's word/, "a model-written grade");
      ok(one("grade", { score: 9, phrase: "sharp", record_id: "x" }), "control: the same grade written with --principal", { principal: true });
      refused(one("rule", { blocked_terms: [] }), /unknown kind|only correction and grade/, "control: --principal never writes a rule", { principal: true });

      refused({ records_to_write: [{ kind: "draft", title: "  ", data: {} }] }, /has no title/, "an empty title");
      ok({ records_to_write: [{ kind: "draft", title: "t", data: {} }] }, "control: the same record with a title");

      const { source, ...noSource } = PROPOSAL;
      refused(one("proposal", noSource), /data\.source/, "a proposal with no source");
      ok(one("proposal", PROPOSAL), "control: the same proposal with a source");

      refused(one("practice", { ...PRACTICE, publisher_type: "blog" }), /publisher_type must be one of/, "a practice with publisher_type blog");
      ok(one("practice", PRACTICE), "control: the same practice from a recruiter");

      refused(one("method", { sources: ["https://www.example-recruiter.com/a", "https://example-recruiter.com/c"] }), /two distinct hosts/, "a method with two URLs on one host");
      ok(one("method", METHOD), "control: a method on two hosts");

      const vendorPractice = { kind: "practice", title: "v", data: { url: "https://vendor-resume.example.net/x", date: "2026-11-17", publisher_type: "vendor" } };
      const vendorMethod = { kind: "method", title: "m", data: { sources: ["https://www.example-recruiter.com/a", "https://vendor-resume.example.net/x"] } };
      refused({ records_to_write: [vendorPractice, vendorMethod] }, /two independent non-vendor sources/, "a method whose second source is a vendor practice in the same answer");
      refused({ records_to_write: [vendorMethod] }, /two independent non-vendor sources/, "a method whose second source is a STORED vendor practice", { practices: [{ kind: "practice", data: vendorPractice.data }] });
      ok({ records_to_write: [vendorPractice, { ...vendorMethod, data: { sources: [...METHOD.sources, "https://vendor-resume.example.net/x"] } }] }, "control: a vendor that only corroborates two independent sources");

      refused(one("draft", {}, { body: "Delivered the zorbex county program." }), /blocked client term "Zorbex County"/, "a draft naming a fixture blocked term (any case)");
      refused({ records_to_write: [], summary: "built for Quillfen" }, /blocked client term "Quillfen"/, "a blocked term outside any record");
      ok(one("draft", {}, { body: "Delivered the Quillfenwick program for a county." }), "control: a longer word that only contains the term is not a whole-word hit");
      ok(one("draft", {}, { body: "Delivered the county program." }), "control: the same draft without the term");

      const statement = "Cut procurement cycle time by 40 percent";
      const fc = { kind: "fact_candidate", title: "cycle time", data: { statement } };
      refused({ records_to_write: [fc, { kind: "draft", title: "d", body: `Highlights: ${statement}.` }] }, /states a waiting fact as fact/, "a draft body carrying its own fact_candidate statement");
      ok({ records_to_write: [fc, { kind: "draft", title: "d", body: "Highlights: led the procurement program." }] }, "control: the same answer with the fact left out of the draft");
      refused(one("fact_candidate", {}), /data\.statement/, "control: a fact_candidate needs a statement");
    });

    await arm("C napkin", async () => {
      const rows = [
        { id: "a", text: "AI resume tuner", status: "idea", research_note: "Validated: strong demand in three surveys" },
        { id: "b", text: "weak idea", status: "idea", research_note: "Weak: no evidence of demand" },
        { id: "c", text: "no note", status: "idea", research_note: null },
        { id: "d", text: "unvalidated", status: "idea", research_note: "Not validated yet" },
        { id: "e", text: "supported", status: "idea", research_note: "Supported by two interviews" },
      ];
      const kept = napkinDirection(rows);
      assert.deepEqual(kept.map(r => r.id), ["a", "e"], "keeps the validated and supported rows only");
      assert.ok(kept.every(r => r.direction_only === true), "every kept row is direction only");
      assert.ok(!kept.some(r => r.id === "b"), "drops the weak one");
      assert.ok(!kept.some(r => r.id === "c"), "drops the one with no note");
      assert.ok(!kept.some(r => r.id === "d"), "drops the not-validated one");
      const many = Array.from({ length: 200 }, (_, i) => ({ id: `n${i}`, text: "x".repeat(200), research_note: "validated" }));
      assert.ok(Buffer.byteLength(JSON.stringify(napkinDirection(many))) <= 5000, "cut to 5000 bytes");
    });

    await arm("D deny-aware read", async () => {
      const catalog = [
        { id: "keep-1", kind: "resume", section: "works", sensitivity: "reusable" },
        { id: "denied-1", kind: "document", section: "evidence", sensitivity: "reusable" },
        { id: "private-works", kind: "document", section: "works", sensitivity: "client_private" },
        { id: "private-evidence", kind: "document", section: "evidence", sensitivity: "client_private" },
      ];
      const w = libraryAllowed(catalog, ["denied-1"], "writing-draft").map(r => r.id);
      assert.deepEqual(w, ["keep-1", "private-evidence"], "a writing slug loses the denied id and the client_private works item");
      // The strategy slug's agent holds no deny rows (live: arm F), so its deny list is empty.
      const s = libraryAllowed(catalog, [], "strategy-advise").map(r => r.id);
      assert.deepEqual(s, catalog.map(r => r.id), "a strategy slug keeps both");
      assert.deepEqual(libraryAllowed(catalog, [], "writing-draft").map(r => r.id), ["keep-1", "denied-1", "private-evidence"], "control: the second line alone drops only the client_private works item");
    });

    await arm("E runbook", async () => {
      const md = lf(fs.readFileSync(RUNBOOK, "utf8"));
      const lines = md.split("\n");
      const blocks = {};
      for (const [name, [begin, end]] of Object.entries(MARKERS)) {
        for (const m of [begin, end]) assert.equal(lines.filter(l => l === m).length, 1, `${m} is a whole line exactly once`);
        const a = lines.indexOf(begin), b = lines.indexOf(end);
        assert.ok(a >= 0 && b > a, `${name} markers in order`);
        blocks[name] = lines.slice(a + 1, b);
      }
      assert.equal(Object.keys(blocks).length, 3, "three routine blocks");
      const strategy = lf(fs.readFileSync(STRATEGY_RUNBOOK, "utf8"));
      assert.ok(strategy.split("\n").includes(STEP0), "the pinned STEP0 is the strategy runbook's own line");
      const opensWithStep0 = block => block[0] === STEP0;
      for (const [name, block] of Object.entries(blocks)) {
        assert.ok(opensWithStep0(block), `${name} block line 1 is the STEP 0 meter stop, byte for byte`);
        assert.ok(!opensWithStep0([STEP0.replace("2026-10-17", "2026-10-18"), ...block.slice(1)]), `control: a ${name} line 1 one character off fails`);
      }
      for (const cron of CRONS) assert.ok(md.includes(cron), `the runbook carries cron ${cron}`);
      const firstStep = blocks.watch.slice(1).find(l => l.trim());
      assert.ok(/SKIPPED: not the first Saturday/.test(firstStep) && /America\/Chicago/.test(firstStep) && /greater than 7/.test(firstStep),
        `the watch's first step after STEP 0 is the first-Saturday stop: ${firstStep}`);
      assert.ok(!blocks.predraft.join("\n").includes("SKIPPED: not the first Saturday"), "control: the pre-draft carries no first-Saturday stop");
      assert.ok(/\| enabled \| `false` \| `false` \| `false` \|/.test(md), "all three routines are enabled false");
      assert.ok(/\| routine id \| not yet created \| not yet created \| not yet created \|/.test(md), "no routine id yet");
      const forbidden = [
        ["model id", /\bclaude-(opus|sonnet|haiku|fable)-\d/i, "claude-fable-5"],
        ["trigger id", /trig_/, "trig_01abc"],
      ];
      for (const [what, re, violation] of forbidden) {
        assert.ok(!re.test(md), `the runbook carries no ${what}`);
        assert.ok(re.test(md + "\n" + violation), `control: ${what} is detectable when present`);
      }
    });

    await arm("F live renders", async () => {
      if (!live) {
        notRun("AGT-722 arm F (writing-draft and strategy-advise renders)",
          "SUPABASE_URL + SUPABASE_SERVICE_KEY absent -- writing_records, the Library and its deny list are unreadable here, so the live half is UNVERIFIED. Arms A-E DID run. Credentialed run: STANDARDS.md Section 2 rule 5");
        return;
      }
      const svc = { apikey: key, Authorization: `Bearer ${key}` };
      const get = async q => {
        const r = await fetch(`${url}/rest/v1/${q}`, { headers: svc });
        assert.equal(r.status, 200, `GET ${q.split("?")[0]} HTTP ${r.status}`);
        return r.json();
      };
      const render = (agent, cap, out) => {
        const r = spawnSync(process.execPath, [AGENT, "--render", `--agent=${agent}`, `--capability=${cap}`, "--ask=test", `--out=${out}`, "--json"],
          { encoding: "utf8", env: { ...process.env }, maxBuffer: 1 << 26, timeout: 240000 });
        assert.equal(r.status, 0, `${cap} render exits 0 (got ${r.status}: ${(r.stderr ?? "").slice(-400)})`);
        return JSON.parse(r.stdout.trim().split("\n").pop());
      };
      const libraryOf = file => {
        const line = lf(fs.readFileSync(file, "utf8")).split("\n").find(l => l.startsWith("library: "));
        assert.ok(line, `${path.basename(file)} carries a library key`);
        return { line, lib: JSON.parse(line.slice("library: ".length)) };
      };
      const catalogCount = async agent => {
        const kinds = [...new Set((await get(`personal_source_grants?agent_id=eq.${agent}&select=kind`)).map(g => g.kind))];
        const rows = await get(`personal_sources?status=eq.current&kind=in.(${kinds.join(",")})&select=id,kind,section,sensitivity`);
        return rows;
      };

      const wOut = path.join(tmp, "writing.md");
      const w = render("laura", "writing-draft", wOut);
      assert.ok(Number.isFinite(w.prompt_bytes) && w.prompt_bytes > 0 && w.prompt_bytes < 200000, `writing-draft prompt_bytes ${w.prompt_bytes} under 200000`);
      const denied = (await get("personal_source_denies?agent_id=eq.laura&select=source_id")).map(d => d.source_id);
      assert.ok(denied.length >= 30, `the deny list has ${denied.length} rows`);
      const { line: wLine, lib: wLib } = libraryOf(wOut);
      const leaked = denied.filter(id => wLine.includes(id));
      assert.deepEqual(leaked, [], "the writing Library carries no denied id");
      const lauraRows = await catalogCount("laura");
      const reachable = denied.filter(id => lauraRows.some(r => r.id === id));
      assert.ok(reachable.length > 0, `control: ${reachable.length} denied ids are current items of a granted kind, so the check discriminates`);
      assert.ok(!wLib.catalog.some(c => c.sensitivity === "client_private" && !["evidence", "value"].includes(c.section)), "no client_private item outside evidence and value");

      const harryDenies = await get("personal_source_denies?agent_id=eq.harry&select=source_id");
      assert.equal(harryDenies.length, 0, "the strategy agent holds no deny rows");
      const sOut = path.join(tmp, "strategy.md");
      const s = render("harry", "strategy-advise", sOut);
      const { lib: sLib } = libraryOf(sOut);
      const expected = (await catalogCount("harry")).filter(r => !LIBRARY_COUNT_ONLY_KINDS.includes(r.kind)).length;
      assert.equal(sLib.catalog.length, expected, `the strategy Library catalog count ${sLib.catalog.length} equals the tables' ${expected} (deny filter is a no-op)`);
      console.log(`    F renders: writing-draft model ${w.model}, prompt_bytes ${w.prompt_bytes}, library catalog ${wLib.catalog.length} (denied ${denied.length}, ${reachable.length} reachable, 0 leaked); strategy-advise model ${s.model}, prompt_bytes ${s.prompt_bytes}, library catalog ${sLib.catalog.length} = ${expected}`);
    });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  if (failures.length) throw new Error(failures.join(" | "));
}

export default run;
selfRun(import.meta.url, run);
