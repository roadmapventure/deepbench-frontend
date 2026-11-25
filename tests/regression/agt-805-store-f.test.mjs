// DeepBench v7.0.1118 | tests/regression/agt-805-store-f.test.mjs | AGT-805 -- store F: the fixed `store_f` read on every strategy, writing, career and humor slug, the vocabulary write guard, and the writer intents
// Kickoff: docs/kickoffs/v7.0.1118-AGT-805-store-f-reads-and-writes.md section 5, T4.
//
//   A  READS (pure) -- every slug of STRATEGY_READ_MAP, WRITING_READ_MAP, READ_MAP and HUMOR_READ_MAP lists `store_f`
//      FIRST in EXTRA_READS; no SECURITY_READ_MAP slug lists it (control); career-linkedin-alerts reads exactly
//      ['store_f', 'competitors'].
//   B  TEXT PLAN (pure) -- a catalog fixture with a career_offering, a market_term and a works control: the
//      writing-draft plan drops both STORE_F_KINDS and keeps the control; for the security-advise slug (control)
//      libraryTextSkips names no store F kind.
//   C  CAP (pure) -- storeFBlock over STORE_F_BYTES drops the least-sighted term first (terms_dropped counts it),
//      keeps the most-sighted, and leaves the offering byte-same even when the offering alone is over the cap;
//      the internal id list is not serialized.
//   D  GUARD (pure) -- storeFWriteErrors refuses a market_terms item missing term/matches/in_his_words/strength,
//      a partial term with no shortfall, market_terms on a humor slug (reads only) and a records_to_write item of
//      kind career_offering; it passes a valid term on a writer slug (control); a store_f proposal needs a size.
//   E  LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, else notRun) -- the laura writing-draft, harry strategy-advise,
//      jerry career-posting-review and dilbert humor-weekly-draft renders exit 0, carry store_f.offering.text with
//      `Any product management role that manages a team`, and name the career_offering id exactly once outside the
//      Library catalog; the trenton security-advise render carries no store_f key (control).
//   F  LIVE -- each STORE_F_WRITERS slug's default intent method contains `STORE F VOCABULARY`.
//
// Pre-change on the unchanged tree: the named imports below do not exist, so the module fails to link and every
// arm is red; the writing-draft render carries no store_f key.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  EXTRA_READS, READ_MAP, HUMOR_READ_MAP, STRATEGY_READ_MAP, WRITING_READ_MAP, SECURITY_READ_MAP,
  LIBRARY_TEXT_SKIP_KINDS, WRITING_LIBRARY_SECTIONS, STORE_F_KINDS, STORE_F_BYTES, STORE_F_WRITERS,
  libraryPlan, libraryTextSkips, storeFBlock, storeFWriteErrors, writingRecordErrors,
} from "../../scripts/personal-agent.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const AGENT = path.join(ROOT, "scripts", "personal-agent.js");
const lf = t => String(t).replace(/\r\n/g, "\n");
const reads = s => [].concat(EXTRA_READS[s] ?? []);
const PHRASE = "Any product management role that manages a team";

const CATALOG = [
  { id: "offering", kind: "career_offering", title: "Store F", section: "goals", trust: "john_confirmed", doc_date: null },
  { id: "term", kind: "market_term", title: "Market term: x", section: "market", trust: "extracted", doc_date: null },
  { id: "works-doc", kind: "document", title: "A work", section: "works", trust: "john_authored", doc_date: null },
];
const planIds = (cap, hits = []) => {
  const { skipSections, skipIds, skipKinds } = libraryTextSkips(cap, CATALOG);
  const wanted = new Set([...(WRITING_LIBRARY_SECTIONS[cap] ?? []), "market", "goals"]);
  const skip = new Set([...(LIBRARY_TEXT_SKIP_KINDS[cap] ?? []), ...skipKinds]);
  return libraryPlan(CATALOG, hits, { wanted, skipKinds: skip, skipSections, skipIds }).map(p => p.id);
};
const term = (id, sightings, last_seen, pad = 0) => ({ id, term: id, sightings, meaning: "m".repeat(pad), matches: "x", in_his_words: "w",
  how_to_use: null, strength: "strong", shortfall: null, last_seen });
const valid = { term: "Product Operations Lead", matches: "ran the product org", in_his_words: "product leadership", strength: "strong" };

async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`${name}: ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agt805-"));
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  const live = Boolean(url && key);

  try {
    await arm("A reads", async () => {
      const slugs = [...new Set([STRATEGY_READ_MAP, WRITING_READ_MAP, READ_MAP, HUMOR_READ_MAP].flatMap(m => Object.keys(m)))];
      assert.ok(slugs.length >= 26, `the four maps carry ${slugs.length} slugs`);
      for (const s of slugs) assert.equal(reads(s)[0], "store_f", `${s} lists store_f first (got ${JSON.stringify(reads(s))})`);
      for (const s of slugs) assert.equal(reads(s).filter(k => k === "store_f").length, 1, `${s} lists store_f once`);
      for (const s of Object.keys(SECURITY_READ_MAP)) assert.ok(!reads(s).includes("store_f"), `control: ${s} does not read store_f`);
      assert.deepEqual(reads("career-linkedin-alerts"), ["store_f", "competitors"], "the alert review reads store_f then competitors");
    });

    await arm("B text plan", async () => {
      const w = planIds("writing-draft", [{ source_id: "offering", section_id: null, score: 9 }, { source_id: "term", section_id: null, score: 8 }]);
      assert.ok(!w.includes("offering") && !w.includes("term"), `writing-draft text plan drops STORE_F_KINDS (got ${JSON.stringify(w)})`);
      assert.ok(w.includes("works-doc"), "control: writing-draft keeps the works item");
      assert.deepEqual([...libraryTextSkips("writing-draft", CATALOG).skipKinds].sort(), [...STORE_F_KINDS].sort(), "a store_f slug skips both kinds");
      assert.equal(libraryTextSkips("security-advise", CATALOG).skipKinds.size, 0, "control: a security slug skips no store F kind");
      const { skipSections, skipIds, skipKinds } = libraryTextSkips("security-advise", CATALOG);
      const sec = libraryPlan(CATALOG, [{ source_id: "offering", section_id: null, score: 9 }], { wanted: new Set(["market"]), skipKinds, skipSections, skipIds }).map(p => p.id);
      assert.ok(sec.includes("offering") && sec.includes("term"), `control: the security plan keeps both kinds (got ${JSON.stringify(sec)})`);
    });

    await arm("C cap", async () => {
      const offering = { id: "offering", title: "Store F", text: "O".repeat(4000) };
      const terms = [term("rare-old", 1, "2026-01-01", 9000), term("often", 5, "2026-10-01", 9000), term("rare-new", 1, "2026-11-01", 9000), term("mid", 3, "2026-09-01", 9000)];
      const b = storeFBlock(offering, terms, STORE_F_BYTES);
      assert.deepEqual(b.terms.map(t => t.id), ["often", "mid"], `the least-sighted (oldest first) drop past the cap (got ${JSON.stringify(b.terms.map(t => t.id))})`);
      assert.equal(b.terms_dropped, 2);
      assert.ok(Buffer.byteLength(JSON.stringify(b)) <= STORE_F_BYTES, "the block is under STORE_F_BYTES");
      assert.deepEqual(b.offering, offering, "the offering is byte-same");
      assert.ok(!("ids" in JSON.parse(JSON.stringify(b))), "the internal id list is not serialized");
      assert.deepEqual(b.ids, ["offering", "often", "mid"]);
      const huge = storeFBlock({ ...offering, text: "O".repeat(STORE_F_BYTES + 5000) }, terms);
      assert.equal(huge.offering.text.length, STORE_F_BYTES + 5000, "an offering over the cap alone is never cut");
      assert.equal(huge.terms.length, 0);
      const small = storeFBlock(offering, [term("a", 1, "2026-11-01")]);
      assert.equal(small.terms_dropped, 0, "control: under the cap nothing drops");
      assert.equal(storeFBlock(null, []), null, "no offering and no terms is null");
    });

    await arm("D guard", async () => {
      for (const k of ["term", "matches", "in_his_words", "strength"]) {
        const { [k]: _, ...rest } = valid;
        const e = storeFWriteErrors({ records_to_write: [], market_terms: [rest] }, "career-posting-review");
        assert.ok(e.some(x => x.includes(`needs ${k}`)), `a term missing ${k} is refused (got ${JSON.stringify(e)})`);
      }
      assert.ok(storeFWriteErrors({ market_terms: [{ ...valid, strength: "partial" }] }, "writing-tailor").some(x => /shortfall/.test(x)), "partial with no shortfall is refused");
      assert.ok(storeFWriteErrors({ market_terms: [{ ...valid, strength: "maybe" }] }, "writing-tailor").some(x => /strength must be/.test(x)), "an unknown strength is refused");
      assert.ok(storeFWriteErrors({ records_to_write: [], market_terms: [valid] }, "humor-weekly-draft").some(x => /reads store F only/.test(x)), "a humor answer carrying market_terms is refused");
      assert.ok(storeFWriteErrors({ records_to_write: [{ kind: "career_offering", title: "x" }] }, "career-posting-review").some(x => /never written directly/.test(x)), "a career_offering record is refused");
      assert.ok(storeFWriteErrors({ records_to_write: [{ kind: "market_term", title: "x" }] }, "strategy-advise").some(x => /never written directly/.test(x)), "a market_term record is refused");
      assert.deepEqual(storeFWriteErrors({ records_to_write: [], market_terms: [valid, { ...valid, strength: "partial", shortfall: "no budget" }] }, "career-posting-review"), [], "control: valid terms on a writer slug pass");
      assert.deepEqual(storeFWriteErrors({ records_to_write: [{ kind: "draft", title: "x" }] }, "humor-weekly-draft"), [], "control: a humor answer with no market_terms passes");
      assert.ok(STORE_F_WRITERS.every(s => !(s in HUMOR_READ_MAP)), "no humor slug writes");
      const prop = { target: "store_f", section: "Target roles", current: "a", proposed: "b", reason: "r", source: "s" };
      assert.ok(writingRecordErrors("proposal", prop).some(x => /data\.size/.test(x)), "a store_f proposal with no size is refused");
      assert.deepEqual(writingRecordErrors("proposal", { ...prop, size: "small" }), [], "control: a sized store_f proposal passes");
    });

    const svc = { apikey: key, Authorization: `Bearer ${key}` };
    const get = async q => {
      const r = await fetch(`${url}/rest/v1/${q}`, { headers: svc });
      assert.equal(r.status, 200, `GET ${q.split("?")[0]} HTTP ${r.status}`);
      return r.json();
    };

    await arm("E live renders", async () => {
      if (!live) {
        notRun("AGT-805 arm E (four store_f renders and the trenton control)",
          "SUPABASE_URL + SUPABASE_SERVICE_KEY absent -- the Library is unreadable here, so the live half is UNVERIFIED. Arms A-D DID run. Credentialed run: STANDARDS.md Section 2 rule 5");
        return;
      }
      const offer = await get("personal_sources?kind=eq.career_offering&status=eq.current&select=id");
      assert.equal(offer.length, 1, "exactly one current career_offering");
      const id = offer[0].id;
      const count = (hay, needle) => hay.split(needle).length - 1;
      const render = (agent, cap, ask) => {
        const out = path.join(tmp, `${agent}.md`);
        const r = spawnSync(process.execPath, [AGENT, "--render", `--agent=${agent}`, `--capability=${cap}`, ...(ask ? [`--ask=${ask}`] : []), `--out=${out}`, "--json"],
          { encoding: "utf8", env: { ...process.env }, maxBuffer: 1 << 26, timeout: 240000 });
        assert.equal(r.status, 0, `${cap} render exits 0 (got ${r.status}: ${(r.stderr ?? "").slice(-400)})`);
        return { bytes: JSON.parse(r.stdout.trim().split("\n").pop()).prompt_bytes, lines: lf(fs.readFileSync(out, "utf8")).split("\n") };
      };
      const sizes = [];
      for (const [agent, cap, ask] of [["laura", "writing-draft", "LinkedIn headline"], ["harry", "strategy-advise", "which roles fit"],
        ["jerry", "career-posting-review", null], ["dilbert", "humor-weekly-draft", null]]) {
        const { bytes, lines } = render(agent, cap, ask);
        const si = lines.findIndex(l => l.startsWith("store_f: "));
        assert.ok(si >= 0, `${cap}: the render carries a store_f key`);
        const sf = JSON.parse(lines[si].slice("store_f: ".length));
        assert.ok(sf?.offering?.text?.includes(PHRASE), `${cap}: store_f.offering.text carries the target-roles line`);
        assert.equal(sf.offering.id, id, `${cap}: store_f names the current offering`);
        const li = lines.findIndex(l => l.startsWith("library: "));
        const context = lines.filter((l, i) => i !== li).join("\n") + (li >= 0 ? "\n" + JSON.stringify(JSON.parse(lines[li].slice("library: ".length)).text) : "");
        assert.equal(count(context, id), 1, `${cap}: the career_offering id appears exactly once outside the Library catalog`);
        sizes.push(`${cap} ${bytes}`);
      }
      const t = render("trenton", "security-advise", null);
      assert.ok(t.lines.findIndex(l => l.startsWith("store_f: ")) < 0, "control: the security-advise render carries no store_f key");
      console.log(`    E renders: ${sizes.join(", ")}; security-advise ${t.bytes}`);
    });

    await arm("F live intents", async () => {
      if (!live) {
        notRun("AGT-805 arm F (the writer intents)", "SUPABASE_URL + SUPABASE_SERVICE_KEY absent -- the intent rows are unreadable here, UNVERIFIED");
        return;
      }
      const caps = await get(`capabilities?slug=in.(${STORE_F_WRITERS.join(",")})&select=slug,default_intent_slug`);
      assert.equal(new Set(caps.map(c => c.slug)).size, STORE_F_WRITERS.length, `every writer slug has a capabilities row (got ${caps.length})`);
      const intents = [...new Set(caps.map(c => c.default_intent_slug).filter(Boolean))];
      const rows = await get(`skill_profiles?slug=in.(${intents.join(",")})&select=slug,method`);
      for (const c of caps) {
        const row = rows.find(r => r.slug === c.default_intent_slug);
        assert.ok(row, `${c.slug}: its intent ${c.default_intent_slug} exists`);
        assert.ok(String(row.method ?? "").includes("STORE F VOCABULARY"), `${c.slug}: intent ${row.slug} carries STORE F VOCABULARY`);
      }
    });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  if (failures.length) throw new Error(failures.join(" | "));
}

export default run;
selfRun(import.meta.url, run);
