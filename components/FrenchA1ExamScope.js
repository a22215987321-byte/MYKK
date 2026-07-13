import { useState } from "react";
import { frenchA1ExamScope } from "../lib/frenchA1ExamScope";

const TABS = [
  { id: "skills",    icon: "🎯", label: "四大能力" },
  { id: "themes",    icon: "📌", label: "常見主題" },
  { id: "grammar",   icon: "📐", label: "必學文法" },
  { id: "patterns",  icon: "💬", label: "必學句型" },
  { id: "vocab",     icon: "📚", label: "詞彙分類" },
  { id: "examtasks", icon: "📝", label: "考試題型" },
  { id: "studyorder",icon: "🚀", label: "學習順序" },
];

const SKILL_COLORS = {
  listening: "#3b82f6",
  reading:   "#10b981",
  writing:   "#f59e0b",
  speaking:  "#ec4899",
};

const GRAMMAR_LEVEL_STYLE = {
  核心: { bg: "rgba(239,68,68,0.12)",   color: "#ef4444",  border: "rgba(239,68,68,0.3)" },
  重要: { bg: "rgba(245,158,11,0.12)",  color: "#f59e0b",  border: "rgba(245,158,11,0.3)" },
  補充: { bg: "rgba(99,102,241,0.12)",  color: "#818cf8",  border: "rgba(99,102,241,0.3)" },
};

export default function FrenchA1ExamScope() {
  const [activeTab, setActiveTab] = useState("skills");

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bg)", color: "var(--text)", overflow: "hidden" }}>
      <style>{`
        .fa1es-tabs::-webkit-scrollbar { height: 4px; }
        .fa1es-tabs::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }
        .fa1es-body::-webkit-scrollbar { width: 6px; }
        .fa1es-body::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }
      `}</style>

      {/* Header */}
      <div style={{ padding: "16px 24px 12px", borderBottom: "1px solid var(--border)", flexShrink: 0,
        background: "linear-gradient(135deg, rgba(30,58,138,.18), rgba(76,29,149,.10))" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#818cf8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>
          🇫🇷 法語學習 2
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", marginBottom: 3 }}>
          A1 考試範圍整理
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
          先不用學發音，先知道 A1 到底考什麼。整理 DELF A1 初學者需要掌握的主題、文法、詞彙和題型。
        </div>
      </div>

      {/* Tabs */}
      <div className="fa1es-tabs" style={{ display: "flex", gap: 6, padding: "10px 20px", background: "var(--panel-alt)", borderBottom: "1px solid var(--border)", overflowX: "auto", flexShrink: 0 }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 20,
              border: `1px solid ${activeTab === tab.id ? "#6366f1" : "var(--border)"}`,
              background: activeTab === tab.id ? "rgba(99,102,241,0.15)" : "var(--panel)",
              color: activeTab === tab.id ? "#818cf8" : "var(--text-muted)",
              cursor: "pointer", fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 400,
              whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.15s" }}>
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="fa1es-body" style={{ flex: 1, overflowY: "auto", padding: "20px 28px 48px" }}>

        {/* ── 四大能力 ── */}
        {activeTab === "skills" && (
          <div>
            <SectionHeader icon="🎯" title="A1 考什麼能力" sub="DELF A1 共四個測試項目，各佔 25 分（總分 100 分，60 分合格）" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
              {frenchA1ExamScope.skills.map(skill => (
                <div key={skill.id} style={{ borderRadius: 14, border: `1px solid ${skill.color}30`, background: skill.color + "08", padding: "16px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 22 }}>{skill.icon}</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: skill.color }}>{skill.title}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{skill.desc}</div>
                    </div>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 5 }}>
                    {skill.items.map((item, i) => (
                      <li key={i} style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6 }}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 常見主題 ── */}
        {activeTab === "themes" && (
          <div>
            <SectionHeader icon="📌" title="A1 常見主題" sub="考試對話、閱讀材料、口說場景都圍繞這些日常主題" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
              {frenchA1ExamScope.themes.map((theme, i) => (
                <div key={i} style={{ display: "flex", gap: 12, padding: "12px 14px", borderRadius: 12,
                  background: "var(--panel)", border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{theme.emoji}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", marginBottom: 3 }}>{theme.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>{theme.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 必學文法 ── */}
        {activeTab === "grammar" && (
          <div>
            <SectionHeader icon="📐" title="A1 必學文法" sub="優先攻克「核心」項目，再擴展「重要」項目" />
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {Object.entries(GRAMMAR_LEVEL_STYLE).map(([level, s]) => (
                <span key={level} style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                  background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>{level}</span>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {frenchA1ExamScope.grammar.map((g, i) => {
                const s = GRAMMAR_LEVEL_STYLE[g.level] || GRAMMAR_LEVEL_STYLE["補充"];
                return (
                  <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 14px",
                    borderRadius: 12, background: "var(--panel)", border: "1px solid var(--border)" }}>
                    <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700,
                      background: s.bg, color: s.color, border: `1px solid ${s.border}`, flexShrink: 0, marginTop: 1 }}>
                      {g.level}
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", marginBottom: 4 }}>{g.item}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6, fontFamily: "monospace" }}>{g.detail}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 必學句型 ── */}
        {activeTab === "patterns" && (
          <div>
            <SectionHeader icon="💬" title="A1 必學句型" sub="記住這些句型框架，換詞就能說出新句子" />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {frenchA1ExamScope.sentencePatterns.map((p, i) => (
                <div key={i} style={{ padding: "12px 16px", borderRadius: 12, background: "var(--panel)", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: "#818cf8", fontFamily: "monospace" }}>{p.fr}</span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>— {p.zh}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>例：{p.example}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 詞彙分類 ── */}
        {activeTab === "vocab" && (
          <div>
            <SectionHeader icon="📚" title="A1 詞彙分類" sub="按主題分類背單字，比亂背效率高 3 倍" />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {frenchA1ExamScope.vocabularyCategories.map((cat, i) => (
                <div key={i} style={{ padding: "12px 16px", borderRadius: 12, background: "var(--panel)", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 18 }}>{cat.emoji}</span>
                    <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{cat.name}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.7 }}>{cat.words}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 考試題型 ── */}
        {activeTab === "examtasks" && (
          <div>
            <SectionHeader icon="📝" title="A1 考試題型" sub="了解每個考試項目的具體格式，針對性練習" />
            {Object.entries(frenchA1ExamScope.examTasks).map(([key, tasks]) => {
              const skill = frenchA1ExamScope.skills.find(s => s.id === key);
              if (!skill) return null;
              return (
                <div key={key} style={{ marginBottom: 22 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 18 }}>{skill.icon}</span>
                    <span style={{ fontWeight: 800, fontSize: 15, color: skill.color }}>{skill.title}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 4 }}>
                    {tasks.map((t, i) => (
                      <div key={i} style={{ padding: "10px 14px", borderRadius: 10,
                        background: skill.color + "08", border: `1px solid ${skill.color}22` }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: skill.color, marginBottom: 4 }}>▸ {t.task}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>{t.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── 學習順序 ── */}
        {activeTab === "studyorder" && (
          <div>
            <SectionHeader icon="🚀" title="0 基礎學習順序" sub="按照這個順序學習，打好 A1 基礎最有效率" />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {frenchA1ExamScope.studyOrder.map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start", padding: "14px 16px",
                  borderRadius: 14, background: "var(--panel)", border: "1px solid var(--border)" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                    background: `linear-gradient(135deg, #6366f1, #8b5cf6)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 900, fontSize: 15, color: "#fff" }}>
                    {s.step}
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                      <span style={{ fontSize: 17 }}>{s.emoji}</span>
                      <span style={{ fontWeight: 800, fontSize: 15, color: "var(--text)" }}>{s.title}</span>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 24, padding: "14px 18px", borderRadius: 14,
              background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.22)" }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#818cf8", marginBottom: 6 }}>💡 A1 合格標準</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7 }}>
                DELF A1 總分 100 分，每項 25 分。<strong style={{ color: "var(--text)" }}>60 分整體合格</strong>，且每個單項不可低於 5 分。
                考試時間：聽力 20 分鐘、閱讀 30 分鐘、寫作 30 分鐘、口說 5–7 分鐘。
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function SectionHeader({ icon, title, sub }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontWeight: 800, fontSize: 17, color: "var(--text)" }}>{title}</span>
      </div>
      {sub && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{sub}</div>}
    </div>
  );
}
