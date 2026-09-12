// DeepBench v7.0.458 | tests/regression/ses-373-card-only-self-decides.test.mjs | SES-373
//
// FEATURE: SES-373 -- a card-only rollback decision records itself. Before this ship
// `scripts/rollback-on-red.js`'s CARD_ONLY branch filed its incident card with `decision NULL`, and
// `ses-285` assertion 6 reads exactly that column as "a human is being waited on" (M6-01). Five
// live cards stood undecided for a defect the engine could not name: the hold WAS the whole of the
// action taken, so there was never an ask to answer.
//
// THREE ARMS, AND THE SPLIT IS THE POINT:
//   * (A) PURE -- stampCardOnly() / rollbackDecisionArgs() over real decide() output. Always runs.
//   * (B) SEAM PROOF (labelled as such wherever its result is reported) -- globalThis.fetch is
//     swapped for a recorder and the three writes main()'s card-only path makes are asserted IN
//     ORDER, with the decision uuid threaded through all three. It proves the WIRING, not the
//     database: no row is written anywhere.
//   * (C) LIVE -- the board itself, credential-gated and DECLARED not-run otherwise (SES-180),
//     never silently skipped. It is the only arm that can see the backfill.
//
// EVERY ARM CARRIES A NEGATIVE CONTROL, and two of them are RETIRED DESIGNS asserted to LOSE on the
// SAME fixture, so the guard proves a DIFFERENCE rather than a property both branches share:
//   * (A) the REVERT_AND_CARD branch's card is built from the same engine and is NOT stamped. If
//     stamping were unconditional this clause fails -- and the revert branch must stay undecided
//     until the cycle executes the plan (kickoff §7 discovery 1).
//   * (B) the retired "file the card anyway, decision or not" form is shown to lose: with the rpc
//     answering HTTP 500, recordRollbackDecision returns { error } and the REAL main() source is
//     asserted to `fail(2` between the record and the filing. A card with no decision is the defect
//     this ticket closes, not a lesser evil, so no-card-at-all is the chosen fail direction.
//   * (C) the ses-285 `breaks` shape over the fetched state, plus the SES-158 vacuous-control
//     meta-assert (a control that changes nothing proves nothing, and only checking the control
//     itself catches it).
//
// THE POLICY IS READ OUT OF THE SHIPPED MODULE, never restated here (SES-45: a test that recreates
// the logic under test passes against the bug it guards). The three constants, the reason prefix and
// the source ORDER all come from scripts/rollback-on-red.js itself, and CLOSE_MARKER is imported
// from the ses-285 test rather than re-typed -- the same cross-import precedent ses-285 set on
// ses-280. That import is load-bearing: SES-373's reason strings must NOT begin with ses-285's close
// marker, or assertion 7 would select these rows and apply its backlog_id-must-resolve rule to
// cards that carry no backlog_id by design.
//
// DRY-RUN RESULT (STANDARDS.md Section 4, the SES-76 rule). Measured on the unchanged tree at
// origin/dev@3cddea3f before a line of the engine was edited: arms (A) and (B) failed AT IMPORT
// ("The requested module '../../scripts/rollback-on-red.js' does not provide an export named
// 'CARD_ONLY_DECISION'") -- structural by design, which is what a brand-new export can fail as and
// is said here rather than left to look like coverage -- and arm (C) failed on its first assertion
// with 5 undecided gated cards. After the ship: 3/3 arms pass and the count is 0.
//
// WHAT THIS FILE DOES NOT COVER, declared rather than implied:
//   * The REVERT_AND_CARD card is still filed undecided. That is deliberate (its action is executed
//     by the cycle behind the push gates, so the record belongs to the cycle at the moment it
//     pushes) and it is asserted as the (A) negative control -- but nothing here guards the cycle
//     ever writing it. 0 live rows have ever taken that branch; kickoff §7 discovery 1.
//   * The 72-hour reversal window is named in the reason text, never exercised. runner_items carries
//     no updated_at, so reverse_decision() counts these rows `unverifiable`; the before-images hold
//     each full prior row for a hand restore and the backfill's reasoning says so.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { selfRun, notRun } from "./_lib/self-run.js";
import { CLOSE_MARKER } from "./ses-285-m6-autonomy.test.mjs";

import {
  ACTIONS,
  ROLLBACK_DECISION_KIND,
  CARD_ONLY_DECISION,
  CARD_ONLY_REASON_PREFIX,
  decide,
  buildIncidentCard,
  rollbackDecisionArgs,
  stampCardOnly,
  recordRollbackDecision,
  fileIncidentCard,
} from "../../scripts/rollback-on-red.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ENGINE_SRC = fs.readFileSync(path.join(REPO, "scripts", "rollback-on-red.js"), "utf8");
const MAIN_SRC = ENGINE_SRC.slice(ENGINE_SRC.indexOf("async function main()"));

const HEAD = "abc1234def5678";
const CYCLE = "cyc-373";
const CYCLES = [{ id: "cyc-1", push_sha: HEAD, version: "v7.0.457" }];
const ANCHOR = { commit_sha: "0000green0000", migration_watermark: "20260912000001" };

// SES-182's own fixture, re-stated here because that file exports none: red, attributable, anchored,
// watermark UNCHANGED -- the one shape that reverts.
function revertableFacts(over = {}) {
  return {
    trigger: "ci-red",
    jobs: [
      { name: "Build (blocking)", conclusion: "success" },
      { name: "Tripwire + regression (blocking)", conclusion: "failure" },
    ],
    headSha: HEAD,
    greenAnchor: ANCHOR,
    currentWatermark: ANCHOR.migration_watermark,
    cycles: CYCLES,
    ...over,
  };
}

// Card-only BY CONSTRUCTION: the watermark moved and no migration list was supplied, so
// schemaPlanFor() fails closed and decide() reaches CARD_ONLY. Asserted below rather than assumed.
function cardOnlyFacts(over = {}) {
  return revertableFacts({ currentWatermark: "moved", migrations: [], downs: [], ...over });
}

const CTX = { cycleId: CYCLE, headSha: HEAD, beforeImages: [], trigger: "ci-red" };
const UUID = "11111111-2222-4333-8444-555555555555";

// ---------------------------------------------------------------------------
// (A) PURE
// ---------------------------------------------------------------------------

function theFixtureIsCardOnly() {
  assert.strictEqual(decide(cardOnlyFacts()).action, ACTIONS.CARD_ONLY,
    "the fixture must reach CARD_ONLY, or every clause below grades the wrong branch");
  assert.strictEqual(decide(revertableFacts()).action, ACTIONS.REVERT_AND_CARD,
    "the control fixture must reach REVERT_AND_CARD, or the (A) negative control proves nothing");
}

function aCardOnlyCardIsStamped() {
  const built = buildIncidentCard(decide(cardOnlyFacts()), CTX);
  const stamped = stampCardOnly(built, "dec-1");

  assert.strictEqual(stamped.decision, CARD_ONLY_DECISION,
    "a card-only hold is filed decided -- 'retired' = withdrawn as an ask (SES-300), never 'accept'");
  assert.ok(stamped.decision_reason.startsWith(CARD_ONLY_REASON_PREFIX),
    `the reason must begin with the shipped prefix (${CARD_ONLY_REASON_PREFIX}), read from the module`);
  assert.ok(stamped.decision_reason.includes("dec-1"),
    "the reason must NAME the decision row -- that text plus runner_before_images.decision_id IS the link");
  assert.ok(!stamped.decision_reason.startsWith(CLOSE_MARKER),
    `the reason must NOT begin with ses-285's "${CLOSE_MARKER}" -- assertion 7 selects on that prefix ` +
    "and would then demand a resolving backlog_id from a card that carries none by design");
  assert.ok(!Number.isNaN(Date.parse(stamped.decided_at)),
    "decided_at must be a parseable timestamp, not a placeholder");

  // Pure: never mutates its input.
  assert.strictEqual(built.decision, undefined, "stampCardOnly must not mutate the card it was given");
  assert.strictEqual(built.decision_reason, undefined, "stampCardOnly must return a COPY");

  // Attribution is not optional: a stamp naming no decision is the defect wearing a value.
  assert.throws(() => stampCardOnly(built, null), /decision/i,
    "stampCardOnly must refuse a falsy decision id rather than writing 'retired' with nothing behind it");

  // NEGATIVE CONTROL -- the REVERT branch, same engine, same builder, NOT stamped. This asserts a
  // DIFFERENCE between the two card branches, not a property both share.
  const revertCard = buildIncidentCard(decide(revertableFacts()), CTX);
  assert.strictEqual(revertCard.decision, undefined,
    "the revert branch's card must stay undecided -- its action is executed by the cycle, so the " +
    "record belongs to the cycle at the moment it pushes (kickoff §7 discovery 1)");
  assert.notStrictEqual(stamped.decision, revertCard.decision,
    "the two branches must DIFFER on `decision`, or stamping is unconditional and this proves nothing");
}

function theDecisionArgsCarryTheirAttribution() {
  const d = decide(cardOnlyFacts());
  const args = rollbackDecisionArgs(d, { cycleId: CYCLE, version: "v7.0.458", trigger: "ci-red", headSha: HEAD });

  assert.strictEqual(args.p_cycle_id, CYCLE, "the decision is attributed to the cycle passed in");
  assert.strictEqual(args.p_session_name, null,
    "ck_decision_attribution admits EXACTLY ONE of cycle_id / session_name -- an unattended cycle sets the cycle");
  assert.strictEqual(args.p_kind, ROLLBACK_DECISION_KIND, "the kind is read from the module, not retyped");
  assert.strictEqual(args.p_backlog_id, null,
    "an incident is not a board ticket -- backlog_id stays NULL (SES-116: it is a JOIN KEY)");
  assert.strictEqual(args.p_ladder_work_class, null,
    "finalising a hold moves no rung, so the ladder work class is NULL");
  assert.ok(args.p_reasoning.includes(d.reason),
    "the decision's reasoning must CARRY the engine's own reason -- one home for the why");
  assert.match(args.p_reasoning, /pattern:/,
    "every recorded decision names the criterion it leaned on (pattern:0 = no standing pattern applied)");
  assert.ok(args.p_summary.includes("card-only"),
    "the summary must say which branch was taken, so the ledger reads without opening the card");

  // NEGATIVE CONTROL: attribution is not optional. record_decision() RAISES with neither side set,
  // so a caller that forgot the cycle id must be stopped here rather than at the database.
  assert.throws(() => rollbackDecisionArgs(d, {}), /cycle/i,
    "rollbackDecisionArgs must refuse a missing cycle id -- attribution is not optional");
}

// ---------------------------------------------------------------------------
// (B) SEAM PROOF -- the wiring, with a recorder in place of fetch. No row is written.
// ---------------------------------------------------------------------------

async function withFetchRecorder(responder, fn) {
  const realFetch = globalThis.fetch;
  const calls = [];
  try {
    globalThis.fetch = async (url, init = {}) => {
      const call = { url: String(url), method: init.method ?? "GET", body: init.body ? JSON.parse(init.body) : null };
      calls.push(call);
      return responder(call);
    };
    await fn(calls);
  } finally {
    globalThis.fetch = realFetch;
  }
  return calls;
}

const okJson = (payload) => ({ ok: true, status: 200, json: async () => payload, text: async () => JSON.stringify(payload) });

async function theThreeWritesAreOrderedAndThreaded() {
  const card = buildIncidentCard(decide(cardOnlyFacts()), CTX);

  const calls = await withFetchRecorder(
    (call) => {
      if (call.url.includes("rpc/record_decision")) return okJson(UUID);      // PostgREST: a bare scalar
      if (call.url.includes("runner_before_images")) return okJson([{ id: "img-1" }]);
      return okJson([{ id: "card-1" }]);
    },
    async (recorded) => {
      // main()'s exact order: record, stamp, file.
      const dec = await recordRollbackDecision("https://example.test", "k", rollbackDecisionArgs(
        decide(cardOnlyFacts()), { cycleId: CYCLE, version: "v7.0.458", trigger: "ci-red", headSha: HEAD }));
      assert.strictEqual(dec.error, undefined, `the rpc must be accepted: ${dec.error}`);
      assert.strictEqual(dec.id, UUID, "a bare uuid string body must be read as the decision id");
      const filed = await fileIncidentCard("https://example.test", "k", stampCardOnly(card, dec.id), dec.id);
      assert.strictEqual(filed.error, undefined, `the card must file: ${filed.error}`);
      assert.strictEqual(recorded.length, 3, `exactly three writes, got ${recorded.length}`);
    },
  );

  const [rpc, img, row] = calls;

  assert.match(rpc.url, /\/rest\/v1\/rpc\/record_decision$/, "[0] is the record_decision rpc");
  assert.strictEqual(rpc.method, "POST", "[0] is a POST");
  assert.strictEqual(rpc.body.p_kind, ROLLBACK_DECISION_KIND, `[0] records kind '${ROLLBACK_DECISION_KIND}'`);

  assert.match(img.url, /\/rest\/v1\/runner_before_images$/, "[1] is the before-image (§19v: image first)");
  assert.strictEqual(img.body.decision_id, UUID,
    "[1] the before-image must name the decision it belongs to -- runner_before_images.decision_id IS the link");
  assert.strictEqual(img.body.table_name, "runner_items", "[1] images the row it is about to write");

  assert.match(row.url, /\/rest\/v1\/runner_items$/, "[2] is the card itself");
  assert.strictEqual(row.body.decision, CARD_ONLY_DECISION, "[2] the card is filed DECIDED");
  assert.ok(row.body.decision_reason.includes(UUID), "[2] the card's reason names the decision uuid");

  // THE PK FIX: the image's pk_value must be the PRIMARY KEY of the row filed next, never the
  // display_ref. reverse_decision() addresses a row by its pk and refuses one it cannot cast -- a
  // display_ref pk_value could never be reversed at all.
  assert.ok(row.body.id, "[2] the card must carry a client-supplied id so the image can name it");
  assert.strictEqual(img.body.pk_value, row.body.id,
    "the before-image's pk_value must EQUAL the card's primary key, not its display_ref");
  assert.notStrictEqual(img.body.pk_value, card.display_ref,
    "a display_ref pk_value is the retired form -- reverse_decision() cannot cast it to a uuid");
  assert.match(String(img.body.pk_value), /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    "the pk must be uuid-shaped (runner_items.id is a uuid)");
}

async function noDecisionMeansNoCard() {
  // NEGATIVE CONTROL, arm 1: the rpc fails, so recordRollbackDecision reports it rather than
  // inventing an id.
  const calls = await withFetchRecorder(
    () => ({ ok: false, status: 500, text: async () => "boom", json: async () => ({}) }),
    async () => {
      const dec = await recordRollbackDecision("https://example.test", "k", rollbackDecisionArgs(
        decide(cardOnlyFacts()), { cycleId: CYCLE, version: "v7.0.458", trigger: "ci-red", headSha: HEAD }));
      assert.ok(dec.error, "an HTTP 500 from the rpc must come back as { error }, never as a usable id");
      assert.strictEqual(dec.id, undefined, "no id may be invented from a failed rpc");
    },
  );
  assert.strictEqual(calls.length, 1,
    "the failed rpc must be the ONLY request -- nothing may be filed behind it");

  // NEGATIVE CONTROL, arm 2: the retired "file it anyway" form is shown to LOSE, read out of the
  // real main() source rather than restated. `fail(2` is *could not run*, never a pass.
  const recordAt = MAIN_SRC.indexOf("recordRollbackDecision(");
  const fileAt = MAIN_SRC.indexOf("fileIncidentCard(");
  assert.ok(recordAt >= 0, "main() must record the decision on the card-only path");
  assert.ok(fileAt > recordAt, "main() must record BEFORE it files");
  const failAt = MAIN_SRC.indexOf("fail(2", recordAt);
  assert.ok(failAt > recordAt && failAt < fileAt,
    "main() must fail(2 between recording and filing -- a card with no decision is the defect " +
    "SES-373 closes, not a lesser evil, so no decision means no card");

  // And a uuid-shaped answer is REQUIRED: a 200 carrying something else is not a decision.
  await withFetchRecorder(
    () => okJson({ not: "a uuid" }),
    async () => {
      const dec = await recordRollbackDecision("https://example.test", "k", rollbackDecisionArgs(
        decide(cardOnlyFacts()), { cycleId: CYCLE, version: "v7.0.458", trigger: "ci-red", headSha: HEAD }));
      assert.ok(dec.error, "a 200 whose body is not a uuid must be an error, not a silent id of undefined");
    },
  );
}

function theBeforeImageStillComesFirstInsideTheFiler() {
  // SES-182's own clause, re-asserted here because THIS ship edited that function: §19v -- no
  // before-image logged -> the write does not happen.
  const body = ENGINE_SRC.slice(ENGINE_SRC.indexOf("export async function fileIncidentCard"));
  const imgAt = body.indexOf("insertBeforeImage");
  const writeAt = body.indexOf('method: "POST"', imgAt + 1);
  assert.ok(imgAt >= 0, "fileIncidentCard must still write a before-image");
  assert.ok(writeAt > imgAt, "fileIncidentCard must write its before-image BEFORE its own insert");
}

// ---------------------------------------------------------------------------
// (C) LIVE -- the board. Credential-gated, DECLARED not-run otherwise.
// ---------------------------------------------------------------------------

// The five rows SES-373 backfilled, named so the assertion grades THOSE rows rather than "whatever
// is retired today". A sixth card filed by a later cycle is stamped by the engine, not the backfill,
// and carries the engine prefix instead -- which is why only these five are held to it.
export const BACKFILLED_IDS = [
  "5810863d-073a-40f4-a20b-9643caeff013",
  "7ea4e930-8732-4c65-a942-b914ab41ac73",
  "5d5f5f7b-ef9b-45aa-b435-e2b40526dc35",
  "18a0b7b6-f2e2-49d0-86c5-a342de2a1b04",
  "b990edc4-71ce-4659-8f99-ba372c6e874e",
];
export const BACKFILL_REASON_PREFIX = "Backfilled by SES-373";

export const LIVE_ASSERTIONS = [
  {
    id: "1-no-gated-card-is-left-undecided",
    detail:
      "ZERO gated_before_build runner_items rows carry decision IS NULL. This is the same query " +
      "ses-285 assertion 6 runs, so a pass here and a fail there is impossible by construction",
    test: (s) => s.undecidedCards.length === 0,
    breaks: (s) => ({ ...s, undecidedCards: [...s.undecidedCards, "a-card-nobody-decided"] }),
  },
  {
    id: "2-every-held-card-is-retired-with-a-reason",
    detail:
      "every runner_items row titled 'Auto-rollback held%' carries decision='retired' AND a " +
      "non-empty decision_reason. Asserted on the reason too, never on the value alone: a bare " +
      "'retired' with nothing behind it is the value without the decision",
    test: (s) => s.heldCards.length > 0 &&
      s.heldCards.every((r) => r.decision === "retired" && String(r.decision_reason ?? "").trim().length > 0),
    breaks: (s) => ({
      ...s,
      heldCards: s.heldCards.map((r, i) => (i === 0 ? { ...r, decision_reason: "" } : r)),
    }),
  },
  {
    id: "3-the-five-name-the-backfill-that-decided-them",
    detail:
      `all five ids SES-373 backfilled carry a decision_reason beginning "${BACKFILL_REASON_PREFIX}" ` +
      `and NOT beginning "${CLOSE_MARKER}" -- the second half keeps ses-285 assertion 7 from ` +
      "selecting these rows and demanding a resolving backlog_id they carry none of by design",
    test: (s) => BACKFILLED_IDS.every((id) => {
      const r = s.byId.get(id);
      return !!r && String(r.decision_reason ?? "").startsWith(BACKFILL_REASON_PREFIX)
        && !String(r.decision_reason ?? "").startsWith(CLOSE_MARKER);
    }),
    breaks: (s) => ({
      ...s,
      byId: new Map([...s.byId].map(([k, v]) =>
        (k === BACKFILLED_IDS[0] ? [k, { ...v, decision_reason: `${CLOSE_MARKER} oops` }] : [k, v]))),
    }),
  },
  {
    id: "4-each-backfilled-row-has-a-full-before-image-under-a-decision",
    detail:
      "runner_before_images carries a row for each of the five pk_values with a NON-NULL decision_id " +
      "AND a NON-NULL row_data (§19v: no before-image logged -> the write does not happen). row_data " +
      "is asserted non-null because runner_items has no updated_at: reverse_decision() will count " +
      "these rows unverifiable, so the stored full row IS the only restore path",
    test: (s) => BACKFILLED_IDS.every((id) => {
      const imgs = s.images.filter((i) => i.pk_value === id);
      return imgs.length > 0 && imgs.some((i) => i.decision_id !== null && i.row_data !== null);
    }),
    breaks: (s) => ({ ...s, images: s.images.map((i) => ({ ...i, decision_id: null })) }),
  },
];

async function rest(url, key, pathAndQuery) {
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`${pathAndQuery} returned HTTP ${res.status} ${res.statusText}`);
  const body = await res.json();
  if (!Array.isArray(body)) throw new Error(`${pathAndQuery} returned a non-array payload`);
  return body;
}

async function fetchLiveState(url, key) {
  // The SAME query ses-285 assertion 6 runs, character for character on the filter, so the two
  // tests cannot disagree about what "undecided" means.
  const undecidedCards = await rest(url, key,
    "runner_items?select=id&kind=eq.gated_before_build&decision=is.null&limit=1000");
  const heldCards = await rest(url, key,
    `runner_items?select=id,decision,decision_reason&title=like.${encodeURIComponent("Auto-rollback held")}*&limit=1000`);
  const images = await rest(url, key,
    "runner_before_images?select=pk_value,decision_id,row_data&table_name=eq.runner_items" +
    `&pk_value=in.(${BACKFILLED_IDS.join(",")})&limit=1000`);
  return {
    undecidedCards: undecidedCards.map((r) => r.id),
    heldCards,
    images,
    byId: new Map(heldCards.map((r) => [r.id, r])),
  };
}

// The ses-285 grading shape, reused deliberately: assert, then assert the control has teeth, then
// assert the teeth-check can itself fail.
function grade(assertions, data) {
  for (const a of assertions) assert.ok(a.test(data), `[live board] "${a.id}" failed: ${a.detail}`);
}

function everyAssertionHasTeeth(assertions, data) {
  const shape = (s) => JSON.stringify({ ...s, byId: [...s.byId] });
  for (const a of assertions) {
    const mutated = a.breaks(data);
    assert.notStrictEqual(shape(mutated), shape(data),
      `[live board] control for "${a.id}" changed NOTHING -- it cannot prove the assertion has teeth (SES-158)`);
    assert.ok(!a.test(mutated),
      `[live board] "${a.id}" still passes after its own control broke the thing it checks -- the check is vacuous`);
  }
}

function aVacuousMutationFailsItsOwnControl(data) {
  assert.throws(
    () => {
      const mutated = data;
      assert.notStrictEqual(JSON.stringify(mutated), JSON.stringify(data), "control changed NOTHING");
    },
    /control changed NOTHING/,
    "the vacuous-control detector must itself fail on a no-op mutation",
  );
}

async function theLiveBoardCarriesNoUndecidedHold() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "arm (C), the live board: zero undecided gated_before_build cards, every 'Auto-rollback held' " +
        "card retired with a reason, the five SES-373 rows naming their backfill decision, and a " +
        "full before-image under a decision id for each. There is NO repo-side render of " +
        "runner_items -- docs/backlog/BACKLOG-SNAPSHOT.md carries no card rows at all -- so this " +
        "cannot be graded offline, and asserting it offline would mean asserting nothing",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent. runner_items and runner_before_images " +
        "are service_role-only (anon/authenticated hold zero privileges, DAT-18), so the anon key " +
        "cannot substitute. Arms (A) and (B) above still ran. Canonical invocation: " +
        "STANDARDS.md Section 2 rule 5.",
    );
    return;
  }
  const state = await fetchLiveState(url, key);
  grade(LIVE_ASSERTIONS, state);
  everyAssertionHasTeeth(LIVE_ASSERTIONS, state);
  aVacuousMutationFailsItsOwnControl(state.heldCards);
}

async function run() {
  theFixtureIsCardOnly();
  aCardOnlyCardIsStamped();
  theDecisionArgsCarryTheirAttribution();
  await theThreeWritesAreOrderedAndThreaded();
  await noDecisionMeansNoCard();
  theBeforeImageStillComesFirstInsideTheFiler();
  await theLiveBoardCarriesNoUndecidedHold();
}

selfRun(import.meta.url, run);
export default run;
