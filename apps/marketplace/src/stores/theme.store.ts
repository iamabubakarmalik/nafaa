import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  effectiveTheme: 'light' | 'dark';
  setTheme: (t: Theme) => void;
  initialize: () => void;
}

const getSystemTheme = (): 'light' | 'dark' =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

const applyTheme = (t: 'light' | 'dark') => {
  document.documentElement.classList.toggle('dark', t === 'dark');
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      effectiveTheme: 'light',

      setTheme: (t) => {
        const eff = t === 'system' ? getSystemTheme() : t;
        applyTheme(eff);
        set({ theme: t, effectiveTheme: eff });
      },

      initialize: () => {
        const stored = get().theme;
        const eff = stored === 'system' ? getSystemTheme() : stored;
        applyTheme(eff);
        set({ effectiveTheme: eff });

        // Listen to system changes if using system theme
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
          if (get().theme === 'system') {
            const newEff = e.matches ? 'dark' : 'light';
            applyTheme(newEff);
            set({ effectiveTheme: newEff });
          }
        });
      },
    }),
    {
      name: 'marketplace-theme',
      partialize: (s) => ({ theme: s.theme }),
    },
  ),
);
