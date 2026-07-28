// DeepBench v6.3.160 | resolveAgent.js | LOG-83 -- resolveAgent + lookup maps extracted from AIActivityPanel.jsx so the Node regression test can import them without pulling in React/JSX; maps now carry role
// FEATURE: BUG-21 — self-maintaining agent lookup derived from AGENTS; never hand-maintained again

import { AGENTS } from "../data/agents.js";

const _agentById   = Object.fromEntries(AGENTS.map(a => [a.id,                 { name: a.name, code: a.code, role: a.role }]));
const _agentByCode = Object.fromEntries(AGENTS.map(a => [a.code.toUpperCase(), { name: a.name, code: a.code, role: a.role }]));

export function resolveAgent(agentId) {
  if (!agentId) return { name: '—', code: '—', role: '—' };
  return _agentById[agentId]
    || _agentByCode[agentId.toUpperCase()]
    || { name: agentId, code: '?', role: '—' };
}
