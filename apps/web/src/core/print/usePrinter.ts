/**
 * Hook giving any component a ready `print(doc, format?)` with the shop
 * header, accent colour and the user's print settings applied.
 */

import { useCallback } from 'react';
import { useAppearance } from '@/design-system';
import { useAuthStore } from '@core/stores/auth.store';
import { printDoc, renderContext } from './printDoc';
import { usePrintSettings } from './settings';
import { useBusinessHeader } from './useBusinessHeader';
import type { PrintDoc, PrintFormat } from './types';

export function usePrinter() {
  const biz = useBusinessHeader();
  const { accentHex } = useAppearance();
  const userName = useAuthStore((s) => s.user?.fullName);
  const format = usePrintSettings((s) => s.format);
  const print = useCallback(
    (doc: PrintDoc, f: PrintFormat = usePrintSettings.getState().format) => printDoc(doc, f, renderContext(biz, accentHex, userName)),
    [biz, accentHex, userName],
  );
  return { print, format };
}
