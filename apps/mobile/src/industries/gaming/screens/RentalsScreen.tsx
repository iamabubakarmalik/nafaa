/** Rentals (web GamingRentalsPage): consoles and gear given out by the day with a deposit; give one out, take it back with late or damage fee. */

import { PackageOpen } from 'lucide-react-native';
import { useState } from 'react';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, StatTile, Row, toast } from '@/design';
import { PaySheet, shiftKey, todayKey, useDeskOnline } from '../../_shared/deskKit';
import { DeskList, FormSheet, clean } from '../../_shared/serviceKit';
import { gamingApi, type GamingRental, type RentalSummary } from '../api';
import { GAMING_KEYS, RENTAL_STATUS, dateOf, refreshGaming } from '../meta';

export function RentalsScreen() {
  const manage = usePermission()(P.POS_USE);
  const { guard } = useDeskOnline('gamingDesk');
  const [form, setForm] = useState(false);
  const [back, setBack] = useState<GamingRental | null>(null);
  const [fees, setFees] = useState<{ lateFee: number; damageFee: number } | null>(null);
  const finish = async (paid: number, method: string) => { await gamingApi.rentals.returnRental(back!.id, { lateFee: fees?.lateFee || undefined, damageFee: fees?.damageFee || undefined, paidAmount: paid, paymentMethod: method }); refreshGaming(true); toast.success(t('Wapas le liya')); setFees(null); setBack(null); };
  const owed = back ? Math.max(back.remainingAmount + (fees?.lateFee ?? 0) + (fees?.damageFee ?? 0), 0) : 0;
  return (
    <DeskList<{ items: GamingRental[]; sum?: RentalSummary }> title={t('Rentals')} queryKey={[GAMING_KEYS.rentals]} fetch={async () => ({ ...(await gamingApi.rentals.page({ page: 1, limit: 80 })), sum: await gamingApi.rentals.summary().catch(() => undefined) })} feature="gamingDesk" emptyIcon={PackageOpen} empty={t('Abhi koi rental nahi')}
      filters={[{ value: 'all', label: t('Sab') }, { value: 'ACTIVE', label: t('Chal rahe') }, { value: 'OVERDUE', label: t('Der') }, { value: 'RETURNED', label: t('Wapas') }]}
      summary={(d) => d?.sum && <Row gap={2}><StatTile style={{ flex: 1, minWidth: 0 }} label={t('Rental par')} value={String(d.sum.active)} /><StatTile style={{ flex: 1, minWidth: 0 }} label={t('Der')} value={String(d.sum.overdue)} /><StatTile style={{ flex: 1, minWidth: 0 }} label={t('Deposit')} value={formatMoney(d.sum.depositsHeld)} /></Row>}
      rows={(d) => d.items.map((r) => ({
        id: r.id, icon: PackageOpen, tone: RENTAL_STATUS[r.status]?.tone ?? 'neutral', filter: r.status, search: `${r.customerName} ${r.productName} ${r.rentalNumber}`, title: `${r.productName} · ${r.customerName}`,
        subtitle: `${dateOf(r.rentalStartDate)} → ${dateOf(r.rentalEndDate)}${r.remainingAmount > 0 ? ` · ${t('Baqi')} ${formatMoney(r.remainingAmount)}` : ''}`, trailing: <Badge tone={RENTAL_STATUS[r.status]?.tone ?? 'neutral'}>{t(RENTAL_STATUS[r.status]?.label ?? r.status)}</Badge>,
        onPress: manage && ['ACTIVE', 'OVERDUE'].includes(r.status) ? () => guard(() => { setFees(null); setBack(r); }) : undefined,
      }))}
      fab={manage ? { label: t('New rental'), onPress: () => guard(() => setForm(true)) } : undefined}>
      <FormSheet open={form} title={t('New rental')} onClose={() => setForm(false)}
        fields={[{ key: 'customerName', label: t('Customer'), required: true }, { key: 'customerPhone', label: t('Phone'), kind: 'phone' }, { key: 'productName', label: t('Kya de rahe hain'), required: true }, { key: 'serialNumber', label: t('Serial') }, { key: 'daysRented', label: t('Din'), kind: 'number', required: true }, { key: 'pricePerDay', label: t('Rate / din'), kind: 'money', required: true }, { key: 'depositAmount', label: t('Deposit'), kind: 'money' }, { key: 'paidAmount', label: t('Abhi mile'), kind: 'money' }]}
        initial={{ daysRented: 1 }}
        onSubmit={async (v) => { const days = v.daysRented ?? 1; await gamingApi.rentals.create(clean({ ...v, daysRented: days, pricePerDay: v.pricePerDay ?? 0, rentalStartDate: todayKey(), rentalEndDate: shiftKey(todayKey(), days), depositAmount: v.depositAmount ?? 0, paidAmount: v.paidAmount ?? 0, paymentMethod: 'CASH' })); refreshGaming(true); toast.success(t('Rental likh liya')); }} />
      <FormSheet open={!!back && !fees} title={t('Wapas lein')} description={back ? `${back.productName} · ${back.customerName}` : undefined} onClose={() => setBack(null)} submitLabel={t('Aage')}
        fields={[{ key: 'lateFee', label: t('Late fee'), kind: 'money' }, { key: 'damageFee', label: t('Nuqsan ki fee'), kind: 'money' }]}
        onSubmit={async (v) => setFees({ lateFee: v.lateFee ?? 0, damageFee: v.damageFee ?? 0 })} />
      <PaySheet open={!!back && !!fees} onClose={() => { setFees(null); setBack(null); }} title={t('Baqi paisa')} name={back?.customerName ?? ''} due={owed} cta={t('Wapas lein')} onConfirm={async (p) => finish(p.paidAmount, p.paymentMethod)} />
    </DeskList>
  );
}
