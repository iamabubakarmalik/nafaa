/**
 * Settings → Notifications: the shop's email switch, the morning low-stock
 * email, the daily closing report, a test push and this phone's permission
 * (web NotificationsSection). Report time and people are in Reports.
 */

import { useMutation } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { BarChart3, Bell, BellRing, MessageCircle } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';
import { t } from '@/core/i18n';
import { Button, ListRow, SettingLink, SettingSwitch, SettingsGroup, SettingsTemplate, toast } from '@/design';
import { settingsApi } from '../api/settings';
import { clock } from '../lib/options';
import { useAutoSave, useSettings, useSettingsOnline } from '../hooks/useSettings';
import { Note, OfflineNote, SaveStatus, ownerOnly } from '../components/SettingsParts';

function usePushPermission() {
  const [state, setState] = useState<'granted' | 'denied' | 'undetermined' | null>(null);
  useEffect(() => {
    const read = () => Notifications.getPermissionsAsync().then((p) => setState(p.granted ? 'granted' : p.canAskAgain ? 'undetermined' : 'denied')).catch(() => setState(null));
    read();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') read(); });
    return () => sub.remove();
  }, []);
  return { state, ask: () => Notifications.requestPermissionsAsync().then((p) => setState(p.granted ? 'granted' : 'denied')) };
}

function NotificationSettings() {
  const q = useSettings();
  const online = useSettingsOnline();
  const { draft: d, set, saving, dirty, failed } = useAutoSave(q.data?.settings);
  const push = usePushPermission();
  const test = useMutation({
    mutationFn: settingsApi.testPush,
    onSuccess: () => toast.success(t('Test notification bhej di'), { message: t('Thori der me is phone par aayegi.') }),
    onError: () => toast.error(t('Test notification nahi gayi')),
  });
  const email = !!d?.emailNotifications;

  return (
    <SettingsTemplate title={t('Notifications')} description={t('Email, kam stock, rozana sale')} loading={!d && q.isLoading} error={!d && q.error} onRetry={q.refetch}
      actions={<SaveStatus saving={saving} dirty={dirty} failed={failed} />}>
      {!online && <OfflineNote />}
      {d && (
        <>
          <SettingsGroup title={t('Is phone par')} footnote={push.state === 'denied' ? t('Phone ki settings me Nafaa ke liye notifications chalu karein.') : t('Naya order, kam stock aur rozana report push se aati hain.')}>
            <SettingLink icon={Bell} label={t('Push notifications')} value={push.state === 'granted' ? t('Chalu') : push.state === 'denied' ? t('Band') : t('Chalu karein')}
              onPress={() => (push.state === 'undetermined' ? void push.ask() : void Linking.openSettings())} />
          </SettingsGroup>
          <SettingsGroup title={t('Email notifications')} footnote={t('Band karein to neeche wali koi email nahi jayegi. Email tasdeeq shuda honi chahiye.')}>
            <SettingSwitch label={t('Email bhejein')} description={t('Malik ke email par store ki khabrein')} value={email} onChange={(v) => set('emailNotifications', v, { now: true })} disabled={!online} />
          </SettingsGroup>
          <SettingsGroup title={t('Kya bhejein')} footnote={t('Store ke time zone ke mutabiq, roz')}>
            <SettingSwitch label={t('Kam stock ki email')} description={t('Subah 9 baje: kam aur khatam stock wale products ki list')} value={!!d.notifyLowStock} onChange={(v) => set('notifyLowStock', v, { now: true })} disabled={!online || !email} />
            <SettingSwitch label={t('Rozana Sale ki email (closing report)')} description={t('Roz {{dailySummaryTime}} par: aaj ki Sale, Profit aur udhaar. Waqt aur log \'Reports & daily summary\' me.', { dailySummaryTime: clock(d.dailySummaryTime) })}
              value={!!d.notifyDailySummary} onChange={(v) => set('notifyDailySummary', v, { now: true })} disabled={!online} />
          </SettingsGroup>
          {!email && <Note tone="warning">{t('Email band hai — kam stock ki email nahi jayegi. Closing report phir bhi app ki ghanti me aati hai.')}</Note>}
          <SettingsGroup title={t('Test notification')} footnote={t('Na aaye to internet aur login check karein.')}>
            <ListRow icon={BellRing} title={t('Dekhein ke notifications pohnch rahi hain')}
              trailing={<Button size="sm" variant="secondary" loading={test.isPending} disabled={!online} onPress={() => test.mutate()}>{t('Test bhejein')}</Button>} />
          </SettingsGroup>
          <SettingsGroup title={t('Aur messages')}>
            <ListRow icon={BarChart3} title={t('Reports & daily summary')} subtitle={t('Closing report ka waqt, log aur tareeqa')} chevron onPress={() => router.push('/settings/reports' as never)} />
            <ListRow icon={MessageCircle} title={t('WhatsApp messages')} subtitle={t('Bill, udhaar aur shukriya ke message')} chevron onPress={() => router.push('/settings/whatsapp' as never)} />
          </SettingsGroup>
        </>
      )}
    </SettingsTemplate>
  );
}

export const NotificationsSettingsScreen = ownerOnly(NotificationSettings, 'Notifications');
