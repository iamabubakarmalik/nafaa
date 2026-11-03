/**
 * Raw materials (web IngredientsPage): store value, what is running low and
 * the shopping list for the supplier (WhatsApp); the stock list with goods
 * received, waste and counted corrections (swipe a row); recipe costing at
 * today's rates; the movement record; and analytics. Needs the server; the
 * last loaded list stays readable offline.
 */

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowDownToLine, BarChart3, Boxes, Copy, Eye, EyeOff, History, ListChecks, MessageCircle, Pencil, Plus, Scale, Snowflake, Tags, Trash2, Wheat } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Linking, View } from 'react-native';
import { fmtQty, isLow, isOut, levelOf, orderQty, rawStats } from '@nafaa/core/bakery';
import { apiErrorMessage } from '@/core/api/errors';
import { useAuthStore } from '@/core/auth/store';
import { formatMoney } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { onlineNeededText } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, Card, ChipGroup, confirm, EmptyState, ListRow, ListTemplate, Row, Segmented, StatTile, SwipeRow, Text, toast, useDebouncedValue, useTheme, type SwipeAction } from '@/design';
import { copyText, openWhatsApp } from '@/modules/customers/lib/contact';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { useCostMask } from '@/modules/sales/lib/mask';
import { PERIOD_PRESETS, usePeriod } from '@/modules/sales/lib/period';
import { ingredientsApi, type Ingredient } from '../api';
import { IngredientFormSheet, MovementRecord, RawAnalytics, RawHistorySheet, RawStockSheet, RecipeCosting, useRecipes, type RecipeFilter, type StockMode } from '../components/Ingredients';
import { RAW_CATEGORIES, RAW_KEY, rawCategoryOf, refreshBakery } from '../meta';

type Tab = 'stock' | 'recipes' | 'record' | 'analytics';
type State = 'all' | 'low' | 'out' | 'critical' | 'fridge' | 'hidden';
const STATES: Array<{ value: State; label: string }> = [
  { value: 'all', label: msg('Sab') }, { value: 'low', label: msg('Kam ho gaya') }, { value: 'out', label: msg('Khatam') },
  { value: 'critical', label: msg('Zaroori') }, { value: 'fridge', label: msg('Fridge wale') }, { value: 'hidden', label: msg('Hataye hue') },
];
const RECIPE_FILTERS: Array<{ value: RecipeFilter; label: string }> = [
  { value: 'all', label: msg('Sab recipes') }, { value: 'low', label: msg('Kam profit (20% se kam)') }, { value: 'off', label: msg('Product par purani cost') }, { value: 'missing', label: msg('Jin ka saamaan nahi mila') },
];

export function IngredientsScreen() {
  const th = useTheme();
  const can = usePermission();
  const online = useOnlineStatus();
  const shop = useAuthStore((s) => s.tenant?.name) ?? t('Bakery');
  const canManage = can(P.BAKERY_INGREDIENTS_MANAGE);
  const { cost, costHidden } = useCostMask();
  const [tab, setTab] = useState<Tab>('stock');
  const [state, setState] = useState<State>('all');
  const [category, setCategory] = useState('');
  const [recipeFilter, setRecipeFilter] = useState<RecipeFilter>('all');
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search.trim().toLowerCase(), 200);
  const rec = usePeriod('month');
  const [form, setForm] = useState<{ item: Ingredient | null } | null>(null);
  const [stockOn, setStockOn] = useState<{ item: Ingredient; mode: StockMode } | null>(null);
  const [history, setHistory] = useState<Ingredient | null>(null);

  const listQ = useQuery({ queryKey: [RAW_KEY, 'list', state === 'hidden'], queryFn: () => ingredientsApi.list(state === 'hidden' ? { active: 'false' } : {}) });
  const recipesQ = useRecipes();
  const all = listQ.data ?? [];
  const live = state === 'hidden' ? all : all.filter((i) => i.isActive !== false);
  const stats = useMemo(() => rawStats(state === 'hidden' ? [] : live), [live, state]);
  const shown = useMemo(() => live
    .filter((i) => state === 'hidden' || state === 'all' || (state === 'low' ? isLow(i) : state === 'out' ? isOut(i) : state === 'critical' ? i.isCritical : i.requiresRefrigeration))
    .filter((i) => !category || i.category === category)
    .filter((i) => !q || [i.name, i.brand, i.supplierName, i.lastVendorName, i.code].some((v) => v?.toLowerCase().includes(q)))
    .sort((a, b) => Number(isOut(b)) - Number(isOut(a)) || Number(isLow(b)) - Number(isLow(a)) || Number(b.isCritical) - Number(a.isCritical) || a.name.localeCompare(b.name)), [live, state, category, q]);
  const recipes = recipesQ.data?.totals;
  const orderText = [`🛒 *${shop}* — ${t('saamaan ki list')}`, '', ...stats.need.map((i, n) => `${n + 1}. ${i.name} — ${fmtQty(orderQty(i))} ${i.unit}`)].join('\n');

  const guard = (run: () => void) => { if (!online) { toast.warning(onlineNeededText('production')); return; } run(); };
  const toggleHidden = (i: Ingredient) => guard(async () => {
    if (i.isActive !== false && !(await confirm({ title: t('"{{name}}" list se hatayein?', { name: i.name }), message: t('Record aur recipes rehti hain.'), tone: 'danger', confirmLabel: t('Hatayein') }))) return;
    try {
      const r = i.isActive === false ? await ingredientsApi.update(i.id, { isActive: true }) : await ingredientsApi.remove(i.id);
      toast.success(r.isActive ? t('{{name}} wapas aa gaya', { name: i.name }) : t('{{name}} hata diya — record rehta hai', { name: i.name }));
      refreshBakery([RAW_KEY]);
    } catch (e) { toast.error(apiErrorMessage(e, t('Nahi hua'))); }
  });

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Boxes} label={t('Gudaam ki qeemat')} loading={listQ.isLoading} value={costHidden ? '••••' : cost(stats.value)} hint={t('{{total}} cheezein', { total: stats.total })} onPress={() => { setTab('stock'); setState('all'); }} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={AlertTriangle} tone="warning" label={t('Kam ho gaya')} loading={listQ.isLoading} value={String(stats.low)} hint={t('Had se neeche')} onPress={() => { setTab('stock'); setState('low'); }} />
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Trash2} tone={stats.out ? 'danger' : 'neutral'} label={t('Khatam')} loading={listQ.isLoading} value={String(stats.out)} hint={stats.critical ? t('{{critical}} zaroori', { critical: stats.critical }) : t('Stock 0')} onPress={() => { setTab('stock'); setState('out'); }} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Tags} tone="accent" label={t('Kam profit')} value={String(recipes?.lowMargin ?? '—')} hint={t('Recipe 20% se kam')} onPress={() => { setTab('recipes'); setRecipeFilter('low'); }} />
      </Row>
      <Segmented value={tab} onChange={setTab} options={[
        { value: 'stock', label: t('Stock'), icon: Boxes }, { value: 'recipes', label: t('Recipe aur cost'), icon: Wheat },
        { value: 'record', label: t('Record'), icon: ListChecks }, { value: 'analytics', label: t('Analytics'), icon: BarChart3 },
      ]} />
      {tab === 'stock' && stats.need.length > 0 && state !== 'hidden' && (
        <Card tone="warning" footer={<Row gap={2}>
          <Button size="sm" variant="secondary" icon={Copy} onPress={() => void copyText(orderText)}>{t('List copy')}</Button>
          <Button size="sm" variant="success" icon={MessageCircle} onPress={() => void Linking.openURL(`https://wa.me/?text=${encodeURIComponent(orderText)}`)}>{t('WhatsApp')}</Button>
        </Row>}>
          <Text size="sm">{t('{{count}} cheezein mangwani hain', { count: stats.need.length })}{costHidden ? '' : ` — ${t('andazan')} ${formatMoney(stats.orderCost)}`}{stats.critical ? ` · ${t('{{critical}} zaroori cheez', { critical: stats.critical })}` : ''}</Text>
        </Card>
      )}
      {tab === 'stock' && (
        <>
          <ChipGroup value={state} onChange={setState} style={{ marginHorizontal: -th.space(4) }} options={STATES.map((s) => ({ value: s.value, label: t(s.label) }))} />
          <ChipGroup value={category} onChange={setCategory} style={{ marginHorizontal: -th.space(4) }} options={[{ value: '', label: t('Sab types') }, ...RAW_CATEGORIES.map((c) => ({ value: c.value, label: `${c.emoji} ${t(c.label)}` }))]} />
          <CachedNote query={listQ} />
        </>
      )}
      {tab === 'recipes' && (
        <>
          <ChipGroup value={recipeFilter} onChange={setRecipeFilter} style={{ marginHorizontal: -th.space(4) }} options={RECIPE_FILTERS.map((f) => ({ value: f.value, label: t(f.label) }))} />
          <RecipeCosting search={search} filter={recipeFilter} />
        </>
      )}
      {(tab === 'record' || tab === 'analytics') && (
        <ChipGroup value={rec.preset} onChange={(v) => rec.setPreset(v as typeof rec.preset)} style={{ marginHorizontal: -th.space(4) }} options={PERIOD_PRESETS.filter((p) => p.value !== 'all').map((p) => ({ value: p.value, label: t(p.label) }))} />
      )}
      {tab === 'record' && <MovementRecord period={rec.period} search={search} />}
      {tab === 'analytics' && <RawAnalytics period={rec.period} />}
    </View>
  );

  return (
    <>
      <ListTemplate<Ingredient>
        title={t('Raw material')}
        grouped={false}
        search={tab !== 'analytics' ? { value: search, onChange: setSearch, placeholder: tab === 'recipes' ? t('Product ya saamaan…') : t('Saamaan, brand, supplier…') } : undefined}
        summary={header}
        data={tab === 'stock' ? shown : []}
        loading={tab === 'stock' && listQ.isLoading}
        error={tab === 'stock' && !listQ.data ? listQ.error : undefined}
        onRetry={() => void listQ.refetch()}
        refreshing={listQ.isRefetching}
        onRefresh={() => { void listQ.refetch(); void recipesQ.refetch(); }}
        keyExtractor={(i) => i.id}
        renderItem={({ item: i }) => {
          const out = isOut(i);
          const low = isLow(i);
          const hidden = i.isActive === false;
          const cat = rawCategoryOf(i.category);
          const usedIn = recipesQ.data?.usedIn[i.id] ?? 0;
          const end: SwipeAction[] = canManage && !hidden ? [
            { icon: ArrowDownToLine, label: t('Maal aaya'), tone: 'success', onPress: () => guard(() => setStockOn({ item: i, mode: 'purchase' })) },
            { icon: Trash2, label: t('Waste hua'), tone: 'danger', onPress: () => guard(() => setStockOn({ item: i, mode: 'waste' })) },
            { icon: Scale, label: t('Gin kar theek'), tone: 'brand', onPress: () => guard(() => setStockOn({ item: i, mode: 'adjust' })) },
          ] : [];
          const start: SwipeAction[] = [
            { icon: History, label: t('Record'), tone: 'brand', onPress: () => setHistory(i) },
            ...(canManage ? [{ icon: Pencil, label: t('Badlein'), tone: 'brand' as const, onPress: () => guard(() => setForm({ item: i })) },
              { icon: hidden ? Eye : EyeOff, label: hidden ? t('Wapas layein') : t('Hatayein'), tone: 'danger' as const, onPress: () => toggleHidden(i) }] : []),
            ...(i.supplierPhone ? [{ icon: MessageCircle, label: t('Supplier'), tone: 'success' as const, onPress: () => openWhatsApp(i.supplierPhone, `${t('Assalam o alaikum')}, ${i.name} — ${fmtQty(orderQty(i))} ${i.unit}`) }] : []),
          ];
          return (
            <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border, opacity: hidden ? 0.6 : 1 }}>
              <SwipeRow start={start} end={end}>
                <ListRow leading={<Text size="xl">{cat.emoji}</Text>}
                  title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{i.name}</Text>
                    {i.isCritical && <Badge tone="danger">{t('Zaroori')}</Badge>}
                    {i.requiresRefrigeration && <Snowflake size={14} color={th.colors.info.text} />}
                    {out && <Badge tone="danger">{t('Khatam')}</Badge>}
                    {low && <Badge tone="warning">{t('Kam ho gaya')}</Badge>}</Row>}
                  subtitle={`${costHidden ? '••••' : cost(i.costPerUnit)} / ${i.unit}${i.supplierName ? ` · ${i.supplierName}` : ''}${levelOf(i) ? t(' · had {{fmtQty}}', { fmtQty: fmtQty(levelOf(i)) }) : ''}${usedIn ? t(' · {{usedIn}} recipes me', { usedIn }) : ''}`}
                  trailing={<View style={{ alignItems: 'flex-end' }}>
                    <Text weight="bold" tone={out ? 'danger' : low ? 'warning' : 'default'} ltr>{`${fmtQty(i.currentStock)} ${i.unit}`}</Text>
                    {!costHidden && <Text size="2xs" tone="muted" ltr>{cost(Math.max(i.currentStock, 0) * i.costPerUnit)}</Text>}
                  </View>}
                  onPress={() => setHistory(i)} />
              </SwipeRow>
            </View>
          );
        }}
        empty={tab === 'stock' ? <EmptyState icon={Wheat} title={q || state !== 'all' || category ? t('Is filter me kuch nahi') : t('Abhi koi saamaan nahi')}
          message={t('Maida, cheeni, makhan daalein — phir recipe me lag sakenge aur khatam hone par yaad dilaye ga.')} /> : undefined}
        fab={canManage && tab === 'stock' ? { icon: Plus, label: t('Naya saamaan'), onPress: () => guard(() => setForm({ item: null })) } : undefined}
      />
      {form && <IngredientFormSheet item={form.item} onClose={() => setForm(null)} />}
      {stockOn && <RawStockSheet item={stockOn.item} mode={stockOn.mode} onClose={() => setStockOn(null)} />}
      {history && <RawHistorySheet item={history} onClose={() => setHistory(null)} />}
    </>
  );
}
