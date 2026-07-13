// Client-only module — safe to import from components, not API routes.
// Caches edits at module level so all components share the same data in one session.

const cache = {}; // "es__hola" → { t, s, g, p, en, ex, src }
let loadPromise = null;

async function getFirestore() {
  const { db } = await import("./firebase");
  const { collection, doc, getDocs, setDoc } = await import("firebase/firestore");
  return { db, collection, doc, getDocs, setDoc };
}

export function loadAllEdits() {
  if (typeof window === "undefined") return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadPromise = getFirestore()
    .then(({ db, collection, getDocs }) => getDocs(collection(db, "dictEdits")))
    .then(snaps => { snaps.forEach(s => { cache[s.id] = s.data(); }); })
    .catch(e => { console.warn("dictEdits load failed:", e.message); loadPromise = null; });
  return loadPromise;
}

export function getEdit(lang, word) {
  if (!word) return null;
  return cache[`${lang}__${word.toLowerCase()}`] || null;
}

export async function saveEdit(lang, word, fields) {
  const key = `${lang}__${word.toLowerCase()}`;
  const payload = {};
  ["t", "s", "g", "p", "en", "ex", "src"].forEach(k => {
    if (fields[k] != null && String(fields[k]).trim() !== "") payload[k] = String(fields[k]).trim();
  });
  const { db, doc, setDoc } = await getFirestore();
  await setDoc(doc(db, "dictEdits", key), payload);
  cache[key] = payload;
  return payload;
}
