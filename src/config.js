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

// ── URLs ──────────────────────────────────────────────────────────────────────
// BASE_URL used for shareable task links
export const BASE_URL = typeof window !== "undefined"
  ? window.location.origin
  : "https://deepbench.roadmapventure.com";

// Railway backend URL — never hardcoded, always from env
export const FETCH_API_BASE_DEFAULT = "http://localhost:3001";
export const FETCH_API_BASE = import.meta.env.VITE_FETCH_API_URL || FETCH_API_BASE_DEFAULT;
