// DeepBench v7.0.509 | tests/regression/ses-378d-manager-skill-rows.test.mjs | SES-378 slice 4 --
// the Development Manager's own Skill rows: the runner cycle as Knowledge, and the step-9 chain
// rule as a guardrail.
//
// FEATURE, measured live on the unedited tree rather than recalled. `public.skill_profiles` held
// 113 rows and NOT ONE carried the runner cycle or the chain rule: `capability_skill_profiles` for
// `run-project` was five rows whose only Knowledge member is `dm-knowledge-platform`, and that
// profile's `method` is the INSTRUMENTS list -- which tables and functions to read -- not the
// procedure. `dm-guardrails` was 5 `must` + 6 `must_not`, none of them the rule that says a
// `continue` verdict is executed in the same turn. So the manager was assembled knowing where to
// look and not what to do, and the one rule whose violation ends the drain silently was nowhere in
// its prompt. This slice puts both in rows: the card's bytes under `traits.source = "inline"` (the
// trait `dm-knowledge-platform` already declares, api/prompt/db-assembly.js -- no new branch, no
// slug in code), and the chain rule appended byte-for-byte as a 6th `must`.
//
// WHAT THIS FILE GUARDS, and where the lazy version of each guard passes vacuously.
//
// (a) THE ROW CARRIES THE CARD AS IT IS TODAY, NOT AS IT WAS AT THE SEED. `method` is compared
//     against the bytes read from docs/runbooks/cycle-card.md THIS RUN, and the pin is compared
//     against runbookSha() OF THOSE BYTES -- never against a literal hash. A pinned literal is the
//     vacuous version: it keeps passing after the card is re-rendered and the row is left holding a
//     procedure nobody follows any more, which is the exact failure the pin exists to catch. The
//     shipped helper is imported rather than reimplemented (SES-45: a second implementation
//     agreeing with itself proves nothing).
//
// (b) THE LINK IS THERE AND THE ORDER IS UNIQUE. Six rows is the count half; `display_order`
//     uniqueness is the half that matters, because the free slot was 5 (the live orders were
//     1,2,3,4,6) and a seed that reused an occupied slot would still make the count six while
//     leaving two Knowledge sections racing for one position in the assembled prompt.
//
// (c) THE RULE IS THE RULE, BYTE-FOR-BYTE -- AND IT IS NOW IN dm-run-intent, NOT dm-guardrails.
//     AGT-132 slice 2 moved it: `dm-guardrails` is linked to FOUR capabilities (decide-gated-card,
//     model-assignment, review-audit-worklist, run-project), so a rule that governs only the runner
//     chain was being carried into three prompts it does not govern; `dm-run-intent` is linked to
//     `run-project` alone. So this arm now asserts BOTH directions of one move: the body of
//     docs/runbooks/routine-prompt.md line 47 with its `9. ` numbering removed -- read from the
//     file, never pasted here -- is ABSENT from `dm-guardrails.guardrails.must` and is the LAST
//     paragraph of `dm-run-intent.method`, byte-for-byte. Two copies of a rule that differ by a
//     reflow are two rules, and the agent would be running the older one; comparing against the
//     file is what makes that impossible. `must` is 5 again (the pre-SES-378d count) and `must_not`
//     is asserted UNCHANGED at 11 -- AGT-144's five appends, measured live, not the 6 this file was
//     seeded against: the pin was never re-pointed, which is stale PIN, never stale data. Both
//     counts are asserted so a "fix" that lands in the wrong array fails instead of passing on a
//     total.
//
// (d) REVERSIBILITY IS ASSERTED, NOT ASSUMED. AGENT-ROW-AGREED-TICKET licenses this write on the
//     promise that a Reverse puts the rows back, and `reverse_decision()` addresses a row BY ITS
//     PRIMARY KEY and refuses a pk_value it cannot cast -- so a slug written where a uuid belongs
//     reverses nothing while reporting itself applied (SES-286b measured exactly that). Three
//     images under ONE decision id, every pk_value a uuid, and the two INSERT images carrying
//     `row_data IS NULL` (the SES-89 convention: the undo of an INSERT is a DELETE). The pk_values
//     are matched against the LIVE row ids, so an image pointing at nothing in particular fails.
//
// (e) THE SES-158 NEGATIVE CONTROL. (c)'s comparison is driven a second time with ONE character of
//     the expected text changed, and it must then find nothing. Without it, (c) would keep passing
//     against a matcher that had quietly become "some string is present" -- which matters more
//     after AGT-132 slice 2 than before, because (c)'s dm-guardrails half is now an ABSENCE, and an
//     absence passes vacuously against a matcher that finds nothing anywhere.
//
// NOTHING HERE WRITES. Every live arm reads. The `--sync-knowledge --apply` run and the guardrails
// DO block that produced these rows are the session's own, reported in its ship notes.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  runbookSha,
  knowledgeRow,
  knowledgeSyncState,
  KNOWLEDGE_SLUG,
  KNOWLEDGE_CAPABILITY,
  KNOWLEDGE_DISPLAY_ORDER,
} from "../../scripts/render-cycle-card.js";

const WORKTREE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CARD_REL = "docs/runbooks/cycle-card.md";
const PROMPT_REL = "docs/runbooks/routine-prompt.md";

// The chain rule lives at routine-prompt.md line 47 as a numbered list item. Both facts are
// asserted before the body is used: a file whose step 9 moved must fail loudly here rather than
// silently compare the guardrail against whatever sentence now occupies line 47.
const CHAIN_RULE_LINE = 47;
const CHAIN_RULE_PREFIX = "9. ";
const CHAIN_RULE_BYTES = 1087;
const GUARDRAILS_SLUG = "dm-guardrails";
const RUN_INTENT_SLUG = "dm-run-intent";
// AGT-132 slice 2: the chain rule left `must` (back to its pre-SES-378d 5) for dm-run-intent.method.
const MUST_AFTER = 5;
// Live at 11 since AGT-144 appended five: this pin was stale, the data was not. Re-pointed, not relaxed.
const MUST_NOT_UNCHANGED = 11;
const LINKS_AFTER = 7;
const DECISION_KIND = "agent-row";
const TICKET = "SES-378";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const lf = t => String(t).replace(/\r\n/g, "\n");
const read = rel => lf(fs.readFileSync(path.join(WORKTREE, rel), "utf8"));

// Pure, and the ONE matcher (c) and (e) both go through -- that shared path is what makes (e) a
// control over (c) rather than a second test of its own.
export function indexOfExact(list, expected) {
  if (!Array.isArray(list)) return -1;
  return list.findIndex(e => typeof e === "string" && e === expected);
}

export function chainRuleFromPrompt(text) {
  const line = lf(text).split("\n")[CHAIN_RULE_LINE - 1];
  if (typeof line !== "string") {
    throw new Error(`${PROMPT_REL} has no line ${CHAIN_RULE_LINE} -- the chain rule's home moved and this guard is comparing against nothing.`);
  }
  if (!line.startsWith(CHAIN_RULE_PREFIX)) {
    throw new Error(`${PROMPT_REL} line ${CHAIN_RULE_LINE} does not start with ${JSON.stringify(CHAIN_RULE_PREFIX)} -- step 9 moved. Re-point this guard at the rule's new line before trusting it.`);
  }
  return line.slice(CHAIN_RULE_PREFIX.length);
}

async function run() {
  // ---- source-side facts, no credentials needed -------------------------------------------------
  const card = read(CARD_REL);
  const expectedRow = knowledgeRow(card);
  const cardSha = runbookSha(card);
  const rule = chainRuleFromPrompt(read(PROMPT_REL));

  assert.strictEqual(Buffer.byteLength(rule, "utf8"), CHAIN_RULE_BYTES,
    `the chain rule read from ${PROMPT_REL} line ${CHAIN_RULE_LINE} is ${Buffer.byteLength(rule, "utf8")} bytes, not ${CHAIN_RULE_BYTES}. The guardrail was seeded from this text byte-for-byte; a changed line means the row and the prompt now carry two readings of one rule, and the agent is running the older one.`);

  // == (e) THE NEGATIVE CONTROL, and it runs with or without credentials ==========================
  // One character of the expected text is changed -- nothing else. If the matcher (c) uses still
  // finds a hit, (c) is not comparing bytes and its pass means nothing.
  const mutated = rule.slice(0, 40) + (rule[40] === "x" ? "y" : "x") + rule.slice(41);
  assert.notStrictEqual(mutated, rule, "the control must actually differ from the rule");
  assert.strictEqual(Buffer.byteLength(mutated, "utf8"), Buffer.byteLength(rule, "utf8"),
    "the control changes one character, never the length -- a length change would be caught by a weaker matcher than the one under control");
  const fixture = ["a prior must", rule, "another must"];
  assert.strictEqual(indexOfExact(fixture, rule), 1,
    "(e) control setup: the matcher must find the rule in a list that contains it");
  assert.strictEqual(indexOfExact(fixture, mutated), -1,
    "(e) THE CONTROL FAILED: the matcher found a hit for text that differs from the guardrail by one character. (c) is therefore not asserting byte-identity and would pass against a reworded, re-wrapped or re-punctuated copy of the chain rule.");

  // knowledgeSyncState() is the classifier --sync-knowledge exits on; both directions, on fixtures,
  // so a drift that exits 0 is caught here and not only in production.
  assert.strictEqual(knowledgeSyncState(null, cardSha).state, "absent");
  assert.strictEqual(knowledgeSyncState({ traits: { source_sha256: cardSha } }, cardSha).state, "current");
  assert.strictEqual(knowledgeSyncState({ traits: { source_sha256: "0000000000000000" } }, cardSha).state, "drifted",
    "a row pinned to another sha must classify as drifted -- exit 1 is what stops a cycle running on a procedure the card no longer renders");

  const pure = `chain rule ${CHAIN_RULE_BYTES}B at ${PROMPT_REL}:${CHAIN_RULE_LINE}, matcher rejects a one-character mutation; `
    + `${CARD_REL} ${Buffer.byteLength(card, "utf8")}B pins ${cardSha}; syncState absent/current/drifted all reached`;

  // ---- live ------------------------------------------------------------------------------------
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "SES-378d (a)-(d): the manager's Knowledge row, its run-project link, the 6th guardrail must, and the reversibility of all three",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY not set; export them from public.runner_secrets by name "
      + "(docs/runbooks/session-setup.md step 1b) and re-run: "
      + "SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node tests/regression/run-all.js",
    );
    console.log(`  [SES-378d] ${pure}; (a)-(d) declared NOT RUN`);
    return;
  }

  const base = url.replace(/\/+$/, "");
  const hdr = { apikey: key, Authorization: `Bearer ${key}` };
  const get = async q => {
    const r = await fetch(`${base}/rest/v1/${q}`, { headers: hdr });
    if (!r.ok) assert.fail(`PostgREST ${r.status} on ${q}: ${await r.text()}`);
    return r.json();
  };

  // == (a) THE ROW HOLDS THE CARD AS IT STANDS TODAY =============================================
  const profiles = await get(`skill_profiles?select=id,slug,name,objective,method,traits,skill_type_slug&slug=eq.${KNOWLEDGE_SLUG}`);
  assert.strictEqual(profiles.length, 1,
    `public.skill_profiles must hold EXACTLY ONE ${KNOWLEDGE_SLUG} row. Zero means the manager is still assembled with no procedure; two means --sync-knowledge is not idempotent and every run adds another copy of an 8 KB document to the prompt. got ${profiles.length}`);
  const row = profiles[0];
  assert.ok(UUID_RE.test(row.id), `${KNOWLEDGE_SLUG}.id must be a uuid, got ${JSON.stringify(row.id)}`);
  assert.strictEqual(row.skill_type_slug, expectedRow.skill_type_slug);
  assert.strictEqual(row.objective, expectedRow.objective,
    "objective is what db-assembly.js renders as the Knowledge section's heading (the inline branch's `heading`), so it is contract, not decoration");
  assert.strictEqual(row.traits && row.traits.source, "inline",
    `traits.source must be "inline" or db-assembly.js turns this profile into a RAG fetch against Library chunks that do not exist, and the section renders EMPTY in every assembled prompt -- the SES-341 failure this trait exists to avoid. got ${JSON.stringify(row.traits)}`);
  assert.strictEqual(row.method, card,
    `${KNOWLEDGE_SLUG}.method must equal the CURRENT bytes of ${CARD_REL}. It does not, so the manager is being assembled with a runner cycle that is not the committed one -- re-render check: node scripts/render-cycle-card.js, then node scripts/render-cycle-card.js --sync-knowledge`);
  assert.strictEqual(row.traits.source_sha256, cardSha,
    `traits.source_sha256 must be runbookSha() of those same bytes (${cardSha}), so drift is detectable rather than silent. got ${JSON.stringify(row.traits.source_sha256)}`);
  assert.strictEqual(knowledgeSyncState(row, cardSha).state, "current",
    "the shipped classifier must call the live row current -- if this disagrees with the two assertions above, --sync-knowledge would exit 0 on a row the test calls correct for a different reason");

  // == (b) THE LINK, AND THE ORDER THAT IS NOT SHARED ============================================
  const links = await get(`capability_skill_profiles?select=id,skill_profile_slug,level,is_required,display_order&capability_slug=eq.${KNOWLEDGE_CAPABILITY}`);
  assert.strictEqual(links.length, LINKS_AFTER,
    `${KNOWLEDGE_CAPABILITY} must have ${LINKS_AFTER} skill links (it had 5 before this slice). got ${links.length}`);
  const mine = links.filter(l => l.skill_profile_slug === KNOWLEDGE_SLUG);
  assert.strictEqual(mine.length, 1, `exactly one ${KNOWLEDGE_CAPABILITY} link may name ${KNOWLEDGE_SLUG}; got ${mine.length}`);
  assert.strictEqual(mine[0].display_order, KNOWLEDGE_DISPLAY_ORDER,
    `the link must sit at display_order ${KNOWLEDGE_DISPLAY_ORDER} -- the slot that was free between dm-run-intent (4) and dm-guardrails (6)`);
  assert.strictEqual(mine[0].is_required, true, "the manager's own procedure is required, not optional");
  const orders = links.map(l => l.display_order);
  assert.strictEqual(new Set(orders).size, orders.length,
    `display_order must be unique across ${KNOWLEDGE_CAPABILITY}'s ${LINKS_AFTER} links -- two Skills sharing a slot leaves their order in the assembled prompt undefined. got ${JSON.stringify(orders.slice().sort((a, b) => a - b))}`);
  // The still-there direction: an empty Knowledge section is the SES-341 failure, and dropping the
  // platform profile while adding this one would render as "the card arrived" and nothing else.
  assert.ok(links.some(l => l.skill_profile_slug === "dm-knowledge-platform"),
    "dm-knowledge-platform must STILL be linked -- the card is an addition to the manager's Knowledge, never a replacement for the instruments list");

  // == (c) THE 6TH must IS THE CHAIN RULE, BYTE-FOR-BYTE =========================================
  const gr = await get(`skill_profiles?select=id,slug,guardrails&slug=eq.${GUARDRAILS_SLUG}`);
  assert.strictEqual(gr.length, 1, `public.skill_profiles must hold exactly one ${GUARDRAILS_SLUG} row`);
  const guard = gr[0].guardrails || {};
  assert.strictEqual(Array.isArray(guard.must) ? guard.must.length : -1, MUST_AFTER,
    `${GUARDRAILS_SLUG}.guardrails.must must hold ${MUST_AFTER} entries (it held 5 before this slice). got ${JSON.stringify(guard.must && guard.must.length)}`);
  assert.strictEqual(Array.isArray(guard.must_not) ? guard.must_not.length : -1, MUST_NOT_UNCHANGED,
    `${GUARDRAILS_SLUG}.guardrails.must_not must be UNCHANGED at ${MUST_NOT_UNCHANGED} -- an append that landed in the wrong array would still make the pair total 12`);
  assert.strictEqual(indexOfExact(guard.must, rule), -1,
    `${GUARDRAILS_SLUG}.guardrails.must still holds the chain rule. AGT-132 slice 2 MOVED it to ${RUN_INTENT_SLUG}.method because ${GUARDRAILS_SLUG} is linked to four capabilities and the rule governs only the runner chain. Two homes is worse than the wrong one: the manager would read it twice, and a later edit to either copy would leave the two disagreeing.`);

  // ...and it is the LAST paragraph of dm-run-intent.method, through the SAME matcher, so (e)'s
  // control covers this half too. The presence half is what keeps the absence above from passing
  // vacuously on a rule that was deleted rather than moved.
  const ri = await get(`skill_profiles?select=id,slug,method,skill_type_slug&slug=eq.${RUN_INTENT_SLUG}`);
  assert.strictEqual(ri.length, 1, `public.skill_profiles must hold exactly one ${RUN_INTENT_SLUG} row`);
  assert.strictEqual(ri[0].skill_type_slug, "intent",
    `${RUN_INTENT_SLUG} must stay an Intent row. A second Guardrails row would collide with ${GUARDRAILS_SLUG} on section slug and SKILL_ORDER 4 (api/prompt/db-assembly.js), so the type is the reason this move is safe, not a detail.`);
  const paras = lf(ri[0].method ?? "").split("\n\n");
  const at = indexOfExact(paras, rule);
  assert.notStrictEqual(at, -1,
    `no paragraph of ${RUN_INTENT_SLUG}.method equals the chain rule byte-for-byte. The rule is ${PROMPT_REL} line ${CHAIN_RULE_LINE} minus its ${JSON.stringify(CHAIN_RULE_PREFIX)} prefix (${CHAIN_RULE_BYTES} bytes, opening ${JSON.stringify(rule.slice(0, 42))}). A reworded, re-wrapped or re-punctuated copy is a SECOND rule, not this one.`);
  assert.strictEqual(at, paras.length - 1,
    `the chain rule must be the LAST paragraph of ${RUN_INTENT_SLUG}.method (it was appended, and an append that landed mid-row means the row was rewritten rather than extended). got index ${at} of ${paras.length}`);
  assert.strictEqual(indexOfExact(paras, mutated), -1,
    "(e) over the LIVE list: the matcher must reject a one-character mutation against dm-run-intent.method itself, not only against the fixture");

  // == (d) THE UNDO IS REAL ======================================================================
  const decisions = await get(`runner_decisions?select=id,kind,backlog_id,status&kind=eq.${DECISION_KIND}&backlog_id=eq.${TICKET}`);
  assert.ok(decisions.length >= 1,
    `there must be at least one kind='${DECISION_KIND}' decision for ${TICKET} -- AGENT-ROW-AGREED-TICKET makes this write build work ONLY as a decision with a handle and a reversal window`);
  const ids = decisions.map(d => d.id);
  const images = await get(`runner_before_images?select=decision_id,table_name,pk_value,row_data&decision_id=in.(${ids.join(",")})`);
  const byDecision = new Map();
  for (const img of images) {
    if (!byDecision.has(img.decision_id)) byDecision.set(img.decision_id, []);
    byDecision.get(img.decision_id).push(img);
  }
  const handle = [...byDecision.entries()].find(([, imgs]) => imgs.length >= 3);
  assert.ok(handle,
    `no single kind='${DECISION_KIND}' decision on ${TICKET} carries 3+ before-images. All three writes of this slice -- the profile, its link and the guardrails edit -- belong to ONE handle, or John's Reverse undoes some of the slice and leaves the rest standing. Groups seen: ${JSON.stringify([...byDecision.values()].map(v => v.length))}`);
  const [decisionId, imgs] = handle;

  for (const img of imgs) {
    assert.ok(UUID_RE.test(img.pk_value),
      `runner_before_images.pk_value must be the row's uuid primary key, never a slug: reverse_decision() addresses the row by pk and counts a value it cannot cast as refused -- restoring nothing while reporting itself applied. got ${JSON.stringify(img.pk_value)} on ${img.table_name} under decision ${decisionId}`);
  }

  const inserts = imgs.filter(i => i.row_data === null);
  assert.strictEqual(inserts.length, 2,
    `exactly the two INSERTs of this slice carry row_data NULL (the SES-89 convention: the undo of an INSERT is a DELETE). got ${inserts.length} under decision ${decisionId}`);
  assert.deepStrictEqual(
    inserts.map(i => i.pk_value).sort(),
    [row.id, mine[0].id].sort(),
    `the two NULL images must name the LIVE ids of the row and the link this slice inserted (${row.id}, ${mine[0].id}) -- an image pointing anywhere else deletes nothing on a Reverse. got ${JSON.stringify(inserts.map(i => i.pk_value))}`);
  const updates = imgs.filter(i => i.row_data !== null);
  assert.ok(updates.some(i => i.table_name === "skill_profiles" && i.pk_value === gr[0].id),
    `the guardrails edit must carry a NON-null image of ${GUARDRAILS_SLUG} (${gr[0].id}) -- a NULL image there would tell a Reverse to DELETE the manager's guardrails rather than restore its 5 musts. got ${JSON.stringify(updates.map(i => ({ t: i.table_name, pk: i.pk_value })))}`);

  console.log(`  [SES-378d] ${pure}; live: ${KNOWLEDGE_SLUG} pinned ${cardSha}, ${KNOWLEDGE_CAPABILITY} ${LINKS_AFTER} links (orders ${JSON.stringify(orders.slice().sort((a, b) => a - b))}), must ${guard.must.length} / must_not ${guard.must_not.length} with the chain rule ABSENT, ${RUN_INTENT_SLUG}.method paragraph ${at + 1}/${paras.length} carries it, ${imgs.length} images under decision ${decisionId} (${inserts.length} NULL)`);
}

export default run;
selfRun(import.meta.url, run);
