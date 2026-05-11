import { create } from 'zustand';
import { Appearance } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { colorScheme as nwColorScheme } from 'nativewind';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => Promise<void>;
  initialize: () => Promise<void>;
}

const computeIsDark = (mode: ThemeMode): boolean => {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return Appearance.getColorScheme() === 'dark';
};

// CRITICAL: always pass explicit 'light' | 'dark' to NativeWind.
// Passing 'system' makes NativeWind's class never activate Tailwind dark: variants.
const applyScheme = (isDark: boolean) => {
  nwColorScheme.set(isDark ? 'dark' : 'light');
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'system',
  isDark: Appearance.getColorScheme() === 'dark',

  setMode: async (mode) => {
    await SecureStore.setItemAsync('theme-mode', mode);
    const isDark = computeIsDark(mode);
    applyScheme(isDark);
    set({ mode, isDark });
  },

  initialize: async () => {
    const stored = await SecureStore.getItemAsync('theme-mode');
    const mode = (stored as ThemeMode) || 'system';
    const isDark = computeIsDark(mode);
    applyScheme(isDark);
    set({ mode, isDark });

    Appearance.addChangeListener(({ colorScheme }) => {
      const currentMode = get().mode;
      if (currentMode === 'system') {
        const newIsDark = colorScheme === 'dark';
        applyScheme(newIsDark);
        set({ isDark: newIsDark });
      }
    });
  },
}));
