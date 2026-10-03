// DeepBench v7.0.527 | tests/regression/ses-407-before-image-key.test.mjs | SES-422 slice 2 --
// a backlog_items before-image is keyed by the ROW UUID, and a text key can no longer land.
//
// WHAT IS BEING PINNED. docs/ARCHITECTURE.md §19v: "every Automated-mode write records the prior
// row state first; Reverse restores it exactly. No before-image logged -> the write does not
// happen." reverse_decision() resolves an image by casting pk_value to uuid, so an image keyed by
// the backlog_id TEXT ('SES-407' rather than 'd51d6abc-...') is counted `refused` and restores
// nothing. That is not a loud failure: the reversal reports outcome 'applied' with restored 0, so
// the session's close-out note still reads "reversible until <expires_at>" over a promise nothing
// backs. Measured live this cycle before the change: 425 of 3,255 backlog_items images carried a
// non-uuid key, 422 of them resolvable by their leading ticket token.
//
// THE OBVIOUS TEST IS THE WRONG ONE, and this is the LOO-013 lesson (assert WHICH branch fired):
//   * "no non-uuid keys remain" passes against a build that DELETED the offending rows, which
//     destroys the ledger this ticket exists to make restorable. So the live arm asserts a
//     PROPERTY over whatever remains -- every surviving non-uuid key resolves to NO live
//     backlog_id, i.e. only the genuinely unresolvable keys are left -- never today's count of 3.
//     A count would also redden the moment a later cycle files or removes a ticket, which is noise
//     rather than signal.
//   * "the trigger rejects a bad key" passes just as well against a trigger that rejects
//     EVERYTHING, which would wedge every filing path on the platform. The refusal arm is
//     therefore paired with a positive control below it: a resolvable text key must still be
//     ACCEPTED and rewritten to the row uuid, and a token that does resolve must still come back
//     from the very query the property arm reads 0 rows from. Both directions, per
//     .claude/rules/supabase-column-grants.md's "assert both directions, and never trust the
//     migration's success flag."
//
// THE SOURCE ARM IS THE OTHER HALF, and it is not decoration. The trigger guards the DATABASE, but
// scripts/tripwire-to-backlog.js is one of the two remaining PRODUCERS of a text key, and a
// producer the trigger merely rejects is a filing path that now hard-fails at 2. The pure arm
// pins that both filing loops mint the uuid client-side and hand the SAME id to the ticket insert,
// and it carries the literal pre-change line as a named straw man so the predicate is shown to
// discriminate rather than to return true for everything.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT_REL = "scripts/tripwire-to-backlog.js";

// The two shapes the whole ticket turns on. UUID_RE is applied case-insensitively (`~*` in the
// trigger, `imatch` over PostgREST); TOKEN_RE KEEPS the lowercase suffix on purpose, so 'SES-141a'
// maps to SES-141a and never collapses onto SES-141 -- they are different tickets.
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const TOKEN_RE = /^([A-Z]+-[0-9]+[a-z]?)/;

export function ticketToken(pkValue) {
  const m = TOKEN_RE.exec(String(pkValue ?? ""));
  return m ? m[1] : null;
}

// Pure, and asserted in both directions below. TRUE only when BOTH filing loops mint the id before
// the image write and reuse it as the ticket's id; FALSE while either loop still passes backlogId.
export function filingLoopsMintTheKey(src) {
  const s = String(src);
  // The defect itself, in the exact form it shipped in. One surviving occurrence is a red.
  if (s.includes("insertBeforeImage(base, key, cycleId, backlogId)")) return false;
  const minted = [...s.matchAll(/const rowId = crypto\.randomUUID\(\);/g)];
  const imaged = [...s.matchAll(/insertBeforeImage\(base, key, cycleId, rowId\)/g)];
  const reused = [...s.matchAll(/insertTicket\(base, key, \{ id: rowId, \.\.\./g)];
  if (minted.length < 2 || imaged.length < 2 || reused.length < 2) return false;
  // The mint must come BEFORE the image write in each loop -- an id minted after the image is a
  // different id, which is the same defect wearing a randomUUID() call.
  for (let i = 0; i < 2; i += 1) {
    if (!(minted[i].index < imaged[i].index && imaged[i].index < reused[i].index)) return false;
  }
  return true;
}

// -- 1. The token shape -------------------------------------------------------------------------

function theTokenShapeIsRight() {
  assert.strictEqual(ticketToken("SES-138 (new insert)"), "SES-138",
    "a trailing annotation is not part of the key -- the token is what joins to backlog_id");
  assert.strictEqual(ticketToken("SES-141a"), "SES-141a",
    "the lowercase suffix is KEPT: SES-141a and SES-141 are different tickets, and collapsing " +
    "them would re-key an image onto the wrong row -- silent data damage, not a near miss");
  assert.strictEqual(ticketToken("new-SES-231"), null,
    "the match is ANCHORED: a leading 'new-' means the key names no ticket, and guessing SES-231 " +
    "from it would invent a mapping the filing session never made");
  assert.strictEqual(ticketToken("QA-FIXTURE-QA-SES111"), null,
    "'QA-' is not followed by digits, so this resolves to nothing rather than to QA-1");
  assert.strictEqual(ticketToken("(schema) queue column + recompute_backlog_queue()"), null,
    "a prose key resolves to nothing");
  assert.strictEqual(ticketToken("d51d6abc-09cf-45d1-b8cb-944251c66460"), null,
    "control: a uuid is not a ticket token, so a repaired row can never be re-mapped by token");
}

// -- 2. Both filing loops mint the key ----------------------------------------------------------

function theFilingLoopsMintTheKey() {
  const src = fs.readFileSync(path.join(ROOT, SCRIPT_REL), "utf8");
  assert.ok(filingLoopsMintTheKey(src),
    `${SCRIPT_REL} still hands a backlog_id text key to insertBeforeImage. Every ticket it files ` +
    "gets a before-image reverse_decision() will refuse (SES-407)");

  // THE STRAW MAN, carried literally rather than described. Without this the predicate above could
  // be `return true` and nobody would know (LOO-013).
  const preChange = [
    "    const row = toFile[i];",
    "    const backlogId = parsed.ids[i];",
    "    const img = await insertBeforeImage(base, key, cycleId, backlogId);",
    "    if (img.error) fail(2, `${backlogId}: ${img.error}`);",
    "    const ins = await insertTicket(base, key, buildLedgerTicketDraft(row, backlogId, { now }));",
  ].join("\n");
  assert.strictEqual(filingLoopsMintTheKey(preChange), false,
    "the predicate must REJECT the pre-change line, or it is not discriminating between the two " +
    "builds and its green above means nothing");

  // A half-done build -- one loop converted, the other not -- must also be red. This is the shape
  // a 2-site change actually fails in.
  const halfDone = src.replace(
    "insertBeforeImage(base, key, cycleId, rowId)",
    "insertBeforeImage(base, key, cycleId, backlogId)",
  );
  assert.strictEqual(filingLoopsMintTheKey(halfDone), false,
    "converting ONE filing loop must not read as green -- the unconverted loop still files " +
    "unrestorable images");

  // SES-205:218-219 pins the ORDER of these two writes by their literal text. Re-asserted here so
  // this ticket's edit cannot quietly break the neighbouring guard.
  assert.ok(src.indexOf("const img = await insertBeforeImage") <
            src.indexOf("const ins = await insertTicket"),
    "§19v: the image's success is what authorises the insert, so the image write stays first");
}

// -- 3. Live: the trigger fails closed, and the repair left only unresolvable keys ---------------

function restHeaders(key) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}

async function theDatabaseRefusesATextKeyAndTheLedgerIsRepaired() {
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!url || !key) {
    notRun(
      "the live arms: trg_before_image_key_is_pk refusing an unresolvable text key with a message " +
        "naming SES-407, the positive control that a RESOLVABLE text key is still accepted and " +
        "rewritten to the row uuid, and the property that every surviving non-uuid " +
        "backlog_items key resolves to no live backlog_id",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent. The token-shape and filing-loop arms " +
        "above still graded against the committed tree. Canonical invocation: " +
        "STANDARDS.md Section 2 rule 5.",
    );
    return;
  }

  const tag = `ses407-test-${Math.random().toString(16).slice(2, 10)}`;

  // (a) THE REFUSAL. 'ZZZ-0' is a well-formed token that names no ticket, so the trigger's lookup
  //     must miss and the insert must fail closed.
  const bad = await fetch(`${url}/rest/v1/runner_before_images`, {
    method: "POST",
    headers: restHeaders(key),
    body: JSON.stringify({
      session_name: tag, table_name: "backlog_items", pk_value: "ZZZ-0", row_data: null,
    }),
  });
  const badBody = await bad.text();
  if (bad.ok) {
    // It landed. Clean up the row we just proved should not exist BEFORE failing, so a red here
    // never leaves residue behind (runbook: before-image every QA write and clean it up).
    let planted = [];
    try { planted = JSON.parse(badBody); } catch { /* best effort */ }
    for (const r of Array.isArray(planted) ? planted : []) {
      if (r?.id) {
        await fetch(`${url}/rest/v1/runner_before_images?id=eq.${r.id}`,
          { method: "DELETE", headers: restHeaders(key) });
      }
    }
    assert.fail(
      `a backlog_items before-image keyed 'ZZZ-0' was ACCEPTED (HTTP ${bad.status}). ` +
      "trg_before_image_key_is_pk is not guarding the table, and every image written through this " +
      "path is a reversal promise nothing backs (SES-407). The planted row was deleted.");
  }
  assert.match(badBody, /SES-407/,
    `the insert was refused (HTTP ${bad.status}) but the message does not name SES-407, so it is ` +
    `refusing for some other reason and this arm proves nothing: ${badBody.slice(0, 300)}`);
  assert.match(badBody, /ZZZ-0/,
    "the refusal must name the offending key, or whoever hits it cannot see which write failed");

  // (a2) THE POSITIVE CONTROL. A trigger that refuses everything would pass (a) and wedge the
  //      platform. A RESOLVABLE text key must still be accepted -- and silently rewritten to the
  //      row uuid, which is the whole repair in one row.
  const anchor = await fetch(
    `${url}/rest/v1/backlog_items?select=id,backlog_id&backlog_id=eq.SES-407`,
    { headers: restHeaders(key) });
  const anchorRows = await anchor.json();
  assert.ok(Array.isArray(anchorRows) && anchorRows.length === 1,
    `the control needs exactly one live SES-407 row, got ${JSON.stringify(anchorRows).slice(0, 200)}`);
  const anchorUuid = anchorRows[0].id;

  const good = await fetch(`${url}/rest/v1/runner_before_images`, {
    method: "POST",
    headers: restHeaders(key),
    body: JSON.stringify({
      session_name: tag, table_name: "backlog_items", pk_value: "SES-407", row_data: null,
    }),
  });
  const goodBody = await good.text();
  let goodRows = [];
  try { goodRows = JSON.parse(goodBody); } catch { /* handled by the assert below */ }
  try {
    assert.ok(good.ok,
      `a RESOLVABLE text key was refused (HTTP ${good.status}: ${goodBody.slice(0, 300)}). The ` +
      "trigger is refusing more than SES-407 asks it to, which breaks every filing path");
    assert.strictEqual(goodRows?.[0]?.pk_value, anchorUuid,
      `the trigger accepted 'SES-407' but stored ${JSON.stringify(goodRows?.[0]?.pk_value)} ` +
      `rather than the row uuid ${anchorUuid} -- accepting without rewriting is the original bug`);
  } finally {
    for (const r of Array.isArray(goodRows) ? goodRows : []) {
      if (r?.id) {
        await fetch(`${url}/rest/v1/runner_before_images?id=eq.${r.id}`,
          { method: "DELETE", headers: restHeaders(key) });
      }
    }
  }

  // (b) THE PROPERTY, never today's count: whatever non-uuid keys survive must resolve to NO live
  //     backlog_id. A key that still resolves is one the repair missed.
  const notUuid = encodeURIComponent(`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`);
  const res = await fetch(
    `${url}/rest/v1/runner_before_images?table_name=eq.backlog_items&pk_value=not.imatch.${notUuid}&select=pk_value`,
    { headers: restHeaders(key) });
  assert.strictEqual(res.status, 200, `the survivor read returned HTTP ${res.status}`);
  const survivors = await res.json();
  assert.ok(Array.isArray(survivors), "the survivor read must return rows");

  const tokens = [...new Set(survivors.map(r => ticketToken(r.pk_value)).filter(Boolean))];
  if (tokens.length > 0) {
    const hit = await fetch(
      `${url}/rest/v1/backlog_items?select=backlog_id&backlog_id=in.(${tokens.map(encodeURIComponent).join(",")})`,
      { headers: restHeaders(key) });
    assert.strictEqual(hit.status, 200, `the resolvability read returned HTTP ${hit.status}`);
    const resolvable = await hit.json();
    assert.strictEqual(resolvable.length, 0,
      `${resolvable.length} surviving non-uuid key(s) still resolve to a live ticket ` +
      `(${resolvable.map(r => r.backlog_id).join(", ")}). The repair missed them, and each is an ` +
      "image reverse_decision() will refuse");
  }

  // THE SAME QUERY, PROVEN TO BE ABLE TO RETURN ROWS. Without this, the 0 above is equally
  // consistent with a filter that matches nothing for an unrelated reason -- the exact trap
  // .claude/rules/supabase-column-grants.md was written from.
  const control = await fetch(
    `${url}/rest/v1/backlog_items?select=backlog_id&backlog_id=in.(${encodeURIComponent("SES-407")})`,
    { headers: restHeaders(key) });
  const controlRows = await control.json();
  assert.strictEqual(controlRows.length, 1,
    "control: the in.() resolvability query must return a row for a token that DOES resolve, or " +
    "the 0 asserted above is an artefact of the query rather than a fact about the ledger");
}

async function run() {
  theTokenShapeIsRight();
  theFilingLoopsMintTheKey();
  await theDatabaseRefusesATextKeyAndTheLedgerIsRepaired();
}

export default run;
selfRun(import.meta.url, run);
