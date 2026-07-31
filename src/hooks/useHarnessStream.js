// DeepBench v7.0.8 | useHarnessStream.js | AA-179a -- captures the assembly event family
// (`assembly_work` / `assembly_work_complete`, AA-179c's enrichment-seam emit) into the same run
// ledger, via a plain append with a real arrival-delta duration. Inert until AA-179c ships: no
// frame of either type exists anywhere yet, and nothing renders differently today.
// DeepBench v7.0.6 | useHarnessStream.js | LAV-1f -- human-in-the-loop: a run that ends on the
// harness's real confirmation gate (`status:'pending_confirmation'`) is held in a `pending` state
// read verbatim off that frame, and resolveConfirmation() dispatches the decision through the same
// `action:'resolve'` request CHI sends, streaming the continuation back into THIS run's ledger and
// trace set. Nothing here auto-resolves, times out, or defaults a decision.
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
  runQaWithQualityGate, buildHopEvent, describeDelegationEvent, readSSEResult,
} from "../screens/MarketIntelligenceScreen.jsx";

// FEATURE: LAV-1f -- mirrors MarketIntelligenceScreen.jsx's MAX_CONTINUE_ITERATIONS (~L1314): the
// client-side safety cap on a checkpoint-continue chain, same value, same meaning.
const MAX_CONTINUE_ITERATIONS = 10;
// FEATURE: LAV-1f -- the endpoint every capability request on the platform goes through (§19b).
const EXECUTE_ENDPOINT = "/api/capabilities/execute";

// FEATURE: LAV-1f -- `stream:true` is a REQUEST, not a guarantee, and the resolve endpoint honours
// it selectively: api/capabilities/execute.js streams the accept and edit branches (both re-enter
// the harness and have real events to emit) but answers reject with plain JSON from
// resolvePendingConfirmation() -- a single row update with nothing to stream. Found live this
// session: reading the reject response as SSE throws "Stream ended without a result event" while
// the rejection has in fact already succeeded server-side. CHI never hit this because its own
// resolve call passes no onProgress at all and so always takes the JSON path. Branching on what
// the response actually IS covers both, and stays correct if a branch's streaming changes later.
async function readCapabilityResponse(res, onProgress) {
  const isStream = (res.headers.get("content-type") || "").includes("text/event-stream");
  return isStream ? readSSEResult(res, onProgress) : res.json();
}

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
  // FEATURE: LAV-1f -- the harness's confirmation gate, held verbatim off the frame that opened it.
  // Non-null means the run is genuinely paused on a human decision and nothing continues until one
  // is dispatched. `resolving` is the same gate while its decision request is in flight -- both are
  // real request state, neither is a display flag.
  const [pending, setPending] = useState(null);     // { confirmation_id, agentId, capability_slug, proposed_action, critique, depth } | null
  const [resolving, setResolving] = useState(null); // { confirmation_id, agentId, resolution } | null
  const pendingRef = useRef(null);
  const resolvingRef = useRef(null);
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
    // FEATURE: AA-179a -- the assembly event family (`assembly_work` / `assembly_work_complete`) is
    // emitted from the enrichment seam (AA-179c), not the delegation seam: a frame names ONE worker
    // and carries no from/to pair, so it must never reach describeDelegationEvent (nameless "is
    // routing to" line) or resolveEventDuration (no rule for these types -> undefined -> CHI-07
    // console.error in buildHopEvent). Same posture as prompt_assembled above: real arrival-delta
    // duration, the same running-clock update, and a PLAIN appendEvent -- never logEvent, whose
    // pending-row path (MI-52/LOO-009b) would let an assembly frame CLAIM the still-open "X is
    // routing to Y" row registered for that same agent. An assembly frame awaits nothing and
    // replaces nothing. It also writes no prompt and no status line: the scripted status stays as
    // it is, and the canvas treatment is AA-179b's. Every field below is the frame's own -- carried
    // only when the frame actually has it (a real 0 is data; a missing field is omitted, never
    // defaulted into the ledger).
    if (evt.type === 'assembly_work' || evt.type === 'assembly_work_complete') {
      const assemblyAt = Date.now();
      const assemblyDurationMs = resolveDelegationDuration(assemblyAt, lastEventAtRef.current);
      lastEventAtRef.current = assemblyAt;
      const who = evt.agentId ?? "—";
      const assemblyMessage = evt.work === 'fetch'
        ? `${who} · ${evt.source} · ${evt.matchCount ?? 0} chunks`
        : `${who} · ${evt.work}${evt.type === 'assembly_work_complete' && evt.tokens != null ? ` · ${evt.tokens} tok` : ''}`;
      const assemblyData = { message: assemblyMessage };
      for (const [k, v] of Object.entries({
        work: evt.work, source: evt.source, matchCount: evt.matchCount, tokens: evt.tokens,
        model: evt.model, forAgentId: evt.forAgentId, trace_id: evt.trace_id, span_id: evt.span_id,
      })) {
        if (v != null) assemblyData[k] = v;
      }
      appendEvent(buildHopEvent(evt.type, evt.agentId ?? null, assemblyData, assemblyDurationMs, {}));
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

  // FEATURE: LAV-1f -- the confirmation gate, read straight off the terminal frame the harness
  // returns. Field names are execute.js's own (runCapability()'s pending_confirmation early return,
  // read fresh this session at api/capabilities/execute.js ~L1058:
  //   { status:'pending_confirmation', confirmation_id, proposed_action, critique, depth,
  //     agent_id, capability_slug }
  // -- note the frame carries NO intent_slug; the confirmation_id already encodes which
  // capability/agent/intent it belongs to, which is why the resolve request needs nothing else).
  // Nothing below is derived, defaulted to a guess, or renamed. Returns whether a gate opened.
  const notePending = (frame) => {
    if (frame?.status !== 'pending_confirmation' || !frame.confirmation_id) return false;
    const gate = {
      confirmation_id: frame.confirmation_id,
      agentId: frame.agent_id ?? null,
      capability_slug: frame.capability_slug ?? null,
      proposed_action: frame.proposed_action ?? null,
      critique: frame.critique ?? null,
      depth: frame.depth ?? null,
    };
    pendingRef.current = gate;
    setPending(gate);
    return true;
  };

  // Mirrors MarketIntelligenceScreen.jsx's resolveInProgress (~L1333). That function is
  // module-private there and this session must not modify that file, so the loop is mirrored here
  // exactly as logEvent/writeStatus/onDelegationProgress already are: same `continue` action, same
  // HAR-17 recovery exemption from the client cap, same CHI-04 stale bail-out, same throw on a
  // terminal 'failed' row. Without it a resolve that checkpoints server-side would surface
  // {status:'in_progress'} to this screen as though it were a terminal result.
  const continueChain = async (result, onProgress, isStale) => {
    let iterations = 0;
    while (result.status === "in_progress") {
      if (isStale()) return result;
      if (result.recovery) {
        if (!isStale()) onRecovery(result.recovery);
      } else if (++iterations > MAX_CONTINUE_ITERATIONS) {
        throw new Error(`Chain did not complete after ${MAX_CONTINUE_ITERATIONS} continuations (job_id: ${result.job_id})`);
      }
      const res = await fetch(EXECUTE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "continue", job_id: result.job_id, stream: true }),
      });
      if (!res.ok) throw new Error(`continue (job_id: ${result.job_id}) failed: ${res.status}`);
      result = await readCapabilityResponse(res, onProgress);
    }
    if (result.status === 'failed') {
      throw Object.assign(new Error(result.error || 'chain failed'), { status: 500 });
    }
    return result;
  };

  // FEATURE: LAV-1f -- dispatch the human's decision on the open gate. The request body is byte-for-
  // byte the one MarketIntelligenceScreen.jsx's resolveConfirmation() sends (~L1424-1429):
  //   { action:'resolve', confirmation_id, resolution, edited_task_context, stream }
  // with stream:true so that WHEN the branch taken has events (accept/edit re-enter the harness),
  // every one of them runs through the SAME progress router the original run used -- so its hops
  // append to this run's ledger and its trace_ids join this run's set (noteTrace) instead of
  // starting a second, disconnected run. Reject has no events and answers in plain JSON; see
  // readCapabilityResponse above, which is why the reader branches on the response, not the ask.
  // `pending` is cleared the moment the decision is dispatched: the gate is no longer open, the run
  // is live again. `resolving` carries the same gate until the request settles, which is what lets
  // the canvas keep the human on stage through the hand-back instead of blinking it out mid-pulse.
  // edited_task_context stays null here: it is the ORIGINAL request's task_context re-authored, so
  // only the flow that built that request can honestly produce one (CHI builds it from hypFlow).
  // This screen never built it, so it offers the two decisions that need nothing but the
  // confirmation_id -- accept and reject -- and never fabricates a task context to enable a third.
  const resolveConfirmation = useCallback(async (resolution) => {
    const gate = pendingRef.current;
    if (!gate || resolvingRef.current || runningRef.current) return null;
    const myRun = ++runIdRef.current;
    const isStale = () => runIdRef.current !== myRun;
    const dispatched = { confirmation_id: gate.confirmation_id, agentId: gate.agentId, capability_slug: gate.capability_slug, resolution };
    resolvingRef.current = dispatched;
    runningRef.current = true;
    pendingRef.current = null;
    setPending(null);
    setResolving(dispatched);
    setRunning(true);
    setResult(null);
    setError(null);
    setRecovery(null);
    // The next event's duration means "time from the decision to the harness's first move", the
    // same arrival-delta semantics every other hop on this screen carries.
    lastEventAtRef.current = Date.now();
    try {
      const onProgress = (evt) => { if (!isStale()) onDelegationProgress(evt); };
      const res = await fetch(EXECUTE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resolve",
          confirmation_id: gate.confirmation_id,
          resolution,
          edited_task_context: null,
          stream: true,
        }),
      });
      // Mirrors CHI's own failure read (DAT-7/HAR-15): the body carries the real denial tier, so it
      // is forwarded onto the error rather than collapsed into a status code.
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw Object.assign(new Error(body.error || `resolve ${resolution} failed: ${res.status}`),
          { status: res.status, upstreamStatus: body.upstreamStatus, failureClass: body.failureClass, faultCode: body.faultCode, detail: body.detail || null });
      }
      const first = await readCapabilityResponse(res, onProgress);
      const settled = await continueChain(first, onProgress, isStale);
      if (isStale()) return null;
      setResult(settled);
      // A resolve can itself open a new gate (an edit round-trip re-runs the capability, which hits
      // the same confirmation gate again). Terminal handling is identical to a normal run's.
      notePending(settled);
      return settled;
    } catch (err) {
      if (isStale()) return null;
      setError(err);
      return null;
    } finally {
      if (!isStale()) {
        setStatus(null);
        setRunning(false);
        setResolving(null);
      }
      resolvingRef.current = null;
      runningRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agents]);

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
    // FEATURE: LAV-1f -- a new question never inherits the previous run's gate.
    pendingRef.current = null;
    setPending(null);
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
      // FEATURE: LAV-1f -- if this turn ended on the harness's confirmation gate, the run is paused
      // on a human, not finished. Read generically off the frame's own status; an ordinary terminal
      // never creates a gate.
      notePending(res);
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
    pendingRef.current = null;   // FEATURE: LAV-1f
    resolvingRef.current = null; // FEATURE: LAV-1f
    setPrompt(null);
    setPending(null);
    setResolving(null);
    setTraceIds([]);
    setEvents([]);
    setStatus(null);
    setRunning(false);
    setResult(null);
    setError(null);
    setRecovery(null);
  }, []);

  return { events, status, running, result, error, recovery, prompt, traceIds, pending, resolving, runQuestion, resolveConfirmation, clear };
}
