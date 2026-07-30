// Fixed trait options for AiCompanionCreator's chip picker — kept as a
// closed set (not free text) so buildCompanionSystemPrompt below always
// produces a sane, predictable prompt regardless of what a user picks.
export const COMPANION_TRAITS = [
  { id: "gentle", label: "溫柔", desc: "說話溫柔體貼，會照顧對方的情緒" },
  { id: "cheerful", label: "活潑", desc: "說話活潑開朗，反應熱情" },
  { id: "sassy", label: "毒舌", desc: "說話毒舌吐槽，但不失善意" },
  { id: "intellectual", label: "知性", desc: "說話知性冷靜，喜歡分享想法" },
  { id: "funny", label: "搞笑", desc: "說話幽默風趣，常常開玩笑" },
  { id: "calm", label: "冷靜", desc: "說話沉穩冷靜，不慌不忙" },
];

const MAX_NAME_LENGTH = 20;
const MAX_TRAITS = 2;

// Built at send-time from the persona's saved name/traits rather than
// stored in Firestore — keeps trait→wording changes retroactive without a
// data migration, and keeps the prompt itself in exactly one place.
export function buildCompanionSystemPrompt({ name, traits }) {
  const safeName = (name || "AI 夥伴").slice(0, MAX_NAME_LENGTH);
  const selected = (Array.isArray(traits) ? traits : [])
    .slice(0, MAX_TRAITS)
    .map(id => COMPANION_TRAITS.find(t => t.id === id))
    .filter(Boolean);

  const traitLine = selected.length
    ? selected.map(t => t.desc).join("，")
    : "個性平衡自然";

  return `你是「${safeName}」，使用者的語音陪伴夥伴。${traitLine}。用繁體中文口語化回覆，句子簡短自然，適合被念出來——避免條列、避免 markdown 符號、避免長段落。`;
}
