#!/usr/bin/env node
// DeepBench v7.0.994 | scripts/bundle-contract.js | AGT-359 -- the bundle's published schema
// declares what the bundle returns.
//
// WHAT WAS WRONG, measured live 2026-11-10 (tree a51a2be) rather than recalled. The one handler
// api/_lib/handlers/agent-bundle.js returns ELEVEN keys on its one `return {` line, while the three
// `skill_profiles` rows whose `traits.handler = 'agent-bundle'` each published an EIGHT-property
// `traits.schema` as the MCP tool's `outputSchema`: no `capabilities`, no `taught`, no `records`.
// AGT-342 (v7.0.759) added `taught` and `records` and left the contract behind; a later ship added
// `capabilities` the same way. An MCP client therefore sees three undeclared extra keys, and
// `knowledge_entries` -- which AGT-342 turned into an INDEX of the other two -- still reads as the
// rows it used to be.
//
// THE CONTRACT LIVES HERE, ONCE, AND THE ROWS ARE WRITTEN FROM IT (pattern:163 -- one change, every
// home, one ship; pattern:2 -- the published contract is data, not a hand-kept copy per row). D1:
// all three rows get the same schema, because one handler serves all three. Nothing here knows a
// slug: ROWS is selected on the handler NAME in `traits.handler`, exactly as api/_lib/mcp.js's
// DETERMINISTIC_HANDLERS is (.claude/rules/capabilities-are-data.md, §19b).
//
// WHY THE KEYS ARE READ OUT OF THE HANDLER'S SOURCE instead of being listed a second time:
// `returnedKeys()` parses the one `return { ... no_inference: true };` line, so the gap between what
// the handler returns and what the rows declare is computed from the real implementation and can
// never be a second list agreeing with itself (docs/STANDARDS.md Section 4, the SES-45 rule).
//
// D2: `knowledge_entries` STAYS. It is not retired -- it is DECLARED for what it now is, an index
// only and never the text, "kept, not retired, for clients that count entries". D3: no
// `additionalProperties: false` anywhere; the rejection a client needs is the `required` list plus
// the declared property set, and tests/regression/agt-359-bundle-contract.test.mjs is where the
// rejection is proven, both ways. D4: `output_desc` names the same keys as the schema does.
//
// EVERY WRITE IS IMAGED FIRST (§19v). `--write` records ONE `agent-row` decision and then, per row,
// a `runner_before_images` row carrying the FULL prior row in `row_data` before the PATCH -- so one
// `reverse_decision(<id>)` restores all three rows together. The rows are true independently of the
// commit: reverting the code leaves them correct (they describe the handler, which this ticket does
// not touch).
//
// Usage:
//   node scripts/bundle-contract.js --check
//   node scripts/bundle-contract.js --write --cycle=<uuid>
//
// Exit codes: 0 current / nothing to do; 1 a STALE row, 0 rows, or a row that read back wrong;
// 2 cannot run (no flag, a missing env var -- named, never a silent pass).

import path from "path";
import { fileURLToPath } from "url";
import { isDeepStrictEqual } from "node:util";

export const HANDLER_FILE = "api/_lib/handlers/agent-bundle.js";
export const OUTPUT_DESC = "The bundle: agent, role_prompts, guardrails, output_formats, sections, capabilities, taught, records, knowledge_entries (an index of taught and records), library, no_inference.";
const T = type => ({ type });
const rows = (required, properties = {}) => ({ type: "array", items: { type: "object", required, properties } });
const group = (description, required, properties) => ({ type: "object", description, required: ["framing", "items"], properties: { framing: T("string"), items: rows(required, properties) } });
export const BUNDLE_SCHEMA = {
  type: "object",
  required: ["agent", "role_prompts", "guardrails", "sections", "capabilities", "taught", "records", "knowledge_entries", "library"],
  properties: {
    agent: T("object"), library: T("object"), sections: T("array"), guardrails: T("array"), no_inference: T("boolean"), role_prompts: T("array"), output_formats: T("array"),
    capabilities: { description: "Every capability the agent holds, with all its Skills. A one-capability tool lists only that one.", ...rows(["slug", "name", "description", "skills"], { skills: rows(["level", "slug", "name", "skill_type_slug"]) }) },
    taught: group("What the agent's trainer taught it, full text once. framing says how to use it.", ["id", "title", "text", "chars", "always"], { text: T("string"), chars: T("integer"), always: T("boolean") }),
    records: group("Records the agent wrote for itself, full text once. framing says how to use them.", ["id", "title", "text", "chars"], { text: T("string"), chars: T("integer") }),
    knowledge_entries: { description: "An index only, never the text: one entry per item in taught.items, then in records.items. Kept, not retired, for clients that count entries.", ...rows(["id", "title", "chars", "kind"], { chars: T("integer"), kind: { enum: ["taught", "record"] } }) },
  },
};

// The ROWS selector: the handler NAME, never a slug (§19b).
export const ROWS_QUERY = "skill_profiles?traits->>handler=eq.agent-bundle&select=*&order=slug";

// The one `return {` line of HANDLER_FILE, read out as the key names it hands back, in order.
// THROWS on no match rather than returning [] -- an empty list would make every gap look closed.
export function returnedKeys(src) {
  const m = /^  return \{ ([^}\n]*no_inference: true) \};$/m.exec(String(src));
  if (!m) {
    throw new Error(
      `returnedKeys: no \`return { ... no_inference: true };\` line found in the source given -- ` +
        `${HANDLER_FILE}'s return statement moved or was reshaped, and the contract can no longer be ` +
        `graded against it.`,
    );
  }
  return m[1].split(",").map(part => part.split(":")[0].trim()).filter(Boolean);
}

// Both directions, or null when there is no gap at all: keys the schema does not declare, and
// declared properties the handler does not return. Pure.
export function contractGap(schema, keys) {
  const declared = Object.keys((schema && schema.properties) || {});
  const undeclared = keys.filter(k => !declared.includes(k));
  const unreturned = declared.filter(p => !keys.includes(p));
  if (undeclared.length === 0 && unreturned.length === 0) return null;
  return { undeclared, unreturned };
}

// What is stale about one live row, in the order a reader fixes it. [] means the row is current.
export function rowGap(row) {
  const gap = [];
  if (!isDeepStrictEqual(row?.traits?.schema, BUNDLE_SCHEMA)) gap.push("traits.schema");
  if (row?.output_desc !== OUTPUT_DESC) gap.push("output_desc");
  return gap;
}

// --- the CLI -----------------------------------------------------------------------------------

function die(code, message) {
  console.error(`bundle-contract: ${message}`);
  process.exit(code);
}

function flag(name) {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
}

function credentials() {
  const missing = [
    !process.env.SUPABASE_URL && "SUPABASE_URL",
    !process.env.SUPABASE_SERVICE_KEY && "SUPABASE_SERVICE_KEY",
  ].filter(Boolean);
  if (missing.length) {
    die(2, `cannot reach the live rows -- missing env var(s): ${missing.join(", ")}. Read them from public.runner_secrets by name and export them inline.`);
  }
  return { base: process.env.SUPABASE_URL.replace(/\/+$/, ""), key: process.env.SUPABASE_SERVICE_KEY };
}

async function rest({ base, key }, pathAndQuery, init = {}) {
  const res = await fetch(`${base}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${init.method || "GET"} ${pathAndQuery.split("?")[0]} -> HTTP ${res.status} ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : null;
}

async function readRows(creds) {
  const live = await rest(creds, ROWS_QUERY);
  if (!Array.isArray(live)) throw new Error(`the ROWS read returned a non-array: ${JSON.stringify(live).slice(0, 200)}`);
  return live;
}

async function check() {
  const creds = credentials();
  const live = await readRows(creds);
  if (live.length === 0) {
    die(1, `0 rows carry traits.handler = 'agent-bundle' -- the bundle's contract has no home, so there is nothing to grade.`);
  }
  let stale = 0;
  for (const row of live) {
    const gap = rowGap(row);
    if (gap.length) {
      stale++;
      console.log(`${row.slug} - STALE: ${gap.join(", ")}`);
    } else {
      console.log(`${row.slug} - current`);
    }
  }
  console.log(`bundle-contract --check: ${live.length - stale} of ${live.length} row(s) current, ${stale} STALE.`);
  process.exit(stale ? 1 : 0);
}

async function write() {
  const creds = credentials();
  const cycleId = flag("cycle");
  if (!cycleId) {
    die(2, `--write needs --cycle=<uuid> -- every agent-row write owes its own before-image, and an image needs an owner (§19v).`);
  }
  const live = await readRows(creds);
  const stale = live.filter(row => rowGap(row).length > 0);
  if (stale.length === 0) {
    console.log(`bundle-contract --write: ${live.length} row(s) already current -- nothing written, no decision recorded.`);
    process.exit(0);
  }

  const slugs = stale.map(r => r.slug).join(", ");
  const decision = await rest(creds, "rpc/record_decision", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      p_cycle_id: cycleId,
      p_session_name: null,
      p_kind: "agent-row",
      p_backlog_id: "AGT-359",
      p_summary: `AGT-359: the bundle's published schema declares what it returns -- traits.schema + output_desc on ${stale.length} skill_profiles row(s) (${slugs})`,
      p_reasoning:
        `api/_lib/handlers/agent-bundle.js returns 11 keys; these rows published an 8-property ` +
        `traits.schema as the MCP outputSchema, leaving capabilities, taught and records undeclared ` +
        `and knowledge_entries described as the rows it stopped being at AGT-342 (v7.0.759). One ` +
        `handler serves all ${live.length} rows, so all of them carry the same schema, generated from ` +
        `scripts/bundle-contract.js's BUNDLE_SCHEMA rather than hand-kept per row; knowledge_entries ` +
        `is kept and declared as an index, not retired. An agreed ticket's Skill-row edit is build ` +
        `work with a before-image per row under this one handle, not an approval card ` +
        `(governance_rules AGENT-ROW-AGREED-TICKET). pattern:163`,
      p_ladder_work_class: null,
    }),
  });
  const decisionId = typeof decision === "string" ? decision : Array.isArray(decision) ? decision[0] : decision?.id ?? null;
  if (typeof decisionId !== "string" || decisionId.length !== 36) {
    die(1, `record_decision returned ${JSON.stringify(decision)}, which is not a decision id -- refusing to write a row whose undo handle may not exist.`);
  }

  for (const row of stale) {
    // IMAGE FIRST, and it is what authorises the PATCH. row_data is the FULL prior row: this is an
    // UPDATE, so the undo is a restore, never a delete. cycle_id only -- the table's
    // ck_before_image_attribution CHECK allows exactly one of cycle_id / session_name.
    await rest(creds, "runner_before_images", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        cycle_id: cycleId,
        session_name: null,
        table_name: "skill_profiles",
        pk_value: row.id,
        row_data: row,
        decision_id: decisionId,
      }),
    });

    await rest(creds, `skill_profiles?id=eq.${encodeURIComponent(row.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        traits: { ...(row.traits || {}), schema: BUNDLE_SCHEMA },
        output_desc: OUTPUT_DESC,
      }),
    });

    // READ IT BACK rather than trust the 2xx: a PostgREST write the role cannot make answers 2xx
    // and changes nothing on some paths.
    const back = await rest(creds, `skill_profiles?id=eq.${encodeURIComponent(row.id)}&select=*`);
    const gap = rowGap(back && back[0]);
    if (gap.length) {
      die(1, `${row.slug} read back STALE: ${gap.join(", ")}. Decision ${decisionId} is standing and holds the images written so far; reverse it (select public.reverse_decision('${decisionId}','<who>','<why>');) before retrying.`);
    }
    console.log(`${row.slug} - written (pk ${row.id}, imaged with the full prior row)`);
  }

  console.log(`bundle-contract --write: ${stale.length} row(s) now declare what the handler returns; ${stale.length} before-image(s) under decision ${decisionId}.`);
  console.log(decisionId);
  process.exit(0);
}

async function main() {
  if (process.argv.includes("--write")) return write();
  if (process.argv.includes("--check")) return check();
  die(2, `pass --check or --write --cycle=<uuid>`);
}

// The CLI fires ONLY as the process entry point: tests/regression/agt-359-bundle-contract.test.mjs
// imports the exports above, and an import must never exit the importing process.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch(e => die(1, e.message));
}
