/**
 * Ads & ROAS: the ads spend log and what it brought in. Spend against online
 * sales by day, week, product and channel (ROAS, cost per order, profit
 * after ads); daily entries added, edited or removed here; and whether the
 * spend is written to Expenses (P&L) once. Mirrors the web AdsPage (the CSV
 * import from ads managers stays on the web).
 */

import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Megaphone, Pencil, Plus, Receipt, ShoppingBag, Target, Trash2, TrendingUp, Upload, X } from 'lucide-react-native';
import { businessDayKey, formatDate, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS, usePermission } from '@/core/permissions';
import {
  Badge, Button, Card, Chip, ChipGroup, DatePicker, EmptyState, ErrorState, IconButton, Input, MoneyInput, PressableScale, Screen, Sheet,
  SkeletonRows, Switch, Tabs, Text, confirm, toast, useTheme,
} from '@/design';
import { ADS_AFFECTED_KEYS, ADS_KEY, AD_PLATFORMS, adsApi, type AdEntry, type AdPlatform, type AdsSetup, type RoasRow } from '../api/growth';
import { apiErrorMessage } from '../api/online';
import { BrandLogo, type BrandName } from '../components/BrandLogo';
import { KpiStrip, SavedDataNote } from '../components/bits';
import { OnlineMenuButton } from '../components/OnlineMenu';
import { ProductPicker } from '../components/ProductPicker';
import { AD_PLATFORM_LABEL } from '../lib/labels';
import { useOnlineGuard } from '../lib/online';
import { openOnWeb } from '../lib/device';
import { periodOptions, periodRange, type PeriodPreset } from '../lib/period';

type Tab = 'day' | 'week' | 'product' | 'channel' | 'entries';
const PLATFORM_BRAND: Record<AdPlatform, BrandName> = { META: 'meta', TIKTOK: 'tiktok', GOOGLE: 'google', OTHER: 'other' };
const roasText = (v: number | null | undefined) => (v == null ? '—' : t('{{value}}x', { value: v.toFixed(2) }));
const dayText = (k: string) => formatDate(`${k}T12:00:00`);

export function AdsScreen() {
  const th = useTheme();
  const qc = useQueryClient();
  const can = usePermission();
  const canWrite = can(PERMISSIONS.ADS_MANAGE);
  const canSetting = can(PERMISSIONS.SETTINGS_EDIT);
  const { guard } = useOnlineGuard('reports');
  const [tab, setTab] = useState<Tab>('day');
  const [period, setPeriod] = useState<PeriodPreset>('week');
  const [form, setForm] = useState<AdEntry | 'new' | null>(null);
  const range = periodRange(period) ?? periodRange('quarter')!;
  const setupQ = useQuery({ queryKey: [ADS_KEY, 'setup'], queryFn: adsApi.settings, staleTime: 60_000 });
  const reportQ = useQuery({ queryKey: [ADS_KEY, 'report', range.from, range.to], queryFn: () => adsApi.report(range.from, range.to), placeholderData: (p) => p });
  const listQ = useInfiniteQuery({
    queryKey: [ADS_KEY, 'list', range.from, range.to],
    queryFn: ({ pageParam }) => adsApi.list({ from: range.from, to: range.to, page: pageParam, limit: 30 }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.pages ? last.page + 1 : undefined),
    enabled: tab === 'entries',
  });
  const refreshAll = () => ADS_AFFECTED_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const saveSetting = useMutation({
    mutationFn: (on: boolean) => adsApi.saveSettings(on),
    onSuccess: (s) => { toast.success(s.postExpenses ? t('Nayi entries Expenses me jayengi') : t('Nayi entries Expenses me nahi jayengi')); qc.invalidateQueries({ queryKey: [ADS_KEY, 'setup'] }); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Setting save nahi hui'))),
  });
  const remove = useMutation({
    mutationFn: (id: string) => adsApi.remove(id),
    onSuccess: () => { toast.success(t('Entry mit gayi')); refreshAll(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi mita'))),
  });
  const r = reportQ.data;
  const tt = r?.totals;
  const entries = listQ.data?.pages.flatMap((p) => p.items) ?? [];
  const rows: Array<{ key: string; label: string; sub?: string; row: RoasRow }> = !r ? [] : tab === 'day' ? [...r.byDay].reverse().map((x) => ({ key: x.day, label: dayText(x.day), row: x }))
    : tab === 'week' ? [...r.byWeek].reverse().map((x) => ({ key: x.week, label: dayText(x.week), row: x }))
      : tab === 'product' ? r.byProduct.map((x) => ({ key: x.id, label: x.name, sub: x.qty ? t('{{qty}} piece', { qty: x.qty }) : undefined, row: x }))
        : r.byChannel.map((x) => ({ key: x.id, label: x.name, row: x }));

  return (
    <Screen title={t('Ads & ROAS')} actions={<>
      {canWrite && <IconButton icon={Upload} label={t('CSV import')} onPress={() => openOnWeb('/online-store/ads')} />}
      <OnlineMenuButton current="/online/ads" />
    </>} onRefresh={() => { void reportQ.refetch(); void listQ.refetch(); }} refreshing={reportQ.isRefetching}
      footer={canWrite ? <Button fullWidth size="lg" icon={Plus} onPress={guard(() => setForm('new'))}>{t('Aaj ka kharcha')}</Button> : undefined}>
      <SavedDataNote query={reportQ} />
      <ChipGroup value={period} onChange={(v) => setPeriod(v as PeriodPreset)} style={{ marginHorizontal: -th.space(4) }}
        options={periodOptions(['today', 'yesterday', 'week', 'month', 'thisMonth', 'quarter']).map((o) => ({ ...o, label: t(o.label) }))} />
      {reportQ.isError && !r ? <ErrorState error={reportQ.error} onRetry={reportQ.refetch} /> : !r || !tt ? <SkeletonRows count={6} /> : (
        <>
          <KpiStrip items={[
            { key: 's', label: t('Ads kharcha'), icon: Megaphone, tone: 'accent', value: formatMoney(tt.spend), hint: r.byPlatform.map((p) => `${t(AD_PLATFORM_LABEL[p.platform])} ${p.share}%`).join(' · ') || t('Abhi koi entry nahi') },
            { key: 'o', label: t('Online sale'), icon: ShoppingBag, tone: 'info', value: formatMoney(tt.sales), hint: t('{{orders}} orders · {{returned}} wapas', { orders: tt.orders, returned: tt.returned }) },
            { key: 'r', label: t('ROAS'), icon: Target, tone: tt.roas == null ? 'neutral' : tt.roas >= 3 ? 'success' : tt.roas >= 1.5 ? 'warning' : 'danger', value: roasText(tt.roas), hint: t('Sale ÷ Ads kharcha') },
            { key: 'c', label: t('Har order ka Ads kharcha'), icon: Receipt, tone: 'accent', value: tt.costPerOrder != null ? formatMoney(tt.costPerOrder) : '—', hint: t('Ads kharcha ÷ orders') },
            { key: 'p', label: t('Ads ke baad Profit'), icon: TrendingUp, tone: (tt.profitAfterAds ?? 0) >= 0 ? 'success' : 'danger', value: r.seesProfit ? formatMoney(tt.profitAfterAds ?? 0) : '—',
              hint: r.seesProfit ? t('Ads se pehle {{profitBeforeAds}}', { profitBeforeAds: formatMoney(tt.profitBeforeAds ?? 0) }) : t('Profit dekhne ki permission nahi') },
          ]} />
          <Card>
            <Switch value={!!setupQ.data?.postExpenses} disabled={!canSetting || saveSetting.isPending || !setupQ.data} onChange={guard((v: boolean) => saveSetting.mutate(v))}
              label={t('Ads ka kharcha Nafaa kharche me likhe')}
              description={setupQ.data?.postExpenses
                ? t('On hai: har din aur platform ka kharcha ek "Ads / marketing" Expense ban jata hai aur Profit se sirf ek baar katta hai. Entry badlein ya mitayein to Expense bhi saath badalta hai.')
                : t('Band hai: nayi entries sirf ROAS ke liye hain. Agar aap Ads ka kharcha Expenses me khud likhte hain to band hi rakhein, warna Profit se do baar katega.')} />
          </Card>
          <Tabs value={tab} onChange={setTab} tabs={[
            { value: 'day', label: t('Din') }, { value: 'week', label: t('Hafta') }, { value: 'product', label: t('Product'), count: r.byProduct.length },
            { value: 'channel', label: t('Channel') }, { value: 'entries', label: t('Entries'), count: listQ.data?.pages[0]?.total },
          ]} />
          {tab !== 'entries' ? (
            !rows.length ? <EmptyState compact icon={Megaphone} title={tab === 'product' ? t('Is period me koi online product nahi bika') : t('Is period me na Ads kharcha hai na online sale')} /> : (
              <Card flush>
                {rows.map((x, i) => (
                  <View key={x.key} style={{ paddingHorizontal: th.space(4), paddingVertical: th.space(2.5), borderTopWidth: i ? 1 : 0, borderTopColor: th.colors.divider, gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
                      <Text size="sm" weight="semibold" numberOfLines={1} style={{ flex: 1 }}>{x.label}</Text>
                      <Badge tone={x.row.roas == null ? 'neutral' : x.row.roas >= 3 ? 'success' : x.row.roas >= 1.5 ? 'warning' : 'danger'}>{roasText(x.row.roas)}</Badge>
                    </View>
                    <Text size="xs" tone="muted" ltr>
                      {t('Ads kharcha')} {formatMoney(x.row.spend)} · {t('Online sale')} {formatMoney(x.row.sales)} · {x.row.orders} {t('Orders')}
                      {x.row.costPerOrder != null ? ` · ${formatMoney(x.row.costPerOrder)}/${t('order')}` : ''}
                    </Text>
                    {r.seesProfit && x.row.profitAfterAds != null && <Text size="xs" weight="semibold" tone={x.row.profitAfterAds >= 0 ? 'success' : 'danger'}>{t('Ads ke baad Profit')} {formatMoney(x.row.profitAfterAds)}</Text>}
                    {x.sub ? <Text size="2xs" tone="subtle">{x.sub}</Text> : null}
                  </View>
                ))}
              </Card>
            )
          ) : listQ.isLoading ? <SkeletonRows count={5} /> : !entries.length ? (
            <EmptyState compact icon={Megaphone} title={t('Is period me koi Ads entry nahi')} message={t('Roz ka Ads kharcha likhein ya ads manager ki report import karein — ROAS khud ban jayega.')} />
          ) : (
            <Card flush>
              {entries.map((e, i) => (
                <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3), paddingHorizontal: th.space(4), paddingVertical: th.space(2.5), borderTopWidth: i ? 1 : 0, borderTopColor: th.colors.divider }}>
                  <BrandLogo name={PLATFORM_BRAND[e.platform]} size={30} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" weight="semibold" numberOfLines={1}>{formatMoney(e.amount)} · {e.campaign || t(AD_PLATFORM_LABEL[e.platform])}</Text>
                    <Text size="xs" tone="muted" numberOfLines={2}>{[dayText(e.day), e.channel?.name, e.products?.length ? e.products.map((p) => p.name).join(', ') : null,
                      e.orders != null ? t('{{orders}} orders (ads manager)', { orders: e.orders }) : null,
                      e.postExpense ? (e.expenseNumber ? t('Expense {{expenseNumber}}', { expenseNumber: e.expenseNumber }) : t('Expense')) : t('Expenses me nahi')].filter(Boolean).join(' · ')}</Text>
                  </View>
                  {canWrite && <>
                    <IconButton icon={Pencil} label={t('Badlein')} size="sm" onPress={guard(() => setForm(e))} />
                    <IconButton icon={Trash2} label={t('Mitayein')} size="sm" variant="danger" onPress={guard(async () => {
                      if (await confirm({ title: t('{{label}} · {{day}} ({{amount}}) mitayein?', { label: t(AD_PLATFORM_LABEL[e.platform]), day: dayText(e.day), amount: formatMoney(e.amount) }), tone: 'danger', confirmLabel: t('Mitayein') })) remove.mutate(e.id);
                    })} />
                  </>}
                </View>
              ))}
              {listQ.hasNextPage && <Button variant="ghost" loading={listQ.isFetchingNextPage} onPress={() => listQ.fetchNextPage()}>{t('Aur dikhayein')}</Button>}
            </Card>
          )}
          <Text size="2xs" tone="muted">{t('Profit = online orders ka Profit (courier, COD, packing ke baad) − Ads.')}</Text>
        </>
      )}
      <AdEntrySheet open={!!form} entry={form === 'new' ? null : form} setup={setupQ.data} onClose={() => setForm(null)} onSaved={() => { setForm(null); refreshAll(); }} />
    </Screen>
  );
}

function AdEntrySheet({ open, entry, setup, onClose, onSaved }: { open: boolean; entry: AdEntry | null; setup?: AdsSetup; onClose: () => void; onSaved: () => void }) {
  const th = useTheme();
  const [day, setDay] = useState(businessDayKey());
  const [platform, setPlatform] = useState<AdPlatform>('META');
  const [amount, setAmount] = useState<number | null>(null);
  const [campaign, setCampaign] = useState('');
  const [channelId, setChannelId] = useState('');
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([]);
  const [orders, setOrders] = useState('');
  const [picking, setPicking] = useState(false);
  useEffect(() => {
    if (!open) return;
    setDay(entry?.day ?? businessDayKey()); setPlatform(entry?.platform ?? 'META'); setAmount(entry ? entry.amount : null); setCampaign(entry?.campaign ?? '');
    setChannelId(entry?.integrationId ?? ''); setProducts(entry?.products ?? []); setOrders(entry?.orders != null ? String(entry.orders) : ''); setPicking(false);
  }, [open, entry?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = useMutation({
    mutationFn: () => {
      const body = { day, platform, amount: amount ?? 0, campaign: campaign.trim() || null, integrationId: channelId || null, productIds: products.map((p) => p.id), orders: orders.trim() === '' ? null : Number(orders) };
      return entry ? adsApi.update(entry.id, body) : adsApi.create(body);
    },
    onSuccess: () => { toast.success(entry ? t('Entry badal gayi') : t('Ads kharcha likh diya')); onSaved(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Save nahi hua'))),
  });
  const date = new Date(`${day}T12:00:00`);
  return (
    <Sheet open={open} onClose={onClose} height={0.9} title={entry ? t('Ads kharcha badlein') : t('Aaj ka kharcha')}
      footer={<Button fullWidth size="lg" loading={save.isPending} disabled={!(amount && amount > 0)} onPress={() => save.mutate()}>{t('Save')}</Button>}>
      {picking ? (
        <View style={{ gap: th.space(3) }}>
          <ProductPicker onPick={(p) => { if (!products.some((x) => x.id === p.productId)) setProducts([...products, { id: p.productId, name: p.label }]); setPicking(false); }} />
          <Button variant="ghost" onPress={() => setPicking(false)}>{t('Wapas')}</Button>
        </View>
      ) : (
        <View style={{ gap: th.space(3) }}>
          <DatePicker label={t('Din')} value={date} onChange={(d: Date) => setDay(businessDayKey(d))} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
            {AD_PLATFORMS.map((p) => (
              <PressableScale key={p} onPress={() => setPlatform(p)} haptic="select"
                style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2), padding: th.space(2), borderRadius: th.radius('md'), width: '48%',
                  borderWidth: platform === p ? 2 : 1, borderColor: platform === p ? th.colors.brand.solid : th.colors.border, backgroundColor: platform === p ? th.colors.brand.soft : th.colors.surface }}>
                <BrandLogo name={PLATFORM_BRAND[p]} size={24} />
                <Text size="xs" weight="semibold" numberOfLines={1} style={{ flex: 1 }}>{t(AD_PLATFORM_LABEL[p])}</Text>
              </PressableScale>
            ))}
          </View>
          <MoneyInput label={t('Kitna lagaya (Rs)')} value={amount} onChangeValue={setAmount} />
          <Input label={t('Campaign (optional)')} value={campaign} onChangeText={setCampaign} maxLength={120} />
          {(setup?.channels.length ?? 0) > 0 && (
            <View style={{ gap: th.space(1.5) }}>
              <Text size="sm" weight="semibold" tone="secondary">{t('Channel (optional)')}</Text>
              <ChipGroup wrap value={channelId} onChange={setChannelId} options={[{ value: '', label: t('Koi nahi') }, ...setup!.channels.map((c) => ({ value: c.id, label: c.name }))]} />
            </View>
          )}
          <View style={{ gap: th.space(1.5) }}>
            <Text size="sm" weight="semibold" tone="secondary">{t('Products (optional)')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(1.5) }}>
              {products.map((p) => <Chip key={p.id} label={p.name} icon={X} selected onPress={() => setProducts(products.filter((x) => x.id !== p.id))} />)}
              <Chip label={t('Product jorein')} icon={Plus} onPress={() => setPicking(true)} />
            </View>
          </View>
          <Input label={t('Ads manager ke orders (optional)')} value={orders} onChangeText={setOrders} keyboardType="number-pad" ltr />
          <Text size="2xs" tone="muted">{setup?.postExpenses ? t('Ye kharcha Expenses me bhi likha jayega.') : t('Ye sirf ROAS ke liye hai — Expenses me nahi jayega.')}</Text>
        </View>
      )}
    </Sheet>
  );
}
