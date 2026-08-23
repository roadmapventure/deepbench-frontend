// DeepBench v7.0.207 | scripts/lib/briefing-derive.mjs | SES-163
// FEATURE: the briefing rebuild stops needing a cycle to hand-author the page.
//
// MEASURED 2026-08-23T22:2xZ by cycle 9fc7e4d2 against the live builder, not recalled — and the
// ticket UNDER-COUNTED it by half. `grep -oE 'data\.[a-z_]+' scripts/build-briefing.mjs | sort -u`
// returns 21 distinct --data fields, and `data.stats` carries 12 more inside it: 33 authored
// values, several of them raw HTML fragments, before a cycle can republish. SES-163 filed it at
// "~15". The consequence was measured on the served artifact: PAGE_BUILT 17:57Z with 6 of the 17
// undecided cards filed after it, i.e. sitting on no surface John can tap — and TWO consecutive
// cycles (SES-162/v7.0.204, then 199e67b5) declined the republish for this reason, which is what
// makes it a standing blocker rather than one cycle's judgment call.
//
// WHY THAT IS NOW MORE THAN COSMETIC: SES-154 (v7.0.205) made John's Accept the ONLY thing that
// writes `done`. A ticket the runner delivers waits on a tap he cannot make until the page is
// rebuilt, so an un-republished page converts EVERY delivery into permanently unfinished work.
//
// THE FIX IS NOT "author the fields more carefully" — it is to shrink what a cycle must author.
// Everything mechanically derivable is derived here; what remains is genuinely judgment-bearing
// prose (§3 findings, §4 calibration sentence), which a builder that guessed would be writing
// John's briefing for him.
//
// WHY ITS OWN MODULE: these are string builders over rows. A helper that can only be exercised by
// running the whole builder against live Supabase is a helper nobody tests — the SES-162 precedent,
// applied again. tests/regression/SES-163-briefing-derive.js imports every pure function below with
// no network and no side effects.

// The page's standing times rule (John, 2026-08-20): store UTC, render America/Chicago, LABEL it
// CST year-round. It is his word for his own clock, not a tz abbreviation to be corrected to CDT
// in summer. Do not "fix" it. Same constant, same reason, as briefing-automation.mjs.
const CHI = 'America/Chicago';

const partsIn = (d, opts) => Object.fromEntries(
  new Intl.DateTimeFormat('en-US', { timeZone: CHI, ...opts })
    .formatToParts(d).map(p => [p.type, p.value]));

/** HTML text escape. */
export const H = s => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** A JS single-quoted literal spliced into the template's concatenation. */
export const J = s => "'" + String(s ?? '')
  .replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ') + "'";

/** "Aug 23, 2026 CST" — the masthead date. */
export function cstDay(d) {
  const p = partsIn(d, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${p.month} ${p.day}, ${p.year} CST`;
}

/** "Aug 23" — the §10 "Skipped" column. */
export function cstShortDay(d) {
  const p = partsIn(d, { month: 'short', day: 'numeric' });
  return `${p.month} ${p.day}`;
}

/** "Aug 22, 04:23 PM" — the §7.1 "Recorded (CST)" column. */
export function cstStamp(d) {
  const p = partsIn(d, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
  });
  return `${p.month} ${p.day}, ${p.hour}:${p.minute} ${p.dayPeriod}`;
}

/** "3:29 PM" — the §3 latest-cycle label. */
export function cstTime(d) {
  const p = partsIn(d, { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${p.hour}:${p.minute} ${p.dayPeriod}`;
}

/**
 * The ISO instant of America/Chicago midnight for the CST day containing `d`.
 * This is the step-3 budget boundary (John, 2026-08-21, directive 1d01ea85: "Midnight cst"), and
 * it is NOT cosmetic — the CST day begins at 05:00Z, so most of a night's cycles fall outside it.
 * Derived by reading the Chicago wall clock and subtracting it, so there is no offset to get wrong
 * and no DST branch to forget — the same reasoning that makes briefing-automation.mjs walk the
 * wall clock instead of doing UTC arithmetic.
 */
export function cstDayStartISO(d) {
  const p = partsIn(d, { hour12: false, hour: 'numeric', minute: 'numeric', second: 'numeric' });
  const h = parseInt(p.hour, 10) % 24;
  const ms = d.getTime()
    - h * 3600000 - parseInt(p.minute, 10) * 60000 - parseInt(p.second, 10) * 1000
    - d.getMilliseconds();
  return new Date(ms).toISOString();
}

const M1 = 1e6;
/** Tokens -> "1.2" (millions, one decimal). */
export const M = n => (Number(n || 0) / M1).toFixed(1);
const pct = (a, b) => (!b ? 0 : Math.round((Number(a) / Number(b)) * 100));
const usd = n => Number(n || 0).toFixed(2);

/**
 * §2 stat chips and §4 budget bars, from this CST day's runner_cycles.
 *
 * `dayCap` is resolve_day_token_cap()'s day_cap — NOT runner_budget.runner_day_token_allowance.
 * That distinction is the whole point of SES-147's ladder: the governing number is a RUNG (an
 * override, the stale floor, John's standing box, a calibration, the default), and rendering the
 * static default would tell him the runner is budgeted against a number it is not using.
 */
export function deriveStats(cycles, { apiMonthUsd, dayCap }) {
  const dev = cycles.reduce((a, c) => a + Number(c.est_tokens_dev || 0), 0);
  const qa = cycles.reduce((a, c) => a + Number(c.est_tokens_qa || 0), 0);
  const api = cycles.reduce((a, c) =>
    a + Number(c.api_cost_dev_usd || 0) + Number(c.api_cost_qa_usd || 0), 0);
  const total = dev + qa;
  return {
    shipped: cycles.filter(c => c.outcome === 'shipped').length,
    gated: cycles.filter(c => c.outcome === 'gated_before_build').length,
    dnr: cycles.filter(c => c.outcome === 'did_not_run').length,
    api_total: usd(api),
    api_month: usd(apiMonthUsd),
    tok_dev_m: M(dev),
    tok_qa_m: M(qa),
    tok_total_m: M(total),
    tok_max_m: M(dayCap),
    tok_pct: pct(total, dayCap),
    tok_dev_pct: pct(dev, dayCap),
    tok_qa_pct: pct(qa, dayCap),
  };
}

// The three model rows the template ships, in its order. A model with no cycles today renders 0
// rather than being dropped: a missing row reads as "this model was not offered", and the honest
// statement is that it was available and unused.
const MODELS = [
  ['Fable 5', 'claude-fable-5'],
  ['Opus 5', 'claude-opus-5'],
  ['Sonnet 5', 'claude-sonnet-5'],
];

/** §4's model table body (HTML). `meterPct` is John's latest all-models reading, or null. */
export function modelRowsHtml(cycles, meterPct) {
  const meterCell = i => (i === 0 ? (meterPct == null ? '&mdash;' : `${meterPct}%`)
    : i === 1 ? (meterPct == null ? 'all models &mdash;' : `all models ${meterPct}%`) : '');
  return MODELS.map(([label, id], i) => {
    const n = cycles.filter(c => c.model === id)
      .reduce((a, c) => a + Number(c.est_tokens_dev || 0) + Number(c.est_tokens_qa || 0), 0);
    return `<tr><td>${H(label)}</td><td class="num">${n ? '~' + M(n) + 'M' : '0'}</td>`
      + `<td class="num">${meterCell(i)}</td></tr>`;
  }).join('');
}

/**
 * §7.1's directive rows — JS, not HTML: the template composes the verdict cell with stateOf(),
 * and SES-125's one-function rule is why this emits a CALL rather than a rendered string. Three
 * rows describing the same state three ways is exactly what that rule exists to prevent.
 *
 * STORED vs DERIVED is preserved: a closed directive's verdict is READ from
 * runner_directives.outcome / .outcome_note. A `done` row with a NULL outcome passes null through
 * so the template draws its red defect line — that combination means close_directive() was
 * bypassed, and coercing it to a string would hide the very thing the colour is for.
 */
export function dirRowsJs(dirs, now = new Date()) {
  return dirs.map(d => {
    const live = d.expires_at ? new Date(d.expires_at) > now : false;
    const expires = d.expires_at ? cstStamp(new Date(d.expires_at)) : '';
    const acted8 = d.acted_cycle ? String(d.acted_cycle).slice(0, 8) : '';
    const state = `stateOf(${J(d.type)},${J(d.status)},${d.outcome == null ? 'null' : J(d.outcome)},`
      + `${d.outcome_note == null ? 'null' : J(d.outcome_note)},${J(acted8)},`
      + `${d.expires_at ? J(expires) : 'null'},${live})`;
    return `+dirRow(${J(String(d.id).slice(0, 8))},${J(cstStamp(new Date(d.created_at)))},`
      + `${J(firstLine(d.body))},\n         ${state})\n      `;
  }).join('');
}

/**
 * A directive's body carries John's verbatim line first and a bracketed PROVENANCE block after it.
 * §7.1's "Your line" column is his words — never the provenance a cycle appended, which is longer
 * than the line it annotates and would push his own sentence off the row.
 */
export function firstLine(body) {
  const s = String(body ?? '').split(/\n\s*\n/)[0].trim();
  return s.replace(/\s*\[PROVENANCE[\s\S]*$/, '').trim();
}

/**
 * §9's question rows (JS calls). yes_means / no_means have no columns in runner_questions — the
 * prose-instead-of-column gap v7.0.146 closed for cards and left open here — so a question missing
 * them passes them through as empty and the template renders its own red defect notice. That is
 * deliberate: inventing a consequence for John's Yes is worse than showing that nobody wrote one.
 */
export function questionRowsJs(qs) {
  if (!qs.length) return `+'<p class="empty">None tonight.</p>'\n    `;
  return qs.map((q, i) =>
    `+question(${J('9.' + (i + 1))},${J(q.qid)},\n      ${J(q.question)},\n`
    + `      ${J(q.context || '')},\n      ${J(q.yes_means || '')},\n      ${J(q.no_means || '')})\n    `
  ).join('');
}

/**
 * §10's skip rows (JS calls). `which` is 'decision' (10.1) or 'desktop' (10.2).
 *
 * TWO derivations here are deliberately NOT stored flags, and re-introducing either as a column is
 * how they start disagreeing with reality (SES-127):
 *   - "still skipped" comes from the TICKET's status NOT IN ('done','removed') — building the
 *     ticket later clears the row with no write from anyone.
 *   - `isNew` is briefed_at IS NULL — a row is new exactly once, and a re-skip after briefing does
 *     not clear it, because John has already seen it.
 * `other` falls to 10.1 by design (SES-119): an unclassified row must never invent a desktop chore.
 * `kick` is passed ONLY for a needs-desktop row already marked `designed`, where SES-112's CHECK
 * guarantees kickoff_link is present — so it is never a guess.
 */
export function skipRowsJs(rows, which) {
  const want = which === 'desktop' ? ['needs-desktop'] : null;
  const sel = rows.filter(r => (want ? want.includes(r.reason_kind) : r.reason_kind !== 'needs-desktop'));
  if (!sel.length) return `+'<tr><td colspan="9" class="empty">None &mdash; nothing is waiting on you here.</td></tr>'\n    `;
  return sel.map(r => {
    const kick = which === 'desktop' && r.design_status === 'designed' && r.kickoff_link
      ? J(r.kickoff_link) : 'null';
    return `+skipRow(${J(r.id)},${J(r.backlog_id)},${J(r.priority_class || '—')},`
      + `${r.queue == null ? 'null' : r.queue},${J(r.design_status || '—')},\n       `
      + `${J(r.status)},${J(r.title)},\n       ${J(r.reason)},`
      + `${J(cstShortDay(new Date(r.last_skipped_at)))},${J(r.unblock_kind || '')},`
      + `${r.unblock_ref ? J(r.unblock_ref) : 'null'},${r.briefed_at == null},${kick})\n    `;
  }).join('');
}

/** §14's use rows (JS calls) — production uses only, already resolved by the caller. */
export function useRowsJs(uses) {
  if (!uses.length) return `+'<tr><td colspan="6" class="empty">No production use recorded.</td></tr>'\n    `;
  return uses.map(u =>
    `+useRow(${J(u.when_cst)},${J(u.ip)},${J(u.loc)},${J(u.name)},${J(u.did)},${J(u.cost)})\n    `
  ).join('');
}

/**
 * §4.1's daily-output rows (HTML) — a pass-through of public.daily_reading_output().
 * A day with one reading renders dashes, never zero: one reading is not zero output, it is nothing
 * to measure from, and the two must never look alike (the template's own note).
 */
export function droRowsHtml(rows) {
  if (!rows.length) return '<tr><td colspan="5" class="dim">No readings saved yet.</td></tr>';
  return rows.map(r => {
    // guard <> 'ok' means the window measures nothing — one reading, a meter reset, an empty
    // window. delta_all_pct is NULL in exactly those cases and must render as a dash, never 0.
    const one = r.delta_all_pct == null;
    const day = cstShortDay(new Date(`${r.cst_day}T12:00:00Z`));
    const win = one ? H(r.first_cst) : `${H(r.first_cst)} &rarr; ${H(r.last_cst)}`;
    return `<tr><td class="mono">${day}</td><td class="mono">${win}</td>`
      + (one
        ? `<td class="dim">&mdash; ${H(r.guard || 'one reading only')}</td>`
          + '<td class="dim">&mdash;</td><td class="dim">&mdash;</td>'
        : `<td class="num">+${H(r.delta_all_pct)}%</td>`
          + `<td class="num">~${M(r.est_tokens_in_window)}M</td>`
          + `<td class="num">${H(r.cycles_in_window)}</td>`)
      + '</tr>';
  }).join('');
}

/**
 * THE GUARD SES-163 EXISTS FOR. runner_card_asks.target_id is keyed on a card's DOM id, so a
 * rebuild that re-keys a card ORPHANS John's recorded thread. The old builder read the map from
 * `data.fixed_dom_ids || {}` — a silent empty default — so forgetting it was invisible.
 *
 * Returns the list of ask targets that name an item card the builder is NOT about to render under
 * that id AND that no briefing_dom_ids row claims. A non-empty return is exit 2, never a warning:
 * SES-132's §9.1 orphan renderer means the text still shows and the ledger keeps it, so the failure
 * is silent by construction and the only place it can be caught is here.
 *
 * A target whose card is simply not being rendered (decided, or self-retired) is NOT an error —
 * that is the orphan renderer doing its job, and failing on it would wedge every future rebuild.
 */
export function unregisteredAskTargets(askTargetIds, renderedDomIds, tableDomIds) {
  const rendered = new Set(renderedDomIds);
  const known = new Set(tableDomIds);
  return askTargetIds
    .filter(t => /^item-/.test(t))
    .filter(t => !rendered.has(t) && !known.has(t));
}
