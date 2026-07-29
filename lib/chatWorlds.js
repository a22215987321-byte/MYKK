// Per-user, client-only chat background skins ("世界") — applied via a CSS
// custom property on <html> (same "write a setting, read it through CSS"
// pattern ThemeToggle already uses for theme/palette) so ChatRoom's message
// containers don't need their own React state or prop plumbing to react to
// a change made from a completely different part of the tree.
export const CHAT_WORLDS = [
  { id: "none", label: "🚫 無背景" },
  { id: "fire", label: "🔥 火世界", variants: [{ id: "main", label: "火世界", src: "/worlds/fire.png" }] },
  { id: "water", label: "🌊 水世界", variants: [
    { id: "palace", label: "海底皇宮", src: "/worlds/water-palace.png" },
    { id: "monster", label: "小怪物", src: "/worlds/water-monster.png" },
  ] },
  { id: "wood", label: "🌳 木世界", variants: [{ id: "main", label: "木世界", src: "/worlds/wood.png" }] },
];

const WORLD_KEY = "chatWorld";
const variantKey = (worldId) => `chatWorldVariant:${worldId}`;

export function getWorldById(id) {
  return CHAT_WORLDS.find(w => w.id === id);
}

export function getSavedWorldId() {
  if (typeof window === "undefined") return "none";
  const id = localStorage.getItem(WORLD_KEY);
  return CHAT_WORLDS.some(w => w.id === id) ? id : "none";
}

export function getSavedVariantId(worldId) {
  if (typeof window === "undefined") return null;
  const world = getWorldById(worldId);
  if (!world?.variants) return null;
  const saved = localStorage.getItem(variantKey(worldId));
  return world.variants.some(v => v.id === saved) ? saved : world.variants[0].id;
}

function getWorldImageSrc(worldId, variantId) {
  const world = getWorldById(worldId);
  if (!world || !world.variants) return null;
  const variant = world.variants.find(v => v.id === variantId) || world.variants[0];
  return variant?.src || null;
}

// Persists the choice and writes the CSS custom properties consumed
// throughout ChatRoom.js/CalendarMemo.js.
//
// The photo is painted exactly once, as <body>'s own background (see
// theme.css) — every chrome panel (shell/main/sidebar/header/input-bar/
// calendar) is normally opaque with its own theme color, and --chat-world-
// transparent overrides that to literal "transparent" only while a world is
// selected, so body's single fixed copy shows through everywhere uniformly.
// (An earlier version had every panel paint its own independent copy of the
// photo — correct in principle, but each copy needed its own matching fixed/
// cover/position setup to stay aligned, and it was easy for one to drift out
// of sync. One shared source removes that whole class of bug.)
export function applyWorld(worldId, variantId) {
  if (typeof window === "undefined") return;
  localStorage.setItem(WORLD_KEY, worldId);
  if (variantId) localStorage.setItem(variantKey(worldId), variantId);
  const src = getWorldImageSrc(worldId, variantId);
  const root = document.documentElement.style;
  if (src) {
    root.setProperty("--chat-world-bg", `url(${src})`);
    root.setProperty("--chat-world-bg-size", "cover");
    root.setProperty("--chat-world-bg-repeat", "no-repeat");
    root.setProperty("--chat-world-transparent", "transparent");
    // Same toggle as --chat-world-transparent, but a valid value for
    // background-image (a color keyword like "transparent" isn't) — used by
    // the one panel (私訊's dot-pattern placeholder) that paints its own
    // image when no world is selected and needs to stop when one is.
    root.setProperty("--chat-world-no-image", "none");
  } else {
    root.removeProperty("--chat-world-bg");
    root.removeProperty("--chat-world-bg-size");
    root.removeProperty("--chat-world-bg-repeat");
    root.removeProperty("--chat-world-transparent");
    root.removeProperty("--chat-world-no-image");
  }
}

// Called once on mount to re-apply whatever was saved last session — the CSS
// property itself doesn't persist across a page load on its own.
export function applySavedWorld() {
  const worldId = getSavedWorldId();
  applyWorld(worldId, getSavedVariantId(worldId));
}
