import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BookOpen, CheckCircle2, Eye, RefreshCw, Send, Unplug, XCircle, Zap } from 'lucide-react';
import { expenseCategoriesApi } from '@modules/finance/expenses/api/expenses.api';
import { apiErrorMessage } from '@integrations/online-orders/api/online-orders.api';
import { Badge, Banner, Btn, Card, EmptyState, Page, SettingRow, Toggle, inputCls } from '@integrations/online-orders/components/ui/kit';
import { accountingApi, type AccountMapping, type AcctAccount, type PayMethod } from './accounting.api';
import { cn } from '@core/lib/cn';
import { TallyCard } from './TallyCard';

/* ═════════════════════════════════════════════════════════════
   ACCOUNTING — Zoho Books / QuickBooks / Xero. Har din ka ek summary
   journal (sale, discount, udhaar, refund, kharche) aap ke apne
   accounts me. Accountant ko har bill nahi, saaf hisaab milta hai.
   ═════════════════════════════════════════════════════════════ */

const KEY = ['accounting'];
const METHODS: { key: PayMethod; label: string; hint: string }[] = [
  { key: 'CASH', label: 'Cash', hint: 'Cash in hand / galla' },
  { key: 'CARD', label: 'Card', hint: 'Card machine wala bank' },
  { key: 'BANK_TRANSFER', label: 'Bank transfer', hint: 'Bank account' },
  { key: 'JAZZCASH', label: 'JazzCash', hint: 'JazzCash wallet / bank' },
  { key: 'EASYPAISA', label: 'Easypaisa', hint: 'Easypaisa wallet / bank' },
];
const yesterday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date(Date.now() - 86_400_000));
const rs = (n: number) => `Rs ${Math.round(n).toLocaleString('en-PK')}`;

export default function AccountingPage() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const { data, isLoading, error } = useQuery({ queryKey: KEY, queryFn: accountingApi.status });

  useEffect(() => {
    if (params.get('connected')) { toast.success('Accounting software jur gaya ✓ — ab accounts chunein'); setParams({}, { replace: true }); }
    const err = params.get('error');
    if (err) { toast.error(err); setParams({}, { replace: true }); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const start = useMutation({
    mutationFn: (p: string) => accountingApi.start(p),
    onSuccess: (r) => { window.location.href = r.authUrl; },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <Page title="Accounting" subtitle="Har din ka hisaab khud aap ke accounting software me — sale, udhaar, refund, kharche.">
      {isLoading ? <div className="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
        : error || !data ? <Card><EmptyState title="Accounting nahi khula">{apiErrorMessage(error)}</EmptyState></Card>
        : !data.connected ? (
          <>
            <Card title="Kaise kaam karta hai">
              <ol className="grid gap-2 text-[13px] text-slate-700 dark:text-slate-200 sm:grid-cols-3">
                <li><b>1.</b> Apna software jorein (login → Allow)</li>
                <li><b>2.</b> Batayein kaun sa Nafaa hisaab kis account me jaye (ek dafa)</li>
                <li><b>3.</b> Har raat kal ka ek journal khud — ya haath se kisi bhi din ka</li>
              </ol>
            </Card>
            <div className="grid gap-4 md:grid-cols-3">
              {data.providers.map((p) => (
                <Card key={p.code} title={<span className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-slate-400" /> {p.name}</span>}>
                  {!p.configured && <p className="mb-3 text-[12.5px] text-amber-700">Server par {p.name} app ki keys abhi nahi lagi (Nafaa admin).</p>}
                  <Btn variant="primary" disabled={!p.configured} loading={start.isPending && start.variables === p.code} onClick={() => start.mutate(p.code)} icon={<Zap className="h-4 w-4" />}>
                    {p.name} jorein
                  </Btn>
                </Card>
              ))}
            </div>
          </>
        ) : <Connected data={data.connected} onChange={() => qc.invalidateQueries({ queryKey: KEY })} />}
      <TallyCard />
    </Page>
  );
}

function Connected({ data: c, onChange }: { data: NonNullable<Awaited<ReturnType<typeof accountingApi.status>>['connected']>; onChange: () => void }) {
  const { data: accounts, isLoading: accLoading, error: accErr, refetch } = useQuery({ queryKey: ['accounting-accounts'], queryFn: accountingApi.accounts, staleTime: 10 * 60_000 });
  const { data: cats } = useQuery({ queryKey: ['expense-categories'], queryFn: expenseCategoriesApi.list, staleTime: 10 * 60_000 });
  const [map, setMap] = useState<AccountMapping>(c.mapping ?? {});
  const [day, setDay] = useState(yesterday());
  const dirty = JSON.stringify(map) !== JSON.stringify(c.mapping ?? {});

  const save = useMutation({
    mutationFn: (body: Parameters<typeof accountingApi.settings>[0]) => accountingApi.settings(body),
    onSuccess: () => { toast.success('Save ho gaya'); onChange(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const disconnect = useMutation({ mutationFn: accountingApi.disconnect, onSuccess: () => { toast.success(`${c.name} hata diya`); onChange(); }, onError: (e) => toast.error(apiErrorMessage(e)) });
  const preview = useQuery({ queryKey: ['accounting-preview', day, c.mapping], queryFn: () => accountingApi.preview(day), enabled: false });
  const sync = useMutation({
    mutationFn: (force: boolean) => accountingApi.sync(day, force),
    onSuccess: (r) => {
      onChange();
      if (r.status === 'SUCCESS') toast.success(`${day} ka journal ${c.name} me bhej diya ✓`);
      else if (r.status === 'SKIPPED') toast(r.error ?? 'Ye din pehle se bheja ja chuka');
      else toast.error(r.error ?? 'Nahi gaya');
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const byType = useMemo(() => {
    const list = accounts ?? [];
    return (types: RegExp) => [...list.filter((a) => types.test(a.type)), ...list.filter((a) => !types.test(a.type))];
  }, [accounts]);
  const nameOf = (id?: string | null) => (accounts ?? []).find((a) => a.id === id)?.name ?? id ?? '—';
  const set = (patch: Partial<AccountMapping>) => setMap((m) => ({ ...m, ...patch }));

  return (
    <>
      <Card title={<span className="flex items-center gap-2">{c.name} <Badge tone="success" dot>Jura hua</Badge></span>}
        description={`${c.companyName ?? ''}${c.currency ? ` · ${c.currency}` : ''}`}
        actions={<Btn size="sm" variant="plain" className="text-rose-600" loading={disconnect.isPending} icon={<Unplug className="h-3.5 w-3.5" />}
          onClick={() => { if (confirm(`${c.name} hatayein? Bheje hue journals wahin rahenge.`)) disconnect.mutate(); }}>Hatayein</Btn>}>
        {c.lastError && <Banner tone="critical" title="Aakhri sync me masla">{c.lastError}</Banner>}
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          <SettingRow title="Har raat khud bhejo" help="Raat ~12:40 baje kal ka journal; fail hue din 7 din tak dobara"
            control={<Toggle checked={c.autoSync} onChange={(v) => save.mutate({ autoSync: v })} />} />
          <SettingRow title="Kharche bhi bhejo" help="Nafaa ke kharche (category ke hisaab se)"
            control={<Toggle checked={c.includeExpenses} onChange={(v) => save.mutate({ includeExpenses: v })} />} />
          <SettingRow title="Cost of goods (COGS) bhi" help="Bika hua maal ki cost: Dr COGS / Cr Inventory — agar accountant chahe"
            control={<Toggle checked={c.includeCogs} onChange={(v) => save.mutate({ includeCogs: v })} />} />
        </div>
      </Card>

      <Card title="Kaun sa hisaab kis account me" description="Ek dafa chunein. Udhaar ke liye system ka 'Accounts Receivable' nahi — ek alag current asset account (jaise 'POS Udhaar') behtar hai."
        actions={<Btn size="sm" variant="plain" onClick={() => refetch()} icon={<RefreshCw className="h-3.5 w-3.5" />}>Accounts taaza</Btn>}>
        {c.provider === 'XERO' && (
          <div className="mb-3"><Banner tone="info" title="Xero ka qaida">Xero manual journal me Bank aur system accounts nahi leta — is liye list me nahi dikhte. Har payment tareeqe (Cash, Card, JazzCash…) ke liye Xero me ek "Current" type ka clearing account banayein (jaise "POS Cash clearing"), phir yahan chunein.</Banner></div>
        )}
        {accLoading ? <div className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          : accErr ? <p className="text-[13px] text-rose-600">{apiErrorMessage(accErr)}</p>
          : (
            <div className="space-y-5">
              <Group title="Sale">
                <Pick label="Sale (income)" value={map.sales} onChange={(v) => set({ sales: v })} options={byType(/income|revenue|sales/i)} />
                <Pick label="Discount" value={map.discounts} onChange={(v) => set({ discounts: v })} options={byType(/expense|discount|income/i)} />
                <Pick label="Sales returns / refund" value={map.returns} onChange={(v) => set({ returns: v })} options={byType(/income|revenue|expense/i)} />
                <Pick label="Udhaar (customers)" value={map.receivable} onChange={(v) => set({ receivable: v })} options={byType(/current_asset|other_current|receivable|asset/i)} />
              </Group>
              <Group title="Paisa kahan aaya (payment tareeqa)">
                {METHODS.map((m) => (
                  <Pick key={m.key} label={m.label} hint={m.hint} value={map.methods?.[m.key]} onChange={(v) => set({ methods: { ...(map.methods ?? {}), [m.key]: v } })} options={byType(/cash|bank|asset/i)} />
                ))}
                <label className="block">
                  <span className="mb-1 block text-[12px] font-semibold text-slate-600 dark:text-slate-300">Udhaar wapsi kis tareeqe se aati hai</span>
                  <select value={map.collectionMethod ?? 'CASH'} onChange={(e) => set({ collectionMethod: e.target.value as PayMethod })} className={inputCls}>
                    {METHODS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
                  </select>
                </label>
              </Group>
              {c.includeExpenses && (
                <Group title="Kharche">
                  <Pick label="Aam kharcha (jis category ka alag na chuna ho)" value={map.expenseDefault} onChange={(v) => set({ expenseDefault: v })} options={byType(/expense/i)} />
                  {(cats ?? []).map((cat) => (
                    <Pick key={cat.id} label={cat.name} value={map.expenseByCategory?.[cat.id]} onChange={(v) => set({ expenseByCategory: { ...(map.expenseByCategory ?? {}), [cat.id]: v } })} options={byType(/expense/i)} placeholder="Aam kharcha wala" />
                  ))}
                </Group>
              )}
              {c.includeCogs && (
                <Group title="Cost of goods">
                  <Pick label="Cost of goods sold" value={map.cogs} onChange={(v) => set({ cogs: v })} options={byType(/cost_of_goods|cogs|expense/i)} />
                  <Pick label="Inventory / stock" value={map.inventory} onChange={(v) => set({ inventory: v })} options={byType(/stock|inventory|asset/i)} />
                </Group>
              )}
              <div className="flex justify-end">
                <Btn variant="primary" disabled={!dirty} loading={save.isPending} onClick={() => save.mutate({ mapping: map })}>Mapping save karein</Btn>
              </div>
            </div>
          )}
      </Card>

      <Card title="Bhejein" description="Kisi bhi din ka journal pehle dekhein, phir bhejein. Ek din ek hi dafa jata hai.">
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={day} max={yesterday()} onChange={(e) => setDay(e.target.value)} className={cn(inputCls, 'w-auto')} />
          <Btn loading={preview.isFetching} onClick={() => preview.refetch()} icon={<Eye className="h-4 w-4" />}>Dekhein</Btn>
          <Btn variant="primary" loading={sync.isPending} disabled={dirty} onClick={() => sync.mutate(false)} icon={<Send className="h-4 w-4" />}>{c.name} me bhejein</Btn>
          {dirty && <span className="text-[12px] text-amber-700">Pehle mapping save karein</span>}
        </div>
        {preview.error && <p className="mt-3 text-[13px] text-rose-600">{apiErrorMessage(preview.error)}</p>}
        {preview.data && (
          <div className="mt-4">
            {preview.data.missing.length > 0 && <Banner tone="warning" title="Ye accounts abhi nahi chune">{preview.data.missing.join(', ')}</Banner>}
            <div className="mt-2 grid grid-cols-2 gap-2 text-[12.5px] text-slate-600 dark:text-slate-300 sm:grid-cols-4">
              <span>{preview.data.totals.bills} bill · {rs(preview.data.totals.sales)}</span>
              <span>Udhaar {rs(preview.data.totals.credit)}</span>
              <span>Refund {rs(preview.data.totals.refunds)}</span>
              <span>Kharche {rs(preview.data.totals.expenses)}</span>
            </div>
            {preview.data.lines.length === 0 ? <p className="mt-3 text-[13px] text-slate-500">Is din koi entry nahi.</p> : (
              <table className="mt-3 w-full text-[13px]">
                <thead className="text-left text-[11.5px] uppercase tracking-wide text-slate-500"><tr><th className="py-1">Account</th><th className="py-1 text-right">Debit</th><th className="py-1 text-right">Credit</th></tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {preview.data.lines.map((l, i) => (
                    <tr key={i}>
                      <td className="py-1.5"><div className="font-medium text-slate-900 dark:text-white">{nameOf(l.accountId)}</div><div className="text-[11.5px] text-slate-400">{l.description}</div></td>
                      <td className="py-1.5 text-right tabular-nums">{l.side === 'debit' ? rs(l.amount) : ''}</td>
                      <td className="py-1.5 text-right tabular-nums">{l.side === 'credit' ? rs(l.amount) : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </Card>

      <Card title="Pichhle din" flush>
        {c.history.length === 0 ? <EmptyState title="Abhi kuch nahi bheja" /> : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {c.history.map((h) => (
              <li key={h.day} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-[13px] sm:px-5">
                {h.status === 'SUCCESS' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : h.status === 'FAILED' ? <XCircle className="h-4 w-4 text-rose-600" /> : <span className="h-4 w-4 rounded-full border border-slate-300" />}
                <span className="w-24 font-semibold text-slate-900 dark:text-white">{h.day}</span>
                <span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300">
                  {h.status === 'SUCCESS' ? `Bheja${h.totals ? ` · ${h.totals.bills} bill, ${rs(h.totals.sales)}` : ''}${h.journalId ? ` · #${h.journalId}` : ''}` : h.error}
                </span>
                {h.status !== 'SUCCESS' && <Btn size="sm" variant="plain" onClick={() => { setDay(h.day); setTimeout(() => sync.mutate(false), 0); }}>Dobara</Btn>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[12px] font-bold uppercase tracking-wide text-slate-500">{title}</div>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function Pick({ label, hint, value, onChange, options, placeholder }: { label: string; hint?: string; value?: string | null; onChange: (v: string | null) => void; options: AcctAccount[]; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-semibold text-slate-600 dark:text-slate-300">{label}{hint ? <span className="font-normal text-slate-400"> · {hint}</span> : null}</span>
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} className={cn(inputCls, !value && 'text-slate-400')}>
        <option value="">{placeholder ?? '— chunein —'}</option>
        {options.map((a) => <option key={a.id} value={a.id}>{a.code ? `${a.code} · ` : ''}{a.name} ({a.type})</option>)}
      </select>
    </label>
  );
}
