/** Personal preferences: theme, language, notifications permission and links to detailed settings. */

import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Bell, Monitor, Moon, Palette, Printer, Sun } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import { LANGUAGE_HEADING, LanguageSwitch } from '@/core/i18n/components/LanguagePicker';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Button, Card, ListGroup, ListRow, Segmented, Text, useAppearanceStore, useTheme, type ThemeMode } from '@/design';

export function PreferencesTab() {
  const th = useTheme();
  const can = usePermission();
  const mode = useAppearanceStore((s) => s.resolved.mode);
  const setMode = useAppearanceStore((s) => s.setMode);
  const [push, setPush] = useState<'granted' | 'denied' | 'undetermined' | null>(null);
  useEffect(() => { void Notifications.getPermissionsAsync().then((p) => setPush(p.status as 'granted' | 'denied' | 'undetermined')).catch(() => setPush(null)); }, []);

  return (
    <View style={{ gap: th.space(4) }}>
      <Card title={t('Theme')} description={t('Sirf aap ke account par lagta hai, har device par')}>
        <Segmented<ThemeMode> value={mode} onChange={setMode} options={[
          { value: 'light', label: t('Din (light)'), icon: Sun }, { value: 'dark', label: t('Raat (dark)'), icon: Moon }, { value: 'system', label: t('Device jaisa'), icon: Monitor },
        ]} />
      </Card>
      <Card title={<Text size="md" weight="semibold" ltr>{LANGUAGE_HEADING}</Text>}>
        <LanguageSwitch />
      </Card>
      {push && push !== 'granted' && (
        <Card tone="warning" title={t('Notifications band hain')}>
          <Text size="sm">{t('Nayi sale, kam stock aur online order ki khabar ke liye phone ki settings me Notifications chalu karein.')}</Text>
          <Button style={{ marginTop: th.space(3) }} size="sm" variant="secondary" onPress={() => void Linking.openSettings()}>{t('Settings kholein')}</Button>
        </Card>
      )}
      <ListGroup>
        <ListRow icon={Palette} title={t('Rang, font aur size')} subtitle={t('Apna rang, likhai ka size aur safhe ki chaurai')} chevron onPress={() => router.push('/settings/appearance' as never)} />
        {can(P.POS_USE) && <ListRow icon={Printer} title={t('Print settings')} subtitle={t('Printer, kaghaz ka size aur bill ka design')} chevron onPress={() => router.push('/settings/receipt' as never)} />}
        {can(P.SETTINGS_VIEW) && <ListRow icon={Bell} title={t('Notifications')} subtitle={t('Kab aur kaise khabar aaye')} chevron onPress={() => router.push('/settings/notifications' as never)} />}
      </ListGroup>
    </View>
  );
}
