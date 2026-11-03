/** Prepaid packages (web PackagesPage): sessions sold up front; sell one to a customer and see what is left on each. */

import { BookmarkPlus } from 'lucide-react-native';
import { useState } from 'react';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, Segmented, Sheet, Text, confirm, toast } from '@/design';
import { DeskList, FormSheet, CustomerField, clean, type FormField, type PickedCustomer } from '../../_shared/serviceKit';
import { PaySheet, useDeskOnline } from '../../_shared/deskKit';
import { salonApi, type Package, type PackagePurchase } from '../api';
import { SALON_KEYS, dateOf, refreshSalon } from '../meta';

const fields: FormField[] = [
  { key: 'name', label: t('Naam'), required: true }, { key: 'price', label: t('Price'), kind: 'money', required: true }, { key: 'totalSessions', label: t('Sessions'), kind: 'number', required: true },
  { key: 'validityDays', label: t('Kitne din chalega'), kind: 'number', required: true }, { key: 'isFeatured', label: t('Khaas'), kind: 'switch' }, { key: 'isActive', label: t('Chalu'), kind: 'switch' },
];

export function PackagesScreen() {
  const can = usePermission();
  const { guard } = useDeskOnline('salonDesk');
  const [tab, setTab] = useState<'packages' | 'sold'>('packages');
  const [form, setForm] = useState<Package | 'new' | null>(null);
  const [sell, setSell] = useState<Package | null>(null);
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [pay, setPay] = useState(false);
  const seg = () => <Segmented value={tab} onChange={setTab} options={[{ value: 'packages', label: t('Packages') }, { value: 'sold', label: t('Bike hue') }]} />;
  const cancel = async (p: PackagePurchase) => {
    if (!(await confirm({ title: t('Package cancel karein?'), tone: 'danger', confirmLabel: t('Haan, cancel') }))) return;
    try { await salonApi.packages.cancel(p.id); refreshSalon([], true); toast.success(t('Cancel ho gaya')); } catch { toast.error(t('Nahi hua')); }
  };
  return (
    <>
      {tab === 'packages' ? (
        <DeskList<Package[]> title={t('Packages')} queryKey={[SALON_KEYS.packages, 'list']} fetch={() => salonApi.packages.list()} feature="salonDesk" emptyIcon={BookmarkPlus} empty={t('Abhi koi package nahi')} summary={seg}
          rows={(list) => list.map((p) => ({
            id: p.id, icon: BookmarkPlus, tone: p.isActive ? 'accent' : 'neutral', title: p.name, search: p.name, subtitle: t('{{n}} sessions · {{days}} din · {{sold}} bike', { n: p.totalSessions, days: p.validityDays, sold: p.totalSold }),
            trailing: <Text weight="bold" ltr>{formatMoney(p.price)}</Text>,
            onPress: () => guard(() => (can(P.POS_USE) && p.isActive ? (setCustomer(null), setSell(p)) : can(P.PRODUCTS_EDIT) ? setForm(p) : undefined)),
          }))}
          fab={can(P.PRODUCTS_EDIT) ? { label: t('New'), onPress: () => guard(() => setForm('new')) } : undefined} />
      ) : (
        <DeskList<PackagePurchase[]> title={t('Packages')} queryKey={[SALON_KEYS.packages, 'sold']} fetch={() => salonApi.packages.purchases()} feature="salonDesk" emptyIcon={BookmarkPlus} empty={t('Abhi koi package nahi bika')} summary={seg}
          rows={(list) => list.map((p) => ({
            id: p.id, icon: BookmarkPlus, tone: p.status === 'ACTIVE' ? 'success' : 'neutral', search: `${p.customer?.name} ${p.purchaseNumber} ${p.package?.name}`,
            title: p.customer?.name ?? '—', subtitle: `${p.package?.name ?? ''} · ${t('{{date}} tak', { date: dateOf(p.expiryDate) })}`,
            trailing: <Badge tone={p.status === 'ACTIVE' ? 'success' : 'neutral'}>{t('{{n}} baqi', { n: p.sessionsRemaining })}</Badge>,
            onPress: p.status === 'ACTIVE' && can(P.POS_USE) ? () => guard(() => void cancel(p)) : undefined,
          }))} />
      )}
      <FormSheet open={!!form} title={form === 'new' ? t('New package') : t('Edit package')} fields={fields} initial={form && form !== 'new' ? { ...form } : { totalSessions: 5, validityDays: 90, isActive: true }}
        onSubmit={async (v) => { const b = clean({ ...v, services: (form !== 'new' && form?.services) || [], isFeatured: !!v.isFeatured, isActive: v.isActive ?? true }); if (form === 'new') await salonApi.packages.create(b); else await salonApi.packages.update((form as Package).id, b); refreshSalon(); toast.success(t('Save ho gaya')); }}
        onClose={() => setForm(null)} />
      <Sheet open={!!sell && !pay} onClose={() => setSell(null)} title={sell?.name} description={sell ? formatMoney(sell.price) : undefined}
        footer={<Button fullWidth size="lg" disabled={!customer} onPress={() => setPay(true)}>{t('Aage')}</Button>}>
        <CustomerField value={customer} onChange={setCustomer} />
      </Sheet>
      <PaySheet open={!!sell && pay} onClose={() => { setPay(false); setSell(null); }} title={t('Package bechein')} name={customer?.name ?? ''} due={sell?.price ?? 0} cta={t('Bechein')}
        onConfirm={async (p) => { await salonApi.packages.purchase({ packageId: sell!.id, customerId: customer!.id, amountPaid: p.paidAmount, paymentMethod: p.paymentMethod }); refreshSalon([], true); toast.success(t('Package bik gaya')); setPay(false); }} />
    </>
  );
}
