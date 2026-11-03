/** Gift vouchers (web GiftVouchersPage): sell a voucher for an amount, see balances, cancel an unused one. The counter takes a code at checkout. */

import { Gift } from 'lucide-react-native';
import { useState } from 'react';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, Sheet, StatTile, Row, MoneyInput, confirm, toast } from '@/design';
import { DeskList, CustomerField, type PickedCustomer } from '../../_shared/serviceKit';
import { PaySheet, useDeskOnline } from '../../_shared/deskKit';
import { salonApi, type GiftVoucher } from '../api';
import { SALON_KEYS, dateOf, refreshSalon } from '../meta';

export function VouchersScreen() {
  const can = usePermission()(P.POS_USE);
  const { guard } = useDeskOnline('salonDesk');
  const [sell, setSell] = useState(false);
  const [amount, setAmount] = useState<number | null>(null);
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [pay, setPay] = useState(false);
  const cancel = async (v: GiftVoucher) => {
    if (!(await confirm({ title: t('Voucher cancel karein?'), tone: 'danger', confirmLabel: t('Haan, cancel') }))) return;
    try { await salonApi.vouchers.cancel(v.id); refreshSalon([], true); toast.success(t('Cancel ho gaya')); } catch { toast.error(t('Nahi hua')); }
  };
  return (
    <DeskList<{ items: GiftVoucher[]; totals: { active: number; balance: number; sold: number } }> title={t('Gift vouchers')} queryKey={[SALON_KEYS.vouchers]} fetch={() => salonApi.vouchers.list()} feature="salonDesk" emptyIcon={Gift} empty={t('Abhi koi voucher nahi')}
      searchPlaceholder={t('Code ya naam')}
      summary={(d) => d && <Row gap={2}><StatTile style={{ flex: 1, minWidth: 0 }} label={t('Chalu')} value={String(d.totals.active)} /><StatTile style={{ flex: 1, minWidth: 0 }} label={t('Baqi rakam')} value={formatMoney(d.totals.balance)} /></Row>}
      rows={(d) => d.items.map((v) => ({
        id: v.id, icon: Gift, tone: v.status === 'ACTIVE' ? 'success' : 'neutral', search: `${v.code} ${v.customer?.name ?? ''}`,
        title: v.code, subtitle: `${v.customer?.name ?? t('Walk-in customer')}${v.expiryDate ? ` · ${t('{{date}} tak', { date: dateOf(v.expiryDate) })}` : ''}`,
        trailing: <Badge tone={v.status === 'ACTIVE' ? 'success' : 'neutral'}>{`${formatMoney(v.balance)} / ${formatMoney(v.amount)}`}</Badge>,
        onPress: v.status === 'ACTIVE' && can && v.used === 0 ? () => guard(() => void cancel(v)) : undefined,
      }))}
      fab={can ? { label: t('Sell voucher'), onPress: () => guard(() => { setAmount(null); setCustomer(null); setSell(true); }) } : undefined}>
      <Sheet open={sell && !pay} onClose={() => setSell(false)} title={t('Sell voucher')} footer={<Button fullWidth size="lg" disabled={!amount} onPress={() => setPay(true)}>{t('Aage')}</Button>}>
        <MoneyInput label={t('Rakam')} value={amount} onChangeValue={setAmount} size="xl" />
        <CustomerField value={customer} onChange={setCustomer} optional label={t('Customer (marzi)')} />
      </Sheet>
      <PaySheet open={sell && pay} onClose={() => { setPay(false); setSell(false); }} title={t('Sell voucher')} name={customer?.name ?? t('Walk-in customer')} due={amount ?? 0} allowPart={false} cta={t('Bechein')}
        onConfirm={async (p) => { const v = await salonApi.vouchers.sell({ amount: amount!, customerId: customer?.id, paymentMethod: p.paymentMethod }); refreshSalon([], true); toast.success(t('Voucher ban gaya'), { message: v.code }); setPay(false); }} />
    </DeskList>
  );
}
