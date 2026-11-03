/**
 * Role presets at a glance: how many people hold each role, exactly what
 * each preset gives, and the people whose own list differs from their role.
 * Presets only fill the boxes when a login is made; after that every person
 * keeps their own list.
 */

import { router } from 'expo-router';
import { Check, Minus, Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermissions } from '@/core/permissions';
import { Avatar, Badge, Card, EmptyState, Icon, ListRow, Row, Screen, SearchBar, Skeleton, Text, useTheme } from '@/design';
import { teamApi } from '../api/organization';
import { ASSIGNABLE, ROLES, type RoleKey } from '../lib/meta';
import { permText } from '../lib/permText';
import { usePermissionGroups, useRoleDefaults } from '../lib/useTeam';

export function RolesScreen() {
  const th = useTheme();
  const { can } = usePermissions();
  const defaults = useRoleDefaults();
  const groups = usePermissionGroups();
  const [q, setQ] = useState('');
  const canSee = can(P.TEAM_VIEW);
  const teamQ = useQuery({ queryKey: ['team'], queryFn: teamApi.list, enabled: canSee, staleTime: 60_000 });
  const visible = useMemo(() => new Set(groups.flatMap((g) => g.permissions as string[])), [groups]);
  const needle = q.trim().toLowerCase();

  const differs = useMemo(() => (teamQ.data ?? [])
    .filter((m) => m.role !== 'OWNER' && m.role !== 'SUPER_ADMIN' && m.isActive)
    .map((m) => {
      const preset = new Set(defaults[m.role] ?? []);
      const mine = new Set(m.permissions ?? []);
      return { m, extra: [...mine].filter((p) => !preset.has(p) && visible.has(p)), missing: [...preset].filter((p) => !mine.has(p) && visible.has(p)) };
    })
    .filter((d) => d.extra.length || d.missing.length), [teamQ.data, defaults, visible]);

  const count = (r: RoleKey) => (teamQ.data ?? []).filter((m) => m.role === r).length;

  return (
    <Screen title={t('Role presets')} narrow>
      <Text size="sm" tone="muted">{t('Naya login banate waqt role yeh nishan laga deta hai. Baad me har bande ki apni list hoti hai — role badalne se permission khud nahi badalti.')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
        {(['OWNER', ...ASSIGNABLE] as RoleKey[]).map((r) => {
          const m = ROLES[r];
          return (
            <Card key={r} style={{ width: '48.5%' }}>
              <View style={{ gap: th.space(1) }}>
                <Row justify="between" align="center">
                  <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: `${m.color}22`, alignItems: 'center', justifyContent: 'center' }}><Icon icon={m.icon} size={16} color={m.color} /></View>
                  <Text size="xl" weight="bold" ltr>{String(count(r))}</Text>
                </Row>
                <Text weight="bold">{t(m.label)}</Text>
                <Text size="xs" tone="muted" numberOfLines={3}>{t(m.hint)}</Text>
                {r !== 'OWNER' && <Text size="xs" weight="semibold" tone="brand">{t('{{count}} permissions shuru me', { count: (defaults[r] ?? []).length })}</Text>}
              </View>
            </Card>
          );
        })}
      </View>

      <SearchBar value={q} onChangeText={setQ} placeholder={t('Permission search…')} />
      <Card flush title={t('Har role ko shuru me kya milta hai')}>
        {groups.map((g) => {
          const rows = (g.permissions as string[]).filter((p) => !needle || `${p} ${permText(p).join(' ')}`.toLowerCase().includes(needle));
          if (!rows.length) return null;
          return (
            <View key={g.title}>
              <View style={{ backgroundColor: th.colors.surfaceSunken, paddingHorizontal: th.space(3), paddingVertical: th.space(1.5) }}>
                <Text size="xs" weight="bold">{g.emoji} {g.title}</Text>
              </View>
              {rows.map((p) => {
                const [label, hint] = permText(p);
                return (
                  <Row key={p} gap={2} align="center" style={{ paddingHorizontal: th.space(3), paddingVertical: th.space(2) }}>
                    <View style={{ flex: 1 }}>
                      <Text size="sm" weight="medium">{label}</Text>
                      {!!hint && <Text size="xs" tone="muted" numberOfLines={2}>{hint}</Text>}
                    </View>
                    <Row gap={2}>
                      {ASSIGNABLE.map((r) => (defaults[r] ?? []).includes(p)
                        ? <View key={r} accessibilityLabel={t(ROLES[r].label)} style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: `${ROLES[r].color}22`, alignItems: 'center', justifyContent: 'center' }}><Icon icon={Check} size={13} color={ROLES[r].color} strokeWidth={3} /></View>
                        : <View key={r} style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}><Icon icon={Minus} size={13} tone="subtle" /></View>)}
                    </Row>
                  </Row>
                );
              })}
            </View>
          );
        })}
        <Row gap={3} justify="end" style={{ padding: th.space(3) }}>
          {ASSIGNABLE.map((r) => <Row key={r} gap={1} align="center"><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: ROLES[r].color }} /><Text size="xs">{t(ROLES[r].label)}</Text></Row>)}
        </Row>
      </Card>

      <Card flush title={t('Role se alag permission wale log')} description={t('In logon ki apni list un ke role se mukhtalif hai. Theek hai to rehne dein; ghalti se hai to profile kholein.')}>
        {!canSee ? <View style={{ padding: th.space(3) }}><Text size="sm" tone="muted">{t('Yeh dekhne ke liye "Team dekhna" ki permission chahiye.')}</Text></View>
          : teamQ.isLoading ? <View style={{ padding: th.space(3) }}><Skeleton height={48} /></View>
            : !differs.length ? <View style={{ padding: th.space(3) }}><Text size="sm" tone="success">{t('Sab ki permission bilkul un ke role jaisi hai.')}</Text></View>
              : differs.map(({ m, extra, missing }) => (
                <ListRow key={m.id} avatar={<Avatar name={m.fullName} size={36} />} title={m.fullName}
                  subtitle={[...extra.map((p) => `+ ${permText(p)[0]}`), ...missing.map((p) => `− ${permText(p)[0]}`)].slice(0, 4).join(', ')}
                  trailing={<Badge tone="info">{`+${extra.length} / −${missing.length}`}</Badge>} chevron onPress={() => router.push(`/team/${m.id}/permissions` as never)} />
              ))}
      </Card>
      {!teamQ.isLoading && !teamQ.data && canSee && <EmptyState compact title={t('Team load nahi hui')} />}
    </Screen>
  );
}
