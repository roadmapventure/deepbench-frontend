// DeepBench v7.0.784 | src/lib/connectLinks.js | AGT-348 slice 2 -- the link targets claude.ai/settings/connectors
// directly with modal + connectorName + connectorUrl only. Spec: docs/kickoffs/v7.0.784-AGT-348-claude-link-direct.md.
// DeepBench v7.0.779 | src/lib/connectLinks.js | AGT-348 -- the one-click "Add to Claude" link the
// Connect popup offers above its manual steps. Plain JS (not .jsx) so the regression test can import it.
// Spec: docs/kickoffs/v7.0.779-AGT-348-add-to-claude-link.md; research: docs/harvests/AGT-348.md.

// FEATURE: AGT-348 -- claude.ai's Add custom connector dialog, pre-filled. Shape measured by John
// 2026-10-05 in his browser: /settings/connectors?modal=add-custom-connector&connectorName=&connectorUrl=
// opens the dialog with both fields filled. The slice-1 path /customize/connectors drops `modal` on its
// redirect and lands on a "Connectors have moved to Customize" page instead; mcpName/mcpServerUrl were
// never proven to fill and are gone.
export const CLAUDE_ADD_CONNECTOR = "https://claude.ai/settings/connectors";
export function claudeAddLink(name, url) {
  const q = new URLSearchParams({ modal: "add-custom-connector", connectorName: name, connectorUrl: url });
  return `${CLAUDE_ADD_CONNECTOR}?${q.toString()}`;
}
