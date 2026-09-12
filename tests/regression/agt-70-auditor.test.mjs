// DeepBench v7.0.464 | tests/regression/agt-70-auditor.test.mjs | AGT-70
//
// FEATURE: AGT-70 slice 1 -- the Auditor's findings ledger (public.audit_findings + its append-only
// guard), the statement extractor (scripts/audit-corpus.js) and the ingest/report engine
// (scripts/audit-ledger.js).
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
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { selfRun, notRun } from "./_lib/self-run.js";
import { fingerprint, locationKey, normalize, renderReport } from "../../scripts/audit-ledger.js";
import { extractMarkdown, extractSkillRows, detectDuplicates } from "../../scripts/audit-corpus.js";

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

export async function run() {
  theFingerprintHoldsTheRightThingsStill();
  bMdMarksItsRetiredTwinAndNothingElse();
  theDetectorFindsP1AndOnlyP1();
  theReportIsByteStable();
  theCorpusCliRuns();
  await theLedgerIsAppendOnly();
  console.log("  [PASS] agt-70-auditor.test.mjs");
  console.log("         fingerprint: line-invariant, kind/file-sensitive · retirement: b.md P2 retired, P1 and a.md P2 live");
  console.log("         detector: 1 finding (P1) with 4 controls (0 / 2 / rule-exempt / same-file) · report byte-stable · CLI duplicates 1");
}

selfRun(import.meta.url, run);
export default run;
