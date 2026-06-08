// test-s-migrate-01b.mjs — S-MIGRATE-01b smoke tests
import { readFileSync } from "fs";

let pass = 0, fail = 0;
function ok(label, cond) { if(cond){ console.log("✓", label); pass++; } else { console.error("✗", label); fail++; } }

const p = readFileSync("src/screens/PersonnelScreen.jsx", "utf8");

// Version header
ok("PersonnelScreen v5.1.21 header", p.startsWith("// DeepBench v5.1.21"));

// Sidebar nav
ok("NAV_GROUPS defined",             p.includes("NAV_GROUPS"));
ok("OVERVIEW group present",         p.includes('"OVERVIEW"') || p.includes("OVERVIEW"));
ok("CONFIGURE group present",        p.includes('"CONFIGURE"') || p.includes("CONFIGURE"));
ok("OPERATE section NOT present",    !p.includes('"OPERATE"') && !p.includes("OPERATE"));
ok("workflow tab NOT in nav",        !p.includes('"workflow"'));
ok("projects tab NOT in nav",        !p.includes('"projects"'));

// Teach/Test buttons removed
ok("Teach button removed",           !p.includes("/teach"));
ok("Test button removed",            !p.includes("test?agent="));

// Language — no NIGP-speak
ok("No '-level analyst' label",      !p.includes("-level analyst"));
ok("Uses '-level agent' instead",    p.includes("-level agent"));

// AppShell preserved
ok("AppShell still wraps screen",    p.includes("<AppShell"));

// Active assignments kept in ProfileTab
ok("AGENT_TASKS still present",      p.includes("AGENT_TASKS"));
ok("AGENT_COMPLETED still present",  p.includes("AGENT_COMPLETED"));

// Profile tab 2-col grid
ok("gridTemplateColumns 1fr 1fr",    p.includes('"1fr 1fr"'));

// Feature ID comments
ok("PE-07 comment present",          p.includes("PE-07"));
ok("PE-08 comment present",          p.includes("PE-08"));
ok("PE-09 comment present",          p.includes("PE-09"));

// ResumeTab not modified (import only)
ok("ResumeTab imported not inline",  p.includes("import ResumeTab"));

console.log(`\n${pass} passed, ${fail} failed`);
if(fail > 0) process.exit(1);
