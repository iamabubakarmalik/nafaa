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
import { Activity, Award, CalendarCheck, Flame, GraduationCap, HandCoins, HeartPulse, KeyRound, LogIn, Package, PauseCircle, Pencil, PlayCircle, Plus, Receipt, RefreshCw, Ruler, ShieldAlert, UserMinus, UserCheck, XCircle } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { Avatar, Badge, Button, Card, Input, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, Skeleton, Table, TBody, Td, Textarea, Th, THead, Tr, ViewTabs, heroIconButton } from '@/design-system/components';
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
import { t } from '@core/i18n';

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
    onSuccess: (r) => { toast.success(t('Check-in ho gaya{{value}}', { value: r.warnings.length ? ` · ${r.warnings.join(' · ')}` : '' })); refresh(); },
    onError: (e) => toast.error(apiError(e, t('Check-in nahi hua'))),
  });
  const voidMeasure = useMutation({
    mutationFn: (mid: string) => measurementsApi.void(mid),
    onSuccess: () => { toast.success(t('Naap void — record mehfooz hai')); setVoiding(null); refresh(); },
    onError: (e) => toast.error(apiError(e, t('Void nahi hua'))),
  });
  const unfreeze = useMutation({
    mutationFn: (mid: string) => membershipsApi.unfreeze(mid),
    onSuccess: (r) => { toast.success(t('Freeze khatam — ab {{endDate}} tak', { endDate: dateOf(r.endDate) })); refresh(); },
    onError: (e) => toast.error(apiError(e, t('Unfreeze nahi hua'))),
  });
  const reactivate = useMutation({
    mutationFn: () => gymMembersApi.update(m!.id, { status: 'ACTIVE' }),
    onSuccess: () => { toast.success(t('Member dobara active')); refresh(); },
    onError: (e) => toast.error(apiError(e, t('Active nahi hua'))),
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
  if (!m) return <PageShell><EmptyList icon={UserMinus} title={t('Member nahi mila')} text={t('Ho sakta hai link purana ho.')}><Button variant="secondary" onClick={() => navigate('/gym/members')}>{t('Members par wapas')}</Button></EmptyList></PageShell>;

  const st = MEMBER_STATE[m.state ?? 'NONE'];
  const due = (m.memberships ?? []).filter((x) => x.status !== 'CANCELLED').reduce((s, x) => s + Math.max(x.balanceDue, 0), 0);
  const left = cur ? daysLeft(cur.endDate) : 0;

  return (
    <PageShell>
      <PageHero
        title={<span className="inline-flex items-center gap-3"><Avatar name={m.customer?.name ?? m.memberNumber} url={m.photoUrl} size={40} className="ring-2 ring-white/40" />{m.customer?.name ?? m.memberNumber}</span>}
        subtitle={(
          <>
            <span>{m.memberNumber}{m.customer?.phone ? ` · ${m.customer.phone}` : ''}{m.customer?.cnic ? ` · ${m.customer.cnic}` : ''}</span>
            <span className="mt-1 flex flex-wrap gap-1.5"><Badge size="xs" variant={st.variant}>{st.label}</Badge>{!m.isActive && <Badge size="xs" variant="danger">{t('Chhor gaya')}</Badge>}<Badge size="xs" variant="outline" className="text-white">{goalLabel(m.primaryGoal)}</Badge></span>
          </>
        )}
        back={() => navigate(-1)}
        backLabel={t('Wapas (Esc)')}
        actions={(
          <>
            <button type="button" onClick={guide.open} title={t('Guide (G)')} aria-label={t('Guide')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
            {m.isActive && can.viewMembers && <Button variant="inverse" size="sm" loading={checkIn.isPending} onClick={() => checkIn.mutate()} leftIcon={<LogIn className="h-4 w-4 rtl-flip" />}>{t('Check-in')}</Button>}
            {can.members && <Button variant="inverse" size="sm" onClick={() => navigate(`/gym/members/${m.id}/edit`)} leftIcon={<Pencil className="h-4 w-4" />}>{t('Badlein')}</Button>}
            {can.bill && m.isActive && (cur ? <Button size="sm" onClick={() => setModal({ kind: 'renew', m: cur })} leftIcon={<RefreshCw className="h-4 w-4" />}>{t('Renew')}</Button>
              : <Button size="sm" onClick={() => setSelling(true)} leftIcon={<Plus className="h-4 w-4" />}>{t('Plan bechein')}</Button>)}
          </>
        )}
      />

      <KpiRow cols={4}>
        <KpiCard icon={Award} color="#16a34a" label={t('Membership')} value={cur ? (left >= 0 ? t('{{left}} din', { left }) : t('Khatam')) : '—'} hint={cur ? t('{{value}} · {{endDate}} tak', { value: cur.plan?.name ?? '', endDate: dateOf(cur.endDate) }) : t('Koi plan nahi')} />
        <KpiCard icon={HandCoins} color={due > 0 ? '#d97706' : '#64748b'} label={t('Fee baqi')} value={formatPKR(due)} hint={t('Khata: {{formatPKR}}', { formatPKR: formatPKR(m.customer?.balance ?? 0) })} />
        <KpiCard icon={CalendarCheck} color="#2563eb" label={t('Visits')} value={m.totalVisits} hint={m.lastVisitAt ? t('Aakhri {{lastVisitAt}}', { lastVisitAt: dateOf(m.lastVisitAt) }) : t('Abhi nahi aaya')} />
        <KpiCard icon={Flame} color="#e11d48" label={t('Lagataar din')} value={m.currentStreak} hint={t('Sab se zyada {{longestStreak}}', { longestStreak: m.longestStreak })} />
      </KpiRow>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Award className="h-4 w-4 text-brand-600" />{t('Chalti membership')}</span>}>
          {!cur ? <p className="text-sm text-slate-500">{t('Is member ki koi chalti membership nahi.')}{can.bill && m.isActive && <> <button type="button" onClick={() => setSelling(true)} className="font-semibold text-brand-700 hover:underline">{t('Plan bechein')}</button></>}</p> : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{cur.plan?.name} <span className="text-[0.8125rem] font-normal text-slate-500">· {cur.membershipNumber}</span></p>
                  <p className="text-[0.8125rem] text-slate-600">{t('{{startDate}} se {{endDate}} tak{{value}}{{value2}}', { startDate: dateOf(cur.startDate), endDate: dateOf(cur.endDate), value: cur.visitsRemaining != null ? t(' · {{visitsRemaining}} visits baqi', { visitsRemaining: cur.visitsRemaining }) : '', value2: cur.totalFrozenDays ? t(' · {{totalFrozenDays}} din freeze hue', { totalFrozenDays: cur.totalFrozenDays }) : '' })}</p>
                </div>
                <Badge variant={MEMBERSHIP_STATUS[cur.status].variant}>{MEMBERSHIP_STATUS[cur.status].label}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[[t('Kul'), cur.totalPrice], [t('Mila'), cur.paidAmount], [t('Baqi'), Math.max(cur.totalPrice - cur.paidAmount, 0)]].map(([l, v]) => (
                  <div key={l as string} className="rounded-xl bg-slate-50 px-2 py-2 ring-1 ring-slate-200"><p className="text-[0.75rem] text-slate-500">{l}</p><p className="font-semibold tabular-nums text-slate-900">{formatPKR(v as number)}</p></div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {can.bill && cur.totalPrice - cur.paidAmount > 0.01 && <Button size="sm" onClick={() => setModal({ kind: 'pay', m: cur })} leftIcon={<HandCoins className="h-4 w-4" />}>{t('Fee lein')}</Button>}
                {can.members && cur.status === 'ACTIVE' && cur.plan?.allowFreeze && <Button size="sm" variant="secondary" onClick={() => setModal({ kind: 'freeze', m: cur })} leftIcon={<PauseCircle className="h-4 w-4" />}>{t('Freeze')}</Button>}
                {can.members && cur.status === 'FROZEN' && <Button size="sm" variant="secondary" loading={unfreeze.isPending} onClick={() => unfreeze.mutate(cur.id)} leftIcon={<PlayCircle className="h-4 w-4" />}>{t('Unfreeze')}</Button>}
                <ReminderLink membership={cur} />
                {can.members && <Button size="sm" variant="ghost" onClick={() => setModal({ kind: 'cancel', m: cur })} leftIcon={<XCircle className="h-4 w-4" />}>{t('Cancel')}</Button>}
              </div>
            </div>
          )}
        </Card>

        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-brand-600" />{t('Emergency aur sehat')}</span>}>
          <dl className="space-y-1.5 text-[0.8125rem]">
            <Row label={t('Emergency')} value={m.emergencyContactName ? `${m.emergencyContactName}${m.emergencyContactRelation ? ` (${m.emergencyContactRelation})` : ''}` : null} />
            <Row label={t('Un ka phone')} value={m.emergencyContactPhone} link={m.emergencyContactPhone ? `tel:${m.emergencyContactPhone}` : undefined} />
            <Row label={t('Blood group')} value={m.bloodGroup} />
            <Row label={t('Bimari')} value={m.medicalConditions} warn />
            <Row label={t('Chot')} value={m.injuries} warn />
            <Row label={t('Dawai')} value={m.medications} />
            <Row label={t('Qad / wazan')} value={m.heightCm || m.currentWeightKg ? t('{{value}} cm · {{value2}} kg{{value3}}', { value: m.heightCm ?? '—', value2: m.currentWeightKg ?? '—', value3: m.bmi ? t(' · BMI {{value}}', { value: m.bmi.toFixed(1) }) : '' }) : null} />
          </dl>
          <div className="mt-3 flex flex-wrap gap-2">
            {can.members && m.isActive && <Button size="sm" variant="ghost" onClick={() => setLeaving(true)} leftIcon={<UserMinus className="h-4 w-4" />}>{t('Chhor gaya')}</Button>}
            {can.members && !m.isActive && <Button size="sm" variant="secondary" loading={reactivate.isPending} onClick={() => reactivate.mutate()} leftIcon={<UserCheck className="h-4 w-4" />}>{t('Dobara active')}</Button>}
          </div>
        </Card>
      </div>

      <ViewTabs value={tab} onChange={setTab} hint={<><Kbd>1</Kbd>-<Kbd>6</Kbd> {' '}{t('tabs')}{can.members && <> · <Kbd>E</Kbd> {' '}{t('badlein')}</>}{can.bill && <> · <Kbd>R</Kbd> {' '}{t('renew')}</>}</>}
        tabs={[
          { id: 'memberships', label: t('Memberships'), icon: Award, count: m.memberships?.length ?? 0 },
          { id: 'visits', label: t('Visits'), icon: LogIn, count: m.attendances?.length ?? 0 },
          { id: 'pt', label: t('PT'), icon: Flame, count: m.ptSessions.length },
          { id: 'bills', label: t('Bills'), icon: Receipt, count: m.bills.length },
          { id: 'body', label: t('Naap'), icon: Ruler, count: m.measurements?.length ?? 0 },
          { id: 'locker', label: t('Locker'), icon: KeyRound, count: m.lockers?.length ?? 0 },
        ]} />

      <Panel>
        {tab === 'memberships' && <MembershipsTab m={m} />}
        {tab === 'visits' && (
          !m.attendances?.length ? <p className="px-4 py-10 text-center text-sm text-slate-500">{t('Abhi koi visit nahi')}</p> : (
            <Table minWidth="32rem">
              <THead><Tr><Th>{t('Din')}</Th><Th>{t('Andar')}</Th><Th>{t('Bahar')}</Th><Th>{t('Waqt')}</Th><Th>{t('Tareeqa')}</Th></Tr></THead>
              <TBody>{m.attendances.map((a) => (
                <Tr key={a.id}><Td>{dateOf(a.checkInAt)}{a.isGuest && <Badge size="xs" variant="info" className="ms-1">{t('Mehmaan {{guestName}}', { guestName: a.guestName })}</Badge>}</Td><Td>{timeOf(a.checkInAt)}</Td><Td>{a.checkOutAt ? timeOf(a.checkOutAt) : t('Andar')}</Td><Td>{minutes(a.durationMinutes)}</Td><Td>{a.method === 'MANUAL' ? t('Haath se') : a.method}</Td></Tr>
              ))}</TBody>
            </Table>
          ))}
        {tab === 'pt' && (
          <div className="space-y-3 border-b border-slate-100 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[0.875rem] font-semibold text-slate-900">{t('PT packages')}</p>
              {can.book && can.bill && m.isActive && <Button size="sm" variant="secondary" onClick={() => setSellPackage(true)} leftIcon={<Package className="h-4 w-4" />}>{t('Package bechein')}</Button>}
            </div>
            <PackagesPanel memberId={m.id} onSell={m.isActive ? () => setSellPackage(true) : undefined} />
          </div>
        )}
        {tab === 'locker' && (
          !m.lockers?.length ? <p className="px-4 py-10 text-center text-sm text-slate-500">{t('Is member ke paas koi locker nahi.')}{' '} <Link to="/gym/lockers" className="font-semibold text-brand-700 hover:underline">{t('Locker dein')}</Link></p> : (
            <Table minWidth="32rem">
              <THead><Tr><Th>{t('Locker')}</Th><Th align="right">{t('Mahine ka rent')}</Th><Th>{t('Kab se')}</Th><Th>{t('Rent kab tak')}</Th></Tr></THead>
              <TBody>{m.lockers.map((l) => {
                const due = !l.endDate || daysLeft(l.endDate) <= 0;
                return (
                  <Tr key={l.id} interactive onClick={() => navigate(`/gym/lockers?search=${encodeURIComponent(l.number)}`)}>
                    <Td className="font-medium">#{l.number}</Td><Td align="right" className="tabular-nums">{formatPKR(l.monthlyRent)}</Td><Td>{dateOf(l.startDate)}</Td>
                    <Td>{dateOf(l.endDate)}{due && <Badge size="xs" variant="warning" className="ms-1">{t('Rent baqi')}</Badge>}</Td>
                  </Tr>
                );
              })}</TBody>
            </Table>
          ))}
        {tab === 'pt' && (
          !m.ptSessions.length ? <p className="px-4 py-10 text-center text-sm text-slate-500">{t('Koi PT session nahi.')}{' '} <Link to="/gym/personal-training" className="font-semibold text-brand-700 hover:underline">{t('PT book karein')}</Link></p> : (
            <Table minWidth="36rem">
              <THead><Tr><Th>{t('Session')}</Th><Th>{t('Waqt')}</Th><Th>{t('Trainer')}</Th><Th>{t('Haal')}</Th><Th align="right">{t('Fee')}</Th></Tr></THead>
              <TBody>{m.ptSessions.map((s) => (
                <Tr key={s.id}><Td className="font-medium">{s.sessionNumber}</Td><Td>{dateOf(s.scheduledStart)} {timeOf(s.scheduledStart)}</Td><Td>{s.trainer?.trainerNumber}</Td>
                  <Td><Badge size="xs" variant={PT_STATUS[s.status]?.variant ?? 'default'}>{PT_STATUS[s.status]?.label ?? s.status}</Badge></Td>
                  <Td align="right" className="tabular-nums">{s.isFromPackage ? (s.saleId ? t('Package se') : t('Plan se')) : formatPKR(s.price)}</Td></Tr>
              ))}</TBody>
            </Table>
          ))}
        {tab === 'bills' && (
          !m.bills.length ? <p className="px-4 py-10 text-center text-sm text-slate-500">{t('Koi bill nahi')}</p> : (
            <Table minWidth="36rem">
              <THead><Tr><Th>{t('Bill')}</Th><Th>{t('Din')}</Th><Th align="right">{t('Kul')}</Th><Th align="right">{t('Mila')}</Th><Th align="right">{t('Udhaar')}</Th><Th>{t('Haal')}</Th></Tr></THead>
              <TBody>{m.bills.map((b) => (
                <Tr key={b.id} interactive onClick={() => navigate(`/sales/${b.id}/receipt`)}>
                  <Td className="font-medium">{b.saleNumber}</Td><Td>{dateOf(b.createdAt)}</Td><Td align="right" className="tabular-nums">{formatPKR(b.total)}</Td>
                  <Td align="right" className="tabular-nums">{formatPKR(Math.min(b.paidAmount, b.total))}</Td><Td align="right" className="tabular-nums">{b.creditAmount > 0 ? formatPKR(b.creditAmount) : '—'}</Td>
                  <Td><Badge size="xs" variant={b.status === 'VOIDED' ? 'danger' : b.status === 'COMPLETED' ? 'success' : 'warning'}>{b.status === 'VOIDED' ? t('Void') : b.status === 'COMPLETED' ? t('Theek') : t('Wapas')}</Badge></Td>
                </Tr>
              ))}</TBody>
            </Table>
          ))}
        {tab === 'body' && (
          <div>
            {can.members && <div className="flex justify-end border-b border-slate-100 p-3"><Button size="sm" onClick={() => setMeasure(true)} leftIcon={<Plus className="h-4 w-4" />}>{t('Naya naap')}</Button></div>}
            {!m.measurements?.length ? <p className="px-4 py-10 text-center text-sm text-slate-500">{t('Abhi koi naap nahi. Har mahine wazan aur naap likhein taake member ko apni tarakki nazar aaye.')}</p> : (
              <Table minWidth="36rem">
                <THead><Tr><Th>{t('Din')}</Th><Th align="right">{t('Wazan')}</Th><Th align="right">{t('BMI')}</Th><Th align="right">{t('Fat %')}</Th><Th align="right">{t('Kamar')}</Th><Th align="right">{t('Seena')}</Th><Th>{t('Note')}</Th><Th /></Tr></THead>
                <TBody>{m.measurements.map((x) => (
                  <Tr key={x.id}><Td>{dateOf(x.measurementDate)}</Td><Td align="right">{x.weightKg ?? '—'}</Td><Td align="right">{x.bmi?.toFixed(1) ?? '—'}</Td><Td align="right">{x.bodyFatPct ?? '—'}</Td><Td align="right">{x.waistCm ?? '—'}</Td><Td align="right">{x.chestCm ?? '—'}</Td><Td className="max-w-[12rem] truncate">{x.notes ?? ''}</Td>
                    <Td align="right">{can.members && (voiding === x.id
                      ? <span className="inline-flex gap-1"><Button size="sm" variant="danger" loading={voidMeasure.isPending} onClick={() => voidMeasure.mutate(x.id)}>{t('Haan, void')}</Button><Button size="sm" variant="ghost" onClick={() => setVoiding(null)}>{t('Nahi')}</Button></span>
                      : <Button size="sm" variant="ghost" onClick={() => setVoiding(x.id)}>{t('Ghalat hai')}</Button>)}</Td></Tr>
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
        <PageGuide title={t('Member ka record')} onClose={guide.close}
          steps={[
            { icon: Award, color: '#16a34a', title: t('Membership'), text: t('Renew, fee lena, freeze aur cancel yahin se. Freeze me din rukte hain aur khatam ki date aage chali jati hai.') },
            { icon: Receipt, color: '#e11d48', title: t('Paisa wapas'), text: t('Cancel paisa wapas nahi karta. Wapas karna ho to Bills tab se us bill ka Return ya Void karein — membership khud cancel ho jati hai.') },
            { icon: HeartPulse, color: '#7c3aed', title: t('Sehat'), text: t('Bimari aur chot trainer ke liye zaroori hain. Emergency number par tap karte hi call lagti hai.') },
            { icon: Activity, color: '#2563eb', title: t('Naap'), text: t('Har mahine wazan aur naap likhein. Member ki card par aakhri wazan aur BMI dikhte hain.') },
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
      <dd className={warn && value ? 'text-end font-medium text-rose-700' : 'text-end text-slate-800'}>{value ? (link ? <a href={link} className="text-brand-700 hover:underline">{value}</a> : value) : '—'}</dd>
    </div>
  );
}

function MembershipsTab({ m }: { m: MemberDetail }) {
  const list = m.memberships ?? [];
  if (!list.length) return <p className="px-4 py-10 text-center text-sm text-slate-500">{t('Abhi koi membership nahi')}</p>;
  return (
    <Table minWidth="40rem">
      <THead><Tr><Th>{t('Number')}</Th><Th>{t('Plan')}</Th><Th>{t('Muddat')}</Th><Th align="right">{t('Kul')}</Th><Th align="right">{t('Baqi')}</Th><Th>{t('Haal')}</Th></Tr></THead>
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
    onSuccess: () => { toast.success(t('Member "chhor gaya" me chala gaya')); qc.invalidateQueries({ queryKey: [GYM_KEYS.members] }); onClose(); },
    onError: (e) => toast.error(apiError(e, t('Nahi hua'))),
  });
  return (
    <Modal open onClose={onClose} size="sm" title={t('{{value}} ne gym chhor diya?', { value: member.customer?.name ?? member.memberNumber })}
      description={t('Record, khata aur bills waise hi rehte hain; member list me \'Chhor gaye\' me chala jata hai. Baad me dobara active kar sakte hain.')}
      footer={<><Button variant="secondary" onClick={onClose}>{t('Rehne dein')}</Button><Button variant="danger" loading={save.isPending} onClick={() => save.mutate()}>{t('Haan, chhor gaya')}</Button></>}>
      <span />
    </Modal>
  );
}

function MeasureModal({ member, onClose }: { member: MemberDetail; onClose: () => void }) {
  const qc = useQueryClient();
  const [v, setV] = useState<Record<string, string>>({ heightCm: member.heightCm ? String(member.heightCm) : '' });
  const [notes, setNotes] = useState('');
  const set = (k: string, x: string) => setV((o) => ({ ...o, [k]: num(x) }));
  const fields: Array<[string, string]> = [['weightKg', t('Wazan (kg)')], ['heightCm', t('Qad (cm)')], ['bodyFatPct', t('Fat %')], ['muscleMassPct', t('Muscle %')], ['chestCm', t('Seena (cm)')], ['waistCm', t('Kamar (cm)')], ['hipsCm', t('Hips (cm)')], ['bicepsCm', t('Bazu (cm)')], ['thighsCm', t('Taang (cm)')]];
  const body = Object.fromEntries(Object.entries(v).filter(([, x]) => x !== '').map(([k, x]) => [k, Number(x)]));
  const save = useMutation({
    mutationFn: () => measurementsApi.create({ memberId: member.id, ...body, notes: notes.trim() || undefined }),
    onSuccess: () => { toast.success(t('Naap save ho gaya')); qc.invalidateQueries({ queryKey: [GYM_KEYS.members] }); onClose(); },
    onError: (e) => toast.error(apiError(e, t('Naap save nahi hua'))),
  });
  return (
    <Modal open onClose={onClose} size="md" title={t('Naya naap')} description={t('Jo naap liya woh likhein; BMI khud banta hai')}
      footer={<><Button variant="secondary" onClick={onClose}>{t('Rehne dein')}</Button><Button loading={save.isPending} disabled={!Object.keys(body).length} onClick={() => save.mutate()}>{t('Save')}</Button></>}>
      <div className="grid gap-3 sm:grid-cols-3">
        {fields.map(([k, l]) => <Input key={k} label={l} inputMode="decimal" value={v[k] ?? ''} onChange={(e) => set(k, e.target.value)} />)}
        <Textarea wrapperClassName="sm:col-span-3" label={t('Note')} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={1000} hint={t('Marzi hai')} />
      </div>
    </Modal>
  );
}
