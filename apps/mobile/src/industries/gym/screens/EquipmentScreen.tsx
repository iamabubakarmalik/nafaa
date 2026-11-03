/** Machines (web EquipmentPage): status, next service date and usage; add, edit and log a service. */

import { Activity } from 'lucide-react-native';
import { useState } from 'react';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, toast } from '@/design';
import { daysFromToday, useDeskOnline } from '../../_shared/deskKit';
import { DeskList, FormSheet, clean } from '../../_shared/serviceKit';
import { gymApi, type Equipment } from '../api';
import { EQUIPMENT_STATUS, GYM_KEYS, dateOf, equipmentCategoryOptions, refreshGym } from '../meta';

export function EquipmentScreen() {
  const canEdit = usePermission()(P.PRODUCTS_EDIT);
  const { guard } = useDeskOnline('gymDesk');
  const [form, setForm] = useState<Equipment | 'new' | null>(null);
  const [svc, setSvc] = useState<Equipment | null>(null);
  return (
    <DeskList<Equipment[]> title={t('Machines')} queryKey={[GYM_KEYS.equipment]} fetch={() => gymApi.equipment.list()} feature="gymDesk" emptyIcon={Activity} empty={t('Abhi koi machine nahi')}
      rows={(list) => list.map((e) => {
        const left = daysFromToday(e.nextMaintenanceDate);
        return {
          id: e.id, icon: Activity, tone: EQUIPMENT_STATUS[e.status]?.tone ?? 'neutral', search: `${e.name} ${e.brand ?? ''} ${e.equipmentNumber}`, title: e.name,
          subtitle: `${e.equipmentNumber}${e.brand ? ` · ${e.brand}` : ''}${e.nextMaintenanceDate ? ` · ${t('Service')} ${dateOf(e.nextMaintenanceDate)}` : ''}`,
          trailing: <Badge tone={left !== null && left <= 7 ? 'warning' : EQUIPMENT_STATUS[e.status]?.tone ?? 'neutral'}>{t(EQUIPMENT_STATUS[e.status]?.label ?? e.status)}</Badge>, onPress: canEdit ? () => guard(() => setForm(e)) : undefined,
        };
      })}
      fab={canEdit ? { label: t('New'), onPress: () => guard(() => setForm('new')) } : undefined}>
      <FormSheet open={!!form} title={form === 'new' ? t('New machine') : t('Edit machine')} onClose={() => setForm(null)}
        fields={[{ key: 'name', label: t('Naam'), required: true }, { key: 'category', label: t('Category'), kind: 'select', options: equipmentCategoryOptions(), required: true }, { key: 'brand', label: t('Brand') }, { key: 'status', label: t('Haal'), kind: 'select', options: Object.entries(EQUIPMENT_STATUS).map(([value, s]) => ({ value, label: t(s.label) })) }, { key: 'nextMaintenanceDate', label: t('Agli service'), kind: 'date' }, { key: 'notes', label: t('Note'), kind: 'multiline' }]}
        initial={form && form !== 'new' ? { ...form, nextMaintenanceDate: form.nextMaintenanceDate?.slice(0, 10) } : { category: 'CARDIO', status: 'AVAILABLE' }}
        extra={form && form !== 'new' ? <Button variant="soft" onPress={() => { const f = form; setForm(null); setSvc(f); }}>{t('Service likhein')}</Button> : undefined}
        onSubmit={async (v) => { const b = clean({ ...v, nextMaintenanceDate: v.nextMaintenanceDate || undefined }); if (form === 'new') await gymApi.equipment.create(b); else await gymApi.equipment.update((form as Equipment).id, b); refreshGym(); toast.success(t('Save ho gaya')); }} />
      <FormSheet open={!!svc} title={t('Service likhein')} description={svc?.name} onClose={() => setSvc(null)}
        fields={[{ key: 'cost', label: t('Kharcha'), kind: 'money', required: true }, { key: 'notes', label: t('Kya kiya'), kind: 'multiline' }, { key: 'nextDate', label: t('Agli service'), kind: 'date' }, { key: 'paid', label: t('Drawer se diya (Expense)'), kind: 'switch' }]} initial={{ paid: true }}
        onSubmit={async (v) => { await gymApi.equipment.maintenance(svc!.id, clean({ cost: v.cost ?? 0, notes: v.notes, nextDate: v.nextDate, paid: !!v.paid, paymentMethod: 'CASH' }) as any); refreshGym(true); toast.success(t('Service likh di')); }} />
    </DeskList>
  );
}
