/** Repair job sheets (web components/repairs): check, add a part, take an advance, hand the phone back, and a reason for cancel / not repairable. */

import { useMutation } from '@tanstack/react-query';
import { Receipt } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Button, ChipGroup, Input, MoneyInput, Row, Sheet, Text, TextArea, toast, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { repairsApi, type PartSource, type RepairStatus, type RepairTicket } from '../api';
import { METHODS, REPAIR_KEY, refreshMobile, repairStatusOf } from '../meta';
import { ProductField } from './kit';

const err = (e: unknown, fb: string) => apiErrorMessage(e, fb);
const Methods = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => <ChipGroup wrap value={value} onChange={onChange} options={METHODS.map((m) => ({ value: m.value, label: t(m.label) }))} />;

export function DiagnoseSheet({ ticket, onClose }: { ticket: RepairTicket | null; onClose: () => void }) {
  const th = useTheme();
  const [issue, setIssue] = useState('');
  const [notes, setNotes] = useState('');
  const [plan, setPlan] = useState('');
  const [labour, setLabour] = useState<number | null>(null);
  const [estimate, setEstimate] = useState<number | null>(null);
  useEffect(() => { if (ticket) { setIssue(ticket.diagnosedIssue ?? ''); setNotes(ticket.diagnosisNotes ?? ''); setPlan(ticket.recommendedActions ?? ''); setLabour(Number(ticket.laborCost) || null); setEstimate(Number(ticket.estimatedCost) || null); } }, [ticket]);
  const paid = Number(ticket?.paidAmount || 0);
  const problem = !issue.trim() ? t('Kharabi likhein') : !((estimate ?? 0) > 0) ? t('Andaza likhein') : (estimate ?? 0) + 0.01 < paid ? t('{{paid}} advance mil chuka — andaza is se kam nahi', { paid: formatMoney(paid) }) : (labour ?? 0) > (estimate ?? 0) ? t('Mazdoori andaze se zyada nahi') : null;
  const save = useMutation({
    mutationFn: () => repairsApi.diagnose(ticket!.id, { diagnosedIssue: issue.trim(), diagnosisNotes: notes.trim() || undefined, recommendedActions: plan.trim() || undefined, estimatedCost: estimate ?? 0, laborCost: labour ?? 0 }),
    onSuccess: () => { toast.success(t('Check save ho gaya — customer ko andaza batayein')); refreshMobile([REPAIR_KEY, 'repair-stats']); onClose(); },
    onError: (e) => toast.error(err(e, t('Save nahi hua'))),
  });
  return (
    <Sheet open={!!ticket} onClose={onClose} height={0.9} title={ticket ? t('Check — {{ticketNumber}}', { ticketNumber: ticket.ticketNumber }) : undefined} description={ticket ? t('Customer ne kaha: {{reportedIssue}}', { reportedIssue: ticket.reportedIssue }) : undefined}
      footer={<View style={{ gap: 4 }}>{problem && issue ? <Text size="xs" tone="warning">{problem}</Text> : null}<Button fullWidth size="lg" loading={save.isPending} disabled={!!problem} onPress={() => save.mutate()}>{t('Save karein')}</Button></View>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Asal kharabi')} value={issue} onChangeText={setIssue} placeholder={t('LCD toota, touch nahi chal raha')} />
        <TextArea label={t('Kya karna hai')} value={plan} onChangeText={setPlan} placeholder={t('Screen badalni hai, 2 ghante')} />
        <Row gap={2}>
          <MoneyInput containerStyle={{ flex: 1 }} label={t('Mazdoori')} value={labour} onChangeValue={setLabour} hint={t('Parts alag se jodein')} />
          <MoneyInput containerStyle={{ flex: 1 }} label={t('Customer ko andaza')} value={estimate} onChangeValue={setEstimate} />
        </Row>
        <TextArea label={t('Andar ka note')} value={notes} onChangeText={setNotes} hint={t('Sirf dukaan ke liye — parchi par nahi aata')} />
      </View>
    </Sheet>
  );
}

const SOURCES: Array<{ value: PartSource; label: string }> = [{ value: 'OWN_STOCK', label: 'Apne stock se' }, { value: 'PURCHASED_FOR_REPAIR', label: 'Bahar se mangaya' }, { value: 'CUSTOMER_PROVIDED', label: 'Customer ne diya' }];

export function AddPartSheet({ ticket, onClose }: { ticket: RepairTicket | null; onClose: () => void }) {
  const th = useTheme();
  const [source, setSource] = useState<PartSource>('OWN_STOCK');
  const [product, setProduct] = useState<{ id: string; name: string; price: number; cost: number } | null>(null);
  const [name, setName] = useState('');
  const [qty, setQty] = useState<number | null>(1);
  const [cost, setCost] = useState<number | null>(null);
  const [price, setPrice] = useState<number | null>(null);
  useEffect(() => { if (ticket) { setSource('OWN_STOCK'); setProduct(null); setName(''); setQty(1); setCost(null); setPrice(null); } }, [ticket]);
  const q = qty ?? 0;
  const problem = source === 'OWN_STOCK' && !product ? t('Stock se part chunein') : source !== 'OWN_STOCK' && !name.trim() ? t('Part ka naam likhein') : !(q > 0) ? t('Kitne — likhein') : price == null ? t('Customer se kitne lene hain — likhein') : null;
  const save = useMutation({
    mutationFn: () => repairsApi.addPart(ticket!.id, {
      productId: source === 'OWN_STOCK' ? product?.id : undefined, partName: source === 'OWN_STOCK' ? product!.name : name.trim(), quantity: q,
      unitCost: source === 'CUSTOMER_PROVIDED' ? 0 : cost ?? product?.cost ?? 0, unitPrice: price ?? 0, source,
    }),
    onSuccess: () => { toast.success(source === 'OWN_STOCK' ? t('Part laga — stock se nikal gaya') : t('Part laga')); refreshMobile([REPAIR_KEY, 'repair-stats', 'inv'], true); onClose(); },
    onError: (e) => toast.error(err(e, t('Part nahi laga'))),
  });
  return (
    <Sheet open={!!ticket} onClose={onClose} height={0.9} title={t('Part lagayein')} description={ticket ? `${ticket.ticketNumber} · ${ticket.deviceBrand} ${ticket.deviceModel}` : undefined}
      footer={<View style={{ gap: 4 }}>{problem && (name || product) ? <Text size="xs" tone="warning">{problem}</Text> : null}<Button fullWidth size="lg" loading={save.isPending} disabled={!!problem} onPress={() => save.mutate()}>{t('Jodein · {{amount}}', { amount: formatMoney(q * (price ?? 0)) })}</Button></View>}>
      <View style={{ gap: th.space(3) }}>
        <ChipGroup wrap value={source} onChange={setSource} options={SOURCES.map((s) => ({ value: s.value, label: t(s.label) }))} />
        {source === 'OWN_STOCK'
          ? <ProductField label={t('Part')} value={product} onChange={(p) => { setProduct({ id: p.product.id, name: p.product.name, price: Number(p.product.price) || 0, cost: Number((p.product as { costPrice?: number }).costPrice) || 0 }); setPrice(Number(p.product.price) || null); }} />
          : <Input label={t('Part ka naam')} value={name} onChangeText={setName} placeholder={t('iPhone 11 LCD')} />}
        <Row gap={2}>
          <NumberInput containerStyle={{ flex: 1 }} label={t('Kitne')} value={qty} onChangeValue={setQty} />
          {source !== 'CUSTOMER_PROVIDED' && <MoneyInput containerStyle={{ flex: 1 }} label={t('Cost (ek)')} value={cost ?? product?.cost ?? null} onChangeValue={setCost} hint={t('Dukaan ne kitne ka liya')} />}
        </Row>
        <MoneyInput label={t('Customer se (ek)')} value={price} onChangeValue={setPrice} hint={source === 'CUSTOMER_PROVIDED' ? t('Aksar 0') : undefined} />
      </View>
    </Sheet>
  );
}

export function AddPaymentSheet({ ticket, onClose }: { ticket: RepairTicket | null; onClose: () => void }) {
  const th = useTheme();
  const [amount, setAmount] = useState<number | null>(null);
  const [method, setMethod] = useState('CASH');
  const [ref, setRef] = useState('');
  useEffect(() => { if (ticket) { setAmount(null); setMethod('CASH'); setRef(''); } }, [ticket]);
  const ceiling = ticket ? (Number(ticket.totalCost) > 0 ? Number(ticket.totalCost) : Number(ticket.estimatedCost) || 0) : 0;
  const left = ticket ? Math.max(ceiling - Number(ticket.paidAmount || 0), 0) : 0;
  const n = amount ?? 0;
  const problem = !(n > 0) ? t('Amount likhein') : ceiling > 0 && n > left + 0.01 ? t('Baqi sirf {{left}} hai', { left: formatMoney(left) }) : null;
  const save = useMutation({
    mutationFn: () => repairsApi.addPayment(ticket!.id, { amount: n, paymentMethod: method as never, reference: ref.trim() || undefined }),
    onSuccess: () => { toast.success(t('{{amount}} advance mila — khata me jama', { amount: formatMoney(n) })); refreshMobile([REPAIR_KEY], true); onClose(); },
    onError: (e) => toast.error(err(e, t('Payment save nahi hui'))),
  });
  return (
    <Sheet open={!!ticket} onClose={onClose} title={t('Advance lein')} description={ticket ? `${ticket.ticketNumber} · ${ticket.customerName}` : undefined}
      footer={<Button fullWidth size="lg" loading={save.isPending} disabled={!!problem} onPress={() => save.mutate()}>{t('{{amount}} lein', { amount: formatMoney(n) })}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <MoneyInput label={t('Amount')} value={amount} onChangeValue={setAmount} size="xl" error={n > 0 && problem ? problem : undefined} />
        <Methods value={method} onChange={setMethod} />
        {method !== 'CASH' && <Input label={t('Transaction / slip number')} value={ref} onChangeText={setRef} hint={t('Marzi hai')} />}
      </View>
    </Sheet>
  );
}

export function DeliverSheet({ ticket, pending, onConfirm, onClose }: { ticket: RepairTicket | null; pending: boolean; onConfirm: (amount: number, method: string) => void; onClose: () => void }) {
  const th = useTheme();
  const bill = ticket ? (Number(ticket.totalCost) > 0 ? Number(ticket.totalCost) : Number(ticket.estimatedCost) || 0) : 0;
  const balance = ticket ? Math.max(bill - Number(ticket.paidAmount || 0), 0) : 0;
  const [amount, setAmount] = useState<number | null>(null);
  const [method, setMethod] = useState('CASH');
  useEffect(() => { if (ticket) { setAmount(balance || null); setMethod('CASH'); } }, [ticket]); // eslint-disable-line react-hooks/exhaustive-deps
  const entered = amount ?? 0;
  const tooMuch = entered > balance + 0.01;
  return (
    <Sheet open={!!ticket} onClose={onClose} title={ticket ? t('Phone wapas dein — {{ticketNumber}}', { ticketNumber: ticket.ticketNumber }) : undefined} description={ticket ? `${ticket.deviceBrand} ${ticket.deviceModel} · ${ticket.customerName}` : undefined}
      footer={<Button fullWidth size="lg" icon={Receipt} variant="success" loading={pending} disabled={tooMuch} onPress={() => onConfirm(entered, method)}>{balance > 0 ? t('Wapas dein · {{amount}}', { amount: formatMoney(entered) }) : t('Wapas dein')}</Button>}>
      {ticket && (
        <View style={{ gap: th.space(3) }}>
          <Row gap={2} style={{ justifyContent: 'space-between' }}><Text tone="secondary">{t('Bill')}</Text><Text weight="semibold" ltr>{formatMoney(bill)}</Text></Row>
          <Row gap={2} style={{ justifyContent: 'space-between' }}><Text tone="secondary">{t('Pehle mila')}</Text><Text weight="semibold" ltr>{formatMoney(Number(ticket.paidAmount || 0))}</Text></Row>
          <Row gap={2} style={{ justifyContent: 'space-between' }}><Text tone="secondary">{t('Baqi')}</Text><Text weight="bold" ltr>{formatMoney(balance)}</Text></Row>
          {balance > 0 && (
            <>
              <MoneyInput label={t('Abhi kitna liya')} value={amount} onChangeValue={setAmount} size="xl" error={tooMuch ? t('Baqi sirf {{left}} hai', { left: formatMoney(balance) }) : undefined} />
              <Methods value={method} onChange={setMethod} />
              {entered < balance && <Text size="xs" tone="muted">{t('Jo paisa baqi hai wo customer ke Khata me chala jayega.')}</Text>}
            </>
          )}
        </View>
      )}
    </Sheet>
  );
}

/** Reason for a status that closes the job (cancelled, not repairable). */
export function ReasonSheet({ ticket, to, onClose, onConfirm, pending }: { ticket: RepairTicket | null; to: RepairStatus | null; onClose: () => void; onConfirm: (note: string) => void; pending: boolean }) {
  const th = useTheme();
  const [note, setNote] = useState('');
  useEffect(() => { setNote(''); }, [to]);
  return (
    <Sheet open={!!ticket && !!to} onClose={onClose} title={to ? t(repairStatusOf(to).label) : undefined} description={ticket ? `${ticket.ticketNumber} · ${ticket.deviceBrand} ${ticket.deviceModel}` : undefined}
      footer={<Button fullWidth size="lg" variant={to === 'CANCELLED' ? 'danger' : 'primary'} loading={pending} onPress={() => onConfirm(note.trim())}>{t('Pakka karein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <TextArea label={t('Wajah')} value={note} onChangeText={setNote} />
      </View>
    </Sheet>
  );
}

