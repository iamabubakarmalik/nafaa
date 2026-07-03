import { useState } from 'react';
import { View, Text, Pressable, Modal, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { Calendar, X, Check, Sparkles } from 'lucide-react-native';

export type PeriodValue = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all' | 'custom';

export interface DateRangeValue {
  period: PeriodValue;
  startDate?: string;
  endDate?: string;
}

const PERIOD_OPTIONS: Array<{
  value: PeriodValue;
  label: string;
  emoji: string;
  sublabel: string;
}> = [
  { value: 'today', label: 'Today', emoji: '📅', sublabel: 'Aaj ka data' },
  { value: 'week', label: 'Last 7 Days', emoji: '📆', sublabel: 'Pichlay 7 din' },
  { value: 'month', label: 'Last 30 Days', emoji: '🗓️', sublabel: 'Pichlay 30 din' },
  { value: 'quarter', label: 'Last 3 Months', emoji: '📊', sublabel: '3 mahinay' },
  { value: 'year', label: 'Last Year', emoji: '📈', sublabel: '1 saal' },
  { value: 'all', label: 'All Time', emoji: '♾️', sublabel: 'Sab kuch' },
  { value: 'custom', label: 'Custom Range', emoji: '🎯', sublabel: 'Apni date' },
];

interface Props {
  visible: boolean;
  value: DateRangeValue;
  onConfirm: (value: DateRangeValue) => void;
  onClose: () => void;
}

const formatDate = (d?: string) => {
  if (!d) return '';
  return new Intl.DateTimeFormat('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(d));
};

export function DateRangePicker({ visible, value, onConfirm, onClose }: Props) {
  const [period, setPeriod] = useState<PeriodValue>(value.period);
  const [startDate, setStartDate] = useState<Date | null>(
    value.startDate ? new Date(value.startDate) : null,
  );
  const [endDate, setEndDate] = useState<Date | null>(
    value.endDate ? new Date(value.endDate) : null,
  );
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const handleConfirm = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirm({
      period,
      startDate: period === 'custom' ? startDate?.toISOString() : undefined,
      endDate: period === 'custom' ? endDate?.toISOString() : undefined,
    });
  };

  const canConfirm =
    period !== 'custom' || (startDate && endDate && startDate <= endDate);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        {/* Header */}
        <View className="px-5 py-4 border-b border-neutral-200 flex-row items-center gap-3">
          <View
            className="h-11 w-11 rounded-2xl items-center justify-center"
            style={{ backgroundColor: '#7c3aed' }}
          >
            <Calendar size={20} color="#ffffff" />
          </View>
          <View className="flex-1">
            <Text className="text-xs uppercase tracking-wider text-violet-700 font-extrabold">
              Date Range
            </Text>
            <Text className="text-base font-bold text-neutral-900">
              Select Time Period
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            className="h-10 w-10 rounded-2xl bg-neutral-100 items-center justify-center"
          >
            <X size={20} color="#6b7280" />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <View className="rounded-2xl bg-violet-50 border border-violet-200 p-3 mb-4 flex-row items-start gap-2">
            <Sparkles size={14} color="#7c3aed" />
            <Text className="flex-1 text-xs text-violet-900 font-bold">
              Kisi bhi date range ka data dekhein — 1 saal pehlay se aaj tak
            </Text>
          </View>

          {/* Presets */}
          <Text className="text-xs uppercase font-extrabold text-neutral-500 mb-2 tracking-wider">
            Quick Presets
          </Text>
          <View className="gap-2 mb-4">
            {PERIOD_OPTIONS.map((opt) => {
              const active = period === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setPeriod(opt.value);
                  }}
                  className="rounded-2xl border-2 p-3.5 flex-row items-center gap-3"
                  style={{
                    backgroundColor: active ? '#7c3aed' : '#ffffff',
                    borderColor: active ? '#7c3aed' : '#e5e7eb',
                  }}
                >
                  <Text style={{ fontSize: 24 }}>{opt.emoji}</Text>
                  <View className="flex-1">
                    <Text
                      className="font-extrabold text-base"
                      style={{ color: active ? '#ffffff' : '#111827' }}
                    >
                      {opt.label}
                    </Text>
                    <Text
                      className="text-[11px] font-bold mt-0.5"
                      style={{ color: active ? 'rgba(255,255,255,0.8)' : '#6b7280' }}
                    >
                      {opt.sublabel}
                    </Text>
                  </View>
                  {active && <Check size={20} color="#ffffff" />}
                </Pressable>
              );
            })}
          </View>

          {/* Custom Date Range */}
          {period === 'custom' && (
            <View className="rounded-2xl bg-white border-2 border-violet-200 p-4 gap-3">
              <Text className="text-xs uppercase font-extrabold text-violet-700 tracking-wider">
                Custom Date Range
              </Text>

              <Pressable
                onPress={() => setShowStartPicker(true)}
                className="rounded-xl border-2 border-neutral-200 p-3 flex-row items-center gap-3"
              >
                <View className="h-10 w-10 rounded-xl bg-emerald-100 items-center justify-center">
                  <Calendar size={16} color="#16a34a" />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] uppercase font-extrabold text-neutral-500">
                    Start Date
                  </Text>
                  <Text className="text-sm font-extrabold text-neutral-900 mt-0.5">
                    {startDate ? formatDate(startDate.toISOString()) : 'Select start date'}
                  </Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() => setShowEndPicker(true)}
                className="rounded-xl border-2 border-neutral-200 p-3 flex-row items-center gap-3"
              >
                <View className="h-10 w-10 rounded-xl bg-rose-100 items-center justify-center">
                  <Calendar size={16} color="#dc2626" />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] uppercase font-extrabold text-neutral-500">
                    End Date
                  </Text>
                  <Text className="text-sm font-extrabold text-neutral-900 mt-0.5">
                    {endDate ? formatDate(endDate.toISOString()) : 'Select end date'}
                  </Text>
                </View>
              </Pressable>

              {startDate && endDate && startDate > endDate && (
                <View className="rounded-lg bg-rose-50 border border-rose-300 p-2">
                  <Text className="text-xs font-bold text-rose-700">
                    ⚠️ Start date end date se pehlay honi chahiye
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Native Date Pickers */}
        {showStartPicker && (
          <DateTimePicker
            value={startDate || new Date()}
            mode="date"
            maximumDate={endDate || new Date()}
            onChange={(_, date) => {
              setShowStartPicker(Platform.OS === 'ios');
              if (date) setStartDate(date);
            }}
          />
        )}
        {showEndPicker && (
          <DateTimePicker
            value={endDate || new Date()}
            mode="date"
            minimumDate={startDate || undefined}
            maximumDate={new Date()}
            onChange={(_, date) => {
              setShowEndPicker(Platform.OS === 'ios');
              if (date) setEndDate(date);
            }}
          />
        )}

        {/* Footer */}
        <View className="px-5 py-4 border-t border-neutral-200 bg-white">
          <Pressable
            onPress={handleConfirm}
            disabled={!canConfirm}
            className="h-14 rounded-2xl items-center justify-center flex-row gap-2"
            style={{ backgroundColor: canConfirm ? '#7c3aed' : '#9ca3af' }}
          >
            <Check size={20} color="#ffffff" />
            <Text className="text-white font-extrabold text-base">Apply Range</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
