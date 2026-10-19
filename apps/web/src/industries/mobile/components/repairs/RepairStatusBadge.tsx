/** Repair job status as a small pill. */

import { cn } from '@core/lib/cn';
import type { RepairStatus } from '../../api/repairs.api';
import { repairStatusOf } from '../meta';

export function RepairStatusBadge({ status, size = 'md' }: { status: RepairStatus; size?: 'sm' | 'md' }) {
  const m = repairStatusOf(status);
  return <span className={cn('inline-flex items-center rounded-full font-medium ring-1', size === 'sm' ? 'px-1.5 py-0.5 text-[0.625rem]' : 'px-2 py-0.5 text-[0.6875rem]', m.tone)}>{m.label}</span>;
}
