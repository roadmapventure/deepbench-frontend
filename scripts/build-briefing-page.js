#!/usr/bin/env node
/**
 * DeepBench v7.0.159 | scripts/build-briefing-page.js | SES-124
 *
 * Rebuilds the Morning Briefing page from `docs/runbooks/briefing-template.html` + the `runner_`
 * tables, and writes the finished document to a file the cycle then publishes with the Artifact
 * tool (same URL, always).
 *
 * WHY THIS IS A SCRIPT AND NOT SOMETHING A CYCLE TYPES. Register B18 says build the cards FROM
 * the database's undecided set, never from the cycle's memory of what it filed. Until now that
 * was a rule a cycle followed by hand — it read every undecided row into its own context and
 * retyped the card markup. That is expensive, and worse, it is exactly the shape of task where
 * a tired cycle paraphrases a card it did not write (the failure `v7.0.146` filed the
 * plain_* columns to stop). Here the card text goes DB -> file and is never re-authored.
 *
 * Times shown to John are CST (America/Chicago) and labeled; ledger timestamps stay UTC.
 * The CST day is the same boundary the budget arithmetic uses (runner-cycle.md step 3).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const URL_BASE = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
const DEV_URL = 'https://deepbench-frontend-git-dev-roadmapventures-projects.vercel.app';
if (!URL_BASE || !KEY) { console.error('build-briefing-page: SUPABASE_URL / SUPABASE_SERVICE_KEY required'); process.exit(2); }

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const VERSION = arg('version', 'v0.0.0');
const FINDING = arg('finding', '');
const OUT = arg('out', path.join(process.cwd(), 'briefing-out.html'));

async function rest(p) {
  const r = await fetch(`${URL_BASE}/rest/v1/${p}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
  if (!r.ok) { console.error('build-briefing-page: REST ' + r.status + ' on ' + p, await r.text()); process.exit(2); }
  return r.json();
}

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Emitted markup is spliced into a JS single-quoted string literal in the page's own code block.
const js = s => String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ');
const cst = iso => new Date(iso).toLocaleString('en-US',
  { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const cstTime = iso => new Date(iso).toLocaleString('en-US',
  { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit' });
const M = n => '~' + (Number(n || 0) / 1e6).toFixed(2).replace(/\.00$/, '') + 'M';

function cstDayStartISO() {
  // Midnight America/Chicago, expressed as an instant. Derived rather than hardcoded to an
  // offset so it stays correct across the DST boundary.
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const guess = new Date(parts + 'T00:00:00Z');
  const off = new Date(guess.toLocaleString('en-US', { timeZone: 'UTC' })) - new Date(guess.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
  return new Date(guess.getTime() + off).toISOString();
}

(async () => {
  const dayStart = cstDayStartISO();
  const [items, questions, ladder, cycles, budget, readings] = await Promise.all([
    rest('runner_items?decision=is.null&order=created_at.desc'),
    rest('runner_questions?status=eq.open&order=created_at.desc&limit=5'),
    rest('runner_ladder?order=work_class.asc'),
    rest(`runner_cycles?started_at=gte.${dayStart}&order=started_at.desc`),
    rest('runner_budget?limit=1'),
    rest('runner_usage_readings?order=taken_at.desc&limit=1'),
  ]);

  const b = budget[0] || {};
  const reading = readings[0] || null;
  const dayMax = Number(arg('day-max', b.runner_day_token_allowance || 10000000));

  // ---- §2 Daily activity, over the CST day -------------------------------------------------
  const shipped = cycles.filter(c => c.outcome === 'shipped').length;
  const gated = cycles.filter(c => c.outcome === 'gated_before_build').length;
  const didNot = cycles.filter(c => c.outcome === 'did_not_run').length;
  const usd = cycles.reduce((a, c) => a + Number(c.api_cost_dev_usd || 0) + Number(c.api_cost_qa_usd || 0), 0);
  const tDev = cycles.reduce((a, c) => a + Number(c.est_tokens_dev || 0), 0);
  const tQa = cycles.reduce((a, c) => a + Number(c.est_tokens_qa || 0), 0);
  const tAll = tDev + tQa;
  const pct = n => Math.round((n / dayMax) * 100);

  // ---- §3 Today's findings ------------------------------------------------------------------
  const done = cycles.filter(c => c.ended_at);
  const earlier = done.slice(1).map(c =>
    `<p class="strip-def"><b>${esc(cstTime(c.started_at))}</b> — ${esc((c.outcome || 'open').replace(/_/g, ' '))}` +
    `${c.item_id ? '' : ''}${c.notes ? ' · ' + esc(String(c.notes).split(/[.;]/)[0]).slice(0, 160) : ''}</p>`
  ).join('') || '<p class="strip-def">No earlier cycles closed today.</p>';

  // ---- §§5/6 cards, straight from the DB ----------------------------------------------------
  const cardJs = it => {
    const kindCls = it.kind === 'gated_before_build' ? 'gate' : 'ship';
    const kindTxt = it.kind === 'gated_before_build' ? 'Gated' : 'Ship';
    const body =
      (it.value_case ? `<p><span class="lbl">Value case</span>${esc(it.value_case)}</p>` : '') +
      (it.before_after ? `<p><span class="lbl">Before &rarr; after</span>${esc(it.before_after)}</p>` : '') +
      (it.qa_evidence ? `<p><span class="lbl">QA evidence</span>${esc(it.qa_evidence)}</p>` : '') +
      `<div class="meta"><span>cost $${Number(it.cost_usd || 0).toFixed(2)} API</span>` +
      `<span>model ${esc(it.model || '—')}</span></div>` +
      `<p class="links"><span class="lbl">Where</span><a href="${DEV_URL}">dev site</a></p>`;
    // plain_* are NULL when a cycle filed a card without them. NULL must stay NULL: it is what
    // draws the red defect line (v7.0.145/146). Never coerce to ''.
    const more = it.plain_cant
      ? `,{cant:'${js(esc(it.plain_cant))}',after:'${js(esc(it.plain_after))}',worth:'${js(esc(it.plain_worth))}'}`
      : '';
    return `+card('item-${it.id}','${kindCls}','${kindTxt}','${js(esc(it.backlog_id || ''))}',` +
      `'${js(esc(it.title))}','${js(body)}'${more})\n    `;
  };
  const ships = items.filter(i => i.kind !== 'gated_before_build');
  const gates = items.filter(i => i.kind === 'gated_before_build');
  const shipJs = ships.length ? ships.map(cardJs).join('') : `+'<p class="empty">Nothing shipped since your last look.</p>'\n    `;
  const gateJs = gates.length ? gates.map(cardJs).join('') : `+'<p class="empty">None tonight.</p>'\n    `;

  const qJs = questions.length
    ? questions.map(q => `+question('${js(q.qid || q.id)}','${js(esc(q.question))}','${js(esc(q.context || ''))}',` +
        `'${js(esc(q.yes_means || ''))}','${js(esc(q.no_means || ''))}')\n    `).join('')
    : `+'<p class="empty">No open questions.</p>'\n    `;

  const ladderJs = ladder.map(r =>
    `<tr><td>${esc(r.work_class)}</td><td class="num">${esc(r.rung)}</td><td class="num">${esc(r.streak)}</td></tr>`).join('');

  // ---- splice the generated sections into the template's own render() ------------------------
  const tpl = readFileSync(path.join(process.cwd(), 'docs/runbooks/briefing-template.html'), 'utf8');
  const render =
`document.getElementById('page').innerHTML =
    '<header><div class="db">DB</div><div><h1>Morning Briefing</h1>'
    +'<div class="sub">DeepBench · Automated Development · <a href="https://claude.ai/code/routines" style="color:inherit">&#9654; Run a cycle now</a></div></div>'
    +'<div class="date">${js(cst(new Date().toISOString()))} CST<br>${js(VERSION)}<br><b id="waiting"></b></div></header>'
    +'<div class="wrap">'
    +'<h2><span class="secnum">2</span>Daily activity — today, 12:00 AM to 11:59 PM CST</h2>'
    +'<div class="stats">'
    +'<div class="stat"><b>${shipped}</b><span>Shipped today</span></div>'
    +'<div class="stat"><b>${gated}</b><span>Gated before build</span></div>'
    +'<div class="stat"><b>${didNot}</b><span>Cycles: did not run</span></div>'
    +'<div class="stat"><b>$${usd.toFixed(2)}</b><span>API spend of $${Number(b.day_default_usd || 5).toFixed(2)} day</span></div>'
    +'<div class="stat"><b>${M(tAll)}<br>${pct(tAll)}%</b><span>Tokens of ${M(dayMax)} daily max</span></div>'
    +'</div>'
    +'<p class="strip-def"><b>Gated before build</b> = the run designed the work but a rule said it needs your permission to ship — it&rsquo;s a card below. <b>Did not run</b> = a cycle started, checked the board, and found nothing it was allowed to do.</p>'
    +'<h2><span class="secnum">3</span>Today&rsquo;s findings</h2>'
    +'<div class="finding"><p><span class="lbl">Latest — ${js(cstTime(new Date().toISOString()))} cycle</span>${js(esc(FINDING))}</p></div>'
    +fold('fh','3.1','Earlier today — ${Math.max(done.length - 1, 0)} cycles','${js(earlier)}')
    +'<h2><span class="secnum">4</span>Budget &amp; usage</h2>'
    +'<div class="budget"><h4>API dollars — real money, hard wall</h4>'
    +'<div class="bar"><span class="dev" style="width:${Math.min(pct(0), 100)}%"></span></div>'
    +'<div class="barlbl">Bar = share of today&rsquo;s $${Number(b.day_default_usd || 5).toFixed(2)} spent</div>'
    +'<div class="legend"><span>= $${usd.toFixed(2)} of $${Number(b.day_default_usd || 5).toFixed(2)} today</span><span>$${usd.toFixed(2)} of $${Number(b.month_cap_usd || 100)} this month</span></div>'
    +'<p class="calib">Every runner cycle to date has cost <b>$0.00</b> in billable API calls — the thinking is subscription tokens, tracked below and never charged as dollars.</p></div>'
    +'<div class="budget"><h4>Subscription tokens — your allowance, runner\\'s share<span class="est">all estimated</span></h4>'
    +'<div class="bar"><span class="dev" style="width:${Math.min(pct(tDev), 100)}%"></span><span class="qa" style="width:${Math.min(pct(tQa), 100)}%"></span></div>'
    +'<div class="barlbl">Bar = share of the ${M(dayMax)} daily max used</div>'
    +'<div class="legend"><span><span class="sw" style="background:var(--navy)"></span>build work ${M(tDev)}</span>'
    +'<span><span class="sw" style="background:var(--brass)"></span>QA ${M(tQa)}</span>'
    +'<span>= ${M(tAll)} of ${M(dayMax)} today (${pct(tAll)}%), across ${cycles.length} cycles</span></div>'
    +'<p class="calib">Guardrails: rest at ${b.weekly_rest_pct || 85}% weekly · ${b.runner_share_pct || 50}% share · ${M(b.runner_day_token_allowance || 10000000)}/day uncalibrated · ${M(b.stale_fallback_tokens || 3000000)}/day if the reading is over 48h old.</p></div>'
    +'<div class="budget"><h4>Today\\'s reading — 10 seconds, recalibrates the budget</h4>'
    +'<p class="recorded">'+(state.reading
        ? '&#10003; Your latest reading was recorded — <b>'+esc(state.reading.at)+'</b>: Fable <b>'+esc(state.reading.fable)+'%</b> · All models <b>'+esc(state.reading.all)+'%</b> · 5-hour <b>'+esc(state.reading.h5)+'%</b>.'
        : 'No reading yet — the runner is on its conservative allowance until your first one.')
    +'</p>'
    +'<div class="readgrid">'
    +'<label>Fable %<input type="number" inputmode="numeric" id="r-fable" value="'+esc(state.reading?state.reading.fable:'')+'"></label>'
    +'<label>All models %<input type="number" inputmode="numeric" id="r-all" value="'+esc(state.reading?state.reading.all:'')+'"></label>'
    +'<label>5-hour %<input type="number" inputmode="numeric" id="r-h5" value="'+esc(state.reading?state.reading.h5:'')+'"></label>'
    +'</div><button class="savebtn" id="r-save">Save reading</button></div>'
    +'<h2><span class="secnum">5</span>Shipped</h2>'
    ${shipJs}+'<h2><span class="secnum">6</span>Gated before build — your promote / kill</h2>'
    ${gateJs}+'<h2><span class="secnum">7</span>Directive queue — your seed, any time</h2>'
    +'<div class="directive"><textarea placeholder="Type a directive in plain words, then tap outside the box to save. The next cycle picks it up first.">'+esc(state.directive)+'</textarea>'
    +'<div class="savebar" id="savebar">'+(readOnly?'read-only view — decisions record for the owner only':'')+'</div></div>'
    +'<h2><span class="secnum">9</span>Questions — tap yes or no</h2>'
    ${qJs}+'<h2><span class="secnum">13</span>Trust ladder</h2><table>'
    +'<tr><th>Work class</th><th>Rung</th><th>Streak</th></tr>${js(ladderJs)}</table>'
    +'</div>';
    wire();`;

  const out = tpl.replace(/document\.getElementById\('page'\)\.innerHTML =[\s\S]*?wire\(\);/, () => render);
  if (out === tpl) { console.error('build-briefing-page: render() block not found — template shape changed'); process.exit(2); }

  const stateBlock = JSON.stringify({ items: {}, directive: '', reading: reading
    ? { fable: String(reading.fable_pct), all: String(reading.all_models_pct), h5: String(reading.session_5h_pct),
        at: new Date(reading.taken_at).toISOString().slice(0, 16) + 'Z' } : null,
    answers: {}, asks: {} }).replace(/</g, '\\u003c');
  const final = out.replace(/(<script type="application\/json" id="briefing-state">)[\s\S]*?(<\/script>)/, `$1${stateBlock}$2`);

  writeFileSync(OUT, final);
  console.log(`build-briefing-page: wrote ${OUT} — ${ships.length} ship card(s), ${gates.length} gated, ` +
    `${questions.length} question(s), ${cycles.length} cycle(s) today (CST), tokens ${M(tAll)} of ${M(dayMax)} (${pct(tAll)}%).`);
  const missing = items.filter(i => !i.plain_cant).map(i => i.id);
  if (missing.length) console.log(`build-briefing-page: NOTE ${missing.length} undecided card(s) have NULL plain_cant and will render the red defect line: ${missing.join(', ')}`);
})();
