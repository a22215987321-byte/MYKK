// 表情 / 手勢貼圖包資料。第一版全部用 emoji（type:"emoji"）顯示；
// 之後要換成真的 PNG/WebP/GIF 貼圖時，把該項目的 type 改成 "sticker"
// 並補上 src（貼圖圖片路徑），元件端已經支援兩種 type 混用，不用改資料結構。
export const gesturePacks = [
  {
    id: "gestures",
    name: "手勢",
    icon: "👋",
    items: [
      { id: "thumbs-up",   type: "emoji", label: "讚好",     emoji: "👍", keywords: ["讚", "讚好", "like", "good", "ok", "棒"] },
      { id: "thumbs-down",  type: "emoji", label: "不喜歡",   emoji: "👎", keywords: ["不喜歡", "dislike", "bad", "差"] },
      { id: "wave",         type: "emoji", label: "揮手",     emoji: "👋", keywords: ["揮手", "hi", "hello", "bye", "你好", "掰掰"] },
      { id: "clap",         type: "emoji", label: "拍手",     emoji: "👏", keywords: ["拍手", "clap", "讚賞", "厲害"] },
      { id: "pray",         type: "emoji", label: "拜託/謝謝", emoji: "🙏", keywords: ["拜託", "謝謝", "感謝", "please", "thanks", "thank you"] },
      { id: "victory",      type: "emoji", label: "勝利",     emoji: "✌️", keywords: ["勝利", "victory", "耶", "yeah"] },
      { id: "ok",           type: "emoji", label: "OK",       emoji: "👌", keywords: ["ok", "好的", "沒問題"] },
      { id: "pinch",        type: "emoji", label: "手勢",     emoji: "🤌", keywords: ["手勢", "義大利手勢", "什麼意思"] },
      { id: "handshake",    type: "emoji", label: "握手",     emoji: "🤝", keywords: ["握手", "handshake", "合作", "成交"] },
      { id: "muscle",       type: "emoji", label: "加油",     emoji: "💪", keywords: ["加油", "muscle", "努力", "強"] },
      { id: "heart-hands",  type: "emoji", label: "愛心手",   emoji: "🫶", keywords: ["愛心", "愛心手", "love", "比心"] },
      { id: "point-up",     type: "emoji", label: "指一指",   emoji: "☝️", keywords: ["指一指", "point", "注意"] },
      { id: "point-right",  type: "emoji", label: "指右",     emoji: "👉", keywords: ["指右", "point right"] },
      { id: "point-left",   type: "emoji", label: "指左",     emoji: "👈", keywords: ["指左", "point left"] },
      { id: "point-down",   type: "emoji", label: "指下",     emoji: "👇", keywords: ["指下", "point down", "看下面"] },
      { id: "point-up2",    type: "emoji", label: "指上",     emoji: "👆", keywords: ["指上", "point up", "看上面"] },
      { id: "rock",         type: "emoji", label: "搖滾",     emoji: "🤘", keywords: ["搖滾", "rock", "酷"] },
      { id: "call-me",      type: "emoji", label: "打電話",   emoji: "🤙", keywords: ["打電話", "call me", "聯絡"] },
      { id: "open-hand",    type: "emoji", label: "張開手",   emoji: "🖐️", keywords: ["張開手", "high five", "擊掌"] },
      { id: "stop",         type: "emoji", label: "停止",     emoji: "✋", keywords: ["停止", "stop", "等等"] },
    ],
  },
  {
    id: "faces",
    name: "表情",
    icon: "😊",
    items: [
      { id: "face-smile",   type: "emoji", label: "微笑",   emoji: "😊", keywords: ["微笑", "smile", "開心"] },
      { id: "face-laugh",   type: "emoji", label: "大笑",   emoji: "😂", keywords: ["大笑", "laugh", "lol", "笑死"] },
      { id: "face-grin",    type: "emoji", label: "咧嘴笑", emoji: "😁", keywords: ["咧嘴笑", "grin"] },
      { id: "face-wink",    type: "emoji", label: "眨眼",   emoji: "😉", keywords: ["眨眼", "wink"] },
      { id: "face-love",    type: "emoji", label: "花心",   emoji: "😍", keywords: ["花心", "love", "喜歡"] },
      { id: "face-cry",     type: "emoji", label: "哭",     emoji: "😢", keywords: ["哭", "cry", "傷心"] },
      { id: "face-sob",     type: "emoji", label: "大哭",   emoji: "😭", keywords: ["大哭", "sob"] },
      { id: "face-angry",   type: "emoji", label: "生氣",   emoji: "😠", keywords: ["生氣", "angry"] },
      { id: "face-shock",   type: "emoji", label: "驚訝",   emoji: "😮", keywords: ["驚訝", "shock", "surprise"] },
      { id: "face-think",   type: "emoji", label: "思考",   emoji: "🤔", keywords: ["思考", "think", "想想"] },
      { id: "face-sleepy",  type: "emoji", label: "想睡",   emoji: "😴", keywords: ["想睡", "sleepy", "累"] },
      { id: "face-cool",    type: "emoji", label: "酷",     emoji: "😎", keywords: ["酷", "cool"] },
    ],
  },
  {
    id: "hearts",
    name: "愛心",
    icon: "❤️",
    items: [
      { id: "heart-red",    type: "emoji", label: "紅心",   emoji: "❤️", keywords: ["愛心", "love", "紅心"] },
      { id: "heart-orange", type: "emoji", label: "橙心",   emoji: "🧡", keywords: ["橙心", "愛心"] },
      { id: "heart-yellow", type: "emoji", label: "黃心",   emoji: "💛", keywords: ["黃心", "愛心"] },
      { id: "heart-green",  type: "emoji", label: "綠心",   emoji: "💚", keywords: ["綠心", "愛心"] },
      { id: "heart-blue",   type: "emoji", label: "藍心",   emoji: "💙", keywords: ["藍心", "愛心"] },
      { id: "heart-purple", type: "emoji", label: "紫心",   emoji: "💜", keywords: ["紫心", "愛心"] },
      { id: "heart-break",  type: "emoji", label: "心碎",   emoji: "💔", keywords: ["心碎", "break", "傷心"] },
      { id: "heart-sparkle", type: "emoji", label: "閃亮愛心", emoji: "💖", keywords: ["閃亮愛心", "sparkle"] },
      { id: "heart-two",    type: "emoji", label: "雙心",   emoji: "💕", keywords: ["雙心", "喜歡"] },
      { id: "kiss-mark",    type: "emoji", label: "香吻",   emoji: "💋", keywords: ["香吻", "kiss"] },
    ],
  },
  {
    id: "celebration",
    name: "慶祝",
    icon: "🎉",
    items: [
      { id: "party",        type: "emoji", label: "派對",   emoji: "🎉", keywords: ["派對", "party", "慶祝", "congrats"] },
      { id: "confetti",     type: "emoji", label: "彩帶",   emoji: "🎊", keywords: ["彩帶", "confetti"] },
      { id: "fireworks",    type: "emoji", label: "煙花",   emoji: "🎆", keywords: ["煙花", "fireworks"] },
      { id: "cake",         type: "emoji", label: "蛋糕",   emoji: "🎂", keywords: ["蛋糕", "cake", "生日"] },
      { id: "gift",         type: "emoji", label: "禮物",   emoji: "🎁", keywords: ["禮物", "gift"] },
      { id: "trophy",       type: "emoji", label: "獎盃",   emoji: "🏆", keywords: ["獎盃", "trophy", "冠軍"] },
      { id: "star",         type: "emoji", label: "星星",   emoji: "⭐", keywords: ["星星", "star", "讚"] },
      { id: "sparkles",     type: "emoji", label: "閃亮",   emoji: "✨", keywords: ["閃亮", "sparkles"] },
      { id: "champagne",    type: "emoji", label: "香檳",   emoji: "🍾", keywords: ["香檳", "champagne", "乾杯"] },
      { id: "balloon",      type: "emoji", label: "氣球",   emoji: "🎈", keywords: ["氣球", "balloon"] },
    ],
  },
  {
    id: "animals",
    name: "動物",
    icon: "🐼",
    items: [
      { id: "cat",     type: "emoji", label: "貓",   emoji: "🐱", keywords: ["貓", "cat"] },
      { id: "dog",     type: "emoji", label: "狗",   emoji: "🐶", keywords: ["狗", "dog"] },
      { id: "panda",   type: "emoji", label: "熊貓", emoji: "🐼", keywords: ["熊貓", "panda"] },
      { id: "fox",     type: "emoji", label: "狐狸", emoji: "🦊", keywords: ["狐狸", "fox"] },
      { id: "rabbit",  type: "emoji", label: "兔子", emoji: "🐰", keywords: ["兔子", "rabbit"] },
      { id: "bear",    type: "emoji", label: "熊",   emoji: "🐻", keywords: ["熊", "bear"] },
      { id: "koala",   type: "emoji", label: "無尾熊", emoji: "🐨", keywords: ["無尾熊", "koala"] },
      { id: "monkey",  type: "emoji", label: "猴子", emoji: "🐵", keywords: ["猴子", "monkey"] },
    ],
  },
];

// 手機聊天輸入欄快速反應（長按訊息 / hover 訊息時顯示的預設 7 個）。
export const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "👏", "🙏"];

export function findGesturePackItem(id) {
  for (const pack of gesturePacks) {
    const item = pack.items.find(i => i.id === id);
    if (item) return { ...item, packId: pack.id };
  }
  return null;
}

export function searchGestureItems(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const results = [];
  for (const pack of gesturePacks) {
    for (const item of pack.items) {
      const hay = [item.label, ...(item.keywords || [])].join(" ").toLowerCase();
      if (hay.includes(q)) results.push({ ...item, packId: pack.id });
    }
  }
  return results;
}
