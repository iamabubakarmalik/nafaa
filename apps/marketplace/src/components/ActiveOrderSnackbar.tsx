import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Bike, Package, Clock, X, ChevronRight, Truck,
  CheckCircle2,
} from 'lucide-react';
import { ordersApi } from '@/features/orders/api/orders.api';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/cn';

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  PENDING:          { label: 'Awaiting confirmation',   icon: Clock,         color: 'from-amber-500 to-orange-600' },
  CONFIRMED:        { label: 'Order confirmed',          icon: CheckCircle2,  color: 'from-info to-blue-700' },
  PREPARING:        { label: 'Preparing your order',     icon: Package,       color: 'from-purple-500 to-pink-500' },
  READY_FOR_PICKUP: { label: 'Ready for pickup',         icon: Package,       color: 'from-teal-500 to-cyan-700' },
  OUT_FOR_DELIVERY: { label: 'On the way to you',        icon: Bike,          color: 'from-brand-500 to-emerald-600' },
};

export function ActiveOrderSnackbar() {
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [minimized, setMinimized] = useState(false);

  const { data } = useQuery({
    queryKey: ['active-orders-snackbar'],
    queryFn: ordersApi.active,
    enabled: isAuth,
    refetchInterval: 30_000,
    staleTime: 20_000,
  });

  const visibleOrders = data?.items.filter((o) => !dismissed.has(o.id)) || [];

  useEffect(() => {
    if (visibleOrders.length === 0) setMinimized(false);
  }, [visibleOrders.length]);

  if (!isAuth || visibleOrders.length === 0) return null;

  const primary = visibleOrders[0];
  const config = STATUS_CONFIG[primary.status];
  if (!config) return null;
  const Icon = config.icon;

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-24 lg:bottom-6 right-4 z-30 h-14 w-14 rounded-full bg-gradient-brand shadow-brand flex items-center justify-center hover:scale-110 transition animate-scale-in"
      >
        <div className="relative">
          <Icon className="h-6 w-6 text-white" />
          <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1.5 rounded-full bg-danger text-white text-2xs font-black flex items-center justify-center ring-2 ring-white">
            {visibleOrders.length}
          </span>
        </div>
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 lg:bottom-6 left-4 right-4 lg:left-auto lg:right-6 lg:max-w-sm z-30 animate-slide-up">
      <Link to={`/orders/${primary.id}`}>
        <div className={`p-3 rounded-3xl bg-gradient-to-br ${config.color} text-white shadow-2xl border border-white/20 relative overflow-hidden group`}>
          <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-white/10 blur-2xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0 animate-pulse-soft">
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-2xs font-black uppercase tracking-wider opacity-90">
                {config.label}
              </div>
              <div className="text-sm font-black truncate">
                Order #{primary.orderNumber}
              </div>
              {primary.estimatedDeliveryAt && (
                <div className="text-2xs opacity-90 mt-0.5">
                  ETA: {new Date(primary.estimatedDeliveryAt).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' })}
                </div>
              )}
              {visibleOrders.length > 1 && (
                <div className="text-2xs font-black mt-1 opacity-90">
                  +{visibleOrders.length - 1} more active
                </div>
              )}
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 group-hover:translate-x-1 transition" />
            <button
              onClick={(e) => {
                e.preventDefault();
                setMinimized(true);
              }}
              className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition shrink-0"
              aria-label="Minimize"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      </Link>
    </div>
  );
}
