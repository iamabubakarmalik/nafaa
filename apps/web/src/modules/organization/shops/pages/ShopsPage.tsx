/**
 * Branches: every shop, warehouse and godown with today's sales, the drawer,
 * stock value and staff on duty; a table view for side-by-side numbers;
 * switch a branch on/off, delete an unused one, print the list. Creating and
 * editing open the branch form page.
 *
 * Keys: N new branch · / search · 1 cards · 2 table · A analytics · G guide.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, ArrowDownWideNarrow, BarChart3, Boxes, Building2, CalendarClock, GraduationCap, LayoutGrid, ListFilter, Plus, Power,
  Store, Table2, Trash2, Users, Wallet, Warehouse, Wrench,
} from 'lucide-react';
import { Button, FilterBar, FilterChip, FilterMenu, heroButton, heroIconButton, heroPrimaryButton, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Skeleton, Table, TBody, Td, Th, THead, Tr, type FilterOption, ViewTabs } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import { PrivacyToggle } from '@core/security/HiddenValue';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useAuthStore } from '@core/stores/auth.store';
import { cn } from '@core/lib/cn';
import { MASK, useMasked } from '@modules/dashboard/engine/useMasked';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { shopsApi, type Shop, type ShopAnalyticsRow, type ShopDeleteError, type ShopType } from '../api/shops.api';
import { BranchCard } from '../components/BranchCard';
import { SHOP_KEYS, SHOP_TYPES, apiError } from '../components/meta';
import { t as tr } from '@core/i18n';

type Tab = 'cards' | 'table';
type TypeFilter = 'all' | ShopType;
type StatusFilter = 'active' | 'off' | 'all';
type Sort = 'main' | 'name' | 'sales' | 'stock';

const TYPE_FILTERS: Array<FilterOption<TypeFilter>> = [
  { value: 'all', label: tr('Sab types') },
  ...(Object.entries(SHOP_TYPES) as Array<[ShopType, (typeof SHOP_TYPES)[ShopType]]>).map(([value, t]) => ({ value, label: t.label, hint: t.hint, icon: t.icon, color: t.color })),
];
const STATUS_FILTERS: Array<FilterOption<StatusFilter>> = [
  { value: 'active', label: tr('Chalu branches') },
  { value: 'off', label: tr('Band branches') },
  { value: 'all', label: tr('Sab') },
];
const SORTS: Array<FilterOption<Sort>> = [
  { value: 'main', label: tr('Main pehle') },
  { value: 'name', label: tr('Naam (A–Z)') },
  { value: 'sales', label: tr('Aaj ki sale') },
  { value: 'stock', label: tr('Stock value') },
];

export default function ShopsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const tenantName = useAuthStore((s) => s.tenant?.name);
  const canManage = usePermission(PERMISSIONS.SHOPS_MANAGE);
  const canMoney = usePermission(PERMISSIONS.REPORTS_VIEW);
  const canFixStock = usePermission(PERMISSIONS.PRODUCTS_EDIT);
  const { sales: money, cost, costHidden } = useMasked();

  const [tab, setTab] = useState<Tab>('cards');
  const [search, setSearch] = useState('');
  const [type, setType] = useState<TypeFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('active');
  const [sort, setSort] = useState<Sort>('main');
  const [confirmOff, setConfirmOff] = useState<Shop | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Shop | null>(null);

  const listQ = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list });
  const figQ = useQuery({ queryKey: ['shops-analytics'], queryFn: shopsApi.analytics, enabled: canMoney, refetchInterval: 60_000, retry: false });
  const shops = useMemo(() => listQ.data ?? [], [listQ.data]);
  const fig = figQ.data;
  const figOf = useMemo(() => new Map<string, ShopAnalyticsRow>((fig?.shops ?? []).map((s) => [s.id, s])), [fig]);
  const costOf = (n: number | undefined) => (fig?.costHidden || costHidden || n === undefined ? MASK : cost(n));

  const refresh = () => SHOP_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const toggle = useMutation({
    mutationFn: (s: Shop) => shopsApi.toggleActive(s.id),
    onSuccess: (s) => { toast.success(s.isActive ? tr('{{name}} chalu ho gayi', { name: s.name }) : tr('{{name}} band ho gayi', { name: s.name })); setConfirmOff(null); refresh(); },
    onError: (e) => toast.error(apiError(e, tr('Badal nahi saka'))),
  });

  const remove = useMutation({
    mutationFn: (s: Shop) => shopsApi.remove(s.id),
    onSuccess: (_r, s) => { toast.success(tr('{{name}} mita di gayi', { name: s.name })); setConfirmDelete(null); refresh(); },
    onError: (e, s) => {
      setConfirmDelete(null);
      const body = (e as { response?: { data?: { message?: ShopDeleteError | string } } })?.response?.data?.message;
      if (!body || typeof body === 'string') return toast.error(body || tr('Mita nahi saka'));
      if (body.code === 'HAS_FINANCIAL_HISTORY' || body.code === 'HAS_SALES_HISTORY') {
        return toast.error(tr('Is branch ka hisaab maujood hai'), {
          description: tr('Record bachane ke liye branch mitti nahi — band kar dein. Purana hisaab reports me rahega.'),
          duration: 10000,
          action: s.isActive ? { label: tr('Band karein'), onClick: () => setConfirmOff(s) } : undefined,
        });
      }
      if (body.code === 'HAS_PENDING_TRANSFERS') return toast.error(body.message, { action: { label: tr('Transfers'), onClick: () => navigate('/transfers') } });
      if (body.code === 'HAS_OPEN_REGISTER') return toast.error(body.message, { action: { label: tr('Drawer'), onClick: () => navigate('/cash-register') } });
      toast.error(body.message);
    },
  });

  const fixStock = useMutation({
    mutationFn: () => productsApi.backfillShopStock(),
    onSuccess: (d: { productsProcessed: number; shopsProcessed: number }) => {
      toast.success(tr('Stock records poore ho gaye'), { description: tr('{{productsProcessed}} cheezein × {{shopsProcessed}} branches', { productsProcessed: d.productsProcessed, shopsProcessed: d.shopsProcessed }) });
      refresh();
    },
    onError: (e) => toast.error(apiError(e, tr('Nahi ho saka'))),
  });

  const needle = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    const list = shops.filter((s) =>
      (type === 'all' || s.type === type)
      && (status === 'all' || (status === 'active' ? s.isActive : !s.isActive))
      && (!needle || `${s.name} ${s.address ?? ''} ${s.phone ?? ''}`.toLowerCase().includes(needle)));
    const f = (s: Shop) => figOf.get(s.id);
    return list.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'sales') return (f(b)?.todaySales ?? -1) - (f(a)?.todaySales ?? -1);
      if (sort === 'stock') return (f(b)?.stockValue ?? f(b)?.stockRetailValue ?? -1) - (f(a)?.stockValue ?? f(a)?.stockRetailValue ?? -1);
      return Number(b.isMain) - Number(a.isMain) || Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name);
    });
  }, [shops, type, status, needle, sort, figOf]);
  const hasFilters = type !== 'all' || status !== 'active' || !!needle;
  const clear = () => { setType('all'); setStatus('active'); setSearch(''); };

  const counts = useMemo(() => ({
    active: shops.filter((s) => s.isActive).length,
    stores: shops.filter((s) => s.isActive && s.type !== 'SHOP').length,
    off: shops.filter((s) => !s.isActive).length,
  }), [shops]);
  const t = fig?.totals;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const k = e.key.toLowerCase();
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (k === 'n' && canManage) { e.preventDefault(); navigate('/shops/new'); }
      if (k === '1') setTab('cards');
      if (k === '2') setTab('table');
      if (k === 'a') navigate('/shops/overview');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canManage, navigate]);

  const printDoc = (): PrintDoc => ({
    title: tr('Branches'),
    subtitle: new Date().toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    meta: [[tr('Branches'), String(filtered.length)], ...(t ? [[tr('Aaj ki sale'), money(t.todaySales)] as [string, string]] : [])],
    sections: [{
      kind: 'table',
      columns: [
        { label: tr('Branch') }, { label: tr('Type'), wideOnly: true }, { label: tr('Phone'), wideOnly: true },
        ...(fig ? [{ label: tr('Aaj sale'), align: 'right' as const }, { label: tr('Drawer'), align: 'right' as const, wideOnly: true }, { label: tr('Duty par'), align: 'right' as const, wideOnly: true }] : []),
      ],
      rows: filtered.map((s) => {
        const f = figOf.get(s.id);
        return [
          `${s.name}${s.isMain ? ' (Main)' : ''}${s.isActive ? '' : ' — band'}`, SHOP_TYPES[s.type].label, s.phone ?? '—',
          ...(fig ? [f ? money(f.todaySales) : '—', f ? (f.registerOpen ? money(f.registerBalance) : tr('Band')) : '—', f ? `${f.staffOnDuty}/${f.staffCount}` : '—'] : []),
        ];
      }),
    }],
  });

  const loading = listQ.isLoading;
  return (
    <PageShell>
      <PageHero
        title={tr('Branches')}
        chip={<><Building2 />{tr('{{active}} chalu{{value}}', { active: counts.active, value: counts.off ? tr(' · {{off}} band', { off: counts.off }) : '' })}</>}
        meta={tenantName}
        busy={figQ.isFetching && !figQ.isLoading}
        loading={canMoney && figQ.isLoading}
        actions={<>
          {canMoney && <PrivacyToggle compact />}
          <Link to="/shops/overview" className={heroButton} title={tr('Branch analytics (A)')}><BarChart3 className="h-4 w-4" /><span className="hidden sm:inline">{tr('Analytics')}</span></Link>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={!filtered.length} /></span>
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} aria-label={tr('Guide')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <Link to="/shops/new" className={heroPrimaryButton} title={tr('Nayi branch (N)')}><Plus className="h-4 w-4" />{tr('Nayi branch')}</Link>}
        </>}
        stats={canMoney ? [
          { label: tr('Aaj ki sale · sab branches'), value: t ? money(t.todaySales) : '', hint: t ? tr('{{todayOrders}} bill', { todayOrders: t.todayOrders }) : undefined },
          { label: tr('Drawers me cash'), value: t ? money(t.drawerCash) : '', hint: t ? tr('{{registersOpen}} khule', { registersOpen: t.registersOpen }) : undefined },
          { label: tr('Stock (cost)'), value: t ? costOf(t.stockValue) : '' },
          { label: tr('Duty par'), value: t ? `${t.staffOnDuty} / ${t.staffCount}` : '' },
        ] : undefined}
      />

      <KpiRow>
        {loading ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={Store} color="#2563eb" label={tr('Dukaanein')} value={String(shops.filter((s) => s.isActive && s.type === 'SHOP').length)} hint={tr('POS wali branches')}
              onClick={() => setType(type === 'SHOP' ? 'all' : 'SHOP')} active={type === 'SHOP'} />
            <KpiCard icon={Warehouse} color="#d97706" label={tr('Store / godown')} value={String(counts.stores)} hint={tr('Sirf maal rakhne ke liye')}
              onClick={() => setType(type === 'WAREHOUSE' ? 'all' : 'WAREHOUSE')} active={type === 'WAREHOUSE'} />
            <KpiCard icon={Wallet} color="#16a34a" label={tr('Drawer khule')} value={t ? `${t.registersOpen} / ${shops.filter((s) => s.isActive && s.type === 'SHOP').length}` : '—'} hint={t ? tr('Aaj kitni dukaanein chal rahi hain') : tr('Reports ki permission chahiye')} />
            <KpiCard icon={AlertTriangle} color="#ea580c" label={tr('Stock kam')} value={t ? String(t.lowStockCount) : '—'} hint={tr('Sab branches milakar · dabayein')}
              onClick={t ? () => navigate('/low-stock') : undefined} />
            <KpiCard icon={Power} color="#64748b" label={tr('Band branches')} value={String(counts.off)} hint={counts.off ? tr('Dekhne ke liye dabayein') : tr('Koi nahi')}
              onClick={() => setStatus(status === 'off' ? 'active' : 'off')} active={status === 'off'} />
          </>
        )}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={tr('Branch ka naam, pata ya phone…')} label={tr('Branch search')} />}
        chips={hasFilters ? <>
          {type !== 'all' && <FilterChip onRemove={() => setType('all')}>{SHOP_TYPES[type].label}</FilterChip>}
          {status !== 'active' && <FilterChip onRemove={() => setStatus('active')}>{STATUS_FILTERS.find((x) => x.value === status)?.label}</FilterChip>}
          {needle && <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip>}
        </> : undefined}
        onClear={clear}>
        <FilterMenu icon={Building2} label={tr('Type')} value={type} active={type !== 'all'} options={TYPE_FILTERS} onChange={setType} />
        <FilterMenu icon={ListFilter} label={tr('Haal')} value={status} active={status !== 'active'} options={STATUS_FILTERS} onChange={setStatus} />
        <FilterMenu icon={ArrowDownWideNarrow} label={tr('Sort')} value={sort} options={SORTS} onChange={setSort} align="right" width="w-56" />
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab} hint={<><Kbd>1</Kbd> <Kbd>2</Kbd> {' '}{tr('se badlein')}</>}
        tabs={[{ id: 'cards', label: tr('Cards'), icon: LayoutGrid, count: filtered.length }, { id: 'table', label: tr('Table'), icon: Table2 }]} />

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-72 rounded-3xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-16 text-center ring-1 ring-slate-200/80">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-brand-fg shadow-lg"><Building2 className="h-7 w-7" /></span>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">{hasFilters ? tr('Is filter me koi branch nahi') : tr('Abhi koi branch nahi')}</h3>
          <p className="mt-1 text-[0.875rem] text-slate-500">{hasFilters ? tr('Filter badal kar dekhein') : tr('Pehli dukaan ya store banayein — har branch ka apna stock, drawer aur staff hota hai.')}</p>
          <div className="mt-4">{hasFilters ? <Button variant="secondary" onClick={clear}>{tr('Filter hatayein')}</Button> : canManage && <Button onClick={() => navigate('/shops/new')}><Plus className="h-4 w-4" />{tr('Nayi branch')}</Button>}</div>
        </div>
      ) : tab === 'cards' ? (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => (
            <BranchCard key={s.id} shop={s} f={figOf.get(s.id)} money={money} cost={costOf} canManage={canManage}
              onToggle={() => (s.isActive ? setConfirmOff(s) : toggle.mutate(s))} onDelete={() => setConfirmDelete(s)} />
          ))}
        </ul>
      ) : (
        <BranchTable shops={filtered} figOf={figOf} money={money} cost={costOf} showMoney={!!fig} />
      )}

      {canMoney && figQ.isError && <p className="rounded-2xl bg-amber-50 px-4 py-3 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">{tr('Aaj ke number load nahi hue — internet check karein. Branches ki list neeche theek hai.')}</p>}

      {confirmOff && (
        <Modal open onClose={() => setConfirmOff(null)} size="sm" title={tr('{{name}} band karein?', { name: confirmOff.name })}
          description={tr('Band branch me POS se sale nahi hogi aur woh branch chunne ki list me nahi aayegi. Purana hisaab, stock aur reports waise hi rahenge. Baad me dobara chalu kar sakte hain.')}
          footer={<><Button variant="secondary" onClick={() => setConfirmOff(null)}>{tr('Rehne dein')}</Button><Button variant="danger" loading={toggle.isPending} onClick={() => toggle.mutate(confirmOff)}><Power className="h-4 w-4" />{tr('Band karein')}</Button></>}>
          {figOf.get(confirmOff.id)?.registerOpen && <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{tr('Is branch ka drawer abhi khula hai. Pehle drawer band kar lein.')}</p>}
        </Modal>
      )}
      {confirmDelete && (
        <Modal open onClose={() => setConfirmDelete(null)} size="sm" title={tr('{{name}} mitayein?', { name: confirmDelete.name })}
          description={tr('Sirf woh branch mit sakti hai jis me koi sale, kharid, expense ya khata nahi. Jis ka hisaab hai use band karein — record save rehta hai.')}
          footer={<><Button variant="secondary" onClick={() => setConfirmDelete(null)}>{tr('Rehne dein')}</Button><Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate(confirmDelete)}><Trash2 className="h-4 w-4" />{tr('Mitayein')}</Button></>}>
          <p className="text-[0.8125rem] text-slate-600">{tr('Is branch ke stock ke khali record aur band drawer bhi mit jayenge. Staff ka login rahega, bas branch se hat jayega.')}</p>
        </Modal>
      )}

      {guide.isOpen && (
        <PageGuide title={tr('Branches — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: Plus, color: '#2563eb', title: tr('Nayi branch'), text: tr('Dukaan, warehouse ya godown banayein. Dukaan me POS aur drawer hota hai; store me sirf maal rakha jata hai.') },
            { icon: Wallet, color: '#16a34a', title: tr('Aaj ka haal'), text: tr('Har card par aaj ki sale, drawer me kitna cash hai, stock ki value aur kaun duty par hai.') },
            { icon: Boxes, color: '#d97706', title: tr('Stock'), text: tr('Nayi branch khali shuru hoti hai. Maal Transfers se bhejein ya Kharid me is branch ko chunein.') },
            { icon: Users, color: '#7c3aed', title: tr('Staff'), text: tr('Branch banate waqt manager ka login de sakte hain. Baqi staff Staff ke page se is branch me lagayein.') },
            { icon: Power, color: '#64748b', title: tr('Band karna'), text: tr('Jo branch band ho gayi use mitayein nahi, band karein — purana hisaab reports me rehta hai.') },
            { icon: BarChart3, color: '#db2777', title: tr('Muqabla'), text: tr('"Analytics" me kisi bhi period ke liye branches ka muqabla, trend aur rush time.') },
          ]}
          tips={[
            tr('Card ke number har minute khud taaza hote hain.'),
            tr('Main branch wohi hai jo naye account me pehle se chuni hoti hai. Main badalne ke liye doosri branch edit karke "Main branch" on karein.'),
            tr('Stock ki value cost par hai — cost dekhne ki permission na ho to chhupi rehti hai.'),
          ]}
          shortcuts={[['N', tr('nayi branch')], ['/', tr('dhoondein')], ['1', tr('cards')], ['2', tr('table')], ['A', tr('analytics')], ['G', tr('guide')]]}
          footer={canFixStock ? (
            <Button size="sm" variant="secondary" loading={fixStock.isPending} onClick={() => fixStock.mutate()}
              title={tr('Kisi branch me koi cheez nazar na aaye to — sirf khali record jorta hai, kuch mitata nahi')}><Wrench className="h-4 w-4" />{tr('Stock records poore karein')}</Button>
          ) : undefined}
        />
      )}
    </PageShell>
  );
}

function BranchTable({ shops, figOf, money, cost, showMoney }: {
  shops: Shop[];
  figOf: Map<string, ShopAnalyticsRow>;
  money: (n: number) => string;
  cost: (n: number | undefined) => string;
  showMoney: boolean;
}) {
  const head = [tr('Branch'), ...(showMoney ? [tr('Aaj'), tr('Bill'), tr('Is mahine'), tr('Drawer'), tr('Stock (cost)'), tr('Kam stock'), tr('Udhaar'), tr('Duty par')] : [tr('Type'), tr('Login'), tr('Stock records')])];
  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
      <Table minWidth="44rem" className="[&_table]:text-[0.8125rem]">
        <THead>
          <Tr>{head.map((h, i) => <Th key={h} className={cn('px-3 py-2.5', i === 0 ? 'ps-5 text-start' : 'text-end')}>{h}</Th>)}</Tr>
        </THead>
        <TBody>
          {shops.map((s) => {
            const f = figOf.get(s.id);
            const T = SHOP_TYPES[s.type];
            return (
              <Tr key={s.id} className="hover:bg-slate-50/60">
                <Td className="py-2.5 ps-5 pe-3">
                  <Link to={`/shops/${s.id}/edit`} className="flex min-w-0 items-center gap-2 font-semibold text-slate-900 hover:text-brand-700">
                    <T.icon className="h-4 w-4 shrink-0" style={{ color: T.color }} /><span className="truncate">{s.name}</span>
                    {s.isMain && <span className="rounded bg-amber-50 px-1.5 text-[0.625rem] font-bold text-amber-800">{tr('MAIN')}</span>}
                    {!s.isActive && <span className="rounded bg-slate-100 px-1.5 text-[0.625rem] font-bold text-slate-600">{tr('BAND')}</span>}
                  </Link>
                </Td>
                {showMoney ? (
                  f ? <>
                    <Num>{money(f.todaySales)}</Num><Num>{f.todayOrders}</Num><Num strong>{money(f.monthSales)}</Num>
                    <Num>{f.registerOpen ? money(f.registerBalance) : <span className="text-slate-400">{tr('Band')}</span>}</Num>
                    <Num>{cost(f.stockValue)}</Num>
                    <Num>{f.lowStockCount > 0 ? <span className="font-semibold text-amber-700">{f.lowStockCount}</span> : <span className="text-slate-400">0</span>}</Num>
                    <Num>{money(f.outstandingCredit)}</Num><Num>{f.staffOnDuty}/{f.staffCount}</Num>
                  </> : <Td colSpan={8} className="px-3 py-2.5 text-end text-slate-400">{s.isActive ? '—' : tr('Band branch')}</Td>
                ) : <>
                  <Num>{T.label}</Num><Num>{s._count?.users ?? 0}</Num><Num>{s._count?.shopStocks ?? 0}</Num>
                </>}
              </Tr>
            );
          })}
        </TBody>
      </Table>
      {showMoney && <p className="flex items-center gap-1.5 border-t border-slate-100 px-5 py-2.5 text-[0.75rem] text-slate-500"><CalendarClock className="h-3.5 w-3.5" />{tr('Sale return ghata kar · drawer ka cash abhi tak ka')}</p>}
    </div>
  );
}

function Num({ children, strong }: { children: ReactNode; strong?: boolean }) {
  return <Td className={cn('whitespace-nowrap px-3 py-2.5 text-end tabular-nums', strong ? 'font-semibold text-slate-900' : 'text-slate-600')}>{children}</Td>;
}
