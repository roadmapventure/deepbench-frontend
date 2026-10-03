// DeepBench v7.0.442 | tests/regression/ses-234-operational-defaults.test.mjs | SES-234
//
// FEATURE: SES-234 -- guards the `operational-defaults` source group in public.governance_rules
// (OD-01..OD-44), its byte-for-byte identity with its canonical home
// docs/design/2026-09-09-operational-defaults-census.md, and the shape every row in that group must
// carry: a resolvable canonical_doc, a real enforcement category, and -- for a default whose home is
// a stored column -- a column that actually exists.
//
// WHAT THIS FILE EXISTS TO PREVENT, in one sentence: "unwritten law" -- an operational default the
// machine runs on that no registry row states -- became a named class of defect at this ticket, and
// the way that class comes back is a row quietly losing its home, its statement drifting from the
// census, or a census entry being added with no row behind it.
//
// TWO ARMS, and the split is inherited from ses-280-m5-governance-rules.test.mjs rather than
// re-argued here:
//   * The SNAPSHOT arm always runs. It reads docs/governance/RULES-SNAPSHOT.md, the generated
//     repo-side copy of the registry, so an unattended cloud cycle with no credentials still gets
//     real coverage -- and an editor who inserts rows and forgets
//     `node scripts/export-governance-snapshot.js` fails here.
//   * The LIVE arm runs only with SUPABASE_URL + SUPABASE_SERVICE_KEY and is DECLARED not-run
//     otherwise (SES-180 notRun()), never silently skipped. governance_rules is service_role-only
//     since SES-174, so the anon key cannot substitute.
// The column-existence arm is LIVE-ONLY BY NATURE: a column is a fact about the database, and the
// snapshot cannot carry it. That arm is declared, not skipped.
//
// DRY-RUN RESULT, MEASURED (not reasoned) against the pre-change tree -- the RULES-SNAPSHOT.md
// committed at origin/dev 3f2cda4d, 116 rules, 0 of them OD-%: assertions 1, 2, 3 and 4 FAILED, and
// assertions 5 and 6 PASSED. Both passes were examined rather than accepted:
//   * assertion 5 passed VACUOUSLY on the first draft -- zero rows against an empty manifest is
//     0 === 0 -- so it was strengthened, before this file was committed, to require the manifest to
//     carry exactly the forty-four expected ids. It fails on the pre-change tree now.
//   * assertion 6 passes legitimately: 116 pre-change rules genuinely carry no duplicate statement.
//     That is the correct behaviour of a dedup bar on clean data and is left alone; its teeth are
//     proven by its own negative control instead.
// This is the SES-158 lesson applied to the dry run itself: a green arm in a dry run is a question,
// not a result.
//
// EVERY ASSERTION IS PAIRED WITH A NEGATIVE CONTROL: the same data with the one thing that should
// matter removed. "Would this still pass if the change did nothing?" must answer "no" for each.
// A meta-assertion (aVacuousMutationFailsItsOwnControl) pins the SES-158 lesson that a control
// which changes nothing proves nothing.
//
// WHAT THIS FILE DOES NOT COVER, declared rather than implied: it does not assert that any default
// is CORRECT, and it must never be extended to. SES-234 is a census -- it records what already
// runs. The eleven amend/retire proposals in the census doc's batch are John's to rule on, and a
// test that pinned a proposed value would be asserting a decision he has not made.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SNAPSHOT = path.join(ROOT, "docs/governance/RULES-SNAPSHOT.md");
const CENSUS_REL = "docs/design/2026-09-09-operational-defaults-census.md";
const CENSUS = path.join(ROOT, CENSUS_REL);

export const SOURCE_GROUP = "operational-defaults";
export const OD_IDS = Array.from({ length: 44 }, (_, i) => `OD-${String(i + 1).padStart(2, "0")}`);

// governance_rules_enforcement_check, read from pg_constraint this session rather than recalled.
export const ENFORCEMENT_VALUES = new Set(["hook", "script", "reviewer", "prose"]);

// THE KICKOFF'S OWN QA BAR (section 6): "Would the test pass with zero rows? No: it asserts the
// census lists at least the fifteen defaults named in section 2 by their canonical homes." These
// are those fifteen homes, as the token each one is named by inside a statement. A census that
// dropped any of them would still be a census; it would not be THIS ticket's census.
export const REQUIRED_HOMES = [
  "recompute_backlog_queue",        // the queue sort keys
  "prime_directive_queue",          // the pick lane order
  "drain_epic_next",                // the drain's own pick order
  "drain_chain_gate",               // the five chain gates
  "chain_max_noship_streak",        // the no-ship ceiling
  "cron_minute",                    // the cron grid minute
  "scheduler_gate",                 // the clock grid
  "resolve_day_token_cap",          // the token cap rungs
  "invention_floor_days",           // the invention floor
  "invention_per_rung_per_day",     // the per-rung pace
  "INTERVAL '24 hours'",            // the claim expiry
  "reversal_window_hours",          // the reversal window
  "48 HOURS",                       // the reading staleness
  "OPEN_DECISION_BATCH",            // the brief's display threshold
  "pz-rank-intent",                 // the served-class order in rank-backlog's Intent
];

// Tables whose columns a statement may cite as a default's canonical home. Every one of these is a
// governance table the runner reads; a statement naming `<table>.<column>` is asserting that column
// exists, and assertion 6 makes it prove it.
export const SETTING_TABLES = ["runner_settings", "runner_budget", "runner_ladder", "skill_profiles"];
const SETTING_RE = new RegExp(`\\b(${SETTING_TABLES.join("|")})\\.([a-z_]+)`, "g");

// ---------------------------------------------------------------------------
// Pure readers -- the snapshot format, decoded exactly as scripts/export-governance-snapshot.js
// escapes it: `\` -> `\\`, `|` -> `\|`, newline -> `\n`, `\e` for a stored empty string, an empty
// cell for SQL NULL, one space of padding per side.
// ---------------------------------------------------------------------------

export function decodeCell(s) {
  const raw = s.slice(1, -1);
  if (raw === "\\e") return "";
  if (raw === "") return null;
  let out = "";
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] !== "\\") { out += raw[i]; continue; }
    const next = raw[++i];
    out += next === "n" ? "\n" : next;
  }
  return out;
}

// A `|` inside a value always arrives as `\|`, so a pipe preceded by an ODD number of backslashes
// is data and one preceded by an even number (including zero) is a delimiter.
export function splitRow(line) {
  const cells = [];
  let cur = "";
  let slashes = 0;
  for (const ch of line) {
    if (ch === "|" && slashes % 2 === 0) { cells.push(cur); cur = ""; slashes = 0; continue; }
    slashes = ch === "\\" ? slashes + 1 : 0;
    cur += ch;
  }
  cells.push(cur);
  return cells.slice(1, -1);
}

const SNAPSHOT_COLUMNS = ["id", "status", "enforcement", "source_group", "canonical_doc", "superseded_by", "statement"];

export function parseSnapshot(text) {
  const rules = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith("| ") || !line.endsWith(" |")) continue;
    const cells = splitRow(line);
    if (cells.length !== SNAPSHOT_COLUMNS.length) continue;
    const row = {};
    SNAPSHOT_COLUMNS.forEach((c, i) => { row[c] = decodeCell(cells[i]); });
    if (row.id === "Rule" || /^-+$/.test(String(row.id ?? ""))) continue;
    rules.push(row);
  }
  return rules;
}

// The census states each default once, as the blockquote directly under its anchored heading --
// the same shape docs/RUNNER-GOV-M5-REQUIREMENTS.md uses for M5-01..M5-15.
// LINE ENDINGS ARE NORMALISED FIRST and that is not tidying: this repo's working tree is CRLF while
// a freshly authored file is LF, so `\n+>` matches one and not the other on byte-identical content
// (ses-280 measured exactly that: 15 sections before a commit, 0 after it).
export function parseCensus(text) {
  const out = new Map();
  const lf = String(text).replace(/\r\n/g, "\n");
  const re = /^### <a id="(OD-\d\d)"><\/a>[^\n]*\n+>\s(.+)$/gm;
  for (const m of lf.matchAll(re)) out.set(m[1], m[2].trim());
  return out;
}

// The census's closing "Registry row ids filed by this ticket" list, which is what makes the doc a
// manifest rather than a narrative: a row with no line here, or a line with no row, is drift.
export function parseCensusManifest(text) {
  const lf = String(text).replace(/\r\n/g, "\n");
  const at = lf.indexOf("## Registry row ids filed by this ticket");
  if (at < 0) return new Set();
  const end = lf.indexOf("\n## ", at + 1);
  const section = lf.slice(at, end < 0 ? lf.length : end);
  return new Set([...section.matchAll(/`(OD-\d\d)`/g)].map(m => m[1]));
}

export function settingHomes(rows) {
  const out = new Map(); // "table.column" -> [ids]
  for (const r of rows) {
    for (const m of String(r.statement ?? "").matchAll(SETTING_RE)) {
      const key = `${m[1]}.${m[2]}`;
      if (!out.has(key)) out.set(key, []);
      if (!out.get(key).includes(r.id)) out.get(key).push(r.id);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// The assertions, written ONCE over a plain array of rows so the snapshot arm and the live arm are
// graded by the SAME code. A second implementation per arm is SES-45's "a second implementation
// agreeing with itself".
// ---------------------------------------------------------------------------

export const ASSERTIONS = [
  {
    id: "1-forty-four-rows-live-and-shaped",
    detail:
      "all forty-four ids OD-01..OD-44 exist with status='live', source_group='operational-defaults', " +
      "a NON-EMPTY canonical_doc and an enforcement in (hook, script, reviewer, prose)",
    test: rules => {
      const byId = new Map(rules.map(r => [r.id, r]));
      return OD_IDS.every(id => {
        const r = byId.get(id);
        return !!r
          && r.status === "live"
          && r.source_group === SOURCE_GROUP
          && typeof r.canonical_doc === "string" && r.canonical_doc.trim() !== ""
          && ENFORCEMENT_VALUES.has(r.enforcement);
      });
    },
    breaks: rules => rules.map(r => (r.id === "OD-25" ? { ...r, canonical_doc: "" } : r)),
  },
  {
    id: "2-canonical-doc-points-at-its-own-anchor",
    detail:
      `each OD row's canonical_doc is exactly ${CENSUS_REL}#<its own id>. A rule pointing at another ` +
      "rule's anchor has no authoritative text of its own, and check 10 of the truth tripwire would " +
      "only WARN about it",
    // Quantified over the FORTY-FOUR EXPECTED IDS, never over "whatever OD rows happen to be here":
    // every() on a filtered set is vacuously true when the set is empty, which is how the pre-change
    // snapshot would have PASSED this.
    test: rules => {
      const byId = new Map(rules.map(r => [r.id, r]));
      return OD_IDS.every(id => byId.get(id)?.canonical_doc === `${CENSUS_REL}#${id}`);
    },
    breaks: rules => rules.map(r => (r.id === "OD-31" ? { ...r, canonical_doc: `${CENSUS_REL}#OD-30` } : r)),
  },
  {
    id: "3-statement-matches-its-canonical-home-byte-for-byte",
    detail:
      `each OD row's statement is byte-for-byte the blockquote under its anchor in ${CENSUS_REL}. The ` +
      "registry is authoritative and the census is its canonical home; a paraphrase in either " +
      "direction is exactly the drift the registry was built to end",
    test: (rules, census) => {
      const byId = new Map(rules.map(r => [r.id, r]));
      return OD_IDS.every(id => {
        const r = byId.get(id);
        return !!r && typeof r.statement === "string" && census.get(id) === r.statement;
      });
    },
    breaks: rules =>
      rules.map(r => (r.id === "OD-13" ? { ...r, statement: r.statement.replace("never", "rarely") } : r)),
  },
  {
    id: "4-the-fifteen-named-homes-are-all-covered",
    detail:
      "the fifteen canonical homes the kickoff names in its section 2 each appear in at least one " +
      "operational-defaults statement: " + REQUIRED_HOMES.join(", ") + ". This is the assertion that " +
      "answers the kickoff's own QA question -- a census missing any of them is not this census",
    test: rules => {
      const hay = rules.filter(r => r.source_group === SOURCE_GROUP).map(r => String(r.statement ?? "")).join("\n");
      return REQUIRED_HOMES.every(h => hay.includes(h));
    },
    breaks: rules =>
      rules.map(r => (r.id === "OD-40" ? { ...r, statement: r.statement.replace("OPEN_DECISION_BATCH", "a display constant") } : r)),
  },
  {
    id: "5-the-census-manifest-lists-every-row-and-only-those",
    detail:
      "the census's closing 'Registry row ids filed by this ticket' list names exactly the forty-four " +
      "OD ids in the group -- a row absent from it is a default nobody can find from the doc, and an " +
      "id listed with no row behind it is a census entry that was never filed",
    // THE LENGTH CHECK AGAINST OD_IDS IS LOAD-BEARING, and it is here because the dry run caught its
    // absence: without it, zero rows against an empty manifest is 0 === 0 and the assertion passes on
    // a tree where neither the rows nor the census exist. See the dry-run note in this file's header.
    test: (rules, _census, manifest) => {
      const present = rules.filter(r => r.source_group === SOURCE_GROUP).map(r => r.id).sort();
      const listed = [...manifest].sort();
      return listed.length === OD_IDS.length
        && present.length === listed.length
        && present.every((id, i) => id === listed[i]);
    },
    breaks: rules => rules.filter(r => r.id !== "OD-44"),
  },
  {
    id: "6-no-duplicate-live-statements",
    detail:
      "no two live rules ANYWHERE in the registry share an identical statement. This is M5-05's dedup " +
      "bar applied to this ticket's own filing, and it is the arm that fires if a default was " +
      "recorded twice under two ids",
    test: rules => {
      const live = rules.filter(r => r.status === "live").map(r => r.statement);
      return new Set(live).size === live.length;
    },
    breaks: rules => {
      const donor = rules.find(r => r.id === "OD-01");
      return rules.map(r => (r.id === "OD-44" ? { ...r, statement: donor.statement } : r));
    },
  },
];

function grade(rules, census, manifest, where) {
  for (const a of ASSERTIONS) {
    assert.ok(a.test(rules, census, manifest), `[${where}] assertion "${a.id}" failed: ${a.detail}`);
  }
}

function everyAssertionHasTeeth(rules, census, manifest) {
  for (const a of ASSERTIONS) {
    const mutated = a.breaks(rules);
    assert.notStrictEqual(
      JSON.stringify(mutated),
      JSON.stringify(rules),
      `control for "${a.id}" changed NOTHING -- it cannot prove the assertion has teeth (the SES-158 failure)`,
    );
    assert.ok(
      !a.test(mutated, census, manifest),
      `assertion "${a.id}" still passes after its own control broke the thing it checks -- the check is vacuous`,
    );
  }
}

// META-ASSERTION: prove the control-checking above can itself fail, so a future no-op `breaks`
// cannot sail through everyAssertionHasTeeth's first assert unexercised.
function aVacuousMutationFailsItsOwnControl(rules) {
  assert.throws(
    () => {
      const mutated = rules;
      assert.notStrictEqual(JSON.stringify(mutated), JSON.stringify(rules), "control changed NOTHING");
    },
    /control changed NOTHING/,
    "the vacuous-control detector must itself fail on a no-op mutation",
  );
}

// ---------------------------------------------------------------------------
// Readers that must fail loudly rather than crash
// ---------------------------------------------------------------------------

function theReadersReportRatherThanCrash() {
  assert.deepStrictEqual(parseSnapshot("# a snapshot with no table at all"), [],
    "a snapshot with no table must parse to zero rows so the caller can report it");
  assert.strictEqual(parseCensus("# a census with no anchored entries").size, 0,
    "a census with no anchored entries must parse to an empty map");
  assert.strictEqual(parseCensusManifest("# a census with no manifest section").size, 0,
    "a census with no manifest section must parse to an empty set");
  assert.strictEqual(decodeCell(" a \\| b "), "a | b", "an escaped pipe must decode back to a pipe");
  assert.strictEqual(decodeCell(" a \\n b "), "a \n b", "an escaped newline must decode back to a newline");
  assert.strictEqual(decodeCell("  "), null, "an empty cell is SQL NULL");
  assert.strictEqual(decodeCell(" \\e "), "", "the \\e marker is a stored empty string, not NULL");
  assert.deepStrictEqual(splitRow("| a | b \\| c | d |"), [" a ", " b \\| c ", " d "],
    "splitRow must not break a row on an escaped pipe");
  // The setting-home extractor is what assertion 6's live arm is built on; a broken regex there
  // would silently check ZERO columns and report green.
  const homes = settingHomes([{ id: "X", statement: "reads `runner_settings.cap_relax_rung` and `runner_budget.weekly_rest_pct`" }]);
  assert.deepStrictEqual([...homes.keys()].sort(), ["runner_budget.weekly_rest_pct", "runner_settings.cap_relax_rung"],
    "settingHomes must find every <table>.<column> home named in a statement");
}

// ---------------------------------------------------------------------------
// Arm 1 -- the snapshot (always runs)
// ---------------------------------------------------------------------------

function theSnapshotCarriesTheGroup(census, manifest) {
  const rules = parseSnapshot(fs.readFileSync(SNAPSHOT, "utf8"));
  assert.ok(
    rules.length > 100,
    `docs/governance/RULES-SNAPSHOT.md parsed to ${rules.length} rows -- the reader is broken or the ` +
      "snapshot is truncated; regenerate with node scripts/export-governance-snapshot.js",
  );
  // Graded separately from the assertions because it grades the EXPORT rather than the registry:
  // forty-four ids present in the generated file proves the re-export actually ran.
  for (const id of OD_IDS) {
    assert.ok(
      rules.some(r => r.id === id),
      `${id} is missing from docs/governance/RULES-SNAPSHOT.md -- the rows were inserted but the ` +
        "snapshot was never re-exported (node scripts/export-governance-snapshot.js)",
    );
  }
  grade(rules, census, manifest, "snapshot");
  everyAssertionHasTeeth(rules, census, manifest);
  aVacuousMutationFailsItsOwnControl(rules);
  return rules;
}

// ---------------------------------------------------------------------------
// Arm 2 -- live Supabase (credential-gated, DECLARED when it cannot run)
// ---------------------------------------------------------------------------

async function fetchLiveRules(url, key) {
  const cols = SNAPSHOT_COLUMNS.join(",");
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/governance_rules?select=${cols}&limit=1000`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`governance_rules read returned HTTP ${res.status} ${res.statusText}`);
  const body = await res.json();
  if (!Array.isArray(body)) throw new Error("governance_rules returned a non-array payload");
  return body;
}

// A column's existence, asked of the database rather than of a doc. PostgREST cannot project
// information_schema, so the question is put in the form the platform actually answers: project the
// column and see whether the request is accepted. A missing column is HTTP 400 with 42703, which is
// exactly the fact under test -- and `limit=0` means no row data crosses the wire either way.
async function columnExists(url, key, table, column) {
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/${table}?select=${encodeURIComponent(column)}&limit=0`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (res.ok) return true;
  const body = await res.text();
  if (res.status === 400 && /42703|does not exist/i.test(body)) return false;
  throw new Error(`could not decide whether ${table}.${column} exists: HTTP ${res.status} ${body}`);
}

async function theLiveRegistryAgreesAndItsColumnHomesExist(census, manifest, snapshotRules) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the live public.governance_rules arm (all six assertions against Supabase, the " +
        "snapshot-vs-registry equality, and the column-existence check for every operational-defaults " +
        "row whose canonical home is a stored column)",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent. governance_rules is service_role-only " +
        "(SES-174 locked anon/authenticated to ZERO privileges), so the anon key cannot substitute, and " +
        "a column's existence is a fact about the database that the snapshot cannot carry. The " +
        "snapshot arm above still ran and graded all six assertions against the committed render. " +
        "Canonical invocation: STANDARDS.md Section 2 rule 5.",
    );
    return;
  }

  const live = await fetchLiveRules(url, key);
  assert.ok(live.length > 100, `governance_rules returned ${live.length} rows -- refusing to grade a truncated read`);
  grade(live, census, manifest, "live registry");
  everyAssertionHasTeeth(live, census, manifest);

  // The snapshot is a pure render of the registry, so any divergence means the file was hand-edited
  // or an insert never got exported.
  const norm = rs => JSON.stringify(
    [...rs].sort((a, b) => String(a.id).localeCompare(String(b.id)))
           .map(r => SNAPSHOT_COLUMNS.map(c => (r[c] === null || r[c] === undefined ? "" : String(r[c])))),
  );
  assert.strictEqual(
    norm(snapshotRules),
    norm(live),
    "docs/governance/RULES-SNAPSHOT.md does not match public.governance_rules -- the snapshot is " +
      "stale or was hand-edited. Regenerate: node scripts/export-governance-snapshot.js",
  );

  // THE COLUMN-HOME ARM. A statement that says a default lives in `runner_settings.cap_relax_rung`
  // is making a checkable claim; this is where it gets checked.
  const homes = settingHomes(live.filter(r => r.source_group === SOURCE_GROUP));
  assert.ok(
    homes.size >= 12,
    `only ${homes.size} stored-column homes were found across the operational-defaults statements -- ` +
      "the extractor is broken or the census stopped naming its columns, and a zero-column check " +
      "reports green while measuring nothing",
  );
  for (const [home, ids] of homes) {
    const [table, column] = home.split(".");
    const exists = await columnExists(url, key, table, column);
    assert.ok(
      exists,
      `${ids.join(", ")} name${ids.length > 1 ? "" : "s"} ${home} as a canonical home, but that column ` +
        "does not exist -- the rule points at nothing, which is the same defect as an unresolvable " +
        "canonical_doc one layer down.",
    );
  }

  // The negative control for the arm above: a column that certainly does not exist must be reported
  // as absent rather than waved through, or every assertion in the loop is vacuous.
  assert.strictEqual(
    await columnExists(url, key, "runner_settings", "ses234_no_such_column"),
    false,
    "columnExists() returned true for a column that cannot exist -- the whole column-home arm is vacuous",
  );
}

async function run() {
  const censusText = fs.readFileSync(CENSUS, "utf8");
  const census = parseCensus(censusText);
  const manifest = parseCensusManifest(censusText);
  assert.strictEqual(
    census.size,
    OD_IDS.length,
    `${CENSUS_REL} carries ${census.size} anchored entries, expected ${OD_IDS.length} -- every default ` +
      "must have exactly one anchored home (its canonical_doc resolves to that anchor)",
  );

  theReadersReportRatherThanCrash();
  const snapshotRules = theSnapshotCarriesTheGroup(census, manifest);
  await theLiveRegistryAgreesAndItsColumnHomesExist(census, manifest, snapshotRules);
}

selfRun(import.meta.url, run);
export default run;
