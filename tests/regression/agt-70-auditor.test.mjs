// DeepBench v7.0.469 | tests/regression/agt-70-auditor.test.mjs | AGT-70
//
// FEATURE: AGT-70 slice 4 -- the negative control, week two, and the Auditor audited. Parts A-M
// below are slices 1-3's and are unchanged (L still asserts 27 steps).
//
// FOUR MORE PARTS, each with its own control:
//   N   THE NEGATIVE CONTROL -- a corpus in which every one of the first week's four open findings
//       has been RESOLVED, so the right answer is "nothing". This is the arm no earlier slice had:
//       parts C and G prove the tools find what is there, and nothing proved they stop finding it
//       once it is gone. It is also the arm that caught the live bug -- priorClusters() returned
//       TWO runnable clusters off `RETIRED IN PLACE` twins. The control is the load-bearing half:
//       force `retired: false` on the same statements and those two clusters come straight back,
//       which proves the exclusion is the FLAG and not a difference in the text.
//   O   WEEK TWO (pure) -- carryForward() over live-shaped statements carries all four with their
//       fingerprints byte-equal to the rows', and over the resolved corpus carries none and reports
//       four gone. Its three guards are asserted separately: the same week carries nothing, a
//       fingerprint already observed in the week being collected carries nothing, and a latest row
//       that is `resolved` never carries. classifyIngest()'s four verdicts each get their own case,
//       including the ordering one (`ruled-out` beats `recurring`) and the two-homes-not-one bar.
//   P   THE SELF-AUDIT -- detectStaleParameters() over the Auditor's OWN seed rows as written is
//       []; flip one temperature to 0 and it is exactly one finding citing that row and
//       shared/models.js. Controls: the same 0 on a `claude-opus-5` row is [] (the LIST decides,
//       never the number), and the models.js location's text is built from the IMPORTED constant,
//       so a copy of the list in audit-corpus.js could not pass here. The seed file itself is
//       grepped: 6 rows at `6000, NULL`, 0 at `6000, 0`.
//   Q   LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY; notRun otherwise) -- the three CLIs run for
//       real, at the week that does not exist yet: a W38 dry ingest of the first week's file must
//       exit 1 as `recurring` (never `new`), --agent=auditor must exit 2 while the seed is
//       unapplied, and --collect at W38 must carry exactly the fingerprints whose latest row is
//       open. Ends on the two counts every AGT-70 slice promised not to move: 6 and 0.
//
// DRY-RUN against the tree before this ticket (v7.0.467): N FAILS at the clusters assertion
// (priorClusters returns 2, not 0) and at the CLI (`stale 0` is not in the summary line); O and P
// FAIL at import (carryForward, classifyIngest and detectStaleParameters do not exist); Q FAILS at
// its first spawn (the W38 ingest prints `6 new` and the `recurring` band does not exist).
//
// FEATURE: AGT-70 slice 3 -- the landing: ruled findings become board rows under a weekly cap, the
// standing brief grows an `Auditor's ledger` group, and runbook step 4d is where the weekly audit
// fires. Parts A-I below are slices 1 and 2's and are unchanged.
//
// FOUR MORE PARTS, each with its own control:
//   J   LEDGER FILING (pure) -- ledgerEligible's three gates and its earliest-ruling collapse,
//       ledgerDetect's dedup-before-cap ordering (a row already filed must never consume a weekly
//       slot), and buildLedgerTicketDraft's row. The cap is asserted in BOTH directions: at
//       filedThisWeek 3 nothing files, and at 2 exactly one of two eligible rows does.
//   K   BRIEF GROUP (pure + doc) -- renderAuditLedger over the six live findings' shape, byte-stable
//       on a second call, and the branch that matters: `undefined` says "not read" and must NOT say
//       "0 findings". factsSha moves when a row is ruled and when a row leaves for the board.
//   L   STEP 4d AND THE CARD (source, always runs) -- 4d sits between 4c and 5, its NOTES entry
//       exists and is under the outcome cap, and the step body carries the three things that make
//       it safe: the --from-ledger sweep, a DRY --ingest (no line carries both --ingest= and
//       --apply, which is the "a cycle never ingests" rule as a grep), and the ISO-week
//       precondition. Control: rename the step and the renderer must REFUSE, not silently omit it.
//   M   LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY; notRun otherwise) -- the CLI's --from-ledger dry
//       run against the real ledger, and the two counts this slice promised not to move.
//
// DRY-RUN against the tree before this ticket (v7.0.465): J and M FAIL at import (ledgerDetect and
// its siblings do not exist); K FAILS (renderAuditLedger is not exported and standing-brief.md has
// no `**Auditor's ledger**`); L FAILS (parseSteps returns no `4d` and NOTES has no entry for it).
//
// FEATURE: AGT-70 slice 2 -- the judgment lane (scripts/audit-cluster.js): the clusterer, the
// locate/validate/reconcile trio around the model call, and the two detector exemptions the first
// live corpus run measured. Parts A-F below are slice 1's and are unchanged.
//
// FIVE MORE PARTS, each with its own control:
//   G   CLUSTERS -- buildClusters over five inline statements is exactly one cluster on the
//       `interval_hours` anchor, with the 1,200-char cut and its `truncated` flag proven on the one
//       statement that exceeds it. Controls: collapse the homes to ONE and the cluster must vanish
//       (a cluster is 2+ homes, never one home repeating itself); give a SECOND anchor the same
//       statement set and the count must stay 1 (the Jaccard merge, which is the only thing
//       standing between a 12-call budget and paying twice for the same four statements).
//   H   LOCATE / VALIDATE / RECONCILE -- the three pure functions the model's answer passes
//       through, each with the negative case beside it: a ledger quote locates its statement and
//       does NOT locate a different one; an invented location and a paraphrase are both DROPPED
//       while a verbatim sub-span is kept; two shared location homes are a re-found finding, one
//       shared home is a new one, and the same two homes on a not-a-defect row are ruled out.
//   I   CLI -- real subprocess runs of --build and --collect with --no-db, because G and H import
//       the pure halves and would stay green if the CLI wiring broke entirely.
//   C+  DETECTOR EXEMPTIONS -- the two narrowings slice 2 added, each asserted in BOTH directions:
//       a fenced block is 0 findings and the same text unfenced is 1 (so the exemption is the
//       fence, not a text difference); a `> **Rule X** — <s>` render is 0 findings with that rule
//       live and 1 with no rules (so the exemption is the rule, not the prefix).
//   E+  THE FILE LIST -- corpusFiles() excludes docs/runbooks/cycle-card.md, and the Set doing the
//       excluding is check-session-docs.js's own PROCEDURE_GENERATED_DOCS, asserted by IMPORTING
//       it. A literal filename here would pass while the real exclusion had drifted away.
//
// DRY-RUN against the tree before this ticket (v7.0.464): G, H and I FAIL at import
// (scripts/audit-cluster.js does not exist); C+ FAILS both ways (the detector had no fence skip and
// only an exact rule match); E+ FAILS (cycle-card.md was in the corpus and nothing was imported).
//
// SIX PARTS, and every one of them has a control that says what it would take to make it red:
//   A  FINGERPRINT -- invariant to a `:line` suffix (the same passage after an edit above it is ONE
//      finding, not a second), sensitive to `kind` and to the location FILE.
//   B  RETIREMENT -- extractMarkdown on the b.md fixture marks P2 retired and P1 not. This is the
//      one rule that keeps the first weekly report from being a list of the repo's own deliberate
//      RETIRED IN PLACE twins.
//   C  DETECTOR -- detectDuplicates over the two-file fixture corpus is exactly 1 finding (P1, in
//      both files), with TWO controls: b.md minus P1 must give 0, and b.md minus its marker
//      paragraph must give 2. The second control is the load-bearing one -- it proves P2 is
//      excluded by the RETIREMENT rule and not because the two texts differ. Without it, a broken
//      extractor that simply dropped P2 would pass the base case.
//   D  REPORT -- renderReport is pure and byte-stable, open before resolved, ruling line only on a
//      ruled row. Held against a literal expected string, so a formatting drift is a red here
//      rather than a silent reshuffle of a generated doc nobody diffs.
//   E  CLI -- a real subprocess run of audit-corpus.js, because A-D all import the pure halves and
//      would stay green if the CLI wiring broke entirely.
//   F  LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, else NOT RUN) -- the ledger's own guarantees:
//      the week's rows are open 4 / resolved 2; a governing_fact UPDATE is REFUSED by the trigger
//      AND the stored value is proven unchanged afterwards (an error alone could be anything); a
//      ruling-columns-only UPDATE succeeds; a dry-run re-ingest is idempotent.
//
// THE LIVE ARM WRITES, AND IT CLEANS UP AFTER ITSELF. It flips `ruling` on one row and puts the
// original back in the same test, and its before-image row (§19v: no before-image -> the write does
// not happen) carries session_name 'agt-70-regression' and is deleted on the way out, the same
// tag-and-delete shape agt-63-prioritizer.test.mjs uses. It cannot delete an audit_findings row
// even if it wanted to -- the guard refuses every DELETE, which part F proves.
//
// DRY-RUN against the tree before this ticket (v7.0.463): A-E FAIL at import (neither script
// exists); F is NOT RUN without credentials and FAILS with them, because public.audit_findings
// does not exist yet.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  fingerprint, locationKey, normalize, renderReport, isoWeek, isoWeekStart, classifyIngest, toRow,
} from "../../scripts/audit-ledger.js";
import {
  ledgerEligible, ledgerDetect, buildLedgerTicketDraft, LEDGER_SOURCE_FILE, LEDGER_WEEKLY_CAP,
} from "../../scripts/tripwire-to-backlog.js";
import { renderAuditLedger, factsSha, BEGIN, END } from "../../scripts/render-standing-brief.js";
import { render as renderCard, parseSteps, NOTES } from "../../scripts/render-cycle-card.js";
import {
  extractMarkdown, extractSkillRows, detectDuplicates, detectStaleParameters, corpusFiles,
} from "../../scripts/audit-corpus.js";
import { PROCEDURE_GENERATED_DOCS } from "../../scripts/check-session-docs.js";
import {
  buildClusters, locateStatements, priorClusters, capabilityFor, validateFindings, reconcile,
  carryForward,
} from "../../scripts/audit-cluster.js";
// IMPORTED, never restated: part P asserts that the detector's models.js location carries the
// value of THIS constant, so a second copy of the prefix list inside audit-corpus.js would be red
// here rather than a silently agreeing duplicate -- which is the very defect class the detector
// exists to find.
import { supportsTemperature, NO_TEMPERATURE_PREFIXES } from "../../shared/models.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CORPUS_REL = "tests/fixtures/agt-70/corpus";
const RESOLVED_REL = "tests/fixtures/agt-70/corpus-resolved";
const FINDINGS_REL = "tests/fixtures/agt-70/findings-2026-W37.json";
const WEEK = "2026-W37";
const SESSION_TAG = "agt-70-regression";

const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

// --- A. the fingerprint --------------------------------------------------------------------

function theFingerprintHoldsTheRightThingsStill() {
  const base = {
    kind: "contradiction",
    governing_fact: "the runner's scheduling interval in hours",
    locations: [
      { location: "docs/runbooks/runner-cycle.md:626", text: "at the standing 3" },
      { location: "runner_settings/1/interval_hours", text: "interval_hours=1" },
    ],
  };

  // INVARIANT to the line numbers: the same passage, cited at a different line after an edit above
  // it, is the same finding.
  const moved = {
    ...base,
    locations: [
      { location: "docs/runbooks/runner-cycle.md:988-991", text: "at the standing 3" },
      { location: "runner_settings/1/interval_hours", text: "interval_hours=1" },
    ],
  };
  assert.strictEqual(fingerprint(moved), fingerprint(base),
    "a `:line` change must not mint a new finding -- the ledger would refile every finding after any edit");

  // INVARIANT to quoting, case and re-wrapping of the governing fact.
  const reworded = { ...base, governing_fact: "  The runner's   scheduling `interval` in hours  ".replace("`interval`", "interval") };
  assert.strictEqual(fingerprint(reworded), fingerprint(base),
    "normalize() must fold case and whitespace in the governing fact");

  // SENSITIVE to kind: the same two passages read as a duplicate are a different claim.
  assert.notStrictEqual(fingerprint({ ...base, kind: "duplicate" }), fingerprint(base),
    "kind must be part of the identity");

  // SENSITIVE to the location file: the same fact disputed in another home is another dispute.
  const elsewhere = {
    ...base,
    locations: [
      { location: "docs/runbooks/standing-brief.md:626", text: "at the standing 3" },
      { location: "runner_settings/1/interval_hours", text: "interval_hours=1" },
    ],
  };
  assert.notStrictEqual(fingerprint(elsewhere), fingerprint(base),
    "the location FILE must be part of the identity");

  // SENSITIVE to the governing fact itself.
  assert.notStrictEqual(fingerprint({ ...base, governing_fact: "the runner's scheduling interval in days" }), fingerprint(base),
    "the governing fact must be part of the identity");

  // The pieces, directly.
  assert.strictEqual(locationKey("api/prompt/request-receivable.js:274-279"), "api/prompt/request-receivable.js");
  assert.strictEqual(locationKey("docs/SELFBUILD-CHARTER.md:262"), "docs/SELFBUILD-CHARTER.md");
  assert.strictEqual(locationKey("skill_profiles/pz-identity/temperature"), "skill_profiles/pz-identity/temperature",
    "a table/pk/field location has no line suffix to drop and must survive untouched");
  assert.strictEqual(normalize(`  The  "Auditor's" \`ledger\` `), "the auditors ledger");
  assert.match(fingerprint(base), /^[0-9a-f]{16}$/, "a fingerprint is 16 hex characters");
}

// --- B. the retirement rule ------------------------------------------------------------------

function bMdMarksItsRetiredTwinAndNothingElse() {
  const b = extractMarkdown("b.md", read(`${CORPUS_REL}/b.md`));
  const p1 = b.find(s => s.text.startsWith("The weekly audit fires"));
  const p2 = b.find(s => s.text.startsWith("Every finding carries"));
  assert.ok(p1 && p2, `b.md must yield both paragraphs; got ${b.map(s => s.location).join(", ")}`);
  assert.strictEqual(p2.retired, true,
    "b.md's P2 sits directly under a RETIRED IN PLACE paragraph and must be retired");
  assert.strictEqual(p1.retired, false,
    "b.md's P1 is live voice -- marking it retired would hide the one real duplicate");

  // CONTROL: the same P2 text in a.md, with no marker above it, must NOT be retired. If it were,
  // part C's second control could not tell the retirement rule from a text difference.
  const a = extractMarkdown("a.md", read(`${CORPUS_REL}/a.md`));
  const aP2 = a.find(s => s.text.startsWith("Every finding carries"));
  assert.ok(aP2, "a.md must yield P2");
  assert.strictEqual(aP2.retired, false,
    "a.md's P2 mentions 'the retirement ledger' past its first 160 chars -- the head cap must keep it live");

  // The heading is under the 40-char floor and must not become a statement.
  assert.ok(!b.some(s => s.text.startsWith("# Fixture B")),
    "a heading is a label, not a claim -- it must not enter the statement table");
  assert.strictEqual(p1.location, "b.md:3", "locations must carry the real line number");
  assert.strictEqual(p2.location, "b.md:7");

  // extractSkillRows: the pure half of the agent-data source, on fixture rows.
  const rows = extractSkillRows([{
    slug: "fx-one", objective: "ob", method: "", traits: { reasoning_style: "rs" },
    guardrails: { must: ["m0", "m1"], must_not: [] }, llm_model: "claude-fable-5-1", temperature: 0, max_tokens: 6000,
  }]);
  const locs = rows.map(r => r.location);
  assert.deepStrictEqual(locs, [
    "skill_profiles/fx-one/objective",
    "skill_profiles/fx-one/traits.reasoning_style",
    "skill_profiles/fx-one/guardrails.must[0]",
    "skill_profiles/fx-one/guardrails.must[1]",
    "skill_profiles/fx-one/llm_model",
    "skill_profiles/fx-one/temperature",
    "skill_profiles/fx-one/max_tokens",
  ], "an empty method must be skipped, array guardrails must carry their index, and the three scalars must always be stated");
  assert.strictEqual(rows.find(r => r.location.endsWith("/temperature")).text, "temperature=0",
    "the temperature statement is the text the live finding cites verbatim");
  assert.ok(rows.every(r => r.corpus === "agent-data"));
}

// --- C. the detector, with both controls -------------------------------------------------------

function statementsFrom(files) {
  return files.flatMap(([rel, text]) => extractMarkdown(rel, text));
}

function theDetectorFindsP1AndOnlyP1() {
  const aText = read(`${CORPUS_REL}/a.md`);
  const bText = read(`${CORPUS_REL}/b.md`);

  const base = detectDuplicates(statementsFrom([["a.md", aText], ["b.md", bText]]), []);
  assert.strictEqual(base.length, 1, `the fixture corpus holds exactly one duplicate; got ${base.length}`);
  const f = base[0];
  assert.strictEqual(f.kind, "duplicate");
  assert.strictEqual(f.confidence, "high");
  assert.strictEqual(f.proposed_resolution, "keep one home; render or link from the others");
  const cited = f.locations.map(l => l.location).sort();
  assert.deepStrictEqual(cited, ["a.md:3", "b.md:3"],
    "the finding must name both homes of P1 by their real locations");
  assert.ok(f.governing_fact.startsWith("The weekly audit fires"), "the governing fact is P1's own opening");
  assert.ok(f.governing_fact.length <= 200, "the governing fact is the first 200 chars, not the whole paragraph");

  const paras = bText.split("\n\n");
  // CONTROL 1 -- remove b.md's P1: the only duplicate disappears.
  const withoutP1 = paras.filter(p => !p.startsWith("The weekly audit fires")).join("\n\n");
  assert.strictEqual(detectDuplicates(statementsFrom([["a.md", aText], ["b.md", withoutP1]]), []).length, 0,
    "with b.md's P1 gone there is nothing duplicated -- if this still finds something the detector is inventing findings");

  // CONTROL 2 -- remove b.md's RETIRED IN PLACE marker instead: P2 becomes a second duplicate.
  // This is what proves P2 is excluded by the retirement rule and not by a text difference.
  const withoutMarker = paras.filter(p => !p.includes("RETIRED IN PLACE")).join("\n\n");
  const unmarked = detectDuplicates(statementsFrom([["a.md", aText], ["b.md", withoutMarker]]), []);
  assert.strictEqual(unmarked.length, 2,
    "without the marker, P2's byte-identical twin must surface -- the exclusion is the retirement rule, not the text");

  // CONTROL 3 -- the live-rule exemption: a rule quoted in its own canonical doc is not a defect.
  const exempted = detectDuplicates(statementsFrom([["a.md", aText], ["b.md", bText]]), [paras[1]]);
  assert.strictEqual(exempted.length, 0,
    "a group equal to a live governance_rules statement must be skipped as the sanctioned restatement");

  // CONTROL 4 -- one home repeating itself is not two homes disagreeing.
  const sameFile = detectDuplicates(statementsFrom([["a.md", `${aText}\n${paras[1]}\n`]]), []);
  assert.strictEqual(sameFile.length, 0,
    "the same text twice in ONE file must not be a finding -- a group needs 2+ distinct locationKeys");
}

// --- D. the report ------------------------------------------------------------------------------

const REPORT_ROWS = [
  {
    fingerprint: "ffffffffffffffff", iso_week: WEEK, kind: "contradiction", confidence: "high", status: "resolved",
    governing_fact: "how a cycle selects its work",
    locations: [{ location: "docs/runbooks/routine-prompt.md:53", text: "the queue's first admitted row is the pick" }],
    proposed_resolution: "None needed — recorded so the ledger's first week carries the closed pair.",
    ruling: "Resolved before filing: SES-355 made routine-prompt.md canonical.",
    ruled_by: "hand:review-govtooling-0910", ruled_at: "2026-09-12T04:05:06.789Z",
    found_by: "hand:review-govtooling-0910", first_seen: "2026-W36",
  },
  {
    fingerprint: "0000000000000000", iso_week: WEEK, kind: "stale-or-irrelevant", confidence: "medium", status: "open",
    governing_fact: "whether the Selfbuild has started executing",
    locations: [
      { location: "docs/SELFBUILD-CHARTER.md:262-264", text: "Awaiting John's mark." },
      { location: "docs/runbooks/standing-brief.md:233", text: "the runner is live" },
    ],
    proposed_resolution: "Replace the charter's Execution status with a dated pointer to the standing brief.",
    ruling: null, ruled_by: null, ruled_at: null,
    found_by: "hand:review-govtooling-0910", first_seen: WEEK,
  },
];

const EXPECTED_REPORT = `<!-- GENERATED by scripts/audit-ledger.js --report=2026-W37 --write (AGT-70) from public.audit_findings — do not edit -->

# Audit 2026-W37 — 2 findings (1 open · 1 resolved · 0 not a defect)

## 0000000000000000 · stale-or-irrelevant · medium · open

**Fact:** whether the Selfbuild has started executing

**Locations:**
- \`docs/SELFBUILD-CHARTER.md:262-264\` — "Awaiting John's mark."
- \`docs/runbooks/standing-brief.md:233\` — "the runner is live"

**Proposed resolution:** Replace the charter's Execution status with a dated pointer to the standing brief.

First seen: 2026-W37 · found by hand:review-govtooling-0910

## ffffffffffffffff · contradiction · high · resolved

**Fact:** how a cycle selects its work

**Locations:**
- \`docs/runbooks/routine-prompt.md:53\` — "the queue's first admitted row is the pick"

**Proposed resolution:** None needed — recorded so the ledger's first week carries the closed pair.

**Ruling:** Resolved before filing: SES-355 made routine-prompt.md canonical. (hand:review-govtooling-0910, 2026-09-12)

First seen: 2026-W36 · found by hand:review-govtooling-0910
`;

function theReportIsByteStable() {
  // Handed in resolved-first order on purpose: the sort, not the input order, must decide.
  const rendered = renderReport(WEEK, REPORT_ROWS);
  assert.strictEqual(rendered, EXPECTED_REPORT, "renderReport drifted from its pinned format");
  assert.ok(rendered.indexOf("· open") < rendered.indexOf("· resolved"),
    "open findings come first -- the report is a work list before it is a record");
  assert.ok(rendered.endsWith("\n") && !rendered.endsWith("\n\n"), "the file ends with exactly one newline");
  assert.strictEqual((rendered.match(/^## /gm) ?? []).length, 2, "one `## ` heading per finding");

  // CONTROL: a row with no ruling must not print a Ruling line at all.
  const openOnly = renderReport(WEEK, [REPORT_ROWS[1]]);
  assert.ok(!openOnly.includes("**Ruling:**"), "an unruled finding must carry no ruling line");
  assert.ok(openOnly.includes("(1 open · 0 resolved · 0 not a defect)"), "the header counts what it renders");
}

// --- E. the CLI, as a real subprocess ------------------------------------------------------------

function theCorpusCliRuns() {
  let out = "";
  try {
    out = execFileSync(process.execPath,
      [path.join(ROOT, "scripts", "audit-corpus.js"), `--corpus=${CORPUS_REL}`, "--no-db", "--detect"],
      { encoding: "utf8", cwd: ROOT });
  } catch (e) {
    throw new Error(`audit-corpus.js --no-db must exit 0 without credentials; exited ${e.status}: ${e.stdout ?? ""}${e.stderr ?? ""}`);
  }
  assert.match(out, /duplicates 1\b/, `the fixture corpus prints "duplicates 1"; got: ${out.trim()}`);
  assert.match(out, /statements 5 \(governance 5, agent-data 0, retired 2\)/,
    `the summary line must count the statements it actually extracted; got: ${out.trim()}`);
}

// --- F. live -------------------------------------------------------------------------------------

function restHeaders(key, extra = {}) {
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}

async function theLedgerIsAppendOnly() {
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!url || !key) {
    notRun("live ledger (part F)",
      "SUPABASE_URL + SUPABASE_SERVICE_KEY absent -- the append-only guard, the week's row counts and the idempotent re-ingest are unverified here. Run: node --env-file=.env.local tests/regression/agt-70-auditor.test.mjs");
    return;
  }

  // The failure message is built INSIDE the guard, never as an assert.ok() argument: an argument is
  // evaluated eagerly, so `await res.text()` would drain the body on every successful call and the
  // res.json() below would throw "Body has already been read" on the green path.
  const get = async q => {
    const res = await fetch(`${url}/rest/v1/${q}`, { headers: restHeaders(key) });
    if (!res.ok) throw new Error(`GET ${q} -> HTTP ${res.status}: ${await res.text().catch(() => "")}`);
    return res.json();
  };
  const patch = async (q, body) => {
    const res = await fetch(`${url}/rest/v1/${q}`, {
      method: "PATCH",
      headers: restHeaders(key, { "Content-Type": "application/json", Prefer: "return=representation" }),
      body: JSON.stringify(body),
    });
    return { ok: res.ok, status: res.status, body: await res.text().catch(() => "") };
  };

  const rows = await get(`audit_findings?select=*&iso_week=eq.${WEEK}`);
  const byStatus = rows.reduce((m, r) => ({ ...m, [r.status]: (m[r.status] ?? 0) + 1 }), {});
  assert.strictEqual(byStatus.open, 4, `${WEEK} must hold 4 open findings; got ${JSON.stringify(byStatus)}`);
  assert.strictEqual(byStatus.resolved, 2, `${WEEK} must hold 2 resolved findings; got ${JSON.stringify(byStatus)}`);
  assert.ok(rows.every(r => r.found_by === "hand:review-govtooling-0910"), "every first-week row names its finder");

  // Deterministic target, so a failure names the same row every time.
  const target = [...rows].sort((a, b) => a.fingerprint.localeCompare(b.fingerprint))[0];

  // (1) REFUSED: a governing_fact UPDATE. The error is not the proof on its own -- the stored value
  // is re-read afterwards, because a PATCH could fail for a dozen unrelated reasons.
  const refused = await patch(`audit_findings?id=eq.${target.id}`, { governing_fact: "x" });
  assert.ok(!refused.ok, "the guard must refuse an UPDATE outside the ruling band; the PATCH succeeded");
  assert.match(refused.body, /append-only/,
    `the refusal must come from audit_findings_guard, not from something else; got: ${refused.body}`);
  const [afterRefusal] = await get(`audit_findings?select=governing_fact&id=eq.${target.id}`);
  assert.strictEqual(afterRefusal.governing_fact, target.governing_fact,
    "the refused UPDATE must have changed nothing -- a refusal that still wrote is the worst outcome");

  // (2) ALLOWED: the ruling band. §19v -- the before-image goes first and is cleaned up after.
  const marker = `agt-70 regression probe ${new Date().toISOString()}`;
  const imageRes = await fetch(`${url}/rest/v1/runner_before_images`, {
    method: "POST",
    headers: restHeaders(key, { "Content-Type": "application/json", Prefer: "return=representation" }),
    body: JSON.stringify({ table_name: "audit_findings", pk_value: target.id, row_data: target, session_name: SESSION_TAG }),
  });
  assert.ok(imageRes.ok, `the before-image must land before the QA write (§19v); HTTP ${imageRes.status}`);

  try {
    const allowed = await patch(`audit_findings?id=eq.${target.id}`, { ruling: marker });
    assert.ok(allowed.ok, `a ruling-columns-only UPDATE must succeed; HTTP ${allowed.status}: ${allowed.body}`);
    const [ruled] = await get(`audit_findings?select=ruling&id=eq.${target.id}`);
    assert.strictEqual(ruled.ruling, marker, "the ruling band really is writable -- otherwise John could never rule");
  } finally {
    const restore = await patch(`audit_findings?id=eq.${target.id}`, { ruling: target.ruling });
    assert.ok(restore.ok, `the probe must restore the original ruling; HTTP ${restore.status}: ${restore.body}`);
    await fetch(`${url}/rest/v1/runner_before_images?session_name=eq.${encodeURIComponent(SESSION_TAG)}`,
      { method: "DELETE", headers: restHeaders(key) }).catch(() => {});
  }
  const [restored] = await get(`audit_findings?select=ruling&id=eq.${target.id}`);
  assert.strictEqual(restored.ruling, target.ruling, "the row must be exactly as the probe found it");

  // (3) The re-ingest is idempotent: the same file, the same week, nothing new.
  let out = "";
  try {
    out = execFileSync(process.execPath,
      [path.join(ROOT, "scripts", "audit-ledger.js"), `--ingest=${FINDINGS_REL}`, `--week=${WEEK}`,
       "--found-by=hand:review-govtooling-0910"],
      { encoding: "utf8", cwd: ROOT });
  } catch (e) {
    throw new Error(`a dry-run re-ingest of an already-filed week must exit 0; exited ${e.status}: ${e.stdout ?? ""}${e.stderr ?? ""}`);
  }
  assert.match(out, /0 new, 6 seen/,
    `the fingerprint must recognise all six findings as already filed; got: ${out.trim()}`);
}

// --- G. the clusterer ------------------------------------------------------------------------

// Five inline statements, not a fixture file: the clusterer's inputs are the statement TABLE's
// shape, and writing them here keeps the anchor set under the test's own control -- a stray
// backticked identifier in a fixture doc would mint a second anchor and the "exactly one cluster"
// assertion would then be measuring the fixture, not the function.
const S1 = { id: "s1", corpus: "governance", source: "runner_settings", location: "runner_settings/1/interval_hours", text: "interval_hours=1", retired: false };
const S2 = { id: "s2", corpus: "governance", source: "file", location: "x.md:10", text: "A scheduled fire runs when the hour divides by `interval_hours` on the wall clock, never on elapsed time.", retired: false };
const S3 = { id: "s3", corpus: "governance", source: "file", location: "y.md:4", text: "The standing value of `interval_hours` is stated here as three, which is the grid John reads every day.", retired: false };
const S4 = { id: "s4", corpus: "governance", source: "file", location: "x.md:20", text: "The gate is closed whenever `scheduler_on` is false, and nothing else in this paragraph is shared.", retired: false };
const LONG_TAIL = "the same sentence of padding repeated to carry this statement past the twelve hundred character cut. ";
const S5 = { id: "s5", corpus: "governance", source: "file", location: "z.md:1", text: `A third home also names \`interval_hours\` and then runs long: ${LONG_TAIL.repeat(15)}`, retired: false };

function theClustererFindsOneAnchorAndCutsTheLongOne() {
  assert.ok(S5.text.length > 1400, `S5 must exceed the 1,200-char cap to prove the cut; it is ${S5.text.length}`);

  const clusters = buildClusters([S1, S2, S3, S4, S5]);
  assert.strictEqual(clusters.length, 1,
    `exactly one anchor spans 2+ homes here; got ${clusters.map(c => c.name).join(", ") || "none"}`);
  const c = clusters[0];
  assert.strictEqual(c.name, "interval_hours", "the anchor is the snake_case setting the four statements share");
  assert.strictEqual(c.kind, "anchor");
  assert.strictEqual(c.statements.length, 4,
    "S4 mentions only scheduler_on and must stay out -- a cluster is the statements that share the anchor, not the file");
  assert.strictEqual(c.spread, 2,
    "spread counts distinct SOURCES (runner_settings + file) -- it is what orders the run, so a wrong value spends the budget on the wrong clusters");
  assert.strictEqual(c.homes, 4, "four distinct locationKeys carry the anchor");

  const e5 = c.statements.find(s => s.id === "s5");
  assert.strictEqual(e5.text.length, 1200, "the emitted text is cut to exactly the 1,200-char cap");
  assert.strictEqual(e5.truncated, true, "a cut statement must SAY it was cut -- validateFindings reads the full text by id, and a silent cut would look like an invented quotation");
  const e2 = c.statements.find(s => s.id === "s2");
  assert.strictEqual(e2.truncated, false, "a statement under the cap must not be flagged truncated");
  assert.strictEqual(e2.text, S2.text, "an uncut statement is emitted byte-for-byte");

  // CONTROL 1 -- one home. The harvest names S1 and S3; S5's own z.md home has to collapse too or
  // two homes still stand, so all three move into x.md and the reason under test is unambiguous.
  const oneHome = buildClusters([
    { ...S2 },
    { ...S3, location: "x.md:30" },
    { ...S4 },
    { ...S5, location: "x.md:40" },
  ]);
  assert.strictEqual(oneHome.length, 0,
    "with every carrier of the anchor in ONE file there is no disagreement to find -- if this still clusters, the homes.size >= 2 gate is gone");

  // CONTROL 2 -- a second anchor over the identical statement set must MERGE, not double the bill.
  const withGrid = [S1, S2, S3, S5].map(s => ({ ...s, text: `${s.text} \`grid_minutes\`` })).concat([S4]);
  const merged = buildClusters(withGrid);
  assert.strictEqual(merged.length, 1,
    `two anchors over the same four statements are one cluster (Jaccard 1.0 >= 0.6); got ${merged.map(m => m.name).join(", ")}`);
  assert.strictEqual(merged[0].name, "grid_minutes",
    "the survivor is the first in the sort order (equal spread and homes, then name ascending) -- which is what makes the merge deterministic");

  // Routing, on the same material: all-agent-data goes to the agent-data capability, anything else
  // to the corpus one.
  assert.deepStrictEqual(capabilityFor(c), { capability: "audit-governance-corpus", intent: "au-corpus-intent" });
  assert.deepStrictEqual(capabilityFor({ statements: [{ corpus: "agent-data" }, { corpus: "agent-data" }] }),
    { capability: "audit-agent-data", intent: "au-agent-data-intent" });
  assert.deepStrictEqual(capabilityFor({ statements: [{ corpus: "agent-data" }, { corpus: "governance" }] }),
    { capability: "audit-governance-corpus", intent: "au-corpus-intent" },
    "a MIXED cluster takes the corpus capability -- its knowledge section covers both homes, the agent-data one does not");
}

// --- H. locate / validate / reconcile ----------------------------------------------------------

const LEDGER_LOC = {
  location: "c.md:262-264",
  text: "## Execution status — **Awaiting the mark.** On go: step 0 runs first and must verify restorable;",
};
const MOVED_STATEMENT = {
  id: "m1", corpus: "governance", source: "file", location: "c.md:264",
  text: "**Awaiting the mark.** On go: step 0 runs first and must verify restorable; nothing else fires until it does.",
  retired: false,
};
const OTHER_STATEMENT = {
  id: "m2", corpus: "governance", source: "file", location: "c.md:264",
  text: "The charter's execution section says something else entirely about who holds the mark and when it is given.",
  retired: false,
};

function theLocatorTheValidatorAndTheReconcilerHoldTheirLines() {
  // LOCATE -- the ledger's quote carries a heading the statement does not, and the line number
  // moved. A whole-string match would miss it; the 40/20 windows do not.
  const hit = locateStatements([MOVED_STATEMENT, OTHER_STATEMENT], LEDGER_LOC);
  assert.strictEqual(hit.length, 1, `the quote must locate exactly its own statement; got ${hit.map(h => h.id).join(", ") || "none"}`);
  assert.strictEqual(hit[0].id, "m1");
  assert.strictEqual(locateStatements([OTHER_STATEMENT], LEDGER_LOC).length, 0,
    "different prose in the same file must NOT locate -- otherwise every prior cluster is built from whatever happens to live at that path");

  // PRIOR CLUSTERS -- runnable and unrunnable, side by side.
  const rows = [
    { fingerprint: "aaaaaaaaaaaaaaaa", status: "open", locations: [LEDGER_LOC, { location: "d.md:5", text: MOVED_STATEMENT.text }] },
    { fingerprint: "bbbbbbbbbbbbbbbb", status: "open", locations: [LEDGER_LOC, { location: "api/only.js:1", text: "a side of this finding the corpus does not hold at all" }] },
  ];
  const dStatement = { ...MOVED_STATEMENT, id: "m3", location: "d.md:5" };
  const prior = priorClusters(rows, [MOVED_STATEMENT, OTHER_STATEMENT, dStatement]);
  assert.strictEqual(prior.clusters.length, 1, "only the row whose two sides both resolve is runnable");
  assert.strictEqual(prior.clusters[0].name, "prior-aaaaaaaaaaaaaaaa");
  assert.strictEqual(prior.clusters[0].kind, "prior");
  assert.deepStrictEqual(prior.clusters[0].statements.map(s => s.id).sort(), ["m1", "m3"]);
  assert.deepStrictEqual(prior.unrunnable, [{ fingerprint: "bbbbbbbbbbbbbbbb", located: 1, total: 2 }],
    "a row the corpus can only half-see is REPORTED, never quietly dropped -- it is a fact about the extractor");

  // VALIDATE -- three findings, one legitimate. The cluster's copy of s5 is CUT; the verbatim span
  // is taken from past the cut, so keeping it proves the validator reads the full text by id.
  const cluster = buildClusters([S1, S2, S3, S4, S5])[0];
  const byId = new Map([S1, S2, S3, S4, S5].map(s => [s.id, s]));
  const verbatim = S2.text.slice(12, 70);
  const result = {
    cluster: cluster.name,
    findings: [
      { kind: "contradiction", confidence: "high", governing_fact: "an invented home", proposed_resolution: "none",
        locations: [{ location: "q.md:1", text: "a location no statement in the cluster has" }] },
      { kind: "contradiction", confidence: "high", governing_fact: "a paraphrase", proposed_resolution: "none",
        locations: [{ location: "x.md:10", text: "the fire happens when the hour divides evenly" }] },
      { kind: "contradiction", confidence: "medium", governing_fact: "the standing interval", proposed_resolution: "one home wins",
        locations: [{ location: "x.md:10", text: verbatim }] },
    ],
  };
  const v = validateFindings(result, cluster, byId);
  assert.strictEqual(v.kept.length, 1, `only the verbatim finding survives; kept ${v.kept.map(k => k.governing_fact).join(", ")}`);
  assert.strictEqual(v.kept[0].governing_fact, "the standing interval");
  assert.strictEqual(v.dropped.length, 2, "the invented location and the paraphrase are BOTH dropped");
  assert.match(v.dropped[0].reason, /q\.md:1/, "a dropped finding must say which location failed");

  // The load-bearing half of the validator: a quote that lives only PAST the 1,200-char cut is
  // still verbatim, and must be kept.
  const pastTheCut = S5.text.slice(1300, 1380);
  const deep = validateFindings({
    findings: [{ kind: "duplicate", confidence: "low", governing_fact: "padding repeats", proposed_resolution: "trim",
      locations: [{ location: "z.md:1", text: pastTheCut }] }],
  }, cluster, byId);
  assert.strictEqual(deep.kept.length, 1,
    "a quotation from past the cluster's 1,200-char cut must validate against the FULL statement -- otherwise the cut invents false paraphrases");
  assert.strictEqual(validateFindings({ findings: "not an array" }, cluster, byId).kept.length, 0);

  // RECONCILE -- two shared homes is the same dispute, one is not. The row's fingerprint is
  // COMPUTED by the ledger's own function rather than written as a literal, so the `exact` band
  // below is testing fingerprint agreement and not a string somebody typed twice.
  const ledgerRow = {
    status: "open", kind: "contradiction", governing_fact: "the standing interval",
    locations: [{ location: "x.md:10", text: "" }, { location: "y.md:4", text: "" }],
  };
  ledgerRow.fingerprint = fingerprint(ledgerRow);
  const ledgerRows = [ledgerRow];
  const twoKeys = { kind: "contradiction", governing_fact: "worded another way entirely",
    locations: [{ location: "x.md:99", text: "" }, { location: "y.md:2", text: "" }] };
  const r1 = reconcile([twoKeys], ledgerRows);
  assert.strictEqual(r1.verdicts[0].verdict, "re-found");
  assert.strictEqual(r1.verdicts[0].match, ledgerRow.fingerprint,
    "the match names the fingerprint, and the LINE NUMBERS differ on purpose -- reconciliation is by home, not by line");
  assert.strictEqual(r1.summary.exact, 0, "a differently worded fact is re-found but NOT byte-equal");

  const ruledOut = reconcile([twoKeys], [{ ...ledgerRow, status: "not-a-defect" }]);
  assert.strictEqual(ruledOut.verdicts[0].verdict, "ruled-out",
    "John's not-a-defect ruling must survive the model re-finding it -- refiling a ruled row is the one thing the ledger cannot undo");
  assert.strictEqual(ruledOut.summary.ruledOut, 1);

  const oneKey = { kind: "contradiction", governing_fact: "something else",
    locations: [{ location: "x.md:10", text: "" }, { location: "z.md:1", text: "" }] };
  assert.strictEqual(reconcile([oneKey], ledgerRows).verdicts[0].verdict, "new",
    "ONE shared home is not the same dispute -- at one key almost anything citing a busy doc would read as re-found");

  // The exact count: byte-equal kind + homes + governing fact is a fingerprint collision, which is
  // the only case where the ledger itself would refuse the row.
  const exact = { kind: "contradiction", governing_fact: "the standing interval",
    locations: [{ location: "x.md:10", text: "" }, { location: "y.md:4", text: "" }] };
  const r2 = reconcile([exact], ledgerRows);
  assert.strictEqual(r2.summary.exact, 1, "a byte-equal governing fact over the same homes must fingerprint identically");
  assert.strictEqual(fingerprint(exact), ledgerRow.fingerprint,
    "and the fingerprint really is the ledger's own function, not a second copy of it");
  assert.strictEqual(r2.verdicts[0].verdict, "re-found", "an exact match is still a re-found finding, never a new one");
}

// --- I. the cluster CLI, as real subprocesses ---------------------------------------------------

function runClusterCli(args) {
  return execFileSync(process.execPath, [path.join(ROOT, "scripts", "audit-cluster.js"), ...args],
    { encoding: "utf8", cwd: ROOT });
}

function theClusterCliRuns() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agt-70-"));
  try {
    const statementsFile = path.join(tmp, "statements.json");
    fs.writeFileSync(statementsFile, JSON.stringify([S1, S2, S3, S4, S5]), "utf8");
    const dir = path.join(tmp, "c");

    let out = "";
    try {
      out = runClusterCli(["--build", `--statements=${statementsFile}`, "--week=2026-W37", `--out-dir=${dir}`, "--no-db", "--max-clusters=3"]);
    } catch (e) {
      throw new Error(`--build --no-db must exit 0 without credentials; exited ${e.status}: ${e.stdout ?? ""}${e.stderr ?? ""}`);
    }
    assert.match(out, /build 2026-W37: 1 clusters \(0 prior, 1 anchor\), 0 prior unrunnable/,
      `the build line must count what it wrote; got: ${out.trim()}`);
    const taskFile = path.join(dir, "01-interval_hours.task.json");
    assert.ok(fs.existsSync(taskFile), `--build must write 01-interval_hours.task.json; got ${fs.readdirSync(dir).join(", ")}`);
    const task = JSON.parse(fs.readFileSync(taskFile, "utf8"));
    assert.strictEqual(task.capability, "audit-governance-corpus");
    assert.strictEqual(task.intent, "au-corpus-intent");
    assert.strictEqual(task.cluster_kind, "anchor");
    assert.strictEqual(task.task_context.cluster, "interval_hours");
    assert.deepStrictEqual(Object.keys(task.task_context.statements[0]).sort(),
      ["id", "location", "retired", "source", "text", "truncated"],
      "the task file's statement shape is the design's six fields -- the model is handed evidence, not the corpus's own bookkeeping");
    assert.deepStrictEqual(task.task_context.prior, [], "--no-db reads no ledger, so there are no prior fingerprints to declare");

    // A result the run would have written: one verbatim finding and one citing a location the
    // cluster does not hold. --collect must keep the first and drop the second.
    fs.writeFileSync(path.join(dir, "01-interval_hours.result.json"), JSON.stringify({
      cluster: "interval_hours",
      findings: [
        { kind: "contradiction", confidence: "high",
          governing_fact: "the standing value of interval_hours",
          proposed_resolution: "runner_settings/1/interval_hours wins; the docs cite it",
          locations: [
            { location: "runner_settings/1/interval_hours", text: "interval_hours=1" },
            { location: "x.md:10", text: S2.text.slice(12, 70) },
          ] },
        { kind: "contradiction", confidence: "low", governing_fact: "an invented home",
          proposed_resolution: "none",
          locations: [{ location: "nowhere.md:1", text: "no cluster statement lives here" }] },
      ],
      account: "x",
      run: { model: "test-model", prompt_source: "exception:seed-file", input_tokens: 1, output_tokens: 1, duration_api_ms: 1 },
    }, null, 2), "utf8");

    const candFile = path.join(tmp, "cand.json");
    let collected = "";
    try {
      collected = runClusterCli(["--collect", `--dir=${dir}`, `--statements=${statementsFile}`, "--week=2026-W37", `--out=${candFile}`, "--no-db"]);
    } catch (e) {
      throw new Error(`--collect --no-db must exit 0; exited ${e.status}: ${e.stdout ?? ""}${e.stderr ?? ""}`);
    }
    assert.match(collected, /1 clusters, 2 returned, 1 dropped, 0 re-found \[\], 0 exact, 0 ruled-out, 1 new/,
      `the collect line must count every band; got: ${collected.trim()}`);
    const cand = JSON.parse(fs.readFileSync(candFile, "utf8"));
    assert.strictEqual(cand.findings.length, 1, "only the verbatim finding reaches the candidates file");
    assert.strictEqual(cand.found_by, "auditor:judgment:test-model",
      "found_by names the model that actually answered, read off the result rather than assumed");
    assert.strictEqual(cand.week, "2026-W37");
    assert.match(cand.note, /NOT ingested/,
      "the candidates file must say on its face that nothing was filed -- it is the one thing standing between a model run and an append-only ledger");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// --- C+. the two detector exemptions, both directions -------------------------------------------

const FENCED_BODY = "UPDATE public.backlog_items SET claimed_by = 'x', claimed_at = now() WHERE backlog_id = 'T-1' AND status <> 'done' RETURNING backlog_id;";
const RULE_TEXT = "Claim a backlog ticket atomically via claimed_by/claimed_at columns at pick time (any session, manual or scheduled); a claim expires after 24h so a dead session cannot strand a ticket.";

function theDetectorExemptsFencesAndRuleRenders() {
  assert.ok(normalize(FENCED_BODY).length >= 120 && normalize(RULE_TEXT).length >= 120,
    "both fixtures must clear the 120-char duplicate floor, or these controls prove nothing");

  const fenced = `# One\n\n\`\`\`sql\n${FENCED_BODY}\n\`\`\`\n`;
  const fencedFindings = detectDuplicates(statementsFrom([["p.md", fenced], ["q.md", fenced]]), []);
  assert.strictEqual(fencedFindings.length, 0,
    "an identical fenced procedure in two docs is check-session-docs.js check 13's finding, not this detector's -- two tools filing one defect into an append-only ledger is a permanent double row");

  const unfenced = `# One\n\n${FENCED_BODY}\n`;
  const unfencedFindings = detectDuplicates(statementsFrom([["p.md", unfenced], ["q.md", unfenced]]), []);
  assert.strictEqual(unfencedFindings.length, 1,
    "the SAME text unfenced must still be a finding -- this is what proves the exemption is the fence and not a text difference");

  const rendered = `# Two\n\n> **Rule B40** — ${RULE_TEXT}\n`;
  const exempt = detectDuplicates(statementsFrom([["p.md", rendered], ["q.md", rendered]]), [RULE_TEXT]);
  assert.strictEqual(exempt.length, 0,
    "a live rule RENDERED with its own `> **Rule X** —` prefix is the sanctioned restatement; slice 1's exact-equality test could never see it, because the prefix makes the rule a suffix of the statement");

  const notExempt = detectDuplicates(statementsFrom([["p.md", rendered], ["q.md", rendered]]), []);
  assert.strictEqual(notExempt.length, 1,
    "with no live rule behind it the same rendered block IS a duplicate -- the exemption is the rule, not the prefix");

  // And the suffix relation is a real one: an empty rule text must exempt nothing.
  assert.strictEqual(detectDuplicates(statementsFrom([["p.md", rendered], ["q.md", rendered]]), [""]).length, 1,
    "an empty rule statement must not exempt the corpus -- ''.endsWith() is true of every string");
}

// --- E+. the file list, and WHOSE Set excludes from it -------------------------------------------

function theCorpusDropsGeneratedDocsByTheRealSet() {
  const files = corpusFiles();
  assert.ok(files.includes("docs/runbooks/runner-cycle.md"),
    "the SOURCE runbook must stay in the corpus -- it is the largest single home of live procedure");
  assert.ok(!files.includes("docs/runbooks/cycle-card.md"),
    "the GENERATED view must not be extracted; it is held byte-identical to its source by a regression test and cannot drift, so every passage it shares is not a second home");
  assert.ok(PROCEDURE_GENERATED_DOCS.has("docs/runbooks/cycle-card.md"),
    "the exclusion must come from check-session-docs.js's own PROCEDURE_GENERATED_DOCS -- a literal filename in audit-corpus.js would pass this test while the real Set had moved on");
  for (const rel of PROCEDURE_GENERATED_DOCS) {
    assert.ok(!files.includes(rel), `${rel} is in PROCEDURE_GENERATED_DOCS and must be out of the corpus`);
  }
}

// --- J. ledger filing (pure) ---------------------------------------------------------------------

// Fingerprints are 16 hex because the ledger's are, and they are LITERAL rather than computed: this
// part is about the gates and the cap, and a computed fingerprint would couple these assertions to
// part A's hashing rule so a change there would redden both for one reason.
const LOC = n => Array.from({ length: n }, (_, i) => ({ location: `docs/x${i}.md:${i + 1}`, text: `passage ${i}` }));
const FP = {
  a: "aaaaaaaaaaaaaaaa", b: "bbbbbbbbbbbbbbbb", c: "cccccccccccccccc",
  d: "dddddddddddddddd", e: "eeeeeeeeeeeeeeee",
};
const ledgerRow = (fp, over = {}) => ({
  id: `id-${fp}`,
  fingerprint: fp,
  iso_week: "2026-W37",
  kind: "contradiction",
  locations: LOC(2),
  governing_fact: "the runner's scheduling interval in hours -- a second clause the title must cut",
  confidence: "high",
  proposed_resolution: "state the interval once, in runner_settings, and cite it everywhere else",
  status: "open",
  ruling: "real, and still open",
  ruled_by: "john",
  ruled_at: "2026-09-13T00:00:00.000Z",
  ...over,
});

const R1 = ledgerRow(FP.a);
const R2 = ledgerRow(FP.b, { ruled_by: null, ruled_at: null });
const R3 = ledgerRow(FP.c, { confidence: "medium" });
const R4 = ledgerRow(FP.d, { status: "not-a-defect" });
const R5 = ledgerRow(FP.e, { locations: LOC(8) });
// The SAME finding, ruled again later. The ledger's identity is the fingerprint, so this is one row.
const R1_PRIME = ledgerRow(FP.a, { ruled_at: "2026-09-20T00:00:00.000Z", ruling: "re-ruled later" });

function theLedgerFilesOnlyRuledOpenHighRowsUnderTheCap() {
  const eligible = ledgerEligible([R1, R2, R3, R4, R5, R1_PRIME]);
  assert.deepStrictEqual(eligible, [R1, R5],
    "only the ruled, open, high rows are eligible, one per fingerprint, earliest ruling kept -- " +
    "R2 is unruled (the Auditor must never file its own finding), R3 is medium, R4 is not-a-defect, " +
    "and R1' is R1 found again");

  // Each gate on its own, so a pass here cannot come from the wrong one doing the work.
  assert.deepStrictEqual(ledgerEligible([{ ...R1, ruled_by: null }]), [],
    "control: an UNRULED open/high row must not be eligible -- that gate is the whole ledger");
  assert.deepStrictEqual(ledgerEligible([{ ...R1, confidence: "medium" }]), [],
    "control: a medium-confidence ruled open row must not be eligible");

  // Already filed, with room in the cap: the filed row is set aside, the other files.
  const withFiled = ledgerDetect(eligible, [`... ${R5.fingerprint} ...`], { filedThisWeek: 0, weeklyCap: 3 });
  assert.deepStrictEqual(withFiled.detections, [R1], "a fingerprint already in a description must not re-file");
  assert.deepStrictEqual(withFiled.alreadyFiled, [R5], "the filed row must be reported as filed, not dropped silently");
  assert.strictEqual(withFiled.capLeft, 3, "nothing filed this week leaves the whole cap");

  // The cap shut. Nothing files even though R1 is eligible and undeduped.
  const capped = ledgerDetect(eligible, [], { filedThisWeek: 3, weeklyCap: 3 });
  assert.deepStrictEqual(capped.detections, [], "at the weekly cap nothing files, however eligible it is");
  assert.strictEqual(capped.capLeft, 0, "capLeft must be 0, not negative");

  // The cap half-open: two eligible rows, one slot, and the ORDER decides which -- oldest ruling.
  const partial = ledgerDetect(eligible, [], { filedThisWeek: 2, weeklyCap: 3 });
  assert.deepStrictEqual(partial.detections, [R1], "one slot left must file exactly one, the earliest-ruled");
  assert.strictEqual(partial.capLeft, 1, "3 - 2 = 1 slot left this week");

  assert.strictEqual(LEDGER_WEEKLY_CAP, 3, "the standing weekly cap is 3 (runbook step 4d states the same number)");

  // The draft. The fingerprint in the description is what makes the dedup above work at all.
  const now = new Date("2026-09-14T10:00:00.000Z");
  const draft = buildLedgerTicketDraft(R1, "SES-999", { now });
  assert.strictEqual(draft.source_file, LEDGER_SOURCE_FILE, "the ledger's rows carry source_file audit-ledger");
  assert.strictEqual(draft.source_file, "audit-ledger", "and that constant is the literal the REST dedup query filters on");
  assert.strictEqual(draft.tier, "next", "doc/tooling drift is `next`, never `now` -- it must not jump John's named drain");
  assert.strictEqual(draft.row_ordinal, 999, "row_ordinal is the numeric half of the claimed id");
  assert.strictEqual(draft.size_stamp, "S", "two locations is a one-shape fix");
  assert.strictEqual(draft.gate_count, 0, "a ledger fix crosses no external gate");
  assert.strictEqual(buildLedgerTicketDraft(R5, "SES-1000", { now }).size_stamp, "M",
    "eight locations to reconcile is NOT a one-shape one-cycle fix -- the stamp must move with the member count");
  assert.ok(draft.title.startsWith("[Auditor] contradiction:"),
    `the title names the Auditor and the kind; got: ${draft.title}`);
  assert.ok(draft.description.includes(R1.fingerprint),
    "the fingerprint MUST be in the description -- it is the dedup key, and without it every run re-files");
  assert.ok(draft.description.includes(R1.ruling), "John's ruling is why the row is on the board; it must be quoted");
  for (const l of R1.locations) {
    assert.ok(draft.description.includes(l.location),
      `the description must carry every location verbatim at filing; missing ${l.location}`);
  }
  assert.ok(draft.description.includes(`--report=${R1.iso_week}`),
    "the Reproduce line must point at the week's own report");

  // The calendar the cap counts against.
  assert.strictEqual(isoWeek(new Date("2026-09-12T22:12:00Z")), "2026-W37", "the live week at this ship");
  assert.strictEqual(isoWeek(new Date("2027-01-01T12:00:00Z")), "2026-W53",
    "ISO-8601: the week belongs to its THURSDAY, so 1 Jan 2027 is 2026-W53 -- the case a dayOfYear/7 gets wrong");
  assert.strictEqual(isoWeek(new Date("2026-01-01T12:00:00Z")), "2026-W01", "and the other side of the same rule");
  assert.strictEqual(isoWeekStart(new Date("2026-09-12T22:12:00Z")), "2026-09-07T00:00:00.000Z",
    "the cap counts from Monday 00:00Z, never a rolling 7 days");
}

// --- K. the brief group (pure + doc) -------------------------------------------------------------

// The six live fingerprints' SHAPE: four open with nobody's ruling on them, two resolved, nothing
// filed. This is the state the ledger is actually in at this ship, so a drift in the renderer shows
// up here as the wrong sentence about the real board.
const AUDIT = (over = {}) => ({
  rows: [
    { fingerprint: "4637961d21e1076a", iso_week: "2026-W37", kind: "contradiction", confidence: "high", status: "open", governing_fact: "the order of the board's ranking keys", ruled_by: null },
    { fingerprint: "4ef228c361f9a904", iso_week: "2026-W37", kind: "stale-or-irrelevant", confidence: "high", status: "open", governing_fact: "temperature stored for a model whose API rejects temperature", ruled_by: null },
    { fingerprint: "b057c6f102845074", iso_week: "2026-W37", kind: "stale-or-irrelevant", confidence: "high", status: "open", governing_fact: "whether the Selfbuild has started executing", ruled_by: null },
    { fingerprint: "e141f20a37d1fbe9", iso_week: "2026-W37", kind: "contradiction", confidence: "high", status: "open", governing_fact: "the runner's scheduling interval in hours", ruled_by: null },
    { fingerprint: "b62c4ab018d78468", iso_week: "2026-W37", kind: "contradiction", confidence: "high", status: "resolved", governing_fact: "already answered", ruled_by: "hand:review-govtooling-0910" },
    { fingerprint: "22925b8015372812", iso_week: "2026-W37", kind: "contradiction", confidence: "high", status: "resolved", governing_fact: "also answered", ruled_by: "hand:review-govtooling-0910" },
  ],
  filed: 0,
  ...over,
});

const ruledOne = () => {
  const a = AUDIT();
  a.rows = a.rows.map(r => (r.fingerprint === "4637961d21e1076a" ? { ...r, ruled_by: "john" } : r));
  return a;
};

// A minimal facts object: one board row and every other group absent, so factsSha's movement can
// only have come from the `audit` key.
const F = over => ({ items: [{ id: 1, status: "open", design_status: null, queue: 1 }], ...over });

function theBriefGroupCountsWithoutInventingZeros() {
  const out = renderAuditLedger(AUDIT(), "as of X");
  assert.ok(out.startsWith("**Auditor's ledger** — *as of X.*"), `the group leads with its own name and the stamp; got: ${out.slice(0, 80)}`);
  assert.ok(out.includes("**6 findings (4 open · 2 resolved · 0 not a defect)**"), `the week's census; got: ${out}`);
  assert.ok(out.includes("**0 ruled**"), "nobody has ruled an open finding yet, and the brief must say so as a MEASURED zero");
  assert.ok(out.includes("**0 filed**"), "nothing has left the ledger for the board yet");
  assert.ok(!out.includes("%"), "counts only, never a rate -- the same rule the governance group keeps");

  const tableRows = out.split("\n").filter(l => l.startsWith("| `"));
  assert.strictEqual(tableRows.length, 4,
    `the table is the latest week's OPEN rows only -- 4 of the 6; got ${tableRows.length}`);

  assert.strictEqual(renderAuditLedger(AUDIT(), "as of X"), out,
    "the renderer is pure and byte-stable: a second call over the same facts must not reshuffle a generated doc");

  const ruled = renderAuditLedger(ruledOne(), "as of X");
  assert.ok(ruled.includes("**1 ruled**"), "one ruled open finding is one row --from-ledger will file next cycle");
  const johnRow = ruled.split("\n").find(l => l.startsWith("| `4637961d21e1076a`"));
  assert.ok(johnRow && johnRow.endsWith("| john |"), `the ruled row must name its ruler; got: ${johnRow}`);

  // THE BRANCH THAT MATTERS. "I could not read the ledger" and "the ledger found nothing" are the
  // same bytes to a reader and opposite facts.
  const absent = renderAuditLedger(undefined, "as of X");
  assert.ok(absent.includes("was not read for this render"), "an absent read must SAY so");
  assert.ok(!absent.includes("0 findings"),
    "a read that did not happen must never render as a measured zero -- this group is the one John would read as 'the audit found nothing wrong'");

  // The sha moves on a ruling and on a filing, and on nothing else here.
  assert.strictEqual(factsSha(F({ audit: AUDIT() })), factsSha(F({ audit: AUDIT() })), "the sha is stable over identical facts");
  assert.notStrictEqual(factsSha(F({ audit: AUDIT() })), factsSha(F({ audit: ruledOne() })),
    "John ruling a finding must move the payload sha -- it is what --check exists to report");
  assert.notStrictEqual(factsSha(F({ audit: AUDIT() })), factsSha(F({ audit: AUDIT({ filed: 1 }) })),
    "a row leaving the ledger for the board must move the payload sha");

  // And the group really is in the generated doc, in its place.
  const brief = read("docs/runbooks/standing-brief.md");
  const begin = brief.indexOf(BEGIN);
  const end = brief.indexOf(END);
  const group = brief.indexOf("**Auditor's ledger**");
  assert.ok(begin >= 0 && end > begin, "standing-brief.md must carry both generated markers");
  assert.ok(group > begin && group < end,
    "the group must be INSIDE the generated markers -- outside them it is hand-maintained prose the script never refreshes");
  const gov = brief.indexOf("**Governance agents, last 7 days**");
  const prov = brief.indexOf("*Provenance:");
  assert.ok(gov > begin && gov < group, "the ledger group sits after Governance agents");
  assert.ok(group < prov, "and before the provenance line, like every other fact group");
}

// --- L. step 4d and the card (source, always runs) -----------------------------------------------

function stepFourDIsInTheRunbookAndOnTheCard() {
  const md = read("docs/runbooks/runner-cycle.md");
  const labels = parseSteps(md).map(s => s.label);
  const i = labels.indexOf("4d");
  assert.ok(i > 0, "docs/runbooks/runner-cycle.md must carry a step 4d");
  assert.strictEqual(labels[i - 1], "4c", "4d runs after the board re-rank");
  // AGT-79 slice 3 put step 4e (ticket hygiene) between 4d and selection, so the property is
  // "4d runs BEFORE the pick", not "4d is immediately followed by the pick" -- an audit that fires
  // after the pick is a different step, and that is still what this pins.
  assert.strictEqual(labels[i + 1], "4e", "4d is followed by the ticket-hygiene pass (AGT-79 slice 3)");
  assert.ok(labels.indexOf("5") > i, "and BEFORE selection -- an audit that fires after the pick is a different step");
  // The count is the measured one, pinned so an accidental new or lost step marker is a red here
  // rather than a silent card line. NOTES and the runbook must agree or render() refuses (control).
  assert.strictEqual(labels.length, 27, `the runbook parses to 27 steps; got ${labels.length}`);
  assert.strictEqual(labels.length, Object.keys(NOTES).length,
    "every step has a NOTES entry and NOTES names no step the runbook lacks -- render() refuses otherwise");

  assert.ok(NOTES["4d"], "scripts/render-cycle-card.js must carry a NOTES entry for 4d");
  assert.ok(NOTES["4d"].outcome.length <= 90,
    `the card's outcome cap is 90 chars; 4d's is ${NOTES["4d"].outcome.length}`);

  const from = md.indexOf("**4d. ");
  // Bounded at 4e, not at 5: since AGT-79 slice 3 the hygiene step sits between them, and a body
  // that ran on to selection would let 4d's greps pass on another step's text.
  const to = md.indexOf("**4e. ", from);
  assert.ok(from > 0 && to > from, "could not isolate the 4d body");
  const body = md.slice(from, to);

  assert.ok(body.includes("tripwire-to-backlog.js --from-ledger"),
    "step 4d must run the ledger sweep -- without it the weekly audit files nothing and the ledger is a dead end");
  assert.ok(body.includes("audit-ledger.js --ingest="),
    "step 4d must run the ingest, which is what turns candidates into a record John can rule");
  // THE RULE AS A GREP: a cycle never ingests. --apply on the ingest line would make the Auditor
  // file its own findings, which is the one thing the ledger exists to prevent.
  for (const line of body.split("\n")) {
    assert.ok(!(line.includes("--ingest=") && line.includes("--apply")),
      `step 4d must never pair --ingest= with --apply -- only John's hand ingests. Offending line: ${line}`);
  }
  assert.ok(body.includes("date_trunc('week'"),
    "the precondition is an ISO-WEEK window over the run's own log rows, not a day and not a notes prefix");

  const stamps = md.split("\n").filter(l => l.startsWith("<!-- DeepBench v"));
  assert.strictEqual(stamps.length, 5, `session-hygiene check 7 caps the runbook at 5 header stamps; got ${stamps.length}`);
  assert.ok(read("docs/SESSIONS.md").includes("<!-- DeepBench v7.0.446 | runbooks/runner-cycle.md | SES-346"),
    "the rotated v7.0.446 stamp must land in docs/SESSIONS.md VERBATIM -- a stamp dropped instead of moved loses the only written record of that ship");

  // CONTROL: rename the step and the renderer must REFUSE. A renderer that silently omitted a step
  // it had no note for would leave a cycle executing a procedure the card does not mention.
  assert.throws(() => renderCard(md.replace("**4d. ", "**4e. ")),
    "control: a runbook step with no NOTES entry rendered anyway -- the card would silently omit it");
}

// --- M. live --------------------------------------------------------------------------------------

async function theLedgerSweepRunsDryAgainstTheRealBoard() {
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!url || !key) {
    notRun("live ledger sweep (part M)",
      "SUPABASE_URL + SUPABASE_SERVICE_KEY absent -- the --from-ledger dry run, the weekly cap and the two untouched counts are unverified here. Run: node --env-file=.env.local tests/regression/agt-70-auditor.test.mjs");
    return;
  }

  let out = "";
  try {
    out = execFileSync(process.execPath,
      [path.join(ROOT, "scripts", "tripwire-to-backlog.js"), "--from-ledger", "--json"],
      { encoding: "utf8", cwd: ROOT });
  } catch (e) {
    throw new Error(`--from-ledger with no ruled findings must exit 0; exited ${e.status}: ${e.stdout ?? ""}${e.stderr ?? ""}`);
  }
  const json = JSON.parse(out.trim());
  assert.strictEqual(json.source, "ledger", "the JSON must name its SOURCE -- the tripwire path and this one share every other key");
  assert.strictEqual(json.weeklyCap, 3, "the live cap is the constant, not a flag");
  assert.strictEqual(json.filedThisWeek, 0, "nothing has been filed from the ledger this ISO week");
  assert.ok(Array.isArray(json.detections), "detections is always an array, even when empty");

  const get = async q => {
    const res = await fetch(`${url}/rest/v1/${q}`, { headers: restHeaders(key) });
    if (!res.ok) throw new Error(`GET ${q} -> HTTP ${res.status}: ${await res.text().catch(() => "")}`);
    return res.json();
  };
  // THE TWO COUNTS THIS SLICE PROMISED NOT TO MOVE. The sweep is a DRY RUN by default, so running
  // it -- here, and in the QA above -- must leave both exactly where it found them.
  assert.strictEqual((await get("audit_findings?select=id")).length, 6,
    "the ledger still holds exactly 6 rows; this slice ingests nothing");
  assert.strictEqual((await get("backlog_items?select=id&source_file=eq.audit-ledger")).length, 0,
    "no board row has been filed from the ledger; --from-ledger defaults to a dry run and there is nothing ruled to file anyway");
}

// --- N. the negative control ----------------------------------------------------------------------

// The fixture's three markdown files stand in for the three REAL homes the first week's open
// findings cite, each rewritten as it would read AFTER the finding was resolved (the live sentence
// now points at the row, the superseded wording kept beside it under a RETIRED IN PLACE marker --
// which is what this repo actually does). Mapping each file to its real rel is the whole trick: the
// ledger's stored locations resolve against the fixture without editing a single one of them.
const RESOLVED_REL_MAP = {
  "runner-cycle.md": "docs/runbooks/runner-cycle.md",
  "SELFBUILD-CHARTER.md": "docs/SELFBUILD-CHARTER.md",
  "standing-brief.md": "docs/runbooks/standing-brief.md",
};

function resolved() {
  const out = JSON.parse(read(`${RESOLVED_REL}/db.json`));
  for (const [file, rel] of Object.entries(RESOLVED_REL_MAP)) {
    out.push(...extractMarkdown(rel, read(`${RESOLVED_REL}/${file}`)));
  }
  return out;
}

// The first week's file read back as LEDGER ROWS -- the same shape the REST read returns, so the
// pure functions under test are handed exactly what the CLI hands them.
const FIXTURE = JSON.parse(read(FINDINGS_REL));
const ROWS = FIXTURE.findings.map(f => ({
  ...f, fingerprint: fingerprint(f), status: f.status ?? "open", iso_week: WEEK,
}));

const OPEN_FOUR = ["4637961d21e1076a", "4ef228c361f9a904", "b057c6f102845074", "e141f20a37d1fbe9"];

function aResolvedCorpusFindsNothingAndTheFlagIsWhy() {
  assert.deepStrictEqual(ROWS.filter(r => r.status === "open").map(r => r.fingerprint).sort(), OPEN_FOUR,
    "the fixture must fingerprint to the four open findings the LIVE ledger holds -- if these drift apart this whole part is measuring a different week than the one it names");

  const sts = resolved();
  assert.strictEqual(sts.length, 25, `the resolved corpus is 18 database statements plus 7 from the three files; got ${sts.length}`);
  assert.deepStrictEqual(sts.filter(s => s.retired).map(s => s.location), [
    "governance_rules/OD-43",
    "docs/runbooks/runner-cycle.md:5",
    "docs/runbooks/runner-cycle.md:7",
    "docs/SELFBUILD-CHARTER.md:7",
    "docs/SELFBUILD-CHARTER.md:9",
  ], "the retired set is the marker paragraph and the passage under it, in both files, plus the superseded rule");

  // THE ANSWER A RESOLVED CORPUS MUST GIVE: nothing runnable, and every prior row reported as
  // unrunnable with the count it actually located -- never quietly skipped.
  const { clusters, unrunnable } = priorClusters(ROWS, sts);
  assert.strictEqual(clusters.length, 0,
    `a corpus in which all four findings are resolved must yield NO runnable prior cluster; got ${clusters.map(c => c.name).join(", ")}`);
  assert.deepStrictEqual(unrunnable, [
    { fingerprint: "e141f20a37d1fbe9", located: 0, total: 3 },
    { fingerprint: "4637961d21e1076a", located: 1, total: 3 },
    { fingerprint: "4ef228c361f9a904", located: 0, total: 8 },
    { fingerprint: "b057c6f102845074", located: 1, total: 2 },
  ], "each prior row must report how many of its own locations still resolve -- that count is a fact about the corpus, and it is the whole report when nothing is runnable");

  // THE CONTROL, and it is the load-bearing assertion of this part. Force `retired` false on the
  // SAME statements -- not different text, not a different corpus -- and the two clusters come
  // back. That is what proves the exclusion is the flag. This is also the live bug: before slice 4
  // locateStatements() ignored `retired`, so these two ran, and the lane would have paid for a
  // model call re-deciding a question the repo had already answered in place.
  const forced = priorClusters(ROWS, sts.map(s => ({ ...s, retired: false })));
  assert.deepStrictEqual(forced.clusters.map(c => c.name), ["prior-4637961d21e1076a", "prior-b057c6f102845074"],
    "with `retired` forced false the same statements must make exactly these two clusters -- if they do not, the 0 above is measuring a text difference rather than the retirement flag");

  const charter = ROWS.find(r => r.fingerprint === "b057c6f102845074")
    .locations.find(l => l.location.startsWith("docs/SELFBUILD-CHARTER.md"));
  assert.strictEqual(locateStatements(sts, charter).length, 0,
    "the charter's retired twin still carries the quotation byte-for-byte; the locator must refuse it anyway");
  assert.strictEqual(locateStatements(sts.map(s => ({ ...s, retired: false })), charter).length, 1,
    "and the SAME statement with the flag off must locate -- otherwise the 0 above proves nothing about the flag");

  assert.strictEqual(detectDuplicates(sts, []).length, 0,
    "the resolved corpus holds a retired twin of two live passages and must still report no duplicate -- the retirement rule is what stops the first weekly report being a list of the repo's own good habits");
  assert.deepStrictEqual(detectStaleParameters(sts), [],
    "every Skill row in the resolved corpus stores temperature=null, which is the corrected state; the stale detector must say nothing at all");
}

function theResolvedCorpusCliRuns() {
  let out = "";
  try {
    out = execFileSync(process.execPath,
      [path.join(ROOT, "scripts", "audit-corpus.js"), `--corpus=${RESOLVED_REL}`, "--no-db"],
      { encoding: "utf8", cwd: ROOT });
  } catch (e) {
    throw new Error(`audit-corpus.js over the resolved corpus must exit 0; exited ${e.status}: ${e.stdout ?? ""}${e.stderr ?? ""}`);
  }
  assert.match(out, /statements 7 \(governance 7, agent-data 0, retired 4\) duplicates 0 stale 0/,
    `the CLI's own summary must report the clean corpus, stale band included; got: ${out.trim()}`);
}

// --- O. week two (pure) ---------------------------------------------------------------------------

// One statement per location of every open row, all live: the corpus as it stands when nothing has
// changed since last week. Built from the rows rather than written out, so it cannot drift from
// the locations the carry is actually asked about.
const LIVE_LIKE = ROWS.filter(r => r.status === "open").flatMap((r, i) =>
  r.locations.map((l, j) => ({
    id: `l${i}-${j}`, corpus: "governance", source: "x", location: l.location, text: l.text, retired: false,
  })));

function weekTwoCarriesWhatIsStillThereAndNamesWhatIsGone() {
  const still = carryForward(ROWS, LIVE_LIKE, "2026-W38");
  assert.strictEqual(still.carried.length, 4, "all four open findings still resolve, so all four carry");
  assert.strictEqual(still.gone.length, 0, "nothing is gone when every location still resolves");
  for (const c of still.carried) {
    const row = ROWS.find(r => r.fingerprint === fingerprint(c));
    assert.ok(row, `a carried finding must fingerprint back to its own row; ${fingerprint(c)} matched none`);
    assert.strictEqual(c.found_by, `carry:${WEEK}`, "the carry records the week it came FROM -- the only fact it adds");
    assert.strictEqual(c.status, "open", "a carry never rules; it re-files the open finding as open");
    assert.strictEqual(c.ruled_by, null, "an unruled finding carries an unruled ruling band");
  }

  // THE NEGATIVE ARM, over the same rows: the resolved corpus carries nothing and reports all four
  // gone with the counts part N measured. Same function, opposite corpus.
  const away = carryForward(ROWS, resolved(), "2026-W38");
  assert.strictEqual(away.carried.length, 0, "a resolved corpus carries nothing forward");
  assert.deepStrictEqual(away.gone.map(g => g.located), [0, 1, 0, 1],
    "each gone entry reports how many of its locations still resolved -- 'gone' is a statement about the corpus, never a claim the defect was fixed");
  assert.ok(away.gone.every(g => g.from_week === WEEK), "every gone entry names the week it was last open in");

  // GUARD 1: the week being collected is not 'earlier than' itself, so a re-run inside one week
  // carries nothing. This is what stops --collect minting a second copy on Tuesday.
  const sameWeek = carryForward(ROWS, LIVE_LIKE, WEEK);
  assert.strictEqual(sameWeek.carried.length, 0, "nothing earlier than the week being collected means nothing to carry");
  assert.strictEqual(sameWeek.gone.length, 0, "and nothing to report gone either");

  // GUARD 2: the LATEST row per fingerprint decides. A finding already observed in W38 must not
  // carry into W38, and must carry into W39 naming W38 as its origin.
  const withW38 = [...ROWS, { ...ROWS[1], iso_week: "2026-W38" }];
  assert.strictEqual(carryForward(withW38, LIVE_LIKE, "2026-W38").carried.length, 3,
    "a fingerprint already observed in the week being collected is not carried into it again");
  const w39 = carryForward(withW38, LIVE_LIKE, "2026-W39");
  assert.strictEqual(w39.carried.length, 4, "and at W39 it carries again, from its newest week");
  const moved = w39.carried.find(c => fingerprint(c) === ROWS[1].fingerprint);
  assert.strictEqual(moved.found_by, "carry:2026-W38",
    "the carry names the LATEST week the finding was seen in, not the first -- otherwise the trail through the weeks is lost");

  // GUARD 3: a resolved latest row closes the fingerprint. The ruling is the ledger's answer.
  const withResolved = [...ROWS, { ...ROWS[1], iso_week: "2026-W38", status: "resolved" }];
  assert.strictEqual(carryForward(withResolved, LIVE_LIKE, "2026-W39").carried.length, 3,
    "a fingerprint whose latest row is resolved must never carry -- re-filing a closed finding would ask the same answered question every Monday");
}

const TWO_HOMES = {
  kind: "contradiction", confidence: "medium", governing_fact: "worded another way",
  proposed_resolution: "x",
  locations: [{ location: "governance_rules/OD-01", text: "" }, { location: "governance_rules/OD-43", text: "" }],
};

function theFourVerdictsFireInTheRightOrder() {
  assert.deepStrictEqual(classifyIngest(FIXTURE.findings, ROWS, WEEK).summary, { new: 0, seen: 6, recurring: 0, ruledOut: 0 },
    "re-ingesting the week that is already filed is six `seen` -- the (fingerprint, week) pair exists and the table would refuse the row anyway");
  assert.deepStrictEqual(classifyIngest(FIXTURE.findings, ROWS, "2026-W38").summary, { new: 0, seen: 0, recurring: 6, ruledOut: 0 },
    "the SAME six at the next week are `recurring`, never `new` -- this is the whole reason slice 4 exists; `new` here would grow a fresh row for one unchanged dispute every Monday");

  const ruledRows = ROWS.map(r => r.fingerprint === "4637961d21e1076a" ? { ...r, status: "not-a-defect" } : r);
  const ruled = classifyIngest(FIXTURE.findings, ruledRows, "2026-W38");
  const v = ruled.verdicts.find(x => x.fingerprint === "4637961d21e1076a");
  assert.strictEqual(v.verdict, "ruled-out", "a fingerprint John ruled not-a-defect must never come back as work");
  assert.strictEqual(v.match, "4637961d21e1076a", "the verdict names the row that ruled it, so the report can cite the ruling");
  assert.strictEqual(ruled.summary.recurring, 5,
    "and the other five are unaffected -- the ruling closes one question, not the batch (this is also the ORDER assertion: ruled-out is tested before recurring)");

  // TWO shared homes and not one -- reconcile()'s measured bar, re-asserted for the ruling path.
  assert.strictEqual(classifyIngest([TWO_HOMES], ruledRows, "2026-W38").verdicts[0].verdict, "ruled-out",
    "a re-worded finding over the same two homes as a not-a-defect row is the same ruled question, whatever its fingerprint");
  assert.strictEqual(classifyIngest([TWO_HOMES], ROWS, "2026-W38").verdicts[0].verdict, "new",
    "CONTROL: with no not-a-defect row behind them those same two homes are new -- the exemption is the RULING, not the locations");
  const oneHome = { ...TWO_HOMES, locations: [TWO_HOMES.locations[0]] };
  assert.strictEqual(classifyIngest([oneHome], ruledRows, "2026-W38").verdicts[0].verdict, "new",
    "one shared home is not enough: a single-home overlap would rule out almost anything ever filed about that file");
  assert.strictEqual(classifyIngest([oneHome], ROWS, "2026-W38").verdicts[0].verdict, "new",
    "and it is new against the unruled rows too, which is what makes the line above a real control");

  assert.deepStrictEqual(
    classifyIngest([FIXTURE.findings[0], FIXTURE.findings[0]], ROWS, "2026-W38").verdicts.map(x => x.verdict),
    ["recurring", "seen"],
    "the same finding twice in ONE file appends once: the second is `seen` because an earlier finding of this call already claimed the fingerprint");

  // toRow's pass-through, which is what keeps a carry's own provenance instead of stamping the run's.
  const carried = toRow(
    { ...FIXTURE.findings[0], found_by: `carry:${WEEK}`, ruled_by: "john", ruled_at: "2026-09-15T00:00:00.000Z" },
    { week: "2026-W38", foundBy: "x", id: "i" });
  assert.strictEqual(carried.found_by, `carry:${WEEK}`, "a carried finding keeps the week it was carried from");
  assert.strictEqual(carried.ruled_by, "john", "and keeps whoever ruled it");
  assert.strictEqual(carried.ruled_at, "2026-09-15T00:00:00.000Z", "and when");
  assert.strictEqual(carried.status, "open", "an open finding carried forward is still open");
  const plain = toRow(FIXTURE.findings[0], { week: "2026-W38", foundBy: "x", id: "i" });
  assert.strictEqual(plain.found_by, "x", "CONTROL: a finding carrying none of the three still takes the run's own --found-by");
  assert.strictEqual(plain.ruled_by, null, "and an open row is unruled, exactly as before slice 4");
}

// --- P. the self-audit ------------------------------------------------------------------------------

// The Auditor's own seed rows, in the shape skill_profiles stores them. Written here rather than
// parsed out of the .sql, because the point is the DETECTOR's answer on those values; the seed file
// itself is grepped separately below so the two cannot silently disagree.
const SEED_SHAPED = [
  { slug: "au-identity", objective: "o", llm_model: "claude-fable-5-1", temperature: null, max_tokens: 6000 },
  { slug: "au-behavior", traits: { reasoning_style: "r" }, llm_model: "claude-fable-5-1", temperature: null, max_tokens: 6000 },
];

function theAuditorPassesItsOwnAudit() {
  assert.deepStrictEqual(detectStaleParameters(extractSkillRows(SEED_SHAPED)), [],
    "the Auditor's own rows store temperature NULL, so the detector it ships must find nothing to say about them");

  const withTemp = SEED_SHAPED.map(r => r.slug === "au-behavior" ? { ...r, temperature: 0 } : r);
  const findings = detectStaleParameters(extractSkillRows(withTemp));
  assert.strictEqual(findings.length, 1,
    "one offending row is ONE finding -- twenty-two symptoms of one fact must never become twenty-two rows in an append-only ledger");
  const [f] = findings;
  assert.strictEqual(f.kind, "stale-or-irrelevant");
  assert.strictEqual(f.confidence, "high");
  assert.strictEqual(f.governing_fact, "temperature stored for a model whose API rejects temperature");
  assert.deepStrictEqual(f.locations.map(l => l.location),
    ["skill_profiles/au-behavior/temperature", "shared/models.js:NO_TEMPERATURE_PREFIXES"],
    "the finding cites the offending row AND the list that condemns it -- a reader is sent to the authority, not to the detector");
  assert.strictEqual(f.locations[0].text, "temperature=0", "the quotation is the statement as the corpus holds it");
  assert.strictEqual(f.locations[1].text, `NO_TEMPERATURE_PREFIXES=${JSON.stringify(NO_TEMPERATURE_PREFIXES)}`,
    "and the list's text is built from the IMPORTED constant -- a copy of ['claude-fable-'] inside audit-corpus.js would be a second home for exactly the kind of claim this tool exists to find");
  assert.ok(f.proposed_resolution.length <= 400,
    `the ledger caps a proposed resolution at 400 chars; got ${f.proposed_resolution.length}`);

  // CONTROL: the LIST decides, never the number. The same temperature 0 on a model that accepts it
  // is not a finding, which is what separates this detector from "temperature must be null".
  assert.deepStrictEqual(
    detectStaleParameters(extractSkillRows([{ slug: "x-opus", objective: "o", llm_model: "claude-opus-5", temperature: 0, max_tokens: 6000 }])),
    [], "a temperature of 0 on a model whose API accepts temperature is correct, not stale");
  assert.strictEqual(supportsTemperature("claude-fable-5-1"), false, "the family the seed targets really does reject it");
  assert.strictEqual(supportsTemperature("claude-opus-5"), true, "and the control family really does accept it");

  // THE SEED AS WRITTEN, grepped: the self-audit applied to the file John will apply.
  const seed = read("docs/design/agt-70-auditor-seed.sql");
  assert.strictEqual((seed.match(/6000, NULL, 'platform'/g) ?? []).length, 6,
    "all six Auditor Skill rows must be seeded with temperature NULL");
  assert.strictEqual((seed.match(/6000, 0, 'platform'/g) ?? []).length, 0,
    "and none with 0 -- the seed must not ship the very finding its own detector would file against it");
}

// --- Q. live ----------------------------------------------------------------------------------------

async function weekTwoRunsAgainstTheRealLedger() {
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!url || !key) {
    notRun("live week two (part Q)",
      "SUPABASE_URL + SUPABASE_SERVICE_KEY absent -- the W38 recurring ingest, the --agent self-audit, the live stale detector, the carry and the two untouched counts are unverified here. Run: node --env-file=.env.local tests/regression/agt-70-auditor.test.mjs");
    return;
  }

  const spawn = (script, args) => execFileSync(process.execPath, [path.join(ROOT, "scripts", script), ...args],
    { encoding: "utf8", cwd: ROOT });

  // (1) THE WEEK THAT DOES NOT EXIST YET. The first week's own file, ingested dry at W38, must come
  // back as six RECURRING and exit 1 -- work the ledger does not hold for that week. Before slice 4
  // this printed `6 new`, which would have doubled the ledger on the first Monday of week two.
  let w38 = "";
  try {
    spawn("audit-ledger.js", [`--ingest=${FINDINGS_REL}`, "--week=2026-W38", "--found-by=hand:review-govtooling-0910"]);
    throw new Error("a dry ingest with unfiled work must exit 1, not 0");
  } catch (e) {
    assert.strictEqual(e.status, 1, `the dry W38 ingest must exit 1 (the runner's re-run signal); got ${e.status}: ${e.stdout ?? ""}${e.stderr ?? ""}`);
    w38 = String(e.stdout ?? "");
  }
  assert.match(w38, /6 findings, 0 new, 0 seen, 6 recurring, 0 ruled-out/,
    `every one of the six must be recognised as the SAME finding in a new week; got: ${w38.trim()}`);

  // (2) CONTROL, same file same command, at the week it really was filed in: six seen, exit 0.
  const w37 = spawn("audit-ledger.js", [`--ingest=${FINDINGS_REL}`, `--week=${WEEK}`, "--found-by=hand:review-govtooling-0910"]);
  assert.match(w37, /0 new, 6 seen, 0 recurring, 0 ruled-out/,
    `at its own week the same file is six seen -- which is what proves the line above is about the WEEK and not about the file; got: ${w37.trim()}`);

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agt-70-w2-"));
  try {
    fs.mkdirSync(path.join(tmp, "empty"));

    // (3) THE SELF-AUDIT, either side of John's gate. The seed is unapplied today, so --agent must
    // REFUSE with exit 2; once John applies it the same command must run clean. Both are green
    // here, and the branch that ran is printed -- an assertion that silently accepted either would
    // be worthless, so anything else fails.
    let agentBranch = "";
    try {
      const ok = spawn("audit-corpus.js", ["--agent=auditor", `--out=${path.join(tmp, "a.json")}`]);
      assert.match(ok, /stale 0/, `with the seed applied the Auditor's own rows must audit clean; got: ${ok.trim()}`);
      agentBranch = "seed APPLIED: --agent=auditor ran and reported stale 0";
    } catch (e) {
      assert.strictEqual(e.status, 2, `--agent=auditor must either exit 0 clean or exit 2 'not run'; got ${e.status}: ${e.stdout ?? ""}${e.stderr ?? ""}`);
      assert.match(String(e.stderr ?? ""), /no Skill rows/,
        `exit 2 must say WHY -- an agent with no rows makes every detector return [] and 'stale 0' would be a false all-clear; got: ${e.stderr ?? ""}`);
      agentBranch = "seed UNAPPLIED: --agent=auditor exited 2 'no Skill rows'";
    }

    // (4) THE LIVE CORPUS, both detectors. The stale finding is asserted by SHAPE rather than by a
    // count, because the count is whatever the live Skill rows currently store -- an assertion on
    // 22 would go red the day John fixes them, which is the wrong direction for a regression.
    const corpus = spawn("audit-corpus.js", [`--out=${path.join(tmp, "s.json")}`, `--detect=${path.join(tmp, "d.json")}`]);
    assert.match(corpus, /duplicates 0 stale [01]\b/,
      `the live corpus must report both detector bands; got: ${corpus.trim()}`);
    const detected = JSON.parse(fs.readFileSync(path.join(tmp, "d.json"), "utf8"));
    for (const f of detected.findings.filter(x => x.kind === "stale-or-irrelevant")) {
      assert.strictEqual(f.governing_fact, "temperature stored for a model whose API rejects temperature",
        "every stale finding is the detector's one sentence -- a second wording would be a second fingerprint for one fact");
      for (const l of f.locations) {
        assert.ok(l.location.endsWith("/temperature") || l.location === "shared/models.js:NO_TEMPERATURE_PREFIXES",
          `a stale finding may cite only the offending temperature rows and the list that condemns them; got ${l.location}`);
      }
    }

    // (5) THE CARRY, live, against an EMPTY task dir: no clusters, no model call, and the carry
    // computed from the real ledger. carried + gone must be exactly the fingerprints whose latest
    // row is open -- the arithmetic is asserted against the ledger itself, not against a literal.
    const collected = spawn("audit-cluster.js", ["--collect", `--dir=${path.join(tmp, "empty")}`,
      `--statements=${path.join(tmp, "s.json")}`, "--week=2026-W38", `--out=${path.join(tmp, "w38.json")}`]);
    const m = collected.match(/0 clusters, 0 returned, 0 dropped, 0 re-found \[\], 0 exact, 0 ruled-out, 0 new, (\d+) carried, (\d+) gone/);
    assert.ok(m, `--collect over an empty dir must report every band at 0 and then the carry; got: ${collected.trim()}`);
    const [carriedN, goneN] = [Number(m[1]), Number(m[2])];

    const res = await fetch(`${url}/rest/v1/audit_findings?select=fingerprint,iso_week,status`, { headers: restHeaders(key) });
    if (!res.ok) throw new Error(`GET audit_findings -> HTTP ${res.status}`);
    const latest = new Map();
    for (const r of await res.json()) {
      const cur = latest.get(r.fingerprint);
      if (!cur || r.iso_week > cur.iso_week) latest.set(r.fingerprint, r);
    }
    const stillOpen = [...latest.values()].filter(r => r.status === "open").length;
    assert.strictEqual(carriedN + goneN, stillOpen,
      `every fingerprint whose latest ledger row is open must land in exactly one of carried/gone; ledger says ${stillOpen}, the run said ${carriedN} + ${goneN}`);

    // ...and the carry must arrive at the ledger as RECURRING, which is the two scripts' seam.
    let ingest = "";
    try {
      ingest = spawn("audit-ledger.js", [`--ingest=${path.join(tmp, "w38.json")}`, "--week=2026-W38"]);
      assert.strictEqual(carriedN, 0, `a dry ingest carrying ${carriedN} findings must exit 1, not 0`);
    } catch (e) {
      assert.strictEqual(e.status, 1, `the carry's dry ingest must exit 1 when it carries anything; got ${e.status}: ${e.stdout ?? ""}${e.stderr ?? ""}`);
      ingest = String(e.stdout ?? "");
    }
    assert.match(ingest, new RegExp(`${carriedN} recurring`),
      `the carried findings must reach the ledger as recurring, not new -- that seam is the whole of week two; got: ${ingest.trim()}`);

    console.log(`         [part Q] ${agentBranch} · live carry ${carriedN} carried, ${goneN} gone of ${stillOpen} open`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  // (6) THE TWO COUNTS. Nothing above passed --apply, so the ledger and the board are untouched.
  const get = async q => {
    const r = await fetch(`${url}/rest/v1/${q}`, { headers: restHeaders(key) });
    if (!r.ok) throw new Error(`GET ${q} -> HTTP ${r.status}`);
    return r.json();
  };
  assert.strictEqual((await get("audit_findings?select=id")).length, 6,
    "the ledger still holds exactly 6 rows -- every command in this part is a dry run");
  assert.strictEqual((await get("backlog_items?select=id&source_file=eq.audit-ledger")).length, 0,
    "and no board row has been filed from the ledger");
}

export async function run() {
  theFingerprintHoldsTheRightThingsStill();
  bMdMarksItsRetiredTwinAndNothingElse();
  theDetectorFindsP1AndOnlyP1();
  theReportIsByteStable();
  theCorpusCliRuns();
  theClustererFindsOneAnchorAndCutsTheLongOne();
  theLocatorTheValidatorAndTheReconcilerHoldTheirLines();
  theClusterCliRuns();
  theDetectorExemptsFencesAndRuleRenders();
  theCorpusDropsGeneratedDocsByTheRealSet();
  theLedgerFilesOnlyRuledOpenHighRowsUnderTheCap();
  theBriefGroupCountsWithoutInventingZeros();
  stepFourDIsInTheRunbookAndOnTheCard();
  aResolvedCorpusFindsNothingAndTheFlagIsWhy();
  theResolvedCorpusCliRuns();
  weekTwoCarriesWhatIsStillThereAndNamesWhatIsGone();
  theFourVerdictsFireInTheRightOrder();
  theAuditorPassesItsOwnAudit();
  await theLedgerIsAppendOnly();
  await theLedgerSweepRunsDryAgainstTheRealBoard();
  await weekTwoRunsAgainstTheRealLedger();
  console.log("  [PASS] agt-70-auditor.test.mjs");
  console.log("         fingerprint: line-invariant, kind/file-sensitive · retirement: b.md P2 retired, P1 and a.md P2 live");
  console.log("         detector: 1 finding (P1) with 4 controls (0 / 2 / rule-exempt / same-file) · report byte-stable · CLI duplicates 1");
  console.log("         clusters: 1 anchor, spread 2, 1200-char cut · locate/validate/reconcile: invented + paraphrase dropped, 2-home re-found, 1-home new");
  console.log("         exemptions: fenced 0 / unfenced 1 · rule render 0 with the rule, 1 without · cycle-card.md out by PROCEDURE_GENERATED_DOCS");
  console.log("         ledger filing: 2 of 6 eligible, cap 3 → 0 at filedThisWeek 3, 1 at 2 · draft S/M by locations · isoWeek 2027-01-01 = 2026-W53");
  console.log("         brief group: 6 findings (4 open · 2 resolved) 0 ruled 0 filed · absent says 'not read', never 0 · factsSha moves on a ruling and on a filing");
  console.log("         step 4d: between 4c and 5, 27 steps, NOTES 85 chars, no --ingest= line carries --apply, 5 header stamps, v7.0.446 in SESSIONS.md");
  console.log("         negative control: resolved corpus → 0 clusters, 4 unrunnable (0/3, 1/3, 0/8, 1/2); retired forced false → the 2 come back · CLI duplicates 0 stale 0");
  console.log("         week two: 4 carried over live homes / 0 carried + 4 gone over the resolved corpus · same week 0 · resolved latest row never carries");
  console.log("         verdicts: W37 6 seen, W38 6 recurring, a not-a-defect row → 1 ruled-out + 5 recurring · 2 homes rule out, 1 home does not · carry keeps its own found_by");
  console.log("         self-audit: seed rows as written 0 findings, one temperature 0 → 1 finding citing the row + the imported list · opus at 0 → 0 · seed 6 NULL / 0 zero");
}

selfRun(import.meta.url, run);
export default run;
