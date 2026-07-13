import { useState, useEffect } from "react";
import { SPEAKING_TOPICS, SPEAKING_TEMPLATES } from "../lib/ieltsBand4Data";

const STORAGE_KEY = "ib4-speak-completed";

function speakEn(text, rate = 0.85) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US"; u.rate = rate;
  window.speechSynthesis.speak(u);
}

function speakZh(text, rate = 0.9) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  let lang = "zh-HK";
  for (const l of ["zh-HK", "zh-TW", "zh-CN"]) {
    if (voices.some(v => v.lang === l || v.lang.startsWith(l.slice(0, 2)))) { lang = l; break; }
  }
  u.lang = lang; u.rate = rate;
  window.speechSynthesis.speak(u);
}

function PlayBtn({ text, lang = "en", rate = 0.85, label, color, sm }) {
  const [active, setActive] = useState(false);
  function play(e) {
    e && e.stopPropagation();
    if (lang === "zh") speakZh(text, rate); else speakEn(text, rate);
    setActive(true);
    setTimeout(() => setActive(false), Math.max(1500, text.length * 90));
  }
  return (
    <button onClick={play} style={{ padding: sm ? "4px 9px" : "7px 13px", borderRadius: 8,
      border: `1px solid ${active ? color : "var(--border)"}`,
      background: active ? color + "15" : "var(--panel-alt)",
      color: active ? color : "var(--text-faint)",
      cursor: "pointer", fontSize: sm ? 11 : 12, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0, transition: "all .15s" }}>
      {active ? "🔊" : "▶"} {label}
    </button>
  );
}

function RepeatBtn({ text, color }) {
  const [state, setState] = useState("idle");
  function go(e) {
    e && e.stopPropagation();
    if (state !== "idle") return;
    setState("listen");
    speakEn(text, 0.7);
    const delay = Math.max(2000, text.length * 100);
    setTimeout(() => { setState("repeat"); setTimeout(() => setState("idle"), 2500); }, delay);
  }
  return (
    <button onClick={go} disabled={state !== "idle"}
      style={{ padding: "7px 13px", borderRadius: 8,
        border: `1px solid ${state === "repeat" ? "#10b981" : state === "listen" ? color : "var(--border)"}`,
        background: state === "repeat" ? "#10b98115" : state === "listen" ? color + "12" : "var(--panel-alt)",
        color: state === "repeat" ? "#10b981" : state === "listen" ? color : "var(--text-faint)",
        cursor: state === "idle" ? "pointer" : "default",
        fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", transition: "all .2s", flexShrink: 0 }}>
      {state === "listen" ? "🔊 聽..." : state === "repeat" ? "🎤 跟讀！" : "🎤 跟讀"}
    </button>
  );
}

function SpeakingCard({ sp, done, onToggle }) {
  const [showBetter, setShowBetter] = useState(false);
  const color = sp.color;

  return (
    <div style={{ background: "var(--panel)", borderRadius: 14, border: `1px solid ${done ? "#10b98140" : "var(--border)"}`, overflow: "hidden", marginBottom: 14 }}>
      {/* Topic header */}
      <div style={{ padding: "11px 14px 9px", background: color + "0c", borderBottom: `1px solid ${color}20` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color }}>{sp.emoji} {sp.topic}</div>
            {done && <div style={{ fontSize: 10, color: "#10b981", marginTop: 1 }}>✓ 已完成</div>}
          </div>
          <div style={{ padding: "3px 9px", background: "#6366f115", borderRadius: 20, border: "1px solid #6366f130", fontSize: 10, fontWeight: 700, color: "#6366f1" }}>
            Part 1
          </div>
        </div>
      </div>

      <div style={{ padding: "12px 14px" }}>
        {/* Question */}
        <div style={{ marginBottom: 12, padding: "10px 12px", background: "var(--panel-alt)", borderRadius: 10, border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 }}>🎓 考官問題</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", fontStyle: "italic", marginBottom: 3 }}>"{sp.question}"</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{sp.questionZh}</div>
        </div>

        {/* Band 4 answer */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#d97706", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 }}>
            📊 Band 4.0 可接受回答
          </div>
          <div style={{ padding: "10px 12px", background: "#d9780608", borderRadius: 10, border: "1px solid #d9780620", marginBottom: 6 }}>
            <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.7, fontStyle: "italic" }}>"{sp.band4Answer}"</div>
          </div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            <PlayBtn text={sp.band4Answer} lang="en" rate={0.85} label="播放" color="#d97706" sm />
            <PlayBtn text={sp.band4Answer} lang="en" rate={0.6} label="慢速" color="#8b5cf6" sm />
            <RepeatBtn text={sp.band4Answer} color="#d97706" />
          </div>
        </div>

        {/* Better answer toggle */}
        <button onClick={() => setShowBetter(b => !b)}
          style={{ width: "100%", marginBottom: showBetter ? 10 : 0, padding: "8px 0", borderRadius: 9,
            border: `1px solid ${color}40`, background: showBetter ? color + "10" : "transparent",
            color, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
          {showBetter ? "▲ 隱藏更自然的版本" : "✨ 看更自然的版本（更高分）"}
        </button>

        {showBetter && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ padding: "10px 12px", background: color + "0a", borderRadius: 10, border: `1px solid ${color}25`, marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>✨ 更自然的版本</div>
              <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.7, fontStyle: "italic", marginBottom: 6 }}>"{sp.betterAnswer}"</div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                <PlayBtn text={sp.betterAnswer} lang="en" rate={0.85} label="播放" color={color} sm />
                <PlayBtn text={sp.betterAnswer} lang="en" rate={0.6} label="慢速" color="#8b5cf6" sm />
                <RepeatBtn text={sp.betterAnswer} color={color} />
              </div>
            </div>

            {/* Breakdown */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>🔍 中文拆解</div>
              {sp.breakdownZh.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "baseline", marginBottom: 5, padding: "5px 9px",
                  background: "var(--panel-alt)", borderRadius: 7, border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 12, fontStyle: "italic", color: "#a78bfa", flexShrink: 0 }}>{item.en}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>→ {item.zh}</div>
                </div>
              ))}
            </div>

            {/* Teacher tip */}
            {sp.teacherTipZh && (
              <div style={{ marginBottom: 10, padding: "9px 11px", background: "#0891b208", borderRadius: 9, border: "1px solid #0891b222" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#0891b2", textTransform: "uppercase", letterSpacing: 0.5 }}>🎓 老師講解</div>
                  <PlayBtn text={sp.teacherTipZh} lang="zh" rate={0.9} label="播放" color="#0891b2" sm />
                </div>
                <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.8 }}>{sp.teacherTipZh}</div>
              </div>
            )}
          </div>
        )}

        {/* Practice template */}
        <div style={{ marginBottom: 12, padding: "9px 11px", background: "#10b98108", borderRadius: 9, border: "1px solid #10b98122" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 }}>✏️ 練習模板</div>
          <div style={{ fontSize: 12, fontFamily: "monospace", color: "var(--text)", lineHeight: 1.8, marginBottom: 6 }}>{sp.template}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>🎯 {sp.practiceTask}</div>
        </div>

        <button onClick={() => onToggle(sp.id)} style={{ width: "100%", padding: "10px 0", borderRadius: 11, border: "none",
          background: done ? "#10b98118" : `linear-gradient(135deg,${color}cc,${color})`,
          color: done ? "#10b981" : "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          {done ? "✓ 已完成練習" : "✓ 標記完成"}
        </button>
      </div>
    </div>
  );
}

function TemplatesView() {
  const [playing, setPlaying] = useState(null);
  return (
    <div>
      <div style={{ marginBottom: 14, padding: "11px 14px", background: "#7c3aed0a", borderRadius: 12, border: "1px solid #7c3aed25" }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#7c3aed", marginBottom: 4 }}>📝 口說模板庫</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>先把這些模板背下來，任何問題都能開口說幾句。</div>
      </div>
      {SPEAKING_TEMPLATES.map(cat => (
        <div key={cat.id} style={{ marginBottom: 14, background: "var(--panel)", borderRadius: 14, border: `1px solid ${cat.color}25`, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px 8px", background: cat.color + "0c", borderBottom: `1px solid ${cat.color}20` }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: cat.color }}>{cat.emoji} {cat.category}</div>
          </div>
          <div style={{ padding: "10px 14px" }}>
            {cat.templates.map((t, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 10px", background: "var(--panel-alt)", borderRadius: 8, marginBottom: 6, border: "1px solid var(--border)" }}>
                <div>
                  <div style={{ fontSize: 13, color: "var(--text)", fontStyle: "italic" }}>{t.en}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t.zh}</div>
                </div>
                <div style={{ display: "flex", gap: 5 }}>
                  <PlayBtn text={t.en} lang="en" rate={0.85} label="▶" color={cat.color} sm />
                  <PlayBtn text={t.en} lang="en" rate={0.6} label="慢" color="#8b5cf6" sm />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function IeltsBand4Speaking({ onNav }) {
  const [view, setView] = useState("topics"); // topics | templates
  const [activeTopicIdx, setActiveTopicIdx] = useState(0);
  const [completedIds, setCompletedIds] = useState(new Set());

  useEffect(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) setCompletedIds(new Set(JSON.parse(s)));
    } catch (_) {}
  }, []);

  function toggleComplete(id) {
    setCompletedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])); } catch (_) {}
      return next;
    });
  }

  const allDone = completedIds.size;
  const allTotal = SPEAKING_TOPICS.length;
  const pct = allTotal > 0 ? Math.round((allDone / allTotal) * 100) : 0;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bg)", color: "var(--text)", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "10px 18px 8px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <button onClick={() => onNav && onNav("band4")}
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: "var(--text)", fontSize: 15, fontWeight: 800, padding: 0 }}>
            ← 🎤 口說基礎
          </button>
          <div style={{ display: "flex", background: "var(--panel-alt)", borderRadius: 8, padding: 3, gap: 2 }}>
            {[["topics","Part 1 話題"],["templates","模板庫"]].map(([v, label]) => (
              <button key={v} onClick={() => setView(v)}
                style={{ padding: "4px 10px", borderRadius: 6, border: "none",
                  background: view === v ? "var(--panel)" : "transparent",
                  color: view === v ? "var(--text)" : "var(--text-faint)",
                  cursor: "pointer", fontSize: 11, fontWeight: view === v ? 700 : 400,
                  boxShadow: view === v ? "0 1px 3px rgba(0,0,0,0.1)" : "none", transition: "all .15s" }}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {view === "topics" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: "var(--text-faint)" }}>Speaking Part 1 · {allDone}/{allTotal} 完成</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#10b981" }}>{pct}%</span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: "var(--border)" }}>
              <div style={{ height: "100%", borderRadius: 2, background: "#10b981", width: `${pct}%`, transition: "width .3s" }} />
            </div>
          </>
        )}
      </div>

      {/* Topic tabs (only in topics view) */}
      {view === "topics" && (
        <div style={{ display: "flex", gap: 4, padding: "6px 12px", overflowX: "auto", flexShrink: 0, borderBottom: "1px solid var(--border)", background: "var(--panel-alt)" }}>
          {SPEAKING_TOPICS.map((sp, i) => {
            const done = completedIds.has(sp.id);
            const active = i === activeTopicIdx;
            return (
              <button key={sp.id} onClick={() => setActiveTopicIdx(i)}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 11px", borderRadius: 20,
                  border: `1px solid ${active ? sp.color + "60" : "var(--border)"}`,
                  background: active ? sp.color + "18" : "var(--panel)",
                  color: active ? sp.color : "var(--text-faint)",
                  cursor: "pointer", fontSize: 11, fontWeight: active ? 700 : 400,
                  whiteSpace: "nowrap", flexShrink: 0, transition: "all .15s",
                  boxShadow: active ? `0 0 0 2px ${sp.color}28` : "none" }}>
                {sp.emoji} {sp.topic}
                {done && <span style={{ background: "#10b98128", color: "#10b981", borderRadius: 10, padding: "1px 5px", fontSize: 9, fontWeight: 700 }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
        {view === "templates" ? (
          <TemplatesView />
        ) : (
          <>
            <SpeakingCard sp={SPEAKING_TOPICS[activeTopicIdx]} done={completedIds.has(SPEAKING_TOPICS[activeTopicIdx].id)} onToggle={toggleComplete} />
            <div style={{ display: "flex", gap: 8 }}>
              {activeTopicIdx > 0 && (
                <button onClick={() => setActiveTopicIdx(i => i - 1)}
                  style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: "1px solid var(--border)",
                    background: "var(--panel)", color: "var(--text-muted)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                  ← {SPEAKING_TOPICS[activeTopicIdx - 1].topic}
                </button>
              )}
              {activeTopicIdx < SPEAKING_TOPICS.length - 1 && (
                <button onClick={() => setActiveTopicIdx(i => i + 1)}
                  style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: "none",
                    background: `linear-gradient(135deg,${SPEAKING_TOPICS[activeTopicIdx + 1].color}bb,${SPEAKING_TOPICS[activeTopicIdx + 1].color})`,
                    color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                  {SPEAKING_TOPICS[activeTopicIdx + 1].topic} →
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
