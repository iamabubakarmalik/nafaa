/**
 * Small pickers shared by the inventory and purchasing screens: branch,
 * category, brand and tags. Branches, categories and brands come from the
 * phone's mirror (offline); tags from the server (last list kept offline).
 */

import { useQuery } from '@tanstack/react-query';
import { MapPin } from 'lucide-react-native';
import { useMemo } from 'react';
import { t } from '@/core/i18n';
import { useOfflineList } from '@/core/offline';
import { Select, type SelectOption } from '@/design';
import { tagsApi, type Tag } from '../api/taxonomy';
import { INV } from '../lib/shared';

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

export function CategorySelect({ value, onChange, hint }: { value: string | null; onChange: (id: string | null) => void; hint?: string }) {
  const { data = [] } = useCategories();
  const options: SelectOption[] = [{ value: '', label: t('Koi nahi') }, ...data.filter((c) => c.isActive !== false).map((c) => ({ value: c.id, label: c.name }))];
  return <Select label={t('Category')} value={value ?? ''} onChange={(v) => onChange(v || null)} options={options} hint={hint} searchable />;
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
