#!/usr/bin/env node
// DeepBench v7.0.456 | tests/regression/SE-03-agent-fields.js | AGT-69 -- the orphan exemption is
// the LIVE `agents` TABLE now, not a list in src/. AGT-63 declared the six governance ids in
// src/data/agents.js's OFF_BENCH_AGENT_IDS; AGT-69 deleted that list the moment the Bench grew a
// Governance section that renders those agents from live lane=governance rows, so the exemption
// follows the truth it was always a copy of: an id is exempt because the DATABASE says it is an
// active governance agent, never because a constant in the tree says so.
//
// BOTH OF AGT-63's GUARDS SURVIVE THE MOVE INTACT, which is the point of doing it this way rather
// than simply deleting the clause: an exempt id must not also be an AGENTS member, and it must
// still be reported as an orphan when the exemption is emptied. Adding an agent to escape a
// failure therefore still buys a STRICTER check (a complete portrait and pronoun entry are owed),
// not a weaker one -- and now the exemption cannot be granted by editing a file at all.
//
// WITHOUT CREDENTIALS THE CLAUSE IS DECLARED NOT RUN, NEVER QUIETLY SOFTENED. The uncredentialed
// path runs the real-roster check with an EMPTY exemption and drops `orphan-avatar` /
// `orphan-pronouns` problems, which would otherwise report every governance portrait as stale --
// so the orphan direction is genuinely unverified on that run and says so through notRun(), rather
// than reading as a pass (SES-180 / SES-61). Everything else STANDARDS.md Section 11 states about
// the FILE is asserted on every run, credentials or not.
//
// DeepBench v7.0.428 | tests/regression/SE-03-agent-fields.js | AGT-63 -- the orphan clause learns
// the difference between a STALE entry and an OFF-BENCH one. A governance-lane agent (SES-330) is a
// real, active `agents` row that the Bench deliberately does not render, so its AVATAR_CFG /
// AGENT_PRONOUNS entries are correct rather than leftover -- and this file reported them as orphans,
// which is a false red, not a finding. The exemption is DATA (src/data/agents.js's
// OFF_BENCH_AGENT_IDS), never an id literal in this file, and it is guarded from both sides: an id
// on the list must not also be a Bench member, must still be reported as an orphan when the list is
// emptied (so the list is provably what silences it), and must carry a COMPLETE avatar and pronoun
// entry. Adding an id to escape a failure therefore buys a stricter check, not a weaker one.
// DeepBench v7.0.264 | tests/regression/SE-03-agent-fields.js | SE-03 -- Agent Field Enforcement.
// STANDARDS.md §11 (added 2026-06-24) stops being a table nobody checks.
//
// WHAT §11 REQUIRES: every entry in AGENTS (src/data/agents.js) ships all 23 listed fields plus a
// matching AVATAR_CFG and AGENT_PRONOUNS entry, in one session. The rule was written REACTIVELY --
// Victoria Chen shipped without standard fields and crashed RosterScreen on
// `trainableBy.toUpperCase()` -- and has had ZERO machine enforcement since. This is that
// enforcement.
//
// THE REQUIRED-FIELD LIST IS PARSED FROM §11 ITSELF, NEVER HARDCODED HERE, and that is the whole
// design. The obvious implementation copies the 23 names into this file, which gives one fact two
// homes: the moment §11 gains a row, the test keeps passing while the standard says otherwise. That
// is the drift this codebase has paid for over and over (SES-86 phase 3, SES-101, SES-111, SES-127,
// SES-128, SES-129). The document stays the source of truth and this test reads it.
//
// THAT MOVE HAS ITS OWN FAILURE MODE AND IT IS GUARDED, NOT ASSUMED: a parser that matched nothing
// would assert nothing and pass -- a vacuous test wearing a rigorous one's clothes (SES-199's rubber
// stamp). So the parse is asserted BEFORE any agent is examined: exactly 23 fields, and the field
// names are checked against a small set of anchors that must be present. If §11 is moved, renamed or
// reformatted this test fails LOUDLY rather than going quiet.
//
// TYPES, NOT JUST PRESENCE -- because presence alone would not have caught the crash this ticket
// exists for. `trainableBy` present but numeric still dies on `.toUpperCase()`. §11 declares a type
// per field, so the type is asserted too. `token` means one of the four T palette values §11's own
// Notes column names (T.brass / T.moss / T.navy / T.muted).
//
// IT IMPORTS THE REAL MODULES AND NEVER RECREATES THEM (SES-45, an open member of this same
// Selfbuild M3 epic): AGENTS, AVATAR_CFG, AGENT_PRONOUNS and T all come from the shipped source.
//
// DECLARED NOT RUN: §11 also requires a Supabase `agents` row per agent. That is a live-data
// assertion needing credentials this suite does not always carry, and a conditionally-skipped half
// reads as a pass (SES-180 / SES-61). It is named as SE-03's remainder rather than half-built.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { AGENTS, AVATAR_CFG, AGENT_PRONOUNS } from "../../src/data/agents.js";
import { T } from "../../src/tokens.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const STANDARDS = path.join(REPO, "docs/STANDARDS.md");

// §11's Notes column names these four by token. A `color` outside them is not a palette value.
const PALETTE = [T.brass, T.moss, T.navy, T.muted];

// Sub-shapes §11 states in prose rather than in the table.
const AVATAR_KEYS = ["skin", "hair", "collar", "extra", "border"];
const PRONOUN_KEYS = ["subject", "object", "possessive"];

// -- Parse §11's field table out of the standard --------------------------------------------
//
// Exported so the negative control can run it against a mutated document rather than against a
// reimplementation of itself.
export function parseRequiredFields(markdown) {
  const start = markdown.indexOf("## Section 11:");
  if (start < 0) throw new Error("STANDARDS.md §11 not found — the standard moved or was renamed");
  const nextSection = markdown.indexOf("\n## ", start + 1);
  const body = markdown.slice(start, nextSection < 0 ? undefined : nextSection);

  const out = [];
  // Table rows look like: | `field` | type | notes |
  const rowRx = /^\|\s*`([A-Za-z][A-Za-z0-9_]*)`\s*\|\s*([A-Za-z]+)\s*\|/gm;
  let m;
  while ((m = rowRx.exec(body)) !== null) out.push({ field: m[1], type: m[2].toLowerCase() });
  return out;
}

function typeOk(value, declared) {
  switch (declared) {
    case "string":  return typeof value === "string";
    case "number":  return typeof value === "number" && Number.isFinite(value);
    case "boolean": return typeof value === "boolean";
    // §11's Notes column enumerates the four palette tokens for `color`.
    case "token":   return typeof value === "string" && PALETTE.includes(value);
    default:        return false;
  }
}

// The whole check over one roster. Exported so the negative controls can run it against planted
// rosters -- the same shape SE-01/SE-02's checkWorktree() takes, and for the same reason.
// FEATURE: AGT-63, amended by AGT-69 -- `offBench` is the set of ids that hold AVATAR_CFG /
// AGENT_PRONOUNS entries WITHOUT being AGENTS members, because they are governance-lane agents.
// Its SOURCE changed at AGT-69 and its meaning did not: the caller now reads the ids from the live
// `agents` table (lane='governance', is_active), never from a list in src/ and never as a literal
// here, so this test keeps having one source of truth and that source is the database the Bench's
// Governance section itself renders. It narrows the orphan clause and NOTHING else: an id not in
// that set is still reported exactly as before, which is what the planted "orphan-avatar" control
// below proves. Defaulted to empty so every existing caller -- the nine planted-defect shapes --
// is byte-identical.
export function checkRoster(agents, avatars, pronouns, required, offBench = []) {
  const problems = [];
  const ids = new Set(offBench);

  for (const a of agents) {
    const who = a && a.id ? a.id : "(agent with no id)";
    ids.add(who);
    for (const { field, type } of required) {
      if (!a || a[field] === undefined) {
        problems.push({ id: who, kind: "missing-field", detail: field });
      } else if (!typeOk(a[field], type)) {
        problems.push({ id: who, kind: "wrong-type", detail: `${field} should be ${type}, got ${typeof a[field]}` });
      }
    }
    const av = avatars[who];
    if (!av) problems.push({ id: who, kind: "missing-avatar", detail: "no AVATAR_CFG entry" });
    else for (const k of AVATAR_KEYS) {
      if (av[k] === undefined) problems.push({ id: who, kind: "avatar-key", detail: k });
    }
    const pr = pronouns[who];
    if (!pr) problems.push({ id: who, kind: "missing-pronouns", detail: "no AGENT_PRONOUNS entry" });
    else for (const k of PRONOUN_KEYS) {
      if (pr[k] === undefined) problems.push({ id: who, kind: "pronoun-key", detail: k });
    }
  }

  // The reverse direction: an entry for an agent that no longer exists is stale data, and a
  // one-directional check would never see it.
  for (const k of Object.keys(avatars)) {
    if (!ids.has(k)) problems.push({ id: k, kind: "orphan-avatar", detail: "AVATAR_CFG entry with no agent" });
  }
  for (const k of Object.keys(pronouns)) {
    if (!ids.has(k)) problems.push({ id: k, kind: "orphan-pronouns", detail: "AGENT_PRONOUNS entry with no agent" });
  }
  return problems;
}

const clone = () => JSON.parse(JSON.stringify(AGENTS));

export default async function run() {
  // --- 1. THE PARSE IS ASSERTED BEFORE IT IS TRUSTED ------------------------------------------
  const md = fs.readFileSync(STANDARDS, "utf8");
  const required = parseRequiredFields(md);

  assert.strictEqual(
    required.length, 23,
    `§11 parse yielded ${required.length} fields, expected 23 — the standard changed, or the parser ` +
    `stopped matching it. Reconcile deliberately; do NOT relax this number to make the suite green.`
  );
  // Anchors: if the table were matched by accident these would not all be present.
  for (const f of ["id", "name", "trainableBy", "color", "quip", "reportCost"]) {
    assert.ok(required.some(r => r.field === f), `§11 parse is missing the required field \`${f}\``);
  }
  assert.ok(
    required.some(r => r.type === "token") && required.some(r => r.type === "boolean"),
    "§11 parse lost its type column — types are what catch the trainableBy crash this ticket is from"
  );

  // --- 2. THE PARSER'S OWN CONTROL: it must FAIL on a §11 with no table ------------------------
  // Without this, a parser that silently returned [] would make every clause below vacuous.
  const gutted = md.replace(/^\|\s*`[A-Za-z][A-Za-z0-9_]*`\s*\|.*$/gm, "");
  assert.strictEqual(
    parseRequiredFields(gutted).length, 0,
    "control: with §11's table rows removed the parser must find nothing — if it still returns " +
    "fields it is matching something other than the standard"
  );
  assert.throws(
    () => parseRequiredFields("# a document with no Section 11"),
    /not found/,
    "a STANDARDS.md without §11 must throw, never return an empty required-list"
  );

  // --- 3. THE CHECKER FIRES ON EVERY FAILURE SHAPE --------------------------------------------
  // Each is planted on a clone of the REAL roster, so the only variable is the defect.
  const shapes = [
    ["missing-field", () => { const a = clone(); delete a[0].trainableBy; return [a, AVATAR_CFG, AGENT_PRONOUNS]; }],
    ["wrong-type",    () => { const a = clone(); a[0].trainableBy = 42; return [a, AVATAR_CFG, AGENT_PRONOUNS]; }],
    ["wrong-type",    () => { const a = clone(); a[0].trainable = "yes"; return [a, AVATAR_CFG, AGENT_PRONOUNS]; }],
    ["wrong-type",    () => { const a = clone(); a[0].salary = "120000"; return [a, AVATAR_CFG, AGENT_PRONOUNS]; }],
    // a color that is a string but not a palette token — presence-only checking misses this
    ["wrong-type",    () => { const a = clone(); a[0].color = "#ff00ff"; return [a, AVATAR_CFG, AGENT_PRONOUNS]; }],
    ["missing-avatar", () => {
      const a = clone(); const av = { ...AVATAR_CFG }; delete av[a[0].id]; return [a, av, AGENT_PRONOUNS];
    }],
    ["avatar-key", () => {
      const a = clone(); const av = JSON.parse(JSON.stringify(AVATAR_CFG)); delete av[a[0].id].border;
      return [a, av, AGENT_PRONOUNS];
    }],
    ["missing-pronouns", () => {
      const a = clone(); const pr = { ...AGENT_PRONOUNS }; delete pr[a[0].id]; return [a, AVATAR_CFG, pr];
    }],
    ["pronoun-key", () => {
      const a = clone(); const pr = JSON.parse(JSON.stringify(AGENT_PRONOUNS)); delete pr[a[0].id].possessive;
      return [a, AVATAR_CFG, pr];
    }],
    // the reverse direction — a stale entry for an agent that has been removed
    ["orphan-avatar", () => {
      const a = clone().slice(1); return [a, AVATAR_CFG, AGENT_PRONOUNS];
    }],
  ];

  for (const [kind, make] of shapes) {
    const [ag, av, pr] = make();
    const problems = checkRoster(ag, av, pr, required);
    assert.ok(
      problems.some(p => p.kind === kind),
      `checkRoster() missed a planted "${kind}" — the checker cannot see that failure shape`
    );
  }

  // A whole agent missing every field must report many problems, not one — proof the loop covers
  // the full list rather than short-circuiting on the first.
  const stripped = clone();
  stripped[0] = { id: stripped[0].id };
  const many = checkRoster(stripped, AVATAR_CFG, AGENT_PRONOUNS, required)
    .filter(p => p.id === stripped[0].id && p.kind === "missing-field");
  assert.strictEqual(
    many.length, 22,
    `an agent with only an id must report 22 missing fields (23 minus id), got ${many.length}`
  );

  // FEATURE: AGT-69 -- the exemption is READ LIVE and asserted to be NARROW before it is used.
  // AGT-63's two clauses are unchanged in substance and pull in opposite directions on purpose: an
  // exempt id must not silently be a Bench member as well, and the exemption must not swallow a
  // genuinely stale entry. What changed is where the exemption comes from -- the `agents` table,
  // which is also what the Bench's Governance section renders (src/components/GovernanceSection.jsx).
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  let governanceIds = null;

  if (url && key) {
    const res = await fetch(
      `${url.replace(/\/+$/, "")}/rest/v1/agents?lane=eq.governance&is_active=eq.true&select=id`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    // assert.fail(), not assert.ok(..., `...${await res.text()}`): the template is built before the
    // assertion is evaluated, so the ok() form consumes the body and the json() read below then
    // throws "Body has already been read" on every successful run. Found here, 2026-09-12.
    if (!res.ok) assert.fail(`GET agents?lane=eq.governance failed: HTTP ${res.status} ${await res.text()}`);
    governanceIds = (await res.json()).map(r => r.id);
    assert.ok(governanceIds.length > 0,
      "the live agents table lists no active governance agent -- the exemption would be empty and " +
      "the three clauses below vacuous. Confirm the lane before relaxing this.");

    const benchIds = new Set(AGENTS.map(a => a && a.id));
    for (const id of governanceIds) {
      assert.ok(!benchIds.has(id),
        `${id} is an active governance agent but is ALSO an AGENTS member -- an id belongs to ` +
        "exactly one of them; the Bench renders governance agents from live rows, never from AGENTS");
    }
    // An id NOT exempt is still an orphan: run the checker with the exemption emptied and confirm
    // the very entries it exempts come back. Without this, the exemption could be anything at all.
    const unexempted = checkRoster(AGENTS, AVATAR_CFG, AGENT_PRONOUNS, required, []);
    for (const id of governanceIds) {
      assert.ok(unexempted.some(p => p.id === id && p.kind === "orphan-avatar"),
        `control: with the exemption emptied, ${id} must be reported as an orphan -- if it is not, ` +
        "the governance lane is not what is silencing it and this clause is measuring nothing");
    }
    // FEATURE: AGT-63, kept -- membership is an OBLIGATION: a governance agent still owes a
    // COMPLETE portrait and pronoun entry, because its id reaches audit, decision and briefing
    // surfaces, and since AGT-69 the Bench itself renders that portrait.
    for (const id of governanceIds) {
      const av = AVATAR_CFG[id];
      assert.ok(av, `governance agent ${id} has no AVATAR_CFG entry`);
      for (const k of AVATAR_KEYS) assert.ok(av[k] !== undefined, `governance agent ${id} AVATAR_CFG is missing ${k}`);
      const pr = AGENT_PRONOUNS[id];
      assert.ok(pr, `governance agent ${id} has no AGENT_PRONOUNS entry`);
      for (const k of PRONOUN_KEYS) assert.ok(pr[k] !== undefined, `governance agent ${id} AGENT_PRONOUNS is missing ${k}`);
    }
  } else {
    notRun("SE-03 orphan clause (governance exemption)",
      "needs SUPABASE_URL/SUPABASE_SERVICE_KEY -- since AGT-69 the exemption is the live agents " +
      "table, not a list in src/");
  }

  // --- 4. THE REAL ROSTER, AND NOW ITS SILENCE MEANS SOMETHING --------------------------------
  // Credentialed: the live governance ids are the exemption and every other orphan is still a
  // failure. Uncredentialed: the exemption is empty, so the orphan direction is dropped entirely
  // (it was declared not-run above) rather than reported against portraits that are correct.
  const live = checkRoster(AGENTS, AVATAR_CFG, AGENT_PRONOUNS, required, governanceIds ?? [])
    .filter(p => governanceIds !== null || (p.kind !== "orphan-avatar" && p.kind !== "orphan-pronouns"));
  assert.deepStrictEqual(
    live, [],
    "STANDARDS.md §11 is violated by the shipped roster:\n" +
      live.map(p => `  ${p.id}: ${p.kind} — ${p.detail}`).join("\n")
  );
  assert.ok(AGENTS.length > 0, "AGENTS is empty — the import resolved to nothing and clause 4 is vacuous");

  notRun(
    "the Supabase `agents` table row §11 requires per agent (id, name, code, role, specialty, bio, tenant_id)",
    "it is a live-data assertion needing credentials this suite does not always carry, and a " +
    "conditionally-skipped half reads as a pass (SES-180 / SES-61). Named as SE-03's declared " +
    "remainder rather than half-built. Everything §11 states about the FILE is asserted above."
  );
}

selfRun(import.meta.url, run);
