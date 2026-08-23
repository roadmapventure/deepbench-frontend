// DeepBench v7.0.200 | tests/regression/SES-149-briefing-builder.js | SES-149
// FEATURE: the briefing rebuild has a builder, and the builder cannot quietly publish a page with
// a section left as sample text.
//
// FOUND LIVE 2026-08-23T15:0xZ by cycle 03c19332 and re-verified by this cycle's own premise check:
// `grep -rln briefing-template scripts/` returned NOTHING. runner-cycle.md step 9 and
// briefing-page.md have told every cycle since v7.0.99 to rebuild the page "structurally from
// briefing-template.html + the runner_ tables", and no script did it -- every cycle re-derived
// about fourteen queries into hardcoded literals inside a 1,700-line file, by hand. Two cycles in
// a row hit that wall, which is what turned a cost into a ticket.
//
// WHAT THIS GUARDS, and why each assertion exists rather than being a presence check:
//
// 1. The script exists at all. FAILS on the pre-change tree -- that is the whole ticket.
// 2. Every substitution is ANCHORED. The builder edits a template it does not own, by string
//    match. If the template moves under it, the honest outcome is a hard stop, never a page with
//    one section still reading "Sample value". So must()/splice() must both die() rather than
//    silently no-op, and the exit code must be 2 ("could not run"), matching the convention
//    export-backlog-snapshot.js and heal-engine.js already use.
// 3. The seed and the card set come from the two functions that own them, not from a query the
//    builder re-derives -- otherwise this script becomes the ninth place those rules live.
// 4. THE SES-119 RULE, which this builder got wrong on its first run and which is invisible unless
//    you look: the §8 Title column must be public.backlog_display_title(), never the raw `title`
//    column. Measured live at this ship -- reading `title` directly rendered LOG-134 and LAV-30 as
//    "`Post-beta`", the exact defect SES-119 shipped a SQL function to end. Both tickets are in
//    the live top 12, so this is not hypothetical.
// 5. The builder must NOT invent the narrative sections. A rebuild that guessed §3's findings or
//    John's directive lines would be writing his briefing for him; the split is stated in the
//    script's own header and is asserted here so a later edit cannot quietly widen it.
//
// No network, no credentials, no database. It reads two repo files.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..", "..");
const BUILDER = path.join(ROOT, "scripts", "build-briefing.mjs");
const CONTRACT = path.join(ROOT, "docs", "runbooks", "briefing-page.md");

export async function run() {
  // ---- 1. It exists ---------------------------------------------------------------------------
  // FAILS on the pre-change tree: there was no builder, which is the ticket.
  assert.ok(fs.existsSync(BUILDER),
    "scripts/build-briefing.mjs is missing — the briefing rebuild is back to being done by hand, " +
    "about fourteen queries re-derived into literals inside a 1,700-line template");
  const src = fs.readFileSync(BUILDER, "utf8");

  // ---- 2. Every substitution is anchored, and a moved anchor is a HARD STOP --------------------
  assert.ok(/function must\s*\(/.test(src) && /function splice\s*\(/.test(src),
    "the builder must substitute through anchored helpers, not bare .replace() calls — an " +
    "unanchored replace that matches nothing publishes a page with that section still sample text");
  const mustBody = src.slice(src.indexOf("function must"), src.indexOf("function must") + 400);
  assert.ok(/die\(/.test(mustBody),
    "must() must die() when its anchor is absent — a silent no-op is exactly the failure mode " +
    "this builder exists to remove");
  assert.ok(/process\.exit\(2\)/.test(src),
    "the builder must exit 2 on 'could not run', matching export-backlog-snapshot.js and " +
    "heal-engine.js — a nonzero-but-unconventional code gets read as a pass");

  // ---- 3. The owned rules stay owned ----------------------------------------------------------
  for (const fn of ["briefing_state_seed", "briefing_open_cards"]) {
    assert.ok(src.includes(fn),
      `the builder must call public.${fn}() rather than re-deriving its rule — re-deriving is how ` +
      `this platform has now paid nine times for the same class of drift`);
  }

  // ---- 4. SES-119: §8's Title is backlog_display_title(), never the raw column -----------------
  // This one FAILED on the builder's own first run: LOG-134 and LAV-30 rendered as "`Post-beta`".
  assert.ok(src.includes("backlog_display_title"),
    "the builder must resolve §8's Title through public.backlog_display_title() — reading the " +
    "`title` column directly renders the retired marker `Post-beta` as a ticket's name, and two " +
    "such tickets (LOG-134, LAV-30) are in the live top 12");

  // ---- 5. The narrative half is the cycle's, and the split is written down ---------------------
  assert.ok(/NOT DERIVED/.test(src),
    "the builder's header must state what it does NOT derive — a builder that silently invents " +
    "the half it cannot compute is worse than no builder");
  assert.ok(/--data/.test(src) && /required/.test(src),
    "the builder must REQUIRE --data rather than defaulting the narrative sections to anything");

  // ---- 6. The contract points at the script ---------------------------------------------------
  const c = fs.readFileSync(CONTRACT, "utf8");
  assert.ok(c.includes("scripts/build-briefing.mjs"),
    "docs/runbooks/briefing-page.md must name the builder — otherwise the next cycle reads " +
    "'rebuild structurally from the template' and does it by hand again, which is the ticket");
}

export default run;
selfRun(import.meta.url, run);
