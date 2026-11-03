/** Membership plans (web PlansPage): price, days, admission fee and freeze rules; add and edit. */

import { Target } from 'lucide-react-native';
import { useState } from 'react';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, toast } from '@/design';
import { DeskList, FormSheet, clean, type FormField } from '../../_shared/serviceKit';
import { useDeskOnline } from '../../_shared/deskKit';
import { gymApi, type MembershipPlan } from '../api';
import { GYM_KEYS, planDays, planTypeOptions, refreshGym } from '../meta';

const fields = (): FormField[] => [
  { key: 'name', label: t('Naam'), required: true }, { key: 'planType', label: t('Type'), kind: 'select', options: planTypeOptions(), required: true },
  { key: 'price', label: t('Fee'), kind: 'money', required: true }, { key: 'durationDays', label: t('Din'), kind: 'number', required: true },
  { key: 'registrationFee', label: t('Admission fee'), kind: 'money' }, { key: 'allowFreeze', label: t('Freeze ki ijazat'), kind: 'switch' },
  { key: 'maxFreezeDays', label: t('Zyada se zyada freeze din'), kind: 'number', when: (v) => !!v.allowFreeze }, { key: 'freezeFee', label: t('Freeze fee'), kind: 'money', when: (v) => !!v.allowFreeze },
  { key: 'includesPersonalTraining', label: t('Personal training shamil'), kind: 'switch' }, { key: 'includesClasses', label: t('Classes shamil'), kind: 'switch' },
  { key: 'isFeatured', label: t('Khaas'), kind: 'switch' }, { key: 'isActive', label: t('Chalu'), kind: 'switch' },
];

export function PlansScreen() {
  const canEdit = usePermission()(P.PRODUCTS_EDIT);
  const { guard } = useDeskOnline('gymDesk');
  const [form, setForm] = useState<MembershipPlan | 'new' | null>(null);
  const save = async (v: Record<string, any>) => {
    const body = clean({ ...v, price: v.price ?? 0, registrationFee: v.registrationFee ?? 0, durationDays: v.durationDays ?? planDays[v.planType] ?? 30, maxFreezeDays: v.allowFreeze ? v.maxFreezeDays ?? 0 : 0, freezeFee: v.allowFreeze ? v.freezeFee ?? 0 : 0, allowFreeze: !!v.allowFreeze, includesPersonalTraining: !!v.includesPersonalTraining, includesClasses: !!v.includesClasses, isFeatured: !!v.isFeatured, isActive: v.isActive ?? true, isUnlimited: v.isUnlimited ?? true });
    if (form === 'new') await gymApi.plans.create(body); else await gymApi.plans.update((form as MembershipPlan).id, body);
    refreshGym(); toast.success(t('Save ho gaya'));
  };
  return (
    <DeskList<MembershipPlan[]> title={t('Plans')} queryKey={[GYM_KEYS.plans, 'all']} fetch={() => gymApi.plans.list()} feature="gymDesk" emptyIcon={Target} empty={t('Abhi koi plan nahi')}
      rows={(list) => list.map((p) => ({
        id: p.id, icon: Target, tone: p.isActive ? 'accent' : 'neutral', search: p.name, title: p.name,
        subtitle: t('{{days}} din · {{n}} members{{adm}}', { days: p.durationDays, n: p.totalSubscribers, adm: p.registrationFee > 0 ? ` · ${t('Admission')} ${formatMoney(p.registrationFee)}` : '' }),
        trailing: <Badge tone={p.isActive ? 'success' : 'neutral'}>{formatMoney(p.price)}</Badge>, onPress: canEdit ? () => guard(() => setForm(p)) : undefined,
      }))}
      fab={canEdit ? { label: t('New plan'), onPress: () => guard(() => setForm('new')) } : undefined}>
      <FormSheet open={!!form} title={form === 'new' ? t('New plan') : t('Edit plan')} fields={fields()} initial={form && form !== 'new' ? { ...form } : { planType: 'MONTHLY', durationDays: 30, isActive: true, allowFreeze: true, maxFreezeDays: 15 }}
        onSubmit={save} onClose={() => setForm(null)} />
    </DeskList>
  );
}
