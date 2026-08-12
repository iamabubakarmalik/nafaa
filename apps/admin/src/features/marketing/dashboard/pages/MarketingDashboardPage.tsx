import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Mail, MessageSquare, Calendar, Users, Bot, Megaphone,
  TrendingUp, AlertTriangle, Flame, Activity,
} from 'lucide-react';
import { marketingDashboardApi } from '../../../../api/marketing/marketing-dashboard.api';
import { StatCard } from '../../_shared/components/StatCard';
import { PageHeader } from '../../_shared/components/PageHeader';
import { EmptyState } from '../../_shared/components/EmptyState';
import { formatDistanceToNow } from 'date-fns';

export function MarketingDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['marketing-dashboard'],
    queryFn: marketingDashboardApi.overview,
    refetchInterval: 30_000,
  });

  const { data: activity } = useQuery({
    queryKey: ['marketing-activity'],
    queryFn: () => marketingDashboardApi.activity(15),
    refetchInterval: 60_000,
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Marketing Dashboard" subtitle="Growth ka poora picture ek jagah" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketing Dashboard"
        subtitle="Aap ke growth funnel ki live snapshot"
      />

      {/* Alerts */}
      {data.alerts && data.alerts.length > 0 && (
        <div className="space-y-2">
          {data.alerts.map((a: any, i: number) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{a.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Newsletter + Forms + Demos */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
          Lead Generation
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link to="/marketing/newsletter">
            <StatCard
              label="Subscribers"
              value={data.newsletter.total.toLocaleString()}
              icon={Mail}
              delta={`+${data.newsletter.new7d} this week`}
              deltaColor={data.newsletter.new7d > 0 ? 'up' : 'neutral'}
              hint={`${data.newsletter.active} active`}
            />
          </Link>
          <Link to="/marketing/contact-forms">
            <StatCard
              label="Contact Forms"
              value={data.contactForms.new}
              icon={MessageSquare}
              delta={`${data.contactForms.last7d} last 7d`}
              deltaColor={data.contactForms.urgentOpen > 0 ? 'down' : 'neutral'}
              hint={data.contactForms.urgentOpen > 0 ? `${data.contactForms.urgentOpen} URGENT` : 'All caught up'}
            />
          </Link>
          <Link to="/marketing/demos">
            <StatCard
              label="Demos Upcoming"
              value={data.demos.upcoming}
              icon={Calendar}
              delta={`${data.demos.conversionRate} conversion`}
              deltaColor="up"
              hint={`${data.demos.completed30d} completed 30d`}
            />
          </Link>
          <Link to="/marketing/leads">
            <StatCard
              label="Leads Fire+Hot"
              value={data.leads.fire + data.leads.hot}
              icon={Flame}
              delta={`+${data.leads.new7d} this week`}
              deltaColor="up"
              hint={`${data.leads.total} total`}
            />
          </Link>
        </div>
      </section>

      {/* Chat + Campaigns + Traffic */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
          Engagement & Reach
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link to="/marketing/chatbot">
            <StatCard
              label="Chat Waiting"
              value={data.chatbot.waiting}
              icon={Bot}
              delta={`${data.chatbot.active} active`}
              deltaColor={data.chatbot.waiting > 0 ? 'down' : 'neutral'}
              hint={`${data.chatbot.last7d} last 7d`}
            />
          </Link>
          <Link to="/marketing/campaigns">
            <StatCard
              label="Active Campaigns"
              value={data.campaigns.active}
              icon={Megaphone}
              delta={`${data.campaigns.sent30d} sent 30d`}
              deltaColor="up"
            />
          </Link>
          <Link to="/marketing/analytics">
            <StatCard
              label="Visitors 7d"
              value={data.traffic.uniqueVisitors7d.toLocaleString()}
              icon={Users}
              delta={`${data.traffic.pageviews7d.toLocaleString()} pageviews`}
              deltaColor="up"
            />
          </Link>
          <Link to="/marketing/analytics">
            <StatCard
              label="Conversion Rate"
              value={data.demos.conversionRate}
              icon={TrendingUp}
              delta="Demos → Customers"
              deltaColor="up"
            />
          </Link>
        </div>
      </section>

      {/* Recent activity */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Recent Activity
          </h2>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-2 shadow-sm">
          {activity && activity.length > 0 ? (
            <ul className="divide-y divide-neutral-100">
              {activity.map((a: any) => (
                <li key={a.id} className="flex items-start gap-3 px-3 py-3">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-neutral-800">{a.action.replace(/_/g, ' ')}</p>
                    {a.description && (
                      <p className="mt-0.5 truncate text-xs text-neutral-500">{a.description}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-neutral-400">
                    {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={Activity}
              title="No activity yet"
              message="Jaisay hi log actions lengay, wo yahan dikhayen ge."
            />
          )}
        </div>
      </section>
    </div>
  );
}
