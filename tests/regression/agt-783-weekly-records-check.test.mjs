// DeepBench v7.0.1107 | tests/regression/agt-783-weekly-records-check.test.mjs | AGT-783 -- the weekly review reads the Library's principal-authored identity items first, and its Intent Skill row carries the company records check
//
// FEATURE: AGT-783 -- a per-capability read-first rule in scripts/personal-agent.js (LIBRARY_READ_FIRST, libraryFirst,
// libraryPlan's `first` option), the approved step appended to one Intent Skill row through a generated mirror, and
// one runbook line. Kickoff: docs/kickoffs/v7.0.1107-AGT-783-weekly-records-check.md. Design record:
// docs/design/RMV-COMPANY-PROFILE-1121.md sections 11, 11a (the step, verbatim) and 11b (the read).
//
// WHAT EACH ARM GRADES (pattern:162 -- the change, never the live census):
//   A  the rule: the map is data (capability -> sections + trust, nothing else), its capabilities read the Library,
//      the selected items lead the plan in trust order, a hit on one of them is not read twice, a skipped kind and a
//      denied item never lead, and EVERY capability absent from the map plans exactly as the pre-change algorithm
//      (kept below as planBefore) -- with hits and without.
//   B  the mirror: its bytes are the generated ones (sha256), the step it appends is the design record's line, it is
//      gated on the row's md5, and the text a cycle sends names no statement the connector asks a human about.
//   C  the runbook: the accepted-difference line sits once, outside every routine prompt block.
//   D  live, through the real render: the row holds the step once; one weekly-review render leads its Library text
//      with every selected item, each unsectioned one whole, inside LIBRARY_BYTES; the prompt carries the step once
//      and each of the three company records once. The four texts seeded on 2026-11-21 are counted by md5 and
//      REPORTED, never failed: a Page edit versions an item, and the principal's edit is not a regression.
// BASELINE: new file; on the unchanged tree scripts/personal-agent.js exports no libraryFirst and the import fails.

import assert from "assert";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { askedStatements, upText } from "../../scripts/migration-statements.js";
import {
  LIBRARY_READ_FIRST, LIBRARY_SECTIONS, WRITING_LIBRARY_SECTIONS, LIBRARY_SECTION_NAMES, LIBRARY_TRUST,
  LIBRARY_TEXT_SKIP_KINDS, LIBRARY_BYTES, LIBRARY_ITEM_CHARS, EXTRA_READS,
  libraryFirst, libraryPlan, libraryAllowed, libraryTextSkips, trustOrder, cutItem,
} from "../../scripts/personal-agent.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const AGENT = path.join(ROOT, "scripts", "personal-agent.js");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const hash = (alg, s) => crypto.createHash(alg).update(String(s), "utf8").digest("hex");
const count = (hay, needle) => String(hay).split(needle).length - 1;

const CAP = "strategy-weekly-review";
const READER = "harry";
const INTENT = "sc-weekly-review-intent";
const MIRROR_REL = "docs/design/agt-783-weekly-records-check.sql";
const DESIGN_REL = "docs/design/RMV-COMPANY-PROFILE-1121.md";
const RUNBOOK_REL = "docs/runbooks/strategy-agent.md";
const MIRROR_SHA256 = "d98408428a0a89a13ae4299ac1689725ffe0b5fbf5455f16859260c23443d863";
const OLD_MD5 = "502b11cbb80b21c000ad39a8b819c978";
const STEP_NAME = "COMPANY RECORDS CHECK: ";
const RECORDS = ["rmv-company-profile", "rmv-offerings", "rmv-consulting-automation"];
// md5 of the four live-wording bodies as loaded 2026-11-21. Reported, never asserted.
const SEEDED = ["53a1c97e8685f9e67bc1f63ee08a19f8", "18beadd446cec71d5a64b670bc461616", "fc8db2bc2582e21e619cdadd53163a79", "886099320939db4a462b7c9f8e471269"];
const RUNBOOK_LINE = "6c. **An accepted difference (AGT-783).**";

// The step, read from the design record: the one line of section 11a that opens with its own name.
function approvedStep() {
  const lines = read(DESIGN_REL).split("\n");
  const at = lines.findIndex(l => l.startsWith("### 11a. "));
  assert.ok(at !== -1, `${DESIGN_REL} holds no section 11a`);
  let end = lines.findIndex((l, i) => i > at && /^#{1,3} /.test(l));
  if (end === -1) end = lines.length;
  const found = lines.slice(at + 1, end).filter(l => l.startsWith(STEP_NAME));
  assert.strictEqual(found.length, 1, `section 11a must hold the step exactly once, found ${found.length}`);
  return found[0].replace(/\s+$/, "");
}

// The plan as scripts/personal-agent.js built it BEFORE this ticket (origin/dev 67383f5b), kept as the control.
function planBefore(catalog, hits, { wanted = new Set(), skipKinds = new Set(), skipSections = new Set(), skipIds = new Set() } = {}) {
  const byId = new Map(catalog.map(c => [c.id, c]));
  const eligible = c => c && !skipKinds.has(c.kind) && !(c.section && skipSections.has(c.section)) && !skipIds.has(c.id);
  const best = new Map(), whole = new Set(), sections = new Map();
  for (const h of hits ?? []) {
    const c = byId.get(h.source_id);
    if (!eligible(c)) continue;
    best.set(c.id, Math.max(best.get(c.id) ?? -Infinity, Number(h.score) || 0));
    if (h.section_id == null) whole.add(c.id);
    else { if (!sections.has(c.id)) sections.set(c.id, new Set()); sections.get(c.id).add(h.section_id); }
  }
  const trustRank = new Map(trustOrder(catalog).map((c, i) => [c.id, i]));
  const hitIds = [...best.keys()].sort((a, b) => best.get(b) - best.get(a) || trustRank.get(a) - trustRank.get(b));
  const inWanted = c => Boolean(c.section && wanted.has(c.section));
  const plan = hitIds.map(id => ({ id, sections: whole.has(id) || inWanted(byId.get(id)) ? null : sections.get(id) }));
  const seen = new Set(hitIds);
  for (const c of trustOrder(catalog.filter(c => eligible(c) && inWanted(c) && !seen.has(c.id)))) plan.push({ id: c.id, sections: null });
  return plan;
}
const flat = plan => plan.map(p => [p.id, p.sections ? [...p.sections].sort() : null]);

const CATALOG = [
  { id: "id-auth-old", kind: "document", section: "identity", trust: "john_authored", doc_date: "2026-01-01", sensitivity: "reusable" },
  { id: "id-auth-new", kind: "document", section: "identity", trust: "john_authored", doc_date: "2026-11-20", sensitivity: "reusable" },
  { id: "id-confirmed", kind: "confirmed_fact", section: "identity", trust: "john_confirmed", doc_date: "2026-03-01", sensitivity: "reusable" },
  { id: "id-page", kind: "linkedin_profile", section: "identity", trust: "public_page", doc_date: "2026-11-20", sensitivity: "reusable" },
  { id: "id-resume", kind: "resume", section: "identity", trust: "john_authored", doc_date: "2026-11-20", sensitivity: "reusable" },
  { id: "id-denied", kind: "document", section: "identity", trust: "john_authored", doc_date: "2026-11-21", sensitivity: "reusable" },
  { id: "val-auth", kind: "document", section: "value", trust: "john_authored", doc_date: "2026-05-01", sensitivity: "reusable" },
  { id: "val-ext", kind: "document", section: "value", trust: "extracted", doc_date: "2026-05-01", sensitivity: "reusable" },
  { id: "mkt-out", kind: "document", section: "market", trust: "outside", doc_date: "2026-05-01", sensitivity: "reusable" },
  { id: "goal", kind: "goals", section: "goals", trust: "john_authored", doc_date: "2026-05-01", sensitivity: "reusable" },
  { id: "facts", kind: "confirmed_fact", section: "facts", trust: "john_confirmed", doc_date: "2026-05-01", sensitivity: "reusable" },
  { id: "unsectioned", kind: "document", section: null, trust: "john_authored", doc_date: "2026-05-01", sensitivity: "reusable" },
];
const HITS = [
  { source_id: "mkt-out", section_id: null, score: 9 },
  { source_id: "id-auth-old", section_id: "s1", score: 7 },
  { source_id: "val-ext", section_id: null, score: 5 },
  { source_id: "id-page", section_id: "p1", score: 3 },
];
const optsFor = (cap, catalog) => {
  const { skipSections, skipIds } = libraryTextSkips(cap, catalog);
  return {
    wanted: new Set(LIBRARY_SECTIONS[cap] ?? WRITING_LIBRARY_SECTIONS[cap] ?? []),
    skipKinds: new Set(LIBRARY_TEXT_SKIP_KINDS[cap] ?? []),
    skipSections, skipIds,
  };
};

function armA_rule() {
  const results = [];
  const readers = [...Object.keys(LIBRARY_SECTIONS), ...Object.keys(WRITING_LIBRARY_SECTIONS)];
  const named = Object.keys(LIBRARY_READ_FIRST);
  assert.ok(named.includes(CAP), `${CAP} must name a read-first rule`);
  for (const [cap, rule] of Object.entries(LIBRARY_READ_FIRST)) {
    assert.ok(readers.includes(cap), `${cap} names a read-first rule and reads no Library sections`);
    assert.ok([].concat(EXTRA_READS[cap] ?? []).includes("library"), `${cap} names a read-first rule and does not read the Library`);
    assert.deepStrictEqual(Object.keys(rule).sort(), ["sections", "trust"], `${cap}: a rule is sections + trust and nothing else (no id, no reader)`);
    assert.ok(rule.sections.length && rule.sections.every(s => LIBRARY_SECTION_NAMES.includes(s)), `${cap}: every section is a Library section`);
    assert.ok(rule.trust.length && rule.trust.every(t => LIBRARY_TRUST.includes(t)), `${cap}: every trust level is a Library trust level`);
  }
  assert.deepStrictEqual(LIBRARY_READ_FIRST[CAP], { sections: ["identity"], trust: ["john_confirmed", "john_authored"] }, "the ruled selection: identity items of principal trust");
  results.push("the-map-is-data-and-names-only-library-readers");

  // The deny list leaves the catalog before anything is selected.
  const allowed = libraryAllowed(CATALOG, ["id-denied"], CAP);
  const first = libraryFirst(CAP, allowed);
  assert.deepStrictEqual(first, ["id-confirmed", "id-auth-new", "id-resume", "id-auth-old"],
    "selected: identity items of principal trust, highest trust first, then newest, then id; the public-page item and the denied item are not selected");
  assert.deepStrictEqual(libraryFirst(CAP, CATALOG).includes("id-denied"), true, "control: without the deny list the denied item WOULD be selected");
  const opts = optsFor(CAP, allowed);
  assert.ok(opts.skipKinds.has("resume"), "control: the weekly review skips resumes as text");
  const plan = libraryPlan(allowed, HITS, { ...opts, first });
  assert.deepStrictEqual(plan.map(p => p.id), ["id-confirmed", "id-auth-new", "id-auth-old", "mkt-out", "val-ext", "id-page", "val-auth"],
    "the selected items lead (a skipped kind never leads), then hits by score, then the wanted sections by trust");
  assert.deepStrictEqual(plan.slice(0, 3).map(p => p.sections), [null, null, null], "a selected item is read whole, even when the search reached one section of it");
  assert.strictEqual(plan.filter(p => p.id === "id-auth-old").length, 1, "an item that is both selected and a hit is read once");
  assert.deepStrictEqual([...plan.find(p => p.id === "id-page").sections], ["p1"], "control: an unselected section hit is still read by its sections");
  const before = planBefore(allowed, HITS, opts).map(p => p.id);
  assert.deepStrictEqual(before, ["mkt-out", "id-auth-old", "val-ext", "id-page", "val-auth"], "control: before this ticket the same read led with the hits and never read two of the three");
  results.push("selected-items-lead-once-whole-under-the-deny-list-and-the-skips");

  // Every capability absent from the map: the same plan as before, with hits and without.
  let checked = 0;
  for (const cap of readers.filter(c => !named.includes(c))) {
    assert.deepStrictEqual(libraryFirst(cap, CATALOG), [], `${cap} names no rule, so it selects nothing`);
    const o = optsFor(cap, CATALOG);
    for (const hits of [HITS, []]) {
      const now = libraryPlan(CATALOG, hits, { ...o, first: libraryFirst(cap, CATALOG) });
      assert.deepStrictEqual(flat(now), flat(planBefore(CATALOG, hits, o)), `${cap}: the plan must be exactly the pre-change plan (${hits.length} hits)`);
      assert.deepStrictEqual(flat(libraryPlan(CATALOG, hits, o)), flat(now), `${cap}: omitting \`first\` is the same as an empty one`);
      checked++;
    }
  }
  assert.ok(checked >= 20, `control: the unchanged-plan check ran over the other capabilities (${checked} plans)`);
  assert.deepStrictEqual(libraryFirst("no-such-capability", CATALOG), [], "an unknown capability selects nothing");
  assert.deepStrictEqual(libraryFirst(CAP, []), [], "an empty catalog selects nothing");
  results.push("every-other-capability-plans-exactly-as-before");
  return results;
}

function armB_mirror() {
  const results = [];
  assert.ok(fs.existsSync(path.join(ROOT, MIRROR_REL)), `${MIRROR_REL} does not exist -- the mirror is this ticket's record of what was applied`);
  const mirror = read(MIRROR_REL);
  assert.strictEqual(hash("sha256", mirror), MIRROR_SHA256, `${MIRROR_REL} is not the generated file (sha256 differs) -- regenerate it from the design record, never edit or retype it`);
  const step = approvedStep();
  const bodies = [...mirror.matchAll(/\$step\$([\s\S]*?)\$step\$/g)].map(m => m[1]);
  assert.strictEqual(bodies.length, 3, `the mirror quotes the step three times (the append, the gate, the undo), parsed ${bodies.length}`);
  assert.ok(bodies.every(b => b === step), "every quoted step in the mirror is the design record's line, character for character");
  assert.notStrictEqual(step.replace("substance only", "substance"), step, "control setup: the phrase to reword is in the step");
  assert.ok(![step.replace("substance only", "substance")].every(b => b === step), "control: a reworded step is caught");
  results.push("the-mirror-is-the-generated-bytes-and-appends-the-approved-step");

  const up = upText(mirror);
  const bare = up.split("\n").filter(l => !l.trim().startsWith("--")).join("\n").replace(/\$step\$[\s\S]*?\$step\$/g, "''");
  assert.strictEqual(count(bare, "update public."), 1, "the text a cycle sends holds exactly one update");
  assert.ok(/update public\.skill_profiles\s+set method = method \|\| E'\\n\\n' \|\| ''/.test(bare), "the update appends to method, never replaces it");
  assert.strictEqual(count(bare, `md5(method) = '${OLD_MD5}'`) + count(bare, `md5(sp.method) = '${OLD_MD5}'`), 2, "the before-image and the update are both gated on the row's md5 at design");
  assert.ok(bare.indexOf("insert into public.runner_before_images") !== -1 && bare.indexOf("insert into public.runner_before_images") < bare.indexOf("update public."), "the before-image is taken before the update");
  assert.ok(!/personal_sources|agent_skill_pins|is_active/.test(bare), "the mirror touches no Library item, no pin and no switch");
  assert.deepStrictEqual(askedStatements(mirror), [], "the text a cycle sends must name no statement the connector asks a human about");
  assert.ok(/^-- down$/m.test(mirror), "the hand undo sits under the down marker");
  results.push("the-mirror-is-md5-gated-additive-and-images-the-row-first");
  return results;
}

function armC_runbook() {
  const lines = read(RUNBOOK_REL).split("\n");
  const held = lines.map((l, i) => [l, i]).filter(([l]) => l.startsWith(RUNBOOK_LINE));
  assert.strictEqual(held.length, 1, `${RUNBOOK_REL} must hold the accepted-difference line exactly once, found ${held.length}`);
  const [line, at] = held[0];
  assert.ok(line.includes("`correction`") && /what differs, accepted, date/.test(line), "the line names the correction record and its three parts");
  const begins = lines.map((l, i) => [l, i]).filter(([l]) => /^<!-- [A-Z-]+-PROMPT-BEGIN -->$/.test(l)).map(([, i]) => i);
  const ends = lines.map((l, i) => [l, i]).filter(([l]) => /^<!-- [A-Z-]+-PROMPT-END -->$/.test(l)).map(([, i]) => i);
  assert.ok(begins.length >= 4 && begins.length === ends.length, "control: the routine prompt blocks are found");
  assert.ok(!begins.some((b, k) => at > b && at < ends[k]), "the line sits outside every routine prompt block (a block is a routine's copy; this ticket touches no routine)");
  return ["the-runbook-carries-the-accepted-difference-line-outside-the-routine-blocks"];
}

async function armD_live() {
  const results = [];
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!url || !key) {
    notRun("AGT-783 arm D (the row holds the step once; a real weekly-review render leads its Library text with the selected items, whole, inside the cap; the prompt carries the step and the three records once each)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent -- read them from public.runner_secrets by name and export them inline, per docs/STANDARDS.md Section 2 rule 5.");
    return results;
  }
  const svc = { apikey: key, Authorization: `Bearer ${key}` };
  const rest = async q => {
    const r = await fetch(`${url}/rest/v1/${q}`, { headers: svc });
    if (!r.ok) assert.fail(`GET /rest/v1/${q} failed: HTTP ${r.status} ${await r.text()}`);
    return r.json();
  };
  const step = approvedStep();

  const rows = await rest(`skill_profiles?slug=eq.${INTENT}&select=slug,skill_type_slug,method`);
  assert.strictEqual(rows.length, 1, `${INTENT} must be exactly one row, got ${rows.length}`);
  assert.strictEqual(count(rows[0].method, step), 1, `${INTENT}'s method must hold the approved step EXACTLY ONCE, found ${count(rows[0].method, step)} -- has the mirror been applied?`);
  results.push("live-the-row-holds-the-step-once");

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agt783-"));
  try {
    const out = path.join(tmp, "render.md");
    const env = { ...process.env };
    delete env.OPENAI_API_KEY; // full-text ranking: the selected items must lead whatever ranks the rest
    const r = spawnSync(process.execPath, [AGENT, "--render", `--agent=${READER}`, `--capability=${CAP}`, `--out=${out}`, "--json"],
      { encoding: "utf8", env, maxBuffer: 1 << 26, timeout: 240000 });
    assert.strictEqual(r.status, 0, `${CAP} renders (got ${r.status}: ${(r.stderr ?? "").slice(-400)})`);
    const text = fs.readFileSync(out, "utf8").replace(/\r\n/g, "\n");
    const line = text.split("\n").find(l => l.startsWith("library: "));
    assert.ok(line, "the render carries a library block");
    const lib = JSON.parse(line.slice("library: ".length));

    const skip = new Set(LIBRARY_TEXT_SKIP_KINDS[CAP] ?? []);
    const byId = new Map(lib.catalog.map(c => [c.id, c]));
    const expected = libraryFirst(CAP, lib.catalog).filter(id => !skip.has(byId.get(id).kind));
    assert.ok(expected.length >= 1, "the live catalog holds at least one item the rule selects");
    assert.deepStrictEqual(lib.text.slice(0, expected.length).map(t => t.id), expected,
      `the render's Library text must LEAD with the ${expected.length} selected item(s), in trust order`);
    assert.ok(lib.text_bytes <= LIBRARY_BYTES, `the Library text stays inside LIBRARY_BYTES (${lib.text_bytes} of ${LIBRARY_BYTES})`);
    assert.ok(lib.text.length > expected.length, "control: the ranked read still follows the selected items");
    results.push("live-the-selected-items-lead-the-render-inside-the-cap");

    const ids = expected.map(encodeURIComponent).join(",");
    const bodies = new Map((await rest(`personal_sources?id=in.(${ids})&select=id,body`)).map(b => [b.id, String(b.body ?? "")]));
    const sectioned = new Set((await rest(`personal_source_sections?source_id=in.(${ids})&select=source_id`)).map(s => s.source_id));
    let whole = 0;
    for (const id of expected) {
      const item = lib.text.find(t => t.id === id);
      if (sectioned.has(id)) { assert.ok(String(item.text ?? "").length > 0, `selected item ${id} carries its sections' text`); continue; }
      assert.strictEqual(item.text, cutItem(bodies.get(id)), `selected item ${id} must be carried as its body (cut only past ${LIBRARY_ITEM_CHARS} characters)`);
      if (bodies.get(id).length <= LIBRARY_ITEM_CHARS) whole++;
    }
    const seeded = SEEDED.filter(m => lib.text.some(t => hash("md5", t.text) === m)).length;
    console.log(`  [AGT-783] live: ${expected.length} selected item(s) lead, ${whole} unsectioned and whole, ${seeded} of ${SEEDED.length} seeded live texts whole; library text ${lib.text_bytes} of ${LIBRARY_BYTES} bytes over ${lib.text.length} items (information)`);
    if (seeded !== SEEDED.length) {
      notRun(`the seeded-text count (${seeded} of ${SEEDED.length})`, "a live-wording item has been versioned or relabelled since 2026-11-21 -- the principal edits his own wording; reported, not failed");
    }
    results.push("live-each-unsectioned-selected-item-is-carried-whole");

    assert.strictEqual(count(text, step), 1, `the assembled prompt must carry the approved step EXACTLY ONCE, found ${count(text, step)}`);
    const recs = await rest(`skill_profiles?slug=in.(${RECORDS.join(",")})&select=slug,method`);
    assert.deepStrictEqual(recs.map(x => x.slug).sort(), [...RECORDS].sort(), "the three company records exist");
    for (const rec of recs) {
      const body = String(rec.method).trim();
      assert.strictEqual(count(text, body), 1, `the assembled prompt must carry ${rec.slug} EXACTLY ONCE, found ${count(text, body)}`);
    }
    results.push("live-the-prompt-carries-the-step-and-each-record-once");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  return results;
}

async function run() {
  const results = [];
  results.push(...armA_rule());
  results.push(...armB_mirror());
  results.push(...armC_runbook());
  results.push(...(await armD_live()));
  return results;
}

selfRun(import.meta.url, run);
export default run;
