/**
 * One message in the chat. The user's question is a bubble; the answer shows
 * streaming text, a progress line while tools run, charts, the reorder
 * panel, action cards, links ("Report kholein"; a link the user asked for
 * is a main button), follow-up chips and the answer actions (copy, listen,
 * WhatsApp, feedback, regenerate). The time shows on hover or focus.
 */

import { useState } from 'react';
import { ArrowUpRight, Check, Copy, Mic, Pencil, RefreshCw, ThumbsDown, ThumbsUp, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { AiActionCard, useOpenLink } from './AiActionCard';
import { AiChartView } from './AiChartView';
import { AiMarkdown } from './AiMarkdown';
import { AiReorderPanel } from './AiReorderPanel';
import { NafaaAiMark } from './NafaaAiMark';
import { WhatsAppGlyph } from './WhatsAppGlyph';
import { speak, speechOutputSupported, useVoiceStore } from '../voice';
import type { ChatMessage } from '../store';

const action = 'inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-40';

/** Plain text for copy and WhatsApp: the answer without Markdown marks. */
export function plainAnswer(m: ChatMessage): string {
  const text = m.content
    .replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,4}\s+/gm, '')
    .trim();
  return `${text}\n\n— Nafaa AI`;
}

const timeOf = (iso: string) => {
  const d = new Date(iso);
  return {
    short: d.toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit', hour12: true }),
    full: d.toLocaleString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }),
  };
};

function Stamp({ iso, align }: { iso: string; align: 'left' | 'right' }) {
  const t = timeOf(iso);
  return (
    <time dateTime={iso} title={t.full}
      className={cn('block text-[0.625rem] text-slate-400 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100', align === 'right' && 'text-right')}>
      {t.short}
    </time>
  );
}

export function AiMessageItem({ m, isLast, streaming, canRegenerate, canEdit, onRegenerate, onRetry, onEdit, onFeedback, onAsk }: {
  m: ChatMessage;
  isLast: boolean;
  streaming: boolean;
  canRegenerate: boolean;
  canEdit: boolean;
  onRegenerate: () => void;
  onRetry: () => void;
  onEdit: () => void;
  onFeedback: (v: -1 | 0 | 1) => void;
  onAsk: (q: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const speakingId = useVoiceStore((s) => s.speakingId);
  const openLink = useOpenLink();

  if (m.role === 'user') {
    return (
      <div className="group flex justify-end gap-1">
        {canEdit && (
          <button type="button" className={cn(action, 'mt-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100')} onClick={onEdit} aria-label="Sawal badlein (↑)" title="Sawal badlein (↑)">
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
        <div className="max-w-[85%]">
          <div className="whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-brand-600 px-3.5 py-2 text-[0.875rem] text-brand-fg">
            {m.via === 'voice' && <Mic className="mr-1 inline h-3 w-3 opacity-80" aria-label="Awaaz se" />}
            {m.content}
          </div>
          <Stamp iso={m.createdAt} align="right" />
        </div>
      </div>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(plainAnswer(m));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Copy nahi ho saka');
    }
  };
  const share = () => window.open(`https://wa.me/?text=${encodeURIComponent(plainAnswer(m))}`, '_blank', 'noopener');
  const done = !m.pending && !m.error && !!m.content;
  const speaking = speakingId === m.id;
  const primary = m.links.filter((l) => l.primary);
  const other = m.links.filter((l) => !l.primary);
  const retryable = isLast && !!m.error && !m.pending && m.error.code !== 'LIMIT' && m.error.code !== 'FORBIDDEN';

  return (
    <div className="group flex gap-2.5">
      <NafaaAiMark size="sm" state={m.pending ? 'thinking' : 'idle'} className="mt-0.5" />
      <div className="min-w-0 flex-1 space-y-2.5">
        {/* Screen readers hear the answer as it streams in. */}
        <div aria-live={isLast ? 'polite' : undefined} aria-busy={m.pending || undefined} className="space-y-2.5">
          {m.pending && !m.content && (
            <p className="flex items-center gap-2 text-[0.8125rem] text-slate-500" role="status">
              <span className="inline-flex gap-0.5" aria-hidden>
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-500 [animation-delay:-0.2s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-500 [animation-delay:-0.1s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-500" />
              </span>
              {m.status ?? 'Soch raha hoon…'}
            </p>
          )}
          {m.content && <AiMarkdown text={m.content} />}
          {m.pending && m.content && m.status && <p className="text-[0.75rem] text-slate-400">{m.status}</p>}
        </div>
        {m.error && (
          <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-800" role="alert">
            <p>{m.error.message}</p>
            {retryable && (
              <Button size="xs" variant="secondary" onClick={onRetry} disabled={streaming} leftIcon={<RefreshCw className="h-3 w-3" />}>Dobara koshish</Button>
            )}
          </div>
        )}
        {m.charts.map((c, i) => <AiChartView key={i} chart={c} />)}
        {m.reorder && <AiReorderPanel reorder={m.reorder} />}
        {m.actions.map((a) => <AiActionCard key={a.id} action={a} />)}
        {primary.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {primary.map((l) => (
              <Button key={`${l.to}:${l.label}`} size="sm" onClick={() => openLink(l)} rightIcon={<ArrowUpRight className="h-3.5 w-3.5" />}>
                {l.label || 'Kholein'}
              </Button>
            ))}
          </div>
        )}
        {other.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {other.map((l) => (
              <button key={`${l.to}:${l.label}`} type="button" onClick={() => openLink(l)}
                className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[0.75rem] font-semibold text-brand-700 transition hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
                {l.label} <ArrowUpRight className="h-3 w-3" />
              </button>
            ))}
          </div>
        )}
        {done && (
          <div className="flex items-center gap-0.5">
            <button type="button" className={action} onClick={copy} aria-label="Copy" title="Copy">
              {copied ? <Check className="h-3.5 w-3.5 text-brand-600" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            {speechOutputSupported() && (
              <button type="button" className={cn(action, speaking && 'bg-brand-50 text-brand-700')} onClick={() => speak(m.id, m.content)}
                aria-pressed={speaking} aria-label={speaking ? 'Sunna band karein' : 'Sunein'} title={speaking ? 'Sunna band karein' : 'Sunein'}>
                {speaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              </button>
            )}
            <button type="button" className={action} onClick={share} aria-label="WhatsApp par bhejein" title="WhatsApp par bhejein">
              <WhatsAppGlyph className="h-3.5 w-3.5" />
            </button>
            <button type="button" className={cn(action, m.feedback === 1 && 'text-brand-600')} disabled={!m.saved}
              onClick={() => onFeedback(m.feedback === 1 ? 0 : 1)} aria-pressed={m.feedback === 1} aria-label="Acha jawab" title="Acha jawab">
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>
            <button type="button" className={cn(action, m.feedback === -1 && 'text-rose-600')} disabled={!m.saved}
              onClick={() => onFeedback(m.feedback === -1 ? 0 : -1)} aria-pressed={m.feedback === -1} aria-label="Theek nahi" title="Theek nahi">
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>
            {isLast && canRegenerate && (
              <button type="button" className={action} onClick={onRegenerate} aria-label="Dobara jawab" title="Dobara jawab">
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            )}
            <span className="ml-1"><Stamp iso={m.createdAt} align="left" /></span>
          </div>
        )}
        {isLast && !m.pending && !streaming && m.suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5" aria-label="Aage poochein">
            {m.suggestions.map((q) => (
              <button key={q} type="button" onClick={() => onAsk(q)}
                className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-left text-[0.75rem] text-slate-700 transition hover:border-brand-300 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
                {q}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
