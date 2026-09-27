// DeepBench v7.0.663 | tests/regression/agt-167b-resettle-on-gate-ruling.test.mjs | AGT-167 --
// THE CLOSE-OUT IS RE-SETTLED WHEN ITS CARD IS RULED, AND THIS FILE IS WHAT PROVES THE RULING
// MOVES THE STATUS.
//
// THE DEFECT, measured on the live board this cycle rather than recalled. One script, one kickoff,
// one ticket, one cycle, 23 minutes apart, opposite answers, and the only input that moved was the
// card census: `runner_decisions 0555f4f6` settled `AGT-167` `delivered` at 12:08:05Z on the stated
// ground that no card was open; `runner_items e221020c` was filed against that same ticket at
// 12:11:04Z by that same cycle; the same script re-run by hand at 12:31:39Z (`1d6a2bb4`) settled it
// `partial`. For 23 minutes a ticket with unbuilt work read `delivered` and was out of the pick path
// (`scripts/ticket-owner.js:227` reads `["open","partial"]`).
//
// AND NOTHING RE-SETTLED IT WHEN THE CARD WAS ANSWERED. `public.apply_gate_rulings()` section 3b,
// read live at this ship: a `rework` ruling writes `scope_rationale` and `design_status = NULL`, a
// `needs-desktop` ruling writes `design_status`, and NEITHER touches `status` -- only `retired`
// moves a status, and it moves it to `removal proposed`. Card `e221020c` was stamped `rework` at
// 13:00:24Z; `updated_at` moved and `status` did not. Part (B2) below is that exact assertion, and
// it is the arm that states TODAY'S BUG rather than this ship's fix: it must stay green forever,
// because the function is not what changed.
//
// WHAT EACH ARM CAN ACTUALLY GO RED ON:
//
// (A) THE FLAG SURFACE AND THE ONE-DIRECTION GUARD, offline and by value. On `origin/dev`
//     `ALLOWED_FLAGS` does not carry `resettle`, so the live command in (B3) exits non-zero with
//     `unknown flag --resettle` and can never print `delivered → partial`. That is the file-level
//     mutation control: the whole live half is unreachable on the unchanged tree.
// (B) THE SIX QA STEPS, DRIVEN END TO END against the live database with two throwaway fixtures --
//     the ticket, the card, the real `apply_gate_rulings()` call, the real CLI in a child process,
//     and the real `backlog_items` row read back. Nothing here is source-parsed.
// (C2) THE SEAM ITSELF, DRIVEN. Everything above proves `--resettle` works when somebody runs it.
//     Part (C2) runs `scripts/decide-gated-card.js --apply` in a child process over a third fixture
//     and reads the line IT printed -- `re-settle <ticket>: delivered → partial (card <id> ruled
//     rework)` -- then reads the row back. That is the actual ship: the ruling re-settling its own
//     ticket with nobody watching. Labelled a SEAM PROOF: it drives the real CLI, the real
//     `apply_gate_rulings()` and the real `backlog_items` row, and stubs nothing.
//
// (C) BOTH DIRECTIONS, which is the discriminator rather than a nicety. A file that only asserted
//     "a reworked card re-settles the ticket" would pass against an implementation that re-settled
//     on EVERY ruling -- so fixture two is ruled `accept`, and its row must still read `delivered`
//     with nothing written. And QA5 re-runs the same command against the row it just moved: a
//     second decision or a second before-image there means the one-direction guard is not real.
//
// THE FIXTURES CANNOT POISON A PEER'S BOARD, which matters because 5-7 cycles run this suite at
// once. Each id is minted per run and doubles as `row_ordinal` (`backlog_items.row_ordinal` is
// unique), the ids are asserted absent BEFORE anything is written, and the `finally` deletes
// `runner_before_images`, `runner_decisions`, `runner_items` and `backlog_items` in that order --
// images before decisions, because `runner_before_images_decision_id_fkey` does not cascade.
//
// THE ID SHAPE IS NOT THE KICKOFF'S. Section 6 asks for `AGT-167Q-<8 hex>`; `runner_items` carries
// CHECK `ck_runner_items_backlog_id_bare` (`backlog_id ~ '^[A-Z]+-[0-9]+[a-z]?$'`), read live, which
// refuses that string on the CARD -- measured: HTTP 400 / 23514 on the insert. The nonce is
// therefore digits, `ZRST-167<5 digits>`, which keeps SES-382's per-run uniqueness and the ticket's
// number legible while satisfying the constraint.
//
// NO MODEL CALL, NO SPEND. REST reads, two insert pairs, one RPC per fixture, three child-process
// CLI runs, and the deletes.

import assert from "assert";
import fs from "fs";
import path from "path";
import os from "os";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  ALLOWED_FLAGS, RESETTLE_FROM, canResettle, decideStatus, applySettle, resettleTicket,
} from "../../scripts/settle-ship.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
// The kickoff section 6 names this document by name: it produced the real 12:08 `delivered` because
// its own text names no remainder. If it ever did, (B3) would read `partial` for the wrong reason.
const FIXTURE_KICKOFF = "docs/kickoffs/v7.0.642-AGT-167-noship-cap-binds.md";
const SOURCE_FILE = "tests/regression/agt-167b-resettle-on-gate-ruling.test.mjs";

function nonce() {
  const n = String(Math.floor(Math.random() * 90000) + 10000);
  return { id: `ZRST-167${n}`, ordinal: Number(`167${n}`) };
}

async function rest(url, key, pathAndQuery, init) {
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: {
      apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${pathAndQuery} returned HTTP ${res.status} ${res.statusText}: ${text}`);
  return text.trim() === "" ? [] : JSON.parse(text);
}

// The CLI, in a child process, exactly as a human or the runbook would type it. `status` is
// captured rather than thrown on, because an arm that needs a non-zero exit must be able to read it.
function cli(args) {
  try {
    const stdout = execFileSync(process.execPath, ["scripts/settle-ship.js", ...args], {
      cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, stdout, stderr: "" };
  } catch (e) {
    return { code: e.status ?? 1, stdout: String(e.stdout ?? ""), stderr: String(e.stderr ?? "") };
  }
}

// ---- (A) the flag surface, the one-direction guard and trigger 5, offline --------------------
function partA() {
  assert.ok(ALLOWED_FLAGS.has("resettle"),
    "scripts/settle-ship.js must accept --resettle. On origin/dev it did not, which is why the live " +
    "half of this file is unreachable there: the command exits non-zero with `unknown flag --resettle`");
  for (const f of ["ticket", "kickoff", "cycle-id", "remainder", "apply"]) {
    assert.ok(ALLOWED_FLAGS.has(f), `--${f} must survive this ship — the close-out door is unchanged`);
  }

  // THE ONE DIRECTION, by value. `delivered` in, nothing else.
  assert.strictEqual(RESETTLE_FROM, "delivered");
  assert.strictEqual(canResettle({ status: "delivered" }), true);
  for (const s of ["partial", "open", "done", "removed", "removal proposed", "", null, undefined]) {
    assert.strictEqual(canResettle({ status: s }), false,
      `a row reading ${JSON.stringify(s)} must NOT be re-settled — \`partial\` is already the safe ` +
      "side and the rest are not this script's to move");
  }
  assert.strictEqual(canResettle(null), false, "no row is not a `delivered` row");

  // TRIGGER 5, one variable at a time off a base that settles `delivered`.
  const SETTLED = "# k\n\nslice 2 of 2\n\n## 7. STOP LINE\n\nship it and close the row.\n";
  assert.strictEqual(decideStatus({ kickoffText: SETTLED }).status, "delivered",
    "the base fixture must settle `delivered`, or the flip below is vacuous");
  const flipped = decideStatus({ kickoffText: SETTLED, gateReworked: true });
  assert.strictEqual(flipped.status, "partial",
    "a card ruled `rework` alone must flip the base fixture to `partial` — trigger 5 is the whole ship");
  assert.ok(flipped.reasons.some(r => /ruled `rework`/.test(r)),
    `the reason must name the ruling; got ${JSON.stringify(flipped.reasons)}`);

  // THE DEFAULT IS `false`, AND THAT IS WHAT KEEPS THE TWO EXISTING CALLERS BYTE-IDENTICAL. An
  // implementation that defaulted it true would settle every finished ship `partial`.
  assert.deepStrictEqual(decideStatus({ kickoffText: SETTLED, gateReworked: false }),
    decideStatus({ kickoffText: SETTLED }),
    "omitting `gateReworked` must answer exactly as passing it false — `main()` and ticket-owner.js " +
    "check 12 do not pass it, and neither verdict may move on this ship");
  // A card that is OPEN and a card that is REWORKED are different triggers, and both must be able
  // to fire alone: trigger 3 stops firing the instant the card is stamped, which is the gap.
  assert.strictEqual(decideStatus({ kickoffText: SETTLED, gatedOpen: true }).reasons.length, 1);
  assert.strictEqual(decideStatus({ kickoffText: SETTLED, gatedOpen: true, gateReworked: true }).reasons.length, 2,
    "an open card and a reworked card are two reasons, not one spelling of one");

  assert.strictEqual(typeof applySettle, "function",
    "applySettle must be exported — it is the ONE home for the backlog_items.status write, and " +
    "`main()` and resettleTicket() both call it rather than keeping a copy each");
  assert.strictEqual(typeof resettleTicket, "function", "resettleTicket must be exported");
  console.log("  (A) --resettle in ALLOWED_FLAGS, one-direction guard over 9 statuses, trigger 5 + its false default -- PASS");
}

// ---- (B) the six QA steps, live ---------------------------------------------------------------
async function partB(url, key) {
  const cycles = await rest(url, key, "runner_cycles?select=id&order=started_at.desc&limit=1");
  assert.equal(cycles.length, 1, "runner_cycles is empty -- runner_items.cycle_id is NOT NULL and FK");
  const cycleId = cycles[0].id;

  const A = nonce();
  const B = nonce();
  assert.notEqual(A.id, B.id, "the two fixtures must not collide");
  for (const f of [A, B]) {
    assert.deepEqual(await rest(url, key, `backlog_items?backlog_id=eq.${f.id}&select=backlog_id`), [],
      `fixture ticket ${f.id} must not already exist on the board`);
  }

  const C = nonce();
  assert.ok(new Set([A.id, B.id, C.id]).size === 3, "the three fixtures must not collide");
  assert.deepEqual(await rest(url, key, `backlog_items?backlog_id=eq.${C.id}&select=backlog_id`), [],
    `fixture ticket ${C.id} must not already exist on the board`);

  const decisionIds = new Set();
  const cardIds = [];
  const rowIds = [];
  const tmp = [];
  let line3 = "", line4 = "", line5 = "", line6 = "", lineSeam = "";

  try {
    // -- QA1: three `delivered` fixtures, each linking a kickoff whose own text names no remainder.
    for (const f of [A, B, C]) {
      const created = await rest(url, key, "backlog_items", {
        method: "POST", headers: { Prefer: "return=representation" },
        body: JSON.stringify([{
          backlog_id: f.id, tier: "later", status: "delivered",
          title: "AGT-167 regression fixture — re-settle after the ruling",
          source_file: SOURCE_FILE, row_ordinal: f.ordinal, filed_at: "2026-09-27T00:00:00Z",
          scope_rationale: "AGT-167 regression fixture; deleted in the same run.",
          kickoff_link: FIXTURE_KICKOFF, design_status: null,
        }]),
      });
      assert.equal(created.length, 1, `${f.id} was not created`);
      assert.equal(created[0].status, "delivered", `${f.id} must start \`delivered\` — the whole ship is the move OFF it`);
      f.rowId = created[0].id;
      rowIds.push(created[0].id);
    }
    // The document really does settle `delivered` on its own words; otherwise QA3 would be right
    // for the wrong reason.
    assert.strictEqual(
      decideStatus({ kickoffText: fs.readFileSync(path.join(ROOT, FIXTURE_KICKOFF), "utf8"), ticketId: A.id }).status,
      "delivered",
      `${FIXTURE_KICKOFF} must name no remainder of its own — it is what produced the real 12:08 \`delivered\``);

    // -- QA2: an undecided card on each, then the REAL function rules one `rework` and one `accept`.
    for (const [f, ruling] of [[A, "rework"], [B, "accept"]]) {
      const card = await rest(url, key, "runner_items", {
        method: "POST", headers: { Prefer: "return=representation" },
        body: JSON.stringify([{
          cycle_id: cycleId, kind: "gated_before_build", decision: null, backlog_id: f.id,
          title: `AGT-167 regression fixture card (${ruling}) — deleted in finally`,
        }]),
      });
      assert.equal(card.length, 1, `${f.id}: the fixture card was not created`);
      assert.equal(card[0].decision, null, "the fixture card must be UNDECIDED -- a decided one proves nothing");
      f.cardId = card[0].id;
      cardIds.push(card[0].id);

      const ruled = await rest(url, key, "rpc/apply_gate_rulings", {
        method: "POST",
        body: JSON.stringify({
          p_rulings: [{ card_id: f.cardId, ruling, reason: "AGT-167 QA" }],
          p_cycle_id: cycleId, p_session_name: null,
        }),
      });
      assert.ok(ruled && ruled.decision_id, `${f.id}: apply_gate_rulings returned no decision_id`);
      decisionIds.add(ruled.decision_id);

      const after = await rest(url, key, `runner_items?id=eq.${f.cardId}&select=decision,decided_at`);
      assert.equal(after[0].decision, ruling === "accept" ? "accept" : "rework",
        `${f.id}: the card must carry the stamp the ruling lands (k_stamp maps needs-desktop onto rework)`);
      assert.ok(after[0].decided_at, `${f.id}: a ruled card must carry decided_at — that is why trigger 3 stops firing`);

      // (B2) TODAY'S BUG, asserted rather than described: the ruling moved the card and NOT the
      // status. This arm is about apply_gate_rulings(), which this ship does not change, so it must
      // stay green forever -- it is the reason the re-settle has to exist at all.
      const t = await rest(url, key, `backlog_items?backlog_id=eq.${f.id}&select=status,design_status,kickoff_link,updated_at`);
      assert.equal(t[0].status, "delivered",
        `(B2) ${f.id}: apply_gate_rulings() section 3b writes scope_rationale/design_status and NEVER ` +
        "status — a `partial` here means the function changed and this ticket's premise is gone");
    }

    // -- QA3: the plan, no --apply. Writes nothing, and says WHY it is `partial`.
    const dry = cli(["--resettle", `--ticket=${A.id}`, `--cycle-id=${cycleId}`]);
    assert.equal(dry.code, 0, `(QA3) the dry run must exit 0; got ${dry.code}: ${dry.stderr.slice(0, 400)}`);
    line3 = (dry.stdout.split("\n").find(l => l.includes("→")) ?? "").trim();
    assert.ok(/delivered → partial/.test(dry.stdout),
      `(QA3) the plan must read \`delivered → partial\`. On origin/dev this command exits non-zero ` +
      `with \`unknown flag --resettle\` and can never print it. Got:\n${dry.stdout}${dry.stderr}`);
    assert.ok(/card ruled rework: yes/.test(dry.stdout),
      `(QA3) the plan must say the card was ruled \`rework\` — that is the ONLY trigger firing here ` +
      `(the card is decided, so trigger 3 is silent). Got:\n${dry.stdout}`);
    assert.ok(/open gated_before_build card: no/.test(dry.stdout),
      `(QA3) trigger 3 must read NO — a \`yes\` means the census kept the decided_at filter and this ` +
      `arm is passing for the old reason. Got:\n${dry.stdout}`);
    const untouched = await rest(url, key, `backlog_items?backlog_id=eq.${A.id}&select=status`);
    assert.equal(untouched[0].status, "delivered", "(QA3) a plan without --apply must write nothing");
    assert.deepEqual(await rest(url, key, `runner_decisions?backlog_id=eq.${A.id}&select=id`), [],
      "(QA3) a plan without --apply must record no decision");

    // -- QA4: the same command WITH --apply.
    const applied = cli(["--resettle", `--ticket=${A.id}`, `--cycle-id=${cycleId}`, "--apply"]);
    assert.equal(applied.code, 0, `(QA4) --apply must exit 0; got ${applied.code}: ${applied.stderr.slice(0, 400)}`);
    line4 = (applied.stdout.split("\n").find(l => l.includes("→")) ?? "").trim();
    const row4 = await rest(url, key, `backlog_items?backlog_id=eq.${A.id}&select=status,design_status,kickoff_link`);
    assert.equal(row4[0].status, "partial", `(QA4) ${A.id} must read \`partial\` after the apply`);
    assert.equal(row4[0].kickoff_link, FIXTURE_KICKOFF,
      "(QA4) the link is written back UNCHANGED — the re-settle reads the row's own kickoff, so it " +
      "cannot silently re-point a ticket at a different document");
    assert.strictEqual(row4[0].design_status, null, "(QA4) the three cells include the cleared flag");

    const decs4 = await rest(url, key, `runner_decisions?backlog_id=eq.${A.id}&select=id,kind,summary`);
    assert.equal(decs4.length, 1, `(QA4) exactly ONE new decision, got ${decs4.length}`);
    assert.equal(decs4[0].kind, "ticket-status", "(QA4) the decision is a `ticket-status`, the same kind the close-out writes");
    decisionIds.add(decs4[0].id);
    const imgs4 = await rest(url, key, `runner_before_images?decision_id=eq.${decs4[0].id}&select=id,table_name,pk_value,row_data`);
    assert.equal(imgs4.length, 1, `(QA4) exactly ONE before-image under that decision, got ${imgs4.length}`);
    assert.equal(imgs4[0].table_name, "backlog_items");
    assert.equal(imgs4[0].pk_value, A.rowId, "(QA4) the image must NAME the row it imaged");
    assert.equal(imgs4[0].row_data?.status, "delivered",
      "(QA4) the image must hold the PRIOR value — an image taken after the PATCH restores nothing");

    // -- QA5: re-run. The one-direction guard, live.
    const again = cli(["--resettle", `--ticket=${A.id}`, `--cycle-id=${cycleId}`, "--apply"]);
    assert.equal(again.code, 0, `(QA5) a re-run must exit 0; got ${again.code}: ${again.stderr.slice(0, 400)}`);
    line5 = (again.stdout.split("\n").find(l => /no change/.test(l)) ?? "").trim();
    assert.ok(/no change/.test(again.stdout),
      `(QA5) a row already reading \`partial\` must print \`no change\`. Got:\n${again.stdout}`);
    assert.ok(!/partial → delivered/.test(again.stdout),
      "(QA5) nothing may ever propose `partial → delivered` — that direction needs a done-predicate this ticket parked");
    const decs5 = await rest(url, key, `runner_decisions?backlog_id=eq.${A.id}&select=id`);
    assert.equal(decs5.length, 1, `(QA5) no SECOND decision, got ${decs5.length}`);
    const imgs5 = await rest(url, key, `runner_before_images?decision_id=eq.${decs4[0].id}&select=id`);
    assert.equal(imgs5.length, 1, `(QA5) no SECOND before-image, got ${imgs5.length}`);

    // -- QA6: the other direction. A card ruled `accept` moves nothing.
    const acc = cli(["--resettle", `--ticket=${B.id}`, `--cycle-id=${cycleId}`, "--apply"]);
    assert.equal(acc.code, 0, `(QA6) must exit 0; got ${acc.code}: ${acc.stderr.slice(0, 400)}`);
    line6 = (acc.stdout.split("\n").find(l => /no change/.test(l)) ?? "").trim();
    const row6 = await rest(url, key, `backlog_items?backlog_id=eq.${B.id}&select=status`);
    assert.equal(row6[0].status, "delivered",
      "(QA6) an `accept` ruling leaves the ship standing — a `partial` here means the re-settle fires " +
      "on every ruling, which would push finished work back into the pick path");
    assert.deepEqual(await rest(url, key, `runner_decisions?backlog_id=eq.${B.id}&select=id`), [],
      "(QA6) nothing written means no decision either");
    assert.ok(/no change/.test(acc.stdout), `(QA6) the command must say \`no change\`. Got:\n${acc.stdout}`);

    // -- (C2) THE SEAM, driven: the Dev Manager's own ruling run re-settles the ticket it ruled.
    const cardC = await rest(url, key, "runner_items", {
      method: "POST", headers: { Prefer: "return=representation" },
      body: JSON.stringify([{
        cycle_id: cycleId, kind: "gated_before_build", decision: null, backlog_id: C.id,
        title: "AGT-167 regression fixture card (seam) — deleted in finally",
      }]),
    });
    C.cardId = cardC[0].id;
    cardIds.push(C.cardId);

    const stamp = `${process.pid}-${C.ordinal}`;
    const ctxPath = path.join(os.tmpdir(), `agt167b-context-${stamp}.json`);
    const ansPath = path.join(os.tmpdir(), `agt167b-answer-${stamp}.json`);
    tmp.push(ctxPath, ansPath);
    // The context carries ONLY this fixture card, so validateRulings()'s coverage clause is satisfied
    // by an answer that rules only it — the live board's other cards are not this test's to rule.
    fs.writeFileSync(ctxPath, JSON.stringify({ cards: [{ card_id: C.cardId, backlog_id: C.id, title: "seam" }] }), "utf8");
    fs.writeFileSync(ansPath, JSON.stringify({
      rulings: [{ card_id: C.cardId, ruling: "rework", reason: "AGT-167 QA seam proof" }],
      patterns_applied: [8, 14],
    }), "utf8");

    let seam;
    try {
      seam = {
        code: 0,
        stdout: execFileSync(process.execPath, [
          "scripts/decide-gated-card.js", `--apply=${ansPath}`, `--context=${ctxPath}`, `--cycle-id=${cycleId}`,
        ], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }),
      };
    } catch (e) {
      seam = { code: e.status ?? 1, stdout: String(e.stdout ?? ""), stderr: String(e.stderr ?? "") };
    }
    assert.equal(seam.code, 0,
      `(C2) the ruling run must exit 0 — a re-settle never fails the ruling. Got ${seam.code}: ${(seam.stderr ?? "").slice(0, 500)}`);
    for (const m of seam.stdout.matchAll(/Decision ([0-9a-f-]{36})/g)) decisionIds.add(m[1]);
    lineSeam = (seam.stdout.split("\n").find(l => l.startsWith("re-settle ")) ?? "").trim();
    assert.ok(new RegExp(`^re-settle ${C.id}: delivered → partial \\(card ${C.cardId} ruled rework\\)$`).test(lineSeam),
      `(C2) decide-gated-card.js must print ONE line naming the ticket, the move and the card that caused ` +
      `it. Got ${JSON.stringify(lineSeam)} out of:\n${seam.stdout}`);
    assert.ok(!/RE-SETTLE FAILED/.test(seam.stdout), `(C2) the re-settle must not have failed:\n${seam.stdout}`);

    const rowC = await rest(url, key, `backlog_items?backlog_id=eq.${C.id}&select=status,kickoff_link,design_status`);
    assert.equal(rowC[0].status, "partial",
      "(C2) the ruling itself must now leave the ticket `partial` — this is the whole ship, and on " +
      "origin/dev it read `delivered` here");
    assert.equal(rowC[0].kickoff_link, FIXTURE_KICKOFF, "(C2) the link is written back unchanged");
    const decsC = await rest(url, key, `runner_decisions?backlog_id=eq.${C.id}&select=id,kind`);
    assert.equal(decsC.length, 1, `(C2) exactly one ticket-status decision, got ${decsC.length}`);
    assert.equal(decsC[0].kind, "ticket-status",
      "(C2) the status write is still settle-ship.js's own `ticket-status` decision — decide-gated-card " +
      "delegates rather than keeping a second copy of the write");
    decisionIds.add(decsC[0].id);

    console.log(`  (C2) SEAM PROOF (real CLI, real apply_gate_rulings, real row): ${JSON.stringify(lineSeam)}`);
    console.log(`  (B) QA3 ${JSON.stringify(line3)} · QA4 ${JSON.stringify(line4)} · QA5 ${JSON.stringify(line5)} · QA6 ${JSON.stringify(line6)}`);
    console.log(`  (B) decision ${decs4[0].id}, before-image ${imgs4[0].id} on row ${A.rowId}; fixtures ${A.id} (rework) / ${B.id} (accept)`);
  } finally {
    const drop = async (q) => rest(url, key, q, { method: "DELETE", headers: { Prefer: "return=minimal" } })
      .catch(e => console.log(`  [AGT-167b] WARNING: cleanup ${q} failed (${e.message}); remove by hand`));
    // Images before decisions: runner_before_images_decision_id_fkey does not cascade.
    for (const d of decisionIds) await drop(`runner_before_images?decision_id=eq.${d}`);
    for (const d of decisionIds) await drop(`runner_decisions?id=eq.${d}`);
    for (const c of cardIds) await drop(`runner_before_images?pk_value=eq.${c}`);
    for (const c of cardIds) await drop(`runner_items?id=eq.${c}`);
    for (const r of rowIds) await drop(`runner_before_images?pk_value=eq.${r}`);
    for (const f of [A, B, C]) await drop(`backlog_items?backlog_id=eq.${f.id}`);
    for (const t of tmp) { try { fs.unlinkSync(t); } catch { /* already gone */ } }

    const leftTickets = await rest(url, key, `backlog_items?backlog_id=in.(${A.id},${B.id},${C.id})&select=backlog_id`).catch(() => []);
    assert.deepEqual(leftTickets, [], "the fixture tickets must be gone -- a run leaves the board as it found it");
    for (const c of cardIds) {
      assert.deepEqual(await rest(url, key, `runner_items?id=eq.${c}&select=id`).catch(() => []), [],
        `fixture card ${c} must be gone`);
    }
    for (const d of decisionIds) {
      assert.deepEqual(await rest(url, key, `runner_decisions?id=eq.${d}&select=id`).catch(() => []), [],
        `fixture decision ${d} must be gone`);
    }
    console.log(`  (B) teardown: ${rowIds.length} ticket(s), ${cardIds.length} card(s), ${decisionIds.size} decision(s) and their before-images removed`);
  }
}

async function run() {
  partA();

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "AGT-167 (B): the six QA steps -- apply_gate_rulings() leaving `status` alone, and " +
        "`settle-ship.js --resettle` moving it",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent. Both halves are a Postgres function and " +
        "live rows, so there is no source-parsed stand-in. Canonical invocation: docs/STANDARDS.md " +
        "Section 2 rule 5.",
    );
    return;
  }
  await partB(url, key);
}

selfRun(import.meta.url, run);
export default run;
