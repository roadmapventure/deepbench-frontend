// DeepBench v5.1.0 | hhi.js | HHI vendor concentration scoring — deterministic, no AI
// src/analysis/hhi.js — v5.0.1
// DeepBench v5 — HHI vendor concentration scoring
// DETERMINISTIC — no AI badge. Pure math only.
// Carried forward exactly from v4.x App.jsx computeVendorConc()

import { resolveNIGP, NIGP_CLASS as NIGP_CLASS_LOOKUP } from "../nigp-lookup.js";
import { shortLabel } from "../utils.js";

export function computeVendorConc(rows, mapping, totalSpend) {
  const { vendor: vC, nigp: nC } = mapping;
  if (!vC) return null;

  const byVendor = {};
  for (const r of rows) {
    const v = String(r[vC] || "Unknown").trim();
    if (!byVendor[v]) byVendor[v] = { name: v, total: 0, count: 0, categories: new Set() };
    byVendor[v].total += r._amt;
    byVendor[v].count++;
    if (nC) {
      const { classCode } = resolveNIGP(r[nC]);
      byVendor[v].categories.add(classCode);
    }
  }

  const vendorArr = Object.values(byVendor)
    .map(v => ({ ...v, categories: v.categories.size, pct: v.total / totalSpend * 100 }))
    .sort((a, b) => b.total - a.total);

  // HHI = sum of squares of market share percentages
  const hhi = vendorArr.reduce((s, v) => s + v.pct * v.pct, 0);

  // Cumulative spend curve (Lorenz)
  let cum = 0;
  const cumulativeCurve = vendorArr.map((v, i) => {
    cum += v.pct;
    return { rank: i + 1, vendor: v.name, pct: v.pct, cumPct: cum };
  });

  // Vendor counts at 50/75/90% cumulative spend
  const v50 = cumulativeCurve.find(p => p.cumPct >= 50)?.rank || 0;
  const v75 = cumulativeCurve.find(p => p.cumPct >= 75)?.rank || 0;
  const v90 = cumulativeCurve.find(p => p.cumPct >= 90)?.rank || 0;

  // Category dominance — vendors controlling 70%+ of a category
  const catVendor = {}, catTotal = {};
  if (nC) {
    for (const r of rows) {
      const { classCode } = resolveNIGP(r[nC]);
      const v = String(r[vC] || "Unknown").trim();
      const k = `${classCode}||${v}`;
      if (!catVendor[k]) catVendor[k] = {
        classCode,
        label: shortLabel(NIGP_CLASS_LOOKUP[classCode] || `Class ${classCode}`),
        vendor: v,
        amt: 0,
      };
      catVendor[k].amt += r._amt;
      if (!catTotal[classCode]) catTotal[classCode] = 0;
      catTotal[classCode] += r._amt;
    }
  }

  const catDominance = Object.values(catVendor)
    .filter(x => catTotal[x.classCode] >= 100000)
    .map(x => ({
      ...x,
      pct:    x.amt / catTotal[x.classCode] * 100,
      catAmt: catTotal[x.classCode],
    }))
    .sort((a, b) => b.catAmt - a.catAmt)
    .filter(x => x.pct >= 70)
    .slice(0, 20);

  return { vendorArr, cumulativeCurve, hhi, v50, v75, v90, catDominance };
}
