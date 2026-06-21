import { Flag, AlertTriangle, Zap } from 'lucide-react';
import {
  type RepairPriority,
  REPAIR_PRIORITY_LABELS,
  REPAIR_PRIORITY_COLORS,
} from '../api/repairs.api';

const ICONS: Record<RepairPriority, any> = {
  NORMAL: Flag,
  URGENT: AlertTriangle,
  EMERGENCY: Zap,
};

interface Props {
  priority: RepairPriority;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function RepairPriorityBadge({ priority, size = 'md', showIcon = true }: Props) {
  const Icon = ICONS[priority];
  const colors = REPAIR_PRIORITY_COLORS[priority];
  const label = REPAIR_PRIORITY_LABELS[priority];

  const sizeClasses = {
    sm: 'text-[9px] px-1.5 py-0.5',
    md: 'text-[10px] px-2 py-0.5',
    lg: 'text-xs px-2.5 py-1',
  };

  const iconSizes = {
    sm: 'h-2.5 w-2.5',
    md: 'h-3 w-3',
    lg: 'h-3.5 w-3.5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-extrabold uppercase tracking-wider ${colors.bg} ${colors.text} ${colors.border} ${sizeClasses[size]}`}
      title={label}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {label}
    </span>
  );
}
