// DeepBench v5.2.10 | AssignWorkScreen.jsx | S-RENAME-01 UI label rename

import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { T, display, body, mono } from "../tokens.js";
import { TENANT_ID, CURRENT_USER } from "../config.js";
import { AppShell } from "../AppShell.jsx";
import { Corners, AgentAvatar, AiBadge, Toast, FeatureBadge } from "../components/SharedUI.jsx";
import { useAgents } from "../hooks/useAgents.js";
import { logAICall } from "../hooks/useAIActivity.js";
import { supabase } from "../lib/supabase.js";
import { mergeSteps } from "../utils/mergeSteps.js";
import { AI_PAT, AGENT_PATTERNS } from "../aiPatterns.js";

const MICHELLE = { name: "Michelle Manning", code: "PP-01", initials: "MM" };

// FEATURE: AW-01 — Task type tiles
// FEATURE: TI-09 — Step merge wired
// FEATURE: TI-10 — Brass left border on new/changed steps
// FEATURE: TI-11 — Archived steps collapsible drawer
// FEATURE: TI-12 — Agent attribution on every step
const TASK_TYPES = [
  { id:"analysis",  icon:"📊", label:"Data Analysis",     desc:"Analyze spend CSV — flags, HHI, vendor risk, AI briefing",
    defaultGoal:"Analyze the procurement spend data for this task and identify key trends, vendor concentration risks, maverick spend, and savings opportunities." },
  { id:"fetch",     icon:"🌐", label:"Web Data Fetch",     desc:"Brent fetches live data from a government portal",
    defaultGoal:"Fetch the latest procurement expenditure data from the state portal for the specified date range and download the CSV file." },
  { id:"document",  icon:"📝", label:"Document Draft",     desc:"Draft a report, memo, or procurement document",
    defaultGoal:"Draft a professional procurement report based on the analysis and findings from this task, suitable for executive review." },
  { id:"research",  icon:"🔍", label:"Research Question",  desc:"Answer a procurement question using agent expertise",
    defaultGoal:"Research and summarize the key findings, market trends, and strategic recommendations relevant to this procurement question." },
  { id:"review",    icon:"✅", label:"Compliance Review",  desc:"Review a purchase or contract for compliance flags",
    defaultGoal:"Review the procurement data and contracts for compliance issues, policy violations, sole-source risks, and regulatory concerns." },
];

// FEATURE: AW-05 — Step plan generation (planning agent structured output)
// FEATURE: AI-05 — Planning agent structured output via tool use
// ── Call planning agent (Haiku, structured output via tool use) ───────────────
async function callPlanningAgent(taskType, goal, agents, priorQAs = []) {
  const t0 = Date.now();
  const agentList = agents.filter(a=>!a.isIntern).map(a=>`${a.id}: ${a.name} (${a.role}, skill ${a.skill}, cost ${a.reportCost===0?"free":"$"+a.reportCost})`).join("\n");
  const qaContext = priorQAs.map(qa=>`Q: ${qa.q}\nA: ${qa.a||"(unanswered)"}`).join("\n");

  const systemPrompt = `You are a task planning agent for DeepBench, an AI workforce platform for government procurement. You decompose tasks into steps, assign agents, and ask targeted clarifying questions.

Available agents:
${agentList}

Rules:
- Data Analysis tasks must include a sub-agent step for Brent (Web Data Fetch) as step 2 if live data may be needed
- Always include at least one HITL step where human review is required
- 2-4 clarifying questions max, none required to proceed
- Explain agent choices in plain English
- Be concise — this streams live to the user`;

  const userMsg = `Task type: ${taskType}\nGoal: ${goal}${qaContext?"\n\nPrior Q&A:\n"+qaContext:""}

Return a JSON object using the plan_task tool.`;

  const tools = [{
    name: "plan_task",
    description: "Generate a structured task plan with steps and clarifying questions",
    input_schema: {
      type: "object",
      required: ["steps","questions","agentId","planSummary"],
      properties: {
        planSummary: { type:"string", description:"One sentence describing the plan" },
        agentId:     { type:"string", description:"Primary agent ID for this task" },
        agentReason: { type:"string", description:"Why this agent was chosen" },
        steps: {
          type:"array",
          items: {
            type:"object",
            required:["id","icon","label","type","text"],
            properties: {
              id:        { type:"number" },
              icon:      { type:"string" },
              label:     { type:"string" },
              type:      { type:"string", enum:["hitl","agent","subagent"] },
              agentId:   { type:"string" },
              agentName: { type:"string" },
              text:      { type:"string" },
              note:      { type:"string" },
            }
          }
        },
        questions: {
          type:"array",
          items: { type:"object", required:["id","q"], properties:{ id:{type:"number"}, q:{type:"string"} } }
        }
      }
    }
  }];

  try {
    const res = await fetch("/api/plan", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        messages: [{role:"user", content:userMsg}],
        systemPrompt,
        tools,
        max_tokens: 1200,
        tenant_id: TENANT_ID,
      })
    });
    const data = await res.json();
    const latency = Date.now()-t0;
    const toolBlock = data.content?.find(b=>b.type==="tool_use"&&b.name==="plan_task");
    if (toolBlock?.input) {
      // FEATURE: AI-18 — michelle owns task planning capability
      logAICall({type:"planning",model:"claude-haiku-4-5",latencyMs:latency,tokens:data.usage?.output_tokens||0,location:"Assign Work",agentId:"michelle"});
      return { ok:true, plan:toolBlock.input };
    }
    const text = data.content?.find(b=>b.type==="text")?.text||"";
    const json = text.replace(/```json|```/g,"").trim();
    const plan = JSON.parse(json);
    // FEATURE: AI-18 — michelle owns task planning capability
    logAICall({type:"planning",model:"claude-haiku-4-5",latencyMs:latency,tokens:data.usage?.output_tokens||0,location:"Assign Work",agentId:"michelle"});
    return { ok:true, plan };
  } catch(e) { return { ok:false, error:e.message }; }
}

// FEATURE: DB-17 — Michelle Manning title generation
async function callTitleAgent(goal, steps) {
  try {
    const res = await fetch("/api/title", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal, steps }),
    });
    if (!res.ok) return { taskTitle: null, stepTitles: [] };
    const data = await res.json();
    return {
      taskTitle: typeof data.taskTitle === "string" ? data.taskTitle : null,
      stepTitles: Array.isArray(data.stepTitles) ? data.stepTitles : [],
    };
  } catch {
    return { taskTitle: null, stepTitles: [] };
  }
}

function resolveTitle(suggested, goal) {
  if (suggested && suggested.trim().length > 0) return suggested;
  return goal.split(" ").slice(0, 8).join(" ");
}

// FEATURE: AW-UX-10 — Agent hover card — read-only agent info on step card agent badge
function AgentHoverCard({ agent }) {
  if (!agent) return null;
  return (
    <div style={{
      position: "absolute",
      bottom: "calc(100% + 6px)",
      left: 0,
      zIndex: 50,
      background: T.navy,
      border: `1px solid rgba(182,135,58,0.3)`,
      borderRadius: 8,
      boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
      padding: "10px 12px",
      minWidth: 190,
      pointerEvents: "none",
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
      {agent.quip && (
        <div style={{fontFamily:body,fontSize:10,color:"rgba(255,255,255,0.45)",fontStyle:"italic"}}>{agent.quip.replace(/^"|"$/g,"")}</div>
      )}
    </div>
  );
}

// ── Step Card ─────────────────────────────────────────────────────────────────
function StepCard({ step, agent, onRemove, index, onStepLabelChange, onArchiveStep, onKeepStep }) {
  const [hovered, setHovered] = useState(false);
  const [labelValue, setLabelValue] = useState(step.label);
  useEffect(() => { setLabelValue(step.label); }, [step.label]);
  // FEATURE: AI-29 — derive patterns from AGENT_PATTERNS map by step.agentId
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
              <input
                value={labelValue}
                onChange={e => setLabelValue(e.target.value)}
                onFocus={e => { e.target.style.borderBottom = `2px solid ${T.brass}`; }}
                onBlur={e => {
                  e.target.style.borderBottom = "2px solid transparent";
                  if (e.target.value !== step.label) onStepLabelChange(step.id, e.target.value);
                }}
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
              {/* FEATURE: AI-29 — conditional pattern badge from AGENT_PATTERNS map */}
              {!isHITL&&!isSub && <span style={{fontFamily:mono,fontSize:7.5,padding:"1px 5px",background:`rgba(182,135,58,.1)`,color:T.brassDeep,border:`1px solid rgba(182,135,58,.25)`}}>Agent {agentEntry && <AiBadge label={agentEntry.patterns} built={agentEntry.built}/>}</span>}
            </div>
          </div>
          {/* FEATURE: AW-UX-10 — Agent name badge is hover target → shows AgentHoverCard */}
          {/* FEATURE: AI-31 — AiBadge moved outside hover-target so tooltip is independently hoverable */}
          {agent && !isHITL && !isSub && (
            <div style={{marginBottom:4,display:"flex",alignItems:"center",gap:4}}>
              <span
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                style={{position:"relative",cursor:"default",display:"inline-flex",alignItems:"center",gap:5}}
              >
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
      {/* Inline archive threading for merged/replaced steps */}
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

// FEATURE: AW-03 — Two-panel layout (goal + instructions)
// ── Main Screen ───────────────────────────────────────────────────────────────
export default function AssignWorkScreen() {
  const navigate   = useNavigate();
  const [params]   = useSearchParams();
  const agents     = useAgents();

  const prefillAgent = params.get("agent");
  const rawQ         = params.get("q") ? decodeURIComponent(params.get("q")) : "";
  const prefillGoal  = rawQ.split("?")[0].trim();

  const [selectedType,    setSelectedType]    = useState(null);
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
  const [saveState,       setSaveState]        = useState("idle"); // idle|draft|ready|saving|saved
  const [toast,           setToast]            = useState(null);
  // FEATURE: DB-17 — Michelle Manning title generation
  const [titleData,       setTitleData]        = useState({ taskTitle: "", michelleTitle: "", stepTitles: [], titleEdited: false });
  const goalRef         = useRef(null);
  const lastAutoGoalRef = useRef("");

  const [chatContext, setChatContext] = useState(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('chatContext');
    if (raw && params.get('from') === 'chat') {
      try {
        const parsed = JSON.parse(raw);
        setChatContext(parsed);
        sessionStorage.removeItem('chatContext');
        if (parsed.taskType) {
          setSelectedType(parsed.taskType);
          const tile = TASK_TYPES.find(t => t.id === parsed.taskType);
          if (tile && !prefillGoal) {
            setGoal(tile.defaultGoal);
          }
        }
      } catch(e) { /* ignore */ }
    }
  }, [params, agents]);

  const showToast = (msg,icon="✓") => { setToast({msg,icon}); setTimeout(()=>setToast(null),3000); };

  const pendingQs   = questions.filter(q=>!answers[q.id]);
  const allAnswered = pendingQs.length === 0;
  const canGenerate = selectedType && goal.trim().length > 8;

  // Save state label
  const saveLabel = saveState==="draft" ? `Draft · ${pendingQs.length} question${pendingQs.length!==1?"s":""} pending`
                  : saveState==="ready" ? "Ready to launch · All questions answered"
                  : saveState==="saving"? "Saving…"
                  : saveState==="saved" ? "Saved ✓"
                  : "";

  const generatePlan = async () => {
    if (!canGenerate) return;
    setGenerating(true); setPlanGenerated(false);
    const qas = questions.map(q=>({q:q.q, a:answers[q.id]||""}));
    const result = await callPlanningAgent(selectedType, goal, agents, qas);
    if (result.ok) {
      const p = result.plan;
      if (steps.length > 0) {
        setChangeLog(prev=>[...prev,{
          ts: new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}),
          reason: "Plan regenerated with updated answers",
          archivedSteps: steps.map(s=>s.label).join(", "),
        }]);
      }
      const newSteps = p.steps || [];
      const currentActive = mergedSteps.active;
      const alreadyArchived = mergedSteps.archived;

      // FEATURE: DB-17 — Call title agent after plan returns
      const titleRes = await callTitleAgent(goal, newSteps);
      const titledNewSteps = newSteps.map((s, i) => ({
        ...s,
        label: titleRes.stepTitles[i] || s.label,
      }));

      setMergedSteps(mergeSteps(currentActive, titledNewSteps, alreadyArchived));
      setSteps(titledNewSteps);
      setQuestions(p.questions||[]);
      setPlanSummary(p.planSummary||"");
      setAgentReason(p.agentReason||"");
      if (p.agentId) setSelectedAgent(p.agentId);
      setPlanGenerated(true);
      setSaveState(p.questions?.length?"draft":"ready");

      setTitleData(prev => {
        if (prev.titleEdited) return { ...prev, stepTitles: titleRes.stepTitles };
        const resolved = resolveTitle(titleRes.taskTitle, goal);
        return { taskTitle: resolved, michelleTitle: resolved, stepTitles: titleRes.stepTitles, titleEdited: false };
      });
    } else {
      showToast("Planning agent failed: "+result.error,"⚠");
    }
    setGenerating(false);
  };

  const removeStep = (id) => {
    const s = steps.find(x=>x.id===id);
    if (s) setChangeLog(prev=>[...prev,{ts:new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}),reason:`Removed step: ${s.label}`,archivedSteps:s.label}]);
    setSteps(prev=>prev.filter(x=>x.id!==id));
    setMergedSteps(prev => ({ ...prev, active: prev.active.filter(x=>x.id!==id) }));
  };

  const handleArchiveStep = (oldStep) => {
    setMergedSteps(prev => ({
      active: prev.active.map(s =>
        s.pendingArchive?.label === oldStep.label
          ? { ...s, pendingArchive: undefined }
          : s
      ),
      archived: [...prev.archived, { ...oldStep, mergeStatus: "archived" }],
    }));
  };

  const handleKeepStep = (parentStep, oldStep) => {
    setMergedSteps(prev => {
      const idx = prev.active.findIndex(s => s.label === parentStep.label);
      const cleaned = prev.active.map(s =>
        s.label === parentStep.label
          ? { ...s, pendingArchive: undefined }
          : s
      );
      cleaned.splice(idx + 1, 0, { ...oldStep, mergeStatus: "unchanged" });
      return { ...prev, active: cleaned };
    });
  };

  const answerQ = (id, val) => {
    setAnswers(prev=>({...prev,[id]:val}));
    const newPending = questions.filter(q=>q.id!==id&&!answers[q.id]).length + (!answers[id]&&val?-1:0);
    setSaveState(newPending===0?"ready":"draft");
  };

  // FIX: DB-17p — Wire step label editing in draft state
  const handleStepLabelChange = (stepId, newLabel) => {
    setMergedSteps(prev => ({
      ...prev,
      active: prev.active.map(s =>
        s.id === stepId ? { ...s, label: newLabel } : s
      ),
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
    const taskTypeLabel = TASK_TYPES.find(t => t.id === selectedType)?.label || selectedType || "Data Analysis";
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
        questions: qas.map((qa, i) => ({
          id: i + 1,
          q: qa.q,
          a: qa.a || "",
        })),
        planSummary: steps.length > 0 ? `${steps.length} step plan` : "",
      },
      chat_origin: chatContext ? {
        agentId: chatContext.agentId,
        agentName: chatContext.agentName,
        question: chatContext.userQuestion,
        answer: chatContext.agentAnswer,
        timestamp: chatContext.timestamp,
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
    // FEATURE: AW-UX-01 — Dashboard back button + AI panel button removed from Assign Work header
    <AppShell toast={toast} headerProps={{ showAIPanel: false }}>
      <div style={{flex:1,overflowY:"auto",background:T.paperDeep,padding:"20px 28px 60px"}}>

        {/* Header */}
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:4,position:"relative"}}>
          <FeatureBadge id="AW-UX-01" />
          <div>
            {/* FEATURE: WO-01 — S-RENAME-01 UI label rename */}
            <div style={{fontFamily:mono,fontSize:9.5,color:T.brassDeep,textTransform:"uppercase",letterSpacing:1.8,fontWeight:600,marginBottom:3}}>Work Dashboard · New Work Order</div>
            <div style={{fontFamily:display,fontSize:28,fontWeight:500,color:T.navy,letterSpacing:"-.5px"}}>What do you need done?</div>
          </div>
          {/* FEATURE: AW-10 — Persistent save state indicator */}
          {saveLabel && (
            <div style={{fontFamily:mono,fontSize:9,color:saveState==="ready"?T.moss:saveState==="saved"?T.moss:T.brassDeep,padding:"5px 12px",background:saveState==="ready"||saveState==="saved"?`${T.moss}10`:`${T.brass}08`,border:`1px solid ${saveState==="ready"||saveState==="saved"?T.moss:T.brass}30`,marginTop:4}}>
              {saveState==="ready"||saveState==="saved"?"✓ ":""}{saveLabel}
            </div>
          )}
        </div>
        <div style={{height:2,background:T.brass,marginBottom:20}}/>

        {/* Task type tiles */}
        {/* FEATURE: WO-01 — S-RENAME-01 UI label rename */}
        <div style={{fontFamily:mono,fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:1.5,marginBottom:8}}>Step 1 — Select Work Order Type</div>
        {/* FEATURE: AW-14 — Task type tile pre-populates goal textarea */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:20,position:"relative"}}>
          <FeatureBadge id="AW-14" />
          {TASK_TYPES.map(tt=>(
            <div key={tt.id} onClick={()=>{
              const isCustomGoal = goal.trim() && goal !== lastAutoGoalRef.current;
              if (!isCustomGoal) {
                setGoal(tt.defaultGoal);
                lastAutoGoalRef.current = tt.defaultGoal;
              }
              setSelectedType(tt.id);
              setPlanGenerated(false);
              setTimeout(() => goalRef.current?.focus(), 50);
            }}
              style={{background:selectedType===tt.id?`${T.brass}10`:T.card,border:`1.5px solid ${selectedType===tt.id?T.brass:T.line}`,padding:"12px 10px",textAlign:"center",cursor:"pointer",transition:"all .15s",position:"relative"}}>
              {selectedType===tt.id&&<Corners/>}
              <div style={{fontSize:18,marginBottom:5}}>{tt.icon}</div>
              <div style={{fontFamily:display,fontSize:12,fontWeight:600,color:T.navy,marginBottom:3}}>{tt.label}</div>
              <div style={{fontFamily:body,fontSize:10,color:T.muted,lineHeight:1.4}}>{tt.desc}</div>
            </div>
          ))}
        </div>

        {/* FEATURE: DB-17 — Michelle Manning title generation */}
        {planGenerated && !generating && (
          <div style={{marginBottom:16,position:"relative"}}>
            <FeatureBadge id="DB-17" />
            <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:5}}>
              <AgentAvatar who="michelle" size={28} ring={true} />
              {/* FEATURE: WO-01 — S-RENAME-01 UI label rename */}
              <span style={{fontFamily:body,fontSize:11,color:T.muted}}>
                {titleData.titleEdited
                  ? "Work Order title (edited)"
                  : `${MICHELLE.initials} · ${MICHELLE.name} · ${MICHELLE.code} suggested this title`}
              </span>
            </div>
            <input
              value={titleData.taskTitle}
              onChange={e => setTitleData(prev => ({ ...prev, taskTitle: e.target.value }))}
              onFocus={e => { e.target.style.borderBottom = `2px solid ${T.brass}`; }}
              onBlur={e => {
                e.target.style.borderBottom = "2px solid transparent";
                setTitleData(prev => ({
                  ...prev,
                  titleEdited: prev.titleEdited || prev.taskTitle !== prev.michelleTitle,
                }));
              }}
              onMouseEnter={e => { if (document.activeElement !== e.target) e.target.style.borderBottom = `2px dashed ${T.line}`; }}
              onMouseLeave={e => { if (document.activeElement !== e.target) e.target.style.borderBottom = "2px solid transparent"; }}
              style={{
                width:"100%", fontFamily:display, fontSize:20, fontWeight:500,
                color:T.navy, background:"transparent", border:"none",
                borderBottom:"2px solid transparent", outline:"none",
                padding:"2px 0", letterSpacing:"-0.3px", boxSizing:"border-box",
              }}
            />
          </div>
        )}

        {/* Two-column: conversation left, instructions right */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,alignItems:"start"}}>

          {/* LEFT: Goal + clarifying questions */}
          <div>
            <div style={{fontFamily:mono,fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:1.5,marginBottom:8}}>Step 2 — Describe Your Goal</div>
            {/* FEATURE: AW-12 — Chat context shown + saved */}
            {chatContext && (
              <div style={{background:"rgba(45,111,181,.05)",border:"1px solid rgba(45,111,181,.2)",padding:"12px 16px",marginBottom:12,position:"relative"}}>
                <FeatureBadge id="AW-12" />
                <div style={{fontFamily:mono,fontSize:8.5,color:"#2d6fb5",textTransform:"uppercase",letterSpacing:1,fontWeight:700,marginBottom:8}}>
                  Started from a conversation with {chatContext.agentName}
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  <div style={{display:"flex",gap:10}}>
                    <div style={{fontFamily:mono,fontSize:8,color:T.muted,flexShrink:0}}>YOU</div>
                    <div style={{background:T.navy,color:T.card,padding:"6px 10px",fontSize:11,fontFamily:body,lineHeight:1.5,flex:1}}>
                      {chatContext.userQuestion}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:10}}>
                    <div style={{fontFamily:mono,fontSize:8,color:T.brassDeep,flexShrink:0}}>
                      {chatContext.agentName?.split(" ")[0].toUpperCase()}
                    </div>
                    <div style={{background:T.cardAlt,border:`1px solid ${T.line}`,padding:"6px 10px",fontSize:11,fontFamily:body,color:T.mutedDeep,lineHeight:1.5,flex:1}}>
                      {chatContext.agentAnswer}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div style={{position:"relative"}}>
              <FeatureBadge id="AW-12" />
              <textarea value={goal} onChange={e=>setGoal(e.target.value)} ref={goalRef}
                placeholder="Describe what you need in plain English. The planning agent will break it into steps and suggest agents…"
                style={{width:"100%",minHeight:90,padding:"10px 12px",fontFamily:body,fontSize:13,color:T.ink,background:T.card,border:`1px solid ${goal.length>8?T.brass:T.line}`,resize:"vertical",outline:"none",lineHeight:1.6,boxSizing:"border-box",marginBottom:10}}/>
            </div>

            {/* FEATURE: AW-UX-03 — AI icon on Generate Plan button */}
            {/* FEATURE: AW-UX-08 — Generate Plan shown above (first generation only); Re-generate moved below questions */}
            {/* Generate Plan — shown only before first generation */}
            {!planGenerated && (
              <div style={{position:"relative",marginBottom:14}}>
                <FeatureBadge id="AW-04" />
                <button onClick={generatePlan} disabled={!canGenerate||generating}
                  style={{width:"100%",padding:"11px",background:!canGenerate||generating?T.line:`linear-gradient(135deg,${T.brass},${T.brassDeep})`,border:"none",color:!canGenerate||generating?T.muted:T.navy,fontFamily:display,fontSize:14,fontWeight:700,cursor:!canGenerate||generating?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                  {/* FEATURE: AI-28 */}
                  {/* FEATURE: WO-01 — S-RENAME-01 UI label rename */}
                  <AiBadge label={AI_PAT.TASK_PLANNING}/> {generating ? "Planning agent is building your work order…" : "Generate Plan"}
                </button>
              </div>
            )}

            {/* FEATURE: AG-04a — Michelle avatar placeholder */}
            {(generating || questions.length > 0) && (
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8,position:"relative",fontFamily:body,fontSize:11,color:T.navy}}>
                <FeatureBadge id="AG-04a" />
                <AgentAvatar who="michelle" size={28} ring={true} />
                {generating && <span style={{display:"inline-block",width:4,height:4,borderRadius:"50%",background:T.brass,animation:"pdot 1.4s ease-in-out infinite",flexShrink:0}}/>}
                <span>{MICHELLE.initials} · {MICHELLE.name} · {MICHELLE.code} is asking these questions</span>
              </div>
            )}

            {/* FEATURE: AW-04 — Planning agent clarifying questions */}
            {/* FEATURE: AW-UX-04 — AI icon on Clarifying Questions label */}
            {/* Clarifying questions */}
            {questions.length>0 && (
              <div style={{background:T.card,border:`1px solid ${T.line}`,padding:"14px 16px",position:"relative"}}>
                <Corners/>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
                  <div style={{fontFamily:mono,fontSize:9,color:T.brassDeep,textTransform:"uppercase",letterSpacing:1.5,fontWeight:600}}>Clarifying Questions</div>
                  {/* FEATURE: AI-28 */}
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

            {/* FEATURE: AW-UX-08 — Re-generate Plan button moved below Clarifying Questions */}
            {planGenerated && (
              <div style={{position:"relative",marginTop:12}}>
                <FeatureBadge id="AW-UX-08" />
                <button onClick={generatePlan} disabled={!canGenerate||generating}
                  style={{width:"100%",padding:"11px",background:!canGenerate||generating?T.line:`linear-gradient(135deg,${T.brass},${T.brassDeep})`,border:"none",color:!canGenerate||generating?T.muted:T.navy,fontFamily:display,fontSize:14,fontWeight:700,cursor:!canGenerate||generating?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                  {/* FEATURE: AI-28 */}
                  {/* FEATURE: WO-01 — S-RENAME-01 UI label rename */}
                  <AiBadge label={AI_PAT.TASK_PLANNING}/> {generating ? "Planning agent is building your work order…" : "Re-generate Plan"}
                </button>
              </div>
            )}
          </div>

          {/* RIGHT: Instructions */}
          <div>
            {/* FEATURE: AW-UX-02 — Step 3 renamed to INSTRUCTIONS + AI badge */}
            {/* FEATURE: AI-28 */}
            <div style={{fontFamily:mono,fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:1.5,marginBottom:8,display:"flex",alignItems:"center",gap:6}}>STEP 3 — INSTRUCTIONS <AiBadge label={AI_PAT.TASK_PLANNING}/></div>

            {/* FEATURE: AG-04a — Michelle byline (generating + post-generation) */}
            {(generating || planGenerated) && (
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8,position:"relative",fontFamily:body,fontSize:11,color:T.navy}}>
                <FeatureBadge id="AG-04a" />
                <AgentAvatar who="michelle" size={28} ring={true} />
                {generating && <span style={{display:"inline-block",width:4,height:4,borderRadius:"50%",background:T.brass,animation:"pdot 1.4s ease-in-out infinite",flexShrink:0}}/>}
                <span>{MICHELLE.initials} · {MICHELLE.name} · {MICHELLE.code} {generating ? "is building your instructions…" : "built this plan"}</span>
              </div>
            )}

            {/* FEATURE: AW-UX-06 — Generating state: human message from MICHELLE.name */}
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
                {/* FEATURE: AW-UX-09 — Agent card removed; each step has its own agent attribution */}

                {/* FEATURE: AW-UX-07 — Step label section (confirmed: no "tasks"/"plan items" label exists here) */}
                {/* Plan summary */}
                {planSummary && (
                  <div style={{background:`${T.brass}06`,border:`1px solid ${T.brass}20`,padding:"7px 12px",fontFamily:body,fontSize:12,color:T.mutedDeep,fontStyle:"italic",marginBottom:10,display:"flex",gap:6,alignItems:"flex-start"}}>
                    {/* FEATURE: AI-28 */}
                    <AiBadge label={AI_PAT.TASK_PLANNING}/><span>{planSummary}</span>
                  </div>
                )}

                {/* FEATURE: AW-UX-10 — Steps rendered with per-step agent hover card */}
                {/* Steps */}
                <div style={{marginBottom:10,position:"relative"}}>
                  <FeatureBadge id="AW-UX-10" />
                  {mergedSteps.active.map((step, i) => {
                    const agent = agents.find(a => a.id === step.agentId);
                    return (
                      <StepCard
                        key={step.id}
                        step={step}
                        agent={agent}
                        onRemove={removeStep}
                        index={i}
                        onStepLabelChange={handleStepLabelChange}
                        onArchiveStep={handleArchiveStep}
                        onKeepStep={handleKeepStep}
                      />
                    );
                  })}
                  {mergedSteps.archived.length > 0 && (
                    <div style={{fontFamily:mono,fontSize:8,color:T.muted,textAlign:"center",padding:"4px 0",opacity:.7}}>
                      {mergedSteps.archived.length} step{mergedSteps.archived.length!==1?"s":""} archived from previous plan
                    </div>
                  )}
                </div>

                {/* FEATURE: AW-08 — Change log collapsible */}
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

                {/* FEATURE: AW-11 — Approve Steps & Launch button */}
                {/* FEATURE: AW-UX-05 — CTA renamed from "Approve Plan & Launch" to "Approve Steps & Launch" */}
                {/* FEATURE: AW-09 — Save draft awaiting-input */}
                {/* FEATURE: SH-06 — Supabase tasks integration */}
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
                    <div style={{fontFamily:display,fontSize:13,color:T.muted}}>Select a work order type and describe your goal — the planning agent will build your step-by-step plan.</div>
                  </>
                ) : (
                  <>
                    <div style={{fontSize:24,marginBottom:10}}>📋</div>
                    <div style={{fontFamily:display,fontSize:14,color:T.muted}}>Select a work order type and describe your goal — the planning agent will build your step-by-step plan.</div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
