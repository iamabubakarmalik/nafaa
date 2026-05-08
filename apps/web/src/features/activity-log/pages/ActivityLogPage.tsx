import { useQuery } from '@tanstack/react-query';
import { Activity, User, Clock } from 'lucide-react';
import { activityLogApi } from '@/api/activity-log.api';

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

export default function ActivityLogPage() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['activity-log'],
    queryFn: activityLogApi.list,
  });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-800 to-slate-700 text-white p-6 shadow-soft">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
            <Activity className="h-3.5 w-3.5" />
            Audit Trail
          </div>
          <h2 className="mt-3 text-3xl font-bold">Activity Log</h2>
          <p className="mt-2 text-sm text-white/80">
            Kis user ne kya kiya — sab ka complete record.
          </p>
        </div>
      </section>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-sm text-slate-500">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto h-16 w-16 rounded-3xl bg-slate-100 flex items-center justify-center">
              <Activity className="h-7 w-7 text-slate-400" />
            </div>
            <h4 className="mt-4 text-lg font-semibold text-slate-900">Activity log abhi khaali hai</h4>
            <p className="mt-1 text-sm text-slate-500">User actions hone par yahan record honge.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => (
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
