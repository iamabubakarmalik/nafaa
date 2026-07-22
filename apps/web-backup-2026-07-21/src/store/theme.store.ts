import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  initialize: () => void;
}

const computeIsDark = (mode: ThemeMode): boolean => {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const applyDOM = (isDark: boolean) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (isDark) root.classList.add('dark');
  else root.classList.remove('dark');
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'system',
      isDark: false,

      setMode: (mode) => {
        const isDark = computeIsDark(mode);
        applyDOM(isDark);
        set({ mode, isDark });
      },

      initialize: () => {
        const mode = get().mode;
        const isDark = computeIsDark(mode);
        applyDOM(isDark);
        set({ isDark });

        if (typeof window !== 'undefined') {
          const mq = window.matchMedia('(prefers-color-scheme: dark)');
          const handler = () => {
            if (get().mode === 'system') {
              const newIsDark = mq.matches;
              applyDOM(newIsDark);
              set({ isDark: newIsDark });
            }
          };
          mq.addEventListener('change', handler);
        }
      },
    }),
    {
      name: 'nafaa-theme',
      partialize: (state) => ({ mode: state.mode }),
    },
  ),
);
