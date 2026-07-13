import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { doc, setDoc, onSnapshot, collection, query, where } from "firebase/firestore";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
const MONTHS = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];

function toKey(uid, date) {
  return `${uid}_${date}`;
}

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function CalendarMemo({ uid }) {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [memos, setMemos] = useState({});       // { 'YYYY-MM-DD': text }
  const [selected, setSelected] = useState(null); // 'YYYY-MM-DD'
  const [draft,    setDraft]    = useState("");
  const [saving,   setSaving]   = useState(false);

  // Load this month's memos
  useEffect(() => {
    const prefix = `${uid}_${year}-${String(month + 1).padStart(2, "0")}`;
    const q = query(collection(db, "memos"), where("userId", "==", uid));
    return onSnapshot(q, snap => {
      const map = {};
      snap.docs.forEach(d => {
        const data = d.data();
        if (data.date) map[data.date] = data.text;
      });
      setMemos(map);
    });
  }, [uid, year, month]);

  // When selecting a date, load existing memo into draft
  useEffect(() => {
    if (selected) setDraft(memos[selected] || "");
  }, [selected, memos]);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelected(null);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelected(null);
  };

  const saveMemo = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const key = toKey(uid, selected);
      if (draft.trim()) {
        await setDoc(doc(db, "memos", key), {
          userId: uid,
          date: selected,
          text: draft.trim(),
          updatedAt: new Date(),
        });
      } else {
        // Empty = delete by setting empty text
        await setDoc(doc(db, "memos", key), {
          userId: uid,
          date: selected,
          text: "",
          updatedAt: new Date(),
        });
      }
      setSelected(null);
    } finally {
      setSaving(false);
    }
  };

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={{
      width: 252, flexShrink: 0, background: "var(--panel-alt)",
      borderLeft: "1px solid var(--panel)", display: "flex",
      flexDirection: "column", height: "100%", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ padding: "14px 12px 10px", borderBottom: "1px solid var(--panel)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <button onClick={prevMonth} style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 18, padding: "2px 6px", borderRadius: 6 }}>‹</button>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>
            {year} 年 {MONTHS[month]}
          </div>
          <button onClick={nextMonth} style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 18, padding: "2px 6px", borderRadius: 6 }}>›</button>
        </div>

        {/* Weekday labels */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
          {WEEKDAYS.map(w => (
            <div key={w} style={{ textAlign: "center", fontSize: 10, color: "var(--text-dim)", fontWeight: 600, padding: "2px 0" }}>{w}</div>
          ))}
        </div>
      </div>

      {/* Calendar grid */}
      <div style={{ padding: "8px 10px", flexShrink: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
          {cells.map((day, i) => {
            if (!day) return <div key={`e${i}`} />;
            const dateStr = toDateStr(year, month, day);
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selected;
            const hasMemo = !!(memos[dateStr] && memos[dateStr].trim());
            return (
              <button key={day} onClick={() => setSelected(isSelected ? null : dateStr)}
                style={{
                  position: "relative", aspectRatio: "1", borderRadius: 6,
                  border: isSelected ? "2px solid var(--accent)" : "1px solid transparent",
                  background: isSelected ? "#1d4ed820" : isToday ? "var(--panel)" : "none",
                  color: isToday ? "#60a5fa" : "var(--text)",
                  cursor: "pointer", fontSize: 12, fontWeight: isToday ? 700 : 400,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexDirection: "column", padding: 0,
                }}>
                {day}
                {hasMemo && (
                  <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--accent)", position: "absolute", bottom: 2 }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Memo editor */}
      {selected && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0 10px 12px", overflow: "hidden" }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, fontWeight: 600 }}>
            📝 {selected} 備忘錄
          </div>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="寫下今天的備忘..."
            style={{
              flex: 1, background: "var(--panel)", border: "1px solid var(--border)",
              borderRadius: 10, padding: "10px 12px", color: "var(--text)",
              fontSize: 13, outline: "none", resize: "none", lineHeight: 1.6,
              fontFamily: "inherit",
            }}
          />
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button onClick={() => setSelected(null)}
              style={{ flex: 1, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 0", color: "var(--text-faint)", cursor: "pointer", fontSize: 13 }}>
              取消
            </button>
            <button onClick={saveMemo} disabled={saving}
              style={{ flex: 2, background: saving ? "var(--border)" : "linear-gradient(135deg,var(--accent),var(--accent-2))", border: "none", borderRadius: 8, padding: "7px 0", color: saving ? "var(--text-faint)" : "#fff", cursor: saving ? "default" : "pointer", fontSize: 13, fontWeight: 700 }}>
              {saving ? "儲存中..." : "儲存"}
            </button>
          </div>
        </div>
      )}

      {!selected && (
        <div style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
          {/* Show memos for this month */}
          {Object.entries(memos)
            .filter(([date, text]) => date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`) && text.trim())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, text]) => (
              <div key={date} onClick={() => setSelected(date)} style={{ marginBottom: 8, padding: "8px 10px", background: "var(--panel)", borderRadius: 8, border: "1px solid var(--border)", cursor: "pointer" }}>
                <div style={{ fontSize: 10, color: "var(--accent)", fontWeight: 700, marginBottom: 3 }}>{date.slice(5)}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{text}</div>
              </div>
            ))
          }
          {Object.entries(memos).filter(([d, t]) => d.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`) && t.trim()).length === 0 && (
            <div style={{ textAlign: "center", color: "var(--border)", fontSize: 12, marginTop: 20 }}>點擊日期新增備忘</div>
          )}
        </div>
      )}
    </div>
  );
}
