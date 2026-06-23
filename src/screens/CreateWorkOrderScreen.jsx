// DeepBench v5.2.23 | CreateWorkOrderScreen.jsx | AW-28: Prompt Evolution Modal wired as first consumer
// FEATURE: AW-24 — Renamed to Create Work Order
// FEATURE: AW-25 — PM agent picker
// FEATURE: AW-26 — DB-driven deliverable tiles from Format Skill traits
// FEATURE: AW-27 — Streaming RAG goal suggestion

import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { T, display, body, mono } from "../tokens.js";
import { TENANT_ID, CURRENT_USER } from "../config.js";
import { AppShell } from "../AppShell.jsx";
import { Corners, AgentAvatar, AiBadge, Toast, FeatureBadge } from "../components/SharedUI.jsx";
import PromptEvolutionModal from "../components/PromptEvolutionModal.jsx";
import { useAgents } from "../hooks/useAgents.js";
import { logAICall } from "../hooks/useAIActivity.js";
import { supabase } from "../lib/supabase.js";
import { mergeSteps } from "../utils/mergeSteps.js";
import { AI_PAT, AGENT_PATTERNS } from "../aiPatterns.js";

const MICHELLE = { name: "Michelle Manning", code: "PP-01", initials: "MM" };

function resolveTitle(suggested, goal) {
  if (suggested && suggested.trim().length > 0) return suggested;
  return goal.split(" ").slice(0, 8).join(" ");
}

// FEATURE: SK-20 — replaces hardcoded Anthropic call with Prompt Service pipeline
async function callPlanningAgent(goal, agents, selectedPMAgent, selectedDeliverable, priorQAs = []) {
  const t0 = Date.now();

  const runtimeContextRaw = priorQAs.length > 0
    ? priorQAs.filter(qa => qa.a).map(qa => `Q: ${qa.q}\nA: ${qa.a}`).join('\n\n')
    : null;
  const runtime_context = runtimeContextRaw?.length ? runtimeContextRaw : null;

  try {
    const res = await fetch('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'prompt-service',
        agent_id: selectedPMAgent?.id || 'michelle',
        capability_slug: 'project-manager', // BUG-01 fix: cap-pm-01 does not exist in DB — correct slug is project-manager
        tenant_id: TENANT_ID,
        goal,
        deliverable_type: selectedDeliverable?.id || null,
        runtime_context,
      }),
    });
    const data = await res.json();
    const latency = Date.now() - t0;

    if (!data.content?.steps?.length) {
      // Single retry
      const retry = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'prompt-service',
          agent_id: selectedPMAgent?.id || 'michelle',
          capability_slug: 'project-manager', // BUG-01 fix: cap-pm-01 does not exist in DB — correct slug is project-manager
          tenant_id: TENANT_ID,
          goal,
          deliverable_type: selectedDeliverable?.id || null,
          runtime_context,
        }),
      });
      const retryData = await retry.json();
      if (!retryData.content?.steps?.length) return { ok: false, error: 'No steps returned after retry' };
      logAICall({ type: 'planning', model: 'prompt-service', latencyMs: Date.now() - t0, tokens: 0, location: 'Create Work Order', agentId: 'michelle' });
      return { ok: true, plan: retryData.content };
    }

    logAICall({ type: 'planning', model: 'prompt-service', latencyMs: latency, tokens: 0, location: 'Create Work Order', agentId: 'michelle' });
    return { ok: true, plan: data.content };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// FEATURE: AW-UX-10 — Agent hover card
function AgentHoverCard({ agent }) {
  if (!agent) return null;
  return (
    <div style={{
      position: "absolute", bottom: "calc(100% + 6px)", left: 0, zIndex: 50,
      background: T.navy, border: `1px solid rgba(182,135,58,0.3)`, borderRadius: 8,
      boxShadow: "0 4px 12px rgba(0,0,0,0.2)", padding: "10px 12px", minWidth: 190, pointerEvents: "none",
    }}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
        <div style={{width:28,height:28,borderRadius:"50%",border:`1.5px solid ${agent.color||T.brass}`,background:T.navyMid,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:mono,fontSize:9,fontWeight:700,color:agent.color||T.brass,flexShrink:0}}>
          {agent.name.split(" ").map(n=>n[0]).join("")}
        </div>
        <div>
          <div style={{fontFamily:body,fontSize:12,fontWeight:600,color:"#fff",lineHeight:1.2}}>{agent.name}</div>
          <div style={{fontFamily:mono,fontSize:9,color:"rgba(182,135,58,0.8)"}}>{agent.code}</div>
        </div>
      </div>
      <div style={{fontFamily:body,fontSize:10,color:"rgba(255,255,255,0.65)",marginBottom:agent.quip?5:0}}>{agent.role}</div>
      {agent.quip && <div style={{fontFamily:body,fontSize:10,color:"rgba(255,255,255,0.45)",fontStyle:"italic"}}>{agent.quip.replace(/^"|"$/g,"")}</div>}
    </div>
  );
}

// ── Step Card ─────────────────────────────────────────────────────────────────
function StepCard({ step, agent, onRemove, index, onStepLabelChange, onArchiveStep, onKeepStep }) {
  const [hovered, setHovered] = useState(false);
  const [labelValue, setLabelValue] = useState(step.label);
  useEffect(() => { setLabelValue(step.label); }, [step.label]);
  const agentEntry = step.agentId ? (AGENT_PATTERNS[step.agentId] ?? null) : null;
  const isHITL = step.type==="hitl", isSub = step.type==="subagent";
  const bl = isHITL?T.flag:isSub?"#2d6fb5":T.brassDeep;
  const isNew = step.mergeStatus === "new";

  return (
    <>
      <div style={{background:T.card,border:`1px solid ${T.line}`,borderLeft:`3px solid ${bl}`,padding:"11px 14px",position:"relative",display:"flex",gap:10,alignItems:"flex-start",marginBottom:step.pendingArchive?0:8,borderRadius:4}}>
        {isNew && (
          <div style={{position:"absolute",top:7,right:32,background:T.moss,color:"#fff",fontFamily:mono,fontSize:8,fontWeight:700,padding:"1px 6px",borderRadius:2,letterSpacing:0.3,pointerEvents:"none"}}>NEW</div>
        )}
        <div style={{flexShrink:0,textAlign:"center",minWidth:24}}>
          <div style={{fontFamily:mono,fontSize:8,color:T.muted,marginBottom:2}}>{String(index+1).padStart(2,"0")}</div>
          <div>{step.icon}</div>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:6,marginBottom:3}}>
            {onStepLabelChange ? (
              <input value={labelValue} onChange={e => setLabelValue(e.target.value)}
                onFocus={e => { e.target.style.borderBottom = `2px solid ${T.brass}`; }}
                onBlur={e => { e.target.style.borderBottom = "2px solid transparent"; if (e.target.value !== step.label) onStepLabelChange(step.id, e.target.value); }}
                onMouseEnter={e => { if (document.activeElement !== e.target) e.target.style.borderBottom = `2px dashed ${T.line}`; }}
                onMouseLeave={e => { if (document.activeElement !== e.target) e.target.style.borderBottom = "2px solid transparent"; }}
                style={{fontFamily:display,fontSize:12,fontWeight:600,color:T.navy,background:"transparent",border:"none",borderBottom:"2px solid transparent",outline:"none",padding:0,flex:1,boxSizing:"border-box"}}
              />
            ) : (
              <span style={{fontFamily:display,fontSize:12,fontWeight:600,color:T.navy,flex:1}}>{step.label}</span>
            )}
            <div style={{flexShrink:0,display:"flex",gap:4,alignItems:"center"}}>
              {isHITL && <span style={{fontFamily:mono,fontSize:7.5,padding:"1px 5px",background:"rgba(168,51,25,.1)",color:T.flag,border:`1px solid rgba(168,51,25,.3)`,fontWeight:700}}>● HUMAN</span>}
              {isSub  && <span style={{fontFamily:mono,fontSize:7.5,padding:"1px 5px",background:"rgba(45,111,181,.1)",color:"#2d6fb5",border:`1px solid rgba(45,111,181,.3)`,fontWeight:700}}>⇆ SUB-AGENT {agentEntry && <AiBadge label={agentEntry.patterns} built={agentEntry.built}/>}</span>}
              {!isHITL&&!isSub && <span style={{fontFamily:mono,fontSize:7.5,padding:"1px 5px",background:`rgba(182,135,58,.1)`,color:T.brassDeep,border:`1px solid rgba(182,135,58,.25)`}}>Agent {agentEntry && <AiBadge label={agentEntry.patterns} built={agentEntry.built}/>}</span>}
            </div>
          </div>
          {agent && !isHITL && !isSub && (
            <div style={{marginBottom:4,display:"flex",alignItems:"center",gap:4}}>
              <span onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
                style={{position:"relative",cursor:"default",display:"inline-flex",alignItems:"center",gap:5}}>
                <AgentAvatar who={agent.id} size={14} ring={false}/>
                <span style={{fontFamily:mono,fontSize:9,color:T.brassDeep}}>{agent.name} · {agent.code}</span>
                {hovered && <AgentHoverCard agent={agent}/>}
              </span>
              {agentEntry && <AiBadge label={agentEntry.patterns} built={agentEntry.built}/>}
            </div>
          )}
          {isHITL && (
            <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}>
              <div style={{width:14,height:14,borderRadius:"50%",border:`1px solid ${T.lineSoft}`,background:T.cardAlt,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:mono,fontSize:7,fontWeight:700,color:T.muted}}>Y</div>
              <span style={{fontFamily:body,fontSize:11,color:T.muted}}>You · Action Required</span>
            </div>
          )}
          <div style={{fontFamily:body,fontSize:11,color:T.mutedDeep,lineHeight:1.5}}>{step.text}</div>
          {step.note && <div style={{fontFamily:mono,fontSize:8,color:isHITL?T.flag:isSub?"#2d6fb5":T.moss,marginTop:3,fontStyle:"italic"}}>{step.note}</div>}
        </div>
        <button onClick={()=>onRemove(step.id)} title="Remove step"
          style={{background:"transparent",border:"none",color:T.muted,cursor:"pointer",fontSize:12,padding:"0 4px",flexShrink:0,lineHeight:1}}>✕</button>
      </div>
      {step.pendingArchive && onArchiveStep && onKeepStep && (
        <div style={{marginLeft:32,marginBottom:8}}>
          <div style={{fontFamily:mono,fontSize:9,color:"#9ca3af",textTransform:"uppercase",letterSpacing:0.5,marginBottom:3}}>↳ PREVIOUSLY THIS STEP</div>
          <div style={{border:"1px dashed #d1d5db",borderLeft:"3px solid #d1d5db",background:"#f9fafb",borderRadius:4,padding:"9px 12px",opacity:0.9}}>
            <div style={{fontFamily:display,fontSize:12,fontWeight:600,color:"#6b7280",marginBottom:2}}>{step.pendingArchive.label}</div>
            {step.pendingArchive.text && <div style={{fontFamily:body,fontSize:11,color:"#9ca3af",lineHeight:1.5,marginBottom:4}}>{step.pendingArchive.text}</div>}
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:4}}>
              <button onClick={()=>onKeepStep(step, step.pendingArchive)} style={{background:"white",border:"1px solid #6b7280",color:"#374151",padding:"4px 10px",cursor:"pointer",fontFamily:body,fontSize:11,borderRadius:3}}>Keep</button>
              <button onClick={()=>onArchiveStep(step.pendingArchive)} style={{background:T.flag,color:"#fff",border:"none",padding:"4px 10px",cursor:"pointer",fontFamily:body,fontSize:11,fontWeight:600,borderRadius:3}}>Archive</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function CreateWorkOrderScreen() {
  const navigate   = useNavigate();
  const [params]   = useSearchParams();
  const agents     = useAgents();

  const prefillAgent = params.get("agent");
  const rawQ         = params.get("q") ? decodeURIComponent(params.get("q")) : "";
  const prefillGoal  = rawQ.split("?")[0].trim();

  // FEATURE: AW-25 — PM agent picker
  const [selectedPMAgent,     setSelectedPMAgent]     = useState(null);
  // FEATURE: AW-26 — DB-driven deliverable tiles
  const [deliverables,        setDeliverables]        = useState([]);
  const [selectedDeliverable, setSelectedDeliverable] = useState(null);
  // FEATURE: AW-27 — streaming goal suggestion
  const [goalStreaming,       setGoalStreaming]        = useState(false);
  const abortControllerRef = useRef(null);

  const [goal,            setGoal]            = useState(prefillGoal);
  const [selectedAgent,   setSelectedAgent]   = useState(null);

  useEffect(() => {
    if (prefillAgent && agents.length > 0) {
      const agentObj = agents.find(a => a.id === prefillAgent);
      if (agentObj) setSelectedAgent(agentObj);
    }
  }, [prefillAgent, agents]);

  const [steps,           setSteps]           = useState([]);
  const [mergedSteps,     setMergedSteps]     = useState({ active: [], archived: [] });
  const [questions,       setQuestions]       = useState([]);
  const [answers,         setAnswers]         = useState({});
  const [planSummary,     setPlanSummary]      = useState("");
  const [agentReason,     setAgentReason]      = useState("");
  const [generating,      setGenerating]       = useState(false);
  const [planGenerated,   setPlanGenerated]    = useState(false);
  const [changeLog,       setChangeLog]        = useState([]);
  const [showChangeLog,   setShowChangeLog]    = useState(false);
  const [saveState,       setSaveState]        = useState("idle");
  const [toast,           setToast]            = useState(null);
  const [titleData,       setTitleData]        = useState({ taskTitle: "", michelleTitle: "", stepTitles: [], titleEdited: false });
  const goalRef         = useRef(null);

  // FEATURE: AW-28 — Prompt Evolution Modal state
  const [promptPreview, setPromptPreview] = useState(null);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const planResultRef = useRef(null);
  const planReadyRef = useRef(false);

  const [chatContext, setChatContext] = useState(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('chatContext');
    if (raw && params.get('from') === 'chat') {
      try {
        const parsed = JSON.parse(raw);
        setChatContext(parsed);
        sessionStorage.removeItem('chatContext');
      } catch(e) { /* ignore */ }
    }
  }, [params]);

  const showToast = (msg,icon="✓") => { setToast({msg,icon}); setTimeout(()=>setToast(null),3000); };

  const pendingQs   = questions.filter(q=>!answers[q.id]);
  const allAnswered = pendingQs.length === 0;
  const canGenerate = selectedPMAgent && selectedDeliverable && goal.trim().length > 8;

  const saveLabel = saveState==="draft" ? `Draft · ${pendingQs.length} question${pendingQs.length!==1?"s":""} pending`
                  : saveState==="ready" ? "Ready to launch · All questions answered"
                  : saveState==="saving"? "Saving…"
                  : saveState==="saved" ? "Saved ✓"
                  : "";

  // FEATURE: AW-26 — load deliverables from selected agent's Format Skill
  const loadDeliverables = async (agent) => {
    try {
      const { data: capData } = await supabase
        .from('agent_capability_assignments')
        .select('capability_slug')
        .eq('agent_id', agent.id)
        .eq('tenant_id', TENANT_ID)
        .limit(1)
        .single();
      if (!capData?.capability_slug) return;

      const { data: skillData } = await supabase
        .from('capability_skill_profiles')
        .select('skill_profile_slug')
        .eq('capability_slug', capData.capability_slug)
        .limit(10);
      if (!skillData?.length) return;

      const slugs = skillData.map(r => r.skill_profile_slug);
      const { data: profiles } = await supabase
        .from('skill_profiles')
        .select('slug, traits')
        .in('slug', slugs);

      const formatSkill = profiles?.find(p => p.traits?.output_type && p.traits?.deliverables);
      if (formatSkill?.traits?.deliverables) {
        setDeliverables(formatSkill.traits.deliverables);
      }
    } catch (e) {
      console.error('[loadDeliverables] error:', e);
    }
  };

  // FEATURE: AW-27 — auto-fire streaming goal suggestion on deliverable selection
  const handleDeliverableSelect = (deliverable) => {
    setSelectedDeliverable(deliverable);
    setGoal('');
    setPlanGenerated(false);

    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setGoalStreaming(true);
    let accumulated = '';

    fetch('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'suggest-goal',
        agent_id: selectedPMAgent?.id || 'michelle',
        capability_slug: 'project-manager', // BUG-01 fix: cap-pm-01 does not exist in DB — correct slug is project-manager
        deliverable_label: deliverable.label,
        deliverable_description: deliverable.description,
        tenant_id: TENANT_ID,
      }),
      signal: controller.signal,
    }).then(res => {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      const streamStart = Date.now();

      const read = () => reader.read().then(({ done, value }) => {
        if (done) {
          setGoalStreaming(false);
          logAICall({ type: 'goal_suggestion', model: 'claude-haiku-4-5-20251001', latencyMs: Date.now() - streamStart, tokens: 0, location: 'Create Work Order', agentId: selectedPMAgent?.id || 'michelle' });
          return;
        }
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(l => l.trim());
        for (const line of lines) {
          if (line === 'data: [DONE]') {
            setGoalStreaming(false);
            logAICall({ type: 'goal_suggestion', model: 'claude-haiku-4-5-20251001', latencyMs: Date.now() - streamStart, tokens: 0, location: 'Create Work Order', agentId: selectedPMAgent?.id || 'michelle' });
            return;
          }
          if (line.startsWith('data: ')) {
            try {
              const { text } = JSON.parse(line.slice(6));
              if (text) { accumulated += text; setGoal(accumulated); }
            } catch {}
          }
        }
        read();
      }).catch(() => setGoalStreaming(false));

      read();
    }).catch(e => {
      if (e.name !== 'AbortError') console.error('[suggest-goal] stream error:', e);
      setGoalStreaming(false);
    });
  };

  // FEATURE: AW-28 — extracted so Continue handler can invoke after modal closes
  const applyPlanResult = (result) => {
    if (result.ok) {
      const p = result.plan; // { steps, questions, title, planSummary, agentId, agentReason }
      if (steps.length > 0) {
        setChangeLog(prev=>[...prev,{
          ts: new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}),
          reason: "Plan regenerated with updated answers",
          archivedSteps: steps.map(s=>s.label).join(", "),
        }]);
      }
      const newSteps = p.steps || [];
      setMergedSteps(mergeSteps(mergedSteps.active, newSteps, mergedSteps.archived));
      setSteps(newSteps);
      setQuestions(p.questions||[]);
      setPlanSummary(p.planSummary||"");
      setAgentReason(p.agentReason||"");
      if (p.agentId) setSelectedAgent(p.agentId);
      setPlanGenerated(true);
      setSaveState(p.questions?.length?"draft":"ready");

      // Title from pipeline — no callTitleAgent needed
      setTitleData(prev => {
        if (prev.titleEdited) return prev;
        const resolved = resolveTitle(p.title, goal);
        return { taskTitle: resolved, michelleTitle: resolved, stepTitles: [], titleEdited: false };
      });
    } else {
      showToast("Planning agent failed: "+result.error,"⚠");
    }
    setGenerating(false);
  };

  // FEATURE: AW-28 — parallel preview-prompt + prompt-service
  const generatePlan = async () => {
    if (!canGenerate) return;
    setGenerating(true);
    setPlanGenerated(false);
    planResultRef.current = null;
    planReadyRef.current = false;

    const qas = questions.map(q => ({ q: q.q, a: answers[q.id] || '' }));
    const runtimeContext = qas.filter(qa => qa.a).map(qa => `Q: ${qa.q}\nA: ${qa.a}`).join('\n\n') || null;

    const previewPayload = {
      action: 'preview-prompt',
      agent_id: selectedPMAgent?.id || 'michelle',
      capability_slug: 'project-manager',
      tenant_id: TENANT_ID,
      goal,
      deliverable_type: selectedDeliverable?.id || 'execution-plan',
      runtime_context: runtimeContext,
    };

    // preview-prompt: non-blocking — show modal when ready
    fetch('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(previewPayload),
    })
      .then(r => r.json())
      .then(data => { if (!data.error) { setPromptPreview(data); setShowPromptModal(true); } })
      .catch(() => {});

    // prompt-service: awaited — store result for Continue handler
    const result = await callPlanningAgent(goal, agents, selectedPMAgent, selectedDeliverable, qas);
    planResultRef.current = result;
    planReadyRef.current = true;

    if (!showPromptModal) applyPlanResult(result);
  };

  const handlePromptModalContinue = () => {
    setShowPromptModal(false);
    setPromptPreview(null);
    if (planReadyRef.current && planResultRef.current) {
      applyPlanResult(planResultRef.current);
    }
  };

  const removeStep = (id) => {
    const s = steps.find(x=>x.id===id);
    if (s) setChangeLog(prev=>[...prev,{ts:new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}),reason:`Removed step: ${s.label}`,archivedSteps:s.label}]);
    setSteps(prev=>prev.filter(x=>x.id!==id));
    setMergedSteps(prev => ({ ...prev, active: prev.active.filter(x=>x.id!==id) }));
  };

  const handleArchiveStep = (oldStep) => {
    setMergedSteps(prev => ({
      active: prev.active.map(s => s.pendingArchive?.label === oldStep.label ? { ...s, pendingArchive: undefined } : s),
      archived: [...prev.archived, { ...oldStep, mergeStatus: "archived" }],
    }));
  };

  const handleKeepStep = (parentStep, oldStep) => {
    setMergedSteps(prev => {
      const idx = prev.active.findIndex(s => s.label === parentStep.label);
      const cleaned = prev.active.map(s => s.label === parentStep.label ? { ...s, pendingArchive: undefined } : s);
      cleaned.splice(idx + 1, 0, { ...oldStep, mergeStatus: "unchanged" });
      return { ...prev, active: cleaned };
    });
  };

  const answerQ = (id, val) => {
    setAnswers(prev=>({...prev,[id]:val}));
    const newPending = questions.filter(q=>q.id!==id&&!answers[q.id]).length + (!answers[id]&&val?-1:0);
    setSaveState(newPending===0?"ready":"draft");
  };

  const handleStepLabelChange = (stepId, newLabel) => {
    setMergedSteps(prev => ({
      ...prev,
      active: prev.active.map(s => s.id === stepId ? { ...s, label: newLabel } : s),
    }));
  };

  const handleSaveDraft = () => {
    setSaveState("saving");
    setTimeout(()=>{ setSaveState("draft"); showToast("Saved as draft — return to answer remaining questions"); },600);
  };

  // FEATURE: SH-06 — Supabase tasks integration
  const handleApprove = async () => {
    const activeSteps = mergedSteps.active.map(({ mergeStatus, pendingArchive, ...s }) => s);
    if (!selectedAgent || !activeSteps.length) { showToast("Generate a plan first", "⚠"); return; }
    setSaveState("saving");
    const taskTypeLabel = selectedDeliverable?.label || selectedDeliverable?.id || "Work Order";
    const qas = questions.map(q => ({ q: q.q, a: answers[q.id] || "" }));
    const { error } = await supabase.from("tasks").insert({
      tenant_id:    TENANT_ID,
      title:        titleData.taskTitle || goal.trim() || "Untitled Work Order",
      title_edited: titleData.titleEdited,
      agent_id:     selectedAgent?.id || selectedAgent,
      type:         taskTypeLabel,
      status:       "pending",
      priority:     "Normal",
      preview:      goal.slice(0, 120),
      has_hitl:     activeSteps.some(s => s.type === "hitl"),
      steps:        activeSteps,
      plan_history: {
        questions: qas.map((qa, i) => ({ id: i + 1, q: qa.q, a: qa.a || "" })),
        planSummary: steps.length > 0 ? `${steps.length} step plan` : "",
      },
      chat_origin: chatContext ? {
        agentId: chatContext.agentId, agentName: chatContext.agentName,
        question: chatContext.userQuestion, answer: chatContext.agentAnswer, timestamp: chatContext.timestamp,
      } : null,
    });
    if (error) {
      console.error("Task save error:", error);
      showToast("Save failed — check console", "✕");
      setSaveState("ready");
      return;
    }
    setSaveState("saved");
    showToast("Task launched ✦");
    setTimeout(() => navigate("/"), 900);
  };

  const selectedAgentObj = selectedAgent?.id ? selectedAgent : agents.find(a=>a.id===selectedAgent);

  return (
    <AppShell toast={toast} headerProps={{ showAIPanel: false }}>
      <div style={{flex:1,overflowY:"auto",background:T.paperDeep,padding:"20px 28px 60px"}}>

        {/* Header */}
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:4,position:"relative"}}>
          <FeatureBadge id="AW-UX-01" />
          <div>
            {/* FEATURE: AW-24 — Renamed to Create Work Order */}
            <div style={{fontFamily:mono,fontSize:9.5,color:T.brassDeep,textTransform:"uppercase",letterSpacing:1.8,fontWeight:600,marginBottom:3}}>Work Dashboard · Create Work Order</div>
            <div style={{fontFamily:display,fontSize:28,fontWeight:500,color:T.navy,letterSpacing:"-.5px"}}>What do you need done?</div>
          </div>
          {saveLabel && (
            <div style={{fontFamily:mono,fontSize:9,color:saveState==="ready"?T.moss:saveState==="saved"?T.moss:T.brassDeep,padding:"5px 12px",background:saveState==="ready"||saveState==="saved"?`${T.moss}10`:`${T.brass}08`,border:`1px solid ${saveState==="ready"||saveState==="saved"?T.moss:T.brass}30`,marginTop:4}}>
              {saveState==="ready"||saveState==="saved"?"✓ ":""}{saveLabel}
            </div>
          )}
        </div>
        <div style={{height:2,background:T.brass,marginBottom:20}}/>

        {/* FEATURE: AW-25 — PM agent picker */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: mono, fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600, marginBottom: 8 }}>
            Step 1 — Select a project manager
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {agents.filter(a => a.role?.toLowerCase().includes('project manager')).map(agent => (
              <div key={agent.id}
                onClick={() => { setSelectedPMAgent(agent); loadDeliverables(agent); setSelectedDeliverable(null); setGoal(''); setPlanGenerated(false); }}
                style={{ background: selectedPMAgent?.id === agent.id ? `${T.brass}10` : T.card, border: `1.5px solid ${selectedPMAgent?.id === agent.id ? T.brass : T.line}`, padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', borderRadius: 2, minWidth: 200, position: 'relative' }}>
                {selectedPMAgent?.id === agent.id && <Corners />}
                <AgentAvatar who={agent.id} size={28} ring={true} />
                <div>
                  <div style={{ fontFamily: display, fontSize: 12, fontWeight: 600, color: T.navy }}>{agent.name}</div>
                  <div style={{ fontFamily: mono, fontSize: 8, color: T.brassDeep }}>{agent.code} · {agent.role}</div>
                </div>
                {selectedPMAgent?.id === agent.id && (
                  <div style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: T.moss }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Title display (post-generation) */}
        {planGenerated && !generating && (
          <div style={{marginBottom:16,position:"relative"}}>
            <FeatureBadge id="DB-17" />
            <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:5}}>
              <AgentAvatar who="michelle" size={28} ring={true} />
              <span style={{fontFamily:body,fontSize:11,color:T.muted}}>
                {titleData.titleEdited ? "Work Order title (edited)" : `${MICHELLE.initials} · ${MICHELLE.name} · ${MICHELLE.code} suggested this title`}
              </span>
            </div>
            <input value={titleData.taskTitle}
              onChange={e => setTitleData(prev => ({ ...prev, taskTitle: e.target.value }))}
              onFocus={e => { e.target.style.borderBottom = `2px solid ${T.brass}`; }}
              onBlur={e => { e.target.style.borderBottom = "2px solid transparent"; setTitleData(prev => ({ ...prev, titleEdited: prev.titleEdited || prev.taskTitle !== prev.michelleTitle })); }}
              onMouseEnter={e => { if (document.activeElement !== e.target) e.target.style.borderBottom = `2px dashed ${T.line}`; }}
              onMouseLeave={e => { if (document.activeElement !== e.target) e.target.style.borderBottom = "2px solid transparent"; }}
              style={{ width:"100%", fontFamily:display, fontSize:20, fontWeight:500, color:T.navy, background:"transparent", border:"none", borderBottom:"2px solid transparent", outline:"none", padding:"2px 0", letterSpacing:"-0.3px", boxSizing:"border-box" }}
            />
          </div>
        )}

        {/* Two-column: left (deliverable + goal + questions), divider, right (instructions) */}
        <div style={{display:"grid",gridTemplateColumns:"42% 1px 1fr",alignItems:"start"}}>

          {/* LEFT */}
          <div>
            {/* FEATURE: AW-26 — DB-driven deliverable tiles */}
            {selectedPMAgent && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: mono, fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600, marginBottom: 8 }}>Step 2 — Select a deliverable</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 6 }}>
                  {deliverables.map(d => (
                    <div key={d.id} onClick={() => handleDeliverableSelect(d)}
                      style={{ background: selectedDeliverable?.id === d.id ? `${T.brass}10` : T.card, border: `1.5px solid ${selectedDeliverable?.id === d.id ? T.brass : T.line}`, padding: '8px 7px', textAlign: 'center', cursor: 'pointer', borderRadius: 2 }}>
                      <div style={{ fontSize: 13, marginBottom: 3 }}>{d.icon}</div>
                      <div style={{ fontFamily: display, fontSize: 10, fontWeight: 600, color: T.navy, marginBottom: 1 }}>{d.label}</div>
                      <div style={{ fontFamily: body, fontSize: 9, color: T.muted, lineHeight: 1.3 }}>{d.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FEATURE: AW-27 — Goal textarea with streaming suggestion */}
            {selectedDeliverable && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: mono, fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600, marginBottom: 8 }}>Step 3 — Describe your goal</div>
                {(goalStreaming || goal) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: mono, fontSize: 7.5, color: T.brass, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
                    <span style={{ display: 'inline-block', width: 5, height: 5, background: T.brass, borderRadius: 1, transform: 'rotate(45deg)' }} />
                    MM · PP-01 suggested a starting point — edit freely
                    {goalStreaming && <span style={{ display: 'inline-block', width: 4, height: 4, borderRadius: '50%', background: T.brass, animation: 'pdot 1.4s ease-in-out infinite', marginLeft: 4 }} />}
                  </div>
                )}
                <textarea value={goal} ref={goalRef}
                  onChange={e => {
                    if (abortControllerRef.current) { abortControllerRef.current.abort(); abortControllerRef.current = null; }
                    setGoalStreaming(false);
                    setGoal(e.target.value);
                  }}
                  placeholder="Describe what you need in plain English…"
                  style={{ width: '100%', minHeight: 90, padding: '10px 12px', fontFamily: body, fontSize: 13, color: T.ink, background: T.card, border: `1px solid ${goal.length > 8 ? T.brass : T.line}`, resize: 'vertical', outline: 'none', lineHeight: 1.6, boxSizing: 'border-box' }} />
              </div>
            )}

            {/* Chat context */}
            {chatContext && (
              <div style={{background:"rgba(45,111,181,.05)",border:"1px solid rgba(45,111,181,.2)",padding:"12px 16px",marginBottom:12,position:"relative"}}>
                <FeatureBadge id="AW-12" />
                <div style={{fontFamily:mono,fontSize:8.5,color:"#2d6fb5",textTransform:"uppercase",letterSpacing:1,fontWeight:700,marginBottom:8}}>
                  Started from a conversation with {chatContext.agentName}
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  <div style={{display:"flex",gap:10}}>
                    <div style={{fontFamily:mono,fontSize:8,color:T.muted,flexShrink:0}}>YOU</div>
                    <div style={{background:T.navy,color:T.card,padding:"6px 10px",fontSize:11,fontFamily:body,lineHeight:1.5,flex:1}}>{chatContext.userQuestion}</div>
                  </div>
                  <div style={{display:"flex",gap:10}}>
                    <div style={{fontFamily:mono,fontSize:8,color:T.brassDeep,flexShrink:0}}>{chatContext.agentName?.split(" ")[0].toUpperCase()}</div>
                    <div style={{background:T.cardAlt,border:`1px solid ${T.line}`,padding:"6px 10px",fontSize:11,fontFamily:body,color:T.mutedDeep,lineHeight:1.5,flex:1}}>{chatContext.agentAnswer}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Generate Plan */}
            {!planGenerated && selectedDeliverable && (
              <div style={{position:"relative",marginBottom:14}}>
                <FeatureBadge id="AW-04" />
                <FeatureBadge id="AW-28" />
                <button onClick={generatePlan} disabled={!canGenerate||generating}
                  style={{width:"100%",padding:"11px",background:!canGenerate||generating?T.line:`linear-gradient(135deg,${T.brass},${T.brassDeep})`,border:"none",color:!canGenerate||generating?T.muted:T.navy,fontFamily:display,fontSize:14,fontWeight:700,cursor:!canGenerate||generating?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                  <AiBadge label={AI_PAT.TASK_PLANNING}/> {generating ? "Planning agent is building your work order…" : "Generate Plan"}
                </button>
              </div>
            )}

            {(generating || questions.length > 0) && (
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8,position:"relative",fontFamily:body,fontSize:11,color:T.navy}}>
                <FeatureBadge id="AG-04a" />
                <AgentAvatar who="michelle" size={28} ring={true} />
                {generating && <span style={{display:"inline-block",width:4,height:4,borderRadius:"50%",background:T.brass,animation:"pdot 1.4s ease-in-out infinite",flexShrink:0}}/>}
                <span>{MICHELLE.initials} · {MICHELLE.name} · {MICHELLE.code} is asking these questions</span>
              </div>
            )}

            {questions.length>0 && (
              <div style={{background:T.card,border:`1px solid ${T.line}`,padding:"14px 16px",position:"relative"}}>
                <Corners/>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
                  <div style={{fontFamily:mono,fontSize:9,color:T.brassDeep,textTransform:"uppercase",letterSpacing:1.5,fontWeight:600}}>Clarifying Questions</div>
                  <AiBadge label={AI_PAT.TASK_PLANNING}/>
                  <span style={{fontFamily:mono,fontSize:8,color:T.muted,marginLeft:"auto"}}>{pendingQs.length} pending</span>
                </div>
                {questions.map(q=>(
                  <div key={q.id} style={{marginBottom:12}}>
                    <div style={{fontFamily:body,fontSize:12,color:T.ink,marginBottom:5,lineHeight:1.4}}>{q.q}
                      {!answers[q.id]&&<span style={{fontFamily:mono,fontSize:8,color:T.brassDeep,marginLeft:6}}>Waiting for your answer</span>}
                    </div>
                    <input value={answers[q.id]||""} onChange={e=>answerQ(q.id,e.target.value)}
                      placeholder="Your answer (optional — not required to launch)…"
                      style={{width:"100%",padding:"7px 10px",fontFamily:body,fontSize:12,color:T.ink,background:T.cardAlt,border:`1px solid ${answers[q.id]?T.moss:T.lineSoft}`,outline:"none",boxSizing:"border-box"}}/>
                  </div>
                ))}
                {!allAnswered && (
                  <button onClick={handleSaveDraft} style={{width:"100%",padding:"8px",background:"transparent",border:`1px dashed ${T.line}`,color:T.mutedDeep,fontFamily:body,fontSize:12,cursor:"pointer"}}>Save Draft — answer questions later</button>
                )}
              </div>
            )}

            {planGenerated && (
              <div style={{position:"relative",marginTop:12}}>
                <FeatureBadge id="AW-UX-08" />
                <button onClick={generatePlan} disabled={!canGenerate||generating}
                  style={{width:"100%",padding:"11px",background:!canGenerate||generating?T.line:`linear-gradient(135deg,${T.brass},${T.brassDeep})`,border:"none",color:!canGenerate||generating?T.muted:T.navy,fontFamily:display,fontSize:14,fontWeight:700,cursor:!canGenerate||generating?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                  <AiBadge label={AI_PAT.TASK_PLANNING}/> {generating ? "Planning agent is building your work order…" : "Re-generate Plan"}
                </button>
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{ width: 1, background: T.line, margin: '0 16px', alignSelf: 'stretch' }} />

          {/* RIGHT: Instructions */}
          <div style={{minWidth:0}}>
            <div style={{fontFamily:mono,fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:1.5,marginBottom:8,display:"flex",alignItems:"center",gap:6}}>STEP 4 — INSTRUCTIONS <AiBadge label={AI_PAT.TASK_PLANNING}/></div>

            {(generating || planGenerated) && (
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8,position:"relative",fontFamily:body,fontSize:11,color:T.navy}}>
                <FeatureBadge id="AG-04a" />
                <AgentAvatar who="michelle" size={28} ring={true} />
                {generating && <span style={{display:"inline-block",width:4,height:4,borderRadius:"50%",background:T.brass,animation:"pdot 1.4s ease-in-out infinite",flexShrink:0}}/>}
                <span>{MICHELLE.initials} · {MICHELLE.name} · {MICHELLE.code} {generating ? "is building your instructions…" : "built this plan"}</span>
              </div>
            )}

            {generating && (
              <div style={{background:T.card,border:`1px solid ${T.line}`,padding:"32px",textAlign:"center",position:"relative"}}>
                <FeatureBadge id="AW-UX-06" />
                <div style={{display:"flex",justifyContent:"center",gap:4,marginBottom:16}}>
                  {[0,.15,.3].map((d,i)=><span key={i} style={{display:"inline-block",width:6,height:6,borderRadius:"50%",background:T.brass,animation:`dbounce 1.2s ${d}s infinite`}}/>)}
                </div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
                  <span style={{display:"inline-block",width:4,height:4,borderRadius:"50%",background:T.brass,animation:"pdot 1.4s ease-in-out infinite",flexShrink:0}}/>
                  <div style={{fontFamily:body,fontSize:13,color:T.navy}}>{`${MICHELLE.name} is building your instructions…`}</div>
                </div>
              </div>
            )}

            {!generating && planGenerated && (
              <>
                {planSummary && (
                  <div style={{background:`${T.brass}06`,border:`1px solid ${T.brass}20`,padding:"7px 12px",fontFamily:body,fontSize:12,color:T.mutedDeep,fontStyle:"italic",marginBottom:10,display:"flex",gap:6,alignItems:"flex-start"}}>
                    <AiBadge label={AI_PAT.TASK_PLANNING}/><span>{planSummary}</span>
                  </div>
                )}

                <div style={{marginBottom:10,position:"relative"}}>
                  <FeatureBadge id="AW-UX-10" />
                  {mergedSteps.active.map((step, i) => {
                    const agent = agents.find(a => a.id === step.agentId);
                    return (
                      <StepCard key={step.id} step={step} agent={agent} onRemove={removeStep} index={i}
                        onStepLabelChange={handleStepLabelChange} onArchiveStep={handleArchiveStep} onKeepStep={handleKeepStep} />
                    );
                  })}
                  {mergedSteps.archived.length > 0 && (
                    <div style={{fontFamily:mono,fontSize:8,color:T.muted,textAlign:"center",padding:"4px 0",opacity:.7}}>
                      {mergedSteps.archived.length} step{mergedSteps.archived.length!==1?"s":""} archived from previous plan
                    </div>
                  )}
                </div>

                {changeLog.length>0 && (
                  <div style={{marginBottom:10}}>
                    <button onClick={()=>setShowChangeLog(o=>!o)} style={{width:"100%",padding:"7px 12px",background:"transparent",border:`1px solid ${T.lineSoft}`,color:T.muted,fontFamily:mono,fontSize:9,cursor:"pointer",textAlign:"left",display:"flex",justifyContent:"space-between"}}>
                      <span>Plan History ({changeLog.length} changes)</span><span>{showChangeLog?"▴":"▾"}</span>
                    </button>
                    {showChangeLog && changeLog.map((entry,i)=>(
                      <div key={i} style={{padding:"7px 12px",background:T.cardAlt,border:`1px solid ${T.lineSoft}`,borderTop:"none",fontFamily:body,fontSize:10,color:T.muted}}>
                        <span style={{fontFamily:mono,fontSize:9,color:T.brassDeep,marginRight:8}}>{entry.ts}</span>
                        {entry.reason}
                      </div>
                    ))}
                  </div>
                )}

                <div style={{display:"flex",gap:8,position:"relative"}}>
                  <FeatureBadge id="SH-06" />
                  <button onClick={handleApprove}
                    style={{flex:1,padding:"12px",background:`linear-gradient(135deg,${T.navy},${T.navyMid})`,border:"none",color:T.brassLight,fontFamily:display,fontSize:14,fontWeight:700,cursor:"pointer"}}>
                    Approve Steps & Launch ▸
                  </button>
                  {!allAnswered && (
                    <button onClick={handleSaveDraft} style={{padding:"12px 16px",background:"transparent",border:`1px solid ${T.line}`,color:T.mutedDeep,fontFamily:body,fontSize:12,cursor:"pointer"}}>Save Draft</button>
                  )}
                </div>
              </>
            )}

            {!generating && !planGenerated && (
              <div style={{background:T.card,border:`1px dashed ${T.lineSoft}`,padding:"40px 24px",textAlign:"center"}}>
                {selectedAgentObj ? (
                  <>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:12}}>
                      <AgentAvatar who={selectedAgentObj.id} size={36} ring={true}/>
                      <div style={{textAlign:"left"}}>
                        <div style={{fontFamily:display,fontSize:13,fontWeight:600,color:T.navy}}>{selectedAgentObj.name}</div>
                        <div style={{fontFamily:mono,fontSize:8,color:T.brassDeep,letterSpacing:.5}}>PRE-SELECTED FROM CONVERSATION</div>
                      </div>
                    </div>
                    <div style={{fontFamily:display,fontSize:13,color:T.muted}}>Select a deliverable and describe your goal — the planning agent will build your step-by-step plan.</div>
                  </>
                ) : (
                  <>
                    <div style={{fontSize:24,marginBottom:10}}>📋</div>
                    <div style={{fontFamily:display,fontSize:14,color:T.muted}}>Select a project manager, choose a deliverable, and describe your goal.</div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {showPromptModal && promptPreview && (
        <PromptEvolutionModal
          preview={promptPreview}
          planReady={planReadyRef.current}
          onContinue={handlePromptModalContinue}
        />
      )}
    </AppShell>
  );
}
