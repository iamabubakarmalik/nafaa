/**
 * One chat row: a WhatsApp-style bubble (own messages at the end side, the
 * team's at the start), a centred line for system and call events, or the
 * Nafaa AI answer with its question chips.
 *
 * Bubbles show the quoted reply, pictures, files, voice notes, the time,
 * "edited", and ticks on own messages: clock while sending, one tick sent,
 * two grey delivered, two blue read; failed drafts offer Retry.
 * Hover (or the ⋮ button on touch screens) shows Reply, Copy, Edit, Delete.
 */

import { Fragment, memo, useState, type ReactNode } from 'react';
import {
  Check, CheckCheck, CircleAlert, Clock3, Copy, Download, EllipsisVertical, FileText, Pencil, Phone, PhoneMissed, Monitor, Reply, RotateCw, Trash2, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { confirmDialog } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { AiMarkdown } from '@modules/ai-assistant/components/AiMarkdown';
import { NafaaAiMark } from '@modules/ai-assistant/components/NafaaAiMark';
import { SUPPORT_LIMITS, type SupportAttachment, type SupportReplyPreview } from '../api/support.types';
import { clock } from '../lib/recorder';
import { sizeText, timeOf } from '../lib/format';
import { previewText, useSupportStore, type ChatMessage } from '../store';
import { VoicePlayer } from './VoicePlayer';

const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g;

/** Text with clickable links and kept line breaks. */
function Linkified({ text }: { text: string }) {
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((p, i) => (i % 2 === 1
        ? <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="break-all font-medium text-brand-700 underline underline-offset-2">{p}</a>
        : <Fragment key={i}>{p}</Fragment>))}
    </>
  );
}

export function senderLabel(m: { sender: string; senderName?: string | null; meta?: { senderName?: string } | null }): string {
  if (m.sender === 'MERCHANT') return t('Aap');
  if (m.sender === 'BOT') return t('Nafaa AI');
  const name = m.meta?.senderName || m.senderName;
  return name ? t('{{name}} (Nafaa team)', { name }) : t('Nafaa team');
}

/** Scrolls to a message and flashes it (reply quotes). */
export function jumpTo(id: string) {
  const el = document.querySelector<HTMLElement>(`[data-mid="${CSS.escape(id)}"]`);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.add('bg-amber-100');
  window.setTimeout(() => el.classList.remove('bg-amber-100'), 1400);
}

function Quote({ reply, mine }: { reply: SupportReplyPreview; mine: boolean }) {
  return (
    <button
      type="button"
      onClick={() => jumpTo(reply.id)}
      className={cn('mb-1 block w-full rounded-lg border-s-4 px-2 py-1 text-start text-[0.75rem]', mine ? 'border-brand-500 bg-brand-600/10' : 'border-slate-400 bg-slate-900/5')}
    >
      <span className="block font-semibold text-slate-700">{senderLabel({ sender: reply.sender })}</span>
      <span className="line-clamp-2 text-slate-600">
        {reply.deleted ? t('Ye message delete ho gaya') : reply.text || previewText({ kind: reply.kind, text: null, deletedAt: null })}
      </span>
    </button>
  );
}

function Pictures({ items, onOpen }: { items: SupportAttachment[]; onOpen: (url: string) => void }) {
  return (
    <div className={cn('mb-1 grid gap-1', items.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
      {items.map((a, i) => {
        const ratio = a.width && a.height ? a.width / a.height : 4 / 3;
        return (
          <button key={`${a.url}-${i}`} type="button" onClick={() => onOpen(a.url)} className="block overflow-hidden rounded-lg bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
            <img
              src={a.url}
              alt={a.name}
              loading="lazy"
              className="block max-h-72 w-full object-cover"
              style={items.length === 1 ? { aspectRatio: String(Math.min(2, Math.max(0.6, ratio))) } : { aspectRatio: '1' }}
            />
          </button>
        );
      })}
    </div>
  );
}

function FileChip({ a, mine }: { a: SupportAttachment; mine: boolean }) {
  return (
    <a
      href={a.url}
      target="_blank"
      rel="noopener noreferrer"
      download={a.name}
      className={cn('mb-1 flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition', mine ? 'bg-brand-600/10 hover:bg-brand-600/15' : 'bg-slate-900/5 hover:bg-slate-900/10')}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600"><FileText className="h-[1.125rem] w-[1.125rem]" /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.8125rem] font-semibold text-slate-800">{a.name}</span>
        <span className="block text-[0.6875rem] text-slate-500">{a.mime === 'application/pdf' ? 'PDF' : t('File')} · {sizeText(a.bytes)}</span>
      </span>
      <Download className="h-4 w-4 shrink-0 text-slate-500" />
    </a>
  );
}

function Ticks({ m }: { m: ChatMessage }) {
  if (m.local === 'sending') return <Clock3 className="h-3.5 w-3.5 text-slate-400" aria-label={t('Ja raha hai')} />;
  if (m.local === 'failed') return <CircleAlert className="h-3.5 w-3.5 text-rose-500" aria-label={t('Nahi gaya')} />;
  if (m.readAt) return <CheckCheck className="h-4 w-4 text-sky-500" aria-label={t('Parh liya')} />;
  if (m.deliveredAt) return <CheckCheck className="h-4 w-4 text-slate-400" aria-label={t('Pohanch gaya')} />;
  return <Check className="h-4 w-4 text-slate-400" aria-label={t('Chala gaya')} />;
}

/** Centred pill for SYSTEM messages, in the viewer's language when the code is known. */
function systemText(m: ChatMessage): string {
  const name = m.meta?.params?.name ? String(m.meta.params.name) : '';
  switch (m.meta?.code) {
    case 'agent_joined': return name ? t('{{name}} (Nafaa team) chat mein shamil ho gaye', { name }) : t('Nafaa team chat mein shamil ho gayi');
    case 'transferred': return name ? t('Ab {{name}} (Nafaa team) aap ki help karenge', { name }) : (m.text ?? '');
    case 'handover': return t('Aap ki chat support team ko bhej di gayi. Thori der mein reply milega.');
    case 'resolved': return t('Chat resolve ho gayi');
    case 'reopened': return t('Chat dobara khul gayi');
    case 'closed': return t('Chat band ho gayi');
    case 'rated': return t('Rating ka shukriya!');
    default: return m.text ?? '';
  }
}

function CallLine({ m }: { m: ChatMessage }) {
  const c = m.meta?.call;
  const missed = c && (c.outcome === 'missed' || c.outcome === 'declined' || c.outcome === 'failed');
  const label = !c ? (m.text ?? t('Call'))
    : c.outcome === 'completed' ? (c.media === 'screen' ? t('Screen share · {{time}}', { time: clock(c.durationSec) }) : t('Voice call · {{time}}', { time: clock(c.durationSec) }))
      : c.outcome === 'declined' ? t('Call decline hui')
        : c.outcome === 'failed' ? t('Call connect nahi hui')
          : c.startedBy === 'MERCHANT' ? t('Team ne call nahi uthayi') : t('Missed call');
  const Icon = missed ? PhoneMissed : c?.media === 'screen' ? Monitor : Phone;
  return (
    <div className="my-1.5 flex justify-center" data-mid={m.id}>
      <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.75rem] font-medium shadow-sm ring-1', missed ? 'bg-rose-50 text-rose-700 ring-rose-100' : 'bg-white text-slate-600 ring-slate-200')}>
        <Icon className="h-3.5 w-3.5" /> {label} <span className="text-slate-400">· {timeOf(m.createdAt)}</span>
      </span>
    </div>
  );
}

function Actions({ m, mine, onClose }: { m: ChatMessage; mine: boolean; onClose?: () => void }) {
  const setReplyTo = useSupportStore((s) => s.setReplyTo);
  const setEditing = useSupportStore((s) => s.setEditing);
  const remove = useSupportStore((s) => s.deleteMessage);
  const canEdit = mine && m.kind === 'TEXT' && !m.deletedAt && Date.now() - new Date(m.createdAt).getTime() < SUPPORT_LIMITS.editWindowMinutes * 60_000;
  const btn = 'flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800';
  return (
    <div className="flex items-center gap-0.5 rounded-full bg-white px-1 py-0.5 shadow-md ring-1 ring-slate-200">
      <button type="button" className={btn} title={t('Reply')} aria-label={t('Reply')} onClick={() => { setReplyTo(m); onClose?.(); }}><Reply className="h-3.5 w-3.5 rtl-flip" /></button>
      {m.text && (
        <button type="button" className={btn} title={t('Copy')} aria-label={t('Copy')}
          onClick={() => { void navigator.clipboard?.writeText(m.text ?? '').then(() => toast.success(t('Copy ho gaya'))); onClose?.(); }}>
          <Copy className="h-3.5 w-3.5" />
        </button>
      )}
      {canEdit && <button type="button" className={btn} title={t('Edit')} aria-label={t('Edit')} onClick={() => { setEditing(m); onClose?.(); }}><Pencil className="h-3.5 w-3.5" /></button>}
      {mine && !m.deletedAt && (
        <button type="button" className={cn(btn, 'hover:text-rose-600')} title={t('Delete')} aria-label={t('Delete')}
          onClick={async () => {
            onClose?.();
            if (await confirmDialog({ title: t('Ye message delete karein?'), text: t('Support team ko bhi ye message nazar nahi aayega.'), yes: t('Delete'), danger: true })) await remove(m.id);
          }}>
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export const MessageBubble = memo(function MessageBubble({ m, first, onOpenImage }: {
  m: ChatMessage;
  /** First of a run from the same sender (shows the name and the bubble tail). */
  first: boolean;
  onOpenImage: (url: string) => void;
}) {
  const [menu, setMenu] = useState(false);
  const retry = useSupportStore((s) => s.retry);
  const discard = useSupportStore((s) => s.discard);

  if (m.kind === 'SYSTEM') {
    const text = systemText(m);
    if (!text) return null;
    return (
      <div className="my-1.5 flex justify-center px-6" data-mid={m.id}>
        <span className="rounded-full bg-sky-50 px-3 py-1 text-center text-[0.75rem] font-medium text-sky-800 shadow-sm ring-1 ring-sky-100">{text}</span>
      </div>
    );
  }
  if (m.kind === 'CALL_EVENT') return <CallLine m={m} />;

  const mine = m.sender === 'MERCHANT';
  const bot = m.sender === 'BOT';
  const pictures = m.attachments.filter((a) => a.mime.startsWith('image/'));
  const voice = m.kind === 'VOICE' ? m.attachments.find((a) => a.mime.startsWith('audio/') || a.mime.startsWith('video/')) ?? m.attachments[0] : null;
  const files = m.attachments.filter((a) => a !== voice && !a.mime.startsWith('image/'));
  const deleted = !!m.deletedAt;

  let body: ReactNode;
  if (deleted) {
    body = <p className="italic text-slate-500">{t('Ye message delete ho gaya')}</p>;
  } else {
    body = (
      <>
        {m.replyTo && <Quote reply={m.replyTo} mine={mine} />}
        {pictures.length > 0 && <Pictures items={pictures} onOpen={onOpenImage} />}
        {voice && <VoicePlayer url={voice.url} durationSec={voice.durationSec} waveform={voice.waveform} mine={mine} />}
        {files.map((a, i) => <FileChip key={`${a.url}-${i}`} a={a} mine={mine} />)}
        {m.text && (bot
          ? <AiMarkdown text={m.text} />
          : <p className="whitespace-pre-wrap break-words"><Linkified text={m.text} /></p>)}
      </>
    );
  }

  return (
    <div data-mid={m.id} className={cn('group flex rounded-xl transition-colors', mine ? 'justify-end' : 'justify-start', first ? 'mt-2' : 'mt-0.5')}>
      {!mine && (
        <div className="me-1.5 w-7 shrink-0 self-end">
          {first && (bot
            ? <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white ring-1 ring-slate-200"><NafaaAiMark size={18} /></span>
            : <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-[0.75rem] font-bold text-brand-fg">{(m.meta?.senderName || m.senderName || 'N').charAt(0).toUpperCase()}</span>)}
        </div>
      )}
      <div className={cn('relative flex max-w-[85%] items-center gap-1 sm:max-w-[75%]', mine && 'flex-row-reverse')}>
        <div
          className={cn(
            'relative min-w-[4.5rem] rounded-2xl px-3 py-1.5 text-[0.875rem] leading-relaxed text-slate-800 shadow-sm',
            mine ? 'bg-brand-50 ring-1 ring-brand-100' : 'bg-white ring-1 ring-slate-200/80',
            first && (mine ? 'rounded-se-md' : 'rounded-ss-md'),
            m.local === 'failed' && 'ring-rose-300',
          )}
        >
          {first && !mine && <div className={cn('mb-0.5 text-[0.75rem] font-semibold', bot ? 'text-violet-700' : 'text-brand-700')}>{senderLabel(m)}</div>}
          {body}
          {m.local === 'sending' && m.progress != null && (
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-brand-100"><div className="h-full bg-brand-500 transition-[width]" style={{ width: `${m.progress}%` }} /></div>
          )}
          <div className="-mb-0.5 mt-0.5 flex items-center justify-end gap-1 text-[0.6875rem] text-slate-400">
            {m.editedAt && !deleted && <span>{t('edited')}</span>}
            <span className="tabular-nums">{timeOf(m.createdAt)}</span>
            {mine && <Ticks m={m} />}
          </div>
          {m.local === 'failed' && (
            <div className="mt-1 flex items-center gap-2 border-t border-rose-100 pt-1 text-[0.75rem]">
              <button type="button" onClick={() => void retry(m.clientId!)} className="inline-flex items-center gap-1 font-semibold text-rose-600 hover:underline"><RotateCw className="h-3 w-3" /> {t('Dobara bhejein')}</button>
              <button type="button" onClick={() => discard(m.clientId!)} className="inline-flex items-center gap-1 text-slate-500 hover:underline"><X className="h-3 w-3" /> {t('Hatayein')}</button>
            </div>
          )}
        </div>
        {!m.local && !deleted && (
          <div className={cn('shrink-0 transition', menu ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100')}>
            {menu
              ? <Actions m={m} mine={mine} onClose={() => setMenu(false)} />
              : (
                <button type="button" onClick={() => setMenu(true)} aria-label={t('Aur options')} className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-white hover:text-slate-700 hover:shadow-sm">
                  <EllipsisVertical className="h-4 w-4" />
                </button>
              )}
          </div>
        )}
      </div>
    </div>
  );
});

/** Question chips and the "Talk to our team" button under a Nafaa AI answer. */
export function BotFollowUps({ chips, showHandover, onChip, onHandover, busy }: {
  chips: string[];
  showHandover: boolean;
  onChip: (text: string) => void;
  onHandover: () => void;
  busy?: boolean;
}) {
  if (!chips.length && !showHandover) return null;
  return (
    <div className="ms-[2.125rem] mt-1.5 flex flex-wrap gap-1.5">
      {chips.slice(0, 4).map((c) => (
        <button key={c} type="button" onClick={() => onChip(c)}
          className="rounded-full bg-white px-3 py-1 text-[0.75rem] font-medium text-brand-700 shadow-sm ring-1 ring-brand-200 transition hover:bg-brand-50">
          {c}
        </button>
      ))}
      {showHandover && (
        <button type="button" onClick={onHandover} disabled={busy}
          className="rounded-full bg-brand-600 px-3 py-1 text-[0.75rem] font-semibold text-brand-fg shadow-sm transition hover:bg-brand-700 disabled:opacity-60">
          {t('Support team se baat karein')}
        </button>
      )}
    </div>
  );
}
