import { useState } from "react";
import { db } from "../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { COMPANION_TRAITS } from "../lib/aiCompanionPrompt";

const MAX_TRAITS = 2;
const MAX_NAME_LENGTH = 20;

// Structural copy of AvatarCreator.js's modal/Section/swatch-grid pattern —
// same "left preview + right categorized sections + single save" shape,
// just with trait chips and voice sliders instead of color swatches. No
// separate appearance editor: the companion's face is whatever avatar the
// user already made in AvatarCreator.
export default function AiCompanionCreator({ myProfile, onClose }) {
  const [name,   setName]   = useState(myProfile.companionName   || "");
  const [gender, setGender] = useState(myProfile.companionGender || "female");
  const [traits, setTraits] = useState(myProfile.companionTraits || []);
  const [pitch,  setPitch]  = useState(myProfile.companionVoicePitch ?? 1);
  const [rate,   setRate]   = useState(myProfile.companionVoiceRate  ?? 1);
  const [saving, setSaving] = useState(false);

  const toggleTrait = (id) => {
    setTraits(prev => {
      if (prev.includes(id)) return prev.filter(t => t !== id);
      if (prev.length >= MAX_TRAITS) return prev;
      return [...prev, id];
    });
  };

  const testVoice = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(`嗨，我是${name || "你的 AI 夥伴"}，很高興認識你！`);
    utter.lang = "zh-TW";
    utter.pitch = pitch;
    utter.rate = rate;
    window.speechSynthesis.speak(utter);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", myProfile.uid), {
        companionName: name.trim().slice(0, MAX_NAME_LENGTH) || "AI 夥伴",
        companionGender: gender,
        companionTraits: traits,
        companionVoicePitch: pitch,
        companionVoiceRate: rate,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const Section = ({ title, children }) => (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>{title}</div>
      {children}
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 600 }}>
      <style>{`
        .cc-modal { width: 560px; max-height: 92vh; }
        .cc-body { flex-direction: row; overflow: hidden; }
        .cc-left { width: 200px; border-right: 1px solid var(--border); border-bottom: none; }
        @media (max-width: 600px) {
          .cc-modal { width: calc(100% - 20px); max-width: 100%; max-height: calc(100dvh - 20px); border-radius: 16px; }
          .cc-body { flex-direction: column; overflow-y: auto; }
          .cc-left { width: 100%; border-right: none; border-bottom: 1px solid var(--border); }
          .cc-close-btn { min-width: 44px; min-height: 44px; display: flex; align-items: center; justify-content: center; }
        }
      `}</style>
      <div className="cc-modal" style={{ background: "var(--panel)", borderRadius: 20, overflow: "hidden", border: "1px solid var(--border)", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 17, color: "var(--text)" }}>💬 設計我的 AI 夥伴</div>
          <button onClick={onClose} className="cc-close-btn" style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 22 }}>✕</button>
        </div>

        <div className="cc-body" style={{ display: "flex", flex: 1 }}>
          <div className="cc-left" style={{ padding: "20px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, flexShrink: 0, background: "var(--panel-alt)" }}>
            {myProfile.avatarImage ? (
              <img src={myProfile.avatarImage} alt="" style={{ width: 168, height: 168, borderRadius: 14, border: "2px solid var(--border)", objectFit: "cover" }} />
            ) : (
              <div style={{ width: 168, height: 168, borderRadius: 14, border: "2px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "var(--text-faint)", textAlign: "center", padding: 10 }}>
                夥伴會沿用你的頭像，先去「設計我的頭像」設定一個吧
              </div>
            )}

            <input value={name} onChange={e => setName(e.target.value.slice(0, MAX_NAME_LENGTH))}
              placeholder="幫夥伴取個名字"
              style={{ width: "100%", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", color: "var(--text)", fontSize: 14, textAlign: "center", boxSizing: "border-box" }} />

            <div style={{ display: "flex", gap: 6, width: "100%" }}>
              {[["male","👦 男生"],["female","👧 女生"]].map(([g, l]) => (
                <button key={g} onClick={() => setGender(g)}
                  style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: gender === g ? "2px solid var(--accent)" : "1px solid var(--border)", background: gender === g ? "#1d4ed830" : "var(--panel)", color: gender === g ? "#60a5fa" : "var(--text-faint)", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                  {l}
                </button>
              ))}
            </div>

            <button onClick={handleSave} disabled={saving}
              style={{ width: "100%", background: saving ? "var(--border)" : "linear-gradient(135deg,var(--accent),var(--accent-2))", border: "none", borderRadius: 10, padding: "11px 0", color: saving ? "var(--text-faint)" : "var(--accent-text)", fontSize: 14, fontWeight: 700, cursor: saving ? "default" : "pointer" }}>
              {saving ? "儲存中..." : "✓ 儲存夥伴"}
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 24px" }}>
            <Section title={`個性（最多選 ${MAX_TRAITS} 個）`}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {COMPANION_TRAITS.map(t => {
                  const active = traits.includes(t.id);
                  const disabled = !active && traits.length >= MAX_TRAITS;
                  return (
                    <button key={t.id} onClick={() => toggleTrait(t.id)} disabled={disabled}
                      style={{ background: active ? "#1d4ed820" : "var(--panel-alt)", border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`, borderRadius: 8, padding: "6px 14px", color: active ? "#60a5fa" : disabled ? "var(--text-faint)" : "var(--text)", cursor: disabled ? "default" : "pointer", fontSize: 13, fontWeight: 600, opacity: disabled ? 0.5 : 1 }}>
                      {active ? "✓ " : ""}{t.label}
                    </button>
                  );
                })}
              </div>
            </Section>

            <Section title="聲音">
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>音調 {pitch.toFixed(1)}</div>
                <input type="range" min="0.5" max="2" step="0.1" value={pitch}
                  onChange={e => setPitch(parseFloat(e.target.value))} style={{ width: "100%" }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>語速 {rate.toFixed(1)}</div>
                <input type="range" min="0.5" max="2" step="0.1" value={rate}
                  onChange={e => setRate(parseFloat(e.target.value))} style={{ width: "100%" }} />
              </div>
              <button onClick={testVoice}
                style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 14px", color: "var(--text)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                🔊 試聽
              </button>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}
