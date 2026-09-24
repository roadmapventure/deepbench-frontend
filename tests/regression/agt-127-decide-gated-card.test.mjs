// DeepBench v7.0.585 | tests/regression/agt-127-decide-gated-card.test.mjs | AGT-127 -- the
// Development Manager rules every undecided `gated_before_build` card, and an all-gated board boots
// to do exactly that instead of refusing forever.
//
// THE DEFECT THIS PINS, measured 2026-09-24 19:40Z on the unchanged tree rather than recalled:
// `runner_should_boot()` answered `should_boot=false`, `reason='nothing_pickable'`,
// `detail.pickable_count=0` with SIXTEEN undecided `gated_before_build` cards live (2026-09-16 to
// 2026-09-24). `nothing_pickable` is the refusal `docs/runbooks/runner-cycle.md` names as THE
// UNBOUNDED one -- a refusing fire never boots, so no fire could ever rule the cards that were
// keeping every ticket out of the pick path. `agent_capability_assignments` for `devmanager` held
// `review-audit-worklist` and `run-project` and nothing that could rule a card.
//
// WHY THE LIVE ARM IS A DELTA AND NOT AN ABSOLUTE. "16 cards, so the gate says 16" is true today and
// rots tomorrow: the moment a fire rules one, a literal 16 fails for the right behaviour. Part (c)
// therefore drives the FUNCTION with a fixture card and grades the CHANGE it causes -- and it does
// it in the order that never leaves the live gate reading high: the fixture card is filed WITH an
// open `gate-card-…` question already in place (count unchanged -- the exclusion), the question is
// then withdrawn (count +1 -- the card is counted), and both rows are deleted in a `finally` that
// runs on either arm. The +1 window is one REST call wide.
//
// WHY BOTH DIRECTIONS. Asserting only "the count rises" would pass against a branch that counted
// EVERY gate card and re-fired forever on a card whose decision is genuinely John's -- which is the
// one outcome the `john` ruling exists to prevent, since it writes no card at all. Asserting only
// "the question suppresses it" would pass against a branch that counted nothing and left the board
// refusing exactly as before. The pair is the discriminator.
//
// THE REFUSALS ARE DRIVEN, NOT DESCRIBED (part d). `apply_gate_rulings()` is called with an
// already-decided card and with a ruling word outside its vocabulary, and the live undecided count
// is re-read afterwards -- a validator that refused AND wrote would pass a message-only assertion.
//
// NOT RUN, DECLARED RATHER THAN SILENTLY SKIPPED: `pg_proc`, `pg_get_functiondef` and a BEGIN/
// ROLLBACK transaction are not reachable over PostgREST (SES-310's refusal, unchanged), so the
// one-overload assertion for both functions and the full retired/accept/reverse round trip are
// asserted by the migration's own trailing DO block in the same transaction that wrote them, and
// were re-read independently at this ship. The measured values are quoted in the declaration.
//
// NO MODEL CALL, NO SPEND. Offline parts plus REST reads, one insert pair, one PATCH, one delete pair.

import assert from "assert";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  RULINGS, JOHN_CALLS, GATE_KIND, NOTHING_TO_RULE, qidFor, rulableCards, buildTaskContext,
  validateRulings,
} from "../../scripts/decide-gated-card.js";
import { SERVICE_CATALOG } from "../../shared/ai-patterns.js";

const CAPABILITY = "decide-gated-card";
const INTENT = "dm-gate-intent";
// The six Skill rows the capability REUSES, plus its own Intent: seven links. Reuse is the point --
// the manager speaks in one voice across all three of his capabilities (pattern:13, pattern:17).
const LINKS = [
  "dm-identity", "dm-knowledge-platform", "dm-behavior", INTENT,
  "dm-guardrails", "dm-knowledge-patterns", "dm-knowledge-cycle-card",
];
// runner_should_boot()'s answer is `should_boot` for exactly these two reasons and no others.
const BOOTING = new Set(["pickable", "gate_cards_to_rule"]);

async function pg(url, key, pathAndQuery, init) {
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: {
      apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`${pathAndQuery} returned HTTP ${res.status} ${res.statusText}: ${await res.text()}`);
  }
  const text = await res.text();
  if (text.trim() === "") return [];
  return JSON.parse(text);
}

const bootGate = (url, key) => pg(url, key, "rpc/runner_should_boot", { method: "POST", body: "{}" });

// ---- (a) the vocabulary and the qid, offline ------------------------------------------------
function partA() {
  assert.deepEqual(RULINGS, ["accept", "rework", "retired", "needs-desktop", "john"],
    "the ruling vocabulary is apply_gate_rulings()'s own k_rulings, in its order");
  assert.deepEqual(Object.keys(JOHN_CALLS), ["money", "production", "agents", "ratify"],
    "FOUR calls, not five: docs/WORKING-WITH-JOHN.md's MANAGER-AUTHORITY-MATRIX last row names " +
    "money, production, hiring/switching agents and ratifying a bar he set. audit-review.js's " +
    "JOHN_CALLS is a different, five-entry list for a different capability and must not be reused here");
  // The qid is the ONE join between a `john` ruling and the boot branch that stops re-firing on it.
  // A card id is a uuid; the first 8 hex characters are what apply_gate_rulings() and
  // runner_should_boot() both take, and a drift here presents as a fire ruling the same card hourly.
  assert.equal(qidFor("2d5441c7-5133-4b21-9768-7921dce0c409"), "gate-card-2d5441c7");
  assert.notEqual(qidFor("2d5441c7-5133-4b21-9768-7921dce0c409"), "gate-card-2d5441c7-");
  console.log("  (a) 5 rulings, John's FOUR calls, qid = gate-card-<first 8> -- PASS");
}

// ---- (b) rulableCards / buildTaskContext / validateRulings, offline --------------------------
function partB() {
  const cards = [
    { id: "aaaaaaaa-0000-0000-0000-000000000001", kind: GATE_KIND, decision: null, title: "one", backlog_id: "ZZZ-1" },
    { id: "bbbbbbbb-0000-0000-0000-000000000002", kind: GATE_KIND, decision: null, title: "two", backlog_id: null },
    { id: "cccccccc-0000-0000-0000-000000000003", kind: GATE_KIND, decision: "accept", title: "three", backlog_id: null },
    { id: "dddddddd-0000-0000-0000-000000000004", kind: "ship", decision: null, title: "four", backlog_id: null },
  ];
  const questions = [{ qid: "gate-card-bbbbbbbb", status: "open" }, { qid: "gate-card-aaaaaaaa", status: "answered" }];

  const rulable = rulableCards(cards, questions);
  assert.deepEqual(rulable.map(c => c.title), ["one"],
    "a decided card, a `ship` card and a card carrying an OPEN gate-card question are all out; an " +
    "ANSWERED question does not suppress its card, or a card John already ruled on would never be ruled");

  // NEGATIVE CONTROL: with no questions at all, the same rows yield two -- so the filter above is
  // the question doing the work, not the kind/decision filter alone.
  assert.equal(rulableCards(cards, []).length, 2, "without the open question, two cards are rulable");

  const ctx = buildTaskContext({
    cards, questions,
    tickets: [{ backlog_id: "ZZZ-1", title: "T", description: "D", status: "open", tier: "next", priority_class: "P10 - Tooling" }],
    docs: { "kickoff:ZZZ-1": "K", "harvest:ZZZ-1": "H" },
  });
  assert.equal(ctx.cards.length, 1);
  assert.equal(ctx.cards[0].ticket.title, "T", "the ticket the card names travels with it");
  assert.equal(ctx.cards[0].kickoff, "K");
  assert.equal(ctx.cards[0].harvest, "H");
  assert.deepEqual(Object.keys(ctx.john_calls), ["money", "production", "agents", "ratify"]);
  assert.equal(buildTaskContext({ cards: [], questions: [], tickets: [], docs: {} }), null,
    "nothing rulable returns null, which is the script's exit-3 no-run, no-cost branch");
  assert.ok(NOTHING_TO_RULE.includes("no cost"), "the no-run line says out loud that it cost nothing");

  const rulableCtx = ctx.cards;
  assert.deepEqual(validateRulings({ rulings: [{ card_id: rulableCtx[0].card_id, ruling: "accept", reason: "sound" }] }, rulableCtx),
    { ok: true, refusals: [] });

  const bad = validateRulings({
    rulings: [
      { card_id: rulableCtx[0].card_id, ruling: "maybe", reason: "x" },
      { card_id: rulableCtx[0].card_id, ruling: "accept", reason: "" },
      { card_id: "eeeeeeee-0000-0000-0000-000000000005", ruling: "accept", reason: "x" },
    ],
  }, rulableCtx);
  assert.equal(bad.ok, false);
  assert.ok(bad.refusals.some(r => /is not one of accept, rework, retired, needs-desktop, john/.test(r)), "the vocabulary refusal");
  assert.ok(bad.refusals.some(r => /needs a reason/.test(r)), "the reason refusal");
  assert.ok(bad.refusals.some(r => /appears twice in one call/.test(r)), "the duplicate refusal");
  assert.ok(bad.refusals.some(r => /is not one of the rulable cards/.test(r)), "the unknown-card refusal");
  assert.ok(bad.refusals.length >= 4,
    "EVERY refusal is collected, not the first -- a dry-run that stopped at one would make the " +
    "manager re-run the whole turn per mistake");

  // COVERAGE, which is the clause that closes the loop: a card left out of the answer is a card the
  // next fire meets again.
  const missed = validateRulings({ rulings: [] }, rulableCtx);
  assert.equal(missed.ok, false);
  const partial = validateRulings({
    rulings: [{ card_id: rulableCtx[0].card_id, ruling: "accept", reason: "x" }],
  }, [...rulableCtx, { card_id: "ffffffff-0000-0000-0000-000000000006" }]);
  assert.ok(partial.refusals.some(r => /ffffffff-0000-0000-0000-000000000006 not covered/.test(r)),
    "an uncovered card is named, by id");
  console.log("  (b) rulableCards both directions, task_context, 6 validator refusals incl. coverage -- PASS");
}

// ---- (e) the catalog entry, offline ----------------------------------------------------------
function partE() {
  const entry = SERVICE_CATALOG.find(s => s.slug === CAPABILITY);
  assert.ok(entry,
    `shared/ai-patterns.js carries no SERVICE_CATALOG entry for ${CAPABILITY}. scripts/agent-log.js ` +
    "refuses any --ai-type outside that array, so the mandatory Layer-3 row for a ruling run would " +
    "be refused and the call would go unlogged (SES-338, .claude/rules/capability-logging.md)");
  assert.equal(entry.serviceType, "ai");
  assert.deepEqual(entry.patterns, ["Structured Output", "LLM-as-Judge / Verifier"]);
  assert.equal(entry.roadmap, "now");
  console.log("  (e) decide-gated-card is in SERVICE_CATALOG with its two patterns -- PASS");
}

async function run() {
  partA();
  partB();
  partE();

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "parts (c) and (d): the live runner_should_boot() gate-card branch and apply_gate_rulings()'s refusals",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent. Both halves of this ticket's change are " +
        "Postgres functions and four tables of data rows, so there is no source-parsed stand-in. " +
        "Canonical invocation: docs/STANDARDS.md Section 2 rule 5.",
    );
    return;
  }

  // ---- (c) the boot branch, driven -----------------------------------------------------------
  const cycles = await pg(url, key, "runner_cycles?select=id&order=started_at.desc&limit=1");
  assert.equal(cycles.length, 1, "runner_cycles is empty -- runner_items.cycle_id is NOT NULL and FK");
  const cycleId = cycles[0].id;

  const before = (await bootGate(url, key))[0];
  assert.ok(before, "runner_should_boot() returned no row");
  assert.ok(Object.prototype.hasOwnProperty.call(before.detail, "gate_cards_to_rule"),
    "detail carries no gate_cards_to_rule key -- the AGT-127 branch did not ship");
  assert.equal(before.should_boot, BOOTING.has(before.reason),
    `should_boot (${before.should_boot}) must agree with the reason (${before.reason}); exactly ` +
    "pickable and gate_cards_to_rule boot, and nothing else");
  if (before.reason === "gate_cards_to_rule") {
    assert.equal(before.detail.mode, "rule-cards-only",
      "a gate_cards_to_rule fire must declare detail.mode='rule-cards-only' -- a fire that read the " +
      "reason and not the mode would try to build on a board with nothing pickable");
    assert.equal(Number(before.detail.pickable_count), 0,
      "gate_cards_to_rule may only be reached with pickable_count = 0; it is refusal 6's twin, " +
      "never a shortcut past the walls above it");
  } else {
    assert.strictEqual(before.detail.mode, null, "mode is null on every other verdict");
  }
  const baseCount = Number(before.detail.gate_cards_to_rule);
  assert.ok(Number.isInteger(baseCount) && baseCount >= 0, `gate_cards_to_rule must be an integer, got ${before.detail.gate_cards_to_rule}`);

  let cardId = null;
  let qid = null;
  try {
    const created = await pg(url, key, "runner_items", {
      method: "POST", headers: { Prefer: "return=representation" },
      body: JSON.stringify([{
        cycle_id: cycleId, kind: GATE_KIND, decision: null, backlog_id: null,
        title: "AGT-127 regression fixture card — never ruled, deleted in finally",
      }]),
    });
    assert.equal(created.length, 1, "the fixture gate card was not created");
    cardId = created[0].id;
    assert.equal(created[0].decision, null, "the fixture card must be UNDECIDED -- a decided one proves nothing");
    qid = qidFor(cardId);

    // The question goes in FIRST, so the live gate never reads high because of this file.
    await pg(url, key, "runner_questions", {
      method: "POST", headers: { Prefer: "return=minimal" },
      body: JSON.stringify([{
        qid, question: "AGT-127 regression fixture question — deleted in finally",
        context: "tests/regression/agt-127-decide-gated-card.test.mjs", asked_cycle: cycleId, status: "open",
      }]),
    });

    const suppressed = (await bootGate(url, key))[0];
    assert.equal(Number(suppressed.detail.gate_cards_to_rule), baseCount,
      `(c1) an undecided gate card carrying an OPEN ${qid} question must NOT be counted: the count ` +
      `moved from ${baseCount} to ${suppressed.detail.gate_cards_to_rule}. This is the exit that ` +
      "closes the loop -- a `john` ruling writes no card, so without it the same card would be " +
      "ruled again on every fire, forever.");

    await pg(url, key, `runner_questions?qid=eq.${qid}`, {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status: "withdrawn" }),
    });

    const counted = (await bootGate(url, key))[0];
    assert.equal(Number(counted.detail.gate_cards_to_rule), baseCount + 1,
      `(c2) with no OPEN question naming it, the same undecided card MUST be counted: expected ` +
      `${baseCount + 1}, got ${counted.detail.gate_cards_to_rule}. A branch that counted nothing ` +
      "would leave the board refusing exactly as it did before this ship.");
    assert.equal(counted.should_boot, BOOTING.has(counted.reason),
      "should_boot and reason must still agree once the fixture is counted");

    // ---- (d) the refusals, DRIVEN against the live function --------------------------------
    const undecidedBefore = await pg(url, key, `runner_items?kind=eq.${GATE_KIND}&decision=is.null&select=id`);

    const call = async rulings => {
      const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/rpc/apply_gate_rulings`, {
        method: "POST",
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ p_rulings: rulings, p_cycle_id: cycleId, p_session_name: null }),
      });
      return { status: res.status, text: await res.text() };
    };

    const decided = await pg(url, key, `runner_items?kind=eq.${GATE_KIND}&decision=not.is.null&select=id&limit=1`);
    if (decided.length === 1) {
      const r = await call([{ card_id: decided[0].id, ruling: "accept", reason: "AGT-127 regression probe" }]);
      assert.ok(r.status >= 400, `(d1) a ruling on an ALREADY-DECIDED card must be refused, got HTTP ${r.status}`);
      assert.ok(r.text.includes(decided[0].id),
        `(d1) the refusal must NAME the card id (${decided[0].id}); a manager handed "one card was " +
        "already decided" cannot tell which of sixteen to drop. Got: ${r.text.slice(0, 300)}`);
      assert.ok(/already decided/.test(r.text), "(d1) the refusal must say why");
    } else {
      console.log("  (d1) NOT RUN: no decided gated_before_build card live to probe with");
    }

    const r2 = await call([{ card_id: cardId, ruling: "maybe", reason: "AGT-127 regression probe" }]);
    assert.ok(r2.status >= 400, `(d2) a ruling word outside the vocabulary must be refused, got HTTP ${r2.status}`);
    assert.ok(/is not one of accept, rework, retired, needs-desktop, john/.test(r2.text),
      `(d2) the refusal must name the whole vocabulary. Got: ${r2.text.slice(0, 300)}`);

    const r3 = await call([]);
    assert.ok(r3.status >= 400, "(d3) an empty p_rulings array must be refused");

    // THE REFUSALS WROTE NOTHING. A validator that refused and still stamped would pass every
    // message assertion above; this is the arm that catches it.
    const undecidedAfter = await pg(url, key, `runner_items?kind=eq.${GATE_KIND}&decision=is.null&select=id`);
    assert.equal(undecidedAfter.length, undecidedBefore.length,
      `(d4) three refused calls must write nothing: undecided gate cards went ${undecidedBefore.length} -> ` +
      `${undecidedAfter.length}. apply_gate_rulings() validates the WHOLE batch before its first write.`);

    // ---- (f) the data rows are live ---------------------------------------------------------
    const cap = await pg(url, key, `capabilities?slug=eq.${CAPABILITY}&select=slug,execution_type,tenant_id,default_intent_slug`);
    assert.equal(cap.length, 1, `exactly one capabilities row for ${CAPABILITY}`);
    assert.equal(cap[0].default_intent_slug, INTENT, "the capability names its Intent Skill, which is what --prepare reads instead of taking an --intent flag");
    assert.equal(cap[0].execution_type, "ai");
    const links = await pg(url, key, `capability_skill_profiles?capability_slug=eq.${CAPABILITY}&select=skill_profile_slug&order=display_order`);
    assert.deepEqual(links.map(l => l.skill_profile_slug), LINKS,
      "seven links: the six Skill rows the manager's other capabilities already use, plus this one's " +
      "own Intent. The Intent link is NOT optional -- assemblePrompt() throws when intent_slug " +
      "matches no Intent Skill Profile FOR THIS CAPABILITY (AA-108), so six links would refuse every run");
    const assigned = await pg(url, key, `agent_capability_assignments?agent_id=eq.devmanager&capability_slug=eq.${CAPABILITY}&select=tenant_id`);
    assert.equal(assigned.length, 1, "devmanager holds the assignment -- without it he cannot rule a card");
    const intent = await pg(url, key, `skill_profiles?slug=eq.${INTENT}&select=skill_type_slug,traits`);
    assert.equal(intent.length, 1);
    assert.equal(intent[0].skill_type_slug, "intent");
    const schema = intent[0].traits?.schema;
    assert.ok(schema?.properties?.rulings, "the stored contract declares `rulings`");
    assert.deepEqual(schema.properties.rulings.items.properties.ruling.enum, RULINGS,
      "the stored contract's ruling enum and the script's RULINGS are the same five words -- two " +
      "copies that could disagree is how a manager returns an answer SQL then refuses");
    assert.ok(!Object.prototype.hasOwnProperty.call(schema.properties, "reasoning"),
      "no Intent Skill may declare a property named `reasoning`: paired with the platform-injected " +
      "`account` receipt the Anthropic API refuses the whole request before the model sees it (SES-347)");

    console.log(`  (c) gate_cards_to_rule ${baseCount} -> ${baseCount} with an open question -> ${baseCount + 1} without it; ` +
      `live verdict ${before.reason}/${before.should_boot}, mode ${JSON.stringify(before.detail.mode)}`);
    console.log("  (d) three refusals driven against the live function, 0 rows written");
    console.log(`  (f) ${CAPABILITY}: 1 capability, ${links.length} links, 1 assignment, contract enum matches`);
  } finally {
    if (qid) {
      await pg(url, key, `runner_questions?qid=eq.${qid}`, { method: "DELETE", headers: { Prefer: "return=minimal" } })
        .catch(e => console.log(`  [AGT-127] WARNING: question cleanup failed (${e.message}); delete runner_questions where qid = '${qid}' by hand`));
    }
    if (cardId) {
      await pg(url, key, `runner_items?id=eq.${cardId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } })
        .catch(e => console.log(`  [AGT-127] WARNING: card cleanup failed (${e.message}); delete runner_items ${cardId} by hand`));
    }
    const leftCard = cardId ? await pg(url, key, `runner_items?id=eq.${cardId}&select=id`).catch(() => []) : [];
    const leftQ = qid ? await pg(url, key, `runner_questions?qid=eq.${qid}&select=qid`).catch(() => []) : [];
    assert.deepEqual(leftCard, [], "the fixture card must be gone -- a run leaves the board as it found it");
    assert.deepEqual(leftQ, [], "the fixture question must be gone");
  }

  notRun(
    "AGT-127: exactly ONE pg_proc overload of public.apply_gate_rulings and public.runner_should_boot, " +
      "and the full retired/accept/reverse round trip under one decision handle",
    "pg_proc, pg_get_functiondef and BEGIN/ROLLBACK are not reachable over PostgREST (SES-310's " +
      "refusal, unchanged). The migration agt127_gate_card_rulings asserts both overload counts in a " +
      "trailing DO block in the SAME transaction that wrote them. Measured at this ship (2026-09-24, " +
      "v7.0.585): apply_gate_rulings overloads = 1, identity (p_rulings jsonb, p_cycle_id uuid, " +
      "p_session_name text); runner_should_boot overloads = 1, identity () -- UNCHANGED, no parameter " +
      "added or retyped (.claude/rules/supabase-function-signature.md). The round trip replayed as one " +
      "BEGIN/ROLLBACK: a `retired` ruling stamped the card retired and moved its ticket to 'removal " +
      "proposed', an `accept` ruling stamped its card and left its ticket open and back in " +
      "prime_directive_queue(); ONE kind='gate' decision handle carried 3 before-images (1 " +
      "backlog_items, 2 runner_items), each with row_data non-null; reverse_decision(handle,'John','qa') " +
      "returned outcome=applied restored=1 refused=1, restoring the ticket to 'open' and refusing the " +
      "card stamp BY NAME under Guard B. 0 fixture rows left behind.",
  );
}

export default run;
selfRun(import.meta.url, run);
