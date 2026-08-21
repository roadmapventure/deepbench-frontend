// DeepBench v7.0.141 | components/AdminEvidenceCards.jsx | ADM-1 v1.5 — read-only runner
// evidence cards for the Admin screen, behind the default-off flag `adm-1-evidence-cards`
// (HAR-41). Reads ONLY the four narrow SELECT-granted views (runner_public_items /
// _cycles / _ladder / _spend) — the runner_ tables themselves keep zero public grants, so
// this surface can never leak directive bodies, notes, decision reasons, or dollar figures
// (spend arrives as a percent, computed server-side). Read-only by construction: no
// decision buttons until real auth ships (the ticket's explicit exclusion). Honest-absence
// rule (§19j): a view that returns nothing renders nothing — no placeholder copy.

import { useEffect, useState } from "react";
import { T, display, mono } from "../tokens.js";
import { supabase } from "../lib/supabase.js";

const CST = { timeZone: "America/Chicago", month: "2-digit", day: "2-digit", hour: "numeric", minute: "2-digit" };
function cst(ts) {
  if (!ts) return "";
  try { return new Date(ts).toLocaleString("en-US", CST) + " CST"; } catch { return ""; }
}

const sectionLabel = {
  fontFamily: mono, fontSize: 10, letterSpacing: 1, textTransform: "uppercase",
  color: T.brassDeep, margin: "18px 0 8px",
};
const card = {
  background: T.card, border: `1px solid ${T.line}`, borderRadius: 7,
  padding: "12px 14px", marginBottom: 10, fontSize: 13, color: T.ink, lineHeight: 1.5,
};

export default function AdminEvidenceCards() {
  const [items, setItems]   = useState(null);
  const [cycles, setCycles] = useState(null);
  const [ladder, setLadder] = useState(null);
  const [spend, setSpend]   = useState(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const [i, c, l, s] = await Promise.all([
        supabase.from("runner_public_items").select("*").order("created_at", { ascending: false }).limit(8),
        supabase.from("runner_public_cycles").select("*").order("started_at", { ascending: false }).limit(8),
        supabase.from("runner_public_ladder").select("*").order("work_class"),
        supabase.from("runner_public_spend").select("*").limit(1),
      ]);
      if (!live) return;
      setItems(i.data ?? null);
      setCycles(c.data ?? null);
      setLadder(l.data ?? null);
      setSpend(s.data?.[0] ?? null);
    })();
    return () => { live = false; };
  }, []);

  const outcomeWord = (o) =>
    o === "did_not_run" ? "did not run" : o === "gated_before_build" ? "gated before build" : o;

  return (
    <div>
      {spend && (
        <>
          <div style={sectionLabel}>API spend — percent of caps</div>
          <div style={card}>
            <span style={{ fontFamily: mono }}>
              day {spend.day_pct ?? 0}% · month {spend.month_pct ?? 0}%
            </span>
            <span style={{ color: T.muted, fontSize: 12, marginLeft: 10 }}>
              (real-money API calls only; dollar figures stay off this surface)
            </span>
          </div>
        </>
      )}

      {Array.isArray(cycles) && cycles.length > 0 && (
        <>
          <div style={sectionLabel}>Recent cycles</div>
          {cycles.map((c, k) => (
            <div key={k} style={{ ...card, display: "flex", gap: 10, alignItems: "baseline" }}>
              <span style={{ fontFamily: mono, fontSize: 11.5, color: T.mutedDeep, flexShrink: 0 }}>
                {cst(c.started_at)}
              </span>
              <span style={{ fontWeight: c.outcome === "shipped" ? 600 : 400,
                             color: c.outcome === "shipped" ? T.moss : T.ink }}>
                {outcomeWord(c.outcome) || "running"}
              </span>
              {c.model && (
                <span style={{ marginLeft: "auto", fontFamily: mono, fontSize: 11, color: T.muted }}>
                  {c.model}
                </span>
              )}
            </div>
          ))}
        </>
      )}

      {Array.isArray(items) && items.length > 0 && (
        <>
          <div style={sectionLabel}>Recent runner cards</div>
          {items.map((it, k) => (
            <div key={k} style={card}>
              <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 3 }}>
                <span style={{ fontFamily: mono, fontSize: 10.5, color: T.brassDeep,
                               textTransform: "uppercase", letterSpacing: 0.6 }}>
                  {it.kind === "gated_before_build" ? "gated before build" : it.kind}
                </span>
                {it.backlog_id && (
                  <span style={{ fontFamily: mono, fontSize: 11.5, color: T.mutedDeep }}>{it.backlog_id}</span>
                )}
                {it.decision && (
                  <span style={{ marginLeft: "auto", fontFamily: mono, fontSize: 11,
                                 color: it.decision === "accept" ? T.moss : it.decision === "reverse" ? T.flag : T.brassDeep }}>
                    {it.decision} · {cst(it.decided_at)}
                  </span>
                )}
              </div>
              {typeof it.title === "string" && it.title !== "" && (
                <div style={{ fontFamily: display, fontSize: 15, fontWeight: 600, color: T.navy }}>
                  {it.title}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {Array.isArray(ladder) && ladder.length > 0 && (
        <>
          <div style={sectionLabel}>Trust ladder</div>
          <div style={card}>
            {ladder.map((l, k) => (
              <div key={k} style={{ display: "flex", fontFamily: mono, fontSize: 12, padding: "2px 0" }}>
                <span>{String(l.work_class).replace(/_/g, " ")}</span>
                <span style={{ marginLeft: "auto" }}>rung {l.rung} · streak {l.streak}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ marginTop: 14, fontFamily: mono, fontSize: 10, color: T.muted }}>
        Read-only · decisions stay on the briefing Artifact until real auth ships · ADM-1 v1.5
      </div>
    </div>
  );
}
