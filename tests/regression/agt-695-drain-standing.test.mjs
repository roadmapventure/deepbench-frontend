// DeepBench v7.0.1110 | tests/regression/agt-695-drain-standing.test.mjs | AGT-695 -- the queue the boot gate counts from, the invention filer and the pages read which drain the pick is on from one home.
//
// WHAT THIS GUARDS. Since AGT-495 (v7.0.1036) public.drain_epic_next(uuid) passes a blocked oldest
// drain and picks from a later queued one. Until migration `agt695_drain_standing`,
// public.prime_directive_queue() -- the only source of pickable work public.runner_should_boot()
// reads -- and public.file_invention_proposal() still read the single oldest queued drain-epic row,
// so a later drain's member scored below 3 sat in no lane and the boot gate could count nothing
// pickable while the picker would pick. Both now read public.drain_standing(), the one home.
//
//   O1 pure -- the mirror docs/design/agt-695-drain-standing.sql is the designed migration, byte
//              for byte, and does not touch the picker.
//   O2 pure -- each of the three page readers asks the home exactly once and still reads its own
//              oldest-queued row (the standing drain keeps its slot).
//   O3 pure -- deriveAutomation()/automationLiteral() over stubbed sel/rpc: drain_pick_epic is ''
//              while passed = 0 and the later drain's epic once passed > 0, and the home is not
//              asked at all when no drain is queued.
//   O4 pure -- the words: the two runbook lines, the template clause, the page-contract row.
//   C1 live -- (service key, else notRun) ONE call of public.drain_standing_probe(). THE
//              DISCRIMINATOR: on today's bodies arm 2 reads `w_listed2` true and
//              `pickable2 === pickable1`; on the pre-splice bodies it read `w_listed2` false and
//              `pickable2 === pickable1 - 1`. Every fixture write is rolled back by sentinel P0695.
//   C2 live -- the home on the real board, cross-read against runner_directives.
//
// drain_epic_next(uuid) IS NEVER CALLED FROM HERE DIRECTLY -- it is VOLATILE and retires a live
// drain (the refusal ses-281, ses-424a, agt-140 and agt-495 each recorded). The probe calls it
// inside its own rolled-back sub-block, and the probe is what this file grades.
import assert from "assert";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { deriveAutomation, automationLiteral } from "../../scripts/lib/briefing-automation.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MIRROR_REL = "docs/design/agt-695-drain-standing.sql";

// md5 of the WHOLE mirror file as the kickoff pins it (docs/harvests/AGT-695.md section S1:
// 20,426 bytes). The mirror is the migration's record, header included.
export const MIRROR_MD5 = "e5419a4c92cce8d99797c1954c58fbce";
export const MIRROR_BYTES = 20426;

export const MIRROR_ONCE = [
  "CREATE FUNCTION public.drain_standing()",
  "CREATE FUNCTION public.drain_standing_probe(",
  "REVOKE ALL ON FUNCTION public.drain_standing() FROM PUBLIC, anon, authenticated;",
];
// The picker writes, so no STABLE read may call it and this ship does not retype it.
export const MIRROR_NEVER = ["CREATE OR REPLACE FUNCTION public.drain_epic_next"];

// O2: each reader's one read of the home, and the oldest-queued read it KEEPS.
export const READERS = [
  { rel: "scripts/build-briefing.mjs", home: "rpc('drain_standing')" },
  { rel: "scripts/lib/briefing-automation.mjs", home: "rpc('drain_standing')" },
  { rel: "scripts/render-standing-brief.js", home: '"rpc/drain_standing"' },
];
export const OWN_QUEUED_READ = "status=eq.queued";
// render-standing-brief.js claimed it read "the same row drain_epic_next() reads". Since AGT-495
// that is false, and the claim is gone rather than left to mislead the next session.
export const STALE_CLAIM = "the same row drain_epic_next()";

// O4: T6's words.
export const RUNBOOK_NEW = [
  "retire or pass as `blocked` and acts on the first `pick` / `unscoped`.",
  "the queued `drain-epic` rows oldest first",
];
export const RUNBOOK_OLD = [
  "retire and acts on the first `pick` / `blocked` / `unscoped` / `none`.",
  "the single oldest queued `drain-epic` row",
];

// --- C1: the probe grader. Pure, and the whole verdict: the named cases that FAILED, in order. --
//
// Measured on the live board 2026-11-23, immediately after migration `agt695_drain_standing`
// landed (arm C prints the row it grades, so a later reader never has to take this on trust).
export const READING_AFTER = {
  queue_reads_home: true, filer_reads_home: true,
  standing1: "B", passed1: 0, pickable1: 1, w_listed1: true, picker1: "pick", picker_dir1: "B", pick1: "ZFIX-69503",
  standing2: "B", passed2: 1, pickable2: 1, w_listed2: true, boot_pickable2: 1, picker2: "pick", picker_dir2: "B", pick2: "ZFIX-69503",
  standing3: "A", passed3: 0, pickable3: 0, w_listed3: false, picker3: "blocked", picker_dir3: "A",
  real_queued: 0,
  residue: { items: 0, directives: 0, scope: 0 },
};
// THE PRE-SPLICE READING, and it is not a reconstruction: the migration's own BEFORE gate refused
// to apply anything unless the live bodies read exactly this -- `w_listed2` FALSE,
// `pickable2 = pickable1 - 1`, and neither reader naming the home -- while the picker still picked
// drain B's member. `pickable1`'s absolute value is the post-splice measurement; the gate pinned
// only the relation between the two, which is all this control needs.
export const READING_BEFORE = {
  ...READING_AFTER,
  queue_reads_home: false, filer_reads_home: false,
  w_listed2: false, pickable2: 0, boot_pickable2: 0,
};

export function gradeProbe(j) {
  const failed = [];
  const res = j?.residue ?? {};
  if (!(j?.queue_reads_home === true && j?.filer_reads_home === true)) failed.push("queue-and-filer-read-the-home");
  // arm 1 -- one healthy drain: every reader names it, exactly as every reader did before AGT-695.
  if (!(j?.standing1 === "B" && j?.passed1 === 0 && j?.w_listed1 === true
        && j?.picker1 === "pick" && j?.picker_dir1 === "B")) failed.push("arm1-oldest-drain-answers");
  // arm 2 -- THE WHOLE TICKET: a blocked drain stands ahead, and the queue still lists the member
  // the picker hands over. This is the case the pre-splice bodies failed.
  if (!(j?.standing2 === "B" && j?.passed2 === 1 && j?.w_listed2 === true
        && j?.pickable2 === j?.pickable1)) failed.push("arm2-queue-follows-the-pick");
  // the boot gate counts from the queue alone, so it has to carry the same number.
  if (!(j?.boot_pickable2 === j?.pickable2)) failed.push("arm2-boot-gate-counts-it");
  // the home and the picker name the same drain and the same member.
  if (!(j?.picker2 === "pick" && j?.picker_dir2 === "B" && j?.pick2 === "ZFIX-69503")) failed.push("arm2-picker-agrees");
  // arm 3 -- nothing hands a member over: the OLDEST queued drain answers, as it always did.
  // Gradable only on a board with no real queued drain, which would answer it instead.
  if (j?.real_queued === 0
      && !(j?.standing3 === "A" && j?.passed3 === 0 && j?.pickable3 === j?.pickable1 - 1
           && j?.picker3 === "blocked" && j?.picker_dir3 === "A")) failed.push("arm3-oldest-answers-when-none-picks");
  if (!(j?.w_listed3 === false)) failed.push("arm3-no-member-handed-over");
  if (!(res.items === 0 && res.directives === 0 && res.scope === 0)) failed.push("residue-zero");
  return failed;
}

// --- O3: the stubs. sel answers one queued drain; swap `queued` for [] to answer none. ---------
export function makeSel(withDrain) {
  return async q => {
    if (q.includes(OWN_QUEUED_READ)) return withDrain ? [{ id: "d1", epic_id: "e1" }] : [];
    if (q.includes("epics")) return [{ name: "Tooling" }];
    if (q.includes("runner_drain_scope")) return [{ item_id: "i1" }];
    if (q.includes("backlog_items?id=in")) return [{ id: "i1" }];
    if (q.includes("runner_settings")) return [{ scheduler_on: true }];
    return [];
  };
}
export function makeRpc(passed, asked) {
  return async (fn) => {
    asked.push(fn);
    if (fn === "drain_standing") return [{ directive_id: "d2", epic_name: "Later epic", passed }];
    if (fn === "resolve_day_token_cap") return [{ day_cap: 5, cap_reason: "x" }];
    return [];
  };
}

async function run() {
  const results = [];

  // --- O1: the mirror ---------------------------------------------------------------------------
  const p = path.join(ROOT, MIRROR_REL);
  assert.ok(fs.existsSync(p), `${MIRROR_REL} is missing -- the migration has no mirror`);
  const raw = fs.readFileSync(p);
  assert.strictEqual(raw.length, MIRROR_BYTES, `${MIRROR_REL} is ${raw.length} bytes, not the designed ${MIRROR_BYTES}`);
  const md5 = crypto.createHash("md5").update(raw).digest("hex");
  assert.strictEqual(md5, MIRROR_MD5,
    `${MIRROR_REL} hashes to ${md5}, not the designed ${MIRROR_MD5}. The mirror is no longer the migration `
    + "that was applied -- say in the ship what changed and why, then move this constant.");
  assert.notStrictEqual(crypto.createHash("md5").update(Buffer.concat([raw, Buffer.from(" ")])).digest("hex"), MIRROR_MD5,
    "control: the md5 pin cannot tell one extra byte from the designed mirror");
  const sql = raw.toString("utf8");
  for (const n of MIRROR_ONCE) {
    const c = sql.split(n).length - 1;
    assert.strictEqual(c, 1, `the mirror holds ${JSON.stringify(n)} ${c} time(s), expected exactly 1`);
  }
  for (const n of MIRROR_NEVER) {
    assert.ok(!sql.includes(n),
      `the mirror holds ${JSON.stringify(n)} -- AGT-695 does not retype the picker: it WRITES, so no STABLE read may call it, `
      + "and AGT-167 stage C is in flight on that body (docs/harvests/AGT-695.md section 4).");
  }
  results.push("mirror-is-the-designed-migration-and-leaves-the-picker-alone");

  // --- O2: the three page readers ---------------------------------------------------------------
  for (const r of READERS) {
    const t = fs.readFileSync(path.join(ROOT, r.rel), "utf8");
    const home = t.split(r.home).length - 1;
    assert.strictEqual(home, 1,
      `${r.rel} reads the home ${JSON.stringify(r.home)} ${home} time(s), expected exactly 1 -- one home, one read per page.`);
    assert.ok(t.includes(OWN_QUEUED_READ),
      `${r.rel} no longer reads its own ${OWN_QUEUED_READ} row -- the STANDING drain is still the oldest queued one `
      + "and keeps its slot; the home only says whether the pick has passed it.");
  }
  const brief = fs.readFileSync(path.join(ROOT, "scripts/render-standing-brief.js"), "utf8");
  assert.strictEqual(brief.split(STALE_CLAIM).length - 1, 0,
    `scripts/render-standing-brief.js still claims ${JSON.stringify(STALE_CLAIM)} -- since AGT-495 the picker can pass that row.`);
  results.push("three-page-readers-ask-one-home-and-keep-their-own-standing-read");

  // --- O3: the Automation panel value -----------------------------------------------------------
  const asked0 = [];
  const none = await deriveAutomation(makeSel(false), makeRpc(1, asked0));
  assert.strictEqual(none.drain_on, false, "control: the no-drain stub must derive drain_on false");
  assert.strictEqual(none.drain_pick_epic, "", "with no queued drain there is no pick to report");
  assert.ok(!asked0.includes("drain_standing"),
    `the home was asked ${JSON.stringify(asked0)} with no drain queued -- it is asked only when one is.`);

  const asked1 = [];
  const held = await deriveAutomation(makeSel(true), makeRpc(0, asked1));
  assert.ok(asked1.includes("drain_standing"), "with a drain queued the home must be asked");
  assert.strictEqual(held.drain_epic, "Tooling", "the standing drain's own epic is unchanged");
  assert.strictEqual(held.drain_pick_epic, "", "passed = 0: the standing drain still holds the pick, so no clause renders");

  const asked2 = [];
  const passedOn = await deriveAutomation(makeSel(true), makeRpc(1, asked2));
  assert.strictEqual(passedOn.drain_epic, "Tooling", "the standing drain keeps its slot even once the pick has passed it");
  assert.strictEqual(passedOn.drain_pick_epic, "Later epic", "passed = 1: the panel names the drain the pick is on");

  for (const [a, want] of [[held, '""'], [passedOn, '"Later epic"']]) {
    const lit = automationLiteral(a);
    assert.doesNotThrow(() => new Function(lit), `automationLiteral() did not parse:\n${lit}`);
    assert.ok(lit.includes(`drain_pick_epic: ${want},`),
      `automationLiteral() lacks drain_pick_epic: ${want} -- the template reads AUTOMATION.drain_pick_epic.`);
  }
  results.push("automation-panel-names-the-drain-the-pick-passed-to-and-nothing-while-it-holds");

  // --- O4: the words ----------------------------------------------------------------------------
  const runbook = fs.readFileSync(path.join(ROOT, "docs/runbooks/runner-cycle.md"), "utf8");
  for (const n of RUNBOOK_NEW) {
    const c = runbook.split(n).length - 1;
    assert.strictEqual(c, 1, `runner-cycle.md holds ${JSON.stringify(n)} ${c} time(s), expected exactly 1`);
  }
  for (const o of RUNBOOK_OLD) {
    assert.strictEqual(runbook.split(o).length - 1, 0,
      `runner-cycle.md still tells step 5 ${JSON.stringify(o)} -- the picker passes a blocked drain and reads the queued rows oldest first.`);
  }
  const tmpl = fs.readFileSync(path.join(ROOT, "docs/runbooks/briefing-template.html"), "utf8");
  assert.strictEqual(tmpl.split("AUTOMATION.drain_pick_epic ?").length - 1, 1,
    "briefing-template.html must hold the drain_pick_epic clause exactly once");
  const page = fs.readFileSync(path.join(ROOT, "docs/runbooks/briefing-page.md"), "utf8");
  assert.strictEqual(page.split("`drain_pick_epic`").length - 1, 1,
    "briefing-page.md's section 2b key contract must carry drain_pick_epic exactly once");
  results.push("runbook-template-and-page-contract-say-what-the-readers-do");

  // --- the grader, both ways (the control that proves it can go red -- the SES-158 assert) ------
  assert.deepStrictEqual(gradeProbe(READING_AFTER), [], "the post-splice reading must pass every case");
  assert.deepStrictEqual(gradeProbe(READING_BEFORE),
    ["queue-and-filer-read-the-home", "arm2-queue-follows-the-pick"],
    "control: the pre-splice reading must fail the home read and arm 2 -- and ONLY those: a healthy drain's "
    + "member was listed before this ship too, and the oldest drain answered when nothing picked.");
  assert.deepStrictEqual(gradeProbe({ ...READING_AFTER, boot_pickable2: 0 }), ["arm2-boot-gate-counts-it"],
    "control: a boot gate counting fewer than the queue must fail its own case");
  assert.deepStrictEqual(gradeProbe({ ...READING_AFTER, picker_dir2: "A" }), ["arm2-picker-agrees"],
    "control: the picker naming another drain than the home must fail");
  assert.deepStrictEqual(gradeProbe({ ...READING_AFTER, w_listed3: true }), ["arm3-no-member-handed-over"],
    "control: a member listed while no drain hands one over must fail");
  assert.deepStrictEqual(gradeProbe({ ...READING_AFTER, residue: { items: 1, directives: 0, scope: 0 } }), ["residue-zero"],
    "control: a fixture left on the live board must fail");
  assert.deepStrictEqual(gradeProbe({ ...READING_AFTER, real_queued: 2, standing3: "other", picker3: "pick" }), [],
    "a real queued drain answering arm 3 is not a failure -- that case is only gradable on a board with none");
  results.push("grader-passes-the-post-splice-reading-and-fails-the-pre-splice-one");

  // --- C1 / C2: live ----------------------------------------------------------------------------
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!base || !key) {
    notRun("the live probe and the home on the real board (arms C1, C2)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent -- the rule is a database function and there is nothing to grade "
      + "it against here. Drive it with: node --env-file-if-exists=.env.local tests/regression/agt-695-drain-standing.test.mjs");
    return results;
  }
  const hdr = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const r = await fetch(`${base}/rest/v1/rpc/drain_standing_probe`, { method: "POST", headers: hdr, body: "{}" });
  const text = typeof r.text === "function" ? await r.text() : JSON.stringify(await r.json());
  assert.ok(r.ok, `rpc/drain_standing_probe -> HTTP ${r.status}: ${text.slice(0, 300)} -- migration agt695_drain_standing did not land (or PostgREST has not reloaded its schema)`);
  let j = null;
  try { j = JSON.parse(text); } catch { /* graded as not answered below */ }
  console.log(`         AGT-695 drain-standing probe: ${JSON.stringify(j)}`);

  // TRANSPORT IS NOT A VERDICT (AGT-116): a stubbed fetch left behind by an earlier in-process
  // test answers [] -- see agt-483-parent-score.test.mjs arm C for the measured cause.
  const answered = j !== null && typeof j === "object" && !Array.isArray(j) && typeof j.standing1 === "string";
  if (!answered) {
    notRun("the live probe (arm C1)",
      `the probe answered ${JSON.stringify(j)}, which is not the jsonb object a service_role PostgREST call returns -- `
      + "nothing about the drain the pick is on was measured here and this is not a pass. Drive it alone: "
      + "node --env-file-if-exists=.env.local tests/regression/agt-695-drain-standing.test.mjs");
    return results;
  }
  assert.deepStrictEqual(gradeProbe(j), [],
    `the probe failed: ${JSON.stringify(gradeProbe(j))}. If arm2-queue-follows-the-pick is in that list, `
    + "prime_directive_queue() is back to reading the single oldest queued drain and the boot gate can count nothing "
    + "pickable while drain_epic_next() would pick.");
  if (j.real_queued !== 0) {
    notRun("the none-picks case (arm C1, arm 3)",
      `${j.real_queued} real drain-epic directive(s) are queued, so arm 3's answer belongs to the board, not to the fixtures; the other seven cases were graded`);
  }

  // the rollback, read from OUTSIDE the probe in a second statement.
  const get = async q => {
    const g = await fetch(`${base}/rest/v1/${q}`, { headers: hdr });
    assert.ok(g.ok, `${q} -> HTTP ${g.status}`);
    return g.json();
  };
  const left = await get("backlog_items?source_file=eq.agt695-probe&select=id");
  const leftDirs = await get("runner_directives?body=like.AGT-695%20PROBE%20FIXTURE*&select=id");
  assert.strictEqual(left.length + leftDirs.length, 0,
    `the probe left ${left.length} ticket(s) and ${leftDirs.length} directive(s) on the LIVE board -- sentinel P0695 did not roll its fixtures back`);
  results.push("live-the-queue-the-boot-gate-and-the-filer-follow-the-drain-the-pick-is-on");

  // --- C2: the home on the real board -----------------------------------------------------------
  const s = await fetch(`${base}/rest/v1/rpc/drain_standing`, { method: "POST", headers: hdr, body: "{}" });
  const sText = typeof s.text === "function" ? await s.text() : JSON.stringify(await s.json());
  assert.ok(s.ok, `rpc/drain_standing -> HTTP ${s.status}: ${sText.slice(0, 300)}`);
  const rows = JSON.parse(sText);
  assert.ok(Array.isArray(rows) && rows.length <= 1,
    `public.drain_standing() answered ${JSON.stringify(rows)} -- it returns at most one row: the drain the pick is on.`);
  const queued = await get("runner_directives?type=eq.drain-epic&status=eq.queued&select=id");
  console.log(`         AGT-695 live board: ${queued.length} queued drain-epic row(s), drain_standing() -> ${rows.length} row(s)`);
  if (queued.length === 0) {
    assert.strictEqual(rows.length, 0, "no drain-epic directive is queued, so the home must answer no row");
  } else {
    assert.strictEqual(rows.length, 1, `${queued.length} drain-epic row(s) are queued, so the home must answer exactly one`);
    for (const k of ["directive_id", "epic_id", "epic_name", "passed", "oldest_directive_id", "oldest_epic_name"]) {
      assert.ok(k in rows[0], `the home's row lacks ${k}: ${JSON.stringify(rows[0])}`);
    }
    assert.ok(Number.isInteger(rows[0].passed) && rows[0].passed >= 0,
      `passed is ${JSON.stringify(rows[0].passed)} -- it counts the queued drains ahead of this one that hand no member over`);
    assert.ok(queued.some(d => d.id === rows[0].directive_id),
      "the home named a directive that is not a queued drain-epic row");
  }
  results.push("live-the-home-answers-one-row-per-queued-drain-and-none-with-none");

  return results;
}

selfRun(import.meta.url, run);
export default run;
