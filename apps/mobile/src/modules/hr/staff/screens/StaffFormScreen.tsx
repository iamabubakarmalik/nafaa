/**
 * Add or edit a person. One form for the HR record (name, job, branch,
 * salary, ID, bank, emergency contact) and, for the owner, the app login:
 * a new person can be given a login with role and permissions in the same
 * step, and an existing login's email, phone, role and branch are edited
 * here. Permissions of an existing login are edited on the profile.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { AlertTriangle } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { useAuthStore } from '@/core/auth/store';
import { shopParam } from '@/core/auth/shopScope';
import { useShops } from '@/core/auth/useShops';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { onlineNeededText } from '@/core/offline';
import { PERMISSIONS, usePermission } from '@/core/permissions';
import { Card, Chip, ChipGroup, DatePicker, FormSection, FormTemplate, Icon, Input, ListGroup, ListRow, MoneyInput, Row, Select, Switch, Text, TextArea, toast, useTheme } from '@/design';
import { peopleApi, type SalaryType, type StaffGender, type StaffPayload } from '../api/people';
import { LoginFields, loginProblem, newLoginDraft, type LoginDraft } from '../components/LoginFields';
import { LoginSlipSheet, type LoginSlip } from '../components/LoginSlipSheet';
import { PhotoPick } from '../components/PhotoPick';
import { useRefreshPeople, useRoleDefaults } from '../lib/hooks';
import { ASSIGNABLE, PEOPLE_KEY, ROLES, SALARY_TYPES, cleanPhone, roleLabel, salaryTypeOf, type AssignableRole } from '../lib/meta';

const JOBS = ['Cashier', 'Salesman', 'Manager', 'Helper', 'Store keeper', 'Rider', 'Chef', 'Guard'];

interface Hr {
  fullName: string; fatherName: string; gender: '' | StaffGender; dateOfBirth: Date | null; cnic: string; phone: string; altPhone: string; email: string; address: string; city: string;
  designation: string; department: string; joinDate: Date; shopId: string; salaryType: SalaryType; baseSalary: number | null; workingHoursPerDay: string; workingDaysPerMonth: string;
  bankName: string; accountNumber: string; iban: string; emergencyName: string; emergencyPhone: string; emergencyRelation: string;
  avatarUrl: string; cnicFrontUrl: string; cnicBackUrl: string; notes: string;
}
const EMPTY: Hr = {
  fullName: '', fatherName: '', gender: '', dateOfBirth: null, cnic: '', phone: '', altPhone: '', email: '', address: '', city: '',
  designation: '', department: '', joinDate: new Date(), shopId: '', salaryType: 'MONTHLY', baseSalary: null, workingHoursPerDay: '8', workingDaysPerMonth: '26',
  bankName: '', accountNumber: '', iban: '', emergencyName: '', emergencyPhone: '', emergencyRelation: '', avatarUrl: '', cnicFrontUrl: '', cnicBackUrl: '', notes: '',
};
const key = (d: Date) => d.toISOString().slice(0, 10);
const toDate = (v?: string | null) => (v ? new Date(`${v.slice(0, 10)}T12:00:00`) : null);

/** HR payload with empty optional fields left out (the API rejects an empty email or date). */
function payload(h: Hr): StaffPayload {
  const opt = (v: string) => (v.trim() ? v.trim() : undefined);
  return {
    fullName: h.fullName.trim(), phone: h.phone.trim(), designation: h.designation.trim(), joinDate: key(h.joinDate),
    salaryType: h.salaryType, baseSalary: h.baseSalary ?? 0,
    workingHoursPerDay: Number(h.workingHoursPerDay) || 8, workingDaysPerMonth: Number(h.workingDaysPerMonth) || 26,
    fatherName: opt(h.fatherName), gender: h.gender || undefined, dateOfBirth: h.dateOfBirth ? key(h.dateOfBirth) : undefined, cnic: opt(h.cnic), altPhone: opt(h.altPhone),
    email: opt(h.email), address: opt(h.address), city: opt(h.city), department: opt(h.department), shopId: opt(h.shopId),
    bankName: opt(h.bankName), accountNumber: opt(h.accountNumber), iban: opt(h.iban), emergencyName: opt(h.emergencyName),
    emergencyPhone: opt(h.emergencyPhone), emergencyRelation: opt(h.emergencyRelation), avatarUrl: opt(h.avatarUrl),
    cnicFrontUrl: opt(h.cnicFrontUrl), cnicBackUrl: opt(h.cnicBackUrl), notes: opt(h.notes),
  };
}

export function StaffFormScreen({ mode }: { mode?: 'new' }) {
  const th = useTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = mode === 'new' ? undefined : params.id;
  const editing = !!id;
  const online = useOnlineStatus();
  const refresh = useRefreshPeople();
  const can = usePermission();
  const isOwner = useAuthStore((s) => s.user?.role === 'OWNER' || s.user?.role === 'SUPER_ADMIN');
  const activeShop = shopParam(useAuthStore((s) => s.currentShopId));
  const canManage = can(PERMISSIONS.STAFF_MANAGE);
  const defaults = useRoleDefaults();
  const shops = (useShops().data ?? []).filter((s) => s.isActive);

  const profileQ = useQuery({ queryKey: [PEOPLE_KEY, 'profile', id], queryFn: () => peopleApi.profile(id!), enabled: editing });
  const prof = profileQ.data;
  const staff = prof?.staff ?? null;
  const login = prof?.login ?? null;

  const [hr, setHr] = useState<Hr>(EMPTY);
  const [baseline, setBaseline] = useState(JSON.stringify(EMPTY));
  const [giveLogin, setGiveLogin] = useState(false);
  const [draft, setDraft] = useState<LoginDraft>(() => newLoginDraft(defaults, activeShop ?? ''));
  const [loginEdit, setLoginEdit] = useState<{ email: string; role: AssignableRole; shopId: string }>({ email: '', role: 'CASHIER', shopId: '' });
  const [slip, setSlip] = useState<{ slip: LoginSlip; phone: string; next: string } | null>(null);
  const [tried, setTried] = useState(false);
  const set = <K extends keyof Hr>(k: K, v: Hr[K]) => setHr((h) => ({ ...h, [k]: v }));

  // Prefill from the profile once it loads.
  useEffect(() => {
    if (!prof) return;
    const s = prof.staff;
    const p = prof.person;
    const next: Hr = {
      ...EMPTY,
      fullName: s?.fullName ?? p.fullName, fatherName: s?.fatherName ?? '', gender: s?.gender ?? '', dateOfBirth: toDate(s?.dateOfBirth), cnic: s?.cnic ?? '',
      phone: (s?.phone && s.phone !== '—' ? s.phone : cleanPhone(p.phone)) ?? '', altPhone: s?.altPhone ?? '', email: s?.email ?? p.email ?? '',
      address: s?.address ?? '', city: s?.city ?? '', designation: s?.designation ?? (p.role && ROLES[p.role as AssignableRole] ? t(ROLES[p.role as AssignableRole].label) : ''), department: s?.department ?? '',
      joinDate: toDate(s?.joinDate) ?? new Date(), shopId: s?.shopId ?? p.shop?.id ?? '',
      salaryType: s?.salaryType ?? 'MONTHLY', baseSalary: s?.baseSalary || null, workingHoursPerDay: String(s?.workingHoursPerDay ?? 8), workingDaysPerMonth: String(s?.workingDaysPerMonth ?? 26),
      bankName: s?.bankName ?? '', accountNumber: s?.accountNumber ?? '', iban: s?.iban ?? '', emergencyName: s?.emergencyName ?? '', emergencyPhone: s?.emergencyPhone ?? '',
      emergencyRelation: s?.emergencyRelation ?? '', avatarUrl: s?.avatarUrl ?? p.avatarUrl ?? '', cnicFrontUrl: s?.cnicFrontUrl ?? '', cnicBackUrl: s?.cnicBackUrl ?? '', notes: s?.notes ?? '',
    };
    setHr(next);
    setBaseline(JSON.stringify(next));
    if (prof.login) setLoginEdit({ email: prof.login.email, role: (ASSIGNABLE.includes(prof.login.role as AssignableRole) ? prof.login.role : 'CASHIER') as AssignableRole, shopId: prof.login.shop?.id ?? '' });
  }, [prof]);
  const dirty = JSON.stringify(hr) !== baseline || (!editing && giveLogin);

  const editsLogin = editing && !!login && isOwner && login.role !== 'OWNER';
  const roleChanged = editsLogin && loginEdit.role !== login!.role;
  const problems = useMemo(() => {
    const out: string[] = [];
    if (!hr.fullName.trim()) out.push(t('Naam likhein'));
    if (!hr.phone.trim()) out.push(t('Phone number likhein'));
    if (!hr.designation.trim()) out.push(t('Kaam (designation) likhein'));
    if (hr.email.trim() && !/^\S+@\S+\.\S+$/.test(hr.email.trim())) out.push(t('Email theek nahi'));
    if (hr.cnic.trim() && hr.cnic.replace(/\D/g, '').length !== 13) out.push(t('CNIC 13 hindsay ka hota hai'));
    if (!editing && giveLogin) { const lp = loginProblem(draft); if (lp) out.push(lp); }
    if (editsLogin && (loginEdit.role === 'MANAGER' || loginEdit.role === 'CASHIER') && !loginEdit.shopId) out.push(t('{{label}} ke liye branch chunein', { label: roleLabel(loginEdit.role) }));
    if (editsLogin && !/^\S+@\S+\.\S+$/.test(loginEdit.email.trim())) out.push(t('Login email theek nahi'));
    return out;
  }, [hr, editing, giveLogin, draft, editsLogin, loginEdit]);

  const save = useMutation({
    mutationFn: async () => {
      const body = payload(hr);
      if (!editing && giveLogin) {
        const res = await peopleApi.invite({
          fullName: body.fullName, email: draft.email.trim(), phone: body.phone || undefined, password: draft.password, role: draft.role,
          shopId: draft.shopId || undefined, permissions: draft.permissions, designation: body.designation, salaryType: body.salaryType,
          baseSalary: body.baseSalary, joinDate: body.joinDate, sendEmail: draft.sendEmail,
        });
        let detailsSaved = true;
        try { await peopleApi.updateStaff(res.staffId, { ...body, shopId: draft.shopId || body.shopId }); } catch { detailsSaved = false; }
        return { kind: 'invite' as const, res, detailsSaved };
      }
      if (!editing) return { kind: 'hr' as const, staff: await peopleApi.createStaff(body) };
      // Edit: the HR record (made now if the login had none), then the login.
      let staffId = staff?.id;
      if (!staffId && prof?.person.userId && canManage) {
        const linked = await peopleApi.linkUser(prof.person.userId, { designation: body.designation, salaryType: body.salaryType, baseSalary: body.baseSalary });
        staffId = linked.id;
      }
      if (staffId && canManage) await peopleApi.updateStaff(staffId, body);
      if (editsLogin) {
        await peopleApi.updateLogin(login!.id, { fullName: body.fullName, email: loginEdit.email.trim(), phone: body.phone, role: loginEdit.role, shopId: loginEdit.shopId || null });
      }
      return { kind: 'edit' as const, staffId };
    },
    onSuccess: (r) => {
      refresh();
      setBaseline(JSON.stringify(hr));
      setGiveLogin(false);
      if (r.kind === 'invite') {
        toast.success(r.res.linked === 'matched' ? t('Login ban gaya aur purane HR record se jur gaya') : t('Login aur HR record ban gaye'));
        if (!r.detailsSaved) toast.error(t('Kuch details (CNIC, bank waghera) save nahi hui — profile se dobara bharein'));
        if (draft.sendEmail && !r.res.emailSent) toast.error(t('Email nahi gaya — parchi ya WhatsApp se dein'));
        setSlip({
          slip: { name: r.res.fullName, email: r.res.email, password: draft.password, role: roleLabel(draft.role), branch: shops.find((s) => s.id === draft.shopId)?.name ?? null },
          phone: hr.phone, next: `/staff/${r.res.staffId}`,
        });
        return;
      }
      if (r.kind === 'hr') { toast.success(t('{{fullName}} jur gaya ({{staffNumber}})', { fullName: r.staff.fullName, staffNumber: r.staff.staffNumber })); setTimeout(() => router.replace(`/staff/${r.staff.id}` as never), 0); return; }
      toast.success(roleChanged ? t('Save ho gaya — naye role ke liye banda dobara login karega') : t('Save ho gaya'));
      setTimeout(() => router.back(), 0);
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('Save nahi hua'))),
  });

  const submit = () => {
    setTried(true);
    if (!online) return toast.warning(onlineNeededText('team'));
    if (problems.length) return toast.warning(problems[0]);
    save.mutate();
  };

  const hrLocked = editing && !canManage;
  const st = salaryTypeOf(hr.salaryType);
  const salary = hr.baseSalary ?? 0;
  const days = Number(hr.workingDaysPerMonth) || 26;
  const notFound = editing && !profileQ.isLoading && !prof;
  const err = (cond: boolean, text: string) => (tried && cond ? text : undefined);

  return (
    <FormTemplate title={editing ? t('{{fullName}} — badlein', { fullName: prof?.person.fullName ?? '' }) : t('Naya banda')}
      subtitle={editing ? undefined : t('Naam, kaam aur tankhwah. App chalana hai to login bhi yahin dein.')}
      dirty={dirty} saving={save.isPending} onSave={submit} saveDisabled={notFound || (hrLocked && !editsLogin)}
      saveLabel={editing ? t('Save') : giveLogin ? t('Banda aur login banayein') : t('Banda jorein')}>
      {notFound ? <Text tone="secondary">{t('Yeh banda nahi mila')}</Text> : (
        <>
          {!online && <Card tone="warning"><Text size="sm">{onlineNeededText('team')}</Text></Card>}
          {hrLocked && <Card tone="warning"><Text size="sm">{t('HR record badalne ke liye "Staff sambhalna" ki permission chahiye. Aap sirf dekh sakte hain.')}</Text></Card>}

          <FormSection title={t('Bunyadi details')}>
            <View style={{ alignItems: 'center' }}><PhotoPick purpose="avatar" round label={t('Photo')} value={hr.avatarUrl} onChange={(u) => set('avatarUrl', u)} /></View>
            <Input label={t('Poora naam')} value={hr.fullName} onChangeText={(v) => set('fullName', v)} placeholder={t('Bilal Ahmad')} maxLength={100} autoCapitalize="words" disabled={hrLocked} error={err(!hr.fullName.trim(), t('Naam likhein'))}
              hint={t('Bill, parchi aur tankhwah par yahi naam aata hai')} />
            <Input label={t('Walid ka naam')} labelHint={t('(optional)')} value={hr.fatherName} onChangeText={(v) => set('fatherName', v)} autoCapitalize="words" disabled={hrLocked} />
            <Input label={t('Phone')} value={hr.phone} onChangeText={(v) => set('phone', v)} keyboardType="phone-pad" placeholder="03001234567" disabled={hrLocked} error={err(!hr.phone.trim(), t('Phone number likhein'))} />
            <Input label={t('Doosra phone')} labelHint={t('(optional)')} value={hr.altPhone} onChangeText={(v) => set('altPhone', v)} keyboardType="phone-pad" disabled={hrLocked} />
            <Input label={t('Email')} labelHint={t('(optional)')} value={hr.email} onChangeText={(v) => set('email', v)} keyboardType="email-address" autoCapitalize="none" disabled={hrLocked}
              error={err(!!hr.email.trim() && !/^\S+@\S+\.\S+$/.test(hr.email.trim()), t('Email theek nahi'))} hint={giveLogin ? t('HR record ka email. Login ka email neeche alag hai.') : undefined} />
            <Input label={t('CNIC')} labelHint={t('(optional)')} value={hr.cnic} onChangeText={(v) => set('cnic', v)} keyboardType="number-pad" placeholder="35202-1234567-1" disabled={hrLocked}
              error={err(!!hr.cnic.trim() && hr.cnic.replace(/\D/g, '').length !== 13, t('CNIC 13 hindsay ka hota hai'))} />
            <View style={{ gap: th.space(2) }}>
              <Text size="sm" weight="medium" tone="secondary">{t('Jins')}</Text>
              <ChipGroup value={hr.gender} onChange={(v) => set('gender', (v === hr.gender ? '' : v) as Hr['gender'])}
                options={[{ value: 'MALE', label: t('Mard') }, { value: 'FEMALE', label: t('Aurat') }, { value: 'OTHER', label: t('Doosra') }]} />
            </View>
            <DatePicker label={t('Paidaish ki date')} value={hr.dateOfBirth} onChange={(d) => set('dateOfBirth', d)} maximumDate={new Date()} disabled={hrLocked} />
            <Input label={t('Pata')} labelHint={t('(optional)')} value={hr.address} onChangeText={(v) => set('address', v)} placeholder={t('Gali, mohalla')} disabled={hrLocked} />
            <Input label={t('Shehar')} labelHint={t('(optional)')} value={hr.city} onChangeText={(v) => set('city', v)} placeholder={t('Lahore')} autoCapitalize="words" disabled={hrLocked} />
          </FormSection>

          <FormSection title={t('Kaam')}>
            <Input label={t('Kaam (designation)')} value={hr.designation} onChangeText={(v) => set('designation', v)} placeholder={t('Cashier')} maxLength={80} disabled={hrLocked}
              error={err(!hr.designation.trim(), t('Kaam (designation) likhein'))} hint={t('Dukaan me kya karta hai. Yeh role nahi — role login ke saath hai.')} />
            <Row gap={2} wrap>{JOBS.map((j) => <Chip key={j} label={j} selected={hr.designation === j} onPress={() => !hrLocked && set('designation', j)} />)}</Row>
            <Input label={t('Shoba')} labelHint={t('(optional)')} value={hr.department} onChangeText={(v) => set('department', v)} placeholder={t('Sales')} disabled={hrLocked} />
            <DatePicker label={t('Joining')} value={hr.joinDate} onChange={(d) => set('joinDate', d)} maximumDate={new Date()} disabled={hrLocked} hint={t('Kab se kaam par hai')} />
            <Select label={t('Branch')} value={hr.shopId} onChange={(v) => set('shopId', v)} disabled={hrLocked}
              options={[{ value: '', label: t('Sab branches') }, ...shops.map((s) => ({ value: s.id, label: s.name }))]}
              hint={giveLogin || login ? t('HR ki branch. Login ki branch alag set hoti hai.') : t('Kahan kaam karta hai')} />
          </FormSection>

          <FormSection title={t('Tankhwah')}>
            <Select label={t('Tankhwah ki type')} value={hr.salaryType} onChange={(v) => set('salaryType', v as SalaryType)} disabled={hrLocked}
              options={SALARY_TYPES.map((s) => ({ value: s.id, label: t(s.label) }))}
              hint={hr.salaryType === 'COMMISSION' ? t('Sirf commission — rules Commission ke safhe par') : hr.salaryType === 'HYBRID' ? t('Pakki tankhwah ke upar commission') : t('Haazri ke hisaab se banti hai')} />
            {hr.salaryType !== 'COMMISSION' && (
              <MoneyInput label={st.unit ? `${t('Amount')} — ${st.unit}` : t('Amount')} value={hr.baseSalary} onChangeValue={(v) => set('baseSalary', v)} disabled={hrLocked} />
            )}
            <Input label={t('Roz ke ghante')} value={hr.workingHoursPerDay} onChangeText={(v) => set('workingHoursPerDay', v.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" disabled={hrLocked} hint={t('Is se zyada kaam overtime ginta hai')} />
            <Input label={t('Mahine ke kaam ke din')} value={hr.workingDaysPerMonth} onChangeText={(v) => set('workingDaysPerMonth', v.replace(/\D/g, ''))} keyboardType="number-pad" disabled={hrLocked}
              hint={hr.salaryType === 'MONTHLY' && salary > 0 ? t('Ek din = {{value}}', { value: formatMoney(salary / days) }) : t('Aam tor par 26')} />
          </FormSection>

          {!editing && (
            <FormSection title={t('App ka login')}>
              {!isOwner ? <Text size="sm" tone="muted">{t('Login sirf malik bana sakta hai. Aap HR record bana dein — malik baad me profile se login de sakta hai.')}</Text> : (
                <>
                  <Switch value={giveLogin} onChange={setGiveLogin} label={t('Is bande ko login dein')} description={t('POS chalana, sale karna ya reports dekhna hai to on karein. Helper, driver ko login ki zaroorat nahi.')} />
                  {giveLogin && <LoginFields value={draft} onChange={setDraft} shops={shops} />}
                </>
              )}
            </FormSection>
          )}

          {editing && login && (
            <FormSection title={t('Login')}>
              <Text size="xs" tone="muted">{editsLogin ? t('Permissions profile ke "Permissions" tab me badlein') : login.role === 'OWNER' ? t('Malik ka login Profile se badalta hai') : t('Login sirf malik badal sakta hai')}</Text>
              <Input label={t('Login email')} value={loginEdit.email} onChangeText={(v) => setLoginEdit((l) => ({ ...l, email: v }))} keyboardType="email-address" autoCapitalize="none" disabled={!editsLogin} hint={t('Isi se login karta hai')} />
              {login.role !== 'OWNER' && (
                <>
                  <View style={{ gap: th.space(2) }}>
                    <Text size="sm" weight="medium" tone="secondary">{t('Role')}</Text>
                    <ListGroup>
                      {ASSIGNABLE.map((r) => (
                        <ListRow key={r} icon={ROLES[r].icon} iconTone={ROLES[r].tone} title={roleLabel(r)} subtitle={t(ROLES[r].hint)} selected={loginEdit.role === r} disabled={!editsLogin}
                          onPress={() => setLoginEdit((l) => ({ ...l, role: r }))} />
                      ))}
                    </ListGroup>
                    <Text size="xs" tone="muted">{roleChanged ? t('Permissions wohi rahengi. Naye role ki permission chahiye to profile ke Permissions tab me "role wali" dabayein.') : t('Role badalne se banda sab devices se logout ho jata hai.')}</Text>
                  </View>
                  <Select label={t('Login ki branch')} value={loginEdit.shopId} onChange={(v) => setLoginEdit((l) => ({ ...l, shopId: v }))} disabled={!editsLogin}
                    options={[...(loginEdit.role === 'STAFF' ? [{ value: '', label: t('Sab branches') }] : [{ value: '', label: t('— Chunein —') }]), ...shops.map((s) => ({ value: s.id, label: s.name }))]}
                    hint={t('Sirf isi branch ka data dekhega aur isi me sale karega')} />
                </>
              )}
              {roleChanged && (
                <Card tone="warning"><Row gap={2} align="start"><Icon icon={AlertTriangle} size={16} tone="warning" /><Text size="xs" style={{ flex: 1 }}>{t('Role badalne par banda sab devices se logout hoga aur dobara login karega.')}</Text></Row></Card>
              )}
            </FormSection>
          )}

          <FormSection title={t('CNIC ki photo')}>
            <Text size="xs" tone="muted">{t('Marzi hai — kaghaz ke record ke liye')}</Text>
            <Row gap={4} wrap>
              <PhotoPick size={110} label={t('Saamne')} value={hr.cnicFrontUrl} onChange={(u) => !hrLocked && set('cnicFrontUrl', u)} />
              <PhotoPick size={110} label={t('Peeche')} value={hr.cnicBackUrl} onChange={(u) => !hrLocked && set('cnicBackUrl', u)} />
            </Row>
          </FormSection>

          <FormSection title={t('Bank aur emergency')}>
            <Input label={t('Bank')} value={hr.bankName} onChangeText={(v) => set('bankName', v)} placeholder={t('Meezan, JazzCash…')} disabled={hrLocked} hint={t('Tankhwah transfer ke liye')} />
            <Input label={t('Account #')} value={hr.accountNumber} onChangeText={(v) => set('accountNumber', v)} ltr disabled={hrLocked} />
            <Input label={t('IBAN')} value={hr.iban} onChangeText={(v) => set('iban', v.toUpperCase())} autoCapitalize="characters" placeholder="PK36…" ltr disabled={hrLocked} />
            <Input label={t('Emergency me kis ko')} value={hr.emergencyName} onChangeText={(v) => set('emergencyName', v)} placeholder={t('Walid / bhai')} disabled={hrLocked} />
            <Input label={t('Un ka phone')} value={hr.emergencyPhone} onChangeText={(v) => set('emergencyPhone', v)} keyboardType="phone-pad" disabled={hrLocked} />
            <Input label={t('Rishta')} value={hr.emergencyRelation} onChangeText={(v) => set('emergencyRelation', v)} placeholder={t('Walid')} disabled={hrLocked} />
          </FormSection>

          <FormSection title={t('Note')}>
            <TextArea value={hr.notes} onChangeText={(v) => set('notes', v)} numberOfLines={3} maxLength={1000} placeholder={t('Maslan: shaam ki shift, guarantee kis ne di')} />
            <Text size="xs" tone="muted">{t('Sirf andar ke liye — bande ko nazar nahi aata')}</Text>
          </FormSection>

          {slip && <LoginSlipSheet slip={slip.slip} phone={slip.phone} title={t('Login ban gaya')} onClose={() => { const next = slip.next; setSlip(null); router.replace(next as never); }} />}
        </>
      )}
    </FormTemplate>
  );
}
