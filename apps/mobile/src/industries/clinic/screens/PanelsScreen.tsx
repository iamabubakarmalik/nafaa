/** Panels (web PanelsPage): companies that pay for their people's visits, with the limit and what they owe; add and edit. */

import { Building2 } from 'lucide-react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, toast } from '@/design';
import { useDeskOnline } from '../../_shared/deskKit';
import { DeskList, FormSheet } from '../../_shared/serviceKit';
import { clinicApi, type Panel } from '../api';
import { CLINIC_KEYS, refreshClinic } from '../meta';

export function PanelsScreen() {
  const edit = usePermission()(P.CUSTOMERS_EDIT);
  const { guard } = useDeskOnline('clinicDesk');
  const [form, setForm] = useState<Panel | 'new' | null>(null);
  return (
    <DeskList<{ items: Panel[] }> title={t('Panels')} queryKey={[CLINIC_KEYS.panels]} fetch={() => clinicApi.panels.list()} feature="clinicDesk" emptyIcon={Building2} empty={t('Abhi koi panel nahi')}
      rows={(d) => d.items.map((p) => ({
        id: p.id, icon: Building2, tone: p.isActive ? (p.creditLimit > 0 && p.balance > p.creditLimit ? 'danger' : 'accent') : 'neutral', search: p.name, title: p.name, subtitle: t('{{n}} mareez · Limit {{l}}', { n: p.patients, l: formatMoney(p.creditLimit) }),
        trailing: <Badge tone={p.balance > 0 ? 'warning' : 'neutral'}>{formatMoney(p.balance)}</Badge>, onPress: () => router.push({ pathname: '/clinic/panels/[id]', params: { id: p.id } } as never),
      }))}
      fab={edit ? { label: t('New'), onPress: () => guard(() => setForm('new')) } : undefined}>
      <FormSheet open={!!form} title={form === 'new' ? t('New panel') : t('Edit panel')} onClose={() => setForm(null)}
        fields={[{ key: 'name', label: t('Company ka naam'), required: true }, { key: 'creditLimit', label: t('Udhaar ki had'), kind: 'money' }, { key: 'isActive', label: t('Chalu'), kind: 'switch', when: () => form !== 'new' }]}
        initial={form && form !== 'new' ? { ...form } : { creditLimit: 0, isActive: true }}
        onSubmit={async (v) => { if (form === 'new') await clinicApi.panels.create({ name: v.name.trim(), creditLimit: v.creditLimit ?? 0 }); else await clinicApi.panels.update((form as Panel).id, { name: v.name.trim(), creditLimit: v.creditLimit ?? 0, isActive: !!v.isActive }); refreshClinic(); toast.success(t('Save ho gaya')); }} />
    </DeskList>
  );
}
