/**
 * Adds phones by IMEI to a model (and variant): scan boxes one after another,
 * paste a list or type. Stock follows: phones already counted by a purchase
 * are matched, only extra ones raise the stock.
 */

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, ScanLine, Search, Trash2 } from 'lucide-react';
import { Button, Input, Modal, Select } from '@/design-system/components';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { cn } from '@core/lib/cn';
import { useShopParam } from '@core/stores/auth.store';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { productVariantsApi } from '@modules/inventory/products/api/product-variants.api';
import { imeiApi, type PtaStatus } from '../../api/imei.api';
import { IMEI_KEY, PTA_HINT, PTA_LIST, apiError, digits, isLuhnValid, money, ptaOf } from '../meta';

interface Line { imei1: string; imei2: string }

export function AddImeisModal({ productId: fixedId, onClose }: { productId?: string; onClose: () => void }) {
  const qc = useQueryClient();
  const shopId = useShopParam();
  const [productId, setProductId] = useState(fixedId ?? '');
  const [term, setTerm] = useState('');
  const [variantId, setVariantId] = useState('');
  const [cost, setCost] = useState('');
  const [warranty, setWarranty] = useState('12');
  const [pta, setPta] = useState<PtaStatus>('APPROVED');
  const [lines, setLines] = useState<Line[]>([]);
  const [paste, setPaste] = useState('');
  const [scan, setScan] = useState(false);

  const search = useQuery({
    queryKey: ['mobile-imei-product-search', term],
    queryFn: () => productsApi.list({ search: term, limit: 12, isActive: true }),
    enabled: !fixedId && term.trim().length >= 2,
  });
  const product = useQuery({ queryKey: ['product', productId], queryFn: () => productsApi.getOne(productId), enabled: !!productId });
  const variants = useQuery({ queryKey: ['product-variants', productId], queryFn: () => productVariantsApi.list(productId), enabled: !!productId });
  const active = (variants.data ?? []).filter((v) => v.isActive !== false);

  useEffect(() => {
    const v = active.find((x) => x.id === variantId);
    const c = v?.costPrice ?? product.data?.costPrice;
    if (c) setCost(String(c));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantId, product.data?.costPrice]);

  const known = useMemo(() => new Set(lines.flatMap((l) => [l.imei1, l.imei2].filter(Boolean))), [lines]);
  const add = (a: string, b = '') => {
    const x = digits(a);
    if (x.length !== 15 || known.has(x)) return false;
    setLines((ls) => [...ls, { imei1: x, imei2: digits(b).length === 15 ? digits(b) : '' }]);
    return true;
  };
  const pasteRows = paste.split('\n').map((l) => l.split(/[,\s\t]+/).map(digits).filter(Boolean)).filter((p) => p[0]);

  const problem = !productId ? 'Model chunein'
    : active.length > 0 && !variantId ? 'Variant chunein'
      : !lines.length ? 'Kam az kam ek IMEI daalein'
        : lines.some((l) => l.imei2 && l.imei2 === l.imei1) ? 'IMEI 1 aur 2 ek jaise nahi ho sakte' : null;

  const save = useMutation({
    mutationFn: () => imeiApi.bulkCreate({
      productId, variantId: variantId || undefined, shopId, costPrice: Number(cost) || undefined, warrantyMonths: Number(warranty) || 0,
      imeis: lines.map((l) => ({ imei1: l.imei1, imei2: l.imei2 || undefined, ptaStatus: pta })),
    }),
    onSuccess: (r) => {
      toast.success(`${r.count} phone stock me aa gaye`);
      if (r.badChecksum?.length) toast.warning(`${r.badChecksum.length} IMEI ka check digit nahi milta — dobara dekh lein`);
      [IMEI_KEY, 'mobile-imei-shelf', 'mobile-product-imeis', 'product', 'products-catalog', 'mobile-pos-catalog', 'imei-stats'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      onClose();
    },
    onError: (e) => toast.error(apiError(e, 'IMEI save nahi hue')),
  });

  return (
    <Modal open onClose={onClose} size="lg" title="Naye phone — IMEI daalein" description="Har phone ka IMEI dabbe par ya *#06# dabane se milta hai"
      footer={<>
        {problem && (lines.length > 0 || productId) && <span className="mr-auto flex items-center gap-1.5 text-[0.8125rem] text-amber-800"><AlertTriangle className="h-4 w-4" />{problem}</span>}
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button onClick={() => save.mutate()} disabled={!!problem} loading={save.isPending}>{lines.length || ''} phone save karein</Button>
      </>}>
      {scan && <BarcodeScanner onDetected={(c: string) => { add(c); }} onClose={() => setScan(false)} />}
      <div className="space-y-4">
        {!fixedId && (
          <div>
            {productId && product.data ? (
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
                <span className="font-semibold text-slate-900">{product.data.name}</span>
                <button type="button" onClick={() => { setProductId(''); setVariantId(''); }} className="text-[0.8125rem] font-semibold text-brand-700">Badlein</button>
              </div>
            ) : (
              <>
                <Input label="Kaunsa model" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Model ka naam likhein…" leftIcon={<Search className="h-4 w-4" />} autoFocus />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(search.data?.items ?? []).map((p) => (
                    <button key={p.id} type="button" onClick={() => setProductId(p.id)} className="h-8 rounded-lg bg-white px-2.5 text-[0.8125rem] font-medium text-slate-700 ring-1 ring-slate-200 hover:ring-brand-400">{p.name}</button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        {fixedId && product.data && <p className="text-[0.875rem] font-semibold text-slate-900">{product.data.name}</p>}

        <div className="grid gap-3 sm:grid-cols-3">
          {active.length > 0 && (
            <Select label="Variant" value={variantId} onChange={(e) => setVariantId(e.target.value)} placeholder="Chunein…"
              options={active.map((v) => ({ value: v.id, label: v.name }))} />
          )}
          <Input label="Ek phone ki cost" inputMode="decimal" value={cost} onChange={(e) => setCost(money(e.target.value))} hint="Profit isi se banta hai" />
          <Input label="Warranty (mahine)" inputMode="numeric" value={warranty} onChange={(e) => setWarranty(digits(e.target.value))} hint="0 = koi nahi" />
        </div>

        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">PTA</span>
          <div className="flex flex-wrap gap-1.5">
            {PTA_LIST.map((p) => (
              <button key={p} type="button" onClick={() => setPta(p)}
                className={cn('h-8 rounded-full px-3 text-[0.8125rem] font-medium ring-1', pta === p ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200')}>
                {ptaOf(p).label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[0.75rem] text-slate-500">{PTA_HINT[pta]}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="inverse" onClick={() => setScan(true)} leftIcon={<ScanLine className="h-4 w-4" />}>Lagataar scan</Button>
        </div>
        <label className="block">
          <span className="text-[0.8125rem] font-medium text-slate-700">Ya yahan likhein / paste karein (har line: IMEI 1, IMEI 2)</span>
          <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={3} placeholder={'356789012345678, 356789012345686'}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-[0.8125rem] outline-none focus:border-brand-500" />
          {pasteRows.length > 0 && (
            <Button size="sm" className="mt-1" onClick={() => { pasteRows.forEach((p) => add(p[0], p[1])); setPaste(''); }}>
              {pasteRows.length} line jorein
            </Button>
          )}
        </label>

        {lines.length > 0 && (
          <ul className="max-h-60 divide-y divide-slate-100 overflow-y-auto rounded-xl ring-1 ring-slate-200">
            {lines.map((l, i) => (
              <li key={l.imei1} className="flex items-center gap-3 px-3 py-2 text-[0.8125rem]">
                <span className="w-6 text-right text-slate-400">{i + 1}</span>
                <span className="font-mono text-slate-900">{l.imei1}</span>
                {l.imei2 && <span className="font-mono text-slate-500">{l.imei2}</span>}
                {!isLuhnValid(l.imei1) && <span className="text-[0.75rem] text-amber-700">check digit ghalat</span>}
                <button type="button" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} aria-label="Hatayein" className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
