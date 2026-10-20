/**
 * Sports products on the shared products page: sport and type on each
 * card, team rate, Sale (below MRP), New and Pro marks, and sizes with
 * their stock for kits and shoes. Older sports brands are moved to the
 * shop's brand list once per session.
 */

import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgePercent, Shirt, Sparkles, Users, Wrench } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { heroButton } from '@/design-system/components';
import { ProductsPage } from '@modules/inventory/products/list/ProductsPage';
import type { CatalogItem } from '@modules/inventory/products/list/api';
import type { ProductsPageConfig } from '@modules/inventory/products/list/types';
import { sportsProductsApi, type SportsMeta } from '../api/products.api';
import { META_KEY, typeLabel } from '../components/meta';

function HeroLinks() {
  return (
    <>
      <Link to="/sports/team-orders" className={heroButton}><Users className="h-4 w-4" /><span className="hidden sm:inline">Team orders</span></Link>
      <Link to="/sports/repair-services" className={heroButton}><Wrench className="h-4 w-4" /><span className="hidden sm:inline">Repairs</span></Link>
    </>
  );
}

function SizeStrip({ item }: { item: CatalogItem }) {
  if (!item.hasVariants || !item.variants.length) return null;
  const shown = item.variants.slice(0, 7);
  return (
    <span className="flex flex-wrap gap-1">
      {shown.map((v) => (
        <span key={v.id} className={cn('rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold tabular-nums ring-1', v.stock > 0 ? 'bg-white text-slate-700 ring-slate-200' : 'bg-rose-50 text-rose-700 ring-rose-200')}>
          {v.name} · {Math.round(v.stock)}
        </span>
      ))}
      {item.variants.length > shown.length && <span className="text-[0.6875rem] text-slate-500">+{item.variants.length - shown.length}</span>}
    </span>
  );
}

let brandsSynced = false;
function useBrandSync() {
  const qc = useQueryClient();
  const canEdit = usePermission(PERMISSIONS.PRODUCTS_EDIT);
  useEffect(() => {
    if (brandsSynced || !canEdit) return;
    brandsSynced = true;
    sportsProductsApi.syncBrands()
      .then((r) => { if (r.brands || r.products) qc.invalidateQueries({ queryKey: ['brands'] }); })
      .catch(() => { brandsSynced = false; });
  }, [canEdit, qc]);
}

export default function SportsProductsPage() {
  useBrandSync();
  const metaQ = useQuery({ queryKey: [META_KEY], queryFn: sportsProductsApi.meta, staleTime: 60_000 });
  const config = useMemo<ProductsPageConfig>(() => {
    const byId = new Map<string, SportsMeta>((metaQ.data?.items ?? []).map((m) => [m.productId, m]));
    return {
      label: 'Sports',
      noun: 'item',
      paths: { detail: (id) => `/sports-products/${id}`, edit: (id) => `/sports-products/${id}/edit`, create: '/sports-products/new' },
      HeroExtra: HeroLinks,
      filters: ['tags'],
      extras: (item) => {
        const m = byId.get(item.id);
        const price = Number(item.price);
        const off = m?.mrp && price > 0 && m.mrp > price ? Math.round(((m.mrp - price) / m.mrp) * 100) : 0;
        return {
          line: m ? [m.sport, m.categoryType ? typeLabel(m.categoryType) : null, m.teamPrice ? `Team ${formatPKR(m.teamPrice)}` : null].filter(Boolean).join(' · ') || undefined : undefined,
          badges: m && (off || m.isNewArrival || m.isProfessional) ? (
            <>
              {off > 0 && <span className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-1.5 py-0.5 text-[0.625rem] font-bold text-white"><BadgePercent className="h-3 w-3" />Sale {off}%</span>}
              {m.isNewArrival && <span className="inline-flex items-center gap-1 rounded-md bg-sky-600 px-1.5 py-0.5 text-[0.625rem] font-bold text-white"><Sparkles className="h-3 w-3" />Naya</span>}
              {m.isProfessional && <span className="rounded-md bg-slate-900/80 px-1.5 py-0.5 text-[0.625rem] font-bold text-white">Pro</span>}
            </>
          ) : undefined,
          chips: <SizeStrip item={item} />,
        };
      },
      columns: [
        { id: 'sport', label: 'Sport', cell: (i) => byId.get(i.id)?.sport || '—' },
        { id: 'team', label: 'Team rate', align: 'right', cell: (i) => { const t = byId.get(i.id)?.teamPrice; return t ? formatPKR(t) : '—'; } },
      ],
      stockChips: () => [1, 6, 12, 24, 50],
      guide: [
        { icon: Users, color: '#0d9488', title: 'Team rate', text: 'Jo item team ya school ke liye zyada bikta hai us ka team rate likhein — team order me khud lagta hai.' },
        { icon: Shirt, color: '#7c3aed', title: 'Kit ke sizes', text: 'Jersey, kit aur shoes ke har size ka stock alag. Laal size khatam ho chuka hai.' },
      ],
    };
  }, [metaQ.data]);
  return <ProductsPage config={config} />;
}
