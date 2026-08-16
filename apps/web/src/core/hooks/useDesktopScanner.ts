import { useEffect } from 'react';
import { getElectron } from '@core/lib/desktop/electron';
import { toast } from 'sonner';

/**
 * Listen for global scanner shortcut (Ctrl+Shift+B).
 * When triggered, focuses the first visible input with data-barcode-input attribute,
 * or the first visible search input as fallback.
 */
export function useDesktopScanner() {
  useEffect(() => {
    const electron = getElectron() as any;
    if (!electron?.onScannerFocusInput) return;

    return electron.onScannerFocusInput(() => {
      // Try to find a barcode input first
      const barcodeInput = document.querySelector<HTMLInputElement>(
        'input[data-barcode-input="true"], input[name="barcode"], input[placeholder*="barcode" i], input[placeholder*="scan" i]',
      );

      if (barcodeInput) {
        barcodeInput.focus();
        barcodeInput.select();
        toast.info('🔍 Scan karein…', { duration: 1500 });
        return;
      }

      // Fallback: focus first visible search input
      const searchInput = document.querySelector<HTMLInputElement>(
        'input[type="search"], input[placeholder*="search" i], input[placeholder*="dhoondh" i]',
      );

      if (searchInput) {
        searchInput.focus();
        searchInput.select();
        toast.info('🔍 Search focus — scan karein', { duration: 1500 });
      } else {
        toast.warning('Koi input field visible nahi — pehle POS/products page open karein');
      }
    });
  }, []);
}
