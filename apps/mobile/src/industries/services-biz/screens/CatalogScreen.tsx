/** Service catalog (web CatalogPage): the rate list with visit charge, base charge and warranty days; add and edit. */

import { Package } from 'lucide-react-native';
import { useState } from 'react';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, toast } from '@/design';
import { useDeskOnline } from '../../_shared/deskKit';
import { DeskList, FormSheet, clean } from '../../_shared/serviceKit';
import { servicesApi, type CatalogItem } from '../api';
import { CATEGORIES, SB_KEYS, labelOf, opts, refreshServices } from '../meta';

export function CatalogScreen() {
  const edit = usePermission()(P.PRODUCTS_EDIT);
  const { guard } = useDeskOnline('servicesDesk');
  const [form, setForm] = useState<CatalogItem | 'new' | null>(null);
  return (
    <DeskList<CatalogItem[]> title={t('Service catalog')} queryKey={[SB_KEYS.catalog, 'all']} fetch={() => servicesApi.catalog.list()} feature="servicesDesk" emptyIcon={Package} empty={t('Abhi koi service nahi')} searchPlaceholder={t('Service ka naam')}
      rows={(list) => list.map((s) => ({
        id: s.id, icon: Package, tone: s.isActive ? 'accent' : 'neutral', search: s.name, title: s.name, subtitle: `${labelOf(CATEGORIES, s.category)} · ${t('Visit {{v}}', { v: formatMoney(s.visitCharge) })}${s.warrantyDays ? ` · ${t('{{n}} din warranty', { n: s.warrantyDays })}` : ''}`,
        trailing: <Badge tone={s.isActive ? 'success' : 'neutral'}>{formatMoney(s.baseCharge)}</Badge>, onPress: edit ? () => guard(() => setForm(s)) : undefined,
      }))}
      fab={edit ? { label: t('New'), onPress: () => guard(() => setForm('new')) } : undefined}>
      <FormSheet open={!!form} title={form === 'new' ? t('New service') : t('Edit service')} onClose={() => setForm(null)}
        fields={[{ key: 'name', label: t('Naam'), required: true }, { key: 'category', label: t('Qism'), kind: 'select', options: opts(CATEGORIES) }, { key: 'baseCharge', label: t('Mazdoori / rate'), kind: 'money', required: true }, { key: 'visitCharge', label: t('Visit charge'), kind: 'money' }, { key: 'estimatedDurationMin', label: t('Andaza (minute)'), kind: 'number' }, { key: 'warrantyDays', label: t('Warranty (din)'), kind: 'number' }, { key: 'isActive', label: t('Chalu'), kind: 'switch' }]}
        initial={form && form !== 'new' ? { ...form } : { category: 'REPAIR', estimatedDurationMin: 60, isActive: true }}
        onSubmit={async (v) => { const b = clean({ ...v, chargeType: (form !== 'new' && form?.chargeType) || 'FIXED', baseCharge: v.baseCharge ?? 0, visitCharge: v.visitCharge ?? 0, estimatedDurationMin: v.estimatedDurationMin ?? 60, warrantyDays: v.warrantyDays ?? 0, isActive: v.isActive ?? true }); if (form === 'new') await servicesApi.catalog.create(b); else await servicesApi.catalog.update((form as CatalogItem).id, b); refreshServices(); toast.success(t('Save ho gaya')); }} />
    </DeskList>
  );
}
