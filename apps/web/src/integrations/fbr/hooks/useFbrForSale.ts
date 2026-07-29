import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@core/api/client';

export interface FbrSaleStatus {
  fbrEnabled: boolean;
  mode: 'DISABLED' | 'MANUAL' | 'AUTO_ALL' | 'AUTO_ABOVE_LIMIT';
  environment?: 'SANDBOX' | 'PRODUCTION';
  taxRate?: number;
  askBeforeSubmit?: boolean;
  printQrOnReceipt?: boolean;
  printFbrLogo?: boolean;
  belowThreshold?: boolean;
  threshold?: number | null;
  invoice?: {
    id: string;
    status: string;
    fbrInvoiceNumber?: string | null;
    fbrQrCode?: string | null;
    fbrVerificationUrl?: string | null;
    totalAmount: number;
    taxAmount: number;
    netAmount: number;
    errorMessage?: string | null;
    retryCount: number;
    submittedAt?: string | null;
    skippedReason?: string | null;
  } | null;
  canSubmit: boolean;
  canSkip: boolean;
  message?: string;
}

/**
 * Kisi bhi sale ka FBR status fetch karta hai.
 * Agar FBR disabled hai — {fbrEnabled: false} return karta hai.
 * Components conditionally render kar sakte hain iski basis pe.
 */
export function useFbrForSale(saleId: string | null | undefined) {
  return useQuery({
    queryKey: ['fbr-sale-status', saleId],
    queryFn: async () => {
      if (!saleId) return null;
      const res = await apiClient.get(`/integrations/fbr/sale/${saleId}/status`);
      return (res?.data?.data ?? res?.data ?? res) as FbrSaleStatus;
    },
    enabled: !!saleId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
