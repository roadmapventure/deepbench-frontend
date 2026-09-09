// DeepBench v7.0.428 | tests/regression/agt-63-prioritizer.test.mjs | AGT-63 -- The Prioritizer:
// the seed rows are real, the handler is REACHABLE, and it fails closed on a bare-digit class.
//
// WHAT IS PINNED, and where a lazier guard would go vacuously green.
//
// (1) THE REGISTRATION, NOT THE FILE. Asserting api/_lib/handlers/prioritizer-write.js exists
// passes against a tree where nothing can ever call it: which handler runs is data
// (`traits.handler` on the Skill Profile), but the map that slug is looked up in is a hardcoded
// object literal in api/prompt/request-receivable.js, and KNOWN_HANDLERS is derived from it -- an
// unregistered slug 501s before any handler function is entered. So the assertion below is that
// the slug is IN THE MAP, and its mutation control is the same predicate run against the map text
// with that entry deleted, which must be rejected.
//
// (2) THE NEGATIVE CONTROL IS THE POINT OF THE HANDLER. John's standard is that a class is always
// written in its full named form ("P10 - Tooling"), never a bare digit -- and `priority_class`
// carries NO database constraint of its own (read out of pg_constraint at this ship: the only
// class-shaped CHECKs are ck_backlog_supports_class_form and ck_backlog_supports_reason_with_class,
// both on the supports_ pair). The handler is therefore the ONLY gate a bare digit ever meets, and
// a test that only exercised the happy path would leave that gate untested. The refusal arm asserts
// two things, not one: the returned result says refused, AND the fixture row is byte-identical
// afterwards -- a handler that refused in its return value while having already written would pass
// the first and fail the second.
//
// (3) THE POSITIVE ARM ASSERTS THE PATH TAKEN, NOT JUST THE OUTPUT. "The row now says P10 - Tooling"
// is true of a hand-written UPDATE too. The reversibility chain is what this ticket actually built,
// so the arm asserts the runner_decisions row, the runner_before_images row, and -- the part that
// silently would not exist if someone reordered the writes -- that the image carries
// `decision_id`, because reverse_decision() selects the rows to restore by
// `bi.decision_id = p_decision`. An image written without it is invisible to John's Reverse.
// It also asserts the image's row_data holds the PRIOR class, not the new one.
//
// (4) AND THAT THE UPDATE DID NOT TOUCH updated_at. SES-316 pointed reverse_decision()'s
// written-since guard at the decision's own decided_at; an `updated_at = now()` written a few
// milliseconds after record_decision() (they are separate REST calls) would sort AFTER decided_at
// and make every row this handler touches refuse to restore. There is no updated_at trigger on
// backlog_items, so "don't write it" is sufficient -- and this assertion is what stops a later
// editor tidying it back in.
//
// NO MODEL CALL AND NO SPEND. The handler makes none; this file exercises it directly. The
// Prioritizer's own judgment (does the Skill text actually produce John's rulings?) is the
// kickoff's attended three-ticket QA, whose outputs live in the v7.0.428 commit body -- a
// permanent regression test must not bill an Anthropic call on every run.
//
// THE FIXTURE IS INSERTED AND DELETED, and its id is deliberately outside every live prefix.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");

const RECEIVABLE_REL = "api/prompt/request-receivable.js";
const HANDLER_REL = "api/_lib/handlers/prioritizer-write.js";
const AGENTS_REL = "src/data/agents.js";

const HANDLER_SLUG = "prioritizer-write";
const AGENT_ID = "prioritizer";
const CAPABILITIES = ["classify-ticket", "rank-backlog"];
const SKILL_SLUGS = [
  "pz-identity", "pz-knowledge-classes", "pz-knowledge-john",
  "pz-behavior", "pz-classify-intent", "pz-rank-intent", "pz-format", "pz-guardrails",
];
// The six Skill types the capability must carry. Named as a SET rather than counted, because
// `length === 6` passes against six copies of one type.
const SKILL_TYPES = ["identity", "knowledge", "behavior", "intent", "format", "guardrails"];

const FIXTURE_BACKLOG_ID = "ZZPRIOR-63";

// Exported so the predicate itself is checkable rather than being invisible inside one assertion.
export function registersHandler(receivableSrc, slug) {
  const map = /const HANDLERS = \{[\s\S]*?\};/.exec(receivableSrc);
  if (!map) return false;
  return map[0].includes(`'${slug}'`) || map[0].includes(`"${slug}"`);
}

export default async function run() {
  // ── Source arm: the handler is reachable, and the bench entries exist ──────────────────────
  const receivable = read(RECEIVABLE_REL);
  assert.ok(fs.existsSync(path.join(ROOT, HANDLER_REL)), `${HANDLER_REL} must exist`);
  assert.ok(registersHandler(receivable, HANDLER_SLUG),
    `'${HANDLER_SLUG}' must appear in the HANDLERS map in ${RECEIVABLE_REL} -- an unregistered slug 501s ` +
    "at KNOWN_HANDLERS before the handler function is ever entered, so the file existing proves nothing.");

  // Mutation control: the same predicate, run against the map with the entry removed, must reject.
  const mutant = receivable.replace(new RegExp(`,\\s*'${HANDLER_SLUG}':\\s*\\w+`), "");
  assert.ok(!registersHandler(mutant, HANDLER_SLUG),
    "registersHandler() must reject a HANDLERS map with the entry deleted -- a predicate that " +
    "cannot reject the mutant is not measuring anything.");

  const handlerSrc = read(HANDLER_REL);
  assert.ok(!/status\s*:/.test(handlerSrc.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")),
    "prioritizer-write must never author backlog_items.status -- that is the runner's own lifecycle");
  assert.ok(!/updated_at/.test(handlerSrc.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")),
    "prioritizer-write must not write updated_at (SES-316: a stamp later than the decision's " +
    "decided_at makes reverse_decision() refuse every row this handler touched)");

  const agentsSrc = read(AGENTS_REL);
  assert.ok(/prioritizer:\s*\{[^}]*border:/.test(agentsSrc), "AVATAR_CFG.prioritizer must exist in src/data/agents.js");
  assert.ok(/prioritizer:\s*\{\s*subject:\s*"they",\s*object:\s*"them",\s*possessive:\s*"their"\s*\}/.test(agentsSrc),
    "AGENT_PRONOUNS.prioritizer must be they/them/their");
  // Governance agents stay OFF the bench until the exit review rules on how they render.
  const agentsArray = /export const AGENTS = \[[\s\S]*?\n\];/.exec(agentsSrc);
  assert.ok(agentsArray, "could not locate the AGENTS array in src/data/agents.js");
  assert.ok(!/id:\s*["']prioritizer["']/.test(agentsArray[0]),
    "prioritizer must NOT be in the static AGENTS list (AGT-63 Task 3)");

  // ── Live arm ──────────────────────────────────────────────────────────────────────────────
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("AGT-63 live arm (seed rows + handler write/refuse against Supabase)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY not set; export them from public.runner_secrets by name " +
      "(docs/runbooks/session-setup.md step 1b) and re-run: " +
      "SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node tests/regression/run-all.js");
    return;
  }

  const H = { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` };
  const rest = async (p, init = {}) => {
    const r = await fetch(`${url}/rest/v1/${p}`, { ...init, headers: { ...H, ...(init.headers || {}) } });
    if (!r.ok) throw new Error(`${init.method || "GET"} ${p} -> ${r.status} ${await r.text()}`);
    const t = await r.text();
    return t ? JSON.parse(t) : null;
  };

  // The seed rows, asserted as content rather than as a count.
  const agent = (await rest(`agents?id=eq.${AGENT_ID}&select=id,code,lane,is_active`))[0];
  assert.ok(agent, "no agents row for 'prioritizer' -- run docs/design/agt-63-prioritizer-seed.sql");
  assert.equal(agent.lane, "governance", "the Prioritizer must be in the governance lane (SES-330)");
  const productRoster = await rest("agents?is_active=eq.true&lane=eq.product&select=id");
  assert.ok(!productRoster.some(a => a.id === AGENT_ID),
    "the Prioritizer must not appear in the product roster the delegation broker reads");

  const profiles = await rest(`skill_profiles?slug=in.(${SKILL_SLUGS.join(",")})&select=slug,skill_type_slug,traits,llm_model`);
  assert.equal(profiles.length, SKILL_SLUGS.length, `expected ${SKILL_SLUGS.length} pz-* skill_profiles, got ${profiles.length}`);
  const typesPresent = new Set(profiles.map(p => p.skill_type_slug));
  for (const t of SKILL_TYPES) assert.ok(typesPresent.has(t), `Skill type "${t}" missing from the Prioritizer's profiles`);
  for (const slug of ["pz-classify-intent", "pz-rank-intent"]) {
    const p = profiles.find(x => x.slug === slug);
    assert.equal(p.traits?.handler, HANDLER_SLUG, `${slug}.traits.handler must be '${HANDLER_SLUG}'`);
  }

  const links = await rest(`capability_skill_profiles?capability_slug=in.(${CAPABILITIES.join(",")})&select=capability_slug,skill_profile_slug`);
  assert.equal(links.length, 14, `expected 14 capability_skill_profiles rows, got ${links.length}`);
  for (const cap of CAPABILITIES) {
    assert.equal(links.filter(l => l.capability_slug === cap).length, 7, `${cap} must link 7 Skill profiles`);
  }
  const assigns = await rest(`agent_capability_assignments?agent_id=eq.${AGENT_ID}&select=capability_slug`);
  assert.deepEqual(assigns.map(a => a.capability_slug).sort(), [...CAPABILITIES].sort());

  // ── The handler, exercised directly against a fixture ticket ──────────────────────────────
  const { handle } = await import("../../api/_lib/handlers/prioritizer-write.js");
  const supabaseHeaders = { ...H };
  const sessionTag = `agt63-test-${Date.now()}`;
  let fixtureUuid = null;

  try {
    await rest(`backlog_items?backlog_id=eq.${FIXTURE_BACKLOG_ID}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    const inserted = await rest("backlog_items", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        backlog_id: FIXTURE_BACKLOG_ID,
        tier: "later",
        status: "open",
        type: "Tooling",
        priority_class: "P5 - Enhancements",
        title: "AGT-63 regression fixture -- inserted and deleted by this test",
        description: "Fixture row for tests/regression/agt-63-prioritizer.test.mjs. Never a real ticket.",
        source_file: "tests/regression/agt-63-prioritizer.test.mjs",
        row_ordinal: 999999,
      }),
    });
    fixtureUuid = inserted[0].id;
    const originalUpdatedAt = inserted[0].updated_at;

    // --- NEGATIVE CONTROL: a bare-digit class refuses the WHOLE payload, and writes nothing. ---
    const refused = await handle({
      agent_id: AGENT_ID,
      tenant_id: "global",
      content: {
        backlog_id: FIXTURE_BACKLOG_ID,
        priority_class: "P10",            // <-- the bare digit John's standard forbids
        supports_class: null,
        supports_reason: null,
        type: "Tooling",
        claim_refs: ["pattern:137"],
        confidence: "high",
      },
      supabaseUrl: url,
      supabaseHeaders,
      handler_context: { trace_id: sessionTag },
    });
    assert.equal(refused.handler_result.written, false, "a bare-digit class must not be written");
    assert.equal(refused.handler_result.refused, true, "a bare-digit class must be refused explicitly");

    const afterRefusal = (await rest(`backlog_items?backlog_id=eq.${FIXTURE_BACKLOG_ID}&select=priority_class,supports_class,type,updated_at`))[0];
    assert.equal(afterRefusal.priority_class, "P5 - Enhancements",
      "the refused payload must leave the row untouched -- a refusal returned AFTER a write is not a refusal");
    const decisionsAfterRefusal = await rest(`runner_decisions?session_name=eq.prioritizer:${sessionTag}&select=id`);
    assert.equal(decisionsAfterRefusal.length, 0, "a refused payload must record no decision");

    // --- POSITIVE ARM: a valid ruling writes the board and leaves the reversal chain behind. ---
    const accepted = await handle({
      agent_id: AGENT_ID,
      tenant_id: "global",
      content: {
        backlog_id: FIXTURE_BACKLOG_ID,
        priority_class: "P10 - Tooling",
        supports_class: "P1 - Improves John's Skills",
        supports_reason: "Fixture: names a P1 artifact so the supports_reason CHECK is exercised.",
        type: "Tooling",
        claim_refs: ["pattern:137", "VC-MISSION-033"],
        confidence: "high",
      },
      supabaseUrl: url,
      supabaseHeaders,
      handler_context: { trace_id: sessionTag },
    });
    assert.equal(accepted.handler_result.written, true, `handler refused a valid payload: ${accepted.handler_result.reason}`);
    const decisionId = accepted.handler_result.decision_id;
    assert.ok(decisionId, "the handler must return the decision id it recorded");

    const after = (await rest(`backlog_items?backlog_id=eq.${FIXTURE_BACKLOG_ID}&select=priority_class,supports_class,supports_reason,type,status,updated_at`))[0];
    assert.equal(after.priority_class, "P10 - Tooling", "the ruling's class must reach the board");
    assert.equal(after.supports_class, "P1 - Improves John's Skills", "the served class must reach the board");
    assert.equal(after.status, "open", "the handler must never write status");
    assert.equal(after.updated_at, originalUpdatedAt,
      "updated_at must be untouched -- a stamp later than the decision's decided_at makes " +
      "reverse_decision() refuse this row (SES-316)");

    const decision = (await rest(`runner_decisions?id=eq.${decisionId}&select=id,kind,backlog_id,session_name,cycle_id,reasoning,decided_at`))[0];
    assert.ok(decision, "the ruling must record a runner_decisions row so John can reverse it");
    assert.equal(decision.kind, "classification");
    assert.equal(decision.backlog_id, FIXTURE_BACKLOG_ID);
    assert.equal(decision.cycle_id, null, "a capability execution has no cycle -- it is the session_name side of ck_decision_attribution");
    assert.ok(decision.reasoning.includes("pattern:137"), "the decision's reasoning must carry the ruling's own claim refs");

    const images = await rest(`runner_before_images?decision_id=eq.${decisionId}&select=id,table_name,pk_value,row_data,session_name,cycle_id`);
    assert.equal(images.length, 1, `expected exactly 1 before-image under decision ${decisionId}, got ${images.length}`);
    const image = images[0];
    assert.equal(image.table_name, "backlog_items");
    assert.equal(image.pk_value, fixtureUuid, "the before-image addresses the row by its primary key, not by backlog_id");
    assert.equal(image.row_data.priority_class, "P5 - Enhancements",
      "the image must hold the PRIOR state -- an image of the new state restores nothing");
    // The kickoff asks for the before-image to be printed.
    console.log(`[AGT-63] before-image ${image.id} under decision ${decisionId}: ` +
      `backlog_items ${image.pk_value} priority_class=${JSON.stringify(image.row_data.priority_class)} ` +
      `supports_class=${JSON.stringify(image.row_data.supports_class)} type=${JSON.stringify(image.row_data.type)}`);

    // The chain reverse_decision() actually walks: image.decision_id -> the decision, and the
    // decision decided at or after the row's own last write, so the written-since guard passes.
    assert.ok(new Date(decision.decided_at) >= new Date(after.updated_at),
      "the decision must not predate the row's updated_at, or its own reversal would be refused");
  } finally {
    // Order matters: runner_before_images.decision_id FKs runner_decisions.
    await fetch(`${url}/rest/v1/runner_before_images?session_name=eq.${encodeURIComponent(`prioritizer:${sessionTag}`)}`, { method: "DELETE", headers: H }).catch(() => {});
    await fetch(`${url}/rest/v1/runner_decisions?session_name=eq.${encodeURIComponent(`prioritizer:${sessionTag}`)}`, { method: "DELETE", headers: H }).catch(() => {});
    if (fixtureUuid) {
      await fetch(`${url}/rest/v1/backlog_items?id=eq.${fixtureUuid}`, { method: "DELETE", headers: H }).catch(() => {});
    }
  }
}

selfRun(import.meta.url, run);
