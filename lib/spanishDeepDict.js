// lib/spanishDeepDict.js
// 西語深度解釋資料庫 — 中文友好格式
// 逐步擴充；目前涵蓋最常見 A1 詞彙（動詞原形 + 常見變位）

export const conjugationRedirects = {
  // ser
  soy: "ser", eres: "ser", somos: "ser", sois: "ser", son: "ser",
  era: "ser", eras: "ser", fue: "ser", fui: "ser",
  // estar
  estoy: "estar", estamos: "estar",
  "estás": "estar", "está": "estar", "están": "estar",
  estaba: "estar", estabas: "estar",
  // tener
  tengo: "tener", tienes: "tener", tiene: "tener", tenemos: "tener", tienen: "tener",
  // ir
  voy: "ir", vas: "ir", va: "ir", vamos: "ir", van: "ir",
  // querer
  quiero: "querer", quieres: "querer", quiere: "querer", queremos: "querer", quieren: "querer",
  // poder
  puedo: "poder", puedes: "poder", puede: "poder", podemos: "poder", pueden: "poder",
  // hablar
  hablo: "hablar", hablas: "hablar", habla: "hablar", hablamos: "hablar", hablan: "hablar",
  // comer
  como: "comer", comes: "comer", come: "comer", comemos: "comer", comen: "comer",
  // gustar
  gusta: "gustar", gustan: "gustar",
  // preferir
  prefiero: "preferir", prefieres: "preferir", prefiere: "preferir",
  preferimos: "preferir", prefieren: "preferir",
  // llamarse
  llamo: "llamarse", llamas: "llamarse", llama: "llamarse",
  // vivir
  vivo: "vivir", vives: "vivir", vive: "vivir", vivimos: "vivir", viven: "vivir",
};

const entries = {
  hola: {
    word: "hola",
    lemma: "hola",
    partOfSpeech: "interj.",
    level: "A1",
    meaningZh: "你好、嗨——最基礎的西語問候語，任何時段、任何人都可以用。",
    coreImage: "遇到人，本能地張嘴出聲打招呼的那一瞬間。",
    etymology: {
      note: "詞源不詳，可能源自德語 holla（喂！），或是感嘆詞的自然演化。特別之處：它沒有拉丁語來源，是罕見的「非拉丁系」西語詞。",
    },
    evolution: "本是語氣詞，隨著語言習慣固定成「見人打招呼」的標準用語。",
    grammarNote: "感嘆詞，不隨人稱或時態變形。正式場合可改用 Buenos días（早安）/ Buenas tardes（午安）/ Buenas noches（晚安）。前面常加 ¡（倒驚嘆號），是西語標點特色。",
    examples: [
      { es: "¡Hola! ¿Cómo estás?", zh: "你好！你怎麼樣？", note: "最常見問候搭配，cómo estás = 你好嗎。" },
      { es: "Hola, me llamo Ana.", zh: "嗨，我叫 Ana。", note: "自我介紹最自然的開場。" },
      { es: "¡Hola a todos!", zh: "大家好！", note: "a todos = 給所有人，向一群人問候時用。" },
    ],
    wordFamily: [],
    shortSummary: "hola 就是「你好」，沒有拉丁語來源，直接背就對了——見到人就說 hola！",
  },

  ser: {
    word: "ser",
    lemma: "ser",
    partOfSpeech: "v. intr.",
    level: "A1",
    meaningZh: "是（本質上）——描述永久性或本質特徵：身份、職業、國籍、材質、時間。",
    coreImage: "把「本質標籤」貼在主語上——那個標籤不容易撕掉。",
    etymology: {
      root: "esse（拉丁語）：存在、是",
      note: "ser 融合了兩個拉丁語動詞：esse（存在）和 sedere（坐、定居），最終指「固定的、本質性的存在」。英語 essence（本質）也來自 esse。",
    },
    evolution: "從拉丁語「存在」演化成表示「本質性存在」的動詞，與 estar（暫時狀態）形成對比。",
    grammarNote: "高度不規則。現在時：yo soy / tú eres / él es / nosotros somos / vosotros sois / ellos son。過去時完全不規則：fui / fuiste / fue / fuimos / fuisteis / fueron（注意：ser 和 ir 的過去時形式相同！靠語境判斷）。",
    examples: [
      { es: "Soy estudiante.", zh: "我是學生。", note: "職業不加冠詞（不說 un estudiante），這是西語特有習慣。" },
      { es: "Ella es española.", zh: "她是西班牙人。", note: "國籍是固定的本質，所以用 ser。" },
      { es: "¿De dónde eres?", zh: "你是哪裡人？", note: "來自哪裡也用 ser，因為是相對固定的身份。" },
    ],
    wordFamily: [
      { word: "ser (n.)", zh: "存在、生命體（名詞用法：un ser humano = 人類）" },
      { word: "esencia", zh: "本質、精髓（來自拉丁語 esse）" },
    ],
    shortSummary: "ser = 貼本質標籤，改不掉的才用 ser——職業、國籍、材質；記住：soy（我是）/ es（他/她是）。",
  },

  estar: {
    word: "estar",
    lemma: "estar",
    partOfSpeech: "v. intr.",
    level: "A1",
    meaningZh: "是（暫時狀態）、在（某地）——描述地點、暫時性狀態（心情、健康、位置）。",
    coreImage: "此刻站在這裡，但隨時可以離開或改變。",
    etymology: {
      root: "stare（拉丁語）：站立、停在某處",
      note: "英語的 stable（穩定）、station（車站）、static（靜止的）都來自同一個拉丁語根 stare。西語 estar 保留了「站著、位於某處」的核心意象。",
    },
    evolution: "從「站著不動」→「位於某處」→「處於某種狀態」，始終強調「此時此刻」的暫時性。",
    grammarNote: "現在時：yo estoy / tú estás / él está / nosotros estamos / vosotros estáis / ellos están。注意：大部分形式末尾有重音符號，表示重音落在最後一個音節。",
    examples: [
      { es: "¿Cómo estás?", zh: "你好嗎？", note: "問此刻狀態，不是本質，所以用 estar。" },
      { es: "Estoy en casa.", zh: "我在家。", note: "位置用 estar，因為隨時可以不在家。" },
      { es: "Está muy cansado.", zh: "他很累。", note: "疲勞是暫時狀態，用 estar 而非 ser。" },
    ],
    wordFamily: [
      { word: "estación", zh: "車站；季節（都有「停駐」的意味）" },
      { word: "estado", zh: "狀態、國家（EE.UU. = 美國 = los Estados Unidos）" },
    ],
    shortSummary: "estar = 此刻站在這裡，位置和暫時狀態都用它；記住：能改變的感覺用 estar，改不掉的本質用 ser。",
  },

  tener: {
    word: "tener",
    lemma: "tener",
    partOfSpeech: "v. tr.",
    level: "A1",
    meaningZh: "有、持有；也用於「我幾歲」（tener X años）、「我餓了」（tener hambre）等固定表達。",
    coreImage: "用手握住某樣東西，不讓它溜走。",
    etymology: {
      root: "tenere（拉丁語）：握住、保持、維持",
      note: "英語的 contain（包含）、detain（拘留）、maintain（維持）、obtain（獲得）都來自同一個拉丁語根 tenere——全都有「抓住/持有」的共同意象。",
    },
    evolution: "從「用手握住」→「擁有某物」→ 延伸到「擁有某種狀態或感覺」（如飢餓、年齡、溫度）。",
    grammarNote: "不規則動詞。yo 形式特殊：yo tengo（注意 -go 結尾）。完整現在時：tengo / tienes / tiene / tenemos / tenéis / tienen。常見固定結構：tener hambre（餓）、tener sed（渴）、tener frío（冷）、tener calor（熱）、tener X años（X 歲）。",
    examples: [
      { es: "Tengo veinte años.", zh: "我二十歲。", note: "西語說年齡用「有 X 歲」，不是「是 X 歲」。" },
      { es: "¿Tienes hambre?", zh: "你餓了嗎？", note: "tener hambre = 有飢餓感，這是固定搭配。" },
      { es: "Tenemos clase mañana.", zh: "我們明天有課。", note: "有課/有會議都用 tener。" },
    ],
    wordFamily: [
      { word: "contener", zh: "包含、容納（con + tener = 一起握住）" },
      { word: "mantener", zh: "維持（mano + tener = 用手保持）" },
      { word: "obtener", zh: "獲得（ob + tener = 努力握到手）" },
    ],
    shortSummary: "tener = 用手握住，所以是「有」；特別記：說年齡和身體感覺都用 tener，不用 ser 或 estar。",
  },

  ir: {
    word: "ir",
    lemma: "ir",
    partOfSpeech: "v. intr.",
    level: "A1",
    meaningZh: "去、前往；ir a + 動詞原形 = 將要做某事（近未來）。",
    coreImage: "人從這裡出發，朝著某個方向移動前進。",
    etymology: {
      root: "ire（拉丁語）：走、前進",
      note: "ir 是極度不規則的動詞：現在時形式來自另一個拉丁語詞 vadere（走），過去時才是 ire 的形式。兩個動詞「合體」，導致形式看起來毫無關聯——這在語言學上叫做「補缺現象」（suppletion）。",
    },
    evolution: "ire 是最基礎的移動動詞，後來擴展出「去做某事」的近未來意義（ir a + inf.）。",
    grammarNote: "高度不規則。現在時：yo voy / tú vas / él va / nosotros vamos / vosotros vais / ellos van。注意：過去時和 ser 完全相同（fui / fuiste / fue...），靠語境判斷。ir a + infinitivo = 近未來：Voy a comer = 我要去吃飯了。",
    examples: [
      { es: "¿Adónde vas?", zh: "你要去哪裡？", note: "adónde = 往哪裡（帶方向感），比 dónde 更精確。" },
      { es: "Vamos al supermercado.", zh: "我們去超市。", note: "vamos 也可單獨作感嘆詞：¡Vamos! = 走吧！" },
      { es: "Voy a estudiar esta noche.", zh: "我今晚要讀書。", note: "ir a + inf. 是最常用的近未來表達方式。" },
    ],
    wordFamily: [
      { word: "ida", zh: "去程（billete de ida y vuelta = 來回票）" },
      { word: "venida", zh: "到來（ir 的反方向）" },
    ],
    shortSummary: "ir = 出發前往；ir a + 動詞原形 = 即將做某事；vamos = 我們去！也作「走吧」感嘆詞。",
  },

  querer: {
    word: "querer",
    lemma: "querer",
    partOfSpeech: "v. tr.",
    level: "A1",
    meaningZh: "想要（物品或做某事）；愛（人）。一個詞同時承擔了英語 want 和 love 的意思。",
    coreImage: "心裡向外伸出手，想要抓住或靠近某樣東西。",
    etymology: {
      root: "quaerere（拉丁語）：尋找、探索、追求",
      note: "英語的 query（查詢）、quest（追求）、question（問題）都來自同根。原本是「主動去尋找」，後來演變成「想要得到」，再延伸到「對人的愛」。",
    },
    evolution: "從「主動去尋找」→「想要得到某物」→「對人產生情感上的依附（愛）」。",
    grammarNote: "e → ie 詞幹變化動詞（不規則）。現在時：yo quiero / tú quieres / él quiere / nosotros queremos（不變！）/ vosotros queréis / ellos quieren。搭配：querer + 名詞 = 想要某物；querer a + 人 = 愛某人；querer + 動詞原形 = 想做某事。",
    examples: [
      { es: "Quiero un café, por favor.", zh: "請給我一杯咖啡。", note: "點餐最自然的說法，比 necesito 更日常。" },
      { es: "Te quiero.", zh: "我愛你（家人/朋友之愛）。", note: "比 te amo 輕，用於家人或親近朋友。" },
      { es: "¿Quieres venir conmigo?", zh: "你想跟我一起來嗎？", note: "querer + inf. = 想做某事。" },
    ],
    wordFamily: [
      { word: "querido/a", zh: "親愛的（書信開頭 Querida Ana = 親愛的 Ana）" },
      { word: "queja", zh: "抱怨、投訴" },
    ],
    shortSummary: "querer = 心中向外伸手；想要東西用 querer，愛人用 querer a，想做事用 querer + 原形。",
  },

  poder: {
    word: "poder",
    lemma: "poder",
    partOfSpeech: "v. modal",
    level: "A1",
    meaningZh: "可以、能夠——表示能力（有辦法做到）或許可（被允許做）。",
    coreImage: "體內有一股能量，讓你能夠向前做到某件事。",
    etymology: {
      root: "potere（拉丁語）：有能力、有力量",
      note: "英語的 power（力量）、potent（強效的）、potential（潛能）都來自同根。西語 poder 同時是動詞（能）也是名詞（poder = 權力），兩種用法都很常見。",
    },
    evolution: "從「擁有力量」→「有能力做到」→「被允許做到」（語境決定是能力還是許可）。",
    grammarNote: "o → ue 詞幹變化動詞（不規則）。現在時：yo puedo / tú puedes / él puede / nosotros podemos（不變！）/ vosotros podéis / ellos pueden。用法：poder + 動詞原形。能力：Puedo nadar（我會游泳）；許可：¿Puedo entrar?（我可以進來嗎？）",
    examples: [
      { es: "¿Puedo ayudarte?", zh: "我可以幫你嗎？", note: "主動提供幫助時的自然說法。" },
      { es: "No puedo dormir.", zh: "我睡不著。", note: "表示能力/身體狀態的 no poder。" },
      { es: "¿Puede repetir, por favor?", zh: "可以請您再說一遍嗎？", note: "用 puede（第三人稱尊稱）更禮貌。" },
    ],
    wordFamily: [
      { word: "poder (n.)", zh: "權力、力量" },
      { word: "poderoso/a", zh: "強大的、有力量的" },
    ],
    shortSummary: "poder = 體內有能量；puedo + 動詞 = 我能/我可以，是最萬用的「可以」。",
  },

  hablar: {
    word: "hablar",
    lemma: "hablar",
    partOfSpeech: "v. intr./tr.",
    level: "A1",
    meaningZh: "說話、講（某種語言）——最標準、最常用的「說話」動詞。",
    coreImage: "張嘴，把心裡的話用聲音傳送出去。",
    etymology: {
      root: "fabulare（拉丁語）：講故事、說話",
      note: "源自 fabula（故事、傳說），英語的 fable（寓言）也來自這裡。西語中 f → h 是正常的歷史音變（fablar → hablar）。",
    },
    evolution: "從「講故事」→ 日常「說話」，逐漸成為最通用的說話動詞。",
    grammarNote: "-ar 動詞，規則變位。現在時：yo hablo / tú hablas / él habla / nosotros hablamos / vosotros habláis / ellos hablan。hablar + 語言（不加 en）：Hablo español。hablar con + 人 = 和某人說話。hablar de + 話題 = 談論某話題。",
    examples: [
      { es: "¿Hablas inglés?", zh: "你會說英語嗎？", note: "問語言能力直接用 hablar，不需加 puedes。" },
      { es: "Hablo un poco de español.", zh: "我會說一點點西班牙語。", note: "un poco de 是謙虛說法的好用句型。" },
      { es: "Necesito hablar contigo.", zh: "我需要跟你說話。", note: "hablar con + 人，注意介詞用 con。" },
    ],
    wordFamily: [
      { word: "hablante", zh: "說話者（hispanohablante = 說西語的人）" },
      { word: "hablador/a", zh: "話多的人、饒舌的" },
    ],
    shortSummary: "hablar 源自「講故事」，現在是最基本的「說話」——學西語第一個要學的動詞之一。",
  },

  comer: {
    word: "comer",
    lemma: "comer",
    partOfSpeech: "v. tr./intr.",
    level: "A1",
    meaningZh: "吃——最一般的「吃」，不分吃什麼、怎麼吃；也指「吃午餐」。",
    coreImage: "把食物放進嘴裡，從外界攝取能量。",
    etymology: {
      root: "comedere（拉丁語）：完全吃掉（com- 表示完全 + edere 吃）",
      note: "英語的 edible（可食用的）來自拉丁語 edere（吃）。comedere 強調「吃完、吃光」，後來縮短成 comer，成為通用的「吃」。",
    },
    evolution: "從「完全吃掉」→ 日常「吃」的通用動詞；la comida 也因此同時指「食物」和「午餐」。",
    grammarNote: "-er 動詞，規則變位。現在時：yo como / tú comes / él come / nosotros comemos / vosotros coméis / ellos comen。注意：la comida 既是「食物」也是「午飯」；在西班牙，午餐（comida）是主餐，傳統在下午 2-3 點才吃。",
    examples: [
      { es: "¿Qué quieres comer?", zh: "你想吃什麼？", note: "點餐或問意見時最常見的問句。" },
      { es: "Comemos a las dos.", zh: "我們兩點吃午餐。", note: "西班牙傳統午餐在 2-3 點，是正常習慣。" },
      { es: "No como carne.", zh: "我不吃肉。", note: "表示飲食習慣，用一般現在時。" },
    ],
    wordFamily: [
      { word: "comida", zh: "食物；午餐" },
      { word: "comedor", zh: "餐廳、飯廳" },
      { word: "desayuno", zh: "早餐（des- 取消 + ayuno 禁食 = 打破禁食）" },
    ],
    shortSummary: "comer = 把東西吃進去；la comida = 食物或午餐；記住：西班牙午飯 2 點才吃，晚飯可以到 10 點！",
  },

  gustar: {
    word: "gustar",
    lemma: "gustar",
    partOfSpeech: "v. intr.",
    level: "A1",
    meaningZh: "讓人喜歡——西語特有構造：不是「我喜歡它」，而是「它讓我喜歡」，主語是被喜歡的東西。",
    coreImage: "食物觸碰舌頭讓你感到愉悅——快感從外往內流入。",
    etymology: {
      root: "gustare（拉丁語）：品嘗、嘗味道",
      note: "英語的 gusto（熱情）、disgust（厭惡）都來自同根。原本是「嘗味道」，後來抽象成「喜歡」，但保留了「感覺從外向內流入」的方向——所以主語是被喜歡的東西！",
    },
    evolution: "從「嘗到好味道」→「感到滿足喜悅」→ 現代表示「喜歡」，但構造完全顛倒了英語直覺。",
    grammarNote: "最特別的西語動詞！主語是被喜歡的東西，不是喜歡的人。\n結構：間接受詞代詞 + gustar + 主語（被喜歡的東西）\nMe gusta el café = 咖啡讓我喜歡\n單數：gusta；複數：gustan\n代詞：me（我）/ te（你）/ le（他/她）/ nos（我們）/ os（你們）/ les（他們）",
    examples: [
      { es: "Me gusta el café.", zh: "我喜歡咖啡。", note: "gusta 用單數，因為主語 el café 是單數。" },
      { es: "¿Te gustan los perros?", zh: "你喜歡狗嗎？", note: "gustan 用複數，因為主語 los perros 是複數。" },
      { es: "Le gusta bailar.", zh: "他/她喜歡跳舞。", note: "gustar + 動詞原形，動詞原形視為單數。" },
    ],
    wordFamily: [
      { word: "disgustar", zh: "令人不高興、讓人討厭" },
      { word: "gusto", zh: "品味；(mucho gusto = 很高興認識你)" },
    ],
    shortSummary: "gustar 是反過來的：不是「我喜歡它」，而是「它讓我喜歡」——主語是被喜歡的東西，不是人。",
  },

  preferir: {
    word: "preferir",
    lemma: "preferir",
    partOfSpeech: "v. tr.",
    level: "A1",
    meaningZh: "更喜歡、偏好、寧願——在多個選項中把某一個放在更優先的位置。",
    coreImage: "把某個選項搬到最前面，讓它贏過其他選項。",
    etymology: {
      prefix: "pre- / prae-：在前面、優先",
      root: "ferre：帶、運、承載",
      note: "ferre 也出現在 sufrir、conferir、diferir 等詞中。英語的 prefer、confer、refer、transfer 都有這個根。",
    },
    evolution: "原本是把某物「搬到更前方」，後來演變成「在選擇中把某個選項放在優先位置」，也就是「偏好」。",
    grammarNote: "e → ie 詞幹變化動詞（不規則）。現在時：yo prefiero / tú prefieres / él prefiere / nosotros preferimos（不變！）/ vosotros preferís / ellos prefieren。搭配：preferir A a B = 比起 B 更喜歡 A；preferir + 動詞原形 = 寧願做某事。",
    examples: [
      { es: "Prefiero el té al café.", zh: "比起咖啡，我更喜歡茶。", note: "A al B 結構：el té（偏好）al café（比較對象）。" },
      { es: "Prefiero quedarme en casa.", zh: "我寧願待在家裡。", note: "prefiero + 動詞原形，表示寧願的選擇。" },
      { es: "¿Qué prefieres?", zh: "你比較喜歡哪個？", note: "詢問偏好時的簡潔問句。" },
    ],
    wordFamily: [
      { word: "preferencia", zh: "偏好、優先選擇" },
      { word: "preferido/a", zh: "最喜歡的（mi color preferido = 我最喜歡的顏色）" },
    ],
    shortSummary: "prefiero = 我把這個選項搬到最前面；詞根 pre-（前）+ ferre（帶）幫你記住這個動詞。",
  },

  llamarse: {
    word: "llamarse",
    lemma: "llamarse",
    partOfSpeech: "v. pron.",
    level: "A1",
    meaningZh: "叫做（名字）——字面是「被叫做、稱自己為」，西語用反身動詞來說名字。",
    coreImage: "有人呼喚你的名字，而你回應了——你就是那個名字所指的人。",
    etymology: {
      root: "clamare（拉丁語）：大喊、呼叫",
      note: "英語的 claim（聲稱）、exclaim（驚呼）、proclaim（宣布）都來自 clamare。西語中 cl → ll 是正常的歷史音變（clamare → llamar）。",
    },
    evolution: "從「大聲呼叫某人」→「用名字稱呼某人」→ 反身用法「自己被稱為（某名字）」。",
    grammarNote: "反身（代詞）動詞，變位時需配合反身代詞：me llamo（我叫）/ te llamas（你叫）/ se llama（他/她叫）/ nos llamamos（我們叫）/ os llamáis / se llaman。回答「你叫什麼名字」：Me llamo + 名字，也可說 Soy + 名字，但前者更地道。",
    examples: [
      { es: "Me llamo Carlos.", zh: "我叫 Carlos。", note: "最基本的自我介紹，字面是「我被叫做 Carlos」。" },
      { es: "¿Cómo te llamas?", zh: "你叫什麼名字？", note: "字面：你怎麼被叫做？cómo = 怎麼、如何。" },
      { es: "Se llama Ana.", zh: "她叫 Ana。", note: "介紹第三人時用 se llama。" },
    ],
    wordFamily: [
      { word: "llamar", zh: "呼叫、打電話（te llamo = 我打給你）" },
      { word: "llamada", zh: "電話通話、呼叫" },
    ],
    shortSummary: "llamarse = 被叫做；me llamo 是自我介紹的第一句話——背下來，一輩子都用得到！",
  },

  nombre: {
    word: "nombre",
    lemma: "nombre",
    partOfSpeech: "n. m.",
    level: "A1",
    meaningZh: "名字——既指人名，也可指事物的名稱。",
    coreImage: "一個符號，讓你在萬物中被辨識出來。",
    etymology: {
      root: "nomen（拉丁語）：名字、名稱",
      note: "英語的 name、noun（名詞）都來自同一個拉丁語根 nomen。有趣的是 nombre 比英語的 name 多了一個 b，這是歷史音變的結果（nomen → nomne → nombre）。",
    },
    evolution: "拉丁語 nomen 直接演變成西語 nombre，意思幾乎沒有改變。",
    grammarNote: "陽性名詞（m.）。¿Cuál es tu nombre? = 你的名字是什麼？（正式）；¿Cómo te llamas? = 你叫什麼名字？（口語）。短語：en nombre de = 以⋯名義；nombre completo = 全名。",
    examples: [
      { es: "¿Cuál es tu nombre?", zh: "你的名字是什麼？", note: "正式問法；口語更常說 ¿Cómo te llamas?。" },
      { es: "Mi nombre es Ana.", zh: "我的名字是 Ana。", note: "正式回答；口語常說 Me llamo Ana。" },
      { es: "¿Me puede dar su nombre?", zh: "可以給我您的姓名嗎？", note: "飯店、診所等正式場合常用的問法。" },
    ],
    wordFamily: [
      { word: "apellido", zh: "姓氏（西語通常兩個姓氏）" },
      { word: "nombrar", zh: "命名、任命" },
    ],
    shortSummary: "nombre = 名字，來自拉丁語 nomen（英語 name 同源）；注意：nombre 是陽性名詞。",
  },

  casa: {
    word: "casa",
    lemma: "casa",
    partOfSpeech: "n. f.",
    level: "A1",
    meaningZh: "家、房子——既指建築物，也帶有「家」的情感意涵。",
    coreImage: "有屋頂、有牆壁、讓你感到安全、隨時能回去的地方。",
    etymology: {
      root: "casa（拉丁語）：小屋、農舍",
      note: "有趣的是：拉丁語的「正式房屋」是 domus（英語 domestic 來自這裡），而 casa 原本是「簡陋小屋」。西語卻選了 casa 作為通用詞。英語選擇了日耳曼語來源的 house。",
    },
    evolution: "從「簡陋小屋」→ 現代任何住宅，包含「家」的情感意涵——比「房子」更溫暖。",
    grammarNote: "陰性名詞（f.）。固定用法（不加冠詞）：en casa = 在家（不說 en la casa）；a casa = 回家（不說 a la casa）。這是西語的固定慣用表達，必須背下來。",
    examples: [
      { es: "Estoy en casa.", zh: "我在家。", note: "en casa 不加冠詞，是固定表達。" },
      { es: "Voy a casa.", zh: "我回家了。", note: "a casa 也不加冠詞。" },
      { es: "Mi casa es pequeña pero bonita.", zh: "我的房子小，但很漂亮。", note: "描述房子時加 mi（我的）或 la（定冠詞）。" },
    ],
    wordFamily: [
      { word: "hogar", zh: "家（情感意義更強，相當於 home vs. house）" },
      { word: "casero/a", zh: "房東；家常的（comida casera = 家常菜）" },
    ],
    shortSummary: "casa = 房子/家；記住固定搭配：en casa（在家）和 a casa（回家）都不加冠詞！",
  },

  tiempo: {
    word: "tiempo",
    lemma: "tiempo",
    partOfSpeech: "n. m.",
    level: "A1",
    meaningZh: "時間；天氣。同一個詞承擔兩個意思，靠語境判斷。",
    coreImage: "流動不停、無法抓住的東西——不管是時間還是天氣，都在不斷變化。",
    etymology: {
      root: "tempus（拉丁語）：時間",
      note: "英語的 temporal（暫時的）、contemporary（當代的）、tempo（節奏）都來自 tempus。古人認為天氣是「隨時間變化的大氣狀態」，所以同一個詞延伸到「天氣」。",
    },
    evolution: "tempus 原本只指「時間」，後來演變出「天氣」的意思，因為天氣是隨時間流逝而不斷變化的事物。",
    grammarNote: "陽性名詞（m.）。詢問時間：¿Cuánto tiempo...?（多少時間？）/ hace tiempo（很久了）。詢問天氣：¿Qué tiempo hace?（天氣怎樣？）/ Hace buen tiempo（天氣好）/ Hace mal tiempo（天氣不好）。注意：描述天氣用 hacer，不用 ser/estar/hay。",
    examples: [
      { es: "¿Qué tiempo hace hoy?", zh: "今天天氣怎樣？", note: "問天氣用 hace，不用 hay 或 está。" },
      { es: "No tengo tiempo.", zh: "我沒有時間。", note: "「有時間」用 tener，不用 estar 或 hay。" },
      { es: "Hace mucho tiempo.", zh: "很久以前了/已經很久了。", note: "hacer + tiempo = 時間的流逝。" },
    ],
    wordFamily: [
      { word: "temporal", zh: "暫時的；暴風雨" },
      { word: "a tiempo", zh: "準時（llegué a tiempo = 我準時到了）" },
    ],
    shortSummary: "tiempo = 時間或天氣，靠語境判斷；天氣固定說 ¿Qué tiempo hace? / Hace buen/mal tiempo。",
  },

  gracias: {
    word: "gracias",
    lemma: "gracias",
    partOfSpeech: "interj.",
    level: "A1",
    meaningZh: "謝謝——最基本的感謝表達，永遠用複數形式（不說 gracia）。",
    coreImage: "接受了別人給予的好意，心中湧現溫暖，想要回報那份善意。",
    etymology: {
      root: "gratia（拉丁語）：恩惠、好意、優雅",
      note: "英語的 grace（恩典/優雅）、grateful（感激的）、gratitude（感謝）都來自 gratia。西語 gracias 用複數，表示「多份感謝」（就像中文「謝謝」重複一樣）。",
    },
    evolution: "gratia 原指「神的恩寵」，後來世俗化成日常的「謝謝」；義大利語是 grazie，法語的 merci 則來自另一個詞源。",
    grammarNote: "感嘆詞，永遠用複數形式（不說 *gracia）。加強：¡Muchas gracias!（非常謝謝）。回應：De nada（不客氣）/ Con gusto / No hay de qué。搭配：gracias por + 名詞/動詞原形（謝謝你的...）。",
    examples: [
      { es: "¡Muchas gracias!", zh: "非常謝謝你！", note: "日常最常用的感謝，比單純 gracias 更有誠意。" },
      { es: "Gracias por tu ayuda.", zh: "感謝你的幫助。", note: "gracias por + 名詞，說明感謝的原因。" },
      { es: "—Gracias. —De nada.", zh: "—謝謝。—不客氣。", note: "de nada = 什麼都沒有（不值一提），最標準的回應。" },
    ],
    wordFamily: [
      { word: "agradecido/a", zh: "感激的（estar agradecido = 感到感激）" },
      { word: "agradecer", zh: "感謝（更正式）" },
    ],
    shortSummary: "gracias 源自「神的恩典」，永遠用複數；muchas gracias = 非常謝謝，de nada = 不客氣。",
  },

  bien: {
    word: "bien",
    lemma: "bien",
    partOfSpeech: "adv.",
    level: "A1",
    meaningZh: "好地、良好地——修飾動詞（說得好）或表示狀態（我很好）；不能直接修飾名詞。",
    coreImage: "一切按照期望運作，沒有問題，就是「好」的狀態。",
    etymology: {
      root: "bene（拉丁語）：好地、良善地",
      note: "英語的 benefit（好處）、benevolent（仁慈的）、bonus（獎勵）都來自同一個拉丁語根 bonus/bene。副詞 bien 和形容詞 bueno/buena（好的）雖然同根，但用法完全不同。",
    },
    evolution: "bene 直接演化成 bien，意思幾乎不變；形容詞 bueno 和副詞 bien 分化成兩個不同的詞。",
    grammarNote: "bien 是副詞，修飾動詞或形容詞；bueno/buena 是形容詞，修飾名詞。不能說 *Es bien（要說 Es bueno）；但可以說 Estoy bien（我很好）或 Hablas bien（你說得好）。",
    examples: [
      { es: "Estoy bien, gracias.", zh: "我很好，謝謝。", note: "回答 ¿Cómo estás? 的標準答案。" },
      { es: "Hablas muy bien el español.", zh: "你西班牙語說得很好。", note: "bien 作副詞，修飾動詞 hablas。" },
      { es: "¡Muy bien!", zh: "非常好！", note: "表揚或確認時常用，相當於 Great! / Well done!。" },
    ],
    wordFamily: [
      { word: "bueno/buena", zh: "好的（形容詞）：un buen día = 一個好日子" },
      { word: "bienvenido/a", zh: "歡迎（bien + venido = 好地到來）" },
    ],
    shortSummary: "bien = 好地（副詞）；estoy bien = 我很好；別和形容詞 bueno（好的）搞混！",
  },

  azul: {
    word: "azul",
    lemma: "azul",
    partOfSpeech: "adj.",
    level: "A1",
    meaningZh: "藍色的——最基本的顏色形容詞之一，購物時常用來指定款式/顏色。",
    coreImage: "晴朗天空與海洋的顏色。",
    etymology: {
      root: "lāzaward（波斯語，經阿拉伯語 al-lazaward 傳入西班牙語）",
      note: "跟英語 azure（天藍色）同源，都是經阿拉伯語從波斯語「青金石」一詞演變而來——顏色詞往往跟隨貿易路線的礦石/染料傳播。",
    },
    evolution: "從指稱青金石礦物的顏色，逐漸變成通用的「藍色」形容詞。",
    grammarNote: "以 -ul 結尾，陰陽性同形，只隨單複數變化：azul（單）/ azules（複）。en azul（藍色款）是購物常見的固定搭配，不是字面「在藍色裡」。",
    examples: [
      { es: "¿Lo tienen en azul?", zh: "有藍色的嗎？", note: "en azul = 藍色款，固定購物用語；lo 代替前面提過的商品。" },
      { es: "El cielo está azul.", zh: "天空是藍色的。", note: "描述狀態用 estar，因為天色會變化。" },
      { es: "Una camiseta azul.", zh: "一件藍色 T 恤。", note: "形容詞放名詞後面，是西語常見語序。" },
    ],
    wordFamily: [
      { word: "azulejo", zh: "彩繪瓷磚（西班牙/葡萄牙傳統建築常見）" },
    ],
    shortSummary: "azul = 藍色，陰陽性同形只變單複數；en azul = 「藍色款」，購物必學固定搭配。",
  },

  mucho: {
    word: "mucho",
    lemma: "mucho",
    partOfSpeech: "adj. / adv.",
    level: "A1",
    meaningZh: "很多（修飾名詞）；非常（修飾動詞或形容詞）——用法取決於它修飾什麼。",
    coreImage: "一大堆、滿出來的感覺，數量或程度超出普通水準。",
    etymology: {
      root: "multum（拉丁語）：很多",
      note: "英語的 multiply（倍增）、multiple（多重的）、multitude（大量）都來自 multum。西語 multum → molto（義大利語）→ mucho（西語，u 取代了 ul）。",
    },
    evolution: "multum 直接演化，從計數的量詞延伸成程度副詞，用法越來越廣。",
    grammarNote: "作形容詞時需配合性別和數：mucho（m.sg.）/ mucha（f.sg.）/ muchos（m.pl.）/ muchas（f.pl.）+ 名詞。作副詞時永遠不變形，放動詞後：estudia mucho（學習很多）；或放比較級前：mucho mejor = 好很多。",
    examples: [
      { es: "Tengo mucho trabajo.", zh: "我有很多工作。", note: "mucho 修飾陽性名詞 trabajo，不變形。" },
      { es: "Me gusta mucho.", zh: "我非常喜歡。", note: "mucho 作副詞，放動詞後，不加性別變化。" },
      { es: "¡Muchas gracias!", zh: "非常謝謝！", note: "muchas 修飾陰性複數名詞 gracias。" },
    ],
    wordFamily: [
      { word: "poco/a", zh: "少（反義詞：un poco = 一點點）" },
      { word: "demasiado/a", zh: "太多了（過量）" },
    ],
    shortSummary: "mucho = 很多/非常；作形容詞要配合性別；作副詞（修飾動詞）永遠是 mucho，不變化。",
  },

  año: {
    word: "año",
    lemma: "año",
    partOfSpeech: "n. m.",
    level: "A1",
    meaningZh: "年、歲——表示時間單位（年），也用於說年齡（X 歲）。",
    coreImage: "地球繞太陽一圈，時間完整走過一個循環。",
    etymology: {
      root: "annum（拉丁語）：年",
      note: "英語的 annual（每年的）、anniversary（週年紀念）都來自 annum。西語拼寫加了 ñ（annum → anno → año），ñ 代表兩個 n 融合發音。特別注意：año（年）和 ano（肛門）拼寫差一個 ñ，發音也不同！",
    },
    evolution: "直接從拉丁語演化，意思不變；主要用於計時和說明年齡。",
    grammarNote: "陽性名詞（m.）。年齡固定用 tener + X + años（有 X 歲），不用 ser。el año pasado（去年）/ el año que viene（明年）/ este año（今年）。",
    examples: [
      { es: "Tengo veinte años.", zh: "我二十歲。", note: "年齡必須用 tener；años 用複數（即使只有一歲也說 tiene un año）。" },
      { es: "El año pasado viajé a España.", zh: "去年我去了西班牙。", note: "el año pasado 是「去年」的固定說法。" },
      { es: "¡Feliz Año Nuevo!", zh: "新年快樂！", note: "año 大寫因為是節日名稱的一部分。" },
    ],
    wordFamily: [
      { word: "anual", zh: "每年的、年度的" },
      { word: "cumpleaños", zh: "生日（cumple + años = 滿 X 歲的日子）" },
    ],
    shortSummary: "año = 年，也用來說歲數（tener X años）；記住 ñ 很重要——少了就變成另一個完全不同的詞！",
  },
};

export function lookupDeep(rawWord) {
  const clean = (rawWord || "")
    .toLowerCase()
    .trim()
    .replace(/^[¿¡«"'(¡]+|[.,;:!?»"')¿¡]+$/g, "");
  if (!clean) return null;

  // 1. Exact match in entries
  if (entries[clean]) return entries[clean];

  // 2. Redirect then entries
  const t1 = conjugationRedirects[clean];
  if (t1 && entries[t1]) return entries[t1];

  // 3. Strip diacritics and retry
  const stripped = clean.normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (stripped !== clean) {
    if (entries[stripped]) return entries[stripped];
    const t2 = conjugationRedirects[stripped];
    if (t2 && entries[t2]) return entries[t2];
  }

  return null;
}

export default entries;
