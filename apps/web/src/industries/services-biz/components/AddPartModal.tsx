/**
 * Puts a part or material on a job: from the shop's shelf (searched by
 * name or barcode; it leaves stock when the job is billed), bought outside
 * for this job (its cost is paid as an expense), or brought by the
 * customer. A part under warranty is free to the customer; the shop's cost
 * still shows in profit.
 */

import { useMemo, useState } from 'react';
import { AlertTriangle, Package, Search } from 'lucide-react';
import { Button, Input, Modal, Switch } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { useProductCatalog } from '@modules/pos/engine';
import type { PartInput } from '../api/jobs.api';
import { money } from './meta';
import { t } from '@core/i18n';

type Source = 'shelf' | 'outside' | 'customer';
const SOURCES: Array<{ id: Source; label: string; hint: string }> = [
  { id: 'shelf', label: t('Dukaan ka saman'), hint: t('Stock se — bill par stock se nikalta hai') },
  { id: 'outside', label: t('Bahar se liya'), hint: t('Is kaam ke liye market se kharida') },
  { id: 'customer', label: t('Customer ka apna'), hint: t('Customer khud laya — bill me nahi') },
];

export function AddPartModal({ pending, onAdd, onClose }: { pending: boolean; onAdd: (p: PartInput) => void; onClose: () => void }) {
  const catalog = useProductCatalog();
  const [source, setSource] = useState<Source>('shelf');
  const [q, setQ] = useState('');
  const [productId, setProductId] = useState('');
  const [name, setName] = useState('');
  const [qty, setQty] = useState('1');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [serial, setSerial] = useState('');
  const [free, setFree] = useState(false);

  const shelf = useMemo(() => catalog.items.filter((it) => it.unit.toLowerCase() !== 'service' && !String(it.product.sku ?? '').startsWith('SVCB-')), [catalog.items]);
  const results = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return shelf.filter((it) => words.every((w) => `${it.name} ${it.searchText ?? ''} ${it.product.barcode ?? ''}`.toLowerCase().includes(w)))
      .sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0) || a.name.localeCompare(b.name)).slice(0, 30);
  }, [q, shelf]);
  const chosen = shelf.find((it) => it.id === productId);
  const n = Number(qty) || 0;
  const short = source === 'shelf' && chosen && n > chosen.stock;
  const bad = !(n > 0) || (source === 'shelf' ? !chosen : !name.trim()) || (source !== 'customer' && !free && price === '');

  const submit = () => {
    if (bad || pending) return;
    onAdd({
      ...(source === 'shelf' && chosen ? { productId: chosen.id, partName: chosen.name } : { partName: name.trim() }),
      quantity: n,
      unitPrice: source === 'customer' || free ? 0 : Number(price) || 0,
      ...(source === 'outside' && cost && { costPrice: Number(cost) || 0 }),
      isCustomerSupplied: source === 'customer',
      isUnderWarranty: free,
      serialNumber: serial.trim() || undefined,
    });
  };

  return (
    <Modal open onClose={onClose} size="md" title={t('Part / saman jorein')} description={t('Kaam me laga part bill me jurta hai')}
      footer={<>
        <Button variant="secondary" onClick={onClose}>{t('Rehne dein')}</Button>
        <Button onClick={submit} disabled={bad} loading={pending} leftIcon={<Package className="h-4 w-4" />}>{t('Jorein')}</Button>
      </>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div role="radiogroup" className="grid grid-cols-3 gap-1.5">
          {SOURCES.map((s) => (
            <button key={s.id} type="button" role="radio" aria-checked={source === s.id} onClick={() => { setSource(s.id); setProductId(''); }}
              className={cn('rounded-xl px-2 py-2 text-start ring-1', source === s.id ? 'bg-brand-50 ring-brand-300' : 'bg-white ring-slate-200 hover:bg-slate-50')}>
              <span className="block text-[0.8125rem] font-semibold text-slate-900">{s.label}</span>
              <span className="block text-[0.6875rem] text-slate-500">{s.hint}</span>
            </button>
          ))}
        </div>

        {source === 'shelf' ? (
          chosen ? (
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2">
              <Package className="h-4 w-4 text-slate-400" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-slate-900">{chosen.name}</span>
                <span className="text-[0.75rem] text-slate-500">{t('Stock {{stock}} · {{price}}', { stock: chosen.stock, price: formatPKR(chosen.price) })}</span>
              </span>
              <Button size="sm" variant="ghost" onClick={() => setProductId('')}>{t('Badlein')}</Button>
            </div>
          ) : (
            <div>
              <Input label={t('Dhoondein')} value={q} onChange={(e) => setQ(e.target.value)} autoFocus leftIcon={<Search className="h-4 w-4" />} placeholder={t('Capacitor, gas, pipe, wire…')} />
              {q.trim() && (
                <ul className="mt-2 max-h-60 divide-y divide-slate-100 overflow-auto rounded-xl ring-1 ring-slate-200">
                  {results.length === 0 && <li className="px-3 py-3 text-[0.8125rem] text-slate-500">{t('Kuch nahi mila — "Bahar se liya" chunein')}</li>}
                  {results.map((it) => (
                    <li key={it.id}>
                      <button type="button" onClick={() => { setProductId(it.id); setPrice(String(it.price)); }} className="flex w-full items-center gap-3 px-3 py-2 text-start hover:bg-brand-50">
                        <span className="min-w-0 flex-1 truncate text-[0.875rem] text-slate-900">{it.name}</span>
                        <span className={cn('text-[0.75rem] tabular-nums', it.stock > 0 ? 'text-slate-500' : 'font-semibold text-rose-600')}>{t('Stock {{stock}}', { stock: it.stock })}</span>
                        <span className="w-20 text-end text-[0.8125rem] font-semibold tabular-nums">{formatPKR(it.price)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        ) : (
          <Input label={t('Part ka naam')} required value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder={t('Compressor capacitor 45uF')} />
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <Input label={t('Kitne')} inputMode="decimal" value={qty} onChange={(e) => setQty(money(e.target.value))} error={!(n > 0) ? t('Kitne likhein') : undefined} />
          {source !== 'customer' && (
            <Input label={t('Customer se qeemat (har ek)')} inputMode="decimal" value={free ? '0' : price} disabled={free} onChange={(e) => setPrice(money(e.target.value))} placeholder="Rs" />
          )}
          {source === 'outside' && (
            <Input label={t('Hamein kitne ka pada')} inputMode="decimal" value={cost} onChange={(e) => setCost(money(e.target.value))} placeholder="Rs" hint={t('Ye Expense me likhein')} />
          )}
        </div>
        <Input label={t('Serial number')} value={serial} onChange={(e) => setSerial(e.target.value)} hint={t('Marzi hai — warranty ke liye kaam aata hai')} />
        {source !== 'customer' && <Switch checked={free} onChange={(e) => setFree(e.target.checked)} label={t('Warranty me muft')} description={t('Customer se paisa nahi; dukaan ka Cost profit me dikhega')} />}
        {short && (
          <p className="flex items-start gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{t('Stock me sirf {{stock}} hain — bill banate waqt stock kam pada to bill ruk jayega', { stock: chosen?.stock })}
          </p>
        )}
        {n > 0 && source !== 'customer' && !free && Number(price) > 0 && <p className="text-end text-[0.875rem] font-semibold tabular-nums text-slate-900">{t('Kul {{formatPKR}}', { formatPKR: formatPKR(n * Number(price)) })}</p>}
      </form>
    </Modal>
  );
}
