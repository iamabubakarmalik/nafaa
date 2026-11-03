/**
 * Today's rates and the day close of a meat shop (web MeatRatesPage). Rates:
 * every item's counter rate and restaurant rate in one list, changed together
 * each morning (chicken changes daily); saving works offline. Day close: per item
 * what was there in the morning, what came in, what was sold, cut and wasted, and
 * what is left with its cost value.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AlertTriangle, ClipboardList, Gauge, Save, Scale, Scissors, Trash2, Undo2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { bumpRate } from '@nafaa/core/industries/meat';
import { t } from '@/core/i18n';
import { enqueuePriceChange } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Button, Card, ChipGroup, EmptyState, ListRow, ListTemplate, MoneyInput, Row, Segmented, Text, toast, useTheme } from '@/design';
import { useCostMask } from '@/modules/sales/lib/mask';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { OfflineNote, errorText, todayKey } from '../../_shared/deskKit';
import { DayBar } from '../../_shared/farm/DayBar';
import { RowCard, StatRow } from '../../_shared/farm/ui';
import { meatProductsApi, type DaySheetRow } from '../api';
import { MEAT_KEYS, animalText, cutLabel, kg, refreshMeat } from '../meta';

interface Draft { price: number | null; wholesale: number | null }

export function MeatRatesScreen() {
  const th = useTheme();
  const canEdit = usePermission()(P.PRODUCTS_EDIT);
  const { cost } = useCostMask();
  const [tab, setTab] = useState<'rates' | 'close'>('rates');
  const [date, setDate] = useState(todayKey());
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saving, setSaving] = useState(false);
  const sheet = useQuery({ queryKey: [MEAT_KEYS.daySheet, date], queryFn: () => meatProductsApi.daySheet(date), placeholderData: (p) => p, refetchInterval: 120_000 });
  const today = useQuery({ queryKey: [MEAT_KEYS.daySheet, todayKey()], queryFn: () => meatProductsApi.daySheet(todayKey()), enabled: tab === 'rates' && date !== todayKey() });
  const rateRows = (date === todayKey() ? sheet.data : today.data)?.rows ?? [];
  const term = search.trim().toLowerCase();
  const match = (r: DaySheetRow) => !term || [r.name, animalText(r.animalType), cutLabel(r.cutCategory)].join(' ').toLowerCase().includes(term);
  const rows = useMemo(() => (tab === 'rates' ? rateRows : sheet.data?.rows ?? []).filter(match), [tab, rateRows, sheet.data, term]); // eslint-disable-line react-hooks/exhaustive-deps

  const changed = Object.entries(drafts).filter(([id, d]) => { const r = rateRows.find((x) => x.productId === id); return r && ((d.price ?? 0) !== r.price || (d.wholesale ?? 0) !== (r.wholesalePrice ?? 0)); });
  const bad = changed.some(([, d]) => !((d.price ?? 0) > 0) || (d.wholesale != null && !(d.wholesale > 0)));
  const draftOf = (r: DaySheetRow): Draft => drafts[r.productId] ?? { price: r.price, wholesale: r.wholesalePrice ?? null };
  const setDraft = (r: DaySheetRow, patch: Partial<Draft>) => setDrafts((all) => ({ ...all, [r.productId]: { ...draftOf(r), ...patch } }));
  const bump = (pctUp: number) => {
    const next = { ...drafts };
    for (const r of rows) { const d = draftOf(r); next[r.productId] = { price: bumpRate(d.price ?? r.price, pctUp), wholesale: d.wholesale ? bumpRate(d.wholesale, pctUp) : null }; }
    setDrafts(next);
  };
  const save = async () => {
    if (!changed.length || bad) return;
    setSaving(true);
    try {
      for (const [id, d] of changed) await enqueuePriceChange(id, { price: d.price ?? 0, wholesalePrice: d.wholesale ?? null });
      toast.success(t('{{n}} item ka rate badal gaya — POS par abhi se naya rate', { n: changed.length }));
      setDrafts({});
      refreshMeat([MEAT_KEYS.daySheet, 'inv', 'offline']);
    } catch (e) { toast.error(errorText(e, t('Rate save nahi hua'))); } finally { setSaving(false); }
  };
  const x = sheet.data?.totals;

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'rates', label: t('Aaj ka rate') }, { value: 'close', label: t('Din ka hisaab') }]} />
      {tab === 'close' && <DayBar value={date} onChange={setDate} />}
      <StatRow tiles={[
        { icon: Scale, tone: 'success', label: t('Aaj bika'), loading: sheet.isLoading, value: kg(x?.sold ?? 0) },
        { icon: Trash2, tone: (x?.waste ?? 0) > 0 ? 'warning' : 'neutral', label: t('Waste'), loading: sheet.isLoading, value: kg(x?.waste ?? 0) },
        { icon: ClipboardList, tone: 'info', label: t('Bacha'), loading: sheet.isLoading, value: kg(x?.closing ?? 0), hint: cost(x?.closingValue ?? 0) },
      ]} />
      {tab === 'rates' && canEdit && (
        <Card title={t('Sab ka rate ek saath')}>
          <ChipGroup wrap value="" onChange={(v) => bump(Number(v))} options={[-10, -5, -2, 2, 5, 10].map((p) => ({ value: String(p), label: `${p > 0 ? '+' : ''}${p}%` }))} />
          {changed.length > 0 && <Button variant="ghost" icon={Undo2} onPress={() => setDrafts({})}>{t('Badlav wapas')}</Button>}
        </Card>
      )}
      <Row gap={2}>
        <Button style={{ flex: 1 }} variant="secondary" icon={Trash2} onPress={() => router.push('/damage' as never)}>{t('Waste likhein')}</Button>
        <Button style={{ flex: 1 }} variant="secondary" icon={Gauge} onPress={() => router.push('/cash-register' as never)}>{t('Galla band')}</Button>
      </Row>
      <OfflineNote feature="meatDesk" />
      <CachedNote query={sheet} />
    </View>
  );

  return (
    <ListTemplate<DaySheetRow>
      title={tab === 'rates' ? t("Today's rates") : t('Din ka hisaab')}
      grouped={false}
      search={{ value: search, onChange: setSearch, placeholder: t('Item, janwar ya cut…') }}
      summary={header}
      data={rows}
      loading={sheet.isLoading}
      error={sheet.data ? null : sheet.error}
      onRetry={() => void sheet.refetch()}
      refreshing={sheet.isRefetching}
      onRefresh={() => void sheet.refetch()}
      keyExtractor={(r) => r.productId}
      renderItem={({ item: r }) => {
        const d = draftOf(r);
        const dirty = changed.some(([id]) => id === r.productId);
        return (
          <RowCard>
            {tab === 'rates' ? (
              <View style={{ padding: th.space(3), gap: th.space(2) }}>
                <Row justify="between" gap={2}>
                  <View style={{ flex: 1 }}><Text weight="semibold" numberOfLines={1}>{r.name}</Text><Text size="xs" tone="muted" numberOfLines={1}>{[animalText(r.animalType), cutLabel(r.cutCategory), `${t('Stock')} ${kg(r.now, r.unit)}`].filter(Boolean).join(' · ')}</Text></View>
                  {dirty && <Text size="xs" tone="brand" weight="semibold">{t('Badla')}</Text>}
                </Row>
                <Row gap={2}>
                  <View style={{ flex: 1 }}><MoneyInput label={t('Rate / kg')} value={d.price} onChangeValue={(v) => setDraft(r, { price: v })} disabled={!canEdit} /></View>
                  <View style={{ flex: 1 }}><MoneyInput label={t('Restaurant rate')} value={d.wholesale} onChangeValue={(v) => setDraft(r, { wholesale: v })} disabled={!canEdit} /></View>
                </Row>
                {!!r.costPrice && <Text size="2xs" tone="muted">{t('Cost')} {cost(r.costPrice)}</Text>}
              </View>
            ) : (
              <View style={{ padding: th.space(3), gap: 2 }}>
                <Text weight="semibold" numberOfLines={1}>{r.name}</Text>
                <Row gap={3} wrap>
                  <Text size="xs" tone="muted">{t('Subah')} {kg(r.opening, r.unit)}</Text>
                  <Text size="xs" tone="muted">{t('Aaya')} {kg(r.bought + r.madeIn + r.returned + r.otherIn, r.unit)}</Text>
                  <Text size="xs" tone="success">{t('Bika')} {kg(r.sold, r.unit)}</Text>
                  {r.cutOut > 0 && <Row gap={1}><Scissors size={11} color={th.colors.textMuted} /><Text size="xs" tone="muted">{kg(r.cutOut, r.unit)}</Text></Row>}
                  {(r.waste + r.otherOut) > 0 && <Row gap={1}><AlertTriangle size={11} color={th.colors.warning.text} /><Text size="xs" tone="warning">{kg(r.waste + r.otherOut, r.unit)}</Text></Row>}
                </Row>
                <Row justify="between"><Text size="sm" weight="semibold">{t('Bacha')} {kg(r.closing, r.unit)}</Text><Amount value={r.closingValue} size="sm" /></Row>
              </View>
            )}
          </RowCard>
        )}
      }
      empty={<EmptyState icon={Gauge} title={t('Abhi koi item nahi')} message={t('Meat ke items Products me jorein — phir yahan rate aur din ka hisaab aayega.')} />}
      fab={tab === 'rates' && canEdit && changed.length > 0 ? { icon: Save, label: t('Save ({{n}})', { n: changed.length }), onPress: () => { if (bad) toast.error(t('Rate likhein')); else if (!saving) void save(); } } : undefined}
    />
  );
}
