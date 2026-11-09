// DeepBench v7.0.981 | tests/regression/agt-463-flow-checks-read-the-act.test.mjs | AGT-463
//
// FEATURE: AGT-463 -- THE FLOW CHECKS GRADE THE ACT, NOT THE STAMP. Migration
// `agt463_flow_checks_read_the_act`, mirrored byte-identically at
// docs/design/agt-463-flow-checks-read-the-act.sql. Kickoff:
// docs/kickoffs/v7.0.981-AGT-463-flow-checks-read-the-act.md sections 4 and 6; the fixtures and the
// live oracles below are the kickoff's named `S2 oracle` section of docs/harvests/AGT-463.md.
//
// THE DEFECT, measured live on tree `1a9db04` rather than reasoned about. Three readings of
// `public.audit_flow_checks()` graded a STAMP or a population instead of the act:
//   (a) flow-ship-not-closed aged a delivered ticket from `backlog_items.updated_at`, which
//       `scripts/settle-ship.js` never writes (SES-316) and any other writer moves. Live:
//       `projects/dev-manager-capabilities` printed `oldest last updated 2026-09-25 16:26Z;
//       AGT-134, AGT-140, AGT-131` -- minute and ids both belonging to the last toucher.
//   (c) flow-wasted-cycles counted `4 shipped with no push_sha`, and all four were
//       `SCHEDULED-AGENT:` routine runs, which ship no commit by design.
//   (d) flow-filing-outpaces-closing graded every project, `planned` ones included, where nothing
//       can close because no build has started.
//
// FOUR ARMS, split by what each can prove.
//   DOC   -- always runs, no network. The committed mirror carries all nine to-strings of the
//            fragment edit VERBATIM, plus the three disciplines that make the migration safe
//            (`pg_get_functiondef` so the body is edited and never retyped, `expected exactly 1` so
//            a drifted body raises instead of being half-edited, `capture_migration_down` so the
//            down exists before the up). Every clause carries a MUTATE-IT control: the needle is
//            removed from a copy and the clause re-run, so a clause cannot pass by matching
//            nothing -- the vacuity failure SES-158 paid for.
//   PURE  -- always runs, no network. `settledAt`, `isNoPush` and `filingFires` re-implement
//            fragment pairs 4, 6 and 8 over the harvest's fixtures, and assert WHICH input decided
//            the answer, never only that something was returned (STANDARDS.md Section 4, the
//            LOO-013 lesson).
//   LIVE  -- A, B and C read the rpc with the service key and grade its text against an oracle
//            this file recomputes from its OWN REST reads. Each carries a control that FAILS on the
//            pre-change body, so a green arm is reading the new behaviour and not merely that the
//            rpc answered something.
//
// NO WRITES ANYWHERE IN THIS FILE (pattern:76). Every live call is a GET or the STABLE rpc read;
// nothing is inserted, tagged, reset or cleaned up.
//
// DECLARED, NOT SILENT -- read this before trusting a green run. The live arms grade the SHIPPED
// FUNCTION BODY, which only an applied migration can change. When the rpc still answers the
// pre-change body (`oldest last updated` in its text), this file DECLARES the three live arms
// notRun and names the unapplied migration as the reason, rather than passing them. It does NOT
// treat every unexpected shape that way: a body carrying BOTH phrases, or neither while delivered
// tickets exist, is a half-applied or drifted body and is RED. Once the migration is applied the
// probe flips on its own and the live arms run for real -- there is no flag and no env var that can
// hold them off.
//
// BASELINE: RED on the unchanged tree -- the DOC arm fails outright (the mirror does not exist) and
// each live control fails, because the pre-change body prints `oldest last updated`, counts routine
// runs as wasted cycles, and grades projects that are not executing.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const MIRROR_REL = "docs/design/agt-463-flow-checks-read-the-act.sql";
const MIRROR_ABS = path.join(REPO, MIRROR_REL);

const BASE = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
const KEY = process.env.SUPABASE_SERVICE_KEY ?? "";
const HEAD = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const SHIP_SLUG = "flow-ship-not-closed";
const WASTE_SLUG = "flow-wasted-cycles";
const FILING_SLUG = "flow-filing-outpaces-closing";
// The sliding window the rpc and this file each read a few seconds apart. A row inside the fringe
// may be on either side of the boundary; the band is always REPORTED, never silently tolerated.
const FRINGE_MS = 120_000;
// A truncated REST page would make every oracle below quietly too small, so each read declares a
// ceiling it then asserts it did not reach.
const PAGE = 2000;

// --- the mirror's nine to-strings, and why losing one is a real defect -------------------------
const CLAUSES = [
  { needle: "min(x.settled_at) AS oldest,",
    why: "arm (a) must age a delivered ticket from the settle; `min(b.updated_at)` is the stamp AGT-463 removed" },
  { needle: "(array_agg(b.backlog_id ORDER BY x.settled_at, b.backlog_id))[1:10] AS ids",
    why: "the ids the finding names are the OLDEST SETTLED ten; ordering them by the stamp names the wrong tickets" },
  { needle: "AND x.settled_at < now() - (t->>'ship_open_days')::numeric * interval '1 day'",
    why: "the age window itself must read the settle, or the count is the stamp's count however the text is worded" },
  { needle: "CROSS JOIN LATERAL (SELECT coalesce((SELECT max(d.decided_at) FROM public.runner_decisions d WHERE d.backlog_id = b.backlog_id AND d.kind = 'ticket-status'), b.updated_at) AS settled_at) x",
    why: "where `settled_at` comes from: the NEWEST ticket-status decision, coalesced to the stamp so an undecided ticket stays in the report instead of dropping out of it" },
  { needle: "oldest settled %s",
    why: "the sentence must name the clock it read; `oldest last updated` over a settle-derived number is a lie about its own figure" },
  { needle: "AND coalesce(c.notes, '') NOT LIKE 'SCHEDULED-AGENT:%' AND NOT EXISTS (SELECT 1 FROM public.runner_directives d WHERE d.acted_cycle = c.id AND d.outcome = 'shipped'))::integer",
    why: "arm (c) must exclude a routine run and a directive delivery -- both ship no commit BY DESIGN, and counting them reported a healthy run as a wasted one" },
  { needle: "%s shipped with nothing to push (routine runs and directive deliveries excluded); by cause: %s'",
    why: "the label must say what the number now counts, and AGT-367's `by cause` list must survive the edit" },
  { needle: "WHERE p.status = 'executing'",
    why: "arm (d) must grade executing projects only; a planned project cannot close a ticket, so the ratio fires on an empty denominator" },
  { needle: "the ratio limit is %s (executing projects only)'",
    why: "the filing sentence must declare the population it graded, or a reader cannot tell which projects were in it" },
];
// The three disciplines that make a body edit safe. Each may legitimately appear more than once, so
// their controls remove EVERY occurrence rather than the first.
const DISCIPLINES = [
  { needle: "pg_get_functiondef",
    why: "the body is edited FROM the live definition, never retyped -- retyping a 150-line plpgsql body to change nine fragments is how an unrelated line gets lost" },
  { needle: "expected exactly 1",
    why: "every fragment is asserted to match exactly once, so a body that drifted raises instead of being silently half-edited (.claude/rules/supabase-function-signature.md)" },
  { needle: "capture_migration_down",
    why: "the down was captured BEFORE the up; a down taken afterwards restores the bug" },
];

// --- PURE: fragment pair 4 -- the settle, not the stamp ----------------------------------------
// `coalesce((SELECT max(d.decided_at) ... kind = 'ticket-status'), b.updated_at)`. Exported so
// SES-28's self-run guard is not the only thing that can reach it.
export function settledAt(item, decisions) {
  const own = (decisions ?? []).filter(d => d.backlog_id === item.backlog_id && d.kind === "ticket-status");
  if (!own.length) return item.updated_at;
  return own.reduce((a, b) => (Date.parse(b.decided_at) > Date.parse(a.decided_at) ? b : a)).decided_at;
}

// --- PURE: fragment pair 6 -- a cycle with nothing to push ------------------------------------
// `c.outcome = 'shipped' AND c.push_sha IS NULL AND coalesce(c.notes, '') NOT LIKE
//  'SCHEDULED-AGENT:%' AND NOT EXISTS (<a shipped directive acted on this cycle>)`.
export function isNoPush(cycle, directives) {
  if (cycle.outcome !== "shipped") return false;
  if (cycle.push_sha !== null && cycle.push_sha !== undefined) return false;
  if (/^SCHEDULED-AGENT:/.test(cycle.notes ?? "")) return false;
  return !(directives ?? []).some(d => d.acted_cycle === cycle.id && d.outcome === "shipped");
}

// --- PURE: fragment pair 8 plus arm (d)'s unchanged ratio --------------------------------------
export function filingFires(project, t) {
  if (project.status !== "executing") return false;
  return project.filed >= Number(t.filing_min) && project.filed > Number(t.filing_ratio) * project.closed;
}

// --- live reads (read-only) --------------------------------------------------------------------
async function rpcRead(name) {
  const res = await fetch(`${BASE}/rest/v1/rpc/${name}`, {
    method: "POST", headers: { ...HEAD, "Content-Type": "application/json" }, body: "{}",
  });
  const text = await res.text();
  assert.notStrictEqual(res.status, 404, `rpc/${name} does not exist -- the pre-change red, never a pass`);
  assert.ok(res.ok, `rpc/${name} returned HTTP ${res.status}: ${text.slice(0, 240)}`);
  return JSON.parse(text);
}
async function rows(table, query) {
  const res = await fetch(`${BASE}/rest/v1/${table}?${query}&limit=${PAGE}`, { headers: HEAD });
  const text = await res.text();
  assert.ok(res.ok, `GET ${table}?${query} returned HTTP ${res.status}: ${text.slice(0, 240)}`);
  const out = JSON.parse(text);
  assert.ok(out.length < PAGE,
    `GET ${table}?${query} filled its ${PAGE}-row page -- the oracle below would be silently short`);
  return out;
}
const inList = vals => `in.(${vals.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")})`;
const chunk = (list, size) => list.reduce((acc, v, i) => (i % size ? acc[acc.length - 1].push(v) : acc.push([v]), acc), []);
// `to_char(<ts> AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI"Z"')`, reproduced rather than recalled.
const minuteUTC = iso => new Date(iso).toISOString().slice(0, 16).replace("T", " ");
const textsOf = list => list.flatMap(e => (e?.locations ?? []).map(l => String(l.text ?? "")));

async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`${name}: ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };

  // --- DOC: the committed mirror ---------------------------------------------------------------
  await arm("DOC the mirror carries all nine edits", () => {
    assert.ok(fs.existsSync(MIRROR_ABS),
      `${MIRROR_REL} is missing -- the mirror is the only in-repo copy of what was applied`);
    const sql = fs.readFileSync(MIRROR_ABS, "utf8");

    for (const c of CLAUSES) {
      const n = sql.split(c.needle).length - 1;
      assert.strictEqual(n, 1,
        `${MIRROR_REL} must hold \`${c.needle.slice(0, 60)}\` exactly once, found ${n} -- ${c.why}`);
    }
    for (const d of DISCIPLINES) {
      assert.ok(sql.includes(d.needle),
        `${MIRROR_REL} must hold \`${d.needle}\` -- ${d.why}`);
    }

    // MUTATE-IT CONTROLS: every clause above must be ABLE to fail. The needle is removed from a
    // copy and the clause re-run against it; a needle that still "matches" the mutated text was
    // asserting nothing (SES-158).
    for (const c of [...CLAUSES, ...DISCIPLINES]) {
      const mutated = sql.split(c.needle).join("/* REMOVED BY THE CONTROL */");
      assert.ok(!mutated.includes(c.needle),
        `CONTROL: removing \`${c.needle.slice(0, 60)}\` must actually remove it`);
      assert.ok(sql.includes(c.needle) && !mutated.includes(c.needle),
        `CONTROL: the clause for \`${c.needle.slice(0, 60)}\` must distinguish the real mirror from the mutated one`);
    }

    // The identity argument list is unchanged, so no overload is created and nothing is owed a
    // DROP -- but the mirror must still prove the single pg_proc row, because that rule's whole
    // lesson is that the migration's success flag is not the evidence.
    assert.ok(/pg_proc/.test(sql) && sql.includes("expected exactly 1 (.claude/rules/supabase-function-signature.md)"),
      `${MIRROR_REL} must assert exactly one audit_flow_checks pg_proc row and cite the rule it obeys`);
    // And the shape assertions the kickoff fixed: the stamp survives twice, the settle reads three
    // times, AGT-367's cause list once.
    for (const want of ["expected exactly 2", "expected exactly 3", "expected exactly 1 -- AGT-367"]) {
      assert.ok(sql.includes(want), `${MIRROR_REL} must assert the post-edit body shape: \`${want}\``);
    }
  });

  // --- PURE: the three fragments, re-implemented over the harvest's fixtures --------------------
  await arm("PURE pairs 4, 6 and 8 over the harvest fixtures", () => {
    // Pair 4. AGT-401's two stamps: the row says 08:11:57, the decision says 08:27:17.
    assert.strictEqual(
      settledAt({ backlog_id: "AGT-401", updated_at: "2026-10-08T08:11:57.081219+00:00" },
                [{ backlog_id: "AGT-401", kind: "ticket-status", decided_at: "2026-10-08T08:27:17.633284+00:00" }]),
      "2026-10-08T08:27:17.633284+00:00", "the ticket-status decision wins over the row's stamp");
    assert.strictEqual(
      settledAt({ backlog_id: "AGT-401", updated_at: "2026-10-08T08:11:57.081219+00:00" },
                [{ backlog_id: "AGT-401", kind: "ticket-status", decided_at: "2026-10-08T08:27:17.633284+00:00" },
                 { backlog_id: "AGT-401", kind: "ticket-status", decided_at: "2026-10-08T08:27:36.610441+00:00" }]),
      "2026-10-08T08:27:36.610441+00:00", "with two decisions the NEWEST wins -- max(decided_at), not the first found");
    assert.strictEqual(settledAt({ backlog_id: "X", updated_at: "2026-10-02T16:45:16Z" }, []),
      "2026-10-02T16:45:16Z", "an undecided ticket keeps its stamp and stays in the report");
    assert.strictEqual(
      settledAt({ backlog_id: "X", updated_at: "U" }, [{ backlog_id: "X", kind: "placement", decided_at: "later" }]),
      "U", "a decision of another kind is not a settle");
    // CONTROL: the two inputs differ, so a settledAt() that returned the stamp unconditionally
    // would fail the first clause rather than coincide with it.
    assert.notStrictEqual("2026-10-08T08:11:57.081219+00:00", "2026-10-08T08:27:17.633284+00:00");

    // Pair 6. Each exclusion asserted ALONE, so the branch that fired is named.
    assert.strictEqual(isNoPush({ id: "c1", outcome: "shipped", push_sha: null, notes: "x" }, []), true,
      "a shipped cycle with no sha, no routine note and no directive act IS nothing to push");
    assert.strictEqual(isNoPush({ id: "c2", outcome: "shipped", push_sha: null, notes: "SCHEDULED-AGENT: rank-backlog — 25 ..." }, []), false,
      "a routine run ships no commit by design");
    assert.strictEqual(isNoPush({ id: "bb848b5a", outcome: "shipped", push_sha: null, notes: "tokens_at_open: ..." },
                                [{ acted_cycle: "bb848b5a", outcome: "shipped" }]), false,
      "a directive delivery acted on this cycle, so the cycle moved work without a sha");
    assert.strictEqual(isNoPush({ id: "c3", outcome: "shipped", push_sha: null, notes: null },
                                [{ acted_cycle: "c3", outcome: "carded" }]), true,
      "only a SHIPPED directive excludes -- a carded one delivered nothing");
    assert.strictEqual(isNoPush({ id: "c4", outcome: "shipped", push_sha: "abc", notes: null }, []), false,
      "a cycle with a sha pushed something");
    assert.strictEqual(isNoPush({ id: "c5", outcome: "did_not_run", push_sha: null, notes: null }, []), false,
      "a cycle that did not run is counted by its own arm, never this one");
    // CONTROL: the directive exclusion must key off the CYCLE, not merely off a directive existing.
    assert.strictEqual(isNoPush({ id: "c6", outcome: "shipped", push_sha: null, notes: null },
                                [{ acted_cycle: "another-cycle", outcome: "shipped" }]), true,
      "control: a shipped directive on a DIFFERENT cycle must not exclude this one");

    // Pair 8 plus the unchanged ratio.
    const t = { filing_min: 10, filing_ratio: 2 };
    assert.strictEqual(filingFires({ status: "planned", filed: 15, closed: 0 }, t), false,
      "a planned project cannot close anything, so it is not filing faster than it closes");
    assert.strictEqual(filingFires({ status: "executing", filed: 15, closed: 0 }, t), true,
      "an executing project filing 15 against 0 closes fires");
    assert.strictEqual(filingFires({ status: "executing", filed: 10, closed: 5 }, t), false,
      "10 > 2 * 5 is false -- the ratio, not the count, decides");
    assert.strictEqual(filingFires({ status: "executing", filed: 9, closed: 0 }, t), false,
      "below filing_min nothing fires however lopsided the ratio");
    assert.strictEqual(filingFires({ status: "paused", filed: 15, closed: 0 }, t), false,
      "paused is not executing");
    // CONTROL: the status is the ONLY difference between the first two cases, so the project-status
    // filter is what decided them and not the counts.
    assert.notStrictEqual(filingFires({ status: "planned", filed: 15, closed: 0 }, t),
                          filingFires({ status: "executing", filed: 15, closed: 0 }, t));
  });

  if (!BASE || !KEY) {
    notRun("AGT-463 live arms (A, B, C)",
      "SUPABASE_URL + SUPABASE_SERVICE_KEY absent -- the rpc's three re-keyed readings are unverified here. Run: node --env-file-if-exists=.env.local tests/regression/agt-463-flow-checks-read-the-act.test.mjs");
    if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n  - ${failures.join("\n  - ")}`);
    console.log("[AGT-463] flow checks: the mirror and the three fragments verified; the live arms were declared not run");
    return ["doc", "pure"];
  }

  const list = await rpcRead("audit_flow_checks");
  assert.ok(Array.isArray(list), `audit_flow_checks answered ${typeof list}, expected an array`);
  const texts = textsOf(list);
  const sawStamp = texts.some(x => x.includes("oldest last updated"));
  const sawSettle = texts.some(x => x.includes("oldest settled"));
  const shipEls = list.filter(e => e?.check_slug === SHIP_SLUG);

  // WHICH BODY ANSWERED. A body carrying both phrases is half-applied, and a body carrying neither
  // while delivered tickets are being reported has drifted: both are RED here, never declared.
  assert.ok(!(sawStamp && sawSettle),
    "the live body prints BOTH `oldest last updated` and `oldest settled` -- half-applied, never a pass");
  assert.ok(sawStamp || sawSettle || shipEls.length === 0,
    `the live body answered ${shipEls.length} ${SHIP_SLUG} element(s) and named neither clock -- drifted, never a pass`);

  if (sawStamp) {
    notRun("AGT-463 live arms (A, B, C)",
      `rpc/audit_flow_checks still answers the PRE-CHANGE body (its text reads \`oldest last updated\`), so migration agt463_flow_checks_read_the_act -- mirrored at ${MIRROR_REL} -- is authored but NOT APPLIED. The three re-keyed readings cannot be graded against a body that does not carry them. Apply the migration and re-run: node --env-file-if-exists=.env.local tests/regression/agt-463-flow-checks-read-the-act.test.mjs`);
    if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n  - ${failures.join("\n  - ")}`);
    console.log("[AGT-463] flow checks: the mirror and the three fragments verified; the live arms were declared not run -- the migration is unapplied");
    return ["doc", "pure"];
  }

  const thresholds = (await rows("runner_settings", "id=eq.1&select=flow_check_thresholds"))[0]?.flow_check_thresholds;
  assert.ok(thresholds, "runner_settings.flow_check_thresholds is the function's own source for every window");

  // --- A. flow-ship-not-closed reads the settle ------------------------------------------------
  await arm("A live flow-ship-not-closed ages from the settle", async () => {
    assert.ok(!texts.some(x => x.includes("oldest last updated")),
      "no element may still print `oldest last updated` -- that phrase is what AGT-463 removed");

    const days = Number(thresholds.ship_open_days);
    const cut = Date.now() - days * 86_400_000;
    const delivered = await rows("backlog_items", "status=eq.delivered&select=backlog_id,updated_at,epic_id");
    const epics = await rows("epics", "select=id,project_id");
    const projects = await rows("projects", "select=id,slug");
    const projectOf = new Map(projects.map(p => [p.id, p.slug]));
    const slugOfEpic = new Map(epics.map(e => [e.id, projectOf.get(e.project_id)]));
    const decisions = [];
    for (const part of chunk(delivered.map(d => d.backlog_id), 100)) {
      decisions.push(...await rows("runner_decisions",
        `kind=eq.ticket-status&backlog_id=${inList(part)}&select=backlog_id,decided_at`));
    }
    const withKind = decisions.map(d => ({ ...d, kind: "ticket-status" }));

    const bySlug = new Map();
    for (const item of delivered) {
      const slug = slugOfEpic.get(item.epic_id);
      if (!slug) continue;                                  // the rpc's joins are INNER joins too
      const settled = settledAt(item, withKind);
      const ms = Date.parse(settled);
      if (ms >= cut) continue;
      // The fringe: the rpc read now() seconds before this file did, so a row this close to the
      // boundary may be inside one window and outside the other.
      const fringe = Math.abs(ms - cut) <= FRINGE_MS;
      if (!bySlug.has(slug)) bySlug.set(slug, { kept: [], fringe: 0, stamps: [] });
      const g = bySlug.get(slug);
      if (fringe) { g.fringe += 1; } else { g.kept.push({ id: item.backlog_id, settled, ms }); }
      g.stamps.push(Date.parse(item.updated_at));
    }

    assert.ok(shipEls.length > 0, `the rpc answered no ${SHIP_SLUG} element; the oracle holds ${bySlug.size} slug(s) over the window`);
    let discriminated = null;
    for (const el of shipEls) {
      const loc = el.locations[0].location;
      const slug = loc.replace(/^projects\//, "");
      const m = el.locations[0].text.match(
        /^(\d+) delivered ticket\(s\) untouched for more than (\d+) day\(s\); oldest settled (\d{4}-\d{2}-\d{2} \d{2}:\d{2})Z; (.+)$/);
      assert.ok(m, `${loc} text is not the shipped sentence: ${el.locations[0].text}`);
      const g = bySlug.get(slug) ?? { kept: [], fringe: 0, stamps: [] };
      const live = Number(m[1]);
      if (g.fringe === 0) {
        assert.strictEqual(live, g.kept.length, `${loc} counted ${live}, the oracle kept ${g.kept.length}`);
      } else {
        assert.ok(live >= g.kept.length && live <= g.kept.length + g.fringe,
          `${loc} counted ${live}, outside the boundary band [${g.kept.length}, ${g.kept.length + g.fringe}]`);
        console.log(`      ${loc}: ${g.fringe} row(s) within ${FRINGE_MS / 1000}s of the ${m[2]}-day boundary; the count is asserted as a band`);
      }
      const ordered = [...g.kept].sort((a, b) => a.ms - b.ms || a.id.localeCompare(b.id));
      if (ordered.length && g.fringe === 0) {
        assert.strictEqual(m[3], minuteUTC(ordered[0].settled),
          `${loc} printed oldest settled ${m[3]}Z; the oracle's oldest settle is ${minuteUTC(ordered[0].settled)}Z`);
        assert.strictEqual(m[4], ordered.slice(0, 10).map(r => r.id).join(", "),
          `${loc} named the wrong ten: the oracle's first ten by (settled, backlog_id) are ${ordered.slice(0, 10).map(r => r.id).join(", ")}`);
      }
      // CONTROL: on at least one slug the stamp's oldest minute must DIFFER from the settle's, so
      // a body that still read `b.updated_at` would print a different sentence here.
      if (ordered.length && g.stamps.length) {
        const stampMin = minuteUTC(new Date(Math.min(...g.stamps)).toISOString());
        if (stampMin !== m[3] && discriminated === null) discriminated = `${loc}: stamp ${stampMin}Z vs settle ${m[3]}Z`;
      }
    }
    if (discriminated) console.log(`      CONTROL: ${discriminated} -- the old body could not have printed this`);
    else console.log("      NOTE: no slug discriminates today -- every project's oldest stamp and oldest settle fall in the same minute");
  });

  // --- B. flow-wasted-cycles counts only cycles that had something to push ---------------------
  await arm("B live flow-wasted-cycles excludes routine runs and directive deliveries", async () => {
    const hours = Number(thresholds.window_hours);
    const sinceISO = new Date(Date.now() - hours * 3600_000).toISOString();
    const cycles = await rows("runner_cycles", `started_at=gte.${sinceISO}&select=id,outcome,push_sha,notes,started_at`);
    const candidates = cycles.filter(c => c.outcome === "shipped" && c.push_sha === null);
    const acted = [];
    for (const part of chunk(candidates.map(c => c.id), 100)) {
      if (!part.length) continue;
      acted.push(...await rows("runner_directives", `outcome=eq.shipped&acted_cycle=${inList(part)}&select=acted_cycle`));
    }
    const directives = acted.map(a => ({ acted_cycle: a.acted_cycle, outcome: "shipped" }));
    const since = Date.parse(sinceISO);
    const inBand = c => Math.abs(Date.parse(c.started_at) - since) <= FRINGE_MS;
    const oracleNoPush = cycles.filter(c => !inBand(c) && isNoPush(c, directives)).length;
    const bandNoPush = cycles.filter(c => inBand(c) && isNoPush(c, directives)).length;
    const rawNoPush = candidates.filter(c => !inBand(c)).length;

    const el = list.find(e => e?.check_slug === WASTE_SLUG);
    if (!el) {
      // No element is not a pass by default: the oracle must explain the silence.
      const total = cycles.length;
      const gated = cycles.filter(c => c.outcome === "gated_before_build").length;
      const dnr = cycles.filter(c => c.outcome === "did_not_run").length;
      const pct = total ? 100 * (gated + dnr + oracleNoPush) / total : 0;
      assert.ok(total < Number(thresholds.wasted_min_cycles) || pct < Number(thresholds.wasted_pct),
        `no ${WASTE_SLUG} element, but ${total} cycle(s) at ${pct.toFixed(0)}% wasted clear both thresholds`);
      console.log(`      NOTE: no ${WASTE_SLUG} element today and the oracle explains it (${total} cycles, ${pct.toFixed(0)}% wasted)`);
      return;
    }
    const m = el.locations[0].text.match(
      /(\d+) of (\d+) cycles .* (\d+) gated_before_build, (\d+) did_not_run, (\d+) shipped with nothing to push/);
    assert.ok(m, `${WASTE_SLUG} text is not the shipped sentence: ${el.locations[0].text}`);
    const live = Number(m[5]);
    if (bandNoPush === 0) {
      assert.strictEqual(live, oracleNoPush,
        `the rpc counted ${live} cycle(s) with nothing to push; the oracle counted ${oracleNoPush}`);
      console.log(`      oracle: ${oracleNoPush} with nothing to push (exact -- no cycle on the ${hours} h boundary)`);
    } else {
      assert.ok(live >= oracleNoPush && live <= oracleNoPush + bandNoPush,
        `the rpc's ${live} is outside the boundary band [${oracleNoPush}, ${oracleNoPush + bandNoPush}]`);
      console.log(`      oracle: ${live} within [${oracleNoPush}, ${oracleNoPush + bandNoPush}] -- ${bandNoPush} cycle(s) sit on the ${hours} h boundary`);
    }
    // CONTROL: the unexcluded count must be STRICTLY larger, so the pre-change body -- which
    // counted every shipped cycle with no sha -- would have printed a different number here.
    if (rawNoPush > oracleNoPush) {
      console.log(`      CONTROL: the old body would have printed ${rawNoPush}, not ${oracleNoPush}`);
    } else {
      console.log("      NOTE: no routine run or directive act in the window -- the two counts coincide today");
    }
    assert.ok(el.locations[0].text.includes("(routine runs and directive deliveries excluded)"),
      `the sentence must declare what it excluded: ${el.locations[0].text}`);
  });

  // --- C. flow-filing-outpaces-closing grades executing projects only -------------------------
  await arm("C live flow-filing-outpaces-closing grades executing projects only", async () => {
    const els = list.filter(e => e?.check_slug === FILING_SLUG);
    if (!els.length) {
      console.log(`      NOTE: no ${FILING_SLUG} finding today; the arm is vacuous and says so`);
      return;
    }
    for (const el of els) {
      const loc = el.locations[0].location;
      const m = loc.match(/^projects\/(.+)\/filing$/);
      assert.ok(m, `${FILING_SLUG} location is not projects/<slug>/filing: ${loc}`);
      const got = await rows("projects", `slug=eq.${encodeURIComponent(m[1])}&select=status`);
      assert.strictEqual(got[0]?.status, "executing",
        `${loc} was graded while the project is ${got[0]?.status} -- only an executing project can close a ticket`);
      assert.ok(el.locations[0].text.includes("(executing projects only)"),
        `the sentence must declare the population it graded: ${el.locations[0].text}`);
    }
    console.log(`      oracle: ${els.length} filing finding(s), every one on an executing project`);
  });

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n  - ${failures.join("\n  - ")}`);
  console.log("[AGT-463] flow checks: the mirror, the three fragments, and the rpc's three re-keyed readings graded against an independent oracle");
  return ["doc", "pure", "ship-not-closed", "wasted-cycles", "filing"];
}

selfRun(import.meta.url, run);
export default run;
