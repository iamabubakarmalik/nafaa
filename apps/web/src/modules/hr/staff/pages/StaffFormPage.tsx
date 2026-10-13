/**
 * Add or edit a person. One form for the HR record (name, job, branch,
 * salary, ID, bank, emergency contact) and, for the owner, the app login:
 * a new person can be given a login with role and permissions in the same
 * step, and an existing login's email, phone, role and branch are edited
 * here. Permissions of an existing login are edited on the profile.
 *
 * Keys: Ctrl+Enter save · Esc back.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, ArrowLeft, Briefcase, IdCard, KeyRound, Landmark, Phone, ShieldCheck, UserRound, Wallet } from 'lucide-react';
import { Button, Card, Input, Kbd, PageShell, Select, Skeleton, Switch, Textarea } from '@/design-system/components';
import { AvatarUpload } from '@core/components/uploads';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen } from '@core/lib/shortcuts';
import { useAuthStore, useShopParam } from '@core/stores/auth.store';
import { shopsApi } from '@modules/organization/shops/api/shops.api';
import { staffApi, type CreateStaffPayload, type SalaryType, type StaffGender } from '@modules/organization/staff/api/staff.api';
import { peopleApi } from '../api/people.api';
import { LoginFields, loginProblem, newLoginDraft, type LoginDraft } from '../components/LoginFields';
import { LoginSlipModal } from '../components/LoginSlipModal';
import { useRoleDefaults } from '../components/PermissionPicker';
import type { LoginSlip } from '../components/print';
import { AFFECTED_KEYS, ASSIGNABLE, PEOPLE_KEY, ROLES, SALARY_TYPES, apiError, salaryTypeOf, type AssignableRole } from '../components/meta';

interface Hr {
  fullName: string; fatherName: string; gender: '' | StaffGender; dateOfBirth: string; cnic: string; phone: string; altPhone: string; email: string;
  address: string; city: string; designation: string; department: string; joinDate: string; shopId: string;
  salaryType: SalaryType; baseSalary: string; workingHoursPerDay: string; workingDaysPerMonth: string;
  bankName: string; accountNumber: string; iban: string; emergencyName: string; emergencyPhone: string; emergencyRelation: string;
  avatarUrl: string; cnicFrontUrl: string; cnicBackUrl: string; notes: string;
}

const today = () => new Date().toISOString().slice(0, 10);
const EMPTY: Hr = {
  fullName: '', fatherName: '', gender: '', dateOfBirth: '', cnic: '', phone: '', altPhone: '', email: '', address: '', city: '',
  designation: '', department: '', joinDate: today(), shopId: '', salaryType: 'MONTHLY', baseSalary: '', workingHoursPerDay: '8', workingDaysPerMonth: '26',
  bankName: '', accountNumber: '', iban: '', emergencyName: '', emergencyPhone: '', emergencyRelation: '', avatarUrl: '', cnicFrontUrl: '', cnicBackUrl: '', notes: '',
};
const JOBS = ['Cashier', 'Salesman', 'Manager', 'Helper', 'Store keeper', 'Rider', 'Chef', 'Guard'];

/** HR payload with empty optional fields left out (the API rejects an empty email or date). */
function payload(h: Hr): CreateStaffPayload {
  const opt = (v: string) => (v.trim() ? v.trim() : undefined);
  return {
    fullName: h.fullName.trim(), phone: h.phone.trim(), designation: h.designation.trim(), joinDate: h.joinDate,
    salaryType: h.salaryType, baseSalary: Number(h.baseSalary) || 0,
    workingHoursPerDay: Number(h.workingHoursPerDay) || 8, workingDaysPerMonth: Number(h.workingDaysPerMonth) || 26,
    fatherName: opt(h.fatherName), gender: h.gender || undefined, dateOfBirth: opt(h.dateOfBirth), cnic: opt(h.cnic), altPhone: opt(h.altPhone),
    email: opt(h.email), address: opt(h.address), city: opt(h.city), department: opt(h.department), shopId: opt(h.shopId),
    bankName: opt(h.bankName), accountNumber: opt(h.accountNumber), iban: opt(h.iban), emergencyName: opt(h.emergencyName),
    emergencyPhone: opt(h.emergencyPhone), emergencyRelation: opt(h.emergencyRelation), avatarUrl: opt(h.avatarUrl),
    cnicFrontUrl: opt(h.cnicFrontUrl), cnicBackUrl: opt(h.cnicBackUrl), notes: opt(h.notes),
  };
}

export default function StaffFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isOwner = useAuthStore((s) => s.user?.role === 'OWNER' || s.user?.role === 'SUPER_ADMIN');
  const canManage = usePermission(PERMISSIONS.STAFF_MANAGE);
  const activeShop = useShopParam();
  const defaults = useRoleDefaults();
  const editing = !!id;
  const lock = useRef(false);

  const profileQ = useQuery({ queryKey: [PEOPLE_KEY, 'profile', id], queryFn: () => peopleApi.profile(id!), enabled: editing });
  const shopsQ = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list, staleTime: 5 * 60_000 });
  const shops = (shopsQ.data ?? []).filter((s) => s.isActive);
  const prof = profileQ.data;
  const staff = prof?.staff ?? null;
  const login = prof?.login ?? null;

  const [hr, setHr] = useState<Hr>(EMPTY);
  const [giveLogin, setGiveLogin] = useState(false);
  const [draft, setDraft] = useState<LoginDraft>(() => newLoginDraft(defaults, activeShop ?? ''));
  const [loginEdit, setLoginEdit] = useState<{ email: string; role: AssignableRole; shopId: string }>({ email: '', role: 'CASHIER', shopId: '' });
  const [slip, setSlip] = useState<{ slip: LoginSlip; phone: string; next: string } | null>(null);
  const set = <K extends keyof Hr>(k: K, v: Hr[K]) => setHr((h) => ({ ...h, [k]: v }));

  /* Prefill from the profile once it loads. */
  useEffect(() => {
    if (!prof) return;
    const s = prof.staff;
    const p = prof.person;
    const d = (v?: string | null) => (v ? v.slice(0, 10) : '');
    setHr({
      ...EMPTY,
      fullName: s?.fullName ?? p.fullName, fatherName: s?.fatherName ?? '', gender: s?.gender ?? '', dateOfBirth: d(s?.dateOfBirth), cnic: s?.cnic ?? '',
      phone: (s?.phone && s.phone !== '—' ? s.phone : p.phone) ?? '', altPhone: s?.altPhone ?? '', email: s?.email ?? p.email ?? '',
      address: s?.address ?? '', city: s?.city ?? '', designation: s?.designation ?? (p.role ? ROLES[p.role as AssignableRole]?.label ?? '' : ''), department: s?.department ?? '',
      joinDate: d(s?.joinDate) || today(), shopId: s?.shopId ?? p.shop?.id ?? '',
      salaryType: s?.salaryType ?? 'MONTHLY', baseSalary: s ? String(s.baseSalary || '') : '', workingHoursPerDay: String(s?.workingHoursPerDay ?? 8), workingDaysPerMonth: String(s?.workingDaysPerMonth ?? 26),
      bankName: s?.bankName ?? '', accountNumber: s?.accountNumber ?? '', iban: s?.iban ?? '', emergencyName: s?.emergencyName ?? '', emergencyPhone: s?.emergencyPhone ?? '',
      emergencyRelation: s?.emergencyRelation ?? '', avatarUrl: s?.avatarUrl ?? p.avatarUrl ?? '', cnicFrontUrl: s?.cnicFrontUrl ?? '', cnicBackUrl: s?.cnicBackUrl ?? '', notes: s?.notes ?? '',
    });
    if (prof.login) setLoginEdit({ email: prof.login.email, role: (ASSIGNABLE.includes(prof.login.role as AssignableRole) ? prof.login.role : 'CASHIER') as AssignableRole, shopId: prof.login.shop?.id ?? '' });
  }, [prof]);

  const editsLogin = editing && !!login && isOwner && login.role !== 'OWNER';
  const roleChanged = editsLogin && loginEdit.role !== login!.role;
  const problems = useMemo(() => {
    const out: string[] = [];
    if (!hr.fullName.trim()) out.push('Naam likhein');
    if (!hr.phone.trim()) out.push('Phone number likhein');
    if (!hr.designation.trim()) out.push('Kaam (designation) likhein');
    if (!hr.joinDate) out.push('Joining ki date chunein');
    if (hr.email.trim() && !/^\S+@\S+\.\S+$/.test(hr.email.trim())) out.push('Email theek nahi');
    if (hr.cnic.trim() && hr.cnic.replace(/\D/g, '').length !== 13) out.push('CNIC 13 hindsay ka hota hai');
    if (!editing && giveLogin) { const lp = loginProblem(draft); if (lp) out.push(lp); }
    if (editsLogin && (loginEdit.role === 'MANAGER' || loginEdit.role === 'CASHIER') && !loginEdit.shopId) out.push(`${ROLES[loginEdit.role].label} ke liye branch chunein`);
    if (editsLogin && !/^\S+@\S+\.\S+$/.test(loginEdit.email.trim())) out.push('Login email theek nahi');
    return out;
  }, [hr, editing, giveLogin, draft, editsLogin, loginEdit]);

  const save = useMutation({
    mutationFn: async () => {
      if (problems.length) throw new Error(problems[0]);
      const body = payload(hr);
      if (!editing && giveLogin) {
        const res = await peopleApi.invite({
          fullName: body.fullName, email: draft.email.trim(), phone: body.phone || undefined, password: draft.password, role: draft.role,
          shopId: draft.shopId || undefined, permissions: draft.permissions, designation: body.designation, salaryType: body.salaryType,
          baseSalary: body.baseSalary, joinDate: body.joinDate, sendEmail: draft.sendEmail,
        });
        let detailsSaved = true;
        try { await staffApi.update(res.staffId, { ...body, shopId: draft.shopId || body.shopId }); } catch { detailsSaved = false; }
        return { kind: 'invite' as const, res, detailsSaved };
      }
      if (!editing) return { kind: 'hr' as const, staff: await staffApi.create(body) };

      /* Edit: HR record (made now if a login had none), then the login. */
      let staffId = staff?.id;
      if (!staffId && prof?.person.userId && canManage) {
        const linked = await staffApi.linkUser(prof.person.userId, { designation: body.designation, salaryType: body.salaryType, baseSalary: body.baseSalary }) as { id: string };
        staffId = linked.id;
      }
      if (staffId && canManage) await staffApi.update(staffId, body);
      if (editsLogin) {
        await peopleApi.updateLogin(login!.id, {
          fullName: body.fullName, email: loginEdit.email.trim(), phone: body.phone, role: loginEdit.role, shopId: loginEdit.shopId || null,
        });
      }
      return { kind: 'edit' as const, staffId };
    },
    onSuccess: (r) => {
      AFFECTED_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      if (r.kind === 'invite') {
        toast.success(r.res.linked === 'matched' ? 'Login ban gaya aur purane HR record se jur gaya' : 'Login aur HR record ban gaye');
        if (!r.detailsSaved) toast.error('Kuch details (CNIC, bank waghera) save nahi hui — profile se dobara bharein');
        if (draft.sendEmail && !r.res.emailSent) toast.error('Email nahi gaya — parchi ya WhatsApp se dein');
        setSlip({
          slip: { name: r.res.fullName, email: r.res.email, password: draft.password, role: ROLES[draft.role].label, branch: shops.find((s) => s.id === draft.shopId)?.name ?? null },
          phone: hr.phone, next: `/staff/${r.res.staffId}`,
        });
        return;
      }
      if (r.kind === 'hr') { toast.success(`${r.staff.fullName} jur gaya (${r.staff.staffNumber})`); navigate(`/staff/${r.staff.id}`); return; }
      toast.success(roleChanged ? 'Save ho gaya — naye role ke liye banda dobara login karega' : 'Save ho gaya');
      navigate(`/staff/${r.staffId ?? id}`);
    },
    onError: (e) => toast.error(apiError(e, 'Save nahi hua')),
    onSettled: () => { lock.current = false; },
  });
  const submit = () => { if (lock.current || save.isPending) return; lock.current = true; save.mutate(); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); submit(); }
      if (e.key === 'Escape' && !isDialogOpen()) navigate(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (editing && profileQ.isLoading) return <PageShell><Skeleton className="h-24 rounded-3xl" /><div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-96 rounded-2xl" /><Skeleton className="h-96 rounded-2xl" /></div></PageShell>;
  if (editing && !prof) return <PageShell><div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80"><p className="font-semibold text-slate-900">Yeh banda nahi mila</p><Button className="mt-3" variant="secondary" onClick={() => navigate('/staff')}>Staff par wapas</Button></div></PageShell>;

  const salary = Number(hr.baseSalary) || 0;
  const st = salaryTypeOf(hr.salaryType);
  const hrLocked = editing && !canManage;

  return (
    <PageShell>
      <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-4 text-white shadow-lg sm:p-5">
        <button type="button" onClick={() => navigate(-1)} aria-label="Wapas (Esc)" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 hover:bg-white/25"><ArrowLeft className="h-4 w-4" /></button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">{editing ? `${prof?.person.fullName} — badlein` : 'Naya banda'}</h1>
          <p className="text-[0.8125rem] text-white/75">{editing ? 'Jo badalna hai badlein — baqi waisa hi rahega' : 'Naam, kaam aur tankhwah. App chalana hai to login bhi yahin dein.'}</p>
        </div>
        <span className="hidden items-center gap-1.5 text-[0.75rem] text-white/70 sm:inline-flex"><Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd> save</span>
      </div>

      {hrLocked && <p className="rounded-2xl bg-amber-50 px-4 py-2.5 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">HR record badalne ke liye "Staff sambhalna" ki permission chahiye. Aap sirf dekh sakte hain.</p>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <Card className="rounded-2xl" title={<T icon={UserRound}>Bunyadi details</T>}>
            <fieldset disabled={hrLocked} className="space-y-4">
              <div className="flex flex-wrap items-start gap-4">
                <AvatarUpload value={hr.avatarUrl || null} onChange={(u) => set('avatarUrl', u ?? '')} purpose="avatar" size="md" fallbackText={hr.fullName || 'N'} />
                <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
                  <Input label="Poora naam" required value={hr.fullName} onChange={(e) => set('fullName', e.target.value)} placeholder="Bilal Ahmad" maxLength={100} hint="Bill, parchi aur tankhwah par yahi naam chhapta hai" />
                  <Input label="Walid ka naam" value={hr.fatherName} onChange={(e) => set('fatherName', e.target.value)} placeholder="Ahmad Ali" hint="Marzi hai — pehchaan ke liye" />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Phone" required inputMode="tel" value={hr.phone} onChange={(e) => set('phone', e.target.value)} placeholder="03001234567" leftIcon={<Phone className="h-4 w-4" />} hint="Call aur WhatsApp isi par. Login wale ka phone doosre login par nahi ho sakta." />
                <Input label="Doosra phone" inputMode="tel" value={hr.altPhone} onChange={(e) => set('altPhone', e.target.value)} placeholder="Ghar ka number" hint="Marzi hai" />
                <Input label="Email" type="email" value={hr.email} onChange={(e) => set('email', e.target.value)} placeholder="bilal@gmail.com" hint={giveLogin ? 'HR record ka email. Login ka email neeche alag hai.' : 'Marzi hai'} />
                <Input label="CNIC" inputMode="numeric" value={hr.cnic} onChange={(e) => set('cnic', e.target.value)} placeholder="35202-1234567-1" hint="13 hindsay. Ek CNIC do record par nahi ho sakta." />
                <Select label="Jins" value={hr.gender} onChange={(e) => set('gender', e.target.value as Hr['gender'])}
                  options={[{ value: '', label: '—' }, { value: 'MALE', label: 'Mard' }, { value: 'FEMALE', label: 'Aurat' }, { value: 'OTHER', label: 'Doosra' }]} hint="Marzi hai" />
                <Input label="Paidaish ki date" type="date" value={hr.dateOfBirth} max={today()} onChange={(e) => set('dateOfBirth', e.target.value)} hint="Marzi hai" />
                <Input label="Pata" value={hr.address} onChange={(e) => set('address', e.target.value)} placeholder="Gali, mohalla" hint="Marzi hai" />
                <Input label="Shehar" value={hr.city} onChange={(e) => set('city', e.target.value)} placeholder="Lahore" hint="Marzi hai" />
              </div>
            </fieldset>
          </Card>

          <Card className="rounded-2xl" title={<T icon={Briefcase}>Kaam</T>}>
            <fieldset disabled={hrLocked} className="space-y-3">
              <div>
                <Input label="Kaam (designation)" required value={hr.designation} onChange={(e) => set('designation', e.target.value)} placeholder="Cashier" maxLength={80}
                  hint="Dukaan me kya karta hai. Yeh role nahi — role login ke saath hai." />
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {JOBS.map((j) => (
                    <button key={j} type="button" onClick={() => set('designation', j)} className={cn('h-7 rounded-lg px-2 text-[0.75rem] font-medium ring-1', hr.designation === j ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}>{j}</button>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Input label="Shoba" value={hr.department} onChange={(e) => set('department', e.target.value)} placeholder="Sales" hint="Marzi hai — maslan Sales, Godown" />
                <Input label="Joining" required type="date" value={hr.joinDate} max={today()} onChange={(e) => set('joinDate', e.target.value)} hint="Kab se kaam par hai" />
                <Select label="Branch" value={hr.shopId} onChange={(e) => set('shopId', e.target.value)} options={[{ value: '', label: 'Sab branches' }, ...shops.map((s) => ({ value: s.id, label: s.name }))]}
                  hint={giveLogin || login ? 'HR ki branch. Login ki branch alag set hoti hai.' : 'Kahan kaam karta hai'} />
              </div>
            </fieldset>
          </Card>

          <Card className="rounded-2xl" title={<T icon={Wallet}>Tankhwah</T>} description="Tankhwah ka hisaab aur payment Tankhwah wale safhe par hoti hai">
            <fieldset disabled={hrLocked} className="grid gap-3 sm:grid-cols-2">
              <Select label="Tankhwah ki qisam" value={hr.salaryType} onChange={(e) => set('salaryType', e.target.value as SalaryType)} options={SALARY_TYPES.map((s) => ({ value: s.id, label: s.label }))}
                hint={hr.salaryType === 'COMMISSION' ? 'Sirf commission — rules Commission ke safhe par' : hr.salaryType === 'HYBRID' ? 'Pakki tankhwah ke upar commission' : 'Haazri ke hisaab se banti hai'} />
              {hr.salaryType !== 'COMMISSION' && (
                <Input label={`Amount (Rs)${st.unit ? ` — ${st.unit}` : ''}`} inputMode="decimal" value={hr.baseSalary} onChange={(e) => set('baseSalary', e.target.value.replace(/[^\d.]/g, ''))} placeholder="0"
                  hint={salary > 0 ? formatPKR(salary) : 'Khali chhorein to 0'} className="text-right font-semibold tabular-nums" />
              )}
              <Input label="Roz ke ghante" inputMode="decimal" value={hr.workingHoursPerDay} onChange={(e) => set('workingHoursPerDay', e.target.value.replace(/[^\d.]/g, ''))} hint="Is se zyada kaam overtime ginta hai" />
              <Input label="Mahine ke kaam ke din" inputMode="numeric" value={hr.workingDaysPerMonth} onChange={(e) => set('workingDaysPerMonth', e.target.value.replace(/\D/g, ''))}
                hint={hr.salaryType === 'MONTHLY' && salary > 0 ? `Ek din = ${formatPKR(salary / (Number(hr.workingDaysPerMonth) || 26))}` : 'Aam tor par 26'} />
            </fieldset>
          </Card>
        </div>

        <div className="space-y-4">
          {!editing && (
            <Card className="rounded-2xl" title={<T icon={KeyRound}>App ka login</T>}>
              {!isOwner ? (
                <p className="text-sm text-slate-500">Login sirf malik bana sakta hai. Aap HR record bana dein — malik baad me profile se login de sakta hai.</p>
              ) : (
                <div className="space-y-4">
                  <Switch checked={giveLogin} onChange={(e) => setGiveLogin(e.target.checked)} label="Is bande ko login dein"
                    description="POS chalana, sale karna ya reports dekhna hai to on karein. Helper, driver ko login ki zaroorat nahi." />
                  {giveLogin && <LoginFields value={draft} onChange={setDraft} shops={shops} />}
                </div>
              )}
            </Card>
          )}

          {editing && login && (
            <Card className="rounded-2xl" title={<T icon={ShieldCheck}>Login</T>}
              description={editsLogin ? 'Permissions profile ke "Permissions" tab me badlein' : login.role === 'OWNER' ? 'Malik ka login Profile se badalta hai' : 'Login sirf malik badal sakta hai'}>
              <fieldset disabled={!editsLogin} className="space-y-3">
                <Input label="Login email" type="email" value={loginEdit.email} onChange={(e) => setLoginEdit((l) => ({ ...l, email: e.target.value }))} hint="Isi se login karta hai" />
                {login.role !== 'OWNER' && (
                  <>
                    <Select label="Role" value={loginEdit.role} onChange={(e) => setLoginEdit((l) => ({ ...l, role: e.target.value as AssignableRole }))}
                      options={ASSIGNABLE.map((r) => ({ value: r, label: `${ROLES[r].label} — ${ROLES[r].hint}` }))}
                      hint={roleChanged ? 'Permissions wohi rahengi. Naye role ki permission chahiye to profile ke Permissions tab me "role wali" dabayein.' : 'Role badalne se banda sab devices se logout hoga'} />
                    <Select label="Login ki branch" value={loginEdit.shopId} onChange={(e) => setLoginEdit((l) => ({ ...l, shopId: e.target.value }))}
                      options={[...(loginEdit.role === 'STAFF' ? [{ value: '', label: 'Sab branches' }] : [{ value: '', label: '— Chunein —' }]), ...shops.map((s) => ({ value: s.id, label: s.name }))]}
                      hint="Sirf isi branch ka data dekhega aur isi me sale karega" />
                  </>
                )}
              </fieldset>
              {roleChanged && <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[0.75rem] text-amber-900 ring-1 ring-amber-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Role {ROLES[login.role as AssignableRole]?.label} se {ROLES[loginEdit.role].label} ho raha hai. Permissions khud nahi badlengi.</p>}
            </Card>
          )}
          {editing && !login && prof?.person.hasLogin && <p className="rounded-2xl bg-slate-50 px-4 py-3 text-[0.8125rem] text-slate-600 ring-1 ring-slate-200">Is bande ka login hai. Login ki details dekhne ke liye "Team dekhna" ki permission chahiye.</p>}
          {editing && !prof?.person.hasLogin && isOwner && staff && (
            <p className="rounded-2xl bg-slate-50 px-4 py-3 text-[0.8125rem] text-slate-600 ring-1 ring-slate-200">Login nahi hai. <Link to={`/staff/${staff.id}`} className="font-semibold text-brand-700 hover:underline">Profile se "Login dein"</Link></p>
          )}

          <Card className="rounded-2xl" title={<T icon={IdCard}>CNIC ki photo</T>} description="Marzi hai — kaghaz ke record ke liye">
            <fieldset disabled={hrLocked} className="flex flex-wrap gap-4">
              <div><p className="mb-1.5 text-[0.75rem] text-slate-500">Saamne</p><AvatarUpload value={hr.cnicFrontUrl || null} onChange={(u) => set('cnicFrontUrl', u ?? '')} purpose="document" size="lg" shape="square" fallbackText="F" /></div>
              <div><p className="mb-1.5 text-[0.75rem] text-slate-500">Peeche</p><AvatarUpload value={hr.cnicBackUrl || null} onChange={(u) => set('cnicBackUrl', u ?? '')} purpose="document" size="lg" shape="square" fallbackText="B" /></div>
            </fieldset>
          </Card>

          <Card className="rounded-2xl" title={<T icon={Landmark}>Bank aur emergency</T>}>
            <fieldset disabled={hrLocked} className="grid gap-3 sm:grid-cols-2">
              <Input label="Bank" value={hr.bankName} onChange={(e) => set('bankName', e.target.value)} placeholder="Meezan, JazzCash…" hint="Tankhwah transfer ke liye" />
              <Input label="Account #" value={hr.accountNumber} onChange={(e) => set('accountNumber', e.target.value)} className="font-mono" hint="Marzi hai" />
              <Input label="IBAN" value={hr.iban} onChange={(e) => set('iban', e.target.value.toUpperCase())} placeholder="PK36…" className="font-mono" wrapperClassName="sm:col-span-2" hint="24 harf, PK se shuru" />
              <Input label="Emergency me kis ko" value={hr.emergencyName} onChange={(e) => set('emergencyName', e.target.value)} placeholder="Walid / bhai" hint="Haadse me kis ko batayein" />
              <Input label="Un ka phone" inputMode="tel" value={hr.emergencyPhone} onChange={(e) => set('emergencyPhone', e.target.value)} hint="Marzi hai" />
              <Input label="Rishta" value={hr.emergencyRelation} onChange={(e) => set('emergencyRelation', e.target.value)} placeholder="Walid" wrapperClassName="sm:col-span-2" hint="Marzi hai" />
            </fieldset>
          </Card>

          <Card className="rounded-2xl" title="Note">
            <fieldset disabled={hrLocked}>
              <Textarea value={hr.notes} onChange={(e) => set('notes', e.target.value)} rows={3} maxLength={1000} placeholder="Maslan: shaam ki shift, guarantee kis ne di" hint="Sirf andar ke liye — kahin chhapta nahi" />
            </fieldset>
          </Card>
        </div>
      </div>

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2 rounded-2xl bg-white/95 p-3 shadow-lg ring-1 ring-slate-200 backdrop-blur">
        {problems.length > 0 && (hr.fullName || hr.phone || editing)
          ? <p className="mr-auto flex items-center gap-1.5 text-[0.8125rem] text-amber-800"><AlertTriangle className="h-4 w-4" />{problems[0]}</p>
          : <p className="mr-auto text-[0.8125rem] text-slate-500">{!editing && giveLogin ? `Login (${ROLES[draft.role].label}) aur HR record dono banenge` : !editing ? 'Sirf HR record banega — login baad me bhi de sakte hain' : 'Save karein'}</p>}
        <Button variant="secondary" onClick={() => navigate(-1)}>Rehne dein</Button>
        <Button onClick={submit} loading={save.isPending} disabled={hrLocked && !editsLogin}>{editing ? 'Save karein' : giveLogin ? 'Banda aur login banayein' : 'Banda jorein'}</Button>
      </div>

      {slip && <LoginSlipModal slip={slip.slip} phone={slip.phone} title="Login ban gaya" onClose={() => navigate(slip.next)} />}
    </PageShell>
  );
}

const T = ({ icon: Icon, children }: { icon: typeof UserRound; children: string }) => <span className="inline-flex items-center gap-2"><Icon className="h-4 w-4 text-brand-600" />{children}</span>;
