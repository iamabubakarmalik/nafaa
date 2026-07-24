import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import {
  Bell, Check, CheckCheck, Trash2, Package, Tag, MessageCircle,
  Sparkles, Gift, TrendingUp, ShoppingBag,
} from 'lucide-react';
import { notificationsApi } from '../api/notifications.api';
import { Button, Card, EmptyState, Badge } from '@/ui';
import { timeAgo } from '@/lib/format';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';
import { useSocketEvent } from '@/lib/useSocket';

const typeIcons: Record<string, any> = {
  ORDER_UPDATE: Package,
  CART_REMINDER_1: ShoppingBag,
  CART_REMINDER_2: ShoppingBag,
  CART_COUPON: Gift,
  PROMO: Tag,
  BARGAIN: MessageCircle,
  GROUP_BUY_SUCCESS: Sparkles,
  AUCTION_WON: Sparkles,
  REVIEW_REMINDER: TrendingUp,
  DEFAULT: Bell,
};

const typeColors: Record<string, string> = {
  ORDER_UPDATE: 'from-brand-500 to-brand-700',
  CART_REMINDER_1: 'from-amber-500 to-amber-700',
  CART_REMINDER_2: 'from-orange-500 to-orange-700',
  CART_COUPON: 'from-pink-500 to-pink-700',
  PROMO: 'from-purple-500 to-purple-700',
  BARGAIN: 'from-accent-500 to-accent-700',
  GROUP_BUY_SUCCESS: 'from-emerald-500 to-emerald-700',
  AUCTION_WON: 'from-yellow-500 to-yellow-700',
  REVIEW_REMINDER: 'from-blue-500 to-blue-700',
  DEFAULT: 'from-slate-500 to-slate-700',
};

export default function NotificationsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', filter],
    queryFn: () => notificationsApi.list({ onlyUnread: filter === 'unread', limit: 50 }),
  });

  useSocketEvent('notification:new', () => {
    qc.invalidateQueries({ queryKey: ['notifications'] });
  });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All marked as read');
    },
  });

  const clearAll = useMutation({
    mutationFn: () => notificationsApi.clearAll({ onlyRead: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Cleared read notifications');
    },
  });

  return (
    <>
      <Helmet><title>Notifications — Nafaa Bazaar</title></Helmet>

      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-content flex items-center gap-2">
              <Bell className="h-7 w-7 text-brand-600" />
              Notifications
              {data && data.unreadCount > 0 && (
                <Badge variant="danger" size="lg">{data.unreadCount}</Badge>
              )}
            </h1>
          </div>
          {data && data.unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllRead.mutate()}
              leftIcon={<CheckCheck className="h-4 w-4" />}
            >
              Mark all read
            </Button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 border-b border-border">
          {([
            { key: 'all', label: 'All' },
            { key: 'unread', label: `Unread ${data?.unreadCount ? `(${data.unreadCount})` : ''}` },
          ] as const).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'px-4 py-3 text-sm font-black border-b-2 transition',
                filter === f.key
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-content-muted hover:text-content',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-20 rounded-2xl" />
            ))}
          </div>
        ) : !data?.items.length ? (
          <EmptyState
            icon={Bell}
            title={filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            description="Order updates, deals, and messages will appear here"
          />
        ) : (
          <div className="space-y-2">
            {data.items.map((n) => {
              const Icon = typeIcons[n.type] || typeIcons.DEFAULT;
              const color = typeColors[n.type] || typeColors.DEFAULT;
              const content = (
                <Card className={cn(
                  'p-4 transition-all cursor-pointer group',
                  !n.isRead && 'bg-brand-50/50 dark:bg-brand-950/20 border-brand-200 dark:border-brand-800',
                  n.isRead && 'hover:shadow-soft',
                )}>
                  <div className="flex gap-3">
                    <div className={cn('h-11 w-11 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0', color)}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className={cn('text-sm', n.isRead ? 'font-bold text-content' : 'font-black text-content')}>
                          {n.title}
                        </h4>
                        {!n.isRead && (
                          <span className="h-2 w-2 rounded-full bg-brand-500 animate-pulse-soft shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-content-muted line-clamp-2 mt-0.5">
                        {n.body}
                      </p>
                      <div className="text-2xs text-content-subtle mt-1.5 font-semibold">
                        {timeAgo(n.createdAt)}
                      </div>
                    </div>
                    {!n.isRead && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          markRead.mutate(n.id);
                        }}
                        className="h-8 w-8 rounded-full hover:bg-brand-100 dark:hover:bg-brand-900/40 flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition"
                        title="Mark read"
                      >
                        <Check className="h-4 w-4 text-brand-600" />
                      </button>
                    )}
                  </div>
                </Card>
              );

              return n.actionUrl ? (
                <Link
                  key={n.id}
                  to={n.actionUrl}
                  onClick={() => !n.isRead && markRead.mutate(n.id)}
                >
                  {content}
                </Link>
              ) : (
                <div key={n.id} onClick={() => !n.isRead && markRead.mutate(n.id)}>
                  {content}
                </div>
              );
            })}
          </div>
        )}

        {data && data.items.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            fullWidth
            onClick={() => clearAll.mutate()}
            leftIcon={<Trash2 className="h-4 w-4" />}
            className="text-danger hover:bg-danger/10"
          >
            Clear read notifications
          </Button>
        )}
      </div>
    </>
  );
}
