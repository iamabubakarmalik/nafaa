/**
 * One person: role, branch, whether on duty, sales; tabs for overview,
 * permissions, branches, attendance, salary and commission, logins and
 * devices, and activity. From the top: edit, call, WhatsApp, give a login,
 * new password, mark as left or bring back, print.
 *
 * Keys: E edit · 1-7 tabs · G guide · Esc back.
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Clock, GraduationCap, KeyRound, LogIn, MessageCircle, Pencil, Phone, ShieldCheck, Undo2, UserMinus, Wallet,
} from 'lucide-react';
import { Avatar, Button, PageShell, Skeleton, Tabs } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { peopleApi, type Profile } from '../api/people.api';
import { GiveLoginModal, ResetPasswordModal, StatusModal } from '../components/ProfileModals';
import { ActivityTab, AttendanceTab, BranchesTab, LoginsTab, OverviewTab, PayTab, PermissionsTab } from '../components/ProfileTabs';
import { PEOPLE_KEY, STATUS, ago, day, roleOf, salaryTypeOf, tenure, time, waLink } from '../components/meta';

type Tab = 'overview' | 'permissions' | 'branches' | 'attendance' | 'pay' | 'logins' | 'activity';
const TABS: Tab[] = ['overview', 'permissions', 'branches', 'attendance', 'pay', 'logins', 'activity'];

function profileDoc(p: Profile): PrintDoc {
  const s = p.staff;
  const a = p.attendance;
  return {
    title: 'Staff profile',
    subtitle: p.person.fullName,
    meta: [['Role', roleOf(p.person.role).label], ['Haal', STATUS[p.person.status].label], ...(p.person.staffNumber ? [['Staff no.', p.person.staffNumber] as [string, string]] : [])],
    sections: [
      {
        kind: 'rows', title: 'Details',
        rows: [
          { label: 'Kaam', value: p.person.designation ?? '—' }, { label: 'Branch', value: p.person.shop?.name ?? 'Sab branches' },
          { label: 'Phone', value: p.person.phone ?? '—' }, { label: 'CNIC', value: s?.cnic ?? '—' },
          { label: 'Joining', value: day(p.person.joinDate) }, ...(p.person.endDate ? [{ label: 'Aakhri din', value: day(p.person.endDate) }] : []),
          ...(s ? [{ label: 'Tankhwah', value: `${salaryTypeOf(s.salaryType).label} · ${formatPKR(s.baseSalary)}` }] : []),
          ...(s?.bankName ? [{ label: 'Bank', value: `${s.bankName} ${s.accountNumber ?? ''}` }] : []),
        ],
      },
      ...(a ? [{
        kind: 'rows' as const, title: `Haazri (${a.month})`,
        rows: [{ label: 'Haazir', value: String(a.present) }, { label: 'Late', value: String(a.late) }, { label: 'Ghair haazir', value: String(a.absent) }, { label: 'Chhutti', value: String(a.leave) }, { label: 'Ghante', value: String(a.hours), strong: true }],
      }] : []),
      ...(p.salary?.payments.length ? [{
        kind: 'table' as const, title: 'Tankhwah',
        columns: [{ label: 'Period' }, { label: 'Banti', align: 'right' as const }, { label: 'Di', align: 'right' as const }],
        rows: p.salary.payments.map((x) => [`${day(x.periodStart)} – ${day(x.periodEnd)}`, formatPKR(x.netAmount), formatPKR(x.paidAmount)]),
      }] : []),
      ...(p.sales ? [{ kind: 'rows' as const, title: 'Sale', rows: [{ label: 'Aaj', value: formatPKR(p.sales.today.sales) }, { label: 'Is mahine', value: `${formatPKR(p.sales.month.sales)} (${p.sales.month.bills} bill)`, strong: true }] }] : []),
    ],
  };
}

export default function StaffProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const guide = usePageGuide();
  const [modal, setModal] = useState<null | 'login' | 'password' | 'leave' | 'back'>(null);
  const q = useQuery({ queryKey: [PEOPLE_KEY, 'profile', id], queryFn: () => peopleApi.profile(id!), enabled: !!id });
  const p = q.data;

  const t = params.get('tab') as Tab | null;
  const tab: Tab = t && TABS.includes(t) ? t : 'overview';
  const setTab = (next: Tab) => setParams((x) => { const n = new URLSearchParams(x); if (next === 'overview') n.delete('tab'); else n.set('tab', next); return n; }, { replace: true });
  const canEdit = !!p && (p.viewer.manage || (p.viewer.owner && p.person.hasLogin));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === 'Escape') navigate('/staff');
      if ((e.key === 'e' || e.key === 'E') && canEdit) { e.preventDefault(); navigate(`/staff/${id}/edit`); }
      const n = Number(e.key);
      if (n >= 1 && n <= TABS.length) setTab(TABS[n - 1]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (q.isLoading) return <PageShell><Skeleton className="h-48 rounded-3xl" /><Skeleton className="h-10 w-96 rounded-xl" /><Skeleton className="h-80 rounded-2xl" /></PageShell>;
  if (!p) {
    return (
      <PageShell>
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <p className="font-semibold text-slate-900">{q.isError ? 'Profile load nahi hui' : 'Yeh banda nahi mila'}</p>
          <div className="mt-3 flex justify-center gap-2">
            {q.isError && <Button variant="secondary" onClick={() => q.refetch()}>Dobara koshish</Button>}
            <Button variant="ghost" onClick={() => navigate('/staff')}>Staff par wapas</Button>
          </div>
        </div>
      </PageShell>
    );
  }

  const person = p.person;
  const role = roleOf(person.role);
  const st = STATUS[person.status];
  const phone = person.phone && person.phone !== '—' ? person.phone : null;
  const away = person.status === 'LEFT' || person.status === 'INACTIVE' || person.status === 'ON_LEAVE';
  const ownerTarget = person.role === 'OWNER';
  const canStatus = !ownerTarget && ((!!p.staff && p.viewer.manage) || (p.viewer.owner && !!p.login));
  const onDuty = p.onDuty;

  return (
    <PageShell>
      <div className="rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-4 text-white shadow-lg sm:p-6">
        <div className="flex flex-wrap items-start gap-3">
          <button type="button" onClick={() => navigate('/staff')} aria-label="Wapas (Esc)" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 hover:bg-white/25"><ArrowLeft className="h-4 w-4" /></button>
          <Avatar name={person.fullName} url={person.avatarUrl} size={56} className="ring-2 ring-white/40" />
          <div className="min-w-0 flex-1">
            <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold">
              {person.fullName}
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[0.75rem] font-semibold"><role.icon className="h-3.5 w-3.5" />{role.label}</span>
              {person.status !== 'ACTIVE' && <span className="rounded-full bg-white/15 px-2 py-0.5 text-[0.75rem] font-medium">{st.label}</span>}
            </h1>
            <p className="text-[0.8125rem] text-white/75">{[person.designation, person.staffNumber, person.shop?.name ?? 'Sab branches'].filter(Boolean).join(' · ')}</p>
            {onDuty && <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 px-2 py-0.5 text-[0.75rem] font-semibold text-emerald-100"><Clock className="h-3.5 w-3.5" />Duty par · {onDuty.label} · {time(onDuty.since)} se</p>}
          </div>
          {p.sales && (
            <div className="text-right">
              <p className="text-[0.75rem] text-white/70">Aaj ki sale</p>
              <p className="text-3xl font-bold tabular-nums">{formatPKR(p.sales.today.sales)}</p>
              <p className="text-[0.75rem] text-white/70">{p.sales.today.bills} bill · mahina {formatPKR(p.sales.month.sales)}</p>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {canEdit && <Link to={`/staff/${id}/edit`} title="Badlein (E)" className={heroBtn(true)}><Pencil className="h-4 w-4" /> Badlein</Link>}
          {phone && <a href={`tel:${phone}`} className={heroBtn(false)}><Phone className="h-4 w-4" /> Call</a>}
          {phone && <a href={waLink(phone)} target="_blank" rel="noreferrer" className={heroBtn(false)}><MessageCircle className="h-4 w-4" /> WhatsApp</a>}
          {p.viewer.owner && !person.hasLogin && p.staff && person.status !== 'LEFT' && <button type="button" onClick={() => setModal('login')} className={heroBtn(false)}><LogIn className="h-4 w-4" /> Login dein</button>}
          {p.viewer.owner && p.login && !ownerTarget && <button type="button" onClick={() => setModal('password')} className={heroBtn(false)}><KeyRound className="h-4 w-4" /> Naya password</button>}
          {canStatus && (away
            ? <button type="button" onClick={() => setModal('back')} className={heroBtn(false)}><Undo2 className="h-4 w-4" /> Wapas kaam par</button>
            : <button type="button" onClick={() => setModal('leave')} className={heroBtn(false)}><UserMinus className="h-4 w-4" /> Chhutti / chhor gaya</button>)}
          <span className="[&_button]:h-9 [&_button]:border-white/25 [&_button]:bg-white/15 [&_button]:text-white"><PrintButton doc={() => profileDoc(p)} size="sm" /></span>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroBtn(false)}><GraduationCap className="h-4 w-4" /> Guide</button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
          <Stat label="Kab se" value={tenure(person.joinDate)} hint={day(person.joinDate)} />
          <Stat label="Aakhri login" value={p.login ? ago(p.login.lastLoginAt) : person.hasLogin ? '—' : 'Login nahi'} />
          <Stat label="Is mahine haazri" value={p.attendance ? `${p.attendance.present} din` : '—'} hint={p.attendance?.absent ? `${p.attendance.absent} ghair haazir` : undefined} />
          <Stat label="Tankhwah" value={p.salary ? (p.salary.salaryType === 'COMMISSION' ? 'Commission' : formatPKR(p.salary.baseSalary)) : '—'} hint={p.salary?.unpaid ? `${formatPKR(p.salary.unpaid)} baqi` : undefined} />
        </div>
      </div>

      <Tabs value={tab} onChange={setTab} label="Profile"
        items={[
          { value: 'overview', label: 'Khulasa' },
          { value: 'permissions', label: 'Permissions', count: p.login && !ownerTarget ? p.login.permissions.length : undefined },
          { value: 'branches', label: 'Branch' },
          { value: 'attendance', label: 'Haazri' },
          { value: 'pay', label: 'Tankhwah' },
          { value: 'logins', label: 'Login aur devices', count: p.sessions.length || undefined },
          { value: 'activity', label: 'Activity' },
        ]} />

      {tab === 'overview' && <OverviewTab p={p} />}
      {tab === 'permissions' && <PermissionsTab p={p} />}
      {tab === 'branches' && <BranchesTab p={p} />}
      {tab === 'attendance' && <AttendanceTab p={p} />}
      {tab === 'pay' && <PayTab p={p} />}
      {tab === 'logins' && <LoginsTab p={p} onResetPassword={() => setModal('password')} />}
      {tab === 'activity' && <ActivityTab p={p} />}

      {modal === 'login' && <GiveLoginModal p={p} onClose={() => setModal(null)} />}
      {modal === 'password' && <ResetPasswordModal p={p} onClose={() => setModal(null)} />}
      {(modal === 'leave' || modal === 'back') && <StatusModal p={p} back={modal === 'back'} onClose={() => setModal(null)} />}

      {guide.isOpen && (
        <PageGuide title={`${person.fullName} — profile`} onClose={guide.close}
          steps={[
            { icon: ShieldCheck, color: '#7c3aed', title: 'Permissions', text: 'Har nishan ke saath likha hai ke us se kya khulta hai. "Zyada" aur "Hataya" batate hain ke role se kya farq hai. Sirf malik badal sakta hai.' },
            { icon: LogIn, color: '#0284c7', title: 'Login aur devices', text: 'Kab aur kahan se login hua, ghalat password ki koshishein, aur khule devices. Phone gum ho jaye to "Sab se logout" dabayein.' },
            { icon: KeyRound, color: '#d97706', title: 'Naya password', text: 'Banda password bhool jaye to "Naya password" — parchi chhapein ya WhatsApp par bhejein. Purana password foran band.' },
            { icon: Wallet, color: '#16a34a', title: 'Haazri aur tankhwah', text: 'Is mahine ki haazri, pichli tankhwahein aur baqi amount. Details Haazri aur Tankhwah ke safhon par.' },
            { icon: UserMinus, color: '#e11d48', title: 'Chhor gaya', text: 'Banda kaam chhor de to "Chhutti / chhor gaya". Kuch mitta nahi — sale aur tankhwah ka hisaab waisa hi rehta hai. Login bhi saath band kar sakte hain.' },
          ]}
          tips={['Jis ki sale ho chuki ho us ka record kabhi mitaya nahi jata — sirf band hota hai.', 'Role badalne se ijazat khud nahi badalti; Ijazatein tab me role wali ek click se lagayein.']}
          shortcuts={[['E', 'badlein'], ['1-7', 'tabs'], ['Esc', 'wapas'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

const heroBtn = (primary: boolean) => cn('inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[0.8125rem] font-semibold transition',
  primary ? 'bg-white text-brand-800 hover:bg-brand-50' : 'bg-white/15 text-white ring-1 ring-white/25 hover:bg-white/25');
function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return <div><p className="text-[0.75rem] text-white/70">{label}</p><p className="font-semibold tabular-nums">{value}{hint && <span className="ml-1 text-[0.6875rem] font-normal text-white/60">{hint}</span>}</p></div>;
}
