import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Globe, Plus, ShoppingBag } from 'lucide-react';
import { Button } from '@core/ui/Button';
import { channelMeta, channelPath, useSalesChannels } from '../hooks/useSalesChannels';
import { timeAgo } from '../lib/labels';
import { cn } from '@core/lib/cn';

/* ═════════════════════════════════════════════════════════════
   SALES CHANNELS  (Settings → Sales channels, Shopify jaisa)
   Jore hue channels + naya jorne ke raaste
   ═════════════════════════════════════════════════════════════ */

const ADD = [
  { key: 'woocommerce', emoji: '🟣', name: 'WooCommerce / WordPress', desc: 'Ek click — Approve dabayein, bas', to: '/online-store/connect?platform=woocommerce', hot: true },
  { key: 'shopify', emoji: '🟢', name: 'Shopify', desc: 'Webhook URL paste karein', to: '/online-store/connect?platform=shopify' },
  { key: 'custom', emoji: '💻', name: 'Apni website', desc: 'Developer ke liye tayyar code', to: '/online-store/connect?platform=custom' },
  { key: 'more', emoji: '🛒', name: 'Daraz, Foodpanda…', desc: 'Apps & integrations me', to: '/integrations' },
];

export default function ChannelsListPage() {
  const { data, isLoading } = useSalesChannels();
  const channels = data ?? [];

  return (
    <div className="w-full space-y-5 pb-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Globe className="h-6 w-6 text-emerald-600" /> Sales channels
          </h1>
          <p className="text-sm font-bold text-slate-500">Jahan jahan aap bechte hain — har channel ke orders Online orders me, stock ek hi.</p>
        </div>
        <Link to="/online-store/connect">
          <Button variant="success" leftIcon={<Plus className="h-4 w-4" />}>Channel jorein</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-36 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}</div>
      ) : channels.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-emerald-300 dark:border-emerald-500/30 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/5 dark:to-teal-500/5 p-10 text-center">
          <div className="text-5xl">🌐</div>
          <h2 className="mt-3 text-xl font-black text-slate-900 dark:text-white">Abhi koi channel nahi jura</h2>
          <p className="mx-auto mt-1 max-w-md text-sm font-bold text-slate-600 dark:text-slate-300">
            Apni website jorein — orders khud Nafaa me aayenge, ghanti bajegi, aur stock dono jagah ek rahega.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {channels.map((c) => {
            const m = channelMeta(c.type);
            return (
              <Link key={c.id} to={channelPath(c)}
                className="group rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-5 hover:shadow-lg hover:-translate-y-0.5 transition">
                <div className="flex items-start gap-3">
                  <span className="h-12 w-12 rounded-2xl flex items-center justify-center text-2xl shrink-0" style={{ backgroundColor: `${m.color}1f` }}>{m.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-black text-slate-900 dark:text-white">{c.displayName}</div>
                    <div className="truncate text-[12px] font-bold text-slate-500">{c.siteUrl?.replace(/^https?:\/\//, '') ?? m.label}</div>
                  </div>
                  <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black',
                    c.live ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800')}>
                    {c.live ? '● Live' : 'Band'}
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-3 text-[12px] font-bold text-slate-500">
                  <span className={cn('inline-flex items-center gap-1', c.pendingOrders > 0 && 'text-amber-600')}>
                    <ShoppingBag className="h-3.5 w-3.5" /> {c.pendingOrders} naye
                  </span>
                  <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {c.lastOrderAt ? timeAgo(c.lastOrderAt) : 'abhi koi order nahi'}</span>
                  {c.oneClick && <span className="ml-auto text-violet-600">⚡ ek click</span>}
                </div>
                <div className="mt-3 inline-flex items-center gap-1 text-[12px] font-black text-emerald-700 dark:text-emerald-400 opacity-80 group-hover:opacity-100">
                  Kholo <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <section>
        <h2 className="mb-3 text-base font-black text-slate-900 dark:text-white">Naya channel jorein</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {ADD.map((a) => (
            <Link key={a.key} to={a.to}
              className="relative rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-4 hover:border-emerald-400 hover:shadow-md transition">
              {a.hot && <span className="absolute right-3 top-3 rounded-full bg-violet-100 dark:bg-violet-500/20 px-2 py-0.5 text-[9px] font-black text-violet-700 dark:text-violet-300">⚡ Sab se aasaan</span>}
              <div className="text-3xl">{a.emoji}</div>
              <div className="mt-2 text-sm font-black text-slate-900 dark:text-white">{a.name}</div>
              <div className="text-[11px] font-bold text-slate-500">{a.desc}</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
