// DeepBench v7.0.1029 | tests/regression/agt-577-napkin-due-filter.test.mjs | AGT-577
//
// AGT-577: a tag/category/archive edit must no longer re-open an already-researched Napkin idea.
// Due-ness used to key on `updated_at`, which moves for ANY write, so one tagging pass on
// 2026-10-17 re-opened 41 rows that already carried a research verdict. The fix keys it on
// `text_updated_at`, a nullable column a trigger stamps ONLY when the idea's text changes.
//
// Three arms, and the middle one is the point: arm 1 asserts the shipped rule, arm 2 puts the old
// rule back and asserts arm 1 then THROWS (a check that cannot fail is not a check), and arm 3 is
// the live read, which is red until the migration is applied -- the column does not exist, so the
// projection answers 400. Arm 3 declares itself NOT RUN without credentials rather than passing.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { extractBlock, ROUTINES } from "../../scripts/check-routine-prompt.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SQL_PATH = path.join(REPO, "docs/design/agt-577-napkin-text-stamp.sql");
const PB_PATH = path.join(REPO, "docs/runbooks/researcher-routine.md");
const UP = "agt577_napkin_text_stamp";

const once = (hay, needle, label) => {
  const n = hay.split(needle).length - 1;
  if (n !== 1) throw new Error(`${label}: expected exactly 1 occurrence of ${JSON.stringify(needle)}, found ${n}`);
};

// -- 1. SOURCE: the migration and the playbook say what the fix requires ------------------------

function theSourceCarriesTheFix(block) {
  const sql = fs.readFileSync(SQL_PATH, "utf8");
  once(sql, "if new.text is distinct from old.text then", "migration: the trigger stamps on a TEXT change only");
  once(sql, "from public, anon, authenticated;", "migration: the function is revoked from the public roles by name");
  once(sql, "want t/t/t", "migration: its own gate asserts both directions");

  once(block, "older than text_updated_at, excluding", "playbook: due-ness reads text_updated_at");
  if (!block.includes("category, tags, archived, created_at")) {
    throw new Error("playbook: the column list does not name category, tags and archived");
  }
  if (block.includes("older than updated_at")) {
    throw new Error("playbook: the old updated_at rule is still present");
  }
}

// -- 2. BOTH WAYS: put the old rule back and arm 1 must throw -----------------------------------

function theCheckWouldFailOnTheOldRule(block) {
  const regressed = block.split("older than text_updated_at").join("older than updated_at");
  let threw = false;
  try {
    theSourceCarriesTheFix(regressed);
  } catch {
    threw = true;
  }
  if (!threw) {
    throw new Error(
      "VACUOUS: arm 1 passed on a playbook block whose rule was put back to `older than updated_at`, " +
        "so it does not grade the rule at all",
    );
  }
}

// -- 3. LIVE, read-only: the migration is recorded and the column answers -----------------------

async function theLiveTableCarriesTheColumn() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the live arm -- that exactly one migration past 20261114091356 is named " +
        `${UP}, and that a projection naming text_updated_at answers 200`,
      "SUPABASE_URL / SUPABASE_SERVICE_KEY are not set, so the live read cannot be made. " +
        "Re-run with credentials: node --env-file=.env.local tests/regression/run-all.js",
    );
    return;
  }
  const h = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

  const mr = await fetch(`${url}/rest/v1/rpc/migrations_in_range`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({ p_from: "20261114091356", p_to: "99999999999999" }),
  });
  if (!mr.ok) throw new Error(`rpc/migrations_in_range answered HTTP ${mr.status}: ${(await mr.text()).slice(0, 300)}`);
  const rows = await mr.json();
  const named = (Array.isArray(rows) ? rows : []).filter(r => r && r.name === UP);
  if (named.length !== 1) {
    throw new Error(
      `exactly one migration past 20261114091356 must be named ${UP}; found ${named.length} ` +
        `among [${(Array.isArray(rows) ? rows : []).map(r => r && r.name).join(", ")}]`,
    );
  }

  // Never select `text` -- the idea bodies are not this test's business.
  const sel = "id,researched_at,updated_at,text_updated_at";
  const gr = await fetch(`${url}/rest/v1/napkin_ideas?select=${sel}`, { headers: h });
  if (!gr.ok) throw new Error(`napkin_ideas?select=${sel} answered HTTP ${gr.status}: ${(await gr.text()).slice(0, 300)}`);
  const ideas = await gr.json();

  // PRINTED, NEVER ASSERTED: live writers move these between runs, so a threshold here would be a
  // flake. The numbers are the reading the ticket is about, so they belong in the output.
  const oldDue = ideas.filter(r => r.researched_at === null || r.researched_at < r.updated_at).length;
  const newDue = ideas.filter(
    r => r.researched_at === null || (r.text_updated_at !== null && r.researched_at < r.text_updated_at),
  ).length;
  console.log(
    `agt-577 live: ${ideas.length} napkin_ideas rows; due under the OLD rule (updated_at) ${oldDue}, ` +
      `due under the SHIPPED rule (text_updated_at) ${newDue}`,
  );
}

export default async function run() {
  const block = extractBlock(fs.readFileSync(PB_PATH, "utf8"), ROUTINES.researcher).text;
  theSourceCarriesTheFix(block);
  theCheckWouldFailOnTheOldRule(block);
  await theLiveTableCarriesTheColumn();
}

selfRun(import.meta.url, run);
