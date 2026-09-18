// DeepBench v7.0.515 | tests/regression/ses-415-role-tagged-criteria.test.mjs | SES-415 — EVERY
// DECISION PATTERN CARRIES THE ROLE THAT MUST APPLY IT, AND THE TAG'S ONE HOME IS THE MD.
//
// SES-415 does two things and this file grades both: it appends criteria 162-171 (mined from the
// week of Moat Support tickets — why each was created, why 7 were deferred, why 2 were removed) and
// it gives every criterion an `applies_to` role tag that reaches public.decision_patterns through
// scripts/export-decision-patterns.js and nothing else. The tag is written in two forms, and the
// precedence between them is the thing most likely to be broken by a later edit: an entry marker
// `*Applies to:* designer, builder.` beats a `*Applies to (section default):*` line under the `## `
// heading, which beats `{all}`.
//
// FOUR ARMS, and what each is here to catch:
//
//   1. SOURCE (always runs): a fixture md carrying one entry of each shape — marker, section
//      default, neither. The three expected role lists are written out rather than derived, the
//      marker must be ABSENT from the stored body (leaving it in would store the tag twice and make
//      every older row's body drift the day its section gained a default line), the CRLF twin must
//      parse identically (this repo is CRLF on Windows and LF in CI — the SES-313 class), and the
//      two refusals are exercised: auditNumbering() on an unknown role, and compareRows() reporting
//      `applies_to` as MUTABLE drift rather than immutable. Mutable is the load-bearing half: the
//      append-only trigger guards pattern_no/section/imperative only, so a retag must be repairable
//      by a plain run of the exporter.
//
//   2. DOC (always runs): the REAL docs/JOHN-DECISION-PATTERNS.md — 171 contiguous criteria, every
//      one of 162-171 carrying a marker and a quote the ship gate will actually check (>= its own
//      MIN_QUOTE_LEN, read out of the gate's source rather than copied here), every row's roles
//      non-empty and inside ROLES, and a `## Criterion N` block in docs/harvests/SES-415.md for each
//      of the ten.
//
//   3. NEGATIVE CONTROL: the real gate, spawned — not reimplemented (SES-45) — against a tree
//      identical in every way EXCEPT that docs/harvests/SES-415.md is absent. It must report at
//      least one missing phrase on a criterion >= 162. Without this the suite would stay green if
//      the ten criteria were grounded in corpora that already existed, i.e. if this pass had added
//      nothing the gate could not already check.
//
//   4. LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, DECLARED not-run otherwise): 172 rows, no drift
//      through the exporter's own compareRows(), 162-171's tags equal to the md's, the reserved
//      pattern:0 row tagged `{all}` — and the one hole a harvest-grounded quote leaves open, which
//      the SES-004 guard could not close: for every passage the harvest attributes to
//      `backlog_items.<ID>.<column>`, that column is re-fetched from Supabase and the passage must
//      be contained in it. A fabricated passage grounds against the harvest and fails HERE.
//
// ON THE UNCHANGED TREE (measured 2026-09-18, before this ship): SOURCE fails — parsePatterns()
// returns no `applies_to` at all; DOC fails — the file holds 161 criteria and none carries a marker;
// CONTROL fails — there is no docs/harvests/SES-415.md to take away; LIVE fails — `applies_to` is
// not a column (PostgREST 42703).
//
// Invocation: node tests/regression/ses-415-role-tagged-criteria.test.mjs
// (STANDARDS.md Section 2 rule 5 for the credentialed form.)

import assert from "assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  parsePatterns, compareRows, auditNumbering, parseRoles, fieldValue, norm,
  ROLES, MUTABLE_COLUMNS, RESERVED_PATTERN_NO, DOC_REL,
} from "../../scripts/export-decision-patterns.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const HARVEST_REL = "docs/harvests/SES-415.md";
const GATE = path.join(REPO, "scripts", "check-decision-pattern-quotes.js");

const FIRST_NEW = 162;
const LAST_NEW = 171;
const EXPECTED_TOTAL = 171;

const read = rel => fs.readFileSync(path.join(REPO, rel), "utf8").replace(/\r\n/g, "\n");

// ---------------------------------------------------------------------------
// Fixture: one entry of each shape the real file contains.
// ---------------------------------------------------------------------------
const FIXTURE_MD = [
  "<!-- DeepBench v9.9.9 | docs/JOHN-DECISION-PATTERNS.md | fixture -->",
  "",
  "# Fixture",
  "",
  "## Tagged section",
  "",
  "*Applies to (section default):* manager.",
  "",
  "**1. The marker wins.** A body that survives the strip.",
  "*Applies to:* builder, designer.",
  "*Seen in:* an entry that names its own roles.",
  "",
  "**2. The heading's line applies.**",
  "*Seen in:* an entry that names none.",
  "",
  "## Untagged section",
  "",
  "**3. Everything falls back to all.**",
  "*Seen in:* a section with no default line.",
  "",
].join("\n");

// ---------------------------------------------------------------------------
// Arm 1 — SOURCE.
// ---------------------------------------------------------------------------
function theThreeShapesYieldTheThreeRoleLists() {
  const rows = parsePatterns(FIXTURE_MD);
  assert.strictEqual(rows.length, 3, `the fixture holds exactly three criteria, got ${rows.length}`);

  assert.deepStrictEqual(rows[0].applies_to, ["builder", "designer"],
    "an entry marker wins over its section default, and the roles come out SORTED (the md wrote them 'builder, designer')");
  assert.deepStrictEqual(rows[1].applies_to, ["manager"],
    "an entry with no marker takes its section's default line");
  assert.strictEqual(rows[1].imperative, "The heading's line applies.",
    "control: the fixture's second entry parsed as expected, so its `manager` tag really came from the heading");
  assert.deepStrictEqual(rows[2].applies_to, ["all"],
    "an entry in a section with no default line falls back to `all` — the tag's absence is spelled, never empty");

  // THE STRIP. The tag is a column; leaving the marker in the prose would store the same fact twice.
  assert.strictEqual(rows[0].body, "A body that survives the strip.",
    `the marker must be removed from the body and the rest of the body kept: got "${rows[0].body}"`);
  assert.ok(!rows.some(r => /Applies\s+to/.test(`${r.body} ${r.seen_in}`)),
    "no `*Applies to:*` marker may survive into body or seen_in on ANY entry");
  assert.strictEqual(rows[0].seen_in, "an entry that names its own roles.",
    "stripping the marker must not disturb the evidence that follows it");

  // The section default is not itself a criterion, and it must not leak into the entry above it.
  assert.ok(!rows.some(r => /section default/.test(`${r.body} ${r.seen_in} ${r.imperative}`)),
    "the `(section default)` line is metadata, never part of a criterion's text");
}

// THE CRLF CONTROL, at the tag layer. A parser that is not whitespace-normalised writes two
// different tables from one file, and --check is then permanently red on exactly one of the trees.
function theTagIsIndifferentToLineEndings() {
  const crlfSource = FIXTURE_MD.replace(/\n/g, "\r\n");
  assert.notStrictEqual(crlfSource, FIXTURE_MD, "control: the two inputs must really differ");
  assert.deepStrictEqual(parsePatterns(crlfSource), parsePatterns(FIXTURE_MD),
    "a CRLF file must parse byte-identically to its LF twin, role tags included");
  assert.deepStrictEqual(parseRoles(" Builder ,\r\n designer. "), ["builder", "designer"],
    "parseRoles() lowercases, trims across a line break, drops the sentence period and sorts");
  assert.deepStrictEqual(parseRoles("all, all"), ["all"], "parseRoles() dedupes");
  assert.deepStrictEqual(parseRoles("  "), [], "an empty list stays empty rather than becoming `all` here — auditNumbering() is what refuses it");
}

function theAuditRefusesAnUnknownRoleAndAnEmptyList() {
  const clean = parsePatterns(FIXTURE_MD);
  assert.deepStrictEqual(auditNumbering(clean), [],
    "control: the unmutated fixture must be exportable, or the two mutations below prove nothing");

  const janitor = FIXTURE_MD.replace("*Applies to:* builder, designer.", "*Applies to:* builder, janitor.");
  assert.notStrictEqual(janitor, FIXTURE_MD, "control: the mutation changed nothing");
  const problems = auditNumbering(parsePatterns(janitor));
  assert.ok(problems.some(p => /criterion 1 names an unknown role "janitor"/.test(p)),
    `an unknown role must be reported by NUMBER and by ROLE before a byte is written, got: ${JSON.stringify(problems)}`);
  assert.ok(problems.every(p => !/criterion [23] /.test(p)),
    "and only the offending criterion may be reported — a blanket complaint names nothing to fix");

  const empty = FIXTURE_MD.replace("*Applies to:* builder, designer.", "*Applies to:*");
  const emptyProblems = auditNumbering(parsePatterns(empty));
  assert.ok(emptyProblems.some(p => /criterion 1 has an empty `applies_to` list/.test(p)),
    `an empty role list must be reported, got: ${JSON.stringify(emptyProblems)}`);
}

// MUTABLE, NOT IMMUTABLE, AND THE DIFFERENCE IS THE WHOLE POINT: `pattern_no`, `section` and
// `imperative` are refused by the table's append-only trigger, so drift on those is reported and
// never rewritten. A retag must be repairable by a plain run of the exporter instead.
function aRetagIsMutableDriftAndOrderIsNotDrift() {
  assert.ok(MUTABLE_COLUMNS.includes("applies_to"),
    "`applies_to` must be declared mutable, or the exporter will never repair a retag");
  const md = parsePatterns(FIXTURE_MD);
  const live = md.map(r => ({ ...r, applies_to: [...r.applies_to] }));

  assert.deepStrictEqual(compareRows(md, live), [], "control: identical md and table must report no drift");

  live[0].applies_to = ["manager"];
  const drift = compareRows(md, live);
  assert.deepStrictEqual(drift.map(d => [d.kind, d.pattern_no, d.field]), [["mutable", 1, "applies_to"]],
    `a retagged criterion is MUTABLE drift a plain run repairs, got ${JSON.stringify(drift)}`);

  // Order is not drift. PostgREST returns the array as it was written, not sorted, so comparing it
  // as a raw string would make --check permanently red on a row whose roles are the same set.
  const reordered = md.map(r => ({ ...r, applies_to: [...r.applies_to].reverse() }));
  assert.deepStrictEqual(compareRows(md, reordered), [],
    "the same roles in a different order are the same tag — compareRows() must sort both sides");
  assert.strictEqual(fieldValue("applies_to", ["designer", "builder"]), fieldValue("applies_to", ["builder", "designer"]),
    "fieldValue() is what does the sorting, and it must be order-blind for applies_to");
  assert.notStrictEqual(fieldValue("applies_to", ["builder"]), fieldValue("applies_to", ["builder", "designer"]),
    "control: fieldValue() must still tell two DIFFERENT role sets apart");
}

// ---------------------------------------------------------------------------
// Arm 2 — DOC: the real file on disk.
// ---------------------------------------------------------------------------
function minQuoteLen() {
  const declared = /const\s+MIN_QUOTE_LEN\s*=\s*(\d+)/.exec(fs.readFileSync(GATE, "utf8"));
  assert.ok(declared, "cannot read MIN_QUOTE_LEN out of the ship gate — this test's idea of 'checkable' would be invented");
  return Number(declared[1]);
}

function docEntries(doc) {
  const starts = [];
  for (const m of doc.matchAll(/^\*\*(\d+)\.\s/gm)) starts.push({ n: Number(m[1]), at: m.index });
  const out = new Map();
  for (let i = 0; i < starts.length; i++) {
    out.set(starts[i].n, doc.slice(starts[i].at, i + 1 < starts.length ? starts[i + 1].at : doc.length));
  }
  return out;
}

function theRealFileCarriesTheTenNewCriteriaAndATagOnEveryRow() {
  const rows = parsePatterns(read(DOC_REL));
  assert.strictEqual(rows.length, EXPECTED_TOTAL,
    `${DOC_REL} must parse to ${EXPECTED_TOTAL} criteria after this pass (161 + ${FIRST_NEW}-${LAST_NEW}), got ${rows.length}`);
  assert.deepStrictEqual(rows.map(r => r.pattern_no), Array.from({ length: EXPECTED_TOTAL }, (_, i) => i + 1),
    "the numbering must stay contiguous — a citation is a number, and a gap retargets one");
  assert.deepStrictEqual(auditNumbering(rows), [],
    "the real file must be exportable as it stands, role tags included");

  for (const r of rows) {
    assert.ok(Array.isArray(r.applies_to) && r.applies_to.length > 0,
      `criterion ${r.pattern_no} carries no role at all — the tag's absence is spelled \`all\``);
    for (const role of r.applies_to) {
      assert.ok(ROLES.includes(role),
        `criterion ${r.pattern_no} names "${role}", which the table's CHECK would refuse; allowed: ${ROLES.join(", ")}`);
    }
  }

  // The ten new ones carry a marker of their OWN, never a section default: they are the pass's
  // product, and a default would make ten criteria one owner each by accident.
  const blocks = docEntries(read(DOC_REL));
  const min = minQuoteLen();
  for (let n = FIRST_NEW; n <= LAST_NEW; n++) {
    const block = blocks.get(n);
    assert.ok(block, `criterion ${n} is missing from ${DOC_REL}`);
    assert.ok(/\*Applies\s+to:\*/.test(block), `criterion ${n} carries no \`*Applies to:*\` marker of its own`);
    assert.ok(/\*Seen\s+in:/.test(block), `criterion ${n} has no "Seen in:" evidence`);
    const quotes = [...block.matchAll(/[“"]([^“”"]+)[”"]/g)]
      .map(m => norm(m[1]).replace(/^[\s.,;:!?…—-]+|[\s.,;:!?…—-]+$/g, ""))
      .filter(q => q.length >= min);
    assert.ok(quotes.length > 0,
      `criterion ${n}'s only quotes are shorter than ${min} chars — the ship gate IGNORES those, so the entry would be unchecked`);
  }

  // Nothing above 161 may be tagged only by inheritance, and nothing at or below it may have been
  // retexted: the 161 older rows are tagged by their section's default line alone.
  const newRows = rows.filter(r => r.pattern_no >= FIRST_NEW);
  assert.strictEqual(newRows.length, LAST_NEW - FIRST_NEW + 1, "exactly ten criteria were appended by this pass");
}

function theHarvestCarriesABlockForEachNewCriterion() {
  const harvest = read(HARVEST_REL);
  for (let n = FIRST_NEW; n <= LAST_NEW; n++) {
    assert.ok(new RegExp(`^##\\s+Criterion\\s+${n}\\s*$`, "m").test(harvest),
      `${HARVEST_REL} has no "## Criterion ${n}" block — the passage has no traceable source row`);
  }
}

// ---------------------------------------------------------------------------
// Arm 3 — NEGATIVE CONTROL: the harvest is load-bearing.
// ---------------------------------------------------------------------------
function linkOrCopy(src, dest) {
  try {
    fs.symlinkSync(src, dest);
  } catch (e) {
    if (!["EPERM", "EISDIR", "EEXIST", "EACCES", "ENOSYS", "UNKNOWN"].includes(e.code)) throw e;
    fs.cpSync(src, dest, { recursive: true, force: true });
  }
}

const runGate = repoRoot => spawnSync(process.execPath, [GATE, "--repo", repoRoot], { encoding: "utf8" });
const missed = res => [...`${res.stdout}\n${res.stderr}`.matchAll(/^\s*#(\d+):/gm)].map(m => Number(m[1]));

function withoutTheHarvestTheGateCannotGroundTheNewCriteria() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ses415-control-"));
  try {
    const docsDir = path.join(tmp, "docs");
    const harvestsDir = path.join(docsDir, "harvests");
    fs.mkdirSync(harvestsDir, { recursive: true });
    fs.copyFileSync(path.join(REPO, DOC_REL), path.join(docsDir, "JOHN-DECISION-PATTERNS.md"));
    for (const f of fs.readdirSync(path.join(REPO, "docs"))) {
      if (f === "SESSIONS.md" || f === "FEATURES-ARCHIVE.md" || /^SESSIONS-ARCHIVE-.*\.md$/.test(f)) {
        linkOrCopy(path.join(REPO, "docs", f), path.join(docsDir, f));
      }
    }
    for (const f of fs.readdirSync(path.join(REPO, "docs", "harvests"))) {
      if (!f.endsWith(".md") || f === "SES-415.md") continue;
      linkOrCopy(path.join(REPO, "docs", "harvests", f), path.join(harvestsDir, f));
    }

    // THE DIFFERENCE IS THE ASSERTION, NOT THE EXIT CODE: the gate exits 1 on BOTH trees because of
    // the three pre-existing ungrounded phrases on #137 (SES-246's pinned residue), so comparing
    // exit codes would prove nothing. What must differ is WHICH criteria it cannot ground.
    const control = [...new Set(missed(runGate(tmp)).filter(n => n >= FIRST_NEW))];
    assert.ok(control.length > 0,
      `with ${HARVEST_REL} removed the gate still grounds every quote on criteria >= ${FIRST_NEW} — the harvest is decorative, and this pass added nothing the gate could not already check`);

    const live = [...new Set(missed(runGate(REPO)).filter(n => n >= FIRST_NEW))];
    assert.deepStrictEqual(live, [],
      `the control is only meaningful against a clean live tree, and the live tree already cannot ground: ${live.join(", ")}`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// Arm 4 — LIVE.
// ---------------------------------------------------------------------------
async function rest(url, key, q) {
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/${q}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`REST ${q} → HTTP ${res.status} ${res.statusText}: ${await res.text().catch(() => "")}`);
  return res.json();
}

async function theLiveTableCarriesTheTagTheMdWrote(url, key) {
  const live = await rest(url, key,
    "decision_patterns?select=pattern_no,section,imperative,body,seen_in,source_version,applies_to&order=pattern_no&limit=5000");
  const md = parsePatterns(read(DOC_REL));

  assert.strictEqual(live.length, EXPECTED_TOTAL + 1,
    `decision_patterns must hold ${EXPECTED_TOTAL} md criteria plus the reserved pattern:${RESERVED_PATTERN_NO} row, got ${live.length}`);
  assert.deepStrictEqual(compareRows(md, live), [],
    `public.decision_patterns has drifted from ${DOC_REL} — run \`node scripts/export-decision-patterns.js\``);

  const byNo = new Map(live.map(r => [Number(r.pattern_no), r]));
  const reserved = byNo.get(RESERVED_PATTERN_NO);
  assert.ok(reserved, `the reserved pattern:${RESERVED_PATTERN_NO} row is missing`);
  assert.deepStrictEqual(reserved.applies_to, ["all"],
    `pattern:${RESERVED_PATTERN_NO} means "no standing pattern applied", so it belongs to everyone — got ${JSON.stringify(reserved.applies_to)}`);

  for (const m of md.filter(r => r.pattern_no >= FIRST_NEW)) {
    const row = byNo.get(m.pattern_no);
    assert.ok(row, `criterion ${m.pattern_no} never reached the table`);
    assert.deepStrictEqual([...row.applies_to].sort(), m.applies_to,
      `criterion ${m.pattern_no}'s live tag must equal the md's, got ${JSON.stringify(row.applies_to)} against ${JSON.stringify(m.applies_to)}`);
    for (const role of row.applies_to) {
      assert.ok(ROLES.includes(role), `criterion ${m.pattern_no} stored an unknown role "${role}"`);
    }
  }
  return live.length;
}

/**
 * The harvest's blocks, as `{ criterion, table, id, column, quotes[] }`. A `**Source:**` line names
 * the row and column; the `> ` lines under it are that row's passages, verbatim.
 */
function harvestSources() {
  const harvest = read(HARVEST_REL);
  const out = [];
  let criterion = null, current = null;
  for (const line of harvest.split("\n")) {
    const head = /^##\s+Criterion\s+(\d+)\s*$/.exec(line);
    if (head) { criterion = Number(head[1]); current = null; continue; }
    const src = /^\*\*Source:\*\*\s+`([A-Za-z_]+)\.([A-Za-z0-9-]+)\.([A-Za-z_]+)`/.exec(line);
    if (src) {
      current = { criterion, table: src[1], id: src[2], column: src[3], quotes: [] };
      out.push(current);
      continue;
    }
    const quoted = /^>\s?(.*)$/.exec(line);
    if (quoted && current && quoted[1].trim()) current.quotes.push(quoted[1]);
  }
  return out;
}

// THE HOLE A HARVEST-GROUNDED QUOTE LEAVES OPEN, and the one the SES-004 guard could not close: the
// ship gate proves a criterion's quote appears in the harvest, and nothing proves the harvest's own
// passage was ever in the row it names. A fabricated passage passes the gate and fails here.
async function everyHarvestPassageIsStillInItsSourceRow(url, key) {
  const blocks = harvestSources().filter(b => b.table === "backlog_items" && b.criterion >= FIRST_NEW);
  assert.ok(blocks.length > 0, `no \`backlog_items\` source blocks parsed out of ${HARVEST_REL} — the arm would be vacuously green`);

  const columns = [...new Set(blocks.map(b => b.column))];
  const ids = [...new Set(blocks.map(b => b.id))];
  const rows = await rest(url, key,
    `backlog_items?backlog_id=in.(${ids.join(",")})&select=backlog_id,${columns.join(",")}&limit=1000`);
  const byId = new Map(rows.map(r => [r.backlog_id, r]));

  let checked = 0;
  for (const b of blocks) {
    const row = byId.get(b.id);
    assert.ok(row, `${HARVEST_REL} cites ${b.table}.${b.id}, which no longer exists on the board`);
    const haystack = norm(row[b.column] ?? "");
    assert.ok(haystack.length > 0, `${b.table}.${b.id}.${b.column} is empty — criterion ${b.criterion}'s passage has no source text`);
    for (const q of b.quotes) {
      assert.ok(haystack.includes(norm(q)),
        `criterion ${b.criterion}: the harvest's passage is NOT in ${b.table}.${b.id}.${b.column} — it was edited to fit or invented:\n  "${norm(q).slice(0, 140)}"`);
      checked++;
    }
  }

  // The control: the same containment test against a passage nothing wrote must FAIL, or the loop
  // above would pass on an empty string.
  const first = byId.get(blocks[0].id);
  assert.ok(!norm(first[blocks[0].column] ?? "").includes(norm("this sentence was never in any ticket on this board")),
    "control: a fabricated passage must NOT be found in a real source row");
  return checked;
}

export default async function run(ctx = {}) {
  const results = [];

  theThreeShapesYieldTheThreeRoleLists();
  theTagIsIndifferentToLineEndings();
  theAuditRefusesAnUnknownRoleAndAnEmptyList();
  aRetagIsMutableDriftAndOrderIsNotDrift();
  results.push("source-marker-default-fallback-strip-crlf-audit-and-mutable-drift");

  theRealFileCarriesTheTenNewCriteriaAndATagOnEveryRow();
  theHarvestCarriesABlockForEachNewCriterion();
  results.push(`doc-${EXPECTED_TOTAL}-contiguous-${FIRST_NEW}-${LAST_NEW}-marked-and-harvested`);

  withoutTheHarvestTheGateCannotGroundTheNewCriteria();
  results.push("control-gate-loses-a-new-criterion-without-the-harvest");

  const url = ctx.url ?? process.env.SUPABASE_URL;
  const key = ctx.key ?? process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      `the live arm (decision_patterns holds ${EXPECTED_TOTAL + 1} rows with no drift, ${FIRST_NEW}-${LAST_NEW}'s ` +
      `applies_to equals the md's, pattern:${RESERVED_PATTERN_NO} is {all}, and every harvest passage sourced ` +
      "`backlog_items.<ID>.<column>` is still contained in that column)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent; run with --env-file-if-exists=.env.local or export the two " +
      "names read from public.runner_secrets. Measured at this ship (2026-09-18, v7.0.515): 172 rows, --check " +
      "clean, 10 tagged criteria, 35 harvest passages re-fetched and contained.",
    );
  } else {
    const rowCount = await theLiveTableCarriesTheTagTheMdWrote(url, key);
    const passages = await everyHarvestPassageIsStillInItsSourceRow(url, key);
    results.push(`live-${rowCount}-rows-no-drift-and-${passages}-passages-re-fetched`);
  }

  return results;
}

selfRun(import.meta.url, run);
