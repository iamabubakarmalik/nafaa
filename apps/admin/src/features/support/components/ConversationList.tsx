/**
 * Inbox list: one row per conversation with the shop, last message, unread
 * count, waiting time (SLA), status, priority and the agent on it. Filters
 * live in the URL (view, status, priority, tag, search).
 */

import { useEffect, useState } from 'react';
import { Bot, Clock, UserRound } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatRelative } from '@/lib/format';
import { useSupportLive, waitText } from '../lib/live';
import type { SupportAdminConversation, SupportStatus } from '../lib/support.types';

export const STATUS_LABEL: Record<SupportStatus, string> = {
  BOT: 'With Nafaa AI',
  WAITING: 'Waiting',
  OPEN: 'Needs reply',
  PENDING_MERCHANT: 'Waiting on shop',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

export const STATUS_TONE: Record<SupportStatus, string> = {
  BOT: 'bg-violet-100 text-violet-700',
  WAITING: 'bg-rose-100 text-rose-700',
  OPEN: 'bg-amber-100 text-amber-800',
  PENDING_MERCHANT: 'bg-sky-100 text-sky-700',
  RESOLVED: 'bg-emerald-100 text-emerald-700',
  CLOSED: 'bg-slate-100 text-slate-600',
};

const PRIORITY_TONE: Record<string, string> = { URGENT: 'bg-rose-600 text-white', HIGH: 'bg-amber-500 text-white', LOW: 'bg-slate-200 text-slate-600' };

export function ConversationList({ items, selectedId, onSelect, me }: {
  items: SupportAdminConversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  me: string | undefined;
}) {
  const typing = useSupportLive((s) => s.typing);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  return (
    <ul className="divide-y divide-slate-100">
      {items.map((c) => {
        const wait = waitText(c.waitingSince, now);
        const waitMins = c.waitingSince ? (now - new Date(c.waitingSince).getTime()) / 60_000 : 0;
        const typingName = typing[c.id];
        return (
          <li key={c.id}>
            <button type="button" onClick={() => onSelect(c.id)} className={cn('flex w-full gap-3 px-3 py-3 text-start transition', selectedId === c.id ? 'bg-brand-50' : 'hover:bg-slate-50')}>
              <span className="relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                {c.tenant.name.slice(0, 1).toUpperCase()}
                {c.merchantOnline && <span className="absolute -bottom-0.5 -end-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" aria-label="Online" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className={cn('truncate text-[0.875rem]', c.unread ? 'font-bold text-slate-900' : 'font-semibold text-slate-800')}>{c.tenant.name}</span>
                  <span className="ms-auto shrink-0 text-[0.6875rem] text-slate-400">{formatRelative(c.lastMessageAt)}</span>
                </span>
                <span className={cn('mt-0.5 block truncate text-[0.8125rem]', typingName !== undefined ? 'italic text-emerald-600' : c.unread ? 'text-slate-800' : 'text-slate-500')}>
                  {typingName !== undefined ? 'typing…' : c.lastMessagePreview ?? 'No messages yet'}
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[0.6875rem]">
                  <span className={cn('rounded-full px-1.5 py-px font-semibold', STATUS_TONE[c.status])}>
                    {c.status === 'BOT' && <Bot className="me-0.5 inline h-3 w-3" />}{STATUS_LABEL[c.status]}
                  </span>
                  {c.priority !== 'NORMAL' && <span className={cn('rounded-full px-1.5 py-px font-semibold', PRIORITY_TONE[c.priority])}>{c.priority.toLowerCase()}</span>}
                  {wait && <span className={cn('inline-flex items-center gap-0.5 font-semibold', waitMins > 30 ? 'text-rose-600' : waitMins > 10 ? 'text-amber-600' : 'text-slate-500')}><Clock className="h-3 w-3" />{wait}</span>}
                  {c.assignedAgent && <span className="inline-flex items-center gap-0.5 text-slate-500"><UserRound className="h-3 w-3" />{c.assignedAdminId === me ? 'You' : c.assignedAgent.name}</span>}
                  {c.tags.slice(0, 2).map((t) => <span key={t} className="rounded bg-slate-100 px-1 text-slate-600">#{t}</span>)}
                  {c.unread > 0 && <span className="ms-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1.5 font-bold text-white">{c.unread}</span>}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
