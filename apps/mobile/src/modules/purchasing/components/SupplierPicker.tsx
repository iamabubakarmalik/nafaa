/**
 * Supplier field for the purchase editor: tap to search the active
 * suppliers (the last list is kept for offline use), with "New supplier"
 * at the bottom. Shows what is already owed to the chosen one.
 */

import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Truck, UserPlus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { formatPKR } from '@/core/format';
import { t } from '@/core/i18n';
import { Avatar, Button, Field, Icon, List, ListRow, PressableScale, SearchBar, Sheet, Text, useTheme } from '@/design';
import { PUR } from '@/modules/inventory/lib/shared';
import { suppliersApi, type Supplier } from '../api/suppliers';

export function useSupplierPickerList() {
  return useQuery({
    queryKey: [PUR, 'suppliers', 'picker'],
    queryFn: () => suppliersApi.list({ status: 'active', sort: 'recent', limit: 500 }),
    staleTime: 60_000,
  });
}

export function SupplierPicker({ value, onChange, onNew, error }: {
  value: string;
  onChange: (s: Supplier) => void;
  onNew: (name: string) => void;
  error?: string | null;
}) {
  const th = useTheme();
  const q = useSupplierPickerList();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const list = q.data?.items ?? [];
  const current = list.find((s) => s.id === value);
  const shown = useMemo(() => {
    const s = search.trim().toLowerCase();
    return s ? list.filter((x) => `${x.name} ${x.phone ?? ''} ${x.city ?? ''}`.toLowerCase().includes(s)) : list;
  }, [list, search]);

  return (
    <>
      <Field label={t('Supplier')} error={error}
        hint={current ? `${current.phone ?? t('Phone nahi')}${current.outstandingDue > 0 ? ` · ${t('pehle se {{outstandingDue}} dena hai', { outstandingDue: formatPKR(current.outstandingDue) })}` : ''}` : undefined}>
        <PressableScale onPress={() => { setSearch(''); setOpen(true); }} haptic="tap" scaleTo={0.99} accessibilityLabel={t('Supplier')}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: th.space(2), minHeight: th.control('lg'), paddingHorizontal: th.space(3.5),
            backgroundColor: th.colors.surface, borderRadius: th.radius('lg'), borderWidth: 1, borderColor: error ? th.colors.danger.solid : th.colors.borderStrong,
          }}>
          <Icon icon={Truck} tone="muted" />
          <Text style={{ flex: 1 }} tone={current ? 'default' : 'muted'} numberOfLines={1}>{current?.name ?? t('Supplier search…')}</Text>
          <Icon icon={ChevronDown} tone="muted" />
        </PressableScale>
      </Field>
      <Sheet open={open} onClose={() => setOpen(false)} title={t('Supplier')} height={0.8} scrollable={false}>
        <View style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: th.space(4), paddingBottom: th.space(2) }}>
            <SearchBar value={search} onChangeText={setSearch} placeholder={t('Naam, phone ya shehar…')} autoFocus />
          </View>
          <List
            data={shown}
            loading={q.isLoading}
            keyExtractor={(s) => s.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item: s }) => (
              <ListRow avatar={<Avatar name={s.name} url={s.logoUrl ?? undefined} size={36} />} title={s.name}
                subtitle={[s.phone, s.city].filter(Boolean).join(' · ') || undefined}
                trailing={s.outstandingDue > 0 ? <Text size="xs" weight="semibold" tone="danger" ltr>{formatPKR(s.outstandingDue)}</Text> : undefined}
                selected={s.id === value}
                onPress={() => { onChange(s); setOpen(false); }} />
            )}
            ListFooterComponent={(
              <View style={{ padding: th.space(4) }}>
                <Button variant="soft" icon={UserPlus} onPress={() => { setOpen(false); onNew(search.trim()); }}>
                  {search.trim() ? t('"{{value}}" naya supplier', { value: search.trim() }) : t('Naya supplier')}
                </Button>
              </View>
            )}
          />
        </View>
      </Sheet>
    </>
  );
}
