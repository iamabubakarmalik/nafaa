/**
 * Roles and permissions at a glance: how many people hold each role, which
 * permission each role preset gives, and the people whose own permissions
 * differ from their role (more or fewer). Presets only fill the boxes when a
 * login is made; after that every person keeps their own list.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Check, Minus, Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { Avatar, Badge, Card, Icon, ListGroup, ListRow, PressableScale, Row, SearchBar, Skeleton, Text, useTheme } from '@/design';
import { peopleApi, type DirectoryPerson } from '../api/people';
import { usePermissionGroups, useRoleDefaults } from '../lib/hooks';
import { ASSIGNABLE, ROLES, permText, roleLabel, type RoleKey } from '../lib/meta';

export function RolesPanel({ people, canSeeLogins, onRole }: { people: DirectoryPerson[]; canSeeLogins: boolean; onRole: (role: RoleKey) => void }) {
  const th = useTheme();
  const defaults = useRoleDefaults();
  const groups = usePermissionGroups();
  const [q, setQ] = useState('');
  const teamQ = useQuery({ queryKey: ['team'], queryFn: peopleApi.team, enabled: canSeeLogins, staleTime: 60_000 });
  const needle = q.trim().toLowerCase();
  const current = people.filter((p) => p.status !== 'LEFT');
  const counts = (Object.keys(ROLES) as RoleKey[]).map((r) => ({ r, n: current.filter((p) => (p.role ?? 'NO_LOGIN') === r).length }));
  const visible = useMemo(() => new Set(groups.flatMap((g) => g.permissions as string[])), [groups]);

  const differs = useMemo(() => (teamQ.data ?? [])
    .filter((m) => m.role !== 'OWNER' && m.role !== 'SUPER_ADMIN' && m.isActive)
    .map((m) => {
      const preset = new Set(defaults[m.role] ?? []);
      const mine = new Set(m.permissions ?? []);
      return {
        m,
        extra: [...mine].filter((p) => !preset.has(p) && visible.has(p)),
        missing: [...preset].filter((p) => !mine.has(p) && visible.has(p)),
        person: people.find((p) => p.userId === m.id),
      };
    })
    .filter((d) => d.extra.length || d.missing.length), [teamQ.data, defaults, people, visible]);

  const cell = { width: 54, alignItems: 'center' as const };
  return (
    <View style={{ gap: th.space(3) }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
        {counts.map(({ r, n }) => {
          const meta = ROLES[r];
          const tc = th.colors[meta.tone];
          return (
            <PressableScale key={r} onPress={() => onRole(r)} accessibilityRole="button"
              style={{ flexGrow: 1, flexBasis: '45%', backgroundColor: th.colors.surface, borderRadius: th.radius('lg'), borderWidth: 1, borderColor: th.colors.border, padding: th.space(3), gap: th.space(1) }}>
              <Row justify="between">
                <View style={{ width: 32, height: 32, borderRadius: th.radius('md'), backgroundColor: tc.soft, alignItems: 'center', justifyContent: 'center' }}><Icon icon={meta.icon} size={16} color={tc.text} /></View>
                <Text size="xl" weight="bold" ltr>{String(n)}</Text>
              </Row>
              <Text weight="semibold">{t(meta.label)}</Text>
              <Text size="xs" tone="muted">{t(meta.hint)}</Text>
              {r !== 'OWNER' && r !== 'NO_LOGIN' && <Text size="xs" tone="brand" weight="medium">{t('{{count}} permissions shuru me', { count: (defaults[r] ?? []).length })}</Text>}
            </PressableScale>
          );
        })}
      </View>

      <Card title={t('Har role ko shuru me kya milta hai')} description={t('Naya login banate waqt role yeh nishan laga deta hai. Baad me har bande ki apni list hoti hai — role badalne se permission khud nahi badalti.')}>
        <SearchBar value={q} onChangeText={setQ} placeholder={t('Search…')} />
        <Row gap={0} style={{ marginTop: th.space(3) }}>
          <View style={{ flex: 1 }} />
          {ASSIGNABLE.map((r) => <View key={r} style={cell}><Text size="2xs" weight="bold" tone={ROLES[r].tone === 'accent' ? 'brand' : 'secondary'} numberOfLines={1}>{roleLabel(r)}</Text></View>)}
          <View style={cell}><Text size="2xs" weight="bold" tone="warning" numberOfLines={1}>{t('Malik')}</Text></View>
        </Row>
        {groups.map((g) => {
          const rows = (g.permissions as string[]).filter((p) => !needle || `${p} ${permText(p).join(' ')}`.toLowerCase().includes(needle));
          if (!rows.length) return null;
          return (
            <View key={g.title}>
              <View style={{ backgroundColor: th.colors.surfaceMuted, paddingVertical: th.space(1.5), paddingHorizontal: th.space(2), marginTop: th.space(2), borderRadius: th.radius('sm') }}>
                <Text size="xs" weight="semibold">{`${g.emoji} ${g.title}`}</Text>
              </View>
              {rows.map((p) => (
                <Row key={p} gap={0} style={{ paddingVertical: th.space(1.5), borderBottomWidth: 1, borderBottomColor: th.colors.divider }}>
                  <View style={{ flex: 1, paddingEnd: th.space(2) }}><Text size="sm" weight="medium">{permText(p)[0]}</Text></View>
                  {ASSIGNABLE.map((r) => (
                    <View key={r} style={cell}>
                      {(defaults[r] ?? []).includes(p) ? <Icon icon={Check} size={16} tone="success" /> : <Icon icon={Minus} size={16} tone="subtle" />}
                    </View>
                  ))}
                  <View style={cell}><Icon icon={Check} size={16} tone="warning" /></View>
                </Row>
              ))}
            </View>
          );
        })}
      </Card>

      <Card title={t('Role se alag permission wale log')} description={t('In logon ki apni list un ke role se mukhtalif hai. Theek hai to rehne dein; ghalti se hai to profile kholein.')}>
        {!canSeeLogins ? <Text size="sm" tone="muted">{t('Yeh dekhne ke liye "Team dekhna" ki permission chahiye.')}</Text>
          : teamQ.isLoading ? <Skeleton height={56} />
            : !differs.length ? <Text size="sm" tone="success">{t('Sab ki permission bilkul un ke role jaisi hai.')}</Text>
              : (
                <ListGroup>
                  {differs.map(({ m, extra, missing, person }) => (
                    <ListRow key={m.id} avatar={<Avatar name={m.fullName} size={36} />} title={m.fullName} chevron onPress={() => router.push(`/staff/${person?.id ?? m.id}` as never)}
                      subtitle={(
                        <View style={{ gap: 4 }}>
                          <Text size="xs" tone="muted">{roleLabel(m.role)}</Text>
                          <Row gap={1} wrap>
                            {extra.map((p) => <Badge key={p} tone="brand" icon={Plus}>{permText(p)[0]}</Badge>)}
                            {missing.map((p) => <Badge key={p} tone="warning" icon={Minus}>{permText(p)[0]}</Badge>)}
                          </Row>
                        </View>
                      )} />
                  ))}
                </ListGroup>
              )}
      </Card>
    </View>
  );
}
