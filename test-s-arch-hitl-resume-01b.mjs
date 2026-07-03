// test-s-arch-hitl-resume-01b.mjs — S-ARCH-HITL-RESUME-01b verification
// DeepBench v6.0.7 | test-s-arch-hitl-resume-01b.mjs | SK-22 catalog wiring
import { strict as assert } from 'assert';
import { SERVICE_CATALOG, AI_TYPE_TO_SERVICE } from './src/hooks/useAIActivity.js';

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.error(`  ✗ ${name}: ${e.message}`); failed++; }
}

test('screen-controls, html-display, pdf-assembly all present in SERVICE_CATALOG', () => {
  for (const slug of ['screen-controls', 'html-display', 'pdf-assembly']) {
    const entry = SERVICE_CATALOG.find(s => s.slug === slug);
    assert.ok(entry, `${slug} must have a SERVICE_CATALOG entry`);
    assert.equal(entry.serviceType, 'ai');
  }
});

test('html-display and pdf-assembly do not overclaim Structured Output', () => {
  for (const slug of ['html-display', 'pdf-assembly']) {
    const entry = SERVICE_CATALOG.find(s => s.slug === slug);
    assert.ok(!entry.patterns.includes('Structured Output'), `${slug} uses html output_type, no schema tool offered`);
  }
});

test('no SERVICE_CATALOG duplicate slugs introduced', () => {
  const slugs = SERVICE_CATALOG.map(s => s.slug);
  assert.equal(new Set(slugs).size, slugs.length, 'no duplicate slugs');
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
