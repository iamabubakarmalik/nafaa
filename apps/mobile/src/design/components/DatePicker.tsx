/**
 * Date and time fields. Values are JS Dates (a picked calendar day or clock time).
 *
 *   <DatePicker label={t('Date')} value={date} onChange={setDate} />
 *   <DatePicker mode="time" label={t('Khulne ka waqt')} value={open} onChange={setOpen} />
 *
 * iOS shows the calendar in a sheet; Android uses the system dialog.
 */

import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { CalendarDays, Clock } from 'lucide-react-native';
import { useState } from 'react';
import { Platform } from 'react-native';
import { t, currentLocale } from '@/core/i18n';
import { useTheme } from '../theme/ThemeProvider';
import { Field } from './Input';
import { PressableScale } from './Pressable';
import { Text } from './Text';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { Button } from './Button';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** Picked values are wall-clock dates and times, shown as picked (device time). */
const showDate = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
const showTime = (d: Date) => `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`;

export interface DatePickerProps {
  label?: string;
  value: Date | null;
  onChange: (date: Date) => void;
  mode?: 'date' | 'time';
  minimumDate?: Date;
  maximumDate?: Date;
  placeholder?: string;
  hint?: string;
  error?: string | null | false;
  disabled?: boolean;
}

export function DatePicker({ label, value, onChange, mode = 'date', minimumDate, maximumDate, placeholder, hint, error, disabled }: DatePickerProps) {
  const th = useTheme();
  const c = th.colors;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(value ?? new Date());
  const shown = value ? (mode === 'date' ? showDate(value) : showTime(value)) : '';

  const openPicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: value ?? new Date(),
        mode,
        minimumDate,
        maximumDate,
        onChange: (e, d) => {
          if (e.type === 'set' && d) onChange(d);
        },
      });
      return;
    }
    setDraft(value ?? new Date());
    setOpen(true);
  };

  return (
    <Field label={label} hint={hint} error={error}>
      <PressableScale
        onPress={openPicker}
        disabled={disabled}
        haptic="tap"
        scaleTo={0.99}
        accessibilityLabel={label}
        accessibilityHint={shown}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: th.space(2), minHeight: th.control('lg'), paddingHorizontal: th.space(3.5),
          backgroundColor: disabled ? c.surfaceMuted : c.surface, borderRadius: th.radius('lg'), borderWidth: 1,
          borderColor: error ? c.danger.solid : c.borderStrong,
        }}
      >
        <Icon icon={mode === 'date' ? CalendarDays : Clock} size={18} tone="subtle" />
        <Text size="md" tone={shown ? 'default' : 'subtle'} ltr={!!shown} style={{ flex: 1 }}>{shown || placeholder || t('Chunein')}</Text>
      </PressableScale>
      {Platform.OS === 'ios' && (
        <Sheet open={open} onClose={() => setOpen(false)} title={label} footer={<Button fullWidth size="lg" onPress={() => { onChange(draft); setOpen(false); }}>{t('Done')}</Button>}>
          <DateTimePicker
            value={draft}
            mode={mode}
            display={mode === 'date' ? 'inline' : 'spinner'}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            accentColor={c.brand.solid}
            themeVariant={th.isDark ? 'dark' : 'light'}
            locale={currentLocale() === 'ur' ? 'ur-PK' : 'en-PK'}
            onChange={(_, d) => d && setDraft(d)}
          />
        </Sheet>
      )}
    </Field>
  );
}
