/**
 * Stationery or art supplies: every item with its type, brand, rate and
 * stock, filtered by type and stock. Stationery sells loose or by the pack
 * or dozen (packs are set on the item's Price step). Prints as a stock or
 * order sheet.
 *
 * Keys: N new item · / search · G guide.
 */

import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { GraduationCap, Layers, Package, Palette, Pencil, Plus, School } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import {
  Button, FilterBar, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Select, SkeletonTable, Table, TBody, THead, Td, Th, Tr, ViewTabs,
  heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { PrintButton } from '@core/print';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { stationeryProfilesApi } from '../api/stationery-profiles.api';
import { artSupplyProfilesApi } from '../api/art-supply-profiles.api';
import { ART_CATEGORIES, STATIONERY_CATEGORIES, labelOf } from '../lib/meta';
import { EmptyBox, useDebounced, usePageKeys } from './ui';

type Tab = 'all' | 'mark' | 'low';
interface Row {
  id: string; productId: string; category: string; brand?: string | null; color?: string | null; size?: string | null; reorderLevel?: number;
  isSchoolItem?: boolean; isProfessional?: boolean;
  product?: { name: string; price: number; stock: number; lowStockAlert?: number | null; unit?: string };
}

const KIND = {
  STATIONERY: {
    title: 'Stationery', icon: Pencil as LucideIcon, chip: 'Copy, pen, register', meta: 'School aur office ka saman — piece, pack ya dozen',
    categories: STATIONERY_CATEGORIES, mark: 'School ka', key: 'bookstore-stationery',
    load: (search?: string, category?: string) => stationeryProfilesApi.list({ search, category }) as Promise<Row[]>,
    isMarked: (r: Row) => !!r.isSchoolItem,
  },
  ART: {
    title: 'Art supplies', icon: Palette as LucideIcon, chip: 'Rang, brush, canvas', meta: 'Art aur craft ka saman',
    categories: ART_CATEGORIES, mark: 'Professional', key: 'bookstore-art',
    load: (search?: string, category?: string) => artSupplyProfilesApi.list({ search, category }) as Promise<Row[]>,
    isMarked: (r: Row) => !!r.isProfessional,
  },
} as const;

export function SuppliesList({ kind }: { kind: keyof typeof KIND }) {
  const k = KIND[kind];
  const navigate = useNavigate();
  const canCreate = usePermission(PERMISSIONS.PRODUCTS_CREATE);
  const { sales } = useMasked();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [tab, setTab] = useState<Tab>('all');
  const term = useDebounced(search.trim(), 300);

  const q = useQuery({ queryKey: [k.key, term, category], queryFn: () => k.load(term || undefined, category || undefined) });
  const all = useMemo(() => q.data ?? [], [q.data]);
  const stock = (r: Row) => Number(r.product?.stock ?? 0);
  const low = (r: Row) => stock(r) <= Math.max(Number(r.product?.lowStockAlert ?? 0), r.reorderLevel ?? 0, 0);
  const rows = useMemo(() => all.filter((r) => tab === 'all' || (tab === 'mark' && k.isMarked(r)) || (tab === 'low' && low(r))), [all, tab, k]);
  const value = all.reduce((s, r) => s + Math.max(stock(r), 0) * Number(r.product?.price ?? 0), 0);

  usePageKeys(searchRef, canCreate ? { n: () => navigate('/bookstore-products/new') } : {});

  const doc = () => ({
    title: k.title,
    subtitle: category ? labelOf(k.categories, category) : undefined,
    sections: [{
      kind: 'table' as const,
      columns: [{ label: 'Item' }, { label: 'Type', wideOnly: true }, { label: 'Brand', wideOnly: true }, { label: 'Rate', align: 'right' as const }, { label: 'Stock', align: 'right' as const }],
      rows: rows.map((r) => [r.product?.name ?? '', labelOf(k.categories, r.category), r.brand ?? '', String(r.product?.price ?? ''), String(stock(r))]),
    }],
  });

  return (
    <PageShell>
      <PageHero
        title={k.title}
        chip={<><k.icon /> {k.chip}</>}
        meta={k.meta}
        loading={q.isLoading}
        actions={<>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canCreate && <Link to="/bookstore-products/new" title="Naya item (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Item</Link>}
        </>}
        stats={[{ label: 'Items', value: all.length }, { label: 'Stock ki value', value: sales(value) }]}
      />

      <KpiRow cols={3}>
        <KpiCard icon={k.icon} color="#0891b2" label="Sab items" value={all.length} onClick={() => setTab('all')} active={tab === 'all'} />
        <KpiCard icon={School} color="#7c3aed" label={k.mark} value={all.filter(k.isMarked).length} onClick={() => setTab('mark')} active={tab === 'mark'} />
        <KpiCard icon={Package} color="#e11d48" label="Stock kam" value={all.filter(low).length} onClick={() => setTab('low')} active={tab === 'low'} hint="Mangwane hain" />
      </KpiRow>

      <ViewTabs<Tab> tabs={[{ id: 'all', label: 'Sab' }, { id: 'mark', label: k.mark }, { id: 'low', label: 'Stock kam' }]} value={tab} onChange={setTab}
        right={<PrintButton doc={doc} disabled={!rows.length} size="sm" />} />
      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Item ka naam" label="Search" />}>
        <Select size="sm" aria-label="Type" value={category} onChange={(e) => setCategory(e.target.value)} options={[{ value: '', label: 'Har type' }, ...k.categories.map(([v, l]) => ({ value: v, label: l }))]} />
      </FilterBar>

      {q.isLoading ? <SkeletonTable /> : rows.length === 0 ? (
        <EmptyBox icon={k.icon} title={search || category ? 'Kuch nahi mila' : `Abhi koi ${k.title.toLowerCase()} nahi`}
          text="Naya item banate waqt pehle step me Stationery ya Art chunein — type aur brand wahin likhe jate hain."
          action={canCreate && !search ? <Button onClick={() => navigate('/bookstore-products/new')} leftIcon={<Plus className="h-4 w-4" />}>Item banayein</Button> : undefined} />
      ) : (
        <Table minWidth="48rem">
          <THead><Tr><Th>Item</Th><Th>Type</Th><Th>Brand</Th><Th align="right">Rate</Th><Th align="right">Stock</Th></Tr></THead>
          <TBody>
            {rows.map((r) => (
              <Tr key={r.id} interactive onClick={() => navigate(`/bookstore-products/${r.productId}`)}>
                <Td>
                  <p className="font-medium text-slate-900">{r.product?.name}</p>
                  {(r.color || r.size) && <p className="text-[0.75rem] text-slate-500">{[r.color, r.size].filter(Boolean).join(' · ')}</p>}
                </Td>
                <Td>{labelOf(k.categories, r.category)}{k.isMarked(r) && <span className="ml-1.5 rounded-md bg-violet-50 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-violet-700">{k.mark}</span>}</Td>
                <Td>{r.brand || <span className="text-slate-400">—</span>}</Td>
                <Td align="right">{sales(Number(r.product?.price ?? 0))}</Td>
                <Td align="right" className={cn('font-semibold', low(r) ? 'text-rose-600' : 'text-slate-900')}>{stock(r)} {r.product?.unit ?? ''}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
      {all.length >= 300 && <p className="px-1 text-[0.75rem] text-slate-500">Pehle 300 items dikh rahe hain — naam ya type se dhoondein.</p>}

      <p className="hidden items-center gap-1 px-1 text-[0.75rem] text-slate-500 sm:flex">{canCreate && <><Kbd>N</Kbd> naya item · </>}<Kbd>/</Kbd> search · <Kbd>G</Kbd> guide</p>

      {guide.isOpen && (
        <PageGuide title={`${k.title} — aasaan tareeqa`} onClose={guide.close}
          steps={[
            { icon: Layers, color: '#16a34a', title: 'Piece aur dozen', text: 'Item piece me rakhein aur Price step me Dozen ya Pack jorein — POS par dono tarah bikta hai, stock piece me ginta hai.' },
            { icon: Package, color: '#e11d48', title: 'Stock kam', text: '"Stock kam" wale items ki list print kar ke supplier ko order dein.' },
            { icon: School, color: '#7c3aed', title: 'School season', text: 'School list me copy aur pencil bhi jor dein — set ke saath ek dafa me bikte hain.' },
          ]}
          shortcuts={[['N', 'naya item'], ['/', 'dhoondein'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}
