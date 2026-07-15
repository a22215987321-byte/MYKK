// 給零基礎中文學習者的動詞友善解釋。目前涵蓋快捷按鈕列出的 17 個最重要動詞；
// 其餘動詞沒有這份資料時，頁面會直接省略「中文解釋」區塊，不會顯示假資料。

export const VERB_NOTES = {
  ser: {
    coreMeaning: "是；用來說明身份、本質、長期不變的特徵。",
    whenToUse: "說國籍、職業、身份、外貌／個性等長期特徵、時間日期時使用。",
    collocations: ["ser de", "ser bueno/a", "¿Qué hora es?"],
    commonMistakes: ["把暫時的狀態也用 ser（應該用 estar），例如「今天很累」要說 Estoy cansado，不是 Soy cansado。"],
    similarVerbDiff: "ser 用來說「本質、身份」；estar 用來說「位置、暫時的狀態」。",
    examples: [
      { es: "Soy estudiante.", zh: "我是學生。", en: "I am a student." },
      { es: "Ella es española.", zh: "她是西班牙人。", en: "She is Spanish." },
    ],
  },
  estar: {
    coreMeaning: "在；用來說明位置、暫時的狀態或情況。",
    whenToUse: "說某物／某人在哪裡、身體狀態、心情、正在進行的動作（estar + 現在分詞）時使用。",
    collocations: ["estar en", "estar bien/mal", "estar + gerundio"],
    commonMistakes: ["把身份、職業也用 estar，例如「我是學生」不能說 Estoy estudiante，要用 ser。"],
    similarVerbDiff: "estar 用來說「位置、暫時狀態」；ser 用來說「本質、身份」。",
    examples: [
      { es: "Estoy en casa.", zh: "我在家。", en: "I am at home." },
      { es: "¿Cómo estás?", zh: "你好嗎？", en: "How are you?" },
    ],
  },
  tener: {
    coreMeaning: "有；擁有。",
    whenToUse: "說擁有某物、表達年齡，以及大量固定用法（tener hambre 肚子餓等）。",
    collocations: ["tener años", "tener hambre/sed", "tener que + 原形（必須）"],
    commonMistakes: ["表達年齡不能用 ser：要說 Tengo veinte años，不是 Soy veinte años。"],
    similarVerbDiff: "tener 是「擁有」；haber 是助動詞或存在句「有（某地方有某物）」。",
    examples: [
      { es: "Tengo un hermano.", zh: "我有一個兄弟。", en: "I have a brother." },
      { es: "Tengo que estudiar.", zh: "我必須讀書。", en: "I have to study." },
    ],
  },
  ir: {
    coreMeaning: "去；前往。",
    whenToUse: "說去某個地方，也用於 ir a + 原形表達「即將要做的事」（近未來式）。",
    collocations: ["ir a + 地點", "ir a + 原形（即將）", "¡Vamos!"],
    commonMistakes: ["ir a 後面接地點時要用介詞 a：voy a la escuela，不能省略 a。"],
    similarVerbDiff: "ir 是「去」（朝向該處）；venir 是「來」（朝向說話者）。",
    examples: [
      { es: "Voy a la playa.", zh: "我要去海灘。", en: "I am going to the beach." },
      { es: "Voy a estudiar.", zh: "我即將要讀書。", en: "I am going to study." },
    ],
  },
  hacer: {
    coreMeaning: "做；製作。也用於天氣表達。",
    whenToUse: "說做某件事、天氣狀況（hace calor 天氣熱）、時間經過（hace dos años 兩年前）時使用。",
    collocations: ["hacer la tarea", "hace calor/frío", "hace + 時間（……之前）"],
    commonMistakes: ["天氣表達要用 hace，不能用 está：hace calor（正確），está calor（錯誤）。"],
    similarVerbDiff: "hacer 是「做」（製造、執行）；ser 是「是」（描述本質）。",
    examples: [
      { es: "Hago la comida.", zh: "我在做飯。", en: "I am making the food." },
      { es: "Hace mucho calor hoy.", zh: "今天很熱。", en: "It's very hot today." },
    ],
  },
  poder: {
    coreMeaning: "能夠、可以。表示能力或許可。",
    whenToUse: "說有能力做某事，或禮貌地詢問／請求許可。",
    collocations: ["poder + 原形", "¿Puedo...?（我可以……嗎？）"],
    commonMistakes: ["poder 後面直接接原形動詞，不需要加介詞：puedo nadar，不是 puedo a nadar。"],
    similarVerbDiff: "poder 是「能不能」（能力／許可）；saber 是「會不會」（技能）。",
    examples: [
      { es: "Puedo ayudarte.", zh: "我可以幫你。", en: "I can help you." },
      { es: "¿Puedo entrar?", zh: "我可以進來嗎？", en: "May I come in?" },
    ],
  },
  querer: {
    coreMeaning: "想要；愛。",
    whenToUse: "說想要某物或想做某事，也用來表達對人的愛（querer a alguien）。",
    collocations: ["querer + 原形", "querer a + 人", "quisiera（更禮貌的說法）"],
    commonMistakes: ["對人表達「愛」要加 a：Quiero a mi madre，不能省略 a。"],
    similarVerbDiff: "querer 是「想要」（比較直接）；preferir 是「比較喜歡」（在選項之間比較）。",
    examples: [
      { es: "Quiero un café.", zh: "我想要一杯咖啡。", en: "I want a coffee." },
      { es: "Te quiero.", zh: "我愛你。", en: "I love you." },
    ],
  },
  decir: {
    coreMeaning: "說；告訴。",
    whenToUse: "轉述某人說的話，或告訴別人某件事。",
    collocations: ["decir que...", "es decir（也就是說）"],
    commonMistakes: ["不要跟 hablar 混淆：decir 後面通常接「說的內容」，hablar 是單純「說話」這個動作。"],
    similarVerbDiff: "decir 強調「說了什麼內容」；hablar 強調「說話」這個動作本身。",
    examples: [
      { es: "Digo la verdad.", zh: "我說實話。", en: "I tell the truth." },
      { es: "¿Qué dices?", zh: "你在說什麼？", en: "What are you saying?" },
    ],
  },
  ver: {
    coreMeaning: "看；看見。",
    whenToUse: "說看見某物、看電視／電影，也用於 a ver（讓我看看）這類口語表達。",
    collocations: ["ver la televisión", "a ver（讓我看看）", "nos vemos（再見）"],
    commonMistakes: ["不要跟 mirar 混淆：ver 是「看見」（自然發生），mirar 是「注視」（主動看）。"],
    similarVerbDiff: "ver 是自然「看見」；mirar 是主動「盯著看」。",
    examples: [
      { es: "Veo una película.", zh: "我在看一部電影。", en: "I am watching a movie." },
      { es: "Nos vemos mañana.", zh: "我們明天見。", en: "See you tomorrow." },
    ],
  },
  dar: {
    coreMeaning: "給。",
    whenToUse: "說把某物給某人，也出現在許多固定用法裡（dar las gracias 道謝）。",
    collocations: ["dar las gracias", "dar un paseo（散步）", "me da igual（我都可以）"],
    commonMistakes: ["dar 後面接雙受詞時，間接受詞代詞不能省略：le doy el libro（給他書）。"],
    similarVerbDiff: "dar 是「給」（主動交付）；tener 是「有」（單純擁有）。",
    examples: [
      { es: "Te doy mi número.", zh: "我給你我的電話號碼。", en: "I'll give you my number." },
      { es: "Damos un paseo.", zh: "我們去散步。", en: "We take a walk." },
    ],
  },
  saber: {
    coreMeaning: "知道；會（技能）。",
    whenToUse: "說知道某個事實，或會不會某項技能（saber + 原形）。",
    collocations: ["saber + 原形（會做某事）", "saber que...", "¿Sabes...?"],
    commonMistakes: ["saber 後面直接接原形表達「會做」，不要跟 conocer（認識）混用。"],
    similarVerbDiff: "saber 是「知道事實／會技能」；conocer 是「認識人／熟悉地方」。",
    examples: [
      { es: "Sé nadar.", zh: "我會游泳。", en: "I know how to swim." },
      { es: "No sé la respuesta.", zh: "我不知道答案。", en: "I don't know the answer." },
    ],
  },
  venir: {
    coreMeaning: "來。",
    whenToUse: "說朝說話者所在的方向移動、來到某處。",
    collocations: ["venir a + 地點", "venir de + 地點（來自）"],
    commonMistakes: ["venir 是朝說話者移動，如果是朝別的地方去要用 ir，不能都用 venir。"],
    similarVerbDiff: "venir 是「來」（朝這裡）；ir 是「去」（朝那裡）。",
    examples: [
      { es: "Vengo de China.", zh: "我來自中國。", en: "I come from China." },
      { es: "¿Vienes conmigo?", zh: "你要跟我一起來嗎？", en: "Are you coming with me?" },
    ],
  },
  poner: {
    coreMeaning: "放；設置。",
    whenToUse: "說把某物放在某處，也用於許多固定用法（ponerse 反身式表示「變得……」）。",
    collocations: ["poner la mesa（擺餐桌）", "ponerse + 形容詞（變得……）"],
    commonMistakes: ["反身式 ponerse（穿上、變得）跟原本的 poner（放）意思不同，不要混淆。"],
    similarVerbDiff: "poner 是「放置」；dar 是「給予」，動作方向不同。",
    examples: [
      { es: "Pongo el libro en la mesa.", zh: "我把書放在桌上。", en: "I put the book on the table." },
      { es: "Me pongo nervioso.", zh: "我變得緊張。", en: "I get nervous." },
    ],
  },
  salir: {
    coreMeaning: "出去；離開。",
    whenToUse: "說離開某個地方、外出，也用於 salir con（跟某人交往）。",
    collocations: ["salir de + 地點", "salir con（跟……交往）"],
    commonMistakes: ["salir de 後面一定要接介詞 de 表示「從哪裡出去」，不能省略。"],
    similarVerbDiff: "salir 是「離開／出去」；venir 是「來」，方向相反。",
    examples: [
      { es: "Salgo de casa a las ocho.", zh: "我八點出門。", en: "I leave home at eight." },
      { es: "Salimos esta noche.", zh: "我們今晚要出去。", en: "We're going out tonight." },
    ],
  },
  hablar: {
    coreMeaning: "說話；說（某種語言）。",
    whenToUse: "說進行說話這個動作，或說會說哪種語言。",
    collocations: ["hablar de（談論）", "hablar con（跟……說話）", "hablar español"],
    commonMistakes: ["說語言時不用加冠詞：hablo español，不是 hablo el español。"],
    similarVerbDiff: "hablar 強調「說話」這個動作；decir 強調「說了什麼內容」。",
    examples: [
      { es: "Hablo español e inglés.", zh: "我會說西班牙語和英語。", en: "I speak Spanish and English." },
      { es: "Hablamos de música.", zh: "我們在談論音樂。", en: "We talk about music." },
    ],
  },
  comer: {
    coreMeaning: "吃。",
    whenToUse: "說吃東西這個動作，也可指「吃午餐／正餐」。",
    collocations: ["comer en（在……吃）", "dar de comer（餵食）"],
    commonMistakes: ["comer 是規則 -er 動詞，記得 vosotros 是 coméis 不是 comáis。"],
    similarVerbDiff: "comer 是「吃」；beber 是「喝」，兩者不要混用。",
    examples: [
      { es: "Como fruta todos los días.", zh: "我每天都吃水果。", en: "I eat fruit every day." },
      { es: "¿Dónde comemos hoy?", zh: "我們今天在哪裡吃飯？", en: "Where are we eating today?" },
    ],
  },
  vivir: {
    coreMeaning: "居住；生活。",
    whenToUse: "說住在哪裡，也可以泛指「活著、過生活」。",
    collocations: ["vivir en（住在）", "vivir con（跟……一起住）"],
    commonMistakes: ["vivir 是規則 -ir 動詞，記得 vosotros 是 vivís 不是 vivéis。"],
    similarVerbDiff: "vivir 是「居住／生活」；estar 只是「暫時在某處」，不代表長期居住。",
    examples: [
      { es: "Vivo en Madrid.", zh: "我住在馬德里。", en: "I live in Madrid." },
      { es: "Vivimos cerca de aquí.", zh: "我們住在這附近。", en: "We live near here." },
    ],
  },
};
