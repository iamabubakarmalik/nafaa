import { forwardRef, useState } from 'react';
import {
  TextInput,
  View,
  Text,
  Pressable,
  type TextInputProps,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { cn } from '@/lib/cn';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
  inputClassName?: string;
  isPassword?: boolean;
}

export const Input = forwardRef<TextInput, Props>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      containerClassName,
      inputClassName,
      isPassword,
      ...rest
    },
    ref,
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const [focused, setFocused] = useState(false);

    return (
      <View className={cn('gap-1.5', containerClassName)}>
        {label && (
          <Text className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
            {label}
          </Text>
        )}

        <View
          className={cn(
            'flex-row items-center gap-2 rounded-xl border bg-white dark:bg-neutral-900 px-4 h-12',
            focused
              ? 'border-brand-500'
              : error
                ? 'border-red-400'
                : 'border-neutral-200 dark:border-neutral-700',
          )}
        >
          {leftIcon}
          <TextInput
            ref={ref}
            secureTextEntry={isPassword && !showPassword}
            placeholderTextColor="#9ca3af"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className={cn(
              'flex-1 text-base text-neutral-900 dark:text-white',
              inputClassName,
            )}
            {...rest}
          />
          {isPassword && (
            <Pressable
              hitSlop={8}
              onPress={() => setShowPassword((v) => !v)}
            >
              {showPassword ? (
                <EyeOff size={20} color="#9ca3af" />
              ) : (
                <Eye size={20} color="#9ca3af" />
              )}
            </Pressable>
          )}
          {!isPassword && rightIcon}
        </View>

        {error && <Text className="text-xs text-red-600">{error}</Text>}
        {hint && !error && (
          <Text className="text-xs text-neutral-500">{hint}</Text>
        )}
      </View>
    );
  },
);

Input.displayName = 'Input';
