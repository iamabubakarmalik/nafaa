/**
 * Jaanch tab: voided bills (with the reason given), returns and discounted
 * bills of the day — the lines an owner checks for mistakes or misuse.
 */

import { Link } from 'react-router-dom';
import { Ban, Percent, RotateCcw } from 'lucide-react';
import type { DayBook } from '../api';
import { clock, method, type Money } from '../print';
import { Empty, Panel, Tag, TableWrap, td, tdR, th, thR } from './parts';

export function ChecksView({ d, m, q }: { d: DayBook; m: Money; q: string }) {
  const has = (...parts: Array<string | null | undefined>) => !q || parts.some((p) => p?.toLowerCase().includes(q));
  const voids = d.voids.filter((v) => has(v.saleNumber, v.customer, v.by, v.reason));
  const returns = d.returns.filter((r) => has(r.number, r.saleNumber, r.customer, r.by, r.reason));
  const discounts = d.discounts.list.filter((x) => has(x.saleNumber, x.customer, x.by, x.code));
  const manual = Math.max(d.discounts.total - d.discounts.code - d.discounts.loyalty, 0);
  const bill = (id: string, no: string) => <Link to={`/sales/${id}/receipt`} className="font-medium text-slate-900 hover:text-brand-700 hover:underline">{no}</Link>;

  return (
    <div className="space-y-4">
      <Panel icon={Ban} title={`Void bill · ${d.voids.length}`} hint="Pura bill wapas liya gaya — maal stock me wapas, bikri me nahi gina. Is din bane ya is din void hue." flush>
        <div className="px-4 pb-4 sm:px-5">
          {!voids.length ? <Empty icon={Ban} text={q ? 'Koi void nahi mila' : 'Is din koi bill void nahi hua'} /> : (
            <TableWrap>
              <thead><tr><th className={th}>Bill</th><th className={th}>Kis ka</th><th className={th}>Wajah</th><th className={thR}>Waqt</th><th className={thR}>Raqam</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {voids.map((v) => (
                  <tr key={v.id}>
                    <td className={td}>{bill(v.id, v.saleNumber)}{v.earlierBill && <span className="ml-1.5"><Tag tone="slate">Purana bill</Tag></span>}<p className="text-[0.6875rem] text-slate-500">{v.customer ?? 'Walk-in'} · {method(v.method)}</p></td>
                    <td className={td}>{v.by ?? '—'}</td>
                    <td className={td}>{v.reason || <span className="text-slate-400">Wajah nahi likhi</span>}</td>
                    <td className={tdR}>{clock(v.soldAt)}</td>
                    <td className={`${tdR} font-semibold text-rose-700`}>{m.sales(v.total)}</td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </div>
      </Panel>

      <Panel icon={RotateCcw} title={`Wapsi · ${d.returns.length}`} hint={`Customer ko ${m.sales(d.summary.returns)} wapas diye. Wapsi us din gini jati hai jis din maal wapas aaya.`} flush>
        <div className="px-4 pb-4 sm:px-5">
          {!returns.length ? <Empty icon={RotateCcw} text={q ? 'Koi wapsi nahi mili' : 'Is din koi maal wapas nahi aaya'} /> : (
            <TableWrap>
              <thead><tr><th className={th}>Wapsi</th><th className={th}>Kis ne li</th><th className={th}>Wajah</th><th className={thR}>Cheezein</th><th className={thR}>Tareeqa</th><th className={thR}>Raqam</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {returns.map((r) => (
                  <tr key={r.id}>
                    <td className={td}><span className="font-medium text-slate-900">{r.number}</span><p className="text-[0.6875rem] text-slate-500">Bill {bill(r.saleId, r.saleNumber)} · {r.customer ?? 'Walk-in'} · {clock(r.at)}</p></td>
                    <td className={td}>{r.by ?? '—'}</td>
                    <td className={td}>{r.reason || <span className="text-slate-400">—</span>}</td>
                    <td className={tdR}>{r.qty}</td>
                    <td className={tdR}>{method(r.method)}</td>
                    <td className={`${tdR} font-semibold text-slate-900`}>{m.sales(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </div>
      </Panel>

      <Panel icon={Percent} title={`Discount · ${d.discounts.bills} bill`} flush
        hint={`Kul ${m.sales(d.discounts.total)}: haath se ${m.sales(manual)} · code se ${m.sales(d.discounts.code)} · points se ${m.sales(d.discounts.loyalty)}. Sab se bare 100 bill.`}>
        <div className="px-4 pb-4 sm:px-5">
          {!discounts.length ? <Empty icon={Percent} text={q ? 'Koi bill nahi mila' : 'Is din kisi bill par discount nahi diya'} /> : (
            <TableWrap>
              <thead><tr><th className={th}>Bill</th><th className={th}>Kis ne diya</th><th className={th}>Kaisa</th><th className={thR}>Bill</th><th className={thR}>Discount</th><th className={thR}>%</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {discounts.map((x) => {
                  const pct = x.subtotal > 0 ? (x.discount / x.subtotal) * 100 : 0;
                  return (
                    <tr key={x.id}>
                      <td className={td}>{bill(x.id, x.saleNumber)}<p className="text-[0.6875rem] text-slate-500">{x.customer ?? 'Walk-in'} · {clock(x.soldAt)}</p></td>
                      <td className={td}>{x.by ?? '—'}</td>
                      <td className={td}>
                        <span className="flex flex-wrap gap-1">
                          {x.code && <Tag tone="sky">{x.code}</Tag>}
                          {x.loyaltyAmount > 0 && <Tag tone="green">Points</Tag>}
                          {x.discount - x.codeAmount - x.loyaltyAmount > 0.01 && <Tag tone="slate">Haath se</Tag>}
                        </span>
                      </td>
                      <td className={tdR}>{m.sales(x.subtotal)}</td>
                      <td className={`${tdR} font-semibold text-slate-900`}>{m.sales(x.discount)}</td>
                      <td className={tdR}>{pct >= 20 ? <Tag tone="amber">{pct.toFixed(0)}%</Tag> : `${pct.toFixed(0)}%`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </TableWrap>
          )}
        </div>
      </Panel>
    </div>
  );
}
