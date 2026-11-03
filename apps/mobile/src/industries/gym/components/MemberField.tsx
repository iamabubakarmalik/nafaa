/** Member picker: search by name, phone or member number (server search). */

import { useQuery } from '@tanstack/react-query';
import { Dumbbell } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { Badge, Field, ListRow, PressableScale, Row, SearchBar, Sheet, Text, useDebouncedValue, useTheme } from '@/design';
import { gymApi, type GymMember } from '../api';
import { GYM_KEYS, MEMBER_STATE, memberName } from '../meta';

export function MemberField({ value, onChange, label }: { value: GymMember | null; onChange: (m: GymMember) => void; label?: string }) {
  const th = useTheme();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const query = useDebouncedValue(q, 200);
  useEffect(() => { if (open) setQ(''); }, [open]);
  const list = useQuery({ queryKey: [GYM_KEYS.members, 'pick', query], queryFn: () => gymApi.members.list({ search: query || undefined }), enabled: open });
  return (
    <>
      <Field label={label ?? t('Member')}>
        <PressableScale onPress={() => setOpen(true)} style={{ minHeight: th.control('md'), borderRadius: th.radius('lg'), borderWidth: 1, borderColor: th.colors.border, backgroundColor: th.colors.surface, paddingHorizontal: th.space(3), justifyContent: 'center' }}>
          <Row gap={2}><Dumbbell size={18} color={th.colors.textMuted} /><Text style={{ flex: 1 }} tone={value ? 'default' : 'muted'} numberOfLines={1}>{value ? `${memberName(value)} · ${value.memberNumber}` : t('Member chunein')}</Text></Row>
        </PressableScale>
      </Field>
      <Sheet open={open} onClose={() => setOpen(false)} title={t('Member')} height={0.8}>
        <View style={{ gap: th.space(2) }}>
          <SearchBar value={q} onChangeText={setQ} placeholder={t('Naam, phone ya member number')} />
          {(list.data ?? []).map((m) => (
            <ListRow key={m.id} icon={Dumbbell} title={memberName(m)} subtitle={`${m.memberNumber}${m.customer?.phone ? ` · ${m.customer.phone}` : ''}`} divider
              trailing={<Badge tone={MEMBER_STATE[m.state ?? 'NONE'].tone}>{t(MEMBER_STATE[m.state ?? 'NONE'].label)}</Badge>} onPress={() => { onChange(m); setOpen(false); }} />
          ))}
        </View>
      </Sheet>
    </>
  );
}
