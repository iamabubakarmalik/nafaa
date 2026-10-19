/**
 * Puts a part on a job: from the shop's shelf (searched by name, part
 * number or the vehicle it fits, with the parts that fit this vehicle
 * first), or one the customer brought or that was bought outside. A shelf
 * part leaves stock as soon as it is added.
 */

import { useMemo, useState } from 'react';
import { AlertTriangle, Car, Package, Search } from 'lucide-react';
import { Button, Input, Modal, Select } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { useProductCatalog } from '@modules/pos/engine';
import type { PartCondition } from '../api/part-profiles.api';
import type { PartInput } from '../api/workshop-jobs.api';
import { partSearchText, usePartFacts } from '../hooks/usePartFacts';
import { CONDITIONS, conditionOf, money } from './meta';

type Source = 'shelf' | 'outside' | 'customer';

export function AddPartModal({ vehicle, pending, onAdd, onClose }: {
  vehicle: { makeName?: string | null; modelName?: string | null; year?: number | null };
  pending: boolean;
  onAdd: (p: PartInput) => void;
  onClose: () => void;
}) {
  const facts = usePartFacts();
  const catalog = useProductCatalog();
  const [source, setSource] = useState<Source>('shelf');
  const [q, setQ] = useState('');
  const [productId, setProductId] = useState('');
  const [name, setName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [qty, setQty] = useState('1');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState<PartCondition>('NEW');
  const [warranty, setWarranty] = useState(0);

  const fitsHere = (id: string) => {
    const f = facts.get(id);
    if (!f) return false;
    if (f.universal) return true;
    const make = vehicle.makeName?.toLowerCase();
    const model = vehicle.modelName?.toLowerCase();
    return f.fits.some((x) => (!make || x.makeName?.toLowerCase() === make) && (!model || !x.modelName || x.modelName.toLowerCase() === model)
      && (!vehicle.year || ((!x.yearFrom || vehicle.year >= x.yearFrom) && (!x.yearTo || vehicle.year <= x.yearTo))));
  };

  const results = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const list = catalog.items.filter((it) => {
      if (!words.length) return fitsHere(it.id);
      const text = [it.name, it.searchText, partSearchText(facts.get(it.id))].join(' ').toLowerCase();
      return words.every((w) => text.includes(w));
    });
    return list.sort((a, b) => Number(fitsHere(b.id)) - Number(fitsHere(a.id)) || Number(b.stock > 0) - Number(a.stock > 0) || a.name.localeCompare(b.name)).slice(0, 30);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, catalog.items, facts, vehicle.makeName, vehicle.modelName, vehicle.year]);

  const chosen = catalog.items.find((it) => it.id === productId);
  const quantity = Number(qty) || 0;
  const unit = Number(price) || 0;
  const short = source === 'shelf' && !!chosen && quantity > chosen.stock;
  const valid = quantity > 0 && (source === 'shelf' ? !!chosen : name.trim().length > 1) && (source === 'customer' || unit >= 0);

  const choose = (id: string) => {
    const it = catalog.items.find((x) => x.id === id);
    if (!it) return;
    const f = facts.get(id);
    setProductId(id);
    setName(it.name);
    setPartNumber(f?.partNumber ?? '');
    setPrice(String(it.price));
    setCondition(f?.condition ?? 'NEW');
    setWarranty(f?.warrantyMonths ?? 0);
  };

  const submit = () => {
    if (!valid || pending) return;
    onAdd({
      productId: source === 'shelf' ? productId : undefined,
      partName: (source === 'shelf' ? chosen?.name : name.trim()) ?? name.trim(),
      partNumber: partNumber.trim() || undefined,
      quantity,
      unitPrice: source === 'customer' ? 0 : unit,
      condition,
      isCustomerSupplied: source === 'customer',
      warrantyMonths: warranty || undefined,
    });
  };

  const car = [vehicle.makeName, vehicle.modelName, vehicle.year].filter(Boolean).join(' ');
  return (
    <Modal open onClose={onClose} size="lg" title="Part jorein" description={car ? `Gaari: ${car}` : undefined}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button onClick={submit} disabled={!valid} loading={pending} leftIcon={<Package className="h-4 w-4" />}>
          {source === 'shelf' ? 'Stock se lagayein' : 'Jorein'}{quantity > 0 && unit > 0 && source !== 'customer' ? ` — ${formatPKR(quantity * unit)}` : ''}
        </Button>
      </>}>
      <div className="space-y-4">
        <div role="radiogroup" className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
          {([['shelf', 'Dukaan ka stock'], ['outside', 'Bahar se liya'], ['customer', 'Customer ka apna']] as Array<[Source, string]>).map(([id, label]) => (
            <button key={id} type="button" role="radio" aria-checked={source === id} onClick={() => setSource(id)}
              className={cn('h-9 rounded-lg text-[0.8125rem] font-semibold', source === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600')}>{label}</button>
          ))}
        </div>

        {source === 'shelf' ? (
          <div>
            <Input value={q} onChange={(e) => setQ(e.target.value)} autoFocus leftIcon={<Search className="h-4 w-4" />} placeholder="Naam, part number ya gaari — jaise “brake pad”"
              hint={!q && car ? 'Is gaari me lagne wale parts pehle' : undefined} />
            <ul className="mt-2 max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-xl ring-1 ring-slate-200">
              {catalog.loading && <li className="px-3 py-6 text-center text-[0.8125rem] text-slate-500">Parts load ho rahe…</li>}
              {!catalog.loading && results.length === 0 && <li className="px-3 py-6 text-center text-[0.8125rem] text-slate-500">{q ? 'Koi part nahi mila — “Bahar se liya” chunein' : 'Naam ya number likhein'}</li>}
              {results.map((it) => {
                const f = facts.get(it.id);
                return (
                  <li key={it.id}>
                    <button type="button" onClick={() => choose(it.id)}
                      className={cn('flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-brand-50', productId === it.id && 'bg-brand-50 ring-1 ring-inset ring-brand-300')}>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 truncate text-[0.875rem] font-medium text-slate-900">
                          {it.name}{fitsHere(it.id) && <Car className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-label="Is gaari me lagta hai" />}
                        </span>
                        <span className="block truncate text-[0.75rem] text-slate-500">{[f?.partNumber, f?.brand, f && f.condition !== 'NEW' ? conditionOf(f.condition).label : null].filter(Boolean).join(' · ') || '—'}</span>
                      </span>
                      <span className={cn('text-[0.75rem] font-medium tabular-nums', it.stock > 0 ? 'text-emerald-700' : 'text-rose-600')}>{it.stock > 0 ? `${Number(it.stock.toFixed(2))} stock` : 'khatam'}</span>
                      <span className="w-20 text-right text-[0.875rem] font-semibold tabular-nums">{formatPKR(it.price)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Part ka naam" required value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Clutch plate" />
            <Input label="Part number" value={partNumber} onChange={(e) => setPartNumber(e.target.value)} placeholder="Marzi hai" />
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Kitne" inputMode="decimal" value={qty} onChange={(e) => setQty(money(e.target.value))} error={quantity <= 0 ? 'Kam se kam 1' : undefined} />
          {source !== 'customer' && (
            <Input label="Qeemat (ek ki)" inputMode="decimal" value={price} onChange={(e) => setPrice(money(e.target.value))} placeholder="0"
              hint={source === 'outside' ? 'Customer se kitna lena hai' : undefined} />
          )}
          <Select label="Warranty" value={String(warranty)} onChange={(e) => setWarranty(Number(e.target.value))}
            options={[0, 1, 3, 6, 12].map((m) => ({ value: String(m), label: m ? `${m} mahine` : 'Koi nahi' }))} />
        </div>
        {source !== 'shelf' && (
          <div className="flex flex-wrap gap-1.5">
            {CONDITIONS.map((c) => (
              <button key={c} type="button" onClick={() => setCondition(c)} aria-pressed={condition === c}
                className={cn('h-8 rounded-full px-3 text-[0.8125rem] font-medium ring-1', condition === c ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200')}>{conditionOf(c).label}</button>
            ))}
          </div>
        )}
        {short && (
          <p className="flex items-start gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Stock me sirf {Number(chosen!.stock.toFixed(2))} hai — pehle purchase karein ya “Bahar se liya” chunein.
          </p>
        )}
        {source === 'outside' && <p className="text-[0.75rem] text-slate-500">Bahar se liye part ki apni cost bill me nahi judti — purchase ya expense me likhein.</p>}
      </div>
    </Modal>
  );
}
