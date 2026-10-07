// DeepBench v7.0.816 | tests/regression/agt-416-access-levels-card.test.mjs | AGT-416 -- the Access levels SAMPLE card on
// Personnel Future Controls: what an owner will be able to assign once subscriptions are on.
//
// STATIC (always run; no network):
//   (a) the group and option lists are COMPILED from FutureViewTab.jsx's own source and CALLED: every option John
//       named on 2026-10-07 is present (Only in DeepBench, Selected AI clients, Available to all AI clients, Your
//       own LLM, Full scaffold, Selected scaffold sections, Answer only), each group marks exactly one sample choice,
//       and that choice is one of the group's own options.
//   (b) the card says SAMPLE, says nothing is saved or enforced, and lists the always-protected items (the Library
//       stays inside DeepBench, Skill text can be held back, an admin grant comes first).
//   (c) PersonnelScreen mounts the card once, in the Future Controls Access (library) group, and the card does no
//       data read and no write (no fetch, no supabase).
//
// BASELINE: RED on the unchanged tree -- FutureViewTab.jsx exports no AccessLevelsCard.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const count = (hay, needle) => hay.split(needle).length - 1;

export default async function run() {
  const src = read("src/screens/personnel/FutureViewTab.jsx");
  assert.ok(src.includes("export function AccessLevelsCard"), "FutureViewTab.jsx must export AccessLevelsCard");

  // ── (a) ────────────────────────────────────────────────────────────────────
  const start = src.indexOf("export const ACCESS_LEVEL_GROUPS");
  const end = src.indexOf("export function AccessLevelsCard");
  const { ACCESS_LEVEL_GROUPS, ACCESS_ALWAYS_PROTECTED } = new Function(`${src.slice(start, end).replace(/export const/g, "const")}; return { ACCESS_LEVEL_GROUPS, ACCESS_ALWAYS_PROTECTED };`)();
  const labels = ACCESS_LEVEL_GROUPS.flatMap(g => g.options.map(o => o[1]));
  for (const named of ["Only in DeepBench", "Selected AI clients", "Available to all AI clients", "Your own LLM", "Full scaffold", "Selected scaffold sections", "Answer only"]) {
    assert.ok(labels.includes(named), `the card lists "${named}"`);
  }
  assert.ok(ACCESS_LEVEL_GROUPS.length >= 4, "reach, model, what an AI client receives, who can teach");
  for (const g of ACCESS_LEVEL_GROUPS) {
    assert.ok(g.options.some(o => o[0] === g.chosen), `group "${g.title}" marks a sample choice that is one of its options`);
    assert.equal(new Set(g.options.map(o => o[0])).size, g.options.length, `group "${g.title}" has distinct option ids`);
    for (const [, label, line] of g.options) assert.ok(label && line, `every option in "${g.title}" has a label and a meaning`);
  }

  // ── (b) ────────────────────────────────────────────────────────────────────
  const card = src.slice(end);
  assert.ok(card.includes("<SampleTag />"), "the card is tagged SAMPLE");
  assert.ok(card.includes("nothing here is saved or enforced yet"), "the card says nothing is saved or enforced");
  const protectedLabels = ACCESS_ALWAYS_PROTECTED.map(p => p[0]).join(" | ");
  for (const needle of ["Library stays inside DeepBench", "Skill text can be held back", "admin grant comes first"]) assert.ok(protectedLabels.includes(needle), `always-protected list has "${needle}"`);

  assert.ok(ACCESS_LEVEL_GROUPS.some(g => g.title === "Can its knowledge be updated from an AI client"), "the update-from-an-AI-client group uses John's own question");
  const resume = read("src/screens/personnel/ResumeTab.jsx");
  assert.ok(!resume.includes("Update Rights") && resume.includes("Updated from AI clients"), "Resume Vitals says Updated from AI clients, not the old Update Rights label");

  // ── (c) ────────────────────────────────────────────────────────────────────
  const screen = read("src/screens/PersonnelScreen.jsx");
  assert.equal(count(screen, "<AccessLevelsCard"), 1, "PersonnelScreen mounts the card once");
  assert.ok(/id:"library", items:\[<AccessLevelsCard key="levels"\/>\]/.test(screen), "it sits in the Future Controls Access (library) group");
  assert.ok(!/fetch\(|supabase/.test(card), "the card reads and writes nothing");
}

selfRun(import.meta.url, run);
