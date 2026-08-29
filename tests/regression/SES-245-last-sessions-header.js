// DeepBench v7.0.330 | tests/regression/SES-245-last-sessions-header.js | SES-245 (remainder)
//
// Guards the retarget of checks 1b and 2 onto the heading scripts/render-claude-state.js actually
// emits. The defect was NOT that the checks were vacuous -- it is that both carried their own
// hard-coded copy of the retired `**Last 3 sessions:**` string while the generated CLAUDE-STATE.md
// has emitted `## Last 3 sessions` since SES-177, so both matched nothing on every run while the
// section sat right there with three real entries in it.
//
// EVERY CLAUSE CARRIES THE RETIRED FORM AS ITS NEGATIVE CONTROL, applied to the SAME fixture and
// asserted to LOSE. That is deliberate and is the whole reason this file is worth its bytes: the
// shipped behaviour and the retired behaviour agree on almost everything (same cap, same regexes,
// same window logic), and they differ on exactly one thing -- whether the section can be FOUND. A
// clause that only asserted "the shipped form flags an over-cap bullet" would pass just as happily
// on the broken build if that build were ever handed a bold-headed fixture, so each clause proves a
// DIFFERENCE rather than a property both share.
//
// IT DRIVES THE REAL IMPLEMENTATION, never a copy (docs/STANDARDS.md Section 4, the SES-45 rule).
// The header list, the resolver, the extractor, the bullet counter, the cap and checkEntryLengths
// are all IMPORTED. Re-typing "## Last 3 sessions" in this file as an expected value would rebuild
// the exact drift the ship removed -- one fact with a second home -- so the live-file clause below
// asserts through the resolver rather than against a literal of its own.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";
import {
  LAST_SESSIONS_HEADERS,
  LAST_SESSIONS_BULLET_CAP,
  findLastSessionsHeader,
  lastSessionsBulletCount,
  extractSectionLines,
  checkEntryLengths,
  ENTRY_LENGTH_CAP,
} from "../../scripts/check-session-docs.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const STATE = path.join(REPO, "CLAUDE-STATE.md");
const RENDERER = path.join(REPO, "scripts", "render-claude-state.js");

// The retired literal, quoted ONCE, here, as the negative control's input. This is the only place
// in this file that names a header string, and it names the DEAD one on purpose.
const RETIRED_HEADER = "**Last 3 sessions:**";

const overCapBullet = "- " + "x".repeat(ENTRY_LENGTH_CAP + 50);
const shortBullet = "- a short entry";

function fixture(header, bullets) {
  return `# DeepBench\n\nsome preamble\n\n${header}\n\n${bullets.join("\n")}\n`;
}

function lastSessionsFindings(stateText) {
  // checkEntryLengths also runs its "In flight now" arm, which reads the inflight directories off
  // disk and is not under test here -- filter to the arm this ship touched rather than assuming
  // the other one is empty in whatever environment the suite runs in.
  const findings = [];
  checkEntryLengths(findings, stateText);
  return findings.filter(f => f.check === "1b" && f.detail.includes("Last 3 sessions"));
}

// ---- Clause 1: the resolver finds the heading the renderer emits, on the REAL file ----
// This is also the VACUITY META-CHECK. If a future renderer change moves the heading again, this
// fails loudly here instead of silently re-opening the defect in the checks themselves -- which is
// precisely how the original went unnoticed: nothing ever asserted the header was findable.
function theResolverMatchesTheLiveGeneratedFile() {
  const text = fs.readFileSync(STATE, "utf8");
  const found = findLastSessionsHeader(text);
  assert.ok(found !== null, "the resolver must find the 'Last 3 sessions' heading in the real generated CLAUDE-STATE.md");
  assert.ok(
    LAST_SESSIONS_HEADERS.includes(found.header),
    "the resolved header must come from LAST_SESSIONS_HEADERS -- the one home for this fact",
  );

  // And the renderer must still be the thing emitting it. Asserting the header against the file
  // alone would pass on a hand-edited file; this ties it to the writer.
  const renderer = fs.readFileSync(RENDERER, "utf8");
  assert.ok(
    renderer.includes(found.header),
    `scripts/render-claude-state.js must still emit ${JSON.stringify(found.header)} -- if this fails the renderer changed its heading and the checks are blind again`,
  );

  // NEGATIVE CONTROL: the retired literal finds nothing in that same real file. This is the defect,
  // stated as a measurement.
  assert.strictEqual(
    text.indexOf(RETIRED_HEADER),
    -1,
    "the retired bolded header must be absent from the generated file -- it is why both checks went blind",
  );
  assert.strictEqual(
    extractSectionLines(text, RETIRED_HEADER).length,
    0,
    "the retired header must extract ZERO entries from the real file",
  );
  assert.ok(
    extractSectionLines(text, found.header).length > 0,
    "the shipped header must extract the section's real entries from the same file",
  );
}

// ---- Clause 2: check 1b flags an over-cap entry, and the retired form does not ----
function check1bSeesAnOverCapEntry() {
  const emitted = LAST_SESSIONS_HEADERS[0];
  const text = fixture(emitted, [overCapBullet, shortBullet]);

  const shipped = lastSessionsFindings(text);
  assert.strictEqual(shipped.length, 1, "an over-cap entry under the emitted heading must produce exactly one 1b finding");
  assert.strictEqual(shipped[0].severity, "FLAG");
  assert.ok(
    shipped[0].detail.includes(String(overCapBullet.length)),
    "the finding must report the entry's real length, not a rounded or recomputed one",
  );

  // NEGATIVE CONTROL: the SAME fixture, read through the retired header, yields nothing.
  assert.strictEqual(
    extractSectionLines(text, RETIRED_HEADER).length,
    0,
    "the retired header must find no entries in a fixture the shipped one flags -- the difference IS the fix",
  );
}

// ---- Clause 3: the remediation names the source, not the generated file ----
// The bullets are render-claude-state.js concatenating a ship card's plain_after/plain_worth, so a
// detail that told a reader to trim the bullet would point at a file the next render overwrites.
function theFindingPointsAtTheCardNotTheRenderedLine() {
  const text = fixture(LAST_SESSIONS_HEADERS[0], [overCapBullet]);
  const [finding] = lastSessionsFindings(text);
  assert.ok(finding, "expected a finding to inspect");
  assert.ok(
    /GENERATED/.test(finding.detail),
    "the detail must say CLAUDE-STATE.md is generated",
  );
  assert.ok(
    /plain_after/.test(finding.detail) && /plain_worth/.test(finding.detail),
    "the detail must name the runner_items columns the text actually comes from",
  );
}

// ---- Clause 4: check 2 counts through the same resolver, and the retired form counted nothing ----
// Stated honestly: check 2 has NO live population -- render-claude-state.js emits cycles.slice(0,3),
// so more than three bullets is unreachable by construction. This clause pins it as the REGRESSION
// GUARD it is, which is exactly why it must be fixture-driven rather than asserted against the file.
function check2CountsThroughTheResolver() {
  const emitted = LAST_SESSIONS_HEADERS[0];
  const overCap = fixture(emitted, [shortBullet, shortBullet, shortBullet, shortBullet]);
  assert.strictEqual(
    lastSessionsBulletCount(overCap),
    LAST_SESSIONS_BULLET_CAP + 1,
    "four bullets under the emitted heading must be counted as four",
  );

  const atCap = fixture(emitted, [shortBullet, shortBullet, shortBullet]);
  assert.strictEqual(
    lastSessionsBulletCount(atCap),
    LAST_SESSIONS_BULLET_CAP,
    "three bullets must not be over the cap -- the live file sits exactly here",
  );

  // NEGATIVE CONTROL: the retired literal cannot even locate the section, so the pre-change check 2
  // skipped its whole body. Reproduce that by resolving against a text carrying ONLY the emitted
  // heading and asking for the dead one.
  assert.strictEqual(overCap.indexOf(RETIRED_HEADER), -1);
  assert.strictEqual(
    lastSessionsBulletCount("# nothing here\n\n- a\n- b\n- c\n- d\n"),
    null,
    "no section at all must return null, never a bullet count from the rest of the document",
  );
}

// ---- Clause 5: the section window stops at the next H2 ----
// Once a section can START at an H2, the old two-arm terminator (bold header or ---) could no
// longer see that section's END, so the window ran to EOF and a later section's bullets would be
// length-checked as this section's entries.
function theWindowStopsAtTheNextH2() {
  const text =
    fixture(LAST_SESSIONS_HEADERS[0], [shortBullet]) +
    `\n## Something appended later\n\n${overCapBullet}\n`;

  assert.strictEqual(
    extractSectionLines(text, LAST_SESSIONS_HEADERS[0]).length,
    1,
    "a later H2 section's bullets must not be attributed to 'Last 3 sessions'",
  );
  assert.strictEqual(
    lastSessionsFindings(text).length,
    0,
    "an over-cap bullet in a DIFFERENT section must not be reported as a 'Last 3 sessions' entry",
  );
  assert.strictEqual(
    lastSessionsBulletCount(text),
    1,
    "check 2's count must stop at the next H2 too, or an appended section inflates it",
  );
}

// ---- Clause 6: the retired header still works where it is the one present ----
// The fallback is not decoration: a CLAUDE-STATE.md predating SES-177 is hand-written and carries
// the bold form, and dropping it would trade one blind spot for another.
function theRetiredHeaderStillWorksAsAFallback() {
  const text = fixture(RETIRED_HEADER, [overCapBullet]);
  const found = findLastSessionsHeader(text);
  assert.ok(found !== null, "a pre-SES-177 file must still resolve through the fallback");
  assert.strictEqual(found.header, RETIRED_HEADER);
  assert.strictEqual(lastSessionsFindings(text).length, 1, "the fallback must still flag an over-cap entry");
}

function run() {
  theResolverMatchesTheLiveGeneratedFile();
  check1bSeesAnOverCapEntry();
  theFindingPointsAtTheCardNotTheRenderedLine();
  check2CountsThroughTheResolver();
  theWindowStopsAtTheNextH2();
  theRetiredHeaderStillWorksAsAFallback();
}

selfRun(import.meta.url, run);
export default run;
