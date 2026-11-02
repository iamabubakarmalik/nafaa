/**
 * New AMC contract: customer and site, what is covered, number of visits,
 * what is free (labour, parts), the fee and what is paid now. The fee is a
 * bill today; the unpaid part goes on the customer's khata.
 */

import { useState } from 'react';
import { Button, Input, Modal, Switch } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { PaymentMethodPicker } from '@modules/pos/components';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import type { AmcInput } from '../api/amc.api';
import { dateInput, digits, money } from './meta';
import { t } from '@core/i18n';

export function AmcModal({ pending, onSave, onClose }: { pending: boolean; onSave: (v: AmcInput) => void; onClose: () => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [items, setItems] = useState('');
  const [visits, setVisits] = useState('4');
  const [labour, setLabour] = useState(true);
  const [parts, setParts] = useState(false);
  const [value, setValue] = useState('');
  const [paid, setPaid] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [start, setStart] = useState(dateInput(new Date()));
  const [terms, setTerms] = useState('');

  const fee = Number(value) || 0;
  const now = Number(paid) || 0;
  const errors: string[] = [];
  if (!name.trim()) errors.push(t('Customer ka naam likhein'));
  if (!phone.trim() || digits(phone).length < 10) errors.push(t('Phone poora likhein'));
  if (!address.trim()) errors.push(t('Site ka pata likhein'));
  if (!(Number(visits) >= 1)) errors.push(t('Kitni visits — kam az kam 1'));
  if (now > fee) errors.push(t('Contract sirf {{formatPKR}} ka hai', { formatPKR: formatPKR(fee) }));

  const submit = () => {
    if (errors.length || pending) return;
    onSave({
      customerName: name.trim(), customerPhone: phone.trim(), serviceAddress: address.trim(), city: city.trim() || undefined,
      coveredItems: items.split(',').map((x) => x.trim()).filter(Boolean), numberOfVisits: Number(visits), includesLabour: labour, includesParts: parts,
      contractValue: fee, amountPaid: now, paymentMode: method, startDate: new Date(`${start}T12:00`).toISOString(), termsConditions: terms.trim() || undefined,
      autoScheduleVisits: true,
    });
  };

  return (
    <Modal open onClose={onClose} size="lg" title={t('Naya AMC contract')} description={t('Saal bhar ki maintenance — visits khud tay ho jati hain')}
      footer={<>
        {errors[0] && <span className="me-auto text-[0.8125rem] text-rose-600">{errors[0]}</span>}
        <Button variant="secondary" onClick={onClose}>{t('Rehne dein')}</Button>
        <Button onClick={submit} disabled={errors.length > 0} loading={pending}>{fee > now ? t('Contract — {{formatPKR}} khata me', { formatPKR: formatPKR(fee - now) }) : t('Contract banayein')}</Button>
      </>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label={t('Customer / company')} required value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <Input label={t('Phone')} required inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03001234567" />
          <Input label={t('Site ka pata')} required value={address} onChange={(e) => setAddress(e.target.value)} wrapperClassName="sm:col-span-2" />
          <Input label={t('Shehar')} value={city} onChange={(e) => setCity(e.target.value)} />
          <Input label={t('Kya shamil hai')} value={items} onChange={(e) => setItems(e.target.value)} placeholder={t('3 split AC, 1 geyser')} hint={t('Comma laga kar')} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label={t('Saal me visits')} inputMode="numeric" value={visits} onChange={(e) => setVisits(digits(e.target.value).slice(0, 3))} hint={t('Barabar waqfe par tay hongi')} />
          <Input label={t('Shuru')} type="date" value={start} onChange={(e) => setStart(e.target.value)} hint={t('Ek saal ke liye')} />
          <div className="space-y-2 pt-6">
            <Switch checked={labour} onChange={(e) => setLabour(e.target.checked)} label={t('Kaam muft')} />
            <Switch checked={parts} onChange={(e) => setParts(e.target.checked)} label={t('Parts muft')} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label={t('Contract fee (Rs)')} inputMode="decimal" value={value} onChange={(e) => setValue(money(e.target.value))} className="text-end font-semibold" />
          <Input label={t('Abhi mila (Rs)')} inputMode="decimal" value={paid} onChange={(e) => setPaid(money(e.target.value))} className="text-end" hint={fee > now ? t('{{formatPKR}} khata me udhaar', { formatPKR: formatPKR(fee - now) }) : undefined} />
        </div>
        {now > 0 && <PaymentMethodPicker value={method} onChange={setMethod} />}
        <Input label={t('Shartein')} value={terms} onChange={(e) => setTerms(e.target.value)} placeholder={t('Gas refill alag, emergency visit 20% kam')} />
      </form>
    </Modal>
  );
}
