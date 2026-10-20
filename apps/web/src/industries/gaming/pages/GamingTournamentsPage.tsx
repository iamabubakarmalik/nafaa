/**
 * Tournaments: an event with an entry fee and prizes. Each player's entry is
 * its own bill (paid now or on the player's khata), so entry fees reach the
 * day book and cash register; prizes are paid from the drawer as expenses.
 * A tournament is cancelled, never deleted; a wrong entry is returned by
 * voiding its bill from Sales.
 *
 * Keys: N new tournament · / search · A analytics · G guide.
 */

import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Award, BarChart3, CalendarClock, CheckCircle2, Download, Gamepad2, GraduationCap, ListChecks, Pencil, Play, Plus, Trophy, UserPlus, Users, Wallet, XCircle,
} from 'lucide-react';
import {
  Button, FilterBar, FilterChip, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Select, Textarea, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { downloadCsv } from '@core/lib/csv';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print/PrintButton';
import type { PrintDoc } from '@core/print/types';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { gamingTournamentsApi, type GamingTournament, type TournamentInput } from '../api/tournaments.api';
import { BarList, ConfirmModal, Empty, Info, ListCard, ListLoading, Pill } from '../components/ui';
import { useDebounced, usePageKeys, useSaveKey } from '../hooks/usePageKeys';
import { GAMING_KEYS, MONEY_KEYS, PAY_METHODS, PLATFORMS, TOURNAMENT_STATUS, errorText, longDate, moneyText, numIn, phoneOk, shortDate, timeOf } from '../lib/meta';

type Tab = 'open' | 'done' | 'cancelled' | 'all' | 'analytics';
const PLATFORM_OPTIONS = ['PS5', 'PS4', 'XBOX_SERIES_X', 'PC', 'MOBILE', 'NINTENDO_SWITCH', 'MULTI'].map((v) => ({ value: v, label: PLATFORMS[v] }));
const FORMATS = ['Knockout', 'League', '1v1', '2v2', 'Squad (4)', 'Battle royale'];

export default function GamingTournamentsPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const { sales: money } = useMasked();
  const canSetUp = usePermission(PERMISSIONS.PRODUCTS_EDIT);
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('open');
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim());
  const [editing, setEditing] = useState<GamingTournament | 'new' | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const listQ = useQuery({ queryKey: [GAMING_KEYS.tournaments, 'list', q], queryFn: () => gamingTournamentsApi.list({ search: q || undefined }), placeholderData: (p) => p });
  usePageKeys(searchRef, { n: () => { if (canSetUp) setEditing('new'); }, a: () => setTab('analytics') });
  const refresh = () => [GAMING_KEYS.tournaments, ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const all = listQ.data ?? [];
  const open = all.filter((t) => t.status === 'UPCOMING' || t.status === 'ONGOING').sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  const rows = tab === 'open' ? open : tab === 'done' ? all.filter((t) => t.status === 'COMPLETED') : tab === 'cancelled' ? all.filter((t) => t.status === 'CANCELLED') : all;
  const live = all.filter((t) => t.status !== 'CANCELLED');
  const entries = live.reduce((s, t) => s + t.currentParticipants * Number(t.entryFee), 0);
  const players = live.reduce((s, t) => s + t.currentParticipants, 0);
  const current = openId ? all.find((t) => t.id === openId) ?? null : null;

  const exportCsv = () => {
    if (!rows.length) { toast.error('Is filter me koi tournament nahi'); return; }
    downloadCsv('tournaments.csv', [['Number', 'Naam', 'Game', 'Platform', 'Date', 'Players', 'Had', 'Entry fee', 'Prize pool', 'Jeeta', 'Halat'],
      ...rows.map((t) => [t.tournamentNumber, t.name, t.gameName, PLATFORMS[t.platform] ?? t.platform, t.scheduledDate.slice(0, 10), t.currentParticipants, t.maxParticipants,
        t.entryFee, t.prizePool, t.winnerName ?? '', TOURNAMENT_STATUS[t.status]?.label ?? t.status])]);
  };
  const printList = (): PrintDoc => ({
    title: 'Tournaments',
    meta: [['Aane wale', String(open.length)], ['Players', String(players)]],
    sections: [{
      kind: 'table', title: 'Schedule',
      columns: [{ label: 'Tournament' }, { label: 'Game' }, { label: 'Date' }, { label: 'Players', align: 'right' }, { label: 'Entry', align: 'right' }],
      rows: rows.map((t) => [t.name, `${t.gameName} (${PLATFORMS[t.platform] ?? t.platform})`, shortDate(t.scheduledDate), `${t.currentParticipants}/${t.maxParticipants}`, money(t.entryFee)]),
    }],
  });

  const byGame = useMemo(() => {
    const m = new Map<string, { count: number; value: number }>();
    for (const t of live) {
      const x = m.get(t.gameName) ?? { count: 0, value: 0 };
      x.count += t.currentParticipants; x.value += t.currentParticipants * Number(t.entryFee);
      m.set(t.gameName, x);
    }
    return [...m.entries()].map(([key, v]) => ({ key, ...v })).sort((a, b) => b.value - a.value).slice(0, 12);
  }, [live]);

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Tournaments — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#16a34a', title: 'Tournament banayein', text: 'Game, platform, date, kitne player aur entry fee. Inaam (pehla, doosra, teesra) bhi likh dein — poster aur slip par aate hain.' },
            { icon: UserPlus, color: '#7c3aed', title: 'Player ki entry', text: 'Har entry ka apna bill banta hai — cash, JazzCash ya baad me (khate me). Ghalat entry ho to Sales me us ka bill cancel karein, seat khul jati hai.' },
            { icon: Award, color: '#d97706', title: 'Inaam dein', text: 'Jeetne wale ko paisa drawer se dein — "Inaam dein" se expense ban jata hai aur cash register me kat jata hai.' },
            { icon: XCircle, color: '#e11d48', title: 'Cancel', text: 'Tournament mitta nahi, cancel hota hai. Entry fee wapas karni ho to Sales me har entry ka bill cancel ya return karein.' },
          ]}
          shortcuts={[['N', 'naya tournament'], ['A', 'analytics'], ['/', 'search'], ['G', 'guide']]} />
      )}

      <PageHero title="Tournaments" chip={<><Trophy /> Events</>} loading={listQ.isLoading} busy={listQ.isFetching && !listQ.isLoading}
        meta="Entry fee, players aur inaam — sab hisaab me"
        actions={<>
          <button type="button" onClick={exportCsv} className={heroButton}><Download className="h-4 w-4" />CSV</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printList} label="Print" /></span>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canSetUp && <button type="button" onClick={() => setEditing('new')} title="Naya tournament (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" />Tournament</button>}
        </>}
        stats={[
          { label: 'Aane wale', value: String(open.length) },
          { label: 'Players', value: String(players) },
          { label: 'Entry fee', value: money(entries) },
        ]} />

      <KpiRow cols={4}>
        <KpiCard icon={CalendarClock} color="#0891b2" label="Aane wale / chal rahe" value={open.length} active={tab === 'open'} onClick={() => setTab('open')} />
        <KpiCard icon={Users} color="#7c3aed" label="Players" value={players} hint="Cancel ke ilawa" />
        <KpiCard icon={Wallet} color="#16a34a" label="Entry fee" value={money(entries)} />
        <KpiCard icon={Trophy} color="#d97706" label="Mukammal" value={all.filter((t) => t.status === 'COMPLETED').length} active={tab === 'done'} onClick={() => setTab('done')} />
      </KpiRow>

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Tournament, game ya number…" />}
        chips={search.trim() ? <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip> : undefined}
        onClear={() => setSearch('')} />

      <ViewTabs value={tab} onChange={setTab} hint="Tournament kholein — players, entry aur inaam"
        tabs={[
          { id: 'open', label: 'Aane wale', icon: CalendarClock, count: open.length },
          { id: 'done', label: 'Mukammal', icon: Trophy },
          { id: 'cancelled', label: 'Cancel', icon: XCircle },
          { id: 'all', label: 'Sab', icon: ListChecks },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        ]} />

      {tab === 'analytics' ? (
        listQ.isLoading ? <ListLoading /> : (
          <div className="grid gap-4 lg:grid-cols-2">
            <BarList title="Kaun se game par zyada player (entry fee)" money={money} rows={byGame} />
            <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
              <h3 className="text-[0.9375rem] font-semibold text-slate-900">Khulasa</h3>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-[0.875rem]">
                <div><dt className="text-slate-500">Tournaments</dt><dd className="font-semibold">{live.length}</dd></div>
                <div><dt className="text-slate-500">Players</dt><dd className="font-semibold">{players}</dd></div>
                <div><dt className="text-slate-500">Entry fee</dt><dd className="font-semibold">{money(entries)}</dd></div>
                <div><dt className="text-slate-500">Inaam (likha hua)</dt><dd className="font-semibold">{money(live.reduce((s, t) => s + Number(t.prizePool), 0))}</dd></div>
              </dl>
            </section>
          </div>
        )
      ) : (
        <ListCard>
          {listQ.isLoading ? <ListLoading /> : rows.length === 0 ? (
            <Empty icon={Trophy} title={tab === 'open' ? 'Koi aane wala tournament nahi' : 'Is filter me koi tournament nahi'} text="FIFA, Tekken ya PUBG tournament banayein — entry fee se kamai, players se ronaq."
              action={canSetUp ? <Button onClick={() => setEditing('new')}><Plus className="h-4 w-4" />Tournament banayein</Button> : undefined} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {rows.map((t) => {
                const full = t.currentParticipants >= t.maxParticipants;
                return (
                  <li key={t.id}>
                    <button type="button" onClick={() => setOpenId(t.id)} className="grid w-full gap-2 px-4 py-3 text-left hover:bg-slate-50 sm:px-5 lg:grid-cols-[minmax(0,1.5fr)_10rem_9rem_auto] lg:items-center">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{t.name} <span className="font-mono text-[0.75rem] font-normal text-slate-400">{t.tournamentNumber}</span></p>
                        <p className="truncate text-[0.75rem] text-slate-500">{[t.gameName, PLATFORMS[t.platform] ?? t.platform, t.format, t.winnerName ? `Jeeta: ${t.winnerName}` : null].filter(Boolean).join(' · ')}</p>
                      </div>
                      <p className="text-[0.8125rem] text-slate-700">{shortDate(t.scheduledDate)}<span className="block text-[0.75rem] text-slate-500">{timeOf(t.scheduledDate)}</span></p>
                      <p className="text-[0.875rem] font-semibold tabular-nums text-slate-900">{t.currentParticipants}/{t.maxParticipants}<span className={`block text-[0.75rem] font-medium ${full ? 'text-rose-700' : 'text-slate-500'}`}>{full ? 'Bhar gaya' : `Entry ${money(t.entryFee)}`}</span></p>
                      <div className="flex justify-end"><Pill tone={TOURNAMENT_STATUS[t.status]?.tone ?? ''}>{TOURNAMENT_STATUS[t.status]?.label ?? t.status}</Pill></div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ListCard>
      )}

      {editing && <FormModal tournament={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onDone={(t) => { setEditing(null); refresh(); setOpenId(t.id); }} />}
      {current && <DetailModal t={current} money={money} canSetUp={canSetUp} onEdit={() => { setEditing(current); setOpenId(null); }} onClose={() => setOpenId(null)} onChanged={refresh} />}
    </PageShell>
  );
}

const localInput = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

function FormModal({ tournament: t, onClose, onDone }: { tournament: GamingTournament | null; onClose: () => void; onDone: (t: GamingTournament) => void }) {
  const [v, setV] = useState({
    name: t?.name ?? '', gameName: t?.gameName ?? '', platform: t?.platform ?? 'PS5', format: t?.format ?? '',
    date: localInput(t?.scheduledDate), end: localInput(t?.scheduledEndDate), max: t ? String(t.maxParticipants) : '16',
    fee: t ? String(t.entryFee) : '', first: t?.firstPrize ? String(t.firstPrize) : '', second: t?.secondPrize ? String(t.secondPrize) : '', third: t?.thirdPrize ? String(t.thirdPrize) : '',
    rules: t?.rules ?? '', notes: t?.notes ?? '',
  });
  const set = (patch: Partial<typeof v>) => setV((x) => ({ ...x, ...patch }));
  const max = Math.round(Number(v.max) || 0);
  const errors = {
    name: !v.name.trim() ? 'Naam likhein' : undefined,
    gameName: !v.gameName.trim() ? 'Game likhein' : undefined,
    date: !v.date ? 'Date aur waqt likhein' : undefined,
    end: v.end && v.date && v.end < v.date ? 'Shuru se pehle nahi' : undefined,
    max: max < 2 ? 'Kam se kam 2 player' : t && max < t.currentParticipants ? `${t.currentParticipants} player pehle se hain` : undefined,
  };
  const [tried, setTried] = useState(false);
  const bad = Object.values(errors).some(Boolean);
  const prizes = (numIn(v.first) ?? 0) + (numIn(v.second) ?? 0) + (numIn(v.third) ?? 0);
  const save = useMutation({
    mutationFn: () => {
      const payload: TournamentInput = {
        name: v.name.trim(), gameName: v.gameName.trim(), platform: v.platform, format: v.format.trim() || undefined, maxParticipants: max,
        entryFee: numIn(v.fee) ?? 0, firstPrize: numIn(v.first) ?? 0, secondPrize: numIn(v.second) ?? 0, thirdPrize: numIn(v.third) ?? 0, prizePool: prizes,
        scheduledDate: new Date(v.date).toISOString(), scheduledEndDate: v.end ? new Date(v.end).toISOString() : undefined,
        rules: v.rules.trim() || undefined, notes: v.notes.trim() || undefined,
      };
      return t ? gamingTournamentsApi.update(t.id, payload) : gamingTournamentsApi.create(payload);
    },
    onSuccess: (r) => { toast.success(t ? 'Tournament save' : `${r.tournamentNumber} ban gaya — ab players ki entry karein`); onDone(r); },
    onError: (e) => toast.error(errorText(e, 'Save nahi hua')),
  });
  const submit = () => { setTried(true); if (!bad && !save.isPending) save.mutate(); };
  useSaveKey(submit);
  const e = (k: keyof typeof errors) => (tried ? errors[k] : undefined);
  return (
    <Modal open onClose={onClose} size="lg" title={t ? `${t.name} — badlein` : 'Naya tournament'} description="Entry fee har player ka alag bill banti hai"
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={save.isPending} onClick={submit}><CheckCircle2 className="h-4 w-4" />Save (Ctrl+S)</Button></>}>
      <form className="space-y-4" onSubmit={(ev) => { ev.preventDefault(); submit(); }}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Naam" required value={v.name} onChange={(x) => set({ name: x.target.value })} placeholder="Friday FIFA Cup" error={e('name')} />
          <Input label="Game" required value={v.gameName} onChange={(x) => set({ gameName: x.target.value })} placeholder="FC 25, Tekken 8, PUBG" error={e('gameName')} />
          <Select label="Platform" value={v.platform} onChange={(x) => set({ platform: x.target.value })} options={PLATFORM_OPTIONS} />
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <Input label="Shuru" required type="datetime-local" value={v.date} onChange={(x) => set({ date: x.target.value })} error={e('date')} />
          <Input label="Khatam" type="datetime-local" value={v.end} onChange={(x) => set({ end: x.target.value })} error={e('end')} hint="Marzi hai" />
          <Input label="Kitne player" required inputMode="numeric" value={v.max} onChange={(x) => set({ max: x.target.value.replace(/\D/g, '') })} error={e('max')} />
          <Input label="Entry fee (Rs)" inputMode="decimal" value={v.fee} onChange={(x) => set({ fee: moneyText(x.target.value) })} placeholder="0" hint="0 = free" />
        </div>
        <div>
          <p className="mb-1 text-[0.8125rem] font-medium text-slate-700">Format</p>
          <div className="flex flex-wrap gap-1.5">
            {FORMATS.map((f) => <button key={f} type="button" onClick={() => set({ format: v.format === f ? '' : f })} className={`h-8 rounded-lg px-2.5 text-[0.8125rem] font-semibold ring-1 ${v.format === f ? 'bg-brand-600 text-brand-fg ring-brand-600' : 'ring-slate-200 hover:bg-slate-50'}`}>{f}</button>)}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Pehla inaam (Rs)" inputMode="decimal" value={v.first} onChange={(x) => set({ first: moneyText(x.target.value) })} />
          <Input label="Doosra inaam (Rs)" inputMode="decimal" value={v.second} onChange={(x) => set({ second: moneyText(x.target.value) })} />
          <Input label="Teesra inaam (Rs)" inputMode="decimal" value={v.third} onChange={(x) => set({ third: moneyText(x.target.value) })} hint={prizes ? `Kul inaam Rs ${prizes}` : undefined} />
        </div>
        <Textarea label="Qawaid (rules)" rows={3} value={v.rules} onChange={(x) => set({ rules: x.target.value })} placeholder="Match 6 minute, extra time nahi, apna controller laa sakte hain" />
        <Textarea label="Note" rows={2} value={v.notes} onChange={(x) => set({ notes: x.target.value })} />
      </form>
    </Modal>
  );
}

function DetailModal({ t, money, canSetUp, onEdit, onClose, onChanged }: {
  t: GamingTournament; money: (n: number) => string; canSetUp: boolean; onEdit: () => void; onClose: () => void; onChanged: () => void;
}) {
  const canEnter = usePermission(PERMISSIONS.POS_USE);
  const canPrize = usePermission(PERMISSIONS.EXPENSES_CREATE);
  const qc = useQueryClient();
  const playersQ = useQuery({ queryKey: [GAMING_KEYS.tournaments, 'players', t.id], queryFn: () => gamingTournamentsApi.players(t.id) });
  const [panel, setPanel] = useState<'register' | 'prize' | 'complete' | 'cancel' | null>(null);
  const done = () => { setPanel(null); onChanged(); qc.invalidateQueries({ queryKey: [GAMING_KEYS.tournaments, 'players', t.id] }); };
  const start = useMutation({ mutationFn: () => gamingTournamentsApi.start(t.id), onSuccess: () => { toast.success('Tournament shuru'); onChanged(); }, onError: (e) => toast.error(errorText(e, 'Nahi hua')) });
  const players = playersQ.data?.players ?? [];
  const prizes = playersQ.data?.prizes ?? [];
  const open = t.status === 'UPCOMING' || t.status === 'ONGOING';
  const full = t.currentParticipants >= t.maxParticipants;
  const slip = (): PrintDoc => ({
    title: t.name, subtitle: `${t.gameName} · ${PLATFORMS[t.platform] ?? t.platform} · ${longDate(t.scheduledDate)} ${timeOf(t.scheduledDate)}`,
    meta: [['Entry', money(t.entryFee)], ['Inaam', money(t.prizePool)], ['Players', `${t.currentParticipants}/${t.maxParticipants}`]],
    sections: [
      { kind: 'table', title: 'Players', columns: [{ label: '#' }, { label: 'Naam' }, { label: 'Phone' }, { label: 'Bill' }],
        rows: players.filter((p) => !p.voided).map((p, i) => [String(i + 1), p.line ?? p.name, p.phone ?? '—', p.saleNumber]) },
      ...(t.rules ? [{ kind: 'text' as const, title: 'Qawaid', text: t.rules }] : []),
    ],
  });
  return (
    <Modal open onClose={onClose} size="lg" title={t.name} description={`${t.tournamentNumber} · ${TOURNAMENT_STATUS[t.status]?.label ?? t.status}`}
      footer={<div className="flex w-full flex-wrap items-center gap-2">
        <PrintButton doc={slip} label="Player list" size="sm" />
        <span className="flex-1" />
        {canSetUp && open && <Button size="sm" variant="secondary" onClick={onEdit}><Pencil className="h-3.5 w-3.5" />Badlein</Button>}
        {canSetUp && open && <Button size="sm" variant="secondary" onClick={() => setPanel('cancel')}><XCircle className="h-3.5 w-3.5" />Cancel</Button>}
        {canSetUp && t.status === 'UPCOMING' && <Button size="sm" variant="secondary" loading={start.isPending} onClick={() => start.mutate()}><Play className="h-3.5 w-3.5" />Shuru</Button>}
        {canSetUp && open && <Button size="sm" variant="secondary" onClick={() => setPanel('complete')}><Trophy className="h-3.5 w-3.5" />Nateeja</Button>}
        {canPrize && t.status !== 'CANCELLED' && <Button size="sm" variant="secondary" onClick={() => setPanel('prize')}><Award className="h-3.5 w-3.5" />Inaam dein</Button>}
        {canEnter && open && !full && <Button size="sm" onClick={() => setPanel('register')}><UserPlus className="h-3.5 w-3.5" />Entry</Button>}
      </div>}>
      <div className="space-y-3 text-[0.875rem]">
        <div className="grid gap-3 sm:grid-cols-2">
          <Info icon={Gamepad2} title="Game">
            <p className="font-semibold text-slate-900">{t.gameName} · {PLATFORMS[t.platform] ?? t.platform}</p>
            <p className="text-slate-600">{[t.format, `${longDate(t.scheduledDate)} ${timeOf(t.scheduledDate)}`].filter(Boolean).join(' · ')}</p>
          </Info>
          <Info icon={Trophy} title="Inaam">
            <p className="font-semibold text-slate-900">{money(t.prizePool)}</p>
            <p className="text-slate-600">{[t.firstPrize ? `1st ${money(t.firstPrize)}` : null, t.secondPrize ? `2nd ${money(t.secondPrize)}` : null, t.thirdPrize ? `3rd ${money(t.thirdPrize)}` : null].filter(Boolean).join(' · ') || '—'}</p>
            {t.winnerName && <p className="mt-1 font-semibold text-amber-700">Jeeta: {t.winnerName}{t.runnerUpName ? ` · Doosra: ${t.runnerUpName}` : ''}</p>}
          </Info>
        </div>
        <section>
          <h4 className="mb-1.5 text-[0.8125rem] font-semibold text-slate-700">Players ({t.currentParticipants}/{t.maxParticipants}) · Entry {money(t.entryFee)}</h4>
          {playersQ.isLoading ? <ListLoading rows={3} /> : players.length === 0 ? (
            <p className="rounded-xl bg-slate-50 px-3 py-2 text-slate-500">{Number(t.entryFee) > 0 ? 'Abhi koi entry nahi' : 'Free tournament — players ka bill nahi banta, list sirf ginti me hai'}</p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200">
              {players.map((p, i) => (
                <li key={p.saleId} className={`flex items-center gap-3 px-3 py-2 ${p.voided ? 'opacity-50' : ''}`}>
                  <span className="w-6 text-[0.75rem] tabular-nums text-slate-400">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate"><span className="font-semibold text-slate-900">{p.name}</span>{p.phone ? <span className="text-slate-500"> · {p.phone}</span> : null}</span>
                  <span className="font-mono text-[0.75rem] text-slate-400">{p.saleNumber}</span>
                  {p.voided ? <Pill tone="bg-rose-50 text-rose-700 ring-rose-200">Cancel</Pill> : p.due > 0 ? <Pill tone="bg-amber-50 text-amber-800 ring-amber-200">{money(p.due)} baqi</Pill> : <Pill tone="bg-emerald-50 text-emerald-700 ring-emerald-200">Paid</Pill>}
                </li>
              ))}
            </ul>
          )}
        </section>
        {prizes.length > 0 && (
          <section>
            <h4 className="mb-1.5 text-[0.8125rem] font-semibold text-slate-700">Diye gaye inaam</h4>
            <ul className="space-y-1">{prizes.map((p) => <li key={p.id} className="flex justify-between gap-2 text-slate-700"><span className="truncate">{p.title}</span><span className="shrink-0 font-semibold tabular-nums">{money(p.amount)}</span></li>)}</ul>
          </section>
        )}
        {t.rules && <p className="whitespace-pre-line rounded-xl bg-slate-50 px-3 py-2 text-slate-600">{t.rules}</p>}
      </div>
      {panel === 'register' && <RegisterModal t={t} money={money} onClose={() => setPanel(null)} onDone={done} />}
      {panel === 'prize' && <PrizeModal t={t} onClose={() => setPanel(null)} onDone={done} />}
      {panel === 'complete' && <CompleteModal t={t} onClose={() => setPanel(null)} onDone={done} />}
      {panel === 'cancel' && <CancelModal t={t} onClose={() => setPanel(null)} onDone={done} />}
    </Modal>
  );
}

function RegisterModal({ t, money, onClose, onDone }: { t: GamingTournament; money: (n: number) => string; onClose: () => void; onDone: () => void }) {
  const fee = Number(t.entryFee) || 0;
  const [v, setV] = useState({ name: '', phone: '', tag: '', paid: '', method: 'CASH' });
  const set = (patch: Partial<typeof v>) => setV((x) => ({ ...x, ...patch }));
  const paid = v.paid === '' ? fee : Math.min(numIn(v.paid) ?? 0, fee);
  const errors = {
    name: !v.name.trim() ? 'Naam likhein' : undefined,
    phone: !phoneOk(v.phone) ? '10 se 15 hindse' : paid < fee && !v.phone.trim() ? 'Baqi fee khate me — phone zaroori' : undefined,
  };
  const [tried, setTried] = useState(false);
  const save = useMutation({
    mutationFn: () => gamingTournamentsApi.register(t.id, { name: v.name.trim(), phone: v.phone.trim() || undefined, gamerTag: v.tag.trim() || undefined, paidAmount: paid, paymentMethod: v.method }),
    onSuccess: (r) => { toast.success(r.sale ? `Entry ho gayi — bill ${r.sale.saleNumber}` : 'Entry ho gayi'); onDone(); },
    onError: (e) => toast.error(errorText(e, 'Entry nahi hui')),
  });
  const submit = () => { setTried(true); if (!Object.values(errors).some(Boolean) && !save.isPending) save.mutate(); };
  useSaveKey(submit);
  return (
    <Modal open onClose={onClose} size="sm" title="Player ki entry" description={`${t.name} · ${t.currentParticipants + 1}/${t.maxParticipants}`}
      footer={<><Button variant="secondary" onClick={onClose}>Wapas</Button><Button loading={save.isPending} onClick={submit}><UserPlus className="h-4 w-4" />Entry karein</Button></>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Input label="Player ka naam" required autoFocus value={v.name} onChange={(e) => set({ name: e.target.value })} error={tried ? errors.name : undefined} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Phone" inputMode="tel" value={v.phone} onChange={(e) => set({ phone: e.target.value })} error={tried ? errors.phone : undefined} hint="Khata isi se banta hai" />
          <Input label="Gamer tag / team" value={v.tag} onChange={(e) => set({ tag: e.target.value })} hint="Marzi hai" />
        </div>
        {fee > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Fee abhi mili" inputMode="decimal" value={v.paid === '' ? String(fee) : v.paid} onChange={(e) => set({ paid: moneyText(e.target.value) })}
              hint={paid < fee ? `${money(fee - paid)} khate me` : `Poori ${money(fee)}`} />
            <Select label="Kaise mili" value={v.method} onChange={(e) => set({ method: e.target.value })} options={PAY_METHODS} />
          </div>
        )}
      </form>
    </Modal>
  );
}

function PrizeModal({ t, onClose, onDone }: { t: GamingTournament; onClose: () => void; onDone: () => void }) {
  const preset: Record<string, number> = { '1': Number(t.firstPrize) || 0, '2': Number(t.secondPrize) || 0, '3': Number(t.thirdPrize) || 0, '0': 0 };
  const [v, setV] = useState({ place: '1', name: t.winnerName ?? '', amount: preset['1'] ? String(preset['1']) : '', method: 'CASH' });
  const set = (patch: Partial<typeof v>) => setV((x) => ({ ...x, ...patch }));
  const amount = numIn(v.amount) ?? 0;
  const [tried, setTried] = useState(false);
  const errors = { name: !v.name.trim() ? 'Kis ko diya' : undefined, amount: !(amount > 0) ? 'Amount likhein' : undefined };
  const save = useMutation({
    mutationFn: () => gamingTournamentsApi.prize(t.id, { name: v.name.trim(), place: Number(v.place), amount, paymentMethod: v.method }),
    onSuccess: (r) => { toast.success(`Inaam diya — expense ${r.expense.expenseNumber}`); onDone(); },
    onError: (e) => toast.error(errorText(e, 'Inaam save nahi hua')),
  });
  const submit = () => { setTried(true); if (!Object.values(errors).some(Boolean) && !save.isPending) save.mutate(); };
  useSaveKey(submit);
  return (
    <Modal open onClose={onClose} size="sm" title="Inaam dein" description="Drawer se diya paisa expense me jata hai"
      footer={<><Button variant="secondary" onClick={onClose}>Wapas</Button><Button loading={save.isPending} onClick={submit}><Award className="h-4 w-4" />Inaam save</Button></>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Select label="Position" value={v.place} onChange={(e) => set({ place: e.target.value, amount: preset[e.target.value] ? String(preset[e.target.value]) : v.amount, name: e.target.value === '2' ? t.runnerUpName ?? '' : e.target.value === '1' ? t.winnerName ?? v.name : v.name })}
          options={[{ value: '1', label: 'Pehla' }, { value: '2', label: 'Doosra' }, { value: '3', label: 'Teesra' }, { value: '0', label: 'Aur koi' }]} />
        <Input label="Kis ko" required value={v.name} onChange={(e) => set({ name: e.target.value })} error={tried ? errors.name : undefined} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Amount (Rs)" required inputMode="decimal" value={v.amount} onChange={(e) => set({ amount: moneyText(e.target.value) })} error={tried ? errors.amount : undefined} />
          <Select label="Kaise diya" value={v.method} onChange={(e) => set({ method: e.target.value })} options={PAY_METHODS} hint={v.method === 'CASH' ? 'Drawer se kat-ta hai' : undefined} />
        </div>
      </form>
    </Modal>
  );
}

function CompleteModal({ t, onClose, onDone }: { t: GamingTournament; onClose: () => void; onDone: () => void }) {
  const [winner, setWinner] = useState(t.winnerName ?? '');
  const [runner, setRunner] = useState(t.runnerUpName ?? '');
  const save = useMutation({
    mutationFn: () => gamingTournamentsApi.complete(t.id, winner.trim(), runner.trim() || undefined),
    onSuccess: () => { toast.success('Nateeja save — ab inaam dein'); onDone(); },
    onError: (e) => toast.error(errorText(e, 'Save nahi hua')),
  });
  return (
    <ConfirmModal title="Nateeja" cta="Mukammal karein" busy={save.isPending} onClose={onClose} onConfirm={() => { if (!winner.trim()) { toast.error('Jeetne wale ka naam likhein'); return; } save.mutate(); }}
      text={<div className="space-y-3"><Input label="Jeetne wala" required value={winner} onChange={(e) => setWinner(e.target.value)} /><Input label="Doosre number par" value={runner} onChange={(e) => setRunner(e.target.value)} /></div>} />
  );
}

function CancelModal({ t, onClose, onDone }: { t: GamingTournament; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const save = useMutation({
    mutationFn: () => gamingTournamentsApi.cancel(t.id, reason.trim()),
    onSuccess: () => { toast.success('Tournament cancel — entry fee wapas karni ho to Sales me bill cancel karein'); onDone(); },
    onError: (e) => toast.error(errorText(e, 'Cancel nahi hua')),
  });
  return (
    <ConfirmModal title={`${t.name} cancel karein?`} cta="Cancel karein" danger busy={save.isPending} onClose={onClose}
      onConfirm={() => { if (!reason.trim()) { toast.error('Wajah likhein'); return; } save.mutate(); }}
      text={<div className="space-y-3"><p>{t.currentParticipants} player ki entry hai. Fee khud wapas nahi hoti — Sales me har entry ka bill cancel karein.</p><Input label="Wajah" value={reason} onChange={(e) => setReason(e.target.value)} /></div>} />
  );
}
