/**
 * Print preferences for this computer (printers belong to a counter, so
 * these live in the browser like the hardware settings).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PrintFormat } from './types';

export type ColorMode = 'color' | 'mono';
export type ThermalText = 'sm' | 'md' | 'lg';

export interface PrintSettings {
  /** Format the Print button uses on a single click. */
  format: PrintFormat;
  /** A4 and PDF: brand-coloured headings, or plain black for mono printers. */
  colorMode: ColorMode;
  showLogo: boolean;
  showAddress: boolean;
  showPhone: boolean;
  /** Line printed at the bottom of every document. */
  footerNote: string;
  thermalText: ThermalText;
  /** Print the "Printed on … by …" stamp. */
  showStamp: boolean;
  set: (patch: Partial<Omit<PrintSettings, 'set'>>) => void;
}

export const usePrintSettings = create<PrintSettings>()(
  persist(
    (set) => ({
      format: 'a4',
      colorMode: 'color',
      showLogo: true,
      showAddress: true,
      showPhone: true,
      footerNote: '',
      thermalText: 'md',
      showStamp: true,
      set: (patch) => set(patch),
    }),
    { name: 'nafaa-print', version: 1, migrate: (old) => ({ ...(old as object) }) as PrintSettings },
  ),
);

export const FORMAT_LABEL: Record<PrintFormat, string> = { a4: 'A4', pdf: 'PDF', '80': '80mm', '58': '58mm' };
