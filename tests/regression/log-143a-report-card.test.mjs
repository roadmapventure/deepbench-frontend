// DeepBench v7.0.415 | tests/regression/log-143a-report-card.test.mjs | LOG-143 (a) -- the Bench
// Report Card's judge: Owen Marsh grades a finished run on delegation fit, groundedness and Skill
// use, and the scores are rows the public key can read WITHOUT the visitor column.
//
// WHAT IS BEING PINNED, and the two places a lazier guard would pass vacuously.
//
// (1) THE REGISTRATION, NOT THE FILE. It is easy to assert "api/_lib/handlers/report-card-write.js
// exists". That passes against a build where the handler is never reachable: which handler runs is
// data (`traits.handler` on the Skill Profile), but the map it is looked up in is a hardcoded JS
// object literal, and `KNOWN_HANDLERS` is derived from that map -- an unregistered slug 501s at
// api/prompt/request-receivable.js's own guard before any handler is called. The kickoff located
// this registry in `api/_lib/handlers/store.js`; that is wrong, and the error matters enough to
// record here rather than silently correct -- `store.js` is itself just one handler (it writes
// `deliverables`). The registry is the HANDLERS literal in `api/prompt/request-receivable.js`.
// So the clause below asserts the SLUG IS IN THE MAP, which is the fact that makes the capability
// reachable, and the mutation control is that dropping the map entry fails it.
//
// (2) THE PATTERN SET NEEDS A MUTATION CONTROL. `assert(entry.patterns.length === 3)` passes
// against three wrong patterns, and `assert(patterns.includes('RAG'))` alone passes against an
// entry that lost the other two. The control below is explicit (the "would this still pass if the
// fix did nothing" test): the same predicate that accepts the real entry is run against three
// MUTANTS, each missing exactly one pattern, and each must be rejected. A predicate that cannot
// reject a mutant is not measuring anything.
//
// NO PAID JUDGE RUN IN THIS SUITE (kickoff rule 5: spend stays behind its own flag). LOG143_LIVE_JUDGE
// is declared here and deliberately left off -- a permanent regression test must not bill an
// Anthropic call on every run. The judge's real end-to-end behaviour is the design session's own
// Manual QA, and its evidence lives in the kickoff's Section 11.
//
// GROUNDEDNESS WAS UNKNOWN BY DESIGN IN PART (a) (parent ruling, 2026-09-03, Blocker B / Option 2):
// nothing on the platform could read `the_library` chunk TEXT by id -- lib/librarian.js's
// lookupRecordsByIds() selects `id,data_type` only, and queryLibrary() is similarity-only. LOG-143
// (d2) shipped that read, so the method assertions near the bottom of this file were amended at
// v7.0.419 (decision 32fa2fea-89e3-40f6-97b7-a1ec26eac2f7) to pin the RULE rather than the outcome:
// unknown is reserved for a run that carried no chunk ids, and is never inferred from the answer's
// own prose. Both directions are the same failure C-rejected-17/18 named -- a fabricated score, and
// an unknown asserted over an input the judge can now obtain. See that block's own comment.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const RECEIVABLE_REL = "api/prompt/request-receivable.js";
const HANDLER_REL = "api/_lib/handlers/report-card-write.js";

const CAPABILITY_SLUG = "bench-report-card";
const HANDLER_SLUG = "report-card-write";
const TABLE = "bench_report_cards";
const VIEW = "bench_report_card_rollup";
const SKILL_SLUGS = ["rc-identity", "rc-rubric-behavior", "report-card-intent"];
const REQUIRED_PATTERNS = ["LLM-as-Judge / Verifier", "Structured Output", "RAG"];

// The columns the public key is allowed to read: every column except visitor_id.
const PUBLIC_COLUMNS = [
  "id", "tenant_id", "trace_id", "agent_id", "capability_slug", "intent_slug",
  "delegation_fit", "groundedness", "skill_use", "evidence", "skill_to_improve",
  "judge_activity_id", "created_at",
];

const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");

// Block and line comments out, string literals left alone. Good enough for "does this file's CODE
// name the Library", which is the only question asked of it -- and exported so the helper itself is
// checkable rather than being invisible plumbing inside one assertion.
export function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

// Reads a KEY=value pair out of .env.local without importing a dotenv dependency. Values are
// returned to the caller and never logged -- this file prints no key material.
function fromEnvLocal(key) {
  const p = path.join(ROOT, ".env.local");
  if (!fs.existsSync(p)) return null;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    if (line.slice(0, eq).trim() === key) return line.slice(eq + 1).trim() || null;
  }
  return null;
}

// The predicate the mutation control below has to be able to REJECT. Kept as one function so the
// real entry and every mutant are judged by exactly the same rule.
export function catalogEntryIsComplete(entry) {
  if (!entry || entry.slug !== CAPABILITY_SLUG) return false;
  if (entry.serviceType !== "ai" || entry.roadmap !== "now") return false;
  if (!Array.isArray(entry.patterns)) return false;
  return REQUIRED_PATTERNS.every(p => entry.patterns.includes(p));
}

export default async function run() {
  // ── SOURCE ARM: no credentials needed ────────────────────────────────────────

  // 1. The handler is REGISTERED, not merely present. Both halves: the import and the map entry.
  const receivable = read(RECEIVABLE_REL);
  const handlersLiteral = receivable.match(/const HANDLERS = \{[^}]*\}/);
  assert.ok(handlersLiteral, `${RECEIVABLE_REL} no longer has a recognizable HANDLERS literal -- the ` +
    "registry moved, and this test's central assertion is now measuring nothing");
  assert.ok(
    handlersLiteral[0].includes(`'${HANDLER_SLUG}'`),
    `'${HANDLER_SLUG}' is not in the HANDLERS map in ${RECEIVABLE_REL}. KNOWN_HANDLERS is derived ` +
    "from that map and an unregistered slug throws 501 before any handler runs, so the capability's " +
    "rows can be perfect and the judge's card will still never be stored."
  );
  assert.match(
    receivable,
    /import \{ handle as reportCardWriteHandle \} from '\.\.\/_lib\/handlers\/report-card-write\.js';/,
    `${RECEIVABLE_REL} must import the handler it registers`
  );

  // 2. The handler exists and NEVER opens the_library (ARCHITECTURE.md §19c, Rule #1). The
  //    groundedness dimension is the one that wants chunk text, and only Eleanor may read it.
  const handler = read(HANDLER_REL);
  // COMMENTS ARE STRIPPED FIRST, deliberately. The handler's own header explains at length WHY it
  // never opens the_library, and a raw substring scan over the file would match that explanation --
  // failing the build for documenting the rule it obeys. So the scan runs over code only.
  const handlerCode = stripComments(handler);
  assert.ok(
    !/the_library|queryLibrary|writeLibrary|lookupRecordsByIds|search-harness|librarian/.test(handlerCode),
    `${HANDLER_REL} references the Library IN CODE. Owen's write handler must never read or write ` +
    "the_library -- that read belongs to Eleanor Voss, brokered, and this handler only stores scores."
  );
  // The positive half of the same rule: the only modules it may pull in are the logger and the
  // request context. An import list is the thing that actually determines what it can reach.
  const handlerImports = [...handlerCode.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m => m[1]);
  assert.deepEqual(
    handlerImports.sort(),
    ["../../../lib/activity-log.js", "../../../lib/request-context.js"],
    `${HANDLER_REL} imports something beyond the activity logger and the request context ` +
    `(${handlerImports.join(", ")}). A new import is how a Library read would arrive.`
  );
  assert.match(handler, /bench_report_cards/, "the handler must write the scores table");
  assert.match(handler, /on_conflict=trace_id,agent_id/,
    "the write must upsert on the table's UNIQUE (trace_id, agent_id) -- re-judging a run replaces " +
    "that run's card rather than accumulating a second opinion nothing can rank");
  assert.match(handler, /logActivity\(/,
    "STANDARDS.md Section 11: the deterministic store logs its own row");
  assert.match(handler, /'bench-report-card:write'/,
    "the deterministic row's feature must name this write path");

  // 3. The SERVICE_CATALOG entry, with the mutation control.
  const { SERVICE_CATALOG } = await import("../../shared/ai-patterns.js");
  const entry = SERVICE_CATALOG.find(s => s.slug === CAPABILITY_SLUG);
  assert.ok(entry, `SERVICE_CATALOG has no '${CAPABILITY_SLUG}' entry (STANDARDS.md Section 11)`);
  assert.ok(catalogEntryIsComplete(entry),
    `the '${CAPABILITY_SLUG}' entry is incomplete: expected serviceType 'ai', roadmap 'now' and ` +
    `patterns ${JSON.stringify(REQUIRED_PATTERNS)}, got ${JSON.stringify(entry)}`);

  // THE CONTROL. Each mutant drops exactly one required pattern; the predicate must reject all
  // three. If any mutant passes, the clause above is not actually measuring the pattern set.
  for (const dropped of REQUIRED_PATTERNS) {
    const mutant = { ...entry, patterns: entry.patterns.filter(p => p !== dropped) };
    assert.ok(
      !catalogEntryIsComplete(mutant),
      `MUTATION CONTROL FAILED: the entry still reads as complete with '${dropped}' removed, so ` +
      "the assertion above would pass against a build that lost that pattern"
    );
  }

  // 4. No AI_TYPE_TO_SERVICE entry is needed and none was added: ai_type equals capability_slug
  //    and the existing `|| e.type` fallback resolves it. Pinned so a later session does not add a
  //    redundant mapping and then wonder which one wins.
  const patternsSrc = read("shared/ai-patterns.js");
  assert.ok(
    patternsSrc.includes("FEATURE: LOG-143"),
    "shared/ai-patterns.js must carry the FEATURE: LOG-143 comment stating why no " +
    "AI_TYPE_TO_SERVICE entry is needed"
  );

  // 5. Spend stays behind its own flag (kickoff rule 5), declared rather than assumed.
  if (!process.env.LOG143_LIVE_JUDGE) {
    notRun(
      "LOG-143a live judge run",
      "a real judge turn bills an Anthropic call, so it stays behind LOG143_LIVE_JUDGE and is off " +
      "by default in a permanent suite. Proven instead at the ship by the design session's Manual " +
      "QA (kickoff Section 11): a real card row with evidence naming hops, and the deterministic " +
      "bench-report-card:write row carrying the caller's visitor_id."
    );
  }

  // ── LIVE ARM: read-only, service key ────────────────────────────────────────
  const url = process.env.SUPABASE_URL || fromEnvLocal("SUPABASE_URL") || fromEnvLocal("VITE_SUPABASE_URL");
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !serviceKey) {
    notRun(
      "LOG-143a live rows arm",
      "no SUPABASE_URL + SUPABASE_SERVICE_KEY in env, so the capability row, the three Skill " +
      "Profiles, the assignment to owen, the table and the view could not be read. Re-run with " +
      "credentials exported (they live in public.runner_secrets by name)."
    );
  } else {
    const svc = async (pathAndQuery) => {
      const r = await fetch(`${url}/rest/v1/${pathAndQuery}`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      });
      // The body is read ONCE, on the failing branch only. Putting `await r.text()` inside the
      // assert message template evaluates it unconditionally (the template is built before
      // assert.ok is called), which consumes the stream and makes the following r.json() throw
      // "Body has already been read" on every SUCCESSFUL call -- a failure that looks like a
      // permissions problem and is not.
      if (!r.ok) {
        assert.fail(`service-role read failed for ${pathAndQuery}: ${r.status} ${await r.text()}`);
      }
      return r.json();
    };

    const caps = await svc(`capabilities?slug=eq.${CAPABILITY_SLUG}&select=slug,execution_type,default_intent_slug,display_phrase`);
    assert.equal(caps.length, 1, `expected exactly one '${CAPABILITY_SLUG}' capability row`);
    assert.equal(caps[0].execution_type, "ai", "the judge is an ai capability");
    assert.equal(caps[0].default_intent_slug, "report-card-intent",
      "the capability must default to its judging intent");

    // Held by Owen, and by Owen alone. No new agent was created: owen already carries all 23
    // fields via quality-gate, so the agent-completeness standard is satisfied by reuse.
    const assigns = await svc(`agent_capability_assignments?capability_slug=eq.${CAPABILITY_SLUG}&select=agent_id,tenant_id`);
    assert.deepEqual(assigns.map(a => a.agent_id), ["owen"],
      "bench-report-card must be assigned to owen and to nobody else");

    const skills = await svc(`skill_profiles?slug=in.(${SKILL_SLUGS.join(",")})&select=slug,skill_type_slug,llm_model,method,traits`);
    assert.equal(skills.length, 3, `expected all three Skill Profiles: ${SKILL_SLUGS.join(", ")}`);
    assert.deepEqual(
      skills.map(s => s.skill_type_slug).sort(),
      ["behavior", "identity", "intent"],
      "the three Skills must be one identity, one behavior and one intent"
    );

    const intent = skills.find(s => s.slug === "report-card-intent");
    // Canonical versioned model id -- scripts/check-model-ids.js fails the build on a bare alias,
    // so the kickoff's shorthand 'claude-sonnet-5' would not have shipped.
    assert.equal(intent.llm_model, "claude-sonnet-4-6",
      "the judging intent must name the canonical Sonnet id");
    assert.equal(intent.traits?.handler, HANDLER_SLUG,
      "traits.handler is what dispatches the structured output to the deterministic store -- " +
      "capabilities are data (§19b), so this is the only thing that routes the write");
    assert.ok(intent.traits?.schema?.properties?.groundedness,
      "the structured card must declare a groundedness field");
    // AMENDED BY LOG-143 (d2), decision 32fa2fea-89e3-40f6-97b7-a1ec26eac2f7, and the amendment is
    // the point rather than a maintenance chore. Part (a) pinned the exact string "Library chunk
    // text not readable by id yet - LOG-143 (d)" because at that ship the platform genuinely could
    // not read chunk TEXT by id, so a permanent unknown was the honest value. Part (d2) shipped
    // that read (lib/search-harness.js readContentByIds -> lib/librarian.js
    // lookupRecordsWithContent, behind api/_lib/handlers/library-lookup.js's include_content flag),
    // which makes the old string a false statement about the platform -- and a guard that pins a
    // false statement is worse than no guard, because it blocks the correction.
    //
    // WHAT IS PINNED NOW IS THE RULE, NOT THE OUTCOME, and that is a stronger assertion than the
    // one it replaces: unknown must be reserved for the case where the inputs are genuinely absent
    // (no chunk ids were passed), never asserted unconditionally and never inferred from prose. An
    // editor who lets the judge score groundedness off the answer's wording still fails here.
    assert.match(intent.method, /retrieved_chunk_ids/,
      "the Skill's method must tell the judge which task_context field carries the chunk ids its " +
      "groundedness score rests on");
    // AMENDED AGAIN BY LOG-143 (d1) (decision 67ce31ca-3a14-4711-9a50-abfd187b542b). d2 had the judge
    // REQUEST chunk text through the Library lookup's include_content flag; d1 supersedes that by
    // delivering the text to it, already resolved, in the TRACE FACTS section -- so the rubric names
    // the section rather than a lookup it no longer has to make (traits.can_request_help is still
    // false, and now correctly so: no delegation is needed).
    assert.match(intent.method, /TRACE FACTS/,
      "the method must point the judge at the TRACE FACTS section -- that section IS the record, and " +
      "a rubric that does not name it leaves the judge scoring from the answer's own prose");
    // The two-case unknown rule, and the second case is the one that matters: chunk ids that are not
    // Library records mean the run grounded on a DIFFERENT STORE, not on nothing. Reading that as a
    // low score is C-rejected-17/18's fabrication from the opposite direction, so the instruction
    // forbidding it is pinned verbatim.
    assert.match(intent.method, /THE SECOND CASE IS NOT A LOW SCORE/,
      "the method must forbid scoring groundedness LOW when a run's chunk ids are not Library " +
      "records -- the platform keeps physically separate stores and only Library text is readable");
    assert.match(intent.method, /exactly two cases/,
      "unknown must be RESERVED for two named cases. An unconditional unknown and a fabricated " +
      "score are the same failure from opposite ends (C-rejected-17/18).");
    assert.match(intent.method, /Never infer groundedness from the answer/,
      "the method must forbid inferring groundedness from the answer's own prose");
    assert.match(intent.method, /unknown is the honest value/,
      "the method must state that an unsupportable dimension is unknown, never a fabricated score");

    const csp = await svc(`capability_skill_profiles?capability_slug=eq.${CAPABILITY_SLUG}&select=skill_profile_slug,level,is_required,display_order&order=display_order`);
    // FOUR since LOG-143 (d1), decision 67ce31ca-3a14-4711-9a50-abfd187b542b: rc-trace-knowledge is
    // the knowledge Skill whose traits.source = 'trace_facts' is what puts the graded run's own
    // logged facts in front of the judge. Asserted by NAME as well as by count -- a bare count of 4
    // would pass against any fourth Skill, and this one is the ticket.
    assert.equal(csp.length, 4, "all four Skills must be wired to the capability");
    assert.ok(csp.some(r => r.skill_profile_slug === "rc-trace-knowledge"),
      "rc-trace-knowledge must be wired to bench-report-card -- without it the judge's prompt " +
      "carries no TRACE FACTS section and every dimension that reads the log scores unknown again");
    assert.ok(csp.every(r => r.level === 2 && r.is_required === true),
      "all four are level 2 and required, mirroring the qg-* rows");
    assert.deepEqual(csp.map(r => r.display_order), [1, 2, 3, 4], "display_order must be 1..4 with no gap");

    // The table and the view are readable by the service role (existence, without asserting rows:
    // a fresh table is legitimately empty and an emptiness assertion would break on the first
    // real judge run).
    await svc(`${TABLE}?select=${PUBLIC_COLUMNS.join(",")},visitor_id&limit=1`);
    await svc(`${VIEW}?select=agent_id,runs_judged,unknown_rate,last_judged_at,lowest_skill&limit=1`);
  }

  // ── ANON ARM: the grants gate, asserted in BOTH directions ──────────────────
  //
  // Both directions or neither (.claude/rules/supabase-column-grants.md, the LOG-124 lesson): the
  // denied read must fail AND the legitimate projection must still work. One alone is worthless --
  // a denial proves nothing if the same query fails for an unrelated reason, and a working read
  // proves nothing about what is hidden. A column REVOKE cannot subtract from a table GRANT, so
  // the migration revokes the table grant and grants the column list; this arm is what proves the
  // shipped grant is really column-scoped rather than merely reported as such.
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || fromEnvLocal("VITE_SUPABASE_ANON_KEY");

  if (!url || !anonKey || anonKey === "regression-placeholder") {
    notRun(
      "LOG-143a anon grants arm",
      "no real anon key available (a placeholder would 401 for the wrong reason and prove nothing " +
      "about the column grant -- the SES-101 correction). The shipped grant was asserted at " +
      "migration time instead: zero table-level grants for anon/authenticated, and a 13-column " +
      "SELECT list that omits visitor_id."
    );
    return;
  }

  const anonRead = async (select) => {
    const r = await fetch(`${url}/rest/v1/${TABLE}?select=${select}&limit=1`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    });
    return r.status;
  };

  // Direction 1 -- the legitimate projection still works. `select=*` deliberately NOT used: it
  // stops working once the grant is a column list, so every reader must name its columns.
  const allowed = await anonRead(PUBLIC_COLUMNS.join(","));
  assert.equal(allowed, 200,
    `the public key must still read the ${PUBLIC_COLUMNS.length} non-visitor columns of ${TABLE} ` +
    `(got ${allowed}). A failure here means the column grant is missing or incomplete, and part ` +
    "(b)'s screen would show a blank Report Card.");

  // Direction 2 -- the visitor column is denied. This is the LOG-124 hole: attribution is stored
  // and must never be readable with the key that ships in the browser bundle.
  const denied = await anonRead(`${PUBLIC_COLUMNS.join(",")},visitor_id`);
  assert.ok(
    denied === 403 || denied === 401,
    `appending visitor_id to the SAME projection must be refused, got ${denied}. The pair is what ` +
    "makes this meaningful: the query above proves the read works, so a refusal here can only be " +
    "the column grant biting. A 200 means every visitor's identity is publicly readable."
  );

  // And the rollup carries no visitor column at all, so it needs no subtraction -- asserted rather
  // than assumed, since a later ALTER that adds one would silently expose it through the view.
  const rollupStatus = await (async () => {
    const r = await fetch(`${url}/rest/v1/${VIEW}?select=visitor_id&limit=1`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    });
    return r.status;
  })();
  assert.notEqual(rollupStatus, 200,
    `${VIEW} must not expose a visitor_id column (got ${rollupStatus})`);
}

selfRun(import.meta.url, run);
