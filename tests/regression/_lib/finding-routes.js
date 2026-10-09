// DeepBench v7.0.819 | tests/regression/_lib/finding-routes.js | AGT-304 slice 11 -- ONE home for the
// rows public.finding_routes holds, in --prepare's order (precedence, source), each by its ticket.
// decision ccab94da-81aa-4b9e-81ba-02cbfb376bb7 (status-0929, John 2026-09-29): every ticket the
// Development Manager files goes to Dev Mgr Findings (capture only).
export const MANAGER_PROJECT = "dev-mgr-findings";
export const LIVE_ROUTES = [
  { precedence: 10, source: "*", finding_type: "security", project_slug: "security" }, // AGT-132
  { precedence: 20, source: "auditor", finding_type: "*", project_slug: "auditor-findings" }, // 2136ce7c
  { precedence: 30, source: "agent", finding_type: "*", project_slug: null }, // AGT-161
  { precedence: 30, source: "backlog-review", finding_type: "*", project_slug: MANAGER_PROJECT }, // AGT-159
  { precedence: 30, source: "builder", finding_type: "*", project_slug: MANAGER_PROJECT }, // status-0929
  { precedence: 30, source: "check-routine-prompt", finding_type: "*", project_slug: MANAGER_PROJECT }, // AGT-134
  { precedence: 30, source: "researcher", finding_type: "*", project_slug: MANAGER_PROJECT }, // AGT-138
  { precedence: 30, source: "runner", finding_type: "*", project_slug: MANAGER_PROJECT }, // AGT-134
  { precedence: 30, source: "session", finding_type: "*", project_slug: MANAGER_PROJECT }, // AGT-264
  { precedence: 30, source: "staff-watch", finding_type: "*", project_slug: MANAGER_PROJECT }, // AGT-132
  { precedence: 30, source: "ticket-owner", finding_type: "*", project_slug: MANAGER_PROJECT }, // AGT-132
];
