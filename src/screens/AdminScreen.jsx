// DeepBench v7.0.104 | screens/AdminScreen.jsx | ADM-1 minimal v1 -- new Admin screen (hostname-gated
// dev-only, waiver on record 2026-08-20T20:03Z on the ADM-1 gated briefing card). Body is a
// prominent link to the runner's Morning Briefing Artifact (permanent URL in
// docs/runbooks/briefing-page.md). v1.5 (read-only runner-evidence cards) is deferred. Any direct
// URL visit to /admin from a non-dev host redirects to /: the nav entry is gated in AppShell but
// the route stays defensively behind a redirect too, so a shared link cannot render the surface
// off-dev.

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { T, display, body, mono } from "../tokens.js";
import { AppShell } from "../AppShell.jsx";
import { IS_ADMIN_HOST } from "../AppShell.jsx";
import { useFeatureFlag } from "../lib/featureFlags.js";            // FEATURE: ADM-1 v1.5
import AdminEvidenceCards from "../components/AdminEvidenceCards.jsx"; // FEATURE: ADM-1 v1.5

// FEATURE: ADM-1 v1 — briefing artifact URL kept in sync with docs/runbooks/briefing-page.md
// (single source of truth; the runbook is where the URL is documented and where any redeploy
// keeps landing).
const BRIEFING_URL =
  "https://claude.ai/code/artifact/4c22b9b1-6b14-4092-b728-1756a59b3173";

export default function AdminScreen() {
  const navigate = useNavigate();
  // FEATURE: ADM-1 v1.5 — read-only evidence cards, default-off flag (HAR-41; data row, not a
  // code constant). John previews via ?ff=adm-1-evidence-cards; flag-off renders v1 unchanged.
  const showEvidence = useFeatureFlag("adm-1-evidence-cards");

  // Defense in depth: if a link is shared and lands on a non-dev host, redirect out.
  // The gate constant is the same one AppShell uses to gate the nav entry.
  useEffect(() => {
    if (!IS_ADMIN_HOST) navigate("/", { replace: true });
  }, [navigate]);

  if (!IS_ADMIN_HOST) return null;

  return (
    <AppShell headerProps={{ showAIPanel: true, showHelp: true }}>
      <div style={{ flex: 1, overflowY: "auto", background: T.paperDeep }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 20px 60px" }}>
          {/* Page heading */}
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontFamily: mono,
                fontSize: 10,
                letterSpacing: 1.2,
                textTransform: "uppercase",
                color: T.brassDeep,
              }}
            >
              DeepBench · Admin
            </div>
            <h1
              style={{
                fontFamily: display,
                fontSize: 26,
                fontWeight: 600,
                margin: "4px 0 6px",
                color: T.navy,
                lineHeight: 1.15,
              }}
            >
              Runner &amp; briefing home
            </h1>
            <p
              style={{
                margin: 0,
                color: T.mutedDeep,
                fontSize: 14,
                lineHeight: 1.55,
              }}
            >
              The DeepBench Automated development runner's front door. Live runner evidence cards
              (spend vs. budget, cycle history, trust-ladder state) will land here in a later
              cycle; today this page is the single easy path from the app into the morning briefing.
            </p>
          </div>

          {/* Primary call to action — briefing link */}
          <a
            href={BRIEFING_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block",
              background: T.card,
              border: `1.5px solid ${T.brass}`,
              borderRadius: 8,
              padding: "18px 20px",
              textDecoration: "none",
              color: T.ink,
              boxShadow: "0 2px 6px rgba(18,36,60,0.06)",
              marginBottom: 22,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 6,
              }}
            >
              <span style={{ fontSize: 22, lineHeight: 1 }}>🌅</span>
              <span
                style={{
                  fontFamily: display,
                  fontSize: 20,
                  fontWeight: 600,
                  color: T.navy,
                }}
              >
                Open the Morning Briefing
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  fontFamily: mono,
                  fontSize: 10,
                  color: T.brassDeep,
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                }}
              >
                External ↗
              </span>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 13.5,
                color: T.mutedDeep,
                lineHeight: 1.5,
              }}
            >
              Today's shipped cycles, gated-before-build cards awaiting your Accept/Reverse/Rework,
              budget and trust-ladder state, and the reading-entry card for the subscription-token
              meter. Times shown in CST. Decisions record for the page owner only.
            </p>
          </a>

          {/* FEATURE: SES-102 — one-tap Run-now. The native phone app doesn't list routines;
              the claude.ai routines page DOES work in a phone browser and carries the Run
              button, and this screen is reachable from his phone. A DeepBench-native start
              button is not buildable (only Anthropic's scheduler can spawn a cycle) — the
              link is the ceiling until the app ships routine support. */}
          <a
            href="https://claude.ai/code/routines"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block",
              background: T.cardAlt,
              border: `1px solid ${T.line}`,
              borderRadius: 7,
              padding: "12px 16px",
              textDecoration: "none",
              color: T.ink,
              marginBottom: 22,
              fontSize: 13.5,
            }}
          >
            <span style={{ fontFamily: display, fontWeight: 600, color: T.navy }}>
              ▶ Run a cycle now
            </span>
            <span style={{ color: T.mutedDeep, marginLeft: 10 }}>
              Opens the deepbench-runner routine — tap Run there; the cycle pushes a phone
              notification when it starts and reports on the briefing.
            </span>
            <span
              style={{
                marginLeft: 10,
                fontFamily: mono,
                fontSize: 10,
                color: T.brassDeep,
                letterSpacing: 0.8,
                textTransform: "uppercase",
              }}
            >
              External ↗
            </span>
          </a>

          {/* FEATURE: ADM-1 v1.5 — the evidence cards, flag-guarded mount. */}
          {showEvidence && <AdminEvidenceCards />}

          {/* Coming later — v1.5 note (kept small so it doesn't compete with the primary CTA) */}
          {!showEvidence && <div
            style={{
              background: T.cardAlt,
              border: `1px solid ${T.lineSoft}`,
              borderRadius: 6,
              padding: "12px 14px",
              fontSize: 12.5,
              color: T.muted,
              lineHeight: 1.55,
            }}
          >
            <div
              style={{
                fontFamily: mono,
                fontSize: 10,
                letterSpacing: 0.8,
                textTransform: "uppercase",
                color: T.brassDeep,
                marginBottom: 4,
              }}
            >
              Coming next
            </div>
            <span style={{ color: T.mutedDeep }}>
              A read-only in-app view of the runner cards (shipped items, cycle history, spend as %,
              trust ladder) will land under ADM-1 v1.5 — reading a narrow SELECT-granted view over
              the <code style={{ fontFamily: mono, fontSize: 11.5 }}>runner_</code> tables. Decision
              buttons are excluded from the in-app surface until real auth ships.
            </span>
          </div>}

          {/* Footer hint — gate note (dev-only, so this is only visible on dev/localhost anyway) */}
          <div
            style={{
              marginTop: 26,
              paddingTop: 12,
              borderTop: `1px solid ${T.line}`,
              fontFamily: mono,
              fontSize: 10.5,
              color: T.muted,
              lineHeight: 1.5,
            }}
          >
            Hostname-gated · dev only · ARCHITECTURE.md §19v · v7.0.104 · ADM-1 minimal v1
          </div>
        </div>
      </div>
    </AppShell>
  );
}
