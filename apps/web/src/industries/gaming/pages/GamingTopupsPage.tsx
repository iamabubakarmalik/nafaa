/**
 * Top-up cards (PUBG UC, PSN, Google Play…): cards come in by code, one or
 * a batch at a time, and are sold at the counter like any item (a bill can
 * carry cards, snacks and station time and be paid in parts). A sold card
 * shows its code again to re-send it; a wrong card is taken off stock, never
 * deleted.
 *
 * Keys: N add cards · / search · A analytics · G guide.
 */

import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Archive, BarChart3, CheckCircle2, Copy, CreditCard, Download, EyeOff, GraduationCap, Layers, Plus, Receipt, RotateCcw, ShoppingCart, Wallet,
} from 'lucide-react';
import {
  Button, FilterBar, FilterChip, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Select, Textarea, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { downloadCsv } from '@core/lib/csv';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print/PrintButton';
import type { PrintDoc } from '@core/print/types';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { gamingTopupsApi, type GamingTopup } from '../api/topups.api';
import { BarList, ConfirmModal, Empty, ListCard, ListLoading, Pager, Pill } from '../components/ui';
import { useDebounced, usePageKeys, useSaveKey } from '../hooks/usePageKeys';
import { GAMING_KEYS, MONEY_KEYS, PROVIDERS, errorText, moneyText, numIn, providerOf, shortDate } from '../lib/meta';
import { t as tr } from '@core/i18n';

type Tab = 'stock' | 'available' | 'sold' | 'removed' | 'analytics';
const LIMIT = 25;
const PROVIDER_OPTIONS = Object.entries(PROVIDERS).map(([value, label]) => ({ value, label }));

const copy = (text: string) => {
  void navigator.clipboard?.writeText(text).then(() => toast.success(tr('Copy ho gaya'), { duration: 900 })).catch(() => toast.error(tr('Copy nahi hua')));
};

function cardState(t: GamingTopup) {
  if (t.soldAt) return t.isRedeemed ? { label: tr('Load ho gaya'), tone: 'bg-slate-100 text-slate-700 ring-slate-200' } : { label: tr('Bik gaya'), tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' };
  if (t.isRedeemed) return { label: tr('Hata diya'), tone: 'bg-rose-50 text-rose-700 ring-rose-200' };
  return { label: tr('Stock me'), tone: 'bg-sky-50 text-sky-700 ring-sky-200' };
}

export default function GamingTopupsPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const { sales: money, cost } = useMasked();
  const canAdd = usePermission(PERMISSIONS.PRODUCTS_CREATE);
  const canSell = usePermission(PERMISSIONS.POS_USE);
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('stock');
  const [search, setSearch] = useState('');
  const [provider, setProvider] = useState('');
  const q = useDebounced(search.trim());
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState<{ provider?: string; topupType?: string; denominationValue?: number; costPrice?: number; sellingPrice?: number } | null>(null);
  const [open, setOpen] = useState<GamingTopup | null>(null);

  const listTab = tab === 'available' || tab === 'sold' || tab === 'removed';
  const params = { provider: provider || undefined, status: listTab ? tab : undefined, search: q || undefined, page, limit: LIMIT };
  const listQ = useQuery({ queryKey: [GAMING_KEYS.topups, 'page', params], queryFn: () => gamingTopupsApi.page(params), enabled: listTab, placeholderData: (p) => p });
  const stockQ = useQuery({ queryKey: [GAMING_KEYS.topups, 'inventory'], queryFn: () => gamingTopupsApi.inventory() });
  const sumQ = useQuery({ queryKey: [GAMING_KEYS.topups, 'summary'], queryFn: () => gamingTopupsApi.summary() });
  const soldQ = useQuery({ queryKey: [GAMING_KEYS.topups, 'analytics'], queryFn: () => gamingTopupsApi.page({ status: 'sold', page: 1, limit: 200 }), enabled: tab === 'analytics' });
  const s = sumQ.data;
  usePageKeys(searchRef, { n: () => { if (canAdd) setAdding({}); }, a: () => setTab('analytics') });

  const refresh = () => [GAMING_KEYS.topups, GAMING_KEYS.counter, ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const changeTab = (t: Tab) => { setTab(t); setPage(1); };

  const kinds = useMemo(() => {
    const needle = q.toLowerCase();
    return (stockQ.data ?? [])
      .filter((k) => (!provider || k.provider === provider) && (!needle || `${providerOf(k.provider)} ${k.topupType} ${k.denomination}`.toLowerCase().includes(needle)))
      .sort((a, b) => a.count - b.count);
  }, [stockQ.data, provider, q]);

  const rows = listQ.data?.items ?? [];
  const exportCsv = () => {
    if (tab === 'stock' || tab === 'analytics') {
      if (!kinds.length) { toast.error(tr('Stock me koi card nahi')); return; }
      downloadCsv('topup-stock.csv', [['Card', 'Type', 'Value', 'Count', 'Rate', 'Avg cost', 'Expiry'],
        ...kinds.map((k) => [providerOf(k.provider), k.topupType, k.denomination, k.count, k.sellingPrice, k.avgCost, k.nearestExpiry?.slice(0, 10) ?? ''])]);
      return;
    }
    if (!rows.length) { toast.error(tr('Is filter me koi card nahi')); return; }
    downloadCsv(`topup-${tab}.csv`, [['Number', 'Card', 'Type', 'Value', 'Cost', 'Rate', 'Profit', 'Customer', 'Phone', 'Bill', 'Bika', 'Halat'],
      ...rows.map((t) => [t.topupNumber, providerOf(t.provider), t.topupType, t.denominationValue, t.costPrice, t.sellingPrice, t.soldAt ? t.profit : '',
        t.customerName ?? '', t.customerPhone ?? '', t.deliveryReference ?? '', t.soldAt?.slice(0, 10) ?? '', cardState(t).label])]);
  };
  const printList = (): PrintDoc => ({
    title: 'Top-up cards',
    meta: [['Stock', String(s?.available ?? 0)], ['Bike', String(s?.sold ?? 0)], ['Stock ki cost', cost(s?.stockValue ?? 0)]],
    sections: [{
      kind: 'table', title: 'Stock',
      columns: [{ label: 'Card' }, { label: 'Value' }, { label: 'Count', align: 'right' }, { label: 'Rate', align: 'right' }],
      rows: kinds.map((k) => [`${providerOf(k.provider)} ${k.topupType}`, String(k.denomination), String(k.count), money(k.sellingPrice)]),
    }],
  });

  const byProvider = useMemo(() => {
    const m = new Map<string, { count: number; value: number }>();
    for (const t of soldQ.data?.items ?? []) {
      const x = m.get(t.provider) ?? { count: 0, value: 0 };
      x.count += 1; x.value += Number(t.sellingPrice) || 0;
      m.set(t.provider, x);
    }
    return [...m.entries()].map(([key, v]) => ({ key, label: providerOf(key), ...v })).sort((a, b) => b.value - a.value);
  }, [soldQ.data]);
  const profitByProvider = useMemo(() => {
    const m = new Map<string, { count: number; value: number }>();
    for (const t of soldQ.data?.items ?? []) {
      const x = m.get(t.provider) ?? { count: 0, value: 0 };
      x.count += 1; x.value += Number(t.profit) || 0;
      m.set(t.provider, x);
    }
    return [...m.entries()].map(([key, v]) => ({ key, label: providerOf(key), ...v })).sort((a, b) => b.value - a.value);
  }, [soldQ.data]);

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title={tr('Top-up cards — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: Plus, color: '#16a34a', title: tr('Card daalein'), text: tr('Card ka naam (PUBG UC), value (660) aur rate likhein, phir codes — har line par ek code. Ek ya sau, dono chalte hain.') },
            { icon: ShoppingCart, color: '#7c3aed', title: tr('Counter par bechein'), text: tr('POS par har card ki tile khud ban jati hai. Bill save hote hi code screen par aata hai — customer ko dein ya print karein. Split payment aur udhaar bhi chalta hai.') },
            { icon: EyeOff, color: '#0891b2', title: tr('Code chhupa rehta hai'), text: tr('Stock wale card ka code screen par nahi dikhta. Bika hua card kholein to code dobara milta hai.') },
            { icon: Archive, color: '#e11d48', title: tr('Ghalat card'), text: tr('Kharab ya ghalat card "Stock se hatayein" — record rehta hai. Ghalti se hataya ho to wapas stock me laa sakte hain.') },
          ]}
          shortcuts={[['N', tr('card daalein')], ['A', 'analytics'], ['/', 'search'], ['G', 'guide']]} />
      )}

      <PageHero title={tr('Top-up cards')} chip={<><CreditCard /> {' '}{tr('Digital cards')}</>} loading={sumQ.isLoading} busy={listQ.isFetching && !listQ.isLoading}
        meta={tr('PUBG UC, PSN, Google Play — stock, sale aur codes')}
        actions={<>
          {canSell && <Link to="/pos" className={heroButton}><ShoppingCart className="h-4 w-4" /><span className="hidden sm:inline">{tr('Counter')}</span></Link>}
          <button type="button" onClick={exportCsv} className={heroButton}><Download className="h-4 w-4" />{tr('CSV')}</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printList} label={tr('Print')} /></span>
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canAdd && <button type="button" onClick={() => setAdding({})} title={tr('Card daalein (N)')} className={heroPrimaryButton}><Plus className="h-4 w-4" />{tr('Card daalein')}</button>}
        </>}
        stats={[
          { label: tr('Stock me'), value: String(s?.available ?? 0) },
          { label: tr('Bike'), value: String(s?.sold ?? 0) },
          { label: tr('Sale'), value: money(s?.totalRevenue ?? 0) },
        ]} />

      <KpiRow cols={4}>
        <KpiCard icon={Layers} color="#0891b2" label={tr('Stock me')} value={s?.available ?? 0} hint={tr('{{count}} kinds', { count: kinds.length })} active={tab === 'stock'} onClick={() => changeTab('stock')} />
        <KpiCard icon={Receipt} color="#16a34a" label={tr('Bike hue')} value={s?.sold ?? 0} hint={money(s?.totalRevenue ?? 0)} active={tab === 'sold'} onClick={() => changeTab('sold')} />
        <KpiCard icon={Wallet} color="#7c3aed" label={tr('Profit')} value={cost(s?.totalProfit ?? 0)} hint={tr('Bike hue cards par')} />
        <KpiCard icon={Archive} color="#64748b" label={tr('Stock ki cost')} value={cost(s?.stockValue ?? 0)} hint={s?.removed ? tr('{{removed}} hataye', { removed: s.removed }) : undefined} active={tab === 'removed'} onClick={() => changeTab('removed')} />
      </KpiRow>

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={tr('Card number, customer, phone ya bill…')} />}
        chips={search.trim() || provider ? <>
          {search.trim() && <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip>}
          {provider && <FilterChip onRemove={() => setProvider('')}>{providerOf(provider)}</FilterChip>}
        </> : undefined}
        onClear={() => { setSearch(''); setProvider(''); setPage(1); }}>
        <Select value={provider} onChange={(e) => { setProvider(e.target.value); setPage(1); }} options={[{ value: '', label: tr('Sab cards') }, ...PROVIDER_OPTIONS]} />
      </FilterBar>

      <ViewTabs value={tab} onChange={changeTab} hint={tr('Card kholein — code, bill aur halat')}
        tabs={[
          { id: 'stock', label: tr('Stock'), icon: Layers },
          { id: 'available', label: tr('Sab card'), icon: CreditCard, count: s?.available ?? null },
          { id: 'sold', label: tr('Bike hue'), icon: Receipt, count: s?.sold ?? null },
          { id: 'removed', label: tr('Hataye'), icon: Archive, count: s?.removed || null },
          { id: 'analytics', label: tr('Analytics'), icon: BarChart3 },
        ]} />

      {tab === 'analytics' ? (
        soldQ.isLoading ? <ListLoading /> : (
          <div className="grid gap-4 lg:grid-cols-2">
            <BarList title={tr('Kaun sa card zyada bika (sale)')} money={money} rows={byProvider} />
            <BarList title={tr('Kis card me zyada profit')} money={cost} rows={profitByProvider} />
          </div>
        )
      ) : tab === 'stock' ? (
        <ListCard>
          {stockQ.isLoading ? <ListLoading /> : kinds.length === 0 ? (
            <Empty icon={CreditCard} title={tr('Stock me koi card nahi')} text={tr('Supplier se mile codes \'Card daalein\' se daalein — counter par khud tile ban jati hai.')}
              action={canAdd ? <Button onClick={() => setAdding({})}><Plus className="h-4 w-4" />{tr('Card daalein')}</Button> : undefined} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {kinds.map((k) => (
                <li key={`${k.provider}-${k.topupType}-${k.denomination}`} className="grid gap-2 px-4 py-3 sm:px-5 md:grid-cols-[minmax(0,1.5fr)_8rem_9rem_auto] md:items-center">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{providerOf(k.provider)} · {k.topupType} {k.denomination}</p>
                    <p className="text-[0.75rem] text-slate-500">{tr('Avg cost {{avgCost}}{{value}}', { avgCost: cost(k.avgCost), value: k.nearestExpiry ? tr(' · pehli expiry {{nearestExpiry}}', { nearestExpiry: shortDate(k.nearestExpiry) }) : '' })}</p>
                  </div>
                  <p className="text-[0.875rem] font-semibold tabular-nums text-slate-900">{money(k.sellingPrice)}<span className="block text-[0.75rem] font-medium text-slate-500">{tr('bechne ka rate')}</span></p>
                  <Pill tone={k.count <= 3 ? 'bg-amber-50 text-amber-800 ring-amber-200' : 'bg-sky-50 text-sky-700 ring-sky-200'}>{tr('{{count}} card{{value}}', { count: k.count, value: k.count <= 3 ? tr(' — kam') : '' })}</Pill>
                  {canAdd && <div className="flex justify-end"><Button size="sm" variant="secondary" onClick={() => setAdding({ provider: k.provider, topupType: k.topupType, denominationValue: k.denomination, costPrice: k.avgCost, sellingPrice: k.sellingPrice })}><Plus className="h-3.5 w-3.5" />{tr('Aur daalein')}</Button></div>}
                </li>
              ))}
            </ul>
          )}
        </ListCard>
      ) : (
        <ListCard footer={listQ.data && <Pager page={page} total={listQ.data.total} limit={LIMIT} onPage={setPage} />}>
          {listQ.isLoading ? <ListLoading /> : rows.length === 0 ? (
            <Empty icon={CreditCard} title={tr('Is filter me koi card nahi')} text={tab === 'sold' ? tr('Counter par card bechne ke baad yahan aata hai.') : undefined} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {rows.map((t) => {
                const st = cardState(t);
                return (
                  <li key={t.id}>
                    <button type="button" onClick={() => setOpen(t)} className="grid w-full gap-2 px-4 py-3 text-start hover:bg-slate-50 sm:px-5 md:grid-cols-[minmax(0,1.5fr)_10rem_8rem_auto] md:items-center">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{providerOf(t.provider)} · {t.topupType} {t.denominationValue} <span className="font-mono text-[0.75rem] font-normal text-slate-400">{t.topupNumber}</span></p>
                        <p className="truncate text-[0.75rem] text-slate-500">{t.soldAt ? [t.customerName, t.customerPhone, t.deliveryReference].filter(Boolean).join(' · ') || tr('Walk-in') : t.cardSerial ? tr('S/N {{cardSerial}}', { cardSerial: t.cardSerial }) : tr('Aaya {{createdAt}}', { createdAt: shortDate(t.createdAt) })}</p>
                      </div>
                      <p className="text-[0.8125rem] text-slate-700">{t.soldAt ? tr('Bika {{soldAt}}', { soldAt: shortDate(t.soldAt) }) : t.expiryDate ? tr('Expiry {{expiryDate}}', { expiryDate: shortDate(t.expiryDate) }) : '—'}</p>
                      <p className="text-[0.875rem] font-semibold tabular-nums text-slate-900">{money(t.sellingPrice)}{t.soldAt && <span className="block text-[0.75rem] font-medium text-emerald-700">+{cost(t.profit)}</span>}</p>
                      <div className="flex justify-end"><Pill tone={st.tone}>{st.label}</Pill></div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ListCard>
      )}

      {adding && <AddModal preset={adding} money={money} onClose={() => setAdding(null)} onDone={() => { setAdding(null); refresh(); }} />}
      {open && <CardModal card={open} money={money} onClose={() => setOpen(null)} onChanged={() => { setOpen(null); refresh(); }} />}
    </PageShell>
  );
}

/** "code" or "code, pin" or "code, pin, serial" per line. */
function parseCodes(text: string) {
  return text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
    const [cardCode, cardPin, cardSerial] = l.split(/[,\t;|]/).map((x) => x.trim());
    return { cardCode, cardPin: cardPin || undefined, cardSerial: cardSerial || undefined };
  });
}

function AddModal({ preset, money, onClose, onDone }: {
  preset: { provider?: string; topupType?: string; denominationValue?: number; costPrice?: number; sellingPrice?: number };
  money: (n: number) => string; onClose: () => void; onDone: () => void;
}) {
  const [v, setV] = useState({
    provider: preset.provider ?? 'PUBG_UC', topupType: preset.topupType ?? '', value: preset.denominationValue ? String(preset.denominationValue) : '',
    cost: preset.costPrice ? String(preset.costPrice) : '', rate: preset.sellingPrice ? String(preset.sellingPrice) : '', expiry: '', supplierRef: '', codes: '',
  });
  const set = (patch: Partial<typeof v>) => setV((x) => ({ ...x, ...patch }));
  const cards = parseCodes(v.codes);
  const dupes = cards.length !== new Set(cards.map((c) => c.cardCode)).size;
  const costN = numIn(v.cost);
  const rateN = numIn(v.rate);
  const errors = {
    topupType: !v.topupType.trim() ? tr('Card ka naam likhein (UC, Wallet, Gift card)') : undefined,
    value: !(numIn(v.value) && numIn(v.value)! > 0) ? tr('Value likhein') : undefined,
    cost: costN === null ? tr('Cost likhein') : undefined,
    rate: !(rateN && rateN > 0) ? tr('Bechne ka rate likhein') : costN !== null && rateN < costN ? tr('Rate cost se kam hai') : undefined,
    codes: !cards.length ? tr('Kam se kam ek code likhein') : cards.length > 500 ? tr('Ek dafa 500 tak') : dupes ? tr('Ek hi code do dafa likha hai') : undefined,
  };
  const [tried, setTried] = useState(false);
  const bad = Object.values(errors).some(Boolean);
  const save = useMutation({
    mutationFn: () => gamingTopupsApi.bulkCreate({
      provider: v.provider, topupType: v.topupType.trim(), denominationValue: numIn(v.value) ?? 0, costPrice: costN ?? 0, sellingPrice: rateN ?? 0,
      cards, expiryDate: v.expiry || undefined, supplierRef: v.supplierRef.trim() || undefined,
    }),
    onSuccess: (r) => { toast.success(tr('{{created}} card stock me — {{from}}{{value}}', { created: r.created, from: r.from, value: r.created > 1 ? tr(' se {{to}}', { to: r.to }) : '' })); onDone(); },
    onError: (e) => toast.error(errorText(e, tr('Card save nahi hue'))),
  });
  const submit = () => { setTried(true); if (!bad && !save.isPending) save.mutate(); };
  useSaveKey(submit);
  const e = (k: keyof typeof errors) => (tried ? errors[k] : undefined);
  return (
    <Modal open onClose={onClose} size="lg" title={tr('Card stock me daalein')} description={tr('Har line par ek code. PIN ya serial ho to comma ke baad likhein')}
      footer={<><Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button><Button loading={save.isPending} onClick={submit}><CheckCircle2 className="h-4 w-4" />{tr('{{value}} (Ctrl+S)', { value: cards.length > 1 ? tr('{{count}} card save', { count: cards.length }) : tr('Save') })}</Button></>}>
      <form className="space-y-4" onSubmit={(ev) => { ev.preventDefault(); submit(); }}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Select label={tr('Card')} value={v.provider} onChange={(x) => set({ provider: x.target.value })} options={PROVIDER_OPTIONS} />
          <Input label={tr('Card ka naam')} required value={v.topupType} onChange={(x) => set({ topupType: x.target.value })} placeholder={tr('UC, Wallet, Gift card')} error={e('topupType')} hint={tr('Counter par isi naam se dikhega')} />
          <Input label={tr('Value')} required inputMode="decimal" value={v.value} onChange={(x) => set({ value: moneyText(x.target.value) })} placeholder="660" error={e('value')} hint={tr('UC, diamonds ya dollar')} />
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <Input label={tr('Cost (Rs)')} required inputMode="decimal" value={v.cost} onChange={(x) => set({ cost: moneyText(x.target.value) })} error={e('cost')} hint={tr('Supplier ko diya')} />
          <Input label={tr('Bechne ka rate (Rs)')} required inputMode="decimal" value={v.rate} onChange={(x) => set({ rate: moneyText(x.target.value) })} error={e('rate')}
            hint={costN !== null && rateN ? tr('Profit {{value}} har card', { value: money(rateN - costN) }) : undefined} />
          <Input label={tr('Expiry')} type="date" value={v.expiry} onChange={(x) => set({ expiry: x.target.value })} hint={tr('Pehle expire hone wala pehle bikta hai')} />
          <Input label={tr('Supplier / invoice')} value={v.supplierRef} onChange={(x) => set({ supplierRef: x.target.value })} hint={tr('Marzi hai')} />
        </div>
        <Textarea label={tr('Codes{{value}}', { value: cards.length ? ` (${cards.length})` : '' })} rows={6} value={v.codes} onChange={(x) => set({ codes: x.target.value })} error={e('codes')}
          placeholder={tr('ABCD-1234-EFGH\nWXYZ-5678-IJKL, 1234')} hint={tr('Excel se seedha paste karein — code, PIN, serial')} className="font-mono" />
      </form>
    </Modal>
  );
}

function CardModal({ card, money, onClose, onChanged }: { card: GamingTopup; money: (n: number) => string; onClose: () => void; onChanged: () => void }) {
  const canRemove = usePermission(PERMISSIONS.PRODUCTS_DELETE);
  const canRestore = usePermission(PERMISSIONS.PRODUCTS_EDIT);
  const canSell = usePermission(PERMISSIONS.POS_USE);
  const fullQ = useQuery({ queryKey: [GAMING_KEYS.topups, 'one', card.id], queryFn: () => gamingTopupsApi.getOne(card.id), enabled: !!card.soldAt });
  const t = fullQ.data ?? card;
  const [removing, setRemoving] = useState(false);
  const [reason, setReason] = useState('');
  const act = useMutation({
    mutationFn: (what: 'redeem' | 'remove' | 'restore') => (what === 'redeem' ? gamingTopupsApi.redeem(t.id) : what === 'remove' ? gamingTopupsApi.remove(t.id, reason.trim() || undefined) : gamingTopupsApi.restore(t.id)),
    onSuccess: (_r, what) => { toast.success(what === 'redeem' ? tr('Load ho gaya likh diya') : what === 'remove' ? tr('Card stock se hata diya') : tr('Card wapas stock me')); onChanged(); },
    onError: (e) => toast.error(errorText(e, tr('Nahi hua'))),
  });
  const st = cardState(t);
  const inStock = !t.soldAt && !t.isRedeemed;
  const removed = !t.soldAt && t.isRedeemed;
  const doc = (): PrintDoc => ({
    title: 'Digital card', subtitle: `${providerOf(t.provider)} ${t.topupType} ${t.denominationValue}`,
    sections: [{ kind: 'rows', title: t.topupNumber, rows: [
      { label: 'Code', value: t.cardCode ?? '—' }, ...(t.cardPin ? [{ label: 'PIN', value: t.cardPin }] : []), ...(t.cardSerial ? [{ label: 'Serial', value: t.cardSerial }] : []),
      ...(t.deliveryReference ? [{ label: 'Bill', value: t.deliveryReference }] : []),
    ] }],
  });
  return (
    <Modal open onClose={onClose} size="md" title={`${providerOf(t.provider)} · ${t.topupType} ${t.denominationValue}`} description={`${t.topupNumber} · ${st.label}`}
      footer={<div className="flex w-full flex-wrap items-center gap-2">
        {t.soldAt && <PrintButton doc={doc} label={tr('Print')} size="sm" />}
        <span className="flex-1" />
        {inStock && canRemove && <Button size="sm" variant="secondary" onClick={() => setRemoving(true)}><Archive className="h-3.5 w-3.5" />{tr('Stock se hatayein')}</Button>}
        {(removed || (t.billVoided && !t.isRedeemed)) && canRestore && <Button size="sm" variant="secondary" loading={act.isPending} onClick={() => act.mutate('restore')}><RotateCcw className="h-3.5 w-3.5" />{tr('Wapas stock me')}</Button>}
        {t.soldAt && !t.isRedeemed && !t.billVoided && canSell && <Button size="sm" loading={act.isPending} onClick={() => act.mutate('redeem')}><CheckCircle2 className="h-3.5 w-3.5" />{tr('Customer ne load kar liya')}</Button>}
      </div>}>
      <div className="space-y-3 text-[0.875rem]">
        {t.soldAt ? (
          <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg bg-white px-3 py-2 font-mono text-[1rem] font-bold tracking-wider text-slate-900 ring-1 ring-slate-200">{fullQ.isLoading ? '…' : t.cardCode ?? '—'}</code>
              {t.cardCode && <Button size="sm" variant="secondary" onClick={() => copy(t.cardCode!)}><Copy className="h-3.5 w-3.5" />{tr('Copy')}</Button>}
            </div>
            {(t.cardPin || t.cardSerial) && <p className="mt-1.5 font-mono text-[0.8125rem] text-slate-600">{t.cardPin ? tr('PIN {{cardPin}}', { cardPin: t.cardPin }) : ''}{t.cardPin && t.cardSerial ? ' · ' : ''}{t.cardSerial ? tr('S/N {{cardSerial}}', { cardSerial: t.cardSerial }) : ''}</p>}
          </div>
        ) : (
          <p className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-slate-600 ring-1 ring-slate-200"><EyeOff className="h-4 w-4" />{tr('Code bikne ke baad dikhta hai — counter par bechein')}</p>
        )}
        <dl className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-3 sm:grid-cols-3">
          <div><dt className="text-[0.75rem] text-slate-500">{tr('Rate')}</dt><dd className="font-semibold">{money(t.sellingPrice)}</dd></div>
          <div><dt className="text-[0.75rem] text-slate-500">{tr('Cost')}</dt><dd className="font-semibold">{money(t.costPrice)}</dd></div>
          {t.soldAt && <div><dt className="text-[0.75rem] text-slate-500">{tr('Profit')}</dt><dd className="font-semibold text-emerald-700">{money(t.profit)}</dd></div>}
          {t.soldAt && <div><dt className="text-[0.75rem] text-slate-500">{tr('Customer')}</dt><dd className="font-semibold">{t.customerName ?? tr('Walk-in')}{t.customerPhone ? ` · ${t.customerPhone}` : ''}</dd></div>}
          {t.deliveryReference && <div><dt className="text-[0.75rem] text-slate-500">{tr('Bill')}</dt><dd className="font-mono font-semibold">{t.deliveryReference}</dd></div>}
          {t.expiryDate && <div><dt className="text-[0.75rem] text-slate-500">{tr('Expiry')}</dt><dd className="font-semibold">{shortDate(t.expiryDate)}</dd></div>}
          {t.supplierRef && <div><dt className="text-[0.75rem] text-slate-500">{tr('Supplier')}</dt><dd className="font-semibold">{t.supplierRef}</dd></div>}
        </dl>
        {t.billVoided && !t.isRedeemed && <p className="rounded-xl bg-amber-50 px-3 py-2 text-amber-900 ring-1 ring-amber-200">{tr('Is card ka bill cancel ho gaya. Code check karein — istemal nahi hua to "Wapas stock me".')}</p>}
        {t.notes && <p className="whitespace-pre-line text-slate-600">{t.notes}</p>}
      </div>
      {removing && (
        <ConfirmModal title={tr('Card stock se hatayein?')} cta={tr('Hatayein')} danger busy={act.isPending} onClose={() => setRemoving(false)} onConfirm={() => act.mutate('remove')}
          text={<div className="space-y-3"><p>{tr('Card ka record rehta hai, sirf counter par nahi bikega.')}</p><Input label={tr('Wajah')} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={tr('Code chal nahi raha / ghalat value')} /></div>} />
      )}
    </Modal>
  );
}
