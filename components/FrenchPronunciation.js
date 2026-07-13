import { useState, useEffect, useRef } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { AudioButton, RepeatButton as RepeatBtn, TeacherButton, stopPronunciationAudio } from "./PronunciationAudio";

// ═══════════════════════════════════════════════════
//  10 個學習階段定義
// ═══════════════════════════════════════════════════

const LEVELS = [
  { id: "basics",      title: "基本觀念",   emoji: "📌", color: "#64748b", level: 1 },
  { id: "vowels",      title: "核心母音",   emoji: "🗣",  color: "#6366f1", level: 2 },
  { id: "e-sounds",    title: "é / è / e",  emoji: "✍",  color: "#8b5cf6", level: 3 },
  { id: "nasals",      title: "鼻音",       emoji: "👃", color: "#059669", level: 4 },
  { id: "consonants",  title: "特殊子音",   emoji: "👅", color: "#d97706", level: 5 },
  { id: "combos",      title: "字母組合",   emoji: "🔤", color: "#0891b2", level: 6 },
  { id: "silent",      title: "字尾不發音", emoji: "🤫", color: "#dc2626", level: 7 },
  { id: "elision",     title: "省音",       emoji: "📎", color: "#7c3aed", level: 8 },
  { id: "liaison",     title: "連音",       emoji: "🔗", color: "#b45309", level: 9 },
  { id: "sentences",   title: "句子跟讀",   emoji: "🎤", color: "#0f766e", level: 10 },
];

function mkAudio() {
  return {
    phonemeUrl: null,
    phonemeRepeatUrl: null,
    wordNormalUrl: null,
    wordSlowUrl: null,
    teacherAudioUrl: null,
    repeatAudioUrl: null,
  };
}

const syllable = (display, speakText, ttsAllowed = true) => ({
  display,
  speakText,
  lang: "fr-FR",
  audioUrl: "",
  verified: false,
  ttsAllowed,
});

// ═══════════════════════════════════════════════════
//  課程資料（10 個階段）
// ═══════════════════════════════════════════════════

const LESSONS = [
  // ── 1. 基本觀念 ──────────────────────────────────
  { id: "b1", type: "concept", levelId: "basics",
    symbol: "∅", titleZh: "字母 ≠ 發音",
    exampleWord: "Paris", exampleMeaningZh: "巴黎（末尾 s 不念）",
    mouthTipZh: "聽音而非拼讀，不要每個字母都念出來。",
    commonMistakeZh: "Paris 末尾 s 不念：念「pari」，不是「paris」",
    teachingScriptZh: "同學你好！法語最重要的第一個觀念是：字母不等於發音。法語有很多字母在某些位置完全不念。例如 Paris 這個字，末尾的 s 完全沉默，念做 pari，不是 paris。所以學法語要學讀音規律，不是逐個字母讀。",
    teacherScriptZh: "同學你好！法語最重要的第一個觀念是：字母不等於發音。法語有很多字母在某些位置完全不念。例如 Paris 這個字，末尾的 s 完全沉默，念做「pari」，不是「paris」。所以學法語要學讀音規律，不是逐個字母讀。",
    examples: [{ word: "Paris", meaningZh: "巴黎（s不念）", tts: "Paris" }, { word: "beaucoup", meaningZh: "很多（p不念）", tts: "beaucoup" }],
    audio: mkAudio("b1") },

  { id: "b2", type: "concept", levelId: "basics",
    symbol: "e s t d", titleZh: "字尾常不發音",
    exampleWord: "petit", exampleMeaningZh: "小（末尾 t 不念）",
    mouthTipZh: "看到字尾 e、s、t、d、x、z，先假設不念。",
    commonMistakeZh: "petit 末尾 t 不念，grand 末尾 d 不念，vous 末尾 s 通常不念",
    teachingScriptZh: "字尾不發音是法語最重要的規則。s、t、d、x、z 在字尾時大多數情況完全沉默，但遇到連音時會「復活」。",
    teacherScriptZh: "今天教大家字尾不發音的規律。法語字尾的 s、t、d、x、z 大多數情況都不念。例如 petit 念做「puh-ti」，末尾 t 不念；grand 念做「grɑ̃」，末尾 d 不念；vous 念做「voo」，末尾 s 不念。記住這個規律，你馬上就能讀對很多法語詞。",
    teacherAudioText: "今天教大家字尾不發音的規律。法語字尾的 s、t、d、x、z 大多數情況都不念。例如 petit 末尾 t 不念；grand 末尾 d 不念，念作像「鋼」一樣；vous 末尾 s 不念。記住這個規律，你馬上就能讀對很多法語詞。",
    examples: [{ word: "petit", meaningZh: "小（t不念）", tts: "petit" }, { word: "grand", meaningZh: "大（d不念）", tts: "grand" }],
    audio: mkAudio("b2") },

  { id: "b3", type: "concept", levelId: "basics",
    symbol: "~", titleZh: "重音比較平均",
    exampleWord: "bonjour", exampleMeaningZh: "你好",
    mouthTipZh: "法語每個音節力量比英語均勻，最後一個音節稍微重一點。",
    commonMistakeZh: "不要像英語一樣把某個音節讀得特別強，法語比較平均",
    teachingScriptZh: "英語重音明顯，法語重音比較平均，整個詞組最後一個音節稍微有重音。不要模仿英語重音模式。",
    teacherScriptZh: "法語的重音跟英語很不同。英語重音很明顯，某個音節特別強。但法語每個音節的力量比較均勻，整個詞組的最後一個音節稍微重一點點。所以念法語的時候不要用英語的重音習慣，保持平均，最後一個音節稍微加強就可以了。",
    examples: [{ word: "bonjour", meaningZh: "你好", tts: "bonjour" }, { word: "merci", meaningZh: "謝謝", tts: "merci" }],
    audio: mkAudio("b3") },

  { id: "b4", type: "concept", levelId: "basics",
    symbol: "ou ai eau", titleZh: "字母組合最重要",
    exampleWord: "eau", exampleMeaningZh: "水（三字母只念一音）",
    mouthTipZh: "看到字母組合（ou、ai、eau、ch、gn），當成一個整體音。",
    commonMistakeZh: "eau 不念「e-a-u」三個音，ai 不念「啊-衣」，而是單一音",
    teachingScriptZh: "法語最高效的學習策略：先學常見字母組合的讀音。ou 念烏，ai 念開口的誒，eau 念閉口的哦，ch 念 sh，gn 念顎化鼻音。掌握這些組合，你就能讀出大多數法語詞。",
    teacherScriptZh: "法語學習最有效的方法：先記住常見的字母組合。ou 念「烏」；ai 念開口的「誒」；eau 念閉口的「哦」；ch 念「sh」；gn 念顎化鼻音。掌握這幾個組合，你就能讀出絕大部分法語詞。今天開始，遇到這些組合不要逐個字母讀，要當成一個整體音。",
    examples: [{ word: "eau", meaningZh: "水 [o]", tts: "beau" }, { word: "mais", meaningZh: "但是 [ɛ]", tts: "mais" }, { word: "chat", meaningZh: "貓 [ʃ]", tts: "chat" }],
    audio: mkAudio("b4") },

  // ── 2. 核心母音 ──────────────────────────────────
  { id: "v-a", type: "phoneme", levelId: "vowels",
    symbol: "[a]", spelling: "a / à / â", titleZh: "開口 a",
    exampleWord: "ami", exampleMeaningZh: "朋友",
    mouthTipZh: "嘴巴大開，下巴放低，乾淨的「啊」，不要拖長。",
    tongueTipZh: "舌頭平放在口腔底部，不接觸任何位置。",
    airflowTipZh: "氣流直接從口腔中央出去，乾淨無摩擦。",
    commonMistakeZh: "不要念成英文 cat 的 a（帶點「ㄟ」），法語 a 更開、更乾淨。",
    teachingScriptZh: "法語 [a] 就是乾淨的「啊」。嘴巴大開，聲音不要往「ㄟ」走。ami（朋友）、chat（貓）、table（桌子）都是這個音。",
    teacherScriptZh: "法語的「a」就是乾淨的「啊」。嘴巴大開，下巴放低，聲音不要往英文「ㄟ」的方向走，那個帶點誒的音是錯的。法語「a」非常乾淨純粹。試試嘴巴大開說「啊」——對了，就是這個音。ami 朋友、chat 貓、table 桌子都用這個音。",
    examples: [{ word: "ami", meaningZh: "朋友", tts: "ami" }, { word: "chat", meaningZh: "貓", tts: "chat" }, { word: "table", meaningZh: "桌子", tts: "table" }],
    audio: mkAudio("v-a") },

  { id: "v-i", type: "phoneme", levelId: "vowels",
    symbol: "[i]", spelling: "i / î / y", titleZh: "緊 i",
    exampleWord: "vie", exampleMeaningZh: "生活",
    mouthTipZh: "嘴角往兩側拉開，像微笑，短促不拖。",
    tongueTipZh: "舌頭在前方高位，靠近上顎。",
    airflowTipZh: "氣流從口腔前方穿過，無鼻音。",
    commonMistakeZh: "不要拖長成雙母音（英文 see 很像，但法語更緊更短促）。",
    teachingScriptZh: "法語 [i] 和中文「衣」非常接近，但更緊、更短促。嘴角往兩側拉，不拖長。vie（生活）、midi（中午）都用這個音。",
    teacherScriptZh: "法語的「i」跟中文的「衣」非常接近，但要更緊、更短促。嘴角往兩側拉，像微笑一樣，然後乾淨地說「衣」。不要像英文「see」那樣拖長，法語「i」是一個乾淨的短音。vie 是生活，midi 是中午，都用這個音。",
    examples: [{ word: "vie", meaningZh: "生活", tts: "vie" }, { word: "midi", meaningZh: "中午", tts: "midi" }, { word: "île", meaningZh: "島嶼", tts: "île" }],
    audio: mkAudio("v-i") },

  { id: "v-u-ou", type: "phoneme", levelId: "vowels",
    symbol: "[u]", spelling: "ou / où / oû", titleZh: "後圓 ou ★",
    exampleWord: "vous", exampleMeaningZh: "你/你們",
    mouthTipZh: "嘴唇圓起來向前噘，像準備吹口哨。",
    tongueTipZh: "舌根往後縮，舌頭在口腔後方——和 [y] 完全相反。",
    airflowTipZh: "氣流從後方通過圓形嘴唇出去。",
    commonMistakeZh: "看到 ou 才念 [u]，單個字母 u 是法語特有的 [y]，完全不同。",
    teachingScriptZh: "ou 這個字母組合念後圓 [u]，接近中文「烏」但嘴更圓。vous、nous、rouge 都有這個音。單個字母 u 不念 [u]，那是完全不同的音。",
    teacherScriptZh: "注意！法語的「ou」才念「烏」這個音，不是單個字母「u」。ou 的嘴唇要圓起來向前噘，像準備吹口哨，舌根往後縮。vous、nous、rouge 都有這個音。記住：看到「ou」才念「烏」，看到單個「u」是完全不同的音，我們下一個就學那個難音。",
    examples: [{ word: "vous", meaningZh: "你們", tts: "vous" }, { word: "nous", meaningZh: "我們", tts: "nous" }, { word: "rouge", meaningZh: "紅色", tts: "rouge" }],
    audio: mkAudio("v-u-ou") },

  { id: "v-y", type: "phoneme", levelId: "vowels",
    symbol: "[y]", spelling: "u / û", titleZh: "法語 u（最難）★",
    exampleWord: "tu", exampleMeaningZh: "你",
    mouthTipZh: "先做「衣」的嘴型，嘴唇再慢慢收圓——舌頭不要動！",
    tongueTipZh: "舌頭保持在前方高位（像 [i]），不要退到後方。",
    airflowTipZh: "氣流從口腔中央穩定出去，被圓唇約束。",
    commonMistakeZh: "不要把 u 讀成 ou（[u]）。tu 不是「too」，舌頭要往前，不往後。",
    teachingScriptZh: "法語最難的母音，英語和中文都沒有。訓練：先發「衣」[i]，保持舌頭在前方不動，然後嘴唇收圓——這就是 [y]。tu、rue、une 都是這個音。",
    teacherScriptZh: "這是法語最難的母音，英語和中文都沒有這個音。秘訣是這樣：先說「衣」，保持舌頭在前方不動，然後嘴唇慢慢收圓。舌頭的位置是「衣」，但嘴型是「烏」。tu、rue、une 都是這個音。很多同學把 tu 念成「too」，那是錯的。多練幾次：衣→嘴唇收圓→就對了。",
    syllables: [syllable("ty", "tu"), syllable("dy", "du"), syllable("ly", "lu"), syllable("ʁy", "rue")],
    minimalPairs: [{ display: "/y/ ↔ /u/", left: "tu", right: "tout" }, { display: "rue ↔ roue", left: "rue", right: "roue" }],
    sentences: ["Tu habites dans cette rue."],
    examples: [{ word: "tu", meaningZh: "你", tts: "tu" }, { word: "une", meaningZh: "一個（陰性）", tts: "une" }, { word: "rue", meaningZh: "街道", tts: "rue" }],
    audio: mkAudio("v-y") },

  // ── 3. é / è / e ─────────────────────────────────
  { id: "e-closed", type: "phoneme", levelId: "e-sounds",
    symbol: "[e]", spelling: "é / -er / -ez", titleZh: "閉口 é ★",
    exampleWord: "café", exampleMeaningZh: "咖啡",
    mouthTipZh: "嘴角拉開，嘴巴半閉，短促乾淨。",
    tongueTipZh: "舌頭在前方中高位。",
    airflowTipZh: "氣流短促，不要拖長成雙母音。",
    commonMistakeZh: "字尾 -er 和 -ez 念 [e]，r 和 z 不要讀出來（parler 念「parlé」）。",
    teachingScriptZh: "é 念閉口「耶」，嘴角微拉，不要拖長。重要：動詞字尾 -er（parler）和 -ez（avez）都念 [e]，r 和 z 完全不念。",
    teacherScriptZh: "「é」念閉口的「耶」，嘴角往兩側拉，嘴巴半閉，短促乾淨。最重要的是：法語動詞字尾「-er」和「-ez」都念「é」，「r」和「z」完全不念。例如 parler 說話，念做「par-lé」，r 不念；avez 你們有，念做「a-vé」，z 不念。這個規律非常重要！",
    syllables: [syllable("pe", "pé"), syllable("te", "té"), syllable("le", "lé"), syllable("ʁe", "ré")],
    minimalPairs: [{ display: "/e/ ↔ /ɛ/", left: "été", right: "était" }, { display: "café ↔ ouvert è", left: "café", right: "mère" }],
    sentences: ["L'été, je prends un café."],
    examples: [{ word: "café", meaningZh: "咖啡", tts: "café" }, { word: "parler", meaningZh: "說話（er不念r）", tts: "parler" }, { word: "été", meaningZh: "夏天", tts: "été" }],
    audio: mkAudio("e-closed") },

  { id: "e-open", type: "phoneme", levelId: "e-sounds",
    symbol: "[ɛ]", spelling: "è / ê / ai / ei", titleZh: "開口 è ★",
    exampleWord: "mère", exampleMeaningZh: "母親",
    mouthTipZh: "嘴巴比 [e] 更開，下巴放低一點，像驚訝說「誒？」",
    tongueTipZh: "舌頭在前方中低位，比 [e] 更低。",
    airflowTipZh: "氣流比 [e] 更開放，有更大的口腔空間。",
    commonMistakeZh: "è/ê/ai 念開口 [ɛ]，不念中文「ㄟ」雙母音，是單一開口音。",
    teachingScriptZh: "è 和 ê 念開口「誒」[ɛ]，比 é 更開。ai 和 ei 也念 [ɛ]，不是中文的「ㄞ」（那有兩個音）。mère、fête、mais 都用這個音。",
    teacherScriptZh: "「è」帶尖音符，念開口的「誒」，比「é」嘴巴更開一點，下巴放低一點。「è」、「ê」、「ai」、「ei」都念這個開口的「誒」。注意「ai」不是中文的「愛」，那是兩個音合在一起，法語「ai」是單一的開口誒。mère 媽媽，fête 節慶，mais 但是，都用這個音。",
    examples: [{ word: "mère", meaningZh: "母親", tts: "mère" }, { word: "fête", meaningZh: "節慶", tts: "fête" }, { word: "mais", meaningZh: "但是", tts: "mais" }],
    audio: mkAudio("e-open") },

  { id: "e-schwa", type: "phoneme", levelId: "e-sounds",
    symbol: "[ə]", spelling: "e（不帶符號）", titleZh: "中性 e",
    exampleWord: "le", exampleMeaningZh: "那個（陽）",
    mouthTipZh: "完全放鬆，嘴巴微開，音很輕，口語中常直接省略。",
    tongueTipZh: "舌頭在中央，完全不用力。",
    airflowTipZh: "氣流非常輕，若有若無。",
    commonMistakeZh: "不帶符號的 e 常常不念，不要把它念得太清楚。字尾的 e 幾乎永遠不念。",
    teachingScriptZh: "不帶符號的 e 是法語最弱的母音，常常省略。le、me、de、ce 中的 e 在口語中很輕，甚至消失。字尾 e 幾乎永遠不念。",
    teacherScriptZh: "不帶符號的小寫「e」是法語最弱的母音。它非常輕，口語裡常常直接省略。le、me、de 裡的「e」都很輕。字尾的「e」幾乎永遠不念——table 念「tabl」，e 不念。不要把不帶符號的「e」念得太清楚，輕輕帶過或省掉就對了。",
    examples: [{ word: "le", meaningZh: "那個", tts: "le" }, { word: "cheval", meaningZh: "馬（第一個e）", tts: "cheval" }],
    audio: mkAudio("e-schwa") },

  // ── 4. 鼻音 ──────────────────────────────────────
  { id: "n-an", type: "phoneme", levelId: "nasals",
    symbol: "[ɑ̃]", spelling: "an / en / am / em", titleZh: "鼻音 an/en ★",
    exampleWord: "sans", exampleMeaningZh: "沒有",
    mouthTipZh: "說「啊」同時讓氣從鼻腔通過——嘴巴大開，氣分兩路。",
    tongueTipZh: "舌頭低平，像發 [a]，但軟顎下降讓氣進鼻腔。",
    airflowTipZh: "氣流同時從口腔和鼻腔出去，不要加 n 或 ng 的尾音。",
    commonMistakeZh: "不要在結尾加 n 或 ng——「sans」念「sɑ̃」，不是「san」或「sang」。",
    teachingScriptZh: "[ɑ̃] 嘴巴大開，像「啊」，但讓氣流同時從鼻腔通過，整個過程不加 n 音。dans、vent、enfant、temps 都是這個音。",
    teacherScriptZh: "鼻音是法語的特色，中文和英語都沒有。「an」和「en」念「ɑ̃」，嘴巴大開說「啊」，同時讓氣從鼻腔通過。關鍵是：不要在末尾加「n」或「ng」，整個過程都是鼻腔共鳴，沒有「n」的結尾。dans、vent、enfant 都是這個音。試試：嘴巴大開，捏住鼻子，你會感覺氣流受阻——那就說明有鼻音了。",
    teacherAudioText: "鼻音是法語的特色，中文和英語都沒有。「an」和「en」念 an 鼻母音，嘴巴大開說「啊」，同時讓氣從鼻腔通過。關鍵是：不要在末尾加「n」或「ng」，整個過程都是鼻腔共鳴，沒有「n」的結尾。dans、vent、enfant 都是這個音。試試：嘴巴大開，捏住鼻子，你會感覺氣流受阻——那就說明有鼻音了。",
    examples: [{ word: "sans", meaningZh: "沒有", tts: "sans" }, { word: "dans", meaningZh: "在裡面", tts: "dans" }, { word: "enfant", meaningZh: "孩子", tts: "enfant" }],
    audio: mkAudio("n-an") },

  { id: "n-on", type: "phoneme", levelId: "nasals",
    symbol: "[ɔ̃]", spelling: "on / om", titleZh: "鼻音 on ★",
    exampleWord: "bon", exampleMeaningZh: "好",
    mouthTipZh: "嘴唇收圓（像「哦」），同時讓氣從鼻腔通過。",
    tongueTipZh: "舌頭在後方，和 [ɔ] 相同的舌位。",
    airflowTipZh: "氣流從後方和鼻腔同時通過，嘴唇保持圓形。",
    commonMistakeZh: "不要加 ng 尾音，嘴唇一直保持圓形到音結束。",
    teachingScriptZh: "[ɔ̃] 嘴唇圓（像「哦」），氣流同時從鼻腔通過。bon、son、maison、on 都是這個音。注意和 [ɑ̃] 的差別：[ɔ̃] 嘴唇圓，[ɑ̃] 嘴巴大開。",
    teacherScriptZh: "「on」和「om」念圓唇鼻音「ɔ̃」。嘴唇收圓，像說「哦」，同時讓氣從鼻腔通過，不要加「ng」結尾。bon 好、son 他的、maison 房子都是這個音。跟「an」的鼻音相比：an 嘴巴大開，on 嘴唇收圓——這是它們最大的分別。",
    teacherAudioText: "「on」和「om」念圓唇鼻音。嘴唇收圓，像說「哦」，同時讓氣從鼻腔通過，不要加「ng」結尾。bon 好、son 他的、maison 房子都是這個音。跟「an」的鼻音相比：an 嘴巴大開，on 嘴唇收圓——這是它們最大的分別。",
    examples: [{ word: "bon", meaningZh: "好", tts: "bon" }, { word: "son", meaningZh: "他的", tts: "son" }, { word: "maison", meaningZh: "房子", tts: "maison" }],
    audio: mkAudio("n-on") },

  { id: "n-in", type: "phoneme", levelId: "nasals",
    symbol: "[ɛ̃]", spelling: "in / ain / ein / im", titleZh: "鼻音 in/ain ★",
    exampleWord: "pain", exampleMeaningZh: "麵包",
    mouthTipZh: "嘴角稍拉（像 [ɛ]），讓氣同時從鼻腔通過。",
    tongueTipZh: "舌頭在前方中位，像 [ɛ] 的位置。",
    airflowTipZh: "氣流從前方和鼻腔同時通過。",
    commonMistakeZh: "不要念成「ㄧㄣ」，沒有清楚的 n 結尾——是持續的鼻腔共鳴。",
    teachingScriptZh: "[ɛ̃] 嘴角稍拉的鼻音。in、ain、ein 都念這個音。pain（麵包）、vin（酒）、main（手）都是 [ɛ̃]。",
    teacherScriptZh: "「in」、「ain」、「ein」都念「ɛ̃」，嘴角稍微拉開，嘴巴微開，讓氣從鼻腔通過。pain 麵包、vin 葡萄酒、main 手都是這個音。不要念成中文的「因」，法語沒有清楚的「n」結尾，是整個過程都有鼻腔共鳴。",
    teacherAudioText: "「in」、「ain」、「ein」念前鼻母音，嘴角稍微拉開，嘴巴微開，讓氣從鼻腔通過。pain 麵包、vin 葡萄酒、main 手都是這個音。不要念成中文的「因」，法語沒有清楚的「n」結尾，是整個過程都有鼻腔共鳴。",
    examples: [{ word: "pain", meaningZh: "麵包", tts: "pain" }, { word: "vin", meaningZh: "葡萄酒", tts: "vin" }, { word: "main", meaningZh: "手", tts: "main" }],
    audio: mkAudio("n-in") },

  { id: "n-un", type: "phoneme", levelId: "nasals",
    symbol: "[œ̃]", spelling: "un / um", titleZh: "鼻音 un",
    exampleWord: "un", exampleMeaningZh: "一（陽性）",
    mouthTipZh: "傳統上比 [ɛ̃] 稍圓，但現代法語中和 [ɛ̃] 幾乎相同。",
    tongueTipZh: "舌前位，稍圓於 [ɛ̃]。",
    airflowTipZh: "氣流從前方和鼻腔同時通過。",
    commonMistakeZh: "現代法語多數人已不分 un 和 in，念成 [ɛ̃] 完全可以接受。",
    teachingScriptZh: "[œ̃] 在現代巴黎法語中，多數人已和 [ɛ̃] 合流。un（一）、lundi（週一）、parfum（香水）都是這個音。",
    teacherScriptZh: "「un」和「um」念「œ̃」，但告訴你一個好消息：現代法語巴黎口音裡，大部分人已經把「un」和「in」念成一樣了！所以你把 un 念成跟 in 一樣就可以了，完全可以接受。un 一個、lundi 星期一，都用這個音。",
    teacherAudioText: "「un」和「um」念 un 鼻母音，但告訴你一個好消息：現代法語巴黎口音裡，大部分人已經把「un」和「in」念成一樣了！所以你把 un 念成跟 in 一樣就可以了，完全可以接受。un 一個、lundi 星期一，都用這個音。",
    examples: [{ word: "un", meaningZh: "一個", tts: "un" }, { word: "lundi", meaningZh: "星期一", tts: "lundi" }],
    audio: mkAudio("n-un") },

  // ── 5. 特殊子音 ──────────────────────────────────
  { id: "c-r", type: "phoneme", levelId: "consonants",
    symbol: "[ʁ]", spelling: "r", titleZh: "法語 r（喉音）★",
    exampleWord: "rue", exampleMeaningZh: "街道",
    mouthTipZh: "嘴巴微開放鬆，不要用力，不要捲舌。",
    tongueTipZh: "舌尖放在口腔底部不動，振動點在喉嚨後方小舌（uvula）。",
    airflowTipZh: "氣流從喉嚨後方通過，在小舌附近產生輕微摩擦。",
    commonMistakeZh: "不要念英文 r（捲舌），不要念中文「日」。練習：漱口水的聲音輕化就對了。",
    teachingScriptZh: "法語 r 是喉音，和英文 r（捲舌）完全不同。舌尖放鬆在口底，振動發生在喉嚨後方小舌附近，像輕輕漱口。rue、rouge、restaurant 都有這個音。",
    teacherScriptZh: "法語的「r」是喉音，跟英語捲舌「r」完全不同。秘訣：舌尖放鬆放在口腔底部不動，振動發生在喉嚨後方的小舌附近。最好的練習方法：想像你在漱口水，把那個聲音輕化，就是法語「r」了。rue 街道、rouge 紅色、restaurant 餐廳都有這個音。不要捲舌！",
    syllables: [syllable("ʁa", "ra"), syllable("ʁə", "", false), syllable("ʁi", "ri"), syllable("ʁo", "ro"), syllable("ʁu", "rou"), syllable("ʁy", "ru")],
    sentences: ["Paris est une grande ville rouge de lumière."],
    examples: [{ word: "rue", meaningZh: "街道", tts: "rue" }, { word: "rouge", meaningZh: "紅色", tts: "rouge" }, { word: "restaurant", meaningZh: "餐廳", tts: "restaurant" }],
    audio: mkAudio("c-r") },

  { id: "c-p", type: "phoneme", levelId: "consonants",
    symbol: "[p]", spelling: "p", titleZh: "清音 p",
    exampleWord: "Paris", exampleMeaningZh: "巴黎",
    mouthTipZh: "雙唇先閉合，再短促放開，不要加送氣音。",
    tongueTipZh: "舌頭放鬆，不參與阻塞。",
    airflowTipZh: "氣流在雙唇後短暫累積，再輕輕釋放。",
    commonMistakeZh: "法語 p 的送氣比英語弱，不要讀成強烈的英語 p。",
    teachingScriptZh: "法語 p 是短促、送氣很弱的清音。把 p 和不同母音拼在一起，再練習 Paris。",
    teacherScriptZh: "現在把法語 p 和不同母音拼在一起。練習 pa、pe、pi、po、pou、pu。注意雙唇短促放開，不要加上英語 p 那麼強的送氣。最後讀 Paris。",
    syllables: [syllable("pa", "pa"), syllable("pe", "pe"), syllable("pi", "pi"), syllable("po", "po"), syllable("pou", "pou"), syllable("pu", "pu")],
    sentences: ["Papa parle près de Paris."],
    examples: [{ word: "Paris", meaningZh: "巴黎", tts: "Paris" }, { word: "papa", meaningZh: "爸爸", tts: "papa" }],
    audio: mkAudio("c-p") },

  { id: "c-ch", type: "phoneme", levelId: "consonants",
    symbol: "[ʃ]", spelling: "ch", titleZh: "ch → sh 音",
    exampleWord: "chat", exampleMeaningZh: "貓",
    mouthTipZh: "嘴唇稍微前噘，發英文 she 的 sh 音。",
    tongueTipZh: "舌面靠近上顎，但不接觸。",
    airflowTipZh: "氣流通過舌面和上顎之間，喉嚨無振動（清音）。",
    commonMistakeZh: "法語 ch 永遠是 sh 音，不是英文 ch（cheese）的 tʃ 音。",
    teachingScriptZh: "法語 ch 永遠念 sh 音 [ʃ]，沒有例外。chat（貓）、chocolat（巧克力）、château（城堡）都是 sh 開頭。",
    teacherScriptZh: "法語「ch」永遠是「sh」音，沒有例外。不是英語「cheese」的「ch」，是「she」的「sh」。嘴唇稍微前噘，舌面靠近上顎，喉嚨不振動。chat 貓、chocolat 巧克力、château 城堡都是「sh」開頭。記住：法語 ch 等於英語 sh。",
    syllables: [syllable("ʃa", "cha"), syllable("ʃə", "", false), syllable("ʃi", "chi"), syllable("ʃo", "cho"), syllable("ʃu", "chou"), syllable("ʃy", "chu")],
    sentences: ["Le chat cherche du chocolat."],
    examples: [{ word: "chat", meaningZh: "貓", tts: "chat" }, { word: "chocolat", meaningZh: "巧克力", tts: "chocolat" }],
    audio: mkAudio("c-ch") },

  { id: "c-j", type: "phoneme", levelId: "consonants",
    symbol: "[ʒ]", spelling: "j / g(e/i)", titleZh: "j / 軟 g",
    exampleWord: "journal", exampleMeaningZh: "報紙",
    mouthTipZh: "嘴唇稍前噘，發有振動感的「制」音。",
    tongueTipZh: "舌面靠近上顎前方，像 [ʃ] 但加上喉嚨振動。",
    airflowTipZh: "氣流通過舌面和上顎之間，喉嚨同時振動（濁音）。",
    commonMistakeZh: "不要念成英文 j（dʒ 音），法語 j 是純摩擦音，像英文 measure 裡的 s。",
    teachingScriptZh: "[ʒ] 是 [ʃ] 的濁音版——同樣的嘴型，但喉嚨要振動。je、jour、journal、bonjour 都是這個音。g 接 e 或 i 時也念 [ʒ]。",
    teacherScriptZh: "法語的「j」跟英語「j」完全不同。英語「j」是「dʒ」，像「jump」。法語「j」是摩擦音「ʒ」，像英語「measure」裡的「s」。嘴唇稍前噘，喉嚨要振動。je 我、jour 天、journal 報紙、bonjour 你好都用這個音。「g」接「e」或「i」時也念這個音。",
    teacherAudioText: "法語的「j」跟英語「j」完全不同。英語「j」是「jump」的那個音。法語「j」是摩擦音，像英語「measure」裡的「s」。嘴唇稍前噘，喉嚨要振動。je 我、jour 天、journal 報紙、bonjour 你好都用這個音。「g」接「e」或「i」時也念這個音。",
    examples: [{ word: "journal", meaningZh: "報紙", tts: "journal" }, { word: "je", meaningZh: "我", tts: "je" }, { word: "bonjour", meaningZh: "你好", tts: "bonjour" }],
    audio: mkAudio("c-j") },

  { id: "c-gn", type: "phoneme", levelId: "consonants",
    symbol: "[ɲ]", spelling: "gn", titleZh: "gn 鼻化音",
    exampleWord: "agneau", exampleMeaningZh: "羔羊",
    mouthTipZh: "舌面貼住上顎，發合一的鼻化音，不要分開念 g 和 n。",
    tongueTipZh: "舌面（不是舌尖）貼住硬顎，像「您」的聲母加鼻音。",
    airflowTipZh: "氣流從鼻腔通過，舌面和上顎閉合。",
    commonMistakeZh: "gn 是一個合一的音，不要念成「g-n」兩個音，也不要念成英文 ng。",
    teachingScriptZh: "gn 念合一的顎化鼻音 [ɲ]，類似西班牙語 ñ。montagne（山）、champignon（蘑菇）都有這個音。",
    teacherScriptZh: "「gn」是一個合一的顎化鼻音，類似西班牙語的「ñ」。舌面貼上顎，鼻腔通氣，整個是一個音，不要分開念「g」和「n」。montagne 山、champignon 蘑菇、agneau 羔羊都有這個音。練習：先說「您」這個音，然後加鼻音，差不多就是這樣了。",
    examples: [{ word: "agneau", meaningZh: "羔羊", tts: "agneau" }, { word: "montagne", meaningZh: "山", tts: "montagne" }],
    audio: mkAudio("c-gn") },

  // ── 6. 字母組合 ──────────────────────────────────
  { id: "cb-oi", type: "combo", levelId: "combos",
    symbol: "oi → [wa]", titleZh: "oi 念「瓦」",
    exampleWord: "moi", exampleMeaningZh: "我",
    mouthTipZh: "快速連讀「瓦」，o 和 i 合成一個音，不要分開念。",
    commonMistakeZh: "不要念「歐依」兩個分開的音，oi 念快速的「瓦」[wa]。",
    teachingScriptZh: "oi 是法語最常見的字母組合之一，念 [wa]（像中文「瓦」）。moi（我）、toi（你）、voir（看見）、voiture（汽車）都有這個音。",
    teacherScriptZh: "「oi」念快速的「瓦」，就是中文的「瓦」，一個流暢的音。不要念成「歐依」兩個分開的音。moi 我、toi 你、voir 看見、voiture 汽車都有這個音。練習：瓦、瓦、moi——瓦！對了。",
    examples: [{ word: "moi", meaningZh: "我", tts: "moi" }, { word: "toi", meaningZh: "你", tts: "toi" }, { word: "voiture", meaningZh: "汽車", tts: "voiture" }],
    audio: mkAudio("cb-oi") },

  { id: "cb-eau", type: "combo", levelId: "combos",
    symbol: "au/eau → [o]", titleZh: "au/eau 念「哦」",
    exampleWord: "eau", exampleMeaningZh: "水",
    mouthTipZh: "嘴唇稍圓，念閉口「哦」，三個字母只念一個音。",
    commonMistakeZh: "eau 不要逐字母讀，三個字母 e-a-u 合成一個 [o] 音。",
    teachingScriptZh: "eau 和 au 都念閉口 [o]。gâteau（蛋糕）、beau（漂亮）、aussi（也）、jaune（黃色）都是這個音。",
    teacherScriptZh: "「au」和「eau」都念閉口的「哦」。eau 這個字三個字母只念一個音，不要逐字母讀。beau 漂亮、gâteau 蛋糕、aussi 也、jaune 黃色都用這個音。法語的「o」是閉口的，比中文的「哦」嘴唇更圓、更收。",
    examples: [{ word: "beau", meaningZh: "漂亮", tts: "beau" }, { word: "gâteau", meaningZh: "蛋糕", tts: "gâteau" }, { word: "aussi", meaningZh: "也", tts: "aussi" }],
    audio: mkAudio("cb-eau") },

  { id: "cb-ai", type: "combo", levelId: "combos",
    symbol: "ai/ei → [ɛ]", titleZh: "ai/ei 念「誒」",
    exampleWord: "mais", exampleMeaningZh: "但是",
    mouthTipZh: "念開口「誒」，不要念中文「ㄞ」（那是兩個音）。",
    commonMistakeZh: "ai 念 [ɛ]（開口誒），不是「ㄞ」。mais 念「mɛ」，不是「mai」。",
    teachingScriptZh: "ai 和 ei 都念開口 [ɛ]，不是中文的「ㄞ」。mais（但是）、jamais（從不）、vrai（真的）都是這個音。",
    teacherScriptZh: "「ai」和「ei」都念開口的「誒」。不是中文的「愛」，那是兩個音，法語「ai」是單一的開口誒。mais 但是念「mɛ」，jamais 從不念「ʒamɛ」，vrai 真的念「vrɛ」。記住：ai 不是愛，是開口的誒。",
    teacherAudioText: "「ai」和「ei」都念開口的「誒」。不是中文的「愛」，那是兩個音，法語「ai」是單一的開口誒。mais 但是、jamais 從不、vrai 真的，都念開口的誒。記住：ai 不是愛，是開口的誒。",
    examples: [{ word: "mais", meaningZh: "但是", tts: "mais" }, { word: "jamais", meaningZh: "從不", tts: "jamais" }],
    audio: mkAudio("cb-ai") },

  { id: "cb-qu", type: "combo", levelId: "combos",
    symbol: "qu → [k]", titleZh: "qu 念 k 音",
    exampleWord: "qui", exampleMeaningZh: "誰",
    mouthTipZh: "念純粹的 k 音，u 完全沉默，不念「kw」。",
    commonMistakeZh: "不要念「kw」（英文 queen），法語 qu 只念 [k]，u 不發音。",
    teachingScriptZh: "法語 qu 永遠念 [k]，u 完全不發音。qui（誰）、que（什麼）、quand（什麼時候）都是純 k 音。",
    teacherScriptZh: "法語「qu」永遠念純粹的「k」音，「u」完全不念。不要念成英語「queen」的「kw」——沒有「w」！qui 誰念「ki」，que 什麼念「k」，quand 什麼時候念「kɑ̃」。記住：qu 等於 k，u 沉默。",
    teacherAudioText: "法語「qu」永遠念純粹的「k」音，「u」完全不念。不要念成英語「queen」的「kw」——沒有「w」！qui 誰念「ki」，que 什麼念「k」，quand 什麼時候念「kang」。記住：qu 等於 k，u 沉默。",
    examples: [{ word: "qui", meaningZh: "誰", tts: "qui" }, { word: "quand", meaningZh: "什麼時候", tts: "quand" }],
    audio: mkAudio("cb-qu") },

  { id: "cb-ph", type: "combo", levelId: "combos",
    symbol: "ph → [f]", titleZh: "ph 念 f 音",
    exampleWord: "photo", exampleMeaningZh: "照片",
    mouthTipZh: "念 f 音，上齒輕咬下唇。",
    commonMistakeZh: "不要分開念「p-h」，ph 合起來念一個 f 音。",
    teachingScriptZh: "ph 念 f 音，和英語一樣。photo（照片）、pharmacie（藥局）、téléphone（電話）都是這樣。",
    teacherScriptZh: "「ph」念「f」音，跟英語一樣。上齒輕咬下唇，發「f」。photo 照片、pharmacie 藥局、téléphone 電話都是「f」開頭，雖然拼字是「ph」。不要分開念「p-h」，合起來念一個「f」。",
    examples: [{ word: "photo", meaningZh: "照片", tts: "photo" }, { word: "pharmacie", meaningZh: "藥局", tts: "pharmacie" }],
    audio: mkAudio("cb-ph") },

  { id: "cb-ill", type: "combo", levelId: "combos",
    symbol: "ill → [j]", titleZh: "ill 念「衣」滑音",
    exampleWord: "fille", exampleMeaningZh: "女孩",
    mouthTipZh: "母音後的 ill 念快速的「衣」[j]，不念「il」。",
    commonMistakeZh: "fille 念「fij」不是「fil」，ill 在母音後念 [j]，末尾 e 不念。",
    teachingScriptZh: "ill 在母音後念 [j]（快速的「衣」）。fille（女孩）、famille（家庭）都是這樣。例外：ville（城市）、mille（千）念 [il]。",
    teacherScriptZh: "母音後的「ill」念快速的「衣」，即滑音「j」。fille 女孩念「fij」，famille 家庭念「famij」，ill 在這裡不念「il」。注意例外：ville 城市和 mille 千，這兩個念「il」，不念「j」——所以要分別記住。",
    teacherAudioText: "母音後的「ill」念快速的「衣」，即滑音。fille 女孩念「fiy」，famille 家庭念「famiy」，ill 在這裡不念「il」。注意例外：ville 城市和 mille 千，這兩個念「il」——所以要分別記住。",
    examples: [{ word: "fille", meaningZh: "女孩", tts: "fille" }, { word: "famille", meaningZh: "家庭", tts: "famille" }],
    audio: mkAudio("cb-ill") },

  // ── 7. 字尾不發音 ────────────────────────────────
  { id: "s-vous", type: "silent", levelId: "silent",
    symbol: "vous ✗s", titleZh: "vous：s 不念",
    exampleWord: "vous", exampleMeaningZh: "你/你們",
    mouthTipZh: "末尾 s 完全沉默，念「vu」。遇到母音開頭的詞時 s 連音變 [z]。",
    commonMistakeZh: "vous 末尾 s 平時不念；「vous avez」裡 s 連音念 [z]（vuz-avez）。",
    teachingScriptZh: "vous 的 s 平時不念，念「vu」。但後面接母音開頭的詞時，s 要連音念成 [z]。這就是連音規則。",
    teacherScriptZh: "vous 末尾的「s」平時完全不念，念「voo」。但是！遇到母音開頭的詞，「s」要連音變「z」。vous avez 念「voo-za-vé」，s 和 avez 的 a 連起來變 z 音。這叫連音，後面的階段會詳細學。",
    teacherAudioText: "vous 末尾的「s」平時完全不念。但是！遇到母音開頭的詞，「s」要連音變「z」的音。vous avez 念起來是連在一起的，s 和 avez 的 a 連起來變 z 音。這叫連音，後面的階段會詳細學。",
    examples: [{ word: "vous", meaningZh: "你們（s不念）", tts: "vous" }, { word: "vous avez", meaningZh: "你們有（s連音）", tts: "vous avez" }],
    audio: mkAudio("s-vous") },

  { id: "s-petit", type: "silent", levelId: "silent",
    symbol: "petit ✗t", titleZh: "petit：t 不念",
    exampleWord: "petit", exampleMeaningZh: "小",
    mouthTipZh: "末尾 t 完全沉默，念「peti」。",
    commonMistakeZh: "不要念成英文拼讀 peh-tit，末尾 t 沉默。",
    teachingScriptZh: "字尾 t 在法語中通常不發音。petit（小）、c'est（這是）、est（是）、et（和）都一樣。",
    teacherScriptZh: "petit 小，末尾的「t」完全沉默，念「puh-ti」。c'est 這是、est 是、et 和，末尾的「t」都不念。字尾「t」在法語裡通常是沉默的，除非遇到連音情況。記住：看到字尾「t」，先假設它不念。",
    teacherAudioText: "petit 小，末尾的「t」完全沉默。c'est 這是、est 是、et 和，末尾的「t」都不念。字尾「t」在法語裡通常是沉默的，除非遇到連音情況。記住：看到字尾「t」，先假設它不念。",
    examples: [{ word: "petit", meaningZh: "小", tts: "petit" }, { word: "c'est", meaningZh: "這是", tts: "c'est" }],
    audio: mkAudio("s-petit") },

  { id: "s-grand", type: "silent", levelId: "silent",
    symbol: "grand ✗d", titleZh: "grand：d 不念",
    exampleWord: "grand", exampleMeaningZh: "大",
    mouthTipZh: "末尾 d 沉默，念「grɑ̃」。連音時 d 念 [t]。",
    commonMistakeZh: "grand 末尾 d 不念，但「grand ami」裡 d 連音念 [t]（非 [d]）。",
    teachingScriptZh: "字尾 d 平時不念，但遇到母音開頭的詞時可以連音，連音時 d 念 [t]。「un grand ami」念「grɑ̃t-ami」。",
    teacherScriptZh: "grand 大，末尾的「d」不念，念「grɑ̃」。但如果後面接母音，「d」會連音，而且連音的時候「d」念「t」，不念「d」。grand ami 念「grɑ̃-t-ami」，「d」連入「a」但發「t」音。這個 d 變 t 的變化是法語連音的特點。",
    teacherAudioText: "grand 大，末尾的「d」不念。但如果後面接母音，「d」會連音，而且連音的時候「d」念「t」，不念「d」。grand ami 兩個字連讀時，d 連入 a 但發 t 音。這個 d 變 t 的變化是法語連音的特點。",
    examples: [{ word: "grand", meaningZh: "大", tts: "grand" }, { word: "froid", meaningZh: "冷", tts: "froid" }],
    audio: mkAudio("s-grand") },

  { id: "s-deux", type: "silent", levelId: "silent",
    symbol: "deux ✗x", titleZh: "deux：x 不念",
    exampleWord: "deux", exampleMeaningZh: "二",
    mouthTipZh: "末尾 x 沉默，念「dø」。遇到母音時 x 連音念 [z]。",
    commonMistakeZh: "deux 末尾 x 不念，但「deux ans」裡 x 連音念 [z]（dø-z-ɑ̃）。",
    teachingScriptZh: "字尾 x 平時不念，遇到母音時連音念 [z]。deux（二）、voix（聲音）、prix（價格）的 x 在孤立時都不念。",
    teacherScriptZh: "deux 二，末尾的「x」平時不念，念「dø」。遇到母音開頭的詞，「x」連音念「z」。deux ans 兩歲念「dø-z-ɑ̃」，x 連音進入 ans。同樣的：voix 聲音、prix 價格，孤立時「x」不念。",
    teacherAudioText: "deux 二，末尾的「x」平時不念。遇到母音開頭的詞，「x」連音念「z」。deux ans 兩歲，x 連音進入 ans 念 z 音。同樣的：voix 聲音、prix 價格，孤立時「x」不念。",
    examples: [{ word: "deux", meaningZh: "二", tts: "deux" }, { word: "voix", meaningZh: "聲音", tts: "voix" }],
    audio: mkAudio("s-deux") },

  { id: "s-nez", type: "silent", levelId: "silent",
    symbol: "nez ✗z", titleZh: "nez：z 不念",
    exampleWord: "nez", exampleMeaningZh: "鼻子",
    mouthTipZh: "末尾 z 沉默，念「né」。",
    commonMistakeZh: "字尾 z 通常不念，chez、assez、allez 都一樣。",
    teachingScriptZh: "字尾 z 通常不念。nez（鼻子）、chez（在…家）、assez（足夠）的 z 都不念。但遇到連音時 z 會念出來。",
    teacherScriptZh: "nez 鼻子，末尾的「z」不念，念「né」。chez 在哪裡的家、assez 足夠、allez 你們去，字尾「z」都不念。動詞第二人稱複數「-ez」字尾的「z」也不念——avez 念「a-vé」。但遇到連音時，「z」會念出來。",
    teacherAudioText: "nez 鼻子，末尾的「z」不念。chez 在哪裡的家、assez 足夠、allez 你們去，字尾「z」都不念。動詞第二人稱複數「-ez」字尾的「z」也不念——avez 末尾 z 也沉默。但遇到連音時，「z」會念出來。",
    examples: [{ word: "nez", meaningZh: "鼻子", tts: "nez" }, { word: "chez", meaningZh: "在…的家", tts: "chez" }],
    audio: mkAudio("s-nez") },

  // ── 8. 省音 ──────────────────────────────────────
  { id: "el-je", type: "elision", levelId: "elision",
    symbol: "j'", titleZh: "je → j'",
    exampleWord: "j'aime", exampleMeaningZh: "我喜歡",
    mouthTipZh: "je 後面接母音開頭的詞時，e 省略加省音符號 '。",
    commonMistakeZh: "不能說「je aime」，必須說「j'aime」——這是語法規則，不是選項。",
    teachingScriptZh: "省音（élision）：je、me、te、le、la、de、que 等在母音前，末尾母音省略加省音符號 '。j'aime（我喜歡）、j'ai（我有）。",
    teacherScriptZh: "省音是法語的語法規則，不是選項，必須遵守。「je」後面接母音開頭的詞，「e」省略加省音符號。j'aime 我喜歡、j'ai 我有、j'habite 我住在，都必須省音。說「je aime」是錯的，母語者聽起來很奇怪。",
    examples: [{ word: "j'aime", meaningZh: "我喜歡", tts: "j'aime" }, { word: "j'ai", meaningZh: "我有", tts: "j'ai" }],
    audio: mkAudio("el-je") },

  { id: "el-l", type: "elision", levelId: "elision",
    symbol: "l'", titleZh: "le/la → l'",
    exampleWord: "l'ami", exampleMeaningZh: "那個朋友",
    mouthTipZh: "le 或 la 後接母音開頭的詞，e 或 a 省略成 l'。",
    commonMistakeZh: "不能說「le ami」，必須說「l'ami」——h 啞音的詞也一樣（l'hôtel）。",
    teachingScriptZh: "le、la 後面接母音（或啞音 h）開頭的詞，省略成 l'。l'ami、l'école、l'hôtel 都是這樣。",
    teacherScriptZh: "「le」和「la」後面接母音（或啞音「h」）開頭的詞，省略成「l'」。l'ami 那個朋友、l'école 學校、l'hôtel 酒店。注意 hôtel 雖然有「h」，但這個「h」是啞音不發聲，所以仍然要省音，說「l'hôtel」，不說「le hôtel」。",
    examples: [{ word: "l'ami", meaningZh: "那個朋友", tts: "l'ami" }, { word: "l'école", meaningZh: "學校", tts: "l'école" }],
    audio: mkAudio("el-l") },

  { id: "el-de", type: "elision", levelId: "elision",
    symbol: "d'", titleZh: "de → d'",
    exampleWord: "d'accord", exampleMeaningZh: "好的/同意",
    mouthTipZh: "de 後接母音，e 省略成 d'。",
    commonMistakeZh: "un verre d'eau（一杯水），不說「de eau」。",
    teachingScriptZh: "de 在母音前省略成 d'。d'accord（好的）、d'abord（首先）、un verre d'eau（一杯水）。",
    teacherScriptZh: "「de」在母音前省略成「d'」。d'accord 好的同意，d'abord 首先，un verre d'eau 一杯水。不能說「de eau」，必須說「d'eau」。這個規則讓法語聽起來流暢，把原本不流暢的母音衝突消除。",
    examples: [{ word: "d'accord", meaningZh: "好的/同意", tts: "d'accord" }, { word: "d'abord", meaningZh: "首先", tts: "d'abord" }],
    audio: mkAudio("el-de") },

  { id: "el-ce", type: "elision", levelId: "elision",
    symbol: "c'", titleZh: "ce → c'est",
    exampleWord: "c'est", exampleMeaningZh: "這是",
    mouthTipZh: "ce 後接 est（是），e 省略成 c'est。",
    commonMistakeZh: "c'est（這是）非常常用，不說「ce est」。",
    teachingScriptZh: "c'est 是法語最常用的表達，意思是「這是」。「C'est bon！」「C'est la vie！」——生活中無處不在。",
    teacherScriptZh: "c'est 是法語最常用的表達，意思是「這是」。c'est bon 這很好，c'est la vie 這就是生活，c'est vrai 這是真的。這個詞組要作為一個整體記住。以後你在法語裡幾乎每句話都會用到 c'est。",
    examples: [{ word: "c'est", meaningZh: "這是", tts: "c'est" }, { word: "c'est bon", meaningZh: "這很好", tts: "c'est bon" }],
    audio: mkAudio("el-ce") },

  // ── 9. 連音 ──────────────────────────────────────
  { id: "li-vous", type: "liaison", levelId: "liaison",
    symbol: "vous_z_avez", titleZh: "vous avez（s連音）",
    exampleWord: "vous avez", exampleMeaningZh: "你們有",
    mouthTipZh: "vous 的 s 在 avez 前連音變 [z]——聽起來像「vuz-avez」。",
    commonMistakeZh: "不要把 vous 和 avez 念成兩個分開的詞，s 要連音進入 avez。",
    teachingScriptZh: "連音（liaison）：字尾沉默的 s/z/t/n，遇到母音開頭的詞時，要念出來連入下一個詞。vous avez 念「vuz-avez」。",
    teacherScriptZh: "連音是法語的節奏靈魂。vous avez 裡，vous 末尾沉默的「s」遇到 avez 的母音「a」，要連音念出來，而且念「z」不念「s」。練習：voo-za-vé，流暢地連在一起。連音讓法語聽起來有節奏感。",
    teacherAudioText: "連音是法語的節奏靈魂。vous avez 裡，vous 末尾沉默的「s」遇到 avez 的母音「a」，要連音念出來，而且念「z」不念「s」。流暢地連在一起說。連音讓法語聽起來有節奏感。",
    examples: [{ word: "vous avez", meaningZh: "你們有", tts: "vous avez" }, { word: "vous êtes", meaningZh: "你們是", tts: "vous êtes" }],
    audio: mkAudio("li-vous") },

  { id: "li-les", type: "liaison", levelId: "liaison",
    symbol: "les_z_amis", titleZh: "les amis（s連音）",
    exampleWord: "les amis", exampleMeaningZh: "朋友們",
    mouthTipZh: "les 的 s 連入 amis，念「lez-ami」。",
    commonMistakeZh: "les amis 要連音，不能說「le ami」也不能讓 s 沉默。",
    teachingScriptZh: "冠詞 les 後面接母音開頭的名詞，s 要連音念 [z]。les amis 念「lez-ami」，les enfants 念「lez-ɑ̃fɑ̃」。",
    teacherScriptZh: "冠詞「les」後接母音開頭的詞，「s」連音念「z」。les amis 朋友們念「lé-z-ami」，les enfants 孩子們念「lé-z-ɑ̃fɑ̃」。les 的連音是法語裡最頻繁的連音之一，幾乎每次 les 後接母音都要連音。",
    teacherAudioText: "冠詞「les」後接母音開頭的詞，「s」連音念「z」。les amis 朋友們連讀，les enfants 孩子們連讀。les 的連音是法語裡最頻繁的連音之一，幾乎每次 les 後接母音都要連音。",
    examples: [{ word: "les amis", meaningZh: "朋友們", tts: "les amis" }, { word: "les enfants", meaningZh: "孩子們", tts: "les enfants" }],
    audio: mkAudio("li-les") },

  { id: "li-deux", type: "liaison", levelId: "liaison",
    symbol: "deux_z_enfants", titleZh: "deux enfants（x連音）",
    exampleWord: "deux enfants", exampleMeaningZh: "兩個孩子",
    mouthTipZh: "deux 的 x 連入 enfants，念「dø-z-ɑ̃fɑ̃」。",
    commonMistakeZh: "數字後連音：deux、trois、six、dix 後接母音要連音。",
    teachingScriptZh: "數字後接母音開頭的詞，要連音。deux enfants 念「dø-z-ɑ̃fɑ̃」，trois amis 念「trwa-z-ami」。",
    teacherScriptZh: "數字後接母音也要連音。deux enfants 兩個孩子念「dø-z-ɑ̃fɑ̃」，x 連音念「z」。trois amis 三個朋友念「trwa-z-ami」。數字連音在日常對話裡非常常見，記住它讓你聽起來更自然。",
    teacherAudioText: "數字後接母音也要連音。deux enfants 兩個孩子，x 連音念「z」。trois amis 三個朋友也要連音。數字連音在日常對話裡非常常見，記住它讓你聽起來更自然。",
    examples: [{ word: "deux enfants", meaningZh: "兩個孩子", tts: "deux enfants" }, { word: "trois amis", meaningZh: "三個朋友", tts: "trois amis" }],
    audio: mkAudio("li-deux") },

  { id: "li-un", type: "liaison", levelId: "liaison",
    symbol: "un_n_homme", titleZh: "un homme（n連音）",
    exampleWord: "un homme", exampleMeaningZh: "一個男人",
    mouthTipZh: "un 的 n 連入 homme，念「œ̃n-ɔm」。",
    commonMistakeZh: "不定冠詞 un/mon/son/ton 後接母音，n 要連音。",
    teachingScriptZh: "不定冠詞 un 後接母音，n 連音進入下一個詞。un homme 念「œ̃n-ɔm」，mon ami 念「mɔ̃n-ami」。",
    teacherScriptZh: "不定冠詞「un」後接母音，「n」連音進入下一個詞。un homme 一個男人念「œ̃-n-ɔm」，mon ami 我的朋友念「mɔ̃-n-ami」。連音的「n」要清楚地進入下一個詞，讓兩個詞流暢地連在一起。",
    teacherAudioText: "不定冠詞「un」後接母音，「n」連音進入下一個詞。un homme 一個男人連讀時 n 連入 homme。mon ami 我的朋友，mon 的 n 連入 ami。連音的「n」要清楚地進入下一個詞，讓兩個詞流暢地連在一起。",
    examples: [{ word: "un homme", meaningZh: "一個男人", tts: "un homme" }, { word: "mon ami", meaningZh: "我的朋友", tts: "mon ami" }],
    audio: mkAudio("li-un") },

  // ── 10. 句子跟讀 ─────────────────────────────────
  { id: "sen-bonjour", type: "sentence", levelId: "sentences",
    symbol: "💬", titleZh: "打招呼",
    exampleWord: "Bonjour !", exampleMeaningZh: "你好！",
    mouthTipZh: "重音在最後音節：bon-JOUR。j 是喉嚨振動音 [ʒ]。",
    commonMistakeZh: "Bonjour 要流暢連在一起，不要念成兩個分開的詞。",
    teachingScriptZh: "Bonjour 是法語最基本的招呼語。bon 念 [bɔ̃]（鼻音），jour 念 [ʒuʁ]（j 振動，ur 圓唇）。重音在最後 jour。",
    teacherScriptZh: "Bonjour 是法語最基本的打招呼。bon 念鼻音「bɔ̃」，jour 念「ʒuʁ」，j 是喉嚨振動的音，r 是喉音。整個詞重音在最後「jour」。練習：bɔ̃-ʒuʁ。晚上說 Bonsoir，兩個詞結構一樣，把 jour 換成 soir 就可以了。",
    teacherAudioText: "Bonjour 是法語最基本的打招呼。bon 念圓唇鼻音，jour 的 j 是喉嚨振動的摩擦音，r 是喉音。整個詞重音在最後「jour」。晚上說 Bonsoir，兩個詞結構一樣，把 jour 換成 soir 就可以了。",
    examples: [{ word: "Bonjour !", meaningZh: "你好！", tts: "Bonjour" }, { word: "Bonsoir !", meaningZh: "晚上好！", tts: "Bonsoir" }],
    audio: mkAudio("sen-bonjour") },

  { id: "sen-name", type: "sentence", levelId: "sentences",
    symbol: "💬", titleZh: "自我介紹",
    exampleWord: "Je m'appelle Paul.", exampleMeaningZh: "我叫 Paul。",
    mouthTipZh: "m'appelle 是省音：me + appelle。注意 pp 讓前面的 a 變短促。",
    commonMistakeZh: "不要說「je me appelle」，必須省音成「je m'appelle」。",
    teachingScriptZh: "Je m'appelle 是自我介紹的固定說法，[ʒə ma-pɛl]。整句要流暢連讀。",
    teacherScriptZh: "Je m'appelle 是自我介紹的固定說法，意思是「我叫」。m'appelle 是省音，me 和 appelle 合在一起。念法：「ʒə-ma-pɛl」。整句要流暢連讀，Je m'appelle Paul。你的名字直接放在後面就可以了。不能說「je me appelle」，必須省音。",
    teacherAudioText: "Je m'appelle 是自我介紹的固定說法，意思是「我叫」。m'appelle 是省音，me 和 appelle 合在一起。整句要流暢連讀，Je m'appelle Paul。你的名字直接放在後面就可以了。不能說「je me appelle」，必須省音。",
    examples: [{ word: "Je m'appelle Paul.", meaningZh: "我叫 Paul", tts: "Je m'appelle Paul" }, { word: "Comment vous appelez-vous ?", meaningZh: "您叫什麼名字？", tts: "Comment vous appelez-vous" }],
    audio: mkAudio("sen-name") },

  { id: "sen-jaime", type: "sentence", levelId: "sentences",
    symbol: "💬", titleZh: "表達喜好",
    exampleWord: "J'aime le français.", exampleMeaningZh: "我喜歡法語。",
    mouthTipZh: "J'aime 省音，le 輕念，français 末尾 s 不念。",
    commonMistakeZh: "français 的 ç 念 s（不是 c），末尾 s 不念，念「frɑ̃sɛ」。",
    teachingScriptZh: "J'aime 表示喜歡。français 中的 ç 念 [s]，末尾 s 不念。「J'aime Paris」（我愛巴黎）用同樣的結構。",
    teacherScriptZh: "J'aime 我喜歡，這是法語表達喜好最常用的句型。注意 français 裡的「ç」，這個字母念「s」音，不是「c」音；末尾的「s」不念，念「frɑ̃-sɛ」。J'aime Paris 我愛巴黎，J'aime le chocolat 我喜歡巧克力——j'aime 是萬用的喜好表達。",
    teacherAudioText: "J'aime 我喜歡，這是法語表達喜好最常用的句型。注意 français 裡的「ç」，這個字母念「s」音，不是「c」音；末尾的「s」不念。J'aime Paris 我愛巴黎，J'aime le chocolat 我喜歡巧克力——j'aime 是萬用的喜好表達。",
    examples: [{ word: "J'aime le français.", meaningZh: "我喜歡法語", tts: "J'aime le français" }, { word: "J'aime Paris.", meaningZh: "我愛巴黎", tts: "J'aime Paris" }],
    audio: mkAudio("sen-jaime") },

  { id: "sen-cafe", type: "sentence", levelId: "sentences",
    symbol: "💬", titleZh: "點餐問句",
    exampleWord: "Vous avez un café ?", exampleMeaningZh: "你們有咖啡嗎？",
    mouthTipZh: "vous avez 連音（vuz-avez），問句語調往上。",
    commonMistakeZh: "注意 vous avez 連音，問句末尾語調上揚。",
    teachingScriptZh: "Vous avez un café ? 只靠語調上揚表示問句。注意 vous avez 的連音 [vuz-avez]，café 末尾 é 是閉口 [e]。",
    teacherScriptZh: "Vous avez un café 你們有咖啡嗎？注意 vous avez 的連音，念「voo-za-vé」。法語問句最簡單的方式就是語調上揚，不需要改詞序。café 末尾「é」是閉口的「耶」。整句：voo-za-vé-œ̃-ka-fé？語調在最後 café 往上。",
    teacherAudioText: "Vous avez un café 你們有咖啡嗎？注意 vous avez 的連音。法語問句最簡單的方式就是語調上揚，不需要改詞序。café 末尾「é」是閉口的「耶」。語調在最後 café 往上就是問句了。",
    examples: [{ word: "Vous avez un café ?", meaningZh: "你們有咖啡嗎？", tts: "Vous avez un café" }],
    audio: mkAudio("sen-cafe") },

  { id: "sen-voudrais", type: "sentence", levelId: "sentences",
    symbol: "💬", titleZh: "禮貌要求",
    exampleWord: "Je voudrais parler français.", exampleMeaningZh: "我想說法語。",
    mouthTipZh: "voudrais 是條件式，比 veux 更有禮貌，整句要流暢連讀。",
    commonMistakeZh: "voudrais 末尾 s 不念，parler 末尾 r 不念，念「parlé」。",
    teachingScriptZh: "Je voudrais（我想要）是最有禮貌的要求方式。voudrais 念 [vudʁɛ]，末尾 s 不念。parler 念 [paʁle]，er 字尾不念 r。",
    teacherScriptZh: "Je voudrais 我想要，是最有禮貌的要求方式，比 je veux 更客氣。voudrais 念「voo-drɛ」，末尾「s」不念。parler 說話，念做「par-lé」，「er」字尾不念「r」。在餐廳可以說 Je voudrais un café，非常禮貌好用。整句流暢連讀：「ʒə-voo-drɛ-par-lé-frɑ̃-sɛ」。",
    teacherAudioText: "Je voudrais 我想要，是最有禮貌的要求方式，比 je veux 更客氣。voudrais 末尾「s」不念。parler 說話，念做「par-lé」，「er」字尾不念「r」。在餐廳可以說 Je voudrais un café，非常禮貌好用。整句要流暢連讀。",
    examples: [{ word: "Je voudrais parler français.", meaningZh: "我想說法語", tts: "Je voudrais parler français" }, { word: "Je voudrais un café, s'il vous plaît.", meaningZh: "我想要一杯咖啡，謝謝", tts: "Je voudrais un café s'il vous plaît" }],
    audio: mkAudio("sen-voudrais") },
];

// 0 基礎教學層：畫面顯示、可朗讀文字和 IPA 分開保存。
// 單音沒有已確認音檔時絕不把 IPA 交給 speechSynthesis。
const BEGINNER_GUIDES = {
  "v-a": {
    what: "這是法語最常見的開口母音。它短、乾淨、直接，是之後拼讀大量單字的起點。",
    when: "看見 a、à 或 â 時，經常會用到 [a]。",
    spellings: [["a", "ami"], ["à", "là"], ["â", "pâte"]],
    syllables: [["ba", "ba"], ["ma", "ma"], ["pa", "pa"], ["la", "la"], ["ʁa", "ra"]],
    words: ["ami", "papa", "madame", "là", "Paris"],
    sentence: "Papa va à Paris.",
    future: ["ami", "avec", "parler", "avoir", "à"],
    mistake: "不要讀成英文 cat 的 [æ]；法語 [a] 更乾淨、更直接。",
  },
  "v-i": {
    what: "這是清楚而靠前的 i 音，嘴角像微笑，聲音不要拖長。",
    when: "看見 i、î，部分單字中的 y 時，通常會用到 [i]。",
    spellings: [["i", "vie"], ["î", "île"], ["y", "style"]],
    syllables: [["bi", "bi"], ["mi", "mi"], ["pi", "pi"], ["li", "li"], ["ʁi", "ri"]],
    words: ["vie", "midi", "île", "style", "Paris"],
    sentence: "Lili vit ici.",
    future: ["ici", "merci", "petit", "ville", "Paris"],
    mistake: "不要讀成鬆散的短 i；舌頭要保持在前方高位。",
  },
  "v-u-ou": {
    what: "這是寫作 ou 的後圓唇音，接近中文『烏』，但更短、更集中。",
    when: "看見 ou、où、oû 時，大多數情況讀 [u]。它和法語字母 u 的 [y] 不同。",
    spellings: [["ou", "vous"], ["où", "où"], ["oû", "goût"]],
    syllables: [["bou", "bou"], ["mou", "mou"], ["pou", "pou"], ["lou", "lou"], ["ʁu", "rou"]],
    words: ["vous", "nous", "bonjour", "pour", "toujours"],
    sentence: "Bonjour, vous êtes où ?",
    future: ["vous", "nous", "bonjour", "pour", "toujours"],
    mistake: "不要看到 ou 就讀英文字母 O，也不要和法語 u [y] 混在一起。",
  },
  "v-y": {
    what: "這是法語很重要的特殊母音：舌頭像讀 [i]，嘴唇卻像讀 [u] 一樣收圓。",
    when: "看見 u 或 û 時，通常會用到 [y]；它不是 ou [u]。",
    spellings: [["u", "tu"], ["û", "sûr"]],
    syllables: [["ty", "tu"], ["dy", "du"], ["ly", "lu"], ["ʁy", "rue"]],
    words: ["tu", "salut", "une", "étudiant", "rue"],
    sentence: "Tu habites dans cette rue.",
    future: ["tu", "salut", "une", "étudiant", "rue"],
    mistake: "不要讀成 ou [u]。先保持 [i] 的舌位，再把嘴唇收圓。",
  },
  "e-closed": {
    what: "這是較閉、較緊的 é 音，短促乾淨，不要滑向另一個母音。",
    when: "常見於 é，也常出現在動詞字尾 -er、-ez。",
    spellings: [["é", "café"], ["-er", "parler"], ["-ez", "allez"]],
    syllables: [["pe", "pé"], ["te", "té"], ["le", "lé"], ["ʁe", "ré"]],
    words: ["café", "été", "parler", "allez", "marché"],
    sentence: "L'été, je prends un café.",
    future: ["café", "parler", "aller", "étudiant", "marché"],
    mistake: "不要讀成較開的 [ɛ]；-er 和 -ez 的尾音通常都是 [e]。",
  },
  "e-open": {
    what: "這是較開的 è 音。下巴比 [e] 更低，聲音也更放鬆。",
    when: "常見於 è、ê、ai、ei，也會出現在某些閉音節。",
    spellings: [["è", "mère"], ["ê", "fête"], ["ai", "mais"], ["ei", "seize"]],
    syllables: [["bɛ", "belle"], ["mɛ", "mais"], ["lɛ", "lait"], ["ʁɛ", "reine"]],
    words: ["mère", "fête", "mais", "lait", "français"],
    sentence: "Ma mère aime le lait.",
    future: ["mère", "mais", "français", "faire", "treize"],
    mistake: "不要和閉口 [e] 合併；比較 café [e] 和 mère [ɛ] 的開口大小。",
  },
  "n-an": {
    what: "這是鼻化的開口音：先做 [a]，再讓部分氣流從鼻腔出去。",
    when: "常見於 an、en、am、em；後面的 n 或 m 通常不單獨收尾。",
    spellings: [["an", "sans"], ["en", "enfant"], ["am", "chambre"], ["em", "temps"]],
    syllables: [["bɑ̃", "banc"], ["dɑ̃", "dans"], ["sɑ̃", "sans"], ["ʁɑ̃", "rang"]],
    words: ["sans", "dans", "enfant", "français", "manger"],
    sentence: "L'enfant mange dans la chambre.",
    future: ["sans", "dans", "enfant", "français", "manger"],
    mistake: "不要在最後加出 n 或 ng；鼻化完成後直接結束聲音。",
  },
  "n-on": {
    what: "這是圓唇的鼻音：嘴形像 [ɔ]，同時讓氣流經過鼻腔。",
    when: "看見 on 或 om 時，常會用到 [ɔ̃]。",
    spellings: [["on", "bon"], ["om", "nombre"]],
    syllables: [["bɔ̃", "bon"], ["mɔ̃", "mon"], ["sɔ̃", "son"], ["nɔ̃", "non"]],
    words: ["bon", "bonjour", "mon", "nom", "maison"],
    sentence: "Bonjour, mon nom est Simon.",
    future: ["bonjour", "bon", "mon", "nom", "maison"],
    mistake: "不要讀成英文 on，也不要在尾部加出 ng。",
  },
  "n-in": {
    what: "這是前方的鼻音：嘴角稍微拉開，聲音從口腔和鼻腔一起出去。",
    when: "常見於 in、ain、ein、im；拼法不同但常指向同一個鼻音。",
    spellings: [["in", "vin"], ["ain", "pain"], ["ein", "plein"], ["im", "simple"]],
    syllables: [["pɛ̃", "pain"], ["vɛ̃", "vin"], ["mɛ̃", "main"], ["sɛ̃", "saint"]],
    words: ["pain", "vin", "main", "matin", "simple"],
    sentence: "Ce matin, je prends du pain.",
    future: ["pain", "matin", "vin", "demain", "cinq"],
    mistake: "不要把最後的 n 念出來，也不要直接讀成中文『因』。",
  },
  "c-r": {
    what: "這是法語 r。摩擦位置在喉嚨後方，舌尖不捲，也不是英文 r。",
    when: "字母 r 在單字開頭、中間或尾部都可能出現。",
    spellings: [["r", "rue"], ["-r-", "Paris"], ["-re", "prendre"]],
    syllables: [["ʁa", "ra"], ["ʁə", "", false], ["ʁi", "ri"], ["ʁo", "ro"], ["ʁu", "rou"], ["ʁy", "ru"]],
    words: ["rue", "rouge", "Paris", "bonjour", "professeur"],
    sentence: "Robert regarde la rue rouge.",
    future: ["bonjour", "merci", "parler", "français", "professeur"],
    mistake: "不要捲舌，也不要用英文 r。先保持舌尖不動，再練喉嚨後方的輕摩擦。",
  },
  "c-j": {
    what: "這是有聲的摩擦音，像 [ʃ] 加上喉嚨振動。",
    when: "常見於 j，以及 g 後接 e、i、y 的組合。",
    spellings: [["j", "jour"], ["ge", "manger"], ["gi", "girafe"]],
    syllables: [["ʒa", "ja"], ["ʒə", "je"], ["ʒi", "gilet"], ["ʒu", "jou"]],
    words: ["jour", "bonjour", "je", "journal", "manger"],
    sentence: "Je mange avec Julie.",
    future: ["je", "bonjour", "jour", "manger", "journal"],
    mistake: "不要讀成無聲的 [ʃ]；手放喉嚨應感到振動。",
  },
  "c-ch": {
    what: "這是無聲的 ch 音，接近英文 she 的 sh，喉嚨不振動。",
    when: "法語字母組合 ch 大多數時候讀 [ʃ]。",
    spellings: [["ch", "chat"], ["ch", "chocolat"]],
    syllables: [["ʃa", "chat"], ["ʃə", "che"], ["ʃi", "chi"], ["ʃu", "chou"], ["ʃy", "chu"]],
    words: ["chat", "chambre", "chercher", "chocolat", "dimanche"],
    sentence: "Le chat cherche le chocolat.",
    future: ["chat", "chambre", "chercher", "chocolat", "dimanche"],
    mistake: "不要讀成英文 tch，也不要讓喉嚨振動成 [ʒ]。",
  },
};

const LEVEL_GUIDES = {
  basics: { intro: "先建立法語拼讀觀念：字母不一定逐個讀，字尾也常常不發音。", outcomes: ["知道法語不是逐字母拼讀", "認得常見字母組合", "開始留意不發音字尾"] },
  vowels: { intro: "你會學會最常見的基礎母音，知道它們對應哪些字母，並把它們拼成音節和單字。", outcomes: ["看見 a、i、ou、u 時知道怎樣讀", "分清 ou [u] 和 u [y]", "讀出 ba、mi、tu、vous 等基礎組合"] },
  "e-sounds": { intro: "集中分辨法語幾種 e 音，建立看拼法選聲音的習慣。", outcomes: ["分清 é [e] 和 è [ɛ]", "認得 -er、-ez 的常見讀法", "讀出 café、mère、parler"] },
  nasals: { intro: "學會讓氣流同時經過口腔和鼻腔，避免把 n、m 或 ng 讀出來。", outcomes: ["分清 an、on、in 三組鼻音", "看見常見鼻音拼法能試讀", "讀出 enfant、bonjour、pain"] },
  consonants: { intro: "掌握法語最有辨識度的輔音，並立即配上母音練成音節。", outcomes: ["做出法語 r 的喉音", "分清 [ʃ] 和 [ʒ]", "把輔音與 a、i、ou、u 拼讀"] },
  combos: { intro: "把字母組合視為一個聲音單位，不再逐個字母猜讀音。", outcomes: ["辨認常見組合", "把組合放進單字", "提升第一次看到單字的試讀能力"] },
  silent: { intro: "學懂哪些字尾經常不讀，避免把法語念成逐字拼音。", outcomes: ["辨認常見靜音字尾", "避免多讀尾音", "讀得更接近自然法語節奏"] },
  elision: { intro: "學會母音相遇時的省音，讓短句連得自然。", outcomes: ["認得 apostrophe 省音", "讀好 j'aime、l'homme", "避免逐詞停頓"] },
  liaison: { intro: "理解何時把前一個詞的尾音連到下一個詞。", outcomes: ["聽懂常見連音", "練習 vous avez 等組合", "避免不該有的連音"] },
  sentences: { intro: "把前面學到的聲音放回完整句子，用慢速、正常速度和跟讀完成整合。", outcomes: ["讀完整 A1 短句", "保持法語節奏", "能自我檢查關鍵音"] },
};

function guideFor(lesson) {
  const guide = BEGINNER_GUIDES[lesson.id];
  if (guide) return guide;
  const words = (lesson.examples || []).map(item => item.word).filter(Boolean);
  const spellingItems = (lesson.spelling || "常見拼法").split(" / ").filter(Boolean).slice(0, 4);
  return {
    what: lesson.teachingScriptZh || `${lesson.titleZh} 是這一階段需要掌握的法語發音規則。`,
    when: lesson.spelling ? `看見 ${lesson.spelling} 時，需要留意這個讀音或規則。` : "在常見法語單字和短句中會遇到。",
    spellings: spellingItems.map((item, index) => [item, words[index] || lesson.exampleWord]),
    syllables: (lesson.syllables || []).map(item => [item.display, item.speakText, item.ttsAllowed]),
    words: [...new Set([lesson.exampleWord, ...words])].filter(Boolean),
    sentence: lesson.sentences?.[0] || lesson.exampleWord,
    future: words.length ? words : [lesson.exampleWord],
    mistake: lesson.commonMistakeZh || "先求聲音清楚和穩定，不要為了速度跳過嘴形。",
  };
}

// ═══════════════════════════════════════════════════
//  教學卡片
// ═══════════════════════════════════════════════════

function SyllablePractice({ lesson, color, compact = false }) {
  if (!lesson.syllables?.length) return null;
  return (
    <div style={{ marginBottom: compact ? 0 : 12, padding: compact ? 0 : "10px 12px", background: compact ? "transparent" : color + "08", borderRadius: 10, border: compact ? "none" : `1px solid ${color}20` }}>
      {!compact && <div style={{ fontSize: 10, fontWeight: 800, color, marginBottom: 7 }}>4–5. 🔗 拼母音音節與跟讀</div>}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
        {lesson.syllables.map(item => {
          const canUseTts = item.ttsAllowed && Boolean(item.speakText);
          return (
            <span key={item.display} style={{ display: "inline-flex", flexDirection: "column", gap: 2 }}>
              <AudioButton
                audioUrl={item.audioUrl}
                fallbackText={canUseTts ? item.speakText : ""}
                lang={item.lang}
                ttsRate={0.72}
                label={`${item.display}${item.speakText ? ` · ${item.speakText}` : ""}`}
                unavailableLabel={`${item.display} 音訊待製作`}
                color={color}
                sm
              />
              {(item.audioUrl || canUseTts) && (
                <RepeatBtn audioUrl={item.audioUrl} fallbackText={canUseTts ? item.speakText : ""} lang={item.lang} color="#10b981" sm />
              )}
              {!item.verified && <small style={{ fontSize: 8, color: "#d97706" }}>待人工驗證</small>}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function MinimalPairPractice({ lesson, color }) {
  if (!lesson.minimalPairs?.length) return null;
  return (
    <div style={{ marginBottom: 12, padding: "10px 12px", background: "#f59e0b08", borderRadius: 10, border: "1px solid #f59e0b22" }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: "#d97706", marginBottom: 7 }}>↔ 最小對比</div>
      {lesson.minimalPairs.map(pair => (
        <div key={pair.display} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 78 }}>{pair.display}</span>
          <AudioButton fallbackText={pair.left} lang="fr-FR" ttsRate={0.78} label={pair.left} color={color} sm />
          <AudioButton fallbackText={pair.right} lang="fr-FR" ttsRate={0.78} label={pair.right} color="#d97706" sm />
        </div>
      ))}
    </div>
  );
}

function LessonCard({ lesson, color, isCompleted, isSelected, onSelect, onComplete }) {
  const syllablesVerified = !lesson.syllables?.some(item => !item.verified);
  return (
    <div onClick={() => onSelect(lesson)}
      style={{ background: "var(--panel)", border: `1px solid ${isSelected ? color + "70" : "var(--border)"}`,
        borderRadius: 14, overflow: "hidden", cursor: "pointer", transition: "box-shadow .15s",
        boxShadow: isSelected ? `0 0 0 2px ${color}40` : "none",
        display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{ padding: "11px 14px 8px", background: color + "0c", borderBottom: `1px solid ${color}20`,
        display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 19, fontWeight: 900, color, fontFamily: "monospace", lineHeight: 1.2, wordBreak: "break-all" }}>
            {lesson.symbol}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginTop: 3 }}>
            {lesson.titleZh}
          </div>
        </div>
        {isCompleted && (
          <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#10b98120", color: "#10b981",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0, fontWeight: 700 }}>
            ✓
          </span>
        )}
      </div>

      {/* Example word */}
      <div style={{ padding: "7px 14px 5px", display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#a78bfa", fontStyle: "italic", flexShrink: 0 }}>
          {lesson.exampleWord}
        </span>
        <span style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          — {lesson.exampleMeaningZh}
        </span>
      </div>

      {/* Mouth tip */}
      <div style={{ padding: "0 14px 6px", fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
        👄 {lesson.mouthTipZh}
      </div>

      {/* Common mistake */}
      {lesson.commonMistakeZh && (
        <div style={{ margin: "0 14px 10px", padding: "5px 8px", background: "rgba(245,158,11,0.07)",
          borderRadius: 7, border: "1px solid rgba(245,158,11,0.18)", fontSize: 10, color: "#d97706", lineHeight: 1.4 }}>
          ⚠️ {lesson.commonMistakeZh}
        </div>
      )}

      {/* Buttons */}
      <div onClick={e => e.stopPropagation()}
        style={{ padding: "6px 14px 12px", display: "flex", flexDirection: "column", gap: 5, marginTop: "auto" }}>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <span style={{ fontSize: 9, color: "var(--text-faint)", minWidth: 26, flexShrink: 0 }}>講解</span>
          <TeacherButton lesson={lesson} contentLanguage="fr-FR" narratorLanguage="zh-CN" color="#0891b2" sm />
        </div>
        {/* 音標行 — 只對有獨立音素的課程顯示 */}
        {lesson.type === "phoneme" && (
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <span style={{ fontSize: 9, color: "var(--text-faint)", minWidth: 26, flexShrink: 0 }}>音標</span>
            <AudioButton audioUrl={lesson.audio?.phonemeUrl}
              lang="fr-FR" ttsRate={0.85} label="聽音標" color={color} sm />
            <AudioButton audioUrl={lesson.audio?.phonemeRepeatUrl}
              lang="fr-FR" ttsRate={0.65} label="慢速" color="#8b5cf6" sm />
          </div>
        )}
        {lesson.syllables?.length > 0 && (
          <div style={{ display: "flex", gap: 4, alignItems: "flex-start" }}>
            <span style={{ fontSize: 9, color: "var(--text-faint)", minWidth: 26, flexShrink: 0, paddingTop: 5 }}>音節</span>
            <SyllablePractice lesson={lesson} color={color} compact />
          </div>
        )}
        {/* 例字行 */}
        {(() => {
          const wt = lesson.exampleWord.split(" / ")[0].trim();
          const wl = wt.length > 7 ? wt.slice(0, 7) + "…" : wt;
          return (
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <span style={{ fontSize: 9, color: "var(--text-faint)", minWidth: 26, flexShrink: 0 }}>例字</span>
              <AudioButton audioUrl={lesson.audio?.wordNormalUrl} fallbackText={wt}
                lang="fr-FR" ttsRate={0.85} label={`正常單字 ${wl}`} color={color} sm />
              <AudioButton audioUrl={lesson.audio?.wordSlowUrl} fallbackText={wt}
                lang="fr-FR" ttsRate={0.65} label="慢速單字" color="#8b5cf6" sm />
            </div>
          );
        })()}
        <div style={{ display: "flex", gap: 4 }}>
          <button disabled={!syllablesVerified} title={!syllablesVerified ? "音節聲音尚未完成人工驗證" : ""}
            onClick={e => { e.stopPropagation(); if (syllablesVerified) onComplete(lesson.id); }}
            style={{ padding: "4px 9px", borderRadius: 8, marginLeft: "auto",
              border: isCompleted ? "1px solid #10b981" : "1px solid var(--border)",
              background: isCompleted ? "#10b98112" : "var(--panel-alt)",
              color: isCompleted ? "#10b981" : "var(--text-faint)",
              cursor: syllablesVerified ? "pointer" : "not-allowed", opacity: syllablesVerified ? 1 : 0.55,
              fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>
            {!syllablesVerified ? "音節待驗證" : isCompleted ? "✓ 完成" : "標記完成"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  Detail Panel（同頁教學面板）
// ═══════════════════════════════════════════════════

function InfoBlock({ icon, label, color, children }) {
  return (
    <div className="fp-info-block" style={{ marginBottom: 10, padding: "9px 12px", background: color + "08",
      borderRadius: 10, border: `1px solid ${color}22` }}>
      <div style={{ fontSize: 10, fontWeight: 800, color, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.7 }}>{children}</div>
    </div>
  );
}

function DetailPanel({ lesson, color, completedIds, onComplete, onClose }) {
  if (!lesson) return null;
  const done = completedIds.has(lesson.id);
  const syllablesVerified = !lesson.syllables?.some(item => !item.verified);
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--panel)" }}>
      {/* Panel header */}
      <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0,
        display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 900, color, fontFamily: "monospace", lineHeight: 1.2 }}>{lesson.symbol}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginTop: 2 }}>{lesson.titleZh}</div>
        </div>
        <button onClick={onClose}
          style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "4px 10px",
            cursor: "pointer", color: "var(--text-faint)", fontSize: 12, flexShrink: 0 }}>
          ✕
        </button>
      </div>

      {/* Panel body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}
        className="fp-body">

        {lesson.teacherScriptZh && (
          <div style={{ marginBottom: 14, padding: "10px 13px", background: "#0891b208",
            borderRadius: 10, border: "1px solid #0891b222" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#0891b2", textTransform: "uppercase", letterSpacing: 0.5 }}>
                1. 🎓 老師中文講解
              </div>
              <TeacherButton lesson={lesson} contentLanguage="fr-FR" narratorLanguage="zh-CN" label="播放" color="#0891b2" sm />
            </div>
            <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.8 }}>{lesson.teacherScriptZh}</div>
          </div>
        )}

        {/* 音標區塊 — 只對有獨立音素的課程顯示 */}
        {lesson.type === "phoneme" && (
          <div style={{ marginBottom: 10, padding: "10px 14px", background: color + "08", borderRadius: 12, border: `1px solid ${color}20` }}>
            <div style={{ fontSize: 10, fontWeight: 800, color, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>2–3. 🔤 單獨音標與跟讀</div>
            <div style={{ fontSize: 22, fontWeight: 900, color, fontFamily: "monospace", marginBottom: 8 }}>{lesson.symbol}</div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              <AudioButton audioUrl={lesson.audio?.phonemeUrl}
                lang="fr-FR" ttsRate={0.85} label="聽音標" color={color} />
              <AudioButton audioUrl={lesson.audio?.phonemeRepeatUrl}
                lang="fr-FR" ttsRate={0.65} label="慢速音標" color="#8b5cf6" />
            </div>
          </div>
        )}
        <SyllablePractice lesson={lesson} color={color} />
        {/* Example + play */}
        <div style={{ marginBottom: 14, padding: "12px 14px", background: color + "0a",
          borderRadius: 12, border: `1px solid ${color}25` }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#a78bfa", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>6–7. 📖 慢速與正常單字</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#a78bfa", fontStyle: "italic", marginBottom: 3 }}>
            {lesson.exampleWord}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>{lesson.exampleMeaningZh}</div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            <AudioButton fallbackText={lesson.exampleWord} lang="fr-FR" ttsRate={0.85} audioUrl={lesson.audio?.wordNormalUrl} label="正常單字" color={color} />
            <AudioButton fallbackText={lesson.exampleWord} lang="fr-FR" ttsRate={0.65} audioUrl={lesson.audio?.wordSlowUrl} label="慢速單字" color="#8b5cf6" />
            <RepeatBtn audioUrl={lesson.audio?.repeatAudioUrl} fallbackText={lesson.exampleWord} lang="fr-FR" color={color} />
          </div>
        </div>

        <MinimalPairPractice lesson={lesson} color={color} />

        {lesson.mouthTipZh && <InfoBlock icon="👄" label="嘴形怎樣做？" color="#a78bfa">{lesson.mouthTipZh}</InfoBlock>}
        {lesson.tongueTipZh && <InfoBlock icon="👅" label="舌頭在哪裡？" color="#34d399">{lesson.tongueTipZh}</InfoBlock>}
        {lesson.airflowTipZh && <InfoBlock icon="💨" label="氣流怎樣走？" color="#60a5fa">{lesson.airflowTipZh}</InfoBlock>}
        {lesson.commonMistakeZh && (
          <InfoBlock icon="⚠️" label="常見錯誤" color="#f59e0b">
            <span style={{ color: "#f59e0b" }}>{lesson.commonMistakeZh}</span>
          </InfoBlock>
        )}

        {/* Examples list */}
        {lesson.examples?.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8,
              textTransform: "uppercase", letterSpacing: 0.5 }}>9. 📚 單字與句子練習</div>
            {lesson.examples.map((ex, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 12px", background: "var(--panel-alt)", borderRadius: 8, marginBottom: 5,
                border: "1px solid var(--border)" }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#a78bfa", fontStyle: "italic" }}>{ex.word}</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 7 }}>— {ex.meaningZh}</span>
                </div>
                <div style={{ display: "flex", gap: 5 }}>
                  <AudioButton fallbackText={ex.tts} lang="fr-FR" ttsRate={0.82} label="正常單字" color={color} sm />
                  <RepeatBtn fallbackText={ex.tts} lang="fr-FR" color={color} sm />
                </div>
              </div>
            ))}
          </div>
        )}

        {lesson.sentences?.length > 0 && (
          <div style={{ marginBottom: 14, padding: "10px 12px", background: "#0f766e08", borderRadius: 10, border: "1px solid #0f766e22" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#0f766e", marginBottom: 7 }}>9. 💬 句子練習</div>
            {lesson.sentences.map(sentence => (
              <div key={sentence} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 7, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: "var(--text)" }}>{sentence}</span>
                <div style={{ display: "flex", gap: 5 }}>
                  <AudioButton fallbackText={sentence} lang="fr-FR" ttsRate={0.8} label="聽句子" color="#0f766e" sm />
                  <RepeatBtn fallbackText={sentence} lang="fr-FR" color="#10b981" sm />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Complete button */}
        <button disabled={!syllablesVerified} title={!syllablesVerified ? "音節聲音尚未完成人工驗證" : ""}
          onClick={() => { if (syllablesVerified) onComplete(lesson.id); }}
          style={{ width: "100%", padding: "11px 0", borderRadius: 12, border: "none", cursor: syllablesVerified ? "pointer" : "not-allowed",
            background: done ? "#10b98118" : `linear-gradient(135deg, ${color}cc, ${color})`,
            color: done ? "#10b981" : "#fff", opacity: syllablesVerified ? 1 : 0.55, fontWeight: 700, fontSize: 14 }}>
          {!syllablesVerified ? "音節聲音待人工驗證" : done ? "✓ 已標記完成" : "✓ 標記完成"}
        </button>
      </div>
    </div>
  );
}

function FlowStrip({ lesson, guide, color }) {
  const letters = guide.spellings.map(item => item[0]).slice(0, 3).join(" / ");
  const syllables = guide.syllables.map(item => item[0]).slice(0, 4).join(" / ") || "先理解規則";
  const words = guide.words.slice(0, 3).join(" / ");
  const steps = [
    ["音標", lesson.symbol], ["常見字母", letters], ["音節", syllables], ["單字", words], ["短句", guide.sentence],
  ];
  return (
    <div className="fp-flow">
      {steps.map(([label, value], index) => (
        <div className="fp-flow-step" key={label}>
          <small>{label}</small><strong>{value}</strong>
          {index < steps.length - 1 && <span className="fp-flow-arrow">→</span>}
        </div>
      ))}
    </div>
  );
}

function HighlightSound({ word, spellings }) {
  const patterns = spellings
    .map(([letters]) => letters.replace(/^-|-$/g, ""))
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  const escaped = patterns.map(item => item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!escaped.length) return word;
  const matcher = new RegExp(`(${escaped.join("|")})`, "i");
  return String(word).split(matcher).map((part, index) => matcher.test(part)
    ? <mark className="fp-sound-mark" key={`${part}-${index}`}>{part}</mark>
    : <span key={`${part}-${index}`}>{part}</span>);
}

function BeginnerLessonCard({ lesson, color, isCompleted, isSelected, onSelect }) {
  const guide = guideFor(lesson);
  return (
    <button type="button" className={`fp-course-card${isSelected ? " is-selected" : ""}`}
      onClick={() => onSelect(lesson)} style={{ "--lesson-color": color }}>
      <div className="fp-card-top">
        <div className="fp-symbol">{lesson.symbol}</div>
        <div className="fp-card-heading">
          <div className="fp-eyebrow">由聲音開始，一步一步拼讀</div>
          <h3>{lesson.titleZh}</h3>
        </div>
        <span className={`fp-status${isCompleted ? " done" : ""}`}>{isCompleted ? "✓ 已完成" : "開始學習"}</span>
      </div>
      <p className="fp-card-what">{guide.what}</p>
      <div className="fp-when"><b>我什麼時候用它？</b><span>{guide.when}</span></div>
      <FlowStrip lesson={lesson} guide={guide} color={color} />
      <div className="fp-card-footer">
        <span>打開完整訓練：嘴形 → 音節 → 單字 → 短句</span><strong>進入這一課 →</strong>
      </div>
    </button>
  );
}

function LearningCheck({ done, onComplete, color }) {
  return (
    <div className="fp-ready-check">
      <div>
        <h4>完成這張卡前，你應該能做到：</h4>
        <ul>
          <li>聽得出這個音</li><li>自己能讀出這個音</li>
          <li>知道哪些字母會發這個音</li><li>能讀出 3 個以上相關單字</li>
        </ul>
        <p>如果還做不到，先重聽音節和單字，不要急著下一個。</p>
      </div>
      <button type="button" onClick={onComplete} style={{ background: done ? "#10b98120" : color, color: done ? "#34d399" : "white" }}>
        {done ? "✓ 已標記完成" : "我已做到，標記完成"}
      </button>
    </div>
  );
}

function voicingTipFor(lesson) {
  if (lesson.id === "c-ch") return "聲帶不要振動；手放喉嚨時應感覺不到震動。";
  if (lesson.id === "c-j" || lesson.id === "c-r") return "聲帶要振動；手放喉嚨可以感到輕微震動。";
  if (lesson.type === "phoneme") return "這是有聲音，聲帶要自然振動。";
  return "先慢速朗讀，留意氣流是否連續。";
}

function BeginnerDetailPanel({ lesson, color, completedIds, onComplete, onClose }) {
  if (!lesson) return null;
  const guide = guideFor(lesson);
  const done = completedIds.has(lesson.id);

  // Best available audio for "single sound" practice
  const phonemeAudioUrl = lesson.audio?.phonemeUrl || null;
  const firstSyllable = guide.syllables.find(([, speakText, allowed = true]) => allowed !== false && speakText);
  const firstWord = guide.words[0];
  const phonemeFallback = firstSyllable ? firstSyllable[1] : firstWord;
  const canPlayPhoneme = lesson.type === "phoneme" || lesson.type === "combo";

  return (
    <div className="fp-detail-shell" style={{ "--lesson-color": color }}>
      {/* Header */}
      <div className="fp-detail-header">
        <div><span>完整發音訓練</span><h2>{lesson.symbol} {lesson.titleZh}</h2></div>
        <button type="button" onClick={onClose}>✕</button>
      </div>

      <div className="fp-detail-scroll fp-body">

        {/* Hero — big symbol + one-sentence hook */}
        <div className="fpb-hero" style={{ borderColor: `${color}40` }}>
          <div className="fpb-hero-symbol" style={{ color }}>{lesson.symbol}</div>
          <p>{guide.what}</p>
        </div>

        {/* ── 1. 先聽老師怎麼教 ── */}
        <section className="fpb-section">
          <div className="fpb-step-label" style={{ color }}>1. 先聽老師怎麼教</div>
          <p className="fpb-step-text">
            {lesson.teacherAudioText || lesson.teacherScriptZh || lesson.teachingScriptZh || ""}
          </p>
          <div style={{ marginTop: 14 }}>
            <TeacherButton lesson={lesson} contentLanguage="fr-FR" narratorLanguage="zh-CN"
              label="▶ 聽老師講解" color="#0891b2" />
          </div>
        </section>

        {/* ── 2. 先做嘴形 ── */}
        <section className="fpb-section">
          <div className="fpb-step-label" style={{ color }}>2. 先做嘴形</div>
          <div className="fpb-mouth-row">
            <div className="fpb-mouth-chip">
              <span>👄</span><b>嘴巴</b>
              <p>{lesson.mouthTipZh || "嘴巴保持自然，先慢慢做出清楚位置。"}</p>
            </div>
            <div className="fpb-mouth-chip">
              <span>👅</span><b>舌頭</b>
              <p>{lesson.tongueTipZh || "舌頭放鬆，留意接觸位置和高度。"}</p>
            </div>
            <div className="fpb-mouth-chip">
              <span>💨</span><b>聲音</b>
              <p>{(lesson.airflowTipZh ? lesson.airflowTipZh + " " : "") + voicingTipFor(lesson)}</p>
            </div>
          </div>
        </section>

        {/* ── 3. 只練這一個音 ── */}
        {canPlayPhoneme && (phonemeAudioUrl || phonemeFallback) && (
          <section className="fpb-section">
            <div className="fpb-step-label" style={{ color }}>3. 只練這一個音</div>
            <div className="fpb-big-btns">
              <AudioButton audioUrl={phonemeAudioUrl} fallbackText={phonemeFallback}
                lang="fr-FR" ttsRate={0.85} label={`▶ 聽 ${lesson.symbol}`} color={color} />
              <AudioButton audioUrl={phonemeAudioUrl} fallbackText={phonemeFallback}
                lang="fr-FR" ttsRate={0.5} label={`▶ 慢速 ${lesson.symbol}`} color="#8b5cf6" />
              <RepeatBtn audioUrl={phonemeAudioUrl} fallbackText={phonemeFallback}
                lang="fr-FR" color="#10b981" />
            </div>
          </section>
        )}

        {/* ── 4. 音標 → 字母 → 音節 → 單字 → 短句 ── */}
        <section className="fpb-section">
          <div className="fpb-step-label" style={{ color }}>4. 音標 → 字母 → 音節 → 單字 → 短句</div>
          <div className="fpb-flow-list">

            {/* 音標 row */}
            <div className="fpb-flow-row">
              <span className="fpb-flow-tag">音標</span>
              <span style={{ fontFamily: "monospace", fontWeight: 900, fontSize: 20, color }}>{lesson.symbol}</span>
            </div>

            {/* 字母 rows */}
            {guide.spellings.slice(0, 3).map(([letters, word]) => (
              <div className="fpb-flow-row" key={letters}>
                <span className="fpb-flow-tag">字母</span>
                <span className="fpb-flow-content">
                  <b style={{ color, fontFamily: "monospace", fontSize: 15 }}>{letters}</b>
                  <span style={{ color: "var(--text-muted)", marginLeft: 6 }}>例如 <i>{word}</i></span>
                </span>
                <AudioButton fallbackText={word} lang="fr-FR" ttsRate={0.8} label={`聽 ${word}`} color={color} sm />
              </div>
            ))}

            {/* 音節 rows */}
            {guide.syllables.slice(0, 5).filter(([, speakText, allowed = true]) => allowed !== false && speakText).map(([display, speakText]) => (
              <div className="fpb-flow-row" key={display}>
                <span className="fpb-flow-tag">音節</span>
                <span className="fpb-flow-content" style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 15 }}>{display}</span>
                <AudioButton fallbackText={speakText} lang="fr-FR" ttsRate={0.72} label={`聽 ${display}`} color={color} sm />
                <RepeatBtn fallbackText={speakText} lang="fr-FR" color="#10b981" sm />
              </div>
            ))}

            {/* 單字 rows */}
            {guide.words.slice(0, 5).map(word => (
              <div className="fpb-flow-row" key={word}>
                <span className="fpb-flow-tag">單字</span>
                <span className="fpb-flow-content"><HighlightSound word={word} spellings={guide.spellings} /></span>
                <AudioButton fallbackText={word} lang="fr-FR" ttsRate={0.82} label={`聽 ${word}`} color={color} sm />
                <AudioButton fallbackText={word} lang="fr-FR" ttsRate={0.55} label="慢" color="#8b5cf6" sm />
              </div>
            ))}

            {/* 短句 row */}
            <div className="fpb-flow-row fpb-flow-sentence">
              <span className="fpb-flow-tag">短句</span>
              <span className="fpb-flow-content" style={{ fontStyle: "italic", color: "#5eead4" }}>{guide.sentence}</span>
              <AudioButton fallbackText={guide.sentence} lang="fr-FR" ttsRate={0.8} label="聽短句" color="#0f766e" sm />
              <RepeatBtn fallbackText={guide.sentence} lang="fr-FR" color="#10b981" sm />
            </div>
          </div>
        </section>

        {/* ── 5. 接下來看看這些詞 ── */}
        {lesson.examples?.length > 0 && (
          <section className="fpb-section">
            <div className="fpb-step-label" style={{ color }}>5. 接下來看看這些詞</div>
            {lesson.examples.map((ex, i) => (
              <div className="fpb-vocab-card" key={i} style={{ borderColor: `${color}25` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 17, fontWeight: 800, color, fontStyle: "italic", marginBottom: 2 }}>{ex.word}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{ex.meaningZh}</div>
                </div>
                <div className="fpb-vocab-btns">
                  <AudioButton fallbackText={ex.tts || ex.word} lang="fr-FR" ttsRate={0.82} label="▶ 正常" color={color} sm />
                  <AudioButton fallbackText={ex.tts || ex.word} lang="fr-FR" ttsRate={0.55} label="🐢 慢速" color="#8b5cf6" sm />
                </div>
              </div>
            ))}
          </section>
        )}

        {/* 常見錯誤 */}
        {guide.mistake && (
          <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.22)", marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: "#f59e0b", marginBottom: 5 }}>⚠️ 常見錯誤提醒</div>
            <div style={{ fontSize: 13, color: "#fbbf24", lineHeight: 1.7 }}>{guide.mistake}</div>
          </div>
        )}

        {/* ── 6. 完成 ── */}
        <button type="button" onClick={() => onComplete(lesson.id)}
          style={{ width: "100%", padding: "14px 0", borderRadius: 14, border: "none", cursor: "pointer",
            fontWeight: 800, fontSize: 15,
            background: done ? "rgba(16,185,129,0.15)" : `linear-gradient(135deg, ${color}cc, ${color})`,
            color: done ? "#10b981" : "#fff" }}>
          {done ? "✓ 已完成這個音" : `完成 ${lesson.symbol}，學下一個音 →`}
        </button>

      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  Main Component
// ═══════════════════════════════════════════════════

export default function FrenchPronunciation({ user, db, onNav }) {
  const [track, setTrack] = useState("foundation");
  const [activeLevel, setActiveLevel] = useState(0);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [completedIds, setCompletedIds] = useState(new Set());
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => () => stopPronunciationAudio(), []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 680);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("fp-completed-v2");
      if (saved) setCompletedIds(new Set(JSON.parse(saved)));
    } catch (_) {}
  }, []);

  function toggleComplete(id) {
    setCompletedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem("fp-completed-v2", JSON.stringify([...next])); } catch (_) {}
      return next;
    });
  }

  const visibleLevels = track === "foundation" ? LEVELS.slice(0, 5) : LEVELS.slice(5);
  const curLevel = visibleLevels[activeLevel] || visibleLevels[0];
  const curLessons = LESSONS.filter(l => l.levelId === curLevel.id);
  const totalCount = LESSONS.length;
  const doneCount = LESSONS.filter(l => completedIds.has(l.id)).length;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  function handleSelectLesson(lesson) {
    setSelectedLesson(prev => prev?.id === lesson.id ? null : lesson);
  }

  function renderLevelContent() {
    const lvlDone = curLessons.filter(l => completedIds.has(l.id)).length;
    const panelOpen = !!selectedLesson && !isMobile;
    const guide = LEVEL_GUIDES[curLevel.id];
    const cols = panelOpen ? "1fr" : "repeat(auto-fit, minmax(min(100%, 430px), 1fr))";
    return (
      <div>
        <div className="fp-stage-intro" style={{ "--lesson-color": curLevel.color }}>
          <div className="fp-stage-copy">
            <div className="fp-stage-title">
              {curLevel.emoji} 第 {activeLevel + 1} 階段：{curLevel.title}
            </div>
            <p>{guide?.intro}</p>
            <div className="fp-outcomes"><b>學完你可以做到：</b>{guide?.outcomes.map(item => <span key={item}>✓ {item}</span>)}</div>
          </div>
          <div className="fp-stage-count"><strong>{lvlDone}/{curLessons.length}</strong><span>本階段完成</span></div>
        </div>

        <div style={{ display: "grid", gap: 11, gridTemplateColumns: cols, marginBottom: 18 }}>
          {curLessons.map(lesson => (
            <BeginnerLessonCard key={lesson.id} lesson={lesson} color={curLevel.color}
              isCompleted={completedIds.has(lesson.id)}
              isSelected={selectedLesson?.id === lesson.id}
              onSelect={handleSelectLesson} />
          ))}
        </div>

        {/* Level navigation */}
        <div style={{ display: "flex", gap: 8 }}>
          {activeLevel > 0 && (
            <button onClick={() => { setActiveLevel(activeLevel - 1); setSelectedLesson(null); }}
              style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: "1px solid var(--border)",
                background: "var(--panel)", color: "var(--text-muted)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
              ← {visibleLevels[activeLevel - 1].emoji} {visibleLevels[activeLevel - 1].title}
            </button>
          )}
          {activeLevel < visibleLevels.length - 1 && (
            <button onClick={() => { setActiveLevel(activeLevel + 1); setSelectedLesson(null); }}
              style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: "none",
                background: `linear-gradient(135deg, ${visibleLevels[activeLevel + 1].color}bb, ${visibleLevels[activeLevel + 1].color})`,
                color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
              {visibleLevels[activeLevel + 1].emoji} {visibleLevels[activeLevel + 1].title} →
            </button>
          )}
        </div>
      </div>
    );
  }

  function renderChartMode() {
    const phonemes = LESSONS.filter(l => l.type === "phoneme" || l.type === "combo");
    return (
      <div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
          {phonemes.length} 個音標 · 點擊任意卡片查看詳解
        </div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(235px, 1fr))" }}>
          {phonemes.map(lesson => {
            const lv = LEVELS.find(l => l.id === lesson.levelId);
            return (
              <LessonCard key={lesson.id} lesson={lesson} color={lv?.color || "#6366f1"}
                isCompleted={completedIds.has(lesson.id)}
                isSelected={selectedLesson?.id === lesson.id}
                onSelect={handleSelectLesson} onComplete={toggleComplete} />
            );
          })}
        </div>
      </div>
    );
  }

  const detailColor = selectedLesson ? (LEVELS.find(l => l.id === selectedLesson.levelId)?.color || "#6366f1") : "#6366f1";

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bg)", color: "var(--text)", overflow: "hidden" }}>
      <style>{`
        .fp-body::-webkit-scrollbar{width:5px;height:5px}.fp-body::-webkit-scrollbar-thumb{background:var(--border);border-radius:99px}
        .fp-track-switch{display:flex;background:var(--panel-alt);border-radius:12px;padding:4px;gap:4px}.fp-track-switch button{padding:7px 12px;border-radius:9px;border:0;background:transparent;color:var(--text-faint);cursor:pointer;font-size:11px;font-weight:650}.fp-track-switch button.is-active{background:var(--panel);color:var(--text);box-shadow:0 3px 12px rgba(0,0,0,.12)}
        .fp-unit-nav{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px;padding:12px 18px;border-bottom:1px solid var(--border);background:var(--panel-alt)}.fp-unit-button{min-width:0;display:flex;align-items:center;gap:10px;padding:11px 12px;border-radius:14px;border:1px solid var(--border);background:var(--panel);color:var(--text-faint);cursor:pointer;text-align:left;transition:transform .18s,box-shadow .18s,border-color .18s}.fp-unit-button:hover{transform:translateY(-2px)}.fp-unit-button.is-active{border-color:color-mix(in srgb,var(--unit-color) 65%,var(--border));background:color-mix(in srgb,var(--unit-color) 12%,var(--panel));box-shadow:0 8px 24px color-mix(in srgb,var(--unit-color) 14%,transparent);color:var(--unit-color)}.fp-unit-number{width:28px;height:28px;display:grid;place-items:center;flex:none;border-radius:9px;background:color-mix(in srgb,var(--unit-color) 13%,transparent);font-weight:900}.fp-unit-copy{min-width:0}.fp-unit-copy b{display:block;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fp-unit-copy small{display:block;margin-top:2px;font-size:9px;color:var(--text-faint)}
        .fp-stage-intro{display:flex;justify-content:space-between;gap:22px;margin-bottom:18px;padding:22px;border:1px solid color-mix(in srgb,var(--lesson-color) 32%,transparent);border-radius:20px;background:linear-gradient(135deg,color-mix(in srgb,var(--lesson-color) 15%,var(--panel)),var(--panel));box-shadow:0 16px 40px rgba(0,0,0,.12)}
        .fp-stage-copy{max-width:760px}.fp-stage-title{font-size:22px;font-weight:900;color:var(--lesson-color)}.fp-stage-copy p{margin:9px 0 14px;line-height:1.75;color:var(--text-muted);font-size:14px}
        .fp-outcomes{display:flex;gap:8px;flex-wrap:wrap}.fp-outcomes b{width:100%;font-size:12px}.fp-outcomes span{font-size:11px;padding:6px 9px;border-radius:99px;background:rgba(16,185,129,.1);color:#34d399}
        .fp-stage-count{min-width:100px;align-self:center;text-align:center;padding:14px;border-radius:16px;background:rgba(255,255,255,.04)}.fp-stage-count strong{display:block;font-size:24px;color:var(--lesson-color)}.fp-stage-count span{font-size:10px;color:var(--text-faint)}
        .fp-course-card{width:100%;padding:0;text-align:left;color:var(--text);background:linear-gradient(145deg,var(--panel),color-mix(in srgb,var(--lesson-color) 7%,var(--panel)));border:1px solid color-mix(in srgb,var(--lesson-color) 24%,var(--border));border-radius:20px;overflow:hidden;cursor:pointer;transition:transform .2s,box-shadow .2s,border-color .2s}.fp-course-card:hover{transform:translateY(-3px);border-color:color-mix(in srgb,var(--lesson-color) 55%,var(--border));box-shadow:0 16px 36px color-mix(in srgb,var(--lesson-color) 16%,transparent)}.fp-course-card.is-selected{box-shadow:0 0 0 2px color-mix(in srgb,var(--lesson-color) 45%,transparent)}
        .fp-card-top{display:flex;gap:14px;align-items:center;padding:20px 20px 10px}.fp-symbol{font-family:monospace;font-size:30px;font-weight:900;color:var(--lesson-color);min-width:56px}.fp-card-heading{flex:1}.fp-card-heading h3{font-size:18px;margin:2px 0}.fp-eyebrow{font-size:10px;color:var(--lesson-color);font-weight:800;letter-spacing:.5px}.fp-status{font-size:10px;padding:6px 9px;border-radius:99px;background:color-mix(in srgb,var(--lesson-color) 12%,transparent);color:var(--lesson-color)}.fp-status.done{background:rgba(16,185,129,.12);color:#34d399}
        .fp-card-what{margin:4px 20px 12px;font-size:13px;line-height:1.7;color:var(--text-muted)}.fp-when{margin:0 20px 15px;padding:11px 13px;border-radius:12px;background:rgba(96,165,250,.07);display:flex;flex-direction:column;gap:4px}.fp-when b{font-size:11px;color:#60a5fa}.fp-when span{font-size:12px;line-height:1.55}
        .fp-flow{display:flex;align-items:stretch;gap:7px;overflow-x:auto;padding:4px}.fp-flow-step{position:relative;min-width:100px;flex:1;padding:9px 10px;border-radius:10px;background:rgba(255,255,255,.035)}.fp-flow-step small{display:block;color:var(--text-faint);font-size:9px;margin-bottom:4px}.fp-flow-step strong{display:block;font-size:11px;line-height:1.45}.fp-flow-arrow{position:absolute;right:-7px;top:50%;transform:translateY(-50%);color:var(--lesson-color);z-index:1}.fp-course-card .fp-flow{margin:0 16px 16px}.fp-card-footer{display:flex;justify-content:space-between;gap:12px;padding:13px 20px;border-top:1px solid var(--border);font-size:10px;color:var(--text-faint)}.fp-card-footer strong{color:var(--lesson-color);white-space:nowrap}
        .fp-detail-shell{height:100%;display:flex;flex-direction:column;background:var(--panel)}.fp-detail-header{display:flex;justify-content:space-between;align-items:center;padding:18px 20px;border-bottom:1px solid var(--border)}.fp-detail-header span{font-size:10px;color:var(--text-faint);letter-spacing:.6px}.fp-detail-header h2{font-size:22px;margin:3px 0 0}.fp-detail-header button{border:1px solid var(--border);background:var(--panel-alt);color:var(--text-muted);border-radius:10px;padding:7px 11px;cursor:pointer}.fp-detail-scroll{overflow:auto;padding:18px 20px 30px}
        .fp-purpose{display:grid;gap:12px;padding:16px;border:1px solid;border-radius:16px;background:rgba(99,102,241,.05);margin-bottom:14px}.fp-purpose small{color:#a78bfa;font-weight:800}.fp-purpose p{font-size:13px;line-height:1.7;margin:5px 0 0}.fp-chip-row{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}.fp-chip-row span{padding:4px 8px;border-radius:99px;background:rgba(167,139,250,.1);color:#c4b5fd;font-size:11px}
        .fp-training-block{padding:14px;border-radius:15px;border:1px solid var(--border);background:var(--panel-alt);margin-bottom:12px}.fp-training-block h3,.fp-error-block h3{font-size:12px;margin:0 0 11px;color:var(--text-muted)}.fp-audio-order{display:flex;gap:7px;flex-wrap:wrap;align-items:center}.fp-audio-note{font-size:10px;color:var(--text-faint);padding:7px 10px;border:1px dashed var(--border);border-radius:9px}.fp-mouth-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.fp-mouth-grid .fp-info-block{margin-bottom:12px!important}.fp-two-column{display:grid;grid-template-columns:1fr 1fr;gap:12px}.fp-spelling-list{display:grid;gap:7px}.fp-spelling-row{display:grid;grid-template-columns:45px 1fr auto;align-items:center;gap:7px;padding:7px;border-radius:9px;background:rgba(255,255,255,.035)}.fp-spelling-list strong{color:#a78bfa;font-size:15px}.fp-spelling-list span{font-size:11px;color:var(--text-muted)}
        .fp-syllable-grid,.fp-word-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.fp-syllable-row,.fp-word-row{display:flex;align-items:center;gap:5px;flex-wrap:wrap;padding:8px;border-radius:9px;background:rgba(255,255,255,.035)}.fp-syllable-grid b,.fp-word-grid strong{min-width:42px;color:#c4b5fd}.fp-sound-mark{padding:1px 2px;border-radius:4px;background:color-mix(in srgb,var(--lesson-color) 22%,transparent);color:var(--lesson-color)}.fp-syllable-grid small{font-size:9px;color:#d97706}.fp-word-grid{grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}.fp-sentence-block p{font-size:16px;font-weight:750;color:#5eead4}.fp-sentence-actions{display:flex;gap:7px;flex-wrap:wrap}.fp-error-block{padding:14px;border-radius:15px;background:rgba(245,158,11,.07);border:1px solid rgba(245,158,11,.22);margin-bottom:12px}.fp-error-block h3,.fp-error-block p{color:#fbbf24}.fp-error-block p{font-size:12px;line-height:1.7;margin:0}
        .fp-ready-check{padding:16px;border-radius:16px;background:rgba(16,185,129,.07);border:1px solid rgba(16,185,129,.22)}.fp-ready-check h4{margin:0 0 8px;font-size:12px;color:#34d399}.fp-ready-check ul{display:grid;grid-template-columns:1fr 1fr;gap:5px 18px;padding-left:18px;font-size:11px;line-height:1.6}.fp-ready-check p{font-size:10px;color:#fbbf24}.fp-ready-check button{width:100%;border:0;border-radius:11px;padding:10px;font-weight:800;cursor:pointer}
        @media(max-width:900px){.fp-mouth-grid{grid-template-columns:1fr}.fp-two-column{grid-template-columns:1fr}.fp-stage-intro{padding:17px}.fp-stage-title{font-size:19px}.fp-unit-nav{overflow-x:auto;display:flex}.fp-unit-button{min-width:175px}}
        @media(max-width:680px){.fp-track-switch button{padding:7px 9px}.fp-unit-nav{padding:9px 12px}.fp-unit-button{min-width:164px}.fp-stage-intro{flex-direction:column;gap:10px}.fp-stage-count{align-self:stretch}.fp-card-top{align-items:flex-start;padding:16px 15px 8px}.fp-symbol{font-size:25px;min-width:44px}.fp-status{display:none}.fp-card-what,.fp-when{margin-left:15px;margin-right:15px}.fp-course-card .fp-flow{margin-left:11px;margin-right:11px}.fp-flow-step{min-width:115px}.fp-card-footer{padding:12px 15px}.fp-card-footer span{display:none}.fp-detail-scroll{padding:14px}.fp-syllable-grid,.fp-ready-check ul{grid-template-columns:1fr}.fp-detail-header{padding:14px}.fp-detail-header h2{font-size:19px}}
        .fpb-hero{display:flex;gap:16px;align-items:center;padding:18px;border-radius:18px;border:1px solid;margin-bottom:16px;background:rgba(0,0,0,0.06)}.fpb-hero-symbol{font-family:monospace;font-size:44px;font-weight:900;flex-shrink:0;min-width:64px;text-align:center;line-height:1}.fpb-hero p{margin:0;font-size:14px;line-height:1.7;color:var(--text-muted)}
        .fpb-section{padding:16px 18px;border-radius:16px;border:1px solid var(--border);background:var(--panel-alt);margin-bottom:14px}.fpb-step-label{font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:12px}.fpb-step-text{font-size:13px;line-height:1.85;color:var(--text-muted);margin:0}
        .fpb-mouth-row{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.fpb-mouth-chip{padding:13px 11px;border-radius:12px;background:rgba(255,255,255,0.04);text-align:center}.fpb-mouth-chip span{font-size:22px;display:block;margin-bottom:6px}.fpb-mouth-chip b{font-size:12px;display:block;margin-bottom:5px;color:var(--text);font-weight:800}.fpb-mouth-chip p{font-size:11px;color:var(--text-muted);margin:0;line-height:1.55}
        .fpb-big-btns{display:flex;gap:9px;flex-wrap:wrap}
        .fpb-flow-list{display:flex;flex-direction:column;gap:7px}.fpb-flow-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:9px 12px;border-radius:10px;background:rgba(255,255,255,0.03)}.fpb-flow-tag{font-size:9px;font-weight:800;color:var(--text-faint);min-width:28px;flex-shrink:0;text-transform:uppercase;letter-spacing:0.4px}.fpb-flow-content{flex:1;font-size:14px;color:var(--text);min-width:60px}.fpb-flow-sentence{background:rgba(15,118,110,0.08);border:1px solid rgba(15,118,110,0.2)}
        .fpb-vocab-card{display:flex;align-items:center;gap:12px;padding:11px 14px;border-radius:12px;background:var(--panel);border:1px solid;margin-bottom:8px}.fpb-vocab-btns{display:flex;gap:6px;flex-shrink:0}
        @media(max-width:680px){.fpb-hero{flex-direction:column;text-align:center;padding:14px}.fpb-mouth-row{grid-template-columns:1fr}.fpb-vocab-card{flex-wrap:wrap}.fpb-vocab-btns{width:100%;justify-content:flex-start}}
      `}</style>

      {/* ── Header ── */}
      <div style={{ padding: "10px 20px 8px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <button onClick={() => onNav ? onNav("home") : window.history.back()}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 14, color: "var(--text-faint)" }}>←</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: "var(--text)" }}>法語發音入門</span>
          </button>
          <div className="fp-track-switch">
            {[["foundation","核心路線"],["extension","進階銜接"]].map(([value, label]) => (
              <button key={value} className={track === value ? "is-active" : ""}
                onClick={() => { setTrack(value); setActiveLevel(0); setSelectedLesson(null); }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: "var(--text-faint)" }}>0 基礎發音訓練路線 · {doneCount}/{totalCount} 完成（{pct}%）</span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: "var(--border)" }}>
              <div style={{ height: "100%", borderRadius: 2, background: "#6366f1", width: `${pct}%`, transition: "width .3s" }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Level tabs ── */}
        <div className="fp-unit-nav fp-body">
          {visibleLevels.map((lvl, i) => {
            const lvlLessons = LESSONS.filter(l => l.levelId === lvl.id);
            const lvlDone = lvlLessons.filter(l => completedIds.has(l.id)).length;
            const isActive = i === activeLevel;
            return (
              <button key={lvl.id} className={`fp-unit-button${isActive ? " is-active" : ""}`}
                style={{ "--unit-color": lvl.color }} onClick={() => { setActiveLevel(i); setSelectedLesson(null); }}>
                <span className="fp-unit-number">{lvl.emoji}</span>
                <span className="fp-unit-copy"><b>{lvl.level}. {lvl.title}</b><small>{lvlDone}/{lvlLessons.length} 課完成</small></span>
              </button>
            );
          })}
        </div>

      {/* ── Content + Detail Panel ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        {/* Cards area */}
        <div className="fp-body" style={{ flex: 1, overflowY: "auto", padding: "14px 18px" }}>
          {renderLevelContent()}
        </div>

        {/* Detail panel — desktop */}
        {selectedLesson && !isMobile && (
          <div className="fp-body"
            style={{ width: "min(54vw, 680px)", flexShrink: 0, borderLeft: "1px solid var(--border)", overflowY: "auto" }}>
            <BeginnerDetailPanel lesson={selectedLesson} color={detailColor}
              completedIds={completedIds} onComplete={toggleComplete}
              onClose={() => { stopPronunciationAudio(); setSelectedLesson(null); }} />
          </div>
        )}
      </div>

      {/* Detail panel — mobile bottom sheet */}
      {selectedLesson && isMobile && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200,
          maxHeight: "78vh", background: "var(--panel)", borderTop: "2px solid var(--border)",
          borderRadius: "18px 18px 0 0", overflow: "hidden", display: "flex", flexDirection: "column",
          boxShadow: "0 -10px 40px rgba(0,0,0,0.35)" }}>
          <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 0", flexShrink: 0 }}>
            <div style={{ width: 34, height: 4, borderRadius: 2, background: "var(--border)" }} />
          </div>
          <div className="fp-body" style={{ flex: 1, overflowY: "auto" }}>
            <BeginnerDetailPanel lesson={selectedLesson} color={detailColor}
              completedIds={completedIds} onComplete={toggleComplete}
              onClose={() => { stopPronunciationAudio(); setSelectedLesson(null); }} />
          </div>
        </div>
      )}
    </div>
  );
}
