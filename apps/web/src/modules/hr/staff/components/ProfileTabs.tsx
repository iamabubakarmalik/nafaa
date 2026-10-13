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
import { Button, Card, Select } from '@/design-system/components';
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

const refresh = (qc: ReturnType<typeof useQueryClient>) => AFFECTED_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
const dayLabel = (k: string) => new Date(`${k}T12:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });

const ATT: Record<AttendanceStatus, { label: string; cls: string }> = {
  PRESENT: { label: 'Haazir', cls: 'bg-emerald-500 text-white' },
  LATE: { label: 'Late', cls: 'bg-amber-500 text-white' },
  HALF_DAY: { label: 'Aadha din', cls: 'bg-sky-500 text-white' },
  ABSENT: { label: 'Ghair haazir', cls: 'bg-rose-500 text-white' },
  ON_LEAVE: { label: 'Chhutti', cls: 'bg-slate-400 text-white' },
  HOLIDAY: { label: 'Chhutti ka din', cls: 'bg-violet-400 text-white' },
};
const PAY_STATUS: Record<string, string> = { PAID: 'Ada', PARTIAL: 'Kuch baqi', PENDING: 'Baqi', CANCELLED: 'Cancel' };

function Note({ text }: { text: string }) {
  return <p className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-[0.8125rem] text-slate-600 ring-1 ring-slate-200"><Lock className="h-4 w-4 shrink-0 text-slate-400" />{text}</p>;
}
function KV({ k, v, mono }: { k: string; v?: string | number | null; mono?: boolean }) {
  return <div className="flex justify-between gap-3 py-1.5 text-[0.8125rem]"><dt className="text-slate-500">{k}</dt><dd className={cn('text-right font-medium text-slate-900', mono && 'font-mono')}>{v === null || v === undefined || v === '' ? '—' : v}</dd></div>;
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
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><ShoppingBag className="h-4 w-4 text-brand-600" />Bikri — pichle 30 din</span>}
          description="Is ke naam lagi bikri, wapsi ghata kar">
          <div className="mb-3 grid grid-cols-3 gap-2">
            <Tile label="Aaj" value={formatPKR(p.sales.today.sales)} hint={`${p.sales.today.bills} bill`} />
            <Tile label="Is mahine" value={formatPKR(p.sales.month.sales)} hint={`${p.sales.month.bills} bill`} />
            <Tile label="Aksar bill" value={formatPKR(p.sales.avgBill)} />
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={p.sales.daily.map((d) => ({ ...d, label: dayLabel(d.day) }))}>
                <CartesianGrid vertical={false} stroke={theme.grid} />
                <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tickFormatter={axisMoney} width={40} tick={theme.axis} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [formatPKR(Number(v)), 'Bikri']} {...theme.tooltip} />
                <Bar dataKey="sales" fill={theme.primary} radius={[4, 4, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-2xl" title="Rabta">
          <dl className="divide-y divide-slate-100">
            <KV k="Phone" v={p.person.phone} /><KV k="Doosra phone" v={s?.altPhone} /><KV k="Email" v={p.person.email} />
            <KV k="Pata" v={[s?.address, s?.city].filter(Boolean).join(', ')} /><KV k="CNIC" v={s?.cnic} mono />
            <KV k="Emergency" v={s?.emergencyName ? `${s.emergencyName}${s.emergencyRelation ? ` (${s.emergencyRelation})` : ''} ${s.emergencyPhone ?? ''}` : null} />
          </dl>
        </Card>
        <Card className="rounded-2xl" title="Kaam">
          <dl className="divide-y divide-slate-100">
            <KV k="Kaam" v={p.person.designation} /><KV k="Shoba" v={s?.department} /><KV k="Staff no." v={p.person.staffNumber} mono />
            <KV k="Joining" v={day(p.person.joinDate)} />{p.person.endDate && <KV k="Aakhri din" v={day(p.person.endDate)} />}
            <KV k="Branch" v={p.person.shop?.name ?? 'Sab branches'} />
            <KV k="Tankhwah" v={s ? `${salaryTypeOf(s.salaryType).label}${s.salaryType !== 'COMMISSION' ? ` · ${formatPKR(s.baseSalary)}` : ''}` : null} />
          </dl>
          {s?.notes && <p className="mt-2 whitespace-pre-line rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-700">{s.notes}</p>}
        </Card>
      </div>
      {!s && <Note text={'Is login ka HR record nahi — tankhwah aur haazri ke liye "Badlein" se kaam aur tankhwah bhar dein.'} />}
      {s && (s.cnicFrontUrl || s.cnicBackUrl || s.documents.length > 0) && (
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><FileText className="h-4 w-4 text-brand-600" />Kaghazat</span>}>
          <div className="flex flex-wrap gap-3">
            {[s.cnicFrontUrl && { url: s.cnicFrontUrl, title: 'CNIC saamne' }, s.cnicBackUrl && { url: s.cnicBackUrl, title: 'CNIC peeche' }, ...s.documents.map((d) => ({ url: d.fileUrl, title: d.title }))]
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
    onSuccess: () => { refresh(qc); toast.success('Ijazatein save — agli dafa app kholne par lagengi'); },
    onError: (e) => toast.error(apiError(e, 'Save nahi hua')),
  });

  if (!p.person.hasLogin) return <Note text="Is bande ka login nahi, is liye ijazat ka sawal nahi. Login dene ke liye upar 'Login dein' dabayein." />;
  if (!login) return <Note text={'Ijazat dekhne ke liye "Team dekhna" ki ijazat chahiye.'} />;
  if (login.role === 'OWNER' || login.role === 'SUPER_ADMIN') return <Note text="Malik ko har cheez ki ijazat hai — yahan kuch badalna nahi parta." />;

  const editable = p.viewer.owner;
  const original = login.permissions;
  const dirty = perms.length !== original.length || perms.some((x) => !original.includes(x));
  const role = (ASSIGNABLE.includes(login.role as AssignableRole) ? login.role : 'STAFF') as AssignableRole;
  return (
    <div className="space-y-4">
    <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-brand-600" />Kya kya kar sakta hai</span>}
      description={editable ? `Role: ${ROLES[role].label}. Nishan lagayein ya hatayein, phir Save.` : 'Sirf malik ijazat badal sakta hai'}
      actions={editable && dirty ? <>
        <Button size="sm" variant="ghost" onClick={() => setPerms(original)}>Wapas</Button>
        <Button size="sm" onClick={() => save.mutate()} loading={save.isPending}>Save karein</Button>
      </> : undefined}>
      <PermissionPicker value={perms} onChange={editable ? setPerms : undefined} role={role} readOnly={!editable} />
      {editable && dirty && (
        <div className="sticky bottom-3 mt-4 flex items-center justify-end gap-2 rounded-xl bg-white/95 p-2 shadow ring-1 ring-slate-200">
          <span className="mr-auto text-[0.75rem] text-slate-500">Badlaav save nahi hue</span>
          <Button size="sm" variant="ghost" onClick={() => setPerms(original)}>Wapas</Button>
          <Button size="sm" onClick={() => save.mutate()} loading={save.isPending}>Save karein</Button>
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
    onSuccess: () => { refresh(qc); setPin(''); setOpen(false); toast.success(`${name} ka PIN lag gaya`); },
    onError: (e) => toast.error(apiError(e, 'PIN nahi laga')),
  });
  const clear = useMutation({
    mutationFn: () => peopleApi.clearApprovalPin(userId),
    onSuccess: () => { refresh(qc); toast.success('PIN hata diya'); },
    onError: (e) => toast.error(apiError(e, 'PIN nahi hata')),
  });
  const can = [
    perms.includes('pos.discount_override') && 'bari chhoot',
    perms.includes('khata.manage') && 'had se zyada udhaar',
    perms.includes('sales.void') && 'bill void',
    perms.includes('returns.create') && 'wapsi / refund',
  ].filter(Boolean) as string[];
  return (
    <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><KeyRound className="h-4 w-4 text-amber-600" />Manzoori PIN</span>}
      description="Jahan malik ka PIN maanga jata hai, wahan is bande ka apna PIN bhi chal sakta hai — sirf un kaamon ke liye jin ki is ke paas ijazat hai."
      actions={has ? <>
        <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>Badlein</Button>
        <Button size="sm" variant="ghost" onClick={() => clear.mutate()} loading={clear.isPending}>Hatayein</Button>
      </> : <Button size="sm" onClick={() => setOpen((v) => !v)}>PIN lagayein</Button>}>
      <p className="text-[0.8125rem] text-slate-600">
        {has ? 'PIN laga hua hai.' : 'Abhi koi PIN nahi.'}{' '}
        {can.length ? <>Yeh PIN manzoor kar sakta hai: <b className="text-slate-800">{can.join(', ')}</b>.</> : 'Is ke paas abhi aisi koi ijazat nahi jo PIN se manzoor ho — upar ijazat dein.'}
      </p>
      {open && (
        <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (/^\d{4,8}$/.test(pin)) save.mutate(); }}>
          <label className="text-[0.75rem] font-semibold text-slate-600">
            Naya PIN (4 se 8 hindsay)
            <input type="password" inputMode="numeric" autoComplete="new-password" value={pin} maxLength={8}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              className="mt-1 block h-10 w-40 rounded-xl border border-slate-200 bg-white px-3 text-base tracking-[0.3em] text-slate-900" />
          </label>
          <Button type="submit" size="sm" disabled={!/^\d{4,8}$/.test(pin)} loading={save.isPending}>Save karein</Button>
          <p className="w-full text-[0.6875rem] text-slate-500">Malik ke PIN ya kisi aur ke PIN jaisa nahi ho sakta. Har manzoori ka record banta hai ke kis ke PIN se hui.</p>
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
    onSuccess: () => { refresh(qc); toast.success('Login ki branch badal gayi'); },
    onError: (e) => toast.error(apiError(e, 'Nahi badli')),
  });
  const saveHr = useMutation({
    mutationFn: () => staffApi.update(p.staff!.id, { shopId: hrShop || undefined }),
    onSuccess: () => { refresh(qc); toast.success('HR record ki branch badal gayi'); },
    onError: (e) => toast.error(apiError(e, 'Nahi badli')),
  });
  const options = [{ value: '', label: needsShop ? '— Chunein —' : 'Sab branches' }, ...shops.map((s) => ({ value: s.id, label: `${s.name}${s.isMain ? ' (Main)' : ''}` }))];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Lock className="h-4 w-4 text-brand-600" />Login ki branch</span>} description="App me kaunsi branch ka data dikhe aur bikri kahan lage">
          {!p.person.hasLogin ? <p className="text-sm text-slate-500">Login nahi hai.</p> : !login ? <Note text={'Dekhne ke liye "Team dekhna" ki ijazat chahiye.'} /> : isOwnerLogin ? <p className="text-sm text-slate-500">Malik har branch dekh sakta hai.</p> : (
            <div className="space-y-3">
              <Select value={loginShop} onChange={(e) => setLoginShop(e.target.value)} options={options} disabled={!p.viewer.owner}
                hint={needsShop ? `${ROLES[login.role as AssignableRole].label} ko ek branch deni zaroori hai` : 'Khali = har branch (jitni ijazat hai)'} />
              {p.viewer.owner && <Button size="sm" onClick={() => saveLogin.mutate()} loading={saveLogin.isPending} disabled={loginShop === (login.shop?.id ?? '') || (needsShop && !loginShop)}>Save karein</Button>}
            </div>
          )}
        </Card>
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Store className="h-4 w-4 text-brand-600" />HR ki branch</span>} description="Haazri aur tankhwah kis branch me ginein">
          {!p.staff ? <p className="text-sm text-slate-500">HR record nahi hai.</p> : (
            <div className="space-y-3">
              <Select value={hrShop} onChange={(e) => setHrShop(e.target.value)} options={[{ value: '', label: 'Sab branches' }, ...shops.map((s) => ({ value: s.id, label: s.name }))]} disabled={!p.viewer.manage} hint="Aam tor par login wali branch hi" />
              {p.viewer.manage && <Button size="sm" onClick={() => saveHr.mutate()} loading={saveHr.isPending} disabled={hrShop === (p.staff.shopId ?? '') || !hrShop}>Save karein</Button>}
            </div>
          )}
        </Card>
      </div>
      <Card className="rounded-2xl" title="Kahan bikri ki — pichle 30 din">
        {!p.sales ? <Note text={'Dekhne ke liye "Bikri dekhna" ki ijazat chahiye.'} /> : !p.sales.branches.length ? <p className="text-sm text-slate-500">Pichle 30 din me koi bikri nahi.</p> : (
          <ul className="space-y-2">
            {p.sales.branches.map((b) => {
              const max = p.sales!.branches[0].sales || 1;
              return (
                <li key={b.shopId ?? 'none'} className="text-[0.8125rem]">
                  <div className="flex justify-between"><span className="text-slate-700">{b.name}</span><span className="font-semibold tabular-nums">{formatPKR(b.sales)} · {b.bills} bill</span></div>
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
  if (!a) return <Note text="Haazri HR record par lagti hai. Is login ka HR record nahi — 'Badlein' se bana dein." />;
  const monthName = new Date(`${a.month}-15T12:00:00`).toLocaleDateString('en-PK', { month: 'long', year: 'numeric' });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Tile label="Haazir" value={a.present} hint={monthName} tone="text-emerald-700" />
        <Tile label="Late" value={a.late} hint={a.lateMinutes ? `${a.lateMinutes} min kul` : undefined} tone="text-amber-700" />
        <Tile label="Aadha din" value={a.halfDay} />
        <Tile label="Ghair haazir" value={a.absent} tone="text-rose-700" />
        <Tile label="Chhutti" value={a.leave} />
        <Tile label="Ghante" value={a.hours} hint={a.overtime ? `${a.overtime} overtime` : undefined} />
      </div>
      <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><CalendarCheck className="h-4 w-4 text-brand-600" />Is mahine roz ka haal</span>}
        actions={<Link to="/staff/attendance" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">Haazri ka safha</Link>}>
        {!a.days.length ? <p className="text-sm text-slate-500">Is mahine abhi haazri nahi lagi.</p> : (
          <ul className="divide-y divide-slate-100">
            {[...a.days].reverse().map((d) => (
              <li key={d.date} className="flex flex-wrap items-center gap-3 py-2 text-[0.8125rem]">
                <span className="w-24 text-slate-600">{dayLabel(d.date)}</span>
                <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold', ATT[d.status].cls)}>{ATT[d.status].label}</span>
                <span className="text-slate-500">{d.checkIn ? `${time(d.checkIn)} – ${d.checkOut ? time(d.checkOut) : 'abhi'}` : ''}</span>
                <span className="ml-auto tabular-nums text-slate-700">{d.workedHours ? `${d.workedHours} ghante` : ''}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {a.leaves.length > 0 && (
        <Card className="rounded-2xl" title="Chhuttiyan">
          <ul className="divide-y divide-slate-100 text-[0.8125rem]">
            {a.leaves.map((l) => (
              <li key={l.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span>{day(l.startDate)} – {day(l.endDate)} · {l.days} din{l.reason ? ` · ${l.reason}` : ''}</span>
                <span className={cn('font-semibold', l.status === 'APPROVED' ? 'text-emerald-700' : l.status === 'REJECTED' ? 'text-rose-700' : 'text-amber-700')}>
                  {{ APPROVED: 'Manzoor', REJECTED: 'Na-manzoor', PENDING: 'Faisla baqi', CANCELLED: 'Cancel' }[l.status] ?? l.status}
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
      {!s ? <Note text="Tankhwah HR record par hoti hai. Is login ka HR record nahi — 'Badlein' se bana dein." /> : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile label="Qisam" value={salaryTypeOf(s.salaryType).label} />
            <Tile label="Tankhwah" value={s.salaryType === 'COMMISSION' ? '—' : formatPKR(s.baseSalary)} hint={salaryTypeOf(s.salaryType).unit} />
            <Tile label="Baqi dena hai" value={formatPKR(s.unpaid)} tone={s.unpaid > 0 ? 'text-rose-700' : undefined} />
            <Tile label="Aakhri adaigi" value={s.lastPaidAt ? day(s.lastPaidAt) : '—'} />
          </div>
          <Card className="rounded-2xl" flush title={<span className="inline-flex items-center gap-2"><Wallet className="h-4 w-4 text-brand-600" />Pichli tankhwahein</span>}
            actions={<Link to="/staff/salary/new" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">Tankhwah ka safha</Link>}>
            {!s.payments.length ? <p className="px-5 pb-5 text-sm text-slate-500">Abhi koi tankhwah nahi bani.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[30rem] text-[0.8125rem]">
                  <thead><tr className="border-b border-slate-200 text-left text-[0.75rem] text-slate-500"><th className="px-4 py-2 font-medium">Muddat</th><th className="px-2 py-2 font-medium">No.</th><th className="px-2 py-2 text-right font-medium">Banti</th><th className="px-2 py-2 text-right font-medium">Di</th><th className="px-4 py-2 text-right font-medium">Haal</th></tr></thead>
                  <tbody>
                    {s.payments.map((x) => (
                      <tr key={x.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-2">{day(x.periodStart)} – {day(x.periodEnd)}</td>
                        <td className="px-2 py-2 font-mono text-slate-500">{x.paymentNumber}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{formatPKR(x.netAmount)}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{formatPKR(x.paidAmount)}</td>
                        <td className={cn('px-4 py-2 text-right font-semibold', x.status === 'PAID' ? 'text-emerald-700' : x.status === 'CANCELLED' ? 'text-slate-400' : 'text-amber-700')}>{PAY_STATUS[x.status] ?? x.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
      <Card className="rounded-2xl" title="Commission" actions={<Link to="/staff/commission" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">Commission ka safha</Link>}>
        {!p.person.hasLogin ? <p className="text-sm text-slate-500">Commission login ki bikri par banti hai — is bande ka login nahi.</p>
          : !p.commission ? <Note text={'Dekhne ke liye "Sab ki commission" ki ijazat chahiye.'} />
            : (
              <div className="space-y-3">
                <p className="text-sm">{p.commission.enrolled
                  ? <span className="inline-flex items-center gap-1.5 text-emerald-700"><CheckCircle2 className="h-4 w-4" />Commission chalu hai{p.commission.since ? ` — ${day(p.commission.since)} se` : ''}</span>
                  : <span className="inline-flex items-center gap-1.5 text-slate-500"><XCircle className="h-4 w-4" />Commission me shamil nahi</span>}</p>
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
    onSuccess: (r) => { refresh(qc); toast.success(r.sessionsClosed ? `${r.sessionsClosed} device se logout` : 'Koi device khula nahi tha'); },
    onError: (e) => toast.error(apiError(e, 'Logout nahi hua')),
  });
  if (!p.person.hasLogin) return <Note text="Is bande ka login nahi." />;
  if (!login) return <Note text={'Login history dekhne ke liye "Team dekhna" ki ijazat chahiye.'} />;
  const failed = p.logins.filter((l) => !l.success).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Login" value={login.isActive ? 'Chalu' : 'Band'} tone={login.isActive ? 'text-emerald-700' : 'text-rose-700'} hint={login.email} />
        <Tile label="Aakhri login" value={ago(login.lastLoginAt)} hint={login.lastLoginAt ? dayTime(login.lastLoginAt) : 'Abhi tak nahi kiya'} />
        <Tile label="Khule devices" value={p.sessions.length} />
        <Tile label="Ghalat koshishein" value={failed} hint="Pichli 30 koshishon me" tone={failed ? 'text-rose-700' : undefined} />
      </div>
      <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><MonitorSmartphone className="h-4 w-4 text-brand-600" />Khule devices</span>}
        description="Jin phone/computer par abhi login hai"
        actions={owner ? <>
          <Button size="sm" variant="secondary" onClick={onResetPassword}>Naya password</Button>
          {p.sessions.length > 0 && <Button size="sm" variant="danger" onClick={() => { if (window.confirm(`${p.person.fullName} ko sab devices se logout karein?`)) out.mutate(undefined); }} loading={out.isPending} leftIcon={<LogOut className="h-4 w-4" />}>Sab se logout</Button>}
        </> : undefined}>
        {!p.sessions.length ? <p className="text-sm text-slate-500">Abhi kisi device par login nahi.</p> : (
          <ul className="divide-y divide-slate-100">
            {p.sessions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><Laptop className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{deviceOf(s.deviceName, s.userAgent)}</p>
                  <p className="truncate text-[0.75rem] text-slate-500">{[s.location, s.ipAddress, `aakhri istemal ${ago(s.lastUsedAt)}`].filter(Boolean).join(' · ')}</p>
                </div>
                {owner && <Button size="sm" variant="ghost" onClick={() => out.mutate(s.id)} disabled={out.isPending}>Logout</Button>}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card className="rounded-2xl" flush title="Login history" description="Aakhri 30 koshishein">
        {!p.logins.length ? <p className="px-5 pb-5 text-sm text-slate-500">Abhi tak koi login nahi.</p> : (
          <ul className="divide-y divide-slate-100">
            {p.logins.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-3 px-4 py-2 text-[0.8125rem] sm:px-5">
                {l.success ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-rose-600" />}
                <span className="w-36 text-slate-700">{dayTime(l.createdAt)}</span>
                <span className="min-w-0 flex-1 truncate text-slate-500">{[l.deviceName ?? 'Anjaan device', l.location, l.ipAddress].filter(Boolean).join(' · ')}</span>
                {l.isNewDevice && <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[0.6875rem] font-medium text-sky-700">Naya device</span>}
                {!l.success && <span className="text-[0.75rem] text-rose-700">{l.failureReason ?? 'Ghalat password'}</span>}
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
  if (!p.person.hasLogin) return <Note text="Activity login ke kaam se banti hai — is bande ka login nahi." />;
  if (!p.viewer.activity) return <Note text={'Dekhne ke liye "Activity log" ki ijazat chahiye.'} />;
  return (
    <Card className="rounded-2xl" flush title={<span className="inline-flex items-center gap-2"><Activity className="h-4 w-4 text-brand-600" />Kya kiya</span>} description="Aakhri 40 kaam"
      actions={<Link to="/activity-log" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">Poora log</Link>}>
      {!p.activity.length ? <p className="px-5 pb-5 text-sm text-slate-500">Abhi kuch darj nahi.</p> : (
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
