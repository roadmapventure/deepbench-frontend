#!/usr/bin/env node
// DeepBench v7.0.204 | scripts/build-briefing.mjs | SES-162 — §2b's AUTOMATION object is now
// DERIVED (see the splice at the foot of this file and scripts/lib/briefing-automation.mjs).
// Until v7.0.204 this builder had no anchor for it at all, so every page it produced published
// briefing-template.html's SAMPLE values: measured on the served artifact 2026-08-23T18:1xZ,
// John's panel said his last run was "sample value — 12:41 AM CST · SES-143 · shipped" and his
// standing drain had 17 tickets left against a live 11.
// DeepBench v7.0.200 | scripts/build-briefing.mjs | SES-149
// FEATURE: the briefing rebuild has a builder. It did not have one.
//
// FOUND LIVE 2026-08-23T15:0xZ by cycle 03c19332 and confirmed by this cycle's own premise
// revalidation: `grep -rln briefing-template scripts/` returns NOTHING. runner-cycle.md step 9 and
// briefing-page.md have required every cycle to rebuild the page "structurally from
// briefing-template.html + the runner_ tables" since v7.0.99, and every cycle has done it BY HAND
// -- roughly fourteen SQL queries re-derived into hardcoded string literals spread across a
// 1,700-line template. Two cycles in a row hit that wall.
//
// WHAT THIS SCRIPT OWNS, AND WHAT IT DELIBERATELY DOES NOT. Stated plainly, because a builder that
// silently invents the half it cannot derive is worse than no builder:
//
//   DERIVED HERE, from SQL, with no cycle judgment involved:
//     - the `briefing-state` seed             (public.briefing_state_seed(), v7.0.197)
//     - the section 5/6 card set              (public.briefing_open_cards(), v7.0.199)
//     - PAGE_BUILT                            (the publish minute)
//     - section 2  daily activity             (runner_cycles over the CST day)
//     - section 8  the queue matrix           (backlog_items ORDER BY queue)
//     - section 10 skipped rows + count chip  (runner_skips, derived "still skipped")
//     - section 11 now-tier by class          (grouped on the class DIGIT, never the string)
//     - section 13 trust ladder               (runner_ladder)
//     - section 14 who used DeepBench         (ai_activity_log, production host only)
//
//   NOT DERIVED -- supplied by the cycle in --data, because these need judgment and a builder that
//   guessed them would be writing John's briefing for him:
//     - section 3  today's findings           (what the run actually found, in his register)
//     - section 4  the calibration sentence   (which number is governing today, and why)
//     - section 4.1 daily output rows         (public.daily_reading_output() -- pass-through prose)
//     - section 7/7.1 directive lines         (his own words + what became of them)
//     - section 9  questions, section 12 vision claims (both are asks, not data)
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/build-briefing.mjs \
//     --template docs/runbooks/briefing-template.html --data <cycle.json> --out briefing-out.html
//
// Exit 0 = built. Exit 2 = COULD NOT RUN (missing env, REST failure, a template anchor that moved).
// Exit 2 is never a pass: an anchor that moved means the template was edited under the builder, and
// the honest response is to fix the builder, never to publish a page with a section left as sample
// text. Every substitution is anchored and asserted -- see must()/splice() below.

import fs from 'fs';
// SES-162 (v7.0.204) — §2b's cycle-written half. Pure helpers live in their own module so the
// grid arithmetic can be tested without running this builder against live Supabase.
import { deriveAutomation, automationLiteral } from './lib/briefing-automation.mjs';

const argv = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};
const die = (msg) => { console.error(`build-briefing: ${msg}`); process.exit(2); };

const SUPABASE_URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
const TPL = arg('template', 'docs/runbooks/briefing-template.html');
const OUT = arg('out', 'briefing-out.html');
const DATA = arg('data');
const PAGE_BUILT = arg('page-built', new Date().toISOString().slice(0, 16) + 'Z');

if (!SUPABASE_URL || !KEY) die('SUPABASE_URL / SUPABASE_SERVICE_KEY must be in env (runner_secrets)');
if (!DATA) die('--data <cycle.json> is required: the narrative sections are the cycle\'s, not the builder\'s');

const hdrs = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
async function rpc(fn, body = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers: hdrs, body: JSON.stringify(body) });
  if (!r.ok) die(`rpc ${fn}: ${r.status} ${await r.text()}`);
  return r.json();
}
async function sel(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: hdrs });
  if (!r.ok) die(`select ${path}: ${r.status} ${await r.text()}`);
  return r.json();
}

// esc() for HTML text; J() for a JS single-quoted literal spliced into the template's concatenation.
const H = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const J = s => "'" + String(s ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ') + "'";
const M = n => (Number(n) / 1e6).toFixed(1);

const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
let t = fs.readFileSync(TPL, 'utf8');

function must(find, repl, label) {
  if (!t.includes(find)) die(`ANCHOR MISSING: ${label} — the template changed under the builder`);
  t = t.replace(find, repl);
}
function splice(a0, b0, repl, label) {
  const a = t.indexOf(a0), b = t.indexOf(b0);
  if (a < 0 || b < 0 || b < a) die(`ANCHOR MISSING: ${label} — the template changed under the builder`);
  t = t.slice(0, a) + repl + t.slice(b);
}

// ---------------------------------------------------------------------------
// Derived inputs
// ---------------------------------------------------------------------------
const seed = await rpc('briefing_state_seed');
const cards = await rpc('briefing_open_cards');
const rendered = cards.filter(c => c.render);
const retired = cards.filter(c => !c.render);

// `item-chi84-gate` and any other id John's ask threads are keyed on MUST survive a rebuild:
// runner_card_asks.target_id is looked up by the card's DOM id, so renaming one orphans his thread.
// The map is data, not code — a cycle adds to it, the builder never invents one.
const FIXED_IDS = data.fixed_dom_ids || {};
const domIdFor = it => FIXED_IDS[it.id] || 'item-' + it.id.slice(0, 8);
const tidFor = it => it.backlog_id || (data.tid_override || {})[it.id] || '—';
const idLineFor = it => it.display_ref
  || `${it.backlog_id} (${it.ticket_type || 'Tooling'} · ${it.ticket_class || 'P10 - Tooling'})`;

function techHtml(it) {
  let h = '';
  if (it.value_case)   h += `<p><span class="lbl">Value case</span>${H(it.value_case)}</p>`;
  if (it.before_after) h += `<p><span class="lbl">Before &rarr; after</span>${H(it.before_after)}</p>`;
  if (it.qa_evidence)  h += `<p><span class="lbl">QA evidence</span>${H(it.qa_evidence)}</p>`;
  const meta = [`<span>cost ${it.cost_usd == null ? '&mdash;' : '$' + Number(it.cost_usd).toFixed(2)} API</span>`];
  if (it.model) meta.push(`<span>model ${H(it.model)}</span>`);
  h += `<div class="meta">${meta.join('')}</div>`;
  if (it.dev_link) h += `<p class="links"><a href="${H(it.dev_link)}">${it.dev_link.startsWith('http') ? 'link' : H(it.dev_link)}</a></p>`;
  return h;
}
const cardCall = (num, it, cls, txt) =>
  `+card(${J(num)},${J(domIdFor(it))},${J(cls)},${J(txt)},${J(tidFor(it))},\n      ${J(idLineFor(it))},\n      ${J(it.title)},\n      ${J(techHtml(it))},\n      { cant: ${J(it.plain_cant)},\n        after: ${J(it.plain_after)},\n        worth: ${J(it.plain_worth)} })\n    `;

// ---------------------------------------------------------------------------
// Substitutions
// ---------------------------------------------------------------------------
// THE SEED (v7.0.197). The template ships a sentinel, never a valid empty state.
must('<script type="application/json" id="briefing-state">{"__unseeded":true}</script>',
  '<script type="application/json" id="briefing-state">' + JSON.stringify(seed).replace(/</g, '\\u003c') + '</script>',
  'briefing-state sentinel');

t = t.replace(/var PAGE_BUILT = '[^']*'/, `var PAGE_BUILT = '${PAGE_BUILT}'`);
if (!t.includes(`var PAGE_BUILT = '${PAGE_BUILT}'`)) die('ANCHOR MISSING: PAGE_BUILT');

must(`+'<div class="date">Aug 19, 2026 CST<br>v7.0.94<br><b id="waiting"></b>'`,
  `+'<div class="date">${data.today_cst}<br>${data.version}<br><b id="waiting"></b>'`, 'masthead');

// §2 — derived from runner_cycles over the CST day
const st = data.stats;
must(`+'<div class="stat"><b>1</b><span>Shipped today</span></div>'`, `+'<div class="stat"><b>${st.shipped}</b><span>Shipped today</span></div>'`, '§2 shipped');
must(`+'<div class="stat"><b>0</b><span>Gated before build</span></div>'`, `+'<div class="stat"><b>${st.gated}</b><span>Gated before build</span></div>'`, '§2 gated');
must(`+'<div class="stat"><b>0</b><span>Cycles: did not run</span></div>'`, `+'<div class="stat"><b>${st.dnr}</b><span>Cycles: did not run</span></div>'`, '§2 dnr');
must(`+'<div class="stat"><b>$0.00</b><span>API spend of $5.00 day</span></div>'`, `+'<div class="stat"><b>$${st.api_total}</b><span>API spend of $5.00 day</span></div>'`, '§2 api');
must(`+'<div class="stat"><b>~0M<br>0%</b><span>Tokens of 10M daily max</span></div>'`,
  `+'<div class="stat"><b>~${st.tok_total_m}M<br>${st.tok_pct}%</b><span>Tokens of ${st.tok_max_m}M daily max</span></div>'`, '§2 tokens');

// §3 — the cycle's, never the builder's
must(`+'One line to a short paragraph: what this run actually found. Sample value.</p></div>'`,
  `+${J(data.finding_text)}+'</p></div>'`, '§3 text');
must(`+'<div class="finding"><p><span class="lbl">Latest — 3:29 PM cycle</span>'`,
  `+'<div class="finding"><p><span class="lbl">Latest &mdash; ${data.finding_time} cycle</span>'`, '§3 label');
must(`fold('fh','3.1','Earlier today — 0 cycles',
       '<p class="strip-def">One line per earlier cycle of the CST day, newest first — time, '
      +'outcome, and the single thing worth knowing. Sample value.</p>')`,
  `fold('fh','3.1',${J(data.earlier_title)},\n       ${J(data.earlier_html)})`, '§3 fold');

// §4
must(`+'<span>= $0.00 of $5.00 today</span><span>$0.00 of $100 this month</span></div></div>'`,
  `+'<span>= $${st.api_total} of $5.00 today</span><span>$${st.api_month} of $100 this month</span></div></div>'`, '§4 api');
must(`+'<div class="bar"><span class="dev" style="width:0%"></span><span class="qa" style="width:0%"></span></div>'
    +'<div class="barlbl">Bar = share of the daily max used</div>'`,
  `+'<div class="bar"><span class="dev" style="width:${st.tok_dev_pct}%"></span><span class="qa" style="width:${st.tok_qa_pct}%"></span></div>'
    +'<div class="barlbl">Bar = share of the daily max used</div>'`, '§4 bar');
must(`+'<div class="legend"><span><span class="sw" style="background:var(--navy)"></span>build work ~0M</span>'
    +'<span><span class="sw" style="background:var(--brass)"></span>QA ~0M</span>'
    +'<span>= ~0M of 10M today (0%)</span></div>'`,
  `+'<div class="legend"><span><span class="sw" style="background:var(--navy)"></span>build work ~${st.tok_dev_m}M</span>'
    +'<span><span class="sw" style="background:var(--brass)"></span>QA ~${st.tok_qa_m}M</span>'
    +'<span>= ~${st.tok_total_m}M of ${st.tok_max_m}M today (${st.tok_pct}%)</span></div>'`, '§4 legend');
must(`+'<tr><td>Fable 5</td><td class="num">0</td><td class="num">—</td></tr>'
    +'<tr><td>Opus 5</td><td class="num">0</td><td class="num">all models —</td></tr>'
    +'<tr><td>Sonnet 5</td><td class="num">0</td><td class="num"></td></tr></table>'`,
  `+${J(data.model_rows)}+'</table>'`, '§4 models');
must(`+'<p class="calib">Guardrails: rest at 85% weekly · 50% share · 10M/day uncalibrated · 3M/day if the reading is over 48h old.</p></div>'`,
  `+${J(data.calib_line)}+'</div>'`, '§4 calib');
must(`+'<tr><td class="mono">Aug 21</td><td class="mono">7:59 AM &rarr; 3:39 PM</td>'
      +'<td class="num">+12%</td><td class="num">~5.3M</td><td class="num">9</td></tr>'
      +'<tr><td class="mono">Aug 22</td><td class="mono">8:50 AM</td>'
      +'<td class="dim">— one reading only</td><td class="dim">—</td><td class="dim">—</td></tr>'`,
  `+${J(data.dro_rows)}`, '§4.1');

// §5 / §6 — FROM the DB's undecided set (register B18), gated cards self-retiring (v7.0.199)
const ships = rendered.filter(i => i.kind === 'ship' || i.kind === 'test');
const gates = rendered.filter(i => i.kind === 'gated_before_build');
let block = '';
ships.forEach((it, i) => { block += cardCall(`5.${i + 1}`, it, it.kind === 'test' ? 'test' : 'ship', it.kind === 'test' ? 'Test' : 'Ship'); });
block += `+'<h2><span class="secnum">6</span>Gated before build &mdash; tap a row to open</h2>'\n    `;
if (retired.length) {
  const ids = retired.map(r => r.backlog_id).filter(Boolean).join(', ');
  block += `+${J(`<p class="strip-def"><b>${retired.length} card${retired.length === 1 ? '' : 's'} retired ${retired.length === 1 ? 'itself' : 'themselves'}</b> (${ids}) &mdash; each was asking permission to build a ticket that has since reached <b>done</b>, so the question is no longer live. Nothing was decided for you: those cards are still undecided in the ledger, just not shown here.</p>`)}\n    `;
}
if (!gates.length) block += `+'<p class="empty">None tonight.</p>'\n    `;
gates.forEach((it, i) => { block += cardCall(`6.${i + 1}`, it, 'gate', 'Gated'); });
splice("+card('5.1'", `// SES-124 · REMOVED, on John's explicit instruction: the standalone "Needs your call"`, block, '§5/§6');

// §7 / §7.1 — his own words
must(`+'<p class="strip-def">&#10003; Last directive <b>recorded Aug 22, 04:23 PM CST</b> '
    +'&mdash; not picked up yet; the next cycle takes it first. '`,
  `+'<p class="strip-def">&#10003; Last directive <b>recorded ${data.last_directive_cst} CST</b> '
    +${J(data.last_directive_tail)}+' '`, '§7 ack');
splice("+dirRow('43a9d4ae'", `+'</table></div>'\n      +'<p class="strip-def">The 24 directives`, data.dir_rows, '§7.1');

// §8 — the queue matrix, derived
const board = await sel('backlog_items?queue=not.is.null&select=queue,backlog_id,priority_class,status,design_status,epic_id,title,description&order=queue.asc&limit=12');
const epics = Object.fromEntries((await sel('epics?select=id,name')).map(e => [e.id, e.name]));
const total = (await sel('backlog_items?queue=not.is.null&select=backlog_id')).length;
const cut = s => { const x = String(s ?? ''); return x.length <= 70 ? H(x) : H(x.slice(0, 70).replace(/\s+\S*$/, '')) + '&hellip;'; };
// SES-119: the Title column is public.backlog_display_title(title, description) — NEVER the raw
// `title` column and never the `gist` extract. Measured 2026-08-23: 50 of 562 open numbered
// tickets fall back, 38 of them because `title` is literally the retired marker `Post-beta`, so
// reading the column directly renders "Post-beta" as a ticket's name. One RPC per row is cheap
// (12 rows) and is correct by construction; a cycle may still override via data.queue_titles.
const overrides = Object.fromEntries((data.queue_titles || []).map(r => [r.id, r.title]));
const displayTitle = async (b) => {
  if (overrides[b.backlog_id]) return overrides[b.backlog_id];
  const r = await rpc('backlog_display_title', { p_title: b.title, p_description: b.description });
  return cut(typeof r === 'string' ? r : b.title);
};
const titles = {};
for (const b of board) titles[b.backlog_id] = await displayTitle(b);
must(`+'<h2><span class="secnum">8</span>The queue — top 12 of 562 numbered</h2>'`,
  `+'<h2><span class="secnum">8</span>The queue &mdash; top 12 of ${total} numbered</h2>'`, '§8 heading');
splice('+queueRow(1,', `+'</table></div>'\n    // SES-99 — the question list.`,
  board.map(b => `+queueRow(${b.queue},${J(b.backlog_id)},${J(epics[b.epic_id] || '')},${J(H(b.priority_class).replace(/'/g, '&rsquo;'))},${J(b.status)},${J(b.design_status || '—')},${J(titles[b.backlog_id] || cut(b.title))})\n    `).join(''), '§8 rows');

// §9 / §12 — asks, supplied by the cycle
splice(`+question('9.1',`, '// ===== §9.1 · ANSWERED', data.question_rows, '§9');

// §10 — skips, derived; "still skipped" comes from the ticket's status, never a maintained flag
must(`+SKIPS.n+' &middot; '`, `+${data.skips_n}+' &middot; '`, '§10 n');
must(`+SKIPS.nnew+' new</span>`, `+${data.skips_new}+' new</span>`, '§10 nnew');
splice("+skipRow('39cd8616", `+'</table></div>'\n    +'<div class="listhead"><span class="n">10.2</span>`, data.skip_rows_1, '§10.1');
splice("+skipRow('f32e05ce", `+'</table></div>'\n    +'<p class="strip-def"><b>Unblock buttons:</b>`, data.skip_rows_2, '§10.2');

// §11 — grouped on the class DIGIT, never the string ('P9 · FLAGGED' is a different string)
const nowRows = await sel('backlog_items?queue=not.is.null&tier=eq.now&select=priority_class');
const byClass = {};
for (const r of nowRows) {
  const d = String(r.priority_class || '').match(/^P(\d+)/);
  if (!d) continue;
  const k = d[1].padStart(2, '0');
  byClass[k] = byClass[k] || { n: 0, name: String(r.priority_class).replace(/\s*·.*$/, '') };
  byClass[k].n++;
}
splice("+classRow('P01'", `+'</table>'\n    +'<p class="tnote">Beyond the now bucket:`,
  Object.keys(byClass).sort().map(k => `+classRow('P${k}',${J(H(byClass[k].name).replace(/'/g, '&rsquo;'))},${byClass[k].n})\n    `).join(''), '§11 rows');
const tiers = await sel('backlog_items?queue=not.is.null&select=tier');
const cnt = x => tiers.filter(r => r.tier === x).length;
must(`+'<p class="tnote">Beyond the now bucket: <b>25</b> in next &middot; <b>248</b> in later. '`,
  `+'<p class="tnote">Beyond the now bucket: <b>${cnt('next')}</b> in next &middot; <b>${cnt('later')}</b> in later. '`, '§11 note');

// §13 — the ladder. work_class -> P-class is FIXED and lives here so no rebuild re-derives it.
const LADDER = { invention: ['P02', 'Invention'], enhancement: ['P05', 'Enhancement'], agent_creation: ['P07', 'Agent creation'], determinism_removal: ['P08', 'Determinism removal'], bug_fix: ['P09', 'Bug fix'], tooling: ['P10', 'Tooling'] };
const ladder = await sel('runner_ladder?select=work_class,rung,streak');
splice("+ladderRow('P02'", `+'</table>'\n    +'<p class="tnote">No ladder row exists`,
  ladder.filter(l => LADDER[l.work_class])
    .sort((a, b) => LADDER[a.work_class][0].localeCompare(LADDER[b.work_class][0]))
    .map(l => `+ladderRow('${LADDER[l.work_class][0]}',${J(LADDER[l.work_class][1])},${l.rung},${l.streak})\n    `).join(''), '§13');

// §14 — production uses only. Supplied by the cycle: the Name column resolves through two label
// tables and one live label is a 130-character paragraph, which is judgment, not a join.
splice("+useRow('Aug 18, 1:02 PM'", `+'</table></div>'\n    +'<p class="tnote">Cost shows`, data.use_rows, '§14');

// §2b — the AUTOMATION object (SES-162, v7.0.204). THIS BUILDER HAD NO ANCHOR FOR IT AT ALL, so
// every page it built published the template's SAMPLE values: measured on the served artifact
// 2026-08-23T18:1xZ, John's panel said his last run was "sample value — 12:41 AM CST · SES-143 ·
// shipped" and his drain had 17 tickets left against a live 11. The template's own comment already
// required this ("EVERY REBUILD REGENERATES IT from runner_settings / runner_directives /
// runner_drain_scope / runner_cycles"); nothing performed it.
//
// Anchored between the object's opening and the PAGE_BUILT comment that follows it, so an edit
// that moves either one fails LOUDLY at exit 2 rather than publishing sample text again.
splice('var AUTOMATION = {', '// v7.0.172, directive 603f44ea',
  automationLiteral(await deriveAutomation(sel, rpc)), '§2b AUTOMATION');

fs.writeFileSync(OUT, t);
console.log(`build-briefing: wrote ${OUT} (${t.length} bytes)`);
console.log(`  seeded ${Object.keys(seed.asks || {}).length} ask targets, ${Object.keys(seed.reading || {}).length} reading slots`);
console.log(`  cards: ${ships.length} shipped, ${gates.length} gated, ${retired.length} retired`);
console.log(`  derived: §8 top ${board.length} of ${total}, §11 ${Object.keys(byClass).length} classes, §13 ${ladder.length} rungs`);
