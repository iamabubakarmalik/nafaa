/**
 * What to do with an expired or expiring batch: send it back to the
 * distributor against the purchase it came on (stock and the distributor's
 * khata both go down), or write it off as damage when it cannot go back.
 * Both use the shared purchase-return and stock-adjustment flows.
 */

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PackageX, Truck } from 'lucide-react';
import { Button, Input, Modal, Segmented } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { purchasesApi } from '@modules/purchasing/purchases/api/purchases.api';
import { stockAdjustmentsApi } from '@modules/inventory/stock-adjustments/api/stock-adjustments.api';
import { expiryApi, type ExpiryRow } from '../api/expiry.api';
import { shortDate } from '../lib/meta';
import { t } from '@core/i18n';

type Mode = 'return' | 'writeoff';
const apiError = (e: unknown, fallback: string) => (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

export function ExpiryActionModal({ row, onDone, onClose }: { row: ExpiryRow; onDone: () => void; onClose: () => void }) {
  const canReturn = usePermission(PERMISSIONS.PURCHASES_CREATE);
  const canWriteOff = usePermission(PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE);
  const [mode, setMode] = useState<Mode>(canReturn ? 'return' : 'writeoff');
  const [lineId, setLineId] = useState<string>('');
  const [qty, setQty] = useState<string>('');
  const [reason, setReason] = useState(row.daysLeft < 0 ? t('Expire ho gayi') : t('Expiry qareeb'));

  const src = useQuery({ queryKey: ['pharmacy-expiry-source', row.id], queryFn: () => expiryApi.source(row.id), enabled: canReturn });
  const lines = src.data?.lines ?? [];
  const line = lines.find((l) => l.itemId === lineId) ?? lines[0];
  const maxUnits = mode === 'return' ? line?.returnableUnits ?? 0 : row.quantity;
  const amount = Number(qty) || 0;
  const value = mode === 'return' && line ? amount * line.unitCost : amount * row.unitCost;

  const run = useMutation({
    mutationFn: async () => {
      if (!(amount > 0)) throw new Error(t('Miqdaar likhein'));
      if (amount > maxUnits + 1e-9) throw new Error(t('Zyada se zyada {{maxUnits}}', { maxUnits }));
      if (mode === 'return') {
        if (!line) throw new Error(t('Is batch ki koi purchase nahi mili'));
        const res = await purchasesApi.returnGoods(line.purchaseId, { items: [{ itemId: line.itemId, quantity: amount }], reason: `${reason} · Batch ${row.batchNumber}` }); // i18n-ignore
        return t('{{returnNumber}} — {{name}} ke khate se {{total}} kam', { returnNumber: res.returnNumber, name: line.supplier.name, total: formatPKR(res.total) });
      }
      await stockAdjustmentsApi.create({
        productId: row.product.id, shopId: row.shop?.id, type: 'DAMAGE', reasonCode: 'EXPIRY', quantity: amount, batchId: row.id,
        reason: reason.trim() || 'Expire', note: `Batch ${row.batchNumber} · expiry ${shortDate(row.expiryDate)}`, // i18n-ignore
      });
      return t('{{amount}} {{unit}} kharab likh diya', { amount, unit: row.product.unit });
    },
    onSuccess: (msg) => { toast.success(msg); onDone(); },
    onError: (e) => toast.error(apiError(e, (e as Error).message || t('Nahi hua'))),
  });

  return (
    <Modal open onClose={onClose} size="lg" title={t('{{name}} · Batch {{batchNumber}}', { name: row.product.name, batchNumber: row.batchNumber })}
      description={t('Expiry {{expiryDate}} · shelf par {{value}} {{unit}}', { expiryDate: shortDate(row.expiryDate), value: Number(row.quantity.toFixed(2)), unit: row.product.unit })}
      footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>{t('Wapas')}</Button>
        <Button variant={mode === 'writeoff' ? 'danger' : 'primary'} loading={run.isPending} disabled={!(amount > 0) || (mode === 'return' && !line)} onClick={() => run.mutate()}>
          {mode === 'return' ? t('Distributor ko wapas') : t('Kharab likhein')}
        </Button></div>}>
      <div className="space-y-4">
        <Segmented<Mode> value={mode} onChange={(v) => { setMode(v); setQty(''); }} label={t('Kya karna hai')}
          items={[
            ...(canReturn ? [{ value: 'return' as const, label: <span className="inline-flex items-center gap-1.5"><Truck className="h-4 w-4" />{t('Distributor ko wapas')}</span> }] : []),
            ...(canWriteOff ? [{ value: 'writeoff' as const, label: <span className="inline-flex items-center gap-1.5"><PackageX className="h-4 w-4" />{t('Kharab / zaya')}</span> }] : []),
          ]} />
        {mode === 'return' ? (
          src.isLoading ? <p className="py-6 text-center text-[0.8125rem] text-slate-500">{t('Purchase dhoond rahe hain…')}</p>
            : lines.length === 0 ? (
              <p className="rounded-xl bg-amber-50 px-3 py-3 text-[0.8125rem] text-amber-900">{t('Is batch ki koi purchase (bill) nahi mili jis par ye aaya ho — shuru ka stock ho sakta hai. Distributor maan le to "Kharab / zaya" se likhein.')}</p>
            ) : (
              <ul className="space-y-2">
                {lines.map((l) => (
                  <li key={l.itemId}>
                    <button type="button" onClick={() => setLineId(l.itemId)}
                      className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start ring-1', (line?.itemId === l.itemId) ? 'bg-brand-50 ring-brand-300' : 'ring-slate-200 hover:bg-slate-50')}>
                      <Truck className="h-4 w-4 shrink-0 text-slate-500" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[0.875rem] font-semibold text-slate-900">{l.supplier.name}</span>
                        <span className="block text-[0.75rem] text-slate-500">{l.purchaseNumber} · {shortDate(l.purchasedAt)} · {formatPKR(l.unitCost)} / {l.unitName || row.product.unit}</span>
                      </span>
                      <span className="text-end text-[0.75rem] text-slate-600">{t('wapas ho sakta')}<br /><strong className="tabular-nums text-slate-900">{l.returnableUnits} {l.unitName || row.product.unit}</strong></span>
                    </button>
                  </li>
                ))}
              </ul>
            )
        ) : (
          <p className="rounded-xl bg-rose-50 px-3 py-2.5 text-[0.8125rem] text-rose-900">{t('Stock is batch se kam hoga aur nuqsan (write-off) reports me jayega. Distributor wapas le raha ho to pehle "Distributor ko wapas" istemal karein.')}</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label={t('Kitna ({{value}})', { value: mode === 'return' ? line?.unitName || row.product.unit : row.product.unit })} inputMode="decimal" value={qty}
            onChange={(e) => setQty(e.target.value.replace(/[^\d.]/g, ''))} hint={t('Zyada se zyada {{maxUnits}}', { maxUnits })}
            rightIcon={<button type="button" onClick={() => setQty(String(maxUnits))} className="text-[0.75rem] font-semibold text-brand-700">{t('Sab')}</button>} />
          <Input label={t('Wajah')} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        {amount > 0 && <p className="text-[0.8125rem] text-slate-600">{t('Value:')}{' '} <strong className="tabular-nums text-slate-900">{formatPKR(value)}</strong> {mode === 'return' ? t('distributor ke khate se kam hogi') : t('nuqsan me jayegi')}</p>}
      </div>
    </Modal>
  );
}
