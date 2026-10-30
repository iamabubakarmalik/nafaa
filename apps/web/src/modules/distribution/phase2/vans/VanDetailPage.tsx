/**
 * One van: its stock, the open day (spot invoices, market returns, money),
 * loading from the godown and the end-of-day close: count what is on the
 * van, book short / extra, hand in the cash and send the rest back.
 *
 * Keys: L load · O open the day · C close the day.
 */

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, ClipboardList, PackagePlus, PlayCircle, RefreshCw, Trash2, Truck, Wallet } from 'lucide-react';
import {
  Button, Checkbox, Input, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, Skeleton, Table, TBody, Td, Th, THead, Tr,
  heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen } from '@core/lib/shortcuts';
import { distError } from '../../api/distribution.api';
import { phase2Api, type SaveVan, type VanDetail, type VanLine, type VanSession } from '../../api/phase2.api';
import { DistributionGate } from '../../components/DistributionGate';
import { Empty, Fact, Panel, Pill } from '../../components/parts';
import { useMoney } from '../../hooks/useDistribution';
import { dayKeyLabel, dayTime, rs, timeLabel, trim, typingInField } from '../../lib/meta';
import { ItemSearch, PackSelect, defaultPack, newKey, packsOf, useCatalog } from '../shared';
import { VANS_KEY, VanFormModal } from './VansPage';

export default function VanDetailPage() {
  return <DistributionGate><Van /></DistributionGate>;
}

function Van() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const money = useMoney();
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [closed, setClosed] = useState<VanSession | null>(null);
  const q = useQuery({ queryKey: [...VANS_KEY, 'one', id], queryFn: () => phase2Api.van(id), enabled: !!id });
  const van = q.data;
  const session = van?.session ?? null;

  const open = useMutation({
    mutationFn: () => phase2Api.openVan(id),
    onSuccess: () => { toast.success('Van ka din shuru'); qc.invalidateQueries({ queryKey: VANS_KEY }); },
    onError: (e) => toast.error(distError(e, 'Din shuru nahi hua')),
  });
  const save = useMutation({
    mutationFn: (b: SaveVan) => phase2Api.updateVan(id, b),
    onSuccess: () => { toast.success('Save ho gaya'); setEditing(false); qc.invalidateQueries({ queryKey: VANS_KEY }); },
    onError: (e) => toast.error(distError(e, 'Save nahi hua')),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typingInField() || isDialogOpen() || !van) return;
      if (e.key === 'l' || e.key === 'L') { e.preventDefault(); setLoading(true); }
      else if ((e.key === 'o' || e.key === 'O') && !session) { e.preventDefault(); open.mutate(); }
      else if ((e.key === 'c' || e.key === 'C') && session) { e.preventDefault(); setClosing(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [van, session, open]);

  if (q.isLoading || !van) {
    return <PageShell><PageHero back="/distribution/vans" backLabel="Vans" title="Van" loading /><Skeleton className="h-64 rounded-3xl" /></PageShell>;
  }

  return (
    <PageShell>
      <PageHero
        back="/distribution/vans" backLabel="Vans"
        title={van.name}
        chip={<><Truck /> {van.vehicleNo ?? 'Van'}</>}
        meta={[van.salesmanName && `Salesman: ${van.salesmanName}`, van.homeShopName && `Godown: ${van.homeShopName}`, van.routeName && `Route: ${van.routeName}`].filter(Boolean).join(' · ') || 'Salesman aur godown set karein'}
        busy={q.isFetching}
        actions={<>
          <button type="button" onClick={() => void q.refetch()} title="Refresh" aria-label="Taaza karein" className={heroIconButton}><RefreshCw className={cn('h-4 w-4', q.isFetching && 'animate-spin')} /></button>
          <button type="button" onClick={() => setEditing(true)} className={heroButton}>Edit</button>
          {van.isActive && <button type="button" onClick={() => setLoading(true)} title="Load (L)" className={heroButton}><PackagePlus className="h-4 w-4" /><span className="hidden sm:inline">Load</span></button>}
          {van.isActive && (session
            ? <button type="button" onClick={() => setClosing(true)} title="Close day (C)" className={heroPrimaryButton}><CheckCircle2 className="h-4 w-4" /><span className="hidden sm:inline">Close day</span></button>
            : <button type="button" disabled={open.isPending} onClick={() => open.mutate()} title="Start day (O)" className={heroPrimaryButton}><PlayCircle className="h-4 w-4" /><span className="hidden sm:inline">Start day</span></button>)}
        </>}
        stats={[
          { label: 'Van par maal', value: money(van.stockValue), hint: `${van.stock.length} items · cost par` },
          { label: 'Aaj', value: session ? `Route par · ${dayKeyLabel(session.dayKey)}` : 'Khadi hai' },
          ...(session ? [{ label: 'Aaj ki sale', value: money(session.money.salesValue), hint: `${session.money.invoices} invoices` }] : []),
        ]}
      />

      <div className="hidden items-center gap-1.5 text-[0.75rem] text-slate-500 lg:flex"><Kbd>L</Kbd> load · {session ? <><Kbd>C</Kbd> din band</> : <><Kbd>O</Kbd> din shuru</>}</div>

      {!van.homeShopId && <div className="rounded-2xl bg-amber-50 px-4 py-3 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">Is van ka godown set nahi — load aur shaam ko maal wapas ke liye "Badlein" se godown chunein.</div>}

      {session && <SessionPanel session={session} />}

      <Panel title="Van par maal" sub="Abhi van ke stock me" flush>
        {!van.stock.length ? <Empty icon={<PackagePlus className="h-5 w-5" />} text="Van khaali hai. Godown se load karein." action={<Button size="sm" onClick={() => setLoading(true)}>Load</Button>} />
          : <div className="overflow-x-auto">
            <Table minWidth="36rem" className="[&_table]:text-[0.8125rem]">
              <THead className="text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
                <Tr><Th className="px-4 py-2 sm:px-5">Item</Th><Th className="px-3 py-2">Packs</Th><Th className="px-3 py-2 text-right">Quantity</Th><Th className="px-4 py-2 text-right sm:px-5">Value</Th></Tr>
              </THead>
              <TBody className="divide-y divide-slate-100">
                {van.stock.map((s) => (
                  <Tr key={`${s.productId}-${s.variantId}`}>
                    <Td className="px-4 py-2 sm:px-5"><div className="font-medium text-slate-900">{s.name}</div>{s.variantName && <div className="text-[0.75rem] text-slate-500">{s.variantName}</div>}</Td>
                    <Td className="px-3 py-2 text-slate-700">{s.text}</Td>
                    <Td className="px-3 py-2 text-right tabular-nums">{trim(s.qty)} {s.baseUnit}</Td>
                    <Td className="px-4 py-2 text-right tabular-nums sm:px-5">{money(s.value)}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </div>}
      </Panel>

      {van.recent.length > 0 && (
        <Panel title="Pichle din" flush>
          <ul className="divide-y divide-slate-100">
            {van.recent.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-[0.8125rem] sm:px-5">
                <span className="font-semibold text-slate-900">{dayKeyLabel(r.dayKey)} <span className="font-normal text-slate-500">· band {dayTime(r.closedAt)}</span></span>
                <span className="tabular-nums text-slate-700">Cash {rs(r.handedIn ?? 0)} / {rs(r.expectedCash)}
                  {r.shortAmount !== 0 && <b className={cn('ml-2', r.shortAmount > 0 ? 'text-rose-600' : 'text-success-700')}>{r.shortAmount > 0 ? 'Kam' : 'Zyada'} {rs(Math.abs(r.shortAmount))}</b>}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {loading && <LoadModal van={van} onClose={() => setLoading(false)} />}
      {closing && <CloseModal vanId={van.id} onClose={() => setClosing(false)} onDone={(s) => { setClosing(false); setClosed(s); }} />}
      {closed && <ClosedSummary session={closed} onClose={() => setClosed(null)} />}
      {editing && <VanFormModal van={van} saving={save.isPending} onClose={() => setEditing(false)} onSave={(b) => save.mutate(b)} />}
    </PageShell>
  );
}

function SessionPanel({ session }: { session: VanSession }) {
  const money = useMoney();
  const m = session.money;
  return (
    <div className="space-y-4">
      <KpiRow>
        <KpiCard icon={ClipboardList} color="#7c3aed" label="Spot invoices" value={money(m.salesValue)} hint={`${m.invoices} invoices · udhaar ${rs(m.creditGiven)}`} />
        <KpiCard icon={Wallet} color="#16a34a" label="Cash expected" value={money(m.expectedCash)} hint={m.otherMoney ? `Bank / cheque ${rs(m.otherMoney)}` : 'Salesman ke paas'} />
        <KpiCard icon={Wallet} color="#d97706" label="Verify baqi" value={money(m.pending)} hint={m.recoveries ? `Recovery ${rs(m.recoveries)}` : undefined} />
      </KpiRow>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Aaj ki invoices" flush>
          {!session.invoices.length ? <Empty text="Abhi koi spot Invoice nahi. Salesman phone ki van screen se bechta hai." />
            : <ul className="max-h-80 divide-y divide-slate-100 overflow-auto">
              {session.invoices.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-2 px-4 py-2 text-[0.8125rem] sm:px-5">
                  <span className="min-w-0"><span className="block truncate font-semibold text-slate-900">{i.customerName ?? '—'}</span>
                    <span className="block text-[0.75rem] text-slate-500">{i.saleNumber ?? i.orderNumber} · {timeLabel(i.bookedAt)}</span></span>
                  <span className="text-right tabular-nums"><span className="block font-semibold text-slate-900">{money(i.total)}</span>
                    {i.cashCollected > 0 && <span className="block text-[0.6875rem] text-success-700">cash {rs(i.cashCollected)}</span>}</span>
                </li>
              ))}
            </ul>}
        </Panel>
        <Panel title="Market returns (aaj)" flush>
          {!session.returns.length ? <Empty text="Aaj koi market return nahi." />
            : <ul className="divide-y divide-slate-100">
              {session.returns.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 px-4 py-2 text-[0.8125rem] sm:px-5">
                  <span className="min-w-0 truncate"><b className="text-slate-900">{r.customerName ?? '—'}</b> <span className="text-slate-500">· {r.number}</span></span>
                  <span className="flex items-center gap-2"><span className="tabular-nums">{money(r.totalValue)}</span><Pill tone={r.status === 'APPROVED' ? 'green' : r.status === 'REJECTED' ? 'slate' : 'amber'}>{r.status === 'PENDING' ? 'Approve baqi' : r.status === 'APPROVED' ? 'Approved' : 'Reject'}</Pill></span>
                </li>
              ))}
            </ul>}
        </Panel>
      </div>
    </div>
  );
}

interface LoadLine { key: string; productId: string; variantId: string | null; unitId: string; qty: string; label: string }

function LoadModal({ van, onClose }: { van: VanDetail; onClose: () => void }) {
  const qc = useQueryClient();
  const catalog = useCatalog();
  const [lines, setLines] = useState<LoadLine[]>([]);
  const [note, setNote] = useState('');
  const valid = lines.filter((l) => Number(l.qty) > 0);
  const save = useMutation({
    mutationFn: () => {
      if (!valid.length) throw new Error('Kam se kam ek item aur quantity likhein');
      return phase2Api.loadVan(van.id, valid.map((l) => ({ productId: l.productId, variantId: l.variantId, unitId: l.unitId || null, qty: Number(l.qty) })), note.trim() || undefined);
    },
    onSuccess: (r) => { toast.success(`${r.transferNumber} — van load ho gayi`); qc.invalidateQueries({ queryKey: VANS_KEY }); onClose(); },
    onError: (e) => toast.error(distError(e, 'Load nahi hua')),
  });
  const set = (key: string, patch: Partial<LoadLine>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  return (
    <Modal open onClose={onClose} size="lg" title={`${van.name} — load`} description={`${van.homeShopName ?? 'Godown'} se van par (transfer foran receive ho jata hai)`}
      footer={<>
        <span className="mr-auto text-[0.8125rem] text-slate-600">{valid.length} items</span>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button loading={save.isPending} disabled={!valid.length || !van.homeShopId} leftIcon={<Truck className="h-4 w-4" />} onClick={() => save.mutate()}>Load van</Button>
      </>}>
      <div className="space-y-3">
        <ItemSearch options={catalog.options} loading={catalog.isLoading} onPick={(o) => setLines((ls) => [...ls, { key: newKey(), productId: o.productId, variantId: o.variantId, unitId: defaultPack(o.product, o.variantId), qty: '', label: o.label }])} />
        {!lines.length ? <p className="py-6 text-center text-[0.8125rem] text-slate-500">Upar se item dhoond kar line banayein</p>
          : <ul className="divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200/80">
            {lines.map((l) => {
              const p = catalog.byId.get(l.productId);
              const stock = p?.stock.filter((s) => s.shopId === van.homeShopId && (s.variantId ?? null) === l.variantId).reduce((a, s) => a + s.qty, 0);
              const rate = packsOf(p, l.variantId).find((x) => x.id === l.unitId)?.rate ?? 1;
              return (
                <li key={l.key} className="grid grid-cols-[minmax(0,1fr)_7rem_6rem_2rem] items-center gap-2 px-3 py-2">
                  <span className="min-w-0"><span className="block truncate text-[0.8125rem] font-semibold text-slate-900">{l.label}</span>
                    {stock != null && <span className="block text-[0.6875rem] text-slate-500">Godown me {trim(stock)} {p?.unit}{rate > 1 ? ` (${trim(stock / rate)} packs)` : ''}</span>}</span>
                  <PackSelect product={p} variantId={l.variantId} value={l.unitId} onChange={(v) => set(l.key, { unitId: v })} />
                  <input type="number" min={0} step="any" value={l.qty} autoFocus onChange={(e) => set(l.key, { qty: e.target.value })} aria-label="Quantity"
                    className="h-9 w-full rounded-lg border border-slate-200 px-2 text-right text-[0.875rem] tabular-nums outline-none focus:border-brand-500" />
                  <button type="button" aria-label="Hatayein" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} className="text-slate-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                </li>
              );
            })}
          </ul>}
        <Input size="sm" label="Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Zaroori nahi" />
      </div>
    </Modal>
  );
}

function CloseModal({ vanId, onClose, onDone }: { vanId: string; onClose: () => void; onDone: (s: VanSession) => void }) {
  const qc = useQueryClient();
  const money = useMoney();
  const canVerify = usePermission(PERMISSIONS.DISTRIBUTION_COLLECTIONS_VERIFY);
  const q = useQuery({ queryKey: [...VANS_KEY, 'close', vanId], queryFn: () => phase2Api.vanClosePreview(vanId) });
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [handedIn, setHandedIn] = useState('');
  const [unload, setUnload] = useState(true);
  const [verify, setVerify] = useState(canVerify);
  const [note, setNote] = useState('');
  const key = (l: VanLine) => `${l.productId}:${l.variantId ?? ''}`;
  const lines = q.data?.lines ?? [];
  const counted = (l: VanLine) => {
    const t = counts[key(l)];
    return t === undefined || t === '' ? Math.max(0, l.expected) : Number(t);
  };
  const variance = useMemo(() => lines.reduce((s, l) => s + Math.abs(counted(l) - l.expected) * (l.cost ?? 0), 0), [lines, counts]); // eslint-disable-line react-hooks/exhaustive-deps
  const expectedCash = q.data?.session.money.expectedCash ?? 0;
  const cash = handedIn === '' ? null : Number(handedIn);

  const save = useMutation({
    mutationFn: () => phase2Api.closeVan(vanId, {
      counts: lines.map((l) => ({ productId: l.productId, variantId: l.variantId, counted: counted(l) })),
      ...(cash != null && { handedIn: cash }), unload, verifyCollections: canVerify && verify, note: note.trim() || undefined,
    }),
    onSuccess: (s) => { toast.success('Van ka din band ho gaya'); qc.invalidateQueries({ queryKey: VANS_KEY }); onDone(s); },
    onError: (e) => toast.error(distError(e, 'Din band nahi hua')),
  });

  return (
    <Modal open onClose={onClose} size="xl" title="Close van day"
      description="Van par jo maal hai woh ginein. Kam / zyada stock adjustment me jata hai, bacha maal godown wapas."
      footer={<>
        <span className="mr-auto text-[0.8125rem] text-slate-600">Farq (cost) <b className={cn(variance > 0 ? 'text-rose-600' : 'text-slate-900')}>{rs(variance)}</b></span>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button loading={save.isPending} disabled={q.isLoading} onClick={() => save.mutate()}>Close day</Button>
      </>}>
      {q.isLoading ? <Skeleton className="h-48 rounded-2xl" /> : (
        <div className="space-y-4">
          <div className="max-h-[45vh] overflow-auto rounded-2xl ring-1 ring-slate-200/80">
            <Table minWidth="48rem" className="[&_table]:text-[0.8125rem]">
              <THead className="sticky top-0 bg-slate-50 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
                <Tr>
                  <Th className="px-3 py-2">Item</Th><Th className="px-2 py-2 text-right">Shuru</Th><Th className="px-2 py-2 text-right">Load</Th>
                  <Th className="px-2 py-2 text-right">Bika</Th><Th className="px-2 py-2 text-right">Wapsi</Th><Th className="px-2 py-2 text-right">Kharab</Th>
                  <Th className="px-2 py-2 text-right">Hona chahiye</Th><Th className="px-2 py-2 text-right">Gina</Th><Th className="px-3 py-2 text-right">Farq</Th>
                </Tr>
              </THead>
              <TBody className="divide-y divide-slate-100">
                {!lines.length && <Tr><Td colSpan={9} className="px-3 py-6 text-center text-slate-500">Aaj van par koi maal nahi chala</Td></Tr>}
                {lines.map((l) => {
                  const v = Math.round((counted(l) - l.expected) * 10_000) / 10_000;
                  return (
                    <Tr key={key(l)}>
                      <Td className="px-3 py-1.5"><div className="font-medium text-slate-900">{l.name}</div><div className="text-[0.6875rem] text-slate-500">{l.text}</div></Td>
                      <Td className="px-2 py-1.5 text-right tabular-nums">{trim(l.opening)}</Td>
                      <Td className="px-2 py-1.5 text-right tabular-nums">{trim(l.loaded)}</Td>
                      <Td className="px-2 py-1.5 text-right tabular-nums">{trim(l.sold)}</Td>
                      <Td className="px-2 py-1.5 text-right tabular-nums">{trim(l.returnsIn)}</Td>
                      <Td className="px-2 py-1.5 text-right tabular-nums">{trim(l.writtenOff)}</Td>
                      <Td className="px-2 py-1.5 text-right font-semibold tabular-nums">{trim(l.expected)}</Td>
                      <Td className="px-2 py-1.5 text-right">
                        <input type="number" min={0} step="any" value={counts[key(l)] ?? ''} placeholder={trim(Math.max(0, l.expected))} aria-label={`${l.name} gina`}
                          onChange={(e) => setCounts((c) => ({ ...c, [key(l)]: e.target.value }))}
                          className="h-8 w-20 rounded-lg border border-slate-200 px-2 text-right tabular-nums outline-none focus:border-brand-500" />
                      </Td>
                      <Td className={cn('px-3 py-1.5 text-right font-semibold tabular-nums', v < 0 ? 'text-rose-600' : v > 0 ? 'text-success-700' : 'text-slate-400')}>{v > 0 ? '+' : ''}{trim(v)}</Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 rounded-2xl bg-slate-50 p-3">
              <Fact label="Cash expected">{money(expectedCash)}</Fact>
              <Input size="sm" type="number" min={0} label="Salesman ne cash diya" value={handedIn} onChange={(e) => setHandedIn(e.target.value)} placeholder={String(expectedCash)} />
              {cash != null && cash !== expectedCash && <p className={cn('text-[0.8125rem] font-semibold', cash < expectedCash ? 'text-rose-600' : 'text-success-700')}>{cash < expectedCash ? 'Kam' : 'Zyada'} {rs(Math.abs(expectedCash - cash))}</p>}
            </div>
            <div className="space-y-2">
              <Checkbox label="Bacha maal godown wapas bhejein" description="Transfer van → godown, foran receive" checked={unload} onChange={(e) => setUnload(e.target.checked)} />
              {canVerify && <Checkbox label="Aaj ki collections abhi verify karein" description="Khate me payment lag jayegi" checked={verify} onChange={(e) => setVerify(e.target.checked)} />}
              <Input size="sm" label="Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Zaroori nahi" />
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function ClosedSummary({ session, onClose }: { session: VanSession; onClose: () => void }) {
  const lines = session.lines ?? [];
  const off = lines.filter((l) => (l.variance ?? 0) !== 0);
  return (
    <Modal open onClose={onClose} size="md" title={`${session.vanName} — din band`} description={dayKeyLabel(session.dayKey)}
      footer={<Button onClick={onClose}>OK</Button>}>
      <div className="space-y-3 text-[0.875rem]">
        <div className="grid grid-cols-2 gap-3">
          <Fact label="Sale">{rs(session.money.salesValue)} ({session.money.invoices})</Fact>
          <Fact label="Cash">{rs(session.handedIn ?? 0)} / {rs(session.expectedCash)}</Fact>
          <Fact label="Short / excess">{session.shortAmount === 0 ? 'Barabar' : `${session.shortAmount > 0 ? 'Kam' : 'Zyada'} ${rs(Math.abs(session.shortAmount))}`}</Fact>
          <Fact label="Maal wapas godown">{session.unloadTransferId ? 'Haan' : 'Nahi'}</Fact>
        </div>
        {off.length > 0 && (
          <div className="rounded-2xl bg-amber-50 p-3 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
            <b>Ginti me farq</b> (stock adjustment ho gaya):
            <ul className="mt-1 list-disc pl-5">{off.map((l) => <li key={`${l.productId}-${l.variantId}`}>{l.name}: {(l.variance ?? 0) > 0 ? '+' : ''}{trim(l.variance ?? 0)} {l.baseUnit}</li>)}</ul>
          </div>
        )}
      </div>
    </Modal>
  );
}
