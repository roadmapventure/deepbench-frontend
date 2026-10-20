// DeepBench v7.0.870 | tests/regression/agt-491-governance-architect.test.mjs | AGT-493 -- arm 5 repinned: the architect now holds exactly TWO capabilities, `review-audit-worklist` (AGT-492) and `validate-ticket` (AGT-493). AGT-491 itself still creates none -- the assertion moved from a count of zero to the named set, so a THIRD capability appearing without a ticket is still caught.
// DeepBench v7.0.868 | tests/regression/agt-491-governance-architect.test.mjs | AGT-491 -- The
// Governance Architect (GV-09) exists as a row, a portrait and two Skill pins, and the Verifier did
// not pay for it.
//
// FEATURE: AGT-491 -- John, decisions 27/29 of docs/design/VICTORIA-FILL-REQUIREMENTS-1013.md: a NEW
// agent "Governance Architect", industry title Solutions Architect, with "all fields, avatar config,
// pronouns, DB row", and its Chief Architect lens Skill pinned "without removing it from the
// Verifier". Measured live on the unchanged tree this cycle: `lane = 'governance'` held EIGHT rows
// GV-01..GV-08 with nothing matching %architect% in id, name, role or specialty, and
// agent_skill_pins held ELEVEN rows, every one of them `deepbench-north-star`. AFTER: nine
// governance rows, thirteen pins, and `vf-knowledge-bar` still linked to `verify-ship` exactly once.
//
// THE LENS IS PINNED, NOT MOVED, and that is the whole of John's second clause. `vf-knowledge-bar` is
// an EXISTING skill_profiles row the Verifier reads through its `verify-ship` capability link. A pin
// adds a second reader; it does not relocate the Skill. So this file asserts the new reader AND the
// old one in the same arm -- the architect assembles the lens once, and the Verifier still assembles
// it once. Asserting only the first would pass just as happily on a build that stole the Skill.
//
// THREE ARMS:
//   (A) PURE -- the roster file. AVATAR_CFG.architect carries STANDARDS.md Section 11's five keys and
//       AGENT_PRONOUNS.architect its three; the portrait's `border` is a T palette TOKEN rather than a
//       copied hex literal (checked against the source line, because the runtime value of T.navy and
//       of a hand-pasted "#12243c" are the same string and only the source distinguishes them --
//       .claude/rules/design-tokens.md); and `architect` is NOT an AGENTS member, because a governance
//       agent stays off the Bench array and renders from its live lane row (AGT-69). No fetch, no env,
//       no database.
//   (B) LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, else NOT RUN) -- the shipped rows: the architect's
//       fifteen non-identity profile columns equal `devmanager`'s, so it landed on the eight peers'
//       profile rather than inventing money or training numbers; nine governance rows with nine
//       DISTINCT codes GV-01..GV-09; thirteen pins in all, two of them its own at display_order 0 and
//       1; `vf-knowledge-bar` still on `verify-ship`; and ZERO capability assignments, because this
//       ticket creates no capability. Read-only -- nothing in this file writes to Supabase (pattern:76).
//   (C) LIVE, BOTH WAYS -- a REAL assemblePrompt(). The architect's agent-wide prompt carries
//       `knowledge-deepbench-north-star` exactly once and `knowledge-vf-knowledge-bar` exactly once;
//       the Verifier's verify-ship prompt STILL carries the lens exactly once; and neither slug enters
//       signature_config.assembled_skill_slugs, because a pinned Skill is agent configuration and the
//       SS19k signature is agent-agnostic (AGT-434, .claude/rules/ai-pattern-signature.md).
//
// THE DISCRIMINATOR, and the order it fires in: run against the unchanged tree arm (A) exits 1 at once
// -- AVATAR_CFG has no `architect` entry. With the roster edited but the migration not applied, arm (B)
// is red at the governance census (8, not 9). With the row applied but the north-star pin missing, arm
// (C) is red at 0 for that slug while the lens still reads 1; with the lens pin missing it is the other
// way round. A build that MOVED the lens instead of pinning it is red at arm (B)'s link count and at
// arm (C)'s Verifier call, not at the architect's own.
//
// THE FIFTEEN COLUMNS ARE NAMED HERE, NOT COUNTED FROM THE TABLE. `public.agents` has 36 columns; the
// fifteen below are the money, training and ownership cells that every governance peer leaves NULL.
// Naming them is what makes the arm discriminating: a count would pass on any fifteen, and a
// to_jsonb() diff of the whole row would fail on `created_at` forever.
//
// NO MODEL CALL, NO SPEND.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

import { AGENTS, AVATAR_CFG, AGENT_PRONOUNS } from "../../src/data/agents.js";
import { T } from "../../src/tokens.js";
import { assemblePrompt } from "../../api/prompt/db-assembly.js";

const ID = "architect";
const CODE = "GV-09";
const PEER = "devmanager";
const NS = "deepbench-north-star";
const LENS = "vf-knowledge-bar";
const LENS_CAP = "verify-ship";

// STANDARDS.md Section 11's sub-shapes, the same two lists SE-03-agent-fields.js reads.
const AVATAR_KEYS = ["skin", "hair", "collar", "extra", "border"];
const PRONOUN_KEYS = ["subject", "object", "possessive"];
const PALETTE = { "T.brass": T.brass, "T.moss": T.moss, "T.navy": T.navy, "T.muted": T.muted };

// The fifteen non-identity profile columns -- NULL on every governance peer.
const PROFILE_COLUMNS = [
  "architecture", "salary", "yearly_value", "hourly_rate", "report_hours", "report_cost",
  "situational_awareness", "revenue_model", "trainer_org", "update_cadence",
  "base_report_cost", "current_report_cost", "tenant_id", "owner_id", "quip",
];

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ROSTER = path.join(REPO, "src/data/agents.js");

// ---------------------------------------------------------------------------------------------
// Arm (A) -- PURE: the roster file. No fetch, no env, no database.
// ---------------------------------------------------------------------------------------------
function armA_pure() {
  const results = [];

  const avatar = AVATAR_CFG[ID];
  assert.ok(avatar && typeof avatar === "object",
    `AVATAR_CFG.${ID} must exist -- a governance agent with no portrait entry draws a blank, and SE-03-agent-fields.js reports it as an orphan`);
  assert.deepStrictEqual(Object.keys(avatar).sort(), [...AVATAR_KEYS].sort(),
    `AVATAR_CFG.${ID} must carry exactly STANDARDS.md Section 11's five keys ${JSON.stringify(AVATAR_KEYS)}, got ${JSON.stringify(Object.keys(avatar))}`);
  for (const k of AVATAR_KEYS) {
    assert.ok(typeof avatar[k] === "string",
      `AVATAR_CFG.${ID}.${k} must be a string, got ${typeof avatar[k]}`);
  }

  // THE BORDER IS A TOKEN, AND ONLY THE SOURCE CAN SAY SO. At runtime T.navy IS "#12243c", so a
  // value check cannot tell the token from a pasted literal -- the distinction
  // .claude/rules/design-tokens.md exists for. The line itself is read.
  const tokenNames = Object.keys(PALETTE).filter(n => PALETTE[n] === avatar.border);
  assert.ok(tokenNames.length >= 1,
    `AVATAR_CFG.${ID}.border must be one of the four T palette values Section 11's Notes name, got ${JSON.stringify(avatar.border)}`);
  const src = fs.readFileSync(ROSTER, "utf8");
  const line = src.split("\n").find(l => /^\s*architect:\s*\{\s*skin:/.test(l));
  assert.ok(line, `src/data/agents.js must carry an \`${ID}:\` AVATAR_CFG line -- arm (A) could not find it to read`);
  assert.ok(/border:\s*T\.[A-Za-z]+\s*\}/.test(line),
    `the ${ID} portrait's border must be written as a T.<token>, never a hex literal (.claude/rules/design-tokens.md); the line reads: ${line.trim()}`);
  results.push("pure-avatar-entry-has-the-five-keys-and-a-token-border");

  const pron = AGENT_PRONOUNS[ID];
  assert.ok(pron && typeof pron === "object", `AGENT_PRONOUNS.${ID} must exist`);
  assert.deepStrictEqual(Object.keys(pron).sort(), [...PRONOUN_KEYS].sort(),
    `AGENT_PRONOUNS.${ID} must carry exactly ${JSON.stringify(PRONOUN_KEYS)}, got ${JSON.stringify(Object.keys(pron))}`);
  assert.deepStrictEqual(pron, { subject: "they", object: "them", possessive: "their" },
    `AGENT_PRONOUNS.${ID} must read they/them/their, the eight governance peers' form, got ${JSON.stringify(pron)}`);
  results.push("pure-pronoun-entry-is-they-them-their");

  // OFF THE BENCH ARRAY. AGT-69 deleted OFF_BENCH_AGENT_IDS and made the live lane row the only
  // place a governance agent is declared; an AGENTS member here would put it on the Bench twice and
  // SE-03 would then owe it all 23 roster fields.
  assert.ok(Array.isArray(AGENTS), "AGENTS must still be an array");
  const member = AGENTS.find(a => a && a.id === ID);
  assert.strictEqual(member, undefined,
    `no AGENTS member may have id "${ID}" -- a governance agent renders from its live lane = 'governance' row (AGT-69), not from the Bench array; found ${JSON.stringify(member)}`);
  results.push("pure-architect-is-not-an-AGENTS-member");

  return results;
}

// ---------------------------------------------------------------------------------------------
// Arm (B) -- LIVE rows. Read-only.
// ---------------------------------------------------------------------------------------------
async function armB_live(rest) {
  const results = [];

  // 1. THE PROFILE: the fifteen non-identity columns equal the peer's, cell for cell.
  const cols = ["id", ...PROFILE_COLUMNS].join(",");
  const pair = await rest(`agents?id=in.(${ID},${PEER})&select=${cols}`);
  const mine = pair.find(r => r.id === ID);
  const peer = pair.find(r => r.id === PEER);
  assert.ok(mine, `public.agents must hold one row with id "${ID}"`);
  assert.ok(peer, `the peer row "${PEER}" must exist -- arm (B) compares against it, and cannot grade without it`);
  const differing = PROFILE_COLUMNS.filter(c => JSON.stringify(mine[c] ?? null) !== JSON.stringify(peer[c] ?? null));
  assert.deepStrictEqual(differing, [],
    `all ${PROFILE_COLUMNS.length} non-identity profile columns must equal ${PEER}'s; these differ: ${differing.map(c => `${c} (${JSON.stringify(mine[c])} vs ${JSON.stringify(peer[c])})`).join(", ")}`);
  assert.strictEqual(PROFILE_COLUMNS.length, 15,
    `the declared profile list must still be the kickoff's fifteen columns, got ${PROFILE_COLUMNS.length}`);
  results.push("live-fifteen-profile-columns-equal-the-peers");

  // 2. THE ROW'S OWN POSTURE and the governance census.
  const gov = await rest("agents?lane=eq.governance&select=id,code,name,role,is_active,visibility,sharing,agent_origin&order=code.asc");
  assert.strictEqual(gov.length, 9,
    `lane = 'governance' must hold 9 rows after this ticket (8 before it), got ${gov.length}`);
  const codes = gov.map(r => r.code);
  assert.deepStrictEqual(codes, ["GV-01", "GV-02", "GV-03", "GV-04", "GV-05", "GV-06", "GV-07", "GV-08", "GV-09"],
    `the governance codes must be GV-01..GV-09, each used once, got ${JSON.stringify(codes)}`);
  assert.strictEqual(new Set(codes).size, 9, `the 9 governance codes must be DISTINCT, got ${JSON.stringify(codes)}`);
  const row = gov.find(r => r.id === ID);
  assert.ok(row, `the architect must be one of the governance rows, got ${JSON.stringify(gov.map(r => r.id))}`);
  assert.deepStrictEqual(
    { code: row.code, name: row.name, role: row.role, is_active: row.is_active, visibility: row.visibility, sharing: row.sharing, agent_origin: row.agent_origin },
    { code: CODE, name: "The Governance Architect", role: "Governance — Architect", is_active: true, visibility: "config", sharing: "public", agent_origin: "system" },
    `the architect row must land GV-09 / The Governance Architect / Governance — Architect / active / config / public / system (is_active true on the SES-338 lane carve-out), got ${JSON.stringify(row)}`);
  results.push("live-nine-governance-rows-gv01-to-gv09-and-the-architects-posture");

  // 3. THE PINS: thirteen in all, two of them the architect's, in the declared order.
  const allPins = await rest("agent_skill_pins?select=agent_id,tenant_id,skill_profile_slug,display_order");
  assert.strictEqual(allPins.length, 13,
    `agent_skill_pins must hold 13 rows after this ticket (11 before it), got ${allPins.length}`);
  const ours = allPins.filter(p => p.agent_id === ID).sort((a, b) => a.display_order - b.display_order);
  assert.strictEqual(ours.length, 2,
    `the architect must hold EXACTLY 2 pins -- a third is this ticket overreaching; got ${ours.length}: ${JSON.stringify(ours.map(p => p.skill_profile_slug))}`);
  assert.deepStrictEqual(ours.map(p => [p.skill_profile_slug, p.display_order, p.tenant_id]),
    [[NS, 0, "global"], [LENS, 1, "global"]],
    `the architect's pins must be ${NS} at display_order 0 and ${LENS} at 1, both tenant global, got ${JSON.stringify(ours)}`);
  results.push("live-thirteen-pins-two-of-them-the-architects-at-0-and-1");

  // 4. THE VERIFIER KEEPS THE LENS -- John's "without removing it from the Verifier", asserted on
  //    the link table rather than inferred from the pin landing.
  const links = await rest(`capability_skill_profiles?skill_profile_slug=eq.${LENS}&select=capability_slug`);
  assert.strictEqual(links.length, 1,
    `${LENS} must STILL hold exactly 1 capability link, got ${links.length}: ${JSON.stringify(links.map(l => l.capability_slug))} -- pinning a Skill adds a reader, it never moves the Skill`);
  assert.strictEqual(links[0].capability_slug, LENS_CAP,
    `${LENS}'s one link must still be to ${LENS_CAP}, got ${JSON.stringify(links[0].capability_slug)}`);
  results.push("live-the-lens-still-holds-its-one-verify-ship-link");

  // 5. EXACTLY THE TWO CAPABILITIES TWO TICKETS GAVE IT. AGT-491 itself creates none; AGT-492 moved
  //    the findings review here and AGT-493 added the stale-ticket validation. The assertion is the
  //    NAMED SET rather than a count, so a capability landing on this agent without a ticket behind
  //    it is still caught -- which is the thing arm 5 has guarded since AGT-491.
  const asgn = await rest(`agent_capability_assignments?agent_id=eq.${ID}&select=capability_slug`);
  assert.deepStrictEqual(asgn.map(a => a.capability_slug).sort(), ["review-audit-worklist", "validate-ticket"],
    `the architect holds exactly the two capabilities AGT-492 and AGT-493 gave it; got ${asgn.length}: ${JSON.stringify(asgn.map(a => a.capability_slug))}`);
  results.push("live-the-architect-holds-its-two-capabilities");

  console.log(`  [AGT-491] live: ${gov.length} governance rows / ${allPins.length} pins (${ours.length} the architect's) / ${links.length} lens link / ${asgn.length} assignments`);
  return results;
}

// ---------------------------------------------------------------------------------------------
// Arm (C) -- LIVE, BOTH WAYS: a real assemblePrompt(). Read-only.
// ---------------------------------------------------------------------------------------------
async function armC_assembled() {
  const results = [];
  const countOf = (pr, slug) => pr.sections.filter(s => s.slug === `knowledge-${slug}`).length;

  // THE NEW READER: the architect's agent-wide prompt. It holds no capability at all, so these two
  // sections can ONLY have arrived through its pins -- which is what makes the number mean something.
  const arch = await assemblePrompt({
    agent_id: ID, tenant_id: "global", task_context: { goal: "x" }, include_taught: false,
  });
  assert.strictEqual(countOf(arch, NS), 1,
    `the architect's assembled prompt must carry knowledge-${NS} EXACTLY ONCE, got ${countOf(arch, NS)} (slugs ${JSON.stringify(arch.sections.map(s => s.slug))})`);
  assert.strictEqual(countOf(arch, LENS), 1,
    `the architect's assembled prompt must carry knowledge-${LENS} EXACTLY ONCE -- this is the Chief Architect lens John pinned, got ${countOf(arch, LENS)} (slugs ${JSON.stringify(arch.sections.map(s => s.slug))})`);
  const archSig = arch.signature_config?.assembled_skill_slugs || [];
  assert.ok(!archSig.includes(NS) && !archSig.includes(LENS),
    `a pinned Skill must not enter signature_config.assembled_skill_slugs (the SS19k signature is agent-agnostic, a pin is agent configuration), got ${JSON.stringify(archSig)}`);
  results.push("assembled-the-architect-carries-both-pinned-skills-once-and-neither-in-the-signature");

  // THE OLD READER, UNCHANGED -- the other direction, and the half John's words actually name. The
  // Verifier reads the lens through its verify-ship capability link, not through a pin.
  const vf = await assemblePrompt({
    agent_id: "verifier", capability_slug: LENS_CAP, tenant_id: "global",
    task_context: { goal: "x" }, include_taught: false,
  });
  assert.strictEqual(countOf(vf, LENS), 1,
    `the Verifier's ${LENS_CAP} prompt must STILL carry knowledge-${LENS} exactly once -- John: pin it "without removing it from the Verifier"; got ${countOf(vf, LENS)} (slugs ${JSON.stringify(vf.sections.map(s => s.slug))})`);
  const vfSig = vf.signature_config?.assembled_skill_slugs || [];
  assert.ok(vfSig.includes(LENS),
    `the Verifier reads the lens through a capability LINK, so it must still be in that call's signature -- otherwise the pin replaced the link; got ${JSON.stringify(vfSig)}`);
  assert.ok(!vfSig.includes(NS),
    `the Verifier's own north star arrives by pin, so it must not be in the signature either, got ${JSON.stringify(vfSig)}`);
  results.push("assembled-the-verifier-still-reads-the-lens-through-its-capability-link");

  console.log(`  [AGT-491] assembled: architect ns=${countOf(arch, NS)} lens=${countOf(arch, LENS)} / verifier+${LENS_CAP} lens=${countOf(vf, LENS)}`);
  return results;
}

async function run() {
  const results = [];
  results.push(...armA_pure());

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the live arms (the architect's fifteen non-identity columns against devmanager's; 9 governance rows GV-01..GV-09 distinct; 13 pins with 2 its own at 0 and 1; vf-knowledge-bar still on verify-ship; 0 assignments; and a real assemblePrompt() carrying both pinned Skills once for the architect while the Verifier still carries the lens once)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent -- read them from public.runner_secrets by name and export them inline, per docs/STANDARDS.md Section 2 rule 5.",
    );
    return results;
  }

  const rest = async q => {
    const r = await fetch(`${url}/rest/v1/${q}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    });
    assert.ok(r.ok, `GET /rest/v1/${q} answered ${r.status} -- the live arms cannot grade what they cannot read`);
    return (await r.json()) || [];
  };

  results.push(...(await armB_live(rest)));
  results.push(...(await armC_assembled()));
  return results;
}

selfRun(import.meta.url, run);
export default run;
