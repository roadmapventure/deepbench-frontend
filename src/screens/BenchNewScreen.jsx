// DeepBench v7.0.764 | BenchNewScreen.jsx | AGT-337 slice 3 -- the create screen
// src/screens/BenchNewScreen.jsx
// /bench/new: type a name, press the create button, land on the Bench with the new agent's card.
// Every visible string and element is John's approved mock (kickoff v7.0.764 section 4), verbatim.
// No model call here; the save goes to the agent-configs route, which logs it (slice 1).

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { T, display, body, mono } from "../tokens.js";
import { AppShell } from "../AppShell.jsx";
import { supabase } from "../lib/supabase.js";
import { useIsMobile } from "../hooks/useIsMobile.js";

// The radio value that stands for the last row; a team's own id is every other value.
const NEW_TEAM_CHOICE = "new-team";

const FIELD_LABEL = { fontFamily:mono, fontSize:9, color:T.brassDeep, textTransform:"uppercase", letterSpacing:1.3, fontWeight:600, marginBottom:4 };
const ROW = { fontFamily:body, fontSize:12, color:T.mutedDeep, display:"flex", alignItems:"center", gap:6, cursor:"pointer" };
const INPUT_ROW = { display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" };
const VALIDATION = { fontFamily:body, fontSize:12, color:T.flag };

export default function BenchNewScreen() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [name, setName]             = useState("");
  const [addToTeam, setAddToTeam]   = useState(false);
  const [teams, setTeams]           = useState([]);
  const [teamChoice, setTeamChoice] = useState(null);
  const [teamName, setTeamName]     = useState("");
  const [teamError, setTeamError]   = useState(false);
  const [saving, setSaving]         = useState(false);
  const [failed, setFailed]         = useState(false);

  // Teams, on mount. An error or no rows leaves the list empty (the 0-teams state).
  useEffect(() => {
    let live = true;
    Promise.resolve(supabase.from("teams").select("id,name").order("name"))
      .then(({ data, error }) => { if (live && !error && Array.isArray(data)) setTeams(data); })
      .catch(() => {});
    return () => { live = false; };
  }, []);

  const trimmedName = name.trim();
  const nameEmpty   = trimmedName === "";
  const hasTeams    = teams.length > 0;

  const inputStyle = { width:"100%", boxSizing:"border-box", background:T.cardAlt, border:`1px solid ${T.line}`, padding:"9px 14px", color:T.ink, fontFamily:body, outline:"none", fontSize: isMobile ? 16 : 13 };

  const brassButton    = { background:`linear-gradient(135deg,${T.brass},${T.brassDeep})`, border:"none", color:T.navy, padding:"10px 24px", cursor:"pointer", fontFamily:display, fontSize:14, fontWeight:700 };
  const disabledButton = { ...brassButton, background:T.line, color:T.muted, cursor:"not-allowed", opacity:0.5 };
  const cancelButton   = { background:"transparent", border:`1px solid ${T.line}`, color:T.mutedDeep, padding:"10px 20px", cursor:"pointer", fontFamily:body, fontSize:13 };

  // The team the save sends: null (unticked), { id } (a chosen team) or { name } (a new team).
  // undefined means the team block is ticked but not answered -- nothing is sent.
  function resolveTeam() {
    if (!addToTeam) return null;
    const typed = teamName.trim();
    if (!hasTeams) return typed ? { name: typed } : undefined;
    if (teamChoice === null) return undefined;
    if (teamChoice === NEW_TEAM_CHOICE) return typed ? { name: typed } : undefined;
    return { id: teamChoice };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving || nameEmpty) return;
    const team = resolveTeam();
    if (team === undefined) { setTeamError(true); return; }
    setSaving(true);
    setFailed(false);
    try {
      const res = await fetch("/api/agent-configs", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ action: "create_private_agent", name: trimmedName, team }) });
      if (res.status === 201) { navigate("/bench"); return; }
    } catch {
      // a rejected fetch is the same failure as a non-201
    }
    setSaving(false);
    setFailed(true);
  }

  // Shared by the team-name INPUT in both states; typing while teams exist selects the last radio.
  const teamInputProps = {
    type: "text",
    value: teamName,
    onChange: e => { setTeamName(e.target.value); setTeamError(false); if (hasTeams) setTeamChoice(NEW_TEAM_CHOICE); },
    disabled: saving,
    style: inputStyle,
  };
  const teamValidation = teamError && <span style={VALIDATION}>Enter a team name</span>;

  return (
    <AppShell headerProps={{ backLabel:"The Bench", onBack:()=>navigate("/bench") }}>
      <div style={{flex:1,overflowY:"auto",background:T.paperDeep}}>
        <div style={{maxWidth:860,margin:"0 auto",padding:"40px 28px"}}>

          {/* Header */}
          <div style={{textAlign:"center",marginBottom:32}}>
            <div style={{fontFamily:mono,fontSize:10,letterSpacing:3,textTransform:"uppercase",color:T.brass,fontWeight:500,marginBottom:10}}>New Agent Setup</div>
            <div style={{fontFamily:display,fontSize:28,fontWeight:700,color:T.navy,marginBottom:8}}>Name your new agent</div>
            <p style={{fontSize:13.5,color:T.muted,maxWidth:440,margin:"0 auto",lineHeight:1.65}}>Your agent starts blank. You teach it everything it knows.</p>
          </div>

          {/* FEATURE: AGT-337 — the create form */}
          <form onSubmit={handleSubmit} style={{background:T.card,border:`1px solid ${T.line}`,padding:24,maxWidth:440,margin:"0 auto",textAlign:"left"}}>

            <div style={FIELD_LABEL}>Agent name</div>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={saving}
              autoFocus
              maxLength={60}
              style={inputStyle}
            />

            <label style={{...ROW, marginTop:16}}>
              <input
                type="checkbox"
                checked={addToTeam}
                onChange={e => { setAddToTeam(e.target.checked); setTeamError(false); }}
                disabled={saving}
                style={{accentColor:T.brass}}
              />
              Add my new agent to my team
            </label>

            {addToTeam && (
              <div style={{marginLeft:22, marginTop:10}}>
                {!hasTeams ? (
                  <>
                    <div style={FIELD_LABEL}>Team name</div>
                    <div style={INPUT_ROW}>
                      <input {...teamInputProps} maxLength={60} />
                      {teamValidation}
                    </div>
                  </>
                ) : (
                  <>
                    {teams.map(t => (
                      <label key={t.id} style={{...ROW, marginBottom:8}}>
                        <input
                          type="radio"
                          name="team"
                          checked={teamChoice === t.id}
                          onChange={() => { setTeamChoice(t.id); setTeamError(false); }}
                          disabled={saving}
                          style={{accentColor:T.brass}}
                        />
                        {t.name}
                      </label>
                    ))}
                    <label style={{...ROW, marginBottom:8}}>
                      <input
                        type="radio"
                        name="team"
                        checked={teamChoice === NEW_TEAM_CHOICE}
                        onChange={() => { setTeamChoice(NEW_TEAM_CHOICE); setTeamError(false); }}
                        disabled={saving}
                        style={{accentColor:T.brass}}
                      />
                      New team
                    </label>
                    <div style={{...INPUT_ROW, marginLeft:22}}>
                      <input {...teamInputProps} placeholder="Team name" maxLength={60} />
                      {teamValidation}
                    </div>
                  </>
                )}
              </div>
            )}

            <div style={{display:"flex",gap:10,marginTop:20}}>
              <button type="submit" disabled={nameEmpty || saving} style={nameEmpty ? disabledButton : brassButton}>{saving ? "Creating…" : "Create agent"}</button>
              <button type="button" disabled={saving} onClick={()=>navigate("/bench")} style={cancelButton}>Cancel</button>
            </div>

            {failed && !saving && (
              <div style={{fontFamily:body,fontSize:12,color:T.flag,marginTop:10}}>Couldn’t create your agent. Try again.</div>
            )}
          </form>
        </div>
      </div>
    </AppShell>
  );
}
