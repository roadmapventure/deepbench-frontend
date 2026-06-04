// src/main.jsx — v5.0.0
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { FetchProvider }    from "./contexts/FetchContext.jsx";
import { AnalyzerProvider } from "./contexts/AnalyzerContext.jsx";

import DashboardScreen        from "./screens/DashboardScreen.jsx";
import AssignWorkScreen       from "./screens/AssignWorkScreen.jsx";
import TaskInstructionsScreen from "./screens/TaskInstructionsScreen.jsx";
import AnalyzerScreen         from "./screens/AnalyzerScreen.jsx";
import FetchScreen            from "./screens/FetchScreen.jsx";
import RosterScreen           from "./screens/RosterScreen.jsx";
import PersonnelScreen        from "./screens/PersonnelScreen.jsx";
import TeachScreen            from "./screens/TeachScreen.jsx";
import TestTeamScreen         from "./screens/TestTeamScreen.jsx";
import BenchNewScreen         from "./screens/BenchNewScreen.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <FetchProvider>
        <AnalyzerProvider>
          <Routes>
            <Route path="/"                          element={<DashboardScreen />} />
            <Route path="/work/new"                  element={<AssignWorkScreen />} />
            <Route path="/work/:taskId"              element={<TaskInstructionsScreen />} />
            <Route path="/work/:taskId/analyze"      element={<AnalyzerScreen />} />
            <Route path="/work/:taskId/fetch"        element={<FetchScreen />} />
            <Route path="/bench"                     element={<RosterScreen />} />
            <Route path="/bench/new"                 element={<BenchNewScreen />} />
            <Route path="/bench/test"                element={<TestTeamScreen />} />
            <Route path="/bench/:agentId"            element={<PersonnelScreen />} />
            <Route path="/bench/:agentId/teach"      element={<TeachScreen />} />
          </Routes>
        </AnalyzerProvider>
      </FetchProvider>
    </BrowserRouter>
  </StrictMode>
);
