/** Every status change of a repair job, newest first, with its note. */

import type { RepairStatusLog } from '../../api/repairs.api';
import { dateTime, repairStatusOf } from '../meta';

export function RepairStatusTimeline({ logs }: { logs: RepairStatusLog[] }) {
  if (!logs.length) return <p className="text-[0.8125rem] text-slate-500">Abhi koi qadam nahi</p>;
  return (
    <ol className="relative space-y-3 border-l border-slate-200 pl-4">
      {logs.map((l) => {
        const m = repairStatusOf(l.toStatus);
        return (
          <li key={l.id} className="relative">
            <span className="absolute -left-[1.3rem] top-1 h-2.5 w-2.5 rounded-full ring-2 ring-white" style={{ backgroundColor: m.color }} />
            <p className="text-[0.8125rem] font-semibold text-slate-900">{m.label}</p>
            <p className="text-[0.75rem] text-slate-500">{dateTime(l.changedAt)}</p>
            {l.note && <p className="mt-0.5 text-[0.8125rem] text-slate-600">{l.note}</p>}
          </li>
        );
      })}
    </ol>
  );
}
