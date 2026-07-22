// Minimal pub/sub so any component can trigger a toast without needing a
// hook wired through props/context — replaces the 27 native alert() calls
// scattered across the app (see components/ToastHost.js for the renderer,
// mounted once in pages/_app.js).
const listeners = new Set();

export function toast(message, type = "error") {
  const item = { id: `${Date.now()}-${Math.random()}`, message, type };
  listeners.forEach(fn => fn(item));
  return item.id;
}

export function subscribeToast(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
