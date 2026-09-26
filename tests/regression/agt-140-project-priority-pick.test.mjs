// DeepBench v7.0.604 | tests/regression/agt-140-project-priority-pick.test.mjs | AGT-140 -- THE
// PICK HONOURS `projects.priority`, IN THE SHIPPED SQL AND IN THE ORDER THE DATABASE ACTUALLY
// RETURNS.
//
// THE DEFECT THIS PINS, MEASURED LIVE 2026-09-26 AND NOT RECALLED. John declared three projects
// `executing` on 2026-09-25 -- `auditor-enhancements` (priority 1), `dev-manager-capabilities` (2),
// `agent-training` (3). Neither of the platform's two pick homes, `prime_directive_queue()` and
// `drain_epic_next(uuid)`, read `projects.priority` at all: the first key that could tell two
// executing projects apart was the FILING LANE, and after that the queue number. So the selfbuild
// lane served
//
//   pos 1  AGT-141  agent-training            priority 3, queue 25, 1 cycle
//   pos 2  AGT-132  dev-manager-capabilities  priority 2, queue 30, 2 cycles
//   pos 3  AGT-138  agent-training            priority 3, queue 33, 2 cycles
//
// and `runner_should_boot()` handed `AGT-141` to the next cycle. A one-cycle ticket in the THIRD
// project outranked an open buildable ticket in the SECOND.
//
// WHY THIS FILE EXISTS RATHER THAN A NOTE IN THE KICKOFF. The two functions above decide which
// ticket EVERY future cycle picks. A regression here does not announce itself -- nothing errors,
// nothing empties, the runner simply keeps building the wrong project, indefinitely and silently,
// and the only symptom is a ranking a human would have to notice by eye. That is precisely the
// class of defect a suite has to hold, so the property is pinned in two independent places.
//
// ARM A -- THE SHIPPED TEXT (no credentials, always runs). It reads
// `docs/design/agt-140-project-priority-pick.sql`, the migration this ticket landed, and asserts
// that in EACH function's pick `ORDER BY` the project-priority key precedes the `filed_at` key.
// The two functions spell that differently and the arm resolves each one honestly rather than
// grepping for a string that happens to appear:
//   * `drain_epic_next(uuid)` orders on `pj.priority` and on a `CASE` over `b.filed_at` directly,
//     so its keys carry the two column names themselves;
//   * `prime_directive_queue()` orders on `sort_project` and `sort_lane`, which are SELECT-list
//     aliases inside the `picks` CTE, so each key is resolved BACK to its defining expression
//     (`CASE WHEN pj.status = 'executing' THEN pj.priority END`, and the `filed_at` CASE) before
//     the precedence is judged.
// NAMED DEVIATION from the kickoff's §4 wording, which asked for "`priority` precedes `filed_at`
// inside its ORDER BY" in each function: taken literally that is unsatisfiable for
// `prime_directive_queue()`, whose ORDER BY the same kickoff specifies as
// `lane_ord, sort_key, sort_project NULLS LAST, sort_lane, ...` -- neither word appears in it. The
// alias resolution above is the same assertion made honestly; grading the literal words would have
// forced the ORDER BY to be written some other way than the kickoff itself specifies.
//
// THE SES-158 CONTROL, and the reason arm A is not decoration. A text check that only ever sees
// the fixed tree proves nothing about its own teeth: it would report the same green if it were
// matching on the wrong thing entirely. So the arm re-runs its whole judgement over a MUTANT of the
// shipped text with the project-priority key deleted from each ORDER BY, and requires that to
// THROW. A check that cannot fail is not a check.
//
// ARM B -- THE ORDER THE DATABASE RETURNED (live, `notRun` without credentials). It calls
// `rpc/prime_directive_queue` and grades the returned sequence, DELIBERATELY WITHOUT RE-SORTING IT
// IN JS (SES-45): a second implementation of the ordering written here would only agree with
// itself, and two agreeing implementations of a wrong rule read exactly like a correct one. What is
// asserted is a PROPERTY OF the returned order -- monotonicity in
// `[project_priority, laneOf(filed_at), queue, predicted_cycles]` -- plus the standalone clause the
// inversion above fails: no row of priority N may precede a row of priority < N.
//
// ARM B'S NON-VACUITY GUARD, which matters more here than the monotonicity itself. If the lane
// served only one project, or if priority happened to agree with queue order on today's board, a
// correct result would be indistinguishable from the BROKEN one -- the old function would pass this
// file. So the arm looks for an adjacent pair whose priority RISES while its `(lane, queue, cycles)`
// triple FALLS: a pair the pre-AGT-140 order would have put the other way round. Found, the rule
// was observed; not found, the arm says so with `notRun` rather than banking an untested green.
//
// `drain_epic_next(uuid)` IS DELIBERATELY NEVER CALLED, and that is a refusal ses-281 and ses-424a
// have both made before it: the function is not read-only -- it retires John's standing directive
// when a drain's required members are done, and a regression run must never do that. Its half of
// the property is graded by arm A over the shipped text, and was asserted a third time by the
// migration's own trailing DO block in the same transaction that wrote it. Declared, not silently
// skipped.
//
// NO MODEL CALL, NO SPEND, NO WRITES. One file read and four REST reads.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const MIGRATION = path.join(ROOT, "docs", "design", "agt-140-project-priority-pick.sql");
const LANE = "selfbuild";
const MAX = Number.MAX_SAFE_INTEGER;

// ---------------------------------------------------------------------------------------------
// Arm A -- the shipped migration text.
// ---------------------------------------------------------------------------------------------

// The two pick ORDER BYs, each addressed by the text that can only precede it. `drain`'s is the
// one inside the pick SELECT (`ORDER BY pj.priority, ...` before its `LIMIT 1`); `prime`'s is the
// window ORDER BY inside `ranked`.
const ORDER_BY_SITES = [
  {
    fn: "drain_epic_next(uuid)",
    // The PICK's ORDER BY specifically -- the function holds three other `ORDER BY ... LIMIT 1`
    // SELECTs (the directive lookup among them), so the clause is addressed from the pick's own
    // `INTO v_pick, v_queue` forward rather than by the first match in the body.
    extract: src => {
      const body = sliceFunction(src, "public.drain_epic_next(p_cycle_id uuid)");
      const at = body.indexOf("INTO v_pick, v_queue");
      assert.ok(at >= 0, "drain_epic_next(uuid): could not find the pick SELECT (`INTO v_pick, v_queue`)");
      const m = body.slice(at).match(/\n\s*ORDER BY ([\s\S]*?)\n\s*LIMIT 1;/);
      assert.ok(m, "drain_epic_next(uuid): could not find the pick SELECT's `ORDER BY ... LIMIT 1;`");
      return m[1];
    },
  },
  {
    fn: "prime_directive_queue()",
    extract: src => {
      const body = sliceFunction(src, "public.prime_directive_queue()");
      const m = body.match(/row_number\(\) OVER \(\s*\n\s*ORDER BY ([\s\S]*?)\n\s*\)::int AS pos/);
      assert.ok(m, "prime_directive_queue(): could not find the `row_number() OVER (ORDER BY ...)` in `ranked`");
      return m[1];
    },
  },
];

// A function's text, from its CREATE header to the `$function$` that closes it. Addressing the
// bodies separately is what lets each ORDER BY be attributed to the right function -- a regex over
// the whole file would happily read one function's keys as the other's.
function sliceFunction(src, signature) {
  const start = src.indexOf(`CREATE OR REPLACE FUNCTION ${signature}`);
  assert.ok(start >= 0, `the migration does not define ${signature}`);
  const open = src.indexOf("AS $function$", start);
  assert.ok(open > start, `${signature}: no \`AS $function$\` opener`);
  const close = src.indexOf("$function$", open + "AS $function$".length);
  assert.ok(close > open, `${signature}: no closing \`$function$\``);
  return src.slice(start, close);
}

// Strip `-- ...` line comments. Done before every split below: a comment is not part of an
// expression and a comma inside one would shred the list it sits in.
const uncomment = text => text.replace(/--[^\n]*/g, " ");

// Split a comma-separated SQL list at TOP-LEVEL commas only. Parenthesised subselects and quoted
// literals both carry commas (`to_char(..., 'Mon DD, FMHH12:MI AM')` carries one of each), and a
// naive split would shred them into fragments that each look like an item.
function splitList(text) {
  const out = [];
  let depth = 0;
  let quoted = false;
  let cur = "";
  for (const ch of text) {
    if (ch === "'") quoted = !quoted;
    if (!quoted) {
      if (ch === "(") depth++;
      else if (ch === ")") depth--;
      if (ch === "," && depth === 0) { out.push(cur); cur = ""; continue; }
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out.map(k => k.replace(/\s+/g, " ").trim()).filter(Boolean);
}

const splitKeys = clause => splitList(uncomment(clause));

// A CTE's body -- what sits INSIDE the `<name> AS ( ... )` parentheses. The opening paren is
// excluded deliberately: leaving it in leaves every later split one level deep forever, so the
// whole CTE reads as a single unsplittable item.
function sliceCte(body, name) {
  const open = body.indexOf(`\n${name} AS (`);
  if (open < 0) return null;
  const lparen = body.indexOf("(", open);
  let depth = 0;
  for (let i = lparen; i < body.length; i++) {
    if (body[i] === "(") depth++;
    else if (body[i] === ")" && --depth === 0) return body.slice(lparen + 1, i);
  }
  return null;
}

// The SELECT-list items of one `SELECT ... FROM` branch, in order.
function selectItems(branch) {
  const text = uncomment(branch);
  const from = text.search(/\n\s{2,}FROM\s/);
  const head = (from >= 0 ? text.slice(0, from) : text).replace(/^\s*SELECT\s/i, " ");
  return splitList(head);
}

// Resolve one ORDER BY key to the expression(s) that DEFINE it. A bare column reference resolves
// to itself. An alias of the `picks` CTE resolves through BOTH hops that actually feed it:
//
//   1. `sort_project` is named by `AS sort_project` in branch (a) of the UNION only -- branches
//      (b) and (c) supply their value POSITIONALLY, and those are the branches that carry the
//      ticket rows. So every branch's item at that position is collected, not just the named one.
//      Reading branch (a) alone would resolve `sort_project` to the constant `0::int` and conclude
//      the key has nothing to do with priority, which is exactly wrong.
//   2. a `bu.<col>` item is then resolved through the `buildable` CTE that defines `<col>`.
//
// Without both hops `sort_project` and `sort_lane` are opaque labels and the precedence assertion
// would be grading two names rather than two columns.
function resolveKey(key, body) {
  const bare = key.replace(/\s+(NULLS\s+(FIRST|LAST)|ASC|DESC)\b/gi, "").trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(bare)) return bare;

  const picks = sliceCte(body, "picks");
  const buildable = sliceCte(body, "buildable");
  if (!picks) {
    const hit = uncomment(body).match(new RegExp(`([^,\\n]*)\\s+AS\\s+${bare}\\b`, "i"));
    return hit ? hit[1] : bare;
  }

  const branches = picks.split(/\n\s*UNION ALL\s*\n/).map(selectItems);
  const pos = branches[0].findIndex(it => new RegExp(`\\bAS\\s+${bare}$`, "i").test(it));
  if (pos < 0) return bare;

  const resolved = [];
  for (const items of branches) {
    const item = items[pos];
    if (!item) continue;
    const ref = item.match(/^bu\.([A-Za-z_][A-Za-z0-9_]*)$/);
    if (ref && buildable) {
      const def = selectItems(buildable).find(it => new RegExp(`\\bAS\\s+${ref[1]}$`, "i").test(it));
      resolved.push(def ?? item);
    } else {
      resolved.push(item);
    }
  }
  return resolved.join(" | ");
}

// The judgement itself, factored out so the SES-158 control can drive it over a mutant.
function assertPriorityPrecedesFiledAt(src) {
  for (const site of ORDER_BY_SITES) {
    const clause = site.extract(src);
    const keys = splitKeys(clause);
    assert.ok(keys.length >= 2, `${site.fn}: its pick ORDER BY parsed to ${keys.length} key(s)`);

    const resolved = keys.map(k => resolveKey(k, sliceFunction(src, site.fn === "prime_directive_queue()"
      ? "public.prime_directive_queue()"
      : "public.drain_epic_next(p_cycle_id uuid)")));

    const prioAt = resolved.findIndex(r => /\bpriority\b/i.test(r));
    const filedAt = resolved.findIndex(r => /\bfiled_at\b/i.test(r));

    assert.ok(
      prioAt >= 0,
      `${site.fn}: no key in its pick ORDER BY resolves to an expression mentioning \`priority\`. ` +
        `AGT-140 / D1 makes the owning project's priority the FIRST key; without it a ticket in a ` +
        `priority-3 project outranks one in a priority-2 project whenever its queue number is lower. ` +
        `Keys as parsed: ${JSON.stringify(keys)}`,
    );
    assert.ok(
      filedAt >= 0,
      `${site.fn}: no key in its pick ORDER BY resolves to an expression mentioning \`filed_at\`. ` +
        `SES-281 / M5-02's filing lane must still be a key -- AGT-140 put project priority AHEAD of ` +
        `it, it did not replace it. Keys as parsed: ${JSON.stringify(keys)}`,
    );
    assert.ok(
      prioAt < filedAt,
      `${site.fn}: the \`filed_at\` filing-lane key sits at position ${filedAt} and the ` +
        `\`priority\` key at position ${prioAt} -- priority must come FIRST (AGT-140 / D1). With the ` +
        `filing lane ahead of it, the pre-AGT-140 inversion returns: AGT-141 (agent-training, ` +
        `priority 3, queue 25) ahead of AGT-132 (dev-manager-capabilities, priority 2, queue 30). ` +
        `Keys as parsed: ${JSON.stringify(keys)}`,
    );
  }
}

function theShippedMigrationOrdersByProjectPriorityFirst() {
  assert.ok(
    fs.existsSync(MIGRATION),
    `${path.relative(ROOT, MIGRATION)} is missing -- it IS the migration AGT-140 applied, and ` +
      "without it nothing in the repo records what the two pick functions were changed to",
  );
  const src = fs.readFileSync(MIGRATION, "utf8");

  assertPriorityPrecedesFiledAt(src);

  // SES-158 CONTROL. Delete the project-priority key from each ORDER BY and require the same
  // judgement to THROW. A green that cannot be turned red is not evidence.
  // Each mutation leaves a WELL-FORMED ORDER BY behind -- the key is deleted, the clause is not
  // broken. A mutant the parser simply cannot read would throw too, and a control that cannot tell
  // "the key is missing" from "I could not parse this" proves nothing about either.
  const mutantDrain = "ORDER BY CASE WHEN b.filed_at < c_lane_cut";
  const mutantPrime = "ORDER BY lane_ord, sort_key, sort_lane";
  const mutant = src
    .replace("ORDER BY pj.priority,\n              CASE WHEN b.filed_at < c_lane_cut", mutantDrain)
    .replace("ORDER BY lane_ord, sort_key, sort_project NULLS LAST, sort_lane", mutantPrime);
  // Each mutated clause is a string that CANNOT occur in the unmutated file (the original carries
  // `ORDER BY pj.priority,` and `sort_project NULLS LAST,` at those two sites), so its presence is
  // itself the proof the anchor still matched.
  assert.ok(
    mutant.includes(mutantDrain),
    "the SES-158 control's drain_epic_next anchor no longer matches the shipped text, so the " +
      "control is grading a mutant identical to the original",
  );
  assert.ok(
    mutant.includes(mutantPrime),
    "the SES-158 control's prime_directive_queue anchor no longer matches the shipped text, so the " +
      "control is grading a mutant identical to the original",
  );

  let controlError = null;
  try {
    assertPriorityPrecedesFiledAt(mutant);
  } catch (e) {
    controlError = e;
  }
  assert.ok(
    controlError,
    "the SES-158 control: with the project-priority key deleted from BOTH ORDER BYs the arm above " +
      "still passed, so it is not grading what it claims to grade",
  );
  assert.match(
    controlError.message,
    /no key in its pick ORDER BY resolves to an expression mentioning `priority`/,
    "the SES-158 control threw, but not on the missing priority key -- it threw " +
      `"${controlError.message}". A control that fires for a parsing reason does not show the arm ` +
      "grades the ordering",
  );

  console.log(
    "  [AGT-140] arm A: both pick ORDER BYs put the project-priority key ahead of the filed_at " +
      "filing-lane key in the shipped migration; the key-deleted mutant throws.",
  );
}

// ---------------------------------------------------------------------------------------------
// Arm B -- the order prime_directive_queue() actually returned. Read-only.
// ---------------------------------------------------------------------------------------------

async function pg(url, key, pathAndQuery, init) {
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`${pathAndQuery} returned HTTP ${res.status} ${res.statusText}`);
  const body = await res.json();
  if (!Array.isArray(body)) throw new Error(`${pathAndQuery} returned a non-array payload`);
  return body;
}

const lex = (a, b) => {
  for (let i = 0; i < a.length; i++) {
    if (a[i] < b[i]) return -1;
    if (a[i] > b[i]) return 1;
  }
  return 0;
};

async function theLiveLaneIsOrderedByProjectPriorityFirst() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "arm B -- the live selfbuild lane's returned order is monotonic in [project priority, filing " +
        "lane, queue, predicted_cycles]",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent. Arm A above still graded both pick " +
        "ORDER BYs against the shipped migration, and its SES-158 control still ran.",
    );
    return;
  }

  // The cutoff is read from the row the FUNCTIONS read, never hardcoded here: a literal would go on
  // agreeing with itself the day John moves the cut, and would do it silently.
  const settings = await pg(url, key, "runner_settings?id=eq.1&select=filing_lane_cutoff");
  assert.strictEqual(settings.length, 1, "runner_settings row 1 is the filing-lane cutoff's only home and it did not return exactly one row");
  const laneCut = Date.parse(`${String(settings[0].filing_lane_cutoff).slice(0, 10)}T00:00:00Z`);
  assert.ok(Number.isFinite(laneCut), `runner_settings.filing_lane_cutoff did not parse: ${settings[0].filing_lane_cutoff}`);
  const laneOf = filedAt => (filedAt && Date.parse(filedAt) < laneCut ? 0 : 1);

  const rows = await pg(url, key, "rpc/prime_directive_queue", { method: "POST", body: "{}" });
  const items = await pg(url, key, "backlog_items?select=backlog_id,queue,filed_at,predicted_cycles,epic_id&limit=2000");
  const epics = await pg(url, key, "epics?select=id,project_id&limit=500");
  const projects = await pg(url, key, "projects?select=id,priority,status&limit=200");

  assert.ok(rows.length > 0, "prime_directive_queue() returned nothing at all -- not even the board row");
  assert.ok(items.length > 100, `backlog_items returned ${items.length} rows -- refusing to grade a truncated read`);

  const byRef = new Map(items.map(i => [i.backlog_id, i]));
  const projectOfEpic = new Map(epics.map(e => [e.id, e.project_id]));
  const project = new Map(projects.map(p => [p.id, p]));
  const executing = projects.filter(p => p.status === "executing");

  const lane = rows.filter(r => r.lane === LANE);
  if (lane.length === 0) {
    notRun(
      `arm B -- the live \`${LANE}\` lane's returned order`,
      "the lane came back empty this run. ses-281's own board-state discrimination owns that finding " +
        "(nothing buildable / every candidate held by a live parallel cycle's claim / the board " +
        "drained); AGT-140 grades the ORDER of a served lane and has nothing to say about an empty " +
        "one. Arm A above still graded both functions' shipped ORDER BYs.",
    );
    return;
  }

  // D2: a row whose owning project is not `executing` carries NO priority key and sorts last.
  // MAX rather than 0 is the whole of D2 -- with 0 an admitted enhancement would outrank every
  // chartered ticket on the board.
  const key4 = ref => {
    const it = byRef.get(ref);
    assert.ok(it, `prime_directive_queue() returned ${ref}, which is not in backlog_items`);
    const p = project.get(projectOfEpic.get(it.epic_id));
    const prio = p && p.status === "executing" ? p.priority : MAX;
    return [prio, laneOf(it.filed_at), it.queue, it.predicted_cycles ?? MAX];
  };

  // (i) MONOTONICITY of the order the DATABASE returned. Never a re-sort in JS (SES-45).
  for (let i = 1; i < lane.length; i++) {
    const a = key4(lane[i - 1].ref);
    const b = key4(lane[i].ref);
    assert.ok(
      lex(a, b) <= 0,
      `the ${LANE} lane is out of order at position ${i}: ${lane[i - 1].ref} ` +
        `[prio ${a[0]}, lane ${a[1]}, queue ${a[2]}, cycles ${a[3]}] precedes ${lane[i].ref} ` +
        `[prio ${b[0]}, lane ${b[1]}, queue ${b[2]}, cycles ${b[3]}]. AGT-140 / D1 orders by ` +
        "project priority FIRST, then SES-281 / M5-02's filing lane, then the queue, then M5-07's " +
        "predicted_cycles nulls last",
    );
  }

  // (ii) THE INVERSION CLAUSE, stated on its own because it is the one AGT-140 exists to close and
  // a reader must be able to see it fail by itself. Every pair, not just adjacent ones.
  for (let i = 0; i < lane.length; i++) {
    for (let j = i + 1; j < lane.length; j++) {
      const a = key4(lane[i].ref)[0];
      const b = key4(lane[j].ref)[0];
      assert.ok(
        b >= a,
        `${lane[i].ref} (project priority ${a}) is served at pos ${i + 1}, ahead of ${lane[j].ref} ` +
          `(project priority ${b}) at pos ${j + 1}. A ticket in a lower-priority project may never ` +
          "precede one in a higher-priority project -- that is the live inversion AGT-140 closed " +
          "(AGT-141/agent-training p3 ahead of AGT-132/dev-manager-capabilities p2, 2026-09-26)",
      );
    }
  }

  // (iii) NON-VACUITY. Monotonicity in a four-key vector is satisfied trivially when the first key
  // is constant across the lane, and in that case the BROKEN function passes this file too. Only
  // claim the rule was observed when the board could actually discriminate: an adjacent pair whose
  // priority RISES while its (lane, queue, cycles) triple FALLS is a pair the pre-AGT-140 order put
  // the other way round.
  const served = new Set(lane.map(r => {
    const it = byRef.get(r.ref);
    return projectOfEpic.get(it.epic_id);
  }));
  const servedExecuting = executing.filter(p => served.has(p.id));

  let discriminating = null;
  for (let i = 1; i < lane.length; i++) {
    const a = key4(lane[i - 1].ref);
    const b = key4(lane[i].ref);
    if (a[0] < b[0] && lex(a.slice(1), b.slice(1)) > 0) {
      discriminating = `${lane[i - 1].ref} [prio ${a[0]}, lane ${a[1]}, queue ${a[2]}, cycles ${a[3]}] ` +
        `before ${lane[i].ref} [prio ${b[0]}, lane ${b[1]}, queue ${b[2]}, cycles ${b[3]}]`;
      break;
    }
  }

  if (!discriminating) {
    notRun(
      "arm B's project-priority precedence as an OBSERVED property",
      `the ${LANE} lane serves ${servedExecuting.length} executing project(s) across ${lane.length} ` +
        "row(s), and no adjacent pair rises in project priority while falling in (filing lane, " +
        "queue, cycles) -- so a correctly-ordered result is indistinguishable from the pre-AGT-140 " +
        "order on today's board. Clauses (i) and (ii) above still ran and still hold; they simply " +
        "cannot discriminate right now. Arm A's grading of the shipped SQL is unaffected.",
    );
  } else {
    console.log(
      `  [AGT-140] arm B: ${lane.length} ${LANE} row(s) over ${servedExecuting.length} executing ` +
        `project(s); the returned order is monotonic in [priority, filing lane, queue, cycles] and ` +
        `DISCRIMINATING -- ${discriminating} is a pair the pre-AGT-140 order inverted.`,
    );
  }

  notRun(
    "arm B for `drain_epic_next(uuid)` -- its live pick order",
    "calling it is NOT read-only: it retires John's standing drain directive (and writes a " +
      "before-image) the moment that drain's required members are done, so a regression run must " +
      "never fire it. Arm A grades its shipped ORDER BY over the migration text, and the migration's " +
      "own trailing DO block asserted `pj.priority` present in `prosrc` and exactly one `pg_proc` " +
      "overload in the same transaction that wrote it. Same refusal ses-281 and ses-424a make.",
  );
}

async function run() {
  theShippedMigrationOrdersByProjectPriorityFirst();
  await theLiveLaneIsOrderedByProjectPriorityFirst();
}

export default run;
selfRun(import.meta.url, run);
