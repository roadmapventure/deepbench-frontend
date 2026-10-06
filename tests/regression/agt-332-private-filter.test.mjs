// DeepBench v7.0.788 | tests/regression/agt-332-private-filter.test.mjs | AGT-384 -- the nav moved to
// src/components/BenchNav.jsx and reads All, Private Agents, the groups, Product Team (John,
// 2026-10-05: "move All above Private"); the Bench opens on its home page, so no filter is held in
// state -- the roster reads it from the address and falls back to Private. The nav needles are now
// read from BenchNav.jsx; `return [priv, all` and `useState(BENCH_PRIVATE.id)` must be gone. Red on
// the pre-v7.0.788 tree: BenchNav.jsx is absent. The DATA arm is unchanged.
// DeepBench v7.0.755 | tests/regression/agt-332-private-filter.test.mjs | AGT-332 slice 2 -- the Bench "Private" filter
//
// FEATURE: AGT-332 -- the Bench nav reads Private, All, the BENCH_FILTERS groups, Product Team
// (John, 2026-10-03); the Bench opens on Private; "All" is every NON-private agent, and its count
// and its grid read the one predicate isPrivateAgent(a) off each row (ARCHITECTURE §19e Rule #1:
// a row value, never an agent id -- this file names no agent id either).
//
// STATIC (always run), on src/screens/RosterScreen.jsx with comments stripped:
//   present EXACTLY once -- the three-name import from ../data/agents.js, useState(BENCH_PRIVATE.id),
//   the [priv, all, ...groups, ...productTeamEntry] return, the Private count, the All count, and
//   the All grid filter; ABSENT -- useState("all"), count: agents.length, return [all, ...groups.
// DATA (always run), on src/data/agents.js:
//   1 private agent, 23 non-private, 24 in all; BENCH_FILTERS ids unchanged (Private is NOT one
//   of them -- it is built from BENCH_PRIVATE, ahead of All).
//
// BASELINE: on the unchanged tree (pre v7.0.755) the static part fails -- useState(BENCH_PRIVATE.id),
// the [priv, all, ...] return and both isPrivateAgent counts are absent, useState("all") is present.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

const ROSTER_REL = "src/screens/RosterScreen.jsx";
const NAV_REL = "src/components/BenchNav.jsx";

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

function countOccurrences(haystack, needle) {
  return haystack.split(needle).length - 1;
}

// AGT-384: the nav (order, both counts, the three-name import) lives in BenchNav.jsx; the roster
// keeps the grid filter and reads the active filter from the address, Private when none is given.
const STATIC = [
  {
    rel: NAV_REL,
    presentOnce: [
      `import { BENCH_FILTERS, BENCH_PRIVATE, isPrivateAgent } from "../data/agents.js";`,
      `return [all, priv, ...groups, ...productTeamEntry];`,
      `count: agents.filter(isPrivateAgent).length`,
      `count: agents.filter(a => !isPrivateAgent(a)).length`,
    ],
    absent: [
      `return [priv, all`,
      `count: agents.length`,
      `return [all, ...groups`,
    ],
  },
  {
    rel: ROSTER_REL,
    presentOnce: [
      `import { BENCH_PRIVATE, isPrivateAgent } from "../data/agents.js";`,
      `const activeFilter = home ? null : (searchParams.get("filter") || BENCH_PRIVATE.id);`,
      `if (activeFilter === "all") return sortedAgents.filter(a => !isPrivateAgent(a));`,
    ],
    absent: [
      `useState("all")`,
      `useState(BENCH_PRIVATE.id)`,
      `return [priv, all`,
      `count: agents.length`,
    ],
  },
];

function checkStatic() {
  for (const { rel, presentOnce, absent } of STATIC) {
    const code = stripComments(read(rel));
    for (const needle of presentOnce) {
      const n = countOccurrences(code, needle);
      assert.strictEqual(n, 1, `${rel} must carry EXACTLY one \`${needle}\` (found ${n})`);
    }
    for (const needle of absent) {
      const n = countOccurrences(code, needle);
      assert.strictEqual(n, 0, `${rel} must no longer carry \`${needle}\` (found ${n})`);
    }
    console.log(`  static: ${presentOnce.length} needles present exactly once, ${absent.length} absent in ${rel}`);
  }
}

async function checkData() {
  const { AGENTS, BENCH_FILTERS, isPrivateAgent } = await import("../../src/data/agents.js");
  const priv = AGENTS.filter(isPrivateAgent).length;
  const nonPriv = AGENTS.filter(a => !isPrivateAgent(a)).length;
  assert.strictEqual(priv, 1, `Private must hold exactly 1 agent (found ${priv})`);
  assert.strictEqual(nonPriv, 23, `All must hold exactly 23 non-private agents (found ${nonPriv})`);
  assert.strictEqual(AGENTS.length, 24, `AGENTS must hold 24 agents (found ${AGENTS.length})`);
  assert.deepStrictEqual(BENCH_FILTERS.map(f => f.id), ["mi", "platform", "nigp", "special"],
    "BENCH_FILTERS ids must stay mi, platform, nigp, special -- Private is built from BENCH_PRIVATE, not added here");
  console.log(`  data: Private ${priv}, All ${nonPriv}, AGENTS ${AGENTS.length}`);
}

async function run() {
  checkStatic();
  await checkData();
  console.log("AGT-332 private-filter test: PASS");
}

selfRun(import.meta.url, run);
export default run;
