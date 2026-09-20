#!/usr/bin/env node
// DeepBench v7.0.537 | scripts/contract-patterns-applied.js | SES-424 slice 5 -- the three
// governance output contracts gain `patterns_applied`, so an answer NAMES the decision criteria it
// leaned on instead of the staff-watch inferring them afterwards.
//
// WHY THIS EXISTS. Slice 4 put each role's criteria INTO its assembled prompt (the three
// `*-knowledge-patterns` rows, scripts/render-role-patterns.js). That closed the input half: the
// agents can read the library they are graded by. The output half was still missing -- measured on
// the unchanged tree this cycle, `node scripts/agent-prompt.js --agent=designer
// --capability=design-kickoff | grep -c '"patterns_applied"'` returned 0, and the same for
// builder/build-ticket and devmanager/run-project. An agent that reads 92 criteria and returns an
// answer naming none of them leaves "which criteria does this platform actually decide by" a
// question nobody can answer from data. With the key in the contract, the answer carries the
// numbers and scripts/agent-log.js writes them to public.decision_pattern_citations as rows.
//
// THE CONTRACT IS DATA, NOT CODE (.claude/rules/capabilities-are-data.md, pattern:2). The three
// contracts are `public.skill_profiles.traits.schema` on the Intent Skills -- `ds-kickoff-intent`,
// `bd-build-intent`, `dm-run-intent` -- and the executor hands that object to its model as the tool
// definition. So the edit is a row edit, imaged under a decision handle, and NOT a literal added to
// any assembler: nothing in code learns these slugs except this script, whose subject they are.
//
// ONE TRANSFORM, TWO USES. withPatternsApplied() is the only place the key's shape is written down.
// `--write` applies it; `--check` asserts the live row is its own FIXPOINT (applying it again
// changes nothing), which is the same statement as "the row carries exactly this key, in exactly
// this form". A second copy of the spec in the checker would be a second thing to drift
// (pattern:14) -- and a checker written from memory of the spec is what lets a row pass while
// holding a different `items` type.
//
// KEY ORDER IS NOT A DIFFERENCE. jsonb reorders object keys on storage, so a byte or
// JSON.stringify comparison of a round-tripped schema reports a difference that is not one. Every
// comparison here canonicalises (keys sorted, recursively; ARRAY ORDER PRESERVED, because
// `required` and `enum` are lists whose order is theirs to keep).
//
// THE IMAGE IS AN UPDATE'S IMAGE: `row_data` carries the FULL prior row, never NULL. NULL is the
// SES-89 convention for an INSERT ("this row did not exist yet"), and writing it here would make
// the undo a DELETE of an Intent Skill the three agents cannot run without.
//
// USAGE
//   node scripts/contract-patterns-applied.js --check
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/contract-patterns-applied.js \
//     --write --cycle=<runner_cycles.id> --decision=<runner_decisions.id>
//
// EXIT CODES: 0 every live contract carries the key exactly; 1 (--check) the first one that does
// not, named; 2 cannot run (missing env/flags) or a write could not complete.

import path from 'path';
import { fileURLToPath } from 'url';

export const SLUGS = Object.freeze(['ds-kickoff-intent', 'bd-build-intent', 'dm-run-intent']);
export const KEY = 'patterns_applied';

// The key's one written-down shape. `minimum: 1` mirrors public.decision_patterns' own numbering
// (the library starts at 1) and agent-log.js's parser, which refuses 0 before it writes anything.
export const PA_SPEC = Object.freeze({
  type: 'array',
  items: { type: 'integer', minimum: 1 },
  description: 'The decision patterns you applied this turn, by number (pattern:N). Empty when none; every number must exist in the library.',
});

/**
 * Pure, and idempotent by construction: the key is ASSIGNED (not merged) and `required` gains the
 * name only when it is absent, so a second application is a no-op and `--check` can be written as
 * a fixpoint test.
 */
export function withPatternsApplied(schema) {
  const base = schema && typeof schema === 'object' ? schema : {};
  const required = Array.isArray(base.required) ? [...base.required] : [];
  if (!required.includes(KEY)) required.push(KEY);
  return {
    ...base,
    required,
    properties: { ...(base.properties || {}), [KEY]: JSON.parse(JSON.stringify(PA_SPEC)) },
  };
}

// Canonical form for comparison: object keys sorted, array order kept. See the header.
export function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((acc, k) => { acc[k] = canonical(value[k]); return acc; }, {});
  }
  return value;
}

export const sameSchema = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));

/** Pure. Returns null when the live schema already carries the key exactly, or a reason string. */
export function schemaGap(liveSchema) {
  const want = withPatternsApplied(liveSchema);
  if (sameSchema(liveSchema, want)) return null;
  const props = (liveSchema && liveSchema.properties) || {};
  const req = Array.isArray(liveSchema && liveSchema.required) ? liveSchema.required : [];
  if (!props[KEY]) return `properties.${KEY} is absent`;
  if (!req.includes(KEY)) return `${KEY} is not in "required" — an optional key is one the model may simply omit`;
  return `properties.${KEY} is ${JSON.stringify(props[KEY])}, expected ${JSON.stringify(PA_SPEC)}`;
}

function fail(message) {
  console.error(`contract-patterns-applied: ${message}`);
  process.exit(2);
}

function flagValue(name) {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
}

async function supaRest(pathAndQuery, init = {}) {
  const base = process.env.SUPABASE_URL.replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_KEY;
  const res = await fetch(`${base}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: {
      apikey: key, Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json', ...(init.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${init.method || 'GET'} ${pathAndQuery} -> ${res.status} ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : null;
}

function requireEnv() {
  const missing = [!process.env.SUPABASE_URL && 'SUPABASE_URL', !process.env.SUPABASE_SERVICE_KEY && 'SUPABASE_SERVICE_KEY']
    .filter(Boolean).join(', ');
  if (missing) fail(`cannot read the live rows — missing env var(s): ${missing}`);
}

async function liveRow(slug) {
  const rows = await supaRest(`skill_profiles?slug=eq.${slug}&select=*`);
  if (!Array.isArray(rows) || rows.length !== 1) {
    throw new Error(`expected exactly one ${slug} row, got ${Array.isArray(rows) ? rows.length : 0}`);
  }
  return rows[0];
}

async function check() {
  requireEnv();
  for (const slug of SLUGS) {
    const row = await liveRow(slug);
    const gap = schemaGap(row.traits && row.traits.schema);
    if (gap) {
      console.error(`contract-patterns-applied --check: ${slug} does NOT carry ${KEY} — ${gap}. ` +
        `Apply it with:  node scripts/contract-patterns-applied.js --write --cycle=<uuid> --decision=<uuid>`);
      process.exit(1);
    }
    console.log(`  ${slug} — carries ${KEY} (required, ${JSON.stringify(PA_SPEC.items)})`);
  }
  console.log(`contract-patterns-applied --check: all ${SLUGS.length} contracts carry ${KEY}.`);
  process.exit(0);
}

async function write() {
  requireEnv();
  const cycleId = flagValue('cycle');
  const decision = flagValue('decision');
  if (!cycleId) fail('--write needs --cycle=<uuid> — every agent-row write owes a before-image, and an image needs an owner (§19v).');
  if (!decision) fail('--write needs --decision=<uuid> — the slice keeps ONE handle, so one Reverse undoes all three contracts together. Record it first (select public.record_decision(...)).');

  for (const slug of SLUGS) {
    const row = await liveRow(slug);
    const nextTraits = { ...(row.traits || {}), schema: withPatternsApplied(row.traits && row.traits.schema) };

    // IMAGE FIRST, and it is what authorises the PATCH. row_data is the FULL prior row: this is an
    // UPDATE, so the undo is a restore, never a delete.
    await supaRest('runner_before_images', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        cycle_id: cycleId, session_name: null, table_name: 'skill_profiles',
        pk_value: row.id, row_data: row, decision_id: decision,
      }),
    });

    await supaRest(`skill_profiles?slug=eq.${slug}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ traits: nextTraits }),
    });

    // READ BACK, and re-classify rather than assume: a PostgREST write the role could not make
    // answers 2xx and changes nothing on some paths.
    const back = await liveRow(slug);
    const gap = schemaGap(back.traits && back.traits.schema);
    if (gap) {
      fail(`${slug} read back WITHOUT ${KEY} — ${gap}. Decision ${decision} is standing and holds the images; ` +
        `reverse it (select public.reverse_decision('${decision}','<who>','<why>');) before retrying.`);
    }
    console.log(`  ${slug} — imaged (pk ${row.id}, row_data the full prior row) and patched under decision ${decision}`);
  }
  console.log(`contract-patterns-applied --write: ${SLUGS.length} contracts now require ${KEY}; ${SLUGS.length} before-images under decision ${decision}.`);
  process.exit(0);
}

async function main() {
  if (process.argv.includes('--write')) return write();
  if (process.argv.includes('--check')) return check();
  fail('pass --check or --write --cycle=<uuid> --decision=<uuid>');
}

// Entry-point guard: the regression imports withPatternsApplied() and must not run the script.
if (process.argv[1]
    && path.resolve(fileURLToPath(import.meta.url)).toLowerCase() === path.resolve(process.argv[1]).toLowerCase()) {
  main().catch(e => fail(e.message));
}
