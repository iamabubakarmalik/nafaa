import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Send, Mail, MessageSquare, Users } from 'lucide-react';
import { adminCommunicationsApi } from '@/api/admin-communications.api';
import { adminEmailTemplatesApi } from '@/api/admin-email-templates.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';

type Channel = 'EMAIL' | 'SMS' | 'BOTH';
type Target = 'ALL' | 'ACTIVE' | 'TRIAL' | 'SUSPENDED';

export default function BulkCommunicationsPage() {
  const [channel, setChannel] = useState<Channel>('EMAIL');
  const [target, setTarget] = useState<Target>('ACTIVE');
  const [emailTemplateSlug, setEmailTemplateSlug] = useState('');
  const [smsTemplateSlug, setSmsTemplateSlug] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [smsMessage, setSmsMessage] = useState('');

  const { data: emailTemplates = [] } = useQuery({
    queryKey: ['admin-email-templates'],
    queryFn: adminEmailTemplatesApi.list,
  });

  const { data: smsTemplates = [] } = useQuery({
    queryKey: ['admin-sms-templates'],
    queryFn: adminCommunicationsApi.listSmsTemplates,
  });

  const sendMutation = useMutation({
    mutationFn: adminCommunicationsApi.bulkSend,
    onSuccess: (data: any) => {
      toast.success(
        `Sent: ${data.emailsSent} emails, ${data.smsSent} SMS to ${data.totalTenants} tenants`,
      );
      setEmailSubject(''); setEmailBody(''); setSmsMessage('');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Send failed'),
  });

  const handleSend = () => {
    if (channel === 'EMAIL' || channel === 'BOTH') {
      if (!emailTemplateSlug && (!emailSubject || !emailBody)) {
        return toast.error('Email template ya subject/body required');
      }
    }
    if (channel === 'SMS' || channel === 'BOTH') {
      if (!smsTemplateSlug && !smsMessage) {
        return toast.error('SMS template ya message required');
      }
    }

    sendMutation.mutate({
      channel,
      target,
      emailTemplateSlug: emailTemplateSlug || undefined,
      smsTemplateSlug: smsTemplateSlug || undefined,
      emailSubject: emailSubject || undefined,
      emailBody: emailBody || undefined,
      smsMessage: smsMessage || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-violet-900 to-violet-700 text-white p-6 shadow-soft">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
          <Send className="h-3.5 w-3.5" /> Bulk Communications
        </div>
        <h2 className="mt-3 text-3xl font-bold">Send to Multiple Tenants</h2>
        <p className="mt-2 text-sm text-white/80">Email, SMS, or both — to all/active/trial/suspended</p>
      </section>

      <section className="grid xl:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-xl">Configuration</h3>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Channel</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: 'EMAIL', label: 'Email Only', icon: Mail },
                { id: 'SMS', label: 'SMS Only', icon: MessageSquare },
                { id: 'BOTH', label: 'Both', icon: Send },
              ] as const).map((c) => {
                const Icon = c.icon;
                return (
                  <button key={c.id} onClick={() => setChannel(c.id)}
                    className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 ${
                      channel === c.id ? 'border-violet-500 bg-violet-50' : 'border-slate-200'
                    }`}>
                    <Icon className="h-5 w-5" />
                    <span className="text-xs font-semibold">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Target Tenants</label>
            <div className="grid grid-cols-2 gap-2">
              {(['ALL', 'ACTIVE', 'TRIAL', 'SUSPENDED'] as Target[]).map((t) => (
                <button key={t} onClick={() => setTarget(t)}
                  className={`p-3 rounded-xl border-2 ${
                    target === t ? 'border-violet-500 bg-violet-50' : 'border-slate-200'
                  }`}>
                  <div className="font-semibold text-sm">{t}</div>
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleSend} loading={sendMutation.isPending} className="w-full bg-violet-600 hover:bg-violet-700" size="lg">
            <Send className="h-4 w-4" /> Send to {target} Tenants
          </Button>
        </div>

        <div className="space-y-4">
          {(channel === 'EMAIL' || channel === 'BOTH') && (
            <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6 space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-600" />
                <h3 className="font-bold">Email Content</h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Use Template (optional)
                </label>
                <select value={emailTemplateSlug} onChange={(e) => setEmailTemplateSlug(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm">
                  <option value="">Custom message</option>
                  {emailTemplates.map((t) => (
                    <option key={t.id} value={t.slug}>{t.name} ({t.slug})</option>
                  ))}
                </select>
              </div>

              {!emailTemplateSlug && (
                <>
                  <Input label="Subject" value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Important Update" />
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">HTML Body</label>
                    <textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)}
                      rows={6} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono"
                      placeholder="<h1>Hello {{name}}</h1>" />
                  </div>
                </>
              )}
            </div>
          )}

          {(channel === 'SMS' || channel === 'BOTH') && (
            <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6 space-y-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-emerald-600" />
                <h3 className="font-bold">SMS Content</h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Use Template (optional)
                </label>
                <select value={smsTemplateSlug} onChange={(e) => setSmsTemplateSlug(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm">
                  <option value="">Custom message</option>
                  {smsTemplates.map((t) => (
                    <option key={t.id} value={t.slug}>{t.name} ({t.slug})</option>
                  ))}
                </select>
              </div>

              {!smsTemplateSlug && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Message</label>
                  <textarea value={smsMessage} onChange={(e) => setSmsMessage(e.target.value)}
                    rows={4} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Hi {{name}}, important update..." />
                  <div className="text-xs text-slate-500 mt-1">
                    {smsMessage.length} chars • {Math.ceil(smsMessage.length / 160) || 1} SMS
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
