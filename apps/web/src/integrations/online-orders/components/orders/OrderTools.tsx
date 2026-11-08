/**
 * Small dialogs for board work on one order or many: assign to a team
 * member, follow-up reminder, tags, an internal note and splitting items
 * into a new order. One order uses its own endpoint; many go through the
 * bulk endpoint, and failures stay listed.
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Avatar, Button, Checkbox, Input, Modal, Textarea } from '@/design-system/components';
import { teamApi } from '@modules/organization/team/api/team.api';
import { apiErrorMessage, onlineOrdersApi, type OnlineOrder } from '../../api/online-orders.api';
import { orderBoardApi, type BulkResult } from '../../api/order-board.api';
import { orderNo } from '../../lib/orders';
import { useBoardRefresh } from './useMoveOrder';
import { ReportScamModal } from './ReportScamModal';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';

export type ToolKind = 'assign' | 'follow-up' | 'tag' | 'note' | 'split' | 'report-scam';

export function useTeam() {
  return useQuery({ queryKey: ['team'], queryFn: () => teamApi.list().catch(() => []), staleTime: 5 * 60_000 });
}

/** Reports a bulk result; returns the ids that failed. */
export function reportBulk(results: BulkResult[], orders: OnlineOrder[], done: string) {
  const ok = results.filter((r) => r.ok).length;
  if (ok) toast.success(t('{{count}} orders · {{done}}', { count: ok, done }));
  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    const byId = new Map(orders.map((o) => [o.id, o]));
    toast.error(t('{{count}} orders nahi hue', { count: failed.length }), {
      description: failed.slice(0, 3).map((f) => `#${byId.has(f.id) ? orderNo(byId.get(f.id)!) : ''}: ${f.error ?? ''}`).join('\n'),
      duration: 10_000,
    });
  }
  return failed.map((f) => f.id);
}

export function OrderToolModal({ kind, orders, onClose, onDone }: {
  kind: ToolKind;
  orders: OnlineOrder[];
  onClose: () => void;
  /** Ids that failed (bulk); empty when all went through. */
  onDone?: (failedIds: string[]) => void;
}) {
  const refresh = useBoardRefresh();
  const [busy, setBusy] = useState(false);
  const one = orders.length === 1 ? orders[0] : null;
  const ids = orders.map((o) => o.id);

  const run = async (single: () => Promise<unknown>, bulk: () => Promise<{ results: BulkResult[] }>, done: string) => {
    setBusy(true);
    try {
      let failed: string[] = [];
      if (one) { await single(); toast.success(`#${orderNo(one)} · ${done}`); } else failed = reportBulk((await bulk()).results, orders, done);
      refresh(one?.id);
      onDone?.(failed);
      onClose();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const head = one ? `#${orderNo(one)} · ${one.customerName}` : t('{{count}} orders chune', { count: orders.length });

  if (kind === 'assign') return <AssignModal head={head} current={one?.assignedToId ?? null} busy={busy} onClose={onClose}
    onSave={(userId) => run(() => orderBoardApi.assign(one!.id, userId), () => orderBoardApi.bulkTool('assign', ids, { userId }), userId ? t('assign ho gaya') : t('kisi ke paas nahi'))} />;
  if (kind === 'follow-up') return <FollowUpModal head={head} current={one?.followUpAt ?? null} currentNote={one?.followUpNote ?? ''} busy={busy} onClose={onClose}
    onSave={(at, note) => run(() => orderBoardApi.followUp(one!.id, at, note), () => orderBoardApi.bulkTool('follow-up', ids, { at, note }), at ? t('follow-up lag gaya') : t('follow-up hat gaya'))} />;
  if (kind === 'tag') return <TagModal head={head} current={one?.metadata.tags ?? []} many={!one} busy={busy} onClose={onClose}
    onSave={(tags) => run(() => onlineOrdersApi.setTags(one!.id, tags), () => orderBoardApi.bulkTool('tag', ids, { tags }), t('tag lag gaya'))} />;
  if (kind === 'note' && one) return <NoteModal head={head} busy={busy} onClose={onClose}
    onSave={(text) => run(() => onlineOrdersApi.addNote(one.id, text), async () => ({ results: [] }), t('note likh diya'))} />;
  if (kind === 'split' && one) return <SplitModal order={one} busy={busy} onClose={onClose}
    onSave={(idx) => run(() => orderBoardApi.split(one.id, idx), async () => ({ results: [] }), t('naya order ban gaya'))} />;
  if (kind === 'report-scam' && one) return <ReportScamModal order={one} onClose={onClose} />;
  return null;
}

function Footer({ busy, disabled, onClose, onSave, label = t('Save') }: { busy: boolean; disabled?: boolean; onClose: () => void; onSave: () => void; label?: string }) {
  return (
    <div className="flex w-full justify-end gap-2">
      <Button variant="ghost" onClick={onClose}>{t('Rehne dein')}</Button>
      <Button loading={busy} disabled={disabled} onClick={onSave}>{label}</Button>
    </div>
  );
}

function AssignModal({ head, current, busy, onClose, onSave }: { head: string; current: string | null; busy: boolean; onClose: () => void; onSave: (id: string | null) => void }) {
  const { data: team = [], isLoading } = useTeam();
  const [pick, setPick] = useState<string | null>(current);
  const people = team.filter((m) => m.isActive);
  const row = 'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-start ring-1 transition';
  return (
    <Modal open onClose={onClose} size="sm" title={t('Kis ke zimme?')} description={head} footer={<Footer busy={busy} onClose={onClose} onSave={() => onSave(pick)} />}>
      <div className="space-y-1.5">
        <button type="button" onClick={() => setPick(null)} className={cn(row, pick === null ? 'bg-brand-50 ring-brand-300' : 'ring-slate-200 hover:bg-slate-50')}>
          <Avatar name="—" size={28} /><span className="text-[0.875rem] font-medium text-slate-700">{t('Kisi ke paas nahi')}</span>
        </button>
        {isLoading && <p className="py-3 text-center text-[0.8125rem] text-slate-500">{t('Load ho raha hai…')}</p>}
        {people.map((m) => (
          <button key={m.id} type="button" onClick={() => setPick(m.id)} className={cn(row, pick === m.id ? 'bg-brand-50 ring-brand-300' : 'ring-slate-200 hover:bg-slate-50')}>
            <Avatar name={m.fullName} size={28} />
            <span className="min-w-0 flex-1"><span className="block truncate text-[0.875rem] font-medium text-slate-900">{m.fullName}</span><span className="block text-[0.75rem] text-slate-500">{m.role}</span></span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');
const localValue = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

function FollowUpModal({ head, current, currentNote, busy, onClose, onSave }: {
  head: string; current: string | null; currentNote: string; busy: boolean; onClose: () => void; onSave: (at: string | null, note?: string) => void;
}) {
  const [at, setAt] = useState(current ? localValue(new Date(current)) : '');
  const [note, setNote] = useState(currentNote);
  const quick = useMemo(() => {
    const now = new Date();
    const inHours = (h: number) => new Date(now.getTime() + h * 3_600_000);
    const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1); tomorrow.setHours(10, 0, 0, 0);
    const twoDays = new Date(now); twoDays.setDate(now.getDate() + 2); twoDays.setHours(10, 0, 0, 0);
    return [[t('1 ghante baad'), inHours(1)], [t('3 ghante baad'), inHours(3)], [t('Kal subah'), tomorrow], [t('2 din baad'), twoDays]] as const;
  }, []);
  return (
    <Modal open onClose={onClose} size="sm" title={t('Follow-up kab?')} description={head}
      footer={<div className="flex w-full items-center justify-between gap-2">
        {current ? <Button variant="ghost" onClick={() => onSave(null)} disabled={busy}>{t('Hatayein')}</Button> : <span />}
        <Footer busy={busy} disabled={!at} onClose={onClose} onSave={() => onSave(new Date(at).toISOString(), note.trim() || undefined)} />
      </div>}>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {quick.map(([label, d]) => (
            <button key={label} type="button" onClick={() => setAt(localValue(d))} className="h-8 rounded-lg bg-slate-100 px-2.5 text-[0.75rem] font-semibold text-slate-700 hover:bg-slate-200">{label}</button>
          ))}
        </div>
        <Input type="datetime-local" label={t('Din aur waqt')} value={at} onChange={(e) => setAt(e.target.value)} />
        <Input label={t('Kya karna hai (zaroori nahi)')} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('Jaise: Advance ka poochna hai')} />
      </div>
    </Modal>
  );
}

function TagModal({ head, current, many, busy, onClose, onSave }: { head: string; current: string[]; many: boolean; busy: boolean; onClose: () => void; onSave: (tags: string[]) => void }) {
  const [tags, setTags] = useState<string[]>(current);
  const [text, setText] = useState('');
  const add = () => { const v = text.trim(); if (v && !tags.includes(v)) setTags([...tags, v]); setText(''); };
  const common = [t('VIP'), t('Gift'), t('Urgent'), t('Exchange')].filter((x) => !tags.includes(x));
  return (
    <Modal open onClose={onClose} size="sm" title={t('Tag')} description={many ? t('{{head}} · ye tags sab par lag jayenge', { head }) : head}
      footer={<Footer busy={busy} disabled={!tags.length && many} onClose={onClose} onSave={() => onSave(tags)} />}>
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} placeholder={t('Naya tag likhein')} wrapperClassName="flex-1" />
          <Button variant="secondary" onClick={add} disabled={!text.trim()}>{t('Jorein')}</Button>
        </div>
        <div className="flex min-h-8 flex-wrap gap-1.5">
          {tags.map((x) => (
            <button key={x} type="button" onClick={() => setTags(tags.filter((y) => y !== x))} className="inline-flex h-7 items-center gap-1 rounded-full bg-brand-50 px-2.5 text-[0.75rem] font-semibold text-brand-700 ring-1 ring-brand-100">{x} ×</button>
          ))}
          {!tags.length && <span className="text-[0.75rem] text-slate-500">{t('Abhi koi tag nahi')}</span>}
        </div>
        {!!common.length && (
          <div className="flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
            {common.map((x) => <button key={x} type="button" onClick={() => setTags([...tags, x])} className="h-7 rounded-full bg-slate-100 px-2.5 text-[0.75rem] font-medium text-slate-600 hover:bg-slate-200">+ {x}</button>)}
          </div>
        )}
      </div>
    </Modal>
  );
}

function NoteModal({ head, busy, onClose, onSave }: { head: string; busy: boolean; onClose: () => void; onSave: (text: string) => void }) {
  const [text, setText] = useState('');
  return (
    <Modal open onClose={onClose} size="sm" title={t('Andar ka note')} description={t('{{head}} · customer ko nazar nahi aata', { head })}
      footer={<Footer busy={busy} disabled={!text.trim()} onClose={onClose} onSave={() => onSave(text.trim())} />}>
      <Textarea autoFocus rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder={t('Jaise: Customer ne shaam 5 baje ke baad call ka kaha')} />
    </Modal>
  );
}

function SplitModal({ order, busy, onClose, onSave }: { order: OnlineOrder; busy: boolean; onClose: () => void; onSave: (idx: number[]) => void }) {
  const [picked, setPicked] = useState<number[]>([]);
  const all = picked.length >= order.items.length;
  return (
    <Modal open onClose={onClose} size="md" title={t('Order alag karein')} description={t('Jo cheezein chunenge woh naye order me chali jayengi (#{{no}}-S1). Baqi isi order me rahengi.', { no: orderNo(order) })}
      footer={<Footer busy={busy} disabled={!picked.length || all} onClose={onClose} onSave={() => onSave(picked)} label={t('Alag karein')} />}>
      <div className="space-y-1.5">
        {order.items.map((it, i) => (
          <label key={i} className="flex items-center gap-3 rounded-xl px-3 py-2 ring-1 ring-slate-200">
            <Checkbox checked={picked.includes(i)} onChange={(e) => setPicked(e.target.checked ? [...picked, i] : picked.filter((x) => x !== i))} />
            <span className="min-w-0 flex-1 truncate text-[0.875rem] text-slate-800">{it.name}{it.variant ? ` (${it.variant})` : ''}</span>
            <span className="text-[0.8125rem] tabular-nums text-slate-500">× {Number(it.quantity)}</span>
          </label>
        ))}
        {all && <p className="text-[0.75rem] text-rose-600">{t('Kam se kam ek cheez is order me rehni chahiye')}</p>}
      </div>
    </Modal>
  );
}
