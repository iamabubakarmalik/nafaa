import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, Boxes, Crown, Layers,
  Lock, LockOpen, Receipt, Store, TrendingUp, Users, Wallet,
} from 'lucide-react';
import { shopsApi, type ShopAnalyticsRow } from '@modules/organization/shops/api/shops.api';
import { formatPKR } from '@core/lib/format';
import { useAuthStore } from '@core/stores/auth.store';
import { t, Trans } from '@core/i18n';

/**
 * The owner's consolidated view.
 *
 * Deliberately NOT the single-shop dashboard with bigger numbers: when you are
 * looking at every branch at once, the useful question changes from "how did
 * today go" to "which branch needs me". So this ranks branches against each
 * other and surfaces what is going wrong, rather than repeating the per-shop
 * tiles.
 */
export default function AllShopsDashboard() {
  const tenantName = useAuthStore((s) => s.tenant?.name);

  const { data, isLoading } = useQuery({
    queryKey: ['shops-analytics'],
    queryFn: shopsApi.analytics,
  });

  const shops = data?.shops ?? [];
  const totals = data?.totals;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-40 rounded-3xl bg-slate-100 animate-pulse" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10">
      {/* ── Hero: sab branches ka mila hua hisab ── */}
      <div className="rounded-3xl bg-gradient-to-br from-violet-700 via-indigo-700 to-indigo-900 text-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[0.6875rem] font-extrabold uppercase tracking-wider">
              <Layers className="h-3.5 w-3.5" />
              {t('All Shops')}
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold">
              {t('Aaj ka mila hua profit')}
            </h1>
            <div className="mt-1 text-4xl sm:text-5xl font-extrabold tabular-nums">
              {formatPKR(totals?.todayNetProfit ?? 0)}
            </div>
            <p className="mt-2 text-sm font-semibold text-white/80">
              {tenantName ? `${tenantName} — ` : ''}
              <Trans text="{{count}} branches · Sales {{sales}} · Expenses {{expenses}}" values={{
                count: totals?.shopCount ?? 0,
                sales: <strong>{formatPKR(totals?.todaySales ?? 0)}</strong>,
                expenses: <strong>{formatPKR(totals?.todayExpenses ?? 0)}</strong>,
              }} />
            </p>
          </div>

          <Link
            to="/shops"
            className="h-11 inline-flex items-center gap-2 px-4 rounded-xl bg-white text-indigo-800 font-extrabold text-sm hover:bg-indigo-50 transition"
          >
            <Store className="h-4 w-4" />
            {t('Manage Shops')}
          </Link>
        </div>
      </div>

      {/* ── Roll-up tiles ── */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile
          label={t('Is mahine ki sale')}
          value={formatPKR(totals?.monthSales ?? 0)}
          sub={t('Net {{value}}', { value: formatPKR(totals?.monthNetProfit ?? 0) })}
          icon={TrendingUp}
          tone="emerald"
        />
        <Tile
          label={t('Kul udhaar baqi')}
          value={formatPKR(totals?.outstandingCredit ?? 0)}
          sub={t('Sab branches milakar')}
          icon={Wallet}
          tone="amber"
        />
        <Tile
          label={t('Low stock items')}
          value={String(totals?.lowStockCount ?? 0)}
          sub={t('{{value}} pcs total stock', { value: Math.round(totals?.totalStock ?? 0) })}
          icon={Boxes}
          tone="rose"
        />
        <Tile
          label={t('Registers khule')}
          value={`${totals?.registersOpen ?? 0} / ${totals?.shopCount ?? 0}`}
          sub={t('{{value}} active staff', { value: totals?.staffCount ?? 0 })}
          icon={LockOpen}
          tone="indigo"
        />
      </div>

      {/* ── Jin par tawajjo chahiye ── */}
      {(data?.needsAttention?.length ?? 0) > 0 && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-amber-900 font-extrabold text-sm">
            <AlertTriangle className="h-4 w-4" />
            {t('Inhe dekhna zaroori hai')}
          </div>
          <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {data!.needsAttention.map((n) => (
              <div key={n.shopId} className="rounded-xl bg-white border border-amber-200 p-3">
                <div className="font-bold text-slate-900 text-sm">{n.name}</div>
                <ul className="mt-1 space-y-0.5">
                  {n.reasons.map((r) => (
                    <li key={r} className="text-[0.6875rem] text-amber-800 font-semibold">• {r}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Branch muqabla ── */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-extrabold text-slate-900">{t('Branch Comparison')}</h2>
          <p className="text-xs text-slate-500 font-semibold">
            {t('Is mahine ki sale ke hisab se — sab se upar wali sab se acha chal rahi hai')}
          </p>
        </div>

        {shops.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 font-semibold">
            {t('Abhi koi active shop nahi hai.')}{' '}
            <Link to="/shops" className="text-indigo-600 underline font-bold">{t('Shop banayein')}</Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {shops.map((s) => <BranchRow key={s.id} shop={s} />)}
          </div>
        )}
      </div>

      <p className="text-center text-xs text-slate-500 font-semibold">
        {t('Kisi ek branch ka poora hisab dekhne ke liye upar dropdown se woh shop chunein.')}
      </p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════

function BranchRow({ shop }: { shop: ShopAnalyticsRow }) {
  const up = shop.growthVsYesterday >= 0;
  const Arrow = up ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="px-5 py-4 hover:bg-slate-50 transition">
      <div className="flex items-start gap-3 flex-wrap">
        <div
          className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 font-extrabold text-white ${
            shop.rank === 1
              ? 'bg-gradient-to-br from-amber-400 to-amber-600'
              : 'bg-slate-400'
          }`}
        >
          {shop.rank === 1 ? <Crown className="h-5 w-5" /> : `#${shop.rank}`}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold text-slate-900">{shop.name}</span>
            {shop.isMain && (
              <span className="px-1.5 py-0.5 rounded text-[0.625rem] font-extrabold bg-emerald-100 text-emerald-700">
                {t('MAIN')}
              </span>
            )}
            <span className="px-1.5 py-0.5 rounded text-[0.625rem] font-bold bg-slate-100 text-slate-600">
              {shop.type}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[0.625rem] font-extrabold inline-flex items-center gap-1 ${
                shop.registerOpen
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {shop.registerOpen ? <LockOpen className="h-2.5 w-2.5" /> : <Lock className="h-2.5 w-2.5" />}
              {shop.registerOpen ? t('Register khula') : t('Register band')}
            </span>
          </div>

          {/* Is mahine ka hissa */}
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 max-w-[220px] rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-600"
                style={{ width: `${Math.min(shop.monthShare, 100)}%` }}
              />
            </div>
            <span className="text-[0.6875rem] font-extrabold text-slate-600 tabular-nums">
              {t('{{value}}% share', { value: shop.monthShare.toFixed(0) })}
            </span>
          </div>

          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1.5 text-[0.6875rem]">
            <Metric label={t('Aaj')} value={formatPKR(shop.todaySales)} />
            <Metric label={t('Aaj net')} value={formatPKR(shop.todayNetProfit)} />
            <Metric label={t('7 din')} value={formatPKR(shop.weekSales)} />
            <Metric label={t('Is mahine')} value={formatPKR(shop.monthSales)} />
            <Metric label={t('Udhaar baqi')} value={formatPKR(shop.outstandingCredit)} />
            <Metric label={t('Low stock')} value={`${shop.lowStockCount} items`} />
            <Metric label={t('Avg bill')} value={formatPKR(shop.avgOrderValue)} />
            <Metric label={t('Staff')} value={`${shop.staffCount}`} icon={Users} />
          </div>
        </div>

        <div className="text-end shrink-0">
          <div
            className={`inline-flex items-center gap-1 text-sm font-extrabold tabular-nums ${
              up ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            <Arrow className="h-4 w-4" />
            {Math.abs(shop.growthVsYesterday).toFixed(0)}%
          </div>
          <div className="text-[0.6875rem] text-slate-500 font-semibold">{t('kal ke muqable')}</div>
          <div className="mt-1 text-[0.6875rem] text-slate-600 font-bold inline-flex items-center gap-1">
            <Receipt className="h-3 w-3" />
            {t('{{todayOrders}} orders', { todayOrders: shop.todayOrders })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: typeof Users;
}) {
  return (
    <div>
      <div className="text-slate-400 font-bold uppercase tracking-wide text-[0.625rem] inline-flex items-center gap-1">
        {Icon && <Icon className="h-2.5 w-2.5" />}
        {label}
      </div>
      <div className="font-extrabold text-slate-900 tabular-nums">{value}</div>
    </div>
  );
}

const TONES = {
  emerald: 'from-emerald-500 to-emerald-700',
  amber: 'from-amber-500 to-amber-700',
  rose: 'from-rose-500 to-rose-700',
  indigo: 'from-indigo-500 to-indigo-700',
} as const;

function Tile({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  icon: typeof Users;
  tone: keyof typeof TONES;
}) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[0.6875rem] uppercase tracking-wider font-extrabold text-slate-500">
            {label}
          </div>
          <div className="mt-1 text-2xl font-extrabold text-slate-900 tabular-nums truncate">
            {value}
          </div>
          <div className="text-[0.6875rem] text-slate-500 font-semibold truncate">{sub}</div>
        </div>
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${TONES[tone]} text-white flex items-center justify-center shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
