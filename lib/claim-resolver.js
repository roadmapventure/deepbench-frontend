// DeepBench v6.3.222 | lib/claim-resolver.js | HAR-21 -- the platform's one place for deciding which
// reference ids get written. Principle: if the correct value is already known, no model touches it.
// A model-asserted id is a claim (ARCHITECTURE.md §19i, "captured, never trusted alone"); a
// caller-supplied id is a fact. Facts win. Claims are format-filtered, never format-trusted.
// Deliberately deterministic -- see the kickoff doc for why this is not an agent action.

// FEATURE: HAR-21 -- the sixth hand-rolled copy of this regex was about to be written inline in
// reasoning-write.js. AA-189 (lib/search-harness.js:100) and DAT-6 both deliberately declined a
// shared helper at two copies; at five (search-harness.js:100 + librarian.js 249/355/385/418) the
// arithmetic changed. Collapsing those five into this service is HAR-22, not this session.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// FEATURE: HAR-21 -- `supplied` is what the calling code already knows to be true (a structurally
// threaded id); `claimed` is what a model asserted in its own structured output. `supplied` wins
// whenever it yields at least one well-formed id. A malformed `supplied` value falls through to
// `claimed` rather than failing the write -- the caller is not more trustworthy than the guard it
// is protecting. `dropped` carries the raw rejected entries verbatim, for logging only: never write
// them anywhere. `{ ids: [], source: 'none' }` is a correct, expected outcome, not an error --
// an honest empty provenance link beats a write that dies on a malformed id.
export function resolveReferenceIds({ supplied, claimed } = {}) {
  const toArray = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
  const wellFormed = (list) => list.filter(id => typeof id === 'string' && UUID_RE.test(id));

  const suppliedIds = wellFormed(toArray(supplied));
  if (suppliedIds.length > 0) {
    return { ids: suppliedIds, source: 'caller', dropped: [] };
  }

  const claimedRaw = toArray(claimed);
  const claimedIds = wellFormed(claimedRaw);
  const dropped = claimedRaw.filter(id => !claimedIds.includes(id));
  return { ids: claimedIds, source: claimedIds.length ? 'model-claim' : 'none', dropped };
}
