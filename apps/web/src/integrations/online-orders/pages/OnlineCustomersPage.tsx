/**
 * Online customers for selling again: who buys again and again (VIP,
 * repeat), who has gone quiet (30/60/90 days), who is new, who returns
 * parcels and who is blocked. Each customer opens with their orders; the
 * broadcast tab sends a ready WhatsApp message to the whole segment.
 *
 * Keys: / search · 1 customers · 2 broadcast · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowRight, Copy, Crown, Download, GraduationCap, MessageCircle, Phone, Repeat, Send, ShieldBan, Sparkles, UserMinus, UserPlus, Users, X,
} from 'lucide-react';
import {
  Badge, Button, Card, FilterBar, FilterChip, FilterMenu, IconButton, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton,
  ViewTabs, heroButton, heroIconButton, confirmDialog } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print';
import { PrivacyToggle } from '@core/security/HiddenValue';
import { cn } from '@core/lib/cn';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useAuthStore } from '@core/stores/auth.store';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { apiErrorMessage, onlineOrdersApi, type OnlineCustomer } from '../api/online-orders.api';
import { OrderDrawer } from '../components/orders/OrderDrawer';
import { STATUS_LABEL, waNumber, whenText } from '../lib/labels';
import { downloadCsv, orderNo } from '../lib/orders';
import { customersDoc } from '../lib/print';

type Tab = 'list' | 'broadcast';

const SEGMENTS: Array<{ value: string; label: string; hint: string }> = [
  { value: 'all', label: 'Sab', hint: 'Saare online customers (2 saal)' },
  { value: 'vip', label: 'VIP', hint: 'Sab se zyada kharchne wale 10%' },
  { value: 'repeat', label: 'Dobara lene wale', hint: '2 ya zyada order deliver' },
  { value: 'inactive30', label: '30 din se gayab', hint: 'Pehle le chuke, 30 din se koi order nahi' },
  { value: 'inactive60', label: '60 din se gayab', hint: '60 din se koi order nahi' },
  { value: 'inactive90', label: '90 din se gayab', hint: '90 din se koi order nahi' },
  { value: 'new', label: 'Naye', hint: 'Pehla order pichhle 30 din me' },
  { value: 'risky', label: 'RTO wale', hint: 'Kam az kam ek parcel wapas kiya' },
  { value: 'blocked', label: 'Blocked', hint: 'Block list me' },
];

/** Ready message per segment; {naam} {dukaan} {link} are filled in. */
const TEMPLATES: Record<string, string> = {
  all: 'Assalam o Alaikum {naam}! {dukaan} ki taraf se shukriya 🙏 Naya maal aa gaya hai — dekhne ke liye: {link}',
  vip: 'Assalam o Alaikum {naam}! Aap hamare khaas customer hain ⭐ Sirf aap ke liye 10% discount — code: VIP10. Order: {link}',
  repeat: 'Assalam o Alaikum {naam}! Hamesha {dukaan} par bharosa karne ka shukriya 🙏 Naya stock aa gaya: {link}',
  inactive30: 'Assalam o Alaikum {naam}! Kafi din ho gaye 😊 {dukaan} me naya maal aaya hai — aap ke liye: {link}',
  inactive60: 'Assalam o Alaikum {naam}! Hum aap ko yaad kar rahe hain 🙂 Wapas aane par khaas discount — code: WAPAS10. {link}',
  inactive90: 'Assalam o Alaikum {naam}! {dukaan} ki taraf se aap ke liye 15% discount — code: WAPAS15. Order: {link}',
  new: 'Assalam o Alaikum {naam}! {dukaan} se pehla order karne ka shukriya 🙏 Kaisa laga? Agli dafa ke liye: {link}',
  risky: 'Assalam o Alaikum {naam}! {dukaan} se order ke liye shukriya. Agla order confirm karne ke liye isi number par reply karein.',
  blocked: '',
};

const LS = 'nafaa:customers:templates';
const LS_LINK = 'nafaa:customers:link';
const readLs = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const LIMIT = 50;

export default function OnlineCustomersPage() {
  const qc = useQueryClient();
  const { sales: money } = useMasked();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const shop = useAuthStore((s) => s.tenant?.name) ?? 'Hamari dukaan';
  const [tab, setTab] = useState<Tab>('list');
  const [segment, setSegment] = useState('all');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [templates, setTemplates] = useState<Record<string, string>>(() => ({ ...TEMPLATES, ...readLs(LS, {}) }));
  const [link, setLink] = useState<string>(() => readLs(LS_LINK, ''));
  const [openCustomer, setOpenCustomer] = useState<OnlineCustomer | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [sent, setSent] = useState<Set<string>>(new Set());

  useEffect(() => { const t = setTimeout(() => { setQuery(search.trim()); setPage(0); }, 300); return () => clearTimeout(t); }, [search]);
  useEffect(() => { try { localStorage.setItem(LS, JSON.stringify(templates)); localStorage.setItem(LS_LINK, JSON.stringify(link)); } catch { /* storage blocked */ } }, [templates, link]);
  useEffect(() => { setSent(new Set()); }, [segment]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === '1') setTab('list');
      if (e.key === '2') setTab('broadcast');
      if (e.key === '/') { e.preventDefault(); window.setTimeout(() => searchRef.current?.focus(), 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['online-customers', segment, query, page],
    queryFn: () => onlineOrdersApi.customers({ segment, search: query || undefined, limit: LIMIT, offset: page * LIMIT }),
    placeholderData: (prev) => prev,
  });
  const rows = data?.rows ?? [];
  const pages = Math.ceil((data?.total ?? 0) / LIMIT);
  const seg = SEGMENTS.find((s) => s.value === segment)!;
  const tpl = templates[segment] ?? '';
  const counts = data?.counts ?? {};
  const pickSegment = (v: string) => { setSegment(v); setPage(0); };

  const msgFor = (c: OnlineCustomer) => tpl.replace(/\{naam\}/g, c.name.split(' ')[0] || c.name).replace(/\{dukaan\}/g, shop).replace(/\{link\}/g, link || '').trim();
  const waHref = (c: OnlineCustomer) => {
    const wa = waNumber(c.phone);
    if (!wa || c.blocked) return null;
    const text = msgFor(c);
    return `https://wa.me/${wa}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
  };

  const block = useMutation({
    mutationFn: (c: OnlineCustomer) => (c.blocked ? onlineOrdersApi.unblock(c.phone) : onlineOrdersApi.block({ phone: c.phone, name: c.name, reason: 'Customers safhe se' })),
    onSuccess: (_r, c) => { toast.success(c.blocked ? 'Unblock ho gaya' : 'Block ho gaya'); qc.invalidateQueries({ queryKey: ['online-customers'] }); qc.invalidateQueries({ queryKey: ['blocklist'] }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const askBlock = async (c: OnlineCustomer) => { if (c.blocked || (await confirmDialog({ title: `${c.name} (${c.phone}) block karein?`, text: 'Is number ka naya order khud accept nahi hoga.', danger: true }))) block.mutate(c); };

  /** Every customer in the segment (up to 500) for copy, CSV and print. */
  const fetchAll = () => onlineOrdersApi.customers({ segment, search: query || undefined, limit: 500, offset: 0 });
  const copyNumbers = async () => {
    const all = (await fetchAll()).rows.filter((c) => !c.blocked);
    const nums = all.map((c) => (waNumber(c.phone) ? `+${waNumber(c.phone)}` : c.phone)).join('\n');
    await navigator.clipboard?.writeText(nums);
    toast.success(`${all.length} number copy — WhatsApp broadcast list me paste karein`);
  };
  const exportCsv = async () => {
    const all = (await fetchAll()).rows;
    if (!all.length) { toast.error('Is list me koi customer nahi'); return; }
    downloadCsv(`customers-${segment}.csv`, [
      ['Naam', 'Phone', 'Shehar', 'Orders', 'Deliver', 'Wapas', 'Cancel', 'Kharch (Rs)', 'Ausat order', 'Aakhri order (din pehle)', 'Channels', 'Blocked'],
      ...all.map((c) => [c.name, c.phone, c.city ?? '', c.orders, c.delivered, c.returned, c.cancelled, c.spent, c.avgOrder, c.daysSince, c.channels.join(' / '), c.blocked ? 'Haan' : '']),
    ]);
  };

  return (
    <PageShell>
      <PageHero
        title="Online customers"
        chip={<><Users />{seg.label}</>}
        meta="Kaun baar baar leta hai, kaun gayab ho gaya — aur har ek ko WhatsApp par tayyar message"
        busy={isFetching && !isLoading}
        loading={isLoading}
        actions={<>
          <PrivacyToggle compact />
          <button type="button" onClick={() => void exportCsv()} className={heroButton}><Download className="h-4 w-4" /> CSV</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={async () => customersDoc(await fetchAll(), seg.label)} disabled={!rows.length} /></span>
          <Link to="/online-store/blocklist" className={heroButton}><ShieldBan className="h-4 w-4" /> <span className="hidden sm:inline">Block list</span></Link>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={data ? [
          { label: 'Customers', value: String(data.totals.customers), hint: 'pichhle 2 saal' },
          { label: 'Kul kharch', value: money(data.totals.spent), hint: 'deliver hue orders' },
          { label: 'Dobara lene wale', value: `${data.totals.repeatRate}%`, hint: `${counts.repeat ?? 0}` },
          { label: '30 din se gayab', value: String(counts.inactive30 ?? 0), hint: 'wapas laane ka mauqa' },
        ] : [{ label: 'Customers', value: '' }, { label: 'Kul kharch', value: '' }, { label: 'Dobara', value: '' }, { label: 'Gayab', value: '' }]}
      />

      <KpiRow>
        {!data ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Crown} color="#d97706" label="VIP" value={counts.vip ?? 0} hint="Sab se zyada kharchne wale" onClick={() => pickSegment(segment === 'vip' ? 'all' : 'vip')} active={segment === 'vip'} />
          <KpiCard icon={Repeat} color="#0d9488" label="Dobara lene wale" value={counts.repeat ?? 0} hint="2+ order deliver" onClick={() => pickSegment(segment === 'repeat' ? 'all' : 'repeat')} active={segment === 'repeat'} />
          <KpiCard icon={UserMinus} color="#7c3aed" label="30 din se gayab" value={counts.inactive30 ?? 0} hint={`${counts.inactive90 ?? 0} to 90 din se`} onClick={() => pickSegment(segment === 'inactive30' ? 'all' : 'inactive30')} active={segment === 'inactive30'} />
          <KpiCard icon={UserPlus} color="#2563eb" label="Naye" value={counts.new ?? 0} hint="Pehla order 30 din me" onClick={() => pickSegment(segment === 'new' ? 'all' : 'new')} active={segment === 'new'} />
          <KpiCard icon={ShieldBan} color="#e11d48" label="RTO wale" value={counts.risky ?? 0} hint={`${counts.blocked ?? 0} blocked`} onClick={() => pickSegment(segment === 'risky' ? 'all' : 'risky')} active={segment === 'risky'} />
        </>}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Naam, phone ya shehar…" label="Customer search" />}
        chips={segment !== 'all' || query ? <>
          {segment !== 'all' && <FilterChip onRemove={() => pickSegment('all')}>{seg.label}</FilterChip>}
          {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
        </> : undefined}
        onClear={() => { pickSegment('all'); setSearch(''); }}>
        <FilterMenu icon={Users} label="Kaun se" value={segment} active={segment !== 'all'} onChange={pickSegment} width="w-72" align="right"
          options={SEGMENTS.map((s) => ({ value: s.value, label: `${s.label}${data ? ` (${counts[s.value] ?? 0})` : ''}`, hint: s.hint }))} />
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab} hint={<><Kbd>1</Kbd> customers · <Kbd>2</Kbd> broadcast</>}
        tabs={[{ id: 'list', label: 'Customers', icon: Users, count: data?.total ?? null }, { id: 'broadcast', label: 'WhatsApp broadcast', icon: Send }]} />

      {isError && !data ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <p className="font-semibold text-slate-900">Customers nahi khule</p>
          <p className="mt-1 text-[0.8125rem] text-slate-500">{apiErrorMessage(error)}</p>
          <Button className="mt-3" variant="secondary" onClick={() => refetch()}>Dobara koshish</Button>
        </div>
      ) : tab === 'broadcast' ? (
        segment === 'blocked' ? (
          <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
            <p className="font-semibold text-slate-900">Blocked customers ko message nahi bhejte</p>
            <Button className="mt-3" variant="secondary" onClick={() => pickSegment('all')}>Sab customers</Button>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-5">
            <Card className="rounded-2xl lg:col-span-2" title="Message" description={`${seg.hint}. {naam}, {dukaan} aur {link} khud badal jate hain.`}>
              <textarea value={tpl} onChange={(e) => setTemplates({ ...templates, [segment]: e.target.value })} rows={5} maxLength={600}
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-[0.875rem] outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
              <label className="mt-3 block text-[0.75rem] font-semibold text-slate-600">
                {'{link}'} — order form ya website ka link
                <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" className="mt-1 block h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[0.875rem] font-normal outline-none focus:border-brand-400" />
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="ghost" onClick={() => setTemplates({ ...templates, [segment]: TEMPLATES[segment] })}>Pehla wala message</Button>
                <Button size="sm" variant="secondary" leftIcon={<Copy className="h-4 w-4" />} onClick={() => void copyNumbers()} disabled={!rows.length}>Sab numbers copy</Button>
              </div>
              {rows[0] && (
                <div className="mt-4 rounded-2xl bg-emerald-50 p-3 text-[0.8125rem] text-emerald-950 ring-1 ring-emerald-100">
                  <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-emerald-700">{rows[0].name.split(' ')[0]} ko aise jayega</p>
                  <p className="whitespace-pre-line">{msgFor(rows[0]) || '—'}</p>
                </div>
              )}
            </Card>
            <Card className="rounded-2xl lg:col-span-3" flush title="Ek ek karke bhejein"
              description={`${sent.size} / ${rows.filter((c) => waHref(c)).length} bhej diye (is safhe ke). WhatsApp khulega — "Send" dabayein, phir agla.`}>
              {isLoading ? <div className="p-4"><Skeleton className="h-40 rounded-xl" /></div> : !rows.length ? (
                <p className="px-5 py-10 text-center text-[0.875rem] text-slate-500">Is list me koi customer nahi</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {rows.map((c) => {
                    const href = waHref(c);
                    const done = sent.has(c.key);
                    return (
                      <li key={c.key} className={cn('flex items-center gap-3 px-4 py-2.5 sm:px-5', done && 'bg-emerald-50/50')}>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[0.875rem] font-medium text-slate-900">{c.name}</span>
                          <span className="block text-[0.75rem] text-slate-500">{c.phone}{c.city ? ` · ${c.city}` : ''}</span>
                        </span>
                        {href ? (
                          <a href={href} target="_blank" rel="noreferrer" onClick={() => setSent((s) => new Set(s).add(c.key))}
                            className={cn('inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[0.8125rem] font-semibold', done ? 'bg-white text-emerald-700 ring-1 ring-emerald-200' : 'bg-emerald-600 text-white hover:bg-emerald-700')}>
                            <MessageCircle className="h-4 w-4" />{done ? 'Bhej diya' : 'Bhejein'}
                          </a>
                        ) : <span className="text-[0.75rem] text-slate-400">Number sahi nahi</span>}
                      </li>
                    );
                  })}
                </ul>
              )}
              <PagerRow page={page} pages={pages} total={data?.total ?? 0} setPage={setPage} />
            </Card>
          </div>
        )
      ) : (
        <section className={cn('rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80', isFetching && !isLoading && 'opacity-80')}>
          {isLoading ? <div className="space-y-2 p-4">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div> : !rows.length ? (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><Users className="h-5 w-5" /></span>
              <p className="mt-3 font-semibold text-slate-900">Is list me koi customer nahi</p>
              <p className="mt-1 text-[0.8125rem] text-slate-500">{query ? 'Is talaash se kuch nahi mila.' : seg.hint}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[46rem] text-[0.8125rem]">
                <thead className="text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
                  <tr><th className="px-4 py-2 sm:px-5">Customer</th><th className="px-3 py-2 text-right">Deliver / orders</th><th className="px-3 py-2 text-right">Kharch</th><th className="px-3 py-2 text-right">Aakhri order</th><th className="px-4 py-2 sm:px-5" /></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((c) => {
                    const href = waHref(c);
                    return (
                      <tr key={c.key} className="hover:bg-slate-50/80">
                        <td className="px-4 py-2.5 sm:px-5">
                          <button type="button" onClick={() => setOpenCustomer(c)} className="text-left">
                            <span className="flex flex-wrap items-center gap-1.5">
                              <span className="font-semibold text-slate-900 hover:underline">{c.name}</span>
                              {c.segments.includes('vip') && <Badge variant="accent"><Crown className="h-3 w-3" />VIP</Badge>}
                              {c.segments.includes('new') && <Badge variant="info"><Sparkles className="h-3 w-3" />Naya</Badge>}
                              {c.blocked && <Badge variant="danger">Blocked</Badge>}
                              {c.returned > 0 && !c.blocked && <Badge variant="warning">{c.returned} wapas</Badge>}
                            </span>
                            <span className="block text-[0.75rem] text-slate-500">{c.phone}{c.city ? ` · ${c.city}` : ''}{c.channels.length ? ` · ${c.channels.join(', ')}` : ''}</span>
                          </button>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{c.delivered}<span className="text-slate-400"> / {c.orders}</span></td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          <div className="font-semibold text-slate-900">{money(c.spent)}</div>
                          {c.avgOrder > 0 && <div className="text-[0.6875rem] text-slate-400">ausat {money(c.avgOrder)}</div>}
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-600">{c.daysSince === 0 ? 'aaj' : `${c.daysSince} din pehle`}</td>
                        <td className="px-4 py-2.5 sm:px-5">
                          <div className="flex justify-end gap-1">
                            {href && (
                              <a href={href} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 text-[0.8125rem] font-semibold text-white hover:bg-emerald-700">
                                <MessageCircle className="h-4 w-4" /><span className="hidden md:inline">WhatsApp</span>
                              </a>
                            )}
                            <a href={`tel:${c.phone}`} title="Call" aria-label="Call" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"><Phone className="h-4 w-4" /></a>
                            <button type="button" onClick={() => askBlock(c)} disabled={block.isPending && block.variables?.key === c.key}
                              title={c.blocked ? 'Unblock' : 'Block'} className={cn('inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[0.8125rem] font-semibold disabled:opacity-50', c.blocked ? 'text-slate-700 hover:bg-slate-100' : 'text-rose-600 hover:bg-rose-50')}>
                              <ShieldBan className="h-4 w-4" />{c.blocked && 'Unblock'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <PagerRow page={page} pages={pages} total={data?.total ?? 0} setPage={setPage} />
        </section>
      )}

      {openCustomer && <CustomerDrawer c={openCustomer} money={money} wa={waHref(openCustomer)} onClose={() => setOpenCustomer(null)} onOrder={setOrderId} onBlock={() => askBlock(openCustomer)} />}
      {orderId && <OrderDrawer orderId={orderId} onClose={() => setOrderId(null)} />}
      {guide.isOpen && (
        <PageGuide title="Online customers — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Crown, color: '#d97706', title: 'VIP', text: 'Sab se zyada kharchne wale 10% (kam az kam 2 order deliver). Inhein khaas discount dein.' },
            { icon: UserMinus, color: '#7c3aed', title: 'Gayab customers', text: '30, 60 ya 90 din se order nahi kiya. Ek WhatsApp message aksar wapas le aata hai.' },
            { icon: Send, color: '#16a34a', title: 'Broadcast', text: 'Message likhein, phir ek ek customer ko "Bhejein" — WhatsApp khulta hai, Send dabayein. Ya sab numbers copy karke WhatsApp broadcast list banayein.' },
            { icon: Users, color: '#2563eb', title: 'Customer kholein', text: 'Naam par click karein — us ke saare orders, kharch aur RTO ek jagah. Order par click se poori details.' },
            { icon: ShieldBan, color: '#e11d48', title: 'Block', text: 'Fake ya baar baar RTO wale number block karein — un ka naya order khud accept nahi hota.' },
            { icon: Download, color: '#0891b2', title: 'CSV / print', text: 'Is list ke customers Excel ya PDF me — marketing ya record ke liye.' },
          ]}
          tips={['Customer phone number se pehchana jata hai — alag channels ke orders ek hi customer me jurte hain.', 'Test order kisi ginti me nahi aata.', 'Message is browser me yaad rehta hai.']}
          shortcuts={[['/', 'dhoondein'], ['1', 'customers'], ['2', 'broadcast'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function PagerRow({ page, pages, total, setPage }: { page: number; pages: number; total: number; setPage: (fn: (p: number) => number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-[0.8125rem] text-slate-500 sm:px-5">
      <span>{total} customers · safha {page + 1} / {pages}</span>
      <div className="flex gap-1">
        <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Pichhla</Button>
        <Button size="sm" variant="secondary" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Agla</Button>
      </div>
    </div>
  );
}

/** One customer's orders across every channel, found by phone. */
function CustomerDrawer({ c, money, wa, onClose, onOrder, onBlock }: {
  c: OnlineCustomer; money: (n: number) => string; wa: string | null; onClose: () => void; onOrder: (id: string) => void; onBlock: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['online-orders', 'customer', c.phone],
    queryFn: () => onlineOrdersApi.list({ search: c.phone, limit: 50 }),
  });
  useEffect(() => {
    // Leave Escape to an order drawer or modal opened on top of this one.
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && document.querySelectorAll('[role="dialog"][aria-modal="true"]').length === 1) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const facts: Array<[string, string]> = [
    ['Orders', String(c.orders)], ['Deliver', String(c.delivered)], ['Wapas', String(c.returned)], ['Cancel', String(c.cancelled)],
    ['Kharch', money(c.spent)], ['Ausat', money(c.avgOrder)],
  ];
  return createPortal(
    <div className="fixed inset-0 z-[85] flex justify-end">
      <div className="absolute inset-0 bg-slate-950/40" onClick={onClose} aria-hidden />
      <aside role="dialog" aria-modal="true" data-drawer aria-label={c.name} className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-slate-900">{c.name}</h2>
            <p className="text-[0.8125rem] text-slate-500">{c.phone}{c.city ? ` · ${c.city}` : ''} · pehla order {whenText(c.firstAt)}</p>
          </div>
          <IconButton label="Band karein" onClick={onClose}><X className="h-4 w-4" /></IconButton>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <dl className="grid grid-cols-3 gap-2">
            {facts.map(([k, v]) => (
              <div key={k} className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
                <dt className="text-[0.6875rem] text-slate-500">{k}</dt>
                <dd className="truncate text-[0.9375rem] font-bold tabular-nums text-slate-900">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-2">
            {wa && <a href={wa} target="_blank" rel="noreferrer"><Button size="sm" variant="success" leftIcon={<MessageCircle className="h-4 w-4" />}>WhatsApp</Button></a>}
            <a href={`tel:${c.phone}`}><Button size="sm" variant="secondary" leftIcon={<Phone className="h-4 w-4" />}>Call</Button></a>
            <Button size="sm" variant={c.blocked ? 'secondary' : 'critical'} leftIcon={<ShieldBan className="h-4 w-4" />} onClick={onBlock}>{c.blocked ? 'Unblock' : 'Block'}</Button>
          </div>
          <section>
            <h3 className="mb-2 text-[0.8125rem] font-semibold text-slate-900">Orders</h3>
            {isLoading ? <Skeleton className="h-32 rounded-xl" /> : !data?.items.length ? <p className="text-[0.8125rem] text-slate-500">Koi order nahi mila</p> : (
              <ul className="divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200">
                {data.items.map((o) => {
                  const st = STATUS_LABEL[o.orderStatus] ?? STATUS_LABEL.PENDING;
                  return (
                    <li key={o.id}>
                      <button type="button" onClick={() => onOrder(o.id)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50">
                        <span className="min-w-0 flex-1">
                          <span className="block text-[0.875rem] font-semibold text-slate-900">#{orderNo(o)} <span className={cn('ml-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold', st.tone)}>{st.short}</span></span>
                          <span className="block truncate text-[0.75rem] text-slate-500">{whenText(o.receivedAt)} · {o.integration?.displayName ?? ''} · {o.items.length} cheezein</span>
                        </span>
                        <span className="text-[0.875rem] font-semibold tabular-nums text-slate-900">{money(o.total)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          <Link to={`/online-orders?search=${encodeURIComponent(c.phone)}`} className="inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-brand-700 hover:underline">
            Online orders me kholein <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </aside>
    </div>,
    document.body,
  );
}
