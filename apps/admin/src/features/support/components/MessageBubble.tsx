/**
 * One message in the support thread, WhatsApp style: shop messages on the
 * left, the team on the right, Nafaa AI on the left in violet, internal notes
 * in yellow (the shop never sees them), system lines centred. Ticks show
 * sent / delivered / read for team messages.
 *
 * Nothing is hidden from the team: a deleted message shows greyed with who
 * deleted it and its original content, "edited" opens the earlier versions,
 * and a call line carries its recordings. Only a super admin can remove a
 * message for good (it then shows as a tombstone).
 */

import { Bot, Check, CheckCheck, CircleDot, CornerUpLeft, FileText, History, Lock, MoreHorizontal, Pencil, Phone, PhoneMissed, ScreenShare, Trash2, XOctagon } from 'lucide-react';
import { useRef, useState } from 'react';
import { Menu, MenuItem, Modal } from '@/design-system/components';
import { cn } from '@/lib/cn';
import type { SupportAttachment, SupportMessage } from '../lib/support.types';

const time = (d: string) => new Date(d).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Karachi' });
const when = (d: string) => new Date(d).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Karachi' });
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const kb = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

function Ticks({ m }: { m: SupportMessage }) {
  if (m.readAt) return <CheckCheck className="h-3.5 w-3.5 text-sky-500" aria-label="Read" />;
  if (m.deliveredAt) return <CheckCheck className="h-3.5 w-3.5 text-slate-400" aria-label="Delivered" />;
  return <Check className="h-3.5 w-3.5 text-slate-400" aria-label="Sent" />;
}

function Voice({ a }: { a: SupportAttachment }) {
  const bars = a.waveform?.length ? a.waveform : Array.from({ length: 32 }, (_, i) => 0.3 + 0.5 * Math.abs(Math.sin(i * 1.7)));
  return (
    <div className="flex w-64 max-w-full flex-col gap-1">
      <div className="flex h-7 items-end gap-[2px]" aria-hidden>
        {bars.slice(0, 48).map((v, i) => <span key={i} className="w-[3px] rounded-full bg-current opacity-50" style={{ height: `${Math.max(12, v * 100)}%` }} />)}
      </div>
      <audio controls preload="none" src={a.url} className="h-8 w-full" />
      {a.durationSec != null && <span className="text-[0.6875rem] opacity-70">Voice note · {mmss(a.durationSec)}</span>}
    </div>
  );
}

/** A call or screen recording on a call line. */
function Recording({ a }: { a: SupportAttachment }) {
  const screen = a.recording === 'screen';
  return (
    <div className="flex w-[min(100%,26rem)] flex-col gap-1 rounded-xl border border-slate-200 bg-white p-2 text-start text-slate-700 shadow-sm">
      <span className="flex items-center gap-1.5 text-[0.6875rem] font-semibold">
        <CircleDot className="h-3 w-3 text-rose-600" /> {screen ? 'Screen recording' : 'Call recording'}
        {a.durationSec != null && <span className="font-normal text-slate-500">· {mmss(a.durationSec)}</span>}
        {a.startedAt && <span className="font-normal text-slate-500">· {when(a.startedAt)}</span>}
        <a href={a.url} target="_blank" rel="noreferrer" className="ms-auto font-medium text-brand-700 hover:underline">Open</a>
      </span>
      {screen
        ? <video controls preload="metadata" src={a.url} className="max-h-64 w-full rounded-lg bg-slate-900" />
        : <audio controls preload="metadata" src={a.url} className="h-8 w-full" />}
    </div>
  );
}

function Attachments({ list }: { list: SupportAttachment[] }) {
  return (
    <div className="mt-1 flex flex-col gap-1.5">
      {list.map((a, i) => {
        if (a.recording) return <Recording key={i} a={a} />;
        if (a.mime.startsWith('image/')) {
          return (
            <a key={i} href={a.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg">
              <img src={a.url} alt={a.name} loading="lazy" className="max-h-72 max-w-full rounded-lg object-cover" />
            </a>
          );
        }
        if (a.mime.startsWith('audio/') || a.mime === 'video/webm') return <Voice key={i} a={a} />;
        return (
          <a key={i} href={a.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg bg-black/5 px-3 py-2 text-[0.8125rem] hover:bg-black/10">
            <FileText className="h-5 w-5 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{a.name}</span>
            <span className="shrink-0 text-[0.6875rem] opacity-70">{kb(a.bytes)}</span>
          </a>
        );
      })}
    </div>
  );
}

/** Earlier versions of an edited message, oldest first, then the current text. */
function VersionsModal({ m, onClose }: { m: SupportMessage; onClose: () => void }) {
  const list = m.history ?? [];
  return (
    <Modal open onClose={onClose} title="Earlier versions" description={`${list.length} earlier version${list.length === 1 ? '' : 's'} of this message`}>
      <ol className="space-y-2">
        {list.map((v, i) => (
          <li key={i} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="mb-0.5 text-[0.6875rem] font-semibold text-slate-500">Version {i + 1} · {when(v.at)}</p>
            <p className="whitespace-pre-wrap break-words text-[0.875rem] text-slate-800">{v.text ?? '(empty)'}</p>
          </li>
        ))}
        <li className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2">
          <p className="mb-0.5 text-[0.6875rem] font-semibold text-brand-700">Current{m.editedAt ? ` · edited ${when(m.editedAt)}` : ''}{m.deletedAt ? ' · deleted' : ''}</p>
          <p className="whitespace-pre-wrap break-words text-[0.875rem] text-slate-800">{m.purgedAt ? '(removed for good)' : m.text ?? '(no text)'}</p>
        </li>
      </ol>
    </Modal>
  );
}

function deletedLine(m: SupportMessage) {
  if (m.purgedAt) return `Removed for good${m.purgedByName ? ` by ${m.purgedByName}` : ''} · ${when(m.purgedAt)}`;
  const who = m.deletedBy === 'MERCHANT' ? 'merchant' : m.deletedBy === 'ADMIN' ? 'agent' : null;
  const name = m.deletedByName ? ` (${m.deletedByName})` : '';
  return `Deleted${who ? ` by ${who}${name}` : ''} · ${when(m.deletedAt!)}`;
}

export function MessageBubble({ m, onReply, onEdit, onDelete, onPurge, canEdit, canDelete, canPurge }: {
  m: SupportMessage;
  onReply: (m: SupportMessage) => void;
  onEdit: (m: SupportMessage) => void;
  onDelete: (m: SupportMessage) => void;
  /** Super admin: remove the content for good. */
  onPurge?: (m: SupportMessage) => void;
  canEdit: boolean;
  canDelete: boolean;
  canPurge?: boolean;
}) {
  const [menu, setMenu] = useState(false);
  const [versions, setVersions] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  const purgeable = !!canPurge && !!onPurge && !m.purgedAt;

  if (m.kind === 'SYSTEM' || m.sender === 'SYSTEM') {
    return (
      <div className="my-2 flex justify-center">
        <span className="max-w-[85%] rounded-full bg-slate-100 px-3 py-1 text-center text-[0.75rem] text-slate-600">{m.text}</span>
      </div>
    );
  }

  if (m.kind === 'CALL_EVENT' && m.meta?.call) {
    const c = m.meta.call;
    const missed = c.outcome !== 'completed';
    const Icon = c.media === 'screen' ? ScreenShare : missed ? PhoneMissed : Phone;
    const label = c.outcome === 'completed' ? `${c.media === 'screen' ? 'Screen share' : 'Voice call'} · ${mmss(c.durationSec)}` : c.outcome === 'declined' ? 'Call declined' : c.outcome === 'failed' ? 'Call failed' : 'Missed call';
    const recordings = m.attachments.filter((a) => a.recording);
    return (
      <div className="group my-2 flex flex-col items-center gap-1.5">
        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.75rem]', missed ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700')}>
          <Icon className="h-3.5 w-3.5" /> {label} · {c.startedBy === 'MERCHANT' ? 'from the shop' : 'from the team'} · {time(m.createdAt)}
          {(c.recorded?.audio || c.recorded?.screen) && <span className="inline-flex items-center gap-0.5 font-medium text-rose-700"><CircleDot className="h-3 w-3" /> Recorded</span>}
          {purgeable && recordings.length > 0 && (
            <button type="button" onClick={() => onPurge!(m)} className="ms-1 rounded-full p-0.5 text-slate-400 opacity-0 transition hover:text-rose-700 group-hover:opacity-100 focus-visible:opacity-100" aria-label="Delete recordings permanently" title="Delete recordings permanently">
              <XOctagon className="h-3.5 w-3.5" />
            </button>
          )}
        </span>
        {m.purgedAt && <span className="text-[0.6875rem] italic text-slate-400">Recordings: {deletedLine(m)}</span>}
        {recordings.map((a, i) => <Recording key={i} a={a} />)}
      </div>
    );
  }

  const mine = m.sender === 'ADMIN';
  const bot = m.sender === 'BOT';
  const deleted = !!m.deletedAt;
  const hasHistory = !!m.history?.length;

  return (
    <div className={cn('group my-1 flex', mine ? 'justify-end' : 'justify-start')}>
      <div className={cn(
        'relative max-w-[min(80%,36rem)] rounded-2xl px-3 py-2 text-[0.875rem] shadow-sm',
        deleted ? 'border border-dashed border-slate-300 bg-slate-50 text-slate-500 opacity-80' : m.internal ? 'border border-amber-300 bg-amber-50 text-amber-950' : mine ? 'rounded-br-md bg-brand-600 text-brand-fg' : bot ? 'rounded-bl-md border border-violet-200 bg-violet-50 text-violet-950' : 'rounded-bl-md border border-slate-200 bg-white text-slate-900',
      )}>
        {(m.internal || bot || (!mine && m.senderName)) && (
          <p className={cn('mb-0.5 flex items-center gap-1 text-[0.6875rem] font-semibold', m.internal ? 'text-amber-700' : bot ? 'text-violet-700' : 'text-slate-500')}>
            {m.internal && <><Lock className="h-3 w-3" /> Internal note{m.senderName ? ` · ${m.senderName}` : ''}</>}
            {bot && <><Bot className="h-3 w-3" /> Nafaa AI</>}
            {!m.internal && !bot && m.senderName}
          </p>
        )}
        {m.replyTo && (
          <div className={cn('mb-1 rounded-lg border-s-4 px-2 py-1 text-[0.75rem]', mine && !m.internal ? 'border-white/60 bg-white/15' : 'border-brand-400 bg-black/5')}>
            <span className="font-semibold">{m.replyTo.sender === 'MERCHANT' ? 'Shop' : m.replyTo.sender === 'BOT' ? 'Nafaa AI' : 'Team'}</span>
            <p className="line-clamp-2 opacity-80">{m.replyTo.deleted ? 'Deleted message' : m.replyTo.text ?? 'Attachment'}</p>
          </div>
        )}
        {deleted && (
          <p className="mb-0.5 flex items-center gap-1 text-[0.6875rem] font-semibold text-slate-500">
            <Trash2 className="h-3 w-3" /> {deletedLine(m)}
          </p>
        )}
        {m.purgedAt ? (
          <p className="italic opacity-70">Content removed. Only this record is kept.</p>
        ) : (
          <div>
            {m.text && <p className={'whitespace-pre-wrap break-words'}>{m.text}</p>}
            {m.attachments.length > 0 && <Attachments list={m.attachments} />}
            {bot && m.meta?.offerHandover && !deleted && <p className="mt-1 text-[0.6875rem] text-violet-700">Offered “Talk to our team”</p>}
            {deleted && !m.text && !m.attachments.length && <p className="italic opacity-70">(no content)</p>}
          </div>
        )}
        <div className={cn('mt-0.5 flex items-center justify-end gap-1 text-[0.6875rem]', mine && !m.internal && !deleted ? 'text-white/75' : 'text-slate-400')}>
          {m.editedAt && (hasHistory
            ? <button type="button" onClick={() => setVersions(true)} className="inline-flex items-center gap-0.5 underline-offset-2 hover:underline" title="See earlier versions"><History className="h-3 w-3" /> edited</button>
            : <span>edited</span>)}
          <span>{time(m.createdAt)}</span>
          {mine && !m.internal && !deleted && <span className="rounded bg-white/90 px-0.5"><Ticks m={m} /></span>}
        </div>
        {versions && <VersionsModal m={m} onClose={() => setVersions(false)} />}
        {(!deleted || purgeable) && (
          <button
            ref={anchor}
            type="button"
            onClick={() => setMenu(true)}
            className={cn('absolute top-1 rounded-full bg-white p-1 text-slate-500 opacity-0 shadow transition group-hover:opacity-100 focus-visible:opacity-100', mine ? '-start-8' : '-end-8')}
            aria-label="Message actions"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        )}
        <Menu open={menu} onClose={() => setMenu(false)} anchorRef={anchor} align={mine ? 'end' : 'start'} width="w-44">
          {!deleted && <MenuItem icon={<CornerUpLeft />} onClick={() => { setMenu(false); onReply(m); }}>Reply</MenuItem>}
          {canEdit && !deleted && <MenuItem icon={<Pencil />} onClick={() => { setMenu(false); onEdit(m); }}>Edit</MenuItem>}
          {hasHistory && <MenuItem icon={<History />} onClick={() => { setMenu(false); setVersions(true); }}>Earlier versions</MenuItem>}
          {canDelete && !deleted && <MenuItem icon={<Trash2 />} tone="danger" onClick={() => { setMenu(false); onDelete(m); }}>Delete</MenuItem>}
          {purgeable && <MenuItem icon={<XOctagon />} tone="danger" onClick={() => { setMenu(false); onPurge!(m); }}>Delete permanently</MenuItem>}
        </Menu>
      </div>
    </div>
  );
}
