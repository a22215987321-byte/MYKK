import { useState } from "react";
import { toast } from "../lib/toast";

// Layout-only for now — no real Stripe wiring yet ("價格付費功能之後弄").
// 月付/年付 toggle is a real UI state (just swaps displayed copy, no
// backend), 立即升級 is a placeholder until an actual checkout flow exists.
const PLANS = [
  {
    id: "free", name: "Free（免費）", price: 0, icon: "👤",
    audience: "偶爾使用、基礎文字處理者",
    features: ["旗艦模型與核心功能", "基礎 GPT-5.4 存取、限制次數的圖片生成"],
  },
  {
    id: "go", name: "Go", price: 8, icon: "🚀",
    audience: "經常使用、不需進階推理的個人",
    features: ["旗艦模型與核心功能", "擴展的 GPT-5 自動訊息量、更高的檔案上傳與圖片生成額度"],
  },
  {
    id: "plus", name: "Plus", price: 20, icon: "⚡", badge: "★ 最受歡迎", highlight: true,
    audience: "自由職業者、創作者、重度個人用戶",
    features: ["旗艦模型與核心功能", "完整支援旗艦級 GPT-5.6 Sol 模型、優先無限制存取、進階工作記憶與任務功能"],
  },
  {
    id: "pro", name: "Pro（5x）", price: 100, icon: "🛡️",
    audience: "專業開發者、研究人員、AI 重度依賴者",
    features: ["旗艦模型與核心功能", "包含 Plus 所有功能，額外提供專屬 Sol Pro 模型與 5 倍用量"],
  },
];

const HIGHLIGHTS = [
  { icon: "📈", title: "更高用量", desc: "更多訊息與生成額度，滿足各種使用情境" },
  { icon: "📦", title: "更強模型", desc: "存取最新旗艦模型，帶來更準確的回應" },
  { icon: "🧠", title: "進階記憶", desc: "更強的記憶與任務能力，提升長期協作效率" },
  { icon: "⚡", title: "優先存取", desc: "新功能搶先體驗，享有更快的支援回應" },
];

function PlanCard({ plan, cycle }) {
  const price = cycle === "year" ? plan.price * 10 : plan.price; // 2 months free on annual, placeholder math
  return (
    <div style={{
      flex: "1 1 260px", minWidth: 240, padding: 20, borderRadius: 16,
      background: "var(--panel)",
      border: plan.highlight ? "2px solid var(--accent)" : "1px solid var(--border)",
      boxShadow: plan.highlight ? "0 0 0 1px var(--accent), 0 8px 24px rgba(99,102,241,0.15)" : "none",
      position: "relative",
    }}>
      {plan.badge && (
        <span style={{ position: "absolute", top: -12, left: 20, background: "var(--accent)", color: "var(--accent-text)", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999 }}>
          {plan.badge}
        </span>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text)" }}>{plan.name}</div>
        <span style={{ fontSize: 18 }}>{plan.icon}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 14 }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: "var(--text)" }}>${price}</span>
        <span style={{ fontSize: 13, color: "var(--text-faint)" }}>/ {cycle === "year" ? "年" : "月"}</span>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10, fontSize: 12, color: "var(--text-muted)" }}>
        <span>👥</span>
        <span>{plan.audience}</span>
      </div>
      <div style={{ display: "flex", gap: 6, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
        <span style={{ flexShrink: 0 }}>⭐</span>
        <div>
          <div style={{ fontWeight: 600, color: "var(--text-subtle)" }}>{plan.features[0]}</div>
          <div>{plan.features[1]}</div>
        </div>
      </div>
    </div>
  );
}

export default function UpgradeMembership() {
  const [cycle, setCycle] = useState("month");

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>
      <div style={{ flex: 1, minWidth: 0, overflowY: "auto", padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,var(--accent),var(--accent-2))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>💎</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 20, color: "var(--text)" }}>升級會員方案</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>選擇最適合你的 AI 使用方式</div>
            </div>
          </div>
          <div style={{ display: "flex", background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: 999, padding: 3 }}>
            {[["month", "月付"], ["year", "年付"]].map(([id, label]) => (
              <button key={id} onClick={() => setCycle(id)}
                style={{ padding: "6px 16px", borderRadius: 999, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                  background: cycle === id ? "var(--panel)" : "none", color: cycle === id ? "var(--text)" : "var(--text-faint)",
                  boxShadow: cycle === id ? "var(--card-shadow)" : "none" }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
          {PLANS.map(p => <PlanCard key={p.id} plan={p} cycle={cycle} />)}
        </div>

        <div style={{ marginTop: 20, textAlign: "center", fontSize: 12, color: "var(--text-dim)" }}>
          🔒 所有方案皆包含企業級安全性與隱私保護
        </div>
      </div>

      <div style={{ width: 260, flexShrink: 0, borderLeft: "1px solid var(--border)", padding: 20, overflowY: "auto" }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          ✨ 升級重點
        </div>
        {HIGHLIGHTS.map(h => (
          <div key={h.title} style={{ display: "flex", gap: 10, marginBottom: 14, padding: 12, background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: 12 }}>
            <div style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 8, background: "var(--panel)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{h.icon}</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text)" }}>{h.title}</div>
              <div style={{ fontSize: 11, color: "var(--text-faint)", lineHeight: 1.5 }}>{h.desc}</div>
            </div>
          </div>
        ))}
        <button onClick={() => toast("付費升級功能即將推出")}
          style={{ width: "100%", background: "linear-gradient(135deg,var(--accent),var(--accent-2))", border: "none", borderRadius: 12, padding: "12px 0", color: "var(--accent-text)", fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 4 }}>
          👑 立即升級
        </button>
        <div style={{ textAlign: "center", fontSize: 11, color: "var(--text-dim)", marginTop: 8 }}>
          🔒 安全付款・隨時可取消
        </div>
      </div>
    </div>
  );
}
