/**
 * Marketing dashboard: a live snapshot of the growth funnel (newsletter,
 * contact forms, demos, leads, chat, campaigns, traffic), what needs
 * attention, and the latest marketing activity.
 */

import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity, AlertTriangle, ArrowRight, Bot, Calendar, Flame, Globe, Mail, Megaphone, MessageSquare, TrendingUp, Users, UserCheck,
} from 'lucide-react';
import { Card, EmptyState, KpiCard, KpiRow, PageHero, PageShell, Skeleton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { marketingDashboardApi } from '@/api/marketing/marketing-dashboard.api';
import { formatRelative } from '@/lib/format';
import { statusLabel } from '@/ui';
import { GuideButton, num } from '../../lib/kit';

/** "PII_ACCESS:customer_list" → "Pii access · customer list" */
const activityTitle = (action: string) => statusLabel(action.replace(/[:.]/g, ' · ').replace(/_/g, ' '));

export function MarketingDashboardPage() {
  const guide = usePageGuide();
  const nav = useNavigate();
  const { data, isLoading, isFetching } = useQuery({ queryKey: ['mkt', 'dashboard'], queryFn: marketingDashboardApi.overview, refetchInterval: 30_000 });
  const activity = useQuery({ queryKey: ['mkt', 'dashboard', 'activity'], queryFn: () => marketingDashboardApi.activity(15), refetchInterval: 60_000 });

  return (
    <PageShell>
      <PageHero
        title="Marketing"
        chip="Live"
        busy={isFetching}
        loading={isLoading}
        actions={<GuideButton onClick={guide.open} />}
        stats={data ? [
          { label: 'Subscribers', value: num(data.newsletter.total), hint: `+${num(data.newsletter.new7d)} this week` },
          { label: 'Leads fire and hot', value: num(data.leads.fire + data.leads.hot), hint: `${num(data.leads.total)} leads in total` },
          { label: 'Upcoming demos', value: num(data.demos.upcoming), hint: `${data.demos.conversionRate} conversion` },
          { label: 'Visitors (7 days)', value: num(data.traffic.uniqueVisitors7d), hint: `${num(data.traffic.pageviews7d)} pageviews` },
        ] : undefined}
      />

      {data?.alerts?.length > 0 && (
        <div className="space-y-2">
          {data.alerts.map((a: any, i: number) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0" /> <span>{a.message}</span>
            </div>
          ))}
        </div>
      )}

      {data ? (
        <>
          <KpiRow cols={4}>
            <KpiCard onClick={() => nav('/marketing/newsletter')} icon={Mail} color="#4f46e5" label="Subscribers" value={num(data.newsletter.total)} hint={`${num(data.newsletter.active)} active · +${num(data.newsletter.new7d)} this week`} />
            <KpiCard onClick={() => nav('/marketing/contact-forms')} icon={MessageSquare} color="#0891b2" label="New contact forms" value={num(data.contactForms.new)} hint={data.contactForms.urgentOpen > 0 ? `${num(data.contactForms.urgentOpen)} urgent` : `${num(data.contactForms.last7d)} in 7 days`} />
            <KpiCard onClick={() => nav('/marketing/demos')} icon={Calendar} color="#d97706" label="Upcoming demos" value={num(data.demos.upcoming)} hint={`${num(data.demos.completed30d)} completed in 30 days`} />
            <KpiCard onClick={() => nav('/marketing/leads')} icon={Flame} color="#e11d48" label="Fire and hot leads" value={num(data.leads.fire + data.leads.hot)} hint={`+${num(data.leads.new7d)} new this week`} />
            <KpiCard onClick={() => nav('/marketing/chatbot')} icon={Bot} color="#7c3aed" label="Chats waiting" value={num(data.chatbot.waiting)} hint={`${num(data.chatbot.active)} active · ${num(data.chatbot.last7d)} in 7 days`} />
            <KpiCard onClick={() => nav('/marketing/campaigns')} icon={Megaphone} color="#059669" label="Active campaigns" value={num(data.campaigns.active)} hint={`${num(data.campaigns.sent30d)} sent in 30 days`} />
            <KpiCard onClick={() => nav('/marketing/analytics')} icon={Users} color="#0284c7" label="Visitors (7 days)" value={num(data.traffic.uniqueVisitors7d)} hint={`${num(data.traffic.pageviews7d)} pageviews`} />
            <KpiCard onClick={() => nav('/marketing/conversions')} icon={TrendingUp} color="#16a34a" label="Demo conversion" value={data.demos.conversionRate} hint="Demos that became shops" />
          </KpiRow>

          <Card title="Recent activity" description="The latest things that happened in marketing.">
            {activity.data && activity.data.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {activity.data.map((a: any) => (
                  <li key={a.id} className="flex items-start gap-3 py-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600"><Activity className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.875rem] font-medium text-slate-900">{activityTitle(a.action)}</p>
                      {a.description && <p className="mt-0.5 truncate text-[0.75rem] text-slate-500">{a.description}</p>}
                    </div>
                    <span className="shrink-0 text-[0.75rem] text-slate-400">{formatRelative(a.createdAt)}</span>
                  </li>
                ))}
              </ul>
            ) : <EmptyState icon={<Activity className="h-6 w-6" />} title="No activity yet" description="Actions from the team and visitors will show up here." />}
          </Card>
        </>
      ) : isLoading && (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-[5.5rem] rounded-2xl" />)}</div>
      )}

      {guide.isOpen && (
        <PageGuide
          title="Marketing"
          description="Everything about how people find Nafaa and become customers."
          flowTitle="The marketing funnel"
          flow={[
            { label: 'Visitors', hint: 'Website traffic', icon: Globe, color: '#0284c7' },
            { label: 'Sign up or ask', hint: 'Newsletter, forms, chat', icon: Mail, color: '#4f46e5' },
            { label: 'Leads and demos', hint: 'Follow up', icon: Flame, color: '#e11d48' },
            { label: 'Shops', hint: 'Customers', icon: UserCheck, color: '#059669' },
          ]}
          steps={[
            { icon: AlertTriangle, color: '#d97706', title: 'Check the alerts', text: 'Amber notes at the top are things that need an answer today.' },
            { icon: ArrowRight, color: '#4f46e5', title: 'Open a card', text: 'Each number links to its list, already filtered where it makes sense.' },
            { icon: Activity, color: '#059669', title: 'Read recent activity', text: 'See what the team and visitors did most recently.' },
          ]}
          tips={['Numbers refresh every 30 seconds.']}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
