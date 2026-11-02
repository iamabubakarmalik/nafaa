/**
 * The tabs of a staff profile. Each tab shows a short note instead of data
 * when the viewer lacks the permission that block needs.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  Activity, CalendarCheck, CheckCircle2, FileText, KeyRound, Laptop, Lock, LogOut, MonitorSmartphone, ShieldCheck, ShoppingBag, Store, Wallet, XCircle,
} from 'lucide-react';
import { Button, Card, confirmDialog, Input, Select, Table, TBody, Td, Th, THead, Tr } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import { shopsApi } from '@modules/organization/shops/api/shops.api';
import { staffApi } from '@modules/organization/staff/api/staff.api';
import { teamApi } from '@modules/organization/team/api/team.api';
import { peopleApi, type AttendanceStatus, type Profile } from '../api/people.api';
import { PermissionPicker } from './PermissionPicker';
import { AFFECTED_KEYS, ASSIGNABLE, ROLES, ago, apiError, day, dayTime, deviceOf, salaryTypeOf, time, type AssignableRole } from './meta';
import { t } from '@core/i18n';

const refresh = (qc: ReturnType<typeof useQueryClient>) => AFFECTED_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
const dayLabel = (k: string) => new Date(`${k}T12:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });

const ATT: Record<AttendanceStatus, { label: string; cls: string }> = {
  PRESENT: { label: t('Haazir'), cls: 'bg-success-500 text-white' },
  LATE: { label: t('Late'), cls: 'bg-amber-500 text-white' },
  HALF_DAY: { label: t('Aadha din'), cls: 'bg-sky-500 text-white' },
  ABSENT: { label: t('Ghair haazir'), cls: 'bg-rose-500 text-white' },
  ON_LEAVE: { label: t('Chhutti'), cls: 'bg-slate-400 text-white' },
  HOLIDAY: { label: t('Chhutti ka din'), cls: 'bg-violet-400 text-white' },
};
const PAY_STATUS: Record<string, string> = { PAID: t('Ada'), PARTIAL: t('Kuch baqi'), PENDING: t('Baqi'), CANCELLED: t('Cancel') };

function Note({ text }: { text: string }) {
  return <p className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-[0.8125rem] text-slate-600 ring-1 ring-slate-200"><Lock className="h-4 w-4 shrink-0 text-slate-400" />{text}</p>;
}
function KV({ k, v, mono }: { k: string; v?: string | number | null; mono?: boolean }) {
  return <div className="flex justify-between gap-3 py-1.5 text-[0.8125rem]"><dt className="text-slate-500">{k}</dt><dd className={cn('text-end font-medium text-slate-900', mono && 'font-mono')}>{v === null || v === undefined || v === '' ? '—' : v}</dd></div>;
}
function Tile({ label, value, hint, tone }: { label: string; value: string | number; hint?: string; tone?: string }) {
  return <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/80"><p className="text-[0.75rem] text-slate-500">{label}</p><p className={cn('text-lg font-bold tabular-nums text-slate-900', tone)}>{value}</p>{hint && <p className="text-[0.6875rem] text-slate-500">{hint}</p>}</div>;
}

// ───────────────────────── Overview ─────────────────────────

export function OverviewTab({ p }: { p: Profile }) {
  const theme = useChartTheme();
  const s = p.staff;
  return (
    <div className="space-y-4">
      {p.sales && (
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><ShoppingBag className="h-4 w-4 text-brand-600" />{t('Sale — pichle 30 din')}</span>}
          description={t('Is ke naam lagi sale, return ghata kar')}>
          <div className="mb-3 grid grid-cols-3 gap-2">
            <Tile label={t('Aaj')} value={formatPKR(p.sales.today.sales)} hint={t('{{bills}} bill', { bills: p.sales.today.bills })} />
            <Tile label={t('Is mahine')} value={formatPKR(p.sales.month.sales)} hint={t('{{bills}} bill', { bills: p.sales.month.bills })} />
            <Tile label={t('Aksar bill')} value={formatPKR(p.sales.avgBill)} />
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={p.sales.daily.map((d) => ({ ...d, label: dayLabel(d.day) }))}>
                <CartesianGrid vertical={false} stroke={theme.grid} />
                <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tickFormatter={axisMoney} width={40} tick={theme.axis} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [formatPKR(Number(v)), t('Sale')]} {...theme.tooltip} />
                <Bar dataKey="sales" fill={theme.primary} radius={[4, 4, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-2xl" title={t('Rabta')}>
          <dl className="divide-y divide-slate-100">
            <KV k={t('Phone')} v={p.person.phone} /><KV k={t('Doosra phone')} v={s?.altPhone} /><KV k={t('Email')} v={p.person.email} />
            <KV k={t('Pata')} v={[s?.address, s?.city].filter(Boolean).join(', ')} /><KV k={t('CNIC')} v={s?.cnic} mono />
            <KV k={t('Emergency')} v={s?.emergencyName ? `${s.emergencyName}${s.emergencyRelation ? ` (${s.emergencyRelation})` : ''} ${s.emergencyPhone ?? ''}` : null} />
          </dl>
        </Card>
        <Card className="rounded-2xl" title={t('Kaam')}>
          <dl className="divide-y divide-slate-100">
            <KV k={t('Kaam')} v={p.person.designation} /><KV k={t('Shoba')} v={s?.department} /><KV k={t('Staff no.')} v={p.person.staffNumber} mono />
            <KV k={t('Joining')} v={day(p.person.joinDate)} />{p.person.endDate && <KV k={t('Aakhri din')} v={day(p.person.endDate)} />}
            <KV k={t('Branch')} v={p.person.shop?.name ?? t('Sab branches')} />
            <KV k={t('Tankhwah')} v={s ? `${salaryTypeOf(s.salaryType).label}${s.salaryType !== 'COMMISSION' ? ` · ${formatPKR(s.baseSalary)}` : ''}` : null} />
          </dl>
          {s?.notes && <p className="mt-2 whitespace-pre-line rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-700">{s.notes}</p>}
        </Card>
      </div>
      {!s && <Note text={t('Is login ka HR record nahi — tankhwah aur haazri ke liye "Badlein" se kaam aur tankhwah bhar dein.')} />}
      {s && (s.cnicFrontUrl || s.cnicBackUrl || s.documents.length > 0) && (
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><FileText className="h-4 w-4 text-brand-600" />{t('Kaghazat')}</span>}>
          <div className="flex flex-wrap gap-3">
            {[s.cnicFrontUrl && { url: s.cnicFrontUrl, title: t('CNIC saamne') }, s.cnicBackUrl && { url: s.cnicBackUrl, title: t('CNIC peeche') }, ...s.documents.map((d) => ({ url: d.fileUrl, title: d.title }))]
              .filter(Boolean).map((d) => d && (
                <a key={d.url} href={d.url} target="_blank" rel="noreferrer" className="w-28 overflow-hidden rounded-xl ring-1 ring-slate-200 hover:ring-brand-400">
                  <img src={d.url} alt={d.title} loading="lazy" className="h-20 w-full bg-slate-100 object-cover" />
                  <span className="block truncate px-2 py-1 text-[0.6875rem] text-slate-600">{d.title}</span>
                </a>
              ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ───────────────────────── Permissions ─────────────────────────

export function PermissionsTab({ p }: { p: Profile }) {
  const qc = useQueryClient();
  const login = p.login;
  const [perms, setPerms] = useState<string[]>(login?.permissions ?? []);
  /* Reset only when the saved list really changes, so a background refetch keeps unsaved ticks. */
  const savedKey = (login?.permissions ?? []).join(',');
  useEffect(() => { setPerms(savedKey ? savedKey.split(',') : []); }, [savedKey]);
  const save = useMutation({
    mutationFn: () => teamApi.updatePermissions(login!.id, perms),
    onSuccess: () => { refresh(qc); toast.success(t('Permissions save — agli dafa app kholne par lagengi')); },
    onError: (e) => toast.error(apiError(e, t('Save nahi hua'))),
  });

  if (!p.person.hasLogin) return <Note text={t('Is bande ka login nahi, is liye permission ka sawal nahi. Login dene ke liye upar \'Login dein\' dabayein.')} />;
  if (!login) return <Note text={t('Permission dekhne ke liye "Team dekhna" ki permission chahiye.')} />;
  if (login.role === 'OWNER' || login.role === 'SUPER_ADMIN') return <Note text={t('Malik ko har cheez ki permission hai — yahan kuch badalna nahi parta.')} />;

  const editable = p.viewer.owner;
  const original = login.permissions;
  const dirty = perms.length !== original.length || perms.some((x) => !original.includes(x));
  const role = (ASSIGNABLE.includes(login.role as AssignableRole) ? login.role : 'STAFF') as AssignableRole;
  return (
    <div className="space-y-4">
    <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-brand-600" />{t('Kya kya kar sakta hai')}</span>}
      description={editable ? t('Role: {{label}}. Nishan lagayein ya hatayein, phir Save.', { label: ROLES[role].label }) : t('Sirf malik permission badal sakta hai')}
      actions={editable && dirty ? <>
        <Button size="sm" variant="ghost" onClick={() => setPerms(original)}>{t('Wapas')}</Button>
        <Button size="sm" onClick={() => save.mutate()} loading={save.isPending}>{t('Save karein')}</Button>
      </> : undefined}>
      <PermissionPicker value={perms} onChange={editable ? setPerms : undefined} role={role} readOnly={!editable} />
      {editable && dirty && (
        <div className="sticky bottom-3 mt-4 flex items-center justify-end gap-2 rounded-xl bg-white/95 p-2 shadow ring-1 ring-slate-200">
          <span className="me-auto text-[0.75rem] text-slate-500">{t('Badlaav save nahi hue')}</span>
          <Button size="sm" variant="ghost" onClick={() => setPerms(original)}>{t('Wapas')}</Button>
          <Button size="sm" onClick={() => save.mutate()} loading={save.isPending}>{t('Save karein')}</Button>
        </div>
      )}
    </Card>
    {editable && <ApprovalPinCard userId={login.id} name={p.person.fullName} has={!!login.hasApprovalPin} perms={original} />}
    </div>
  );
}

/** Owner sets or removes this person's own approval PIN. */
function ApprovalPinCard({ userId, name, has, perms }: { userId: string; name: string; has: boolean; perms: string[] }) {
  const qc = useQueryClient();
  const [pin, setPin] = useState('');
  const [open, setOpen] = useState(false);
  const save = useMutation({
    mutationFn: () => peopleApi.setApprovalPin(userId, pin),
    onSuccess: () => { refresh(qc); setPin(''); setOpen(false); toast.success(t('{{name}} ka PIN lag gaya', { name })); },
    onError: (e) => toast.error(apiError(e, t('PIN nahi laga'))),
  });
  const clear = useMutation({
    mutationFn: () => peopleApi.clearApprovalPin(userId),
    onSuccess: () => { refresh(qc); toast.success(t('PIN hata diya')); },
    onError: (e) => toast.error(apiError(e, t('PIN nahi hata'))),
  });
  const can = [
    perms.includes('pos.discount_override') && t('bari discount'),
    perms.includes('khata.manage') && t('had se zyada udhaar'),
    perms.includes('sales.void') && t('bill void'),
    perms.includes('returns.create') && t('return / refund'),
  ].filter(Boolean) as string[];
  return (
    <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><KeyRound className="h-4 w-4 text-amber-600" />{t('Approval PIN')}</span>}
      description={t('Jahan malik ka PIN maanga jata hai, wahan is bande ka apna PIN bhi chal sakta hai — sirf un kaamon ke liye jin ki is ke paas permission hai.')}
      actions={has ? <>
        <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>{t('Badlein')}</Button>
        <Button size="sm" variant="ghost" onClick={() => clear.mutate()} loading={clear.isPending}>{t('Hatayein')}</Button>
      </> : <Button size="sm" onClick={() => setOpen((v) => !v)}>{t('PIN lagayein')}</Button>}>
      <p className="text-[0.8125rem] text-slate-600">
        {has ? t('PIN laga hua hai.') : t('Abhi koi PIN nahi.')}{' '}
        {can.length ? <>{t('Yeh PIN approve kar sakta hai:')}{' '} <b className="text-slate-800">{can.join(', ')}</b>.</> : t('Is ke paas abhi aisi koi permission nahi jo PIN se approve ho — upar permission dein.')}
      </p>
      {open && (
        <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (/^\d{4,8}$/.test(pin)) save.mutate(); }}>
          <Input label={t('Naya PIN (4 se 8 hindsay)')} type="password" inputMode="numeric" autoComplete="new-password" value={pin} maxLength={8}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            wrapperClassName="w-40" className="text-base tracking-[0.3em]" />
          <Button type="submit" size="sm" disabled={!/^\d{4,8}$/.test(pin)} loading={save.isPending}>{t('Save karein')}</Button>
          <p className="w-full text-[0.6875rem] text-slate-500">{t('Malik ke PIN ya kisi aur ke PIN jaisa nahi ho sakta. Har approval ka record banta hai ke kis ke PIN se hui.')}</p>
        </form>
      )}
    </Card>
  );
}

// ───────────────────────── Branches ─────────────────────────

export function BranchesTab({ p }: { p: Profile }) {
  const qc = useQueryClient();
  const shopsQ = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list, staleTime: 5 * 60_000 });
  const shops = (shopsQ.data ?? []).filter((s) => s.isActive);
  const login = p.login;
  const isOwnerLogin = login?.role === 'OWNER' || login?.role === 'SUPER_ADMIN';
  const needsShop = login?.role === 'MANAGER' || login?.role === 'CASHIER';
  const [loginShop, setLoginShop] = useState(login?.shop?.id ?? '');
  const [hrShop, setHrShop] = useState(p.staff?.shopId ?? '');
  const saveLogin = useMutation({
    mutationFn: () => teamApi.updateShop(login!.id, loginShop || null),
    onSuccess: () => { refresh(qc); toast.success(t('Login ki branch badal gayi')); },
    onError: (e) => toast.error(apiError(e, t('Nahi badli'))),
  });
  const saveHr = useMutation({
    mutationFn: () => staffApi.update(p.staff!.id, { shopId: hrShop || undefined }),
    onSuccess: () => { refresh(qc); toast.success(t('HR record ki branch badal gayi')); },
    onError: (e) => toast.error(apiError(e, t('Nahi badli'))),
  });
  const options = [{ value: '', label: needsShop ? t('— Chunein —') : t('Sab branches') }, ...shops.map((s) => ({ value: s.id, label: `${s.name}${s.isMain ? ' (Main)' : ''}` }))];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Lock className="h-4 w-4 text-brand-600" />{t('Login ki branch')}</span>} description={t('App me kaunsi branch ka data dikhe aur sale kahan lage')}>
          {!p.person.hasLogin ? <p className="text-sm text-slate-500">{t('Login nahi hai.')}</p> : !login ? <Note text={t('Dekhne ke liye "Team dekhna" ki permission chahiye.')} /> : isOwnerLogin ? <p className="text-sm text-slate-500">{t('Malik har branch dekh sakta hai.')}</p> : (
            <div className="space-y-3">
              <Select value={loginShop} onChange={(e) => setLoginShop(e.target.value)} options={options} disabled={!p.viewer.owner}
                hint={needsShop ? t('{{label}} ko ek branch deni zaroori hai', { label: ROLES[login.role as AssignableRole].label }) : t('Khali = har branch (jitni permission hai)')} />
              {p.viewer.owner && <Button size="sm" onClick={() => saveLogin.mutate()} loading={saveLogin.isPending} disabled={loginShop === (login.shop?.id ?? '') || (needsShop && !loginShop)}>{t('Save karein')}</Button>}
            </div>
          )}
        </Card>
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Store className="h-4 w-4 text-brand-600" />{t('HR ki branch')}</span>} description={t('Haazri aur tankhwah kis branch me ginein')}>
          {!p.staff ? <p className="text-sm text-slate-500">{t('HR record nahi hai.')}</p> : (
            <div className="space-y-3">
              <Select value={hrShop} onChange={(e) => setHrShop(e.target.value)} options={[{ value: '', label: t('Sab branches') }, ...shops.map((s) => ({ value: s.id, label: s.name }))]} disabled={!p.viewer.manage} hint={t('Aam tor par login wali branch hi')} />
              {p.viewer.manage && <Button size="sm" onClick={() => saveHr.mutate()} loading={saveHr.isPending} disabled={hrShop === (p.staff.shopId ?? '') || !hrShop}>{t('Save karein')}</Button>}
            </div>
          )}
        </Card>
      </div>
      <Card className="rounded-2xl" title={t('Kahan sale ki — pichle 30 din')}>
        {!p.sales ? <Note text={t('Dekhne ke liye "Sale dekhna" ki permission chahiye.')} /> : !p.sales.branches.length ? <p className="text-sm text-slate-500">{t('Pichle 30 din me koi sale nahi.')}</p> : (
          <ul className="space-y-2">
            {p.sales.branches.map((b) => {
              const max = p.sales!.branches[0].sales || 1;
              return (
                <li key={b.shopId ?? 'none'} className="text-[0.8125rem]">
                  <div className="flex justify-between"><span className="text-slate-700">{b.name}</span><span className="font-semibold tabular-nums">{t('{{sales}} · {{bills}} bill', { sales: formatPKR(b.sales), bills: b.bills })}</span></div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500" style={{ width: `${(b.sales / max) * 100}%` }} /></div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

// ───────────────────────── Attendance ─────────────────────────

export function AttendanceTab({ p }: { p: Profile }) {
  const a = p.attendance;
  if (!a) return <Note text={t('Haazri HR record par lagti hai. Is login ka HR record nahi — \'Badlein\' se bana dein.')} />;
  const monthName = new Date(`${a.month}-15T12:00:00`).toLocaleDateString('en-PK', { month: 'long', year: 'numeric' });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Tile label={t('Haazir')} value={a.present} hint={monthName} tone="text-success-700" />
        <Tile label={t('Late')} value={a.late} hint={a.lateMinutes ? t('{{lateMinutes}} min kul', { lateMinutes: a.lateMinutes }) : undefined} tone="text-amber-700" />
        <Tile label={t('Aadha din')} value={a.halfDay} />
        <Tile label={t('Ghair haazir')} value={a.absent} tone="text-rose-700" />
        <Tile label={t('Chhutti')} value={a.leave} />
        <Tile label={t('Ghante')} value={a.hours} hint={a.overtime ? t('{{overtime}} overtime', { overtime: a.overtime }) : undefined} />
      </div>
      <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><CalendarCheck className="h-4 w-4 text-brand-600" />{t('Is mahine roz ka haal')}</span>}
        actions={<Link to="/staff/attendance" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">{t('Haazri ka safha')}</Link>}>
        {!a.days.length ? <p className="text-sm text-slate-500">{t('Is mahine abhi haazri nahi lagi.')}</p> : (
          <ul className="divide-y divide-slate-100">
            {[...a.days].reverse().map((d) => (
              <li key={d.date} className="flex flex-wrap items-center gap-3 py-2 text-[0.8125rem]">
                <span className="w-24 text-slate-600">{dayLabel(d.date)}</span>
                <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold', ATT[d.status].cls)}>{ATT[d.status].label}</span>
                <span className="text-slate-500">{d.checkIn ? `${time(d.checkIn)} – ${d.checkOut ? time(d.checkOut) : 'abhi'}` : ''}</span>
                <span className="ms-auto tabular-nums text-slate-700">{d.workedHours ? t('{{workedHours}} ghante', { workedHours: d.workedHours }) : ''}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {a.leaves.length > 0 && (
        <Card className="rounded-2xl" title={t('Chhuttiyan')}>
          <ul className="divide-y divide-slate-100 text-[0.8125rem]">
            {a.leaves.map((l) => (
              <li key={l.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span>{t('{{startDate}} – {{endDate}} · {{days}} din{{value}}', { startDate: day(l.startDate), endDate: day(l.endDate), days: l.days, value: l.reason ? ` · ${l.reason}` : '' })}</span>
                <span className={cn('font-semibold', l.status === 'APPROVED' ? 'text-success-700' : l.status === 'REJECTED' ? 'text-rose-700' : 'text-amber-700')}>
                  {{ APPROVED: 'Approve', REJECTED: 'Na-approve', PENDING: 'Faisla baqi', CANCELLED: 'Cancel' }[l.status] ?? l.status}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

// ───────────────────────── Salary & commission ─────────────────────────

export function PayTab({ p }: { p: Profile }) {
  const s = p.salary;
  return (
    <div className="space-y-4">
      {!s ? <Note text={t('Tankhwah HR record par hoti hai. Is login ka HR record nahi — \'Badlein\' se bana dein.')} /> : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile label={t('Type')} value={salaryTypeOf(s.salaryType).label} />
            <Tile label={t('Tankhwah')} value={s.salaryType === 'COMMISSION' ? '—' : formatPKR(s.baseSalary)} hint={salaryTypeOf(s.salaryType).unit} />
            <Tile label={t('Baqi dena hai')} value={formatPKR(s.unpaid)} tone={s.unpaid > 0 ? 'text-rose-700' : undefined} />
            <Tile label={t('Aakhri payment')} value={s.lastPaidAt ? day(s.lastPaidAt) : '—'} />
          </div>
          <Card className="rounded-2xl" flush title={<span className="inline-flex items-center gap-2"><Wallet className="h-4 w-4 text-brand-600" />{t('Pichli tankhwahein')}</span>}
            actions={<Link to="/staff/salary/new" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">{t('Tankhwah ka safha')}</Link>}>
            {!s.payments.length ? <p className="px-5 pb-5 text-sm text-slate-500">{t('Abhi koi tankhwah nahi bani.')}</p> : (
              <Table minWidth="30rem" className="[&_table]:text-[0.8125rem]">
                <THead><Tr><Th className="px-4 py-2">{t('Period')}</Th><Th className="px-2 py-2">{t('No.')}</Th><Th className="px-2 py-2 text-end">{t('Banti')}</Th><Th className="px-2 py-2 text-end">{t('Di')}</Th><Th className="px-4 py-2 text-end">{t('Haal')}</Th></Tr></THead>
                <TBody>
                  {s.payments.map((x) => (
                    <Tr key={x.id}>
                      <Td className="px-4 py-2">{day(x.periodStart)} – {day(x.periodEnd)}</Td>
                      <Td className="px-2 py-2 font-mono text-slate-500">{x.paymentNumber}</Td>
                      <Td className="px-2 py-2 text-end tabular-nums">{formatPKR(x.netAmount)}</Td>
                      <Td className="px-2 py-2 text-end tabular-nums">{formatPKR(x.paidAmount)}</Td>
                      <Td className={cn('px-4 py-2 text-end font-semibold', x.status === 'PAID' ? 'text-success-700' : x.status === 'CANCELLED' ? 'text-slate-400' : 'text-amber-700')}>{PAY_STATUS[x.status] ?? x.status}</Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>
        </>
      )}
      <Card className="rounded-2xl" title={t('Commission')} actions={<Link to="/staff/commission" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">{t('Commission ka safha')}</Link>}>
        {!p.person.hasLogin ? <p className="text-sm text-slate-500">{t('Commission login ki sale par banti hai — is bande ka login nahi.')}</p>
          : !p.commission ? <Note text={t('Dekhne ke liye "Sab ki commission" ki permission chahiye.')} />
            : (
              <div className="space-y-3">
                <p className="text-sm">{p.commission.enrolled
                  ? <span className="inline-flex items-center gap-1.5 text-success-700"><CheckCircle2 className="h-4 w-4" />{t('Commission chalu hai{{value}}', { value: p.commission.since ? t(' — {{since}} se', { since: day(p.commission.since) }) : '' })}</span>
                  : <span className="inline-flex items-center gap-1.5 text-slate-500"><XCircle className="h-4 w-4" />{t('Commission me shamil nahi')}</span>}</p>
                {p.commission.payouts.length > 0 && (
                  <ul className="divide-y divide-slate-100 text-[0.8125rem]">
                    {p.commission.payouts.map((x) => <li key={x.period} className="flex justify-between py-1.5"><span>{new Date(`${x.period}-15T12:00:00`).toLocaleDateString('en-PK', { month: 'long', year: 'numeric' })}</span><span className="font-semibold tabular-nums">{formatPKR(x.amount)}</span></li>)}
                  </ul>
                )}
              </div>
            )}
      </Card>
    </div>
  );
}

// ───────────────────────── Logins & devices ─────────────────────────

export function LoginsTab({ p, onResetPassword }: { p: Profile; onResetPassword: () => void }) {
  const qc = useQueryClient();
  const login = p.login;
  const owner = p.viewer.owner && !!login && login.role !== 'OWNER' && !p.viewer.self;
  const out = useMutation({
    mutationFn: (sessionId?: string) => peopleApi.signOut(login!.id, sessionId),
    onSuccess: (r) => { refresh(qc); toast.success(r.sessionsClosed ? t('{{sessionsClosed}} device se logout', { sessionsClosed: r.sessionsClosed }) : t('Koi device khula nahi tha')); },
    onError: (e) => toast.error(apiError(e, t('Logout nahi hua'))),
  });
  if (!p.person.hasLogin) return <Note text={t('Is bande ka login nahi.')} />;
  if (!login) return <Note text={t('Login history dekhne ke liye "Team dekhna" ki permission chahiye.')} />;
  const failed = p.logins.filter((l) => !l.success).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label={t('Login')} value={login.isActive ? t('Chalu') : t('Band')} tone={login.isActive ? 'text-success-700' : 'text-rose-700'} hint={login.email} />
        <Tile label={t('Aakhri login')} value={ago(login.lastLoginAt)} hint={login.lastLoginAt ? dayTime(login.lastLoginAt) : t('Abhi tak nahi kiya')} />
        <Tile label={t('Khule devices')} value={p.sessions.length} />
        <Tile label={t('Ghalat koshishein')} value={failed} hint={t('Pichli 30 koshishon me')} tone={failed ? 'text-rose-700' : undefined} />
      </div>
      <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><MonitorSmartphone className="h-4 w-4 text-brand-600" />{t('Khule devices')}</span>}
        description={t('Jin phone/computer par abhi login hai')}
        actions={owner ? <>
          <Button size="sm" variant="secondary" onClick={onResetPassword}>{t('Naya password')}</Button>
          {p.sessions.length > 0 && <Button size="sm" variant="danger" onClick={async () => { if ((await confirmDialog({ title: t('{{fullName}} ko sab devices se logout karein?', { fullName: p.person.fullName }), danger: true }))) out.mutate(undefined); }} loading={out.isPending} leftIcon={<LogOut className="h-4 w-4 rtl-flip" />}>{t('Sab se logout')}</Button>}
        </> : undefined}>
        {!p.sessions.length ? <p className="text-sm text-slate-500">{t('Abhi kisi device par login nahi.')}</p> : (
          <ul className="divide-y divide-slate-100">
            {p.sessions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><Laptop className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{deviceOf(s.deviceName, s.userAgent)}</p>
                  <p className="truncate text-[0.75rem] text-slate-500">{[s.location, s.ipAddress, `aakhri istemal ${ago(s.lastUsedAt)}`].filter(Boolean).join(' · ')}</p>
                </div>
                {owner && <Button size="sm" variant="ghost" onClick={() => out.mutate(s.id)} disabled={out.isPending}>{t('Logout')}</Button>}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card className="rounded-2xl" flush title={t('Login history')} description={t('Aakhri 30 koshishein')}>
        {!p.logins.length ? <p className="px-5 pb-5 text-sm text-slate-500">{t('Abhi tak koi login nahi.')}</p> : (
          <ul className="divide-y divide-slate-100">
            {p.logins.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-3 px-4 py-2 text-[0.8125rem] sm:px-5">
                {l.success ? <CheckCircle2 className="h-4 w-4 text-success-600" /> : <XCircle className="h-4 w-4 text-rose-600" />}
                <span className="w-36 text-slate-700">{dayTime(l.createdAt)}</span>
                <span className="min-w-0 flex-1 truncate text-slate-500">{[l.deviceName ?? 'Anjaan device', l.location, l.ipAddress].filter(Boolean).join(' · ')}</span>
                {l.isNewDevice && <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[0.6875rem] font-medium text-sky-700">{t('Naya device')}</span>}
                {!l.success && <span className="text-[0.75rem] text-rose-700">{l.failureReason ?? t('Ghalat password')}</span>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

// ───────────────────────── Activity ─────────────────────────

export function ActivityTab({ p }: { p: Profile }) {
  if (!p.person.hasLogin) return <Note text={t('Activity login ke kaam se banti hai — is bande ka login nahi.')} />;
  if (!p.viewer.activity) return <Note text={t('Dekhne ke liye "Activity log" ki permission chahiye.')} />;
  return (
    <Card className="rounded-2xl" flush title={<span className="inline-flex items-center gap-2"><Activity className="h-4 w-4 text-brand-600" />{t('Kya kiya')}</span>} description={t('Aakhri 40 kaam')}
      actions={<Link to="/activity-log" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">{t('Poora log')}</Link>}>
      {!p.activity.length ? <p className="px-5 pb-5 text-sm text-slate-500">{t('Abhi kuch darj nahi.')}</p> : (
        <ul className="divide-y divide-slate-100">
          {p.activity.map((a) => (
            <li key={a.id} className="flex gap-3 px-4 py-2 text-[0.8125rem] sm:px-5">
              <span className="w-32 shrink-0 text-slate-500">{dayTime(a.createdAt)}</span>
              <span className="min-w-0 flex-1 text-slate-800">{a.description}</span>
              {a.entityType && <span className="hidden shrink-0 text-[0.6875rem] text-slate-400 sm:inline">{a.entityType}</span>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
