// DeepBench v7.0.779 | src/lib/connectLinks.js | AGT-348 -- the one-click "Add to Claude" link the
// Connect popup offers above its manual steps. Plain JS (not .jsx) so the regression test can import it.
// Spec: docs/kickoffs/v7.0.779-AGT-348-add-to-claude-link.md; research: docs/harvests/AGT-348.md.

// FEATURE: AGT-348 -- claude.ai's Add custom connector dialog, pre-filled. Both param pairs ride
// along because public reports disagree on the names and Anthropic documents neither; unknown params
// are ignored, and with neither read the link still opens the right dialog.
export const CLAUDE_ADD_CONNECTOR = "https://claude.ai/customize/connectors";
export function claudeAddLink(name, url) {
  const q = new URLSearchParams({
    modal: "add-custom-connector",
    connectorName: name, connectorUrl: url,
    mcpName: name, mcpServerUrl: url,
  });
  return `${CLAUDE_ADD_CONNECTOR}?${q.toString()}`;
}
