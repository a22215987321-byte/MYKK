// 動詞索引：每個收錄動詞的原形、中英文意思、規則／不規則、字尾類型、程度。
// type: "regular" | "irregular"。regular 動詞若有單一不規則例外（例如過去分詞），
// 用 overrides 帶過去，其餘欄位仍照規則引擎計算。

export const VERB_INDEX = [
  // ── 不規則動詞（完整支援 9 個時態／變化） ──────────────────────────────
  { infinitive: "ser", zh: "是；身份、本質", en: "to be", type: "irregular", ending: "-er", level: "A1" },
  { infinitive: "estar", zh: "在；狀態、位置", en: "to be (location/state)", type: "irregular", ending: "-ar", level: "A1" },
  { infinitive: "ir", zh: "去", en: "to go", type: "irregular", ending: "-ir", level: "A1" },
  { infinitive: "tener", zh: "有；擁有", en: "to have", type: "irregular", ending: "-er", level: "A1" },
  { infinitive: "hacer", zh: "做；製作", en: "to do / to make", type: "irregular", ending: "-er", level: "A1" },
  { infinitive: "decir", zh: "說", en: "to say / to tell", type: "irregular", ending: "-ir", level: "A1" },
  { infinitive: "poder", zh: "能夠、可以", en: "to be able to / can", type: "irregular", ending: "-er", level: "A1" },
  { infinitive: "querer", zh: "想要；愛", en: "to want / to love", type: "irregular", ending: "-er", level: "A1" },
  { infinitive: "venir", zh: "來", en: "to come", type: "irregular", ending: "-ir", level: "A1" },
  { infinitive: "poner", zh: "放；設置", en: "to put", type: "irregular", ending: "-er", level: "A1" },
  { infinitive: "salir", zh: "出去；離開", en: "to go out / to leave", type: "irregular", ending: "-ir", level: "A1" },
  { infinitive: "dar", zh: "給", en: "to give", type: "irregular", ending: "-ar", level: "A1" },
  { infinitive: "ver", zh: "看；看見", en: "to see / to watch", type: "irregular", ending: "-er", level: "A1" },
  { infinitive: "saber", zh: "知道；會（技能）", en: "to know (a fact/how to)", type: "irregular", ending: "-er", level: "A1" },
  { infinitive: "haber", zh: "有（助動詞、存在句）", en: "to have (auxiliary) / there is/are", type: "irregular", ending: "-er", level: "A2" },
  { infinitive: "caber", zh: "容納得下", en: "to fit", type: "irregular", ending: "-er", level: "B1" },
  { infinitive: "traer", zh: "帶來", en: "to bring", type: "irregular", ending: "-er", level: "A2" },
  { infinitive: "oír", zh: "聽見", en: "to hear", type: "irregular", ending: "-ir", level: "A2" },
  { infinitive: "pedir", zh: "要求；點（餐）", en: "to ask for / to order", type: "irregular", ending: "-ir", level: "A2" },
  { infinitive: "preferir", zh: "比較喜歡", en: "to prefer", type: "irregular", ending: "-ir", level: "A2" },
  { infinitive: "dormir", zh: "睡覺", en: "to sleep", type: "irregular", ending: "-ir", level: "A2" },
  { infinitive: "sentir", zh: "感覺；遺憾", en: "to feel / to regret", type: "irregular", ending: "-ir", level: "A2" },
  { infinitive: "seguir", zh: "繼續；跟隨", en: "to continue / to follow", type: "irregular", ending: "-ir", level: "A2" },
  { infinitive: "jugar", zh: "玩；打（球類運動）", en: "to play", type: "irregular", ending: "-ar", level: "A1" },
  { infinitive: "conocer", zh: "認識；熟悉", en: "to know (someone/somewhere)", type: "irregular", ending: "-er", level: "A2" },
  { infinitive: "conseguir", zh: "得到；達成", en: "to get / to achieve", type: "irregular", ending: "-ir", level: "B1" },
  { infinitive: "producir", zh: "生產", en: "to produce", type: "irregular", ending: "-ir", level: "B1" },
  { infinitive: "traducir", zh: "翻譯", en: "to translate", type: "irregular", ending: "-ir", level: "B1" },

  // ── 規則 -ar 動詞 ──────────────────────────────────────────────────
  { infinitive: "hablar", zh: "說話", en: "to speak", type: "regular", ending: "-ar", level: "A1" },
  { infinitive: "estudiar", zh: "學習", en: "to study", type: "regular", ending: "-ar", level: "A1" },
  { infinitive: "comprar", zh: "買", en: "to buy", type: "regular", ending: "-ar", level: "A1" },
  { infinitive: "trabajar", zh: "工作", en: "to work", type: "regular", ending: "-ar", level: "A1" },
  { infinitive: "buscar", zh: "尋找", en: "to look for", type: "regular", ending: "-ar", level: "A1" },
  { infinitive: "tomar", zh: "拿；喝；搭乘", en: "to take / to drink", type: "regular", ending: "-ar", level: "A1" },
  { infinitive: "llevar", zh: "帶著；穿", en: "to carry / to wear", type: "regular", ending: "-ar", level: "A1" },
  { infinitive: "necesitar", zh: "需要", en: "to need", type: "regular", ending: "-ar", level: "A1" },
  { infinitive: "escuchar", zh: "聽", en: "to listen", type: "regular", ending: "-ar", level: "A1" },
  { infinitive: "mirar", zh: "看", en: "to look at", type: "regular", ending: "-ar", level: "A1" },

  // ── 規則 -er 動詞 ──────────────────────────────────────────────────
  { infinitive: "comer", zh: "吃", en: "to eat", type: "regular", ending: "-er", level: "A1" },
  { infinitive: "beber", zh: "喝", en: "to drink", type: "regular", ending: "-er", level: "A1" },
  { infinitive: "aprender", zh: "學習", en: "to learn", type: "regular", ending: "-er", level: "A1" },
  { infinitive: "vender", zh: "賣", en: "to sell", type: "regular", ending: "-er", level: "A1" },
  { infinitive: "comprender", zh: "理解", en: "to understand", type: "regular", ending: "-er", level: "A2" },
  { infinitive: "correr", zh: "跑步", en: "to run", type: "regular", ending: "-er", level: "A1" },
  { infinitive: "leer", zh: "閱讀", en: "to read", type: "regular", ending: "-er", level: "A1" },

  // ── 規則 -ir 動詞（escribir / abrir 過去分詞不規則，用 overrides） ──────
  { infinitive: "vivir", zh: "居住；生活", en: "to live", type: "regular", ending: "-ir", level: "A1" },
  { infinitive: "escribir", zh: "寫", en: "to write", type: "regular", ending: "-ir", level: "A1", overrides: { participio: "escrito" } },
  { infinitive: "abrir", zh: "打開", en: "to open", type: "regular", ending: "-ir", level: "A1", overrides: { participio: "abierto" } },
  { infinitive: "recibir", zh: "收到", en: "to receive", type: "regular", ending: "-ir", level: "A2" },
  { infinitive: "subir", zh: "上去；上升", en: "to go up", type: "regular", ending: "-ir", level: "A2" },
  { infinitive: "decidir", zh: "決定", en: "to decide", type: "regular", ending: "-ir", level: "A2" },
];
