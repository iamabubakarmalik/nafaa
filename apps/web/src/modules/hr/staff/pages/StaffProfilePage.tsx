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
  Clock, GraduationCap, KeyRound, LogIn, MessageCircle, Pencil, Phone, ShieldCheck, Undo2, UserMinus, Wallet,
} from 'lucide-react';
import { Avatar, Button, Card, EmptyState, PageHero, PageShell, Skeleton, Tabs, heroButton, heroPrimaryButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { peopleApi, type Profile } from '../api/people.api';
import { GiveLoginModal, ResetPasswordModal, StatusModal } from '../components/ProfileModals';
import { ActivityTab, AttendanceTab, BranchesTab, LoginsTab, OverviewTab, PayTab, PermissionsTab } from '../components/ProfileTabs';
import { PEOPLE_KEY, STATUS, ago, day, roleOf, salaryTypeOf, tenure, time, waLink } from '../components/meta';
import { t as tr } from '@core/i18n';

type Tab = 'overview' | 'permissions' | 'branches' | 'attendance' | 'pay' | 'logins' | 'activity';
const TABS: Tab[] = ['overview', 'permissions', 'branches', 'attendance', 'pay', 'logins', 'activity'];

function profileDoc(p: Profile): PrintDoc {
  const s = p.staff;
  const a = p.attendance;
  return {
    title: tr('Staff profile'),
    subtitle: p.person.fullName,
    meta: [[tr('Role'), roleOf(p.person.role).label], [tr('Haal'), STATUS[p.person.status].label], ...(p.person.staffNumber ? [[tr('Staff no.'), p.person.staffNumber] as [string, string]] : [])],
    sections: [
      {
        kind: 'rows', title: tr('Details'),
        rows: [
          { label: tr('Kaam'), value: p.person.designation ?? '—' }, { label: tr('Branch'), value: p.person.shop?.name ?? 'Sab branches' },
          { label: tr('Phone'), value: p.person.phone ?? '—' }, { label: tr('CNIC'), value: s?.cnic ?? '—' },
          { label: tr('Joining'), value: day(p.person.joinDate) }, ...(p.person.endDate ? [{ label: tr('Aakhri din'), value: day(p.person.endDate) }] : []),
          ...(s ? [{ label: tr('Tankhwah'), value: `${salaryTypeOf(s.salaryType).label} · ${formatPKR(s.baseSalary)}` }] : []),
          ...(s?.bankName ? [{ label: tr('Bank'), value: `${s.bankName} ${s.accountNumber ?? ''}` }] : []),
        ],
      },
      ...(a ? [{
        kind: 'rows' as const, title: tr('Haazri ({{month}})', { month: a.month }),
        rows: [{ label: tr('Haazir'), value: String(a.present) }, { label: tr('Late'), value: String(a.late) }, { label: tr('Ghair haazir'), value: String(a.absent) }, { label: tr('Chhutti'), value: String(a.leave) }, { label: tr('Ghante'), value: String(a.hours), strong: true }],
      }] : []),
      ...(p.salary?.payments.length ? [{
        kind: 'table' as const, title: tr('Tankhwah'),
        columns: [{ label: tr('Period') }, { label: tr('Banti'), align: 'right' as const }, { label: tr('Di'), align: 'right' as const }],
        rows: p.salary.payments.map((x) => [`${day(x.periodStart)} – ${day(x.periodEnd)}`, formatPKR(x.netAmount), formatPKR(x.paidAmount)]),
      }] : []),
      ...(p.sales ? [{ kind: 'rows' as const, title: tr('Sale'), rows: [{ label: tr('Aaj'), value: formatPKR(p.sales.today.sales) }, { label: tr('Is mahine'), value: `${formatPKR(p.sales.month.sales)} (${p.sales.month.bills} bill)`, strong: true }] }] : []),
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
        <Card>
          <EmptyState
            title={q.isError ? tr('Profile load nahi hui') : tr('Yeh banda nahi mila')}
            action={<>
              {q.isError && <Button variant="secondary" onClick={() => q.refetch()}>{tr('Dobara koshish')}</Button>}
              <Button variant="ghost" onClick={() => navigate('/staff')}>{tr('Staff par wapas')}</Button>
            </>}
          />
        </Card>
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
      <PageHero
        back={() => navigate('/staff')}
        backLabel={tr('Wapas (Esc)')}
        title={(
          <span className="flex min-w-0 items-center gap-2.5">
            <Avatar name={person.fullName} url={person.avatarUrl} size={36} className="shrink-0 ring-2 ring-white/40" />
            <span className="truncate">{person.fullName}</span>
          </span>
        )}
        chip={<><role.icon />{role.label}{person.status !== 'ACTIVE' && <span className="text-white/70">· {st.label}</span>}</>}
        subtitle={(
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>{[person.designation, person.staffNumber, person.shop?.name ?? 'Sab branches'].filter(Boolean).join(' · ')}</span>
            {onDuty && <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2 py-0.5 text-[0.75rem] font-semibold text-white ring-1 ring-white/20"><Clock className="h-3.5 w-3.5" />{tr('Duty par · {{label}} · {{since}} se', { label: onDuty.label, since: time(onDuty.since) })}</span>}
          </span>
        )}
        actions={(
          <>
            {canEdit && <Link to={`/staff/${id}/edit`} title={tr('Badlein (E)')} className={heroPrimaryButton}><Pencil className="h-4 w-4" /> {' '}{tr('Badlein')}</Link>}
            {phone && <a href={`tel:${phone}`} className={heroButton}><Phone className="h-4 w-4" /> {' '}{tr('Call')}</a>}
            {phone && <a href={waLink(phone)} target="_blank" rel="noreferrer" className={heroButton}><MessageCircle className="h-4 w-4" /> {' '}{tr('WhatsApp')}</a>}
            {p.viewer.owner && !person.hasLogin && p.staff && person.status !== 'LEFT' && <button type="button" onClick={() => setModal('login')} className={heroButton}><LogIn className="h-4 w-4 rtl-flip" /> {' '}{tr('Login dein')}</button>}
            {p.viewer.owner && p.login && !ownerTarget && <button type="button" onClick={() => setModal('password')} className={heroButton}><KeyRound className="h-4 w-4" /> {' '}{tr('Naya password')}</button>}
            {canStatus && (away
              ? <button type="button" onClick={() => setModal('back')} className={heroButton}><Undo2 className="h-4 w-4" /> {' '}{tr('Wapas kaam par')}</button>
              : <button type="button" onClick={() => setModal('leave')} className={heroButton}><UserMinus className="h-4 w-4" /> {' '}{tr('Chhutti / chhor gaya')}</button>)}
            <span className="[&_button]:h-9 [&_button]:border-white/25 [&_button]:bg-white/15 [&_button]:text-white"><PrintButton doc={() => profileDoc(p)} size="sm" /></span>
            <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroButton}><GraduationCap className="h-4 w-4" /> {' '}{tr('Guide')}</button>
          </>
        )}
        stats={[
          ...(p.sales ? [{ label: tr('Aaj ki sale'), value: formatPKR(p.sales.today.sales), hint: tr('{{bills}} bill · mahina {{sales}}', { bills: p.sales.today.bills, sales: formatPKR(p.sales.month.sales) }) }] : []),
          { label: tr('Kab se'), value: tenure(person.joinDate), hint: day(person.joinDate) },
          { label: tr('Aakhri login'), value: p.login ? ago(p.login.lastLoginAt) : person.hasLogin ? '—' : tr('Login nahi') },
          { label: tr('Is mahine haazri'), value: p.attendance ? `${p.attendance.present} din` : '—', hint: p.attendance?.absent ? tr('{{absent}} ghair haazir', { absent: p.attendance.absent }) : undefined },
          { label: tr('Tankhwah'), value: p.salary ? (p.salary.salaryType === 'COMMISSION' ? tr('Commission') : formatPKR(p.salary.baseSalary)) : '—', hint: p.salary?.unpaid ? tr('{{unpaid}} baqi', { unpaid: formatPKR(p.salary.unpaid) }) : undefined },
        ]}
      />

      <Tabs value={tab} onChange={setTab} label={tr('Profile')}
        items={[
          { value: 'overview', label: tr('Khulasa') },
          { value: 'permissions', label: tr('Permissions'), count: p.login && !ownerTarget ? p.login.permissions.length : undefined },
          { value: 'branches', label: tr('Branch') },
          { value: 'attendance', label: tr('Haazri') },
          { value: 'pay', label: tr('Tankhwah') },
          { value: 'logins', label: tr('Login aur devices'), count: p.sessions.length || undefined },
          { value: 'activity', label: tr('Activity') },
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
        <PageGuide title={tr('{{fullName}} — profile', { fullName: person.fullName })} onClose={guide.close}
          steps={[
            { icon: ShieldCheck, color: '#7c3aed', title: tr('Permissions'), text: tr('Har nishan ke saath likha hai ke us se kya khulta hai. "Zyada" aur "Hataya" batate hain ke role se kya farq hai. Sirf malik badal sakta hai.') },
            { icon: LogIn, color: '#0284c7', title: tr('Login aur devices'), text: tr('Kab aur kahan se login hua, ghalat password ki koshishein, aur khule devices. Phone gum ho jaye to "Sab se logout" dabayein.') },
            { icon: KeyRound, color: '#d97706', title: tr('Naya password'), text: tr('Banda password bhool jaye to "Naya password" — parchi chhapein ya WhatsApp par bhejein. Purana password foran band.') },
            { icon: Wallet, color: '#16a34a', title: tr('Haazri aur tankhwah'), text: tr('Is mahine ki haazri, pichli tankhwahein aur baqi amount. Details Haazri aur Tankhwah ke safhon par.') },
            { icon: UserMinus, color: '#e11d48', title: tr('Chhor gaya'), text: tr('Banda kaam chhor de to "Chhutti / chhor gaya". Kuch mitta nahi — sale aur tankhwah ka hisaab waisa hi rehta hai. Login bhi saath band kar sakte hain.') },
          ]}
          tips={[tr('Jis ki sale ho chuki ho us ka record kabhi mitaya nahi jata — sirf band hota hai.'), tr('Role badalne se ijazat khud nahi badalti; Ijazatein tab me role wali ek click se lagayein.')]}
          shortcuts={[['E', tr('badlein')], ['1-7', tr('tabs')], ['Esc', tr('wapas')], ['G', tr('guide')]]}
        />
      )}
    </PageShell>
  );
}

