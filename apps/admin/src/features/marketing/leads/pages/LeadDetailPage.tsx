/**
 * One marketing lead: contact details, status and temperature, engagement
 * counters and the activity timeline, with a form to log calls, emails,
 * meetings and notes.
 */

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Activity, ClipboardList, PlusCircle, Phone, Thermometer, UserCheck } from 'lucide-react';
import { Button, Card, EmptyState, Input, PageHero, PageShell, Select, Skeleton, Textarea } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { leadsApi } from '@/api/marketing/marketing-leads.api';
import { formatRelative } from '@/lib/format';
import { DetailList, statusLabel } from '@/ui';
import { GuideButton, TemperatureBadge } from '../../lib/kit';

const ACTIVITY_TYPES = ['CALL', 'EMAIL', 'MEETING', 'DEMO', 'SMS', 'WHATSAPP', 'NOTE'];
const STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'DEMO_SCHEDULED', 'DEMO_COMPLETED', 'PROPOSAL_SENT', 'NEGOTIATING', 'CONVERTED', 'LOST', 'UNRESPONSIVE', 'DO_NOT_CONTACT'];
const TEMPS = ['COLD', 'WARM', 'HOT', 'FIRE'];

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const guide = usePageGuide();
  const [activityType, setActivityType] = useState('CALL');
  const [summary, setSummary] = useState('');
  const [details, setDetails] = useState('');

  const { data: lead, isLoading } = useQuery({ queryKey: ['mkt', 'lead', id], queryFn: () => leadsApi.detail(id!), enabled: !!id });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['mkt', 'lead', id] }); qc.invalidateQueries({ queryKey: ['mkt', 'leads'] }); };

  const updateMut = useMutation({
    mutationFn: (body: any) => leadsApi.update(id!, body),
    onSuccess: () => { toast.success('Lead updated'); refresh(); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Could not update the lead'),
  });
  const logMut = useMutation({
    mutationFn: (body: any) => leadsApi.logActivity(id!, body),
    onSuccess: () => { toast.success('Activity logged'); setSummary(''); setDetails(''); refresh(); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Could not log the activity'),
  });

  if (isLoading || !lead) {
    return (
      <PageShell>
        <PageHero title="Lead" back="/marketing/leads" loading />
        <Skeleton className="h-64 rounded-3xl" />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHero
        title={lead.fullName}
        back="/marketing/leads"
        chip={statusLabel(lead.status)}
        backLabel="Leads"
        meta={lead.leadNumber}
        actions={<GuideButton onClick={guide.open} />}
        stats={[
          { label: 'Score', value: lead.score, hint: 'Out of 100' },
          { label: 'Temperature', value: statusLabel(lead.temperature) },
          { label: 'Emails sent', value: lead.emailsSent, hint: `${lead.emailsOpened} opened` },
          { label: 'Calls and meetings', value: lead.callsMade + lead.meetingsHeld, hint: `${lead.demosAttended} demos attended` },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card title="Contact" description="How to reach this person.">
            <DetailList cols={2} items={[
              { label: 'Email', value: lead.email },
              { label: 'Phone', value: lead.phone },
              { label: 'Company', value: lead.companyName },
              { label: 'Industry', value: lead.industry },
              { label: 'Budget', value: lead.budget },
              { label: 'Timeline', value: lead.timeline },
              { label: 'Source', value: statusLabel(lead.source) },
              { label: 'Decision maker', value: lead.decisionMaker ? 'Yes' : 'No' },
            ]} />
          </Card>

          <Card title="Log activity" description="Write down what happened so the next person knows.">
            <div className="space-y-3">
              <Select label="Type" value={activityType} onChange={(e) => setActivityType(e.target.value)} options={ACTIVITY_TYPES.map((v) => ({ value: v, label: statusLabel(v) }))} />
              <Input label="Summary" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="What happened?" />
              <Textarea label="Details (optional)" value={details} onChange={(e) => setDetails(e.target.value)} rows={2} />
              <Button leftIcon={<PlusCircle className="h-4 w-4" />} loading={logMut.isPending} onClick={() => {
                if (!summary.trim()) { toast.error('Write a short summary first'); return; }
                logMut.mutate({ type: activityType, summary, details });
              }}>Log activity</Button>
            </div>
          </Card>

          <Card title="Activity timeline">
            {lead.activities && lead.activities.length > 0 ? (
              <ul className="space-y-3">
                {lead.activities.map((a: any) => (
                  <li key={a.id} className="flex gap-3 border-l-2 border-brand-200 pl-3">
                    <Activity className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-[0.75rem] text-slate-500">
                        <span className="font-medium">{statusLabel(a.activityType)}</span>
                        <span>{formatRelative(a.createdAt)}</span>
                      </div>
                      <p className="text-[0.875rem] text-slate-900">{a.title}</p>
                      {a.description && <p className="mt-0.5 text-[0.75rem] text-slate-500">{a.description}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : <EmptyState icon={<Activity className="h-6 w-6" />} title="No activity yet" description="Log the first call, email or note above." />}
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Update lead">
            <div className="space-y-3">
              <Select label="Status" value={lead.status} onChange={(e) => updateMut.mutate({ status: e.target.value })} options={STATUSES.map((v) => ({ value: v, label: statusLabel(v) }))} />
              <Select label="Temperature" value={lead.temperature} onChange={(e) => updateMut.mutate({ temperature: e.target.value })} options={TEMPS.map((v) => ({ value: v, label: statusLabel(v) }))} />
              <div className="flex items-center gap-2 text-[0.8125rem] text-slate-500">Now: <TemperatureBadge value={lead.temperature} /></div>
            </div>
          </Card>
          <Card title="Engagement">
            <DetailList items={[
              { label: 'Emails sent', value: lead.emailsSent },
              { label: 'Emails opened', value: lead.emailsOpened },
              { label: 'Calls', value: lead.callsMade },
              { label: 'Meetings', value: lead.meetingsHeld },
              { label: 'Demos attended', value: lead.demosAttended },
            ]} />
          </Card>
        </div>
      </div>

      {guide.isOpen && (
        <PageGuide
          title="Lead"
          description="Work one prospect from first contact to a paying shop."
          flowTitle="Working a lead"
          flow={[
            { label: 'Read details', hint: 'Contact, budget', icon: ClipboardList, color: '#4f46e5' },
            { label: 'Reach out', hint: 'Call or message', icon: Phone, color: '#0284c7' },
            { label: 'Log it', hint: 'Activity timeline', icon: PlusCircle, color: '#d97706' },
            { label: 'Update status', hint: 'Converted or lost', icon: UserCheck, color: '#059669' },
          ]}
          steps={[
            { icon: Phone, color: '#0284c7', title: 'Log every touch', text: 'Each call, email or note you log is added to the timeline and raises the score.' },
            { icon: Thermometer, color: '#e11d48', title: 'Keep temperature honest', text: 'Change it to Hot or Fire when the person is ready to buy.' },
            { icon: UserCheck, color: '#059669', title: 'Close the loop', text: 'Set the status to Converted or Lost so reports stay accurate.' },
          ]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
