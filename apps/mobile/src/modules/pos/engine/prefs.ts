/** This phone's own counter choices (not the shop's): auto print after a sale. */

import { create } from 'zustand';
import { kv } from '@/core/storage/kv';

const KEY = 'nafaa.pos.prefs';

interface Prefs {
  /** Open the print dialog after every sale (off by default: the system dialog needs a tap). */
  autoPrint: boolean;
}

export const usePosPrefs = create<Prefs & { set: (p: Partial<Prefs>) => void }>((set, get) => ({
  autoPrint: false,
  ...kv.get<Partial<Prefs>>(KEY, {}),
  set: (p) => {
    set(p);
    const { set: _s, ...rest } = { ...get(), ...p };
    kv.set(KEY, rest);
  },
}));
