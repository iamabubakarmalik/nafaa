/**
 * Message composer for the support thread: reply or internal note, saved
 * replies with "/", Nafaa AI drafts, emoji, attachments (button, paste or
 * drop; images and PDFs up to 15 MB), voice notes up to 2 minutes, and the
 * typing indicator. Enter sends, Shift+Enter adds a line.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Lock, MessageSquare, Mic, Paperclip, Send, Smile, Sparkles, Square, X } from 'lucide-react';
import { Menu, Segmented } from '@/design-system/components';
import { cn } from '@/lib/cn';
import { apiError } from '@/lib/errors';
import { adminSupportApi } from '@/api/admin-support.api';
import { supportSocket } from '../lib/socket';
import { SUPPORT_EVENTS, SUPPORT_LIMITS, type SupportAttachment, type SupportMessage } from '../lib/support.types';

const EMOJI = ['🙂', '😊', '👍', '🙏', '✅', '👌', '🎉', '❤️', '😅', '🤝', '📌', '⏳', '📞', '💡', '⚠️', '😔'];
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,application/pdf';

export function Composer({ conversationId, canReply, replyTo, onClearReply, editing, onDoneEdit, onSent }: {
  conversationId: string;
  canReply: boolean;
  replyTo: SupportMessage | null;
  onClearReply: () => void;
  editing: SupportMessage | null;
  onDoneEdit: () => void;
  onSent: (m: SupportMessage) => void;
}) {
  const [mode, setMode] = useState<'reply' | 'note'>('reply');
  const [text, setText] = useState('');
  const [files, setFiles] = useState<SupportAttachment[]>([]);
  const [uploading, setUploading] = useState(0);
  const [drafts, setDrafts] = useState<string[]>([]);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [cannedIndex, setCannedIndex] = useState(0);
  const emojiRef = useRef<HTMLButtonElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const typingAt = useRef(0);

  useEffect(() => { setText(''); setFiles([]); setDrafts([]); setMode('reply'); }, [conversationId]);
  useEffect(() => { if (editing) { setText(editing.text ?? ''); area.current?.focus(); } }, [editing]);

  const canned = useQuery({ queryKey: ['support', 'canned'], queryFn: () => adminSupportApi.canned(), staleTime: 5 * 60_000 });
  const slash = text.startsWith('/') && !text.includes('\n') ? text.slice(1).toLowerCase() : null;
  const cannedMatches = useMemo(() => {
    if (slash === null) return [];
    return (canned.data ?? []).filter((c) => !slash || c.title.toLowerCase().includes(slash) || c.tags.some((t) => t.includes(slash))).slice(0, 8);
  }, [slash, canned.data]);

  const send = useMutation({
    mutationFn: () => adminSupportApi.send(conversationId, {
      text: text.trim() || undefined,
      attachments: files.length ? files : undefined,
      replyToId: replyTo?.id,
      internal: mode === 'note',
      clientId: crypto.randomUUID(),
    }),
    onSuccess: (m) => { setText(''); setFiles([]); setDrafts([]); onClearReply(); onSent(m); typing(false); },
    onError: (e) => toast.error(apiError(e)),
  });
  const edit = useMutation({
    mutationFn: () => adminSupportApi.editMessage(editing!.id, text.trim()),
    onSuccess: (m) => { setText(''); onDoneEdit(); onSent(m); },
    onError: (e) => toast.error(apiError(e)),
  });
  const suggest = useMutation({
    mutationFn: () => adminSupportApi.suggest(conversationId),
    onSuccess: (r) => setDrafts(r.drafts),
    onError: (e) => toast.error(apiError(e)),
  });

  function typing(on: boolean) {
    if (mode === 'note') return;
    const now = Date.now();
    if (on && now - typingAt.current < 2500) return;
    typingAt.current = on ? now : 0;
    supportSocket()?.emit(SUPPORT_EVENTS.typing, { conversationId, typing: on });
  }

  async function upload(list: File[] | Blob[], extra?: { durationSec?: number; waveform?: number[]; name?: string }) {
    for (const f of list) {
      if (f.size > SUPPORT_LIMITS.maxFileBytes) { toast.error('Files can be up to 15 MB.'); continue; }
      setUploading((n) => n + 1);
      try {
        const a = await adminSupportApi.upload(f, extra);
        setFiles((x) => [...x, a].slice(0, SUPPORT_LIMITS.maxAttachments));
      } catch (e) {
        toast.error(apiError(e));
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  const submit = () => {
    if (editing) { if (text.trim()) edit.mutate(); return; }
    if ((!text.trim() && !files.length) || send.isPending || uploading) return;
    send.mutate();
  };

  const pickCanned = (i: number) => {
    const c = cannedMatches[i];
    if (!c) return;
    setText(c.text);
    setCannedIndex(0);
    area.current?.focus();
  };

  if (!canReply) {
    return <p className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-center text-[0.8125rem] text-slate-500">Your role can read support chats but not reply.</p>;
  }

  return (
    <div
      className={cn('border-t border-slate-200 p-2 sm:p-3', mode === 'note' ? 'bg-amber-50' : 'bg-white')}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); void upload(Array.from(e.dataTransfer.files)); }}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Segmented value={mode} onChange={setMode} label="Message type" items={[
          { value: 'reply', label: <span className="inline-flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> Reply</span> },
          { value: 'note', label: <span className="inline-flex items-center gap-1"><Lock className="h-3.5 w-3.5" /> Internal note</span> },
        ]} />
        <button type="button" onClick={() => suggest.mutate()} disabled={suggest.isPending} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[0.8125rem] font-medium text-violet-700 hover:bg-violet-50 disabled:opacity-60">
          <Sparkles className="h-4 w-4" /> {suggest.isPending ? 'Writing drafts…' : 'AI drafts'}
        </button>
        <span className="ms-auto hidden text-[0.75rem] text-slate-400 sm:inline">Type / for saved replies</span>
      </div>

      {drafts.length > 0 && (
        <div className="mb-2 flex flex-col gap-1.5">
          {drafts.map((d, i) => (
            <button key={i} type="button" onClick={() => { setText(d); setDrafts([]); area.current?.focus(); }} className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-start text-[0.8125rem] text-violet-950 hover:bg-violet-100">
              {d}
            </button>
          ))}
        </div>
      )}

      {(replyTo || editing) && (
        <div className="mb-2 flex items-start gap-2 rounded-lg border-s-4 border-brand-500 bg-slate-50 px-3 py-1.5 text-[0.8125rem]">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-700">{editing ? 'Editing message' : `Replying to ${replyTo!.sender === 'MERCHANT' ? 'the shop' : replyTo!.sender === 'BOT' ? 'Nafaa AI' : 'the team'}`}</p>
            <p className="truncate text-slate-500">{(editing ?? replyTo)!.text ?? 'Attachment'}</p>
          </div>
          <button type="button" onClick={() => { if (editing) { onDoneEdit(); setText(''); } else onClearReply(); }} aria-label="Cancel"><X className="h-4 w-4 text-slate-500" /></button>
        </div>
      )}

      {(files.length > 0 || uploading > 0) && (
        <div className="mb-2 flex flex-wrap gap-2">
          {files.map((f, i) => (
            <span key={i} className="inline-flex max-w-[14rem] items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-1 text-[0.75rem]">
              {f.mime.startsWith('image/') ? <img src={f.url} alt="" className="h-6 w-6 rounded object-cover" /> : f.mime.startsWith('audio/') || f.mime === 'video/webm' ? <Mic className="h-3.5 w-3.5" /> : <Paperclip className="h-3.5 w-3.5" />}
              <span className="truncate">{f.name}</span>
              <button type="button" onClick={() => setFiles((x) => x.filter((_, j) => j !== i))} aria-label="Remove"><X className="h-3.5 w-3.5" /></button>
            </span>
          ))}
          {uploading > 0 && <span className="rounded-lg bg-slate-100 px-2 py-1 text-[0.75rem] text-slate-500">Uploading…</span>}
        </div>
      )}

      <div className="relative flex items-end gap-1.5">
        {cannedMatches.length > 0 && (
          <div className="absolute bottom-full start-0 z-10 mb-2 w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg" role="listbox">
            {cannedMatches.map((c, i) => (
              <button key={c.id} type="button" role="option" aria-selected={i === cannedIndex} onMouseDown={(e) => { e.preventDefault(); pickCanned(i); }}
                className={cn('block w-full px-3 py-2 text-start text-[0.8125rem]', i === cannedIndex ? 'bg-brand-50' : 'hover:bg-slate-50')}>
                <span className="font-semibold text-slate-800">{c.title}</span>
                <span className="block truncate text-slate-500">{c.text}</span>
              </button>
            ))}
          </div>
        )}
        <button ref={emojiRef} type="button" onClick={() => setEmojiOpen(true)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Emoji"><Smile className="h-5 w-5" /></button>
        <Menu open={emojiOpen} onClose={() => setEmojiOpen(false)} anchorRef={emojiRef} width="w-56" preferUp>
          <div className="grid grid-cols-8 gap-1 p-1">
            {EMOJI.map((e) => <button key={e} type="button" className="rounded p-1 text-lg hover:bg-slate-100" onClick={() => { setText((t) => t + e); setEmojiOpen(false); area.current?.focus(); }}>{e}</button>)}
          </div>
        </Menu>
        <button type="button" onClick={() => fileInput.current?.click()} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Attach a file"><Paperclip className="h-5 w-5" /></button>
        <input ref={fileInput} type="file" accept={ACCEPT} multiple hidden onChange={(e) => { void upload(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
        <textarea
          ref={area}
          value={text}
          rows={1}
          onChange={(e) => { setText(e.target.value); setCannedIndex(0); if (e.target.value) typing(true); }}
          onBlur={() => typing(false)}
          onPaste={(e) => {
            const imgs = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith('image/'));
            if (imgs.length) { e.preventDefault(); void upload(imgs); }
          }}
          onKeyDown={(e) => {
            if (cannedMatches.length) {
              if (e.key === 'ArrowDown') { e.preventDefault(); setCannedIndex((i) => (i + 1) % cannedMatches.length); return; }
              if (e.key === 'ArrowUp') { e.preventDefault(); setCannedIndex((i) => (i - 1 + cannedMatches.length) % cannedMatches.length); return; }
              if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pickCanned(cannedIndex); return; }
            }
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
          }}
          placeholder={mode === 'note' ? 'Internal note — the shop will not see this' : 'Write a reply…'}
          className="max-h-40 min-h-[2.5rem] flex-1 resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          style={{ height: Math.min(160, 40 + (text.split('\n').length - 1) * 20) }}
          aria-label="Message"
        />
        {!text.trim() && !files.length && !editing ? (
          <VoiceButton onDone={(blob, durationSec, waveform) => upload([blob], { durationSec, waveform, name: `voice-${Date.now()}.webm` })} />
        ) : (
          <button type="button" onClick={submit} disabled={send.isPending || edit.isPending || uploading > 0} className="rounded-xl bg-brand-600 p-2.5 text-brand-fg hover:bg-brand-700 disabled:opacity-60" aria-label="Send">
            <Send className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}

/** Hold-free voice recorder: click to start, click to stop. Stops by itself at 2 minutes. */
function VoiceButton({ onDone }: { onDone: (blob: Blob, durationSec: number, waveform: number[]) => void }) {
  const [rec, setRec] = useState<{ started: number } | null>(null);
  const [now, setNow] = useState(Date.now());
  const ref = useRef<{ mr: MediaRecorder; stream: MediaStream; levels: number[]; timer: number; ac: AudioContext } | null>(null);

  const stop = () => {
    const r = ref.current;
    if (!r) return;
    window.clearInterval(r.timer);
    if (r.mr.state !== 'inactive') r.mr.stop();
  };

  const start = async () => {
    if (typeof MediaRecorder === 'undefined') { toast.error('This browser cannot record voice notes.'); return; }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.error('Allow the microphone to record a voice note.');
      return;
    }
    const type = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((t) => MediaRecorder.isTypeSupported(t));
    const mr = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    const chunks: Blob[] = [];
    const ac = new AudioContext();
    const an = ac.createAnalyser();
    an.fftSize = 256;
    ac.createMediaStreamSource(stream).connect(an);
    const buf = new Uint8Array(an.frequencyBinCount);
    const levels: number[] = [];
    const started = Date.now();
    const timer = window.setInterval(() => {
      an.getByteFrequencyData(buf);
      levels.push(buf.reduce((s, v) => s + v, 0) / buf.length / 255);
      setNow(Date.now());
      if (Date.now() - started >= SUPPORT_LIMITS.maxVoiceSec * 1000) stop();
    }, 200);
    mr.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    mr.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      void ac.close();
      const dur = Math.round((Date.now() - started) / 1000);
      setRec(null);
      ref.current = null;
      if (dur < 1) return;
      const step = Math.max(1, Math.floor(levels.length / 48));
      const wave = levels.filter((_, i) => i % step === 0).slice(0, 48);
      const max = Math.max(0.01, ...wave);
      onDone(new Blob(chunks, { type: mr.mimeType || 'audio/webm' }), dur, wave.map((v) => Math.round((v / max) * 100) / 100));
    };
    mr.start(250);
    ref.current = { mr, stream, levels, timer, ac };
    setRec({ started });
  };

  useEffect(() => () => stop(), []);

  if (rec) {
    const s = Math.floor((now - rec.started) / 1000);
    return (
      <button type="button" onClick={stop} className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2.5 text-sm font-semibold text-white" aria-label="Stop and attach voice note">
        <Square className="h-4 w-4" /> {Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}
      </button>
    );
  }
  return (
    <button type="button" onClick={() => void start()} className="rounded-xl bg-slate-100 p-2.5 text-slate-700 hover:bg-slate-200" aria-label="Record a voice note">
      <Mic className="h-5 w-5" />
    </button>
  );
}
