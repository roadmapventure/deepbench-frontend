// DeepBench v7.0.840 | tests/regression/agt-448-cap-split-guard.test.mjs | AGT-449 -- three more arms: D pure (scripts/rule-cap-case.js's isCapCase / validateRuling / nextAction / refusedSplitReason), E static (the runbook, the card, the agt-449 mirror and the SERVICE_CATALOG entry name the Manager's script), F live (rule-cap-case and dm-cap-case-intent are devmanager's alone, linked like decide-gated-card).
// DeepBench v7.0.839 | tests/regression/agt-448-cap-split-guard.test.mjs | AGT-448 -- the cap-split guard.
//
// WHAT THIS PINS. pattern:172 (John 2026-10-09): when the file or task cap would force a split, the
// Designer sends the case to the Development Manager, who rules it split or waive with one call to
// public.rule_capped_ticket(). No one slices a ticket to fit the cap on their own authority. Three arms:
//   A. static: the four homes of the rule hold their text -- the ds-guardrails mirror (MUST, MUSTNOT),
//      the dm-guardrails mirror (AGT-447), the function mirror (AGT-445) and the pattern:172 line the
//      Designer's and the Manager's knowledge renders carry. Each needle has a delete-it control and
//      the SES-158 changed-nothing assert.
//   B. pure: unruledSplits() -- a `declares slice N of M` settle on or after CUTOFF with no earlier,
//      unreversed `cap ruling: split` naming that ticket is an unruled split.
//   C. live (service key, else notRun): the rows the mirrors describe are the live rows, the function
//      refuses a bad ruling with its own word, and no split since CUTOFF went unruled -- with the
//      control that a from-2026-10-09 cutoff DOES find AGT-427, so the empty answer is not vacuous.
// The guard cannot see a split that is not written `slice N of M` (kickoff STOP LINE).

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { render, readDoc } from "../../scripts/render-role-patterns.js";
import { SERVICE_CATALOG } from "../../shared/ai-patterns.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** DRAIN-CAP-SPLIT was created at this instant; a slice before it predates the rule. */
export const CUTOFF = "2026-10-09T16:03:53Z";

export const MUST = "when the file or task cap would force a split, stop and send the case for a ruling instead of a kickoff: premise alive, kickoff_markdown and kickoff_path null, harvest_markdown holding the parts in build order, what each delivers alone, what stays broken, red or unused if only the first ships, and which part must complete before the next; recommend neither split nor waive; design past the caps only when task_context carries cap_waived (pattern:172)";
export const MUSTNOT = "split, slice or narrow a ticket to fit the cap on your own authority (pattern:172)";

const SLICE_RE = /declares slice \d+ of \d+/;
const RULING_PREFIX = "cap ruling: split ";

/** PURE: the ticket ids a `cap ruling: split` summary names (the capped ticket and its parts). */
function rulingIds(summary) {
  return summary.slice(18).split(/ into | -> /).map(s => s.trim()).filter(Boolean);
}

/**
 * PURE. rows: runner_decisions rows ({kind, backlog_id, reasoning, summary, status, decided_at}).
 * A slice is a `ticket-status` row whose reasoning declares `slice N of M`, decided at or after the
 * cutoff. It is ruled iff an unreversed `ticket-scope` row decided no later than the slice carries a
 * `cap ruling: split ` summary whose ids include the slice's ticket. Returns sorted unique unruled ids.
 */
export function unruledSplits(rows, cutoff = CUTOFF) {
  const cut = Date.parse(cutoff);
  const rulings = rows.filter(r =>
    r.kind === "ticket-scope" && r.status !== "reversed" &&
    typeof r.summary === "string" && r.summary.startsWith(RULING_PREFIX));
  const out = new Set();
  for (const s of rows) {
    if (s.kind !== "ticket-status" || !SLICE_RE.test(s.reasoning ?? "")) continue;
    const at = Date.parse(s.decided_at);
    if (!(at >= cut)) continue;
    const ruled = rulings.some(r => Date.parse(r.decided_at) <= at && rulingIds(r.summary).includes(s.backlog_id));
    if (!ruled) out.add(s.backlog_id);
  }
  return [...out].sort();
}

const lf = s => String(s).replace(/\r\n/g, "\n");
function readRel(rel) {
  const p = path.join(ROOT, rel);
  assert.ok(fs.existsSync(p), `${rel} is missing`);
  return lf(fs.readFileSync(p, "utf8"));
}

// A: [label, text-producer, needles]
export const DM_NEEDLES = [
  "rule every cap case sent to you as split or waive, with one call to public.rule_capped_ticket()",
  "treat a cap case as licence for anything beyond that one ruling",
];
const STATIC = [
  ["docs/design/agt-448-ds-cap-case.sql", () => readRel("docs/design/agt-448-ds-cap-case.sql"), [MUST, MUSTNOT]],
  ["docs/design/agt-447-dm-cap-ruling.sql", () => readRel("docs/design/agt-447-dm-cap-ruling.sql"), DM_NEEDLES],
  ["docs/design/agt-445-cap-ruling.sql", () => readRel("docs/design/agt-445-cap-ruling.sql"),
    ["CREATE OR REPLACE FUNCTION public.rule_capped_ticket(", "'DRAIN-CAP-SPLIT'"]],
  ["render(designer)", () => render(readDoc(), "designer"), ["\n- pattern:172 — "]],
  ["render(manager)", () => render(readDoc(), "manager"), ["\n- pattern:172 — "]],
  // E (AGT-449): the cap case reaches the Development Manager through his own script.
  ["docs/runbooks/runner-cycle.md", () => readRel("docs/runbooks/runner-cycle.md"), ["the DM rules\nit, `scripts/rule-cap-case.js`;"]],
  ["docs/runbooks/cycle-card.md", () => readRel("docs/runbooks/cycle-card.md"), ["a cap case → node scripts/rule-cap-case.js"]],
  ["docs/design/agt-449-rule-cap-case.sql", () => readRel("docs/design/agt-449-rule-cap-case.sql"), ["'dm-cap-case-intent'", "'rule-cap-case'"]],
  ["SERVICE_CATALOG", () => JSON.stringify(SERVICE_CATALOG.map(e => ({ slug: e.slug, serviceType: e.serviceType }))),
    ['{"slug":"rule-cap-case","serviceType":"ai"}']],
];

/** AGT-449: the Manager's capability, its Intent, and the capability whose links it copies. */
export const CAP = "rule-cap-case";
export const INTENT = "dm-cap-case-intent";
export const TWIN = "decide-gated-card";
export const TWIN_INTENT = "dm-gate-intent";
/** Rule #1: no agent's data names another agent. */
export const OTHER_AGENT_RE = /\b(designer|auditor|librarian|victoria|builder|michelle)\b/i;

const missing = (text, needles) => needles.filter(n => !text.includes(n));

async function run() {
  const results = [];
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); results.push(name); } catch (e) { failures.push(`${name}: ${e.message}`); }
  };

  // --- A: static ---------------------------------------------------------------------------------
  await arm("A-static-homes", () => {
    for (const [label, read, needles] of STATIC) {
      const text = read();
      assert.deepStrictEqual(missing(text, needles), [], `${label} lacks ${JSON.stringify(missing(text, needles))}`);
      for (const n of needles) {
        const mutated = text.split(n).join("");
        assert.notStrictEqual(mutated, text, `control: deleting a needle of ${label} changed nothing (the SES-158 failure)`);
        assert.deepStrictEqual(missing(mutated, [n]), [n], `control: the check did not notice a needle of ${label} gone`);
      }
    }
  });

  // --- B: pure -----------------------------------------------------------------------------------
  await arm("B-pure-unruled-splits", () => {
    const S = { kind: "ticket-status", backlog_id: "X-1", reasoning: "declares slice 1 of 2", decided_at: "2026-10-10" };
    const R = { kind: "ticket-scope", backlog_id: "X-1", summary: "cap ruling: split X-1 into X-2 -> X-3", decided_at: "2026-10-09T20:00Z" };
    const cases = [
      ["slice alone", [S], ["X-1"]],
      ["slice + ruling", [S, R], []],
      ["ruling reversed", [S, { ...R, status: "reversed" }], ["X-1"]],
      ["ruling after slice", [S, { ...R, decided_at: "2026-10-11" }], ["X-1"]],
      ["slice on a part", [{ ...S, backlog_id: "X-2" }, R], []],
      ["slice before cutoff", [{ ...S, decided_at: "2026-10-09T08:00Z" }], []],
      ["waive is no split ruling", [S, { ...R, summary: "cap ruling: waive X-1 for one build" }], ["X-1"]],
    ];
    for (const [label, rows, want] of cases) {
      assert.deepStrictEqual(unruledSplits(rows), want, `B ${label}`);
    }
    assert.strictEqual(cases.length, 7);
  });

  // --- D: pure (AGT-449) -------------------------------------------------------------------------
  await arm("D-pure-rule-cap-case", async () => {
    const { isCapCase, validateRuling, nextAction, refusedSplitReason, AGENT, CAPABILITY } =
      await import("../../scripts/rule-cap-case.js");
    assert.strictEqual(AGENT, "devmanager");
    assert.strictEqual(CAPABILITY, CAP);
    const C = { premise: "alive", kickoff_markdown: null, kickoff_path: null, harvest_markdown: "p" };
    assert.strictEqual(isCapCase(C), true, "D isCapCase: the case itself");
    assert.strictEqual(isCapCase({ ...C, kickoff_markdown: "k" }), false, "D isCapCase: a kickoff is no case");
    assert.strictEqual(isCapCase({ ...C, premise: "dead" }), false, "D isCapCase: a dead premise is no case");
    assert.strictEqual(isCapCase({ ...C, harvest_markdown: "" }), false, "D isCapCase: no parts is no case");
    const ok = (a, label) => assert.strictEqual(validateRuling(a, "X-1").ok, true, `D validateRuling ${label}: ${JSON.stringify(validateRuling(a, "X-1"))}`);
    const no = (a, label) => assert.strictEqual(validateRuling(a, "X-1").ok, false, `D validateRuling ${label} should refuse`);
    const A = { ruling: "split", parts: ["X-2", "X-3"], reason: "r", patterns_applied: [172] };
    ok({ ...A, ruling: "waive", parts: [] }, "waive []");
    ok(A, "split [X-2,X-3]");
    no({ ...A, parts: ["X-2"] }, "split of one part");
    no({ ...A, parts: ["X-2", "X-2"] }, "split with a repeated part");
    no({ ...A, parts: ["X-1", "X-2"] }, "split naming the ticket");
    no({ ...A, ruling: "waive", parts: ["X-2"] }, "waive with parts");
    no({ ...A, ruling: "merge" }, "ruling merge");
    no({ ...A, reason: "" }, "empty reason");
    assert.strictEqual(nextAction({ ruling: "waive", decision_id: "d" }),
      'next: re-assemble design-kickoff with "cap_waived":"d"');
    assert.strictEqual(nextAction({ ruling: "split", decision_id: "d", directive_id: "r", parts: ["X-2", "X-3"] }),
      "next: build X-2 (drain r)");
    assert.strictEqual(refusedSplitReason("why", "rule_capped_ticket: m"),
      "split refused (rule_capped_ticket: m); a refused split is a waive (pattern:172): why");
  });

  // --- C: live -----------------------------------------------------------------------------------
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!base || !key) {
    notRun("the live arm (ds-/dm-guardrails rows, pattern:172 in the knowledge rows, DRAIN-CAP-SPLIT, the refusal, unruled splits since CUTOFF; F: rule-cap-case is devmanager's)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent. Run: node --env-file-if-exists=.env.local tests/regression/agt-448-cap-split-guard.test.mjs");
  } else {
    const hdr = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
    const get = async q => {
      const r = await fetch(`${base}/rest/v1/${q}`, { headers: hdr });
      if (!r.ok) assert.fail(`GET ${q} -> HTTP ${r.status}: ${await r.text().catch(() => "")}`);
      return r.json();
    };
    const profile = async slug => {
      const rows = await get(`skill_profiles?select=slug,guardrails,method&slug=eq.${slug}`);
      assert.strictEqual(rows.length, 1, `${slug}: expected 1 row, got ${rows.length}`);
      return rows[0];
    };

    await arm("C-ds-guardrails-carries-the-stop", async () => {
      const g = (await profile("ds-guardrails")).guardrails ?? {};
      const must = g.must ?? [], mustNot = g.must_not ?? [];
      assert.ok(must.includes(MUST), `ds-guardrails.must lacks MUST (${must.length} entries)`);
      assert.ok(mustNot.includes(MUSTNOT), `ds-guardrails.must_not lacks MUSTNOT (${mustNot.length} entries)`);
      assert.strictEqual(must[must.length - 1], MUST, "ds-guardrails.must: the last entry is not MUST");
      assert.strictEqual(mustNot[mustNot.length - 1], MUSTNOT, "ds-guardrails.must_not: the last entry is not MUSTNOT");
    });

    await arm("C-dm-guardrails-carries-the-ruling", async () => {
      const g = (await profile("dm-guardrails")).guardrails ?? {};
      assert.ok((g.must ?? []).some(e => e.startsWith(DM_NEEDLES[0])), "dm-guardrails.must has no entry starting with the AGT-447 duty");
      assert.ok((g.must_not ?? []).some(e => e.startsWith(DM_NEEDLES[1])), "dm-guardrails.must_not has no entry starting with the AGT-447 scope");
    });

    await arm("C-knowledge-rows-carry-pattern-172", async () => {
      for (const slug of ["ds-knowledge-patterns", "dm-knowledge-patterns"]) {
        assert.ok(String((await profile(slug)).method ?? "").includes("pattern:172 — "), `${slug}.method lacks pattern:172`);
      }
    });

    await arm("C-drain-cap-split-live", async () => {
      const rule = await get("governance_rules?select=id,status&id=eq.DRAIN-CAP-SPLIT");
      assert.strictEqual(rule.length, 1, `DRAIN-CAP-SPLIT: expected 1 row, got ${rule.length}`);
      assert.strictEqual(rule[0].status, "live", `DRAIN-CAP-SPLIT is ${rule[0].status}, not live`);
    });

    await arm("C-function-refuses-a-bad-ruling", async () => {
      const r = await fetch(`${base}/rest/v1/rpc/rule_capped_ticket`, {
        method: "POST", headers: hdr,
        body: JSON.stringify({ p_backlog_id: "AGT-448", p_ruling: "merge", p_reason: "probe", p_session_name: "agt448" }),
      });
      const text = await r.text();
      assert.strictEqual(r.status, 400, `ruling merge: expected HTTP 400, got ${r.status}: ${text}`);
      assert.ok(text.includes("rule_capped_ticket: "), `the refusal is not the function's own: ${text}`);
    });

    await arm("C-no-unruled-split-since-cutoff", async () => {
      const or = "(and(kind.eq.ticket-status,reasoning.like.*declares slice*),and(kind.eq.ticket-scope,summary.like.cap ruling: split*))";
      const rows = await get(`runner_decisions?select=backlog_id,kind,status,decided_at,summary,reasoning` +
        `&decided_at=gte.2026-10-09&or=${encodeURIComponent(or)}`);
      assert.deepStrictEqual(unruledSplits(rows), [], `unruled splits since ${CUTOFF}`);
      // CONTROL: the same rows from 2026-10-09 find AGT-427 -- the empty answer above is not vacuous.
      const early = unruledSplits(rows, "2026-10-09");
      assert.ok(early.includes("AGT-427"), `control: from 2026-10-09 the guard should find AGT-427, got ${JSON.stringify(early)}`);
      console.log(`    rows ${rows.length}; since CUTOFF ${JSON.stringify(unruledSplits(rows))}; since 2026-10-09 ${JSON.stringify(early)}`);
    });

    // --- F: live (AGT-449) -----------------------------------------------------------------------
    await arm("F-rule-cap-case-is-the-managers", async () => {
      const cap = await get(`capabilities?select=slug,execution_type,default_intent_slug&slug=eq.${CAP}`);
      assert.strictEqual(cap.length, 1, `${CAP}: expected 1 capabilities row, got ${cap.length}`);
      assert.strictEqual(cap[0].execution_type, "ai", `${CAP}.execution_type`);
      assert.strictEqual(cap[0].default_intent_slug, INTENT, `${CAP}.default_intent_slug`);
      const links = async slug => (await get(`capability_skill_profiles?select=skill_profile_slug,level,is_required,display_order` +
        `&capability_slug=eq.${slug}&order=display_order`))
        .map(l => [l.skill_profile_slug === TWIN_INTENT ? INTENT : l.skill_profile_slug, l.level, l.is_required, l.display_order]);
      const twin = await links(TWIN);
      assert.ok(twin.length > 0, `control: ${TWIN} has no links to copy`);
      assert.deepStrictEqual(await links(CAP), twin, `${CAP}'s links are not ${TWIN}'s with ${TWIN_INTENT} -> ${INTENT}`);
      const held = await get(`agent_capability_assignments?select=agent_id&capability_slug=eq.${CAP}`);
      assert.deepStrictEqual(held.map(h => h.agent_id), ["devmanager"], `${CAP} is assigned to ${JSON.stringify(held.map(h => h.agent_id))}`);
      const intent = await get(`skill_profiles?select=slug,traits,method&slug=eq.${INTENT}`);
      assert.strictEqual(intent.length, 1, `${INTENT}: expected 1 row, got ${intent.length}`);
      assert.deepStrictEqual(intent[0].traits?.schema?.properties?.ruling?.enum, ["split", "waive"], `${INTENT} schema ruling enum`);
      const method = String(intent[0].method ?? "");
      assert.ok(method.includes("pattern:172"), `${INTENT}.method does not cite pattern:172`);
      assert.ok(OTHER_AGENT_RE.test("send it to the Designer"), "control: the Rule #1 pattern matches an agent name");
      assert.ok(!OTHER_AGENT_RE.test(method), `${INTENT}.method names another agent (Rule #1): ${method.match(OTHER_AGENT_RE)?.[0]}`);
    });
  }

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n      ${failures.join("\n      ")}`);
  return results;
}

selfRun(import.meta.url, run);
export default run;
