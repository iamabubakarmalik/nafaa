/**
 * Targets (Distribution → Targets): monthly targets per booker, route, brand
 * or principal (any mix; none = the whole business), by value or quantity,
 * with what is achieved so far, whether it is on pace and what is needed
 * per day. Achievement is invoiced value less goods that came back.
 */

import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Copy, Pencil, Plus, Target, Trash2 } from 'lucide-react';
import {
  Button, Input, Modal, PageHero, PageShell, Segmented, Select, Skeleton, confirmDialog, heroButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { DIST_KEY, distError, distributionApi } from '../../api/distribution.api';
import { phase2Api, type SaveTarget, type TargetMetric, type TargetRow } from '../../api/phase2.api';
import { DistributionGate } from '../../components/DistributionGate';
import { Empty, Panel, Pill } from '../../components/parts';
import { useMoney } from '../../hooks/useDistribution';
import { trim } from '../../lib/meta';
import { useTeam } from '../../setup/routes/useTeam';

const KEY = [DIST_KEY, 'targets'] as const;

function shiftMonth(period: string, by: number) {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
const monthLabel = (p: string) => {
  const [y, m] = p.split('-').map(Number);
  return new Intl.DateTimeFormat('en-PK', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1));
};

export default function TargetsPage() {
  return <DistributionGate><PageShell><TargetsBody /></PageShell></DistributionGate>;
}

function TargetsBody() {
  const qc = useQueryClient();
  const money = useMoney();
  const canManage = usePermission(PERMISSIONS.DISTRIBUTION_TARGETS_MANAGE);
  const [params] = useSearchParams();
  const [period, setPeriod] = useState<string | undefined>(params.get('period') ?? undefined);
  const q = useQuery({ queryKey: [...KEY, period ?? 'now'], queryFn: () => phase2Api.targets({ period }) });
  const shown = q.data?.period ?? period;
  const [edit, setEdit] = useState<TargetRow | 'new' | null>(null);

  const del = useMutation({
    mutationFn: (id: string) => phase2Api.deleteTarget(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success('Target hata diya'); },
    onError: (e) => toast.error(distError(e)),
  });
  const copy = useMutation({
    mutationFn: () => phase2Api.copyTargets(shiftMonth(shown!, -1), shown!),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: KEY }); toast.success(r.copied ? `${r.copied} target copy hue` : 'Copy karne ko kuch nahi (pichle mahine koi naya target nahi)'); },
    onError: (e) => toast.error(distError(e)),
  });

  const rows = q.data?.targets ?? [];
  const onTrack = rows.filter((t) => t.onTrack).length;
  const fmt = (t: TargetRow, n: number) => (t.metric === 'VALUE' ? money(n) : `${trim(n)} ${t.unitName || 'pcs'}`);

  return (
    <>
      <PageHero
        title="Targets"
        chip={<><Target />{shown ? monthLabel(shown) : 'Is mahine'}</>}
        meta="Booker, route, brand ya company ka mahine ka target — Invoice se wapsi nikal kar hisab"
        loading={q.isLoading}
        stats={q.data ? [
          { label: 'Mahina guzra', value: `${Math.round(q.data.pace)}%`, hint: `${q.data.daysLeft} din baqi` },
          { label: 'Targets', value: String(rows.length) },
          { label: 'Raftar par', value: `${onTrack}/${rows.length}` },
        ] : [{ label: 'Targets', value: '—' }]}
        actions={<>
          <button type="button" className={heroButton} aria-label="Pichla mahina" onClick={() => shown && setPeriod(shiftMonth(shown, -1))}><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" className={heroButton} aria-label="Agla mahina" onClick={() => shown && setPeriod(shiftMonth(shown, 1))}><ChevronRight className="h-4 w-4" /></button>
          {canManage && <button type="button" className={heroButton} disabled={!shown || copy.isPending} onClick={() => copy.mutate()}><Copy className="h-4 w-4" /><span className="hidden sm:inline">Copy last month</span></button>}
          {canManage && <button type="button" className={heroPrimaryButton} onClick={() => setEdit('new')}><Plus className="h-4 w-4" />New target</button>}
        </>}
      />

      {q.isLoading ? <Skeleton className="h-72 rounded-3xl" /> : !rows.length ? (
        <Panel>
          <Empty icon={<Target className="h-5 w-5" />} text={`${shown ? monthLabel(shown) : 'Is mahine'} ka koi target nahi. Misal: Booker Ali — Rs 5,00,000, ya Brand Dalda — 300 Carton.`}
            action={canManage ? <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEdit('new')}>New target</Button> : undefined} />
        </Panel>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {rows.map((t) => (
            <li key={t.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">{t.label}</p>
                  <p className="text-[0.75rem] text-slate-500">{t.metric === 'VALUE' ? 'Rupay (sale)' : `Quantity${t.unitName ? ` · ${t.unitName}` : ''}`}{t.note ? ` · ${t.note}` : ''}</p>
                </div>
                <Pill tone={t.pct >= 100 ? 'green' : t.onTrack ? 'teal' : 'amber'}>{t.pct >= 100 ? 'Poora' : t.onTrack ? 'Raftar par' : 'Peeche'}</Pill>
                {canManage && (
                  <div className="flex shrink-0">
                    <button type="button" aria-label="Badlein" onClick={() => setEdit(t)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Pencil className="h-4 w-4" /></button>
                    <button type="button" aria-label="Hatayein" onClick={async () => { if (await confirmDialog({ title: 'Delete this target?', danger: true, yes: 'Delete' })) del.mutate(t.id); }}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                )}
              </div>
              <div className="mt-3 flex items-baseline justify-between gap-2">
                <span className="text-[1.25rem] font-bold tabular-nums text-slate-900">{fmt(t, t.achieved)}</span>
                <span className="text-[0.8125rem] text-slate-500">target {fmt(t, t.target)} · <b className="text-slate-800">{Math.round(t.pct)}%</b></span>
              </div>
              <div className="relative mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div className={cn('h-full rounded-full', t.pct >= 100 ? 'bg-success-500' : t.onTrack ? 'bg-teal-500' : 'bg-amber-500')} style={{ width: `${Math.min(100, t.pct)}%` }} />
                {q.data && q.data.pace > 0 && q.data.pace < 100 && <span className="absolute inset-y-0 w-0.5 bg-slate-500/60" style={{ left: `${q.data.pace}%` }} title="Aaj tak itna hona chahiye" />}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-[0.75rem] text-slate-500">
                <span>Ab tak chahiye <b className="block text-slate-800">{fmt(t, t.expectedByNow)}</b></span>
                <span>Baqi <b className="block text-slate-800">{fmt(t, t.remaining)}</b></span>
                <span>Roz chahiye <b className="block text-slate-800">{fmt(t, t.perDayNeeded)}</b></span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {edit && shown && <TargetModal target={edit === 'new' ? null : edit} period={shown} onClose={() => setEdit(null)} />}
    </>
  );
}

function TargetModal({ target, period, onClose }: { target: TargetRow | null; period: string; onClose: () => void }) {
  const qc = useQueryClient();
  const teamQ = useTeam();
  const routesQ = useQuery({ queryKey: [DIST_KEY, 'routes'], queryFn: () => distributionApi.routes(), staleTime: 5 * 60_000 });
  const principalsQ = useQuery({ queryKey: [DIST_KEY, 'principals'], queryFn: phase2Api.principals, staleTime: 5 * 60_000, retry: false });
  const [form, setForm] = useState<SaveTarget>({
    period: target?.period ?? period, userId: target?.userId ?? '', routeId: target?.routeId ?? '', brandId: target?.brandId ?? '',
    supplierId: target?.supplierId ?? '', metric: target?.metric ?? 'VALUE', target: target?.target ?? 0, unitName: target?.unitName ?? '', note: target?.note ?? '',
  });
  const set = <K extends keyof SaveTarget>(k: K, v: SaveTarget[K]) => setForm((f) => ({ ...f, [k]: v }));
  const team = useMemo(() => (teamQ.data ?? []).filter((u) => u.isActive), [teamQ.data]);
  const principals = (principalsQ.data?.suppliers ?? []).filter((s) => s.isPrincipal || s.id === form.supplierId);

  const save = useMutation({
    mutationFn: () => {
      const body: SaveTarget = {
        ...form, userId: form.userId || null, routeId: form.routeId || null, brandId: form.brandId || null, supplierId: form.supplierId || null,
        unitName: form.metric === 'QTY' ? form.unitName?.trim() || null : null, target: Number(form.target), note: form.note?.trim() || undefined,
      };
      return target ? phase2Api.updateTarget(target.id, body) : phase2Api.createTarget(body);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success('Target save ho gaya'); onClose(); },
    onError: (e) => toast.error(distError(e)),
  });

  return (
    <Modal open onClose={onClose} size="lg" title={target ? 'Edit target' : 'New target'}
      description="Jo cheezein chunein sab milni chahiye — kuch na chunein to poore business ka target"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={save.isPending} disabled={!(Number(form.target) > 0)} onClick={() => save.mutate()}>Save</Button></>}>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Mahina" type="month" value={form.period} onChange={(e) => e.target.value && set('period', e.target.value)} />
          <div>
            <p className="mb-1.5 text-[0.8125rem] font-medium text-slate-700">Kis cheez ka</p>
            <Segmented label="Metric" value={form.metric} onChange={(v) => set('metric', v as TargetMetric)}
              items={[{ value: 'VALUE', label: 'Rupay' }, { value: 'QTY', label: 'Quantity' }]} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Booker" value={form.userId ?? ''} onChange={(e) => set('userId', e.target.value)}
            options={[{ value: '', label: 'Koi bhi' }, ...team.map((u) => ({ value: u.id, label: u.fullName }))]} />
          <Select label="Route" value={form.routeId ?? ''} onChange={(e) => set('routeId', e.target.value)}
            options={[{ value: '', label: 'Koi bhi' }, ...(routesQ.data ?? []).map((r) => ({ value: r.id, label: r.name }))]} />
          <Select label="Brand" value={form.brandId ?? ''} onChange={(e) => set('brandId', e.target.value)}
            options={[{ value: '', label: 'Koi bhi' }, ...(principalsQ.data?.brands ?? []).map((b) => ({ value: b.id, label: b.name }))]} />
          <Select label="Principal (company)" value={form.supplierId ?? ''} onChange={(e) => set('supplierId', e.target.value)}
            options={[{ value: '', label: 'Koi bhi' }, ...principals.map((s) => ({ value: s.id, label: s.name }))]}
            hint={principalsQ.data && !principals.length ? 'Pehle Claims → Principals me brands company se jodein' : undefined} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label={form.metric === 'VALUE' ? 'Target (Rs)' : 'Target (quantity)'} type="number" inputMode="decimal" min={1}
            value={form.target ? String(form.target) : ''} onChange={(e) => set('target', Number(e.target.value))} autoFocus />
          {form.metric === 'QTY' && (
            <Input label="Pack (marzi se)" value={form.unitName ?? ''} onChange={(e) => set('unitName', e.target.value)} placeholder="Carton"
              hint="Pack ka naam jaisa items par hai; khali = pcs" />
          )}
        </div>
        <Input label="Note" value={form.note ?? ''} onChange={(e) => set('note', e.target.value)} maxLength={200} />
      </div>
    </Modal>
  );
}
