/**
 * One contact form ticket: the message, earlier replies, a reply form (email,
 * optional SMS, mark resolved), and status, priority and spam actions.
 */

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Ban, CheckCircle, Flag, Reply, Send } from 'lucide-react';
import { Button, Card, Checkbox, Input, PageHero, PageShell, Select, Skeleton, Textarea, confirmDialog } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { contactFormsApi } from '@/api/marketing/marketing-contact-forms.api';
import { formatDate, formatRelative } from '@/lib/format';
import { DetailList, statusLabel } from '@/ui';
import { GuideButton } from '../../lib/kit';

const STATUSES = ['NEW', 'IN_PROGRESS', 'REPLIED', 'RESOLVED', 'ARCHIVED'];
const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

export function ContactFormDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const guide = usePageGuide();
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [markResolved, setMarkResolved] = useState(false);
  const [sendSms, setSendSms] = useState(false);

  const { data: form, isLoading } = useQuery({ queryKey: ['mkt', 'contact-form', id], queryFn: () => contactFormsApi.detail(id!), enabled: !!id });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['mkt', 'contact-form', id] }); qc.invalidateQueries({ queryKey: ['mkt', 'contact-forms'] }); };

  const replyMut = useMutation({
    mutationFn: (body: any) => contactFormsApi.reply(id!, body),
    onSuccess: () => { toast.success('Reply sent'); setMessage(''); setSubject(''); setMarkResolved(false); refresh(); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Could not send the reply'),
  });
  const spamMut = useMutation({ mutationFn: () => contactFormsApi.markSpam(id!), onSuccess: () => { toast.success('Marked as spam'); refresh(); } });
  const updateMut = useMutation({
    mutationFn: (body: any) => contactFormsApi.update(id!, body),
    onSuccess: () => { toast.success('Updated'); refresh(); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Could not update'),
  });

  if (isLoading || !form) {
    return <PageShell><PageHero title="Contact form" back="/marketing/contact-forms" loading /><Skeleton className="h-64 rounded-3xl" /></PageShell>;
  }

  return (
    <PageShell>
      <PageHero
        title={form.subject}
        back="/marketing/contact-forms"
        backLabel="Contact forms"
        chip={statusLabel(form.status)}
        meta={`Ticket ${form.ticketNumber}`}
        actions={<GuideButton onClick={guide.open} />}
        stats={[
          { label: 'Status', value: statusLabel(form.status) },
          { label: 'Priority', value: statusLabel(form.priority) },
          { label: 'Replies', value: form.replies?.length ?? 0 },
          { label: 'Received', value: formatRelative(form.createdAt) },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card title={form.fullName} description={form.email} actions={<span className="text-[0.75rem] text-slate-500">{formatDate(form.createdAt)}</span>}>
            <p className="whitespace-pre-wrap text-[0.875rem] text-slate-800">{form.message}</p>
          </Card>

          {form.replies?.map((r: any) => (
            <Card key={r.id} title={r.senderType === 'ADMIN' ? 'Nafaa team' : form.fullName} actions={<span className="text-[0.75rem] text-slate-500">{formatDate(r.createdAt)}</span>} className={r.senderType === 'ADMIN' ? 'ring-brand-200' : undefined}>
              <p className="whitespace-pre-wrap text-[0.875rem] text-slate-800">{r.message}</p>
            </Card>
          ))}

          {form.status !== 'SPAM' && form.status !== 'ARCHIVED' && (
            <Card title="Reply" description="The reply goes to the sender's email.">
              <div className="space-y-3">
                <Input label="Subject (optional)" value={subject} onChange={(e) => setSubject(e.target.value)} />
                <Textarea label="Message" value={message} onChange={(e) => setMessage(e.target.value)} rows={5} />
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <Checkbox label="Mark resolved" checked={markResolved} onChange={(e) => setMarkResolved(e.target.checked)} />
                  <Checkbox label={form.phone ? 'Also send SMS' : 'Also send SMS (no phone number)'} checked={sendSms} onChange={(e) => setSendSms(e.target.checked)} disabled={!form.phone} />
                </div>
                <Button leftIcon={<Send className="h-4 w-4" />} loading={replyMut.isPending} onClick={() => {
                  if (!message.trim()) { toast.error('Write a message first'); return; }
                  replyMut.mutate({ subject: subject || undefined, message, markResolved, sendSms });
                }}>Send reply</Button>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card title="Sender">
            <DetailList items={[
              { label: 'Name', value: form.fullName },
              { label: 'Email', value: form.email },
              { label: 'Phone', value: form.phone },
              { label: 'Company', value: form.companyName },
              { label: 'Form', value: statusLabel(form.formType) },
            ]} />
          </Card>
          <Card title="Actions">
            <div className="space-y-3">
              <Select label="Status" value={form.status === 'SPAM' ? '' : form.status} placeholder={form.status === 'SPAM' ? 'Spam' : undefined} onChange={(e) => e.target.value && updateMut.mutate({ status: e.target.value })} options={STATUSES.map((v) => ({ value: v, label: statusLabel(v) }))} />
              <Select label="Priority" value={form.priority} onChange={(e) => updateMut.mutate({ priority: e.target.value })} options={PRIORITIES.map((v) => ({ value: v, label: statusLabel(v) }))} />
              <Button variant="critical" fullWidth leftIcon={<Ban className="h-4 w-4" />} onClick={async () => {
                if (await confirmDialog({ title: 'Mark as spam?', text: 'The ticket moves to the Spam status.', yes: 'Mark as spam', danger: true })) spamMut.mutate();
              }}>Mark as spam</Button>
            </div>
          </Card>
        </div>
      </div>

      {guide.isOpen && (
        <PageGuide
          title="Contact form ticket"
          description="Read the message, answer it and close the ticket."
          flowTitle="Handling a ticket"
          flow={[
            { label: 'Read', hint: 'Message and sender', icon: Flag, color: '#4f46e5' },
            { label: 'Reply', hint: 'Email, optional SMS', icon: Reply, color: '#0284c7' },
            { label: 'Mark resolved', hint: 'Tick on send', icon: CheckCircle, color: '#059669' },
          ]}
          steps={[
            { icon: Reply, color: '#0284c7', title: 'Reply', text: 'Write the answer and send it. Tick Mark resolved to close the ticket in one step.' },
            { icon: Flag, color: '#d97706', title: 'Set priority', text: 'Raise urgent tickets so they show first in the list.' },
            { icon: Ban, color: '#e11d48', title: 'Spam', text: 'Mark junk as spam. You will be asked to confirm.' },
          ]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
