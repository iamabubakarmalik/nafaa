/**
 * Notifications: the store's email switch, the morning low-stock email and
 * the daily closing report, plus a test notification to the bell. The daily
 * report's time, people and channels are set on the Reports page.
 */

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BarChart3, Bell, BellRing, Calendar, Mail, MessageCircle, Package } from 'lucide-react';
import { Button, Badge, Alert } from '@/design-system/components';
import { settingsApi, type TenantSettings } from '../api/settings.api';
import { PageLink, SectionCard, Toggle } from '../components/SettingsBlocks';
import { useAutoSave } from '../hooks/useAutoSave';
import { SaveStatusBar } from './_SaveStatus';
import { t as tr } from '@core/i18n';

/** "21:00" → "9:00 pm" */
const clock = (t?: string) => {
  const [h, m] = (t || '21:00').split(':').map(Number);
  if (!Number.isFinite(h)) return t ?? '';
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m || 0).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
};

export function NotificationsSection({ settings }: { settings: TenantSettings }) {
  const { draft, set, saving, dirty } = useAutoSave(settings);
  const email = draft.emailNotifications;

  const test = useMutation({
    mutationFn: () => settingsApi.testNotif('push'),
    onSuccess: () => toast.success(tr('Test notification bhej di — upar ghanti dekhein')),
    onError: (e: any) => toast.error(e?.response?.data?.message || tr('Test notification nahi gayi')),
  });

  return (
    <div className="space-y-4">
      <SaveStatusBar saving={saving} dirty={dirty} />

      <SectionCard title={tr('Email notifications')} desc={tr('Malik ke email par store ki khabrein')} icon={Mail} color="rose"
        badge={<Badge size="xs" variant={email ? 'success' : 'default'}>{email ? tr('Chalu') : tr('Band')}</Badge>}>
        <Toggle checked={email} onChange={(v) => set('emailNotifications', v)} icon={Mail}
          label={tr('Email bhejein')} desc={tr('Band karein to neeche wali koi email nahi jayegi. Email tasdeeq shuda honi chahiye.')} />
      </SectionCard>

      <SectionCard title={tr('Kya bhejein')} desc={tr('Store ke time zone ke mutabiq, roz')} icon={Calendar} color="amber">
        <Toggle checked={draft.notifyLowStock} onChange={(v) => set('notifyLowStock', v)} icon={Package} disabled={!email}
          label={tr('Kam stock ki email')} desc={tr('Subah 9 baje: kam aur khatam stock wale products ki list')} />
        <Toggle checked={draft.notifyDailySummary} onChange={(v) => set('notifyDailySummary', v)} icon={BarChart3}
          label={tr('Rozana Sale ki email (closing report)')}
          desc={tr('Roz {{dailySummaryTime}} par: aaj ki Sale, Profit aur udhaar. Waqt aur log \'Reports & daily summary\' me.', { dailySummaryTime: clock(draft.dailySummaryTime) })} />
        {!email && <Alert className="mt-3" tone="warning">{tr('Email band hai — kam stock ki email nahi jayegi. Closing report phir bhi app ki ghanti me aati hai.')}</Alert>}
      </SectionCard>

      <SectionCard title={tr('Test notification')} desc={tr('Dekhein ke notifications pohnch rahi hain')} icon={BellRing} color="blue"
        action={<Button size="sm" variant="secondary" loading={test.isPending} onClick={() => test.mutate()} leftIcon={<Bell className="h-4 w-4" />}>{tr('Test bhejein')}</Button>}>
        <p className="text-sm text-slate-600">{tr('Ek test notification aap ki ghanti (upar wala bell icon) me aayegi. Na aaye to internet aur login check karein.')}</p>
      </SectionCard>

      <SectionCard title={tr('Aur messages')} desc={tr('Report aur customer messages ki settings')} icon={MessageCircle} color="slate">
        <div className="grid gap-2 sm:grid-cols-2">
          <PageLink to="/settings/reports" icon={BarChart3} title={tr('Reports & daily summary')} desc={tr('Closing report ka waqt, log aur tareeqa')} />
          <PageLink to="/settings/whatsapp" icon={MessageCircle} title={tr('WhatsApp messages')} desc={tr('Bill, udhaar aur shukriya ke message')} />
        </div>
      </SectionCard>
    </div>
  );
}
