// EVONCHAT adaptation, 2026-11-03: never touch another feature's storage keys.
const prefix = 'evonchat:typewords:v1:'
export const evonStorage = {
  getItem: (key: string) => globalThis.localStorage.getItem(prefix + key),
  setItem: (key: string, value: string) => globalThis.localStorage.setItem(prefix + key, value),
  removeItem: (key: string) => globalThis.localStorage.removeItem(prefix + key),
}
