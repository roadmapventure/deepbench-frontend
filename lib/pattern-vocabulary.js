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
  };

  if (decision === 'promote') {
    // FEATURE: AI-35 §19i -- "an entry without [a citation] may not exist". Reject/throw rather
    // than silently promoting without one -- never a soft warning.
    if (!citation) throw new Error('reviewCandidate: citation required for decision=promote');
    if (!pattern_slug || !name || !maturity_status) {
      throw new Error('reviewCandidate: pattern_slug, name, and maturity_status all required for decision=promote');
    }

    const insertRes = await fetch(`${supabaseUrl}/rest/v1/pattern_vocabulary`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify({
        pattern_slug, name, description: description || null, citation, maturity_status,
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

  throw new Error(`reviewCandidate: unknown decision "${decision}"`);
}
