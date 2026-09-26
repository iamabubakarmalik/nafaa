import { useCallback, useEffect, useState } from 'react';
import type { PosViewMode } from '../lib/posCart';

/* ═════════════════════════════════════════════════════════════
   POS KI APNI SETTINGS — browser me mehfooz
   ─────────────────────────────────────────────────────────────
   Rate chhupana, auto-print, printer ka naap… ye har POS page me
   alag alag `useState` + `useEffect` ke joron me likha hota tha,
   aur har jagah localStorage ki chaabi ka naam bhi alag. Nateeja:
   Retail par settings yaad rehti thin, Bakery par har refresh ke
   baad wapas default par chali jati thin.

   Ab ek hook. Chaabi me industry ka naam aata hai, to har POS ki
   settings apni rehti hain — magar tareeqa ek hi hai.
   ═════════════════════════════════════════════════════════════ */

export type PrinterWidth = '80' | '58';

export interface PosPreferences {
  /**
   * Counter par customer ke samne rate chhupa dena.
   *
   * Thok ka kaam karne wali dukaanon me har customer ka apna rate
   * hota hai — screen par sab ke samne rate khula rehna jhagre ki
   * jar banta hai.
   */
  hidePrices: boolean;
  /** Sale ke baad kamyabi wali screen khud band ho jaye */
  autoClose: boolean;
  /** Bill khud chhap jaye — counter par har dafa click na karna pare */
  autoPrint: boolean;
  printerWidth: PrinterWidth;
  viewMode: PosViewMode;
}

const DEFAULTS: PosPreferences = {
  hidePrices: false,
  autoClose: true,
  autoPrint: true,
  printerWidth: '80',
  viewMode: 'products',
};

function readBool(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : raw === 'true';
  } catch {
    // Private window ya storage band — default par chalte raho,
    // sale rokne ki wajah ye nahi ban sakti.
    return fallback;
  }
}

function readStr<T extends string>(key: string, fallback: T): T {
  try {
    return (localStorage.getItem(key) as T | null) ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try { localStorage.setItem(key, String(value)); } catch { /* private mode */ }
}

/**
 * @param scope Industry ka naam — "retail", "bakery". Har POS ki
 *              settings alag rehti hain (bakery ka 58mm printer
 *              retail ke 80mm ko nahi badalta).
 */
export function usePosPreferences(scope: string, overrides: Partial<PosPreferences> = {}) {
  const defaults = { ...DEFAULTS, ...overrides };
  const k = (name: string) => `nafaa.${scope}-pos.${name}`;

  const [hidePrices, setHidePrices] = useState(() => readBool(k('hide-prices'), defaults.hidePrices));
  const [autoClose, setAutoClose] = useState(() => readBool(k('auto-close-success'), defaults.autoClose));
  const [autoPrint, setAutoPrint] = useState(() => readBool(k('auto-print'), defaults.autoPrint));
  const [printerWidth, setPrinterWidth] = useState<PrinterWidth>(
    () => readStr<PrinterWidth>(k('printer-width'), defaults.printerWidth),
  );
  const [viewMode, setViewMode] = useState<PosViewMode>(
    () => readStr<PosViewMode>(k('view-mode'), defaults.viewMode),
  );

  useEffect(() => { write(k('hide-prices'), hidePrices); }, [hidePrices, scope]);
  useEffect(() => { write(k('auto-close-success'), autoClose); }, [autoClose, scope]);
  useEffect(() => { write(k('auto-print'), autoPrint); }, [autoPrint, scope]);
  useEffect(() => { write(k('printer-width'), printerWidth); }, [printerWidth, scope]);
  useEffect(() => { write(k('view-mode'), viewMode); }, [viewMode, scope]);

  const toggleHidePrices = useCallback(() => setHidePrices((v) => !v), []);

  return {
    hidePrices, setHidePrices, toggleHidePrices,
    autoClose, setAutoClose,
    autoPrint, setAutoPrint,
    printerWidth, setPrinterWidth,
    viewMode, setViewMode,
  };
}
