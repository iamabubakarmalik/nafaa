/**
 * Quote editor: customer, the work, and lines for visit, labour, parts and
 * anything else, with a discount and how long the price holds. Part lines
 * can point to a shelf item so they become job parts later.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Input, Modal, Select, Textarea } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { catalogApi } from '../api/catalog.api';
import type { Quote, QuoteInput, QuoteLineKind } from '../api/quotes.api';
import { CATALOG_KEY, dateInput, digits, money } from './meta';

const KINDS: Array<{ value: QuoteLineKind; label: string }> = [
  { value: 'VISIT', label: 'Visit' }, { value: 'LABOUR', label: 'Kaam' }, { value: 'PART', label: 'Part' }, { value: 'OTHER', label: 'Aur' },
];
interface Line { kind: QuoteLineKind; description: string; quantity: string; unitPrice: string }

export function QuoteModal({ quote, pending, onSave, onClose }: { quote?: Quote | null; pending: boolean; onSave: (v: QuoteInput) => void; onClose: () => void }) {
  const svcQ = useQuery({ queryKey: [CATALOG_KEY, 'active'], queryFn: () => catalogApi.list({ active: true }), staleTime: 5 * 60_000 });
  const [name, setName] = useState(quote?.customerName ?? '');
  const [phone, setPhone] = useState(quote?.customerPhone ?? '');
  const [serviceId, setServiceId] = useState(quote?.serviceId ?? '');
  const [serviceName, setServiceName] = useState(quote?.serviceName ?? '');
  const [problem, setProblem] = useState(quote && quote.problemDescription !== quote.serviceName ? quote.problemDescription : '');
  const [lines, setLines] = useState<Line[]>(quote?.lines.length
    ? quote.lines.map((l) => ({ kind: l.kind, description: l.description, quantity: String(l.quantity), unitPrice: String(l.unitPrice) }))
    : [{ kind: 'LABOUR', description: '', quantity: '1', unitPrice: '' }]);
  const [discount, setDiscount] = useState(quote?.discount ? String(quote.discount) : '');
  const [valid, setValid] = useState(quote?.validUntil ? dateInput(new Date(quote.validUntil)) : dateInput(new Date(Date.now() + 7 * 86_400_000)));
  const [terms, setTerms] = useState(quote?.termsConditions ?? '');

  const pick = (id: string) => {
    setServiceId(id);
    const s = svcQ.data?.find((x) => x.id === id);
    if (!s) return;
    setServiceName(s.name);
    setLines([
      ...(s.visitCharge ? [{ kind: 'VISIT' as const, description: 'Visit charge', quantity: '1', unitPrice: String(s.visitCharge) }] : []),
      { kind: 'LABOUR', description: s.name, quantity: '1', unitPrice: String(s.baseCharge || s.hourlyRate || '') },
    ]);
  };
  const total = lines.reduce((t, l) => t + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);
  const left = Math.max(total - (Number(discount) || 0), 0);
  const errors: string[] = [];
  if (!name.trim()) errors.push('Customer ka naam likhein');
  if (phone && digits(phone).length < 10) errors.push('Phone poora likhein');
  if (!serviceName.trim()) errors.push('Kaam ka naam likhein');
  if (!lines.some((l) => l.description.trim() && Number(l.unitPrice) > 0)) errors.push('Kam az kam ek line ki qeemat likhein');
  if ((Number(discount) || 0) > total) errors.push('Discount kul se zyada hai');

  const submit = () => {
    if (errors.length || pending) return;
    onSave({
      customerName: name.trim(), customerPhone: phone.trim() || undefined, serviceId: serviceId || undefined, serviceName: serviceName.trim(),
      problemDescription: problem.trim() || undefined, discount: Number(discount) || 0, validUntil: valid ? new Date(`${valid}T23:00`).toISOString() : undefined,
      termsConditions: terms.trim() || undefined,
      lines: lines.filter((l) => l.description.trim()).map((l) => ({ kind: l.kind, description: l.description.trim(), quantity: Number(l.quantity) || 1, unitPrice: Number(l.unitPrice) || 0 })),
    });
  };

  return (
    <Modal open onClose={onClose} size="lg" title={quote ? `Quote badlein — ${quote.quoteNumber}` : 'Naya quote'} description="Kaam se pehle customer ko kharche ka andaza"
      footer={<>
        {errors[0] && <span className="mr-auto text-[0.8125rem] text-rose-600">{errors[0]}</span>}
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button onClick={submit} disabled={errors.length > 0} loading={pending}>Save</Button>
      </>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Customer" required value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Naam" />
          <Input label="Phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03001234567" hint="WhatsApp par quote bhejne ke liye" />
          <Select label="Rate list se" value={serviceId} onChange={(e) => pick(e.target.value)} placeholder="Chunein ya likhein" options={(svcQ.data ?? []).map((s) => ({ value: s.id, label: s.name }))} />
          <Input label="Kaam" required value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder="Split AC installation" />
          <Textarea label="Tafseel" rows={2} value={problem} onChange={(e) => setProblem(e.target.value)} wrapperClassName="sm:col-span-2" />
        </div>
        <div className="space-y-2">
          <span className="block text-[0.8125rem] font-medium text-slate-700">Lines</span>
          {lines.map((l, i) => (
            <div key={i} className="grid grid-cols-[6.5rem_minmax(0,1fr)_4rem_6rem_2.5rem] gap-2">
              <Select aria-label="Kis cheez ki" value={l.kind} options={KINDS} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, kind: e.target.value as QuoteLineKind } : x)))} />
              <Input aria-label="Tafseel" value={l.description} placeholder={l.kind === 'PART' ? 'Copper pipe 10 ft' : 'Kaam'} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} />
              <Input aria-label="Kitne" inputMode="decimal" value={l.quantity} className="text-right" onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, quantity: money(e.target.value) } : x)))} />
              <Input aria-label="Qeemat" inputMode="decimal" value={l.unitPrice} placeholder="Rs" className="text-right tabular-nums" onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, unitPrice: money(e.target.value) } : x)))} />
              <button type="button" aria-label="Hatayein" onClick={() => setLines(lines.filter((_, j) => j !== i))} disabled={lines.length === 1}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          <Button size="sm" variant="ghost" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setLines([...lines, { kind: 'PART', description: '', quantity: '1', unitPrice: '' }])}>Line jorein</Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Discount" inputMode="decimal" value={discount} onChange={(e) => setDiscount(money(e.target.value))} placeholder="0" className="text-right" />
          <Input label="Kab tak" type="date" value={valid} onChange={(e) => setValid(e.target.value)} hint="Is ke baad quote purana" />
          <div className="flex flex-col justify-end rounded-xl bg-slate-50 px-3 py-2 text-right"><span className="text-[0.75rem] text-slate-500">Kul</span><span className="text-lg font-bold tabular-nums text-slate-900">{formatPKR(left)}</span></div>
        </div>
        <Input label="Shartein" value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="50% advance, baqi kaam ke baad" hint="Quote par chhapti hain" />
      </form>
    </Modal>
  );
}
