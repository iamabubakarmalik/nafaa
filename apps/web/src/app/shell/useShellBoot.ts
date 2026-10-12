/**
 * Background services that start once the signed-in app shell mounts:
 * realtime notifications, desktop integration, hardware, payment QR codes,
 * tax-authority and Google review settings, the receipt design, and the
 * privacy PIN state.
 */

import { useEffect } from 'react';
import { useAuthStore } from '@core/stores/auth.store';
import { usePrivacyStore } from '@core/stores/privacy.store';
import { useRealtimeNotifications } from '@core/hooks/useRealtimeNotifications';
import { useDesktopNavigation, useDesktopShortcuts } from '@core/lib/desktop/useDesktop';
import { useDesktopScanner } from '@core/hooks/useDesktopScanner';
import { useDesktopAutoBackup } from '@core/lib/desktop/useDesktopAutoBackup';
import { useDesktopMemory, useDesktopPower } from '@core/lib/desktop/useDesktopMemory';
import { useDesktopDeepLink } from '@core/lib/desktop/useDesktopDeepLink';
import { useHardwareBoot } from '@core/hardware/HardwareBoot';
import { usePayQrs } from '@core/payments/payQr';
import { useGoogleReviewLink } from '@integrations/google/google.api';
import { useTaxAuthorityBoot } from '@integrations/tax-authority/taxAuthority.api';
import { useReceiptSetup } from '@core/receipt/setup';

export function useShellBoot() {
  useRealtimeNotifications();
  useDesktopNavigation();
  useDesktopShortcuts();
  useDesktopScanner();
  useDesktopAutoBackup();
  useDesktopMemory();
  useDesktopPower();
  useDesktopDeepLink();
  useHardwareBoot();
  usePayQrs(); // preloads QR codes printed on receipts
  useGoogleReviewLink();
  useTaxAuthorityBoot();
  useReceiptSetup(); // receipt design and shop details, kept for offline printing

  // The privacy PIN lives on the server; load its state right after sign-in.
  const userId = useAuthStore((s) => s.user?.id);
  const refreshPinStatus = usePrivacyStore((s) => s.refresh);
  useEffect(() => {
    if (userId) refreshPinStatus();
  }, [userId, refreshPinStatus]);
}
