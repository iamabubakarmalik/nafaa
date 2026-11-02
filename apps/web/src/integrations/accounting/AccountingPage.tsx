import { Alert, Badge, Button, Card, confirmDialog, controlClass, EmptyState, PageHero, PageShell, Switch, Table, TBody, Td, Th, THead, Tr } from '@/design-system/components';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BookOpen, CheckCircle2, Eye, RefreshCw, Send, Unplug, XCircle, Zap } from 'lucide-react';
import { expenseCategoriesApi } from '@modules/finance/expenses/api/expenses.api';
import { apiErrorMessage } from '@integrations/online-orders/api/online-orders.api';
import { accountingApi, type AccountMapping, type AcctAccount, type PayMethod } from './accounting.api';
import { cn } from '@core/lib/cn';
import { TallyCard } from './TallyCard';
import { t } from '@core/i18n';

/* ═════════════════════════════════════════════════════════════
   ACCOUNTING — Zoho Books / QuickBooks / Xero. Har din ka ek summary
   journal (sale, discount, udhaar, refund, kharche) aap ke apne
   accounts me. Accountant ko har bill nahi, saaf hisaab milta hai.
   ═════════════════════════════════════════════════════════════ */

const KEY = ['accounting'];
const METHODS: { key: PayMethod; label: string; hint: string }[] = [
  { key: 'CASH', label: t('Cash'), hint: t('Cash in hand / galla') },
  { key: 'CARD', label: t('Card'), hint: t('Card machine wala bank') },
  { key: 'BANK_TRANSFER', label: t('Bank transfer'), hint: t('Bank account') },
  { key: 'JAZZCASH', label: 'JazzCash', hint: t('JazzCash wallet / bank') },
  { key: 'EASYPAISA', label: 'Easypaisa', hint: t('Easypaisa wallet / bank') },
];
const yesterday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date(Date.now() - 86_400_000));
const rs = (n: number) => `Rs ${Math.round(n).toLocaleString('en-PK')}`;

export default function AccountingPage() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const { data, isLoading, error } = useQuery({ queryKey: KEY, queryFn: accountingApi.status });

  useEffect(() => {
    if (params.get('connected')) { toast.success(t('Accounting software jur gaya ✓ — ab accounts chunein')); setParams({}, { replace: true }); }
    const err = params.get('error');
    if (err) { toast.error(err); setParams({}, { replace: true }); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const start = useMutation({
    mutationFn: (p: string) => accountingApi.start(p),
    onSuccess: (r) => { window.location.href = r.authUrl; },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <PageShell>
      <PageHero title={t('Accounting')} subtitle={t('Har din ka hisaab khud aap ke accounting software me — sale, udhaar, refund, expenses.')} />
      {isLoading ? <div className="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-ink-800" />
        : error || !data ? <Card><EmptyState title={t('Accounting nahi khula')} description={apiErrorMessage(error)} /></Card>
        : !data.connected ? (
          <>
            <Card title={t('Kaise kaam karta hai')}>
              <ol className="grid gap-2 text-[0.8125rem] text-slate-700 dark:text-ink-200 sm:grid-cols-3">
                <li><b>1.</b> {' '}{t('Apna software jorein (login → Allow)')}</li>
                <li><b>2.</b> {' '}{t('Batayein kaun sa Nafaa hisaab kis account me jaye (ek dafa)')}</li>
                <li><b>3.</b> {' '}{t('Har raat kal ka ek journal khud — ya haath se kisi bhi din ka')}</li>
              </ol>
            </Card>
            <div className="grid gap-4 md:grid-cols-3">
              {data.providers.map((p) => (
                <Card key={p.code} title={<span className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-slate-400" /> {p.name}</span>}>
                  {!p.configured && <p className="mb-3 text-[0.78125rem] text-amber-700">{t('Server par {{name}} app ki keys abhi nahi lagi (Nafaa admin).', { name: p.name })}</p>}
                  <Button size="sm" variant="primary" disabled={!p.configured} loading={start.isPending && start.variables === p.code} onClick={() => start.mutate(p.code)} leftIcon={<Zap className="h-4 w-4" />}>
                    {t('{{name}} jorein', { name: p.name })}
                  </Button>
                </Card>
              ))}
            </div>
          </>
        ) : <Connected data={data.connected} onChange={() => qc.invalidateQueries({ queryKey: KEY })} />}
      <TallyCard />
    </PageShell>
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
    onSuccess: () => { toast.success(t('Save ho gaya')); onChange(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const disconnect = useMutation({ mutationFn: accountingApi.disconnect, onSuccess: () => { toast.success(t('{{name}} hata diya', { name: c.name })); onChange(); }, onError: (e) => toast.error(apiErrorMessage(e)) });
  const preview = useQuery({ queryKey: ['accounting-preview', day, c.mapping], queryFn: () => accountingApi.preview(day), enabled: false });
  const sync = useMutation({
    mutationFn: (force: boolean) => accountingApi.sync(day, force),
    onSuccess: (r) => {
      onChange();
      if (r.status === 'SUCCESS') toast.success(t('{{day}} ka journal {{name}} me bhej diya ✓', { day, name: c.name }));
      else if (r.status === 'SKIPPED') toast(r.error ?? t('Ye din pehle se bheja ja chuka'));
      else toast.error(r.error ?? t('Nahi gaya'));
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
      <Card title={<span className="flex items-center gap-2">{c.name} <Badge size="xs" variant="success" dot>{t('Jura hua')}</Badge></span>}
        description={`${c.companyName ?? ''}${c.currency ? ` · ${c.currency}` : ''}`}
        actions={<Button size="xs" variant="critical" loading={disconnect.isPending} leftIcon={<Unplug className="h-3.5 w-3.5" />}
          onClick={async () => { if ((await confirmDialog({ title: t('{{name}} hatayein?', { name: c.name }), text: t('Bheje hue journals wahin rahenge.'), danger: true }))) disconnect.mutate(); }}>{t('Hatayein')}</Button>}>
        {c.lastError && <Alert tone="danger" title={t('Aakhri sync me masla')}>{c.lastError}</Alert>}
        <div className="divide-y divide-slate-100 dark:divide-ink-800">
          <Switch size="sm" checked={c.autoSync} onChange={(e) => save.mutate({ autoSync: e.target.checked })} label={t('Har raat khud bhejo')} description={t('Raat ~12:40 baje kal ka journal; fail hue din 7 din tak dobara')} className="py-3 first:pt-0 last:pb-0" />
          <Switch size="sm" checked={c.includeExpenses} onChange={(e) => save.mutate({ includeExpenses: e.target.checked })} label={t('Expenses bhi bhejo')} description={t('Nafaa ke expenses (category ke hisaab se)')} className="py-3 first:pt-0 last:pb-0" />
          <Switch size="sm" checked={c.includeCogs} onChange={(e) => save.mutate({ includeCogs: e.target.checked })} label={t('Cost of goods (COGS) bhi')} description={t('Bika hua maal ki cost: Dr COGS / Cr Inventory — agar accountant chahe')} className="py-3 first:pt-0 last:pb-0" />
        </div>
      </Card>

      <Card title={t('Kaun sa hisaab kis account me')} description={t('Ek dafa chunein. Udhaar ke liye system ka \'Accounts Receivable\' nahi — ek alag current asset account (jaise \'POS Udhaar\') behtar hai.')}
        actions={<Button size="xs" variant="ghost" onClick={() => refetch()} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>{t('Accounts taaza')}</Button>}>
        {c.provider === 'XERO' && (
          <div className="mb-3"><Alert tone="info" title={t('Xero ka qaida')}>{t('Xero manual journal me Bank aur system accounts nahi leta — is liye list me nahi dikhte. Har payment tareeqe (Cash, Card, JazzCash…) ke liye Xero me ek "Current" type ka clearing account banayein (jaise "POS Cash clearing"), phir yahan chunein.')}</Alert></div>
        )}
        {accLoading ? <div className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-ink-800" />
          : accErr ? <p className="text-[0.8125rem] text-rose-600">{apiErrorMessage(accErr)}</p>
          : (
            <div className="space-y-5">
              <Group title={t('Sale')}>
                <Pick label={t('Sale (income)')} value={map.sales} onChange={(v) => set({ sales: v })} options={byType(/income|revenue|sales/i)} />
                <Pick label={t('Discount')} value={map.discounts} onChange={(v) => set({ discounts: v })} options={byType(/expense|discount|income/i)} />
                <Pick label={t('Sales returns / refund')} value={map.returns} onChange={(v) => set({ returns: v })} options={byType(/income|revenue|expense/i)} />
                <Pick label={t('Udhaar (customers)')} value={map.receivable} onChange={(v) => set({ receivable: v })} options={byType(/current_asset|other_current|receivable|asset/i)} />
              </Group>
              <Group title={t('Paisa kahan aaya (payment tareeqa)')}>
                {METHODS.map((m) => (
                  <Pick key={m.key} label={m.label} hint={m.hint} value={map.methods?.[m.key]} onChange={(v) => set({ methods: { ...(map.methods ?? {}), [m.key]: v } })} options={byType(/cash|bank|asset/i)} />
                ))}
                <label className="block">
                  <span className="mb-1 block text-[0.75rem] font-semibold text-slate-600 dark:text-ink-300">{t('Udhaar return kis tareeqe se aati hai')}</span>
                  <select value={map.collectionMethod ?? 'CASH'} onChange={(e) => set({ collectionMethod: e.target.value as PayMethod })} className={cn(controlClass(), 'h-9 px-3 text-[0.8125rem]')}>
                    {METHODS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
                  </select>
                </label>
              </Group>
              {c.includeExpenses && (
                <Group title={t('Expenses')}>
                  <Pick label={t('Aam expense (jis category ka alag na chuna ho)')} value={map.expenseDefault} onChange={(v) => set({ expenseDefault: v })} options={byType(/expense/i)} />
                  {(cats ?? []).map((cat) => (
                    <Pick key={cat.id} label={cat.name} value={map.expenseByCategory?.[cat.id]} onChange={(v) => set({ expenseByCategory: { ...(map.expenseByCategory ?? {}), [cat.id]: v } })} options={byType(/expense/i)} placeholder={t('Aam expense wala')} />
                  ))}
                </Group>
              )}
              {c.includeCogs && (
                <Group title={t('Cost of goods')}>
                  <Pick label={t('Cost of goods sold')} value={map.cogs} onChange={(v) => set({ cogs: v })} options={byType(/cost_of_goods|cogs|expense/i)} />
                  <Pick label={t('Inventory / stock')} value={map.inventory} onChange={(v) => set({ inventory: v })} options={byType(/stock|inventory|asset/i)} />
                </Group>
              )}
              <div className="flex justify-end">
                <Button size="sm" variant="primary" disabled={!dirty} loading={save.isPending} onClick={() => save.mutate({ mapping: map })}>{t('Mapping save karein')}</Button>
              </div>
            </div>
          )}
      </Card>

      <Card title={t('Bhejein')} description={t('Kisi bhi din ka journal pehle dekhein, phir bhejein. Ek din ek hi dafa jata hai.')}>
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={day} max={yesterday()} onChange={(e) => setDay(e.target.value)} className={cn(controlClass(), 'h-9 px-3 text-[0.8125rem] w-auto')} />
          <Button size="sm" loading={preview.isFetching} onClick={() => preview.refetch()} leftIcon={<Eye className="h-4 w-4" />}>{t('Dekhein')}</Button>
          <Button size="sm" variant="primary" loading={sync.isPending} disabled={dirty} onClick={() => sync.mutate(false)} leftIcon={<Send className="h-4 w-4" />}>{t('{{name}} me bhejein', { name: c.name })}</Button>
          {dirty && <span className="text-[0.75rem] text-amber-700">{t('Pehle mapping save karein')}</span>}
        </div>
        {preview.error && <p className="mt-3 text-[0.8125rem] text-rose-600">{apiErrorMessage(preview.error)}</p>}
        {preview.data && (
          <div className="mt-4">
            {preview.data.missing.length > 0 && <Alert tone="warning" title={t('Ye accounts abhi nahi chune')}>{preview.data.missing.join(', ')}</Alert>}
            <div className="mt-2 grid grid-cols-2 gap-2 text-[0.78125rem] text-slate-600 dark:text-ink-300 sm:grid-cols-4">
              <span>{t('{{bills}} bill · {{sales}}', { bills: preview.data.totals.bills, sales: rs(preview.data.totals.sales) })}</span>
              <span>{t('Udhaar {{credit}}', { credit: rs(preview.data.totals.credit) })}</span>
              <span>{t('Refund {{refunds}}', { refunds: rs(preview.data.totals.refunds) })}</span>
              <span>{t('Expenses {{expenses}}', { expenses: rs(preview.data.totals.expenses) })}</span>
            </div>
            {preview.data.lines.length === 0 ? <p className="mt-3 text-[0.8125rem] text-slate-500">{t('Is din koi entry nahi.')}</p> : (
              <Table className="mt-3 [&_table]:text-[0.8125rem]">
                <THead className="text-start text-[0.71875rem] uppercase tracking-wide text-slate-500"><Tr><Th className="py-1">{t('Account')}</Th><Th className="py-1 text-end">{t('Debit')}</Th><Th className="py-1 text-end">{t('Credit')}</Th></Tr></THead>
                <TBody className="divide-y divide-slate-100 dark:divide-ink-800">
                  {preview.data.lines.map((l, i) => (
                    <Tr key={i}>
                      <Td className="py-1.5"><div className="font-medium text-slate-900 dark:text-ink-white">{nameOf(l.accountId)}</div><div className="text-[0.71875rem] text-slate-400">{l.description}</div></Td>
                      <Td className="py-1.5 text-end tabular-nums">{l.side === 'debit' ? rs(l.amount) : ''}</Td>
                      <Td className="py-1.5 text-end tabular-nums">{l.side === 'credit' ? rs(l.amount) : ''}</Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            )}
          </div>
        )}
      </Card>

      <Card title={t('Pichhle din')} flush>
        {c.history.length === 0 ? <EmptyState title={t('Abhi kuch nahi bheja')} /> : (
          <ul className="divide-y divide-slate-100 dark:divide-ink-800">
            {c.history.map((h) => (
              <li key={h.day} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-[0.8125rem] sm:px-5">
                {h.status === 'SUCCESS' ? <CheckCircle2 className="h-4 w-4 text-success-600" /> : h.status === 'FAILED' ? <XCircle className="h-4 w-4 text-rose-600" /> : <span className="h-4 w-4 rounded-full border border-slate-300" />}
                <span className="w-24 font-semibold text-slate-900 dark:text-ink-white">{h.day}</span>
                <span className="min-w-0 flex-1 truncate text-slate-600 dark:text-ink-300">
                  {h.status === 'SUCCESS' ? t('Bheja{{value}}{{value2}}', { value: h.totals ? t(' · {{bills}} bill, {{sales}}', { bills: h.totals.bills, sales: rs(h.totals.sales) }) : '', value2: h.journalId ? ` · #${h.journalId}` : '' }) : h.error}
                </span>
                {h.status !== 'SUCCESS' && <Button size="xs" variant="ghost" onClick={() => { setDay(h.day); setTimeout(() => sync.mutate(false), 0); }}>{t('Dobara')}</Button>}
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
      <div className="mb-2 text-[0.75rem] font-bold uppercase tracking-wide text-slate-500">{title}</div>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function Pick({ label, hint, value, onChange, options, placeholder }: { label: string; hint?: string; value?: string | null; onChange: (v: string | null) => void; options: AcctAccount[]; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[0.75rem] font-semibold text-slate-600 dark:text-ink-300">{label}{hint ? <span className="font-normal text-slate-400"> · {hint}</span> : null}</span>
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} className={cn(controlClass(), 'h-9 px-3 text-[0.8125rem]', !value && 'text-slate-400')}>
        <option value="">{placeholder ?? t('— chunein —')}</option>
        {options.map((a) => <option key={a.id} value={a.id}>{a.code ? `${a.code} · ` : ''}{a.name} ({a.type})</option>)}
      </select>
    </label>
  );
}
