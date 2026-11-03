/** Salon memberships (web MembershipsPage): plans with the discount they give, and who holds one; subscribe a customer and cancel. */

import { Award } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Segmented, Sheet, Button, DetailRow, Text, confirm, toast } from '@/design';
import { daysLeft } from '@nafaa/core/industries/salon';
import { DeskList, FormSheet, CustomerField, clean, type FormField, type PickedCustomer } from '../../_shared/serviceKit';
import { PaySheet, todayKey, useDeskOnline } from '../../_shared/deskKit';
import { DocActions, L, type PackDoc } from '../../_shared/docKit';
import { salonApi, type Membership, type MembershipPlan } from '../api';
import { SALON_KEYS, dateOf, refreshSalon, tierOptions } from '../meta';

const cardDoc = (m: Membership, lang: Parameters<typeof L>[0]): PackDoc => ({
  fileName: `membership-${m.membershipNumber}`,
  title: L(lang, 'Membership card', 'ممبرشپ کارڈ', 'Membership card'),
  subtitle: m.membershipNumber,
  meta: [[L(lang, 'Member', 'ممبر', 'Member'), m.customer?.name ?? '—'], [L(lang, 'Plan', 'پلان', 'Plan'), `${m.plan?.name ?? ''}${m.plan ? ` · ${m.plan.tier}` : ''}`]],
  rows: [[L(lang, 'Discount on services', 'سروسز پر ڈسکاؤنٹ', 'Services par Discount'), `${m.plan?.discountPct ?? 0}%`], [L(lang, 'Valid from', 'شروع', 'Shuru'), dateOf(m.startDate)], [L(lang, 'Valid till', 'ختم', 'Khatam'), dateOf(m.expiryDate)]],
  notes: [L(lang, 'Show this card or your phone number at the counter.', 'کاؤنٹر پر یہ کارڈ یا اپنا فون نمبر بتائیں۔', 'Counter par ye card ya apna phone number batayein.')],
});

export function MembershipsScreen() {
  const canSell = usePermission()(P.POS_USE);
  const canSetup = usePermission()(P.PRODUCTS_EDIT);
  const { guard } = useDeskOnline('salonDesk');
  const [tab, setTab] = useState<'members' | 'plans'>('members');
  const [plan, setPlan] = useState<MembershipPlan | 'new' | null>(null);
  const [sell, setSell] = useState<MembershipPlan | null>(null);
  const [open, setOpen] = useState<Membership | null>(null);
  const fields: FormField[] = [
    { key: 'name', label: t('Naam'), required: true }, { key: 'tier', label: t('Tier'), kind: 'select', options: tierOptions(), required: true },
    { key: 'price', label: t('Price'), kind: 'money', required: true }, { key: 'durationDays', label: t('Din'), kind: 'number', required: true },
    { key: 'discountPct', label: t('Services par Discount %'), kind: 'number' }, { key: 'priorityBooking', label: t('Pehle booking'), kind: 'switch' }, { key: 'isActive', label: t('Chalu'), kind: 'switch' },
  ];
  const cancel = async (m: Membership) => {
    if (!(await confirm({ title: t('Membership cancel karein?'), tone: 'danger', confirmLabel: t('Haan, cancel') }))) return;
    try { await salonApi.memberships.cancel(m.id); refreshSalon(); setOpen(null); toast.success(t('Cancel ho gayi')); } catch { toast.error(t('Nahi hua')); }
  };
  return (
    <>
      {tab === 'members' ? (
        <DeskList<Membership[]> title={t('Memberships')} queryKey={[SALON_KEYS.memberships, 'list']} fetch={() => salonApi.memberships.list()} feature="salonDesk" emptyIcon={Award} empty={t('Abhi koi member nahi')}
          summary={() => <Segmented value={tab} onChange={setTab} options={[{ value: 'members', label: t('Members') }, { value: 'plans', label: t('Plans') }]} />}
          rows={(list) => list.map((m) => ({
            id: m.id, icon: Award, tone: m.status === 'ACTIVE' ? 'success' : 'neutral', search: `${m.customer?.name} ${m.membershipNumber} ${m.customer?.phone}`,
            title: m.customer?.name ?? '—', subtitle: `${m.plan?.name ?? ''} · ${t('{{date}} tak', { date: dateOf(m.expiryDate) })}`,
            trailing: <Badge tone={m.status === 'ACTIVE' ? ((daysLeft(m.expiryDate, todayKey()) ?? 99) <= 15 ? 'warning' : 'success') : 'neutral'}>{m.status === 'ACTIVE' ? `${m.plan?.discountPct ?? 0}%` : m.status}</Badge>,
            onPress: () => setOpen(m),
          }))} />
      ) : (
        <DeskList<MembershipPlan[]> title={t('Plans')} queryKey={[SALON_KEYS.plans]} fetch={() => salonApi.memberships.plans()} feature="salonDesk" emptyIcon={Award} empty={t('Abhi koi plan nahi')}
          summary={() => <Segmented value={tab} onChange={setTab} options={[{ value: 'members', label: t('Members') }, { value: 'plans', label: t('Plans') }]} />}
          rows={(list) => list.map((p) => ({
            id: p.id, icon: Award, tone: p.isActive ? 'accent' : 'neutral', title: p.name, search: p.name,
            subtitle: t('{{pct}}% Discount · {{days}} din · {{n}} members', { pct: p.discountPct, days: p.durationDays, n: p.totalSubscribers }), trailing: <Text weight="bold" ltr>{formatMoney(p.price)}</Text>,
            onPress: () => (canSell && p.isActive ? guard(() => setSell(p)) : canSetup ? guard(() => setPlan(p)) : undefined),
          }))}
          fab={canSetup ? { label: t('New plan'), onPress: () => guard(() => setPlan('new')) } : undefined} />
      )}
      <FormSheet open={!!plan} title={plan === 'new' ? t('New plan') : t('Edit plan')} fields={fields} initial={plan && plan !== 'new' ? { ...plan } : { tier: 'GOLD', durationDays: 365, isActive: true }}
        onSubmit={async (v) => { const b = clean({ ...v, benefits: (plan !== 'new' && plan?.benefits) || [], discountPct: v.discountPct ?? 0, priorityBooking: !!v.priorityBooking, isActive: v.isActive ?? true }); if (plan === 'new') await salonApi.memberships.createPlan(b as any); else await salonApi.memberships.updatePlan((plan as MembershipPlan).id, b as any); refreshSalon(); toast.success(t('Save ho gaya')); }}
        onClose={() => setPlan(null)} />
      <SellMembership plan={sell} onClose={() => setSell(null)} />
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.customer?.name} description={open?.membershipNumber}
        footer={open ? <View style={{ gap: 8, alignItems: 'center' }}>
          <DocActions phone={open.customer?.phone} build={(lang) => cardDoc(open, lang)} />
          {open.status === 'ACTIVE' && canSell && <Button variant="secondary" fullWidth onPress={() => guard(() => void cancel(open))}>{t('Cancel')}</Button>}
        </View> : undefined}>
        {open && <>
          <DetailRow label={t('Plan')} value={open.plan?.name ?? '—'} /><DetailRow label={t('Shuru')} value={dateOf(open.startDate)} /><DetailRow label={t('Khatam')} value={dateOf(open.expiryDate)} />
          <DetailRow label={t('Diye')} value={<Text ltr>{formatMoney(open.amountPaid)}</Text>} /><DetailRow label={t('Bachat')} value={<Text ltr>{formatMoney(open.totalSaved)}</Text>} last />
        </>}
      </Sheet>
    </>
  );
}

function SellMembership({ plan, onClose }: { plan: MembershipPlan | null; onClose: () => void }) {
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [pay, setPay] = useState(false);
  return (
    <>
      <Sheet open={!!plan && !pay} onClose={onClose} title={plan?.name} description={plan ? formatMoney(plan.price) : undefined}
        footer={<Button fullWidth size="lg" disabled={!customer} onPress={() => setPay(true)}>{t('Aage')}</Button>}>
        <CustomerField value={customer} onChange={setCustomer} />
      </Sheet>
      <PaySheet open={!!plan && pay} onClose={() => { setPay(false); onClose(); }} title={t('Membership bechein')} name={customer?.name ?? ''} due={plan?.price ?? 0} cta={t('Bechein')}
        onConfirm={async (p) => { await salonApi.memberships.subscribe({ planId: plan!.id, customerId: customer!.id, amountPaid: p.paidAmount, paymentMethod: p.paymentMethod }); refreshSalon([], true); toast.success(t('Membership ban gayi')); setPay(false); }} />
    </>
  );
}
