import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface RecentSearch {
  query: string;
  category?: string;
  timestamp: number;
  resultCount?: number;
}

interface RecentSearchesState {
  items: RecentSearch[];
  add: (query: string, category?: string, resultCount?: number) => void;
  remove: (query: string) => void;
  clear: () => void;
}

const MAX_RECENT = 15;

export const useRecentSearchesStore = create<RecentSearchesState>()(
  persist(
    (set) => ({
      items: [],
      add: (query, category, resultCount) => set((s) => {
        const trimmed = query.trim();
        if (!trimmed) return s;
        const filtered = s.items.filter((i) => i.query.toLowerCase() !== trimmed.toLowerCase());
        return {
          items: [{ query: trimmed, category, resultCount, timestamp: Date.now() }, ...filtered].slice(0, MAX_RECENT),
        };
      }),
      remove: (query) => set((s) => ({
        items: s.items.filter((i) => i.query.toLowerCase() !== query.toLowerCase()),
      })),
      clear: () => set({ items: [] }),
    }),
    { name: 'marketplace-recent-searches' },
  ),
);
