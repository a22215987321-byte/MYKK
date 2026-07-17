import { useState, useRef, useEffect, useCallback } from "react";
import { db } from "../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

function hexToRgb(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function replaceColor(data, [tr, tg, tb], [nr, ng, nb], threshold = 50) {
  const tLum = tr * 0.299 + tg * 0.587 + tb * 0.114;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 10) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (Math.sqrt((r - tr) ** 2 + (g - tg) ** 2 + (b - tb) ** 2) < threshold) {
      const pLum = r * 0.299 + g * 0.587 + b * 0.114;
      const k = tLum > 5 ? pLum / tLum : 1;
      data[i]     = Math.min(255, Math.max(0, nr * k));
      data[i + 1] = Math.min(255, Math.max(0, ng * k));
      data[i + 2] = Math.min(255, Math.max(0, nb * k));
    }
  }
}

// Approximate base pixel colors for each avatar
const BASE = {
  male: {
    bg:      [142, 202, 202],
    skin:    [240, 195, 160],
    hair:    [22,  14,   8 ],
    clothes: [58,  160, 150],
  },
  female: {
    bg:      [192, 172, 228],
    skin:    [240, 195, 160],
    hair:    [205, 82,  22 ],
    clothes: [148, 148, 148],
    hat:     [52,  82,  162],
  },
};

const HAIR_OPTS    = [
  {label:"黑色",hex:"#111111"},{label:"深棕",hex:"#4a2c0a"},{label:"金色",hex:"#d4a820"},
  {label:"紅棕",hex:"#c04010"},{label:"藍色",hex:"#2050c8"},{label:"紫色",hex:"#8030c0"},
  {label:"白色",hex:"#e0e0e0"},
];
const CLOTHES_OPTS = [
  {label:"青藍",hex:"#3a9898"},{label:"紅色",hex:"#c83030"},{label:"藍色",hex:"#2060c8"},
  {label:"紫色",hex:"#8030c0"},{label:"綠色",hex:"#28a050"},{label:"橙色",hex:"#d06020"},
  {label:"粉紅",hex:"#d060a0"},
];
const SKIN_OPTS    = [
  {label:"白皙",hex:"#fce8d0"},{label:"淺膚",hex:"#f5c8a0"},{label:"中等",hex:"#d4946a"},
  {label:"棕色",hex:"#b06840"},{label:"深棕",hex:"#6b3820"},
];
const BG_OPTS      = [
  {label:"青藍",hex:"#7ec8c8"},{label:"薰衣草",hex:"#c0b0e0"},{label:"天藍",hex:"#7ab0e0"},
  {label:"淺綠",hex:"#90d0a0"},{label:"粉紅",hex:"#e0a0b8"},{label:"奶黃",hex:"#e8d890"},
  {label:"深夜",hex:"#1a2040"},
];
const HAT_OPTS     = [
  {label:"藍色",hex:"#2848a0"},{label:"紅色",hex:"#c03020"},{label:"綠色",hex:"#208040"},
  {label:"黑色",hex:"#202020"},{label:"橙色",hex:"#d06020"},{label:"紫色",hex:"#7030b0"},
  {label:"白色",hex:"#d0d0d0"},
];
const JEWELRY_OPTS = [
  {label:"金色",hex:"#d4a820"},{label:"銀色",hex:"#c0c0c0"},{label:"玫瑰金",hex:"#e8a080"},
  {label:"藍寶石",hex:"#2070d8"},{label:"紅寶石",hex:"#c02020"},{label:"翡翠",hex:"#20a060"},
  {label:"黑色",hex:"#404040"},
];
const GLASS_OPTS   = [
  {label:"黑框",hex:"#202020"},{label:"金框",hex:"#d4a820"},{label:"銀框",hex:"#c0c0c0"},
  {label:"藍框",hex:"#2050c8"},{label:"紅框",hex:"#c03020"},{label:"棕框",hex:"#8b4513"},
  {label:"透明",hex:"#a0c0e0"},
];

function drawMaleHat(ctx, hatColor) {
  const [r, g, b] = hexToRgb(hatColor);
  const dark = `rgb(${Math.floor(r*0.6)},${Math.floor(g*0.6)},${Math.floor(b*0.6)})`;
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(58, 10, 84, 12);  // dome top
  ctx.fillRect(48, 20, 104, 34); // main body
  ctx.fillRect(36, 52, 128, 10); // brim
  ctx.fillStyle = dark;
  for (let x = 50; x < 148; x += 9) ctx.fillRect(x, 20, 4, 34); // ribbing
}

function drawNecklace(ctx, color, isFemale) {
  const [r, g, b] = hexToRgb(color);
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  const cy = isFemale ? 175 : 160;
  const gems = [[-28,5],[-18,2],[-8,0],[0,-1],[8,0],[18,2],[28,5]];
  gems.forEach(([dx, dy]) => {
    ctx.beginPath();
    ctx.arc(100 + dx, cy + dy, 3.5, 0, Math.PI * 2);
    ctx.fill();
  });
  const links = [[-23,3.5],[-13,1.5],[-4,0],[4,0],[13,1.5],[23,3.5]];
  ctx.fillStyle = `rgba(${r},${g},${b},0.7)`;
  links.forEach(([dx, dy]) => {
    ctx.beginPath();
    ctx.arc(100 + dx, cy + dy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawGlasses(ctx, color, isFemale) {
  const [r, g, b] = hexToRgb(color);
  ctx.strokeStyle = `rgb(${r},${g},${b})`;
  ctx.fillStyle   = `rgb(${r},${g},${b})`;
  ctx.lineWidth = 2.5;
  const eyeY = isFemale ? 118 : 90;
  // Left lens
  ctx.strokeRect(55, eyeY, 34, 18);
  // Right lens
  ctx.strokeRect(111, eyeY, 34, 18);
  // Bridge
  ctx.fillRect(89, eyeY + 8, 22, 3);
  // Temples
  ctx.beginPath();
  ctx.moveTo(55, eyeY + 9); ctx.lineTo(38, eyeY + 12);
  ctx.moveTo(145, eyeY + 9); ctx.lineTo(162, eyeY + 12);
  ctx.stroke();
}

export default function AvatarCreator({ myProfile, onClose }) {
  const [gender,     setGender]     = useState(myProfile.avatarGender     || "male");
  const [hair,       setHair]       = useState(myProfile.avatarHair       || "#111111");
  const [clothes,    setClothes]    = useState(myProfile.avatarClothes    || "#3a9898");
  const [skin,       setSkin]       = useState(myProfile.avatarSkin       || "#f5c8a0");
  const [bg,         setBg]         = useState(myProfile.avatarBg         || "#7ec8c8");
  const [hatColor,   setHatColor]   = useState(myProfile.avatarHatColor   || "#2848a0");
  const [showHat,    setShowHat]    = useState(myProfile.avatarHat        ?? false);
  const [showNeck,   setShowNeck]   = useState(myProfile.avatarNeck       ?? false);
  const [neckColor,  setNeckColor]  = useState(myProfile.avatarNeckColor  || "#d4a820");
  const [showGlass,  setShowGlass]  = useState(myProfile.avatarGlass      ?? false);
  const [glassColor, setGlassColor] = useState(myProfile.avatarGlassColor || "#202020");
  const [saving,     setSaving]     = useState(false);
  const canvasRef = useRef();

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, 200, 200);
      ctx.drawImage(img, 0, 0, 200, 200);
      const id = ctx.getImageData(0, 0, 200, 200);
      const base = BASE[gender];
      replaceColor(id.data, base.bg,      hexToRgb(bg));
      replaceColor(id.data, base.skin,    hexToRgb(skin));
      replaceColor(id.data, base.hair,    hexToRgb(hair));
      replaceColor(id.data, base.clothes, hexToRgb(clothes));
      if (gender === "female") replaceColor(id.data, base.hat, hexToRgb(hatColor));
      ctx.putImageData(id, 0, 0);
      if (gender === "male" && showHat) drawMaleHat(ctx, hatColor);
      if (showNeck)  drawNecklace(ctx, neckColor,  gender === "female");
      if (showGlass) drawGlasses(ctx, glassColor,  gender === "female");
    };
    img.src = gender === "male" ? "/avatar1.png" : "/avatar3.png";
  }, [gender, hair, clothes, skin, bg, hatColor, showHat, showNeck, neckColor, showGlass, glassColor]);

  useEffect(() => { redraw(); }, [redraw]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const dataUrl = canvasRef.current.toDataURL("image/jpeg", 0.88);
      await updateDoc(doc(db, "users", myProfile.uid), {
        avatarImage: dataUrl,
        avatarGender: gender, avatarHair: hair, avatarClothes: clothes,
        avatarSkin: skin, avatarBg: bg, avatarHatColor: hatColor,
        avatarHat: showHat, avatarNeck: showNeck, avatarNeckColor: neckColor,
        avatarGlass: showGlass, avatarGlassColor: glassColor,
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

  const ColorRow = ({ opts, value, onChange }) => (
    <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
      {opts.map(o => (
        <button key={o.hex} onClick={() => onChange(o.hex)} title={o.label}
          style={{ width: 30, height: 30, borderRadius: "50%", background: o.hex, border: "none", cursor: "pointer", outline: value === o.hex ? "3px solid #fff" : "3px solid transparent", boxShadow: value === o.hex ? "0 0 0 4px var(--accent)" : "none", transition: "box-shadow 0.1s" }} />
      ))}
    </div>
  );

  const AccessoryRow = ({ label, active, onToggle, color, setColor, colorOpts }) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: active ? 8 : 0 }}>
        <button onClick={() => onToggle(!active)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: active ? "#1d4ed820" : "var(--panel-alt)", border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`, borderRadius: 8, padding: "6px 12px", color: active ? "#60a5fa" : "var(--text-faint)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          {active ? "✓" : "+"} {label}
        </button>
      </div>
      {active && <ColorRow opts={colorOpts} value={color} onChange={setColor} />}
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 600 }}>
      <style>{`
        .ac-modal { width: 560px; max-height: 92vh; }
        .ac-body { flex-direction: row; overflow: hidden; }
        .ac-left { width: 200px; border-right: 1px solid var(--border); border-bottom: none; }
        @media (max-width: 600px) {
          .ac-modal { width: calc(100% - 20px); max-width: 100%; max-height: calc(100dvh - 20px); border-radius: 16px; }
          .ac-body { flex-direction: column; overflow-y: auto; }
          .ac-left { width: 100%; border-right: none; border-bottom: 1px solid var(--border); }
          .ac-close-btn { min-width: 44px; min-height: 44px; display: flex; align-items: center; justify-content: center; }
        }
      `}</style>
      <div className="ac-modal" style={{ background: "var(--panel)", borderRadius: 20, overflow: "hidden", border: "1px solid var(--border)", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 17, color: "var(--text)" }}>🎨 設計我的頭像</div>
          <button onClick={onClose} className="ac-close-btn" style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 22 }}>✕</button>
        </div>

        <div className="ac-body" style={{ display: "flex", flex: 1 }}>
          {/* Left: Preview */}
          <div className="ac-left" style={{ padding: "20px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, flexShrink: 0, background: "var(--panel-alt)" }}>
            <canvas ref={canvasRef} width={200} height={200}
              style={{ borderRadius: 14, border: "2px solid var(--border)", width: 168, height: 168 }} />

            {/* Gender */}
            <div style={{ display: "flex", gap: 6, width: "100%" }}>
              {[["male","👦 男生"],["female","👧 女生"]].map(([g, l]) => (
                <button key={g} onClick={() => setGender(g)}
                  style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: gender === g ? "2px solid var(--accent)" : "1px solid var(--border)", background: gender === g ? "#1d4ed830" : "var(--panel)", color: gender === g ? "#60a5fa" : "var(--text-faint)", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                  {l}
                </button>
              ))}
            </div>

            <button onClick={handleSave} disabled={saving}
              style={{ width: "100%", background: saving ? "var(--border)" : "linear-gradient(135deg,var(--accent),var(--accent-2))", border: "none", borderRadius: 10, padding: "11px 0", color: saving ? "var(--text-faint)" : "#fff", fontSize: 14, fontWeight: 700, cursor: saving ? "default" : "pointer" }}>
              {saving ? "儲存中..." : "✓ 儲存頭像"}
            </button>
          </div>

          {/* Right: Options */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 24px" }}>
            <Section title="髮色">
              <ColorRow opts={HAIR_OPTS} value={hair} onChange={setHair} />
            </Section>
            <Section title="服裝顏色">
              <ColorRow opts={CLOTHES_OPTS} value={clothes} onChange={setClothes} />
            </Section>
            <Section title="膚色">
              <ColorRow opts={SKIN_OPTS} value={skin} onChange={setSkin} />
            </Section>
            <Section title="背景顏色">
              <ColorRow opts={BG_OPTS} value={bg} onChange={setBg} />
            </Section>
            <Section title={gender === "female" ? "帽子顏色" : "配件"}>
              {gender === "female" ? (
                <ColorRow opts={HAT_OPTS} value={hatColor} onChange={setHatColor} />
              ) : (
                <AccessoryRow label="帽子" active={showHat} onToggle={setShowHat} color={hatColor} setColor={setHatColor} colorOpts={HAT_OPTS} />
              )}
            </Section>
            {gender === "female" && (
              <div style={{ height: 1 }} />
            )}
            <Section title="裝飾品">
              <AccessoryRow label="頸飾" active={showNeck} onToggle={setShowNeck} color={neckColor} setColor={setNeckColor} colorOpts={JEWELRY_OPTS} />
              <AccessoryRow label="眼鏡" active={showGlass} onToggle={setShowGlass} color={glassColor} setColor={setGlassColor} colorOpts={GLASS_OPTS} />
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}
