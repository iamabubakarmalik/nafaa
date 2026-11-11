/**
 * One demo booking: the prospect, preferred time, and the three actions
 * (confirm or reschedule, mark complete with outcome, cancel with a reason).
 */

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarCheck, CheckCircle, Phone, Video, XCircle } from 'lucide-react';
import { Button, Card, Input, PageHero, PageShell, Select, Skeleton, Textarea } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { demoBookingsApi } from '@/api/marketing/marketing-demo-bookings.api';
import { formatDate } from '@/lib/format';
import { DetailList, statusLabel } from '@/ui';
import { GuideButton, PromptModal } from '../../lib/kit';

const OUTCOMES = [
  { value: 'CONVERTED', label: 'Converted (ready to buy)' },
  { value: 'INTERESTED', label: 'Interested (follow up)' },
  { value: 'NEEDS_FOLLOWUP', label: 'Needs follow-up' },
  { value: 'NOT_INTERESTED', label: 'Not interested' },
  { value: 'WRONG_FIT', label: 'Wrong fit' },
];

export function DemoBookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const guide = usePageGuide();
  const [scheduledAt, setScheduledAt] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [notes, setNotes] = useState('');
  const [outcome, setOutcome] = useState('INTERESTED');
  const [rating, setRating] = useState(8);
  const [feedback, setFeedback] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);

  const { data: demo, isLoading } = useQuery({ queryKey: ['mkt', 'demo', id], queryFn: () => demoBookingsApi.detail(id!), enabled: !!id });
  const done = (msg: string) => () => { toast.success(msg); qc.invalidateQueries({ queryKey: ['mkt', 'demo', id] }); qc.invalidateQueries({ queryKey: ['mkt', 'demos'] }); };
  const fail = (e: any) => toast.error(e.response?.data?.message ?? 'Something went wrong. Try again.');

  const scheduleMut = useMutation({ mutationFn: (body: any) => demoBookingsApi.schedule(id!, body), onSuccess: done('Demo confirmed and the prospect was notified'), onError: fail });
  const completeMut = useMutation({ mutationFn: (body: any) => demoBookingsApi.complete(id!, body), onSuccess: done('Demo marked complete'), onError: fail });
  const cancelMut = useMutation({ mutationFn: (reason: string) => demoBookingsApi.cancel(id!, reason), onSuccess: done('Demo cancelled'), onError: fail });

  if (isLoading || !demo) {
    return <PageShell><PageHero title="Demo booking" back="/marketing/demos" loading /><Skeleton className="h-64 rounded-3xl" /></PageShell>;
  }
  const canSchedule = demo.status === 'PENDING' || demo.status === 'CONFIRMED';
  const canCancel = demo.status !== 'CANCELLED' && demo.status !== 'COMPLETED';

  return (
    <PageShell>
      <PageHero
        title={demo.fullName}
        back="/marketing/demos"
        backLabel="Demo bookings"
        chip={statusLabel(demo.status)}
        meta={demo.bookingNumber}
        actions={<GuideButton onClick={guide.open} />}
        stats={[
          { label: 'Preferred day', value: formatDate(demo.preferredDate), hint: demo.preferredTime },
          { label: 'Status', value: statusLabel(demo.status) },
          { label: 'Interest', value: demo.interestLevel ? statusLabel(demo.interestLevel) : '—' },
          { label: 'Rating', value: demo.rating != null ? `${demo.rating}/10` : '—' },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card title="Prospect">
            <DetailList cols={2} items={[
              { label: 'Email', value: demo.email },
              { label: 'Phone', value: demo.phone },
              { label: 'Company', value: demo.companyName },
              { label: 'Industry', value: demo.industry },
              { label: 'Preferred time', value: `${formatDate(demo.preferredDate)} · ${demo.preferredTime}` },
              { label: 'Meeting link', value: demo.meetingLink },
              { label: 'Feedback', value: demo.feedback, hidden: !demo.feedback },
              { label: 'Follow-up notes', value: demo.followUpNotes, hidden: !demo.followUpNotes },
            ]} />
          </Card>

          {canSchedule && (
            <Card title="Confirm or reschedule" description="The prospect gets a message with the new time.">
              <div className="space-y-3">
                <Input label="Date and time" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
                <Input label="Meeting link" value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} placeholder="Zoom or Meet link" />
                <Textarea label="Internal notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                <Button leftIcon={<CalendarCheck className="h-4 w-4" />} loading={scheduleMut.isPending} onClick={() => {
                  if (!scheduledAt) { toast.error('Pick a date and time first'); return; }
                  scheduleMut.mutate({ scheduledAt: new Date(scheduledAt).toISOString(), meetingLink, notes });
                }}>Confirm demo</Button>
              </div>
            </Card>
          )}

          {demo.status === 'CONFIRMED' && (
            <Card title="Mark complete" description="Record how the demo went.">
              <div className="space-y-3">
                <Select label="Outcome" value={outcome} onChange={(e) => setOutcome(e.target.value)} options={OUTCOMES} />
                <div>
                  <label className="mb-1 block text-[0.8125rem] font-medium text-slate-700">Rating: {rating}/10</label>
                  <input type="range" min={1} max={10} value={rating} onChange={(e) => setRating(+e.target.value)} className="w-full accent-brand-600" />
                </div>
                <Textarea label="Feedback" value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={2} />
                <Input label="Next step" value={nextStep} onChange={(e) => setNextStep(e.target.value)} />
                <Button leftIcon={<CheckCircle className="h-4 w-4" />} loading={completeMut.isPending} onClick={() => completeMut.mutate({ outcome, rating, feedback, nextStep })}>Mark complete</Button>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          {canCancel && (
            <Card title="Cancel demo" description="Tell us why, so reports stay useful.">
              <Button variant="critical" fullWidth leftIcon={<XCircle className="h-4 w-4" />} onClick={() => setCancelOpen(true)}>Cancel demo</Button>
            </Card>
          )}
        </div>
      </div>

      <PromptModal open={cancelOpen} title="Cancel this demo?" label="Reason" placeholder="Why is it cancelled?" confirmLabel="Cancel demo" danger onSubmit={(r) => cancelMut.mutate(r)} onClose={() => setCancelOpen(false)} />

      {guide.isOpen && (
        <PageGuide
          title="Demo booking"
          description="Move one demo from request to result."
          flowTitle="Steps on this page"
          flow={[
            { label: 'Read request', hint: 'Prospect, preferred time', icon: Phone, color: '#d97706' },
            { label: 'Confirm time', hint: 'Notifies the prospect', icon: CalendarCheck, color: '#0284c7' },
            { label: 'Run the demo', hint: 'Use the meeting link', icon: Video, color: '#4f46e5' },
            { label: 'Mark complete', hint: 'Outcome and rating', icon: CheckCircle, color: '#059669' },
          ]}
          steps={[
            { icon: CalendarCheck, color: '#0284c7', title: 'Confirm', text: 'Pick the date and add the meeting link. The prospect is told right away.' },
            { icon: CheckCircle, color: '#059669', title: 'Complete', text: 'Available once the demo is confirmed. Choose the outcome and write the next step.' },
            { icon: XCircle, color: '#e11d48', title: 'Cancel', text: 'Cancel with a reason if the demo will not happen.' },
          ]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
