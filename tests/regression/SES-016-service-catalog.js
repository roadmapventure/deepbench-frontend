// DeepBench v6.3.115 | tests/regression/SES-016-service-catalog.js | SES-016
// FEATURE: SES-016 — migrated from test-s-arch-hitl-resume-01b.mjs (debris cleanup)
//
// Persists the original file's 3 SERVICE_CATALOG assertions against the real
// catalog (shared/ai-patterns.js, the canonical source since AI-53 — not the
// useAIActivity.js re-export the original debris file imported from).

import assert from "assert";
import { SERVICE_CATALOG } from "../../shared/ai-patterns.js";

export default async function () {
  for (const slug of ["screen-controls", "html-display", "pdf-assembly"]) {
    const entry = SERVICE_CATALOG.find(s => s.slug === slug);
    assert.ok(entry, `${slug} must have a SERVICE_CATALOG entry`);
    assert.equal(entry.serviceType, "ai", `${slug} must have serviceType 'ai'`);
  }

  for (const slug of ["html-display", "pdf-assembly"]) {
    const entry = SERVICE_CATALOG.find(s => s.slug === slug);
    assert.ok(!entry.patterns.includes("Structured Output"), `${slug} uses html output_type, no schema tool offered`);
  }

  const slugs = SERVICE_CATALOG.map(s => s.slug);
  assert.equal(new Set(slugs).size, slugs.length, "no duplicate SERVICE_CATALOG slugs");
}
