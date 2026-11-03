/**
 * Search-and-pick sheet for people and things that live on the server (farmers,
 * milk suppliers, routes). `load(term)` returns the matches; the row is drawn by
 * the caller. Shared by the agri, dairy and meat packs (folder _farm).
 */

import { useQuery } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { EmptyState, ListGroup, SearchBar, Sheet, SkeletonRows, useDebouncedValue, useTheme } from '@/design';

export function PickerSheet<T>({ open, title, onClose, onPick, load, cacheKey, row, placeholder, minChars = 0, footer }: {
  open: boolean; title: string; onClose: () => void; onPick: (item: T) => void;
  load: (term: string) => Promise<T[]>; cacheKey: string; row: (item: T, pick: () => void) => ReactNode;
  placeholder?: string; minChars?: number; footer?: ReactNode;
}) {
  const th = useTheme();
  const [q, setQ] = useState('');
  const term = useDebouncedValue(q.trim(), 200);
  const list = useQuery({ queryKey: ['trade-pick', cacheKey, term], queryFn: () => load(term), enabled: open && term.length >= minChars, staleTime: 20_000 });
  const rows = list.data ?? [];
  return (
    <Sheet open={open} onClose={onClose} title={title} height={0.8} scrollable={false}>
      <View style={{ flex: 1, gap: th.space(3) }}>
        <SearchBar value={q} onChangeText={setQ} placeholder={placeholder ?? t('Naam ya phone likhein')} autoFocus />
        {term.length < minChars ? null : list.isLoading ? <SkeletonRows count={4} /> : rows.length === 0 ? <EmptyState title={t('Koi nahi mila')} /> : (
          <ListGroup>{rows.map((item, i) => <View key={i}>{row(item, () => { onPick(item); setQ(''); })}</View>)}</ListGroup>
        )}
        {footer}
      </View>
    </Sheet>
  );
}
