/**
 * One setup screen for categories, brands and tags (same as the web
 * TaxonomyPage): each item with its products, stock and sales for the
 * chosen period; add one by one or from the industry's suggestions, edit,
 * switch off, merge into another and delete, alone or several at once.
 * The list stays readable offline (last saved); changes need internet.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  AlertTriangle, ArrowDownUp, Check, Eye, EyeOff, GitMerge, Layers, Package, Tag, Pencil, Plus, Sparkles, Trash2, Upload, X, type LucideIcon,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, Text as RNText, View } from 'react-native';
import { formatPKR, formatRelative } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { onlineNeededText, useCachedNotice } from '@/core/offline';
import {
  Amount, Badge, Button, Card, Checkbox, Chip, ChipGroup, EmptyState, IconButton, Input, ListRow, ListTemplate, PressableScale, Row, SearchBar, Segmented,
  Select, Sheet, StatTile, SwipeRow, Switch, Text, TextArea, confirm, toast, useTheme,
} from '@/design';
import { useIndustry } from '@/modules/shell/hooks/useIndustry';
import { taxonomyApi, uploadsApiFor, type TaxonomyItem, type TaxonomyKind } from '../api';
import { ActionSheet } from '../components/ActionSheet';
import { getIndustryPresets } from '../lib/industryPresets';
import { PRESETS, presetRange, useDayStart, type Preset } from '../lib/range';
import { useCategoryKinds } from '../../industry/registry';
import { INV, useCostMask, useOnline, useRefreshInventory } from '../../lib/shared';

type Draft = Record<string, unknown>;
type Show = 'all' | 'used' | 'unused' | 'off' | 'low';
type Sort = 'sales' | 'products' | 'stock' | 'name' | 'new';

export interface TaxonomyConfig {
  kind: TaxonomyKind;
  title: string;
  one: string;
  icon: LucideIcon;
  productParam: 'categoryId' | 'brandId' | 'tagId';
  noneFilter?: boolean;
  canSwitchOff?: boolean;
  color?: boolean;
  emoji?: boolean;
  brandFields?: boolean;
  toPayload: (d: Draft) => Draft;
}

export const COLORS = ['#2c9466', '#16a34a', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#14b8a6', '#06b6d4', '#78350f', '#64748b'];
const EMOJIS = ['🛒', '🥤', '🍞', '🍰', '🥛', '🧀', '🍫', '🍪', '🥩', '🐟', '🍎', '🥬', '🧂', '🧴', '🧼', '💊', '👕', '👟', '👜', '💄', '📱', '💻', '🎧', '🔌', '🔧', '🪑', '📚', '✏️', '🧸', '🎁', '🌿', '⭐'];
const hashColor = (s: string) => COLORS[[...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % COLORS.length];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function ItemAvatar({ item, size = 40 }: { item: { name: string; color?: string | null; icon?: string | null; logoUrl?: string | null }; size?: number }) {
  const th = useTheme();
  if (item.logoUrl) return <Image source={{ uri: item.logoUrl }} style={{ width: size, height: size, borderRadius: th.radius('lg'), backgroundColor: th.colors.surface }} contentFit="contain" />;
  return (
    <View style={{ width: size, height: size, borderRadius: th.radius('lg'), backgroundColor: item.color || hashColor(item.name || '?'), alignItems: 'center', justifyContent: 'center' }}>
      <RNText allowFontScaling={false} style={{ fontSize: size * 0.45, fontWeight: '700', color: '#ffffff' }}>{item.icon || (item.name || '?').trim().charAt(0).toUpperCase()}</RNText>
    </View>
  );
}

export function TaxonomyScreen({ config }: { config: TaxonomyConfig }) {
  const th = useTheme();
  const api = useMemo(() => taxonomyApi(config.kind), [config.kind]);
  const online = useOnline();
  const refreshInv = useRefreshInventory();
  const { costHidden, cost } = useCostMask();
  const dayStart = useDayStart();
  const { id: industryId, identity } = useIndustry();
  const [preset, setPreset] = useState<Preset>('month');
  const [search, setSearch] = useState('');
  const [show, setShow] = useState<Show>('all');
  const [sort, setSort] = useState<Sort>('sales');
  const [sortOpen, setSortOpen] = useState(false);
  const [editing, setEditing] = useState<TaxonomyItem | 'new' | null>(null);
  const [menu, setMenu] = useState<TaxonomyItem | null>(null);
  const [merging, setMerging] = useState<TaxonomyItem | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const period = presetRange(preset, dayStart);
  const q = useQuery({ queryKey: [INV, 'taxonomy', config.kind, period.from, period.to], queryFn: () => api.insights(period), staleTime: 30_000 });
  const cached = useCachedNotice(q);
  const items = q.data?.items ?? [];
  const totals = q.data?.totals;
  const refresh = () => { void q.refetch(); void refreshInv(); };
  const needOnline = () => { if (online) return false; toast.warning(onlineNeededText('settings')); return true; };

  const list = useMemo(() => {
    const s = search.toLowerCase().trim();
    const rows = items.filter((i) => {
      const st = i.stats;
      if (s && !i.name.toLowerCase().includes(s)) return false;
      if (show === 'used') return (st?.products ?? 0) > 0;
      if (show === 'unused') return !st?.products;
      if (show === 'off') return !i.isActive;
      if (show === 'low') return (st?.lowStock ?? 0) + (st?.outOfStock ?? 0) > 0;
      return true;
    });
    const by: Record<Sort, (a: TaxonomyItem, b: TaxonomyItem) => number> = {
      sales: (a, b) => (b.stats?.revenue ?? 0) - (a.stats?.revenue ?? 0) || a.name.localeCompare(b.name),
      products: (a, b) => (b.stats?.products ?? 0) - (a.stats?.products ?? 0) || a.name.localeCompare(b.name),
      stock: (a, b) => (b.stats?.stockValue ?? 0) - (a.stats?.stockValue ?? 0),
      name: (a, b) => a.name.localeCompare(b.name),
      new: (a, b) => b.createdAt.localeCompare(a.createdAt),
    };
    return [...rows].sort(by[sort]);
  }, [items, search, show, sort]);

  const counts = useMemo(() => ({
    used: items.filter((i) => (i.stats?.products ?? 0) > 0).length,
    unused: items.filter((i) => !i.stats?.products).length,
    low: items.filter((i) => (i.stats?.lowStock ?? 0) + (i.stats?.outOfStock ?? 0) > 0).length,
    off: items.filter((i) => !i.isActive).length,
  }), [items]);

  const presets = getIndustryPresets(industryId);
  const pool: Draft[] = (config.kind === 'category' ? presets.categories : config.kind === 'brand' ? presets.brands : presets.tags) as unknown as Draft[];
  const existing = new Set(items.map((i) => i.name.toLowerCase()));
  const suggestions = q.data ? pool.filter((p) => !existing.has(String(p.name).toLowerCase())) : [];

  const save = useMutation({
    mutationFn: ({ id, draft }: { id?: string; draft: Draft }) => (id ? api.update(id, config.toPayload(draft)) : api.create(config.toPayload(draft))),
    onSuccess: (_r, v) => { toast.success(v.id ? t('Save ho gaya') : t('{{one}} ban gayi', { one: cap(t(config.one)) })); setEditing(null); refresh(); },
  });
  const toggle = useMutation({
    mutationFn: (i: TaxonomyItem) => api.update(i.id, { isActive: !i.isActive }),
    onSuccess: (_r, i) => { toast.success(i.isActive ? t('Band kar diya') : t('Chalu kar diya')); refresh(); },
  });
  const addPresets = useMutation({
    mutationFn: async (rows: Draft[]) => {
      let ok = 0;
      for (const p of rows) { try { await api.create(config.toPayload(p)); ok++; } catch { /* already there */ } }
      return ok;
    },
    onSuccess: (ok) => { toast.success(t('{{ok}} {{value}} add ho gaye', { ok, value: t(config.title).toLowerCase() })); refresh(); },
  });

  const remove = async (rows: TaxonomyItem[]) => {
    if (needOnline()) return;
    const products = rows.reduce((s, i) => s + (i.stats?.products ?? 0), 0);
    const one = rows.length === 1 ? `"${rows[0].name}"` : `${rows.length} ${t(config.title).toLowerCase()}`;
    const message = products > 0
      ? (config.kind === 'tag'
        ? t('{{products}} products se yeh tag hat jayega. Products aur un ki sale wese hi rahegi.', { products })
        : `${t('{{products}} products bina {{one}} ke reh jayenge. Products aur un ki sale wese hi rahegi.', { products, one: t(config.one) })}\n\n${t('Behtar: mitane ki bajaye "Doosri me milayein" se products kisi aur {{one}} me le jayein.', { one: t(config.one) })}`)
      : t('Is me koi product nahi — seedha mit jayegi.');
    if (!(await confirm({ title: t('{{one}} mitayein?', { one }), message, tone: 'danger', confirmLabel: t('Mitayein') }))) return;
    let ok = 0;
    for (const i of rows) { try { await api.remove(i.id); ok++; } catch { /* counted below */ } }
    if (ok < rows.length) toast.error(t('{{value}} nahi mitin', { value: rows.length - ok })); else toast.success(t('{{ok}} mita di gayin', { ok }));
    setSelected(new Set());
    refresh();
  };

  const pick = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const productsOf = (i: TaxonomyItem | 'none') => router.push(`/products?${config.productParam}=${i === 'none' ? 'none' : i.id}` as never);
  const maxRevenue = Math.max(1, ...items.map((i) => i.stats?.revenue ?? 0));
  const linked = totals ? totals.totalProducts - totals.unlinked : 0;
  const selecting = selected.size > 0;

  const SHOWS: Array<{ value: Show; label: string; count?: number }> = [
    { value: 'all', label: t('Sab'), count: items.length },
    { value: 'used', label: t('Products wali'), count: counts.used },
    { value: 'unused', label: t('Khaali'), count: counts.unused },
    { value: 'low', label: t('Kam ya khatam stock'), count: counts.low },
    ...(config.canSwitchOff ? [{ value: 'off' as const, label: t('Band'), count: counts.off }] : []),
  ];

  const summary = (
    <View style={{ gap: th.space(3) }}>
      <ChipGroup options={PRESETS.map((p) => ({ value: p.value, label: t(p.label) }))} value={preset} onChange={setPreset} style={{ marginHorizontal: -th.space(4) }} />
      {totals && (
        <Row gap={2}>
          <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={config.icon} label={t('Kul {{value}}', { value: t(config.title).toLowerCase() })} value={<Text size="xl" weight="bold">{totals.count}</Text>}
            hint={config.canSwitchOff ? t('{{active}} chalu', { active: totals.active }) : undefined} />
          <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Package} tone="success" label={t('Sale (is period)')} value={<Amount value={totals.revenue} size="lg" weight="bold" compact />}
            hint={t('Products jure hue') + ` ${linked}/${totals.totalProducts}`} />
        </Row>
      )}
      {totals && !costHidden && (
        <Text size="xs" tone="muted">{t('Stock ki qeemat')}: {cost(totals.stockValue)}</Text>
      )}
      {cached.fromCache && cached.updatedAt && <Text size="xs" tone="muted">{t('Last updated {{time}}', { time: formatRelative(cached.updatedAt) })}</Text>}
      {totals && totals.unlinked > 0 && (
        <Card tone="warning" onPress={config.noneFilter ? () => productsOf('none') : undefined}>
          <Row gap={2} align="start">
            <AlertTriangle size={18} color={th.colors.warning.text} />
            <Text size="sm" style={{ flex: 1 }}>{`${totals.unlinked} ${t('products ki koi {{one}} nahi — reports me alag nahi dikhenge.', { one: t(config.one) })}`}</Text>
          </Row>
        </Card>
      )}
      {suggestions.length > 0 && (
        <Card title={t('{{name}} ke liye mashware', { name: t(identity.label) })}
          action={<Button size="sm" variant="secondary" loading={addPresets.isPending} onPress={() => { if (!needOnline()) addPresets.mutate(suggestions); }}>{t('Sab add karein ({{count}})', { count: suggestions.length })}</Button>}>
          <Row gap={1.5} wrap>
            {suggestions.slice(0, 24).map((p) => (
              <Chip key={String(p.name)} icon={Plus} label={`${p.icon ? `${p.icon} ` : ''}${p.name}`} disabled={addPresets.isPending}
                onPress={() => { if (!needOnline()) addPresets.mutate([p]); }} />
            ))}
          </Row>
        </Card>
      )}
      <Row gap={2}>
        <SearchBar value={search} onChangeText={setSearch} placeholder={t('{{one}} search…', { one: cap(t(config.one)) })} style={{ flex: 1 }} />
        <IconButton icon={ArrowDownUp} label={t('Sort')} variant="soft" size="lg" onPress={() => setSortOpen(true)} />
      </Row>
      <ChipGroup options={SHOWS} value={show} onChange={setShow} style={{ marginHorizontal: -th.space(4) }} />
      {selecting && (
        <Card tone="brand">
          <Row gap={2}>
            <Text weight="semibold" style={{ flex: 1 }}>{t('{{size}} chuni', { size: selected.size })}</Text>
            <Button size="sm" variant="ghost" onPress={() => setSelected(new Set(list.map((i) => i.id)))}>{t('Sab')}</Button>
            <Button size="sm" variant="ghost" onPress={() => setSelected(new Set())}>{t('Hatayein')}</Button>
            <Button size="sm" variant="danger" icon={Trash2} onPress={() => void remove(items.filter((i) => selected.has(i.id)))}>{t('Mitayein')}</Button>
          </Row>
        </Card>
      )}
    </View>
  );

  return (
    <>
      <ListTemplate
        title={t(config.title)}
        subtitle={t(identity.label)}
        summary={summary}
        data={list}
        loading={q.isLoading}
        error={q.data ? undefined : q.error}
        onRetry={q.refetch}
        refreshing={q.isRefetching}
        onRefresh={q.refetch}
        keyExtractor={(i) => i.id}
        renderItem={({ item: i }) => {
          const s = i.stats;
          const on = selected.has(i.id);
          return (
            <SwipeRow enabled={!selecting} end={[
              { icon: Pencil, label: t('Badlein'), tone: 'brand', onPress: () => { if (!needOnline()) setEditing(i); } },
              { icon: GitMerge, label: t('Milayein'), tone: 'info', onPress: () => { if (!needOnline()) setMerging(i); } },
              { icon: Trash2, label: t('Mitayein'), tone: 'danger', onPress: () => void remove([i]) },
            ]}>
              <ListRow
                leading={(
                  <View>
                    <ItemAvatar item={i} />
                    {on && <View style={{ position: 'absolute', top: -4, end: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: th.colors.brand.solid, alignItems: 'center', justifyContent: 'center' }}><Check size={12} color={th.colors.brand.onSolid} /></View>}
                  </View>
                )}
                selected={on}
                title={<Row gap={1.5}><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{i.name}</Text>{i.isFeatured && <Text tone="warning">★</Text>}{!i.isActive && <Badge>{t('Band')}</Badge>}</Row>}
                subtitle={(
                  <View style={{ gap: 4 }}>
                    <Text size="xs" tone="muted">
                      {[t('{{value}} products', { value: s?.products ?? 0 }), s?.outOfStock ? t('{{outOfStock}} khatam', { outOfStock: s.outOfStock }) : null, s?.lowStock ? t('{{lowStock}} kam', { lowStock: s.lowStock }) : null].filter(Boolean).join(' · ')}
                    </Text>
                    <View style={{ height: 4, borderRadius: 2, backgroundColor: th.colors.surfaceMuted, overflow: 'hidden' }}>
                      <View style={{ height: 4, width: `${((s?.revenue ?? 0) / maxRevenue) * 100}%`, backgroundColor: i.color || hashColor(i.name) }} />
                    </View>
                  </View>
                )}
                trailing={(
                  <View style={{ alignItems: 'flex-end' }}>
                    <Amount value={s?.revenue ?? 0} size="sm" weight="bold" compact />
                    <Text size="2xs" tone="muted">{costHidden ? t('Sale') : `${t('Stock')} ${formatPKR(s?.stockValue ?? 0)}`}</Text>
                  </View>
                )}
                onPress={() => (selecting ? pick(i.id) : setMenu(i))}
                onLongPress={() => pick(i.id)}
              />
            </SwipeRow>
          );
        }}
        empty={(
          <EmptyState icon={config.icon} title={items.length ? t('Is filter me kuch nahi') : t('Abhi koi {{one}} nahi', { one: t(config.one) })}
            message={items.length ? t('Filter ya search badlein') : t('Upar mashware se ya "Nayi" dabakar banayein')}
            action={!items.length ? <Button icon={Plus} onPress={() => setEditing('new')}>{t('Nayi {{one}}', { one: t(config.one) })}</Button> : undefined} />
        )}
        fab={{ icon: Plus, label: t('Nayi {{one}}', { one: t(config.one) }), onPress: () => { if (!needOnline()) setEditing('new'); } }}
      />

      <ActionSheet open={!!menu} onClose={() => setMenu(null)} title={menu?.name} actions={menu ? [
        { icon: Pencil, label: t('Badlein'), onPress: () => { if (!needOnline()) setEditing(menu); } },
        { icon: Package, label: t('Products dekhein'), onPress: () => productsOf(menu) },
        { icon: GitMerge, label: t('Doosri me milayein'), onPress: () => { if (!needOnline()) setMerging(menu); } },
        { icon: menu.isActive ? EyeOff : Eye, label: menu.isActive ? t('Band karein') : t('Chalu karein'), hidden: !config.canSwitchOff, onPress: () => { if (!needOnline()) toggle.mutate(menu); } },
        { icon: Check, label: t('Chunein'), onPress: () => pick(menu.id) },
        { icon: Trash2, label: t('Mitayein'), destructive: true, onPress: () => void remove([menu]) },
      ] : []} />

      <Sheet open={sortOpen} onClose={() => setSortOpen(false)} title={t('Sort')}>
        {([['sales', t('Sab se zyada sale')], ['products', t('Sab se zyada products')], ['stock', t('Stock ki qeemat')], ['name', t('Naam (A–Z)')], ['new', t('Naye pehle')]] as const).map(([v, label]) => (
          <ListRow key={v} title={label} dense selected={sort === v} trailing={sort === v ? <Check size={18} color={th.colors.brand.solid} /> : undefined}
            onPress={() => { setSort(v); setSortOpen(false); }} />
        ))}
      </Sheet>

      {editing && <EditorSheet config={config} item={editing === 'new' ? null : editing} busy={save.isPending} onClose={() => setEditing(null)}
        onSave={(draft) => save.mutate({ id: editing === 'new' ? undefined : editing.id, draft })} />}
      {merging && <MergeSheet config={config} from={merging} items={items} onClose={() => setMerging(null)} onDone={() => { setMerging(null); refresh(); }} />}
    </>
  );
}

function EditorSheet({ config, item, busy, onClose, onSave }: { config: TaxonomyConfig; item: TaxonomyItem | null; busy: boolean; onClose: () => void; onSave: (d: Draft) => void }) {
  const th = useTheme();
  const kinds = useCategoryKinds();
  const [d, setD] = useState<Draft>(() => (item ? { ...item } : { name: '', color: COLORS[0], icon: '', isActive: true }));
  const [more, setMore] = useState(() => !!(d.dealerCode || d.supportPhone || d.warrantyPolicy || d.serviceCenter || d.authorizedDealer));
  const [uploading, setUploading] = useState(false);
  const set = (k: string, v: unknown) => setD((x) => ({ ...x, [k]: v }));
  const name = String(d.name ?? '').trim();
  const text = (label: string, k: string, extra: { placeholder?: string; hint?: string; ltr?: boolean; keyboardType?: 'url' | 'phone-pad' | 'email-address' } = {}) => (
    <Input label={label} value={String(d[k] ?? '')} onChangeText={(v) => set(k, v)} maxLength={300} placeholder={extra.placeholder} hint={extra.hint} ltr={extra.ltr} keyboardType={extra.keyboardType} autoCapitalize={extra.ltr ? 'none' : undefined} />
  );
  const uploadLogo = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (res.canceled || !res.assets[0]) return;
    setUploading(true);
    try {
      const a = res.assets[0];
      const rec = await uploadsApiFor().single({ uri: a.uri, name: a.fileName || 'logo.png', type: a.mimeType || 'image/png' }, { purpose: 'brand-logo' });
      set('logoUrl', rec.url);
    } catch { toast.error(t('Tasveer upload nahi hui')); } finally { setUploading(false); }
  };
  return (
    <Sheet open onClose={onClose} title={item ? t('{{one}} badlein', { one: cap(t(config.one)) }) : t('Nayi {{one}}', { one: t(config.one) })}
      footer={<Row gap={2}>
        <Button variant="secondary" style={{ flex: 1 }} onPress={onClose}>{t('Rehne dein')}</Button>
        <Button style={{ flex: 1 }} loading={busy} disabled={!name} onPress={() => onSave({ ...d, name })}>{item ? t('Save karein') : t('Banayein')}</Button>
      </Row>}>
      <View style={{ gap: th.space(4) }}>
        <Row gap={3} align="end">
          <ItemAvatar size={52} item={{ name: name || '?', color: config.color ? (d.color as string) : undefined, icon: config.emoji ? (d.icon as string) : undefined, logoUrl: d.logoUrl as string }} />
          <Input containerStyle={{ flex: 1 }} label={t('Naam')} value={String(d.name ?? '')} onChangeText={(v) => set('name', v)} maxLength={80} autoFocus={!item}
            placeholder={t('{{one}} ka naam', { one: cap(t(config.one)) })} />
        </Row>
        {config.kind === 'category' && kinds && (
          <Select label={t('Kis qisam ka maal (marzi)')} value={(d.kind as string | null | undefined) || null} onChange={(v) => set('kind', v || null)}
            options={[{ value: '', label: t('Kuch aur / chunna nahi') }, ...kinds.map((k) => ({ value: k.value, label: t(k.label) }))]}
            hint={t('Is category ke products isi qisam ke maane jate hain (sub-category bhi)')} />
        )}
        {config.color && (
          <View style={{ gap: th.space(2) }}>
            <Text size="sm" weight="semibold">{t('Rang')}</Text>
            <Row gap={2} wrap>
              {COLORS.map((c) => (
                <PressableScale key={c} onPress={() => set('color', c)} accessibilityLabel={c} accessibilityState={{ selected: d.color === c }}
                  style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c, borderWidth: d.color === c ? 3 : 0, borderColor: th.colors.text }} />
              ))}
            </Row>
          </View>
        )}
        {config.emoji && (
          <View style={{ gap: th.space(2) }}>
            <Text size="sm" weight="semibold">{t('Nishani (emoji)')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: th.space(1.5) }}>
              <Chip label={t('Koi nahi')} selected={!d.icon} onPress={() => set('icon', '')} />
              {EMOJIS.map((em) => (
                <PressableScale key={em} onPress={() => set('icon', em)} accessibilityState={{ selected: d.icon === em }}
                  style={{ width: 40, height: 40, borderRadius: th.radius('md'), alignItems: 'center', justifyContent: 'center', backgroundColor: d.icon === em ? th.colors.brand.soft : th.colors.surfaceMuted, borderWidth: d.icon === em ? 2 : 0, borderColor: th.colors.brand.solid }}>
                  <RNText style={{ fontSize: 20 }}>{em}</RNText>
                </PressableScale>
              ))}
            </ScrollView>
          </View>
        )}
        {config.brandFields && (
          <>
            {text(t('Logo ka link'), 'logoUrl', { placeholder: 'https://…/logo.png', hint: t('Brand list aur bill par dikhta hai'), ltr: true, keyboardType: 'url' })}
            <Row gap={2}>
              <Button size="sm" variant="secondary" icon={Upload} loading={uploading} onPress={() => void uploadLogo()}>{t('Logo upload karein')}</Button>
              {!!d.logoUrl && <Button size="sm" variant="ghost" icon={X} onPress={() => set('logoUrl', '')}>{t('Hatayein')}</Button>}
            </Row>
            {text(t('Website'), 'website', { placeholder: 'https://…', ltr: true, keyboardType: 'url' })}
            <TextArea label={t('Details')} value={String(d.description ?? '')} onChangeText={(v) => set('description', v)} maxLength={500} />
            <Checkbox label={t('Khaas brand')} description={t('List mein upar dikhega')} value={!!d.isFeatured} onChange={(v) => set('isFeatured', v)} />
            <ListRow icon={Sparkles} title={t('Dealer, warranty aur service')} chevron onPress={() => setMore((m) => !m)} dense />
            {more && (
              <View style={{ gap: th.space(3) }}>
                {text(t('Mulk'), 'countryOfOrigin', { placeholder: t('Japan, China…') })}
                {text(t('Dealer code'), 'dealerCode', { hint: t('Company ki taraf se mila code'), ltr: true })}
                {text(t('Support phone'), 'supportPhone', { placeholder: '0800-…', ltr: true, keyboardType: 'phone-pad' })}
                {text(t('Support email'), 'supportEmail', { ltr: true, keyboardType: 'email-address' })}
                {text(t('Service center'), 'serviceCenter', { placeholder: t('Pata ya naam'), hint: t('Warranty claim par customer ko yahi batayein') })}
                <TextArea label={t('Warranty ki shartein')} value={String(d.warrantyPolicy ?? '')} onChangeText={(v) => set('warrantyPolicy', v)} maxLength={1000} />
                <Checkbox label={t('Authorized dealer')} value={!!d.authorizedDealer} onChange={(v) => set('authorizedDealer', v)} />
                <Checkbox label={t('Installation shamil')} value={!!d.installationIncluded} onChange={(v) => set('installationIncluded', v)} />
                <Checkbox label={t('Demo shamil')} value={!!d.demoIncluded} onChange={(v) => set('demoIncluded', v)} />
              </View>
            )}
          </>
        )}
        {item && config.canSwitchOff && <Switch label={t('Chalu')} value={d.isActive !== false} onChange={(v) => set('isActive', v)} />}
      </View>
    </Sheet>
  );
}

function MergeSheet({ config, from, items, onClose, onDone }: { config: TaxonomyConfig; from: TaxonomyItem; items: TaxonomyItem[]; onClose: () => void; onDone: () => void }) {
  const th = useTheme();
  const [q, setQ] = useState('');
  const [into, setInto] = useState('');
  const api = taxonomyApi(config.kind);
  const options = items.filter((i) => i.id !== from.id && i.name.toLowerCase().includes(q.toLowerCase().trim()));
  const target = items.find((i) => i.id === into);
  const mut = useMutation({ mutationFn: () => api.merge(from.id, into), onSuccess: (r) => { toast.success(r.message); onDone(); } });
  return (
    <Sheet open onClose={onClose} title={t('"{{name}}" ko milayein', { name: from.name })}
      description={t('Is ke {{value}} products chuni hui {{one}} me chale jayenge, phir "{{name}}" mit jayegi.', { value: from.stats?.products ?? 0, one: t(config.one), name: from.name })}
      footer={<Row gap={2}>
        <Button variant="secondary" style={{ flex: 1 }} onPress={onClose}>{t('Rehne dein')}</Button>
        <Button style={{ flex: 1 }} icon={GitMerge} loading={mut.isPending} disabled={!into} onPress={() => mut.mutate()}>{t('Milayein')}</Button>
      </Row>}>
      <View style={{ gap: th.space(2) }}>
        <SearchBar value={q} onChangeText={setQ} placeholder={t('Search…')} />
        {options.map((i) => (
          <ListRow key={i.id} leading={<ItemAvatar item={i} size={34} />} title={i.name} dense selected={into === i.id}
            subtitle={t('{{value}} products', { value: i.stats?.products ?? 0 })} trailing={into === i.id ? <Check size={18} color={th.colors.brand.solid} /> : undefined}
            onPress={() => setInto(i.id)} />
        ))}
        {!options.length && <Text tone="muted" align="center">{t('Koi aur {{one}} nahi', { one: t(config.one) })}</Text>}
        {target && <Card tone="brand"><Text size="sm">{`${from.name} → ${target.name}`}</Text></Card>}
      </View>
    </Sheet>
  );
}

/* ───────────── the three pages ───────────── */

const categoryPayload = (d: Draft) => ({ name: d.name, color: d.color, icon: d.icon || '', isActive: d.isActive ?? true, kind: d.kind ?? null });
const TEXT = ['description', 'logoUrl', 'website', 'countryOfOrigin', 'dealerCode', 'supportPhone', 'supportEmail', 'warrantyPolicy', 'serviceCenter'] as const;
const FLAGS = ['isActive', 'isFeatured', 'authorizedDealer', 'installationIncluded', 'demoIncluded'] as const;
const brandPayload = (d: Draft) => ({
  name: d.name,
  ...Object.fromEntries(TEXT.filter((k) => d[k] != null).map((k) => [k, String(d[k]).trim()])),
  ...Object.fromEntries(FLAGS.filter((k) => d[k] != null).map((k) => [k, !!d[k]])),
});

export function CategoriesScreen() {
  return <TaxonomyScreen config={{ kind: 'category', title: msg('Categories'), one: msg('category'), icon: Layers, productParam: 'categoryId', noneFilter: true, canSwitchOff: true, color: true, emoji: true, toPayload: categoryPayload }} />;
}
export function BrandsScreen() {
  return <TaxonomyScreen config={{ kind: 'brand', title: msg('Brands'), one: msg('brand'), icon: Sparkles, productParam: 'brandId', canSwitchOff: true, brandFields: true, toPayload: brandPayload }} />;
}
export function TagsScreen() {
  return <TaxonomyScreen config={{ kind: 'tag', title: msg('Tags'), one: msg('tag'), icon: Tag, productParam: 'tagId', color: true, toPayload: (d) => ({ name: d.name, color: d.color }) }} />;
}
