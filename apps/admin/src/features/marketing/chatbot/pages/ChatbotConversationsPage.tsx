import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bot, MessageCircle, Clock, CheckCircle, Users } from 'lucide-react';
import { chatbotApi } from '../../../../api/marketing/marketing-chatbot.api';
import { PageHeader } from '../../_shared/components/PageHeader';
import { StatCard } from '../../_shared/components/StatCard';
import { StatusBadge } from '../../_shared/components/StatusBadge';
import { DataTable } from '../../_shared/components/DataTable';
import { formatDistanceToNow } from 'date-fns';

export function ChatbotConversationsPage() {
  const nav = useNavigate();
  const [status, setStatus] = useState('');

  const { data: stats } = useQuery({ queryKey: ['chatbot-stats'], queryFn: chatbotApi.stats, refetchInterval: 5000 });
  const { data, isLoading } = useQuery({
    queryKey: ['chatbot-list', status],
    refetchInterval: 5000,
    queryFn: () => chatbotApi.list({ status: status || undefined }),
    refetchInterval: 10_000,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Chatbot Conversations" subtitle="Live visitors + bot handoffs" />

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Bot Handling" value={stats.bot} icon={Bot} />
          <StatCard label="Waiting Human" value={stats.waiting} icon={Clock} deltaColor={stats.waiting > 0 ? 'down' : 'neutral'} />
          <StatCard label="Active" value={stats.active} icon={MessageCircle} />
          <StatCard label="Resolved" value={stats.resolved} icon={CheckCircle} hint={stats.resolvedRate} />
        </div>
      )}

      <div className="flex items-center gap-3">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm">
          <option value="">All</option>
          <option value="WAITING_HUMAN">Waiting Human</option>
          <option value="HUMAN_HANDLING">Human Handling</option>
          <option value="BOT_HANDLING">Bot Handling</option>
          <option value="RESOLVED">Resolved</option>
          <option value="ABANDONED">Abandoned</option>
        </select>
      </div>

      <DataTable
        loading={isLoading}
        data={data?.items ?? []}
        keyExtractor={(c: any) => c.id}
        onRowClick={(c: any) => nav(`/marketing/chatbot/${c.id}`)}
        columns={[
          { key: 'conversationNumber', header: 'ID', render: (c: any) => <code className="text-xs font-mono">{c.conversationNumber}</code> },
          {
            key: 'visitor',
            header: 'Visitor',
            render: (c: any) => (
              <div>
                <p className="font-medium text-neutral-800">{c.visitorName ?? 'Anonymous'}</p>
                <p className="text-xs text-neutral-500">{c.visitorEmail ?? c.visitorId.slice(0, 12)}</p>
              </div>
            ),
          },
          {
            key: 'messages',
            header: 'Messages',
            render: (c: any) => (
              <div className="text-xs">
                <p className="text-neutral-800">{c.messageCount} total</p>
                {c.messages?.[0] && <p className="mt-0.5 max-w-xs truncate text-neutral-500">{c.messages[0].content}</p>}
              </div>
            ),
          },
          { key: 'status', header: 'Status', render: (c: any) => <StatusBadge status={c.status} /> },
          { key: 'lastActivityAt', header: 'Last activity', render: (c: any) => <span className="text-xs text-neutral-500">{formatDistanceToNow(new Date(c.lastActivityAt), { addSuffix: true })}</span> },
        ]}
      />
    </div>
  );
}
