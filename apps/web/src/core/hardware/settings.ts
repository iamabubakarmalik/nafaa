import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Hardware settings — HAR COMPUTER ki apni (localStorage), kyun ke
 * printer/scale usi counter se jure hote hain. Sab kuch default BAND:
 * jab tak dukaan-daar khud "Direct print" na chune, purana browser
 * print hi chalta rehta hai.
 */
/** desktop = Nafaa desktop app ka LAN/USB printer (Settings → Desktop printer) */
export type PrintMode = 'browser' | 'direct' | 'desktop';
export type Transport = 'usb' | 'serial' | 'bluetooth';

export interface HardwareSettings {
  printMode: PrintMode;
  transport: Transport;
  /** Serial printer ki speed — aksar 9600 ya 115200 */
  printerBaud: number;
  /** Pehchan — dobara jurne ke liye (USB vendor/product, BLE naam) */
  printerLabel: string;
  printBarcode: boolean;
  /** Cash sale par drawer khud khule */
  drawerOnCash: boolean;
  /** Tarazu */
  scaleEnabled: boolean;
  scaleBaud: number;
  scaleLabel: string;
  set: (p: Partial<Omit<HardwareSettings, 'set'>>) => void;
}

export const useHardwareSettings = create<HardwareSettings>()(
  persist(
    (set) => ({
      printMode: 'browser',
      transport: 'usb',
      printerBaud: 9600,
      printerLabel: '',
      printBarcode: true,
      drawerOnCash: false,
      scaleEnabled: false,
      scaleBaud: 9600,
      scaleLabel: '',
      set: (p) => set(p),
    }),
    { name: 'nafaa-hardware' },
  ),
);

export const hardwareSupport = () => ({
  usb: typeof navigator !== 'undefined' && 'usb' in navigator,
  serial: typeof navigator !== 'undefined' && 'serial' in navigator,
  bluetooth: typeof navigator !== 'undefined' && 'bluetooth' in navigator,
  secure: typeof window !== 'undefined' && window.isSecureContext,
});
