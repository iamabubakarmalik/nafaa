/**
 * The Nafaa AI chat, used by the side drawer and the full /ai page.
 *
 * Header: history, new chat, expand/collapse, minimize, close. Body:
 * greeting with page suggestions, then the messages. Composer: Fast/Smart
 * mode, the "Is page ke baare mein" context chip, Stop while streaming.
 *
 * Keys: Enter or Ctrl+Enter sends, Shift+Enter adds a line, ↑ in an empty
 * box edits the last question, Alt+V starts or stops the mic, Esc closes
 * the history, cancels an edit, stops an answer, then closes the drawer
 * (or collapses the page).
 *
 * Voice: the mic writes what it hears into the box as it hears it and sends
 * by itself when the user stops talking, unless they started typing.
 */

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { History, Maximize2, Minimize2, Minus, PanelRight, PanelRightDashed, Send, SquarePen, Square, X, Zap, Brain, MapPin, Mic, MicOff } from 'lucide-react';
import { toast } from 'sonner';
import { IconButton, Kbd } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { aiApi } from '../api';
import { useAiStore } from '../store';
import { stopSpeaking, useSpeechInput, useVoiceStore, useWarmVoices } from '../voice';
import { pageContext, pageInfo } from '../suggestions';
import { AiHistory } from './AiHistory';
import { AiMessageItem } from './AiMessageItem';
import { NafaaAiMark } from './NafaaAiMark';

export function AiChat({ variant }: { variant: 'drawer' | 'page' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const s = useAiStore();
  const [text, setText] = useState('');
  const [editing, setEditing] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const lang = useVoiceStore((v) => v.lang);
  const setLang = useVoiceStore((v) => v.setLang);
  // Typed into the box while or after listening: then the voice text is not sent by itself.
  const typedDuringVoice = useRef(false);
  const textBeforeVoice = useRef('');
  // The box holds words the mic heard (sent as a voice question).
  const fromVoice = useRef(false);
  useWarmVoices();

  // The page the question is about: where the user is, or where they came from on /ai.
  const ctxPath = location.pathname.startsWith('/ai') ? (s.returnTo ?? '') : `${location.pathname}${location.search}`;
  const [ctxPathname, ctxSearch] = useMemo(() => {
    const i = ctxPath.indexOf('?');
    return i >= 0 ? [ctxPath.slice(0, i), ctxPath.slice(i)] : [ctxPath, ''];
  }, [ctxPath]);
  const info = pageInfo(ctxPathname || '/dashboard');
  const context = s.withContext && ctxPathname ? pageContext(ctxPathname, ctxSearch) : undefined;

  const status = useQuery({ queryKey: ['ai', 'status'], queryFn: aiApi.status, staleTime: 60_000, retry: false });
  useEffect(() => {
    if (status.data) {
      s.setRemaining(status.data.remaining);
    }
  }, [status.data]); // eslint-disable-line react-hooks/exhaustive-deps

  // A question handed over by the command palette.
  useEffect(() => {
    const q = s.takePendingAsk();
    if (q) void s.send(q, context);
  }, [s.pendingAsk]); // eslint-disable-line react-hooks/exhaustive-deps

  // Focus the box when the chat appears.
  useEffect(() => { const t = window.setTimeout(() => inputRef.current?.focus(), 60); return () => window.clearTimeout(t); }, []);

  // Keep the newest text in view unless the user scrolled up.
  useEffect(() => {
    const el = listRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [s.messages]);

  // Grow the box with its text, up to a limit.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  const lastUserIndex = useMemo(() => {
    for (let i = s.messages.length - 1; i >= 0; i--) if (s.messages[i].role === 'user') return i;
    return -1;
  }, [s.messages]);

  const submit = (via: 'text' | 'voice' = 'text', value = text) => {
    const q = value.trim();
    if (!q || s.streaming) return;
    setText('');
    fromVoice.current = false;
    stick.current = true;
    if (editing) { setEditing(false); void s.editLast(q, context, via); } else void s.send(q, context, via);
  };

  const voice = useSpeechInput({
    lang,
    onInterim: (heard) => {
      if (typedDuringVoice.current) return;
      const before = textBeforeVoice.current;
      fromVoice.current = true;
      setText(before ? `${before} ${heard}` : heard);
    },
    onFinal: (heard) => {
      if (!heard || typedDuringVoice.current) return;
      const before = textBeforeVoice.current;
      submit('voice', before ? `${before} ${heard}` : heard);
    },
    onError: (msg) => toast.error(msg),
  });
  const toggleMic = () => {
    if (!voice.supported) return;
    if (!voice.listening) {
      if (s.streaming) return;
      typedDuringVoice.current = false;
      textBeforeVoice.current = text.trim();
      stopSpeaking();
    }
    voice.toggle();
    inputRef.current?.focus();
  };

  // Alt+V: mic on / off, while this chat is on screen.
  const micRef = useRef(toggleMic);
  micRef.current = toggleMic;
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey && (e.code === 'KeyV' || e.key.toLowerCase() === 'v')) { e.preventDefault(); micRef.current(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Stop reading aloud when the chat closes.
  useEffect(() => () => stopSpeaking(), []);

  const startEdit = () => {
    if (lastUserIndex < 0 || s.streaming) return;
    setText(s.messages[lastUserIndex].content);
    setEditing(true);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const closeDrawer = () => { s.setOpen(false); };
  const collapse = () => { navigate(s.returnTo ?? '/dashboard'); s.setReturnTo(null); s.setOpen(true); };
  const expand = () => { s.setReturnTo(`${location.pathname}${location.search}`); s.setOpen(false); navigate('/ai'); };

  const onRootKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    if (historyOpen) { e.preventDefault(); setHistoryOpen(false); return; }
    if (editing) { e.preventDefault(); setEditing(false); setText(''); return; }
    if (voice.listening) { e.preventDefault(); voice.stop(); return; }
    if (s.streaming) { e.preventDefault(); s.stop(); return; }
    e.preventDefault();
    e.stopPropagation();
    if (variant === 'drawer') closeDrawer(); else if (s.returnTo) collapse();
  };

  const onInputKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (voice.listening) { typedDuringVoice.current = true; voice.stop(); }
      submit(fromVoice.current ? 'voice' : 'text');
      return;
    }
    if (e.key === 'ArrowUp' && !text && !e.shiftKey) { e.preventDefault(); startEdit(); }
  };

  const ask = (q: string) => { stick.current = true; void s.send(q, context); };

  const empty = s.messages.length === 0 && !s.loadingConversation;
  const smart = s.mode === 'smart';

  const header = (
    <div className="flex h-14 shrink-0 items-center gap-1 border-b border-slate-200 px-2.5">
      <IconButton label="Purani chats" onClick={() => setHistoryOpen((v) => !v)} aria-pressed={historyOpen}
        className={cn('h-8 w-8', variant === 'page' && 'lg:hidden', historyOpen && 'bg-slate-100 text-slate-900')}>
        <History className="h-4 w-4" />
      </IconButton>
      <div className="flex min-w-0 flex-1 items-center gap-2 px-1">
        <NafaaAiMark size="sm" state={s.streaming ? 'thinking' : 'idle'} />
        <div className="min-w-0">
          <div className="truncate text-[0.875rem] font-semibold text-slate-900">{s.title || 'Nafaa AI'}</div>
          {s.remaining != null && (
            <div className="text-[0.6875rem] text-slate-500">Aaj {s.remaining} sawal baqi</div>
          )}
        </div>
      </div>
      <IconButton label="Nayi chat" onClick={() => { s.newChat(); setEditing(false); setText(''); inputRef.current?.focus(); }} className="h-8 w-8">
        <SquarePen className="h-4 w-4" />
      </IconButton>
      {variant === 'drawer' ? (
        <>
          <IconButton
            label={s.pushPinned ? 'Page ke upar kholein (unpin)' : 'Page ke saath rakhein (pin)'}
            onClick={() => s.setPushPinned(!s.pushPinned)}
            aria-pressed={s.pushPinned}
            className="hidden h-8 w-8 min-[1600px]:inline-flex"
          >
            {s.pushPinned ? <PanelRight className="h-4 w-4" /> : <PanelRightDashed className="h-4 w-4" />}
          </IconButton>
          <IconButton label="Poore page par kholein" onClick={expand} className="hidden h-8 w-8 sm:inline-flex"><Maximize2 className="h-4 w-4" /></IconButton>
          <IconButton label="Chhota karein (chat rahegi)" onClick={closeDrawer} className="h-8 w-8"><Minus className="h-4 w-4" /></IconButton>
          <IconButton label="Band karein (Esc)" onClick={() => { s.stop(); s.newChat(); closeDrawer(); }} className="h-8 w-8"><X className="h-4 w-4" /></IconButton>
        </>
      ) : (
        <IconButton label="Side panel me wapas" onClick={collapse} className="h-8 w-8"><Minimize2 className="h-4 w-4" /></IconButton>
      )}
    </div>
  );

  const greeting = (
    <div className="flex flex-col items-center px-4 pb-4 pt-8 text-center">
      <NafaaAiMark size="lg" />
      <h2 className="mt-3 text-[1rem] font-semibold text-slate-900">Assalam-o-Alaikum! Main Nafaa AI hoon.</h2>
      <p className="mt-1 max-w-sm text-[0.8125rem] text-slate-500">
        Apni dukaan ke baare mein kuch bhi poochein — Sale, Profit, stock, udhaar, expenses. Jawab aap ke asal data se aata hai.
      </p>
      <div className="mt-5 flex w-full max-w-md flex-col gap-1.5">
        {info.questions.map((q) => (
          <button key={q} type="button" onClick={() => ask(q)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-[0.8125rem] text-slate-700 transition hover:border-brand-300 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
            {q}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-white" onKeyDown={onRootKey}>
      {header}

      {historyOpen && (
        <div className={cn('absolute inset-x-0 bottom-0 top-14 z-10 flex flex-col border-t border-slate-200 bg-slate-50', variant === 'page' && 'lg:hidden')}>
          <AiHistory onPicked={() => setHistoryOpen(false)} className="flex-1" />
        </div>
      )}

      <div
        ref={listRef}
        className="min-h-0 flex-1 overflow-y-auto"
        onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}
      >
        {s.loadingConversation && <p className="p-4 text-[0.8125rem] text-slate-500">Chat khul rahi hai…</p>}
        {empty ? greeting : (
          <div className={cn('space-y-5 px-3 py-4 sm:px-4', variant === 'page' && 'mx-auto max-w-3xl')}>
            {s.messages.map((m, i) => (
              <AiMessageItem
                key={m.id}
                m={m}
                isLast={i === s.messages.length - 1}
                canRegenerate={!s.streaming && !!s.conversationId}
                canEdit={i === lastUserIndex && !s.streaming}
                onRegenerate={() => { stick.current = true; void s.regenerate(context); }}
                onEdit={startEdit}
                onFeedback={(v) => { s.setFeedback(m.id, v).catch(() => toast.error('Feedback save nahi hua')); }}
                streaming={s.streaming}
                onRetry={() => { stick.current = true; void s.retry(context); }}
                onAsk={ask}
              />
            ))}
          </div>
        )}
      </div>

      <div className={cn('shrink-0 border-t border-slate-200 bg-white p-2.5', variant === 'page' && 'sm:px-4')}>
        <div className={cn(variant === 'page' && 'mx-auto max-w-3xl')}>
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5" role="radiogroup" aria-label="Jawab ka tareeqa">
              <button type="button" role="radio" aria-checked={!smart} onClick={() => s.setMode('fast')}
                className={cn('inline-flex items-center gap-1 rounded-md px-2 py-1 text-[0.75rem] font-medium transition', !smart ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                <Zap className="h-3 w-3" /> Fast
              </button>
              <button type="button" role="radio" aria-checked={smart} onClick={() => s.setMode('smart')}
                title="Gehra jaiza — 3 message ke barabar"
                className={cn('inline-flex items-center gap-1 rounded-md px-2 py-1 text-[0.75rem] font-medium transition', smart ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                <Brain className="h-3 w-3" /> Smart
              </button>
            </div>
            {smart && <span className="text-[0.6875rem] text-slate-500">3 message ke barabar</span>}
            {voice.supported && (
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5" role="radiogroup" aria-label="Awaaz ki zaban">
                {(['ur-PK', 'en-PK'] as const).map((l) => (
                  <button key={l} type="button" role="radio" aria-checked={lang === l} onClick={() => setLang(l)} disabled={voice.listening}
                    className={cn('rounded-md px-2 py-1 text-[0.75rem] font-medium transition', lang === l ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                    {l === 'ur-PK' ? <span className="font-urdu">اردو</span> : 'English'}
                  </button>
                ))}
              </div>
            )}
            {ctxPathname && (
              <button type="button" onClick={() => s.setWithContext(!s.withContext)} aria-pressed={s.withContext}
                title="Sawal ke saath ye page bhi bhejein"
                className={cn('ml-auto inline-flex max-w-[60%] items-center gap-1 truncate rounded-full border px-2 py-0.5 text-[0.6875rem] font-medium transition',
                  s.withContext ? 'border-brand-200 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50')}>
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">Is page ke baare mein{info.title ? `: ${info.title}` : ''}</span>
              </button>
            )}
          </div>
          {voice.listening && (
            <div className="mb-1 flex items-center gap-2 text-[0.6875rem] font-medium text-rose-600" role="status">
              <span className="flex h-3 items-end gap-0.5" aria-hidden>
                {[0, 1, 2, 3, 4].map((i) => (
                  <span key={i} className="w-0.5 rounded-full bg-rose-500 motion-safe:animate-pulse" style={{ height: `${[6, 12, 8, 11, 5][i]}px`, animationDelay: `${i * 120}ms` }} />
                ))}
              </span>
              Sun raha hoon… ({lang === 'ur-PK' ? 'اردو' : 'English'}) · chup hone par khud bhej dunga
            </div>
          )}
          {editing && (
            <div className="mb-1 flex items-center gap-2 text-[0.6875rem] text-brand-700">
              Pichhla sawal badal rahe hain <Kbd>Esc</Kbd> chhorein
            </div>
          )}
          <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/15">
            <label htmlFor={`ai-input-${variant}`} className="sr-only">Nafaa AI se poochein</label>
            <textarea
              id={`ai-input-${variant}`}
              ref={inputRef}
              rows={1}
              value={text}
              maxLength={2000}
              onChange={(e) => { if (voice.listening) typedDuringVoice.current = true; setText(e.target.value); }}
              onKeyDown={onInputKey}
              placeholder='Kuch bhi poochein… jaise "Aaj ki sale?"'
              className="max-h-40 min-h-[1.75rem] flex-1 resize-none bg-transparent py-1 text-[0.875rem] text-slate-900 outline-none placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={toggleMic}
              disabled={!voice.supported || (s.streaming && !voice.listening)}
              aria-pressed={voice.listening}
              aria-label={!voice.supported ? 'Awaaz wala sawal Chrome / Edge me chalta hai' : voice.listening ? 'Sunna band karein (Alt+V)' : 'Bol kar poochein (Alt+V)'}
              title={!voice.supported ? 'Awaaz wala sawal Chrome / Edge me chalta hai' : voice.listening ? 'Sunna band karein (Alt+V)' : 'Bol kar poochein (Alt+V)'}
              className={cn(
                'relative mb-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-40',
                voice.listening ? 'bg-rose-600 text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
              )}
            >
              {voice.listening && <span className="absolute inset-0 rounded-lg bg-rose-500/40 motion-safe:animate-ping" aria-hidden />}
              {voice.supported ? <Mic className="relative h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </button>
            {s.streaming ? (
              <button type="button" onClick={s.stop} aria-label="Rokein"
                className="mb-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:bg-slate-200 dark:text-slate-900">
                <Square className="h-3.5 w-3.5" fill="currentColor" />
              </button>
            ) : (
              <button type="button" onClick={() => submit(fromVoice.current ? 'voice' : 'text')} disabled={!text.trim()} aria-label="Bhejein (Enter)"
                className="mb-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-brand-fg transition hover:bg-brand-700 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
                <Send className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <p className="mt-1 hidden text-[0.6875rem] text-slate-400 sm:block">
            <Kbd>Enter</Kbd> bhejein · <Kbd>Shift</Kbd>+<Kbd>Enter</Kbd> nayi line · <Kbd>↑</Kbd> pichhla sawal badlein · <Kbd>Alt</Kbd>+<Kbd>V</Kbd> mic · Nafaa AI ghalti kar sakta hai, zaroori number report me dekh lein.
          </p>
        </div>
      </div>
    </div>
  );
}
