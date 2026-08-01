import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bell, Mail, MessageSquare, Smartphone, Send } from 'lucide-react';
import { settingsApi } from '@modules/organization/settings/api/settings.api';
import { Field, TextInput, Toggle, SectionCard } from '../components/UI';
import { Button } from '@core/ui/Button';

export default function NotificationsSection({ s, set }: any) {
  const qc = useQueryClient();

  const testMutation = useMutation({
    mutationFn: (channel: 'email' | 'sms' | 'push') => settingsApi.testNotif(channel),
    onSuccess: (data: any) => toast.success(data?.message || 'Test bhej diya'),
    onError: () => toast.error('Test fail'),
  });

  return (
    <div className="space-y-5">
      <SectionCard title="Notification Channels" desc="Kaunse channels enabled karne hain" icon={Bell} color="orange">
        <Toggle checked={s.emailNotifications} onChange={(v: boolean) => set('emailNotifications', v)} label="📧 Email notifications" desc="Emails via SMTP/SES" />
        <Toggle checked={s.smsNotifications} onChange={(v: boolean) => set('smsNotifications', v)} label="📨 SMS notifications" desc="SMS (charges apply)" />
        <Toggle checked={s.whatsappNotifications} onChange={(v: boolean) => set('whatsappNotifications', v)} label="💬 WhatsApp" desc="WhatsApp Business API required" />
        <Toggle checked={s.pushNotifications} onChange={(v: boolean) => set('pushNotifications', v)} label="📱 Push (Mobile)" desc="Mobile app push notifications" />

        <div className="mt-4 flex gap-2 flex-wrap">
          <Button size="sm" variant="secondary" onClick={() => testMutation.mutate('email')} disabled={testMutation.isPending}>
            <Mail className="h-3.5 w-3.5" /> Test Email
          </Button>
          <Button size="sm" variant="secondary" onClick={() => testMutation.mutate('sms')} disabled={testMutation.isPending}>
            <MessageSquare className="h-3.5 w-3.5" /> Test SMS
          </Button>
          <Button size="sm" variant="secondary" onClick={() => testMutation.mutate('push')} disabled={testMutation.isPending}>
            <Smartphone className="h-3.5 w-3.5" /> Test Push
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Event Triggers" desc="Kaunse events par notify karna hai" icon={Send} color="orange">
        <Toggle checked={s.notifyLowStock} onChange={(v: boolean) => set('notifyLowStock', v)} label="Low stock alerts" />
        <Toggle checked={s.notifyOutOfStock} onChange={(v: boolean) => set('notifyOutOfStock', v)} label="Out of stock alerts" />
        <Toggle checked={s.notifyNewSale} onChange={(v: boolean) => set('notifyNewSale', v)} label="New sale" desc="Har sale par notification" />
        <Toggle checked={s.notifyNewCustomer} onChange={(v: boolean) => set('notifyNewCustomer', v)} label="New customer" />
      </SectionCard>

      <SectionCard title="Daily Summary" desc="Roz report bhejo" icon={Bell} color="orange">
        <Toggle checked={s.notifyDailySummary} onChange={(v: boolean) => set('notifyDailySummary', v)} label="Send daily sales summary" />
        {s.notifyDailySummary && (
          <div className="mt-4">
            <Field label="Summary Time" hint="Roz is time pe summary aayegi">
              <TextInput type="time" value={s.dailySummaryTime} onChange={(v: string) => set('dailySummaryTime', v)} />
            </Field>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
