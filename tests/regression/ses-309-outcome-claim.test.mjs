// DeepBench v7.0.390 | tests/regression/ses-309-outcome-claim.test.mjs | SES-309 (M5 required set)
//
// FEATURE: SES-309 -- a chartered ticket declares the scoreboard number it claims to move, or says
// plainly that it claims none, and "never claimed" stops hiding as "unmeasurable".
//
// THE DEFECT THIS GUARDS AGAINST IS A CONFLATION, not a crash. Before this ship, public.ticket_outcome
// read backlog_items.enhancement_claim -- a column only the enhancement lane was ever told to fill --
// and returned `unmeasurable` for BOTH "this ticket never declared a claim" (a filing omission a
// reviewer must see) and "this ticket declared one the scoreboard cannot measure" (an honest verdict).
// Measured live at this ship: enhancement_claim was NULL on all 792 backlog_items rows and
// scope_origin = 'enhancement' had zero members, so every Selfbuild ship was on a path whose only
// exit was `unmeasurable`. Three arms:
//
//   * DOC arm (always runs): the filing template in session-setup.md names the claim column and
//     offers `none: <why>`; both runbooks carry the five-word verdict vocabulary including
//     `unclaimed`. Negative control per clause -- each clause is re-tested against its own mutation.
//   * LIVE arm (SUPABASE_URL + SUPABASE_SERVICE_KEY, declared NOT RUN otherwise): the validator
//     public.outcome_claim_is_valid() grades five inputs over PostgREST RPC; the CHECK constraint
//     ck_backlog_outcome_claim actually REJECTS a bogus claim (graded by attempting the write, not
//     by reading a catalog PostgREST does not expose); ticket_outcome's verdict vocabulary is closed.
//   * CENSUS (informational, never an assertion): how many tickets filed on/after 2026-09-02 still
//     carry no claim. Tickets filed before this ship are not retro-required.
//
// WHY THE `pending` ASSERTION IS NOT WHAT PROVES THE STAMPING, stated because the kickoff asserted
// the opposite: `pending` is the FIRST branch of the verdict CASE (no after-row yet), so SES-303 /
// SES-277 / SES-308 read `pending` whether or not they carry a claim. The stamps are asserted where
// they are actually visible -- the rows carry a `none:` claim on backlog_items -- and `pending` is
// asserted beside it only to prove the new `unclaimed` branch did not swallow the pending one.
//
// Invocation: node tests/regression/ses-309-outcome-claim.test.mjs

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(REPO, rel), "utf8").replace(/\r\n/g, "\n");

const VOCABULARY = "`held` / `did_not_hold` / `unmeasurable` / `unclaimed` / `pending`";

// The seven platform_scoreboard columns a claim may name. This list is asserted to be PRESENT in the
// runbook; its one authoritative home is public.outcome_claim_is_valid(), never a doc and never here.
const METRICS = [
  "noship_cycles_week", "noship_tokens_week", "shipped_cycles_week", "tokens_per_shipped_cycle",
  "cycles_per_shipped_ticket", "cron_silence_hours", "hygiene_flags",
];

const CLAUSES = [
  {
    id: "filing-insert-names-the-claim-column", file: "docs/runbooks/session-setup.md",
    test: s => /milestone,\n\s+enhancement_claim\)/.test(s),
    breaks: s => s.split(",\n   enhancement_claim)").join(")"),
    detail: "step 3c's canonical INSERT must carry enhancement_claim -- a filing template that omits the column is why zero of 792 rows had one",
  },
  {
    id: "filing-template-offers-none-with-a-reason", file: "docs/runbooks/session-setup.md",
    test: s => /-- outcome claim \(SES-309\)/.test(s) && /'none: <why>'/.test(s),
    breaks: s => s.split("'none: <why>'").join("''"),
    detail: "`none: <why no scoreboard number applies>` is the honest answer most chartered work has; without it in the template the only options look like a fake claim or a blank",
  },
  {
    id: "filing-bullet-lists-the-seven-metric-names", file: "docs/runbooks/session-setup.md",
    test: s => METRICS.every(m => s.includes(m)),
    breaks: s => s.split("`cron_silence_hours`").join("`the silence one`"),
    detail: "a filer who cannot see the legal metric names writes a plausible wrong one, and the constraint rejects it at filing -- the list is what makes the rejection avoidable",
  },
  {
    id: "session-setup-scoreboard-paragraph-carries-unclaimed", file: "docs/runbooks/session-setup.md",
    test: s => s.includes(VOCABULARY),
    breaks: s => s.split(VOCABULARY).join("`held` / `did_not_hold` / `unmeasurable` / `pending`"),
    detail: "the attended push path is where most Selfbuild ships happen; its scoreboard paragraph must name the verdict it can now produce",
  },
  {
    id: "runner-cycle-scoreboard-bullet-carries-unclaimed", file: "docs/runbooks/runner-cycle.md",
    test: s => s.includes(VOCABULARY) && /`unclaimed` \(`SES-309`/.test(s),
    breaks: s => s.split(VOCABULARY).join("`held` / `did_not_hold` / `unmeasurable` / `pending`"),
    detail: "an unattended cycle reads this bullet and nothing else about outcomes; a vocabulary missing `unclaimed` sends it back to reading a filing omission as a verdict",
  },
];

const VERDICTS = new Set(["pending", "unclaimed", "unmeasurable", "held", "did_not_hold"]);
const STAMPED = ["SES-303", "SES-277", "SES-308"];

async function run(ctx = {}) {
  const results = [];

  for (const c of CLAUSES) {
    const s = read(c.file);
    assert.ok(c.test(s), `${c.file} lost clause "${c.id}": ${c.detail}`);
    const mutated = c.breaks(s);
    assert.notStrictEqual(mutated, s, `control: mutation for "${c.id}" changed nothing`);
    assert.ok(!c.test(mutated), `control: clause "${c.id}" still passes after its own mutation`);
    results.push(c.id);
  }

  const url = ctx.url ?? process.env.SUPABASE_URL;
  const key = ctx.key ?? process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("the live arm (validator RPC, the CHECK constraint's rejection, ticket_outcome's verdict vocabulary)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent. Measured over MCP when this shipped (2026-09-02): " +
      "outcome_claim_is_valid graded 'hygiene_flags: down' true, 'none: because' true, 'bogus: sideways' " +
      "false, 'hygiene_flags: up ' true, '' false; a rolled-back fixture read unclaimed (no row) / " +
      "unmeasurable ('none: qa') / held ('hygiene_flags: down', 93 -> 90) / did_not_hold on the same pair " +
      "with ': up'; and ck_backlog_outcome_claim rejected a 'bogus: sideways' UPDATE as check_violation.");
    return results;
  }

  const base = url.replace(/\/+$/, "");
  const hdr = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const rpc = async claim => {
    const r = await fetch(`${base}/rest/v1/rpc/outcome_claim_is_valid`, {
      method: "POST", headers: hdr, body: JSON.stringify({ claim }),
    });
    // Read the body ONCE, and only on the failure path: a template literal that awaits r.text()
    // inside an assert message is evaluated eagerly, which consumes the body before r.json() runs.
    if (!r.ok) assert.fail(`outcome_claim_is_valid RPC failed: HTTP ${r.status} ${await r.text()}`);
    return r.json();
  };

  // --- LIVE 1: the validator, and the metric list has exactly one home -------------------------
  for (const [claim, want] of [
    ["hygiene_flags: down", true],
    ["none: because", true],
    ["bogus: sideways", false],
    ["hygiene_flags: up ", true],
    ["", false],
  ]) {
    const got = await rpc(claim);
    assert.strictEqual(got, want, `outcome_claim_is_valid(${JSON.stringify(claim)}) returned ${got}, expected ${want}`);
  }
  results.push("validator-grades-claims");

  // --- LIVE 2: the constraint REJECTS, graded by attempting the write --------------------------
  // pg_constraint is not reachable over PostgREST, so the only honest grade is the write itself.
  // Nothing is written when the constraint works (the row never changes); if it does NOT work the
  // bogus value is restored to what was read a line earlier, and the test then fails loudly.
  const probeId = "SES-309";
  const beforeRes = await fetch(`${base}/rest/v1/backlog_items?select=backlog_id,enhancement_claim&backlog_id=eq.${probeId}`, { headers: hdr });
  assert.ok(beforeRes.ok, `could not read ${probeId}: HTTP ${beforeRes.status}`);
  const beforeRows = await beforeRes.json();
  if (!Array.isArray(beforeRows) || beforeRows.length !== 1) {
    notRun("the constraint-rejects arm",
      `${probeId} is not a single readable backlog_items row (got ${JSON.stringify(beforeRows).slice(0, 120)}), ` +
      "so there is nothing safe to attempt the rejected write against.");
  } else {
    const priorClaim = beforeRows[0].enhancement_claim;
    const bad = await fetch(`${base}/rest/v1/backlog_items?backlog_id=eq.${probeId}`, {
      method: "PATCH", headers: { ...hdr, Prefer: "return=representation" },
      body: JSON.stringify({ enhancement_claim: "bogus: sideways" }),
    });
    if (bad.ok) {
      await fetch(`${base}/rest/v1/backlog_items?backlog_id=eq.${probeId}`, {
        method: "PATCH", headers: hdr, body: JSON.stringify({ enhancement_claim: priorClaim }),
      });
      assert.fail(`ck_backlog_outcome_claim did not reject 'bogus: sideways' on ${probeId} (HTTP ${bad.status}) -- the claim was restored, but the constraint is not enforcing`);
    }
    const body = await bad.text();
    assert.ok(/ck_backlog_outcome_claim/.test(body),
      `the bogus claim was rejected (HTTP ${bad.status}) but not by ck_backlog_outcome_claim -- ${body.slice(0, 200)}`);
    results.push("constraint-rejects-a-bogus-claim");
  }

  // --- LIVE 3: the verdict vocabulary is closed, and pending still wins over unclaimed ---------
  const outRes = await fetch(`${base}/rest/v1/ticket_outcome?select=backlog_id,verdict,claim_metric`, { headers: hdr });
  assert.ok(outRes.ok, `ticket_outcome did not resolve: HTTP ${outRes.status}`);
  const rows = await outRes.json();
  assert.ok(Array.isArray(rows) && rows.length > 0, "ticket_outcome returned no rows -- the series never started");
  for (const r of rows) {
    assert.ok(VERDICTS.has(r.verdict),
      `ticket_outcome returned verdict "${r.verdict}" for ${r.backlog_id}, outside {${[...VERDICTS].join(", ")}}`);
  }
  assert.ok(rows.some(r => r.verdict === "pending"), "no ticket_outcome row reads pending -- the pending branch is unreachable");
  results.push("verdict-vocabulary-is-closed");

  // --- LIVE 4: the four M5 rows actually carry their declared claims ---------------------------
  const ids = [...STAMPED, "SES-309"];
  const claimRes = await fetch(`${base}/rest/v1/backlog_items?select=backlog_id,enhancement_claim&backlog_id=in.(${ids.join(",")})`, { headers: hdr });
  assert.ok(claimRes.ok, `backlog_items claim read failed: HTTP ${claimRes.status}`);
  const claims = new Map((await claimRes.json()).map(r => [r.backlog_id, r.enhancement_claim]));
  for (const id of ids) {
    const c = claims.get(id);
    assert.ok(typeof c === "string" && c.startsWith("none:") && c.slice(5).trim().length > 0,
      `${id} carries no declared claim (${JSON.stringify(c)}) -- it would read unclaimed the moment its after-row lands`);
  }
  for (const id of STAMPED) {
    const row = rows.find(r => r.backlog_id === id);
    assert.ok(row, `${id} has a ship stamp but no ticket_outcome row`);
    assert.strictEqual(row.verdict, "pending",
      `${id} reads ${row.verdict}; it has no after-row yet, so pending must win over every later branch`);
    assert.strictEqual(row.claim_metric, null,
      `${id} declared "none:" -- claim_metric must be NULL, not ${JSON.stringify(row.claim_metric)}`);
  }
  results.push("declared-claims-are-on-the-rows");

  // --- CENSUS: informational, never an assertion -----------------------------------------------
  const census = await fetch(
    `${base}/rest/v1/backlog_items?select=backlog_id&filed_at=gte.2026-09-02&enhancement_claim=is.null`,
    { headers: { ...hdr, Prefer: "count=exact", Range: "0-0" } });
  if (census.ok) {
    const range = census.headers.get("content-range") || "";
    console.log(`         [census] tickets filed on/after 2026-09-02 with no outcome claim: ${range.split("/")[1] ?? "unknown"} (informational -- tickets filed before this ship are not retro-required)`);
  }

  return results;
}

selfRun(import.meta.url, run);
export default run;
