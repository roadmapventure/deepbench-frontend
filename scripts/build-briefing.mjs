#!/usr/bin/env node
// DeepBench v7.0.308 | scripts/build-briefing.mjs | SES-222 — TWO SPLICES ESCAPED DATABASE TEXT THAT
// THE TEMPLATE ESCAPES AGAIN, and esc() is not idempotent, so John read the escape sequence. The rule
// was already written next to esc() itself (SES-208, v7.0.255): ESCAPE WHAT CAME OUT OF THE DATABASE,
// NEVER WHAT THE BUILDER COMPOSED — and never twice. Both sites are the builder escaping DB text on a
// path whose template side already calls esc(), so the fix is to drop the builder's copy, not to add
// a second guard. (1) §15 msRow: the filed defect. public.epics holds exactly one name with an
// ampersand — "Selfbuild M0 - Backup & Rollback" — so the live chain was & -> &amp; -> &amp;amp; and
// M0's row rendered the literal "&amp;" every morning. Only M0 is affected, which is why eight ships
// walked past it. (2) §8 queueRow's priority_class: FOUND BY THE SIBLING SWEEP THE TICKET ASKED FOR,
// and it is NOT the ampersand. H() does not touch apostrophes; the .replace(/'/g,'&rsquo;') that
// followed it did, and esc(cls) then turned that entity into &amp;rsquo; — so "P1 - Improves John's
// Skills" renders as "P1 - Improves John&rsquo;s Skills". LATENT TODAY, said plainly rather than
// claimed as a visible fix: §8 shows the top 12 and no P1 ticket is in it right now; it goes live the
// moment one reaches the head of the board. Dropping the &rsquo; substitution is safe and was checked
// rather than assumed — J() already escapes a backslash and then an apostrophe, so the single-quoted
// literal stays well-formed without it.
//
// THE EDIT THIS SHIP FORBIDS, and it is the tempting consistency pass: dropping H() from classRow
// (§11) or from cut() on §8's title as well. Those two are the MIRROR IMAGE — their template sides
// splice RAW, so the builder is the only escaper and removing it renders class names and ticket prose
// as live markup, which is SES-208's defect facing the other way. The asymmetry is deliberate and is
// already stated at displayTitleRaw() below. Ask which side a NEW splice's template renderer is on
// before copying either pattern. The internal control that proves which side is which: §8 passes the
// SAME epic name raw and renders it correctly, while §15 pre-escaped it and did not.
// Guarded by tests/regression/SES-222-double-escape.js.
//
// DeepBench v7.0.297 | scripts/build-briefing.mjs | directive db84b784 — §15's burn-down block is
// DERIVED, never pasted forward: the drain's named-scope count, the epic's live bucket count, and
// remaining Selfbuild work by size_stamp. The two counts are read from two different sources on
// purpose (runner_drain_scope for the fixed named set, the epic's own rows for the live bucket) and
// a later edit that reconciles them into one query rebuilds the defect this block was built to end
// — briefing-automation.mjs's header has the measurement. `done` stays `status = 'done'` and nothing
// else, byte-comparable to §15's predicate below and to SELFBUILD-CHARTER.md's own query. Guarded by
// tests/regression/db84b784-selfbuild-burndown.js.
//
// DeepBench v7.0.290 | scripts/build-briefing.mjs | SES-203 — the served page drops the template's
// DEVELOPER COMMENTARY at the write seam. John's decision 2026-08-25 (card e5be0e66): "SHRINK the
// page so reading it is cheap, rather than paying the ~200K toll on a schedule" — the ticket's
// candidate (c); (b), one republish per N cycles, is rejected in that same sentence. Measured on the
// served copy before a line changed: 338,032 bytes are ours, 287,826 of them one renderer <script>,
// and 57,350 of THAT is 670 whole-line // comments — a fifth of what every cycle must read in full
// before the platform will let it republish, re-sent identically every fire, none of it rendered and
// none of it John's. THE SPLIT: the TEMPLATE in git keeps every comment byte-for-byte (source of
// truth; its editor warnings are load-bearing), the SERVED ARTIFACT does not. Nothing is deleted
// from the repo — this step declines to COPY something forward. THE EDIT THIS FORBIDS is the obvious
// one: stripping the comments out of briefing-template.html itself, which deletes the warnings from
// their only home to shrink a file that is regenerated anyway (SES-188's trim is not a precedent —
// it moved DUPLICATED provenance and archived the originals first). HTML comments are deliberately
// untouched: the title guard and the seed sentinel are load-bearing, and taking them buys 5.2% while
// quietly weakening a guard. FAIL-CLOSED IN TWO GATES (per-cut assertion, then vm.Script parse) —
// a page that republishes fat costs tokens, one that republishes broken is John's only interface
// gone, so an unrecognised or unparseable strip returns the ORIGINAL. Guarded by
// tests/regression/SES-203-slim-served-page.js, whose Part 6 renders both forms in a DOM and asserts
// the result byte-identical, credential-free — SES-135 renders the real built page but skips wherever
// SUPABASE_* is absent, i.e. every CI run and every cloud cycle.
// DeepBench v7.0.284 | scripts/build-briefing.mjs | SES-181 (b) — §16 REVIEWER LANE is derived here on
// exactly the SES-178 terms below: four literal-value anchors (rows, bar, barlbl, tnote), every one a
// must() that dies at exit 2 rather than publishing a sample. THE ANCHORS ARE must() AND NOT splice()
// AND THAT IS LOAD-BEARING: splice() resolves its bounds with a bare indexOf, and §16 reuses §15's
// closing shape ('</table>' followed by the bar div), so a §16 splice would find §15's occurrence
// first and eat the Project panel. Unique literal anchors are the only safe form once two panels
// share a skeleton. THE ONE SENTENCE THAT IS CONDITIONAL rather than interpolated is the depth line:
// "N deliveries is not a rolling thirty" turns FALSE the day the overlap reaches 30 — the same class
// of silently-expiring sentence as §15's "waits on SES-181", which this ship had to correct.
// DeepBench v7.0.231 | scripts/build-briefing.mjs | SES-178 — §15 Project is DERIVED, never published
// as the template's sample rows. Three anchors: the milestone rows (splice), the overall bar and the
// overall count (must). All three are literal-value anchors on purpose — if the template's samples
// change without this builder, it dies at exit 2 rather than serving a real table under a sample total,
// which looks derived and is the worst of the three outcomes. Proven live at this ship: breaking the
// anchor produced 'ANCHOR MISSING: §15 rows'; poisoning only the sample VALUES produced output carrying
// the live numbers with zero poison surviving. Zero Selfbuild epics is die(), not an empty panel.
// KNOWN DEBT, NAMED HERE TOO SO IT TRAVELS WITH THE CODE: the aggregation below is a SECOND EXPRESSION
// of docs/SELFBUILD-CHARTER.md's canonical query, not a second source of truth — PostgREST cannot run
// its GROUP BY join and this script has no generic exec by design. One executable home (a
// selfbuild_progress() function the charter cites) is SES-178's named remainder.
// DeepBench v7.0.208 | scripts/build-briefing.mjs | SES-165 — the retired-strip sentence
// GENERALIZES (John-approved 2026-08-23). Since briefing_open_cards() now retires a card of ANY
// kind once its ticket goes terminal, the strip can no longer say the card was "asking permission
// to build" — most retired cards are ship cards whose verdict already happened. No other builder
// logic changes: `rendered`/`retired` already split on `c.render`.
// DeepBench v7.0.207 | scripts/build-briefing.mjs | SES-163 — the rebuild stops needing a cycle to
// hand-author the page. MEASURED against this file at 22:2xZ, and the ticket under-counted it by
// half: 21 distinct `--data` fields plus 12 more inside `data.stats` = 33 authored values, several
// of them raw HTML fragments. TWO consecutive cycles declined the republish rather than author
// them (SES-162/v7.0.204, then 199e67b5), which is what made it a standing blocker rather than one
// cycle's judgment call — and since SES-154 (v7.0.205) made John's Accept the ONLY writer of
// `done`, an un-republished page converts EVERY delivery into permanently unfinished work.
// Now derived here: §2/§4 stats, §4 model rows, §4.1 daily output, §7/§7.1 directives, §9
// questions, §10 skips, §14 uses, the masthead date and version. STILL the cycle's, because a
// builder that guessed them would be writing John's briefing for him: §3's findings and §4's
// calibration sentence — five authored values, all prose.
// AND the fixed DOM-id map is a TABLE (public.briefing_dom_ids), not `data.fixed_dom_ids || {}`.
// That silent empty default was the hazard: runner_card_asks.target_id is keyed on a card's DOM
// id, so a cycle that omitted the map re-keyed the card and ORPHANED John's thread — invisibly,
// because SES-132's §9.1 orphan renderer still shows the text. An ask target naming a card that no
// briefing_dom_ids row claims is now exit 2, never a warning.
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
//   ALSO DERIVED SINCE SES-163 (v7.0.207) -- these were in the list below until this ship, and the
//   reason they moved is that none of them needed judgment; they only needed SQL somebody had not
//   written yet:
//     - section 2/4 the stat chips and budget bars  (runner_cycles + resolve_day_token_cap's RUNG)
//     - section 4   the model table                 (runner_cycles grouped by model)
//     - section 4.1 daily output rows               (public.daily_reading_output())
//     - section 7/7.1 directive lines               (runner_directives; verdict via stateOf())
//     - section 9   the question list               (runner_questions, open only, max 5)
//     - section 10  skip rows + count chips         (runner_skips joined to its ticket)
//     - section 14  who used DeepBench              (public.briefing_use_rows())
//     - the masthead date                           (the CST clock; the VERSION is --version, and
//                                                    deliberately NOT dev_version_counter -- see
//                                                    the note at its assignment below)
//
//   NOT DERIVED -- supplied by the cycle in --data, because these need judgment and a builder that
//   guessed them would be writing John's briefing for him. FIVE values, all prose:
//     - section 3  today's findings           (finding_text, finding_time, earlier_title,
//                                              earlier_html -- what the run actually found)
//     - section 4  the calibration sentence   (calib_line -- which number governs today, and why)
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
import { slimServedPage } from './lib/slim-served-page.mjs';
// SES-163 (v7.0.207) — everything mechanically derivable. Pure string builders live in their own
// module for the same reason briefing-automation.mjs does: a helper only exercisable by running
// the whole builder against live Supabase is a helper nobody tests.
import {
  cstDay, cstStamp, cstShortDay, cstDayStartISO, deriveStats, modelRowsHtml, dirRowsJs,
  questionRowsJs, skipRowsJs, useRowsJs, droRowsHtml, unregisteredAskTargets,
} from './lib/briefing-derive.mjs';

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

// SES-163 — the bar the ticket set: "a --data file of at most a few authored sentences". These five
// are what is left, and a missing one is exit 2 rather than a silently blank section. It is the same
// rule as a NULL plain_* drawing a red defect line: absent must look absent, never look fine.
const AUTHORED = ['finding_text', 'finding_time', 'earlier_title', 'earlier_html', 'calib_line'];
const missing = AUTHORED.filter(k => data[k] == null || data[k] === '');
if (missing.length) {
  die(`--data is missing the authored field(s): ${missing.join(', ')}. Everything else is derived; `
    + `these five are yours because a builder that guessed them would be writing John's briefing.`);
}
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
// SES-163: the map is a TABLE now. It used to be `data.fixed_dom_ids || {}` — a silent empty
// default, so forgetting it looked exactly like having none, and the orphan renderer hid the
// consequence. A cycle adds a row; the builder still never invents one.
const domRows = await sel('briefing_dom_ids?select=item_id,dom_id');
const FIXED_IDS = Object.fromEntries(domRows.map(r => [r.item_id, r.dom_id]));
const domIdFor = it => FIXED_IDS[it.id] || 'item-' + it.id.slice(0, 8);

// SES-119's display title, RAW and uncut — §10's renderer esc()s its own title and §8's does not.
// That asymmetry is deliberate and a sweeper must not "fix" it: entities in §8, raw text in §10.
const displayTitleRaw = async (b) => {
  const r = await rpc('backlog_display_title', { p_title: b.title, p_description: b.description });
  return typeof r === 'string' ? r : (b.title || '');
};
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
// SES-163 — the derived half. Every value below used to arrive hand-authored in --data.
// ---------------------------------------------------------------------------
const NOW = new Date();
const dayStart = cstDayStartISO(NOW);
const monthStart = `${NOW.toISOString().slice(0, 7)}-01T00:00:00Z`;

// THE GUARD. Exit 2, never a warning: SES-132's §9.1 orphan renderer means a re-keyed card still
// shows its text, so this failure is silent by construction and here is the only place to catch it.
const askTargets = [...new Set((await sel('runner_card_asks?select=target_id')).map(r => r.target_id))];
const unregistered = unregisteredAskTargets(askTargets, rendered.map(domIdFor), Object.values(FIXED_IDS));
if (unregistered.length) {
  die(`UNREGISTERED ASK TARGET(S): ${unregistered.join(', ')} — each names a card DOM id that no `
    + `public.briefing_dom_ids row claims, so this rebuild would re-key the card and orphan John's `
    + `recorded thread. INSERT the item_id -> dom_id row, then re-run.`);
}

// §2 / §4 — the day's cycles. The governing cap is resolve_day_token_cap()'s RUNG, never
// runner_budget's static default: rendering the default would tell John the runner is budgeted
// against a number it is not using. NULL is the read-only form — the builder must never write.
const cyclesToday = await sel(`runner_cycles?started_at=gte.${dayStart}`
  + '&select=outcome,model,est_tokens_dev,est_tokens_qa,api_cost_dev_usd,api_cost_qa_usd');
const monthCycles = await sel(`runner_cycles?started_at=gte.${monthStart}&select=api_cost_dev_usd,api_cost_qa_usd`);
const apiMonthUsd = monthCycles.reduce((a, c) =>
  a + Number(c.api_cost_dev_usd || 0) + Number(c.api_cost_qa_usd || 0), 0);
const [cap] = await rpc('resolve_day_token_cap', { p_cycle_id: null });
const st = deriveStats(cyclesToday, { apiMonthUsd, dayCap: cap.day_cap });

const [reading] = await sel('runner_usage_readings?select=all_models_pct&order=taken_at.desc&limit=1');
const modelRows = modelRowsHtml(cyclesToday, reading ? reading.all_models_pct : null);
const droRows = droRowsHtml(await rpc('daily_reading_output'));

// §7 / §7.1 — his own words, newest first.
const dirs = await sel('runner_directives?select=id,created_at,type,body,status,outcome,outcome_note,acted_cycle,expires_at&order=created_at.desc&limit=12');
const dirRows = dirRowsJs(dirs, NOW);
const newest = dirs[0];
const lastDirectiveCst = newest ? cstStamp(new Date(newest.created_at)) : '—';
const lastDirectiveTail = !newest ? '&mdash; none recorded yet.'
  : newest.status === 'queued' ? '&mdash; not picked up yet; the next cycle takes it first.'
  : newest.outcome ? `&mdash; ${newest.outcome}.`
  : '&mdash; closed with no outcome recorded.';

// §9 — open questions only, max 5, newest first (the SES-99 contract).
const questionRows = questionRowsJs(
  await sel('runner_questions?answer=is.null&select=qid,question,context&order=created_at.desc&limit=5'));

// §10 — skips, joined to their ticket. "Still skipped" is DERIVED from the ticket's status, never a
// maintained flag: building the ticket later clears the row with no write from anyone (SES-127).
// The join takes the FIRST row per backlog_id ordered by queue because backlog_id is NOT unique
// (CHI-48 holds two rows, SES-97) — the JS twin of SES-127's LATERAL … LIMIT 1.
const skips = await sel('runner_skips?resolved_at=is.null&select=*&order=last_skipped_at.desc');
const skipIds = [...new Set(skips.map(s => s.backlog_id))];
const tickets = skipIds.length
  ? await sel(`backlog_items?backlog_id=in.(${skipIds.join(',')})`
    + '&select=backlog_id,status,design_status,queue,priority_class,title,description,kickoff_link&order=queue.asc')
  : [];
const ticketFor = {};
for (const b of tickets) if (!ticketFor[b.backlog_id]) ticketFor[b.backlog_id] = b;
const liveSkips = [];
for (const s of skips) {
  const b = ticketFor[s.backlog_id];
  if (!b || ['done', 'removed'].includes(b.status)) continue;   // derived resolution
  liveSkips.push({ ...s, ...b, title: await displayTitleRaw(b) });
}
const skipRows1 = skipRowsJs(liveSkips, 'decision');
const skipRows2 = skipRowsJs(liveSkips, 'desktop');

// §14 — production uses. The whole §14 contract (production host only, one use = one trace_id,
// calls FILTER model IS NOT NULL, the first-clause Name, cost as an em-dash) is SQL now:
// public.briefing_use_rows(). It was the last raw-HTML field a cycle had to author.
const useRows = useRowsJs(await rpc('briefing_use_rows', { p_limit: 12 }));

// THE VERSION IS THE CYCLE'S, NOT THE COUNTER'S — caught by this ticket's own QA, on the first
// live build. Deriving it from dev_version_counter looks obviously right and is wrong under
// parallel cycles (register B42): the counter is a CLAIM REGISTER shared by every concurrent
// session, not "the current version". This cycle claimed v7.0.207 and the counter already read
// 209 by the time the page was built, so the masthead stamped a version this page is not. The
// number is passed in, like --page-built, and there is deliberately no default: a guessed version
// on the masthead is worse than a refusal, because it is unfalsifiable from the page.
const todayCst = cstDay(NOW);
const versionStr = arg('version');
if (!versionStr) die('--version <vX.Y.Z> is required: it is the version THIS cycle claimed, and it '
  + 'cannot be read from dev_version_counter, which a concurrent cycle may have moved since.');

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
  `+'<div class="date">${todayCst}<br>${versionStr}<br><b id="waiting"></b>'`, 'masthead');

// §2 — derived from runner_cycles over the CST day (SES-163: `st` is computed above, not supplied)
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
  `+${J(modelRows)}+'</table>'`, '§4 models');
must(`+'<p class="calib">Guardrails: rest at 85% weekly · 50% share · 10M/day uncalibrated · 3M/day if the reading is over 48h old.</p></div>'`,
  `+${J(data.calib_line)}+'</div>'`, '§4 calib');
must(`+'<tr><td class="mono">Aug 21</td><td class="mono">7:59 AM &rarr; 3:39 PM</td>'
      +'<td class="num">+12%</td><td class="num">~5.3M</td><td class="num">9</td></tr>'
      +'<tr><td class="mono">Aug 22</td><td class="mono">8:50 AM</td>'
      +'<td class="dim">— one reading only</td><td class="dim">—</td><td class="dim">—</td></tr>'`,
  `+${J(droRows)}`, '§4.1');

// §5 / §6 — FROM the DB's undecided set (register B18), gated cards self-retiring (v7.0.199)
const ships = rendered.filter(i => i.kind === 'ship' || i.kind === 'test');
const gates = rendered.filter(i => i.kind === 'gated_before_build');
let block = '';
ships.forEach((it, i) => { block += cardCall(`5.${i + 1}`, it, it.kind === 'test' ? 'test' : 'ship', it.kind === 'test' ? 'Test' : 'Ship'); });
block += `+'<h2><span class="secnum">6</span>Gated before build &mdash; tap a row to open</h2>'\n    `;
if (retired.length) {
  const ids = retired.map(r => r.backlog_id).filter(Boolean).join(', ');
  block += `+${J(`<p class="strip-def"><b>${retired.length} card${retired.length === 1 ? '' : 's'} retired ${retired.length === 1 ? 'itself' : 'themselves'}</b> (${ids}) &mdash; each was asking about a ticket that has since closed, so the question is no longer live. Nothing was decided for you: those cards are still undecided in the ledger, just not shown here.</p>`)}\n    `;
}
if (!gates.length) block += `+'<p class="empty">None tonight.</p>'\n    `;
gates.forEach((it, i) => { block += cardCall(`6.${i + 1}`, it, 'gate', 'Gated'); });
splice("+card('5.1'", `// SES-124 · REMOVED, on John's explicit instruction: the standalone "Needs your call"`, block, '§5/§6');

// §7 / §7.1 — his own words
must(`+'<p class="strip-def">&#10003; Last directive <b>recorded Aug 22, 04:23 PM CST</b> '
    +'&mdash; not picked up yet; the next cycle takes it first. '`,
  `+'<p class="strip-def">&#10003; Last directive <b>recorded ${lastDirectiveCst} CST</b> '
    +${J(lastDirectiveTail)}+' '`, '§7 ack');
splice("+dirRow('43a9d4ae'", `+'</table></div>'\n      +'<p class="strip-def">The 24 directives`, dirRows, '§7.1');

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
  // SES-222: priority_class goes RAW — queueRow() esc()s it. The retired form was
  // J(H(cls).replace(/'/g,'&rsquo;')), which esc() then double-escaped into &amp;rsquo;. The epic
  // arg beside it has always been raw and has always rendered correctly; it is the control.
  // `title` stays H()'d via cut(), because queueRow() splices THAT one raw (see displayTitleRaw).
  board.map(b => `+queueRow(${b.queue},${J(b.backlog_id)},${J(epics[b.epic_id] || '')},${J(b.priority_class)},${J(b.status)},${J(b.design_status || '—')},${J(titles[b.backlog_id] || cut(b.title))})\n    `).join(''), '§8 rows');

// §9 / §12 — asks, supplied by the cycle
splice(`+question('9.1',`, '// ===== §9.1 · ANSWERED', questionRows, '§9');

// §10 — skips, derived; "still skipped" comes from the ticket's status, never a maintained flag
must(`+SKIPS.n+' &middot; '`, `+${liveSkips.length}+' &middot; '`, '§10 n');
// `liveSkips.lengthew` was a typo (undefined), so every rebuild since it shipped published
// "N · undefined new" in §10's count chip — found live 2026-08-25 by cycle c8c2d547 on the served
// page while reading it to clear the publish gate. The NEW half is `briefed_at IS NULL`, which is
// the SES-127 mechanism the migration's property (3) defines; the sibling line above is `.length`,
// which is what makes the typo invisible to a glance.
must(`+SKIPS.nnew+' new</span>`,
  `+${liveSkips.filter(s => s.briefed_at == null).length}+' new</span>`, '§10 nnew');
splice("+skipRow('39cd8616", `+'</table></div>'\n    +'<div class="listhead"><span class="n">10.2</span>`, skipRows1, '§10.1');
splice("+skipRow('f32e05ce", `+'</table></div>'\n    +'<p class="strip-def"><b>Unblock buttons:</b>`, skipRows2, '§10.2');

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
splice("+useRow('Aug 18, 1:02 PM'", `+'</table></div>'\n    +'<p class="tnote">Cost shows`, useRows, '§14');

// §15 — PROJECT, the Selfbuild milestone burn-down (SES-178). Renders docs/SELFBUILD-CHARTER.md's
// canonical progress query, which the charter itself introduces as "answers 'how close are we' any
// time, BEFORE SES-178 renders it".
//
// DISCLOSED RATHER THAN SMUGGLED: this is a SECOND expression of that query, not a second source of
// truth, and it exists because PostgREST cannot run the charter's GROUP BY join and this builder has
// no generic exec by design. The right end state is one executable home — a `selfbuild_progress()`
// function the charter cites and this builder calls — and it is NOT done here because the migration
// plus the charter edit would put SES-178 at five files against CLAUDE.md's ≤3 cap. Filed as the
// ticket's remainder. The predicate is kept byte-comparable to the charter's on purpose: `done` is
// `status = 'done'` and NOTHING else — `delivered` is deliberately not counted, for the same reason
// §2's "Shipped today" keys on John's Accept rather than on a push (SES-154).
const spEpics = await sel('epics?select=id,name&name=like.Selfbuild*');
const spItems = await sel('backlog_items?select=id,epic_id,status,size_stamp&epic_id=not.is.null');
const spBy = new Map(spEpics.map(e => [e.id, { name: e.name, done: 0, total: 0 }]));
for (const it of spItems) {
  const row = spBy.get(it.epic_id);
  if (!row) continue;
  row.total++;
  if (it.status === 'done') row.done++;
}
const spRows = [...spBy.values()].filter(r => r.total > 0).sort((a, b) => a.name.localeCompare(b.name));
const spDone = spRows.reduce((n, r) => n + r.done, 0);
const spTotal = spRows.reduce((n, r) => n + r.total, 0);
const spPct = spTotal ? (100 * spDone / spTotal).toFixed(1) : '0.0';
if (!spRows.length) die('§15: no Selfbuild epics carry tickets — refusing to publish an empty Project panel over the template\'s sample rows');
splice("+msRow('Selfbuild M0", `+'</table>'\n    +'<div class="bar">`,
  // SES-222: the epic name goes RAW — msRow() esc()s it. The retired J(H(r.name)) form turned
  // "Selfbuild M0 - Backup & Rollback" into a rendered literal "&amp;" on John's page every morning.
  spRows.map(r => `+msRow(${J(r.name)},${r.done},${r.total},'${r.total ? (100 * r.done / r.total).toFixed(1) : '0.0'}')\n    `).join(''), '§15 rows');
must(`+'<div class="bar"><div class="dev" style="width:20.6%"></div></div>'`,
  `+'<div class="bar"><div class="dev" style="width:${spPct}%"></div></div>'`, '§15 bar');
must(`+'<p class="barlbl">Overall &mdash; <b>14</b> of <b>68</b> Selfbuild tickets done '\n    +'(<b>20.6%</b>)</p>'`,
  `+'<p class="barlbl">Overall &mdash; <b>${spDone}</b> of <b>${spTotal}</b> Selfbuild tickets done '\n    +'(<b>${spPct}%</b>)</p>'`, '§15 overall');

// §15's BURN-DOWN BLOCK — directive db84b784, John 2026-08-28: "yes, build the burn-down with the
// size stamps". Six rows, one table, spliced as a unit.
//
// THE DENOMINATORS ARE DIFFERENT ON PURPOSE and this is the whole reason the block exists. Row 1
// counts the members John NAMED (runner_drain_scope, FIXED at naming time — SES-142) that are
// still open; row 2 counts the epic's LIVE open tickets. §2b already shows the first as
// "N of M tickets left in <epic>", and briefing-automation.mjs's own header records what happens
// when the two are confused: the panel told John his standing drain had 17 tickets left against a
// live 11. Rendering both, labelled, is the fix — never one number reconciled into the other.
//
// `done` STAYS `status = 'done'` AND NOTHING ELSE, byte-comparable to the §15 predicate fifteen
// lines above and to the charter's own query. `removed` is excluded from remaining (it is not
// work), and `delivered` is remaining until John accepts it — the same reason §15 does not count
// it as done and §2's "Shipped today" keys on his Accept rather than on a push (SES-154).
const spEpicIds = new Set(spBy.keys());
const bdRemaining = spItems.filter(i => spEpicIds.has(i.epic_id) && !['done', 'removed'].includes(i.status));
const bdBy = s => bdRemaining.filter(i => i.size_stamp === s).length;
const bdS = bdBy('S'), bdM = bdBy('M'), bdL = bdBy('L');
// Unstamped is the REMAINDER, never a fourth equality test: a stamp value outside S/M/L would
// otherwise vanish from every column and the six rows would stop summing to the population.
const bdUn = bdRemaining.length - bdS - bdM - bdL;

const bdDrains = await sel('runner_directives?type=eq.drain-epic&status=eq.queued&select=id,epic_id&order=created_at.asc&limit=1');
const bdDrain = bdDrains[0] || null;
let bdNamed = 0, bdOpen = 0, bdEpicName = '', bdBucketOpen = 0, bdBucketTotal = 0;
if (bdDrain) {
  bdEpicName = (await sel(`epics?id=eq.${bdDrain.epic_id}&select=name`))[0]?.name || '';
  const bdScope = await sel(`runner_drain_scope?directive_id=eq.${bdDrain.id}&select=item_id`);
  bdNamed = bdScope.length;
  const bdScopeIds = new Set(bdScope.map(s => s.item_id));
  bdOpen = spItems.filter(i => bdScopeIds.has(i.id) && !['done', 'removed'].includes(i.status)).length;
  const bdBucket = spItems.filter(i => i.epic_id === bdDrain.epic_id);
  bdBucketTotal = bdBucket.length;
  bdBucketOpen = bdBucket.filter(i => !['done', 'removed'].includes(i.status)).length;
}
// NO STANDING DRAIN IS A REAL STATE, NOT AN EMPTY ROW. John unticks the drain box and there is
// genuinely nothing to count — so the two rows say so in words rather than rendering 0 of 0, which
// would read as "your drain is stuck at zero progress" (the same rule as §14's cost showing "—").
const bdDrainRows = bdDrain
  ? `+bdRow('Drain members still open',${bdOpen},${J('of ' + bdNamed + ' you named for ' + bdEpicName)})\n    `
    + `+bdRow('Open in that epic right now',${bdBucketOpen},${J('of ' + bdBucketTotal + ' - a different number, and not what retires the drain')})\n    `
  : `+bdRow('Drain members still open','-','no standing drain - nothing is named right now')\n    `
    + `+bdRow('Open in that epic right now','-','no standing drain - untick means no scope to count')\n    `;

splice("+bdRow('Drain members still open'", `+'</table>'\n    +'<p class="tnote">The first two rows are deliberately different numbers.`,
  bdDrainRows
  + `+bdRow('Remaining, size S',${bdS},'one cycle each, known fix shape')\n    `
  + `+bdRow('Remaining, size M',${bdM},'1-2 cycles, or one design choice inside')\n    `
  + `+bdRow('Remaining, size L',${bdL},'multi-cycle, design-heavy, or discovery risk')\n    `
  + `+bdRow('Remaining, unstamped',${bdUn},'no size stamp recorded at filing')\n    `, '§15 burn-down');

// §16 — REVIEWER LANE, the verifier scoreboard (SES-181 (b), v7.0.284). John's directive 58db64ae
// item (2): "SES-181 scoreboard build approved — locked section extended, never renumbered."
//
// EVERY FIGURE HERE IS A COUNT OVER TWO FLAT SELECTS, and that is deliberate rather than a
// limitation worked around: the comparison the charter asks for is between two populations that do
// not join cleanly (a verdict is per build attempt, a tap is per delivery), so a SQL join would be
// picking one of several defensible semantics inside the database where nobody could see it. The
// choice is made here, in the open, and the panel's own tnote states it to John.
//
// THE WINDOW IS 30 OF EACH, NEVER "the last 30 days" or "everything". The charter's bar is worded
// over a rolling 30 DELIVERIES; a time window would make the rate move when nothing shipped.
const SV_WINDOW = 30;
const svVerdicts = await sel('runner_verdicts?select=verdict,auto_done_eligible,backlog_id,created_at&order=created_at.desc&limit=500');
const svTaps = await sel('runner_items?select=backlog_id,decision,decided_at&kind=eq.ship&decision=not.is.null&order=decided_at.desc&limit=500');
if (!svVerdicts.length) die('§16: runner_verdicts is empty — refusing to publish a scoreboard over the template\'s sample rows');
const svPct = (n, of) => (of ? (100 * n / of).toFixed(1) : '0.0');
const sv30 = svVerdicts.slice(0, SV_WINDOW);
const svBlocks = sv30.filter(v => v.verdict === 'block').length;
const svAuto = sv30.filter(v => v.auto_done_eligible === true).length;
const svTaps30 = svTaps.slice(0, SV_WINDOW);
const svNeg = svTaps30.filter(t => t.decision === 'rework' || t.decision === 'reverse').length;
// The like-for-like population: a delivery carrying BOTH a verdict and a tap of John's. `blocked`
// is "the verifier blocked at least once on this ticket" — a ticket can be verdicted more than
// once (a re-run after a fix), and counting attempts here would inflate it against a tap count
// that is one-per-delivery by construction.
const svBlockedTickets = new Set(svVerdicts.filter(v => v.verdict === 'block' && v.backlog_id).map(v => v.backlog_id));
const svGraded = new Set(svVerdicts.filter(v => v.backlog_id).map(v => v.backlog_id));
const svOverlap = [...new Map(svTaps.filter(t => t.backlog_id && svGraded.has(t.backlog_id))
  .map(t => [t.backlog_id, t])).values()];
const svOverlapBlocked = svOverlap.filter(t => svBlockedTickets.has(t.backlog_id)).length;
const svOverlapNeg = svOverlap.filter(t => t.decision === 'rework' || t.decision === 'reverse').length;
const svStart = cstShortDay(new Date(svVerdicts[svVerdicts.length - 1].created_at));
// The depth sentence is CONDITIONAL, and that is not polish: "N deliveries is not a rolling
// thirty" becomes a FALSE statement the day the overlap reaches 30, which is exactly the day the
// panel starts mattering. A sentence that silently expires is the failure this file records
// itself making elsewhere (SES-178's "waits on SES-181" footnote, corrected by this very ship).
const svDepthLine = svOverlap.length >= SV_WINDOW
  ? `That is a full rolling thirty, so the comparison above is like-for-like.`
  : `${svOverlap.length} deliveries is not a rolling thirty.`;

must(`+svRow('Verifier blocked',9,30,'30.0')\n    +svRow('Your Rework or Reverse',0,30,'0.0')\n    +svRow('Auto-done eligible',13,30,'43.3')`,
  `+svRow('Verifier blocked',${svBlocks},${sv30.length},'${svPct(svBlocks, sv30.length)}')\n    `
  + `+svRow('Your Rework or Reverse',${svNeg},${svTaps30.length},'${svPct(svNeg, svTaps30.length)}')\n    `
  + `+svRow('Auto-done eligible',${svAuto},${sv30.length},'${svPct(svAuto, sv30.length)}')`, '§16 rows');
must(`+'<div class="bar"><div class="dev" style="width:30.0%"></div></div>'`,
  `+'<div class="bar"><div class="dev" style="width:${svPct(svBlocks, sv30.length)}%"></div></div>'`, '§16 bar');
must(`+'<p class="barlbl">Verifier catch rate <b>30.0%</b> &mdash; your Rework/Reverse rate '\n    +'<b>0.0%</b> over the same depth (30).</p>'`,
  `+'<p class="barlbl">Verifier catch rate <b>${svPct(svBlocks, sv30.length)}%</b> &mdash; your Rework/Reverse rate '\n    `
  + `+'<b>${svPct(svNeg, svTaps30.length)}%</b> over the same depth (${svTaps30.length}).</p>'`, '§16 barlbl');
must(`the lane started <b>Aug 25</b> and has '\n    +'graded <b>20</b> tickets, of which <b>5</b> also carry a tap of yours &mdash; on those five '\n    +'it blocked at least once on <b>4</b> and you reworked or reversed <b>0</b>. Five deliveries '\n    +'is not a rolling thirty.`,
  `the lane started <b>${svStart}</b> and has '\n    +'graded <b>${svGraded.size}</b> tickets, of which <b>${svOverlap.length}</b> also carry a tap of yours &mdash; on those '\n    `
  + `+'it blocked at least once on <b>${svOverlapBlocked}</b> and you reworked or reversed <b>${svOverlapNeg}</b>. '\n    +'${svDepthLine}`, '§16 tnote');

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

// SES-203 — the served page drops the template's developer commentary. The publish gate makes a
// cycle read this whole file before it may republish, and the comments are notes to whoever edits
// the TEMPLATE next, which keeps every one of them. Fail-closed by construction: an unparseable or
// unrecognised strip returns the original, so the worst case is a fat page, never a broken one.
// `--no-slim` writes the unslimmed page, which is what the guard's negative control uses.
const slim = argv.includes('--no-slim')
  ? { html: t, removed: 0, applied: false, reason: 'disabled by --no-slim' }
  : slimServedPage(t);
if (!slim.applied && slim.reason && !argv.includes('--no-slim')) {
  console.warn(`build-briefing: slim SKIPPED (page written unslimmed) — ${slim.reason}`);
}
fs.writeFileSync(OUT, slim.html);
console.log(`build-briefing: wrote ${OUT} (${slim.html.length} bytes)`);
if (slim.applied) {
  console.log(`  slim: -${slim.removed} bytes of comments/indent from ${slim.blocks} script block(s) `
    + `(${(100 * slim.removed / t.length).toFixed(1)}% of the built page); template unchanged on disk`);
}
console.log(`  seeded ${Object.keys(seed.asks || {}).length} ask targets, ${Object.keys(seed.reading || {}).length} reading slots`);
console.log(`  cards: ${ships.length} shipped, ${gates.length} gated, ${retired.length} retired`);
console.log(`  derived: §8 top ${board.length} of ${total}, §11 ${Object.keys(byClass).length} classes, §13 ${ladder.length} rungs`);
console.log(`  §15 Project: ${spRows.length} Selfbuild milestones, ${spDone}/${spTotal} done (${spPct}%)`);
console.log(`  §15 burn-down: drain ${bdDrain ? `${bdOpen} of ${bdNamed} named open (${bdEpicName})` : 'none standing'}, `
  + `epic bucket ${bdDrain ? `${bdBucketOpen} of ${bdBucketTotal} open` : 'n/a'}; `
  + `remaining by size S ${bdS} / M ${bdM} / L ${bdL} / unstamped ${bdUn} (${bdRemaining.length} total)`);
console.log(`  §16 Reviewer lane: verifier blocked ${svBlocks}/${sv30.length} (${svPct(svBlocks, sv30.length)}%), `
  + `your Rework+Reverse ${svNeg}/${svTaps30.length} (${svPct(svNeg, svTaps30.length)}%), `
  + `auto-done eligible ${svAuto}/${sv30.length}; like-for-like overlap ${svOverlap.length} `
  + `(blocked ${svOverlapBlocked}, reworked ${svOverlapNeg}); lane since ${svStart}`);
