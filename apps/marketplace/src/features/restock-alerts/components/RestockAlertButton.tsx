import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, BellRing, PackageX } from 'lucide-react';
import { restockApi } from '../api/restock.api';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from 'sonner';

interface Props {
  productId: string;
  productName: string;
}

export function RestockAlertButton({ productId, productName }: Props) {
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();

  const { data: alerts } = useQuery({
    queryKey: ['restock-alerts'],
    queryFn: restockApi.list,
    enabled: isAuth,
  });

  const hasAlert = alerts?.some((a: any) => a.productId === productId);

  const createMutation = useMutation({
    mutationFn: () => restockApi.create(productId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['restock-alerts'] });
      toast.success('We\'ll notify you when this is back in stock 🔔');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      const alert = alerts?.find((a: any) => a.productId === productId);
      return restockApi.delete(alert!.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['restock-alerts'] });
      toast.success('Alert removed');
    },
  });

  const handleClick = () => {
    if (!isAuth) {
      toast.error('Please login to set restock alerts');
      return;
    }
    if (hasAlert) deleteMutation.mutate();
    else createMutation.mutate();
  };

  return (
    <button
      onClick={handleClick}
      disabled={createMutation.isPending || deleteMutation.isPending}
      className={`w-full h-12 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition ${
        hasAlert
          ? 'bg-accent-500 hover:bg-accent-600 text-white shadow-accent'
          : 'bg-gradient-to-br from-slate-600 to-slate-800 hover:opacity-90 text-white'
      }`}
    >
      {hasAlert ? (
        <>
          <BellRing className="h-4 w-4" />
          Alert active — remove
        </>
      ) : (
        <>
          <Bell className="h-4 w-4" />
          Notify when back in stock
        </>
      )}
    </button>
  );
}
