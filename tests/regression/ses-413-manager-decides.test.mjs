// DeepBench v7.0.514 | tests/regression/ses-413-manager-decides.test.mjs | SES-413 slice 1
//
// Pins governance rule MANAGER-DECIDES-BY-DEFAULT (public.governance_rules, canonical home
// docs/WORKING-WITH-JOHN.md#decision-autonomy-tiers) and the two documents that carry it: the
// rewritten Decision Autonomy Tiers section, and docs/governance/ASKS-TO-JOHN.md, the 27-row
// census of every place that asks John today.
//
// WHAT THIS FILE IS FOR, stated narrowly so a later editor does not widen it into a doc linter:
// the rule's whole claim is that the DEFAULT moved -- the manager decides, and only three calls
// stay John's. Three things can silently undo that claim without breaking any other guard:
//   (1) the registry row is edited or dropped, and the docs keep saying the old thing;
//   (2) the rendered block in WORKING-WITH-JOHN.md drifts from the registry statement;
//   (3) the inventory quietly regrows a `kept` row, moving an ask back to John one at a time.
// Each arm below targets exactly one of those, and each has a control that proves it can go red.
//
// WHY EVERY ARM HAS A NEGATIVE CONTROL (STANDARDS.md Section 4, the LOO-013 lesson: assert WHICH
// BRANCH FIRED). Every assertion here is a "this string is present / this count is N" test, and
// that shape passes vacuously against a file whose content never mattered -- the SES-28 failure.
// So each assertion is a PURE FUNCTION OVER TEXT, and Part B feeds each one a fixture differing in
// exactly ONE thing and requires it to throw. A suite that only ran Part A would pass against
// assertion bodies that had been commented out.
//
// THE FIXTURES ARE MUTATIONS OF THE REAL SHIPPED FILES, never invented documents. A hand-written
// fixture proves the assertion can reject SOMETHING; a one-edit mutation of the committed file
// proves it rejects THE THING THAT WOULD ACTUALLY REGRESS. Specifically: the snapshot with this
// rule's row deleted, the real WORKING-WITH-JOHN.md with the retired `Tier 3 - ask first, always`
// heading pasted back in, the real inventory with one row removed, and the real rendered block
// with one character changed.
//
// CREDENTIAL SPLIT, the SES-180 rule. Parts A and B run everywhere and are the substance of the
// pin. Part C reaches the live registry and ledger, and DECLARES itself not-run where credentials
// are absent rather than skipping silently -- an invisible gap is indistinguishable from coverage.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SNAPSHOT_REL = "docs/governance/RULES-SNAPSHOT.md";
const WWJ_REL = "docs/WORKING-WITH-JOHN.md";
const INVENTORY_REL = "docs/governance/ASKS-TO-JOHN.md";

const RULE_ID = "MANAGER-DECIDES-BY-DEFAULT";

// The retired vocabulary. These are the strings that MEANT "ask John first"; the rule's claim is
// false while any of them is still live text in the canonical home.
const RETIRED_PHRASES = ["Tier 3 — ask first, always", "Tier-3 case", "Tier 3 territory"];

// A kept row owes the reserved call it belongs to, in its own Why cell. Without this the `kept`
// count alone would be satisfied by seven rows saying nothing.
const RESERVED_CALL = /money|production|hire|switch|ruling|undo/;

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
// A LOCAL reader for one row rather than an import, and that is a scope decision stated rather
// than smuggled: scripts/render-rule-blocks.js calls main() at module scope, so importing it would
// RUN the checker as a side effect of this test, and scripts/export-governance-snapshot.js exports
// a writer, not a parser. The format contract is written in the snapshot's own header (one space
// of padding per side; `\` `|` and newline escaped; empty cell = NULL). Splitting on UNESCAPED
// pipes is the part that matters -- a plain split("|") over-produces cells on any statement
// containing a pipe and would drop the rule SILENTLY, which is the one failure mode a pin must not
// have.
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
  eq(row.canonical_doc, "docs/WORKING-WITH-JOHN.md#decision-autonomy-tiers", `${RULE_ID}.canonical_doc`);
  eq(row.superseded_by, null, `${RULE_ID}.superseded_by`);

  const lines = row.statement.split("\n");
  eq(lines.length, 4, `${RULE_ID}.statement line count`);

  // One load-bearing clause per line. Deliberately NOT a byte-copy of the whole statement: a
  // full copy here would be a fourth hand-maintained home of the rule text, and every registry
  // reword would land as a red test rather than as the doc drift this file is actually watching.
  // These four are the clauses that CARRY the rule -- reword any of them and the default moved.
  const owes = [
    [0, "The Development Manager (GV-01) first", "line 1 must route the ask to the manager"],
    [0, "runner_decisions", "line 1 must say the decision is recorded so it can be reversed"],
    [1, "spending money", "line 2 must reserve spending money"],
    [1, "dev -> main", "line 2 must reserve releasing to production"],
    [1, "agents.is_active", "line 2 must reserve hiring or switching on agents"],
    [2, "counted weekly, target zero", "line 3 must count the questions that still reach John"],
    [3, "an attended session stands in for the manager", "line 4 must name the stand-in until SES-402 ships"],
  ];
  for (const [i, needle, what] of owes) {
    if (!lines[i].includes(needle)) {
      throw new Error(`${RULE_ID}.statement ${what} -- line ${i + 1} reads: ${JSON.stringify(lines[i])}`);
    }
  }
  return row;
}

export function assertCanonicalHome(wwjText, statement) {
  // (a) the marker. Without it the block below is hand-typed prose that render-rule-blocks.js does
  // not police, and the whole drift guarantee is gone even while the text still happens to match.
  const marker = `{{rule:${RULE_ID}}}`;
  if (!wwjText.includes(marker)) {
    throw new Error(`${WWJ_REL} carries no ${marker} marker -- the rule text there is unpoliced prose.`);
  }

  // (b) the rendered block, byte-equal to the registry statement.
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

  // (c) the retired vocabulary is GONE. (b) alone passes happily on a document that ALSO still
  // says "ask first, always" three paragraphs up -- a file contradicting itself, with the rendered
  // block as the part nobody reads.
  for (const phrase of RETIRED_PHRASES) {
    if (wwjText.includes(phrase)) {
      throw new Error(`${WWJ_REL} still carries the retired ask-first vocabulary ${JSON.stringify(phrase)} -- the default did not actually move.`);
    }
  }
}

export function assertInventory(inventoryText) {
  const rows = inventoryText.split(/\r?\n/).filter(l => /^\| A-\d{2} \|/.test(l));
  eq(rows.length, 27, `${INVENTORY_REL} row count`);

  // Numbered A-01..A-27, in order and without a gap: a census with a hole in it is a census that
  // quietly stopped covering something.
  rows.forEach((line, i) => {
    const want = `A-${String(i + 1).padStart(2, "0")}`;
    const got = line.slice(2, 2 + want.length);
    eq(got, want, `${INVENTORY_REL} row ${i + 1} id`);
  });

  let moved = 0;
  let kept = 0;
  for (const line of rows) {
    const cells = line.split("|").map(c => c.trim());
    const [, id, , , mark, why] = cells;
    if (mark === "moved-to-manager") { moved++; continue; }
    if (mark === "kept") {
      kept++;
      if (!RESERVED_CALL.test(why)) {
        throw new Error(`${INVENTORY_REL} ${id} is kept but its Why names no reserved call (${RESERVED_CALL}) -- a kept row must say WHICH of John's calls it is, or it is just an ask nobody moved. Why reads: ${JSON.stringify(why)}`);
      }
      continue;
    }
    throw new Error(`${INVENTORY_REL} ${id} carries Mark ${JSON.stringify(mark)}; the only two values are "moved-to-manager" and "kept".`);
  }

  eq(moved, 20, `${INVENTORY_REL} moved-to-manager count`);
  eq(kept, 7, `${INVENTORY_REL} kept count`);
}

function partA() {
  const snapshot = read(SNAPSHOT_REL);
  const row = assertRegistryRow(snapshot);
  assertCanonicalHome(read(WWJ_REL), row.statement);
  assertInventory(read(INVENTORY_REL));
  return row;
}

// --- Part B: the controls ------------------------------------------------------------------------
//
// Each fixture is the REAL shipped file with exactly one thing changed, and the arm that covers it
// must throw. Anything that does not throw is reported as a vacuous assertion, by name.

function mustThrow(what, fn) {
  let threw = false;
  try { fn(); } catch { threw = true; }
  if (!threw) {
    throw new Error(`CONTROL DID NOT TRIP: ${what}. The matching assertion in Part A is therefore vacuous -- it would pass on a regressed tree.`);
  }
}

function partB(row) {
  // (i) the registry row deleted from the snapshot -- the SES-413-cannot-pass-on-origin/dev state.
  const snapshot = read(SNAPSHOT_REL);
  const withoutRow = snapshot.split(/\r?\n/).filter(l => !l.startsWith(`| ${RULE_ID} |`)).join("\n");
  if (withoutRow === snapshot) throw new Error("control (i) removed nothing -- the snapshot row is not shaped as expected");
  mustThrow("the snapshot with this rule's row deleted", () => assertRegistryRow(withoutRow));

  // (ii) the canonical home with the retired ask-first heading pasted back in, and NOTHING else
  // changed -- the marker and the rendered block are still perfectly in place. This is the arm
  // that separates "the text matches" from "the default moved", and it is the shape a half-done
  // rewrite would really have.
  const wwj = read(WWJ_REL);
  const relapsed = wwj.replace("## Decision Autonomy Tiers", `## Decision Autonomy Tiers\n\n**${RETIRED_PHRASES[0]}:**`);
  if (relapsed === wwj) throw new Error("control (ii) changed nothing -- the tiers heading is not where expected");
  mustThrow("the canonical home still carrying `Tier 3 — ask first, always`", () => assertCanonicalHome(relapsed, row.statement));

  // (iii) ONE character changed inside the rendered block. Without this, the byte-equality arm
  // above could be asserting nothing at all -- and a one-character drift is exactly what
  // render-rule-blocks.js exists to catch, so the pin must be at least that sharp.
  const drifted = wwj.replace(`> **Rule ${RULE_ID}** — Anything that would come to John`,
                              `> **Rule ${RULE_ID}** — anything that would come to John`);
  if (drifted === wwj) throw new Error("control (iii) changed nothing -- the rendered block's first line is not as expected");
  mustThrow("one character changed inside the rendered block", () => assertCanonicalHome(drifted, row.statement));

  // (iv) 26 rows instead of 27 -- an ask dropping out of the census unnoticed.
  const inventory = read(INVENTORY_REL);
  const short = inventory.split(/\r?\n/).filter(l => !/^\| A-26 \|/.test(l)).join("\n");
  if (short === inventory) throw new Error("control (iv) removed nothing -- row A-26 is not shaped as expected");
  mustThrow("the inventory with 25 rows", () => assertInventory(short));
}

// --- Part C: the live registry and the reversal ledger --------------------------------------------

async function partC(row) {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!base || !key) {
    notRun("SES-413 part C — the live registry row and its before-image under an unreversed decision",
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
  // about three files that agree with each other.
  const live = await get(`governance_rules?select=id,status,statement&id=eq.${encodeURIComponent(RULE_ID)}`);
  eq(Array.isArray(live) ? live.length : -1, 1, `live public.governance_rules rows for ${RULE_ID}`);
  eq(live[0].status, "live", `live ${RULE_ID}.status`);
  eq(live[0].statement, row.statement,
    `live ${RULE_ID}.statement vs ${SNAPSHOT_REL} -- re-export with node scripts/export-governance-snapshot.js`);

  // (b) the row is REVERSIBLE, which is the rule's own promise applied to the rule itself: an
  // INSERT owes a before-image with row_data NULL, under a decision that is still standing.
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
    d => d.backlog_id === "SES-413" && d.status !== "reversed" && d.reversed_at === null);
  if (!standing.length) {
    throw new Error(`the before-image for ${RULE_ID} hangs off no UNREVERSED SES-413 decision (found: ${JSON.stringify(decisions)}) -- a reversed handle means this rule is no longer John's standing word.`);
  }

  console.log(`  [SES-413] live ${RULE_ID}: statement byte-equal to ${SNAPSHOT_REL}; ` +
    `${nullImages.length} before-image(s) row_data NULL under unreversed decision ` +
    `${standing.map(d => `${d.id} (${d.kind}, expires ${d.expires_at})`).join(", ")}`);
}

async function run() {
  const row = partA();
  partB(row);
  await partC(row);
}

selfRun(import.meta.url, run);
export default run;
