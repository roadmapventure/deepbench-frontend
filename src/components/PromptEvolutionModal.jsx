// DeepBench v5.2.33 | PromptEvolutionModal.jsx | AA-70 Alex chip
// FEATURE: AW-28 — Platform-level Prompt Service visibility modal. Import from any screen that calls prompt-service.

import { T, display, body, mono } from '../tokens.js';

// Props: { preview, planReady, onContinue }
// preview = response from action:'preview-prompt' (stage1/stage2/stage3/stage4/patterns)
// planReady = boolean — true when prompt-service has resolved
// onContinue = callback — close modal and process plan result

export default function PromptEvolutionModal({ preview, planReady, onContinue, displayAgentCard }) {
  if (!preview) return null;
  const agentCard = preview.agent_card; // populated by plan.js preview-prompt (AA-65)

  const { stage1, stage2, stage3, stage4, patterns } = preview;

  const delta2 = stage2.tokens - stage1.tokens;
  const delta3 = stage3.tokens - stage2.tokens;
  const delta4 = stage4.tokens - stage3.tokens;

  const SOURCE_COLORS = {
    DB:      { bg: 'rgba(18,36,60,0.10)',    color: T.navyMid },
    RAG:     { bg: 'rgba(182,135,58,0.15)',  color: T.brassDeep },
    REFLECT: { bg: 'rgba(90,117,56,0.15)',   color: T.moss },
  };

  function SourceBadge({ source }) {
    const c = SOURCE_COLORS[source] || SOURCE_COLORS.DB;
    return (
      <span style={{
        fontFamily: mono, fontSize: 8, fontWeight: 600,
        background: c.bg, color: c.color,
        padding: '1px 5px', marginLeft: 4,
      }}>
        {source}
      </span>
    );
  }

  function Column({ number, title, label, stageData, deltaLabel, isLast, children }) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
        <div style={{ fontFamily: mono, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: T.brassDeep }}>
          {number}. {title}
        </div>
        <div style={{ fontFamily: body, fontSize: 10, color: T.muted, minHeight: 28 }}>{label}</div>
        <div style={{
          flex: 1, background: T.navyDeep, color: T.brassLight,
          fontFamily: mono, fontSize: 9, lineHeight: 1.6,
          padding: '10px 12px', overflowY: 'auto', maxHeight: 320,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          border: `1px solid ${T.line}`,
        }}>
          {stageData.text || '(empty)'}
        </div>
        <div style={{ fontFamily: mono, fontSize: 9, color: isLast ? T.brass : T.muted, marginTop: 2 }}>
          ~{stageData.tokens} tokens
          {deltaLabel && (
            <span style={{ color: T.brass, marginLeft: 6 }}>{deltaLabel}</span>
          )}
        </div>
        {children}
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(11,25,41,0.82)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: T.card, border: `1px solid ${T.line}`,
        width: '96vw', maxWidth: 1280, maxHeight: '88vh',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* Header */}
        <div style={{
          padding: '12px 16px', borderBottom: `1px solid ${T.lineSoft}`,
          display: 'flex', alignItems: 'baseline', gap: 10,
        }}>
          <span style={{ fontFamily: display, fontSize: 16, fontWeight: 500, color: T.navy }}>
            How DeepBench Builds Your Prompt
          </span>
          <span style={{ fontFamily: body, fontSize: 11, color: T.muted }}>
            The Prompt Service assembled {stage4.sections?.length || 0} layers before sending to the AI
          </span>
        </div>

        {/* Four columns */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '14px 16px',
          display: 'flex', gap: 12,
        }}>

          <Column
            number="1" title="Generic AI Prompt"
            label="What most AI platforms see"
            stageData={stage1}
            deltaLabel={null}
            isLast={false}
          />

          <Column
            number="2" title="+ DB Assembly"
            label="Agent identity, intent, behavior, format pulled from skill profiles"
            stageData={stage2}
            deltaLabel={delta2 > 0 ? `+${delta2} tokens` : null}
            isLast={false}
          />

          <Column
            number="3" title="+ RAG"
            label="Domain knowledge fetched from vector store using the goal as query"
            stageData={stage3}
            deltaLabel={delta3 > 0 ? `+${delta3} tokens` : '(no knowledge retrieved)'}
            isLast={false}
          >
            <div style={{ fontFamily: mono, fontSize: 8, color: patterns.rag ? T.moss : T.muted }}>
              {patterns.rag ? `✓ ${patterns.rag_chunks} chunk${patterns.rag_chunks !== 1 ? 's' : ''} · ${patterns.rag_scope || 'agent'}-scoped` : '✗ no chunks retrieved'}
            </div>
          </Column>

          <Column
            number="4" title="+ Reflect (+ Format)"
            label="Haiku pre-thinks an execution plan; format section appended last by Alex Reeves"
            stageData={stage4}
            deltaLabel={delta4 > 0 ? `+${delta4} tokens` : '(reflect did not fire)'}
            isLast={true}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 2 }}>
              <div style={{ fontFamily: mono, fontSize: 8, color: patterns.reflect ? T.moss : T.muted }}>
                Reflect {patterns.reflect ? '✓' : '✗'}
              </div>
              {patterns.synthesis && (
                <div style={{ fontFamily: mono, fontSize: 8, color: T.moss }}>
                  Synthesis ✓ — saved ~{patterns.synthesis_tokens_saved} tokens
                </div>
              )}
            </div>
          </Column>

        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 16px', borderTop: `1px solid ${T.lineSoft}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {/* Status line — unchanged */}
            <div style={{ fontFamily: mono, fontSize: 9, color: T.muted, display: 'flex', alignItems: 'center', gap: 6 }}>
              {!planReady ? (
                <>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: T.brass, display: 'inline-block',
                    animation: 'pulse 1.5s infinite',
                  }} />
                  Running plan generation...
                </>
              ) : (
                <span style={{ color: T.moss }}>✓ Plan ready</span>
              )}
            </div>
            {/* FEATURE: AA-65 — Dan Bingham collaboration indicator */}
            {/* FEATURE: AA-70 — Alex Reeves format chip */}
            <div style={{ fontFamily: mono, fontSize: 9, display: 'flex', alignItems: 'center', gap: 5 }}>
              {agentCard && (
                <>
                  <span style={{
                    background: T.brass, color: T.navy, fontWeight: 700,
                    padding: '1px 5px', borderRadius: 2,
                  }}>
                    {agentCard.name} {agentCard.code}
                  </span>
                  <span style={{ color: T.muted }}>+</span>
                </>
              )}
              <span style={{
                background: T.moss, color: '#fff', fontWeight: 700,
                padding: '1px 5px', borderRadius: 2,
              }}>
                Dan Bingham PS-01
              </span>
              <span style={{ color: T.muted }}>· AI Prompt Strategist</span>
              {displayAgentCard && (
                <>
                  <span style={{ color: T.muted }}>+</span>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '2px 8px', borderRadius: 4,
                    border: '1px solid #b6873a',
                    fontFamily: 'Inter, sans-serif',
                  }}>
                    <span style={{ fontSize: 10, color: '#b6873a', fontWeight: 700 }}>ED-01</span>
                    <span style={{ fontSize: 10, color: '#ccc' }}>{displayAgentCard.name || 'Alex Reeves'}</span>
                    <span style={{ fontSize: 9, color: '#888' }}>Format</span>
                  </div>
                </>
              )}
            </div>
          </div>
          <button
            onClick={onContinue}
            style={{
              background: `linear-gradient(135deg,${T.brass},${T.brassDeep})`,
              border: 'none', color: T.navy,
              fontFamily: body, fontSize: 13, fontWeight: 700,
              padding: '8px 22px', cursor: 'pointer',
            }}
          >
            Continue →
          </button>
        </div>

      </div>
    </div>
  );
}
