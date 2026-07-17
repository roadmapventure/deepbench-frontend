// DeepBench v5.1.32 | config.js | Multi-tenancy stubs + environment config
// FEATURE: SH-02 — Environment config + tenant identity
// src/config.js — v5.0.0
// DeepBench v5 — Multi-tenancy stubs + environment config
// Phase 1: all hardcoded constants. Phase 2: swap for Clerk JWT.

// ── Identity stub ─────────────────────────────────────────────────────────────
export const CURRENT_USER = {
  name:      "John Leonard",
  workspace: "Roadmap Venture",
  tenantId:  "global",
};

export const TENANT_ID = "global";
// FEATURE: MOB-001 — APP_VERSION is now a fallback-only value, shown only while AboutPanel's live
// dev_version_counter fetch is loading or if it fails; the panel's real source of truth is the
// live Supabase read (see AboutPanel.jsx MOB-001 comment). Corrected from the stale "5.1.32" to
// the last known-good closed-out version at the time of this fix -- this constant will still go
// stale again over time (it's not wired to bump automatically), but no longer matters for what
// actually displays once the live fetch resolves.
export const APP_VERSION = "6.3.50";

// ── URLs ──────────────────────────────────────────────────────────────────────
// BASE_URL used for shareable task links
export const BASE_URL = typeof window !== "undefined"
  ? window.location.origin
  : "https://deepbench.roadmapventure.com";

// Railway backend URL — never hardcoded, always from env
export const FETCH_API_BASE_DEFAULT = "http://localhost:3001";
export const FETCH_API_BASE = import.meta.env.VITE_FETCH_API_URL || FETCH_API_BASE_DEFAULT;
