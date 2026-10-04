// DeepBench v7.0.760 | src/screens/ConnectScreen.jsx | AGT-334 slice 2 — /connect opens the Connect popup
// The tester's old link keeps working: /connect lands on Brittany's personnel file with the Connect
// popup showing (ConnectAgentPopup, ?connect=1 — slice 1). The AGT-165 steps, prompt box and Teach
// link are gone (John, 2026-10-03). "brittany" here is the route alias the page always carried.
import { Navigate } from "react-router-dom";

export default function ConnectScreen() {
  return <Navigate to="/bench/brittany?connect=1" replace />;
}
