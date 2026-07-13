import { useState, useEffect } from "react";
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, getDocs, query, where, orderBy, limit,
  serverTimestamp,
} from "firebase/firestore";
import ClickableSentence from "./ClickableSentence";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function genOptions(correct, allWords) {
  const others = allWords.filter((w) => w.word !== correct.word);
  return shuffle([correct, ...shuffle(others).slice(0, 3)]);
}

function speakWord(word, lang) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(word);
  u.lang = lang || "en-US";
  u.rate = 0.85;
  window.speechSynthesis.speak(u);
}

const LANG_OPTIONS = ["中文", "英語", "西語", "法語"];
const languageToLocale = language => language === "法語" ? "fr-FR" : language === "西語" ? "es-ES" : "en-US";
const localeLabel = locale => locale === "fr-FR" ? "法語" : locale === "es-ES" ? "西語" : "英語";

function WordField({ label, value, onChange, placeholder, required }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ color: required ? "var(--text-muted)" : "var(--text-faint)", fontSize: 12, marginBottom: 5, display: "block" }}>
        {label}{required ? " *" : " (選填)"}
      </label>
      <input value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", background: "var(--panel-alt)", border: `1px solid ${required ? "var(--border)" : "var(--panel)"}`, borderRadius: 8, padding: "9px 12px", color: "var(--text)", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
    </div>
  );
}

// ─── Modals ────────────────────────────────────────────────────────────────

function CreateListModal({ onClose, onCreate }) {
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const valid = title.trim() && language;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
      <div style={{ background: "var(--panel)", borderRadius: 20, width: 400, border: "1px solid var(--border)", padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ color: "var(--text)", margin: 0, fontSize: 18, fontWeight: 700 }}>建立新詞彙表</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 22 }}>✕</button>
        </div>

        <label style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 6, display: "block" }}>詞彙表名稱 *</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="例：我的英語單字"
          style={{ width: "100%", background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", color: "var(--text)", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 16 }} />

        <label style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 8, display: "block" }}>語言 *</label>
        <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
          {LANG_OPTIONS.map(lang => (
            <button key={lang} onClick={() => setLanguage(lang)}
              style={{ flex: 1, padding: "10px 0", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 14, transition: "all 0.15s",
                background: language === lang ? "linear-gradient(135deg,#4c1d95,#7c3aed)" : "var(--panel-alt)",
                color: language === lang ? "#fff" : "var(--text-faint)",
                border: language === lang ? "2px solid transparent" : "2px solid var(--border)" }}>
              {lang}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <button onClick={() => setIsPublic(v => !v)}
            style={{ width: 42, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: isPublic ? "var(--accent)" : "var(--border)", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: isPublic ? 21 : 3, transition: "left 0.2s" }} />
          </button>
          <span style={{ color: "var(--text-muted)", fontSize: 14 }}>{isPublic ? "🔓 公開（其他人可看到）" : "🔒 私人（只有自己可見）"}</span>
        </div>

        <button onClick={() => valid && onCreate({ title: title.trim(), language, isPublic })} disabled={!valid}
          style={{ width: "100%", background: valid ? "linear-gradient(135deg,var(--accent),var(--accent-2))" : "var(--panel)", border: "none", borderRadius: 10, padding: 12, color: valid ? "#fff" : "var(--text-dim)", fontSize: 15, fontWeight: 700, cursor: valid ? "pointer" : "default" }}>
          建立詞彙表
        </button>
      </div>
    </div>
  );
}

function WordModal({ word: initWord, onClose, onSave, categories }) {
  const [form, setForm] = useState(initWord || { word: "", cn: "", phonetic: "", pos: "", example: "", exampleCn: "", category: "" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.word.trim() && form.cn.trim();
  const hasCats = categories && categories.length > 0;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
      <div style={{ background: "var(--panel)", borderRadius: 20, width: 420, maxHeight: "90vh", overflow: "auto", border: "1px solid var(--border)", padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ color: "var(--text)", margin: 0, fontSize: 18, fontWeight: 700 }}>{initWord ? "編輯單字" : "新增單字"}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 22 }}>✕</button>
        </div>
        <WordField label="單字" value={form.word} onChange={v => set("word", v)} placeholder="輸入單字" required />
        <WordField label="中文翻譯" value={form.cn} onChange={v => set("cn", v)} placeholder="中文意思" required />
        <WordField label="音標" value={form.phonetic} onChange={v => set("phonetic", v)} placeholder="例：/ˈhɛ.lo/" />
        <WordField label="詞性" value={form.pos} onChange={v => set("pos", v)} placeholder="例：n.  v.  adj." />
        <WordField label="例句" value={form.example} onChange={v => set("example", v)} placeholder="輸入例句" />
        <WordField label="例句翻譯" value={form.exampleCn} onChange={v => set("exampleCn", v)} placeholder="例句的中文翻譯" />
        {hasCats && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ color: "var(--text-faint)", fontSize: 12, marginBottom: 8, display: "block" }}>範疇 (選填)</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => set("category", "")}
                style={{ padding: "5px 12px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                  background: !form.category ? "linear-gradient(135deg,#4c1d95,#7c3aed)" : "var(--panel-alt)",
                  color: !form.category ? "#fff" : "var(--text-muted)" }}>
                無分類
              </button>
              {categories.map(cat => (
                <button key={cat} onClick={() => set("category", cat)}
                  style={{ padding: "5px 12px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                    background: form.category === cat ? "linear-gradient(135deg,#4c1d95,#7c3aed)" : "var(--panel-alt)",
                    color: form.category === cat ? "#fff" : "var(--text-muted)" }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}
        <button onClick={() => valid && onSave(form)} disabled={!valid}
          style={{ width: "100%", background: valid ? "linear-gradient(135deg,var(--accent),var(--accent-2))" : "var(--panel)", border: "none", borderRadius: 10, padding: 12, color: valid ? "#fff" : "var(--text-dim)", fontSize: 15, fontWeight: 700, cursor: valid ? "pointer" : "default", marginTop: 4 }}>
          {initWord ? "儲存修改" : "新增單字"}
        </button>
      </div>
    </div>
  );
}

// ─── Study view ─────────────────────────────────────────────────────────────

function StudyView({ list, mode, onBack, user }) {
  const categories = list.categories || [];
  const [activeCategory, setActiveCategory] = useState("all");
  const allWords = list.words || [];
  const words = activeCategory === "all" ? allWords : allWords.filter(w => w.category === activeCategory);
  const isOwner = (list.uid || list.ownerId) === user?.uid;

  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [qWords, setQWords] = useState(() => shuffle(words));
  const [qIndex, setQIndex] = useState(0);
  const [qOptions, setQOptions] = useState(() => words.length >= 4 ? genOptions(shuffle(words)[0], words) : []);
  const [qSelected, setQSelected] = useState(null);
  const [qScore, setQScore] = useState(0);
  const [qDone, setQDone] = useState(false);
  const totalQ = Math.min(words.length, 10);

  useEffect(() => {
    const filtered = activeCategory === "all" ? allWords : allWords.filter(w => w.category === activeCategory);
    const shuffled = shuffle(filtered);
    setCardIndex(0);
    setFlipped(false);
    setQWords(shuffled);
    setQIndex(0);
    setQOptions(filtered.length >= 4 ? genOptions(shuffled[0], filtered) : []);
    setQSelected(null);
    setQScore(0);
    setQDone(false);
  }, [activeCategory]); // eslint-disable-line

  const cardWord = words[cardIndex];
  const qWord = qWords[qIndex];

  const handleAnswer = (opt) => {
    if (qSelected) return;
    setQSelected(opt.word);
    if (opt.word === qWord.word) setQScore(s => s + 1);
    setTimeout(() => {
      const next = qIndex + 1;
      if (next >= totalQ) { setQDone(true); }
      else { setQIndex(next); setQOptions(genOptions(qWords[next], words)); setQSelected(null); }
    }, 1200);
  };

  const resetQuiz = () => {
    const shuffled = shuffle(words);
    setQWords(shuffled);
    setQIndex(0);
    setQSelected(null);
    setQScore(0);
    setQDone(false);
    if (words.length >= 4) setQOptions(genOptions(shuffled[0], words));
  };

  const accent = "#7c3aed";

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Category tabs */}
      {categories.length > 0 && (
        <div style={{ padding: "8px 16px", background: "var(--bg)", borderBottom: "1px solid var(--panel)", display: "flex", gap: 8, overflowX: "auto", flexShrink: 0 }}>
          {["all", ...categories].map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              style={{ padding: "5px 14px", borderRadius: 20, border: "none", cursor: "pointer", flexShrink: 0, fontSize: 13, fontWeight: 600, transition: "all 0.15s",
                background: activeCategory === cat ? "linear-gradient(135deg,#4c1d95,#7c3aed)" : "var(--panel)",
                color: activeCategory === cat ? "#fff" : "var(--text-muted)" }}>
              {cat === "all" ? "全部" : cat}
            </button>
          ))}
        </div>
      )}

      {/* Study header */}
      <div style={{ padding: "12px 16px", background: "var(--panel-alt)", borderBottom: "1px solid var(--panel)", display: "flex", alignItems: "center", gap: 12, flexShrink: 0, flexWrap: "wrap" }}>
        <button onClick={onBack} style={{ background: "var(--panel)", border: "none", borderRadius: 8, padding: "6px 12px", color: "var(--text-muted)", cursor: "pointer", fontSize: 13 }}>← 返回</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{list.title}</div>
          <div style={{ fontSize: 12, color: "var(--text-faint)" }}>
            {list.language} · {words.length} 個單字{activeCategory !== "all" ? ` · ${activeCategory}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[{ key: "browse", label: "📋 瀏覽" }, { key: "flashcard", label: "🃏 閃卡" }, { key: "quiz", label: "✏️ 測驗" }].map(m => (
            <button key={m.key} onClick={() => { if (m.key !== mode) onBack(m.key); }}
              style={{ padding: "6px 11px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: mode === m.key ? accent : "var(--panel)", color: mode === m.key ? "#fff" : "var(--text-muted)" }}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>

        {/* Browse */}
        {mode === "browse" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {words.length === 0 && (
              <div style={{ textAlign: "center", color: "var(--text-faint)", padding: 60 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
                <div>詞彙表還沒有單字</div>
                {isOwner && <div style={{ fontSize: 13, marginTop: 6, color: "#7c3aed" }}>點擊左上角「管理單字」新增</div>}
              </div>
            )}
            {words.map((item, idx) => (
              <div key={idx} style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: "#a78bfa" }}>{item.word}</span>
                  <button onClick={() => speakWord(item.word, languageToLocale(list.language))}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 15, color: "#a78bfa", opacity: 0.7, padding: "2px 4px" }}
                    onMouseEnter={e => e.currentTarget.style.opacity = 1}
                    onMouseLeave={e => e.currentTarget.style.opacity = 0.7}>🔊</button>
                  {item.phonetic && <span style={{ fontSize: 12, color: "var(--text-faint)" }}>{item.phonetic}</span>}
                  {item.pos && <span style={{ fontSize: 11, padding: "1px 6px", background: "var(--accent-hover)", color: "#93c5fd", borderRadius: 4 }}>{item.pos}</span>}
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginTop: 4 }}>{item.cn}</div>
                {item.example && (
                  <div style={{ fontSize: 13, color: "var(--text-subtle)", marginTop: 6, lineHeight: 1.5 }}>
                    {list.language === "英語" ? <ClickableSentence text={item.example} /> : item.example}
                  </div>
                )}
                {item.exampleCn && <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>{item.exampleCn}</div>}
              </div>
            ))}
          </div>
        )}

        {/* Flashcard */}
        {mode === "flashcard" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            {words.length === 0 ? <div style={{ textAlign: "center", color: "var(--text-faint)", padding: 40 }}>沒有單字</div> : <>
              <div style={{ width: "100%", maxWidth: 480 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-faint)", marginBottom: 6 }}>
                  <span>{cardIndex + 1} / {words.length}</span><span>點擊翻面</span>
                </div>
                <div style={{ height: 4, background: "var(--panel)", borderRadius: 4 }}>
                  <div style={{ height: "100%", background: `linear-gradient(90deg,#4c1d95,${accent})`, borderRadius: 4, width: `${((cardIndex + 1) / words.length) * 100}%`, transition: "width 0.3s" }} />
                </div>
              </div>
              {cardWord && (
                <div onClick={() => setFlipped(f => !f)}
                  style={{ width: "100%", maxWidth: 480, minHeight: 220, background: flipped ? "#0f2e1c" : "var(--accent-hover)", border: `2px solid ${flipped ? "#166534" : "#4c1d95"}`, borderRadius: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 28, textAlign: "center", userSelect: "none", boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}>
                  {!flipped ? <>
                    <div style={{ fontSize: 32, fontWeight: 800, color: "#a78bfa", marginBottom: 8 }}>{cardWord.word}</div>
                    <button onClick={e => { e.stopPropagation(); speakWord(cardWord.word, languageToLocale(list.language)); }}
                      style={{ background: "var(--accent-hover)", border: `1px solid ${accent}`, cursor: "pointer", fontSize: 15, padding: "4px 14px", borderRadius: 20, color: "#a78bfa", marginBottom: 8 }}>🔊 發音</button>
                    {cardWord.phonetic && <div style={{ fontSize: 13, color: "var(--text-faint)", marginBottom: 4 }}>{cardWord.phonetic}</div>}
                    {cardWord.pos && <div style={{ fontSize: 12, color: "#7c3aed", padding: "2px 8px", background: "var(--panel)", borderRadius: 6 }}>{cardWord.pos}</div>}
                    <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 16 }}>👆 點擊看答案</div>
                  </> : <>
                    <div style={{ fontSize: 26, fontWeight: 700, color: "#4ade80", marginBottom: 10 }}>{cardWord.cn}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 14, color: "#a78bfa" }}>{cardWord.word}</span>
                      <button onClick={e => { e.stopPropagation(); speakWord(cardWord.word, languageToLocale(list.language)); }}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 15, color: "#a78bfa", padding: 0 }}>🔊</button>
                    </div>
                    {cardWord.example && <div style={{ fontSize: 13, color: "var(--text-subtle)", marginTop: 8, lineHeight: 1.6 }}>{cardWord.example}</div>}
                    {cardWord.exampleCn && <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 4 }}>{cardWord.exampleCn}</div>}
                  </>}
                </div>
              )}
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => { setCardIndex(i => Math.max(0, i - 1)); setFlipped(false); }} disabled={cardIndex === 0}
                  style={{ padding: "10px 18px", borderRadius: 10, border: "none", cursor: cardIndex === 0 ? "not-allowed" : "pointer", background: "var(--panel)", color: cardIndex === 0 ? "var(--border)" : "var(--text)", fontWeight: 600 }}>← 上一個</button>
                <button onClick={() => { if (cardIndex < words.length - 1) { setCardIndex(i => i + 1); setFlipped(false); } }} disabled={cardIndex >= words.length - 1}
                  style={{ padding: "10px 18px", borderRadius: 10, border: "none", cursor: cardIndex >= words.length - 1 ? "not-allowed" : "pointer", background: cardIndex >= words.length - 1 ? "var(--panel)" : "#4c1d95", color: cardIndex >= words.length - 1 ? "var(--border)" : "#fff", fontWeight: 600 }}>下一個 →</button>
              </div>
            </>}
          </div>
        )}

        {/* Quiz */}
        {mode === "quiz" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            {words.length < 4 ? (
              <div style={{ textAlign: "center", color: "var(--text-faint)", padding: 40 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✏️</div>
                <div>測驗需要至少 4 個單字</div>
              </div>
            ) : qDone ? (
              <div style={{ textAlign: "center", background: "var(--panel)", borderRadius: 20, padding: 40, maxWidth: 400, width: "100%" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>{qScore >= totalQ * 0.8 ? "🎉" : qScore >= totalQ * 0.5 ? "👍" : "💪"}</div>
                <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>測驗完成！</div>
                <div style={{ fontSize: 40, fontWeight: 800, color: "#4ade80", marginBottom: 8 }}>{qScore} / {totalQ}</div>
                <div style={{ fontSize: 14, color: "var(--text-faint)", marginBottom: 24 }}>
                  {qScore >= totalQ * 0.8 ? "非常出色！" : qScore >= totalQ * 0.5 ? "不錯，繼續練習！" : "繼續努力！"}
                </div>
                <button onClick={resetQuiz}
                  style={{ padding: "12px 28px", borderRadius: 12, border: "none", cursor: "pointer", background: `linear-gradient(135deg,#4c1d95,${accent})`, color: "#fff", fontWeight: 700, fontSize: 15 }}>
                  再試一次
                </button>
              </div>
            ) : qWord && qOptions.length > 0 ? <>
              <div style={{ width: "100%", maxWidth: 480 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-faint)", marginBottom: 6 }}>
                  <span>題目 {qIndex + 1} / {totalQ}</span><span style={{ color: "#4ade80" }}>分數: {qScore}</span>
                </div>
                <div style={{ height: 4, background: "var(--panel)", borderRadius: 4 }}>
                  <div style={{ height: "100%", background: `linear-gradient(90deg,#4c1d95,${accent})`, borderRadius: 4, width: `${(qIndex / totalQ) * 100}%`, transition: "width 0.3s" }} />
                </div>
              </div>
              <div style={{ width: "100%", maxWidth: 480, background: "var(--accent-hover)", border: "2px solid #4c1d95", borderRadius: 20, padding: 28, textAlign: "center" }}>
                <div style={{ fontSize: 13, color: "var(--text-faint)", marginBottom: 8 }}>選出正確的單字</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text)" }}>{qWord.cn}</div>
                {qWord.pos && <div style={{ fontSize: 13, color: "var(--text-faint)", marginTop: 6 }}>{qWord.pos}</div>}
              </div>
              <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 10 }}>
                {qOptions.map((opt) => {
                  const isCorrect = opt.word === qWord.word;
                  const isSelected = qSelected === opt.word;
                  let bg = "var(--panel)", border = "var(--border)", color = "var(--text)";
                  if (qSelected) {
                    if (isCorrect) { bg = "#0f2e1c"; border = "#16a34a"; color = "#4ade80"; }
                    else if (isSelected) { bg = "#2d1515"; border = "#dc2626"; color = "#f87171"; }
                  }
                  return (
                    <button key={opt.word} onClick={() => handleAnswer(opt)}
                      style={{ padding: "14px 18px", borderRadius: 12, border: `2px solid ${border}`, cursor: qSelected ? "default" : "pointer", background: bg, color, fontWeight: 600, fontSize: 15, textAlign: "left", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 10 }}>
                      {qSelected && isCorrect && <span>✅</span>}
                      {qSelected && isSelected && !isCorrect && <span>❌</span>}
                      {opt.word}
                      {qSelected && isCorrect && <span style={{ fontSize: 13, color: "var(--text-faint)", marginLeft: "auto" }}>{opt.cn}</span>}
                    </button>
                  );
                })}
              </div>
            </> : null}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Manage words view ──────────────────────────────────────────────────────

function ManageView({ list, db, onBack, onUpdate }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editIdx, setEditIdx] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [categoryInput, setCategoryInput] = useState("");
  const [showCatInput, setShowCatInput] = useState(false);
  const [speechLang, setSpeechLang] = useState(languageToLocale(list.language));
  const [filterCat, setFilterCat] = useState(null);
  const [wordDragIdx, setWordDragIdx] = useState(null);
  const [wordDragOver, setWordDragOver] = useState(null);
  const [catDragIdx, setCatDragIdx] = useState(null);
  const [catDragOver, setCatDragOver] = useState(null);
  const words = list.words || [];
  const categories = list.categories || [];
  const displayWords = words.map((item, idx) => ({ item, idx }))
    .filter(({ item }) => !filterCat || item.category === filterCat);

  const saveWord = async (form) => {
    const cleaned = {
      word: form.word.trim(), cn: form.cn.trim(),
      phonetic: (form.phonetic || "").trim(), pos: (form.pos || "").trim(),
      example: (form.example || "").trim(), exampleCn: (form.exampleCn || "").trim(),
      category: form.category || "",
    };
    let newWords;
    if (editIdx !== null) {
      newWords = words.map((w, i) => i === editIdx ? cleaned : w);
      setEditIdx(null);
    } else {
      newWords = [...words, cleaned];
      setShowAddModal(false);
    }
    await updateDoc(doc(db, "vocabLists", list.id), { words: newWords });
    onUpdate({ ...list, words: newWords });
  };

  const deleteWord = async (idx) => {
    const newWords = words.filter((_, i) => i !== idx);
    await updateDoc(doc(db, "vocabLists", list.id), { words: newWords });
    onUpdate({ ...list, words: newWords });
  };

  const moveWord = async (idx, dir) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= words.length) return;
    const newWords = [...words];
    [newWords[idx], newWords[newIdx]] = [newWords[newIdx], newWords[idx]];
    await updateDoc(doc(db, "vocabLists", list.id), { words: newWords });
    onUpdate({ ...list, words: newWords });
  };

  const togglePublic = async () => {
    await updateDoc(doc(db, "vocabLists", list.id), { isPublic: !list.isPublic });
    onUpdate({ ...list, isPublic: !list.isPublic });
  };

  const deleteList = async () => {
    await deleteDoc(doc(db, "vocabLists", list.id));
    onBack("deleted");
  };

  const addCategory = async () => {
    const name = categoryInput.trim();
    if (!name || categories.includes(name)) return;
    const newCats = [...categories, name];
    await updateDoc(doc(db, "vocabLists", list.id), { categories: newCats });
    onUpdate({ ...list, categories: newCats });
    setCategoryInput("");
    setShowCatInput(false);
  };

  const deleteCategory = async (cat) => {
    const newCats = categories.filter(c => c !== cat);
    const newWords = words.map(w => w.category === cat ? { ...w, category: "" } : w);
    await updateDoc(doc(db, "vocabLists", list.id), { categories: newCats, words: newWords });
    onUpdate({ ...list, categories: newCats, words: newWords });
  };

  const handleWordDragStart = (e, idx) => {
    setWordDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleWordDragOver = (e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (idx !== wordDragOver) setWordDragOver(idx);
  };
  const handleWordDrop = async (e, toIdx) => {
    e.preventDefault();
    if (wordDragIdx === null || wordDragIdx === toIdx) { setWordDragIdx(null); setWordDragOver(null); return; }
    const newWords = [...words];
    const [removed] = newWords.splice(wordDragIdx, 1);
    newWords.splice(toIdx, 0, removed);
    setWordDragIdx(null); setWordDragOver(null);
    await updateDoc(doc(db, "vocabLists", list.id), { words: newWords });
    onUpdate({ ...list, words: newWords });
  };
  const handleWordDragEnd = () => { setWordDragIdx(null); setWordDragOver(null); };

  const handleCatDragStart = (e, idx) => {
    setCatDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleCatDragOver = (e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (idx !== catDragOver) setCatDragOver(idx);
  };
  const handleCatDrop = async (e, toIdx) => {
    e.preventDefault();
    if (catDragIdx === null || catDragIdx === toIdx) { setCatDragIdx(null); setCatDragOver(null); return; }
    const newCats = [...categories];
    const [removed] = newCats.splice(catDragIdx, 1);
    newCats.splice(toIdx, 0, removed);
    setCatDragIdx(null); setCatDragOver(null);
    await updateDoc(doc(db, "vocabLists", list.id), { categories: newCats });
    onUpdate({ ...list, categories: newCats });
  };
  const handleCatDragEnd = () => { setCatDragIdx(null); setCatDragOver(null); };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", background: "var(--panel-alt)", borderBottom: "1px solid var(--panel)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0, flexWrap: "wrap" }}>
        <button onClick={() => onBack("browse")} style={{ background: "var(--panel)", border: "none", borderRadius: 8, padding: "6px 12px", color: "var(--text-muted)", cursor: "pointer", fontSize: 13 }}>← 返回</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>管理：{list.title}</div>
          <div style={{ fontSize: 12, color: "var(--text-faint)" }}>{list.language} · {words.length} 個單字</div>
        </div>
        <button onClick={() => setSpeechLang(l => l === "en-US" ? "es-ES" : l === "es-ES" ? "fr-FR" : "en-US")} title="切換發音語言"
          style={{ padding: "7px 12px", borderRadius: 10, border: "1px solid var(--border)", cursor: "pointer", background: "var(--panel)", color: "var(--text)", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
          🔊 {localeLabel(speechLang)}
        </button>
        <button onClick={() => setShowAddModal(true)}
          style={{ padding: "7px 14px", borderRadius: 10, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#4c1d95,#7c3aed)", color: "#fff", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
          ＋ 新增單字
        </button>
        <button onClick={() => onBack("browse")}
          style={{ padding: "7px 14px", borderRadius: 10, border: "none", cursor: "pointer", background: "#0f2e1c", color: "#4ade80", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
          📚 學習
        </button>
      </div>

      {/* Category management */}
      <div style={{ padding: "10px 16px", background: "var(--bg)", borderBottom: "1px solid var(--panel)", flexShrink: 0 }}>
        <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 8 }}>範疇管理</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {categories.map((cat, ci) => (
            <div key={cat}
              draggable
              onDragStart={e => handleCatDragStart(e, ci)}
              onDragOver={e => handleCatDragOver(e, ci)}
              onDrop={e => handleCatDrop(e, ci)}
              onDragEnd={handleCatDragEnd}
              style={{ display: "flex", alignItems: "center", gap: 4,
                background: catDragOver === ci && catDragIdx !== ci ? "#2d1b69" : "var(--panel)",
                border: `1px solid ${catDragOver === ci && catDragIdx !== ci ? "#7c3aed" : "#4c1d95"}`,
                borderRadius: 20, padding: "4px 10px 4px 10px",
                cursor: "grab", opacity: catDragIdx === ci ? 0.4 : 1,
                transition: "all 0.15s" }}>
              <span style={{ fontSize: 11, color: "var(--text-dim)", marginRight: 2, userSelect: "none" }}>⠿</span>
              <span style={{ fontSize: 13, color: "#a78bfa", fontWeight: 600 }}>{cat}</span>
              <button onClick={() => deleteCategory(cat)}
                style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: "0 2px" }}>✕</button>
            </div>
          ))}
          {showCatInput ? (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input value={categoryInput} onChange={e => setCategoryInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addCategory(); if (e.key === "Escape") { setShowCatInput(false); setCategoryInput(""); } }}
                autoFocus placeholder="範疇名稱"
                style={{ background: "var(--panel-alt)", border: "1px solid #4c1d95", borderRadius: 8, padding: "5px 10px", color: "var(--text)", fontSize: 13, outline: "none", width: 120 }} />
              <button onClick={addCategory}
                style={{ padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: "#4c1d95", color: "#fff", fontSize: 13, fontWeight: 600 }}>確認</button>
              <button onClick={() => { setShowCatInput(false); setCategoryInput(""); }}
                style={{ padding: "5px 10px", borderRadius: 8, border: "none", cursor: "pointer", background: "var(--panel)", color: "var(--text-muted)", fontSize: 13 }}>取消</button>
            </div>
          ) : (
            <button onClick={() => setShowCatInput(true)}
              style={{ padding: "4px 12px", borderRadius: 20, border: "1px dashed var(--border)", cursor: "pointer", background: "none", color: "var(--text-faint)", fontSize: 13 }}>
              ＋ 新增範疇
            </button>
          )}
        </div>
      </div>

      {/* Category filter */}
      <div style={{ padding: "8px 16px", background: "var(--bg)", borderBottom: "1px solid var(--panel)", display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: "var(--text-faint)", flexShrink: 0 }}>篩選：</span>
        <button onClick={() => setFilterCat(null)}
          style={{ padding: "3px 10px", borderRadius: 14, border: "1px solid", borderColor: filterCat === null ? "var(--accent)" : "var(--border)", background: filterCat === null ? "var(--accent-active)" : "var(--panel)", color: filterCat === null ? "#fff" : "var(--text-muted)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
          全部
        </button>
        {categories.map(cat => (
          <button key={cat} onClick={() => setFilterCat(filterCat === cat ? null : cat)}
            style={{ padding: "3px 10px", borderRadius: 14, border: "1px solid", borderColor: filterCat === cat ? "#7c3aed" : "var(--border)", background: filterCat === cat ? "#4c1d95" : "var(--panel)", color: filterCat === cat ? "#fff" : "var(--text-muted)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            {cat}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div style={{ padding: "10px 16px", background: "var(--bg)", borderBottom: "1px solid var(--panel)", display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={togglePublic}
          style={{ padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: list.isPublic ? "#0f2e1c" : "var(--panel)", color: list.isPublic ? "#4ade80" : "var(--text-muted)" }}>
          {list.isPublic ? "🔓 公開" : "🔒 私人"} — 點擊切換
        </button>
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)}
            style={{ padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: "var(--panel)", color: "#ef4444" }}>
            🗑️ 刪除此詞彙表
          </button>
        ) : (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "#f87171" }}>確認刪除？</span>
            <button onClick={deleteList} style={{ padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: "#dc2626", color: "#fff", fontSize: 13, fontWeight: 700 }}>確認</button>
            <button onClick={() => setConfirmDelete(false)} style={{ padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: "var(--panel)", color: "var(--text-muted)", fontSize: 13 }}>取消</button>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {words.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--text-faint)", padding: 60 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
            <div>還沒有單字，點「新增單字」開始</div>
          </div>
        )}
        {words.length > 0 && displayWords.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--text-faint)", padding: 40, fontSize: 13 }}>
            「{filterCat}」範疇下沒有單字
          </div>
        )}
        {displayWords.map(({ item, idx }) => (
          <div key={idx}
            draggable={!filterCat}
            onDragStart={!filterCat ? e => handleWordDragStart(e, idx) : undefined}
            onDragOver={!filterCat ? e => handleWordDragOver(e, idx) : undefined}
            onDrop={!filterCat ? e => handleWordDrop(e, idx) : undefined}
            onDragEnd={!filterCat ? handleWordDragEnd : undefined}
            style={{ background: "var(--panel)",
              border: `1px solid ${wordDragOver === idx && wordDragIdx !== idx ? "#7c3aed" : "var(--border)"}`,
              borderRadius: 10, padding: "12px 14px", marginBottom: 8,
              display: "flex", alignItems: "flex-start", gap: 10,
              opacity: wordDragIdx === idx ? 0.4 : 1,
              transition: "opacity 0.15s, border-color 0.15s",
              cursor: !filterCat ? "grab" : "default" }}>
            {!filterCat && (
              <div style={{ color: "var(--border)", fontSize: 18, cursor: "grab", userSelect: "none",
                flexShrink: 0, paddingTop: 2, lineHeight: 1 }}>⠿</div>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, color: "#a78bfa", fontSize: 16 }}>{item.word}</span>
                <button onClick={() => speakWord(item.word, speechLang)}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#a78bfa", opacity: 0.7, padding: "2px 4px" }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 1}
                  onMouseLeave={e => e.currentTarget.style.opacity = 0.7}>🔊</button>
                {item.phonetic && <span style={{ fontSize: 12, color: "var(--text-faint)" }}>{item.phonetic}</span>}
                {item.pos && <span style={{ fontSize: 11, padding: "1px 5px", background: "var(--accent-hover)", color: "#93c5fd", borderRadius: 4 }}>{item.pos}</span>}
              </div>
              <div style={{ color: "var(--text)", fontSize: 14, marginTop: 2 }}>{item.cn}</div>
              {item.example && (
                <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 3 }}>
                  {list.language === "英語" ? <ClickableSentence text={item.example} /> : item.example}
                </div>
              )}
            </div>
            {!filterCat && (
              <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
                <button onClick={() => moveWord(idx, -1)} disabled={idx === 0}
                  style={{ background: "var(--panel)", border: "none", borderRadius: 6, padding: "2px 8px", color: idx === 0 ? "var(--border)" : "var(--text-muted)", cursor: idx === 0 ? "default" : "pointer", fontSize: 11 }}>▲</button>
                <button onClick={() => moveWord(idx, 1)} disabled={idx === words.length - 1}
                  style={{ background: "var(--panel)", border: "none", borderRadius: 6, padding: "2px 8px", color: idx === words.length - 1 ? "var(--border)" : "var(--text-muted)", cursor: idx === words.length - 1 ? "default" : "pointer", fontSize: 11 }}>▼</button>
              </div>
            )}
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <button onClick={() => setEditIdx(idx)}
                style={{ background: "var(--accent-hover)", border: "none", borderRadius: 8, padding: "5px 10px", color: "#60a5fa", cursor: "pointer", fontSize: 13 }}>✏️</button>
              <button onClick={() => deleteWord(idx)}
                style={{ background: "#2d1515", border: "none", borderRadius: 8, padding: "5px 10px", color: "#f87171", cursor: "pointer", fontSize: 13 }}>🗑️</button>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && <WordModal onClose={() => setShowAddModal(false)} onSave={saveWord} categories={categories} />}
      {editIdx !== null && <WordModal word={words[editIdx]} onClose={() => setEditIdx(null)} onSave={saveWord} categories={categories} />}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function CustomVocabRoom({ user, db }) {
  const [tab, setTab] = useState("mine");
  const [view, setView] = useState("lists");
  const [mode, setMode] = useState("browse");
  const [myLists, setMyLists] = useState([]);
  const [publicLists, setPublicLists] = useState([]);
  const [publicLoading, setPublicLoading] = useState(false);
  const [activeList, setActiveList] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (!user?.uid || !db) return;
    const q = query(collection(db, "vocabLists"), where("uid", "==", user.uid));
    return onSnapshot(q, snap => {
      setMyLists(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    });
  }, [user?.uid, db]);

  useEffect(() => {
    if (tab !== "public" || !db) return;
    setPublicLoading(true);
    getDocs(query(collection(db, "vocabLists"), where("isPublic", "==", true), orderBy("createdAt", "desc"), limit(50)))
      .then(snap => {
        setPublicLists(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setPublicLoading(false);
      })
      .catch(() => setPublicLoading(false));
  }, [tab, db]);

  const createList = async ({ title, language, isPublic }) => {
    try {
      await addDoc(collection(db, "vocabLists"), {
        uid: user.uid,
        ownerId: user.uid,
        ownerNickname: user.nickname || "用戶",
        ownerAvatar: user.avatar || "📝",
        ownerColor: user.color || "#7c3aed",
        ownerAvatarImage: user.avatarImage || "",
        title, language, isPublic,
        words: [],
        categories: [],
        createdAt: serverTimestamp(),
      });
      setShowCreateModal(false);
    } catch (e) {
      alert("建立失敗，請到 Firebase Console 新增 vocabLists 的安全規則，或確認已登入");
    }
  };

  const copyList = async (list) => {
    try {
      await addDoc(collection(db, "vocabLists"), {
        uid: user.uid,
        ownerId: user.uid,
        ownerNickname: user.nickname || "用戶",
        ownerAvatar: user.avatar || "📝",
        ownerColor: user.color || "#7c3aed",
        ownerAvatarImage: user.avatarImage || "",
        title: `${list.title}（複製）`,
        language: list.language,
        isPublic: false,
        words: list.words || [],
        categories: list.categories || [],
        createdAt: serverTimestamp(),
      });
      setTab("mine");
    } catch (e) {}
  };

  const openList = (list, m = "browse") => {
    setActiveList(list);
    setMode(m);
    setView("study");
  };

  const openManage = (list) => {
    setActiveList(list);
    setView("manage");
  };

  if (view === "study" && activeList) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--bg)", height: "100%", overflow: "hidden", color: "var(--text)" }}>
        {(activeList.uid || activeList.ownerId) === user?.uid && (
          <div style={{ padding: "8px 16px", background: "var(--panel-alt)", borderBottom: "1px solid var(--panel)", display: "flex", justifyContent: "flex-end" }}>
            <button onClick={() => openManage(activeList)}
              style={{ padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", background: "#4c1d95", color: "#fff", fontSize: 13, fontWeight: 600 }}>
              ✏️ 管理單字
            </button>
          </div>
        )}
        {(activeList.uid || activeList.ownerId) !== user?.uid && (
          <div style={{ padding: "8px 16px", background: "var(--panel-alt)", borderBottom: "1px solid var(--panel)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "var(--text-faint)" }}>by {activeList.ownerNickname}</span>
            <button onClick={() => copyList(activeList)}
              style={{ padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", background: "var(--accent-hover)", color: "#60a5fa", fontSize: 13, fontWeight: 600 }}>
              📋 複製到我的詞彙表
            </button>
          </div>
        )}
        <StudyView
          list={activeList}
          mode={mode}
          onBack={(newMode) => {
            if (newMode === "browse" || newMode === "flashcard" || newMode === "quiz") {
              setMode(newMode);
            } else {
              setView("lists");
              setActiveList(null);
            }
          }}
          user={user}
        />
      </div>
    );
  }

  if (view === "manage" && activeList) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--bg)", height: "100%", overflow: "hidden", color: "var(--text)" }}>
        <ManageView
          list={activeList}
          db={db}
          onBack={(action) => {
            if (action === "deleted") {
              setView("lists");
              setActiveList(null);
            } else {
              setView("study");
            }
          }}
          onUpdate={(updated) => setActiveList(updated)}
        />
      </div>
    );
  }

  const displayLists = tab === "mine" ? myLists : publicLists;

  return (
    <div style={{ flex: 1, background: "var(--bg)", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", color: "var(--text)" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px 0", background: "var(--panel-alt)", borderBottom: "1px solid var(--panel)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>📝</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>自建詞彙表</div>
              <div style={{ fontSize: 12, color: "var(--text-faint)" }}>建立屬於你的詞彙，任何語言</div>
            </div>
          </div>
          <button onClick={() => setShowCreateModal(true)}
            style={{ padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#4c1d95,#7c3aed)", color: "#fff", fontWeight: 700, fontSize: 14 }}>
            ＋ 新建
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, paddingBottom: 12 }}>
          {[{ key: "mine", label: `📚 我的詞彙表 (${myLists.length})` }, { key: "public", label: "🌐 公開詞彙表" }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ padding: "6px 16px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: tab === t.key ? "linear-gradient(135deg,#4c1d95,#7c3aed)" : "var(--panel)", color: tab === t.key ? "#fff" : "var(--text-muted)", transition: "all 0.15s" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {tab === "mine" && myLists.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--text-faint)", padding: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>還沒有詞彙表</div>
            <div style={{ fontSize: 14, marginBottom: 20 }}>點擊右上角「＋ 新建」開始建立</div>
            <button onClick={() => setShowCreateModal(true)}
              style={{ padding: "10px 24px", borderRadius: 12, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#4c1d95,#7c3aed)", color: "#fff", fontWeight: 700, fontSize: 15 }}>
              建立第一個詞彙表
            </button>
          </div>
        )}
        {tab === "public" && publicLoading && (
          <div style={{ textAlign: "center", color: "var(--text-faint)", padding: 60 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
            <div>載入中...</div>
          </div>
        )}
        {tab === "public" && !publicLoading && publicLists.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--text-faint)", padding: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🌐</div>
            <div style={{ fontSize: 16 }}>還沒有公開詞彙表</div>
            <div style={{ fontSize: 13, marginTop: 8 }}>將你的詞彙表設為公開，讓其他人學習！</div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {displayLists.map((list) => {
            const isOwner = (list.uid || list.ownerId) === user?.uid;
            const wordCount = (list.words || []).length;
            const catCount = (list.categories || []).length;
            return (
              <div key={list.id} style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 18px", transition: "border-color 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "#4c1d95"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#4c1d95,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>📚</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: 16, color: "var(--text)" }}>{list.title}</span>
                      <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 10, background: list.isPublic ? "#0f2e1c" : "var(--panel)", color: list.isPublic ? "#4ade80" : "var(--text-faint)", border: `1px solid ${list.isPublic ? "#166534" : "var(--border)"}` }}>
                        {list.isPublic ? "🔓 公開" : "🔒 私人"}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-faint)", marginTop: 4 }}>
                      {list.language} · {wordCount} 個單字{catCount > 0 ? ` · ${catCount} 個範疇` : ""}
                      {!isOwner && <span style={{ marginLeft: 8 }}>· by {list.ownerNickname}</span>}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                  <button onClick={() => openList(list, "browse")}
                    style={{ padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#4c1d95,#7c3aed)", color: "#fff", fontWeight: 600, fontSize: 13 }}>
                    📖 學習
                  </button>
                  {isOwner && (
                    <button onClick={() => openManage(list)}
                      style={{ padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", background: "var(--accent-hover)", color: "#60a5fa", fontWeight: 600, fontSize: 13 }}>
                      ✏️ 管理單字
                    </button>
                  )}
                  {!isOwner && (
                    <button onClick={() => copyList(list)}
                      style={{ padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", background: "var(--panel)", color: "var(--text-muted)", fontWeight: 600, fontSize: 13, border: "1px solid var(--border)" }}>
                      📋 複製
                    </button>
                  )}
                  {wordCount === 0 && isOwner && (
                    <span style={{ fontSize: 12, color: "var(--text-faint)", padding: "7px 0", alignSelf: "center" }}>先新增單字才能學習</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showCreateModal && <CreateListModal onClose={() => setShowCreateModal(false)} onCreate={createList} />}
    </div>
  );
}
