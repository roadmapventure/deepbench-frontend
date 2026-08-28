#!/usr/bin/env node
// DeepBench v7.0.287 | scripts/check-agent-names-in-data.js | SES-51 -- Rule #1 stops being a rule
// that is enforced on code and on nothing else.
//
// WHAT RULE #1 REQUIRES, quoted from its canonical home (docs/ARCHITECTURE.md §19e):
//
//   "Rule #1 of this platform: no agent is dependent on another, ever, in its own data."
//
// and, four paragraphs above it, the correction that names the exact shape:
//
//   "Both name a specific agent id directly inside another agent's Skill Profile data -- the same
//    peer-to-peer dependency this section's own principle bans... just moved from code into data."
//
// THE ASYMMETRY THIS TICKET EXISTS TO END. Rule #1 is enforced hard on CODE -- a PreToolUse hook,
// .claude/rules/capabilities-are-data.md, Architect Review, `npm run build`. On DATA it was
// enforced by nothing at all: Skill Profiles live in Supabase with no git, no diff, no review and
// no build step, so LOO-013's hardcoded agent_id "alex" sat in production for weeks because
// nothing greps skill_profiles. Surveyed before writing this: of the 13 scripts/check-*.js files,
// exactly one reads skill_profiles (check-format-skill-exclusivity.js, SE-04) and it asks a
// different question entirely.
//
// THE TWO DESIGN CALLS THE TICKET RESERVED, AND WHICH ONE IS DERIVED AND WHICH IS A JUDGMENT.
// The ticket says in its own text: "needs a design pass to pin the assertion shape and where the
// allowlist of legitimate self-references lives (an Identity Skill naming its own agent is
// correct, not a violation)." John approved the build (directive 58db64ae item 5). They are
// settled here as follows, and the difference between them is stated rather than blurred:
//
//   (1) THE ALLOWLIST IS DERIVED, NEVER HARDCODED -- the same move SE-03 and SE-04 already made,
//       for the same measured reason (SES-86 phase 3, SES-101, SES-111, SES-127, SES-128,
//       SES-129: a fact with two homes drifts). There is no list of permitted self-references in
//       this file and there must never be one. A row's permitted agent is worked out from the
//       ownership data itself: a skill profile reaches agents through
//       capability_skill_profiles -> agent_capability_assignments (the §19b data path SE-04 also
//       walks), an agent_configs row reaches exactly its own agent_id, and a capability reaches
//       its assignees. A mention of agent X is LEGITIMATE when the row it sits in reaches X and
//       nobody else -- that is Eleanor's Identity Skill saying "Eleanor". It is a VIOLATION the
//       moment the row also reaches somebody else, because then it is one agent's data naming
//       another. The day an agent is hired, renamed or reassigned, this answer changes by itself.
//
//   (2) THE ASSERTION SHAPE IS A JUDGMENT AND IS SAID TO BE ONE. A full NAME ("Riley Torres") is
//       unambiguous and is matched anywhere in a prompt-reaching field. A bare ID is not: this
//       roster's ids include `pat`, `sam`, `dan`, `mike` and `bob`, which are ordinary English
//       words a Skill's prose will legitimately contain. Matching bare ids everywhere would fire
//       constantly on innocent text and the check would be deleted within a week -- SE-04's own
//       lesson, written in its header. So a bare id counts only inside a ROUTING CONTEXT, which
//       is the ticket's own wording ("no prompt-reaching field contains an agent id or name in a
//       routing context"). ROUTING_TOKENS below is that context, and two of its entries are not
//       invented: `executing_agent_id` and `critique_agent` are the field names §19e names as
//       known-wrong. The window is characters, not tokens, because these fields are prose and
//       JSON alike.
//
//       THE BOUND THIS BUYS AND WHAT IT COSTS, stated rather than left for someone to discover:
//       an id sitting in prose with no routing word near it is NOT reported. That is a deliberate
//       false-negative, taken to avoid a false-positive rate that would kill the check. The
//       ticket's own example -- `agent_id 'riley'` -- carries a routing token by construction,
//       which is why the trade is worth making. A future tightening belongs in this constant,
//       with a measurement behind it.
//
// WHAT IS NOT A VIOLATION AND MUST NEVER BE REPORTED AS ONE:
//   - An agent naming ITSELF in data that reaches only itself (derivation (1)).
//   - A row that reaches NO agent at all. Rule #1 is about one agent's data naming another, and a
//     row nobody holds is not yet anyone's data. Printed as an observation on every run, for the
//     reason check-service-boundaries.js prints its declared exceptions: an unowned row is how an
//     unnoticed one later gets attached to the wrong agent.
//
// THE HONEST BOUND. This sweeps skill_profiles, agent_configs and capabilities -- the three the
// ticket names. It does NOT sweep the_library / knowledge_entries, which also reach prompts at
// retrieval time and which the ticket lists as "also still unswept and in scope". That is a
// different read path (retrieval, not assembly), a different table shape, and a much larger
// corpus; it is named as the declared remainder rather than half-swept here.
//
// Usage:
//   SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node scripts/check-agent-names-in-data.js [--json]
//                                                                                   [--worktree=<path>]
//
// Exit codes:
//   0  no prompt-reaching field names an agent other than the one it belongs to
//   1  a real violation
//   2  the check could not run (missing env, REST failure, unparseable response, or Rule #1 could
//      not be parsed out of ARCHITECTURE.md). Deliberately distinct from 1: an unrunnable check
//      must never be reported as a pass.
//
// The pure functions are exported so the regression guard drives THIS code rather than a copy of
// it (docs/STANDARDS.md Section 4, SES-45). Importing this module must never hit Supabase or touch
// disk -- the CLI path runs only under the entry-point guard at the bottom.

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_DEFAULT = path.resolve(HERE, "..");

export const RULE_DOC = "docs/ARCHITECTURE.md";
// The sentence, not a section number: §19e has been renumbered before and the sentence has not.
export const RULE_SENTENCE_RE =
  /Rule #1 of this platform:\s*no agent is dependent on another, ever, in its own data\./i;

// See design call (2) in the header. `executing_agent_id` and `critique_agent` are §19e's own
// known-wrong field names; the rest are the vocabulary a routing field is written in.
export const ROUTING_TOKENS = Object.freeze([
  "agent_id",
  "executing_agent_id",
  "critique_agent",
  "available_delegates",
  "delegate",
  "delegates",
  "delegation",
  "assign",
  "assigned",
  "route",
  "routes",
  "routing",
  "handoff",
  "hand off",
  "hand-off",
  "escalate",
  "escalates",
]);

// Characters either side of an id match that are searched for a routing token. 60 is wide enough
// for `"executing_agent_id": "riley"` with whitespace and narrow enough that an unrelated routing
// word a paragraph away does not lend its context to an innocent name.
export const ROUTING_WINDOW = 60;

// The prompt-reaching fields, per table. `traits` is walked as JSON: every string leaf, at any
// depth, because the ticket's scope is "every trait subfield that reaches the prompt" and a nested
// object is exactly where a hardcoded id hides from a top-level field list.
export const SWEPT_FIELDS = Object.freeze({
  skill_profiles: ["name", "description", "objective", "method", "output_desc", "tone", "notes"],
  agent_configs: ["name", "text"],
  capabilities: ["name", "description", "display_phrase"],
});

// -- Derivation step 1: the rule still says what this check enforces ---------------------------

export function assertRuleIntact(architectureMd) {
  if (typeof architectureMd !== "string" || !architectureMd.length) {
    throw new Error(`${RULE_DOC} is empty or unreadable -- cannot confirm the rule this check enforces`);
  }
  if (!RULE_SENTENCE_RE.test(architectureMd)) {
    throw new Error(
      `${RULE_DOC}: Rule #1's sentence ("no agent is dependent on another, ever, in its own data") ` +
        `was not found. The rule this check enforces has been moved or reworded -- re-anchor this ` +
        `parser against the document deliberately, never widen it to match anything.`
    );
  }
  return true;
}

// -- Derivation step 2: the roster ---------------------------------------------------------------

export function buildAgentIndex(agents) {
  if (!Array.isArray(agents) || !agents.length) {
    throw new Error("the agent roster is empty -- cannot sweep for agent names without knowing who exists");
  }
  const index = [];
  for (const a of agents) {
    const id = String(a && a.id ? a.id : "").trim();
    const name = String(a && a.name ? a.name : "").trim();
    if (!id || !name) {
      throw new Error(
        `src/data/agents.js has a roster entry missing an id or a name (${JSON.stringify(a)}). ` +
          `A half-known agent cannot be swept for, and skipping it silently is how this check ` +
          `reports clean over the one agent it could not see.`
      );
    }
    index.push({ id, name });
  }
  return index;
}

// -- Matching ------------------------------------------------------------------------------------

function esc(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function nearRoutingToken(haystackLower, at, len) {
  const from = Math.max(0, at - ROUTING_WINDOW);
  const to = Math.min(haystackLower.length, at + len + ROUTING_WINDOW);
  const window = haystackLower.slice(from, to);
  return ROUTING_TOKENS.some(t => window.includes(t));
}

// Every agent mentioned in `text`, with HOW it was matched. Pure and exported: the guard drives
// this directly, and it is the one function whose behaviour the whole check rests on.
export function mentionsIn(text, agentIndex) {
  if (typeof text !== "string" || !text) return [];
  const lower = text.toLowerCase();
  const found = new Map(); // agentId -> {agentId, via, sample}

  for (const { id, name } of agentIndex) {
    // NAME: unambiguous, matched anywhere.
    const nameRe = new RegExp(`\\b${esc(name)}\\b`, "i");
    const nameHit = nameRe.exec(text);
    if (nameHit) {
      found.set(id, { agentId: id, via: "name", sample: name });
      continue; // a name hit already condemns the row; no need for the weaker id evidence
    }
    // ID: only inside a routing context -- see design call (2).
    const idRe = new RegExp(`\\b${esc(id)}\\b`, "gi");
    let m;
    while ((m = idRe.exec(lower)) !== null) {
      if (nearRoutingToken(lower, m.index, m[0].length)) {
        const from = Math.max(0, m.index - 24);
        found.set(id, {
          agentId: id,
          via: "id-in-routing-context",
          sample: text.slice(from, Math.min(text.length, m.index + id.length + 24)).replace(/\s+/g, " ").trim(),
        });
        break;
      }
    }
  }
  return [...found.values()];
}

// -- The check itself, pure ----------------------------------------------------------------------
//
// `rows` is [{ table, key, field, value, reaches: [agentId] }] -- `reaches` is the DERIVED
// ownership set from the header's design call (1). A row that reaches nobody is an observation,
// never a violation.

export function findViolations(rows, agentIndex) {
  const violations = [];
  const unowned = [];
  let fieldsExamined = 0;

  for (const row of rows || []) {
    const reaches = Array.isArray(row.reaches) ? row.reaches : [];
    const mentions = mentionsIn(row.value, agentIndex);
    fieldsExamined++;

    if (!mentions.length) continue;

    if (!reaches.length) {
      unowned.push({
        table: row.table,
        key: row.key,
        field: row.field,
        mentions: mentions.map(m => m.agentId).sort(),
      });
      continue;
    }

    for (const m of mentions) {
      // The self-reference exemption, derived rather than listed: legitimate exactly when this
      // row reaches nobody but the agent it names.
      const others = reaches.filter(a => a !== m.agentId);
      if (!others.length) continue;
      violations.push({
        table: row.table,
        key: row.key,
        field: row.field,
        names: m.agentId,
        via: m.via,
        sample: m.sample,
        reaches: [...reaches].sort(),
        depends: others.sort(),
      });
    }
  }

  return {
    violations: violations.sort(
      (a, b) =>
        a.table.localeCompare(b.table) ||
        a.key.localeCompare(b.key) ||
        a.field.localeCompare(b.field) ||
        a.names.localeCompare(b.names)
    ),
    unowned,
    fieldsExamined,
  };
}

// Every string leaf of a traits/guardrails JSON value, with a dotted path. Exported because a
// nested object is exactly where a hardcoded id hides from a flat field list.
export function jsonStringLeaves(value, prefix = "") {
  const out = [];
  const walk = (v, p) => {
    if (typeof v === "string") {
      out.push({ path: p, value: v });
    } else if (Array.isArray(v)) {
      v.forEach((x, i) => walk(x, `${p}[${i}]`));
    } else if (v && typeof v === "object") {
      for (const k of Object.keys(v)) walk(v[k], p ? `${p}.${k}` : k);
    }
  };
  walk(value, prefix);
  return out;
}

// -- Supabase reads (CLI path only) ---------------------------------------------------------------

async function restSelect(base, key, pathAndQuery) {
  const url = `${base.replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`;
  let res;
  try {
    res = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  } catch (e) {
    return { error: `could not reach the Supabase REST endpoint: ${e.message}` };
  }
  if (!res.ok) {
    let body = "";
    try {
      body = await res.text();
    } catch {
      /* best effort */
    }
    return { error: `Supabase REST returned HTTP ${res.status} ${res.statusText}: ${body}` };
  }
  let rows;
  try {
    rows = await res.json();
  } catch (e) {
    return { error: `Supabase REST returned unparseable JSON: ${e.message}` };
  }
  if (!Array.isArray(rows)) {
    return { error: "Supabase REST returned a non-array response for a select query" };
  }
  return { rows };
}

// -- CLI -------------------------------------------------------------------------------------------

function arg(name, fallback) {
  const prefix = `--${name}=`;
  const hit = process.argv.find(a => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

function fail(code, message) {
  console.error(message);
  process.exit(code);
}

async function main() {
  const root = path.resolve(arg("worktree", REPO_DEFAULT));
  const asJson = process.argv.includes("--json");

  let agentIndex;
  try {
    assertRuleIntact(fs.readFileSync(path.join(root, RULE_DOC), "utf8"));
    const { AGENTS } = await import(pathToFileURL(path.join(root, "src/data/agents.js")).href);
    agentIndex = buildAgentIndex(AGENTS);
  } catch (e) {
    return fail(
      2,
      `check-agent-names-in-data: could not establish what to sweep for -- ${e.message}\n` +
        `Exiting 2 (cannot run) -- this is NOT a pass, no field was ever examined.`
    );
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return fail(
      2,
      "check-agent-names-in-data: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (this data lives " +
        "in Supabase, not in the repo).\nExiting 2 (cannot run) -- this is NOT a pass."
    );
  }

  const reads = await Promise.all([
    restSelect(supabaseUrl, supabaseKey, "skill_profiles?select=slug,name,description,objective,method,output_desc,tone,notes,traits,guardrails"),
    restSelect(supabaseUrl, supabaseKey, "agent_configs?select=id,agent_id,type,name,text"),
    restSelect(supabaseUrl, supabaseKey, "capabilities?select=slug,name,description,display_phrase"),
    restSelect(supabaseUrl, supabaseKey, "capability_skill_profiles?select=capability_slug,skill_profile_slug"),
    restSelect(supabaseUrl, supabaseKey, "agent_capability_assignments?select=agent_id,capability_slug"),
  ]);
  const bad = reads.find(r => r.error);
  if (bad) {
    return fail(2, `check-agent-names-in-data: ${bad.error}\nExiting 2 (cannot run) -- this is NOT a pass.`);
  }
  const [profiles, configs, capabilities, links, assignments] = reads.map(r => r.rows);

  // -- Ownership, derived (header design call (1)) ------------------------------------------------
  const agentsByCapability = new Map();
  for (const a of assignments) {
    if (!agentsByCapability.has(a.capability_slug)) agentsByCapability.set(a.capability_slug, new Set());
    agentsByCapability.get(a.capability_slug).add(a.agent_id);
  }
  const agentsByProfile = new Map();
  for (const l of links) {
    const holders = agentsByCapability.get(l.capability_slug);
    if (!holders) continue;
    if (!agentsByProfile.has(l.skill_profile_slug)) agentsByProfile.set(l.skill_profile_slug, new Set());
    for (const a of holders) agentsByProfile.get(l.skill_profile_slug).add(a);
  }

  const rows = [];
  for (const p of profiles) {
    const reaches = [...(agentsByProfile.get(p.slug) || [])];
    for (const f of SWEPT_FIELDS.skill_profiles) {
      if (p[f]) rows.push({ table: "skill_profiles", key: p.slug, field: f, value: String(p[f]), reaches });
    }
    for (const jsonField of ["traits", "guardrails"]) {
      for (const leaf of jsonStringLeaves(p[jsonField], jsonField)) {
        rows.push({ table: "skill_profiles", key: p.slug, field: leaf.path, value: leaf.value, reaches });
      }
    }
  }
  for (const c of configs) {
    const reaches = c.agent_id ? [c.agent_id] : [];
    for (const f of SWEPT_FIELDS.agent_configs) {
      if (c[f]) rows.push({ table: "agent_configs", key: `${c.agent_id}/${c.type || c.id}`, field: f, value: String(c[f]), reaches });
    }
  }
  for (const c of capabilities) {
    const reaches = [...(agentsByCapability.get(c.slug) || [])];
    for (const f of SWEPT_FIELDS.capabilities) {
      if (c[f]) rows.push({ table: "capabilities", key: c.slug, field: f, value: String(c[f]), reaches });
    }
  }

  const result = findViolations(rows, agentIndex);

  if (asJson) {
    console.log(JSON.stringify({ ok: !result.violations.length, ...result }, null, 2));
  } else {
    console.log(
      `check-agent-names-in-data: swept ${result.fieldsExamined} prompt-reaching fields across ` +
        `${profiles.length} skill profiles, ${configs.length} agent configs and ${capabilities.length} capabilities ` +
        `for ${agentIndex.length} rostered agents.`
    );
    for (const u of result.unowned) {
      console.log(
        `  [observation] ${u.table}.${u.key}.${u.field} names ${u.mentions.join(", ")} but reaches no agent — ` +
          `Rule #1 is silent on a row nobody holds, and this is how an unnoticed one later gets attached to the wrong agent.`
      );
    }
    for (const v of result.violations) {
      console.log(
        `  [VIOLATION] ${v.table}.${v.key}.${v.field} names "${v.names}" (${v.via}) while reaching ` +
          `${v.depends.join(", ")} — that is one agent's data naming another. Sample: ${v.sample}`
      );
    }
    console.log(
      result.violations.length
        ? `\n${result.violations.length} violation(s) of Rule #1. Cross-agent needs route through request_help, reasoned live — never a field.`
        : `\nNo violation: every agent named in prompt-reaching data is the agent that data belongs to.`
    );
    console.log(
      "NOT SWEPT (declared, not a pass): the_library / knowledge_entries RAG content, which reaches " +
        "prompts at retrieval time. SES-51 names it as in scope and it is the declared remainder."
    );
  }

  process.exit(result.violations.length ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch(e => fail(2, `check-agent-names-in-data: unexpected failure -- ${e && e.stack ? e.stack : e}`));
}
