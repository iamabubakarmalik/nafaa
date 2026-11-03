/**
 * Add-on groups (web ModifiersPage): extras, removals, spice, cooking style,
 * a size step or a free note, with their rules (required, how many) and the
 * dishes they are on. Groups used on past orders are switched off instead of
 * deleted. Needs the server for changes; the last list stays readable offline.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, CircleSlash, Copy, ListChecks, MinusCircle, Package, Pencil, Plus, PlusCircle, Power, Sparkles, Trash2, UtensilsCrossed } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { groupProblem, singleChoice, type GroupProblem, type ModifierType } from '@nafaa/core/restaurant';
import { apiErrorMessage } from '@/core/api/errors';
import { formatPKR } from '@/core/format';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { onlineNeededText } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import {
  Badge, Button, Card, Checkbox, Chip, ChipGroup, EmptyState, IconButton, Input, ListRow, ListTemplate, Row, SearchBar, Sheet, Skeleton, StatTile, Switch,
  Text, confirm, toast, useDebouncedValue, useTheme,
} from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { modifiersApi, boardApi, type ModifierGroup, type ModifierGroupInput, type ModifierOption } from '../api';
import { IngredientSheet } from '../components/RecipeEditor';
import { MENU_KEYS, MODIFIER_TYPES, fmt, modifierTypeOf, refreshMenu } from '../meta';
import { cookUnit, unitChoices } from '@nafaa/core/restaurant';

type Status = 'all' | 'on' | 'off';

const PRESETS: Array<{ label: string; group: ModifierGroupInput }> = [
  { label: 'Extra', group: { name: 'Extra', type: 'ADDON', isRequired: false, minSelections: 0, maxSelections: 5, options: [{ name: 'Extra cheese', priceAdjustment: 100 }, { name: 'Raita', priceAdjustment: 50 }, { name: 'Salad', priceAdjustment: 50 }, { name: 'Extra boti', priceAdjustment: 150 }] } },
  { label: 'Bagair', group: { name: 'Bagair', type: 'REMOVAL', isRequired: false, minSelections: 0, maxSelections: 5, options: [{ name: 'Pyaaz nahi' }, { name: 'Mayo nahi' }, { name: 'Hari mirch nahi' }] } },
  { label: 'Teekhapan', group: { name: 'Teekhapan', type: 'SPICE_LEVEL', isRequired: false, minSelections: 0, maxSelections: 1, options: [{ name: 'Halka' }, { name: 'Darmiyana', isDefault: true }, { name: 'Teekha' }] } },
  { label: 'Roti / Naan', group: { name: 'Roti / Naan', type: 'ADDON', isRequired: false, minSelections: 0, maxSelections: 3, options: [{ name: 'Roti', priceAdjustment: 25 }, { name: 'Naan', priceAdjustment: 40 }, { name: 'Roghni naan', priceAdjustment: 70 }] } },
  { label: 'Drink size', group: { name: 'Drink size', type: 'VARIATION', isRequired: true, minSelections: 1, maxSelections: 1, options: [{ name: 'Regular', isDefault: true }, { name: 'Large', priceAdjustment: 80 }] } },
];

const blank = (): ModifierGroupInput => ({ name: '', type: 'ADDON', isRequired: false, minSelections: 0, maxSelections: 3, options: [{ name: '', priceAdjustment: 0 }] });
const copyOf = (g: ModifierGroup): ModifierGroupInput => ({
  name: `${g.name} (copy)`, description: g.description ?? undefined, type: g.type, isRequired: g.isRequired, minSelections: g.minSelections, maxSelections: g.maxSelections,
  options: g.options.filter((o) => o.isActive !== false).map((o) => ({
    name: o.name, priceAdjustment: o.priceAdjustment, isDefault: o.isDefault, emoji: o.emoji,
    ingredientProductId: o.ingredientProductId ?? null, ingredientQty: o.ingredientQty ?? null, ingredientUnit: o.ingredientUnit ?? null, ingredient: o.ingredient ?? null,
  })),
});

function problemText(p: GroupProblem): string | null {
  if (!p) return null;
  switch (p.code) {
    case 'name': return t('Group ka naam likhein');
    case 'optionName': return t('Har option ka naam likhein');
    case 'duplicate': return t('Do option ka naam ek jaisa hai');
    case 'noOption': return t('Kam se kam ek option daalein');
    case 'minOverMax': return t('"Kam se kam" "zyada se zyada" se barh nahi sakta');
    case 'minOverOptions': return t('Sirf {{count}} option hain — kam se kam {{min}} nahi chune ja sakte', { count: p.count, min: p.min });
    case 'singleOnly': return t('Size ya teekhapan me ek hi chuna jata hai');
    case 'tooManyDefaults': return t('Pehle se chune option zyada se zyada se barh gaye');
    case 'ingredientQty': return t('{{value}}: saamaan kitna lagta hai likhein', { value: p.name || 'Option' });
    default: return null;
  }
}

const priceText = (n?: number) => (n ? `${n > 0 ? '+' : '−'}${formatPKR(Math.abs(n))}` : t('free'));

export function ModifiersScreen() {
  const th = useTheme();
  const can = usePermission();
  const canManage = can(P.RESTAURANT_MENU_MANAGE);
  const online = useOnlineStatus();
  const [search, setSearch] = useState('');
  const term = useDebouncedValue(search.trim().toLowerCase(), 150);
  const [type, setType] = useState<ModifierType | 'all'>('all');
  const [status, setStatus] = useState<Status>('all');
  const [editing, setEditing] = useState<ModifierGroup | ModifierGroupInput | null>(null);
  const [assigning, setAssigning] = useState<ModifierGroup | null>(null);

  const q = useQuery({ queryKey: [MENU_KEYS.modifiers], queryFn: () => modifiersApi.list() });
  const groups = q.data ?? [];
  const refresh = () => refreshMenu(MENU_KEYS.modifiers, MENU_KEYS.board, MENU_KEYS.items);
  const guard = (run: () => void) => { if (!online) { toast.warning(onlineNeededText('restaurantOrders')); return; } run(); };

  const toggle = useMutation({
    mutationFn: (id: string) => modifiersApi.toggle(id),
    onSuccess: (g) => { toast.success(g.isActive ? t('Chalu — order par poocha jayega') : t('Band — order par nahi aayega')); refresh(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi badla'))),
  });
  const remove = useMutation({
    mutationFn: (id: string) => modifiersApi.remove(id),
    onSuccess: (r) => { toast.success(r?.isActive === false ? t('Purane order me laga tha — band kar diya, history rahegi') : t('Group hata diya')); refresh(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hata'))),
  });
  const askRemove = async (g: ModifierGroup) => {
    const ok = await confirm({
      title: t('"{{name}}" hatayein?', { name: g.name }), tone: 'danger', confirmLabel: t('Hatayein'),
      message: t('{{value}}Agar purane order me laga tha to sirf band hoga — bill waise hi rahenge.', { value: g._count?.menuItems ? t('{{menuItems}} dish se bhi hat jayega. ', { menuItems: g._count.menuItems }) : '' }),
    });
    if (ok) remove.mutate(g.id);
  };

  const shown = useMemo(() => groups.filter((g) => (type === 'all' || g.type === type)
    && (status === 'all' || (status === 'on' ? g.isActive : !g.isActive))
    && (!term || g.name.toLowerCase().includes(term) || g.options.some((o) => o.name.toLowerCase().includes(term)))), [groups, type, status, term]);
  const stats = useMemo(() => ({
    on: groups.filter((g) => g.isActive).length,
    unused: groups.filter((g) => g.isActive && !(g._count?.menuItems ?? 0)).length,
    required: groups.filter((g) => g.isActive && g.isRequired).length,
  }), [groups]);

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={CheckCircle2} tone="success" label={t('Chalu')} loading={q.isLoading} value={`${stats.on} / ${groups.length}`} onPress={() => setStatus(status === 'on' ? 'all' : 'on')} />
        <StatTile style={{ flex: 1 }} icon={CircleSlash} tone="neutral" label={t('Band')} loading={q.isLoading} value={String(groups.length - stats.on)} onPress={() => setStatus(status === 'off' ? 'all' : 'off')} />
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={AlertTriangle} tone="warning" label={t('Kisi dish par nahi')} loading={q.isLoading} value={String(stats.unused)} hint={t('Order par kabhi nahi aayenge')} />
        <StatTile style={{ flex: 1 }} icon={ListChecks} tone="accent" label={t('Zaroori')} loading={q.isLoading} value={String(stats.required)} hint={t('Bina chune order nahi banta')} />
      </Row>
      <ChipGroup value={type} onChange={setType} style={{ marginHorizontal: -th.space(4) }}
        options={[{ value: 'all', label: t('Har type') }, ...MODIFIER_TYPES.map((x) => ({ value: x.value, label: t(x.label) }))]} />
      <ChipGroup value={status} onChange={setStatus} options={[{ value: 'all', label: t('Sab') }, { value: 'on', label: t('Chalu') }, { value: 'off', label: t('Band') }]} />
      <CachedNote query={q} />
      {canManage && !groups.length && !q.isLoading && (
        <Card title={t('Jaldi shuru karein')} description={t('Ek dabayein, rate apne hisaab se badlein aur save karein.')}>
          <Row gap={2} wrap>{PRESETS.map((p) => <Chip key={p.label} icon={Plus} label={t(p.label)} onPress={() => setEditing(JSON.parse(JSON.stringify(p.group)))} />)}</Row>
        </Card>
      )}
    </View>
  );

  return (
    <>
      <ListTemplate<ModifierGroup>
        title={t('Add-ons')}
        subtitle={t('Extra, bagair, teekhapan — order lete waqt')}
        grouped={false}
        search={{ value: search, onChange: setSearch, placeholder: t('Group ya option ka naam…') }}
        summary={header}
        data={shown}
        loading={q.isLoading}
        error={!q.data ? q.error : undefined}
        onRetry={() => void q.refetch()}
        refreshing={q.isRefetching}
        onRefresh={() => void q.refetch()}
        keyExtractor={(g) => g.id}
        renderItem={({ item: g }) => {
          const opts = g.options.filter((o) => o.isActive !== false);
          const dishes = g._count?.menuItems ?? 0;
          return (
            <Card style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), opacity: g.isActive ? 1 : 0.7 }}
              title={g.name}
              description={`${t(modifierTypeOf(g.type).label)} · ${g.isRequired ? t('zaroori, {{minSelections}}–{{maxSelections}}', { minSelections: g.minSelections, maxSelections: g.maxSelections }) : g.maxSelections > 1 ? t('marzi, {{maxSelections}} tak', { maxSelections: g.maxSelections }) : t('marzi, ek')}`}
              action={<Badge tone={g.isActive ? 'success' : 'neutral'}>{g.isActive ? t('Chalu') : t('Band')}</Badge>}>
              <View style={{ gap: th.space(1) }}>
                {opts.slice(0, 6).map((o) => (
                  <Row key={o.id ?? o.name} justify="between" gap={2}>
                    <Text size="sm" numberOfLines={1} style={{ flex: 1 }}>{o.emoji ? `${o.emoji} ` : ''}{o.name}{o.isDefault ? ` ${t('(pehle se)')}` : ''}
                      {o.ingredient && o.ingredientQty ? <Text size="xs" tone="warning">{` · ${fmt(o.ingredientQty)} ${o.ingredientUnit ?? o.ingredient.unit} ${o.ingredient.name}`}</Text> : null}</Text>
                    <Text size="sm" ltr tone={(o.priceAdjustment ?? 0) > 0 ? 'default' : (o.priceAdjustment ?? 0) < 0 ? 'success' : 'muted'}>{priceText(o.priceAdjustment)}</Text>
                  </Row>
                ))}
                {opts.length > 6 && <Text size="xs" tone="muted">{t('+{{value}} aur', { value: opts.length - 6 })}</Text>}
                {!opts.length && <Text size="sm" tone="muted">{g.type === 'NOTE' ? t('Grahak apni baat likhwata hai') : t('Koi chalu option nahi')}</Text>}
                <ListRow dense icon={UtensilsCrossed} iconTone={dishes ? 'neutral' : 'warning'} title={dishes ? t('{{dishes}} dish par laga', { dishes }) : t('Kisi dish par nahi — lagayein')}
                  chevron={canManage} onPress={canManage ? () => guard(() => setAssigning(g)) : undefined} />
                {canManage && (
                  <Row gap={1.5}>
                    <Button size="sm" variant="secondary" icon={Pencil} onPress={() => guard(() => setEditing(g))}>{t('Badlein')}</Button>
                    <Button size="sm" variant="ghost" icon={Copy} onPress={() => guard(() => setEditing(copyOf(g)))}>{t('Copy')}</Button>
                    <Button size="sm" variant="ghost" icon={Power} loading={toggle.isPending && toggle.variables === g.id} onPress={() => guard(() => toggle.mutate(g.id))}>{g.isActive ? t('Band') : t('Chalu')}</Button>
                    <View style={{ flex: 1 }} />
                    <IconButton icon={Trash2} label={t('Hatayein')} variant="danger" size="sm" onPress={() => guard(() => void askRemove(g))} />
                  </Row>
                )}
              </View>
            </Card>
          );
        }}
        empty={groups.length ? <EmptyState icon={Sparkles} title={t('Is filter me koi group nahi')} /> : <EmptyState icon={Sparkles} title={t('Add-ons')} message={t('Extra, bagair, teekhapan — order lete waqt')} />}
        fab={canManage ? { icon: Plus, label: t('Naya group'), onPress: () => guard(() => setEditing(blank())) } : undefined}
      />
      {editing && <GroupSheet initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />}
      {assigning && <AssignSheet group={assigning} onClose={() => setAssigning(null)} onSaved={() => { setAssigning(null); refresh(); }} />}
    </>
  );
}

function GroupSheet({ initial, onClose, onSaved }: { initial: ModifierGroup | ModifierGroupInput; onClose: () => void; onSaved: () => void }) {
  const th = useTheme();
  const id = 'id' in initial ? initial.id : null;
  const [f, setF] = useState<ModifierGroupInput>(() => ({
    name: initial.name, description: initial.description ?? '', type: initial.type ?? 'ADDON', isRequired: !!initial.isRequired,
    minSelections: initial.minSelections ?? 0, maxSelections: initial.maxSelections ?? 1,
    options: initial.options.map((o) => ({
      id: o.id, name: o.name, priceAdjustment: o.priceAdjustment ?? 0, isDefault: !!o.isDefault, isActive: o.isActive !== false, emoji: o.emoji ?? '',
      ingredientProductId: o.ingredientProductId ?? null, ingredientQty: o.ingredientQty ?? null, ingredientUnit: o.ingredientUnit ?? null, ingredient: o.ingredient ?? null,
    })),
  }));
  const [tried, setTried] = useState(false);
  const [stockAt, setStockAt] = useState<number | null>(null);
  const set = (p: Partial<ModifierGroupInput>) => setF((x) => ({ ...x, ...p }));
  const setOpt = (i: number, p: Partial<ModifierOption>) => setF((x) => ({ ...x, options: x.options.map((o, j) => (j === i ? { ...o, ...p } : o)) }));
  const type = f.type ?? 'ADDON';
  const single = singleChoice(type);
  const problem = problemText(groupProblem({ name: f.name, type, isRequired: !!f.isRequired, minSelections: f.minSelections ?? 0, maxSelections: f.maxSelections ?? 1, options: f.options }));

  const save = useMutation({
    mutationFn: () => {
      const body: ModifierGroupInput = {
        ...f, name: f.name.trim(), description: f.description?.trim() || undefined,
        minSelections: f.isRequired ? Math.max(f.minSelections ?? 0, 1) : f.minSelections, maxSelections: single ? 1 : f.maxSelections,
        options: f.options.map(({ ingredient: _shown, ...o }, i) => ({ ...o, name: o.name.trim(), emoji: o.emoji || undefined, displayOrder: i })),
      };
      return id ? modifiersApi.update(id, body) : modifiersApi.create(body);
    },
    onSuccess: () => { toast.success(id ? t('Group save ho gaya') : t('Group ban gaya — ab dishes par lagayein')); onSaved(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Save nahi hua'))),
  });
  const submit = () => { setTried(true); if (!problem && !save.isPending) save.mutate(); };

  return (
    <Sheet open onClose={onClose} title={id ? t('"{{name}}" badlein', { name: initial.name }) : t('Naya add-on group')} description={t('Order lete waqt waiter yahi options dekhega')} height={0.94}
      footer={<View style={{ gap: th.space(2) }}>
        {tried && problem && <Text size="sm" tone="warning">{problem}</Text>}
        <Button size="lg" fullWidth loading={save.isPending} onPress={submit}>{id ? t('Save karein') : t('Group banayein')}</Button>
      </View>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Group ka naam')} value={f.name} onChangeText={(v) => set({ name: v.slice(0, 60) })} placeholder={t('Extra, Bagair, Roti…')} hint={t('Waiter ko yahi naam dikhega')} error={tried && !f.name.trim() ? t('Naam likhein') : undefined} />
        <Input label={t('Note (marzi)')} value={f.description ?? ''} onChangeText={(v) => set({ description: v.slice(0, 200) })} placeholder={t('Maslan: sirf burger ke saath')} />
        <Text size="sm" weight="semibold" tone="secondary">{t('Type')}</Text>
        <View>
          {MODIFIER_TYPES.map((x) => (
            <ListRow key={x.value} dense title={t(x.label)} subtitle={t(x.hint)} selected={type === x.value}
              onPress={() => set({ type: x.value, ...(singleChoice(x.value) ? { maxSelections: 1 } : {}) })} />
          ))}
        </View>
        <Switch value={!!f.isRequired} onChange={(v) => set({ isRequired: v, minSelections: v ? Math.max(f.minSelections ?? 0, 1) : 0 })} label={t('Zaroori')} description={t('Bina chune order nahi banega')} />
        <Row gap={2}>
          <NumberInput integer containerStyle={{ flex: 1 }} label={t('Kam se kam')} value={f.isRequired ? Math.max(f.minSelections ?? 0, 1) : f.minSelections ?? 0} disabled={!f.isRequired}
            onChangeValue={(v) => set({ minSelections: v ?? 0 })} hint={f.isRequired ? t('Kitne chunna lazmi') : t('Marzi wale me 0')} />
          <NumberInput integer containerStyle={{ flex: 1 }} label={t('Zyada se zyada')} value={single ? 1 : f.maxSelections ?? 1} disabled={single}
            onChangeValue={(v) => set({ maxSelections: Math.max(v ?? 1, 1) })} hint={single ? t('Size / teekhapan me ek') : t('Kitne tak chun sakte hain')} />
        </Row>
        {type !== 'NOTE' && (
          <>
            <Row justify="between"><Text size="sm" weight="semibold" tone="secondary">{t('Options')}</Text><Text size="xs" tone="muted">{t('Rate me farq: + mehnga, − sasta, 0 free')}</Text></Row>
            {f.options.map((o, i) => {
              const neg = (o.priceAdjustment ?? 0) < 0;
              return (
                <Card key={o.id ?? `n${i}`} style={{ opacity: o.isActive === false ? 0.7 : 1 }}>
                  <View style={{ gap: th.space(2) }}>
                    <Row gap={2}>
                      <Input size="md" containerStyle={{ width: 64 }} value={o.emoji ?? ''} onChangeText={(v) => setOpt(i, { emoji: v.slice(0, 8) })} placeholder="🧀" />
                      <Input size="md" containerStyle={{ flex: 1 }} value={o.name} onChangeText={(v) => setOpt(i, { name: v.slice(0, 60) })} placeholder={t('Extra cheese')} error={tried && !o.name.trim() ? ' ' : undefined} />
                    </Row>
                    <Row gap={2}>
                      <IconButton icon={MinusCircle} label={t('Sasta')} variant={neg ? 'soft' : 'ghost'} onPress={() => setOpt(i, { priceAdjustment: -Math.abs(o.priceAdjustment ?? 0) })} />
                      <NumberInput size="md" containerStyle={{ flex: 1 }} value={o.priceAdjustment ? Math.abs(o.priceAdjustment) : null} prefix={neg ? '− Rs' : '+ Rs'}
                        onChangeValue={(v) => setOpt(i, { priceAdjustment: neg ? -(v ?? 0) : v ?? 0 })} />
                      <IconButton icon={PlusCircle} label={t('Mehnga')} variant={!neg && (o.priceAdjustment ?? 0) > 0 ? 'soft' : 'ghost'} onPress={() => setOpt(i, { priceAdjustment: Math.abs(o.priceAdjustment ?? 0) })} />
                    </Row>
                    <Row gap={2} wrap>
                      <Checkbox value={!!o.isDefault} onChange={(v) => setOpt(i, { isDefault: v })} label={t('Default')} />
                      <Chip icon={Package} label={o.ingredient && o.ingredientQty ? `${fmt(o.ingredientQty)} ${o.ingredientUnit ?? o.ingredient.unit}` : t('Saamaan')} selected={!!o.ingredientProductId} onPress={() => setStockAt(stockAt === i ? null : i)} />
                      <View style={{ flex: 1 }} />
                      {o.id
                        ? <Chip label={o.isActive === false ? t('Band') : t('Chalu')} selected={o.isActive !== false} onPress={() => setOpt(i, { isActive: o.isActive === false })} />
                        : <IconButton icon={Trash2} label={t('Hatayein')} variant="danger" size="sm" onPress={() => set({ options: f.options.filter((_, j) => j !== i) })} />}
                    </Row>
                    {(stockAt === i || (tried && o.ingredientProductId && !(Number(o.ingredientQty) > 0))) && (
                      <AddOnIngredient value={o} invalid={tried && !!o.ingredientProductId && !(Number(o.ingredientQty) > 0)}
                        onChange={(v) => setOpt(i, v)} />
                    )}
                  </View>
                </Card>
              );
            })}
            <Button variant="secondary" icon={Plus} onPress={() => set({ options: [...f.options, { name: '', priceAdjustment: 0 }] })}>{t('Option jorein')}</Button>
            <Text size="xs" tone="muted">{t('"Saamaan": extra cheese jaisa add-on bikne par us ka raw material (maslan 30 gram cheese) stock se nikalta hai.')}</Text>
            {id && <Text size="xs" tone="muted">{t('Purane option hatte nahi, band hote hain — jin bills me lage the woh waise rahenge.')}</Text>}
          </>
        )}
      </View>
    </Sheet>
  );
}

/** The raw material an add-on uses up when sold (extra cheese 30 g). */
function AddOnIngredient({ value, onChange, invalid }: { value: ModifierOption; onChange: (p: Partial<ModifierOption>) => void; invalid?: boolean }) {
  const th = useTheme();
  const [picking, setPicking] = useState(false);
  const ing = value.ingredient;
  if (!ing) {
    return (
      <>
        <Button size="sm" variant="soft" icon={Package} onPress={() => setPicking(true)}>{t('Raw material dhoondein: cheese, anda…')}</Button>
        <IngredientSheet open={picking} onClose={() => setPicking(false)} allowAll={false}
          onPick={(p) => { setPicking(false); onChange({ ingredient: { id: p.id, name: p.name, unit: p.unit }, ingredientProductId: p.id, ingredientQty: null, ingredientUnit: cookUnit(p.unit) }); }} />
      </>
    );
  }
  const units = unitChoices(ing.unit);
  return (
    <View style={{ gap: th.space(1.5), padding: th.space(2), borderRadius: th.radius('lg'), backgroundColor: th.colors.warning.soft }}>
      <Row justify="between"><Text weight="semibold" color={th.colors.warning.text}>{ing.name}</Text>
        <Button size="sm" variant="ghost" onPress={() => onChange({ ingredient: null, ingredientProductId: null, ingredientQty: null, ingredientUnit: null })}>{t('Saamaan hatayein')}</Button></Row>
      <Row gap={2}>
        <NumberInput size="md" containerStyle={{ flex: 1 }} label={t('Ek portion me kitna')} value={value.ingredientQty ?? null} onChangeValue={(v) => onChange({ ingredientQty: v })} error={invalid ? ' ' : undefined} />
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <ChipGroup value={value.ingredientUnit ?? ing.unit} onChange={(u) => onChange({ ingredientUnit: u })} options={units.map((u) => ({ value: u, label: u }))} />
        </View>
      </Row>
      <Text size="xs" color={th.colors.warning.text}>{t('ek portion me — bikne par stock se nikalta hai')}</Text>
    </View>
  );
}

function AssignSheet({ group, onClose, onSaved }: { group: ModifierGroup; onClose: () => void; onSaved: () => void }) {
  const th = useTheme();
  const [q, setQ] = useState('');
  const [onlyPicked, setOnlyPicked] = useState(false);
  const menu = useQuery({ queryKey: [MENU_KEYS.items, 'assign'], queryFn: () => boardApi.list() });
  const [picked, setPicked] = useState<Set<string>>(() => new Set((group.menuItems ?? []).map((m) => m.menuItemId)));
  const term = q.trim().toLowerCase();
  const rows = (menu.data ?? []).filter((m) => (!term || String(m.product?.name ?? '').toLowerCase().includes(term) || String(m.product?.category?.name ?? '').toLowerCase().includes(term))
    && (!onlyPicked || picked.has(m.id)));
  const cats = useMemo(() => {
    const m = new Map<string, typeof rows>();
    for (const r of rows) { const c = r.product?.category?.name ?? t('Baghair category'); m.set(c, [...(m.get(c) ?? []), r]); }
    return [...m.entries()];
  }, [rows]);
  const flip = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const save = useMutation({
    mutationFn: () => modifiersApi.assignDishes(group.id, [...picked]),
    onSuccess: (r) => { toast.success(t('{{added}} dish par laga, {{removed}} se hata', { added: r.added, removed: r.removed })); onSaved(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Save nahi hua'))),
  });
  return (
    <Sheet open onClose={onClose} title={t('"{{name}}" kin dishes par?', { name: group.name })} description={t('Chuni hui dish ka order lete waqt yeh group poocha jayega')} height={0.92}
      footer={<Row gap={2}><Text size="sm" tone="muted" style={{ flex: 1 }}>{t('{{size}} chuni', { size: picked.size })}</Text><Button loading={save.isPending} onPress={() => save.mutate()}>{t('Save karein')}</Button></Row>}>
      <View style={{ gap: th.space(3) }}>
        <SearchBar value={q} onChangeText={setQ} placeholder={t('Dish ya category…')} />
        <Row><Chip label={t('Sirf chuni')} selected={onlyPicked} onPress={() => setOnlyPicked((v) => !v)} /></Row>
        {menu.isLoading ? <Skeleton height={200} /> : !rows.length ? <Text tone="muted" align="center">{t('Koi dish nahi mili')}</Text> : cats.map(([cat, list]) => {
          const all = list.every((x) => picked.has(x.id));
          return (
            <View key={cat} style={{ gap: th.space(1) }}>
              <Row justify="between">
                <Text size="xs" weight="semibold" tone="muted" uppercase>{cat}</Text>
                <Button size="sm" variant="link" onPress={() => setPicked((p) => { const n = new Set(p); list.forEach((x) => (all ? n.delete(x.id) : n.add(x.id))); return n; })}>{all ? t('Sab hatayein') : t('Sab chunein')}</Button>
              </Row>
              <Card flush>
                {list.map((m, i) => (
                  <ListRow key={m.id} dense divider={i < list.length - 1} title={m.product?.name ?? ''} selected={picked.has(m.id)} onPress={() => flip(m.id)}
                    trailing={!m.isAvailable ? <Badge tone="danger">{t('Band hai')}</Badge> : undefined} />
                ))}
              </Card>
            </View>
          );
        })}
      </View>
    </Sheet>
  );
}
