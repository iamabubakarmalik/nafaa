import { useQuery } from '@tanstack/react-query';
import { Activity, User, Clock } from 'lucide-react';
import { adminActivityApi } from '@/api/admin-activity.api';

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(v),
  );

export default function ActivityPage() {
  const { data: logs = [] } = useQuery({
    queryKey: ['admin-activity'],
    queryFn: () => adminActivityApi.list({ limit: 100 }),
  });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-admin-950 via-admin-900 to-admin-700 text-white p-6 shadow-soft">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
          <Activity className="h-3.5 w-3.5" />
          System Audit Trail
        </div>
        <h2 className="mt-3 text-3xl font-bold">Activity Log</h2>
        <p className="mt-2 text-sm text-white/80">
          Saare tenants ki activities — audit + investigation
        </p>
      </section>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        {logs.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">No activity logs yet</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log: any) => (
              <div key={log.id} className="px-6 py-4 hover:bg-slate-50">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900">
                        {log.user?.fullName || 'System'}
                      </span>
                      {log.tenant && (
                        <span className="inline-flex px-2 py-0.5 rounded-full bg-admin-100 text-admin-700 text-[10px] font-semibold">
                          {log.tenant.name}
                        </span>
                      )}
                      {log.user?.role && (
                        <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                          {log.user.role}
                        </span>
                      )}
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(log.createdAt)}
                      </span>
                    </div>
                    <div className="text-sm text-slate-700 mt-1">{log.description}</div>
                    {log.entityType && (
                      <div className="text-xs text-slate-500 mt-1">
                        {log.entityType} {log.entityId && `• ${log.entityId.slice(0, 8)}`}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
