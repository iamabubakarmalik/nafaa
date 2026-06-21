import { CheckCircle2, AlertTriangle, AlertOctagon, Clock, Shield } from 'lucide-react';
import {
  type PtaStatus,
  PTA_STATUS_LABELS,
  PTA_STATUS_COLORS,
} from '@/features/industries/mobile/api/imei.api';

const ICONS: Record<PtaStatus, any> = {
  APPROVED: CheckCircle2,
  NON_PTA: AlertOctagon,
  PATCH: AlertTriangle,
  PENDING: Clock,
  EXEMPT: Shield,
};

interface Props {
  status: PtaStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  taxPaid?: number;
}

export function PtaStatusBadge({ status, size = 'md', showIcon = true, taxPaid }: Props) {
  const Icon = ICONS[status] || Clock;
  const colors = PTA_STATUS_COLORS[status];
  const label = PTA_STATUS_LABELS[status];

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
      title={taxPaid && taxPaid > 0 ? `Tax paid: Rs ${taxPaid.toLocaleString()}` : label}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {label}
    </span>
  );
}
