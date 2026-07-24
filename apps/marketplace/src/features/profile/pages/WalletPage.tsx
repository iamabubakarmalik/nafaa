import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowLeft, Wallet, ArrowDown, ArrowUp, RefreshCw, Gift, Plus,
  TrendingUp, Clock,
} from 'lucide-react';
import { profileApi } from '../api/profile.api';
import { Card, Badge, Button, EmptyState } from '@/ui';
import { formatPrice, timeAgo } from '@/lib/format';
import { cn } from '@/lib/cn';

const TXN_ICONS: Record<string, any> = {
  CREDIT: ArrowDown,
  DEBIT: ArrowUp,
  REFUND: RefreshCw,
  CASHBACK: Gift,
  REFERRAL_BONUS: Gift,
  TOP_UP: Plus,
  ADJUSTMENT: TrendingUp,
};

const TXN_COLORS: Record<string, string> = {
  CREDIT: 'from-brand-500 to-emerald-600',
  DEBIT: 'from-danger to-red-700',
  REFUND: 'from-info to-blue-600',
  CASHBACK: 'from-accent-500 to-orange-600',
  REFERRAL_BONUS: 'from-purple-500 to-pink-600',
  TOP_UP: 'from-brand-500 to-emerald-600',
};

export default function WalletPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ['wallet'], queryFn: profileApi.wallet });
  const { data: history } = useQuery({
    queryKey: ['wallet-history'],
    queryFn: () => profileApi.walletHistory(50, 0),
  });

  if (isLoading) return <div className="skeleton h-96 rounded-3xl" />;

  return (
    <>
      <Helmet><title>Wallet — Nafaa Bazaar</title></Helmet>

      <div className="max-w-2xl mx-auto space-y-5">
        <button
          onClick={() => navigate('/profile')}
          className="inline-flex items-center gap-1 text-sm text-content-muted hover:text-content font-bold"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to profile
        </button>

        {/* Wallet card */}
        <Card className="p-6 bg-gradient-brand text-white border-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-white/10 blur-3xl -translate-y-1/4 translate-x-1/4" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="h-5 w-5" />
              <span className="text-xs font-black uppercase tracking-wider">Nafaa Wallet</span>
            </div>
            <div className="text-4xl md:text-5xl font-black tabular-nums">
              {formatPrice(data?.balance || 0)}
            </div>
            <div className="text-brand-100 text-sm mt-1">Available balance</div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-white/15 backdrop-blur border border-white/20">
                <div className="text-2xs font-bold text-brand-50 uppercase">Loyalty points</div>
                <div className="text-xl font-black mt-1">{data?.loyaltyPoints || 0}</div>
                <div className="text-2xs text-brand-100 mt-0.5">
                  = {formatPrice(data?.loyaltyValue || 0)}
                </div>
              </div>
              <button
                onClick={() => navigate('/profile/wallet/top-up')}
                className="p-3 rounded-2xl bg-white text-brand-700 flex flex-col items-start hover:bg-brand-50 transition"
              >
                <Plus className="h-4 w-4" />
                <div className="text-sm font-black mt-1">Top up</div>
                <div className="text-2xs">Add money</div>
              </button>
            </div>
          </div>
        </Card>

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: RefreshCw, label: 'Refunds', color: 'from-info to-blue-600' },
            { icon: Gift, label: 'Cashbacks', color: 'from-accent-500 to-orange-600' },
            { icon: Clock, label: 'Pending', color: 'from-slate-500 to-slate-700' },
          ].map((a) => {
            const Icon = a.icon;
            return (
              <Card key={a.label} className="p-3 text-center">
                <div className={`h-10 w-10 mx-auto rounded-xl bg-gradient-to-br ${a.color} flex items-center justify-center mb-2`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div className="text-xs font-black">{a.label}</div>
              </Card>
            );
          })}
        </div>

        {/* Transactions */}
        <div>
          <h3 className="text-lg font-black mb-3 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-brand-600" />
            Transactions
          </h3>
          {history && history.items?.length > 0 ? (
            <Card className="divide-y divide-border overflow-hidden">
              {history.items.map((txn: any) => {
                const Icon = TXN_ICONS[txn.type] || Wallet;
                const color = TXN_COLORS[txn.type] || 'from-slate-500 to-slate-700';
                const isCredit = ['CREDIT', 'REFUND', 'CASHBACK', 'REFERRAL_BONUS', 'TOP_UP'].includes(txn.type);
                return (
                  <div key={txn.id} className="flex items-center gap-3 p-4">
                    <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shrink-0`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-black text-content">
                        {txn.type.replace(/_/g, ' ')}
                      </div>
                      <div className="text-2xs text-content-muted line-clamp-1">
                        {txn.reason}
                      </div>
                      <div className="text-2xs text-content-subtle mt-0.5">
                        {timeAgo(txn.createdAt)}
                      </div>
                    </div>
                    <div className={cn(
                      'font-black text-sm tabular-nums shrink-0',
                      isCredit ? 'text-brand-600 dark:text-brand-400' : 'text-danger',
                    )}>
                      {isCredit ? '+' : '−'}{formatPrice(Math.abs(Number(txn.amount)))}
                    </div>
                  </div>
                );
              })}
            </Card>
          ) : (
            <EmptyState
              icon={Wallet}
              title="No transactions yet"
              description="Your wallet activity will appear here"
            />
          )}
        </div>
      </div>
    </>
  );
}
