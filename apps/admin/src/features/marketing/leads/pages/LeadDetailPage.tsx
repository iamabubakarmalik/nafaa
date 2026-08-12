import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Mail, Phone, Building2, Activity, PlusCircle } from 'lucide-react';
import { leadsApi } from '../../../../api/marketing/marketing-leads.api';
import { PageHeader } from '../../_shared/components/PageHeader';
import { StatusBadge } from '../../_shared/components/StatusBadge';
import { TemperatureBadge } from '../../_shared/components/TemperatureBadge';
import { formatDistanceToNow } from 'date-fns';

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [activityType, setActivityType] = useState<any>('CALL');
  const [summary, setSummary] = useState('');
  const [details, setDetails] = useState('');

  const { data: lead, isLoading } = useQuery({
    queryKey: ['lead', id],
    queryFn: () => leadsApi.detail(id!),
    enabled: !!id,
  });

  const updateMut = useMutation({
    mutationFn: (body: any) => leadsApi.update(id!, body),
    onSuccess: () => {
      toast.success('Lead updated');
      qc.invalidateQueries({ queryKey: ['lead', id] });
    },
  });

  const logMut = useMutation({
    mutationFn: (body: any) => leadsApi.logActivity(id!, body),
    onSuccess: () => {
      toast.success('Activity logged');
      setSummary('');
      setDetails('');
      qc.invalidateQueries({ queryKey: ['lead', id] });
    },
  });

  if (isLoading || !lead) return <div className="h-40 animate-pulse rounded-2xl bg-white" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={lead.fullName}
        subtitle={lead.leadNumber}
        backTo="/marketing/leads"
        actions={
          <>
            <TemperatureBadge temp={lead.temperature} />
            <StatusBadge status={lead.status} />
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold">Score: {lead.score}</span>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 font-semibold text-neutral-800">Contact</h3>
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              {lead.email && <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-neutral-400" /> {lead.email}</div>}
              {lead.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-neutral-400" /> {lead.phone}</div>}
              {lead.companyName && <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-neutral-400" /> {lead.companyName}</div>}
              {lead.industry && <div className="text-neutral-600">Industry: {lead.industry}</div>}
              {lead.budget && <div className="text-neutral-600">Budget: {lead.budget}</div>}
              {lead.timeline && <div className="text-neutral-600">Timeline: {lead.timeline}</div>}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
            <h3 className="mb-3 font-semibold text-emerald-900">Log Activity</h3>
            <div className="space-y-3">
              <select value={activityType} onChange={(e) => setActivityType(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm">
                <option value="CALL">📞 Call</option>
                <option value="EMAIL">📧 Email</option>
                <option value="MEETING">🤝 Meeting</option>
                <option value="DEMO">🎬 Demo</option>
                <option value="SMS">📱 SMS</option>
                <option value="WHATSAPP">💬 WhatsApp</option>
                <option value="NOTE">📝 Note</option>
              </select>
              <input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Summary (kya hua)" className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
              <textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Details (optional)" rows={2} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
              <button
                onClick={() => {
                  if (!summary.trim()) { toast.error('Summary zaroori'); return; }
                  logMut.mutate({ type: activityType, summary, details });
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                <PlusCircle className="h-4 w-4" /> Log Activity
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 font-semibold text-neutral-800">Activity Timeline</h3>
            {lead.activities && lead.activities.length > 0 ? (
              <ul className="space-y-3">
                {lead.activities.map((a: any) => (
                  <li key={a.id} className="flex gap-3 border-l-2 border-emerald-200 pl-3">
                    <Activity className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-neutral-500">{a.activityType}</span>
                        <span className="text-xs text-neutral-400">
                          {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-800">{a.title}</p>
                      {a.description && <p className="mt-0.5 text-xs text-neutral-500">{a.description}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-500">Koi activity abhi nahi.</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-neutral-700">Update Lead</h3>
            <div className="space-y-2">
              <select value={lead.status} onChange={(e) => updateMut.mutate({ status: e.target.value })} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm">
                <option value="NEW">New</option>
                <option value="CONTACTED">Contacted</option>
                <option value="QUALIFIED">Qualified</option>
                <option value="DEMO_SCHEDULED">Demo Scheduled</option>
                <option value="DEMO_COMPLETED">Demo Done</option>
                <option value="PROPOSAL_SENT">Proposal Sent</option>
                <option value="NEGOTIATING">Negotiating</option>
                <option value="CONVERTED">Converted</option>
                <option value="LOST">Lost</option>
                <option value="UNRESPONSIVE">Unresponsive</option>
                <option value="DO_NOT_CONTACT">Do Not Contact</option>
              </select>
              <select value={lead.temperature} onChange={(e) => updateMut.mutate({ temperature: e.target.value })} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm">
                <option value="COLD">🥶 Cold</option>
                <option value="WARM">☀️ Warm</option>
                <option value="HOT">🔥 Hot</option>
                <option value="FIRE">💥 Fire</option>
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-neutral-700">Engagement</h3>
            <ul className="space-y-1 text-sm">
              <li className="flex justify-between"><span className="text-neutral-500">Emails sent</span><span className="font-medium">{lead.emailsSent}</span></li>
              <li className="flex justify-between"><span className="text-neutral-500">Emails opened</span><span className="font-medium">{lead.emailsOpened}</span></li>
              <li className="flex justify-between"><span className="text-neutral-500">Calls</span><span className="font-medium">{lead.callsMade}</span></li>
              <li className="flex justify-between"><span className="text-neutral-500">Meetings</span><span className="font-medium">{lead.meetingsHeld}</span></li>
              <li className="flex justify-between"><span className="text-neutral-500">Demos attended</span><span className="font-medium">{lead.demosAttended}</span></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
