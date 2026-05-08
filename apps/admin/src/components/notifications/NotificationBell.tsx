import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Bell, CheckCheck, X, Trash2, AlertTriangle, Info, CheckCircle2,
  XCircle, Building2, CreditCard, Sparkles, DollarSign, Users,
  ArrowRight,
} from 'lucide-react';
import {
  adminNotificationsApi,
  type AdminNotification,
  type AdminNotificationType,
  type AdminNotificationPriority,
} from '@/api/admin-notifications.api';

const typeIcons: Record<AdminNotificationType, any> = {
  NEW_TENANT: Building2,
  NEW_PAYMENT: CreditCard,
  PAYMENT_APPROVED: CheckCircle2,
  PAYMENT_REJECTED: XCircle,
  SUBSCRIPTION_EXPIRING: AlertTriangle,
  SUBSCRIPTION_CANCELLED: XCircle,
  REFERRAL_CONVERTED: Users,
  TENANT_SUSPENDED: AlertTriangle,
  HIGH_VALUE_PAYMENT: DollarSign,
  SYSTEM_ALERT: AlertTriangle,
  USER_ACTION: Users,
  INFO: Info,
  WARNING: AlertTriangle,
  ERROR: XCircle,
  SUCCESS: CheckCircle2,
};

const typeColors: Record<AdminNotificationType, string> = {
  NEW_TENANT: 'bg-emerald-100 text-emerald-700',
  NEW_PAYMENT: 'bg-blue-100 text-blue-700',
  PAYMENT_APPROVED: 'bg-emerald-100 text-emerald-700',
  PAYMENT_REJECTED: 'bg-rose-100 text-rose-700',
  SUBSCRIPTION_EXPIRING: 'bg-amber-100 text-amber-700',
  SUBSCRIPTION_CANCELLED: 'bg-slate-100 text-slate-700',
  REFERRAL_CONVERTED: 'bg-pink-100 text-pink-700',
  TENANT_SUSPENDED: 'bg-rose-100 text-rose-700',
  HIGH_VALUE_PAYMENT: 'bg-violet-100 text-violet-700',
  SYSTEM_ALERT: 'bg-rose-100 text-rose-700',
  USER_ACTION: 'bg-blue-100 text-blue-700',
  INFO: 'bg-blue-100 text-blue-700',
  WARNING: 'bg-amber-100 text-amber-700',
  ERROR: 'bg-rose-100 text-rose-700',
  SUCCESS: 'bg-emerald-100 text-emerald-700',
};

const priorityBorder: Record<AdminNotificationPriority, string> = {
  URGENT: 'border-l-4 border-rose-500',
  HIGH: 'border-l-4 border-amber-500',
  NORMAL: '',
  LOW: '',
};

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

// Sound for new notifications
const playNotificationSound = () => {
  try {
    const audio = new Audio(
      'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU' +
        'pvT18=',
    );
    audio.volume = 0.3;
    audio.play().catch(() => {});
  } catch {}
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const lastCountRef = useRef<number>(0);

  const { data: countData } = useQuery({
    queryKey: ['admin-notifications-count'],
    queryFn: adminNotificationsApi.unreadCount,
    refetchInterval: 15000,
  });

  const { data: listData } = useQuery({
    queryKey: ['admin-notifications-list', open],
    queryFn: () => adminNotificationsApi.list({ limit: 20 }),
    enabled: open,
  });

  const markReadMutation = useMutation({
    mutationFn: adminNotificationsApi.markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications-count'] });
      queryClient.invalidateQueries({ queryKey: ['admin-notifications-list'] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: adminNotificationsApi.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications-count'] });
      queryClient.invalidateQueries({ queryKey: ['admin-notifications-list'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: adminNotificationsApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications-count'] });
      queryClient.invalidateQueries({ queryKey: ['admin-notifications-list'] });
    },
  });

  // Sound + tab title pulse on new
  useEffect(() => {
    const current = countData?.total ?? 0;
    if (current > lastCountRef.current && lastCountRef.current > 0) {
      playNotificationSound();
      const original = document.title;
      let flip = false;
      const interval = setInterval(() => {
        document.title = flip ? original : `(${current}) 🔔 New Alert!`;
        flip = !flip;
      }, 1000);
      setTimeout(() => {
        clearInterval(interval);
        document.title = original;
      }, 6000);
    }
    lastCountRef.current = current;
  }, [countData?.total]);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const unread = countData?.total ?? 0;
  const urgent = countData?.urgent ?? 0;

  const handleNotifClick = (n: AdminNotification) => {
    if (!n.isRead) markReadMutation.mutate(n.id);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`relative h-10 w-10 rounded-lg flex items-center justify-center transition ${
          urgent > 0
            ? 'bg-rose-100 hover:bg-rose-200 animate-pulse'
            : 'bg-slate-100 hover:bg-slate-200'
        }`}
      >
        <Bell className={`h-5 w-5 ${urgent > 0 ? 'text-rose-700' : 'text-slate-700'}`} />
        {unread > 0 && (
          <span
            className={`absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full text-white text-[10px] font-bold flex items-center justify-center ${
              urgent > 0 ? 'bg-rose-600' : 'bg-admin-600'
            }`}
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[420px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-admin-50 to-white">
            <div>
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Bell className="h-4 w-4 text-admin-600" />
                Notifications
              </h3>
              <p className="text-xs text-slate-500">
                {unread} unread {urgent > 0 && <span className="text-rose-600 font-bold">• {urgent} urgent</span>}
              </p>
            </div>
            {unread > 0 && (
              <button
                onClick={() => markAllMutation.mutate()}
                className="text-xs text-admin-600 hover:text-admin-700 font-medium inline-flex items-center gap-1"
              >
                <CheckCheck className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[500px] overflow-y-auto">
            {!listData?.items || listData.items.length === 0 ? (
              <div className="p-10 text-center">
                <Bell className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {listData.items.map((n) => {
                  const Icon = typeIcons[n.type] || Info;
                  const color = typeColors[n.type] || 'bg-slate-100 text-slate-700';
                  return (
                    <div
                      key={n.id}
                      className={`px-4 py-3 hover:bg-slate-50 transition ${priorityBorder[n.priority]} ${
                        !n.isRead ? 'bg-admin-50/30' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-semibold text-slate-900 text-sm">{n.title}</div>
                            {n.priority === 'URGENT' && (
                              <span className="text-[9px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                                URGENT
                              </span>
                            )}
                            {n.priority === 'HIGH' && (
                              <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                                HIGH
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{n.message}</p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[10px] text-slate-500">{formatTime(n.createdAt)}</span>
                            {n.link && (
                              <Link
                                to={n.link}
                                onClick={() => handleNotifClick(n)}
                                className="text-[10px] text-admin-600 font-medium hover:underline inline-flex items-center gap-0.5"
                              >
                                View <ArrowRight className="h-2.5 w-2.5" />
                              </Link>
                            )}
                            {!n.isRead && (
                              <button
                                onClick={() => markReadMutation.mutate(n.id)}
                                className="text-[10px] text-slate-500 hover:text-slate-700"
                              >
                                Mark read
                              </button>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => deleteMutation.mutate(n.id)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="block px-5 py-3 text-center text-sm font-semibold text-admin-700 hover:bg-admin-50 border-t border-slate-200"
          >
            View All Notifications →
          </Link>
        </div>
      )}
    </div>
  );
}
