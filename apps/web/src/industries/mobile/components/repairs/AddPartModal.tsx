/**
 * A part on a repair job: from own stock (leaves the shelf now, back if the
 * job is cancelled), bought from the market for this job, or brought by the
 * customer. Cost is what the shop paid; price is what the customer pays.
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Search } from 'lucide-react';
import { Button, Input, Modal } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { repairsApi, type PartSource, type RepairTicket } from '../../api/repairs.api';
import { REPAIR_KEY, apiError, money } from '../meta';

const SOURCES: Array<{ id: PartSource; label: string; hint: string }> = [
  { id: 'OWN_STOCK', label: 'Apne stock se', hint: 'Shelf se nikalega' },
  { id: 'PURCHASED_FOR_REPAIR', label: 'Bazar se laya', hint: 'Isi kaam ke liye khareeda' },
  { id: 'CUSTOMER_PROVIDED', label: 'Customer ka', hint: 'Customer khud laya' },
];

export function AddPartModal({ ticket, onClose }: { ticket: RepairTicket; onClose: () => void }) {
  const qc = useQueryClient();
  const [source, setSource] = useState<PartSource>('OWN_STOCK');
  const [term, setTerm] = useState('');
  const [product, setProduct] = useState<{ id: string; name: string; price: number; costPrice: number; stock: number } | null>(null);
  const [name, setName] = useState('');
  const [qty, setQty] = useState('1');
  const [cost, setCost] = useState('');
  const [price, setPrice] = useState('');
  const found = useQuery({
    queryKey: ['repair-part-search', term],
    queryFn: () => productsApi.list({ search: term, limit: 10, isActive: true }),
    enabled: source === 'OWN_STOCK' && term.trim().length >= 2 && !product,
  });
  const pickProduct = (p: { id: string; name: string; price: number; costPrice: number; stock: number }) => {
    setProduct(p); setName(p.name); setPrice(String(p.price || '')); setCost(String(p.costPrice || ''));
  };
  const q = Number(qty) || 0;
  const problem = source === 'OWN_STOCK' && !product ? 'Stock se part chunein'
    : !name.trim() ? 'Part ka naam likhein'
      : !(q > 0) ? 'Kitne lage — likhein'
        : source === 'OWN_STOCK' && product && q > product.stock ? `Stock me sirf ${product.stock} hain` : null;

  const save = useMutation({
    mutationFn: () => repairsApi.addPart(ticket.id, {
      productId: source === 'OWN_STOCK' ? product?.id : undefined, partName: name.trim(), quantity: q, source,
      unitCost: source === 'CUSTOMER_PROVIDED' ? 0 : cost ? Number(cost) : undefined, unitPrice: Number(price) || 0,
    }),
    onSuccess: () => {
      toast.success(source === 'OWN_STOCK' ? 'Part laga — stock se nikal gaya' : 'Part laga');
      [REPAIR_KEY, 'products-catalog', 'products-for-pos'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      onClose();
    },
    onError: (e) => toast.error(apiError(e, 'Part nahi laga')),
  });

  return (
    <Modal open onClose={onClose} size="md" title="Part lagayein" description={`${ticket.ticketNumber} · ${ticket.deviceBrand} ${ticket.deviceModel}`}
      footer={<>
        {problem && (name || product) && <span className="mr-auto text-[0.8125rem] text-amber-800">{problem}</span>}
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button onClick={() => save.mutate()} disabled={!!problem} loading={save.isPending}>Jodein · {formatPKR(q * (Number(price) || 0))}</Button>
      </>}>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {SOURCES.map((s) => (
            <button key={s.id} type="button" onClick={() => { setSource(s.id); setProduct(null); }}
              className={cn('rounded-xl p-2.5 text-left ring-1', source === s.id ? 'bg-brand-50 ring-2 ring-brand-500' : 'bg-white ring-slate-200')}>
              <p className="text-[0.8125rem] font-semibold text-slate-900">{s.label}</p>
              <p className="text-[0.6875rem] text-slate-500">{s.hint}</p>
            </button>
          ))}
        </div>
        {source === 'OWN_STOCK' && (product ? (
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200 text-[0.8125rem]">
            <span><b>{product.name}</b> · stock {product.stock}</span>
            <button type="button" onClick={() => { setProduct(null); setName(''); }} className="font-semibold text-brand-700">Badlein</button>
          </div>
        ) : (
          <div>
            <Input autoFocus value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Part dhoondein — screen, battery…" leftIcon={<Search className="h-4 w-4" />} />
            <ul className="mt-1 max-h-48 overflow-y-auto">
              {(found.data?.items ?? []).map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => pickProduct({ id: p.id, name: p.name, price: Number(p.price) || 0, costPrice: Number(p.costPrice) || 0, stock: Number((p as { shopStock?: number }).shopStock ?? p.stock) || 0 })}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[0.8125rem] hover:bg-slate-50">
                    <span className="font-medium text-slate-900">{p.name}</span><span className="text-slate-500">stock {Number((p as { shopStock?: number }).shopStock ?? p.stock) || 0} · {formatPKR(Number(p.price) || 0)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {source !== 'OWN_STOCK' && <Input label="Part ka naam" value={name} onChange={(e) => setName(e.target.value)} placeholder="iPhone 11 LCD" autoFocus />}
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Kitne" inputMode="decimal" value={qty} onChange={(e) => setQty(money(e.target.value))} />
          {source !== 'CUSTOMER_PROVIDED' && <Input label="Cost (ek)" inputMode="decimal" value={cost} onChange={(e) => setCost(money(e.target.value))} hint="Dukaan ne kitne ka liya" />}
          <Input label="Customer se (ek)" inputMode="decimal" value={price} onChange={(e) => setPrice(money(e.target.value))} hint={source === 'CUSTOMER_PROVIDED' ? 'Aksar 0' : undefined} />
        </div>
      </div>
    </Modal>
  );
}
