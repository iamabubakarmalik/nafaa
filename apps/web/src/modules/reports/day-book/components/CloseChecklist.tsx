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
import { t as tr } from '@core/i18n';

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
    out.push({ id: 'reg', state: d.summary.bills ? 'warn' : 'info', title: tr('Register nahi khula'), text: d.summary.bills ? tr('Sale hui magar galla register nahi khula — cash ka hisaab nahi mil sakta.') : tr('Is din register nahi khula.'), to: '/cash-register', action: tr('Register') });
  } else if (dr?.openNow) {
    out.push({ id: 'reg', state: d.isToday ? 'warn' : 'bad', title: tr('{{openNow}} register abhi khula hai', { openNow: dr.openNow }), text: tr('Cash gin kar register band karein, tab aakhri hisaab banega.'), to: '/cash-register', action: tr('Band karein') });
  } else if (dr) {
    out.push({ id: 'reg', state: 'ok', title: tr('Sab register band'), text: tr('{{count}} register gine aur band kiye gaye.', { count: dr.registers.length }) });
  }

  if (dr && dr.difference != null) {
    const off = Math.abs(dr.difference);
    const small = off <= Math.max(50, Math.abs(dr.expected) * 0.005);
    out.push({
      id: 'diff', state: off === 0 ? 'ok' : small ? 'warn' : 'bad',
      title: off === 0 ? tr('Cash poora mila') : tr('Cash {{value}}: {{off}}', { value: dr.difference > 0 ? tr('zyada') : tr('kam'), off: m.sales(off) }),
      text: off === 0 ? tr('Gina hua cash hisaab ke barabar hai.') : tr('Galla tab me har register ka farq aur wajah dekhein.'), tab: 'cash', action: tr('Galla'),
    });
  }

  if (dr?.previousClosing) {
    const gap = dr.previousClosing.nextOpening - dr.previousClosing.amount;
    out.push({
      id: 'open', state: Math.abs(gap) < 1 ? 'ok' : 'warn',
      title: Math.abs(gap) < 1 ? tr('Opening = pichhli closing') : tr('Opening pichhli closing se alag'),
      text: Math.abs(gap) < 1 ? tr('{{amount}} se din shuru hua.', { amount: m.sales(dr.previousClosing.amount) }) : tr('Pichhli closing {{amount}}, aaj ki opening {{nextOpening}}. Raat ko cash nikala gaya ho to theek hai.', { amount: m.sales(dr.previousClosing.amount), nextOpening: m.sales(dr.previousClosing.nextOpening) }),
      tab: 'cash', action: tr('Dekhein'),
    });
  }

  out.push(d.expenses.count
    ? { id: 'exp', state: 'ok', title: tr('{{count}} expenses darj', { count: d.expenses.count }), text: tr('Kul {{total}}. Koi reh gaya ho to abhi likh dein.', { total: m.cost(d.expenses.total) }), to: '/expenses', action: tr('Expense') }
    : { id: 'exp', state: d.summary.bills ? 'warn' : 'info', title: tr('Koi expense nahi likha'), text: tr('Chai, kiraya, bijli — jo bhi expense hua, darj karein warna galla kam niklega.'), to: '/expenses', action: tr('Expense likhein') });

  if (d.isToday) {
    out.push(pending
      ? { id: 'sync', state: 'bad', title: tr('{{pending}} bill is computer par ruke hain', { pending }), text: tr('Internet chalu karein — server par jane tak ye hisaab me nahi.') }
      : { id: 'sync', state: 'ok', title: tr('Sab bill server par'), text: tr('Is computer par koi bill ruka hua nahi.') });
  }

  if (d.voids.length || d.returns.length) {
    out.push({ id: 'void', state: 'info', title: tr('{{count}} void · {{count2}} return', { count: d.voids.length, count2: d.returns.length }), text: tr('Har void aur return ki wajah ek nazar dekh lein.'), tab: 'checks', action: tr('Jaanch') });
  }
  if (d.lowStock.length) {
    out.push({ id: 'low', state: 'info', title: tr('{{count}} cheezein kam reh gayin', { count: d.lowStock.length }), text: tr('Kal ke liye order bana lein.'), to: '/low-stock', action: tr('Order') });
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
    <Panel className={className} icon={ClipboardCheck} title={tr('Din band karein')} hint={blocking ? tr('{{blocking}} kaam baqi hain', { blocking }) : tr('Sab tayyar — Z report print kar lein')}>
      {list}
    </Panel>
  );
}
