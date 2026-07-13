const rawFrenchDictionary = [
  ["bonjour", "interj.", "你好；早安", "hello; good morning", "Bonjour, comment allez-vous ?", "你好，您最近好嗎？"],
  ["salut", "interj.", "嗨；再見", "hi; bye", "Salut, Marie !", "嗨，瑪麗！"],
  ["merci", "interj.", "謝謝", "thank you", "Merci beaucoup.", "非常感謝。"],
  ["oui", "adv.", "是；對", "yes", "Oui, je comprends.", "是的，我明白。"],
  ["non", "adv.", "不；不是", "no", "Non, merci.", "不用了，謝謝。"],
  ["je", "pron.", "我", "I", "Je suis étudiant.", "我是學生。"],
  ["tu", "pron.", "你（非正式）", "you", "Tu parles français.", "你說法語。"],
  ["il", "pron.", "他；它（陽性）", "he; it", "Il est professeur.", "他是老師。"],
  ["elle", "pron.", "她；它（陰性）", "she; it", "Elle aime lire.", "她喜歡閱讀。"],
  ["nous", "pron.", "我們", "we", "Nous allons à Paris.", "我們去巴黎。"],
  ["vous", "pron.", "您；你們", "you", "Vous avez un café ?", "您有咖啡嗎？"],
  ["ils", "pron.", "他們；它們（陽性／混合）", "they", "Ils sont amis.", "他們是朋友。"],
  ["elles", "pron.", "她們；它們（陰性）", "they", "Elles sont étudiantes.", "她們是學生。"],
  ["être", "v.", "是；存在", "to be", "Je suis à la maison.", "我在家。"],
  ["avoir", "v.", "有", "to have", "J'ai un livre.", "我有一本書。"],
  ["aller", "v.", "去；前往", "to go", "Nous allons à l'école.", "我們去學校。"],
  ["faire", "v.", "做；製作", "to do; to make", "Elle fait du café.", "她在煮咖啡。"],
  ["parler", "v.", "說；談話", "to speak", "Il parle français.", "他說法語。"],
  ["aimer", "v.", "喜歡；愛", "to like; to love", "J'aime le fromage.", "我喜歡乳酪。"],
  ["manger", "v.", "吃", "to eat", "Tu manges du pain.", "你吃麵包。"],
  ["boire", "v.", "喝", "to drink", "Je bois de l'eau.", "我喝水。"],
  ["maison", "n. f.", "房子；家", "house; home", "La maison est grande.", "這間房子很大。"],
  ["école", "n. f.", "學校", "school", "L'école est près d'ici.", "學校在這附近。"],
  ["garçon", "n. m.", "男孩；服務生", "boy; waiter", "Le garçon lit un livre.", "男孩在讀書。"],
  ["fille", "n. f.", "女孩；女兒", "girl; daughter", "La fille aime le chat.", "女孩喜歡那隻貓。"],
  ["homme", "n. m.", "男人；人", "man", "Cet homme est professeur.", "這位男士是老師。"],
  ["femme", "n. f.", "女人；妻子", "woman; wife", "Cette femme parle français.", "這位女士說法語。"],
  ["ami", "n. m.", "男性朋友", "male friend", "Paul est mon ami.", "保羅是我的朋友。"],
  ["amie", "n. f.", "女性朋友", "female friend", "Marie est mon amie.", "瑪麗是我的朋友。"],
  ["professeur", "n.", "老師；教授", "teacher; professor", "Le professeur parle lentement.", "老師說得很慢。"],
  ["étudiant", "n. m.", "男學生；大學生", "student", "L'étudiant étudie le français.", "學生學習法語。"],
  ["livre", "n. m.", "書", "book", "C'est un livre français.", "這是一本法語書。"],
  ["chat", "n. m.", "貓", "cat", "Le chat est noir.", "這隻貓是黑色的。"],
  ["chien", "n. m.", "狗", "dog", "Le chien est dans la maison.", "狗在房子裡。"],
  ["eau", "n. f.", "水", "water", "Je voudrais de l'eau.", "我想要水。"],
  ["café", "n. m.", "咖啡；咖啡館", "coffee; café", "Je prends un café.", "我要一杯咖啡。"],
  ["pain", "n. m.", "麵包", "bread", "Le pain est frais.", "麵包很新鮮。"],
  ["fromage", "n. m.", "乳酪；起司", "cheese", "J'aime le fromage français.", "我喜歡法國乳酪。"],
  ["français", "n.; adj.", "法語；法國的", "French; French language", "Je parle français.", "我說法語。"],
  ["aujourd’hui", "adv.", "今天", "today", "Aujourd’hui, il fait beau.", "今天天氣很好。"],
  ["demain", "adv.", "明天", "tomorrow", "À demain !", "明天見！"],
  ["hier", "adv.", "昨天", "yesterday", "Hier, j'étais à Paris.", "昨天我在巴黎。"],
];

export function normalizeFrench(value = "") {
  return value
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export const frenchDictionary = Object.fromEntries(rawFrenchDictionary.map(([
  word, partOfSpeech, chinese, english, example, exampleChinese,
]) => [word, {
  word, partOfSpeech, chinese, english, example, exampleChinese, audioUrl: "",
  s: partOfSpeech, t: chinese, en: english, ex: `${example}\n${exampleChinese}`,
}]));

export function getFrenchShard(letter) {
  const target = normalizeFrench(letter).charAt(0);
  return Object.fromEntries(Object.entries(frenchDictionary).filter(([word]) => normalizeFrench(word).charAt(0) === target));
}

export function lookupFrenchWord(query) {
  const normalized = normalizeFrench(query);
  const match = Object.entries(frenchDictionary).find(([word]) => normalizeFrench(word) === normalized);
  return match ? match[1] : null;
}
