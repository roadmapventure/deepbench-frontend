// DeepBench v7.0.1057 | tests/regression/agt-680-marker-after-pickup.test.mjs | AGT-680 -- the
// redesign cooldown marker is written AFTER the pickup, and names the ticket the pickup took.
//
// THE DEFECT, measured live 2026-11-18 rather than reasoned about. Door (d) of
// docs/runbooks/redesign-after-refusal.md ordered the cooldown marker (`last_step`
// `redesign: <id>`) BEFORE `node scripts/redesign-pickup.js --next`. `public.redesign_due_ticket()`
// takes no argument and its 24-hour cooldown has no exception for the asking cycle, so the marker
// cooled the very ticket the gate had just named: the gate named AGT-251 at 10:41:22Z, `--next` run
// before any marker took AGT-251, and with `redesign: AGT-251` on the asking cycle's own row a
// separate call returned AGT-252 -- the pickup walked one ticket down the parked list. A `p_cycle`
// argument is refused by the API (PGRST202): the function is zero-argument, live. The fix is the
// ORDER only.
//
// WHAT THIS TEST DOES NOT CLAIM. The marker lives in `last_step`, which every step heartbeat
// overwrites, so the cooldown holds only while a cycle's `last_step` keeps the prefix. That
// durability fault is open ticket AGT-689 and is not built here; arm B therefore asserts what the
// rows say now, never that a marker survives.
//
// ARMS
//   A  repo -- door (d) carries the pickup-then-marker order and neither pre-change sentence.
//      CONTROL: an OLD constant holding the four pre-change lines verbatim gives false through the
//      same predicate, so this arm cannot pass against the runbook as it stood at 166cab2.
//   B  live, read-only, one measured run -- the gate and the cooldown function name one ticket, the
//      pickup takes that same ticket, and another cycle's marker still cools what it names.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { pickCandidate } from "../../scripts/redesign-pickup.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RUNBOOK = path.join(ROOT, "docs/runbooks/redesign-after-refusal.md");

// The shipped order (P) and the two pre-change sentences (G). Matched against normalised text, so a
// passage that wraps across lines in the runbook is matched the same as one that does not.
const P1 = "Run `--next` FIRST";
const P2 = "THEN set `last_step` to `redesign: <the id --next printed>`";
const G1 = "Set `last_step` to `redesign: <that id>` FIRST";
const G2 = "which takes that same ticket";

// CONTROL -- door (d)'s four marker-first lines exactly as they stood on tree 166cab2.
const OLD = [
  "  Set `last_step` to `redesign: <that id>` FIRST — that is the cooldown marker, so a pickup that ends",
  "  without an attempt lets the next parked ticket have its turn — then run `--next`, which takes that",
  "  same ticket, and continue at section 3. Undecided gate cards come before this: `rule-cards-only`",
  "  now fires with work pickable too (2-hour retry, `last_step` `rule-cards: <n>`).",
].join("\n");

export function norm(s) {
  return String(s).replace(/\s+/g, " ").trim();
}

/** Door (d) only -- from its bullet to the start of section 3, normalised. */
export function door(md) {
  const from = md.indexOf("- **(d) ");
  const to = md.indexOf("## 3. The pickup");
  assert.ok(from !== -1, "door (d)'s bullet is missing from the runbook");
  assert.ok(to !== -1 && to > from, "section 3's header is missing or above door (d)");
  return norm(md.slice(from, to));
}

/** True only for the pickup-then-marker order with neither pre-change sentence left behind. */
export function markerAfterPickup(d) {
  const i = d.indexOf(P1);
  const j = d.indexOf(P2);
  if (i === -1 || j === -1 || i >= j) return false;
  return !d.includes(G1) && !d.includes(G2);
}

function armA() {
  const md = fs.readFileSync(RUNBOOK, "utf8");
  const d = door(md);

  assert.ok(markerAfterPickup(d),
    `door (d) must order the pickup first and the marker second (AGT-680); door reads: ${d.slice(0, 400)}`);
  assert.ok(d.includes("`AGT-680`"), "door (d) must name `AGT-680` -- why the marker is never written first");
  assert.ok(d.includes("`AGT-689`"), "door (d) must name `AGT-689` -- the marker the next heartbeat erases");

  // CONTROL, and the reason it is false is asserted too (STANDARDS.md Section 4, the LOO-013
  // lesson): the old door fails on the guard sentences AND carries no pickup-first instruction.
  const old = norm(OLD);
  assert.equal(markerAfterPickup(old), false,
    "control: the four pre-change lines must give false, or this arm discriminates nothing");
  assert.ok(old.includes(G1) && old.includes(G2),
    "control: the pre-change lines must carry both guard sentences -- that is why they are false");
  assert.ok(!old.includes(P1),
    "control: the pre-change lines must carry no pickup-first instruction");

  const all = norm(md);
  assert.ok(all.includes("The candidate is the ticket `public.redesign_due_ticket()` names"),
    "section 3 must say the candidate is the ticket redesign_due_ticket() names");
  assert.ok(!all.includes("The candidate is **row 1** of"),
    "section 3's `row 1` sentence contradicted door (d) and must be gone");

  console.log(`    [AGT-680 arm A] door (d) ${d.length} chars: pickup first, marker second, AGT-680 + AGT-689 named; control (4 pre-change lines) false on G1+G2`);
}

/** The ids a marker row still cools: `redesign: <id>` at the start, ended by the string or a space. */
export function cooledIds(parked, markers) {
  const steps = markers.map(m => String((m && m.last_step) || ""));
  return parked
    .map(r => r && r.backlog_id)
    .filter(p => p && steps.some(s => {
      const pre = `redesign: ${p}`;
      return s.startsWith(pre) && (s.length === pre.length || s[pre.length] === " ");
    }));
}

async function readFour(url, h) {
  const boot = await (await fetch(`${url}/rest/v1/rpc/runner_should_boot`, { method: "POST", headers: h, body: "{}" })).json();
  const v = Array.isArray(boot) ? boot[0] : boot;
  const dueRaw = await (await fetch(`${url}/rest/v1/rpc/redesign_due_ticket`, { method: "POST", headers: h, body: "{}" })).json();
  const parked = await (await fetch(`${url}/rest/v1/rpc/refusal_parked_tickets`, { headers: h })).json();
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const markers = await (await fetch(
    `${url}/rest/v1/runner_cycles?started_at=gt.${since}&last_step=like.redesign:*&select=id,last_step`,
    { headers: h })).json();
  assert.ok(v && v.detail, "runner_should_boot() returned no row");
  assert.ok(Array.isArray(parked), `refusal_parked_tickets() returned no list: ${JSON.stringify(parked).slice(0, 200)}`);
  assert.ok(Array.isArray(markers), `runner_cycles marker read returned no list: ${JSON.stringify(markers).slice(0, 200)}`);
  return {
    gate: v.detail.redesign_ticket ?? null,
    due: typeof dueRaw === "string" && dueRaw ? dueRaw : (dueRaw ?? null),
    parked,
    markers,
  };
}

/** Every disagreement in one pass, so a retry re-reads once and reports the surviving ones. */
function disagreements(s) {
  const out = [];
  if (s.gate !== s.due) out.push(`(1) the gate names ${s.gate} and redesign_due_ticket() names ${s.due} -- one ticket, or the marker cooled the gate's own pick`);
  if (s.due !== null) {
    let took = null;
    try {
      const hit = pickCandidate(s.parked, s.due);
      took = hit && hit.backlog_id;
    } catch (e) {
      took = `threw: ${e.message}`;
    }
    if (took !== s.due) out.push(`(2) the gate named ${s.due} and the pickup would take ${took}`);
  }
  const cooled = cooledIds(s.parked, s.markers);
  if (cooled.includes(s.due)) out.push(`(3) ${s.due} is due AND cooled by a marker row -- the cooldown is not holding`);
  return out;
}

async function armB() {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("AGT-680 arm B (live gate/pickup/cooldown)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent; export both inline by name from public.runner_secrets");
    return;
  }
  const h = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

  // Four SEPARATE requests, never one statement: a subquery inside the same UPDATE ... RETURNING
  // reads the statement snapshot and still returned the pre-marker id, which is how the defect hid.
  let s = await readFour(url, h);
  let bad = disagreements(s);
  if (bad.length) {
    // 5-7 cycles move these rows under us; one re-read separates a race from a real disagreement.
    const second = await readFour(url, h);
    const badSecond = disagreements(second);
    assert.equal(badSecond.length, 0,
      `two consecutive passes disagree: ${badSecond.join(" | ")} (first pass: ${bad.join(" | ")})`);
    s = second;
    bad = badSecond;
  }

  const cooled = cooledIds(s.parked, s.markers);
  if (cooled.length === 0) {
    notRun("AGT-680 arm B assertion (3) (another cycle's marker still cools)",
      "no runner_cycles row in the last 24 hours carries a `redesign: <id>` marker for a parked ticket, so there is nothing cooled to check");
  }
  if (s.due === null) {
    notRun("AGT-680 arm B assertion (2) (the pickup takes the ticket the gate named)",
      "redesign_due_ticket() names no ticket right now -- every parked ticket is carded or cooled, so there is no pickup to check");
  }

  console.log(`    [AGT-680 arm B] live: gate ${s.gate ?? "null"}, due ${s.due ?? "null"}, parked ${s.parked.length}, marker rows ${s.markers.length}, cooled [${cooled.join(" ") || "none"}]${s.due !== null ? `; pickup takes ${s.due}, which is ${cooled.includes(s.due) ? "COOLED" : "not cooled"}` : ""}`);
}

async function run() {
  armA();
  await armB();
}

selfRun(import.meta.url, run);
export default run;
