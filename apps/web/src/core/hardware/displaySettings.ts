/**
 * Customer display options for this computer: colours for bright or dark
 * rooms, the welcome line, shop messages that rotate on the screen, and
 * whether the logo, clock and payment QR are shown. Stored in the browser
 * like the other hardware settings; the display window picks up changes
 * live through the storage event.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** dark = navy, black = pure black with dimmer text for dark rooms, light = white. */
export type DisplayTheme = 'dark' | 'black' | 'light';

export const DISPLAY_SETTINGS_KEY = 'nafaa-customer-display';
export const MAX_PROMOS = 8;
export const PROMO_LENGTH = 120;

export interface DisplaySettings {
  theme: DisplayTheme;
  /** Big line on the waiting screen. */
  welcome: string;
  /** Shop messages, one per slide: offers, timings, "Home delivery". */
  promos: string[];
  showLogo: boolean;
  showClock: boolean;
  /** Show the payment QR full screen while the cashier takes payment. */
  showQr: boolean;
  set: (p: Partial<Omit<DisplaySettings, 'set'>>) => void;
}

export const useDisplaySettings = create<DisplaySettings>()(
  persist(
    (set) => ({
      theme: 'dark',
      welcome: 'Khush-amdeed',
      promos: [],
      showLogo: true,
      showClock: true,
      showQr: true,
      set: (p) => set(p),
    }),
    { name: DISPLAY_SETTINGS_KEY },
  ),
);

/** Trims and limits shop messages before they are saved. */
export function cleanPromos(lines: string[]): string[] {
  return lines.map((l) => l.trim().slice(0, PROMO_LENGTH)).filter(Boolean).slice(0, MAX_PROMOS);
}
