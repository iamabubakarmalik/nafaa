/**
 * My profile: personal details, password / email / Google / owner PIN,
 * signed-in devices with login history, and personal preferences, plus
 * logout and account deletion.
 */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { BadgeCheck, LogOut, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { authApi } from '@/core/auth/api';
import { useAuthStore } from '@/core/auth/store';
import { t } from '@/core/i18n';
import { Avatar, Button, Row, Screen, Skeleton, StatusPill, Tabs, Text, useTheme } from '@/design';
import { DevicesTab } from '../components/DevicesTab';
import { PreferencesTab } from '../components/PreferencesTab';
import { ProfileTab } from '../components/ProfileTab';
import { SecurityTab } from '../components/SecurityTab';
import { signOut } from '../lib/logout';
import { ROLE } from '../lib/meta';

type Tab = 'profile' | 'security' | 'devices' | 'preferences';
const TABS: Tab[] = ['profile', 'security', 'devices', 'preferences'];

export function ProfileScreen() {
  const th = useTheme();
  const params = useLocalSearchParams<{ tab?: string }>();
  const storeUser = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const me = useQuery({ queryKey: ['auth-me'], queryFn: authApi.me });
  const user = me.data?.user ?? storeUser;
  const [asked, setTab] = useState<Tab | null>(null);
  const tab: Tab = asked ?? (TABS.includes(params.tab as Tab) ? (params.tab as Tab) : 'profile');

  if (!user) return <Screen title={t('My profile')}><Skeleton height={96} /><Skeleton height={240} /></Screen>;
  const role = ROLE[user.role] ?? ROLE.STAFF;

  return (
    <Screen title={t('My profile')} keyboard refreshing={me.isRefetching} onRefresh={() => void me.refetch()}>
      <Row gap={3}>
        <Avatar name={user.fullName} url={user.avatarUrl} size={56} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text size="lg" weight="bold" numberOfLines={1}>{user.fullName}</Text>
          <Row gap={1}>
            <Text size="sm" tone="muted" ltr numberOfLines={1} style={{ flexShrink: 1 }}>{user.email}</Text>
            {user.emailVerified ? <BadgeCheck size={14} color={th.colors.success.solid} /> : null}
          </Row>
          <Row gap={2}><StatusPill tone={role.tone}>{t(role.label)}</StatusPill>{tenant?.name ? <Text size="xs" tone="muted" numberOfLines={1} style={{ flexShrink: 1 }}>{tenant.name}</Text> : null}</Row>
        </View>
      </Row>

      <Tabs value={tab} onChange={setTab} tabs={[
        { value: 'profile', label: t('Profile') }, { value: 'security', label: t('Hifazat') },
        { value: 'devices', label: t('Devices') }, { value: 'preferences', label: t('Pasand') },
      ]} />

      {tab === 'profile' && <ProfileTab user={user} tenantName={tenant?.name} />}
      {tab === 'security' && <SecurityTab user={user} />}
      {tab === 'devices' && <DevicesTab />}
      {tab === 'preferences' && <PreferencesTab />}

      <View style={{ gap: th.space(2), marginTop: th.space(2) }}>
        <Button variant="secondary" icon={LogOut} onPress={() => void signOut()}>{t('Logout')}</Button>
        <Button variant="ghost" icon={Trash2} onPress={() => router.push('/profile/delete' as never)}>{t('Delete my account')}</Button>
      </View>
    </Screen>
  );
}
