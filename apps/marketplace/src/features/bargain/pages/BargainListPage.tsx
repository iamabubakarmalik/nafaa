import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import {
  MessageCircle, Clock, CheckCircle2, XCircle, ChevronRight,
  TrendingDown, Store,
} from 'lucide-react';
import { bargainApi } from '../api/bargain.api';
import { Card, Badge, EmptyState } from '@/ui';
import { formatPrice, timeAgo } from '@/lib/format';
import { useCountdown, formatCountdown } from '@/hooks/useCountdown';
import { cn } from '@/lib/cn';

const TABS = [
  { key: 'all', label: 'All', statuses: undefined },
  { key: 'active', label: 'Active', statuses: ['PENDING', 'COUNTER_OFFERED'] },
  { key: 'accepted', label: 'Accepted', statuses: ['ACCEPTED'] },
  { key: 'closed', label: 'Closed', statuses: ['REJECTED', 'EXPIRED'] },
];

const STATUS_STYLES: Record<string, { label: string; variant: any; icon: any }> = {
  PENDING:         { label: 'Waiting for shop',  variant: 'warning', icon: Clock },
  COUNTER_OFFERED: { label: 'Counter offer',      variant: 'accent',  icon: TrendingDown },
  ACCEPTED:        { label: 'Deal accepted',      variant: 'success', icon: CheckCircle2 },
  REJECTED:        { label: 'Rejected',           variant: 'danger',  icon: XCircle },
  EXPIRED:         { label: 'Expired',            variant: 'default', icon: XCircle },
};

function BargainCard({ bargain }: { bargain: any }) {
  const status = STATUS_STYLES[bargain.status] || STATUS_STYLES.PENDING;
  const StatusIcon = status.icon;
  const cd = useCountdown(bargain.expiresAt);
  const shop = bargain.shop?.marketplaceProfile;
  const savings = Number(bargain.originalPrice) - Number(bargain.currentOffer);
  const savingsPct = Math.round((savings / Number(bargain.originalPrice)) * 100);

  return (
    <Link to={`/bargain/${bargain.id}`}>
      <Card className="p-4 hover:shadow-soft-lg transition-all hover:border-accent-300 group">
        <div className="flex items-start gap-3">
          {/* Shop logo */}
          {shop?.logoUrl ? (
            <img src={shop.logoUrl} alt="" className="h-11 w-11 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="h-11 w-11 rounded-xl bg-gradient-brand flex items-center justify-center shrink-0">
              <Store className="h-5 w-5 text-white" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-black text-sm truncate">{shop?.publicName || 'Shop'}</span>
              <Badge variant={status.variant} size="sm">
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </Badge>
            </div>
            <div className="text-sm font-bold text-content line-clamp-1">
              {bargain.productName}
            </div>

            <div className="flex items-center gap-3 mt-2 text-xs">
              <div>
                <span className="text-content-subtle line-through">{formatPrice(bargain.originalPrice)}</span>
                <span className="text-accent-600 dark:text-accent-400 font-black ml-1">
                  → {formatPrice(bargain.currentOffer)}
                </span>
              </div>
              {savingsPct > 0 && (
                <Badge variant="brand" size="sm">−{savingsPct}%</Badge>
              )}
            </div>

            <div className="flex items-center justify-between mt-2">
              <span className="text-2xs text-content-muted">
                Round {bargain.offerCount}/{bargain.maxOffers} · {timeAgo(bargain.updatedAt)}
              </span>
              {!cd.expired && ['PENDING', 'COUNTER_OFFERED'].includes(bargain.status) && (
                <span className="text-2xs font-black text-accent-600 dark:text-accent-400">
                  ⏱ {formatCountdown(cd)}
                </span>
              )}
            </div>
          </div>

          <ChevronRight className="h-4 w-4 text-content-subtle group-hover:text-accent-500 group-hover:translate-x-1 transition self-center shrink-0" />
        </div>
      </Card>
    </Link>
  );
}

export default function BargainListPage() {
  const [tab, setTab] = useState('all');
  const current = TABS.find((t) => t.key === tab)!;

  const { data, isLoading } = useQuery({
    queryKey: ['bargains', tab],
    queryFn: () => bargainApi.list(current.statuses, 50),
  });

  return (
    <>
      <Helmet><title>My Bargains — Nafaa Bazaar</title></Helmet>

      <div className="max-w-3xl mx-auto space-y-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-content flex items-center gap-2">
            <MessageCircle className="h-7 w-7 text-accent-500" />
            My Bargains
          </h1>
          <p className="text-sm text-content-muted mt-0.5">
            Negotiate prices with shops · Save more
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
          {TABS.map((t) => {
            const active = tab === t.key;
            const count = t.key === 'all' ? data?.total : (data?.counts?.[t.statuses?.[0] || ''] ?? 0);
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'shrink-0 h-10 px-4 rounded-full text-sm font-bold transition border-2',
                  active
                    ? 'bg-accent-500 text-white border-accent-500 shadow-accent'
                    : 'bg-surface text-content-muted border-border hover:border-accent-300',
                )}
              >
                {t.label}
                {count != null && count > 0 && (
                  <span className={cn(
                    'ml-1.5 text-2xs rounded-full px-1.5 py-0.5 font-black',
                    active ? 'bg-white/20' : 'bg-surface-muted',
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-24 rounded-2xl" />
            ))}
          </div>
        ) : !data?.items?.length ? (
          <EmptyState
            icon={MessageCircle}
            title="No bargains yet"
            description="Find products with the 'Bargain' badge to make offers"
          />
        ) : (
          <div className="space-y-3">
            {data.items.map((b: any) => <BargainCard key={b.id} bargain={b} />)}
          </div>
        )}
      </div>
    </>
  );
}
