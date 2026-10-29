/**
 * "Masle": a short list of what needs attention across channels, each with a
 * one-click fix — reconnect, remove size-less links, show failing products,
 * link all exact matches, or open the link screen for new channel products.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, Link2, PlugZap, Ruler, Sparkles, TriangleAlert, type LucideIcon } from 'lucide-react';
import { Button, confirmDialog } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { apiErrorMessage } from '../../api/online-orders.api';
import { ONLINE_PRODUCTS_KEY, onlineProductsApi, type GridFilter, type Issue, type OnlineChannel } from '../../api/online-products.api';
import { ChannelMark, refreshOnlineProducts } from './meta';

const ICON: Record<Issue['kind'], LucideIcon> = {
  reconnect: PlugZap, 'fix-size-less': Ruler, errors: TriangleAlert, 'link-sure': Sparkles, link: Link2,
};

export function IssuesPanel({ channels, canManage, onLink, onFilter }: {
  channels: OnlineChannel[]; canManage: boolean;
  onLink: (c: OnlineChannel) => void; onFilter: (c: OnlineChannel, f: GridFilter) => void;
}) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: [ONLINE_PRODUCTS_KEY, 'issues'], queryFn: onlineProductsApi.issues, staleTime: 60_000 });
  const linkSure = useMutation({
    mutationFn: (id: string) => onlineProductsApi.linkSure(id),
    onSuccess: (r) => { refreshOnlineProducts(qc); toast.success(r.saved ? `${r.saved} pakke match jor diye` : 'Koi pakka match baqi nahi'); if (r.errors[0]) toast.error(r.errors[0]); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const fixSize = useMutation({
    mutationFn: (id: string) => onlineProductsApi.fixSizeLess(id),
    onSuccess: (r) => { refreshOnlineProducts(qc); toast.success(`${r.removed} bina size wale link hata diye — ab har size jorein`); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const issues = q.data?.issues ?? [];
  if (!issues.length) return null;
  const byId = new Map(channels.map((c) => [c.id, c]));

  const action = (i: Issue) => {
    const c = byId.get(i.channelId);
    if (!c) return null;
    switch (i.kind) {
      case 'reconnect':
        return <Link to={`/online-store/channels/${c.id}`} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-rose-600 px-2.5 text-xs font-semibold text-white hover:bg-rose-700">Dobara jorein</Link>;
      case 'fix-size-less':
        return canManage ? (
          <Button size="xs" variant="critical" loading={fixSize.isPending && fixSize.variables === c.id}
            onClick={async () => {
              if (await confirmDialog({ title: 'Bina size wale link hatayein?', text: 'In products ke sizes hain magar channel par poora product ek saath jura hai — is se bill par "Available: 0" aata hai. Link hat jayenge; phir har size alag jorein.', danger: true })) fixSize.mutate(c.id);
            }}>Theek karein</Button>
        ) : null;
      case 'errors':
        return <Button size="xs" variant="secondary" onClick={() => onFilter(c, 'errors')}>Dekhein</Button>;
      case 'link-sure':
        return canManage ? <Button size="xs" loading={linkSure.isPending && linkSure.variables === c.id} onClick={() => linkSure.mutate(c.id)} leftIcon={<Sparkles className="h-3.5 w-3.5" />}>Sab pakke jod dein</Button> : null;
      case 'link':
        return canManage ? <Button size="xs" variant="secondary" onClick={() => onLink(c)}>Jorein</Button> : null;
      default:
        return null;
    }
  };

  return (
    <section className="rounded-3xl bg-white p-3 shadow-sm ring-1 ring-slate-200/80 sm:p-4" aria-label="Masle">
      <p className="flex items-center gap-1.5 px-1 text-[0.8125rem] font-semibold text-slate-900">
        <AlertTriangle className="h-4 w-4 text-amber-600" /> Masle <span className="font-normal text-slate-500">· {issues.length}</span>
      </p>
      <ul className="mt-2 divide-y divide-slate-100">
        {issues.slice(0, 8).map((i) => {
          const c = byId.get(i.channelId);
          const Icon = ICON[i.kind];
          return (
            <li key={i.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-1 py-2">
              <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
                i.tone === 'danger' ? 'bg-rose-50 text-rose-600' : i.tone === 'warning' ? 'bg-amber-50 text-amber-700' : 'bg-brand-50 text-brand-700')}>
                <Icon className="h-4 w-4" />
              </span>
              {c && <ChannelMark channel={c} size="sm" className="max-sm:hidden" />}
              <span className="min-w-0 flex-1">
                <span className="block text-[0.8125rem] font-medium text-slate-800">{i.text}</span>
                {i.detail && <span className="block truncate text-[0.75rem] text-slate-500">{i.detail}</span>}
              </span>
              <span className="ml-auto shrink-0">{action(i)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
