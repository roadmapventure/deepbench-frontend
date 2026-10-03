// DeepBench v7.0.746 | tests/regression/agt-308-gate-before-build.test.mjs | AGT-308
// FEATURE: AGT-308 -- GATING A TICKET AT STEP 5 IS ONE CALL: CARD, STATE, SKIP. Kickoff:
// docs/kickoffs/v7.0.746-AGT-308-gate-writes-state.md §5 task T3.
//
// THE DEFECT, measured 2026-10-03 rather than reasoned about: step 5 of docs/runbooks/runner-cycle.md
// was TWO hand-typed statements -- a `runner_items` INSERT and a `backlog_items` UPDATE -- bound by
// prose alone (SES-114), with no function and no trigger holding them together. Cycle c71e55fe
// classified AGT-281 gated at 10:02Z and wrote NEITHER; the card landed at 10:39Z, and for the 37
// minutes between, the ticket sat at prime_directive_queue() position 1 where any concurrent cycle
// could have picked it. public.gate_before_build() is the structural fix: one call or none.
//
// TWO ARMS; A runs offline, B needs credentials and is declared notRun without them:
//   A  PURE -- step 5's OWN span carries the call and the 34865f07 rule; the hand-typed UPDATE is
//      GONE from the whole file; docs/runbooks/runner-cycle.md still measures exactly 380,949 B, so
//      agt-253-design-only-lane.test.mjs:51 and ses-413d-questions-scoreboard.test.mjs:256 both
//      hold without being re-pinned (kickoff D2 -- re-pinning is two files over this class's cap).
//      CONTROLS: each assertion is paired with the smallest mutation that must break it, so a green
//      here cannot be a green that could not go red (STANDARDS §4, LOO-013). The SPAN is the
//      load-bearing half: the same call pasted into step 9 would satisfy a file-wide includes() and
//      tell no cycle at step 5 anything.
//   B  LIVE -- one fixture ticket is gated for real and the THREE writes are read back
//      independently: the undecided card, `design_status` = needs-desktop, and the runner_skips row
//      pointing at that card. pick_exclusions()' reasons for the fixture gain EXACTLY the two gate
//      sentences they did not carry before the call -- that delta is the discriminator, since a
//      function that wrote only the card, or only the flag, moves one of them and not both. Both
//      before-images are checked for the right SHAPE (§19v / SES-150: the ticket's image carries the
//      PRIOR row with design_status NULL; the card's image is row_data NULL, which reverse_decision()
//      reads as "delete this row again"). Then three refusals, each by ITS OWN sentence rather than
//      "a 400", and the fixture is deleted with every table's exact count re-read unmoved.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CYCLE_REL = "docs/runbooks/runner-cycle.md";
// ses-413d's BYTES_AT_SHIP is the ONE home for the runbook's live size; this literal is the
// kickoff's own byte-neutral target (D2), carried here so arm A states what it measured rather than
// agreeing with whatever the file happens to be.
const BYTES_AT_SHIP = 380949;
// Step 5's span, by its own two markers. parseSteps() is not used: the replaced paragraph sits deep
// inside step 5 rather than at a step boundary, and `5a.` is the next marker in the file.
const STEP5_FROM = "**5. Pick ONE item.**";
const STEP5_TO = "**5a. READ WHAT YOUR CLASS EARNED";
const CALL = "public.gate_before_build(";
const WORDING_RULE = "34865f07";
// The statement T2 deleted. Its absence is the half that proves the two-statement form is gone
// rather than merely joined by a third.
const HAND_TYPED = "SET design_status = 'needs-desktop', updated_at = now()";

// The two sentences pick_exclusions() already carried before AGT-308 and that this one call makes
// true together. Read live from pg_get_functiondef(pick_exclusions) this ship.
const REASON_FLAG = "needs a session John attends (needs-desktop)";
const REASON_CARD = "undecided gated_before_build card";

// THE FIXTURE ID, AND WHY IT IS NOT THE KICKOFF'S LITERAL `ZAGT308` PREFIX. runner_items carries
// ck_runner_items_backlog_id_bare, CHECK (backlog_id ~ '^[A-Z]+-[0-9]+[a-z]?$'), so `ZAGT308-1`
// cannot be the backlog_id of a row this call files a CARD for -- digits are not legal inside the
// letter prefix, and the insert dies 23514 inside gate_before_build(). Measured on this test's
// first run. agt-280-requirement-gate.test.mjs never hits it because it files no card. The shape
// used here is ses-424c-gate-card-census.test.mjs's own precedent (`ZFIX-42499001`): letters, then
// the ticket number and the fixture band as ONE digit run. REPORTED as this build's deviation.
const FIXTURE_ID = "ZAGT-30899001";
const SOURCE_FILE = "tests/regression/agt-308-gate-before-build.test.mjs";
const DESIGN_ONLY_TICKET = "AGT-250";   // trainer-authored-agents, the design-only project

const lf = t => String(t).replace(/\r\n/g, "\n");
const read = rel => lf(fs.readFileSync(path.join(ROOT, rel), "utf8"));

// The text of step 5 from its own marker to step 5a's, so a needle anywhere else in a 380 KB
// runbook cannot pass for one a cycle reads at the pick.
export function step5Span(md) {
  const t = lf(md);
  const from = t.indexOf(STEP5_FROM);
  assert.ok(from >= 0, `${CYCLE_REL} has no ${STEP5_FROM} marker`);
  const to = t.indexOf(STEP5_TO, from);
  assert.ok(to > from, `${CYCLE_REL} has no ${STEP5_TO} marker after step 5`);
  return t.slice(from, to);
}

async function req(url, key, q, { method = "GET", body, prefer, headers = {} } = {}) {
  const res = await fetch(`${url}/rest/v1/${q}`, {
    method,
    headers: {
      apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}), ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text().catch(() => "");
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not json */ }
  return { ok: res.ok, status: res.status, text, json, code: json && !Array.isArray(json) ? json.code : undefined };
}
const describe = r => `HTTP ${r.status} code=${r.code ?? "-"} ${r.text.slice(0, 300)}`;

async function count(url, key, q) {
  const res = await fetch(`${url}/rest/v1/${q}`, {
    method: "HEAD",
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact" },
  });
  const cr = res.headers.get("content-range") ?? "";
  const n = Number(cr.split("/")[1]);
  if (!res.ok || !Number.isFinite(n)) throw new Error(`count ${q} -> HTTP ${res.status} content-range=${cr}`);
  return n;
}

// agt-280-requirement-gate.test.mjs's ticket() shape (that file, line 110), with the id and the
// ordinal band swapped for this one. `john-named` is AGT-280 case (v): the requirement gate's own verbatim
// exception, so the insert lands on an executing project's epic without this test having to cite a
// market record it does not otherwise need.
function ticket(n, epicId, extra) {
  return {
    backlog_id: FIXTURE_ID,
    tier: "next",
    type: "Tooling",
    priority_class: "P10 - Tooling",
    title: `AGT-308 gate-before-build probe ${n}`,
    status: "open",
    epic_id: epicId,
    source_file: SOURCE_FILE,
    scope_origin: "john-named",
    size_stamp: "S",
    defer_status: "no",
    scope_rationale: "regression probe",
    enhancement_claim: "none: probe",
    row_ordinal: 999900000 + n,
    ...extra,
  };
}

async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`${name}: ${e.message.split("\n")[0]}`); console.log(`    [arm ${name}] FAIL -- ${e.message.split("\n")[0]}`); }
  };

  // --- A. step 5's span, the deleted UPDATE, and the bytes ---------------------------------------
  await arm("A step 5 span carries the one call, the UPDATE is gone, bytes held", () => {
    const md = read(CYCLE_REL);
    const bytes = Buffer.byteLength(md, "utf8");
    const span = step5Span(md);

    assert.ok(span.includes(CALL),
      `step 5's own span must name ${CALL} -- a cycle that classifies a ticket gated has nothing to ` +
      `call otherwise, which is the AGT-308 bug`);
    assert.ok(span.includes(WORDING_RULE),
      `step 5's span must keep the ${WORDING_RULE} rule -- it governs the card's WORDING, and D1 is ` +
      `that it never governs whether the call happens`);
    assert.ok(/ONE CALL/.test(span) && span.includes("SES-114"),
      "the span must say the three writes are ONE call and cite SES-114, the ticket that filed the ask " +
      "without the state");
    assert.ok(span.includes("design_only_stop()"),
      "and it must send a design-only ticket to step 6's design_only_stop() instead");

    assert.ok(!md.includes(HAND_TYPED),
      `the hand-typed UPDATE must be GONE from ${CYCLE_REL} -- leaving it beside the call gives one ` +
      `act two homes and lets a cycle write the flag without the card`);

    assert.strictEqual(bytes, BYTES_AT_SHIP,
      `${CYCLE_REL} measures ${bytes} B; kickoff D2 made this edit byte-neutral at ${BYTES_AT_SHIP} so ` +
      `agt-253's and ses-413d's pins hold without being re-pinned`);

    // CONTROLS. Each mutation is the smallest one that should break its own assertion and nothing
    // else -- an assertion that still passed with its subject deleted would be decoration.
    const noCall = md.split(CALL).join("public.SOMETHING_ELSE(");
    assert.ok(!step5Span(noCall).includes(CALL),
      "control: renaming the call out of the runbook must break the span assertion");

    // THE SPAN CONTROL, which is the whole point of reading a span rather than the file: the same
    // call appended OUTSIDE step 5 must still fail, though a file-wide includes() would pass.
    const moved = noCall + "\n```sql\nSELECT * FROM " + CALL + "'x');\n```\n";
    assert.ok(moved.includes(CALL),
      "control: the moved call IS in the file -- which is exactly what makes the next line meaningful");
    assert.ok(!step5Span(moved).includes(CALL),
      "control: a call outside step 5's span must NOT satisfy the span assertion");

    assert.ok(step5Span(md + "\n" + HAND_TYPED).includes(CALL) &&
      (md + "\n" + HAND_TYPED).includes(HAND_TYPED),
      "control: re-adding the hand-typed UPDATE must be visible to its own assertion");

    assert.notStrictEqual(Buffer.byteLength(md + "x", "utf8"), BYTES_AT_SHIP,
      "control: one byte added must break the exact-bytes assertion");
  });

  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  const anon = process.env.VITE_SUPABASE_ANON_KEY ?? "";

  if (!url || !key) {
    notRun("AGT-308 arm B (the gate itself)",
      "SUPABASE_URL + SUPABASE_SERVICE_KEY absent -- the card, the needs-desktop write, the skip row, " +
      "both before-images, the pick_exclusions() reason delta and the three refusals are unverified " +
      "here. Credentialed run: STANDARDS.md Section 2 rule 5");
  } else {
    await arm("B one call writes card + state + skip, three refusals, zero residue", async () => {
      // The epic, read exactly as agt-280-requirement-gate.test.mjs reads it: an executing
      // project's epic that AGT-240's lock already lets a row through, ordered by id so the pick is
      // reproducible run to run (pattern:127).
      const epics = await req(url, key,
        "epics?select=id,name,locked_at,projects!inner(slug,status,accepts_findings)" +
        "&projects.status=eq.executing&order=id.asc");
      assert.ok(epics.ok, `the executing-project epics must read; got ${describe(epics)}`);
      const usable = (epics.json ?? []).filter(e => e.locked_at === null || e.projects?.accepts_findings === true);

      // The cycle this card hangs off: runner_items.cycle_id is NOT NULL with an FK to
      // runner_cycles, so the fixture needs a real one. Newest, deterministically.
      const cyc = await req(url, key, "runner_cycles?select=id&order=started_at.desc&limit=1");
      assert.ok(cyc.ok, `a runner_cycles id must read; got ${describe(cyc)}`);

      if (!usable.length || !(cyc.json ?? []).length) {
        notRun("AGT-308 arm B",
          `the live fixtures this gate is measured against are not both present right now ` +
          `(executing epics past the AGT-240 lock: ${usable.length}, runner_cycles rows: ` +
          `${(cyc.json ?? []).length}) -- asserting against a substitute would measure something else`);
        return;
      }
      const EPIC = usable[0].id;
      const CYCLE = cyc.json[0].id;
      const ID = FIXTURE_ID;

      const tally = async () => ({
        items: await count(url, key, "runner_items?select=id"),
        skips: await count(url, key, "runner_skips?select=id"),
        images: await count(url, key, "runner_before_images?select=id"),
        tickets: await count(url, key, "backlog_items?select=id"),
      });
      const before = await tally();

      const exclusionsFor = async id => {
        const r = await req(url, key, `rpc/pick_exclusions?backlog_id=eq.${id}&select=backlog_id,reasons`,
          { method: "POST", body: {} });
        assert.ok(r.ok, `pick_exclusions() must read; got ${describe(r)}`);
        return (r.json ?? []).map(x => x.reasons ?? []);
      };
      const inQueue = async id => {
        const q = await req(url, key, "rpc/prime_directive_queue", { method: "POST", body: {} });
        assert.ok(q.ok, `prime_directive_queue() must read; got ${describe(q)}`);
        return { present: (q.json ?? []).some(r => r.ref === id), size: (q.json ?? []).length };
      };

      let cardId = null;
      try {
        const ins = await req(url, key, "backlog_items",
          { method: "POST", prefer: "return=representation", body: ticket(1, EPIC) });
        assert.ok(ins.ok, `the fixture ticket must insert; got ${describe(ins)}`);
        const row = Array.isArray(ins.json) ? ins.json[0] : ins.json;
        assert.equal(row.design_status, null, "the fixture starts with design_status NULL -- ungated");

        // Its own queue slot, so "out of the queue after" is not satisfied by `no queue number`.
        // A sentinel in the fixture band, which sorts last and so cannot displace a real ticket.
        const slot = 999900001;
        const pat = await req(url, key, `backlog_items?backlog_id=eq.${ID}`,
          { method: "PATCH", prefer: "return=representation", body: { queue: slot } });
        assert.ok(pat.ok, `the fixture's queue slot must set; got ${describe(pat)}`);

        // BEFORE. Neither gate sentence may be present yet -- that is what makes the delta below
        // mean the call wrote them, rather than the row having carried them all along.
        const reasonsBefore = (await exclusionsFor(ID))[0] ?? [];
        assert.ok(!reasonsBefore.includes(REASON_FLAG) && !reasonsBefore.includes(REASON_CARD),
          `before the call the fixture must carry NEITHER gate reason; got ${JSON.stringify(reasonsBefore)}`);
        const qBefore = await inQueue(ID);
        const pickableBefore = reasonsBefore.length === 0;
        if (pickableBefore) {
          assert.equal(qBefore.present, true,
            "the fixture has no exclusion reasons at all, so prime_directive_queue() must return it " +
            "BEFORE the gate -- without that, its absence afterwards proves nothing");
        } else {
          notRun("AGT-308 arm B (the queue half)",
            `the fixture carries unrelated exclusion reasons on this board right now ` +
            `(${JSON.stringify(reasonsBefore)}), so it is out of prime_directive_queue() before the ` +
            `call for a reason that has nothing to do with the gate. Its absence afterwards is kept ` +
            `as an assertion but is NOT the discriminator here -- the reason delta below is ` +
            `(pattern:77: named, not silently passed)`);
        }

        // ---- THE ONE CALL ----------------------------------------------------------------------
        const res = await req(url, key, "rpc/gate_before_build", { method: "POST", body: {
          p_cycle_id: CYCLE, p_backlog_id: ID,
          p_plain_cant: "You cannot see that a ticket is waiting on you until someone files the card by hand.",
          p_plain_after: "The moment a cycle classifies a ticket gated, the card, the flag and the skip row all exist.",
          p_plain_worth: "No ticket can be picked twice while it is waiting on you.",
          p_reason: "Gated for the AGT-308 regression probe; deleted by the same test run.",
        } });
        assert.ok(res.ok, `gate_before_build must succeed on the fixture; got ${describe(res)}`);
        cardId = res.json?.card_id;
        assert.ok(cardId, `the call must return card_id; got ${JSON.stringify(res.json)}`);
        assert.equal(res.json.design_status, "needs-desktop", "and it must report the flag it wrote");
        assert.ok(res.json.skip_id, "and the skip row's id, so the caller can point John at it");

        // (1) THE CARD -- exactly one, and UNDECIDED. A decided card excludes nothing.
        const cards = await req(url, key,
          `runner_items?backlog_id=eq.${ID}&kind=eq.gated_before_build&select=id,title,decision,plain_cant`);
        assert.ok(cards.ok, describe(cards));
        assert.equal(cards.json.length, 1, `exactly ONE gated_before_build card; got ${cards.json.length}`);
        assert.equal(cards.json[0].id, cardId, "and it is the card the call returned");
        assert.equal(cards.json[0].decision, null,
          "the card must stay UNDECIDED -- a decided card is answered, and pick_exclusions() stops " +
          "excluding the ticket");
        assert.equal(cards.json[0].title, `${ID} — waits on a session you attend`,
          "D1: the title says where the work WAITS, never that John owes an approval (34865f07)");

        // (2) THE STATE -- needs-desktop, the only value this call may write (SES-315).
        const after1 = await req(url, key, `backlog_items?backlog_id=eq.${ID}&select=id,design_status,queue`);
        assert.ok(after1.ok, describe(after1));
        assert.equal(after1.json[0].design_status, "needs-desktop",
          "the SAME call must have written the flag -- a card without it is the AGT-308 bug");
        assert.equal(after1.json[0].queue, slot,
          "D3: no recompute_backlog_queue() in the call, so the ticket keeps the queue slot it had");

        // (3) THE SKIP ROW -- pointing at THAT card, so John's briefing has a button.
        const skips = await req(url, key,
          `runner_skips?backlog_id=eq.${ID}&select=id,reason_kind,unblock_kind,unblock_ref,resolved_at`);
        assert.ok(skips.ok, describe(skips));
        assert.equal(skips.json.length, 1, `exactly ONE runner_skips row; got ${skips.json.length}`);
        assert.equal(skips.json[0].reason_kind, "gated", "recorded as a `gated` skip");
        assert.equal(skips.json[0].unblock_kind, "card", "unblocked by a card, not a question or a prep");
        assert.equal(skips.json[0].unblock_ref, cardId,
          "and the ref is THIS card's id -- a skip row pointing elsewhere is a skip John cannot act on");

        // (4) BOTH BEFORE-IMAGES, by SHAPE (§19v, SES-150).
        const imgTicket = await req(url, key,
          `runner_before_images?table_name=eq.backlog_items&pk_value=eq.${row.id}&cycle_id=eq.${CYCLE}` +
          `&select=row_data&order=created_at.desc&limit=1`);
        assert.ok(imgTicket.ok, describe(imgTicket));
        assert.equal(imgTicket.json.length, 1, "the ticket's UPDATE must have left exactly one image");
        assert.equal(imgTicket.json[0].row_data?.design_status, null,
          "the ticket's image must carry the PRIOR row -- design_status NULL, the state before the " +
          "gate. An image taken after the write would restore the flag it was meant to undo");
        const imgCard = await req(url, key,
          `runner_before_images?table_name=eq.runner_items&pk_value=eq.${cardId}&select=row_data`);
        assert.ok(imgCard.ok, describe(imgCard));
        assert.equal(imgCard.json.length, 1, "the card's INSERT must have left exactly one image");
        assert.equal(imgCard.json[0].row_data, null,
          "the card's image is row_data NULL -- there was no prior row, and reverse_decision() reads " +
          "NULL as `delete this row again` (SES-150)");

        // (5) THE REASON DELTA -- BOTH sentences, which is what makes this one act and not two.
        const reasonsAfter = (await exclusionsFor(ID))[0] ?? [];
        assert.ok(reasonsAfter.includes(REASON_FLAG),
          `pick_exclusions() must now give the FLAG sentence ${JSON.stringify(REASON_FLAG)}; got ` +
          `${JSON.stringify(reasonsAfter)}`);
        assert.ok(reasonsAfter.includes(REASON_CARD),
          `and the CARD sentence ${JSON.stringify(REASON_CARD)} -- one without the other is exactly ` +
          `the half-applied gate this ticket exists to make impossible; got ${JSON.stringify(reasonsAfter)}`);
        const qAfter = await inQueue(ID);
        assert.ok(qAfter.size >= 1,
          "prime_directive_queue() returned nothing at all, so `absent` below means nothing -- the gate " +
          "cannot be graded against an empty queue");
        assert.equal(qAfter.present, false,
          "and the gated ticket must be OUT of prime_directive_queue() -- the 37-minute window AGT-308 " +
          "closes is exactly a gated ticket still sitting in it");

        // ---- THE THREE REFUSALS, each by ITS OWN sentence ---------------------------------------
        const second = await req(url, key, "rpc/gate_before_build", { method: "POST", body: {
          p_cycle_id: CYCLE, p_backlog_id: ID, p_plain_cant: "a", p_plain_after: "b",
          p_plain_worth: "c", p_reason: "d",
        } });
        assert.equal(second.status, 400, describe(second));
        assert.match(String(second.json?.message ?? ""),
          /already carries an undecided gated_before_build card/,
          `a second call must be refused BY THE UNDECIDED-CARD branch, not merely 400; got ${describe(second)}`);

        const designOnly = await req(url, key, "rpc/gate_before_build", { method: "POST", body: {
          p_cycle_id: CYCLE, p_backlog_id: DESIGN_ONLY_TICKET, p_plain_cant: "a", p_plain_after: "b",
          p_plain_worth: "c", p_reason: "d",
        } });
        assert.equal(designOnly.status, 400, describe(designOnly));
        assert.match(String(designOnly.json?.message ?? ""),
          /is on a design-only project .*public\.design_only_stop\(\)/,
          `${DESIGN_ONLY_TICKET} must fall through to the DESIGN-ONLY branch and be sent to ` +
          `design_only_stop(); got ${describe(designOnly)}`);

        if (anon) {
          const a = await req(url, anon, "rpc/gate_before_build", { method: "POST", body: {
            p_cycle_id: CYCLE, p_backlog_id: ID, p_plain_cant: "a", p_plain_after: "b",
            p_plain_worth: "c", p_reason: "d",
          } });
          assert.notEqual(a.code, "PGRST202",
            `PGRST202 means gate_before_build is MISSING, never a pass; got ${describe(a)}`);
          assert.ok(!a.ok && /42501|permission denied/.test(a.text),
            `the anon key must be denied gate_before_build -- it writes the card, the flag and the ` +
            `skip row; got ${describe(a)}`);
        } else {
          notRun("AGT-308 arm B (the anon half)",
            "VITE_SUPABASE_ANON_KEY absent -- the anon denial on gate_before_build is unverified here. " +
            "Asserted instead in migration agt308_gate_before_build's own trailing DO block, over " +
            "pg_proc BY OID (has_function_privilege('anon'|'authenticated', oid, 'execute') false) in " +
            "the SAME transaction that created the function");
        }
      } finally {
        // CLEANUP, children first. record_skip() files its own image under
        // `<backlog_id>/<reason_kind>`, so that pk_value is deleted by name too.
        await req(url, key, `runner_skips?backlog_id=eq.${ID}`, { method: "DELETE" });
        for (const pk of [cardId, `${ID}/gated`].filter(Boolean)) {
          await req(url, key, `runner_before_images?pk_value=eq.${pk}`, { method: "DELETE" });
        }
        const mine = await req(url, key, `backlog_items?backlog_id=eq.${ID}&select=id`);
        for (const r of mine.json ?? []) {
          await req(url, key, `runner_before_images?pk_value=eq.${r.id}`, { method: "DELETE" });
        }
        await req(url, key, `runner_items?backlog_id=eq.${ID}`, { method: "DELETE" });
        await req(url, key, `backlog_items?backlog_id=eq.${ID}`, { method: "DELETE" });
      }

      const after = await tally();
      assert.deepEqual(after, before,
        "ZERO RESIDUE: runner_items, runner_skips, runner_before_images and backlog_items must each " +
        "re-read their exact prior count -- a test that leaves a card behind gates a real ticket");
      console.log(`    [AGT-308 arm B] epic ${usable[0].name} (${EPIC}), cycle ${CYCLE}; counts ` +
        `${JSON.stringify(before)} before and after`);
    });
  }

  notRun("AGT-308 the pg_proc facts for public.gate_before_build",
    "that EXACTLY ONE overload of public.gate_before_build exists and that neither anon nor " +
    "authenticated holds EXECUTE on it cannot be read over PostgREST -- pg_proc is not reachable " +
    "(SES-310's refusal, unchanged). Asserted instead in migration agt308_gate_before_build's own " +
    "trailing DO block, in the SAME transaction that created the function, and re-read independently " +
    "after it. MEASURED AT THIS SHIP (2026-10-03, v7.0.746): overloads 0 before the migration and 1 " +
    "after, identity (p_cycle_id uuid, p_backlog_id text, p_plain_cant text, p_plain_after text, " +
    "p_plain_worth text, p_reason text) -- no second overload, so no call can become ambiguous " +
    "(.claude/rules/supabase-function-signature.md); has_function_privilege('anon', oid, 'execute') " +
    "false and service_role true. The down was captured FIRST, before the apply, under up_name " +
    "agt308_gate_before_build: auto-downable, 1 object captured, 0 refusals.");

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n      ${failures.join("\n      ")}`);

  console.log(`[AGT-308] gate_before_build: step 5's span names the one call and keeps the ` +
    `${WORDING_RULE} wording rule, the hand-typed UPDATE is gone, ${CYCLE_REL} holds at ` +
    `${Buffer.byteLength(read(CYCLE_REL), "utf8")}B`);
}

selfRun(import.meta.url, run);
export default run;
