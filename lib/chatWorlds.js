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

// Persists the choice and writes the CSS custom properties ChatRoom's
// message containers read (with their own per-container fallback, so "無背景"
// just removes the property and each container goes back to whatever it
// showed before this feature existed).
//
// --chat-world-panel-opacity/-blur additionally drive the sidebar, calendar,
// chat headers and input bars (see .cr-sidebar/.cr-cal/.cr-chat-header/
// .cr-input-bar rules in ChatRoom.js's <style> block) — turning them
// translucent so the full-viewport background (applied to <body>, see
// theme.css) actually shows through everywhere instead of just inside the
// message list. Both fall back to "fully opaque, no blur" when unset, which
// is pixel-identical to how these panels looked before this feature existed.
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
    root.setProperty("--chat-world-panel-opacity", "82%");
    root.setProperty("--chat-world-panel-blur", "blur(10px)");
  } else {
    root.removeProperty("--chat-world-bg");
    root.removeProperty("--chat-world-bg-size");
    root.removeProperty("--chat-world-bg-repeat");
    root.removeProperty("--chat-world-panel-opacity");
    root.removeProperty("--chat-world-panel-blur");
  }
}

// Called once on mount to re-apply whatever was saved last session — the CSS
// property itself doesn't persist across a page load on its own.
export function applySavedWorld() {
  const worldId = getSavedWorldId();
  applyWorld(worldId, getSavedVariantId(worldId));
}
