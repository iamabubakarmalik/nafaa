/**
 * Paisa tab: money in (payment methods, channels, service charges, khata,
 * booking payments) and money out (expenses, purchases, supplier payments).
 * Lists follow the page search.
 */

import { Link } from 'react-router-dom';
import { BookOpen, CalendarCheck, Globe, Receipt, ShoppingBag, Truck, Wallet } from 'lucide-react';
import { PAYMENT_COLORS } from '@modules/dashboard/engine/useChartTheme';
import type { DayBook } from '../api';
import { clock, method, type Money } from '../print';
import { Empty, Panel, ShareBar, Tag, TableWrap, td, tdR, th, thR } from './parts';

const SOURCE: Record<string, string> = { POS: 'Counter (POS)', WEBSITE: 'Website' };
const PURCHASE: Record<string, string> = { PENDING: 'Order', PARTIAL: 'Aadha aaya', RECEIVED: 'Aa gaya' };

export function MoneyView({ d, m, q }: { d: DayBook; m: Money; q: string }) {
  const has = (...parts: Array<string | null | undefined>) => !q || parts.some((p) => p?.toLowerCase().includes(q));
  const totalIn = d.payments.reduce((a, p) => a + p.total, 0) + d.khata.collected;
  const expenses = d.expenses.list.filter((e) => has(e.title, e.category, e.number, e.by));
  const purchases = d.purchases.list.filter((p) => has(p.supplier, p.number));
  const supplierPays = d.supplierPayments.list.filter((p) => has(p.supplier, p.reference, p.note));
  const khata = d.khata.list.filter((k) => has(k.customer, k.phone, k.reference));
  const bookings = d.bookings.list.filter((b) => has(b.number, b.customer));
  const maxCat = d.expenses.byCategory[0]?.amount ?? 0;

  return (
    <div className="space-y-4">
      <Panel icon={Wallet} title="Payment ke tareeqe" hint={`Kul paisa aaya ${m.sales(totalIn)}. "Mila" = bill par liya paisa (cash me wapas rezgari nikal kar). Booking se bane bill ka paisa booking wale din gina jata hai.`}>
        {!d.payments.length ? <Empty icon={Wallet} text="Koi payment nahi" /> : (
          <TableWrap>
            <thead><tr><th className={th}>Tareeqa</th><th className={thR}>Bill</th><th className={thR}>Bill ki amount</th><th className={thR}>Mila</th><th className={thR}>Udhaar</th><th className={thR}>Booking</th><th className={thR}>Kul aaya</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {d.payments.map((p) => (
                <tr key={p.method}>
                  <td className={td}><span className="inline-flex items-center gap-2 font-medium text-slate-800"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PAYMENT_COLORS[p.method] ?? '#64748b' }} />{method(p.method)}</span></td>
                  <td className={tdR}>{p.bills}{p.bookingBills ? <span className="text-slate-400"> ({p.bookingBills} booking)</span> : null}</td>
                  <td className={tdR}>{m.sales(p.billed)}</td>
                  <td className={tdR}>{m.sales(p.collected)}</td>
                  <td className={tdR}>{p.credit ? <span className="text-amber-700">{m.sales(p.credit)}</span> : '—'}</td>
                  <td className={tdR}>{p.bookings ? m.sales(p.bookings) : '—'}</td>
                  <td className={`${tdR} font-semibold text-slate-900`}>{m.sales(p.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="border-t border-slate-200 font-semibold text-slate-900">
              <td className={td}>Kul</td>
              <td className={tdR}>{d.payments.reduce((a, p) => a + p.bills, 0)}</td>
              <td className={tdR}>{m.sales(d.payments.reduce((a, p) => a + p.billed, 0))}</td>
              <td className={tdR}>{m.sales(d.payments.reduce((a, p) => a + p.collected, 0))}</td>
              <td className={tdR}>{m.sales(d.payments.reduce((a, p) => a + p.credit, 0))}</td>
              <td className={tdR}>{m.sales(d.payments.reduce((a, p) => a + p.bookings, 0))}</td>
              <td className={tdR}>{m.sales(d.payments.reduce((a, p) => a + p.total, 0))}</td>
            </tr></tfoot>
          </TableWrap>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel icon={Globe} title="Sale kahan se aayi" hint="Counter ya online channel">
          {!d.sources.length ? <Empty icon={Globe} text="Koi sale nahi" /> : (
            <ul className="space-y-2.5">
              {d.sources.map((s) => (
                <li key={s.source}>
                  <div className="flex justify-between text-[0.8125rem]"><span className="text-slate-700">{SOURCE[s.source] ?? s.source} <span className="text-slate-400">· {s.bills} bill</span></span><span className="tabular-nums font-medium text-slate-900">{m.sales(s.total)}</span></div>
                  <ShareBar value={s.total} max={d.sources[0].total} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel icon={Receipt} title="Service charges" hint="Delivery, fitting, tax waghera jo bill par alag lage">
          {!d.charges.length ? <Empty icon={Receipt} text="Koi service charge nahi laga" /> : (
            <ul className="divide-y divide-slate-100">
              {d.charges.map((c) => (
                <li key={c.label} className="flex justify-between py-2 text-[0.8125rem]"><span className="text-slate-700">{c.label} <span className="text-slate-400">· {c.bills} bill</span></span><span className="tabular-nums font-medium text-slate-900">{m.sales(c.amount)}</span></li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel icon={BookOpen} title="Khata (udhaar)" hint="Is din kitna udhaar diya aur kitna wasool hua">
          <div className="mb-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-amber-50 px-3 py-2"><p className="text-[0.6875rem] font-medium text-amber-800">Udhaar diya · {d.khata.givenCount}</p><p className="font-bold tabular-nums text-amber-900">{m.sales(d.khata.given)}</p></div>
            <div className="rounded-xl bg-success-50 px-3 py-2"><p className="text-[0.6875rem] font-medium text-success-800">Wasool hua · {d.khata.collectedCount}</p><p className="font-bold tabular-nums text-success-900">{m.sales(d.khata.collected)}</p></div>
          </div>
          {!khata.length ? <Empty icon={BookOpen} text={q ? 'Koi entry nahi mili' : 'Is din khata me kuch nahi hua'} /> : (
            <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
              {khata.map((k) => (
                <li key={k.id}>
                  <Link to={`/customers/${k.customerId}`} className="flex items-center justify-between gap-2 py-2 hover:opacity-80">
                    <span className="min-w-0"><span className="block truncate text-[0.8125rem] font-medium text-slate-800">{k.customer}</span><span className="text-[0.6875rem] text-slate-500">{clock(k.at)}{k.method ? ` · ${method(k.method)}` : ''}{k.reference ? ` · ${k.reference}` : ''}</span></span>
                    <span className="flex shrink-0 items-center gap-2">{k.kind === 'given' ? <Tag tone="amber">Udhaar</Tag> : <Tag tone="green">Wasool</Tag>}<span className="tabular-nums text-[0.8125rem] font-semibold text-slate-900">{m.sales(k.amount)}</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel icon={CalendarCheck} title="Booking ka paisa" hint={`Advance aur return. ${d.bookings.converted} booking aaj bill bani.`}>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-sky-50 px-3 py-2"><p className="text-[0.6875rem] font-medium text-sky-800">Advance · {d.bookings.advanceCount}</p><p className="font-bold tabular-nums text-sky-900">{m.sales(d.bookings.advances)}</p></div>
            <div className="rounded-xl bg-rose-50 px-3 py-2"><p className="text-[0.6875rem] font-medium text-rose-800">Return · {d.bookings.refundCount}</p><p className="font-bold tabular-nums text-rose-900">{m.sales(d.bookings.refunds)}</p></div>
          </div>
          {!bookings.length ? <Empty icon={CalendarCheck} text={q ? 'Koi booking nahi mili' : 'Is din booking ka paisa nahi aaya'} /> : (
            <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
              {bookings.map((b) => (
                <li key={b.id}>
                  <Link to={`/bookings/${b.bookingId}`} className="flex items-center justify-between gap-2 py-2 hover:opacity-80">
                    <span className="min-w-0"><span className="block truncate text-[0.8125rem] font-medium text-slate-800">{b.number}{b.customer ? ` · ${b.customer}` : ''}</span><span className="text-[0.6875rem] text-slate-500">{clock(b.at)} · {method(b.method)}</span></span>
                    <span className="flex shrink-0 items-center gap-2">{b.type === 'REFUND' ? <Tag tone="rose">Return</Tag> : <Tag tone="sky">Advance</Tag>}<span className="tabular-nums text-[0.8125rem] font-semibold text-slate-900">{m.sales(b.amount)}</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel icon={ShoppingBag} title="Expense" hint={`${d.expenses.count} expenses · kul ${m.cost(d.expenses.total)} · is me se cash ${m.cost(d.expenses.cash)}`}
        actions={<Link to="/expenses" className="text-[0.75rem] font-semibold text-brand-700 hover:underline">Expense likhein →</Link>}>
        {!d.expenses.count ? <Empty icon={ShoppingBag} text="Is din koi expense darj nahi hua" /> : (
          <div className="grid gap-5 lg:grid-cols-5">
            <ul className="space-y-2.5 lg:col-span-2">
              {d.expenses.byCategory.map((c) => (
                <li key={c.name}>
                  <div className="flex justify-between text-[0.8125rem]"><span className="text-slate-700">{c.name} <span className="text-slate-400">· {c.count}</span></span><span className="tabular-nums font-medium text-slate-900">{m.cost(c.amount)}</span></div>
                  <ShareBar value={c.amount} max={maxCat} color="#e11d48" />
                </li>
              ))}
            </ul>
            <div className="lg:col-span-3">
              {!expenses.length ? <Empty icon={ShoppingBag} text="Koi expense nahi mila" /> : (
                <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
                  {expenses.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-2 py-2">
                      <span className="min-w-0"><span className="block truncate text-[0.8125rem] font-medium text-slate-800">{e.title}</span><span className="text-[0.6875rem] text-slate-500">{e.number} · {e.category ?? 'Baghair category'} · {method(e.method)}{e.by ? ` · ${e.by}` : ''}</span></span>
                      <span className="shrink-0 tabular-nums text-[0.8125rem] font-semibold text-slate-900">{m.cost(e.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel icon={Truck} title="Purchase" hint={`${d.purchases.count} bill · maal ${m.cost(d.purchases.total)} · diye ${m.cost(d.purchases.paid)}`}>
          {!purchases.length ? <Empty icon={Truck} text={q ? 'Koi bill nahi mila' : 'Is din maal nahi khareeda'} /> : (
            <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
              {purchases.map((p) => (
                <li key={p.id}>
                  <Link to={`/purchases/${p.id}`} className="flex items-center justify-between gap-2 py-2 hover:opacity-80">
                    <span className="min-w-0"><span className="block truncate text-[0.8125rem] font-medium text-slate-800">{p.supplier}</span><span className="text-[0.6875rem] text-slate-500">{p.number} · {clock(p.at)} · {PURCHASE[p.status] ?? p.status}</span></span>
                    <span className="shrink-0 text-right"><span className="block tabular-nums text-[0.8125rem] font-semibold text-slate-900">{m.cost(p.total)}</span><span className="text-[0.6875rem] text-slate-500">diye {m.cost(p.paid)} · {method(p.method)}</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel icon={Truck} title="Supplier ko payment" hint={`Kul ${m.cost(d.supplierPayments.total)} · cash ${m.cost(d.supplierPayments.cash)}`}>
          {!supplierPays.length ? <Empty icon={Truck} text={q ? 'Koi payment nahi mili' : 'Is din supplier ko kuch nahi diya'} /> : (
            <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
              {supplierPays.map((p) => (
                <li key={p.id}>
                  <Link to={`/suppliers/${p.supplierId}`} className="flex items-center justify-between gap-2 py-2 hover:opacity-80">
                    <span className="min-w-0"><span className="block truncate text-[0.8125rem] font-medium text-slate-800">{p.supplier}</span><span className="text-[0.6875rem] text-slate-500">{method(p.method)}{p.reference ? ` · ${p.reference}` : ''}{p.note ? ` · ${p.note}` : ''}</span></span>
                    <span className="shrink-0 tabular-nums text-[0.8125rem] font-semibold text-slate-900">{m.cost(p.amount)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
