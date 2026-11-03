/**
 * Doctor share payouts (web DoctorPayouts): pick a doctor and period, see the
 * fees seen and the doctor's share that is still owed, pay it (an Expense is
 * written, from the drawer when cash) and open or share the slip.
 */

import { useQuery } from '@tanstack/react-query';
import { Banknote, FileText, HandCoins } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Button, DetailRow, EmptyState, Input, KpiStrip, ListRow, MoneyInput, Screen, Segmented, Select, Sheet, Text, toast, useTheme } from '@/design';
import { MethodChips, errorText, shiftKey, todayKey, useDeskOnline } from '../../_shared/deskKit';
import { DocActions, L, type PackDoc } from '../../_shared/docKit';
import { clinicApi, type DoctorPayout } from '../api';
import { CLINIC_KEYS, dateOf, doctorName, refreshClinic } from '../meta';

type Period = 'month' | 'last' | 'days30';
const stamp = (k: string, end?: boolean) => `${k}T${end ? '23:59:59' : '00:00:00'}+05:00`;
function range(p: Period) {
  const today = todayKey();
  const first = `${today.slice(0, 8)}01`;
  if (p === 'month') return { from: first, to: today };
  if (p === 'days30') return { from: shiftKey(today, -29), to: today };
  const end = shiftKey(first, -1);
  return { from: `${end.slice(0, 8)}01`, to: end };
}

const slipDoc = (p: DoctorPayout, lang: Parameters<typeof L>[0]): PackDoc => ({
  fileName: `doctor-share-${p.id}`,
  title: L(lang, 'Doctor share slip', 'ڈاکٹر شیئر پرچی', 'Doctor share slip'),
  subtitle: doctorName(p.doctor),
  meta: [[L(lang, 'Date', 'تاریخ', 'Date'), dateOf(p.createdAt)]],
  rows: [[L(lang, 'Period', 'مدت', 'Muddat'), `${dateOf(p.periodFrom)} – ${dateOf(p.periodTo)}`],
    ...(p.expense ? [[L(lang, 'Expense', 'خرچہ', 'Expense'), p.expense.expenseNumber] as [string, string]] : []),
    ...(p.note ? [[L(lang, 'Note', 'نوٹ', 'Note'), p.note] as [string, string]] : []),
    [L(lang, 'Amount', 'رقم', 'Amount'), formatMoney(p.amount), 'strong']],
  notes: [L(lang, 'Doctor signature: ____________________', 'ڈاکٹر کے دستخط: ____________________', 'Doctor ke dastakhat: ____________________')],
});

export function DoctorPayoutsScreen() {
  const th = useTheme();
  const can = usePermission();
  const canPay = can(P.EXPENSES_CREATE);
  const { guard } = useDeskOnline('clinicDesk');
  const [doctorId, setDoctorId] = useState('');
  const [period, setPeriod] = useState<Period>('month');
  const [paying, setPaying] = useState(false);
  const [amount, setAmount] = useState<number | null>(null);
  const [method, setMethod] = useState('CASH');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [slip, setSlip] = useState<DoctorPayout | null>(null);
  const r = range(period);
  const doctors = useQuery({ queryKey: [CLINIC_KEYS.doctors, 'all'], queryFn: () => clinicApi.doctors.list() });
  const id = doctorId || doctors.data?.[0]?.id || '';
  const due = useQuery({ queryKey: [CLINIC_KEYS.doctors, 'due', id, r.from, r.to], queryFn: () => clinicApi.payouts.due(id, stamp(r.from), stamp(r.to, true)), enabled: !!id });
  const past = useQuery({ queryKey: [CLINIC_KEYS.doctors, 'payouts', id], queryFn: () => clinicApi.payouts.list({ doctorId: id, limit: 30 }), enabled: !!id });
  const d = due.data;
  const pay = async () => {
    if (!d) return;
    const n = Math.round((amount ?? d.due) * 100) / 100;
    if (!(n > 0)) { toast.warning(t('Amount likhein')); return; }
    if (n > d.due + 0.009) { toast.warning(t('Sirf {{due}} baqi hai', { due: formatMoney(d.due) })); return; }
    setBusy(true);
    try {
      const p = await clinicApi.payouts.pay({ doctorId: id, from: stamp(r.from), to: stamp(r.to, true), amount: n, paymentMethod: method, note: note.trim() || undefined });
      refreshClinic(true); toast.success(t('Share ada ho gaya'), { message: p.expenseNumber }); setPaying(false);
      setSlip({ ...p, doctor: d.doctor, expense: p.expense ?? { id: '', expenseNumber: p.expenseNumber, paymentMethod: method } });
    } catch (e) { toast.error(errorText(e, t('Payment nahi hui'))); } finally { setBusy(false); }
  };
  return (
    <Screen title={t('Share payouts')} subtitle={t('Doctor ka hissa')} onRefresh={() => { void due.refetch(); void past.refetch(); }} refreshing={due.isRefetching}
      footer={canPay && d && d.due > 0 ? <Button fullWidth size="lg" icon={Banknote} onPress={() => guard(() => { setAmount(d.due); setPaying(true); })}>{t('Share ada karein')}</Button> : undefined}>
      <View style={{ gap: th.space(3) }}>
        <Select label={t('Doctor')} value={id || null} onChange={setDoctorId} options={(doctors.data ?? []).map((x) => ({ value: x.id, label: doctorName(x) }))} />
        <Segmented value={period} onChange={(v) => setPeriod(v as Period)} options={[{ value: 'month', label: t('Is mahine') }, { value: 'last', label: t('Pichla mahina') }, { value: 'days30', label: t('30 din') }]} />
        {d && (
          <>
            <KpiStrip items={[{ key: 'share', label: t('Hissa'), value: formatMoney(d.share) }, { key: 'paid', label: t('Di ja chuki'), value: formatMoney(d.paid) }, { key: 'due', label: t('Baqi'), value: formatMoney(d.due), tone: d.due > 0 ? 'warning' : undefined }]} />
            <View>
              <DetailRow label={t('Mareez dekhe')} value={String(d.seen)} />
              <DetailRow label={t('Fees')} value={<Text ltr>{formatMoney(d.fees)}</Text>} />
              <DetailRow label={t('Lab fees')} value={<Text ltr>{formatMoney(d.labFees)}</Text>} />
              <DetailRow label={t('Hissa')} value={<Text ltr>{d.commissionType === 'PERCENTAGE' ? `${d.commissionPct}%` : formatMoney(d.commissionPct)}</Text>} last />
            </View>
          </>
        )}
        <Text size="sm" weight="semibold" tone="secondary">{t('Pichli payouts')}</Text>
        {!past.data?.items.length ? <EmptyState icon={HandCoins} title={t('Abhi koi payout nahi')} /> : (
          <View>{past.data.items.map((p) => <ListRow key={p.id} icon={FileText} divider chevron onPress={() => setSlip(p)} title={`${dateOf(p.periodFrom)} – ${dateOf(p.periodTo)}`} subtitle={p.expense?.expenseNumber ?? dateOf(p.createdAt)} trailing={<Amount value={p.amount} weight="bold" />} />)}</View>
        )}
      </View>
      <Sheet open={paying} onClose={() => setPaying(false)} title={t('Share ada karein')} description={d ? t('{{doc}} · baqi {{due}}', { doc: doctorName(d.doctor), due: formatMoney(d.due) }) : undefined}
        footer={<Button fullWidth size="lg" variant="success" loading={busy} onPress={() => void pay()}>{t('Ada karein')}</Button>}>
        <View style={{ gap: th.space(3) }}>
          <MoneyInput label={t('Amount')} value={amount} onChangeValue={setAmount} size="xl" hint={t('Kam likhein to baqi baad me de sakte hain')} />
          <MethodChips value={method} onChange={setMethod} />
          <Input label={t('Note')} value={note} onChangeText={setNote} />
        </View>
      </Sheet>
      <Sheet open={!!slip} onClose={() => setSlip(null)} title={t('Doctor share slip')} description={slip ? `${doctorName(slip.doctor)} · ${formatMoney(slip.amount)}` : undefined}
        footer={slip ? <View style={{ alignItems: 'center' }}><DocActions build={(lang) => slipDoc(slip, lang)} /></View> : undefined}>
        {slip && <View><DetailRow label={t('Muddat')} value={`${dateOf(slip.periodFrom)} – ${dateOf(slip.periodTo)}`} /><DetailRow label={t('Date')} value={dateOf(slip.createdAt)} last={!slip.note} />{!!slip.note && <DetailRow label={t('Note')} value={slip.note} last />}</View>}
      </Sheet>
    </Screen>
  );
}
