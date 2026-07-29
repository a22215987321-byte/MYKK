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
// throughout ChatRoom.js/CalendarMemo.js/Feed.js (with their own
// per-container fallback, so "無背景" just removes the property and each
// container goes back to whatever it showed before this feature existed).
//
// Every "chrome" panel (sidebar/calendar/chat headers/input bars/feed) paints
// its OWN copy of --chat-world-bg directly, layered under a --chat-world-tint
// wash, rather than relying on being translucent enough to reveal a single
// shared full-viewport image sitting on <body> — that approach turned out to
// be unreliable in practice (worked for some panels, silently didn't for
// others depending on how deeply nested/clipped they were), where every panel
// painting its own independent copy can't fail that way since it doesn't
// depend on anything above it in the tree.
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
    // A wash of the panel's own surface color over the photo — keeps text/
    // icons legible and still reads as "this theme's colors," not just a
    // random photo pasted behind the UI. Derived from --panel-alt so it
    // adapts automatically per theme (light wash on light themes, dark wash
    // on neon) instead of being one hardcoded color.
    root.setProperty("--chat-world-tint", "color-mix(in srgb, var(--panel-alt) 55%, transparent)");
  } else {
    root.removeProperty("--chat-world-bg");
    root.removeProperty("--chat-world-bg-size");
    root.removeProperty("--chat-world-bg-repeat");
    root.removeProperty("--chat-world-tint");
  }
}

// Called once on mount to re-apply whatever was saved last session — the CSS
// property itself doesn't persist across a page load on its own.
export function applySavedWorld() {
  const worldId = getSavedWorldId();
  applyWorld(worldId, getSavedVariantId(worldId));
}
