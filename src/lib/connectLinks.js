// DeepBench v7.0.785 | src/lib/connectLinks.js | AGT-348 slice 3 -- the link uses the shape John measured
// working: claude.ai/customize/connectors with modal + connectorName + connectorUrl, in that order, nothing
// else. Spec: docs/kickoffs/v7.0.785-AGT-348-claude-link-customize.md.
// DeepBench v7.0.784 | src/lib/connectLinks.js | AGT-348 slice 2 -- the link targets claude.ai/settings/connectors
// directly with modal + connectorName + connectorUrl only. Spec: docs/kickoffs/v7.0.784-AGT-348-claude-link-direct.md.
// DeepBench v7.0.779 | src/lib/connectLinks.js | AGT-348 -- the one-click "Add to Claude" link the
// Connect popup offers above its manual steps. Plain JS (not .jsx) so the regression test can import it.
// Spec: docs/kickoffs/v7.0.779-AGT-348-add-to-claude-link.md; research: docs/harvests/AGT-348.md.

// FEATURE: AGT-348 -- claude.ai's Add custom connector dialog, pre-filled. This exact shape was measured
// working by John 2026-10-05 in a new tab:
// /customize/connectors?modal=add-custom-connector&connectorName=<name>&connectorUrl=<url> opens the
// dialog with both fields filled. /settings/connectors?... loads the "Connectors have moved to Customize"
// page instead. Slice 1 used this same path but also sent mcpName/mcpServerUrl, and landed on the moved
// page with `modal` stripped -- never add params (or reorder them) without re-measuring.
export const CLAUDE_ADD_CONNECTOR = "https://claude.ai/customize/connectors";
export function claudeAddLink(name, url) {
  const q = new URLSearchParams({ modal: "add-custom-connector", connectorName: name, connectorUrl: url });
  return `${CLAUDE_ADD_CONNECTOR}?${q.toString()}`;
}
