/**
 * Brands (companies) for hardware: Lucky, DG Khan, Amreli, Master, ICI…
 * These are the shop's product brands — the same list the item editor and
 * product filters use — with the dealer's phone for reordering.
 */

import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Award, Download, Edit3, EyeOff, GraduationCap, ListChecks, Package, Phone, Plus, RotateCcw, Star } from 'lucide-react';
import {
  Button, FilterBar, FilterChip, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Skeleton, Switch, Textarea, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { brandsApi, type Brand, type UpsertBrandPayload } from '@modules/inventory/brands/api/brands.api';
import { usePageKeys } from '../hooks/usePageKeys';
import { errorText } from '../lib/meta';

type Tab = 'active' | 'featured' | 'off' | 'all';
const SUGGEST = ['Lucky Cement', 'DG Khan Cement', 'Bestway', 'Amreli Steel', 'Mughal Steel', 'Dadex', 'Master', 'Porta', 'ICI Dulux', 'Berger', 'Nippon', 'Pak Fan', 'Faisal Ceramics', 'Sonex'];

export default function BrandsPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('active');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<{ brand?: Brand; name?: string } | null>(null);
  const { data = [], isLoading, isFetching } = useQuery({ queryKey: ['brands', 'hardware'], queryFn: () => brandsApi.list() });
  usePageKeys(searchRef, { n: () => setForm({}) });

  const toggle = useMutation({
    mutationFn: (b: Brand) => brandsApi.update(b.id, { name: b.name, isActive: !b.isActive }),
    onSuccess: (b) => { qc.invalidateQueries({ queryKey: ['brands'] }); toast.success(b.isActive ? `${b.name} dobara chalu` : `${b.name} band — purana maal waisa hi`); },
    onError: (e) => toast.error(errorText(e, 'Nahi hua')),
  });

  const term = search.trim().toLowerCase();
  const match = (b: Brand) => (tab === 'active' ? b.isActive : tab === 'featured' ? b.isActive && !!b.isFeatured : tab === 'off' ? !b.isActive : true);
  const rows = useMemo(() => data.filter((b) => match(b) && (!term || [b.name, b.dealerCode, b.supportPhone, b.countryOfOrigin].some((v) => (v ?? '').toLowerCase().includes(term))))
    .sort((a, b) => Number(!!b.isFeatured) - Number(!!a.isFeatured) || (b._count?.products ?? 0) - (a._count?.products ?? 0) || a.name.localeCompare(b.name)), [data, tab, term]); // eslint-disable-line react-hooks/exhaustive-deps
  const counts = { active: data.filter((b) => b.isActive).length, featured: data.filter((b) => b.isActive && b.isFeatured).length, off: data.filter((b) => !b.isActive).length, all: data.length };
  const items = data.reduce((s, b) => s + (b._count?.products ?? 0), 0);
  const missing = SUGGEST.filter((s) => !data.some((b) => b.name.toLowerCase() === s.toLowerCase())).slice(0, 8);

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Brands — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Award, color: '#a16207', title: 'Company banayein', text: 'Har company ek baar — item banate waqt Brand me chunein. Products ki list brand se filter hoti hai.' },
            { icon: Phone, color: '#16a34a', title: 'Dealer ka phone', text: 'Dealer ka number likhein — mangwana ho to yahin se call.' },
            { icon: EyeOff, color: '#64748b', title: 'Band karein', text: 'Jo company ab nahi rakhte use band karein; purane item aur bill waise hi rehte hain.' },
          ]}
          shortcuts={[['/', 'search'], ['N', 'naya brand'], ['G', 'guide']]} />
      )}

      <PageHero title="Brands" chip={`${counts.active} chalu`} busy={isFetching && !isLoading} loading={isLoading}
        meta="Companies jin ka maal rakhte hain — item editor aur filter me yahi"
        actions={<>
          <button type="button" onClick={() => downloadCsv('brands.csv', [['Brand', 'Items', 'Dealer code', 'Dealer phone', 'Mulk', 'Chalu'], ...rows.map((b) => [b.name, b._count?.products ?? 0, b.dealerCode, b.supportPhone, b.countryOfOrigin, b.isActive ? 'Haan' : 'Nahi'])])} className={heroButton}><Download className="h-4 w-4" />CSV</button>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <button type="button" onClick={() => setForm({})} className={heroPrimaryButton}><Plus className="h-4 w-4" />Naya brand</button>
        </>}
        stats={[{ label: 'Chalu brands', value: String(counts.active) }, { label: 'In ke items', value: String(items) }]} />

      <KpiRow cols={4}>
        {isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={Award} color="#a16207" label="Chalu" value={counts.active} onClick={() => setTab('active')} active={tab === 'active'} />
            <KpiCard icon={Star} color="#d97706" label="Khaas (upar)" value={counts.featured} onClick={() => setTab('featured')} active={tab === 'featured'} />
            <KpiCard icon={EyeOff} color="#64748b" label="Band" value={counts.off} onClick={() => setTab('off')} active={tab === 'off'} />
            <KpiCard icon={Package} color="#2563eb" label="Items" value={items} />
          </>
        )}
      </KpiRow>

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Brand, dealer code ya phone…" />}
        chips={search.trim() ? <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip> : undefined} onClear={() => setSearch('')} />

      <ViewTabs value={tab} onChange={setTab} tabs={[
        { id: 'active', label: 'Chalu', icon: Award, count: counts.active }, { id: 'featured', label: 'Khaas', icon: Star, count: counts.featured },
        { id: 'off', label: 'Band', icon: EyeOff, count: counts.off }, { id: 'all', label: 'Sab', icon: ListChecks, count: counts.all },
      ]} />

      {!isLoading && missing.length > 0 && tab === 'active' && !term && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/80">
          <span className="mr-1 text-[0.8125rem] font-medium text-slate-600">Jaldi jorein:</span>
          {missing.map((n) => <button key={n} type="button" onClick={() => setForm({ name: n })} className="inline-flex h-7 items-center gap-1 rounded-full bg-slate-100 px-2.5 text-[0.75rem] font-semibold text-slate-700 hover:bg-brand-50 hover:text-brand-800"><Plus className="h-3 w-3" />{n}</button>)}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      ) : rows.length === 0 ? (
        <section className="flex flex-col items-center rounded-3xl bg-white px-6 py-16 text-center shadow-sm ring-1 ring-slate-200/80">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><Award className="h-7 w-7" /></span>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">{term ? 'Is search me koi brand nahi' : 'Is list me koi brand nahi'}</h3>
          <button type="button" onClick={() => setForm({})} className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-[0.875rem] font-semibold text-brand-fg"><Plus className="h-4 w-4" />Naya brand</button>
        </section>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {rows.map((b) => (
            <div key={b.id} className={cn('flex flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80', !b.isActive && 'opacity-60')}>
              <div className="flex items-start gap-3">
                {b.logoUrl ? <img src={b.logoUrl} alt="" className="h-10 w-10 rounded-lg object-contain ring-1 ring-slate-200" />
                  : <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-[0.9375rem] font-bold text-amber-800">{b.name.slice(0, 2).toUpperCase()}</span>}
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 truncate font-semibold text-slate-900">{b.name}{b.isFeatured && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}</p>
                  <p className="truncate text-[0.75rem] text-slate-500">{b._count?.products ?? 0} items{b.countryOfOrigin ? ` · ${b.countryOfOrigin}` : ''}</p>
                </div>
              </div>
              {(b.supportPhone || b.dealerCode) && (
                <p className="mt-2 flex items-center gap-1 truncate text-[0.75rem] text-slate-600"><Phone className="h-3 w-3" />{[b.supportPhone, b.dealerCode && `Code ${b.dealerCode}`].filter(Boolean).join(' · ')}</p>
              )}
              <div className="mt-3 flex gap-1 border-t border-slate-100 pt-2">
                <button type="button" onClick={() => setForm({ brand: b })} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[0.75rem] font-semibold text-slate-700 hover:bg-slate-100"><Edit3 className="h-3.5 w-3.5" />Badlein</button>
                <button type="button" onClick={() => toggle.mutate(b)} className="ml-auto inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[0.75rem] font-semibold text-slate-600 hover:bg-slate-100">
                  {b.isActive ? <><EyeOff className="h-3.5 w-3.5" />Band</> : <><RotateCcw className="h-3.5 w-3.5" />Chalu</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {form && <BrandModal brand={form.brand} name={form.name} onClose={() => setForm(null)} />}
    </PageShell>
  );
}

function BrandModal({ brand, name, onClose }: { brand?: Brand; name?: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState<UpsertBrandPayload>({
    name: brand?.name ?? name ?? '', countryOfOrigin: brand?.countryOfOrigin ?? 'Pakistan', dealerCode: brand?.dealerCode ?? '',
    supportPhone: brand?.supportPhone ?? '', description: brand?.description ?? '', isFeatured: !!brand?.isFeatured,
  });
  const [error, setError] = useState('');
  const save = useMutation({
    mutationFn: () => {
      const body = { ...f, name: f.name.trim(), dealerCode: f.dealerCode?.trim() || undefined, supportPhone: f.supportPhone?.trim() || undefined, description: f.description?.trim() || undefined };
      return brand ? brandsApi.update(brand.id, body) : brandsApi.create(body);
    },
    onSuccess: (b) => { qc.invalidateQueries({ queryKey: ['brands'] }); toast.success(`${b.name} save`); onClose(); },
    onError: (e) => toast.error(errorText(e, 'Brand save nahi hua')),
  });
  const submit = () => {
    if (f.name.trim().length < 2) return setError('Brand ka naam likhein');
    if (f.supportPhone?.trim() && !/^[0-9+\-\s]{10,15}$/.test(f.supportPhone.trim())) return setError('Phone theek likhein');
    setError('');
    save.mutate();
  };
  return (
    <Modal open onClose={onClose} size="md" title={brand ? `${brand.name} badlein` : 'Naya brand'}
      footer={<><Button variant="secondary" onClick={onClose}>Wapas</Button><Button loading={save.isPending} onClick={submit}>Save</Button></>}>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-3">
        <Input label="Naam" required data-autofocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Lucky Cement" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Dealer phone" inputMode="tel" value={f.supportPhone ?? ''} onChange={(e) => setF({ ...f, supportPhone: e.target.value })} />
          <Input label="Dealer code" value={f.dealerCode ?? ''} onChange={(e) => setF({ ...f, dealerCode: e.target.value })} />
          <Input label="Mulk" value={f.countryOfOrigin ?? ''} onChange={(e) => setF({ ...f, countryOfOrigin: e.target.value })} />
          <div className="flex items-end pb-2"><Switch checked={!!f.isFeatured} onChange={(e) => setF({ ...f, isFeatured: e.target.checked })} label="Khaas — list me upar" /></div>
        </div>
        <Textarea label="Note" rows={2} value={f.description ?? ''} onChange={(e) => setF({ ...f, description: e.target.value })} />
        {error && <p className="text-[0.8125rem] font-medium text-rose-600">{error}</p>}
      </form>
    </Modal>
  );
}
