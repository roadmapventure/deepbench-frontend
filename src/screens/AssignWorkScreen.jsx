// DeepBench v5.1.10 | AssignWorkScreen.jsx | AG-04 Michelle presence

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
import StepList from "../components/StepList.jsx";

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
    // Find tool_use block
    const toolBlock = data.content?.find(b=>b.type==="tool_use"&&b.name==="plan_task");
    if (toolBlock?.input) {
      logAICall({type:"planning",model:"claude-haiku-4-5",latencyMs:latency,tokens:data.usage?.output_tokens||0,location:"Assign Work"});
      return { ok:true, plan:toolBlock.input };
    }
    // Fallback: parse text
    const text = data.content?.find(b=>b.type==="text")?.text||"";
    const json = text.replace(/```json|```/g,"").trim();
    const plan = JSON.parse(json);
    logAICall({type:"planning",model:"claude-haiku-4-5",latencyMs:latency,tokens:data.usage?.output_tokens||0,location:"Assign Work"});
    return { ok:true, plan };
  } catch(e) { return { ok:false, error:e.message }; }
}

// ── Step Card ─────────────────────────────────────────────────────────────────
function StepCard({ step, agent, onRemove, index }) {
  const isHITL = step.type==="hitl", isSub = step.type==="subagent";
  const bl = isHITL?T.flag:isSub?"#2d6fb5":T.brassDeep;
  return (
    <div style={{background:T.card,border:`1px solid ${T.line}`,borderLeft:`3px solid ${bl}`,padding:"11px 14px",position:"relative",display:"flex",gap:10,alignItems:"flex-start"}}>
      <div style={{flexShrink:0,textAlign:"center",minWidth:24}}>
        <div style={{fontFamily:mono,fontSize:8,color:T.muted,marginBottom:2}}>{String(index+1).padStart(2,"0")}</div>
        <div>{step.icon}</div>
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3,flexWrap:"wrap"}}>
          <span style={{fontFamily:display,fontSize:12,fontWeight:600,color:T.navy}}>{step.label}</span>
          {isHITL && <span style={{fontFamily:mono,fontSize:7.5,padding:"1px 5px",background:"rgba(168,51,25,.1)",color:T.flag,border:`1px solid rgba(168,51,25,.3)`,fontWeight:700}}>● HUMAN</span>}
          {isSub  && <span style={{fontFamily:mono,fontSize:7.5,padding:"1px 5px",background:"rgba(45,111,181,.1)",color:"#2d6fb5",border:`1px solid rgba(45,111,181,.3)`,fontWeight:700}}>⇆ SUB-AGENT · {step.agentName||"Brent"}</span>}
          {!isHITL&&!isSub && <span style={{fontFamily:mono,fontSize:7.5,padding:"1px 5px",background:`rgba(182,135,58,.1)`,color:T.brassDeep,border:`1px solid rgba(182,135,58,.25)`}}>Agent <AiBadge/></span>}
        </div>
        {agent && !isHITL && !isSub && (
          <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}>
            <AgentAvatar who={agent.id} size={14} ring={false}/>
            <span style={{fontFamily:mono,fontSize:9,color:T.brassDeep}}>{agent.name.split(" ")[0]}</span>
            <AiBadge/>
          </div>
        )}
        <div style={{fontFamily:body,fontSize:11,color:T.mutedDeep,lineHeight:1.5}}>{step.text}</div>
        {step.note && <div style={{fontFamily:mono,fontSize:8,color:isHITL?T.flag:isSub?"#2d6fb5":T.moss,marginTop:3,fontStyle:"italic"}}>{step.note}</div>}
      </div>
      <button onClick={()=>onRemove(step.id)} title="Remove step"
        style={{background:"transparent",border:"none",color:T.muted,cursor:"pointer",fontSize:12,padding:"0 4px",flexShrink:0,lineHeight:1}}>✕</button>
    </div>
  );
}

// FEATURE: AW-03 — Two-panel layout (goal + living plan)
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
      // Archive old steps to change log if plan is being regenerated
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
      setMergedSteps(mergeSteps(currentActive, newSteps, alreadyArchived));
      setSteps(newSteps);
      setQuestions(p.questions||[]);
      setPlanSummary(p.planSummary||"");
      setAgentReason(p.agentReason||"");
      if (p.agentId) setSelectedAgent(p.agentId);
      setPlanGenerated(true);
      setSaveState(p.questions?.length?"draft":"ready");
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
      title:        goal.trim() || "Untitled Task",
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
    <AppShell toast={toast} headerProps={{ backLabel:"Dashboard", onBack:()=>navigate("/") }}>
      <div style={{flex:1,overflowY:"auto",background:T.paperDeep,padding:"20px 28px 60px"}}>

        {/* Header */}
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:4}}>
          <div>
            <div style={{fontFamily:mono,fontSize:9.5,color:T.brassDeep,textTransform:"uppercase",letterSpacing:1.8,fontWeight:600,marginBottom:3}}>Work Dashboard · Assign New Work</div>
            <div style={{fontFamily:display,fontSize:28,fontWeight:500,color:T.navy,letterSpacing:"-.5px"}}>What do you need done?</div>
          </div>
          {/* FEATURE: AW-10 — Persistent save state indicator */}
          {/* Save state indicator */}
          {saveLabel && (
            <div style={{fontFamily:mono,fontSize:9,color:saveState==="ready"?T.moss:saveState==="saved"?T.moss:T.brassDeep,padding:"5px 12px",background:saveState==="ready"||saveState==="saved"?`${T.moss}10`:`${T.brass}08`,border:`1px solid ${saveState==="ready"||saveState==="saved"?T.moss:T.brass}30`,marginTop:4}}>
              {saveState==="ready"||saveState==="saved"?"✓ ":""}{saveLabel}
            </div>
          )}
        </div>
        <div style={{height:2,background:T.brass,marginBottom:20}}/>

        {/* Task type tiles */}
        <div style={{fontFamily:mono,fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:1.5,marginBottom:8}}>Step 1 — Select Task Type</div>
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

        {/* Two-column: conversation left, plan right */}
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

            <div style={{position:"relative",marginBottom:14}}>
              <FeatureBadge id="AW-04" />
              <button onClick={generatePlan} disabled={!canGenerate||generating}
                style={{width:"100%",padding:"11px",background:!canGenerate||generating?T.line:`linear-gradient(135deg,${T.brass},${T.brassDeep})`,border:"none",color:!canGenerate||generating?T.muted:T.navy,fontFamily:display,fontSize:14,fontWeight:700,cursor:!canGenerate||generating?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                <AiBadge/> {generating?"Planning agent is building your task…":planGenerated?"Re-generate Plan":"Generate Plan"}
              </button>
            </div>

            {/* FEATURE: AG-04 — Michelle Manning agent presence */}
            {(generating || questions.length > 0) && (
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8,position:"relative",fontFamily:body,fontSize:11,color:T.navy}}>
                <FeatureBadge id="AG-04" />
                {generating && <span style={{display:"inline-block",width:4,height:4,borderRadius:"50%",background:T.brass,animation:"pdot 1.4s ease-in-out infinite",flexShrink:0}}/>}
                <span>{MICHELLE.initials} · {MICHELLE.name} · {MICHELLE.code} is asking these questions</span>
              </div>
            )}

            {/* FEATURE: AW-04 — Planning agent clarifying questions */}
            {/* Clarifying questions */}
            {questions.length>0 && (
              <div style={{background:T.card,border:`1px solid ${T.line}`,padding:"14px 16px",position:"relative"}}>
                <Corners/>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
                  <div style={{fontFamily:mono,fontSize:9,color:T.brassDeep,textTransform:"uppercase",letterSpacing:1.5,fontWeight:600}}>Clarifying Questions</div>
                  <AiBadge/>
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
          </div>

          {/* RIGHT: Living plan */}
          <div>
            <div style={{fontFamily:mono,fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:1.5,marginBottom:8}}>Step 3 — Living Plan</div>

            {/* FEATURE: AG-04 — Michelle Manning agent presence */}
            {(generating || planGenerated) && (
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8,position:"relative",fontFamily:body,fontSize:11,color:T.navy}}>
                <FeatureBadge id="AG-04" />
                {generating && <span style={{display:"inline-block",width:4,height:4,borderRadius:"50%",background:T.brass,animation:"pdot 1.4s ease-in-out infinite",flexShrink:0}}/>}
                <span>{MICHELLE.initials} · {MICHELLE.name} · {MICHELLE.code} {generating ? "is building your plan..." : "built this plan"}</span>
              </div>
            )}

            {generating && (
              <div style={{background:T.card,border:`1px solid ${T.line}`,padding:"32px",textAlign:"center"}}>
                <div style={{display:"flex",justifyContent:"center",gap:4,marginBottom:12}}>
                  {[0,.15,.3].map((d,i)=><span key={i} style={{display:"inline-block",width:6,height:6,borderRadius:"50%",background:T.brass,animation:`dbounce 1.2s ${d}s infinite`}}/>)}
                </div>
                <div style={{fontFamily:display,fontSize:14,color:T.navy,fontWeight:600}}>Planning agent is building your task…</div>
                <div style={{fontFamily:mono,fontSize:10,color:T.muted,marginTop:6,fontStyle:"italic"}}>Analyzing goal · Suggesting agents · Detecting HITL steps</div>
              </div>
            )}

            {!generating && planGenerated && (
              <>
                {/* FEATURE: AW-06 — Agent suggestion + brass glow */}
                {/* Agent suggestion */}
                {selectedAgentObj && (
                  <div style={{background:T.card,border:`2px solid ${T.brass}`,padding:"10px 14px",marginBottom:10,display:"flex",alignItems:"center",gap:10,position:"relative"}}>
                    <Corners/>
                    <AgentAvatar who={selectedAgentObj.id} size={36} ring={true}/>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:1}}>
                        <span style={{fontFamily:display,fontSize:13,fontWeight:600,color:T.navy}}>{selectedAgentObj.name}</span>
                        <span style={{fontFamily:mono,fontSize:8,padding:"1px 5px",background:`${T.brass}15`,color:T.brassDeep,border:`1px solid ${T.brass}40`}}>SUGGESTED</span>
                        <AiBadge/>
                      </div>
                      {agentReason && <div style={{fontFamily:body,fontSize:11,color:T.mutedDeep,fontStyle:"italic"}}>{agentReason}</div>}
                    </div>
                    {/* FEATURE: AW-07 — Agent swap + dynamic replanning */}
                    {/* Swap agent */}
                    <select value={selectedAgent?.id||selectedAgent||""} onChange={e=>{setSelectedAgent(e.target.value);setChangeLog(prev=>[...prev,{ts:new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}),reason:`Agent swapped to ${agents.find(a=>a.id===e.target.value)?.name}`,archivedSteps:steps.map(s=>s.label).join(", ")}]);}}
                      style={{fontFamily:body,fontSize:11,background:T.cardAlt,border:`1px solid ${T.line}`,padding:"4px 8px",cursor:"pointer",color:T.navy}}>
                      {agents.filter(a=>!a.isIntern).map(a=><option key={a.id} value={a.id}>{a.name.split(" ")[0]}</option>)}
                    </select>
                  </div>
                )}

                {/* Plan summary */}
                {planSummary && (
                  <div style={{background:`${T.brass}06`,border:`1px solid ${T.brass}20`,padding:"7px 12px",fontFamily:body,fontSize:12,color:T.mutedDeep,fontStyle:"italic",marginBottom:10,display:"flex",gap:6,alignItems:"flex-start"}}>
                    <AiBadge/><span>{planSummary}</span>
                  </div>
                )}

                {/* Steps */}
                <div style={{marginBottom:10}}>
                  <StepList
                    activeSteps={mergedSteps.active}
                    archivedSteps={mergedSteps.archived}
                    onArchiveStep={handleArchiveStep}
                    onKeepStep={handleKeepStep}
                    readOnly={false}
                    onRemoveStep={removeStep}
                  />
                </div>

                {/* FEATURE: AW-08 — Change log collapsible */}
                {/* Change log */}
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

                {/* FEATURE: AW-11 — Approve Plan & Launch button */}
                {/* FEATURE: AW-09 — Save draft awaiting-input */}
                {/* FEATURE: SH-06 — Supabase tasks integration */}
                {/* Approve + Save Draft */}
                <div style={{display:"flex",gap:8,position:"relative"}}>
                  <FeatureBadge id="SH-06" />
                  <button onClick={handleApprove}
                    style={{flex:1,padding:"12px",background:`linear-gradient(135deg,${T.navy},${T.navyMid})`,border:"none",color:T.brassLight,fontFamily:display,fontSize:14,fontWeight:700,cursor:"pointer"}}>
                    Approve Plan & Launch ▸
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
                    <div style={{fontFamily:display,fontSize:13,color:T.muted}}>Select a task type and describe your goal — the planning agent will build your step-by-step plan.</div>
                  </>
                ) : (
                  <>
                    <div style={{fontSize:24,marginBottom:10}}>📋</div>
                    <div style={{fontFamily:display,fontSize:14,color:T.muted}}>Select a task type and describe your goal — the planning agent will build your step-by-step plan.</div>
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
