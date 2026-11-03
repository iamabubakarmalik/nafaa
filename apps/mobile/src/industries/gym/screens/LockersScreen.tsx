/** Lockers (web LockersPage): free, taken and due lockers; give one to a member with rent for some months, renew rent, release, bill all due. */

import { KeyRound } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, MoneyInput, Row, Sheet, Text, confirm, toast } from '@/design';
import { DeskList, FormSheet } from '../../_shared/serviceKit';
import { PaySheet, errorText, useDeskOnline } from '../../_shared/deskKit';
import { gymApi, type GymLocker, type GymMember } from '../api';
import { MemberField } from '../components/MemberField';
import { GYM_KEYS, dateOf, refreshGym } from '../meta';

export function LockersScreen() {
  const can = usePermission();
  const edit = can(P.CUSTOMERS_EDIT);
  const bill = can(P.POS_USE);
  const { guard } = useDeskOnline('gymDesk');
  const [open, setOpen] = useState<GymLocker | null>(null);
  const [add, setAdd] = useState(false);
  const [member, setMember] = useState<GymMember | null>(null);
  const [months, setMonths] = useState<number | null>(1);
  const [pay, setPay] = useState(false);
  const rent = (open?.monthlyRent ?? 0) * (months ?? 0);
  const run = async (fn: () => Promise<unknown>) => { try { await fn(); refreshGym(true); setOpen(null); setPay(false); } catch (e) { toast.error(errorText(e, t('Nahi hua'))); } };
  return (
    <DeskList<{ items: GymLocker[]; counts: Record<string, number>; totals: { monthlyRent: number } }> title={t('Lockers')} queryKey={[GYM_KEYS.lockers]} fetch={() => gymApi.lockers.list()} feature="gymDesk" emptyIcon={KeyRound} empty={t('Abhi koi locker nahi')}
      filters={[{ value: 'all', label: t('Sab') }, { value: 'free', label: t('Khali') }, { value: 'taken', label: t('Liye hue') }, { value: 'due', label: t('Rent baqi') }]}
      summary={(d) => bill && d && (d.counts.due ?? 0) > 0 ? <Button variant="soft" onPress={() => guard(() => void run(() => gymApi.lockers.billDue()).then(() => toast.success(t('Rent bill ho gaya'))))}>{t('Baqi rent bill karein ({{n}})', { n: d.counts.due })}</Button> : null}
      rows={(d) => d.items.map((l) => ({
        id: l.id, icon: KeyRound, tone: l.status === 'FREE' ? 'success' : l.due ? 'warning' : l.status === 'MAINTENANCE' ? 'neutral' : 'info', search: `${l.number} ${l.member?.customer?.name ?? ''}`, filter: l.status === 'FREE' ? 'free' : l.due ? 'due' : 'taken',
        title: `${t('Locker')} ${l.number}`, subtitle: l.member ? `${l.member.customer?.name ?? l.member.memberNumber} · ${t('{{date}} tak', { date: dateOf(l.endDate) })}` : l.status === 'FREE' ? t('Khali') : t('Maintenance'),
        trailing: <Badge tone={l.due ? 'warning' : 'neutral'}>{formatMoney(l.monthlyRent)}</Badge>, onPress: edit || bill ? () => { setMember(null); setMonths(1); setOpen(l); } : undefined,
      }))}
      fab={edit ? { label: t('New'), onPress: () => guard(() => setAdd(true)) } : undefined}>
      <Sheet open={!!open && !pay} onClose={() => setOpen(null)} title={`${t('Locker')} ${open?.number ?? ''}`} description={open ? t('Rent {{amount}} / mahina', { amount: formatMoney(open.monthlyRent) }) : undefined}
        footer={open ? (
          open.status === 'FREE' ? <Button fullWidth size="lg" disabled={!member || !months} onPress={() => guard(() => setPay(true))}>{t('Aage')}</Button>
            : <Row gap={2}><Button style={{ flex: 1 }} disabled={!months} onPress={() => guard(() => setPay(true))}>{t('Rent barhayein')}</Button>
              <Button variant="secondary" onPress={() => guard(() => void confirm({ title: t('Locker khali karein?'), confirmLabel: t('Haan') }).then(async (ok) => { if (ok) await run(() => gymApi.lockers.release(open.id)); }))}>{t('Khali')}</Button></Row>
        ) : undefined}>
        <View style={{ gap: 12 }}>
          {open?.status === 'FREE' && <MemberField value={member} onChange={setMember} />}
          <MoneyInput label={t('Kitne mahine')} value={months} onChangeValue={setMonths} decimals={false} />
          <Text weight="bold" ltr>{formatMoney(rent)}</Text>
        </View>
      </Sheet>
      <PaySheet open={!!open && pay} onClose={() => setPay(false)} title={t('Locker rent')} name={member?.customer?.name ?? open?.member?.customer?.name ?? ''} due={rent} cta={t('Rent lein')}
        onConfirm={async (p) => { const body = { months: months ?? 1, paidAmount: p.paidAmount, paymentMethod: p.paymentMethod }; if (open!.status === 'FREE') await gymApi.lockers.assign(open!.id, { memberId: member!.id, ...body }); else await gymApi.lockers.rent(open!.id, body); refreshGym(true); setOpen(null); toast.success(t('Ho gaya')); }} />
      <FormSheet open={add} title={t('New locker')} onClose={() => setAdd(false)} fields={[{ key: 'number', label: t('Number (ya shuruaati number)'), required: true }, { key: 'count', label: t('Kitne lockers'), kind: 'number' }, { key: 'monthlyRent', label: t('Rent / mahina'), kind: 'money', required: true }]} initial={{ count: 1 }}
        onSubmit={async (v) => { await gymApi.lockers.create({ number: v.number, monthlyRent: v.monthlyRent ?? 0, count: v.count ?? 1 }); refreshGym(); toast.success(t('Locker ban gaye')); }} />
    </DeskList>
  );
}
