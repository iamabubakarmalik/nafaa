import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Bell, BellOff, CheckCheck, AlertTriangle, ShoppingCart, DollarSign,
  Wallet, Info, Trash2, Volume2, VolumeX, Sparkles, Filter, Search,
  Package, UserPlus, ArrowLeftRight, Receipt, AlertCircle, Crown,
  RefreshCw, Inbox,
} from 'lucide-react';
import { notificationsApi, type NotificationType, type Notification } from '@/api/notifications.api';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';

const typeIcons: Record<NotificationType, any> = {
  INFO: Info, SUCCESS: CheckCheck, WARNING: AlertTriangle, ERROR: AlertCircle,
  LOW_STOCK: AlertTriangle, OUT_OF_STOCK: AlertCircle, NEW_SALE: ShoppingCart,
  PAYMENT_RECEIVED: DollarSign, PAYMENT_APPROVED: CheckCheck, PAYMENT_REJECTED: AlertCircle,
  RETURN_PROCESSED: Package, NEW_CUSTOMER: UserPlus, STOCK_TRANSFER: ArrowLeftRight,
  EXPENSE_ADDED: Receipt, INVOICE_DUE: AlertTriangle, SUBSCRIPTION_EXPIRING: Crown,
  REGISTER_OPENED: Wallet, REGISTER_CLOSED: Wallet, CREDIT_ALERT: AlertTriangle, SYSTEM: Info,
};

const typeColors: Record<NotificationType, { bg: string; text: string; ring: string }> = {
  INFO: { bg: 'bg-blue-100', text: 'text-blue-700', ring: 'ring-blue-200' },
  SUCCESS: { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-200' },
  WARNING: { bg: 'bg-amber-100', text: 'text-amber-700', ring: 'ring-amber-200' },
  ERROR: { bg: 'bg-rose-100', text: 'text-rose-700', ring: 'ring-rose-200' },
  LOW_STOCK: { bg: 'bg-amber-100', text: 'text-amber-700', ring: 'ring-amber-200' },
  OUT_OF_STOCK: { bg: 'bg-rose-100', text: 'text-rose-700', ring: 'ring-rose-200' },
  NEW_SALE: { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-200' },
  PAYMENT_RECEIVED: { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-200' },
  PAYMENT_APPROVED: { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-200' },
  PAYMENT_REJECTED: { bg: 'bg-rose-100', text: 'text-rose-700', ring: 'ring-rose-200' },
  RETURN_PROCESSED: { bg: 'bg-violet-100', text: 'text-violet-700', ring: 'ring-violet-200' },
  NEW_CUSTOMER: { bg: 'bg-blue-100', text: 'text-blue-700', ring: 'ring-blue-200' },
  STOCK_TRANSFER: { bg: 'bg-cyan-100', text: 'text-cyan-700', ring: 'ring-cyan-200' },
  EXPENSE_ADDED: { bg: 'bg-orange-100', text: 'text-orange-700', ring: 'ring-orange-200' },
  INVOICE_DUE: { bg: 'bg-amber-100', text: 'text-amber-700', ring: 'ring-amber-200' },
  SUBSCRIPTION_EXPIRING: { bg: 'bg-amber-100', text: 'text-amber-700', ring: 'ring-amber-200' },
  REGISTER_OPENED: { bg: 'bg-blue-100', text: 'text-blue-700', ring: 'ring-blue-200' },
  REGISTER_CLOSED: { bg: 'bg-slate-100', text: 'text-slate-700', ring: 'ring-slate-200' },
  CREDIT_ALERT: { bg: 'bg-rose-100', text: 'text-rose-700', ring: 'ring-rose-200' },
  SYSTEM: { bg: 'bg-slate-100', text: 'text-slate-700', ring: 'ring-slate-200' },
};

const FILTER_TABS = [
  {
    value: 'all',
    label: 'All',
    icon: Inbox,
    types: undefined,
  },
  {
    value: 'unread',
    label: 'Unread',
    icon: Bell,
  },
  {
    value: 'sales',
    label: 'Sales',
    icon: ShoppingCart,
    types: ['NEW_SALE', 'PAYMENT_RECEIVED', 'PAYMENT_APPROVED'] as NotificationType[],
  },
  {
    value: 'inventory',
    label: 'Inventory',
    icon: Package,
    types: ['LOW_STOCK', 'OUT_OF_STOCK', 'STOCK_TRANSFER'] as NotificationType[],
  },
  {
    value: 'alerts',
    label: 'Alerts',
    icon: AlertTriangle,
    types: ['ERROR', 'CREDIT_ALERT', 'INVOICE_DUE', 'PAYMENT_REJECTED'] as NotificationType[],
  },
] as const;

const formatFullTime = (value: string) => {
  const date = new Date(value);
  return new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const formatRelative = (value: string) => {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat('en-PK', { dateStyle: 'short' }).format(date);
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isMuted, setMuted } = useNotificationSound();
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [muted, setMutedState] = useState(isMuted());

  const { data: notifData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['notifications', 'list', { limit: 100 }],
    queryFn: () => notificationsApi.list({ limit: 100 }),
    refetchInterval: 30000,
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'count'],
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: 30000,
  });

  const notifications: Notification[] = notifData?.items ?? [];

  const filteredNotifications = useMemo(() => {
    let list = notifications;

    const activeFilter = FILTER_TABS.find((t) => t.value === filter);
    if (filter === 'unread') {
      list = list.filter((n) => !n.isRead);
    } else if (activeFilter && 'types' in activeFilter && activeFilter.types) {
      list = list.filter((n) => activeFilter.types!.includes(n.type as any));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.message.toLowerCase().includes(q),
      );
    }

    return list;
  }, [notifications, filter, search]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, Notification[]> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    filteredNotifications.forEach((n) => {
      const d = new Date(n.createdAt);
      let key: string;
      if (d >= today) key = 'Today';
      else if (d >= yesterday) key = 'Yesterday';
      else if (d >= weekAgo) key = 'This Week';
      else key = 'Earlier';

      if (!groups[key]) groups[key] = [];
      groups[key].push(n);
    });

    return groups;
  }, [filteredNotifications]);

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notification deleted');
    },
  });

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
    toast.success(next ? '🔇 Sound muted' : '🔔 Sound enabled');
  };

  const handleClick = (n: Notification) => {
    if (!n.isRead) markReadMutation.mutate(n.id);
    if (n.link) navigate(n.link);
  };

  const totalCount = notifications.length;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 text-white p-6 shadow-soft">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-3xl bg-white/20 flex items-center justify-center backdrop-blur">
              <Bell className="h-8 w-8 text-white" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" />
                Notification Center
              </div>
              <h2 className="mt-2 text-3xl font-bold">Notifications</h2>
              <div className="flex items-center gap-3 mt-1 text-sm text-white/80">
                <span>{totalCount} total</span>
                <span>•</span>
                <span className="font-semibold">{unreadCount} unread</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={toggleMute}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              {muted ? 'Muted' : 'Sound On'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => refetch()}
              disabled={isFetching}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {unreadCount > 0 && (
              <Button
                onClick={() => markAllMutation.mutate()}
                disabled={markAllMutation.isPending}
                className="bg-white text-emerald-700 hover:bg-slate-100"
              >
                <CheckCheck className="h-4 w-4" />
                Mark all read
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Filter tabs + search */}
      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            {FILTER_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = filter === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setFilter(tab.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                    isActive
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex-1 min-w-[200px]">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notifications..."
              leftIcon={<Search className="h-4 w-4 text-slate-400" />}
            />
          </div>
        </div>
      </section>

      {/* List */}
      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="h-8 w-8 mx-auto animate-spin text-slate-400 mb-3" />
            Loading notifications...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-16 text-center">
            <div className="h-20 w-20 mx-auto rounded-3xl bg-slate-100 flex items-center justify-center mb-4">
              <BellOff className="h-10 w-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No notifications found</h3>
            <p className="text-sm text-slate-500 mt-1">
              {search
                ? 'Try a different search term'
                : filter !== 'all'
                ? 'No notifications in this category'
                : 'You\'re all caught up!'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {Object.entries(groupedByDate).map(([dateLabel, items]) => (
              <div key={dateLabel}>
                <div className="px-5 py-2 bg-slate-50 border-b border-slate-100">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {dateLabel}
                    <span className="ml-2 text-slate-400">({items.length})</span>
                  </h4>
                </div>
                <div className="divide-y divide-slate-100">
                  {items.map((n) => {
                    const Icon = typeIcons[n.type] || Info;
                    const color = typeColors[n.type] || typeColors.SYSTEM;
                    return (
                      <div
                        key={n.id}
                        onClick={() => handleClick(n)}
                        className={`px-5 py-4 hover:bg-slate-50 transition cursor-pointer ${
                          !n.isRead ? 'bg-blue-50/30' : ''
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className={`h-11 w-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${color.bg} ${color.text} ring-2 ${color.ring}`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                  {n.title}
                                  {!n.isRead && (
                                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                                  )}
                                </div>
                                <div className="text-sm text-slate-600 mt-1">
                                  {n.message}
                                </div>
                                <div className="flex items-center gap-3 mt-2">
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${color.bg} ${color.text}`}
                                  >
                                    {n.type.replace(/_/g, ' ')}
                                  </span>
                                  <span
                                    className="text-[10px] text-slate-500"
                                    title={formatFullTime(n.createdAt)}
                                  >
                                    {formatRelative(n.createdAt)}
                                  </span>
                                  {n.link && (
                                    <span className="text-[10px] text-emerald-700 font-bold">
                                      Click to view →
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                {!n.isRead && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markReadMutation.mutate(n.id);
                                    }}
                                    className="h-8 w-8 rounded-lg hover:bg-emerald-100 text-emerald-600 flex items-center justify-center"
                                    title="Mark as read"
                                  >
                                    <CheckCheck className="h-4 w-4" />
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteMutation.mutate(n.id);
                                  }}
                                  className="h-8 w-8 rounded-lg hover:bg-rose-100 text-rose-600 flex items-center justify-center"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
