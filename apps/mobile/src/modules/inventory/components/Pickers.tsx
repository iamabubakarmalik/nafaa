/**
 * Small pickers shared by the inventory and purchasing screens: branch,
 * category, brand and tags. Branches, categories and brands come from the
 * phone's mirror (offline); tags from the server (last list kept offline).
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronDown, FolderTree, MapPin, Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { t } from '@/core/i18n';
import { useOfflineList } from '@/core/offline';
import { Button, EmptyState, Field, Icon, Input, ListRow, PressableScale, SearchBar, Select, Sheet, Text, toast, useTheme, type SelectOption } from '@/design';
import { categoriesApi, tagsApi, type Category, type Tag } from '../api/taxonomy';
import { INV, useOnline } from '../lib/shared';

export interface BranchRow { id: string; name: string; type?: string; isMain?: boolean; isActive?: boolean }

export function useBranches() {
  const q = useOfflineList<BranchRow>('shop');
  const list = useMemo(() => (q.data ?? []).filter((s) => s.isActive !== false), [q.data]);
  return { ...q, data: list };
}

export function useCategories() {
  return useOfflineList<{ id: string; name: string; color?: string | null; isActive?: boolean }>('category');
}

export function useBrands() {
  return useOfflineList<{ id: string; name: string; isActive?: boolean }>('brand');
}

export function useTags() {
  return useQuery({ queryKey: [INV, 'tags', 'list'], queryFn: () => tagsApi.list<Tag>(), staleTime: 5 * 60_000 });
}

export function BranchSelect({ value, onChange, label, exclude, error, hint }: {
  value: string | null | undefined;
  onChange: (id: string) => void;
  label?: string;
  exclude?: string | null;
  error?: string | null;
  hint?: string;
}) {
  const { data } = useBranches();
  const options: SelectOption[] = data.filter((s) => s.id !== exclude).map((s) => ({
    value: s.id, label: s.name, icon: MapPin, description: s.type && s.type !== 'SHOP' ? t(s.type === 'WAREHOUSE' ? 'Godaam' : s.type) : s.isMain ? t('Main branch') : undefined,
  }));
  return <Select label={label ?? t('Branch')} value={value ?? null} onChange={onChange} options={options} error={error} hint={hint} />;
}

export interface CategoryNode { id: string; name: string; parentId: string | null; path: string; color?: string | null }

/**
 * Every category as a flat list with its parent and "Parent › Child" path.
 * The server list has the tree; without internet the phone's flat copy is used.
 */
export function useCategoryTree() {
  const mirror = useCategories();
  const q = useQuery({ queryKey: [INV, 'categories', 'tree'], queryFn: () => categoriesApi.list<Category>(), staleTime: 60_000 });
  const nodes = useMemo<CategoryNode[]>(() => {
    const raw = (q.data ?? (mirror.data as unknown as Category[] | undefined) ?? []).filter((c) => c.isActive !== false);
    const byId = new Map(raw.map((c) => [c.id, c]));
    const pathOf = (c: Category, depth = 0): string => {
      const parent = c.parentId && depth < 8 ? byId.get(c.parentId) : undefined;
      return parent ? `${pathOf(parent, depth + 1)} › ${c.name}` : c.name;
    };
    return raw.map((c) => ({ id: c.id, name: c.name, parentId: c.parentId && byId.has(c.parentId) ? c.parentId : null, path: pathOf(c), color: c.color }));
  }, [q.data, mirror.data]);
  return { nodes, loading: q.isLoading && mirror.isLoading };
}

/** Ids from the top-level category down to `id`. */
export function categoryChain(nodes: CategoryNode[], id: string | null): string[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const out: string[] = [];
  let cur = id ? byId.get(id) : undefined;
  while (cur && out.length < 8) {
    out.unshift(cur.id);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return out;
}

/** One level of the category picker: a field that opens a searchable list with "new" at the top. */
function CategoryLevel({ label, hint, parentId, value, nodes, onPick, noneLabel, newLabel, onChain }: {
  label: string; hint?: string; parentId: string | null; value: string; nodes: CategoryNode[];
  onPick: (id: string) => void; noneLabel: string; newLabel: string;
  /** Picked from the search results: the whole chain is selected. */
  onChain: (id: string) => void;
}) {
  const th = useTheme();
  const online = useOnline();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const level = useMemo(() => nodes.filter((n) => n.parentId === parentId), [nodes, parentId]);
  const search = q.trim().toLowerCase();
  // Searching looks at every level of this branch and shows the full path.
  const branch = useMemo(() => {
    if (!search) return level;
    const inside = (n: CategoryNode): boolean => n.parentId === parentId || (n.parentId != null && inside(nodes.find((x) => x.id === n.parentId) ?? { ...n, parentId: null }));
    return nodes.filter((n) => inside(n) && n.path.toLowerCase().includes(search));
  }, [level, nodes, parentId, search]);
  const current = nodes.find((n) => n.id === value);

  const create = async () => {
    const trimmed = name.trim();
    if (!trimmed) { toast.error(t('Naam likhein')); return; }
    setBusy(true);
    try {
      const made = await categoriesApi.create({ name: trimmed, ...(parentId ? { parentId } : {}) });
      await qc.invalidateQueries({ queryKey: [INV, 'categories'] });
      onPick(made.id);
      setAdding(false); setName(''); setOpen(false);
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally { setBusy(false); }
  };

  return (
    <Field label={label} hint={hint}>
      <PressableScale onPress={() => { setQ(''); setAdding(false); setOpen(true); }} haptic="tap" scaleTo={0.99} accessibilityLabel={label}
        style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2), minHeight: th.control('lg'), paddingHorizontal: th.space(3.5),
          backgroundColor: th.colors.surface, borderRadius: th.radius('lg'), borderWidth: 1, borderColor: th.colors.borderStrong }}>
        <Text size="md" tone={current ? 'default' : 'subtle'} numberOfLines={1} style={{ flex: 1 }}>{current?.name ?? t('Chunein')}</Text>
        <Icon icon={ChevronDown} size={18} tone="muted" />
      </PressableScale>
      <Sheet open={open} onClose={() => setOpen(false)} title={label}>
        <SearchBar value={q} onChangeText={setQ} style={{ marginBottom: th.space(2) }} />
        <View style={{ marginHorizontal: -th.space(4) }}>
          {online && (adding ? (
            <View style={{ paddingHorizontal: th.space(4), paddingBottom: th.space(3), gap: th.space(2) }}>
              <Input label={newLabel} value={name} onChangeText={setName} autoFocus returnKeyType="done" onSubmitEditing={() => void create()} />
              <Button fullWidth loading={busy} onPress={() => void create()}>{t('Banayein')}</Button>
            </View>
          ) : (
            <ListRow title={newLabel} icon={Plus} iconTone="brand" onPress={() => { setName(search ? q.trim() : ''); setAdding(true); }} />
          ))}
          <ListRow title={noneLabel} icon={FolderTree} selected={!value} trailing={!value ? <Icon icon={Check} size={20} tone="brand" strokeWidth={2.6} /> : undefined}
            onPress={() => { onPick(''); setOpen(false); }} />
          {branch.map((n) => {
            const on = n.id === value;
            return (
              <ListRow key={n.id} title={n.name} subtitle={n.path !== n.name ? n.path : undefined} icon={FolderTree} iconTone={on ? 'brand' : 'neutral'} selected={on}
                trailing={on ? <Icon icon={Check} size={20} tone="brand" strokeWidth={2.6} /> : undefined}
                onPress={() => { if (search && n.parentId !== parentId) onChain(n.id); else onPick(n.id); setOpen(false); }} />
            );
          })}
          {branch.length === 0 && <EmptyState compact title={t('Kuch nahi mila')} />}
        </View>
      </Sheet>
    </Field>
  );
}

/**
 * Category picker, any depth: pick a top-level category, then a
 * "Sub-category" row lists its children (and can add one). The product keeps
 * the deepest category picked. Search matches every level and shows the path.
 */
export function CategorySelect({ value, onChange, hint }: { value: string | null; onChange: (id: string | null) => void; hint?: string }) {
  const { nodes } = useCategoryTree();
  const chain = useMemo(() => categoryChain(nodes, value), [nodes, value]);
  const known = value == null || chain.length > 0;
  // Rows: the top level, then one more below every picked category.
  const rows = known ? [null, ...chain] : [null];
  return (
    <View style={{ gap: 12 }}>
      {rows.map((parentId, i) => (
        <CategoryLevel key={parentId ?? 'top'} parentId={parentId} nodes={nodes} value={chain[i] ?? ''}
          label={i === 0 ? t('Category') : t('Sub-category')} hint={i === 0 ? hint : undefined}
          noneLabel={i === 0 ? t('Koi nahi') : t('Koi sub-category nahi')} newLabel={i === 0 ? t('+ Nayi category') : t('+ Nayi sub-category')}
          onPick={(id) => onChange(id || parentId)}
          onChain={(id) => onChange(id)} />
      ))}
    </View>
  );
}

export function BrandSelect({ value, onChange, hint }: { value: string | null; onChange: (id: string | null) => void; hint?: string }) {
  const { data = [] } = useBrands();
  const options: SelectOption[] = [{ value: '', label: t('Koi nahi') }, ...data.filter((b) => b.isActive !== false).map((b) => ({ value: b.id, label: b.name }))];
  return <Select label={t('Brand')} value={value ?? ''} onChange={(v) => onChange(v || null)} options={options} hint={hint} searchable />;
}

export function TagsSelect({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const { data = [] } = useTags();
  const options: SelectOption[] = data.map((g) => ({ value: g.id, label: `#${g.name}` }));
  if (!options.length) return null;
  return <Select multiple label={t('Tags')} value={value} onChange={onChange} options={options} searchable />;
}
