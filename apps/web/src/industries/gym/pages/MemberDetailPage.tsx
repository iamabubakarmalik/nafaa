/**
 * One member: who they are (photo, phone, CNIC, emergency contact, health
 * notes), the running membership with its actions (renew, take the due,
 * freeze, cancel, WhatsApp reminder), and tabs for every membership, the
 * visits, PT sessions, bills and body measurements.
 *
 * Keys: E edit · R renew · 1-5 tabs · G guide · Esc back.
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Activity, ArrowLeft, Award, CalendarCheck, Flame, GraduationCap, HandCoins, HeartPulse, KeyRound, LogIn, Package, PauseCircle, Pencil, PlayCircle, Plus, Receipt,
  RefreshCw, Ruler, ShieldAlert, UserMinus, UserCheck, XCircle,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import {
  Avatar, Badge, Button, Card, Input, Kbd, KpiCard, KpiRow, Modal, PageShell, Skeleton, Table, TBody, Td, Th, THead, Tr, Textarea, ViewTabs,
} from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { attendanceApi } from '../api/attendance.api';
import { gymMembersApi, type MemberDetail } from '../api/members.api';
import { measurementsApi } from '../api/measurements.api';
import { membershipsApi, type Membership } from '../api/memberships.api';
import { CancelModal, FreezeModal, PayModal, ReminderLink, RenewModal, SellModal } from '../components/MembershipModals';
import { toPicked } from '../components/MemberPicker';
import { PackagesPanel, SellPackageModal } from '../components/PtPackages';
import { EmptyList, Panel } from '../components/ui';
import { GYM_KEYS, MEMBERSHIP_STATUS, MEMBER_STATE, PT_STATUS, apiError, dateOf, daysLeft, goalLabel, minutes, num, timeOf } from '../lib/meta';
import { useGymCan } from '../lib/permissions';

type Tab = 'memberships' | 'visits' | 'pt' | 'bills' | 'body' | 'locker';

export default function MemberDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const can = useGymCan();
  const guide = usePageGuide();
  const [tab, setTab] = useState<Tab>('memberships');
  const [modal, setModal] = useState<{ kind: 'renew' | 'pay' | 'freeze' | 'cancel'; m: Membership } | null>(null);
  const [selling, setSelling] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [measure, setMeasure] = useState(false);
  const [sellPackage, setSellPackage] = useState(false);
  const [voiding, setVoiding] = useState<string | null>(null);
  const q = useQuery({ queryKey: [GYM_KEYS.members, 'one', id], queryFn: () => gymMembersApi.getOne(id!), enabled: !!id });
  const m = q.data;
  const cur = m?.current ? { ...m.current, member: { id: m.id, memberNumber: m.memberNumber, customerId: m.customerId, customer: m.customer } } : null;
  const refresh = () => [GYM_KEYS.members, GYM_KEYS.memberships, GYM_KEYS.attendance].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const checkIn = useMutation({
    mutationFn: () => attendanceApi.checkIn({ memberId: m!.id, method: 'MANUAL' }),
    onSuccess: (r) => { toast.success(`Check-in ho gaya${r.warnings.length ? ` · ${r.warnings.join(' · ')}` : ''}`); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Check-in nahi hua')),
  });
  const voidMeasure = useMutation({
    mutationFn: (mid: string) => measurementsApi.void(mid),
    onSuccess: () => { toast.success('Naap void — record mehfooz hai'); setVoiding(null); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Void nahi hua')),
  });
  const unfreeze = useMutation({
    mutationFn: (mid: string) => membershipsApi.unfreeze(mid),
    onSuccess: (r) => { toast.success(`Freeze khatam — ab ${dateOf(r.endDate)} tak`); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Unfreeze nahi hua')),
  });
  const reactivate = useMutation({
    mutationFn: () => gymMembersApi.update(m!.id, { status: 'ACTIVE' }),
    onSuccess: () => { toast.success('Member dobara active'); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Active nahi hua')),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen() || !m) return;
      if (e.key === 'Escape') navigate(-1);
      if ((e.key === 'e' || e.key === 'E') && can.members) navigate(`/gym/members/${m.id}/edit`);
      if ((e.key === 'r' || e.key === 'R') && can.bill && cur) setModal({ kind: 'renew', m: cur });
      const tabs: Tab[] = ['memberships', 'visits', 'pt', 'bills', 'body', 'locker'];
      const i = Number(e.key);
      if (i >= 1 && i <= tabs.length) setTab(tabs[i - 1]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (q.isLoading) return <PageShell><Skeleton className="h-40 rounded-3xl" /><Skeleton className="h-64 rounded-3xl" /></PageShell>;
  if (!m) return <PageShell><EmptyList icon={UserMinus} title="Member nahi mila" text="Ho sakta hai link purana ho."><Button variant="secondary" onClick={() => navigate('/gym/members')}>Members par wapas</Button></EmptyList></PageShell>;

  const st = MEMBER_STATE[m.state ?? 'NONE'];
  const due = (m.memberships ?? []).filter((x) => x.status !== 'CANCELLED').reduce((s, x) => s + Math.max(x.balanceDue, 0), 0);
  const left = cur ? daysLeft(cur.endDate) : 0;

  return (
    <PageShell>
      <div className="rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-4 text-white shadow-lg sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} aria-label="Wapas (Esc)" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 hover:bg-white/25"><ArrowLeft className="h-4 w-4" /></button>
          <Avatar name={m.customer?.name ?? m.memberNumber} url={m.photoUrl} size={56} className="ring-2 ring-white/40" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold">{m.customer?.name ?? m.memberNumber}</h1>
            <p className="text-[0.8125rem] text-white/80">{m.memberNumber}{m.customer?.phone ? ` · ${m.customer.phone}` : ''}{m.customer?.cnic ? ` · ${m.customer.cnic}` : ''}</p>
            <div className="mt-1 flex flex-wrap gap-1.5"><Badge size="xs" variant={st.variant}>{st.label}</Badge>{!m.isActive && <Badge size="xs" variant="danger">Chhor gaya</Badge>}<Badge size="xs" variant="outline" className="text-white">{goalLabel(m.primaryGoal)}</Badge></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={guide.open} title="Guide (G)" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 hover:bg-white/25"><GraduationCap className="h-4 w-4" /></button>
            {m.isActive && can.viewMembers && <Button variant="inverse" size="sm" loading={checkIn.isPending} onClick={() => checkIn.mutate()} leftIcon={<LogIn className="h-4 w-4" />}>Check-in</Button>}
            {can.members && <Button variant="inverse" size="sm" onClick={() => navigate(`/gym/members/${m.id}/edit`)} leftIcon={<Pencil className="h-4 w-4" />}>Badlein</Button>}
            {can.bill && m.isActive && (cur ? <Button size="sm" onClick={() => setModal({ kind: 'renew', m: cur })} leftIcon={<RefreshCw className="h-4 w-4" />}>Renew</Button>
              : <Button size="sm" onClick={() => setSelling(true)} leftIcon={<Plus className="h-4 w-4" />}>Plan bechein</Button>)}
          </div>
        </div>
      </div>

      <KpiRow cols={4}>
        <KpiCard icon={Award} color="#16a34a" label="Membership" value={cur ? (left >= 0 ? `${left} din` : 'Khatam') : '—'} hint={cur ? `${cur.plan?.name ?? ''} · ${dateOf(cur.endDate)} tak` : 'Koi plan nahi'} />
        <KpiCard icon={HandCoins} color={due > 0 ? '#d97706' : '#64748b'} label="Fee baqi" value={formatPKR(due)} hint={`Khata: ${formatPKR(m.customer?.balance ?? 0)}`} />
        <KpiCard icon={CalendarCheck} color="#2563eb" label="Visits" value={m.totalVisits} hint={m.lastVisitAt ? `Aakhri ${dateOf(m.lastVisitAt)}` : 'Abhi nahi aaya'} />
        <KpiCard icon={Flame} color="#e11d48" label="Lagataar din" value={m.currentStreak} hint={`Sab se zyada ${m.longestStreak}`} />
      </KpiRow>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Award className="h-4 w-4 text-brand-600" />Chalti membership</span>}>
          {!cur ? <p className="text-sm text-slate-500">Is member ki koi chalti membership nahi.{can.bill && m.isActive && <> <button type="button" onClick={() => setSelling(true)} className="font-semibold text-brand-700 hover:underline">Plan bechein</button></>}</p> : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{cur.plan?.name} <span className="text-[0.8125rem] font-normal text-slate-500">· {cur.membershipNumber}</span></p>
                  <p className="text-[0.8125rem] text-slate-600">{dateOf(cur.startDate)} se {dateOf(cur.endDate)} tak{cur.visitsRemaining != null ? ` · ${cur.visitsRemaining} visits baqi` : ''}{cur.totalFrozenDays ? ` · ${cur.totalFrozenDays} din freeze hue` : ''}</p>
                </div>
                <Badge variant={MEMBERSHIP_STATUS[cur.status].variant}>{MEMBERSHIP_STATUS[cur.status].label}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[['Kul', cur.totalPrice], ['Mila', cur.paidAmount], ['Baqi', Math.max(cur.totalPrice - cur.paidAmount, 0)]].map(([l, v]) => (
                  <div key={l as string} className="rounded-xl bg-slate-50 px-2 py-2 ring-1 ring-slate-200"><p className="text-[0.75rem] text-slate-500">{l}</p><p className="font-semibold tabular-nums text-slate-900">{formatPKR(v as number)}</p></div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {can.bill && cur.totalPrice - cur.paidAmount > 0.01 && <Button size="sm" onClick={() => setModal({ kind: 'pay', m: cur })} leftIcon={<HandCoins className="h-4 w-4" />}>Fee lein</Button>}
                {can.members && cur.status === 'ACTIVE' && cur.plan?.allowFreeze && <Button size="sm" variant="secondary" onClick={() => setModal({ kind: 'freeze', m: cur })} leftIcon={<PauseCircle className="h-4 w-4" />}>Freeze</Button>}
                {can.members && cur.status === 'FROZEN' && <Button size="sm" variant="secondary" loading={unfreeze.isPending} onClick={() => unfreeze.mutate(cur.id)} leftIcon={<PlayCircle className="h-4 w-4" />}>Unfreeze</Button>}
                <ReminderLink membership={cur} />
                {can.members && <Button size="sm" variant="ghost" onClick={() => setModal({ kind: 'cancel', m: cur })} leftIcon={<XCircle className="h-4 w-4" />}>Cancel</Button>}
              </div>
            </div>
          )}
        </Card>

        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-brand-600" />Emergency aur sehat</span>}>
          <dl className="space-y-1.5 text-[0.8125rem]">
            <Row label="Emergency" value={m.emergencyContactName ? `${m.emergencyContactName}${m.emergencyContactRelation ? ` (${m.emergencyContactRelation})` : ''}` : null} />
            <Row label="Un ka phone" value={m.emergencyContactPhone} link={m.emergencyContactPhone ? `tel:${m.emergencyContactPhone}` : undefined} />
            <Row label="Blood group" value={m.bloodGroup} />
            <Row label="Bimari" value={m.medicalConditions} warn />
            <Row label="Chot" value={m.injuries} warn />
            <Row label="Dawai" value={m.medications} />
            <Row label="Qad / wazan" value={m.heightCm || m.currentWeightKg ? `${m.heightCm ?? '—'} cm · ${m.currentWeightKg ?? '—'} kg${m.bmi ? ` · BMI ${m.bmi.toFixed(1)}` : ''}` : null} />
          </dl>
          <div className="mt-3 flex flex-wrap gap-2">
            {can.members && m.isActive && <Button size="sm" variant="ghost" onClick={() => setLeaving(true)} leftIcon={<UserMinus className="h-4 w-4" />}>Chhor gaya</Button>}
            {can.members && !m.isActive && <Button size="sm" variant="secondary" loading={reactivate.isPending} onClick={() => reactivate.mutate()} leftIcon={<UserCheck className="h-4 w-4" />}>Dobara active</Button>}
          </div>
        </Card>
      </div>

      <ViewTabs value={tab} onChange={setTab} hint={<><Kbd>1</Kbd>-<Kbd>6</Kbd> tabs{can.members && <> · <Kbd>E</Kbd> badlein</>}{can.bill && <> · <Kbd>R</Kbd> renew</>}</>}
        tabs={[
          { id: 'memberships', label: 'Memberships', icon: Award, count: m.memberships?.length ?? 0 },
          { id: 'visits', label: 'Visits', icon: LogIn, count: m.attendances?.length ?? 0 },
          { id: 'pt', label: 'PT', icon: Flame, count: m.ptSessions.length },
          { id: 'bills', label: 'Bills', icon: Receipt, count: m.bills.length },
          { id: 'body', label: 'Naap', icon: Ruler, count: m.measurements?.length ?? 0 },
          { id: 'locker', label: 'Locker', icon: KeyRound, count: m.lockers?.length ?? 0 },
        ]} />

      <Panel>
        {tab === 'memberships' && <MembershipsTab m={m} />}
        {tab === 'visits' && (
          !m.attendances?.length ? <p className="px-4 py-10 text-center text-sm text-slate-500">Abhi koi visit nahi</p> : (
            <Table minWidth="32rem">
              <THead><Tr><Th>Din</Th><Th>Andar</Th><Th>Bahar</Th><Th>Waqt</Th><Th>Tareeqa</Th></Tr></THead>
              <TBody>{m.attendances.map((a) => (
                <Tr key={a.id}><Td>{dateOf(a.checkInAt)}{a.isGuest && <Badge size="xs" variant="info" className="ml-1">Mehmaan {a.guestName}</Badge>}</Td><Td>{timeOf(a.checkInAt)}</Td><Td>{a.checkOutAt ? timeOf(a.checkOutAt) : 'Andar'}</Td><Td>{minutes(a.durationMinutes)}</Td><Td>{a.method === 'MANUAL' ? 'Haath se' : a.method}</Td></Tr>
              ))}</TBody>
            </Table>
          ))}
        {tab === 'pt' && (
          <div className="space-y-3 border-b border-slate-100 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[0.875rem] font-semibold text-slate-900">PT packages</p>
              {can.book && can.bill && m.isActive && <Button size="sm" variant="secondary" onClick={() => setSellPackage(true)} leftIcon={<Package className="h-4 w-4" />}>Package bechein</Button>}
            </div>
            <PackagesPanel memberId={m.id} onSell={m.isActive ? () => setSellPackage(true) : undefined} />
          </div>
        )}
        {tab === 'locker' && (
          !m.lockers?.length ? <p className="px-4 py-10 text-center text-sm text-slate-500">Is member ke paas koi locker nahi. <Link to="/gym/lockers" className="font-semibold text-brand-700 hover:underline">Locker dein</Link></p> : (
            <Table minWidth="32rem">
              <THead><Tr><Th>Locker</Th><Th align="right">Mahine ka rent</Th><Th>Kab se</Th><Th>Rent kab tak</Th></Tr></THead>
              <TBody>{m.lockers.map((l) => {
                const due = !l.endDate || daysLeft(l.endDate) <= 0;
                return (
                  <Tr key={l.id} interactive onClick={() => navigate(`/gym/lockers?search=${encodeURIComponent(l.number)}`)}>
                    <Td className="font-medium">#{l.number}</Td><Td align="right" className="tabular-nums">{formatPKR(l.monthlyRent)}</Td><Td>{dateOf(l.startDate)}</Td>
                    <Td>{dateOf(l.endDate)}{due && <Badge size="xs" variant="warning" className="ml-1">Rent baqi</Badge>}</Td>
                  </Tr>
                );
              })}</TBody>
            </Table>
          ))}
        {tab === 'pt' && (
          !m.ptSessions.length ? <p className="px-4 py-10 text-center text-sm text-slate-500">Koi PT session nahi. <Link to="/gym/personal-training" className="font-semibold text-brand-700 hover:underline">PT book karein</Link></p> : (
            <Table minWidth="36rem">
              <THead><Tr><Th>Session</Th><Th>Waqt</Th><Th>Trainer</Th><Th>Haal</Th><Th align="right">Fee</Th></Tr></THead>
              <TBody>{m.ptSessions.map((s) => (
                <Tr key={s.id}><Td className="font-medium">{s.sessionNumber}</Td><Td>{dateOf(s.scheduledStart)} {timeOf(s.scheduledStart)}</Td><Td>{s.trainer?.trainerNumber}</Td>
                  <Td><Badge size="xs" variant={PT_STATUS[s.status]?.variant ?? 'default'}>{PT_STATUS[s.status]?.label ?? s.status}</Badge></Td>
                  <Td align="right" className="tabular-nums">{s.isFromPackage ? (s.saleId ? 'Package se' : 'Plan se') : formatPKR(s.price)}</Td></Tr>
              ))}</TBody>
            </Table>
          ))}
        {tab === 'bills' && (
          !m.bills.length ? <p className="px-4 py-10 text-center text-sm text-slate-500">Koi bill nahi</p> : (
            <Table minWidth="36rem">
              <THead><Tr><Th>Bill</Th><Th>Din</Th><Th align="right">Kul</Th><Th align="right">Mila</Th><Th align="right">Udhaar</Th><Th>Haal</Th></Tr></THead>
              <TBody>{m.bills.map((b) => (
                <Tr key={b.id} interactive onClick={() => navigate(`/sales/${b.id}/receipt`)}>
                  <Td className="font-medium">{b.saleNumber}</Td><Td>{dateOf(b.createdAt)}</Td><Td align="right" className="tabular-nums">{formatPKR(b.total)}</Td>
                  <Td align="right" className="tabular-nums">{formatPKR(Math.min(b.paidAmount, b.total))}</Td><Td align="right" className="tabular-nums">{b.creditAmount > 0 ? formatPKR(b.creditAmount) : '—'}</Td>
                  <Td><Badge size="xs" variant={b.status === 'VOIDED' ? 'danger' : b.status === 'COMPLETED' ? 'success' : 'warning'}>{b.status === 'VOIDED' ? 'Void' : b.status === 'COMPLETED' ? 'Theek' : 'Wapas'}</Badge></Td>
                </Tr>
              ))}</TBody>
            </Table>
          ))}
        {tab === 'body' && (
          <div>
            {can.members && <div className="flex justify-end border-b border-slate-100 p-3"><Button size="sm" onClick={() => setMeasure(true)} leftIcon={<Plus className="h-4 w-4" />}>Naya naap</Button></div>}
            {!m.measurements?.length ? <p className="px-4 py-10 text-center text-sm text-slate-500">Abhi koi naap nahi. Har mahine wazan aur naap likhein taake member ko apni tarakki nazar aaye.</p> : (
              <Table minWidth="36rem">
                <THead><Tr><Th>Din</Th><Th align="right">Wazan</Th><Th align="right">BMI</Th><Th align="right">Fat %</Th><Th align="right">Kamar</Th><Th align="right">Seena</Th><Th>Note</Th><Th /></Tr></THead>
                <TBody>{m.measurements.map((x) => (
                  <Tr key={x.id}><Td>{dateOf(x.measurementDate)}</Td><Td align="right">{x.weightKg ?? '—'}</Td><Td align="right">{x.bmi?.toFixed(1) ?? '—'}</Td><Td align="right">{x.bodyFatPct ?? '—'}</Td><Td align="right">{x.waistCm ?? '—'}</Td><Td align="right">{x.chestCm ?? '—'}</Td><Td className="max-w-[12rem] truncate">{x.notes ?? ''}</Td>
                    <Td align="right">{can.members && (voiding === x.id
                      ? <span className="inline-flex gap-1"><Button size="sm" variant="danger" loading={voidMeasure.isPending} onClick={() => voidMeasure.mutate(x.id)}>Haan, void</Button><Button size="sm" variant="ghost" onClick={() => setVoiding(null)}>Nahi</Button></span>
                      : <Button size="sm" variant="ghost" onClick={() => setVoiding(x.id)}>Ghalat hai</Button>)}</Td></Tr>
                ))}</TBody>
              </Table>
            )}
          </div>
        )}
      </Panel>

      {selling && <SellModal member={toPicked(m)} onClose={() => setSelling(false)} />}
      {sellPackage && <SellPackageModal member={toPicked(m)} onClose={() => setSellPackage(false)} />}
      {modal?.kind === 'renew' && <RenewModal membership={modal.m} onClose={() => setModal(null)} />}
      {modal?.kind === 'pay' && <PayModal membership={modal.m} onClose={() => setModal(null)} />}
      {modal?.kind === 'freeze' && <FreezeModal membership={modal.m} onClose={() => setModal(null)} />}
      {modal?.kind === 'cancel' && <CancelModal membership={modal.m} onClose={() => setModal(null)} />}
      {leaving && <LeaveModal member={m} onClose={() => setLeaving(false)} />}
      {measure && <MeasureModal member={m} onClose={() => setMeasure(false)} />}

      {guide.isOpen && (
        <PageGuide title="Member ka record" onClose={guide.close}
          steps={[
            { icon: Award, color: '#16a34a', title: 'Membership', text: 'Renew, fee lena, freeze aur cancel yahin se. Freeze me din rukte hain aur khatam ki date aage chali jati hai.' },
            { icon: Receipt, color: '#e11d48', title: 'Paisa wapas', text: 'Cancel paisa wapas nahi karta. Wapas karna ho to Bills tab se us bill ka Return ya Void karein — membership khud cancel ho jati hai.' },
            { icon: HeartPulse, color: '#7c3aed', title: 'Sehat', text: 'Bimari aur chot trainer ke liye zaroori hain. Emergency number par tap karte hi call lagti hai.' },
            { icon: Activity, color: '#2563eb', title: 'Naap', text: 'Har mahine wazan aur naap likhein. Member ki card par aakhri wazan aur BMI dikhte hain.' },
          ]}
          shortcuts={[['E', 'badlein'], ['R', 'renew'], ['1-5', 'tabs'], ['Esc', 'wapas'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function Row({ label, value, link, warn }: { label: string; value?: string | null; link?: string; warn?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className={warn && value ? 'text-right font-medium text-rose-700' : 'text-right text-slate-800'}>{value ? (link ? <a href={link} className="text-brand-700 hover:underline">{value}</a> : value) : '—'}</dd>
    </div>
  );
}

function MembershipsTab({ m }: { m: MemberDetail }) {
  const list = m.memberships ?? [];
  if (!list.length) return <p className="px-4 py-10 text-center text-sm text-slate-500">Abhi koi membership nahi</p>;
  return (
    <Table minWidth="40rem">
      <THead><Tr><Th>Number</Th><Th>Plan</Th><Th>Muddat</Th><Th align="right">Kul</Th><Th align="right">Baqi</Th><Th>Haal</Th></Tr></THead>
      <TBody>{list.map((x) => (
        <Tr key={x.id}>
          <Td className="font-medium">{x.membershipNumber}</Td><Td>{x.plan?.name}</Td><Td>{dateOf(x.startDate)} – {dateOf(x.endDate)}</Td>
          <Td align="right" className="tabular-nums">{formatPKR(x.totalPrice)}</Td><Td align="right" className="tabular-nums">{x.balanceDue > 0 ? formatPKR(x.balanceDue) : '—'}</Td>
          <Td><Badge size="xs" variant={MEMBERSHIP_STATUS[x.status].variant}>{MEMBERSHIP_STATUS[x.status].label}</Badge>{x.cancellationReason && <p className="text-[0.6875rem] text-slate-500">{x.cancellationReason}</p>}</Td>
        </Tr>
      ))}</TBody>
    </Table>
  );
}

function LeaveModal({ member, onClose }: { member: MemberDetail; onClose: () => void }) {
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: () => gymMembersApi.remove(member.id),
    onSuccess: () => { toast.success('Member "chhor gaya" me chala gaya'); qc.invalidateQueries({ queryKey: [GYM_KEYS.members] }); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });
  return (
    <Modal open onClose={onClose} size="sm" title={`${member.customer?.name ?? member.memberNumber} ne gym chhor diya?`}
      description="Record, khata aur bills waise hi rehte hain; member list me 'Chhor gaye' me chala jata hai. Baad me dobara active kar sakte hain."
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button variant="danger" loading={save.isPending} onClick={() => save.mutate()}>Haan, chhor gaya</Button></>}>
      <span />
    </Modal>
  );
}

function MeasureModal({ member, onClose }: { member: MemberDetail; onClose: () => void }) {
  const qc = useQueryClient();
  const [v, setV] = useState<Record<string, string>>({ heightCm: member.heightCm ? String(member.heightCm) : '' });
  const [notes, setNotes] = useState('');
  const set = (k: string, x: string) => setV((o) => ({ ...o, [k]: num(x) }));
  const fields: Array<[string, string]> = [['weightKg', 'Wazan (kg)'], ['heightCm', 'Qad (cm)'], ['bodyFatPct', 'Fat %'], ['muscleMassPct', 'Muscle %'], ['chestCm', 'Seena (cm)'], ['waistCm', 'Kamar (cm)'], ['hipsCm', 'Hips (cm)'], ['bicepsCm', 'Bazu (cm)'], ['thighsCm', 'Taang (cm)']];
  const body = Object.fromEntries(Object.entries(v).filter(([, x]) => x !== '').map(([k, x]) => [k, Number(x)]));
  const save = useMutation({
    mutationFn: () => measurementsApi.create({ memberId: member.id, ...body, notes: notes.trim() || undefined }),
    onSuccess: () => { toast.success('Naap save ho gaya'); qc.invalidateQueries({ queryKey: [GYM_KEYS.members] }); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Naap save nahi hua')),
  });
  return (
    <Modal open onClose={onClose} size="md" title="Naya naap" description="Jo naap liya woh likhein; BMI khud banta hai"
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={save.isPending} disabled={!Object.keys(body).length} onClick={() => save.mutate()}>Save</Button></>}>
      <div className="grid gap-3 sm:grid-cols-3">
        {fields.map(([k, l]) => <Input key={k} label={l} inputMode="decimal" value={v[k] ?? ''} onChange={(e) => set(k, e.target.value)} />)}
        <Textarea wrapperClassName="sm:col-span-3" label="Note" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={1000} hint="Marzi hai" />
      </div>
    </Modal>
  );
}
