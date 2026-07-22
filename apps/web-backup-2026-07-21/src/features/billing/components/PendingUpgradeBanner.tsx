import { Link } from 'react-router-dom';
import { Clock, CreditCard, X, Hourglass } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { apiClient } from '@/api/client';

const formatPKR = (n: number) => `Rs ${n.toLocaleString('en-PK')}`;

export function PendingUpgradeBanner() {
  const queryClient = useQueryClient();
  const { pendingUpgrade } = useSubscriptionStatus();

  const cancelMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/subscriptions/pending/${id}`),
    onSuccess: () => {
      toast.success('Upgrade cancel ho gaya');
      queryClient.invalidateQueries({ queryKey: ['subscription-current'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-pending'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Cancel fail'),
  });

  if (!pendingUpgrade) return null;
  const { subscription, invoice } = pendingUpgrade;

  return (
    <div className="mx-4 my-2 rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 shadow-lg overflow-hidden">
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Hourglass className="h-5 w-5 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-amber-500 ring-2 ring-white animate-pulse" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-700 px-1.5 py-0.5 rounded-md bg-amber-200">
                Upgrade Pending
              </span>
              <span className="text-[10px] font-mono font-extrabold text-amber-700">
                {invoice.invoiceNumber}
              </span>
            </div>
            <p className="text-sm font-extrabold text-amber-900 truncate">
              {subscription.plan.name} — {formatPKR(invoice.amountDue)}
            </p>
            <p className="text-[10px] text-amber-700 font-semibold mt-0.5">
              Payment karein ya cancel kar do
            </p>
          </div>

          <button
            onClick={() => {
              if (confirm('Pending upgrade cancel kar dein?')) {
                cancelMutation.mutate(subscription.id);
              }
            }}
            disabled={cancelMutation.isPending}
            className="h-8 w-8 rounded-lg bg-amber-200 hover:bg-amber-300 flex items-center justify-center transition shrink-0 disabled:opacity-50"
            title="Cancel pending upgrade"
          >
            <X className="h-4 w-4 text-amber-700" />
          </button>
        </div>

        <Link
          to={`/billing/invoice/${invoice.id}/pay`}
          className="mt-3 h-11 w-full rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 transition flex items-center justify-center gap-2 shadow-md shadow-amber-500/30 group"
        >
          <CreditCard className="h-4 w-4 text-white group-hover:scale-110 transition-transform" />
          <span className="text-white font-extrabold text-sm">
            Pay {formatPKR(invoice.amountDue)} Now
          </span>
        </Link>
      </div>
    </div>
  );
}
