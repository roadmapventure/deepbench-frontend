// DeepBench v7.0.534 | tests/regression/ses-424b-authority-matrix.test.mjs | SES-424 slice 2
//
// Pins governance rule MANAGER-AUTHORITY-MATRIX (public.governance_rules, canonical home
// docs/WORKING-WITH-JOHN.md#decision-authority-matrix) -- the decision authority matrix by kind,
// which extends MANAGER-DECIDES-BY-DEFAULT from "three calls stay John's" to "for each KIND of
// call a cycle makes, here is who owns it."
//
// WHAT THIS FILE IS FOR, stated narrowly so a later editor does not widen it into a doc linter.
// The rule's load-bearing row is ROW 1: the dm-knowledge-cycle-card re-pin belongs to the manager,
// under the ticket whose runbook edit moved the card, as an imaged agent-row decision -- never a
// card, never John's. That row is the reason the rule exists (SES-415's branch 270cf139 has been
// un-rebasable for two days over exactly this question), and three things can silently undo it
// without breaking any other guard:
//   (1) the registry row is edited or dropped, and the docs keep saying the old thing;
//   (2) the rendered block in WORKING-WITH-JOHN.md drifts from the registry statement, or its
//       marker is removed so render-rule-blocks.js stops policing the text at all;
//   (3) row 1 is reworded into something that no longer names the row it governs.
// Each arm below targets exactly one of those, and each has a negative control that proves it can
// go red.
//
// WHY EVERY ARM HAS A NEGATIVE CONTROL (STANDARDS.md Section 4, the LOO-013 lesson: assert WHICH
// BRANCH FIRED). Every assertion here is "this string is present / these bytes are equal", and
// that shape passes vacuously against a file whose content never mattered -- the SES-28 failure.
// So each assertion is a PURE FUNCTION OVER TEXT, and Part B feeds each one a fixture differing in
// exactly ONE thing and requires it to throw. A suite that only ran Part A would pass against
// assertion bodies that had been commented out.
//
// THE FIXTURES ARE MUTATIONS OF THE REAL SHIPPED FILES, never invented documents (ses-413's
// convention, followed here): the snapshot with this rule's row deleted, the real
// WORKING-WITH-JOHN.md with its marker comment removed, the same file with ONE character changed
// inside the rendered block, the same file with the section heading removed, and the real
// statement with `dm-knowledge-cycle-card` struck out of line 1.
//
// CREDENTIAL SPLIT, the SES-180 rule. Parts A and B run everywhere and are the substance of the
// pin. Part C reaches the live registry and the decision ledger, and DECLARES itself not-run where
// credentials are absent rather than skipping silently -- an invisible gap is indistinguishable
// from coverage.
//
// PART C'S THIRD ARM IS THE RULE'S OWN EVIDENCE, and that is deliberate. Row 1 is written as a
// record of live practice rather than a grant of new authority, and the thing that makes that
// claim true is a measurable population: agent-row re-pin decisions on dm-knowledge-cycle-card,
// each under the ticket whose edit moved the card, none reversed. 16 stood on 2026-09-20 (13 of
// them since 09-18). The arm asserts >= 12 with every backlog_id non-null -- a floor, because the
// population only grows, and NON-NULL because a re-pin under no ticket is precisely the case row 1
// does NOT cover.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SNAPSHOT_REL = "docs/governance/RULES-SNAPSHOT.md";
const WWJ_REL = "docs/WORKING-WITH-JOHN.md";

const RULE_ID = "MANAGER-AUTHORITY-MATRIX";
const HEADING = "## Decision Authority Matrix";

// The clauses row 1 cannot lose and still mean what it was filed to mean: WHICH row moves
// (dm-knowledge-cycle-card), UNDER WHAT (AGENT-ROW-AGREED-TICKET), and WITH WHAT UNDO
// (before-image). Strike any one and the row stops being a rule and becomes an opinion.
const ROW1_CLAUSES = ["dm-knowledge-cycle-card", "AGENT-ROW-AGREED-TICKET", "before-image"];

function read(rel) {
  return fs.readFileSync(path.join(REPO, rel), "utf8");
}

function eq(actual, expected, what) {
  if (actual !== expected) {
    throw new Error(`${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// --- the snapshot row --------------------------------------------------------------------------
//
// A LOCAL reader for one row rather than an import, for the reason ses-413 states and this file
// inherits: scripts/render-rule-blocks.js calls main() at module scope (importing it would RUN the
// checker as a side effect of this test) and scripts/export-governance-snapshot.js exports a
// writer, not a parser. The format contract is written in the snapshot's own header (one space of
// padding per side; `\` `|` and newline escaped; empty cell = NULL). Splitting on UNESCAPED pipes
// is the part that matters -- a plain split("|") over-produces cells on any statement containing a
// pipe and would drop the rule SILENTLY, which is the one failure mode a pin must not have.
const RULE_FIELDS = ["id", "status", "enforcement", "source_group", "canonical_doc", "superseded_by", "statement"];

function decodeCell(cell) {
  const body = cell.slice(1, -1);
  if (body === "\\e") return "";
  if (body === "") return null;
  let out = "";
  for (let i = 0; i < body.length; i++) {
    if (body[i] !== "\\") { out += body[i]; continue; }
    const next = body[++i];
    if (next === "n") out += "\n";
    else if (next === "|") out += "|";
    else if (next === "\\") out += "\\";
    else out += "\\" + (next ?? "");
  }
  return out;
}

export function readRule(snapshotText, id) {
  for (const line of snapshotText.split(/\r?\n/)) {
    if (!line.startsWith("|")) continue;
    const cells = line.split(/(?<!\\)\|/).slice(1, -1);
    if (cells.length !== RULE_FIELDS.length) continue;
    const decoded = cells.map(decodeCell);
    if (decoded[0] !== id) continue;
    const row = {};
    RULE_FIELDS.forEach((f, i) => { row[f] = decoded[i]; });
    return row;
  }
  throw new Error(`${SNAPSHOT_REL} carries no row for rule ${id} -- the registry row is missing, or the snapshot was not re-exported after it landed (node scripts/export-governance-snapshot.js).`);
}

// The rendered form, duplicated from scripts/render-rule-blocks.js's renderBlock() ON PURPOSE:
// this test must fail if THAT function and the committed block ever agree with each other while
// both drifting from the registry. A test importing the renderer would agree with it by
// construction -- "a second implementation agreeing with itself" (STANDARDS.md Section 4, SES-45).
function renderBlock(id, statement) {
  const lines = String(statement ?? "").split("\n");
  return lines.map((l, i) => (i === 0 ? `> **Rule ${id}** — ${l}` : `> ${l}`));
}

// --- Part A assertions, each a pure function Part B can feed a mutated fixture -------------------

export function assertRegistryRow(snapshotText) {
  const row = readRule(snapshotText, RULE_ID);

  eq(row.status, "live", `${RULE_ID}.status`);
  eq(row.enforcement, "reviewer", `${RULE_ID}.enforcement`);
  eq(row.source_group, "claude-md-hard-rules", `${RULE_ID}.source_group`);
  eq(row.canonical_doc, "docs/WORKING-WITH-JOHN.md#decision-authority-matrix", `${RULE_ID}.canonical_doc`);
  eq(row.superseded_by, null, `${RULE_ID}.superseded_by`);

  assertRowOne(row.statement);
  return row;
}

// Split out from assertRegistryRow so Part B can mutate the STATEMENT alone, without having to
// re-encode a snapshot cell: the arm that matters most deserves a control it can drive directly.
export function assertRowOne(statement) {
  const lines = String(statement).split("\n");
  eq(lines.length, 7, `${RULE_ID}.statement line count`);

  for (const clause of ROW1_CLAUSES) {
    if (!lines[0].includes(clause)) {
      throw new Error(`${RULE_ID}.statement line 1 (the dm-knowledge-cycle-card re-pin row) no longer contains ${JSON.stringify(clause)} -- row 1 reads: ${JSON.stringify(lines[0])}`);
    }
  }
  // The row's OWNER is the whole point; "the manager's" is the clause that assigns it, and a
  // reword to "John's" would otherwise pass every string check above.
  if (!lines[0].includes("the manager's, never a card, never John's")) {
    throw new Error(`${RULE_ID}.statement line 1 must still assign the re-pin to the manager ("the manager's, never a card, never John's") -- row 1 reads: ${JSON.stringify(lines[0])}`);
  }
}

export function assertCanonicalHome(wwjText, statement) {
  // (a) the section itself. Without the heading the canonical_doc anchor
  // (#decision-authority-matrix) resolves to nothing and check 10 of check-session-docs.js has a
  // dangling home to report.
  if (!wwjText.includes(HEADING)) {
    throw new Error(`${WWJ_REL} carries no ${JSON.stringify(HEADING)} heading -- ${RULE_ID}.canonical_doc's anchor resolves to nothing.`);
  }

  // (b) the marker. Without it the block below is hand-typed prose that render-rule-blocks.js does
  // not police, and the whole drift guarantee is gone even while the text still happens to match.
  const marker = `{{rule:${RULE_ID}}}`;
  if (!wwjText.includes(marker)) {
    throw new Error(`${WWJ_REL} carries no ${marker} marker -- the rule text there is unpoliced prose.`);
  }

  // (c) the rendered block, byte-equal to the registry statement.
  const expected = renderBlock(RULE_ID, statement);
  const idx = wwjText.indexOf(expected[0]);
  if (idx === -1) {
    throw new Error(`${WWJ_REL} has no rendered block for ${RULE_ID}. Expected it to open with:\n  ${expected[0]}`);
  }
  const found = [];
  for (const l of wwjText.slice(idx).split("\n")) {
    const line = l.endsWith("\r") ? l.slice(0, -1) : l;
    if (!line.startsWith(">")) break;
    found.push(line);
  }
  eq(found.length, expected.length, `${WWJ_REL} rendered block line count for ${RULE_ID}`);
  found.forEach((l, i) => eq(l, expected[i], `${WWJ_REL} rendered block line ${i + 1}`));
}

function partA() {
  const snapshot = read(SNAPSHOT_REL);
  const row = assertRegistryRow(snapshot);
  assertCanonicalHome(read(WWJ_REL), row.statement);
  return row;
}

// --- Part B: the controls ------------------------------------------------------------------------
//
// Each fixture is the REAL shipped file (or the real statement) with exactly one thing changed,
// and the arm that covers it must throw. Anything that does not throw is reported as a vacuous
// assertion, by name.

function mustThrow(what, fn) {
  let threw = false;
  try { fn(); } catch { threw = true; }
  if (!threw) {
    throw new Error(`CONTROL DID NOT TRIP: ${what}. The matching assertion in Part A is therefore vacuous -- it would pass on a regressed tree.`);
  }
}

function partB(row) {
  // (i) the registry row deleted from the snapshot -- the state of origin/dev before this ticket.
  const snapshot = read(SNAPSHOT_REL);
  const withoutRow = snapshot.split(/\r?\n/).filter(l => !l.startsWith(`| ${RULE_ID} |`)).join("\n");
  if (withoutRow === snapshot) throw new Error("control (i) removed nothing -- the snapshot row is not shaped as expected");
  mustThrow("the snapshot with this rule's row deleted", () => assertRegistryRow(withoutRow));

  // (ii) the marker comment removed, and NOTHING else changed -- the heading and the rendered text
  // are both still perfectly in place. This is the arm that separates "the text happens to match
  // today" from "the text is policed", and it is the shape a well-meaning tidy-up would really
  // have.
  const wwj = read(WWJ_REL);
  const unmarked = wwj.replace(`{{rule:${RULE_ID}}}`, "rule " + RULE_ID);
  if (unmarked === wwj) throw new Error("control (ii) changed nothing -- the marker is not where expected");
  mustThrow("the canonical home with the rendered-block marker removed", () => assertCanonicalHome(unmarked, row.statement));

  // (iii) ONE character changed inside the rendered block. Without this, the byte-equality arm
  // could be asserting nothing at all -- and a one-character drift is exactly what
  // render-rule-blocks.js exists to catch, so the pin must be at least that sharp.
  const drifted = wwj.replace(`> **Rule ${RULE_ID}** — By decision kind:`,
                              `> **Rule ${RULE_ID}** — by decision kind:`);
  if (drifted === wwj) throw new Error("control (iii) changed nothing -- the rendered block's first line is not as expected");
  mustThrow("one character changed inside the rendered block", () => assertCanonicalHome(drifted, row.statement));

  // (iv) the section heading removed, leaving the marker and the block intact -- a dangling
  // canonical_doc anchor with text that still reads correctly.
  const headless = wwj.replace(HEADING + "\n", "");
  if (headless === wwj) throw new Error("control (iv) removed nothing -- the heading is not shaped as expected");
  mustThrow("the canonical home with its section heading removed", () => assertCanonicalHome(headless, row.statement));

  // (v) row 1 without `dm-knowledge-cycle-card`. The matrix would still be seven rows of true
  // statements about decision kinds; it would simply no longer answer the question SES-424 was
  // filed to answer.
  const lines = row.statement.split("\n");
  const struck = [lines[0].split("dm-knowledge-cycle-card").join("the card Knowledge row"), ...lines.slice(1)].join("\n");
  if (struck === row.statement) throw new Error("control (v) changed nothing -- row 1 does not name dm-knowledge-cycle-card");
  mustThrow("row 1 with dm-knowledge-cycle-card struck out", () => assertRowOne(struck));
}

// --- Part C: the live registry, the reversal ledger, and row 1's own evidence ---------------------

async function partC(row) {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!base || !key) {
    notRun("SES-424 part C — the live registry row, its before-image under an unreversed decision, and row 1's re-pin population",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY are absent, so public.governance_rules (service_role only " +
      "since SES-174) and the runner_ ledger could not be read. Run the suite with credentials " +
      "exported (STANDARDS.md Section 2 rule 5) to cover this half.");
    return;
  }

  const root = base.replace(/\/+$/, "");
  const get = async (pathAndQuery) => {
    const res = await fetch(`${root}/rest/v1/${pathAndQuery}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) throw new Error(`${pathAndQuery} read failed: HTTP ${res.status} ${res.statusText}`);
    return res.json();
  };

  // (a) the snapshot is not stale: the LIVE statement is byte-equal to the one the docs render.
  // This is the assertion that makes Parts A and B mean anything about the platform rather than
  // about two files that agree with each other.
  const live = await get(`governance_rules?select=id,status,statement&id=eq.${encodeURIComponent(RULE_ID)}`);
  eq(Array.isArray(live) ? live.length : -1, 1, `live public.governance_rules rows for ${RULE_ID}`);
  eq(live[0].status, "live", `live ${RULE_ID}.status`);
  eq(live[0].statement, row.statement,
    `live ${RULE_ID}.statement vs ${SNAPSHOT_REL} -- re-export with node scripts/export-governance-snapshot.js`);

  // (b) the row is REVERSIBLE, which is this rule's own promise applied to itself: an INSERT owes
  // a before-image with row_data NULL, under a decision that is still standing. A rule filed
  // without one is a rule the platform cannot take back, which is the exact shape of authority
  // this matrix says the manager does not have.
  const images = await get(
    "runner_before_images?select=id,row_data,decision_id&table_name=eq.governance_rules" +
    `&pk_value=eq.${encodeURIComponent(RULE_ID)}`);
  const nullImages = (images || []).filter(i => i.row_data === null && i.decision_id);
  if (!nullImages.length) {
    throw new Error(`no runner_before_images row (governance_rules / ${RULE_ID}) with row_data NULL and a decision_id -- the INSERT is not reversible, and "no before-image logged -> the write does not happen" (ARCHITECTURE.md §19v).`);
  }

  const ids = [...new Set(nullImages.map(i => i.decision_id))];
  const decisions = await get(
    `runner_decisions?select=id,kind,backlog_id,status,reversed_at,expires_at&id=in.(${ids.join(",")})`);
  const standing = (decisions || []).filter(
    d => d.backlog_id === "SES-424" && d.kind === "rule" && d.status !== "reversed" && d.reversed_at === null);
  if (!standing.length) {
    throw new Error(`the before-image for ${RULE_ID} hangs off no UNREVERSED SES-424 decision of kind 'rule' (found: ${JSON.stringify(decisions)}) -- a reversed handle means this matrix is no longer standing.`);
  }

  // (c) ROW 1'S OWN EVIDENCE. The row claims to RECORD practice, not to create it; this is the
  // population that makes that true. Every row must name a ticket -- a re-pin under no ticket is
  // the case AGENT-ROW-AGREED-TICKET reserves to John, and row 1 does not cover it.
  const repins = await get(
    "runner_decisions?select=id,backlog_id,status,reversed_at&kind=eq.agent-row" +
    "&summary=ilike.*dm-knowledge-cycle-card*");
  if (!Array.isArray(repins) || repins.length < 12) {
    throw new Error(`row 1 records ${repins?.length ?? "no"} agent-row re-pin decision(s) on dm-knowledge-cycle-card; the rule was filed on a floor of 12 unreversed ones and the population only grows. Fewer means the ledger was rewritten, not that practice changed.`);
  }
  const unticketed = repins.filter(d => !d.backlog_id);
  if (unticketed.length) {
    throw new Error(`${unticketed.length} agent-row re-pin decision(s) carry a NULL backlog_id (${unticketed.map(d => d.id).join(", ")}) -- row 1 covers the re-pin UNDER THE TICKET whose edit moved the card; an unticketed one is AGENT-ROW-AGREED-TICKET's reserved case and is John's, not the manager's.`);
  }
  const reversedRepins = repins.filter(d => d.status === "reversed" || d.reversed_at !== null);
  if (reversedRepins.length) {
    throw new Error(`${reversedRepins.length} of the ${repins.length} re-pin decisions have been reversed (${reversedRepins.map(d => d.id).join(", ")}) -- row 1 is written on an UNREVERSED pattern; a reversal is John overruling it and the rule owes a re-read.`);
  }

  console.log(`  [SES-424] live ${RULE_ID}: statement byte-equal to ${SNAPSHOT_REL}; ` +
    `${nullImages.length} before-image(s) row_data NULL under unreversed decision ` +
    `${standing.map(d => `${d.id} (${d.kind}, expires ${d.expires_at})`).join(", ")}; ` +
    `row 1 evidence: ${repins.length} agent-row re-pins, all ticketed, none reversed`);
}

async function run() {
  const row = partA();
  partB(row);
  await partC(row);
}

selfRun(import.meta.url, run);
export default run;
