// DeepBench v7.0.1080 | tests/regression/agt-362-own-records-count.test.mjs | AGT-362 -- the Training
// strip's fourth count (the entries the agent wrote for itself) and the Compensation card's exit from a
// private agent's file. Pure: no network, no model, no esbuild.
//
// Each arm discriminates a wrong build: a filter on `e.taught` reads brent's 26 own records as 0; a
// count that respected `status` would drop the switched-off record and arm 3's 4 would read 3; and the
// source arm fails on the unchanged tree, where the screen holds neither ownCount nor the card's exit.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { selfRun } from "./_lib/self-run.js";
import { toEntry, taughtCounts, ownRecordCount, ownRecordsLabel } from "../../src/lib/taughtItems.js";

let seq = 0;
const mk = (n, source_type, status = "active") =>
  Array.from({ length: n }, () =>
    toEntry({ id: `e${++seq}`, content: "x", source_type, status }));

export default async function run() {
  // 1 -- BRENT: 26 active rows, every one the agent's own record (live 2026-11-20).
  const b = mk(26, "agent");
  assert.equal(new Set(b.map(e => e.id)).size, 26, "ids are unique");
  assert.deepEqual(taughtCounts(b), { taught: 0, always: 0, lookedUp: 0 });
  assert.equal(ownRecordCount(b), 26, "brent's 26 own records are counted");
  assert.equal(ownRecordsLabel("Brent"), "Brent's own records");

  // 2 -- CONTROL: a taught-only agent, and an empty file, hold no own record (so no fourth count renders).
  assert.equal(ownRecordCount(mk(3, "user")), 0);
  assert.equal(ownRecordCount([]), 0);

  // 3 -- THE PIN: no entry sits outside the strip. Taught items plus own records equals the cards listed.
  const m = [
    ...mk(2, "user"),
    ...mk(1, "user", "disabled"),
    ...mk(3, "agent"),
    ...mk(1, "agent", "disabled"),
  ];
  assert.equal(m.length, 7);
  assert.equal(ownRecordCount(m), 4, "every status counts, so the switched-off record is in");
  assert.equal(taughtCounts(m).taught + ownRecordCount(m), m.length);

  // 4 -- SOURCE: the screen.
  const src = readFileSync(new URL("../../src/screens/PersonnelScreen.jsx", import.meta.url), "utf8");
  const held = [
    "const ownCount = ownRecordCount(entries);",
    "...(ownCount>0?[[ownRecordsLabel(firstName),ownCount,T.card]]:[])",
    "if (isPrivateAgent(agent)) return null;",
  ];
  for (const h of held) {
    assert.equal(src.split(h).length - 1, 1, `PersonnelScreen.jsx holds ${h} exactly once`);
  }
  const exit = src.indexOf("if (isPrivateAgent(agent)) return null;");
  const card = src.indexOf("function CompensationCard");
  const ledger = src.indexOf("Compensation · FY2026 · The Ledger");
  assert.ok(card < exit && exit < ledger,
    `the card's exit sits inside CompensationCard, above the ledger heading (card ${card}, exit ${exit}, ledger ${ledger})`);
}

selfRun(import.meta.url, run);
