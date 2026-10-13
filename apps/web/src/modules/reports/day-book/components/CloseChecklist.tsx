/**
 * "Din band karein" checklist: the checks a shop runs before calling the
 * day done. Every line comes from the day book itself; each one that needs
 * work links to the place where it is fixed.
 */

import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, ClipboardCheck, Info, XCircle } from 'lucide-react';
import { cn } from '@core/lib/cn';
import type { DayBook } from '../api';
import type { Money } from '../print';
import { Panel } from './parts';

type State = 'ok' | 'warn' | 'bad' | 'info';
interface Check { id: string; state: State; title: string; text: string; to?: string; tab?: Tab; action?: string }
type Tab = 'cash' | 'money' | 'items' | 'staff' | 'checks';

const ICON = { ok: CheckCircle2, warn: AlertCircle, bad: XCircle, info: Info };
const TONE = { ok: 'text-success-600', warn: 'text-amber-600', bad: 'text-rose-600', info: 'text-sky-600' };

function dayChecks(d: DayBook, m: Money, pending: number): Check[] {
  const dr = d.drawer;
  const out: Check[] = [];

  // Drawer checks only when the drawer figures are shown to this user.
  if (dr && !dr.registers.length) {
    out.push({ id: 'reg', state: d.summary.bills ? 'warn' : 'info', title: 'Register nahi khula', text: d.summary.bills ? 'Bikri hui magar galla register nahi khula — cash ka hisaab nahi mil sakta.' : 'Is din register nahi khula.', to: '/cash-register', action: 'Register' });
  } else if (dr?.openNow) {
    out.push({ id: 'reg', state: d.isToday ? 'warn' : 'bad', title: `${dr.openNow} register abhi khula hai`, text: 'Cash gin kar register band karein, tab aakhri hisaab banega.', to: '/cash-register', action: 'Band karein' });
  } else if (dr) {
    out.push({ id: 'reg', state: 'ok', title: 'Sab register band', text: `${dr.registers.length} register gine aur band kiye gaye.` });
  }

  if (dr && dr.difference != null) {
    const off = Math.abs(dr.difference);
    const small = off <= Math.max(50, Math.abs(dr.expected) * 0.005);
    out.push({
      id: 'diff', state: off === 0 ? 'ok' : small ? 'warn' : 'bad',
      title: off === 0 ? 'Cash poora mila' : `Cash ${dr.difference > 0 ? 'zyada' : 'kam'}: ${m.sales(off)}`,
      text: off === 0 ? 'Gina hua cash hisaab ke barabar hai.' : 'Galla tab me har register ka farq aur wajah dekhein.', tab: 'cash', action: 'Galla',
    });
  }

  if (dr?.previousClosing) {
    const gap = dr.previousClosing.nextOpening - dr.previousClosing.amount;
    out.push({
      id: 'open', state: Math.abs(gap) < 1 ? 'ok' : 'warn',
      title: Math.abs(gap) < 1 ? 'Opening = pichhli closing' : 'Opening pichhli closing se alag',
      text: Math.abs(gap) < 1 ? `${m.sales(dr.previousClosing.amount)} se din shuru hua.` : `Pichhli closing ${m.sales(dr.previousClosing.amount)}, aaj ki opening ${m.sales(dr.previousClosing.nextOpening)}. Raat ko cash nikala gaya ho to theek hai.`,
      tab: 'cash', action: 'Dekhein',
    });
  }

  out.push(d.expenses.count
    ? { id: 'exp', state: 'ok', title: `${d.expenses.count} kharche darj`, text: `Kul ${m.cost(d.expenses.total)}. Koi reh gaya ho to abhi likh dein.`, to: '/expenses', action: 'Kharcha' }
    : { id: 'exp', state: d.summary.bills ? 'warn' : 'info', title: 'Koi kharcha nahi likha', text: 'Chai, kiraya, bijli — jo bhi kharcha hua, darj karein warna galla kam niklega.', to: '/expenses', action: 'Kharcha likhein' });

  if (d.isToday) {
    out.push(pending
      ? { id: 'sync', state: 'bad', title: `${pending} bill is computer par ruke hain`, text: 'Internet chalu karein — server par jane tak ye hisaab me nahi.' }
      : { id: 'sync', state: 'ok', title: 'Sab bill server par', text: 'Is computer par koi bill ruka hua nahi.' });
  }

  if (d.voids.length || d.returns.length) {
    out.push({ id: 'void', state: 'info', title: `${d.voids.length} void · ${d.returns.length} wapsi`, text: 'Har void aur wapsi ki wajah ek nazar dekh lein.', tab: 'checks', action: 'Jaanch' });
  }
  if (d.lowStock.length) {
    out.push({ id: 'low', state: 'info', title: `${d.lowStock.length} cheezein kam reh gayin`, text: 'Kal ke liye order bana lein.', to: '/low-stock', action: 'Order' });
  }
  return out;
}

export function CloseChecklist({ d, m, pending, onTab, className, plain }: {
  d: DayBook; m: Money; pending: number; onTab?: (t: Tab) => void; className?: string; plain?: boolean;
}) {
  const checks = dayChecks(d, m, pending);
  const done = checks.filter((c) => c.state === 'ok').length;
  const blocking = checks.filter((c) => c.state === 'bad' || c.state === 'warn').length;
  const list = (
    <>
      <div className="mb-3 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div className={cn('h-full rounded-full', blocking ? 'bg-amber-500' : 'bg-success-500')} style={{ width: `${(done / Math.max(checks.length, 1)) * 100}%` }} />
        </div>
        <span className="text-[0.75rem] font-semibold tabular-nums text-slate-600">{done}/{checks.length}</span>
      </div>
      <ul className="space-y-2">
        {checks.map((c) => {
          const Icon = ICON[c.state];
          const act = c.action && (c.to
            ? <Link to={c.to} className="shrink-0 text-[0.75rem] font-semibold text-brand-700 hover:underline">{c.action} →</Link>
            : c.tab && onTab ? <button type="button" onClick={() => onTab(c.tab!)} className="shrink-0 text-[0.75rem] font-semibold text-brand-700 hover:underline">{c.action} →</button> : null);
          return (
            <li key={c.id} className="flex gap-2.5 rounded-2xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-100">
              <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', TONE[c.state])} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[0.8125rem] font-semibold text-slate-900">{c.title}</p>
                  {act}
                </div>
                <p className="mt-0.5 text-[0.75rem] leading-relaxed text-slate-500">{c.text}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
  if (plain) return list;
  return (
    <Panel className={className} icon={ClipboardCheck} title="Din band karein" hint={blocking ? `${blocking} kaam baqi hain` : 'Sab tayyar — Z report print kar lein'}>
      {list}
    </Panel>
  );
}
