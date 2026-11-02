import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Download, FileSpreadsheet, Save } from 'lucide-react';
import { apiErrorMessage } from '@integrations/online-orders/api/online-orders.api';
import { cn } from '@core/lib/cn';
import { tallyApi, type PayMethod, type TallySettings } from './accounting.api';
import { Badge, Button, Card, Input, Switch } from '@/design-system/components';
import { t, Trans } from '@core/i18n';

/* ═════════════════════════════════════════════════════════════
   TALLY — TallyPrime ka cloud API nahi hota, is liye file: har din ke
   Sales / Receipt / Payment vouchers. Accountant: Gateway of Tally →
   Import → Transactions. Dobara import karein to duplicate nahi banta.
   ═════════════════════════════════════════════════════════════ */

const pkDay = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(d);
const METHODS: Array<[PayMethod, string]> = [['CASH', t('Cash')], ['CARD', t('Card')], ['BANK_TRANSFER', t('Bank transfer')], ['JAZZCASH', 'JazzCash'], ['EASYPAISA', t('Easypaisa')]];
const LEDGERS: Array<[keyof TallySettings['mapping'], string]> = [
  ['sales', t('Sale')], ['discounts', t('Discount')], ['returns', t('Sales returns')], ['receivable', t('Udhaar (Sundry Debtors)')],
  ['expenseDefault', t('Expense (aam)')], ['cogs', t('Cost of goods')], ['inventory', t('Stock')],
];

export function TallyCard() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['tally'], queryFn: tallyApi.settings });
  const [s, setS] = useState<TallySettings | null>(null);
  useEffect(() => { if (data) setS(data); }, [data]);

  const yesterday = pkDay(new Date(Date.now() - 86_400_000));
  const [from, setFrom] = useState(pkDay(new Date(Date.now() - 7 * 86_400_000)));
  const [to, setTo] = useState(yesterday);

  const preview = useQuery({ queryKey: ['tally-preview', from, to, data], queryFn: () => tallyApi.preview(from, to), enabled: !!data && from <= to, retry: false });
  const save = useMutation({
    mutationFn: () => tallyApi.save(s!),
    onSuccess: (r) => { qc.setQueryData(['tally'], r); toast.success(t('Tally ledger naam mehfooz')); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const dl = useMutation({
    mutationFn: (f: 'vouchers' | 'masters' | 'csv') => tallyApi.download(from, to, f),
    onSuccess: () => toast.success(t('File download ho gayi')),
    onError: (e) => toast.error(apiErrorMessage(e, t('File nahi bani'))),
  });

  if (!s) return null;
  const dirty = JSON.stringify(s) !== JSON.stringify(data);
  const setMap = (k: string, v: string) => setS({ ...s, mapping: { ...s.mapping, [k]: v } });
  const setMethod = (k: PayMethod, v: string) => setS({ ...s, mapping: { ...s.mapping, methods: { ...s.mapping.methods, [k]: v } } });
  const p = preview.data;

  return (
    <Card title={<span className="flex items-center gap-2"><FileSpreadsheet className="h-4 w-4 text-slate-400" /> TallyPrime / Tally ERP 9 <Badge size="xs" variant="info">{t('File se')}</Badge></span>}
      description={t('Accountant Tally chalata hai? Kisi bhi dino ka hisaab ek file me — Sales, Receipt aur Payment vouchers, ledger naam aap ke Tally jaise.')}>
      <div className="space-y-4">
        <ol className="grid gap-2 rounded-lg bg-slate-50 p-3 text-[0.8125rem] text-slate-700 dark:bg-ink-800/40 dark:text-ink-200 sm:grid-cols-3">
          <li><b>1.</b> {t('Neeche ledger naam wahi likhein jo Tally me hain (ek dafa)')}</li>
          <li><b>2.</b> <Trans text="Pehli dafa {{file}} → Tally: Import → {{menu}}" values={{ file: <b>{t('Ledgers file')}</b>, menu: <b>Masters</b> }} /></li>
          <li><b>3.</b> <Trans text="{{file}} → Tally: Import → {{menu}}. Dobara import = duplicate nahi" values={{ file: <b>{t('Vouchers file')}</b>, menu: <b>Transactions</b> }} /></li>
        </ol>

        <div className="flex flex-wrap items-end gap-2">
          <Input size="sm" label={t('Se')} type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="w-auto" />
          <Input size="sm" label={t('Tak')} type="date" value={to} max={pkDay(new Date())} onChange={(e) => setTo(e.target.value)} className="w-auto" />
          <Button size="sm" variant="primary" disabled={!p?.vouchers || dirty} loading={dl.isPending && dl.variables === 'vouchers'} leftIcon={<Download className="h-4 w-4" />} onClick={() => dl.mutate('vouchers')}>{t('Vouchers (XML)')}</Button>
          <Button size="sm" disabled={!p?.vouchers || dirty} loading={dl.isPending && dl.variables === 'masters'} onClick={() => dl.mutate('masters')}>{t('Ledgers (XML)')}</Button>
          <Button size="sm" variant="ghost" disabled={!p?.vouchers || dirty} loading={dl.isPending && dl.variables === 'csv'} onClick={() => dl.mutate('csv')}>{t('Day book (Excel)')}</Button>
        </div>
        {dirty && <p className="text-[0.78125rem] text-amber-700">{t('Pehle neeche "Mehfooz karein" — file naye naamon se banegi.')}</p>}
        {preview.isError && <p className="text-[0.78125rem] text-rose-600">{apiErrorMessage(preview.error)}</p>}
        {p && (
          <p className="text-[0.8125rem] text-slate-600 dark:text-ink-300">
            <Trans text="{{days}} din · {{vouchers}} voucher · sale Rs {{sales}} · refund Rs {{refunds}} · udhaar return Rs {{collections}} · expenses Rs {{expenses}} · {{count}} ledger" values={{ days: p.days, vouchers: <b>{p.vouchers}</b>, sales: p.totals.sales.toLocaleString(), refunds: p.totals.refunds.toLocaleString(), collections: p.totals.collections.toLocaleString(), expenses: p.totals.expenses.toLocaleString(), count: p.ledgers.length }} />
          </p>
        )}

        <details className="rounded-lg border border-slate-200 p-3 dark:border-ink-800" open={dirty}>
          <summary className="cursor-pointer text-[0.8125rem] font-semibold text-slate-900 dark:text-ink-white">{t('Ledger naam (Tally jaise)')}</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {METHODS.map(([k, l]) => (
              <Input size="sm" key={k} label={t('{{l}} ka ledger', { l })} value={s.mapping.methods?.[k] ?? ''} onChange={(e) => setMethod(k, e.target.value)} />
            ))}
            {LEDGERS.map(([k, l]) => (
              <Input size="sm" key={k} label={l} value={(s.mapping[k] as string) ?? ''} onChange={(e) => setMap(k, e.target.value)} />
            ))}
            <Input size="sm" label={t('Company naam (Tally me)')} hint={t('Khali = jo company Tally me khuli hai')} value={s.companyName} onChange={(e) => setS({ ...s, companyName: e.target.value })} />
          </div>
          <div className="mt-3 space-y-1">
            <Switch size="sm" checked={s.includeExpenses} onChange={(e) => setS({ ...s, includeExpenses: e.target.checked })} label={t('Expenses bhi')} description={t('Har category ka apna ledger (category ka naam)')} className="py-3 first:pt-0 last:pb-0" />
            <Switch size="sm" checked={s.includeCogs} onChange={(e) => setS({ ...s, includeCogs: e.target.checked })} label={t('Cost of goods (Journal)')} description={t('Tally me stock alag chalta ho to band rakhein')} className="py-3 first:pt-0 last:pb-0" />
          </div>
          <div className="mt-3 flex justify-end">
            <Button size="sm" variant="primary" disabled={!dirty} loading={save.isPending} leftIcon={<Save className="h-4 w-4" />} onClick={() => save.mutate()}>{t('Mehfooz karein')}</Button>
          </div>
        </details>
      </div>
    </Card>
  );
}
