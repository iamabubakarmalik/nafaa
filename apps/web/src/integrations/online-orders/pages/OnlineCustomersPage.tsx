import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Copy, Download, MessageCircle, Phone, Search, ShieldBan, Users } from 'lucide-react';
import { useAuthStore } from '@core/stores/auth.store';
import { apiErrorMessage, onlineOrdersApi, type OnlineCustomer } from '../api/online-orders.api';
import { rs, waNumber } from '../lib/labels';
import { Badge, Btn, Card, EmptyState, Page, Stat, inputCls } from '../components/ui/kit';
import { cn } from '@core/lib/cn';

/* ═════════════════════════════════════════════════════════════
   ONLINE CUSTOMERS — dobara bechna. Kaun baar baar leta hai (VIP),
   kaun gayab ho gaya (30/60/90 din), kaun naya hai — aur har ek ko
   WhatsApp par tayyar paigham ek click me.
   ═════════════════════════════════════════════════════════════ */

const SEGMENTS: { key: string; label: string; hint: string }[] = [
  { key: 'all', label: 'Sab', hint: 'Saare online customers (2 saal)' },
  { key: 'vip', label: 'VIP', hint: 'Sab se zyada kharchne wale 10%' },
  { key: 'repeat', label: 'Dobara lene wale', hint: '2 ya zyada order deliver' },
  { key: 'inactive30', label: '30 din se gayab', hint: 'Pehle le chuke, 30 din se koi order nahi' },
  { key: 'inactive60', label: '60 din', hint: '60 din se koi order nahi' },
  { key: 'inactive90', label: '90 din', hint: '90 din se koi order nahi' },
  { key: 'new', label: 'Naye', hint: 'Pehla order pichhle 30 din me' },
  { key: 'risky', label: 'RTO wale', hint: 'Kam az kam ek parcel wapas kiya' },
  { key: 'blocked', label: 'Blocked', hint: 'Block list me' },
];

/** Har segment ka pehle se likha paigham — {naam} {dukaan} {link} badal jate hain */
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

export default function OnlineCustomersPage() {
  const qc = useQueryClient();
  const shop = useAuthStore((s) => s.tenant?.name) ?? 'Hamari dukaan';
  const [segment, setSegment] = useState('all');
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(0);
  const [templates, setTemplates] = useState<Record<string, string>>(() => ({ ...TEMPLATES, ...readLs(LS, {}) }));
  const [link, setLink] = useState<string>(() => readLs(LS_LINK, ''));
  const limit = 50;

  useEffect(() => { const t = setTimeout(() => { setDebounced(q.trim()); setPage(0); }, 300); return () => clearTimeout(t); }, [q]);
  useEffect(() => { try { localStorage.setItem(LS, JSON.stringify(templates)); localStorage.setItem(LS_LINK, JSON.stringify(link)); } catch { /* private mode */ } }, [templates, link]);

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['online-customers', segment, debounced, page],
    queryFn: () => onlineOrdersApi.customers({ segment, search: debounced || undefined, limit, offset: page * limit }),
    placeholderData: (prev) => prev,
  });
  const rows = data?.rows ?? [];
  const pages = Math.ceil((data?.total ?? 0) / limit);
  const seg = SEGMENTS.find((s) => s.key === segment)!;
  const tpl = templates[segment] ?? '';

  const msgFor = (c: OnlineCustomer) =>
    tpl.replace(/\{naam\}/g, c.name.split(' ')[0] || c.name).replace(/\{dukaan\}/g, shop).replace(/\{link\}/g, link || '').trim();

  const block = useMutation({
    mutationFn: (c: OnlineCustomer) => (c.blocked ? onlineOrdersApi.unblock(c.phone) : onlineOrdersApi.block({ phone: c.phone, name: c.name, reason: 'Customers safhe se' })),
    onSuccess: (_r, c) => { toast.success(c.blocked ? 'Unblock ho gaya' : 'Block ho gaya'); qc.invalidateQueries({ queryKey: ['online-customers'] }); qc.invalidateQueries({ queryKey: ['blocklist'] }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const copyNumbers = () => {
    const nums = rows.filter((c) => !c.blocked).map((c) => waNumber(c.phone) ? `+${waNumber(c.phone)}` : c.phone).join('\n');
    navigator.clipboard?.writeText(nums).then(() => toast.success(`${rows.filter((c) => !c.blocked).length} number copy — WhatsApp broadcast list me paste karein`));
  };
  const csv = useMemo(() => () => {
    const esc = (v: unknown) => { const s = String(v ?? ''); const safe = /^[=+\-@]/.test(s) ? `'${s}` : s; return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe; };
    const head = ['Naam', 'Phone', 'Shehar', 'Orders', 'Deliver', 'Wapas', 'Kharch (Rs)', 'Aakhri order (din pehle)'];
    const body = rows.map((c) => [c.name, c.phone, c.city, c.orders, c.delivered, c.returned, c.spent, c.daysSince].map(esc).join(','));
    const url = URL.createObjectURL(new Blob(['﻿' + [head.join(','), ...body].join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `customers-${segment}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }, [rows, segment]);

  return (
    <Page back={{ to: '/online-orders/reports', label: 'Online reports' }} title="Online customers"
      subtitle="Kaun baar baar leta hai, kaun gayab ho gaya — aur har ek ko WhatsApp par tayyar paigham.">
      {data && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Customers" value={data.totals.customers} hint="pichhle 2 saal" />
          <Stat label="Kul kharch" value={rs(data.totals.spent)} hint="deliver hue orders" />
          <Stat label="Dobara lene wale" value={`${data.totals.repeatRate}%`} hint={`${data.counts.repeat ?? 0} customers`} />
          <Stat label="30 din se gayab" value={data.counts.inactive30 ?? 0} hint="wapas laane ka mauqa" tone={(data.counts.inactive30 ?? 0) > 0 ? 'attention' : undefined} />
        </div>
      )}

      <div className="flex gap-1 overflow-x-auto pb-1">
        {SEGMENTS.map((s) => (
          <button key={s.key} onClick={() => { setSegment(s.key); setPage(0); }} title={s.hint}
            className={cn('shrink-0 rounded-md px-3 py-1.5 text-[13px] font-medium',
              segment === s.key ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800')}>
            {s.label}{data ? <span className="ml-1 opacity-60">{data.counts[s.key] ?? 0}</span> : null}
          </button>
        ))}
      </div>

      {segment !== 'blocked' && (
        <Card title="WhatsApp paigham" description={`${seg.hint}. {naam}, {dukaan} aur {link} khud badal jate hain.`}>
          <textarea value={tpl} onChange={(e) => setTemplates({ ...templates, [segment]: e.target.value })} rows={2} maxLength={600}
            className={cn(inputCls, 'h-auto py-2')} />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="{link} — order form ya website ka link" className={cn(inputCls, 'max-w-sm')} />
            <Btn size="sm" variant="plain" onClick={() => setTemplates({ ...templates, [segment]: TEMPLATES[segment] })}>Pehla wala</Btn>
          </div>
        </Card>
      )}

      <Card flush>
        <div className="flex flex-wrap items-center gap-2 px-4 pt-4 sm:px-5">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Naam, phone ya shehar…" className={cn(inputCls, 'pl-8')} />
          </div>
          <Btn size="sm" disabled={!rows.length} onClick={copyNumbers} icon={<Copy className="h-3.5 w-3.5" />}>Numbers copy</Btn>
          <Btn size="sm" disabled={!rows.length} onClick={csv} icon={<Download className="h-3.5 w-3.5" />}>CSV</Btn>
        </div>
        <div className={cn('mt-3 border-t border-slate-100 dark:border-slate-800', isFetching && 'opacity-70')}>
          {isLoading ? (
            <div className="p-5"><div className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" /></div>
          ) : error ? (
            <EmptyState title="Customers nahi khule">{apiErrorMessage(error)}</EmptyState>
          ) : rows.length === 0 ? (
            <EmptyState icon={<Users className="h-5 w-5" />} title="Is list me koi customer nahi">{debounced ? 'Is talaash se kuch nahi mila.' : seg.hint}</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-[13px]">
                <thead className="bg-slate-50 text-left text-[11.5px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/40">
                  <tr>
                    <th className="px-4 py-2 sm:px-5">Customer</th>
                    <th className="px-3 py-2 text-right">Orders</th>
                    <th className="px-3 py-2 text-right">Kharch</th>
                    <th className="px-3 py-2 text-right">Aakhri order</th>
                    <th className="px-4 py-2 text-right sm:px-5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rows.map((c) => {
                    const wa = waNumber(c.phone);
                    const text = msgFor(c);
                    return (
                      <tr key={c.key} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-2.5 sm:px-5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Link to={`/online-orders?search=${encodeURIComponent(c.phone)}`} className="font-semibold text-slate-900 hover:underline dark:text-white">{c.name}</Link>
                            {c.segments.includes('vip') && <Badge tone="success">★ VIP</Badge>}
                            {c.blocked && <Badge tone="critical">Blocked</Badge>}
                            {c.returned > 0 && !c.blocked && <Badge tone="warning">{c.returned} wapas</Badge>}
                          </div>
                          <div className="text-[11.5px] text-slate-500">{c.phone}{c.city ? ` · ${c.city}` : ''}{c.channels.length ? ` · ${c.channels.join(', ')}` : ''}</div>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{c.delivered}<span className="text-slate-400"> / {c.orders}</span></td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          <div className="font-semibold text-slate-900 dark:text-white">{rs(c.spent)}</div>
                          {c.avgOrder > 0 && <div className="text-[11px] text-slate-400">ausat {rs(c.avgOrder)}</div>}
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-600 dark:text-slate-300">{c.daysSince === 0 ? 'aaj' : `${c.daysSince} din pehle`}</td>
                        <td className="px-4 py-2.5 sm:px-5">
                          <div className="flex justify-end gap-1">
                            {wa && !c.blocked && (
                              <a href={`https://wa.me/${wa}${text ? `?text=${encodeURIComponent(text)}` : ''}`} target="_blank" rel="noreferrer">
                                <Btn size="sm" variant="success" icon={<MessageCircle className="h-3.5 w-3.5" />}>WhatsApp</Btn>
                              </a>
                            )}
                            <a href={`tel:${c.phone}`}><Btn size="sm" variant="plain" icon={<Phone className="h-3.5 w-3.5" />} /></a>
                            <Btn size="sm" variant="plain" className={c.blocked ? '' : 'text-rose-600'} loading={block.isPending && block.variables?.key === c.key}
                              onClick={() => { if (c.blocked || confirm(`${c.name} (${c.phone}) block karein?`)) block.mutate(c); }} icon={<ShieldBan className="h-3.5 w-3.5" />}>
                              {c.blocked ? 'Unblock' : ''}
                            </Btn>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-[12.5px] text-slate-500 dark:border-slate-800 sm:px-5">
            <span>{data?.total} customers</span>
            <div className="flex gap-1">
              <Btn size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Pichhe</Btn>
              <Btn size="sm" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Aage</Btn>
            </div>
          </div>
        )}
      </Card>
    </Page>
  );
}
