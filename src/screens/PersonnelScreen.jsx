// DeepBench v7.0.818 | PersonnelScreen.jsx | AGT-402 -- Future Controls Training section gains a sample Your trainee badge card (the badge means you can train this agent; John moved it to Future Controls).
// DeepBench v7.0.816 | PersonnelScreen.jsx | AGT-416 -- Future Controls Access group opens with the Access levels sample card (where it can be used, which model, what an AI client receives, who can teach, what stays protected).
// DeepBench v7.0.815 | PersonnelScreen.jsx | AGT-415 -- Future Controls gains a sample Skill score card (the typed 0-100 score John moved there; the Profile level bar is the editor).
// DeepBench v7.0.814 | PersonnelScreen.jsx | AGT-415 -- the Skill Ladder is a five-section bar in the Profile top card (the user clicks a level; it saves agents.skill_score), and Future Controls gains a sample Promotion by accomplishments card.
// DeepBench v7.0.813 | PersonnelScreen.jsx | AGT-402 -- the team picker announces a saved team (db-team-changed) so the badge heading follows without a reload.
// DeepBench v7.0.812 | PersonnelScreen.jsx | AGT-414 -- each capability gets an Add Skill form (name, type, optional text) and each Skill a Remove (unlinks from that capability only).
// DeepBench v7.0.811 | PersonnelScreen.jsx | AGT-402 -- Documents shows a real count including 0 (was a dash for 0).
// DeepBench v7.0.810 | PersonnelScreen.jsx | AGT-413 -- Capabilities card: every Skill under its fixed type header with all fields shown, Skill Type editable, Capability name and description editable; AGT-402 -- the ID badge heading is the agent's team name and a Times used row reads usage_count; Documents on Future Controls counts the agent's active taught items; Future Controls gains Access, Voice, Rating and Teaching origin cards with sample values.
// DeepBench v7.0.808 | PersonnelScreen.jsx | AGT-409 -- the Skill editor: on the Capabilities card each Skill expands in place to SkillEditorRow (personnel/SkillEditor.jsx) and saves through update_skill.
// DeepBench v7.0.809 | PersonnelScreen.jsx | AGT-412 -- the agent quote shows one pair of quote marks (plainQuip); before that AGT-411 --Future Controls' Intelligence Configuration footer names the Profile and Training pages; before that AGT-410 --Future Controls: the Teach control card moves into a new Training group; before that AGT-408 --phone width checked on every tab; the Training stats strip's two buttons drop under the stats; before that AGT-407 --the Proposed view is the only view (CURRENT_VIEW_RETIRED), Current code kept; before that AGT-406 --Proposed tab content held to half the browser width; before that AGT-405 --Future Controls: labeled sample rows on the header-only cards, Report Card and Work Performed; before that AGT-404 --Proposed Profile: name and role edit in place on the badge card (InlineText), Quick Stats lives in Future Controls, no Layer prefixes on Profile cards; before that AGT-403 --Proposed: one-column Profile holding Resume prompts and Playbook, CONFIGURE / COMING SOON nav, Future Controls, no ACTIVE / YOUR TRAINEE chips or header lines, tight key/value cards; before that AGT-397 slice 2 + AGT-392 --the Future View relocates the Resume tab's Vitals (Subscription and status) and the stat trio + Skill Ladder (Readiness and levels); in Proposed the Resume tab's left column is the Identity editor, and a save patches this page's agent locally (identityPatch)
// DeepBench v7.0.795 | PersonnelScreen.jsx | AGT-397 -- slice 1: on a dev host with the agt-397-layout-switch flag on, a LAYOUT switch (Current / Proposed, remembered per browser) above the breadcrumb and the mobile tab bar; Proposed trims the Profile tab to the ID badge, Capabilities and Documents and adds a COMING group with the Future View tab, which lays out the moved cards by group with an empty box for each field not yet built. The Profile cards are extracted into components defined once here
// DeepBench v7.0.792 | PersonnelScreen.jsx | AGT-390 -- a taught item's Training card and each guardrail say where it was taught and when (originTag); guardrails taught over MCP list under their Always/Never box, each with a Delete, and the boxes keep the DeepBench-written row
// DeepBench v7.0.790 | PersonnelScreen.jsx | AGT-386 round 2 -- the Add to a team button is switched off and grayed out (John, 2026-10-05) until the drawer is redesigned (AGT-389); the picker code stays
// DeepBench v7.0.790 | PersonnelScreen.jsx | AGT-386 -- a private agent's badge gains a team picker (one team per agent, saved through add_agent_to_team); the Connect button names no agent; the desktop left nav opens with the Bench breadcrumb; an id not yet in the roster shows Loading… and an unknown or archived id redirects to /bench (no other agent's file flashes); a Delete Agent link under every tab archives a private agent after a confirm popup
// DeepBench v7.0.788 | PersonnelScreen.jsx | AGT-384 -- the badge's Connect button opens the Connect to AI page (/bench/connect?agent=<id>); the popup mount is gone and ?connect=1 redirects to the page
// DeepBench v7.0.770 | PersonnelScreen.jsx | AGT-344 -- Training tab single home
// DeepBench v7.0.769 | PersonnelScreen.jsx | AGT-350 -- the Activity tab's Connected from card is a four-column table
// DeepBench v7.0.764 | PersonnelScreen.jsx | AGT-337 slice 3 -- an agent with no quip shows no empty quotation marks
// DeepBench v7.0.757 | PersonnelScreen.jsx | AGT-334 — badge actions + Connect popup
// DeepBench v7.0.758 | PersonnelScreen.jsx | AGT-339 -- a private agent's Personnel file gains the Activity
// tab: connections, where they came from, the knowledge delivered and the training's own cost, read with
// the browser key through src/lib/personnelActivity.js (no address column). Additions only.
// DeepBench v7.0.417 | PersonnelScreen.jsx | LOG-143 (b) -- the Profile tab gains the Report Card panel:
// bench_report_card_rollup read with the anon key, three dimensions shown separately (never blended,
// never a 0/5 standing in for a gap), the per-dimension unknown count counted from the graded rows, and
// the Skill row to improve resolved against the Skill Profiles this screen already lists. Zero judged
// runs is the sentence "No runs judged yet"; groundedness reads `unknown` until LOG-143 (d).
// DeepBench v6.2.16 | PersonnelScreen.jsx | PE-17 — mobile shell (merged persona header, tab bar) + Profile tab reflow

import { useState, useCallback, useEffect, useRef } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { T, display, body, mono, fmt$, skillLabel } from "../tokens.js";
import { TENANT_ID } from "../config.js";
import { AppShell, IS_ADMIN_HOST } from "../AppShell.jsx";
import { useFeatureFlag } from "../lib/featureFlags.js"; // FEATURE: AGT-397 — the layout switch's flag
import FutureViewTab, { AccessLevelsCard, SampleTag, LayoutSwitch, resolveLayout, LAYOUT_FLAG, LAYOUT_KEY } from "./personnel/FutureViewTab.jsx"; // FEATURE: AGT-397
import { Corners, SkillBar, Toast, AiBadge, FeatureBadge, AgentAvatar } from "../components/SharedUI.jsx";
import { useRoster, forgetAgent } from "../hooks/useAgents.js"; // FEATURE: AGT-386 — settled read + cache forget
import { Breadcrumb } from "../components/BenchNav.jsx"; // FEATURE: AGT-386 — the Bench breadcrumb
import { useIsMobile } from "../hooks/useIsMobile.js";
import { AGENT_PRONOUNS, STANDARD_CATEGORIES, BRENT_CATEGORIES, FLAG_TRIGGERS, JURISDICTIONS } from "../data/agents.js";
import { readinessColor, readinessLabel, priorityInfo } from "../utils.js";
import ResumeTab, { ConfigCard, AddConfigForm, originTag, VitalsCard, SkillLadderCard, IdentityEditor, saveIdentityFields } from "./personnel/ResumeTab.jsx"; // FEATURE: AGT-390 — originTag; AGT-397 — VitalsCard, SkillLadderCard
import { SkillEditorRow, CapabilityHeader, AddSkillForm, AddCapabilityForm, CapabilityDrawer, CapabilitiesGuide, SKILL_TYPES } from "./personnel/SkillEditor.jsx"; // FEATURE: AGT-409 / AGT-413 — the Skills view and editors
import { TeamHeading, SkillLevelBar, ConnectionStatus, isConnectionCapability } from "./personnel/AgentFacts.jsx"; // FEATURE: AGT-402 / AGT-413 — real team name and usage count
import { isPrivateAgent } from "../data/agents.js";
import { fetchAgentActivity, activityView } from "../lib/personnelActivity.js";
import { AI_PAT } from "../aiPatterns.js";
import { supabase } from "../lib/supabase.js";
import { toEntry, taughtCounts, cardFacts, countLine } from "../lib/taughtItems.js";

// FEATURE: PE-03 — Training tab live wiring
async function apiGetEntries(agent_id) {
  const res = await fetch(`/api/load-entries?tenant_id=${TENANT_ID}&agent_id=${encodeURIComponent(agent_id)}`);
  if (!res.ok) throw new Error("Failed to load entries");
  return (await res.json()).entries || [];
}
async function apiPatchEntry(id, status) {
  const res = await fetch("/api/load-entries", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, tenant_id: TENANT_ID, status }),
  });
  if (!res.ok) throw new Error("Failed to update");
}
async function apiDeleteEntry(id) {
  const res = await fetch("/api/load-entries", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, tenant_id: TENANT_ID }),
  });
  if (!res.ok) throw new Error("Failed to delete");
}

// FEATURE: PE-11 — Edit Course inline sub-view
async function apiUpdateEntry(id, fields) {
  const res = await fetch("/api/load-entries", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, tenant_id: TENANT_ID, ...fields }),
  });
  // FEATURE: AGT-344 — a refused edit says why, in the server's own words
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to update entry");
  }
  return (await res.json()).entry;
}

// FEATURE: PE-04 — agent-configs API helpers
async function apiGetConfigs(agent_id, type) {
  const res = await fetch(`/api/agent-configs?tenant_id=${TENANT_ID}&agent_id=${agent_id}&type=${type}`);
  if (!res.ok) throw new Error("Failed to load configs");
  return (await res.json()).configs || [];
}
async function apiSaveConfig(payload) {
  const res = await fetch("/api/agent-configs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, tenant_id: TENANT_ID }) });
  if (!res.ok) throw new Error("Failed to save");
  return (await res.json()).config;
}
async function apiPatchConfig(id, fields) {
  const res = await fetch("/api/agent-configs", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, tenant_id: TENANT_ID, ...fields }) });
  if (!res.ok) throw new Error("Failed to update");
  return (await res.json()).config;
}
async function apiDeleteConfig(id) {
  const res = await fetch("/api/agent-configs", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, tenant_id: TENANT_ID }) });
  if (!res.ok) throw new Error("Failed to delete");
}

// FEATURE: SK-01–SK-05 — fetch capabilities for agent from Supabase
async function fetchCapabilities(agentId) {
  const { data: assignments } = await supabase
    .from("agent_capability_assignments")
    .select("capability_slug")
    .eq("agent_id", agentId)
    .eq("tenant_id", TENANT_ID);

  if (!assignments || assignments.length === 0) return [];

  const result = [];
  for (const a of assignments) {
    const { data: cap } = await supabase
      .from("capabilities")
      .select("*")
      .eq("slug", a.capability_slug)
      .single();
    if (!cap) continue;

    const { data: cspRows } = await supabase
      .from("capability_skill_profiles")
      .select("*")
      .eq("capability_slug", cap.slug)
      .order("display_order", { ascending: true });

    const skillProfiles = [];
    for (const csp of (cspRows || [])) {
      const { data: sp } = await supabase
        .from("skill_profiles")
        .select("*")
        .eq("slug", csp.skill_profile_slug)
        .single();
      if (sp) skillProfiles.push({ ...sp, level: csp.level });
    }
    result.push({ ...cap, skillProfiles });
  }
  return result;
}

// ── FEATURE: LOG-143 (b) — the Report Card panel's data path ─────────────────────────────────
// `bench_report_card_rollup` (LOG-143 (a), v7.0.415) is the aggregate contract: one row per
// agent_id carrying runs_judged, the three per-dimension averages that ignore NULLs, unknown_rate,
// last_judged_at, and lowest_skill (the modal skill_to_improve). It is a security_invoker view
// with no visitor column, so the anon key already in the browser bundle can read it.
//
// It carries NO per-dimension unknown COUNT — verified against information_schema this session —
// and an average that ignores NULLs cannot be inverted into one, so the counts the panel names
// ("3 of 12 unknown") are counted from the graded rows themselves. That second read is legal with
// the same key: `bench_report_cards`' three score columns are inside the 13-column SELECT list
// anon holds (visitor_id is deliberately outside it, .claude/rules/supabase-column-grants.md), and
// a column-list grant means every reader must NAME its columns — never select=*, which 403s.
// No migration, no api/ route: two public reads, both console.error-only on failure so a report
// card outage can never blank the Personnel File.
async function fetchReportCard(agentId) {
  const { data: rollupRows, error: rollupErr } = await supabase
    .from("bench_report_card_rollup")
    .select("agent_id,runs_judged,avg_delegation_fit,avg_groundedness,avg_skill_use,unknown_rate,last_judged_at,lowest_skill")
    .eq("agent_id", agentId);
  if (rollupErr) throw rollupErr;
  const rollup = (rollupRows || [])[0] || null;
  // No rollup row means no judged run for this agent. Returning null (not a zeroed object) is what
  // makes reportCardLines() render the sentence instead of a 0/5 (`C-rejected-17`/`C-rejected-18`).
  if (!rollup) return null;
  const { data: rows, error: rowsErr } = await supabase
    .from("bench_report_cards")
    .select("delegation_fit,groundedness,skill_use")
    .eq("agent_id", agentId)
    .eq("tenant_id", TENANT_ID);
  if (rowsErr) throw rowsErr;
  const unknown_counts = { delegation_fit: 0, groundedness: 0, skill_use: 0 };
  for (const r of (rows || [])) {
    for (const k of Object.keys(unknown_counts)) if (r[k] === null || r[k] === undefined) unknown_counts[k] += 1;
  }
  return { ...rollup, unknown_counts };
}

// FEATURE: LOG-143 (b) — pure: the rollup row (plus the unknown counts fetched above) and the
// agent's own Skill Profiles in, the panel's lines out. Two rules are enforced here rather than in
// the JSX, which is why they are testable:
//   • zero judged runs is a SENTENCE, never a number — `empty: true` and no `/5` string is
//     produced anywhere in the return (`C-rejected-17`/`C-rejected-18`);
//   • a dimension with no average prints the word `unknown`, and its unknown count is named
//     beside it. Groundedness is `unknown` on every card until LOG-143 (d) ships the by-id
//     Library content read (part (a) Blocker B) — the panel says so honestly rather than
//     rendering a score the platform cannot yet compute.
// There is deliberately no blended overall score (`C-rejected-27`): three dimensions, separately.
export function reportCardLines(rollupRow, skills = []) {
  const runs = Number(rollupRow?.runs_judged) || 0;
  if (!rollupRow || runs <= 0) {
    return { empty: true, runsJudged: 0, emptyText: "No runs judged yet", dimensions: [], skillToImproveText: null, lastJudgedAt: null };
  }
  const counts = (rollupRow.unknown_counts && typeof rollupRow.unknown_counts === "object") ? rollupRow.unknown_counts : {};
  const dimensions = [
    ["delegation_fit", "Delegation fit", "avg_delegation_fit"],
    ["groundedness",   "Groundedness",   "avg_groundedness"],
    ["skill_use",      "Skill use",      "avg_skill_use"],
  ].map(([key, label, avgKey]) => {
    const raw = rollupRow[avgKey];
    const avg = (raw === null || raw === undefined || raw === "") ? NaN : Number(raw);
    const scored = Number.isFinite(avg);
    const unknownRaw = Number(counts[key]);
    const unknown = Number.isFinite(unknownRaw) ? unknownRaw : 0;
    return {
      key, label, scored,
      scoreText: scored ? `${avg.toFixed(1)}/5` : "unknown",
      unknownText: unknown > 0 ? `${unknown} of ${runs} unknown` : null,
    };
  });
  const slug = (typeof rollupRow.lowest_skill === "string" && rollupRow.lowest_skill) ? rollupRow.lowest_skill : null;
  const named = slug ? (skills.find(s => s && s.slug === slug) || null) : null;
  return {
    empty: false,
    runsJudged: runs,
    emptyText: null,
    dimensions,
    // The slug is what the judge named and what a Skill row is edited by, so it is shown even when
    // the roster read has not resolved a display name for it — never dropped, never invented.
    skillToImproveText: slug ? (named?.name ? `${slug} — ${named.name}` : slug) : "none named yet",
    lastJudgedAt: rollupRow.last_judged_at || null,
  };
}

// FEATURE: PE-10 — Add Courses inline sub-view
function str(v) { return typeof v === "string" ? v : ""; }

// FEATURE: PE-10 patch 2 — readAsArrayBuffer → Uint8Array → btoa (binary-safe, no readAsDataURL)
async function extractTextFromFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const bytes = new Uint8Array(e.target.result);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        const base64 = btoa(binary);
        const res = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileData: base64, fileType: file.type, fileName: file.name }),
        });
        const data = await res.json();
        if (!res.ok) { resolve({ text: "", wordCount: 0, error: data.error || "Extraction failed" }); return; }
        resolve({ text: data.text, wordCount: data.wordCount, error: null });
      } catch (err) {
        resolve({ text: "", wordCount: 0, error: err.message });
      }
    };
    reader.onerror = () => resolve({ text: "", wordCount: 0, error: "File read failed" });
    reader.readAsArrayBuffer(file);
  });
}

async function generateMetadata(filename, extractedText, agentId) {
  try {
    const snippet = extractedText.slice(0, 3000);
    const prompt = `You are a procurement knowledge management system. Analyze this document and return ONLY a JSON object with these fields:
{"title":"short descriptive title","category":"one of: Compliance,Jurisdiction,Best Practice,Internal,Standards,Methodology,Playbook,Template,Statute,Portal Navigation,Data Schema,Export Method,Auth Pattern,State Portal,Open Records,Research Method,Data Dictionary","jurisdiction":"one of: All,Federal,Texas,California,Florida,New York,Illinois","priority":50,"triggers":["array","of","flag","ids","from","maverick,po-split,spike,single-source,vendor-hhi,long-tail"]}

Document filename: ${filename}
Document text: ${snippet}

Return ONLY the JSON. No explanation.`;
    const res = await fetch("/api/brief", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        agent_id: agentId,
        tenant_id: TENANT_ID,
        skipRag: true,
        ai_type: "extraction",
      }),
    });
    const data = await res.json();
    const raw = data.content?.[0]?.text || "";
    const clean = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch (e) {
    return null;
  }
}

// ── 5-layer readiness calc ────────────────────────────────────────────────────
function computeLayers(agent, entries) {
  const n = entries.length;
  return [
    { num:"L1", label:"Role & Behavior",    tab:"Resume",   s: agent.skill > 0 ? Math.min(100, agent.skill) : 0 },
    { num:"L2", label:"Background (RAG)",   tab:"Training", s: agent.trainable ? Math.min(100, Math.round(20 + n*6)) : 0 },
    { num:"L3", label:"Analysis Payload",   tab:"—",        s: 100 },
    { num:"L4", label:"Output Format",      tab:"Playbook", s: agent.trainable ? 72 : 50 },
    { num:"L5", label:"Guardrails",         tab:"Playbook", s: agent.trainable ? 68 : 45 },
  ];
}

// ── Mock tasks per agent (replace with Supabase in Phase 0) ─────────────────
const AGENT_TASKS = {
  robyn:[{id:1,title:"NIGP Demo — Austin FY2025 Spend Analysis",type:"Data Analysis",status:"completed",priority:"High",due:"Jun 15",preview:"Full portfolio analysis: $372M, 264 NIGP classes, 2,847 vendors."},{id:3,title:"Vendor Concentration Briefing — City of Austin",type:"Data Analysis",status:"in-progress",priority:"High",due:"Jun 18",preview:"Analyzing HHI scores and single-source risk across facilities spend."}],
  brent:[{id:2,title:"Illinois Q1 2025 Expenditure Fetch",type:"Web Fetch",status:"needs-review",priority:"Normal",due:"Jun 20",preview:"Brent navigated IL Comptroller portal and downloaded statewide expenditures. File ready for analysis."},{id:5,title:"Maryland FY2025 Vendor Payment Data",type:"Web Fetch",status:"pending",priority:"Normal",due:"Jun 25",preview:"Scheduled fetch from MD-VIEW portal."}],
  mike:[{id:6,title:"Contract Coverage Gap Analysis",type:"Data Analysis",status:"awaiting-input",priority:"Low",due:"TBD",preview:"Awaiting your input: which fiscal year should this analysis cover?"}],
  bob:[{id:3,title:"Vendor Concentration Briefing — City of Austin",type:"Compliance Review",status:"in-progress",priority:"High",due:"Jun 18",preview:"Reviewing contracts and single-source justifications for compliance."}],
};
const AGENT_COMPLETED = {
  robyn:[{id:10,title:"FY2024 Annual Spend Report",type:"Data Analysis",completedOn:"May 28"},{id:12,title:"Sole-Source Justification Review",type:"Compliance Review",completedOn:"May 15"}],
  brent:[{id:11,title:"Oregon OregonBuys PO Export",type:"Web Fetch",completedOn:"May 22"}],
};

// FEATURE: SK-06 — hover card showing all Traits for a Skill Profile
function SkillHoverCard({ skill }) {
  if (!skill) return null;

  const TYPE_COLOR = {
    intent:   { bg: "rgba(182,135,58,.15)", color: T.brassDeep,  border: "rgba(182,135,58,.35)", label: "INTENT"   },
    format:   { bg: "rgba(90,117,56,.12)",  color: T.moss,       border: "rgba(90,117,56,.3)",   label: "FORMAT"   },
    knowledge:{ bg: "rgba(18,36,60,.1)",    color: T.navy,       border: T.line,                 label: "KNOWLEDGE"},
    behavior: { bg: "rgba(120,109,82,.12)", color: T.mutedDeep,  border: T.line,                 label: "BEHAVIOR" },
    identity: { bg: "rgba(168,51,25,.08)",  color: T.flag,       border: "rgba(168,51,25,.25)",  label: "IDENTITY" },
  };
  const tc = TYPE_COLOR[skill.skill_type_slug] || TYPE_COLOR.intent;

  const standardRows = [
    ["Objective",  skill.objective],
    ["Method",     skill.method],
    ["Output",     skill.output_desc],
    ["Tone",       skill.tone],
    ["Confidence", skill.confidence],
  ].filter(([, v]) => v);

  const must    = skill.guardrails?.must    || [];
  const mustNot = skill.guardrails?.must_not || [];
  const typeTraits = skill.traits ? Object.entries(skill.traits) : [];

  return (
    <div style={{
      position: "absolute",
      bottom: "calc(100% + 6px)",
      left: 0,
      zIndex: 100,
      background: T.navy,
      border: `1px solid rgba(182,135,58,0.3)`,
      boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
      padding: "12px 14px",
      minWidth: 260,
      maxWidth: 300,
      pointerEvents: "none",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 8 }}>
        <div style={{ fontFamily: body, fontSize: 12, fontWeight: 600, color: "#fff", lineHeight: 1.3 }}>{skill.name}</div>
        <span style={{ fontFamily: mono, fontSize: 7.5, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", padding: "2px 6px", background: tc.bg, color: tc.color, border: `1px solid ${tc.border}`, flexShrink: 0 }}>
          {tc.label}
        </span>
      </div>
      {skill.description && (
        <div style={{ fontFamily: body, fontSize: 10, color: "rgba(255,255,255,0.5)", fontStyle: "italic", marginBottom: 10, lineHeight: 1.4 }}>
          {skill.description}
        </div>
      )}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", marginBottom: 8 }} />
      {standardRows.map(([label, value]) => (
        <div key={label} style={{ display: "flex", gap: 8, marginBottom: 5 }}>
          <div style={{ fontFamily: mono, fontSize: 8.5, color: "rgba(182,135,58,0.7)", width: 68, flexShrink: 0, paddingTop: 1 }}>{label}</div>
          <div style={{ fontFamily: body, fontSize: 10, color: "rgba(255,255,255,0.75)", lineHeight: 1.4 }}>{value}</div>
        </div>
      ))}
      {typeTraits.length > 0 && (
        <>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", margin: "8px 0" }} />
          {typeTraits.map(([key, val]) => (
            <div key={key} style={{ display: "flex", gap: 8, marginBottom: 5 }}>
              <div style={{ fontFamily: mono, fontSize: 8.5, color: "rgba(182,135,58,0.5)", width: 68, flexShrink: 0, paddingTop: 1 }}>
                {key.replace(/_/g, " ")}
              </div>
              <div style={{ fontFamily: mono, fontSize: 9, color: "rgba(255,255,255,0.55)", lineHeight: 1.4 }}>
                {Array.isArray(val) ? val.join(" · ") : String(val)}
              </div>
            </div>
          ))}
        </>
      )}
      {(must.length > 0 || mustNot.length > 0) && (
        <>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", margin: "8px 0" }} />
          {must.length > 0 && (
            <div style={{ marginBottom: 5 }}>
              <div style={{ fontFamily: mono, fontSize: 8, color: T.moss, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700, marginBottom: 4 }}>MUST</div>
              {must.map((r, i) => (
                <div key={i} style={{ fontFamily: body, fontSize: 10, color: "rgba(255,255,255,0.6)", marginBottom: 2, paddingLeft: 8 }}>· {r}</div>
              ))}
            </div>
          )}
          {mustNot.length > 0 && (
            <div>
              <div style={{ fontFamily: mono, fontSize: 8, color: T.flag, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700, marginBottom: 4 }}>MUST NOT</div>
              {mustNot.map((r, i) => (
                <div key={i} style={{ fontFamily: body, fontSize: 10, color: "rgba(255,255,255,0.6)", marginBottom: 2, paddingLeft: 8 }}>· {r}</div>
              ))}
            </div>
          )}
        </>
      )}
      {skill.notes && (
        <>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", margin: "8px 0" }} />
          <div style={{ fontFamily: body, fontSize: 10, color: "rgba(255,255,255,0.45)", fontStyle: "italic", lineHeight: 1.4 }}>{skill.notes}</div>
        </>
      )}
    </div>
  );
}

// FEATURE: SK-06 — skill row with hover card trigger
function SkillRow({ sp, chip }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: `1px solid ${T.lineSoft}`, position: "relative", cursor: "default" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ fontFamily: body, fontSize: 11, color: T.mutedDeep, flex: 1 }}>{sp.name}</div>
      <span style={{ fontFamily: mono, fontSize: 7.5, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", padding: "1px 5px", background: chip.bg, color: chip.color, border: `1px solid ${chip.border}`, flexShrink: 0 }}>
        {chip.label}
      </span>
      <span style={{ fontFamily: mono, fontSize: 8, fontWeight: 700, color: T.brassDeep, background: "rgba(182,135,58,.1)", border: `1px solid rgba(182,135,58,.25)`, padding: "1px 5px", flexShrink: 0 }}>
        L{sp.level}
      </span>
      {hovered && <SkillHoverCard skill={sp} />}
    </div>
  );
}

// FEATURE: AGT-386 — the team picker on a private agent's badge. The button reads the agent's team
// (or the add prompt when it has none) and toggles a drawer: one radio per team, then "New team"
// with a name field; with no teams yet, just the name field. A pick saves through the
// add_agent_to_team action, which puts the agent on that one team and takes it off any other. The
// teams list is the browser-key read BenchNewScreen used (id, name — never address); the agent's
// current team is the route's `teams=1` read. Errors on either read leave the defaults.
const TEAM_GHOST = {background:"transparent",border:`1px solid ${T.line}`,color:T.mutedDeep,padding:"5px 12px",fontFamily:body,fontSize:12,cursor:"pointer"};
const TEAM_FIELD_LABEL = { fontFamily:mono, fontSize:9, color:T.brassDeep, textTransform:"uppercase", letterSpacing:1.3, fontWeight:600, marginBottom:4 };
const TEAM_ROW = { fontFamily:body, fontSize:12, color:T.mutedDeep, display:"flex", alignItems:"center", gap:6, cursor:"pointer", marginBottom:8 };

function TeamPicker({ agent }) {
  const isMobile = useIsMobile();
  const [open, setOpen]           = useState(false);
  const [teams, setTeams]         = useState([]);
  const [current, setCurrent]     = useState(null);
  const [teamName, setTeamName]   = useState("");
  const [newPicked, setNewPicked] = useState(false);
  const [error, setError]         = useState(null);
  const [saving, setSaving]       = useState(false);
  const inFlight = useRef(false);

  useEffect(() => {
    let live = true;
    setCurrent(null);
    Promise.resolve(supabase.from("teams").select("id,name").order("name"))
      .then(({ data, error: e }) => { if (live && !e && Array.isArray(data)) setTeams(data); })
      .catch(() => {});
    fetch(`/api/agent-configs?agent_id=${encodeURIComponent(agent.id)}&teams=1`)
      .then(r => (r.ok ? r.json() : null))
      .then(json => { if (live && json && Array.isArray(json.teams)) setCurrent(json.teams[0]?.name ?? null); })
      .catch(() => {});
    return () => { live = false; };
  }, [agent.id]);

  async function save(team) {
    if (inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/agent-configs", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ action: "add_agent_to_team", agent_id: agent.id, team }) });
      if (res.status === 200) {
        const out = await res.json();
        setCurrent(out.team.name);
        // FEATURE: AGT-402 — tell the badge heading (AgentFacts useTeamName) the team changed, so it follows without a reload
        window.dispatchEvent(new CustomEvent("db-team-changed", { detail: { agentId: agent.id, name: out.team.name } }));
        setTeams(ts => (ts.some(t => t.id === out.team.id) ? ts : [...ts, { id: out.team.id, name: out.team.name }].sort((a, b) => a.name.localeCompare(b.name))));
        setTeamName("");
        setNewPicked(false);
        setOpen(false);
        return;
      }
      setError("Couldn’t save the team. Try again.");
    } catch {
      setError("Couldn’t save the team. Try again.");
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  function saveTyped(fromEnter) {
    const typed = teamName.trim();
    if (typed) { save({ name: typed }); return; }
    if (fromEnter) setError("Enter a team name");
  }

  const input = (
    <input
      type="text"
      value={teamName}
      placeholder="Team name"
      maxLength={60}
      disabled={saving}
      onChange={e => { setTeamName(e.target.value); setError(null); setNewPicked(true); }}
      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); saveTyped(true); } }}
      onBlur={() => saveTyped(false)}
      style={{ width:"100%", boxSizing:"border-box", background:T.cardAlt, border:`1px solid ${T.line}`, padding:"6px 10px", color:T.ink, fontFamily:body, outline:"none", fontSize: isMobile ? 16 : 13 }}
    />
  );

  return (
    <div style={{position:"relative",display:"inline-block"}}>
      {/* AGT-386 round 2 (John, 2026-10-05): the button stays but is switched off and grayed out until the team drawer is redesigned. */}
      <button disabled title="Coming soon" onClick={() => setOpen(o => !o)} style={{...TEAM_GHOST, color:T.muted, opacity:0.5, cursor:"not-allowed"}}>{current || "Add to a team"}</button>
      {open && (
        <div style={{position:"absolute",top:"100%",left:0,marginTop:4,background:T.card,border:`1px solid ${T.line}`,padding:10,textAlign:"left",minWidth:180,zIndex:2}}>
          {teams.length > 0 ? (
            <>
              {teams.map(t => (
                <label key={t.id} style={TEAM_ROW}>
                  <input type="radio" name={`team-${agent.id}`} checked={!newPicked && current === t.name} disabled={saving} onChange={() => { setNewPicked(false); save({ id: t.id }); }} style={{accentColor:T.brass}}/>
                  {t.name}
                </label>
              ))}
              <label style={TEAM_ROW}>
                <input type="radio" name={`team-${agent.id}`} checked={newPicked} disabled={saving} onChange={() => setNewPicked(true)} style={{accentColor:T.brass}}/>
                New team
              </label>
              <div style={{marginLeft:22}}>{input}</div>
            </>
          ) : (
            <>
              <div style={TEAM_FIELD_LABEL}>Team name</div>
              {input}
            </>
          )}
          {error && <div style={{fontFamily:body,fontSize:12,color:T.flag,marginTop:6}}>{error}</div>}
        </div>
      )}
    </div>
  );
}

// FEATURE: AGT-334 — the ID Badge / persona actions. One component, two mounts (desktop card, mobile
// persona block). "+ Add Training" on trainable agents (the Training tab, the Roster button's
// destination); on private agents only (isPrivateAgent reads the agent's own row — Rule #1), the
// team picker (AGT-386) and the Connect to AI button, which names no agent (AGT-386). Styles:
// STYLE-GUIDE §7 Primary CTA and Secondary/ghost, sized for the card.
function BadgeActions({ agent, onAddTraining, onConnect, style, align = "right" }) {
  return (
    <div style={style}>
      {agent.trainable && (
        <button onClick={onAddTraining} style={{background:`linear-gradient(135deg, ${T.brass}, ${T.brassDeep})`,border:"none",color:T.navy,padding:"6px 12px",fontFamily:display,fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Add Training</button>
      )}
      {isPrivateAgent(agent) && <TeamPicker agent={agent}/>}
      {isPrivateAgent(agent) && (
        <button onClick={onConnect} style={TEAM_GHOST}>Connect to AI</button>
      )}
      {isPrivateAgent(agent) && <ConnectionStatus agentId={agent.id} align={align}/>}
    </div>
  );
}

// FEATURE: AGT-397 — the Profile tab's cards, each defined once here so the Current arrangement
// (ProfileTab) and the Proposed arrangement's Future View render the same component, never a copy.

// Compensation card
function CompensationCard({ agent, tight = false }) {
  const fmt = fmt$;
  return (
        <div style={{background:T.card,border:`1px solid ${T.line}`,padding:"14px 18px",position:"relative"}}>
          <Corners/>
          <div style={{fontFamily:mono,fontSize:9,color:T.brassDeep,textTransform:"uppercase",letterSpacing:1.5,fontWeight:600,marginBottom:8}}>Compensation · FY2026 · The Ledger</div>
          <div style={{display:"flex",justifyContent:tight?"flex-start":"space-between",gap:tight?28:undefined,marginBottom:8}}>
            <div>
              <div style={{fontFamily:body,fontSize:8.5,color:T.muted,textTransform:"uppercase",letterSpacing:1.2,fontWeight:600,marginBottom:1}}>Salary Equiv.</div>
              <div style={{fontFamily:display,fontSize:19,fontWeight:600,color:T.navy}}>{agent.salary===0?"Free":fmt(agent.salary)}</div>
            </div>
            <div style={{textAlign:tight?"left":"right"}}>
              <div style={{fontFamily:body,fontSize:8.5,color:T.muted,textTransform:"uppercase",letterSpacing:1.2,fontWeight:600,marginBottom:1}}>Yearly Value</div>
              <div style={{fontFamily:display,fontSize:19,fontWeight:600,color:T.moss}}>{agent.value===0?"Demo":fmt(agent.value)}</div>
            </div>
          </div>
          {[["Hourly rate","$"+agent.hourly],["Hours / report",agent.reportHrs+"h"],["Cost / report",agent.reportCost===0?"Free":"$"+agent.reportCost],["Revenue model",agent.revenueModel||"—"]].map(([k,v])=>(
            <div key={k} style={{display:"flex",justifyContent:tight?"flex-start":"space-between",gap:tight?12:undefined,padding:"4px 0",borderBottom:`1px solid ${T.lineSoft}`,fontSize:11}}>
              <span style={{color:T.mutedDeep,...(tight?{minWidth:110,flexShrink:0}:null)}}>{k}</span>
              <span style={{fontFamily:mono,fontSize:10.5,color:T.ink}}>{v}</span>
            </div>
          ))}
          <div style={{marginTop:7,fontFamily:body,fontSize:10,color:T.muted,fontStyle:"italic"}}><strong style={{fontStyle:"normal"}}>Mock data.</strong> Live billing in v5.</div>
        </div>
  );
}

// Readiness score
function ReadinessCard({ layers, readiness }) {
  const rc = readinessColor;
  return (
        <div style={{background:T.navy,padding:"14px 18px",position:"relative",border:`1px solid rgba(182,135,58,.3)`}}>
          <Corners color={T.brass}/>
          <div style={{fontFamily:mono,fontSize:8.5,color:T.brassLight,textTransform:"uppercase",letterSpacing:1.8,fontWeight:600,marginBottom:7}}>Agent Readiness Score</div>
          <div style={{display:"flex",alignItems:"flex-end",gap:12,marginBottom:9}}>
            <div style={{fontFamily:display,fontSize:44,fontWeight:700,color:rc(readiness),lineHeight:1}}>{readiness}</div>
            <div style={{paddingBottom:4}}>
              <div style={{fontFamily:mono,fontSize:10,color:rc(readiness),fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>{readinessLabel(readiness)}</div>
              <div style={{fontFamily:body,fontSize:10,color:"#8fa3bf",marginTop:1}}>weighted composite · 5 layers</div>
            </div>
          </div>
          <div style={{height:6,background:"rgba(255,255,255,.1)",marginBottom:12}}>
            <div style={{height:"100%",width:`${readiness}%`,background:rc(readiness)}}/>
          </div>
          {layers.map(l=>(
            <div key={l.num} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
              <div style={{fontFamily:mono,fontSize:8,color:"#8fa3bf",width:14,flexShrink:0}}>{l.num}</div>
              <div style={{flex:1}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                  <span style={{fontFamily:body,fontSize:10,color:"#f8f2e2"}}>{l.label}</span>
                  <span style={{fontFamily:mono,fontSize:9,color:rc(l.s),fontWeight:700}}>{l.s}</span>
                </div>
                <div style={{height:3,background:"rgba(255,255,255,.08)"}}>
                  <div style={{height:"100%",width:`${l.s}%`,background:rc(l.s)}}/>
                </div>
              </div>
              <div style={{fontFamily:mono,fontSize:7.5,color:"#8fa3bf",width:50,flexShrink:0,textAlign:"right",fontStyle:"italic"}}>{l.tab}</div>
            </div>
          ))}
        </div>
  );
}

// Intelligence config
function IntelConfigCard({ agent, layers, isMobile, proposed = false }) {
  const rc = readinessColor;
  return (
        <div style={{background:T.card,border:`1px solid ${T.line}`,padding:"13px 15px",position:"relative"}}>
          <Corners/>
          <div style={{fontFamily:mono,fontSize:9,color:T.brassDeep,textTransform:"uppercase",letterSpacing:1.5,fontWeight:600,marginBottom:4}}>Intelligence Configuration</div>
          <div style={{fontFamily:display,fontSize:14,fontWeight:600,color:T.navy,marginBottom:10}}>How {agent.name.split(" ")[0]}'s prompt is assembled</div>
          {/* FEATURE: PE-17 — mobile: 3-col wrap grid instead of a squeezed flex row */}
          <div style={{...(isMobile ? {display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6} : {display:"flex",alignItems:"stretch"}),marginBottom:10}}>
            {layers.map((l,i)=>(
              <div key={l.num} style={{flex:1,textAlign:"center",padding:"8px 4px",background:`${rc(l.s)}12`,border:`1px solid ${rc(l.s)}35`,borderRight:i<layers.length-1?"none":undefined}}>
                <div style={{fontFamily:mono,fontSize:9,fontWeight:700,color:rc(l.s),marginBottom:2}}>{l.num}</div>
                <div style={{fontFamily:body,fontSize:8.5,color:T.navy,lineHeight:1.2,marginBottom:3}}>{l.label}</div>
                <div style={{fontFamily:mono,fontSize:8,color:rc(l.s),fontWeight:700}}>{l.s}/100</div>
              </div>
            ))}
          </div>
          <div style={{fontFamily:body,fontSize:11,color:T.mutedDeep,lineHeight:1.5,fontStyle:"italic"}}>{proposed ? "Configure each layer on the Profile and Training pages." : "Configure each layer in Resume, Training, and Playbook tabs."}</div>
        </div>
  );
}

// Quick stats — FEATURE: AGT-397 — one component; show = "all" (Current), "documents" (Proposed
// Profile), "parked" (Future View: Skill + Reports Run, Situational Awareness, Skill Level)
function QuickStatsCard({ agent, show = "all" }) {
  return (
        <div style={{background:T.card,border:`1px solid ${T.line}`,padding:"13px 15px",position:"relative"}}>
          <Corners/>
          <div style={{fontFamily:mono,fontSize:9,color:T.brassDeep,textTransform:"uppercase",letterSpacing:1.5,fontWeight:600,marginBottom:10}}>Quick Stats</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}}>
            {[["Skill",`${agent.skill}/100`,skillLabel(agent.skill),"#886224"],["Documents",agent.docs ?? "—","training docs",T.navy],["Reports Run","—","mock data",T.moss]].filter(([l]) => show === "all" || (show === "documents" ? l === "Documents" : l !== "Documents")).map(([l,v,s,c])=>(
              <div key={l}>
                <div style={{fontFamily:body,fontSize:8,color:T.muted,textTransform:"uppercase",letterSpacing:1.2,fontWeight:600,marginBottom:1}}>{l}</div>
                <div style={{fontFamily:display,fontSize:18,fontWeight:600,color:c,lineHeight:1}}>{v}</div>
                <div style={{fontFamily:mono,fontSize:8.5,color:T.muted,marginTop:1}}>{s}</div>
              </div>
            ))}
          </div>
          {show !== "documents" && (<>
          <div style={{borderTop:`1px solid ${T.lineSoft}`,paddingTop:10,marginBottom:8}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
              <div style={{fontFamily:body,fontSize:8.5,color:T.muted,textTransform:"uppercase",letterSpacing:1.2,fontWeight:600}}>Situational Awareness</div>
              <div style={{fontFamily:display,fontSize:15,fontWeight:600,color:agent.situational>=30?T.brass:T.muted}}>{agent.situational}%</div>
            </div>
            <div style={{height:4,background:`${T.lineSoft}`,borderRadius:2}}>
              <div style={{height:"100%",width:`${agent.situational}%`,background:agent.situational>=30?T.brass:T.muted,borderRadius:2}}/>
            </div>
          </div>
          <div>
            <div style={{fontFamily:body,fontSize:8.5,color:T.muted,textTransform:"uppercase",letterSpacing:1.2,fontWeight:600,marginBottom:6}}>Skill Level</div>
            <SkillBar skill={agent.skill} color={agent.color}/>
          </div>
          </>)}
        </div>
  );
}

// FEATURE: LOG-143 (b) — Report Card. Same card + Corners pattern as its siblings;
// no new token, no new visual rule.
function ReportCardPanel({ agent, capabilities, tight = false, sample = false }) {
  // FEATURE: LOG-143 (b) — the Report Card panel's own load. null = still loading, so the card
  // shows a loading state rather than flashing "No runs judged yet" at an agent that has some
  // (STANDARDS.md Section 5, Supabase Operations: loading state shown while data fetches).
  const [reportCard, setReportCard] = useState(null);
  const [reportCardLoaded, setReportCardLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setReportCardLoaded(false);
    setReportCard(null);
    fetchReportCard(agent.id)
      .then(r => { if (!cancelled) { setReportCard(r); setReportCardLoaded(true); } })
      // Never block the user (STANDARDS.md Section 5): a failed rollup read leaves the card in its
      // honest empty state, it does not break the Profile tab.
      .catch(err => { console.error("FEATURE: LOG-143 — failed to load the Bench Report Card", err); if (!cancelled) setReportCardLoaded(true); });
    return () => { cancelled = true; };
  }, [agent.id]);
  // The Skill Profiles this screen already lists (SK-06's Capabilities card, the same rows the
  // Configure → Resume tab edits) are what resolves `lowest_skill`'s slug to a name.
  const reportCardView = reportCardLines(reportCard, capabilities.flatMap(c => c.skillProfiles || []));

  return (
        <div style={{background:T.card,border:`1px solid ${T.line}`,padding:"13px 15px",position:"relative"}}>
          <Corners/>
          <FeatureBadge id="LOG-143" />
          <div style={{fontFamily:mono,fontSize:9,color:T.brassDeep,textTransform:"uppercase",letterSpacing:1.5,fontWeight:600,marginBottom:10}}><span>Report Card</span>{sample && reportCardLoaded && reportCardView.empty && <SampleTag/>}</div>
          {!reportCardLoaded ? (
            <div style={{border:`1px dashed ${T.lineSoft}`,padding:"16px 12px",textAlign:"center"}}>
              <div style={{fontFamily:body,fontSize:11,color:T.muted,fontStyle:"italic"}}>Loading…</div>
            </div>
          ) : reportCardView.empty && sample ? (
            <>
              {/* AGT-405 — an agent with no judged runs shows a labeled sample, so the card's purpose reads */}
              {[["Runs judged","12"],["Accuracy","4.2 / 5"],["Completeness","3.9 / 5"],["Tone","4.5 / 5"],["Skill to improve","Citing sources"]].map(([k,v])=>(
                <div key={k} style={{display:"flex",justifyContent:"flex-start",gap:12,padding:"4px 0",borderBottom:`1px solid ${T.lineSoft}`,fontSize:11}}>
                  <span style={{color:T.mutedDeep,flexShrink:0,minWidth:110}}>{k}</span>
                  <span style={{fontFamily:mono,fontSize:10.5,color:T.ink}}>{v}</span>
                </div>
              ))}
              <div style={{marginTop:7,fontFamily:body,fontSize:10,color:T.muted,fontStyle:"italic"}}>{reportCardView.emptyText}</div>
            </>
          ) : reportCardView.empty ? (
            <div style={{border:`1px dashed ${T.lineSoft}`,padding:"16px 12px",textAlign:"center"}}>
              <div style={{fontFamily:body,fontSize:11,color:T.muted,fontStyle:"italic"}}>{reportCardView.emptyText}</div>
            </div>
          ) : (
            <>
              {[["Runs judged", String(reportCardView.runsJudged)],
                ...reportCardView.dimensions.map(d => [d.label, d.unknownText ? `${d.scoreText} · ${d.unknownText}` : d.scoreText]),
                ["Skill to improve", reportCardView.skillToImproveText]].map(([k,v])=>(
                <div key={k} style={{display:"flex",justifyContent:tight?"flex-start":"space-between",gap:tight?12:10,padding:"4px 0",borderBottom:`1px solid ${T.lineSoft}`,fontSize:11}}>
                  <span style={{color:T.mutedDeep,flexShrink:0,...(tight?{minWidth:110}:null)}}>{k}</span>
                  <span style={{fontFamily:mono,fontSize:10.5,color:T.ink,textAlign:tight?"left":"right"}}>{v}</span>
                </div>
              ))}
            </>
          )}
        </div>
  );
}

// ── Active Work Assignments ──
function WorkAssignments({ agent, sample = false }) {
  const realTasks     = AGENT_TASKS[agent.id]     || [];
  const realCompleted = AGENT_COMPLETED[agent.id] || [];
  // AGT-405 — Future Controls: an agent with no work yet shows one labeled sample of each, so the section's purpose reads
  const useSample     = sample && realTasks.length === 0 && realCompleted.length === 0;
  const agentTasks    = useSample ? [{ id:"sample-1", title:"Review the Q4 janitorial bids", type:"Bid review", due:"Oct 14", preview:"Compares three bids against the scope and flags price gaps.", status:"in-progress", priority:"Normal" }] : realTasks;
  const agentCompleted= useSample ? [{ id:"sample-2", title:"Summary of September contract renewals", type:"Report", completedOn:"Sep 30" }] : realCompleted;

  const STATUS_S = {
    "needs-review":   {bg:"rgba(90,117,56,.12)",  color:T.moss,       border:"rgba(90,117,56,.3)",   label:"Needs Review"},
    "in-progress":    {bg:"rgba(182,135,58,.12)", color:T.brassDeep,  border:"rgba(182,135,58,.35)", label:"In Progress"},
    "pending":        {bg:"rgba(18,36,60,.07)",   color:T.mutedDeep,  border:T.lineSoft,             label:"Pending"},
    "awaiting-input": {bg:"rgba(182,135,58,.08)", color:T.brassDeep,  border:T.lineSoft,             label:"Awaiting Input"},
    "action-required":{bg:"rgba(168,51,25,.1)",   color:T.flag,       border:"rgba(168,51,25,.3)",   label:"Action Required"},
    "completed":      {bg:"rgba(90,117,56,.08)",  color:T.moss,       border:"rgba(90,117,56,.2)",   label:"Completed"},
  };
  const PRIORITY_S = {
    "High":  {color:T.flag,       bg:"rgba(168,51,25,.08)",  border:"rgba(168,51,25,.25)"},
    "Normal":{color:T.muted,      bg:"rgba(18,36,60,.06)",   border:T.lineSoft},
    "Low":   {color:T.muted,      bg:"rgba(120,109,82,.08)", border:T.line},
  };

  return (
    <div style={{marginTop:18}}>
      <div style={{fontFamily:mono,fontSize:9,fontWeight:700,color:T.brassDeep,letterSpacing:2,textTransform:"uppercase",marginBottom:10}}><span>Active Work Assignments</span>{useSample && <SampleTag/>}</div>
      {agentTasks.length===0 ? (
        <div style={{background:T.card,border:`1px dashed ${T.lineSoft}`,padding:"24px",textAlign:"center",marginBottom:10}}>
          <div style={{fontFamily:display,fontSize:14,color:T.muted,fontStyle:"italic"}}>No active assignments for {agent.name.split(" ")[0]} right now.</div>
        </div>
      ) : agentTasks.map(t=>{
        const s=STATUS_S[t.status]||STATUS_S["pending"];
        const p=PRIORITY_S[t.priority]||PRIORITY_S["Normal"];
        return(
          <div key={t.id} style={{background:T.card,border:`1.5px solid ${T.line}`,overflow:"hidden",marginBottom:10,position:"relative",transition:"border-color .15s"}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=T.brass}
            onMouseLeave={e=>e.currentTarget.style.borderColor=T.line}>
            <div style={{padding:"13px 16px",display:"flex",alignItems:"flex-start",gap:12}}>
              <AgentAvatar who={agent.id} size={36} ring={true} />
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontFamily:display,fontSize:14,fontWeight:600,color:T.navy,marginBottom:4,lineHeight:1.2}}>{t.title}</div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5,flexWrap:"wrap"}}>
                  <span style={{fontFamily:mono,fontSize:8,color:T.muted}}>{t.type}</span>
                  <span style={{color:T.lineSoft}}>·</span>
                  <span style={{fontFamily:mono,fontSize:8,color:T.muted}}>Due {t.due}</span>
                </div>
                <div style={{fontSize:12,color:T.mutedDeep,fontStyle:"italic",lineHeight:1.5}}>{t.preview}</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5,flexShrink:0}}>
                <span style={{fontFamily:mono,fontSize:8,fontWeight:700,letterSpacing:.5,textTransform:"uppercase",padding:"2px 8px",background:s.bg,color:s.color,border:`1px solid ${s.border}`}}>{s.label}</span>
                <span style={{fontFamily:mono,fontSize:8,fontWeight:700,letterSpacing:.5,textTransform:"uppercase",padding:"2px 8px",background:p.bg,color:p.color,border:`1px solid ${p.border}`}}>{t.priority}</span>
              </div>
            </div>
            {t.status==="needs-review"&&(
              <div style={{borderTop:`1px solid ${T.line}`,padding:"9px 16px",background:T.cardAlt,display:"flex",gap:8,alignItems:"center"}}>
                <span style={{fontFamily:mono,fontSize:8.5,color:T.moss,fontWeight:700}}>● Ready for your review</span>
                <div style={{flex:1}}/>
                <button style={{background:T.moss,color:"#fff",border:"none",padding:"6px 14px",fontFamily:body,fontSize:11,fontWeight:700,cursor:"pointer"}}>Review & Approve</button>
                <button style={{background:"transparent",border:`1px solid ${T.line}`,color:T.mutedDeep,padding:"6px 12px",fontFamily:body,fontSize:11,cursor:"pointer"}}>Request Changes</button>
              </div>
            )}
          </div>
        );
      })}

      <div style={{fontFamily:mono,fontSize:9,fontWeight:700,color:T.muted,letterSpacing:2,textTransform:"uppercase",marginTop:16,marginBottom:8}}>Recently Completed</div>
      {agentCompleted.length===0 ? (
        <div style={{background:T.card,border:`1px dashed ${T.lineSoft}`,padding:"18px",textAlign:"center"}}>
          <div style={{fontFamily:display,fontSize:13,color:T.muted,fontStyle:"italic"}}>No completed projects yet</div>
        </div>
      ) : agentCompleted.map(t=>(
        <div key={t.id} style={{background:T.card,border:`1px solid ${T.line}`,padding:"10px 16px",display:"flex",alignItems:"center",gap:12,marginBottom:6,opacity:.85}}>
          <span style={{fontFamily:mono,fontSize:10,color:T.moss}}>✓</span>
          <div style={{flex:1}}>
            <div style={{fontFamily:display,fontSize:13,fontWeight:600,color:T.navy}}>{t.title}</div>
            <div style={{fontFamily:mono,fontSize:8,color:T.muted,marginTop:2}}>{t.type} · Completed {t.completedOn}</div>
          </div>
          <button style={{background:"transparent",border:`1px solid ${T.line}`,color:T.muted,padding:"3px 10px",fontFamily:mono,fontSize:8,letterSpacing:.5,textTransform:"uppercase",cursor:"pointer"}}>View</button>
        </div>
      ))}
    </div>
  );
}

// Stat badges — FEATURE: AGT-397 — the page header's Situational Awareness / Readiness / Skill trio;
// mobile = the persona block's grid, desktop = the page header's divided row
function StatBadges({ agent, readiness, isMobile }) {
  if (isMobile) return (
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                  <div>
                    <div style={{fontFamily:mono,fontSize:8,color:T.muted,textTransform:"uppercase",letterSpacing:1.2,marginBottom:1}}>Situational Awareness</div>
                    <div style={{fontFamily:display,fontSize:18,fontWeight:700,color:agent.situational>=30?T.brass:T.muted,lineHeight:1}}>{agent.situational}%</div>
                  </div>
                  <div>
                    <div style={{fontFamily:mono,fontSize:8,color:T.muted,textTransform:"uppercase",letterSpacing:1.2,marginBottom:1}}>Readiness</div>
                    <div style={{fontFamily:display,fontSize:18,fontWeight:700,color:readinessColor(readiness),lineHeight:1}}>
                      {readiness}<span style={{fontFamily:mono,fontSize:9,color:T.muted,fontWeight:400}}>/100</span>
                    </div>
                  </div>
                  <div>
                    <div style={{fontFamily:mono,fontSize:8,color:T.muted,textTransform:"uppercase",letterSpacing:1.2,marginBottom:1}}>Skill</div>
                    <div style={{fontFamily:display,fontSize:18,fontWeight:700,color:T.brassDeep,lineHeight:1}}>
                      {agent.skill}<span style={{fontFamily:mono,fontSize:9,color:T.muted,fontWeight:400}}>/100</span>
                    </div>
                  </div>
                </div>
  );
  return (
                <div style={{display:"flex",gap:16,alignItems:"center"}}>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontFamily:mono,fontSize:8,color:T.muted,textTransform:"uppercase",letterSpacing:1.2,marginBottom:1}}>Situational Awareness</div>
                    <div style={{fontFamily:display,fontSize:18,fontWeight:700,color:agent.situational>=30?T.brass:T.muted,lineHeight:1}}>{agent.situational}%</div>
                  </div>
                  <div style={{width:1,height:30,background:T.lineSoft}}/>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontFamily:mono,fontSize:8,color:T.muted,textTransform:"uppercase",letterSpacing:1.2,marginBottom:1}}>Readiness</div>
                    <div style={{fontFamily:display,fontSize:18,fontWeight:700,color:readinessColor(readiness),lineHeight:1}}>
                      {readiness}<span style={{fontFamily:mono,fontSize:9,color:T.muted,fontWeight:400}}>/100</span>
                    </div>
                  </div>
                  <div style={{width:1,height:30,background:T.lineSoft}}/>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontFamily:mono,fontSize:8,color:T.muted,textTransform:"uppercase",letterSpacing:1.2,marginBottom:1}}>Skill</div>
                    <div style={{fontFamily:display,fontSize:18,fontWeight:700,color:T.brassDeep,lineHeight:1}}>
                      {agent.skill}<span style={{fontFamily:mono,fontSize:9,color:T.muted,fontWeight:400}}>/100</span>
                    </div>
                  </div>
                </div>
  );
}

// AGT-404 — a line of text that looks as it always did and edits in place on click; it saves on blur or
// Enter (Escape cancels), through the same single identity save as the Biography card
function InlineText({ value, field, agent, onSaved, showToast, style }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(value);
  const [saving, setSaving]   = useState(false);
  const cancelled = useRef(false);
  const commit = async () => {
    setEditing(false);
    const next = draft.trim();
    if (cancelled.current || !next || next === value) { cancelled.current = false; setDraft(value); return; }
    setSaving(true);
    try { const saved = await saveIdentityFields(agent, { [field]: next }); onSaved && onSaved(saved); showToast("Saved ✦"); }
    catch (e) { setDraft(value); showToast("Save failed: " + e.message, "⚠"); }
    setSaving(false);
  };
  if (editing) return (
    <input autoFocus value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit}
      onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { cancelled.current = true; e.currentTarget.blur(); } }}
      style={{ ...style, width:"100%", boxSizing:"border-box", textAlign:"center", background:T.cardAlt, border:`1px solid ${T.lineSoft}`, outline:"none", padding:"2px 6px" }}/>
  );
  return <div onClick={() => { setDraft(value); setEditing(true); }} title="Click to edit" style={{ ...style, cursor:"text", opacity: saving ? .6 : 1 }}>{value}</div>;
}

// AGT-412 — a quip is stored with its own quote marks for the built-in agents and without for a created one;
// strip any surrounding pair so the page can wrap it in exactly one
const plainQuip = q => String(q).replace(/^["“”]+|["“”]+$/g, "");

// AGT-407 — true = the Proposed view is the only view; false = the Current / Proposed switch is back
const CURRENT_VIEW_RETIRED = true;

// FEATURE: sent-lens -- "Dim what stays in DeepBench": a per-browser switch on the Profile and Training tabs of a private
// agent. Elements an AI client never receives carry data-sent="no"; with the switch on they fade so the sent fields stand
// out. Off is the page as it was.
// Hidden for now (John): the switch, the dimming and every data-sent="no" mark stay in the code, so setting this to false brings the
// whole feature back. While hidden, a browser that had it switched on is not dimmed either.
const SENT_LENS_HIDDEN = true;
const SENT_LENS_KEY = "deepbench-sent-lens";
const SENT_LENS_CSS = '.sent-lens [data-sent="no"]{opacity:.38;transition:opacity .15s}';
function SentLensToggle({ on, onChange }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:14,padding:"8px 12px",background:T.card,border:`1px solid ${T.line}`}}>
      <button role="switch" aria-checked={on} aria-label="Dim what is not sent to AI clients" onClick={() => onChange(!on)}
        style={{width:34,height:18,borderRadius:9,border:`1px solid ${on ? T.moss : T.line}`,background:on ? T.moss : T.cardAlt,position:"relative",cursor:"pointer",padding:0,flexShrink:0}}>
        <span style={{position:"absolute",top:1,left:on ? 17 : 1,width:14,height:14,borderRadius:7,background:on ? "#fff" : T.muted,transition:"left .15s"}}/>
      </button>
      <span style={{fontFamily:body,fontSize:12,fontWeight:600,color:T.navy}}>Dim what stays in DeepBench</span>
      <span style={{fontFamily:body,fontSize:11,color:T.muted,fontStyle:"italic",flex:"1 1 200px"}}>{on ? "Dimmed fields are not sent to a connected AI client." : "Off: the page as it is today."}</span>
    </div>
  );
}

// FEATURE: PE-01 — Profile tab
// FEATURE: PE-08 — NIGP 2-col layout: ID Badge + Compensation left; Readiness + Intel Config + Quick Stats right
// ── Tab: Profile ──────────────────────────────────────────────────────────────
function ProfileTab({ agent, entries, layers, capabilities, isMobile, onAddTraining, onConnect, arrangement = "current", showToast, onIdentitySaved, onSkillChange, onCapabilityChange, onSkillAdded, onSkillRemoved, onCapabilityAdded, onCapabilityDeleted, onLevelSaved }) {
  const readiness = Math.round(layers.reduce((s,l)=>s+l.s,0)/layers.length);
  // FEATURE: AGT-397 — Proposed keeps only the ID badge + Capabilities left and Documents right; the
  // rest moves to the Future View tab
  const proposed  = arrangement === "proposed";

  // AGT-403 — the ID badge and Capabilities cards are defined once so Current (two columns) and
  // Proposed (one column, in John's order) place the same cards
  /* ID Badge card — FEATURE: PE-17 — redundant with the mobile persona block, desktop-only */
  const idBadge = !isMobile && (
        <div style={{background:T.card,border:`1px solid ${T.line}`,padding:"16px 14px 12px",textAlign:"center",position:"relative"}}>
          <Corners color={agent.color}/>
          <BadgeActions agent={agent} onAddTraining={onAddTraining} onConnect={onConnect} style={{position:"absolute",top:14,right:12,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}/>
          <div data-sent="no"><TeamHeading agentId={agent.id}/></div>
          <div style={{margin:"0 auto 12px",display:"flex",justifyContent:"center"}}>
            <AgentAvatar who={agent.id} size={92} ring={true} />
          </div>
          {proposed
            ? <InlineText value={agent.name} field="name" agent={agent} onSaved={onIdentitySaved} showToast={showToast} style={{fontFamily:display,fontSize:20,fontWeight:600,color:T.navy,marginBottom:3}}/>
            : <div style={{fontFamily:display,fontSize:20,fontWeight:600,color:T.navy,marginBottom:3}}>{agent.name}</div>}
          {proposed
            ? <InlineText value={agent.role} field="role" agent={agent} onSaved={onIdentitySaved} showToast={showToast} style={{fontFamily:body,fontSize:12,color:T.mutedDeep,fontStyle:"italic",marginBottom:2}}/>
            : <div style={{fontFamily:body,fontSize:12,color:T.mutedDeep,fontStyle:"italic",marginBottom:10}}>{agent.role}</div>}
          {proposed && <div data-sent="no" style={{fontFamily:body,fontSize:12,color:T.mutedDeep,fontStyle:"italic",marginBottom:10}}>Tenure · {agent.hiredOn}</div>}
          <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center",marginBottom:10}}>
            <span style={{fontFamily:mono,fontSize:8.5,padding:"2px 8px",background:"rgba(182,135,58,.1)",color:T.brassDeep,border:`1px solid rgba(182,135,58,.3)`}} data-sent="no">{agent.code}</span>
            {!proposed && <span style={{fontFamily:mono,fontSize:8.5,padding:"2px 8px",background:"rgba(90,117,56,.1)",color:T.moss,border:`1px solid rgba(90,117,56,.3)`,fontWeight:700}}>● ACTIVE</span>}
            {!proposed && agent.trainable&&<span style={{fontFamily:mono,fontSize:8.5,padding:"2px 8px",background:`${agent.color}18`,color:agent.color,border:`1px solid ${agent.color}40`,fontWeight:700}}>YOUR TRAINEE</span>}
          </div>
          
          <div data-sent="no">{proposed && <SkillLevelBar agent={agent} onSaved={onLevelSaved} showToast={showToast}/>}</div>
          {agent.quip && (
          <div data-sent="no" style={{fontFamily:display,fontStyle:"italic",fontSize:12,color:T.mutedDeep,background:`${T.moss}08`,border:`1px solid ${T.moss}25`,padding:"8px 12px",lineHeight:1.5}}>
            "{plainQuip(agent.quip)}"
          </div>
          )}
        </div>
  );

  /* FEATURE: SK-06 — Capabilities card */
  const capsCard = (
        <div style={{ background: T.card, border: `1px solid ${T.line}`, padding: "14px 16px", position: "relative" }}>
          <Corners />
          <FeatureBadge id="SK-06" />
          <div style={{ fontFamily: mono, fontSize: 9, color: T.brassDeep, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600, marginBottom: 10 }}>Capabilities</div>
          {proposed && <CapabilitiesGuide canAdd={isPrivateAgent(agent)} />}
          {capabilities.filter(c => !isConnectionCapability(c)).length === 0 ? (
            <div style={{ border: `1px dashed ${T.lineSoft}`, padding: "16px 12px", textAlign: "center" }}>
              <div style={{ fontFamily: body, fontSize: 11, color: T.muted, fontStyle: "italic" }}>{proposed && isPrivateAgent(agent) ? "No capabilities yet. Add one, then add Skills inside it." : "No capabilities assigned."}</div>
            </div>
          ) : (
            capabilities.filter(c => !isConnectionCapability(c)).map(cap => {
              const TYPE_CHIP = {
                intent:   { bg: "rgba(182,135,58,.1)",  color: T.brassDeep, border: "rgba(182,135,58,.3)", label: "INTENT"   },
                format:   { bg: "rgba(90,117,56,.08)",  color: T.moss,      border: "rgba(90,117,56,.25)", label: "FORMAT"   },
                knowledge:{ bg: "rgba(18,36,60,.07)",   color: T.mutedDeep, border: T.lineSoft,            label: "KNOWLEDGE"},
                behavior: { bg: "rgba(120,109,82,.08)", color: T.mutedDeep, border: T.lineSoft,            label: "BEHAVIOR" },
                identity: { bg: "rgba(168,51,25,.06)",  color: T.flag,      border: "rgba(168,51,25,.2)",  label: "IDENTITY" },
                guardrails:{ bg: "rgba(168,51,25,.06)", color: T.flag,      border: "rgba(168,51,25,.2)",  label: "GUARDRAILS" },
              };
              return (
                <div key={cap.slug} style={proposed ? { marginBottom: 12, padding: "12px 14px", background: T.cardAlt, border: `1px solid ${T.line}` } : { marginBottom: 12 }}>
                  {/* FEATURE: AGT-413 — Proposed: editable capability name and description; Current keeps the plain heading */}
                  {proposed ? <CapabilityHeader cap={cap} showToast={showToast} onSaved={onCapabilityChange} onDeleted={onCapabilityDeleted} /> : (<>
                    <div style={{ fontFamily: body, fontSize: 12, fontWeight: 600, color: T.navy, marginBottom: 2 }}>{cap.name}</div>
                    {cap.description && (
                      <div style={{ fontFamily: body, fontSize: 10, color: T.muted, fontStyle: "italic", marginBottom: 8, lineHeight: 1.4 }}>{cap.description}</div>
                    )}
                  </>)}
                  {/* FEATURE: AGT-399 / AGT-409 / AGT-413 — Proposed: every Skill under its fixed type header, fields always shown, editable in place */}
                  {proposed ? (
                    <CapabilityDrawer count={cap.skillProfiles.length}>
                    {cap.skillProfiles.length === 0
                      ? <div style={{ border: `1px dashed ${T.line}`, padding: "10px 12px", fontFamily: body, fontSize: 11.5, color: T.muted, fontStyle: "italic" }}>No Skills yet. Add one to tell this capability what to do.</div>
                      : SKILL_TYPES.flatMap(([typeSlug]) => cap.skillProfiles
                          .filter(sp => (sp.skill_type_slug || "intent") === typeSlug)
                          .map(sp => <SkillEditorRow key={sp.slug} sp={sp} chip={TYPE_CHIP[typeSlug] || TYPE_CHIP.intent} showToast={showToast} onSaved={onSkillChange} capSlug={cap.slug} onRemoved={onSkillRemoved} />))}
                    {/* FEATURE: AGT-414 — type in a new Skill and attach it to this capability */}
                    <AddSkillForm capSlug={cap.slug} showToast={showToast} onAdded={onSkillAdded} />
                    </CapabilityDrawer>
                  ) : cap.skillProfiles.map(sp => {
                    const chip = TYPE_CHIP[sp.skill_type_slug] || TYPE_CHIP.intent;
                    return <SkillRow key={sp.slug} sp={sp} chip={chip} />;
                  })}
                </div>
              );
            })
          )}
          {/* FEATURE: add-capability -- a private agent's user adds a capability, then Skills inside it */}
          {proposed && isPrivateAgent(agent) && <AddCapabilityForm agentId={agent.id} showToast={showToast} onAdded={onCapabilityAdded} />}
        </div>
  );

  // AGT-403 — Proposed: one column, top to bottom — badge, Identity, Capabilities, Role prompts,
  // Playbook (Resume and Playbook are sections here, not tabs; Quick Stats moved to Future Controls)
  if (proposed) return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {idBadge}
      <IdentityEditor agent={agent} onSaved={onIdentitySaved} showToast={showToast}/>
      {capsCard}
      <ResumeTab agent={agent} showToast={showToast} arrangement={arrangement} part="prompts"/>
      <PlaybookTab agent={agent} showToast={showToast} plain/>
    </div>
  );

  return (
    <>
    <div style={{display:"grid",gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",gap:18,alignItems:"start"}}>

      {/* ── Left column: ID Badge + Compensation ── */}
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {idBadge}
        {capsCard}
        <CompensationCard agent={agent}/>
      </div>

      {/* ── Right column: Readiness + Intel Config + Quick Stats ── */}
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <ReadinessCard layers={layers} readiness={readiness}/>
        <IntelConfigCard agent={agent} layers={layers} isMobile={isMobile}/>
        <QuickStatsCard agent={agent}/>
        <ReportCardPanel agent={agent} capabilities={capabilities}/>
      </div>
    </div>

    <WorkAssignments agent={agent}/>
    </>
  );
}

// FEATURE: AGT-344 — the note form's label and field, shared with the file edit form's text box
const noteLabelStyle = { fontFamily: body, fontSize: 12, color: T.mutedDeep, marginBottom: 4 };
const noteFieldStyle = { display: "block", width: "100%", boxSizing: "border-box", border: `1px solid ${T.line}`, background: T.white, padding: "7px 10px", fontFamily: body, fontSize: 13, color: T.ink, outline: "none" };

// FEATURE: AGT-344 — Type a note: title + text, for add and for edit
function NoteForm({ firstName, form, setForm, saving, onCancel, onSave }) {
  const blocked = !form.title.trim() || !form.text.trim() || saving;
  return (
    <div style={{ background: T.card, border: `1px solid ${T.line}`, padding: 14 }}>
      <div style={noteLabelStyle}>Title</div>
      <input
        value={form.title}
        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
        style={{ ...noteFieldStyle, marginBottom: 10 }}
      />
      <div style={noteLabelStyle}>What {firstName} should know or do</div>
      <textarea
        value={form.text}
        onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
        style={{ ...noteFieldStyle, minHeight: 64, resize: "vertical", marginBottom: 10 }}
      />
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ fontFamily: body, fontSize: 12, color: T.muted, flex: 1 }}>{countLine(form.text)}</div>
        <button onClick={onCancel} style={{ background: "transparent", border: `1px solid ${T.line}`, color: T.mutedDeep, padding: "7px 16px", fontFamily: body, fontSize: 13, cursor: "pointer" }}>Cancel</button>
        <button
          onClick={onSave}
          disabled={blocked}
          style={{ background: T.navy, border: `1px solid ${T.navy}`, color: T.brassLight, padding: "7px 16px", fontFamily: body, fontSize: 13, fontWeight: 600, cursor: blocked ? "not-allowed" : "pointer", opacity: blocked ? .5 : 1 }}
        >Save note</button>
      </div>
    </div>
  );
}

// FEATURE: PE-10 — Add Courses inline sub-view
function AddCourseView({ agent, existingEntry = null, addState, setAddState, addProgress, setAddProgress,
  addFile, setAddFile, addExtracted, setAddExtracted, addWordCount, setAddWordCount,
  addExtractOpen, setAddExtractOpen, addForm, setAddForm, addFileRef,
  onCancel, onSaved, showToast }) {

  const agentId  = agent.id;
  const locked   = existingEntry ? false : addState !== "ready";
  const isSaving = addState === "saving";
  const categories = agentId === "brent"
    ? [...STANDARD_CATEGORIES, ...BRENT_CATEGORIES]
    : STANDARD_CATEGORIES;

  const handleFile = async (file) => {
    if (!file) return;
    setAddState("uploading"); setAddProgress(0); setAddFile(file);
    let prog = 0;
    const ticker = setInterval(() => {
      prog += Math.random() * 18 + 8;
      if (prog >= 90) { clearInterval(ticker); prog = 90; }
      setAddProgress(Math.min(90, prog));
    }, 180);
    const result = await extractTextFromFile(file);
    clearInterval(ticker); setAddProgress(100);
    if (result.error || !result.text) {
      setAddState("idle");
      showToast(result.error || "Could not extract text", "⚠");
      return;
    }
    setAddExtracted(result.text); setAddWordCount(result.wordCount);
    await new Promise(r => setTimeout(r, 400));
    setAddState("ready");
    showToast("✨ Claude is analyzing your document…", "✨");
    const meta = await generateMetadata(file.name, result.text, agentId);
    if (meta) {
      setAddForm(f => ({
        ...f,
        title:        str(meta.title)        || f.title,
        category:     str(meta.category)     || f.category,
        jurisdiction: str(meta.jurisdiction) || f.jurisdiction,
        priority:     typeof meta.priority === "number" ? Math.min(100, Math.max(0, meta.priority)) : f.priority,
        triggers:     Array.isArray(meta.triggers) ? meta.triggers : f.triggers,
      }));
      showToast("Metadata generated — review before saving");
    } else {
      showToast("Could not auto-generate metadata — fill in manually", "⚠");
    }
  };

  const toggleTrigger = (id) => {
    if (id === "all") {
      setAddForm(f => ({ ...f, triggers: f.triggers.includes("all") ? [] : ["all"] }));
      return;
    }
    setAddForm(f => {
      const base = f.triggers.filter(t => t !== "all");
      return { ...f, triggers: base.includes(id) ? base.filter(t => t !== id) : [...base, id] };
    });
  };

  const handleSave = async () => {
    if (!addForm.title) { showToast("Title is required", "⚠"); return; }
    if (!existingEntry && !addExtracted) { showToast("Title and document are required", "⚠"); return; }
    // FEATURE: AGT-344 — the file's text is editable; it is never saved blank
    const editText = addForm.content || "";
    if (existingEntry && !editText.trim()) { showToast("Text is required", "⚠"); return; }
    setAddState("saving");
    try {
      if (existingEntry) {
        // FEATURE: PE-11 — Edit mode: PATCH metadata; AGT-344 — the text goes only when it changed
        const fields = {
          title:          addForm.title,
          category:       addForm.category,
          jurisdiction:   addForm.jurisdiction,
          teaching_note:  addForm.teaching_note || null,
          triggers:       addForm.triggers,
          priority:       addForm.priority,
        };
        if (editText !== existingEntry.content) fields.content = editText;
        await apiUpdateEntry(existingEntry.id, fields);
      } else {
        // Existing add flow — unchanged
        const res = await fetch("/api/load-entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...addForm,
            content: addExtracted,
            tenant_id: TENANT_ID,
            agent_id: agentId,
            teaching_note: addForm.teaching_note || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) { showToast(data.error || "Save failed", "⚠"); setAddState("ready"); return; }
      }
      // FEATURE: AGT-344 — every save ends in a reload: the list shows the saved rows, real ids and all
      await onSaved();
    } catch (err) {
      showToast("Network error: " + err.message, "⚠");
      setAddState("ready");
    }
  };

  const pInfo = priorityInfo(addForm.priority);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 18, alignItems: "start", marginBottom: 20 }}>
      {/* FEATURE: PE-10 — Add Courses inline sub-view */}
      <FeatureBadge id="PE-10" />
      {/* FEATURE: PE-11 — Edit Course inline sub-view */}
      <FeatureBadge id="PE-11" />

      {/* ── Left: Exhibit A + Exhibit B ── */}
      <div>

        {/* Exhibit A */}
        <div style={{ background: T.card, border: `1px solid ${T.line}`, padding: "16px 18px", marginBottom: 14, position: "relative" }}>
          <Corners />
          <div style={{ fontFamily: mono, fontSize: 9, color: T.brassDeep, textTransform: "uppercase", letterSpacing: 1.8, fontWeight: 600, marginBottom: 12 }}>
            Exhibit A · Course Material
          </div>

          {existingEntry && (
            <div style={{ border: `1px solid ${T.moss}50`, padding: "12px 14px", background: `${T.moss}05`, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 52, background: T.navy, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <div style={{ fontFamily: mono, fontSize: 9, color: T.card, fontWeight: 700 }}>DOC</div>
                <div style={{ fontFamily: mono, fontSize: 8, color: `${T.card}80`, marginTop: 2 }}>on file</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: display, fontSize: 14, fontWeight: 600, color: T.navy }}>Previously indexed document</div>
                <div style={{ fontFamily: body, fontSize: 11.5, color: T.moss, marginTop: 2 }}>✓ Vectorized and indexed in RAG</div>
              </div>
            </div>
          )}
          {/* FEATURE: AGT-344 — the file's text, editable */}
          {existingEntry && (
            <div style={{ marginTop: 10 }}>
              <div style={noteLabelStyle}>What {agent.name.split(" ")[0]} should know or do</div>
              <textarea
                value={addForm.content || ""}
                onChange={e => setAddForm(f => ({ ...f, content: e.target.value }))}
                style={{ ...noteFieldStyle, minHeight: 64, resize: "vertical", marginBottom: 6 }}
              />
              <div style={{ fontFamily: body, fontSize: 12, color: T.muted }}>{countLine(addForm.content || "")}</div>
            </div>
          )}
          {!existingEntry && addState === "idle" && (
            <div
              onClick={() => addFileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
              style={{ border: `2px dashed ${T.brass}55`, padding: "32px", textAlign: "center", cursor: "pointer", background: T.cardAlt, transition: "all .2s" }}
              onMouseEnter={e => e.currentTarget.style.background = `rgba(182,135,58,0.08)`}
              onMouseLeave={e => e.currentTarget.style.background = T.cardAlt}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
              <div style={{ fontFamily: display, fontSize: 15, fontWeight: 600, color: T.navy, marginBottom: 4 }}>Drop a document here</div>
              <div style={{ fontFamily: body, fontSize: 12, color: T.muted, marginBottom: 14 }}>PDF, DOCX, TXT · Max 20MB</div>
              {/* FEATURE: PE-10 */}
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: T.brass, color: T.navy, padding: "8px 20px", fontFamily: body, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                ↑ Browse File
              </div>
              <input ref={addFileRef} type="file" accept=".pdf,.txt,.docx" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
            </div>
          )}

          {!existingEntry && addState === "uploading" && (
            <div style={{ border: `1px solid ${T.brass}40`, padding: "24px", textAlign: "center", background: T.cardAlt }}>
              <div style={{ fontFamily: display, fontSize: 15, fontWeight: 600, color: T.navy, marginBottom: 12 }}>Extracting document text…</div>
              <div style={{ fontFamily: mono, fontSize: 11, color: T.muted, marginBottom: 10 }}>{addFile?.name}</div>
              <div style={{ background: T.paperDeep, height: 4, width: "100%", maxWidth: 320, margin: "0 auto 8px", overflow: "hidden" }}>
                <div style={{ height: "100%", background: T.brass, width: `${addProgress}%`, transition: "width .2s" }} />
              </div>
              <div style={{ fontFamily: mono, fontSize: 11, color: T.brassDeep }}>{Math.round(addProgress)}% complete</div>
            </div>
          )}

          {!existingEntry && (addState === "ready" || addState === "saving") && (
            <div style={{ border: `1px solid ${T.moss}50`, padding: "12px 14px", background: `${T.moss}05`, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 52, background: T.flag, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <div style={{ fontFamily: mono, fontSize: 9, color: T.card, fontWeight: 700 }}>DOC</div>
                <div style={{ fontFamily: mono, fontSize: 8, color: `${T.card}80`, marginTop: 2 }}>{addFile ? `${(addFile.size / 1e6).toFixed(1)}MB` : ""}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: display, fontSize: 14, fontWeight: 600, color: T.navy }}>{addFile?.name}</div>
                <div style={{ fontFamily: body, fontSize: 11.5, color: T.moss, marginTop: 2 }}>✓ {addWordCount.toLocaleString()} words extracted</div>
              </div>
              <button
                onClick={() => { setAddState("idle"); setAddFile(null); setAddExtracted(""); setAddWordCount(0); }}
                style={{ fontFamily: body, fontSize: 11.5, color: T.mutedDeep, background: "transparent", border: `1px solid ${T.line}`, padding: "5px 12px", cursor: "pointer" }}
              >✎ Replace</button>
            </div>
          )}
        </div>

        {/* Exhibit B */}
        <div style={{ background: T.card, border: `1px solid ${T.line}`, padding: "16px 18px", position: "relative", opacity: locked ? .38 : 1, pointerEvents: locked ? "none" : "auto", transition: "opacity .3s" }}>
          <Corners />
          <div style={{ fontFamily: mono, fontSize: 9, color: T.brassDeep, textTransform: "uppercase", letterSpacing: 1.8, fontWeight: 600, marginBottom: 16 }}>
            Exhibit B · How {agent.name.split(" ")[0]} Should Weight This
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontFamily: body, fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: 1.3, fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
              Document Title
              {!locked && <span style={{ fontFamily: mono, fontSize: 8, background: "rgba(155,110,243,0.12)", border: "1px solid rgba(155,110,243,0.3)", padding: "1px 5px", color: "#9b6ef3" }}>AI SUGGESTED</span>}
            </label>
            <input
              value={addForm.title}
              onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Document title…"
              style={{ width: "100%", padding: "9px 12px", fontFamily: body, fontSize: 13, color: T.ink, background: T.cardAlt, border: `1px solid ${addForm.title ? T.brass : T.line}`, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            {[{ key: "category", label: "Category", options: categories }, { key: "jurisdiction", label: "Jurisdiction", options: JURISDICTIONS }].map(({ key, label, options }) => (
              <div key={key}>
                <label style={{ fontFamily: body, fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: 1.3, fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  {label}
                  {!locked && <span style={{ fontFamily: mono, fontSize: 8, background: "rgba(155,110,243,0.12)", border: "1px solid rgba(155,110,243,0.3)", padding: "1px 5px", color: "#9b6ef3" }}>AI</span>}
                </label>
                <select
                  value={addForm[key]}
                  onChange={e => setAddForm(f => ({ ...f, [key]: e.target.value }))}
                  style={{ width: "100%", padding: "9px 12px", fontFamily: body, fontSize: 13, color: T.ink, background: T.cardAlt, border: `1px solid ${T.line}`, outline: "none", cursor: "pointer" }}
                >
                  {options.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <label style={{ fontFamily: body, fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: 1.3, fontWeight: 600 }}>Priority Weight</label>
              <span style={{ fontFamily: mono, fontSize: 12, color: pInfo.color, fontWeight: 700 }}>{pInfo.label} · {addForm.priority}/100</span>
            </div>
            <input type="range" min={0} max={100} value={addForm.priority} onChange={e => setAddForm(f => ({ ...f, priority: +e.target.value }))} style={{ width: "100%", accentColor: T.brass, marginBottom: 4 }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: mono, fontSize: 9, color: T.muted }}>
              <span>Low</span><span>Medium</span><span>High</span><span>Critical</span>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontFamily: body, fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: 1.3, fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              Flag Triggers
              {!locked && <span style={{ fontFamily: mono, fontSize: 8, background: "rgba(155,110,243,0.12)", border: "1px solid rgba(155,110,243,0.3)", padding: "1px 5px", color: "#9b6ef3" }}>AI</span>}
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 6 }}>
              {FLAG_TRIGGERS.map(f => {
                const on = addForm.triggers.includes("all") || addForm.triggers.includes(f.id);
                return (
                  <button key={f.id} onClick={() => toggleTrigger(f.id)}
                    style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", background: on ? `${T.flag}10` : "transparent", border: `1px solid ${on ? T.flag : T.line}`, cursor: "pointer", fontFamily: mono, fontSize: 10.5, color: on ? T.flag : T.muted, textAlign: "left", transition: "all .15s" }}>
                    <span style={{ width: 12, height: 12, border: `1.5px solid ${on ? T.flag : T.line}`, background: on ? T.flag : "transparent", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: T.card, flexShrink: 0 }}>{on ? "✓" : ""}</span>
                    ⚑ {f.label}
                  </button>
                );
              })}
            </div>
            <button onClick={() => toggleTrigger("all")}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", background: addForm.triggers.includes("all") ? `${T.flag}08` : "transparent", border: `1px dashed ${addForm.triggers.includes("all") ? T.flag : T.line}`, cursor: "pointer", fontFamily: mono, fontSize: 10.5, color: addForm.triggers.includes("all") ? T.flag : T.muted, transition: "all .15s" }}>
              <span style={{ width: 12, height: 12, border: `1.5px solid ${addForm.triggers.includes("all") ? T.flag : T.line}`, background: addForm.triggers.includes("all") ? T.flag : "transparent", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: T.card, flexShrink: 0 }}>{addForm.triggers.includes("all") ? "✓" : ""}</span>
              ⚑ All Flags — always retrieve for every briefing
            </button>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontFamily: body, fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: 1.3, fontWeight: 600, marginBottom: 6, display: "block" }}>
              Teaching Note for {agent.name.split(" ")[0]}
            </label>
            <textarea
              value={addForm.teaching_note}
              onChange={e => setAddForm(f => ({ ...f, teaching_note: e.target.value }))}
              placeholder={`Optional. Shapes how ${agent.name.split(" ")[0]} phrases findings that cite this document…`}
              style={{ width: "100%", padding: "9px 12px", fontFamily: body, fontSize: 12.5, color: T.ink, background: T.cardAlt, border: `1px solid ${T.line}`, outline: "none", resize: "vertical", minHeight: 70, lineHeight: 1.5, fontStyle: "italic", boxSizing: "border-box" }}
            />
          </div>

          {(addState === "ready" || addState === "saving") && (
            <div style={{ marginBottom: 14 }}>
              <button onClick={() => setAddExtractOpen(o => !o)}
                style={{ width: "100%", padding: "9px 12px", background: T.cardAlt, border: `1px solid ${T.line}`, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontFamily: mono, fontSize: 10, color: T.muted, letterSpacing: .5 }}>
                <span>▾ View extracted document text</span>
                <span style={{ fontFamily: mono, fontSize: 9, color: T.flag }}>READ ONLY · {addWordCount.toLocaleString()} words</span>
              </button>
              {addExtractOpen && (
                <div style={{ background: T.navyDeep, border: `1px solid rgba(255,255,255,.1)`, borderTop: "none", padding: "12px 14px", fontFamily: mono, fontSize: 11, color: "#8fa3bf", lineHeight: 1.7, maxHeight: 180, overflowY: "auto", whiteSpace: "pre-wrap", userSelect: "none" }}>
                  {addExtracted.split(/\s+/).slice(0, 300).join(" ")}{"\n\n[Read-only · Stored in Supabase]"}
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 16, borderTop: `1px solid ${T.lineSoft}` }}>
            <button onClick={onCancel} style={{ background: "transparent", border: `1px solid ${T.line}`, color: T.mutedDeep, padding: "9px 20px", fontFamily: body, fontSize: 13, cursor: "pointer" }}>Cancel</button>
            <button
              onClick={handleSave}
              disabled={!addForm.title || isSaving || locked}
              style={{ background: !addForm.title || locked ? T.line : `linear-gradient(135deg,${T.brass},${T.brassDeep})`, border: "none", color: !addForm.title || locked ? T.muted : T.navy, padding: "10px 24px", fontFamily: display, fontSize: 14, fontWeight: 700, cursor: !addForm.title || locked ? "not-allowed" : "pointer", opacity: isSaving ? .7 : 1, display: "flex", alignItems: "center", gap: 8 }}
            >
              {/* FEATURE: PE-10 */}
              {isSaving
                ? "⏳ Saving…"
                : existingEntry
                  ? "▸ Save Course Detail"
                  : <>{/* FEATURE: AI-28 — KNOWLEDGE_TRAINING pattern label */}<AiBadge style={{ color: T.navy, background: "rgba(18,36,60,0.12)", border: "1px solid rgba(18,36,60,0.2)" }} label={AI_PAT.KNOWLEDGE_TRAINING}/> ▸ Teach {agent.name.split(" ")[0]} this document</>
              }
            </button>
          </div>
        </div>
      </div>

      {/* ── Right: Projected Impact + What Changes + Onboarding Checklist ── */}
      <div>
        <div style={{ background: T.card, border: `1px solid ${T.line}`, padding: "16px 18px", marginBottom: 14, position: "relative" }}>
          <Corners />
          <div style={{ fontFamily: mono, fontSize: 9, color: T.brassDeep, textTransform: "uppercase", letterSpacing: 1.8, fontWeight: 600, marginBottom: 14 }}>Projected Impact</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", marginBottom: 14 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: mono, fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Before</div>
              <div style={{ fontFamily: display, fontSize: 40, fontWeight: 700, color: T.mutedDeep, lineHeight: 1 }}>{agent.skill}</div>
              <div style={{ fontFamily: mono, fontSize: 10, color: T.muted }}>{skillLabel(agent.skill)}</div>
            </div>
            <div style={{ fontFamily: display, fontSize: 22, color: T.brassDeep }}>→</div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: mono, fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>After</div>
              <div style={{ fontFamily: display, fontSize: 40, fontWeight: 700, color: T.moss, lineHeight: 1 }}>{Math.min(100, agent.skill + 3)}</div>
              <div style={{ fontFamily: mono, fontSize: 10, color: T.moss, fontWeight: 600 }}>▸ {skillLabel(Math.min(100, agent.skill + 3))}</div>
            </div>
          </div>
          <div style={{ fontFamily: body, fontSize: 11.5, color: T.mutedDeep, lineHeight: 1.5, fontStyle: "italic", padding: "8px 10px", background: `${T.moss}08`, border: `1px solid ${T.moss}30` }}>Mock projected impact. Live skill computation in v5.</div>
        </div>

        {/* FEATURE: PE-10 */}
        <div style={{ background: T.card, border: `1px solid ${T.line}`, padding: "14px 16px", marginBottom: 14, position: "relative" }}>
          <Corners />
          <div style={{ fontFamily: mono, fontSize: 9, color: T.brassDeep, textTransform: "uppercase", letterSpacing: 1.8, fontWeight: 600, marginBottom: 10 }}>What Changes</div>
          {[
            ["Documents",         agent.docs,            agent.docs + 1,              true],
            ["Class hours",       agent.classes,         agent.classes + 1,           false],
            ["Chunks in RAG",     agent.chunks,          `${agent.chunks}+ new`,      true],
            ["Tokens indexed",    "—",                   "+ new chunks",              true],
            ["Flag coverage",     "—",                   "—",                         false],
            ["Training invested", `$${agent.classes * 1000}`, `$${(agent.classes + 1) * 1000}`, false],
          ].map(([k, before, after, live]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${T.lineSoft}`, fontSize: 12, alignItems: "baseline" }}>
              <span style={{ color: T.mutedDeep, display: "flex", alignItems: "center", gap: 5 }}>
                {k}
                {live && <span style={{ fontFamily: mono, fontSize: 8, color: T.moss, border: `1px solid ${T.moss}40`, padding: "0 4px", letterSpacing: .5 }}>LIVE</span>}
              </span>
              <div style={{ fontFamily: mono, fontSize: 11, display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ color: T.muted }}>{before} →</span>
                <span style={{ color: T.navy, fontWeight: 700 }}>{after}</span>
              </div>
            </div>
          ))}
        </div>

        {/* FEATURE: PE-10 */}
        <div style={{ background: T.card, border: `1px solid ${T.line}`, padding: "14px 16px", position: "relative" }}>
          <Corners />
          <div style={{ fontFamily: mono, fontSize: 9, color: T.brassDeep, textTransform: "uppercase", letterSpacing: 1.8, fontWeight: 600, marginBottom: 10 }}>Onboarding Checklist</div>
          {[
            ["File uploaded & extracted",  addState === "ready" || addState === "saving", "just now"],
            ["Priority & flags assigned",  addState === "ready" || addState === "saving", "just now"],
            ["Chunked into passages",      false, "starting…"],
            ["Indexed into RAG",           false, "queued"],
            ["Quality check",              false, "scheduled"],
            ["Available in next briefing", false, "after index"],
          ].map(([label, done, status]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: `1px solid ${T.lineSoft}` }}>
              <div style={{ width: 14, height: 14, border: `1.5px solid ${done ? T.moss : T.line}`, background: done ? T.moss : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {done && <span style={{ color: T.card, fontSize: 9, fontWeight: 700 }}>✓</span>}
              </div>
              <span style={{ flex: 1, fontFamily: body, fontSize: 12, color: done ? T.ink : T.muted }}>{label}</span>
              <span style={{ fontFamily: mono, fontSize: 10, color: T.muted }}>{status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// FEATURE: PE-03 — Training tab live wiring
// ── Tab: Training ─────────────────────────────────────────────────────────────
// Typing a note is hidden from end users for beta (John): Skills and capabilities are where a person teaches an agent. It stays in the
// code and still shows on the admin address; set this to false to give it back to everyone. Existing notes, including the ones an AI
// tool saves with "remember this", still list, edit, switch off and delete.
const NOTE_ADD_HIDDEN = true;

function TrainingTab({ agent, entries, setEntries, reload, initialAdd, loadingEntries, showToast, navigate }) {
  const canTypeNote = !NOTE_ADD_HIDDEN || IS_ADMIN_HOST;
  const [lessonOpen, setLessonOpen] = useState(false); // the "little lesson" under How training works, closed until clicked
  const isMobile = useIsMobile(); // AGT-408 — the stats strip's buttons drop under the stats at phone width
  const [expandedIds, setExpandedIds] = useState({});
  const toggleEntry = (id) => setExpandedIds(p=>({...p,[id]:!p[id]}));
  const pronouns = AGENT_PRONOUNS[agent.id] || { subject:"they" };
  const firstName = agent.name.split(" ")[0];

  // FEATURE: AGT-344 — the note form (add: id null; edit: the entry's id); a deep link opens either form
  const [noteForm,   setNoteForm]   = useState(initialAdd === "note" && canTypeNote ? { id: null, title: "", text: "" } : null);
  const [noteSaving, setNoteSaving] = useState(false);

  const saveNote = async () => {
    const { id, title, text } = noteForm;
    setNoteSaving(true);
    try {
      if (id) {
        await apiUpdateEntry(id, { title, content: text });
      } else {
        const res = await fetch("/api/load-entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content: text, kind: "note", agent_id: agent.id, tenant_id: TENANT_ID }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Save failed");
        }
      }
    } catch (err) {
      // Refused: say why, keep the form
      showToast(err.message, "⚠");
      setNoteSaving(false);
      return;
    }
    await reload();
    setNoteSaving(false);
    setNoteForm(null);
    showToast(id ? "Updated ✦" : "Note saved ✦");
  };

  // FEATURE: PE-10 — Add Courses inline sub-view state
  const [showAddView,    setShowAddView]    = useState(initialAdd === "file");
  const [addState,       setAddState]       = useState("idle");
  const [addProgress,    setAddProgress]    = useState(0);
  const [addFile,        setAddFile]        = useState(null);
  const [addExtracted,   setAddExtracted]   = useState("");
  const [addWordCount,   setAddWordCount]   = useState(0);
  const [addExtractOpen, setAddExtractOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    title: "", category: "Standards", jurisdiction: "All",
    priority: 50, triggers: [], status: "active", teaching_note: "",
  });
  const addFileRef = useRef(null);

  // FEATURE: PE-11 — Edit Course inline sub-view state
  const [editingEntry, setEditingEntry] = useState(null);

  const handleEditClick = (entry) => {
    // FEATURE: AGT-344 — a note edits in the note form; a file keeps the course form
    if (entry.kind === "note") {
      setNoteForm({ id: entry.id, title: str(entry.title), text: str(entry.content) });
      return;
    }
    setEditingEntry(entry);
    setAddState("ready");
    setAddForm({
      title:        str(entry.title),
      category:     str(entry.category) || "Standards",
      jurisdiction: str(entry.jurisdiction) || "All",
      priority:     typeof entry.priority === "number" ? entry.priority : 50,
      triggers:     Array.isArray(entry.triggers) ? entry.triggers : [],
      status:       entry.status || "active",
      teaching_note: str(entry.fieldNotes),
      content:      str(entry.content),
    });
    setAddFile(null);
    setAddExtracted("");
    setAddWordCount(0);
    setAddExtractOpen(false);
  };

  const resetAddView = () => {
    setNoteForm(null);
    setShowAddView(false);
    setEditingEntry(null);
    setAddState("idle");
    setAddProgress(0);
    setAddFile(null);
    setAddExtracted("");
    setAddWordCount(0);
    setAddExtractOpen(false);
    setAddForm({ title: "", category: "Standards", jurisdiction: "All", priority: 50, triggers: [], status: "active", teaching_note: "" });
  };

  const exportJSON = () => {
    const real = entries.filter(e=>!e.isDemo);
    const blob = new Blob([JSON.stringify(real,null,2)],{type:"application/json"});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href=url; a.download=`${agent.id}_training.json`; a.click();
    URL.revokeObjectURL(url);
  };

  // FEATURE: PE-03 — live toggle via API
  const toggleStatus = async (id, currentStatus) => {
    const next = currentStatus === "active" ? "disabled" : "active";
    try {
      await apiPatchEntry(id, next);
      setEntries(prev => prev.map(e => e.id === id ? { ...e, status: next } : e));
      showToast(next === "active" ? "Enabled ✦" : "Disabled ✦");
    } catch { showToast("Failed to update", "⚠"); }
  };

  // FEATURE: PE-03 — live delete via API
  const deleteEntry = async (id) => {
    if (!window.confirm("Delete this training entry permanently?")) return;
    try {
      await apiDeleteEntry(id);
      setEntries(prev => prev.filter(e => e.id !== id));
      showToast("Deleted ✦");
    } catch { showToast("Delete failed", "⚠"); }
  };

  // FEATURE: PE-03 — Run ID formatter
  function formatRunId(createdAt) {
    if (!createdAt) return "";
    return createdAt.replace("T", " ").split(".")[0].replace(/-/g,"").replace(/:/g,"").replace(" ","-");
  }

  // FEATURE: PE-03 — Date column formatter
  function formatDateCol(createdAt) {
    if (!createdAt) return { month: "—", day: "" };
    const d = new Date(createdAt);
    return {
      month: d.toLocaleDateString("en-US", { month: "short" }),
      day:   d.getDate().toString(),
    };
  }

  const active   = entries.filter(e=>e.status==="active");
  const disabled = entries.filter(e=>e.status==="disabled");
  // FEATURE: AGT-344 — the strip's three counts; one form open at a time
  const counts   = taughtCounts(entries);
  const formOpen = showAddView || editingEntry || noteForm;

  // FEATURE: PE-03 — loading state while entries fetch
  if (loadingEntries) return (
    <div style={{ padding: "40px", textAlign: "center", color: T.muted, fontFamily: mono, fontSize: 11 }}>
      Loading training entries…
    </div>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14,position:"relative"}}>
      {/* FEATURE: PE-03 — FeatureBadge */}
      <FeatureBadge id="PE-03" />

      {/* Navy stats strip — FEATURE: PE-03 */}
      <div style={{background:T.navy,padding:"11px 18px",display:"flex",gap:isMobile?12:22,alignItems:"center",flexWrap:isMobile?"wrap":"nowrap",border:`1px solid rgba(182,135,58,.3)`}}>
        {/* FEATURE: AGT-344 — what was taught, and how much of it is given on every run */}
        {[["Taught items",counts.taught,T.card],["Always given",counts.always,T.brassLight],["Looked up",counts.lookedUp,T.navyTextLo]].map(([k,v,c])=>(
          <div key={k}>
            <div style={{fontFamily:mono,fontSize:8,color:T.navyTextLo,textTransform:"uppercase",letterSpacing:1.2,marginBottom:2}}>{k}</div>
            <div style={{fontFamily:display,fontSize:17,fontWeight:600,color:c}}>{v||"0"}</div>
          </div>
        ))}
        <div style={{flex:1}}/>
        {/* Stats strip buttons — context-aware: Type a note + Upload a file / Cancel */}
        {/* FEATURE: PE-03 */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, ...(isMobile ? { flexBasis: "100%" } : null) }}>
          {formOpen ? (
            <button
              onClick={resetAddView}
              style={{
                background: "transparent",
                border: `1px solid ${T.brass}`,
                color: T.brassLight,
                padding: "6px 14px",
                fontFamily: body,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                letterSpacing: .3,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              ✕ Cancel
            </button>
          ) : (
            [...(canTypeNote ? [["+ Type a note", () => setNoteForm({ id: null, title: "", text: "" })]] : []), ["+ Upload a file", () => setShowAddView(true)]].map(([label, open]) => (
              <button
                key={label}
                onClick={open}
                style={{
                  background: T.brass,
                  border: `1px solid ${T.brass}`,
                  color: T.navy,
                  padding: "6px 12px",
                  fontFamily: body,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  letterSpacing: .3,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  ...(isMobile ? { flex: 1, justifyContent: "center" } : null),
                }}
              >
                {label}
              </button>
            ))
          )}
        </div>
      </div>

      {/* FEATURE: AGT-344 — the note form replaces the list, as the course form does */}
      {noteForm && (
        <NoteForm
          firstName={firstName}
          form={noteForm}
          setForm={setNoteForm}
          saving={noteSaving}
          onCancel={resetAddView}
          onSave={saveNote}
        />
      )}

      {/* FEATURE: PE-10/PE-11 — Inline add-course / edit-course sub-view */}
      {(showAddView || editingEntry) && (
        <AddCourseView
          agent={agent}
          existingEntry={editingEntry}
          addState={addState}
          setAddState={setAddState}
          addProgress={addProgress}
          setAddProgress={setAddProgress}
          addFile={addFile}
          setAddFile={setAddFile}
          addExtracted={addExtracted}
          setAddExtracted={setAddExtracted}
          addWordCount={addWordCount}
          setAddWordCount={setAddWordCount}
          addExtractOpen={addExtractOpen}
          setAddExtractOpen={setAddExtractOpen}
          addForm={addForm}
          setAddForm={setAddForm}
          addFileRef={addFileRef}
          onCancel={resetAddView}
          onSaved={async () => {
            // FEATURE: AGT-344 — the list is re-read from the server after every save
            const wasEdit = !!editingEntry;
            await reload();
            showToast(wasEdit ? "Updated ✦" : "Document indexed ✦");
            resetAddView();
          }}
          showToast={showToast}
        />
      )}

      {!formOpen && (<>

      {/* How it works */}
      <div style={{background:T.cardAlt,border:`1px dashed ${T.lineSoft}`,padding:"9px 13px"}}>
        <div style={{fontFamily:mono,fontSize:8.5,color:T.brassDeep,textTransform:"uppercase",letterSpacing:1.3,fontWeight:600,marginBottom:3}}>How training works</div>
        <div style={{fontFamily:body,fontSize:11.5,color:T.mutedDeep,lineHeight:1.55}}>
          <div style={{marginBottom:4}}>Everything you add here is something your agent can use.</div>
          <div style={{marginBottom:4}}>Short items, about five pages or less, are always given to the agent in full. Longer ones are looked up when they match the question.</div>
          <div style={{marginBottom:4}}>When you connect an AI tool, it gets every item you have added, in full. So keep each item short, and split a long document into several.</div>
          <div style={{marginBottom:6}}>Switch an item off at any time and your agent stops using it.</div>
          <button onClick={() => setLessonOpen(o => !o)} aria-expanded={lessonOpen} style={{background:"transparent",border:"none",padding:0,cursor:"pointer",fontFamily:body,fontSize:11.5,fontWeight:600,color:T.brassDeep}}>{lessonOpen ? "▾" : "▸"} A little lesson: how AI finds things</button>
          {lessonOpen && (
            <div style={{marginTop:6,paddingLeft:14,borderLeft:`2px solid ${T.lineSoft}`}}>
              <div style={{marginBottom:4}}>When you save an item, DeepBench turns its words into a long list of numbers. This is called an <strong>embedding</strong>, or a <strong>vector</strong>. The numbers capture what the text means.</div>
              <div style={{marginBottom:4}}>Items that mean similar things end up close together, like neighbours on a map. When your agent gets a question, DeepBench turns the question into numbers the same way and looks at the items nearby. It finds the right topics by meaning, not just by matching words.</div>
              <div style={{marginBottom:4}}>That is why a question about "late payments" can find your item about "overdue invoices".</div>
              <div>A connected AI tool skips the search and receives every item in full.</div>
            </div>
          )}
        </div>
      </div>

      {/* Export + count header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <div style={{fontFamily:mono,fontSize:9,color:T.brassDeep,textTransform:"uppercase",letterSpacing:1.5,fontWeight:600}}>Exhibit I · Training Courses</div>
          <div style={{fontSize:12,color:T.muted,marginTop:3}}>{active.length} active · {disabled.length} disabled · {entries.reduce((s,e)=>s+(e.chunks||0),0)} chunks</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={exportJSON} style={{background:"transparent",border:`1px solid ${T.line}`,color:T.mutedDeep,padding:"7px 14px",cursor:"pointer",fontFamily:body,fontSize:12}}>⬇ Export JSON</button>
        </div>
      </div>

      {entries.length===0&&(
        <div style={{background:`${T.brass}06`,border:`1px solid ${T.brass}20`,padding:"40px",textAlign:"center"}}>
          <div style={{fontFamily:display,fontSize:16,fontWeight:600,color:T.navy,marginBottom:8}}>No training entries yet</div>
          {agent.trainable&&<div style={{fontFamily:body,fontSize:12,color:T.muted,fontStyle:"italic"}}>Use the Training tab to add courses.</div>}
        </div>
      )}

      {/* FEATURE: PE-03 — NIGP card layout: left date/timeline col + right content */}
      {entries.map((e) => {
        const pi = priorityInfo(e.priority);
        const isExpanded = expandedIds[e.id];
        const runId = formatRunId(e.createdAt);
        const dateCol = formatDateCol(e.createdAt);
        // FEATURE: AGT-344 — a taught item's card states its kind and its reach
        const facts = e.taught ? cardFacts(e, firstName) : null;
        const chip = { fontFamily: mono, fontSize: 8.5, padding: "1px 6px" };
        return (
          <div key={e.id} style={{background:T.card,border:`1px solid ${T.line}`,marginBottom:10,overflow:"hidden",display:"flex"}}>

            {/* Left date/timeline column */}
            <div data-sent="no" style={{width:56,flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",padding:"14px 0 10px",borderRight:`1px solid ${T.lineSoft}`,background:T.cardAlt,gap:2}}>
              <div style={{fontFamily:mono,fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:.8,fontWeight:600,lineHeight:1}}>{dateCol.month}</div>
              {dateCol.day && <div style={{fontFamily:mono,fontSize:9,color:T.muted,lineHeight:1}}>{dateCol.day},</div>}
              <div style={{marginTop:6,fontSize:14,color:T.moss,lineHeight:1}}>●</div>
            </div>

            {/* Right content */}
            <div style={{flex:1,minWidth:0,padding:"12px 16px"}}>

              {/* Header row: chips left, action buttons right */}
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6,flexWrap:"wrap"}}>
                {facts ? (<>
                  <span style={{...chip,border:`1px solid ${T.brass}`,color:T.brassDeep}}>{facts.kind}</span>
                  <span data-sent="no" style={{...chip,border:`1px solid ${e.always?T.moss:T.muted}`,color:e.always?T.moss:T.mutedDeep}}>{facts.reach}</span>
                  {facts.count!==null&&<span data-sent="no" style={{fontFamily:mono,fontSize:8.5,color:T.muted}}>{facts.count}</span>}
                  {/* FEATURE: AGT-390 — where and when it was taught */}
                  {originTag(e)&&<span data-sent="no" style={{fontFamily:mono,fontSize:8.5,color:T.muted}}>{originTag(e)}</span>}
                </>) : (<>
                <span data-sent="no" style={{fontFamily:mono,fontSize:8.5,padding:"1px 6px",background:`${T.brass}10`,color:T.brassDeep,border:`1px solid ${T.brass}30`}}>{e.category||"INTERNAL"}</span>
                {e.jurisdiction&&<span data-sent="no" style={{fontFamily:mono,fontSize:8.5,padding:"1px 6px",background:"rgba(45,111,181,.1)",color:"#2d6fb5",border:"1px solid rgba(45,111,181,.3)"}}>{e.jurisdiction}</span>}
                </>)}
                <div style={{flex:1}}/>
                {/* Toggle button */}
                <button data-sent="no"
                  onClick={() => toggleStatus(e.id, e.status)}
                  style={{
                    fontFamily:mono, fontSize:9, fontWeight:700,
                    color: e.status==="active" ? T.moss : T.muted,
                    background: e.status==="active" ? `${T.moss}12` : "transparent",
                    border: `1px solid ${e.status==="active" ? T.moss : T.lineSoft}`,
                    padding:"2px 8px", cursor:"pointer", letterSpacing:.3,
                  }}
                >
                  {e.status==="active" ? "● Active" : "○ Disabled"}
                </button>
                {/* FEATURE: PE-11 — EDIT + DELETE: trainable agents, active entries only (NIGP parity) */}
                {agent.trainable && e.status === "active" && (
                  <>
                    <button
                      onClick={() => handleEditClick(e)}
                      style={{
                        fontFamily: mono, fontSize: 9, color: T.muted,
                        background: "transparent", border: `1px solid ${T.lineSoft}`,
                        padding: "2px 7px", cursor: "pointer", letterSpacing: .5, textTransform: "uppercase",
                      }}
                    >
                      EDIT
                    </button>
                    <button
                      onClick={() => deleteEntry(e.id)}
                      style={{
                        fontFamily: mono, fontSize: 9, color: T.flag,
                        background: "transparent", border: `1px solid ${T.flag}40`,
                        padding: "2px 7px", cursor: "pointer", letterSpacing: .5, textTransform: "uppercase",
                      }}
                    >
                      DELETE
                    </button>
                  </>
                )}
              </div>

              {/* Run ID row */}
              {!facts && runId && (
                <div data-sent="no" style={{fontFamily:mono,fontSize:8,color:T.muted,marginBottom:6}}>
                  Run {runId}
                </div>
              )}

              {/* Title */}
              <div style={{fontFamily:display,fontSize:14,fontWeight:600,color:T.navy,marginBottom:facts?0:5,lineHeight:1.25}}>{e.title}</div>

              {/* FEATURE: AGT-344 — a taught card ends with its one line */}
              {facts && (
                <div style={{fontFamily:body,fontSize:12,color:T.mutedDeep,marginTop:3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{facts.line}</div>
              )}

              {!facts && (<>
              {/* Trigger chips */}
              {e.triggers?.length > 0 && (
                <div data-sent="no" style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:4}}>
                  {e.triggers.includes("all")
                    ? <span style={{fontFamily:mono,fontSize:8.5,padding:"1px 6px",background:"rgba(168,51,25,.1)",color:T.flag,border:`1px solid rgba(168,51,25,.35)`}}>⚑ ALL FLAGS</span>
                    : e.triggers.map(t=><span key={t} style={{fontFamily:mono,fontSize:8.5,padding:"1px 6px",background:"rgba(168,51,25,.1)",color:T.flag,border:`1px solid rgba(168,51,25,.35)`}}>⚑ {t.toUpperCase().replace(/-/g," ")}</span>)
                  }
                </div>
              )}

              {/* Priority */}
              <div data-sent="no" style={{fontFamily:mono,fontSize:9,color:T.muted,marginBottom:5}}>Priority {e.priority}/100</div>

              {/* Field notes */}
              {e.fieldNotes && (
                <div style={{fontFamily:body,fontSize:11.5,color:T.mutedDeep,marginBottom:5,lineHeight:1.5,fontStyle:"italic",background:T.cardAlt,padding:"6px 10px",borderLeft:`3px solid ${T.brass}`}}>
                  {e.fieldNotes}
                </div>
              )}

              {/* What X Learned expandable */}
              <button data-sent="no" onClick={()=>toggleEntry(e.id)} style={{marginTop:4,fontFamily:mono,fontSize:9,color:T.brassDeep,background:"transparent",border:`1px solid ${T.lineSoft}`,padding:"2px 8px",cursor:"pointer",letterSpacing:.5,textTransform:"uppercase",display:"flex",alignItems:"center",gap:4}}>
                {isExpanded?"▲":"▸"} + What {agent.name.split(" ")[0]} Learned
              </button>
              {isExpanded && e.learnedSummary && (
                <div data-sent="no" style={{marginTop:8,background:`${T.moss}08`,border:`1px solid ${T.moss}30`,padding:"10px 14px",fontSize:12,color:T.mutedDeep,lineHeight:1.6,fontFamily:body}}>
                  {/* FEATURE: AI-28 — KNOWLEDGE_TRAINING pattern label */}
                  <AiBadge style={{marginBottom:5,display:"inline-block"}} label={AI_PAT.KNOWLEDGE_TRAINING}/> {e.learnedSummary}
                </div>
              )}
              </>)}
            </div>
          </div>
        );
      })}
      </>)}
    </div>
  );
}

// FEATURE: PE-04 — Playbook tab live wiring
// ── Tab: Playbook ─────────────────────────────────────────────────────────────
function PlaybookTab({ agent, showToast, plain = false }) {
  const firstName = agent.name.split(" ")[0];
  const pronouns  = AGENT_PRONOUNS[agent.id] || { possessive: "their" };
  const canEdit   = agent.trainable;

  const [formatConfigs, setFormatConfigs] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [editingId,     setEditingId]     = useState(null);
  const [showAdd,       setShowAdd]       = useState(false);
  const [alwaysText,    setAlwaysText]    = useState("");
  const [alwaysId,      setAlwaysId]      = useState(null);
  const [neverText,     setNeverText]     = useState("");
  const [neverId,       setNeverId]       = useState(null);
  const [mcpGuardrails, setMcpGuardrails] = useState([]); // FEATURE: AGT-390 — guardrails taught over MCP

  useEffect(() => {
    Promise.all([
      apiGetConfigs(agent.id, "output_format"),
      apiGetConfigs(agent.id, "guardrail"),
    ]).then(([formats, guardrails]) => {
      setFormatConfigs(formats);
      // FEATURE: AGT-390 — the boxes edit the DeepBench-written row; rows taught over MCP list under them
      const always = guardrails.find(r => r.name === "always" && r.origin !== "mcp");
      const never  = guardrails.find(r => r.name === "never" && r.origin !== "mcp");
      setMcpGuardrails(guardrails.filter(r => r.origin === "mcp"));
      if (always) { setAlwaysText(always.text); setAlwaysId(always.id); }
      if (never)  { setNeverText(never.text);   setNeverId(never.id); }
    }).catch(() => showToast("Could not load playbook configs", "⚠"))
      .finally(() => setLoading(false));
  }, [agent.id]);

  const handleSetDefault = async (id) => {
    try {
      await apiPatchConfig(id, { is_default: true });
      const fresh = await apiGetConfigs(agent.id, "output_format");
      setFormatConfigs(fresh);
      showToast("Default updated ✦");
    } catch { showToast("Failed", "⚠"); }
  };

  const handleToggleSelectable = async (id, val) => {
    try {
      await apiPatchConfig(id, { is_user_selectable: val });
      setFormatConfigs(prev => prev.map(c => c.id === id ? { ...c, is_user_selectable: val } : c));
      showToast(val ? "Now user-selectable ✦" : "Set to admin-only ✦");
    } catch { showToast("Update failed", "⚠"); }
  };

  const handleEdit = (updated) => setFormatConfigs(prev => prev.map(c => c.id === updated.id ? updated : c));

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this output format permanently?")) return;
    try {
      await apiDeleteConfig(id);
      setFormatConfigs(prev => prev.filter(c => c.id !== id));
      showToast("Deleted ✦");
    } catch { showToast("Delete failed", "⚠"); }
  };

  const handleFormatAdded = (config) => {
    setFormatConfigs(prev => {
      const updated = config.is_default ? prev.map(c => ({ ...c, is_default: false })) : prev;
      return [config, ...updated];
    });
    setShowAdd(false);
  };

  // FEATURE: AGT-390 — delete one guardrail taught over MCP
  const deleteMcpGuardrail = async (id) => {
    if (!window.confirm("Delete this guardrail permanently?")) return;
    try {
      await apiDeleteConfig(id);
      setMcpGuardrails(prev => prev.filter(r => r.id !== id));
      showToast("Deleted ✦");
    } catch { showToast("Delete failed", "⚠"); }
  };

  // FEATURE: AGT-390 — the MCP-taught guardrails of one side, under its box
  const mcpRows = (side) => mcpGuardrails.filter(r => r.name === side).map(r => (
    <div key={r.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 6, padding: "7px 10px", border: `1px solid ${T.lineSoft}`, background: T.cardAlt }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: mono, fontSize: 11, color: T.ink, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{r.text}</div>
        <div data-sent="no" style={{ fontFamily: mono, fontSize: 8.5, color: T.muted, marginTop: 3 }}>{originTag(r)}</div>
      </div>
      <button onClick={() => deleteMcpGuardrail(r.id)} style={{ fontFamily: mono, fontSize: 8.5, color: T.flag, background: "transparent", border: `1px solid ${T.flag}30`, padding: "1px 8px", cursor: "pointer", textTransform: "uppercase", letterSpacing: .5 }}>Delete</button>
    </div>
  ));

  const saveGuardrail = async (name, text, id, setId) => {
    try {
      if (id) {
        await apiPatchConfig(id, { text });
      } else {
        const created = await apiSaveConfig({ agent_id: agent.id, type: "guardrail", name, text, is_default: false, is_user_selectable: false });
        setId(created.id);
      }
      showToast("Saved ✦");
    } catch { showToast("Save failed", "⚠"); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <FeatureBadge id="PE-04" />

      {/* Output formats */}
      <div style={{ background: T.card, border: `1px solid ${T.line}`, padding: "15px 18px", position: "relative" }}>
        <Corners />
        <div style={{ fontFamily: mono, fontSize: 9, color: T.brassDeep, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600, marginBottom: 4 }}>{plain ? "Output Structure" : "Layer 04 · Output Structure"}</div>
        <div style={{ fontFamily: display, fontSize: 16, fontWeight: 600, color: T.navy, marginBottom: 6 }}>How does {firstName} format {pronouns.possessive} responses?</div>
        <div style={{ fontFamily: body, fontSize: 12, color: T.mutedDeep, lineHeight: 1.5, marginBottom: 13, padding: "9px 13px", background: T.cardAlt, borderLeft: `3px solid ${T.brassDeep}` }}>
          Final block sent to the LLM. Set one as <strong>Default</strong> for automatic use. Toggle <strong>User Selectable</strong> to let users choose in the analysis UI.
        </div>
        {loading && <div style={{ fontFamily: body, fontSize: 12, color: T.muted, fontStyle: "italic", padding: "20px 0", textAlign: "center" }}>Loading…</div>}
        {!loading && formatConfigs.map(config => (
          <ConfigCard key={config.id} config={config}
            onSetDefault={handleSetDefault}
            onToggleSelectable={handleToggleSelectable}
            onEdit={handleEdit}
            onDelete={handleDelete}
            editingId={editingId}
            setEditingId={setEditingId}
            showToast={showToast}
          />
        ))}
        {/* FEATURE: AI-01-patch — AiBadge on Playbook Add New Format */}
        {!loading && canEdit && !showAdd && (          <button onClick={() => setShowAdd(true)} style={{ width: "100%", padding: "9px", background: "transparent", border: `1px dashed ${T.lineSoft}`, color: T.brassDeep, fontFamily: body, fontSize: 12, cursor: "pointer", marginTop: 2, fontWeight: 500 , display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>{/* FEATURE: AI-28 — PROMPT_ASSEMBLY pattern label */}+ Add New Format <AiBadge label={AI_PAT.PROMPT_ASSEMBLY}/></button>
        )}
        {showAdd && (
          <AddConfigForm type="output_format" agentId={agent.id} onSaved={handleFormatAdded} onCancel={() => setShowAdd(false)} showToast={showToast} />
        )}
      </div>

      {/* FEATURE: PE-04 */}
      {/* Guardrails */}
      <div style={{ background: T.card, border: `1px solid ${T.line}`, padding: "15px 18px", position: "relative" }}>
        <Corners color={T.flag} />
        <div style={{ fontFamily: mono, fontSize: 9, color: T.flag, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600, marginBottom: 4 }}>{plain ? "Guardrails" : "Layer 05 · Guardrails"}</div>
        <div style={{ fontFamily: body, fontSize: 12, color: T.mutedDeep, lineHeight: 1.5, marginBottom: 18, padding: "9px 13px", background: `${T.flag}07`, borderLeft: `3px solid ${T.flag}` }}>
          Applied to every prompt regardless of which Role or Format is active. Protects against legal overreach and unsupported claims.
        </div>
        {loading
          ? <div style={{ fontFamily: body, fontSize: 12, color: T.muted, fontStyle: "italic", padding: "16px 0", textAlign: "center" }}>Loading…</div>
          : <>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: display, fontSize: 13, fontWeight: 600, color: T.navy, marginBottom: 6 }}>
                  What must {firstName} always do?
                </div>
                <textarea
                  value={alwaysText}
                  onChange={e => setAlwaysText(e.target.value)}
                  onBlur={() => saveGuardrail("always", alwaysText, alwaysId, setAlwaysId)}
                  rows={5}
                  placeholder={`Always cite the specific class code when referencing commodity risk…`}
                  style={{ width: "100%", background: T.cardAlt, border: `1px solid ${T.lineSoft}`, borderLeft: `3px solid ${T.moss}`, padding: "10px 12px", fontFamily: mono, fontSize: 11, color: T.ink, lineHeight: 1.7, resize: "vertical", outline: "none", boxSizing: "border-box" }}
                />
                {mcpRows("always")}
              </div>
              <div>
                <div style={{ fontFamily: display, fontSize: 13, fontWeight: 600, color: T.navy, marginBottom: 6 }}>
                  What must {firstName} never do?
                </div>
                <textarea
                  value={neverText}
                  onChange={e => setNeverText(e.target.value)}
                  onBlur={() => saveGuardrail("never", neverText, neverId, setNeverId)}
                  rows={5}
                  placeholder={`Never name a vendor as fraudulent without documented evidence…`}
                  style={{ width: "100%", background: T.cardAlt, border: `1px solid ${T.lineSoft}`, borderLeft: `3px solid ${T.flag}`, padding: "10px 12px", fontFamily: mono, fontSize: 11, color: T.ink, lineHeight: 1.7, resize: "vertical", outline: "none", boxSizing: "border-box" }}
                />
                {mcpRows("never")}
              </div>
              <div style={{ fontFamily: mono, fontSize: 9, color: T.muted, fontStyle: "italic", marginTop: 8 }}>
                Autosaved on blur · applied to all prompts
              </div>
            </>
        }
      </div>
    </div>
  );
}

// FEATURE: AGT-339 — Activity tab (private agents only). Every word and number on it comes from
// activityView(); this component only lays the cards out, each one the Report Card's card.
// ── Tab: Activity ─────────────────────────────────────────────────────────────
function ActivityTab({ agent, entries }) {
  const isMobile = useIsMobile();
  // null = still loading, so a card shows Loading… rather than flashing "No connections yet".
  const [activity, setActivity] = useState(null);
  const [activityLoaded, setActivityLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setActivityLoaded(false);
    setActivity(null);
    fetchAgentActivity(supabase, agent.id)
      .then(r => { if (!cancelled) { setActivity(r); setActivityLoaded(true); } })
      // Never block the user: a failed read leaves the cards in their honest empty state.
      .catch(err => { console.error("FEATURE: AGT-339 — failed to load the agent's activity", err); if (!cancelled) setActivityLoaded(true); });
    return () => { cancelled = true; };
  }, [agent.id]);
  const view = activityView({ agentId: agent.id, rows: activity?.rows || [], orgs: activity?.orgs || [], entries });
  const noteStyle = {fontFamily:body,fontSize:11,color:T.muted,fontStyle:"italic"};

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {view.cards.map((card, i) => (
        <div key={card.title} style={{background:T.card,border:`1px solid ${T.line}`,padding:"13px 15px",position:"relative"}}>
          <Corners/>
          {i === 0 && <FeatureBadge id="AGT-339" />}
          {card.columns && <FeatureBadge id="AGT-350" />}
          <div style={{fontFamily:mono,fontSize:9,color:T.brassDeep,textTransform:"uppercase",letterSpacing:1.5,fontWeight:600,marginBottom:10}}>{card.title}</div>
          {!activityLoaded ? (
            <div style={{border:`1px dashed ${T.lineSoft}`,padding:"16px 12px",textAlign:"center"}}>
              <div style={noteStyle}>Loading…</div>
            </div>
          ) : card.emptyText ? (
            <div style={{border:`1px dashed ${T.lineSoft}`,padding:"16px 12px",textAlign:"center"}}>
              <div style={noteStyle}>{card.emptyText}</div>
            </div>
          ) : (
            <>
              {card.columns ? (
                // FEATURE: AGT-350 — a table: header row first, four cells per row. On a phone the
                // network name takes its own line and Type, Count, Last sit on the line under it.
                <div style={{display:"grid",fontSize:11,gridTemplateColumns:isMobile ? "minmax(0,1fr) auto auto" : "auto auto auto auto",justifyContent:isMobile ? "stretch" : "start"}}>
                  {[card.columns, ...card.rows].map((cells, r) => cells.map((cell, c) => (
                    <div key={`${r}-${c}`} style={{
                      padding:"4px 0",
                      borderBottom:`1px solid ${T.lineSoft}`,
                      ...(r === 0 || c === 0 ? {color:T.mutedDeep} : {fontFamily:mono,fontSize:10.5,color:T.ink}),
                      ...(c >= 1 ? {whiteSpace:"nowrap"} : {}),
                      ...(c >= 2 ? {textAlign:"right",paddingLeft:14} : {}),
                      ...(c === 1 && !isMobile ? {paddingLeft:14} : {}),
                      ...(c === 0 && isMobile ? {gridColumn:"1 / -1",borderBottom:"none",paddingBottom:0} : {}),
                    }}>{cell}</div>
                  )))}
                </div>
              ) : card.rows.map(([k,v])=>(
                <div key={k} style={{display:"flex",gap:24,padding:"4px 0",borderBottom:`1px solid ${T.lineSoft}`,fontSize:11}}>
                  <span style={{color:T.mutedDeep,flexShrink:0,minWidth:isMobile ? 0 : 170}}>{k}</span>
                  <span style={{fontFamily:mono,fontSize:10.5,color:T.ink}}>{v}</span>
                </div>
              ))}
              {card.note && <div style={{...noteStyle,marginTop:8}}>{card.note}</div>}
            </>
          )}
        </div>
      ))}
      <div style={noteStyle}>Tokens, model, decisions and reasoning from the connected AI tool are not shown because DeepBench never receives them.</div>
    </div>
  );
}

// FEATURE: PE-07 — Left-sidebar nav replaces horizontal tab bar
// ── Personnel Screen ──────────────────────────────────────────────────────────
export default function PersonnelScreen() {
  const { agentId } = useParams();
  const navigate    = useNavigate();
  const [searchParams] = useSearchParams();
  // FEATURE: AGT-386 — no fallback to another agent: an id the roster does not hold (yet) is
  // "Loading…" until the read settles, then a redirect to /bench (guards below every hook).
  const { agents, settled } = useRoster();
  // FEATURE: AGT-392 — an Identity save patches this page's agent locally (Designer call 3)
  const [identityPatch, setIdentityPatch] = useState(null);
  // FEATURE: AGT-415 — a saved Skill Ladder level patches this page's agent locally (the roster read is cached)
  const [levelPatch, setLevelPatch] = useState(null);
  const found       = agents.find(a => a.id === agentId);
  const patched     = found && identityPatch?.id === agentId ? { ...found, ...identityPatch } : found;
  const agent       = patched && levelPatch?.id === agentId ? { ...patched, skill: levelPatch.skill } : patched;
  const onLevelSaved = (score) => setLevelPatch({ id: agentId, skill: score });
  const isMobile    = useIsMobile();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "profile");
  const [sentLens, setSentLensState] = useState(() => { try { return localStorage.getItem(SENT_LENS_KEY) === "1"; } catch { return false; } });
  const setSentLens = (v) => { setSentLensState(v); try { localStorage.setItem(SENT_LENS_KEY, v ? "1" : "0"); } catch { /* private window */ } };
  const [entries, setEntries]     = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [toast, setToast]         = useState(null);
  const [capabilities, setCapabilities] = useState([]);
  // FEATURE: AGT-413 — a saved Skill (matched by slug, it may sit on several capabilities) or capability replaces its row
  const patchSkill = (sk) => setCapabilities(cs => cs.map(c => ({ ...c, skillProfiles: c.skillProfiles.map(s => (s.slug === sk.slug ? { ...s, ...sk, level: s.level } : s)) })));
  // FEATURE: AGT-414 — a new Skill joins one capability; a removed one leaves that capability only
  const removeCapabilityFrom = (slug) => setCapabilities(cs => cs.filter(c => c.slug !== slug));
  const addCapabilityTo = (cap) => setCapabilities(cs => [...cs, cap]);
  const addSkillTo = (capSlug, skill) => setCapabilities(cs => cs.map(c => (c.slug === capSlug ? { ...c, skillProfiles: [...c.skillProfiles, skill] } : c)));
  const removeSkillFrom = (capSlug, skillSlug) => setCapabilities(cs => cs.map(c => (c.slug === capSlug ? { ...c, skillProfiles: c.skillProfiles.filter(s => s.slug !== skillSlug) } : c)));
  const patchCapability = (cap) => setCapabilities(cs => cs.map(c => (c.slug === cap.slug ? { ...c, ...cap, skillProfiles: c.skillProfiles } : c)));
  // FEATURE: AGT-386 — the Delete Agent confirm popup
  const [removeOpen, setRemoveOpen]     = useState(false);
  const [removing, setRemoving]         = useState(false);
  const [removeFailed, setRemoveFailed] = useState(false);
  // FEATURE: AGT-397 — the Current / Proposed layout switch: dev host + flag on; the choice is kept per
  // browser (a blocked storage read or write falls back to Current, never breaks the page)
  const flagOn = useFeatureFlag(LAYOUT_FLAG);
  const [stored, setStored] = useState(() => { try { return localStorage.getItem(LAYOUT_KEY); } catch { return null; } });
  // AGT-407 — the Proposed view is the page now: the Current view is retired, not deleted. Every Current
  // branch below (arrangement === "current", the OVERVIEW/CONFIGURE tab list, the two-column Profile) is
  // still here and works; set CURRENT_VIEW_RETIRED to false to bring the Current / Proposed switch back.
  const { switchShown, arrangement } = CURRENT_VIEW_RETIRED
    ? { switchShown: false, arrangement: "proposed" }
    : resolveLayout({ hostOk: IS_ADMIN_HOST, flagOn, stored });
  const setLayout = v => { try { localStorage.setItem(LAYOUT_KEY, v); } catch { /* storage blocked: the choice lasts this visit */ } setStored(v); };

  const showToast = (msg, icon="✓") => {
    setToast({msg,icon});
    setTimeout(()=>setToast(null),3000);
  };

  // FEATURE: SK-01–SK-05 — load capabilities for agent from Supabase
  useEffect(() => {
    if (!agent) return;
    fetchCapabilities(agent.id)
      .then(setCapabilities)
      .catch(err => console.error("Failed to load capabilities", err));
  }, [agent?.id]);

  // FEATURE: PE-03 — load live training entries from Supabase on mount
  useEffect(() => {
    setLoadingEntries(true);
    setEntries([]);
    apiGetEntries(agentId)
      // FEATURE: AGT-390 — each entry keeps where and when it was taught
      .then(raw => setEntries(raw.map(r => ({ ...toEntry(r), origin: r.origin, origin_caller: r.origin_caller, created_at: r.created_at }))))
      .catch(() => showToast("Could not load training entries", "⚠"))
      .finally(() => setLoadingEntries(false));
  }, [agentId]);

  // FEATURE: AGT-344 — re-read the list after a save, so every item shown is a saved row
  const reloadEntries = async () => {
    try { setEntries((await apiGetEntries(agentId)).map(r => ({ ...toEntry(r), origin: r.origin, origin_caller: r.origin_caller, created_at: r.created_at }))); }
    catch { showToast("Could not load training entries", "⚠"); }
  };

  // FEATURE: PE-07 — Left-sidebar nav replaces horizontal tab bar
  // AGT-403 — Proposed: one CONFIGURE group, Profile then Training; Resume and Playbook are sections of Profile
  const proposed = arrangement === "proposed";
  const NAV_GROUPS = proposed ? [
    { id:"configure", label:"CONFIGURE", tabs:[
      { id:"profile",  label:"Profile",  icon:"◈" },
      { id:"training", label:"Training", icon:"◎" },
    ]},
  ] : [
    { id:"overview",  label:"OVERVIEW",  tabs:[{ id:"profile",  label:"Profile",  icon:"◈" }] },
    { id:"configure", label:"CONFIGURE", tabs:[
      { id:"resume",   label:"Resume",   icon:"▣" },
      { id:"training", label:"Training", icon:"◎" },
      { id:"playbook", label:"Playbook", icon:"⬟" },
    ]},
  ];

  // FEATURE: AGT-339 — the Activity tab exists only on a private agent's file (isPrivateAgent reads
  // the roster's bench group, never an agent id). A deep link to it on any other agent falls back.
  const showActivity = isPrivateAgent(agent);
  if (showActivity) NAV_GROUPS[0].tabs.push({ id:"activity", label:"Activity", icon:"◉" });
  useEffect(() => { if (activeTab === "activity" && !showActivity) setActiveTab("profile"); }, [activeTab, showActivity]);
  // FEATURE: AGT-397 — the COMING group and its Future View tab exist only under Proposed; a deep link
  // to it under Current falls back to Profile
  if (proposed) NAV_GROUPS.push({ id:"coming", label:"COMING SOON", tabs:[{ id:"future", label:"Future Controls", icon:"◇" }] });
  useEffect(() => { if (activeTab === "future" && arrangement !== "proposed") setActiveTab("profile"); }, [activeTab, arrangement]);
  // AGT-403 — a deep link to the Resume or Playbook tab under Proposed lands on Profile, where both now live
  useEffect(() => { if ((activeTab === "resume" || activeTab === "playbook") && proposed) setActiveTab("profile"); }, [activeTab, proposed]);

  // FEATURE: PE-09 — Breadcrumb uses NAV_GROUPS lookup
  const activeLabel = NAV_GROUPS.flatMap(g => g.tabs).find(t => t.id === activeTab)?.label || activeTab;

  // FEATURE: AGT-386 — Escape closes the confirm popup (same as Cancel)
  useEffect(() => {
    if (!removeOpen) return;
    const onKey = e => { if (e.key === "Escape" && !removing) { setRemoveOpen(false); setRemoveFailed(false); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [removeOpen, removing]);

  const cancelRemove = () => { if (removing) return; setRemoveOpen(false); setRemoveFailed(false); };
  async function confirmRemove() {
    setRemoving(true);
    setRemoveFailed(false);
    try {
      const res = await fetch("/api/agent-configs", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ action: "archive_private_agent", agent_id: agent.id }) });
      if (res.status === 200) { forgetAgent(agent.id); navigate("/bench/roster?filter=private"); return; }
    } catch {
      // a rejected fetch is the same failure as a non-200
    }
    setRemoving(false);
    setRemoveFailed(true);
  }

  // FEATURE: AGT-384 — the old ?connect=1 link (and /connect, which lands on it) opens the Connect to
  // AI page with this file's agent picked. The ROUTE's id, never agent.id: before the roster loads
  // the fallback above would send a table-only agent's link to the wrong agent. Below every hook.
  if (searchParams.get("connect") === "1") return <Navigate to={`/bench/connect?agent=${agentId}`} replace />;
  // FEATURE: AGT-386 — no wrong-agent flash: wait for the roster read, then leave for an unknown id.
  if (!agent && !settled) return <AppShell toast={toast}><div style={{flex:1,padding:"40px 24px",fontFamily:mono,fontSize:10,color:T.muted,letterSpacing:1.3,textTransform:"uppercase"}}>Loading…</div></AppShell>;
  if (!agent) return <Navigate to="/bench" replace />;

  const layers    = computeLayers(agent, entries);
  const readiness = Math.round(layers.reduce((s,l)=>s+l.s,0)/layers.length);

  return (
    <AppShell toast={toast}>
      <div style={{display:"flex",flex:1,overflow:"hidden"}}>

        {/* ── Left sidebar nav ── */}
        {/* FEATURE: PE-17 — desktop-only; mobile renders a merged persona header + horizontal tab bar instead */}
        {!isMobile && (
        <div style={{ width:180, flexShrink:0, background:T.card, borderRight:`1px solid ${T.line}`, display:"flex", flexDirection:"column", overflowY:"auto" }}>
          {/* FEATURE: AGT-397 — the layout switch, above the breadcrumb */}
          {switchShown && <LayoutSwitch arrangement={arrangement} onChange={setLayout}/>}
          {/* FEATURE: AGT-386 — the Bench breadcrumb, above the identity strip */}
          <Breadcrumb current={agent.name}/>

          {/* Agent identity strip */}
          {/* FEATURE: PE-07 */}
          <div style={{ padding:"16px 14px 14px", borderBottom:`1px solid ${T.lineSoft}` }}>
            <div style={{ marginBottom:8 }}>
              <AgentAvatar who={agent.id} size={44} ring={true} />
            </div>
            <div style={{ fontFamily:display, fontSize:13, fontWeight:600, color:T.navy, lineHeight:1.2 }}>{agent.name}</div>
            <div style={{ fontFamily:mono, fontSize:8, color:T.muted, marginTop:2 }}>{agent.code}</div>
            {!proposed && (
            <div style={{ marginTop:6, display:"flex", gap:4, flexWrap:"wrap" }}>
              <span style={{ fontFamily:mono, fontSize:8, padding:"1px 6px", background:"rgba(90,117,56,.1)", color:T.moss, border:`1px solid rgba(90,117,56,.3)`, fontWeight:700 }}>● ACTIVE</span>
              {agent.trainable && (
                <span style={{ fontFamily:mono, fontSize:8, padding:"1px 6px", background:`${agent.color}18`, color:agent.color, border:`1px solid ${agent.color}40`, fontWeight:700 }}>YOUR TRAINEE</span>
              )}
            </div>
            )}
          </div>

          {/* Nav groups */}
          {NAV_GROUPS.map(g => (
            <div key={g.id} style={{ paddingTop:16 }}>
              <div style={{ fontFamily:mono, fontSize:8, color:T.muted, textTransform:"uppercase", letterSpacing:1.6, fontWeight:700, padding:"0 14px 6px" }}>
                {g.label}
              </div>
              {g.tabs.map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                  width:"100%", textAlign:"left", padding:"8px 14px",
                  fontFamily:body, fontSize:12,
                  fontWeight: activeTab === t.id ? 600 : 400,
                  color: activeTab === t.id ? T.navy : T.mutedDeep,
                  background: activeTab === t.id ? `${T.brass}14` : "transparent",
                  border:"none",
                  borderLeft: activeTab === t.id ? `2px solid ${T.brass}` : "2px solid transparent",
                  cursor:"pointer", display:"flex", alignItems:"center", gap:8,
                }}>
                  <span style={{ fontFamily:mono, fontSize:10, color: activeTab === t.id ? T.brassDeep : T.muted }}>{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
          ))}
        </div>
        )}

        {/* ── Right content area ── */}
        <div style={{ display:"flex", flex:1, overflow:"hidden", flexDirection:"column" }}>

          {isMobile ? (
            <>
              {/* Mobile persona block — FEATURE: PE-17 — merges the old page header + ProfileTab's ID Badge card into one persistent block, above the tab bar, on every tab */}
              <div style={{background:T.card,padding:"16px 18px 14px",borderBottom:`2px solid ${T.brass}`,flexShrink:0,textAlign:"center"}}>
                <div onClick={() => navigate("/bench")} style={{fontFamily:body,fontSize:12,color:T.brassDeep,cursor:"pointer",textAlign:"left",marginBottom:12}}>← Agent Roster</div>
                <div data-sent="no"><TeamHeading agentId={agent.id} suffix={agent.code}/></div>
                <div style={{margin:"0 auto 12px",display:"flex",justifyContent:"center"}}>
                  <AgentAvatar who={agent.id} size={56} ring={true} />
                </div>
                {proposed ? (<>
                  <InlineText value={agent.name} field="name" agent={agent} onSaved={setIdentityPatch} showToast={showToast} style={{fontFamily:display,fontSize:20,fontWeight:600,color:T.navy,marginBottom:3}}/>
                  <InlineText value={agent.role} field="role" agent={agent} onSaved={setIdentityPatch} showToast={showToast} style={{fontFamily:body,fontSize:12,color:T.mutedDeep,fontStyle:"italic",marginBottom:2}}/>
                  <div data-sent="no" style={{fontFamily:body,fontSize:12,color:T.mutedDeep,fontStyle:"italic",marginBottom:10}}>Tenure · {agent.hiredOn}</div>
                </>) : (<>
                <div style={{fontFamily:display,fontSize:20,fontWeight:600,color:T.navy,marginBottom:3}}>{agent.name}</div>
                <div style={{fontFamily:body,fontSize:12,color:T.mutedDeep,fontStyle:"italic",marginBottom:10}}>{agent.role} · tenure {agent.hiredOn}</div>
                </>)}
                {!proposed && (
                <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center",marginBottom:10}}>
                  <span style={{fontFamily:mono,fontSize:8.5,padding:"2px 8px",background:"rgba(90,117,56,.1)",color:T.moss,border:`1px solid rgba(90,117,56,.3)`,fontWeight:700}}>● ACTIVE</span>
                  {agent.trainable&&<span style={{fontFamily:mono,fontSize:8.5,padding:"2px 8px",background:`${agent.color}18`,color:agent.color,border:`1px solid ${agent.color}40`,fontWeight:700}}>YOUR TRAINEE</span>}
                </div>
                )}
                {agent.quip && (
                <div data-sent="no" style={{fontFamily:display,fontStyle:"italic",fontSize:12,color:T.mutedDeep,background:`${T.moss}08`,border:`1px solid ${T.moss}25`,padding:"8px 12px",lineHeight:1.5,marginBottom:10}}>
                  "{plainQuip(agent.quip)}"
                </div>
                )}
                
                <div data-sent="no">{proposed && <SkillLevelBar agent={agent} onSaved={onLevelSaved} showToast={showToast}/>}</div>
                <BadgeActions agent={agent} align="center" onAddTraining={() => setActiveTab("training")} onConnect={() => navigate(`/bench/connect?agent=${agent.id}`)} style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center",marginBottom:10}}/>
                {arrangement === "current" && <StatBadges agent={agent} readiness={readiness} isMobile={true}/>}
              </div>

              {/* FEATURE: AGT-397 — the layout switch, mirrored on mobile above the tab bar */}
              {switchShown && <LayoutSwitch arrangement={arrangement} onChange={setLayout}/>}

              {/* Mobile tab bar — FEATURE: PE-17 — reuses RO-13's horizontal chip pattern (STYLE-GUIDE.md §27); persists across all 4 tabs */}
              <div style={{display:"flex",overflowX:"auto",gap:6,padding:"8px 12px",background:T.cardAlt,borderBottom:`1px solid ${T.line}`,flexShrink:0}}>
                {NAV_GROUPS.flatMap(g => g.tabs).map(t => {
                  const isActive = activeTab === t.id;
                  return (
                    <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                      flexShrink:0, textAlign:"left", padding:"8px 14px",
                      fontFamily:body, fontSize:12,
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? T.navy : T.mutedDeep,
                      background: isActive ? `${T.brass}24` : "transparent",
                      border:"none",
                      borderBottom: isActive ? `2px solid ${T.brass}` : "2px solid transparent",
                      cursor:"pointer", display:"flex", alignItems:"center", gap:6,
                    }}>
                      <span style={{ fontFamily:mono, fontSize:10, color: isActive ? T.brassDeep : T.muted }}>{t.icon}</span>
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            /* Page header — desktop only */
            <div style={{background:T.cardAlt,padding:"16px 24px 14px",borderBottom:`2px solid ${T.brass}`,flexShrink:0}}>
              {/* Breadcrumb — FEATURE: PE-09 */}
              {!proposed && (
              <div style={{fontFamily:mono,fontSize:9,color:T.brassDeep,textTransform:"uppercase",letterSpacing:1.8,fontWeight:600,marginBottom:4}}>
                Personnel File · {agent.code} · {agent.trainableBy} Bench · {activeLabel}
              </div>
              )}
              {/* Title row */}
              <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between"}}>
                <div>
                  <div style={{fontFamily:display,fontSize:26,fontWeight:500,color:T.navy,letterSpacing:"-.5px",lineHeight:1,marginBottom:4}}>
                    The personnel file of {agent.name}.
                  </div>
                  {!proposed && (
                  <div style={{fontFamily:body,fontStyle:"italic",fontSize:13,color:T.mutedDeep}}>
                    Tenure · {agent.hiredOn} · {skillLabel(agent.skill)}-level agent
                  </div>
                  )}
                </div>
                {/* Stat badges — FEATURE: AGT-397 — Current arrangement only */}
                {arrangement === "current" && <StatBadges agent={agent} readiness={readiness} isMobile={false}/>}
              </div>
            </div>
          )}

          {/* Tab content */}
          <div style={{ flex:1, overflowY:"auto", padding:"20px 24px 64px", background:T.paperDeep }}>
            {/* AGT-406 — Proposed, desktop: every tab's content takes at most half the browser width, left-aligned */}
            <div className={!SENT_LENS_HIDDEN && sentLens && isPrivateAgent(agent) ? "sent-lens" : undefined} style={proposed && !isMobile ? { maxWidth:"50vw" } : undefined}>
            <style>{SENT_LENS_CSS}</style>
            {!SENT_LENS_HIDDEN && (activeTab === "profile" || activeTab === "training") && isPrivateAgent(agent) && <SentLensToggle on={sentLens} onChange={setSentLens}/>}
            {/* FEATURE: PE-08 */}
            {activeTab === "profile"  && <ProfileTab agent={agent} entries={entries} layers={layers} capabilities={capabilities} onSkillChange={patchSkill} onCapabilityChange={patchCapability} onSkillAdded={addSkillTo} onSkillRemoved={removeSkillFrom} onCapabilityAdded={addCapabilityTo} onCapabilityDeleted={removeCapabilityFrom} onLevelSaved={onLevelSaved} isMobile={isMobile} onAddTraining={() => setActiveTab("training")} onConnect={() => navigate(`/bench/connect?agent=${agent.id}`)} arrangement={arrangement} showToast={showToast} onIdentitySaved={setIdentityPatch}/>}
            {/* FEATURE: AGT-397 — the Future View: the moved cards by group, an empty box per field not yet built */}
            {activeTab === "future" && arrangement === "proposed" && (
              <FutureViewTab isMobile={isMobile} groups={[
                { id:"subscription", items:[<VitalsCard key="vitals" agent={agent} tight/>], placeholders:[
                  { label:"Active status", line:"Not yet read from the agent row", rows:[["Status","Active"],["Since","Sep 2026"],["Last run","2 hours ago"],["Available to","Your team"]] },
                  { label:"Answer mode",   line:"Not yet read from the agent row", rows:[["Style","Cite sources"],["Length","Concise"],["When unsure","Ask a question"],["Language","English"]] },
                ]},
                // AGT-410 — the Teach control card moved here from Configurations
                { id:"training", items:[], placeholders:[
                  { label:"Teach control", line:"Not yet read from the agent row", rows:[["Who can teach","Owner only"],["Lessons waiting","0"],["Last taught","Oct 3, 2026"],["Review first","Required"]] },
                  // AGT-402 — the YOUR TRAINEE badge, moved to Future Controls by John (it means "you can train this agent", not the skill level)
                  { label:"Your trainee badge", line:"Not yet read from who created the agent", rows:[["Badge","YOUR TRAINEE"],["Shown when","You created this agent, so you can train it"],["Set by","The system, from who created the agent"],["Changes when","The agent passes to a different owner"]] },
                  // AGT-413 — teaching origin and date, moved to Future Controls by John's register ruling
                  { label:"Teaching origin and date", line:"Not yet read from the taught items", rows:[["Taught from","DeepBench"],["Taught over MCP","3 lessons"],["First taught","Sep 29, 2026"],["Last taught","Oct 3, 2026"]] },
                ]},
                { id:"billing", items:[<CompensationCard key="comp" agent={agent} tight/>], placeholders:[] },
                { id:"readiness", items:[
                  <StatBadges key="trio" agent={agent} readiness={readiness} isMobile={isMobile}/>,
                  <ReadinessCard key="ready" layers={layers} readiness={readiness}/>,
                  <IntelConfigCard key="intel" agent={agent} layers={layers} isMobile={isMobile} proposed/>,
                  // AGT-402 — Documents is the agent's real count of active taught items, not the roster's constant
                  <QuickStatsCard key="stats" agent={{ ...agent, docs: taughtCounts(entries).always + taughtCounts(entries).lookedUp }} show="all"/>,
                  <ReportCardPanel key="rc" agent={agent} capabilities={capabilities} tight sample/>,
                  <SkillLadderCard key="ladder" agent={agent} tight/>,
                ], placeholders:[
                  // AGT-413 — rating, moved to Future Controls by John's register ruling
                  { label:"Rating", line:"Not yet read from the agent row", rows:[["Average","4.6 of 5"],["Ratings","38"],["Last rated","Oct 5, 2026"],["Who can rate","People who used it"]] },
                  // AGT-415 — the typed 0-100 skill score, moved to Future Controls by John (the level bar on Profile is the editor today)
                  { label:"Skill score", line:"Typing a score arrives later; set the level with the bar on Profile", rows:[["Score","62 of 100"],["Level it falls in","Proficient (55 to 75)"],["Set by","You, Oct 6, 2026"],["Next level at","75"]] },
                  // AGT-415 — the ladder's other half: the agent promotes itself from what it has done (the user still sets the level on Profile)
                  { label:"Promotion by accomplishments", line:"Arrives when levels are graded from real runs; the level you set on Profile stays until then", rows:[["Current level","Proficient"],["Next level","Expert, at 75"],["Progress to it","18 of 25 graded reports passed"],["Last promoted","Sep 30, 2026, to Proficient"],["Promoted by","The agent, from its record"]] },
                ] },
                { id:"library", items:[<AccessLevelsCard key="levels"/>], placeholders:[
                  // AGT-413 — the Access card moved here (read-only for now) and the fixed Voice text, each with sample values
                  { label:"Access", line:"Editing sharing and visibility arrives with sign-in", rows:[["Owner","Jordan Lee"],["Sharing","Named people"],["Shared with","Dana Ruiz, Sam Okafor"],["Visibility","Visible to the people it is shared with"],["Lane","Product"],["Uber access","Off"]] },
                  { label:"Voice", line:"One fixed text for every agent today; a per-agent Voice needs its own storage first", rows:[["Applies to","Every agent"],["Position","Last section of every prompt"],["Speaks as","\"you\" or \"I\", never \"the user\""],["Edited per agent","Not yet"]] },
                  { label:"Library catalog",  line:"Hidden from AI clients until the Library opens to this agent", rows:[["Collections","4"],["Documents","128"],["Last updated","Sep 28, 2026"]] },
                  { label:"Library records",  line:"Hidden from AI clients until the Library opens to this agent", rows:[["Records","1,240"],["Kinds","Contracts, bids, notices"],["Newest","Oct 1, 2026"]] },
                  { label:"Library tier",     line:"Hidden from AI clients until the Library opens to this agent", rows:[["Tier","Standard"],["Storage used","2.1 of 10 GB"],["Kept for","12 months"]] },
                  { label:"Data-room access", line:"Hidden from AI clients until the Library opens to this agent", rows:[["Rooms shared","2"],["Who can open","Owner + 3 guests"],["Downloads","Off"]] },
                ]},
                { id:"work", items:[<WorkAssignments key="work" agent={agent} sample/>], placeholders:[] },
              ]}/>
            )}
            {activeTab === "resume"   && !proposed && <ResumeTab agent={agent} showToast={showToast} arrangement={arrangement} onIdentitySaved={setIdentityPatch}/>}
            {/* FEATURE: PE-03 */}
            {activeTab === "training" && (
              <TrainingTab
                agent={agent}
                entries={entries}
                setEntries={setEntries}
                reload={reloadEntries}
                initialAdd={searchParams.get("add")}
                loadingEntries={loadingEntries}
                showToast={showToast}
                navigate={navigate}
              />
            )}
            {activeTab === "playbook" && !proposed && <PlaybookTab agent={agent} showToast={showToast}/>}
            {activeTab === "activity" && showActivity && <ActivityTab agent={agent} entries={entries}/>}
            {/* FEATURE: AGT-386 — Delete Agent: private agents only, every tab, desktop and mobile */}
            {isPrivateAgent(agent) && (<div style={{textAlign:"right",marginTop:32}}><button onClick={() => setRemoveOpen(true)} style={{background:"none",border:"none",padding:0,fontFamily:body,fontSize:11,color:T.muted,textDecoration:"underline",cursor:"pointer"}}>Delete Agent</button></div>)}
            </div>
          </div>

        </div>
      </div>

      {/* FEATURE: AGT-386 — the Delete Agent confirm popup. Yes archives (is_active false, nothing deleted). */}
      {removeOpen && (
        <div onClick={cancelRemove} style={{position:"fixed",inset:0,zIndex:2000,background:`${T.navy}B8`,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div onClick={e => e.stopPropagation()} style={{background:T.paperDeep,border:`1px solid ${T.line}`,padding:"24px 28px",maxWidth:420,width:"100%"}}>
            <div style={{fontFamily:display,fontSize:16,color:T.navy}}>Are you sure you want to remove {agent.name}?</div>
            {removeFailed && !removing && (
              <div style={{fontFamily:body,fontSize:12,color:T.flag,marginTop:10}}>Couldn’t remove {agent.name}. Try again.</div>
            )}
            <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:20}}>
              <button onClick={confirmRemove} disabled={removing} style={{background:T.navy,color:T.card,border:"none",padding:"8px 20px",fontFamily:display,fontSize:13,fontWeight:700,cursor:"pointer"}}>Yes</button>
              <button onClick={cancelRemove} disabled={removing} style={{background:"transparent",border:`1px solid ${T.line}`,color:T.mutedDeep,padding:"10px 20px",cursor:"pointer",fontFamily:body,fontSize:13}}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
