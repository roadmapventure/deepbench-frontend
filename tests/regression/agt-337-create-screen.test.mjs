// DeepBench v7.0.764 | tests/regression/agt-337-create-screen.test.mjs | AGT-337 slice 3 -- the create screen
//
// FEATURE: AGT-337 -- /bench/new is the create screen John approved: type a name, press the create
// button, land on the Bench with the new agent's card. Every visible string is his, verbatim; the
// old wizard stub is gone; and a new agent (which has no quip yet) shows no empty quotation marks
// on its Personnel file.
//
// STATIC (always run), on the RAW files (comments included -- a retired string in a comment is
// still a retired string in the file):
//   (a) src/screens/BenchNewScreen.jsx holds every approved string and every wiring needle;
//   (b) it holds none of the retired wizard's strings, no rgba( literal and no hex colour literal;
//   (c) src/screens/PersonnelScreen.jsx guards the quip at both sites -- the guard exactly twice,
//       the quoted quip exactly twice.
//
// BASELINE: on the unchanged tree (pre v7.0.764) part (a) fails on its second needle (the new
// heading is absent) and part (b) would fail on the retired stub's title; part (c) fails with the
// guard found 0 times.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

const SCREEN_REL = "src/screens/BenchNewScreen.jsx";
const PERSONNEL_REL = "src/screens/PersonnelScreen.jsx";

function countOccurrences(haystack, needle) {
  return haystack.split(needle).length - 1;
}

const PRESENT = [
  `New Agent Setup`,
  `Name your new agent`,
  `Your agent starts blank. You teach it everything it knows.`,
  `Agent name`,
  `Add my new agent to my team`,
  `New team`,
  `placeholder="Team name"`,
  `>Team name<`,
  `Enter a team name`,
  `Create agent`,
  `Creating…`,
  `Cancel`,
  `Couldn’t create your agent. Try again.`,
  `action: "create_private_agent"`,
  `fetch("/api/agent-configs"`,
  `.from("teams").select("id,name")`,
  `navigate("/bench")`,
  `maxLength={60}`,
];

const ABSENT = [
  `Coming Soon`,
  `DOMAINS`,
  `Your Domain`,
  `Agent Profile`,
  `New Work Order Instead`,
  `Let's build your first agent`,
  `Corners`,
  `rgba(`,
];

const HEX_LITERAL = /#[0-9a-fA-F]{3,8}\b/;

const QUIP_GUARD = `{agent.quip && (`;
const QUIP_QUOTED = `"{agent.quip}"`;

function checkScreenPresent() {
  const src = read(SCREEN_REL);
  for (const needle of PRESENT) {
    assert.ok(src.includes(needle), `${SCREEN_REL} must hold \`${needle}\``);
  }
  console.log(`  (a) ${PRESENT.length} approved strings and wiring needles present in ${SCREEN_REL}`);
}

function checkScreenAbsent() {
  const src = read(SCREEN_REL);
  for (const needle of ABSENT) {
    const n = countOccurrences(src, needle);
    assert.strictEqual(n, 0, `${SCREEN_REL} must no longer hold \`${needle}\` (found ${n})`);
  }
  const hex = src.match(HEX_LITERAL);
  assert.strictEqual(hex, null, `${SCREEN_REL} must hold no hex colour literal (found ${hex && hex[0]})`);
  console.log(`  (b) ${ABSENT.length} retired strings absent, no hex literal in ${SCREEN_REL}`);
}

function checkQuipGuard() {
  const src = read(PERSONNEL_REL);
  const guards = countOccurrences(src, QUIP_GUARD);
  const quoted = countOccurrences(src, QUIP_QUOTED);
  assert.strictEqual(guards, 2, `${PERSONNEL_REL} must hold \`${QUIP_GUARD}\` exactly 2 times (found ${guards})`);
  assert.strictEqual(quoted, 2, `${PERSONNEL_REL} must hold \`${QUIP_QUOTED}\` exactly 2 times (found ${quoted})`);
  console.log(`  (c) quip guard ${guards}, quoted quip ${quoted} in ${PERSONNEL_REL}`);
}

async function run() {
  checkScreenPresent();
  checkScreenAbsent();
  checkQuipGuard();
  console.log("AGT-337 create-screen test: PASS");
}

selfRun(import.meta.url, run);
export default run;
