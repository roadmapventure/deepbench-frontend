// DeepBench v7.0.215 | tests/regression/SES-187-title-gate.js | SES-187 (harness conformance repaired by SES-189's cycle)
// FEATURE: a proposed board title has to survive a deterministic gate before it can be written
// into public.backlog_items.title.
//
// WHY THIS TEST EXISTS RATHER THAN A RULE IN A DOC. The titles SES-187 repairs are derived by
// judgment — a subagent reading each ticket's own description — because the ticket's own "one
// mechanical pass" framing was measured false before anything shipped: a regex extract over all
// 155 affected rows returned a caveat as DAT-15's name, the marker again as LOG-126's, a
// provenance clause as LAV-17's, and mid-clause cuts on CHI-70 and CHI-47. Judgment is the right
// tool for the derivation and the wrong thing to trust unchecked on 155 rows of the surface John
// uses to identify tickets, so the gate is the half that must stay mechanical. Every rule it
// enforces corresponds to one of those observed failures; none is hypothetical.
//
// The failure mode being protected against is a NON-OBVIOUS negative: a later editor tuning the
// gate to "accept more rows" makes the pass look more complete and makes the board worse, because
// a plausible-but-wrong title HIDES the defect that backlog_display_title()'s fallback exists to
// keep visible (runner-cycle.md's title rule). Rejecting is the safe direction: a rejected row
// keeps its broken title and stays counted as outstanding.
//
// Seven assertions, each pinned to a real observed string. The accept case is what makes the
// rejects meaningful — a gate that rejected everything would pass a rejects-only test.
//
// No network, no credentials, no database. It imports validate() from the script.
//
// HARNESS CONFORMANCE (SES-189's cycle, v7.0.215 — a repair, and worth stating plainly rather
// than fixing silently). As shipped in v7.0.214 this file ran its assertions at MODULE TOP LEVEL
// and printed its own [PASS] line. run-all.js imports each test module and calls its default
// export, so the assertions did run — and then the suite failed the file twice: once for "does
// not export a default async function", once on SES-28-self-run-guard.js for not importing the
// self-run guard. Measured live 2026-08-24T03:4xZ: 47/49, both failures this one file. The
// v7.0.214 cycle's ledger claim of "regression 48/48" therefore did not hold. Nothing about the
// seven assertions changed here — they are byte-identical in content and order; only the wrapper
// they live in did.

import assert from "assert";
import { validate } from "../../scripts/apply-title-regeneration.js";
import { selfRun } from "./_lib/self-run.js";

const ok = t => validate({ new_title: t }, "`Post-beta`");

async function run() {
  let n = 0;
  const check = (label, cond) => { assert.ok(cond, label); n++; };

  // 1. The accept case — a real derived title from LOG-134's description.
  check(
    "a real derived title is accepted",
    ok("15+ pattern_vocabulary gold rows have criteria IS NULL and can never match anything").ok === true
  );

  // 2. An honest null is a reject, not a crash. The subagent is REQUIRED to return null for a row
  //    whose description states no subject; that must leave the row alone, never write "null".
  check("a null proposal is rejected", ok(null).ok === false);

  // 3. The marker again (LOG-126's mechanical output). The single most important reject: it is what
  //    a naive extract produces for a row whose description is only the marker.
  check("the retired marker is rejected as a title", ok("Post-beta").ok === false);

  // 4. Provenance (LAV-17's mechanical output). Same defect as the import bug, one clause deeper.
  check(
    "a provenance clause is rejected",
    ok("Shrunk 2026-08-07 by the sibling ticket, two of three carriers already shipped").ok === false
  );

  // 5. A caveat opener (DAT-15's mechanical output).
  check(
    "a caveat opener is rejected",
    ok("latent, not live: nothing reads the_reasoning, so nothing wrong can reach a surface").ok === false
  );

  // 6. A mid-clause cut (CHI-47's mechanical output). This is the one a length-only gate lets
  //    through, which is why the tail check exists at all.
  check(
    "a title ending mid-clause is rejected",
    ok("qaEvidence and hypFlow are single state slots, overwritten on every new").ok === false
  );

  // 7. A title identical to the broken one it would replace is a no-op dressed as a repair.
  check("a title identical to the stored broken one is rejected", ok("`Post-beta`").ok === false);

  assert.strictEqual(n, 7, "all seven assertions must run");
}

selfRun(import.meta.url, run);
export default run;
