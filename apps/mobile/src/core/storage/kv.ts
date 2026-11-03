/**
 * Small synchronous key-value store on expo-sqlite.
 *
 * Synchronous reads are what let the language and the theme be known before
 * the first frame (and before module-level `t()` calls run). Values are JSON.
 * Use SecureStore (core/auth) for tokens; this store is not encrypted.
 */

import Storage from 'expo-sqlite/kv-store';

export const kv = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = Storage.getItemSync(key);
      return raw == null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown): void {
    try {
      Storage.setItemSync(key, JSON.stringify(value));
    } catch {
      // Storage full or unavailable: the value applies for this session only.
    }
  },
  remove(key: string): void {
    try {
      Storage.removeItemSync(key);
    } catch {
      // Nothing to remove.
    }
  },
};

/** Adapter for zustand's `persist` middleware. */
export const kvZustandStorage = {
  getItem: (name: string) => {
    try {
      return Storage.getItemSync(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string) => {
    try {
      Storage.setItemSync(name, value);
    } catch {
      // ignore
    }
  },
  removeItem: (name: string) => {
    try {
      Storage.removeItemSync(name);
    } catch {
      // ignore
    }
  },
};
