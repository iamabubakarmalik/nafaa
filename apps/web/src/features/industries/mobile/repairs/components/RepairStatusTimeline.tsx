import { CheckCircle2, Circle } from 'lucide-react';
import { RepairStatusBadge } from './RepairStatusBadge';
import type { RepairStatusLog } from '../api/repairs.api';

interface Props {
  logs: RepairStatusLog[];
}

const formatTime = (iso: string) => {
  return new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
};

export function RepairStatusTimeline({ logs }: Props) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        No status changes yet
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-slate-200" />

      <div className="space-y-3">
        {logs.map((log, idx) => {
          const isLatest = idx === 0;
          return (
            <div key={log.id} className="relative pl-9">
              {/* Dot */}
              <div className="absolute left-0 top-1">
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center ${
                    isLatest
                      ? 'bg-emerald-600 text-white shadow ring-4 ring-emerald-100'
                      : 'bg-white border-2 border-slate-300 text-slate-400'
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
              <div className={`rounded-xl border-2 p-3 ${
                isLatest ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {log.fromStatus && (
                      <>
                        <RepairStatusBadge status={log.fromStatus} size="sm" />
                        <span className="text-slate-400 text-xs">→</span>
                      </>
                    )}
                    <RepairStatusBadge status={log.toStatus} size="sm" />
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold">
                    {formatTime(log.changedAt)}
                  </div>
                </div>
                {log.note && (
                  <div className="mt-2 text-xs text-slate-700">{log.note}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
