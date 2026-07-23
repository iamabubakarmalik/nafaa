import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Bell, CheckCheck, Trash2, ShoppingBag, Percent, Gift,
  Star, MessageCircle, Truck, Sparkles, AlertCircle,
} from 'lucide-react';
import { notificationsApi } from '../api/notifications.api';
import { Button } from '@shared/ui/Button';
import { EmptyState } from '@shared/ui/EmptyState';
import { SkeletonCard } from '@shared/ui/Skeleton';
import { cn } from '@lib/cn';

const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  ORDER_UPDATE:     { icon: ShoppingBag, color: 'text-brand-600',  bg: 'bg-brand-100 dark:bg-brand-900/40' },
  DELIVERY:         { icon: Truck,       color: 'text-blue-600',   bg: 'bg-blue-100 dark:bg-blue-900/40' },
  PROMOTION:        { icon: Percent,     color: 'text-rose-600',   bg: 'bg-rose-100 dark:bg-rose-900/40' },
  COUPON:           { icon: Gift,        color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/40' },
  REVIEW_REMINDER:  { icon: Star,        color: 'text-amber-600',  bg: 'bg-amber-100 dark:bg-amber-900/40' },
  BARGAIN_UPDATE:   { icon: MessageCircle,color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/40' },
  SYSTEM:           { icon: Sparkles,    color: 'text-slate-600',  bg: 'bg-slate-100 dark:bg-neutral-800' },
  ALERT:            { icon: AlertCircle, color: 'text-rose-600',   bg: 'bg-rose-100 dark:bg-rose-900/40' },
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['market-notifications'],
    queryFn: () => notificationsApi.list({ limit: 50 }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['market-notifications'] });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: invalidate,
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => { invalidate(); toast.success('Sab read mark ho gaye'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.delete(id),
    onSuccess: () => { invalidate(); toast.success('Delete ho gaya'); },
  });

  const items = data?.items || [];
  const unreadCount = items.filter((n: any) => !n.isRead).length;

  const handleClick = (n: any) => {
    if (!n.isRead) markReadMutation.mutate(n.id);
    if (n.actionUrl) navigate(n.actionUrl);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Bell className="h-6 w-6 text-brand-600" />
            Notifications
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up ✨'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllMutation.mutate()}
            leftIcon={<CheckCheck className="h-3.5 w-3.5" />}
            loading={markAllMutation.isPending}
          >
            Mark All Read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : !items.length ? (
        <EmptyState
          emoji="🔔"
          title="Koi notification nahi"
          description="Order updates aur offers yahan aayenge"
          size="lg"
        />
      ) : (
        <div className="space-y-2">
          {items.map((n: any) => {
            const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.SYSTEM;
            const Icon = cfg.icon;

            return (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                className={cn(
                  'p-3 rounded-2xl border shadow-soft flex items-start gap-3 cursor-pointer transition group',
                  !n.isRead
                    ? 'bg-brand-50/50 dark:bg-brand-950/20 border-brand-200 dark:border-brand-800 hover:bg-brand-50 dark:hover:bg-brand-950/40'
                    : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-800/50',
                )}
              >
                <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center shrink-0', cfg.bg)}>
                  <Icon className={cn('h-5 w-5', cfg.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        'font-extrabold text-sm',
                        !n.isRead ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300',
                      )}>
                        {n.title}
                      </span>
                      {!n.isRead && (
                        <span className="h-2 w-2 rounded-full bg-brand-500 animate-pulse-soft" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 font-bold whitespace-nowrap">
                      {formatTime(n.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">
                    {n.body}
                  </p>
                  {n.imageUrl && (
                    <img
                      src={n.imageUrl}
                      className="mt-2 h-32 w-full rounded-lg object-cover"
                      alt=""
                    />
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMutation.mutate(n.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 h-7 w-7 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/30 flex items-center justify-center transition"
                >
                  <Trash2 className="h-3.5 w-3.5 text-slate-500 hover:text-rose-600" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return 'abhi';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d`;
  return date.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
}
