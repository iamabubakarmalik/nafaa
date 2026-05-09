import { forwardRef } from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  type PressableProps,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg' | 'xl';

interface Props extends PressableProps {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  className?: string;
  textClassName?: string;
  children: React.ReactNode;
  haptic?: boolean;
}

const variants: Record<Variant, { container: string; text: string }> = {
  primary: {
    container: 'bg-brand-600 active:bg-brand-700',
    text: 'text-white',
  },
  secondary: {
    container:
      'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 active:bg-neutral-50 dark:active:bg-neutral-700',
    text: 'text-neutral-900 dark:text-white',
  },
  ghost: {
    container: 'bg-transparent active:bg-neutral-100 dark:active:bg-neutral-800',
    text: 'text-neutral-700 dark:text-neutral-200',
  },
  danger: {
    container: 'bg-red-600 active:bg-red-700',
    text: 'text-white',
  },
  outline: {
    container: 'border-2 border-brand-600 active:bg-brand-50 dark:active:bg-brand-950',
    text: 'text-brand-700 dark:text-brand-400',
  },
};

const sizes: Record<Size, { container: string; text: string }> = {
  sm: { container: 'h-9 px-4', text: 'text-sm' },
  md: { container: 'h-11 px-5', text: 'text-sm' },
  lg: { container: 'h-13 px-6', text: 'text-base' },
  xl: { container: 'h-15 px-8', text: 'text-lg' },
};

export const Button = forwardRef<View, Props>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading,
      disabled,
      className,
      textClassName,
      children,
      haptic = true,
      onPress,
      ...rest
    },
    ref,
  ) => {
    const v = variants[variant];
    const s = sizes[size];

    return (
      <Pressable
        ref={ref}
        disabled={disabled || loading}
        onPress={(e) => {
          if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress?.(e);
        }}
        className={cn(
          'flex-row items-center justify-center gap-2 rounded-xl',
          v.container,
          s.container,
          (disabled || loading) && 'opacity-50',
          className,
        )}
        {...rest}
      >
        {loading && (
          <ActivityIndicator
            size="small"
            color={
              variant === 'primary' || variant === 'danger' ? '#ffffff' : '#16a34a'
            }
          />
        )}
        {typeof children === 'string' ? (
          <Text className={cn('font-semibold', v.text, s.text, textClassName)}>
            {children}
          </Text>
        ) : (
          children
        )}
      </Pressable>
    );
  },
);

Button.displayName = 'Button';
