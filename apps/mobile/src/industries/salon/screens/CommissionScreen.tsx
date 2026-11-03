/**
 * One stylist's commission (web CommissionPayoutPage): pick a period, see the
 * billed services that are still owed, tick what to pay, pay from the drawer
 * (an Expense is written), and open or share the slip of any earlier payout.
 */

import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Banknote, FileText, History } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, Button, Checkbox, EmptyState, Input, KpiStrip, ListRow, Screen, Segmented, Sheet, Text, toast, useTheme } from '@/design';
import { DocActions, L, type PackDoc } from '../../_shared/docKit';
import { MethodChips, errorText, shiftKey, todayKey, useDeskOnline } from '../../_shared/deskKit';
import { ltr } from '../../_shared/serviceKit';
import { salonApi, type PayoutSlip } from '../api';
import { SALON_KEYS, dateOf, refreshSalon, staffName } from '../meta';

type Period = 'month' | 'last' | 'days30';
type Tab = 'owed' | 'all' | 'payouts';

function range(p: Period) {
  const today = todayKey();
  const first = `${today.slice(0, 8)}01`;
  if (p === 'month') return { from: first, to: today };
  if (p === 'days30') return { from: shiftKey(today, -29), to: today };
  const lastEnd = shiftKey(first, -1);
  return { from: `${lastEnd.slice(0, 8)}01`, to: lastEnd };
}

/** The slip as a printable page, in the shop's bill language. */
export const slipDoc = (s: PayoutSlip, lang: Parameters<typeof L>[0]): PackDoc => ({
  fileName: `commission-${s.ref}`,
  title: `${L(lang, 'Commission slip', 'کمیشن پرچی', 'Commission slip')} — ${s.staffName ?? ''}`,
  subtitle: s.ref,
  meta: [[L(lang, 'Date', 'تاریخ', 'Date'), dateOf(s.paidAt)], [L(lang, 'Amount', 'رقم', 'Amount'), formatMoney(s.amount)],
    ...(s.expense ? [[L(lang, 'Payment', 'ادائیگی', 'Payment'), s.expense.paymentMethod] as [string, string]] : [])],
  tables: [{
    columns: [L(lang, 'Date', 'تاریخ', 'Date'), L(lang, 'Bill', 'بل', 'Bill'), L(lang, 'Service', 'سروس', 'Service'), L(lang, 'Commission', 'کمیشن', 'Commission')],
    rows: s.lines.map((l) => [dateOf(l.at), l.saleNumber ?? l.appointmentNumber, l.serviceName, formatMoney(l.commission)]),
    foot: ['', '', L(lang, 'Total', 'کل', 'Kul'), formatMoney(s.amount)],
  }],
  notes: [L(lang, 'Stylist signature: ____________________', 'اسٹائلسٹ کے دستخط: ____________________', 'Stylist ka dastakhat: ____________________')],
});

export function CommissionScreen() {
  const th = useTheme();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const can = usePermission();
  const canPay = can(P.COMMISSION_MANAGE) && can(P.EXPENSES_CREATE);
  const { guard } = useDeskOnline('salonDesk');
  const [period, setPeriod] = useState<Period>('month');
  const [tab, setTab] = useState<Tab>('owed');
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const [paying, setPaying] = useState(false);
  const [method, setMethod] = useState('CASH');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [slip, setSlip] = useState<PayoutSlip | null>(null);
  const r = range(period);
  const people = useQuery({ queryKey: [SALON_KEYS.staff, 'all'], queryFn: () => salonApi.staff.list() });
  const com = useQuery({ queryKey: [SALON_KEYS.commission, id, r.from, r.to], queryFn: () => salonApi.staff.commission({ ...r, staffProfileId: id }) });
  const payouts = useQuery({ queryKey: [SALON_KEYS.commission, 'payouts', id], queryFn: () => salonApi.staff.payouts(id) });
  const me = com.data?.staff[0];
  const lines = com.data?.lines ?? [];
  const owed = useMemo(() => lines.filter((l) => !l.paidAt && !l.returned && l.commission > 0), [lines]);
  const chosen = picked ?? new Set(owed.map((l) => l.id));
  const chosenLines = owed.filter((l) => chosen.has(l.id));
  const amount = chosenLines.reduce((s, l) => s + l.commission, 0);
  const person = people.data?.find((p) => p.id === id);
  const name = person ? staffName(person) : me?.name ?? t('Stylist');
  const toggle = (k: string) => setPicked(() => { const n = new Set(chosen); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const pay = async () => {
    setBusy(true);
    try {
      const s = await salonApi.staff.payout({ staffProfileId: id, ...r, lineIds: chosenLines.length === owed.length ? undefined : chosenLines.map((l) => l.id), paymentMethod: method, note: note.trim() || undefined });
      refreshSalon([SALON_KEYS.commission], true);
      toast.success(t('Commission de di'), { message: s.ref });
      setPaying(false); setPicked(null); setSlip(s);
    } catch (e) { toast.error(errorText(e, t('Nahi hua'))); } finally { setBusy(false); }
  };
  const openSlip = async (ref: string) => { try { setSlip(await salonApi.staff.slip(ref)); } catch (e) { toast.error(errorText(e, t('Slip nahi khuli'))); } };
  const shown = tab === 'all' ? lines : owed;
  return (
    <Screen title={name} subtitle={t('Commission')} onRefresh={() => { void com.refetch(); void payouts.refetch(); }} refreshing={com.isRefetching}
      footer={canPay && tab === 'owed' && amount > 0 ? <Button fullWidth size="lg" icon={Banknote} onPress={() => guard(() => setPaying(true))}>{t('Dein {{amount}}', { amount: formatMoney(amount) })}</Button> : undefined}>
      <View style={{ gap: th.space(3) }}>
        <Segmented value={period} onChange={(v) => { setPeriod(v as Period); setPicked(null); }} options={[{ value: 'month', label: t('Is mahine') }, { value: 'last', label: t('Pichla mahina') }, { value: 'days30', label: t('30 din') }]} />
        <KpiStrip items={[
          { key: 'net', label: t('Banti'), value: formatMoney(me?.net ?? 0) },
          { key: 'paid', label: t('Di ja chuki'), value: formatMoney(me?.paid ?? 0) },
          { key: 'unpaid', label: t('Baqi'), value: formatMoney(me?.unpaid ?? 0), tone: (me?.unpaid ?? 0) > 0 ? 'warning' : undefined },
        ]} />
        {!!me?.paidThenReturned && <Text size="xs" tone="danger">{t('Di gayi, phir wapas')}: {formatMoney(me.paidThenReturned)}</Text>}
        <Segmented value={tab} onChange={(v) => setTab(v as Tab)} options={[{ value: 'owed', label: `${t('Baqi')} ${owed.length}` }, { value: 'all', label: `${t('Sab')} ${lines.length}` }, { value: 'payouts', label: `${t('Payouts')} ${payouts.data?.length ?? 0}` }]} />
        {tab === 'payouts' ? (
          !payouts.data?.length ? <EmptyState icon={History} title={t('Abhi koi payout nahi')} /> : (
            <View>{payouts.data.map((p) => <ListRow key={p.ref} icon={FileText} divider chevron onPress={() => void openSlip(p.ref)} title={p.ref} subtitle={`${dateOf(p.paidAt)} · ${t('{{n}} services', { n: p.services })}`}
              trailing={<View style={{ alignItems: 'flex-end', gap: 2 }}><Amount value={p.amount} weight="bold" />{p.expense?.status === 'CANCELLED' && <Badge tone="danger">{t('Expense cancel')}</Badge>}</View>} />)}</View>
          )
        ) : shown.length === 0 ? <EmptyState icon={Banknote} title={t('Koi commission baqi nahi')} /> : (
          <View>
            {shown.map((l) => {
              const isOwed = !l.paidAt && !l.returned && l.commission > 0;
              return (
                <View key={l.id} style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
                  {canPay && isOwed && <Checkbox value={chosen.has(l.id)} onChange={() => toggle(l.id)} />}
                  <View style={{ flex: 1 }}>
                    <ListRow divider title={l.serviceName} subtitle={`${dateOf(l.at)} · ${l.saleNumber}${l.customerName ? ` · ${l.customerName}` : ''}`}
                      trailing={<View style={{ alignItems: 'flex-end', gap: 2 }}><Amount value={l.commission} weight="bold" />
                        {l.returned ? <Badge tone="danger">{t('Wapas')}</Badge> : l.paidAt ? <Badge tone="success">{ltr(l.payoutRef ?? t('Di gayi'))}</Badge> : <Badge tone="warning">{t('Baqi')}</Badge>}</View>}
                      onPress={l.payoutRef ? () => void openSlip(l.payoutRef!) : undefined} />
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
      <Sheet open={paying} onClose={() => setPaying(false)} title={t('{{name}} ko {{amount}} dein', { name, amount: formatMoney(amount) })} description={t('{{n}} services', { n: chosenLines.length })}
        footer={<Button fullWidth size="lg" variant="success" loading={busy} onPress={() => void pay()}>{t('Dein {{amount}}', { amount: formatMoney(amount) })}</Button>}>
        <View style={{ gap: th.space(3) }}>
          <Text size="sm" weight="semibold" tone="secondary">{t('Kahan se diya')}</Text>
          <MethodChips value={method} onChange={setMethod} />
          <Input label={t('Note')} value={note} onChangeText={setNote} />
          <Text size="xs" tone="muted">{t('Ye Expenses me "Staff commission" ke naam se likha jata hai aur profit me kharcha ginta hai.')}</Text>
        </View>
      </Sheet>
      <Sheet open={!!slip} onClose={() => setSlip(null)} title={slip ? t('Slip {{ref}}', { ref: slip.ref }) : undefined} description={slip ? `${slip.staffName ?? ''} · ${dateOf(slip.paidAt)} · ${formatMoney(slip.amount)}` : undefined}
        footer={slip ? <View style={{ alignItems: 'center' }}><DocActions build={(lang) => slipDoc(slip, lang)} /></View> : undefined}>
        {slip?.lines.map((l) => <ListRow key={l.id} dense title={l.serviceName} subtitle={`${dateOf(l.at)} · ${l.saleNumber ?? l.appointmentNumber}`} trailing={<Amount value={l.commission} />} />)}
      </Sheet>
    </Screen>
  );
}
