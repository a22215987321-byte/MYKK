// lib/spanishClosedClass.js
// 西語「封閉詞類」資料庫：代名詞、冠詞、介系詞、連接詞、疑問詞。
// 這些詞初學者最容易卡住——不是因為難記，而是因為一般字典只給單一翻譯，
// 沒解釋「它在句子裡到底在幹嘛」。每個詞條都包含：詞性、中文、英文、
// 核心概念（為什麼要這樣用）、初學者提示、例句。

export const POS_LABELS = {
  "pronoun-subject": "主格代名詞",
  "pronoun-object": "受詞代名詞",
  "pronoun-reflexive": "反身代名詞",
  "article-def": "定冠詞",
  "article-indef": "不定冠詞",
  preposition: "介系詞",
  conjunction: "連接詞",
  question: "疑問詞",
  affirmative: "肯定詞",
  demonstrative: "指示詞",
  "possessive-adj": "所有格形容詞",
  "possessive-pron": "所有格代名詞",
};

// 每個詞條: { word, pos, posLabel, zh, en, coreConcept, tip, examples:[{es,zh,note}], related:[] }
const ENTRIES = {
  // ── 主格代名詞 ──────────────────────────────────────────────────────
  yo: {
    word: "yo", pos: "pronoun-subject", zh: "我",
    en: "I",
    coreConcept: "西語的動詞變位本身已經包含「誰做動作」的資訊（hablo 就是「我說」），所以主格代名詞常常被省略——只有在需要強調或對比時才會特別說出 yo。",
    tip: "不要每句話都加 yo，西語母語者反而會加得比較少；動詞字尾就已經告訴你主詞是誰了。",
    examples: [
      { es: "Yo hablo español y él habla inglés.", zh: "我說西語，他說英語。", note: "特別加 yo 是為了跟後面的「他」做對比。" },
      { es: "Hablo español.", zh: "我說西語。", note: "更自然的說法：省略 yo，因為 hablo 已經表明是「我」。" },
    ],
    related: ["tú", "él"],
  },
  "tú": {
    word: "tú", pos: "pronoun-subject", zh: "你（非正式）",
    en: "you (informal)",
    coreConcept: "非正式、熟悉對象用的「你」，跟正式場合用的 usted 是不同的兩套系統——選錯會顯得不禮貌或太生疏。",
    tip: "注意重音：tú（你，主詞）vs. tu（你的，所有格，無重音）——拼字只差一個重音符號，意思完全不同。",
    examples: [
      { es: "¿Tú de dónde eres?", zh: "你是哪裡人？", note: "朋友、同齡人之間的自然問法。" },
    ],
    related: ["usted", "yo"],
  },
  "él": {
    word: "él", pos: "pronoun-subject", zh: "他",
    en: "he",
    coreConcept: "陽性第三人稱單數主詞。因為動詞變位已包含人稱資訊，él 常被省略，只在需要明確指出「是他」或避免混淆時才說出來。",
    tip: "注意重音：él（他，代名詞）vs. el（這個/那個，冠詞，無重音）——拼字只差重音符號，意思完全不同，千萬別搞混。",
    examples: [
      { es: "Él es médico.", zh: "他是醫生。", note: "身份句必須有明確主詞時會保留 él。" },
    ],
    related: ["ella", "usted"],
  },
  ella: {
    word: "ella", pos: "pronoun-subject", zh: "她",
    en: "she",
    coreConcept: "陰性第三人稱單數主詞，用法跟 él 完全對稱。",
    tip: "跟 él 一樣，動詞變位相同時常被省略，只在需要指明性別/對比時才說出來。",
    examples: [
      { es: "Ella es española.", zh: "她是西班牙人。", note: "國籍/身份句常保留主詞以求清楚。" },
    ],
    related: ["él", "usted"],
  },
  usted: {
    word: "usted", pos: "pronoun-subject", zh: "您（正式）",
    en: "you (formal)",
    coreConcept: "正式、尊敬場合用的「你」，動詞變位跟「他/她」用同一套（第三人稱），這是初學者常忽略的重點——usted 文法上等於「他/她」，不是 tú 的變化。",
    tip: "對長輩、陌生人、服務業場合用 usted；縮寫常寫作 Ud. 或 Vd.。動詞要用第三人稱變位：¿Usted tiene...?（不是 ¿Usted tienes...?）。",
    examples: [
      { es: "¿Cómo está usted?", zh: "您好嗎？", note: "正式問候，對長輩或陌生人使用。" },
      { es: "¿En qué le puedo ayudar?", zh: "我可以幫您什麼忙？", note: "服務業對 usted 說話時，用 le（間接受詞）呼應。" },
    ],
    related: ["tú"],
  },
  nosotros: {
    word: "nosotros", pos: "pronoun-subject", zh: "我們（陽性或男女混合）",
    en: "we (masculine or mixed group)",
    coreConcept: "「我們」的陽性/混合性別形式；全女性群體要用 nosotras。",
    tip: "只要團體裡有一個男性，就整體用 nosotros（陽性形式優先），這是西語文法的通則。",
    examples: [
      { es: "Nosotros somos estudiantes.", zh: "我們是學生。", note: "陽性或混合群體。" },
    ],
    related: ["nosotras", "vosotros"],
  },
  nosotras: {
    word: "nosotras", pos: "pronoun-subject", zh: "我們（純陰性）",
    en: "we (all-female group)",
    coreConcept: "只有在整個群體都是女性時才用這個形式。",
    tip: "只要有任何一位男性在群體裡，就要改回 nosotros。",
    examples: [
      { es: "Nosotras somos hermanas.", zh: "我們是姐妹。", note: "純女性群體。" },
    ],
    related: ["nosotros"],
  },
  vosotros: {
    word: "vosotros", pos: "pronoun-subject", zh: "你們（非正式，僅西班牙用法）",
    en: "you all (informal, Spain)",
    coreConcept: "西班牙本土用的非正式「你們」；拉丁美洲幾乎都用 ustedes 取代（不分正式/非正式）。",
    tip: "如果主要學拉美西語，可以先知道有這個詞、看得懂即可，不必急著在口語中使用。",
    examples: [
      { es: "¿Vosotros sois de Madrid?", zh: "你們是馬德里人嗎？", note: "西班牙用法；拉美會說 ¿Ustedes son de Madrid?" },
    ],
    related: ["ustedes"],
  },
  vosotras: {
    word: "vosotras", pos: "pronoun-subject", zh: "你們（非正式，純陰性，僅西班牙用法）",
    en: "you all (informal, all-female, Spain)",
    coreConcept: "vosotros 的純女性版本，一樣只在西班牙本土口語常見。",
    tip: "跟 nosotras 同樣的規則：群體全為女性才用。",
    examples: [
      { es: "¿Vosotras queréis venir?", zh: "妳們想來嗎？", note: "西班牙用法，對純女性群體。" },
    ],
    related: ["vosotros"],
  },
  ellos: {
    word: "ellos", pos: "pronoun-subject", zh: "他們（陽性或男女混合）",
    en: "they (masculine or mixed group)",
    coreConcept: "第三人稱複數，陽性或混合群體。動詞變位跟 ellas/ustedes 共用同一組。",
    tip: "跟 nosotros 規則一樣：只要有一位男性，整體用 ellos。",
    examples: [
      { es: "Ellos tienen dos coches.", zh: "他們有兩輛車。", note: "陽性或混合群體。" },
    ],
    related: ["ellas", "ustedes"],
  },
  ellas: {
    word: "ellas", pos: "pronoun-subject", zh: "她們（純陰性）",
    en: "they (all-female group)",
    coreConcept: "純女性群體專用的第三人稱複數。",
    tip: "動詞變位跟 ellos/ustedes 完全相同，差別只在後面接的形容詞要用陰性形式。",
    examples: [
      { es: "Ellas son muy simpáticas.", zh: "她們人很好。", note: "陰性形容詞 simpáticas 呼應 ellas。" },
    ],
    related: ["ellos"],
  },
  ustedes: {
    word: "ustedes", pos: "pronoun-subject", zh: "您們／你們（第三人稱複數，涵蓋正式與非正式）",
    en: "you all (formal and informal in Latin America)",
    coreConcept: "在拉丁美洲，ustedes 同時取代西班牙的 vosotros（非正式）和 ustedes（正式）——不分場合，一律用它。動詞變位跟 ellos/ellas 相同。",
    tip: "跟服務生、朋友群體說話時，拉美西語都用 ustedes + 第三人稱複數動詞，不需要糾結正式/非正式。",
    examples: [
      { es: "¿Ustedes tienen mesa para cuatro?", zh: "你們有四人桌嗎？", note: "餐廳常用句，拉美不分正式/非正式都用 ustedes。" },
    ],
    related: ["vosotros", "usted"],
  },
  "sí": {
    word: "sí", pos: "affirmative", zh: "是的、對（肯定回答）",
    en: "yes",
    coreConcept: "最基本的肯定回答詞。也可以加強語氣，放在動詞前面表示「真的有／真的是」（Sí quiero = 我真的想要）。",
    tip: "注意重音：sí（是的，有重音）vs. si（如果，無重音，連接詞）——意思完全不同，打字/看文章時要看清楚重音符號。",
    examples: [
      { es: "—¿Quieres venir? —Sí, claro.", zh: "—你想來嗎？—對，當然。", note: "最基本的肯定回答。" },
      { es: "Sí quiero ir, pero no puedo.", zh: "我真的想去，但是不能去。", note: "sí 放動詞前加強語氣：真的想。" },
    ],
    related: ["si"],
  },

  // ── 受詞 / 反身代名詞 ────────────────────────────────────────────────
  me: {
    word: "me", pos: "pronoun-object", zh: "我（受詞形式）",
    en: "me / to me / myself",
    coreConcept: "me 同時可以是「直接受詞」（把動作用在我身上）、「間接受詞」（把東西給我／對我做）、或「反身」（動作反過來作用在自己身上）。哪一種要看動詞。",
    tip: "先看動詞：gustar/parecer 這類「反過來說」的動詞後面的 me 是間接受詞（me gusta = 讓我喜歡）；-arse/-erse/-irse 反身動詞的 me 就是「自己」。",
    examples: [
      { es: "Me llama todos los días.", zh: "他每天打電話給我。", note: "直接受詞：llamar a alguien（打給某人）。" },
      { es: "Me gusta el café.", zh: "我喜歡咖啡。", note: "間接受詞：字面是「咖啡讓我喜歡」。" },
      { es: "Me levanto a las siete.", zh: "我七點起床。", note: "反身：levantarse = 讓自己起來。" },
    ],
    related: ["te", "se", "nos", "os"],
  },
  te: {
    word: "te", pos: "pronoun-object", zh: "你（受詞形式）",
    en: "you / to you / yourself",
    coreConcept: "跟 me 一樣身兼三種角色（直接受詞／間接受詞／反身），對應「你」。只在跟 tú 對話時使用。",
    tip: "口語中出現頻率極高：Te quiero（我愛你）、¿Te gusta?（你喜歡嗎）、¿Cómo te llamas?（你叫什麼名字，字面：你怎麼稱呼自己）。",
    examples: [
      { es: "Te quiero mucho.", zh: "我很愛你。", note: "直接受詞。" },
      { es: "¿Te gusta bailar?", zh: "你喜歡跳舞嗎？", note: "間接受詞：字面「跳舞讓你喜歡嗎」。" },
      { es: "¿Cómo te llamas?", zh: "你叫什麼名字？", note: "反身：llamarse = 稱自己為。" },
    ],
    related: ["me", "se", "os"],
  },
  se: {
    word: "se", pos: "pronoun-reflexive", zh: "自己（他/她/您/他們/您們）",
    en: "himself / herself / yourself(formal) / themselves / oneself",
    coreConcept: "se 永遠指「第三人稱對自己做動作」，或代表「沒有明確主詞的一般狀態」（無人稱句：se habla español = 這裡講西語）。它不是「他」或「她」本身，而是「動作繞回主詞自己」的信號。",
    tip: "看到 se + 動詞，先問：這個動作的對象是不是就是主詞本身？如果句子沒有明確主詞（像廣告招牌），se 常常是「一般人／大家」的意思，不用硬翻成「他自己」。",
    examples: [
      { es: "Se llama Ana.", zh: "她叫 Ana。", note: "反身：字面「她稱自己為 Ana」。" },
      { es: "Se venden libros aquí.", zh: "這裡有書賣（書在這裡被賣）。", note: "無人稱用法，常見於招牌、公告。" },
      { es: "Ellos se conocen bien.", zh: "他們彼此很熟。", note: "相互用法：se conocen = 互相認識。" },
    ],
    related: ["me", "te"],
  },
  nos: {
    word: "nos", pos: "pronoun-object", zh: "我們（受詞形式）",
    en: "us / to us / ourselves",
    coreConcept: "跟 me/te 一樣，可以是直接受詞、間接受詞，或反身，對應「我們」。",
    tip: "常見固定用語：Nos vemos（再見，字面「我們互相看見」）、Nos gusta（我們喜歡）。",
    examples: [
      { es: "Nos vemos mañana.", zh: "我們明天見。", note: "相互反身：字面「我們互相看見」，是最常見的道別語之一。" },
      { es: "Nos gusta viajar.", zh: "我們喜歡旅行。", note: "間接受詞：字面「旅行讓我們喜歡」。" },
      { es: "Nos llamamos por teléfono.", zh: "我們互相打電話。", note: "反身：llamarse 的 nosotros 形式。" },
    ],
    related: ["me", "te", "os"],
  },
  os: {
    word: "os", pos: "pronoun-object", zh: "你們（受詞形式，僅西班牙 vosotros 用法）",
    en: "you all (informal, Spain) / to you all / yourselves",
    coreConcept: "只在對應 vosotros（你們，西班牙用法）時出現；拉丁美洲通常用 ustedes + les/los/las 取代。",
    tip: "如果只學拉美西語，可以先知道它的存在即可，不必急著背——但看西班牙的影片/文章時一定會遇到。",
    examples: [
      { es: "¿Os gusta la película?", zh: "你們喜歡這部電影嗎？", note: "西班牙口語，拉美會說 ¿Les gusta...?" },
      { es: "Os veo el lunes.", zh: "我週一見你們。", note: "直接受詞。" },
    ],
    related: ["nos", "les"],
  },
  lo: {
    word: "lo", pos: "pronoun-object", zh: "它 / 他（代替前面提過的東西）",
    en: "it / him (referring to something already mentioned)",
    coreConcept: "lo 不是固定翻「它」。它是「直接受詞代名詞」，代表句子前面（或情境中）已經知道的陽性單數東西或整件事——用來取代重複的名詞，不必再說一次。",
    tip: "看到 lo，先往前（或往情境裡）找：它代替的是哪個名詞？找到那個名詞，才能準確翻譯；很多時候翻成中文根本不需要把 lo 講出來。",
    examples: [
      { es: "¿Lo tienen en azul?", zh: "有藍色的嗎？", note: "Lo = 那件商品（前面提過的東西）。自然中文不必逐字翻出「它」。" },
      { es: "No lo sé.", zh: "我不知道。", note: "lo 代替「那件事」，是固定搭配，幾乎不能拆開想。" },
      { es: "Lo compré ayer.", zh: "我昨天買了它/買了那個。", note: "lo 指前面提過的某樣東西。" },
    ],
    related: ["la", "los", "las", "le"],
  },
  la: {
    word: "la", pos: "pronoun-object", zh: "她 / 它（陰性，代替前面提過的東西）",
    en: "her / it (feminine, referring to something already mentioned)",
    coreConcept: "跟 lo 是同一組（直接受詞代名詞），差別只在陰性單數。也可能是「定冠詞」（見下方冠詞條目），要看它前面有沒有名詞跟著——沒有名詞跟著、單獨站在動詞前後的 la，就是代名詞。",
    tip: "分辨技巧：la casa 的 la 是冠詞（後面接名詞 casa）；La veo 的 la 是代名詞（後面直接接動詞，代替某個陰性名詞）。",
    examples: [
      { es: "¿La tienen en rojo?", zh: "有紅色的嗎？（那件陰性商品）", note: "跟「¿Lo tienen en azul?」是同一句型，只是被代替的東西是陰性名詞。" },
      { es: "La veo mañana.", zh: "我明天見她。", note: "la 代替「她」這個人。" },
    ],
    related: ["lo", "los", "las"],
  },
  los: {
    word: "los", pos: "pronoun-object", zh: "他們 / 它們（陽性複數，代替前面提過的東西）",
    en: "them (masculine plural, referring to things already mentioned)",
    coreConcept: "lo 的複數版，代替陽性複數的人或物。跟冠詞 los（見下方）長得一樣，要看後面有沒有名詞跟著來分辨。",
    tip: "los libros 的 los 是冠詞；Los compré 的 los 是代名詞（代替「那些書」）。",
    examples: [
      { es: "¿Los tienen en talla M?", zh: "有 M 號的嗎？（那些陽性商品）", note: "los 代替前面提過的一批商品。" },
      { es: "Los vi ayer en el parque.", zh: "我昨天在公園看到他們了。", note: "los 代替「他們」（一群男生或男女混合）。" },
    ],
    related: ["lo", "la", "las"],
  },
  las: {
    word: "las", pos: "pronoun-object", zh: "她們 / 它們（陰性複數，代替前面提過的東西）",
    en: "them (feminine plural, referring to things already mentioned)",
    coreConcept: "la 的複數版，代替陰性複數的人或物。",
    tip: "同樣要看後面有沒有名詞：las tiendas（冠詞+名詞）vs. Las cerré（代名詞，代替「那些店」）。",
    examples: [
      { es: "¿Las tienen en azul?", zh: "有藍色的嗎？（那些陰性商品，例如 camisetas）", note: "跟使用者範例句『¿Lo tienen en azul?』對照：主詞性別/單複數不同，代名詞跟著換。" },
      { es: "Las llamé por la mañana.", zh: "我早上打給她們了。", note: "las 代替「她們」。" },
    ],
    related: ["lo", "la", "los"],
  },
  le: {
    word: "le", pos: "pronoun-object", zh: "給他 / 給她 / 給您（間接受詞）",
    en: "to him / to her / to you (formal), indirect object",
    coreConcept: "le 永遠是「間接受詞」——動作的方向，不是動作直接作用的對象。回答「給誰、對誰、為誰做」這個問題。",
    tip: "常見句型 ¿En qué le puedo ayudar?（我可以幫您什麼忙？）裡的 le 就是「幫『您』」——先找出間接受詞指的是誰，比硬翻譯更重要。",
    examples: [
      { es: "Le doy el libro.", zh: "我把書給他/她。", note: "le = 間接受詞（給誰），el libro 才是直接受詞（給什麼）。" },
      { es: "¿En qué le puedo ayudar?", zh: "我可以幫您什麼忙？", note: "服務業最常見的禮貌問句，le 指「您」。" },
      { es: "Le escribo un correo.", zh: "我寫一封信給他/她。", note: "le = 收信人。" },
    ],
    related: ["les", "lo", "la"],
  },
  les: {
    word: "les", pos: "pronoun-object", zh: "給他們 / 給她們 / 給您們（間接受詞，複數）",
    en: "to them / to you all (formal), indirect object",
    coreConcept: "le 的複數版，一樣是間接受詞，回答「給誰、對誰」，只是對象變成一群人。",
    tip: "跟 gustar 類動詞連用非常常見：Les gusta（他們喜歡）＝字面「這件事讓他們喜歡」。",
    examples: [
      { es: "Les gusta el fútbol.", zh: "他們喜歡足球。", note: "les = 間接受詞（喜歡的人），el fútbol 才是主詞。" },
      { es: "Les envío el correo mañana.", zh: "我明天把信寄給他們。", note: "les 指收件人。" },
    ],
    related: ["le", "los", "las"],
  },

  // ── 定冠詞 / 不定冠詞 ────────────────────────────────────────────────
  el: {
    word: "el", pos: "article-def", zh: "這個 / 那個（陽性單數定冠詞）",
    en: "the (masculine singular)",
    coreConcept: "定冠詞代表「說話者和聽者都知道是哪一個」的特定東西，而不是「隨便一個」。el 用在陽性單數名詞前。",
    tip: "注意跟重音符號的 él（他）不同——沒有重音的 el 是冠詞，有重音的 él 是代名詞「他」。",
    examples: [
      { es: "El libro está en la mesa.", zh: "那本書在桌上。", note: "el libro = 那本（特定的）書。" },
      { es: "Voy a casa.", zh: "我回家。", note: "固定用法 a casa 不加冠詞，是例外，必須背下來。" },
    ],
    related: ["la", "los", "las"],
  },
  la_article: {
    word: "la", pos: "article-def", zh: "這個 / 那個（陰性單數定冠詞）",
    en: "the (feminine singular)",
    coreConcept: "跟 el 是同一組定冠詞，只差在名詞的陰陽性。用在陰性單數名詞前。",
    tip: "跟代名詞 la（見上方）拼寫完全一樣：後面直接接名詞就是冠詞（la casa），單獨代替名詞、接在動詞旁邊就是代名詞（La veo）。",
    examples: [
      { es: "La casa es bonita.", zh: "那間房子很漂亮。", note: "la casa = 那間（特定的）房子。" },
    ],
    related: ["el", "los", "las"],
  },
  los_article: {
    word: "los", pos: "article-def", zh: "這些 / 那些（陽性複數定冠詞）",
    en: "the (masculine plural)",
    coreConcept: "el 的複數版，用在陽性複數名詞前。",
    tip: "西語形容詞和冠詞都要跟名詞的性別、單複數一致——los 一定搭配陽性複數名詞（los libros，不會是 los casas）。",
    examples: [
      { es: "Los estudiantes estudian mucho.", zh: "那些學生學習很多。", note: "los estudiantes = 那些（特定的）學生。" },
    ],
    related: ["el", "la", "las"],
  },
  las_article: {
    word: "las", pos: "article-def", zh: "這些 / 那些（陰性複數定冠詞）",
    en: "the (feminine plural)",
    coreConcept: "la 的複數版，用在陰性複數名詞前。",
    tip: "跟代名詞 las 拼寫一樣，靠後面有沒有名詞來分辨。",
    examples: [
      { es: "Las casas son grandes.", zh: "那些房子很大。", note: "las casas = 那些（特定的）房子。" },
    ],
    related: ["el", "la", "los"],
  },
  un: {
    word: "un", pos: "article-indef", zh: "一個（陽性單數不定冠詞）",
    en: "a / an (masculine singular)",
    coreConcept: "不定冠詞代表「隨便一個、不特定的」東西——跟定冠詞（特定的那個）相反。用在陽性單數名詞前。",
    tip: "介紹職業時西語不加冠詞（Soy estudiante，不說 Soy un estudiante）——這是常見的初學者錯誤，反過來要小心。",
    examples: [
      { es: "Tengo un perro.", zh: "我有一隻狗。", note: "un perro = 一隻（不特定的）狗。" },
      { es: "Quiero un café, por favor.", zh: "請給我一杯咖啡。", note: "點餐時最自然的說法。" },
    ],
    related: ["una", "unos", "unas"],
  },
  una: {
    word: "una", pos: "article-indef", zh: "一個（陰性單數不定冠詞）",
    en: "a / an (feminine singular)",
    coreConcept: "un 的陰性版，用在陰性單數名詞前。",
    tip: "同一個詞根，配合名詞性別而已：un perro（陽）/ una casa（陰）。",
    examples: [
      { es: "Quiero una manzana.", zh: "我想要一顆蘋果。", note: "una manzana = 一顆（不特定的）蘋果。" },
    ],
    related: ["un", "unos", "unas"],
  },
  unos: {
    word: "unos", pos: "article-indef", zh: "一些（陽性複數不定冠詞）",
    en: "some (masculine plural)",
    coreConcept: "表示「一些、幾個」不特定數量的陽性名詞。",
    tip: "unos/unas 也常用來表示「大約」：unos veinte minutos（大約二十分鐘）。",
    examples: [
      { es: "Hay unos estudiantes en la clase.", zh: "班上有一些學生。", note: "unos estudiantes = 一些（不特定的）學生。" },
    ],
    related: ["un", "una", "unas"],
  },
  unas: {
    word: "unas", pos: "article-indef", zh: "一些（陰性複數不定冠詞）",
    en: "some (feminine plural)",
    coreConcept: "unos 的陰性版，表示「一些」不特定數量的陰性名詞。",
    tip: "同樣可以表示「大約」：unas tres horas（大約三小時）。",
    examples: [
      { es: "Necesito unas tijeras.", zh: "我需要一把剪刀。", note: "tijeras（剪刀）永遠是複數形式，所以搭配 unas。" },
    ],
    related: ["un", "una", "unos"],
  },

  // ── 介系詞 ──────────────────────────────────────────────────────────
  a: {
    word: "a", pos: "preposition", zh: "到、向、給（方向／對象）；人稱受詞前的標記",
    en: "to / at (direction, target); marks a person as object",
    coreConcept: "a 最核心的意思是「朝向某個方向或目標」。另一個重要功能：當受詞是「人」的時候，西語要求在前面加 a 做標記（叫做「人稱 a」），這在英語裡完全沒有對應。",
    tip: "看到動詞後面接 a + 人名，先別急著把 a 翻出來——它常常只是文法標記，不是真的「到」的意思。ir a + 地方/動詞原形也是固定搭配（近未來）。",
    examples: [
      { es: "Voy a Madrid.", zh: "我要去馬德里。", note: "方向。" },
      { es: "Veo a mi madre.", zh: "我看到我媽媽。", note: "人稱 a：受詞是人，前面加 a，不必翻出來。" },
      { es: "Voy a estudiar.", zh: "我要去讀書了。", note: "ir a + 動詞原形 = 近未來，固定句型。" },
    ],
    related: ["de", "en"],
  },
  de: {
    word: "de", pos: "preposition", zh: "的、從、關於（所屬／來源）",
    en: "of / from (possession, origin, material)",
    coreConcept: "de 表示「從屬關係」：屬於誰的、從哪裡來的、用什麼做的。西語沒有像英語 's 的所有格，全部靠 de 完成。",
    tip: "el libro de María（María 的書）——順序跟中文相反，先說「書」再說「誰的」。",
    examples: [
      { es: "¿De dónde eres?", zh: "你是哪裡人？", note: "de dónde = 從哪裡，問來源/籍貫。" },
      { es: "Es el coche de mi padre.", zh: "這是我爸爸的車。", note: "de 表所屬，代替英語的 's。" },
      { es: "Una copa de vino.", zh: "一杯葡萄酒。", note: "de + 名詞，說明內容物。" },
    ],
    related: ["a", "en"],
  },
  en: {
    word: "en", pos: "preposition", zh: "在……（地點／時間）；用……（方式）",
    en: "in / on / at (place, time); by (means)",
    coreConcept: "en 標記「範圍內」——在某個空間裡、某段時間內，或用某種方式／某種顏色／某種尺寸（固定搭配，不是字面「用」）。很多時候不要逐字硬翻，先理解整個片語再翻成自然中文。",
    tip: "en azul／en rojo 這種「en + 顏色」是「⋯⋯色款」的固定用法，不是「用藍色」；先把整個片語當一個單位看，比拆開翻譯更準。",
    examples: [
      { es: "Vivo en Madrid.", zh: "我住在馬德里。", note: "en + 地點。" },
      { es: "¿Lo tienen en azul?", zh: "有藍色的嗎？", note: "en azul = 藍色款，是固定片語，不要逐字翻成「在藍色」。" },
      { es: "Vamos en coche.", zh: "我們坐車去。", note: "en + 交通工具，表示方式。" },
    ],
    related: ["a", "de", "con"],
  },
  con: {
    word: "con", pos: "preposition", zh: "跟……一起、用……（工具／同伴）",
    en: "with (accompaniment, instrument)",
    coreConcept: "con 表示「陪伴」（跟誰一起）或「使用的工具/方式」，跟英語 with 的用法很接近，是介系詞裡對中文母語者最直覺的一個。",
    tip: "conmigo（跟我）、contigo（跟你）是特殊合併形式，不是 con + mí / con + ti，要單獨背。",
    examples: [
      { es: "Voy con mi hermana.", zh: "我跟我姐姐一起去。", note: "con + 人 = 陪伴。" },
      { es: "Escribo con lápiz.", zh: "我用鉛筆寫字。", note: "con + 工具。" },
      { es: "¿Quieres venir conmigo?", zh: "你想跟我一起來嗎？", note: "conmigo = con + mí 的特殊合併形式。" },
    ],
    related: ["sin", "en"],
  },
  para: {
    word: "para", pos: "preposition", zh: "為了……、給……（目的／對象／期限）",
    en: "for / in order to (purpose, recipient, deadline)",
    coreConcept: "para 指向「目的地／最終目標」：做這件事是為了什麼、這東西是給誰的、期限是什麼時候。跟 por（過程/原因）常被搞混，關鍵在於 para 看向未來的終點，por 看向背後的原因。",
    tip: "para + 動詞原形 = 為了做⋯（目的）；para + 人 = 給某人的；para + 時間 = 截止日期。先問自己「這是終點/目的嗎？」是的話用 para。",
    examples: [
      { es: "Este regalo es para ti.", zh: "這份禮物是給你的。", note: "para + 人 = 接收者。" },
      { es: "Estudio para aprender.", zh: "我讀書是為了學習。", note: "para + 動詞原形 = 目的。" },
      { es: "Lo necesito para el lunes.", zh: "我週一之前需要它。", note: "para + 時間 = 截止期限。" },
    ],
    related: ["por"],
  },
  por: {
    word: "por", pos: "preposition", zh: "因為……、經過……、透過……（原因／途徑）",
    en: "for / because of / through / by (cause, route, means)",
    coreConcept: "por 指向「起點／背後的原因」：因為什麼而做、經過什麼路線、透過什麼方式。跟 para（指向終點/目的）方向相反。",
    tip: "por qué（為什麼，兩個字）是疑問句；porque（因為，一個字）是回答——拼法很像但用法相反，初學者常混淆。",
    examples: [
      { es: "Gracias por tu ayuda.", zh: "謝謝你的幫助。", note: "por + 原因，說明感謝什麼。" },
      { es: "Hablo por teléfono.", zh: "我在打電話。", note: "por teléfono = 透過電話，固定搭配。" },
      { es: "Camino por el parque.", zh: "我走過公園。", note: "por + 地點 = 經過的路線（跟 en el parque「在公園裡」不同）。" },
    ],
    related: ["para", "porque"],
  },
  sin: {
    word: "sin", pos: "preposition", zh: "沒有……、不……",
    en: "without",
    coreConcept: "sin 表示「缺少某樣東西」，是 con（有／跟隨）的相反詞。",
    tip: "sin + 動詞原形 = 沒有做⋯就（Salió sin decir nada = 他什麼都沒說就走了）。",
    examples: [
      { es: "Café sin azúcar, por favor.", zh: "請給我不加糖的咖啡。", note: "sin + 名詞 = 不含⋯。" },
      { es: "Salió sin decir nada.", zh: "他什麼都沒說就離開了。", note: "sin + 動詞原形。" },
    ],
    related: ["con"],
  },
  sobre: {
    word: "sobre", pos: "preposition", zh: "在……上面；關於……",
    en: "on / above; about (topic)",
    coreConcept: "sobre 有兩個常見意思：物理位置「在⋯上方」，或抽象的「關於⋯這個主題」。",
    tip: "看句子談的是不是話題／書的內容，是的話 sobre 就是「關於」，不是「上面」。",
    examples: [
      { es: "El libro está sobre la mesa.", zh: "書在桌上。", note: "物理位置。" },
      { es: "Es un documental sobre animales.", zh: "這是一部關於動物的紀錄片。", note: "抽象主題：關於⋯。" },
    ],
    related: ["en"],
  },
  entre: {
    word: "entre", pos: "preposition", zh: "在……之間",
    en: "between / among",
    coreConcept: "表示兩個或多個對象之間的位置關係，物理或抽象都可以用。",
    tip: "entre tú y yo（在你我之間，秘密地說）是很常見的口語表達。",
    examples: [
      { es: "La tienda está entre el banco y la farmacia.", zh: "商店在銀行和藥局之間。", note: "物理位置。" },
      { es: "Entre nosotros, no me cae bien.", zh: "跟你說（我們之間的秘密），我不太喜歡他。", note: "抽象：私下之間。" },
    ],
    related: ["con"],
  },
  desde: {
    word: "desde", pos: "preposition", zh: "從……（時間或地點的起點）",
    en: "from / since",
    coreConcept: "desde 標記一個明確的「起點」——從某個時間點或地點開始，通常搭配「一直持續到現在／某處」的語感。",
    tip: "desde hace + 時間長度＝「⋯多久以前開始」（desde hace dos años = 兩年前開始，一直到現在）。",
    examples: [
      { es: "Vivo aquí desde 2020.", zh: "我從 2020 年就住在這裡。", note: "時間起點，持續至今。" },
      { es: "Desde mi casa hasta el trabajo hay 10 km.", zh: "從我家到公司有十公里。", note: "desde...hasta... = 從⋯到⋯，成對使用。" },
    ],
    related: ["hasta", "hace"],
  },
  hasta: {
    word: "hasta", pos: "preposition", zh: "到……為止（時間或地點的終點）；甚至",
    en: "until / up to; even",
    coreConcept: "hasta 標記「終點」，跟 desde（起點）成對出現。也可以當「甚至」用（強調到了意想不到的程度）。",
    tip: "¡Hasta luego!／¡Hasta mañana!（再見／明天見）字面是「直到之後／直到明天」，是很常見的道別語固定用法。",
    examples: [
      { es: "Trabajo hasta las seis.", zh: "我工作到六點。", note: "時間終點。" },
      { es: "¡Hasta luego!", zh: "再見（待會見）！", note: "固定道別語，字面「直到之後見」。" },
      { es: "Hasta el profesor se rió.", zh: "連老師都笑了。", note: "「甚至」的用法，強調程度。" },
    ],
    related: ["desde"],
  },
  hacia: {
    word: "hacia", pos: "preposition", zh: "朝……方向、往……",
    en: "toward",
    coreConcept: "表示動作的方向，強調「朝向」但不一定真的到達，跟 a（到達某個明確目的地）語感略有不同。",
    tip: "常搭配移動動詞：caminar hacia、mirar hacia（朝⋯看）。",
    examples: [
      { es: "Caminamos hacia el centro.", zh: "我們朝市中心走去。", note: "方向，不一定表示已抵達。" },
    ],
    related: ["a"],
  },

  // ── 連接詞 ──────────────────────────────────────────────────────────
  y: {
    word: "y", pos: "conjunction", zh: "和、與（連接兩個對等的東西）",
    en: "and",
    coreConcept: "連接兩個地位相等的詞、片語或句子，是最基礎的連接詞。",
    tip: "如果後面接的詞以 i-/hi- 開頭的音開始（例如 hijo），y 會變成 e 以避免發音重複：madre e hijo（母子）。",
    examples: [
      { es: "Pan y agua.", zh: "麵包和水。", note: "連接兩個名詞。" },
      { es: "Padre e hijo.", zh: "父子。", note: "hijo 開頭的 i 音，y 要變成 e。" },
    ],
    related: ["o", "pero"],
  },
  o: {
    word: "o", pos: "conjunction", zh: "或、或者（連接兩個互斥的選項）",
    en: "or",
    coreConcept: "連接兩個「二選一」的選項，是最基礎的選擇連接詞。",
    tip: "後面接以 o-/ho- 開頭的詞時，o 會變成 u 避免發音重複：siete u ocho（七或八）。",
    examples: [
      { es: "¿Té o café?", zh: "茶還是咖啡？", note: "二選一。" },
      { es: "Siete u ocho personas.", zh: "七或八個人。", note: "ocho 開頭的 o 音，o 要變成 u。" },
    ],
    related: ["y"],
  },
  pero: {
    word: "pero", pos: "conjunction", zh: "但是、不過（轉折）",
    en: "but",
    coreConcept: "連接兩個意思上有對比或轉折的句子，是最常見的轉折連接詞。",
    tip: "sino（而是）也翻成「但是」，但只用在「否定＋直接替換」的句型（No es rojo, sino azul = 不是紅色，而是藍色），不要跟 pero 混用。",
    examples: [
      { es: "Quiero ir, pero no tengo tiempo.", zh: "我想去，但是沒時間。", note: "一般轉折。" },
    ],
    related: ["sino", "aunque"],
  },
  porque: {
    word: "porque", pos: "conjunction", zh: "因為（回答原因，一個字）",
    en: "because",
    coreConcept: "porque 用來「回答」為什麼——引出原因子句，一個字連寫。",
    tip: "跟疑問詞 por qué（為什麼，兩個字、有重音）方向相反：por qué 用來問，porque 用來答。",
    examples: [
      { es: "No voy porque estoy enfermo.", zh: "我不去，因為我生病了。", note: "porque 引出原因。" },
    ],
    related: ["por qué", "pero"],
  },
  que: {
    word: "que", pos: "conjunction", zh: "（連接詞／關係代名詞）……的事、……的人",
    en: "that / which / who (connects clauses)",
    coreConcept: "que 是西語裡最常見、用法最多元的詞之一：可以連接兩個句子（creo que...＝我認為⋯），也可以當關係代名詞代替前面提過的人或物（el libro que leo＝我在讀的那本書）。它幾乎不能單獨翻成一個中文字，要看整個句型。",
    tip: "que 跟疑問詞 qué（什麼，有重音）不同：沒有重音的 que 是連接詞/關係代名詞，不是「什麼」的意思。",
    examples: [
      { es: "Creo que tienes razón.", zh: "我認為你是對的。", note: "que 連接兩個句子，本身不用翻譯。" },
      { es: "El libro que compré es interesante.", zh: "我買的那本書很有趣。", note: "que = 關係代名詞，代替「那本書」。" },
    ],
    related: ["qué"],
  },
  si: {
    word: "si", pos: "conjunction", zh: "如果（假設條件，沒有重音）",
    en: "if",
    coreConcept: "引出假設條件句：如果⋯就⋯。跟有重音的 sí（是的）拼寫幾乎一樣，靠重音符號區分。",
    tip: "si（如果，沒有重音）≠ sí（是的，有重音）——這是初學者最容易打錯/認錯的一對詞。",
    examples: [
      { es: "Si tengo tiempo, voy contigo.", zh: "如果我有時間，我就跟你一起去。", note: "si 引出條件。" },
    ],
    related: ["aunque"],
  },
  aunque: {
    word: "aunque", pos: "conjunction", zh: "雖然、儘管（讓步）",
    en: "although / even though",
    coreConcept: "引出一個「即使如此也不影響結果」的讓步子句。",
    tip: "aunque 後面接直陳式（陳述事實）或虛擬式（表示不確定/假設），意思會有些微差異，初學階段先掌握直陳式用法即可。",
    examples: [
      { es: "Aunque llueve, voy a salir.", zh: "雖然下雨，我還是要出門。", note: "讓步：即使下雨也不影響。" },
    ],
    related: ["pero"],
  },
  mientras: {
    word: "mientras", pos: "conjunction", zh: "當……的時候、同時",
    en: "while / meanwhile",
    coreConcept: "表示兩件事同時發生，強調「在⋯的同時」。",
    tip: "mientras tanto（與此同時）常單獨當副詞片語使用。",
    examples: [
      { es: "Escucho música mientras estudio.", zh: "我讀書的時候聽音樂。", note: "兩個動作同時進行。" },
    ],
    related: ["cuando"],
  },

  // ── 疑問詞 ──────────────────────────────────────────────────────────
  qué: {
    word: "qué", pos: "question", zh: "什麼（詢問事物、身份，或當感嘆詞）",
    en: "what",
    coreConcept: "問「是什麼」最直接的疑問詞。但搭配介系詞時，意思常常不是字面「什麼」，而是問「哪一方面」——要看整個句型，不要逐字翻。",
    tip: "¿En qué le puedo ayudar? 不是「在什麼我可以幫你」，而是「在哪方面可以幫您」——先理解整個固定問句，比拆解每個字更有用。",
    examples: [
      { es: "¿Qué es esto?", zh: "這是什麼？", note: "最基本的用法：問身份/名稱。" },
      { es: "¿Qué quieres?", zh: "你想要什麼？", note: "問想要的東西。" },
      { es: "¿En qué le puedo ayudar?", zh: "我可以幫您什麼忙？", note: "固定服務業問句，不要逐字翻譯「在哪方面」。" },
    ],
    related: ["que", "cuál"],
  },
  quién: {
    word: "quién", pos: "question", zh: "誰",
    en: "who",
    coreConcept: "詢問「人」的疑問詞，單數用 quién，複數用 quiénes。",
    tip: "¿De quién es esto?（這是誰的？）搭配 de 表示所屬，是常見固定句型。",
    examples: [
      { es: "¿Quién es?", zh: "是誰？", note: "問身份，敲門或接電話常用。" },
      { es: "¿De quién es este libro?", zh: "這本書是誰的？", note: "de quién = 誰的（所屬）。" },
    ],
    related: ["qué"],
  },
  cómo: {
    word: "cómo", pos: "question", zh: "怎麼、如何（詢問方式或狀態）",
    en: "how",
    coreConcept: "詢問「方式」或「狀態」的疑問詞，是初學者第一句話就會遇到的詞。",
    tip: "¿Cómo estás?（你好嗎，字面「你現在是怎樣的狀態」）跟 ¿Cómo te llamas?（你叫什麼名字，字面「你怎麼被稱呼」）是最重要的兩個固定句型，直接背下來。",
    examples: [
      { es: "¿Cómo estás?", zh: "你好嗎？", note: "問狀態，最常見的招呼語之一。" },
      { es: "¿Cómo te llamas?", zh: "你叫什麼名字？", note: "字面「你怎麼稱呼自己」。" },
      { es: "¿Cómo se dice \"gato\" en inglés?", zh: "「gato」用英語怎麼說？", note: "詢問說法/翻譯的固定句型。" },
    ],
    related: ["qué"],
  },
  cuándo: {
    word: "cuándo", pos: "question", zh: "什麼時候",
    en: "when",
    coreConcept: "詢問時間點的疑問詞。",
    tip: "跟連接詞 cuando（當⋯的時候，沒有重音）拼寫幾乎一樣，靠重音符號和是否為問句區分。",
    examples: [
      { es: "¿Cuándo llegas?", zh: "你什麼時候到？", note: "問時間點。" },
    ],
    related: ["dónde"],
  },
  dónde: {
    word: "dónde", pos: "question", zh: "哪裡",
    en: "where",
    coreConcept: "詢問地點的疑問詞。加上方向感時用 adónde（去哪裡）或 de dónde（從哪裡）。",
    tip: "¿De dónde eres?（你是哪裡人？）是自我介紹必學句型，字面是「你來自哪裡」。",
    examples: [
      { es: "¿Dónde está el baño?", zh: "洗手間在哪裡？", note: "問地點，旅遊必學句。" },
      { es: "¿De dónde eres?", zh: "你是哪裡人？", note: "問籍貫/來源地。" },
    ],
    related: ["cuándo"],
  },
  cuál: {
    word: "cuál", pos: "question", zh: "哪一個（在有限選項中做選擇）",
    en: "which (one)",
    coreConcept: "跟 qué 都可以問「什麼」，但 cuál 隱含「在幾個選項裡選一個」，qué 則是廣泛地問「這是什麼東西/類別」。",
    tip: "¿Cuál es tu nombre?（你的名字是什麼？正式問法）比 ¿Qué es tu nombre? 更道地——因為名字是從很多可能性裡「選出」屬於你的那一個。",
    examples: [
      { es: "¿Cuál prefieres, el rojo o el azul?", zh: "你比較喜歡哪一個，紅色還是藍色？", note: "在明確選項中選擇。" },
      { es: "¿Cuál es tu nombre?", zh: "你的名字是什麼？", note: "正式問法，比 qué 更道地。" },
    ],
    related: ["qué"],
  },
  cuánto: {
    word: "cuánto", pos: "question", zh: "多少（數量，陽性/不可數）",
    en: "how much",
    coreConcept: "詢問數量或程度，會隨後面名詞的性別/單複數變化：cuánto/cuánta/cuántos/cuántas。",
    tip: "¿Cuánto cuesta?（多少錢？）是購物必學句型，cuesta 來自動詞 costar（花費）。",
    examples: [
      { es: "¿Cuánto cuesta esto?", zh: "這個多少錢？", note: "購物最常用的問句。" },
      { es: "¿Cuántos años tienes?", zh: "你幾歲？", note: "cuántos 搭配陽性複數 años。" },
    ],
    related: ["qué"],
  },
};

// ── 指示詞：este/ese/aquel 三組，各有陰陽性/單複數/中性形式 ─────────────
// 同一組的所有形式共用同一張卡片內容（差別只在陰陽性/單複數，核心概念相同），
// 用共用物件參照而非複製貼上，之後要修內容只需改一個地方。
const ESTE_ENTRY = {
  word: "este", pos: "demonstrative", zh: "這個 / 這些（離說話者近的東西）",
  en: "this / these (near the speaker)",
  coreConcept: "西語指示詞跟中文一樣要分「離我近」還是「離對方/大家都遠」，但西語還要多分陰陽性、單複數。este 系列＝離說話者（我）最近的東西。",
  tip: "esto（中性、不分陰陽性）用來指「還不知道是什麼、不確定的東西/整件事」——例如 ¿Qué es esto?（這是什麼？），因為還不知道名詞的性別，不能說 este/esta。",
  examples: [
    { es: "Este libro es mío.", zh: "這本書是我的。", note: "este 修飾陽性單數名詞 libro。" },
    { es: "Esta camisa es bonita.", zh: "這件襯衫很漂亮。", note: "esta 修飾陰性單數名詞 camisa。" },
    { es: "¿Qué es esto?", zh: "這是什麼？", note: "esto = 中性，指不確定/還不知道是什麼的東西。" },
  ],
  related: ["ese", "aquel"],
};
const ESE_ENTRY = {
  word: "ese", pos: "demonstrative", zh: "那個 / 那些（離聽者近，或離說話者稍遠的東西）",
  en: "that / those (near the listener, or a bit farther from the speaker)",
  coreConcept: "ese 系列＝離「你」（聽的人）比較近的東西，或單純「不在說話者手邊」的東西——是三組指示詞裡最常泛用的一組。",
  tip: "eso（中性）常用來指「剛剛講的那件事」，例如 Eso es（就是這樣／沒錯），是很常見的口語附和用法。",
  examples: [
    { es: "Ese coche es rápido.", zh: "那輛車很快。", note: "ese 修飾陽性單數名詞 coche。" },
    { es: "¿Me pasas esa silla?", zh: "可以把那張椅子遞給我嗎？", note: "esa 修飾陰性單數名詞 silla。" },
    { es: "Eso es.", zh: "就是這樣／沒錯。", note: "eso = 中性，指前面提過的整件事。" },
  ],
  related: ["este", "aquel"],
};
const AQUEL_ENTRY = {
  word: "aquel", pos: "demonstrative", zh: "那個 / 那些（離說話者和聽者都遠的東西）",
  en: "that / those (over there, far from both speaker and listener)",
  coreConcept: "aquel 系列＝三組指示詞裡「最遠」的一組，常用來指遠處看得到但有點距離的東西，或是「很久以前」的時間。",
  tip: "aquel 也常用在講回憶、往事的時候：aquellos días（那些日子），帶有一點懷念的語感。",
  examples: [
    { es: "Aquel edificio es muy antiguo.", zh: "那棟（遠處的）建築很古老。", note: "aquel 修飾陽性單數名詞，強調距離遠。" },
    { es: "Aquella época fue difícil.", zh: "那個年代很艱難。", note: "aquella 修飾陰性單數名詞，指遙遠的過去。" },
  ],
  related: ["este", "ese"],
};

// ── 所有格形容詞（放名詞前，短形式）──────────────────────────────────
const MI_ENTRY = {
  word: "mi", pos: "possessive-adj", zh: "我的",
  en: "my",
  coreConcept: "放在名詞前面的「短形式」所有格，不跟名詞的性別配合，只跟單複數配合（mi/mis）。",
  tip: "跟受詞代名詞 me（我，見上方）不同：mi 後面一定接名詞（mi casa），me 後面接動詞（me gusta）。",
  examples: [
    { es: "Mi hermano vive en Madrid.", zh: "我哥哥住在馬德里。", note: "mi 不分陽陰性，只看單複數。" },
    { es: "Mis padres son de Perú.", zh: "我父母是秘魯人。", note: "mis = mi 的複數形式。" },
  ],
  related: ["mío", "tu", "su"],
};
const TU_POSESIVO_ENTRY = {
  word: "tu", pos: "possessive-adj", zh: "你的",
  en: "your (informal)",
  coreConcept: "跟 mi 同一組，放名詞前的短形式所有格，對應「你」。",
  tip: "注意重音：tu（你的，所有格，無重音）vs. tú（你，主詞代名詞，有重音）——意思完全不同。",
  examples: [
    { es: "¿Cuál es tu nombre?", zh: "你的名字是什麼？", note: "tu 修飾單數名詞 nombre。" },
    { es: "Tus amigos son simpáticos.", zh: "你的朋友人很好。", note: "tus = tu 的複數形式。" },
  ],
  related: ["tuyo", "mi", "su"],
};
// su/suyo 本身無法單靠字面判斷擁有者是誰——這是刻意保留的語意，不是資料不完整。
// possibleOwners/meaningsZh 是平行陣列（順序一一對應），ambiguous:true 讓
// GrammarLearningCard 顯示明確的「多義」標籤，而不是挑一個意思假裝唯一正確。
const SU_POSSIBLE_OWNERS = ["él", "ella", "usted", "ellos", "ellas", "ustedes"];
const SU_MEANINGS_ZH = ["他的", "她的", "您的", "他們的", "她們的", "您們的"];
const SU_DISAMBIGUATION = [
  { es: "el libro de él", zh: "他的書" },
  { es: "el libro de ella", zh: "她的書" },
  { es: "el libro de usted", zh: "您的書" },
  { es: "el libro de ellos", zh: "他們的書" },
  { es: "el libro de ellas", zh: "她們的書" },
  { es: "el libro de ustedes", zh: "您們的書" },
];

const SU_ENTRY = {
  word: "su", pos: "possessive-adj",
  type: "possessive-determiner",
  ambiguous: true,
  requiresContext: true,
  possibleOwners: SU_POSSIBLE_OWNERS,
  meaningsZh: SU_MEANINGS_ZH,
  zh: "他的／她的／您的／他們的／她們的／您們的——單看這個詞無法判斷是哪一個，必須靠上下文。",
  en: "his / her / your (formal) / their — ambiguous without context",
  coreConcept: "su 放在名詞前面，只跟後面「被擁有的東西」的單複數一致（su libro / sus libros），完全不隨擁有者的性別或人數改變寫法——這正是它身兼六種意思、單看字面判斷不出擁有者是誰的原因。",
  tip: "句子容易造成混淆時，西語母語者會直接改用「de + 人」代替 su，講得更清楚：el coche de ella（她的車）比 su coche 明確很多。",
  agreesWith: "possessed-noun-number",
  disambiguation: SU_DISAMBIGUATION,
  examples: [
    { es: "Su libro es interesante.", zh: "他/她/您/他們/她們/您們的書很有趣。", note: "su + 單數名詞 libro；擁有者是誰要看上下文。" },
    { es: "Sus libros son interesantes.", zh: "他/她/您/他們/她們/您們的書很有趣（複數）。", note: "sus = su 的複數形式，跟著 libros 的複數走，不是跟著擁有者。" },
    { es: "Juan habló con María sobre su trabajo.", zh: "Juan 跟 María 談到他/她的工作。", note: "歧義示範：su 可能指 Juan 的工作，也可能指 María 的工作，這句話本身無法確定，需要更多上下文。" },
  ],
  related: ["suyo", "mi", "tu"],
};
const NUESTRO_ADJ_ENTRY = {
  word: "nuestro", pos: "possessive-adj", zh: "我們的",
  en: "our",
  coreConcept: "「我們的」，是唯一會隨陰陽性也變化的所有格形容詞（nuestro/nuestra/nuestros/nuestras）。",
  tip: "跟 mi/tu/su 不同，nuestro 要配合後面名詞的陰陽性：nuestro coche（陽）vs. nuestra casa（陰）。",
  examples: [
    { es: "Nuestra casa está cerca.", zh: "我們的房子在附近。", note: "nuestra 配合陰性名詞 casa。" },
    { es: "Nuestros hijos estudian mucho.", zh: "我們的孩子們很用功。", note: "nuestros 配合陽性複數名詞 hijos。" },
  ],
  related: ["nuestro (代名詞)", "su"],
};
const VUESTRO_ENTRY = {
  word: "vuestro", pos: "possessive-adj", zh: "你們的（僅西班牙 vosotros 用法）",
  en: "your (plural, informal, Spain)",
  coreConcept: "對應 vosotros 的所有格，只在西班牙口語常見；拉丁美洲用 su（對應 ustedes）取代。",
  tip: "跟 nuestro 一樣要配合名詞陰陽性：vuestro/vuestra/vuestros/vuestras。",
  examples: [
    { es: "¿Es vuestra esta mesa?", zh: "這張桌子是你們的嗎？", note: "西班牙用法；拉美會說 ¿Es su mesa?" },
  ],
  related: ["su", "nuestro"],
};

// ── 所有格代名詞（重音形式，取代名詞、常跟定冠詞連用）──────────────────
const MIO_ENTRY = {
  word: "mío", pos: "possessive-pron", zh: "我的（那個/那些東西）",
  en: "mine",
  coreConcept: "所有格代名詞用來「取代」整個名詞，不是放在名詞前面修飾它——el mío 直接等於「我的那個」，不用再說一次名詞。",
  tip: "常跟 ser 連用來表示「這是誰的」：Este libro es mío.（這本書是我的。）——這時不加冠詞；但取代名詞時要加冠詞：el mío（我的那個）。",
  examples: [
    { es: "Este libro es mío.", zh: "這本書是我的。", note: "ser + mío，不加冠詞。" },
    { es: "Tu coche es azul, el mío es rojo.", zh: "你的車是藍色的，我的是紅色的。", note: "el mío = 取代「我的車」，加定冠詞。" },
  ],
  related: ["mi", "tuyo", "suyo"],
};
const TUYO_ENTRY = {
  word: "tuyo", pos: "possessive-pron", zh: "你的（那個/那些東西）",
  en: "yours (informal)",
  coreConcept: "mío 的「你」版本，一樣用來取代名詞。",
  tip: "跟 mío 同樣規則：ser + tuyo 不加冠詞，取代名詞時加冠詞（el tuyo）。",
  examples: [
    { es: "¿Es tuyo este paraguas?", zh: "這把傘是你的嗎？", note: "ser + tuyo，不加冠詞。" },
  ],
  related: ["tu", "mío", "suyo"],
};
// suyo/suya/suyos/suyas 的陰陽性、單複數要跟著「被擁有的東西」變化，不是跟著擁有者——
// 這正是使用者最容易搞反的地方，所以四個形式各自附上「跟哪個被擁有物一致」的說明和例句，
// 而不是讓四種寫法共用同一段內容、造成「隨便選一個看起來像的形式」的錯覺。
function buildSuyoEntry(form, agreesLabel, example) {
  return {
    word: form, pos: "possessive-pron",
    type: "possessive-pronoun-or-postnominal-adjective",
    ambiguous: true,
    requiresContext: true,
    agreesWithPossessedNoun: true,
    possibleOwners: SU_POSSIBLE_OWNERS,
    meaningsZh: SU_MEANINGS_ZH,
    zh: `他的／她的／您的／他們的／她們的／您們的（被擁有物是${agreesLabel}時用這個形式）——實際指誰，需要根據前後文判斷。`,
    en: "his / her / your (formal) / their (agrees with the thing owned, not the owner) — ambiguous without context",
    coreConcept: "suyo 系列的寫法（suyo/suya/suyos/suyas）只跟「被擁有的東西」的陰陽性、單複數一致，完全不受擁有者的性別影響——擁有者是男是女，只要東西是同一個，寫法就相同。",
    tip: `${form} 用在被擁有物是${agreesLabel}的時候。跟 su 一樣，容易混淆時口語更常直接說 el de él（他的那個）、el de ella（她的那個）等，意思更明確，不必猜。`,
    agreesWith: "possessed-noun-gender-number",
    disambiguation: SU_DISAMBIGUATION.map(d => ({ ...d })),
    examples: [example],
    related: ["su", "mío", "tuyo"],
  };
}

const SUYO_MASC_SG = buildSuyoEntry("suyo", "陽性單數", { es: "Este libro es suyo.", zh: "這本書是他/她/您/他們/她們/您們的。", note: "suyo 配合陽性單數的 libro，不是配合擁有者的性別。" });
const SUYA_FEM_SG = buildSuyoEntry("suya", "陰性單數", { es: "Esta maleta es suya.", zh: "這個行李箱是他/她/您/他們/她們/您們的。", note: "suya 配合陰性單數的 maleta，即使擁有者是男性也一樣寫 suya。" });
const SUYOS_MASC_PL = buildSuyoEntry("suyos", "陽性複數", { es: "Estos libros son suyos.", zh: "這些書是他/她/您/他們/她們/您們的。", note: "suyos 配合陽性複數的 libros。" });
const SUYAS_FEM_PL = buildSuyoEntry("suyas", "陰性複數", { es: "Estas maletas son suyas.", zh: "這些行李箱是他/她/您/他們/她們/您們的。", note: "suyas 配合陰性複數的 maletas，跟擁有者的性別無關。" });

Object.assign(ENTRIES, {
  este: ESTE_ENTRY, esta: ESTE_ENTRY, estos: ESTE_ENTRY, estas: ESTE_ENTRY, esto: ESTE_ENTRY,
  ese: ESE_ENTRY, esa: ESE_ENTRY, esos: ESE_ENTRY, esas: ESE_ENTRY, eso: ESE_ENTRY,
  aquel: AQUEL_ENTRY, aquella: AQUEL_ENTRY, aquellos: AQUEL_ENTRY, aquellas: AQUEL_ENTRY, aquello: AQUEL_ENTRY,

  mi: MI_ENTRY, mis: MI_ENTRY,
  tu: TU_POSESIVO_ENTRY, tus: TU_POSESIVO_ENTRY,
  su: SU_ENTRY, sus: SU_ENTRY,
  nuestro: NUESTRO_ADJ_ENTRY, nuestra: NUESTRO_ADJ_ENTRY, nuestros: NUESTRO_ADJ_ENTRY, nuestras: NUESTRO_ADJ_ENTRY,
  vuestro: VUESTRO_ENTRY, vuestra: VUESTRO_ENTRY, vuestros: VUESTRO_ENTRY, vuestras: VUESTRO_ENTRY,

  "mío": MIO_ENTRY, "mía": MIO_ENTRY, "míos": MIO_ENTRY, "mías": MIO_ENTRY,
  tuyo: TUYO_ENTRY, tuya: TUYO_ENTRY, tuyos: TUYO_ENTRY, tuyas: TUYO_ENTRY,
  suyo: SUYO_MASC_SG, suya: SUYA_FEM_SG, suyos: SUYOS_MASC_PL, suyas: SUYAS_FEM_PL,
});

export function lookupClosedClass(rawWord, opts = {}) {
  const { preferArticle = false } = opts;
  const clean = (rawWord || "")
    .toLowerCase()
    .trim()
    .replace(/^[¿¡«"'(]+|[.,;:!?»"')]+$/g, "");
  if (!clean) return null;

  // el/la/los/las are ambiguous between article and pronoun; the caller
  // (tokenizer) tells us via preferArticle whether a noun followed the word.
  if (preferArticle) {
    if (clean === "la" && ENTRIES.la_article) return ENTRIES.la_article;
    if (clean === "los" && ENTRIES.los_article) return ENTRIES.los_article;
    if (clean === "las" && ENTRIES.las_article) return ENTRIES.las_article;
  }
  if (ENTRIES[clean]) return ENTRIES[clean];

  // Deliberately NOT falling back to an accent-stripped match here: several of these
  // words form minimal pairs that mean something different with/without an accent
  // (el/él, tu/tú, si/sí, que/qué...). Guessing across that boundary would actively
  // mislead a beginner, so an unaccented miss just falls through to the next source.
  return null;
}

export default ENTRIES;
