import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Bell, BellOff, CheckCheck, AlertTriangle, ShoppingCart, DollarSign,
  Wallet, Info, Trash2, Volume2, VolumeX, Sparkles, Search,
  Package, UserPlus, ArrowLeftRight, Receipt, AlertCircle, Crown,
  RefreshCw, Inbox, ArrowRight, Calendar, Clock, X,
} from 'lucide-react';
import { notificationsApi, type NotificationType, type Notification } from '@/api/notifications.api';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

const typeIcons: Record<NotificationType, any> = {
  INFO: Info, SUCCESS: CheckCheck, WARNING: AlertTriangle, ERROR: AlertCircle,
  LOW_STOCK: AlertTriangle, OUT_OF_STOCK: AlertCircle, NEW_SALE: ShoppingCart,
  PAYMENT_RECEIVED: DollarSign, PAYMENT_APPROVED: CheckCheck, PAYMENT_REJECTED: AlertCircle,
  RETURN_PROCESSED: Package, NEW_CUSTOMER: UserPlus, STOCK_TRANSFER: ArrowLeftRight,
  EXPENSE_ADDED: Receipt, INVOICE_DUE: AlertTriangle, SUBSCRIPTION_EXPIRING: Crown,
  REGISTER_OPENED: Wallet, REGISTER_CLOSED: Wallet, CREDIT_ALERT: AlertTriangle, SYSTEM: Info,
};

const typeColors: Record<NotificationType, { bg: string; text: string; ring: string; gradient: string }> = {
  INFO:                  { bg: 'bg-blue-100',    text: 'text-blue-700',    ring: 'ring-blue-200',    gradient: 'from-blue-500 to-blue-600' },
  SUCCESS:               { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-200', gradient: 'from-emerald-500 to-emerald-600' },
  WARNING:               { bg: 'bg-amber-100',   text: 'text-amber-700',   ring: 'ring-amber-200',   gradient: 'from-amber-500 to-amber-600' },
  ERROR:                 { bg: 'bg-rose-100',    text: 'text-rose-700',    ring: 'ring-rose-200',    gradient: 'from-rose-500 to-rose-600' },
  LOW_STOCK:             { bg: 'bg-amber-100',   text: 'text-amber-700',   ring: 'ring-amber-200',   gradient: 'from-amber-500 to-amber-600' },
  OUT_OF_STOCK:          { bg: 'bg-rose-100',    text: 'text-rose-700',    ring: 'ring-rose-200',    gradient: 'from-rose-500 to-rose-600' },
  NEW_SALE:              { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-200', gradient: 'from-emerald-500 to-emerald-600' },
  PAYMENT_RECEIVED:      { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-200', gradient: 'from-emerald-500 to-emerald-600' },
  PAYMENT_APPROVED:      { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-200', gradient: 'from-emerald-500 to-emerald-600' },
  PAYMENT_REJECTED:      { bg: 'bg-rose-100',    text: 'text-rose-700',    ring: 'ring-rose-200',    gradient: 'from-rose-500 to-rose-600' },
  RETURN_PROCESSED:      { bg: 'bg-violet-100',  text: 'text-violet-700',  ring: 'ring-violet-200',  gradient: 'from-violet-500 to-violet-600' },
  NEW_CUSTOMER:          { bg: 'bg-blue-100',    text: 'text-blue-700',    ring: 'ring-blue-200',    gradient: 'from-blue-500 to-blue-600' },
  STOCK_TRANSFER:        { bg: 'bg-cyan-100',    text: 'text-cyan-700',    ring: 'ring-cyan-200',    gradient: 'from-cyan-500 to-cyan-600' },
  EXPENSE_ADDED:         { bg: 'bg-orange-100',  text: 'text-orange-700',  ring: 'ring-orange-200',  gradient: 'from-orange-500 to-orange-600' },
  INVOICE_DUE:           { bg: 'bg-amber-100',   text: 'text-amber-700',   ring: 'ring-amber-200',   gradient: 'from-amber-500 to-amber-600' },
  SUBSCRIPTION_EXPIRING: { bg: 'bg-amber-100',   text: 'text-amber-700',   ring: 'ring-amber-200',   gradient: 'from-amber-500 to-amber-600' },
  REGISTER_OPENED:       { bg: 'bg-blue-100',    text: 'text-blue-700',    ring: 'ring-blue-200',    gradient: 'from-blue-500 to-blue-600' },
  REGISTER_CLOSED:       { bg: 'bg-slate-100',   text: 'text-slate-700',   ring: 'ring-slate-200',   gradient: 'from-slate-500 to-slate-600' },
  CREDIT_ALERT:          { bg: 'bg-rose-100',    text: 'text-rose-700',    ring: 'ring-rose-200',    gradient: 'from-rose-500 to-rose-600' },
  SYSTEM:                { bg: 'bg-slate-100',   text: 'text-slate-700',   ring: 'ring-slate-200',   gradient: 'from-slate-500 to-slate-600' },
};

const FILTER_TABS = [
  { value: 'all',       label: 'All',       icon: Inbox,           types: undefined },
  { value: 'unread',    label: 'Unread',    icon: Bell,            types: undefined },
  { value: 'sales',     label: 'Sales',     icon: ShoppingCart,    types: ['NEW_SALE', 'PAYMENT_RECEIVED', 'PAYMENT_APPROVED'] as NotificationType[] },
  { value: 'inventory', label: 'Inventory', icon: Package,         types: ['LOW_STOCK', 'OUT_OF_STOCK', 'STOCK_TRANSFER'] as NotificationType[] },
  { value: 'alerts',    label: 'Alerts',    icon: AlertTriangle,   types: ['ERROR', 'CREDIT_ALERT', 'INVOICE_DUE', 'PAYMENT_REJECTED'] as NotificationType[] },
] as const;

const formatFullTime = (value: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

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

  // Counts per tab
  const counts = useMemo(() => {
    const map: Record<string, number> = { all: notifications.length, unread: 0 };
    notifications.forEach((n) => {
      if (!n.isRead) map.unread++;
      FILTER_TABS.forEach((tab) => {
        if (tab.types && tab.types.includes(n.type)) {
          map[tab.value] = (map[tab.value] || 0) + 1;
        }
      });
    });
    return map;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    let list = notifications;
    const activeFilter = FILTER_TABS.find((t) => t.value === filter);
    if (filter === 'unread') {
      list = list.filter((n) => !n.isRead);
    } else if (activeFilter && activeFilter.types) {
      list = list.filter((n) => activeFilter.types!.includes(n.type));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (n) => n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q),
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
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
    toast.success(next ? 'Sound muted' : 'Sound enabled');
  };

  const handleClick = (n: Notification) => {
    if (!n.isRead) markReadMutation.mutate(n.id);
    if (n.link) navigate(n.link);
  };

  const totalCount = notifications.length;
  const groupIcons: Record<string, any> = { Today: Sparkles, Yesterday: Clock, 'This Week': Calendar, Earlier: Inbox };

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-brand-900 to-brand-700 text-white p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="h-20 w-20 rounded-3xl bg-white/15 backdrop-blur flex items-center justify-center shadow-xl ring-1 ring-white/20">
                <Bell className="h-9 w-9 text-white" />
              </div>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-7 min-w-[28px] px-1.5 rounded-full bg-rose-500 text-white text-xs font-extrabold flex items-center justify-center ring-4 ring-slate-900 shadow-lg">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                Notification Center
              </div>
              <h2 className="mt-2 text-3xl font-extrabold">Notifications</h2>
              <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
                <span className="px-2 py-0.5 rounded-md bg-white/15 font-bold">
                  {totalCount} total
                </span>
                <span className="px-2 py-0.5 rounded-md bg-rose-500/30 font-bold text-rose-100">
                  {unreadCount} unread
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/30 font-bold text-emerald-100">
                  {totalCount - unreadCount} read
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              onClick={toggleMute}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              {muted ? 'Muted' : 'Sound On'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => refetch()}
              disabled={isFetching}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {unreadCount > 0 && (
              <Button
                onClick={() => markAllMutation.mutate()}
                disabled={markAllMutation.isPending}
                className="bg-white text-brand-700 hover:bg-slate-100 shadow-lg"
              >
                <CheckCheck className="h-4 w-4" />
                Mark all read
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* FILTER + SEARCH */}
      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl">
            {FILTER_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = filter === tab.value;
              const count = counts[tab.value] || 0;
              return (
                <button
                  key={tab.value}
                  onClick={() => setFilter(tab.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition ${
                    isActive
                      ? 'bg-white text-brand-700 shadow-md'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                  {count > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-extrabold ${
                      isActive ? 'bg-brand-100 text-brand-700' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="flex-1 min-w-[200px] relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notifications..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* LIST */}
      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <RefreshCw className="h-10 w-10 mx-auto animate-spin text-brand-500 mb-3" />
            <p className="text-sm font-semibold text-slate-600">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-16 text-center">
            <div className="h-24 w-24 mx-auto rounded-3xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center mb-4 shadow-inner">
              <BellOff className="h-12 w-12 text-slate-400" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900">No notifications found</h3>
            <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
              {search
                ? 'Try a different search term'
                : filter !== 'all'
                ? `No notifications in "${filter}" category`
                : 'You are all caught up. Naye updates yahan dikhenge.'}
            </p>
            {(search || filter !== 'all') && (
              <button
                onClick={() => { setSearch(''); setFilter('all'); }}
                className="mt-4 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold inline-flex items-center gap-1"
              >
                Show all <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
        ) : (
          <div>
            {Object.entries(groupedByDate).map(([dateLabel, items]) => {
              const GroupIcon = groupIcons[dateLabel] || Calendar;
              return (
                <div key={dateLabel}>
                  {/* Date group header */}
                  <div className="px-5 py-3 bg-gradient-to-br from-slate-50 to-white border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                        <GroupIcon className="h-3.5 w-3.5 text-slate-600" />
                      </div>
                      <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                        {dateLabel}
                      </h4>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-[10px] font-extrabold text-slate-600">
                      {items.length}
                    </span>
                  </div>

                  {/* Items */}
                  <div className="divide-y divide-slate-100">
                    {items.map((n) => {
                      const Icon = typeIcons[n.type] || Info;
                      const color = typeColors[n.type] || typeColors.SYSTEM;
                      return (
                        <div
                          key={n.id}
                          onClick={() => handleClick(n)}
                          className={`group relative px-5 py-4 cursor-pointer transition-all ${
                            !n.isRead
                              ? 'bg-gradient-to-r from-blue-50/40 to-transparent hover:from-blue-50/70'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          {!n.isRead && (
                            <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${color.gradient}`} />
                          )}

                          <div className="flex items-start gap-4 pl-1">
                            <div
                              className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                                !n.isRead
                                  ? `bg-gradient-to-br ${color.gradient} text-white`
                                  : `${color.bg} ${color.text}`
                              } ring-2 ${color.ring}`}
                            >
                              <Icon className="h-5 w-5" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2 flex-wrap">
                                    {n.title}
                                    {!n.isRead && (
                                      <span className="h-2 w-2 rounded-full bg-blue-500 shadow-sm" />
                                    )}
                                  </div>
                                  <div className="text-sm text-slate-600 mt-1 leading-relaxed">
                                    {n.message}
                                  </div>
                                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    <span
                                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${color.bg} ${color.text}`}
                                    >
                                      {n.type.replace(/_/g, ' ')}
                                    </span>
                                    <span
                                      className="text-[10px] text-slate-500 font-semibold inline-flex items-center gap-1"
                                      title={formatFullTime(n.createdAt)}
                                    >
                                      <Clock className="h-2.5 w-2.5" />
                                      {formatRelative(n.createdAt)}
                                    </span>
                                    {n.link && (
                                      <span className="text-[10px] text-brand-700 font-extrabold inline-flex items-center gap-0.5 group-hover:gap-1 transition-all">
                                        View <ArrowRight className="h-2.5 w-2.5" />
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                                  {!n.isRead && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        markReadMutation.mutate(n.id);
                                      }}
                                      className="h-9 w-9 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center transition"
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
                                    className="h-9 w-9 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition"
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
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
