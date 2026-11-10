// DeepBench v7.0.988 | tests/regression/agt-634-stop-line-declares.test.mjs | AGT-634
//
// AN ID-LESS STOP LINE SENTENCE CLOSES THE SHIP SHORT ONLY WHEN IT DECLARES IT, NEVER WHEN IT
// DESCRIBES THE BEHAVIOUR THAT SHIPPED.
//
// WHAT THIS GUARDS, measured over the live kickoffs rather than recalled. Step 3 of
// `stopLineClosesPartial()` returned true for ANY id-less STOP LINE sentence carrying the word
// `partial`. 19 of the 1,207 kickoffs fire through step 3, and 6 of those 19 only DESCRIBE what the
// ship built -- AGT-595's own `v7.0.980` line reads "a refused `delivered` settles `partial` and
// files a ... card", which is a sentence about the code, not a declaration about the row. Each such
// close-out settled its OWN finished ship `partial`, and a wrongly-`partial` row stays in the pick
// path, so the runner can re-pick work that already shipped (AGT-595's live row: 1 approve verdict,
// 0 `kind='ship'` decisions, settled `partial` by close-out `e7bb5c53`). The Ticket Owner's check 12
// imports this same function and reads the same row as a stranded remainder.
//
// WHY THE ARMS ARE SHAPED THIS WAY, and it is the discriminator rather than coverage for its own
// sake. The obvious fix -- require the sentence to name its own ticket id -- would turn all 7 of
// arm B false and strand the 13 KEEP kickoffs that declare their remainder without an id, so arm B
// and KEEP assert the direction the id rule would have broken. Arm A and FLIP assert the direction
// the old step 3 got wrong. Arm C holds steps 1, 2 and 4 still: a conditional stays a branch, an
// id-blind caller reads step 3 only, another ticket's id is still someone else's sentence, and a
// DESCRIBING sentence that names its own id still fires through step 4 -- untouched by this ship and
// asserted as such, so a build that moved step 4 instead goes red here.
//
// OFFLINE, DISK ONLY. No credentials, no Supabase, no network: the fixtures are strings and the
// live arm reads `docs/kickoffs` off the tree. Nothing is written, so there is nothing to clean up
// (pattern:76), and no live-world value is graded (pattern:162) -- the named files are read as the
// reader's input, never as an assertion about the board.

import assert from "assert";
import fs from "fs";
import path from "path";
import { selfRun } from "./_lib/self-run.js";
import { stopLineClosesPartial, decideStatus } from "../../scripts/settle-ship.js";

const sect = (b) => `# k\n\n## 7. STOP LINE\n\n${b}\n`;

// Both halves of every arm: the reader, and the status a close-out would actually write through it.
function reads(body, id, want, label) {
  const text = sect(body);
  assert.strictEqual(
    stopLineClosesPartial(text, id), want,
    `${label}: stopLineClosesPartial(id=${JSON.stringify(id)}) should be ${want} for ${JSON.stringify(body)}`
  );
  const status = decideStatus({ kickoffText: text, ticketId: id }).status;
  const wantStatus = want ? "partial" : "delivered";
  assert.strictEqual(
    status, wantStatus,
    `${label}: decideStatus(id=${JSON.stringify(id)}).status should be ${wantStatus}, got ${status}, for ${JSON.stringify(body)}`
  );
}

// --- arm A: DESCRIBES the behaviour shipped -> false ------------------------------------------
const DESCRIBES = [
  "a refused `delivered` settles `partial` and files a card.",
  "a `partial` settle records no ship decision.",
  "only an open/partial parent lends.",
  "the status `partial` is what a refused settle writes.",
];

// --- arm B: DECLARES this ship's status -> true ------------------------------------------------
const DECLARES = [
  "The ticket stays `partial`.",
  "status stays `partial`.",
  "until then leave it `partial`.",
  "**Closes `partial`:** the tail is unbuilt.",
  "otherwise `partial` again.",
  "Status **partial** -- remainder arm (b).",
  "Close the ticket `partial`.",
];

// --- arm C: steps 1, 2 and 4 did not move ------------------------------------------------------
const CONTROLS = [
  // an id-blind caller reads step 3 and can never reach step 4 -- both directions
  { body: "Close the ticket `partial`.", id: null, want: true, why: "id-null declares" },
  { body: "a `partial` settle records no ship decision.", id: null, want: false, why: "id-null describes" },
  // another ticket's id: the sentence is about someone else, so the loop continues (step 4)
  { body: "`ZZ-2` was left `partial` last cycle.", id: "ZZ-1", want: false, why: "another ticket's id" },
  // its own id beside the word still fires (step 4), declaring...
  { body: "Do NOT write `ZZ-1` done: close `partial`.", id: "ZZ-1", want: true, why: "own id, declares" },
  // ...and describing: step 4 is untouched by AGT-634, named as a known gap in its STOP LINE
  { body: "a refused `ZZ-1` settles `partial`.", id: "ZZ-1", want: true, why: "own id, describes (step 4 untouched)" },
  // a conditional is a branch, not a declaration (step 1, before everything)
  { body: "if the migration fails, the ticket stays `partial`.", id: "ZZ-1", want: false, why: "conditional" },
];

// --- arm D: the live kickoffs this ship was measured over ---------------------------------------
// KEEP: declares its remainder with no id -- true before and after (the id rule would strand these).
const KEEP = [
  "v7.0.464-AGT-70", "v7.0.465-AGT-70", "v7.0.467-AGT-70", "v7.0.469-AGT-70",
  "v7.0.474-AGT-79", "v7.0.475-AGT-79", "v7.0.477-AGT-79", "v7.0.480-AGT-79",
  "v7.0.518-AGT-79", "v7.0.635-AGT-199", "v7.0.639-AGT-166", "v7.0.652-AGT-173",
  "v7.0.772-AGT-344",
];
// FLIP: only describes behaviour -- true before this ship, false after.
const FLIP = [
  "v7.0.663-AGT-167", "v7.0.836-AGT-445", "v7.0.857-AGT-483",
  "v7.0.882-AGT-506", "v7.0.924-AGT-506", "v7.0.980-AGT-595",
];

const KICKOFF_DIR = new URL("../../docs/kickoffs/", import.meta.url);

// The prefix is resolved to exactly one file by name -- never by a population count, because
// parallel cycles add kickoffs to this directory while this suite runs.
function resolveKickoff(prefix, names) {
  const hits = names.filter(n => n.startsWith(prefix + "-"));
  assert.strictEqual(
    hits.length, 1,
    `arm D: prefix ${prefix} should match exactly 1 file under docs/kickoffs, matched ${hits.length}: ${hits.join(", ")}`
  );
  const id = prefix.slice(prefix.indexOf("-") + 1);
  return { file: hits[0], rel: path.join("docs", "kickoffs", hits[0]), id };
}

export default async function run() {
  for (const body of DESCRIBES) reads(body, "ZZ-1", false, "arm A (describes)");
  for (const body of DECLARES) reads(body, "ZZ-1", true, "arm B (declares)");
  for (const c of CONTROLS) reads(c.body, c.id, c.want, `arm C (${c.why})`);

  const names = fs.readdirSync(KICKOFF_DIR);
  for (const prefix of KEEP) {
    const k = resolveKickoff(prefix, names);
    const text = fs.readFileSync(new URL(k.file, KICKOFF_DIR), "utf8");
    assert.strictEqual(
      stopLineClosesPartial(text, k.id), true,
      `arm D KEEP: ${k.rel} (${k.id}) declares its remainder with no id -- the reader must still read true`
    );
    assert.strictEqual(
      decideStatus({ kickoffText: text, ticketId: k.id }).status, "partial",
      `arm D KEEP: ${k.rel} (${k.id}) must still settle partial`
    );
  }
  for (const prefix of FLIP) {
    const k = resolveKickoff(prefix, names);
    const text = fs.readFileSync(new URL(k.file, KICKOFF_DIR), "utf8");
    assert.strictEqual(
      stopLineClosesPartial(text, k.id), false,
      `arm D FLIP: ${k.rel} (${k.id}) only DESCRIBES behaviour in its STOP LINE -- the reader must read false`
    );
    assert.strictEqual(
      decideStatus({ kickoffText: text, ticketId: k.id }).status, "delivered",
      `arm D FLIP: ${k.rel} (${k.id}) must settle delivered, not partial`
    );
  }

  console.log(
    `[AGT-634] step 3 declares, never describes: ${DESCRIBES.length} describing sentences false / ` +
    `${DECLARES.length} declaring sentences true / ${CONTROLS.length} controls over steps 1, 2 and 4 / ` +
    `live kickoffs ${KEEP.length} KEEP true + ${FLIP.length} FLIP false, each by name.`
  );
}

selfRun(import.meta.url, run);
