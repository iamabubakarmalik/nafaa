/** Counter sheets (web JewelryPosPage): edit a line, add a piece by hand, weigh old gold in for the bill, and take the payment. */

import { useMutation, useQuery } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { lineTotal, metalOf, oldGoldValue, r2, rateFor, type Purity } from '@nafaa/core/industries/jewelry';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Amount, Button, Card, ChipGroup, Input, ListRow, MoneyInput, Select, Sheet, Text, toast, useTheme } from '@/design';
import { MethodChips, errorText } from '@/industries/_shared/deskKit';
import { NumberInput } from '@/modules/inventory/components/fields';
import { exchangesApi, type Exchange } from '../api';
import { CATEGORY_LABEL, KEYS, MAIN_CATEGORIES, grams, purityLabel, refreshJewelry, useMetalRates } from '../meta';
import { newKey, useJewelryBill, type Line } from './billStore';
import { PurityPicker } from './ui';

export function LineSheet({ line, onClose }: { line: Line | null; onClose: () => void }) {
  const th = useTheme();
  const { patch, remove } = useJewelryBill();
  if (!line) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;
  return (
    <Sheet open onClose={onClose} title={line.name} description={line.plain ? undefined : `${purityLabel(line.purity)} · ${grams(line.netWeight)}${line.hallmark ? ` · ${t('hallmark')}` : ''}`}
      footer={<View style={{ flexDirection: 'row', gap: th.space(2) }}>
        <Button variant="danger" icon={Trash2} onPress={() => { remove(line.key); onClose(); }}>{t('Hatayein')}</Button>
        <Button style={{ flex: 1 }} onPress={onClose}>{t('Theek hai')}</Button>
      </View>}>
      <View style={{ gap: th.space(3) }}>
        {line.plain ? <MoneyInput label={t('Qeemat')} value={line.making} onChangeValue={(v) => patch(line.key, { making: v ?? 0 })} /> : (
          <>
            <MoneyInput label={t('Rate / g')} value={line.ratePerGram} onChangeValue={(v) => patch(line.key, { ratePerGram: v ?? 0 })} />
            <MoneyInput label={t('Banwai')} value={line.making} onChangeValue={(v) => patch(line.key, { making: v ?? 0 })} />
            <NumberInput label={t('Kaat')} value={line.wastagePct} onChangeValue={(v) => patch(line.key, { wastagePct: Math.min(v ?? 0, 30) })} hint="%" />
          </>
        )}
        <NumberInput label={t('Adad')} value={line.qty} integer onChangeValue={(v) => patch(line.key, { qty: Math.max(Math.round(v ?? 1), 1) })} />
        <Card tone="info"><Text weight="bold">{t('Is piece ki qeemat')}: {formatMoney(lineTotal({ ...line, ratePerGram: line.ratePerGram }))}</Text></Card>
      </View>
    </Sheet>
  );
}

export function HandPieceSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const th = useTheme();
  const { rates } = useMetalRates();
  const add = useJewelryBill((s) => s.add);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('RING');
  const [purity, setPurity] = useState<Purity>('KARAT_22');
  const [weight, setWeight] = useState<number | null>(null);
  const [ownRate, setOwnRate] = useState<number | null>(null);
  const [making, setMaking] = useState<number | null>(null);
  useEffect(() => { if (open) { setName(''); setWeight(null); setOwnRate(null); setMaking(null); } }, [open]);
  const rate = rateFor(rates, metalOf(purity), purity)?.ratePerGram ?? 0;
  const r = ownRate ?? rate;
  const total = r2((weight ?? 0) * r + (making ?? 0));
  const ok = !!name.trim() && (weight ?? 0) > 0 && r > 0;
  return (
    <Sheet open={open} onClose={onClose} title={t('Hath se piece')} description={t('Jo zewar catalog me nahi — stock se kuch nahi kat-ta')}
      footer={<Button fullWidth size="lg" disabled={!ok} onPress={() => {
        add({ key: newKey(), name: name.trim(), category, purity, grossWeight: weight ?? 0, netWeight: weight ?? 0, ratePerGram: r, making: making ?? 0, wastagePct: 0, wastageGrams: 0, stones: 0, other: 0, qty: 1 });
        onClose();
      }}>{t('Bill me daalein · {{total}}', { total: formatMoney(total) })}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Naam')} value={name} onChangeText={setName} placeholder={t('Jaise: purani choori 22K')} />
        <Select label={t('Type')} value={category} onChange={setCategory} options={MAIN_CATEGORIES.map((c) => ({ value: c, label: t(CATEGORY_LABEL[c]) }))} />
        <PurityPicker label={t('Karat')} value={purity} onChange={(p) => { setPurity(p); setOwnRate(null); }} />
        <NumberInput label={t('Wazan (g)')} value={weight} onChangeValue={setWeight} />
        <MoneyInput label={t('Rate / g')} value={ownRate ?? (rate || null)} onChangeValue={setOwnRate} hint={!rate ? t('{{purity}} ka aaj ka rate set nahi — rate khud likhein', { purity: purityLabel(purity) }) : undefined} />
        <MoneyInput label={t('Banwai')} value={making} onChangeValue={setMaking} />
      </View>
    </Sheet>
  );
}

/** Old gold weighed in at the counter: it goes into metal stock as a JEX- record and onto the bill as a trade-in. */
export function OldGoldSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const th = useTheme();
  const { rates } = useMetalRates();
  const { customer, golds, addGold } = useJewelryBill();
  const [purity, setPurity] = useState<Purity>('KARAT_22');
  const [g, setG] = useState<number | null>(null);
  const [kaat, setKaat] = useState<number | null>(0);
  const [own, setOwn] = useState<number | null>(null);
  const waiting = useQuery({ queryKey: [KEYS.exchanges, 'bill-open'], queryFn: () => exchangesApi.page({ kind: 'bill-open', limit: 50 }), staleTime: 30_000, enabled: open });
  useEffect(() => { if (open) { setG(null); setKaat(0); setOwn(null); } }, [open]);
  const calc = oldGoldValue(g ?? 0, purity, rates, kaat ?? 0);
  const value = r2(own ?? calc.value);
  const take = (e: Exchange) => addGold({ code: e.exchangeNumber, value: e.netValue, grams: e.netWeight ?? e.grossWeight, purity: e.testedPurity ?? e.claimedPurity });
  const left = (waiting.data?.items ?? []).filter((e) => !golds.some((x) => x.code === e.exchangeNumber));
  const weigh = useMutation({
    mutationFn: () => exchangesApi.create({
      forBill: true, exchangeType: metalOf(purity) === 'SILVER' ? 'OLD_SILVER_EXCHANGE' : 'OLD_GOLD_EXCHANGE', customerId: customer?.id || undefined, customerName: customer?.name || 'Walk-in',
      customerPhone: customer?.phone ?? '', itemDescription: 'Counter par bill ke liye liya gaya purana zewar', metalType: metalOf(purity), claimedPurity: purity, testedPurity: purity, grossWeight: g,
      ...(own != null ? { ratePerGram: r2(value / (g ?? 1)), deductionPct: 0 } : { ratePerGram: calc.perGram, deductionPct: kaat ?? 0 }),
    }),
    onSuccess: (e) => { take(e); setG(null); setOwn(null); refreshJewelry([KEYS.exchanges, KEYS.metal, 'metal-stock-balance']); toast.success(t('{{no}} — purana sona bill par', { no: e.exchangeNumber })); },
    onError: (e) => toast.error(errorText(e, t('Purana sona save nahi hua'))),
  });
  return (
    <Sheet open={open} onClose={onClose} title={t('Purana sona (trade-in)')} description={t('Sona metal stock me jata hai, bill par trade-in.')} height={0.85}
      footer={<Button fullWidth size="lg" loading={weigh.isPending} disabled={!((g ?? 0) > 0) || !(value > 0)} onPress={() => weigh.mutate()}>{t('Bill par lein · {{value}}', { value: formatMoney(value) })}</Button>}>
      <View style={{ gap: th.space(3) }}>
        {golds.map((x) => <ListRow key={x.code} dense title={`${x.code} · ${purityLabel(x.purity)} ${grams(x.grams)}`} trailing={<Amount value={x.value} weight="bold" />} />)}
        <PurityPicker label={t('Karat')} value={purity} onChange={(p) => { setPurity(p); setOwn(null); }} />
        <NumberInput label={t('Wazan (g)')} value={g} onChangeValue={(v) => { setG(v); setOwn(null); }} />
        <NumberInput label={t('Kaat %')} value={kaat} onChangeValue={(v) => { setKaat(Math.min(v ?? 0, 50)); setOwn(null); }} />
        <MoneyInput label={t('Qeemat')} value={own ?? (calc.value || null)} onChangeValue={setOwn}
          hint={calc.perGram ? t('{{purity}} khareed rate {{rate}}/g · poora {{full}}', { purity: purityLabel(purity), rate: formatMoney(calc.perGram), full: formatMoney(calc.full) }) : t('Is karat ka rate set nahi — qeemat khud likhein')} />
        {left.length > 0 && (
          <View>
            <Text size="sm" weight="semibold" tone="secondary">{t('Pehle se tola hua (bill ka intezar)')}</Text>
            {left.map((e) => <ListRow key={e.id} dense title={`${e.exchangeNumber} · ${purityLabel(e.testedPurity ?? e.claimedPurity)} ${grams(e.netWeight ?? e.grossWeight)}`} subtitle={e.customerName} trailing={<Amount value={e.netValue} weight="bold" />} onPress={() => take(e)} />)}
          </View>
        )}
      </View>
    </Sheet>
  );
}

export interface PayChoice { paymentMethod: string; paidAmount: number; credit: boolean }

export function PaymentSheet({ open, total, hasCustomer, busy, onPickCustomer, onConfirm, onClose }: {
  open: boolean; total: number; hasCustomer: boolean; busy: boolean; onPickCustomer: () => void; onConfirm: (p: PayChoice) => void; onClose: () => void;
}) {
  const th = useTheme();
  const [method, setMethod] = useState('CASH');
  const [paid, setPaid] = useState<number | null>(total);
  useEffect(() => { if (open) { setMethod('CASH'); setPaid(total); } }, [open, total]);
  const n = Math.min(Math.max(paid ?? 0, 0), total);
  const rest = r2(total - n);
  const blocked = rest > 0.005 && !hasCustomer;
  return (
    <Sheet open={open} onClose={onClose} title={t('Payment lein')} description={t('Customer dega: {{total}}', { total: formatMoney(total) })}
      footer={<Button fullWidth size="lg" variant="success" loading={busy} disabled={blocked} onPress={() => onConfirm({ paymentMethod: method, paidAmount: n, credit: rest > 0.005 })}>{rest > 0.005 ? t('Bill banayein — {{rest}} udhaar', { rest: formatMoney(rest) }) : t('Bill banayein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <MoneyInput label={t('Kitne mile')} value={paid} onChangeValue={setPaid} size="xl" />
        <ChipGroup value={rest <= 0.005 ? 'full' : n === 0 ? 'zero' : ''} onChange={(v) => setPaid(v === 'full' ? total : 0)} options={[{ value: 'full', label: t('Poora') }, { value: 'zero', label: t('Udhaar') }]} />
        <Text size="sm" weight="semibold" tone="secondary">{t('Payment kaise mili')}</Text>
        <MethodChips value={method} onChange={setMethod} />
        {rest > 0.005 && <Text size="xs" tone="muted">{t('Jo paisa baqi hai wo customer ke Khata me chala jayega.')}</Text>}
        {blocked && <Button variant="soft" onPress={onPickCustomer}>{t('Udhaar ke liye customer chunein')}</Button>}
      </View>
    </Sheet>
  );
}
