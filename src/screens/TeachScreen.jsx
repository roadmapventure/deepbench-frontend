// DeepBench v7.0.772 | src/screens/TeachScreen.jsx | AGT-344 slice 2 -- /bench/:agentId/teach opens the Training tab's add form
// One home for what an agent was taught: every Teach link lands on that agent's Personnel file,
// Training tab, with the upload form open (?add=file, slice 1). The upload-only page that lived
// here is gone. The agent id is the one in the URL; this file names no agent.
import { Navigate, useParams } from "react-router-dom";

export default function TeachScreen() {
  const { agentId } = useParams();
  return <Navigate to={`/bench/${encodeURIComponent(agentId)}?tab=training&add=file`} replace />;
}
