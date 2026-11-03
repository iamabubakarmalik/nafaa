/** Patient picker: search by name, MRN or phone (server search) with a quick "new patient" in two fields. */

import { useQuery } from '@tanstack/react-query';
import { UserPlus, UserRound } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { Button, Field, Input, ListRow, PressableScale, Row, SearchBar, Sheet, Text, toast, useDebouncedValue, useTheme } from '@/design';
import { errorText } from '../_shared/deskKit';
import { clinicApi, type Patient } from './api';
import { CLINIC_KEYS, refreshClinic } from './meta';

export function PatientField({ value, onChange, label }: { value: Patient | null; onChange: (p: Patient) => void; label?: string }) {
  const th = useTheme();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const query = useDebouncedValue(q, 200);
  useEffect(() => { if (open) { setQ(''); setAdding(false); setName(''); setPhone(''); } }, [open]);
  const list = useQuery({ queryKey: [CLINIC_KEYS.patients, 'pick', query], queryFn: () => clinicApi.patients.list({ search: query || undefined }), enabled: open });
  const create = async () => {
    try { const p = await clinicApi.patients.create({ fullName: name.trim(), phonePrimary: phone.trim() || undefined, allergies: [], chronicConditions: [], currentMedications: [], hasInsurance: false }); refreshClinic(); onChange(p); setOpen(false); } catch (e) { toast.error(errorText(e, t('Save nahi hua'))); }
  };
  return (
    <>
      <Field label={label ?? t('Mareez')}>
        <PressableScale onPress={() => setOpen(true)} style={{ minHeight: th.control('md'), borderRadius: th.radius('lg'), borderWidth: 1, borderColor: th.colors.border, backgroundColor: th.colors.surface, paddingHorizontal: th.space(3), justifyContent: 'center' }}>
          <Row gap={2}><UserRound size={18} color={th.colors.textMuted} /><Text style={{ flex: 1 }} tone={value ? 'default' : 'muted'} numberOfLines={1}>{value ? `${value.fullName} · ${value.mrn}` : t('Mareez chunein')}</Text></Row>
        </PressableScale>
      </Field>
      <Sheet open={open} onClose={() => setOpen(false)} title={t('Mareez')} height={0.8}
        footer={adding ? <Button fullWidth size="lg" disabled={name.trim().length < 2} onPress={() => void create()}>{t('Save')}</Button> : <Button fullWidth variant="secondary" icon={UserPlus} onPress={() => setAdding(true)}>{t('New patient')}</Button>}>
        <View style={{ gap: th.space(2) }}>
          {adding ? (<><Input label={t('Naam')} value={name} onChangeText={setName} /><Input label={t('Phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" ltr /></>) : (
            <>
              <SearchBar value={q} onChangeText={setQ} placeholder={t('Naam, MRN ya phone')} />
              {(list.data ?? []).map((p) => <ListRow key={p.id} icon={UserRound} title={p.fullName} subtitle={`${p.mrn}${p.phonePrimary ? ` · ${p.phonePrimary}` : ''}`} divider onPress={() => { onChange(p); setOpen(false); }} />)}
            </>
          )}
        </View>
      </Sheet>
    </>
  );
}
