import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Bell, Mail, MessageSquare, Smartphone, Send, MessageCircle,
  Package, PackageX, ShoppingCart, UserPlus, Calendar, Clock,
} from 'lucide-react';
import { settingsApi } from '@modules/organization/settings/api/settings.api';
import { Field, TextInput, Toggle, SectionCard, Alert, Divider } from '../components/UI';
import { Button } from '@core/ui/Button';
import { useAutoSave } from '../hooks/useAutoSave';
import type { TenantSettings } from '../api/settings.api';
import { SaveStatusBar } from './_SaveStatus';

export function NotificationsSection({ settings }: { settings: TenantSettings }) {
  const { draft, set, saving, dirty } = useAutoSave(settings);

  const testMutation = useMutation({
    mutationFn: (channel: 'email' | 'sms' | 'push') => settingsApi.testNotif(channel),
    onSuccess: (data: any, channel) => toast.success(data?.message || `Test ${channel} bhej diya ✅`),
    onError: (_e, channel) => toast.error(`Test ${channel} fail — settings check karo`),
  });

  const activeChannels = [
    draft.emailNotifications && 'Email',
    draft.smsNotifications && 'SMS',
    draft.whatsappNotifications && 'WhatsApp',
    draft.pushNotifications && 'Push',
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      <SaveStatusBar saving={saving} dirty={dirty} />

      {/* Channels */}
      <SectionCard
        title="Notification Channels"
        desc={`${activeChannels} channel${activeChannels !== 1 ? 's' : ''} enabled`}
        icon={Bell}
        color="rose"
      >
        <Toggle
          checked={draft.emailNotifications}
          onChange={(v) => set('emailNotifications', v)}
          label="Email Notifications"
          desc="SMTP/SES ke through emails"
          icon={Mail}
        />
        <Toggle
          checked={draft.smsNotifications}
          onChange={(v) => set('smsNotifications', v)}
          label="SMS Notifications"
          desc="Text messages (per SMS charges apply)"
          icon={MessageSquare}
        />
        <Toggle
          checked={draft.whatsappNotifications}
          onChange={(v) => set('whatsappNotifications', v)}
          label="WhatsApp Notifications"
          desc="WhatsApp Business API required (Integrations me setup karo)"
          icon={MessageCircle}
        />
        <Toggle
          checked={draft.pushNotifications}
          onChange={(v) => set('pushNotifications', v)}
          label="Push Notifications (Mobile)"
          desc="Nafaa mobile app par push"
          icon={Smartphone}
        />

        <Divider label="Test Channels" />

        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => testMutation.mutate('email')}
            loading={testMutation.isPending && testMutation.variables === 'email'}
            disabled={!draft.emailNotifications || testMutation.isPending}
            className="font-extrabold"
          >
            <Mail className="h-3.5 w-3.5" /> Test Email
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => testMutation.mutate('sms')}
            loading={testMutation.isPending && testMutation.variables === 'sms'}
            disabled={!draft.smsNotifications || testMutation.isPending}
            className="font-extrabold"
          >
            <MessageSquare className="h-3.5 w-3.5" /> Test SMS
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => testMutation.mutate('push')}
            loading={testMutation.isPending && testMutation.variables === 'push'}
            disabled={!draft.pushNotifications || testMutation.isPending}
            className="font-extrabold"
          >
            <Smartphone className="h-3.5 w-3.5" /> Test Push
          </Button>
        </div>
      </SectionCard>

      {/* Event triggers */}
      <SectionCard title="Event Triggers" desc="Kis event pe notification bheje" icon={Send} color="amber">
        <Toggle
          checked={draft.notifyLowStock}
          onChange={(v) => set('notifyLowStock', v)}
          label="Low Stock Alerts"
          desc="Stock kam ho jane pe warning"
          icon={Package}
        />
        <Toggle
          checked={draft.notifyOutOfStock}
          onChange={(v) => set('notifyOutOfStock', v)}
          label="Out of Stock Alerts"
          desc="Stock zero hote hi turant notify"
          icon={PackageX}
        />
        <Toggle
          checked={draft.notifyNewSale}
          onChange={(v) => set('notifyNewSale', v)}
          label="New Sale"
          desc="Har sale par owner ko notify (dashboard away ho to)"
          icon={ShoppingCart}
        />
        <Toggle
          checked={draft.notifyNewCustomer}
          onChange={(v) => set('notifyNewCustomer', v)}
          label="New Customer Added"
          desc="Jab naya customer register ho"
          icon={UserPlus}
        />
      </SectionCard>

      {/* Daily summary */}
      <SectionCard title="Daily Summary" desc="Roz ki sales ki khulasa" icon={Calendar} color="blue">
        <Toggle
          checked={draft.notifyDailySummary}
          onChange={(v) => set('notifyDailySummary', v)}
          label="Send Daily Sales Summary"
          desc="Roz ek email/SMS me — kitni sale, kitna profit, kitna udhaar"
          icon={Calendar}
        />

        {draft.notifyDailySummary && (
          <>
            <Divider />
            <Field label="Summary Time" hint="Har roz is waqt summary bhejegi (shop close time recommended)">
              <TextInput
                type="time"
                value={draft.dailySummaryTime}
                onChange={(v: string) => set('dailySummaryTime', v)}
                prefix={<Clock className="h-4 w-4" />}
              />
            </Field>
          </>
        )}
      </SectionCard>

      <Alert tone="blue" icon={Bell}>
        SMS aur WhatsApp ke liye <strong>Integrations</strong> me pehle SMS Gateway ya WhatsApp Business API setup karo, warna test fail hoga.
      </Alert>
    </div>
  );
}
