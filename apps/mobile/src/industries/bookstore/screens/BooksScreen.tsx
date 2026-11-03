/** Books (web BooksPage): every book's edition, class, rate and stock; school, rentable and low-stock views. Needs the server. */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { BookOpen, GraduationCap, Package, Plus, Timer } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, ChipGroup, EmptyState, ListRow, ListTemplate, Row, Segmented, StatTile, Text, useDebouncedValue, useTheme } from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { OfflineNote, useDeskOnline } from '../../_shared/deskKit';
import { bookProfilesApi, publishersApi, type BookProfile } from '../api';
import { BOOK_CATEGORIES, KEYS, labelOf } from '../meta';

type Tab = 'all' | 'text' | 'rent' | 'low';
const authorsOf = (b: BookProfile) => (b.bookAuthors ?? []).map((a) => a.author?.name).filter(Boolean).join(', ');

export function BooksScreen() {
  const th = useTheme();
  const canCreate = usePermission()(P.PRODUCTS_CREATE);
  const { guard } = useDeskOnline('bookstoreDesk');
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [grade, setGrade] = useState('');
  const [publisherId, setPublisherId] = useState('');
  const term = useDebouncedValue(search.trim(), 300);
  const q = useQuery({ queryKey: [KEYS.books, term, publisherId], queryFn: () => bookProfilesApi.list({ search: term || undefined, publisherId: publisherId || undefined }) });
  const pubs = useQuery({ queryKey: [KEYS.publishers, 'active'], queryFn: () => publishersApi.list({ active: true }), staleTime: 60_000 });
  const all = q.data ?? [];
  const grades = useMemo(() => [...new Set(all.map((b) => b.grade).filter((g): g is string => !!g))].sort(), [all]);
  const stock = (b: BookProfile) => Number(b.product?.stock ?? 0);
  const low = (b: BookProfile) => stock(b) <= Math.max(Number(b.product?.lowStockAlert ?? 0), b.reorderLevel ?? 0, 0);
  const rows = useMemo(() => all.filter((b) => (!grade || b.grade === grade) && (tab === 'all' || (tab === 'text' && b.isTextbook) || (tab === 'rent' && b.isRentable) || (tab === 'low' && low(b)))), [all, grade, tab]); // eslint-disable-line react-hooks/exhaustive-deps
  const copies = all.reduce((s, b) => s + Math.max(stock(b), 0), 0);
  const value = all.reduce((s, b) => s + Math.max(stock(b), 0) * Number(b.product?.price ?? 0), 0);

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={BookOpen} tone="info" label={t('Titles')} loading={q.isLoading} value={String(all.length)} hint={t('{{count}} copies', { count: copies })} onPress={() => setTab('all')} />
        <StatTile style={{ flex: 1 }} icon={Package} tone="danger" label={t('Stock kam')} loading={q.isLoading} value={String(all.filter(low).length)} hint={t('Mangwani hain')} onPress={() => setTab('low')} />
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={GraduationCap} tone="accent" label={t('School ki')} loading={q.isLoading} value={String(all.filter((b) => b.isTextbook).length)} onPress={() => setTab('text')} />
        <StatTile style={{ flex: 1 }} icon={Timer} tone="warning" label={t('Kiraye wali')} loading={q.isLoading} value={String(all.filter((b) => b.isRentable).length)} hint={formatMoney(value)} onPress={() => setTab('rent')} />
      </Row>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'all', label: t('Sab') }, { value: 'text', label: t('School ki') }, { value: 'rent', label: t('Kiraye wali') }, { value: 'low', label: t('Stock kam') }]} />
      {grades.length > 0 && <ChipGroup value={grade} onChange={setGrade} style={{ marginHorizontal: -th.space(4) }} options={[{ value: '', label: t('Har class') }, ...grades.map((g) => ({ value: g, label: g }))]} />}
      {(pubs.data?.length ?? 0) > 0 && <ChipGroup value={publisherId} onChange={setPublisherId} style={{ marginHorizontal: -th.space(4) }} options={[{ value: '', label: t('Har publisher') }, ...(pubs.data ?? []).map((p) => ({ value: p.id, label: p.name }))]} />}
      <OfflineNote feature="bookstoreDesk" />
      <CachedNote query={q} />
    </View>
  );

  return (
    <ListTemplate<BookProfile>
      title={t('Kitaben')}
      grouped={false}
      search={{ value: search, onChange: setSearch, placeholder: t('Naam, ISBN ya publisher code') }}
      summary={header}
      data={rows}
      loading={q.isLoading}
      error={q.data ? null : q.error}
      onRetry={() => void q.refetch()}
      refreshing={q.isRefetching}
      onRefresh={() => void q.refetch()}
      keyExtractor={(b) => b.id}
      renderItem={({ item: b }) => (
        <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border }}>
          <ListRow icon={BookOpen} iconTone={low(b) ? 'danger' : 'info'}
            title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={2} style={{ flexShrink: 1 }}>{b.product?.name ?? b.title}</Text>{b.isRentable && <Badge tone="warning">{t('Kiraya')}</Badge>}</Row>}
            subtitle={<View style={{ gap: 2 }}>
              <Text size="xs" tone="muted" numberOfLines={1}>{[authorsOf(b), b.publisher?.name, b.edition ? `${b.edition} ed` : '', b.isTextbook ? [b.grade, b.subject].filter(Boolean).join(' ') : labelOf(BOOK_CATEGORIES, b.category)].filter(Boolean).join(' · ')}</Text>
              {(b.isbn13 || b.isbn10) && <Text size="2xs" tone="muted" ltr>{b.isbn13 || b.isbn10}</Text>}
            </View>}
            trailing={<View style={{ alignItems: 'flex-end' }}><Amount value={Number(b.product?.price ?? 0)} weight="bold" /><Text size="2xs" tone={low(b) ? 'danger' : 'muted'} ltr>{stock(b)}</Text></View>}
            chevron onPress={() => router.push(`/products/${b.productId}` as never)} />
        </View>
      )}
      empty={<EmptyState icon={BookOpen} title={t('Abhi koi kitab nahi')} message={t('Kitab banayein — ISBN, author, publisher aur class ke saath.')} />}
      fab={canCreate ? { icon: Plus, label: t('Nayi kitab'), onPress: () => guard(() => router.push('/products/new' as never)) } : undefined}
    />
  );
}
