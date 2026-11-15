// DeepBench v7.0.1036 | tests/regression/agt-495-blocked-drain-passes.test.mjs | AGT-495 -- a blocked drain passes the pick to the next queued drain and keeps its slot; a healthy drain still retires only on its own finish line.
//
// WHAT THIS GUARDS. Until migration `agt495_blocked_drain_passes`, public.drain_epic_next(uuid)
// read the single oldest queued drain-epic directive and RETURNed on `blocked`, so one drain whose
// members could neither finish nor all be delivered held the pick from every later queued drain
// (the rolled-back probe of 2026-10-13: "a second drain is never reached").
//
//   A. pure  -- the mirror docs/design/agt-495-blocked-drain-passes.sql holds the five splices, the
//               probe and its sentinel, and its SQL half still hashes to the designed statement.
//   B. pure  -- gradeProbe() over the two recorded readings: the spliced body's passes, the
//               unchanged body's fails direction 1 and nothing in direction 2 (the control that
//               proves the grader can go red -- the SES-158 assert).
//   C. live  -- (service key, else notRun) ONE call of public.blocked_drain_probe(). It stands
//               three fixture drains and three fixture tickets up inside a sub-block that ends in
//               sentinel P0495, calls drain_epic_next() three times and returns the measurements;
//               every write is rolled back inside the call. gradeProbe() is the verdict.
//
// drain_epic_next(uuid) IS NEVER CALLED FROM HERE DIRECTLY -- the refusal ses-281, ses-424a and
// agt-140 each recorded: it is VOLATILE and retires a live drain. The probe calls it, and rolls back.
import assert from "assert";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MIRROR_REL = "docs/design/agt-495-blocked-drain-passes.sql";
const VERBATIM_MARK = "-- ---- THE MIGRATION, VERBATIM ---";

// md5 of the mirror's SQL half (everything after the marker line, trailing newline stripped) as
// designed in the kickoff -- the text apply_migration was handed.
export const DESIGNED_MD5 = "bb00e3aecc8507f3be64cdf509edd9b6";

export const NEEDLES = [
  "AND id <> ALL (v_passed) -- AGT-495: a drain already read as blocked in this call is passed",
  "v_passed := v_passed || d.id;",
  "IF v_blk_n > 0 THEN",
  "format('passed %s blocked drain(s) - oldest %s (%s): %s',",
  "format('; %s later queued drain(s) also blocked', v_blk_n - 1)",
  "CREATE FUNCTION public.blocked_drain_probe(p_cycle_id uuid DEFAULT NULL)",
  "REVOKE ALL ON FUNCTION public.blocked_drain_probe(uuid) FROM PUBLIC, anon, authenticated;",
  "P0495",
];

// The two readings of the probe, measured by the designer on a local PostgreSQL 16 holding the
// body the repo records (md5 057d8de7bd3780b67c12986ce2c5cbb6) before and after the splice.
export const READING_BEFORE = {
  out1: "blocked", dir1: "A", pick1: null,
  mark1: "1 named member(s) still open and none is claimable now; 1 blocked on another ticket (ZFIX-49501 (blocked by ZFIX-49502))",
  a_status1: "queued", b_status1: "queued", a_slot_kept: true,
  out2: "blocked", dir2: "A",
  detail2: "1 named member(s) still open and none is claimable now; 1 blocked on another ticket (ZFIX-49501 (blocked by ZFIX-49502))",
  out3: "blocked", h_status3: "done", h_acted_by_cycle: true, h_before_images: 1,
  a_status3: "queued", b_status3: "queued", real_queued: 0,
  residue: { items: 0, directives: 0, scope: 0, images: 0 },
};
export const READING_AFTER = {
  ...READING_BEFORE,
  out1: "pick", dir1: "B", pick1: "ZFIX-49503",
  mark1: "passed 1 blocked drain(s) - oldest Tooling (3582d90d): " + READING_BEFORE.mark1,
  detail2: READING_BEFORE.detail2 + "; 1 later queued drain(s) also blocked",
};

export function missingNeedles(text, needles = NEEDLES) {
  return needles.filter(n => !text.includes(n));
}

export function sqlHalf(text) {
  const i = text.indexOf(VERBATIM_MARK);
  assert.notStrictEqual(i, -1, `the mirror has no ${VERBATIM_MARK} marker, so its SQL half cannot be located`);
  return text.slice(text.indexOf("\n", i) + 1).replace(/\n$/, "");
}

// Pure, and the whole verdict: the named cases that FAILED, in order, over one probe row.
export function gradeProbe(j) {
  const failed = [];
  const res = j?.residue ?? {};
  // direction 1 -- THE WHOLE TICKET: drain A is blocked, and the pick is drain B's member.
  if (!(j?.out1 === "pick" && j?.dir1 === "B" && j?.pick1 === "ZFIX-49503")) failed.push("pick-passes-to-next-drain");
  // the mark: a pick handed past a blocked drain names it.
  if (!(typeof j?.mark1 === "string" && j.mark1.startsWith("passed 1 blocked drain(s) - oldest "))) failed.push("pick-carries-the-mark");
  // the slot: the passed drain is not written.
  if (!(j?.a_status1 === "queued" && j?.a_slot_kept === true && j?.a_status3 === "queued")) failed.push("blocked-drain-keeps-its-slot");
  // nothing later picks -> the oldest blocked drain answers. Only gradable with no real drain queued.
  if (j?.real_queued === 0
      && !(j?.out2 === "blocked" && j?.dir2 === "A"
           && typeof j?.detail2 === "string" && j.detail2.endsWith("; 1 later queued drain(s) also blocked"))) {
    failed.push("oldest-blocked-answers-when-none-picks");
  }
  // direction 2 -- a drain at its finish line still retires, with its before-image...
  if (!(j?.h_status3 === "done" && j?.h_acted_by_cycle === true && j?.h_before_images === 1)) failed.push("finish-line-still-retires");
  // ...and one short of it never does: B after it was picked from, A and B after H retired.
  if (!(j?.b_status1 === "queued" && j?.b_status3 === "queued" && j?.a_status3 === "queued")) failed.push("short-of-finish-line-never-retires");
  if (!(res.items === 0 && res.directives === 0 && res.scope === 0 && res.images === 0)) failed.push("residue-zero");
  return failed;
}

async function run() {
  const results = [];

  // --- A: the mirror ----------------------------------------------------------------------------
  const p = path.join(ROOT, MIRROR_REL);
  assert.ok(fs.existsSync(p), `${MIRROR_REL} is missing -- the migration has no mirror`);
  const sql = fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");
  assert.deepStrictEqual(missingNeedles(sql), [], `the mirror lacks: ${JSON.stringify(missingNeedles(sql))}`);
  for (const n of NEEDLES) {
    const mutated = sql.split(n).join("");
    assert.notStrictEqual(mutated, sql, `control: deleting ${n} changed nothing (the SES-158 failure)`);
    assert.deepStrictEqual(missingNeedles(mutated, [n]), [n], `the check did not notice ${n} gone`);
  }
  const half = sqlHalf(sql);
  const md5 = crypto.createHash("md5").update(half, "utf8").digest("hex");
  assert.strictEqual(md5, DESIGNED_MD5,
    `the mirror's SQL half hashes to ${md5} over ${Buffer.byteLength(half)} bytes, not the designed ${DESIGNED_MD5}. `
    + "The mirror is no longer the migration the kickoff designed -- say in the ship what changed and why, then move this constant.");
  assert.notStrictEqual(crypto.createHash("md5").update(half + " ", "utf8").digest("hex"), DESIGNED_MD5,
    "control: the md5 pin cannot tell one extra byte from the designed statement");
  results.push("mirror-holds-the-five-splices-the-probe-and-the-sentinel");

  // --- B: the grader, both ways -----------------------------------------------------------------
  assert.deepStrictEqual(gradeProbe(READING_AFTER), [], "the spliced body's reading must pass every case");
  assert.deepStrictEqual(gradeProbe(READING_BEFORE),
    ["pick-passes-to-next-drain", "pick-carries-the-mark", "oldest-blocked-answers-when-none-picks"],
    "control: the unchanged body's reading must fail direction 1 and ONLY direction 1 -- a drain at its finish line retired before this ship too");
  assert.deepStrictEqual(gradeProbe({ ...READING_AFTER, a_status1: "blocked" }), ["blocked-drain-keeps-its-slot"],
    "control: a passed drain whose row was written must fail the slot case");
  assert.deepStrictEqual(gradeProbe({ ...READING_AFTER, h_status3: "queued" }), ["finish-line-still-retires"],
    "control: a drain at its finish line that did not retire must fail direction 2");
  assert.deepStrictEqual(gradeProbe({ ...READING_AFTER, b_status3: "done" }), ["short-of-finish-line-never-retires"],
    "control: a drain retired short of its finish line must fail direction 2");
  assert.deepStrictEqual(gradeProbe({ ...READING_AFTER, real_queued: 2, out2: "pick", dir2: "other" }), [],
    "a real queued drain picking on call 2 is not a failure -- that case is only gradable on an empty board");
  assert.deepStrictEqual(gradeProbe({}).length, 6, "an empty row fails every always-graded case");
  results.push("grader-passes-the-spliced-reading-and-fails-the-unchanged-one");

  // --- C: live ----------------------------------------------------------------------------------
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!base || !key) {
    notRun("the live probe (arm C: one call of public.blocked_drain_probe())",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent -- the rule is a database function and there is nothing to grade "
      + "it against here. Drive it with: node --env-file-if-exists=.env.local tests/regression/agt-495-blocked-drain-passes.test.mjs");
    return results;
  }
  const hdr = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const r = await fetch(`${base}/rest/v1/rpc/blocked_drain_probe`, { method: "POST", headers: hdr, body: "{}" });
  // a stubbed fetch has no text(): read whichever the answer offers, and let the shape check below decide.
  const text = typeof r.text === "function" ? await r.text() : JSON.stringify(await r.json());
  assert.ok(r.ok, `rpc/blocked_drain_probe -> HTTP ${r.status}: ${text.slice(0, 300)} -- migration agt495_blocked_drain_passes did not land (or PostgREST has not reloaded its schema)`);
  let j = null;
  try { j = JSON.parse(text); } catch { /* graded as not answered below */ }
  console.log(`         AGT-495 blocked-drain probe: ${JSON.stringify(j)}`);

  // TRANSPORT IS NOT A VERDICT (AGT-116): a stubbed fetch left behind by an earlier in-process test
  // answers [] -- see agt-483-parent-score.test.mjs arm C for the measured cause.
  const answered = j !== null && typeof j === "object" && !Array.isArray(j) && typeof j.out1 === "string";
  if (!answered) {
    notRun("the live probe (arm C)",
      `the probe answered ${JSON.stringify(j)}, which is not the jsonb object a service_role PostgREST call returns -- `
      + "nothing about the drain pick was measured here and this is not a pass. Drive it alone: "
      + "node --env-file-if-exists=.env.local tests/regression/agt-495-blocked-drain-passes.test.mjs");
    return results;
  }
  assert.deepStrictEqual(gradeProbe(j), [],
    `the probe failed: ${JSON.stringify(gradeProbe(j))}. If pick-passes-to-next-drain is in that list, `
    + "drain_epic_next() is back to RETURNing on the oldest queued drain's `blocked`, and one drain holds the pick from every later one.");
  if (j.real_queued !== 0) {
    notRun("the none-picks case (arm C, call 2)",
      `${j.real_queued} real drain-epic directive(s) are queued, so call 2's answer belongs to the board, not to the fixtures; the other six cases were graded`);
  }

  // the rollback, read from OUTSIDE the probe in a second statement.
  const get = async q => {
    const g = await fetch(`${base}/rest/v1/${q}`, { headers: hdr });
    assert.ok(g.ok, `${q} -> HTTP ${g.status}`);
    return g.json();
  };
  const items = await get("backlog_items?source_file=eq.agt495-probe&select=id");
  const dirs = await get("runner_directives?body=like.AGT-495%20PROBE%20FIXTURE*&select=id");
  assert.strictEqual(items.length + dirs.length, 0,
    `the probe left ${items.length} ticket(s) and ${dirs.length} directive(s) on the LIVE board -- sentinel P0495 did not roll its fixtures back`);
  results.push("live-a-blocked-drain-passes-the-pick-and-a-healthy-one-retires-only-on-its-finish-line");

  return results;
}

selfRun(import.meta.url, run);
export default run;
