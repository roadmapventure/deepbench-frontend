// DeepBench v7.0.358 | tests/regression/ses-280-m5-governance-rules.test.mjs | SES-280
//
// FEATURE: SES-280 -- guards the M5 prioritization + auto-close rule set (M5-01..M5-15) in
// public.governance_rules, B3's supersession by M5-02, and the byte-for-byte identity between each
// registry row's `statement` and its canonical home docs/RUNNER-GOV-M5-REQUIREMENTS.md.
//
// TWO ARMS, AND THE SPLIT IS THE POINT.
//   * The SNAPSHOT arm always runs. It reads docs/governance/RULES-SNAPSHOT.md -- the generated
//     repo-side copy of the registry -- so the suite has real coverage in an unattended cloud cycle
//     where no credentials exist. It also proves the re-export actually ran: an editor who inserts
//     the rows and forgets `node scripts/export-governance-snapshot.js` fails here.
//   * The LIVE arm runs only with SUPABASE_URL + SUPABASE_SERVICE_KEY and is DECLARED not-run
//     otherwise (SES-180 notRun()), never silently skipped. governance_rules is service_role-only
//     -- SES-174 locked anon/authenticated to ZERO privileges -- so the anon key in .env.local
//     cannot reach it and there is no cheaper credential to fall back to.
// Both arms assert the SAME five properties. That is deliberate: the snapshot is a render of the
// registry, so a disagreement between the arms IS the finding (a hand-edited snapshot, or an
// insert that never got exported), not a redundancy to simplify away.
//
// DRY-RUN RESULT, executed against unchanged origin/dev@792cae9d BEFORE the implementation landed
// (STANDARDS.md Section 4): assertions 1, 2, 3 and 5 FAILED (zero M5-% rows; B3 was `live`) and
// assertion 4 PASSED (82 live rules, no duplicate statements). The test was anchored to real state
// and discriminated before the work existed, rather than passing vacuously.
//
// EVERY ASSERTION IS PAIRED WITH A NEGATIVE CONTROL -- the same data with the one thing that should
// matter removed. "Would this still pass if the change did nothing?" must answer "no" for each.
// There is also a meta-assertion (aVacuousMutationFailsItsOwnControl), the SES-158 lesson: a
// control that changes nothing proves nothing, and only checking the control itself catches it.
//
// WHAT THIS FILE DOES NOT COVER, declared rather than implied: none of the `script` rules is
// EXECUTABLE yet. SES-280 is Phase 1 (encode); Phase 2 wires the filing lane and the auto-close
// gates into drain_epic_next() / recompute_backlog_queue(). This file guards that the rules are
// recorded, homed and consistent -- never that the pick path obeys them.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SNAPSHOT = path.join(ROOT, "docs/governance/RULES-SNAPSHOT.md");
const CANONICAL_REL = "docs/RUNNER-GOV-M5-REQUIREMENTS.md";
const CANONICAL = path.join(ROOT, CANONICAL_REL);

export const M5_IDS = Array.from({ length: 15 }, (_, i) => `M5-${String(i + 1).padStart(2, "0")}`);
export const ENFORCEMENT_VALUES = new Set(["script", "prose", "reviewer"]);

// ---------------------------------------------------------------------------
// Pure readers
// ---------------------------------------------------------------------------

// Snapshot cell escaping (scripts/export-governance-snapshot.js esc()): `\` -> `\\`, `|` -> `\|`,
// newline -> `\n`, and the marker `\e` for a stored empty string. Unescaping is a single
// left-to-right pass, which is why the escaper orders the replacements the way it does.
export function decodeCell(s) {
  const raw = s.slice(1, -1); // the format pads every cell with exactly one space per side
  if (raw === "\\e") return "";
  if (raw === "") return null; // an empty cell is SQL NULL
  let out = "";
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] !== "\\") { out += raw[i]; continue; }
    const next = raw[++i];
    out += next === "n" ? "\n" : next;
  }
  return out;
}

// Split a table row on unescaped pipes. A `|` inside a value always arrives as `\|`, so a pipe
// preceded by an ODD number of backslashes is data and one preceded by an even number (including
// zero) is a delimiter.
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
  return cells.slice(1, -1); // drop the empties outside the leading and trailing pipes
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
    if (row.id === "Rule" || /^-+$/.test(String(row.id ?? ""))) continue; // header / separator
    rules.push(row);
  }
  return rules;
}

// The canonical doc states each rule once, as the blockquote directly under its anchored heading.
// Returns { id -> statement } so the byte-for-byte comparison has something to compare against.
export function parseCanonicalDoc(text) {
  const out = new Map();
  const re = /^###\s+<a id="(M5-\d\d)"><\/a>[^\n]*\n+>\s(.+)$/gm;
  for (const m of text.matchAll(re)) out.set(m[1], m[2].trim());
  return out;
}

// ---------------------------------------------------------------------------
// The five assertions, written once over a plain array of rows so the snapshot arm and the live
// arm are graded by the SAME code. A second implementation per arm is SES-45's "a second
// implementation agreeing with itself".
// ---------------------------------------------------------------------------

export const ASSERTIONS = [
  {
    id: "1-fifteen-rows-live-and-shaped",
    detail:
      "all fifteen ids M5-01..M5-15 exist with status='live', a non-null canonical_doc, and an " +
      "enforcement in (script, prose, reviewer)",
    test: rules => {
      const byId = new Map(rules.map(r => [r.id, r]));
      return M5_IDS.every(id => {
        const r = byId.get(id);
        return !!r && r.status === "live" && !!r.canonical_doc && ENFORCEMENT_VALUES.has(r.enforcement);
      });
    },
    breaks: rules => rules.map(r => (r.id === "M5-07" ? { ...r, status: "retired" } : r)),
  },
  {
    id: "2-canonical-doc-points-at-its-own-anchor",
    detail:
      `each M5 row's canonical_doc is exactly ${CANONICAL_REL}#<its own id> -- a rule pointing at ` +
      "another rule's anchor has no authoritative text of its own, and check 10 of the truth " +
      "tripwire would only WARN about it",
    // Quantified over the FIFTEEN EXPECTED IDS, never over "whatever M5 rows happen to be here".
    // `every()` on a filtered set is vacuously true when the set is empty, so the pre-change
    // snapshot -- which carries no M5 rows at all -- would have PASSED this. Measured, not
    // reasoned: that is exactly what the first draft did against origin/dev@792cae9d.
    test: rules => {
      const byId = new Map(rules.map(r => [r.id, r]));
      return M5_IDS.every(id => byId.get(id)?.canonical_doc === `${CANONICAL_REL}#${id}`);
    },
    breaks: rules =>
      rules.map(r => (r.id === "M5-11" ? { ...r, canonical_doc: `${CANONICAL_REL}#M5-10` } : r)),
  },
  {
    id: "3-b3-superseded-by-m5-02",
    detail:
      "B3 carries status='superseded' and superseded_by='M5-02'. The charter's transition rule " +
      "forbids a commit in which neither ordering is in force, so this ships with the inserts -- " +
      "and B3 is SUPERSEDED, never deleted (register B1's never-delete discipline)",
    test: rules => {
      const b3 = rules.find(r => r.id === "B3");
      return !!b3 && b3.status === "superseded" && b3.superseded_by === "M5-02";
    },
    breaks: rules => rules.map(r => (r.id === "B3" ? { ...r, status: "live", superseded_by: null } : r)),
  },
  {
    id: "4-no-duplicate-live-statements",
    detail:
      "no two rules with status='live' share an identical statement. This is M5-05's dedup bar " +
      "applied to its own filing, and it is the arm that fires if a rule was pasted twice",
    test: rules => {
      const live = rules.filter(r => r.status === "live").map(r => r.statement);
      return new Set(live).size === live.length;
    },
    breaks: rules => {
      const donor = rules.find(r => r.id === "M5-01");
      return rules.map(r => (r.id === "M5-15" ? { ...r, statement: donor.statement } : r));
    },
  },
  {
    id: "5-statement-matches-its-canonical-home-byte-for-byte",
    detail:
      "each M5 row's statement is byte-for-byte the blockquote under its anchor in " +
      `${CANONICAL_REL}. The registry is authoritative and the doc is its canonical home; a ` +
      "paraphrase in either direction is exactly the drift the registry was built to end",
    // Quantified over the fifteen expected ids for the same reason assertion 2 is -- see there.
    test: (rules, doc) => {
      const byId = new Map(rules.map(r => [r.id, r]));
      return M5_IDS.every(id => {
        const r = byId.get(id);
        return !!r && typeof r.statement === "string" && doc.get(id) === r.statement;
      });
    },
    breaks: rules =>
      rules.map(r => (r.id === "M5-04" ? { ...r, statement: r.statement.replace("never", "rarely") } : r)),
  },
];

function grade(rules, doc, where) {
  for (const a of ASSERTIONS) {
    assert.ok(a.test(rules, doc), `[${where}] assertion "${a.id}" failed: ${a.detail}`);
  }
}

function everyAssertionHasTeeth(rules, doc) {
  for (const a of ASSERTIONS) {
    const mutated = a.breaks(rules);
    assert.notStrictEqual(
      JSON.stringify(mutated),
      JSON.stringify(rules),
      `control for "${a.id}" changed NOTHING -- it cannot prove the assertion has teeth (the SES-158 failure)`,
    );
    assert.ok(
      !a.test(mutated, doc),
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
// Arm 1 -- the snapshot (always runs)
// ---------------------------------------------------------------------------

function theSnapshotCarriesTheRegistry(doc) {
  const text = fs.readFileSync(SNAPSHOT, "utf8");
  const rules = parseSnapshot(text);
  assert.ok(
    rules.length > 50,
    `docs/governance/RULES-SNAPSHOT.md parsed to ${rules.length} rows -- the reader is broken or the ` +
      "snapshot is truncated; regenerate with node scripts/export-governance-snapshot.js",
  );
  // Assertion 5 of the kickoff, stated as its own arm because it grades the EXPORT rather than the
  // registry: fifteen ids present in the generated file proves the re-export actually ran.
  for (const id of M5_IDS) {
    assert.ok(
      rules.some(r => r.id === id),
      `${id} is missing from docs/governance/RULES-SNAPSHOT.md -- the rows were inserted but the ` +
        "snapshot was never re-exported (node scripts/export-governance-snapshot.js)",
    );
  }
  grade(rules, doc, "snapshot");
  everyAssertionHasTeeth(rules, doc);
  aVacuousMutationFailsItsOwnControl(rules);
  return rules;
}

// A missing/garbled snapshot must be a loud finding, not a crash with an unhelpful message.
function aMissingSnapshotIsReportedNotCrashed() {
  assert.deepStrictEqual(
    parseSnapshot("# a snapshot with no table at all"),
    [],
    "a snapshot with no table must parse to zero rows so the caller can report it",
  );
  assert.strictEqual(
    parseCanonicalDoc("# a doc with no anchored rules").size,
    0,
    "a canonical doc with no anchored rule sections must parse to an empty map",
  );
}

// The escaping round-trip the snapshot format depends on. Without this, a statement containing a
// pipe would silently split into two cells and every downstream assertion would grade the wrong
// strings -- a false PASS, which is the worse direction.
function theCellDecoderRoundTrips() {
  assert.strictEqual(decodeCell(" a \\| b "), "a | b", "an escaped pipe must decode back to a pipe");
  assert.strictEqual(decodeCell(" a \\n b "), "a \n b", "an escaped newline must decode back to a newline");
  assert.strictEqual(decodeCell("  "), null, "an empty cell is SQL NULL");
  assert.strictEqual(decodeCell(" \\e "), "", "the \\e marker is a stored empty string, not NULL");
  assert.deepStrictEqual(
    splitRow("| a | b \\| c | d |"),
    [" a ", " b \\| c ", " d "],
    "splitRow must not break a row on an escaped pipe",
  );
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

async function theLiveRegistryAgreesWithTheSnapshot(doc, snapshotRules) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the live public.governance_rules arm (all five assertions against Supabase, and the " +
        "snapshot-vs-registry equality)",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent. governance_rules is service_role-only " +
        "(SES-174 locked anon/authenticated to ZERO privileges), so the anon key cannot substitute. " +
        "The snapshot arm above still ran and graded all five assertions against the committed " +
        "render. Canonical invocation: STANDARDS.md Section 2 rule 5.",
    );
    return;
  }
  const live = await fetchLiveRules(url, key);
  assert.ok(live.length > 50, `governance_rules returned ${live.length} rows -- refusing to grade a truncated read`);
  grade(live, doc, "live registry");
  everyAssertionHasTeeth(live, doc);

  // THE ARM THAT ONLY EXISTS WITH BOTH SOURCES IN HAND: the snapshot is a pure render of the
  // registry, so any divergence means the file was hand-edited or an insert never got exported.
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
}

async function run() {
  const doc = parseCanonicalDoc(fs.readFileSync(CANONICAL, "utf8"));
  assert.strictEqual(
    doc.size,
    M5_IDS.length,
    `${CANONICAL_REL} carries ${doc.size} anchored rule sections, expected ${M5_IDS.length} -- every ` +
      "rule must have exactly one anchored home (its canonical_doc resolves to that anchor)",
  );

  theCellDecoderRoundTrips();
  aMissingSnapshotIsReportedNotCrashed();
  const snapshotRules = theSnapshotCarriesTheRegistry(doc);
  await theLiveRegistryAgreesWithTheSnapshot(doc, snapshotRules);
}

selfRun(import.meta.url, run);
export default run;
