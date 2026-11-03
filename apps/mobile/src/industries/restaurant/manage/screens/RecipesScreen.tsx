/**
 * Recipes (web RecipesPage): dishes with their recipe, plate cost and food
 * cost; what the kitchen can still make from this branch's stock (with the
 * "86" switch); and how much raw material recipes used next to purchases.
 * Re-costs every recipe at today's rates. Needs the server for changes; the
 * last lists stay readable offline.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { BookOpen, ChefHat, CircleSlash, Clock, Flame, Pencil, Plus, Power, RefreshCw, Trash2, TrendingDown, Truck, Wheat } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { recipeTotals, type RecipeDraft } from '@nafaa/core/restaurant';
import { apiErrorMessage } from '@/core/api/errors';
import { formatPKR } from '@/core/format';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { onlineNeededText } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import {
  Badge, Button, Card, ChipGroup, EmptyState, IconButton, ListRow, Row, Screen, SearchBar, Segmented, Sheet, Skeleton, StatTile, Text, confirm, toast, useDebouncedValue, useTheme,
} from '@/design';
import { ProductThumb } from '@/modules/inventory/components/ProductThumb';
import { useCostMask } from '@/modules/inventory/lib/shared';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { boardApi, recipesApi, switchDishes, type Cookability, type MenuItemFull, type RecipeRow } from '../api';
import { RecipeEditor, RecipeSteps, recipeFromApi, recipeInput, recipeProblemText } from '../components/RecipeEditor';
import { MENU_KEYS, fmt, foodTone, offLabel, refreshMenu } from '../meta';

type Tab = 'recipes' | 'cook' | 'usage';
interface Target { menuItemId: string; name: string; price: number; productId: string }

const KEYS = [MENU_KEYS.recipes, MENU_KEYS.cook, MENU_KEYS.usage, MENU_KEYS.board, MENU_KEYS.items];

export function RecipesScreen() {
  const th = useTheme();
  const can = usePermission();
  const { cost, costHidden } = useCostMask();
  const kitchen = can(P.RESTAURANT_KITCHEN_MANAGE);
  const menu = can(P.RESTAURANT_MENU_MANAGE);
  const buy = can(P.PURCHASES_CREATE);
  const online = useOnlineStatus();
  const [tab, setTab] = useState<Tab>('recipes');
  const [search, setSearch] = useState('');
  const term = useDebouncedValue(search.trim().toLowerCase(), 150);
  const [categoryId, setCategoryId] = useState('all');
  const [days, setDays] = useState('7');
  const [editing, setEditing] = useState<Target | null>(null);
  const [picking, setPicking] = useState(false);

  const recipesQ = useQuery({ queryKey: [MENU_KEYS.recipes], queryFn: () => recipesApi.list() });
  const cookQ = useQuery({ queryKey: [MENU_KEYS.cook], queryFn: () => recipesApi.cookability() });
  const menuQ = useQuery({ queryKey: [MENU_KEYS.items, 'recipes-page'], queryFn: () => boardApi.list(), retry: false });
  const usageQ = useQuery({ queryKey: [MENU_KEYS.usage, days], queryFn: () => recipesApi.usage(Number(days)), enabled: tab === 'usage' });
  const refresh = () => refreshMenu(...KEYS);
  const guard = (run: () => void) => { if (!online) { toast.warning(onlineNeededText('restaurantOrders')); return; } run(); };

  const recipes = recipesQ.data ?? [];
  const cookBy = useMemo(() => new Map((cookQ.data?.rows ?? []).map((r) => [r.menuItemId, r])), [cookQ.data]);
  const missing = useMemo(() => (menuQ.data ?? []).filter((m) => !m.recipe && m.product?.isActive !== false && !m.product?.isRawMaterial && m.product?.productType !== 'BOUGHT'), [menuQ.data]);
  const categories = useMemo(() => {
    const m = new Map<string, { id: string; name: string }>();
    for (const r of recipes) if (r.menuItem.product.category) m.set(r.menuItem.product.category.id, r.menuItem.product.category);
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [recipes]);
  const shown = recipes.filter((r) => (categoryId === 'all' || r.menuItem.product.category?.id === categoryId)
    && (!term || r.menuItem.product.name.toLowerCase().includes(term) || r.ingredients.some((i) => String(i.ingredient?.name ?? '').toLowerCase().includes(term))));
  const cookRows = (cookQ.data?.rows ?? []).filter((r) => !term || r.name.toLowerCase().includes(term));
  const usageRows = (usageQ.data?.rows ?? []).filter((r) => !term || r.name.toLowerCase().includes(term));
  const priced = (cookQ.data?.rows ?? []).filter((r) => r.price > 0 && r.cost > 0);
  const avgFood = priced.length ? priced.reduce((s, r) => s + r.foodCostPct, 0) / priced.length : null;
  const unitProblems = (cookQ.data?.rows ?? []).filter((r) => r.unitProblems?.length);
  const target = (m: MenuItemFull): Target => ({ menuItemId: m.id, name: m.product?.name ?? t('Dish'), price: Number(m.product?.price) || 0, productId: m.product?.id ?? '' });

  const refreshCosts = useMutation({
    mutationFn: () => recipesApi.refreshCosts(),
    onSuccess: (r) => { toast.success(r.updated ? t('{{updated}} dish ki cost aaj ke rate par aa gayi', { updated: r.updated }) : t('Sab cost pehle se theek thi')); refresh(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Cost taaza nahi hui'))),
  });
  const setAvailable = useMutation({
    mutationFn: ({ r, on }: { r: Cookability; on: boolean }) => switchDishes([{ menuItemId: r.menuItemId, offHere: r.offHere }], on),
    onSuccess: (_r, v) => { toast.success(v.on ? t('Chalu') : t('Aaj ke liye band (86) — kal khud chalu ho jayegi')); refresh(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi badla'))),
  });

  return (
    <>
      <Screen title={t('Recipes')} subtitle={t('Saamaan, plate ki cost aur stock')} onRefresh={() => { void recipesQ.refetch(); void cookQ.refetch(); void usageQ.refetch(); }} refreshing={recipesQ.isRefetching}
        actions={<Row gap={1}>
          {kitchen && <IconButton icon={RefreshCw} label={t('Rates taaza karein')} onPress={() => guard(() => refreshCosts.mutate())} />}
          {kitchen && <IconButton icon={Plus} label={t('Nayi recipe')} onPress={() => guard(() => setPicking(true))} />}
        </Row>}>
        <View style={{ gap: th.space(3) }}>
          <Row gap={2}>
            <StatTile style={{ flex: 1 }} icon={CircleSlash} tone="danger" label={t('Ban nahi sakti')} loading={cookQ.isLoading} value={String(cookQ.data?.outOfStock ?? 0)} hint={t('Saamaan khatam · dabayein')} onPress={() => setTab('cook')} />
            <StatTile style={{ flex: 1 }} icon={Clock} tone="warning" label={t('Thori bachi')} loading={cookQ.isLoading} value={String(cookQ.data?.running ?? 0)} hint={t('5 plate ya kam')} onPress={() => setTab('cook')} />
          </Row>
          <Row gap={2}>
            <StatTile style={{ flex: 1 }} icon={BookOpen} tone="accent" label={t('Recipe nahi')} loading={cookQ.isLoading} value={String(cookQ.data?.withoutRecipe ?? missing.length)} hint={t('Bikne par stock nahi katta')} onPress={kitchen ? () => guard(() => setPicking(true)) : undefined} />
            <StatTile style={{ flex: 1 }} icon={Flame} tone="warning" label={t('Ausat food cost')} loading={cookQ.isLoading} value={costHidden ? '••••' : avgFood === null ? '—' : `${avgFood.toFixed(1)}%`}
              hint={costHidden ? undefined : t('Food cost 45%+') + `: ${priced.filter((r) => r.foodCostPct > 45).length}`} />
          </Row>
          {unitProblems.length > 0 && (
            <Card tone="warning"><Text size="sm">{t('{{value}} ki recipe me unit stock se nahi milti ({{value2}}) — saamaan sahi nahi katta. Recipe khol kar unit theek karein.', { value: unitProblems.map((r) => r.name).slice(0, 5).join(', '), value2: unitProblems.flatMap((r) => r.unitProblems ?? []).slice(0, 3).join(', ') })}</Text></Card>
          )}
          <Segmented value={tab} onChange={setTab} options={[
            { value: 'recipes', label: t('Recipes'), icon: BookOpen }, { value: 'cook', label: t('Ban sakti hai'), icon: ChefHat }, { value: 'usage', label: t('Saamaan ka istemal'), icon: Wheat },
          ]} />
          <SearchBar value={search} onChangeText={setSearch} placeholder={t('Dish ya saamaan ka naam…')} />
          {tab === 'recipes' && categories.length > 1 && (
            <ChipGroup value={categoryId} onChange={setCategoryId} style={{ marginHorizontal: -th.space(4) }} options={[{ value: 'all', label: t('Sab category') }, ...categories.map((c) => ({ value: c.id, label: c.name }))]} />
          )}
          {tab === 'usage' && <ChipGroup value={days} onChange={setDays} options={[{ value: '1', label: t('Aaj') }, { value: '7', label: t('7 din') }, { value: '30', label: t('30 din') }, { value: '90', label: t('90 din') }]} />}
          <CachedNote query={tab === 'usage' ? usageQ : tab === 'cook' ? cookQ : recipesQ} />

          {tab === 'recipes' && (
            <>
              {missing.length > 0 && kitchen && (
                <Card tone="info" title={t('{{count}} dish ki recipe nahi — bikne par saamaan stock se nahi katta', { count: missing.length })}>
                  <Row gap={1.5} wrap>
                    {missing.slice(0, 12).map((m) => <Button key={m.id} size="sm" variant="secondary" icon={Plus} onPress={() => guard(() => setEditing(target(m)))}>{m.product?.name ?? ''}</Button>)}
                    {missing.length > 12 && <Button size="sm" variant="link" onPress={() => guard(() => setPicking(true))}>{t('+{{value}} aur', { value: missing.length - 12 })}</Button>}
                  </Row>
                </Card>
              )}
              {recipesQ.isLoading ? <Skeleton height={200} /> : !shown.length ? (
                <EmptyState icon={BookOpen} title={recipes.length ? t('Is filter me koi recipe nahi') : t('Abhi koi recipe nahi')}
                  message={t('Recipe se dish bikne par chicken, chawal, oil stock se katta hai aur har plate ki cost aur profit sahi aata hai.')}
                  action={kitchen && !recipes.length ? <Button icon={Plus} onPress={() => guard(() => setPicking(true))}>{t('Pehli recipe')}</Button> : undefined} />
              ) : (
                <Card flush>
                  {shown.map((r, i) => <RecipeRowView key={r.id} r={r} last={i === shown.length - 1} cook={cookBy.get(r.menuItemId)} cost={cost} costHidden={costHidden} canEdit={kitchen}
                    onEdit={() => guard(() => setEditing({ menuItemId: r.menuItemId, name: r.menuItem.product.name, price: Number(r.menuItem.product.price) || 0, productId: r.menuItem.product.id }))} />)}
                </Card>
              )}
            </>
          )}

          {tab === 'cook' && (cookQ.isLoading ? <Skeleton height={200} /> : !cookRows.length ? (
            <EmptyState icon={ChefHat} title={t('Koi recipe nahi — pehle dishes ki recipe banayein')} />
          ) : (
            <Card flush>
              {cookRows.map((r, i) => {
                const out = r.canMake === 0;
                return (
                  <View key={r.recipeId} style={{ padding: th.space(3), gap: th.space(2), borderBottomWidth: i < cookRows.length - 1 ? 1 : 0, borderBottomColor: th.colors.divider, backgroundColor: out ? th.colors.danger.soft : undefined }}>
                    <Row gap={3}>
                      <View style={{ width: 56, paddingVertical: 6, borderRadius: th.radius('lg'), alignItems: 'center', backgroundColor: out ? th.colors.danger.solid : r.canMake !== null && r.canMake <= 5 ? th.colors.warning.soft : th.colors.surfaceMuted }}>
                        <Text weight="bold" ltr color={out ? th.colors.danger.onSolid : undefined}>{r.canMake ?? '—'}</Text>
                        <Text size="2xs" color={out ? th.colors.danger.onSolid : undefined}>{t('plate')}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text weight="semibold" numberOfLines={1} onPress={() => r.productId && router.push(`/products/${r.productId}` as never)}>{r.name}</Text>
                        <Text size="xs" tone={out ? 'danger' : 'secondary'}>
                          {out ? `${t('Khatam:')} ${r.missing.map((m) => m.name).join(', ') || r.blocker?.name}`
                            : r.blocker ? t('Pehle {{name}} khatam hoga · {{have}} {{unit}} hai, plate me {{need}}', { name: r.blocker.name, have: fmt(r.blocker.have), unit: r.blocker.unit, need: fmt(r.blocker.need) })
                              : t('Sab saamaan marzi ka hai')}
                        </Text>
                      </View>
                    </Row>
                    <Row gap={2} wrap>
                      {out && buy && <Button size="sm" variant="secondary" icon={Truck} onPress={() => router.push('/purchases/new' as never)}>{t('Purchase')}</Button>}
                      {menu ? (
                        <Button size="sm" variant={r.isAvailable ? (out ? 'soft' : 'secondary') : 'danger'} icon={Power} loading={setAvailable.isPending && setAvailable.variables?.r.recipeId === r.recipeId}
                          onPress={() => guard(() => setAvailable.mutate({ r, on: !r.isAvailable }))}>
                          {r.isAvailable ? (out ? t('Menu par — aaj band karein') : t('Menu par')) : r.offHere ? offLabel(r.offUntil) : t('Band (86)')}
                        </Button>
                      ) : <Badge tone={r.isAvailable ? 'success' : 'neutral'}>{r.isAvailable ? t('Menu par') : t('Band')}</Badge>}
                    </Row>
                  </View>
                );
              })}
            </Card>
          ))}

          {tab === 'usage' && (
            <>
              <Row gap={2}>
                <StatTile style={{ flex: 1 }} icon={Wheat} tone="warning" label={t('Recipe me laga · {{days}} din', { days })} loading={!usageQ.data} value={cost(usageQ.data?.totals.usedValue ?? 0)} hint={t('{{items}} cheezein', { items: usageQ.data?.totals.items ?? 0 })} />
                <StatTile style={{ flex: 1 }} icon={TrendingDown} tone="danger" label={t('2 din me khatam')} loading={!usageQ.data} value={String(usageQ.data?.totals.runningOut ?? 0)} hint={t('Isi raftaar par')} />
              </Row>
              {usageQ.isLoading ? <Skeleton height={200} /> : !usageRows.length ? <EmptyState icon={Wheat} title={t('Is period me recipe se koi saamaan nahi laga')} /> : (
                <Card flush>
                  {usageRows.map((r, i) => (
                    <ListRow key={r.productId} divider={i < usageRows.length - 1} title={r.name}
                      subtitle={`${t('Recipe me laga')} ${fmt(r.used)} ${r.unit} · ${t('Khareeda')} ${r.bought ? `${fmt(r.bought)} ${r.unit}` : '—'} · ${t('Roz')} ${fmt(r.perDay)}`}
                      trailing={<View style={{ alignItems: 'flex-end' }}>
                        <Text size="sm" weight="semibold" ltr tone={r.stock <= r.lowStockAlert ? 'danger' : 'default'}>{`${fmt(r.stock)} ${r.unit}`}</Text>
                        <Text size="xs" ltr tone={r.daysLeft !== null && r.daysLeft <= 2 ? 'danger' : 'muted'}>{r.daysLeft === null ? '—' : t('{{daysLeft}} din', { daysLeft: r.daysLeft })}</Text>
                        {!costHidden && <Text size="2xs" tone="muted" ltr>{formatPKR(r.usedValue)}</Text>}
                      </View>}
                      onPress={() => router.push(`/products/${r.productId}` as never)} />
                  ))}
                </Card>
              )}
              <Text size="xs" tone="muted">{t('"Recipe me laga" bikne wali dishes ki recipe se nikla saamaan hai. Stock ginti me farq ho to Stock adjustment se theek karein — wahan wajah ke saath record rehta hai.')}</Text>
            </>
          )}
        </View>
      </Screen>
      {editing && <RecipeSheet target={editing} canSave={kitchen} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />}
      {picking && <PickDishSheet dishes={missing} onClose={() => setPicking(false)} onPick={(m) => { setPicking(false); setEditing(target(m)); }} />}
    </>
  );
}

function RecipeRowView({ r, cook, cost, costHidden, canEdit, onEdit, last }: { r: RecipeRow; cook?: Cookability; cost: (n: number) => string; costHidden: boolean; canEdit: boolean; onEdit: () => void; last: boolean }) {
  const th = useTheme();
  const p = r.menuItem.product;
  return (
    <ListRow divider={!last} onPress={() => router.push(`/products/${p.id}` as never)}
      leading={<ProductThumb name={p.name} category={p.category?.name} url={p.images[0]?.url} size={40} />}
      title={<Row gap={1.5}><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{p.name}</Text>{!r.menuItem.isAvailable && <Badge tone="danger">{t('Band')}</Badge>}</Row>}
      subtitle={`${t('{{yieldQuantity}} plate', { yieldQuantity: fmt(r.yieldQuantity) })} · ${cost(cook?.cost ?? 0)}${!costHidden && cook?.price ? ` · ${cook.foodCostPct}%` : ''} · ${cook?.canMake == null ? '—' : t('{{canMake}} plate', { canMake: cook.canMake })}`}
      trailing={<Row gap={1}>
        {!costHidden && cook?.price ? <Badge tone={foodTone(cook.foodCostPct)}>{`${cook.foodCostPct}%`}</Badge> : null}
        {canEdit && <IconButton icon={Pencil} label={t('Badlein')} size="sm" variant="soft" onPress={onEdit} />}
      </Row>}
      style={{ paddingHorizontal: th.space(1) }} />
  );
}

function PickDishSheet({ dishes, onClose, onPick }: { dishes: MenuItemFull[]; onClose: () => void; onPick: (m: MenuItemFull) => void }) {
  const th = useTheme();
  const [q, setQ] = useState('');
  const term = q.trim().toLowerCase();
  const rows = dishes.filter((m) => !term || String(m.product?.name ?? '').toLowerCase().includes(term));
  return (
    <Sheet open onClose={onClose} title={t('Kis dish ki recipe?')} description={t('Yahan woh dishes hain jin ki recipe abhi nahi bani')} height={0.8}>
      <View style={{ gap: th.space(3) }}>
        <SearchBar value={q} onChangeText={setQ} placeholder={t('Dish ka naam…')} />
        {!rows.length ? <Text tone="muted" align="center">{dishes.length ? t('Koi dish nahi mili') : t('Har dish ki recipe ban chuki hai. Nayi dish menu me banayein.')}</Text> : (
          <Card flush>{rows.map((m, i) => <ListRow key={m.id} divider={i < rows.length - 1} title={m.product?.name ?? ''} subtitle={m.product?.category?.name ?? undefined} chevron onPress={() => onPick(m)} />)}</Card>
        )}
      </View>
    </Sheet>
  );
}

function RecipeSheet({ target, canSave, onClose, onSaved }: { target: Target; canSave: boolean; onClose: () => void; onSaved: () => void }) {
  const th = useTheme();
  const q = useQuery({ queryKey: ['restaurant-recipe', target.menuItemId], queryFn: () => recipesApi.getByMenuItem(target.menuItemId) });
  const dishQ = useQuery({ queryKey: ['restaurant-menu-item', target.menuItemId], queryFn: () => boardApi.getOne(target.menuItemId) });
  const sizes = (dishQ.data?.product?.variants ?? []).filter((v) => (v as { isActive?: boolean }).isActive !== false);
  const [draft, setDraft] = useState<RecipeDraft | null>(null);
  const [tried, setTried] = useState(false);
  useEffect(() => { if (q.isSuccess && !draft) setDraft(recipeFromApi(q.data)); }, [q.isSuccess, q.data, draft]);
  const problem = draft ? (draft.lines.length ? recipeProblemText(draft) : t('Kam se kam ek cheez recipe me daalein')) : null;
  const save = useMutation({
    mutationFn: () => recipesApi.upsert(recipeInput(target.menuItemId, draft!, dishQ.isSuccess ? sizes.map((v) => ({ id: v.id, name: v.name })) : undefined)),
    onSuccess: () => { toast.success(t('{{name}} ki recipe save — plate {{value}} Rs', { name: target.name, value: recipeTotals(draft!).perPlate.toFixed(0) })); onSaved(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Save nahi hui'))),
  });
  const remove = useMutation({
    mutationFn: () => recipesApi.remove(q.data!.id),
    onSuccess: () => { toast.success(t('Recipe hata di — ab is dish se saamaan nahi katega')); onSaved(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hati'))),
  });
  const submit = () => { setTried(true); if (!problem && canSave && !save.isPending) save.mutate(); };
  return (
    <Sheet open onClose={onClose} title={t('{{name}} — recipe', { name: target.name })} description={t('Gram, ml ya adad me likhein; stock kilo/litre me ho to khud badal jata hai')} height={0.95}
      footer={<View style={{ gap: th.space(2) }}>
        {tried && problem && <Text size="sm" tone="warning">{problem}</Text>}
        <Row gap={2}>
          {q.data && canSave && <IconButton icon={Trash2} label={t('Recipe hatayein')} variant="danger" size="lg"
            onPress={() => void confirm({ title: t('Recipe hatayein'), message: t('Recipe hata di — ab is dish se saamaan nahi katega'), tone: 'danger', confirmLabel: t('Haan, hatayein') }).then((ok) => ok && remove.mutate())} />}
          {canSave && <Button size="lg" style={{ flex: 1 }} loading={save.isPending} onPress={submit}>{t('Save karein')}</Button>}
        </Row>
      </View>}>
      {!draft ? <Skeleton height={280} /> : (
        <View style={{ gap: th.space(3) }}>
          {!canSave && <Card tone="warning"><Text size="sm">{t('Recipe badalne ke liye "Kitchen sambhalna" ki permission chahiye.')}</Text></Card>}
          <RecipeEditor value={draft} onChange={setDraft} price={target.price} dishProductId={target.productId} readOnly={!canSave}
            sizes={sizes.map((v) => ({ name: v.name, price: Number(v.price) || target.price }))} />
          <RecipeSteps value={draft} onChange={setDraft} readOnly={!canSave} />
        </View>
      )}
    </Sheet>
  );
}

