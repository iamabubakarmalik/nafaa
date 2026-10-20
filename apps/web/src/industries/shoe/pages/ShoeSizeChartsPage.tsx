/**
 * Size charts: the standard PK/UK, EU, US and cm conversion for gents,
 * ladies and kids, plus the shop's own charts (a brand that runs small,
 * Peshawari chappal sizes). Charts are hidden, never deleted.
 */

import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Copy, EyeOff, Footprints, GraduationCap, Pencil, Plus, Ruler, Trash2 } from 'lucide-react';
import {
  Button, Card, Input, Modal, PageHero, PageShell, Segmented, Select, Skeleton, Switch, Table, TBody, THead, Td, Textarea, Th, Tr,
  heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print/PrintButton';
import type { PrintDoc } from '@core/print/types';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { shoeSizeChartsApi, type ChartRow, type ShoeSizeChart } from '../api/size-charts.api';
import { CHART_KEY, CONVERSION, GENDERS, apiError, genderLabel, opt } from '../components/meta';
import { EmptyBlock, StatusPill, useListKeys } from '../components/ui';

type Std = keyof typeof CONVERSION;
const STD: Array<{ value: Std; label: string; gender: string }> = [
  { value: 'men', label: 'Gents', gender: 'MEN' }, { value: 'women', label: 'Ladies', gender: 'WOMEN' }, { value: 'kids', label: 'Bachay', gender: 'BOYS' },
];
const COLS: Array<{ key: string; label: string }> = [{ key: 'pk', label: 'PK / UK' }, { key: 'eu', label: 'EU' }, { key: 'us', label: 'US' }, { key: 'cm', label: 'Pair (cm)' }];

function chartDoc(title: string, rows: ChartRow[], note?: string | null): PrintDoc {
  return {
    title, subtitle: 'Size chart',
    sections: [{ kind: 'table', columns: COLS.map((c) => ({ label: c.label })), rows: rows.map((r) => COLS.map((c) => r[c.key] ?? '')) }],
    footer: note ?? 'Pair ki lambai: deewar se aedi laga kar angoothe tak, cm me.',
  };
}

function ChartTable({ rows }: { rows: ChartRow[] }) {
  return (
    <Table minWidth="22rem">
      <THead><Tr>{COLS.map((c) => <Th key={c.key}>{c.label}</Th>)}</Tr></THead>
      <TBody>{rows.map((r, i) => <Tr key={i}>{COLS.map((c) => <Td key={c.key} className={c.key === 'pk' ? 'font-semibold text-slate-900' : undefined}>{r[c.key] || '—'}</Td>)}</Tr>)}</TBody>
    </Table>
  );
}

function ChartEditor({ chart, onClose }: { chart: ShoeSizeChart | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(chart?.name ?? '');
  const [gender, setGender] = useState(chart?.gender ?? 'MEN');
  const [notes, setNotes] = useState(chart?.notes ?? '');
  const [rows, setRows] = useState<ChartRow[]>(chart?.mappings?.length ? chart.mappings : [{ pk: '', eu: '', us: '', cm: '' }]);
  const [tried, setTried] = useState(false);
  const filled = rows.filter((r) => COLS.some((c) => (r[c.key] ?? '').trim()));
  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = 'Chart ka naam likhein';
    if (!filled.length) e.rows = 'Kam az kam ek size likhein';
    return e;
  }, [name, filled.length]);
  const save = useMutation({
    mutationFn: () => {
      const body = { name: name.trim(), gender, notes: opt(notes), mappings: filled };
      return chart ? shoeSizeChartsApi.update(chart.id, body) : shoeSizeChartsApi.create(body);
    },
    onSuccess: () => { toast.success('Chart save ho gaya'); qc.invalidateQueries({ queryKey: [CHART_KEY] }); onClose(); },
    onError: (e) => toast.error(apiError(e)),
  });
  const submit = () => {
    setTried(true);
    const first = Object.values(errors)[0];
    if (first) { toast.error(first); return; }
    save.mutate();
  };
  const fill = (k: Std) => setRows(CONVERSION[k].map((r) => ({ ...r })));

  return (
    <Modal open onClose={onClose} size="lg" title={chart ? `${chart.name} badlein` : 'Naya size chart'} description="Har line par ek hi pair ka size har system me"
      footer={<div className="flex w-full gap-2"><Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button><Button className="flex-1" loading={save.isPending} onClick={submit}>Save</Button></div>}>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Naam" required value={name} error={tried ? errors.name : undefined} maxLength={60} placeholder="Servis gents" onChange={(e) => setName(e.target.value)} hint="Brand ya joote ke type ke hisaab se" />
          <Select label="Kis ke liye" value={gender} onChange={(e) => setGender(e.target.value)} options={GENDERS.map((g) => ({ value: g.value, label: g.label }))} />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[0.8125rem] text-slate-600">
          <span>Standard se bharein:</span>
          {STD.map((s) => <Button key={s.value} size="sm" variant="secondary" leftIcon={<Copy className="h-3.5 w-3.5" />} onClick={() => fill(s.value)}>{s.label}</Button>)}
        </div>
        <div className="space-y-2">
          <div className="grid grid-cols-[repeat(4,minmax(0,1fr))_2rem] gap-2 text-[0.75rem] font-semibold uppercase text-slate-500">{COLS.map((c) => <span key={c.key}>{c.label}</span>)}<span /></div>
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-[repeat(4,minmax(0,1fr))_2rem] items-center gap-2">
              {COLS.map((c) => <Input key={c.key} aria-label={c.label} value={r[c.key] ?? ''} maxLength={12} onChange={(e) => setRows((rs) => rs.map((x, n) => (n === i ? { ...x, [c.key]: e.target.value } : x)))} />)}
              <button type="button" aria-label="Line hatayein" onClick={() => setRows((rs) => rs.filter((_, n) => n !== i))} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          {tried && errors.rows && <p className="text-[0.8125rem] font-medium text-rose-600">{errors.rows}</p>}
          <Button size="sm" variant="ghost" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setRows((rs) => [...rs, { pk: '', eu: '', us: '', cm: '' }])}>Line</Button>
        </div>
        <Textarea label="Note" rows={2} value={notes} maxLength={500} placeholder="Ye brand aadha size chhota chalta hai" onChange={(e) => setNotes(e.target.value)} hint="Print par neeche chhapta hai" />
      </div>
    </Modal>
  );
}

export default function ShoeSizeChartsPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const canEdit = usePermission(PERMISSIONS.PRODUCTS_EDIT);
  const [std, setStd] = useState<Std>('men');
  const [editing, setEditing] = useState<ShoeSizeChart | 'new' | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const { data: charts = [], isLoading } = useQuery({ queryKey: [CHART_KEY], queryFn: shoeSizeChartsApi.list });
  const hide = useMutation({
    mutationFn: (c: ShoeSizeChart) => (c.isActive ? shoeSizeChartsApi.deactivate(c.id) : shoeSizeChartsApi.update(c.id, { isActive: true })),
    onSuccess: (c) => { toast.success(c.isActive ? 'Chart wapas dikh raha' : 'Chart chhupa diya'); qc.invalidateQueries({ queryKey: [CHART_KEY] }); },
    onError: (e) => toast.error(apiError(e)),
  });
  const add = useCallback(() => { if (canEdit) setEditing('new'); }, [canEdit]);
  useListKeys(null, add);

  const visible = charts.filter((c) => showHidden || c.isActive);
  const stdLabel = STD.find((s) => s.value === std)!.label;

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Size chart — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Ruler, color: '#2563eb', title: 'Standard chart', text: 'Gents, ladies aur bachon ka PK/UK, EU, US aur cm. Customer ka EU size bataye to yahan se PK size dekhein.' },
            { icon: Footprints, color: '#16a34a', title: 'Pair naapein', text: 'Deewar se aedi laga kar angoothe tak cm me naapein — cm wala column dekhein.' },
            { icon: Pencil, color: '#7c3aed', title: 'Apna chart', text: 'Kisi brand ka size chhota / bara chalta ho to us ka chart banayein aur counter par print kar ke lagayein.' },
          ]}
          shortcuts={[['N', 'naya chart'], ['G', 'guide']]} />
      )}

      <PageHero title="Size chart" chip={<><Ruler />{charts.filter((c) => c.isActive).length} apne chart</>} loading={isLoading}
        meta="PK / UK, EU, US aur pair ki lambai — ek nazar me"
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={() => chartDoc(`${stdLabel} — standard`, [...CONVERSION[std]])} label="Print" /></span>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canEdit && <button type="button" onClick={add} className={heroPrimaryButton}><Plus className="h-4 w-4" />Naya chart</button>}
        </>} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Card className="rounded-2xl" title="Standard chart" description="Pakistan me chalne wale sizes"
          actions={<Segmented value={std} onChange={setStd} items={STD.map((s) => ({ value: s.value, label: s.label }))} label="Kis ka chart" />}>
          <ChartTable rows={[...CONVERSION[std]]} />
        </Card>

        <Card className="rounded-2xl" title="Dukaan ke chart" description="Brand ya type ke apne sizes"
          actions={<Switch checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} label="Chhupe bhi" />}>
          {isLoading ? <div className="space-y-2">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
            : !visible.length ? (
              <EmptyBlock icon={Ruler} title="Abhi koi apna chart nahi" text="Standard chart kaafi hai. Koi brand chhota / bara chalta ho to us ka chart banayein."
                action={canEdit ? <Button leftIcon={<Plus className="h-4 w-4" />} onClick={add}>Naya chart</Button> : undefined} />
            ) : (
              <div className="space-y-4">
                {visible.map((c) => (
                  <div key={c.id} className="rounded-2xl ring-1 ring-slate-200">
                    <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2.5">
                      <p className="min-w-0 flex-1 truncate font-semibold text-slate-900">{c.name}</p>
                      <StatusPill tone="bg-slate-100 text-slate-700">{genderLabel(c.gender)}</StatusPill>
                      {!c.isActive && <StatusPill tone="bg-amber-50 text-amber-800">Chhupa</StatusPill>}
                      <PrintButton doc={() => chartDoc(c.name, c.mappings, c.notes)} label="Print" size="sm" />
                      {canEdit && <Button size="sm" variant="ghost" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditing(c)}>Badlein</Button>}
                      {canEdit && <Button size="sm" variant="ghost" leftIcon={<EyeOff className="h-3.5 w-3.5" />} loading={hide.isPending && hide.variables?.id === c.id} onClick={() => hide.mutate(c)}>{c.isActive ? 'Chhupayein' : 'Dikhayein'}</Button>}
                    </div>
                    <div className="p-3"><ChartTable rows={c.mappings} /></div>
                    {c.notes && <p className="px-4 pb-3 text-[0.8125rem] text-slate-500">{c.notes}</p>}
                  </div>
                ))}
              </div>
            )}
        </Card>
      </div>

      {editing && <ChartEditor chart={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </PageShell>
  );
}
