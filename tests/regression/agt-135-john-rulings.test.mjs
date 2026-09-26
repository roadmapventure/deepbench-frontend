// DeepBench v7.0.603 | tests/regression/agt-135-john-rulings.test.mjs | AGT-135
//
// FEATURE: AGT-135 -- John's rulings of 2026-09-25 stop living in an attended session's memory
// files and become rows every agent already reads: seven public.governance_rules rows
// JOHN-0925-* carrying his verbatim words, and the three Skill rows of the agents those rulings
// govern (ds-guardrails, au-knowledge-homes, rs-knowledge-corpus). Spec: kickoff
// docs/kickoffs/v7.0.603-AGT-135-john-rulings-0925.md sections 4-6; row text
// docs/harvests/AGT-135.md sections "The seven rows" / "The Skill-row text". Reads only.
//
// THREE ARMS (kickoff section 5 task 3):
//   A  REGISTRY (pure, over docs/governance/RULES-SNAPSHOT.md) -- the seven ids are present, each
//      live, in source group claude-md-hard-rules, pointing at the Decision Authority Matrix, and
//      each statement carries the attribution "John 2026-09-25". NEGATIVE CONTROL: the same text
//      with JOHN-0925-DESIGNER-DECIDES's row deleted must THROW. Without that control the arm
//      would pass on a snapshot that never carried the row at all.
//   B  POINTER (pure, over docs/WORKING-WITH-JOHN.md) -- the one paragraph that points at the
//      registry and says the database is the rulings' only home. CONTROL: remove it -> throws.
//   C  LIVE (read-only, credentialed) -- the seven rows in the registry itself; each Skill row
//      carries its own ruling text; the ledger holds exactly two unreversed AGT-135 decisions,
//      kinds rule and agent-row, with 7 NULL-row_data images and 3 full-row images; and none of
//      the three edited fields names a governance agent other than its own (Rule #1, ARCHITECTURE
//      19d/19e -- an agent's data never names another agent).
//
// WHY THE PURE ARMS READ THE SNAPSHOT AND THE DOC RATHER THAN THE DATABASE: those two files are
// what a cold session and the truth tripwire (checks 9/10/11) actually read. A registry row whose
// snapshot was never re-exported is a row no reader can find, so "the row exists in Postgres" is
// not the property under test here -- arm C tests that, separately and with credentials.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SNAPSHOT_REL = "docs/governance/RULES-SNAPSHOT.md";
const WWJ_REL = "docs/WORKING-WITH-JOHN.md";

const RULE_IDS = [
  "JOHN-0925-PROJECT-LIST",
  "JOHN-0925-FINDINGS-STANDARD",
  "JOHN-0925-DESIGNER-DECIDES",
  "JOHN-0925-RESEARCHER-ROUTINE",
  "JOHN-0925-ROUTING-PRECEDENCE",
  "JOHN-0925-REVIEW-CADENCE",
  "JOHN-0925-NOTIFICATIONS-OFF",
];
const CANONICAL_DOC = "docs/WORKING-WITH-JOHN.md#decision-authority-matrix";
const SOURCE_GROUP = "claude-md-hard-rules";
const ATTRIBUTION = "John 2026-09-25";

// The pointer paragraph, as kickoff section 5 task 2 words it. Compared as one exact string:
// a fuzzy match would pass on a paraphrase, and the whole ticket is about wording that is not
// paraphrased.
const POINTER =
  "John's rulings of 2026-09-25 are registry rows `JOHN-0925-*` (`docs/governance/RULES-SNAPSHOT.md`) " +
  "and the Designer, Auditor and Researcher Skill rows they name \u2014 the database is their only home, " +
  "never an md file (John 2026-09-25, AGT-135).";

// The Skill-row markers, each unique to the paragraph AGT-135 appended to that row.
const SKILL_MARKERS = {
  "ds-guardrails": { field: "guardrails", marker: "JOHN-0925-DESIGNER-DECIDES", own: "The Designer" },
  "au-knowledge-homes": { field: "method", marker: "THE FINDINGS STANDARD AND THE CADENCE", own: "The Auditor" },
  "rs-knowledge-corpus": { field: "method", marker: "THE ROUTINE (John 2026-09-25", own: "The Researcher" },
};

// --- pure helpers (arms A and B run these against real text AND against mutated text) ----------

// RULES-SNAPSHOT.md's own escaping: `\` -> `\\`, `|` -> `\|`, newline -> `\n`. So a cell boundary
// is an UNESCAPED pipe; splitting on every pipe would cut a statement in half the first time one
// carries a table character.
function splitRow(line) {
  const cells = [];
  let cur = "";
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === "\\" && i + 1 < line.length) { cur += c + line[++i]; continue; }
    if (c === "|") { cells.push(cur); cur = ""; continue; }
    cur += c;
  }
  cells.push(cur);
  // Every cell is padded with exactly one space per side -- remove one character per side rather
  // than trimming, as the snapshot's own header instructs.
  return cells.slice(1, -1).map(c => c.slice(1, -1));
}

export function parseSnapshotRules(text) {
  const out = new Map();
  for (const line of text.split("\n")) {
    if (!line.startsWith("| ")) continue;
    const c = splitRow(line);
    if (c.length < 7) continue;
    const [id, status, enforcement, source_group, canonical_doc, superseded_by, statement] = c;
    if (id === "Rule" || /^-+$/.test(id)) continue;
    out.set(id, { id, status, enforcement, source_group, canonical_doc, superseded_by, statement });
  }
  return out;
}

export function assertSevenRulesIn(text) {
  const rules = parseSnapshotRules(text);
  const missing = RULE_IDS.filter(id => !rules.has(id));
  assert.deepEqual(missing, [], `${SNAPSHOT_REL} is missing rule row(s): ${missing.join(", ")}`);
  for (const id of RULE_IDS) {
    const r = rules.get(id);
    assert.equal(r.status, "live", `${id} must be live, is "${r.status}"`);
    assert.equal(r.source_group, SOURCE_GROUP, `${id} source group`);
    assert.equal(r.enforcement, "reviewer", `${id} enforcement`);
    assert.equal(r.canonical_doc, CANONICAL_DOC, `${id} canonical_doc`);
    assert.equal(r.superseded_by, "", `${id} must not be superseded`);
    assert.ok(
      r.statement.includes(ATTRIBUTION),
      `${id}'s statement must carry the attribution "${ATTRIBUTION}" -- a ruling with no date is not traceable to John`
    );
    assert.ok(r.statement.length > 200, `${id}'s statement is ${r.statement.length} chars -- too short to be the ruling`);
  }
  return rules;
}

export function assertPointerIn(text) {
  assert.ok(
    text.includes(POINTER),
    `${WWJ_REL} must carry the AGT-135 pointer paragraph verbatim under the MANAGER-AUTHORITY-MATRIX block`
  );
  // It is a pointer, not a second home: it must not restate a ruling.
  assert.ok(
    !text.includes("{{rule:JOHN-0925"),
    `${WWJ_REL} must not render a JOHN-0925 block -- the registry is the home (check 12)`
  );
}

// Deletes one rule's row from snapshot text. Used ONLY to build the negative control.
export function dropRuleRow(text, id) {
  const lines = text.split("\n");
  const kept = lines.filter(l => !l.startsWith(`| ${id} |`));
  assert.equal(kept.length, lines.length - 1, `control fixture: expected to drop exactly one ${id} row`);
  return kept.join("\n");
}

async function run() {
  const snapshot = fs.readFileSync(path.join(ROOT, SNAPSHOT_REL), "utf8");
  const wwj = fs.readFileSync(path.join(ROOT, WWJ_REL), "utf8");

  // --- A. registry (pure) -----------------------------------------------------------------------
  assertSevenRulesIn(snapshot);
  assert.throws(
    () => assertSevenRulesIn(dropRuleRow(snapshot, "JOHN-0925-DESIGNER-DECIDES")),
    /missing rule row\(s\): JOHN-0925-DESIGNER-DECIDES/,
    "control: arm A must FAIL on a snapshot whose JOHN-0925-DESIGNER-DECIDES row was removed"
  );
  console.log("    [arm A registry] ok -- 7 rows live in the snapshot, control throws");

  // --- B. pointer (pure) ------------------------------------------------------------------------
  assertPointerIn(wwj);
  assert.throws(
    () => assertPointerIn(wwj.split(POINTER).join("")),
    /must carry the AGT-135 pointer paragraph/,
    "control: arm B must FAIL once the pointer paragraph is removed"
  );
  console.log("    [arm B pointer] ok -- the pointer is present, control throws");

  // --- C. live (read-only) ----------------------------------------------------------------------
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!url || !key) {
    notRun(
      "AGT-135 arm C (live registry, Skill rows, ledger)",
      "SUPABASE_URL + SUPABASE_SERVICE_KEY absent -- the seven registry rows, the three Skill-row " +
        "paragraphs, the two decisions with their 7 + 3 before-images and the no-other-agent-named " +
        "check are unverified here. Credentialed run: STANDARDS.md Section 2 rule 5"
    );
    return;
  }

  const get = async q => {
    const res = await fetch(`${url}/rest/v1/${q}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    const text = await res.text();
    if (!res.ok) throw new Error(`GET ${q} -> HTTP ${res.status} ${text.slice(0, 240)}`);
    return JSON.parse(text);
  };

  // C1 -- the seven rows, in the registry itself rather than its export.
  const live = await get(
    `governance_rules?id=like.JOHN-0925-*&select=id,status,enforcement,source_group,canonical_doc,superseded_by,statement`
  );
  assert.deepEqual(
    live.map(r => r.id).sort(),
    [...RULE_IDS].sort(),
    `public.governance_rules must hold exactly the seven JOHN-0925 rows; got ${live.length}`
  );
  for (const r of live) {
    assert.equal(r.status, "live", `${r.id} live`);
    assert.equal(r.enforcement, "reviewer", `${r.id} enforcement`);
    assert.equal(r.source_group, SOURCE_GROUP, `${r.id} source group`);
    assert.equal(r.canonical_doc, CANONICAL_DOC, `${r.id} canonical_doc`);
    assert.equal(r.superseded_by, null, `${r.id} superseded_by`);
    assert.ok(r.statement.includes(ATTRIBUTION), `${r.id} statement attribution`);
  }
  // The export and the registry must agree, or a reader of the repo reads a stale ruling.
  const exported = parseSnapshotRules(snapshot);
  for (const r of live) {
    assert.equal(
      exported.get(r.id).statement.split("\\n").join("\n"),
      r.statement,
      `${r.id}: ${SNAPSHOT_REL} does not carry the live statement -- re-run scripts/export-governance-snapshot.js`
    );
  }

  // C2 -- each Skill row carries its own ruling, and names no other governance agent.
  const agents = await get("agents?lane=eq.governance&select=id,name");
  assert.equal(agents.length, 8, `expected the eight governance agents; got ${agents.length}`);
  for (const [slug, spec] of Object.entries(SKILL_MARKERS)) {
    const [row] = await get(`skill_profiles?slug=eq.${slug}&select=slug,method,guardrails`);
    assert.ok(row, `no skill_profiles row ${slug}`);
    const field = spec.field === "guardrails" ? JSON.stringify(row.guardrails) : (row.method ?? "");
    assert.ok(
      field.includes(spec.marker),
      `${slug}.${spec.field} must carry AGT-135's paragraph (marker "${spec.marker}")`
    );
    const named = agents.map(a => a.name).filter(n => n !== spec.own && field.includes(n));
    assert.deepEqual(
      named,
      [],
      `${slug}.${spec.field} names another agent (${named.join(", ")}) -- Rule #1, ARCHITECTURE.md 19d/19e`
    );
  }
  // ds-guardrails's must_not half is the other side of the same ruling, and a jsonb_set that
  // landed only one of the two would otherwise pass C2 above.
  const [ds] = await get("skill_profiles?slug=eq.ds-guardrails&select=guardrails");
  assert.equal(ds.guardrails.must.length, 7, "ds-guardrails.must must hold 7 entries after AGT-135");
  assert.equal(ds.guardrails.must_not.length, 6, "ds-guardrails.must_not must hold 6 entries after AGT-135");
  assert.ok(
    ds.guardrails.must_not.some(s => s.startsWith("escalate a feature or functionality question to John")),
    "ds-guardrails.must_not must carry the escalation ban"
  );

  // C3 -- the ledger: two unreversed decisions, 7 NULL-row_data images and 3 full-row images.
  const decisions = await get("runner_decisions?backlog_id=eq.AGT-135&select=id,kind,reversed_at,cycle_id");
  assert.equal(decisions.length, 2, `AGT-135 must hold exactly two decisions; got ${decisions.length}`);
  assert.deepEqual(decisions.map(d => d.kind).sort(), ["agent-row", "rule"], "the two decision kinds");
  assert.deepEqual(decisions.map(d => d.reversed_at), [null, null], "both decisions must be unreversed");
  for (const d of decisions) {
    const imgs = await get(`runner_before_images?decision_id=eq.${d.id}&select=table_name,pk_value,row_data`);
    const nulls = imgs.filter(i => i.row_data === null);
    if (d.kind === "rule") {
      assert.equal(imgs.length, 7, `the rule decision must carry 7 before-images; got ${imgs.length}`);
      assert.equal(nulls.length, 7, "every rule image is an INSERT undo -- row_data NULL");
      assert.deepEqual(
        imgs.map(i => i.pk_value).sort(),
        [...RULE_IDS].sort(),
        "the rule images must name the seven rule ids"
      );
      assert.ok(imgs.every(i => i.table_name === "governance_rules"), "rule images table_name");
    } else {
      assert.equal(imgs.length, 3, `the agent-row decision must carry 3 before-images; got ${imgs.length}`);
      assert.equal(nulls.length, 0, "every Skill image is an UPDATE undo -- row_data is the whole prior row");
      assert.ok(imgs.every(i => i.table_name === "skill_profiles"), "agent-row images table_name");
      assert.ok(
        imgs.every(i => i.row_data && typeof i.row_data.slug === "string"),
        "each Skill image must be the full prior row (it carries the row's slug)"
      );
    }
  }
  console.log("    [arm C live] ok -- 7 rows, 3 Skill rows, 2 decisions with 7 + 3 images");
}

export default run;
selfRun(import.meta.url, run);
