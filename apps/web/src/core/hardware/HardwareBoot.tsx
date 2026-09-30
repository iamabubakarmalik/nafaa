import { useEffect } from 'react';
import { Archive } from 'lucide-react';
import { reconnectPrinter, useDeviceStatus } from './devices';
import { openCashDrawer } from './print';
import { useHardwareSettings } from './settings';

/**
 * App khulte hi pehle se jora printer khud jor lo (koi popup nahi —
 * browser pichli ijazat yaad rakhta hai). USB cable dobara lagne par bhi.
 */
export function useHardwareBoot() {
  const mode = useHardwareSettings((s) => s.printMode);
  useEffect(() => {
    if (mode !== 'direct') return;
    void reconnectPrinter();
    const usb = (navigator as unknown as { usb?: EventTarget }).usb;
    const serial = (navigator as unknown as { serial?: EventTarget }).serial;
    const again = () => { void reconnectPrinter(); };
    usb?.addEventListener('connect', again);
    serial?.addEventListener('connect', again);
    return () => { usb?.removeEventListener('connect', again); serial?.removeEventListener('connect', again); };
  }, [mode]);
}

/** POS header ka "Drawer" button — sirf tab dikhta hai jab drawer khul sakta ho */
export function DrawerButton({ className }: { className?: string }) {
  const mode = useHardwareSettings((s) => s.printMode);
  const ready = useDeviceStatus((s) => s.printer.ready);
  if (!(mode === 'desktop' || (mode === 'direct' && ready))) return null;
  return (
    <button type="button" onClick={() => void openCashDrawer()} title="Cash drawer kholein" className={className}>
      <Archive className="h-5 w-5" />
    </button>
  );
}
