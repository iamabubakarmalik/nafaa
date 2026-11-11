/**
 * Minimal IndexedDB store for visits that could not be sent yet.
 * One object store keyed by the visit's clientId; photos are kept as Blobs.
 */

const DB_NAME = 'nafaa-partner';
const STORE = 'outbox';

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'clientId' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { dbPromise = null; reject(req.error); };
  });
  return dbPromise;
}

function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then((db) => new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error ?? req.error);
    tx.onabort = () => reject(tx.error ?? req.error);
  }));
}

export const idb = {
  all: <T>() => run<T[]>('readonly', (s) => s.getAll() as IDBRequest<T[]>),
  get: <T>(key: string) => run<T | undefined>('readonly', (s) => s.get(key) as IDBRequest<T | undefined>),
  put: <T>(value: T) => run('readwrite', (s) => s.put(value)),
  remove: (key: string) => run('readwrite', (s) => s.delete(key)),
};
