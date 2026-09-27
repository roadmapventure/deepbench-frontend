// DeepBench v7.0.633 | tests/regression/agt-196-private-scan-allowlist.test.mjs | AGT-196
//
// FEATURE: AGT-196 -- THE SCAN'S ALLOWLIST STOPS BEING DEFEATED BY ITS OWN CAPTURE. Measured on the
// unchanged tree at `541bb361`: `node scripts/audit-private-scan.js` reported 48 `vercel_bypass`
// lines across 46 tracked files, carrying FIVE distinct captured strings -- the live 32-character
// value on 42 lines in 42 files, and four strings that are not values at all on the remaining 6
// lines in 4 files. The detector table was right about every one of those 42; the other 6 were the
// allowlist and the capture failing at their own job, and they are what made the standing count a
// 46-file purge instead of the 42-file one it actually is.
//
// WHY THE ALLOWLIST MISSED THEM -- three mechanisms, none of them a wrong row:
//   1. Row 1's value class accepts anything that is not whitespace or a quote, so a header written in
//      JS hands the allowlist `BYPASS_SECRET,` WITH the trailing comma, and `/^[A-Z][A-Z0-9_]+$/`
//      does not match that. The row is correct; what reached it was not. Hence the STRIP.
//   2. The same class accepts a brace-less `$VAR`, which carries no `${` for the template row to
//      see. Hence the new `/^\$[A-Za-z_][A-Za-z0-9_]*$/` row.
//   3. Row 2 captured the CALLEE of a call (`const BYPASS_SECRET = loadBypassSecret();`), which no
//      allowlist row can tell from a value by SHAPE -- only by syntax. Hence `(?!\s*\()` in the
//      capture, not a new row.
//
// AND WHY THE TICKET'S OWN REMEDY IS NOT THE FIX, which is the single most important thing this file
// guards. AGT-196 proposed widening the identifier row to `/^[A-Za-z][A-Za-z0-9_]+$/` so it would
// cover the mixed-case strings. The live bypass value IS 32 mixed-case alphanumerics: that widening
// allowlists all 42 real hits and deletes the detector. Arm (d) is that measurement, kept as a
// permanent negative control so no later session can "restore" the ticket's version and read the
// resulting `0 lines` as a clean tree.
//
// (a) THE SIX FALSE POSITIVES, BY FILE AND LINE, EACH WITH ITS OWN REASON AND ITS OWN CONTROL. Read
//     off the four real tracked files rather than a fixture -- a fixture of the six lines would pass
//     just as well after somebody edited the shipped regex back. Each of the six must produce NO
//     `vercel_bypass` hit now, must produce one under the PRE-AGT-196 behaviour reconstructed here,
//     and (for the five the allowlist handles) `allowlistReason()` must return the exact reason
//     string. `chi-true-regression.mjs:176` is capture-suppressed, so it asserts no match at all --
//     asserting a reason there would pass against a wrong fix that allowlisted the callee by shape.
//
// (b) A REAL VALUE IS STILL REPORTED, AND STILL MASKED. A synthetic 32-character mixed-case literal
//     built here (never the live one -- this file reads no secret and prints none) in the three
//     shapes the tree actually carries. This is the arm every over-broad mute fails.
//
// (c) THE TREE CARRIES AT MOST ONE DISTINCT REPORTED VALUE. Over `trackedFiles()`, compared by
//     sha256 and never printed. Written as `<= 1` and about the SHAPE of what is reported, not about
//     42, so it stays true as the purge lands and reaches 0.
//
// (d) THE NAIVE WIDENING WOULD MUTE THE TREE. The negative control described above, asserted against
//     the synthetic value AND against every value the live tree reports.
//
// NO CREDENTIALS, NO NETWORK, NO MODEL CALL, NO SPEND. Every arm is this repo's own tracked text and
// two pure functions. Nothing here writes, and nothing here prints a captured value: arm (c) hashes.

import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { selfRun } from "./_lib/self-run.js";
import {
  scanText, trackedFiles, allowlistReason, mask, ALLOWLIST, DETECTORS,
} from "../../scripts/audit-private-scan.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const IDENTIFIER_REASON = "identifier -- names the variable, not its value";
const SHELL_REASON = "shell variable reference -- names the variable, not its value";

// The six, as AGT-196 measured them. `anchor` is what the line must still contain for the line
// number to be the line this ticket meant -- every anchor is a HEADER NAME, A VARIABLE NAME OR A
// FUNCTION NAME, never a value. `reason: null` means capture-suppressed: allowlistReason() is not
// the mechanism and must not be consulted.
const THE_SIX = [
  { rel: "docs/kickoffs/v5.2.35-S-DAN-PIPELINE-01-dan-enrichment-pipeline.md", line: 485,
    anchor: "'x-vercel-protection-bypass': BYPASS_HEADER,", reason: IDENTIFIER_REASON },
  { rel: "docs/kickoffs/v7.0.34-LOG-121a-caller-attribution-capture.md", line: 103,
    anchor: '"x-vercel-protection-bypass": BYPASS_SECRET,', reason: IDENTIFIER_REASON },
  { rel: "scripts/chi-true-regression.mjs", line: 192,
    anchor: '"x-vercel-protection-bypass": BYPASS_SECRET,', reason: IDENTIFIER_REASON },
  { rel: "docs/runbooks/mcp-server.md", line: 110,
    anchor: "x-vercel-protection-bypass: $VERCEL_AUTOMATION_BYPASS_SECRET", reason: SHELL_REASON },
  { rel: "docs/runbooks/mcp-server.md", line: 156,
    anchor: "x-vercel-protection-bypass: $VERCEL_AUTOMATION_BYPASS_SECRET", reason: SHELL_REASON },
  { rel: "scripts/chi-true-regression.mjs", line: 176,
    anchor: "loadBypassSecret()", reason: null },
];

// --- the pre-AGT-196 behaviour, reconstructed so each arm has a control -------------------------
//
// Row 1 unchanged, row 2 WITHOUT the lookahead pair, and the allowlist tested WITHOUT the strip and
// WITHOUT the `$VAR` row -- i.e. exactly what shipped before this ticket. A control is only worth
// its lines if it is the real prior behaviour, so both halves are rolled back, not one.
const NOT_PLACEHOLDER = "(?!<REDACTED:)";
const PRE_ROWS = [
  new RegExp("(x-vercel-protection-bypass[\"'`]?\\s*[:=]\\s*\\\\?[\"']?)" + NOT_PLACEHOLDER +
    "([^\\s\"'`\\\\<>&]{8,})", "gi"),
  new RegExp("(bypass[\\s\\S]{0,80}?(?:value|secret)\\s*[:=]\\s*[`\"']?)" + NOT_PLACEHOLDER +
    "([A-Za-z0-9_-]{16,})", "gi"),
];
const PRE_ALLOWLIST = ALLOWLIST.filter(a => a.reason !== SHELL_REASON);
const preReported = line => {
  const out = [];
  for (const re of PRE_ROWS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(line)) !== null) {
      if (m[0].length === 0) { re.lastIndex++; continue; }
      const v = m[2];
      if (!v || PRE_ALLOWLIST.some(a => a.re.test(v))) continue;   // no strip -- that is the defect
      out.push(v);
    }
  }
  return out;
};

// The values the SHIPPED vercel_bypass rows report on one line, through the shipped allowlist.
// scanText() masks, so re-derived here -- arm (c) then hashes rather than printing.
const CURRENT_ROWS = DETECTORS.filter(d => d.kind === "vercel_bypass");
const reported = line => {
  const out = [];
  for (const d of CURRENT_ROWS) {
    d.re.lastIndex = 0;
    let m;
    while ((m = d.re.exec(line)) !== null) {
      if (m[0].length === 0) { d.re.lastIndex++; continue; }
      const v = m[d.group];
      if (!v || allowlistReason(v)) continue;
      out.push({ value: v, tail: line.slice(m.index + m[0].length) });
    }
  }
  return out;
};

const vercelHits = (rel, text) => scanText(rel, text).filter(h => h.detector === "vercel_bypass");
const sha = v => crypto.createHash("sha256").update(v).digest("hex");

// A 32-character mixed-case alphanumeric literal, the shape of the live value, BUILT HERE so this
// file carries no secret. No digits, because the live one has none -- that is why secret_assignment
// keeps the wide rule for a BYPASS/SECRET name and why a digit test cannot discriminate either.
const SYNTHETIC = "AbCdEfGhIjKlMnOpQrStUvWxYzAbCdEf";

function theSixFalsePositivesAreAllowlistedWithTheirReason() {
  const files = new Map();
  for (const c of THE_SIX) {
    if (!files.has(c.rel)) {
      files.set(c.rel, fs.readFileSync(path.join(REPO, c.rel), "utf8").replace(/\r\n/g, "\n").split("\n"));
    }
  }
  assert.equal(files.size, 4, `AGT-196 named 6 lines in 4 tracked files; got ${files.size} files`);

  let identifiers = 0;
  let shell = 0;
  let suppressed = 0;
  for (const c of THE_SIX) {
    const at = `${c.rel}:${c.line}`;
    const line = files.get(c.rel)[c.line - 1];
    assert.ok(line !== undefined, `${at}: the file has no such line -- AGT-196's measurement drifted`);
    assert.ok(line.includes(c.anchor),
      `${at}: expected to still carry ${JSON.stringify(c.anchor)} -- re-measure AGT-196's six before ` +
      `trusting this guard; the line number moved, the defect may not have`);

    // The control FIRST: the line must have been a reported hit before this ticket, or it is not one
    // of the six and this arm proves nothing about it.
    assert.equal(preReported(line).length, 1,
      `${at}: the pre-AGT-196 rows must report exactly 1 value here -- this arm's control is dead ` +
      `otherwise and the assertion below would pass against any tree`);

    // And now: no vercel_bypass hit, through the shipped scanText().
    assert.deepEqual(vercelHits(c.rel, line), [],
      `${at}: still reported as a vercel_bypass value -- it is ${c.reason ? "allowlisted" : "a callee"}`);
    assert.deepEqual(reported(line), [],
      `${at}: the shipped rows still report a value here`);

    if (c.reason === null) {
      // Capture-suppressed: the allowlist is NOT the mechanism, so the rows must not match at all.
      // Asserting a reason here would pass against a fix that muted the callee by shape.
      for (const d of CURRENT_ROWS) {
        d.re.lastIndex = 0;
        assert.equal(d.re.exec(line), null,
          `${at}: a vercel_bypass row still MATCHES this callee -- \`(?!\\s*\\()\` is the fix here, ` +
          `never an allowlist row`);
      }
      suppressed += 1;
      continue;
    }

    // Allowlisted: the pre-fix capture is exactly what the allowlist must now name.
    const [captured] = preReported(line);
    assert.equal(allowlistReason(captured), c.reason, `${at}: wrong allowlist reason`);
    if (c.reason === IDENTIFIER_REASON) identifiers += 1; else shell += 1;
  }
  assert.equal(identifiers, 3, "AGT-196: 3 of the six are trailing-comma identifiers");
  assert.equal(shell, 2, "AGT-196: 2 of the six are brace-less shell references");
  assert.equal(suppressed, 1, "AGT-196: 1 of the six is a captured callee");

  // The strip is a STRIP, not a widening: the rows themselves still reject the punctuated form on
  // their own. If a later session "simplifies" allowlistReason() away by widening the identifier
  // row to tolerate a comma, this goes red.
  const identifierRow = ALLOWLIST.find(a => a.reason === IDENTIFIER_REASON);
  assert.ok(identifierRow, "the identifier row must still exist");
  assert.equal(identifierRow.re.test("BYPASS_SECRET,"), false,
    "the identifier row must still reject the punctuated form -- the STRIP is the mechanism");
  assert.equal(identifierRow.re.test("BYPASS_SECRET"), true, "and still accept the bare identifier");
  // The strip takes trailing punctuation only -- it may never reach into the middle of a value.
  assert.equal(allowlistReason("BYPASS_SECRET,x"), null,
    "allowlistReason() strips TRAILING punctuation only");
}

function aValueShapedCaptureIsStillReported() {
  const shapes = [
    ["a JS header assignment", `const HDRS = { "x-vercel-protection-bypass": "${SYNTHETIC}" };`],
    ["a BYPASS_SECRET assignment", `const BYPASS_SECRET = "${SYNTHETIC}";`],
    ["a curl -H line", `  -H "x-vercel-protection-bypass: ${SYNTHETIC}" \\`],
  ];
  for (const [label, line] of shapes) {
    const hits = vercelHits("synthetic.txt", line);
    assert.equal(hits.length, 1, `${label}: expected exactly 1 vercel_bypass hit, got ${hits.length}`);
    assert.equal(allowlistReason(SYNTHETIC), null,
      `${label}: the synthetic value must NOT be allowlisted -- it is the shape of the live one`);
    assert.ok(hits[0].text.includes(mask(SYNTHETIC)),
      `${label}: the hit must carry the value masked to four characters`);
    assert.equal(hits[0].text.includes(SYNTHETIC), false,
      `${label}: the hit text leaked the whole value`);
    assert.equal(reported(line).length, 1, `${label}: the shipped rows must report it`);
  }

  // The callee suppression is SYNTAX, not length: a callee longer than the class minimum must not
  // report either. Without `(?![A-Za-z0-9_-])` the greedy class backtracks one character to dodge
  // the `(` and reports 19 of the 20 -- measured, and this is the arm that catches it.
  for (const callee of ["loadBypassSecret", "loadTheBypassSecretX", "loadTheBypassSecretValueHere"]) {
    const line = `const BYPASS_SECRET = ${callee}();`;
    assert.deepEqual(vercelHits("synthetic.mjs", line), [],
      `a ${callee.length}-character callee must not be reported as a value`);
  }
  // ...and the same name NOT followed by a call still is, so the lookahead did not mute the shape.
  // ASSEMBLED, NOT WRITTEN OUT: spelled literally here, this line would itself be a reported
  // `vercel_bypass` value in the tracked tree -- a quoted 20-character string after a `BYPASS_SECRET =`
  // is exactly what the detector is supposed to catch -- and arm (c) would go red on this very file.
  // Measured, not guessed: it did, at 43 lines in 43 files, until this join broke up the shape.
  const quotedCallee = ["loadThe", "Bypass", "SecretX"].join("");
  assert.equal(quotedCallee.length, 20, "the quoted control must be past the class minimum of 16");
  assert.equal(vercelHits("synthetic.mjs", `const BYPASS_SECRET = "${quotedCallee}";`).length, 1,
    "the lookahead must key on the `(`, never on the string itself");
}

function theTreeCarriesAtMostOneDistinctBypassValue() {
  const rels = trackedFiles(REPO);
  assert.ok(Array.isArray(rels) && rels.length > 0, "trackedFiles() must list this checkout");
  const hashes = new Set();
  let lines = 0;
  const files = new Set();
  let scanLines = 0;
  for (const rel of rels) {
    let buf;
    try { buf = fs.readFileSync(path.join(REPO, rel)); } catch { continue; }
    if (buf.subarray(0, 8192).includes(0)) continue;
    const text = buf.toString("utf8");
    scanLines += vercelHits(rel, text).length;
    text.replace(/\r\n/g, "\n").split("\n").forEach((line, i) => {
      for (const { value, tail } of reported(line)) {
        hashes.add(sha(value));
        lines += 1;
        files.add(rel);
        const where = `${rel}:${i + 1}`;
        assert.equal(/^[A-Z][A-Z0-9_]+$/.test(value), false,
          `${where}: a reported value matches the identifier row -- the strip is not reaching it`);
        assert.equal(value.startsWith("$"), false,
          `${where}: a reported value is a shell reference`);
        assert.equal(/^\s*\(/.test(tail), false,
          `${where}: a reported value is followed by \`(\` -- it is a callee, not a value`);
      }
    });
  }
  assert.ok(hashes.size <= 1,
    `the tree must carry at most ONE distinct reported vercel_bypass value; got ${hashes.size} ` +
    `(compared by sha256 -- no value is printed here or anywhere in this file)`);
  assert.ok(scanLines >= lines,
    `scanText() reported ${scanLines} vercel_bypass lines and the re-derivation found ${lines} -- ` +
    `the re-derivation may never see MORE than the shipped scanner does`);
  console.log(`  [AGT-196] tracked tree: ${lines} reported vercel_bypass line(s) in ${files.size} ` +
    `file(s), ${hashes.size} distinct value(s) by sha256, ${scanLines} scanText() hit(s); none is an ` +
    `identifier, a $reference or a callee`);
}

function theNaiveWideningWouldMuteTheTree() {
  const naive = /^[A-Za-z][A-Za-z0-9_]+$/;
  assert.equal(naive.test(SYNTHETIC), true,
    "AGT-196's own remedy (2) -- widening the identifier row to mixed case -- MATCHES a 32-character " +
    "mixed-case value, so it is a blanket mute, not a fix. This is why the mixed-case class is " +
    "discriminated in the CAPTURE. Do not restore it.");

  // And against the live tree, not just the synthetic: every value reported today would be muted.
  const rels = trackedFiles(REPO);
  let live = 0;
  let muted = 0;
  for (const rel of rels) {
    let buf;
    try { buf = fs.readFileSync(path.join(REPO, rel)); } catch { continue; }
    if (buf.subarray(0, 8192).includes(0)) continue;
    for (const line of buf.toString("utf8").replace(/\r\n/g, "\n").split("\n")) {
      for (const { value } of reported(line)) {
        live += 1;
        if (naive.test(value)) muted += 1;
      }
    }
  }
  assert.equal(muted, live,
    `the widening would mute ${muted} of ${live} live reported line(s) -- if that is no longer ALL ` +
    `of them the tree's value shape changed and AGT-196's item 4 needs re-measuring`);
  console.log(`  [AGT-196] negative control: the ticket's own widening matches the synthetic value ` +
    `and would mute ${muted} of ${live} live reported line(s) -- all of them`);
}

export default async function run() {
  theSixFalsePositivesAreAllowlistedWithTheirReason();
  aValueShapedCaptureIsStillReported();
  theTreeCarriesAtMostOneDistinctBypassValue();
  theNaiveWideningWouldMuteTheTree();
  console.log(`  [AGT-196] the six false positives are each suppressed by their own mechanism (3 ` +
    `trailing-comma identifiers, 2 brace-less shell references, 1 captured callee), each red under ` +
    `the reconstructed pre-AGT-196 rows; a synthetic 32-character mixed-case value is still reported ` +
    `once and masked to four characters in all three live shapes; a callee of 16, 20 and 27 ` +
    `characters is suppressed while the same name quoted is reported`);
}

selfRun(import.meta.url, run);
