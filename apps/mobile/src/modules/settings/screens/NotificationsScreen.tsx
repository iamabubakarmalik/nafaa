/**
 * Settings → Notifications. For everyone: this phone's permission and the
 * person's own choices (events, tone, vibration, quiet hours, test push),
 * shared with the web. For the owner also the shop's emails: the email
 * switch, the morning low-stock email and the daily closing report.
 */

import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { BarChart3, Bell, MessageCircle } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';
import { t } from '@/core/i18n';
import { usePermissions } from '@/core/permissions';
import { ListRow, SettingLink, SettingSwitch, SettingsGroup, SettingsTemplate } from '@/design';
import { AlertPrefsSections } from '@/modules/notifications/components/AlertPrefsSections';
import { registerPushNow } from '@/modules/notifications/lib/usePushSetup';
import { clock } from '../lib/options';
import { useAutoSave, useSettings, useSettingsOnline } from '../hooks/useSettings';
import { Note, OfflineNote } from '../components/SettingsParts';

function usePushPermission() {
  const [state, setState] = useState<'granted' | 'denied' | 'undetermined' | null>(null);
  useEffect(() => {
    const read = () => Notifications.getPermissionsAsync().then((p) => setState(p.granted ? 'granted' : p.canAskAgain ? 'undetermined' : 'denied')).catch(() => setState(null));
    read();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') read(); });
    return () => sub.remove();
  }, []);
  // Asking also saves this phone's token, so pushes start without a restart.
  return { state, ask: () => registerPushNow(true).then(() => Notifications.getPermissionsAsync()).then((p) => setState(p.granted ? 'granted' : 'denied')) };
}

/** The shop's emails and reports (owner only). */
function ShopEmails() {
  const q = useSettings();
  const online = useSettingsOnline();
  const { draft: d, set } = useAutoSave(q.data?.settings);
  if (!d) return null;
  const email = !!d.emailNotifications;
  return (
    <>
      <SettingsGroup title={t('Email notifications')} footnote={t('Band karein to neeche wali koi email nahi jayegi. Email tasdeeq shuda honi chahiye.')}>
        <SettingSwitch label={t('Email bhejein')} description={t('Malik ke email par store ki khabrein')} value={email} onChange={(v) => set('emailNotifications', v, { now: true })} disabled={!online} />
        <SettingSwitch label={t('Kam stock ki email')} description={t('Subah 9 baje: kam aur khatam stock wale products ki list')} value={!!d.notifyLowStock} onChange={(v) => set('notifyLowStock', v, { now: true })} disabled={!online || !email} />
        <SettingSwitch label={t('Rozana Sale ki email (closing report)')} description={t('Roz {{dailySummaryTime}} par: aaj ki Sale, Profit aur udhaar. Waqt aur log \'Reports & daily summary\' me.', { dailySummaryTime: clock(d.dailySummaryTime) })}
          value={!!d.notifyDailySummary} onChange={(v) => set('notifyDailySummary', v, { now: true })} disabled={!online} />
      </SettingsGroup>
      {!email && <Note tone="warning">{t('Email band hai — kam stock ki email nahi jayegi. Closing report phir bhi app ki ghanti me aati hai.')}</Note>}
      <SettingsGroup title={t('Aur messages')}>
        <ListRow icon={BarChart3} title={t('Reports & daily summary')} subtitle={t('Closing report ka waqt, log aur tareeqa')} chevron onPress={() => router.push('/settings/reports' as never)} />
        <ListRow icon={MessageCircle} title={t('WhatsApp messages')} subtitle={t('Bill, udhaar aur shukriya ke message')} chevron onPress={() => router.push('/settings/whatsapp' as never)} />
      </SettingsGroup>
    </>
  );
}

export function NotificationsSettingsScreen() {
  const { isOwner } = usePermissions();
  const online = useSettingsOnline();
  const push = usePushPermission();

  return (
    <SettingsTemplate title={t('Notifications')} description={t('Kis baat ki khabar, kis awaaz se')}>
      {!online && <OfflineNote />}
      <SettingsGroup title={t('Is phone par')} footnote={push.state === 'denied' ? t('Phone ki settings me Nafaa ke liye notifications chalu karein.') : t('Naya order, kam stock aur rozana report push se aati hain.')}>
        <SettingLink icon={Bell} label={t('Push notifications')} value={push.state === 'granted' ? t('Chalu') : push.state === 'denied' ? t('Band') : t('Chalu karein')}
          onPress={() => (push.state === 'undetermined' ? void push.ask() : void Linking.openSettings())} />
      </SettingsGroup>
      <AlertPrefsSections />
      {isOwner && <ShopEmails />}
    </SettingsTemplate>
  );
}
