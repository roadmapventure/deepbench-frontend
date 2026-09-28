#!/usr/bin/env node
// DeepBench v7.0.689 | scripts/test-slot.js | AGT-265 -- four runner lanes build in parallel, and
// their regression-suite runs wait in ONE line for a green database.
//
// WHY: on the 0.5 GB NANO instance a regression suite is the heaviest thing a cycle does, and on
// 2026-09-27/28 up to six cycles were open at once. Nothing stopped two suites landing on the
// database together. public.test_slots is the line; public.test_slot_acquire() grants a slot only
// while db_health_level() is green, fewer than runner_settings.test_slot_capacity are held, and the
// caller is first. This module is the one client of that line.
//
// THE CONTRACT
//   holderId(env, os)      env.DEEPBENCH_CYCLE_ID, else "<hostname>:<pid>".
//   takeTestSlot(env, deps)
//     { skipped }          DEEPBENCH_TEST_SLOT is `off` (opt out) or `held` (a parent already holds
//                          the slot for this process tree), or there are no credentials.
//     { notRun }           test_slot_acquire answers HTTP 404 (the migration is not live), or no
//                          slot came inside DEFAULT_MAX_MINUTES (scripts/db-pressure.js) -- the why
//                          names the last level the database answered.
//     { holder, release(), beat() }   the slot is held.
//     Polls at 5 s doubling to 60 s. With DEEPBENCH_CYCLE_ID set, every wait also beats the cycle
//     (scripts/cycle-heartbeat.js) with last_step "built, waiting for a test slot", so step 0b's
//     20-minute stall line never reads a queued build as a frozen one.
//   withTestSlot(env, fn, deps)  takes the slot, beats it every 60 s while fn runs (the lease is 10
//                          minutes), releases it in `finally`. Returns { ran:false, notRun } or
//                          { ran:true, value, holder?, skipped? }.
//   CLI: node scripts/test-slot.js --status   prints the line and the capacity. Exit 0 read, 1 read
//                          failed, 2 no credentials / bad args.
//
// Fail closed (ARCHITECTURE.md §19o): an unreadable answer is never a grant; it is a wait, and at
// the cap it is a notRun.

import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { DEFAULT_MAX_MINUTES } from "./db-pressure.js";
import { heartbeat } from "./cycle-heartbeat.js";

export const FIRST_POLL_MS = 5_000;
export const MAX_POLL_MS = 60_000;
export const BEAT_MS = 60_000;
export const WAITING_STEP = "built, waiting for a test slot";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Pure.
export function holderId(env = process.env, osm = os, pid = process.pid) {
  return env.DEEPBENCH_CYCLE_ID ?? `${osm.hostname()}:${pid}`;
}

// Pure -- 5 s, 10 s, 20 s, 40 s, then 60 s.
export const nextPoll = prev => (prev ? Math.min(prev * 2, MAX_POLL_MS) : FIRST_POLL_MS);

const hasCreds = env => Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY);

async function rpc(env, doFetch, name, body) {
  const base = String(env.SUPABASE_URL).replace(/\/+$/, "");
  const key = env.SUPABASE_SERVICE_KEY;
  try {
    const res = await doFetch(`${base}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text().catch(() => "");
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* reported below */ }
    return { status: res.status, json, text };
  } catch (e) {
    return { status: 0, json: null, text: e.message };
  }
}

// One acquire (also the beat). Never throws.
export async function acquireOnce(env, holder, doFetch = fetch) {
  const cycle = env.DEEPBENCH_CYCLE_ID && UUID.test(env.DEEPBENCH_CYCLE_ID) ? env.DEEPBENCH_CYCLE_ID : null;
  const r = await rpc(env, doFetch, "test_slot_acquire", { p_holder: holder, p_cycle_id: cycle });
  if (r.status !== 200) return { status: r.status, granted: false, level: null, why: `HTTP ${r.status} ${String(r.text).slice(0, 200)}` };
  const row = Array.isArray(r.json) && r.json.length === 1 ? r.json[0] : null;
  if (!row) return { status: r.status, granted: false, level: null, why: "no test_slot_acquire row" };
  return { status: 200, granted: row.granted === true, level: row.level ?? null, row };
}

export async function releaseSlot(env, holder, doFetch = fetch) {
  const r = await rpc(env, doFetch, "test_slot_release", { p_holder: holder });
  return r.status === 200 ? Number(r.json) : null;
}

export async function takeTestSlot(env = process.env, {
  doFetch = fetch,
  sleep = ms => new Promise(res => setTimeout(res, ms)),
  now = () => Date.now(),
  out = s => console.log(s),
  osm = os,
  pid = process.pid,
} = {}) {
  const mode = env.DEEPBENCH_TEST_SLOT;
  if (mode === "off" || mode === "held") return { skipped: `DEEPBENCH_TEST_SLOT=${mode}` };
  if (!hasCreds(env)) return { skipped: "no credentials (SUPABASE_URL / SUPABASE_SERVICE_KEY)" };

  const holder = holderId(env, osm, pid);
  const deadline = now() + DEFAULT_MAX_MINUTES * 60_000;
  let wait = 0;
  let lastLevel = "unread";
  for (;;) {
    const a = await acquireOnce(env, holder, doFetch);
    if (a.status === 404) return { notRun: "test_slot_acquire is not deployed (HTTP 404) -- migration agt265_lanes_test_slot is not live" };
    lastLevel = a.level ?? (a.why ? `unreadable: ${a.why}` : "unread");
    if (a.granted) {
      out(`test-slot: held ${holder}`);
      return {
        holder,
        release: () => releaseSlot(env, holder, doFetch),
        beat: async () => (await acquireOnce(env, holder, doFetch)).granted,
      };
    }
    if (env.DEEPBENCH_CYCLE_ID) {
      await heartbeat([`--cycle=${env.DEEPBENCH_CYCLE_ID}`, `--step=${WAITING_STEP}`], env, doFetch).catch(() => null);
    }
    const left = deadline - now();
    if (left <= 0) {
      await releaseSlot(env, holder, doFetch).catch(() => null);
      return { notRun: `no test slot in ${DEFAULT_MAX_MINUTES} min (${lastLevel})` };
    }
    wait = Math.min(nextPoll(wait), left);
    const place = a.row ? `position ${a.row.position}, ${a.row.held}/${a.row.capacity} held` : "no answer";
    out(`test-slot: waiting -- ${lastLevel}, ${place}; next look in ${Math.round(wait / 1000)} s`);
    await sleep(wait);
  }
}

export async function withTestSlot(env, fn, deps = {}) {
  const slot = await takeTestSlot(env, deps);
  if (slot.notRun) return { ran: false, notRun: slot.notRun };
  if (slot.skipped) return { ran: true, skipped: slot.skipped, value: await fn(slot) };
  const timer = setInterval(() => { slot.beat().catch(() => null); }, deps.beatMs ?? BEAT_MS);
  try {
    return { ran: true, holder: slot.holder, value: await fn(slot) };
  } finally {
    clearInterval(timer);
    await slot.release().catch(() => null);
  }
}

export async function main(argv, { env = process.env, doFetch = fetch, out = s => process.stdout.write(`${s}\n`) } = {}) {
  if (argv.length !== 1 || argv[0] !== "--status") { out("test-slot: usage: node scripts/test-slot.js --status"); return 2; }
  if (!hasCreds(env)) { out("test-slot: SUPABASE_URL and SUPABASE_SERVICE_KEY are required -- nothing was read"); return 2; }
  const base = String(env.SUPABASE_URL).replace(/\/+$/, "");
  const key = env.SUPABASE_SERVICE_KEY;
  const get = async q => {
    const res = await doFetch(`${base}/rest/v1/${q}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    if (res.status !== 200) throw new Error(`${q} answered HTTP ${res.status}`);
    return res.json();
  };
  try {
    const [settings, rows] = await Promise.all([
      get("runner_settings?select=max_lanes,test_slot_capacity&id=eq.1"),
      get("test_slots?select=holder,cycle_id,state,requested_at,heartbeat_at,granted_at&order=requested_at"),
    ]);
    out(`test-slot: capacity ${settings[0]?.test_slot_capacity}, max_lanes ${settings[0]?.max_lanes}, ${rows.length} in line`);
    for (const r of rows) out(`  ${r.state.padEnd(7)} ${r.holder} (requested ${r.requested_at}, beat ${r.heartbeat_at})`);
    return 0;
  } catch (e) {
    out(`test-slot: ${e.message}`);
    return 1;
  }
}

// SES-176: importing this module for its exports must never run the CLI. exitCode, not exit()
// (the Windows libuv abort scripts/db-pressure.js records).
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  process.exitCode = await main(process.argv.slice(2));
}
