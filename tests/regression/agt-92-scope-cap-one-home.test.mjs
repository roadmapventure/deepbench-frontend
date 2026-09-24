// DeepBench v7.0.570 | tests/regression/agt-92-scope-cap-one-home.test.mjs | AGT-92
//
// FEATURE: AGT-92 -- the scope-cap baseline gets ONE canonical home. Five live
// public.governance_rules rows restate the 3-files/4-tasks cap: HR-SCOPE, CAP-SCOPE-FILES,
// CAP-SCOPE-TASKS, OD-32 and OD-33. Two of them used to name a baseline HOME, and they named
// DIFFERENT ones -- CAP-SCOPE-FILES said "CLAUDE.md's hard rule", OD-33 said
// "docs/runbooks/runner-cycle.md step 5a for the baseline" -- while CAP-SCOPE-FILES was at the same
// time carrying canonical_doc = docs/STANDARDS.md#section-2-session-scope-rules. One row pointed two
// ways inside itself, so a reader who followed the sentence and a reader who followed the column
// landed in different files. docs/STANDARDS.md Section 2 is now the ONE home, and this file is what
// stops a third one appearing.
//
// THE NUMBERS ARE NOT THIS FILE'S SUBJECT. 3 and 4 did not change, no column was added, and OD-33's
// "held in NO column" is accepted M6 design -- ses-122c-class-caps.test.mjs and
// ses-285-m6-autonomy.test.mjs own the arithmetic and the fail-closed behaviour. What is guarded
// here is WHERE the baseline is said to live, which is a wording invariant across five rows and the
// two docs those rows cite.
//
// canonical_doc MOVES ON NO ROW, and that is deliberate rather than an omission. The three CAP/HR
// rows already point at Section 2; OD-32 and OD-33 point at their census anchor, which is what
// ses-234-operational-defaults.test.mjs pins byte-for-byte. Re-homing the column would have broken
// that census. So the fix is in the SENTENCE, and clause B is what keeps the sentence and the column
// both resolvable -- every doc path either one names must exist on disk.
//
// QUANTIFIED OVER THE FIVE NAMED IDS, NEVER A FILTERED SET. Every clause iterates SCOPE_CAP_IDS by
// name and fails on a missing row. `rows.filter(...).every(...)` is vacuously true when the filter
// matches nothing -- SES-280's measured trap, and the reason a snapshot that lost all five rows
// would otherwise grade green here.
//
// TWO ARMS, the split inherited from ses-280 / ses-234. Arm 1 grades docs/governance/RULES-SNAPSHOT.md,
// the committed artefact, and runs everywhere. Arm 2 grades public.governance_rules itself and runs
// only with credentials; without them it DECLARES the gap through notRun() rather than passing
// quietly. Clause `snapshot-equals-live` exists only in arm 2 by construction -- it is the clause
// that catches an amended row whose exporter was never re-run -- so it is declared not-run rather
// than silently skipped when the credentials are absent.
//
// DRY-RUN RESULT, measured against the pre-change snapshot (`git show HEAD:docs/governance/RULES-SNAPSHOT.md`)
// rather than predicted, because a guard that is green before and after its own ticket proves
// nothing:
//   * baseline-names-no-rival-home   FAILED -- CAP-SCOPE-FILES and OD-33 (both rival homes present)
//   * section-2-is-named-as-the-home FAILED -- CAP-SCOPE-FILES and OD-33 (neither named Section 2)
//   * every-named-doc-path-exists    PASSED (the old paths were real files too -- it is a resolvability
//                                    guard, not a re-statement of clause A)
//   * snapshot-equals-live           n/a on a detached pre-change copy
//
// LINE ENDINGS ARE NORMALISED BEFORE EVERY MATCH. This repo checks out CRLF while git blobs are LF
// (SES-300's false green): a statement compared across the two differs on bytes that carry no
// meaning here.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { parseSnapshot } from "./ses-280-m5-governance-rules.test.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const SNAPSHOT_REL = "docs/governance/RULES-SNAPSHOT.md";

// The five rows that restate the scope cap. NAMED, never derived from a filter.
export const SCOPE_CAP_IDS = ["HR-SCOPE", "CAP-SCOPE-FILES", "CAP-SCOPE-TASKS", "OD-32", "OD-33"];

// The two rows that name the home in prose, and therefore the two that must name Section 2.
export const HOME_NAMING_IDS = ["CAP-SCOPE-FILES", "OD-33"];

// The two rival homes AGT-92 retired. Either one reappearing in any of the five statements is a
// second home, which is the whole defect.
export const RIVAL_HOMES = [
  "The baseline is CLAUDE.md's hard rule",
  "step 5a for the baseline",
];

// The one home, as the token a statement names it by.
export const ONE_HOME = "`docs/STANDARDS.md` Section 2";

// The columns the snapshot carries, in its own order -- the live arm selects exactly these so the
// two arms are compared like for like.
export const COLUMNS = ["id", "status", "enforcement", "source_group", "canonical_doc", "superseded_by", "statement"];

// Every doc path the five statements and their canonical_doc columns are allowed to name. A path
// matched here must resolve to a real file; the anchor after `#` is stripped first.
const DOC_PATH_RE = /(?:docs\/[A-Za-z0-9._/-]+\.md|CLAUDE\.md)/g;

// Clause B would be vacuous if the extractor found nothing, so these four are asserted to be among
// what it finds: the one home, the two restatements, and the census the OD rows are homed in.
export const EXPECTED_DOC_PATHS = [
  "docs/STANDARDS.md",
  "docs/runbooks/runner-cycle.md",
  "CLAUDE.md",
  "docs/design/2026-09-09-operational-defaults-census.md",
];

const lf = s => String(s).replace(/\r\n/g, "\n");

// ---------------------------------------------------------------------------
// Pure readers
// ---------------------------------------------------------------------------

// A plain object keyed by id, so a bundle survives JSON.stringify and the vacuous-control detector
// below can compare a mutation against its original. A Map would stringify to "{}" either way.
export function byId(rows) {
  const out = {};
  for (const r of rows || []) if (r && typeof r.id === "string") out[r.id] = r;
  return out;
}

export function statementOf(rows, id) {
  const s = rows?.[id]?.statement;
  return typeof s === "string" ? lf(s) : null;
}

// Every doc path a set of rows names, from the statements AND from canonical_doc. The `#anchor` is
// not part of the path; a canonical_doc of `docs/x.md#y` resolves to `docs/x.md`.
export function docPathsNamed(rows, ids) {
  const out = new Set();
  for (const id of ids) {
    const r = rows?.[id];
    if (!r) continue;
    for (const field of [r.statement, r.canonical_doc]) {
      if (typeof field !== "string") continue;
      for (const m of lf(field).split("#")[0].matchAll(DOC_PATH_RE)) out.add(m[0]);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// The clauses, written once over one bundle so a control mutates exactly what its clause reads
// ---------------------------------------------------------------------------

export const CLAUSES = [
  {
    id: "baseline-names-no-rival-home",
    needsLive: false,
    detail:
      `across the statements of ${SCOPE_CAP_IDS.join(", ")}, neither "${RIVAL_HOMES[0]}" nor ` +
      `"${RIVAL_HOMES[1]}" occurs -- each was a rival baseline home, and two rows naming two ` +
      "different homes for one baseline is the defect AGT-92 closed. The numbers are untouched; " +
      "only WHERE the baseline is said to live is",
    test: b =>
      SCOPE_CAP_IDS.every(id => {
        const s = statementOf(b.rows, id);
        return typeof s === "string" && s.length > 0 && RIVAL_HOMES.every(h => !s.includes(h));
      }),
    offenders: b =>
      SCOPE_CAP_IDS.filter(id => {
        const s = statementOf(b.rows, id);
        return !(typeof s === "string" && s.length > 0 && RIVAL_HOMES.every(h => !s.includes(h)));
      }),
    breaks: b => ({
      ...b,
      rows: {
        ...b.rows,
        "CAP-SCOPE-FILES": {
          ...b.rows["CAP-SCOPE-FILES"],
          statement: `${b.rows["CAP-SCOPE-FILES"].statement} ${RIVAL_HOMES[0]}.`,
        },
      },
    }),
  },
  {
    id: "section-2-is-named-as-the-home",
    needsLive: false,
    detail:
      `${HOME_NAMING_IDS.join(" and ")} each name ${ONE_HOME} in their statement -- clause A alone ` +
      "would be satisfied by a row that names NO home at all, which is a different bug wearing the " +
      "same green. This is the clause that pins which home is in force",
    test: b =>
      HOME_NAMING_IDS.every(id => {
        const s = statementOf(b.rows, id);
        return typeof s === "string" && s.includes(ONE_HOME);
      }),
    offenders: b =>
      HOME_NAMING_IDS.filter(id => {
        const s = statementOf(b.rows, id);
        return !(typeof s === "string" && s.includes(ONE_HOME));
      }),
    breaks: b => ({
      ...b,
      rows: {
        ...b.rows,
        "OD-33": {
          ...b.rows["OD-33"],
          statement: b.rows["OD-33"].statement.split(ONE_HOME).join("the runbook"),
        },
      },
    }),
  },
  {
    id: "every-named-doc-path-exists",
    needsLive: false,
    detail:
      "every doc path named in the five statements and in their canonical_doc columns resolves to " +
      `a real file, and the set includes ${EXPECTED_DOC_PATHS.join(", ")} -- a home nobody can open ` +
      "is not a home, and an extractor that found nothing would make this clause vacuous",
    test: b => {
      const paths = docPathsNamed(b.rows, SCOPE_CAP_IDS);
      if (!EXPECTED_DOC_PATHS.every(p => paths.has(p))) return false;
      return [...paths].every(p => fs.existsSync(path.join(ROOT, p)));
    },
    breaks: b => ({
      ...b,
      rows: {
        ...b.rows,
        "OD-33": {
          ...b.rows["OD-33"],
          statement: b.rows["OD-33"].statement.split("docs/runbooks/runner-cycle.md").join("docs/runbooks/no-such-runbook.md"),
        },
      },
    }),
  },
  {
    id: "snapshot-equals-live",
    needsLive: true,
    detail:
      `the five rows in ${SNAPSHOT_REL} are identical, column for column, to the five rows in ` +
      "public.governance_rules. The registry is authoritative and the snapshot is its committed " +
      "copy; an amended row whose exporter was never re-run is exactly the drift this catches",
    test: b =>
      !!b.live &&
      SCOPE_CAP_IDS.every(id => {
        const s = b.rows?.[id];
        const l = b.live?.[id];
        if (!s || !l) return false;
        return COLUMNS.every(c => lf(s[c] ?? "") === lf(l[c] ?? ""));
      }),
    offenders: b =>
      SCOPE_CAP_IDS.filter(id => {
        const s = b.rows?.[id];
        const l = b.live?.[id];
        return !s || !l || !COLUMNS.every(c => lf(s[c] ?? "") === lf(l[c] ?? ""));
      }),
    breaks: b => ({
      ...b,
      live: { ...b.live, "OD-33": { ...b.live["OD-33"], statement: `${b.live["OD-33"].statement} (drifted)` } },
    }),
  },
];

// ---------------------------------------------------------------------------
// Grading
// ---------------------------------------------------------------------------

function applicable(bundle) {
  return CLAUSES.filter(c => !c.needsLive || bundle.live);
}

function grade(bundle, where) {
  for (const c of applicable(bundle)) {
    // The offending ids go in the MESSAGE, not just the detail: a reader of a red run needs to know
    // WHICH rows broke the invariant without re-deriving it, and the discriminator run this file
    // was written for (QA 1) is graded on naming them.
    const named = c.offenders ? c.offenders(bundle) : [];
    const who = named.length ? ` OFFENDING ROWS: ${named.join(", ")}.` : "";
    assert.ok(c.test(bundle), `AGT-92 clause "${c.id}" failed [${where}]:${who} ${c.detail}`);
  }
}

function everyClauseHasTeeth(bundle, where) {
  for (const c of applicable(bundle)) {
    const mutated = c.breaks(bundle);
    assert.notStrictEqual(
      JSON.stringify(mutated),
      JSON.stringify(bundle),
      `control for "${c.id}" changed NOTHING [${where}] -- it cannot prove the clause has teeth (the SES-158 failure)`,
    );
    assert.ok(
      !c.test(mutated),
      `clause "${c.id}" still passes after its own control broke the thing it checks [${where}] -- the check is vacuous`,
    );
  }
}

// META-ASSERTION: prove the control-checking above can itself fail, so a future no-op `breaks`
// cannot sail through everyClauseHasTeeth's first assert unexercised.
function aVacuousMutationFailsItsOwnControl(bundle) {
  assert.throws(
    () => {
      const mutated = bundle;
      assert.notStrictEqual(JSON.stringify(mutated), JSON.stringify(bundle), "control changed NOTHING");
    },
    /control changed NOTHING/,
    "the vacuous-control detector must itself fail on a no-op mutation",
  );
}

// A missing or garbled input must be a loud finding, not a crash with an unhelpful message.
function readersReportRatherThanCrash() {
  assert.deepStrictEqual(byId([]), {}, "no rows must index to an empty object, not throw");
  assert.deepStrictEqual(byId(null), {}, "a null row list must index to an empty object");
  assert.strictEqual(statementOf({}, "OD-33"), null, "a missing row must yield null, never undefined-as-string");
  assert.strictEqual(docPathsNamed({}, SCOPE_CAP_IDS).size, 0, "no rows must name no doc paths");
  const paths = docPathsNamed(
    { "OD-33": { statement: "see `docs/STANDARDS.md` Section 2 and CLAUDE.md", canonical_doc: "docs/design/x.md#OD-33" } },
    ["OD-33"],
  );
  assert.ok(paths.has("docs/STANDARDS.md") && paths.has("CLAUDE.md"), "both statement path forms must be extracted");
  assert.ok(paths.has("docs/design/x.md"), "a canonical_doc anchor must be stripped before the path is read");
  assert.ok(!paths.has("docs/design/x.md#OD-33"), "the anchor must never survive into a path");
  // The vacuity trap itself, stated as an assertion rather than a comment: an empty FILTERED set
  // passes every(); the named set does not.
  assert.ok([].every(() => false), "an empty set is vacuously true under every() -- this file never filters");
}

// ---------------------------------------------------------------------------
// Arm 2 -- live Supabase, READ-ONLY (credential-gated, DECLARED when it cannot run)
// ---------------------------------------------------------------------------

async function liveRows() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  const ids = SCOPE_CAP_IDS.join(",");
  const res = await fetch(
    `${url.replace(/\/+$/, "")}/rest/v1/governance_rules?select=${COLUMNS.join(",")}&id=in.(${encodeURIComponent(ids)})`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  if (!res.ok) throw new Error(`governance_rules returned HTTP ${res.status} ${res.statusText}`);
  const rows = await res.json();
  assert.strictEqual(
    rows.length,
    SCOPE_CAP_IDS.length,
    `public.governance_rules returned ${rows.length} of the ${SCOPE_CAP_IDS.length} named scope-cap rows -- ` +
      "a row was retired or renamed, and the cap it stated has no home at all",
  );
  return byId(rows);
}

async function run() {
  readersReportRatherThanCrash();

  const snapshot = lf(fs.readFileSync(path.join(ROOT, SNAPSHOT_REL), "utf8"));
  const parsed = parseSnapshot(snapshot);
  assert.ok(
    parsed.length > 50,
    `${SNAPSHOT_REL} parsed to ${parsed.length} rows -- the reader is broken or the snapshot is ` +
      "truncated; regenerate with node scripts/export-governance-snapshot.js",
  );
  const rows = byId(parsed);
  for (const id of SCOPE_CAP_IDS) {
    assert.ok(
      rows[id],
      `${id} is missing from ${SNAPSHOT_REL} -- the row was amended but the snapshot was never ` +
        "re-exported (node scripts/export-governance-snapshot.js)",
    );
  }

  const live = await liveRows();
  const bundle = { rows, live };

  grade(bundle, live ? "snapshot + live registry" : "snapshot");
  everyClauseHasTeeth(bundle, live ? "snapshot + live registry" : "snapshot");
  aVacuousMutationFailsItsOwnControl(bundle);

  if (!live) {
    notRun(
      `the live-registry clause "snapshot-equals-live" (the five scope-cap rows in ${SNAPSHOT_REL} ` +
        "compared column for column against public.governance_rules)",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent, and governance_rules is not readable " +
        "with the publishable key. The snapshot clauses above still graded all five rows, both " +
        "rival homes and every doc path they name. Canonical invocation: STANDARDS.md Section 2 rule 5.",
    );
  }
}

selfRun(import.meta.url, run);
export default run;
