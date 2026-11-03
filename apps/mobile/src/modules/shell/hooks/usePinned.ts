/** Pinned menu items (per device), like the web sidebar favourites. */

import { create } from 'zustand';
import { kv } from '@/core/storage/kv';

const KEY = 'nafaa.nav.pinned';
const DEFAULT_PINNED = ['/pos', '/sales', '/products', '/khata'];

interface Pinned {
  pinned: string[];
  toggle: (to: string) => boolean;
}

export const usePinned = create<Pinned>((set, get) => ({
  pinned: kv.get<string[]>(KEY, DEFAULT_PINNED),
  toggle: (to) => {
    const has = get().pinned.includes(to);
    const pinned = has ? get().pinned.filter((p) => p !== to) : [...get().pinned, to].slice(-8);
    kv.set(KEY, pinned);
    set({ pinned });
    return !has;
  },
}));
