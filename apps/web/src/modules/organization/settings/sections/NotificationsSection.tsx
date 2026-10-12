/**
 * Emails the owner gets: the morning low-stock list and the evening sales
 * summary. Both go out only while email is on.
 */

import { Calendar, Mail, Package } from 'lucide-react';
import { Alert, SectionCard, StatPill, Toggle } from '../components/UI';
import { useAutoSave } from '../hooks/useAutoSave';
import type { TenantSettings } from '../api/settings.api';
import { SaveStatusBar } from './_SaveStatus';

export function NotificationsSection({ settings }: { settings: TenantSettings }) {
  const { draft, set, saving, dirty } = useAutoSave(settings);
  const email = draft.emailNotifications;

  return (
    <div className="space-y-4">
      <SaveStatusBar saving={saving} dirty={dirty} />

      <SectionCard title="Email" desc="Malik ke email par report" icon={Mail} color="rose"
        badge={<StatPill label="" value={email ? 'Chalu' : 'Band'} tone={email ? 'emerald' : 'slate'} />}>
        <Toggle checked={email} onChange={(v) => set('emailNotifications', v)} icon={Mail}
          label="Email Notifications" desc="Band karein to neeche wali koi email nahi jayegi" />
      </SectionCard>

      <SectionCard title="Kya bhejein" desc="Pakistan ke waqt ke mutabiq, roz" icon={Calendar} color="amber">
        <Toggle checked={draft.notifyLowStock} onChange={(v) => set('notifyLowStock', v)} icon={Package} disabled={!email}
          label="Low Stock Alerts" desc="Subah 9 baje: kam aur khatam stock wale products ki list" />
        <Toggle checked={draft.notifyDailySummary} onChange={(v) => set('notifyDailySummary', v)} icon={Calendar} disabled={!email}
          label="Send Daily Sales Summary" desc="Raat 9 baje: aaj ki sale, munafa aur udhaar" />
        {!email && <Alert tone="amber">Email band hai — pehle upar se chalu karein.</Alert>}
      </SectionCard>
    </div>
  );
}
