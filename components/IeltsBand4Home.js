import { useState, useEffect } from "react";
import { VOCAB_TOPICS, LISTENING_STAGES, SPEAKING_TOPICS } from "../lib/ieltsBand4Data";

const MODULES = [
  {
    id: "vocabulary",
    title: "入門詞彙",
    subtitle: "8 個生活主題・80 個高頻單字",
    emoji: "📖",
    color: "#6366f1",
    storageKey: "ib4-vocab-completed",
    total: VOCAB_TOPICS.reduce((s, t) => s + t.words.length, 0),
  },
  {
    id: "listening",
    title: "入門聽力",
    subtitle: "6 個聽力技能・數字・時間・對話",
    emoji: "🎧",
    color: "#ec4899",
    storageKey: "ib4-listen-completed",
    total: LISTENING_STAGES.reduce((s, st) => s + st.items.length, 0),
  },
  {
    id: "speaking",
    title: "口說基礎",
    subtitle: "8 個 Part 1 話題・回答模板・跟讀練習",
    emoji: "🎤",
    color: "#10b981",
    storageKey: "ib4-speak-completed",
    total: SPEAKING_TOPICS.length,
  },
];

export default function IeltsBand4Home({ onNav }) {
  const [completedCounts, setCompletedCounts] = useState({});

  useEffect(() => {
    const counts = {};
    MODULES.forEach(m => {
      try {
        const saved = localStorage.getItem(m.storageKey);
        counts[m.id] = saved ? JSON.parse(saved).length : 0;
      } catch (_) {
        counts[m.id] = 0;
      }
    });
    setCompletedCounts(counts);
  }, []);

  const totalItems = MODULES.reduce((s, m) => s + m.total, 0);
  const totalDone = MODULES.reduce((s, m) => s + (completedCounts[m.id] || 0), 0);
  const overallPct = totalItems > 0 ? Math.round((totalDone / totalItems) * 100) : 0;

  return (
    <div style={{ height: "100%", overflowY: "auto", background: "var(--bg)", color: "var(--text)" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, background: "var(--bg)", zIndex: 10 }}>
        <button onClick={() => onNav && onNav("home")}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: "var(--text-faint)", fontSize: 13, marginBottom: 8, padding: 0 }}>
          ← 返回
        </button>
        <div style={{ fontSize: 18, fontWeight: 900, color: "var(--text)", marginBottom: 2 }}>
          🎯 IELTS Band 4.0 入門路線
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
          詞彙・聽力・口說基礎
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: "var(--text-faint)" }}>整體進度 · {totalDone}/{totalItems} 完成</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#6366f1" }}>{overallPct}%</span>
        </div>
        <div style={{ height: 5, borderRadius: 3, background: "var(--border)" }}>
          <div style={{ height: "100%", borderRadius: 3, background: "linear-gradient(90deg,#6366f1,#ec4899)", width: `${overallPct}%`, transition: "width .4s" }} />
        </div>
      </div>

      <div style={{ padding: "16px 18px" }}>
        {/* Band 4 positioning card */}
        <div style={{ marginBottom: 18, padding: "14px 16px", background: "var(--panel)", borderRadius: 14, border: "1px solid #6366f120" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#6366f1", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
            🎯 Band 4.0 目標
          </div>
          <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.8 }}>
            適合英文基礎較弱的學習者。Band 4.0 不追求複雜英文，而是先做到：
          </div>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
            {["✅ 能用簡單句回答問題，不完全沉默","✅ 能聽懂日常基本資訊：數字、時間、地點","✅ 掌握 80 個高頻生活詞彙","✅ 用 because / also / for example 延伸答案"].map((t, i) => (
              <div key={i} style={{ fontSize: 12, color: "var(--text-muted)" }}>{t}</div>
            ))}
          </div>
        </div>

        {/* Today's suggestion */}
        <div style={{ marginBottom: 18, padding: "11px 14px", background: "#10b98110", borderRadius: 12, border: "1px solid #10b98125", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 22 }}>💡</div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#10b981", marginBottom: 2 }}>今日建議</div>
            <div style={{ fontSize: 12, color: "var(--text)" }}>
              {totalDone === 0 ? "從「入門詞彙」開始，先學自我介紹主題的 10 個高頻單字。" :
               totalDone < 20 ? "繼續完成詞彙主題，打好單字基礎再進入聽力練習。" :
               totalDone < 40 ? "開始「入門聽力」，練習聽數字和時間。" :
               "繼續口說練習，嘗試用模板回答每個 Part 1 話題。"}
            </div>
          </div>
        </div>

        {/* Module cards */}
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
          三個學習模組
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {MODULES.map((mod) => {
            const done = completedCounts[mod.id] || 0;
            const pct = mod.total > 0 ? Math.round((done / mod.total) * 100) : 0;
            return (
              <div key={mod.id}
                onClick={() => onNav && onNav(mod.id)}
                style={{ background: "var(--panel)", borderRadius: 16, border: `1px solid ${mod.color}25`, overflow: "hidden", cursor: "pointer", transition: "box-shadow .15s" }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = `0 0 0 2px ${mod.color}35`}
                onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
                <div style={{ padding: "14px 16px 10px", background: mod.color + "0c", borderBottom: `1px solid ${mod.color}18` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg,${mod.color}cc,${mod.color})`,
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                        {mod.emoji}
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text)" }}>{mod.title}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{mod.subtitle}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 16, fontWeight: 900, color: mod.color }}>{pct}%</div>
                      <div style={{ fontSize: 10, color: "var(--text-faint)" }}>{done}/{mod.total}</div>
                    </div>
                  </div>
                </div>
                <div style={{ padding: "10px 16px 12px" }}>
                  <div style={{ height: 4, borderRadius: 2, background: "var(--border)", marginBottom: 10 }}>
                    <div style={{ height: "100%", borderRadius: 2, background: mod.color, width: `${pct}%`, transition: "width .4s" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {done === 0 ? "尚未開始" : done === mod.total ? "🎉 已全部完成！" : `已完成 ${done} 項目`}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: mod.color }}>
                      {done === mod.total ? "複習" : done === 0 ? "開始學習 →" : "繼續 →"}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Band 4 tips */}
        <div style={{ marginTop: 20, padding: "14px 16px", background: "var(--panel)", borderRadius: 14, border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
            📋 Band 4.0 三個關鍵習慣
          </div>
          {[
            ["🗣️", "每天說一句英文", "不用長，一句話也算是練習。用模板開始。"],
            ["👂", "每天聽一段英文", "從數字、時間開始，訓練耳朵。"],
            ["📖", "每天看 5 個新詞", "不用背，多看幾次就自然記住。"],
          ].map(([ico, t, d]) => (
            <div key={t} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
              <div style={{ fontSize: 18, flexShrink: 0 }}>{ico}</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{t}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
