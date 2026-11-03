/**
 * Account menu (web ProfileDropdown): who is signed in, the store, theme,
 * language, shortcuts and log out.
 */

import {
  Bell, Building2, ChevronRight, CreditCard, Crown, LifeBuoy, LogOut, Monitor, Moon, Palette, ScrollText, Settings, Shield, Store, Sun, User,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { View } from 'react-native';
import { t, msg } from '@/core/i18n';
import { useAuthStore } from '@/core/auth/store';
import { signOut } from '@/modules/profile/lib/logout';
import { isOwner } from '@/core/permissions';
import { LanguageSwitch, LANGUAGE_HEADING } from '@/core/i18n/components/LanguagePicker';
import { Avatar, Badge, Icon, ListGroup, ListRow, PressableScale, Segmented, Sheet, Text, useAppearanceStore, useTheme, type StatusTone, type ThemeMode } from '@/design';
import { useShellUi } from '../hooks/useShellUi';

const ROLES: Record<string, { label: string; icon: typeof Crown; tone: StatusTone }> = {
  OWNER: { label: msg('Owner'), icon: Crown, tone: 'accent' },
  MANAGER: { label: msg('Manager'), icon: Shield, tone: 'brand' },
  CASHIER: { label: msg('Cashier'), icon: User, tone: 'info' },
  STAFF: { label: msg('Staff'), icon: User, tone: 'neutral' },
  SUPER_ADMIN: { label: msg('Super admin'), icon: Crown, tone: 'danger' },
};

/** Log out with the unsent-changes warning (profile module's signOut). */
export async function logoutWithConfirm(): Promise<void> {
  await signOut();
}

export function ProfileSheet() {
  const th = useTheme();
  const sheet = useShellUi((s) => s.sheet);
  const close = useShellUi((s) => s.close);
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const mode = useAppearanceStore((s) => s.resolved.mode);
  const setMode = useAppearanceStore((s) => s.setMode);
  const role = ROLES[user?.role ?? 'STAFF'] ?? ROLES.STAFF;
  const owner = isOwner(user?.role);

  const go = (href: string) => {
    close();
    setTimeout(() => router.push(href as never), 120);
  };

  return (
    <Sheet open={sheet === 'profile'} onClose={close} hideClose>
      <View style={{ gap: th.space(4) }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3) }}>
          <Avatar name={user?.fullName} url={user?.avatarUrl} size={52} />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text size="md" weight="bold" numberOfLines={1}>{user?.fullName || t('User')}</Text>
            <Text size="sm" tone="muted" numberOfLines={1} ltr>{user?.email ?? ''}</Text>
            <Badge tone={role.tone} icon={role.icon} style={{ marginTop: 4 }}>{t(role.label)}</Badge>
          </View>
        </View>

        {tenant && (
          <PressableScale
            onPress={() => go('/settings')}
            haptic="tap"
            style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3), padding: th.space(3), borderRadius: th.radius('xl'), borderWidth: 1, borderColor: th.colors.border, backgroundColor: th.colors.surface }}
          >
            <View style={{ width: 40, height: 40, borderRadius: th.radius('md'), backgroundColor: th.colors.brand.soft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon icon={Store} size={19} color={th.colors.brand.text} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text size="base" weight="semibold" numberOfLines={1}>{tenant.name}</Text>
              <Text size="xs" tone="muted" numberOfLines={1}>{t('Store settings')}</Text>
            </View>
            <Icon icon={ChevronRight} size={18} tone="subtle" flip />
          </PressableScale>
        )}

        <View style={{ gap: th.space(2) }}>
          <Text size="xs" weight="semibold" tone="muted">{t('Appearance')}</Text>
          <Segmented<ThemeMode>
            value={mode}
            onChange={setMode}
            options={[
              { value: 'light', label: t('Light'), icon: Sun },
              { value: 'dark', label: t('Dark'), icon: Moon },
              { value: 'system', label: t('System'), icon: Monitor },
            ]}
          />
        </View>

        <View style={{ gap: th.space(2) }}>
          <Text size="xs" weight="semibold" tone="muted" ltr>{LANGUAGE_HEADING}</Text>
          <LanguageSwitch />
        </View>

        <ListGroup>
          <ListRow icon={User} title={t('My profile')} chevron onPress={() => go('/profile')} dense />
          <ListRow icon={Palette} title={t('Appearance')} chevron onPress={() => go('/settings/appearance')} dense />
          <ListRow icon={Bell} title={t('Notifications')} chevron onPress={() => go('/notifications')} dense />
          <ListRow icon={Settings} title={t('Settings')} chevron onPress={() => go('/settings')} dense />
          {owner && <ListRow icon={CreditCard} title={t('Billing & plan')} chevron onPress={() => go('/billing')} dense />}
          {owner && <ListRow icon={Building2} title={t('Branches')} chevron onPress={() => go('/shops')} dense />}
        </ListGroup>
        <ListGroup>
          <ListRow icon={LifeBuoy} title={t('Help center')} chevron onPress={() => go('/help')} dense />
          <ListRow icon={ScrollText} title={t('Terms & privacy')} chevron onPress={() => go('/legal')} dense />
        </ListGroup>
        <ListGroup>
          <ListRow icon={LogOut} title={t('Log out')} destructive onPress={() => { close(); setTimeout(() => void logoutWithConfirm(), 250); }} dense />
        </ListGroup>
      </View>
    </Sheet>
  );
}
