/**
 * Who commission is on for. Every login that can sell, with its HR record
 * (matched by link, email or phone), a switch per person, and HR records
 * that have no login (their sales cannot be recorded, so they cannot earn).
 */

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Link2, UserPlus, UserX, Users } from 'lucide-react';
import { Avatar, Button, Skeleton, Switch } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { staffApi } from '@modules/organization/staff/api/staff.api';
import type { CommissionPerson, CommissionRow } from '../api/commission.api';
import { COMMISSION_KEY, apiError } from './meta';

export function TeamTab({ people, withoutLogin, rows, loading, busy, onToggle }: {
  people: CommissionPerson[];
  withoutLogin: CommissionPerson[];
  rows: CommissionRow[];
  loading: boolean;
  busy: boolean;
  onToggle: (p: CommissionPerson, on: boolean) => void;
}) {
  const qc = useQueryClient();
  const [linking, setLinking] = useState<string | null>(null);
  const rowOf = new Map(rows.map((r) => [r.userId, r]));

  /* A login with no HR record: create one so salary and commission sit together. */
  const makeStaff = async (p: CommissionPerson) => {
    setLinking(p.userId);
    try {
      await staffApi.linkUser(p.userId!);
      toast.success(`${p.name} ka HR record ban gaya — tankhwah Staff safhe par daalein`);
      qc.invalidateQueries({ queryKey: [COMMISSION_KEY] });
    } catch (e) {
      toast.error(apiError(e, 'HR record nahi bana'));
    } finally {
      setLinking(null);
    }
  };

  if (loading) return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>;
  if (!people.length && !withoutLogin.length) {
    return (
      <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
        <Users className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-3 font-semibold text-slate-900">Abhi koi banda nahi</p>
        <p className="mt-1 text-sm text-slate-500">Team me log daalein — har bande ka apna login ho, tabhi pata chalta hai kis ne becha.</p>
      </div>
    );
  }

  const on = people.filter((p) => p.enrolled).length;
  return (<>
    <p className="rounded-2xl bg-white px-4 py-2.5 text-[0.8125rem] text-slate-600 ring-1 ring-slate-200/80">
      <b className="text-slate-900">{on}/{people.length}</b> bandon par commission chaalu. Har bande ko alag se chaalu karna parta hai — band switch par commission nahi banti, aur POS par "bikri kis ke naam" me sirf chaalu bande aate hain.
    </p>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {people.map((p) => {
        const r = rowOf.get(p.userId!);
        return (
          <div key={p.userId} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
            <div className="flex items-start gap-3">
              <Avatar name={p.name} url={p.staff?.avatarUrl ?? undefined} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900">{p.name}</p>
                <p className="truncate text-[0.75rem] text-slate-500">{p.staff?.designation ?? p.role ?? 'Login'}{p.staff?.staffNumber ? ` · ${p.staff.staffNumber}` : ''}</p>
              </div>
            </div>
            <p className="mt-2 text-[0.75rem] text-slate-600">{r ? `Is mahine ${r.bills} bill · ${formatPKR(r.sale)}` : 'Is mahine koi bikri nahi'}</p>
            {p.staff?.linkedByGuess && <p className="mt-1 text-[0.6875rem] text-amber-700">HR record email/phone se mila — chaalu karte hi pakka jur jayega</p>}
            <div className="mt-3 flex items-center justify-between gap-2">
              <Switch size="sm" label={p.enrolled ? 'Chaalu' : 'Band'} checked={p.enrolled} disabled={busy} onChange={(e) => onToggle(p, e.target.checked)} />
              {!p.staff && (
                <Button size="sm" variant="ghost" loading={linking === p.userId} leftIcon={<UserPlus className="h-4 w-4" />} onClick={() => makeStaff(p)}>HR record</Button>
              )}
            </div>
          </div>
        );
      })}
      {withoutLogin.map((p) => (
        <div key={p.staff?.id} className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500"><UserX className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-900">{p.name}</p>
              <p className="truncate text-[0.75rem] text-slate-500">{p.staff?.designation ?? 'Employee'}{p.staff?.staffNumber ? ` · ${p.staff.staffNumber}` : ''}</p>
            </div>
          </div>
          <p className="mt-2 text-[0.75rem] text-slate-600">Is ka apna login nahi, is liye bikri is ke naam darj nahi hoti. Team me isi email ya phone se login banayein.</p>
          <Link to="/team" className="mt-2 inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-brand-700 hover:underline"><Link2 className="h-3.5 w-3.5" />Login banayein</Link>
        </div>
      ))}
    </div>
  </>);
}
