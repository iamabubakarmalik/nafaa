import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Bell, CheckCheck, Trash2, AlertTriangle, Info, CheckCircle2, XCircle,
  Building2, CreditCard, DollarSign, Users, ArrowRight, Filter,
} from 'lucide-react';
import {
  adminNotificationsApi,
  type AdminNotificationType,
} from '@/api/admin-notifications.api';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

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

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(v));

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('all');
  const [page, setPage] = useState(1);

  const { data } = useQuery({
    queryKey: ['admin-notifications-page', filter, page],
    queryFn: () =>
      adminNotificationsApi.list({
        isRead: filter === 'unread' ? false : undefined,
        priority: filter === 'urgent' ? 'URGENT' : undefined,
        page,
        limit: 30,
      }),
  });

  const { data: stats } = useQuery({
    queryKey: ['admin-notifications-stats'],
    queryFn: adminNotificationsApi.stats,
  });

  const markAllMutation = useMutation({
    mutationFn: adminNotificationsApi.markAllRead,
    onSuccess: () => {
      toast.success('All marked as read');
      queryClient.invalidateQueries({ queryKey: ['admin-notifications-page'] });
      queryClient.invalidateQueries({ queryKey: ['admin-notifications-count'] });
    },
  });

  const clearReadMutation = useMutation({
    mutationFn: adminNotificationsApi.clearRead,
    onSuccess: (data) => {
      toast.success(`${data.deletedCount} read notifications cleared`);
      queryClient.invalidateQueries({ queryKey: ['admin-notifications-page'] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: adminNotificationsApi.markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications-page'] });
      queryClient.invalidateQueries({ queryKey: ['admin-notifications-count'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: adminNotificationsApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications-page'] });
      queryClient.invalidateQueries({ queryKey: ['admin-notifications-count'] });
    },
  });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-admin-950 via-admin-900 to-admin-700 text-white p-6 shadow-soft">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <Bell className="h-3.5 w-3.5" />
              Real-time Updates
            </div>
            <h2 className="mt-3 text-3xl font-bold">All Notifications</h2>
            <p className="mt-2 text-sm text-white/80">
              Saare system events aur tenant activities
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => markAllMutation.mutate()}
              loading={markAllMutation.isPending}
            >
              <CheckCheck className="h-4 w-4" /> Mark All Read
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                if (confirm('Clear all read notifications?')) clearReadMutation.mutate();
              }}
              loading={clearReadMutation.isPending}
            >
              <Trash2 className="h-4 w-4" /> Clear Read
            </Button>
          </div>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200 p-4">
          <div className="text-xs text-slate-500">Total</div>
          <div className="mt-1 text-2xl font-bold">{stats?.total ?? 0}</div>
        </div>
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
          <div className="text-xs text-amber-700">Unread</div>
          <div className="mt-1 text-2xl font-bold text-amber-900">{stats?.unread ?? 0}</div>
        </div>
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4">
          <div className="text-xs text-rose-700">Categories</div>
          <div className="mt-1 text-2xl font-bold text-rose-900">{stats?.byType?.length ?? 0}</div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-admin-600 to-admin-800 text-white p-4">
          <div className="text-xs text-white/80">Read Rate</div>
          <div className="mt-1 text-2xl font-bold">
            {stats?.total ? Math.round(((stats.total - stats.unread) / stats.total) * 100) : 0}%
          </div>
        </div>
      </section>

      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-slate-500" />
        {(['all', 'unread', 'urgent'] as const).map((f) => (
          <button
            key={f}
            onClick={() => {
              setFilter(f);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize ${
              filter === f
                ? 'bg-admin-600 text-white'
                : 'bg-white text-slate-700 border border-slate-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        {!data?.items || data.items.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="h-12 w-12 mx-auto text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">No notifications</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.items.map((n) => {
              const Icon = typeIcons[n.type] || Info;
              return (
                <div
                  key={n.id}
                  className={`px-6 py-4 hover:bg-slate-50 ${
                    n.priority === 'URGENT'
                      ? 'border-l-4 border-rose-500'
                      : n.priority === 'HIGH'
                      ? 'border-l-4 border-amber-500'
                      : ''
                  } ${!n.isRead ? 'bg-admin-50/30' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="h-11 w-11 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-5 w-5 text-slate-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <h4 className="font-bold text-slate-900">{n.title}</h4>
                          <p className="text-sm text-slate-700 mt-0.5">{n.message}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            n.priority === 'URGENT' ? 'bg-rose-100 text-rose-700' :
                            n.priority === 'HIGH' ? 'bg-amber-100 text-amber-700' :
                            n.priority === 'NORMAL' ? 'bg-slate-100 text-slate-700' :
                            'bg-slate-50 text-slate-500'
                          }`}>
                            {n.priority}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                            {n.type.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className="text-xs text-slate-500">{formatDate(n.createdAt)}</span>
                        {n.link && (
                          <Link
                            to={n.link}
                            onClick={() => !n.isRead && markReadMutation.mutate(n.id)}
                            className="text-xs text-admin-600 font-semibold inline-flex items-center gap-1 hover:underline"
                          >
                            View Details <ArrowRight className="h-3 w-3" />
                          </Link>
                        )}
                        {!n.isRead && (
                          <button
                            onClick={() => markReadMutation.mutate(n.id)}
                            className="text-xs text-slate-600 hover:text-slate-900"
                          >
                            Mark as read
                          </button>
                        )}
                        <button
                          onClick={() => deleteMutation.mutate(n.id)}
                          className="text-xs text-rose-600 hover:text-rose-700 inline-flex items-center gap-1"
                        >
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {data && data.meta.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
            <div className="text-sm text-slate-500">
              Page {data.meta.page} of {data.meta.totalPages} • {data.meta.total} total
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= data.meta.totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
