// DeepBench v7.0.796 | tests/regression/agt-397-future-view.test.mjs | AGT-397 slice 2 -- (e) the Resume
// tab's Vitals and Skill Ladder cards are exported from ResumeTab.jsx and relocated (never redrawn) into
// the Future View: Vitals under Subscription and status; the stat trio and the Ladder under Readiness
// and levels. The <StatBadges count goes 2 -> 3 (the two header sites + the trio).
// DeepBench v7.0.795 | tests/regression/agt-397-future-view.test.mjs | AGT-397 slice 1 -- the
// Personnel File's Future View behind a Current / Proposed layout switch.
//
// FOUR ARMS, each with a control that fails if the change did nothing:
//   (a) resolveLayout() -- the compiled function is CALLED. "proposed" only when the host is a dev
//       host AND the flag is on AND the stored choice is "proposed"; everything else is "current".
//       The controls are the near-misses (one condition false, a junk stored value).
//   (b) FUTURE_GROUPS deep-equals the kickoff's five groups, in order.
//   (c) PersonnelScreen.jsx (comments stripped) wires the switch, the COMING group and the tab, and
//       the seven extracted components are DEFINED there exactly once with each heading rendered
//       exactly once -- moved, never copied. The six-hex count stays 10 (agt-344's pin).
//   (d) FutureViewTab.jsx authors no card heading and no hex: it lays out what it is handed.
//
// One esbuild build, per the log-143b precedent (two builds abort the process after [PASS]).

import assert from "assert";
import fs from "fs";
import path from "path";
import esbuild from "esbuild";
import { fileURLToPath, pathToFileURL } from "url";
import { selfRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PERSONNEL_REL = "src/screens/PersonnelScreen.jsx";
const FUTURE_REL = "src/screens/personnel/FutureViewTab.jsx";
const RESUME_REL = "src/screens/personnel/ResumeTab.jsx";

const HEADINGS = [
  "Compensation · FY2026 · The Ledger",
  "Agent Readiness Score",
  "Intelligence Configuration",
  "Quick Stats",
  "Report Card",
  "Active Work Assignments",
  "Recently Completed",
];
const COMPONENTS = [
  "CompensationCard", "ReadinessCard", "IntelConfigCard", "QuickStatsCard",
  "ReportCardPanel", "WorkAssignments", "StatBadges",
];
const EXPECTED_GROUPS = [
  { id: "subscription", label: "Subscription and status", line: "Arrives with subscription management" },
  { id: "billing", label: "Billing", line: "Arrives with live billing" },
  { id: "readiness", label: "Readiness and levels", line: "Arrives when levels are graded from real runs" },
  { id: "library", label: "Library", line: "Arrives with data-room access" },
  { id: "work", label: "Work", line: "Arrives with Work Orders on private agents" },
];

const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");
const stripComments = src => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const count = (hay, needle) => hay.split(needle).length - 1;
const hexCount = src => (src.match(/#[0-9a-fA-F]{6}\b/g) || []).length;

const stubSupabase = {
  name: "agt397-stub-supabase",
  setup(build) {
    build.onResolve({ filter: /(^|[\\/])supabase\.js$/ }, () => ({ path: "agt397-stub", namespace: "agt397-stub" }));
    build.onLoad({ filter: /.*/, namespace: "agt397-stub" }, () => ({
      contents: "export const supabase = { from: () => { throw new Error('stub'); } };", loader: "js",
    }));
  },
};

async function loadFutureView() {
  const dir = fs.mkdtempSync(path.join(ROOT, "node_modules", ".agt397-"));
  try {
    await esbuild.build({
      entryPoints: [path.join(ROOT, FUTURE_REL)],
      bundle: true, format: "esm", platform: "node", outdir: dir,
      loader: { ".js": "jsx", ".jsx": "jsx" },
      define: { "import.meta.env": "{}" },
      plugins: [stubSupabase],
      logLevel: "silent",
    });
    return await import(pathToFileURL(path.join(dir, "FutureViewTab.js")).href);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export default async function run() {
  // ── (a) resolveLayout, called ──────────────────────────────────────────────
  const fv = await loadFutureView();
  const { resolveLayout } = fv;
  assert.equal(typeof resolveLayout, "function", "FutureViewTab.jsx must export resolveLayout");
  assert.deepEqual(resolveLayout({ hostOk: true, flagOn: true, stored: "proposed" }),
    { switchShown: true, arrangement: "proposed" },
    "dev host + flag on + stored 'proposed' is the one path to the Proposed arrangement");
  // CONTROLS: each single condition false, and a junk stored value, must land on current.
  assert.deepEqual(resolveLayout({ hostOk: false, flagOn: true, stored: "proposed" }),
    { switchShown: false, arrangement: "current" }, "a production host never shows the switch or the proposed layout");
  assert.deepEqual(resolveLayout({ hostOk: true, flagOn: false, stored: "proposed" }),
    { switchShown: false, arrangement: "current" }, "flag off hides the switch and ignores a stored 'proposed'");
  assert.deepEqual(resolveLayout({ hostOk: true, flagOn: true, stored: null }),
    { switchShown: true, arrangement: "current" }, "no stored choice defaults to current (Designer call 2)");
  assert.deepEqual(resolveLayout({ hostOk: true, flagOn: true, stored: "junk" }),
    { switchShown: true, arrangement: "current" }, "an unknown stored value is current, never proposed");
  assert.deepEqual(resolveLayout({ hostOk: true, flagOn: true, stored: "current" }),
    { switchShown: true, arrangement: "current" }, "stored 'current' stays current");

  // ── (b) FUTURE_GROUPS ──────────────────────────────────────────────────────
  assert.deepEqual(fv.FUTURE_GROUPS, EXPECTED_GROUPS, "FUTURE_GROUPS must be the kickoff's five groups, in order");
  assert.equal(fv.LAYOUT_FLAG, "agt-397-layout-switch", "LAYOUT_FLAG slug");
  assert.equal(fv.LAYOUT_KEY, "agt397-layout", "LAYOUT_KEY storage key");
  assert.equal(typeof fv.LayoutSwitch, "function", "LayoutSwitch is exported");
  assert.equal(typeof fv.default, "function", "FutureViewTab is the default export");

  // ── (c) PersonnelScreen.jsx wiring ─────────────────────────────────────────
  const pRaw = read(PERSONNEL_REL);
  const p = stripComments(pRaw);
  for (const needle of [
    'from "./personnel/FutureViewTab.jsx"',
    "IS_ADMIN_HOST",
    "useFeatureFlag(LAYOUT_FLAG)",
    "localStorage.getItem(LAYOUT_KEY)",
    'id:"coming", label:"COMING"',
    'id:"future", label:"Future View"',
  ]) {
    assert.ok(p.includes(needle), `${PERSONNEL_REL} must contain ${needle}`);
  }
  assert.equal(count(p, "<LayoutSwitch"), 2, "the switch mounts twice: desktop sidebar and mobile, above the tab bar");
  assert.equal(count(p, "<StatBadges"), 3, "StatBadges: the two header sites (desktop page header, mobile persona block) and the Future View trio, nowhere else");
  assert.equal(count(p, "<FutureViewTab"), 1, "one Future View mount");
  for (const h of HEADINGS) {
    assert.equal(count(p, `>${h}<`), 1, `heading '${h}' must render exactly once -- moved, not copied`);
  }
  for (const c of COMPONENTS) {
    assert.equal(count(p, `function ${c}(`), 1, `${c} must be defined exactly once in ${PERSONNEL_REL}`);
  }
  assert.equal(hexCount(pRaw), 10, "color literals in PersonnelScreen.jsx (agt-344 pin)");

  // ── (d) FutureViewTab.jsx authors no card ─────────────────────────────────
  const fRaw = read(FUTURE_REL);
  for (const h of HEADINGS) {
    assert.ok(!fRaw.includes(h), `${FUTURE_REL} must not hold the heading '${h}'`);
  }
  assert.equal(hexCount(fRaw), 0, `${FUTURE_REL} carries no hex literal`);

  // ── (e) slice 2: Vitals + Skill Ladder relocated, never redrawn ───────────
  const rRaw = read(RESUME_REL);
  for (const needle of ["export function VitalsCard(", "export function SkillLadderCard("]) {
    assert.equal(count(rRaw, needle), 1, `${RESUME_REL} must contain ${needle} exactly once`);
  }
  for (const h of ["Resume · Vitals", "Skill Ladder"]) {
    assert.equal(count(rRaw, `>${h}<`), 1, `${RESUME_REL}: heading '${h}' renders exactly once -- the card is the export`);
    assert.equal(count(pRaw, `>${h}<`), 0, `${PERSONNEL_REL} must not redraw '${h}'`);
  }
  assert.ok(pRaw.includes("{ id:\"subscription\", items:[<VitalsCard"), "Vitals is the Subscription and status group's item");
  assert.equal(count(pRaw, "<SkillLadderCard"), 1, "one Skill Ladder mount, in Readiness and levels");
  assert.equal(count(pRaw, "<StatBadges key=\"trio\""), 1, "the stat trio mounts once in Readiness and levels");
  assert.ok(pRaw.includes("onIdentitySaved="), "ResumeTab is handed onIdentitySaved");
}

selfRun(import.meta.url, run);
