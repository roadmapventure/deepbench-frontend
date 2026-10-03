// DeepBench v7.0.620 | tests/regression/agt-172-staff-watch-record-promote.test.mjs | AGT-172 --
// `--record` CAN RECORD, AND `--promote` STOPS RE-ASKING. Two defects, one file, and this guard
// exists because BOTH of them were invisible from the outside: one printed a success-shaped exit
// and wrote nothing, the other printed a success-shaped exit and wrote a copy of yesterday's ask.
//
// WHAT WAS MEASURED, live this cycle, before a line moved:
//
// (a) `rest().get()` and `.post()` both ended in a bare `.json()` on the response after checking
//     `r.ok` alone, and `record()` hands ingestFindings() a poster pinned to
//     `Prefer: return=minimal`. PostgREST answers that header 201 WITH A ZERO-BYTE BODY, so the
//     parse threw `Unexpected end of JSON input` inside the before-image write and
//     audit-ledger.js:454 rethrew it as `-- no before-image, so the append does not happen (§19v)`.
//     THE POST HAD SUCCEEDED. Live cost: 0 `audit_findings` rows `found_by like 'staff-watch:%'`
//     since v7.0.596, against six orphan `runner_before_images` rows -- one per attempted raise.
//
// (b) `--promote --apply` named `?on_conflict=target_id,asked_at,question` while minting `asked_at`
//     fresh every run, so the conflict target could never match an earlier row: 39 `skill-edit`
//     `runner_card_asks` rows over THREE fingerprints, all `answer IS NULL`, +3 per cycle.
//
// WHERE THE LAZY VERSION OF EACH ARM PASSES VACUOUSLY -- which is the only reason these three arms
// are shaped the way they are.
//
// (1) THE EMPTY BODY IS ASSERTED IN BOTH DIRECTIONS, AND THE TWO DIRECTIONS ARE THE WHOLE BUG. An
//     arm that only checked `restBody("", {required:false}) -> {value:null}` would pass against a
//     function that returns `{value:null}` for EVERY empty body -- which would silently turn a read
//     that came back with nothing into "no rows", i.e. trade the crash for a false zero. So the
//     `required:true` case must produce an ERROR, and that error must NAME THE QUERY: the defect's
//     whole signature was a message that described the wrong operation, so a nameless error is the
//     same failure with a different string. The unparseable case must carry the BYTE COUNT, because
//     an HTML error page, a proxy notice and a truncated array all say `Unexpected token`.
//     A NEGATIVE CONTROL runs against `origin/dev`: there is no `restBody` export there at all.
//
// (2) THE SET IS DRIVEN THREE WAYS, and the empty-Set case is the one that matters. A dedupe that
//     returned `"standing"` for everything would suppress every ask forever and pass an
//     all-standing assertion; a dedupe that returned `"new"` for everything is the shipped bug.
//     Only asserting all three -- 3 standing, 1 standing / 2 new, 0 standing -- separates the three
//     possible constant functions from the real one. Order is asserted too, because `promote()`
//     zips the result against `promotions` rather than looking each one up.
//
// (3) THE SOURCE GREP IS THE ARM THAT CANNOT BE SATISFIED BY A HAPPY PATH. `restBody()` existing
//     and being correct proves nothing about whether the two call sites USE it; a surviving bare
//     `.json()` on a response somewhere else in the file is the same defect with a smaller blast
//     radius. Counting occurrences in the shipped source is the only assertion that grades that.
//
// THIS FILE WRITES NOTHING AND NEEDS NO CREDENTIALS. Every arm is pure or reads the repo, so it
// runs identically in an unattended cycle with no `.env.local` -- there is no NOT RUN branch to
// declare. The live arms (4 through 7) are deliberately NOT here: arm 4 probes PostgREST, arms 5
// and 6 assert a one-time cleanup's own numbers, and arm 7 would have to append a permanent row to
// an append-only ledger (`audit_findings_guard`, AGT-70). They are run and reported by the cycle;
// pinning a live count here would grade the day rather than the change (pattern:162).

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selfRun } from "./_lib/self-run.js";
import { restBody, asksToFile } from "../../scripts/staff-watch.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SOURCE = path.join(ROOT, "scripts", "staff-watch.js");

// The exact query the read that broke used, kept verbatim so the "the error names what it was
// doing" assertion is about a real query rather than a placeholder.
const REAL_QUERY = "GET runner_staff_findings?cycle_id=eq.x";

// ---------------------------------------------------------------------------
// (1) restBody(): the empty body is a success or a failure depending on the ask
// ---------------------------------------------------------------------------
function anEmptyBodyIsASuccessOnlyWhenNoBodyWasAskedFor() {
  // The 201-with-0-bytes that `Prefer: return=minimal` really answers. This is the case that spent
  // 24 cycles being reported as a missing before-image.
  const minimal = restBody("", { status: 201, required: false });
  assert.deepEqual(minimal, { value: null },
    "a 201 with a zero-byte body is a SUCCESS where the caller never asked for a representation -- "
    + "that is what `Prefer: return=minimal` answers, and treating it as a parse failure is the whole "
    + `of AGT-172(a). got ${JSON.stringify(minimal)}`);
  assert.ok(!("error" in minimal),
    `the return=minimal success must carry no \`error\` key at all: ${JSON.stringify(minimal)}`);

  // Whitespace is the same case: a body of "\n" is still no body.
  assert.deepEqual(restBody("\n  \t ", { status: 204, required: false }), { value: null },
    "a whitespace-only body is an empty body, not a parse failure");

  // THE OTHER DIRECTION, and without it the fix is a false-zero machine. A read that came back
  // empty must NOT be handed back as `null` for the caller to count rows on.
  const needed = restBody("", { status: 200, required: true, what: REAL_QUERY });
  assert.ok(needed.error && !("value" in needed),
    "an empty body where a representation WAS asked for must be an ERROR, never `{value:null}` -- a "
    + "read silently reported as nothing is a full ledger classified as empty work, which is the same "
    + `defect pointing the other way. got ${JSON.stringify(needed)}`);
  assert.ok(needed.error.includes(REAL_QUERY),
    "the error must NAME the operation it belongs to. AGT-172(a)'s entire signature was an error "
    + "message that accused the wrong operation, so an error that does not say which query produced "
    + `it repeats the defect with different words. got: ${needed.error}`);
  assert.ok(/\b200\b/.test(needed.error),
    `the error must carry the HTTP status it came back with: ${needed.error}`);

  // A real body parses, and `required` does not change that.
  assert.deepEqual(restBody("[]", { status: 200, required: true, what: REAL_QUERY }), { value: [] },
    "an empty ARRAY is a body -- `[]` is what `return=representation` answers for a no-op upsert, and "
    + "it must parse to `[]` rather than being confused with the no-body case");
  assert.deepEqual(restBody('[{"id":1}]', { status: 201, required: true, what: "POST runner_card_asks" }),
    { value: [{ id: 1 }] }, "a representation parses to its rows");
  // And `required:false` never suppresses a body that IS there.
  assert.deepEqual(restBody('{"a":1}', { status: 200, required: false, what: "POST t" }), { value: { a: 1 } },
    "`required:false` says an ABSENT body is acceptable -- it must not discard a body that arrived");

  // AN UNPARSEABLE BODY REPORTS ENOUGH OF ITSELF TO BE DIAGNOSED. 17 bytes of HTML is a different
  // incident from 400KB of it, and "not JSON" alone sends the reader back to guessing.
  const html = "<html>Bad Gateway</html>";
  const bad = restBody(html, { status: 502, required: true, what: REAL_QUERY });
  assert.ok(bad.error && !("value" in bad), `a non-JSON body must be an error: ${JSON.stringify(bad)}`);
  assert.ok(bad.error.includes(String(Buffer.byteLength(html, "utf8"))),
    `the error must carry the body's BYTE COUNT (${Buffer.byteLength(html, "utf8")}) -- a size is how a `
    + `truncated array is told from an error page. got: ${bad.error}`);
  assert.ok(bad.error.includes(html) && bad.error.includes(REAL_QUERY) && /\b502\b/.test(bad.error),
    `the error must carry the body's opening characters, the query and the status: ${bad.error}`);

  // Truncated at 120, so a megabyte of HTML cannot become the log.
  const huge = "x".repeat(5000);
  const hugeErr = restBody(huge, { status: 500, required: true, what: REAL_QUERY }).error;
  assert.ok(hugeErr.includes("x".repeat(120)) && !hugeErr.includes("x".repeat(121)),
    `exactly the first 120 characters, no more: an unbounded echo makes the error the incident. `
    + `got ${hugeErr.length} chars`);

  // NEVER THROWS, for anything. A throw here recreates the exception-from-someone-else's-guard that
  // made (a) so hard to read.
  for (const [text, opts] of [
    [undefined, undefined], [null, {}], ["{", { status: 200, required: true, what: "x" }],
    [0, { status: 200, required: false }], [{}, { status: 200, required: true, what: "x" }],
  ]) {
    const out = restBody(text, opts);
    assert.ok(out && (("value" in out) || ("error" in out)),
      `restBody(${JSON.stringify(text)}, ${JSON.stringify(opts)}) must RETURN a {value} or {error} and `
      + `never throw -- the caller's own fail() is what knows the context. got ${JSON.stringify(out)}`);
  }
  return `${Buffer.byteLength(html, "utf8")}-byte non-JSON body reported with its size`;
}

// ---------------------------------------------------------------------------
// (2) asksToFile(): three drives of the Set, because three constant functions would pass one
// ---------------------------------------------------------------------------
function theSetDecidesAndOrderIsKept() {
  // The three fingerprints live at the bar right now; the shape is what matters, not the values.
  const promotions = [
    { fingerprint: "2fb97122c84a986b", agent_id: "designer", cycles: 8 },
    { fingerprint: "e7393ed419f16617", agent_id: "designer", cycles: 6 },
    { fingerprint: "a05f97ba602f2e21", agent_id: "designer", cycles: 5 },
  ];
  const fps = promotions.map(p => p.fingerprint);
  const actions = set => asksToFile(promotions, set).map(r => r.action);

  // All three already standing: the state AFTER the dedupe migration, and the state every later
  // cycle must reproduce. A shipped-bug implementation returns three `new` here.
  assert.deepEqual(actions(new Set(fps)), ["standing", "standing", "standing"],
    "every fingerprint holding an unanswered ask must be `standing` -- this is the post-cleanup live "
    + "state, and a `new` here is the +3-rows-per-cycle defect AGT-172(b) fixed");

  // One standing: the case that separates a real guard from a constant. A function that returned
  // "standing" for everything (suppressing every future ask forever) passes the case above.
  assert.deepEqual(actions(new Set([fps[1]])), ["new", "standing", "new"],
    "only the fingerprint IN the set is standing -- and the two that are not must be `new`, in their "
    + "own positions. An all-standing constant would pass the all-in-set case and mute the board.");

  // None standing: a genuinely first-time promotion still files. A dedupe that never files is not a
  // dedupe, it is a mute, and the ask is the only way a Skill edit ever reaches John.
  assert.deepEqual(actions(new Set()), ["new", "new", "new"],
    "with no unanswered ask on the board every promotion files -- suppressing these would make the "
    + "promotion bar unreachable, which is worse than the duplicates it replaced");

  // ORDER AND SHAPE. promote() zips this against `promotions` positionally.
  const out = asksToFile(promotions, new Set([fps[2]]));
  assert.deepEqual(out.map(r => r.fingerprint), fps,
    "the promotions' own order is kept, one entry each -- promote() reads the two lists in step");
  for (const r of out) {
    assert.deepEqual(Object.keys(r).sort(), ["action", "fingerprint"],
      `each entry is exactly {fingerprint, action}: ${JSON.stringify(r)}`);
    assert.ok(r.action === "new" || r.action === "standing",
      `action is one of the two shipped words, got ${JSON.stringify(r.action)}`);
  }

  // A plain array is accepted where a Set is, and the empty inputs do not throw.
  assert.deepEqual(asksToFile(promotions, fps).map(r => r.action), ["standing", "standing", "standing"],
    "an array of ids works as well as a Set -- the caller should not have to remember which");
  assert.deepEqual(asksToFile([], new Set(fps)), [], "no promotions, no asks");
  assert.deepEqual(asksToFile(undefined, undefined), [],
    "a missing promotions list is an empty result, not a throw -- promote() calls this before it has "
    + "proven the read returned anything");
  return "3/1/0 standing over the same three promotions";
}

// ---------------------------------------------------------------------------
// (3) the source: no bare .json() on a response survives, and both callers route through restBody
// ---------------------------------------------------------------------------
function noBareResponseJsonSurvivesInTheShippedSource() {
  const src = fs.readFileSync(SOURCE, "utf8");

  // QA arm 3 verbatim: `grep -c "r\.json()" scripts/staff-watch.js` -> 0.
  const bare = (src.match(/r\.json\(\)/g) ?? []).length;
  assert.strictEqual(bare, 0,
    `scripts/staff-watch.js must contain ZERO occurrences of a bare \`r.json()\`, found ${bare}. `
    + "`restBody()` being correct proves nothing about whether the call sites use it, and one "
    + "surviving bare parse is AGT-172(a) with a smaller blast radius.");

  // And the positive half, so this arm cannot be satisfied by deleting the transport. Both verbs
  // must reach the shared reader, and the POST's `required` must be DERIVED from the Prefer header
  // rather than hardcoded -- a hardcoded `required:false` on the POST would swallow a genuinely
  // empty representation, and a hardcoded `true` re-breaks the return=minimal path.
  assert.ok(/export function restBody\(/.test(src), "restBody() must be exported from the shipped source");
  assert.ok((src.match(/restBody\(/g) ?? []).length >= 3,
    "restBody() must be called by BOTH the GET and the POST path as well as being defined -- at least "
    + "three occurrences of the name in the source");
  assert.ok(/required:\s*\/return=representation\/\.test\(prefer/.test(src),
    "the POST's `required` must be read off the `Prefer` header the caller actually sent, not "
    + "hardcoded per call site: `return=minimal` legitimately answers 0 bytes and "
    + "`return=representation` legitimately must not");
  assert.ok(/what: `GET \$\{q\}`/.test(src) && /what: `POST \$\{table\}`/.test(src),
    "each call site must name its own operation, so the error cannot accuse the wrong one");

  // The standing-ask read is the shipped dedupe, and it must be the fingerprint + answer key. A
  // `question=` in that query is the text key §2(b) proved re-files whenever the cycle count moves.
  assert.ok(/runner_card_asks\?target_kind=eq\.skill-edit&answer=is\.null&select=id,target_id,asked_at/.test(src),
    "promote() must read the unanswered skill-edit asks before the loop -- that ONE read is the whole "
    + "dedupe, and `answer=is.null` is what makes it a dedupe rather than a mute");
  assert.ok(!/asked_at=|&question=eq\./.test(src),
    "the dedupe must not key on `asked_at` or on `question`: `asked_at` is minted fresh per run (the "
    + "original defect) and the distinct-cycle count sits inside the question text, so one defect's "
    + "asks are not byte-identical to each other");
  return `0 bare response parses, ${(src.match(/restBody\(/g) ?? []).length} restBody sites`;
}

export default async function run() {
  const one = anEmptyBodyIsASuccessOnlyWhenNoBodyWasAskedFor();   // (1)
  const two = theSetDecidesAndOrderIsKept();                      // (2)
  const three = noBareResponseJsonSurvivesInTheShippedSource();   // (3)

  console.log(`  [AGT-172] (1) return=minimal's 0-byte 201 is {value:null} and a required empty body `
    + `is an error naming its query, ${one}; (2) ${two}; (3) ${three}`);
}

selfRun(import.meta.url, run);
