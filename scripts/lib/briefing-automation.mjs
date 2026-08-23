// DeepBench v7.0.204 | scripts/lib/briefing-automation.mjs | SES-162
// FEATURE: §2b's cycle-written half, derived. The briefing builder (scripts/build-briefing.mjs,
// SES-149, v7.0.200) derives thirteen sections from SQL and had NO anchor for the `AUTOMATION`
// object at all, so every page it built published briefing-template.html's SAMPLE values.
//
// FOUND LIVE 2026-08-23T18:1xZ on the SERVED artifact, not reasoned about: the page John was
// looking at (PAGE_BUILT 2026-08-23T17:57Z, built by the builder 25 minutes earlier) told him his
// last run was `sample value — 12:41 AM CST · SES-143 · shipped`, his next run was
// `sample value — 8:40 AM CST`, and his standing drain had 17 tickets left against a live 11.
// The template's own comment states the contract that was being broken, verbatim: "EVERY REBUILD
// REGENERATES IT from runner_settings / runner_directives / runner_drain_scope / runner_cycles."
//
// WHY IT LIVES IN ITS OWN MODULE rather than inline in the builder: the two pieces most likely to
// be wrong are pure arithmetic over a wall clock, and a helper that can only be exercised by
// running the whole builder against live Supabase is a helper nobody tests. tests/regression/
// SES-162-briefing-automation.js imports these directly, with no network and no side effects.
//
// THE ONE THAT IS EASY TO GET WRONG, and it is why nextFireChicago walks the wall clock instead of
// doing offset arithmetic: since SES-151 (v7.0.196) the scheduler grid is an America/Chicago HOUR
// divisible by interval_hours -- 12/3/6/9 AM/PM on John's clock, every day, DST-proof by
// construction. Computing it as "now + N hours" in UTC is right for exactly half the year and
// silently an hour off for the other half, which is the drift SES-151 killed at the gate and which
// must not come back in the render. Reading the formatted Chicago hour has no offset to get wrong.

// The page's standing times rule (John, 2026-08-20): store UTC, render America/Chicago, and LABEL
// it CST. The label is deliberately "CST" year-round -- it is his word for his own clock, not a
// tz abbreviation to be corrected to CDT in summer. Do not "fix" it.
const CHI = 'America/Chicago';

const partsIn = (d, opts) => Object.fromEntries(
  new Intl.DateTimeFormat('en-US', { timeZone: CHI, ...opts })
    .formatToParts(d).map(p => [p.type, p.value]));

/** Wall-clock hour (0-23) and minute in America/Chicago for an instant. */
export function chicagoHourMinute(d) {
  const p = partsIn(d, { hour12: false, hour: 'numeric', minute: 'numeric' });
  return { hour: parseInt(p.hour, 10) % 24, minute: parseInt(p.minute, 10) };
}

/** "12:41 PM" in America/Chicago. */
export function chicagoClock(d) {
  const p = partsIn(d, { hour12: true, hour: 'numeric', minute: '2-digit' });
  return `${p.hour}:${p.minute} ${p.dayPeriod}`;
}

/** "Aug 23" in America/Chicago -- used only to decide whether to say "tomorrow". */
export function chicagoDay(d) {
  const p = partsIn(d, { month: 'short', day: 'numeric' });
  return `${p.month} ${p.day}`;
}

/**
 * The next scheduled fire on John's clock grid (SES-151): the first instant strictly after `now`
 * whose America/Chicago hour is divisible by `intervalHours` and whose minute equals `cronMinute`.
 *
 * Walks minute by minute over the formatted wall clock -- at most 48h of candidates, which is
 * trivial, and which is what makes it DST-proof: on a spring-forward day the 2 AM wall minute
 * simply never occurs and the walk steps over it, and on a fall-back day the first occurrence
 * wins. Returns null if no candidate exists inside 48h (only reachable with a nonsense interval,
 * and null renders as "—" rather than a wrong time).
 */
export function nextFireChicago(now, intervalHours, cronMinute) {
  const n = Number(intervalHours), m = Number(cronMinute);
  if (!Number.isInteger(n) || n < 1 || n > 24) return null;
  if (!Number.isInteger(m) || m < 0 || m > 59) return null;
  const base = now instanceof Date ? now.getTime() : Number(now);
  for (let i = 1; i <= 60 * 48; i++) {
    const t = new Date(base + i * 60000);
    const { hour, minute } = chicagoHourMinute(t);
    if (minute === m && hour % n === 0) return t;
  }
  return null;
}

/** The runner's outcomes as PLAIN WORDS -- John's language rule, never the column's underscores. */
export const PLAIN_OUTCOME = {
  shipped: 'shipped',
  gated_before_build: 'gated before build',
  did_not_run: 'did not run',
  reverted: 'reverted',
  failed: 'failed',
};

const commas = n => Number(n).toLocaleString('en-US');
const trim = (s, n) => {
  const x = String(s ?? '');
  return x.length <= n ? x : x.slice(0, n).replace(/\s+\S*$/, '') + '…';
};

/**
 * Build the §2b AUTOMATION object from live rows.
 *
 * `sel` and `rpc` are the builder's own PostgREST helpers, passed in so this module never opens a
 * connection of its own and the test never needs one. `now` is injectable for the same reason.
 */
export async function deriveAutomation(sel, rpc, now = new Date()) {
  const settings = (await sel('runner_settings?id=eq.1&select=*'))[0] || {};
  const intervalHours = settings.interval_hours ?? 3;
  const cronMinute = settings.cron_minute ?? 40;

  // The standing drain: a QUEUED drain-epic directive. Unticked means no queued drain -- never
  // "a drain that finished", which is what drain_history is for (briefing-page.md §2b contract).
  const drains = await sel(
    'runner_directives?type=eq.drain-epic&status=eq.queued&select=id,epic_id&order=created_at.asc&limit=1');
  const drain = drains[0] || null;

  let drainEpic = 'Automation', drainNamed = 0, drainLeft = 0;
  if (drain) {
    const epics = await sel(`epics?id=eq.${drain.epic_id}&select=name`);
    drainEpic = epics[0]?.name || drainEpic;
    // SES-142: the finish line is the FIXED list John named, never the epic's live `now` tier.
    // runner_drain_scope.item_id is the FK; backlog_id there is a naming-time snapshot and is
    // deliberately never joined on (backlog_id is not unique -- CHI-48 occupies two rows, SES-97).
    const scope = await sel(`runner_drain_scope?directive_id=eq.${drain.id}&select=item_id`);
    drainNamed = scope.length;
    if (scope.length) {
      const ids = scope.map(s => s.item_id).join(',');
      const open = await sel(
        `backlog_items?id=in.(${ids})&status=not.in.(done,removed)&select=id`);
      drainLeft = open.length;
    }
  }

  // Completed drains. NOTE, because the obvious column is not there: runner_directives has NO
  // `updated_at` (id, created_at, type, body, max_usd, item_ref, status, acted_cycle, max_tokens,
  // expires_at, epic_id, outcome, outcome_note — read live, not recalled, after a 42703 from
  // PostgREST). `created_at` is when JOHN DECLARED the drain, never when it finished, so using it
  // would print a completion time that is off by the whole life of the drain. The finish time is
  // the closing cycle's `ended_at`; when `acted_cycle` is null there is no honest time on file and
  // the line simply carries none rather than inventing one.
  const closed = await sel(
    'runner_directives?type=eq.drain-epic&status=in.(done,cancelled)&select=epic_id,acted_cycle,created_at&order=created_at.desc&limit=5');
  const epicNames = Object.fromEntries((await sel('epics?select=id,name')).map(e => [e.id, e.name]));
  const drainHistory = [];
  for (const d of closed) {
    const name = epicNames[d.epic_id] || 'epic';
    let when = null;
    if (d.acted_cycle) {
      const c = (await sel(`runner_cycles?id=eq.${d.acted_cycle}&select=ended_at`))[0];
      if (c?.ended_at) when = `${chicagoClock(new Date(c.ended_at))} CST`;
    }
    drainHistory.push(when ? `${name} completed — ${when}` : `${name} completed`);
  }

  // Last run: the most recent CLOSED cycle. SES-119 -- a ticket named anywhere John reads carries
  // its title, not just its id, so the line names what the run was about.
  const last = (await sel(
    'runner_cycles?ended_at=not.is.null&select=started_at,item_id,outcome&order=ended_at.desc&limit=1'))[0];
  let lastCycle = 'no run recorded yet';
  if (last) {
    const when = `${chicagoClock(new Date(last.started_at))} CST`;
    const verdict = PLAIN_OUTCOME[last.outcome] || String(last.outcome ?? 'open');
    let what = last.item_id || 'no ticket';
    if (last.item_id && /^[A-Z]+-[0-9]+[a-z]?$/.test(last.item_id)) {
      const row = (await sel(
        `backlog_items?backlog_id=eq.${last.item_id}&select=title,description&limit=1`))[0];
      if (row) {
        const t = await rpc('backlog_display_title', { p_title: row.title, p_description: row.description });
        what = `${last.item_id} — ${trim(typeof t === 'string' ? t : row.title, 60)}`;
      }
    }
    lastCycle = `${when} · ${what} · ${verdict}`;
  }

  const nf = nextFireChicago(now, intervalHours, cronMinute);
  const nextFire = nf === null ? '—'
    : `${chicagoClock(nf)} CST${chicagoDay(nf) === chicagoDay(now) ? '' : ' tomorrow'}`;

  // SES-147: the cap in force is resolve_day_token_cap(), NEVER the box multiplied out here. The
  // box is one of five rungs and an override or the 48h stale floor can outrank it, so a line
  // computed locally is wrong on exactly the days a higher rung fires.
  const cap = (await rpc('resolve_day_token_cap', { p_cycle_id: null }))[0] || {};
  const dailyMaxEffective = cap.day_cap == null
    ? 'no cap resolved — the budget row is missing'
    : `${commas(cap.day_cap)} tokens today — ${cap.cap_reason}`;

  return {
    scheduler_on: settings.scheduler_on !== false,
    interval_hours: intervalHours,
    drain_on: !!drain,
    drain_epic: drainEpic,
    drain_left: drainLeft,
    drain_named: drainNamed,
    drain_history: drainHistory,
    daily_max_millions: settings.daily_max_tokens_millions ?? null,
    daily_max_effective: dailyMaxEffective,
    last_cycle: lastCycle,
    next_fire: nextFire,
  };
}

/** Render the object as the template's own literal, ready to splice in. */
export function automationLiteral(a) {
  const J = s => JSON.stringify(String(s ?? ''));
  return `var AUTOMATION = {
    scheduler_on: ${a.scheduler_on},
    interval_hours: ${a.interval_hours},
    drain_on: ${a.drain_on},
    drain_epic: ${J(a.drain_epic)},
    drain_left: ${a.drain_left},
    drain_named: ${a.drain_named},
    drain_history: ${JSON.stringify(a.drain_history)},
    daily_max_millions: ${a.daily_max_millions === null ? 'null' : Number(a.daily_max_millions)},
    daily_max_effective: ${J(a.daily_max_effective)},
    last_cycle: ${J(a.last_cycle)},
    next_fire: ${J(a.next_fire)}
  };

  `;
}
