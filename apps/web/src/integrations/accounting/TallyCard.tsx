import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Download, FileSpreadsheet, Save } from 'lucide-react';
import { apiErrorMessage } from '@integrations/online-orders/api/online-orders.api';
import { Badge, Btn, Card, Field, SettingRow, Toggle, inputCls } from '@integrations/online-orders/components/ui/kit';
import { cn } from '@core/lib/cn';
import { tallyApi, type PayMethod, type TallySettings } from './accounting.api';

/* ═════════════════════════════════════════════════════════════
   TALLY — TallyPrime ka cloud API nahi hota, is liye file: har din ke
   Sales / Receipt / Payment vouchers. Accountant: Gateway of Tally →
   Import → Transactions. Dobara import karein to duplicate nahi banta.
   ═════════════════════════════════════════════════════════════ */

const pkDay = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(d);
const METHODS: Array<[PayMethod, string]> = [['CASH', 'Cash'], ['CARD', 'Card'], ['BANK_TRANSFER', 'Bank transfer'], ['JAZZCASH', 'JazzCash'], ['EASYPAISA', 'Easypaisa']];
const LEDGERS: Array<[keyof TallySettings['mapping'], string]> = [
  ['sales', 'Sale'], ['discounts', 'Discount'], ['returns', 'Sales returns'], ['receivable', 'Udhaar (Sundry Debtors)'],
  ['expenseDefault', 'Kharcha (aam)'], ['cogs', 'Cost of goods'], ['inventory', 'Stock'],
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
    onSuccess: (r) => { qc.setQueryData(['tally'], r); toast.success('Tally ledger naam mehfooz'); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const dl = useMutation({
    mutationFn: (f: 'vouchers' | 'masters' | 'csv') => tallyApi.download(from, to, f),
    onSuccess: () => toast.success('File download ho gayi'),
    onError: (e) => toast.error(apiErrorMessage(e, 'File nahi bani')),
  });

  if (!s) return null;
  const dirty = JSON.stringify(s) !== JSON.stringify(data);
  const setMap = (k: string, v: string) => setS({ ...s, mapping: { ...s.mapping, [k]: v } });
  const setMethod = (k: PayMethod, v: string) => setS({ ...s, mapping: { ...s.mapping, methods: { ...s.mapping.methods, [k]: v } } });
  const p = preview.data;

  return (
    <Card title={<span className="flex items-center gap-2"><FileSpreadsheet className="h-4 w-4 text-slate-400" /> TallyPrime / Tally ERP 9 <Badge tone="info">File se</Badge></span>}
      description="Accountant Tally chalata hai? Kisi bhi dino ka hisaab ek file me — Sales, Receipt aur Payment vouchers, ledger naam aap ke Tally jaise.">
      <div className="space-y-4">
        <ol className="grid gap-2 rounded-lg bg-slate-50 p-3 text-[13px] text-slate-700 dark:bg-slate-800/40 dark:text-slate-200 sm:grid-cols-3">
          <li><b>1.</b> Neeche ledger naam wahi likhein jo Tally me hain (ek dafa)</li>
          <li><b>2.</b> Pehli dafa <b>Ledgers file</b> → Tally: Import → <b>Masters</b></li>
          <li><b>3.</b> <b>Vouchers file</b> → Tally: Import → <b>Transactions</b>. Dobara import = duplicate nahi</li>
        </ol>

        <div className="flex flex-wrap items-end gap-2">
          <Field label="Se"><input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className={cn(inputCls, 'w-auto')} /></Field>
          <Field label="Tak"><input type="date" value={to} max={pkDay(new Date())} onChange={(e) => setTo(e.target.value)} className={cn(inputCls, 'w-auto')} /></Field>
          <Btn variant="primary" disabled={!p?.vouchers || dirty} loading={dl.isPending && dl.variables === 'vouchers'} icon={<Download className="h-4 w-4" />} onClick={() => dl.mutate('vouchers')}>Vouchers (XML)</Btn>
          <Btn disabled={!p?.vouchers || dirty} loading={dl.isPending && dl.variables === 'masters'} onClick={() => dl.mutate('masters')}>Ledgers (XML)</Btn>
          <Btn variant="plain" disabled={!p?.vouchers || dirty} loading={dl.isPending && dl.variables === 'csv'} onClick={() => dl.mutate('csv')}>Day book (Excel)</Btn>
        </div>
        {dirty && <p className="text-[12.5px] text-amber-700">Pehle neeche "Mehfooz karein" — file naye naamon se banegi.</p>}
        {preview.isError && <p className="text-[12.5px] text-rose-600">{apiErrorMessage(preview.error)}</p>}
        {p && (
          <p className="text-[13px] text-slate-600 dark:text-slate-300">
            {p.days} din · <b>{p.vouchers}</b> voucher · sale Rs {p.totals.sales.toLocaleString()} · refund Rs {p.totals.refunds.toLocaleString()} ·
            udhaar wapsi Rs {p.totals.collections.toLocaleString()} · kharche Rs {p.totals.expenses.toLocaleString()} · {p.ledgers.length} ledger
          </p>
        )}

        <details className="rounded-lg border border-slate-200 p-3 dark:border-slate-800" open={dirty}>
          <summary className="cursor-pointer text-[13px] font-semibold text-slate-900 dark:text-white">Ledger naam (Tally jaise)</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {METHODS.map(([k, l]) => (
              <Field key={k} label={`${l} ka ledger`}>
                <input value={s.mapping.methods?.[k] ?? ''} onChange={(e) => setMethod(k, e.target.value)} className={inputCls} />
              </Field>
            ))}
            {LEDGERS.map(([k, l]) => (
              <Field key={k} label={l}>
                <input value={(s.mapping[k] as string) ?? ''} onChange={(e) => setMap(k, e.target.value)} className={inputCls} />
              </Field>
            ))}
            <Field label="Company naam (Tally me)" help="Khali = jo company Tally me khuli hai">
              <input value={s.companyName} onChange={(e) => setS({ ...s, companyName: e.target.value })} className={inputCls} />
            </Field>
          </div>
          <div className="mt-3 space-y-1">
            <SettingRow title="Kharche bhi" help="Har category ka apna ledger (category ka naam)" control={<Toggle checked={s.includeExpenses} onChange={(v) => setS({ ...s, includeExpenses: v })} />} />
            <SettingRow title="Cost of goods (Journal)" help="Tally me stock alag chalta ho to band rakhein" control={<Toggle checked={s.includeCogs} onChange={(v) => setS({ ...s, includeCogs: v })} />} />
          </div>
          <div className="mt-3 flex justify-end">
            <Btn variant="primary" disabled={!dirty} loading={save.isPending} icon={<Save className="h-4 w-4" />} onClick={() => save.mutate()}>Mehfooz karein</Btn>
          </div>
        </details>
      </div>
    </Card>
  );
}
