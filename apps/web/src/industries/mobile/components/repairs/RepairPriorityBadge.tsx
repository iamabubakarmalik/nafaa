/** Repair job priority as a small pill; normal jobs show nothing. */

import { cn } from '@core/lib/cn';
import type { RepairPriority } from '../../api/repairs.api';
import { priorityOf } from '../meta';

export function RepairPriorityBadge({ priority }: { priority: RepairPriority }) {
  if (priority === 'NORMAL') return null;
  const m = priorityOf(priority);
  return <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ring-1', m.tone)}>{m.label}</span>;
}
