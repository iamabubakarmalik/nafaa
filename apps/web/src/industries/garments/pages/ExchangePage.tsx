/**
 * Exchange: a customer brings back pieces from an earlier bill and takes
 * other pieces now. Pick the bill, choose what comes back, add the new
 * pieces; the returned value pays toward the new bill, so only the
 * difference is taken or handed back. Past the shop's exchange days
 * (Settings) the owner's or a manager's PIN is asked.
 *
 * Keys: / find bill · G guide.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeftRight, GraduationCap, Minus, Package, Plus, Receipt, RotateCcw, Search, ShoppingBag, Trash2, Wallet } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { Alert, Button, Card, Checkbox, Input, PageHero, PageShell, Skeleton, heroIconButton, heroPrimaryButton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { PaymentMethodPicker } from '@modules/pos/components';
import { receiptLink } from '@modules/sales/history/receiptPrefs';
import { FindBillModal } from '@modules/sales/returns/components/FindBillModal';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { exchangeApi, type ExchangeResult } from '../api/exchange.api';
import { EmptyList, LoadFailed } from '../components/charts';
import { HOLD_KEY, MONEY_KEYS, apiError, dayFull, opt, r2 } from '../components/meta';
import { useGarmentsCan } from '../components/permissions';
import { ProductPick, type PickedProduct } from '../components/ProductPick';

interface NewLine extends PickedProduct { key: string; quantity: number }

export default function ExchangePage() {
  const qc = useQueryClient();
  const { exchange: canExchange } = useGarmentsCan();
  const guide = usePageGuide();
  const [finding, setFinding] = useState(false);
  const [saleId, setSaleId] = useState<string | null>(null);
  const [back, setBack] = useState<Record<string, { qty: number; damaged: boolean }>>({});
  const [pick, setPick] = useState<PickedProduct | null>(null);
  const [pickQty, setPickQty] = useState('1');
  const [lines, setLines] = useState<NewLine[]>([]);
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [reason, setReason] = useState('');
  const [done, setDone] = useState<ExchangeResult | null>(null);

  const previewQ = useQuery({ queryKey: ['garments-exchange', saleId], queryFn: () => exchangeApi.preview(saleId!), enabled: !!saleId });
  const p = previewQ.data;

  const reset = () => { setSaleId(null); setBack({}); setLines([]); setPick(null); setPickQty('1'); setReason(''); setMethod('CASH'); setDone(null); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === '/' && canExchange) { e.preventDefault(); setFinding(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canExchange]);

  const credit = useMemo(() => r2((p?.lines ?? []).reduce((s, l) => s + (back[l.saleItemId]?.qty ?? 0) * l.unitRefund, 0)), [p, back]);
  const newTotal = r2(lines.reduce((s, l) => s + l.price * l.quantity, 0));
  const diff = r2(newTotal - credit);
  const returning = Object.entries(back).filter(([, v]) => v.qty > 0);

  const addLine = () => {
    if (!pick) return;
    const qty = Number(pickQty);
    if (!(qty > 0)) { toast.error('Ginti likhein'); return; }
    const key = `${pick.productId}:${pick.variantId ?? ''}`;
    setLines((prev) => (prev.some((l) => l.key === key)
      ? prev.map((l) => (l.key === key ? { ...l, quantity: r2(l.quantity + qty) } : l))
      : [...prev, { ...pick, key, quantity: qty }]));
    setPick(null);
    setPickQty('1');
  };

  const save = useMutation({
    mutationFn: () => exchangeApi.create({
      saleId: saleId!,
      returnItems: returning.map(([saleItemId, v]) => ({ saleItemId, quantity: v.qty, restock: !v.damaged })),
      items: lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity })),
      paymentMethod: method,
      reason: opt(reason),
    }),
    onSuccess: (r) => {
      setDone(r);
      toast.success(`Exchange ho gaya — naya bill ${r.sale.saleNumber}`);
      [HOLD_KEY, 'garments-exchange', 'returns', ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
    onError: (e) => toast.error(apiError(e, 'Exchange nahi hua')),
  });

  const problem = !returning.length ? 'Wapas aane wala maal chunein' : !lines.length ? 'Naya maal jorein' : null;

  return (
    <PageShell>
      <PageHero title="Exchange" chip={<><ArrowLeftRight /> Badalna</>} meta="Purane bill ka maal wapas, naya maal usi waqt — sirf farq lein ya dein"
        loading={previewQ.isLoading && !!saleId}
        actions={<>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canExchange && <button type="button" onClick={() => setFinding(true)} title="Bill dhoondein (/)" className={heroPrimaryButton}><Search className="h-4 w-4" /> Bill dhoondein</button>}
        </>}
        stats={p ? [
          { label: 'Bill', value: p.sale.saleNumber, hint: dayFull(p.sale.soldAt) },
          { label: 'Kitne din', value: `${p.days} din`, hint: p.exchangeDays ? `Had ${p.exchangeDays} din` : 'Had set nahi' },
          { label: 'Customer', value: p.sale.customer?.name ?? 'Walk-in' },
        ] : undefined}
      />

      {!canExchange ? (
        <EmptyList icon={ArrowLeftRight} title="Exchange ki permission nahi" text="Exchange ke liye Return aur POS dono ki permission chahiye. Malik se kahein." />
      ) : done ? (
        <Card title="Exchange ho gaya" description={`Wapsi ${done.returnNumber} · naya bill ${done.sale.saleNumber}`}>
          <dl className="grid gap-2 text-[0.875rem] sm:grid-cols-2">
            <Row label="Wapas aaye maal ki value" value={formatPKR(done.refundAmount)} />
            {done.khataAmount > 0 && <Row label="Purane bill ka udhaar kata" value={formatPKR(done.khataAmount)} />}
            <Row label="Naye bill me laga credit" value={formatPKR(Math.min(done.credit, done.sale.total))} />
            <Row label="Naya bill" value={formatPKR(done.sale.total)} />
            {done.paidNow > 0 && <Row label="Customer ne diya" value={formatPKR(done.paidNow)} />}
            {done.sale.changeAmount > 0 && <Row label="Customer ko wapas" value={formatPKR(done.sale.changeAmount)} strong />}
            {done.sale.creditAmount > 0 && <Row label="Khate me (udhaar)" value={formatPKR(done.sale.creditAmount)} strong />}
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to={receiptLink(done.sale.id)}><Button leftIcon={<Receipt className="h-4 w-4" />}>Naya bill kholein</Button></Link>
            <Button variant="secondary" onClick={reset} leftIcon={<ArrowLeftRight className="h-4 w-4" />}>Naya exchange</Button>
          </div>
        </Card>
      ) : !saleId ? (
        <EmptyList icon={ArrowLeftRight} title="Pehle purana bill dhoondein" text="Bill number scan karein, ya customer ka naam / phone likhein. Phir chunein kya wapas aaya aur kya naya diya.">
          <Button onClick={() => setFinding(true)} leftIcon={<Search className="h-4 w-4" />}>Bill dhoondein</Button>
        </EmptyList>
      ) : previewQ.isLoading ? (
        <Skeleton className="h-64 rounded-3xl" />
      ) : previewQ.isError || !p ? (
        <LoadFailed what="Bill" retry={() => previewQ.refetch()} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-4">
            {p.late ? (
              <Alert tone="warning" title={`Bill ${p.days} din purana hai`}>
                Dukaan ki had {p.exchangeDays} din hai. Exchange par malik ya manager ka PIN lagega.
              </Alert>
            ) : p.exchangeDays === 0 ? (
              <Alert tone="info">Exchange ke din ki had abhi set nahi — Settings me "Exchange din" likhein.</Alert>
            ) : null}
            {p.sale.creditAmount > 0 && (
              <Alert tone="info">Is bill par udhaar tha. Wapsi pehle udhaar se kategi, is liye credit kam ho sakta hai — aakhri hisaab server batayega.</Alert>
            )}

            <Card flush title="1. Kya wapas aaya" description={`${p.sale.saleNumber} · ${p.sale.shop?.name ?? ''}`}
              actions={<Button size="sm" variant="ghost" onClick={() => { reset(); setFinding(true); }}>Bill badlein</Button>}>
              {!p.lines.length ? <p className="px-5 pb-5 text-[0.875rem] text-slate-500">Is bill ka koi maal wapas nahi ho sakta</p> : (
                <ul className="divide-y divide-slate-100">
                  {p.lines.map((l) => {
                    const v = back[l.saleItemId] ?? { qty: 0, damaged: false };
                    const set = (patch: Partial<typeof v>) => setBack((b) => ({ ...b, [l.saleItemId]: { ...v, ...patch } }));
                    return (
                      <li key={l.saleItemId} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[0.875rem] font-semibold text-slate-900">{l.name}{l.variantName ? ` · ${l.variantName}` : ''}</p>
                          <p className="text-[0.75rem] text-slate-500">{formatPKR(l.unitRefund)} / {l.unit} · {l.returnable} wapas ho sakte</p>
                        </div>
                        <Stepper value={v.qty} max={l.returnable} onChange={(qty) => set({ qty })} />
                        {v.qty > 0 && (
                          <Checkbox checked={v.damaged} onChange={(e) => set({ damaged: e.target.checked })} label="Kharab hai" description="Shelf par nahi jayega" />
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            <Card title="2. Naya maal" description="Jo customer ab le raha hai">
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[14rem] flex-1"><ProductPick value={pick} onChange={setPick} label="Product" hint="Naam likhein ya size ka barcode scan karein" /></div>
                <div className="w-24"><Input label="Ginti" inputMode="decimal" value={pickQty} onChange={(e) => setPickQty(e.target.value.replace(/[^\d.]/g, ''))} hint="Kitne piece" /></div>
                <Button onClick={addLine} disabled={!pick} leftIcon={<Plus className="h-4 w-4" />} className="mb-6">Jorein</Button>
              </div>
              {lines.length > 0 && (
                <ul className="mt-3 divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200">
                  {lines.map((l) => (
                    <li key={l.key} className="flex items-center gap-3 px-3 py-2">
                      <Package className="h-4 w-4 shrink-0 text-slate-400" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[0.875rem] font-medium text-slate-900">{l.name}{l.variantName ? ` · ${l.variantName}` : ''}</p>
                        <p className="text-[0.75rem] text-slate-500">{l.quantity} × {formatPKR(l.price)}</p>
                      </div>
                      <span className="text-[0.875rem] font-semibold tabular-nums">{formatPKR(r2(l.quantity * l.price))}</span>
                      <button type="button" onClick={() => setLines((prev) => prev.filter((x) => x.key !== l.key))} aria-label="Hatayein"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card title="3. Hisaab" className="h-fit lg:sticky lg:top-4">
            <dl className="space-y-2 text-[0.875rem]">
              <Row icon={RotateCcw} label="Wapsi credit" value={formatPKR(credit)} />
              <Row icon={ShoppingBag} label="Naya maal" value={formatPKR(newTotal)} />
              <div className="border-t border-slate-100 pt-2">
                <Row icon={Wallet} strong label={diff > 0 ? 'Customer dega' : diff < 0 ? 'Customer ko wapas (cash)' : 'Barabar'} value={formatPKR(Math.abs(diff))} />
              </div>
            </dl>
            {diff > 0 && <PaymentMethodPicker className="mt-3" value={method} onChange={setMethod} label="Farq kaise mila" />}
            <Input className="mt-3" label="Wajah" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="Size chhota tha" hint="Marzi hai — Return report me dikhegi" />
            {problem && <p className="mt-3 text-[0.8125rem] text-amber-800">{problem}</p>}
            <Button className="mt-3" fullWidth disabled={!!problem} loading={save.isPending} onClick={() => save.mutate()} leftIcon={<ArrowLeftRight className="h-4 w-4" />}>
              Exchange karein
            </Button>
            {p.needsPin && <p className="mt-2 text-center text-[0.75rem] text-slate-500">Malik ya manager ka PIN poocha jayega</p>}
          </Card>
        </div>
      )}

      {finding && <FindBillModal onClose={() => setFinding(false)} onPick={(sale) => { reset(); setSaleId(sale.id); setFinding(false); }} />}

      {guide.isOpen && (
        <PageGuide title="Exchange — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Search, color: '#2563eb', title: 'Bill dhoondein', text: 'Bill ka number scan karein ya customer ka naam / phone likhein.' },
            { icon: RotateCcw, color: '#e11d48', title: 'Kya wapas aaya', text: 'Har cheez ki ginti chunein. Kharab ho to "Kharab hai" — wo shelf par nahi jati.' },
            { icon: ShoppingBag, color: '#16a34a', title: 'Naya maal', text: 'Jo customer le raha hai wo jorein. Wapsi ki value naye bill me lag jati hai, sirf farq lein ya dein.' },
            { icon: Wallet, color: '#d97706', title: 'Din ki had', text: 'Settings me "Exchange din" se zyada purane bill par malik ya manager ka PIN lagta hai.' },
          ]}
          shortcuts={[['/', 'bill dhoondein'], ['G', 'guide']]} />
      )}
    </PageShell>
  );
}

function Row({ label, value, strong, icon: Icon }: { label: string; value: string; strong?: boolean; icon?: typeof Wallet }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex items-center gap-1.5 text-slate-600">{Icon && <Icon className="h-4 w-4 text-slate-400" />}{label}</dt>
      <dd className={cn('tabular-nums', strong ? 'text-[1rem] font-bold text-slate-900' : 'font-semibold text-slate-800')}>{value}</dd>
    </div>
  );
}

function Stepper({ value, max, onChange }: { value: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <button type="button" aria-label="Kam" disabled={value <= 0} onClick={() => onChange(Math.max(r2(value - 1), 0))}
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-40"><Minus className="h-4 w-4" /></button>
      <span className="w-10 text-center text-[0.9375rem] font-bold tabular-nums">{value}</span>
      <button type="button" aria-label="Zyada" disabled={value >= max} onClick={() => onChange(Math.min(r2(value + 1), max))}
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-40"><Plus className="h-4 w-4" /></button>
    </div>
  );
}
