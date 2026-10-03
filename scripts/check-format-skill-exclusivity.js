#!/usr/bin/env node
// DeepBench v7.0.265 | scripts/check-format-skill-exclusivity.js | SE-04 -- Format Skill
// Exclusivity. ARCHITECTURE.md §13 rule 14 [LOCKED] stops being a rule nobody checks.
//
// WHAT §13 RULE 14 REQUIRES, quoted from the section it lives in:
//
//   "14. Content specialists (planners, researchers, analysts) never own Format Skills. Format
//    Skill ownership belongs exclusively to display/editor agents (Screen Controls, HTML Display,
//    PDF Assembly). This enforces the content vs. display separation principle locked in
//    S-PM-08-design (2026-06-23). See Section 19."
//
// Ownership is three Supabase tables and no constraint: skill_profiles (skill_type_slug='format')
// -> capability_skill_profiles -> agent_capability_assignments. Nothing but discipline stood
// between that chain and a violation, which is what this ticket exists to end.
//
// THE ALLOWLIST IS DERIVED FROM THE RULE AND THE ROSTER, NEVER HARDCODED HERE, and that is the
// whole design. The obvious implementation writes ["alex","riley","claire"] into this file, which
// gives one fact two homes: the day a fourth display agent is hired, or an existing one is renamed,
// the check keeps passing while the architecture says otherwise. That is the drift this codebase
// has paid for over and over (SES-86 phase 3, SES-101, SES-111, SES-127, SES-128, SES-129), and
// SE-03 already made the same move for STANDARDS.md §11. The document stays the source of truth:
// §13 rule 14 names the three display SURFACES, and src/data/agents.js maps each surface to the one
// agent whose role is "<surface> Editor".
//
// THAT MOVE HAS ITS OWN FAILURE MODE AND IT IS GUARDED, NOT ASSUMED. A parser that matched nothing
// would produce an EMPTY allowlist -- under which every format profile looks like a violation --
// and a parser that matched too loosely would produce an allowlist containing the whole roster,
// under which nothing ever is. Both are the SES-199 rubber stamp wearing different clothes. So
// parseRuleSurfaces() and resolveDisplayAgents() THROW rather than degrade: a rule that has been
// moved, renumbered or reworded fails the check LOUDLY (exit 2, could not run) instead of quietly
// deciding the answer for itself.
//
// WHAT IS AND IS NOT A VIOLATION, stated because the discriminating half is the one that gets
// dropped. A violation is: a skill profile whose skill_type_slug is 'format', reachable through
// capability_skill_profiles to a capability, assigned by agent_capability_assignments to an agent
// who is not one of the derived display/editor agents. A profile of ANY other type held by a
// content specialist is not a violation and must never be reported as one -- Bob holding the
// 'data-analysis' INTENT profile is the system working. A check that cannot tell those apart flags
// the entire roster and gets deleted within a week.
//
// TWO OBSERVATIONS ARE PRINTED ON EVERY RUN, PASS OR FAIL, and neither is a violation:
//   - orphan format profiles: a format profile attached to no capability at all (live at ship:
//     'execution-plan'). Nobody owns it, so rule 14 has nothing to say about it -- but an
//     unattached profile is how an unnoticed one later gets attached to the wrong agent.
//   - unassigned capabilities: a capability that carries a format profile but has no agent
//     assignment. Same reasoning -- no owner yet, so no violation yet.
// They are printed for the reason check-service-boundaries.js prints its declared exceptions: a
// known gap must stay visible or it becomes the architecture.
//
// THE HONEST BOUND: this reads the three JOIN tables and nothing else. If a format skill reaches an
// agent by some path that is not capability_skill_profiles -> agent_capability_assignments -- a
// hardcoded slug in a route, say -- this check cannot see it. That is not a hole to plug with
// cleverer queries; ARCHITECTURE.md §19b is explicit that capability execution is DATA and those
// two tables are the path. A stronger claim than "the data path is clean" would be false.
//
// Usage:
//   SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node scripts/check-format-skill-exclusivity.js [--json]
//                                                                                        [--worktree=<path>]
//
// Exit codes:
//   0  every Format Skill Profile is owned only by a derived display/editor agent
//   1  a real violation -- a content specialist owns a Format Skill
//   2  the check could not run (missing env, REST failure, unparseable response, or the rule could
//      not be parsed out of ARCHITECTURE.md). Exit 2 is deliberately distinct from exit 1: an
//      unrunnable check must never be reported as a pass.
//
// Env (read from process.env only -- never hardcoded, never printed):
//   SUPABASE_URL           Project REST base, e.g. https://xxxx.supabase.co
//   SUPABASE_SERVICE_KEY   Service-role key. Required because the three join tables are not
//                          guaranteed to be readable by the anon key (DAT-18 left anon with zero
//                          write privileges and a column-scoped read surface).
//
// The pure functions (parseRuleSurfaces, resolveDisplayAgents, findViolations) are exported so the
// regression guard can import them WITHOUT network access. Importing this module must never hit
// Supabase or touch disk -- the CLI path runs only under the entry-point guard at the bottom.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_DEFAULT = path.resolve(HERE, "..");

export const RULE_DOC = "docs/ARCHITECTURE.md";
export const RULE_SECTION = "13. Session Seam Line Rules";
export const RULE_NUMBER = 14;
export const FORMAT_TYPE_SLUG = "format";

// -- Derivation step 1: the rule's own sentence ------------------------------------------------
//
// Anchored on §13's heading and then on the numbered item, so a rule that moves to another section
// or is renumbered does not silently match a lookalike sentence elsewhere in a 1400-line document.

export function parseRuleSurfaces(architectureMd) {
  if (typeof architectureMd !== "string" || !architectureMd.length) {
    throw new Error(`${RULE_DOC} is empty or unreadable -- cannot derive the display/editor allowlist`);
  }

  const sectionStart = architectureMd.indexOf(`## ${RULE_SECTION}`);
  if (sectionStart === -1) {
    throw new Error(
      `${RULE_DOC}: section "## ${RULE_SECTION}" not found. The rule this check enforces has moved ` +
        `or been renamed -- fix this parser against the document, never widen it to match anything.`
    );
  }
  const nextSection = architectureMd.indexOf("\n## ", sectionStart + 1);
  const section = architectureMd.slice(sectionStart, nextSection === -1 ? undefined : nextSection);

  const item = section
    .split(/\r?\n/)
    .find(line => new RegExp(`^\\s*${RULE_NUMBER}\\.\\s`).test(line));
  if (!item) {
    throw new Error(
      `${RULE_DOC} §${RULE_SECTION}: numbered item ${RULE_NUMBER} not found. Rule 14 is what this ` +
        `check enforces; if it was renumbered, update RULE_NUMBER deliberately.`
    );
  }
  if (!/format skill/i.test(item)) {
    throw new Error(
      `${RULE_DOC} §${RULE_SECTION} item ${RULE_NUMBER} no longer mentions Format Skills -- it now ` +
        `reads: ${item.trim().slice(0, 120)}…`
    );
  }

  // "…belongs exclusively to display/editor agents (Screen Controls, HTML Display, PDF Assembly)."
  const paren = item.match(/display\/editor agents\s*\(([^)]+)\)/i);
  if (!paren) {
    throw new Error(
      `${RULE_DOC} §${RULE_SECTION} item ${RULE_NUMBER}: could not find the "display/editor agents ` +
        `(…)" list the allowlist is derived from. Refusing to guess at it.`
    );
  }

  const surfaces = paren[1]
    .split(",")
    .map(s => s.replace(/\band\b/gi, "").trim())
    .filter(Boolean);

  if (!surfaces.length) {
    throw new Error(`${RULE_DOC} §${RULE_SECTION} item ${RULE_NUMBER}: the display-agent list is empty`);
  }
  return surfaces;
}

// -- Derivation step 2: surfaces -> roster agents ----------------------------------------------
//
// The roster (src/data/agents.js) is the source of truth for who exists. Each surface must resolve
// to EXACTLY one agent whose role reads "<surface> Editor"; zero or two is a real inconsistency
// between the rule and the roster and is thrown rather than papered over.

export function resolveDisplayAgents(surfaces, agents) {
  if (!Array.isArray(agents) || !agents.length) {
    throw new Error("the agent roster is empty -- cannot resolve the rule's display surfaces");
  }

  const resolution = [];
  for (const surface of surfaces) {
    const wanted = `${surface} editor`.toLowerCase();
    const hits = agents.filter(a => String(a.role || "").trim().toLowerCase() === wanted);
    if (hits.length !== 1) {
      throw new Error(
        `${RULE_DOC} §${RULE_SECTION} item ${RULE_NUMBER} names the display surface "${surface}", ` +
          `but src/data/agents.js has ${hits.length} agents with role "${surface} Editor". The rule ` +
          `and the roster disagree -- that is a real inconsistency, not something to default past.`
      );
    }
    resolution.push({ surface, agentId: hits[0].id, role: hits[0].role, name: hits[0].name });
  }

  return { allowed: new Set(resolution.map(r => r.agentId)), resolution };
}

// -- The check itself, pure --------------------------------------------------------------------

export function findViolations({ formatProfiles, capabilitySkillProfiles, assignments, allowed }) {
  const formatSlugs = new Set(
    (formatProfiles || [])
      .filter(p => p.skill_type_slug === FORMAT_TYPE_SLUG)
      .map(p => p.slug)
  );

  // capability -> [agentId]
  const agentsByCapability = new Map();
  for (const a of assignments || []) {
    if (!agentsByCapability.has(a.capability_slug)) agentsByCapability.set(a.capability_slug, []);
    agentsByCapability.get(a.capability_slug).push(a.agent_id);
  }

  const violations = [];
  const unassignedCapabilities = [];
  const ownedSlugs = new Set();
  let examined = 0;

  for (const link of capabilitySkillProfiles || []) {
    if (!formatSlugs.has(link.skill_profile_slug)) continue; // not a Format Skill -- rule 14 is silent
    ownedSlugs.add(link.skill_profile_slug);

    const holders = agentsByCapability.get(link.capability_slug) || [];
    if (!holders.length) {
      unassignedCapabilities.push({
        skillSlug: link.skill_profile_slug,
        capabilitySlug: link.capability_slug,
      });
      continue;
    }
    for (const agentId of holders) {
      examined++;
      if (!allowed.has(agentId)) {
        violations.push({
          skillSlug: link.skill_profile_slug,
          capabilitySlug: link.capability_slug,
          agentId,
        });
      }
    }
  }

  const orphanProfiles = [...formatSlugs].filter(s => !ownedSlugs.has(s)).sort();

  return {
    violations: violations.sort(
      (a, b) =>
        a.skillSlug.localeCompare(b.skillSlug) ||
        a.capabilitySlug.localeCompare(b.capabilitySlug) ||
        a.agentId.localeCompare(b.agentId)
    ),
    orphanProfiles,
    unassignedCapabilities,
    examined,
    formatProfileCount: formatSlugs.size,
  };
}

// -- Supabase reads (CLI path only) -------------------------------------------------------------

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

// -- CLI ----------------------------------------------------------------------------------------

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

  // 1. Derive the allowlist. A failure here is exit 2 -- the check could not run, which is not a pass.
  let surfaces;
  let resolved;
  try {
    surfaces = parseRuleSurfaces(fs.readFileSync(path.join(root, RULE_DOC), "utf8"));
    const { AGENTS } = await import(
      new URL(`file://${path.join(root, "src/data/agents.js").replace(/\\/g, "/")}`).href
    );
    resolved = resolveDisplayAgents(surfaces, AGENTS);
  } catch (e) {
    return fail(
      2,
      `check-format-skill-exclusivity: could not derive the display/editor allowlist -- ${e.message}\n` +
        `Exiting 2 (cannot run) -- this is NOT a pass, no assignment was ever examined.`
    );
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    const missing = [!supabaseUrl && "SUPABASE_URL", !supabaseKey && "SUPABASE_SERVICE_KEY"]
      .filter(Boolean)
      .join(", ");
    return fail(
      2,
      `check-format-skill-exclusivity: missing required env var(s): ${missing}. Exiting 2 (cannot ` +
        `run) -- this is NOT a pass, the assignment tables were never read.`
    );
  }

  const [profiles, links, assigns] = await Promise.all([
    restSelect(supabaseUrl, supabaseKey, `skill_profiles?select=slug,name,skill_type_slug&skill_type_slug=eq.${FORMAT_TYPE_SLUG}`),
    restSelect(supabaseUrl, supabaseKey, "capability_skill_profiles?select=capability_slug,skill_profile_slug,level,is_required"),
    restSelect(supabaseUrl, supabaseKey, "agent_capability_assignments?select=agent_id,capability_slug"),
  ]);

  const readError = profiles.error || links.error || assigns.error;
  if (readError) {
    return fail(
      2,
      `check-format-skill-exclusivity: ${readError}\nExiting 2 (cannot run) -- this is NOT a pass.`
    );
  }

  const result = findViolations({
    formatProfiles: profiles.rows,
    capabilitySkillProfiles: links.rows,
    assignments: assigns.rows,
    allowed: resolved.allowed,
  });

  if (asJson) {
    console.log(
      JSON.stringify(
        {
          rule: `${RULE_DOC} §${RULE_SECTION} item ${RULE_NUMBER}`,
          surfaces,
          allowed: [...resolved.allowed],
          resolution: resolved.resolution,
          ...result,
        },
        null,
        2
      )
    );
    process.exit(result.violations.length ? 1 : 0);
  }

  console.log(
    `check-format-skill-exclusivity: ${RULE_DOC} §${RULE_SECTION} item ${RULE_NUMBER}, ` +
      `${result.formatProfileCount} Format Skill Profile(s), ${result.examined} ownership(s) examined`
  );
  console.log(`  rule names the display surfaces: ${surfaces.join(", ")}`);
  for (const r of resolved.resolution) {
    console.log(`    ${r.surface} -> ${r.agentId} (${r.name}, ${r.role})`);
  }
  // Printed on EVERY run, pass or fail: neither is a violation, and both are how one starts.
  console.log(
    `\n  format profiles owned by no capability: ${result.orphanProfiles.length ? result.orphanProfiles.join(", ") : "none"}`
  );
  console.log(
    `  capabilities carrying a format profile with no agent assigned: ${
      result.unassignedCapabilities.length
        ? result.unassignedCapabilities.map(u => `${u.capabilitySlug} (${u.skillSlug})`).join(", ")
        : "none"
    }`
  );

  if (!result.violations.length) {
    console.log("\ncheck-format-skill-exclusivity: PASS -- every Format Skill is owned only by a display/editor agent.");
    process.exit(0);
  }

  console.log(`\ncheck-format-skill-exclusivity: FAIL -- ${result.violations.length} violation(s):`);
  for (const v of result.violations) {
    console.log(`  format skill '${v.skillSlug}' reaches agent '${v.agentId}' via capability '${v.capabilitySlug}'`);
  }
  console.log(
    "\nARCHITECTURE.md §13 rule 14 is [LOCKED]: Format Skill ownership belongs exclusively to\n" +
      "display/editor agents. Fixing this means changing agent configuration data, which §13 rule 11\n" +
      "reserves to John's explicit confirmation -- take it to a card, and do NOT add the agent to an\n" +
      "allowlist to get green (there is no allowlist to add it to, deliberately: the permitted set is\n" +
      "derived from the rule and the roster)."
  );
  process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main();
}
