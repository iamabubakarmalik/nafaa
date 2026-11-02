/**
 * Enter serial units of one product: one line per unit, "serial, IMEI,
 * IMEI 2, MAC" (only the serial is needed). Used from the serials page and
 * from a received purchase line, where the bill number and the cost per
 * piece are filled in. The customer's warranty starts on the day of sale,
 * so nothing about warranty is asked here.
 */

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Barcode, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Input, Modal, Textarea } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import type { Product } from '@modules/inventory/products/api/products.api';
import { serialTrackingApi } from '../api/serial-tracking.api';
import { ProductPick } from './pickers';
import { apiError } from './meta';
import { t } from '@core/i18n';

export const SERIAL_KEYS = ['electronics-serials', 'electronics-serials-all', 'electronics-pos-catalog', 'serials-for-pos', 'electronics-stock-report', 'products-catalog'];

function parse(text: string) {
  const seen = new Set<string>();
  let repeated = 0;
  const entries: Array<{ serialNumber: string; imei?: string; imei2?: string; macAddress?: string }> = [];
  for (const line of text.split(/\r?\n/)) {
    const [serialNumber = '', imei, imei2, macAddress] = line.split(/[,\t;]+/).map((x) => x.trim());
    if (!serialNumber) continue;
    const k = serialNumber.toLowerCase();
    if (seen.has(k)) { repeated++; continue; }
    seen.add(k);
    entries.push({ serialNumber, imei: imei || undefined, imei2: imei2 || undefined, macAddress: macAddress || undefined });
  }
  return { entries, repeated };
}

export function AddUnitsModal({ product: fixed, expected, costPrice, supplierRef, alreadyHave, shopId, onClose }: {
  /** Fixed product (purchase line); left out, the user picks one. */
  product?: { id: string; name: string } | null;
  /** Pieces on the purchase line. */
  expected?: number;
  costPrice?: number;
  supplierRef?: string;
  /** Units already entered against this purchase line. */
  alreadyHave?: number;
  shopId?: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { cost } = useMasked();
  const [picked, setPicked] = useState<Pick<Product, 'id' | 'name' | 'price'> | null>(null);
  const product = fixed ?? picked;
  const [text, setText] = useState('');
  const [price, setPrice] = useState(costPrice ? String(Math.round(costPrice * 100) / 100) : '');
  const [ref, setRef] = useState(supplierRef ?? '');
  const { entries, repeated } = useMemo(() => parse(text), [text]);
  const left = expected != null ? expected - (alreadyHave ?? 0) - entries.length : null;

  const save = useMutation({
    mutationFn: () => serialTrackingApi.bulkCreate({
      productId: product!.id, shopId, entries,
      purchasePrice: Number(price) > 0 ? Number(price) : undefined,
      supplierRef: ref.trim() || undefined,
    }),
    onSuccess: (r) => {
      toast.success(t('{{created}} unit darj ho gaye{{value}}', { created: r.created, value: r.skipped ? t(' · {{skipped}} pehle se the', { skipped: r.skipped }) : '' }));
      SERIAL_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      onClose();
    },
    onError: (e) => toast.error(apiError(e, t('Serial darj nahi hue'))),
  });
  const problem = !product ? t('Product chunein') : !entries.length ? t('Kam az kam ek serial likhein') : null;

  return (
    <Modal open onClose={onClose} size="md" title={<span className="inline-flex items-center gap-2"><Barcode className="h-5 w-5 text-brand-600" />{t('Serial units jorein')}</span>}
      description={product ? product.name : t('Har unit ka serial (aur IMEI ho to) — ek line par ek')}
      footer={<>
        <p className="me-auto text-[0.8125rem] text-slate-500">{problem ?? t('{{count}} unit darj honge', { count: entries.length })}</p>
        <Button variant="secondary" onClick={onClose}>{t('Rehne dein')}</Button>
        <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!!problem}>{t('Darj karein')}</Button>
      </>}>
      <div className="space-y-4">
        {!fixed && <ProductPick value={picked} onChange={setPicked} hint={t('Sirf wohi product jis ka har piece alag ginta hai (TV, laptop, camera)')} />}
        {expected != null && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label={t('Bill mein')} value={expected} />
            <Stat label={t('Pehle darj')} value={alreadyHave ?? 0} />
            <Stat label={t('Baqi')} value={Math.max(left ?? 0, 0)} warn={(left ?? 0) < 0} />
          </div>
        )}
        <Textarea label={t('Serial numbers')} rows={7} value={text} onChange={(e) => setText(e.target.value)} data-autofocus
          placeholder={t('SN123456789\nSN987654321, 356938035643809')} className="font-mono text-[0.8125rem]"
          hint={t('Scanner se ek ke baad ek scan karein — har scan nayi line. IMEI ho to comma laga kar: serial, IMEI')} />
        {(entries.length > 0 || repeated > 0) && (
          <div className="flex flex-wrap gap-1.5 text-[0.75rem] font-medium">
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 ring-1 ring-emerald-200">{t('{{count}} tayyar', { count: entries.length })}</span>
            {repeated > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-rose-700 ring-1 ring-rose-200"><Copy className="h-3 w-3" />{t('{{repeated}} do dafa likhe — ek hi rakha', { repeated })}</span>}
            {left != null && left < 0 && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-amber-800 ring-1 ring-amber-200"><AlertTriangle className="h-3 w-3" />{t('Bill se {{value}} zyada', { value: -left })}</span>}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label={t('Cost (1 unit)')} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ''))}
            hint={Number(price) > 0 ? t('Har unit par {{cost}}', { cost: cost(Number(price)) }) : t('Khali chhorein to product ki cost')} className="text-end tabular-nums" />
          <Input label={t('Bill / supplier ref')} value={ref} onChange={(e) => setRef(e.target.value)} maxLength={80} placeholder={t('PO-…')}
            hint={t('Kis bill se aaya — baad mein dhoondne ke kaam aata hai')} />
        </div>
        {!fixed && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-[0.75rem] text-amber-900 ring-1 ring-amber-200">
            {t('Serial sirf unit ka naam hai — stock Purchase se barhta hai. Naya maal aaya hai to pehle Purchase banayein, phir bill ki line se serial daalein.')}
          </p>
        )}
        {picked?.price ? <p className="text-[0.75rem] text-slate-500">{t('Bechne ka rate: {{price}}', { price: formatPKR(picked.price) })}</p> : null}
      </div>
    </Modal>
  );
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className={warn ? 'rounded-xl bg-amber-50 p-2 ring-1 ring-amber-200' : 'rounded-xl bg-slate-50 p-2 ring-1 ring-slate-200'}>
      <p className="text-[0.6875rem] font-medium text-slate-500">{label}</p>
      <p className="text-lg font-bold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}
