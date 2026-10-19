/**
 * Kitchen display: tickets (KOT) per station in three lanes — new, cooking,
 * ready. A ticket shows table or token, minutes since it came in (amber
 * after 10, red after 20), each dish with options and notes. Cancel tickets
 * for voided dishes show in red on top. Ready takeaway tokens are listed so
 * the counter can call them. A short beep marks a new ticket.
 *
 * Keys: 1–9 station · 0 all · M sound · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bell, BellOff, CheckCheck, ChefHat, Clock, Flame, GraduationCap, HandPlatter, Printer, XCircle } from 'lucide-react';
import { Button, Kbd, Modal, PageHero, PageShell, Skeleton, ViewTabs, heroButton, heroIconButton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { useAuthStore } from '@core/stores/auth.store';
import { kotApi, type Kot, type KotStatus } from '../api/kot.api';
import { MODE_META, ORDER_KEYS, apiError, minutesSince } from '../lib/orderMeta';
import { printKot } from '../lib/slips';

type Lane = 'new' | 'cooking' | 'ready';
const LANE_OF: Partial<Record<KotStatus, Lane>> = { PENDING: 'new', PRINTED: 'new', ACKNOWLEDGED: 'new', COOKING: 'cooking', READY: 'ready' };
const LANES: Array<{ id: Lane; label: string; color: string }> = [
  { id: 'new', label: 'Naye', color: '#2563eb' },
  { id: 'cooking', label: 'Ban rahe', color: '#ea580c' },
  { id: 'ready', label: 'Tayyar', color: '#16a34a' },
];
const NONE = '-';
const SOUND_KEY = 'nafaa.restaurant.kotSound';

interface TicketLine { id?: string; name: string; quantity: number; modifiers?: string[]; specialInstructions?: string | null; spiceLevel?: string | null; cookingNote?: string | null }

function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.4);
  } catch { /* audio blocked until the page is touched */ }
}

export default function KotDisplayPage() {
  const qc = useQueryClient();
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Restaurant';
  const canCook = usePermission(PERMISSIONS.RESTAURANT_KITCHEN_MANAGE);
  const [station, setStation] = useState<string>('all');
  const [guide, setGuide] = useState(false);
  const [sound, setSound] = useState(() => { try { return localStorage.getItem(SOUND_KEY) !== 'off'; } catch { return true; } });
  const [, tick] = useState(0);
  const seen = useRef<Set<string> | null>(null);

  const q = useQuery({ queryKey: ['restaurant-kot', 'active'], queryFn: () => kotApi.list({ active: true }), refetchInterval: 8_000 });
  const kots = q.data ?? [];

  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 30_000); return () => clearInterval(t); }, []);
  // Beep once for each ticket that was not on the screen before.
  useEffect(() => {
    if (!q.data) return;
    const ids = new Set(q.data.map((k) => k.id));
    if (seen.current && sound && q.data.some((k) => !seen.current!.has(k.id) && k.status !== 'READY')) beep();
    seen.current = ids;
  }, [q.data, sound]);

  const stations = useMemo(() => {
    const m = new Map<string, number>();
    for (const k of kots) if (k.status !== 'CANCELLED') m.set(k.station || NONE, (m.get(k.station || NONE) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [kots]);
  const mine = kots.filter((k) => station === 'all' || (k.station || NONE) === station);
  const cancels = mine.filter((k) => k.status === 'CANCELLED');
  const lane = (id: Lane) => mine.filter((k) => LANE_OF[k.status] === id);
  const readyTokens = useMemo(() => {
    const m = new Map<string, { label: string; all: boolean }>();
    for (const k of kots) {
      if (!k.order || k.order.mode === 'DINE_IN' || k.status === 'CANCELLED') continue;
      const key = k.order.id;
      const label = k.order.token ? `#${k.order.token}` : k.order.customerName || k.order.orderNumber;
      const prev = m.get(key);
      m.set(key, { label, all: (prev?.all ?? true) && k.status === 'READY' });
    }
    return [...m.values()].filter((x) => x.all).map((x) => x.label);
  }, [kots]);

  const move = useMutation({
    mutationFn: ({ id, status }: { id: string; status: KotStatus }) => kotApi.updateStatus(id, status),
    onSuccess: () => ORDER_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
    onError: (e) => toast.error(apiError(e)),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const k = e.key.toLowerCase();
      if (k === '0') setStation('all');
      if (/^[1-9]$/.test(k) && stations[Number(k) - 1]) setStation(stations[Number(k) - 1][0]);
      if (k === 'm') toggleSound();
      if (k === 'g') setGuide(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  const toggleSound = () => setSound((v) => { try { localStorage.setItem(SOUND_KEY, v ? 'off' : 'on'); } catch { /* storage blocked */ } return !v; });

  const late = mine.filter((k) => LANE_OF[k.status] && LANE_OF[k.status] !== 'ready' && minutesSince(k.createdAt) >= 20).length;

  return (
    <PageShell>
      {guide && (
        <Modal open onClose={() => setGuide(false)} size="md" title="Kitchen screen — aasaan tareeqa">
          <ul className="space-y-2 text-[0.875rem] text-slate-700">
            <li><b>Naye</b>: ticket aate hi yahan. "Shuru" dabayein — saamaan stock se nikal jata hai (recipe ho to).</li>
            <li><b>Ban rahe</b>: tayyar ho to "Tayyar". Waiter ko floor par hara nishan dikhta hai.</li>
            <li><b>Tayyar</b>: plate nikal gayi to "De diya".</li>
            <li><b>Laal ticket</b>: dish cancel hui — mat banayein. 30 minute baad khud hat jata hai.</li>
            <li>Waqt: 10 minute ke baad peela, 20 ke baad laal. <Kbd>1</Kbd>–<Kbd>9</Kbd> station, <Kbd>M</Kbd> awaaz.</li>
          </ul>
        </Modal>
      )}
      <PageHero
        title="Kitchen"
        chip={<><ChefHat />{station === 'all' ? 'Sab stations' : station === NONE ? 'Bina station' : station}</>}
        busy={q.isFetching && !q.isLoading}
        meta="Har 8 second taaza"
        loading={q.isLoading}
        actions={<>
          <button type="button" onClick={toggleSound} className={heroButton} title="Awaaz (M)">{sound ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}{sound ? 'Awaaz on' : 'Awaaz off'}</button>
          <button type="button" onClick={() => setGuide(true)} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={[
          { label: 'Naye', value: String(lane('new').length) },
          { label: 'Ban rahe', value: String(lane('cooking').length) },
          { label: 'Tayyar', value: String(lane('ready').length) },
          { label: '20 min se zyada', value: String(late), hint: late ? 'jaldi karein' : undefined },
        ]}
      />

      {stations.length > 1 && (
        <ViewTabs value={station} onChange={setStation}
          tabs={[{ id: 'all', label: 'Sab', count: kots.filter((k) => k.status !== 'CANCELLED').length }, ...stations.map(([s, n]) => ({ id: s, label: s === NONE ? 'Bina station' : s, count: n }))]} />
      )}

      {readyTokens.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-200">
          <HandPlatter className="h-5 w-5 text-emerald-700" />
          <span className="text-[0.875rem] font-semibold text-emerald-900">Counter par bulayein:</span>
          {readyTokens.map((t) => <span key={t} className="rounded-xl bg-emerald-600 px-3 py-1 text-[1rem] font-bold text-white">{t}</span>)}
        </div>
      )}

      {cancels.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {cancels.map((k) => <Ticket key={k.id} k={k} cancel onPrint={() => printKot(k, shopName)} />)}
        </div>
      )}

      {q.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-96 rounded-3xl" />)}</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {LANES.map((l) => {
            const list = lane(l.id);
            return (
              <section key={l.id} className="flex min-h-[18rem] flex-col rounded-3xl bg-slate-100/70 p-3 ring-1 ring-slate-200/80">
                <h2 className="mb-2 flex items-center justify-between px-1 text-[0.875rem] font-semibold text-slate-900">
                  <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: l.color }} />{l.label}</span>
                  <span className="rounded-full bg-white px-2 text-[0.75rem] tabular-nums text-slate-600">{list.length}</span>
                </h2>
                {!list.length ? <p className="m-auto text-[0.8125rem] text-slate-400">Khaali</p> : (
                  <div className="space-y-3">
                    {list.map((k) => (
                      <Ticket key={k.id} k={k} busy={move.isPending && move.variables?.id === k.id} canCook={canCook}
                        onPrint={() => { printKot(k, shopName); if (k.status === 'PENDING' && canCook) move.mutate({ id: k.id, status: 'PRINTED' }); }}
                        onNext={(s) => move.mutate({ id: k.id, status: s })} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
      {!q.isLoading && !kots.length && <p className="text-center text-[0.875rem] text-slate-500">Kitchen me koi ticket nahi. Naya order "Kitchen bhejein" se yahan aata hai.</p>}
    </PageShell>
  );
}

function Ticket({ k, cancel, busy, canCook, onPrint, onNext }: {
  k: Kot; cancel?: boolean; busy?: boolean; canCook?: boolean; onPrint: () => void; onNext?: (s: KotStatus) => void;
}) {
  const snap = (k.itemsSnapshot ?? {}) as { items?: TicketLine[]; specialRequests?: string | null; table?: { tableNumber: string; section?: string | null } | null; token?: number | null };
  const o = k.order;
  const age = minutesSince(k.createdAt);
  const table = snap.table ?? o?.table;
  const mode = o?.mode ? MODE_META[o.mode as keyof typeof MODE_META] : null;
  const token = o?.token ?? snap.token;
  const title = table ? `Table ${table.tableNumber}` : token ? `Token #${token}` : o?.customerName || o?.orderNumber || k.kotNumber;
  const timeTone = cancel ? 'bg-rose-600 text-white' : age >= 20 ? 'bg-rose-100 text-rose-800' : age >= 10 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-700';
  const lane = LANE_OF[k.status];
  return (
    <article className={cn('overflow-hidden rounded-2xl bg-white shadow-sm ring-1', cancel ? 'ring-2 ring-rose-400' : age >= 20 && lane !== 'ready' ? 'ring-2 ring-rose-300' : 'ring-slate-200')}>
      <header className={cn('flex items-start justify-between gap-2 px-3 py-2', cancel ? 'bg-rose-50' : 'bg-slate-50')}>
        <div className="min-w-0">
          <p className="truncate text-[1rem] font-bold text-slate-900">{cancel && <XCircle className="mr-1 inline h-4 w-4 text-rose-600" />}{title}</p>
          <p className="truncate text-[0.6875rem] text-slate-500">{k.kotNumber}{k.station ? ` · ${k.station}` : ''}{mode ? ` · ${mode.label}` : ''}{o?.numberOfGuests ? ` · ${o.numberOfGuests} log` : ''}</p>
        </div>
        <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-0.5 text-[0.75rem] font-bold tabular-nums', timeTone)}><Clock className="h-3.5 w-3.5" />{cancel ? 'CANCEL' : `${age}m`}</span>
      </header>
      <ul className="divide-y divide-slate-100 px-3">
        {(snap.items ?? []).map((it, i) => (
          <li key={it.id ?? i} className="py-1.5">
            <p className={cn('text-[0.9375rem] font-semibold text-slate-900', cancel && 'line-through decoration-rose-500')}><span className="mr-1.5 tabular-nums">{it.quantity}×</span>{it.name}</p>
            {(it.modifiers?.length ?? 0) > 0 && <p className="text-[0.8125rem] text-slate-600">{it.modifiers!.join(', ')}</p>}
            {it.spiceLevel && it.spiceLevel !== 'NONE' && <p className="text-[0.75rem] font-semibold text-rose-600"><Flame className="mr-0.5 inline h-3 w-3" />{it.spiceLevel}</p>}
            {(it.specialInstructions || it.cookingNote) && <p className="text-[0.8125rem] font-medium italic text-amber-700">“{[it.cookingNote, it.specialInstructions].filter(Boolean).join(' · ')}”</p>}
          </li>
        ))}
      </ul>
      {(snap.specialRequests || k.notes) && <p className="mx-3 mb-2 rounded-lg bg-amber-50 px-2 py-1 text-[0.75rem] text-amber-900">{[snap.specialRequests, k.notes].filter(Boolean).join(' · ')}</p>}
      <footer className="flex items-center gap-2 border-t border-slate-100 px-3 py-2">
        <button type="button" onClick={onPrint} title="Print" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><Printer className="h-4 w-4" /></button>
        {!cancel && canCook && onNext && (
          <div className="ml-auto flex gap-2">
            {lane === 'new' && <Button size="sm" loading={busy} onClick={() => onNext('COOKING')}><Flame className="h-4 w-4" />Shuru</Button>}
            {lane === 'cooking' && <Button size="sm" variant="success" loading={busy} onClick={() => onNext('READY')}><CheckCheck className="h-4 w-4" />Tayyar</Button>}
            {lane === 'ready' && <Button size="sm" variant="secondary" loading={busy} onClick={() => onNext('SERVED')}><HandPlatter className="h-4 w-4" />De diya</Button>}
          </div>
        )}
      </footer>
    </article>
  );
}
