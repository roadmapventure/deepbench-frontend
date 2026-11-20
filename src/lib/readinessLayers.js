// DeepBench v7.0.1079 | src/lib/readinessLayers.js | AGT-361 -- a created agent scores from its own rows
import { taughtCounts } from "./taughtItems.js";

export const isCreatedAgent = a => !!a && a.tableOnly === true && a.trainable === true;

// a config row with empty text is no row
const said = rows => (rows || []).filter(r => String(r?.text ?? "").trim()).length;
export const ownConfigCounts = (formats, guardrails) => ({ formats: said(formats), guardrails: said(guardrails) });

export function computeLayers(agent, entries, own) {
  const n = entries.length;
  const created = isCreatedAgent(agent);
  const grown = Math.min(100, Math.round(20 + n*6));
  const given = taughtCounts(entries).always > 0;
  return [
    { num:"L1", label:"Role & Behavior", tab:"Resume", s: agent.skill > 0 ? Math.min(100, agent.skill) : 0 },
    { num:"L2", label:"Background (RAG)", tab:"Training", s: created ? (n > 0 ? grown : 0) : agent.trainable ? grown : 0 },
    { num:"L3", label:"Analysis Payload", tab:"—", s: created ? (given ? 100 : 0) : 100 },
    { num:"L4", label:"Output Format", tab:"Playbook", s: created ? (own?.formats > 0 ? 72 : 0) : agent.trainable ? 72 : 50 },
    { num:"L5", label:"Guardrails", tab:"Playbook", s: created ? (own?.guardrails > 0 ? 68 : 0) : agent.trainable ? 68 : 45 },
  ];
}
