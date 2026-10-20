/**
 * One eye test: the customer and the complaint, the result form (power for
 * both eyes, nazar, pressure, diagnosis, advice, follow-up) that can issue
 * the nuskha in one step, the fee, the printed report, and a direct jump to
 * a glasses order from the new nuskha.
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, CalendarClock, ClipboardCheck, FileText, Glasses, Play, Printer, Save, Stethoscope, Wallet } from 'lucide-react';
import { Button, Card, Input, Kbd, PageShell, Skeleton, Switch, Textarea } from '@/design-system/components';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { usePrinter } from '@core/print';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { eyeTestsApi, type OpticalEyeTest } from '../api/eye-tests.api';
import { TestDialogs, useTestActions, type TestDialog } from '../components/TestModals';
import { Box, Pill, PowerGrid, PowerTable, powerDraftOf, powerOf, type PowerDraft } from '../components/ui';
import { useFormKeys } from '../hooks/usePageKeys';
import { OPTICAL_KEYS, apiError, dateTime, dayOnly, powerErrors, testStatusOf, toDateInput, todayInput } from '../lib/meta';
import { testDoc } from '../lib/print';

const VA = ['6/6', '6/9', '6/12', '6/18', '6/24', '6/36', '6/60'];

interface Result {
  power: PowerDraft; rightVa: string; leftVa: string; iop: string; color: string; diagnosis: string; advice: string;
  followUp: boolean; followUpDate: string; followUpReason: string; issueRx: boolean; notes: string;
}

const resultOf = (t: OpticalEyeTest): Result => ({
  power: powerDraftOf(t), rightVa: t.rightVa ?? '', leftVa: t.leftVa ?? '', iop: t.intraocularPressure ?? '', color: t.colorVisionTest ?? '',
  diagnosis: t.diagnosis ?? '', advice: t.recommendation ?? '', followUp: t.requiresFollowUp, followUpDate: toDateInput(t.followUpDate), followUpReason: t.followUpReason ?? '',
  issueRx: !t.prescriptionId, notes: '',
});

export default function EyeTestDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { sales: money } = useMasked();
  const { print } = usePrinter();
  const canBill = usePermission(PERMISSIONS.POS_USE);
  const [dialog, setDialog] = useState<TestDialog>(null);
  const actions = useTestActions(() => setDialog(null));
  const q = useQuery({ queryKey: [OPTICAL_KEYS.tests, 'one', id], queryFn: () => eyeTestsApi.getOne(id) });
  const t = q.data;
  const [r, setR] = useState<Result | null>(null);
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (t && !r) { setR(resultOf(t)); setEditing(t.status !== 'COMPLETED'); } }, [t, r]);

  const p = r ? powerOf(r.power) : {};
  const pErr = powerErrors(p);
  const followErr = r?.followUp && !r.followUpDate ? 'Dobara aane ki date likhein' : undefined;
  const save = useMutation({
    mutationFn: () => eyeTestsApi.recordResults(id, {
      ...p, rightVa: r!.rightVa || undefined, leftVa: r!.leftVa || undefined, intraocularPressure: r!.iop.trim() || undefined, colorVisionTest: r!.color.trim() || undefined,
      diagnosis: r!.diagnosis.trim() || undefined, recommendation: r!.advice.trim() || undefined,
      requiresFollowUp: r!.followUp, followUpDate: r!.followUp && r!.followUpDate ? new Date(`${r!.followUpDate}T12:00:00`).toISOString() : undefined,
      followUpReason: r!.followUp ? r!.followUpReason.trim() || undefined : undefined,
      issuePrescription: r!.issueRx && !t?.prescriptionId, notes: r!.notes.trim() || undefined,
    }),
    onSuccess: (res) => {
      toast.success(res.prescriptionId && !t?.prescriptionId ? 'Result save — nuskha ban gaya' : 'Result save ho gaya');
      qc.invalidateQueries({ queryKey: [OPTICAL_KEYS.tests] });
      qc.invalidateQueries({ queryKey: [OPTICAL_KEYS.rx] });
      setR(null); setEditing(false);
    },
    onError: (e) => toast.error(apiError(e, 'Result save nahi hua')),
  });
  const submit = () => {
    if (!editing || !r) return;
    if (Object.keys(pErr).length || followErr) { toast.error(Object.values(pErr)[0] ?? followErr!); return; }
    if (!Object.keys(p).length && !r.diagnosis.trim()) { toast.error('Number ya tashkhees likhein'); return; }
    if (!save.isPending) save.mutate();
  };
  useFormKeys(submit);

  if (q.isLoading || (t && !r)) return <PageShell><Skeleton className="h-24 rounded-3xl" /><Skeleton className="h-96 rounded-2xl" /></PageShell>;
  if (!t || !r) {
    return <PageShell><div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80"><p className="font-semibold text-slate-900">Ye test nahi mila</p><Button className="mt-3" variant="secondary" onClick={() => navigate('/optical/eye-tests')}>Eye tests par wapas</Button></div></PageShell>;
  }

  const closed = t.status === 'CANCELLED' || t.status === 'NO_SHOW';
  const due = t.isWaivedOff ? 0 : Math.max(t.testFee - t.paidAmount, 0);
  const set = (patch: Partial<Result>) => setR({ ...r, ...patch });

  return (
    <PageShell>
      <TestDialogs dialog={dialog} close={() => setDialog(null)} actions={actions} />
      <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-4 text-white shadow-lg sm:p-5">
        <button type="button" onClick={() => navigate(-1)} aria-label="Wapas" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 hover:bg-white/25"><ArrowLeft className="h-4 w-4" /></button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-bold">{t.customerName}</h1><Pill meta={testStatusOf(t.status)} className="bg-white/90" /></div>
          <p className="text-[0.8125rem] text-white/75">{t.testNumber} · {dayOnly(t.appointmentDate)}{t.scheduledSlot ? ` ${t.scheduledSlot}` : ''} · {t.customerPhone}{t.customerAge ? ` · ${t.customerAge} saal` : ''}{t.optometristName ? ` · ${t.optometristName}` : ''}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {t.status === 'COMPLETED' && <button type="button" onClick={() => void print(testDoc(t))} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/15 px-2.5 text-[0.8125rem] font-semibold ring-1 ring-white/25 hover:bg-white/25"><Printer className="h-4 w-4" />Report</button>}
          {t.prescriptionId && <Link to={`/optical/lens-orders/new?rx=${t.prescriptionId}`} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-[0.8125rem] font-bold text-brand-800 shadow-sm hover:bg-brand-50"><Glasses className="h-4 w-4" />Chashma order</Link>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {['SCHEDULED', 'CONFIRMED', 'RESCHEDULED'].includes(t.status) && <Button leftIcon={<Play className="h-4 w-4" />} loading={actions.start.isPending} onClick={() => actions.start.mutate(t)}>Test shuru</Button>}
        {canBill && due > 0.009 && !closed && <Button variant="secondary" leftIcon={<Wallet className="h-4 w-4" />} onClick={() => setDialog({ kind: 'fee', test: t })}>Fees lein ({money(due)})</Button>}
        {['SCHEDULED', 'CONFIRMED', 'RESCHEDULED'].includes(t.status) && <Button variant="ghost" leftIcon={<CalendarClock className="h-4 w-4" />} onClick={() => setDialog({ kind: 'move', test: t })}>Waqt badlein</Button>}
        {t.status === 'COMPLETED' && !editing && <Button variant="ghost" leftIcon={<Stethoscope className="h-4 w-4" />} onClick={() => setEditing(true)}>Result badlein</Button>}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          {editing && !closed ? (
            <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Stethoscope className="h-4 w-4 text-brand-600" />Result</span>}
              actions={<span className="hidden items-center gap-1 text-[0.75rem] text-slate-500 sm:inline-flex"><Kbd>Ctrl</Kbd>+<Kbd>S</Kbd> save</span>}>
              <div className="space-y-4">
                <PowerGrid value={r.power} onChange={(power) => set({ power })} errors={pErr} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label="Nazar R (VA)" value={r.rightVa} onChange={(e) => set({ rightVa: e.target.value })} placeholder="6/6" list="optical-va" />
                  <Input label="Nazar L (VA)" value={r.leftVa} onChange={(e) => set({ leftVa: e.target.value })} placeholder="6/9" list="optical-va" />
                  <datalist id="optical-va">{VA.map((v) => <option key={v} value={v} />)}</datalist>
                  <Input label="Aankh ka pressure (IOP)" value={r.iop} onChange={(e) => set({ iop: e.target.value })} placeholder="R 14 / L 15 mmHg" hint="Marzi hai" />
                  <Input label="Rang ki pehchan" value={r.color} onChange={(e) => set({ color: e.target.value })} placeholder="Normal" hint="Marzi hai" />
                </div>
                <Textarea label="Tashkhees" rows={2} value={r.diagnosis} onChange={(e) => set({ diagnosis: e.target.value })} placeholder="Jaise: Myopia, astigmatism" />
                <Textarea label="Mashwara" rows={2} value={r.advice} onChange={(e) => set({ advice: e.target.value })} placeholder="Jaise: blue cut lens, computer par break" />
                <label className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200">
                  <span className="text-[0.875rem] text-slate-800">Dobara bulana hai<span className="block text-[0.75rem] text-slate-500">"Dobara aana" list aur dashboard par yaad dilaya jata hai</span></span>
                  <Switch checked={r.followUp} onChange={(e) => set({ followUp: e.target.checked })} aria-label="Follow-up" />
                </label>
                {r.followUp && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input label="Kab" type="date" min={todayInput()} value={r.followUpDate} onChange={(e) => set({ followUpDate: e.target.value })} error={followErr} />
                    <Input label="Kyun" value={r.followUpReason} onChange={(e) => set({ followUpReason: e.target.value })} placeholder="Number dobara check" />
                  </div>
                )}
                {!t.prescriptionId && (
                  <label className="flex items-center justify-between gap-3 rounded-xl bg-brand-50 px-3 py-2.5 ring-1 ring-brand-200">
                    <span className="text-[0.875rem] text-slate-800">Isi number se nuskha banayein<span className="block text-[0.75rem] text-slate-500">Prescriptions me save — chashma order me khud aata hai (1 saal ki muddat)</span></span>
                    <Switch checked={r.issueRx} onChange={(e) => set({ issueRx: e.target.checked })} aria-label="Nuskha banayein" />
                  </label>
                )}
                <Textarea label="Note" rows={2} value={r.notes} onChange={(e) => set({ notes: e.target.value })} hint="Marzi hai" />
                <div className="flex justify-end gap-2">
                  {t.status === 'COMPLETED' && <Button variant="secondary" onClick={() => { setR(resultOf(t)); setEditing(false); }}>Rehne dein</Button>}
                  <Button onClick={submit} loading={save.isPending} leftIcon={<Save className="h-4 w-4" />}>Result save</Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-brand-600" />Result</span>}>
              {t.status === 'COMPLETED' ? (
                <div className="space-y-3">
                  <PowerTable p={t} />
                  <dl className="grid gap-x-6 gap-y-2 text-[0.875rem] sm:grid-cols-2">
                    {(t.rightVa || t.leftVa) && <div><dt className="text-[0.75rem] text-slate-500">Nazar R / L</dt><dd>{[t.rightVa, t.leftVa].filter(Boolean).join(' / ')}</dd></div>}
                    {t.intraocularPressure && <div><dt className="text-[0.75rem] text-slate-500">Pressure</dt><dd>{t.intraocularPressure}</dd></div>}
                    {t.diagnosis && <div className="sm:col-span-2"><dt className="text-[0.75rem] text-slate-500">Tashkhees</dt><dd>{t.diagnosis}</dd></div>}
                    {t.recommendation && <div className="sm:col-span-2"><dt className="text-[0.75rem] text-slate-500">Mashwara</dt><dd>{t.recommendation}</dd></div>}
                    {t.requiresFollowUp && <div><dt className="text-[0.75rem] text-slate-500">Dobara aana</dt><dd className="font-medium text-violet-700">{dayOnly(t.followUpDate)}{t.followUpReason ? ` — ${t.followUpReason}` : ''}</dd></div>}
                  </dl>
                </div>
              ) : <p className="text-[0.875rem] text-slate-500">{closed ? 'Ye test band hai.' : 'Test shuru karein, phir result likhein.'}</p>}
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl" title="Customer">
            <dl className="space-y-1.5 text-[0.875rem]">
              <div><dt className="text-[0.75rem] text-slate-500">Masla</dt><dd>{t.chiefComplaint || '—'}</dd></div>
              {t.medicalHistory && <div><dt className="text-[0.75rem] text-slate-500">Bimari / dawai</dt><dd>{t.medicalHistory}</dd></div>}
              {t.testStartedAt && <div><dt className="text-[0.75rem] text-slate-500">Shuru</dt><dd>{dateTime(t.testStartedAt)}{t.testDurationMinutes ? ` · ${t.testDurationMinutes} minute` : ''}</dd></div>}
            </dl>
            {t.customerId && <Link to={`/customers/${t.customerId}`} className="mt-3 inline-block text-[0.8125rem] font-semibold text-brand-700 hover:underline">Customer ka record →</Link>}
          </Card>
          <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Wallet className="h-4 w-4 text-brand-600" />Fees</span>}>
            <dl className="grid grid-cols-3 gap-2">
              <Box label="Fees" value={money(t.testFee)} />
              <Box label="Mili" value={money(t.paidAmount)} tone="text-emerald-700" />
              <Box label="Baqi" value={t.isWaivedOff ? 'Maaf' : money(due)} tone={due > 0 ? 'text-amber-700' : 'text-slate-900'} />
            </dl>
          </Card>
          {t.prescription && (
            <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><FileText className="h-4 w-4 text-brand-600" />Nuskha</span>}
              actions={<Link to={`/optical/prescriptions/${t.prescription.id}`} className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">{t.prescription.prescriptionNumber} →</Link>}>
              <p className="text-[0.8125rem] text-slate-600">Muddat: {dayOnly(t.prescription.expiryDate)}</p>
            </Card>
          )}
        </div>
      </div>
    </PageShell>
  );
}
