import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Bell, CheckCheck, AlertTriangle, ShoppingCart, DollarSign,
  Wallet, Info, X, Trash2,
} from 'lucide-react';
import { notificationsApi, type NotificationType } from '@/api/notifications.api';

const typeIcons: Record<NotificationType, any> = {
  INFO: Info,
  SUCCESS: CheckCheck,
  WARNING: AlertTriangle,
  ERROR: AlertTriangle,
  LOW_STOCK: AlertTriangle,
  NEW_SALE: ShoppingCart,
  PAYMENT_RECEIVED: DollarSign,
  REGISTER_OPENED: Wallet,
  REGISTER_CLOSED: Wallet,
  CREDIT_ALERT: AlertTriangle,
};

const typeColors: Record<NotificationType, string> = {
  INFO: 'bg-blue-100 text-blue-700',
  SUCCESS: 'bg-emerald-100 text-emerald-700',
  WARNING: 'bg-amber-100 text-amber-700',
  ERROR: 'bg-rose-100 text-rose-700',
  LOW_STOCK: 'bg-amber-100 text-amber-700',
  NEW_SALE: 'bg-emerald-100 text-emerald-700',
  PAYMENT_RECEIVED: 'bg-emerald-100 text-emerald-700',
  REGISTER_OPENED: 'bg-blue-100 text-blue-700',
  REGISTER_CLOSED: 'bg-slate-100 text-slate-700',
  CREDIT_ALERT: 'bg-rose-100 text-rose-700',
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

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: countData } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: notificationsApi.unreadCount,
    refetchInterval: 30000,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
    enabled: open,
  });

  const markReadMutation = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: notificationsApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
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

  const unreadCount = countData?.count ?? 0;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative h-10 w-10 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition"
      >
        <Bell className="h-5 w-5 text-slate-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900">Notifications</h3>
              <p className="text-xs text-slate-500">{unreadCount} unread</p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllMutation.mutate()}
                className="text-xs text-brand-700 hover:text-brand-800 font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[480px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                <Bell className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                Koi notifications nahi
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((n) => {
                  const Icon = typeIcons[n.type] || Info;
                  const color = typeColors[n.type] || 'bg-slate-100 text-slate-700';
                  return (
                    <div
                      key={n.id}
                      className={`px-4 py-3 hover:bg-slate-50 transition ${
                        !n.isRead ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                          <Icon className="h-4 w-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-900 text-sm">{n.title}</div>
                          <div className="text-xs text-slate-600 mt-0.5">{n.message}</div>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-[10px] text-slate-500">{formatTime(n.createdAt)}</span>
                            {n.link && (
                              <Link
                                to={n.link}
                                onClick={() => {
                                  if (!n.isRead) markReadMutation.mutate(n.id);
                                  setOpen(false);
                                }}
                                className="text-[10px] text-brand-700 font-medium hover:underline"
                              >
                                View
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
        </div>
      )}
    </div>
  );
}
