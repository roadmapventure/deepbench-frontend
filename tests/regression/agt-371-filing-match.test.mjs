// DeepBench v7.0.1114 | tests/regression/agt-371-filing-match.test.mjs | AGT-371 -- the filing door reads the whole board.
// Offline by construction: no network, no credentials, no live board state (pattern:162).
//   a  the ranker lists the row that asks the same thing first, never a row sharing no word.
//   b  --prepare's context carries board_candidates from ANY source, and none when handed no board.
//   c  a group that files a ticket is refused until it rules on each finding's first candidate.
//   d  the tripwire's owner is any row carrying the signature line, whatever filed it.
import assert from "assert/strict";
import { selfRun } from "./_lib/self-run.js";
import { BOARD_CANDIDATES, buildIndex, candidatesFor, findingText } from "../../scripts/lib/board-match.mjs";
import { buildTaskContext, validateReview, namesTicket, unruledCandidatesRefusal, BOARD_CANDIDATES_NOTE } from "../../scripts/audit-review.js";
import { ownerQuery, detect, signatureOf } from "../../scripts/tripwire-to-backlog.js";

const BOARD = [
  { backlog_id: "SES-900", title: "docs/SESSIONS.md crossed its rotation threshold", status: "open", source_file: "session-x", description: "check 8 fires; rotate entries older than the previous month into a dated archive." },
  { backlog_id: "AGT-901", title: "The class loop can run twice in one Chicago day", status: "open", source_file: "audit-review", description: "the once-a-day gate reads the cycle's start date." },
  { backlog_id: "AA-902", title: "Deliverables marketplace UI", status: "partial", source_file: "docs/FEATURES-LATER.md", description: "discovery, preview, purchase flow." },
  { backlog_id: "SES-903", title: "docs/SESSIONS.md rotation threshold crossed again, rotate the archive", status: "removed", source_file: "session-y", description: "rotation." },
];
const FINDING = { id: "f1", fingerprint: "fp1", iso_week: "2026-W48", found_by: "auditor:routine:x", family: "service",
  governing_fact: "docs/SESSIONS.md is over its rotation threshold and needs one rotation into a dated archive",
  locations: [{ location: "docs/SESSIONS.md", text: "rotate entries older than the previous month" }], proposed_resolution: "rotate it" };
const RC = { kind: "root-cause", title: "t", root_cause: "rc", fix: "f", test: { reproduced: true, how: "h", result: "r" }, finding_ids: ["f1"] };
const review = groups => ({ groups, summary_for_john: "qa", patterns_applied: [] });

async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`${name}: ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };

  await arm("a ranker", async () => {
    assert.equal(BOARD_CANDIDATES, 3);
    const c = candidatesFor(findingText(FINDING), buildIndex(BOARD.slice(0, 3)));
    assert.equal(c[0].backlog_id, "SES-900", `the same ask ranks first; got ${JSON.stringify(c)}`);
    assert.ok(!c.some(x => x.backlog_id === "AA-902"), "a row sharing no weighted word is never a candidate");
    assert.deepEqual(candidatesFor("zzz qqq", buildIndex(BOARD)), [], "no shared word, no candidate");
  });

  await arm("b context", async () => {
    const base = { week: "2026-W48", findings: [FINDING], allRows: [], tickets: [], scope: "weekly" };
    const withBoard = buildTaskContext({ ...base, board: BOARD });
    const w = withBoard.worklist[0];
    assert.deepEqual(Object.keys(w.board_candidates[0]), ["backlog_id", "title", "status"]);
    assert.equal(w.board_candidates[0].backlog_id, "SES-900", "a row no review filed is still found");
    assert.ok(!w.board_candidates.some(x => x.backlog_id === "SES-903"), "a removed row is not a candidate");
    assert.ok(w.board_candidates.length <= BOARD_CANDIDATES);
    assert.equal(withBoard.board_candidates_note, BOARD_CANDIDATES_NOTE);
    const without = buildTaskContext(base);
    assert.ok(!("board_candidates" in without.worklist[0]) && !("board_candidates_note" in without),
      "a caller that hands no board gets the context it always got");
  });

  await arm("c refusal", async () => {
    const wl = buildTaskContext({ week: "2026-W48", findings: [FINDING], allRows: [], tickets: [], scope: "weekly", board: BOARD }).worklist;
    const want = unruledCandidatesRefusal("root-cause", ["SES-900"]);
    assert.deepEqual(validateReview(review([RC]), wl).refusals, [want], "a filing group that names no candidate is refused");
    assert.deepEqual(validateReview(review([{ ...RC, prior_art: "SES-9001 is unrelated" }]), wl).refusals, [want], "a longer id is not the candidate");
    assert.deepEqual(validateReview(review([{ ...RC, prior_art: "SES-900 asks for the rotation; this asks for a schedule." }]), wl).refusals, []);
    assert.deepEqual(validateReview(review([{ kind: "root-cause", reuse_backlog_id: "SES-900", finding_ids: ["f1"] }]), wl).refusals, []);
    assert.deepEqual(validateReview(review([{ kind: "carry", reason: "later", finding_ids: ["f1"] }]), wl).refusals, [], "a group that files nothing is never asked");
    const bare = wl.map(({ board_candidates, ...rest }) => rest);
    assert.deepEqual(validateReview(review([RC]), bare).refusals, [], "a worklist with no candidates validates as before");
    assert.equal(namesTicket("see AGT-371.", "AGT-37"), false);
    assert.equal(namesTicket("see AGT-37, and AGT-371", "AGT-37"), true);
  });

  await arm("d tripwire owner", async () => {
    const q = ownerQuery("https://x.invalid");
    assert.ok(!q.includes("source_file"), `the owner read is not scoped to this script's own rows; got ${q}`);
    assert.ok(q.includes("description=like.*Tripwire%20signature%3A*"), q);
    const sig = signatureOf("8").hash;
    assert.equal(sig, "c8ef18391ff4");
    const findings = [{ check: "8", severity: "FLAG", detail: "docs/SESSIONS.md is over the threshold" }];
    const owned = detect(findings, ["a ticket some session filed.\n\nCarried from SES-262 (superseded, AGT-371): Tripwire signature: `c8ef18391ff4` -- this row owns session-hygiene check 8 for the SES-205 tripwire."], { gatingChecks: new Set() });
    assert.equal(owned.detections.length, 0, "an owner that carries the line keeps the class filed");
    assert.equal(detect(findings, ["no line here"], { gatingChecks: new Set() }).detections.length, 1, "control: without the line it would file");
  });

  if (failures.length) throw new Error(failures.join(" | "));
}

selfRun(import.meta.url, run);
export default run;
