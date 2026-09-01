import { Flag, AlertTriangle, Zap } from 'lucide-react';
import {
  type RepairPriority,
  REPAIR_PRIORITY_LABELS,
  REPAIR_PRIORITY_URDU,
  REPAIR_PRIORITY_COLORS,
  REPAIR_PRIORITY_EMOJI,
} from '../../api/repairs.api';

const ICONS: Record<RepairPriority, any> = {
  NORMAL: Flag,
  URGENT: AlertTriangle,
  EMERGENCY: Zap,
};

interface Props {
  priority: RepairPriority;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showEmoji?: boolean;
  useUrdu?: boolean;
  pulse?: boolean;
}

export function RepairPriorityBadge({
  priority,
  size = 'md',
  showIcon = true,
  showEmoji = false,
  useUrdu = false,
  pulse = false,
}: Props) {
  const Icon = ICONS[priority];
  const colors = REPAIR_PRIORITY_COLORS[priority];
  const label = useUrdu ? REPAIR_PRIORITY_URDU[priority] : REPAIR_PRIORITY_LABELS[priority];
  const emoji = REPAIR_PRIORITY_EMOJI[priority];

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

  // Emergency = auto pulse
  const shouldPulse = pulse || priority === 'EMERGENCY';

  return (
    <span
      className={[
        'inline-flex items-center rounded-full border font-extrabold uppercase tracking-wider',
        colors.bg,
        colors.text,
        colors.border,
        // Dark mode fallback
        priority === 'NORMAL' && 'dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
        priority === 'URGENT' && 'dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-500/40',
        priority === 'EMERGENCY' && 'dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-500/40',
        sizeClasses[size],
        shouldPulse ? 'animate-pulse' : '',
      ].filter(Boolean).join(' ')}
      title={label}
    >
      {showEmoji && <span className="leading-none">{emoji}</span>}
      {showIcon && !showEmoji && <Icon className={iconSizes[size]} />}
      {label}
    </span>
  );
}
