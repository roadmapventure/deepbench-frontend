// DeepBench v7.0.3 | useHarnessStream.js | LAV-1d -- captures execute.js's new `prompt_assembled`
// frame (latest one wins, cleared with the run) and collects the DISTINCT trace_id set a turn
// produces: a CHI turn is up to three top-level calls (qa -> quality-gate -> display), each minting
// its own trace, so a single-trace reader under-counts the turn. Both are stream-derived only.
// DeepBench v7.0.0 | useHarnessStream.js | LAV-1a -- run a capability request and consume its
// live event stream outside the CHI screen. Reuses the CHI screen's exported primitives --
// one implementation, two consumers (FEATURE: LAV-1). CHI's own wiring is intentionally not
// refactored onto this hook.
// FEATURE: LAV-1a
import { useState, useRef, useCallback } from "react";
import { useAgents } from "./useAgents.js";
// FEATURE: LAV-1a -- resolveEventDuration/buildTransactionBoundaryEvent and pickCreditedSpan are
// NOT declared in MarketIntelligenceScreen.jsx (it imports them itself from these two modules), so
// this hook imports them from their real single source rather than laundering them through a
// re-export on the screen. Same function identity either way; one fewer indirection.
import { resolveEventDuration, resolveDelegationDuration, buildTransactionBoundaryEvent } from "../lib/turnTracking.js";
import { pickCreditedSpan } from "../lib/tracePatterns.js";
import {
  runQaWithQualityGate, buildHopEvent, describeDelegationEvent,
} from "../screens/MarketIntelligenceScreen.jsx";

export function useHarnessStream() {
  const agents = useAgents();
  const [events, setEvents] = useState([]);        // same stored-event shape as CHI's pipelineEvents
  const [status, setStatus] = useState(null);      // { message, kind, startedAt, expectationMs } | null
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);      // terminal result frame, verbatim
  const [error, setError] = useState(null);
  const [recovery, setRecovery] = useState(null);  // last HAR-17 recovery notice | null
  // FEATURE: LAV-1d -- the latest assembled prompt this run streamed, verbatim. Replaced by each
  // new arrival (the box always shows the agent currently working), null until one arrives and
  // null again on clear()/a new run. Never synthesized: every field is the emit's own.
  const [prompt, setPrompt] = useState(null);      // { agentId, system_prompt, prompt_chars, trace_id, span_id, toIntentSlug } | null
  // FEATURE: LAV-1d -- every DISTINCT trace_id seen this run, in arrival order. Collected from the
  // raw frames (each one carries its own trace_id, §19p) rather than inferred, because one turn
  // spans up to three top-level calls and each mints its own trace.
  const [traceIds, setTraceIds] = useState([]);
  const traceIdsRef = useRef([]);
  const lastEventAtRef = useRef(null);
  const runIdRef = useRef(0);
  // FEATURE: LAV-1a -- synchronous source of truth for the event array, mirroring CHI's
  // pipelineEventsRef (CHI-23): `next` is computed against the ref and the ref is assigned in plain
  // JS BEFORE setEvents is called, so two events arriving inside one tick can't clobber each other.
  const eventsRef = useRef([]);
  // FEATURE: LAV-1a -- mirrors CHI's pendingDelegationsRef (MI-52/LOO-009b): Map<awaitingAgentId,
  // { id, key }> of still-pending "X is routing to Y" rows, replaced in place by the next event
  // logged for that agent. Bookkeeping only, never read for rendering.
  const pendingDelegationsRef = useRef(new Map());
  const runningRef = useRef(false);

  // Mirrors MarketIntelligenceScreen.jsx's logEvent (~L3691) exactly, including the pending-row
  // replace-in-place path -- without it a 'delegation' placeholder would sit duplicated above its
  // own completion row and AuditColumn would render a hop list CHI never produces.
  const logEvent = (evt, { replaces } = {}) => {
    const prev = eventsRef.current;
    const pending = pendingDelegationsRef.current.get(evt.agentId);
    let next;
    if (pending) {
      pendingDelegationsRef.current.delete(evt.agentId);
      next = prev.map(e => (e.id === pending.id ? { ...evt, id: pending.id } : e));
    } else if (replaces) {
      const id = prev.length;
      pendingDelegationsRef.current.set(replaces.awaitingAgentId, { id, key: replaces.key });
      next = [...prev, { ...evt, id }];
    } else {
      next = [...prev, { ...evt, id: prev.length }];
    }
    eventsRef.current = next;
    setEvents(next);
  };

  // FEATURE: LAV-1d -- a plain append, deliberately NOT logEvent: logEvent's pending-row path
  // (MI-52/LOO-009b) would let a `prompt_assembled` frame CLAIM the still-open "X is routing to Y"
  // row registered for that same agent, erasing the delegation event the canvas derives its edge
  // from. A prompt frame awaits nothing and replaces nothing, so it never touches that map.
  const appendEvent = (evt) => {
    const next = [...eventsRef.current, { ...evt, id: eventsRef.current.length }];
    eventsRef.current = next;
    setEvents(next);
  };

  // FEATURE: LAV-1d -- record this frame's own trace. Order is arrival order and duplicates are
  // dropped; a frame with no trace_id contributes nothing (never a fabricated id).
  const noteTrace = (evt) => {
    const t = evt?.trace_id ?? evt?.data?.trace_id ?? null;
    if (!t || traceIdsRef.current.includes(t)) return;
    traceIdsRef.current = [...traceIdsRef.current, t];
    setTraceIds(traceIdsRef.current);
  };

  // Mirrors CHI's setStatus writer (~L3642): same merge semantics -- an omitted expectation/
  // expectationMs carries the previous turn's value forward, turnStartedAt survives every hop swap,
  // and startedAt resets on each new hop so the consumer's elapsed timer restarts with it.
  const writeStatus = (message, { expectation, expectationMs, kind = 'scripted' } = {}) =>
    setStatus(prev => ({
      message,
      startedAt: Date.now(),
      turnStartedAt: prev?.turnStartedAt ?? Date.now(),
      expectation: expectation !== undefined ? expectation : (prev?.expectation ?? null),
      expectationMs: expectationMs !== undefined ? expectationMs : (prev?.expectationMs ?? 120000),
      kind,
    }));

  // Mirrors MarketIntelligenceScreen.jsx's onDelegationProgress (~L3724-3749) exactly:
  // same attribution branch, same data fields, same span spread, same arrival-delta timing.
  const onDelegationProgress = (evt) => {
    noteTrace(evt); // FEATURE: LAV-1d -- every frame, every type, before any branch
    // FEATURE: LAV-1d -- `prompt_assembled` is NOT a delegation frame: it names one agent, has no
    // from/to pair, and must never reach describeDelegationEvent (which would render a nameless
    // "is routing to" line) or resolveEventDuration (which returns undefined for it and would trip
    // buildHopEvent's CHI-07 console.error). It gets the same real arrival-delta duration the
    // delegation frames get, and the same running clock update, so the console's merged timeline
    // stays a single honest sequence.
    if (evt.type === 'prompt_assembled') {
      setPrompt({
        agentId: evt.agentId ?? null,
        system_prompt: evt.system_prompt ?? null,
        prompt_chars: evt.prompt_chars ?? 0,
        trace_id: evt.trace_id ?? null,
        span_id: evt.span_id ?? null,
        toIntentSlug: evt.toIntentSlug ?? null,
      });
      const promptAt = Date.now();
      const promptDurationMs = resolveDelegationDuration(promptAt, lastEventAtRef.current);
      lastEventAtRef.current = promptAt;
      appendEvent(buildHopEvent('prompt_assembled', evt.agentId ?? null, {
        message: `${evt.agentId ?? "—"} · ${evt.prompt_chars ?? 0} chars`,
        prompt_chars: evt.prompt_chars ?? 0,
        trace_id: evt.trace_id ?? null, span_id: evt.span_id ?? null,
      }, promptDurationMs, {}));
      return;
    }
    const message = describeDelegationEvent(evt, agents);
    writeStatus(message, { kind: 'orchestration' });
    const now = Date.now();
    const durationMs = resolveEventDuration(evt.type, { nowMs: now, lastEventAtMs: lastEventAtRef.current });
    lastEventAtRef.current = now;
    if (evt.type === 'delegation_complete' || evt.type === 'delegation_return') {
      const attributedAgentId = evt.type === 'delegation_complete' ? evt.toAgentId : evt.fromAgentId;
      logEvent(buildHopEvent(evt.type, attributedAgentId, { message, viaTool: evt.viaTool || null, reasoning: evt.reasoning ?? null, task: evt.task ?? null, toCapabilitySlug: evt.toCapabilitySlug ?? null, ...pickCreditedSpan(evt) }, durationMs, {}));
      return;
    }
    const correlationKey = `${evt.fromAgentId}:${evt.toAgentId}:${evt.viaTool || ''}`;
    logEvent(buildHopEvent(evt.type, evt.fromAgentId, { message, viaTool: evt.viaTool || null, ...pickCreditedSpan(evt) }, durationMs, { secondaryAgentId: evt.type === 'delegation' ? evt.toAgentId : null }), { replaces: { key: correlationKey, awaitingAgentId: evt.toAgentId } });
  };

  // FEATURE: HAR-17 / §19o -- a recovered hop is never silent. The hook owns the user-visible half
  // (the snag line on the live status), and hands the raw notice to the consumer, which owns the
  // expectation extension: the re-run's p90 lives in the agentActivity summary this hook does not
  // fetch, and inventing a duration here would be a fabricated value (LAV-1's hard rule).
  const onRecovery = (r) => {
    setRecovery(r);
    setStatus(prev => (prev ? { ...prev, message: "Hit a snag — recovered automatically, continuing…", kind: 'orchestration' } : prev));
  };

  // FEATURE: LAV-1d will extend this hook with the confirmation-resolve path
  // (resolveConfirmation()/HITL) -- deliberately not wired this session.

  const runQuestion = useCallback(async (text, { conversationContext = [], backgroundContext = null } = {}) => {
    if (runningRef.current) return null; // guard re-entry -- one live turn at a time
    runningRef.current = true;
    const myRun = ++runIdRef.current;
    const isStale = () => runIdRef.current !== myRun;
    const turnStart = Date.now();
    // FEATURE: CHI-56 (mirrored) -- seeding to turnStart makes the first hop's duration mean "time
    // from this question starting to this hand-off", not "time since the previous question ended".
    lastEventAtRef.current = turnStart;
    setRunning(true);
    setResult(null);
    setError(null);
    setRecovery(null);
    // FEATURE: LAV-1d -- a new run starts with no prompt and no traces of its own; the box shows
    // its idle copy until this turn's first real frame lands, and the poller has nothing to query.
    setPrompt(null);
    traceIdsRef.current = [];
    setTraceIds([]);
    // FEATURE: CHI-04 (mirrored) -- the question divider only appears between questions, never
    // above the first one of a fresh session.
    if (eventsRef.current.length > 0) logEvent(buildTransactionBoundaryEvent("start", turnStart));
    writeStatus("Marcus is thinking…");
    try {
      const onProgress = (evt) => { if (!isStale()) onDelegationProgress(evt); };
      const res = await runQaWithQualityGate(
        text,
        conversationContext,
        (evt) => { if (!isStale()) logEvent(evt); },
        writeStatus,
        onProgress,
        isStale,
        backgroundContext,
        onRecovery,
      );
      if (isStale()) return null;
      setResult(res);
      return res;
    } catch (err) {
      if (isStale()) return null;
      setError(err);
      return null;
    } finally {
      if (!isStale()) {
        setStatus(null);
        setRunning(false);
      }
      runningRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agents]);

  const clear = useCallback(() => {
    runIdRef.current += 1; // invalidates any in-flight run's results (CHI's clearGenerationRef pattern)
    eventsRef.current = [];
    pendingDelegationsRef.current = new Map();
    lastEventAtRef.current = null;
    runningRef.current = false;
    traceIdsRef.current = []; // FEATURE: LAV-1d
    setPrompt(null);
    setTraceIds([]);
    setEvents([]);
    setStatus(null);
    setRunning(false);
    setResult(null);
    setError(null);
    setRecovery(null);
  }, []);

  return { events, status, running, result, error, recovery, prompt, traceIds, runQuestion, clear };
}
