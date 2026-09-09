// DeepBench v7.0.437 | api/cron/rank-backlog.js | SES-334 -- the Prioritizer re-ranks the board on a
// schedule, with no session in the room.
//
// WHY A VERCEL CRON AND NOT THE FINALISER'S PATTERN. `runner-window-finaliser` (SES-320b) is a
// `cron.job` row calling a SQL function on the database's own clock, and it is the better shape --
// no deploy, no bypass header, no cold start. It cannot be used here: this job has to make an HTTP
// call to the executor, and a Postgres function cannot. `pg_net` is the extension that would give it
// one. MEASURED 2026-09-09, not assumed -- `select extname from pg_extension` returns pg_cron,
// pg_stat_statements, pgcrypto, plpgsql, supabase_vault, uuid-ossp, vector. No pg_net. So the caller
// with a clock has to live where the HTTP client already does, which is here. If pg_net is ever
// installed, this route is the thing to retire, and the finaliser is the pattern to retire it into.
//
// THE SCHEDULE IS 09:10 UTC AND THAT IS 03:10 AMERICA/CHICAGO ONLY IN SUMMER. Vercel crons are UTC
// with no timezone field, and Chicago is UTC-5 on CDT and UTC-6 on CST, so ONE UTC minute cannot be
// 03:10 local all year -- it is 03:10 CDT and 02:10 CST. Stated rather than papered over: the job's
// requirement is "overnight, off the runner's own grid", not a particular wall-clock minute, and both
// readings satisfy it. The runner fires at :40 (`runner_settings.cron_minute`) and the window
// finaliser at :17, so :10 collides with neither.
//
// ONE CALL PER EXECUTING PROJECT, NOT ONE PER TICKET. rank-backlog's Intent takes a `ranked` ARRAY --
// the ordering is a decision about a SET (prioritizer-write.js's own note on why the rank shape's
// decision row carries a NULL backlog_id), so splitting it per ticket would produce N decisions about
// N sets of one and no ordering at all.
//
// IT REFUSES RATHER THAN GUESSES. No secret, no candidates, or an executor error -> a `failed` cycle
// row with the reason in `notes` and a non-2xx here. A scheduled job that silently no-ops is the
// SES-319 silence this platform has already paid for once.


// The cycle row's own vocabulary. `trigger` is 'scheduled' (the runner_cycles check constraint's
// value for an unattended clock-driven fire) and the notes PREFIX is what makes these rows findable
// as this job's, separately from the runner's own scheduled cycles.
const NOTES_PREFIX = 'SCHEDULED-AGENT: rank-backlog';
const CAPABILITY = 'rank-backlog';
const INTENT = 'pz-rank-intent';
const AGENT = 'prioritizer';
const TENANT = 'global';

function supabaseHeaders() {
  const key = process.env.SUPABASE_SERVICE_KEY;
  return { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` };
}

async function sb(pathAndQuery, init = {}) {
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: { ...supabaseHeaders(), ...(init.headers || {}) },
  });
  if (!r.ok) throw new Error(`supabase ${init.method || 'GET'} ${pathAndQuery}: ${r.status} ${await r.text()}`);
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}

// The executor's own URL. Read from the deployment's own environment rather than hardcoded, because
// this route runs on preview and production deployments alike and a hardcoded host would make a
// preview silently re-rank production's board.
function executorUrl() {
  const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.SELF_BASE_URL;
  if (!base) throw new Error('neither VERCEL_URL nor SELF_BASE_URL is set -- cannot address the executor');
  return `${base}/api/capabilities/execute`;
}

// The candidates handed to the Prioritizer: the tickets the PICKER can actually reach, read from
// `prime_directive_queue()` itself rather than re-derived from a `backlog_items` filter here.
//
// THAT CHOICE IS THE SAME RULE SES-333 PUT IN THE RUNBOOK, APPLIED TO THIS ROUTE. A hand-written
// "open/partial, queued, not deferred, unclaimed" filter would be a second copy of that function's
// `buildable` CTE, and the copy would go stale the first time the CTE gained a clause. It would also
// rank the WRONG set: measured 2026-09-09, the queued board is 567 rows and the buildable lanes are
// 27 (17 directive + 10 selfbuild). Ordering 567 tickets the picker will never reach is not an
// ordering, it is a bill.
//
// THE CAP IS AN OUTPUT-BUDGET FACT, NOT A ROUND NUMBER. pz-rank-intent's max_tokens is 4000 and each
// ranked entry costs roughly 30 output tokens (id, rank, a <=200-char reason), so a ruling much past
// ~100 entries is one the model cannot finish emitting -- and a TRUNCATED ranking is worse than a
// refused one, because the handler would apply the half it received as if it were the whole order.
const MAX_CANDIDATES = 60;

async function candidates() {
  const lanes = await sb('rpc/prime_directive_queue', { method: 'POST', body: '{}' });
  const refs = (lanes || [])
    .filter(r => r.lane !== 'board' && r.qnum != null && r.ref)
    .sort((a, b) => a.pos - b.pos)
    .slice(0, MAX_CANDIDATES)
    .map(r => r.ref);
  if (refs.length === 0) return [];

  const cols = 'backlog_id,title,description,priority_class,supports_class,supports_reason,'
    + 'type,tier,queue,automation_rank,predicted_cycles,milestone';
  const rows = await sb(`backlog_items?backlog_id=in.(${refs.map(encodeURIComponent).join(',')})`
    + `&select=${cols}&limit=${MAX_CANDIDATES}`);
  // Handed to the model in the FUNCTION's order, not PostgREST's: the existing order is the thing the
  // ruling is being asked to revise, and shuffling it first would hide what changed.
  const byId = new Map((rows || []).map(r => [r.backlog_id, r]));
  return refs.map(id => byId.get(id)).filter(Boolean);
}

// Wait for the executor's own agent-turn audit row(s) to land. Bounded, and it gives up rather than
// blocking the cron: five tries over ~4s comfortably covers the observed lag while staying far inside
// the function's own budget. Returns null (never []) when nothing arrived, so the caller can tell
// "no rows yet" from "rows that summed to zero".
const TURN_POLL_TRIES = 5;
const TURN_POLL_MS = 800;

async function pollForTurns(traceId) {
  if (!traceId) return null;
  for (let i = 0; i < TURN_POLL_TRIES; i++) {
    const rows = await sb(`ai_activity_log?trace_id=eq.${encodeURIComponent(traceId)}`
      + '&select=id,input_tokens,output_tokens').catch(() => null);
    if (Array.isArray(rows) && rows.length > 0) return rows;
    if (i < TURN_POLL_TRIES - 1) await new Promise(r => setTimeout(r, TURN_POLL_MS));
  }
  return null;
}

// One cycle row per run, opened before the call and closed after it, so a crashed run leaves an open
// row rather than no evidence at all.
async function openCycle(projectName) {
  const [row] = await sb('runner_cycles', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      started_at: new Date().toISOString(),
      trigger: 'scheduled',
      stamp: 'vercel-cron rank-backlog',
      model: 'claude-fable-5-1',
      notes: `${NOTES_PREFIX} — opened for ${projectName}`,
    }),
  });
  return row;
}

async function closeCycle(id, patch) {
  await sb(`runner_cycles?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ ended_at: new Date().toISOString(), ...patch }),
  });
}

export default async function handler(req, res) {
  // Vercel's own cron invocations are GETs. A POST is accepted too so the route can be exercised by
  // hand at ship time -- which is exactly how this one's first run was proven.
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'SUPABASE_URL / SUPABASE_SERVICE_KEY not configured' });
  }

  let cycle = null;
  const startedAt = Date.now();
  try {
    // Which board. `projects.status = 'executing'` is the same standing predicate
    // prime_directive_queue() uses (SES-340) -- read, never restated.
    const projects = await sb('projects?status=eq.executing&select=id,name&order=name');
    if (!Array.isArray(projects) || projects.length === 0) {
      // Not a failure: no project is executing, so there is no board to order. A cycle row is still
      // written, because "the job ran and correctly did nothing" and "the job did not run" must be
      // distinguishable in the record.
      cycle = await openCycle('no executing project');
      await closeCycle(cycle.id, {
        outcome: 'did_not_run',
        notes: `${NOTES_PREFIX} — no project is executing; nothing to order`,
      });
      return res.status(200).json({ ok: true, ranked: 0, reason: 'no executing project', cycle_id: cycle.id });
    }

    const project = projects[0];
    cycle = await openCycle(project.name);

    const rows = await candidates();
    if (!Array.isArray(rows) || rows.length === 0) {
      await closeCycle(cycle.id, { outcome: 'did_not_run', notes: `${NOTES_PREFIX} — no queued candidates` });
      return res.status(200).json({ ok: true, ranked: 0, reason: 'no candidates', cycle_id: cycle.id });
    }

    const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
    const r = await fetch(executorUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Deployment protection and the HAR-33 access gate both sit in front of the executor. This
        // route is calling its own deployment, so it holds both secrets already; a missing one is a
        // refusal, never an unauthenticated attempt.
        ...(bypass ? { 'x-vercel-protection-bypass': bypass } : {}),
        ...(process.env.GATE_BYPASS_SECRET ? { 'x-db-gate-bypass': process.env.GATE_BYPASS_SECRET } : {}),
        'x-db-call-source': 'scheduled',
      },
      body: JSON.stringify({
        capability_slug: CAPABILITY,
        intent_slug: INTENT,
        agent_id: AGENT,
        tenant_id: TENANT,
        task_context: { project: project.name, candidates: rows },
        handler_context: { cycle_id: cycle.id, trace_id: `ses-334-${cycle.id}` },
      }),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`executor ${r.status}: ${body.error || 'no error body'}`);

    // The handler's own result, never a recount here: prioritizer-write.js returns what it wrote.
    const written = body?.handler_result?.ranked?.length ?? 0;

    // THE COST IS READ BACK OFF THE EXECUTOR'S OWN AUDIT ROWS, and this route writes NO
    // ai_activity_log row of its own. `.claude/rules/capability-logging.md` is already satisfied for
    // this execution -- the executor logged its agent turn, with the real token counts, the instant
    // the model answered. A second row here would be a second CALL in the AI Audit for one call
    // (LOG-81's Total Calls counts any row carrying a model), and the first draft of this file wrote
    // exactly that: a duplicate row with input_tokens 0 / output_tokens 0, because the executor's JSON
    // response carries no `usage` block. Measured on the first live run -- the real turn was 6,707 in
    // / 1,651 out, the invented row said 0/0. Reading the turn back is the only form that reports the
    // truth AND leaves the audit's call count correct.
    //
    // TOKENS, NEVER A DOLLAR FIGURE COMPUTED HERE. `ai_activity_log.cost_usd` is deliberately never
    // stored: cost is computed at READ time by the single computeCallCost() (AA-181's design). A
    // price table in this route would be a second home for the rates, and the two would disagree the
    // first time a price moves.
    // THE READ-BACK POLLS, BECAUSE THE WRITE IT IS WAITING FOR IS FIRE-AND-FORGET BY DESIGN.
    // logActivity() hands its POST to waitUntil() and never blocks the response, so the executor
    // answers BEFORE its own audit row lands. Measured on the second live run: the immediate read
    // returned zero rows and the row appeared moments later (id 40787, 6,707 in / 1,620 out). A
    // single read here would report 0 tokens on every successful run forever -- a number that looks
    // like a measurement and is a race.
    const turns = await pollForTurns(body.trace_id);

    // `null`, NOT `0`, when the rows never arrive. This project has paid for that distinction twice
    // (SES-147's "NULL is not zero"); a stored 0 would say the run was free.
    const tokens = turns === null
      ? null
      : turns.reduce((n, t) => n + (t.input_tokens || 0) + (t.output_tokens || 0), 0);

    await closeCycle(cycle.id, {
      outcome: written > 0 ? 'shipped' : 'did_not_run',
      item_id: null,
      est_tokens_dev: tokens,
      notes: `${NOTES_PREFIX} — ${written} ticket(s) given an automation_rank on ${project.name}`
        + `; decision ${body?.handler_result?.decision_id || 'none'}`
        + `; ${tokens === null ? 'tokens unread (audit row had not landed)' : `${tokens} tokens over ${turns.length} turn(s)`}`
        + `, trace ${body.trace_id || 'none'}`,
    });

    return res.status(200).json({
      ok: true, ranked: written, cycle_id: cycle.id, project: project.name,
      trace_id: body.trace_id || null, tokens,
    });
  } catch (e) {
    if (cycle) {
      await closeCycle(cycle.id, { outcome: 'failed', notes: `${NOTES_PREFIX} — ${e.message}` }).catch(() => {});
    }
    console.error('[cron/rank-backlog] error:', e);
    return res.status(500).json({ error: e.message, cycle_id: cycle?.id || null });
  }
}
