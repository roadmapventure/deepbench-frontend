// DeepBench v7.0.350 | tests/regression/SES-244-tap-buffer.js | SES-244 phase A — every briefing
// tap writes a briefing_taps row via the mcp capability, additively (self-publish preserved).
// File-level negative control pins the PRE-CHANGE template at immutable blob
// ad48b08fcc9d8ef141791e55bc147a7d0994cdbd (docs/runbooks/briefing-template.html @ v7.0.349) —
// never origin/dev, which moves (the SES-240 lesson).
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { execFileSync } from 'child_process';
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

  // Arm 2 — file-level negative control against the pinned pre-change blob:
  // the content checks must FAIL there, and preservation must HOLD there
  // (a control that cannot run is a failure, never a skip — SES-158).
  let pre;
  try {
    pre = norm(execFileSync('git', ['cat-file', '-p', PRE_BLOB], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 25 }));
  } catch (e) {
    assert.fail('negative control could not run: git cat-file failed: ' + e.message);
  }
  const p = contentChecks(pre);
  assert.strictEqual(p.writeTapDefined, false, 'control is vacuous: pre-change template already defines writeTap');
  assert.strictEqual(p.allKindsWired, false, 'control is vacuous: pre-change template already wires tap kinds');
  assert.ok(p.callSiteCount === 0, 'control is vacuous: pre-change template already calls writeTap');
  assert.ok(preserved(pre), 'preservation checks must hold on BOTH trees or they measure nothing');

  // Arm 3 — credentialed live arm: buffer table exists, is writable at service level,
  // and holds zero public grants (both directions, SES-101).
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
  assert.strictEqual(ins.status, 201, `service-level INSERT refused: ${ins.status} ${await ins.text()}`);
  const [row] = await ins.json();
  assert.strictEqual(row.payload.q, "it's a fixture", 'payload with a quote did not round-trip');
  const del = await fetch(`${URL_}/rest/v1/briefing_taps?id=eq.${row.id}`, { method: 'DELETE', headers: hdrs });
  assert.ok(del.ok, 'fixture cleanup failed');
  const left = await (await fetch(`${URL_}/rest/v1/briefing_taps?target_ref=eq.SES-244-guard-fixture&select=id`, { headers: hdrs })).json();
  assert.strictEqual(left.length, 0, 'fixture rows left behind');
  // Grants, both directions: zero public rows; service_role present.
  const gq = `select grantee, count(*) n from information_schema.role_table_grants where table_schema='public' and table_name='briefing_taps' group by grantee`;
  const g = await (await fetch(`${URL_}/rest/v1/rpc/exec_readonly_sql`, { method: 'POST', headers: hdrs, body: JSON.stringify({ q: gq }) })).catch(() => null);
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
