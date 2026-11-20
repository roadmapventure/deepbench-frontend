// DeepBench v7.0.1093 | tests/regression/agt-764-asked-statements.test.mjs | AGT-764 -- the guard
// over `scripts/migration-statements.js`: a statement the Supabase connector asks a human about is
// named at design, before a cycle sends it.
//
// WHAT WOULD PASS VACUOUSLY HERE, which is the only interesting question about a guard over a text
// matcher. "The script runs and returns a list" is satisfied by `askedStatements = () => []`, which
// would exit 0 on every migration ever written -- the exact false green the measured fence exists to
// refuse (`pattern:75`: a ship gate's false green must be structurally impossible). So the arms are
// paired in both directions and nothing here asserts only one side:
//   * arm A grades the EXACT [lead, where] list per case, so a matcher that fires on everything is
//     as red as one that fires on nothing. Four cases must name something; four must name nothing,
//     and the four silent ones are the ones that each ALREADY APPLIED UNATTENDED (a keyword inside a
//     function body, a comment, a string, `on delete cascade`/`drop constraint`/a grant list) -- an
//     over-eager matcher would park live migrations that the harvest measured as safe.
//   * arm A also pins WHICH BRANCH fired (`where`: "top" vs "do"), the LOO-013 lesson in
//     STANDARDS.md Section 4 -- the DO-block arm and the function-body arm differ by that field
//     alone, so a matcher that ignored dollar-quoting would pass a `where`-blind test.
//   * arm B runs the real committed mirrors in `docs/design/`, so the fence is graded against text
//     a cycle actually sent, not only against strings this file made up.
//   * arm C runs the CLI as a CHILD PROCESS, so what is asserted is the EXIT CODE a shell sees --
//     the thing the pre-send check is read by -- not an imported function's return value, which can
//     diverge from it.
//   * arm D asserts the register carries the fact, because the fence's home is every Designer
//     prompt (D3); a script nobody is told to run is not a check.
//
// READ-ONLY AND OFFLINE BY CONSTRUCTION (`pattern:76`): no credentials, no network, no write, no
// temp file. Cycles run in parallel against one clone, so this file reads the committed mirrors and
// the committed register and mutates neither.

import assert from "assert";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

import { askedStatements } from "../../scripts/migration-statements.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT = path.join(ROOT, "scripts/migration-statements.js");
const REGISTER = path.join(ROOT, "docs/runbooks/environment-facts.md");
const MIRRORS = path.join(ROOT, "docs/design");

// [lead, where] pairs, exactly -- never a length check, which a matcher firing on the wrong line
// would also satisfy.
const pairs = list => list.map(s => [s.lead, s.where]);

// --- arm A: the pure function, both directions -------------------------------------------------
// `expect` is the exact pair list. `text`/`n` are pinned only where the kickoff pins them: those
// are the fields the pre-send message quotes back at whoever has to decide, so a drifted text is a
// drifted check.
const PURE = [
  {
    name: "a top-level DROP leads a statement -- the AGT-553 shape",
    sql: "drop trigger if exists t on public.x;",
    expect: [["drop", "top"]],
    text: "drop trigger if exists t on public.x",
  },
  {
    name: "a DELETE inside a function BODY is a definition, not a run -- named nothing",
    sql: "create or replace function f() returns void language plpgsql as $f$ begin delete from public.x; end $f$;",
    expect: [],
  },
  {
    name: "a DELETE inside a DO block RUNS when the migration is sent -- named, where=do",
    sql: "do $g$ begin delete from public.x where id = 1; end $g$;",
    expect: [["delete", "do"]],
  },
  {
    name: "a TRUNCATE behind an IF in a DO block is still a run; the word in a NOTICE string is not",
    sql: "do $g$ begin if true then truncate public.x; end if; raise notice 'drop it'; end $g$;",
    expect: [["truncate", "do"]],
  },
  {
    name: "a keyword that does not LEAD -- drop constraint, on delete cascade, a grant list",
    sql: "alter table x drop constraint c;\ncreate table y (id int references x on delete cascade);\ngrant delete on y to service_role;",
    expect: [],
  },
  {
    name: "a line comment, a block comment and a string literal are not statements",
    sql: "-- drop table x;\n/* truncate y; */\ninsert into z values ('delete from q; drop table r');",
    expect: [],
  },
  {
    name: "below `-- down` is the hand-kept undo, not the text a cycle sends",
    sql: "create table a (i int);\n-- down\ndrop table a;",
    expect: [],
  },
  {
    name: "the SAME text without the `-- down` marker IS sent -- the negative control for the arm above",
    sql: "create table a (i int);\ndrop table a;",
    expect: [["drop", "top"]],
    text: "drop table a",
    n: 2,
  },
  {
    name: "upper case, leading whitespace, two statements, in order",
    sql: "  TRUNCATE public.x;\nDELETE FROM public.y where id = 1;",
    expect: [["truncate", "top"], ["delete", "top"]],
  },
];

// --- arm B: the real committed mirrors ---------------------------------------------------------
const COMMITTED = [
  { file: "agt-553-ledger-shape-guard.sql", asked: 1, text: "drop trigger if exists audit_findings_shape on public.audit_findings" },
  { file: "agt-610-refusal-ledger.sql", asked: 1, text: "drop function if exists public.record_skip(uuid, text, text, text, text, text)" },
  { file: "agt-620-queue-indexes.sql", asked: 0 },
  { file: "agt-577-napkin-text-stamp.sql", asked: 0 },
  { file: "agt-354-taught-pieces.sql", asked: 0 },
  { file: "agt-590-sweep-isolation-hold.sql", asked: 0 },
  { file: "agt-433-parked-zero.sql", asked: 0 },
  { file: "agt-310-plan-limit.sql", asked: 0 },
];

function runCli(args) {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8" });
  return { code: r.status, out: r.stdout || "", err: r.stderr || "" };
}

export default async function run() {
  // ---- (a) the pure function: the exact list, and which branch fired -------------------------
  for (const c of PURE) {
    const got = askedStatements(c.sql);
    assert.deepEqual(pairs(got), c.expect,
      `arm A -- ${c.name}\n  sql: ${JSON.stringify(c.sql)}\n  expected ${JSON.stringify(c.expect)}, ` +
      `got ${JSON.stringify(pairs(got))}`);
    if (c.text !== undefined) {
      assert.equal(got[0].text, c.text,
        `arm A -- ${c.name}: the named statement's own text must be quoted back verbatim\n` +
        `  expected ${JSON.stringify(c.text)}, got ${JSON.stringify(got[0].text)}`);
    }
    if (c.n !== undefined) {
      assert.equal(got[0].n, c.n,
        `arm A -- ${c.name}: the statement's position must be reported (expected n ${c.n}, got ${got[0].n})`);
    }
  }

  // ---- (b) the committed mirrors in docs/design ----------------------------------------------
  for (const m of COMMITTED) {
    const p = path.join(MIRRORS, m.file);
    assert.ok(fs.existsSync(p), `arm B -- the mirror ${m.file} is missing: the fence is graded against real sent text`);
    const got = askedStatements(fs.readFileSync(p, "utf8"));
    assert.equal(got.length, m.asked,
      `arm B -- ${m.file}: expected exactly ${m.asked} named statement(s), got ${got.length}: ` +
      JSON.stringify(got.map(s => s.text)));
    if (m.text !== undefined) {
      assert.equal(got[0].text, m.text,
        `arm B -- ${m.file}: the named statement drifted\n  expected ${JSON.stringify(m.text)}, ` +
        `got ${JSON.stringify(got[0].text)}`);
    }
  }

  // ---- (c) the CLI, as a shell sees it -------------------------------------------------------
  const asks = runCli([`--file=${path.join(MIRRORS, "agt-553-ledger-shape-guard.sql")}`]);
  assert.equal(asks.code, 1,
    `arm C -- the 553 mirror leads with DROP: the CLI must exit 1, got ${asks.code}\n${asks.out}${asks.err}`);
  const asksJson = JSON.parse(asks.out);
  assert.equal(asksJson.asked, 1,
    `arm C -- the 553 mirror: stdout JSON must report asked 1, got ${asksJson.asked}\n${asks.out}`);
  assert.equal(asksJson.statements.length, 1,
    `arm C -- the 553 mirror: the JSON must carry the statement itself, not only a count\n${asks.out}`);

  const silent = runCli([`--file=${path.join(MIRRORS, "agt-620-queue-indexes.sql")}`]);
  assert.equal(silent.code, 0,
    `arm C -- the 620 mirror names nothing: the CLI must exit 0, got ${silent.code}\n${silent.out}${silent.err}`);
  const silentJson = JSON.parse(silent.out);
  assert.equal(silentJson.asked, 0,
    `arm C -- the 620 mirror: stdout JSON must report asked 0, got ${silentJson.asked}\n${silent.out}`);

  // Usage and an unreadable path are a DIFFERENT failure from "this migration names a statement",
  // and the exit codes keep it that way -- 2, never 1, so "you ran it wrong" cannot be read as
  // "this is safe to send" and cannot hide inside a real find either.
  const usage = runCli([]);
  assert.equal(usage.code, 2, `arm C -- no flag must exit 2, got ${usage.code}\n${usage.out}${usage.err}`);
  assert.match(`${usage.out}${usage.err}`, /usage:/,
    `arm C -- the exit-2 message must say how to call it\n${usage.out}${usage.err}`);

  const missing = runCli([`--file=${path.join(MIRRORS, "agt-764-no-such-mirror.sql")}`]);
  assert.equal(missing.code, 2,
    `arm C -- an unreadable file must exit 2, never 0 (a silent 0 would read as "safe to send"), ` +
    `got ${missing.code}\n${missing.out}${missing.err}`);
  assert.match(`${missing.out}${missing.err}`, /unreadable/,
    `arm C -- the exit-2 message must name what it could not read\n${missing.out}${missing.err}`);

  // ---- (d) the fence's home: the environment-facts register ----------------------------------
  assert.ok(fs.existsSync(REGISTER), "arm D -- docs/runbooks/environment-facts.md is missing");
  const lines = fs.readFileSync(REGISTER, "utf8").replace(/\r\n/g, "\n").split("\n");
  const ours = lines.filter(l => l.startsWith("- 2026-11-20 | AGT-764 | "));
  assert.equal(ours.length, 1,
    `arm D -- exactly one register line must start "- 2026-11-20 | AGT-764 | ", found ${ours.length}. ` +
    `Every Designer prompt reads this register: no line and the fence is a script nobody runs; two ` +
    `and the fact has been restated instead of corrected.`);
  assert.ok(ours[0].includes("node scripts/migration-statements.js --file="),
    `arm D -- the register line must hand the Designer the command itself, not a description of it:\n  ${ours[0]}`);
}

selfRun(import.meta.url, run);
