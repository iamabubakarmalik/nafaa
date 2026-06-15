import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell, BellOff, CheckCheck, AlertTriangle, ShoppingCart, DollarSign,
  Wallet, Info, Trash2, Volume2, VolumeX, Sparkles, ArrowRight,
  Package, UserPlus, ArrowLeftRight, Receipt, AlertCircle, Crown,
  Settings as SettingsIcon, X,
} from 'lucide-react';
import { notificationsApi, type NotificationType, type Notification } from '@/api/notifications.api';
import { useNotificationSound } from '@/hooks/useNotificationSound';

const typeIcons: Record<NotificationType, any> = {
  INFO: Info,
  SUCCESS: CheckCheck,
  WARNING: AlertTriangle,
  ERROR: AlertCircle,
  LOW_STOCK: AlertTriangle,
  OUT_OF_STOCK: AlertCircle,
  NEW_SALE: ShoppingCart,
  PAYMENT_RECEIVED: DollarSign,
  PAYMENT_APPROVED: CheckCheck,
  PAYMENT_REJECTED: AlertCircle,
  RETURN_PROCESSED: Package,
  NEW_CUSTOMER: UserPlus,
  STOCK_TRANSFER: ArrowLeftRight,
  EXPENSE_ADDED: Receipt,
  INVOICE_DUE: AlertTriangle,
  SUBSCRIPTION_EXPIRING: Crown,
  REGISTER_OPENED: Wallet,
  REGISTER_CLOSED: Wallet,
  CREDIT_ALERT: AlertTriangle,
  SYSTEM: Info,
};

const typeColors: Record<NotificationType, { bg: string; text: string; gradient: string }> = {
  INFO:                  { bg: 'bg-blue-100',    text: 'text-blue-700',    gradient: 'from-blue-500 to-blue-600' },
  SUCCESS:               { bg: 'bg-emerald-100', text: 'text-emerald-700', gradient: 'from-emerald-500 to-emerald-600' },
  WARNING:               { bg: 'bg-amber-100',   text: 'text-amber-700',   gradient: 'from-amber-500 to-amber-600' },
  ERROR:                 { bg: 'bg-rose-100',    text: 'text-rose-700',    gradient: 'from-rose-500 to-rose-600' },
  LOW_STOCK:             { bg: 'bg-amber-100',   text: 'text-amber-700',   gradient: 'from-amber-500 to-amber-600' },
  OUT_OF_STOCK:          { bg: 'bg-rose-100',    text: 'text-rose-700',    gradient: 'from-rose-500 to-rose-600' },
  NEW_SALE:              { bg: 'bg-emerald-100', text: 'text-emerald-700', gradient: 'from-emerald-500 to-emerald-600' },
  PAYMENT_RECEIVED:      { bg: 'bg-emerald-100', text: 'text-emerald-700', gradient: 'from-emerald-500 to-emerald-600' },
  PAYMENT_APPROVED:      { bg: 'bg-emerald-100', text: 'text-emerald-700', gradient: 'from-emerald-500 to-emerald-600' },
  PAYMENT_REJECTED:      { bg: 'bg-rose-100',    text: 'text-rose-700',    gradient: 'from-rose-500 to-rose-600' },
  RETURN_PROCESSED:      { bg: 'bg-violet-100',  text: 'text-violet-700',  gradient: 'from-violet-500 to-violet-600' },
  NEW_CUSTOMER:          { bg: 'bg-blue-100',    text: 'text-blue-700',    gradient: 'from-blue-500 to-blue-600' },
  STOCK_TRANSFER:        { bg: 'bg-cyan-100',    text: 'text-cyan-700',    gradient: 'from-cyan-500 to-cyan-600' },
  EXPENSE_ADDED:         { bg: 'bg-orange-100',  text: 'text-orange-700',  gradient: 'from-orange-500 to-orange-600' },
  INVOICE_DUE:           { bg: 'bg-amber-100',   text: 'text-amber-700',   gradient: 'from-amber-500 to-amber-600' },
  SUBSCRIPTION_EXPIRING: { bg: 'bg-amber-100',   text: 'text-amber-700',   gradient: 'from-amber-500 to-amber-600' },
  REGISTER_OPENED:       { bg: 'bg-blue-100',    text: 'text-blue-700',    gradient: 'from-blue-500 to-blue-600' },
  REGISTER_CLOSED:       { bg: 'bg-slate-100',   text: 'text-slate-700',   gradient: 'from-slate-500 to-slate-600' },
  CREDIT_ALERT:          { bg: 'bg-rose-100',    text: 'text-rose-700',    gradient: 'from-rose-500 to-rose-600' },
  SYSTEM:                { bg: 'bg-slate-100',   text: 'text-slate-700',   gradient: 'from-slate-500 to-slate-600' },
};

const URGENT_TYPES: NotificationType[] = [
  'OUT_OF_STOCK', 'PAYMENT_REJECTED', 'CREDIT_ALERT', 'ERROR', 'INVOICE_DUE',
];

const formatTime = (value: string) => {
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

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [muted, setMutedState] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { play, playUrgent, isMuted, setMuted } = useNotificationSound();
  const lastSeenIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  useEffect(() => {
    setMutedState(isMuted());
  }, [isMuted]);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'count'],
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  const { data: notifData } = useQuery({
    queryKey: ['notifications', 'list', { limit: 20 }],
    queryFn: () => notificationsApi.list({ limit: 20 }),
    refetchInterval: 30000,
  });

  const notifications: Notification[] = notifData?.items ?? [];
  const hasUnread = unreadCount > 0;

  // Sound + visual cue on new notification
  useEffect(() => {
    if (!notifications.length) return;
    if (!initializedRef.current) {
      notifications.forEach((n) => lastSeenIdsRef.current.add(n.id));
      initializedRef.current = true;
      return;
    }
    const newUnread = notifications.filter(
      (n) => !lastSeenIdsRef.current.has(n.id) && !n.isRead,
    );
    if (newUnread.length > 0) {
      const hasUrgent = newUnread.some((n) => URGENT_TYPES.includes(n.type));
      if (hasUrgent) playUrgent();
      else play();
    }
    notifications.forEach((n) => lastSeenIdsRef.current.add(n.id));
  }, [notifications, play, playUrgent]);

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
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  };

  const handleNotificationClick = (n: Notification) => {
    if (!n.isRead) markReadMutation.mutate(n.id);
    if (n.link) {
      navigate(n.link);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      {/* Bell button — premium pulsing design */}
      <button
        onClick={() => setOpen(!open)}
        className={`relative h-10 w-10 rounded-xl flex items-center justify-center transition-all ${
          open
            ? 'bg-brand-100 text-brand-700 ring-2 ring-brand-500/30'
            : hasUnread
            ? 'bg-gradient-to-br from-rose-500 to-amber-500 text-white hover:scale-105 shadow-md shadow-rose-500/30'
            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
        }`}
        aria-label="Notifications"
      >
        <Bell className={`h-5 w-5 ${hasUnread ? 'animate-pulse' : ''}`} />
        {hasUnread && (
          <>
            <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-extrabold flex items-center justify-center ring-2 ring-white shadow-md">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
            {/* Ping ring */}
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-rose-400 animate-ping opacity-75" />
          </>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-[420px] max-w-[calc(100vw-2rem)] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header — gradient */}
          <div className="relative bg-gradient-to-br from-slate-950 via-brand-900 to-brand-700 px-5 py-4 text-white overflow-hidden">
            <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-emerald-400/20 blur-2xl" />
            <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-amber-400/10 blur-2xl" />

            <div className="relative flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shadow-lg ring-1 ring-white/20">
                  <Bell className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-extrabold text-white text-base">Notifications</h3>
                    {hasUnread && (
                      <span className="px-1.5 py-0.5 rounded-md bg-rose-500 text-white text-[9px] font-extrabold">
                        {unreadCount} NEW
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-white/70 mt-0.5">
                    {hasUnread ? 'Keep your business running smoothly' : 'You are all caught up'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={toggleMute}
                  className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur flex items-center justify-center text-white transition"
                  title={muted ? 'Unmute sounds' : 'Mute sounds'}
                >
                  {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur flex items-center justify-center text-white transition"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Mark all read button */}
            {hasUnread && (
              <div className="relative mt-3 flex items-center justify-between">
                <button
                  onClick={() => markAllMutation.mutate()}
                  disabled={markAllMutation.isPending}
                  className="text-[11px] text-white/90 hover:text-white font-bold inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition disabled:opacity-50"
                >
                  <CheckCheck className="h-3 w-3" />
                  Mark all read
                </button>
                <Link
                  to="/settings"
                  onClick={() => setOpen(false)}
                  className="text-[11px] text-white/70 hover:text-white inline-flex items-center gap-1"
                >
                  <SettingsIcon className="h-3 w-3" />
                  Preferences
                </Link>
              </div>
            )}
          </div>

          {/* List */}
          <div className="max-h-[480px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-12 text-center">
                <div className="h-20 w-20 mx-auto rounded-3xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center mb-4 shadow-inner">
                  <BellOff className="h-9 w-9 text-slate-400" />
                </div>
                <h4 className="text-sm font-extrabold text-slate-900">No notifications yet</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-[260px] mx-auto leading-relaxed">
                  Sales, stock alerts, payments — sab updates yahan dikhenge
                </p>
              </div>
            ) : (
              <div>
                {notifications.map((n, i) => {
                  const Icon = typeIcons[n.type] || Info;
                  const color = typeColors[n.type] || typeColors.SYSTEM;
                  const isUrgent = URGENT_TYPES.includes(n.type);

                  return (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`group relative px-4 py-3 cursor-pointer transition-all ${
                        !n.isRead
                          ? 'bg-gradient-to-r from-blue-50/40 to-transparent hover:from-blue-50/70'
                          : 'hover:bg-slate-50'
                      } ${i !== 0 ? 'border-t border-slate-100' : ''}`}
                    >
                      {/* Unread indicator strip */}
                      {!n.isRead && (
                        <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${color.gradient}`} />
                      )}

                      <div className="flex items-start gap-3 pl-1">
                        {/* Icon */}
                        <div
                          className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                            !n.isRead
                              ? `bg-gradient-to-br ${color.gradient} text-white`
                              : `${color.bg} ${color.text}`
                          } ${isUrgent && !n.isRead ? 'animate-pulse' : ''}`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>

                        {/* Body */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-bold text-slate-900 text-sm leading-snug">
                              {n.title}
                            </div>
                            {!n.isRead && (
                              <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-1.5 shadow-sm" />
                            )}
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">
                            {n.message}
                          </p>

                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-[10px] text-slate-500 font-semibold">
                              {formatTime(n.createdAt)}
                            </span>
                            {n.link && (
                              <span className="text-[10px] text-brand-700 font-extrabold inline-flex items-center gap-0.5 group-hover:gap-1 transition-all">
                                View <ArrowRight className="h-2.5 w-2.5" />
                              </span>
                            )}
                            {isUrgent && !n.isRead && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-rose-100 text-rose-700">
                                URGENT
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Delete button — visible on hover */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMutation.mutate(n.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-all shrink-0"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-100 bg-gradient-to-br from-slate-50 to-white">
              <Link
                to="/notifications"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-1.5 text-xs font-extrabold text-brand-700 hover:text-brand-800 transition group"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                View all notifications
                <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
