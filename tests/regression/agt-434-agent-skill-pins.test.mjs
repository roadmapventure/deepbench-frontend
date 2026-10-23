// DeepBench v7.0.892 | tests/regression/agt-434-agent-skill-pins.test.mjs | AGT-542 -- the pinned population grows by one: `dilbert` (HW-01, the Humorist Writer) is created with a `deepbench-north-star` pin of its own, so arm (C)'s census moves 12 -> 13 and the AGENTS list gains him.
// DeepBench v7.0.868 | tests/regression/agt-434-agent-skill-pins.test.mjs | AGT-491 -- the pinned
// population grows by one: `architect` (The Governance Architect, GV-09) is created with a
// `deepbench-north-star` pin of its own, so arm (C)'s census moves 11 -> 12 and the AGENTS list above
// gains that id. Nothing about the RULE changes -- AGT-491 adds no capability and no capability link,
// so the zero-links assertion, the md5 of the north star's own text and the un-reversed 5b4f3dd2 are
// untouched. The arm's own discriminator still fires the same way: left at 11 this file is red at the
// census, and a third pin on the architect is red at 13.
//
// DeepBench v7.0.850 | tests/regression/agt-434-agent-skill-pins.test.mjs | AGT-434 -- north star pinned ONCE per agent; 49 links removed.
//
// FEATURE: AGT-434 -- a Skill every call of an agent must carry is pinned ONCE at agent level and read
// by assemblePrompt(), instead of being linked to every one of that agent's capabilities. Measured
// live 2026-10-11 BEFORE this ticket, through the real assemblePrompt(): `deepbench-north-star` held
// 49 `capability_skill_profiles` links over 11 agents, and api/prompt/db-assembly.js's agent-wide path
// pushes every assigned capability's links with no slug check -- so the same knowledge rendered as 12
// sections in Jerry's assembled prompt, 11 in Nathan's, 2 in the Designer's, 1 for
// designer+design-kickoff and 0 for Susan. John's words: "it should only be pinned once to each agent
// and they know it intametly". AFTER: 1 / 1 / 0 for the all-capabilities path, a single-capability
// call, and an agent with no pin.
//
// THREE ARMS:
//   (A) PURE -- mergePinnedSkills(), the "PINNED WINS" rule: a pin over rows that lack its slug is
//       added FIRST; a pin over rows that DO carry its slug drops those rows and leaves one pinned
//       copy (this is the clause that makes the assembler correct whether or not the links exist, and
//       therefore safe to land before they are removed); two pins naming one slug add it once; no pins
//       returns the same array. No fetch, no env, no database: this arm grades the rule itself.
//   (B) SEAM PROOF -- assemblePrompt() over a stubbed fetch (the dat-004 arm (b) shape). The
//       single-capability path assembles EXACTLY ONE `knowledge-ns` section; the agent-wide path with
//       the slug stubbed onto TWO capabilities -- the shape that rendered it 12 times -- also exactly
//       one; an empty pins read assembles zero; the pinned slug is absent from
//       signature_config.assembled_skill_slugs (the SS19k signature is agent-agnostic and a pin is
//       agent configuration -- .claude/rules/ai-pattern-signature.md); the pins URL is read exactly
//       once, on the agent and tenant asked for; and a 500 warns rather than throws. Labelled a seam
//       proof: no database, no model.
//   (C) LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, else NOT RUN) -- the shipped state: 11 pins over
//       the 11 agents; ZERO capability links left; the north star row still present with md5(method)
//       unchanged; decision 5b4f3dd2 NOT reversed (this ticket must never reverse it -- it images the
//       north star row itself, and the pin table's no-cascade FK is the guard, proven from
//       pg_constraint rather than by a removal probe); and a REAL assemblePrompt() carrying the north
//       star exactly ONCE for jerry agent-wide, exactly once for designer+design-kickoff, and zero
//       times for susan. Read-only -- nothing in this file writes to Supabase (pattern:76).
//
// THE DISCRIMINATOR, and the order it fires in: run against the unchanged tree arm (A) exits 1 at
// once (db-assembly.js exports no mergePinnedSkills). With the assembler shipped and the migration
// applied but the 49 links still present, arm (C) is RED at the links count ALONE -- jerry's ONE
// section already holds, because PINNED WINS does not need the links gone to be correct. Arm (B)'s
// empty-pins case is the other direction: zero pin rows, zero sections.
//
// WHY md5 AND NOT A SUBSTRING. John's rule on the north star row is "do not change the text". A
// contains-check passes on a truncated or appended method; the hash of the whole value does not. The
// expected hash is the one the kickoff carries, measured live before the build.
//
// NO MODEL CALL, NO SPEND.

import assert from "assert";
import crypto from "crypto";
import { selfRun, notRun } from "./_lib/self-run.js";

import { assemblePrompt, mergePinnedSkills } from "../../api/prompt/db-assembly.js";

const NS = "deepbench-north-star";
const MD5 = "bf8ea1d7697b17c2ea189b2ea64241ea";
const DEC = "5b4f3dd2-d072-434f-bef4-edfc7494812e";
const AGENTS = [
  "jerry", "nathan", "victoria", "devmanager", "auditor", "designer",
  "builder", "prioritizer", "verifier", "researcher", "ticketowner",
  // AGT-491: GV-09, the twelfth pinned agent -- the Governance Architect.
  "architect",
  // AGT-542: HW-01, the thirteenth pinned agent.
  "dilbert",
];

const md5 = s => crypto.createHash("md5").update(String(s), "utf8").digest("hex");

// ---------------------------------------------------------------------------------------------
// Arm (A) -- pure
// ---------------------------------------------------------------------------------------------
function armA_pure() {
  const results = [];

  assert.strictEqual(typeof mergePinnedSkills, "function",
    "api/prompt/db-assembly.js must export mergePinnedSkills");

  const nsProfile = { slug: "ns", skill_type_slug: "knowledge", name: "North star", method: "the text", traits: { source: "inline" } };
  const pin = { display_order: 0, skill_profiles: nsProfile };
  const PIN_ROW = {
    ...nsProfile,
    pinned: true,
    source_capability_slug: null,
    level: null,
    skill_level: null,
    is_required: true,
    display_order: 0,
  };
  const other = { slug: "fx-knowledge", skill_type_slug: "knowledge", name: "Other", display_order: 2, is_required: false, level: 3, source_capability_slug: "fx-cap" };

  assert.deepStrictEqual(mergePinnedSkills([], []), [],
    "no rows and no pins must give []");

  const merged = mergePinnedSkills([other], [pin]);
  assert.strictEqual(merged.length, 2, `one pin over one unrelated row must give 2 rows, got ${merged.length}`);
  assert.deepStrictEqual(merged[0], PIN_ROW,
    `the pinned row must be built as the kickoff's PIN ROW and come FIRST, got ${JSON.stringify(merged[0])}`);
  assert.strictEqual(merged[1], other, "the loaded rows must follow the pinned ones, unchanged and in order");
  results.push("pure-pin-is-prepended-as-the-pin-row");

  // PINNED WINS -- the clause the ruling required, and the one the v7.0.829 draft had backwards. The
  // live window is exactly this case: 49 capability links of the pinned slug still loaded. Two copies
  // of the slug plus one unrelated row must come back as the PIN ROW and the unrelated row, in that
  // order -- not three rows, and not the loaded copies.
  const linkedTwice = [
    { ...nsProfile, source_capability_slug: "cap-a", display_order: 0, is_required: false, level: 3 },
    { ...nsProfile, source_capability_slug: "cap-b", display_order: 0, is_required: false, level: 3 },
    other,
  ];
  const won = mergePinnedSkills(linkedTwice, [pin]);
  assert.strictEqual(won.length, 2,
    `a pin must DROP every loaded row of its slug and leave one copy, got ${won.length} row(s): ${JSON.stringify(won.map(r => r.slug))}`);
  assert.deepStrictEqual(won[0], PIN_ROW,
    `the surviving copy must be the PIN ROW, not a loaded link, got ${JSON.stringify(won[0])}`);
  assert.strictEqual(won[0].pinned, true, "the surviving copy must be the pinned one");
  assert.strictEqual(won[0].source_capability_slug, null,
    "the surviving copy must credit no capability -- the agent brought it in, not a capability");
  assert.strictEqual(won[1], other, "an unpinned loaded row must survive untouched and keep its order");
  assert.strictEqual(won.filter(r => r.slug === "ns").length, 1,
    "PINNED WINS means EXACTLY ONE row of the pinned slug, whatever the capabilities loaded");
  results.push("pure-pinned-wins-over-loaded-links-of-the-same-slug");

  const twice = mergePinnedSkills([], [pin, { display_order: 7, skill_profiles: nsProfile }]);
  assert.strictEqual(twice.length, 1, `two pins naming one slug must add it ONCE, got ${twice.length}`);
  assert.strictEqual(twice[0].display_order, 0, "the first pin in order is the one that lands");
  results.push("pure-two-pins-one-slug-added-once");

  // NOTHING ADDED RETURNS THE SAME ARRAY, not a copy of it: an agent with no pin row must assemble
  // byte-identical to before this ticket, and identity is the strongest statement of that.
  const loadedOnly = [other];
  assert.strictEqual(mergePinnedSkills(loadedOnly, []), loadedOnly,
    "no pins must return the SAME array the caller passed in");
  assert.strictEqual(mergePinnedSkills(loadedOnly, null), loadedOnly,
    "a null pins read (PostgREST answered with no body) must return the SAME array");
  assert.strictEqual(mergePinnedSkills(loadedOnly, [{ display_order: 0, skill_profiles: null }]), loadedOnly,
    "a pin row whose embed did not resolve must be skipped, never added as a blank Skill");
  results.push("pure-no-pins-is-the-same-array");

  return results;
}

// ---------------------------------------------------------------------------------------------
// Arm (B) -- SEAM PROOF: assemblePrompt() over a stubbed fetch. No database, no model.
// ---------------------------------------------------------------------------------------------
async function armB_seam() {
  const results = [];
  const saved = { fetch: globalThis.fetch, url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_KEY };
  const restoreEnv = (name, value) => { if (value === undefined) delete process.env[name]; else process.env[name] = value; };

  // The pinned Skill: an inline Knowledge row, the shape the real north star has (traits.source
  // inline, its text in `method`), under the slug `ns` so the section is `knowledge-ns`.
  const NS_STUB = {
    slug: "ns", skill_type_slug: "knowledge", name: "North star",
    objective: "THE NORTH STAR", method: "stay ahead of the market",
    traits: { source: "inline" },
  };
  const NS_LINK = { level: 3, is_required: true, display_order: 0, skill_levels: null, skill_profiles: NS_STUB };
  const OWN_ROW = { level: null, is_required: true, display_order: 1, skill_levels: null,
    skill_profiles: { slug: "fx-knowledge", skill_type_slug: "knowledge", name: "Fixture knowledge", method: "other text", traits: { source: "inline" } } };

  // Per-capability rows, keyed by slug: `fx-cap` carries ONLY its own Skill, so case (1) proves the
  // pin arriving; `dup-a` and `dup-b` each also carry the pinned slug as a link, which is the live
  // shape that rendered the north star 12 times for Jerry -- case (2) proves PINNED WINS collapses
  // both of them to one section through the real assembler, not just through the pure function.
  const CAP_ROWS = {
    "fx-cap": [OWN_ROW],
    "dup-a": [NS_LINK, OWN_ROW],
    "dup-b": [NS_LINK],
  };
  let ASSIGNMENTS = [{ capability_slug: "dup-a" }, { capability_slug: "dup-b" }];

  let PINS = [{ display_order: 0, skill_profiles: NS_STUB }];
  let pinsAnswer = () => ({ ok: true, status: 200, json: async () => PINS });
  let urls = [];
  const isPins = u => u.includes("agent_skill_pins?");
  const pinUrls = () => urls.filter(isPins);
  const capOf = u => decodeURIComponent((u.match(/capability_slug=eq\.([^&]+)/) || [])[1] || "");

  try {
    process.env.SUPABASE_URL = "https://agt-434-seam.invalid";
    process.env.SUPABASE_SERVICE_KEY = "agt-434-seam-dummy";
    globalThis.fetch = async input => {
      const u = String(input);
      urls.push(u);
      if (isPins(u)) return pinsAnswer();
      if (u.includes("capability_skill_profiles?")) return { ok: true, status: 200, json: async () => CAP_ROWS[capOf(u)] || [] };
      if (u.includes("agent_capability_assignments?")) return { ok: true, status: 200, json: async () => ASSIGNMENTS };
      return { ok: true, status: 200, json: async () => [] };
    };

    const A = (extra = {}) => {
      urls = [];
      return assemblePrompt({
        agent_id: "fx-agent",
        tenant_id: "global",
        task_context: { goal: "What is the north star?" },
        include_taught: false,
        ...extra,
      });
    };
    const nsSections = pr => pr.sections.filter(s => s.slug === "knowledge-ns");

    // (1) THE SINGLE-CAPABILITY PATH -- one capability_slug whose own rows do NOT carry the slug, so
    //     the one section can only have come from the pin.
    const withCap = await A({ capability_slug: "fx-cap" });
    assert.strictEqual(nsSections(withCap).length, 1,
      `with a capability_slug the pinned Skill must render EXACTLY ONE knowledge-ns section, got ${nsSections(withCap).length} (slugs ${JSON.stringify(withCap.sections.map(s => s.slug))})`);
    assert.strictEqual(nsSections(withCap)[0].content, "THE NORTH STAR\nstay ahead of the market",
      "the pinned inline Knowledge Skill must render its own heading and text, filled at assembly time");
    const knowledgeSlugs = withCap.sections.filter(s => s.slug.startsWith("knowledge-")).map(s => s.slug);
    assert.deepStrictEqual(knowledgeSlugs, ["knowledge-ns", "knowledge-fx-knowledge"],
      `a pinned Skill renders FIRST among Knowledge, got ${JSON.stringify(knowledgeSlugs)}`);
    assert.strictEqual(pinUrls().length, 1,
      `assemblePrompt must read agent_skill_pins exactly once, read it ${pinUrls().length} time(s)`);
    assert.ok(pinUrls()[0].includes("agent_id=eq.fx-agent") && pinUrls()[0].includes("tenant_id=eq.global"),
      `the pins read must be scoped to the agent and tenant asked for, got ${pinUrls()[0]}`);
    assert.ok(pinUrls()[0].includes("order=display_order.asc"),
      `the pins read must be ordered by display_order, got ${pinUrls()[0]}`);

    // THE SIGNATURE IS AGENT-AGNOSTIC. A pin is agent configuration, so the pinned slug must not be
    // in it; the capability's own Skill must still be.
    assert.ok(Array.isArray(withCap.signature_config?.assembled_skill_slugs),
      "the capability path must still record a signature config");
    assert.ok(!withCap.signature_config.assembled_skill_slugs.includes("ns"),
      `signature_config.assembled_skill_slugs must NOT carry a pinned slug, got ${JSON.stringify(withCap.signature_config.assembled_skill_slugs)}`);
    assert.ok(withCap.signature_config.assembled_skill_slugs.includes("fx-knowledge"),
      "the capability's own Skill must still be in the signature -- otherwise this proves only that the signature is empty");
    results.push("seam-capability-path-renders-the-pin-once-first-and-outside-the-signature");

    // (2) THE AGENT-WIDE PATH, WITH THE SLUG STUBBED ONTO TWO CAPABILITIES -- the shape that rendered
    //     the north star 12 times for Jerry. Without the merge this assembles TWO knowledge-ns
    //     sections, so "exactly one" here is PINNED WINS proven at the seam, not just in arm (A).
    const wide = await A();
    assert.strictEqual(nsSections(wide).length, 1,
      `with no capability_slug and the slug linked to TWO capabilities the pinned Skill must render EXACTLY ONE knowledge-ns section, got ${nsSections(wide).length} (slugs ${JSON.stringify(wide.sections.map(s => s.slug))})`);
    const wideKnowledge = wide.sections.filter(s => s.slug.startsWith("knowledge-")).map(s => s.slug);
    assert.deepStrictEqual(wideKnowledge, ["knowledge-ns", "knowledge-fx-knowledge"],
      `the agent-wide path must assemble the pin FIRST and the other capability's Knowledge after it, once each; without the merge this reads ["knowledge-ns","knowledge-fx-knowledge","knowledge-ns"]. Got ${JSON.stringify(wideKnowledge)}`);
    assert.strictEqual(pinUrls().length, 1,
      `the agent-wide path must read agent_skill_pins exactly once, read it ${pinUrls().length} time(s)`);
    results.push("seam-agent-wide-path-collapses-two-links-to-the-one-pin");

    // (3) NO PINS -- zero sections in the path whose capability does not link the slug. The other
    //     direction, without which (1) and (2) could be anything.
    PINS = [];
    const none = await A({ capability_slug: "fx-cap" });
    assert.strictEqual(nsSections(none).length, 0,
      `an empty pins read must assemble ZERO knowledge-ns sections, got ${nsSections(none).length}`);
    assert.strictEqual(pinUrls().length, 1, "the no-pins case must actually have attempted the read");
    assert.ok(none.sections.some(s => s.slug === "knowledge-fx-knowledge"),
      "the capability's own Knowledge must still be there -- otherwise the zero above is a broken assembly, not a clean one");

    // ... and an unpinned agent whose capability DOES link the slug still gets it, once, from the
    // link: the merge removes nothing when there is no pin, so no agent loses a Skill to this ticket.
    const unpinnedButLinked = await A({ capability_slug: "dup-a" });
    assert.strictEqual(nsSections(unpinnedButLinked).length, 1,
      `with no pin, a capability's own link must still render its Skill once, got ${nsSections(unpinnedButLinked).length}`);
    results.push("seam-no-pins-no-section-and-no-loaded-row-removed");

    // (4) A FAILED PINS READ warns and assembles without the pin.
    PINS = [{ display_order: 0, skill_profiles: NS_STUB }];
    pinsAnswer = () => ({ ok: false, status: 500 });
    const savedWarn = console.warn;
    const warned = [];
    console.warn = (...args) => { warned.push(args.join(" ")); };
    let failed;
    try { failed = await A({ capability_slug: "fx-cap" }); } finally { console.warn = savedWarn; }
    assert.strictEqual(pinUrls().length, 1, "the failed-read case must actually have attempted the read");
    assert.strictEqual(nsSections(failed).length, 0, "a failed pins read must assemble without the pinned section");
    assert.ok(failed.sections.some(s => s.slug === "knowledge-fx-knowledge"),
      "a failed pins read must not cost the call its own Skills");
    assert.ok(warned.some(w => w.includes("[db-assembly] pins read failed")),
      "a failed agent_skill_pins read must warn -- a silent miss is invisible in the server log");
    results.push("seam-failed-pins-read-warns-and-assembles-without-the-pin");
  } finally {
    globalThis.fetch = saved.fetch;
    restoreEnv("SUPABASE_URL", saved.url);
    restoreEnv("SUPABASE_SERVICE_KEY", saved.key);
  }

  return results;
}

// ---------------------------------------------------------------------------------------------
// Arm (C) -- LIVE. Read-only.
// ---------------------------------------------------------------------------------------------
async function armC_live() {
  const results = [];
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the live arm (12 pins over the directive's 11 agents plus AGT-491's architect; zero capability links left; the north star row present with its text unchanged; decision 5b4f3dd2 NOT reversed; a real assemblePrompt() carrying the north star exactly once for jerry agent-wide and for designer+design-kickoff, and never for susan)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent -- read them from public.runner_secrets by name and export them inline, per docs/STANDARDS.md Section 2 rule 5.",
    );
    return results;
  }

  const rest = async q => {
    const r = await fetch(`${url}/rest/v1/${q}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    });
    assert.ok(r.ok, `GET /rest/v1/${q} answered ${r.status} -- the live arm cannot grade what it cannot read`);
    return (await r.json()) || [];
  };

  // 1. THE PINS: twelve, one per agent, exactly the directive's eleven plus AGT-491's architect.
  const pins = await rest(`agent_skill_pins?skill_profile_slug=eq.${NS}&select=agent_id,tenant_id,display_order&order=agent_id.asc`);
  assert.strictEqual(pins.length, 13, `the north star must be pinned to exactly 13 agents, got ${pins.length} row(s)`);
  const pinned = [...new Set(pins.map(p => p.agent_id))].sort();
  assert.strictEqual(pinned.length, 13, `13 pin rows must name 13 DISTINCT agents, got ${JSON.stringify(pinned)}`);
  assert.deepStrictEqual(pinned, [...AGENTS].sort(),
    `the pinned agents must be the directive's eleven plus AGT-491's architect, got ${JSON.stringify(pinned)}`);
  assert.ok(!pinned.includes("susan"), "susan holds no capability with the link and is not pinned (pattern:90)");
  results.push("live-eleven-pins-over-the-directives-eleven-agents");

  // 2. THE CAPABILITY LINKS ARE GONE -- all 49 of them, removed over PostgREST under their own
  //    decision with full-row before-images, NOT by reversing 5b4f3dd2. That decision images the
  //    north star skill_profiles row itself as an INSERT, so reversing it would attempt to remove the
  //    row; it must stay un-reversed, and the pin table's no-cascade FK is the standing guard.
  const links = await rest(`capability_skill_profiles?skill_profile_slug=eq.${NS}&select=capability_slug`);
  assert.strictEqual(links.length, 0,
    `every capability link of the north star must be gone, ${links.length} remain${links.length ? ` (${links.slice(0, 5).map(l => l.capability_slug).join(", ")}...)` : ""}`);
  const dec = await rest(`runner_decisions?id=eq.${DEC}&select=status`);
  assert.strictEqual(dec.length, 1, `decision ${DEC} must still be on the record, got ${dec.length} row(s)`);
  assert.notStrictEqual(dec[0].status, "reversed",
    `decision ${DEC} must NOT be reversed -- it images the north star row itself and a reversal would remove it; status reads ${JSON.stringify(dec[0].status)}`);
  results.push("live-the-links-are-gone-without-reversing-5b4f3dd2");

  // 3. THE NORTH STAR ROW IS UNTOUCHED, TEXT BYTE-FOR-BYTE.
  const rows = await rest(`skill_profiles?slug=eq.${NS}&select=id,method`);
  assert.strictEqual(rows.length, 1, `the north star row must still exist, got ${rows.length} row(s)`);
  assert.strictEqual(md5(rows[0].method), MD5,
    `the north star's method must be byte-for-byte unchanged (md5 ${MD5}), got ${md5(rows[0].method)} -- John: do not change the text of the north star row`);
  results.push("live-north-star-row-present-with-its-text-unchanged");

  // 4. A REAL ASSEMBLED PROMPT -- the two-direction assertion the ticket's own Fix sentence owes.
  //    BEFORE, measured this cycle through this same function: jerry agent-wide 12, designer
  //    agent-wide 2, designer+design-kickoff 1, susan 0.
  const section = `knowledge-${NS}`;
  const count = async extra => {
    const pr = await assemblePrompt({
      agent_id: extra.agent_id, tenant_id: "global",
      task_context: { goal: "What is the north star?" },
      capability_slug: extra.capability_slug ?? undefined,
      include_taught: false,
    });
    return { n: pr.sections.filter(s => s.slug === section).length, pr };
  };

  const jerry = await count({ agent_id: "jerry" });
  assert.strictEqual(jerry.n, 1,
    `jerry with no capability_slug must assemble the north star EXACTLY ONCE -- this is the path that rendered it 12 times, got ${jerry.n}`);

  const dk = await count({ agent_id: "designer", capability_slug: "design-kickoff" });
  assert.strictEqual(dk.n, 1,
    `designer/design-kickoff must assemble the north star EXACTLY ONCE, got ${dk.n} (slugs ${JSON.stringify(dk.pr.sections.map(s => s.slug))})`);
  assert.ok(!(dk.pr.signature_config?.assembled_skill_slugs || []).includes(NS),
    "a pinned Skill must not enter the live SS19k signature");

  const susan = await count({ agent_id: "susan" });
  assert.strictEqual(susan.n, 0,
    `susan is not pinned, so her assembled prompt must carry no north star section, got ${susan.n}`);
  console.log(`  [AGT-434] live: ${pins.length} pins / ${links.length} capability links / decision ${dec[0].status} / jerry ${jerry.n} / designer+design-kickoff ${dk.n} / susan ${susan.n}`);
  results.push("live-jerry-and-designer-assemble-the-north-star-once-and-susan-not-at-all");

  return results;
}

async function run() {
  const results = [];
  results.push(...armA_pure());
  results.push(...(await armB_seam()));
  results.push(...(await armC_live()));
  return results;
}

selfRun(import.meta.url, run);
export default run;
