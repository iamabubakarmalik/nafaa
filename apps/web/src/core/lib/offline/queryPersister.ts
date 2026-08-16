import Dexie, { type Table } from 'dexie';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

/* ════════════════════════════════════════════════════════════
   REACT QUERY PERSISTENCE — IndexedDB (Dexie) backed
   ────────────────────────────────────────────────────────────
   • Har successful query ka data IndexedDB me save hota hai
   • Offline refresh → queries hydrate → page waisa hi khulta hai
   • localStorage NAHI use karte (5MB limit, sync/blocking)
   • IndexedDB ~sau MB tak safe hai
   ════════════════════════════════════════════════════════════ */

interface CacheRow {
  key: string;
  value: string;
  updatedAt: number;
}

class NafaaQueryCacheDB extends Dexie {
  cache!: Table<CacheRow, string>;
  constructor() {
    super('NafaaQueryCacheDB');
    this.version(1).stores({ cache: 'key' });
  }
}

const qdb = new NafaaQueryCacheDB();
const STORAGE_KEY = 'nafaa-rq-cache-v1';

export const queryCachePersister = createAsyncStoragePersister({
  storage: {
    getItem: async (key: string): Promise<string | null> => {
      try {
        const row = await qdb.cache.get(key);
        return row?.value ?? null;
      } catch {
        return null;
      }
    },
    setItem: async (key: string, value: string): Promise<void> => {
      try {
        await qdb.cache.put({ key, value, updatedAt: Date.now() });
      } catch (e) {
        // Quota full pe crash mat karo — purana cache clear karke retry
        console.warn('[rq-persist] write failed, clearing old cache:', e);
        try {
          await qdb.cache.clear();
          await qdb.cache.put({ key, value, updatedAt: Date.now() });
        } catch {}
      }
    },
    removeItem: async (key: string): Promise<void> => {
      try { await qdb.cache.delete(key); } catch {}
    },
  },
  key: STORAGE_KEY,
  throttleTime: 1000, // writes debounce — performance
  serialize: (data) => JSON.stringify(data),
  deserialize: (data) => {
    try { return JSON.parse(data); } catch { return undefined as any; }
  },
});

export async function clearQueryCache(): Promise<void> {
  try { await qdb.cache.clear(); } catch {}
}
