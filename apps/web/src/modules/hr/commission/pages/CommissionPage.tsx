/**
 * Staff commission for a business month: what each person earned from their
 * own sales (returns taken off in the month they came back), what is paid
 * and what is still due; a leaderboard; rules and who commission is on for;
 * the payout record; and twelve months of analytics. A person with only
 * `commission.own` sees just their own figures.
 *
 * Keys: N new rule · / search · [ ] month · 1-6 tabs · G guide.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, ArrowDownWideNarrow, BarChart3, CalendarDays, CheckCircle2, ChevronRight, Clock, Download, Filter, Gauge, GraduationCap,
  HandCoins, Info, ListChecks, Plus, Printer, Store, Target, TrendingDown, TrendingUp, Trophy, UserCheck, Users, Wallet,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print';
import {
  Avatar, Button, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton, confirmDialog } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useIsAllShops } from '@core/stores/auth.store';
import { useCostHidden } from '@core/security/HiddenValue';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { shopsApi } from '@modules/organization/shops/api/shops.api';
import type { CommissionDetail, CommissionPerson, CommissionRow, CommissionRule } from '../api/commission.api';
import { CommissionAnalytics } from '../components/CommissionAnalytics';
import { CommissionDetailDrawer } from '../components/CommissionDetailDrawer';
import { CommissionRuleModal } from '../components/CommissionRuleModal';
import { Leaderboard } from '../components/Leaderboard';
import { PayModal } from '../components/PayModal';
import { PayoutsTab } from '../components/PayoutsTab';
import { RulesTab, toPayload } from '../components/RulesTab';
import { TeamTab } from '../components/TeamTab';
import { PAY, downloadCsv, periodLabel, recentPeriods, shiftPeriod, signed } from '../components/meta';
import { monthDoc } from '../components/print';
import { useCommission, useThisPeriod } from '../hooks/useCommission';
import { t, Trans } from '@core/i18n';

type Tab = 'hisab' | 'board' | 'rules' | 'team' | 'payouts' | 'analytics';
type Status = '' | 'due' | 'paid' | 'minus' | 'off';
type Sort = 'earned' | 'sale' | 'due' | 'name';

const STATUS_LABEL: Record<Exclude<Status, ''>, string> = { due: t('Dena baqi'), paid: t('Ada ho gayi'), minus: t('Minus / zyada ada'), off: t('Commission band') };
const SORT_LABEL: Record<Sort, string> = { earned: t('Commission zyada pehle'), sale: t('Sale zyada pehle'), due: t('Baqi zyada pehle'), name: t('Naam se') };

export default function CommissionPage() {
  const thisPeriod = useThisPeriod();
  const allShops = useIsAllShops();
  const costHidden = useCostHidden();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);

  const [period, setPeriod] = useState(thisPeriod);
  const [tab, setTab] = useState<Tab>('hisab');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<Status>('');
  const [sort, setSort] = useState<Sort>('earned');
  const [shopId, setShopId] = useState('');
  const [open, setOpen] = useState<{ userId: string; name: string } | null>(null);
  const [paying, setPaying] = useState<CommissionRow | null>(null);
  const [ruleForm, setRuleForm] = useState<{ rule?: CommissionRule } | null>(null);

  const c = useCommission(period);
  const s = c.summary;
  const own = s?.scope === 'own';
  const manage = c.canManage && !own;

  const catsQ = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list, staleTime: 5 * 60_000, enabled: manage });
  const shopsQ = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list, staleTime: 5 * 60_000, enabled: allShops && !own });
  const shops = (shopsQ.data ?? []).filter((x) => x.isActive);
  const categories = (catsQ.data ?? []) as Array<{ id: string; name: string }>;
  useEffect(() => { if (!allShops) setShopId(''); }, [allShops]);
  useEffect(() => { if (own && ['rules', 'team', 'board'].includes(tab)) setTab('hisab'); }, [own, tab]);

  const inShop = (r: CommissionRow) => !shopId || r.shopId === shopId || !!r.shops?.some((x) => x.shopId === shopId);
  const needle = search.trim().toLowerCase();
  const rows = useMemo(() => {
    const list = (s?.rows ?? []).filter((r) => inShop(r) && (!needle || r.name.toLowerCase().includes(needle)
      || (r.staff?.designation ?? '').toLowerCase().includes(needle) || (r.staff?.staffNumber ?? '').toLowerCase().includes(needle)))
      .filter((r) => !status
        || (status === 'due' && r.enrolled && r.due > 0)
        || (status === 'paid' && (r.payStatus === 'full' || r.payStatus === 'over'))
        || (status === 'minus' && (r.earned < 0 || r.payStatus === 'over'))
        || (status === 'off' && !r.enrolled));
    const by: Record<Sort, (a: CommissionRow, b: CommissionRow) => number> = {
      earned: (a, b) => Number(b.enrolled) - Number(a.enrolled) || b.earned - a.earned || b.sale - a.sale,
      sale: (a, b) => b.sale - a.sale,
      due: (a, b) => b.due - a.due || b.earned - a.earned,
      name: (a, b) => a.name.localeCompare(b.name),
    };
    return [...list].sort(by[sort]);
  }, [s, shopId, needle, status, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  const people = c.people.filter((p) => !shopId || p.shopId === shopId);
  const withoutLogin = c.withoutLogin.filter((p) => !shopId || p.shopId === shopId);
  const filtered = !!needle || !!status || !!shopId;
  const clear = () => { setSearch(''); setStatus(''); setShopId(''); };
  const live = rows.filter((r) => r.enrolled);
  const totals = {
    earned: live.reduce((a, r) => a + r.earned, 0),
    paid: rows.reduce((a, r) => a + (r.paidAmount ?? 0), 0),
    due: rows.reduce((a, r) => a + r.due, 0),
  };
  const change = s && s.previousTotal ? Math.round(((s.total - s.previousTotal) / Math.abs(s.previousTotal)) * 100) : null;
  const leader = [...live].sort((a, b) => b.sale - a.sale)[0];
  const filterText = [shopId && shops.find((x) => x.id === shopId)?.name, status && STATUS_LABEL[status], needle && `"${needle}"`].filter(Boolean).join(' · ');

  const periods = useMemo(() => recentPeriods(thisPeriod, 24), [thisPeriod]);
  const step = (by: number) => setPeriod((p) => { const n = shiftPeriod(p, by); return n > thisPeriod ? p : n; });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen() || open) return;
      if ((e.key === 'n' || e.key === 'N') && manage) { e.preventDefault(); setRuleForm({}); }
      if (e.key === '/') { e.preventDefault(); setTab('hisab'); window.setTimeout(() => searchRef.current?.focus(), 0); }
      if (e.key === '[') step(-1);
      if (e.key === ']') step(1);
      const tabs: Tab[] = own ? ['hisab', 'payouts', 'analytics'] : ['hisab', 'board', 'rules', 'team', 'payouts', 'analytics'];
      const i = Number(e.key) - 1;
      if (i >= 0 && i < tabs.length) setTab(tabs[i]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [manage, own, open]); // eslint-disable-line react-hooks/exhaustive-deps

  const exportCsv = () => {
    if (!rows.length) return toast.error(t('Koi hisab nahi'));
    downloadCsv(`commission-${period}.csv`, [
      [t('Commission — {{period}}', { period: periodLabel(period) })], [''],
      [t('Banda'), t('Kaam'), t('Chaalu'), t('Bill'), t('Sale'), t('Return'), t('Asal sale'), t('Commission'), t('Bonus'), t('Ada'), t('Baqi'), t('Haal')],
      ...rows.map((r) => [
        r.name, r.staff?.designation ?? '', r.enrolled ? t('Haan') : t('Nahi'), r.bills, r.grossSale.toFixed(2), r.returnSale.toFixed(2), r.sale.toFixed(2),
        r.earned, r.bonus, (r.paidAmount ?? 0).toFixed(2), r.due.toFixed(2), PAY[r.payStatus].label,
      ]),
    ]);
  };

  const togglePerson = async (p: CommissionPerson, on: boolean) => {
    if (!on && !(await confirmDialog({ title: t('{{name}} par commission band karein?', { name: p.name }), text: t('Is ki commission har us mahine me 0 dikhegi jo abhi ada nahi hua.'), danger: true }))) return;
    c.enroll.mutate({ userId: p.userId!, on, staffId: p.staff?.id });
  };
  const undo = async (r: { userId: string; name: string; paidAmount?: number | null }) => {
    if ((await confirmDialog({ title: t('{{name}} ki {{period}} ki payment ({{formatPKR}}) wapas lein?', { name: r.name, period: periodLabel(period), formatPKR: formatPKR(r.paidAmount ?? 0) }), text: t('Ye sirf record hatata hai — paise khud wapas lene honge.'), danger: true }))) c.undoPay.mutate(r.userId);
  };

  const tabs = own
    ? [
      { id: 'hisab' as const, label: t('Mera hisab'), icon: ListChecks },
      { id: 'payouts' as const, label: t('Payment'), icon: Wallet },
      { id: 'analytics' as const, label: t('Analytics'), icon: BarChart3 },
    ]
    : [
      { id: 'hisab' as const, label: t('Hisab'), icon: ListChecks, count: rows.length || null },
      { id: 'board' as const, label: t('Leaderboard'), icon: Trophy },
      ...(manage ? [
        { id: 'rules' as const, label: t('Rules'), icon: Gauge, count: c.rules.filter((r) => r.isActive).length || null },
        { id: 'team' as const, label: t('Team'), icon: UserCheck, count: s?.enabledCount || null },
      ] : []),
      { id: 'payouts' as const, label: t('Payment'), icon: Wallet },
      { id: 'analytics' as const, label: t('Analytics'), icon: BarChart3 },
    ];

  return (
    <PageShell>
      <PageHero
        title={t('Commission')}
        chip={<><HandCoins /> {periodLabel(period)}</>}
        meta={own ? t('Aap ki apni sale par commission') : t('Bandon ki sale par unka hissa — asli sale se, return nikaal kar')}
        busy={c.summaryQ.isFetching && !c.summaryQ.isLoading}
        loading={c.summaryQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800">
            <PrintButton doc={() => monthDoc(s!, rows, filterText)} disabled={!s || !rows.length || tab !== 'hisab'} />
          </span>
          <button type="button" onClick={exportCsv} className={heroButton} disabled={!rows.length}><Download className="h-4 w-4" /> {' '}{t('CSV')}</button>
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {manage && <button type="button" onClick={() => setRuleForm({})} title={t('Naya rule (N)')} className={heroPrimaryButton}><Plus className="h-4 w-4" /> {' '}{t('Naya rule')}</button>}
        </>}
        stats={s ? [
          { label: own ? t('Meri commission') : t('Kul commission'), value: signed(totals.earned), hint: own ? undefined : t('{{count}} bande', { count: live.length }) },
          { label: t('Ada hui'), value: formatPKR(totals.paid) },
          { label: t('Dena baqi'), value: formatPKR(totals.due) },
          ...(!own && s.payTotal ? [{ label: t('Tankhwah + commission'), value: formatPKR(s.payTotal), hint: t('mahine ka bojh') }] : []),
        ] : [{ label: t('Kul commission'), value: '—' }]}
      />

      <KpiRow cols={5}>
        {!s ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={change != null && change < 0 ? TrendingDown : TrendingUp} color="#7c3aed" label={t('Pichle mahine se')}
            value={change == null ? '—' : `${change > 0 ? '+' : ''}${change}%`} hint={`${periodLabel(shiftPeriod(period, -1), true)}: ${formatPKR(s.previousTotal)}`}
            onClick={() => step(-1)} />
          <KpiCard icon={Clock} color="#d97706" label={t('Dena baqi')} value={formatPKR(totals.due)}
            hint={t('{{count}} bandon ka', { count: rows.filter((r) => r.enrolled && r.due > 0).length })} onClick={() => { setTab('hisab'); setStatus('due'); }} active={tab === 'hisab' && status === 'due'} />
          <KpiCard icon={CheckCircle2} color="#16a34a" label={t('Ada hui')} value={formatPKR(totals.paid)}
            hint={t('{{count}} poori ada', { count: rows.filter((r) => r.payStatus === 'full' || r.payStatus === 'over').length })} onClick={() => { setTab('hisab'); setStatus('paid'); }} active={tab === 'hisab' && status === 'paid'} />
          <KpiCard icon={Wallet} color="#0891b2" label={t('Asal sale')} value={formatPKR(live.reduce((a, r) => a + r.sale, 0))}
            hint={s.returnTotal ? t('Return {{returnTotal}} nikaal kar', { returnTotal: formatPKR(s.returnTotal) }) : t('Chaalu bandon ki')} />
          {own ? (
            <KpiCard icon={Target} color="#db2777" label={t('Target')} value={rows[0]?.targets[0] ? `${Math.round(rows[0].targets[0].pct)}%` : '—'}
              hint={rows[0]?.targets[0] ? t('{{amount}} me se', { amount: formatPKR(rows[0].targets[0].amount) }) : t('Koi target nahi')} />
          ) : (
            <KpiCard icon={Trophy} color="#f59e0b" label={t('Sab se zyada sale')} value={leader?.name ?? '—'}
              hint={leader ? t('{{sale}} · {{bills}} bill', { sale: formatPKR(leader.sale), bills: leader.bills }) : t('Abhi koi nahi')} onClick={leader ? () => setTab('board') : undefined} active={tab === 'board'} />
          )}
        </>}
      </KpiRow>

      <FilterBar
        search={['hisab', 'payouts', 'team'].includes(tab)
          ? <SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={t('Bande ka naam, kaam ya staff #…')} label={t('Search')} />
          : <p className="flex min-w-0 flex-1 items-center text-[0.8125rem] text-slate-500">{tab === 'analytics' ? t('{{periodLabel}} se {{period}} tak', { periodLabel: periodLabel(shiftPeriod(period, -11), true), period: periodLabel(period, true) }) : t('Mahina badal kar dekhein')}</p>}
        chips={filtered ? <>
          {shopId && <FilterChip onRemove={() => setShopId('')}>{shops.find((x) => x.id === shopId)?.name ?? t('Branch')}</FilterChip>}
          {status && <FilterChip onRemove={() => setStatus('')}>{STATUS_LABEL[status]}</FilterChip>}
          {needle && <FilterChip onRemove={() => setSearch('')}>"{needle}"</FilterChip>}
        </> : undefined}
        onClear={clear}>
        <FilterMenu icon={CalendarDays} label={periodLabel(period)} value={period} active={period !== thisPeriod} onChange={setPeriod} width="w-56"
          options={periods.map((p) => ({ value: p, label: periodLabel(p), hint: p === thisPeriod ? t('Chal raha hai') : undefined }))} />
        {!own && allShops && shops.length > 1 && (
          <FilterMenu icon={Store} label={t('Branch')} value={shopId} active={!!shopId} onChange={setShopId}
            options={[{ value: '', label: t('Sab branches') }, ...shops.map((x) => ({ value: x.id, label: x.name }))]} />
        )}
        {!own && tab === 'hisab' && <>
          <FilterMenu icon={Filter} label={t('Haal')} value={status} active={!!status} onChange={setStatus} align="right"
            options={[{ value: '' as Status, label: t('Sab') }, ...(Object.keys(STATUS_LABEL) as Array<Exclude<Status, ''>>).map((k) => ({ value: k as Status, label: STATUS_LABEL[k] }))]} />
          <FilterMenu icon={ArrowDownWideNarrow} label={SORT_LABEL[sort]} value={sort} onChange={setSort} align="right"
            options={(Object.keys(SORT_LABEL) as Sort[]).map((k) => ({ value: k, label: SORT_LABEL[k] }))} />
        </>}
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab} tabs={tabs}
        hint={<>{manage && <><Kbd>N</Kbd> {' '}{t('rule ·')}{' '} </>}<Kbd>[</Kbd><Kbd>]</Kbd> {' '}{t('mahina ·')}{' '} <Kbd>1</Kbd>-<Kbd>{tabs.length}</Kbd> {' '}{t('tabs')}</>} />

      {tab === 'hisab' && <>
        {own && <Note icon={Info} tone="sky">{t('Ye aap ka apna hisab hai. Rate ya payment par sawal ho to dukaan ke malik se baat karein. Kisi line par click karein to poori details khulti hai.')}</Note>}
        {!own && s && <Warnings s={s} withoutLogin={withoutLogin.length} manage={manage} onTeam={() => setTab('team')} onOff={() => setStatus('off')} />}
        {s && !s.ruleCount && manage && (
          <Note icon={Gauge} tone="amber">{t('Abhi koi chaalu rule nahi, is liye kisi ki commission nahi ban rahi.')}{' '} <button type="button" className="font-semibold underline" onClick={() => setRuleForm({})}>{t('Rule banayein')}</button></Note>
        )}
        <HisabList rows={rows} loading={c.summaryQ.isLoading} failed={c.summaryQ.isError && !s} retry={() => c.summaryQ.refetch()}
          filtered={filtered} clear={clear} manage={manage} busy={c.busy}
          onOpen={(r) => setOpen({ userId: r.userId, name: r.name })} onPay={setPaying} onUndo={undo} />
      </>}
      {tab === 'board' && <Leaderboard rows={rows} onOpen={(r) => setOpen({ userId: r.userId, name: r.name })} />}
      {tab === 'rules' && manage && (
        <RulesTab rules={c.rules} loading={c.rulesLoading} categories={categories} busy={c.busy}
          onNew={() => setRuleForm({})} onEdit={(rule) => setRuleForm({ rule })}
          onToggle={(r) => c.saveRule.mutate({ id: r.id, data: toPayload(r, { isActive: !r.isActive }) })} />
      )}
      {tab === 'team' && manage && (
        <TeamTab people={people.filter((p) => !needle || p.name.toLowerCase().includes(needle))} withoutLogin={withoutLogin}
          rows={s?.rows ?? []} loading={c.peopleLoading} busy={c.busy} onToggle={togglePerson} />
      )}
      {tab === 'payouts' && <PayoutsTab period={period} search={search} />}
      {tab === 'analytics' && <CommissionAnalytics period={period} onPerson={(userId, name) => setOpen({ userId, name })} />}

      {open && (
        <CommissionDetailDrawer userId={open.userId} name={open.name} period={period} canManage={manage} costHidden={costHidden} busy={c.busy}
          onClose={() => setOpen(null)} onPay={(d: CommissionDetail) => setPaying(d)} onUndo={(d) => undo(d)} />
      )}
      {paying && (
        <PayModal row={paying} period={period} saving={c.pay.isPending} onClose={() => setPaying(null)}
          onPay={(a) => c.pay.mutate({ userId: paying.userId, ...a }, { onSuccess: () => setPaying(null) })} />
      )}
      {ruleForm && (
        <CommissionRuleModal rule={ruleForm.rule} people={c.people} categories={categories} saving={c.saveRule.isPending || c.removeRule.isPending}
          onClose={() => setRuleForm(null)}
          onSave={(data) => c.saveRule.mutate({ id: ruleForm.rule?.id, data }, { onSuccess: () => setRuleForm(null) })}
          onDelete={ruleForm.rule ? () => c.removeRule.mutate(ruleForm.rule!.id, { onSuccess: () => setRuleForm(null) }) : undefined} />
      )}

      {guide.isOpen && (
        <PageGuide title={t('Commission — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: Gauge, color: '#7c3aed', title: t('Rule banayein'), text: t('Kis par (sale, profit ya har bill) aur kitna (percent ya fixed). Category, kam se kam sale aur target bonus bhi laga sakte hain.') },
            { icon: UserCheck, color: '#16a34a', title: t('Bande chaalu karein'), text: t('Team tab me har bande ka switch. Sirf chaalu bandon ki commission banti hai aur wohi POS par "sale kis ke naam" me aate hain.') },
            { icon: ListChecks, color: '#0891b2', title: t('Hisab khud banta hai'), text: t('Har bill se: discount ke baad maal ki qeemat. Void bill nahi gine jate. Wapas aaya maal us mahine me katta hai jis me wapas aaya.') },
            { icon: HandCoins, color: '#d97706', title: t('Payment likhein'), text: t('"Ada karein" se poori ya kuch amount likhein. Double click se dobara nahi likhti. Ghalti ho to drawer se "Payment wapas".') },
            { icon: Printer, color: '#db2777', title: t('Statement aur slip'), text: t('Kisi bande par click karein: Statement (A4/PDF) me poori details, Slip (thermal/A4) dastkhat ke saath bande ko dene ke liye.') },
            { icon: BarChart3, color: '#2563eb', title: t('Leaderboard aur analytics'), text: t('Kaun sab se aage hai, target kitna poora, aur 12 mahine me commission aur payment.') },
          ]}
          tips={[
            t('Slab chahiye? Do rule banayein: "2% sale par" aur "1% aur — kam se kam sale 2 lakh". Dono jur jate hain.'),
            t('Jis bande ka apna rule hai, us par "sab ke liye" wale rule nahi lagte.'),
            t('Rule badalne se wo mahine bhi badalte hain jo abhi ada nahi hue. Ada ki hui amount nahi badalti.'),
            t('Commission tankhwah ke saath deni ho to Payroll khud yahan "ada" likh deta hai. Yahan pehle ada likhi ho to Payroll use dobara nahi jorta.'),
            t('Apni commission dekhne ke liye "Apni commission" ki ijazat kaafi hai; doosron ki dekhne ke liye "Sab ki commission".'),
          ]}
          shortcuts={[['N', t('naya rule')], ['/', t('dhoondein')], ['[ ]', t('pichla / agla mahina')], ['1-6', t('tabs')], ['G', t('guide')]]}
        />
      )}
    </PageShell>
  );
}

function Note({ icon: I, tone, children }: { icon: typeof Info; tone: 'sky' | 'amber'; children: ReactNode }) {
  return (
    <p className={cn('flex items-start gap-2 rounded-2xl px-4 py-2.5 text-[0.8125rem] ring-1', tone === 'sky' ? 'bg-sky-50 text-sky-900 ring-sky-200' : 'bg-amber-50 text-amber-900 ring-amber-200')}>
      <I className="mt-0.5 h-4 w-4 shrink-0" /><span>{children}</span>
    </p>
  );
}

function Warnings({ s, withoutLogin, manage, onTeam, onOff }: {
  s: NonNullable<ReturnType<typeof useCommission>['summary']>; withoutLogin: number; manage: boolean; onTeam: () => void; onOff: () => void;
}) {
  const items: ReactNode[] = [];
  if (s.notEnrolled.length) items.push(<><b>{t('{{count}} bandon', { count: s.notEnrolled.length })}</b> {' '}{t('ki sale hai magar commission chaalu nahi ({{value}}{{value2}}).', { value: s.notEnrolled.slice(0, 3).map((r) => r.name).join(', '), value2: s.notEnrolled.length > 3 ? '…' : '' })}{' '} <button type="button" className="font-semibold underline" onClick={manage ? onTeam : onOff}>{t('Dekhein')}</button></>);
  if (s.orphanBills) items.push(<><b>{t('{{orphanBills}} bill', { orphanBills: s.orphanBills })}</b> {' '}{t('par kisi bande ka naam nahi ({{orphanSale}}) — in ki commission kisi ko nahi milti.', { orphanSale: formatPKR(s.orphanSale) })}</>);
  if (withoutLogin && manage) items.push(<><b>{t('{{withoutLogin}} employee', { withoutLogin })}</b> {' '}{t('ka apna login nahi — un ki sale darj nahi hoti.')}{' '} <button type="button" className="font-semibold underline" onClick={onTeam}>{t('Team')}</button></>);
  if (s.overpaidTotal > 0) items.push(<Trans text="Kuch bandon ko banti se {{amount}} zyada ada hua hai (baad me bill void hua ya rule badla)." values={{ amount: <b>{formatPKR(s.overpaidTotal)}</b> }} />);
  if (s.noCostLines) items.push(<>{t('{{noCostLines}} sale lines par cost nahi thi — profit wale rule me aaj ki cost lagi.', { noCostLines: s.noCostLines })}</>);
  if (!items.length) return null;
  return (
    <div className="space-y-1.5 rounded-2xl bg-amber-50 px-4 py-3 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
      {items.map((x, i) => <p key={i} className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>{x}</span></p>)}
    </div>
  );
}

function HisabList({ rows, loading, failed, retry, filtered, clear, manage, busy, onOpen, onPay, onUndo }: {
  rows: CommissionRow[]; loading: boolean; failed: boolean; retry: () => void; filtered: boolean; clear: () => void;
  manage: boolean; busy: boolean; onOpen: (r: CommissionRow) => void; onPay: (r: CommissionRow) => void; onUndo: (r: CommissionRow) => void;
}) {
  if (loading) return <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;
  if (failed) {
    return (
      <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
        <p className="font-semibold text-slate-900">{t('Hisab load nahi hua')}</p>
        <Button className="mt-3" variant="secondary" onClick={retry}>{t('Dobara koshish')}</Button>
      </div>
    );
  }
  if (!rows.length) {
    return (
      <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
        <Users className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-3 font-semibold text-slate-900">{filtered ? t('Is filter me koi banda nahi') : t('Is mahine koi hisab nahi')}</p>
        <p className="mt-1 text-sm text-slate-500">{t('Jin par commission chaalu hai ya jinhon ne sale ki, woh yahan aate hain.')}</p>
        {filtered && <Button className="mt-3" variant="ghost" onClick={clear}>{t('Filter saaf karein')}</Button>}
      </div>
    );
  }
  return (
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
      {rows.map((r) => {
        const st = PAY[r.payStatus];
        return (
          <li key={r.userId} className={cn(!r.enrolled && 'bg-slate-50/60')}>
            <div className="flex items-center gap-3 px-3 py-3 sm:px-4">
              <button type="button" onClick={() => onOpen(r)} className="flex min-w-0 flex-1 items-center gap-3 text-start">
                <Avatar name={r.name} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate font-semibold text-slate-900">{r.name}</span>
                    {!r.enrolled && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.6875rem] text-slate-500 ring-1 ring-slate-200">{t('Commission band')}</span>}
                    {r.enrolled && <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', st.tone)}><st.icon className="h-3 w-3" />{st.label}</span>}
                  </span>
                  <span className="mt-0.5 block truncate text-[0.75rem] text-slate-500">
                    {t('{{bills}} bill · sale {{sale}}{{value}}{{value2}}{{value3}}', { bills: r.bills, sale: formatPKR(r.sale), value: r.returnSale ? t(' (return −{{returnSale}})', { returnSale: formatPKR(r.returnSale) }) : '', value2: r.blockedByMin && !r.lines.length ? t(' · hadd se {{short}} kam', { short: formatPKR(r.blockedByMin.short) }) : '', value3: r.targets[0] ? t(' · target {{pct}}%', { pct: Math.round(r.targets[0].pct) }) : '' })}
                  </span>
                </span>
              </button>
              <div className="shrink-0 text-end">
                <p className={cn('text-base font-bold tabular-nums', r.earned < 0 ? 'text-rose-700' : r.enrolled ? 'text-slate-900' : 'text-slate-400')}>{signed(r.earned)}</p>
                <p className="text-[0.6875rem] tabular-nums text-slate-500">{r.due > 0 ? t('Baqi {{due}}', { due: formatPKR(r.due) }) : r.paidAmount != null ? t('Ada {{paidAmount}}', { paidAmount: formatPKR(r.paidAmount) }) : ' '}</p>
              </div>
              {manage && r.enrolled && r.due > 0 && !r.paidInSalary && (
                <Button size="sm" onClick={() => onPay(r)} disabled={busy} leftIcon={<HandCoins className="h-4 w-4" />} className="hidden sm:inline-flex">{t('Ada karein')}</Button>
              )}
              {manage && r.paidAmount != null && r.due <= 0 && !r.paidInSalary && (
                <Button size="sm" variant="ghost" onClick={() => onUndo(r)} disabled={busy} className="hidden text-slate-500 sm:inline-flex">{t('Wapas')}</Button>
              )}
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 rtl-flip" />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
