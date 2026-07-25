// Minimal IndexedDB wrapper for EVON Studio drafts. No wrapper library —
// the surface we need (put/get/delete/list one object store) is small
// enough that adding idb/dexie would just be another dependency to justify.
const DB_NAME = "evon-studio";
const DB_VERSION = 1;
const STORE = "drafts";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore(mode, fn) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const store = tx.objectStore(STORE);
      const result = fn(store);
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function saveDraft(draft) {
  // draft: { id, type: "photo"|"video", updatedAt, ...editor-specific JSON }
  await withStore("readwrite", (store) => store.put(draft));
}

export async function loadDraft(id) {
  let result;
  await withStore("readonly", (store) => {
    const req = store.get(id);
    req.onsuccess = () => { result = req.result; };
  });
  return result || null;
}

export async function deleteDraft(id) {
  await withStore("readwrite", (store) => store.delete(id));
}

export async function listDrafts(type) {
  let result = [];
  await withStore("readonly", (store) => {
    const req = store.getAll();
    req.onsuccess = () => { result = type ? req.result.filter(d => d.type === type) : req.result; };
  });
  return result.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}
