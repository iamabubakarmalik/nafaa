/**
 * New member or edit a member. One form for registration (photo, name,
 * phone, CNIC, emergency contact, health) and, for a new member, joining:
 * the plan, admission fee and what was paid now. The member's khata is a
 * customer record opened (or found by phone) at the same time; the joining
 * fee is billed in Sales and any unpaid part goes on that khata.
 *
 * Keys: Ctrl+S save · Esc back · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, ArrowLeft, CreditCard, GraduationCap, HeartPulse, IdCard, Phone, ShieldAlert, Target, UserRound, Wallet } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { Button, Card, Input, Kbd, PageShell, Select, Skeleton, Switch, Textarea } from '@/design-system/components';
import { AvatarUpload } from '@core/components/uploads';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen } from '@core/lib/shortcuts';
import { PaymentMethodPicker } from '@modules/pos/components';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { gymMembersApi, type Goal, type MemberInput } from '../api/members.api';
import { membershipsApi } from '../api/memberships.api';
import { trainersApi } from '../api/trainers.api';
import { usePlans } from '../components/MembershipModals';
import { GOALS, GYM_KEYS, MONEY_KEYS, apiError, num, opt, todayInput } from '../lib/meta';
import { useGymCan } from '../lib/permissions';

interface Form {
  name: string; phone: string; cnic: string; email: string; address: string; gender: string; dateOfBirth: string; bloodGroup: string;
  emergencyContactName: string; emergencyContactPhone: string; emergencyContactRelation: string;
  primaryGoal: Goal; fitnessLevel: string; heightCm: string; currentWeightKg: string; targetWeightKg: string;
  medicalConditions: string; injuries: string; medications: string; doctorClearance: boolean;
  preferredWorkoutTime: string; preferredTrainerId: string; memberNumber: string; rfidCard: string; photoUrl: string; notes: string;
}
const EMPTY: Form = {
  name: '', phone: '', cnic: '', email: '', address: '', gender: '', dateOfBirth: '', bloodGroup: '',
  emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelation: '',
  primaryGoal: 'GENERAL_FITNESS', fitnessLevel: '', heightCm: '', currentWeightKg: '', targetWeightKg: '',
  medicalConditions: '', injuries: '', medications: '', doctorClearance: false,
  preferredWorkoutTime: '', preferredTrainerId: '', memberNumber: '', rfidCard: '', photoUrl: '', notes: '',
};
const BLOOD = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const TIMES = [{ value: '', label: '—' }, { value: 'MORNING', label: 'Subah' }, { value: 'AFTERNOON', label: 'Dopahar' }, { value: 'EVENING', label: 'Shaam' }, { value: 'NIGHT', label: 'Raat' }];
const LEVELS = [{ value: '', label: '—' }, { value: 'BEGINNER', label: 'Naya' }, { value: 'INTERMEDIATE', label: 'Kuch tajurba' }, { value: 'ADVANCED', label: 'Purana' }];
const PHONE = /^[0-9+\-\s]{7,20}$/;

function payload(f: Form): MemberInput {
  const n = (v: string) => (v.trim() ? Number(v) : undefined);
  return {
    name: f.name.trim(), phone: f.phone.trim(), cnic: f.cnic.trim(), email: f.email.trim(), address: f.address.trim(),
    gender: opt(f.gender), dateOfBirth: opt(f.dateOfBirth), bloodGroup: opt(f.bloodGroup),
    emergencyContactName: opt(f.emergencyContactName), emergencyContactPhone: opt(f.emergencyContactPhone), emergencyContactRelation: opt(f.emergencyContactRelation),
    primaryGoal: f.primaryGoal, fitnessLevel: opt(f.fitnessLevel), heightCm: n(f.heightCm), currentWeightKg: n(f.currentWeightKg), targetWeightKg: n(f.targetWeightKg),
    medicalConditions: opt(f.medicalConditions), injuries: opt(f.injuries), medications: opt(f.medications), doctorClearance: f.doctorClearance,
    preferredWorkoutTime: opt(f.preferredWorkoutTime), preferredTrainerId: opt(f.preferredTrainerId), memberNumber: opt(f.memberNumber),
    rfidCard: f.rfidCard.trim(), photoUrl: opt(f.photoUrl), notes: opt(f.notes),
  };
}

export default function MemberFormPage() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const can = useGymCan();
  const guide = usePageGuide();
  const lock = useRef(false);
  const memberQ = useQuery({ queryKey: [GYM_KEYS.members, 'one', id], queryFn: () => gymMembersApi.getOne(id!), enabled: editing });
  const trainersQ = useQuery({ queryKey: [GYM_KEYS.trainers, 'list'], queryFn: () => trainersApi.list(), staleTime: 60_000 });
  const plansQ = usePlans();
  const plans = plansQ.data ?? [];
  const [f, setF] = useState<Form>(EMPTY);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));

  // Joining (new member only).
  const [join, setJoin] = useState(true);
  const [planId, setPlanId] = useState('');
  const plan = plans.find((p) => p.id === (planId || plans[0]?.id));
  const [start, setStart] = useState(todayInput());
  const [waive, setWaive] = useState(false);
  const [paid, setPaid] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const total = plan ? plan.price + (waive ? 0 : plan.registrationFee) + plan.securityDeposit : 0;
  const amount = paid === '' ? total : Number(paid) || 0;

  useEffect(() => {
    const m = memberQ.data;
    if (!m) return;
    const s = (v?: string | number | null) => (v == null ? '' : String(v));
    setF({
      name: m.customer?.name ?? '', phone: s(m.customer?.phone), cnic: s(m.customer?.cnic), email: s(m.customer?.email), address: s(m.customer?.address),
      gender: s(m.gender), dateOfBirth: m.dateOfBirth ? m.dateOfBirth.slice(0, 10) : '', bloodGroup: s(m.bloodGroup),
      emergencyContactName: s(m.emergencyContactName), emergencyContactPhone: s(m.emergencyContactPhone), emergencyContactRelation: s(m.emergencyContactRelation),
      primaryGoal: m.primaryGoal, fitnessLevel: s(m.fitnessLevel), heightCm: s(m.heightCm), currentWeightKg: s(m.currentWeightKg), targetWeightKg: s(m.targetWeightKg),
      medicalConditions: s(m.medicalConditions), injuries: s(m.injuries), medications: s(m.medications), doctorClearance: m.doctorClearance,
      preferredWorkoutTime: s(m.preferredWorkoutTime), preferredTrainerId: s(m.preferredTrainerId), memberNumber: m.memberNumber, rfidCard: s(m.rfidCard), photoUrl: s(m.photoUrl), notes: s(m.notes),
    });
  }, [memberQ.data]);

  const problems = useMemo(() => {
    const out: string[] = [];
    if (!f.name.trim()) out.push('Member ka naam likhein');
    if (!f.phone.trim()) out.push('Phone number likhein');
    else if (!PHONE.test(f.phone.trim())) out.push('Phone number sahi likhein (03001234567)');
    if (f.cnic.trim() && f.cnic.replace(/\D/g, '').length !== 13) out.push('CNIC me 13 number hote hain');
    if (f.emergencyContactPhone.trim() && !PHONE.test(f.emergencyContactPhone.trim())) out.push('Emergency phone sahi likhein');
    if (f.email.trim() && !/^\S+@\S+\.\S+$/.test(f.email.trim())) out.push('Email theek nahi');
    if (!editing && join && can.bill) {
      if (!plan) out.push('Plan chunein ya "Abhi plan nahi" karein');
      else if (amount > total) out.push(`Zyada se zyada ${formatPKR(total)}`);
    }
    return out;
  }, [f, editing, join, can.bill, plan, amount, total]);

  const save = useMutation({
    mutationFn: async () => {
      if (problems.length) throw new Error(problems[0]);
      if (editing) return { member: await gymMembersApi.update(id!, payload(f)), sold: null };
      const member = await gymMembersApi.create(payload(f));
      if (!join || !can.bill || !plan) return { member, sold: null };
      try {
        const sold = await membershipsApi.subscribe({ memberId: member.id, planId: plan.id, startDate: start, waiveAdmission: waive, paidAmount: amount, paymentMethod: method });
        return { member, sold };
      } catch (e) {
        toast.error(`Member ban gaya, magar membership nahi bani: ${apiError(e, 'dobara koshish karein')}`);
        return { member, sold: null };
      }
    },
    onSuccess: ({ member, sold }) => {
      toast.success(sold ? `${member.memberNumber} ban gaya · ${sold.membershipNumber}` : editing ? 'Save ho gaya' : `${member.memberNumber} ban gaya`);
      [...MONEY_KEYS, GYM_KEYS.members].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      navigate(`/gym/members/${member.id}`, { replace: true });
    },
    onError: (e) => toast.error(apiError(e, 'Save nahi hua')),
    onSettled: () => { lock.current = false; },
  });
  const submit = () => { if (lock.current || save.isPending) return; lock.current = true; save.mutate(); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S' || e.key === 'Enter')) { e.preventDefault(); submit(); return; }
      if (isDialogOpen()) return;
      if (e.key === 'Escape') navigate(-1);
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement)?.tagName ?? '');
      if (!typing && (e.key === 'g' || e.key === 'G')) guide.open();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (editing && memberQ.isLoading) return <PageShell><Skeleton className="h-24 rounded-3xl" /><div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-96 rounded-2xl" /><Skeleton className="h-96 rounded-2xl" /></div></PageShell>;
  if (editing && !memberQ.data) return <PageShell><div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80"><p className="font-semibold text-slate-900">Member nahi mila</p><Button className="mt-3" variant="secondary" onClick={() => navigate('/gym/members')}>Members par wapas</Button></div></PageShell>;

  const trainers = trainersQ.data ?? [];
  return (
    <PageShell>
      <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-4 text-white shadow-lg sm:p-5">
        <button type="button" onClick={() => navigate(-1)} aria-label="Wapas (Esc)" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 hover:bg-white/25"><ArrowLeft className="h-4 w-4" /></button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">{editing ? `${memberQ.data?.customer?.name ?? 'Member'} — badlein` : 'Naya member'}</h1>
          <p className="text-[0.8125rem] text-white/75">{editing ? 'Jo badalna hai badlein — baqi waisa hi rahega' : 'Naam, phone aur plan kaafi hai. Baqi baad me bhi bhar sakte hain.'}</p>
        </div>
        <span className="hidden items-center gap-1.5 text-[0.75rem] text-white/70 sm:inline-flex"><Kbd>Ctrl</Kbd>+<Kbd>S</Kbd> save · <Kbd>G</Kbd> guide</span>
        <button type="button" onClick={guide.open} aria-label="Guide" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 hover:bg-white/25"><GraduationCap className="h-4 w-4" /></button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <Card className="rounded-2xl" title={<T icon={UserRound}>Member</T>}>
            <div className="space-y-4">
              <div className="flex flex-wrap items-start gap-4">
                <AvatarUpload value={f.photoUrl || null} onChange={(u) => set('photoUrl', u ?? '')} purpose="avatar" size="md" fallbackText={f.name || 'M'} />
                <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
                  <Input label="Poora naam" required value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Ali Raza" maxLength={120} hint="Card, bill aur khate par yahi naam" />
                  <Input label="Phone" required inputMode="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="03001234567" leftIcon={<Phone className="h-4 w-4" />} hint="WhatsApp yaad dihani isi par. Isi phone ka khata pehle se ho to wahi jurta hai." />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="CNIC" inputMode="numeric" value={f.cnic} onChange={(e) => set('cnic', e.target.value)} placeholder="35202-1234567-1" hint="13 number. Marzi hai magar zaroori record" />
                <Select label="Jins" value={f.gender} onChange={(e) => set('gender', e.target.value)} options={[{ value: '', label: '—' }, { value: 'MALE', label: 'Mard' }, { value: 'FEMALE', label: 'Aurat' }]} hint="Ladies timing ke liye" />
                <Input label="Paidaish ki date" type="date" value={f.dateOfBirth} max={todayInput()} onChange={(e) => set('dateOfBirth', e.target.value)} hint="Marzi hai — birthday wish ke liye" />
                <Select label="Blood group" value={f.bloodGroup} onChange={(e) => set('bloodGroup', e.target.value)} options={[{ value: '', label: '—' }, ...BLOOD.map((b) => ({ value: b, label: b }))]} hint="Haadse me kaam aata hai" />
                <Input label="Email" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} hint="Marzi hai" />
                <Input label="Pata" value={f.address} onChange={(e) => set('address', e.target.value)} placeholder="Gali, mohalla" hint="Marzi hai" />
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl" title={<T icon={ShieldAlert}>Emergency contact</T>} description="Training me chot ya tabiyat kharab ho to kis ko call karein">
            <div className="grid gap-3 sm:grid-cols-3">
              <Input label="Naam" value={f.emergencyContactName} onChange={(e) => set('emergencyContactName', e.target.value)} placeholder="Walid / bhai" />
              <Input label="Phone" inputMode="tel" value={f.emergencyContactPhone} onChange={(e) => set('emergencyContactPhone', e.target.value)} placeholder="03001234567" />
              <Input label="Rishta" value={f.emergencyContactRelation} onChange={(e) => set('emergencyContactRelation', e.target.value)} placeholder="Walid" />
            </div>
          </Card>

          <Card className="rounded-2xl" title={<T icon={HeartPulse}>Sehat</T>} description="Trainer ko pata ho ke kya nahi karwana">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Bimari" value={f.medicalConditions} onChange={(e) => set('medicalConditions', e.target.value)} placeholder="BP, sugar, dama" hint="Marzi hai" />
              <Input label="Chot" value={f.injuries} onChange={(e) => set('injuries', e.target.value)} placeholder="Ghutna, kamar" hint="Marzi hai" />
              <Input label="Dawai" value={f.medications} onChange={(e) => set('medications', e.target.value)} hint="Marzi hai" />
              <div className="flex items-end"><Switch checked={f.doctorClearance} onChange={(e) => set('doctorClearance', e.target.checked)} label="Doctor ki ijazat hai" description="Bimari ya chot ho to" /></div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          {!editing && can.bill && (
            <Card className="rounded-2xl" title={<T icon={Wallet}>Joining</T>} description="Fee ka bill Sales me jata hai; jo paisa na mile woh khate me udhaar">
              <div className="space-y-3">
                <Switch checked={join} onChange={(e) => setJoin(e.target.checked)} label="Abhi plan bechein" description="Off karein to sirf profile banegi" />
                {join && (plans.length ? (
                  <>
                    <Select label="Plan" value={plan?.id ?? ''} onChange={(e) => setPlanId(e.target.value)} options={plans.map((p) => ({ value: p.id, label: `${p.name} · ${formatPKR(p.price)} · ${p.durationDays} din` }))} />
                    <Input label="Kab se" type="date" value={start} onChange={(e) => setStart(e.target.value)} hint="Aaj ya aane wali date" />
                    {plan && plan.registrationFee > 0 && <Switch checked={waive} onChange={(e) => setWaive(e.target.checked)} label={`Admission fee (${formatPKR(plan.registrationFee)}) maaf`} description="Offer ya purana member" />}
                    {plan && <p className="rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-700 ring-1 ring-slate-200">Kul {formatPKR(total)}: plan {formatPKR(plan.price)}{plan.registrationFee > 0 && !waive ? ` + admission ${formatPKR(plan.registrationFee)}` : ''}{plan.securityDeposit > 0 ? ` + security ${formatPKR(plan.securityDeposit)}` : ''}</p>}
                    <Input label="Abhi kitna mila" inputMode="decimal" value={paid} placeholder={String(total)} onChange={(e) => setPaid(num(e.target.value))} className="text-right font-semibold tabular-nums"
                      hint={amount < total ? `${formatPKR(total - amount)} khate me udhaar` : 'Khali chhorein to poora'} />
                    {amount > 0 && <PaymentMethodPicker value={method} onChange={setMethod} />}
                  </>
                ) : <p className="text-[0.8125rem] text-amber-800">Abhi koi plan nahi. Pehle Plans me plan banayein, ya profile bana kar baad me bechein.</p>)}
              </div>
            </Card>
          )}

          <Card className="rounded-2xl" title={<T icon={Target}>Maqsad aur training</T>}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select label="Maqsad" value={f.primaryGoal} onChange={(e) => set('primaryGoal', e.target.value as Goal)} options={GOALS} />
              <Select label="Tajurba" value={f.fitnessLevel} onChange={(e) => set('fitnessLevel', e.target.value)} options={LEVELS} />
              <Input label="Qad (cm)" inputMode="decimal" value={f.heightCm} onChange={(e) => set('heightCm', num(e.target.value))} placeholder="175" hint="BMI ke liye" />
              <Input label="Wazan (kg)" inputMode="decimal" value={f.currentWeightKg} onChange={(e) => set('currentWeightKg', num(e.target.value))} placeholder="80" />
              <Input label="Target wazan (kg)" inputMode="decimal" value={f.targetWeightKg} onChange={(e) => set('targetWeightKg', num(e.target.value))} hint="Marzi hai" />
              <Select label="Kis waqt aata hai" value={f.preferredWorkoutTime} onChange={(e) => set('preferredWorkoutTime', e.target.value)} options={TIMES} />
              <Select label="Trainer" wrapperClassName="sm:col-span-2" value={f.preferredTrainerId} onChange={(e) => set('preferredTrainerId', e.target.value)}
                options={[{ value: '', label: '— Koi nahi —' }, ...trainers.map((t) => ({ value: t.id, label: `${t.staff?.fullName ?? t.trainerNumber} · ${t.trainerNumber}` }))]} hint="PT ke liye pehle yahi trainer aata hai" />
            </div>
          </Card>

          <Card className="rounded-2xl" title={<T icon={CreditCard}>Card aur number</T>} description="Check-in par card, QR, member number ya phone — koi bhi chalta hai">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Member number" value={f.memberNumber} onChange={(e) => set('memberNumber', e.target.value.toUpperCase())} placeholder="Khud banega (MEM-00012)" hint={editing ? 'Badal sakte hain, do members ka ek number nahi' : 'Khali chhorein'} />
              <Input label="RFID card" value={f.rfidCard} onChange={(e) => set('rfidCard', e.target.value)} placeholder="Card scan karein" hint="Ek card ek hi member ka" />
            </div>
          </Card>

          <Card className="rounded-2xl" title={<T icon={IdCard}>Note</T>}>
            <Textarea value={f.notes} onChange={(e) => set('notes', e.target.value)} rows={3} maxLength={1000} placeholder="Maslan: sirf shaam ko aata hai" hint="Sirf andar ke liye — kahin chhapta nahi" />
          </Card>
        </div>
      </div>

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2 rounded-2xl bg-white/95 p-3 shadow-lg ring-1 ring-slate-200 backdrop-blur">
        {problems.length > 0 && (f.name || f.phone || editing)
          ? <p className="mr-auto flex items-center gap-1.5 text-[0.8125rem] text-amber-800"><AlertTriangle className="h-4 w-4" />{problems[0]}</p>
          : <p className="mr-auto text-[0.8125rem] text-slate-500">{editing ? 'Save karein' : join && plan && can.bill ? `Member banega aur ${plan.name} ka bill ${formatPKR(total)}` : 'Sirf profile banegi'}</p>}
        <Button variant="secondary" onClick={() => navigate(-1)}>Rehne dein</Button>
        <Button onClick={submit} loading={save.isPending} disabled={!can.members}>{editing ? 'Save karein' : join && plan && can.bill ? `Member banayein · ${formatPKR(amount)} lein` : 'Member banayein'}</Button>
      </div>

      {guide.isOpen && (
        <PageGuide title="Naya member — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: UserRound, color: '#2563eb', title: 'Zaroori', text: 'Sirf naam aur phone zaroori hai. CNIC, photo aur emergency contact record ke liye achhe hain.' },
            { icon: Wallet, color: '#16a34a', title: 'Fee', text: 'Plan chunein aur jo paisa mila likhein. Admission sirf pehli dafa lagti hai. Baqi paisa member ke khate me udhaar jata hai aur check-in par yaad dilaya jata hai.' },
            { icon: CreditCard, color: '#7c3aed', title: 'Check-in', text: 'Member number khud banta hai. Card ho to scan kar dein — door par card, QR ya phone se check-in hota hai.' },
          ]}
          shortcuts={[['Ctrl+S', 'save'], ['Esc', 'wapas'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

const T = ({ icon: Icon, children }: { icon: typeof UserRound; children: string }) => <span className="inline-flex items-center gap-2"><Icon className="h-4 w-4 text-brand-600" />{children}</span>;
