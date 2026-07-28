// DeepBench v6.3.190 | lib/pattern-vocabulary.js | LOG-77-9 -- delegated_to_provenance joins SIGNATURE_FIELDS at position 7 (16 -> 17 entries); Displayer-derived from the delegation_target/task_provenance plumbing facts, which stay off this allowlist
// DeepBench v6.3.178 | lib/pattern-vocabulary.js | LOG-51 -- rename/supersede path: a governed
// pattern name can be corrected. New 5th reviewCandidate() branch `rename` (retire an existing gold
// row's identity via superseded_by + create its governed replacement, keeping history -- never a
// delete), plus `integration_followed` added to SIGNATURE_FIELDS (a Displayer-derived, span-math
// read-time fact -- did a strictly-later call in this same span integrate a returned deliverable).
// DeepBench v6.3.144 | lib/pattern-vocabulary.js | LOG-66 -- Susan authors a structured criteria
// fingerprint written into a new pattern_vocabulary.criteria jsonb column on promote; the criteria
// is validated against the 16-field signature allowlist (§19k) and the bounded 3-operator grammar
// (@>/in/>) before it may be written. The allowlist and grammar are Layer-1/2 fact vocabulary,
// never a pattern -- no pattern name or criteria is ever hand-written in this file; the only
// criteria produced come out of Susan's live Layer-3 call.
// DeepBench v6.3.116 | lib/pattern-vocabulary.js | AI-35 -- Susan Smith's pattern_vocabulary
// self-maintenance broker (ARCHITECTURE.md §19i, "Self-Maintenance Mechanism"). Structural
// precedent: lib/librarian.js. No internal agent-identity check of any kind anywhere in this file --
// ownership of pattern_vocabulary writes is enforced entirely by which Skill Profile sets
// handler: 'pattern-vocabulary-write' (only pattern-vocabulary-review-intent does), same as the
// header comment in api/_lib/handlers/library-write.js states for Eleanor's the_Library broker.
// FEATURE: AI-35 -- Step 2a of the AI Pattern Tracking redefinition's 6-step build sequence.
// Ships the governed tables + Susan's review/promote capability, tested via directly-inserted
// pattern_candidates rows. The live, automatic per-call trigger (Layer B "no rule matches"
// detection) is deferred to Step 4 -- it depends on Layer A's rich fact capture (Step 3) and
// Layer B's rule evaluator (Step 4), neither of which exist yet.

// FEATURE: LOG-66 -- the criteria allowlist (Layer-1 fact vocabulary, §19k field order). The 17
// legal signature keys a gold pattern's `criteria` may reference. `trace_id` is plumbing and never
// a criteria key, so it is deliberately absent. This is not a pattern -- it is the vocabulary Susan
// authors criteria *in*; no pattern name or criteria is hardcoded here.
// FEATURE: LOG-51 -- `integration_followed` (Displayer-derived, never written): did any
// strictly-later row in this same span carry input_references_other_deliverable: true? Emitted as
// explicit true/false whenever span_id is present; omitted when span_id is null (unknowable, not
// false). Sits adjacent to sub_calls_chained -- both span-derived read-time facts (§19k caveat (a):
// order is diagnostic, the matcher is order-independent).
// FEATURE: LOG-77-9 -- `delegated_to_provenance` (Displayer-derived, never written): did this
// delegation dispatch the very producer of the artifact the task arrived from? Derived at read
// time from the `delegation_target`/`task_provenance` plumbing facts, which -- like `trace_id` --
// are deliberately absent from this allowlist (they contain literal agent ids; the signature is
// agent-agnostic).
export const SIGNATURE_FIELDS = [
  'intent', 'retrieval_method', 'tool_calls', 'gated_subroutine_fired', 'sub_calls_chained',
  'integration_followed', 'delegated_to_provenance', 'retrieved_chunk_ids', 'assembled_skill_slugs',
  'model_modality', 'capability_slug', 'traits.schema', 'traits.source',
  'input_references_other_deliverable', 'self_reported_claims', 'traits.intent_allowlist',
  'execution_type',
];

// FEATURE: LOG-66 -- the bounded three-operator grammar (§19k, settled by LOG-65). Every criteria
// value must be one of: a bare scalar (string/number/boolean => Postgres `@>` containment),
// `{ in: [<non-empty array>] }` (enumeration), or `{ ">": <number> }` (numeric threshold). Anything
// else is unmatchable at read time and therefore illegal. Throws naming the offending key/operator
// -- never a soft warning. This is the gate that keeps Susan's Layer-3 output executable by the
// Displayer view without hardcoding any pattern.
export function validateCriteria(criteria) {
  if (criteria === null || typeof criteria !== 'object' || Array.isArray(criteria)) {
    throw new Error(`reviewCandidate: criteria must be a non-null object, got ${Array.isArray(criteria) ? 'array' : typeof criteria}`);
  }
  const keys = Object.keys(criteria);
  if (keys.length === 0) throw new Error('reviewCandidate: criteria must reference at least one signature field');
  for (const key of keys) {
    if (!SIGNATURE_FIELDS.includes(key)) {
      throw new Error(`reviewCandidate: criteria key "${key}" is not in the signature-field allowlist (${SIGNATURE_FIELDS.join(', ')})`);
    }
    const value = criteria[key];
    if (value === null) {
      throw new Error(`reviewCandidate: criteria["${key}"] is null -- use a bare scalar, { "in": [...] }, or { ">": N }`);
    }
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        throw new Error(`reviewCandidate: criteria["${key}"] is a bare array -- use { "in": [...] } for enumeration`);
      }
      const ops = Object.keys(value);
      if (ops.length !== 1) {
        throw new Error(`reviewCandidate: criteria["${key}"] must specify exactly one operator ("in" or ">"), got [${ops.join(', ')}]`);
      }
      const op = ops[0];
      if (op === 'in') {
        if (!Array.isArray(value.in) || value.in.length === 0) {
          throw new Error(`reviewCandidate: criteria["${key}"] "in" must be a non-empty array`);
        }
      } else if (op === '>') {
        if (typeof value['>'] !== 'number') {
          throw new Error(`reviewCandidate: criteria["${key}"] ">" must be a number`);
        }
      } else {
        throw new Error(`reviewCandidate: criteria["${key}"] uses unknown operator "${op}" -- only "in" and ">" are allowed`);
      }
    }
    // else: bare scalar (string/number/boolean) => @> containment, valid.
  }
}

// ---- buildReviewContext -- plain read, no credential gate. Governance metadata, not
// tenant/data-room-scoped content (unlike the_Library), so this deliberately does not mirror
// librarian.js's getCredentials()/data_room_access gate. ----

export async function buildReviewContext(candidate_id) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error('buildReviewContext: Supabase not configured');
  if (!candidate_id) throw new Error('buildReviewContext: candidate_id required');

  const headers = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };

  const candidateRes = await fetch(
    `${supabaseUrl}/rest/v1/pattern_candidates?id=eq.${encodeURIComponent(candidate_id)}&select=*`,
    { headers }
  );
  if (!candidateRes.ok) throw new Error('buildReviewContext: candidate lookup failed -- ' + (await candidateRes.text()).slice(0, 200));
  const [candidate] = await candidateRes.json();
  if (!candidate) throw new Error(`buildReviewContext: no pattern_candidates row for id ${candidate_id}`);

  const vocabRes = await fetch(
    `${supabaseUrl}/rest/v1/pattern_vocabulary?select=*&order=pattern_slug`,
    { headers }
  );
  if (!vocabRes.ok) throw new Error('buildReviewContext: pattern_vocabulary read failed -- ' + (await vocabRes.text()).slice(0, 200));
  const vocabulary = await vocabRes.json();

  const pendingRes = await fetch(
    `${supabaseUrl}/rest/v1/pattern_candidates?status=eq.pending&id=neq.${encodeURIComponent(candidate_id)}&select=id,observed_description,created_at&order=created_at`,
    { headers }
  );
  if (!pendingRes.ok) throw new Error('buildReviewContext: pending candidates read failed -- ' + (await pendingRes.text()).slice(0, 200));
  const otherPendingCandidates = await pendingRes.json();

  return { candidate, vocabulary, otherPendingCandidates };
}

// ---- reviewCandidate -- the single write primitive. Always sets reviewed_by: 'susan',
// resolved_at: now(), and resolution to the full decision payload (mirrors
// pending_confirmations.resolution's existing shape). ----

export async function reviewCandidate({
  candidate_id, decision, pattern_slug, name, description, citation, maturity_status,
  matched_existing_slug, matched_candidate_id, reasoning,
  // FEATURE: LOG-66 -- Susan's structured criteria fingerprint, required on promote.
  criteria,
}) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error('reviewCandidate: Supabase not configured');
  if (!candidate_id) throw new Error('reviewCandidate: candidate_id required');
  if (!decision) throw new Error('reviewCandidate: decision required');

  const headers = { 'Content-Type': 'application/json', apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };
  const resolvedAt = new Date().toISOString();
  const resolution = {
    decision, pattern_slug: pattern_slug || null, name: name || null, description: description || null,
    citation: citation || null, maturity_status: maturity_status || null,
    matched_existing_slug: matched_existing_slug || null, matched_candidate_id: matched_candidate_id || null,
    reasoning: reasoning || null,
    // FEATURE: LOG-66 -- record the criteria on the candidate's resolution alongside every other field.
    criteria: criteria || null,
  };

  if (decision === 'promote') {
    // FEATURE: AI-35 §19i -- "an entry without [a citation] may not exist". Reject/throw rather
    // than silently promoting without one -- never a soft warning.
    if (!citation) throw new Error('reviewCandidate: citation required for decision=promote');
    if (!pattern_slug || !name || !maturity_status) {
      throw new Error('reviewCandidate: pattern_slug, name, and maturity_status all required for decision=promote');
    }
    // FEATURE: LOG-66 -- criteria is required (non-null) on promote, mirroring the citation gate
    // above -- never a soft warning. A promoted gold pattern with no matchable criteria would name
    // nothing at read time. validateCriteria() then enforces the allowlist + operator grammar,
    // throwing (and writing nothing) on any illegal key or operator.
    if (!criteria) throw new Error('reviewCandidate: criteria required for decision=promote');
    validateCriteria(criteria);

    const insertRes = await fetch(`${supabaseUrl}/rest/v1/pattern_vocabulary`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify({
        pattern_slug, name, description: description || null, citation, maturity_status,
        // FEATURE: LOG-66 -- the validated criteria fingerprint written into the gold row.
        criteria,
        promoted_by: 'susan', tenant_id: 'global',
      }),
    });
    if (!insertRes.ok) throw new Error('reviewCandidate: pattern_vocabulary insert failed -- ' + (await insertRes.text()).slice(0, 200));
    const [vocabEntry] = await insertRes.json();

    const updateRes = await fetch(`${supabaseUrl}/rest/v1/pattern_candidates?id=eq.${encodeURIComponent(candidate_id)}`, {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify({ status: 'promoted', reviewed_by: 'susan', resolved_at: resolvedAt, resolution }),
    });
    if (!updateRes.ok) throw new Error('reviewCandidate: pattern_candidates update failed -- ' + (await updateRes.text()).slice(0, 200));
    const [updatedCandidate] = await updateRes.json();

    return { success: true, decision, vocabulary_entry: vocabEntry, candidate: updatedCandidate };
  }

  if (decision === 'merge') {
    if (!matched_existing_slug && !matched_candidate_id) {
      throw new Error('reviewCandidate: matched_existing_slug or matched_candidate_id required for decision=merge');
    }

    const updateRes = await fetch(`${supabaseUrl}/rest/v1/pattern_candidates?id=eq.${encodeURIComponent(candidate_id)}`, {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify({ status: 'merged', reviewed_by: 'susan', resolved_at: resolvedAt, resolution }),
    });
    if (!updateRes.ok) throw new Error('reviewCandidate: pattern_candidates update failed -- ' + (await updateRes.text()).slice(0, 200));
    const [updatedCandidate] = await updateRes.json();

    return { success: true, decision, candidate: updatedCandidate };
  }

  if (decision === 'discard') {
    const updateRes = await fetch(`${supabaseUrl}/rest/v1/pattern_candidates?id=eq.${encodeURIComponent(candidate_id)}`, {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify({ status: 'discarded', reviewed_by: 'susan', resolved_at: resolvedAt, resolution }),
    });
    if (!updateRes.ok) throw new Error('reviewCandidate: pattern_candidates update failed -- ' + (await updateRes.text()).slice(0, 200));
    const [updatedCandidate] = await updateRes.json();

    return { success: true, decision, candidate: updatedCandidate };
  }

  if (decision === 'amend') {
    // FEATURE: LOG-52 -- write validated criteria (+ its grounding citation) onto an already-promoted
    // gold row identified by matched_existing_slug. This closes the gap where a pattern promoted before
    // the criteria mechanism (LOG-66) existed could not be given criteria without deleting and
    // re-promoting it (a re-review returns merge). Gates mirror promote exactly: matched_existing_slug,
    // criteria, and citation are all required (non-null), and criteria is validated by the SAME
    // validateCriteria() allowlist + 3-operator grammar -- an illegal criterion throws and writes
    // nothing. This branch names no pattern and embeds no pattern-specific logic; it writes whatever
    // validated criteria Susan emits. It is NOT a rename/superseded_by path (that is LOG-51) -- the row
    // keeps its identity; only criteria + citation change.
    if (!matched_existing_slug) throw new Error('reviewCandidate: matched_existing_slug required for decision=amend');
    if (!criteria) throw new Error('reviewCandidate: criteria required for decision=amend');
    if (!citation) throw new Error('reviewCandidate: citation required for decision=amend');
    validateCriteria(criteria);

    const amendRes = await fetch(`${supabaseUrl}/rest/v1/pattern_vocabulary?pattern_slug=eq.${encodeURIComponent(matched_existing_slug)}`, {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify({ criteria, citation }),
    });
    if (!amendRes.ok) throw new Error('reviewCandidate: pattern_vocabulary amend failed -- ' + (await amendRes.text()).slice(0, 200));
    const [vocabEntry] = await amendRes.json();
    // FEATURE: LOG-52 -- 0 rows returned means no gold row carried that pattern_slug; throw rather than
    // silently reporting success on a write that changed nothing.
    if (!vocabEntry) throw new Error(`reviewCandidate: no pattern_vocabulary row with pattern_slug "${matched_existing_slug}" to amend`);

    const updateRes = await fetch(`${supabaseUrl}/rest/v1/pattern_candidates?id=eq.${encodeURIComponent(candidate_id)}`, {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify({ status: 'amended', reviewed_by: 'susan', resolved_at: resolvedAt, resolution }),
    });
    if (!updateRes.ok) throw new Error('reviewCandidate: pattern_candidates update failed -- ' + (await updateRes.text()).slice(0, 200));
    const [updatedCandidate] = await updateRes.json();

    return { success: true, decision, vocabulary_entry: vocabEntry, candidate: updatedCandidate };
  }

  if (decision === 'rename') {
    // FEATURE: LOG-51 -- retire an existing gold row's identity and create its governed replacement,
    // keeping history. This is the §19i superseded_by path: the old row is NEVER deleted -- it keeps
    // its criteria/citation frozen as the historical record, and only the Displayer view's
    // `superseded_by IS NULL` filter retires it from matching. A split is a rename (old row ->
    // corrected identity) plus an ordinary promote for the second name -- superseded_by stays a
    // single forward pointer per §19i, no multi-successor mechanism. This branch names no pattern
    // and embeds no pattern-specific logic; it writes whatever validated identity Susan emits.
    // Gates mirror promote's: throw on any missing input, write nothing on an illegal one.
    if (!matched_existing_slug) throw new Error('reviewCandidate: matched_existing_slug required for decision=rename');
    if (!pattern_slug || !name || !maturity_status) {
      throw new Error('reviewCandidate: pattern_slug, name, and maturity_status all required for decision=rename');
    }
    if (!citation) throw new Error('reviewCandidate: citation required for decision=rename');
    if (pattern_slug === matched_existing_slug) {
      throw new Error('reviewCandidate: pattern_slug must differ from matched_existing_slug for decision=rename -- an identity kept with new criteria is an amend, not a rename');
    }
    // The replacement must be matchable, same reasoning as promote's criteria gate -- a renamed-in
    // gold row with no criteria would name nothing at read time.
    if (!criteria) throw new Error('reviewCandidate: criteria required for decision=rename');
    validateCriteria(criteria);

    // Input gate: the row being superseded must exist BEFORE anything is written -- a rename against
    // a nonexistent slug must not leave an orphaned replacement row behind.
    const existingRes = await fetch(
      `${supabaseUrl}/rest/v1/pattern_vocabulary?pattern_slug=eq.${encodeURIComponent(matched_existing_slug)}&select=pattern_slug`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    );
    if (!existingRes.ok) throw new Error('reviewCandidate: pattern_vocabulary lookup failed -- ' + (await existingRes.text()).slice(0, 200));
    const [existingRow] = await existingRes.json();
    if (!existingRow) throw new Error(`reviewCandidate: no pattern_vocabulary row with pattern_slug "${matched_existing_slug}" to rename`);

    // 1. INSERT the replacement gold row. A PK collision on an existing slug surfaces as the insert
    // error -- never pre-delete anything.
    const insertRes = await fetch(`${supabaseUrl}/rest/v1/pattern_vocabulary`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify({
        pattern_slug, name, description: description || null, citation, maturity_status,
        criteria,
        promoted_by: 'susan', tenant_id: 'global',
      }),
    });
    if (!insertRes.ok) throw new Error('reviewCandidate: pattern_vocabulary insert failed -- ' + (await insertRes.text()).slice(0, 200));
    const [vocabEntry] = await insertRes.json();

    // 2. PATCH the old row: forward pointer only. criteria/citation stay in place -- the row is the
    // historical record; the view's superseded_by IS NULL filter is what retires it from matching.
    const supersedeRes = await fetch(`${supabaseUrl}/rest/v1/pattern_vocabulary?pattern_slug=eq.${encodeURIComponent(matched_existing_slug)}`, {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify({ superseded_by: pattern_slug }),
    });
    if (!supersedeRes.ok) throw new Error('reviewCandidate: pattern_vocabulary supersede failed -- ' + (await supersedeRes.text()).slice(0, 200));
    const [supersededEntry] = await supersedeRes.json();
    if (!supersededEntry) throw new Error(`reviewCandidate: no pattern_vocabulary row with pattern_slug "${matched_existing_slug}" to supersede`);

    // 3. PATCH the candidate: status='renamed' (mirrors the amended add that shipped with LOG-52).
    const updateRes = await fetch(`${supabaseUrl}/rest/v1/pattern_candidates?id=eq.${encodeURIComponent(candidate_id)}`, {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify({ status: 'renamed', reviewed_by: 'susan', resolved_at: resolvedAt, resolution }),
    });
    if (!updateRes.ok) throw new Error('reviewCandidate: pattern_candidates update failed -- ' + (await updateRes.text()).slice(0, 200));
    const [updatedCandidate] = await updateRes.json();

    return { success: true, decision, vocabulary_entry: vocabEntry, superseded_entry: supersededEntry, candidate: updatedCandidate };
  }

  throw new Error(`reviewCandidate: unknown decision "${decision}"`);
}
