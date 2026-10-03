// DeepBench v7.0.319 | tests/regression/SES-50-resolved-id-citations.js | SES-50 -- a LOCKED
// ARCHITECTURE.md section stopped presenting a RESOLVED ticket id as an open question, and the
// close-out rule that lets it happen again is written down.
//
// WHAT IS BEING PINNED, and why the obvious guard is the wrong one. The tempting test is
// `assert(!arch.includes("LOG-28's open question"))` -- one string, one file. It passes against a
// build this ticket forbids: the one where a cycle simply DELETES the sentence. That deletion
// looks like a fix and is a regression, because the sentence carries TWO facts welded together --
// a dead citation (LOG-28's question, resolved 2026-07-22 by AI-35 2b) and a LIVE requirement
// ("all current entries must be re-verified ... before the model is considered complete", which
// AI-35 still carries at status `partial`, read from public.backlog_items at this ship, not
// recalled). Deleting the paragraph retires the live requirement silently. So the clauses come in
// pairs: the resolution must be RECORDED, and the open half must SURVIVE.
//
// THE SECOND HALF OF THE TICKET IS THE UPSTREAM RULE, and a guard that only checked
// ARCHITECTURE.md would pass on a tree where the same defect is guaranteed to recur. SES-50's own
// fix sentence names both: "correct the §19i sentence, AND add the missing upstream step -- a
// close-out that resolves an ID must grep ARCHITECTURE.md for that ID and amend any section citing
// it as open, in the same commit (CLAUDE-DESIGN.md Step 5c)." Clauses 4-6 pin that rule, including
// the two boundaries that make it usable rather than noisy: [LOCKED] is not an exemption, and a
// hit that merely CITES an id as authority is not a defect.
//
// THE BEHAVIOURAL CLAUSE PROVES A DIFFERENCE, NOT A PROPERTY. presentsAsOpen() is pure and
// exported, and it is run over the REAL §19i paragraph from both trees: it must return true on the
// pinned pre-change file and false on this one. A guard asserting only "false today" would pass
// just as well on a tree where the paragraph was deleted outright, which is the failure above.
//
// EVERY CLAUSE CARRIES ITS OWN NEGATIVE CONTROL (`breaks`), driven by the SES-158 vacuity
// meta-check: a clause that still passes after its own mutation is asserting nothing and fails the
// suite. On top of that there is a FILE-LEVEL negative control -- every clause is run against the
// pinned pre-change tree, where all of them must FAIL.
//
// THE PRE-CHANGE TREE IS PINNED BY SHA, NEVER BY THE `origin/dev` BRANCH NAME. A control that
// resolves "before" as a moving branch self-destructs the moment the ship lands on that branch:
// origin/dev then CONTAINS the change, every clause passes on "both" trees, and the control
// reports this ship as un-pinning. That is SES-215 (v7.0.307) and it is the open defect SES-240
// carries against SES-236 today -- so this file does not repeat it. If the SHA is unreachable (a
// shallow clone) the control declares itself not-run rather than passing vacuously.
//
// Credential-free and network-free by construction: every clause reads source text; the file-level
// control needs git only.

import assert from "assert";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PRE_CHANGE_SHA = "7c52f7a6f2c474b8c13648883e8cc3be43cfcc23";   // origin/dev immediately before SES-50 (v7.0.319) landed
const ARCH = "docs/ARCHITECTURE.md";
const DESIGN = "CLAUDE-DESIGN.md";

// The id whose stale citation cost a session's time on 2026-07-29 (design-log-37).
const ID = "LOG-28";

// ---- pure helpers (exported so they are testable, and derived from nothing) ---------------------

// The openness vocabulary the Step 5c rule tells a reader to look for. Kept here as data so the
// rule's prose and this detector cannot drift into two different lists -- clause 7 asserts the
// rule text actually names them.
export const OPENNESS_MARKERS = [
  "open question",
  "unresolved",
  "must resolve",
  "waiting on",
  "not yet",
  "pending",
  "needs its own look",
];

// Returns the paragraph (blank-line delimited block) identified by `anchor`.
//
// THE ANCHOR IS NOT OPTIONAL, and leaving it out was this guard's own first bug -- caught on its
// first run, before the ship. Selecting "the first block containing LOG-28" picks the file's
// `# Amended` provenance header, because THIS ship's own header line names LOG-28 while describing
// the fix. The guard would then grade the amendment note instead of §19i: it passes for the wrong
// reason today, and rots the moment a later amendment line mentions the id. Anchor on the prose
// being governed, never on the id being searched for.
export function paragraphMentioning(src, anchor) {
  const blocks = String(src).split(/\n\s*\n/);
  return blocks.find(b => b.includes(anchor)) || "";
}

// The §19i Layer C paragraph, identified by prose that predates this ship and survives it -- so the
// same anchor selects the same paragraph on both trees, which the file-level control requires.
const ANCHOR = "Governance requirement carried over from the prior model";

// The single line containing `needle`. THE SWEEP CLAUSES MUST SCOPE THEIR ABSENCE TESTS, and this
// is not a convenience -- it is the guard being made consistent with the rule this ticket ships.
// Step 5c now says retired wording belongs in the file's `# Amended` header and never inline, so
// ARCHITECTURE.md's header LEGITIMATELY contains every phrase these clauses assert is gone. A
// whole-file `!includes(...)` therefore fails on a correctly-amended file -- which is exactly what
// it did here, on this ship, once the header was written. Absence is asserted where the rule
// demands absence: the live row, never the provenance note above it.
export function lineContaining(src, needle) {
  return String(src).split("\n").find(l => l.includes(needle)) || "";
}

// TRUE when the prose presents `id` as still open.
//
// SCOPED TO THE SENTENCE, which is what the Step 5c rule tells a human to do ("read the sentence
// around it"). Two cheaper forms were tried against real text and both are wrong:
//
//   - A bare substring search over the paragraph. The FIXED paragraph legitimately says "the audit
//     it opened is not finished" -- an openness marker about a DIFFERENT subject (AI-35, genuinely
//     partial) -- so this form reports the fix as the defect.
//   - A fixed character window after the id (160 was tried). It straddles sentence boundaries, so
//     "Shipped per LOG-28, which is closed. Unrelated work is not yet scheduled." reads as open.
//     Caught by this file's own both-directions fixture before the ship, not reasoned about.
//
// The splitter is deliberately conservative: it breaks on `. `, `! ` and `? ` only when the next
// character is uppercase, so "Bignold et al. 2021" and "arXiv:2102.02441" do not manufacture a
// break. Over-merging is the safe direction here -- it can only make the detector MORE likely to
// report open, never less, and a false "still open" is a sentence a human re-reads while a false
// "resolved" is the defect this ticket exists to stop.
export function sentencesOf(paragraph) {
  return String(paragraph).split(/(?<=[.!?])\s+(?=[A-Z(`*[])/);
}

export function presentsAsOpen(paragraph, id) {
  return sentencesOf(paragraph)
    .filter(s => s.includes(id))
    .some(s => {
      const lower = s.toLowerCase();
      return OPENNESS_MARKERS.some(m => lower.includes(m));
    });
}

// ---- clauses -----------------------------------------------------------------------------------

const CLAUSES = [
  {
    id: "log28-recorded-resolved",
    detail:
      `${ARCH}'s §19i governance paragraph must RECORD ${ID}'s resolution -- the date, the ticket ` +
      `that closed it (AI-35 2b), and the pattern name it resolved to.`,
    test: s => {
      const p = paragraphMentioning(s.arch, ANCHOR);
      return /RESOLVED/.test(p) && p.includes("AI-35") && p.includes("2026-07-22") &&
             p.includes("Persistent Advice Storage");
    },
    breaks: s => ({ ...s, arch: s.arch.replace("Persistent Advice Storage", "some pattern") }),
  },
  {
    id: "log28-no-longer-presented-open",
    detail:
      `${ARCH} must no longer present ${ID} as an open question. This is the defect itself: the ` +
      `clause read "is the first concrete case this audit must resolve" for 38 days after it closed.`,
    test: s => !presentsAsOpen(paragraphMentioning(s.arch, ANCHOR), ID),
    breaks: s => ({
      ...s,
      arch: s.arch.replace(`\`${ID}\`'s question`, `\`${ID}\`'s open question`),
    }),
  },
  {
    id: "the-live-requirement-survives",
    detail:
      `The paragraph must still carry the OPEN half -- the re-verification requirement and the ` +
      `fact that AI-35 is not finished. A fix that deleted the sentence would pass clause 2 and ` +
      `silently retire a live requirement.`,
    test: s => {
      const p = paragraphMentioning(s.arch, ANCHOR);
      return /re-verified against real sources/.test(p) && /not finished/.test(p) &&
             /partial/.test(p);
    },
    breaks: s => ({ ...s, arch: s.arch.replace("is not finished", "is complete") }),
  },
  {
    id: "step5c-carries-the-sweep-rule",
    detail:
      `${DESIGN} Step 5c must instruct a close-out that resolves an ID to grep ARCHITECTURE.md for ` +
      `it and amend any section presenting it as open, in the SAME commit. Without this the ` +
      `defect is guaranteed to recur -- the close-out that resolved ${ID} never looked.`,
    // ANCHORED ON THE GREP ITSELF, not on "same commit" -- the loose form was VACUOUS and the
    // meta-check caught it before the ship. Step 5c's pre-existing SES-32 bullet already contains
    // "in this same commit", so a clause testing that phrase passed on the pre-change tree and the
    // breaks() mutation hit SES-32's sentence instead of this rule's. The grep command is unique
    // to the rule this ticket adds.
    test: s => s.design.includes('grep -n "<ID>" docs/ARCHITECTURE.md') &&
               /amend it \*\*in this same commit\*\*/.test(s.design) &&
               /SES-50/.test(s.design),
    breaks: s => ({
      ...s,
      design: s.design.replace('grep -n "<ID>" docs/ARCHITECTURE.md', "check the docs sometime"),
    }),
  },
  {
    id: "locked-is-not-an-exemption",
    detail:
      `The rule must say [LOCKED] is not an exemption. The section this ticket fixed is LOCKED, ` +
      `and a reader who treats locked as untouchable reproduces the defect exactly.`,
    test: s => /`\[LOCKED\]` is not an exemption/.test(s.design) &&
               /governs the \*decision\*, never the \*status\* of a citation/.test(s.design),
    breaks: s => ({
      ...s,
      design: s.design.replace("`[LOCKED]` is not an exemption", "locked sections are exempt"),
    }),
  },
  {
    id: "a-mere-citation-is-not-a-defect",
    detail:
      `The rule must exclude hits that merely cite the id as authority ("per LOG-28"). Without ` +
      `that boundary the sweep flags every reference in the file and stops being run.`,
    test: s => /merely cites the ID as the authority/.test(s.design) &&
               /is not a defect; leave it/.test(s.design),
    breaks: s => ({
      ...s,
      design: s.design.replace("is not a defect; leave it", "must also be amended"),
    }),
  },
  {
    id: "detector-vocabulary-matches-the-written-rule",
    detail:
      `Every openness marker this file detects on must be named in the Step 5c prose, so the ` +
      `detector and the rule a human follows cannot drift into two different lists.`,
    test: s => OPENNESS_MARKERS.every(m => s.design.toLowerCase().includes(m)),
    breaks: s => ({ ...s, design: s.design.replace('"needs its own look"', '"—"') }),
  },

  {
    id: "amendment-does-not-quote-the-retired-wording",
    detail:
      `Step 5c must tell the amender not to quote the phrase being retired inline. This is not ` +
      `style: a correction note that quotes the dead sentence leaves it searchable in the live ` +
      `paragraph, which defeats every absence check downstream. Caught three times inside this ` +
      `ticket's own build by the clauses above.`,
    test: s => /Write the amendment without quoting the retired wording/.test(s.design) &&
               /`# Amended` header, never inline/.test(s.design),
    breaks: s => ({
      ...s,
      design: s.design.replace("**Write the amendment without quoting the retired wording**", "Amend it"),
    }),
  },

  // ---- the one-pass sweep (SES-50 scope item 3) ------------------------------------------------
  // The ticket's third scope item is "a one-pass sweep for other archived IDs cited as open in
  // ARCHITECTURE.md". It found three more, each verified against a live source before it was
  // touched -- src/data/agents.js for the roster, the file system for the screen, and
  // FEATURES-ARCHIVE.md's status column for LOG-95. Pinned here so the sweep's result is a fact
  // the suite defends, not a claim on a ship card.
  {
    id: "sweep-editor-agents-are-named",
    detail:
      `${ARCH} said the three editor agents' names were "TBD in S-EDITOR-01". They were named and ` +
      `shipped (AG-14/15/16) and are live in src/data/agents.js.`,
    test: s => {
      const row = lineContaining(s.arch, "Seeded with all 9 existing agents");
      return !/names TBD in S-EDITOR-01/.test(row) &&
             /Alex Reeves `ED-01`/.test(row) && /Claire Sutton `ED-03`/.test(row);
    },
    breaks: s => ({ ...s, arch: s.arch.replace("Alex Reeves `ED-01`", "names TBD") }),
  },
  {
    id: "sweep-market-intel-screen-exists",
    detail:
      `${ARCH}'s broker registry blocked a row on "screen doesn't exist yet". The screen shipped ` +
      `(MI-01's sub-sessions); the broker AA-90 is still genuinely open, so the ❌ stays and only ` +
      `the dead BLOCKING REASON is corrected -- a fix that flipped the ❌ would be a fresh error.`,
    test: s => {
      const row = lineContaining(s.arch, "Marcus Webb (GEO CSO Expert, CI-01)");
      return !/screen doesn't exist yet/.test(row) &&
             /MarketIntelligenceScreen\.jsx` is live/.test(row) &&
             /tracked by `AA-90` \(open\)/.test(row) &&
             /❌ Not built/.test(row);   // the ❌ must SURVIVE: AA-90 is genuinely open
    },
    breaks: s => ({
      ...s,
      arch: s.arch.replace("tracked by `AA-90` (open)", "done"),
    }),
  },
  {
    id: "sweep-log95-recorded-shipped",
    detail:
      `${ARCH} called LOG-95 "discovery only; needs its own design session + Architect Review ` +
      `before coding" after S-LOG-95 (v6.3.184) and S-LOG-95b (v6.3.186) had shipped it.`,
    test: s => {
      const p = paragraphMentioning(s.arch, "Build ticket: `LOG-95`");
      return !/needs its own design session \+ Architect Review/.test(p) &&
             /`S-LOG-95` \(`v6\.3\.184`\)/.test(p) && /`S-LOG-95b` \(`v6\.3\.186`\)/.test(p);
    },
    breaks: s => ({ ...s, arch: s.arch.replace("`S-LOG-95b` (`v6.3.186`)", "a later session") }),
  },
];

export default async function run() {
  const read = f => fs.readFileSync(path.join(ROOT, f), "utf8");
  const src = { arch: read(ARCH), design: read(DESIGN) };

  // 1..N: the shipped tree satisfies every clause.
  for (const c of CLAUSES) {
    assert.ok(c.test(src), `${c.id} -- ${c.detail}`);
  }

  // SES-158's vacuity meta-check: every clause must FAIL against its own broken source.
  for (const c of CLAUSES) {
    assert.ok(
      !c.test(c.breaks(src)),
      `${c.id} is VACUOUS -- it still passes after its own breaks() mutation, so it pins nothing`
    );
  }

  // presentsAsOpen() must be discriminating in BOTH directions on hand-built fixtures, so a later
  // edit cannot quietly widen it into a function that returns false for everything (which would
  // make clause 2 vacuous in a way breaks() alone would not catch).
  assert.ok(
    presentsAsOpen("`LOG-28`'s open question is the first concrete case this audit must resolve.", ID),
    "presentsAsOpen() missed the exact sentence this ticket fixed -- it is not detecting"
  );
  assert.ok(
    !presentsAsOpen("Shipped per `LOG-28`, which is closed. Unrelated work is not yet scheduled.", ID),
    "presentsAsOpen() fired on a bare citation whose openness words belong to another subject -- " +
    "it would flag every reference in the file"
  );

  // ---- FILE-LEVEL NEGATIVE CONTROL -------------------------------------------------------------
  // Every clause above must FAIL against the pinned pre-change tree. A clause that passes on both
  // trees is describing the repo in general, not pinning this ship.
  let before;
  try {
    const show = f => execFileSync("git", ["show", `${PRE_CHANGE_SHA}:${f}`], {
      cwd: ROOT, encoding: "utf8", maxBuffer: 32 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"],
    });
    before = { arch: show(ARCH), design: show(DESIGN) };
  } catch {
    notRun(
      "file-level negative control",
      `commit ${PRE_CHANGE_SHA} is not reachable in this checkout (a shallow clone), so the ` +
      "pre-change tree could not be read. Deepen the clone and re-run to exercise it."
    );
  }

  if (before) {
    const passedOnOldTree = CLAUSES.filter(c => c.test(before)).map(c => c.id);
    assert.deepStrictEqual(
      passedOnOldTree, [],
      `these clauses ALSO pass against the pinned pre-change tree, so they do not pin this ` +
      `ship: ${passedOnOldTree.join(", ")}`
    );

    // The behavioural half: the SAME pure function over the SAME paragraph must disagree across
    // the two trees. This is what proves a DIFFERENCE rather than a property both trees share.
    assert.ok(
      presentsAsOpen(paragraphMentioning(before.arch, ANCHOR), ID),
      `presentsAsOpen() did not fire on the PRE-CHANGE §19i paragraph -- if the defect cannot be ` +
      `reproduced against the tree that carried it, this guard is not measuring the fix`
    );
    assert.ok(
      !presentsAsOpen(paragraphMentioning(src.arch, ANCHOR), ID),
      `presentsAsOpen() still fires on the shipped §19i paragraph -- the fix did not land`
    );
  }
}

selfRun(import.meta.url, run);
