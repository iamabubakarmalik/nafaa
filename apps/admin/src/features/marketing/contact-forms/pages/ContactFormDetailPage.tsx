import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Send, Ban, CheckCircle, Mail, Phone, Building2 } from 'lucide-react';
import { contactFormsApi } from '../../../../api/marketing/marketing-contact-forms.api';
import { PageHeader } from '../../_shared/components/PageHeader';
import { StatusBadge } from '../../_shared/components/StatusBadge';
import { format, formatDistanceToNow } from 'date-fns';

export function ContactFormDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [markResolved, setMarkResolved] = useState(false);
  const [sendSms, setSendSms] = useState(false);

  const { data: form, isLoading } = useQuery({
    queryKey: ['contact-form', id],
    queryFn: () => contactFormsApi.detail(id!),
    enabled: !!id,
  });

  const replyMut = useMutation({
    mutationFn: (body: any) => contactFormsApi.reply(id!, body),
    onSuccess: () => {
      toast.success('Reply sent!');
      setMessage('');
      setSubject('');
      qc.invalidateQueries({ queryKey: ['contact-form', id] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Send fail'),
  });

  const spamMut = useMutation({
    mutationFn: () => contactFormsApi.markSpam(id!),
    onSuccess: () => {
      toast.success('Marked as spam');
      qc.invalidateQueries({ queryKey: ['contact-form', id] });
    },
  });

  const updateMut = useMutation({
    mutationFn: (body: any) => contactFormsApi.update(id!, body),
    onSuccess: () => {
      toast.success('Updated');
      qc.invalidateQueries({ queryKey: ['contact-form', id] });
    },
  });

  if (isLoading || !form) {
    return <div className="h-40 animate-pulse rounded-2xl bg-white" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={form.subject}
        subtitle={`Ticket ${form.ticketNumber}`}
        backTo="/marketing/contact-forms"
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={form.priority} />
            <StatusBadge status={form.status} />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <p className="font-semibold text-neutral-900">{form.fullName}</p>
                <p className="text-xs text-neutral-500">{form.email}</p>
              </div>
              <span className="text-xs text-neutral-400">
                {formatDistanceToNow(new Date(form.createdAt), { addSuffix: true })}
              </span>
            </div>
            <p className="whitespace-pre-wrap text-sm text-neutral-700">{form.message}</p>
          </div>

          {form.replies && form.replies.map((r: any) => (
            <div key={r.id} className={`rounded-2xl border p-5 shadow-sm ${
              r.senderType === 'ADMIN' ? 'border-emerald-200 bg-emerald-50/50 ml-8' : 'border-neutral-200 bg-white mr-8'
            }`}>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium text-neutral-700">
                  {r.senderType === 'ADMIN' ? '👤 Admin' : form.fullName}
                </p>
                <span className="text-xs text-neutral-400">
                  {format(new Date(r.createdAt), 'PPp')}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-neutral-700">{r.message}</p>
            </div>
          ))}

          {form.status !== 'SPAM' && form.status !== 'ARCHIVED' && (
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 font-semibold text-neutral-800">Reply</h3>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject (optional)"
                className="mb-3 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder="Aap ka jawab likhein…"
                className="mb-3 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
              <div className="mb-3 flex flex-wrap gap-4 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={markResolved} onChange={(e) => setMarkResolved(e.target.checked)} className="rounded" />
                  Mark resolved
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={sendSms} onChange={(e) => setSendSms(e.target.checked)} disabled={!form.phone} className="rounded" />
                  Also send SMS {!form.phone && '(no phone)'}
                </label>
              </div>
              <button
                onClick={() => {
                  if (!message.trim()) { toast.error('Message zaroori'); return; }
                  replyMut.mutate({ subject: subject || undefined, message, markResolved, sendSms });
                }}
                disabled={replyMut.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <Send className="h-4 w-4" /> Send Reply
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-neutral-700">Sender</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-neutral-700"><Mail className="h-3 w-3" /> {form.email}</div>
              {form.phone && <div className="flex items-center gap-2 text-neutral-700"><Phone className="h-3 w-3" /> {form.phone}</div>}
              {form.companyName && <div className="flex items-center gap-2 text-neutral-700"><Building2 className="h-3 w-3" /> {form.companyName}</div>}
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-neutral-700">Actions</h3>
            <div className="space-y-2">
              <select
                value={form.status}
                onChange={(e) => updateMut.mutate({ status: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="NEW">New</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="REPLIED">Replied</option>
                <option value="RESOLVED">Resolved</option>
                <option value="ARCHIVED">Archived</option>
              </select>
              <select
                value={form.priority}
                onChange={(e) => updateMut.mutate({ priority: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
              <button
                onClick={() => { if (confirm('Mark as spam?')) spamMut.mutate(); }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
              >
                <Ban className="h-3 w-3" /> Mark as Spam
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
