// EVONCHAT adaptation, 2026-11-03: an isolated TypeWords database.
import { createStore, get as read, set as write, del as remove, update as change } from 'idb-keyval'
let store: ReturnType<typeof createStore> | undefined
const isolated = () => store ??= createStore('evonchat-typewords-v1', 'typewords')
export const get = <T = any>(key: IDBValidKey) => read<T>(key, isolated())
export const set = (key: IDBValidKey, value: any) => write(key, value, isolated())
export const del = (key: IDBValidKey) => remove(key, isolated())
export const update = <T = any>(key: IDBValidKey, updater: (old: T | undefined) => T) => change<T>(key, updater, isolated())
