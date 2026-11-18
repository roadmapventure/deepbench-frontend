// DeepBench v7.0.1053 | tests/regression/agt-725-laura-fixed-reads.test.mjs | AGT-725 -- the writing slugs' fixed read `profile_facts` (confirmed facts, current LinkedIn text, master resume) outside the ranked Library, nothing travelling twice
// Kickoff: docs/kickoffs/v7.0.1053-AGT-725-laura-fixed-reads.md section 5, T3.
//
//   A  READS -- writing-tailor, writing-draft, writing-weekly-check and writing-predraft read `profile_facts`, listed
//      before `library`; writing-watch does not (control); READ_MAP, HUMOR_READ_MAP, STRATEGY_READ_MAP and
//      SECURITY_READ_MAP are byte-same as origin/dev.
//   B  TEXT PLAN (pure) -- a catalog fixture with a facts item, a linkedin_profile item and a master resume (plus an
//      older resume and a works control): the writing-draft plan excludes all three and keeps the controls; the
//      strategy-advise plan (control) keeps the facts item and the profile.
//   C  CAP (pure) -- a fixture over PROFILE_FACTS_BYTES: capProfileFacts cuts master_resume first (truncated: true)
//      and leaves every facts text byte-same; a fixture under the cap passes through unchanged (control).
//   D  LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, else notRun) -- the writing-draft render ("LinkedIn headline") exits 0
//      under 200000 bytes; its profile_facts line comes before its library line and carries the facts document's
//      title, `Headline:` and the current-role heading; the facts document id appears exactly once outside the
//      Library catalog (once in profile_facts, never in the Library text -- its catalog line stays, catalog
//      unchanged); a strategy-advise render for harry exits 0 and its Library catalog count equals the tables'.
//
// Pre-change on the unchanged tree: the named imports below do not exist, so the module fails to link and every
// arm is red; the writing-draft render carries no profile_facts key and no `Headline:`.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  EXTRA_READS, LIBRARY_COUNT_ONLY_KINDS, WRITING_LIBRARY_SECTIONS, LIBRARY_SECTIONS, LIBRARY_TEXT_SKIP_KINDS,
  PROFILE_FACTS_BYTES, libraryPlan, libraryTextSkips, capProfileFacts, profileFactsPick, isCurrentRole,
} from "../../scripts/personal-agent.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const AGENT = path.join(ROOT, "scripts", "personal-agent.js");
const lf = t => String(t).replace(/\r\n/g, "\n");
const FIXED = ["writing-tailor", "writing-draft", "writing-weekly-check", "writing-predraft"];
const blockOf = (src, name) => {
  const s = lf(src);
  const a = s.indexOf(`export const ${name} = {`);
  if (a < 0) return null;
  return s.slice(a, s.indexOf("\n};", a) + 3);
};

const CATALOG = [
  { id: "facts-doc", kind: "document", title: "Confirmed facts", section: "facts", trust: "john_confirmed", doc_date: null },
  { id: "profile", kind: "linkedin_profile", title: "LinkedIn profile", section: "identity", trust: "public_page", doc_date: null },
  { id: "master", kind: "resume", title: "Resume: X (current master, June 2026)", section: "works", trust: "john_authored", doc_date: null },
  { id: "old-resume", kind: "resume", title: "Resume: older", section: "works", trust: "john_authored", doc_date: null },
  { id: "works-doc", kind: "document", title: "A work", section: "works", trust: "john_authored", doc_date: null },
  { id: "value-doc", kind: "document", title: "Value", section: "value", trust: "john_authored", doc_date: null },
];
const planIds = (cap, hits = []) => {
  const { skipSections, skipIds } = libraryTextSkips(cap, CATALOG);
  const wanted = new Set(LIBRARY_SECTIONS[cap] ?? WRITING_LIBRARY_SECTIONS[cap] ?? []);
  const skipKinds = new Set(LIBRARY_TEXT_SKIP_KINDS[cap] ?? []);
  return libraryPlan(CATALOG, hits, { wanted, skipKinds, skipSections, skipIds }).map(p => p.id);
};

async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`${name}: ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agt725-"));
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  const live = Boolean(url && key);

  try {
    await arm("A reads", async () => {
      const reads = s => [].concat(EXTRA_READS[s] ?? []);
      for (const s of FIXED) {
        assert.ok(reads(s).includes("profile_facts"), `${s} reads profile_facts`);
        assert.ok(reads(s).indexOf("profile_facts") < reads(s).indexOf("library"), `${s}: profile_facts comes before library`);
      }
      assert.ok(!reads("writing-watch").includes("profile_facts"), "control: the watch does not read profile_facts");
      assert.ok(reads("writing-watch").includes("library"), "control: the watch still reads the Library");
      assert.ok(!reads("strategy-advise").includes("profile_facts"), "control: a strategy slug does not read profile_facts");
      const src = fs.readFileSync(AGENT, "utf8");
      const dev = spawnSync("git", ["-C", ROOT, "show", "origin/dev:scripts/personal-agent.js"], { encoding: "utf8", maxBuffer: 1 << 26 });
      assert.ok(dev.status === 0 && dev.stdout, "origin/dev:scripts/personal-agent.js is showable");
      for (const name of ["READ_MAP", "HUMOR_READ_MAP", "STRATEGY_READ_MAP", "SECURITY_READ_MAP"]) {
        const was = blockOf(dev.stdout, name);
        assert.ok(was, `origin/dev carries ${name}`);
        assert.equal(blockOf(src, name), was, `${name} source text is byte-same as origin/dev`);
      }
      assert.ok(isCurrentRole("Consultant | example.com | Mar 2026 - present"), "a `present` position is the current role");
      assert.ok(!isCurrentRole("Director | Co | 2021 - 2024"), "control: a past position is not");
      assert.ok(!isCurrentRole("present day thoughts"), "control: a heading with no `|` field is not a position");
    });

    await arm("B text plan", async () => {
      const pick = profileFactsPick(CATALOG);
      assert.equal(pick.profile?.id, "profile");
      assert.equal(pick.master?.id, "master", "the master resume is the one titled current master");
      const w = planIds("writing-draft");
      for (const id of ["facts-doc", "profile", "master"]) assert.ok(!w.includes(id), `writing-draft text plan excludes ${id}`);
      for (const id of ["old-resume", "works-doc", "value-doc"]) assert.ok(w.includes(id), `control: writing-draft keeps ${id}`);
      const hit = planIds("writing-draft", [{ source_id: "facts-doc", section_id: null, score: 9 }, { source_id: "master", section_id: null, score: 8 }]);
      assert.ok(!hit.includes("facts-doc") && !hit.includes("master"), "a search hit does not bring a fixed-read item back as text");
      const watch = libraryTextSkips("writing-watch", CATALOG);
      assert.equal(watch.skipIds.size, 0, "control: the watch (no profile_facts) skips no id");
      assert.ok(!watch.skipSections.has("facts"), "control: the watch keeps the facts section");
      const s = planIds("strategy-advise");
      assert.ok(s.includes("facts-doc"), "control: strategy-advise keeps the facts item as text");
      const sHit = planIds("strategy-advise", [{ source_id: "profile", section_id: null, score: 5 }]);
      assert.ok(sHit.includes("profile"), "control: strategy-advise keeps a profile hit as text");
    });

    await arm("C cap", async () => {
      const facts = [{ id: "f1", title: "Facts", kind: "document", trust: "john_confirmed", text: "F".repeat(15000) }];
      const block = {
        facts,
        profile: { id: "p", export_heading: "LinkedIn profile", sections: [{ heading: "LinkedIn profile", body: "Headline: x\n" + "P".repeat(3000) }] },
        master_resume: { id: "m", title: "Resume (current master)", text: "M".repeat(30000) },
      };
      assert.ok(Buffer.byteLength(JSON.stringify(block)) > PROFILE_FACTS_BYTES, "fixture is over the cap");
      const out = capProfileFacts(block);
      const size = Buffer.byteLength(JSON.stringify(out));
      assert.ok(size <= PROFILE_FACTS_BYTES, `capped to ${size} <= ${PROFILE_FACTS_BYTES}`);
      assert.equal(out.master_resume.truncated, true, "the master resume is marked truncated");
      assert.ok(out.master_resume.text.length < 30000, "the master resume was cut");
      assert.deepEqual(out.facts, facts, "the facts are byte-same");
      assert.deepEqual(out.profile, block.profile, "the profile is untouched while the master cut suffices");
      const huge = { ...block, facts: [{ ...facts[0], text: "F".repeat(45000) }] };
      const h = capProfileFacts(huge);
      assert.equal(h.facts[0].text.length, 45000, "facts over the cap on their own are still never cut");
      const small = { facts, profile: null, master_resume: { id: "m", title: "t", text: "short" } };
      assert.deepEqual(capProfileFacts(small), small, "control: under the cap, nothing changes");
    });

    await arm("D live renders", async () => {
      if (!live) {
        notRun("AGT-725 arm D (writing-draft and strategy-advise renders)",
          "SUPABASE_URL + SUPABASE_SERVICE_KEY absent -- the Library is unreadable here, so the live half is UNVERIFIED. Arms A-C DID run. Credentialed run: STANDARDS.md Section 2 rule 5");
        return;
      }
      const svc = { apikey: key, Authorization: `Bearer ${key}` };
      const get = async q => {
        const r = await fetch(`${url}/rest/v1/${q}`, { headers: svc });
        assert.equal(r.status, 200, `GET ${q.split("?")[0]} HTTP ${r.status}`);
        return r.json();
      };
      const render = (agent, cap, ask, out) => {
        const r = spawnSync(process.execPath, [AGENT, "--render", `--agent=${agent}`, `--capability=${cap}`, `--ask=${ask}`, `--out=${out}`, "--json"],
          { encoding: "utf8", env: { ...process.env }, maxBuffer: 1 << 26, timeout: 240000 });
        assert.equal(r.status, 0, `${cap} render exits 0 (got ${r.status}: ${(r.stderr ?? "").slice(-400)})`);
        return JSON.parse(r.stdout.trim().split("\n").pop());
      };
      const lineOf = (lines, k) => lines.findIndex(l => l.startsWith(`${k}: `));
      const count = (hay, needle) => hay.split(needle).length - 1;

      const factsRows = await get("personal_sources?section=eq.facts&status=eq.current&select=id,title,kind&order=id.asc");
      const doc = factsRows.find(r => r.kind === "document") ?? factsRows[0];
      assert.ok(doc, "a current facts-section item exists");
      const prof = (await get("personal_sources?kind=eq.linkedin_profile&status=eq.current&select=id&order=id.desc"))[0];
      assert.ok(prof, "a current linkedin_profile item exists");
      const secs = await get(`personal_source_sections?source_id=eq.${prof.id}&select=ord,heading&order=ord.asc`);
      const current = secs.filter(s => s.ord > 0 && isCurrentRole(s.heading));
      assert.ok(current.length >= 1, "the profile has a current-role section");

      const wOut = path.join(tmp, "writing.md");
      const w = render("laura", "writing-draft", "LinkedIn headline", wOut);
      assert.ok(w.prompt_bytes > 0 && w.prompt_bytes < 200000, `writing-draft prompt_bytes ${w.prompt_bytes} under 200000`);
      const lines = lf(fs.readFileSync(wOut, "utf8")).split("\n");
      const pi = lineOf(lines, "profile_facts"), li = lineOf(lines, "library");
      assert.ok(pi >= 0, "the render carries a profile_facts key");
      assert.ok(li >= 0 && pi < li, "profile_facts comes before library");
      const pfLine = lines[pi];
      const pf = JSON.parse(pfLine.slice("profile_facts: ".length));
      const lib = JSON.parse(lines[li].slice("library: ".length));
      assert.ok(pfLine.includes(JSON.stringify(doc.title).slice(1, -1)), "profile_facts carries the facts document's title");
      assert.ok(pfLine.includes("Headline:"), "profile_facts carries `Headline:`");
      for (const s of current) assert.ok(pf.profile.sections.some(x => x.heading === s.heading), `profile_facts carries the current-role heading (ord ${s.ord})`);
      assert.ok(!("ids" in pf), "the internal id list is not serialized");
      const context = lines.filter((l, i) => i !== li).join("\n") + "\n" + JSON.stringify(lib.text);
      assert.equal(count(context, doc.id), 1, "the facts document id appears exactly once outside the Library catalog");
      assert.equal(count(JSON.stringify(lib.text), doc.id), 0, "the facts document is not Library text");
      assert.equal(count(JSON.stringify(lib.text), prof.id), 0, "the profile is not Library text");
      if (pf.master_resume) assert.equal(count(JSON.stringify(lib.text), pf.master_resume.id), 0, "the master resume is not Library text");
      assert.ok(lib.catalog.some(c => c.id === doc.id), "the facts document keeps its catalog line (catalog unchanged)");

      const sOut = path.join(tmp, "strategy.md");
      const s = render("harry", "strategy-advise", "test", sOut);
      const sLines = lf(fs.readFileSync(sOut, "utf8")).split("\n");
      assert.ok(lineOf(sLines, "profile_facts") < 0, "control: the strategy render carries no profile_facts");
      const sLib = JSON.parse(sLines[lineOf(sLines, "library")].slice("library: ".length));
      const kinds = [...new Set((await get("personal_source_grants?agent_id=eq.harry&select=kind")).map(g => g.kind))];
      const rows = await get(`personal_sources?status=eq.current&kind=in.(${kinds.join(",")})&select=id,kind`);
      const expected = rows.filter(r => !LIBRARY_COUNT_ONLY_KINDS.includes(r.kind)).length;
      assert.equal(sLib.catalog.length, expected, `the strategy Library catalog count ${sLib.catalog.length} equals the tables' ${expected}`);
      console.log(`    D renders: writing-draft prompt_bytes ${w.prompt_bytes}, profile_facts ${Buffer.byteLength(pfLine)} bytes (${pf.facts.length} facts, ${pf.profile.sections.length} profile sections, master ${pf.master_resume ? "yes" : "none"}); strategy-advise prompt_bytes ${s.prompt_bytes}, catalog ${sLib.catalog.length} = ${expected}`);
    });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  if (failures.length) throw new Error(failures.join(" | "));
}

export default run;
selfRun(import.meta.url, run);
