// DeepBench v7.0.317 | tests/regression/SES-216-schema-grants.js | SES-220
//
// v7.0.317 — TWO CLAUSES REAIMED, and the reason belongs at the top because it is a property of
// doc guards in general and not a detail of this one. `doesNotOversellTheFix` required the runbook
// to keep the literal sentences "Defects (3) and (4) are untouched." and "5 tables and 67% of the
// rows still will not load"; `stillConditionalOnSetAge` required a case-exact "depends on WHEN your
// set was dumped". All three were true when written. SES-223 (v7.0.303) and SES-230 (v7.0.312) then
// fixed those defects for future sets, and SES-220 (v7.0.317) proved it by running the real loader
// against a real Postgres — at which point this guard was REQUIRING a falsehood in the one document
// somebody reads mid-outage, and the case-exact match broke on prose that had been strengthened.
//
// A DOC GUARD MUST FAIL WHEN THE PROPERTY GOES, NEVER WHEN THE SENTENCE CARRYING IT IS REWORDED
// UPWARD, AND NEVER TO DEFEND A FACT THAT HAS EXPIRED. Both clauses are now aimed at the half that
// cannot expire — no repair reaches a set already on disk — so telling the truth about the fix no
// longer costs a red suite. Its twin in SES-220-loadable-columns.js had the identical defect and
// was split the same way; one expired fact with two guards holding it in place is harder to correct
// than one with none.
//
// v7.0.294 header follows.
// DeepBench v7.0.294 | tests/regression/SES-216-schema-grants.js | SES-216
//
// Guards the fix that made schema.sql carry EXECUTABLE grants, and -- with equal weight -- the
// manual reconstruction path it did NOT retire.
//
// THE DEFECT. public._backup_schema_ddl recorded every relation ACL as a COMMENT
// ('-- relacl for public.X: {...}', 68 lines) and emitted zero GRANT statements. On a restored
// project only the owner postgres held privileges, so the documented data restore 403/42501'd on
// EVERY table and the browser could read nothing. Found live 2026-08-28 by the v7.0.292 restore
// drill, which reconstructed 148 GRANT statements BY HAND from those comment lines to proceed.
//
// THE CLAUSE THIS FILE EXISTS FOR, above every other assertion in it: `manualPathSurvives`.
// A fixed defect invites a later editor to delete the workaround as obsolete -- and that edit
// would be wrong in the expensive direction. The emission fix repairs sets dumped AFTER
// v7.0.294; BOTH sets stored offsite today (selfbuild-step0-2026-08-23, refresh-2026-08-28)
// predate it and still come back 403 on every table. Deleting §9's reconstruction strands
// whoever is mid-outage holding the set that actually exists. So this file asserts the fix note
// and the workaround TOGETHER, and neither alone is the pass.
//
// THE SECOND TRAP, and it is a privacy one (.claude/rules/supabase-column-grants.md, LOG-124).
// Production's ai_activity_log grants anon INSERT+MAINTAIN at the table level and NO SELECT; the
// SELECT arrives as a 27-column list with raw `caller_ip` deliberately excluded. The obvious
// repair for the dark AI Audit screen on a restored platform is
// `GRANT SELECT ON ai_activity_log TO anon`, which republishes every visitor's IP. Part B asserts
// the emitted statements do not take that shape, on the live view rather than from source.
//
// WHAT THIS FILE DOES NOT COVER, declared rather than implied (SES-180 (b)): the view BODY lives
// in the database (migration ses216_backup_schema_ddl_executable_grants), not in this repo, so
// no assertion here can read its definition. Part B reaches its OUTPUT through PostgREST, which
// is strictly better than a source grep -- it tests what a dump would actually contain -- but it
// needs credentials and declares itself not-run without them. The round-trip proof (strip five
// relations, replay the emitted statements, exploded-ACL fingerprint returns byte-identical to
// baseline 2848348fbcb76545fc3c3f643e51dcb9, with the pre-change emission as the negative
// control) was run live inside a deliberately-failing DO block and is recorded on the ship card;
// it cannot run from here because it mutates production ACLs even transiently.
//
// EVERY PART-A ASSERTION IS PAIRED WITH A NEGATIVE CONTROL -- the same text with the one thing
// that should matter removed. "Would this still pass if the change did nothing?" must answer
// "no", which is the bar SES-176 set for this repo's doc guards.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..");
const RUNBOOK = path.join("docs", "runbooks", "restore-from-backup.md");
const read = (...p) => fs.readFileSync(path.join(ROOT, ...p), "utf8");

const MIGRATION = "ses216_backup_schema_ddl_executable_grants";

// --- Part A: the runbook keeps BOTH halves -----------------------------------------------------
//
// Exported so a later session can reuse the predicates rather than re-deriving them.

export function recordsTheFix(md) {
  return md.includes(MIGRATION);
}

// The manual reconstruction path for pre-v7.0.294 sets. Three independent traces of it: the
// operator's own check, the named standing sets, and §9's reconstruction sentence. All three must
// survive -- a "tidy-up" that removes any one of them removes the path in practice.
export function manualPathSurvives(md) {
  return md.includes("grep -c '^GRANT ' schema.sql")
    && md.includes("selfbuild-step0-2026-08-23")
    && md.includes("refresh-2026-08-28")
    && /148\s+`?GRANT`?\s+statements/.test(md);
}

// §5b must stay CONDITIONAL on when the set was dumped. A rewrite to a flat "this now works" is
// the failure: it is true for a set nobody is holding and false for both sets that exist.
//
// v7.0.317: matched case-INSENSITIVELY, and the reason is worth a line rather than a shrug. The
// property this clause protects is "the verdict depends on the set's vintage", and SES-220 made
// §5b MORE conditional, not less -- it added a SECOND vintage test (loadable_cols) beside the
// grants one, because the two repairs landed independently and a set can be on either side of
// each. That rewrite promoted the sentence to a heading and broke a case-sensitive match on
// prose it had strengthened. A doc guard must fail when the PROPERTY goes, never when the
// sentence carrying it is reworded upward.
export function stillConditionalOnSetAge(md) {
  return /depends (?:entirely )?on when your set was dumped/i.test(md)
    && md.includes("This includes BOTH sets stored offsite");
}

// The LOG-124 trap warning. Never let the file stop saying which repair rebuilds the leak.
export function keepsTheLog124Trap(md) {
  return md.includes("GRANT SELECT ON ai_activity_log TO anon")
    && /rebuilds? the\s+\n?\s*>?\s*`?LOG-124`? leak/i.test(md.replace(/\*\*/g, ""));
}

// Defects (3) and (4) are NOT fixed, and the file must not imply otherwise by omission.
//
// v7.0.317 REAIMED, and this is the SECOND guard that was found pinning an expired sentence -- the
// finding, not a footnote. This clause required the literals "Defects (3) and (4) are untouched."
// and "5 tables and 67% of the rows still will not load". Both were true at v7.0.294 and both went
// false when SES-223 (v7.0.303) and SES-230 (v7.0.312) landed, so from then on this clause was
// REQUIRING the runbook to keep a falsehood in the one document somebody reads mid-outage. Its
// twin in tests/regression/SES-220-loadable-columns.js had the identical defect. One expired fact
// with two guards holding it in place is harder to correct than one with none, because the first
// cycle to tell the truth gets a red suite for doing it.
//
// What is pinned now is the half that did NOT expire and cannot: neither repair reaches a set
// already on disk, so a restore from either stored set still loses those rows. That is the
// statement this clause has always been FOR -- a reader who plans an outage around 100% recovery
// and gets 32.8% -- and it is now stated in a form that survives the emissions being fixed.
export function doesNotOversellTheFix(md) {
  return md.includes("both defects remain live in every set that already exists")
    && md.includes("must not be quoted for a current one");
}

async function run() {
  const md = read(RUNBOOK);

  // A1 -- the fix is recorded, by migration name.
  assert.ok(recordsTheFix(md),
    `${RUNBOOK} does not name migration ${MIGRATION}. The emission fix has no home in the ` +
    `runbook a person reads mid-outage.`);
  assert.ok(!recordsTheFix(md.split(MIGRATION).join("")),
    "negative control failed: recordsTheFix() passes on text with the migration name removed.");

  // A2 -- THE CLAUSE THIS FILE EXISTS FOR. The workaround for the sets that actually exist.
  assert.ok(manualPathSurvives(md),
    `${RUNBOOK} has lost the pre-v7.0.294 grant-reconstruction path. SES-216 fixed the EMISSION; ` +
    `both sets stored offsite predate it and still 403 on every table. Deleting the workaround ` +
    `because the defect is "fixed" strands whoever is restoring from the set that exists.`);
  for (const [label, mutated] of [
    ["operator check", md.split("grep -c '^GRANT ' schema.sql").join("grep something else")],
    ["standing set names", md.split("refresh-2026-08-28").join("some-other-set")],
    ["148-GRANT reconstruction", md.replace(/148(\s+`?GRANT`?\s+statements)/g, "some$1")],
  ]) {
    assert.ok(!manualPathSurvives(mutated),
      `negative control failed: manualPathSurvives() still passes with the ${label} removed.`);
  }

  // A3 -- §5b stays conditional rather than flatly "fixed".
  assert.ok(stillConditionalOnSetAge(md),
    `${RUNBOOK} §5b no longer makes the restore command's behaviour depend on when the set was ` +
    `dumped. A flat "this works now" is false for both sets stored offsite today.`);
  assert.ok(!stillConditionalOnSetAge(md.replace(/depends (?:entirely )?on when your set was dumped/gi, "works")),
    "negative control failed: stillConditionalOnSetAge() passes with the conditional removed.");
  assert.ok(!stillConditionalOnSetAge(md.split("This includes BOTH sets stored offsite").join("")),
    "negative control failed: stillConditionalOnSetAge() passes without the two standing sets " +
    "being named on the pre-fix side of the condition — which is the half that makes the " +
    "condition actionable rather than decorative.");

  // A4 -- the privacy trap stays named.
  assert.ok(keepsTheLog124Trap(md),
    `${RUNBOOK} no longer warns that GRANT SELECT ON ai_activity_log TO anon rebuilds the ` +
    `LOG-124 leak. That is the repair someone reaches for mid-outage.`);
  assert.ok(!keepsTheLog124Trap(md.split("GRANT SELECT ON ai_activity_log TO anon").join("some repair")),
    "negative control failed: keepsTheLog124Trap() passes with the trap statement removed.");

  // A5 -- the fix is not oversold. Reaimed at v7.0.317 from "(3) and (4) are unfixed" (which
  //       expired when SES-223/SES-230 landed) to the half that cannot expire: no repair reaches
  //       a set already on disk.
  assert.ok(doesNotOversellTheFix(md),
    `${RUNBOOK} has dropped the statement that SES-216/SES-220's defects are still live IN THE ` +
    `SETS THAT EXIST. The emissions are fixed and neither fix reaches a set already on disk, so ` +
    `a reader who takes them as "the restore works now" plans an outage around 100% recovery ` +
    `and gets 32.8%.`);
  for (const [label, token] of [
    ["sets-on-disk caveat", "both defects remain live in every set that already exists"],
    ["do-not-quote-67%-for-a-current-set rule", "must not be quoted for a current one"],
  ]) {
    assert.ok(!doesNotOversellTheFix(md.split(token).join("")),
      `negative control failed: doesNotOversellTheFix() still passes with the ${label} removed.`);
  }

  // --- Part B: the live emission -----------------------------------------------------------
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    notRun("SES-216 live emission half",
      "no Supabase credentials in env -- the view body lives in the database, so the only real " +
      "check of what a dump would contain is reading public._backup_schema_ddl. Run with " +
      "`node --env-file=.env.local tests/regression/run-all.js` to include it. Part A did run.");
    return;
  }

  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const get = async (qs) => {
    const res = await fetch(`${url}/rest/v1/_backup_schema_ddl?${qs}`, { headers });
    if (!res.ok) throw new Error(`_backup_schema_ddl read failed: HTTP ${res.status} ${await res.text()}`);
    return res.json();
  };

  const grants = await get("section=eq.grants&select=obj,ddl,sort_key&limit=2000");
  const created = await get("section=in.(tables,sequences,views)&select=obj&limit=2000");

  // B1 -- there are executable grants at all. This is the defect, stated as an assertion.
  assert.ok(grants.length > 0,
    "public._backup_schema_ddl emits NO grants section. This is SES-216's original defect: a " +
    "restored platform gets privileges for the owner and nobody else.");
  const notAGrant = grants.filter(r => !/^GRANT /.test(r.ddl));
  assert.strictEqual(notAGrant.length, 0,
    `${notAGrant.length} rows in the grants section are not GRANT statements, e.g. ` +
    `${JSON.stringify(notAGrant[0]?.ddl)?.slice(0, 120)}. A comment in this section is the ` +
    "defect wearing the fix's clothes.");

  // B2 -- THE LOG-124 BOUNDARY, read off the live emission rather than from source.
  const aiTableGrants = grants.filter(r => r.sort_key === 12 && / public\.ai_activity_log TO /.test(r.ddl));
  assert.ok(aiTableGrants.length > 0, "no relation-level grant emitted for ai_activity_log at all.");
  const anonTable = aiTableGrants.find(r => / TO anon;?$/.test(r.ddl));
  assert.ok(anonTable, "no relation-level grant to anon emitted for ai_activity_log.");
  assert.ok(!/^GRANT [^(]*\bSELECT\b/.test(anonTable.ddl),
    `the emitted table-level grant gives anon SELECT on ALL of ai_activity_log: ` +
    `${anonTable.ddl}\nThat republishes every visitor's caller_ip -- the LOG-124 leak, rebuilt ` +
    "by the restore. Production grants anon INSERT+MAINTAIN here; SELECT is column-scoped.");

  // B3 -- the column grants exist and carry the deliberate exclusion.
  const aiColGrant = grants.find(r => r.sort_key === 13 && /public\.ai_activity_log TO anon/.test(r.ddl));
  assert.ok(aiColGrant,
    "no COLUMN-level grant emitted for ai_activity_log. Without it the restored AI Audit screen " +
    "403s, and the repair whoever is mid-outage reaches for is the LOG-124 leak.");
  const cols = aiColGrant.ddl.match(/\(([^)]*)\)/)[1].split(",").map(s => s.trim());
  assert.ok(cols.includes("caller_ip_masked"),
    "the emitted column list omits caller_ip_masked, which the AI Audit screen reads.");
  assert.ok(!cols.includes("caller_ip"),
    `the emitted column list includes raw caller_ip: ${aiColGrant.ddl}\nThat column is excluded ` +
    "in production on purpose (LOG-124). A restore that grants it is a privacy regression.");

  // B4 -- sequences. Missing from acl-raw entirely before this ship; without them anon's INSERT
  //       into ai_activity_log fails on a restored platform even with the table grants correct.
  const seqGrants = grants.filter(r => / ON SEQUENCE /.test(r.ddl));
  assert.ok(seqGrants.length > 0,
    "no sequence grants emitted. ai_activity_log_id_seq carries anon=rwU in production; without " +
    "it the restored browser INSERT path fails with the table grants already right.");

  // B5 -- THE INVARIANT, asserted instead of the literal `_backup%` filter so it survives SES-214
  //       fixing the views section. A GRANT on a relation the set never creates does not degrade:
  //       it ABORTS the restore on "relation does not exist".
  const createdNames = new Set(created.map(r => r.obj));
  const orphans = [...new Set(grants.map(r => r.obj.split(".")[0]))].filter(n => !createdNames.has(n));
  assert.deepStrictEqual(orphans, [],
    `grants are emitted for ${orphans.length} relation(s) that no section of schema.sql creates: ` +
    `${orphans.join(", ")}. Each one aborts the restore on "relation does not exist" -- strictly ` +
    "worse than the missing grant it was meant to fix.");
}

export default run;
selfRun(import.meta.url, run);
