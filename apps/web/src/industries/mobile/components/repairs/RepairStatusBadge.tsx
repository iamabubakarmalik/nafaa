import {
  AlertCircle, Stethoscope, Clock, Package, Wrench,
  CheckCircle2, Truck, X, Ban,
} from 'lucide-react';
import {
  type RepairStatus,
  REPAIR_STATUS_LABELS,
  REPAIR_STATUS_URDU,
  REPAIR_STATUS_COLORS,
  REPAIR_STATUS_EMOJI,
  STATUS_NEXT_ACTIONS,
} from '../../api/repairs.api';

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
  showEmoji?: boolean;
  useUrdu?: boolean;
  pulse?: boolean;
}

export function RepairStatusBadge({
  status,
  size = 'md',
  showIcon = true,
  showEmoji = false,
  useUrdu = false,
  pulse = false,
}: Props) {
  const Icon = ICONS[status] || AlertCircle;
  const colors = REPAIR_STATUS_COLORS[status];
  const label = useUrdu ? REPAIR_STATUS_URDU[status] : REPAIR_STATUS_LABELS[status];
  const emoji = REPAIR_STATUS_EMOJI[status];
  const nextAction = STATUS_NEXT_ACTIONS[status];

  const sizeClasses = {
    sm: 'text-[9px] px-1.5 py-0.5 gap-0.5',
    md: 'text-[10px] px-2 py-0.5 gap-1',
    lg: 'text-xs px-2.5 py-1 gap-1.5',
  };

  const iconSizes = {
    sm: 'h-2.5 w-2.5',
    md: 'h-3 w-3',
    lg: 'h-3.5 w-3.5',
  };

  return (
    <span
      className={[
        'inline-flex items-center rounded-full border font-extrabold uppercase tracking-wider',
        colors.bg,
        colors.text,
        colors.border,
        colors.darkBg,
        colors.darkText,
        sizeClasses[size],
        pulse ? 'animate-pulse' : '',
      ].join(' ')}
      title={`${label} — ${nextAction}`}
    >
      {showEmoji && <span className="leading-none">{emoji}</span>}
      {showIcon && !showEmoji && <Icon className={iconSizes[size]} />}
      {label}
    </span>
  );
}
