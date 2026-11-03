/**
 * Happy hours (web HappyHoursPage): automatic price cuts for a time window
 * in shop time, by day, date range, dishes, categories and order type, held
 * to the shop's discount limit. A tester prices dishes against the rules
 * running now. Changes need the server; the last list stays readable offline.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { BadgePercent, CalendarDays, CheckCircle2, CircleSlash, Copy, Gift, Pencil, Plus, Power, Search, ShieldAlert, Sparkles, Trash2, Zap } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { clock12, happyPercent, happyProblem, windowParts, type HappyProblem } from '@nafaa/core/restaurant';
import { apiErrorMessage } from '@/core/api/errors';
import { formatDate, formatPKR } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { onlineNeededText, useOfflineList, useOfflineManifest } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import {
  Amount, Badge, Button, Card, Chip, ChipGroup, DatePicker, EmptyState, IconButton, Input, ListRow, ListTemplate, Row, SearchBar, Segmented, Select, Sheet,
  StatTile, Switch, Text, confirm, toast, useDebouncedValue, useTheme,
} from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { happyQuote, type OrderMode } from '../../api';
import { boardApi, happyHoursApi, type HappyDiscountType, type HappyHourInput, type HappyHourRule } from '../api';
import { DAYS, MENU_KEYS, MODE_OPTIONS, daysLabel, orderModeLabel, refreshMenu } from '../meta';

type Status = 'all' | 'live' | 'on' | 'off';

const TYPES: Array<{ value: HappyDiscountType; label: string; hint: string; icon: typeof BadgePercent }> = [
  { value: 'PERCENTAGE', label: msg('Percent off'), hint: msg('Maslan 20% kam'), icon: BadgePercent },
  { value: 'FIXED', label: msg('Har plate par Rs kam'), hint: msg('Maslan 100 Rs fi plate'), icon: Sparkles },
  { value: 'BUY_ONE_GET_ONE', label: msg('Ek ke saath ek'), hint: msg('Do lo, ek ke paise'), icon: Gift },
];

const offText = (r: Pick<HappyHourRule, 'discountType' | 'discountValue'>) =>
  r.discountType === 'PERCENTAGE' ? t('{{discountValue}}% off', { discountValue: r.discountValue })
    : r.discountType === 'FIXED' ? t('{{discountValue}} off fi plate', { discountValue: formatPKR(r.discountValue) }) : t('Ek ke saath ek');

const blank = (): HappyHourInput => ({ name: '', discountType: 'PERCENTAGE', discountValue: 10, startTime: '15:00', endTime: '18:00', daysOfWeek: [], categoryIds: [], productIds: [], orderModes: [], isActive: true });
const inputOf = (r: HappyHourRule): HappyHourInput => ({
  name: r.name, description: r.description ?? undefined, discountType: r.discountType, discountValue: r.discountValue, startTime: r.startTime, endTime: r.endTime,
  daysOfWeek: r.daysOfWeek, validFrom: r.validFrom?.slice(0, 10), validTo: r.validTo?.slice(0, 10), categoryIds: r.categoryIds, productIds: r.productIds,
  minOrderAmount: r.minOrderAmount ?? undefined, maxDiscount: r.maxDiscount ?? undefined, orderModes: r.orderModes, isActive: r.isActive,
});

const PROBLEM: Record<Exclude<HappyProblem, null>, string> = {
  name: msg('Naam likhein'), time: msg('Waqt sahi likhein'), sameTime: msg('Shuru aur khatam ka waqt ek jaisa nahi ho sakta'),
  percent: msg('Percent 1 se 100 ke beech likhein'), fixed: msg('Har plate par kitne rupay kam — likhein'),
  dates: msg('"Kab tak" ki tareekh "kab se" se pehle hai'), scope: msg('Category ya dish chunein, ya "Poora menu" rakhein'),
};

/** 24-hour strip with the window shaded; a window past midnight wraps. */
function DayBar({ start, end }: { start: string; end: string }) {
  const th = useTheme();
  return (
    <View style={{ gap: 2 }}>
      <View style={{ height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: th.colors.surfaceMuted, direction: 'ltr' }}>
        {windowParts(start, end).map(([l, w], i) => <View key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: `${l}%`, width: `${w}%`, borderRadius: 4, backgroundColor: th.colors.warning.solid }} />)}
      </View>
      <Row justify="between" style={{ direction: 'ltr' }}>{['12 AM', '6 AM', '12 PM', '6 PM', '12 AM'].map((x, i) => <Text key={i} size="2xs" tone="subtle" ltr>{x}</Text>)}</Row>
    </View>
  );
}

export function HappyHoursScreen() {
  const th = useTheme();
  const can = usePermission();
  const canManage = can(P.RESTAURANT_MENU_MANAGE);
  const online = useOnlineStatus();
  const [search, setSearch] = useState('');
  const term = useDebouncedValue(search.trim().toLowerCase(), 150);
  const [status, setStatus] = useState<Status>('all');
  const [editing, setEditing] = useState<HappyHourRule | HappyHourInput | null>(null);
  const [testing, setTesting] = useState(false);
  const q = useQuery({ queryKey: [MENU_KEYS.happy], queryFn: () => happyHoursApi.list(), refetchInterval: 60_000 });
  const cats = useOfflineList<{ id: string; name: string }>('category');
  const catName = useMemo(() => new Map((cats.data ?? []).map((c) => [c.id, c.name])), [cats.data]);
  const rules = q.data ?? [];
  const live = rules.filter((r) => r.liveNow);
  const refresh = () => refreshMenu(MENU_KEYS.happy);
  const guard = (run: () => void) => { if (!online) { toast.warning(onlineNeededText('restaurantOrders')); return; } run(); };

  const toggle = useMutation({
    mutationFn: (id: string) => happyHoursApi.toggle(id),
    onSuccess: (r) => { toast.success(r.isActive ? t('Chalu') : t('Band')); refresh(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi badla'))),
  });
  const remove = useMutation({
    mutationFn: (id: string) => happyHoursApi.remove(id),
    onSuccess: (r) => { toast.success(r?.isActive === false ? t('Discount de chuka tha — band kar diya, hisaab rahega') : t('Hata diya')); refresh(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hata'))),
  });

  const shown = rules.filter((r) => (!term || r.name.toLowerCase().includes(term)) && (status === 'all' || (status === 'live' ? r.liveNow : status === 'on' ? r.isActive : !r.isActive)));
  const today = new Date().toISOString().slice(0, 10);
  const scopeText = (r: HappyHourRule) => {
    if (!r.categoryIds.length && !r.productIds.length) return t('Poora menu');
    const parts: string[] = [];
    if (r.categoryIds.length) parts.push(r.categoryIds.length <= 2 ? r.categoryIds.map((c) => catName.get(c) ?? 'Category').join(', ') : `${r.categoryIds.length} category`);
    if (r.productIds.length) parts.push(`${r.productIds.length} dish`);
    return parts.join(' + ');
  };

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={Zap} tone="success" label={t('Abhi chal rahe')} loading={q.isLoading} value={String(live.length)} hint={live.map((r) => r.name).slice(0, 2).join(', ') || undefined} onPress={() => setStatus(status === 'live' ? 'all' : 'live')} />
        <StatTile style={{ flex: 1 }} icon={Sparkles} tone="brand" label={t('Ab tak bachaya')} loading={q.isLoading} value={<Amount value={rules.reduce((s, r) => s + (r.totalSaved || 0), 0)} size="lg" weight="bold" compact />}
          hint={t('{{value}} dafa', { value: rules.reduce((s, r) => s + (r.totalUsage || 0), 0) })} />
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={CheckCircle2} tone="info" label={t('Chalu')} loading={q.isLoading} value={String(rules.filter((r) => r.isActive).length)} onPress={() => setStatus(status === 'on' ? 'all' : 'on')} />
        <StatTile style={{ flex: 1 }} icon={CircleSlash} tone="neutral" label={t('Band')} loading={q.isLoading} value={String(rules.filter((r) => !r.isActive).length)} onPress={() => setStatus(status === 'off' ? 'all' : 'off')} />
        <StatTile style={{ flex: 1 }} icon={CalendarDays} tone="warning" label={t('Tareekh guzar gayi')} loading={q.isLoading} value={String(rules.filter((r) => r.isActive && r.validTo && r.validTo.slice(0, 10) < today).length)} />
      </Row>
      <ChipGroup value={status} onChange={setStatus} options={[{ value: 'all', label: t('Sab') }, { value: 'live', label: t('Abhi chal rahe') }, { value: 'on', label: t('Chalu') }, { value: 'off', label: t('Band') }]} />
      <Text size="xs" tone="muted">{t('Waqt ke hisaab se discount · dukaan ka time (PKT)')}</Text>
      <CachedNote query={q} />
    </View>
  );

  return (
    <>
      <ListTemplate<HappyHourRule>
        title={t('Happy hours')}
        grouped={false}
        actions={<IconButton icon={Search} label={t('Test karein')} onPress={() => guard(() => setTesting(true))} />}
        search={{ value: search, onChange: setSearch, placeholder: t('Happy hour ka naam…') }}
        summary={header}
        data={shown}
        loading={q.isLoading}
        error={!q.data ? q.error : undefined}
        onRetry={() => void q.refetch()}
        refreshing={q.isRefetching}
        onRefresh={() => void q.refetch()}
        keyExtractor={(r) => r.id}
        renderItem={({ item: r }) => (
          <Card style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), opacity: r.isActive ? 1 : 0.7, borderWidth: r.liveNow ? 2 : undefined, borderColor: r.liveNow ? th.colors.success.solid : undefined }}
            title={r.name}
            description={`${offText(r)}${r.maxDiscount ? t(' · bill par {{maxDiscount}} tak', { maxDiscount: formatPKR(r.maxDiscount) }) : ''}`}
            action={<Badge tone={r.liveNow ? 'success' : 'neutral'}>{r.liveNow ? t('Abhi chal raha') : r.isActive ? t('Chalu') : t('Band')}</Badge>}>
            <View style={{ gap: th.space(2) }}>
              <DayBar start={r.startTime} end={r.endTime} />
              <ListRow dense title={t('Waqt')} trailing={<Text size="sm" weight="medium" ltr>{`${clock12(r.startTime)} – ${clock12(r.endTime)}`}</Text>} />
              <ListRow dense title={t('Din')} trailing={<Text size="sm" weight="medium">{daysLabel(r.daysOfWeek)}</Text>} />
              <ListRow dense title={t('Kis cheez par')} trailing={<Text size="sm" weight="medium" numberOfLines={1}>{scopeText(r)}</Text>} />
              <ListRow dense title={t('Order')} trailing={<Text size="sm" weight="medium" numberOfLines={1}>{r.orderModes.length ? r.orderModes.map(orderModeLabel).join(', ') : t('Har order')}</Text>} />
              {(r.validFrom || r.validTo) && <ListRow dense title={t('Tareekh')} trailing={<Text size="sm" weight="medium">{`${r.validFrom ? formatDate(r.validFrom) : t('shuru se')} → ${r.validTo ? formatDate(r.validTo) : t('aage tak')}`}</Text>} />}
              {r.minOrderAmount ? <ListRow dense title={t('Kam se kam bill')} trailing={<Amount value={r.minOrderAmount} />} /> : null}
              <Text size="xs" tone="muted">{t('Ab tak')}: {r.totalUsage ? t('{{totalUsage}} bill · {{totalSaved}} Discount', { totalUsage: r.totalUsage, totalSaved: formatPKR(r.totalSaved) }) : t('Abhi istemal nahi hua')}</Text>
              {canManage && (
                <Row gap={1.5}>
                  <Button size="sm" variant="secondary" icon={Pencil} onPress={() => guard(() => setEditing(r))}>{t('Badlein')}</Button>
                  <Button size="sm" variant="ghost" icon={Copy} onPress={() => guard(() => setEditing({ ...inputOf(r), name: `${r.name} (copy)` }))}>{t('Copy')}</Button>
                  <Button size="sm" variant="ghost" icon={Power} loading={toggle.isPending && toggle.variables === r.id} onPress={() => guard(() => toggle.mutate(r.id))}>{r.isActive ? t('Band') : t('Chalu')}</Button>
                  <View style={{ flex: 1 }} />
                  <IconButton icon={Trash2} label={t('Hatayein')} variant="danger" size="sm" onPress={() => guard(() => void confirm({ title: t('"{{name}}" hatayein?', { name: r.name }), message: t('Agar yeh pehle discount de chuka hai to sirf band hoga, taake us ka hisaab rahe.'), tone: 'danger', confirmLabel: t('Hatayein') }).then((ok) => ok && remove.mutate(r.id)))} />
                </Row>
              )}
            </View>
          </Card>
        )}
        empty={<EmptyState icon={Zap} title={rules.length ? t('Is filter me kuch nahi') : t('Abhi koi happy hour nahi')}
          message={t('Dopahar ke khali waqt me grahak lane ke liye: "Chai 3–6 PM 20% off" ya "Juma raat BBQ par ek ke saath ek".')}
          action={canManage && !rules.length ? <Button icon={Plus} onPress={() => guard(() => setEditing(blank()))}>{t('Pehla happy hour')}</Button> : undefined} />}
        fab={canManage ? { icon: Plus, label: t('Naya happy hour'), onPress: () => guard(() => setEditing(blank())) } : undefined}
      />
      {editing && <RuleSheet initial={editing} categories={cats.data ?? []} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />}
      {testing && <QuoteSheet onClose={() => setTesting(false)} />}
    </>
  );
}

const toDate = (hhmm: string) => { const d = new Date(); const [h, m] = (hhmm || '00:00').split(':').map(Number); d.setHours(h, m, 0, 0); return d; };
const fromDate = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function RuleSheet({ initial, categories, onClose, onSaved }: {
  initial: HappyHourRule | HappyHourInput; categories: Array<{ id: string; name: string }>; onClose: () => void; onSaved: () => void;
}) {
  const th = useTheme();
  const can = usePermission();
  const id = 'id' in initial ? initial.id : null;
  const [f, setF] = useState<HappyHourInput>(() => ('id' in initial ? inputOf(initial) : initial));
  const [tried, setTried] = useState(false);
  const [dishQ, setDishQ] = useState('');
  const [scope, setScope] = useState<'all' | 'pick'>(f.categoryIds.length || f.productIds.length ? 'pick' : 'all');
  const set = (p: Partial<HappyHourInput>) => setF((x) => ({ ...x, ...p }));
  const manifest = useOfflineManifest();
  const rules = manifest.data?.settings;
  const limit = rules?.maxDiscountPercent ?? 50;
  const dishes = useQuery({ queryKey: [MENU_KEYS.items, 'happy'], queryFn: () => boardApi.list(), staleTime: 60_000 });
  const dishName = useMemo(() => new Map((dishes.data ?? []).map((m) => [m.productId, String(m.product?.name ?? '')])), [dishes.data]);
  const p = happyProblem({ ...f, pick: scope === 'pick' });
  const problem = p ? t(PROBLEM[p]) : null;
  const pct = happyPercent(f);
  const overLimit = !can(P.POS_DISCOUNT_OVERRIDE) && pct !== null && pct > limit + 0.01;
  const flip = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const dishRows = (dishes.data ?? []).filter((m) => !f.productIds.includes(m.productId) && (!dishQ.trim() || String(m.product?.name ?? '').toLowerCase().includes(dishQ.trim().toLowerCase()))).slice(0, 30);

  const save = useMutation({
    mutationFn: () => {
      const body: HappyHourInput = {
        ...f, name: f.name.trim(), description: f.description?.trim() || undefined,
        discountValue: f.discountType === 'BUY_ONE_GET_ONE' ? 0 : f.discountValue,
        categoryIds: scope === 'all' ? [] : f.categoryIds, productIds: scope === 'all' ? [] : f.productIds,
        validFrom: f.validFrom || undefined, validTo: f.validTo || undefined, minOrderAmount: f.minOrderAmount || undefined, maxDiscount: f.maxDiscount || undefined,
      };
      return id ? happyHoursApi.update(id, body) : happyHoursApi.create(body);
    },
    onSuccess: () => { toast.success(id ? t('Save ho gaya') : t('Happy hour ban gaya')); onSaved(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Save nahi hua'))),
  });
  const submit = () => { setTried(true); if (!problem && !save.isPending) save.mutate(); };

  return (
    <Sheet open onClose={onClose} title={id ? t('{{name}} badlein', { name: initial.name }) : t('Naya happy hour')} description={t('Waqt dukaan ke time (PKT) me')} height={0.94}
      footer={<View style={{ gap: th.space(2) }}>{tried && problem && <Text size="sm" tone="warning">{problem}</Text>}<Button size="lg" fullWidth loading={save.isPending} onPress={submit}>{id ? t('Save karein') : t('Banayein')}</Button></View>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Naam')} value={f.name} onChangeText={(v) => set({ name: v.slice(0, 60) })} placeholder={t('Chai time, Friday BBQ night')} hint={t('Bill par discount ke saath yahi naam')} error={tried && !f.name.trim() ? t('Naam likhein') : undefined} />
        <Text size="sm" weight="semibold" tone="secondary">{t('Discount')}</Text>
        <View>{TYPES.map((x) => <ListRow key={x.value} dense icon={x.icon} iconTone={f.discountType === x.value ? 'brand' : 'neutral'} title={t(x.label)} subtitle={t(x.hint)} selected={f.discountType === x.value} onPress={() => set({ discountType: x.value })} />)}</View>
        {f.discountType !== 'BUY_ONE_GET_ONE' && (
          <>
            <NumberInput label={f.discountType === 'PERCENTAGE' ? t('Kitne %') : t('Fi plate kitne Rs')} value={f.discountValue || null} onChangeValue={(v) => set({ discountValue: v ?? 0 })} />
            <Row gap={2}>
              <NumberInput containerStyle={{ flex: 1 }} label={t('Bill par zyada se zyada (Rs)')} value={f.maxDiscount ?? null} onChangeValue={(v) => set({ maxDiscount: v ?? undefined })} hint={t('Khali = koi had nahi')} />
              <NumberInput containerStyle={{ flex: 1 }} label={t('Kam se kam bill (Rs)')} value={f.minOrderAmount ?? null} onChangeValue={(v) => set({ minOrderAmount: v ?? undefined })} hint={t('Is se chhote bill par nahi')} />
            </Row>
          </>
        )}
        {rules?.allowDiscount === false && <Card tone="warning"><Row gap={2}><ShieldAlert size={16} color={th.colors.warning.text} /><Text size="sm" style={{ flex: 1 }}>{t('Settings me discount band hai — jab tak chalu na ho, orders par happy hour nahi lagega.')}</Text></Row></Card>}
        {overLimit && <Card tone="warning"><Text size="sm">{t('Dukaan me discount ki had {{limit}}% hai (Settings). Is se zyada wala happy hour malik ya "Had se zyada discount" ki permission wala bana sakta hai.', { limit })}</Text></Card>}
        <Row gap={2}>
          <View style={{ flex: 1 }}><DatePicker mode="time" label={t('Kis waqt se')} value={toDate(f.startTime)} onChange={(d) => set({ startTime: fromDate(d) })} hint={clock12(f.startTime)} /></View>
          <View style={{ flex: 1 }}><DatePicker mode="time" label={t('Kab tak')} value={toDate(f.endTime)} onChange={(d) => set({ endTime: fromDate(d) })}
            hint={f.endTime < f.startTime ? t('{{endTime}} — raat 12 ke baad tak', { endTime: clock12(f.endTime) }) : clock12(f.endTime)} /></View>
        </Row>
        <DayBar start={f.startTime || '00:00'} end={f.endTime || '00:00'} />
        <Text size="sm" weight="semibold" tone="secondary">{t('Din')} <Text size="sm" tone="muted">{t('· khali = roz')}</Text></Text>
        <Row gap={1.5} wrap>
          {DAYS.map((d, i) => <Chip key={d} label={t(d)} selected={f.daysOfWeek.includes(i)} onPress={() => set({ daysOfWeek: flip(f.daysOfWeek, i).sort() })} />)}
          <Chip label={t('Peer–Juma')} onPress={() => set({ daysOfWeek: [1, 2, 3, 4, 5] })} />
          <Chip label={t('Weekend')} onPress={() => set({ daysOfWeek: [0, 6] })} />
        </Row>
        <Row gap={2}>
          <View style={{ flex: 1 }}><DatePicker label={t('Kis tareekh se')} value={f.validFrom ? new Date(`${f.validFrom}T12:00:00`) : null} onChange={(d) => set({ validFrom: dayKey(d) })} hint={t('Khali = abhi se')} /></View>
          <View style={{ flex: 1 }}><DatePicker label={t('Kis tareekh tak')} value={f.validTo ? new Date(`${f.validTo}T12:00:00`) : null} onChange={(d) => set({ validTo: dayKey(d) })} hint={t('Ramzan, Eid jaise mauqe ke liye')} /></View>
        </Row>
        {(f.validFrom || f.validTo) && <Button size="sm" variant="link" onPress={() => set({ validFrom: undefined, validTo: undefined })}>{t('Tareekh hatayein')}</Button>}
        <Text size="sm" weight="semibold" tone="secondary">{t('Kis par lage')}</Text>
        <Segmented value={scope} onChange={setScope} options={[{ value: 'all', label: t('Poora menu') }, { value: 'pick', label: t('Chuni hui') }]} />
        {scope === 'pick' && (
          <>
            <Text size="xs" weight="semibold" tone="muted">{t('Category')}</Text>
            <Row gap={1.5} wrap>
              {categories.map((c) => <Chip key={c.id} label={c.name} selected={f.categoryIds.includes(c.id)} onPress={() => set({ categoryIds: flip(f.categoryIds, c.id) })} />)}
              {!categories.length && <Text size="sm" tone="muted">{t('Koi category nahi')}</Text>}
            </Row>
            <Text size="xs" weight="semibold" tone="muted">{t('Dish {{value}}', { value: f.productIds.length ? t('· {{count}} chuni', { count: f.productIds.length }) : '' })}</Text>
            <Row gap={1.5} wrap>{f.productIds.map((p) => <Chip key={p} label={`${dishName.get(p) ?? t('Dish')} ✕`} selected onPress={() => set({ productIds: f.productIds.filter((x) => x !== p) })} />)}</Row>
            <SearchBar value={dishQ} onChangeText={setDishQ} placeholder={t('Dish dhoondein…')} />
            <Card flush>
              {dishRows.map((m, i) => <ListRow key={m.id} dense divider={i < dishRows.length - 1} icon={Plus} title={m.product?.name ?? ''} trailing={<Amount value={Number(m.product?.price) || 0} size="sm" />} onPress={() => set({ productIds: [...f.productIds, m.productId] })} />)}
            </Card>
          </>
        )}
        <Text size="sm" weight="semibold" tone="secondary">{t('Order type')} <Text size="sm" tone="muted">{t('· khali = har order')}</Text></Text>
        <Row gap={1.5} wrap>{MODE_OPTIONS.map((m) => <Chip key={m.value} label={t(m.label)} selected={f.orderModes.includes(m.value)} onPress={() => set({ orderModes: flip<OrderMode>(f.orderModes, m.value) })} />)}</Row>
        <Switch value={f.isActive !== false} onChange={(v) => set({ isActive: v })} label={t('Chalu')} description={t('Band ho to waqt aane par bhi nahi lagta')} />
      </View>
    </Sheet>
  );
}

/** Prices a few dishes against the rules running right now. */
function QuoteSheet({ onClose }: { onClose: () => void }) {
  const th = useTheme();
  const dishes = useQuery({ queryKey: [MENU_KEYS.items, 'happy'], queryFn: () => boardApi.list(), staleTime: 60_000 });
  const [cart, setCart] = useState<Array<{ productId: string; name: string; quantity: number }>>([]);
  const [mode, setMode] = useState<OrderMode | ''>('');
  const [q, setQ] = useState('');
  const quote = useQuery({ queryKey: ['restaurant-happy-quote', cart, mode], queryFn: () => happyQuote(cart, mode || undefined), enabled: cart.length > 0 });
  const rows = (dishes.data ?? []).filter((m) => !q.trim() || String(m.product?.name ?? '').toLowerCase().includes(q.trim().toLowerCase())).slice(0, 30);
  const res = quote.data;
  const total = res?.lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0) ?? 0;
  return (
    <Sheet open onClose={onClose} title={t('Happy hour test')} description={t('Abhi ke waqt par yeh dishes kitne ki banti hain')} height={0.92}>
      <View style={{ gap: th.space(3) }}>
        <Select label={t('Order type')} value={mode} onChange={setMode} options={[{ value: '', label: t('Har order type') }, ...MODE_OPTIONS.map((m) => ({ value: m.value, label: t(m.label) }))]} />
        {cart.length > 0 && (
          <Card flush>
            {cart.map((c) => {
              const l = res?.lines.find((x) => x.productId === c.productId);
              return (
                <ListRow key={c.productId} dense title={`${c.name} × ${c.quantity}`} subtitle={l?.discount ? `−${formatPKR(l.discount)} (${l.ruleName})` : '—'}
                  trailing={<IconButton icon={Trash2} label={t('Hatayein')} size="sm" variant="danger" onPress={() => setCart((x) => x.filter((y) => y.productId !== c.productId))} />} />
              );
            })}
            <ListRow dense title={quote.isFetching ? t('Hisaab…') : t('Kul {{total}}', { total: formatPKR(total) })}
              trailing={<Text size="sm" weight="semibold" tone={res?.discount ? 'success' : 'muted'}>{res?.discount ? t('Discount {{discount}}', { discount: formatPKR(res.discount) }) : t('Abhi koi happy hour nahi lagta')}</Text>} />
          </Card>
        )}
        {!cart.length && <Text tone="muted" align="center">{t('Baayen se dishes jorein')}</Text>}
        <SearchBar value={q} onChangeText={setQ} placeholder={t('Dish dhoondein…')} />
        <Card flush>
          {rows.map((m, i) => (
            <ListRow key={m.id} dense divider={i < rows.length - 1} icon={Plus} title={m.product?.name ?? ''} trailing={<Amount value={Number(m.product?.price) || 0} size="sm" />}
              onPress={() => setCart((c) => (c.some((x) => x.productId === m.productId) ? c.map((x) => (x.productId === m.productId ? { ...x, quantity: x.quantity + 1 } : x)) : [...c, { productId: m.productId, name: String(m.product?.name ?? ''), quantity: 1 }]))} />
          ))}
        </Card>
        <Text size="xs" tone="muted">{t('Menu ke rate par, add-ons ke bagair. Ek dish par ek hi happy hour — jo zyada bachaye.')}</Text>
      </View>
    </Sheet>
  );
}
