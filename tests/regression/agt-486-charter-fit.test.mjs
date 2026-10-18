// DeepBench v7.0.861 | tests/regression/agt-486-charter-fit.test.mjs | AGT-486 -- THE GUARD ON
// "CHARTERS REACH VICTORIA, AND A NO-FIT TICKET IS READ ONCE".
//
// WHAT IT GUARDS, and why each arm is shaped the way it is.
//
//   A  LIVE. `public.victoria_charter_state()` returns ONE row, and all three of its columns are
//      graded against a separate read of the same facts rather than against a constant: `charters`
//      is compared slug for slug AND charter for charter with
//      `projects?status=eq.executing&select=slug,priority,charter` sorted in the function's own
//      `priority nulls last, slug` order; `fingerprint` is RE-DERIVED IN JS from that independent
//      read and must equal the md5 the function computed; `stamped` must be exactly the
//      `backlog_id`s whose unreversed `fit-stamp` summary is `fitStampSummary(id, fingerprint)`,
//      computed here from a raw read of `runner_decisions` rather than taken on the function's word.
//
//   B  OFFLINE, over arm A's own array. THE DISCRIMINATOR: one extra character in any charter must
//      move the md5. NO MD5 IS EVER PINNED in this file -- the live charters are John's text and
//      they will change, so a pinned hash would make this guard red on an edit that broke nothing
//      and, worse, would let the fingerprint pass by agreeing with a constant instead of with the
//      charters. Arm B proves the SENSITIVITY, which is the property the stamp's whole life rests
//      on: a charter edit must clear every stamp (requirement d.5), and it clears them only because
//      the md5 moves.
//
//   C  OFFLINE, zero network. `validateListVerdict()`'s three new rules: a `no-fit` that still
//      carries a `need_score` (or a `need_source`) is REFUSED -- a ticket she could not place is a
//      ticket she did not grade; a `no-fit` with both null and a reason is ACCEPTED; and a context
//      carrying NO active charter is refused outright, because a fit judged against nothing is not
//      a judgment. Each refusal is asserted to NAME its ticket (or the list), so a validator that
//      refused everything with a bare message would still fail here.
//
//   D  LIVE. The row the migration edited as DATA (pattern:2): `vc-reorganize-intent`'s
//      `traits.schema` verdict enum is the three values, and its `method` carries
//      `FIT BEFORE GRADE` EXACTLY ONCE and before its step 1. Once, not "contains": a second apply
//      of the patch would read as a pass on a `.includes()` check.
//
// WHY A, B AND D DECLARE notRun WITHOUT CREDENTIALS. The function, the fingerprint it computes and
// the row the migration edited all live in Supabase; there is no offline half of any of them. Arm C
// is the pure half and always runs. A test that silently skipped the live arms would print a green
// over the three things this ticket actually shipped (SES-180 (b)).
//
// WHY THE JS SERIALIZER EXISTS AT ALL (`pgJsonbText`). Arm A's whole point is that the fingerprint
// is derivable from the charters by someone who did not compute it -- so the md5 has to be taken
// over Postgres's own `jsonb::text` rendering, reproduced here: object keys ordered by length then
// bytewise (jsonb's own order, which puts `slug` before `charter`), `": "` after a key and `", "`
// between members. If the function ever started hashing something else -- the rows, a concatenation,
// a different order -- this arm goes red, which an "is it 32 hex characters" check could not see.

import assert from "node:assert/strict";
import crypto from "node:crypto";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  LIST_VERDICTS, FIT_STAMP_KIND, LIST_REASON_CHARS,
  fitStampSummary, buildListContext, validateListVerdict,
} from "../../scripts/requirement-check.js";

const BASE = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
const KEY = process.env.SUPABASE_SERVICE_KEY ?? "";
const CREDS = Boolean(BASE && KEY);

async function req(q, init = {}) {
  const res = await fetch(`${BASE}/rest/v1/${q}`, {
    ...init,
    headers: {
      apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text().catch(() => "");
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not json */ }
  return { ok: res.ok, status: res.status, text, json };
}
const describe = r => `HTTP ${r.status} ${String(r.text).slice(0, 300)}`;

// Postgres's own `jsonb::text`, reproduced. Exported so a later guard re-uses this one copy rather
// than writing a second that can disagree with it (pattern:14).
export function pgJsonbText(v) {
  if (v === null || v === undefined) return "null";
  if (typeof v === "boolean" || typeof v === "number") return String(v);
  if (typeof v === "string") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(pgJsonbText).join(", ")}]`;
  const keys = Object.keys(v).sort((a, b) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0));
  return `{${keys.map(k => `${JSON.stringify(k)}: ${pgJsonbText(v[k])}`).join(", ")}}`;
}
export const md5 = s => crypto.createHash("md5").update(s, "utf8").digest("hex");

// The function's own order: `priority nulls last, slug`.
const byPriorityThenSlug = (a, b) => {
  const ap = a.priority === null || a.priority === undefined ? Infinity : Number(a.priority);
  const bp = b.priority === null || b.priority === undefined ? Infinity : Number(b.priority);
  return ap - bp || String(a.slug).localeCompare(String(b.slug), "en");
};

async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`[arm ${name}] FAIL -- ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };

  // Arm A hands its measured array to arm B. Null means arm A did not get that far, and arm B says
  // so rather than quietly passing over a fixture of its own.
  let liveCharters = null;
  let liveFingerprint = null;

  if (!CREDS) {
    notRun("AGT-486 arm A — victoria_charter_state() against the live board",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY are absent. The function, its fingerprint and its " +
      "stamped array have no offline half: arm C grades the validator and nothing else. Run with " +
      "node --env-file-if-exists=.env.local tests/regression/run-all.js, or with the two secrets " +
      "exported inline from public.runner_secrets.");
    notRun("AGT-486 arm B — the fingerprint's sensitivity over the LIVE charters",
      "it is computed over arm A's own measured array, deliberately rather than over a fixture: a " +
      "fixture would prove md5 is a hash, not that THIS function hashes THESE charters. Without " +
      "credentials arm A never measured them.");
    notRun("AGT-486 arm D — the vc-reorganize-intent row the migration edited",
      "the three-value verdict enum and the FIT BEFORE GRADE step live in skill_profiles, read " +
      "over PostgREST; there is nothing in the repo to grade them against.");
  } else {
    // ---- A. THE FUNCTION, every column against an independent read -----------------------------
    await arm("A victoria_charter_state(): one row, the charters, the fingerprint, the stamps", async () => {
      const rpc = await req("rpc/victoria_charter_state", { method: "POST", body: "{}" });
      assert.ok(rpc.ok, `the rpc must answer; got ${describe(rpc)}`);
      const rows = Array.isArray(rpc.json) ? rpc.json : [rpc.json];
      assert.equal(rows.length, 1, `victoria_charter_state() returns exactly ONE row; got ${rows.length}`);
      const state = rows[0];
      assert.ok(Array.isArray(state.charters), "charters is a jsonb ARRAY, never null");
      assert.ok(Array.isArray(state.stamped), "stamped is a text[] , never null");
      assert.match(String(state.fingerprint), /^[0-9a-f]{32}$/,
        `fingerprint is a 32-hex md5; got ${JSON.stringify(state.fingerprint)}`);

      // (1) THE CHARTERS, slug for slug and charter for charter, against a separate read.
      const live = await req("projects?status=eq.executing&select=slug,priority,charter");
      assert.ok(live.ok, `the projects read must answer; got ${describe(live)}`);
      const want = [...(live.json ?? [])].sort(byPriorityThenSlug)
        .map(p => ({ slug: p.slug, charter: p.charter }));
      assert.equal(state.charters.length, want.length,
        `the function names ${state.charters.length} charter(s) and the board has ${want.length} executing project(s)`);
      assert.deepEqual(state.charters.map(c => c.slug), want.map(c => c.slug),
        "the slugs, in the function's own priority-nulls-last-then-slug order");
      state.charters.forEach((c, i) => {
        assert.equal(c.charter, want[i].charter,
          `${want[i].slug}'s charter travels WHOLE -- no head, no cut (char ${i})`);
        assert.deepEqual(Object.keys(c).sort(), ["charter", "slug"],
          `${want[i].slug} carries exactly slug and charter, nothing else`);
      });

      // (2) THE FINGERPRINT, re-derived here from the independent read. Never pinned.
      const derived = md5(pgJsonbText(want));
      assert.equal(state.fingerprint, derived,
        "the fingerprint must be the md5 of the charters' own jsonb text, re-derived from a " +
        "separate read of projects -- not of the rows, not of a concatenation, not of another order");

      // (3) THE STAMPS, computed here from a raw read rather than taken on the function's word. The
      //     predicate is an EXACT equality on the whole summary, so a stamp taken under any other
      //     fingerprint must NOT appear -- which is the only thing that clears a stamp.
      const decs = await req(`runner_decisions?kind=eq.${FIT_STAMP_KIND}&reversed_at=is.null&select=backlog_id,summary&limit=5000`);
      assert.ok(decs.ok, `the fit-stamp read must answer; got ${describe(decs)}`);
      const all = decs.json ?? [];
      const expected = [...new Set(all
        .filter(d => d.backlog_id && d.summary === fitStampSummary(String(d.backlog_id), state.fingerprint))
        .map(d => String(d.backlog_id)))].sort();
      assert.deepEqual([...state.stamped].sort(), expected,
        "stamped is exactly the unreversed fit-stamps whose summary is fitStampSummary(id, this " +
        "fingerprint) -- no LIKE, no stamp from a charter set that has moved");
      const stale = all.filter(d => d.backlog_id &&
        d.summary !== fitStampSummary(String(d.backlog_id), state.fingerprint));
      for (const d of stale) {
        assert.ok(!state.stamped.includes(String(d.backlog_id)),
          `${d.backlog_id} holds a fit-stamp from ANOTHER fingerprint and must not be in stamped`);
      }

      liveCharters = want;
      liveFingerprint = state.fingerprint;
      console.log(`    [AGT-486 arm A] ${want.length} charter(s) ${JSON.stringify(want.map(c => c.slug))}, ` +
        `fingerprint ${state.fingerprint} re-derived in JS, ${state.stamped.length} stamped, ` +
        `${all.length} live ${FIT_STAMP_KIND} row(s) of which ${stale.length} under another fingerprint`);
    });

    // ---- B. THE DISCRIMINATOR, offline over arm A's measured array ------------------------------
    await arm("B one extra character in any charter moves the fingerprint", async () => {
      assert.ok(Array.isArray(liveCharters) && liveCharters.length > 0,
        "arm A must have measured the live charters for this arm to grade their sensitivity");
      const base = md5(pgJsonbText(liveCharters));
      assert.equal(base, liveFingerprint, "arm B starts from arm A's own fingerprint");

      // EVERY charter, one at a time: the md5 must move for each of them, so no charter is outside
      // the fingerprint's reach. One extra character is the smallest edit there is.
      for (let i = 0; i < liveCharters.length; i++) {
        const bent = liveCharters.map((c, j) => (j === i ? { ...c, charter: `${c.charter}x` } : c));
        assert.notEqual(md5(pgJsonbText(bent)), base,
          `one extra character in ${liveCharters[i].slug}'s charter must move the fingerprint`);
      }
      // And the slug is inside it too -- a renamed project is a different charter set.
      const renamed = liveCharters.map((c, j) => (j === 0 ? { ...c, slug: `${c.slug}-x` } : c));
      assert.notEqual(md5(pgJsonbText(renamed)), base, "a changed slug moves the fingerprint");
      // ORDER is inside it as well, which is why the function pins priority-then-slug: two runs over
      // the same board must produce the same md5 (pattern:3, pattern:127).
      if (liveCharters.length > 1) {
        const swapped = [liveCharters[1], liveCharters[0], ...liveCharters.slice(2)];
        assert.notEqual(md5(pgJsonbText(swapped)), base,
          "the ORDER is inside the fingerprint, so the function's ORDER BY is load-bearing");
      }
      // The control: the untouched array still hashes to the same value, so the arm above is
      // detecting the edit and not an unstable serializer.
      assert.equal(md5(pgJsonbText(liveCharters.map(c => ({ ...c })))), base,
        "and an untouched copy hashes identically -- the serializer is deterministic");
      console.log(`    [AGT-486 arm B] ${liveCharters.length} charter(s) each move the md5 off ${base}; none pinned`);
    });
  }

  // ---- C. THE VALIDATOR'S THREE NEW RULES, zero network ----------------------------------------
  await arm("C validateListVerdict: a no-fit is never graded, and a fit needs a charter", async () => {
    assert.deepEqual([...LIST_VERDICTS], ["pass", "not-needed", "no-fit"],
      "the LIST vocabulary is three values -- and it is NOT the writer's VERDICTS, which stay two");

    const A = "ZAGT486-1a";
    const B = "ZAGT486-1b";
    const SRC = "nathan:market_records:00000000-0000-0000-0000-000000000000";
    const CHARTERS = [
      { slug: "zagt486-alpha", charter: "The first charter, so a fit is answerable." },
      { slug: "zagt486-beta", charter: "The second charter." },
    ];
    const ctxOf = charters => buildListContext({
      project: "backlog-intake", epics: ["e1"],
      tickets: [{ backlog_id: A, title: "A", description: "d", status: "open" },
        { backlog_id: B, title: "B", description: "d", status: "partial" }],
      candidates: [{ key: SRC, head: "the record's first words" }],
      kinds: ["nathan:market_records"], charters, fingerprint: "0".repeat(32),
    });
    const ctx = ctxOf(CHARTERS);
    assert.equal(ctx.active_charters.length, 2, "the context carries the charters WHOLE");
    assert.equal(ctx.active_charters[0].charter, CHARTERS[0].charter, "and uncut");
    assert.equal(ctx.charter_fingerprint, "0".repeat(32), "and the fingerprint it was handed");

    const answer = rs => ({ list: "backlog-intake", account: "Ruled one list of two proposals", rows: rs });
    const pass = { backlog_id: A, verdict: "pass", need_source: SRC, need_score: 4, reason: "the record asks for it" };
    const noFit = {
      backlog_id: B, verdict: "no-fit", need_source: null, need_score: null,
      reason: "zagt486-alpha came closest and still misses: it is about the first charter's scope, not this.",
    };

    // ACCEPTED: a no-fit with both null and a reason, beside an ordinary pass.
    const ok = validateListVerdict(answer([pass, noFit]), ctx);
    assert.deepEqual(ok.refusals, [], "a no-fit with need_source and need_score null and a reason is ACCEPTED");
    assert.equal(ok.ok, true);

    const must = (bad, who, why, context = ctx) => {
      const v = validateListVerdict(bad, context);
      assert.equal(v.ok, false, `${why}: must be refused`);
      assert.ok(v.refusals.length > 0, `${why}: a refusal must say something`);
      assert.ok(v.refusals.some(r => r.startsWith(`${who}:`)),
        `${why}: a refusal must name ${who}; got ${JSON.stringify(v.refusals)}`);
      return v.refusals.join(" | ");
    };

    // REFUSED: a no-fit that still carries a score. THIS IS THE TOOTH -- dropping the rule makes a
    // graded no-fit pass, which is how a ticket gets scored against a project it was just said to
    // fit none of. Asserted at 0 as well, because 0 is a real score here (AGT-433, PARKED).
    for (const score of [4, 0, 1, 5]) {
      assert.match(must(answer([pass, { ...noFit, need_score: score }]), B, `a no-fit scored ${score}`),
        /a no-fit carries need_score/);
    }
    assert.match(must(answer([pass, { ...noFit, need_source: SRC }]), B, "a no-fit naming a source"),
      /a no-fit carries need_source/);
    // Both at once collects BOTH refusals, rather than stopping at the first.
    const both = validateListVerdict(answer([pass, { ...noFit, need_source: SRC, need_score: 3 }]), ctx);
    assert.equal(both.ok, false);
    assert.equal(both.refusals.filter(r => r.startsWith(`${B}:`)).length, 2,
      `both halves of a graded no-fit are named; got ${JSON.stringify(both.refusals)}`);
    // A no-fit still needs its reason -- that reason is the whole record of why nothing fitted.
    assert.match(must(answer([pass, { ...noFit, reason: "   " }]), B, "a no-fit with no reason"),
      /the verdict needs a reason/);
    assert.match(must(answer([pass, { ...noFit, reason: "r".repeat(LIST_REASON_CHARS + 1) }]), B,
      "a no-fit reason past the schema's ceiling"), /the reason is 401 characters/);

    // REFUSED: a context with NO active charter at all -- every verdict on it is unanswerable, so
    // the refusal names the LIST and not one ticket.
    const naked = ctxOf([]);
    assert.deepEqual(naked.active_charters, [], "the fixture carries no charter");
    assert.match(must(answer([pass, noFit]), "backlog-intake", "a context with no active charter", naked),
      /the context carries no active project charter to judge fit against/);
    // A charter row missing its text is not a charter either: a fit judged against a blank is blind.
    const blankCharter = ctxOf([{ slug: "zagt486-alpha", charter: "  " }]);
    assert.match(must(answer([pass, noFit]), "backlog-intake", "a charter with no text", blankCharter),
      /no active project charter/);

    // And the vocabulary refusal names all three, so a fourth verdict cannot slip in as a no-fit.
    assert.match(must(answer([{ ...pass, verdict: "maybe" }, noFit]), A, "a verdict outside the three"),
      /is not one of pass, not-needed, no-fit/);

    // The stamp's summary is built in ONE place and carries the fingerprint INSIDE it.
    assert.equal(fitStampSummary("AGT-486", "f".repeat(32)),
      `AGT-486 fits no active project (charters ${"f".repeat(32)})`,
      "fitStampSummary() is the one home of the summary the function matches on");
    assert.notEqual(fitStampSummary("AGT-486", "f".repeat(32)), fitStampSummary("AGT-486", "e".repeat(32)),
      "and a different fingerprint is a different summary, which is what clears a stamp");
  });

  // ---- D. THE ROW THE MIGRATION EDITED, as DATA ------------------------------------------------
  if (CREDS) {
    await arm("D vc-reorganize-intent: the three-value enum and step 0 FIT BEFORE GRADE", async () => {
      const sp = await req("skill_profiles?slug=eq.vc-reorganize-intent&select=slug,traits,method");
      assert.ok(sp.ok, `the Skill row must read; got ${describe(sp)}`);
      assert.equal((sp.json ?? []).length, 1, "exactly ONE vc-reorganize-intent row");
      const row = sp.json[0];

      const verdict = row.traits?.schema?.properties?.rows?.items?.properties?.verdict ?? {};
      assert.deepEqual(verdict.enum, [...LIST_VERDICTS],
        "the answer contract's enum and the validator's LIST_VERDICTS are the same three values, " +
        "in the same order -- two copies that can disagree is the defect, not the guard");

      const method = String(row.method ?? "");
      const hits = method.split("FIT BEFORE GRADE").length - 1;
      assert.equal(hits, 1,
        `the method carries FIT BEFORE GRADE exactly ONCE; got ${hits} -- a second apply of the ` +
        "patch would read as a pass on a contains check");
      const step0 = method.indexOf("0. FIT BEFORE GRADE");
      const step1 = method.indexOf("1. Read the tickets first, then the candidates.");
      assert.ok(step0 >= 0, "it is numbered step 0");
      assert.ok(step1 > step0, "and step 0 sits BEFORE step 1 -- fit is judged before the grade");
      assert.equal(method.slice(step0 + "0. FIT BEFORE GRADE".length).startsWith("."),
        true, "the step reads `0. FIT BEFORE GRADE.`");
      // The two halves of John's own test, and the `no-fit` instruction, in her own words.
      for (const phrase of ["SCAFFOLDING confused about how to DEFINE an agent",
        "HARNESS confused about how to RUN or MOVE an agent",
        "set need_source and need_score to null",
        "is NOT a turn-down"]) {
        assert.ok(method.includes(phrase), `the step carries John's test verbatim: ${JSON.stringify(phrase)}`);
      }
      console.log(`    [AGT-486 arm D] enum ${JSON.stringify(verdict.enum)}, method ${method.length} chars, ` +
        `FIT BEFORE GRADE once at ${step0}, step 1 at ${step1}`);
    });
  }

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n    ${failures.join("\n    ")}`);
}

selfRun(import.meta.url, run);
export default run;
