/** Seller sets a network customer's terms: price list, route, credit limit and days, booker. Used on approval too. */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button, Input, Modal, Select } from '@/design-system/components';
import { TRADE_KEY, tradeApi, tradeError, type BusinessCard, type Terms } from '../api/trade.api';

export function TermsModal({ linkId, mode, buyer, initial, suggested, onClose }: {
  linkId: string; mode: 'approve' | 'terms'; buyer: BusinessCard | null;
  initial?: { priceListId?: string | null; routeId?: string | null; creditLimit?: number; creditDays?: number | null; bookedById?: string | null };
  suggested?: { id: string; name: string; balance: number } | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const opts = useQuery({ queryKey: [TRADE_KEY, 'seller-options'], queryFn: tradeApi.sellerOptions, staleTime: 5 * 60_000 });
  const [priceListId, setPriceListId] = useState(initial?.priceListId ?? '');
  const [routeId, setRouteId] = useState(initial?.routeId ?? '');
  const [creditLimit, setCreditLimit] = useState(String(initial?.creditLimit ?? ''));
  const [creditDays, setCreditDays] = useState(initial?.creditDays != null ? String(initial.creditDays) : '');
  const [bookedById, setBookedById] = useState(initial?.bookedById ?? '');
  const [useExisting, setUseExisting] = useState(!!suggested);
  const save = useMutation({
    mutationFn: () => {
      const t: Terms = {
        priceListId: priceListId || null, routeId: routeId || null,
        ...(creditLimit !== '' && { creditLimit: Number(creditLimit) || 0 }),
        ...(creditDays !== '' ? { creditDays: Number(creditDays) || null } : {}),
        ...(bookedById && { bookedById }),
        ...(mode === 'approve' && useExisting && suggested && { customerId: suggested.id }),
      };
      return mode === 'approve' ? tradeApi.approve(linkId, t) : tradeApi.terms(linkId, t);
    },
    onSuccess: () => { toast.success(mode === 'approve' ? 'Approve — ab yeh dukaan Order bhej sakti hai' : 'Terms save'); qc.invalidateQueries({ queryKey: [TRADE_KEY] }); onClose(); },
    onError: (e) => toast.error(tradeError(e)),
  });
  const o = opts.data;
  return (
    <Modal open onClose={onClose} title={mode === 'approve' ? `${buyer?.name ?? 'Dukaan'} ko approve karein` : `${buyer?.name ?? 'Customer'} ke terms`}
      description={mode === 'approve' ? 'Yeh dukaan aap ke customers me aa jayegi aur aap is ke supplier ban jayenge.' : undefined}
      footer={<><Button variant="secondary" onClick={onClose}>Close</Button><Button loading={save.isPending} onClick={() => save.mutate()}>{mode === 'approve' ? 'Approve' : 'Save'}</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        {mode === 'approve' && suggested && (
          <label className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200/80 sm:col-span-2">
            <input type="checkbox" className="mt-1" checked={useExisting} onChange={(e) => setUseExisting(e.target.checked)} />
            <span className="text-[0.8125rem] text-slate-700">Pehle se customer <b>{suggested.name}</b> hai (khata Rs {Math.round(suggested.balance).toLocaleString('en-PK')}) — isi se jorein, naya na banayein</span>
          </label>
        )}
        <Select label="Price list" value={priceListId} onChange={(e) => setPriceListId(e.target.value)}
          options={[{ value: '', label: 'Default (settings wali)' }, ...(o?.priceLists ?? []).map((p) => ({ value: p.id, label: p.isDefault ? `${p.name} (default)` : p.name }))]} />
        <Select label="Route" value={routeId} onChange={(e) => setRouteId(e.target.value)}
          options={[{ value: '', label: 'Koi route nahi' }, ...(o?.routes ?? []).map((r) => ({ value: r.id, label: r.area ? `${r.name} · ${r.area}` : r.name }))]} />
        <Input label="Udhaar ki had (Rs)" inputMode="numeric" placeholder="0 = koi had nahi" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value.replace(/[^\d.]/g, ''))} />
        <Input label="Udhaar ke din" inputMode="numeric" placeholder="Misal: 15" value={creditDays} onChange={(e) => setCreditDays(e.target.value.replace(/\D/g, ''))} />
        <Select label="Order kis ke naam (booker)" wrapperClassName="sm:col-span-2" value={bookedById} onChange={(e) => setBookedById(e.target.value)}
          options={[{ value: '', label: mode === 'approve' ? 'Main khud' : 'Jo pehle tha' }, ...(o?.staff ?? []).map((s) => ({ value: s.id, label: s.fullName }))]} />
      </div>
    </Modal>
  );
}
