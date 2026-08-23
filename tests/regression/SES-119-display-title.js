// DeepBench v7.0.184 | tests/regression/SES-119-display-title.js | SES-119
// FEATURE: every display shows a ticket's ID *and a usable title*, and §10 splits into the two
// lists John asked for.
//
// John's standing instruction, 2026-08-22, total scope: "across every session, display or
// anything that references work you perform for the backlog" — always ID + title, because "he
// does not memorize IDs".
//
// WHY THIS TEST EXISTS RATHER THAN A RULE IN A DOC. The thing being protected is a NON-OBVIOUS
// negative: the Title column must NOT be `backlog_items.title` on its own. That reads like the
// whole ticket, it is what the next sweeper will "simplify" it back to, and it is wrong on 46 of
// the 562 open numbered tickets — measured 2026-08-23 — whose title is a bare retired declaration
// (38 of them literally `Post-beta`). Two of those, LOG-134 and LAV-30, sit in §8's live top 12,
// so the simplification renders "`Post-beta`" as their title: strictly worse than the `gist`
// workaround it replaced. A doc sentence saying "don't do the obvious thing" is exactly the class
// of rule this platform has had to convert into structure eight times (SES-86 phase 3, v7.0.146,
// SES-101, SES-111, SES-127, SES-128, SES-129, SES-143).
//
// Five assertions. THREE of them fail on the pre-change tree — see the negative controls, which
// are what make this QA rather than a presence check.
//
// No network, no credentials, no database. It reads two repo files.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..");
const TEMPLATE = path.join(ROOT, "docs", "runbooks", "briefing-template.html");
const CONTRACT = path.join(ROOT, "docs", "runbooks", "briefing-page.md");

export const DISPLAY_FN = "backlog_display_title";

// Lift one function's source out of the template and make it callable, rather than copying its
// body into this file. A copy passes forever after the real one changes — the same reason
// DIR-603f44ea reads its functions out of the template instead of restating them (John's rule,
// 2026-08-23: "you should never be throwing away tests", and a test of a stale copy is one).
export function liftFunction(src, name) {
  const start = src.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `briefing-template.html no longer defines ${name}()`);
  let depth = 0, i = src.indexOf("{", start), end = -1;
  for (; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  assert.ok(end > start, `could not find the end of ${name}()`);
  return src.slice(start, end);
}

function makeSkipRow(src) {
  const body = liftFunction(src, "skipRow");
  // Minimal stubs for the two globals skipRow closes over.
  const factory = new Function(
    "esc", "state",
    `${body}; return skipRow;`
  );
  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return factory(esc, { unblocks: {} });
}

function run() {
  const src = fs.readFileSync(TEMPLATE, "utf8");
  const contract = fs.readFileSync(CONTRACT, "utf8");

  // ---- 1. §8's Title column is the fallback function, not the raw column, not the gist -------
  // NEGATIVE CONTROL: the pre-change file carried the standing instruction "The Title column uses
  // that `gist` extract, NOT `title`". If that sentence is still here, §8 is still rendering
  // description provenance and this assertion must fail.
  assert.ok(src.includes(DISPLAY_FN),
    `briefing-template.html never mentions ${DISPLAY_FN}() — §8's Title column has been reverted ` +
    "to a raw column or to the gist extract (SES-119).");
  assert.ok(!/The Title column uses that `gist` extract, NOT/.test(src),
    "briefing-template.html still carries SES-126's retired rule 'the Title column uses that " +
    "`gist` extract, NOT `title`'. SES-91 repaired the column that rule existed for; SES-119 " +
    "replaced it with backlog_display_title(). Two contradictory instructions in one file is how " +
    "the next cycle picks the wrong one.");
  assert.ok(new RegExp(`left\\(\\s*public\\.${DISPLAY_FN}\\(`).test(src),
    "§8's regeneration SQL no longer projects the display title — the contract must move with " +
    "the render (SES-124's rule, after step 5 and step 7 drifted).");

  // ---- 2. The contract says the same thing as the render ------------------------------------
  assert.ok(contract.includes(DISPLAY_FN),
    `docs/runbooks/briefing-page.md does not mention ${DISPLAY_FN}() — a cycle rebuilding from ` +
    "the contract alone would render the wrong column, which is exactly the drift SES-144 had to " +
    "correct for the Epic column.");

  // ---- 3. §10 renders BOTH lists, and both survive being empty -------------------------------
  // NEGATIVE CONTROL: the pre-change file had ONE table under a single 'Sorted:' paragraph and
  // no sub-list labels at all, so both of these fail on it.
  assert.ok(/Needs your decision/.test(src) && /Needs your desktop/.test(src),
    "§10 no longer renders both of John's two lists (2026-08-22: \"two lists, because they " +
    "trigger different actions\"). Re-merging them puts a question he can answer from his phone " +
    "in the same list as work that needs him at a keyboard.");
  assert.ok(/class="listhead"><span class="n">10\.1</.test(src) &&
            /class="listhead"><span class="n">10\.2</.test(src),
    "§10's two lists have lost their 10.1 / 10.2 sub-labels. They are sub-blocks INSIDE §10's " +
    "existing fold — the LOCKED SECTION ORDER is extended, never renumbered (SES-132's rule).");

  // ---- 4. skipRow renders the kickoff line only when there IS a kickoff ----------------------
  // This is the assertion with a real behavioural negative control: the same call with the last
  // argument omitted must NOT produce the line. A test that only checked the positive case would
  // pass on an implementation that printed "Kickoff ready" on every row, which would tell John
  // that work with no design is ready to paste — the opposite of the point.
  const skipRow = makeSkipRow(src);
  const withKick = skipRow("sid-1", "SES-117", "P10 - Tooling", 2, "needs-desktop", "partial",
    "Structural filing guarantees", "needs a session you attend", "Aug 23", "prep", null, false,
    "docs/kickoffs/v7.0.178-SES-117-backlog-structural-checks.md");
  const withoutKick = skipRow("sid-2", "SES-118", "P10 - Tooling", 3, "needs-desktop", "partial",
    "Rename backlog status value", "needs a session you attend", "Aug 23", "prep", null, true);

  assert.ok(/class="kick">Kickoff ready/.test(withKick),
    "a needs-desktop row WITH a kickoff_link no longer shows the 'Kickoff ready' line — that " +
    "line is the difference between sitting down to design and sitting down to paste (SES-119).");
  assert.ok(withKick.includes("v7.0.178-SES-117-backlog-structural-checks.md"),
    "the 'Kickoff ready' line does not carry the kickoff path, so it tells John a design exists " +
    "without telling him where it is.");
  assert.ok(!/Kickoff ready/.test(withoutKick),
    "skipRow() prints 'Kickoff ready' on a row with NO kickoff_link — that claims a design " +
    "exists when none does. The argument is optional and its absence must render nothing.");

  // ---- 5. The two row helpers keep their OPPOSITE escaping contracts -------------------------
  // Named here because it is the single most likely thing for a well-meaning sweeper to
  // "harmonise", and doing so double-escapes one section or un-escapes the other. §8's call sites
  // pass HTML entities (&rsquo;, &mdash;) and queueRow() interpolates raw; §10's pass plain text
  // and skipRow() esc()s. Both are correct; they are simply not the same contract.
  assert.ok(/<td class="ttl2">'\+title\+'<\/td>/.test(src),
    "queueRow() no longer interpolates its title raw. §8's call sites pass HTML entities, so " +
    "esc()ing here renders '&rsquo;' as literal text across the whole queue matrix.");
  assert.ok(/<td class="ttl2">'\+esc\(title\)\+'<\/td>/.test(src),
    "skipRow() no longer esc()s its title. §10's call sites pass RAW ticket prose, so dropping " +
    "the escape puts unescaped board text into the page.");

  return "SES-119: 10 assertions passed — §8 renders the display-title fallback, the contract " +
    "agrees with the render, §10 carries both of John's lists, the kickoff line appears only " +
    "with a kickoff, and the two row helpers keep their opposite escaping contracts.";
}

selfRun(import.meta.url, run);
export default run;
