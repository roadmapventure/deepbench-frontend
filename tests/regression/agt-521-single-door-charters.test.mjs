// DeepBench v7.0.982 | tests/regression/agt-521-single-door-charters.test.mjs | AGT-521 -- THE
// GUARD ON "BOTH OF VICTORIA'S DOORS CARRY THE CHARTERS, IN ONE SHAPE, FROM ONE READ".
//
// WHAT IT GUARDS, and why each arm is shaped the way it is.
//
//   A  OFFLINE. ONE SHAPE (pattern:14). `charterContext()` is the single home of the two charter
//      entries, and the two context builders are graded against EACH OTHER rather than against a
//      literal: a hand-written expectation would pass by agreeing with this file, while agreeing
//      with the other door is the property the ticket exists for. The control is the other
//      direction -- a context assembled with NO charters still reads `[]` and `null`, so the
//      single door's AGT-280 behaviour is byte-unchanged for every caller that passes neither --
//      and `validateVerdict()` still accepts the ordinary pass over the enlarged context, which is
//      the thing a new key could silently have broken.
//
//   B  LIVE. ONE READ, BOTH DOORS. The `--prepare` door is spawned on a ticket the `--prepare-list`
//      door itself offered, and the two contexts' charters and fingerprint must be EQUAL. Nothing
//      is pinned: the charters are John's text and the fingerprint is the md5
//      `victoria_charter_state()` computed over them, so a pinned value would go red on an edit
//      that broke nothing and, worse, could pass by agreeing with a constant. The ticket is taken
//      from the list's own proposals and probed through `need_source_is_traceable()` first,
//      because the `--prepare` door refuses an untraceable source BEFORE it reads the charters
//      (decision 17: the charters are read after the traceability check, so a turn is never
//      costed on a ticket that cites nothing).
//
//   C  OFFLINE, over arm B's own two measured contexts. THE DISCRIMINATOR: the fingerprint each
//      door carries is the md5 of the charters IT carries -- recomputed here in JS from the array
//      itself -- and one extra character in a charter moves that md5 THE SAME WAY on both doors.
//      That is the property the fit-stamp's whole life rests on (AGT-486 requirement d.5): a
//      charter edit must clear every stamp, and after this ticket it must clear them for the
//      single door too, not only the list.
//
// WHY B AND C DECLARE notRun WITHOUT CREDENTIALS. The rpc, the two spawned doors and the
// fingerprint they echo live in Supabase; there is no offline half of any of them, and arm C is
// computed over arm B's own measurements deliberately rather than over a fixture (a fixture would
// prove md5 is a hash, not that THESE two doors carry THESE charters). A test that silently skipped
// them would print a green over the half the ticket shipped (SES-180 (b)).
//
// THE SERIALIZER AND THE HASH ARE IMPORTED, NEVER RE-WRITTEN. `pgJsonbText()` and `md5()` are
// AGT-486's own copies, exported from its guard for exactly this re-use: a second serializer here
// could disagree with that one and both could be wrong against Postgres (pattern:14).

import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  charterContext, buildTaskContext, buildListContext, validateVerdict,
} from "../../scripts/requirement-check.js";
import { pgJsonbText, md5 } from "./agt-486-charter-fit.test.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CLI = path.join(REPO, "scripts", "requirement-check.js");

const BASE = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
const KEY = process.env.SUPABASE_SERVICE_KEY ?? "";
const CREDS = Boolean(BASE && KEY);

// The fixture's own names. `ZAGT` is the reserved regression prefix (SES-382): nothing in arm A
// reaches the database, but a fixture id that could collide with a real ticket reads as one.
const C = [{ slug: "a", charter: "x", name: "n" }];
const T = { backlog_id: "ZAGT521" };
const SRC = "nathan:market_records:x";

async function req(q, init = {}) {
  const res = await fetch(`${BASE}/rest/v1/${q}`, {
    ...init,
    headers: {
      apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text().catch(() => "");
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not json */ }
  return { ok: res.ok, status: res.status, text, json };
}
const describe = r => `HTTP ${r.status} ${String(r.text).slice(0, 300)}`;

// A door, spawned as the runner spawns it. Exit 3 IS the success of a prepare door -- the question
// is on stdout and nothing has been answered yet -- so the status is asserted, never ignored.
function door(args, label) {
  const r = spawnSync(process.execPath, [CLI, ...args], {
    encoding: "utf8", env: process.env, timeout: 300000, maxBuffer: 32 * 1024 * 1024,
  });
  assert.equal(r.status, 3,
    `${label} must exit 3 (the question is asked, nothing answered); got ${r.status} ` +
    `stderr=${String(r.stderr).slice(0, 400)}`);
  let json = null;
  try { json = JSON.parse(String(r.stdout)); } catch (e) {
    assert.fail(`${label} must print ONE json object on stdout; ${e.message} -- ` +
      `stdout=${String(r.stdout).slice(0, 300)}`);
  }
  return json;
}

async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`[arm ${name}] FAIL -- ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };

  // Arm B hands its two measured contexts to arm C. Null means arm B did not get that far, and
  // arm C says so rather than quietly passing over a fixture of its own.
  let liveSingle = null;
  let liveList = null;

  // ---- A. ONE SHAPE, AND THE DOOR THAT PASSES NEITHER ------------------------------------------
  await arm("A charterContext(): one shape, both builders, and the charter-less control", async () => {
    // (1) THE SHAPE ITSELF, and it carries the rpc's two fields and NOTHING else of the row: a
    //     charter's `name` is not something a fit is judged against.
    assert.deepEqual(charterContext({ charters: C, fingerprint: "f" }),
      { active_charters: [{ slug: "a", charter: "x" }], charter_fingerprint: "f" },
      "charterContext() is {active_charters, charter_fingerprint} and drops every other column");

    // (2) THE TWO DOORS AGREE, offline, over the same input -- graded against each other, which is
    //     the whole of the ticket: one shape, so one change moves both.
    const single = buildTaskContext({
      ticket: T, source: SRC, source_row: null, kinds: [], charters: C, fingerprint: "f",
    });
    const list = buildListContext({
      project: "p", tickets: [], candidates: [], kinds: [], charters: C, fingerprint: "f",
    });
    assert.deepEqual(single.active_charters, list.active_charters,
      "the single door's charters ARE the list door's; got " +
      `${JSON.stringify(single.active_charters)} vs ${JSON.stringify(list.active_charters)}`);
    assert.equal(single.charter_fingerprint, list.charter_fingerprint,
      "and so is the fingerprint");

    // (3) THE CONTROL, the other direction: a caller that passes neither gets the empty reading,
    //     not an undefined key and not a throw. AGT-280's own callers are unchanged.
    const bare = buildTaskContext({ ticket: T, source: SRC, source_row: null, kinds: [] });
    assert.deepEqual(bare.active_charters, [],
      `no charters is [] -- a fit judged against nothing, refused by the validator, never absent; ` +
      `got ${JSON.stringify(bare.active_charters)}`);
    assert.equal(bare.charter_fingerprint, null,
      `and no fingerprint is null; got ${JSON.stringify(bare.charter_fingerprint)}`);

    // (4) AND THE ORDINARY PASS IS STILL ACCEPTED over the enlarged context -- the writer's two
    //     verdicts and their rules are untouched by the two new keys.
    const pass = {
      backlog_id: "ZAGT521", verdict: "pass", need_source: SRC, need_score: 3, home: null,
      reason: "the cited record still asks for exactly this, and the severity tree reads it a 3",
      account: "Scored the one fixture ticket against the record it cites",
      proposal: "keep it, scored 3",
    };
    const v = validateVerdict(pass, single);
    assert.deepEqual(v.refusals, [],
      `a well-formed pass over a charter-carrying context raises NO refusal; got ` +
      `${JSON.stringify(v.refusals)}`);
    assert.equal(v.ok, true, "and the answer as a whole is accepted");
    console.log(`    [AGT-521 arm A] one shape over both builders; charter-less reads [] / null; ` +
      `the pass still validates`);
  });

  if (!CREDS) {
    notRun("AGT-521 arm B — both live doors over one victoria_charter_state() read",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY are absent. The rpc, the two spawned doors and the " +
      "fingerprint they echo have no offline half: arm A grades the shared shape and nothing " +
      "else. Run with node --env-file-if-exists=.env.local tests/regression/run-all.js, or with " +
      "the two secrets exported inline from public.runner_secrets.");
    notRun("AGT-521 arm C — the fingerprint re-derived over both doors' own charters",
      "it is computed over arm B's own two measured contexts, deliberately rather than over a " +
      "fixture: a fixture would prove md5 is a hash, not that THESE two doors carry THESE " +
      "charters. Without credentials arm B never measured them.");
  } else {
    // ---- B. ONE READ, BOTH LIVE DOORS ----------------------------------------------------------
    await arm("B --prepare and --prepare-list carry the SAME charters and fingerprint", async () => {
      const rpc = await req("rpc/victoria_charter_state", { method: "POST", body: "{}" });
      assert.ok(rpc.ok, `the rpc must answer; got ${describe(rpc)}`);
      const state = Array.isArray(rpc.json) ? rpc.json[0] : rpc.json;
      const slug0 = state?.charters?.[0]?.slug;
      assert.ok(slug0, `the board must have at least one executing charter to test against; got ` +
        `${JSON.stringify(state?.charters)}`);

      const listArgs = [`--prepare-list`, `--project=${slug0}`, `--rescore`, `--json`];
      let L = door(listArgs, `--prepare-list --project=${slug0} --rescore`);
      assert.ok(Array.isArray(L.context?.proposals) && L.context.proposals.length > 0,
        `the list door must offer at least one proposal to borrow a ticket from; got ` +
        `${JSON.stringify(L.context?.proposals?.length)}`);

      // THE TRACEABLE ONE. `--prepare` refuses an untraceable source before it ever reads the
      // charters (decision 17), so a ticket is probed through the gate's OWN function first --
      // bounded, because a board where five in a row cite nothing is a finding, not a red.
      let pick = null;
      let probes = 0;
      for (const p of L.context.proposals) {
        if (!p.need_source || probes >= 5) break;
        probes += 1;
        const tr = await req("rpc/need_source_is_traceable",
          { method: "POST", body: JSON.stringify({ p_source: p.need_source }) });
        assert.ok(tr.ok, `need_source_is_traceable() must answer; got ${describe(tr)}`);
        if (tr.json === true) { pick = p; break; }
      }
      if (!pick) {
        notRun("AGT-521 arm B — both live doors over one victoria_charter_state() read",
          `none of the first ${probes} proposal(s) on ${slug0} cites a traceable row, so the ` +
          `--prepare door cannot be reached without inventing a ticket. The list door's own ` +
          `charters were read; the single door's were not.`);
        return;
      }

      let S = door([`--prepare`, `--ticket=${pick.backlog_id}`, `--source=${pick.need_source}`, `--json`],
        `--prepare --ticket=${pick.backlog_id}`);

      // A mismatch is re-measured ONCE before it is called red: John may have edited a charter
      // between the two spawns, and a parallel edit is a stale reading, not a broken door
      // (SES-382). A second disagreement is the real thing.
      if (S.context.charter_fingerprint !== L.context.charter_fingerprint) {
        console.log(`    [AGT-521 arm B] fingerprints disagreed; re-reading the list door once ` +
          `(a charter edit between the two spawns)`);
        L = door(listArgs, `--prepare-list --project=${slug0} --rescore (re-read)`);
      }

      assert.match(String(S.context.charter_fingerprint), /^[0-9a-f]{32}$/,
        `the single door's fingerprint is a 32-hex md5; got ` +
        `${JSON.stringify(S.context.charter_fingerprint)}`);
      assert.deepEqual(S.context.active_charters, L.context.active_charters,
        `both doors carry the SAME charters; single=${JSON.stringify(S.context.active_charters)} ` +
        `list=${JSON.stringify(L.context.active_charters)}`);
      assert.equal(S.context.charter_fingerprint, L.context.charter_fingerprint,
        `and the SAME fingerprint; single=${S.context.charter_fingerprint} ` +
        `list=${L.context.charter_fingerprint}`);

      liveSingle = S.context;
      liveList = L.context;
      console.log(`    [AGT-521 arm B] ${slug0}: ${L.context.proposals.length} proposals, ` +
        `${probes} probe(s), borrowed ${pick.backlog_id}; both doors read ` +
        `${S.context.active_charters.length} charter(s), fingerprint ` +
        `${S.context.charter_fingerprint}`);
    });

    // ---- C. THE FINGERPRINT, RE-DERIVED, AND ONE EDIT MOVING BOTH DOORS -----------------------
    if (!liveSingle || !liveList) {
      // Arm B declared its own not-run (no traceable source to reach the single door with), so
      // there is nothing to re-derive. DECLARED, never inferred, and never a silent green.
      notRun("AGT-521 arm C \u2014 the fingerprint re-derived over both doors' own charters",
        "arm B did not measure both contexts, so this arm has no charters of its own to hash -- " +
        "by design: a fixture would prove md5 is a hash, not that THESE two doors carry THESE " +
        "charters. Arm B's own declaration says why it stopped.");
    } else {
    await arm("C the md5 is the md5 of the charters each door carries, and one edit moves both", async () => {
      assert.equal(md5(pgJsonbText(liveSingle.active_charters)), liveSingle.charter_fingerprint,
        "the single door's fingerprint IS the md5 of the charters it carries, re-derived here");
      assert.equal(md5(pgJsonbText(liveList.active_charters)), liveList.charter_fingerprint,
        "and so is the list door's");

      // THE DISCRIMINATOR. One character, and both doors move the same way -- which is what makes
      // a charter edit clear every fit-stamp on BOTH doors (requirement d.5).
      const E = structuredClone(liveSingle.active_charters);
      E[0].charter += "x";
      const moved = md5(pgJsonbText(E));
      assert.notEqual(moved, liveSingle.charter_fingerprint,
        "one extra character in a charter MOVES the md5 -- a fingerprint that did not move would " +
        "leave every stamp standing over an edited charter");
      const EL = structuredClone(liveList.active_charters);
      EL[0].charter += "x";
      assert.equal(md5(pgJsonbText(EL)), moved,
        "and the same edit over the LIST door's charters lands on the same md5 -- one change, " +
        "both doors");
      console.log(`    [AGT-521 arm C] re-derived ${liveSingle.charter_fingerprint}; one edited ` +
        `character moves both doors to ${moved}`);
    });
    }
  }

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n    ${failures.join("\n    ")}`);
}

selfRun(import.meta.url, run);
export default run;
