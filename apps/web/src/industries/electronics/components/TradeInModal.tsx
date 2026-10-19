/**
 * Trade-in: the shop buys a used unit from a customer, usually against a
 * new purchase. The unit goes into stock at the price paid and the cash
 * leaves the open drawer; it is sold later like any other unit.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Recycle } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Input, Modal, Segmented, Select, Textarea } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import type { Product } from '@modules/inventory/products/api/products.api';
import type { Customer } from '@modules/customers/customers/api/customers.api';
import { serialTrackingApi, type TradeInPayload } from '../api/serial-tracking.api';
import { CONDITION_META } from '../constants';
import { SERIAL_KEYS } from './AddUnitsModal';
import { CustomerPick, ProductPick } from './pickers';
import { apiError } from './meta';

type Mode = 'new' | 'existing';
const CONDITIONS = ['USED', 'OPEN_BOX', 'REFURBISHED', 'DAMAGED', 'FOR_PARTS'] as const;
const num = (v: string) => v.replace(/[^\d.]/g, '');

export function TradeInModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<Mode>('new');
  const [product, setProduct] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [serial, setSerial] = useState('');
  const [imei, setImei] = useState('');
  const [condition, setCondition] = useState<NonNullable<TradeInPayload['condition']>>('USED');
  const [value, setValue] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [look, setLook] = useState('');
  const [notes, setNotes] = useState('');

  const paid = Number(value) || 0;
  const sell = Number(salePrice) || 0;
  const problem = mode === 'existing' && !product ? 'Product chunein'
    : mode === 'new' && name.trim().length < 2 ? 'Cheez ka naam likhein'
      : !serial.trim() ? 'Serial number likhein'
        : !(paid > 0) ? 'Kitne mein liya — amount likhein'
          : mode === 'new' && sell > 0 && sell < paid ? 'Bechne ka rate khareed se kam hai'
            : null;

  const save = useMutation({
    mutationFn: () => serialTrackingApi.tradeIn({
      ...(mode === 'existing' ? { productId: product!.id } : { name: name.trim(), salePrice: sell || undefined }),
      serialNumber: serial.trim(),
      imei: imei.trim() || undefined,
      condition,
      value: paid,
      ...(customer ? { customerId: customer.id } : { customerName: custName.trim() || undefined, customerPhone: custPhone.trim() || undefined }),
      physicalCondition: look.trim() || undefined,
      notes: notes.trim() || undefined,
    }),
    onSuccess: (r) => {
      toast.success(`Trade-in ${r.number} darj — galle se ${formatPKR(r.value)} diye`);
      [...SERIAL_KEYS, 'cash-register'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      onClose();
    },
    onError: (e) => toast.error(apiError(e, 'Trade-in darj nahi hua')),
  });

  return (
    <Modal open onClose={onClose} size="lg" title={<span className="inline-flex items-center gap-2"><Recycle className="h-5 w-5 text-brand-600" />Purana unit khareedein (trade-in)</span>}
      description="Customer ka purana unit stock mein aata hai, paisa galle se jata hai"
      footer={<>
        <p className="mr-auto text-[0.8125rem] text-slate-500">{problem ?? `Galle se ${formatPKR(paid)} niklenge`}</p>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!!problem}>Darj karein</Button>
      </>}>
      <div className="space-y-4">
        <Segmented value={mode} onChange={(v) => setMode(v as Mode)} items={[{ value: 'new', label: 'Naya used product' }, { value: 'existing', label: 'Pehle se product hai' }]} />
        {mode === 'existing'
          ? <ProductPick value={product} onChange={setProduct} hint="Isi product ki cost ausat ho jayegi" />
          : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Cheez ka naam" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Samsung LED 32" maxLength={150} hint={'Product "Used …" naam se banega'} data-autofocus />
              <Input label="Bechne ka rate" inputMode="decimal" value={salePrice} onChange={(e) => setSalePrice(num(e.target.value))} placeholder="0" className="text-right tabular-nums"
                hint={sell > 0 && paid > 0 ? `Profit ${formatPKR(sell - paid)}` : 'Khali ho to khareed wala rate'} />
            </div>
          )}
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Serial number" required value={serial} onChange={(e) => setSerial(e.target.value)} className="font-mono" maxLength={80} hint="Unit ke peeche ya dabbe par" />
          <Input label="IMEI" value={imei} onChange={(e) => setImei(e.target.value.replace(/\s/g, ''))} className="font-mono" maxLength={40} hint="Marzi hai" />
          <Select label="Halat" value={condition} onChange={(e) => setCondition(e.target.value as typeof condition)}
            options={CONDITIONS.map((c) => ({ value: c, label: CONDITION_META[c]?.label ?? c }))} hint="Bill aur list par dikhti hai" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Kitne mein liya (Rs)" required inputMode="decimal" value={value} onChange={(e) => setValue(num(e.target.value))} placeholder="0" className="text-right text-base font-semibold tabular-nums"
            hint="Ye paisa khule galle se niklega — register khula hona chahiye" />
          <Input label="Dikhne mein kaisa" value={look} onChange={(e) => setLook(e.target.value)} maxLength={120} placeholder="Halki kharoch, dabba nahi" hint="Marzi hai" />
        </div>
        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <CustomerPick value={customer} onChange={setCustomer} label="Kis se liya" hint="Chori ka maal na ho — naam aur phone zaroor likhein" />
          {!customer && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Input label="Naam" value={custName} onChange={(e) => setCustName(e.target.value)} maxLength={120} placeholder="Bechne wale ka naam" />
              <Input label="Phone" inputMode="tel" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} maxLength={30} placeholder="03xx…" />
            </div>
          )}
        </div>
        <Textarea label="Note" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder="CNIC number, kis cheez ke badle liya…" hint="Sirf andar ke liye" />
      </div>
    </Modal>
  );
}
