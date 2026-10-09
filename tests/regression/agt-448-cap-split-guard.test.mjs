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
];

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

  // --- C: live -----------------------------------------------------------------------------------
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!base || !key) {
    notRun("the live arm (ds-/dm-guardrails rows, pattern:172 in the knowledge rows, DRAIN-CAP-SPLIT, the refusal, unruled splits since CUTOFF)",
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
  }

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n      ${failures.join("\n      ")}`);
  return results;
}

selfRun(import.meta.url, run);
export default run;
