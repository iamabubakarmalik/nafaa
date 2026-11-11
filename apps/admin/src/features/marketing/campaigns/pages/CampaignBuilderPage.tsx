/**
 * New campaign: name, channel (email, SMS or both), message, audience tags
 * and an optional send time. Without a time it is saved as a draft.
 */

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { CalendarClock, Mail, PenLine, Save, Send, Users } from 'lucide-react';
import { Button, Card, Input, PageHero, PageShell, Segmented, Textarea } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { campaignsApi } from '@/api/marketing/marketing-campaigns.api';
import { GuideButton } from '../../lib/kit';

const CHANNELS = [{ value: 'EMAIL', label: 'Email' }, { value: 'SMS', label: 'SMS' }, { value: 'BOTH', label: 'Email and SMS' }] as const;

export function CampaignBuilderPage() {
  const nav = useNavigate();
  const guide = usePageGuide();
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
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Could not create the campaign'),
  });

  const save = () => {
    if (!name.trim()) { toast.error('Give the campaign a name'); return; }
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
  };

  return (
    <PageShell>
      <PageHero
        title="New campaign"
        back="/marketing/campaigns"
        backLabel="Campaigns"
        actions={<><Button leftIcon={<Save className="h-4 w-4" />} loading={createMut.isPending} onClick={save}>Create campaign</Button><GuideButton onClick={guide.open} /></>}
        stats={[
          { label: 'Channel', value: CHANNELS.find((c) => c.value === channel)?.label },
          { label: 'Audience', value: tags.trim() ? `${tags.split(',').filter((t) => t.trim()).length} tags` : 'All active' },
          { label: 'When', value: scheduledFor ? 'Scheduled' : 'Draft' },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card title="Message">
            <div className="space-y-4">
              <Input label="Campaign name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Eid sale, wave 1" />
              <div>
                <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Channel</span>
                <Segmented value={channel} onChange={setChannel} items={CHANNELS} label="Channel" />
              </div>
              {(channel === 'EMAIL' || channel === 'BOTH') && (
                <>
                  <Input label="Email subject" required value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
                  <Textarea label="Email HTML" required value={emailHtml} onChange={(e) => setEmailHtml(e.target.value)} rows={10} className="font-mono text-xs" hint="Use {{name}} to add the subscriber's name." />
                </>
              )}
              {(channel === 'SMS' || channel === 'BOTH') && (
                <Textarea label={`SMS message (${smsMessage.length}/500)`} required value={smsMessage} onChange={(e) => setSmsMessage(e.target.value)} rows={3} maxLength={500} />
              )}
            </div>
          </Card>
        </div>
        <div className="space-y-4">
          <Card title="Audience">
            <Input label="Tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="pos-users, karachi" hint="Comma separated. Empty means all active subscribers." />
          </Card>
          <Card title="Schedule">
            <Input label="Send at" type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} hint="Empty means save as a draft." />
          </Card>
        </div>
      </div>

      {guide.isOpen && (
        <PageGuide
          title="New campaign"
          description="Write one message and choose who gets it."
          flowTitle="Building a campaign"
          flow={[
            { label: 'Name it', hint: 'For your team', icon: PenLine, color: '#4f46e5' },
            { label: 'Write', hint: 'Email and or SMS', icon: Mail, color: '#0284c7' },
            { label: 'Pick audience', hint: 'Tags', icon: Users, color: '#d97706' },
            { label: 'Schedule or save', hint: 'Draft by default', icon: CalendarClock, color: '#059669' },
          ]}
          steps={[
            { icon: Mail, color: '#0284c7', title: 'Message', text: 'Email needs a subject and HTML body. SMS is limited to 500 characters.' },
            { icon: Users, color: '#d97706', title: 'Audience', text: 'Add tags to reach part of the list. Leave it empty to reach all active subscribers.' },
            { icon: Send, color: '#059669', title: 'Launch later', text: 'Without a send time the campaign is saved as a draft. Launch it from the campaigns list.' },
          ]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
