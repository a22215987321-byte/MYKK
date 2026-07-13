import { useState } from "react";

function speak(text, rate = 0.85) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "es-ES"; u.rate = rate;
  window.speechSynthesis.speak(u);
}

const SOUNDS = [
  // ── 母音 ────────────────────────────────────────────────────────────────
  {
    id: "a", cat: "母音", letter: "a", ipa: "/a/", zh: "啊",
    desc: "嘴巴大開，像說中文「啊」，清晰純粹",
    mouth: "嘴巴盡量張開，舌頭平放，不帶任何滑音",
    examples: [{ w: "casa", zh: "房子" }, { w: "agua", zh: "水" }, { w: "amigo", zh: "朋友" }],
    mistake: "不要說成英文 cake 的「a」，西語母音純粹不滑",
    practice: ["hablar", "banana", "mañana"],
  },
  {
    id: "e", cat: "母音", letter: "e", ipa: "/e/", zh: "欸",
    desc: "類似中文「欸」但更清晰，嘴角略開，不帶滑音",
    mouth: "嘴巴半開，嘴角向兩側略拉，舌頭中部微抬",
    examples: [{ w: "mesa", zh: "桌子" }, { w: "leche", zh: "牛奶" }, { w: "comer", zh: "吃" }],
    mistake: "不要說成英文 they 的「ey」，結尾不要上揚",
    practice: ["verde", "entender", "necesito"],
  },
  {
    id: "i", cat: "母音", letter: "i", ipa: "/i/", zh: "伊",
    desc: "像中文「一」，嘴角向兩側拉，乾淨清晰",
    mouth: "嘴角向兩側拉，牙齒幾乎閉合",
    examples: [{ w: "libro", zh: "書" }, { w: "rico", zh: "美味" }, { w: "vivir", zh: "生活" }],
    mistake: "不要說成英文 like 的「ai」，要純粹短促的「伊」",
    practice: ["ciudad", "feliz", "chico"],
  },
  {
    id: "o", cat: "母音", letter: "o", ipa: "/o/", zh: "喔",
    desc: "像中文「喔」，嘴唇圓形，不帶滑音",
    mouth: "嘴唇圓形，舌頭位置偏後，氣流穩定",
    examples: [{ w: "gato", zh: "貓" }, { w: "poco", zh: "一點點" }, { w: "color", zh: "顏色" }],
    mistake: "不要說成英文 go 的「ou」，不要在結尾往上滑",
    practice: ["como", "todo", "hola"],
  },
  {
    id: "u", cat: "母音", letter: "u", ipa: "/u/", zh: "烏",
    desc: "像中文「烏」，嘴唇最圓最小向前突出",
    mouth: "嘴唇圓形向前突出，舌頭靠後偏高",
    examples: [{ w: "luna", zh: "月亮" }, { w: "mucho", zh: "很多" }, { w: "gusto", zh: "喜好" }],
    mistake: "不要說成英文 you，直接說「烏」，不帶「y」",
    practice: ["una", "tuyo", "futuro"],
  },
  // ── 子音 ────────────────────────────────────────────────────────────────
  {
    id: "c_hard", cat: "子音", letter: "c（ca / co / cu）", ipa: "/k/", zh: "k",
    desc: "c 在 a、o、u 前面發「k」音",
    mouth: "舌根頂上顎後方，氣流爆破而出",
    examples: [{ w: "casa", zh: "房子" }, { w: "comer", zh: "吃" }, { w: "cumple", zh: "生日慶祝" }],
    mistake: "不要把 casa 讀成「sa-sa」，在 a 前是「k」音",
    practice: ["cantar", "correr", "cuándo"],
  },
  {
    id: "c_soft", cat: "子音", letter: "c（ce / ci）", ipa: "/s/（拉美）", zh: "s",
    desc: "c 在 e、i 前發「s」音（拉美西語）或「th」音（西班牙）",
    mouth: "舌尖靠近上齒，氣流摩擦通過",
    examples: [{ w: "cena", zh: "晚餐" }, { w: "ciudad", zh: "城市" }, { w: "gracias", zh: "謝謝" }],
    mistake: "學習時用「s」音即可，不需強求西班牙式「th」",
    practice: ["centro", "cerveza", "cinco"],
  },
  {
    id: "g_hard", cat: "子音", letter: "g（ga / go / gu）", ipa: "/g/", zh: "ㄍ（格）",
    desc: "g 在 a、o、u 前發硬「g」，像中文「格」的聲母",
    mouth: "舌根頂上顎後方，像說「格」時聲母的位置",
    examples: [{ w: "gato", zh: "貓" }, { w: "gordo", zh: "胖的" }, { w: "gusto", zh: "喜好" }],
    mistake: "不要發成英文 jungle 的「dj」，西語 g 更乾淨",
    practice: ["ganar", "gobierno", "guapo"],
  },
  {
    id: "g_soft", cat: "子音", letter: "g（ge / gi）", ipa: "/x/", zh: "喉嚨摩擦音",
    desc: "g 在 e、i 前發喉嚨摩擦音，類似用力說「哈」",
    mouth: "舌根靠近後上顎，氣流帶摩擦感從喉嚨後方通過",
    examples: [{ w: "gente", zh: "人們" }, { w: "girar", zh: "旋轉" }, { w: "ángel", zh: "天使" }],
    mistake: "不要發硬「g」，應該有摩擦感，類似喉嚨輕咳",
    practice: ["general", "gitano", "urgente"],
  },
  {
    id: "j", cat: "子音", letter: "j", ipa: "/x/", zh: "喉嚨摩擦音（哈）",
    desc: "用力說「哈」，舌根在喉嚨後部製造摩擦",
    mouth: "舌根接近後上顎，強烈氣流摩擦，嘴巴略開",
    examples: [{ w: "joven", zh: "年輕人" }, { w: "jugar", zh: "玩" }, { w: "ojo", zh: "眼睛" }],
    mistake: "絕對不要發英文「j」（如 juice），西語 j 是喉嚨音",
    practice: ["julio", "trabajar", "rojo"],
  },
  {
    id: "r_single", cat: "子音", letter: "r（單一）", ipa: "/ɾ/", zh: "彈舌一次",
    desc: "舌尖快速彈一下上齒齦，像非常快速說「嗒」",
    mouth: "舌尖輕觸上齒齦一次後彈開，不要振動",
    examples: [{ w: "pero", zh: "但是" }, { w: "querer", zh: "想要" }, { w: "cara", zh: "臉" }],
    mistake: "不要用英文r（喉嚨音）或中文ㄖ，要用舌尖彈觸",
    practice: ["caro", "loro", "toro"],
  },
  {
    id: "rr", cat: "子音", letter: "rr（雙r）", ipa: "/r/", zh: "連續顫舌",
    desc: "舌尖快速連續振動多次，「嘟嘟嘟」的顫音",
    mouth: "舌尖抵住上齒齦後方，靠氣流讓舌尖振動",
    examples: [{ w: "perro", zh: "狗" }, { w: "carro", zh: "車" }, { w: "arroz", zh: "米飯" }],
    mistake: "pero（但是）和 perro（狗）意思完全不同，差別在顫舌次數",
    practice: ["tierra", "burro", "correo"],
  },
  {
    id: "n_tilde", cat: "子音", letter: "ñ", ipa: "/ɲ/", zh: "捏（合成音）",
    desc: "類似中文「捏」的聲母 + 母音，舌面（非舌尖）貼上顎",
    mouth: "舌面（不是舌尖）平貼硬顎，類似「捏」時舌頭位置",
    examples: [{ w: "niño", zh: "小孩（男）" }, { w: "mañana", zh: "明天／早上" }, { w: "español", zh: "西班牙語" }],
    mistake: "不是「n」+「y」的組合，是融合成一個音「捏ñ」",
    practice: ["año", "señor", "montaña"],
  },
  {
    id: "ll", cat: "子音", letter: "ll", ipa: "/ʝ/ 或 /ʎ/", zh: "類似英文 y",
    desc: "拉美西語多發「y」音（yo 的 y），不是兩個 l",
    mouth: "舌面輕觸硬顎，氣流從兩側通過",
    examples: [{ w: "llamar", zh: "打電話／叫" }, { w: "llover", zh: "下雨" }, { w: "pollo", zh: "雞肉" }],
    mistake: "不要讀成兩個 l，也不要讀成英文 l",
    practice: ["calle", "llave", "silla"],
  },
  {
    id: "y_consonant", cat: "子音", letter: "y（子音）", ipa: "/ʝ/", zh: "類似英文 y",
    desc: "在字首或兩個母音之間當子音，發「y」音",
    mouth: "舌面接近硬顎但不完全貼合，氣流帶聲",
    examples: [{ w: "yo", zh: "我" }, { w: "ya", zh: "已經" }, { w: "mayor", zh: "更大的" }],
    mistake: "注意：y 單獨使用時意思是「和」，此時發「i」音",
    practice: ["ayer", "ayuda", "playa"],
  },
  {
    id: "h_silent", cat: "子音", letter: "h（永遠不發音）", ipa: "（無聲）", zh: "不發音",
    desc: "h 在西班牙語中是啞音，完全不發音，直接跳過",
    mouth: "（不需要任何嘴型，完全忽略 h）",
    examples: [{ w: "hola", zh: "你好" }, { w: "hablar", zh: "說話" }, { w: "hotel", zh: "旅館" }],
    mistake: "千萬不要說 h 的音，hola 直接讀「ola」",
    practice: ["hacer", "hay", "hasta"],
  },
  // ── 特殊組合 ─────────────────────────────────────────────────────────────
  {
    id: "que_qui", cat: "特殊組合", letter: "que / qui", ipa: "/ke/ /ki/", zh: "k音（u 不念）",
    desc: "qu 組合中 u 完全不發音，只發「k + 母音」",
    mouth: "舌根頂上顎，直接爆破成 ke 或 ki",
    examples: [{ w: "queso", zh: "起司" }, { w: "quiero", zh: "我想要" }, { w: "aquí", zh: "這裡" }],
    mistake: "que 念 ke 不念 kwe；qui 念 ki 不念 kwi",
    practice: ["porque", "pequeño", "quince"],
  },
  {
    id: "gue_gui", cat: "特殊組合", letter: "gue / gui", ipa: "/ge/ /gi/", zh: "g音（u 不念）",
    desc: "gu 在 e、i 前：u 不發音，發硬「g + 母音」",
    mouth: "舌根頂上顎，像說「格 ge」或「幾 gi」的聲母",
    examples: [{ w: "guerra", zh: "戰爭" }, { w: "guitarra", zh: "吉他" }, { w: "seguir", zh: "繼續" }],
    mistake: "guitarra 不念「gwi-tarra」，u 沉默不發音",
    practice: ["guía", "llegué", "amiguito"],
  },
  {
    id: "gue_diaeresis", cat: "特殊組合", letter: "güe / güi（有兩點）", ipa: "/gwe/ /gwi/", zh: "u 發音",
    desc: "ü 上有兩點時，u 才發音：gwe 或 gwi",
    mouth: "先發硬 g，立即圓嘴說 u，再接母音",
    examples: [{ w: "pingüino", zh: "企鵝" }, { w: "lingüística", zh: "語言學" }],
    mistake: "沒有ü兩點就不念u；有兩點才念u，兩者完全不同",
    practice: ["pingüino", "güero"],
  },
  // ── 重音規則 ─────────────────────────────────────────────────────────────
  {
    id: "accent_mark", cat: "重音", letter: "重音符號 á é í ó ú", ipa: "（標重音節）", zh: "重讀該音節",
    desc: "有重音符號的音節就是重讀音節，音量加重、時間加長",
    mouth: "重讀音節時氣流更強，嘴型更清晰",
    examples: [{ w: "café", zh: "咖啡（重 fÉ）" }, { w: "fácil", zh: "容易（重 FÁ-cil）" }, { w: "mamá", zh: "媽媽（重 ma-MÁ）" }],
    mistake: "重音符號不是裝飾！一定要重讀有符號的音節",
    practice: ["música", "teléfono", "médico"],
  },
  {
    id: "stress_rule", cat: "重音", letter: "默認重音規則（無符號）", ipa: "", zh: "依結尾定重音",
    desc: "無重音符號時：以母音、n 或 s 結尾 → 倒數第二音節重讀；以其他子音結尾 → 最後音節重讀",
    mouth: "先數音節，找重讀位置，再加重氣流",
    examples: [
      { w: "casa → CA-sa", zh: "以a結尾 → 倒二重讀" },
      { w: "comer → co-MER", zh: "以r結尾 → 最後音節" },
      { w: "joven → JO-ven", zh: "以n結尾 → 倒二重讀" },
    ],
    mistake: "記住「母音/n/s 結尾 = 倒二」，其他 = 最後，這兩條涵蓋80%單字",
    practice: ["hotel", "español", "ciudad"],
  },
];

const CATS = ["全部", "母音", "子音", "特殊組合", "重音"];

function SoundCard({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 14, marginBottom: 10, overflow: "hidden" }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
        <div style={{ width: 52, height: 52, borderRadius: 12, background: "linear-gradient(135deg,#7c1d1d,#dc2626)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#fff" }}>
          <div style={{ fontSize: item.letter.length > 4 ? 11 : 18, fontWeight: 800, lineHeight: 1.2 }}>{item.letter.split("（")[0].trim()}</div>
          {item.ipa && item.ipa !== "（無聲）" && item.ipa !== "（標重音節）" && item.ipa !== "" && (
            <div style={{ fontSize: 10, opacity: 0.8, marginTop: 1 }}>{item.ipa.split(" ")[0]}</div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>{item.letter}</span>
            <span style={{ fontSize: 13, color: "#f87171", fontWeight: 600 }}>{item.zh}</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3, lineHeight: 1.5 }}>{item.desc}</div>
        </div>
        <span style={{ color: "var(--text-faint)", fontSize: 14, flexShrink: 0 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--border)" }}>
          {/* Mouth tip */}
          {item.mouth && (
            <div style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", fontSize: 13, color: "#f59e0b", marginTop: 12, marginBottom: 12, lineHeight: 1.7 }}>
              👄 嘴型：{item.mouth}
            </div>
          )}

          {/* Examples */}
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>例字</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
            {item.examples.map((ex, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "var(--panel-alt)", borderRadius: 10, border: "1px solid var(--border)" }}>
                <button onClick={() => speak(ex.w, 0.5)} title="慢速"
                  style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", cursor: "pointer", fontSize: 13, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>🐢</button>
                <button onClick={() => speak(ex.w)} title="正常"
                  style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.25)", cursor: "pointer", fontSize: 13, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>🔊</button>
                <span style={{ fontWeight: 700, fontSize: 14, color: "#fca5a5" }}>{ex.w}</span>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{ex.zh}</span>
              </div>
            ))}
          </div>

          {/* Common mistake */}
          {item.mistake && (
            <div style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 13, color: "#ef4444", marginBottom: 12, lineHeight: 1.7 }}>
              ⚠️ 常見錯誤：{item.mistake}
            </div>
          )}

          {/* Practice */}
          {item.practice && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>跟讀練習（點擊播放）</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {item.practice.map(w => (
                  <div key={w} style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => speak(w, 0.55)}
                      style={{ padding: "6px 10px", borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "#f87171", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                      🐢 {w}
                    </button>
                    <button onClick={() => speak(w)}
                      style={{ padding: "6px 10px", borderRadius: 10, background: "var(--panel-alt)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer", fontSize: 13 }}>
                      🔊
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function SpanishPronunciation({ onNav }) {
  const [activeCat, setActiveCat] = useState("全部");
  const filtered = activeCat === "全部" ? SOUNDS : SOUNDS.filter(s => s.cat === activeCat);

  return (
    <div style={{ height: "100%", overflowY: "auto", background: "var(--bg)", color: "var(--text)" }}>
      <style>{`
        .sp-cat::-webkit-scrollbar { height: 4px; }
        .sp-cat::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }
      `}</style>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "20px 16px 80px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, fontSize: 13 }}>
          <button onClick={() => onNav ? onNav('home') : null}
            style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", padding: 0 }}>← 西班牙語</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 26 }}>🔤</span>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>西語發音</h1>
        </div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
          點擊卡片展開 · 🐢慢速 · 🔊正常速度 · 跟讀練習
        </div>

        {/* Category filter */}
        <div className="sp-cat" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 20 }}>
          {CATS.map(cat => (
            <button key={cat} onClick={() => setActiveCat(cat)}
              style={{ padding: "7px 14px", borderRadius: 20, border: `1px solid ${activeCat === cat ? "#dc2626" : "var(--border)"}`,
                background: activeCat === cat ? "rgba(220,38,38,0.12)" : "var(--panel)", color: activeCat === cat ? "#ef4444" : "var(--text-muted)",
                cursor: "pointer", fontSize: 13, fontWeight: activeCat === cat ? 700 : 400, whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.15s" }}>
              {cat}
            </button>
          ))}
        </div>

        {/* Sound cards */}
        {filtered.map(item => <SoundCard key={item.id} item={item} />)}

        <div style={{ textAlign: "center", padding: "20px 0 0", color: "var(--text-faint)", fontSize: 12 }}>
          💡 建議先熟悉母音，再逐個攻克子音，最後記住重音規則
        </div>
      </div>
    </div>
  );
}
