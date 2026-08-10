export const IDLE_ACTIONS = [
  { id: "focus", label: "專注工作", actorId: "cass" },
  { id: "stretch", label: "伸懶腰", actorId: "zhao" },
  { id: "hot", label: "好熱呀", actorId: "milo" },
  { id: "tired", label: "好累呀", actorId: "leo" },
  { id: "water", label: "去喝水", actorId: "ivy" },
  { id: "restroom", label: "去廁所", actorId: "cass" },
  { id: "chat", label: "找同事聊聊", actorId: "leo" },
  { id: "printer", label: "去印文件", actorId: "zhao" },
  { id: "window", label: "看窗休息", actorId: "milo" },
  { id: "patrol", label: "主管巡視", actorId: "amber" },
  { id: "welcome", label: "新員工元氣報到", actorId: "reserve" },
];

export function initialActorState(agent) {
  return {
    x: agent.seatX ?? agent.homeX,
    y: agent.seatY ?? agent.homeY,
    pose: "seated",
    state: "idle",
    bubble: "",
    facing: 1,
    opacity: 1,
    scale: 1,
    travelMs: 0,
    sprite: "",
    emphasis: false,
  };
}

export function buildAmbientSequence(actionId, agent) {
  switch (actionId) {
    case "focus":
      return [
        { type: "status", state: "working", emphasis: true },
        { type: "wait", ms: 2600 },
        { type: "status", state: "idle", emphasis: false },
      ];
    case "stretch":
      return [
        { type: "bubble", text: "坐太久了，伸個懶腰～" },
        { type: "pose", pose: "standing", y: agent.homeY + 4.7, state: "stretching", emphasis: true },
        { type: "wait", ms: 2100 },
        { type: "home" },
      ];
    case "hot":
      return [
        { type: "bubble", text: "今天好熱呀！" },
        { type: "status", state: "chatting", emphasis: true },
        { type: "wait", ms: 2400 },
        { type: "clearBubble" },
        { type: "status", state: "idle", emphasis: false },
      ];
    case "tired":
      return [
        { type: "bubble", text: "好累呀，休息一下。" },
        { type: "status", state: "chatting", emphasis: true },
        { type: "scale", scale: 0.96 },
        { type: "wait", ms: 2200 },
        { type: "scale", scale: 1 },
        { type: "clearBubble" },
        { type: "status", state: "idle", emphasis: false },
      ];
    case "water":
      return [
        { type: "bubble", text: "我去喝杯水。" },
        { type: "wait", ms: 1050 },
        { type: "stand" },
        { type: "move", x: 69.5, y: 60.5 },
        { type: "move", x: 69.5, y: 39.5 },
        { type: "move", x: 62.8, y: 33.2 },
        { type: "pose", pose: "drinking", scale: 0.82, state: "drinking", emphasis: true },
        { type: "bubble", text: "補充水分，精神好多了。" },
        { type: "wait", ms: 2600 },
        { type: "pose", pose: "standing", scale: 1 },
        { type: "clearBubble" },
        { type: "move", x: 69.5, y: 39.5 },
        { type: "move", x: 69.5, y: 60.5 },
        { type: "home" },
      ];
    case "restroom":
      return [
        { type: "bubble", text: "去個廁所先。" },
        { type: "wait", ms: 1050 },
        { type: "stand" },
        { type: "move", x: 28.5, y: 75.0 },
        { type: "move", x: 28.5, y: 45.0 },
        { type: "move", x: 16.9, y: 42.5 },
        { type: "pose", pose: "standing", state: "checking", emphasis: true },
        { type: "door", open: true },
        { type: "fade", opacity: 0 },
        { type: "wait", ms: 2200 },
        { type: "fade", opacity: 1 },
        { type: "door", open: false },
        { type: "move", x: 28.5, y: 45.0 },
        { type: "move", x: 28.5, y: 75.0 },
        { type: "home" },
      ];
    case "chat":
      return [
        { type: "bubble", text: "李研，一起對一下進度？" },
        { type: "wait", ms: 1050 },
        { type: "stand" },
        { type: "move", x: 42.0, y: 61.0 },
        { type: "move", x: 52.0, y: 61.0 },
        { type: "pose", pose: "standing", state: "talking", emphasis: true },
        { type: "bubble", text: "數據和市場趨勢一致。" },
        { type: "wait", ms: 2800 },
        { type: "clearBubble" },
        { type: "move", x: 42.0, y: 61.0 },
        { type: "home" },
      ];
    case "printer":
      return [
        { type: "bubble", text: "我去拿審核文件。" },
        { type: "wait", ms: 1050 },
        { type: "stand" },
        { type: "move", x: 28.5, y: 90.0 },
        { type: "move", x: 28.5, y: 39.0 },
        { type: "move", x: 35.3, y: 31.5 },
        { type: "pose", pose: "standing", state: "checking", emphasis: true },
        { type: "wait", ms: 2200 },
        { type: "move", x: 28.5, y: 39.0 },
        { type: "move", x: 28.5, y: 90.0 },
        { type: "home" },
      ];
    case "window":
      return [
        { type: "bubble", text: "去窗邊放鬆一下眼睛。" },
        { type: "wait", ms: 1050 },
        { type: "stand" },
        { type: "move", x: 70.5, y: 76.0 },
        { type: "move", x: 80.9, y: 54.0 },
        { type: "pose", pose: "standing", state: "checking", emphasis: true },
        { type: "wait", ms: 2600 },
        { type: "move", x: 70.5, y: 76.0 },
        { type: "home" },
      ];
    case "patrol":
      return [
        { type: "bubble", text: "我巡一下大家的進度。" },
        { type: "wait", ms: 1050 },
        { type: "stand" },
        { type: "move", x: 49.1, y: 48.0 },
        { type: "move", x: 49.1, y: 62.0 },
        { type: "move", x: 69.5, y: 62.0 },
        { type: "move", x: 69.5, y: 79.0 },
        { type: "move", x: 49.1, y: 79.0 },
        { type: "move", x: 49.1, y: 48.0 },
        { type: "home" },
      ];
    case "welcome":
      return [
        { type: "bubble", text: "今天也一起加油！" },
        { type: "stand" },
        { type: "pose", pose: "standing", state: "chatting", scale: 1.06, emphasis: true },
        { type: "wait", ms: 1800 },
        { type: "scale", scale: 0.98 },
        { type: "wait", ms: 500 },
        { type: "clearBubble" },
        { type: "home" },
      ];
    default:
      return [];
  }
}
