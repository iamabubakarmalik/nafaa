import { View, type ViewProps } from 'react-native';
import { cn } from '@/lib/cn';

interface Props extends ViewProps {
  variant?: 'default' | 'elevated' | 'outline';
}

export function Card({ variant = 'default', className, ...rest }: Props) {
  const variants = {
    default: 'bg-white dark:bg-neutral-900',
    elevated:
      'bg-white dark:bg-neutral-900 shadow-lg shadow-black/5 dark:shadow-black/20',
    outline:
      'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800',
  };

  return (
    <View
      className={cn('rounded-2xl p-4', variants[variant], className)}
      {...rest}
    />
  );
}
