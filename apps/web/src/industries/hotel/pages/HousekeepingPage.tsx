/**
 * Housekeeping: cleaning, linen and repair jobs per room. Check-out makes
 * the cleaning job itself; the desk gives it to a cleaner, who starts and
 * finishes it — the room is then clean and, if empty, ready to sell. A
 * problem found sends an empty room to repair.
 *
 * Keys: N new job · / search · 1 open · 2 done · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, ClipboardList, Clock, DoorOpen, GraduationCap, Play, Plus, Sparkles, UserPlus, X } from 'lucide-react';
import {
  Button, FilterBar, Input, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Select, Skeleton, Textarea, ViewTabs, heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { cn } from '@core/lib/cn';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { housekeepingApi, type HousekeepingTask, type TaskPriority, type TaskType } from '../api/housekeeping.api';
import { roomsApi } from '../api/rooms.api';
import { ALL_HOTEL_KEYS, HOTEL_KEYS, PRIORITIES, TASK_STATUS, TASK_TYPES, apiError, clock, priorityOf, taskLabel } from '../components/meta';

type View = 'open' | 'done' | 'all';
type Dialog = { kind: 'new' } | { kind: 'assign' | 'complete' | 'cancel'; task: HousekeepingTask } | null;

function NewTask({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const rooms = useQuery({ queryKey: [HOTEL_KEYS.rooms, 'active'], queryFn: () => roomsApi.list({}) });
  const [roomId, setRoomId] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('DAILY_CLEAN');
  const [priority, setPriority] = useState<TaskPriority>('NORMAL');
  const [assignedName, setAssignedName] = useState('');
  const [notes, setNotes] = useState('');
  const go = useMutation({
    mutationFn: () => housekeepingApi.create({ roomId, taskType, priority, assignedName: assignedName.trim() || undefined, notes: notes.trim() || undefined }),
    onSuccess: () => { toast.success('Kaam likh diya'); onDone(); },
    onError: (e) => toast.error(apiError(e, 'Kaam nahi bana')),
  });
  return (
    <Modal open onClose={onClose} size="md" title="Naya kaam" description="Kis room me kya karna hai"
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button disabled={!roomId} loading={go.isPending} onClick={() => go.mutate()}>Save</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select data-autofocus label="Room" required value={roomId} onChange={(e) => setRoomId(e.target.value)} placeholder="Room chunein"
          options={(rooms.data ?? []).map((r) => ({ value: r.id, label: `${r.roomNumber} · ${r.roomType?.name ?? ''}` }))} />
        <Select label="Kaam" value={taskType} onChange={(e) => setTaskType(e.target.value as TaskType)} options={TASK_TYPES.map((t) => ({ value: t.id, label: t.label }))} />
        <Select label="Kitna jaldi" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} options={PRIORITIES.map((p) => ({ value: p.id, label: p.label }))} />
        <Input label="Kis ko dena hai" value={assignedName} onChange={(e) => setAssignedName(e.target.value)} placeholder="Aslam (safai wala)" />
        <Textarea wrapperClassName="sm:col-span-2" rows={2} label="Note" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Guest ne extra towel manga…" />
      </div>
    </Modal>
  );
}

export default function HousekeepingPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const canManage = usePermission(PERMISSIONS.SERVICE_BOOKINGS_MANAGE);
  const searchRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<View>('open');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [text, setText] = useState('');
  const [issue, setIssue] = useState('');
  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);

  const list = useQuery({ queryKey: [HOTEL_KEYS.housekeeping, view, query], queryFn: () => housekeepingApi.list({ view, search: query || undefined }), refetchInterval: 60_000, placeholderData: (p) => p });
  const sum = useQuery({ queryKey: [HOTEL_KEYS.housekeeping, 'summary'], queryFn: () => housekeepingApi.summary(), refetchInterval: 60_000 });
  const done = () => { ALL_HOTEL_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] })); setDialog(null); setText(''); setIssue(''); };
  const act = useMutation({
    mutationFn: async ({ kind, task }: { kind: 'start' | 'assign' | 'complete' | 'cancel'; task: HousekeepingTask }) => {
      if (kind === 'start') return housekeepingApi.start(task.id);
      if (kind === 'assign') return housekeepingApi.assign(task.id, text.trim());
      if (kind === 'cancel') return housekeepingApi.cancel(task.id, text.trim());
      return housekeepingApi.complete(task.id, { notes: text.trim() || undefined, issueFound: issue.trim() || undefined });
    },
    onSuccess: (_, v) => { toast.success(v.kind === 'complete' ? `Room ${v.task.roomNumber}: kaam ho gaya` : v.kind === 'start' ? 'Kaam shuru' : v.kind === 'assign' ? 'Kaam de diya' : 'Kaam cancel'); done(); },
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canManage) { e.preventDefault(); setDialog({ kind: 'new' }); }
      if (e.key === '1') setView('open');
      if (e.key === '2') setView('done');
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canManage]);

  const s = sum.data;
  const rows = list.data ?? [];
  return (
    <PageShell>
      <PageHero
        title="Housekeeping"
        chip={<><Sparkles /> Safai aur marammat</>}
        meta="Check-out ke baad safai ka kaam khud banta hai"
        busy={list.isFetching && !list.isLoading}
        loading={sum.isLoading}
        actions={<>
          <Link to="/hotel/rooms" className={heroButton}><DoorOpen className="h-4 w-4" /><span className="hidden sm:inline">Room board</span></Link>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <button type="button" onClick={() => setDialog({ kind: 'new' })} title="Naya kaam (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Naya kaam</button>}
        </>}
        stats={s ? [{ label: 'Khule kaam', value: s.pending + s.assigned + s.inProgress }, { label: 'Ganday room', value: s.dirtyRooms }, { label: 'Aaj mukammal', value: s.completedToday }] : [{ label: 'Khule kaam', value: '—' }]}
      />

      <KpiRow cols={5}>
        {!s ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Clock} color="#d97706" label="Kisi ko nahi diya" value={s.pending} onClick={() => setView('open')} />
          <KpiCard icon={UserPlus} color="#0284c7" label="Diya gaya" value={s.assigned} onClick={() => setView('open')} />
          <KpiCard icon={Play} color="#4f46e5" label="Chal raha" value={s.inProgress} onClick={() => setView('open')} />
          <KpiCard icon={AlertTriangle} color={s.urgent ? '#e11d48' : '#64748b'} label="Foran / jaldi" value={s.urgent} hint="Aane wale guest ke room pehle" />
          <KpiCard icon={CheckCircle2} color="#16a34a" label="Aaj mukammal" value={s.completedToday} onClick={() => setView('done')} active={view === 'done'} />
        </>}
      </KpiRow>

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Room number, safai wale ka naam, kaam #…" label="Search" />} />

      <ViewTabs value={view} onChange={setView}
        hint={<>{canManage && <><Kbd>N</Kbd> naya · </>}<Kbd>/</Kbd> search · <Kbd>1</Kbd>-<Kbd>2</Kbd></>}
        tabs={[{ id: 'open', label: 'Khule', icon: ClipboardList, count: view === 'open' ? rows.length : null }, { id: 'done', label: 'Mukammal', icon: CheckCircle2 }, { id: 'all', label: 'Sab', icon: Sparkles }]} />

      {list.isLoading ? <Skeleton className="h-60 rounded-3xl" /> : !rows.length ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <Sparkles className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-900">{view === 'open' ? 'Koi kaam baqi nahi — sab saaf' : 'Kuch nahi mila'}</p>
          <p className="mt-1 text-sm text-slate-500">Guest ke check-out par safai ka kaam khud yahan aata hai.</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          {rows.map((t) => {
            const st = TASK_STATUS[t.status] ?? TASK_STATUS.PENDING;
            const pr = priorityOf(t.priority);
            const open = ['PENDING', 'ASSIGNED', 'IN_PROGRESS'].includes(t.status);
            return (
              <li key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="flex h-11 w-14 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-[1rem] font-bold text-sky-900 ring-1 ring-sky-100">{t.roomNumber}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[0.9375rem] font-semibold text-slate-900">{taskLabel(t.taskType)}</span>
                    <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ring-1', pr.tone)}>{pr.label}</span>
                    <span className={cn('inline-flex items-center gap-1 text-[0.75rem] font-medium', st.tone)}><st.icon className="h-3.5 w-3.5" />{st.label}</span>
                  </span>
                  <span className="block truncate text-[0.75rem] text-slate-500">
                    {t.assignedName ? `${t.assignedName} · ` : ''}{t.taskNumber} · {clock(t.completedAt ?? t.startedAt ?? t.createdAt)}{t.durationMin != null ? ` · ${t.durationMin} min` : ''}{t.notes ? ` · ${t.notes}` : ''}
                  </span>
                  {t.issueFound && <span className="block text-[0.75rem] font-medium text-orange-700">Masla: {t.issueFound}</span>}
                </span>
                {canManage && open && (
                  <span className="flex flex-wrap gap-1.5">
                    {t.status === 'PENDING' && <Button size="sm" variant="secondary" leftIcon={<UserPlus className="h-4 w-4" />} onClick={() => { setText(''); setDialog({ kind: 'assign', task: t }); }}>Dein</Button>}
                    {t.status !== 'IN_PROGRESS' && <Button size="sm" variant="secondary" leftIcon={<Play className="h-4 w-4" />} loading={act.isPending && act.variables?.task.id === t.id && act.variables.kind === 'start'} onClick={() => act.mutate({ kind: 'start', task: t })}>Shuru</Button>}
                    <Button size="sm" variant="success" leftIcon={<CheckCircle2 className="h-4 w-4" />} onClick={() => { setText(''); setIssue(''); setDialog({ kind: 'complete', task: t }); }}>Ho gaya</Button>
                    <button type="button" onClick={() => { setText(''); setDialog({ kind: 'cancel', task: t }); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Cancel"><X className="h-4 w-4" /></button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {dialog?.kind === 'new' && <NewTask onClose={() => setDialog(null)} onDone={done} />}
      {dialog && dialog.kind !== 'new' && (
        <Modal open onClose={() => setDialog(null)} size="sm"
          title={dialog.kind === 'assign' ? 'Kaam kis ko dein' : dialog.kind === 'complete' ? 'Kaam ho gaya' : 'Kaam cancel karein'}
          description={`Room ${dialog.task.roomNumber} · ${taskLabel(dialog.task.taskType)}`}
          footer={<>
            <Button variant="secondary" onClick={() => setDialog(null)}>Rehne dein</Button>
            <Button variant={dialog.kind === 'cancel' ? 'danger' : dialog.kind === 'complete' ? 'success' : 'primary'} disabled={dialog.kind !== 'complete' && !text.trim()} loading={act.isPending}
              onClick={() => act.mutate({ kind: dialog.kind, task: dialog.task })}>{dialog.kind === 'assign' ? 'Dein' : dialog.kind === 'complete' ? 'Mukammal' : 'Cancel'}</Button>
          </>}>
          <div className="space-y-3">
            <Input data-autofocus label={dialog.kind === 'assign' ? 'Naam' : dialog.kind === 'complete' ? 'Note' : 'Wajah'} value={text} onChange={(e) => setText(e.target.value)}
              placeholder={dialog.kind === 'assign' ? 'Aslam' : dialog.kind === 'complete' ? 'Chadar badli, bathroom saaf' : 'Guest ne mana kar diya'} />
            {dialog.kind === 'complete' && <Textarea rows={2} label="Koi masla mila?" value={issue} onChange={(e) => setIssue(e.target.value)} placeholder="AC se pani tapak raha hai…" hint="Likhein to khaali room marammat me chala jayega" />}
          </div>
        </Modal>
      )}

      {guide.isOpen && (
        <PageGuide title="Housekeeping — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Sparkles, color: '#0284c7', title: 'Khud banta hai', text: 'Guest check-out kare ya room badle to purane room ki safai ka kaam khud yahan aata hai.' },
            { icon: UserPlus, color: '#4f46e5', title: 'Dein aur shuru', text: 'Kaam kisi safai wale ko dein; wo shuru kare to waqt ginna shuru.' },
            { icon: CheckCircle2, color: '#16a34a', title: 'Ho gaya', text: 'Room saaf ho jata hai aur khaali ho to dobara bikne ke liye tayyar. Masla likhein to marammat me.' },
          ]}
          shortcuts={[['N', 'naya kaam'], ['/', 'dhoondein'], ['1', 'khule'], ['2', 'mukammal'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}
