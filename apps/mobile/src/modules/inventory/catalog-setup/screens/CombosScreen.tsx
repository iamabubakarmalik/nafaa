/**
 * Combos: products sold together at one price (same as the web). Each row
 * shows the price, the customer's saving, how many can be made from this
 * branch's stock, profit and sales in the chosen period. Filters by status
 * and quick states, sorts, prints and has an Analytics tab. Readable offline
 * from the last saved list; changes need internet.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { AlertTriangle, ArrowUpDown, BarChart3, Check, Gift, Moon, Pencil, Plus, Power, Printer, Star, Trash2, TrendingUp, Trophy } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { formatPKR, formatRelative } from '@/core/format';
import { t } from '@/core/i18n';
import { onlineNeededText, useCachedNotice } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import {
  Amount, Badge, Button, Card, ChipGroup, EmptyState, IconButton, ListRow, ListTemplate, Row, SearchBar, Segmented, Sheet, SkeletonRows, StatTile, SwipeRow, Text,
  confirm, toast, useTheme,
} from '@/design';
import { combosApi, type ComboAnalytics as Analytics, type ComboStatus, type ProductCombo } from '../api/combos';
import { ActionSheet } from '../components/ActionSheet';
import { COMBO_STATUS, STATUS_ORDER, WEEKDAYS } from '../lib/combos';
import { esc, page, printHtml } from '../lib/print';
import { PRESETS, presetRange, useDayStart, type Preset } from '../lib/range';
import { INV, qty, useCostMask, useOnline } from '../../lib/shared';

type Quick = '' | 'low' | 'expired' | 'featured' | 'loss';
type Sort = 'featured' | 'sold' | 'revenue' | 'saving' | 'profit' | 'name' | 'newest';
const KEY = [INV, 'combos'];

const partQty = (it: ProductCombo['items'][number]) => `${qty(it.quantity)} ${it.unit?.unitName ?? it.unitName ?? it.product?.unit ?? ''}`.trim();

function comboSheet(c: ProductCombo, withCost: boolean) {
  const rows = c.items.map((i) => `<tr><td>${esc(i.product?.name ?? '')}${i.variant ? ` · ${esc(i.variant.name)}` : ''}</td><td class="num">${esc(partQty(i))}</td></tr>`).join('');
  const body = `<table><thead><tr><th>${esc(t('Cheez'))}</th><th class="num">${esc(t('Quantity'))}</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="card">${esc(t('Combo ki qeemat'))}: <b>${esc(formatPKR(c.comboPrice))}</b> · ${esc(t('Customer ki bachat'))}: ${esc(formatPKR(c.savingsAmount))} (${Math.round(c.savingsPercentage)}%)
    ${withCost && c.cost != null ? ` · ${esc(t('Cost'))}: ${esc(formatPKR(c.cost))} · ${esc(t('Profit'))}: ${esc(formatPKR(c.profit ?? 0))}` : ''}</p>
    ${c.description ? `<p>${esc(c.description)}</p>` : ''}${c.barcode ? `<p>${esc(t('Barcode'))}: ${esc(c.barcode)}</p>` : ''}`;
  return page(c.name, c.tagLine ?? t('Combo'), body);
}

function combosDoc(list: ProductCombo[], withCost: boolean) {
  const rows = list.map((c) => `<tr><td>${esc(c.name)}</td><td>${esc(t(COMBO_STATUS[c.status].label))}</td><td class="num">${esc(formatPKR(c.comboPrice))}</td>
    <td class="num">${Math.round(c.savingsPercentage)}%</td><td class="num">${c.available ?? 0}</td>${withCost ? `<td class="num">${esc(formatPKR(c.profit ?? 0))}</td>` : ''}</tr>`).join('');
  return page(t('Combos'), t('{{count}} combos', { count: list.length }), `<table><thead><tr><th>${esc(t('Naam'))}</th><th>${esc(t('Haal'))}</th><th class="num">${esc(t('Qeemat'))}</th><th class="num">${esc(t('Bachat'))}</th><th class="num">${esc(t('Ban sakte'))}</th>${withCost ? `<th class="num">${esc(t('Profit'))}</th>` : ''}</tr></thead><tbody>${rows}</tbody></table>`);
}

export function CombosScreen() {
  const th = useTheme();
  const qc = useQueryClient();
  const can = usePermission();
  const online = useOnline();
  const { costHidden, cost } = useCostMask();
  const dayStart = useDayStart();
  const [tab, setTab] = useState<'list' | 'analytics'>('list');
  const [preset, setPreset] = useState<Preset>('month');
  const [status, setStatus] = useState<'all' | ComboStatus>('all');
  const [quick, setQuick] = useState<Quick>('');
  const [sort, setSort] = useState<Sort>('featured');
  const [sortOpen, setSortOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [menu, setMenu] = useState<ProductCombo | null>(null);
  const period = presetRange(preset, dayStart);
  const canEdit = can(P.PRODUCTS_EDIT);

  const listQ = useQuery({ queryKey: [...KEY, 'list'], queryFn: combosApi.list });
  const salesQ = useQuery({ queryKey: [...KEY, 'analytics', period.from, period.to], queryFn: () => combosApi.analytics(period), placeholderData: (p) => p });
  const cached = useCachedNotice(listQ);
  const all = useMemo(() => listQ.data ?? [], [listQ.data]);
  const soldBy = useMemo(() => new Map((salesQ.data?.byCombo ?? []).filter((r) => r.id).map((r) => [r.id!, r])), [salesQ.data]);
  const invalidate = () => { void qc.invalidateQueries({ queryKey: KEY }); void qc.invalidateQueries({ queryKey: ['pos'] }); };
  const guard = () => { if (online) return true; toast.warning(onlineNeededText('settings')); return false; };

  const featureM = useMutation({ mutationFn: (id: string) => combosApi.toggleFeatured(id), onSuccess: (c) => { invalidate(); toast.success(c.isFeatured ? t('Featured bana diya') : t('Featured se hata diya')); } });
  const statusM = useMutation({
    mutationFn: ({ id, next }: { id: string; next: ComboStatus }) => combosApi.update(id, { status: next }),
    onSuccess: (c) => { invalidate(); toast.success(c.status === 'ACTIVE' ? t('{{name}} chalu — POS par dikhega', { name: c.name }) : t('{{name}} band — POS se hat gaya', { name: c.name })); },
  });
  const remove = async (c: ProductCombo) => {
    if (!guard()) return;
    const ok = await confirm({
      title: t('"{{name}}" mitayein?', { name: c.name }), tone: 'danger', confirmLabel: t('Mita dein'),
      message: `${t('Combo POS se hat jayega. Purane bills par koi asar nahi — un me cheezein alag alag likhi hain.')}\n\n${t('Sirf kuch der ke liye rokna ho to mitane ki bajaye Band kar dein.')}`,
    });
    if (!ok) return;
    await combosApi.remove(c.id);
    invalidate();
    toast.success(t('Combo mita diya'));
  };

  const s = search.trim().toLowerCase();
  const list = useMemo(() => {
    const out = all.filter((c) => {
      if (status !== 'all' && c.status !== status) return false;
      if (quick === 'low' && !(c.sellable && (c.available ?? 0) <= 3)) return false;
      if (quick === 'expired' && !c.expired) return false;
      if (quick === 'featured' && !c.isFeatured) return false;
      if (quick === 'loss' && !((c.profit ?? 0) < 0)) return false;
      if (s) {
        const hay = [c.name, c.sku, c.barcode, c.tagLine, c.category?.name, ...c.items.map((i) => i.product?.name)].filter(Boolean).join(' ').toLowerCase();
        if (!s.split(/\s+/).every((w) => hay.includes(w))) return false;
      }
      return true;
    });
    const sold = (c: ProductCombo) => soldBy.get(c.id);
    const by: Record<Sort, (a: ProductCombo, b: ProductCombo) => number> = {
      featured: () => 0,
      sold: (a, b) => (sold(b)?.count ?? 0) - (sold(a)?.count ?? 0),
      revenue: (a, b) => (sold(b)?.revenue ?? 0) - (sold(a)?.revenue ?? 0),
      saving: (a, b) => b.savingsPercentage - a.savingsPercentage,
      profit: (a, b) => (b.profit ?? 0) - (a.profit ?? 0),
      name: (a, b) => a.name.localeCompare(b.name),
      newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
    };
    return sort === 'featured' ? out : [...out].sort(by[sort]);
  }, [all, status, quick, s, sort, soldBy]);

  const counts = {
    live: all.filter((c) => c.sellable).length,
    low: all.filter((c) => c.sellable && (c.available ?? 0) <= 3).length,
    expired: all.filter((c) => c.expired).length,
    featured: all.filter((c) => c.isFeatured).length,
    loss: all.filter((c) => (c.profit ?? 0) < 0).length,
  };
  const st = salesQ.data?.totals;
  const quickOpts: Array<{ value: Quick; label: string; count: number }> = [
    { value: '', label: t('Sab'), count: all.length },
    { value: 'low', label: t('Khatam hone wale'), count: counts.low },
    { value: 'expired', label: t('Period khatam'), count: counts.expired },
    { value: 'featured', label: t('Featured'), count: counts.featured },
    ...(costHidden ? [] : [{ value: 'loss' as const, label: t('Nuqsan wale'), count: counts.loss }]),
  ];

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'list', label: t('Combos'), icon: Gift }, { value: 'analytics', label: t('Analytics'), icon: BarChart3 }]} />
      <ChipGroup options={PRESETS.map((p) => ({ value: p.value, label: t(p.label) }))} value={preset} onChange={setPreset} style={{ marginHorizontal: -th.space(4) }} />
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Power} tone="success" label={t('Chalu combos')} value={<Text size="xl" weight="bold">{counts.live}</Text>} hint={t('kul {{count}}', { count: all.length })} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={TrendingUp} label={t('Combo se kamai')} value={st ? <Amount value={st.revenue} size="lg" weight="bold" compact /> : <Text>—</Text>}
          hint={st ? `${t('Is period me bike')}: ${qty(st.sold)}` : undefined} />
      </Row>
      {tab === 'list' && (
        <>
          <Row gap={2}>
            <SearchBar value={search} onChangeText={setSearch} placeholder={t('Combo, barcode ya andar ki cheez…')} style={{ flex: 1 }} />
            <IconButton icon={ArrowUpDown} label={t('Sort')} variant="soft" size="lg" onPress={() => setSortOpen(true)} />
          </Row>
          <ChipGroup options={[{ value: 'all', label: t('Sab') }, ...STATUS_ORDER.map((x) => ({ value: x, label: t(COMBO_STATUS[x].label), count: all.filter((c) => c.status === x).length }))]}
            value={status} onChange={(v) => setStatus(v as typeof status)} style={{ marginHorizontal: -th.space(4) }} />
          <ChipGroup options={quickOpts} value={quick} onChange={setQuick} style={{ marginHorizontal: -th.space(4) }} />
          {cached.fromCache && cached.updatedAt && <Text size="xs" tone="muted">{t('Last updated {{time}}', { time: formatRelative(cached.updatedAt) })}</Text>}
        </>
      )}
      {tab === 'analytics' && <ComboAnalyticsView data={salesQ.data} loading={salesQ.isLoading} costHidden={costHidden} cost={cost} />}
    </View>
  );

  return (
    <>
      <ListTemplate
        title={t('Combos')}
        subtitle={t('Deals aur bundles')}
        actions={<IconButton icon={Printer} label={t('Print')} onPress={() => void printHtml(combosDoc(list, !costHidden))} disabled={!list.length} />}
        summary={header}
        data={tab === 'list' ? list : []}
        loading={tab === 'list' && listQ.isLoading}
        error={listQ.data ? undefined : listQ.error}
        onRetry={listQ.refetch}
        refreshing={listQ.isRefetching}
        onRefresh={() => { void listQ.refetch(); void salesQ.refetch(); }}
        keyExtractor={(c) => c.id}
        renderItem={({ item: c }) => {
          const sold = soldBy.get(c.id);
          const image = c.imageUrl || c.items.find((i) => i.product?.images?.[0]?.url)?.product?.images?.[0]?.url;
          const avail = c.available ?? 0;
          return (
            <SwipeRow enabled={canEdit} end={[
              { icon: Pencil, label: t('Badlein'), tone: 'brand', onPress: () => router.push(`/combos/${c.id}/edit` as never) },
              { icon: Power, label: c.status === 'ACTIVE' ? t('Band') : t('Chalu'), tone: 'warning', onPress: () => { if (guard()) statusM.mutate({ id: c.id, next: c.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }); } },
              { icon: Trash2, label: t('Mitayein'), tone: 'danger', onPress: () => void remove(c) },
            ]}>
              <ListRow
                leading={image
                  ? <Image source={{ uri: image }} style={{ width: 48, height: 48, borderRadius: th.radius('lg') }} contentFit="cover" />
                  : <View style={{ width: 48, height: 48, borderRadius: th.radius('lg'), backgroundColor: th.colors.brand.soft, alignItems: 'center', justifyContent: 'center' }}><Gift size={22} color={th.colors.brand.text} /></View>}
                title={<Row gap={1.5}><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{c.name}</Text>{c.isFeatured && <Star size={14} color={th.colors.warning.solid} fill={th.colors.warning.solid} />}</Row>}
                subtitle={(
                  <View style={{ gap: 4 }}>
                    <Row gap={1.5} wrap>
                      <Badge tone={c.expired ? 'danger' : COMBO_STATUS[c.status].tone}>{c.expired ? t('Period khatam') : c.upcoming ? t('Abhi shuru nahi') : t(COMBO_STATUS[c.status].label)}</Badge>
                      {c.savingsAmount > 0 && <Badge tone="success">{t('{{value}}% bachat', { value: Math.round(c.savingsPercentage) })}</Badge>}
                      {c.sellable && <Badge tone={avail === 0 ? 'danger' : avail <= 3 ? 'warning' : 'neutral'}>{avail === 0 ? t('Nahi ban sakta') : t('{{available}} ban sakte', { available: avail })}</Badge>}
                    </Row>
                    <Text size="xs" tone="muted" numberOfLines={1}>{c.items.map((i) => `${partQty(i)} ${i.product?.name ?? ''}`).join(' + ')}</Text>
                    {sold && sold.count > 0 && <Text size="xs" tone="muted">{t('{{count}} bike', { count: qty(sold.count) })} · {formatPKR(sold.revenue)}</Text>}
                  </View>
                )}
                trailing={(
                  <View style={{ alignItems: 'flex-end' }}>
                    <Amount value={c.comboPrice} weight="bold" />
                    {c.savingsAmount > 0 && <Text size="2xs" tone="muted" ltr style={{ textDecorationLine: 'line-through' }}>{formatPKR(c.comboPrice + c.savingsAmount)}</Text>}
                    {!costHidden && c.profit != null && <Text size="2xs" tone={c.profit < 0 ? 'danger' : 'success'} ltr>{formatPKR(c.profit)}</Text>}
                  </View>
                )}
                onPress={() => setMenu(c)}
              />
            </SwipeRow>
          );
        }}
        empty={tab === 'list' ? (
          <EmptyState icon={Gift} title={status !== 'all' || quick || s ? t('Is filter me koi combo nahi') : t('Abhi koi combo nahi')}
            message={t('Do ya zyada cheezein mila kar ek qeemat par bechein — customer ko bachat, aap ki sale zyada. POS par "Combos" tab me dikhte hain.')}
            action={canEdit ? <Button icon={Plus} onPress={() => router.push('/combos/new' as never)}>{t('Pehla combo banayein')}</Button> : undefined} />
        ) : <View />}
        fab={canEdit ? { icon: Plus, label: t('Naya combo'), onPress: () => router.push('/combos/new' as never) } : undefined}
      />
      <ActionSheet open={!!menu} onClose={() => setMenu(null)} title={menu?.name} actions={menu ? [
        { icon: Pencil, label: t('Badlein'), hidden: !canEdit, onPress: () => router.push(`/combos/${menu.id}/edit` as never) },
        { icon: Star, label: menu.isFeatured ? t('Featured se hatayein') : t('Featured banayein'), hidden: !canEdit, onPress: () => { if (guard()) featureM.mutate(menu.id); } },
        { icon: Power, label: menu.status === 'ACTIVE' ? t('Band karein') : t('Chalu karein'), hidden: !canEdit, onPress: () => { if (guard()) statusM.mutate({ id: menu.id, next: menu.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }); } },
        { icon: Printer, label: t('Print'), onPress: () => void printHtml(comboSheet(menu, !costHidden)) },
        { icon: Trash2, label: t('Mitayein'), destructive: true, hidden: !canEdit, onPress: () => void remove(menu) },
      ] : []} />
      <Sheet open={sortOpen} onClose={() => setSortOpen(false)} title={t('Sort')}>
        {([['featured', t('Featured pehle')], ['sold', t('Sab se zyada bike')], ['revenue', t('Sab se zyada kamai')], ['saving', t('Sab se zyada bachat')],
          ...(costHidden ? [] : [['profit', t('Sab se zyada profit')]]), ['name', t('Naam A-Z')], ['newest', t('Naye pehle')]] as Array<[Sort, string]>).map(([v, label]) => (
          <ListRow key={v} title={label} dense selected={sort === v} trailing={sort === v ? <Check size={18} color={th.colors.brand.solid} /> : undefined} onPress={() => { setSort(v); setSortOpen(false); }} />
        ))}
      </Sheet>
    </>
  );
}

function ComboAnalyticsView({ data: d, loading, costHidden, cost }: { data?: Analytics; loading: boolean; costHidden: boolean; cost: (n: number) => string }) {
  const th = useTheme();
  if (loading || !d) return <SkeletonRows count={5} />;
  const tt = d.totals;
  const top = [...d.byCombo].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  const best = [...d.weekday].sort((a, b) => b.count - a.count)[0];
  const maxTrend = Math.max(1, ...d.trend.map((x) => x.count));
  return (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Combos bike')} value={<Text size="xl" weight="bold">{qty(tt.sold)}</Text>} hint={t('{{bills}} bill · {{days}} din', { bills: tt.bills, days: d.days })} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="success" label={t('Profit')} value={<Text size="lg" weight="bold" ltr>{cost(tt.profit)}</Text>}
          hint={costHidden || !(tt.revenue > 0) ? undefined : `${t('Margin')} ${Math.round(tt.margin)}%`} />
      </Row>
      {tt.savingsGiven > 0 && <Text size="xs" tone="muted">{t('Customers ko bachat {{savingsGiven}}', { savingsGiven: formatPKR(tt.savingsGiven) })}</Text>}
      <Card title={t('Roz ki sale')}>
        {!d.trend.length ? <Text tone="muted" size="sm">{t('Is period me koi combo nahi bika')}</Text> : (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 64 }}>
            {d.trend.map((x) => <View key={x.key} style={{ flex: 1, height: Math.max(2, (x.count / maxTrend) * 64), backgroundColor: th.colors.brand.solid, borderRadius: 2 }} />)}
          </View>
        )}
        {best && best.count > 0 && <Text size="xs" tone="muted" style={{ marginTop: 6 }}>{t('Hafte ke din')}: {t(WEEKDAYS[best.day] ?? '')}</Text>}
      </Card>
      <Card title={t('Sab se zyada bikne wale')} flush>
        {!top.length ? <Text tone="muted" size="sm" style={{ padding: 12 }}>{t('Is period me koi combo nahi bika')}</Text> : top.map((x, i) => (
          <ListRow key={x.id ?? x.name} icon={i === 0 ? Trophy : undefined} dense title={x.id ? x.name : `${x.name} ${t('(purana)')}`}
            subtitle={t('{{count}} bike', { count: qty(x.count) })} trailing={<Amount value={x.revenue} size="sm" weight="bold" />} />
        ))}
      </Card>
      <Card title={t('Khatam hone wale')} flush>
        {!d.runningLow.length ? <Text tone="muted" size="sm" style={{ padding: 12 }}>{t('Sab combos ke liye maal kaafi hai')}</Text> : d.runningLow.map((x) => (
          <ListRow key={x.id} icon={AlertTriangle} iconTone="warning" dense title={x.name}
            subtitle={x.limitedBy ? (x.limitedBy === 'limit' ? t('Apni had poori') : t('{{limitedBy}} kam hai', { limitedBy: x.limitedBy })) : undefined}
            trailing={<Text size="sm" weight="semibold" tone={x.available === 0 ? 'danger' : 'warning'}>{x.available === 0 ? t('Nahi ban sakta') : t('{{available}} ban sakte', { available: x.available })}</Text>} />
        ))}
      </Card>
      <Card title={t('Nahi bike')} flush>
        {!d.notSold.length ? <Text tone="muted" size="sm" style={{ padding: 12 }}>{t('Har chalu combo bika — zabardast')}</Text> : d.notSold.slice(0, 10).map((x) => (
          <ListRow key={x.id} icon={Moon} dense title={x.name} trailing={<Amount value={x.comboPrice} size="sm" />} />
        ))}
      </Card>
      <Text size="xs" tone="muted">{t('Hisaab POS ke combo bills se banta hai. Wapas hua maal kamai aur cost se nikal diya jata hai.')}</Text>
    </View>
  );
}
