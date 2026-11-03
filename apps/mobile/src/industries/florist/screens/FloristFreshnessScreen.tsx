/**
 * Freshness (web FloristFreshnessPage): flowers about to wilt by days left.
 * Sell first, write wastage (a damage report the manager approves; queued
 * offline) or mark new stock arrived (fresh date counts from today).
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AlertTriangle, Clock, Flower2, PackagePlus, Tag, Trash2, TrendingDown } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { daysUntil } from '@nafaa/core/industries/florist';
import { formatDate } from '@/core/format';
import { t } from '@/core/i18n';
import { enqueueDamage } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, EmptyState, ListRow, ListTemplate, Row, Segmented, Sheet, StatTile, SwipeRow, Text, TextArea, confirm, toast, useTheme, type SwipeAction } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { useCostMask } from '@/modules/sales/lib/mask';
import { errorText, todayKey, useDeskOnline } from '../../_shared/deskKit';
import { floristProductsApi, type FreshnessRow } from '../api';
import { FLORIST_KEYS, categoryLabel, refreshFlorist } from '../meta';

type Tab = 'today' | 'soon' | 'later';

export function FloristFreshnessScreen() {
  const th = useTheme();
  const canEdit = usePermission()(P.PRODUCTS_EDIT);
  const { guard } = useDeskOnline('floristOrders');
  const { cost, costHidden } = useCostMask();
  const [tab, setTab] = useState<Tab>('today');
  const [search, setSearch] = useState('');
  const [waste, setWaste] = useState<FreshnessRow | null>(null);
  const q = useQuery({ queryKey: [FLORIST_KEYS.freshness], queryFn: () => floristProductsApi.freshnessAlerts(), refetchInterval: 5 * 60_000 });
  const lists: Record<Tab, FreshnessRow[]> = { today: q.data?.witheringToday ?? [], soon: q.data?.witheringSoon ?? [], later: q.data?.witheringLater ?? [] };
  const stockValue = (r: FreshnessRow) => Math.max(r.product?.stock ?? 0, 0) * (r.product?.costPrice ?? 0);
  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    const all = lists[tab];
    return s ? all.filter((r) => [r.product?.name, r.flowerType, r.color, categoryLabel(r.categoryType)].filter(Boolean).join(' ').toLowerCase().includes(s)) : all;
  }, [lists, tab, search]);
  const wiltedValue = lists.today.reduce((s, r) => s + stockValue(r), 0);

  const arrived = useMutation({
    mutationFn: (r: FreshnessRow) => floristProductsApi.upsert({ productId: r.productId, arrivalDate: todayKey() }),
    onSuccess: () => { refreshFlorist([FLORIST_KEYS.freshness, FLORIST_KEYS.profiles, 'inv']); toast.success(t('Naya maal likh diya — fresh ki date aaj se')); },
    onError: (e) => toast.error(errorText(e, t('Save nahi hua'))),
  });
  const askArrived = async (r: FreshnessRow) => {
    const ok = await confirm({ title: t('Naya maal aaya?'), confirmLabel: t('Haan, aaj aaya'), message: t('{{value}} ki fresh ki date aaj se {{value2}} ginti hogi. Maal ki quantity Purchase se stock me dalein.', { value: r.product?.name ?? t('Is phool'), value2: r.daysToWither ? t('{{count}} din', { count: r.daysToWither }) : t('kuch din') }) });
    if (ok) arrived.mutate(r);
  };

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={AlertTriangle} tone={lists.today.length ? 'danger' : 'neutral'} label={t('Murjha gaye')} loading={q.isLoading} value={String(lists.today.length)} hint={t('Wastage likhein')} onPress={() => setTab('today')} />
        <StatTile style={{ flex: 1 }} icon={Clock} tone="warning" label={t('1–2 din')} loading={q.isLoading} value={String(lists.soon.length)} hint={t('Pehle bechein')} onPress={() => setTab('soon')} />
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={TrendingDown} tone="info" label={t('3–5 din')} loading={q.isLoading} value={String(lists.later.length)} onPress={() => setTab('later')} />
        <StatTile style={{ flex: 1 }} icon={Trash2} tone="danger" label={t('Murjhaye stock ki cost')} loading={q.isLoading} value={costHidden ? '••••' : cost(wiltedValue)} hint={t('Agar sab wastage ho')} />
      </Row>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'today', label: t('Murjha gaye') }, { value: 'soon', label: t('1–2 din') }, { value: 'later', label: t('3–5 din') }]} />
      <CachedNote query={q} />
    </View>
  );

  return (
    <>
      <ListTemplate<FreshnessRow>
        title={t('Freshness')}
        grouped={false}
        search={{ value: search, onChange: setSearch, placeholder: t('Phool, rang ya naam…') }}
        summary={header}
        data={rows}
        loading={q.isLoading}
        error={q.data ? null : q.error}
        onRetry={() => void q.refetch()}
        refreshing={q.isRefetching}
        onRefresh={() => void q.refetch()}
        keyExtractor={(r) => r.id}
        renderItem={({ item: r }) => {
          const stock = Math.max(r.product?.stock ?? 0, 0);
          const left = daysUntil(r.freshUntil, todayKey());
          const end: SwipeAction[] = [
            ...(canEdit ? [{ icon: PackagePlus, label: t('Naya maal aaya'), tone: 'success' as const, onPress: () => guard(() => void askArrived(r)) }] : []),
            ...(stock > 0 ? [{ icon: Trash2, label: t('Wastage'), tone: 'danger' as const, onPress: () => setWaste(r) }] : []),
            ...(canEdit ? [{ icon: Tag, label: t('Rate'), tone: 'brand' as const, onPress: () => router.push(`/products/${r.productId}/edit` as never) }] : []),
          ];
          return (
            <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border }}>
              <SwipeRow end={end}>
                <ListRow icon={Flower2} iconTone={tab === 'today' ? 'danger' : tab === 'soon' ? 'warning' : 'info'}
                  title={r.product?.name ?? r.flowerType ?? t('Phool')}
                  subtitle={<View style={{ gap: 2 }}>
                    <Text size="xs" tone="muted" numberOfLines={1}>{[categoryLabel(r.categoryType), r.flowerType, r.color, r.daysToWither ? t('{{daysToWither}} din fresh', { daysToWither: r.daysToWither }) : null].filter(Boolean).join(' · ')}</Text>
                    <Text size="xs" tone={tab === 'today' ? 'danger' : 'warning'}>{r.freshUntil ? `${formatDate(r.freshUntil)} · ${left === null ? '' : left < 0 ? t('{{value}} din pehle', { value: -left }) : left === 0 ? t('Aaj tak') : t('{{left}} din me', { left })}` : ''}</Text>
                  </View>}
                  trailing={<View style={{ alignItems: 'flex-end', gap: 2 }}><Text weight="bold" ltr>{`${stock} ${r.product?.unit ?? ''}`}</Text>{!costHidden && stockValue(r) > 0 && <Badge tone="warning">{cost(stockValue(r))}</Badge>}</View>} />
              </SwipeRow>
            </View>
          );
        }}
        empty={<EmptyState icon={Flower2} title={tab === 'today' ? t('Koi murjhaya phool nahi') : t('Is list me kuch nahi')} message={t('Phool ki taazgi uske product me likhi hoti hai — maal aane ki date aur kitne din fresh.')} />}
      />
      <WasteSheet row={waste} onClose={() => setWaste(null)} />
    </>
  );
}

function WasteSheet({ row, onClose }: { row: FreshnessRow | null; onClose: () => void }) {
  const th = useTheme();
  const { cost, costHidden } = useCostMask();
  const stock = Math.max(row?.product?.stock ?? 0, 0);
  const [qty, setQty] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const n = qty ?? stock;
  const error = !(n > 0) ? t('Kitne phool — likhein') : n > stock ? t('Stock sirf {{stock}} hai', { stock }) : '';
  const save = async () => {
    if (error || !row) return;
    setBusy(true);
    try {
      await enqueueDamage({ productId: row.productId, quantity: n, reasonCode: 'SPOILAGE', reason: 'Phool murjha gaye', notes: note.trim() || undefined });
      toast.success(t('Wastage likh di — manager ki manzoori ke baad stock kam hoga'));
      refreshFlorist([FLORIST_KEYS.freshness, 'inv']);
      setQty(null); setNote('');
      onClose();
    } catch (e) { toast.error(errorText(e, t('Wastage save nahi hui'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={!!row} onClose={onClose} title={t('Wastage likhein')} description={row?.product?.name ?? undefined}
      footer={<Button fullWidth size="lg" variant="danger" loading={busy} disabled={!!error} onPress={() => void save()}>{t('Wastage likhein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <NumberInput label={t('Kitne ({{value}})', { value: row?.product?.unit ?? 'pcs' })} value={qty ?? stock} onChangeValue={setQty} error={error || undefined}
          hint={costHidden ? t('Stock {{stock}}', { stock }) : t('Stock {{stock}} · loss {{value}} (cost par)', { stock, value: cost(n * (row?.product?.costPrice ?? 0)) })} />
        <TextArea label={t('Note (marzi)')} value={note} onChangeText={setNote} placeholder={t('Garmi se murjha gaye…')} />
        <Text size="xs" tone="muted">{t('Damage page par manager manzoor kare to stock kam hota hai aur loss report me aata hai.')}</Text>
      </View>
    </Sheet>
  );
}
