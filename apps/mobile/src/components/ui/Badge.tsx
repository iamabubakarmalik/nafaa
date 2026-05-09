import { View, Text } from 'react-native';
import { cn } from '@/lib/cn';

interface Props {
  variant?: 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
}

export function Badge({
  variant = 'neutral',
  size = 'sm',
  children,
  className,
}: Props) {
  const variants = {
    brand: 'bg-brand-100 dark:bg-brand-950',
    success: 'bg-emerald-100 dark:bg-emerald-950',
    warning: 'bg-amber-100 dark:bg-amber-950',
    danger: 'bg-red-100 dark:bg-red-950',
    info: 'bg-blue-100 dark:bg-blue-950',
    neutral: 'bg-neutral-100 dark:bg-neutral-800',
  };

  const textVariants = {
    brand: 'text-brand-700 dark:text-brand-300',
    success: 'text-emerald-700 dark:text-emerald-300',
    warning: 'text-amber-700 dark:text-amber-300',
    danger: 'text-red-700 dark:text-red-300',
    info: 'text-blue-700 dark:text-blue-300',
    neutral: 'text-neutral-700 dark:text-neutral-300',
  };

  const sizes = {
    sm: 'px-2 py-0.5',
    md: 'px-3 py-1',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
  };

  return (
    <View
      className={cn('self-start rounded-full', variants[variant], sizes[size], className)}
    >
      <Text className={cn('font-bold', textVariants[variant], textSizes[size])}>
        {children}
      </Text>
    </View>
  );
}
