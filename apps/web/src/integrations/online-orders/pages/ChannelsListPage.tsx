import { Link } from 'react-router-dom';
import { ChevronRight, Globe, Plus } from 'lucide-react';
import { channelMeta, channelPath, useSalesChannels } from '../hooks/useSalesChannels';
import { timeAgo } from '../lib/labels';
import { Badge, Btn, Card, ChannelAvatar, EmptyState, Page } from '../components/ui/kit';

/* ═════════════════════════════════════════════════════════════
   SALES CHANNELS (Settings) — jore hue channels + naya jorna
   ═════════════════════════════════════════════════════════════ */

const ADD = [
  { key: 'woocommerce', type: 'WOOCOMMERCE', name: 'WooCommerce / WordPress', desc: 'Automatic — Approve dabayein', to: '/online-store/connect?platform=woocommerce' },
  { key: 'shopify', type: 'SHOPIFY', name: 'Shopify', desc: 'Automatic — Install dabayein', to: '/online-store/connect?platform=shopify' },
  { key: 'custom', type: 'CUSTOM_WEBSITE', name: 'Apni banayi website', desc: 'Developer ke liye code', to: '/online-store/connect?platform=custom' },
  { key: 'more', type: 'DARAZ', name: 'Daraz, Foodpanda…', desc: 'Apps & integrations', to: '/integrations' },
];

export default function ChannelsListPage() {
  const { data, isLoading } = useSalesChannels();
  const channels = data ?? [];

  return (
    <Page title="Sales channels" subtitle="Jahan jahan aap bechte hain. Har channel ke orders Online orders me, aur stock sab ka ek — Nafaa."
      actions={<Link to="/online-store/connect"><Btn variant="primary" icon={<Plus className="h-4 w-4" />}>Channel jorein</Btn></Link>}>
      <Card flush>
        {isLoading ? (
          <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />)}</div>
        ) : channels.length === 0 ? (
          <EmptyState icon={<Globe className="h-5 w-5" />} title="Abhi koi channel nahi jura"
            action={<Link to="/online-store/connect"><Btn variant="primary">Pehla channel jorein</Btn></Link>}>
            Apni website jorein — orders khud Nafaa me aayenge, ghanti bajegi, aur stock dono jagah ek rahega.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {channels.map((c) => {
              const m = channelMeta(c.type);
              return (
                <li key={c.id}>
                  <Link to={channelPath(c)} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 sm:px-5">
                    <ChannelAvatar emoji={m.emoji} color={m.color} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-[14px] font-semibold text-slate-900 dark:text-white">{c.displayName}</span>
                        <Badge tone={c.live ? 'success' : 'neutral'} dot>{c.live ? 'Live' : 'Band'}</Badge>
                        {c.oneClick && <Badge tone="info">Automatic</Badge>}
                        {c.pendingOrders > 0 && <Badge tone="warning">{c.pendingOrders} naye</Badge>}
                      </div>
                      <div className="truncate text-[12.5px] text-slate-500">
                        {m.label}{c.siteUrl ? ` · ${c.siteUrl.replace(/^https?:\/\//, '')}` : ''} · {c.lastOrderAt ? `aakhri order ${timeAgo(c.lastOrderAt)}` : 'abhi koi order nahi'}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card title="Naya channel jorein">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {ADD.map((a) => {
            const m = channelMeta(a.type);
            return (
              <Link key={a.key} to={a.to} className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 transition hover:border-slate-400 dark:border-slate-700">
                <span className="text-xl">{a.key === 'custom' ? '💻' : m.emoji}</span>
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-semibold text-slate-900 dark:text-white">{a.name}</span>
                  <span className="block text-[12px] text-slate-500">{a.desc}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </Card>
    </Page>
  );
}
