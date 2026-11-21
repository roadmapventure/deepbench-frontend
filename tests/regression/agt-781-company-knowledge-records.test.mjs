// DeepBench v7.0.1106 | tests/regression/agt-781-company-knowledge-records.test.mjs | AGT-781 -- three company knowledge records and their 52 pins: the seed mirror carries the approved text, and the rows are in use
//
// FEATURE: AGT-781 -- three inline knowledge Skill rows (company profile, offerings, consulting automation) beside the
// north star, each pinned to the sixteen north-star agents plus the consulting writer, and that writer's own
// north-star pin. Data rows, one seed mirror, this guard; no code change.
// Kickoff: docs/kickoffs/v7.0.1106-AGT-781-company-knowledge-records.md. Design record with the approved texts:
// docs/design/RMV-COMPANY-PROFILE-1121.md sections 9a, 9b, 9c.
//
// WHAT EACH ARM GRADES (pattern:162 -- the change, never the live census):
//   A  the mirror: its bytes are the generated ones (sha256), each record is the approved text (md5) and every line
//      of it is a line of the design record, it ends with the closing rule, it carries no editorial line, the pin
//      set is exactly the ruled 52, and the text a cycle sends names no statement the connector asks a human about.
//   B  live: the three rows exist as inline knowledge, every ruled pin is held at its order, the agent the ruling
//      left out holds none of the three. A record edited since the seed is REPORTED, not failed: the principal
//      changes a record on his word, and the row's own before-image is the history.
//   C  live, both ways: a real assemblePrompt() carries each record once for an agent that had no pin before this
//      ticket, and never for the agent left out.
// BASELINE: new file; on the unchanged tree the mirror does not exist and arm A cannot pass.

import assert from "assert";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { askedStatements, upText } from "../../scripts/migration-statements.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const hash = (alg, s) => crypto.createHash(alg).update(String(s), "utf8").digest("hex");

const MIRROR_REL = "docs/design/agt-781-company-knowledge-records.sql";
const DESIGN_REL = "docs/design/RMV-COMPANY-PROFILE-1121.md";
const MIRROR_SHA256 = "28aafd46ccd1103e40023ee5ddd5cffb8dbaca703ce56ad4d31d0db75d59d1dd";
const NS = "deepbench-north-star";
const RECORDS = [
  { slug: "rmv-company-profile", order: 10, md5: "f75e38ad85a1ee3b811a739dee5b2de6" },
  { slug: "rmv-offerings", order: 11, md5: "3f5156283e521a62942097c2968d3669" },
  { slug: "rmv-consulting-automation", order: 12, md5: "1a77b53425c4eaec780004221536e0d0" },
];
const AGENTS = ["architect", "auditor", "builder", "designer", "devmanager", "dilbert", "harry", "jerry", "laura",
  "nathan", "prioritizer", "researcher", "ticketowner", "trenton", "verifier", "victoria", "malcolm"];
const NEW_READER = "malcolm";       // held no pin before this ticket
const LEFT_OUT = "paul-dy86jo";     // the ruling: this agent gets nothing
const PROVENANCE = /\s*\(The principal[^()]*\)\s*$/;

// The ruled pin set, as `agent/slug/order` keys: 17 x 3, plus the new reader's north star at 0.
const expectedPins = () => [
  ...AGENTS.flatMap(a => RECORDS.map(r => `${a}/${r.slug}/${r.order}`)),
  `${NEW_READER}/${NS}/0`,
].sort();

// The mirror's own pin set, read from its INSERT (section 3): the agent array crossed with the record values.
function mirrorPins(up) {
  const at = up.indexOf("insert into public.agent_skill_pins");
  assert.ok(at !== -1, "the mirror holds no agent_skill_pins insert");
  const stmt = up.slice(at, up.indexOf(";", at));
  const agents = [...stmt.match(/unnest\(array\[([^\]]*)\]\)/)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
  const recs = [...stmt.matchAll(/\('(rmv-[a-z-]+)', (\d+)\)/g)].map(m => [m[1], Number(m[2])]);
  const extra = [...stmt.matchAll(/union all select '([^']+)', '([^']+)', (\d+)/g)].map(m => `${m[1]}/${m[2]}/${m[3]}`);
  return [...agents.flatMap(a => recs.map(([s, o]) => `${a}/${s}/${o}`)), ...extra].sort();
}

// The three record bodies, read from the mirror's dollar-quoted `method` values, in file order.
const mirrorTexts = up => [...up.matchAll(/\$rec\$([\s\S]*?)\$rec\$/g)].map(m => m[1]);

function armA_mirror() {
  const results = [];
  assert.ok(fs.existsSync(path.join(ROOT, MIRROR_REL)), `${MIRROR_REL} does not exist -- the seed mirror is this ticket's record of what was applied`);
  const mirror = read(MIRROR_REL);
  assert.strictEqual(hash("sha256", mirror), MIRROR_SHA256,
    `${MIRROR_REL} is not the generated file (sha256 differs) -- regenerate it from the design record, never edit or retype it`);
  results.push("mirror-is-the-generated-bytes");

  const up = upText(mirror);
  const design = read(DESIGN_REL).split("\n");
  const designLines = new Set(design.map(l => l.replace(PROVENANCE, "").replace(/\s+$/, "")));
  const closingLine = design.find(l => l.startsWith("Closing line: This record wins."));
  assert.ok(closingLine, `${DESIGN_REL} section 9a no longer states the closing rule`);
  const closing = closingLine.slice("Closing line: ".length).trim();

  const texts = mirrorTexts(up);
  assert.strictEqual(texts.length, RECORDS.length, `the mirror must carry ${RECORDS.length} record texts, parsed ${texts.length}`);
  RECORDS.forEach((r, i) => {
    const text = texts[i];
    assert.ok(up.includes(`'${r.slug}'`), `the mirror does not name ${r.slug}`);
    assert.strictEqual(hash("md5", text), r.md5, `${r.slug}: the mirror's text is not the approved text (md5 ${hash("md5", text)})`);
    assert.ok(text.endsWith(`\n\n${closing}`), `${r.slug}: the record must end with the closing rule`);
    const editorial = text.split("\n").filter(l => /\(The principal|^Source:|^Closing line:/.test(l));
    assert.deepStrictEqual(editorial, [], `${r.slug}: an editorial line reached the record`);
    const strangers = text.split("\n").filter(l => l !== "" && l !== closing && !designLines.has(l));
    assert.deepStrictEqual(strangers, [], `${r.slug}: ${strangers.length} line(s) are not lines of ${DESIGN_REL}`);
  });
  results.push("three-records-are-the-approved-text-line-for-line");

  // CONTROL: the line check has teeth -- one reworded line is caught.
  const reworded = texts[0].replace("never \"division\"", "never \"unit\"");
  assert.notStrictEqual(reworded, texts[0], "control setup failed: the phrase to reword is not in record 1");
  assert.ok(reworded.split("\n").some(l => l !== "" && l !== closing && !designLines.has(l)), "control: a reworded line must be a stranger");
  results.push("control-a-reworded-line-is-caught");

  assert.deepStrictEqual(mirrorPins(up), expectedPins(), "the mirror's pin set is not the ruled 52 (17 agents x 3 records, plus one north-star pin)");
  assert.strictEqual(expectedPins().length, 52, "the ruled set is 52 pins");
  assert.ok(!mirrorPins(up).some(k => k.startsWith(`${LEFT_OUT}/`)), `${LEFT_OUT} must hold no pin in the mirror`);
  results.push("mirror-pins-are-exactly-the-ruled-52");

  const bare = up.split("\n").filter(l => !l.trim().startsWith("--")).join("\n").replace(/\$rec\$[\s\S]*?\$rec\$/g, "''");
  assert.ok(!/\bupdate\s+public\./i.test(bare) && !/\bis_active\b/i.test(bare), "the mirror's statements must update nothing and never name is_active");
  assert.deepStrictEqual(askedStatements(mirror), [], "the text a cycle sends must name no statement the connector asks a human about");
  assert.ok(/^-- down$/m.test(mirror) && askedStatements(mirror.replace(/^-- down$/m, "-- undo")).length === 2,
    "control: the two undo statements sit under the down marker and are named the moment the marker is gone");
  results.push("mirror-is-additive-and-its-undo-is-under-the-down-marker");
  return results;
}

async function armB_live() {
  const results = [];
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("the live arms (three inline knowledge rows; the 52 ruled pins at their orders; none of the three for the agent left out; a real assemblePrompt() carrying each record once for the new reader and never for the agent left out)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent -- read them from public.runner_secrets by name and export them inline, per docs/STANDARDS.md Section 2 rule 5.");
    return results;
  }
  const base = url.replace(/\/+$/, "");
  const svc = { apikey: key, Authorization: `Bearer ${key}` };
  const rest = async q => {
    const r = await fetch(`${base}/rest/v1/${q}`, { headers: svc });
    if (!r.ok) assert.fail(`GET /rest/v1/${q} failed: HTTP ${r.status} ${await r.text()}`);
    return r.json();
  };
  const slugs = RECORDS.map(r => r.slug);

  const rows = await rest(`skill_profiles?slug=in.(${slugs.join(",")})&select=slug,skill_type_slug,traits,tenant_id,method`);
  assert.deepStrictEqual(rows.map(r => r.slug).sort(), [...slugs].sort(), `the three records must exist, got ${JSON.stringify(rows.map(r => r.slug))}`);
  for (const row of rows) {
    assert.deepStrictEqual([row.skill_type_slug, row.traits?.source, row.tenant_id], ["knowledge", "inline", null],
      `${row.slug} must be an inline knowledge Skill with no tenant, got ${JSON.stringify([row.skill_type_slug, row.traits, row.tenant_id])}`);
    assert.ok(/This record wins\./.test(String(row.method).split("\n").pop()), `${row.slug} must still end with the closing rule`);
    const want = RECORDS.find(r => r.slug === row.slug).md5;
    if (hash("md5", row.method) !== want) {
      notRun(`${row.slug}: the seeded-text comparison`, `the row's text has been edited since the seed (md5 ${hash("md5", row.method)}, seeded ${want}) -- the principal changes a record on his word; reported, not failed`);
    }
  }
  results.push("live-three-inline-knowledge-records");

  const pins = await rest(`agent_skill_pins?tenant_id=eq.global&agent_id=in.(${[...AGENTS, LEFT_OUT].join(",")})&select=agent_id,skill_profile_slug,display_order`);
  const held = new Set(pins.map(p => `${p.agent_id}/${p.skill_profile_slug}/${p.display_order}`));
  const lacking = expectedPins().filter(k => !held.has(k));
  assert.deepStrictEqual(lacking, [], `${lacking.length} of the 52 ruled pins are not held at their order: ${JSON.stringify(lacking.slice(0, 6))}`);
  const leftOut = pins.filter(p => p.agent_id === LEFT_OUT && slugs.includes(p.skill_profile_slug));
  assert.deepStrictEqual(leftOut, [], `${LEFT_OUT} must hold none of the three records (the ruling), got ${JSON.stringify(leftOut)}`);
  console.log(`  [AGT-781] live: ${rows.length} records / ${pins.length} pins over the 17 agents and the one left out (information, not asserted)`);
  results.push("live-every-ruled-pin-held-and-none-for-the-agent-left-out");

  // C. BOTH WAYS, through the real assembler.
  const { assemblePrompt } = await import("../../api/prompt/db-assembly.js");
  const countsFor = async agent_id => {
    const pr = await assemblePrompt({ agent_id, tenant_id: "global", task_context: { goal: "x" }, include_taught: false });
    return Object.fromEntries([NS, ...slugs].map(s => [s, pr.sections.filter(x => x.slug === `knowledge-${s}`).length]));
  };
  const reader = await countsFor(NEW_READER);
  assert.deepStrictEqual(reader, Object.fromEntries([NS, ...slugs].map(s => [s, 1])),
    `${NEW_READER}'s assembled prompt must carry the north star and each record EXACTLY ONCE, got ${JSON.stringify(reader)}`);
  const out = await countsFor(LEFT_OUT);
  assert.deepStrictEqual(out, Object.fromEntries([NS, ...slugs].map(s => [s, 0])),
    `${LEFT_OUT} is not pinned, so its assembled prompt must carry none of the four, got ${JSON.stringify(out)}`);
  results.push("assembled-the-new-reader-carries-each-record-once-and-the-agent-left-out-none");
  return results;
}

async function run() {
  const results = [];
  results.push(...armA_mirror());
  results.push(...(await armB_live()));
  return results;
}

selfRun(import.meta.url, run);
export default run;
