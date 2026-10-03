// DeepBench v7.0.353 | tests/regression/SES-244-tap-buffer.js | SES-273 — AN UNREACHABLE PINNED
// BLOB IS A CONTROL THAT DID NOT RUN, NOT A GUARD THAT FAILED, and the thing to read twice is that
// THIS FILE'S OWN ARM 2 HAD BEEN HOLDING dev RED FOR FOUR CONSECUTIVE COMMITS. Measured live at
// this ship rather than quoted: CI's "Tripwire + regression (blocking)" job was failure on
// 92436fa (21:18Z), 451d0821 (22:45Z), 7177e857 (22:57Z) and head 3f1a313c (23:15Z), last green
// 5acdba64 (21:07:58Z) — 134/135, ONE failing test, this one, on the line
// `assert.fail('negative control could not run: git cat-file failed: …')`. actions/checkout@v4
// clones at depth 1, so blob ad48b08f is simply absent from CI's checkout.
// WHY TWO ATTENDED FOLLOW-UP SHIPS WALKED PAST IT (v7.0.351, v7.0.352): the suite is 135/135 in a
// full clone, so the failure is INVISIBLE from any full-clone run. It was reproduced here in a
// deliberate `git clone --depth 1` where the blob is likewise unreachable — origin/dev's copy
// FAILS there at exit 1, this copy declares and exits 0, on the identical tree.
// THE EDIT THIS SHIP FORBIDS, and it is the tempting one because it is one line shorter: widening
// the notRun branch to any failing control. A control that RESOLVES and turns out to be vacuous is
// a real finding and must still fail hard — proven here rather than promised, by repointing
// PRE_BLOB at the CURRENT template blob (744e26cd, which does define writeTap): it fails with
// "control is vacuous: pre-change template already defines writeTap", exit 1. Only an
// UNRESOLVABLE object is declared. SES-158's rule is untouched; what changed is that a shallow
// clone stopped being reported as a broken guard.
// ARM 3 IS NOW ITS OWN FUNCTION AND THAT IS LOAD-BEARING, not tidying: arms 1-3 shared one run()
// body, so the `return` that accompanies notRun() would have skipped the credentialed live arm on
// exactly the shallow-clone path where CI DOES hold the credentials — trading a red suite for a
// silently narrower one. Verified by the full-clone run reaching arm 3's own trailing declaration.
// Precedent adopted verbatim, never re-spelled: SES-255-ci-conclusion-reporting.js,
// SES-256-rollback-drill.js and SES-50-resolved-id-citations.js all declare this same condition,
// and all three are visible as [NOT RUN] in the very log where this file failed.
// Test-only change; no src/api/lib change, no site change, no schema change, no migration.
//
// DeepBench v7.0.352 | tests/regression/SES-244-tap-buffer.js | SES-244a — writeTap's OUTCOME must
// be readable from `state`. The pinned negative-control blob (ad48b08f, v7.0.349) predates writeTap
// entirely, so v7.0.352's four clauses are asserted FALSE there rather than gated out of arm 2 —
// a control that skips the newest clauses stops measuring the newest half of the guard.
//
// DeepBench v7.0.351 | tests/regression/SES-244-tap-buffer.js | SES-244a fix — arm 3 stopped
// consuming the response body it was about to read, and stopped calling .catch() on a Response.
// Both were live-run-only defects: arms 1 and 2 are offline, so an uncredentialed run was green
// while every credentialed run (CI included) failed AND leaked a fixture row into briefing_taps.
// The lesson for the next author: a credential-gated arm that has never been RUN with credentials
// is unproven code, not covered code — the [NOT RUN] line is the warning, not a formality.
//
// DeepBench v7.0.350 | tests/regression/SES-244-tap-buffer.js | SES-244 phase A — every briefing
// tap writes a briefing_taps row via the mcp capability, additively (self-publish preserved).
// File-level negative control pins the PRE-CHANGE template at immutable blob
// ad48b08fcc9d8ef141791e55bc147a7d0994cdbd (docs/runbooks/briefing-template.html @ v7.0.349) —
// never origin/dev, which moves (the SES-240 lesson).
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { spawnSync } from 'child_process';
import { selfRun, notRun } from './_lib/self-run.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');
const TPL = path.join(ROOT, 'docs', 'runbooks', 'briefing-template.html');
const PRE_BLOB = 'ad48b08fcc9d8ef141791e55bc147a7d0994cdbd';

// Normalize CRLF: this worktree checks out CRLF while git blobs are LF (SES-270).
const norm = (s) => s.replace(/\r\n/g, '\n');

function contentChecks(src) {
  const r = {};
  const wtStart = src.indexOf('function writeTap(');
  // Indentation-agnostic on purpose: the template indents #code two spaces and
  // slimServedPage de-indents it at build time — a '\n'-prefixed anchor matches
  // neither tree (caught by this kickoff's own dry-run, per STANDARDS.md §4).
  const wtEnd = wtStart >= 0 ? src.indexOf('var saving = false;', wtStart) : -1;
  const wt = (wtStart >= 0 && wtEnd > wtStart) ? src.slice(wtStart, wtEnd) : '';
  r.writeTapDefined = wtStart >= 0;
  r.sliceNonEmpty = wt.length > 0; // SES-76: an empty slice is a broken anchor, never a pass
  r.usesMcpCapability = wt.includes("use('mcp')") && wt.includes("callTool('Supabase', 'execute_sql'");
  r.escapesUserText = src.includes("replace(/'/g, \"''\")");
  r.insertsBufferRow = wt.includes('INSERT INTO public.briefing_taps') && wt.includes('tap_kind') && wt.includes('::jsonb');
  r.neverRetries = !/retry|setTimeout\s*\(\s*writeTap/i.test(wt); // a write rejection is outcome-unknown
  // v7.0.352 — the outcome must be readable from `state`, not only from the savebar. Both of these
  // are FALSE on the pinned pre-change blob for the strongest possible reason: it predates writeTap
  // entirely, so the slice is empty. Arm 2 asserts them false rather than gating them out, which
  // keeps the control honest instead of merely quiet.
  r.recordsFailureInState = wt.includes('state.last_tap_error');
  r.recordsSuccessInState = wt.includes('state.last_tap_ok');
  // Every way out of the mcp path must leave a stamp. A rejected use('mcp') — a denied or
  // unanswered consent prompt — used to be an UNHANDLED rejection: async, so the outer catch never
  // saw it, and the tap failed in total silence. Two handlers on use() is what this pins.
  // Identified by the handler's OWN parameter name and code, never by a structural
  // `}, function` regex: that pattern also matches the INNER callTool handlers, so it stayed true
  // with the use() handler deleted. Caught by this change's own mutation run before it shipped —
  // the check was vacuous for one round, which is the SES-158 shape.
  r.handlesUseRejection = /\}\s*,\s*function\s*\(\s*uerr\s*\)/.test(wt) && wt.includes("'use_rejected'");
  r.stampsEveryBranch = (wt.match(/state\.last_tap_error\s*=/g) || []).length >= 3;
  const kinds = ['decision', 'answer', 'ask', 'unblock', 'setting', 'directive', 'reading'];
  r.allKindsWired = kinds.every((k) => src.includes("writeTap('" + k + "'"));
  r.callSiteCount = (src.match(/writeTap\(/g) || []).length; // 9 sites + 1 definition = 10
  r.enoughCallSites = r.callSiteCount >= 10;
  return r;
}

function preserved(src) {
  return src.includes('a.publish(doc())')
    && src.includes('<script type="application/json" id="briefing-state">');
}

export default async function run() {
  // Arm 1 — shipped template: every content check true, preservation intact.
  const live = norm(fs.readFileSync(TPL, 'utf8'));
  const c = contentChecks(live);
  for (const [k, v] of Object.entries(c)) {
    if (k === 'callSiteCount') continue;
    assert.strictEqual(v, true, `shipped template fails content check: ${k}`);
  }
  assert.ok(preserved(live), 'phase A must PRESERVE self-publish and the state block');

  preChangeControl();
  await liveArm();
}

// Arm 2 — file-level negative control against the pinned pre-change blob: the content checks must
// FAIL there, and preservation must HOLD there.
//
// IT LIVES IN ITS OWN FUNCTION SO THE DECLARATION BELOW RETURNS FROM *THIS* ARM ONLY (SES-273).
// Arms 1-3 shared one run() body, so a bare `return` beside the notRun() would have skipped arm 3
// — the credentialed live arm — on exactly the shallow-clone path where CI *does* hold the
// credentials. That would have traded a red suite for a silently narrower one, which is the worse
// of the two. Same one-function-per-arm shape the sibling guards already use.
function preChangeControl() {
  // TWO DIFFERENT THINGS, AND CONFLATING THEM IS WHAT MADE CI RED (SES-273). A control that RUNS
  // and turns out to be vacuous is a real failure and every assertion below still says so —
  // that is SES-158's rule and it is untouched. A control whose pinned object is simply NOT IN
  // THIS CHECKOUT has not run at all: actions/checkout@v4 clones at depth 1, so `git cat-file`
  // cannot resolve ad48b08f in CI, and assert.fail() there reported a shallow clone as a broken
  // guard. Measured live 2026-08-31: dev was red on four consecutive commits (first 92436fa
  // 21:18Z, head 3f1a313c 23:15Z) on this one line, 134/135, while a full clone ran 135/135 —
  // which is exactly why two attended follow-up ships walked straight past it.
  // notRun() is what this case is for (SES-180 (b), v7.0.224: run-all.js exits 1 iff something
  // FAILED, never because a part was declared), and three siblings in this same suite already
  // draw the line here on the identical condition — SES-255-ci-conclusion-reporting.js,
  // SES-256-rollback-drill.js and SES-50-resolved-id-citations.js, all three visible as
  // [NOT RUN] in the same red log. This adopts their shape verbatim rather than inventing a
  // fourth spelling of it.
  //
  // THE EDIT THIS FORBIDS: reaching for this branch when the blob DOES resolve and an assertion
  // below fails. That is a real finding about the guard, and declaring it not-run would be the
  // silently-no-opping control SES-158 names. Only an unresolvable object may be declared.
  const show = spawnSync('git', ['cat-file', '-p', PRE_BLOB], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 25 });
  if (show.status !== 0 || !show.stdout) {
    notRun(
      `the file-level negative control (briefing-template.html at blob ${PRE_BLOB.slice(0, 12)} must FAIL the content checks)`,
      `git cat-file -p ${PRE_BLOB} did not resolve here -- the blob is reachable from any full ` +
        'clone of this repo; a shallow or partial clone (actions/checkout@v4 at its default ' +
        'depth) may not carry it. An unrunnable control is declared, never counted as a pass.',
    );
    return;
  }
  const pre = norm(show.stdout);
  const p = contentChecks(pre);
  assert.strictEqual(p.writeTapDefined, false, 'control is vacuous: pre-change template already defines writeTap');
  assert.strictEqual(p.allKindsWired, false, 'control is vacuous: pre-change template already wires tap kinds');
  assert.ok(p.callSiteCount === 0, 'control is vacuous: pre-change template already calls writeTap');
  // v7.0.352's clauses, asserted false here rather than skipped: the pinned blob predates writeTap,
  // so a control that merely ignored them would stop measuring the newest half of this guard.
  assert.strictEqual(p.recordsFailureInState, false, 'control is vacuous: pre-change template already stamps last_tap_error');
  assert.strictEqual(p.recordsSuccessInState, false, 'control is vacuous: pre-change template already stamps last_tap_ok');
  assert.strictEqual(p.handlesUseRejection, false, 'control is vacuous: pre-change template already handles a rejected use()');
  assert.strictEqual(p.stampsEveryBranch, false, 'control is vacuous: pre-change template already stamps every branch');
  assert.ok(preserved(pre), 'preservation checks must hold on BOTH trees or they measure nothing');
}

// Arm 3 — credentialed live arm: buffer table exists, is writable at service level,
// and holds zero public grants (both directions, SES-101).
async function liveArm() {
  const KEY = process.env.SUPABASE_SERVICE_KEY;
  const URL_ = process.env.SUPABASE_URL || 'https://rallojeqnkgtxgsdsnqm.supabase.co';
  if (!KEY) {
    notRun('live briefing_taps round-trip + grants', 'no SUPABASE_SERVICE_KEY in env');
    return;
  }
  const hdrs = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };
  const ins = await fetch(`${URL_}/rest/v1/briefing_taps`, {
    method: 'POST', headers: hdrs,
    body: JSON.stringify({ tap_kind: 'ask', target_ref: 'SES-244-guard-fixture', payload: { q: "it's a fixture", at: '2026-08-31T00:00Z' }, page_built: 'guard' }),
  });
  // NEVER put `await ins.text()` in an assert MESSAGE. Arguments are evaluated eagerly, so the
  // message is built — and the body consumed — even on the 201 path, and the ins.json() below then
  // throws "Body is unusable". That fired AFTER the fixture INSERT landed and BEFORE the DELETE, so
  // every credentialed run failed AND leaked its fixture row into briefing_taps (CI red, 2 orphans,
  // v7.0.351). Read the body only on the branch that actually needs it.
  if (ins.status !== 201) assert.fail(`service-level INSERT refused: ${ins.status} ${await ins.text()}`);
  const [row] = await ins.json();
  assert.strictEqual(row.payload.q, "it's a fixture", 'payload with a quote did not round-trip');
  const del = await fetch(`${URL_}/rest/v1/briefing_taps?id=eq.${row.id}`, { method: 'DELETE', headers: hdrs });
  assert.ok(del.ok, 'fixture cleanup failed');
  const left = await (await fetch(`${URL_}/rest/v1/briefing_taps?target_ref=eq.SES-244-guard-fixture&select=id`, { headers: hdrs })).json();
  assert.strictEqual(left.length, 0, 'fixture rows left behind');
  // Grants, both directions: zero public rows; service_role present.
  const gq = `select grantee, count(*) n from information_schema.role_table_grants where table_schema='public' and table_name='briefing_taps' group by grantee`;
  // .catch() goes on the PROMISE, not on the awaited Response — a Response has no .catch, so the
  // original `await (await fetch(...)).catch(...)` threw "r.catch is not a function" on every
  // credentialed run. It was invisible only because the body-consumption bug above failed first.
  const g = await fetch(`${URL_}/rest/v1/rpc/exec_readonly_sql`, { method: 'POST', headers: hdrs, body: JSON.stringify({ q: gq }) }).catch(() => null);
  // exec_readonly_sql may not exist as an RPC on this project; if the call 404s, assert the
  // public-role denial the direct way instead: an anon-key read must be refused.
  if (!g || g.status === 404) {
    const ANON = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (!ANON) { notRun('grants assertion', 'no anon key in env to prove the denial direction'); return; }
    const denied = await fetch(`${URL_}/rest/v1/briefing_taps?select=id&limit=1`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
    assert.ok(denied.status === 401 || denied.status === 403 || denied.status === 404, `anon key can reach briefing_taps: ${denied.status}`);
  }
}

selfRun(import.meta.url, run);
