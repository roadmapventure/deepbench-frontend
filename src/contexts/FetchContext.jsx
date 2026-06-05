// DeepBench v5.1.0 | FetchContext.jsx | Fetch agent state context — persists through navigation
// src/contexts/FetchContext.jsx — v5.0.0
// DeepBench v5 — Persistent fetch agent state
// Must survive navigation away from the fetch screen and back.
// All fetch state lives here — never in a component.

import { createContext, useContext, useState, useRef, useCallback } from "react";
import { FETCH_API_BASE } from "../config.js";
import { FETCH_STATES } from "../data/agents.js";

const FetchContext = createContext(null);

export function FetchProvider({ children }) {
  // ── Screen state ──────────────────────────────────────────────────────────
  const [fetchScreen, setFetchScreen]   = useState("landing"); // "landing"|"configure"|"running"
  const [fetchState,  setFetchState]    = useState("maryland");
  const [fetchYear,   setFetchYear]     = useState("2025");
  const [fetchDateFrom, setFetchDateFrom] = useState("01/01/2025");
  const [fetchDateTo,   setFetchDateTo]   = useState("01/30/2025");

  // ── Run state ─────────────────────────────────────────────────────────────
  const [fetchEvents,       setFetchEvents]       = useState([]);
  const [fetchRunning,      setFetchRunning]       = useState(false);
  const [fetchRunId,        setFetchRunId]         = useState(null);
  const [fetchThinking,     setFetchThinking]      = useState(false);
  const [fetchThinkingText, setFetchThinkingText]  = useState("");
  const [fetchComplete,     setFetchComplete]      = useState(null); // {fileName,filePath,steps,narration,success,totalTime}
  const [fetchStopped,      setFetchStopped]       = useState(false);
  const [fetchTotalTime,    setFetchTotalTime]      = useState(null);
  const [fetchAgentId,      setFetchAgentId]       = useState("brent"); // "brent"|"pat"
  const [fetchSelectedEvent, setFetchSelectedEvent] = useState(null);

  // ── Refs (must be in context so Stop Agent works from any screen) ─────────
  const fetchEventSourceRef   = useRef(null);
  const fetchStartTimeRef     = useRef(null);
  const fetchListRef          = useRef(null);
  const fetchEventsRef        = useRef([]);
  const fetchUserScrolledRef  = useRef(false);

  // ── Derived ───────────────────────────────────────────────────────────────
  // Canonical step count — action events only, not raw SSE count
  const fetchActionCount = fetchEvents.filter(e => e.action || e.type === "downloaded").length;

  // ── Scroll handler ────────────────────────────────────────────────────────
  const handleFetchScroll = useCallback(() => {
    const el = fetchListRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    fetchUserScrolledRef.current = !atBottom;
  }, []);

  // ── Stop agent ────────────────────────────────────────────────────────────
  const stopFetchAgent = useCallback(() => {
    if (fetchEventSourceRef.current) {
      fetchEventSourceRef.current.close();
      fetchEventSourceRef.current = null;
    }
    setFetchRunning(false);
    setFetchThinking(false);
    setFetchStopped(true);
    const elapsed = fetchStartTimeRef.current
      ? ((Date.now() - fetchStartTimeRef.current) / 1000)
      : null;
    setFetchTotalTime(elapsed);
    setFetchEvents(prev => {
      const actionCount = prev.filter(e => e.action || e.type === "downloaded").length;
      return [...prev, {
        type: "stopped",
        narration: `Agent halted by user after ${elapsed ? elapsed.toFixed(1)+"s" : ""} · ${actionCount} steps taken.`,
        timestamp: new Date().toISOString(),
      }];
    });
    fetchUserScrolledRef.current = false;
    setTimeout(() => {
      if (fetchListRef.current) {
        fetchListRef.current.scrollTop = fetchListRef.current.scrollHeight;
      }
    }, 100);
  }, []);

  // ── Run agent ─────────────────────────────────────────────────────────────
  const runFetchAgent = useCallback((agentId = "brent") => {
    setFetchAgentId(agentId);
    setFetchEvents([]);
    fetchEventsRef.current = [];
    setFetchComplete(null);
    setFetchStopped(false);
    setFetchRunning(true);
    setFetchThinking(true);
    setFetchThinkingText("Connecting to agent…");
    setFetchTotalTime(null);
    fetchStartTimeRef.current = Date.now();
    fetchUserScrolledRef.current = false;

    // Generate run ID: YYYYMMDD-HHMMSS
    const now = new Date();
    const runId = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}-${String(now.getHours()).padStart(2,"0")}${String(now.getMinutes()).padStart(2,"0")}${String(now.getSeconds()).padStart(2,"0")}`;
    setFetchRunId(runId);
    setFetchScreen("running");

    const usePat = agentId === "pat";
    const url = `${FETCH_API_BASE}/agent/run?state=${fetchState}&year=${fetchYear}&dateFrom=${encodeURIComponent(fetchDateFrom)}&dateTo=${encodeURIComponent(fetchDateTo)}${usePat ? "&noMemory=true" : ""}`;

    const es = new EventSource(url);
    fetchEventSourceRef.current = es;

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "end") {
        es.close();
        fetchEventSourceRef.current = null;
        setFetchRunning(false);
        setFetchThinking(false);
        return;
      }

      if (data.type === "complete") {
        const elapsed = fetchStartTimeRef.current
          ? ((Date.now() - fetchStartTimeRef.current) / 1000)
          : null;
        setFetchTotalTime(elapsed);
        const canonicalSteps = fetchEventsRef.current.filter(e => e.action || e.type === "downloaded").length;
        setFetchComplete({
          fileName: data.fileName,
          filePath: data.filePath,
          steps: canonicalSteps,
          narration: data.narration,
          success: data.success,
          totalTime: elapsed,
        });
        setFetchThinking(false);
        const timeStr = elapsed
          ? ` in ${elapsed < 60 ? elapsed.toFixed(1)+"s" : Math.floor(elapsed/60)+"m "+Math.round(elapsed%60)+"s"}`
          : "";
        setFetchThinkingText(
          data.success
            ? `✓ Complete — ${data.fileName} downloaded in ${canonicalSteps} steps${timeStr}. No human required.`
            : "Agent finished but could not complete the download."
        );
        setFetchRunning(false);
        fetchUserScrolledRef.current = false;
        setTimeout(() => {
          if (fetchListRef.current) {
            fetchListRef.current.scrollTop = fetchListRef.current.scrollHeight;
          }
        }, 100);

        // Browser-side memory accuracy patch
        if (data.success && agentId !== "pat") {
          logAICall({type:"summarization",model:"claude-haiku-4-5",location:"Post-fetch web-memory save",agentId:"brent"});
          fetch("/api/web-memory-patch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              steps_taken: canonicalSteps,
              total_time_seconds: elapsed,
            }),
          }).catch(() => {});
        }
        return;
      }

      if (["start","step","downloaded","error","stuck","max_steps","action_error"].includes(data.type)) {
        setFetchEvents(prev => {
          const next = [...prev, data];
          fetchEventsRef.current = next;
          return next;
        });
        if (data.type === "step")       setFetchThinkingText(`Analyzing screenshot — deciding next action… (step ${data.step})`);
        if (data.type === "downloaded") setFetchThinkingText(`File downloaded: ${data.narration}`);
        if (data.type === "error" || data.type === "stuck") setFetchThinkingText(`⚠ ${data.narration}`);
        setFetchThinking(data.type === "step" || data.type === "start");
      }
    };

    es.onerror = () => {
      setFetchEvents(prev => [...prev, {
        type: "error",
        narration: "Connection to agent server lost. Is the Railway backend running?",
        timestamp: new Date().toISOString(),
      }]);
      setFetchRunning(false);
      setFetchThinking(false);
      setFetchThinkingText("⚠ Connection lost. Check that the Railway backend is running.");
      es.close();
      fetchEventSourceRef.current = null;
    };
  }, [fetchState, fetchYear, fetchDateFrom, fetchDateTo]);

  // ── Auto-scroll effect (called from fetch screen via useEffect) ───────────
  const scrollToLatest = useCallback(() => {
    const el = fetchListRef.current;
    if (!el || fetchUserScrolledRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  const value = {
    // State
    fetchScreen, setFetchScreen,
    fetchState,  setFetchState,
    fetchYear,   setFetchYear,
    fetchDateFrom, setFetchDateFrom,
    fetchDateTo,   setFetchDateTo,
    fetchEvents, setFetchEvents,
    fetchRunning,
    fetchRunId,
    fetchThinking,
    fetchThinkingText,
    fetchComplete,
    fetchStopped,
    fetchTotalTime,
    fetchAgentId,
    fetchSelectedEvent, setFetchSelectedEvent,
    fetchActionCount,
    // Refs
    fetchEventSourceRef,
    fetchStartTimeRef,
    fetchListRef,
    fetchEventsRef,
    fetchUserScrolledRef,
    // Actions
    runFetchAgent,
    stopFetchAgent,
    handleFetchScroll,
    scrollToLatest,
  };

  return <FetchContext.Provider value={value}>{children}</FetchContext.Provider>;
}

export function useFetch() {
  const ctx = useContext(FetchContext);
  if (!ctx) throw new Error("useFetch must be used within FetchProvider");
  return ctx;
}
