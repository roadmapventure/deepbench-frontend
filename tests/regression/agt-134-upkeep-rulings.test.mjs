// DeepBench v7.0.609 | tests/regression/agt-134-upkeep-rulings.test.mjs | AGT-134 -- A RULING ON THE
// MANAGER'S OWN UPKEEP CANNOT COME OUT EMPTY. The routine-prompt drift finding
// fab9d5a6-aa94-431e-a6e0-6af6e4a2e25a (fingerprint 33e539b3646db01b) had been re-detected on every
// runner run since 2026-09-23 and ruled by nobody, for two mechanical reasons and one missing rule:
//
//   (i)   public.finding_routes had no row for `check-routine-prompt` (the writer
//         scripts/check-routine-prompt.js actually stamps into found_by) and none for `runner`, so
//         finding_group_epic() RAISEd `unmapped source` and STOPPED the whole weekly review;
//   (ii)  apply_audit_review()'s backlog_items INSERT named 20 columns and design_status was not one
//         of them, so any ticket it filed came out design_status NULL -- immediately re-pickable by
//         an unattended cycle, which is the one kind of cycle that cannot edit a cloud routine;
//   (iii) nothing in the manager's own Skill told it that this class of finding is its call at all.
//
// Migration `agt134_upkeep_rulings_and_bar` (over the Supabase MCP, its down captured first) adds the
// two routes, adds public.manager_assignment_streak, and rebuilds apply_audit_review() from its live
// pg_get_functiondef with `needs_desktop` validated in loop 1a and design_status written in the
// INSERT. scripts/audit-review.js mirrors the refusals offline. docs/runbooks/routine-prompt.md gains
// "How a drift finding is closed". Kickoff docs/kickoffs/v7.0.609-AGT-134-manager-rules-upkeep.md.
//
// ARMS, each discriminating -- every one FAILS on the tree before the change:
//   A  PURE (no network) -- docs/runbooks/routine-prompt.md carries the new section and its five
//      steps, its "How it changes" paragraph no longer routes the push through John's word, and the
//      section states the set no session may touch. validateReview() refuses `needs_desktop` on a
//      group that files no ticket and refuses a non-boolean, in the function's words minus the
//      prefix. CONTROLS: a one-character mutation of the pinned sentence is NOT found (so the
//      matcher compares bytes), and the same groups with the flag absent draw no needs_desktop
//      refusal at all (so it is the flag that fires, not the group).
//      Pre-change: the section did not exist and validateReview() ignored the flag entirely.
//   B  LIVE, READ-ONLY (service key) -- seven finding_routes rows including the two new sources,
//      both project_slug NULL; pick_blocking_flags() = {needs-desktop}; the view reads bar 20 and an
//      integer streak; no row prime_directive_queue() hands out carries design_flag 'needs-desktop'
//      (THE EXCLUSION, from the queue's own side); and dm-audit-review-intent is still an `intent`
//      row whose method ENDS with the upkeep paragraph, byte-for-byte.
//      Pre-change: five routes, no view (42P01), and the paragraph in no Skill row.
//   C  LIVE PROBE of rpc/apply_audit_review (WRITES NOTHING BY CONSTRUCTION) -- the flag on a
//      `carry` group is refused, and a non-boolean flag is refused, both in loop 1a, which runs
//      BEFORE the coverage check and before the first write. Each refusal is compared BYTE-FOR-BYTE
//      with validateReview()'s mirror plus the function's prefix (the agt-86i arm R convention).
//      CONTROL: the identical carry group WITHOUT the flag draws a different refusal (coverage), so
//      the two above are the flag's doing; and three ledger counts are re-read equal.
//      Pre-change: the flag was ignored, so the flagged group drew the coverage refusal too.
//
// NOTHING HERE WRITES A ROW. Arm C's probes raise inside loop 1a, which is entirely ahead of
// apply_audit_review()'s first INSERT; arms A and B are a file read and four projections.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCRIPT = path.join(ROOT, "scripts", "audit-review.js");
const PROMPT_REL = "docs/runbooks/routine-prompt.md";

const PREFIX = "apply_audit_review: ";
const R_FILES = "needs_desktop applies only to a group that files a ticket";
const R_BOOL = "needs_desktop must be a boolean";
const FLAG = "needs-desktop";
const BAR = 20;               // John's number. AGT-134 did not move it; it made it countable.
const INTENT_SLUG = "dm-audit-review-intent";
const SECTION = "## How a drift finding is closed";

// The seven live routing rows, in the order --prepare reads them (precedence, source).
const ROUTES = [
  { precedence: 10, source: "*", finding_type: "security", project_slug: "security" },
  { precedence: 20, source: "auditor", finding_type: "*", project_slug: "auditor-enhancements" },
  { precedence: 30, source: "check-routine-prompt", finding_type: "*", project_slug: null },
  { precedence: 30, source: "researcher", finding_type: "*", project_slug: null },
  { precedence: 30, source: "runner", finding_type: "*", project_slug: null },
  { precedence: 30, source: "staff-watch", finding_type: "*", project_slug: null },
  { precedence: 30, source: "ticket-owner", finding_type: "*", project_slug: null },
];

// The paragraph AGT-134 appended to dm-audit-review-intent.method, under decision
// 736279b4-9f93-48d1-a573-3e582dc66923 with one full-row before-image, so a Reverse removes it.
// Pinned here byte-for-byte: the Skill row and this file are the two readings of one rule, and a
// silent reword in either is the drift this whole ticket is about.
const UPKEEP_PARA =
  "UPKEEP OF THE MANAGER'S OWN RULES (AGT-134, 2026-09-26; rule JOHN-0925-DESIGNER-DECIDES). " +
  "A routine-prompt drift finding — source check-routine-prompt, check_slug routine-prompt-drift — " +
  "is yours to rule, not John's. Rule it root-cause with needs_desktop: true and a project of your " +
  "pick. The ticket then carries design_status needs-desktop, which pick_blocking_flags() names and " +
  "prime_directive_queue() excludes, so no unattended cycle picks straight back up a finding it " +
  "cannot fix — an attended session pushes the block. Do not escalate it: escalate is only the five " +
  "john_call values (rules, money, production, hiring, switch), and pushing a prompt block is none " +
  "of them. docs/runbooks/routine-prompt.md fixes WHERE that push happens (SES-355), never WHETHER " +
  "the finding is ruled; the routine's enabled flag, its tools, its cron and its model stay John's " +
  "alone and no ruling of yours moves them.";

// The five things "How a drift finding is closed" must actually say. A section heading with nothing
// under it would pass a bare `includes(SECTION)`, so each clause is pinned separately.
const SECTION_CLAUSES = [
  "The Development Manager rules it, not John",
  "design_status = 'needs-desktop'",
  "An attended session pushes the block",
  "`runner_decisions` row",
  "scripts/check-routine-prompt.js --routine=runner",
];

const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

async function req(url, key, q, { method = "GET", body } = {}) {
  const res = await fetch(`${url}/rest/v1/${q}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text().catch(() => "");
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not json */ }
  return { ok: res.ok, status: res.status, text, json, code: json && !Array.isArray(json) ? json.code : undefined };
}
const describe = r => `HTTP ${r.status} code=${r.code ?? "-"} ${r.text.slice(0, 240)}`;

async function count(url, key, q) {
  const res = await fetch(`${url}/rest/v1/${q}`, {
    method: "HEAD",
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact" },
  });
  const cr = res.headers.get("content-range") ?? "";
  const n = Number(cr.split("/")[1]);
  if (!res.ok || !Number.isFinite(n)) throw new Error(`count ${q} -> HTTP ${res.status} content-range=${cr}`);
  return n;
}

async function run() {
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";

  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`${name}: ${e.message.split("\n")[0]}`); console.log(`    [arm ${name}] FAIL -- ${e.message.split("\n")[0]}`); }
  };

  const script = await import(pathToFileURL(SCRIPT).href);
  const { validateReview } = script;

  // --- A. the runbook section and the offline mirror, pure -----------------------------------------
  await arm("A pure", () => {
    const md = read(PROMPT_REL);

    assert.ok(md.includes(SECTION), `${PROMPT_REL} must carry the section "${SECTION}"`);
    for (const clause of SECTION_CLAUSES) {
      assert.ok(md.includes(clause), `"How a drift finding is closed" must say ${JSON.stringify(clause)}`);
    }
    // CONTROL: one character changed in a pinned clause must NOT be found. Without this the arm
    // could be passing on a substring match loose enough to accept a reworded section.
    const c0 = SECTION_CLAUSES[0];
    const mutated = `${c0.slice(0, 4)}${c0[4] === "x" ? "y" : "x"}${c0.slice(5)}`;
    assert.notStrictEqual(mutated, c0, "the control must actually differ");
    assert.ok(!md.includes(mutated), "THE CONTROL FAILED: a one-character mutation was found too, so this arm is not comparing bytes");

    // The section names the set the execution path may NOT move. A degrade does not remove a stop
    // (pattern:166): AGT-134 widened what is John's here, it removed nothing.
    for (const his of ["enabled flag", "allowed_tools", "cron", "model are John's alone"]) {
      assert.ok(md.includes(his), `the section must keep ${JSON.stringify(his)} John's`);
    }

    // "How it changes" no longer routes the push through John's word: the push is an ATTENDED act.
    const how = md.slice(md.indexOf("**How it changes.**"));
    const para = how.slice(0, how.indexOf("\n\n"));
    assert.ok(para.length > 0 && para.length < 600, `the "How it changes" paragraph should be one paragraph; got ${para.length} chars`);
    assert.ok(!para.includes("on John's word"),
      `the push clause must not read "on John's word" -- SES-355 fixes WHERE the push happens, not who rules the finding. Got: ${para}`);
    assert.ok(para.includes("ATTENDED act") && para.includes("How a drift finding is closed"),
      "and it must say what it IS instead, and point at the section that says how");

    // The offline mirror: the function's two texts, minus its prefix.
    const wl = [{ id: "d1", source: "check-routine-prompt", finding_type: "defect", weeks_seen: 1 }];
    const projects = [{ slug: "dev-manager-capabilities" }];
    const review = groups => ({ groups, summary_for_john: "qa", patterns_applied: [] });
    const refusalsOf = groups => validateReview(review(groups), wl, "2026-W39", undefined, ROUTES, projects).refusals;
    const carry = extra => ({ kind: "carry", reason: "next week", finding_ids: ["d1"], ...extra });
    const files = extra => ({ kind: "root-cause", title: "t", root_cause: "r", fix: "f",
                              project: "dev-manager-capabilities", finding_ids: ["d1"], ...extra });

    assert.deepEqual(refusalsOf([carry({ needs_desktop: true })]), [R_FILES],
      "the flag on a group that files no ticket is refused, not dropped");
    assert.deepEqual(refusalsOf([carry({ needs_desktop: "yes" })]), [R_BOOL],
      "a non-boolean flag is refused -- a string is a typo the manager should see, never a truthy value");
    assert.deepEqual(refusalsOf([files({ needs_desktop: true })]), [],
      "and on the group that DOES file a ticket it is simply accepted");
    assert.deepEqual(refusalsOf([files({ needs_desktop: false })]), []);

    // CONTROLS: the same two groups with the flag absent draw no needs_desktop refusal at all.
    assert.deepEqual(refusalsOf([carry()]), [],
      "THE CONTROL: the identical carry group without the flag is accepted, so it is the flag that fired above");
    assert.deepEqual(refusalsOf([files()]), []);
  });

  if (!url || !key) {
    notRun("AGT-134 live arms (B, C)",
      "SUPABASE_URL + SUPABASE_SERVICE_KEY absent -- the seven route rows, pick_blocking_flags(), the manager_assignment_streak bar, the queue's needs-desktop exclusion, the Skill row's paragraph and the two rpc/apply_audit_review refusals are all unverified here. Credentialed run: STANDARDS.md Section 2 rule 5");
    if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n      ${failures.join("\n      ")}`);
    return;
  }

  // --- B. the live rows, the flag, the bar and the Skill row ----------------------------------------
  await arm("B live rows", async () => {
    const r = await req(url, key, "finding_routes?select=precedence,source,finding_type,project_slug&order=precedence,source");
    assert.equal(r.status, 200, describe(r));
    assert.deepEqual(r.json, ROUTES, "the seven routing rows, exactly");
    for (const src of ["check-routine-prompt", "runner"]) {
      const row = r.json.find(x => x.source === src);
      assert.ok(row, `AGT-134's ${src} route is live`);
      assert.equal(row.project_slug, null, `${src} is a manager pick -- AGT-134 created no project`);
      assert.equal(row.finding_type, "*");
    }

    const flags = await req(url, key, "rpc/pick_blocking_flags", { method: "POST", body: {} });
    assert.equal(flags.status, 200, describe(flags));
    assert.deepEqual(flags.json, [FLAG], "the flag the ruling files under is the one the picker blocks on");

    const v = await req(url, key, "manager_assignment_streak?select=streak,bar");
    assert.equal(v.status, 200, `the view must exist and be readable with the service key; ${describe(v)}`);
    assert.equal(v.json.length, 1, "one row: the streak as it stands and the bar it is measured against");
    assert.equal(v.json[0].bar, BAR, "the bar is John's 20 -- AGT-134 made it countable, it did not move it");
    assert.ok(Number.isInteger(v.json[0].streak) && v.json[0].streak >= 0,
      `the streak is a measured integer, never NULL; got ${JSON.stringify(v.json[0].streak)}`);

    // THE EXCLUSION, read from the queue's own side: nothing the picker hands out is flagged.
    const q = await req(url, key, "rpc/prime_directive_queue", { method: "POST", body: {} });
    assert.equal(q.status, 200, describe(q));
    const flagged = (q.json ?? []).filter(x => x.design_flag === FLAG);
    assert.deepEqual(flagged, [],
      `prime_directive_queue() must hand out no ${FLAG} row -- that exclusion is the whole point of filing under the flag. Got ${JSON.stringify(flagged.map(x => x.ref))}`);

    const sp = await req(url, key, `skill_profiles?slug=eq.${INTENT_SLUG}&select=id,skill_type_slug,method`);
    assert.equal(sp.status, 200, describe(sp));
    assert.equal(sp.json.length, 1);
    assert.equal(sp.json[0].skill_type_slug, "intent",
      "the row stays an `intent`: this is what the manager INTENDS on a class of finding, not a behaviour rule and not a guardrail (pattern:136)");
    const method = String(sp.json[0].method);
    assert.ok(method.endsWith(UPKEEP_PARA),
      `${INTENT_SLUG}.method must END with the upkeep paragraph, byte-for-byte. Tail read: ${JSON.stringify(method.slice(-160))}`);
    assert.equal(method.split(UPKEEP_PARA).length - 1, 1, "and carry it exactly once");
  });

  // --- C. the refusals over the live function, proving it writes nothing ----------------------------
  await arm("C probes", async () => {
    const before = {
      backlog: await count(url, key, "backlog_items?select=id"),
      findings: await count(url, key, "audit_findings?select=id"),
      decisions: await count(url, key, "runner_decisions?select=id"),
    };

    // A finding id that is not a finding. Loop 1a's carry branch looks the fingerprint up and finds
    // none, so it falls straight through to the needs_desktop check -- which is ahead of coverage
    // (1b) and ahead of every write. The control below proves that is where each refusal came from.
    const group = extra => ({ kind: "carry", reason: "next week",
                              finding_ids: ["00000000-0000-0000-0000-0000000000aa"], ...extra });
    const call = g => req(url, key, "rpc/apply_audit_review", {
      method: "POST",
      body: { p_cycle_id: "00000000-0000-0000-0000-00000000c134", p_session_name: null,
              p_week: "2026-W39", p_review: { groups: [g] } },
    });

    const flagged = await call(group({ needs_desktop: true }));
    assert.equal(flagged.status, 400, `the flag on a carry group must be refused; got ${describe(flagged)}`);
    assert.equal(flagged.code, "P0001", `a RAISE, not a type error; got ${describe(flagged)}`);
    assert.equal(flagged.json.message, `${PREFIX}${R_FILES}`,
      "and the refusal is the function's own sentence, which validateReview() mirrors minus the prefix");

    const bad = await call(group({ needs_desktop: "yes" }));
    assert.equal(bad.status, 400, describe(bad));
    assert.equal(bad.code, "P0001", describe(bad));
    assert.equal(bad.json.message, `${PREFIX}${R_BOOL}`);

    // CONTROL: the SAME group with the flag absent gets past the needs_desktop gate and dies later,
    // on coverage. Without it, both assertions above could be passing on the fixture id.
    const ctl = await call(group());
    assert.equal(ctl.status, 400, describe(ctl));
    assert.ok(!String(ctl.json.message).includes("needs_desktop"),
      `THE CONTROL FAILED: the flagless group also died on needs_desktop, so the arm above proves nothing. Got ${describe(ctl)}`);
    assert.match(String(ctl.json.message), /unknown or not open\/carried finding/,
      "it dies on coverage instead -- which is downstream of the gate the two arms above tripped");

    const after = {
      backlog: await count(url, key, "backlog_items?select=id"),
      findings: await count(url, key, "audit_findings?select=id"),
      decisions: await count(url, key, "runner_decisions?select=id"),
    };
    assert.deepEqual(after, before, "no probe wrote anything: backlog, findings and decision counts unchanged");
  });

  notRun("AGT-134: apply_audit_review()'s INSERT column list, and the ticket a flagged group actually files",
    "pg_proc / pg_get_functiondef are not reachable over PostgREST (SES-310's refusal, unchanged), and the write half cannot be proved read-only -- it files a real AGT ticket. Arm C proves the REFUSAL half behaviourally from here; the write half was MEASURED AT THIS SHIP (2026-09-26, v7.0.609, migration agt134_upkeep_rulings_and_bar) as one rolled-back DO block over the MCP, and the migration's own trailing DO asserted the catalog in the SAME transaction that wrote the function. Catalog: apply_audit_review overloads = 1, identity (uuid,text,text,jsonb) UNCHANGED -- no parameter added or retyped (.claude/rules/supabase-function-signature.md) -- and the body carries needs_desktop. THE PAIR (b) vs (c), two root-cause groups over identical fixture findings differing ONLY by the flag: AGT-160 filed with needs_desktop:true read design_status='needs-desktop' and was ABSENT from prime_directive_queue(); AGT-159 filed without it read design_status NULL and WAS in the queue. (e): the view read bar 20; with the 8 open picked cycles closed inside the same rolled-back block the streak read 6, and one fixture MANAGER MISMATCH cycle newer than all others took it to 0. Residue re-read after the rollback: 0 fixture findings, 0 fixture tickets, 0 fixture cycles, finding_routes still 7.");

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n      ${failures.join("\n      ")}`);
}

export default run;
selfRun(import.meta.url, run);
