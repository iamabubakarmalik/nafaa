/**
 * Market home curation (SystemSetting market:home): banners with image,
 * link, section, city and dates; featured shops shown first on the home
 * screen; and extra home sections of picked shops or products with titles
 * in three languages. Customer apps pick up a save within about 30 seconds.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, Image as ImageIcon, LayoutList, Package, Plus, Save, Sparkles, Store, Trash2, Upload } from 'lucide-react';
import { Alert, Button, Card, IconButton, Input, PageHero, PageShell, Segmented, Select, Skeleton, Switch, Tabs, confirmDialog, heroPrimaryButton } from '@/design-system/components';
import { usePageGuide } from '@core/components/PageGuide';
import { adminMarketApi, MARKET_GATES, type HomeBanner, type HomeSection, type MarketGate } from '@/api/admin-market.api';
import { uploadsApi } from '@/api/uploads.api';
import { useCan } from '@/lib/access';
import { apiError } from '@/lib/errors';
import { Empty, Pill } from '@/features/shared/kit';
import { GATE_LABEL, GuideButton, MarketGuide } from '../components/MarketUi';
import { PickedList, ProductSearch, ShopSearch, type PickedItem } from '../components/HomePickers';

type Tab = 'banners' | 'featured' | 'sections';
type Form = { banners: HomeBanner[]; featuredShopIds: string[]; sections: HomeSection[] };
const newId = () => Math.random().toString(36).slice(2, 10);
/** ISO → value for <input type="datetime-local"> in local time. */
const toLocal = (iso?: string) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : '');
const fromLocal = (v: string) => (v ? new Date(v).toISOString() : undefined);
const gateOptions = [{ value: '', label: 'Main home (no section)' }, ...MARKET_GATES.map((g) => ({ value: g, label: GATE_LABEL[g] }))];

function bannerLive(b: HomeBanner) {
  const now = Date.now();
  return b.active && (!b.startsAt || Date.parse(b.startsAt) <= now) && (!b.endsAt || Date.parse(b.endsAt) >= now);
}

function BannerCard({ b, i, count, onChange, onMove, onRemove }: {
  b: HomeBanner; i: number; count: number; onChange: (b: HomeBanner) => void; onMove: (d: -1 | 1) => void; onRemove: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const upload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error('Max size is 5 MB'); return; }
    setUploading(true);
    try {
      const r = await uploadsApi.single({ file, name: file.name, type: file.type }, { purpose: 'other' });
      onChange({ ...b, image: r.url });
    } catch (e) { toast.error(apiError(e)); } finally { setUploading(false); }
  };
  return (
    <Card>
      <div className="flex flex-col gap-4 md:flex-row">
        <button type="button" onClick={() => input.current?.click()} className="relative grid aspect-[2/1] w-full shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100 text-slate-400 ring-1 ring-slate-200 hover:ring-brand-300 md:w-64">
          {b.image ? <img src={b.image} alt="" className="h-full w-full object-cover" /> : <span className="flex flex-col items-center gap-1 text-[0.75rem]"><ImageIcon className="h-6 w-6" />Upload image (2:1)</span>}
          {uploading && <span className="absolute inset-0 grid place-items-center bg-white/70 text-[0.75rem] text-slate-700">Uploading…</span>}
        </button>
        <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ''; }} />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {bannerLive(b) ? <Pill tone="emerald">Showing now</Pill> : <Pill tone="slate">{b.active ? 'Scheduled or ended' : 'Off'}</Pill>}
            <div className="ml-auto flex items-center gap-1">
              <Switch size="sm" checked={b.active} onChange={(e) => onChange({ ...b, active: e.target.checked })} label="On" />
              <IconButton label="Upload a new image" size="sm" onClick={() => input.current?.click()}><Upload className="h-4 w-4" /></IconButton>
              <IconButton label="Move up" size="sm" onClick={() => onMove(-1)} disabled={i === 0}><ArrowUp className="h-4 w-4" /></IconButton>
              <IconButton label="Move down" size="sm" onClick={() => onMove(1)} disabled={i === count - 1}><ArrowDown className="h-4 w-4" /></IconButton>
              <IconButton label="Delete banner" size="sm" onClick={onRemove}><Trash2 className="h-4 w-4" /></IconButton>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input size="sm" label="Title (for staff and screen readers)" maxLength={120} value={b.title} onChange={(e) => onChange({ ...b, title: e.target.value })} />
            <Input size="sm" label="Link" placeholder="/shop/ali-bakers or https://…" maxLength={500} value={b.link} onChange={(e) => onChange({ ...b, link: e.target.value })} />
            <Select size="sm" label="Show in" value={b.gate ?? ''} onChange={(e) => onChange({ ...b, gate: (e.target.value || undefined) as MarketGate | undefined })} options={gateOptions} />
            <Input size="sm" label="City (empty = every city)" maxLength={80} value={b.city ?? ''} onChange={(e) => onChange({ ...b, city: e.target.value || undefined })} />
            <Input size="sm" type="datetime-local" label="Starts" value={toLocal(b.startsAt)} onChange={(e) => onChange({ ...b, startsAt: fromLocal(e.target.value) })} />
            <Input size="sm" type="datetime-local" label="Ends" value={toLocal(b.endsAt)} onChange={(e) => onChange({ ...b, endsAt: fromLocal(e.target.value) })} />
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function MarketHomePage() {
  const guide = usePageGuide();
  const can = useCan();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('banners');
  const { data, error } = useQuery({ queryKey: ['admin-market-home'], queryFn: adminMarketApi.home });
  const [f, setF] = useState<Form | null>(null);
  const [names, setNames] = useState<Record<string, PickedItem>>({});
  useEffect(() => {
    if (!data) return;
    setF({ banners: data.banners, featuredShopIds: data.featuredShopIds, sections: data.sections });
    setNames((prev) => ({
      ...prev,
      ...Object.fromEntries(data.shops.map((s) => [s.shopId, { id: s.shopId, name: s.name, sub: s.listed ? s.city : `${s.city} · not published`, imageUrl: s.logoUrl }])),
      ...Object.fromEntries(data.products.map((p) => [p.productId, { id: p.productId, name: p.name, sub: p.shop, imageUrl: p.imageUrl }])),
    }));
  }, [data]);
  const saved = useMemo(() => (data ? JSON.stringify({ banners: data.banners, featuredShopIds: data.featuredShopIds, sections: data.sections }) : ''), [data]);
  const dirty = !!f && JSON.stringify(f) !== saved;
  const canManage = can('marketplace.manage');

  const save = useMutation({
    mutationFn: (body: Form) => adminMarketApi.saveHome(body),
    onSuccess: (d) => { qc.setQueryData(['admin-market-home'], d); toast.success('Home saved. Customers see it within a minute.'); },
    onError: (e) => toast.error(apiError(e)),
  });

  if (!data || !f) {
    return (
      <PageShell>
        <PageHero title="Home & banners" loading />
        {error ? <Card><Empty>Could not load the home setup. Try again in a moment.</Empty></Card> : <Skeleton className="h-96 rounded-3xl" />}
      </PageShell>
    );
  }

  const remember = (it: PickedItem) => setNames((n) => ({ ...n, [it.id]: it }));
  const picked = (ids: string[]): PickedItem[] => ids.map((id) => names[id] ?? { id, name: 'Unknown item', sub: id });
  const setBanners = (banners: HomeBanner[]) => setF({ ...f, banners });
  const setSections = (sections: HomeSection[]) => setF({ ...f, sections });
  const moveIn = <T,>(list: T[], i: number, d: -1 | 1) => { const next = [...list]; [next[i], next[i + d]] = [next[i + d], next[i]]; return next; };
  const liveCount = f.banners.filter(bannerLive).length;

  const onSave = () => {
    const missing = f.banners.filter((b) => !b.image).length;
    if (missing) { toast.error('Every banner needs an image. Upload one or delete the banner.'); setTab('banners'); return; }
    const untitled = f.sections.filter((s) => !s.title.en.trim()).length;
    if (untitled) { toast.error('Every section needs an English title.'); setTab('sections'); return; }
    save.mutate(f);
  };
  const removeBanner = async (i: number) => {
    if (await confirmDialog({ title: 'Delete this banner?', text: 'It is removed when you save.', yes: 'Delete', danger: true })) setBanners(f.banners.filter((_, n) => n !== i));
  };
  const removeSection = async (i: number) => {
    if (await confirmDialog({ title: 'Delete this section?', text: 'It is removed from the home screen when you save.', yes: 'Delete', danger: true })) setSections(f.sections.filter((_, n) => n !== i));
  };

  return (
    <PageShell>
      <PageHero
        title="Home & banners"
        chip={dirty ? 'Unsaved changes' : undefined}
        busy={save.isPending}
        actions={
          <>
            {canManage && <button type="button" className={heroPrimaryButton} onClick={onSave} disabled={!dirty || save.isPending}><Save className="h-4 w-4" /> Save changes</button>}
            <GuideButton onClick={guide.open} />
          </>
        }
        stats={[
          { label: 'Banners showing', value: String(liveCount), hint: `${f.banners.length} in all` },
          { label: 'Featured shops', value: String(f.featuredShopIds.length) },
          { label: 'Home sections', value: String(f.sections.length) },
        ]}
      />

      {!canManage && <Alert tone="info">Your role can view the home setup but not change it.</Alert>}

      <Tabs value={tab} onChange={setTab} label="Home parts" items={[
        { value: 'banners', label: 'Banners', count: f.banners.length || undefined },
        { value: 'featured', label: 'Featured shops', count: f.featuredShopIds.length || undefined },
        { value: 'sections', label: 'Sections', count: f.sections.length || undefined },
      ]} />

      <fieldset disabled={!canManage || save.isPending} className="space-y-4">
        {tab === 'banners' && (
          <>
            {!f.banners.length && <Card><Empty>No banners yet. Add one for an offer, a new city or a featured shop.</Empty></Card>}
            {f.banners.map((b, i) => (
              <BannerCard key={b.id} b={b} i={i} count={f.banners.length}
                onChange={(nb) => setBanners(f.banners.map((x, n) => (n === i ? nb : x)))}
                onMove={(d) => setBanners(moveIn(f.banners, i, d))}
                onRemove={() => void removeBanner(i)} />
            ))}
            <Button variant="secondary" onClick={() => setBanners([...f.banners, { id: newId(), image: '', title: '', link: '', active: true }])} disabled={f.banners.length >= 20}>
              <Plus className="h-4 w-4" /> Add banner
            </Button>
          </>
        )}

        {tab === 'featured' && (
          <Card title="Featured shops" description="Shown first in the featured row on the home screen, in this order (up to 30). Only published shops appear to customers.">
            <div className="space-y-3">
              <ShopSearch picked={f.featuredShopIds} onAdd={(it) => { remember(it); setF({ ...f, featuredShopIds: [...f.featuredShopIds, it.id].slice(0, 30) }); }} />
              <PickedList icon={Store} items={picked(f.featuredShopIds)} onChange={(ids) => setF({ ...f, featuredShopIds: ids })} empty="No featured shops. The row shows Gold and Platinum shops on its own." />
            </div>
          </Card>
        )}

        {tab === 'sections' && (
          <>
            {!f.sections.length && <Card><Empty>No extra sections. Add one like “Best biryani in Lahore” with picked shops or products.</Empty></Card>}
            {f.sections.map((s, i) => {
              const set = (p: Partial<HomeSection>) => setSections(f.sections.map((x, n) => (n === i ? { ...x, ...p } : x)));
              const ids = s.type === 'shops' ? s.shopIds ?? [] : s.productIds ?? [];
              const setIds = (next: string[]) => set(s.type === 'shops' ? { shopIds: next } : { productIds: next });
              return (
                <Card key={s.id} title={s.title.en || 'New section'}
                  actions={
                    <div className="flex items-center gap-1">
                      <IconButton label="Move up" size="sm" onClick={() => setSections(moveIn(f.sections, i, -1))} disabled={i === 0}><ArrowUp className="h-4 w-4" /></IconButton>
                      <IconButton label="Move down" size="sm" onClick={() => setSections(moveIn(f.sections, i, 1))} disabled={i === f.sections.length - 1}><ArrowDown className="h-4 w-4" /></IconButton>
                      <IconButton label="Delete section" size="sm" onClick={() => void removeSection(i)}><Trash2 className="h-4 w-4" /></IconButton>
                    </div>
                  }>
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Input size="sm" label="Title in English" maxLength={80} value={s.title.en} onChange={(e) => set({ title: { ...s.title, en: e.target.value } })} />
                      <Input size="sm" label="Title in Roman Urdu" maxLength={80} value={s.title.roman} onChange={(e) => set({ title: { ...s.title, roman: e.target.value } })} />
                      <Input size="sm" label="Title in Urdu" dir="rtl" maxLength={80} value={s.title.ur} onChange={(e) => set({ title: { ...s.title, ur: e.target.value } })} />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 sm:items-end">
                      <Segmented value={s.type} label="Section shows"
                        onChange={(v) => set({ type: v, shopIds: v === 'shops' ? s.shopIds ?? [] : undefined, productIds: v === 'products' ? s.productIds ?? [] : undefined })}
                        items={[{ value: 'shops' as const, label: 'Shops' }, { value: 'products' as const, label: 'Products' }]} />
                      <Select size="sm" label="Show in" value={s.gate ?? ''} onChange={(e) => set({ gate: (e.target.value || undefined) as MarketGate | undefined })} options={gateOptions} />
                    </div>
                    {s.type === 'shops'
                      ? <ShopSearch picked={ids} onAdd={(it) => { remember(it); setIds([...ids, it.id].slice(0, 30)); }} />
                      : <ProductSearch picked={ids} onAdd={(it) => { remember(it); setIds([...ids, it.id].slice(0, 30)); }} />}
                    <PickedList icon={s.type === 'shops' ? Store : Package} items={picked(ids)} onChange={setIds} empty={`Add ${s.type} with the search above. An empty section is not shown.`} />
                  </div>
                </Card>
              );
            })}
            <Button variant="secondary" disabled={f.sections.length >= 12}
              onClick={() => setSections([...f.sections, { id: newId(), title: { en: '', roman: '', ur: '' }, type: 'shops', shopIds: [] }])}>
              <Plus className="h-4 w-4" /> Add section
            </Button>
          </>
        )}
      </fieldset>

      {guide.isOpen && (
        <MarketGuide
          search={false}
          title="Home & banners"
          description="What customers see first when they open the Market."
          flowTitle="The home screen, top to bottom"
          flow={[
            { label: 'Banners', hint: 'Offers and news', icon: ImageIcon, color: '#4f46e5' },
            { label: 'Featured', hint: 'Picked shops first', icon: Sparkles, color: '#7c3aed' },
            { label: 'Sections', hint: 'Shops or products', icon: LayoutList, color: '#0284c7' },
          ]}
          steps={[
            { icon: ImageIcon, color: '#4f46e5', title: 'Add a banner', text: 'Upload a wide image (2:1), add a link, and pick where and when it shows.' },
            { icon: Sparkles, color: '#7c3aed', title: 'Feature shops', text: 'Search and add shops; drag order with the arrows. They show before the automatic picks.' },
            { icon: LayoutList, color: '#0284c7', title: 'Build sections', text: 'Give a title in three languages and pick shops or products.' },
            { icon: Save, color: '#16a34a', title: 'Save', text: 'Nothing changes for customers until you save.' },
          ]}
          tips={['A banner with a section shows only inside that section; with a city, only to customers in that city.', 'Unpublished shops and hidden products are skipped on the customer side.']}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
