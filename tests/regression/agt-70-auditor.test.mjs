// DeepBench v7.0.465 | tests/regression/agt-70-auditor.test.mjs | AGT-70
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
import { fingerprint, locationKey, normalize, renderReport } from "../../scripts/audit-ledger.js";
import { extractMarkdown, extractSkillRows, detectDuplicates, corpusFiles } from "../../scripts/audit-corpus.js";
import { PROCEDURE_GENERATED_DOCS } from "../../scripts/check-session-docs.js";
import {
  buildClusters, locateStatements, priorClusters, capabilityFor, validateFindings, reconcile,
} from "../../scripts/audit-cluster.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CORPUS_REL = "tests/fixtures/agt-70/corpus";
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
  await theLedgerIsAppendOnly();
  console.log("  [PASS] agt-70-auditor.test.mjs");
  console.log("         fingerprint: line-invariant, kind/file-sensitive · retirement: b.md P2 retired, P1 and a.md P2 live");
  console.log("         detector: 1 finding (P1) with 4 controls (0 / 2 / rule-exempt / same-file) · report byte-stable · CLI duplicates 1");
  console.log("         clusters: 1 anchor, spread 2, 1200-char cut · locate/validate/reconcile: invented + paraphrase dropped, 2-home re-found, 1-home new");
  console.log("         exemptions: fenced 0 / unfenced 1 · rule render 0 with the rule, 1 without · cycle-card.md out by PROCEDURE_GENERATED_DOCS");
}

selfRun(import.meta.url, run);
export default run;
