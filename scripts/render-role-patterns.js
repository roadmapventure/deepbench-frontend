#!/usr/bin/env node
// DeepBench v7.0.536 | scripts/render-role-patterns.js | SES-424 slice 4 (SES-416 build item 1) --
// each governance agent is assembled with the decision criteria TAGGED FOR ITS ROLE, as an inline
// Knowledge row rendered from docs/JOHN-DECISION-PATTERNS.md and pinned by sha.
//
// WHAT WAS MEASURED, not recalled, at this ship. `scripts/export-decision-patterns.js` writes 171
// rows into `public.decision_patterns` and SES-415 gave every one of them an `applies_to` role tag
// -- and yet `node scripts/agent-prompt.js --agent=designer --capability=design-kickoff`,
// `--agent=builder --capability=build-ticket` and `--agent=devmanager --capability=run-project`
// each contained the string `decision_patterns` ZERO times and pattern 163's imperative ZERO times.
// The library the three agents are graded by was not in any of their prompts. This file is what
// puts it there, as data on the row the assembler already knows how to inline
// (`traits.source = "inline"`, api/prompt/db-assembly.js) -- nothing in code learns these slugs
// (.claude/rules/capabilities-are-data.md).
//
// ONE PARSER, ONE MODEL-INHERIT RULE, BORROWED NOT REWRITTEN. `parsePatterns()` and
// `sourceVersion()` are imported from scripts/export-decision-patterns.js, and
// `inheritedModelConfig()` from scripts/render-cycle-card.js. A second parser here would grade the
// md differently from the exporter that writes the table (SES-45: two implementations agreeing with
// themselves is not agreement), and a literal `llm_model` would be a third copy of
// `runner_model_lanes` -- the drift agt-65/66/68 each assert against. Both are therefore imports,
// and neither is re-derived.
//
// THE PIN IS THE POINT, same as dm-knowledge-cycle-card. `traits.source_sha256` is sha256 of THE
// RENDERED TEXT, first 16 hex, so a row whose bytes no longer match what the committed md renders
// to is DETECTABLE (`--check-rows` exits 1 and names the role and the first differing line) rather
// than quietly stale. It is deliberately NOT self-healing: repairing drift is an UPDATE over an
// active agent's Knowledge, which AGENT-ROW-AGREED-TICKET wants imaged under a ticket that names
// the write -- never a side effect of a render.
//
// THE BYTE CAP IS A REFUSAL, NOT A WARNING (pattern 168). ROW_BYTE_CAP is 24,576 bytes; the three
// renders measure ~19.4 / 13.4 / 10.8 KB today. Over the cap this writes nothing and says so: a
// Knowledge row that crowds out the rest of the prompt is a regression in the assembly, not a
// bigger Knowledge row. RAISE THE TAG DISCIPLINE IN THE MD, NEVER THIS CAP.
//
// IMPERATIVES ONLY, BODIES BY REFERENCE. Each line is `- pattern:<no> — <imperative>` and the
// header says where the bodies are. The full md is ~1,143 lines; inlining every body would put
// three copies of it in three prompts and blow the cap. The number is the citable handle
// (`pattern:N`), which is what the agents' output contracts and scripts/agent-log.js read.
//
// Usage:
//   node scripts/render-role-patterns.js --render --role=designer
//   node scripts/render-role-patterns.js --check-rows
//   node scripts/render-role-patterns.js --write-rows --cycle=<uuid> --decision=<uuid>
//
// Exit codes:
//   --render      0 rendered; 1 over ROW_BYTE_CAP (nothing printed); 2 bad/missing --role or md.
//   --check-rows  0 every row byte-equals its render and its pin matches (also 0, with a note, when
//                 there are no credentials -- it read nothing, and says so); 1 a row DRIFTED,
//                 naming the role and the first differing line; 3 a row is ABSENT.
//   --write-rows  0 all three rows and links written and read back; 2 it could not complete.
//
// Env (process.env only -- never hardcoded, never printed): SUPABASE_URL, SUPABASE_SERVICE_KEY.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parsePatterns, sourceVersion, DOC_REL, REPO } from "./export-decision-patterns.js";
import { inheritedModelConfig, INHERITED_MODEL_COLUMNS } from "./render-cycle-card.js";

export const SCRIPT_REL = "scripts/render-role-patterns.js";
export const ROW_BYTE_CAP = 24576;
export const SKILL_TYPE_SLUG = "knowledge";
export const LINK_LEVEL = 2;
export const LINK_DISPLAY_ORDER = 7;

// The three roles this ticket seeds, each with the capability whose prompt must carry it and the
// agent name its row is titled with. `verifier` and `auditor` are tagged in the md too and are
// deliberately NOT here: SES-416's build names these three, and an agent-row write no agreed ticket
// names is John's (AGENT-ROW-AGREED-TICKET).
export const ROLES = Object.freeze({
  designer: { slug: "ds-knowledge-patterns", capability: "design-kickoff", agent: "Designer" },
  builder: { slug: "bd-knowledge-patterns", capability: "build-ticket", agent: "Builder" },
  manager: { slug: "dm-knowledge-patterns", capability: "run-project", agent: "Development Manager" },
});

export const ROLE_NAMES = Object.keys(ROLES);

const lf = s => String(s).replace(/\r\n?/g, "\n");

/** sha256 of the rendered text, first 16 hex -- the same pin shape render-cycle-card.js uses. */
export function renderSha(text) {
  return crypto.createHash("sha256").update(lf(text), "utf8").digest("hex").slice(0, 16);
}

/** A row is selected for a role when its tag names the role OR names `all`. */
export function selectsRole(row, role) {
  const tags = Array.isArray(row.applies_to) ? row.applies_to : [];
  return tags.includes(role) || tags.includes("all");
}

/**
 * PURE: the md's text in, the role's Knowledge body out. LF, NO TRAILING NEWLINE -- the stored
 * `method` is compared byte for byte by --check-rows and by the guard, and a newline the renderer
 * adds on one path and not another is exactly the kind of difference that reads as drift.
 *
 * Line 1 is the whole reading instruction: how many of how many, which file and which script
 * rendered it, how to cite, and where the bodies are. It is ALSO the row's `objective`, so the
 * assembled section header and its first line cannot say different things.
 */
export function render(md, role) {
  if (!ROLE_NAMES.includes(role)) {
    throw new Error(`unknown role ${JSON.stringify(role)} -- this file seeds ${ROLE_NAMES.join(", ")} only`);
  }
  const rows = parsePatterns(md);
  const version = sourceVersion(md);
  const selected = rows.filter(r => selectsRole(r, role));

  const out = [headerLine(role, selected.length, rows.length, version)];
  let section = null;
  for (const row of selected) {
    if (row.section !== section) {
      section = row.section;
      out.push("");
      out.push(`## ${section}`);
    }
    out.push(`- pattern:${row.pattern_no} — ${row.imperative}`);
  }
  return out.join("\n");
}

/** Pure. Line 1 of the render, and the row's objective. */
export function headerLine(role, n, total, version) {
  return `Decision patterns tagged ${role} (applies_to contains '${role}' or 'all': ${n} of ${total} ` +
    `criteria, source ${version}; rendered from ${DOC_REL} by ${SCRIPT_REL}). Apply them; cite each ` +
    `one you lean on as pattern:N. Bodies are in the md under the number.`;
}

/** Pure. The full `skill_profiles` row for a role, derived from the md's CURRENT bytes every time. */
export function knowledgeRow(md, role) {
  const text = render(md, role);
  const rows = parsePatterns(md);
  const meta = ROLES[role];
  return {
    slug: meta.slug,
    name: `${meta.agent} Knowledge — the decision patterns tagged ${role}`,
    skill_type_slug: SKILL_TYPE_SLUG,
    objective: text.split("\n")[0],
    method: text,
    traits: {
      source: "inline",
      role,
      source_version: sourceVersion(md),
      pattern_count: rows.filter(r => selectsRole(r, role)).length,
      source_sha256: renderSha(text),
    },
  };
}

/**
 * Pure classifier, the same three states render-cycle-card.js names: `absent` (no row),
 * `current` (the bytes AND the pin agree), `drifted` (a row exists whose text or pin is something
 * else). BOTH halves are compared, not just the pin: a row whose `method` was hand-edited while its
 * traits were left alone would read `current` off the pin alone, which is the failure this pin
 * exists to catch.
 */
export function rowState(live, expected) {
  if (!live) return { state: "absent", diff: null };
  const pinned = (live.traits && live.traits.source_sha256) || null;
  const sameText = lf(live.method || "") === expected.method;
  if (sameText && pinned === expected.traits.source_sha256) return { state: "current", diff: null };
  return { state: "drifted", diff: firstDiff(lf(live.method || ""), expected.method), pinned };
}

/** Pure. The first line at which two texts differ, or null. */
export function firstDiff(a, b) {
  const x = String(a).split("\n");
  const y = String(b).split("\n");
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if (x[i] !== y[i]) return { line: i + 1, live: x[i], rendered: y[i] };
  }
  return null;
}

export function readDoc(docPath) {
  const abs = docPath || path.join(REPO, DOC_REL);
  if (!fs.existsSync(abs)) {
    throw new Error(`${abs} is missing -- there is nothing to render the role's patterns from`);
  }
  return lf(fs.readFileSync(abs, "utf8"));
}

// ---------------------------------------------------------------------------
// Network + CLI
// ---------------------------------------------------------------------------

function flag(name, fallback = null) {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

async function rest(base, key, pathAndQuery, init = {}) {
  const res = await fetch(`${base.replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${init.method || "GET"} ${pathAndQuery} -> ${res.status} ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : null;
}

function creds() {
  return { base: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_KEY };
}

async function cmdRender() {
  const role = flag("role", "");
  if (!ROLE_NAMES.includes(role)) {
    console.error(`render-role-patterns --render: --role must be one of ${ROLE_NAMES.join(" | ")}, got ${JSON.stringify(role)}`);
    process.exit(2);
  }
  let text;
  try {
    text = render(readDoc(flag("doc")), role);
  } catch (e) {
    console.error(`render-role-patterns --render: ${e.message}`);
    process.exit(2);
  }
  const bytes = Buffer.byteLength(text, "utf8");
  if (bytes > ROW_BYTE_CAP) {
    console.error(`render-role-patterns --render: ${role} renders at ${bytes} bytes, over the ${ROW_BYTE_CAP}-byte cap -- printing nothing. Tighten the role tags in ${DOC_REL}; never raise the cap (pattern:168).`);
    process.exit(1);
  }
  process.stdout.write(`${text}\n`);
  console.error(`render-role-patterns: ${role} — ${bytes} bytes, sha ${renderSha(text)} (cap ${ROW_BYTE_CAP})`);
  process.exit(0);
}

async function cmdCheckRows() {
  const md = readDoc(flag("doc"));
  const { base, key } = creds();
  if (!base || !key) {
    console.log(`render-role-patterns --check-rows: no Supabase credentials (SUPABASE_URL / SUPABASE_SERVICE_KEY) -- NOTHING WAS READ, so this is not a pass on the rows. Exiting 0 because an unrunnable check is not a drift report.`);
    process.exit(0);
  }

  let worst = 0;
  for (const role of ROLE_NAMES) {
    const expected = knowledgeRow(md, role);
    let live;
    try {
      const rows = await rest(base, key, `skill_profiles?select=slug,method,traits&slug=eq.${expected.slug}&limit=1`);
      live = Array.isArray(rows) && rows.length ? rows[0] : null;
    } catch (e) {
      console.error(`render-role-patterns --check-rows: cannot read ${expected.slug} -- ${e.message}`);
      process.exit(2);
    }
    const st = rowState(live, expected);
    if (st.state === "absent") {
      console.error(`render-role-patterns --check-rows: ${role} (${expected.slug}) is ABSENT -- the agent is assembled with no decision patterns at all. Seed it: node ${SCRIPT_REL} --write-rows --cycle=<uuid> --decision=<uuid>`);
      worst = Math.max(worst, 3);
    } else if (st.state === "drifted") {
      const d = st.diff;
      console.error(`render-role-patterns --check-rows: ${role} (${expected.slug}) DRIFTED -- pinned ${JSON.stringify(st.pinned)}, ${DOC_REL} renders ${JSON.stringify(expected.traits.source_sha256)}.` +
        (d ? `\n  first difference at line ${d.line}\n  live    : ${d.live === undefined ? "<end of row>" : d.live}\n  rendered: ${d.rendered === undefined ? "<end of render>" : d.rendered}` : "\n  the text matches; the PIN does not."));
      worst = Math.max(worst, 1);
    } else {
      console.log(`render-role-patterns --check-rows: ${role} (${expected.slug}) current — ${expected.traits.pattern_count} patterns, ${Buffer.byteLength(expected.method, "utf8")} bytes, sha ${expected.traits.source_sha256}`);
    }
  }
  process.exit(worst);
}

async function cmdWriteRows() {
  const cycleId = flag("cycle");
  const decision = flag("decision");
  if (!cycleId || !decision) {
    console.error(`render-role-patterns --write-rows: --cycle=<uuid> and --decision=<uuid> are both required -- every agent-row write owes its own runner_before_images row under one decision handle (§19v, AGENT-ROW-AGREED-TICKET).`);
    process.exit(2);
  }
  const { base, key } = creds();
  if (!base || !key) {
    console.error(`render-role-patterns --write-rows: missing SUPABASE_URL / SUPABASE_SERVICE_KEY -- nothing was written.`);
    process.exit(2);
  }
  const md = readDoc(flag("doc"));

  // Every render is produced and capped BEFORE the first image is written, so a role over the cap
  // refuses the whole apply while the ledger is still untouched rather than half-way through it.
  const planned = ROLE_NAMES.map(role => {
    const row = knowledgeRow(md, role);
    const bytes = Buffer.byteLength(row.method, "utf8");
    if (bytes > ROW_BYTE_CAP) {
      throw new Error(`${role} renders at ${bytes} bytes, over the ${ROW_BYTE_CAP}-byte cap -- refusing to write any of the three.`);
    }
    return { role, row, bytes, meta: ROLES[role] };
  });

  let images = 0;
  try {
    for (const p of planned) {
      const { role, row, meta } = p;

      // Siblings first: a capability whose existing Skills disagree on the model config refuses
      // this role before anything is written for it.
      //
      // THE SIBLINGS ARE THE CAPABILITY'S OTHER `knowledge` ROWS, not all of its links, and that
      // narrowing was FOUND LIVE at this ship rather than reasoned about. SES-378's seed inherited
      // over every link of `run-project`, whose six rows happen to agree; `design-kickoff` and
      // `build-ticket` do NOT -- ds-kickoff-intent and bd-build-intent each carry max_tokens 12000
      // against their siblings' 8000, because an Intent's budget is the budget of the ANSWER and a
      // Knowledge row's llm columns are inert in the assembly (api/prompt/db-assembly.js sets
      // `llm` from the targeted Intent or the Format Skill, never from a knowledge Skill). So the
      // unfiltered set fails closed on a difference that is correct, and inheriting the Intent's
      // 12000 onto a Knowledge row would copy a number chosen for something else. Same skill type,
      // same capability is the narrowest set that still copies rather than chooses -- and for
      // run-project it returns exactly what SES-378 already wrote. It is still FAIL CLOSED: if the
      // knowledge siblings disagree, nothing is written and the column is named.
      const sibLinks = await rest(base, key, `capability_skill_profiles?select=skill_profile_slug&capability_slug=eq.${meta.capability}`);
      const sibSlugs = sibLinks.map(l => l.skill_profile_slug).filter(s => s !== row.slug);
      const sibRows = sibSlugs.length
        ? await rest(base, key, `skill_profiles?select=slug,skill_type_slug,${INHERITED_MODEL_COLUMNS.join(",")}&slug=in.(${sibSlugs.join(",")})`)
        : [];
      const kin = sibRows.filter(s => s.skill_type_slug === SKILL_TYPE_SLUG);
      let modelConfig;
      try {
        // The imported function is the ONE inherit rule (never a second copy of it here); only the
        // set it grades is chosen here, and its message names run-project for its own subject, so
        // the capability actually being seeded is restated below.
        modelConfig = inheritedModelConfig(kin);
      } catch (e) {
        throw new Error(`${meta.capability}: cannot inherit the model config for ${row.slug} from its ${kin.length} ${SKILL_TYPE_SLUG} sibling(s) (${kin.map(s => s.slug).join(", ") || "none"}) — ${e.message}`);
      }

      const existing = await rest(base, key, `skill_profiles?select=*&slug=eq.${row.slug}&limit=1`);
      const liveRow = Array.isArray(existing) && existing.length ? existing[0] : null;
      const liveLinks = await rest(base, key, `capability_skill_profiles?select=*&capability_slug=eq.${meta.capability}&skill_profile_slug=eq.${row.slug}`);
      const liveLink = Array.isArray(liveLinks) && liveLinks.length ? liveLinks[0] : null;

      // The ids are issued HERE so an INSERT's image can name the primary key before the database
      // has one. row_data NULL is the SES-89 convention for "this row does not exist yet": the undo
      // of an INSERT is a DELETE. An UPDATE's image carries the FULL row as read.
      const profileId = liveRow ? liveRow.id : crypto.randomUUID();
      const linkId = liveLink ? liveLink.id : crypto.randomUUID();

      await rest(base, key, "runner_before_images", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify([
          { cycle_id: cycleId, session_name: null, table_name: "skill_profiles", pk_value: profileId, row_data: liveRow, decision_id: decision },
          { cycle_id: cycleId, session_name: null, table_name: "capability_skill_profiles", pk_value: linkId, row_data: liveLink, decision_id: decision },
        ]),
      });
      images += 2;

      if (liveRow) {
        await rest(base, key, `skill_profiles?id=eq.${profileId}`, {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ ...row, ...modelConfig }),
        });
      } else {
        await rest(base, key, "skill_profiles", {
          method: "POST",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ id: profileId, ...row, ...modelConfig }),
        });
      }

      const link = {
        capability_slug: meta.capability,
        skill_profile_slug: row.slug,
        level: LINK_LEVEL,
        is_required: true,
        display_order: LINK_DISPLAY_ORDER,
      };
      if (liveLink) {
        await rest(base, key, `capability_skill_profiles?id=eq.${linkId}`, {
          method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(link),
        });
      } else {
        await rest(base, key, "capability_skill_profiles", {
          method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ id: linkId, ...link }),
        });
      }

      // READ BACK, both halves: a PostgREST write the role could not make answers 2xx and changes
      // nothing on some paths, so the row is re-read and re-classified rather than assumed.
      const back = await rest(base, key, `skill_profiles?select=slug,method,traits&slug=eq.${row.slug}&limit=1`);
      const after = rowState(Array.isArray(back) && back.length ? back[0] : null, row);
      if (after.state !== "current") {
        throw new Error(`${row.slug} read back as "${after.state}" after the write -- decision ${decision} is standing and holds ${images} images; reverse it before retrying`);
      }
      const backLinks = await rest(base, key, `capability_skill_profiles?select=display_order,level,is_required&capability_slug=eq.${meta.capability}&skill_profile_slug=eq.${row.slug}`);
      if (backLinks.length !== 1 || backLinks[0].display_order !== LINK_DISPLAY_ORDER || backLinks[0].is_required !== true) {
        throw new Error(`${row.slug}'s ${meta.capability} link read back as ${JSON.stringify(backLinks)} -- expected exactly one at display_order ${LINK_DISPLAY_ORDER}, is_required true`);
      }
      console.log(`render-role-patterns --write-rows: ${role} — ${liveRow ? "UPDATED" : "INSERTED"} ${row.slug} (${profileId}), ${liveLink ? "UPDATED" : "INSERTED"} its ${meta.capability} link (${linkId}) at display_order ${LINK_DISPLAY_ORDER}; ${p.bytes} bytes, ${row.traits.pattern_count} patterns, sha ${row.traits.source_sha256}; model inherited from ${kin.length} knowledge siblings (${modelConfig.llm_model}, ${modelConfig.max_tokens} tokens)`);
    }
  } catch (e) {
    console.error(`render-role-patterns --write-rows: FAILED — ${e.message}. Decision ${decision} is standing and holds ${images} before-image(s); reverse it (select public.reverse_decision('${decision}','<who>','<why>');) before retrying so the slice keeps one handle.`);
    process.exit(2);
  }
  console.log(`render-role-patterns --write-rows: done — ${planned.length} rows, ${planned.length} links, ${images} before-images under decision ${decision}.`);
  process.exit(0);
}

function main() {
  if (process.argv.includes("--render")) return cmdRender();
  if (process.argv.includes("--check-rows")) return cmdCheckRows();
  if (process.argv.includes("--write-rows")) return cmdWriteRows();
  console.error(`render-role-patterns: name a mode — --render --role=<${ROLE_NAMES.join("|")}> | --check-rows | --write-rows --cycle=<uuid> --decision=<uuid>`);
  process.exit(2);
}

// SES-176's contract: importing this module for its exports must never run the CLI.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main();
}
