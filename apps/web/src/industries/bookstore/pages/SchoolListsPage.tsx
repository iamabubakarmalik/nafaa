/**
 * School book lists: per school, session and class, the books and
 * stationery a child needs. A list "Counter par" sells at the POS as a set
 * in one go (Combos tab); before the new session, copy last year's list and
 * change only what the school changed. Lists print for the parents.
 *
 * Keys: N new · / search · G guide.
 */

import { useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Archive, BookOpen, ClipboardList, Copy, GraduationCap, Pencil, Play, Plus, Printer, School as SchoolIcon, ShoppingCart, Square } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import {
  Button, FilterBar, Input, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Select, Skeleton, ViewTabs, heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { usePrinter } from '@core/print';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { schoolListsApi, type SchoolBookList } from '../api/school-lists.api';
import { schoolsApi } from '../api/schools.api';
import { KEYS, LIST_STATUS, apiError, currentSession } from '../lib/meta';
import { ConfirmModal, EmptyBox, cardAction, cardDanger, cardLink, usePageKeys } from '../components/ui';
import { SchoolListEditor } from '../components/SchoolListEditor';

type Tab = 'ACTIVE' | 'DRAFT' | 'CLOSED' | 'ARCHIVED' | 'all';

/** Session after "2026-2027" is "2027-2028". */
const nextSession = (s: string) => {
  const m = /^(\d{4})\s*-\s*(\d{2,4})$/.exec(s.trim());
  return m ? `${Number(m[1]) + 1}-${Number(m[1]) + 2}` : currentSession();
};

export default function SchoolListsPage() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const canEdit = usePermission(PERMISSIONS.PRODUCTS_EDIT);
  const canSell = usePermission(PERMISSIONS.POS_USE);
  const { sales } = useMasked();
  const { print } = usePrinter();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>('ACTIVE');
  const [form, setForm] = useState<SchoolBookList | 'new' | null>(null);
  const [copy, setCopy] = useState<SchoolBookList | null>(null);
  const [archive, setArchive] = useState<SchoolBookList | null>(null);
  const schoolId = params.get('school') ?? '';
  const [session, setSession] = useState('');

  const schoolsQ = useQuery({ queryKey: [KEYS.schools, 'all'], queryFn: () => schoolsApi.list(), staleTime: 60_000 });
  const listQ = useQuery({ queryKey: [KEYS.lists, schoolId], queryFn: () => schoolListsApi.list(schoolId ? { schoolId } : undefined) });
  const all = useMemo(() => listQ.data ?? [], [listQ.data]);
  const sessions = useMemo(() => [...new Set(all.map((l) => l.session))].sort().reverse(), [all]);
  const scoped = useMemo(() => all.filter((l) => !session || l.session === session), [all, session]);
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scoped.filter((l) => (tab === 'all' || l.status === tab) && (!q || [l.title, l.grade, l.section, l.school?.name].some((v) => v?.toLowerCase().includes(q))));
  }, [scoped, search, tab]);
  const count = (s: Tab) => scoped.filter((l) => s === 'all' || l.status === s).length;
  const priceOf = (l: SchoolBookList) => l.bundlePrice ?? l.items.filter((i) => !i.isOptional).reduce((s, i) => s + i.total, 0);
  const notInCatalog = scoped.filter((l) => l.status === 'ACTIVE').reduce((s, l) => s + l.items.filter((i) => !i.productId && !i.isOptional).length, 0);

  const refresh = () => { void qc.invalidateQueries({ queryKey: [KEYS.lists] }); void qc.invalidateQueries({ queryKey: [KEYS.posLists] }); void qc.invalidateQueries({ queryKey: [KEYS.schools] }); };
  const save = useMutation({
    mutationFn: ({ id, body }: { id?: string; body: Record<string, unknown> }) => (id ? schoolListsApi.update(id, body) : schoolListsApi.create(body)),
    onSuccess: () => { toast.success('List save ho gayi'); setForm(null); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Save nahi hui')),
  });
  const status = useMutation({
    mutationFn: ({ l, to }: { l: SchoolBookList; to: string }) => schoolListsApi.updateStatus(l.id, to),
    onSuccess: (_r, { to }) => { toast.success(to === 'ACTIVE' ? 'List counter par — POS ke Combos me set bikega' : 'List counter se hat gayi'); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });
  const duplicate = useMutation({
    mutationFn: ({ l, s }: { l: SchoolBookList; s: string }) => schoolListsApi.duplicate(l.id, s),
    onSuccess: (r) => { toast.success(`${r.title} draft ban gayi — aaj ke rate lag gaye`); setCopy(null); setTab('DRAFT'); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Copy nahi hui')),
  });
  const remove = useMutation({
    mutationFn: (l: SchoolBookList) => schoolListsApi.remove(l.id),
    onSuccess: () => { toast.success('List purani me chali gayi'); setArchive(null); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });

  const printList = (l: SchoolBookList) => print({
    title: `${l.school?.name ?? 'School'} — ${l.grade}${l.section ? ` (${l.section})` : ''}`,
    subtitle: `Kitabon ki list · Session ${l.session}`,
    sections: [
      { kind: 'table', columns: [{ label: '#' }, { label: 'Kitab / cheez' }, { label: 'Subject', wideOnly: true }, { label: 'Adad', align: 'right' }, { label: 'Rate', align: 'right' }],
        rows: l.items.map((i, n) => [String(n + 1), `${i.itemName}${i.isOptional ? ' (marzi)' : ''}`, i.subject ?? '', String(i.quantity), String(i.total)]) },
      { kind: 'rows', rows: [{ label: 'Poore set ki qeemat', value: sales(priceOf(l)), strong: true }] },
    ],
    footer: 'Set dukaan par ek saath milta hai — jo kitab pehle se ho wo nikal di jati hai.',
  });

  usePageKeys(searchRef, canEdit ? { n: () => setForm('new') } : {});
  const schools = schoolsQ.data ?? [];
  const schoolName = schools.find((s) => s.id === schoolId)?.name;

  return (
    <PageShell>
      <PageHero
        title="School lists"
        chip={<><ClipboardList /> Class ke sets</>}
        meta={schoolName ? `${schoolName} ki lists` : 'Har class ki kitaben — counter par ek saath set bikta hai'}
        loading={listQ.isLoading}
        actions={<>
          <Link to="/bookstore/schools" className={heroButton}><SchoolIcon className="h-4 w-4" /><span className="hidden sm:inline">Schools</span></Link>
          {canSell && <Link to="/pos" className={heroButton}><ShoppingCart className="h-4 w-4" /><span className="hidden sm:inline">POS</span></Link>}
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canEdit && <button type="button" onClick={() => setForm('new')} title="Nayi list (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> List</button>}
        </>}
        stats={[
          { label: 'Counter par', value: count('ACTIVE') },
          { label: 'Draft', value: count('DRAFT') },
          { label: 'Session', value: session || 'Sab' },
        ]}
      />

      <KpiRow cols={4}>
        <KpiCard icon={Play} color="#16a34a" label="Counter par" value={count('ACTIVE')} onClick={() => setTab('ACTIVE')} active={tab === 'ACTIVE'} hint="POS ke Combos me" />
        <KpiCard icon={Pencil} color="#64748b" label="Draft" value={count('DRAFT')} onClick={() => setTab('DRAFT')} active={tab === 'DRAFT'} hint="Abhi tayyar ho rahi" />
        <KpiCard icon={SchoolIcon} color="#2563eb" label="School" value={new Set(scoped.map((l) => l.schoolId)).size} />
        <KpiCard icon={BookOpen} color="#d97706" label="Catalog se bahar" value={notInCatalog} hint="Chalti lists ki lines jo POS par nahi bikti" />
      </KpiRow>

      <ViewTabs<Tab> tabs={[
        { id: 'ACTIVE', label: 'Counter par', count: count('ACTIVE') }, { id: 'DRAFT', label: 'Draft', count: count('DRAFT') },
        { id: 'CLOSED', label: 'Band', count: count('CLOSED') }, { id: 'ARCHIVED', label: 'Purani', count: count('ARCHIVED') }, { id: 'all', label: 'Sab', count: count('all') },
      ]} value={tab} onChange={setTab} />
      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Class, school ya list ka naam" label="Search" />}>
        <Select value={schoolId} onChange={(e) => { const p = new URLSearchParams(params); if (e.target.value) p.set('school', e.target.value); else p.delete('school'); setParams(p, { replace: true }); }}
          options={[{ value: '', label: 'Sab school' }, ...schools.map((s) => ({ value: s.id, label: s.name }))]} aria-label="School" size="sm" />
        <Select value={session} onChange={(e) => setSession(e.target.value)} options={[{ value: '', label: 'Har session' }, ...sessions.map((s) => ({ value: s, label: s }))]} aria-label="Session" size="sm" />
      </FilterBar>

      {listQ.isLoading ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-48 rounded-3xl" />)}</div>
        : rows.length === 0 ? (
          <EmptyBox icon={ClipboardList} title={search ? 'Koi list nahi mili' : 'Is tab me koi list nahi'}
            text="School aur class chun kar list banayein; 'Class ki kitaben' se us class ki saari textbooks ek click me jur jati hain. Phir 'Counter par' karein."
            action={canEdit && !search ? <Button onClick={() => setForm('new')} leftIcon={<Plus className="h-4 w-4" />} disabled={!schools.length}>List banayein</Button> : undefined} />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((l) => {
              const st = LIST_STATUS[l.status] ?? LIST_STATUS.DRAFT;
              const outside = l.items.filter((i) => !i.productId).length;
              const optional = l.items.filter((i) => i.isOptional).length;
              return (
                <li key={l.id} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700"><GraduationCap className="h-5 w-5" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900">{l.grade}{l.section ? ` · ${l.section}` : ''}</p>
                      <p className="truncate text-[0.75rem] text-slate-500">{l.school?.name} · {l.session}</p>
                    </div>
                    <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ring-1', st.tone)}>{st.label}</span>
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-2.5 text-center text-[0.75rem]">
                    <div><dt className="text-slate-500">Cheezein</dt><dd className="text-[0.9375rem] font-bold text-slate-900">{l.items.length}</dd></div>
                    <div><dt className="text-slate-500">Discount</dt><dd className="text-[0.9375rem] font-bold text-slate-900">{l.discountPct ? `${l.discountPct}%` : '—'}</dd></div>
                    <div><dt className="text-slate-500">Set</dt><dd className="text-[0.9375rem] font-bold tabular-nums text-slate-900">{sales(priceOf(l))}</dd></div>
                  </dl>
                  <p className="mt-2 truncate text-[0.75rem] text-slate-500">
                    {l.items.slice(0, 4).map((i) => i.itemName).join(', ')}{l.items.length > 4 ? ` +${l.items.length - 4}` : ''}
                  </p>
                  {(outside > 0 || optional > 0) && (
                    <p className="mt-1 text-[0.75rem]">
                      {outside > 0 && <span className="text-amber-700">{outside} catalog se bahar · </span>}
                      {optional > 0 && <span className="text-slate-500">{optional} marzi ki</span>}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <button type="button" onClick={() => printList(l)} className={cardAction}><Printer className="h-3.5 w-3.5" />Print</button>
                    {canEdit && <>
                      <button type="button" onClick={() => setForm(l)} className={cardAction}><Pencil className="h-3.5 w-3.5" />Badlein</button>
                      {l.status !== 'ACTIVE'
                        ? <button type="button" onClick={() => status.mutate({ l, to: 'ACTIVE' })} disabled={status.isPending} className={cardLink}><Play className="h-3.5 w-3.5" />Counter par</button>
                        : <button type="button" onClick={() => status.mutate({ l, to: 'CLOSED' })} disabled={status.isPending} className={cardAction}><Square className="h-3.5 w-3.5" />Band</button>}
                      <button type="button" onClick={() => setCopy(l)} className={cardAction}><Copy className="h-3.5 w-3.5" />Agla session</button>
                      {l.status !== 'ARCHIVED' && <button type="button" onClick={() => setArchive(l)} className={`ml-auto ${cardDanger}`}><Archive className="h-3.5 w-3.5" />Purani</button>}
                    </>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

      <p className="hidden items-center gap-1 px-1 text-[0.75rem] text-slate-500 sm:flex">{canEdit && <><Kbd>N</Kbd> nayi · </>}<Kbd>/</Kbd> search · <Kbd>G</Kbd> guide</p>

      {form && <SchoolListEditor list={form === 'new' ? null : form} schools={schools} presetSchool={schoolId || undefined} pending={save.isPending}
        onSave={(body) => save.mutate({ id: form === 'new' ? undefined : form.id, body })} onClose={() => setForm(null)} />}
      {copy && <CopyModal list={copy} pending={duplicate.isPending} onCopy={(s) => duplicate.mutate({ l: copy, s })} onClose={() => setCopy(null)} />}
      {archive && <ConfirmModal title="List purani karein?" text={`${archive.title} counter se hat jayegi aur "Purani" tab me rahegi. Agle session ke liye wahan se copy ho sakti hai.`} confirm="Purani karein" pending={remove.isPending} onConfirm={() => remove.mutate(archive)} onClose={() => setArchive(null)} />}

      {guide.isOpen && (
        <PageGuide title="School lists — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: ClipboardList, color: '#7c3aed', title: 'List banayein', text: 'School, session aur class chunein. "Class ki kitaben" se us class ki textbooks khud jur jati hain; copy, cover jaisi cheezein dhoond kar jorein.' },
            { icon: Play, color: '#16a34a', title: 'Counter par', text: '"Counter par" karne se POS ke Combos tab me set aata hai. Poora set ek click me, ya jo kitab bachay ke paas hai wo nikal kar.' },
            { icon: Copy, color: '#2563eb', title: 'Naya session', text: 'Season se pehle "Agla session" se pichli list copy karein — aaj ke rate lagte hain, sirf badli hui kitab badlein.' },
            { icon: Printer, color: '#64748b', title: 'Print', text: 'Walidain ke liye list print karein — set ki qeemat neeche likhi hoti hai.' },
          ]}
          tips={['Set ki pakki qeemat likhein to wohi lagti hai; warna lines − discount %.', 'Catalog se bahar wali line (jaise uniform) sirf list par hai — POS par nahi bikti.']}
          shortcuts={[['N', 'nayi'], ['/', 'dhoondein'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function CopyModal({ list, pending, onCopy, onClose }: { list: SchoolBookList; pending: boolean; onCopy: (session: string) => void; onClose: () => void }) {
  const [s, setS] = useState(nextSession(list.session));
  return (
    <Modal open onClose={onClose} size="sm" title="Agle session me copy" description={`${list.title} — nayi list draft banegi`}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button onClick={() => s.trim() && onCopy(s.trim())} disabled={!s.trim()} loading={pending}>Copy karein</Button></>}>
      <Input label="Naya session" value={s} onChange={(e) => setS(e.target.value)} placeholder="2027-2028" hint="Catalog wali kitabon par aaj ka rate lagta hai" autoFocus />
    </Modal>
  );
}
