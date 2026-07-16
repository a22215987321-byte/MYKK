import { useState, useEffect } from "react";
import ClickableSpanishText from "./ClickableSpanishText";

// ── TTS ────────────────────────────────────────────────────────────────
function speak(text, rate = 0.85) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "es-ES"; u.rate = rate;
  window.speechSynthesis.speak(u);
}

// ── 文法主題資料（內容完全不變）─────────────────────────────────────────
const TOPICS = [
  {
    id: "pronouns", icon: "👤", title: "人稱代詞", color: "#6366f1",
    core: "西語有10個人稱代詞，分單複數和性別。最重要的是 usted（您）比英語多一層敬語。",
    context: "說「我說西語」「你是哪裡人」等基本句子時必用",
    rule: "西語常省略主語（動詞變位已包含人稱），但初學時可保留主語",
    table: {
      headers: ["代詞", "意思", "用法說明"],
      rows: [
        ["yo", "我", "第一人稱單數"],
        ["tú", "你（非正式）", "朋友、家人、同齡人"],
        ["él / ella", "他 / 她", "第三人稱單數"],
        ["usted", "您（正式）", "對長輩、陌生人的敬稱"],
        ["nosotros/as", "我們", "第一人稱複數"],
        ["vosotros/as", "你們（西班牙）", "拉美改用 ustedes"],
        ["ellos / ellas", "他們 / 她們", "男複數 / 全女複數"],
        ["ustedes", "你們（拉美）", "拉美口語正式用語"],
      ],
    },
    examples: [
      { es: "Yo soy estudiante.", zh: "我是學生。", breakdown: "Yo=我 soy=是 estudiante=學生" },
      { es: "Tú hablas muy bien.", zh: "你說得很好。", breakdown: "Tú=你 hablas=說 muy bien=很好" },
      { es: "Ella es de México.", zh: "她是墨西哥人。", breakdown: "Ella=她 es=是 de=來自 México=墨西哥" },
      { es: "Nosotros estudiamos juntos.", zh: "我們一起學習。", breakdown: "Nosotros=我們 estudiamos=學習 juntos=一起" },
    ],
    mistake: "西語動詞變位已含人稱，所以 Soy estudiante（無 yo）也完全正確",
    quiz: [
      { q: "「yo」是什麼意思？", opts: ["你", "他", "我", "我們"], ans: 2, exp: "yo = 我，是第一人稱單數" },
      { q: "對陌生長輩說「您好」，用哪個代詞？", opts: ["tú", "usted", "vosotros", "ellos"], ans: 1, exp: "usted 是敬稱「您」，用於正式場合或對長輩" },
      { q: "「ellas」代表哪個群體？", opts: ["男複數", "男女混合", "全女性複數", "第二人稱"], ans: 2, exp: "ellas 只用於全部是女性的群體，男女混合用 ellos" },
      { q: "拉美口語中「你們」用哪個詞？", opts: ["vosotros", "ustedes", "usted", "ellos"], ans: 1, exp: "拉美基本不用 vosotros，改用 ustedes 表示「你們」" },
      { q: "「Ella es de España」中 ella 的意思是？", opts: ["我", "她", "他", "你們"], ans: 1, exp: "ella = 她，是女性第三人稱單數" },
    ],
  },
  {
    id: "ser", icon: "🔵", title: "ser（永久屬性）", color: "#3b82f6",
    core: "ser 是「是」，用於永久或本質特徵：身分、職業、國籍、外貌特徵、時間",
    context: "自我介紹、描述外貌、說職業、說國籍",
    rule: "ser 完全不規則，必須背下6個變位",
    table: {
      headers: ["人稱", "ser", "例句"],
      rows: [
        ["yo", "soy", "Soy profesora.（我是老師）"],
        ["tú", "eres", "Eres muy inteligente.（你很聰明）"],
        ["él/ella/usted", "es", "Ella es de China.（她是中國人）"],
        ["nosotros", "somos", "Somos amigos.（我們是朋友）"],
        ["vosotros", "sois", "Sois estudiantes.（你們是學生）"],
        ["ellos/ustedes", "son", "Son muy simpáticos.（他們很友善）"],
      ],
    },
    examples: [
      { es: "Soy de Taiwan.", zh: "我是台灣人。", breakdown: "Soy=我是 de=來自 Taiwan=台灣" },
      { es: "Él es médico.", zh: "他是醫生。", breakdown: "Él=他 es=是 médico=醫生" },
      { es: "¿De dónde eres tú?", zh: "你是哪裡人？", breakdown: "¿De dónde=從哪裡 eres=你是 tú=你" },
      { es: "Somos hermanos.", zh: "我們是兄弟。", breakdown: "Somos=我們是 hermanos=兄弟" },
    ],
    mistake: "ser 不用於暫時狀態（位置、情緒），那要用 estar",
    quiz: [
      { q: "「我是」用 ser 怎麼說？", opts: ["eres", "es", "soy", "somos"], ans: 2, exp: "ser 的第一人稱是 soy，所以「我是」= soy" },
      { q: "「他是醫生」的 ser 形式？", opts: ["soy", "eres", "son", "es"], ans: 3, exp: "第三人稱單數（él）用 es，所以是 Él es médico" },
      { q: "「你們是學生」用哪個 ser 形式？", opts: ["soy", "somos", "son", "es"], ans: 2, exp: "ellos/ustedes 用 son，如 Ellos son estudiantes" },
      { q: "ser 通常用於哪種情況？", opts: ["暫時情緒", "當下位置", "永久身分或國籍", "正在發生的事"], ans: 2, exp: "ser 用於永久特徵：職業、國籍、外貌特徵、時間等" },
      { q: "「我們是朋友」怎麼說？", opts: ["Soy amigos", "Somos amigos", "Son amigos", "Eres amigos"], ans: 1, exp: "nosotros 的 ser 是 somos，所以是 Somos amigos" },
    ],
  },
  {
    id: "estar", icon: "🟢", title: "estar（暫時狀態）", color: "#10b981",
    core: "estar 也是「是/在」，但用於暫時狀態：位置、情緒、當下感受",
    context: "說「我在哪裡」「我現在很開心」「他累了」",
    rule: "estar 也不規則，第一人稱有特殊形式 estoy",
    table: {
      headers: ["人稱", "estar", "例句"],
      rows: [
        ["yo", "estoy", "Estoy cansado.（我累了）"],
        ["tú", "estás", "¿Cómo estás?（你好嗎？）"],
        ["él/ella/usted", "está", "Está en casa.（他在家）"],
        ["nosotros", "estamos", "Estamos aquí.（我們在這裡）"],
        ["vosotros", "estáis", "¿Estáis bien?（你們還好嗎？）"],
        ["ellos/ustedes", "están", "Están muy contentos.（他們很高興）"],
      ],
    },
    examples: [
      { es: "Estoy en la biblioteca.", zh: "我在圖書館。", breakdown: "Estoy=我在 en=在 la biblioteca=圖書館" },
      { es: "¿Cómo estás?", zh: "你好嗎？", breakdown: "¿Cómo=怎樣 estás=你的狀態" },
      { es: "Ella está enferma hoy.", zh: "她今天生病了。", breakdown: "Ella=她 está=現在是 enferma=生病的 hoy=今天" },
      { es: "Estamos muy contentos.", zh: "我們很高興。", breakdown: "Estamos=我們（狀態） muy=很 contentos=高興的" },
    ],
    mistake: "不要把 ser 和 estar 混用，「Soy cansado」在大多數情況下是錯的",
    quiz: [
      { q: "「我累了」怎麼說（用 estar）？", opts: ["Soy cansado", "Estoy cansado", "Eres cansado", "Es cansado"], ans: 1, exp: "estoy 是 estar 的 yo 形式，「我累了」= Estoy cansado（暫時狀態）" },
      { q: "「你在哪裡？」中 estar 的正確形式？", opts: ["estoy", "están", "estás", "está"], ans: 2, exp: "tú 的 estar 是 estás，如 ¿Dónde estás?" },
      { q: "「他們在圖書館」中 estar 用？", opts: ["estoy", "está", "estamos", "están"], ans: 3, exp: "ellos 的 estar 是 están，如 Están en la biblioteca" },
      { q: "estar 主要用於哪種情況？", opts: ["永久身分", "職業", "暫時狀態和位置", "時間"], ans: 2, exp: "estar 用於暫時情況：位置、情緒、當下狀態" },
      { q: "「¿Cómo estás?」是什麼意思？", opts: ["你是哪裡人？", "你叫什麼名字？", "你好嗎？", "你是學生嗎？"], ans: 2, exp: "¿Cómo estás? 直接翻譯是「你的狀態如何？」即「你好嗎？」" },
    ],
  },
  {
    id: "ser_vs_estar", icon: "⚖️", title: "ser 和 estar 的分別", color: "#8b5cf6",
    core: "ser 用於永久本質，estar 用於暫時狀態——這是西語最重要的文法概念之一",
    context: "描述人事物時幾乎每句都會用到",
    rule: "簡單口訣：「不會改變的用 ser，可能改變的用 estar」",
    table: {
      headers: ["情況", "用 ser", "用 estar"],
      rows: [
        ["身分/職業", "Soy médico（我是醫生）", "❌"],
        ["國籍/出身", "Soy de Taiwan（我是台灣人）", "❌"],
        ["外貌（本質）", "Ella es alta（她是高的）", "❌"],
        ["情緒/感受", "❌", "Estoy triste（我很難過）"],
        ["位置/地點", "❌", "Estoy en casa（我在家）"],
        ["暫時狀態", "❌", "Está enfermo hoy（他今天病了）"],
        ["特殊：味道感受", "❌", "Está rico（這很好吃）"],
      ],
    },
    examples: [
      { es: "Él es aburrido. / Él está aburrido.", zh: "他是個無聊的人。/ 他現在很無聊。", breakdown: "同一形容詞，ser=本性，estar=當下感受" },
      { es: "La sopa es rica. / La sopa está rica.", zh: "（❌不常用）/ 這湯很好喝。", breakdown: "食物「好吃」用 estar，因為是當下感受" },
      { es: "María es simpática.", zh: "Maria 是個友善的人。", breakdown: "ser=本性，永久特質" },
      { es: "María está contenta hoy.", zh: "Maria 今天很高興。", breakdown: "estar=今天的暫時情緒" },
    ],
    mistake: "記住：estar + 形容詞 = 當下的感受或狀態，ser + 形容詞 = 本質或性格",
    quiz: [
      { q: "「她是護士（職業）」用哪個動詞？", opts: ["estar", "ser", "tener", "hay"], ans: 1, exp: "職業是永久身分，用 ser：Ella es enfermera" },
      { q: "「我現在在超市」用哪個動詞？", opts: ["ser", "estar", "tener", "ir"], ans: 1, exp: "位置用 estar：Estoy en el supermercado" },
      { q: "「他今天很疲憊」用哪個動詞？", opts: ["ser", "estar", "hay", "tener"], ans: 1, exp: "暫時狀態（今天）用 estar：Él está muy cansado hoy" },
      { q: "「Ella es alta」的意思是？", opts: ["她今天很高", "她現在站很高", "她是個高個子（本質）", "她在高樓上"], ans: 2, exp: "ser + 形容詞 = 本質特徵，alta 是她的身材特質" },
      { q: "「這食物很好吃」西語用哪個動詞？", opts: ["ser", "estar", "tener", "hay"], ans: 1, exp: "食物的味道感受是暫時體驗，用 estar：Está delicioso" },
    ],
  },
  {
    id: "tener", icon: "✋", title: "tener（擁有/年齡）", color: "#f59e0b",
    core: "tener 意思是「有、擁有」，也用於表達年齡（西語不用 ser 說年齡）",
    context: "說「我有一隻狗」「我今年20歲」「你有兄弟姐妹嗎？」",
    rule: "tener 第一人稱是 tengo（特殊），其他人稱規則相對簡單",
    table: {
      headers: ["人稱", "tener", "例句"],
      rows: [
        ["yo", "tengo", "Tengo un perro.（我有一隻狗）"],
        ["tú", "tienes", "¿Tienes hermanos?（你有兄弟嗎？）"],
        ["él/ella/usted", "tiene", "Tiene 25 años.（他/她25歲）"],
        ["nosotros", "tenemos", "Tenemos clases hoy.（我們今天有課）"],
        ["vosotros", "tenéis", "¿Tenéis tiempo?（你們有時間嗎？）"],
        ["ellos/ustedes", "tienen", "Tienen mucha hambre.（他們很餓）"],
      ],
    },
    examples: [
      { es: "Tengo veinte años.", zh: "我二十歲。", breakdown: "Tengo=我有 veinte=二十 años=歲/年" },
      { es: "¿Tienes un momento?", zh: "你有一點時間嗎？", breakdown: "¿Tienes=你有 un momento=一刻鐘/一點時間" },
      { es: "Ella tiene mucho trabajo.", zh: "她有很多工作。", breakdown: "Ella tiene=她有 mucho=很多 trabajo=工作" },
      { es: "Tengo hambre.", zh: "我餓了。", breakdown: "Tengo=我有 hambre=飢餓（西語「我餓」用「我有飢餓」）" },
    ],
    mistake: "年齡不用 ser！「我20歲」是 Tengo 20 años，不是 Soy 20 años",
    quiz: [
      { q: "「我有一隻貓」tener 用哪個形式？", opts: ["tienes", "tiene", "tengo", "tenemos"], ans: 2, exp: "yo 的 tener 是 tengo，所以是 Tengo un gato" },
      { q: "「他25歲」西語怎麼說？", opts: ["Él es 25 años", "Él está 25 años", "Él tiene 25 años", "Él tiene 25 old"], ans: 2, exp: "年齡用 tener！Él tiene 25 años = 他有25歲（歲數）" },
      { q: "「你有兄弟嗎？」tener 用？", opts: ["tengo", "tienes", "tiene", "tenemos"], ans: 1, exp: "tú 的 tener 是 tienes：¿Tienes hermanos?" },
      { q: "「Tengo hambre」的意思是？", opts: ["我有漢堡", "我很熱", "我餓了", "我有很多工作"], ans: 2, exp: "hambre 是飢餓，西語說「我餓」= Tengo hambre（我有飢餓感）" },
      { q: "「我們今天有課」tener 用？", opts: ["tengo", "tienes", "tenemos", "tienen"], ans: 2, exp: "nosotros 的 tener 是 tenemos：Tenemos clases hoy" },
    ],
  },
  {
    id: "hay", icon: "📍", title: "hay（存在）", color: "#06b6d4",
    core: "hay 意思是「有（存在）」，表示某地方有某物。永遠不變形，不論單複數都用 hay",
    context: "說「這裡有一間咖啡店」「附近有什麼？」「有沒有洗手間？」",
    rule: "hay 是 haber 動詞的特殊形式，永遠不變，不分人稱和單複數",
    table: {
      headers: ["情境", "例句", "意思"],
      rows: [
        ["單數存在", "Hay un banco.", "有一間銀行。"],
        ["複數存在", "Hay muchos restaurantes.", "有很多餐廳。"],
        ["疑問句", "¿Hay un baño aquí?", "這裡有廁所嗎？"],
        ["否定句", "No hay nadie.", "沒有任何人。"],
        ["hay vs está", "El banco está aquí.", "那間銀行在這裡。（指定的）"],
      ],
    },
    examples: [
      { es: "¿Hay una farmacia cerca?", zh: "附近有藥局嗎？", breakdown: "¿Hay=有沒有 una farmacia=一間藥局 cerca=附近" },
      { es: "Hay mucha gente en el mercado.", zh: "市場裡有很多人。", breakdown: "Hay=有 mucha gente=很多人 en el mercado=在市場" },
      { es: "No hay problema.", zh: "沒有問題。", breakdown: "No hay=沒有 problema=問題" },
      { es: "¿Cuántas personas hay?", zh: "有多少人？", breakdown: "¿Cuántas personas=多少人 hay=有" },
    ],
    mistake: "hay 用於「存在某物」，estar 用於「某具體事物在某處」：Hay un parque（有公園）vs El parque está aquí（公園在這裡）",
    quiz: [
      { q: "「這裡有兩間學校」怎麼說？", opts: ["Está dos escuelas aquí", "Son dos escuelas aquí", "Hay dos escuelas aquí", "Tienen dos escuelas"], ans: 2, exp: "hay 表示存在，且不分單複數：Hay dos escuelas aquí" },
      { q: "「沒有問題」西語怎麼說？", opts: ["No está problema", "No hay problema", "No es problema", "No tiene problema"], ans: 1, exp: "No hay problema 是最常用的「沒問題」，hay 的否定是 No hay" },
      { q: "hay 和 está 的主要區別是什麼？", opts: ["hay 用複數，está 用單數", "hay 指存在某物，está 指特定事物的位置", "完全一樣", "hay 更正式"], ans: 1, exp: "hay = 存在（有沒有）；está = 那個具體事物在哪裡" },
      { q: "「附近有餐廳嗎？」用哪個動詞？", opts: ["está", "ser", "hay", "tener"], ans: 2, exp: "詢問某處是否存在某物，用 hay：¿Hay un restaurante cerca?" },
      { q: "「Hay mucha gente」的意思是？", opts: ["人們很高興", "有很多人", "人很忙", "沒有人"], ans: 1, exp: "hay = 有（存在），mucha gente = 很多人" },
    ],
  },
  {
    id: "gender", icon: "🔵🔴", title: "名詞陰陽性", color: "#ec4899",
    core: "西語所有名詞都有性別（陽性 m. 或陰性 f.），性別決定冠詞和形容詞的形式",
    context: "幾乎所有句子都需要確認名詞性別",
    rule: "簡單規則：-o 結尾多為陽性，-a 結尾多為陰性，其他需要記憶",
    table: {
      headers: ["結尾規律", "例子", "性別"],
      rows: [
        ["-o 結尾（多為陽性）", "libro（書）、gato（貓）、amigo（朋友）", "陽性（m.）"],
        ["-a 結尾（多為陰性）", "mesa（桌子）、casa（房子）、amiga（朋友 女）", "陰性（f.）"],
        ["-ión 結尾（多陰性）", "canción（歌曲）、nación（國家）", "陰性（f.）"],
        ["-ad/-ud 結尾（多陰性）", "ciudad（城市）、actitud（態度）", "陰性（f.）"],
        ["需要記憶的例外", "mano（手）是陰性！día（天）是陽性！", "例外記憶"],
      ],
    },
    examples: [
      { es: "el libro / la mesa", zh: "那本書（陽）/ 那張桌子（陰）", breakdown: "el=陽性定冠詞，la=陰性定冠詞" },
      { es: "el problema（陽性！）", zh: "問題（雖然以-a結尾卻是陽性）", breakdown: "來自希臘語，以ma結尾的詞多為陽性" },
      { es: "la mano（陰性！）", zh: "手（雖然以-o結尾卻是陰性）", breakdown: "例外，需要記憶" },
      { es: "la ciudad, la canción", zh: "城市、歌曲（均陰性）", breakdown: "-dad/-ión 結尾通常是陰性" },
    ],
    mistake: "不要以為 -o = 陽性、-a = 陰性就萬無一失，有重要例外要記住",
    quiz: [
      { q: "「libro」（書）是陽性還是陰性？", opts: ["陰性", "陽性", "不分性別", "視情況"], ans: 1, exp: "libro 以 -o 結尾，是陽性名詞" },
      { q: "「ciudad」（城市）的性別是？", opts: ["陽性", "陰性", "中性", "不確定"], ans: 1, exp: "以 -dad 結尾的詞通常是陰性，ciudad 是陰性" },
      { q: "「mano」（手）以-o結尾，是？", opts: ["陽性", "陰性", "中性", "-o就是陽性"], ans: 1, exp: "mano 是例外！雖以-o結尾卻是陰性：la mano" },
      { q: "「canción」（歌曲）的性別？", opts: ["陽性", "陰性", "中性", "不確定"], ans: 1, exp: "-ión 結尾通常是陰性：la canción" },
      { q: "「el problema」說明了什麼？", opts: ["所有-a結尾詞都是陰性", "以-a結尾不一定是陰性", "problema是錯的", "el可以用在陰性詞前"], ans: 1, exp: "problema 以-a結尾但卻是陽性！說明例外規則需要記憶" },
    ],
  },
  {
    id: "plural", icon: "📚", title: "單數與複數", color: "#14b8a6",
    core: "西語名詞變複數的規則比英語簡單：母音結尾加 -s，子音結尾加 -es",
    context: "說多個事物時使用複數形式",
    rule: "母音結尾 → 加 -s；子音結尾 → 加 -es；-z 結尾 → 改 -c 再加 -es",
    table: {
      headers: ["規則", "單數", "複數"],
      rows: [
        ["母音結尾 → + s", "casa（房子）", "casas（房子們）"],
        ["母音結尾 → + s", "libro（書）", "libros（書們）"],
        ["子音結尾 → + es", "ciudad（城市）", "ciudades（城市們）"],
        ["子音結尾 → + es", "color（顏色）", "colores（顏色們）"],
        ["-z 結尾 → c + es", "lápiz（鉛筆）", "lápices（鉛筆們）"],
        ["-z 結尾 → c + es", "vez（次數）", "veces（次數們）"],
      ],
    },
    examples: [
      { es: "un perro → dos perros", zh: "一隻狗 → 兩隻狗", breakdown: "母音o結尾 → 加-s" },
      { es: "una ciudad → muchas ciudades", zh: "一個城市 → 很多城市", breakdown: "子音d結尾 → 加-es" },
      { es: "el lápiz → los lápices", zh: "那枝鉛筆 → 那些鉛筆", breakdown: "-z 結尾變 -ces" },
      { es: "la canción → las canciones", zh: "那首歌 → 那些歌", breakdown: "子音n結尾 → 加-es，重音符號消失" },
    ],
    mistake: "canción 的複數是 canciones（不需要重音符號了，因為自動重讀倒二音節）",
    quiz: [
      { q: "「gato」（貓）的複數是？", opts: ["gatoes", "gatos", "gatoes", "gato"], ans: 1, exp: "母音 -o 結尾加 -s：gato → gatos" },
      { q: "「ciudad」（城市）的複數是？", opts: ["ciudads", "ciudas", "ciudades", "ciudaes"], ans: 2, exp: "子音結尾加 -es：ciudad → ciudades" },
      { q: "「lápiz」（鉛筆）的複數是？", opts: ["lápizs", "lápizes", "lápices", "lápices"], ans: 2, exp: "-z 結尾改為 -c 再加 -es：lápiz → lápices" },
      { q: "「canción」（歌）的複數是？", opts: ["canciónes", "canci ones", "canciones", "canciónses"], ans: 2, exp: "子音結尾加 -es，重音符號在複數中不需要：canciones" },
      { q: "「libro」的複數是？", opts: ["libros", "libroes", "libres", "libre"], ans: 0, exp: "母音 -o 結尾加 -s：libro → libros" },
    ],
  },
  {
    id: "def_article", icon: "🏷️", title: "定冠詞 el / la / los / las", color: "#0ea5e9",
    core: "定冠詞相當於英語的 the，用於已知或特定的事物。依名詞性別和單複數變化",
    context: "說「那本書」「那個城市」「那些人們」",
    rule: "el（陽單）/ la（陰單）/ los（陽複）/ las（陰複）；母音前 el 代替 la（la agua → el agua）",
    table: {
      headers: ["", "陽性（m.）", "陰性（f.）"],
      rows: [
        ["單數", "el libro（那本書）", "la mesa（那張桌子）"],
        ["複數", "los libros（那些書）", "las mesas（那些桌子）"],
        ["特殊：強調母音前", "el agua（水，陰性！）", "（la agua → el agua 避免兩個a相碰）"],
      ],
    },
    examples: [
      { es: "El profesor habla español.", zh: "那位老師說西語。", breakdown: "El=那位（陽單）profesor=老師 habla=說 español=西語" },
      { es: "La ciudad es muy bonita.", zh: "那個城市很漂亮。", breakdown: "La=那個（陰單）ciudad=城市 es=是 muy bonita=很漂亮" },
      { es: "Los estudiantes estudian mucho.", zh: "那些學生學習很多。", breakdown: "Los=那些（陽複）estudiantes=學生 estudian=學習 mucho=很多" },
      { es: "Las casas son grandes.", zh: "那些房子很大。", breakdown: "Las=那些（陰複）casas=房子 son=是 grandes=大的" },
    ],
    mistake: "agua（水）和 alma（靈魂）雖是陰性，單數前用 el 不用 la，以避免兩個 a 音相碰",
    quiz: [
      { q: "「那本書」（書=libro，陽性）用哪個冠詞？", opts: ["la", "los", "las", "el"], ans: 3, exp: "libro 是陽性單數，定冠詞用 el：el libro" },
      { q: "「那些桌子」（桌子=mesa，陰性）用哪個冠詞？", opts: ["el", "la", "los", "las"], ans: 3, exp: "mesa 陰性，複數 mesas，定冠詞用 las：las mesas" },
      { q: "「那些男生」（chico，陽性）複數用？", opts: ["la", "el", "las", "los"], ans: 3, exp: "chico 陽性，複數 chicos，用 los：los chicos" },
      { q: "「el agua」水的冠詞為何不是 la？", opts: ["agua是陽性", "el可用在陰性", "避免兩個a音相碰", "agua是例外陽性詞"], ans: 2, exp: "agua 是陰性詞，但單數前用 el 而非 la，是為了避免 la agua 兩個 a 碰在一起發音不順" },
      { q: "「那位女老師」（profesora，陰性）用？", opts: ["el", "los", "las", "la"], ans: 3, exp: "profesora 陰性單數，用 la：la profesora" },
    ],
  },
  {
    id: "indef_article", icon: "❓", title: "不定冠詞 un / una / unos / unas", color: "#a855f7",
    core: "不定冠詞相當於英語的 a/an（一個）或 some（一些），首次提到某事物時使用",
    context: "說「我有一隻狗」「我想吃一個蘋果」「我需要一些幫助」",
    rule: "un（陽單）/ una（陰單）/ unos（陽複）/ unas（陰複）",
    table: {
      headers: ["", "陽性（m.）", "陰性（f.）"],
      rows: [
        ["單數（一個）", "un libro（一本書）", "una casa（一間房子）"],
        ["複數（一些）", "unos libros（一些書）", "unas casas（一些房子）"],
        ["使用時機", "首次提到，不特定", "比 el/la 更不確定"],
      ],
    },
    examples: [
      { es: "Tengo un perro.", zh: "我有一隻狗。", breakdown: "un=一隻（陽單） perro=狗" },
      { es: "Quiero una manzana.", zh: "我想要一顆蘋果。", breakdown: "una=一顆（陰單） manzana=蘋果" },
      { es: "Hay unos estudiantes en la clase.", zh: "班上有一些學生。", breakdown: "unos=一些（陽複） estudiantes=學生" },
      { es: "Necesito unas tijeras.", zh: "我需要一把剪刀。", breakdown: "unas=一些（陰複） tijeras=剪刀（複數形式）" },
    ],
    mistake: "el/la 用於已知特定的事物，un/una 用於首次提及的非特定事物",
    quiz: [
      { q: "「我有一隻貓」（gato，陽性）不定冠詞用？", opts: ["una", "el", "un", "la"], ans: 2, exp: "gato 陽性單數，不定冠詞用 un：Tengo un gato" },
      { q: "「一間房子」（casa，陰性）不定冠詞用？", opts: ["un", "el", "los", "una"], ans: 3, exp: "casa 陰性單數，不定冠詞用 una：una casa" },
      { q: "「一些書」（libros，陽性複數）不定冠詞用？", opts: ["unas", "unos", "un", "una"], ans: 1, exp: "libros 陽性複數，不定冠詞用 unos：unos libros" },
      { q: "什麼時候用不定冠詞而非定冠詞？", opts: ["已知特定事物", "首次提及的非特定事物", "複數名詞", "人名前"], ans: 1, exp: "首次提到或不特定的事物用不定冠詞（un/una），已知特定的用定冠詞（el/la）" },
      { q: "「Tengo un perro」和「Tengo el perro」的差別？", opts: ["沒有差別", "前者一隻狗，後者那隻特定的狗", "前者複數後者單數", "前者陰性後者陽性"], ans: 1, exp: "un perro = 一隻狗（泛指）；el perro = 那隻狗（雙方都知道的那隻）" },
    ],
  },
  {
    id: "adj", icon: "✨", title: "形容詞的性數配合", color: "#f97316",
    core: "西語形容詞必須跟名詞的性別（陰陽）和數量（單複數）一致",
    context: "描述人事物的外貌、性格、狀態等",
    rule: "形容詞放名詞後面，陽性基本形，陰性 -o → -a，複數加 -s",
    table: {
      headers: ["", "陽性單數", "陽性複數", "陰性單數", "陰性複數"],
      rows: [
        ["alto（高）", "chico alto", "chicos altos", "chica alta", "chicas altas"],
        ["guapo（帥/美）", "chico guapo", "chicos guapos", "chica guapa", "chicas guapas"],
        ["inteligente（聰明）", "chico inteligente", "chicos inteligentes", "chica inteligente", "chicas inteligentes"],
        ["注：-e結尾", "不分陰陽，只加-s", "inteligentes", "（相同）", "inteligentes"],
      ],
    },
    examples: [
      { es: "El chico es alto. / La chica es alta.", zh: "男生很高。/ 女生很高。", breakdown: "alto→alta，形容詞隨名詞性別改變" },
      { es: "Los chicos son altos. / Las chicas son altas.", zh: "男生們很高。/ 女生們很高。", breakdown: "複數加-s，陰陽各自加" },
      { es: "Es una persona inteligente.", zh: "她/他是個聰明的人。", breakdown: "inteligente 以-e結尾，不分陰陽" },
      { es: "Tengo una casa pequeña.", zh: "我有一間小房子。", breakdown: "pequeña=小的（陰性），隨 casa（陰性）配合" },
    ],
    mistake: "「El libro interesante」（正確）不要說「El libro interesanta」（錯誤）——-nte 結尾不分陰陽",
    quiz: [
      { q: "「高的男生」西語怎麼說？", opts: ["chico alta", "chico altos", "chico alto", "chicos alta"], ans: 2, exp: "chico（陽性單數）配 alto（陽性單數）：chico alto" },
      { q: "「聰明的女生們」西語怎麼說？", opts: ["chicas inteligentes", "chicas inteligente", "chicas inteligenta", "chica inteligentes"], ans: 0, exp: "chicas（陰性複數）配 inteligentes（複數，-e結尾不分陰陽）" },
      { q: "形容詞通常放在名詞的哪裡？", opts: ["前面", "後面", "句首", "動詞後"], ans: 1, exp: "西語形容詞通常放在名詞後面（和英語相反）：casa grande（大房子）" },
      { q: "「bonito」（漂亮）用在陰性名詞前要改成？", opts: ["bonito", "bonitos", "bonita", "bonitta"], ans: 2, exp: "-o 結尾陽性形容詞用在陰性名詞前改 -a：bonito → bonita" },
      { q: "「interesante」（有趣的）的陰性形式是？", opts: ["interesanta", "interesantes", "interesante（不變）", "interesantea"], ans: 2, exp: "-e 結尾形容詞陰陽性相同，只在複數時加 -s：interesante → interesantes" },
    ],
  },
  {
    id: "negation", icon: "🚫", title: "否定句", color: "#ef4444",
    core: "西語的否定非常簡單：只需在動詞前加 no",
    context: "否認、拒絕、表達沒有或不做某事",
    rule: "no + 動詞（就這樣！比英語簡單得多）",
    table: {
      headers: ["肯定句", "否定句", "意思"],
      rows: [
        ["Hablo español.", "No hablo español.", "我不說西語。"],
        ["Tengo un perro.", "No tengo un perro.", "我沒有狗。"],
        ["Hay café.", "No hay café.", "沒有咖啡。"],
        ["Soy estudiante.", "No soy estudiante.", "我不是學生。"],
        ["「雙重否定」合法！", "No como nada.（沒什麼吃）", "西語 no + nada 是正確的"],
      ],
    },
    examples: [
      { es: "No entiendo.", zh: "我不懂。", breakdown: "No=不 entiendo=我理解" },
      { es: "No tengo dinero.", zh: "我沒有錢。", breakdown: "No tengo=我沒有 dinero=錢" },
      { es: "No me gusta el café.", zh: "我不喜歡咖啡。", breakdown: "No=不 me gusta=我喜歡 el café=咖啡" },
      { es: "No sé nada.", zh: "我什麼都不知道。", breakdown: "No sé=我不知道 nada=任何東西（雙重否定合法）" },
    ],
    mistake: "西語允許「雙重否定」！No veo nada（我什麼都看不到）是完全正確的",
    quiz: [
      { q: "「我不是老師」西語怎麼說？", opts: ["Soy no profesora", "No soy profesora", "Noy soy profesora", "No es profesora"], ans: 1, exp: "no 放動詞前：No soy profesora" },
      { q: "「我不說英語」西語怎麼說？", opts: ["Hablo inglés no", "No inglés hablo", "No hablo inglés", "Hablo no inglés"], ans: 2, exp: "no 直接放動詞前：No hablo inglés" },
      { q: "「No tengo nada」（我什麼都沒有）文法正確嗎？", opts: ["錯，雙重否定不合法", "正確，西語允許雙重否定", "正確但不常用", "需改成 No tengo algo"], ans: 1, exp: "西語允許雙重否定！No tengo nada 完全正確，意思是「我什麼都沒有」" },
      { q: "「No hay leche」的意思是？", opts: ["有牛奶", "沒有牛奶", "牛奶不好", "我不喝牛奶"], ans: 1, exp: "No hay = 沒有（hay 的否定）；leche = 牛奶" },
      { q: "否定句中 no 放在哪裡？", opts: ["句尾", "句首", "動詞前", "主語前"], ans: 2, exp: "no 直接放在動詞前面：主語 + no + 動詞" },
    ],
  },
  {
    id: "questions", icon: "❓", title: "基本問句", color: "#64748b",
    core: "西語問句在句首句尾各有一個問號（¿...?），語調上揚。可用疑問詞或倒裝",
    context: "問路、問名字、問時間、問感受",
    rule: "疑問詞：¿Qué?（什麼）¿Cómo?（怎麼/如何）¿Dónde?（哪裡）¿Cuándo?（什麼時候）¿Por qué?（為什麼）¿Quién?（誰）",
    table: {
      headers: ["疑問詞", "發音", "意思", "例句"],
      rows: [
        ["¿Qué?", "ke", "什麼", "¿Qué es esto?（這是什麼？）"],
        ["¿Cómo?", "ko-mo", "怎麼 / 如何", "¿Cómo te llamas?（你叫什麼名字？）"],
        ["¿Dónde?", "don-de", "哪裡", "¿Dónde estás?（你在哪裡？）"],
        ["¿Cuándo?", "kwan-do", "什麼時候", "¿Cuándo llegas?（你什麼時候到？）"],
        ["¿Por qué?", "por-ke", "為什麼", "¿Por qué estudias español?"],
        ["¿Quién?", "kyen", "誰", "¿Quién eres?（你是誰？）"],
        ["¿Cuánto/a?", "kwan-to", "多少", "¿Cuánto cuesta?（多少錢？）"],
      ],
    },
    examples: [
      { es: "¿Cómo te llamas?", zh: "你叫什麼名字？", breakdown: "¿Cómo=怎麼 te llamas=你叫" },
      { es: "¿De dónde eres?", zh: "你是哪裡人？", breakdown: "¿De dónde=從哪裡 eres=你是" },
      { es: "¿Cuánto cuesta esto?", zh: "這個多少錢？", breakdown: "¿Cuánto=多少錢 cuesta=花費 esto=這個" },
      { es: "¿Por qué no comes?", zh: "你為什麼不吃？", breakdown: "¿Por qué=為什麼 no comes=你不吃" },
    ],
    mistake: "西語問句開頭要有倒問號 ¿，不要忘記",
    quiz: [
      { q: "「哪裡」的疑問詞是？", opts: ["¿Qué?", "¿Quién?", "¿Dónde?", "¿Cuándo?"], ans: 2, exp: "¿Dónde? = 哪裡，如 ¿Dónde estás?（你在哪裡？）" },
      { q: "「¿Cómo te llamas?」的意思是？", opts: ["你好嗎？", "你叫什麼名字？", "你從哪裡來？", "你幾歲？"], ans: 1, exp: "Cómo te llamas = 你叫（自稱）什麼，即「你叫什麼名字？」" },
      { q: "「為什麼」的疑問詞是？", opts: ["¿Cómo?", "¿Cuándo?", "¿Por qué?", "¿Qué?"], ans: 2, exp: "¿Por qué? = 為什麼，注意回答用 porque（因為）" },
      { q: "「多少錢？」西語怎麼說？", opts: ["¿Cuándo cuesta?", "¿Cuánto cuesta?", "¿Qué precio?", "¿Cómo es el precio?"], ans: 1, exp: "¿Cuánto cuesta? = 這花多少錢？是購物最常用的句子" },
      { q: "西語問句的格式特點是什麼？", opts: ["只有句尾問號", "句首 ¿ 句尾 ?", "疑問詞必須在句尾", "不需要問號"], ans: 1, exp: "西語問句在句首加倒問號 ¿ 並在句尾加 ?，如 ¿Cómo estás?" },
    ],
  },
  {
    id: "ar_verbs", icon: "🔄", title: "-ar / -er / -ir 動詞現在式", color: "#22c55e",
    core: "西語動詞分三類（-ar、-er、-ir），每類現在式變位規律，去掉詞尾後加上對應字尾",
    context: "日常說「我說」「我吃」「我住」時必用",
    rule: "去掉 -ar/-er/-ir → 加上對應的變位字尾",
    table: {
      headers: ["人稱", "-ar（hablar）", "-er（comer）", "-ir（vivir）"],
      rows: [
        ["yo", "habl-o", "com-o", "viv-o"],
        ["tú", "habl-as", "com-es", "viv-es"],
        ["él/ella", "habl-a", "com-e", "viv-e"],
        ["nosotros", "habl-amos", "com-emos", "viv-imos"],
        ["vosotros", "habl-áis", "com-éis", "viv-ís"],
        ["ellos/uds.", "habl-an", "com-en", "viv-en"],
      ],
    },
    examples: [
      { es: "Yo hablo español todos los días.", zh: "我每天說西語。", breakdown: "hablo=我說（hablar的yo形式）español=西語 todos los días=每天" },
      { es: "¿Comes mucho?", zh: "你吃很多嗎？", breakdown: "¿Comes=你吃（comer的tú形式）mucho=很多" },
      { es: "Ella vive en Barcelona.", zh: "她住在巴塞隆納。", breakdown: "vive=她住（vivir的ella形式）en=在 Barcelona=巴塞隆納" },
      { es: "Nosotros estudiamos juntos.", zh: "我們一起學習。", breakdown: "estudiamos=我們學習（estudiar的nosotros形式）juntos=一起" },
    ],
    mistake: "yo 形式三類都是 -o！hablar → hablo, comer → como, vivir → vivo",
    quiz: [
      { q: "「hablar（說）」的 yo 形式是？", opts: ["hablas", "habla", "hablo", "hablamos"], ans: 2, exp: "yo 形式去掉 -ar 加 -o：habl + o = hablo" },
      { q: "「comer（吃）」的 tú 形式是？", opts: ["comes", "come", "como", "comemos"], ans: 0, exp: "tú 形式去掉 -er 加 -es：com + es = comes" },
      { q: "「vivir（住）」的 ella 形式是？", opts: ["vivimos", "viven", "vives", "vive"], ans: 3, exp: "él/ella 形式去掉 -ir 加 -e：viv + e = vive" },
      { q: "-ar/-er/-ir 動詞 yo 形式的共同字尾是？", opts: ["-as", "-o", "-s", "-a"], ans: 1, exp: "三類動詞 yo 形式都是 -o：hablo, como, vivo" },
      { q: "「Nosotros hablamos」的意思是？", opts: ["我說話", "你說話", "我們說話", "他說話"], ans: 2, exp: "hablamos 是 hablar 的 nosotros 形式，意思是「我們說」" },
    ],
  },
  {
    id: "prepositions", icon: "🔗", title: "常見介詞", color: "#d97706",
    core: "西語介詞是連接詞語關係的重要工具。a/de/en/con/por/para 是最基本的六個",
    context: "說「去哪裡」「來自哪裡」「在哪裡」「和誰一起」等時必用",
    rule: "a + el = al（縮寫）；de + el = del（縮寫）",
    table: {
      headers: ["介詞", "基本意思", "例句", "注意"],
      rows: [
        ["a", "去、給、在（時間）", "Voy a Madrid.（去馬德里）", "a + el = al"],
        ["de", "的、來自、關於", "Soy de Taiwan.（我來自台灣）", "de + el = del"],
        ["en", "在（地點、時間）", "Estoy en casa.（我在家）", "表示靜態位置"],
        ["con", "和、一起", "Como con mi familia.（和家人吃飯）", "類似英語 with"],
        ["por", "因為、通過、每（倍率）", "Gracias por todo.（謝謝你的一切）", "常用於感謝"],
        ["para", "為了、對於（目的）", "Este regalo es para ti.（這禮物是給你的）", "表示目的、接受者"],
      ],
    },
    examples: [
      { es: "Voy al supermercado.", zh: "我去超市。", breakdown: "Voy=我去 al=a+el=到那個 supermercado=超市" },
      { es: "Es un libro de español.", zh: "這是一本西語書。", breakdown: "de=的（所屬關係）español=西語" },
      { es: "Trabajo para una empresa.", zh: "我為一家公司工作。", breakdown: "para=為了 una empresa=一家公司" },
      { es: "Hablo por teléfono.", zh: "我在打電話。", breakdown: "por=通過 teléfono=電話" },
    ],
    mistake: "por vs para 常混淆：por = 原因/手段，para = 目的/接收者",
    quiz: [
      { q: "「我去學校」中「去」用哪個介詞？", opts: ["de", "en", "con", "a"], ans: 3, exp: "方向/目的地用 a：Voy a la escuela（去+到）" },
      { q: "「a + el」縮寫成？", opts: ["ael", "a el", "al", "del"], ans: 2, exp: "a + el = al，這是必須縮寫的規則：Voy al banco（去那間銀行）" },
      { q: "「我和朋友吃飯」「和」用哪個介詞？", opts: ["por", "de", "con", "para"], ans: 2, exp: "con = 和、一起：Como con mis amigos" },
      { q: "「這禮物是為了你」中「為了」用哪個介詞？", opts: ["por", "para", "de", "en"], ans: 1, exp: "目的/接收者用 para：Este regalo es para ti" },
      { q: "「de + el」縮寫成？", opts: ["deel", "de el", "del", "al"], ans: 2, exp: "de + el = del，如 El libro del profesor（老師的書）" },
    ],
  },
];

// ── 章節結構（新增）────────────────────────────────────────────────────
const CHAPTERS = [
  {
    id: 1, emoji: "💬", color: "#6366f1",
    title: "句子基本骨架",
    desc: "人稱、ser、estar 是一切的起點",
    topicIds: ["pronouns", "ser", "estar", "ser_vs_estar"],
  },
  {
    id: 2, emoji: "✋", color: "#f59e0b",
    title: "表達存在與擁有",
    desc: "用 tener 和 hay 說有什麼、有多少",
    topicIds: ["tener", "hay"],
  },
  {
    id: 3, emoji: "📖", color: "#ec4899",
    title: "名詞與形容詞",
    desc: "陰陽性、單複數、冠詞與形容詞配合",
    topicIds: ["gender", "plural", "def_article", "indef_article", "adj"],
  },
  {
    id: 4, emoji: "🔀", color: "#ef4444",
    title: "句子結構",
    desc: "否定句與問句，開口說話的關鍵",
    topicIds: ["negation", "questions"],
  },
  {
    id: 5, emoji: "🚀", color: "#22c55e",
    title: "動詞與介詞",
    desc: "規則動詞變位與最常用六個介詞",
    topicIds: ["ar_verbs", "prepositions"],
  },
];

// 所有主題依章節順序排列（用於上一個/下一個導航）
const ORDERED_TOPICS = CHAPTERS.flatMap(ch =>
  ch.topicIds.map(id => TOPICS.find(t => t.id === id)).filter(Boolean)
);

// ── 樣式系統（從 SpanishCourseRoom 移植）──────────────────────────────
const S = {
  page: {
    minHeight: "100%",
    background: "var(--bg)",
    color: "var(--text)",
    fontFamily: "inherit",
    overflowY: "auto",
  },
  primaryBtn: {
    width: "100%",
    padding: "14px 0",
    borderRadius: 14,
    border: "none",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "#fff",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: 0.3,
    boxShadow: "0 4px 16px rgba(99,102,241,0.3)",
  },
  card: {
    background: "var(--panel)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: "16px 18px",
    margin: "0 16px 12px",
  },
  header: {
    padding: "12px 16px",
    borderBottom: "1px solid var(--border)",
    background: "var(--panel-alt)",
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexShrink: 0,
  },
  backBtn: {
    background: "none",
    border: "none",
    color: "var(--text-muted)",
    fontSize: 20,
    cursor: "pointer",
    padding: "4px 8px",
    borderRadius: 8,
    lineHeight: 1,
  },
};

// ── 今日任務列（從 SpanishCourseRoom 移植）────────────────────────────
function TaskRow({ emoji, label, done, onClick }) {
  return (
    <div
      onClick={onClick || undefined}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 12px",
        background: done ? "rgba(99,102,241,0.1)" : "var(--panel-alt)",
        border: `1px solid ${done ? "#6366f144" : "var(--border)"}`,
        borderRadius: 10,
        cursor: onClick ? "pointer" : "default",
        opacity: onClick !== null ? 1 : 0.5,
      }}
    >
      <span style={{ fontSize: 18 }}>{done ? "✅" : emoji}</span>
      <span style={{ fontSize: 13, color: done ? "var(--text-muted)" : "var(--text)", textDecoration: done ? "line-through" : "none" }}>{label}</span>
      {onClick && !done && <span style={{ marginLeft: "auto", fontSize: 12, color: "#6366f1", fontWeight: 600 }}>開始 →</span>}
    </div>
  );
}

// ── 小練習（完全不變）──────────────────────────────────────────────────
function QuizSection({ topic }) {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  function handleSelect(idx) {
    if (selected !== null) return;
    setSelected(idx);
    if (idx === topic.quiz[step].ans) setScore(s => s + 1);
  }

  function next() {
    if (step + 1 >= topic.quiz.length) { setDone(true); return; }
    setStep(s => s + 1); setSelected(null);
  }

  function reset() { setStep(0); setSelected(null); setScore(0); setDone(false); }

  if (done) {
    const passed = score >= 4;
    return (
      <div style={{ textAlign: "center", padding: "20px", borderRadius: 14,
        background: passed ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.06)",
        border: `1px solid ${passed ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.2)"}` }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>{passed ? "🎉" : "💪"}</div>
        <div style={{ fontWeight: 800, fontSize: 16, color: passed ? "#22c55e" : "#ef4444", marginBottom: 4 }}>{score} / {topic.quiz.length}</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14 }}>{passed ? "很棒！這個主題你掌握了！" : "再複習一下，你可以的！"}</div>
        <button onClick={reset} style={{ padding: "10px 24px", borderRadius: 12, border: "none", background: topic.color + "20", color: topic.color, cursor: "pointer", fontWeight: 700, fontSize: 14 }}>重新練習</button>
      </div>
    );
  }

  const q = topic.quiz[step];
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase" }}>小練習</span>
        <span style={{ fontSize: 12, color: "var(--text-faint)" }}>{step + 1} / {topic.quiz.length}</span>
      </div>
      <div style={{ height: 4, background: "var(--border)", borderRadius: 99, marginBottom: 12 }}>
        <div style={{ height: "100%", borderRadius: 99, background: topic.color, width: `${(step / topic.quiz.length) * 100}%`, transition: "width 0.3s" }} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 10, lineHeight: 1.5 }}>{q.q}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
        {q.opts.map((opt, i) => {
          const isSelected = selected === i, isCorrect = i === q.ans, show = selected !== null;
          let bg = "var(--panel-alt)", border = "var(--border)", color = "var(--text)";
          if (show && isCorrect) { bg = "rgba(34,197,94,0.12)"; border = "#22c55e"; color = "#22c55e"; }
          else if (show && isSelected) { bg = "rgba(239,68,68,0.09)"; border = "#ef4444"; color = "#ef4444"; }
          return (
            <button key={i} onClick={() => handleSelect(i)} disabled={!!selected}
              style={{ padding: "11px 14px", borderRadius: 10, border: `1px solid ${border}`, background: bg, color, textAlign: "left", cursor: selected ? "default" : "pointer", fontSize: 14, fontWeight: show && (isCorrect || isSelected) ? 700 : 400, transition: "all 0.15s" }}>
              {show && isCorrect && "✓ "}{show && isSelected && !isCorrect && "✗ "}{opt}
            </button>
          );
        })}
      </div>
      {selected !== null && (
        <>
          {selected !== q.ans && (
            <div style={{ padding: "9px 12px", borderRadius: 10, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", fontSize: 13, color: "#f59e0b", marginBottom: 10, lineHeight: 1.7 }}>
              💡 {q.exp}
            </div>
          )}
          <button onClick={next} style={{ width: "100%", padding: "11px 0", borderRadius: 12, border: "none", background: `linear-gradient(135deg,${topic.color},${topic.color}cc)`, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            {step + 1 >= topic.quiz.length ? "查看結果" : "下一題 →"}
          </button>
        </>
      )}
    </div>
  );
}

// ── 主題詳情頁（改版：加入返回、完成、上下一個）──────────────────────
function TopicView({ topic, completed, onComplete, onBack, onPrev, onNext, prevTitle, nextTitle }) {
  const [showQuiz, setShowQuiz] = useState(false);
  const ch = CHAPTERS.find(c => c.topicIds.includes(topic.id));
  const chColor = ch?.color || topic.color;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bg)", color: "var(--text)", overflow: "hidden" }}>
      <style>{`
        .sg-body::-webkit-scrollbar { width: 5px; }
        .sg-body::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }
      `}</style>

      {/* Header */}
      <div style={S.header}>
        <button onClick={onBack} style={S.backBtn}>←</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>
            <span>{topic.icon}</span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{topic.title}</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 1 }}>
            {ch ? `第 ${ch.id} 章：${ch.title}` : "文法主題"}
          </div>
        </div>
        {completed && (
          <span style={{ fontSize: 12, color: "#10b981", fontWeight: 700, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 20, padding: "3px 10px", flexShrink: 0 }}>
            ✅ 已完成
          </span>
        )}
      </div>

      {/* Scrollable body */}
      <div className="sg-body" style={{ flex: 1, overflowY: "auto", padding: "0 18px" }}>
        <div style={{ maxWidth: 740, margin: "0 auto", padding: "20px 0 60px" }}>

          {/* 核心意思 */}
          <div style={{ padding: "12px 16px", borderRadius: 12, background: topic.color + "0d", border: `1px solid ${topic.color}30`, marginBottom: 14, fontSize: 14, color: "var(--text)", lineHeight: 1.75 }}>
            <span style={{ fontWeight: 800, color: topic.color }}>核心意思：</span>{topic.core}
          </div>

          {/* 情境 + 規則 */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 180, padding: "10px 14px", borderRadius: 12, background: "var(--panel-alt)", border: "1px solid var(--border)", fontSize: 13, lineHeight: 1.7 }}>
              <span style={{ fontWeight: 700, color: "var(--text-muted)" }}>📌 使用情境：</span>
              <span style={{ color: "var(--text)" }}>{topic.context}</span>
            </div>
            <div style={{ flex: 1, minWidth: 180, padding: "10px 14px", borderRadius: 12, background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)", fontSize: 13, lineHeight: 1.7 }}>
              <span style={{ fontWeight: 700, color: "#6366f1" }}>📏 主要規則：</span>
              <span style={{ color: "var(--text)" }}>{topic.rule}</span>
            </div>
          </div>

          {/* 變位表 */}
          <div style={{ marginBottom: 16, overflowX: "auto", borderRadius: 12, border: "1px solid var(--border)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>{topic.table.headers.map((h, i) => (
                  <th key={i} style={{ padding: "9px 12px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", borderBottom: "1px solid var(--border)", background: "var(--panel-alt)", whiteSpace: "nowrap" }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {topic.table.rows.map((row, ri) => (
                  <tr key={ri} style={{ background: ri % 2 === 0 ? "transparent" : "var(--panel-alt)" }}>
                    {row.map((cell, ci) => (
                      <td key={ci} style={{ padding: "9px 12px", fontSize: 13, borderBottom: ri < topic.table.rows.length - 1 ? "1px solid var(--border)" : "none", color: ci === 0 ? "#a78bfa" : "var(--text)", fontWeight: ci === 0 ? 700 : 400 }}>
                        {ci === 0 ? (
                          <button onClick={() => speak(cell.split("（")[0].trim())} style={{ background: "none", border: "none", cursor: "pointer", color: "#a78bfa", fontWeight: 700, fontSize: 13, padding: 0, fontFamily: "inherit", textAlign: "left" }}>
                            {cell} 🔊
                          </button>
                        ) : cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 例句與逐字拆解 */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>📚 例句與逐字拆解</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {topic.examples.map((ex, i) => (
                <div key={i} style={{ padding: "12px 14px", background: "var(--panel)", borderRadius: 12, border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
                    <button onClick={() => speak(ex.es)} style={{ background: "none", border: "none", cursor: "pointer", color: "#60a5fa", fontSize: 16, padding: 0, flexShrink: 0, marginTop: 2 }}>🔊</button>
                    <ClickableSpanishText text={ex.es} style={{ fontSize: 15, fontStyle: "italic", color: "#c4b5fd", lineHeight: 1.5, fontWeight: 600 }} />
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4, marginLeft: 28 }}>{ex.zh}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginLeft: 28, lineHeight: 1.6 }}>🔍 {ex.breakdown}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 常見錯誤 */}
          <div style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 13, color: "#ef4444", marginBottom: 16, lineHeight: 1.7 }}>
            ⚠️ 常見錯誤：{topic.mistake}
          </div>

          {/* 完整變位表連結（ser / estar / tener） */}
          {{ ser: ["ser"], estar: ["estar"], ser_vs_estar: ["ser", "estar"], tener: ["tener"] }[topic.id] && (
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {{ ser: ["ser"], estar: ["estar"], ser_vs_estar: ["ser", "estar"], tener: ["tener"] }[topic.id].map(v => (
                <a key={v} href={`/spanish/verbs?verb=${v}`} target="_blank" rel="noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10,
                    background: "rgba(220,38,38,0.12)", color: "#ef4444", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                  🧩 查看 {v} 完整變位表
                </a>
              ))}
            </div>
          )}

          {/* 完成按鈕 */}
          {!completed && (
            <button onClick={onComplete} style={{ ...S.primaryBtn, marginBottom: 10 }}>
              ✅ 標記為已完成
            </button>
          )}

          {/* 練習按鈕 */}
          {!showQuiz ? (
            <button onClick={() => setShowQuiz(true)} style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: `1px solid ${topic.color}50`, background: topic.color + "10", color: topic.color, cursor: "pointer", fontWeight: 800, fontSize: 14, marginBottom: 20 }}>
              ✏️ {completed ? "再次練習（5 題）" : "開始練習（5 題）"}
            </button>
          ) : (
            <div style={{ marginBottom: 20 }}>
              <QuizSection topic={topic} />
            </div>
          )}

          {/* 上一個 / 下一個 */}
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            {onPrev ? (
              <button onClick={onPrev} style={{ flex: 1, padding: "11px 14px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--panel-alt)", color: "var(--text-muted)", cursor: "pointer", fontSize: 13, textAlign: "left", fontWeight: 500 }}>
                ← {prevTitle}
              </button>
            ) : <div style={{ flex: 1 }} />}
            {onNext && (
              <button onClick={onNext} style={{ flex: 1, padding: "11px 14px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--panel-alt)", color: "var(--text-muted)", cursor: "pointer", fontSize: 13, textAlign: "right", fontWeight: 500 }}>
                {nextTitle} →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 主頁（Hero + 今日任務 + 章節學習地圖）────────────────────────────
function HomeView({ completedSet, onOpenTopic, totalCount, onNav }) {
  const done = completedSet.size;
  const pct = totalCount > 0 ? Math.round((done / totalCount) * 100) : 0;

  // 找下一個未完成主題
  let nextTopic = null;
  for (const ch of CHAPTERS) {
    for (const tid of ch.topicIds) {
      if (!completedSet.has(tid)) {
        nextTopic = TOPICS.find(t => t.id === tid);
        break;
      }
    }
    if (nextTopic) break;
  }

  // 找最近完成的主題（供複習）
  const recentDone = ORDERED_TOPICS.filter(t => completedSet.has(t.id));
  const reviewTopic = recentDone.length > 0 ? recentDone[recentDone.length - 1] : null;

  return (
    <div style={S.page}>
      <style>{`
        .sg-home::-webkit-scrollbar { width: 5px; }
        .sg-home::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }
      `}</style>

      {/* Hero 頂部 */}
      <div style={{ padding: "20px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text)" }}>🇪🇸 ES 西語基礎文法</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 3 }}>
            用循序漸進方式掌握西語核心文法
          </div>
        </div>
        {onNav && (
          <button onClick={() => onNav("home")} style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 12, padding: "7px 12px", cursor: "pointer", color: "var(--text-muted)", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
            ← 返回
          </button>
        )}
      </div>

      {/* 進度條 */}
      <div style={{ margin: "16px 20px 0", background: "var(--panel-alt)", borderRadius: 99, height: 8, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #6366f1, #8b5cf6)", borderRadius: 99, transition: "width 0.6s" }} />
      </div>
      <div style={{ margin: "5px 20px 0", fontSize: 12, color: "var(--text-faint)" }}>
        已完成 {done} / {totalCount} 個主題 · {pct}%
      </div>

      {/* 繼續學習 CTA */}
      {nextTopic && (
        <div style={{ margin: "16px 16px 0" }}>
          <button onClick={() => onOpenTopic(nextTopic)} style={S.primaryBtn}>
            ▶ 繼續今天的課：{nextTopic.icon} {nextTopic.title}
          </button>
        </div>
      )}
      {!nextTopic && done > 0 && (
        <div style={{ margin: "16px 16px 0", padding: "14px", borderRadius: 14, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.3)", textAlign: "center", fontSize: 14, color: "#10b981", fontWeight: 700 }}>
          🎉 恭喜！所有文法主題已完成！
        </div>
      )}

      {/* 今日任務 */}
      <div style={S.card}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10 }}>今日任務</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {nextTopic && (
            <TaskRow emoji="📖" label={`學習：${nextTopic.title}`} done={false} onClick={() => onOpenTopic(nextTopic)} />
          )}
          {reviewTopic && (
            <TaskRow emoji="🔄" label={`複習：${reviewTopic.title}`} done={false} onClick={() => onOpenTopic(reviewTopic)} />
          )}
          {done >= 3 && (
            <TaskRow
              emoji="✏️"
              label={`練習：${TOPICS[Math.floor(done / 2) % TOPICS.length].title}`}
              done={false}
              onClick={() => onOpenTopic(TOPICS[Math.floor(done / 2) % TOPICS.length])}
            />
          )}
          {done === 0 && !nextTopic && (
            <TaskRow emoji="👋" label="從第一章開始你的文法之旅" done={false} onClick={null} />
          )}
        </div>
      </div>

      {/* 學習地圖（章節卡片）*/}
      <div style={{ padding: "4px 16px 32px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", margin: "8px 4px 12px" }}>學習地圖</div>
        {CHAPTERS.map(ch => {
          const chTopics = ch.topicIds.map(id => TOPICS.find(t => t.id === id)).filter(Boolean);
          const chDone = chTopics.filter(t => completedSet.has(t.id)).length;
          const chTotal = chTopics.length;
          const chPct = Math.round((chDone / chTotal) * 100);

          return (
            <div key={ch.id} style={{ marginBottom: 14 }}>
              {/* 章節標題卡 */}
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                background: `${ch.color}18`,
                border: `1px solid ${ch.color}44`,
                borderRadius: 14, padding: "10px 14px", marginBottom: 6,
              }}>
                <div style={{ fontSize: 22 }}>{ch.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
                    第 {ch.id} 章：{ch.title}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>
                    {ch.desc} · {chDone}/{chTotal} 個主題
                  </div>
                </div>
                {chPct === 100 && <div style={{ fontSize: 18 }}>✅</div>}
                {chPct > 0 && chPct < 100 && (
                  <div style={{ fontSize: 12, fontWeight: 700, color: ch.color }}>{chPct}%</div>
                )}
              </div>

              {/* 章節內主題列表 */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 12 }}>
                {chTopics.map(topic => {
                  const topicDone = completedSet.has(topic.id);
                  return (
                    <button
                      key={topic.id}
                      onClick={() => onOpenTopic(topic)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        background: topicDone ? `${ch.color}20` : "var(--panel)",
                        border: `1px solid ${topicDone ? ch.color + "55" : "var(--border)"}`,
                        borderRadius: 10, padding: "9px 12px",
                        cursor: "pointer", textAlign: "left", width: "100%",
                        transition: "background 0.15s",
                      }}
                    >
                      <span style={{ fontSize: 16 }}>{topicDone ? "✅" : topic.icon}</span>
                      <span style={{ fontSize: 13, color: "var(--text)", fontWeight: topicDone ? 600 : 400 }}>
                        {topic.title}
                      </span>
                      <span style={{ marginLeft: "auto", fontSize: 11, color: topicDone ? ch.color : "var(--text-faint)", fontWeight: topicDone ? 600 : 400 }}>
                        {topicDone ? "已完成" : "開始 →"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 主元件──────────────────────────────────────────────────────────────
export default function SpanishGrammar({ onNav }) {
  const [view, setView] = useState("home"); // "home" | "topic"
  const [activeTopic, setActiveTopic] = useState(null);

  // 完成狀態從 localStorage 讀取（不需要 Firebase）
  const [completedIds, setCompletedIds] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("sg-v2-completed") || "[]"));
    } catch {
      return new Set();
    }
  });

  function markComplete(id) {
    const next = new Set(completedIds);
    next.add(id);
    setCompletedIds(next);
    try { localStorage.setItem("sg-v2-completed", JSON.stringify([...next])); } catch {}
  }

  function openTopic(topic) {
    setActiveTopic(topic);
    setView("topic");
  }

  if (view === "topic" && activeTopic) {
    const idx = ORDERED_TOPICS.findIndex(t => t.id === activeTopic.id);
    const prevTopic = idx > 0 ? ORDERED_TOPICS[idx - 1] : null;
    const nextTopic = idx < ORDERED_TOPICS.length - 1 ? ORDERED_TOPICS[idx + 1] : null;

    return (
      <TopicView
        key={activeTopic.id}
        topic={activeTopic}
        completed={completedIds.has(activeTopic.id)}
        onComplete={() => markComplete(activeTopic.id)}
        onBack={() => setView("home")}
        onPrev={prevTopic ? () => openTopic(prevTopic) : null}
        onNext={nextTopic ? () => openTopic(nextTopic) : null}
        prevTitle={prevTopic?.title}
        nextTitle={nextTopic?.title}
      />
    );
  }

  return (
    <HomeView
      completedSet={completedIds}
      onOpenTopic={openTopic}
      totalCount={TOPICS.length}
      onNav={onNav}
    />
  );
}
