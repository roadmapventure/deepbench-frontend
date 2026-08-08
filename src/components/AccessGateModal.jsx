// DeepBench v7.0.77 | AccessGateModal.jsx | HAR-33
// FEATURE: HAR-33 (part b) — the friendly face of the edge access gate's 403 refusal.
//
// Two variants, both John-approved from a rendered mock (S-HAR-33-design, 2026-08-08):
//   spend_cap      — "Superuser": you spent through the trial cap, here's what you ran.
//   geo | manual   — "Private beta": contact John with your IP for access.
// Deliberately NO email button, NO mailto, NO address anywhere — John's explicit call.
// The gate refuses per model call, so this modal is freely dismissible and re-appears on
// the next refusal; nothing else about the session changes and browsing continues.

import { useEffect, useState } from 'react';
import { T, display, body, mono } from '../tokens.js';
import { subscribeGate } from '../lib/gate-intercept.js';

// Treasury palette washes. Every colour in this file resolves from `T` — the alpha values
// are the mock's, the RGB never is (`.claude/rules/design-tokens.md`).
function alpha(hex, a) {
  const h = String(hex).replace('#', '');
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

const VARIANTS = {
  spend_cap: {
    badge: 'Superuser',
    badgeBg: alpha(T.brass, 0.14),
    badgeBorder: T.brass,
    badgeText: T.brassDeep,
    heading: 'Thank you for testing DeepBench while in private beta.',
    lead: 'You are a superuser! Here is what you have put the agents through:',
    ipLead: 'If you need more access, email John with your IP address:',
    ipTail: null,
    showStats: true,
  },
  beta: {
    badge: 'Private beta',
    badgeBg: alpha(T.moss, 0.12),
    badgeBorder: T.moss,
    badgeText: T.moss,
    heading: 'DeepBench is in private beta.',
    lead: null,
    ipLead: 'Contact John and let him know your IP address:',
    ipTail: 'for access.',
    showStats: false,
  },
};

function StatTile({ label, value, valueColor }) {
  return (
    <div style={{
      flex: 1, minWidth: 0,
      background: T.cardAlt, border: `1px solid ${T.lineSoft}`, borderRadius: 6,
      padding: '10px 12px',
    }}>
      <div style={{
        fontFamily: body, fontSize: 11, color: T.muted,
        letterSpacing: 0.3, whiteSpace: 'nowrap',
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: display, fontSize: 20, fontWeight: 600, color: valueColor,
        marginTop: 3, overflowWrap: 'anywhere',
      }}>
        {value}
      </div>
    </div>
  );
}

export default function AccessGateModal() {
  const [gate, setGate] = useState(null);

  // One subscription for the shell's lifetime. A new refusal replaces the payload, so the
  // modal re-appears (or refreshes in place) on every gated call.
  useEffect(() => subscribeGate(detail => setGate(detail)), []);

  useEffect(() => {
    if (!gate) return undefined;
    const onKey = e => { if (e.key === 'Escape') setGate(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gate]);

  if (!gate) return null;

  const v = gate.reason === 'spend_cap' ? VARIANTS.spend_cap : VARIANTS.beta;
  const close = () => setGate(null);

  // PATCH-1 (part a) makes `stats` accompany every spend_cap refusal; the one documented
  // edge is the gate's stats RPC failing mid-refusal, which omits it. Render the variant
  // without the tiles row in that case rather than three zeroed/NaN tiles.
  const s = gate.stats;
  const hasStats = v.showStats && s && typeof s === 'object';

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 3000,
        background: alpha(T.navyDeep, 0.45),
        animation: 'hModalFadeIn 0.18s ease',
      }}
    >
      {/* Dismiss is exactly the three affordances the design session specified — ✕,
          "Keep browsing", Escape. Backdrop-click is deliberately NOT wired: not in the
          approved mock, and not ours to add. */}
      <div
        style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          animation: 'hModalPopIn 0.22s ease',
          width: 'calc(100% - 32px)', maxWidth: 460,
          maxHeight: 'calc(100% - 32px)', overflowY: 'auto',
          background: T.card, border: `1px solid ${T.line}`, borderRadius: 10,
          padding: '22px 24px 18px',
        }}
      >
        {/* Dismiss — ✕ */}
        <button
          onClick={close}
          aria-label="Close"
          style={{
            position: 'absolute', top: 10, right: 12,
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontFamily: body, fontSize: 18, lineHeight: 1, color: T.muted, padding: 4,
          }}
        >
          ✕
        </button>

        {/* Badge */}
        <span style={{
          display: 'inline-block',
          fontFamily: mono, fontSize: 10, fontWeight: 700,
          letterSpacing: 0.8, textTransform: 'uppercase',
          background: v.badgeBg, border: `1px solid ${v.badgeBorder}`, color: v.badgeText,
          borderRadius: 999, padding: '3px 10px',
        }}>
          {v.badge}
        </span>

        {/* Heading */}
        <div style={{
          fontFamily: display, fontSize: 21, fontWeight: 600, color: T.navy,
          lineHeight: 1.25, marginTop: 12,
        }}>
          {v.heading}
        </div>

        {/* Lead line (spend_cap only) */}
        {v.lead && (
          <div style={{ fontFamily: body, fontSize: 14, color: T.ink, lineHeight: 1.5, marginTop: 10 }}>
            {v.lead}
          </div>
        )}

        {/* Stat tiles */}
        {hasStats && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <StatTile label="LLM calls" value={Number(s.llm_calls) || 0} valueColor={T.navy} />
            <StatTile label="Tokens" value={(Number(s.total_tokens) || 0).toLocaleString()} valueColor={T.navy} />
            <StatTile label="Usage" value={`$${(Number(s.cost_usd) || 0).toFixed(2)}`} valueColor={T.brassDeep} />
          </div>
        )}

        {/* IP line */}
        <div style={{ fontFamily: body, fontSize: 14, color: T.ink, lineHeight: 1.5, marginTop: 14 }}>
          {v.ipLead}
        </div>
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: mono, fontSize: 13, color: T.navy,
            background: T.cardAlt, border: `1px solid ${T.line}`, borderRadius: 4,
            padding: '4px 9px', overflowWrap: 'anywhere',
          }}>
            {gate.ip || 'unknown'}
          </span>
          {v.ipTail && (
            <span style={{ fontFamily: body, fontSize: 14, color: T.ink }}>{v.ipTail}</span>
          )}
        </div>

        {/* Dismiss — "Keep browsing" */}
        <div style={{ marginTop: 18, textAlign: 'right' }}>
          <button
            onClick={close}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: body, fontSize: 13, color: T.muted,
              textDecoration: 'underline', padding: 0,
            }}
          >
            Keep browsing
          </button>
        </div>
      </div>
    </div>
  );
}
