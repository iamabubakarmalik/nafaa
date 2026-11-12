'use client';

/**
 * Collection / search filters and sort. Desktop: sidebar. Phone: a bottom
 * sheet. Every change writes the URL (shareable, back button works) and the
 * server renders the new results.
 */
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Check, ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
import type { ProductList } from '@/lib/api';
import { useStore } from '../providers/StoreProvider';
import { SORTS } from './query';

type Facets = ProductList['facets'];

function useParamsUpdate() {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const set = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === '') next.delete(k);
      else next.set(k, v);
    }
    if (!('page' in changes)) next.delete('page');
    const qs = next.toString();
    start(() => router.push(qs ? `${path}?${qs}` : path, { scroll: false }));
  };
  return { sp, set, pending };
}

export function SortSelect() {
  const { t } = useStore();
  const { sp, set } = useParamsUpdate();
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{t('collection.sort')}</span>
      <select value={sp.get('sort') ?? 'featured'} onChange={(e) => set({ sort: e.target.value === 'featured' ? null : e.target.value })} className="h-11 appearance-none rounded-btn border border-line bg-bg pe-9 ps-4 text-[14px] font-medium">
        {SORTS.map((s) => (
          <option key={s} value={s}>
            {t(`collection.sort.${s.replace('_', '-')}` as 'collection.sort.featured')}
          </option>
        ))}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute end-3 text-muted" />
    </label>
  );
}

function Group({ title, children, open = true }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details className="group border-b border-line py-1" open={open}>
      <summary className="flex cursor-pointer list-none items-center justify-between py-3 text-[14px] font-semibold [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown size={16} className="transition-transform group-open:rotate-180" />
      </summary>
      <div className="pb-4">{children}</div>
    </details>
  );
}

function FilterBody({ facets }: { facets: Facets }) {
  const { t, money } = useStore();
  const { sp, set } = useParamsUpdate();
  const [min, setMin] = useState(sp.get('minPrice') ?? '');
  const [max, setMax] = useState(sp.get('maxPrice') ?? '');
  useEffect(() => {
    setMin(sp.get('minPrice') ?? '');
    setMax(sp.get('maxPrice') ?? '');
  }, [sp]);
  const toggle = (key: string, value: string) => {
    const cur = (sp.get(key) ?? '').split(',').filter(Boolean);
    const next = cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value];
    set({ [key]: next.join(',') || null });
  };
  const listGroup = (key: string, title: string, values: Facets['brands'], chips = false) =>
    values.length > 0 && (
      <Group title={title}>
        <div className={chips ? 'flex flex-wrap gap-2' : 'space-y-1'}>
          {values.map((v) => {
            const on = (sp.get(key) ?? '').split(',').includes(v.value);
            return chips ? (
              <button key={v.value} type="button" onClick={() => toggle(key, v.value)} className={`min-h-[38px] min-w-[44px] rounded-btn border px-3 text-[13px] font-medium ${on ? 'border-fg bg-fg text-bg' : 'border-line hover:border-fg/50'}`}>
                {v.label}
              </button>
            ) : (
              <button key={v.value} type="button" onClick={() => toggle(key, v.value)} className="flex w-full items-center gap-2.5 py-1.5 text-start text-[14px]">
                <span className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border ${on ? 'border-primary bg-primary text-primary-fg' : 'border-line'}`}>{on && <Check size={12} strokeWidth={3} />}</span>
                <span className="flex-1">{v.label}</span>
                <span className="text-[12px] text-muted">{v.count}</span>
              </button>
            );
          })}
        </div>
      </Group>
    );
  return (
    <div>
      <Group title={t('collection.availability')}>
        <button type="button" onClick={() => set({ available: sp.get('available') === '1' ? null : '1' })} className="flex items-center gap-2.5 text-[14px]">
          <span className={`grid h-[18px] w-[18px] place-items-center rounded-[5px] border ${sp.get('available') === '1' ? 'border-primary bg-primary text-primary-fg' : 'border-line'}`}>{sp.get('available') === '1' && <Check size={12} strokeWidth={3} />}</span>
          {t('collection.inStockOnly')}
        </button>
      </Group>
      {facets.price.max > facets.price.min && (
        <Group title={t('collection.price')}>
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              set({ minPrice: min || null, maxPrice: max || null });
            }}
          >
            <input className="field !min-h-[42px] !py-2 text-[14px]" inputMode="numeric" placeholder={money(facets.price.min)} value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ''))} onBlur={() => set({ minPrice: min || null, maxPrice: max || null })} />
            <span className="text-muted">–</span>
            <input className="field !min-h-[42px] !py-2 text-[14px]" inputMode="numeric" placeholder={money(facets.price.max)} value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ''))} onBlur={() => set({ minPrice: min || null, maxPrice: max || null })} />
          </form>
        </Group>
      )}
      {listGroup('size', 'Size', facets.sizes, true)}
      {listGroup('color', 'Colour', facets.colors, true)}
      {listGroup('category', 'Category', facets.categories)}
      {listGroup('brand', 'Brand', facets.brands)}
    </div>
  );
}

function useActive() {
  const { sp, set, pending } = useParamsUpdate();
  const active = ['brand', 'category', 'size', 'color', 'minPrice', 'maxPrice', 'available'].filter((k) => sp.get(k));
  const clear = () => set(Object.fromEntries(active.map((k) => [k, null])));
  return { active, clear, pending };
}

export function FilterSidebar({ facets }: { facets: Facets }) {
  const { t } = useStore();
  const { active, clear, pending } = useActive();
  return (
    <aside className={`hidden lg:block ${pending ? 'opacity-60' : ''}`}>
      <div className="sticky top-28">
        <div className="flex items-center justify-between pb-2">
          <span className="text-[13px] font-semibold uppercase tracking-wider">{t('collection.filter')}</span>
          {active.length > 0 && (
            <button type="button" onClick={clear} className="text-[13px] underline">
              {t('collection.clear')}
            </button>
          )}
        </div>
        <FilterBody facets={facets} />
      </div>
    </aside>
  );
}

export function FilterSheetButton({ facets, total }: { facets: Facets; total: number }) {
  const { t } = useStore();
  const { active, clear } = useActive();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-11 items-center gap-2 rounded-btn border border-line px-4 text-[14px] font-medium lg:hidden">
        <SlidersHorizontal size={16} /> {t('collection.filter')}
        {active.length > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-fg">{active.length}</span>}
      </button>
      {open && (
        <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true">
          <button type="button" aria-label={t('nav.close')} className="absolute inset-0 animate-fade-in bg-black/45" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[88vh] animate-rise flex-col rounded-t-[20px] bg-bg">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <span className="text-[16px] font-semibold">{t('collection.filter')}</span>
              <button type="button" className="icon-btn -me-2" onClick={() => setOpen(false)} aria-label={t('nav.close')}>
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5">
              <FilterBody facets={facets} />
            </div>
            <div className="flex gap-3 border-t border-line px-5 py-4">
              <button type="button" className="btn btn-outline flex-1" onClick={clear}>
                {t('collection.clear')}
              </button>
              <button type="button" className="btn btn-primary flex-1" onClick={() => setOpen(false)}>
                {t('collection.apply', { n: total })}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
