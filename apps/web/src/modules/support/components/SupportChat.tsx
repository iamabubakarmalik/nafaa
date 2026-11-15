/**
 * The support chat, used by the floating panel (`variant="panel"`) and the
 * /support page (`variant="page"`).
 *
 * Header: who is helping (Nafaa AI, the team, or the agent by name), online /
 * away / last seen / typing, call and screen share buttons, and a menu.
 * Body: welcome with quick questions on an empty chat, messages with day
 * separators, Nafaa AI's question chips, the "Talk to our team" button, the
 * away note, a typing bubble and, after the chat is resolved, the rating card.
 * Pictures and PDFs can be dropped anywhere on the chat.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowDown, CircleCheck, EllipsisVertical, Headset, ImageIcon, Loader2, Maximize2, Monitor, Phone, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { NafaaAiMark } from '@modules/ai-assistant/components/NafaaAiMark';
import { FAQS } from '@modules/help/content';
import { canCall, canShareScreen, useCallStore } from '../lib/call';
import { dayKey, dayLabel, lastSeenText, replyTimeText } from '../lib/format';
import { useSupportStore, type ChatMessage } from '../store';
import { BotFollowUps, MessageBubble } from './MessageBubble';
import { Composer, filesFrom, stageFiles, type StagedFile } from './Composer';

/** Common questions shown when the server sends none. */
const FALLBACK_CHIPS = ['pos-sale', 'stock-update', 'khata', 'plan', 'password'];

function usePresenceLine(): { text: string; online: boolean } {
  const status = useSupportStore((s) => s.status);
  const conversation = useSupportStore((s) => s.conversation);
  const typing = useSupportStore((s) => s.typing);
  if (typing) return { text: typing.name ? t('{{name}} type kar rahe hain…', { name: typing.name }) : t('Type ho raha hai…'), online: true };
  const agent = conversation?.assignedAgent;
  if (agent && conversation?.status !== 'BOT') {
    if (agent.state === 'online') return { text: t('Online'), online: true };
    if (agent.state === 'away') return { text: t('Away · thori der mein reply'), online: false };
    return { text: lastSeenText(agent.lastSeenAt) ?? t('Offline'), online: false };
  }
  if ((!conversation || conversation.status === 'BOT') && status?.aiEnabled) return { text: t('Nafaa AI foran jawab deta hai'), online: true };
  const team = status?.team;
  if (!team) return { text: t('Nafaa Support'), online: false };
  if (team.state === 'online') return { text: status?.teamLine || t('Team online hai, abhi reply milega'), online: true };
  if (team.state === 'away') return { text: t('Team thori der mein reply karegi'), online: false };
  if (status && !status.withinHours && status.hoursText) return { text: t('Team abhi offline hai · {{hours}}', { hours: status.hoursText }), online: false };
  return { text: lastSeenText(team.lastSeenAt) ?? t('Team abhi offline hai'), online: false };
}

function Header({ onExpand, onClose }: { onExpand?: () => void; onClose?: () => void }) {
  const conversation = useSupportStore((s) => s.conversation);
  const resolve = useSupportStore((s) => s.resolve);
  const team = useSupportStore((s) => s.status?.team);
  const startCall = useCallStore((s) => s.start);
  const callPhase = useCallStore((s) => s.phase);
  const [menu, setMenu] = useState(false);
  const presence = usePresenceLine();
  const agent = conversation?.status !== 'BOT' ? conversation?.assignedAgent : null;
  const bot = !conversation || conversation.status === 'BOT';
  const live = !!conversation && !bot && conversation.status !== 'CLOSED';
  const teamReachable = (agent?.state ?? team?.state) === 'online' || (agent?.state ?? team?.state) === 'away';
  const inCall = callPhase !== 'idle' && callPhase !== 'ended';
  const callTitle = !teamReachable ? t('Team abhi offline hai') : undefined;
  const iconBtn = 'flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div className="flex shrink-0 items-center gap-2.5 border-b border-slate-200 bg-white px-3 py-2.5">
      <span className="relative shrink-0">
        {agent ? (
          agent.avatarUrl
            ? <img src={agent.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
            : <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-[0.9375rem] font-bold text-brand-fg">{agent.name.charAt(0).toUpperCase()}</span>
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 ring-1 ring-brand-100">{bot ? <NafaaAiMark size={26} /> : <Headset className="h-5 w-5 text-brand-700" />}</span>
        )}
        <span className={cn('absolute -bottom-0.5 -end-0.5 h-3 w-3 rounded-full ring-2 ring-white', presence.online ? 'bg-emerald-500' : 'bg-slate-300')} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[0.9375rem] font-semibold text-slate-900">
          {agent ? t('{{name}} (Nafaa team)', { name: agent.name }) : bot ? t('Nafaa Support') : t('Nafaa Support team')}
        </div>
        <div className={cn('truncate text-[0.75rem]', presence.online ? 'text-emerald-600' : 'text-slate-500')}>{presence.text}</div>
      </div>
      {live && canCall() && (
        <button type="button" className={iconBtn} disabled={inCall || !teamReachable} title={callTitle ?? t('Voice call karein')} aria-label={t('Voice call karein')}
          onClick={() => void startCall(conversation!.id, 'voice')}>
          <Phone className="h-[1.125rem] w-[1.125rem]" />
        </button>
      )}
      {live && canShareScreen() && (
        <button type="button" className={cn(iconBtn, 'hidden sm:flex')} disabled={inCall || !teamReachable} title={callTitle ?? t('Screen share karein')} aria-label={t('Screen share karein')}
          onClick={() => void startCall(conversation!.id, 'screen')}>
          <Monitor className="h-[1.125rem] w-[1.125rem]" />
        </button>
      )}
      {live && conversation!.status !== 'RESOLVED' && (
        <div className="relative">
          <button type="button" className={iconBtn} aria-label={t('Aur options')} aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
            <EllipsisVertical className="h-[1.125rem] w-[1.125rem]" />
          </button>
          {menu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} aria-hidden />
              <div className="absolute end-0 top-10 z-20 w-56 rounded-xl bg-white p-1 shadow-xl ring-1 ring-slate-200">
                <button type="button" onClick={() => { setMenu(false); void resolve(); }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-start text-[0.8125rem] font-medium text-slate-700 hover:bg-slate-100">
                  <CircleCheck className="h-4 w-4 text-emerald-600" /> {t('Issue solve ho gaya')}
                </button>
              </div>
            </>
          )}
        </div>
      )}
      {onExpand && (
        <button type="button" className={cn(iconBtn, 'hidden sm:flex')} onClick={onExpand} aria-label={t('Poori screen par kholein')} title={t('Poori screen par kholein')}>
          <Maximize2 className="h-4 w-4" />
        </button>
      )}
      {onClose && (
        <button type="button" className={iconBtn} onClick={onClose} aria-label={t('Band karein')}>
          <X className="h-[1.125rem] w-[1.125rem]" />
        </button>
      )}
    </div>
  );
}

function TypingBubble({ name }: { name: string | null }) {
  return (
    <div className="mt-2 flex items-end gap-1.5">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-[0.75rem] font-bold text-brand-fg">{(name || 'N').charAt(0).toUpperCase()}</span>
      <div className="flex items-center gap-1 rounded-2xl rounded-ss-md bg-white px-3.5 py-3 shadow-sm ring-1 ring-slate-200/80" aria-label={t('Type ho raha hai…')}>
        {[0, 150, 300].map((d) => <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${d}ms` }} />)}
      </div>
    </div>
  );
}

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto my-3 w-full max-w-sm rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-slate-200', className)}>{children}</div>;
}

function RatingCard() {
  const conversation = useSupportStore((s) => s.conversation);
  const rate = useSupportStore((s) => s.rate);
  const newChat = useSupportStore((s) => s.newChat);
  const [choice, setChoice] = useState<'up' | 'down' | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  if (!conversation || (conversation.status !== 'RESOLVED' && conversation.status !== 'CLOSED')) return null;
  const closed = conversation.status === 'CLOSED';

  if (conversation.rating) {
    return (
      <Card>
        <div className="text-[1.5rem]">{conversation.rating === 'up' ? '👍' : '👎'}</div>
        <div className="mt-1 text-[0.875rem] font-semibold text-slate-800">{t('Shukriya! Aap ki rating mil gayi.')}</div>
        {closed && <button type="button" onClick={newChat} className="mt-3 text-[0.8125rem] font-semibold text-brand-700 hover:underline">{t('Nayi chat shuru karein')}</button>}
      </Card>
    );
  }

  const send = async (rating: 'up' | 'down', withNote: string) => {
    setBusy(true);
    try { await rate(rating, withNote); } catch { /* the card stays to try again */ } finally { setBusy(false); }
  };

  return (
    <Card>
      <div className="text-[0.875rem] font-semibold text-slate-800">{t('Kya aap ka issue solve ho gaya?')}</div>
      <div className="mt-0.5 text-[0.75rem] text-slate-500">{t('Apni rating dein, is se humari support behtar hoti hai.')}</div>
      <div className="mt-3 flex justify-center gap-3">
        {(['up', 'down'] as const).map((r) => (
          <button key={r} type="button" disabled={busy} onClick={() => setChoice(r)} aria-pressed={choice === r}
            aria-label={r === 'up' ? t('Haan, achi support') : t('Nahi, theek nahi')}
            className={cn('flex h-12 w-16 items-center justify-center rounded-xl ring-1 transition',
              choice === r ? (r === 'up' ? 'bg-emerald-50 ring-emerald-400' : 'bg-rose-50 ring-rose-400') : 'bg-white ring-slate-200 hover:bg-slate-50')}>
            {r === 'up' ? <ThumbsUp className="h-5 w-5 text-emerald-600" /> : <ThumbsDown className="h-5 w-5 text-rose-600" />}
          </button>
        ))}
      </div>
      {choice && (
        <div className="mt-3 text-start">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500}
            placeholder={choice === 'up' ? t('Kuch kehna hai? (zaroori nahi)') : t('Kya behtar ho sakta tha? (zaroori nahi)')}
            className="w-full resize-none rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <button type="button" disabled={busy} onClick={() => void send(choice, note)}
            className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-600 py-2 text-[0.8125rem] font-semibold text-brand-fg hover:bg-brand-700 disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} {t('Rating bhejein')}
          </button>
        </div>
      )}
      {closed && !choice && <button type="button" onClick={newChat} className="mt-3 text-[0.8125rem] font-semibold text-brand-700 hover:underline">{t('Nayi chat shuru karein')}</button>}
    </Card>
  );
}

function AwayNote() {
  const status = useSupportStore((s) => s.status);
  const conversation = useSupportStore((s) => s.conversation);
  if (!status || !conversation || conversation.status !== 'WAITING' || status.team.state === 'online') return null;
  return (
    <Card className="bg-amber-50 ring-amber-200">
      <div className="text-[0.8125rem] font-semibold text-amber-900">{status.awayMessage || t('Team abhi online nahi hai')}</div>
      <div className="mt-1 text-[0.75rem] text-amber-800">
        {t('Aap ka message mil gaya, {{time}} mein reply karte hain. Reply aane par email bhi kar denge.', { time: replyTimeText(status.expectedReplyMinutes) })}
      </div>
      {status.hoursText && <div className="mt-1 text-[0.6875rem] text-amber-700">{t('Team timings: {{hours}}', { hours: status.hoursText })}</div>}
    </Card>
  );
}

function Welcome({ onChip, onHandover, busy }: { onChip: (text: string) => void; onHandover: () => void; busy: boolean }) {
  const status = useSupportStore((s) => s.status);
  const presence = usePresenceLine();
  const chips = status?.quickReplies?.length
    ? status.quickReplies.map((q) => q.label)
    : FAQS.filter((f) => FALLBACK_CHIPS.includes(f.id)).map((f) => f.q);
  return (
    <div className="flex flex-col items-center px-4 py-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-sm ring-1 ring-slate-200"><NafaaAiMark size={42} /></span>
      <h2 className="mt-3 text-[1.0625rem] font-bold text-slate-900">{t('Assalam-o-Alaikum! Kaise help karein?')}</h2>
      <p className="mt-1 max-w-xs text-[0.8125rem] text-slate-600">
        {status?.welcomeMessage || t('Apna sawal likhein, screenshot bhejein ya voice note record karein. Nafaa AI foran jawab deta hai, aur support team bhi yahin hai.')}
      </p>
      <div className={cn('mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] font-medium', presence.online ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
        <span className={cn('h-1.5 w-1.5 rounded-full', presence.online ? 'bg-emerald-500' : 'bg-slate-400')} /> {presence.text}
      </div>
      <div className="mt-4 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">{t('Aam sawal')}</div>
      <div className="mt-2 flex max-w-md flex-wrap justify-center gap-1.5">
        {chips.slice(0, 6).map((c) => (
          <button key={c} type="button" onClick={() => onChip(c)}
            className="rounded-full bg-white px-3 py-1.5 text-[0.75rem] font-medium text-brand-700 shadow-sm ring-1 ring-brand-200 transition hover:bg-brand-50">
            {c}
          </button>
        ))}
      </div>
      <button type="button" onClick={onHandover} disabled={busy}
        className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-[0.8125rem] font-semibold text-brand-fg shadow-sm transition hover:bg-brand-700 disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Headset className="h-4 w-4" />} {t('Support team se baat karein')}
      </button>
    </div>
  );
}

function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-4" onClick={onClose} role="dialog" aria-label={t('Photo')}>
      <img src={url} alt="" className="max-h-full max-w-full rounded-lg object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
      <button type="button" onClick={onClose} aria-label={t('Band karein')} className="absolute end-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

export function SupportChat({ variant, onExpand, onClose }: { variant: 'panel' | 'page'; onExpand?: () => void; onClose?: () => void }) {
  const messages = useSupportStore((s) => s.messages);
  const conversation = useSupportStore((s) => s.conversation);
  const loaded = useSupportStore((s) => s.loaded);
  const loading = useSupportStore((s) => s.loading);
  const loadError = useSupportStore((s) => s.loadError);
  const olderCursor = useSupportStore((s) => s.olderCursor);
  const loadingOlder = useSupportStore((s) => s.loadingOlder);
  const typing = useSupportStore((s) => s.typing);
  const handingOver = useSupportStore((s) => s.handingOver);
  const viewMounted = useSupportStore((s) => s.viewMounted);
  const load = useSupportStore((s) => s.load);
  const loadOlder = useSupportStore((s) => s.loadOlder);
  const sendText = useSupportStore((s) => s.sendText);
  const handover = useSupportStore((s) => s.handover);
  const [staged, setStagedState] = useState<StagedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const scroller = useRef<HTMLDivElement>(null);
  const dragDepth = useRef(0);
  const lastCount = useRef(0);

  useEffect(() => viewMounted(), [viewMounted]);

  const setStaged = useCallback((fn: (prev: StagedFile[]) => StagedFile[]) => setStagedState(fn), []);

  const scrollToEnd = useCallback((smooth = false) => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  // Stay at the newest message when one arrives (unless reading older ones), and after loading.
  useLayoutEffect(() => {
    const grew = messages.length > lastCount.current;
    const ownNew = grew && messages[messages.length - 1]?.sender === 'MERCHANT';
    if (lastCount.current === 0 || ownNew || (grew && atBottom)) scrollToEnd(lastCount.current !== 0);
    lastCount.current = messages.length;
  }, [messages, atBottom, scrollToEnd]);
  useEffect(() => { if (typing && atBottom) scrollToEnd(true); }, [typing, atBottom, scrollToEnd]);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
    if (el.scrollTop < 60 && olderCursor && !loadingOlder) {
      const before = el.scrollHeight;
      void loadOlder().then(() => requestAnimationFrame(() => { if (scroller.current) scroller.current.scrollTop += scroller.current.scrollHeight - before; }));
    }
  };

  const status = conversation?.status;
  // The last Nafaa AI answer, or a team message with chips (welcome / check-in), gets the follow-up chips.
  const lastBotIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.sender === 'BOT' || (m.sender === 'ADMIN' && m.meta?.chips?.length)) return i;
    }
    return -1;
  }, [messages]);

  const rows: ReactNode[] = [];
  let prevDay = '';
  let prev: ChatMessage | null = null;
  messages.forEach((m, i) => {
    const day = dayKey(m.createdAt);
    if (day !== prevDay) {
      rows.push(
        <div key={`d-${day}`} className="sticky top-1 z-[1] my-2 flex justify-center">
          <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-[0.6875rem] font-semibold text-slate-500 shadow-sm ring-1 ring-slate-200 backdrop-blur">{dayLabel(m.createdAt)}</span>
        </div>,
      );
      prevDay = day;
      prev = null;
    }
    const first = !prev || prev.sender !== m.sender || prev.kind === 'SYSTEM' || prev.kind === 'CALL_EVENT'
      || (prev.sender === 'ADMIN' && prev.senderUserId !== m.senderUserId)
      || new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() > 5 * 60_000;
    rows.push(<MessageBubble key={m.clientId && m.local ? m.clientId : m.id} m={m} first={first} onOpenImage={setImage} />);
    if (i === lastBotIndex && !m.deletedAt) {
      const isLast = i === messages.length - 1 || messages.slice(i + 1).every((x) => x.sender !== 'MERCHANT');
      rows.push(
        <BotFollowUps key={`f-${m.id}`}
          chips={isLast ? m.meta?.chips ?? [] : []}
          showHandover={m.sender === 'BOT' && status === 'BOT' && isLast}
          onChip={(c) => void sendText(c)} onHandover={() => void handover()} busy={handingOver} />,
      );
    }
    prev = m;
  });

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    const files = filesFrom(e.dataTransfer?.files);
    if (files.length) setStaged((p) => [...p, ...stageFiles(files)]);
  };
  const hasFiles = (e: React.DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');

  return (
    <div
      className="relative flex h-full min-h-0 flex-col overflow-hidden bg-white"
      onDragEnter={(e) => { if (!hasFiles(e)) return; e.preventDefault(); dragDepth.current++; setDragging(true); }}
      onDragOver={(e) => { if (hasFiles(e)) e.preventDefault(); }}
      onDragLeave={() => { dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDragging(false); }}
      onDrop={onDrop}
    >
      <Header onExpand={onExpand} onClose={onClose} />

      <div ref={scroller} onScroll={onScroll} className="relative min-h-0 flex-1 overflow-y-auto bg-slate-50 px-3 pb-3 sm:px-4" aria-live="polite">
        {!loaded && loading && (
          <div className="flex h-full items-center justify-center text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
        )}
        {!loaded && loadError && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-[0.8125rem] text-slate-500">
            {t('Chat load nahi hui. Internet check karein.')}
            <button type="button" onClick={() => void load(true)} className="font-semibold text-brand-700 hover:underline">{t('Dobara try karein')}</button>
          </div>
        )}
        {loaded && (
          <>
            {olderCursor && (
              <div className="flex justify-center py-2">
                <button type="button" onClick={() => void loadOlder()} disabled={loadingOlder} className="rounded-full bg-white px-3 py-1 text-[0.75rem] font-medium text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50">
                  {loadingOlder ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t('Purane messages dekhein')}
                </button>
              </div>
            )}
            {messages.length === 0 && <Welcome onChip={(c) => void sendText(c)} onHandover={() => void handover()} busy={handingOver} />}
            {rows}
            {typing && <TypingBubble name={typing.name} />}
            <AwayNote />
            <RatingCard />
          </>
        )}
      </div>

      {!atBottom && messages.length > 0 && (
        <button type="button" onClick={() => scrollToEnd(true)} aria-label={t('Naye messages')}
          className="absolute bottom-24 end-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-600 shadow-lg ring-1 ring-slate-200 hover:text-slate-900">
          <ArrowDown className="h-4 w-4" />
        </button>
      )}

      {loaded && status === 'BOT' && messages.length > 0 && (
        <div className="flex items-center justify-between gap-2 border-t border-slate-200 bg-brand-50/60 px-3 py-1.5 text-[0.75rem] text-slate-600">
          <span className="flex min-w-0 items-center gap-1.5"><NafaaAiMark size={16} /> <span className="truncate">{t('Nafaa AI jawab de raha hai')}</span></span>
          <button type="button" onClick={() => void handover()} disabled={handingOver} className="shrink-0 font-semibold text-brand-700 hover:underline disabled:opacity-60">
            {t('Support team se baat karein')}
          </button>
        </div>
      )}

      <Composer staged={staged} setStaged={setStaged} autoFocus={variant === 'page' || !!window.matchMedia?.('(min-width: 640px)')?.matches} />

      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-brand-400 bg-brand-50/90 text-brand-700">
          <ImageIcon className="h-8 w-8" />
          <div className="text-[0.875rem] font-semibold">{t('Screenshot ya file yahan chhor dein')}</div>
        </div>
      )}
      {image && <Lightbox url={image} onClose={() => setImage(null)} />}
    </div>
  );
}
