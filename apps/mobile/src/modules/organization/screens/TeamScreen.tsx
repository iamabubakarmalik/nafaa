/** Team logins: who can sign in, with which role and branch. Tap a person for permissions and actions. */

import { router } from 'expo-router';
import { Plus, ShieldCheck, Users } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { t } from '@/core/i18n';
import { formatRelative } from '@/core/format';
import { isOwner, PERMISSIONS as P, usePermissions } from '@/core/permissions';
import { Avatar, EmptyState, IconButton, ListRow, ListTemplate, Screen, StatusPill } from '@/design';
import { teamApi, type TeamMember } from '../api/organization';
import { ROLES, type RoleKey } from '../lib/meta';

type Filter = 'all' | RoleKey | 'off';

export function TeamScreen() {
  const { can, role } = usePermissions();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const allowed = can(P.TEAM_VIEW);
  const list = useQuery({ queryKey: ['team'], queryFn: teamApi.list, enabled: allowed });
  const members = list.data ?? [];

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: members.length, off: members.filter((m) => !m.isActive).length };
    for (const m of members) c[m.role] = (c[m.role] ?? 0) + 1;
    return c;
  }, [members]);

  const data = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return members
      .filter((m) => (filter === 'all' ? true : filter === 'off' ? !m.isActive : m.role === filter))
      .filter((m) => !needle || `${m.fullName} ${m.email} ${m.phone ?? ''}`.toLowerCase().includes(needle))
      .sort((a, b) => Number(b.role === 'OWNER') - Number(a.role === 'OWNER') || a.fullName.localeCompare(b.fullName));
  }, [members, q, filter]);

  if (!allowed) return <Screen title={t('Team')}><EmptyState icon={Users} title={t('Team dekhne ki ijazat nahi hai')} /></Screen>;

  return (
    <ListTemplate
      title={t('Roles & permissions')}
      actions={<IconButton icon={ShieldCheck} label={t('Role presets')} onPress={() => router.push('/team/roles' as never)} />}
      search={{ value: q, onChange: setQ, placeholder: t('Search team') }}
      filters={{
        value: filter, onChange: (v) => setFilter(v as Filter),
        options: [
          { value: 'all', label: t('Sab'), count: counts.all },
          { value: 'OWNER', label: t('Owner'), count: counts.OWNER },
          { value: 'MANAGER', label: t('Manager'), count: counts.MANAGER },
          { value: 'CASHIER', label: t('Cashier'), count: counts.CASHIER },
          { value: 'STAFF', label: t('Staff'), count: counts.STAFF },
          { value: 'off', label: t('Off'), count: counts.off },
        ].filter((o) => o.value === 'all' || (o.count ?? 0) > 0),
      }}
      data={data}
      loading={list.isLoading}
      error={list.error}
      onRetry={list.refetch}
      refreshing={list.isRefetching}
      onRefresh={list.refetch}
      keyExtractor={(m: TeamMember) => m.id}
      renderItem={({ item }) => {
        const meta = ROLES[item.role as RoleKey];
        return (
          <ListRow
            avatar={<Avatar name={item.fullName} size={40} />}
            title={item.fullName}
            subtitle={[meta ? t(meta.label) : item.role, item.assignedShop?.name ?? t('Sab branches'), item.lastLoginAt ? formatRelative(item.lastLoginAt) : t('Kabhi login nahi kiya')].join(' · ')}
            trailing={!item.isActive ? <StatusPill tone="neutral">{t('Off')}</StatusPill> : undefined}
            chevron
            onPress={() => router.push(`/team/${item.id}` as never)}
          />
        );
      }}
      empty={<EmptyState icon={Users} title={t('Koi login nahi mila')} />}
      fab={isOwner(role) || can(P.TEAM_MANAGE) ? { icon: Plus, label: t('New login'), onPress: () => router.push('/team/invite' as never) } : undefined}
    />
  );
}
