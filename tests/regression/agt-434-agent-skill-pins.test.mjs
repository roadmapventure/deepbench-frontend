// DeepBench v7.0.829 | tests/regression/agt-434-agent-skill-pins.test.mjs | AGT-434 slice 1 -- north
// star pinned ONCE per agent (agent_skill_pins); directive 3c1cc23d.
//
// FEATURE: AGT-434 -- a Skill every call of an agent must carry is pinned ONCE at agent level and read
// by assemblePrompt(), instead of being linked to every one of that agent's capabilities. Measured
// live 2026-10-09 before this ticket: `deepbench-north-star` held 48 `capability_skill_profiles` links
// over 11 agents, and api/prompt/db-assembly.js's agent-wide path pushes every assigned capability's
// links with no slug check -- so the same knowledge rendered as 12 sections in Jerry's assembled
// prompt and 11 in Nathan's. John's words: "it should only be pinned once to each agent and they know
// it intametly".
//
// THREE ARMS:
//   (A) PURE -- mergePinnedSkills(): a pin over rows that lack its slug is added FIRST; a pin whose
//       slug is already loaded changes nothing; two pins naming one slug add it once; no pins returns
//       the same array. No fetch, no env, no database: this arm grades the rule itself.
//   (B) SEAM PROOF -- assemblePrompt() over a stubbed fetch (the dat-004 arm (b) shape). With a pin
//       row and capability rows that do NOT carry its slug, the capability path and the agent-wide
//       path each assemble EXACTLY ONE `knowledge-ns` section; an empty pins read assembles zero; the
//       pinned slug is absent from signature_config.assembled_skill_slugs (the §19k signature is
//       agent-agnostic and a pin is agent configuration -- .claude/rules/ai-pattern-signature.md);
//       and the pins URL is read exactly once, on the agent and tenant asked for. Labelled a seam
//       proof: no database, no model.
//   (C) LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, else NOT RUN) -- the shipped state: 11 pins over
//       11 agents, none of them susan (she holds no capability with the link and the directive does
//       not name her); ZERO interim capability links left; the north star row still present with
//       md5(method) unchanged; decision 5b4f3dd2 `reversed`; and a REAL assemblePrompt() for the
//       Designer carrying the north star exactly ONCE with a capability_slug and exactly once
//       without, while Susan's carries it zero times. Read-only -- nothing in this file writes to
//       Supabase (pattern:76).
//
// THE DISCRIMINATOR, and the order it fires in: run against the unchanged tree arm (A) exits 1 at
// once (db-assembly.js exports no mergePinnedSkills). With T2 shipped but before the migration and
// the reversal, arm (C) is RED at `0 rows` -- the pins table does not exist and the 48 links are
// still there. It goes green only once the migration has applied AND decision 5b4f3dd2 has been
// reversed. Arm (B)'s empty-pins case is the other direction: zero pin rows, zero sections.
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
  const other = { slug: "fx-knowledge", skill_type_slug: "knowledge", name: "Other", display_order: 2, is_required: false, level: 3, source_capability_slug: "fx-cap" };

  assert.deepStrictEqual(mergePinnedSkills([], []), [],
    "no rows and no pins must give []");

  const merged = mergePinnedSkills([other], [pin]);
  assert.strictEqual(merged.length, 2, `one pin over one unrelated row must give 2 rows, got ${merged.length}`);
  assert.deepStrictEqual(merged[0], {
    ...nsProfile,
    pinned: true,
    source_capability_slug: null,
    level: null,
    skill_level: null,
    is_required: true,
    display_order: 0,
  }, `the pinned row must be built as the kickoff's PIN ROW and come FIRST, got ${JSON.stringify(merged[0])}`);
  assert.strictEqual(merged[1], other, "the loaded rows must follow the pinned ones, unchanged and in order");
  results.push("pure-pin-is-prepended-as-the-pin-row");

  // ALREADY LOADED: the window between this slice's assembler edit and the reversal of the interim
  // links is exactly this case, and a second copy there would be the duplication this ticket removes.
  const alreadyLoaded = [{ ...nsProfile, source_capability_slug: "fx-cap", display_order: 0, is_required: false, level: 1 }];
  const unchanged = mergePinnedSkills(alreadyLoaded, [pin]);
  assert.strictEqual(unchanged, alreadyLoaded,
    "a pin whose slug is already loaded must return the SAME array -- byte-identical assembly");
  assert.strictEqual(unchanged.length, 1, "a pin whose slug is already loaded must add nothing");
  assert.strictEqual(unchanged[0].pinned, undefined, "the already-loaded row must not be rewritten by the merge");
  results.push("pure-pin-already-loaded-changes-nothing");

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
  // The capability's own rows carry NO `ns` -- otherwise the merge's skip would hide the pin and this
  // arm would prove nothing.
  const CAP_ROWS = [
    { level: null, is_required: true, display_order: 1, skill_levels: null,
      skill_profiles: { slug: "fx-knowledge", skill_type_slug: "knowledge", name: "Fixture knowledge", method: "other text", traits: { source: "inline" } } },
  ];

  let PINS = [{ display_order: 0, skill_profiles: NS_STUB }];
  let pinsAnswer = () => ({ ok: true, status: 200, json: async () => PINS });
  let urls = [];
  const isPins = u => u.includes("agent_skill_pins?");
  const pinUrls = () => urls.filter(isPins);

  try {
    process.env.SUPABASE_URL = "https://agt-434-seam.invalid";
    process.env.SUPABASE_SERVICE_KEY = "agt-434-seam-dummy";
    globalThis.fetch = async input => {
      const u = String(input);
      urls.push(u);
      if (isPins(u)) return pinsAnswer();
      if (u.includes("capability_skill_profiles?")) return { ok: true, status: 200, json: async () => CAP_ROWS };
      if (u.includes("agent_capability_assignments?")) return { ok: true, status: 200, json: async () => [{ capability_slug: "fx-cap" }] };
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

    // (1) THE CAPABILITY PATH -- one capability_slug, one pinned section, exactly once.
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

    // (2) THE AGENT-WIDE PATH -- no capability_slug. This is the path that rendered the north star 12
    //     times for Jerry, so "exactly one" is the whole ticket here.
    const wide = await A();
    assert.strictEqual(nsSections(wide).length, 1,
      `with no capability_slug the pinned Skill must render EXACTLY ONE knowledge-ns section, got ${nsSections(wide).length} (slugs ${JSON.stringify(wide.sections.map(s => s.slug))})`);
    assert.strictEqual(pinUrls().length, 1,
      `the agent-wide path must read agent_skill_pins exactly once, read it ${pinUrls().length} time(s)`);
    results.push("seam-agent-wide-path-renders-the-pin-once");

    // (3) NO PINS -- zero sections. The other direction, without which (1) and (2) could be anything.
    PINS = [];
    const none = await A({ capability_slug: "fx-cap" });
    assert.strictEqual(nsSections(none).length, 0,
      `an empty pins read must assemble ZERO knowledge-ns sections, got ${nsSections(none).length}`);
    assert.strictEqual(pinUrls().length, 1, "the no-pins case must actually have attempted the read");
    assert.ok(none.sections.some(s => s.slug === "knowledge-fx-knowledge"),
      "the capability's own Knowledge must still be there -- otherwise the zero above is a broken assembly, not a clean one");
    results.push("seam-no-pins-no-section");

    // (4) ALREADY LINKED -- the pin's slug is also one of the capability's rows. Once, not twice:
    //     this is the live window between this slice's assembler edit and the reversal.
    PINS = [{ display_order: 0, skill_profiles: NS_STUB }];
    CAP_ROWS.push({ level: null, is_required: true, display_order: 0, skill_levels: null, skill_profiles: NS_STUB });
    const both = await A({ capability_slug: "fx-cap" });
    assert.strictEqual(nsSections(both).length, 1,
      `a pin whose slug the capability already links must render ONCE, got ${nsSections(both).length}`);
    CAP_ROWS.pop();
    results.push("seam-pin-already-linked-renders-once");

    // (5) A FAILED PINS READ warns and assembles without the pin.
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
      "the live arm (11 pins over 11 agents and no susan; zero interim capability links; the north star row present with its text unchanged; decision 5b4f3dd2 reversed; a real assemblePrompt() carrying the north star exactly once for the Designer and never for Susan)",
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

  // 1. THE PINS: eleven, one per agent, exactly the directive's eleven.
  const pins = await rest(`agent_skill_pins?skill_profile_slug=eq.${NS}&select=agent_id,tenant_id,display_order&order=agent_id.asc`);
  assert.strictEqual(pins.length, 11, `the north star must be pinned to exactly 11 agents, got ${pins.length} row(s)`);
  const pinned = [...new Set(pins.map(p => p.agent_id))].sort();
  assert.strictEqual(pinned.length, 11, `11 pin rows must name 11 DISTINCT agents, got ${JSON.stringify(pinned)}`);
  assert.deepStrictEqual(pinned, [...AGENTS].sort(),
    `the pinned agents must be the directive's eleven, got ${JSON.stringify(pinned)}`);
  assert.ok(!pinned.includes("susan"), "susan holds no capability with the link and is not pinned (pattern:90)");
  results.push("live-eleven-pins-over-the-directives-eleven-agents");

  // 2. THE INTERIM LINKS ARE GONE -- the reversal of 5b4f3dd2 ran.
  const links = await rest(`capability_skill_profiles?skill_profile_slug=eq.${NS}&select=capability_slug`);
  assert.strictEqual(links.length, 0,
    `the 48 interim capability links must be gone after the reversal, ${links.length} remain${links.length ? ` (${links.slice(0, 5).map(l => l.capability_slug).join(", ")}...)` : ""}`);
  const dec = await rest(`runner_decisions?id=eq.${DEC}&select=status,reversed_by`);
  assert.strictEqual(dec.length, 1, `decision ${DEC} must still be on the record, got ${dec.length} row(s)`);
  assert.strictEqual(dec[0].status, "reversed", `decision ${DEC} must read status reversed, got ${JSON.stringify(dec[0].status)}`);
  results.push("live-the-48-interim-links-are-reversed");

  // 3. THE NORTH STAR SURVIVED THE REVERSAL, TEXT UNCHANGED. This is the FK guard's whole point: the
  //    decision imaged the row itself as an INSERT, so reverse_decision() attempted to DELETE it.
  const rows = await rest(`skill_profiles?slug=eq.${NS}&select=id,method`);
  assert.strictEqual(rows.length, 1, `the north star row must still exist after the reversal, got ${rows.length} row(s)`);
  assert.strictEqual(md5(rows[0].method), MD5,
    `the north star's method must be byte-for-byte unchanged (md5 ${MD5}), got ${md5(rows[0].method)} -- John: do not change the text of the north star row`);
  results.push("live-north-star-row-survived-with-its-text-unchanged");

  // 4. A REAL ASSEMBLED PROMPT -- once with a capability, once agent-wide, zero for Susan.
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

  const dk = await count({ agent_id: "designer", capability_slug: "design-kickoff" });
  assert.strictEqual(dk.n, 1,
    `designer/design-kickoff must assemble the north star EXACTLY ONCE, got ${dk.n} (slugs ${JSON.stringify(dk.pr.sections.map(s => s.slug))})`);
  assert.ok(!(dk.pr.signature_config?.assembled_skill_slugs || []).includes(NS),
    "a pinned Skill must not enter the live §19k signature");

  const dwide = await count({ agent_id: "designer" });
  assert.strictEqual(dwide.n, 1,
    `designer with no capability_slug must assemble the north star EXACTLY ONCE -- this is the path that rendered it twice for the Designer and twelve times for Jerry, got ${dwide.n}`);

  const susan = await count({ agent_id: "susan" });
  assert.strictEqual(susan.n, 0,
    `susan is not pinned, so her assembled prompt must carry no north star section, got ${susan.n}`);
  console.log(`  [AGT-434] live: ${pins.length} pins / ${links.length} interim links / decision ${dec[0].status} / designer ${dk.n} + ${dwide.n} / susan ${susan.n}`);
  results.push("live-designer-assembles-the-north-star-once-each-path-and-susan-not-at-all");

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
