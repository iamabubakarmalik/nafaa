import { CheckCircle2, Circle, Clock, User } from 'lucide-react';
import { RepairStatusBadge } from './RepairStatusBadge';
import type { RepairStatusLog } from '../../api/repairs.api';

interface Props {
  logs: RepairStatusLog[];
}

const formatTime = (iso: string) => {
  return new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
};

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  const hr = Math.floor(diff / 3600000);
  const day = Math.floor(diff / 86400000);
  if (min < 1) return 'abhi';
  if (min < 60) return `${min}m pehle`;
  if (hr < 24) return `${hr}h pehle`;
  if (day < 30) return `${day}d pehle`;
  return `${Math.floor(day / 30)}mo pehle`;
};

export function RepairStatusTimeline({ logs }: Props) {
  if (logs.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-8 text-center">
        <Clock className="h-8 w-8 text-slate-300 mx-auto mb-1" />
        <div className="text-sm text-slate-500 dark:text-slate-400">
          Ab tak koi status change nahi hua
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical gradient line */}
      <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gradient-to-b from-emerald-400 via-slate-300 dark:via-slate-600 to-slate-200 dark:to-slate-700" />

      <div className="space-y-3">
        {logs.map((log, idx) => {
          const isLatest = idx === 0;
          return (
            <div key={log.id} className="relative pl-9">
              {/* Dot */}
              <div className="absolute left-0 top-1">
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center transition ${
                    isLatest
                      ? 'bg-emerald-600 text-white shadow-lg ring-4 ring-emerald-100 dark:ring-emerald-950/40 animate-pulse'
                      : 'bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 text-slate-400'
                  }`}
                >
                  {isLatest ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <Circle className="h-2 w-2 fill-current" />
                  )}
                </div>
              </div>

              {/* Content */}
              <div
                className={`rounded-xl border-2 p-3 transition ${
                  isLatest
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 shadow'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {log.fromStatus && (
                      <>
                        <RepairStatusBadge status={log.fromStatus} size="sm" />
                        <span className="text-slate-400 text-xs">→</span>
                      </>
                    )}
                    <RepairStatusBadge status={log.toStatus} size="sm" />
                    {isLatest && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-600 text-white font-bold uppercase">
                        Latest
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                      {formatTime(log.changedAt)}
                    </div>
                    <div className="text-[9px] text-slate-400 dark:text-slate-500">
                      {timeAgo(log.changedAt)}
                    </div>
                  </div>
                </div>
                {log.note && (
                  <div className="mt-2 text-xs text-slate-700 dark:text-slate-300 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5">
                    {log.note}
                  </div>
                )}
                {(log as any).changedByName && (
                  <div className="mt-1.5 text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <User className="h-2.5 w-2.5" />
                    {(log as any).changedByName}
                  </div>
                )}

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
