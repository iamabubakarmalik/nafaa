import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@core/api/client';
import { cn } from '@core/lib/cn';
import { qrSvg } from '@core/payments/qrSvg';
import type { Fiscal } from './taxAuthority.api';

/**
 * Bill par PRA / SRB / KPRA ka fiscal number + QR (authority ka qaida).
 * Tax band ho ya is bill ka record na ho to kuch nahi dikhta.
 */
export function TaxAuthorityReceiptBadge({ saleId, className }: { saleId?: string; className?: string }) {
  const { data } = useQuery({
    queryKey: ['tax-authority-sale', saleId],
    enabled: !!saleId,
    queryFn: () => apiClient.get(`/tax-authority/sales/${saleId}`).then((r) => (r?.data?.data ?? r?.data ?? null) as Fiscal | null),
    retry: false,
    // Abhi bheja ja raha ho to thori der dekhte raho
    refetchInterval: (q) => (q.state.data && q.state.data.status !== 'SUCCESS' && q.state.dataUpdateCount < 12 ? 5_000 : false),
  });
  const svg = useMemo(() => (data?.qrText ? qrSvg(data.qrText, 110) : ''), [data?.qrText]);
  if (!data) return null;
  if (data.status !== 'SUCCESS') {
    return <div className={cn('text-center text-[10px] font-bold', className)}>{data.authority} invoice: bheja ja raha hai</div>;
  }
  return (
    <div className={cn('mt-2 border-t border-dashed border-black pt-2 text-center', className)}>
      <div className="text-[11px] font-black uppercase tracking-wide">{data.label}</div>
      <div className="font-mono text-[12px] font-bold break-all">{data.fiscalNumber}</div>
      <div className="text-[10px] font-bold">Tax {data.taxRate}% · Rs {data.taxAmount.toLocaleString('en-PK')}</div>
      {svg && <div className="mx-auto mt-1 inline-block bg-white" dangerouslySetInnerHTML={{ __html: svg }} />}
    </div>
  );
}
