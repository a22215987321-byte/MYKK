import { useState, useEffect, useRef } from "react";
import { AudioButton, RepeatButton as RepeatBtn, TeacherButton, stopPronunciationAudio } from "./PronunciationAudio";

const LEVELS = [
  { id: "basics",    title: "基本概念",    emoji: "📌", color: "#64748b" },
  { id: "short-v",   title: "短母音",      emoji: "🔵", color: "#6366f1" },
  { id: "long-v",    title: "長母音",      emoji: "🔴", color: "#dc2626" },
  { id: "diphthong", title: "雙母音",      emoji: "🟣", color: "#7c3aed" },
  { id: "voicing",   title: "清濁子音",    emoji: "⚡", color: "#d97706" },
  { id: "fricative", title: "摩擦音",      emoji: "💨", color: "#0891b2" },
  { id: "affricate", title: "破擦音",      emoji: "💥", color: "#b45309" },
  { id: "nasal-l",   title: "鼻音與邊音",  emoji: "👃", color: "#059669" },
  { id: "special",   title: "r / l / th",  emoji: "🎯", color: "#ec4899" },
  { id: "rhythm",    title: "重音與跟讀",  emoji: "🎤", color: "#0f766e" },
];

function mkA() {
  return {
    phonemeUrl:       null,
    phonemeRepeatUrl: null,
    wordNormalUrl:    null,
    wordSlowUrl:      null,
    teacherAudioUrl:  null,
    repeatAudioUrl:   null,
  };
}

const LESSONS = [
  // ── 1. 基本概念 ──────────────────────────────────
  { id: "b1", levelId: "basics", type: "concept",
    symbol: "A ≠ /æ/", titleZh: "字母不等於發音",
    exampleWord: "cat / name / city",  exampleMeaningZh: "a 在三個字裡讀三種音",
    mouthTipZh: "同一個字母在不同單字裡讀音不同，要靠音標和拼讀規律。",
    commonMistakeZh: "不要每個 a 都讀「啊」——name 的 a 讀 /eɪ/，city 的 i 讀 /ɪ/。",
    teacherScriptZh: "同學你好！英語最重要的觀念是：字母不等於發音。字母 a 在 cat 裡讀短母音 /æ/，在 name 裡讀雙母音 /eɪ/，在 father 裡讀長母音 /ɑː/。所以要學音標和拼讀規律，不要靠字母猜讀音。",
    examples: [{ word: "cat", meaningZh: "貓 /æ/", tts: "cat" }, { word: "name", meaningZh: "名字 /eɪ/", tts: "name" }, { word: "city", meaningZh: "城市 /ɪ/", tts: "city" }],
    audio: mkA() },

  { id: "b2", levelId: "basics", type: "concept",
    symbol: "母音 vs 子音", titleZh: "母音和子音的分別",
    exampleWord: "apple / book",  exampleMeaningZh: "母音靠嘴形，子音靠阻擋",
    mouthTipZh: "母音：氣流自由通過口腔，靠嘴形和舌位決定音色。",
    commonMistakeZh: "英語有 20 個母音（含雙母音）和 24 個子音，比中文複雜。",
    teacherScriptZh: "母音和子音是最基本的分類。母音發音時，氣流自由通過口腔，主要靠嘴形和舌頭位置決定音色，例如 /æ/、/iː/、/ʌ/。子音發音時，氣流在口腔某個位置受到阻擋或摩擦，例如 /p/ 雙唇閉合、/s/ 舌齒摩擦。",
    examples: [{ word: "apple", meaningZh: "蘋果（母音開頭）", tts: "apple" }, { word: "book", meaningZh: "書（子音開頭）", tts: "book" }],
    audio: mkA() },

  { id: "b3", levelId: "basics", type: "concept",
    symbol: "清音 / 濁音", titleZh: "聲帶有沒有振動",
    exampleWord: "p vs b / f vs v",  exampleMeaningZh: "清音無振動，濁音有振動",
    mouthTipZh: "用手輕按喉嚨，濁音能感覺到振動，清音感覺不到。",
    commonMistakeZh: "中文用氣流強弱（送氣/不送氣）區分，英語用聲帶振動區分——概念不同。",
    teacherScriptZh: "英語子音最重要的分類是清音和濁音。清音：聲帶不振動，如 /p/、/t/、/k/、/f/、/s/。濁音：聲帶振動，如 /b/、/d/、/g/、/v/、/z/。用手輕按喉嚨說「sss」再說「zzz」，能感覺到 zzz 有振動，那就是濁音。",
    examples: [{ word: "pin", meaningZh: "別針（清 /p/）", tts: "pin" }, { word: "bin", meaningZh: "垃圾桶（濁 /b/）", tts: "bin" }],
    audio: mkA() },

  { id: "b4", levelId: "basics", type: "concept",
    symbol: "嘴形・舌位・氣流", titleZh: "發音的三個關鍵",
    exampleWord: "see / too / her",  exampleMeaningZh: "三個音，三種嘴形",
    mouthTipZh: "每張發音卡片都會告訴你嘴唇、舌頭、氣流三個位置。",
    commonMistakeZh: "很多人只靠「聽」來模仿，不了解發音機制，難以糾正固定錯誤。",
    teacherScriptZh: "學英語發音要同時注意三個要素：第一是嘴形，嘴唇的形狀和開合程度；第二是舌位，舌頭在口腔裡的前後高低；第三是氣流，氣從哪裡出去、有沒有摩擦。每張卡片都會說明這三點，幫你準確複製每個音。",
    examples: [{ word: "see", meaningZh: "看（嘴角拉開）", tts: "see" }, { word: "too", meaningZh: "也（嘴唇圓噘）", tts: "too" }, { word: "her", meaningZh: "她的（嘴唇中立）", tts: "her" }],
    audio: mkA() },

  // ── 2. 短母音 ──────────────────────────────────
  { id: "sv-i", levelId: "short-v", type: "phoneme",
    symbol: "/ɪ/", titleZh: "短 i（sit）",
    exampleWord: "sit", exampleMeaningZh: "坐",
    mouthTipZh: "嘴角微拉，嘴巴半開，比長音 /iː/ 放鬆得多。",
    tongueTipZh: "舌頭在前方偏高，但不像 /iː/ 那樣緊張。",
    airflowTipZh: "氣流短促，音不要拖長。",
    commonMistakeZh: "不要讀成長音 /iː/。sit ≠ seat，bit ≠ beat，注意長短差別。",
    teacherScriptZh: "短母音 /ɪ/ 是英語最常用的母音之一。嘴角微拉，嘴巴半開，舌頭在前方偏高但放鬆。比長音 /iː/ 短促得多，不要拖長。sit、bit、ship、big 都用這個音。中文用戶常把 sit 讀成 seat，注意要放鬆舌頭，音要短促。",
    examples: [{ word: "sit", meaningZh: "坐", tts: "sit" }, { word: "big", meaningZh: "大", tts: "big" }, { word: "ship", meaningZh: "船", tts: "ship" }],
    audio: mkA() },

  { id: "sv-e", levelId: "short-v", type: "phoneme",
    symbol: "/e/", titleZh: "短 e（bed）",
    exampleWord: "bed", exampleMeaningZh: "床",
    mouthTipZh: "嘴巴中等開口，比 /ɪ/ 更開，嘴角稍拉。",
    tongueTipZh: "舌頭在前方中位，不高不低。",
    airflowTipZh: "氣流穩定，短促乾淨。",
    commonMistakeZh: "不要讀成中文的「誒」，/e/ 更短促、更前。",
    teacherScriptZh: "短母音 /e/ 類似中文「誒」但更短促。嘴巴中等開口，嘴角稍微拉開，舌頭在口腔前方中位。bed、red、left、friend 都用這個音。注意不要拖長，也不要讀成 /æ/（嘴巴太開）。",
    examples: [{ word: "bed", meaningZh: "床", tts: "bed" }, { word: "red", meaningZh: "紅", tts: "red" }, { word: "left", meaningZh: "左", tts: "left" }],
    audio: mkA() },

  { id: "sv-ae", levelId: "short-v", type: "phoneme",
    symbol: "/æ/", titleZh: "短 a（cat）★",
    exampleWord: "cat", exampleMeaningZh: "貓",
    mouthTipZh: "嘴巴大開，比 /e/ 更開更低，下巴放低。",
    tongueTipZh: "舌頭在前方低位，舌面略微隆起。",
    airflowTipZh: "氣流直接從口腔前方出去。",
    commonMistakeZh: "不要讀成「啊」/ɑː/（嘴更靠後），也不要讀成 /e/（嘴開得不夠）。",
    teacherScriptZh: "短母音 /æ/ 是英語特有的音，中文沒有。嘴巴要大開，比說「誒」時再開一點，下巴放低。cat、map、apple、hand 都用這個音。中文用戶常讀成「卡特」的「啊」，或者讀成 /e/，要特別注意嘴巴要開、舌頭要往前往低。",
    examples: [{ word: "cat", meaningZh: "貓", tts: "cat" }, { word: "map", meaningZh: "地圖", tts: "map" }, { word: "apple", meaningZh: "蘋果", tts: "apple" }],
    audio: mkA() },

  { id: "sv-ʌ", levelId: "short-v", type: "phoneme",
    symbol: "/ʌ/", titleZh: "短 u（cup）",
    exampleWord: "cup", exampleMeaningZh: "杯子",
    mouthTipZh: "嘴巴中等開口，嘴唇放鬆自然，不要圓唇。",
    tongueTipZh: "舌頭在口腔後方偏低位，放鬆。",
    airflowTipZh: "氣流從口腔後方出去，短促。",
    commonMistakeZh: "不要讀成 /uː/（嘴唇不要圓）。cup 不是「酷普」，嘴唇要平。",
    teacherScriptZh: "短母音 /ʌ/ 出現在很多常用字裡，如 cup、sun、love、come。嘴巴中等開口，嘴唇放鬆不要圓，舌頭在口腔後方偏低。中文用戶常把它讀成 /uː/ 或 /u/，記住嘴唇不要圓、不要噘。",
    examples: [{ word: "cup", meaningZh: "杯子", tts: "cup" }, { word: "sun", meaningZh: "太陽", tts: "sun" }, { word: "love", meaningZh: "愛", tts: "love" }],
    audio: mkA() },

  { id: "sv-ɒ", levelId: "short-v", type: "phoneme",
    symbol: "/ɒ/", titleZh: "短 o（hot）",
    exampleWord: "hot", exampleMeaningZh: "熱",
    mouthTipZh: "嘴巴大開，下巴放低，嘴唇稍圓但不噘。",
    tongueTipZh: "舌頭在口腔後方低位，放鬆。",
    airflowTipZh: "氣流從口腔後方出去，短促。",
    commonMistakeZh: "英式 /ɒ/ 嘴巴要大開，不要讀成美式 /ɑː/（稍有差異）。",
    teacherScriptZh: "英式英語的短 /ɒ/ 出現在 hot、pot、dog、shop 等字。嘴巴大開，下巴放低，嘴唇稍稍帶圓形但不要刻意噘嘴。舌頭在口腔後方低位，音很短促。美式英語通常念成 /ɑː/，更靠後，嘴唇不圓。",
    examples: [{ word: "hot", meaningZh: "熱", tts: "hot" }, { word: "dog", meaningZh: "狗", tts: "dog" }, { word: "shop", meaningZh: "商店", tts: "shop" }],
    audio: mkA() },

  { id: "sv-ʊ", levelId: "short-v", type: "phoneme",
    symbol: "/ʊ/", titleZh: "短 oo（book）",
    exampleWord: "book", exampleMeaningZh: "書",
    mouthTipZh: "嘴唇稍圓，比長音 /uː/ 放鬆得多，不要用力噘嘴。",
    tongueTipZh: "舌頭在口腔後方偏高，但比 /uː/ 放鬆。",
    airflowTipZh: "氣流從後方圓唇出去，短促。",
    commonMistakeZh: "不要讀成長音 /uː/。book ≠ boo，足 ≠ food，要短促放鬆。",
    teacherScriptZh: "短母音 /ʊ/ 出現在 book、look、good、put 等字。嘴唇稍微圓一點，但比長音 /uː/ 放鬆得多，不要用力噘嘴。舌頭在後方偏高但放鬆。中文用戶常把 book 讀成 boo，要注意短促和放鬆。",
    examples: [{ word: "book", meaningZh: "書", tts: "book" }, { word: "look", meaningZh: "看", tts: "look" }, { word: "good", meaningZh: "好", tts: "good" }],
    audio: mkA() },

  { id: "sv-ə", levelId: "short-v", type: "phoneme",
    symbol: "/ə/", titleZh: "中性音 schwa ★",
    exampleWord: "about", exampleMeaningZh: "關於",
    mouthTipZh: "完全放鬆，嘴巴微開，是英語最弱、最模糊的母音。",
    tongueTipZh: "舌頭在口腔中央，完全不用力。",
    airflowTipZh: "氣流非常輕，若有若無。",
    commonMistakeZh: "非重音音節裡的 a/e/o/u 很多都念成 /ə/，不要清楚讀出原本字母的音。",
    teacherScriptZh: "Schwa /ə/ 是英語出現最頻繁的母音，但大多數人沒有意識到它的存在。它出現在非重音音節，聲音非常輕、模糊。about 的第一個 a、banana 的兩個 a、teacher 的 er，都是 /ə/。掌握 schwa 能讓你英語聽起來更自然。",
    examples: [{ word: "about", meaningZh: "關於", tts: "about" }, { word: "banana", meaningZh: "香蕉", tts: "banana" }, { word: "teacher", meaningZh: "老師", tts: "teacher" }],
    audio: mkA() },

  // ── 3. 長母音 ──────────────────────────────────
  { id: "lv-iː", levelId: "long-v", type: "phoneme",
    symbol: "/iː/", titleZh: "長 ee（see）",
    exampleWord: "see", exampleMeaningZh: "看",
    mouthTipZh: "嘴角往兩側拉開，像微笑，音要保持夠長夠穩。",
    tongueTipZh: "舌頭在前方高位，緊張地往上頂。",
    airflowTipZh: "氣流從口腔前方穿過，音調穩定不變形。",
    commonMistakeZh: "長音要保持穩定，不要變形成雙母音（像美語 yeah 那樣）。",
    teacherScriptZh: "長母音 /iː/ 出現在 see、tree、sleep、beach 等字。嘴角往兩側拉，像微笑，舌頭高位緊張，音要保持夠長夠穩。對比短音 /ɪ/：short /ɪ/ 在 sit，長 /iː/ 在 seat，長短差別很重要，會影響意思。",
    examples: [{ word: "see", meaningZh: "看", tts: "see" }, { word: "sleep", meaningZh: "睡覺", tts: "sleep" }, { word: "beach", meaningZh: "海灘", tts: "beach" }],
    audio: mkA() },

  { id: "lv-ɑː", levelId: "long-v", type: "phoneme",
    symbol: "/ɑː/", titleZh: "長 a（father）",
    exampleWord: "father", exampleMeaningZh: "父親",
    mouthTipZh: "嘴巴大開，下巴放低，嘴唇放鬆自然，音要長。",
    tongueTipZh: "舌頭在口腔後方低位，放鬆。",
    airflowTipZh: "氣流從口腔後方直接出去，穩定持續。",
    commonMistakeZh: "不要和短音 /æ/（cat）混淆：/ɑː/ 嘴巴靠後，/æ/ 舌頭靠前更低。",
    teacherScriptZh: "長母音 /ɑː/ 出現在 father、car、park、heart 等字。嘴巴大開，下巴放低，舌頭在口腔後方，音要保持長穩。美式英語的 hot、lot 也常念成這個音。不要和 /æ/ 混淆，/æ/ 舌頭更靠前更低。",
    examples: [{ word: "father", meaningZh: "父親", tts: "father" }, { word: "car", meaningZh: "車", tts: "car" }, { word: "park", meaningZh: "公園", tts: "park" }],
    audio: mkA() },

  { id: "lv-ɔː", levelId: "long-v", type: "phoneme",
    symbol: "/ɔː/", titleZh: "長 aw（talk）",
    exampleWord: "talk", exampleMeaningZh: "說話",
    mouthTipZh: "嘴唇稍圓，嘴巴中等開口，音要保持長穩。",
    tongueTipZh: "舌頭在口腔後方中位，稍微隆起。",
    airflowTipZh: "氣流從口腔後方通過圓形嘴唇出去。",
    commonMistakeZh: "不要讀成 /ɑː/（嘴唇不圓），/ɔː/ 嘴唇要稍微帶圓形。",
    teacherScriptZh: "長母音 /ɔː/ 出現在 talk、walk、law、door、more 等字。嘴唇稍微圓一點，嘴巴中等開口，音要長穩。注意 talk 和 walk 裡的 l 不念，直接念 /tɔːk/ 和 /wɔːk/。",
    examples: [{ word: "talk", meaningZh: "說話", tts: "talk" }, { word: "walk", meaningZh: "走路", tts: "walk" }, { word: "door", meaningZh: "門", tts: "door" }],
    audio: mkA() },

  { id: "lv-uː", levelId: "long-v", type: "phoneme",
    symbol: "/uː/", titleZh: "長 oo（blue）",
    exampleWord: "blue", exampleMeaningZh: "藍色",
    mouthTipZh: "嘴唇圓起來向前噘，像準備吹口哨，音要保持長穩。",
    tongueTipZh: "舌頭在口腔後方高位，緊張。",
    airflowTipZh: "氣流從後方通過圓形嘴唇出去，穩定持續。",
    commonMistakeZh: "不要和短音 /ʊ/（book）混淆：/uː/ 更長更緊，嘴唇更圓更前。",
    teacherScriptZh: "長母音 /uː/ 出現在 blue、food、room、school、move 等字。嘴唇用力圓起來向前噘，音要保持長穩。對比短音 /ʊ/：food /uː/ 比 good /ʊ/ 更長更緊，嘴唇更用力。",
    examples: [{ word: "blue", meaningZh: "藍色", tts: "blue" }, { word: "food", meaningZh: "食物", tts: "food" }, { word: "school", meaningZh: "學校", tts: "school" }],
    audio: mkA() },

  { id: "lv-ɜː", levelId: "long-v", type: "phoneme",
    symbol: "/ɜː/", titleZh: "長 er（bird）★",
    exampleWord: "bird", exampleMeaningZh: "鳥",
    mouthTipZh: "嘴唇中立，嘴巴稍開，音要長，嘴型不要變。",
    tongueTipZh: "舌頭在口腔中央，美式可略微捲舌，英式不捲。",
    airflowTipZh: "氣流從口腔中央穩定出去，長而穩定。",
    commonMistakeZh: "不要讀成「爾」（中文）——英語 /ɜː/ 沒有那麼強的捲舌音（英式）。",
    teacherScriptZh: "長母音 /ɜː/ 出現在 bird、girl、word、nurse、early 等字。嘴唇中立，嘴巴稍開，音要長穩。美式英語有略微捲舌，英式不捲。中文用戶常讀成「爾」，那個捲舌太強，英式 /ɜː/ 不捲舌，就像說一個很平的「哦爾」保持長穩。",
    examples: [{ word: "bird", meaningZh: "鳥", tts: "bird" }, { word: "girl", meaningZh: "女孩", tts: "girl" }, { word: "word", meaningZh: "字", tts: "word" }],
    audio: mkA() },

  // ── 4. 雙母音 ──────────────────────────────────
  { id: "di-eɪ", levelId: "diphthong", type: "phoneme",
    symbol: "/eɪ/", titleZh: "雙母音（day）",
    exampleWord: "day", exampleMeaningZh: "日子",
    mouthTipZh: "從 /e/ 的嘴形滑向 /ɪ/，嘴角慢慢收窄，一個流暢動作。",
    tongueTipZh: "舌頭從中位往前方高位滑動。",
    airflowTipZh: "氣流連續，不要中斷成兩個音。",
    commonMistakeZh: "不要讀成兩個分開的中文音「誒-衣」，要流暢滑動。",
    teacherScriptZh: "雙母音 /eɪ/ 出現在 day、name、late、eight 等字。從 /e/ 滑向 /ɪ/，整個過程流暢不中斷，嘴形在移動但氣流不停。不要讀成中文的「誒-衣」兩個音，是一個滑動的雙母音。",
    examples: [{ word: "day", meaningZh: "日子", tts: "day" }, { word: "name", meaningZh: "名字", tts: "name" }, { word: "late", meaningZh: "遲", tts: "late" }],
    audio: mkA() },

  { id: "di-aɪ", levelId: "diphthong", type: "phoneme",
    symbol: "/aɪ/", titleZh: "雙母音（my）",
    exampleWord: "my", exampleMeaningZh: "我的",
    mouthTipZh: "從大開的 /a/ 滑向 /ɪ/，嘴巴從大開慢慢收窄。",
    tongueTipZh: "舌頭從低位往前方高位滑動。",
    airflowTipZh: "氣流連續流動，主要重心在第一個音 /a/。",
    commonMistakeZh: "不要讀成中文「愛」——英語 /aɪ/ 的 a 更靠後，不要拆開。",
    teacherScriptZh: "雙母音 /aɪ/ 出現在 my、time、night、light 等字。從大開的 /a/ 流暢滑向 /ɪ/，第一個音 /a/ 是重心，更長更強。不要拆開讀，是一個流暢的滑動音。my、I、fly、sky 都是這個音。",
    examples: [{ word: "my", meaningZh: "我的", tts: "my" }, { word: "time", meaningZh: "時間", tts: "time" }, { word: "night", meaningZh: "夜晚", tts: "night" }],
    audio: mkA() },

  { id: "di-ɔɪ", levelId: "diphthong", type: "phoneme",
    symbol: "/ɔɪ/", titleZh: "雙母音（boy）",
    exampleWord: "boy", exampleMeaningZh: "男孩",
    mouthTipZh: "從圓唇的 /ɔ/ 滑向 /ɪ/，嘴唇從圓形慢慢展開。",
    tongueTipZh: "舌頭從後方中位往前方高位滑動。",
    airflowTipZh: "氣流連續，重心在第一個音 /ɔ/。",
    commonMistakeZh: "不要讀成中文「哦-衣」兩個音，要流暢滑動。",
    teacherScriptZh: "雙母音 /ɔɪ/ 出現在 boy、toy、oil、point 等字。從圓唇的 /ɔ/ 流暢滑向 /ɪ/，嘴唇從圓形展開，整個過程流暢。中文用戶容易讀成兩個分開的音，要練習流暢滑動。",
    examples: [{ word: "boy", meaningZh: "男孩", tts: "boy" }, { word: "toy", meaningZh: "玩具", tts: "toy" }, { word: "oil", meaningZh: "油", tts: "oil" }],
    audio: mkA() },

  { id: "di-əʊ", levelId: "diphthong", type: "phoneme",
    symbol: "/əʊ/", titleZh: "雙母音（go）",
    exampleWord: "go", exampleMeaningZh: "去",
    mouthTipZh: "從中性 /ə/ 滑向圓唇 /ʊ/，嘴唇慢慢收圓向前。",
    tongueTipZh: "舌頭從中央往後方高位滑動。",
    airflowTipZh: "氣流連續，嘴唇在移動過程中慢慢圓起。",
    commonMistakeZh: "美式英語念 /oʊ/，更強調圓唇；英式 /əʊ/ 從 schwa 開始。",
    teacherScriptZh: "雙母音 /əʊ/ 出現在 go、home、show、phone 等字。英式從中性 /ə/ 滑向圓唇 /ʊ/，美式念 /oʊ/ 稍有不同但都可以。不要讀成單一的「哦」，是一個從中性滑向圓唇的雙母音。",
    examples: [{ word: "go", meaningZh: "去", tts: "go" }, { word: "home", meaningZh: "家", tts: "home" }, { word: "show", meaningZh: "表演", tts: "show" }],
    audio: mkA() },

  { id: "di-aʊ", levelId: "diphthong", type: "phoneme",
    symbol: "/aʊ/", titleZh: "雙母音（now）",
    exampleWord: "now", exampleMeaningZh: "現在",
    mouthTipZh: "從大開的 /a/ 滑向圓唇 /ʊ/，嘴巴從大開慢慢收圓。",
    tongueTipZh: "舌頭從低位往後方高位滑動，同時嘴唇漸漸圓起。",
    airflowTipZh: "氣流連續，重心在第一個音 /a/。",
    commonMistakeZh: "不要讀成中文「啊-烏」兩個分開的音。",
    teacherScriptZh: "雙母音 /aʊ/ 出現在 now、how、out、down 等字。從大開的 /a/ 流暢滑向圓唇 /ʊ/，嘴巴從大開慢慢收圓，是一個連續的動作。now、cow、house、south 都是這個音。",
    examples: [{ word: "now", meaningZh: "現在", tts: "now" }, { word: "out", meaningZh: "外面", tts: "out" }, { word: "down", meaningZh: "下面", tts: "down" }],
    audio: mkA() },

  { id: "di-ɪə", levelId: "diphthong", type: "phoneme",
    symbol: "/ɪə/", titleZh: "雙母音（near）",
    exampleWord: "near", exampleMeaningZh: "靠近",
    mouthTipZh: "從 /ɪ/ 滑向中性 /ə/，嘴形從拉開到放鬆。",
    tongueTipZh: "舌頭從前方高位往中央滑動，放鬆。",
    airflowTipZh: "氣流連續，第二個音 /ə/ 非常輕。",
    commonMistakeZh: "不要讀成長音 /iː/，near 不是「nee」，後面要加輕 /ə/。",
    teacherScriptZh: "雙母音 /ɪə/ 出現在 near、here、ear、fear 等字。從 /ɪ/ 流暢滑向輕輕的 /ə/，第二個音非常輕。near、here、ear、idea 都是這個音。很多人把 near 讀成「nee」，忘記後面的 /ə/ 滑動。",
    examples: [{ word: "near", meaningZh: "靠近", tts: "near" }, { word: "here", meaningZh: "這裡", tts: "here" }, { word: "ear", meaningZh: "耳朵", tts: "ear" }],
    audio: mkA() },

  { id: "di-eə", levelId: "diphthong", type: "phoneme",
    symbol: "/eə/", titleZh: "雙母音（hair）",
    exampleWord: "hair", exampleMeaningZh: "頭髮",
    mouthTipZh: "從 /e/ 滑向中性 /ə/，嘴形從半開到放鬆。",
    tongueTipZh: "舌頭從前方中位往中央滑動。",
    airflowTipZh: "氣流連續，第二個音 /ə/ 非常輕。",
    commonMistakeZh: "不要讀成 /eɪ/（day），hair 不是 hey。",
    teacherScriptZh: "雙母音 /eə/ 出現在 hair、there、where、care 等字。從 /e/ 流暢滑向輕輕的 /ə/，第二個音非常輕。hair、there、where、fair、bear 都是這個音。",
    examples: [{ word: "hair", meaningZh: "頭髮", tts: "hair" }, { word: "where", meaningZh: "哪裡", tts: "where" }, { word: "care", meaningZh: "關心", tts: "care" }],
    audio: mkA() },

  { id: "di-ʊə", levelId: "diphthong", type: "phoneme",
    symbol: "/ʊə/", titleZh: "雙母音（tour）",
    exampleWord: "tour", exampleMeaningZh: "旅遊",
    mouthTipZh: "從圓唇 /ʊ/ 滑向中性 /ə/，嘴唇從圓形到放鬆。",
    tongueTipZh: "舌頭從後方高位往中央滑動。",
    airflowTipZh: "氣流連續，第二個音 /ə/ 非常輕。",
    commonMistakeZh: "現代英式英語中 /ʊə/ 正在和 /ɔː/ 合流，tour 有人念 /tɔː/。",
    teacherScriptZh: "雙母音 /ʊə/ 出現在 tour、sure、poor 等字。從圓唇 /ʊ/ 流暢滑向輕輕的 /ə/，嘴唇從圓形放鬆。注意現代英語中這個音正在變化，tour 有些人念 /tɔː/，兩種都可接受。",
    examples: [{ word: "tour", meaningZh: "旅遊", tts: "tour" }, { word: "sure", meaningZh: "確定", tts: "sure" }, { word: "poor", meaningZh: "貧窮", tts: "poor" }],
    audio: mkA() },

  // ── 5. 清濁子音 ──────────────────────────────────
  { id: "vd-pb", levelId: "voicing", type: "phoneme",
    symbol: "/p/ vs /b/", titleZh: "p / b 對比",
    exampleWord: "pin / bin", exampleMeaningZh: "別針 / 垃圾桶",
    mouthTipZh: "雙唇閉合爆破，/p/ 無振動送氣，/b/ 有振動少氣。",
    tongueTipZh: "舌頭不直接參與，雙唇是主要發音器官。",
    airflowTipZh: "/p/ 爆破後有明顯氣流（可用手感覺），/b/ 幾乎沒有。",
    commonMistakeZh: "字尾 /b/ 常被弱化或省略，最終聲帶振動是關鍵。",
    teacherScriptZh: "雙唇閉合爆破音 /p/ 和 /b/。/p/ 是清音：雙唇閉合後爆破，聲帶不振動，有明顯氣流，把手放在嘴前說 pin，能感覺到氣。/b/ 是濁音：聲帶振動，爆破前後都有振動感，氣流少。pin/bin、pan/ban、cup/cub 是最小對比。",
    examples: [{ word: "pin", meaningZh: "別針", tts: "pin" }, { word: "bin", meaningZh: "垃圾桶", tts: "bin" }, { word: "cup", meaningZh: "杯子（清p）", tts: "cup" }],
    audio: mkA() },

  { id: "vd-td", levelId: "voicing", type: "phoneme",
    symbol: "/t/ vs /d/", titleZh: "t / d 對比",
    exampleWord: "ten / den", exampleMeaningZh: "十 / 巢穴",
    mouthTipZh: "舌尖頂住上齒齦爆破，/t/ 清音送氣，/d/ 濁音少氣。",
    tongueTipZh: "舌尖輕觸上齒齦後方（不是牙齒），然後爆破。",
    airflowTipZh: "/t/ 爆破後有明顯氣流，/d/ 幾乎沒有。",
    commonMistakeZh: "字尾 /t/ 在美式英語中夾在母音之間會被閃音化，聽起來像 /d/（water）。",
    teacherScriptZh: "舌尖爆破音 /t/ 和 /d/。舌尖頂住上齒齦，然後爆破。/t/ 清音有氣流，/d/ 濁音有振動。ten/den、try/dry、bit/bid 是最小對比。美式英語 water、letter 的 t 夾在母音之間，發音像 /d/，這是美式特色。",
    examples: [{ word: "ten", meaningZh: "十", tts: "ten" }, { word: "den", meaningZh: "巢穴", tts: "den" }, { word: "try", meaningZh: "嘗試", tts: "try" }],
    audio: mkA() },

  { id: "vd-kg", levelId: "voicing", type: "phoneme",
    symbol: "/k/ vs /g/", titleZh: "k / g 對比",
    exampleWord: "coat / goat", exampleMeaningZh: "外套 / 山羊",
    mouthTipZh: "舌根頂住軟顎爆破，/k/ 清音送氣，/g/ 濁音少氣。",
    tongueTipZh: "舌根（不是舌尖）往上頂，在口腔後方閉合爆破。",
    airflowTipZh: "/k/ 爆破後有明顯氣流，/g/ 幾乎沒有。",
    commonMistakeZh: "字尾 /g/ 常被省略，如 bag 的 g 要輕輕發出。",
    teacherScriptZh: "軟顎爆破音 /k/ 和 /g/。舌根往後頂住軟顎，然後爆破。/k/ 清音有氣流：coat、sky、back。/g/ 濁音有振動：goat、game、big。coat/goat、back/bag 是最小對比。",
    examples: [{ word: "coat", meaningZh: "外套", tts: "coat" }, { word: "goat", meaningZh: "山羊", tts: "goat" }, { word: "back", meaningZh: "後面", tts: "back" }],
    audio: mkA() },

  { id: "vd-fv", levelId: "voicing", type: "phoneme",
    symbol: "/f/ vs /v/", titleZh: "f / v 對比",
    exampleWord: "fan / van", exampleMeaningZh: "扇子 / 廂型車",
    mouthTipZh: "上牙齒輕咬下唇，氣流通過縫隙。/f/ 清音，/v/ 濁音。",
    tongueTipZh: "舌頭不直接參與，上齒和下唇是主要發音器官。",
    airflowTipZh: "/f/ 純氣流摩擦，/v/ 氣流摩擦同時聲帶振動。",
    commonMistakeZh: "中文沒有 /v/，很多用戶把 very 念成 /f/。記住 /v/ 聲帶要振動。",
    teacherScriptZh: "唇齒摩擦音 /f/ 和 /v/。上牙齒輕輕咬住下唇，氣流通過縫隙。/f/ 清音：fan、fish、after，聲帶不振動。/v/ 濁音：van、very、love，聲帶振動，用手按喉嚨可以感覺到。中文沒有 /v/，要特別練習。",
    examples: [{ word: "fan", meaningZh: "扇子", tts: "fan" }, { word: "van", meaningZh: "廂型車", tts: "van" }, { word: "very", meaningZh: "非常", tts: "very" }],
    audio: mkA() },

  { id: "vd-sz", levelId: "voicing", type: "phoneme",
    symbol: "/s/ vs /z/", titleZh: "s / z 對比",
    exampleWord: "sip / zip", exampleMeaningZh: "小口喝 / 拉鏈",
    mouthTipZh: "舌尖靠近上齒齦但不接觸，氣流通過縫隙。/s/ 清音，/z/ 濁音。",
    tongueTipZh: "舌尖輕靠上齒齦內側，舌兩側和上顎接觸。",
    airflowTipZh: "/s/ 純氣流摩擦（嘶嘶聲），/z/ 加上聲帶振動（嗡嗡聲）。",
    commonMistakeZh: "複數 -s、第三人稱 -s 在母音和濁音後念 /z/，不是 /s/（dogs, plays）。",
    teacherScriptZh: "齒齦摩擦音 /s/ 和 /z/。/s/ 是清音，就是嘶嘶聲：see、sun、kiss。/z/ 是濁音，聲帶振動，像蜜蜂嗡嗡聲：zoo、zero、has。重要規則：複數 -s 和動詞 -s 在母音或濁音後念 /z/，不念 /s/：dogs、plays、goes 都是 /z/。",
    examples: [{ word: "sip", meaningZh: "小口喝", tts: "sip" }, { word: "zip", meaningZh: "拉鏈", tts: "zip" }, { word: "dogs", meaningZh: "狗們（z）", tts: "dogs" }],
    audio: mkA() },

  { id: "vd-ʃʒ", levelId: "voicing", type: "phoneme",
    symbol: "/ʃ/ vs /ʒ/", titleZh: "sh / zh 對比",
    exampleWord: "she / measure", exampleMeaningZh: "她 / 測量",
    mouthTipZh: "嘴唇稍微前噘，舌面靠近上顎。/ʃ/ 清音，/ʒ/ 濁音。",
    tongueTipZh: "舌面靠近硬顎前方，比 /s/ 和 /z/ 更靠後。",
    airflowTipZh: "/ʃ/ 純氣流摩擦（像 sh！靜音手勢），/ʒ/ 加上聲帶振動。",
    commonMistakeZh: "/ʒ/ 在英語裡很少出現，主要在 vision、measure、usual 等字。",
    teacherScriptZh: "後齒齦摩擦音 /ʃ/ 和 /ʒ/。/ʃ/ 是清音，就是「噓」安靜的聲音：she、shop、show、push。/ʒ/ 是濁音，聲帶振動：vision、measure、usual、genre。/ʒ/ 在英語裡比較少見，主要出現在從法語借來的詞。",
    examples: [{ word: "she", meaningZh: "她", tts: "she" }, { word: "show", meaningZh: "表演", tts: "show" }, { word: "vision", meaningZh: "視覺", tts: "vision" }],
    audio: mkA() },

  // ── 6. 摩擦音 ──────────────────────────────────
  { id: "fr-θ", levelId: "fricative", type: "phoneme",
    symbol: "/θ/", titleZh: "清 th（think）★",
    exampleWord: "think", exampleMeaningZh: "想",
    mouthTipZh: "舌尖輕放在上下牙齒之間，氣流通過，聲帶不振動。",
    tongueTipZh: "舌尖輕輕伸出到齒間，不要太用力，很輕柔。",
    airflowTipZh: "氣流從舌尖和牙齒之間通過，產生摩擦，嘶嘶聲。",
    commonMistakeZh: "不要讀成 /s/（think≠sink）或 /f/（three≠free）。舌尖要真的放在齒間。",
    teacherScriptZh: "清齒間摩擦音 /θ/ 是英語最有特色的音，很多語言都沒有。舌尖輕輕放在上下牙齒之間，氣流通過，聲帶不振動。think、three、through、bath、teeth 都是這個音。不要偷懶讀成 /s/ 或 /f/，舌尖要真的在齒間。",
    examples: [{ word: "think", meaningZh: "想", tts: "think" }, { word: "three", meaningZh: "三", tts: "three" }, { word: "bath", meaningZh: "洗澡", tts: "bath" }],
    audio: mkA() },

  { id: "fr-ð", levelId: "fricative", type: "phoneme",
    symbol: "/ð/", titleZh: "濁 th（this）★",
    exampleWord: "this", exampleMeaningZh: "這個",
    mouthTipZh: "舌尖輕放在齒間，氣流通過，同時聲帶振動。",
    tongueTipZh: "和 /θ/ 完全一樣的舌位，唯一差別是聲帶振動。",
    airflowTipZh: "氣流從舌尖和牙齒之間通過，聲帶同時振動（嗡嗡感）。",
    commonMistakeZh: "不要讀成 /d/（this≠dis）或 /z/。用手按喉嚨，要感覺到振動。",
    teacherScriptZh: "濁齒間摩擦音 /ð/ 和 /θ/ 嘴型完全一樣，唯一差別是聲帶振動。this、that、the、them、mother、father 都是這個音。這個音非常常用，尤其是冠詞 the 和代詞 this、that、they。不要讀成 /d/。",
    examples: [{ word: "this", meaningZh: "這個", tts: "this" }, { word: "the", meaningZh: "那個", tts: "the" }, { word: "mother", meaningZh: "母親", tts: "mother" }],
    audio: mkA() },

  { id: "fr-h", levelId: "fricative", type: "phoneme",
    symbol: "/h/", titleZh: "h 聲門音",
    exampleWord: "hello", exampleMeaningZh: "你好",
    mouthTipZh: "嘴巴微開，氣流從喉嚨直接出來，不要任何摩擦。",
    tongueTipZh: "舌頭根據後面母音的位置準備，/h/ 本身沒有舌位要求。",
    airflowTipZh: "氣流從聲門（聲帶處）摩擦出來，輕輕的哈氣。",
    commonMistakeZh: "有些詞的 h 是靜音：hour、honest、heir（不念 h）。",
    teacherScriptZh: "聲門摩擦音 /h/ 就是哈氣的聲音，嘴巴準備好後面母音的形狀，然後從喉嚨輕輕哈氣。hello、help、happy、behind 都是這個音。注意：hour 的 h 是靜音，念「aʊər」；honest 的 h 也不念。",
    examples: [{ word: "hello", meaningZh: "你好", tts: "hello" }, { word: "happy", meaningZh: "快樂", tts: "happy" }, { word: "hour", meaningZh: "小時（h靜音）", tts: "hour" }],
    audio: mkA() },

  { id: "fr-ʃ", levelId: "fricative", type: "phoneme",
    symbol: "/ʃ/", titleZh: "sh 音（she）",
    exampleWord: "she", exampleMeaningZh: "她",
    mouthTipZh: "嘴唇稍微前噘，舌面靠近硬顎，清音無振動。",
    tongueTipZh: "舌面（不是舌尖）靠近硬顎前方，比 /s/ 更靠後。",
    airflowTipZh: "氣流通過舌面和硬顎之間，像「噓」的聲音。",
    commonMistakeZh: "注意拼寫：sh（shop）、ti（nation）、ci（special）都念 /ʃ/。",
    teacherScriptZh: "後齒齦摩擦音 /ʃ/ 出現在很多不同拼寫裡。sh：she、shop、wish。ti：nation、education、station。ci：special、social。ss：pressure。ge/gi（法語借字）：genre。把這些拼寫都認出來，遇到就念 /ʃ/。",
    examples: [{ word: "she", meaningZh: "她", tts: "she" }, { word: "shop", meaningZh: "商店", tts: "shop" }, { word: "nation", meaningZh: "國家", tts: "nation" }],
    audio: mkA() },

  { id: "fr-v", levelId: "fricative", type: "phoneme",
    symbol: "/v/", titleZh: "v 音（very）",
    exampleWord: "very", exampleMeaningZh: "非常",
    mouthTipZh: "上牙齒輕咬下唇，氣流通過，聲帶振動（濁音）。",
    tongueTipZh: "舌頭不直接參與。",
    airflowTipZh: "氣流從上齒和下唇之間通過，聲帶同時振動。",
    commonMistakeZh: "中文沒有 /v/，絕對不要把 very 讀成 ferry 或 berry。",
    teacherScriptZh: "唇齒濁摩擦音 /v/——中文沒有這個音，要特別練習。上牙齒輕輕咬住下唇，然後讓氣流通過，同時聲帶振動。very、voice、love、live 都是這個音。練習：說「fff」（清音），然後加上聲帶振動就變成「vvv」（濁音）。",
    examples: [{ word: "very", meaningZh: "非常", tts: "very" }, { word: "voice", meaningZh: "聲音", tts: "voice" }, { word: "love", meaningZh: "愛", tts: "love" }],
    audio: mkA() },

  // ── 7. 破擦音 ──────────────────────────────────
  { id: "af-tʃ", levelId: "affricate", type: "phoneme",
    symbol: "/tʃ/", titleZh: "ch 音（chair）",
    exampleWord: "chair", exampleMeaningZh: "椅子",
    mouthTipZh: "舌尖頂住上齒齦，然後氣流爆破成 /ʃ/，清音。",
    tongueTipZh: "舌尖先接觸上齒齦（像 /t/），然後鬆開成 /ʃ/。",
    airflowTipZh: "先短暫阻擋，然後氣流摩擦爆破，有氣流感。",
    commonMistakeZh: "注意拼寫：ch（chair）、tch（watch）、t（nature）都念 /tʃ/。",
    teacherScriptZh: "破擦音 /tʃ/ 是 /t/ 加 /ʃ/ 的組合，舌尖先頂住上齒齦，然後爆破成 sh 音。chair、church、watch、chicken 都是這個音。拼寫有三種：ch（chair）、tch（watch）、t 接 u（nature）。",
    examples: [{ word: "chair", meaningZh: "椅子", tts: "chair" }, { word: "church", meaningZh: "教堂", tts: "church" }, { word: "watch", meaningZh: "手錶", tts: "watch" }],
    audio: mkA() },

  { id: "af-dʒ", levelId: "affricate", type: "phoneme",
    symbol: "/dʒ/", titleZh: "j / dge 音（judge）",
    exampleWord: "judge", exampleMeaningZh: "法官",
    mouthTipZh: "舌尖頂住上齒齦，然後氣流爆破成 /ʒ/，濁音聲帶振動。",
    tongueTipZh: "舌尖先接觸上齒齦（像 /d/），然後鬆開成 /ʒ/。",
    airflowTipZh: "先短暫阻擋，然後氣流摩擦爆破，聲帶全程振動。",
    commonMistakeZh: "注意拼寫：j（job）、ge/gi（age、gin）、dge（judge）都念 /dʒ/。",
    teacherScriptZh: "破擦音 /dʒ/ 是 /d/ 加 /ʒ/ 的組合，是 /tʃ/ 的濁音版。job、June、age、bridge、gym 都是這個音。拼寫有三種：j（job）、ge/gi（age、gin）、dge（judge、bridge）。聲帶全程振動，比 /tʃ/ 更有力。",
    examples: [{ word: "judge", meaningZh: "法官", tts: "judge" }, { word: "job", meaningZh: "工作", tts: "job" }, { word: "bridge", meaningZh: "橋", tts: "bridge" }],
    audio: mkA() },

  { id: "af-ts", levelId: "affricate", type: "phoneme",
    symbol: "/ts/ /dz/", titleZh: "字尾 -ts / -ds",
    exampleWord: "cats / beds", exampleMeaningZh: "貓們 / 床們",
    mouthTipZh: "字尾快速爆破然後摩擦，不要在末尾加母音。",
    tongueTipZh: "舌尖快速觸碰上齒齦然後釋放，整個動作很快。",
    airflowTipZh: "氣流短暫阻擋後快速爆破，/ts/ 清音，/dz/ 濁音。",
    commonMistakeZh: "不要在字尾加「斯」或「資」的母音，cats 不是「貓次」。",
    teacherScriptZh: "英語字尾的 /ts/ 和 /dz/ 非常常見，出現在複數和第三人稱。cats、nets、boots 念 /ts/；beds、birds、heads 念 /dz/。關鍵：字尾要乾淨，不要在後面加任何母音，cats 不是「貓次」，直接在 t 後面加清脆的 s。",
    examples: [{ word: "cats", meaningZh: "貓們", tts: "cats" }, { word: "beds", meaningZh: "床們", tts: "beds" }, { word: "boots", meaningZh: "靴子", tts: "boots" }],
    audio: mkA() },

  // ── 8. 鼻音與邊音 ──────────────────────────────────
  { id: "nl-m", levelId: "nasal-l", type: "phoneme",
    symbol: "/m/", titleZh: "m 雙唇鼻音",
    exampleWord: "man", exampleMeaningZh: "男人",
    mouthTipZh: "雙唇閉合，氣流從鼻腔通過，聲帶振動。",
    tongueTipZh: "舌頭不直接參與，雙唇閉合即可。",
    airflowTipZh: "氣流完全從鼻腔通過，口腔是閉合的。",
    commonMistakeZh: "字尾 /m/ 要保持雙唇閉合，不要在後面加任何母音。",
    teacherScriptZh: "雙唇鼻音 /m/ 非常簡單：雙唇閉合，聲帶振動，氣流從鼻腔出去。man、mom、time、dream 都是這個音。字尾 /m/ 要保持雙唇閉合狀態，不要在後面加任何多餘的母音，dream 是「driːm」，不是「driːmuh」。",
    examples: [{ word: "man", meaningZh: "男人", tts: "man" }, { word: "time", meaningZh: "時間", tts: "time" }, { word: "dream", meaningZh: "夢", tts: "dream" }],
    audio: mkA() },

  { id: "nl-n", levelId: "nasal-l", type: "phoneme",
    symbol: "/n/", titleZh: "n 齒齦鼻音",
    exampleWord: "no", exampleMeaningZh: "不",
    mouthTipZh: "舌尖頂住上齒齦，嘴巴微開，氣流從鼻腔通過。",
    tongueTipZh: "舌尖輕觸上齒齦，阻擋氣流，讓氣流從鼻腔通過。",
    airflowTipZh: "氣流完全從鼻腔通過，聲帶振動。",
    commonMistakeZh: "字尾 /n/ 要讓舌尖頂住上齒齦，不要在後面加母音（nun ≠「能啊」）。",
    teacherScriptZh: "齒齦鼻音 /n/ 出現在 no、sun、ten、open 等字。舌尖頂住上齒齦，氣流從鼻腔通過，聲帶振動。字尾 /n/ 要讓舌尖保持頂住狀態結束，不要在後面加任何母音。ten 是「ten」不是「ten-nuh」。",
    examples: [{ word: "no", meaningZh: "不", tts: "no" }, { word: "sun", meaningZh: "太陽", tts: "sun" }, { word: "ten", meaningZh: "十", tts: "ten" }],
    audio: mkA() },

  { id: "nl-ŋ", levelId: "nasal-l", type: "phoneme",
    symbol: "/ŋ/", titleZh: "ng 軟顎鼻音",
    exampleWord: "sing", exampleMeaningZh: "唱歌",
    mouthTipZh: "舌根頂住軟顎，氣流從鼻腔通過，嘴巴保持微開。",
    tongueTipZh: "舌根（不是舌尖）往後頂住軟顎，阻擋氣流。",
    airflowTipZh: "氣流完全從鼻腔通過，聲帶振動，類似「哼」的感覺。",
    commonMistakeZh: "ng 字尾只念 /ŋ/，不要在後面加 /g/（sing ≠「singk」）。",
    teacherScriptZh: "軟顎鼻音 /ŋ/ 出現在 sing、ring、think、bank 等字。舌根往後頂住軟顎，氣流從鼻腔通過。字尾 ng 只念 /ŋ/，不要在後面加 /g/——sing 不是「singk」。但 finger、longer 裡有 /g/，因為 ng 不在字尾。",
    examples: [{ word: "sing", meaningZh: "唱歌", tts: "sing" }, { word: "ring", meaningZh: "戒指", tts: "ring" }, { word: "think", meaningZh: "想", tts: "think" }],
    audio: mkA() },

  { id: "nl-l", levelId: "nasal-l", type: "phoneme",
    symbol: "/l/（clear）", titleZh: "清 l（light）",
    exampleWord: "light", exampleMeaningZh: "光",
    mouthTipZh: "舌尖頂住上齒齦，氣流從舌頭兩側通過，聲帶振動。",
    tongueTipZh: "舌尖輕觸上齒齦，舌中間不接觸上顎，讓氣流從兩側通過。",
    airflowTipZh: "氣流從舌頭左右兩側同時出去，這是邊音的特點。",
    commonMistakeZh: "字首 /l/ 是清 l，音較亮；字尾 /l/ 是暗 l（dark l），音質不同。",
    teacherScriptZh: "邊音 /l/ 出現在 light、long、blue、place 等字。舌尖輕觸上齒齦，氣流從舌頭兩側通過，聲帶振動。字首的 /l/ 是清亮的（clear l）；字尾的 /l/ 如 feel、ball 是暗沉的（dark l），下一張卡片詳細說明。",
    examples: [{ word: "light", meaningZh: "光", tts: "light" }, { word: "long", meaningZh: "長", tts: "long" }, { word: "blue", meaningZh: "藍色", tts: "blue" }],
    audio: mkA() },

  { id: "nl-dl", levelId: "nasal-l", type: "phoneme",
    symbol: "/l/（dark）", titleZh: "暗 l（feel / milk）",
    exampleWord: "feel", exampleMeaningZh: "感覺",
    mouthTipZh: "舌尖可以觸齒齦，但舌根同時往後往上縮，音質變暗。",
    tongueTipZh: "舌根往後抬起，形成兩個接觸點：舌尖在前（可有可無），舌根在後。",
    airflowTipZh: "氣流從舌頭兩側通過，但因舌根位置，音質更暗更圓。",
    commonMistakeZh: "中文沒有 dark l，feel、ball、milk 的字尾 l 不能省略，要有暗 l。",
    teacherScriptZh: "暗 l（dark l）出現在字尾或子音前：feel、ball、milk、help。舌根往後往上縮，音質比字首 l 更暗更圓。中文沒有這個音，很多用戶把字尾 l 省略，或者讀成很清亮的 l，都不自然。練習：feel 的最後要有暗沉的「歐」感覺的 l。",
    examples: [{ word: "feel", meaningZh: "感覺", tts: "feel" }, { word: "ball", meaningZh: "球", tts: "ball" }, { word: "milk", meaningZh: "牛奶", tts: "milk" }],
    audio: mkA() },

  // ── 9. r / l / th 特訓 ──────────────────────────────────
  { id: "sp-r", levelId: "special", type: "phoneme",
    symbol: "/r/", titleZh: "美式 r 音（red）★",
    exampleWord: "red", exampleMeaningZh: "紅色",
    mouthTipZh: "嘴唇稍微圓起，舌尖往後捲但不接觸上顎任何部位。",
    tongueTipZh: "舌尖往後上方捲起，舌頭兩側接觸上側牙齒，舌尖懸空。",
    airflowTipZh: "氣流從舌頭中間通過，帶有特有的「圓潤」音色。",
    commonMistakeZh: "不要讀成中文「日」（捲舌太強），也不要讀成英式 /r/（摩擦音）。",
    teacherScriptZh: "美式英語 /r/ 是很多中文用戶的難關。舌尖往後捲起但不接觸任何位置，懸浮在口腔後方，同時嘴唇稍微圓起。red、right、run、very、more 都有這個音。不要讀成中文「日」那樣強烈，也不要像法語 r 那樣喉音。",
    examples: [{ word: "red", meaningZh: "紅色", tts: "red" }, { word: "right", meaningZh: "對的", tts: "right" }, { word: "more", meaningZh: "更多", tts: "more" }],
    audio: mkA() },

  { id: "sp-rl", levelId: "special", type: "phoneme",
    symbol: "/r/ vs /l/", titleZh: "r / l 最小對比 ★",
    exampleWord: "right / light", exampleMeaningZh: "對的 / 光",
    mouthTipZh: "/r/ 舌尖捲後懸空；/l/ 舌尖輕觸上齒齦，氣流從兩側出去。",
    tongueTipZh: "/r/ 舌尖不接觸任何位置；/l/ 舌尖要接觸上齒齦。",
    airflowTipZh: "/r/ 氣流從中間通過；/l/ 氣流從舌頭兩側通過。",
    commonMistakeZh: "中文用戶最常見的問題：把 /r/ 讀成 /l/ 或把 /l/ 讀成 /r/。",
    teacherScriptZh: "r 和 l 的混淆是中文用戶最常見的問題。關鍵差別：/l/ 舌尖要碰到上齒齦，氣流從兩側出去；/r/ 舌尖往後捲，不碰任何東西，氣流從中間通過。練習最小對比：right/light、red/led、rice/lice、road/load。",
    examples: [{ word: "right", meaningZh: "對的（r）", tts: "right" }, { word: "light", meaningZh: "光（l）", tts: "light" }, { word: "rice", meaningZh: "米（r）", tts: "rice" }],
    audio: mkA() },

  { id: "sp-θð", levelId: "special", type: "phoneme",
    symbol: "/θ/ vs /ð/", titleZh: "th 清濁對比 ★",
    exampleWord: "think / this", exampleMeaningZh: "想 / 這個",
    mouthTipZh: "舌尖放在齒間，/θ/ 無振動（清），/ð/ 有振動（濁）。",
    tongueTipZh: "兩個音舌位完全一樣，唯一差別是聲帶振動與否。",
    airflowTipZh: "氣流從舌尖和牙齒之間通過，/θ/ 純氣流，/ð/ 加振動。",
    commonMistakeZh: "記憶：「this/that/the/they/them/those」全是 /ð/；think/three/both/mouth 是 /θ/。",
    teacherScriptZh: "這是一組非常重要的對比。清音 /θ/ 用在：think、three、thanks、both、mouth、teeth。濁音 /ð/ 用在：the、this、that、those、they、them、mother、father、breathe。超簡單記憶法：冠詞和代詞用 /ð/，其他多數用 /θ/。",
    examples: [{ word: "think", meaningZh: "想（清θ）", tts: "think" }, { word: "the", meaningZh: "那個（濁ð）", tts: "the" }, { word: "both", meaningZh: "兩者（清θ）", tts: "both" }],
    audio: mkA() },

  { id: "sp-w", levelId: "special", type: "phoneme",
    symbol: "/w/", titleZh: "w 半母音",
    exampleWord: "water", exampleMeaningZh: "水",
    mouthTipZh: "嘴唇圓起來向前噘（像準備說「烏」），然後迅速滑向後面的母音。",
    tongueTipZh: "舌頭在後方高位，然後快速移動到下一個母音位置。",
    airflowTipZh: "氣流連續，/w/ 本身是一個快速的滑動音。",
    commonMistakeZh: "不要讀成 /v/，/w/ 嘴唇圓噘，/v/ 是上齒咬下唇。",
    teacherScriptZh: "半母音 /w/ 就是快速的「烏」滑向後面母音。water、work、week、always、one 都有這個音。嘴唇先圓噘，然後迅速展開進入後面的母音。注意：/w/ 是雙唇圓噘，不是上齒咬下唇（那是 /v/）。",
    examples: [{ word: "water", meaningZh: "水", tts: "water" }, { word: "work", meaningZh: "工作", tts: "work" }, { word: "week", meaningZh: "星期", tts: "week" }],
    audio: mkA() },

  { id: "sp-j", levelId: "special", type: "phoneme",
    symbol: "/j/", titleZh: "y 半母音",
    exampleWord: "yes", exampleMeaningZh: "是",
    mouthTipZh: "從 /iː/ 的嘴形快速滑向後面的母音，嘴角先拉開然後移動。",
    tongueTipZh: "舌頭從前方高位快速移動到後面母音的位置。",
    airflowTipZh: "氣流連續，/j/ 本身是一個快速的滑動音。",
    commonMistakeZh: "不要把 yes 讀成「葉斯」（加了母音在前），y 是快速滑動不是獨立音節。",
    teacherScriptZh: "半母音 /j/ 是快速的「衣」滑向後面母音。yes、year、you、use、few 都有這個音。舌頭先在高前位，然後迅速移動到後面母音位置。注意：use 開頭不是「烏」，是 /j/ + /uː/，you 也是 /j/ + /uː/。",
    examples: [{ word: "yes", meaningZh: "是", tts: "yes" }, { word: "year", meaningZh: "年", tts: "year" }, { word: "you", meaningZh: "你", tts: "you" }],
    audio: mkA() },

  // ── 10. 重音與跟讀 ──────────────────────────────────
  { id: "rh-2syl", levelId: "rhythm", type: "concept",
    symbol: "●○ / ○●", titleZh: "雙音節重音",
    exampleWord: "TAble / baNAna", exampleMeaningZh: "桌子 / 香蕉",
    mouthTipZh: "重音音節：更長、更強、音調更高。非重音音節：更短、更弱。",
    commonMistakeZh: "重音位置錯誤會讓人誤解：reCORD（動詞）vs REcord（名詞）。",
    teacherScriptZh: "英語重音比中文重要得多。雙音節名詞和形容詞通常重音在第一個音節：TABLE、HAPPY、SIMPLE。雙音節動詞通常重音在第二個音節：reLAX、deCIDE、beLIEVE。同一個詞重音不同，詞性也不同：REcord（名詞）vs reCORD（動詞）。",
    examples: [{ word: "TAble", meaningZh: "桌子（前重）", tts: "table" }, { word: "baNAna", meaningZh: "香蕉（後重）", tts: "banana" }, { word: "REcord", meaningZh: "唱片（名詞）", tts: "record" }],
    audio: mkA() },

  { id: "rh-3syl", levelId: "rhythm", type: "concept",
    symbol: "●○○ / ○●○", titleZh: "三音節重音",
    exampleWord: "IMportant / reMEMber", exampleMeaningZh: "重要 / 記得",
    mouthTipZh: "找出最強的音節，其他音節相對弱化，非重音的母音常念成 /ə/。",
    commonMistakeZh: "非重音音節的母音要弱化，不要每個音節都一樣強。",
    teacherScriptZh: "三音節詞的重音規律：important 重音在第二音節 IM-POR-tant，中間最強。remember 也是第二音節 re-MEM-ber。非重音音節的母音常常弱化成 /ə/：important 的第三個 a 念 /ə/，不是 /æ/。",
    examples: [{ word: "important", meaningZh: "重要的", tts: "important" }, { word: "remember", meaningZh: "記得", tts: "remember" }, { word: "beautiful", meaningZh: "美麗的", tts: "beautiful" }],
    audio: mkA() },

  { id: "rh-connected", levelId: "rhythm", type: "concept",
    symbol: "連讀", titleZh: "連音與弱化",
    exampleWord: "want to → wanna", exampleMeaningZh: "想要",
    mouthTipZh: "自然說話時，詞與詞之間的音會連在一起，介詞和助動詞會弱化。",
    commonMistakeZh: "一字一字清楚發音聽起來不自然，要練習連讀和弱化。",
    teacherScriptZh: "自然的英語口語有大量連音和弱化。want to 念「wanna」，going to 念「gonna」，have to 念「hafta」。介詞 of 弱化成 /əv/，and 弱化成 /ən/，the 在子音前弱化成 /ðə/。練習自然說話節奏，不要每個詞都清楚念出。",
    examples: [{ word: "want to", meaningZh: "想要 → wanna", tts: "I want to go" }, { word: "going to", meaningZh: "將要 → gonna", tts: "I'm going to eat" }],
    audio: mkA() },

  { id: "rh-s1", levelId: "rhythm", type: "sentence",
    symbol: "💬", titleZh: "問候句跟讀",
    exampleWord: "How are you doing?", exampleMeaningZh: "你好嗎？",
    mouthTipZh: "重音在 ARE 和 DO-，非重音詞（how、you）弱化。",
    commonMistakeZh: "不要每個詞都讀一樣強，how 和 you 要弱化。",
    teacherScriptZh: "問候句 How are you doing 的重音在 are 和 doing 的第一個音節。how 弱化成 /haʊ/（很輕），you 弱化成 /jə/。整句的節奏是：how-ARE-you-DOing，強弱強弱。練習讓重音詞更突出，非重音詞更輕。",
    examples: [{ word: "How are you doing?", meaningZh: "你好嗎？", tts: "How are you doing" }, { word: "I'm doing great, thanks!", meaningZh: "我很好，謝謝！", tts: "I'm doing great thanks" }],
    audio: mkA() },

  { id: "rh-s2", levelId: "rhythm", type: "sentence",
    symbol: "💬", titleZh: "日常句子跟讀",
    exampleWord: "Could you help me, please?", exampleMeaningZh: "你能幫我嗎？",
    mouthTipZh: "Could 和 you 弱化，help 和 please 是重音。",
    commonMistakeZh: "Could you 在口語中連讀成「couldja」，不要逐字清楚念。",
    teacherScriptZh: "日常請求句 Could you help me please 的口語念法：could 弱化成 /kəd/，you 弱化成 /jə/，兩個連讀成「couldja」。重音在 help 和 please。整句自然流暢：「couldja-HELP-me-PLEASE」。",
    examples: [{ word: "Could you help me, please?", meaningZh: "你能幫我嗎？", tts: "Could you help me please" }, { word: "Of course! No problem.", meaningZh: "當然！沒問題。", tts: "Of course no problem" }],
    audio: mkA() },
];

// ═══════════════════════════════════════════════════
//  LessonCard
// ═══════════════════════════════════════════════════

function LessonCard({ lesson, color, isCompleted, isSelected, onSelect, onComplete }) {
  return (
    <div onClick={() => onSelect(lesson)}
      style={{ background: "var(--panel)", border: `1px solid ${isSelected ? color + "70" : "var(--border)"}`,
        borderRadius: 14, overflow: "hidden", cursor: "pointer", transition: "box-shadow .15s",
        boxShadow: isSelected ? `0 0 0 2px ${color}40` : "none", display: "flex", flexDirection: "column" }}>

      <div style={{ padding: "11px 14px 8px", background: color + "0c", borderBottom: `1px solid ${color}20`,
        display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 900, color, fontFamily: "monospace", lineHeight: 1.2, wordBreak: "break-all" }}>
            {lesson.symbol}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginTop: 3 }}>{lesson.titleZh}</div>
        </div>
        {isCompleted && (
          <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#10b98120", color: "#10b981",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0, fontWeight: 700 }}>✓</span>
        )}
      </div>

      <div style={{ padding: "7px 14px 5px", display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#a78bfa", fontStyle: "italic", flexShrink: 0 }}>
          {lesson.exampleWord}
        </span>
        <span style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          — {lesson.exampleMeaningZh}
        </span>
      </div>

      <div style={{ padding: "0 14px 6px", fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
        👄 {lesson.mouthTipZh}
      </div>

      {lesson.commonMistakeZh && (
        <div style={{ margin: "0 14px 10px", padding: "5px 8px", background: "rgba(245,158,11,0.07)",
          borderRadius: 7, border: "1px solid rgba(245,158,11,0.18)", fontSize: 10, color: "#d97706", lineHeight: 1.4 }}>
          ⚠️ {lesson.commonMistakeZh}
        </div>
      )}

      <div onClick={e => e.stopPropagation()}
        style={{ padding: "6px 14px 12px", display: "flex", flexDirection: "column", gap: 5, marginTop: "auto" }}>
        {/* 音標行 — 只對有獨立音素的課程顯示 */}
        {lesson.type === "phoneme" && (
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <span style={{ fontSize: 9, color: "var(--text-faint)", minWidth: 26, flexShrink: 0 }}>音標</span>
            <AudioButton audioUrl={lesson.audio?.phonemeUrl}
              lang="en-GB" ttsRate={0.85} label="聽音標" color={color} sm />
            <AudioButton audioUrl={lesson.audio?.phonemeRepeatUrl}
              lang="en-GB" ttsRate={0.5} label="慢速" color="#8b5cf6" sm />
          </div>
        )}
        {/* 例字行 */}
        {(() => {
          const wt = lesson.examples?.[0]?.tts || lesson.exampleWord.split(" / ")[0].trim();
          const wl = wt.length > 7 ? wt.slice(0, 7) + "…" : wt;
          return (
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <span style={{ fontSize: 9, color: "var(--text-faint)", minWidth: 26, flexShrink: 0 }}>例字</span>
              <AudioButton audioUrl={lesson.audio?.wordNormalUrl} fallbackText={wt}
                lang="en-GB" ttsRate={0.85} label={`正常單字 ${wl}`} color={color} sm />
              <AudioButton audioUrl={lesson.audio?.wordSlowUrl} fallbackText={wt}
                lang="en-GB" ttsRate={0.5} label="慢速單字" color="#8b5cf6" sm />
            </div>
          );
        })()}
        {/* 老師 + 完成 */}
        <div style={{ display: "flex", gap: 4 }}>
          <TeacherButton lesson={lesson} contentLanguage="en-GB" color="#0891b2" sm />
          <button onClick={e => { e.stopPropagation(); onComplete(lesson.id); }}
            style={{ padding: "4px 9px", borderRadius: 8, marginLeft: "auto",
              border: isCompleted ? "1px solid #10b981" : "1px solid var(--border)",
              background: isCompleted ? "#10b98112" : "var(--panel-alt)",
              color: isCompleted ? "#10b981" : "var(--text-faint)",
              cursor: "pointer", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>
            {isCompleted ? "✓ 完成" : "標記完成"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  DetailPanel
// ═══════════════════════════════════════════════════

function InfoBlock({ icon, label, color, children }) {
  return (
    <div style={{ marginBottom: 10, padding: "9px 12px", background: color + "08", borderRadius: 10, border: `1px solid ${color}22` }}>
      <div style={{ fontSize: 10, fontWeight: 800, color, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 }}>{icon} {label}</div>
      <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.7 }}>{children}</div>
    </div>
  );
}

function DetailPanel({ lesson, color, completedIds, onComplete, onClose }) {
  if (!lesson) return null;
  const done = completedIds.has(lesson.id);
  const ttsWord = lesson.examples?.[0]?.tts || lesson.exampleWord;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--panel)" }}>
      <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0,
        display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900, color, fontFamily: "monospace", lineHeight: 1.2 }}>{lesson.symbol}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginTop: 2 }}>{lesson.titleZh}</div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8,
          padding: "4px 10px", cursor: "pointer", color: "var(--text-faint)", fontSize: 12, flexShrink: 0 }}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }} className="ep-body">
        {/* 音標區塊 — 只對有獨立音素的課程顯示 */}
        {lesson.type === "phoneme" && (
          <div style={{ marginBottom: 10, padding: "10px 14px", background: color + "08", borderRadius: 12, border: `1px solid ${color}20` }}>
            <div style={{ fontSize: 10, fontWeight: 800, color, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>🔤 音標發音</div>
            <div style={{ fontSize: 22, fontWeight: 900, color, fontFamily: "monospace", marginBottom: 8 }}>{lesson.symbol}</div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              <AudioButton audioUrl={lesson.audio?.phonemeUrl}
                lang="en-GB" ttsRate={0.85} label="聽音標" color={color} />
              <AudioButton audioUrl={lesson.audio?.phonemeRepeatUrl}
                lang="en-GB" ttsRate={0.5} label="慢速音標" color="#8b5cf6" />
            </div>
          </div>
        )}
        <div style={{ marginBottom: 14, padding: "12px 14px", background: color + "0a", borderRadius: 12, border: `1px solid ${color}25` }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#a78bfa", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>📖 例字</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#a78bfa", fontStyle: "italic", marginBottom: 3 }}>{lesson.exampleWord}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>{lesson.exampleMeaningZh}</div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            <AudioButton fallbackText={ttsWord} lang="en-GB" ttsRate={0.85} audioUrl={lesson.audio?.wordNormalUrl} label="正常單字" color={color} />
            <AudioButton fallbackText={ttsWord} lang="en-GB" ttsRate={0.5} audioUrl={lesson.audio?.wordSlowUrl} label="慢速單字" color="#8b5cf6" />
            <RepeatBtn audioUrl={lesson.audio?.repeatAudioUrl} fallbackText={ttsWord} lang="en-GB" color={color} />
          </div>
        </div>

        {lesson.mouthTipZh && <InfoBlock icon="👄" label="嘴形" color="#a78bfa">{lesson.mouthTipZh}</InfoBlock>}
        {lesson.tongueTipZh && <InfoBlock icon="👅" label="舌頭位置" color="#34d399">{lesson.tongueTipZh}</InfoBlock>}
        {lesson.airflowTipZh && <InfoBlock icon="💨" label="氣流" color="#60a5fa">{lesson.airflowTipZh}</InfoBlock>}
        {lesson.commonMistakeZh && (
          <InfoBlock icon="⚠️" label="常見錯誤" color="#f59e0b">
            <span style={{ color: "#f59e0b" }}>{lesson.commonMistakeZh}</span>
          </InfoBlock>
        )}

        {lesson.teacherScriptZh && (
          <div style={{ marginBottom: 14, padding: "10px 13px", background: "#0891b208", borderRadius: 10, border: "1px solid #0891b222" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#0891b2", textTransform: "uppercase", letterSpacing: 0.5 }}>🎓 老師講解</div>
              <TeacherButton lesson={lesson} contentLanguage="en-GB" label="播放" color="#0891b2" sm />
            </div>
            <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.8 }}>{lesson.teacherScriptZh}</div>
          </div>
        )}

        {lesson.examples?.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>📚 例字練習</div>
            {lesson.examples.map((ex, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 12px", background: "var(--panel-alt)", borderRadius: 8, marginBottom: 5, border: "1px solid var(--border)" }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#a78bfa", fontStyle: "italic" }}>{ex.word}</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 7 }}>— {ex.meaningZh}</span>
                </div>
                <div style={{ display: "flex", gap: 5 }}>
                  <AudioButton fallbackText={ex.tts} lang="en-GB" ttsRate={0.85} label="正常單字" color={color} sm />
                  <RepeatBtn fallbackText={ex.tts} lang="en-GB" color={color} sm />
                </div>
              </div>
            ))}
          </div>
        )}

        <button onClick={() => onComplete(lesson.id)}
          style={{ width: "100%", padding: "11px 0", borderRadius: 12, border: "none", cursor: "pointer",
            background: done ? "#10b98118" : `linear-gradient(135deg, ${color}cc, ${color})`,
            color: done ? "#10b981" : "#fff", fontWeight: 700, fontSize: 14 }}>
          {done ? "✓ 已標記完成" : "✓ 標記完成"}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  Main Component
// ═══════════════════════════════════════════════════

export default function EnglishPronunciation({ onNav }) {
  const [mode, setMode] = useState("route");
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
      const saved = localStorage.getItem("ep-completed-v1");
      if (saved) setCompletedIds(new Set(JSON.parse(saved)));
    } catch (_) {}
  }, []);

  function toggleComplete(id) {
    setCompletedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem("ep-completed-v1", JSON.stringify([...next])); } catch (_) {}
      return next;
    });
  }

  const curLevel = LEVELS[activeLevel];
  const curLessons = LESSONS.filter(l => l.levelId === curLevel.id);
  const totalCount = LESSONS.length;
  const doneCount = LESSONS.filter(l => completedIds.has(l.id)).length;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  function handleSelect(lesson) {
    setSelectedLesson(prev => prev?.id === lesson.id ? null : lesson);
  }

  const detailColor = selectedLesson ? (LEVELS.find(l => l.id === selectedLesson.levelId)?.color || "#6366f1") : "#6366f1";
  const panelOpen = !!selectedLesson && !isMobile;

  function renderLevelContent() {
    const lvlDone = curLessons.filter(l => completedIds.has(l.id)).length;
    const cols = panelOpen ? "1fr" : "repeat(auto-fill, minmax(258px, 1fr))";
    return (
      <div>
        <div style={{ marginBottom: 14, padding: "11px 16px", background: curLevel.color + "0c",
          borderRadius: 12, border: `1px solid ${curLevel.color}28`,
          display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: curLevel.color }}>
              {curLevel.emoji} 第 {activeLevel + 1} 階段：{curLevel.title}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>
              {curLessons.length} 個項目 · {lvlDone} 已完成
            </div>
          </div>
          {lvlDone === curLessons.length && curLessons.length > 0 && <span style={{ fontSize: 20 }}>🎉</span>}
        </div>

        <div style={{ display: "grid", gap: 11, gridTemplateColumns: cols, marginBottom: 18 }}>
          {curLessons.map(lesson => (
            <LessonCard key={lesson.id} lesson={lesson} color={curLevel.color}
              isCompleted={completedIds.has(lesson.id)} isSelected={selectedLesson?.id === lesson.id}
              onSelect={handleSelect} onComplete={toggleComplete} />
          ))}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {activeLevel > 0 && (
            <button onClick={() => { setActiveLevel(activeLevel - 1); setSelectedLesson(null); }}
              style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: "1px solid var(--border)",
                background: "var(--panel)", color: "var(--text-muted)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
              ← {LEVELS[activeLevel - 1].emoji} {LEVELS[activeLevel - 1].title}
            </button>
          )}
          {activeLevel < LEVELS.length - 1 && (
            <button onClick={() => { setActiveLevel(activeLevel + 1); setSelectedLesson(null); }}
              style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: "none",
                background: `linear-gradient(135deg, ${LEVELS[activeLevel + 1].color}bb, ${LEVELS[activeLevel + 1].color})`,
                color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
              {LEVELS[activeLevel + 1].emoji} {LEVELS[activeLevel + 1].title} →
            </button>
          )}
        </div>

        {/* IELTS placeholder */}
        {activeLevel === LEVELS.length - 1 && (
          <div style={{ marginTop: 20, padding: "16px 20px", background: "var(--panel)", borderRadius: 14,
            border: "1px solid var(--border)", opacity: 0.75 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-muted)", marginBottom: 6 }}>
              🎓 IELTS 分級路線（即將開放）
            </div>
            <div style={{ fontSize: 12, color: "var(--text-faint)", lineHeight: 1.8 }}>
              完成音標發音路線後，進入 IELTS 聽說練習：<br/>
              📗 Band 4 — 基礎生存表達<br/>
              📘 Band 5 — 一般話題表達<br/>
              📙 Band 6 — 較完整觀點表達
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderChartMode() {
    const phonemes = LESSONS.filter(l => l.type === "phoneme");
    return (
      <div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
          {phonemes.length} 個音標 · 點擊卡片查看詳解
        </div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(235px, 1fr))" }}>
          {phonemes.map(lesson => {
            const lv = LEVELS.find(l => l.id === lesson.levelId);
            return (
              <LessonCard key={lesson.id} lesson={lesson} color={lv?.color || "#6366f1"}
                isCompleted={completedIds.has(lesson.id)} isSelected={selectedLesson?.id === lesson.id}
                onSelect={handleSelect} onComplete={toggleComplete} />
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bg)", color: "var(--text)", overflow: "hidden" }}>
      <style>{`.ep-body::-webkit-scrollbar{width:5px}.ep-body::-webkit-scrollbar-thumb{background:var(--border);border-radius:99px}`}</style>

      {/* Header */}
      <div style={{ padding: "10px 20px 8px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <button onClick={() => onNav && onNav("home")}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 14, color: "var(--text-faint)" }}>←</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: "var(--text)" }}>英語音標發音入門</span>
          </button>
          <div style={{ display: "flex", background: "var(--panel-alt)", borderRadius: 8, padding: 3, gap: 2 }}>
            {[["route","路線模式"],["chart","音標表"]].map(([m, label]) => (
              <button key={m} onClick={() => { setMode(m); setSelectedLesson(null); }}
                style={{ padding: "4px 10px", borderRadius: 6, border: "none",
                  background: mode === m ? "var(--panel)" : "transparent",
                  color: mode === m ? "var(--text)" : "var(--text-faint)",
                  cursor: "pointer", fontSize: 11, fontWeight: mode === m ? 700 : 400,
                  boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,0.1)" : "none", transition: "all .15s" }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {mode === "route" && (
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: "var(--text-faint)" }}>英語音標學習路線 · {doneCount}/{totalCount} 完成（{pct}%）</span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: "var(--border)" }}>
              <div style={{ height: "100%", borderRadius: 2, background: "#3b82f6", width: `${pct}%`, transition: "width .3s" }} />
            </div>
          </div>
        )}
      </div>

      {/* Level tabs */}
      {mode === "route" && (
        <div className="ep-body" style={{ display: "flex", gap: 4, padding: "6px 12px", overflowX: "auto",
          flexShrink: 0, borderBottom: "1px solid var(--border)", background: "var(--panel-alt)" }}>
          {LEVELS.map((lvl, i) => {
            const lvlLessons = LESSONS.filter(l => l.levelId === lvl.id);
            const lvlDone = lvlLessons.filter(l => completedIds.has(l.id)).length;
            const isActive = i === activeLevel;
            return (
              <button key={lvl.id} onClick={() => { setActiveLevel(i); setSelectedLesson(null); }}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 11px", borderRadius: 20,
                  border: `1px solid ${isActive ? lvl.color + "60" : "var(--border)"}`,
                  background: isActive ? lvl.color + "18" : "var(--panel)",
                  color: isActive ? lvl.color : "var(--text-faint)",
                  cursor: "pointer", fontSize: 11, fontWeight: isActive ? 700 : 400,
                  whiteSpace: "nowrap", flexShrink: 0, transition: "all .15s",
                  boxShadow: isActive ? `0 0 0 2px ${lvl.color}28` : "none" }}>
                <span>{lvl.emoji}</span>
                <span>{i + 1}. {lvl.title}</span>
                {lvlDone > 0 && (
                  <span style={{ background: "#10b98128", color: "#10b981", borderRadius: 10, padding: "1px 5px", fontSize: 9, fontWeight: 700 }}>
                    {lvlDone}/{lvlLessons.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Content + Panel */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div className="ep-body" style={{ flex: 1, overflowY: "auto", padding: "14px 18px" }}>
          {mode === "route" ? renderLevelContent() : renderChartMode()}
        </div>

        {selectedLesson && !isMobile && (
          <div className="ep-body" style={{ width: 330, flexShrink: 0, borderLeft: "1px solid var(--border)", overflowY: "auto" }}>
            <DetailPanel lesson={selectedLesson} color={detailColor}
              completedIds={completedIds} onComplete={toggleComplete} onClose={() => { stopPronunciationAudio(); setSelectedLesson(null); }} />
          </div>
        )}
      </div>

      {selectedLesson && isMobile && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200,
          maxHeight: "78vh", background: "var(--panel)", borderTop: "2px solid var(--border)",
          borderRadius: "18px 18px 0 0", overflow: "hidden", display: "flex", flexDirection: "column",
          boxShadow: "0 -10px 40px rgba(0,0,0,0.35)" }}>
          <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 0", flexShrink: 0 }}>
            <div style={{ width: 34, height: 4, borderRadius: 2, background: "var(--border)" }} />
          </div>
          <div className="ep-body" style={{ flex: 1, overflowY: "auto" }}>
            <DetailPanel lesson={selectedLesson} color={detailColor}
              completedIds={completedIds} onComplete={toggleComplete} onClose={() => { stopPronunciationAudio(); setSelectedLesson(null); }} />
          </div>
        </div>
      )}
    </div>
  );
}
