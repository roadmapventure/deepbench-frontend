// DeepBench v7.0.596 | api/_lib/handlers/auditor-write.js | AGT-131 -- THE LOOP IS GONE AND THE
// INTAKE IS SHARED. This file used to carry its own copy of the read/classify/append sequence,
// commented "the CLI's read verbatim" -- two implementations of one seam, agreeing with themselves
// until the week they stopped. It now calls scripts/audit-ledger.js's ingestFindings() with `get`
// and `post` built from the executor's supabaseUrl/supabaseHeaders, which is the ONE thing this
// file ever added over the CLI (pattern:14, pattern:15). The Auditor's intents report governance
// defects, so the run's finding_type is `defect` unless handler_context names another; a finding
// that declares its own type keeps it.
//
// WHAT STAYS A LOOP HERE, and only this: the ruling PATCH over the verdicts ingestFindings()
// returns. Filing is the ledger's job and is now shared; RULING is this handler's, because the CLI
// has no such path -- a `seen` finding that arrives already carrying a status other than `open`
// patches the four columns the table's trigger allows. Deleting that pass with the append loop
// would have silently dropped a ruling the Auditor had already made.
//
// DeepBench v7.0.485 | api/_lib/handlers/auditor-write.js | AGT-70 -- The Auditor's write handler:
// a cluster of findings from an Intent turn becomes rows on `public.audit_findings`.
// FEATURE: AGT-70 -- dispatched generically via format_contract.handler === 'auditor-write', the
// same registry pattern as prioritizer-write.js / report-card-write.js / library-lookup.js (the
// HANDLERS map in api/prompt/request-receivable.js). This file performs no agent-id and no
// capability-slug check of its own -- ownership is enforced by which Skill Profile sets
// handler: 'auditor-write' in the first place (only au-agent-data-intent and au-corpus-intent do),
// never by a conditional here (.claude/rules/capabilities-are-data.md).
//
// THE CLASSIFICATION IS NOT THIS FILE'S. scripts/audit-ledger.js owns the fingerprint, the ISO
// week, the four-way verdict and the row shape, and it is imported rather than restated: a second
// copy of classifyIngest() here would be two implementations agreeing with themselves until the
// week they stopped. What this file adds is the ONE thing the CLI cannot do -- run inside a
// capability turn, with the executor's supabaseUrl/supabaseHeaders rather than process.env.
//
// THE READ DELIBERATELY OVER-READS, and it is the CLI's read verbatim (doIngest): every row
// sharing a fingerprint with this batch in ANY week -- that is what tells `recurring` from `new` --
// plus every `not-a-defect` row whatever its fingerprint, because the ruled-out test matches on
// location homes and no fingerprint filter would ever fetch those rows. A read narrowed to this
// week alone would silently reclassify every carry as new work and re-open every question John
// has already ruled on.
//
// WHAT EACH VERDICT DOES, and the asymmetry is the ledger's, not this file's:
//   new / recurring  APPEND. Counted in `written`.
//   seen             the (fingerprint, week) row already exists -- UNIQUE (fingerprint, iso_week)
//                    refuses a second one -- so it is never appended. Counted in `reseen`.
//   ruled-out        never appended: re-filing John's ruling turns one closed question into a
//                    permanent weekly reminder. Counted in `skipped`, with every malformed finding.
// written + reseen + skipped therefore equals the number of findings received, always.
//
// FILING IS NOT RULING, and the PATCH is the only place that could break it. A `seen` finding is
// patched ONLY when it arrives already carrying a status other than `open`, and only in
// {status, ruling, ruled_by, ruled_at} -- the four columns the ledger's own trigger allows an
// UPDATE to touch. An unconditional patch would write `open` and a null ruling straight over a
// ruling John had already made. Nothing here ever issues a DELETE; the table refuses one anyway.
//
// A MALFORMED FINDING IS SKIPPED AND COUNTED, NEVER THROWN. The content is a model turn, so one
// bad element is expected input, not an outage: throwing would lose the other nine findings of the
// same cluster and surface as a 500 with nothing filed.
//
// SES-176's contract makes the import safe: scripts/audit-ledger.js runs its CLI only when it is
// the process entry point, so importing it here executes no argv parsing and no process.exit.

import { ingestFindings, isoWeek } from '../../../scripts/audit-ledger.js';
import { logActivity } from '../../../lib/activity-log.js';

const WEEK_FORM = /^\d{4}-W\d{2}$/;

async function rest(supabaseUrl, supabaseHeaders, path, init = {}) {
  const r = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: { ...supabaseHeaders, ...(init.headers || {}) },
  });
  if (!r.ok) throw new Error(`auditor-write: ${init.method || 'GET'} ${path} failed: ${r.status} ${await r.text()}`);
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}

// The attribution half of ck_before_image_attribution: exactly one of cycle_id / session_name. A
// capability execution run outside a cycle has no runner_cycles row to point at, so it is the
// session_name side -- the same shape prioritizer-write.js uses, and the reason two ingests of the
// same week stay distinguishable in the ledger.
function attribution(cycleId, handler_context) {
  if (cycleId) return { cycle_id: cycleId, session_name: null };
  const tag = handler_context?.trace_id || handler_context?.session_name || 'untraced';
  return { cycle_id: null, session_name: `auditor:${tag}` };
}

// A finding the ledger can actually fingerprint and store. `kind`, `governing_fact` and a
// locations array are the three the fingerprint is built from; the rest of the row is nullable.
function usable(f) {
  return Boolean(
    f && typeof f === 'object' && !Array.isArray(f) &&
    typeof f.kind === 'string' && f.kind.trim() &&
    typeof f.governing_fact === 'string' && f.governing_fact.trim() &&
    Array.isArray(f.locations) && f.locations.length > 0
  );
}

export async function handle({ agent_id, tenant_id, content, supabaseUrl, supabaseHeaders, handler_context }) {
  const startTime = Date.now();

  // The Intent's JSON, whether the executor already parsed it or handed the raw string through.
  let payload = content;
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch { payload = null; }
  }
  const all = Array.isArray(payload?.findings) ? payload.findings : [];

  const ctxWeek = handler_context?.week;
  const week = WEEK_FORM.test(String(ctxWeek ?? '')) ? String(ctxWeek) : isoWeek(new Date());
  const cycleId = handler_context?.cycle_id ?? null;
  const foundBy = agent_id;

  const findings = all.filter(usable);
  let skipped = all.length - findings.length;
  let written = 0;
  let reseen = 0;

  if (findings.length) {
    const attrib = attribution(cycleId, handler_context);

    // The read, the four-way verdict and the before-image-then-append are the ledger's. The
    // transports are ours: a capability turn holds the executor's headers, never process.env.
    // §19v lives inside ingestFindings() -- the before-image is written FIRST and only its success
    // authorises the append, and row_data null is how a Reverse of a filing becomes a DELETE.
    const ingest = await ingestFindings({
      findings,
      week,
      foundBy,
      findingType: handler_context?.finding_type ?? 'defect',
      cycleId: attrib.cycle_id,
      sessionName: attrib.session_name,
      apply: true,
      get: q => rest(supabaseUrl, supabaseHeaders, q),
      post: (table, body) => rest(supabaseUrl, supabaseHeaders, table, {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(body),
      }),
    });

    written = ingest.written;
    reseen = ingest.reseen;
    skipped += ingest.skipped;

    // FILING IS NOT RULING. A `seen` finding is patched ONLY when it arrives already carrying a
    // status other than `open`, and only in {status, ruling, ruled_by, ruled_at} -- the four
    // columns the ledger's own trigger allows an UPDATE to touch. An unconditional patch would
    // write `open` and a null ruling straight over a ruling John had already made.
    for (const v of ingest.verdicts) {
      if (v.verdict !== 'seen') continue;
      const status = v.finding.status ?? 'open';
      if (status === 'open') continue;
      await rest(
        supabaseUrl, supabaseHeaders,
        `audit_findings?fingerprint=eq.${v.fingerprint}&iso_week=eq.${week}`,
        {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            status,
            ruling: v.finding.ruling ?? null,
            ruled_by: v.finding.ruled_by ?? foundBy,
            ruled_at: v.finding.ruled_at ?? new Date().toISOString(),
          }),
        },
      );
    }
  }

  logActivity({
    tenantId: tenant_id || 'global',
    agentId: agent_id,
    aiType: 'deterministic',
    feature: 'auditor:ledger-write',
    latencyMs: Date.now() - startTime,
    callFacts: {
      auditor_week: week,
      findings_received: all.length,
      findings_written: written,
      findings_reseen: reseen,
      findings_skipped: skipped,
      cluster: typeof payload?.cluster === 'string' ? payload.cluster : null,
    },
  });

  return { week, written, reseen, skipped };
}
