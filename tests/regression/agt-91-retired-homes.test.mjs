// DeepBench v7.0.569 | tests/regression/agt-91-retired-homes.test.mjs | AGT-91
//
// FEATURE: AGT-91 -- no LIVE row in public.governance_rules may name a RETIRED home. Four rows did:
// OD-42 and OD-19 pointed at `api/cron/rank-backlog.js` and `vercel.json` `crons[0]`, both retired
// with the route by SES-346 (ledger 53); OD-04 restated the Prime Directive as a predicate SES-340
// replaced (ledger 43/44); B10 justified `filed_at` by B3's newest/oldest tie-break, which M5-02
// superseded on 2026-09-01 (ledger 20).
//
// WHAT THIS FILE EXISTS TO PREVENT, in one sentence: a retirement that moves the CODE and leaves
// the RULE behind -- the registry then instructs the next cycle to go read a file that is not
// there, and a rule pointing at nothing is worse than no rule, because it is believed.
//
// THE THIRD ARM IS THE ONE THAT STOPS THE CLASS. Assertions 1 and 2 grade THESE four rows; a
// future retirement would leave four different ones. Assertion 3 grades the CONTRACT in
// docs/SELFBUILD-RETIREMENT-LEDGER.md instead -- the sentence that makes "grep governance_rules for
// the retired referent and amend every hit in the same ship" part of every retirement, not just
// this one. pattern:162: it grades the change, never the live world.
//
// TWO ARMS, the split inherited from ses-234-operational-defaults.test.mjs rather than re-argued:
//   * The SNAPSHOT arm always runs, over docs/governance/RULES-SNAPSHOT.md via ses-234's own
//     parseSnapshot() -- one reader, not a second implementation agreeing with itself (SES-45).
//   * The LIVE arm runs only with SUPABASE_URL + SUPABASE_SERVICE_KEY and is DECLARED not-run
//     otherwise (SES-180 notRun()), never silently skipped. governance_rules is service_role-only
//     since SES-174, so the anon key cannot substitute.
// The ledger-contract arm is FILE-ONLY by nature and always runs: it is a fact about the repo.
//
// DRY-RUN RESULT, MEASURED (not reasoned) against the unchanged tree at commit 1dbec265 -- the
// registry before T1 and the ledger before T4. `node tests/regression/agt-91-retired-homes.test.mjs`
// exited 1 with "[snapshot] 3 of 3 assertions failed":
//   * assertion 1 named all four rows and five hits -- B10 -> "support newest/oldest",
//     OD-04 -> "Prime Directive stands", OD-19 -> "api/cron/rank-backlog", OD-19 -> "crons[0]",
//     OD-42 -> "api/cron/rank-backlog". (OD-19 carried TWO retired referents, which is why the
//     hit list is five long and not four.)
//   * assertion 2 named all four rows as not citing their ledger entries.
//   * assertion 3 reported the Contract block missing "governance_rules", "canonical_doc" and
//     "same ship".
// NOT ONE ARM PASSED VACUOUSLY on the pre-change tree, so there is no green here to interrogate the
// way ses-234's dry run had to. The LIVE arm did not reach its own grade on that run -- the
// snapshot arm throws first -- and was measured green only after T1 landed, which is stated rather
// than glossed: on the unchanged tree it is the snapshot that proves the teeth.
//
// EVERY ASSERTION IS PAIRED WITH A NEGATIVE CONTROL that breaks exactly the one thing it checks and
// nothing else, and the control is asserted to have CHANGED something first -- a control that
// mutates nothing proves nothing (the SES-158 failure, pinned by ses-234's own meta-assertion and
// re-pinned here).
//
// WHAT THIS FILE DOES NOT COVER, declared rather than implied: it does not assert that the four new
// statements are CORRECT descriptions of the runner. Byte-identity between a row and its census
// home is ses-234 assertion 3's job and is not duplicated here; this file asserts only that the
// retired referents are gone and that each row carries the ledger entry a reader needs to find out
// what happened to the thing it used to name.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { parseSnapshot } from "./ses-234-operational-defaults.test.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SNAPSHOT = path.join(ROOT, "docs/governance/RULES-SNAPSHOT.md");
const LEDGER_REL = "docs/SELFBUILD-RETIREMENT-LEDGER.md";
const LEDGER = path.join(ROOT, LEDGER_REL);

// The four retired referents, as the literal token a statement or canonical_doc would carry. Each
// one is a thing that no longer exists: the first two were deleted by SES-346, the third is a
// predicate SES-340 replaced, the fourth a tie-break M5-02 superseded.
export const RETIRED_REFERENTS = [
  { token: "api/cron/rank-backlog", gone: "the Vercel route, deleted by SES-346 (ledger 53)" },
  { token: "crons[0]", gone: "vercel.json's crons array, removed by SES-346 (ledger 53)" },
  { token: "Prime Directive stands", gone: "the standing-directive predicate SES-340 replaced with EXISTS (projects WHERE status = 'executing') (ledger 43/44)" },
  { token: "support newest/oldest", gone: "B3's tie-break, superseded by M5-02 on 2026-09-01 (ledger 20)" },
];

// Each re-pointed row must hand its reader the ledger entry that says what happened to the home it
// used to name. Without this, assertion 1 is satisfiable by DELETING the referent and saying
// nothing -- which leaves the reader with a rule that changed for no stated reason.
export const LEDGER_CITATIONS = [
  { id: "OD-04", cite: "ledger 43/44" },
  { id: "OD-19", cite: "ledger 53" },
  { id: "OD-42", cite: "ledger 53" },
  { id: "B10", cite: "ledger 20" },
];

// The Contract block is everything before the first `## Entries` heading. Entry 55 quotes all four
// PRIOR statements verbatim, so it necessarily contains every retired referent -- reading the whole
// file here would make assertion 3 grade the quotations instead of the duty.
export function contractBlock(text) {
  const lf = String(text).replace(/\r\n/g, "\n");
  const at = lf.indexOf("## Entries");
  return at < 0 ? "" : lf.slice(0, at);
}

// The tokens the re-point duty is made of. `governance_rules` alone would pass on a Contract that
// merely mentioned the table; the duty is that BOTH text columns are grepped and every hit is
// amended in the SAME ship -- a duty deferred to a follow-up ticket is the hole this closes.
export const CONTRACT_TOKENS = ["governance_rules", "statement", "canonical_doc", "same ship"];

export function liveRows(rules) {
  return rules.filter(r => r.status === "live");
}

// Returns "<id> -> <token>" for every live row still naming a retired referent, so the failure
// message NAMES the rows rather than reporting a count.
export function retiredHits(rules) {
  const hits = [];
  for (const r of liveRows(rules)) {
    const hay = `${r.statement ?? ""}\n${r.canonical_doc ?? ""}`;
    for (const { token } of RETIRED_REFERENTS) {
      if (hay.includes(token)) hits.push(`${r.id} -> "${token}"`);
    }
  }
  return hits.sort();
}

export function missingCitations(rules) {
  const byId = new Map(rules.map(r => [r.id, r]));
  const missing = [];
  for (const { id, cite } of LEDGER_CITATIONS) {
    const r = byId.get(id);
    if (!r) { missing.push(`${id} (no row at all)`); continue; }
    if (r.status !== "live") { missing.push(`${id} (status ${r.status}, expected live)`); continue; }
    if (!String(r.statement ?? "").includes(cite)) missing.push(`${id} (does not cite "${cite}")`);
  }
  return missing;
}

export function missingContractTokens(contract) {
  return CONTRACT_TOKENS.filter(t => !contract.includes(t));
}

// ---------------------------------------------------------------------------
// The assertions, written ONCE over a plain array of rows plus the contract text, so the snapshot
// arm and the live arm are graded by the same code.
// ---------------------------------------------------------------------------

export const ASSERTIONS = [
  {
    id: "1-no-live-row-names-a-retired-home",
    detail:
      "no row with status='live' carries any of " +
      RETIRED_REFERENTS.map(r => `"${r.token}"`).join(", ") +
      " in its statement or canonical_doc -- each names something that no longer exists",
    report: (rules) => {
      const hits = retiredHits(rules);
      return hits.length ? `still naming a retired home: ${hits.join(", ")}` : "";
    },
    test: (rules) => retiredHits(rules).length === 0,
    breaks: (rules, contract) => [
      rules.map(r => (r.id === "OD-42"
        ? { ...r, statement: `${r.statement} canonical: api/cron/rank-backlog.js` }
        : r)),
      contract,
    ],
  },
  {
    id: "2-every-repointed-row-cites-its-ledger-entry",
    detail:
      "each of " + LEDGER_CITATIONS.map(c => `${c.id} (${c.cite})`).join(", ") +
      " is live and names its ledger entry, so a reader who came looking for the retired home finds " +
      "where it went",
    report: (rules) => {
      const missing = missingCitations(rules);
      return missing.length ? `missing ledger citations: ${missing.join(", ")}` : "";
    },
    test: (rules) => missingCitations(rules).length === 0,
    breaks: (rules, contract) => [
      rules.map(r => (r.id === "B10" ? { ...r, statement: String(r.statement).replace("ledger 20", "see the ledger") } : r)),
      contract,
    ],
  },
  {
    id: "3-the-ledger-contract-carries-the-repoint-duty",
    detail:
      `the Contract block of ${LEDGER_REL} (everything before "## Entries") names ` +
      CONTRACT_TOKENS.map(t => `"${t}"`).join(", ") +
      " -- i.e. every retirement greps the registry's statement and canonical_doc for the retired " +
      "referent and amends or supersedes every hit in the SAME ship. This is the arm that stops the " +
      "next retirement leaving four more orphan rules",
    report: (_rules, contract) => {
      const missing = missingContractTokens(contract);
      return missing.length ? `the Contract block does not name: ${missing.join(", ")}` : "";
    },
    test: (_rules, contract) => missingContractTokens(contract).length === 0,
    breaks: (rules, contract) => [rules, contract.split("governance_rules").join("the registry")],
  },
];

// EVERY ASSERTION IS GRADED BEFORE ANY OF THEM THROWS, and that is not tidiness: assertion 1 fails
// on the unchanged tree, so a fail-fast grade() would have hidden assertions 2 and 3 behind it and
// the dry run could not have shown the Contract arm failing too (the kickoff's section 6 bar).
function grade(rules, contract, where) {
  const failures = [];
  for (const a of ASSERTIONS) {
    if (a.test(rules, contract)) continue;
    const extra = a.report(rules, contract);
    failures.push(`assertion "${a.id}" failed: ${a.detail}${extra ? ` -- ${extra}` : ""}`);
  }
  assert.strictEqual(
    failures.length,
    0,
    `[${where}] ${failures.length} of ${ASSERTIONS.length} assertions failed:\n    * ${failures.join("\n    * ")}`,
  );
}

function everyAssertionHasTeeth(rules, contract) {
  for (const a of ASSERTIONS) {
    const [mRules, mContract] = a.breaks(rules, contract);
    assert.ok(
      JSON.stringify(mRules) !== JSON.stringify(rules) || mContract !== contract,
      `control for "${a.id}" changed NOTHING -- it cannot prove the assertion has teeth (the SES-158 failure)`,
    );
    assert.ok(
      !a.test(mRules, mContract),
      `assertion "${a.id}" still passes after its own control broke the thing it checks -- the check is vacuous`,
    );
  }
}

// The readers must report rather than crash, and each one is exercised on the shape that would
// otherwise fail silently: a ledger with no "## Entries" heading returns "" (not the whole file,
// which would make assertion 3 grade entry 55's quotations).
function theReadersReportRatherThanCrash() {
  assert.strictEqual(contractBlock("# a ledger with no entries heading"), "",
    "a ledger with no '## Entries' heading must yield an EMPTY contract block, never the whole file");
  assert.strictEqual(contractBlock("before\r\n## Entries\r\nafter"), "before\n",
    "contractBlock must normalise CRLF before splitting -- this tree's working copy is CRLF");
  assert.deepStrictEqual(retiredHits([{ id: "X", status: "superseded", statement: "api/cron/rank-backlog.js" }]), [],
    "a SUPERSEDED row naming a retired home is the ledger working as designed, never a failure");
  assert.deepStrictEqual(retiredHits([{ id: "Y", status: "live", statement: "", canonical_doc: "vercel.json crons[0]" }]),
    ['Y -> "crons[0]"'],
    "retiredHits must read canonical_doc as well as statement -- a rule can point at nothing from either column");
  assert.deepStrictEqual(missingCitations([{ id: "B10", status: "live", statement: "... (ledger 20)." }]).sort(),
    ["OD-04 (no row at all)", "OD-19 (no row at all)", "OD-42 (no row at all)"],
    "missingCitations must report an ABSENT row, not skip it -- every() over a filtered set is vacuous when empty");
  assert.deepStrictEqual(missingContractTokens("governance_rules statement canonical_doc same ship"), [],
    "missingContractTokens must find every token it is given");
}

// ---------------------------------------------------------------------------
// Arm 1 -- the snapshot and the ledger (always run)
// ---------------------------------------------------------------------------

function theSnapshotAndLedgerAgree(contract) {
  const rules = parseSnapshot(fs.readFileSync(SNAPSHOT, "utf8"));
  assert.ok(
    rules.length > 100,
    `docs/governance/RULES-SNAPSHOT.md parsed to ${rules.length} rows -- the reader is broken or the ` +
      "snapshot is truncated; regenerate with node scripts/export-governance-snapshot.js",
  );
  for (const { id } of LEDGER_CITATIONS) {
    assert.ok(
      rules.some(r => r.id === id),
      `${id} is missing from docs/governance/RULES-SNAPSHOT.md -- the row was rewritten but the ` +
        "snapshot was never re-exported (node scripts/export-governance-snapshot.js)",
    );
  }
  grade(rules, contract, "snapshot");
  everyAssertionHasTeeth(rules, contract);
  return rules;
}

// ---------------------------------------------------------------------------
// Arm 2 -- live Supabase (credential-gated, DECLARED when it cannot run)
// ---------------------------------------------------------------------------

async function fetchLiveRules(url, key) {
  const res = await fetch(
    `${url.replace(/\/+$/, "")}/rest/v1/governance_rules?select=id,status,canonical_doc,statement&limit=1000`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  if (!res.ok) throw new Error(`governance_rules read returned HTTP ${res.status} ${res.statusText}`);
  const body = await res.json();
  if (!Array.isArray(body)) throw new Error("governance_rules returned a non-array payload");
  return body;
}

async function theLiveRegistryHasNoRetiredHomes(contract) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the live public.governance_rules arm (all three assertions against Supabase, and the " +
        "retired-referent scan over every live row rather than only the rendered snapshot)",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent. governance_rules is service_role-only " +
        "(SES-174 locked anon/authenticated to ZERO privileges), so the anon key cannot substitute. " +
        "The snapshot arm above still graded all three assertions against the committed render, and " +
        "the ledger-contract arm is a fact about the repo and ran in full. " +
        "Canonical invocation: STANDARDS.md Section 2 rule 5.",
    );
    return;
  }

  const live = await fetchLiveRules(url, key);
  assert.ok(live.length > 100, `governance_rules returned ${live.length} rows -- refusing to grade a truncated read`);
  grade(live, contract, "live registry");
  everyAssertionHasTeeth(live, contract);
}

async function run() {
  const contract = contractBlock(fs.readFileSync(LEDGER, "utf8"));
  assert.ok(
    contract.length > 200,
    `${LEDGER_REL} yielded a ${contract.length}-character Contract block -- the "## Entries" heading ` +
      "moved or the file is truncated, and a short block would pass assertion 3 by accident",
  );

  theReadersReportRatherThanCrash();
  theSnapshotAndLedgerAgree(contract);
  await theLiveRegistryHasNoRetiredHomes(contract);
}

selfRun(import.meta.url, run);
export default run;
