import { useState, useEffect } from "react";
import { FONT_FAMILIES } from "./usePhotoEditorCore";

// Tabbed text-property panel — embedded 圖片編輯室 only (the fullscreen
// editor keeps its original 2-button text drawer via renderPhotoEditorDrawer;
// this is deliberately NOT part of that shared function so Feed/個人頁 stay
// unaffected). Reads/writes properties directly on whichever fabric text
// object is currently selected (core.selectedObj); core.selTick is bumped
// after every write so this re-reads fresh values even though the object
// reference itself never changes.
const TABS = [
  { id: "text", label: "文字" },
  { id: "style", label: "樣式" },
  { id: "shadow", label: "陰影" },
  { id: "stroke", label: "描邊" },
  { id: "bg", label: "背景" },
  { id: "spacing", label: "間距" },
  { id: "align", label: "對齊" },
];

const SWATCHES = ["#1a1a1a", "#ffffff", "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"];

export default function TextPanel({ core }) {
  const [tab, setTab] = useState("text");
  const { selectedObj, selTick, updateTextProp, commitTextProp, updateTextShadow, alignObjectToCanvas, addText } = core;
  void selTick; // referenced only to force this component to re-render after every property write

  const isText = !!selectedObj && ["i-text", "text", "textbox"].includes(selectedObj.type);

  if (!isText) {
    return (
      <div>
        <button onClick={addText} style={primaryBtnStyle}>+ 新增文字</button>
        <div style={{ fontSize: 11, color: "var(--pe-text-dim)", marginTop: 8 }}>
          新增文字後，點選畫布上的文字物件即可在這裡編輯樣式
        </div>
      </div>
    );
  }

  const obj = selectedObj;

  return (
    <div>
      <div style={{ display: "flex", gap: 4, overflowX: "auto", marginBottom: 12, borderBottom: "1px solid var(--pe-border)", paddingBottom: 8 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              flexShrink: 0, padding: "6px 12px", borderRadius: 8, border: "none",
              background: tab === t.id ? "var(--accent)" : "transparent",
              color: tab === t.id ? "var(--accent-text)" : "var(--pe-text-dim)",
              fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "text" && <ContentTab obj={obj} updateTextProp={updateTextProp} commitTextProp={commitTextProp} />}
      {tab === "style" && <StyleTab obj={obj} updateTextProp={updateTextProp} />}
      {tab === "shadow" && <ShadowTab obj={obj} updateTextShadow={updateTextShadow} />}
      {tab === "stroke" && <StrokeTab obj={obj} updateTextProp={updateTextProp} commitTextProp={commitTextProp} />}
      {tab === "bg" && <BgTab obj={obj} updateTextProp={updateTextProp} />}
      {tab === "spacing" && <SpacingTab obj={obj} updateTextProp={updateTextProp} commitTextProp={commitTextProp} />}
      {tab === "align" && <AlignTab alignObjectToCanvas={alignObjectToCanvas} />}
    </div>
  );
}

function ContentTab({ obj, updateTextProp, commitTextProp }) {
  const [value, setValue] = useState(obj.text);
  useEffect(() => { setValue(obj.text); }, [obj]);
  return (
    <textarea
      value={value}
      onChange={e => { setValue(e.target.value); updateTextProp({ text: e.target.value }, { commit: false }); }}
      onBlur={commitTextProp}
      rows={3}
      style={{
        width: "100%", boxSizing: "border-box", padding: 10, borderRadius: 8,
        border: "1px solid var(--pe-border)", background: "var(--pe-control-bg)", color: "var(--pe-text)",
        fontSize: 14, resize: "vertical", fontFamily: "inherit",
      }}
    />
  );
}

function StyleTab({ obj, updateTextProp }) {
  const isBold = obj.fontWeight === "bold" || obj.fontWeight === 700 || obj.fontWeight >= 700;
  return (
    <div>
      <div style={labelStyle}>字型</div>
      <select value={obj.fontFamily} onChange={e => updateTextProp({ fontFamily: e.target.value })} style={selectStyle}>
        {FONT_FAMILIES.map(f => <option key={f.id} value={f.value}>{f.label}</option>)}
      </select>

      <div style={{ ...labelStyle, marginTop: 12 }}>字級</div>
      <input type="number" min={8} max={200} value={Math.round(obj.fontSize)}
        onChange={e => updateTextProp({ fontSize: Math.max(8, Number(e.target.value) || 8) })}
        style={numberInputStyle} />

      <div style={{ ...labelStyle, marginTop: 12 }}>顏色</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {SWATCHES.map(c => (
          <button key={c} onClick={() => updateTextProp({ fill: c })} aria-label={`文字顏色 ${c}`}
            style={{
              width: 26, height: 26, borderRadius: "50%", background: c, cursor: "pointer",
              border: obj.fill === c ? "2px solid var(--accent)" : "1px solid var(--pe-border)",
            }} />
        ))}
        <input type="color" value={typeof obj.fill === "string" && obj.fill.startsWith("#") ? obj.fill : "#000000"}
          onChange={e => updateTextProp({ fill: e.target.value })}
          style={{ width: 26, height: 26, border: "none", background: "none", cursor: "pointer", padding: 0 }} />
      </div>

      <div style={{ ...labelStyle, marginTop: 12 }}>樣式</div>
      <div style={{ display: "flex", gap: 6 }}>
        <ToggleBtn active={isBold} onClick={() => updateTextProp({ fontWeight: isBold ? "normal" : "bold" })}><b>B</b></ToggleBtn>
        <ToggleBtn active={obj.fontStyle === "italic"} onClick={() => updateTextProp({ fontStyle: obj.fontStyle === "italic" ? "normal" : "italic" })}><i>I</i></ToggleBtn>
        <ToggleBtn active={!!obj.underline} onClick={() => updateTextProp({ underline: !obj.underline })}><u>U</u></ToggleBtn>
      </div>

      <div style={{ ...labelStyle, marginTop: 12 }}>段落對齊</div>
      <div style={{ display: "flex", gap: 6 }}>
        {[["left", "靠左"], ["center", "置中"], ["right", "靠右"], ["justify", "左右對齊"]].map(([v, l]) => (
          <ToggleBtn key={v} active={obj.textAlign === v} onClick={() => updateTextProp({ textAlign: v })}>{l}</ToggleBtn>
        ))}
      </div>
    </div>
  );
}

function shadowColorToHex(color) {
  if (!color) return "#000000";
  if (color.startsWith("#")) return color;
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return "#000000";
  const hex = n => Number(n).toString(16).padStart(2, "0");
  return `#${hex(m[1])}${hex(m[2])}${hex(m[3])}`;
}

function ShadowTab({ obj, updateTextShadow }) {
  const enabled = !!obj.shadow;
  return (
    <div>
      <label style={checkboxRowStyle}>
        <input type="checkbox" checked={enabled} onChange={e => updateTextShadow({ enabled: e.target.checked })} />
        <span>啟用陰影</span>
      </label>
      {enabled && (
        <>
          <div style={labelStyle}>顏色</div>
          <input type="color" value={shadowColorToHex(obj.shadow.color)}
            onChange={e => updateTextShadow({ color: e.target.value })}
            style={{ width: 32, height: 32, border: "none", cursor: "pointer", padding: 0, marginBottom: 8 }} />
          <SliderRow label="模糊" value={obj.shadow.blur} min={0} max={40}
            onChange={v => updateTextShadow({ blur: v }, { commit: false })}
            onCommit={() => updateTextShadow({ blur: obj.shadow.blur })} />
          <SliderRow label="水平位移" value={obj.shadow.offsetX} min={-40} max={40}
            onChange={v => updateTextShadow({ offsetX: v }, { commit: false })}
            onCommit={() => updateTextShadow({ offsetX: obj.shadow.offsetX })} />
          <SliderRow label="垂直位移" value={obj.shadow.offsetY} min={-40} max={40}
            onChange={v => updateTextShadow({ offsetY: v }, { commit: false })}
            onCommit={() => updateTextShadow({ offsetY: obj.shadow.offsetY })} />
        </>
      )}
    </div>
  );
}

function StrokeTab({ obj, updateTextProp, commitTextProp }) {
  const enabled = !!obj.stroke && (obj.strokeWidth || 0) > 0;
  return (
    <div>
      <label style={checkboxRowStyle}>
        <input type="checkbox" checked={enabled}
          onChange={e => updateTextProp({
            stroke: e.target.checked ? (obj.stroke || "#000000") : null,
            strokeWidth: e.target.checked ? (obj.strokeWidth || 1) : 0,
          })} />
        <span>啟用描邊</span>
      </label>
      {enabled && (
        <>
          <div style={labelStyle}>顏色</div>
          <input type="color" value={obj.stroke && obj.stroke.startsWith("#") ? obj.stroke : "#000000"}
            onChange={e => updateTextProp({ stroke: e.target.value })}
            style={{ width: 32, height: 32, border: "none", cursor: "pointer", padding: 0, marginBottom: 8 }} />
          <SliderRow label="粗細" value={obj.strokeWidth || 1} min={0.5} max={10} step={0.5}
            onChange={v => updateTextProp({ strokeWidth: v }, { commit: false })}
            onCommit={commitTextProp} />
        </>
      )}
    </div>
  );
}

function BgTab({ obj, updateTextProp }) {
  const enabled = !!obj.backgroundColor;
  return (
    <div>
      <label style={checkboxRowStyle}>
        <input type="checkbox" checked={enabled}
          onChange={e => updateTextProp({ backgroundColor: e.target.checked ? (obj.backgroundColor || "#ffffff") : "" })} />
        <span>啟用文字底色</span>
      </label>
      {enabled && (
        <input type="color" value={obj.backgroundColor && obj.backgroundColor.startsWith("#") ? obj.backgroundColor : "#ffffff"}
          onChange={e => updateTextProp({ backgroundColor: e.target.value })}
          style={{ width: 32, height: 32, border: "none", cursor: "pointer", padding: 0 }} />
      )}
    </div>
  );
}

function SpacingTab({ obj, updateTextProp, commitTextProp }) {
  return (
    <div>
      <SliderRow label="字距" value={obj.charSpacing || 0} min={-200} max={800}
        onChange={v => updateTextProp({ charSpacing: v }, { commit: false })} onCommit={commitTextProp} />
      <SliderRow label="行距" value={obj.lineHeight ?? 1.16} min={0.5} max={3} step={0.05}
        onChange={v => updateTextProp({ lineHeight: v }, { commit: false })} onCommit={commitTextProp} />
    </div>
  );
}

function AlignTab({ alignObjectToCanvas }) {
  const BTNS = [
    ["center-h", "水平置中"], ["center-v", "垂直置中"],
    ["left", "靠左"], ["right", "靠右"],
    ["top", "靠上"], ["bottom", "靠下"],
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
      {BTNS.map(([mode, label]) => (
        <button key={mode} onClick={() => alignObjectToCanvas(mode)} style={secondaryBtnStyle}>{label}</button>
      ))}
    </div>
  );
}

function ToggleBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      style={{
        minWidth: 40, minHeight: 36, borderRadius: 8, cursor: "pointer", fontSize: 13,
        border: active ? "1px solid var(--accent)" : "1px solid var(--pe-border)",
        background: active ? "var(--accent)" : "var(--pe-control-bg)",
        color: active ? "var(--accent-text)" : "var(--pe-text)",
        padding: "0 10px",
      }}>
      {children}
    </button>
  );
}

function SliderRow({ label, value, min, max, step = 1, onChange, onCommit }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--pe-text-dim)", marginBottom: 4 }}>
        <span>{label}</span><span>{Math.round(value * 100) / 100}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        onMouseUp={onCommit} onTouchEnd={onCommit}
        style={{ width: "100%", height: 36 }} />
    </div>
  );
}

const labelStyle = { fontSize: 12, color: "var(--pe-text-dim)", marginBottom: 6 };
const selectStyle = {
  width: "100%", minHeight: 40, padding: "0 10px", borderRadius: 8,
  border: "1px solid var(--pe-border)", background: "var(--pe-control-bg)", color: "var(--pe-text)", fontSize: 13,
};
const numberInputStyle = { ...selectStyle, width: 100 };
const checkboxRowStyle = { display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: 13, color: "var(--pe-text)", cursor: "pointer" };
const primaryBtnStyle = {
  minHeight: 44, padding: "0 18px", borderRadius: 10, border: "none", width: "100%",
  background: "var(--accent)", color: "var(--accent-text)", fontSize: 14, fontWeight: 700, cursor: "pointer",
};
const secondaryBtnStyle = {
  minHeight: 44, padding: "0 14px", borderRadius: 10, border: "1px solid var(--pe-border)",
  background: "var(--pe-control-bg)", color: "var(--pe-text)", fontSize: 13, fontWeight: 600, cursor: "pointer",
};
