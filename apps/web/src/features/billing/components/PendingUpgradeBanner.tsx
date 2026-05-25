import { Link } from 'react-router-dom';
import { Clock, CreditCard, X } from 'lucide-react';
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
    <div className="mx-4 my-2 rounded-2xl border-2 border-amber-300 bg-amber-50 p-3">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-amber-200 flex items-center justify-center flex-shrink-0">
          <Clock className="h-5 w-5 text-amber-700" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Upgrade Pending</span>
            <span className="h-1 w-1 rounded-full bg-amber-400" />
            <span className="text-xs font-bold text-amber-700">{invoice.invoiceNumber}</span>
          </div>
          <p className="text-sm font-bold text-amber-900 mt-0.5">
            {subscription.plan.name} — {formatPKR(invoice.amountDue)}
          </p>
          <p className="text-xs text-amber-700 mt-0.5">Pay karne ke baad plan activate hoga</p>
        </div>
        <button
          onClick={() => cancelMutation.mutate(subscription.id)}
          className="h-7 w-7 rounded-full bg-amber-200 hover:bg-amber-300 flex items-center justify-center transition"
        >
          <X className="h-3.5 w-3.5 text-amber-700" />
        </button>
      </div>
      <div className="mt-3">
        <Link
          to={`/billing/invoice/${invoice.id}`}
          className="h-10 w-full rounded-xl bg-amber-600 hover:bg-amber-700 transition flex items-center justify-center gap-2"
        >
          <CreditCard className="h-4 w-4 text-white" />
          <span className="text-white font-bold text-sm">Pay Now</span>
        </Link>
      </div>
    </div>
  );
}
