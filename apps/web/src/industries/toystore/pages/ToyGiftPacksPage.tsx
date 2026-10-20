/**
 * Gift packs: two or more toys sold together at one price (Eid box,
 * birthday hamper). Active packs inside their dates show on the counter's
 * Combos tab; selling one takes each toy out of stock and shares the pack
 * price over them, so profit stays per toy. A pack is switched off, never
 * erased.
 *
 * Keys: N new · / search · G guide.
 */

import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarClock, Copy, Gift, GraduationCap, Moon, Package, Pencil, Plus, Power, Scissors, ShoppingCart, Sparkles, Star } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import {
  Button, FilterBar, Input, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Skeleton, ViewTabs, heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { PrintButton } from '@core/print';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { PRODUCTS_KEY } from '@modules/pos/engine';
import { packBody, toyGiftPacksApi, type ToyGiftPack } from '../api/gift-packs.api';
import { toyProductsApi, type GiftWrap } from '../api/products.api';
import { AGE_GROUPS, KEYS, OCCASIONS, apiError, labelOf } from '../lib/meta';
import { ConfirmModal, EmptyBox, cardAction, cardDanger, cardLink, usePageKeys } from '../components/ui';

type Tab = 'live' | 'season' | 'off';

/** On the counter now: switched on and inside its dates. */
function isLive(p: ToyGiftPack, now = Date.now()) {
  return p.isActive && (!p.validFrom || new Date(p.validFrom).getTime() <= now) && (!p.validUntil || new Date(p.validUntil).getTime() >= now);
}

/** Whole packs the shelf can make from current stock. */
function buildable(p: ToyGiftPack): number {
  const per = p.items.map((i) => (i.quantity > 0 ? Math.floor(Number(i.product?.stock ?? 0) / i.quantity) : 0));
  return per.length ? Math.max(Math.min(...per), 0) : 0;
}

const day = (v?: string) => (v ? new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '');

export default function ToyGiftPacksPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const canEdit = usePermission(PERMISSIONS.PRODUCTS_EDIT);
  const canSell = usePermission(PERMISSIONS.POS_USE);
  const { sales } = useMasked();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>('live');
  const [off, setOff] = useState<ToyGiftPack | null>(null);
  const [wrapOpen, setWrapOpen] = useState(false);
  const wrapQ = useQuery({ queryKey: ['toy-gift-wrap'], queryFn: () => toyProductsApi.giftWrap(), enabled: canEdit, staleTime: 60_000 });
  const wrap = wrapQ.data;

  const listQ = useQuery({ queryKey: [KEYS.packs, 'all'], queryFn: () => toyGiftPacksApi.list() });
  const all = useMemo(() => listQ.data ?? [], [listQ.data]);
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((p) => (tab === 'off' ? !p.isActive : tab === 'season' ? p.isActive && p.isSeasonal : p.isActive)
      && (!q || [p.name, p.occasion, p.seasonName, ...p.items.map((i) => i.product?.name)].some((v) => v?.toLowerCase().includes(q))));
  }, [all, search, tab]);
  const live = all.filter((p) => isLive(p));
  const short = live.filter((p) => buildable(p) === 0);

  const refresh = () => [KEYS.packs, KEYS.posPacks].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const switchOff = useMutation({
    mutationFn: (p: ToyGiftPack) => toyGiftPacksApi.remove(p.id),
    onSuccess: () => { refresh(); setOff(null); toast.success('Pack band ho gaya — counter par nahi dikhega'); },
    onError: (e) => toast.error(apiError(e, 'Band nahi hua')),
  });
  const switchOn = useMutation({
    mutationFn: (p: ToyGiftPack) => toyGiftPacksApi.update(p.id, packBody(p, { isActive: true })),
    onSuccess: () => { refresh(); toast.success('Pack phir counter par'); },
    onError: (e) => toast.error(apiError(e, 'Chalu nahi hua')),
  });
  const copy = useMutation({
    mutationFn: (p: ToyGiftPack) => toyGiftPacksApi.duplicate(p.id),
    onSuccess: (p) => { refresh(); toast.success('Copy ban gayi (band) — badal kar chalu karein'); navigate(`/toystore/gift-packs/${p.id}/edit`); },
    onError: (e) => toast.error(apiError(e, 'Copy nahi bani')),
  });

  usePageKeys(searchRef, canEdit ? { n: () => navigate('/toystore/gift-packs/new') } : {});

  const doc = () => ({
    title: 'Gift packs',
    subtitle: tab === 'off' ? 'Band' : tab === 'season' ? 'Season wale' : 'Chalu',
    sections: [{
      kind: 'table' as const,
      columns: [{ label: 'Pack' }, { label: 'Khilone', wideOnly: true }, { label: 'Asal', align: 'right' as const }, { label: 'Pack', align: 'right' as const }, { label: 'Bane', align: 'right' as const }],
      rows: rows.map((p) => [p.name, p.items.map((i) => `${i.product?.name ?? '—'} x${i.quantity}`).join(', '), String(p.originalPrice), String(p.giftPackPrice), String(buildable(p))]),
    }],
  });

  return (
    <PageShell>
      <PageHero
        title="Gift packs"
        chip={<><Gift /> Eid aur saalgirah</>}
        meta="Kai khilone ek qeemat par — counter ke Combos tab se bikte hain"
        loading={listQ.isLoading}
        actions={<>
          {canEdit && <button type="button" onClick={() => setWrapOpen(true)} className={heroButton}><Scissors className="h-4 w-4" /><span className="hidden sm:inline">{wrap?.isActive ? `Gift wrap ${sales(wrap.price)}` : 'Gift wrap'}</span></button>}
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canEdit && <Link to="/toystore/gift-packs/new" title="Naya pack (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Pack</Link>}
        </>}
        stats={[{ label: 'Counter par', value: live.length }, { label: 'Ab tak bike', value: all.reduce((s, p) => s + p.totalSold, 0) }]}
      />

      <KpiRow cols={4}>
        <KpiCard icon={Gift} color="#db2777" label="Chalu" value={all.filter((p) => p.isActive).length} onClick={() => setTab('live')} active={tab === 'live'} />
        <KpiCard icon={Moon} color="#16a34a" label="Season (Eid)" value={all.filter((p) => p.isActive && p.isSeasonal).length} onClick={() => setTab('season')} active={tab === 'season'} />
        <KpiCard icon={Package} color="#e11d48" label="Stock nahi" value={short.length} hint="Ek bhi pack nahi banta" onClick={() => setTab('live')} />
        <KpiCard icon={Power} color="#64748b" label="Band" value={all.filter((p) => !p.isActive).length} onClick={() => setTab('off')} active={tab === 'off'} />
      </KpiRow>

      <ViewTabs<Tab> tabs={[{ id: 'live', label: 'Chalu' }, { id: 'season', label: 'Season' }, { id: 'off', label: 'Band' }]} value={tab} onChange={setTab}
        right={<PrintButton doc={doc} disabled={!rows.length} size="sm" />} />
      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Pack ya khilone ka naam" label="Search" />} />

      {listQ.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyBox icon={Gift} title={search ? 'Koi pack nahi mila' : tab === 'off' ? 'Koi band pack nahi' : 'Abhi koi gift pack nahi'}
          text="Do ya zyada khilone chun kar ek qeemat rakhein — Eid aur saalgirah par jaldi bikta hai aur purana stock bhi nikalta hai."
          action={canEdit && !search && tab !== 'off' ? <Button onClick={() => navigate('/toystore/gift-packs/new')} leftIcon={<Plus className="h-4 w-4" />}>Pack banayein</Button> : undefined} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((p) => {
            const can = buildable(p);
            const on = isLive(p);
            return (
              <article key={p.id} className={cn('flex flex-col rounded-2xl bg-white p-4 ring-1 ring-slate-200/80', !p.isActive && 'opacity-70')}>
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-pink-600"><Gift className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1">
                    <h3 className="flex items-center gap-1.5 truncate font-semibold text-slate-900">{p.isFeatured && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}{p.name}</h3>
                    <p className="truncate text-[0.75rem] text-slate-500">
                      {[labelOf(OCCASIONS, p.occasion), labelOf(AGE_GROUPS, p.targetAgeGroup), p.isSeasonal && p.seasonName].filter(Boolean).join(' · ') || `${p.itemCount} khilone`}
                    </p>
                  </div>
                  <span className={cn('shrink-0 rounded-md px-2 py-0.5 text-[0.6875rem] font-semibold ring-1',
                    on ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : p.isActive ? 'bg-amber-50 text-amber-800 ring-amber-200' : 'bg-slate-100 text-slate-500 ring-slate-200')}>
                    {on ? 'Counter par' : p.isActive ? 'Tareekh se bahar' : 'Band'}
                  </span>
                </div>
                <ul className="mt-3 space-y-1 text-[0.8125rem] text-slate-700">
                  {p.items.slice(0, 4).map((i, n) => (
                    <li key={`${i.productId}-${n}`} className="flex justify-between gap-2"><span className="truncate">{i.product?.name ?? 'Khilona nahi mila'} × {i.quantity}</span><span className="shrink-0 tabular-nums text-slate-500">{sales(i.unitPrice * i.quantity)}</span></li>
                  ))}
                  {p.items.length > 4 && <li className="text-[0.75rem] text-slate-500">+{p.items.length - 4} aur</li>}
                </ul>
                <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-[0.75rem]">
                  <div><dt className="text-slate-500">Pack</dt><dd className="text-[0.9375rem] font-bold tabular-nums text-slate-900">{sales(p.giftPackPrice)}</dd></div>
                  <div><dt className="text-slate-500">Bachat</dt><dd className="font-semibold tabular-nums text-emerald-700">{p.savings > 0 ? `${sales(p.savings)} (${p.savingsPct}%)` : '—'}</dd></div>
                  <div><dt className="text-slate-500">Stock se</dt><dd className={cn('font-semibold tabular-nums', can === 0 ? 'text-rose-600' : 'text-slate-900')}>{can} pack</dd></div>
                </dl>
                {(p.validFrom || p.validUntil) && (
                  <p className="mt-2 flex items-center gap-1 text-[0.75rem] text-slate-500"><CalendarClock className="h-3.5 w-3.5" />{[day(p.validFrom), day(p.validUntil)].filter(Boolean).join(' se ')}{p.validUntil && !p.validFrom ? ' tak' : ''}</p>
                )}
                <p className="mt-1 text-[0.75rem] text-slate-500">{p.totalSold} bike{p.isGiftWrapped ? ' · Wrap ke saath' : ''}</p>
                <div className="mt-auto flex flex-wrap gap-1 pt-3">
                  {canSell && on && <Link to="/pos" className={cardLink}><ShoppingCart className="h-3.5 w-3.5" />Bechein</Link>}
                  {canEdit && <Link to={`/toystore/gift-packs/${p.id}/edit`} className={cardAction}><Pencil className="h-3.5 w-3.5" />Badlein</Link>}
                  {canEdit && <button type="button" onClick={() => copy.mutate(p)} disabled={copy.isPending} className={cardAction}><Copy className="h-3.5 w-3.5" />Copy</button>}
                  {canEdit && (p.isActive
                    ? <button type="button" onClick={() => setOff(p)} className={cardDanger}><Power className="h-3.5 w-3.5" />Band</button>
                    : <button type="button" onClick={() => switchOn.mutate(p)} disabled={switchOn.isPending} className={cardLink}><Power className="h-3.5 w-3.5" />Chalu</button>)}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <p className="hidden items-center gap-1 px-1 text-[0.75rem] text-slate-500 sm:flex">{canEdit && <><Kbd>N</Kbd> naya pack · </>}<Kbd>/</Kbd> search · <Kbd>G</Kbd> guide</p>

      {off && (
        <ConfirmModal title={`${off.name} band karein?`} confirm="Band karein" danger pending={switchOff.isPending}
          text="Counter par nahi dikhega. Bike hue bill aur ginti waisi rahengi; baad me Chalu kar sakte hain."
          onConfirm={() => switchOff.mutate(off)} onClose={() => setOff(null)} />
      )}

      {wrapOpen && <GiftWrapModal current={wrap ?? null} onClose={() => setWrapOpen(false)} onSaved={() => { setWrapOpen(false); qc.invalidateQueries({ queryKey: ['toy-gift-wrap'] }); qc.invalidateQueries({ queryKey: [PRODUCTS_KEY] }); }} />}

      {guide.isOpen && (
        <PageGuide title="Gift packs — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Gift, color: '#db2777', title: 'Pack banayein', text: 'Do ya zyada khilone chunein aur pack ki qeemat rakhein. Counter ke Combos tab me 🎁 ke saath aata hai.' },
            { icon: Package, color: '#e11d48', title: 'Stock', text: 'Pack bikne par har khilona stock se nikalta hai. "Stock se" batata hai abhi kitne pack ban sakte hain.' },
            { icon: Moon, color: '#16a34a', title: 'Eid season', text: 'Season pack par shuru aur khatam ki tareekh rakhein — tareekh ke bahar counter par nahi dikhta.' },
            { icon: Scissors, color: '#0891b2', title: 'Gift wrap', text: '"Gift wrap" se charge rakhein — POS par "Gift wrap" chip se ek tap me bill par lagta hai, stock nahi ginta. 0 rakhne se band.' },
            { icon: Sparkles, color: '#7c3aed', title: 'Copy', text: 'Pichle saal ka pack Copy karein, qeemat badlein aur chalu kar dein.' },
          ]}
          shortcuts={[['N', 'naya pack'], ['/', 'dhoondein'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

/** Sets the gift wrapping charge; the counter bills it as a service line (no stock). 0 switches it off. */
function GiftWrapModal({ current, onClose, onSaved }: { current: GiftWrap | null; onClose: () => void; onSaved: () => void }) {
  const [price, setPrice] = useState(current?.isActive ? String(current.price) : '');
  const [name, setName] = useState(current?.name ?? 'Gift wrapping');
  const save = useMutation({
    mutationFn: () => {
      const n = Number(price || 0);
      if (!(n >= 0)) throw new Error('Charge sahi likhein');
      return toyProductsApi.setGiftWrap({ price: n, name: name.trim() || undefined });
    },
    onSuccess: (w) => { toast.success(w.isActive ? `Gift wrap ${w.price} — POS par chip se lagayein` : 'Gift wrap band'); onSaved(); },
    onError: (e) => toast.error(apiError(e, (e as Error).message || 'Save nahi hua')),
  });
  return (
    <Modal open onClose={onClose} size="sm" title="Gift wrap ka charge" description="Bill par alag line — stock nahi ginta, Sale me aata hai"
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button onClick={() => save.mutate()} loading={save.isPending}>Save karein</Button></>}>
      <div className="space-y-3">
        <Input label="Charge (Rs)" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ''))} placeholder="100" hint="0 ya khali = band" autoFocus />
        <Input label="Bill par naam" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
      </div>
    </Modal>
  );
}
