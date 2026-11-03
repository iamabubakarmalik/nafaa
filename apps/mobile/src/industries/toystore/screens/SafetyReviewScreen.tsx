/**
 * Safety review (web ToySafetyReviewPage): toys with small parts on a young
 * age, no non-toxic mark or no certificate, worst first. "Fix" opens the
 * toy's editor. Needs the server; the last loaded list stays readable.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AlertTriangle, Baby, FlaskConical, Pencil, ShieldAlert, ShieldCheck } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { msg, t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, ChipGroup, EmptyState, ListRow, ListTemplate, Row, StatTile, SwipeRow, Text, useTheme } from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { toyProductsApi, type SafetyRow } from '../api';
import { FLAG, KEYS, ageText } from '../meta';

type Flag = SafetyRow['riskFlags'][number];
type Tab = 'all' | Flag;

const TABS: Array<{ value: Tab; label: string }> = [
  { value: 'all', label: msg('Sab') }, { value: 'UNDER_THREE', label: msg('Foran') }, { value: 'CHOKING_HAZARD', label: msg('Purze') }, { value: 'NO_SAFETY_CERTIFICATION', label: msg('Certificate') },
];

export function SafetyReviewScreen() {
  const th = useTheme();
  const canEdit = usePermission()(P.PRODUCTS_EDIT);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>('all');
  const q = useQuery({ queryKey: [KEYS.safety], queryFn: () => toyProductsApi.safetyReview() });
  const all = useMemo(() => [...(q.data ?? [])].sort((a, b) => Number(b.riskFlags.includes('UNDER_THREE')) - Number(a.riskFlags.includes('UNDER_THREE'))), [q.data]);
  const count = (f: Flag) => all.filter((r) => r.riskFlags.includes(f)).length;
  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    return all.filter((r) => (tab === 'all' || r.riskFlags.includes(tab)) && (!s || [r.product.name, r.product.sku].some((v) => v?.toLowerCase().includes(s))));
  }, [all, tab, search]);

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={Baby} tone={count('UNDER_THREE') ? 'danger' : 'neutral'} label={t('3 saal se kam par purze')} loading={q.isLoading} value={String(count('UNDER_THREE'))} hint={t('Umar ya nishan ghalat')} onPress={() => setTab('UNDER_THREE')} />
        <StatTile style={{ flex: 1 }} icon={AlertTriangle} tone="warning" label={t('Chhote purze')} loading={q.isLoading} value={String(count('CHOKING_HAZARD'))} onPress={() => setTab('CHOKING_HAZARD')} />
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={FlaskConical} tone="accent" label={t('Non-toxic nahi')} loading={q.isLoading} value={String(count('NOT_CERTIFIED_NON_TOXIC'))} onPress={() => setTab('NOT_CERTIFIED_NON_TOXIC')} />
        <StatTile style={{ flex: 1 }} icon={ShieldCheck} tone="neutral" label={t('Certificate nahi')} loading={q.isLoading} value={String(count('NO_SAFETY_CERTIFICATION'))} onPress={() => setTab('NO_SAFETY_CERTIFICATION')} />
      </Row>
      <ChipGroup value={tab} onChange={setTab} style={{ marginHorizontal: -th.space(4) }} options={TABS.map((x) => ({ value: x.value, label: t(x.label) }))} />
      <CachedNote query={q} />
    </View>
  );

  return (
    <ListTemplate<SafetyRow>
      title={t('Safety review')} subtitle={t('Jin khilonon par chhote purze hain ya certificate nahi — bechne se pehle dekh lein')}
      search={{ value: search, onChange: setSearch, placeholder: t('Khilone ka naam ya SKU') }}
      summary={header}
      data={rows} loading={q.isLoading} error={!q.data ? q.error : undefined} onRetry={() => void q.refetch()}
      refreshing={q.isRefetching} onRefresh={() => void q.refetch()} keyExtractor={(r) => r.id}
      renderItem={({ item: r }) => (
        <SwipeRow end={canEdit ? [{ icon: Pencil, label: t('Theek karein'), tone: 'brand', onPress: () => router.push(`/products/${r.productId}/edit` as never) }] : []} enabled={canEdit}>
          <ListRow
            title={r.product.name} overline={r.product.sku ?? undefined}
            subtitle={<Row gap={1} wrap>{r.riskFlags.map((f) => <Badge key={f} tone={FLAG[f]?.tone ?? 'neutral'}>{t(FLAG[f]?.label ?? f)}</Badge>)}</Row>}
            trailing={<View style={{ alignItems: 'flex-end' }}><Text size="xs" tone="muted">{ageText(r) || '—'}</Text><Text size="xs" weight="semibold">{t('Stock {{stock}}', { stock: r.product.stock })}</Text></View>}
            chevron onPress={() => router.push(`/products/${r.productId}` as never)} />
        </SwipeRow>
      )}
      empty={<EmptyState icon={ShieldCheck} title={all.length ? t('Is tab me kuch nahi') : t('Sab khilone theek hain')} message={t('Khilone ki umar, chhote purze aur certificate uske Edit me likhe jate hain.')} />}
    />
  );
}
