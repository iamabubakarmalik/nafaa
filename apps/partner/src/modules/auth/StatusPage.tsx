/**
 * What a partner sees until Nafaa approves the application, or when the
 * account is suspended or rejected.
 */

import { Link } from 'react-router-dom';
import { Ban, CheckCircle2, Clock3, Mail, MessageCircle, RefreshCw, UserRound, XCircle } from 'lucide-react';
import { Badge, Button } from '@/design-system/components';
import { useAuthStore } from '@/store/auth.store';
import { PARTNER_TYPE, PAYOUT_METHOD } from '@/lib/labels';
import { day } from '@/lib/format';
import { prettyPhone } from '@/lib/phone';
import { SUPPORT_EMAIL, SUPPORT_PHONE_TEXT, SUPPORT_WHATSAPP } from '@/lib/constants';
import { cn } from '@/lib/cn';
import { useMe } from './useMe';

const LOOK = {
  APPLIED: { icon: Clock3, tone: 'bg-amber-50 text-amber-600 ring-amber-200', badge: 'warning' as const, chip: 'Review me', title: 'Aap ki application review me hai', text: 'Nafaa team aam tor par 1–2 kaam ke din me check karti hai. Approve hote hi yahin Dashboard khul jayega. Ye page khud check karta rehta hai.' },
  SUSPENDED: { icon: Ban, tone: 'bg-rose-50 text-rose-600 ring-rose-200', badge: 'danger' as const, chip: 'Band', title: 'Aap ka partner account abhi band hai', text: 'Is dauraan naye Visit aur Payout nahi ho sakte. Wajah janne ke liye Nafaa se rabta karein.' },
  REJECTED: { icon: XCircle, tone: 'bg-rose-50 text-rose-600 ring-rose-200', badge: 'danger' as const, chip: 'Manzoor nahi', title: 'Application manzoor nahi hui', text: 'Sawal ho to Nafaa se rabta karein.' },
  ACTIVE: { icon: CheckCircle2, tone: 'bg-success-50 text-success-600 ring-success-200', badge: 'success' as const, chip: 'Active', title: 'Aap ka account active hai', text: '' },
};

export default function StatusPage() {
  const me = useAuthStore((s) => s.me);
  const q = useMe();
  if (!me) return null;
  const look = LOOK[me.status];
  const rows: Array<[string, string]> = [
    ['Naam', me.fullName],
    ['Mobile', prettyPhone(me.phone)],
    ['Shehar', me.city ?? '—'],
    ['Qisam', PARTNER_TYPE[me.type]?.label ?? me.type],
    ['Payout', me.payoutMethod ? `${PAYOUT_METHOD[me.payoutMethod]} · ${me.payoutAccount ?? ''}` : 'Abhi nahi likha'],
    ['Application ki tareekh', day(me.appliedAt)],
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-200/80 sm:p-8">
        <span className={cn('mx-auto flex h-16 w-16 items-center justify-center rounded-3xl ring-1', look.tone)}><look.icon className="h-8 w-8" /></span>
        <Badge variant={look.badge} className="mt-4">{look.chip}</Badge>
        <h1 className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{look.title}</h1>
        <p className="mx-auto mt-2 max-w-md text-[0.9375rem] text-slate-500">{look.text}</p>
        {me.status === 'REJECTED' && me.rejectReason && (
          <div className="mx-auto mt-4 max-w-md rounded-2xl bg-rose-50 p-3 text-start text-[0.9375rem] text-rose-800 ring-1 ring-rose-200">
            <p className="text-[0.75rem] font-bold uppercase tracking-wide text-rose-600">Wajah</p>
            {me.rejectReason}
          </div>
        )}
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button variant="secondary" onClick={() => void q.refetch()} loading={q.isFetching} leftIcon={<RefreshCw className="h-4 w-4" />}>Dobara check karein</Button>
          <Link to="/profile" className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-brand-fg shadow-sm hover:bg-brand-700">
            <UserRound className="h-4 w-4" /> Profile aur payout account
          </Link>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold text-slate-900">Aap ki application</h2>
          <span className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-[0.8125rem] font-bold tracking-wider text-slate-700">{me.code}</span>
        </div>
        <dl className="mt-3 divide-y divide-slate-100">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 py-2.5 text-[0.9375rem]">
              <dt className="text-slate-500">{k}</dt>
              <dd className="min-w-0 truncate text-end font-semibold text-slate-900">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-3xl bg-brand-50 p-5 ring-1 ring-brand-100">
        <h2 className="font-bold text-brand-900">Nafaa se rabta</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(`Assalam o alaikum, mera partner code ${me.code} hai.`)}`} target="_blank" rel="noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-[0.9375rem] font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200">
            <MessageCircle className="h-4 w-4 text-green-600" /> WhatsApp {SUPPORT_PHONE_TEXT}
          </a>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-[0.9375rem] font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200">
            <Mail className="h-4 w-4 text-slate-500" /> {SUPPORT_EMAIL}
          </a>
        </div>
      </section>
    </div>
  );
}
