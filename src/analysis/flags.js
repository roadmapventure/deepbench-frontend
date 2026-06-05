// DeepBench v5.1.0 | flags.js | 6 procurement flag algorithms — deterministic, no AI
// src/analysis/flags.js — v5.0.1
// DeepBench v5 — 6 procurement flag algorithms
// DETERMINISTIC — no AI badge. Pure math/logic only.
// Carried forward exactly from v4.x App.jsx computeFlags()

import { resolveNIGP, NIGP_CLASS as NIGP_CLASS_LOOKUP } from "../nigp-lookup.js";
import { fmtFull, fmtPct, shortLabel } from "../utils.js";

export function computeFlags(rows, mapping, totalSpend) {
  const { amount: aC, nigp: nC, vendor: vC, contract: cC, po: pC, vendor_state: sC, date: dC } = mapping;
  const flags = [];
  const total = totalSpend || rows.reduce((s, r) => s + r._amt, 0);

  // ── 1. Maverick spend ──────────────────────────────────────────────────────
  if (cC) {
    const maverick = rows.filter(r => !r[cC] || String(r[cC]).trim() === "");
    const mAmt = maverick.reduce((s, r) => s + r._amt, 0);
    const mPct = mAmt / total * 100;
    if (mPct > 2) {
      flags.push({
        severity:       mPct > 15 ? "high" : mPct > 7 ? "medium" : "low",
        title:          "Maverick Spend — Purchases Outside Contract Coverage",
        summary:        `${mPct.toFixed(1)}% of total spend (${fmtFull(mAmt)}) on ${maverick.length.toLocaleString()} transactions has no master agreement or contract on record.`,
        detail:         "Off-contract purchases typically cost 15–25% more than contracted prices and bypass competitive procurement requirements.",
        recommendation: "Identify the top 20 off-contract vendors by spend. For recurring categories, initiate competitive solicitations.",
        amount:         mAmt,
        count:          maverick.length,
      });
    }
  }

  // ── 2. PO splitting ────────────────────────────────────────────────────────
  if (pC && vC && dC) {
    const grouped = {};
    for (const r of rows) {
      const v = String(r[vC] || "").trim();
      const d = String(r[dC] || "").trim();
      if (!v || !d) continue;
      const k = `${v}||${d}`;
      if (!grouped[k]) grouped[k] = { vendor: v, date: d, pos: new Set(), amt: 0, count: 0 };
      grouped[k].pos.add(r[pC]);
      grouped[k].amt += r._amt;
      grouped[k].count++;
    }
    const splits = Object.values(grouped).filter(g => g.pos.size >= 3).sort((a, b) => b.amt - a.amt);
    const splitAmt = splits.reduce((s, g) => s + g.amt, 0);
    if (splits.length > 0) {
      const topExamples = splits.slice(0, 3).map(g => `${g.vendor} (${g.pos.size} POs on ${g.date}, ${fmtFull(g.amt)})`).join("; ");
      flags.push({
        severity:       "high",
        title:          "Potential PO Splitting — Multiple POs to Same Vendor on Same Day",
        summary:        `${splits.length} instances found where a single vendor received 3+ purchase orders on the same date, totaling ${fmtFull(splitAmt)}.`,
        detail:         `PO splitting is used to circumvent approval thresholds. Top instances: ${topExamples}.`,
        recommendation: "Pull full purchase histories for flagged vendors. Compare PO values to your jurisdiction's small purchase and competitive bid thresholds.",
        amount:         splitAmt,
        count:          splits.length,
      });
    }
  }

  // ── 3. Single-source vendor concentration ──────────────────────────────────
  if (vC && nC) {
    const catVendor = {}, catTotal = {};
    for (const r of rows) {
      const { classCode } = resolveNIGP(r[nC]);
      const v = String(r[vC] || "Unknown").trim();
      const k = `${classCode}||${v}`;
      if (!catVendor[k]) catVendor[k] = { classCode, vendor: v, amt: 0 };
      catVendor[k].amt += r._amt;
      if (!catTotal[classCode]) catTotal[classCode] = 0;
      catTotal[classCode] += r._amt;
    }
    const singles = Object.values(catVendor)
      .filter(x => catTotal[x.classCode] >= 250000 && x.amt / catTotal[x.classCode] >= 0.80)
      .map(x => ({
        ...x,
        pct:    x.amt / catTotal[x.classCode] * 100,
        catAmt: catTotal[x.classCode],
        label:  shortLabel(NIGP_CLASS_LOOKUP[x.classCode] || `Class ${x.classCode}`),
      }))
      .sort((a, b) => b.catAmt - a.catAmt);

    if (singles.length > 0) {
      const totalSingle = singles.reduce((s, x) => s + x.catAmt, 0);
      const ex = singles.slice(0, 3).map(x => `${x.label} (${x.vendor}, ${x.pct.toFixed(0)}% share)`).join("; ");
      flags.push({
        severity:       singles.length >= 5 ? "high" : "medium",
        title:          "Single-Source Vendor Concentration — Categories With One Dominant Supplier",
        summary:        `${singles.length} spend categories (totaling ${fmtFull(totalSingle)}) have one vendor controlling 80%+ of category spend.`,
        detail:         `Single-source dependency limits price competition. Examples: ${ex}.`,
        recommendation: "For categories with >$500K single-source spend, initiate market surveys to identify alternative qualified vendors.",
        amount:         totalSingle,
        count:          singles.length,
      });
    }
  }

  // ── 4. Monthly spend spike ─────────────────────────────────────────────────
  if (dC) {
    const monthly = {};
    for (const r of rows) {
      const raw = String(r[dC] || "");
      const m = raw.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
      if (m) {
        const mo = m[1].padStart(2, "0");
        const yr = m[3].length === 2 ? "20" + m[3] : m[3];
        const k = `${yr}-${mo}`;
        if (!monthly[k]) monthly[k] = 0;
        monthly[k] += r._amt;
      }
    }
    const months = Object.entries(monthly).sort((a, b) => a[0].localeCompare(b[0]));
    if (months.length >= 4) {
      const amts = months.map(([, a]) => a);
      const avg  = amts.reduce((s, a) => s + a, 0) / amts.length;
      const spikes = months.filter(([, a]) => a > avg * 1.8).map(([mo, a]) => ({ month: mo, amt: a, ratio: a / avg }));
      if (spikes.length > 0) {
        const spikeAmt  = spikes.reduce((s, sp) => s + sp.amt, 0);
        const spikeDesc = spikes.map(sp => `${sp.month} (${fmtFull(sp.amt)}, ${sp.ratio.toFixed(1)}× avg)`).join(", ");
        flags.push({
          severity:       "medium",
          title:          "Abnormal Monthly Spend Spikes — Potential Use-It-or-Lose-It Budgeting",
          summary:        `${spikes.length} month${spikes.length > 1 ? "s" : ""} show spending more than 1.8× the monthly average: ${spikeDesc}.`,
          detail:         "End-of-fiscal-year spending surges often indicate \"use it or lose it\" budget behavior.",
          recommendation: "Cross-reference spike months against your fiscal year end. Audit the 20 largest purchases during spike months.",
          amount:         spikeAmt,
          count:          spikes.length,
        });
      }
    }
  }

  // ── 5. Long-tail vendor sprawl ─────────────────────────────────────────────
  if (vC) {
    const vendorSpend = {};
    for (const r of rows) {
      const v = String(r[vC] || "Unknown").trim();
      if (!vendorSpend[v]) vendorSpend[v] = 0;
      vendorSpend[v] += r._amt;
    }
    const sorted   = Object.values(vendorSpend).sort((a, b) => b - a);
    const n        = sorted.length;
    const tail     = sorted.slice(Math.floor(n * 0.8));
    const tailAmt  = tail.reduce((s, a) => s + a, 0);
    const tailPct  = tailAmt / total * 100;
    const tailCount = tail.length;
    if (tailCount > 20 && tailPct > 1) {
      flags.push({
        severity:       "low",
        title:          "Long-Tail Vendor Sprawl — Administrative Overhead Risk",
        summary:        `The bottom 20% of vendors (${tailCount.toLocaleString()} suppliers) account for only ${tailPct.toFixed(1)}% of spend but generate disproportionate overhead.`,
        detail:         "Managing hundreds of small vendors creates significant administrative burden.",
        recommendation: "Set a minimum vendor spend threshold below which purchases must be consolidated or P-carded.",
        amount:         tailAmt,
        count:          tailCount,
      });
    }
  }

  // ── 6. Out-of-state vendor spend ───────────────────────────────────────────
  if (sC) {
    const stateSpend = {};
    for (const r of rows) {
      const s = String(r[sC] || "Unknown").trim().toUpperCase();
      if (!stateSpend[s]) stateSpend[s] = 0;
      stateSpend[s] += r._amt;
    }
    const localState = Object.entries(stateSpend).sort((a, b) => b[1] - a[1])[0];
    if (localState) {
      const outOfState = total - localState[1];
      const outPct     = outOfState / total * 100;
      if (outPct > 40) {
        flags.push({
          severity:       "info",
          title:          "Out-of-State Vendor Spend — Review Local Preference Compliance",
          summary:        `${outPct.toFixed(1)}% of spend (${fmtFull(outOfState)}) flows to out-of-state vendors.`,
          detail:         "Many government jurisdictions have local vendor preference policies.",
          recommendation: "Review your jurisdiction's local preference ordinance.",
          amount:         outOfState,
          count:          null,
        });
      }
    }
  }

  return flags;
}
