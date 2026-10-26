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
    onSuccess: () => toast.success('Test notification bhej di — upar ghanti dekhein'),
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Test notification nahi gayi'),
  });

  return (
    <div className="space-y-4">
      <SaveStatusBar saving={saving} dirty={dirty} />

      <SectionCard title="Email notifications" desc="Malik ke email par store ki khabrein" icon={Mail} color="rose"
        badge={<Badge size="xs" variant={email ? 'success' : 'default'}>{email ? 'Chalu' : 'Band'}</Badge>}>
        <Toggle checked={email} onChange={(v) => set('emailNotifications', v)} icon={Mail}
          label="Email bhejein" desc="Band karein to neeche wali koi email nahi jayegi. Email tasdeeq shuda honi chahiye." />
      </SectionCard>

      <SectionCard title="Kya bhejein" desc="Store ke time zone ke mutabiq, roz" icon={Calendar} color="amber">
        <Toggle checked={draft.notifyLowStock} onChange={(v) => set('notifyLowStock', v)} icon={Package} disabled={!email}
          label="Kam stock ki email" desc="Subah 9 baje: kam aur khatam stock wale products ki list" />
        <Toggle checked={draft.notifyDailySummary} onChange={(v) => set('notifyDailySummary', v)} icon={BarChart3}
          label="Rozana Sale ki email (closing report)"
          desc={`Roz ${clock(draft.dailySummaryTime)} par: aaj ki Sale, Profit aur udhaar. Waqt aur log 'Reports & daily summary' me.`} />
        {!email && <Alert className="mt-3" tone="warning">Email band hai — kam stock ki email nahi jayegi. Closing report phir bhi app ki ghanti me aati hai.</Alert>}
      </SectionCard>

      <SectionCard title="Test notification" desc="Dekhein ke notifications pohnch rahi hain" icon={BellRing} color="blue"
        action={<Button size="sm" variant="secondary" loading={test.isPending} onClick={() => test.mutate()} leftIcon={<Bell className="h-4 w-4" />}>Test bhejein</Button>}>
        <p className="text-sm text-slate-600">Ek test notification aap ki ghanti (upar wala bell icon) me aayegi. Na aaye to internet aur login check karein.</p>
      </SectionCard>

      <SectionCard title="Aur messages" desc="Report aur customer messages ki settings" icon={MessageCircle} color="slate">
        <div className="grid gap-2 sm:grid-cols-2">
          <PageLink to="/settings/reports" icon={BarChart3} title="Reports & daily summary" desc="Closing report ka waqt, log aur tareeqa" />
          <PageLink to="/settings/whatsapp" icon={MessageCircle} title="WhatsApp messages" desc="Bill, udhaar aur shukriya ke message" />
        </div>
      </SectionCard>
    </div>
  );
}
