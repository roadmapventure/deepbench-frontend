// DeepBench v7.0.538 | lib/pattern-citations.js | SES-424 slice 6 -- ONE writer for
// public.decision_pattern_citations, because the platform has two homes that write a governance
// turn and only one of them could cite.
//
// WHY IT MOVED HERE. Slice 5 (v7.0.537) gave scripts/agent-log.js -- the SESSION's half of the one
// path -- a --patterns-applied flag and the rows to go with it. The other half is the EXECUTOR
// (api/capabilities/execute.js -> lib/activity-log.js, §19b's generic route), which is where the
// governance turns actually run when they are not run by hand: measured 2026-09-20 over 30 days by
// call_source, design-kickoff 67 session / 0 executor, build-ticket 53/0, run-project 32/0. Any
// capability whose Intent schema carries `patterns_applied` drops them on that route, because
// logActivity() had no citation path at all. Rather than a second copy of the insert growing beside
// the first (the nine hand-rolled ai_activity_log POSTs AA-190 replaced are what that looks like
// after a year), the parser and the writer move OUT of the script and both homes import them.
// pattern:14 -- when two code paths compute the same thing, build one shared core they both call;
// pattern:15 -- and the module owns the whole seam, parse and write, not half of it.
//
// THE FUNCTIONS ARE MOVED, NOT REWRITTEN. parsePatternsApplied() and writeCitations() are the slice-5
// bodies verbatim -- same dedup+sort, same {error} shapes, same
// `ai_activity_log id=<id> IS WRITTEN AND STANDS` refusal text -- so
// tests/regression/ses-424e-patterns-cited.test.mjs grades the same behaviour it graded before, and
// scripts/agent-log.js re-exports parsePatternsApplied from its own path because that file imports
// it from there.
//
// THE THIRD FUNCTION IS NEW AND IT IS DELIBERATELY NOT A VALIDATOR. coercePatternNumbers() reads
// whatever the MODEL put in its answer's `patterns_applied` key -- an array, a csv string, a mix of
// integers and strings and junk -- and returns the positive integers it can make out. It never
// returns {error}, and that is the difference between the two entry points:
//
//   the CLI flag   a human or a driver TYPED this. A bad value is a driver bug, refused loudly
//                  BEFORE the audit row is written, because the fix is to type it correctly.
//   an agent answer  a model wrote this. Attribution is best-effort telemetry (pattern:105) and a
//                  malformed citation must never cost the turn its mandatory ai_activity_log row --
//                  that is SES-423's defect (a run nobody could measure exited 2 and wrote NOTHING)
//                  wearing a new flag. The junk is dropped; the turn still logs.
//
// The FK to public.decision_patterns(pattern_no) is still the only authority on which numbers exist:
// a well-formed-but-invented 999 is refused by the database, never by a list kept here (pattern:2).

/**
 * FEATURE: SES-424 slice 5 -- the citation list, parsed once and exported so the regression drives
 * the real parser rather than a copy of its rules (docs/STANDARDS.md Section 4).
 *
 *   absent or ""      -> []   an answer that cited nothing is a legitimate answer, not an error
 *   "163,1,163"       -> [1, 163]   deduped and sorted, because the row set is a SET: the unique
 *                                   (activity_log_id, pattern_no) constraint would refuse the
 *                                   repeat, and a run should not fail over its own duplicate
 *   "0" / "x" / "1.5" -> { error }  0 is not a pattern number (the library starts at 1) and a
 *                                   non-integer is a driver bug, refused before anything is written
 *
 * Returns an array of integers, or { error }.
 */
export function parsePatternsApplied(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return [];
  const seen = new Set();
  for (const part of String(raw).split(',')) {
    const tok = part.trim();
    if (!/^\d+$/.test(tok)) {
      return { error: `--patterns-applied: "${tok}" is not a pattern number. Pass a comma-separated list of positive integers that exist in public.decision_patterns (e.g. --patterns-applied=1,163), or omit the flag.` };
    }
    const n = Number(tok);
    if (n < 1) {
      return { error: `--patterns-applied: ${n} is not a pattern number -- the library is numbered from 1. Omit the flag when the turn cited nothing.` };
    }
    seen.add(n);
  }
  return [...seen].sort((a, b) => a - b);
}

/**
 * FEATURE: SES-424 slice 6 -- the MODEL's half of the same question, and the one that must never
 * fail a turn. Accepts an array (what an Intent schema's `patterns_applied` produces) or a csv
 * string (what a flag produces), keeps the positive integers, drops everything else, and returns []
 * for anything unreadable. NEVER returns { error } -- see the header: a refused citation that took
 * the mandatory audit row down with it is the SES-423 defect, and attribution is best-effort.
 *
 * Deduped and sorted exactly as parsePatternsApplied() does, for the same reason: the unique
 * (activity_log_id, pattern_no) constraint would refuse a repeat.
 */
export function coercePatternNumbers(value) {
  if (value === undefined || value === null) return [];
  const parts = Array.isArray(value) ? value : String(value).split(',');
  const seen = new Set();
  for (const part of parts) {
    // Number('') is 0 and Number(' 7 ') is 7, so the string is tested before it is converted --
    // an empty element must drop out rather than become the 0 the library has no room for.
    const tok = String(part ?? '').trim();
    if (!/^\d+$/.test(tok)) continue;
    const n = Number(tok);
    if (!Number.isSafeInteger(n) || n < 1) continue;
    seen.add(n);
  }
  return [...seen].sort((a, b) => a - b);
}

/**
 * The citation rows for one turn. Written AFTER the log row exists, because activity_log_id is a
 * foreign key -- there is no row to cite until the audit row is back. Returns { citations } (the
 * count the database actually accepted, re-read from the insert's own representation, never the
 * length of what was asked for) or { error }.
 */
export async function writeCitations(logId, patterns, agentId, capabilitySlug) {
  if (!patterns.length) return { citations: 0 };
  const key = process.env.SUPABASE_SERVICE_KEY;
  const url = `${process.env.SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/decision_pattern_citations`;
  const body = patterns.map(pattern_no => ({
    activity_log_id: logId, pattern_no, agent_id: agentId, capability_slug: capabilitySlug ?? null,
  }));
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: key, Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json', Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) {
    return { error: `citation write refused for pattern(s) ${patterns.join(', ')}: HTTP ${r.status} ${text.slice(0, 300)}. `
      + `ai_activity_log id=${logId} IS WRITTEN AND STANDS -- the audit row is mandatory and is not rolled back to punish a bad citation. `
      + `Re-run the citations alone once the pattern number exists in public.decision_patterns.` };
  }
  const rows = text ? JSON.parse(text) : [];
  return { citations: Array.isArray(rows) ? rows.length : 0 };
}
