// test-s-migrate-01a.mjs — S-MIGRATE-01a smoke tests
import { readFileSync } from "fs";

let pass = 0, fail = 0;
function ok(label, cond) { if(cond){ console.log("✓", label); pass++; } else { console.error("✗", label); fail++; } }

const roster  = readFileSync("src/screens/RosterScreen.jsx", "utf8");
const shared  = readFileSync("src/components/SharedUI.jsx", "utf8");
const agents  = readFileSync("src/data/agents.js", "utf8");

// Version headers
ok("agents.js v5.1.20 header",       agents.startsWith("// DeepBench v5.1.20"));
ok("SharedUI.jsx v5.1.20 header",    shared.startsWith("// DeepBench v5.1.20"));
ok("RosterScreen.jsx v5.1.20 header",roster.startsWith("// DeepBench v5.1.20"));

// AVATAR_CFG
ok("AVATAR_CFG exported from agents",agents.includes("export const AVATAR_CFG"));
ok("AVATAR_CFG has all 7 agents",    ["chloe","mike","bob","christy","robyn","brent","pat"].every(id => agents.includes(id)));

// AgentAvatar in SharedUI
ok("AgentAvatar exported from SharedUI", shared.includes("export function AgentAvatar"));
ok("AgentAvatar uses AVATAR_CFG",        shared.includes("AVATAR_CFG"));
ok("AVATAR_CFG imported in SharedUI",    shared.includes("AVATAR_CFG") && shared.includes("agents.js"));

// RosterScreen
ok("AgentAvatar imported in Roster",     roster.includes("AgentAvatar"));
ok("<AgentAvatar used in AgentCard",     roster.includes("<AgentAvatar"));

// DeepBench masthead preserved — NIGP copy must NOT appear
ok("DeepBench headline preserved",       roster.includes("Your bench."));
ok("NIGP headline NOT present",          !roster.includes("Build your analyst team."));
ok("NIGP subtitle NOT present",          !roster.includes("trainable AI agent"));
ok("Test My Team NOT present",           !roster.includes("Test My Team"));

// Stats strip + link
ok("Add a Player link present",          roster.includes("Add a Player"));

// Feature ID comments
ok("RO-04 comment in agents",            agents.includes("RO-04"));
ok("RO-04 comment in SharedUI",          shared.includes("RO-04"));
ok("RO-04 comment in Roster",            roster.includes("RO-04"));

console.log(`\n${pass} passed, ${fail} failed`);
if(fail > 0) process.exit(1);
