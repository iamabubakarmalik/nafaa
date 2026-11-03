/**
 * Select: a field that opens a sheet of options (search appears when there
 * are many).
 *
 *   <Select label={t('Role')} value={role} onChange={setRole}
 *     options={[{ value: 'CASHIER', label: t('Cashier'), description: t('Counter par sale') }, …]} />
 *   <Select multiple value={methods} onChange={setMethods} options={…} />
 */

import type { LucideIcon } from 'lucide-react-native';
import { Check, ChevronDown } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { useTheme } from '../theme/ThemeProvider';
import { Field } from './Input';
import { PressableScale } from './Pressable';
import { Text } from './Text';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { SearchBar } from './SearchBar';
import { ListRow } from './ListRow';
import { Button } from './Button';
import { EmptyState } from './States';

export interface SelectOption<V extends string = string> {
  value: V;
  label: string;
  description?: string;
  icon?: LucideIcon;
}

type SelectProps<V extends string> = {
  label?: string;
  labelHint?: string;
  placeholder?: string;
  options: SelectOption<V>[];
  hint?: string;
  error?: string | null | false;
  disabled?: boolean;
  /** Sheet title (defaults to the label). */
  title?: string;
  searchable?: boolean;
} & ({ multiple?: false; value: V | null | undefined; onChange: (v: V) => void } | { multiple: true; value: V[]; onChange: (v: V[]) => void });

export function Select<V extends string>(props: SelectProps<V>) {
  const th = useTheme();
  const c = th.colors;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [draft, setDraft] = useState<V[]>([]);
  const selected = props.multiple ? props.value : props.value != null ? [props.value] : [];
  const display = props.options.filter((o) => selected.includes(o.value)).map((o) => o.label).join(', ');
  const searchable = props.searchable ?? props.options.length > 8;
  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? props.options.filter((o) => `${o.label} ${o.description ?? ''}`.toLowerCase().includes(s)) : props.options;
  }, [q, props.options]);

  const openSheet = () => {
    setDraft(selected);
    setQ('');
    setOpen(true);
  };

  return (
    <Field label={props.label} labelHint={props.labelHint} hint={props.hint} error={props.error}>
      <PressableScale
        onPress={openSheet}
        disabled={props.disabled}
        haptic="tap"
        scaleTo={0.99}
        accessibilityLabel={props.label}
        accessibilityHint={display}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: th.space(2), minHeight: th.control('lg'), paddingHorizontal: th.space(3.5),
          backgroundColor: props.disabled ? c.surfaceMuted : c.surface, borderRadius: th.radius('lg'), borderWidth: 1,
          borderColor: props.error ? c.danger.solid : c.borderStrong,
        }}
      >
        <Text size="md" tone={display ? 'default' : 'subtle'} numberOfLines={1} style={{ flex: 1 }}>{display || props.placeholder || t('Chunein')}</Text>
        <Icon icon={ChevronDown} size={18} tone="muted" />
      </PressableScale>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={props.title ?? props.label}
        footer={props.multiple ? <Button fullWidth size="lg" onPress={() => { (props.onChange as (v: V[]) => void)(draft); setOpen(false); }}>{t('Done')}</Button> : undefined}
      >
        {searchable && <SearchBar value={q} onChangeText={setQ} style={{ marginBottom: th.space(2) }} />}
        <View style={{ marginHorizontal: -th.space(4) }}>
          {visible.map((o) => {
            const on = props.multiple ? draft.includes(o.value) : selected.includes(o.value);
            return (
              <ListRow
                key={o.value}
                title={o.label}
                subtitle={o.description}
                icon={o.icon}
                iconTone={on ? 'brand' : 'neutral'}
                selected={on}
                trailing={on ? <Icon icon={Check} size={20} tone="brand" strokeWidth={2.6} /> : undefined}
                onPress={() => {
                  if (props.multiple) setDraft((d) => (d.includes(o.value) ? d.filter((x) => x !== o.value) : [...d, o.value]));
                  else {
                    props.onChange(o.value);
                    setOpen(false);
                  }
                }}
              />
            );
          })}
          {visible.length === 0 && <EmptyState compact title={t('Kuch nahi mila')} />}
        </View>
      </Sheet>
    </Field>
  );
}
