// DeepBench v7.0.267 | tests/regression/SES-211-drain-history-cancelled-verb.js | SES-211
//
// Guards ONE sentence on John's Automation panel (§2b): a drain he CANCELLED must never be
// reported to him as one that COMPLETED.
//
// FOUND LIVE 2026-08-25T14:0xZ by runner cycle 360eb885, in the tail of its own cycle and by the
// worst possible route -- it harvested John's untick of the Selfbuild M3 drain, rebuilt the page,
// and read back "<check> Selfbuild M3 - Independent Verification completed" while TEN of that
// epic's named members were still open, four of them waiting on his decision. The cycle declined to
// publish that page.
//
// THE BUG WAS LATENT, NOT NEW, AND THAT IS THE INTERESTING PART. deriveAutomation() has always
// selected BOTH terminal statuses -- `status=in.(done,cancelled)` -- while the line below it said
// `${name} completed` unconditionally. Nothing had ever been cancelled, so the two never disagreed.
// The first untick in the platform's history made it reachable, and it was ALREADY WRONG about a
// second drain on the live page: the "Automation" drain was cancelled too, and the panel had been
// telling John it completed.
//
// WHY THE TEST INJECTS `sel` RATHER THAN GREPPING THE SOURCE. A source-level assertion ("the file
// contains d.status === 'cancelled'") passes against any spelling of the fix and against a fix that
// is never reached, and it cannot see the half that actually broke: the QUERY must select `status`
// at all. deriveAutomation() takes its fetcher as a parameter, so this drives the real exported
// function end to end with a fake PostgREST and asserts the strings it really returns. No
// credentials, no network, no spend.
//
// BOTH DIRECTIONS, AND THE SECOND ONE IS THE ONE AN EDITOR DELETES AS REDUNDANT. Asserting only
// that a cancelled drain says "cancelled" passes just as happily against a blanket relabel that
// calls EVERY drain cancelled -- which would be a new lie in the other direction, told about the
// three milestones John really did finish. So `done-still-reads-completed` is asserted in the same
// fixture, from the same call.

import assert from 'assert';
import { deriveAutomation } from '../../scripts/lib/briefing-automation.mjs';
import { selfRun } from './_lib/self-run.js';

// One fake PostgREST. Every path deriveAutomation() takes is answered; the two rows under test are
// one cancelled drain and one done drain, deliberately adjacent so a single call proves both arms.
function makeSel() {
  return async (path) => {
    if (path.startsWith('runner_settings')) return [{ scheduler_on: false, interval_hours: 1, cron_minute: 40, daily_max_tokens_millions: 5 }];
    if (path.includes('status=eq.queued')) return [];                    // no standing drain (John unticked it)
    if (path.includes('status=in.(done,cancelled)')) {
      // The shape the real query returns ONLY IF it selects `status`. If a future edit drops
      // `status` from the select list, the real caller receives undefined here and the verb falls
      // back to "completed" -- which is precisely the regression this file exists to catch, so the
      // fixture deliberately does NOT paper over it by always supplying the field.
      const wants = /(^|[?&,])select=[^&]*\bstatus\b/.test(path) || /,status(,|&|$)/.test(path);
      return [
        { epic_id: 'e-cancelled', acted_cycle: null, created_at: '2026-08-25T01:48:00Z', ...(wants ? { status: 'cancelled' } : {}) },
        { epic_id: 'e-done',      acted_cycle: null, created_at: '2026-08-24T01:00:00Z', ...(wants ? { status: 'done' } : {}) },
      ];
    }
    if (path.startsWith('epics?select=id,name')) return [{ id: 'e-cancelled', name: 'Selfbuild M3 - Independent Verification' }, { id: 'e-done', name: 'Selfbuild M2 - Truth Infrastructure' }];
    if (path.startsWith('epics?')) return [];
    if (path.startsWith('runner_cycles')) return [];
    if (path.startsWith('backlog_items')) return [];
    if (path.startsWith('runner_drain_scope')) return [];
    return [];
  };
}
const rpc = async (fn) => (fn === 'resolve_day_token_cap' ? [{ day_cap: 5000000, cap_reason: 'your standing daily max of 5M tokens' }] : null);

export default async function run() {
  const a = await deriveAutomation(makeSel(), rpc, new Date('2026-08-25T14:00:00Z'));
  const hist = a.drain_history;

  const cancelledLine = hist.find(h => h.startsWith('Selfbuild M3'));
  const doneLine = hist.find(h => h.startsWith('Selfbuild M2'));

  assert.ok(cancelledLine && / cancelled$/.test(cancelledLine),
    `SES-211: a drain John CANCELLED must read "cancelled" on the Automation panel -- the M3 line ` +
    `was ${JSON.stringify(cancelledLine)}`);

  // The negative half: a drain that genuinely finished must still read "completed". This is what
  // stops the fix from becoming a blanket relabel that lies in the other direction.
  assert.ok(doneLine && / completed$/.test(doneLine),
    `SES-211: a drain that genuinely finished must still read "completed" -- the M2 line was ` +
    `${JSON.stringify(doneLine)}. A blanket relabel is not the fix.`);

  // The falsehood itself, stated as the thing that must never appear.
  assert.ok(!hist.some(h => h.startsWith('Selfbuild M3') && h.includes('completed')),
    `SES-211: a cancelled drain is reported as completed: ${JSON.stringify(hist)}`);

  // The query half, asserted through behaviour rather than by reading the file: if `status` were
  // dropped from the select list the fixture returns rows without it and the verb silently reverts.
  assert.notStrictEqual(cancelledLine, 'Selfbuild M3 - Independent Verification completed',
    'SES-211: deriveAutomation did not select `status`, so the cancelled/completed distinction is ' +
    'unavailable to the label -- this is the half that made the bug latent for so long');

  return true;
}

selfRun(import.meta.url, run);
