import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarCheck, XCircle, CheckCircle, Mail, Phone, Building2, Users, Target } from 'lucide-react';
import { demoBookingsApi } from '../../../../api/marketing/marketing-demo-bookings.api';
import { PageHeader } from '../../_shared/components/PageHeader';
import { StatusBadge } from '../../_shared/components/StatusBadge';
import { format } from 'date-fns';

export function DemoBookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [scheduledAt, setScheduledAt] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [notes, setNotes] = useState('');

  const [outcome, setOutcome] = useState<any>('INTERESTED');
  const [rating, setRating] = useState(8);
  const [feedback, setFeedback] = useState('');
  const [nextStep, setNextStep] = useState('');

  const { data: demo, isLoading } = useQuery({
    queryKey: ['demo', id],
    queryFn: () => demoBookingsApi.detail(id!),
    enabled: !!id,
  });

  const scheduleMut = useMutation({
    mutationFn: (body: any) => demoBookingsApi.schedule(id!, body),
    onSuccess: () => {
      toast.success('Demo scheduled + notification sent');
      qc.invalidateQueries({ queryKey: ['demo', id] });
    },
  });

  const completeMut = useMutation({
    mutationFn: (body: any) => demoBookingsApi.complete(id!, body),
    onSuccess: () => {
      toast.success('Demo marked complete');
      qc.invalidateQueries({ queryKey: ['demo', id] });
    },
  });

  const cancelMut = useMutation({
    mutationFn: (reason: string) => demoBookingsApi.cancel(id!, reason),
    onSuccess: () => {
      toast.success('Demo cancelled');
      qc.invalidateQueries({ queryKey: ['demo', id] });
    },
  });

  if (isLoading || !demo) return <div className="h-40 animate-pulse rounded-2xl bg-white" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={demo.fullName}
        subtitle={demo.bookingNumber}
        backTo="/marketing/demos"
        actions={<StatusBadge status={demo.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 font-semibold text-neutral-800">Prospect Details</h3>
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-neutral-400" /> {demo.email}</div>
              <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-neutral-400" /> {demo.phone}</div>
              {demo.companyName && <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-neutral-400" /> {demo.companyName}</div>}
              {demo.industry && <div className="flex items-center gap-2"><Target className="h-4 w-4 text-neutral-400" /> {demo.industry}</div>}
            </div>
            <div className="mt-4 rounded-xl bg-neutral-50 p-3 text-sm">
              <p className="text-xs uppercase tracking-wider text-neutral-500">Preferred Time</p>
              <p className="mt-1 font-medium text-neutral-800">
                {format(new Date(demo.preferredDate), 'PPP')} • {demo.preferredTime}
              </p>
            </div>
          </div>

          {(demo.status === 'PENDING' || demo.status === 'CONFIRMED') && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
              <h3 className="mb-3 font-semibold text-emerald-900">Schedule / Reschedule</h3>
              <div className="space-y-3">
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
                <input
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  placeholder="Meeting link (Zoom/Meet)"
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Internal notes"
                  rows={2}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
                <button
                  onClick={() => {
                    if (!scheduledAt) { toast.error('Date & time zaroori'); return; }
                    scheduleMut.mutate({ scheduledAt: new Date(scheduledAt).toISOString(), meetingLink, notes });
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  <CalendarCheck className="h-4 w-4" /> Confirm Demo
                </button>
              </div>
            </div>
          )}

          {demo.status === 'CONFIRMED' && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5">
              <h3 className="mb-3 font-semibold text-blue-900">Mark Complete</h3>
              <div className="space-y-3">
                <select value={outcome} onChange={(e) => setOutcome(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm">
                  <option value="CONVERTED">🎉 Converted (Ready to buy)</option>
                  <option value="INTERESTED">👍 Interested (Follow up)</option>
                  <option value="NEEDS_FOLLOWUP">⏳ Needs follow-up</option>
                  <option value="NOT_INTERESTED">👎 Not interested</option>
                  <option value="WRONG_FIT">❌ Wrong fit</option>
                </select>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-600">Rating: {rating}/10</label>
                  <input type="range" min={1} max={10} value={rating} onChange={(e) => setRating(+e.target.value)} className="w-full" />
                </div>
                <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Feedback" rows={2} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
                <input value={nextStep} onChange={(e) => setNextStep(e.target.value)} placeholder="Next step" className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
                <button
                  onClick={() => completeMut.mutate({ outcome, rating, feedback, nextStep })}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <CheckCircle className="h-4 w-4" /> Mark Complete
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {demo.status !== 'CANCELLED' && demo.status !== 'COMPLETED' && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5">
              <h3 className="mb-2 font-semibold text-rose-900">Cancel Demo</h3>
              <button
                onClick={() => {
                  const r = prompt('Cancellation reason?');
                  if (r) cancelMut.mutate(r);
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
              >
                <XCircle className="h-4 w-4" /> Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
