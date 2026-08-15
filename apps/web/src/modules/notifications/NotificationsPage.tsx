import { useState, useMemo, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Bell, BellOff, CheckCheck, AlertTriangle, ShoppingCart, DollarSign,
  Wallet, Info, Trash2, Volume2, VolumeX, Sparkles, Search,
  Package, UserPlus, ArrowLeftRight, Receipt, AlertCircle, Crown,
  RefreshCw, Inbox, ArrowRight, Calendar, Clock, X, GraduationCap,
  Printer, CheckSquare, Square, Zap,
} from 'lucide-react';
import { notificationsApi, type NotificationType, type Notification } from '@modules/notifications/api/notifications.api';
import { useNotificationSound } from '@core/hooks/useNotificationSound';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';
import { useAuthStore } from '@core/stores/auth.store';

/* ═════════════════════════════════════════════════════════════
   NAFAA NOTIFICATIONS — GLOBAL FULL BEST v3
   ─────────────────────────────────────────────────────────────
   🌍 Universal notification center
   🌙 Dark mode complete
   🎓 Teacher modal — categories & priorities guide
   ⌨️  / = search • R = mark all read • M = mute • Esc = close
   ⚡ Bulk select + delete + mark read
   🖨️ Print + smart grouping (Today/Yesterday/Week/Earlier)
   ═════════════════════════════════════════════════════════════ */

const typeIcons: Record<NotificationType, any> = {
  INFO: Info, SUCCESS: CheckCheck, WARNING: AlertTriangle, ERROR: AlertCircle,
  LOW_STOCK: AlertTriangle, OUT_OF_STOCK: AlertCircle, NEW_SALE: ShoppingCart,
  PAYMENT_RECEIVED: DollarSign, PAYMENT_APPROVED: CheckCheck, PAYMENT_REJECTED: AlertCircle,
  RETURN_PROCESSED: Package, NEW_CUSTOMER: UserPlus, STOCK_TRANSFER: ArrowLeftRight,
  EXPENSE_ADDED: Receipt, INVOICE_DUE: AlertTriangle, SUBSCRIPTION_EXPIRING: Crown,
  REGISTER_OPENED: Wallet, REGISTER_CLOSED: Wallet, CREDIT_ALERT: AlertTriangle, SYSTEM: Info,
};

const typeColors: Record<NotificationType, { bg: string; text: string; ring: string; gradient: string; darkBg: string; darkText: string; darkRing: string }> = {
  INFO:                  { bg: 'bg-blue-100',    text: 'text-blue-700',    ring: 'ring-blue-200',    gradient: 'from-blue-500 to-blue-600',       darkBg: 'dark:bg-blue-500/20',    darkText: 'dark:text-blue-300',    darkRing: 'dark:ring-blue-500/30' },
  SUCCESS:               { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-200', gradient: 'from-emerald-500 to-emerald-600', darkBg: 'dark:bg-emerald-500/20', darkText: 'dark:text-emerald-300', darkRing: 'dark:ring-emerald-500/30' },
  WARNING:               { bg: 'bg-amber-100',   text: 'text-amber-700',   ring: 'ring-amber-200',   gradient: 'from-amber-500 to-amber-600',     darkBg: 'dark:bg-amber-500/20',   darkText: 'dark:text-amber-300',   darkRing: 'dark:ring-amber-500/30' },
  ERROR:                 { bg: 'bg-rose-100',    text: 'text-rose-700',    ring: 'ring-rose-200',    gradient: 'from-rose-500 to-rose-600',       darkBg: 'dark:bg-rose-500/20',    darkText: 'dark:text-rose-300',    darkRing: 'dark:ring-rose-500/30' },
  LOW_STOCK:             { bg: 'bg-amber-100',   text: 'text-amber-700',   ring: 'ring-amber-200',   gradient: 'from-amber-500 to-amber-600',     darkBg: 'dark:bg-amber-500/20',   darkText: 'dark:text-amber-300',   darkRing: 'dark:ring-amber-500/30' },
  OUT_OF_STOCK:          { bg: 'bg-rose-100',    text: 'text-rose-700',    ring: 'ring-rose-200',    gradient: 'from-rose-500 to-rose-600',       darkBg: 'dark:bg-rose-500/20',    darkText: 'dark:text-rose-300',    darkRing: 'dark:ring-rose-500/30' },
  NEW_SALE:              { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-200', gradient: 'from-emerald-500 to-emerald-600', darkBg: 'dark:bg-emerald-500/20', darkText: 'dark:text-emerald-300', darkRing: 'dark:ring-emerald-500/30' },
  PAYMENT_RECEIVED:      { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-200', gradient: 'from-emerald-500 to-emerald-600', darkBg: 'dark:bg-emerald-500/20', darkText: 'dark:text-emerald-300', darkRing: 'dark:ring-emerald-500/30' },
  PAYMENT_APPROVED:      { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-200', gradient: 'from-emerald-500 to-emerald-600', darkBg: 'dark:bg-emerald-500/20', darkText: 'dark:text-emerald-300', darkRing: 'dark:ring-emerald-500/30' },
  PAYMENT_REJECTED:      { bg: 'bg-rose-100',    text: 'text-rose-700',    ring: 'ring-rose-200',    gradient: 'from-rose-500 to-rose-600',       darkBg: 'dark:bg-rose-500/20',    darkText: 'dark:text-rose-300',    darkRing: 'dark:ring-rose-500/30' },
  RETURN_PROCESSED:      { bg: 'bg-violet-100',  text: 'text-violet-700',  ring: 'ring-violet-200',  gradient: 'from-violet-500 to-violet-600',   darkBg: 'dark:bg-violet-500/20',  darkText: 'dark:text-violet-300',  darkRing: 'dark:ring-violet-500/30' },
  NEW_CUSTOMER:          { bg: 'bg-blue-100',    text: 'text-blue-700',    ring: 'ring-blue-200',    gradient: 'from-blue-500 to-blue-600',       darkBg: 'dark:bg-blue-500/20',    darkText: 'dark:text-blue-300',    darkRing: 'dark:ring-blue-500/30' },
  STOCK_TRANSFER:        { bg: 'bg-cyan-100',    text: 'text-cyan-700',    ring: 'ring-cyan-200',    gradient: 'from-cyan-500 to-cyan-600',       darkBg: 'dark:bg-cyan-500/20',    darkText: 'dark:text-cyan-300',    darkRing: 'dark:ring-cyan-500/30' },
  EXPENSE_ADDED:         { bg: 'bg-orange-100',  text: 'text-orange-700',  ring: 'ring-orange-200',  gradient: 'from-orange-500 to-orange-600',   darkBg: 'dark:bg-orange-500/20',  darkText: 'dark:text-orange-300',  darkRing: 'dark:ring-orange-500/30' },
  INVOICE_DUE:           { bg: 'bg-amber-100',   text: 'text-amber-700',   ring: 'ring-amber-200',   gradient: 'from-amber-500 to-amber-600',     darkBg: 'dark:bg-amber-500/20',   darkText: 'dark:text-amber-300',   darkRing: 'dark:ring-amber-500/30' },
  SUBSCRIPTION_EXPIRING: { bg: 'bg-amber-100',   text: 'text-amber-700',   ring: 'ring-amber-200',   gradient: 'from-amber-500 to-amber-600',     darkBg: 'dark:bg-amber-500/20',   darkText: 'dark:text-amber-300',   darkRing: 'dark:ring-amber-500/30' },
  REGISTER_OPENED:       { bg: 'bg-blue-100',    text: 'text-blue-700',    ring: 'ring-blue-200',    gradient: 'from-blue-500 to-blue-600',       darkBg: 'dark:bg-blue-500/20',    darkText: 'dark:text-blue-300',    darkRing: 'dark:ring-blue-500/30' },
  REGISTER_CLOSED:       { bg: 'bg-slate-100',   text: 'text-slate-700',   ring: 'ring-slate-200',   gradient: 'from-slate-500 to-slate-600',     darkBg: 'dark:bg-slate-500/20',   darkText: 'dark:text-slate-300',   darkRing: 'dark:ring-slate-500/30' },
  CREDIT_ALERT:          { bg: 'bg-rose-100',    text: 'text-rose-700',    ring: 'ring-rose-200',    gradient: 'from-rose-500 to-rose-600',       darkBg: 'dark:bg-rose-500/20',    darkText: 'dark:text-rose-300',    darkRing: 'dark:ring-rose-500/30' },
  SYSTEM:                { bg: 'bg-slate-100',   text: 'text-slate-700',   ring: 'ring-slate-200',   gradient: 'from-slate-500 to-slate-600',     darkBg: 'dark:bg-slate-500/20',   darkText: 'dark:text-slate-300',   darkRing: 'dark:ring-slate-500/30' },
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
  const tenantName = useAuthStore((s) => s.tenant?.name);
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const searchRef = useRef<HTMLInputElement>(null);

  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [muted, setMutedState] = useState(isMuted());
  const [showTeacher, setShowTeacher] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

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
    },
  });

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} notification${selectedIds.size !== 1 ? 's' : ''}?`)) return;
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map((id) => notificationsApi.remove(id)));
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    toast.success(`${ids.length} notification${ids.length !== 1 ? 's' : ''} deleted`);
    setSelectedIds(new Set());
    setSelectMode(false);
  };

  const bulkMarkRead = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map((id) => notificationsApi.markRead(id)));
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    toast.success(`${ids.length} marked as read`);
    setSelectedIds(new Set());
    setSelectMode(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredNotifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredNotifications.map((n) => n.id)));
    }
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
    toast.success(next ? '🔇 Sound muted' : '🔊 Sound enabled');
  };

  const handleClick = (n: Notification) => {
    if (selectMode) {
      toggleSelect(n.id);
      return;
    }
    if (!n.isRead) markReadMutation.mutate(n.id);
    if (n.link) navigate(n.link);
  };

  const totalCount = notifications.length;
  const groupIcons: Record<string, any> = { Today: Sparkles, Yesterday: Clock, 'This Week': Calendar, Earlier: Inbox };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showTeacher) return setShowTeacher(false);
        if (selectMode) {
          setSelectMode(false);
          setSelectedIds(new Set());
          return;
        }
      }
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (showTeacher) return;

      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key.toLowerCase() === 'r' && unreadCount > 0) { e.preventDefault(); markAllMutation.mutate(); }
      if (e.key.toLowerCase() === 'm') { e.preventDefault(); toggleMute(); }
      if (e.key.toLowerCase() === 'g') { e.preventDefault(); setShowTeacher(true); }
      // Filter shortcuts 1-5
      const num = Number(e.key);
      if (num >= 1 && num <= FILTER_TABS.length) {
        e.preventDefault();
        setFilter(FILTER_TABS[num - 1].value);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTeacher, selectMode, unreadCount, muted]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = showTeacher ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [showTeacher]);

  return (
    <div className="space-y-5 pb-10 print:space-y-3">
      {showTeacher && <NotificationsTeacher onClose={() => setShowTeacher(false)} />}

      {/* PRINT HEADER */}
      <div className="hidden print:block">
        <div className="flex items-center justify-between border-b-4 border-blue-600 pb-3 mb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 leading-tight">
              🔔 {tenantName || 'My Store'} — Notifications Report
            </h1>
            <p className="text-xs text-slate-600 font-semibold mt-1">
              {shopName ? `${shopName}  •  ` : ''}{totalCount} total · {unreadCount} unread
            </p>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-500">Generated</div>
            <div className="text-xs font-bold text-slate-900">{new Date().toLocaleString('en-PK')}</div>
          </div>
        </div>
      </div>

      {/* HERO */}
      <section className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-brand-900 to-brand-700 dark:from-slate-950 dark:via-brand-950 dark:to-brand-800 text-white p-4 sm:p-6 shadow-2xl relative overflow-hidden print:hidden">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl animate-pulse" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative">
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-3xl bg-white/15 backdrop-blur flex items-center justify-center shadow-xl ring-1 ring-white/20">
                <Bell className={`h-8 w-8 sm:h-9 sm:w-9 text-white ${unreadCount > 0 ? 'animate-pulse' : ''}`} />
              </div>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-7 min-w-[28px] px-1.5 rounded-full bg-rose-500 text-white text-xs font-extrabold flex items-center justify-center ring-4 ring-slate-900 dark:ring-slate-950 shadow-lg">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold backdrop-blur border border-white/25">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                Notification Center
                {shopName && (
                  <>
                    <span className="opacity-40">•</span>
                    <span className="text-emerald-200">🏪 {shopName}</span>
                  </>
                )}
              </div>
              <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold">Notifications</h2>
              <div className="flex items-center gap-1.5 mt-2 flex-wrap text-xs">
                <span className="px-2 py-0.5 rounded-md bg-white/15 font-extrabold">
                  {totalCount} total
                </span>
                <span className="px-2 py-0.5 rounded-md bg-rose-500/30 font-extrabold text-rose-100">
                  {unreadCount} unread
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/30 font-extrabold text-emerald-100">
                  {totalCount - unreadCount} read
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowTeacher(true)}
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition"
            >
              <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Guide</span>
            </button>
            <button
              onClick={toggleMute}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur transition"
              title={muted ? 'Unmute (M)' : 'Mute (M)'}
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              <span className="hidden sm:inline">{muted ? 'Muted' : 'Sound On'}</span>
            </button>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur disabled:opacity-50 transition"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={() => window.print()}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur transition"
            >
              <Printer className="h-4 w-4" /> <span className="hidden sm:inline">Print</span>
            </button>
            {unreadCount > 0 && (
              <Button
                onClick={() => markAllMutation.mutate()}
                disabled={markAllMutation.isPending}
                className="bg-white text-brand-700 hover:bg-slate-100 shadow-lg font-extrabold"
              >
                <CheckCheck className="h-4 w-4" />
                Mark all read <Kbd>R</Kbd>
              </Button>
            )}
          </div>
        </div>

        {/* Shortcuts hint */}
        <div className="relative mt-3 hidden sm:flex flex-wrap gap-1.5 text-[10px] font-bold items-center">
          <Kbd>/</Kbd><span className="text-white/60">Search</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>1</Kbd>–<Kbd>5</Kbd><span className="text-white/60">Filters</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>R</Kbd><span className="text-white/60">Mark all read</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>M</Kbd><span className="text-white/60">Mute</span>
        </div>
      </section>

      {/* FILTER + SEARCH */}
      <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-3 sm:p-4 print:hidden">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-x-auto">
            {FILTER_TABS.map((tab, idx) => {
              const Icon = tab.icon;
              const isActive = filter === tab.value;
              const count = counts[tab.value] || 0;
              return (
                <button
                  key={tab.value}
                  onClick={() => setFilter(tab.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition whitespace-nowrap ${
                    isActive
                      ? 'bg-white dark:bg-slate-700 text-brand-700 dark:text-brand-300 shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
                  }`}
                  title={`Press ${idx + 1}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                  {count > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-extrabold tabular-nums ${
                      isActive
                        ? 'bg-brand-100 dark:bg-brand-500/30 text-brand-700 dark:text-brand-300'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
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
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notifications... (/ shortcut)"
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 pr-10 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 h-6 w-6 rounded hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Select mode toggle */}
          {filteredNotifications.length > 0 && (
            <button
              onClick={() => {
                setSelectMode(!selectMode);
                setSelectedIds(new Set());
              }}
              className={`h-11 px-3 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 transition border-2 ${
                selectMode
                  ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              {selectMode ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
              <span className="hidden sm:inline">{selectMode ? 'Cancel' : 'Select'}</span>
            </button>
          )}
        </div>

        {/* Bulk actions bar */}
        {selectMode && (
          <div className="mt-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-300 dark:border-blue-500/40 p-2.5 flex items-center gap-2 flex-wrap">
            <button
              onClick={toggleSelectAll}
              className="text-xs font-extrabold text-blue-700 dark:text-blue-300 inline-flex items-center gap-1"
            >
              {selectedIds.size === filteredNotifications.length ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
              {selectedIds.size === filteredNotifications.length ? 'Deselect all' : 'Select all'}
            </button>
            <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
              {selectedIds.size} selected
            </span>
            <div className="ml-auto flex gap-1.5">
              {selectedIds.size > 0 && (
                <>
                  <button
                    onClick={bulkMarkRead}
                    className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1 transition"
                  >
                    <CheckCheck className="h-3 w-3" /> Mark read
                  </button>
                  <button
                    onClick={bulkDelete}
                    className="h-8 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold inline-flex items-center gap-1 transition"
                  >
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </section>

      {/* LIST */}
      <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <RefreshCw className="h-10 w-10 mx-auto animate-spin text-brand-500 mb-3" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-16 text-center">
            <div className="h-24 w-24 mx-auto rounded-3xl bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-800/60 flex items-center justify-center mb-4 shadow-inner">
              <BellOff className="h-12 w-12 text-slate-400" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">No notifications found</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto font-semibold">
              {search
                ? 'Try a different search term'
                : filter !== 'all'
                ? `No notifications in "${filter}" category`
                : 'You are all caught up. Naye updates yahan dikhenge.'}
            </p>
            {(search || filter !== 'all') && (
              <button
                onClick={() => { setSearch(''); setFilter('all'); }}
                className="mt-4 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-extrabold inline-flex items-center gap-1 transition"
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
                  <div className="px-5 py-3 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/60 dark:to-slate-900/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 z-10 backdrop-blur">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm">
                        <GroupIcon className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
                      </div>
                      <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                        {dateLabel}
                      </h4>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-extrabold text-slate-600 dark:text-slate-300">
                      {items.length}
                    </span>
                  </div>

                  {/* Items */}
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {items.map((n) => {
                      const Icon = typeIcons[n.type] || Info;
                      const color = typeColors[n.type] || typeColors.SYSTEM;
                      const isSelected = selectedIds.has(n.id);
                      return (
                        <div
                          key={n.id}
                          onClick={() => handleClick(n)}
                          className={`group relative px-4 sm:px-5 py-4 cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-500/10 ring-2 ring-blue-400 dark:ring-blue-500/60 ring-inset'
                              : !n.isRead
                                ? 'bg-gradient-to-r from-blue-50/40 dark:from-blue-500/5 to-transparent hover:from-blue-50/70 dark:hover:from-blue-500/10'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          {!n.isRead && !isSelected && (
                            <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${color.gradient}`} />
                          )}

                          <div className="flex items-start gap-3 sm:gap-4 pl-1">
                            {/* Select checkbox */}
                            {selectMode && (
                              <div className="pt-1 shrink-0" onClick={(e) => { e.stopPropagation(); toggleSelect(n.id); }}>
                                {isSelected ? (
                                  <CheckSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                ) : (
                                  <Square className="h-5 w-5 text-slate-400" />
                                )}
                              </div>
                            )}

                            <div
                              className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                                !n.isRead
                                  ? `bg-gradient-to-br ${color.gradient} text-white`
                                  : `${color.bg} ${color.darkBg} ${color.text} ${color.darkText}`
                              } ring-2 ${color.ring} ${color.darkRing}`}
                            >
                              <Icon className="h-5 w-5" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2 flex-wrap">
                                    {n.title}
                                    {!n.isRead && (
                                      <span className="h-2 w-2 rounded-full bg-blue-500 shadow-sm animate-pulse" />
                                    )}
                                  </div>
                                  <div className="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                                    {n.message}
                                  </div>
                                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    <span
                                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${color.bg} ${color.darkBg} ${color.text} ${color.darkText}`}
                                    >
                                      {n.type.replace(/_/g, ' ')}
                                    </span>
                                    <span
                                      className="text-[10px] text-slate-500 dark:text-slate-400 font-bold inline-flex items-center gap-1"
                                      title={formatFullTime(n.createdAt)}
                                    >
                                      <Clock className="h-2.5 w-2.5" />
                                      {formatRelative(n.createdAt)}
                                    </span>
                                    {n.link && (
                                      <span className="text-[10px] text-brand-700 dark:text-brand-300 font-extrabold inline-flex items-center gap-0.5 group-hover:gap-1 transition-all">
                                        View <ArrowRight className="h-2.5 w-2.5" />
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {!selectMode && (
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                                    {!n.isRead && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          markReadMutation.mutate(n.id);
                                        }}
                                        className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 flex items-center justify-center transition"
                                        title="Mark as read"
                                      >
                                        <CheckCheck className="h-4 w-4" />
                                      </button>
                                    )}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteMutation.mutate(n.id);
                                        toast.success('Deleted');
                                      }}
                                      className="h-9 w-9 rounded-xl bg-rose-50 dark:bg-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center justify-center transition"
                                      title="Delete"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                )}
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

      {/* Print CSS */}
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm 10mm; }
          html, body {
            background: white !important; color: #0f172a !important;
            print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important;
          }
          .dark body, .dark { background: white !important; color: #0f172a !important; }
          [class*="sidebar"], [class*="topbar"], nav[class*="fixed"] { display: none !important; }
          [data-sonner-toaster], [data-sonner-toast] { display: none !important; }
          a { color: inherit !important; text-decoration: none !important; }
        }
      `}</style>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   Helpers
   ═════════════════════════════════════════════════════════════ */
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="ml-1 px-1.5 py-0.5 rounded bg-white/15 border border-white/25 text-white font-mono font-bold shadow-sm text-[9px]">
      {children}
    </kbd>
  );
}

function NotificationsTeacher({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-blue-300 dark:border-blue-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b-2 border-blue-200 dark:border-blue-500/30 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-500/15 dark:to-indigo-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-blue-900 dark:text-blue-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Notifications — Complete Guide
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            <strong>Notifications = system ka real-time alert.</strong> Har important event — sale, stock,
            customer, expense — yahan turant dikhta hai. 30 seconds pe auto-refresh.
          </p>

          {/* Categories */}
          <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/5 p-4">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-emerald-700 dark:text-emerald-300 mb-2">
              📊 5 Categories
            </div>
            <div className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <Tip><strong>📥 All</strong> — sab notifications ek jagah</Tip>
              <Tip><strong>🔔 Unread</strong> — abhi tak nahi dekhi (dot animate hoti hai)</Tip>
              <Tip><strong>🛒 Sales</strong> — nayi sale, payment mila, approved</Tip>
              <Tip><strong>📦 Inventory</strong> — stock kam, out of stock, transfer</Tip>
              <Tip><strong>⚠️ Alerts</strong> — critical: errors, credit, invoice due</Tip>
            </div>
          </div>

          {/* Bulk mode */}
          <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/5 p-4">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-blue-700 dark:text-blue-300 mb-2">
              ⚡ Bulk Actions
            </div>
            <div className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <Tip><strong>Select button</strong> — checkbox mode on, multiple choose karo</Tip>
              <Tip><strong>Select all</strong> — visible sab select, ek click me</Tip>
              <Tip><strong>Bulk mark read / delete</strong> — 50 alerts ek saath saaf</Tip>
            </div>
          </div>

          {/* Priority colors */}
          <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 p-4">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-slate-600 dark:text-slate-400 mb-2">
              🎨 Color Priority
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
              <div>🟢 Green — good news (sales, payments)</div>
              <div>🟡 Yellow — dhyaan do (low stock)</div>
              <div>🔴 Red — urgent (errors, credit alert)</div>
              <div>🟣 Purple — returns processed</div>
              <div>🔵 Blue — info updates</div>
              <div>🩶 Grey — system events</div>
            </div>
          </div>

          {/* Shortcuts */}
          <div className="rounded-2xl border-2 border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/5 p-4">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-amber-700 dark:text-amber-300 mb-2">
              ⌨️ Shortcuts
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
              <div><kbd className="px-1 py-0.5 rounded bg-white dark:bg-slate-800 border font-mono font-bold text-[9px]">/</kbd> — Search focus</div>
              <div><kbd className="px-1 py-0.5 rounded bg-white dark:bg-slate-800 border font-mono font-bold text-[9px]">1-5</kbd> — Category tabs</div>
              <div><kbd className="px-1 py-0.5 rounded bg-white dark:bg-slate-800 border font-mono font-bold text-[9px]">R</kbd> — Mark all read</div>
              <div><kbd className="px-1 py-0.5 rounded bg-white dark:bg-slate-800 border font-mono font-bold text-[9px]">M</kbd> — Mute/unmute</div>
              <div><kbd className="px-1 py-0.5 rounded bg-white dark:bg-slate-800 border font-mono font-bold text-[9px]">G</kbd> — Guide</div>
              <div><kbd className="px-1 py-0.5 rounded bg-white dark:bg-slate-800 border font-mono font-bold text-[9px]">Esc</kbd> — Close</div>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 text-xs font-semibold text-slate-700 dark:text-slate-200">
            💡 <strong>Pro tip:</strong> Notification pe click karne se — agar link hai to seedha us page pe le
            jayega (e.g. low stock → product page, new sale → receipt). Auto-mark as read bhi ho jayegi.
          </div>

          <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-3 text-xs font-semibold text-slate-700 dark:text-slate-200">
            🔊 <strong>Sound:</strong> Naye notifications pe beep bajti hai. Mute karna ho to M dabao ya top-right
            speaker button. Dukan me shor ho to mute kar do — badge count phir bhi update hoga.
          </div>

          <button
            onClick={onClose}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-extrabold shadow-lg shadow-blue-500/40 inline-flex items-center justify-center gap-2 transition"
          >
            <CheckCheck className="h-4 w-4" /> Samajh Gaya!
          </button>
        </div>
      </div>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <Zap className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}
