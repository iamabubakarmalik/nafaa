import { View, Text, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';

const COLORS = [
  '#16a34a', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ef4444',
  '#ec4899', '#14b8a6', '#84cc16', '#a855f7', '#f97316',
];

interface Props {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

export function ColorPicker({ value, onChange, label }: Props) {
  return (
    <View>
      {label && (
        <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-200 mb-2">
          {label}
        </Text>
      )}
      <View className="flex-row flex-wrap gap-2">
        {COLORS.map((c) => (
          <Pressable
            key={c}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onChange(c);
            }}
            className={`h-12 w-12 rounded-2xl border-2 ${
              value === c ? 'border-neutral-900 dark:border-white' : 'border-transparent'
            }`}
            style={{
              backgroundColor: c,
              transform: value === c ? [{ scale: 1.1 }] : [],
            }}
          />
        ))}
      </View>
    </View>
  );
}
