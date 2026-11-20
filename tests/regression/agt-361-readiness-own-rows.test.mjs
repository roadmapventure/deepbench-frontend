// DeepBench v7.0.1079 | tests/regression/agt-361-readiness-own-rows.test.mjs | AGT-361
// A created agent's Agent Readiness Score reads its OWN rows: a blank created agent scores
// [0,0,0,0,0], not the old constant 52 (L3 100, L4 72, L5 68 for anything trainable).
//
// FOUR ARMS, each with its own discriminator:
//   1. BLANK   -- the defect's own case: no knowledge rows, no config rows, every layer 0.
//   2. CONTROL -- the roster path is untouched: a non-created trainable agent still reads
//                 [0,20,100,72,68] (mean 52), and a table-only NON-trainable agent still
//                 reads the old non-trainable constants. If the fix leaked, these fail.
//   3. OWN ROWS-- a score appears only where a row does: L3 only on an active taught item of
//                 ALWAYS_MAX_CHARS or fewer, L4/L5 only on a config row with real text.
//   4. SOURCE  -- the calc left the screen (one shared module, one import, the new call) and
//                 the module stays pure: no fetch, no supabase.
//
// No network, no credentials, no writes.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selfRun } from "./_lib/self-run.js";
import { computeLayers, isCreatedAgent, ownConfigCounts } from "../../src/lib/readinessLayers.js";
import { toEntry } from "../../src/lib/taughtItems.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCREEN_REL = "src/screens/PersonnelScreen.jsx";
const MODULE_REL = "src/lib/readinessLayers.js";

const sc = (a, e, o) => computeLayers(a, e, o).map(l => l.s);
const C = { skill: 0, trainable: true, tableOnly: true };
const note = over => toEntry({ id: "k1", content: "Net 30 terms", source_type: "user", status: "active", ...over });
const count = (hay, needle) => hay.split(needle).length - 1;

export default async function run() {
  // --- 1. BLANK: the created agent with nothing of its own scores nothing ----------------------
  assert.equal(isCreatedAgent(C), true, "a tableOnly + trainable agent is a created agent");
  assert.deepEqual(sc(C, [], null), [0, 0, 0, 0, 0], "blank created agent, configs unread: all five layers 0");
  assert.deepEqual(sc(C, [], ownConfigCounts([], [])), [0, 0, 0, 0, 0], "blank created agent, configs read and empty: all five layers 0");

  // --- 2. CONTROL: every other agent scores exactly as it did ----------------------------------
  const R = { ...C, tableOnly: undefined };
  assert.equal(isCreatedAgent(R), false, "a roster agent is not a created agent");
  const roster = sc(R, [], null);
  assert.deepEqual(roster, [0, 20, 100, 72, 68], "roster trainable agent keeps the old layer scores");
  assert.equal(Math.round(roster.reduce((s, v) => s + v, 0) / roster.length), 52, "the roster path still reads 52");
  assert.deepEqual(
    sc({ skill: 0, trainable: false, tableOnly: true }, [], null),
    [0, 0, 100, 50, 45],
    "a table-only NON-trainable agent keeps the old non-trainable constants",
  );

  // --- 3. OWN ROWS: a layer scores only where that agent holds a row ---------------------------
  assert.deepEqual(sc(C, [note()], null), [0, 26, 100, 0, 0], "one active always-given taught item lights L2 and L3 only");
  assert.deepEqual(
    sc(C, [note({ content: "x".repeat(12001) })], null),
    [0, 26, 0, 0, 0],
    "a taught item too large to be given every run leaves L3 at 0",
  );
  assert.deepEqual(
    sc(C, [note({ status: "disabled" })], null),
    [0, 26, 0, 0, 0],
    "a disabled taught item leaves L3 at 0",
  );
  assert.deepEqual(
    ownConfigCounts([{ text: "" }], [{ text: "  " }, { text: "Never guess" }]),
    { formats: 0, guardrails: 1 },
    "a config row with empty or whitespace text is no row",
  );
  assert.deepEqual(
    sc({ ...C, skill: 40 }, [note(), note({ id: "k2" })], { formats: 2, guardrails: 1 }),
    [40, 32, 100, 72, 68],
    "a fully populated created agent scores every layer from its own rows",
  );

  // --- 4. SOURCE: one shared calc, one import, a pure module -----------------------------------
  const screen = fs.readFileSync(path.join(ROOT, SCREEN_REL), "utf8");
  assert.equal(count(screen, "function computeLayers"), 0, "the screen no longer defines computeLayers");
  assert.equal(count(screen, 'from "../lib/readinessLayers.js"'), 1, "the screen imports the shared calc exactly once");
  assert.equal(
    count(screen, "computeLayers(agent, entries, ownConfigs?.id === agentId ? ownConfigs : null);"),
    1,
    "the screen calls the calc with this agent's own config counts exactly once",
  );
  assert.equal(
    count(screen, 'Promise.all([apiGetConfigs(agentId, "output_format"), apiGetConfigs(agentId, "guardrail")])'),
    1,
    "the screen reads the created agent's own Playbook rows exactly once",
  );

  const mod = fs.readFileSync(path.join(ROOT, MODULE_REL), "utf8");
  assert.equal(count(mod, "s: created ?"), 4, "four layers branch on whether the agent is a created agent");
  assert.equal(count(mod, "fetch("), 0, "the calc module makes no network call");
  assert.equal(count(mod, "supabase"), 0, "the calc module reads no database");
}

selfRun(import.meta.url, run);
