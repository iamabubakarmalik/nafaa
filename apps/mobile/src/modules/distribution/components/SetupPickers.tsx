/**
 * Pickers for the manager setup screens: customers (many, with a search),
 * one product, and a compact "any / these" chip row.
 */

import { useQuery } from '@tanstack/react-query';
import { Check, Package } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { t } from '@/core/i18n';
import { Avatar, Button, Chip, EmptyState, Icon, ListRow, Row, SearchBar, Segmented, Sheet, SkeletonRows, Text, useDebouncedValue, useTheme } from '@/design';
import { lookups, partyOf, partySubOf, type ProductHit, type RosterCustomer } from '../api/setup-lookups';

/* ───────────── customers ───────────── */

export interface CustomerPickSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  customers: RosterCustomer[];
  loading?: boolean;
  initial?: string[];
  /** Small text at the end of a row, e.g. the route the shop is on now. */
  tag?: (c: RosterCustomer) => string | null;
  /** Two-way filter above the list (e.g. only shops without a route). */
  views?: { value: string; label: string; test: (c: RosterCustomer, picked: Set<string>) => boolean }[];
  confirmLabel: string;
  busy?: boolean;
  allowEmpty?: boolean;
  onConfirm: (ids: string[]) => void;
}

export function CustomerPickSheet({ open, onClose, title, description, customers, loading, initial, tag, views, confirmLabel, busy, allowEmpty, onConfirm }: CustomerPickSheetProps) {
  const th = useTheme();
  const [picked, setPicked] = useState<string[]>(initial ?? []);
  const [search, setSearch] = useState('');
  const [view, setView] = useState(views?.[0]?.value ?? '');
  const q = useDebouncedValue(search.trim().toLowerCase(), 150);
  const set = useMemo(() => new Set(picked), [picked]);

  const shown = useMemo(() => {
    const test = views?.find((v) => v.value === view)?.test;
    return customers
      .filter((c) => c.isActive !== false)
      .filter((c) => !test || test(c, set))
      .filter((c) => !q || `${c.name} ${c.businessName ?? ''} ${c.phone ?? ''} ${c.area ?? ''}`.toLowerCase().includes(q))
      .slice(0, 300);
  }, [customers, views, view, q, set]);

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <Sheet open={open} onClose={onClose} title={title} description={description} height={0.88} scrollable={false}
      footer={<Row gap={2}>
        <Button variant="secondary" style={{ flex: 1 }} onPress={onClose}>{t('Rehne dein')}</Button>
        <Button style={{ flex: 1.4 }} loading={busy} disabled={!allowEmpty && !picked.length} onPress={() => onConfirm(picked)}>
          {picked.length ? `${confirmLabel} (${picked.length})` : confirmLabel}
        </Button>
      </Row>}>
      <View style={{ flex: 1, gap: th.space(3) }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder={t('Naam, dukaan, phone ya ilaqa')} />
        {views && views.length > 1 && <Segmented value={view} onChange={setView} options={views.map((v) => ({ value: v.value, label: v.label }))} />}
        {loading ? <SkeletonRows count={6} /> : (
          <FlatList
            data={shown}
            keyExtractor={(c) => c.id}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<EmptyState compact icon={Check} title={t('Koi dukaan nahi mili')} />}
            renderItem={({ item: c }) => {
              const on = set.has(c.id);
              const tg = tag?.(c);
              return (
                <ListRow
                  dense selected={on} onPress={() => toggle(c.id)}
                  leading={<Avatar name={partyOf(c)} size={36} />}
                  title={partyOf(c)} subtitle={partySubOf(c) || '—'}
                  trailing={<Row gap={2}>{tg ? <Text size="xs" tone="warning" weight="semibold">{tg}</Text> : null}{on ? <Icon icon={Check} tone="brand" /> : null}</Row>}
                />
              );
            }}
          />
        )}
      </View>
    </Sheet>
  );
}

/* ───────────── one product ───────────── */

export function ProductPickSheet({ open, onClose, onPick, exclude = [], title }: {
  open: boolean; onClose: () => void; onPick: (p: ProductHit) => void; exclude?: string[]; title?: string;
}) {
  const th = useTheme();
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search.trim(), 250);
  const res = useQuery({ queryKey: ['products', 'dist-picker', q], queryFn: () => lookups.products(q), enabled: open && q.length >= 2 });
  const items = (res.data ?? []).filter((p) => !exclude.includes(p.id));
  return (
    <Sheet open={open} onClose={onClose} title={title ?? t('Item dhoondein…')} height={0.8} scrollable={false}>
      <View style={{ flex: 1, gap: th.space(3) }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder={t('Item dhoondein…')} autoFocus />
        {q.length < 2 ? <Text size="sm" tone="muted">{t('Kam az kam 2 harf likhein')}</Text> : res.isLoading ? <SkeletonRows count={4} /> : (
          <FlatList
            data={items}
            keyExtractor={(p) => p.id}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<Text size="sm" tone="muted">{t('Koi item nahi mila')}</Text>}
            renderItem={({ item: p }) => (
              <ListRow dense icon={Package} title={p.name} subtitle={p.sku ?? undefined} onPress={() => { onPick(p); setSearch(''); onClose(); }} />
            )}
          />
        )}
      </View>
    </Sheet>
  );
}

/* ───────────── any / these chips ───────────── */

export function PickChips({ label, items, picked, onChange, anyText }: {
  label: string; items: { value: string; label: string }[]; picked: string[]; onChange: (v: string[]) => void; anyText?: string;
}) {
  const th = useTheme();
  return (
    <View style={{ gap: th.space(1.5) }}>
      <Row gap={2}>
        <Text size="sm" weight="medium">{label}</Text>
        <Text size="xs" tone="muted">{picked.length ? t('· {{count}} chune', { count: picked.length }) : `· ${anyText ?? t('koi bhi')}`}</Text>
      </Row>
      <Row gap={2} style={{ flexWrap: 'wrap' }}>
        {items.map((i) => (
          <Chip key={i.value} label={i.label} selected={picked.includes(i.value)}
            onPress={() => onChange(picked.includes(i.value) ? picked.filter((x) => x !== i.value) : [...picked, i.value])} />
        ))}
      </Row>
    </View>
  );
}
