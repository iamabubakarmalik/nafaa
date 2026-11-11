/**
 * Bulk send: one email, one SMS or both to the owners of many shops (all,
 * active, trial or suspended), from a template or a custom message.
 */

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FileText, Lightbulb, Mail, MessageSquare, Send, Users } from 'lucide-react';
import { Button, Card, Input, PageHero, PageShell, Segmented, Select, Textarea, confirmDialog, heroButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminCommunicationsApi } from '@/api/admin-communications.api';
import { adminEmailTemplatesApi } from '@/api/admin-email-templates.api';
import { errMsg, num } from '@/features/shared/kit';

type Channel = 'EMAIL' | 'SMS' | 'BOTH';
type Target = 'ALL' | 'ACTIVE' | 'TRIAL' | 'SUSPENDED';
const TARGETS: Array<{ id: Target; label: string; hint: string }> = [
  { id: 'ALL', label: 'All shops', hint: 'Every shop on Nafaa' },
  { id: 'ACTIVE', label: 'Active shops', hint: 'Paying shops' },
  { id: 'TRIAL', label: 'Trial shops', hint: 'On a free trial' },
  { id: 'SUSPENDED', label: 'Suspended shops', hint: 'Cannot sign in' },
];

export default function BulkCommunicationsPage() {
  const guide = usePageGuide();
  const [channel, setChannel] = useState<Channel>('EMAIL');
  const [target, setTarget] = useState<Target>('ACTIVE');
  const [emailTemplateSlug, setEmailTemplateSlug] = useState('');
  const [smsTemplateSlug, setSmsTemplateSlug] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [smsMessage, setSmsMessage] = useState('');

  // The pickers only need active templates; the list is paged and capped on the server.
  const emailTemplates = useQuery({ queryKey: ['admin-email-templates', 'picker'], queryFn: () => adminEmailTemplatesApi.paged({ active: 'yes', limit: 100 }) });
  const smsTemplates = useQuery({ queryKey: ['admin-sms-templates', 'picker'], queryFn: () => adminCommunicationsApi.pagedSmsTemplates({ active: 'yes', limit: 100 }) });
  const emailStats = useQuery({ queryKey: ['admin-delivery-stats', 'email'], queryFn: adminCommunicationsApi.emailStats, staleTime: 30_000 });
  const smsStats = useQuery({ queryKey: ['admin-delivery-stats', 'sms'], queryFn: adminCommunicationsApi.smsStats, staleTime: 30_000 });

  const send = useMutation({
    mutationFn: adminCommunicationsApi.bulkSend,
    onSuccess: (d: { emailsSent: number; smsSent: number; totalTenants: number; failed: number }) => {
      toast.success(`Sent ${num(d.emailsSent)} emails and ${num(d.smsSent)} SMS to ${num(d.totalTenants)} shops${d.failed ? ` (${num(d.failed)} failed)` : ''}`);
      setEmailSubject(''); setEmailBody(''); setSmsMessage('');
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const wantsEmail = channel === 'EMAIL' || channel === 'BOTH';
  const wantsSms = channel === 'SMS' || channel === 'BOTH';
  const emailOk = !wantsEmail || !!emailTemplateSlug || (!!emailSubject.trim() && !!emailBody.trim());
  const smsOk = !wantsSms || !!smsTemplateSlug || !!smsMessage.trim();
  const targetLabel = TARGETS.find((t) => t.id === target)!.label.toLowerCase();

  const submit = async () => {
    const what = channel === 'BOTH' ? 'An email and an SMS' : channel === 'EMAIL' ? 'An email' : 'An SMS';
    if (!(await confirmDialog({ title: 'Send to many shops?', text: `${what} goes to the owner of ${targetLabel}. It cannot be recalled.`, yes: 'Send now' }))) return;
    send.mutate({
      channel, target,
      emailTemplateSlug: wantsEmail ? emailTemplateSlug || undefined : undefined,
      smsTemplateSlug: wantsSms ? smsTemplateSlug || undefined : undefined,
      emailSubject: wantsEmail ? emailSubject || undefined : undefined,
      emailBody: wantsEmail ? emailBody || undefined : undefined,
      smsMessage: wantsSms ? smsMessage || undefined : undefined,
    });
  };

  const tplOptions = (items: Array<{ id: string; slug: string; name: string }> = []) => [{ value: '', label: 'Custom message' }, ...items.map((t) => ({ value: t.slug, label: `${t.name} (${t.slug})` }))];

  return (
    <PageShell>
      <PageHero
        title="Bulk send"
        busy={send.isPending}
        actions={<button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>}
        stats={[
          { label: 'Emails today', value: num(emailStats.data?.today) },
          { label: 'SMS today', value: num(smsStats.data?.today) },
          { label: 'Email templates', value: num(emailTemplates.data?.stats.active), hint: 'Active' },
          { label: 'SMS templates', value: num(smsTemplates.data?.stats.active), hint: 'Active' },
        ]}
      />

      <section className="grid gap-4 xl:grid-cols-2">
        <Card title="Who and how" description="The message goes to the owner of each shop.">
          <div className="space-y-4">
            <div>
              <span className="mb-1.5 block text-[0.75rem] font-medium text-slate-600">Channel</span>
              <Segmented value={channel} onChange={setChannel} label="Channel" items={[{ value: 'EMAIL', label: 'Email' }, { value: 'SMS', label: 'SMS' }, { value: 'BOTH', label: 'Email and SMS' }]} />
            </div>
            <div>
              <span className="mb-1.5 block text-[0.75rem] font-medium text-slate-600">Shops</span>
              <div className="grid grid-cols-2 gap-2">
                {TARGETS.map((t) => (
                  <button key={t.id} type="button" aria-pressed={target === t.id} onClick={() => setTarget(t.id)}
                    className={`rounded-xl border-2 p-3 text-start transition ${target === t.id ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:border-slate-300'}`}>
                    <div className="text-[0.875rem] font-semibold text-slate-900">{t.label}</div>
                    <div className="text-[0.6875rem] text-slate-500">{t.hint}</div>
                  </button>
                ))}
              </div>
            </div>
            <Button leftIcon={<Send className="h-4 w-4" />} loading={send.isPending} disabled={!emailOk || !smsOk} onClick={submit}>Send to {targetLabel}</Button>
          </div>
        </Card>

        <div className="space-y-4">
          {wantsEmail && (
            <Card title="Email" actions={<Mail className="h-4 w-4 text-slate-400" />}>
              <div className="space-y-3">
                <Select label="Template" value={emailTemplateSlug} onChange={(e) => setEmailTemplateSlug(e.target.value)} options={tplOptions(emailTemplates.data?.items)} />
                {!emailTemplateSlug && (
                  <>
                    <Input label="Subject" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="Important update" />
                    <Textarea label="HTML body" rows={6} className="font-mono text-xs" value={emailBody} onChange={(e) => setEmailBody(e.target.value)} placeholder="<h1>Hello {{name}}</h1>" />
                  </>
                )}
              </div>
            </Card>
          )}
          {wantsSms && (
            <Card title="SMS" actions={<MessageSquare className="h-4 w-4 text-slate-400" />}>
              <div className="space-y-3">
                <Select label="Template" value={smsTemplateSlug} onChange={(e) => setSmsTemplateSlug(e.target.value)} options={tplOptions(smsTemplates.data?.items)} />
                {!smsTemplateSlug && (
                  <Textarea label="Message" rows={4} value={smsMessage} onChange={(e) => setSmsMessage(e.target.value)} placeholder="Hi {{name}}, important update..."
                    hint={`${smsMessage.length} characters, ${Math.ceil(smsMessage.length / 160) || 1} SMS`} />
                )}
              </div>
            </Card>
          )}
        </div>
      </section>

      {guide.isOpen && (
        <PageGuide
          title="Bulk send"
          description="Send an email, an SMS or both to the owners of many shops."
          flowTitle="How a bulk send works"
          flow={[
            { label: 'Choose channel', hint: 'Email, SMS or both', icon: Mail, color: '#4f46e5' },
            { label: 'Choose shops', hint: 'All, active, trial…', icon: Users, color: '#0284c7' },
            { label: 'Pick content', hint: 'Template or custom', icon: FileText, color: '#d97706' },
            { label: 'Send', hint: 'Check Logs after', icon: Send, color: '#059669' },
          ]}
          steps={[
            { icon: Users, color: '#0284c7', title: 'Pick shops', text: 'Each shop’s owner gets the message. Shops without an owner or phone are skipped.' },
            { icon: FileText, color: '#d97706', title: 'Use a template', text: 'Templates fill {{name}} and {{shopName}} for each owner. Or write a custom message.' },
            { icon: Send, color: '#059669', title: 'Check the result', text: 'The result shows how many were sent. Open Email logs or SMS logs to see each message.' },
          ]}
          tips={['A bulk send cannot be recalled.', 'Send a test from the logs pages first.']}
          shortcuts={[['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
