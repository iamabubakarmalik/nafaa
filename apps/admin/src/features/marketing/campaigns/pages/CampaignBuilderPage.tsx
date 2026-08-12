import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Save } from 'lucide-react';
import { campaignsApi } from '../../../../api/marketing/marketing-campaigns.api';
import { PageHeader } from '../../_shared/components/PageHeader';

export function CampaignBuilderPage() {
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [channel, setChannel] = useState<'EMAIL' | 'SMS' | 'BOTH'>('EMAIL');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailHtml, setEmailHtml] = useState('<p>Hello {{name}},</p>');
  const [smsMessage, setSmsMessage] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [tags, setTags] = useState('');

  const createMut = useMutation({
    mutationFn: campaignsApi.create,
    onSuccess: () => { toast.success('Campaign created'); nav('/marketing/campaigns'); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Create fail'),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="New Campaign" subtitle="Build your email/SMS blast" backTo="/marketing/campaigns" />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div>
            <label className="mb-1 block text-sm font-medium">Campaign Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ramzan Sale — Wave 1" className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Channel</label>
            <div className="flex gap-2">
              {(['EMAIL', 'SMS', 'BOTH'] as const).map((c) => (
                <button key={c} onClick={() => setChannel(c)} className={`rounded-lg px-4 py-2 text-sm font-medium ${
                  channel === c ? 'bg-emerald-600 text-white' : 'border border-neutral-300 bg-white text-neutral-700'
                }`}>{c}</button>
              ))}
            </div>
          </div>

          {(channel === 'EMAIL' || channel === 'BOTH') && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium">Email Subject *</label>
                <input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Email HTML *</label>
                <textarea value={emailHtml} onChange={(e) => setEmailHtml(e.target.value)} rows={10} className="w-full rounded-lg border border-neutral-300 px-3 py-2 font-mono text-xs" />
              </div>
            </>
          )}

          {(channel === 'SMS' || channel === 'BOTH') && (
            <div>
              <label className="mb-1 block text-sm font-medium">SMS Message * ({smsMessage.length}/500)</label>
              <textarea value={smsMessage} onChange={(e) => setSmsMessage(e.target.value)} rows={3} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 font-semibold text-neutral-800">Audience</h3>
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags: pos-users, karachi" className="mb-3 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
            <p className="text-xs text-neutral-500">Empty = all active subscribers</p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 font-semibold text-neutral-800">Schedule</h3>
            <input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
            <p className="mt-1 text-xs text-neutral-500">Empty = save as draft</p>
          </div>

          <button
            onClick={() => {
              if (!name.trim()) { toast.error('Name zaroori'); return; }
              createMut.mutate({
                name,
                channel,
                type: 'BROADCAST' as any,
                emailSubject: emailSubject || undefined,
                emailHtml: emailHtml || undefined,
                smsMessage: smsMessage || undefined,
                audienceTags: tags ? tags.split(',').map((t) => t.trim()) : undefined,
                scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : undefined,
                draft: !scheduledFor,
              });
            }}
            disabled={createMut.isPending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> Create Campaign
          </button>
        </div>
      </div>
    </div>
  );
}
