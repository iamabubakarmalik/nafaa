import {
  AlertCircle, Stethoscope, Clock, Package, Wrench,
  CheckCircle2, Truck, X, Ban,
} from 'lucide-react';
import {
  type RepairStatus,
  REPAIR_STATUS_LABELS,
  REPAIR_STATUS_COLORS,
} from '../api/repairs.api';

const ICONS: Record<RepairStatus, any> = {
  RECEIVED: AlertCircle,
  DIAGNOSED: Stethoscope,
  AWAITING_APPROVAL: Clock,
  AWAITING_PARTS: Package,
  IN_PROGRESS: Wrench,
  READY: CheckCircle2,
  DELIVERED: Truck,
  CANCELLED: X,
  UNREPAIRABLE: Ban,
};

interface Props {
  status: RepairStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function RepairStatusBadge({ status, size = 'md', showIcon = true }: Props) {
  const Icon = ICONS[status] || AlertCircle;
  const colors = REPAIR_STATUS_COLORS[status];
  const label = REPAIR_STATUS_LABELS[status];

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
