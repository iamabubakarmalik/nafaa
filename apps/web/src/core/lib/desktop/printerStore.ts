import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PrinterConfig } from './electron';

interface PrinterStore {
  config: PrinterConfig;
  enabled: boolean;
  setConfig: (config: PrinterConfig) => void;
  setEnabled: (enabled: boolean) => void;
  reset: () => void;
}

const DEFAULT_CONFIG: PrinterConfig = {
  connectionType: 'network',
  ipAddress: '192.168.1.100',
  port: 9100,
  type: 'EPSON',
  width: 48,
};

export const usePrinterStore = create<PrinterStore>()(
  persist(
    (set) => ({
      config: DEFAULT_CONFIG,
      enabled: false,
      setConfig: (config) => set({ config }),
      setEnabled: (enabled) => set({ enabled }),
      reset: () => set({ config: DEFAULT_CONFIG, enabled: false }),
    }),
    { name: 'nafaa-printer-config' },
  ),
);
