import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell, BellOff, CheckCheck, AlertTriangle, ShoppingCart, DollarSign,
  Wallet, Info, Trash2, Volume2, VolumeX, Sparkles, ArrowRight,
  Package, UserPlus, ArrowLeftRight, Receipt, AlertCircle, Crown,
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

const typeColors: Record<NotificationType, string> = {
  INFO: 'bg-blue-100 text-blue-700',
  SUCCESS: 'bg-emerald-100 text-emerald-700',
  WARNING: 'bg-amber-100 text-amber-700',
  ERROR: 'bg-rose-100 text-rose-700',
  LOW_STOCK: 'bg-amber-100 text-amber-700',
  OUT_OF_STOCK: 'bg-rose-100 text-rose-700',
  NEW_SALE: 'bg-emerald-100 text-emerald-700',
  PAYMENT_RECEIVED: 'bg-emerald-100 text-emerald-700',
  PAYMENT_APPROVED: 'bg-emerald-100 text-emerald-700',
  PAYMENT_REJECTED: 'bg-rose-100 text-rose-700',
  RETURN_PROCESSED: 'bg-violet-100 text-violet-700',
  NEW_CUSTOMER: 'bg-blue-100 text-blue-700',
  STOCK_TRANSFER: 'bg-cyan-100 text-cyan-700',
  EXPENSE_ADDED: 'bg-orange-100 text-orange-700',
  INVOICE_DUE: 'bg-amber-100 text-amber-700',
  SUBSCRIPTION_EXPIRING: 'bg-amber-100 text-amber-700',
  REGISTER_OPENED: 'bg-blue-100 text-blue-700',
  REGISTER_CLOSED: 'bg-slate-100 text-slate-700',
  CREDIT_ALERT: 'bg-rose-100 text-rose-700',
  SYSTEM: 'bg-slate-100 text-slate-700',
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
      <button
        onClick={() => setOpen(!open)}
        className="relative h-10 w-10 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition"
        aria-label="Notifications"
      >
        <Bell className={`h-5 w-5 text-slate-700 ${unreadCount > 0 ? 'notif-pulse' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 notif-slide-in">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-sm">
                <Bell className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Notifications</h3>
                <p className="text-[10px] text-slate-500">
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleMute}
                className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600"
                title={muted ? 'Unmute sounds' : 'Mute sounds'}
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllMutation.mutate()}
                  className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold px-2 py-1 rounded-lg hover:bg-emerald-50"
                  disabled={markAllMutation.isPending}
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-[480px] overflow-y-auto notif-scroll">
            {notifications.length === 0 ? (
              <div className="p-10 text-center">
                <div className="h-16 w-16 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                  <BellOff className="h-7 w-7 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-600">Koi notifications nahi</p>
                <p className="text-xs text-slate-400 mt-1">
                  Aap ke saare notifications yahan dikhenge
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((n) => {
                  const Icon = typeIcons[n.type] || Info;
                  const color = typeColors[n.type] || 'bg-slate-100 text-slate-700';
                  const isUrgent = URGENT_TYPES.includes(n.type);
                  return (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`px-4 py-3 hover:bg-slate-50 transition cursor-pointer ${
                        !n.isRead ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color} ${
                            isUrgent && !n.isRead ? 'urgent-shake' : ''
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-semibold text-slate-900 text-sm leading-snug">
                              {n.title}
                            </div>
                            {!n.isRead && (
                              <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                            )}
                          </div>
                          <div className="text-xs text-slate-600 mt-0.5 line-clamp-2">
                            {n.message}
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-[10px] text-slate-500">
                              {formatTime(n.createdAt)}
                            </span>
                            {n.link && (
                              <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-0.5">
                                View <ArrowRight className="h-2.5 w-2.5" />
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMutation.mutate(n.id);
                          }}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50"
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
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
              <Link
                to="/notifications"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800"
              >
                <Sparkles className="h-3.5 w-3.5" />
                View all notifications
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
