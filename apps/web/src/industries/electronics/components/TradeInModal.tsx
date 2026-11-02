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
import { t } from '@core/i18n';

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
  const problem = mode === 'existing' && !product ? t('Product chunein')
    : mode === 'new' && name.trim().length < 2 ? t('Cheez ka naam likhein')
      : !serial.trim() ? t('Serial number likhein')
        : !(paid > 0) ? t('Kitne mein liya — amount likhein')
          : mode === 'new' && sell > 0 && sell < paid ? t('Bechne ka rate khareed se kam hai')
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
      toast.success(t('Trade-in {{number}} darj — galle se {{formatPKR}} diye', { number: r.number, formatPKR: formatPKR(r.value) }));
      [...SERIAL_KEYS, 'cash-register'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      onClose();
    },
    onError: (e) => toast.error(apiError(e, t('Trade-in darj nahi hua'))),
  });

  return (
    <Modal open onClose={onClose} size="lg" title={<span className="inline-flex items-center gap-2"><Recycle className="h-5 w-5 text-brand-600" />{t('Purana unit khareedein (trade-in)')}</span>}
      description={t('Customer ka purana unit stock mein aata hai, paisa galle se jata hai')}
      footer={<>
        <p className="me-auto text-[0.8125rem] text-slate-500">{problem ?? t('Galle se {{paid}} niklenge', { paid: formatPKR(paid) })}</p>
        <Button variant="secondary" onClick={onClose}>{t('Rehne dein')}</Button>
        <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!!problem}>{t('Darj karein')}</Button>
      </>}>
      <div className="space-y-4">
        <Segmented value={mode} onChange={(v) => setMode(v as Mode)} items={[{ value: 'new', label: t('Naya used product') }, { value: 'existing', label: t('Pehle se product hai') }]} />
        {mode === 'existing'
          ? <ProductPick value={product} onChange={setProduct} hint={t('Isi product ki cost ausat ho jayegi')} />
          : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label={t('Cheez ka naam')} required value={name} onChange={(e) => setName(e.target.value)} placeholder={t('Samsung LED 32')} maxLength={150} hint={t('Product "Used …" naam se banega')} data-autofocus />
              <Input label={t('Bechne ka rate')} inputMode="decimal" value={salePrice} onChange={(e) => setSalePrice(num(e.target.value))} placeholder="0" className="text-end tabular-nums"
                hint={sell > 0 && paid > 0 ? t('Profit {{formatPKR}}', { formatPKR: formatPKR(sell - paid) }) : t('Khali ho to khareed wala rate')} />
            </div>
          )}
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label={t('Serial number')} required value={serial} onChange={(e) => setSerial(e.target.value)} className="font-mono" maxLength={80} hint={t('Unit ke peeche ya dabbe par')} />
          <Input label={t('IMEI')} value={imei} onChange={(e) => setImei(e.target.value.replace(/\s/g, ''))} className="font-mono" maxLength={40} hint={t('Marzi hai')} />
          <Select label={t('Halat')} value={condition} onChange={(e) => setCondition(e.target.value as typeof condition)}
            options={CONDITIONS.map((c) => ({ value: c, label: CONDITION_META[c]?.label ?? c }))} hint={t('Bill aur list par dikhti hai')} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label={t('Kitne mein liya (Rs)')} required inputMode="decimal" value={value} onChange={(e) => setValue(num(e.target.value))} placeholder="0" className="text-end text-base font-semibold tabular-nums"
            hint={t('Ye paisa khule galle se niklega — register khula hona chahiye')} />
          <Input label={t('Dikhne mein kaisa')} value={look} onChange={(e) => setLook(e.target.value)} maxLength={120} placeholder={t('Halki kharoch, dabba nahi')} hint={t('Marzi hai')} />
        </div>
        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <CustomerPick value={customer} onChange={setCustomer} label={t('Kis se liya')} hint={t('Chori ka maal na ho — naam aur phone zaroor likhein')} />
          {!customer && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Input label={t('Naam')} value={custName} onChange={(e) => setCustName(e.target.value)} maxLength={120} placeholder={t('Bechne wale ka naam')} />
              <Input label={t('Phone')} inputMode="tel" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} maxLength={30} placeholder={t('03xx…')} />
            </div>
          )}
        </div>
        <Textarea label={t('Note')} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder={t('CNIC number, kis cheez ke badle liya…')} hint={t('Sirf andar ke liye')} />
      </div>
    </Modal>
  );
}
