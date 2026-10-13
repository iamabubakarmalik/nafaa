/**
 * Catalog: the customer-facing showcase for every industry. Shows products,
 * menu items, services or plans (through each industry's data source in
 * catalogConfig) with sale prices only, never cost. Filters live in the URL so
 * a copied link opens the same view. Grid, list or menu board; a full-screen
 * customer view for a counter tablet; a price list and a photo catalog to
 * print; WhatsApp sharing; and a pick list the customer can send to the shop.
 *
 * Keys: / search · V view · C customer view · L list · R refresh · G guide · Esc back.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  ArrowDownWideNarrow, Eye, Filter, GraduationCap, Images, LayoutGrid, Link2, List, ListChecks, Maximize, MessageCircle,
  MousePointerClick, Package, Phone, Plus, Printer, RefreshCw, Search, Share2, Sparkles, Star, Store, UtensilsCrossed, Wallet, X,
} from 'lucide-react';
import {
  Button, FilterBar, FilterChip, FilterMenu, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton, type FilterOption,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print';
import { printHtml } from '@core/receipt/print';
import { useReceiptSetup } from '@core/receipt/setup';
import { useAuthStore } from '@core/stores/auth.store';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { cn } from '@core/lib/cn';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { catalogConfigFor, facetLabel } from '../catalogConfig';
import { photoCatalogHtml, priceListDoc } from '../catalogPrint';
import { useCatalogCart } from '../hooks/useCatalogCart';
import { useShowcase, type Showcase, type SortBy } from '../useShowcase';
import type { CatalogConfig, CatalogEntry, CatalogMode } from '../types';
import { EntryCard, EntryRow, MenuBoard } from '../components/EntryViews';
import { EntryDetail } from '../components/EntryDetail';
import { PickList } from '../components/PickList';

const SORTS: Array<FilterOption<SortBy>> = [
  { value: 'featured', label: 'Khaas pehle' },
  { value: 'new', label: 'Naye pehle' },
  { value: 'name', label: 'Naam (A–Z)' },
  { value: 'priceLow', label: 'Sastay pehle' },
  { value: 'priceHigh', label: 'Mehngay pehle' },
];
const MODES: Record<CatalogMode, { icon: typeof LayoutGrid; label: string }> = {
  grid: { icon: LayoutGrid, label: 'Cards' },
  list: { icon: List, label: 'List' },
  menu: { icon: UtensilsCrossed, label: 'Menu' },
};

const band = (lo: number, hi: number) => (hi === Infinity ? `${formatPKR(lo)} se upar` : lo === 0 ? `${formatPKR(hi)} tak` : `${formatPKR(lo)} – ${formatPKR(hi)}`);

export default function CatalogPage() {
  const industry = useCurrentIndustry();
  const config = useMemo(() => catalogConfigFor(industry?.id), [industry?.id]);
  return <Showroom key={industry?.id ?? 'shop'} config={config} />;
}

function Showroom({ config }: { config: CatalogConfig }) {
  const s = useShowcase(config);
  const cart = useCatalogCart();
  const guide = usePageGuide();
  const tenantName = useAuthStore((st) => st.tenant?.name);
  const branch = useAuthStore((st) => st.user?.assignedShop?.name);
  const { data: setup } = useReceiptSetup();
  const shop = setup?.shop ?? { name: tenantName || 'Dukaan' };
  const accent = setup?.design.accent ?? '#0f766e';
  const shopPhone = shop.whatsapp || shop.phone;
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState<CatalogEntry | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const showStock = config.stock !== false;
  const listLabel = config.listLabel ?? 'Pasand list';

  const pick = useCallback((e: CatalogEntry, variant?: { id: string; name: string; price: number; imageUrl?: string | null } | null) => {
    cart.addItem({
      productId: e.id, variantId: variant?.id, name: e.name, variantName: variant?.name,
      image: variant?.imageUrl || e.image || undefined, price: variant?.price ?? e.price, unit: e.per ?? '', quantity: 1,
    });
    toast.success(`${e.name} — ${listLabel} me`, { action: { label: 'Dekhein', onClick: () => setListOpen(true) } });
  }, [cart, listLabel]);
  const picked = (id: string) => cart.items.some((i) => i.productId === id);

  const filterLine = [s.section.label, s.f.cat && s.categories.find((c) => c.id === s.f.cat)?.name, s.search.trim() && `"${s.search.trim()}"`].filter(Boolean).join(' · ');

  const shareLink = async () => {
    const url = window.location.href;
    if (navigator.share) { await navigator.share({ title: `${shop.name} — ${config.title}`, url }).catch(() => undefined); return; }
    await navigator.clipboard?.writeText(url);
    toast.success('Link copy ho gaya — filter bhi saath hain');
  };
  const shareWhatsApp = () => {
    const rows = s.items.slice(0, 40).map((e) => `• ${e.name} — ${e.priceNote ?? formatPKR(e.price)}${e.per && !e.priceNote ? ` / ${e.per}` : ''}`);
    const text = [
      `*${shop.name}* — ${config.title}`, filterLine, '', ...rows,
      ...(s.items.length > 40 ? [`…aur ${s.items.length - 40} ${config.noun}`] : []),
      ...(shopPhone ? ['', `Rabta: ${shopPhone}`] : []),
    ].join('\n');
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  };
  const printPhotos = () => {
    if (!s.items.length) { toast.error(`Koi ${config.noun} nahi`); return; }
    printHtml(photoCatalogHtml(s.items, { title: config.title, subtitle: `${filterLine} · ${s.items.length} ${config.noun}`, shop, accent }));
  };

  const cycleMode = useCallback(() => s.setMode(config.modes[(config.modes.indexOf(s.mode) + 1) % config.modes.length]), [s, config.modes]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isDialogOpen()) return;
      if (e.key === 'Escape' && s.customer && !isTyping()) { s.setCustomer(false); return; }
      if (isTyping()) return;
      const k = e.key.toLowerCase();
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      else if (k === 'v') cycleMode();
      else if (k === 'c') s.setCustomer(!s.customer);
      else if (k === 'l') setListOpen(true);
      else if (k === 'r') void s.refresh();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [s, cycleMode]);

  const dialogs = (
    <>
      {open && <EntryDetail entry={open} shop={shop.name} showStock={showStock} onClose={() => setOpen(null)} onPick={(v) => { pick(open, v); setOpen(null); }} />}
      {listOpen && <PickList cart={cart} title={listLabel} shop={shop.name} shopPhone={shopPhone} onClose={() => setListOpen(false)} />}
      {guide.isOpen && <CatalogGuide config={config} onClose={guide.close} />}
      {cart.items.length > 0 && !listOpen && (
        <button type="button" onClick={() => setListOpen(true)}
          className="fixed bottom-5 right-5 z-[91] inline-flex h-12 items-center gap-2 rounded-full bg-slate-900 px-5 text-[0.875rem] font-semibold text-white shadow-xl transition hover:bg-slate-800 print:hidden">
          <ListChecks className="h-4 w-4" />{listLabel} · {cart.items.length}<span className="text-white/70">{formatPKR(cart.subtotal)}</span>
        </button>
      )}
    </>
  );

  const content = <Results s={s} config={config} showStock={showStock} picked={picked} onOpen={setOpen} onPick={(e) => pick(e)} />;

  if (s.customer) {
    return (
      <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-50">
        {dialogs}
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
            {shop.logoUrl
              ? <img src={shop.logoUrl} alt="" className="h-11 w-11 shrink-0 rounded-xl object-contain" />
              : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white"><Store className="h-5 w-5" /></span>}
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold text-slate-900">{shop.name}</h1>
              <p className="truncate text-[0.75rem] text-slate-500">{config.tagline ?? config.title} · {s.items.length} {config.noun}</p>
            </div>
            {shopPhone && <a href={`tel:${shopPhone}`} className="hidden h-10 items-center gap-1.5 rounded-xl bg-slate-100 px-3 text-[0.8125rem] font-semibold text-slate-700 sm:inline-flex"><Phone className="h-4 w-4" />{shopPhone}</a>}
            <button type="button" onClick={() => void document.documentElement.requestFullscreen?.().catch(() => undefined)} title="Poori screen" className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><Maximize className="h-4 w-4" /></button>
            <button type="button" onClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); s.setCustomer(false); }} title="Wapas (Esc)"
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-slate-900 px-3 text-[0.8125rem] font-semibold text-white"><X className="h-4 w-4" />Band</button>
          </div>
        </header>
        <div className="mx-auto max-w-7xl space-y-4 p-4 pb-24">
          <SearchField ref={searchRef} value={s.search} onChange={s.setSearch} placeholder={`${config.title} me search…`} />
          <CustomerFilters s={s} config={config} />
          {content}
        </div>
      </div>
    );
  }

  const priceValue = s.f.min || s.f.max ? `${s.f.min || 0}-${s.f.max}` : 'all';
  return (
    <PageShell>
      {dialogs}
      <PageHero
        title={config.title}
        chip={<><Package />{s.loading ? '…' : `${s.stats.total} ${config.noun}`}</>}
        busy={s.fetching && !s.loading}
        meta={`${config.label} · ${branch ?? shop.name} · cost kabhi nahi dikhti`}
        loading={s.loading}
        actions={<>
          <button type="button" onClick={shareWhatsApp} disabled={!s.items.length} className={heroButton}><MessageCircle className="h-4 w-4" /><span className="hidden sm:inline">WhatsApp</span></button>
          <button type="button" onClick={() => void shareLink()} title="Link copy / share" className={heroIconButton}><Share2 className="h-4 w-4" /></button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={() => priceListDoc(s.items, `${config.title} — rate list`, filterLine)} disabled={!s.items.length} label="Rate list" /></span>
          <button type="button" onClick={printPhotos} title="Photo wala catalog (A4)" className={heroButton}><Images className="h-4 w-4" /><span className="hidden sm:inline">Photo catalog</span></button>
          <button type="button" onClick={() => void s.refresh()} title="Taaza karein (R)" className={heroIconButton}><RefreshCw className={cn('h-4 w-4', s.fetching && 'animate-spin')} /></button>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <button type="button" onClick={() => s.setCustomer(true)} title="Customer ko dikhayein (C)" className={heroPrimaryButton}><Eye className="h-4 w-4" />Customer view</button>
        </>}
        stats={[
          { label: `Kul ${config.noun}`, value: s.stats.total, hint: showStock ? `${s.stats.inStock} mojood` : undefined },
          { label: 'Khaas', value: s.stats.featured },
          { label: 'Category', value: s.stats.categories },
          { label: 'Rate', value: s.stats.high ? `${formatPKR(s.stats.low)} – ${formatPKR(s.stats.high)}` : '—' },
        ]}
      />

      <FilterBar
        search={<SearchField ref={searchRef} value={s.search} onChange={s.setSearch} placeholder="Naam, code, brand ya details…" label={`${config.title} search`} />}
        onClear={s.clear}
        chips={s.hasFilters ? <>
          {s.f.cat && <FilterChip onRemove={() => s.set('cat', '')}>{s.categories.find((c) => c.id === s.f.cat)?.name ?? 'Category'}</FilterChip>}
          {s.f.brand && <FilterChip onRemove={() => s.set('brand', '')}>{s.f.brand}</FilterChip>}
          {(config.facets ?? []).filter((d) => s.f.facet[d.key]).map((d) => (
            <FilterChip key={d.key} onRemove={() => s.setFacet(d.key, '')}>{d.label}: {facetLabel(d.labels, s.f.facet[d.key])}</FilterChip>
          ))}
          {(s.f.min || s.f.max) && <FilterChip onRemove={() => s.setPrice('', '')}>{band(Number(s.f.min || 0), s.f.max ? Number(s.f.max) : Infinity)}</FilterChip>}
          {s.f.featured && <FilterChip onRemove={s.toggleFeatured}>Sirf khaas</FilterChip>}
          {s.f.stock && <FilterChip onRemove={s.toggleStock}>Sirf mojood</FilterChip>}
          {(config.quick ?? []).filter((q) => s.f.quick.includes(q.id)).map((q) => <FilterChip key={q.id} onRemove={() => s.toggleQuick(q.id)}>{q.label}</FilterChip>)}
          {s.search.trim() && <FilterChip onRemove={() => s.setSearch('')}>"{s.search.trim()}"</FilterChip>}
        </> : undefined}>
        {s.categories.length > 0 && (
          <FilterMenu icon={Filter} label="Category" value={s.f.cat || 'all'} active={!!s.f.cat} width="w-72"
            options={[{ value: 'all', label: 'Sab category' }, ...s.categories.map((c) => ({ value: c.id, label: c.name, hint: `${c.count}`, color: c.color }))]}
            onChange={(v) => s.set('cat', v === 'all' ? '' : v)} />
        )}
        {s.brands.length > 1 && (
          <FilterMenu icon={Sparkles} label="Brand" value={s.f.brand || 'all'} active={!!s.f.brand}
            options={[{ value: 'all', label: 'Sab brand' }, ...s.brands.map((b) => ({ value: b.id, label: b.id, hint: `${b.count}` }))]}
            onChange={(v) => s.set('brand', v === 'all' ? '' : v)} />
        )}
        {(config.facets ?? []).map((d) => (s.facetValues[d.key]?.length ?? 0) > 0 && (
          <FilterMenu key={d.key} icon={d.icon} label={d.label} value={s.f.facet[d.key] || 'all'} active={!!s.f.facet[d.key]} width="w-64"
            options={[{ value: 'all', label: 'Sab' }, ...s.facetValues[d.key].map((x) => ({ value: x.id, label: facetLabel(d.labels, x.id), hint: `${x.count}` }))]}
            onChange={(v) => s.setFacet(d.key, v === 'all' ? '' : v)} />
        ))}
        <FilterMenu icon={Wallet} label="Rate" value={priceValue} active={priceValue !== 'all'} width="w-72"
          options={[{ value: 'all', label: 'Har rate' }, ...(config.priceBands ?? []).map(([lo, hi]) => ({ value: `${lo}-${hi === Infinity ? '' : hi}`, label: band(lo, hi) }))]}
          onChange={(v) => { if (v === 'all') s.setPrice('', ''); else { const [lo, hi] = v.split('-'); s.setPrice(lo === '0' ? '' : lo, hi); } }}
          footer={() => (
            <div className="mt-1 grid grid-cols-2 gap-2 border-t border-slate-100 p-2 pt-3">
              {(['min', 'max'] as const).map((k) => (
                <label key={k} className="text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
                  {k === 'min' ? 'Kam se kam' : 'Zyada se zyada'}
                  <input type="number" min={0} inputMode="numeric" value={s.f[k]} onChange={(e) => s.set(k, e.target.value)}
                    className="mt-1 block h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-[0.8125rem] font-normal normal-case tracking-normal text-slate-900" />
                </label>
              ))}
            </div>
          )} />
        <FilterMenu icon={ArrowDownWideNarrow} label="Sort" value={s.sort} options={SORTS} onChange={s.setSort} align="right" width="w-56" />
        <button type="button" onClick={s.toggleFeatured} title="Sirf khaas"
          className={cn('flex h-11 w-11 items-center justify-center rounded-2xl transition', s.f.featured ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-200' : 'bg-slate-100/80 text-slate-500 hover:bg-slate-200/70')}>
          <Star className={cn('h-4 w-4', s.f.featured && 'fill-current')} />
        </button>
        {showStock && (
          <button type="button" onClick={s.toggleStock} title="Sirf mojood"
            className={cn('h-11 rounded-2xl px-3 text-[0.8125rem] font-semibold transition', s.f.stock ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200' : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70')}>
            Mojood
          </button>
        )}
        <ModeSwitch modes={config.modes} value={s.mode} onChange={s.setMode} />
      </FilterBar>

      <ViewTabs value={s.section.id} onChange={s.setSection}
        tabs={config.sections.map((x) => ({ id: x.id, label: x.label, icon: x.icon, count: x.id === s.section.id && !s.loading ? s.items.length : null }))}
        right={<QuickChips s={s} config={config} />} />

      {content}
    </PageShell>
  );
}

function ModeSwitch({ modes, value, onChange }: { modes: CatalogMode[]; value: CatalogMode; onChange: (m: CatalogMode) => void }) {
  if (modes.length < 2) return null;
  return (
    <div className="inline-flex rounded-2xl bg-slate-100/80 p-1" role="radiogroup" aria-label="Dikhane ka tareeqa">
      {modes.map((m) => {
        const { icon: Icon, label } = MODES[m];
        return (
          <button key={m} type="button" role="radio" aria-checked={value === m} onClick={() => onChange(m)} title={`${label} (V)`}
            className={cn('flex h-9 w-9 items-center justify-center rounded-xl transition', value === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}>
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}

function QuickChips({ s, config }: { s: Showcase; config: CatalogConfig }) {
  if (!config.quick?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {config.quick.map((q) => {
        const on = s.f.quick.includes(q.id);
        return (
          <button key={q.id} type="button" onClick={() => s.toggleQuick(q.id)}
            className={cn('inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[0.8125rem] font-semibold transition',
              on ? 'bg-brand-600 text-white shadow-sm' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50')}>
            {q.icon && <q.icon className="h-3.5 w-3.5" />}{q.label}
          </button>
        );
      })}
    </div>
  );
}

/** Customer view filters: big touch targets, no admin menus. */
function CustomerFilters({ s, config }: { s: Showcase; config: CatalogConfig }) {
  const pill = (on: boolean) => cn('inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-[0.875rem] font-semibold transition',
    on ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200');
  return (
    <div className="space-y-2">
      {config.sections.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {config.sections.map((x) => <button key={x.id} type="button" onClick={() => s.setSection(x.id)} className={pill(s.section.id === x.id)}><x.icon className="h-4 w-4" />{x.label}</button>)}
        </div>
      )}
      {s.categories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          <button type="button" onClick={() => s.set('cat', '')} className={pill(!s.f.cat)}>Sab</button>
          {s.categories.map((c) => <button key={c.id} type="button" onClick={() => s.set('cat', c.id)} className={pill(s.f.cat === c.id)}>{c.name}</button>)}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <QuickChips s={s} config={config} />
        <div className="flex items-center gap-2">
          <FilterMenu icon={ArrowDownWideNarrow} label="Sort" value={s.sort} options={SORTS} onChange={s.setSort} align="right" width="w-56" />
          <ModeSwitch modes={config.modes} value={s.mode} onChange={s.setMode} />
        </div>
      </div>
    </div>
  );
}

function Results({ s, config, showStock, picked, onOpen, onPick }: {
  s: Showcase; config: CatalogConfig; showStock: boolean; picked: (id: string) => boolean;
  onOpen: (e: CatalogEntry) => void; onPick: (e: CatalogEntry) => void;
}) {
  if (s.loading) {
    return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">{Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}</div>;
  }
  if (s.error && !s.all.length) {
    return (
      <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
        <p className="font-semibold text-slate-900">{config.title} nahi aa saka</p>
        <p className="mt-1 text-[0.875rem] text-slate-500">{(s.error as Error).message}</p>
        <div className="mt-4"><Button onClick={() => void s.refresh()}>Dobara koshish</Button></div>
      </div>
    );
  }
  if (!s.items.length) {
    return (
      <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-16 text-center ring-1 ring-slate-200/80">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-brand-fg shadow-lg"><Package className="h-7 w-7" /></span>
        <h3 className="mt-4 text-lg font-semibold text-slate-900">{s.hasFilters ? 'Is filter me kuch nahi' : `Abhi koi ${config.noun} nahi`}</h3>
        <p className="mt-1 max-w-md text-[0.875rem] text-slate-500">{s.hasFilters ? 'Filter badal kar dekhein ya hata dein.' : `Pehle ${config.noun} daalein, phir yahan customer ko dikhayein.`}</p>
        {s.hasFilters && <div className="mt-4"><Button variant="secondary" onClick={s.clear}>Filter hatayein</Button></div>}
      </div>
    );
  }
  if (s.mode === 'menu') return <MenuBoard entries={s.items} picked={picked} onOpen={onOpen} onPick={onPick} showStock={showStock} />;
  if (s.mode === 'list') {
    return (
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        {s.items.map((e) => <EntryRow key={e.id} entry={e} showStock={showStock} picked={picked(e.id)} onOpen={() => onOpen(e)} onPick={() => onPick(e)} />)}
      </ul>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
      {s.items.map((e) => <EntryCard key={e.id} entry={e} showStock={showStock} picked={picked(e.id)} onOpen={() => onOpen(e)} onPick={() => onPick(e)} />)}
    </div>
  );
}

function CatalogGuide({ config, onClose }: { config: CatalogConfig; onClose: () => void }) {
  return (
    <PageGuide
      title={`${config.title} — aasaan tareeqa`}
      onClose={onClose}
      steps={[
        { icon: Eye, color: '#2563eb', title: 'Customer ko dikhayein', text: '"Customer view" dabayein — poori screen par sirf cheezein aur rate, baqi app chhup jati hai. Tablet counter par rakh dein.' },
        { icon: Search, color: '#7c3aed', title: 'Search aur chhaantein', text: 'Naam ya code likhein. Category, rate aur doosre filter upar hain. Jo filter lagayein wo link me bhi aa jata hai.' },
        { icon: MousePointerClick, color: '#16a34a', title: 'Details kholein', text: 'Kisi bhi card par dabayein: saari photos (← → se aage peeche), options, rate aur details. Photo par dabane se bari ho jati hai.' },
        { icon: Plus, color: '#db2777', title: `${config.listLabel ?? 'Pasand list'} banayein`, text: '+ se cheez list me daalein. Neeche kaala button list kholta hai — customer apna naam likh kar dukaan ko WhatsApp kar de.' },
        { icon: Link2, color: '#0891b2', title: 'Share karein', text: 'WhatsApp se rate list bhejein, ya link copy karein. Sirf sale rate jata hai — cost kabhi nahi.' },
        { icon: Printer, color: '#d97706', title: 'Print karein', text: '"Rate list" se seedhi list (A4, PDF ya thermal). "Photo catalog" se photos wala A4 catalog, dukaan ke naam aur logo ke saath.' },
      ]}
      tips={['Dukaan ka naam, logo aur phone Settings → Bill design se aate hain.', 'Rate badalne ke liye maal ya service khol kar edit karein — yahan sirf dikhta hai.']}
      shortcuts={[['/', 'dhoondein'], ['V', 'view'], ['C', 'customer view'], ['L', 'list'], ['R', 'taaza'], ['G', 'guide'], ['Esc', 'wapas']]}
    />
  );
}
