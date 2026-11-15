/**
 * Who the agent is talking to: shop, owner, plan and trial end, last active,
 * industry, recent failed emails / SMS, earlier chats, and the ways to reach
 * the shop (sign in as shop, open in admin, email, SMS, WhatsApp, in-app).
 */

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell, ExternalLink, LogIn, Mail, MessageSquareText, Smartphone, Store } from 'lucide-react';
import { Skeleton } from '@/design-system/components';
import { adminSupportApi } from '@/api/admin-support.api';
import { formatDate, formatRelative } from '@/lib/format';
import { industryForType } from '@/lib/industries';
import { LastSeen, OnlineDot, StatusBadge } from '@/ui';
import { useShopContact } from './ShopContactActions';

export function ContextPanel({ tenantId }: { tenantId: string }) {
  const q = useQuery({ queryKey: ['support', 'context', tenantId], queryFn: () => adminSupportApi.context(tenantId), staleTime: 60_000 });
  const d = q.data;
  const contact = useShopContact({ id: tenantId, name: d?.tenant.name ?? 'Shop', phone: d?.tenant.phone, ownerPhone: d?.owner?.phone, ownerEmail: d?.owner?.email });
  if (!d) return <div className="space-y-3 p-4"><Skeleton className="h-24 rounded-xl" /><Skeleton className="h-40 rounded-xl" /></div>;
  const { actions } = contact;
  const btn = 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[0.8125rem] font-medium text-slate-700 hover:bg-slate-50';
  const trialEnd = d.plan?.status === 'TRIAL' ? d.plan.trialEndsAt ?? d.plan.currentPeriodEnd : null;

  return (
    <div className="space-y-4 p-4 text-[0.8125rem]">
      <div>
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4 text-slate-400" />
          <Link to={`/tenants/${d.tenant.id}`} className="truncate text-base font-semibold text-slate-900 hover:underline">{d.tenant.name}</Link>
        </div>
        <p className="mt-0.5 text-slate-500">@{d.tenant.slug} · {industryForType(d.tenant.businessType ?? 'NONE').label}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusBadge value={d.tenant.status} />
          {d.tenant.paused && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[0.6875rem] font-semibold text-rose-700">Paused</span>}
          {d.merchantOnline ? <span className="inline-flex items-center gap-1 text-emerald-700"><OnlineDot online /> In the app now</span> : <LastSeen at={d.tenant.lastActiveAt} compact />}
        </div>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
        <dt className="text-slate-500">Owner</dt><dd className="truncate font-medium text-slate-800">{d.owner?.fullName ?? '—'}</dd>
        <dt className="text-slate-500">Phone</dt><dd className="truncate">{d.owner?.phone ?? d.tenant.phone ?? '—'}</dd>
        <dt className="text-slate-500">Email</dt><dd className="truncate">{d.owner?.email ?? '—'}</dd>
        <dt className="text-slate-500">Plan</dt><dd>{d.plan ? `${d.plan.name ?? 'Plan'} · ${d.plan.status.toLowerCase()}` : 'No plan'}</dd>
        {trialEnd && <><dt className="text-slate-500">Trial ends</dt><dd>{formatDate(trialEnd)} ({formatRelative(trialEnd)})</dd></>}
        <dt className="text-slate-500">Joined</dt><dd>{formatDate(d.tenant.createdAt)}</dd>
        <dt className="text-slate-500">Last sale</dt><dd>{d.tenant.lastSaleAt ? formatRelative(d.tenant.lastSaleAt) : 'Never'}</dd>
        <dt className="text-slate-500">Team</dt><dd>{d.tenant.users} users · {d.tenant.shops} branches</dd>
        <dt className="text-slate-500">Language</dt><dd>{({ en: 'English', ur: 'Urdu', roman: 'Roman Urdu' } as Record<string, string>)[d.owner?.language ?? d.tenant.language] ?? d.tenant.language}</dd>
      </dl>

      <div className="grid grid-cols-2 gap-2">
        {actions.signInAs && <button type="button" className={btn} onClick={actions.signInAs}><LogIn className="h-4 w-4" /> Sign in as shop</button>}
        <Link to={`/tenants/${d.tenant.id}`} className={btn}><ExternalLink className="h-4 w-4" /> Open in admin</Link>
        {actions.email && <button type="button" className={btn} onClick={actions.email}><Mail className="h-4 w-4" /> Email</button>}
        {actions.sms && <button type="button" className={btn} onClick={actions.sms}><Smartphone className="h-4 w-4" /> SMS</button>}
        {d.whatsappUrl && <a href={d.whatsappUrl} target="_blank" rel="noreferrer" className={btn}><MessageSquareText className="h-4 w-4" /> WhatsApp</a>}
        {actions.notify && <button type="button" className={btn} onClick={actions.notify}><Bell className="h-4 w-4" /> In-app notice</button>}
      </div>

      {d.recentErrors.length > 0 && (
        <div>
          <p className="mb-1 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-400">Recent problems</p>
          <ul className="space-y-1">
            {d.recentErrors.map((e, i) => <li key={i} className="rounded-lg bg-rose-50 px-2 py-1 text-rose-800">{e.text} <span className="text-rose-500">· {formatRelative(e.at)}</span></li>)}
          </ul>
        </div>
      )}

      {d.conversations.length > 1 && (
        <div>
          <p className="mb-1 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-400">Earlier chats</p>
          <ul className="space-y-1">
            {d.conversations.slice(0, 6).map((c) => (
              <li key={c.id}>
                <Link to={`/support?c=${c.id}`} className="block rounded-lg px-2 py-1 hover:bg-slate-50">
                  <span className="text-slate-700">{c.lastMessagePreview ?? c.subject ?? 'Chat'}</span>
                  <span className="block text-[0.6875rem] text-slate-400">{c.status.toLowerCase().replace('_', ' ')} · {formatRelative(c.lastMessageAt)}{c.rating ? ` · ${c.rating === 'up' ? '👍' : '👎'}` : ''}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {contact.dialogs}
    </div>
  );
}
