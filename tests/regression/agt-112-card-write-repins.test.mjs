// DeepBench v7.0.1073 | tests/regression/agt-112-card-write-repins.test.mjs | AGT-319 -- a render
// writes docs/runbooks/cycle-card.md and nothing else; the re-pin of the Development Manager's
// copy is its own command, and the ship gate -- not the render -- is what stops the two shipping
// apart. This file keeps its name because it still holds AGT-112's promise (the card and the
// pinned row never ship apart); AGT-319 moved WHERE that promise is kept.
//
// WHAT AGT-112 BUILT, AND WHAT IT COST (measured 2026-11-20, runner_decisions). From v7.0.577 a
// `--write` that changed the card refused without --ticket, --cycle-id and credentials, then
// re-pinned the live `dm-knowledge-cycle-card` row in the same run. That ended the drift of
// 2026-09-24 (two renders shipped, no re-pin, ~4 hours). It also re-pinned on EVERY render: 23
// re-pins since 2026-10-10 over 16 commits that changed the card, and 6 of the 23, in 5 cycles,
// pinned the live manager to card bytes never committed to dev -- a draft a build rendered, tested
// and rendered again. A doc edit was rewriting an agent's row as a side effect.
//
// WHAT HOLDS THE PROMISE NOW. Two gates that did not exist on 2026-09-24: the related set
// (scripts/related-tests.js, AGT-391) and the regression-delta gate (AGT-170). Measured on tree
// e814a83 with one byte of the runbook changed: a runbook edit with no re-render turns
// agt-133-run-tail-review and agt-171-lease-released-at-close red, and a re-render with no re-pin
// turns ses-378d-manager-skill-rows red. Arm C asserts those tests stay IN the related set of the
// file whose edit they catch -- if a rename or a refactor drops one out, the promise is back to
// being someone's memory, and this goes red.
//
// THE REFUSAL IS ASSERTED BY WHICH FLAG IT NAMES (STANDARDS §4, LOO-013): the script prints a
// dedicated `  given: ...` line and the arms compare it whole.
//
// "NOTHING WAS SENT" IS MEASURED, NOT INFERRED. Every `--write` arm runs with SUPABASE_URL pointed
// at a counting HTTP server on 127.0.0.1 that this test owns. A render that still fell into the
// re-pin would reach it; the arms assert the count stayed 0. The children are spawned async so the
// server can answer while they run.
//
// TEMP TREE, NEVER THE COMMITTED CARD AND NEVER THE LIVE ROW. Cycles run in parallel against one
// clone and one database, so every arm runs a copy of the script, the runbook and the card under
// the OS temp dir, removed in a `finally`. OFFLINE: no credentials, no database, no model call.
//
// ONE VOCABULARY (STANDARDS.md Section 13): selfRun() from _lib/self-run.js.

import assert from "assert";
import fs from "fs";
import http from "http";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import { spawn, spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

import {
  writeFlagsRefusal, repinOwed, REPIN_COMMAND, CARD_REL, RUNBOOK_REL, KNOWLEDGE_SLUG,
} from "../../scripts/render-cycle-card.js";
import { relatedTests } from "../../scripts/related-tests.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RENDER = path.join(ROOT, "scripts/render-cycle-card.js");
const CARD = path.join(ROOT, CARD_REL);
const RUNBOOK = path.join(ROOT, RUNBOOK_REL);

// The tests that catch each half at the ship gate, measured (header). Named here on purpose.
const CATCHES_STALE_CARD = ["agt-133-run-tail-review.test.mjs", "agt-171-lease-released-at-close.test.mjs"];
const CATCHES_STALE_PIN = ["ses-378d-manager-skill-rows.test.mjs"];

// The machine-readable half of the refusal: one line, holding ONLY the flags it was handed.
const givenClause = text => {
  const m = /^ {2}given: (.*)$/m.exec(String(text));
  return m ? m[1] : null;
};

// Async on purpose: spawnSync would block this process, and the counting server lives in it.
const nodeAsync = (args, env) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, args, { cwd: ROOT, env });
  let stdout = "", stderr = "";
  child.stdout.on("data", d => { stdout += d; });
  child.stderr.on("data", d => { stderr += d; });
  child.on("error", reject);
  child.on("close", status => resolve({ status, stdout, stderr }));
});

async function run() {
  // ---- (A) the two pure decisions --------------------------------------------------------------

  assert.equal(writeFlagsRefusal({}), null,
    "a render handed no flag must proceed -- that is the whole of the split: a render needs nothing");
  assert.equal(givenClause(writeFlagsRefusal({ ticket: "AGT-319" })), "--ticket",
    "a render handed --ticket must be refused naming --ticket and ONLY --ticket");
  assert.equal(givenClause(writeFlagsRefusal({ cycleId: randomUUID() })), "--cycle-id",
    "a render handed --cycle-id must be refused naming --cycle-id and only it");
  assert.equal(givenClause(writeFlagsRefusal({ decision: randomUUID() })), "--decision",
    "a render handed --decision must be refused naming --decision and only it");
  assert.equal(givenClause(writeFlagsRefusal({ ticket: "AGT-319", cycleId: randomUUID(), decision: randomUUID() })),
    "--ticket, --cycle-id, --decision", "the refusal must name EVERY flag it was handed, in one message");
  assert.ok(writeFlagsRefusal({ ticket: "AGT-319" }).includes(REPIN_COMMAND),
    "the refusal must name the command that DOES re-pin -- a refusal with no next step is a dead end");

  assert.equal(repinOwed({ changed: false }), null,
    "an unchanged write owes nothing: identical bytes cannot have put the pin out of date");
  assert.equal(repinOwed({}), null, "`changed` absent is not `changed` true");
  const owedLine = repinOwed({ changed: true });
  assert.ok(typeof owedLine === "string" && owedLine.includes("RE-PIN OWED") && owedLine.includes(REPIN_COMMAND)
    && owedLine.includes(KNOWLEDGE_SLUG) && !owedLine.includes("\n"),
    `a changed write must say, on ONE line, that a re-pin is owed, of which row, and by which command; got ${JSON.stringify(owedLine)}`);
  assert.equal(REPIN_COMMAND,
    "node scripts/render-cycle-card.js --sync-knowledge --repin --cycle-id=<uuid> --ticket=<ID>",
    "the owed command is the existing repair branch, with both of its required flags");

  // ---- (B) the real script, in a temp tree, with a counting server where the database would be --

  const committed = fs.readFileSync(CARD);
  const tmp = path.join(os.tmpdir(), `agt319-${process.pid}`);
  const hits = [];
  let answer = "[]";
  const server = http.createServer((req, res) => {
    hits.push(`${req.method} ${req.url}`);
    req.resume();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(answer);
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const withDb = { ...process.env, SUPABASE_URL: base, SUPABASE_SERVICE_KEY: "agt319-not-a-key", NO_PROXY: "127.0.0.1,localhost", no_proxy: "127.0.0.1,localhost" };
  delete withDb.NODE_USE_ENV_PROXY;
  const noDb = { ...withDb };
  delete noDb.SUPABASE_URL;
  delete noDb.SUPABASE_SERVICE_KEY;

  try {
    fs.mkdirSync(path.join(tmp, "scripts"), { recursive: true });
    fs.mkdirSync(path.join(tmp, "docs/runbooks"), { recursive: true });
    const copy = path.join(tmp, "scripts/render-cycle-card.js");
    const tmpCard = path.join(tmp, CARD_REL);
    fs.copyFileSync(RENDER, copy);
    fs.copyFileSync(RUNBOOK, path.join(tmp, RUNBOOK_REL));
    fs.copyFileSync(CARD, tmpCard);

    // CONTROL FIRST: the committed card equals what the committed runbook renders to. Without it
    // "unchanged" below would be an accident rather than the measured starting point.
    const control = spawnSync(process.execPath, [RENDER], { cwd: ROOT, encoding: "utf8", env: noDb });
    assert.equal(control.status, 0,
      `the committed ${CARD_REL} must already be current, got exit ${control.status}\n${control.stderr}`);

    // (a) An unchanged render: exit 0, it really writes, it owes nothing, it sends nothing.
    const a = await nodeAsync([copy, "--write"], withDb);
    assert.equal(a.status, 0, `an unchanged --write must exit 0, got ${a.status}\n${a.stderr}`);
    assert.ok(/wrote /.test(a.stdout), "the unchanged --write must actually reach the write");
    assert.ok(!/RE-PIN OWED/.test(a.stdout), "an unchanged write owes no re-pin and must not say it does");
    assert.ok(fs.readFileSync(tmpCard).equals(committed), "a no-op re-render must leave the card byte-identical");

    // Now make the card differ from what the runbook renders, by ONE byte.
    const drifted = Buffer.concat([committed, Buffer.from(" ")]);
    fs.writeFileSync(tmpCard, drifted);

    // (b) THE OLD ONE-COMMAND CALL, with everything it used to need and a database to reach.
    //     Before AGT-319 this wrote the card and went on to the row. Now: exit 2, the card is
    //     untouched, and nothing was sent.
    const b = await nodeAsync([copy, "--write", `--cycle-id=${randomUUID()}`, "--ticket=AGT-319"], withDb);
    assert.equal(b.status, 2,
      `a --write handed the re-pin's flags must exit 2, got ${b.status}\n${b.stderr}${b.stdout}`);
    assert.equal(givenClause(b.stderr), "--ticket, --cycle-id", `the refusal must name both flags\n${b.stderr}`);
    assert.ok(fs.readFileSync(tmpCard).equals(drifted),
      "REFUSED MEANS NOTHING WAS WRITTEN: the temp card must still be the one-byte-drifted bytes");

    // (c) --decision alone is the same refusal by its own name.
    const c = await nodeAsync([copy, "--write", `--decision=${randomUUID()}`], withDb);
    assert.equal(c.status, 2, `a --write handed --decision must exit 2, got ${c.status}\n${c.stderr}`);
    assert.equal(givenClause(c.stderr), "--decision", `the refusal must name --decision only\n${c.stderr}`);
    assert.ok(fs.readFileSync(tmpCard).equals(drifted), "the --decision refusal must write nothing either");

    // (d) THE DISCRIMINATOR. A changed render, no flags, credentials present and a database it
    //     COULD reach: the card is written, the debt is printed, the row is not touched.
    const d = await nodeAsync([copy, "--write"], withDb);
    assert.equal(d.status, 0,
      `a changed --write with no flags must exit 0 -- a render needs nothing; got ${d.status}\n${d.stderr}${d.stdout}`);
    assert.ok(fs.readFileSync(tmpCard).equals(committed),
      "the changed render must have written the card: it now equals what the runbook renders to");
    const owedPrinted = d.stdout.split("\n").filter(l => l.includes("RE-PIN OWED"));
    assert.equal(owedPrinted.length, 1, `a changed write must print exactly ONE RE-PIN OWED line\n${d.stdout}`);
    assert.equal(owedPrinted[0], repinOwed({ changed: true }), "the printed line is repinOwed()'s, whole");

    // (e) The same changed render with NO credentials in the environment at all: still exit 0.
    fs.writeFileSync(tmpCard, drifted);
    const e = await nodeAsync([copy, "--write"], noDb);
    assert.equal(e.status, 0,
      `a render must run with no credentials -- that is what lets a design measure the card; got ${e.status}\n${e.stderr}`);
    assert.ok(fs.readFileSync(tmpCard).equals(committed), "and it must have written the card");

    assert.deepEqual(hits, [],
      "A RENDER SENDS NOTHING: across arms (a) to (e) the counting server must have seen zero requests. " +
      `It saw ${JSON.stringify(hits)} -- a --write reached for the database, which is the re-pin riding a render again`);

    // (f) THE OTHER HALF STILL STANDS. With the card moved and the row not, the check that owns the
    //     drift says so (exit 1), names the repair, and reads without writing.
    answer = JSON.stringify([{ id: randomUUID(), slug: KNOWLEDGE_SLUG, traits: { source_sha256: "0000000000000000" } }]);
    const f = await nodeAsync([copy, "--sync-knowledge"], withDb);
    assert.equal(f.status, 1,
      `a card whose row still pins other bytes must exit 1 from --sync-knowledge, got ${f.status}\n${f.stderr}`);
    assert.ok(f.stderr.includes("--sync-knowledge --repin --cycle-id=<uuid> --ticket=<ID>"),
      "the drift message must name the repair command");
    assert.equal(hits.length, 1, `the check must read the row exactly once, saw ${JSON.stringify(hits)}`);
    assert.ok(hits.every(h => h.startsWith("GET ")), `the check must only READ, saw ${JSON.stringify(hits)}`);

    assert.ok(!drifted.equals(committed), "the drifted card must genuinely differ, or every arm above is vacuous");
  } finally {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  assert.ok(fs.readFileSync(CARD).equals(committed),
    `${CARD_REL} must be untouched by this test -- the temp tree exists so the committed card never is`);

  // ---- (C) the ship gate holds both halves ------------------------------------------------------

  const forRunbook = relatedTests({ root: ROOT, touched: [RUNBOOK_REL] });
  for (const t of CATCHES_STALE_CARD) {
    assert.ok(forRunbook.includes(t),
      `a runbook edit with no re-render is caught at the ship gate by ${t}; it is no longer in the related ` +
      `set of ${RUNBOOK_REL} (${forRunbook.length} tests), so a stale card would ship ungraded`);
  }
  const forCard = relatedTests({ root: ROOT, touched: [CARD_REL] });
  for (const t of CATCHES_STALE_PIN) {
    assert.ok(forCard.includes(t),
      `a re-rendered card with no re-pin is caught at the ship gate by ${t}; it is no longer in the related ` +
      `set of ${CARD_REL} (${forCard.length} tests), so a card would ship with the manager still on the old one`);
  }
}

export default run;

selfRun(import.meta.url, run);
