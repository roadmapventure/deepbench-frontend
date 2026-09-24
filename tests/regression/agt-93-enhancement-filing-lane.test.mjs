// DeepBench v7.0.571 | tests/regression/agt-93-enhancement-filing-lane.test.mjs | AGT-93
//
// FEATURE: AGT-93 -- the enhancement lane reaches FILE-MATRIX and the filing template.
// `ck_backlog_scope_origin` admits SIX values (original, gate-review, john-named, discovered,
// pre-existing, enhancement). Before this ship, `governance_rules.FILE-MATRIX.statement` enumerated
// FIVE and `docs/runbooks/session-setup.md`'s filing template enumerated the same five. The platform
// therefore accepted -- and `M6-04` / `ses283_enhancement_lane` enforced admission rules on -- a
// filing value that no document told an author existed.
//
// THE GRADE IS AGAINST THE DATABASE, NEVER AGAINST A LIST IN THIS FILE. That is the whole point of
// the ticket: a test that hardcodes the six values is a second copy of the same enumeration, and the
// next value added to the constraint desynchronises the test exactly as it desynchronised the docs.
// `tests/regression/ses-234-operational-defaults.test.mjs:63` is the anti-pattern in the tree today
// (`ENFORCEMENT_VALUES`, a Set literal annotated "read from pg_constraint this session"); it was
// correct when written and is unfalsifiable now.
//
// HOW THE LIVE ARM REACHES THE CONSTRAINT, since it cannot read it directly. PostgREST does not
// expose `pg_catalog`, and two sibling tests already record that dead end in their own words --
// `ses-309-outcome-claim.test.mjs:136` ("pg_constraint is not reachable over PostgREST, so the only
// honest grade is the write itself") and `ses-282-typed-cycle-reference.test.mjs:79` ("the
// referential half is asserted through BEHAVIOUR"). So this test grades through behaviour too, and
// it does so WITHOUT WRITING ANYTHING (pattern:76 -- a test run never mutates working data; the
// ses-305 convention "no throwaway rows on the board" applies to `backlog_items` in particular,
// which the briefing page reads live):
//
//   * A value carried by a real `backlog_items` row is, necessarily, a value the constraint ADMITS
//     -- the CHECK is evaluated on every write, so the row could not exist otherwise. The observed
//     `distinct scope_origin` is therefore a sound lower bound on the admitted set, obtained with
//     zero writes.
//   * One rejection probe licenses that inference. It PATCHes a sentinel value the constraint must
//     refuse onto a single row and requires a 4xx. A refused write writes nothing, so the probe is
//     read-only by construction; if it is ACCEPTED the original value is restored immediately and
//     the test fails loudly, because a column that takes anything is not governed by a constraint
//     and the whole behavioural inference above collapses.
//
// The residual gap is declared, never swallowed (pattern:77): a constraint value that no live row
// carries yet would be invisible to this arm. Measured this session rather than assumed -- all six
// admitted values are presently carried by real rows (34 original / 58 gate-review / 75 john-named /
// 130 discovered / 21 pre-existing / 1 enhancement), so the observed set and the constraint's set
// coincide exactly today. The arm declares the gap anyway, since that coincidence is a property of
// the board on a given day and not of the test.
//
// TWO ARMS.
//   * SNAPSHOT arm (always runs, no credentials): parses the scope_origin enumeration out of BOTH
//     homes -- the FILE-MATRIX row in `docs/governance/RULES-SNAPSHOT.md` (via ses-280's own parser,
//     so a second implementation cannot quietly agree with itself, SES-45) and the filing-template
//     comment in `docs/runbooks/session-setup.md` -- and requires them to be the SAME SET. It also
//     requires the template to carry EL-01's refusal rule. Still no hardcoded list: the two homes are
//     graded against each other, which is what catches the half-ship where one is amended and the
//     other is forgotten.
//   * LIVE arm (SUPABASE_URL + SUPABASE_SERVICE_KEY, declared NOT RUN otherwise): grades both homes
//     against the set the database actually admits, in both directions.
//
// MEASURED FAILURE ON THE UNCHANGED TREE, pasted verbatim rather than predicted. Run with the
// session-setup.md edit reverted and the snapshot not yet regenerated -- i.e. exactly the tree this
// ticket started from, where the docs enumerate five and the database admits six. Run whole, the
// file exits 1 on the FIRST assertion to fire, which is the clause check, not the enumeration:
//
//   [FAIL] agt-93-enhancement-filing-lane.test.mjs -- docs/runbooks/session-setup.md lost clause
//   "template-carries-el-01-refusal-not-flagging": the filing template must say that an enhancement
//   row missing scope_rationale, enhancement_claim or predicted_cycles is UNBUILDABLE -- the
//   surrounding bullet says the matrix fields are fail-LOUD ('flagged, not refused'), which is the
//   opposite rule, and a reader who takes it at face value files an enhancement that is silently
//   never picked
//
// That assertion masks the two the ticket is really about, so the live arm was then driven directly
// against the same unchanged tree to see them fail in their own words:
//
//   [FAIL] agt-93-enhancement-filing-lane.test.mjs -- docs/governance/RULES-SNAPSHOT.md FILE-MATRIX
//   enumerates 5 scope_origin values (discovered / gate-review / john-named / original /
//   pre-existing); the database admits 6 -- missing: enhancement
//
//   [FAIL] agt-93-enhancement-filing-lane.test.mjs -- docs/runbooks/session-setup.md's filing
//   template enumerates 5 scope_origin values (discovered / gate-review / john-named / original /
//   pre-existing); the database admits 6 -- missing: enhancement
//
// A no-op tree cannot produce any of those three lines.
//
// Invocation: node tests/regression/agt-93-enhancement-filing-lane.test.mjs

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { parseSnapshot } from "./ses-280-m5-governance-rules.test.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SNAPSHOT_REL = "docs/governance/RULES-SNAPSHOT.md";
const SETUP_REL = "docs/runbooks/session-setup.md";
const read = rel => fs.readFileSync(path.join(REPO, rel), "utf8").replace(/\r\n/g, "\n");

// A value the constraint must refuse. Deliberately not a near-miss of any real value, so a pass
// cannot be an accident of spelling.
const SENTINEL = "zzz-agt-93-not-a-scope-origin";

// ---------------------------------------------------------------------------
// Parsers. One per home, each returning a SET -- order and spacing are the docs' business, the
// membership is the rule. Exported so the negative controls drive the real code, not a copy.
// ---------------------------------------------------------------------------

// FILE-MATRIX's statement carries `scope_origin (a / b / c / ...)`.
export function enumerationFromStatement(statement) {
  const m = /scope_origin\s*\(([^)]*)\)/.exec(String(statement ?? ""));
  if (!m) return null;
  return new Set(m[1].split("/").map(s => s.trim()).filter(Boolean));
}

// The filing template carries `'<a|b|c|...>',   -- scope_origin (FILE-MATRIX)`.
export function enumerationFromTemplate(text) {
  const m = /'<([^>]*)>'\s*,\s*--\s*scope_origin \(FILE-MATRIX\)/.exec(String(text ?? ""));
  if (!m) return null;
  return new Set(m[1].split("|").map(s => s.trim()).filter(Boolean));
}

const show = set => [...set].sort().join(" / ");
const missingFrom = (want, have) => [...want].filter(v => !have.has(v)).sort();

// ---------------------------------------------------------------------------
// Arm 1 -- the two homes, graded against each other. Always runs.
// ---------------------------------------------------------------------------

export const CLAUSES = [
  {
    id: "template-carries-el-01-refusal-not-flagging",
    detail:
      "the filing template must say that an enhancement row missing scope_rationale, " +
      "enhancement_claim or predicted_cycles is UNBUILDABLE -- the surrounding bullet says the " +
      "matrix fields are fail-LOUD ('flagged, not refused'), which is the opposite rule, and a " +
      "reader who takes it at face value files an enhancement that is silently never picked",
    test: s => /unbuildable/i.test(s) && /EL-01/.test(s),
    breaks: s => s.replace(/unbuildable/gi, "flagged"),
  },
  {
    id: "template-names-both-enforcing-functions",
    detail:
      "the refusal must name drain_epic_next() and prime_directive_queue() -- without them a " +
      "reader cannot find where the rule is actually enforced, and cannot tell whether it is a " +
      "convention or a gate (both were confirmed live this session to reference the admission " +
      "fields)",
    test: s => /drain_epic_next/.test(s) && /prime_directive_queue/.test(s),
    breaks: s => s.replace(/prime_directive_queue/g, "some function"),
  },
  {
    id: "template-says-plainly-that-the-lane-is-shut-today",
    detail:
      "the prose must say the lane is currently closed and name the gate that owns it -- " +
      "documenting how to file into a lane without saying file_invention_proposal() presently " +
      "raises sends an author to a dead end and reads as an invitation to try",
    test: s => /invention_requires_epic/.test(s) && /SES-369/.test(s) && /SES-430/.test(s),
    breaks: s => s.replace(/invention_requires_epic/g, "some setting"),
  },
];

function theTwoHomesEnumerateTheSameSet() {
  const snapRow = parseSnapshot(read(SNAPSHOT_REL)).find(r => r.id === "FILE-MATRIX");
  assert.ok(snapRow, `FILE-MATRIX is missing from ${SNAPSHOT_REL} entirely`);

  const fromSnapshot = enumerationFromStatement(snapRow.statement);
  assert.ok(
    fromSnapshot && fromSnapshot.size > 0,
    `${SNAPSHOT_REL} FILE-MATRIX carries no parsable 'scope_origin (...)' enumeration`,
  );

  const fromTemplate = enumerationFromTemplate(read(SETUP_REL));
  assert.ok(
    fromTemplate && fromTemplate.size > 0,
    `${SETUP_REL} carries no parsable scope_origin filing-template comment`,
  );

  assert.deepStrictEqual(
    [...fromTemplate].sort(), [...fromSnapshot].sort(),
    `the two homes of the scope_origin enumeration disagree -- ${SNAPSHOT_REL} FILE-MATRIX says ` +
      `(${show(fromSnapshot)}) and ${SETUP_REL}'s filing template says (${show(fromTemplate)}). ` +
      "One was amended and the other was not; a filing rule with two answers has none.",
  );
  return { fromSnapshot, fromTemplate };
}

function theTemplateCarriesTheEnhancementAdmissionRule() {
  const doc = read(SETUP_REL);
  for (const c of CLAUSES) {
    assert.ok(c.test(doc), `${SETUP_REL} lost clause "${c.id}": ${c.detail}`);
  }
}

// Every clause and every parser gets a control that is asserted to have CHANGED something first --
// a control that mutates nothing proves nothing (SES-158).
function everyCheckHasTeeth() {
  const doc = read(SETUP_REL);
  for (const c of CLAUSES) {
    const mutated = c.breaks(doc);
    assert.notStrictEqual(
      mutated, doc,
      `control for "${c.id}" changed NOTHING -- it cannot prove the clause has teeth (SES-158)`,
    );
    assert.ok(
      !c.test(mutated),
      `clause "${c.id}" still passes after its own control removed the thing it checks -- vacuous`,
    );
  }

  // The parsers themselves: each must return null on a home whose enumeration has been removed,
  // rather than silently returning an empty set that every comparison would then agree with.
  const snapRow = parseSnapshot(read(SNAPSHOT_REL)).find(r => r.id === "FILE-MATRIX");
  const brokenStatement = String(snapRow.statement).replace(/scope_origin \(/, "scope_origin [");
  assert.notStrictEqual(brokenStatement, snapRow.statement, "statement control changed NOTHING");
  assert.strictEqual(
    enumerationFromStatement(brokenStatement), null,
    "enumerationFromStatement() still parsed a statement whose enumeration was removed",
  );

  const brokenTemplate = doc.replace(/-- scope_origin \(FILE-MATRIX\)/, "-- scope_origin");
  assert.notStrictEqual(brokenTemplate, doc, "template control changed NOTHING");
  assert.strictEqual(
    enumerationFromTemplate(brokenTemplate), null,
    "enumerationFromTemplate() still parsed a template whose anchor comment was removed",
  );

  // And a one-value-short enumeration must be caught, not rounded off.
  const short = String(snapRow.statement).replace(" / pre-existing", "");
  assert.notStrictEqual(short, snapRow.statement, "short-enumeration control changed NOTHING");
  assert.ok(
    enumerationFromStatement(short).size === enumerationFromStatement(snapRow.statement).size - 1,
    "dropping a value from the enumeration did not change the parsed set size",
  );
}

// ---------------------------------------------------------------------------
// Arm 2 -- live. Read-only over PostgREST, save for one probe the constraint must refuse.
// ---------------------------------------------------------------------------

async function pg(url, key, pathAndQuery, init) {
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, ...(init?.headers ?? {}) },
  });
  return res;
}

async function pgJson(url, key, pathAndQuery) {
  const res = await pg(url, key, pathAndQuery);
  if (!res.ok) throw new Error(`${pathAndQuery} returned HTTP ${res.status} ${res.statusText}`);
  return res.json();
}

// The probe that licenses "a value on a live row is an admitted value". Writes nothing on success.
async function theColumnIsActuallyGovernedByAConstraint(url, key) {
  const rows = await pgJson(
    url, key,
    "backlog_items?select=backlog_id,scope_origin&scope_origin=not.is.null&order=backlog_id.asc&limit=1",
  );
  if (rows.length !== 1) {
    notRun(
      "the rejection probe that licenses the behavioural inference",
      "no backlog_items row currently carries a non-null scope_origin, so there is nothing safe to " +
        "attempt the refused write against. The admitted-set comparison below is therefore resting " +
        "on an unproven premise and should be read as such.",
    );
    return;
  }
  const { backlog_id: id, scope_origin: original } = rows[0];

  const res = await pg(url, key, `backlog_items?backlog_id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ scope_origin: SENTINEL }),
  });

  if (res.ok) {
    // The constraint did NOT refuse. Put the row back before failing -- a test that corrupts the
    // board on its way out is worse than the gap it found.
    await pg(url, key, `backlog_items?backlog_id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope_origin: original }),
    });
    assert.fail(
      `scope_origin accepted the sentinel value ${JSON.stringify(SENTINEL)} on ${id} -- the column ` +
        "is not governed by ck_backlog_scope_origin, so no live row's value proves anything about " +
        "an admitted set. The row has been restored; the finding stands.",
    );
  }

  assert.ok(
    res.status >= 400 && res.status < 500,
    `the refused write returned HTTP ${res.status}; a constraint violation should surface as 4xx, ` +
      "and anything else means the probe did not reach the constraint",
  );

  // Belt and braces: the refused write must have written nothing.
  const after = await pgJson(
    url, key,
    `backlog_items?select=scope_origin&backlog_id=eq.${encodeURIComponent(id)}`,
  );
  assert.strictEqual(
    after[0]?.scope_origin, original,
    `${id}.scope_origin changed despite the write being refused -- the probe was not read-only`,
  );
}

async function bothHomesMatchWhatTheDatabaseAdmits(url, key) {
  const rows = await pgJson(url, key, "backlog_items?select=scope_origin&scope_origin=not.is.null&limit=2000");
  const admitted = new Set(rows.map(r => r.scope_origin));
  assert.ok(admitted.size > 0, "no scope_origin values are carried by any live row -- nothing to grade against");

  const snapRow = parseSnapshot(read(SNAPSHOT_REL)).find(r => r.id === "FILE-MATRIX");
  const fromSnapshot = enumerationFromStatement(snapRow?.statement);
  const fromTemplate = enumerationFromTemplate(read(SETUP_REL));

  for (const [rel, documented] of [[SNAPSHOT_REL, fromSnapshot], [SETUP_REL, fromTemplate]]) {
    assert.ok(documented, `${rel} carries no parsable scope_origin enumeration`);

    // Direction 1 -- every value the database admits must be documented. THIS is the AGT-93 defect:
    // a value the platform accepts that no document tells an author exists.
    const undocumented = missingFrom(admitted, documented);
    assert.deepStrictEqual(
      undocumented, [],
      `${rel}${rel === SNAPSHOT_REL ? " FILE-MATRIX" : "'s filing template"} enumerates ` +
        `${documented.size} scope_origin values (${show(documented)}); the database admits ` +
        `${admitted.size} -- missing: ${undocumented.join(", ")}`,
    );

    // Direction 2 -- and nothing documented may be a value the platform would refuse. An invented
    // value in the template is the same defect pointing the other way.
    const invented = missingFrom(documented, admitted);
    assert.deepStrictEqual(
      invented, [],
      `${rel} documents scope_origin value(s) ${invented.join(", ")} that no live row carries -- ` +
        "either the constraint refuses them and the doc is wrong, or they are correct and this " +
        "test's behavioural sampling has gone stale. Both are findings.",
    );
  }

  notRun(
    "an admitted scope_origin value that NO live row carries yet",
    "PostgREST cannot read pg_constraint (recorded independently by ses-309 and ses-282), so the " +
      "admitted set is sampled from the values real rows carry, licensed by the rejection probe " +
      "above. Measured this session: all six values ck_backlog_scope_origin admits are presently " +
      "carried by rows, so the sample is complete today -- but a seventh value added to the " +
      "constraint and not yet used would not be caught here.",
  );
}

async function run() {
  theTwoHomesEnumerateTheSameSet();
  theTemplateCarriesTheEnhancementAdmissionRule();
  everyCheckHasTeeth();

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the live arm: both homes graded against the scope_origin set the database actually admits",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent. The snapshot arm above still required " +
        "the two homes to enumerate the same set as each other and graded EL-01's refusal rule, so " +
        "a half-ship is still caught here; what is not caught without credentials is both homes " +
        "being wrong in the same way, which is the state AGT-93 found.",
    );
    return;
  }
  await theColumnIsActuallyGovernedByAConstraint(url, key);
  await bothHomesMatchWhatTheDatabaseAdmits(url, key);
}

selfRun(import.meta.url, run);
export default run;
