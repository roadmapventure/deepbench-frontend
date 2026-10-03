// DeepBench v7.0.577 | tests/regression/agt-112-card-write-repins.test.mjs | AGT-112 -- a render
// that CHANGES docs/runbooks/cycle-card.md cannot be written without what the re-pin needs, so the
// card and the Development Manager's pinned copy of it move together or not at all.
//
// WHAT BROKE, measured rather than recalled (kickoff §2, v7.0.577). The committed card was
// re-rendered twice in one night -- 187df12b (v7.0.565, 03:48) -> 385a4688 (v7.0.567, 04:46) ->
// a3c4ac6d (v7.0.575, 07:44) -- and the live `dm-knowledge-cycle-card` row was re-pinned neither
// time. For about four hours the manager was assembled from a procedure two renders old, and
// `grep "sync-knowledge\|repin" docs/runbooks/runner-cycle.md` returned 0 hits: nothing coupled
// the re-pin to the render, so it was a second command a human had to remember. Twice in one night
// is not a wording problem, so the repair is structural (pattern:10) and takes the shape of gating
// the dangerous operation through the atomic correct path rather than blocking it (pattern:19).
//
// WHY THIS FILE IS PERMANENT AND NOT A ONE-OFF (STANDARDS §4; pattern:150). The re-pin itself is
// already asserted by ses-378d/ses-378f/ses-424e, and all three were green the moment the row was
// re-pinned -- they would stay green through a build that deleted writeGate() entirely, because
// they test the STATE of the pin, never what happens at the next render. The coupling has exactly
// one failure mode and it is silent: someone re-renders, the card's bytes move, nothing refuses,
// and the drift is back with no test red until the next cycle reads a stale procedure. That is
// what these arms hold.
//
// THE REFUSAL IS ASSERTED BY WHICH FLAG IT NAMES, not by its exit code alone (STANDARDS §4,
// LOO-013 -- assert which branch fired). The refusal's closing hint names BOTH flags, so a test
// that grepped the whole message for "--ticket" would also pass on the --cycle-id refusal. The
// script prints a dedicated `  missing: ...` line for exactly this, and both arms below read that
// line and compare it whole.
//
// A REFUSAL MUST MEAN NOTHING WAS WRITTEN. Every refusal arm re-reads the temp card afterwards and
// asserts it byte-for-byte, because "it exited 2" is equally satisfied by a build that wrote the
// card and then exited 2 -- which is the drift this ticket exists to close, arriving through the
// gate meant to stop it.
//
// TEMP TREE, NEVER THE COMMITTED CARD AND NEVER THE LIVE ROW. Cycles run in parallel against one
// clone and one database, so the `--write` arms run against a pid-named tree under the OS temp dir
// holding a copy of the script, the runbook and the card, removed in a `finally` (the ses-424e arm
// B shape). THE REAL --write IS NEVER POINTED AT THE REPO HERE, and the one changed-write path
// that WOULD be allowed through is deliberately not driven live: it re-pins the real Knowledge row
// to whatever card it was handed, so running it from a temp tree would write the temp card's sha
// over the manager's row -- the exact drift under repair. Its gate decision is covered purely in
// arm A instead.
//
// OFFLINE BY CONSTRUCTION. No credentials, no database, no model call, no spend: every arm here
// refuses or no-ops before the script reaches its first fetch().
//
// ONE VOCABULARY (STANDARDS.md Section 13): selfRun() from _lib/self-run.js.

import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

import { writeGate, CARD_REL, RUNBOOK_REL } from "../../scripts/render-cycle-card.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RENDER = path.join(ROOT, "scripts/render-cycle-card.js");
const CARD = path.join(ROOT, CARD_REL);
const RUNBOOK = path.join(ROOT, RUNBOOK_REL);

const node = (args, opts = {}) =>
  spawnSync(process.execPath, args, { cwd: ROOT, encoding: "utf8", maxBuffer: 32 * 1024 * 1024, ...opts });

// The machine-readable half of the refusal: one line, holding ONLY what is missing.
const missingClause = stderr => {
  const m = /^ {2}missing: (.*)$/m.exec(String(stderr));
  return m ? m[1] : null;
};

export default async function run_() {
  // ---- (A) writeGate(), pure, over its four outcomes ------------------------------------------

  // 1. A no-op re-render owes nothing. It writes bytes identical to the committed ones, so it
  //    cannot put the pin out of date -- and gating it would make `--write` stop working as the
  //    idempotent regenerate-and-check it is used as everywhere else.
  assert.equal(writeGate({ changed: false }), null,
    "an unchanged render must pass the gate with NO flags at all -- it cannot move the pin, and a " +
    "gate that demanded a ticket for a no-op would only train everyone to pass flags that mean nothing");

  // 2. A changed render that arrives with everything the re-pin needs proceeds.
  assert.equal(writeGate({ changed: true, ticket: "AGT-112", cycleId: randomUUID(), hasCreds: true }), null,
    "a changed render carrying --ticket, --cycle-id and credentials must be allowed through: the " +
    "gate exists to couple the re-pin to the write, never to stop the write happening");

  // 3 and 4. The two refusals, each identified by the flag it names rather than by exit code.
  const noTicket = writeGate({ changed: true, cycleId: randomUUID(), hasCreds: true });
  assert.equal(typeof noTicket, "string",
    "a changed render with no --ticket must be refused -- AGENT-ROW-AGREED-TICKET makes the UPDATE " +
    "over an active agent's Knowledge build work only under a ticket that NAMES the write");
  assert.equal(missingClause(noTicket), "--ticket=<ID>",
    "the refusal must name --ticket and ONLY --ticket. The closing hint repeats both flag names, so " +
    "this line is what distinguishes the two refusals from each other");

  const noCycle = writeGate({ changed: true, ticket: "AGT-112", hasCreds: true });
  assert.equal(missingClause(noCycle), "--cycle-id=<uuid>",
    "a changed render with no --cycle-id must be refused naming --cycle-id: the re-pin owes a " +
    "runner_before_images row and an image needs an owner (§19v)");

  // The credential case is the same gate and the same reason: a write that cannot complete its
  // re-pin must not land the half of the operation it CAN do.
  assert.equal(missingClause(writeGate({ changed: true, ticket: "AGT-112", cycleId: randomUUID(), hasCreds: false })),
    "SUPABASE_URL and SUPABASE_SERVICE_KEY in the environment",
    "with no credentials the re-pin cannot run, so the write must not run either -- landing the " +
    "card alone is precisely the drift this gate closes");

  // Both halves missing must be reported at once, not one exit at a time.
  assert.equal(missingClause(writeGate({ changed: true, hasCreds: true })), "--ticket=<ID>, --cycle-id=<uuid>",
    "the refusal must name EVERY missing requirement in one message");

  // ---- (B) the real script's --write branch, in a temp tree -----------------------------------

  const committed = fs.readFileSync(CARD);
  const tmp = path.join(os.tmpdir(), `agt112-${process.pid}`);
  try {
    fs.mkdirSync(path.join(tmp, "scripts"), { recursive: true });
    fs.mkdirSync(path.join(tmp, "docs/runbooks"), { recursive: true });
    fs.copyFileSync(RENDER, path.join(tmp, "scripts/render-cycle-card.js"));
    fs.copyFileSync(RUNBOOK, path.join(tmp, RUNBOOK_REL));
    fs.copyFileSync(CARD, path.join(tmp, CARD_REL));
    const copy = path.join(tmp, "scripts/render-cycle-card.js");
    const tmpCard = path.join(tmp, CARD_REL);

    // CONTROL FIRST: the committed card equals what the committed runbook renders to. Without it
    // every exit below is equally explained by a script that is simply broken, and arm (a)'s
    // "unchanged" would be an accident rather than the measured starting point.
    const control = node([RENDER]);
    assert.equal(control.status, 0,
      `the committed ${CARD_REL} must already be current, got exit ${control.status}\n${control.stderr}`);

    // (a) A no-op re-render, NO flags: allowed, and it really does write.
    const a = node([copy, "--write"]);
    assert.equal(a.status, 0,
      `an unchanged --write must exit 0 with no flags, got ${a.status}\n${a.stderr}`);
    assert.ok(/wrote /.test(a.stdout),
      "the unchanged --write must actually reach the write -- an arm that exited 0 by refusing " +
      "early would prove nothing about the gate letting it through");
    assert.ok(fs.readFileSync(tmpCard).equals(committed),
      "a no-op re-render must leave the card byte-identical, which is what makes it a no-op");
    assert.ok(!/re-pinning/.test(a.stdout),
      "an unchanged write must NOT fall into the re-pin: it cannot have moved the pin, and touching " +
      "the live row here would make a check a write");

    // Now make the card differ from what the runbook renders, by ONE byte. The copy stays
    // otherwise identical, so nothing but the drift can explain the exits below.
    const drifted = Buffer.concat([committed, Buffer.from(" ")]);
    fs.writeFileSync(tmpCard, drifted);

    // (b) changed render, no --ticket.
    const b = node([copy, "--write", `--cycle-id=${randomUUID()}`]);
    assert.equal(b.status, 2,
      `a changed --write with no --ticket must exit 2, got ${b.status}\n${b.stderr}${b.stdout}`);
    assert.equal(missingClause(b.stderr), "--ticket=<ID>",
      `the refusal must name --ticket and only --ticket\n${b.stderr}`);
    assert.ok(fs.readFileSync(tmpCard).equals(drifted),
      "REFUSED MEANS NOTHING WAS WRITTEN: the temp card must still be the one-byte-drifted bytes. " +
      "If it now equals the render, the gate refused AFTER writing -- which lands the card without " +
      "the re-pin, the exact failure AGT-112 repairs");

    // (c) changed render, no --cycle-id. Same tree, same drift: the two arms differ in one flag.
    const c = node([copy, "--write", "--ticket=AGT-112"]);
    assert.equal(c.status, 2,
      `a changed --write with no --cycle-id must exit 2, got ${c.status}\n${c.stderr}${c.stdout}`);
    assert.equal(missingClause(c.stderr), "--cycle-id=<uuid>",
      `the refusal must name --cycle-id and only --cycle-id\n${c.stderr}`);
    assert.ok(fs.readFileSync(tmpCard).equals(drifted),
      "the --cycle-id refusal must write nothing either");

    // THE DRIFT WAS REAL, asserted last so the two refusals above cannot be explained by a render
    // that had nothing to write in the first place.
    assert.ok(!drifted.equals(committed),
      "arm (b)/(c)'s card must genuinely differ from the render, or 'nothing was written' is vacuous");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  // The repo's own card is not this test's business and must be exactly as it was found.
  assert.ok(fs.readFileSync(CARD).equals(committed),
    `${CARD_REL} must be untouched by this test -- the temp tree exists so the committed card never is`);
}

selfRun(import.meta.url, run_);
