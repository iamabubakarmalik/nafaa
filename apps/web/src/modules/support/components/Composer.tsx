/**
 * Message box: text (Enter sends, Shift+Enter new line), emoji, attach a
 * picture or PDF (also by pasting a screenshot or dropping files on the
 * chat), and voice notes (tap the mic, speak, stop, listen, send).
 * Shows the message being replied to or edited above the box.
 */

import { useEffect, useRef, useState } from 'react';
import { FileText, Mic, Paperclip, Pencil, Reply, SendHorizontal, Smile, Square, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { SUPPORT_LIMITS } from '../api/support.types';
import { MAX_VOICE_SECONDS, canRecordVoice, clock, startVoiceRecording, type RecorderHandle, type VoiceRecording } from '../lib/recorder';
import { sizeText } from '../lib/format';
import { unlockAudio } from '../lib/sounds';
import { askNotificationPermission } from '../lib/notify';
import { previewText, useSupportStore } from '../store';
import { senderLabel } from './MessageBubble';
import { VoicePlayer } from './VoicePlayer';

const EMOJIS = ['😀', '😂', '😊', '😍', '🙏', '👍', '👎', '👌', '🙌', '👏', '💪', '🤝', '😅', '😢', '😡', '😮', '🤔', '😴', '❤️', '🔥', '✅', '❌', '⚠️', '❓', '🎉', '💯', '📦', '🧾', '💵', '📱', '🖨️', '⏰'];

export interface StagedFile { id: string; file: File; url: string }

export function stageFiles(files: File[]): StagedFile[] {
  return files.map((file) => ({ id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`, file, url: URL.createObjectURL(file) }));
}

/** Files from a paste or drop event (screenshots come as image files). */
export function filesFrom(list: DataTransferItemList | FileList | null | undefined): File[] {
  if (!list) return [];
  const out: File[] = [];
  for (const item of Array.from(list as ArrayLike<DataTransferItem | File>)) {
    const f = item instanceof File ? item : item.kind === 'file' ? item.getAsFile() : null;
    if (f) out.push(f.name ? f : new File([f], `screenshot-${Date.now()}.png`, { type: f.type || 'image/png' }));
  }
  return out;
}

type VoiceMode = { state: 'idle' } | { state: 'recording'; seconds: number; levels: number[] } | { state: 'preview'; rec: VoiceRecording; url: string };

export function Composer({ staged, setStaged, autoFocus, disabled }: {
  staged: StagedFile[];
  setStaged: (fn: (prev: StagedFile[]) => StagedFile[]) => void;
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  const [text, setText] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [voice, setVoice] = useState<VoiceMode>({ state: 'idle' });
  const box = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const recorder = useRef<RecorderHandle | null>(null);
  const replyTo = useSupportStore((s) => s.replyTo);
  const editing = useSupportStore((s) => s.editing);
  const setReplyTo = useSupportStore((s) => s.setReplyTo);
  const setEditing = useSupportStore((s) => s.setEditing);
  const sendText = useSupportStore((s) => s.sendText);
  const sendFiles = useSupportStore((s) => s.sendFiles);
  const sendVoice = useSupportStore((s) => s.sendVoice);
  const editMessage = useSupportStore((s) => s.editMessage);
  const setTyping = useSupportStore((s) => s.setTyping);

  // Grow with the text, up to about six lines.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
  }, [text]);

  useEffect(() => { if (autoFocus) box.current?.focus({ preventScroll: true }); }, [autoFocus]);

  // Editing fills the box with the old text; replying focuses it.
  useEffect(() => {
    if (editing) { setText(editing.text ?? ''); box.current?.focus(); }
  }, [editing]);
  useEffect(() => { if (replyTo) box.current?.focus(); }, [replyTo]);

  // Stop a recording if the chat closes.
  useEffect(() => () => { recorder.current?.cancel(); }, []);

  const firstUse = () => { unlockAudio(); askNotificationPermission(); };

  const submit = async () => {
    if (disabled) return;
    firstUse();
    if (editing) {
      await editMessage(editing.id, text);
      setText('');
      return;
    }
    if (staged.length) {
      const files = staged.map((s) => s.file);
      setStaged(() => []);
      const caption = text;
      setText('');
      await sendFiles(files, caption);
      return;
    }
    if (!text.trim()) return;
    const value = text;
    setText('');
    await sendText(value);
  };

  const addFiles = (files: File[]) => {
    if (!files.length) return;
    setStaged((prev) => {
      const room = SUPPORT_LIMITS.maxAttachments * 2 - prev.length;
      if (files.length > room) toast.error(t('Ek waqt mein zyada se zyada {{count}} files', { count: SUPPORT_LIMITS.maxAttachments * 2 }));
      return [...prev, ...stageFiles(files.slice(0, Math.max(0, room)))];
    });
  };

  const startRecording = async () => {
    firstUse();
    if (!canRecordVoice()) { toast.error(t('Is browser mein voice note record nahi hota')); return; }
    try {
      setVoice({ state: 'recording', seconds: 0, levels: [] });
      recorder.current = await startVoiceRecording(
        (level, seconds) => setVoice((v) => (v.state === 'recording' ? { state: 'recording', seconds, levels: [...v.levels.slice(-59), level] } : v)),
        () => { void stopRecording(); },
      );
    } catch {
      setVoice({ state: 'idle' });
      toast.error(t('Mic ki permission nahi mili. Browser settings mein mic allow karein.'));
    }
  };

  const stopRecording = async () => {
    const handle = recorder.current;
    recorder.current = null;
    const rec = handle ? await handle.stop() : null;
    if (!rec) { setVoice({ state: 'idle' }); return; }
    setVoice({ state: 'preview', rec, url: URL.createObjectURL(rec.blob) });
  };

  const cancelRecording = () => {
    recorder.current?.cancel();
    recorder.current = null;
    setVoice({ state: 'idle' });
  };

  const hasContent = !!text.trim() || staged.length > 0;
  const quoted = editing ?? replyTo;

  return (
    <div className="border-t border-slate-200 bg-white px-2.5 pb-2.5 pt-2 sm:px-3">
      {quoted && (
        <div className="mb-2 flex items-start gap-2 rounded-xl border-s-4 border-brand-500 bg-slate-50 px-2.5 py-1.5 text-[0.75rem]">
          {editing ? <Pencil className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" /> : <Reply className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600 rtl-flip" />}
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-brand-700">{editing ? t('Message edit karein') : senderLabel(quoted)}</div>
            <div className="truncate text-slate-600">{previewText(quoted)}</div>
          </div>
          <button type="button" aria-label={t('Cancel')} onClick={() => { if (editing) { setEditing(null); setText(''); } else setReplyTo(null); }}
            className="rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {staged.length > 0 && (
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
          {staged.map((s) => (
            <div key={s.id} className="relative shrink-0">
              {s.file.type.startsWith('image/')
                ? <img src={s.url} alt={s.file.name} className="h-16 w-16 rounded-lg object-cover ring-1 ring-slate-200" />
                : (
                  <div className="flex h-16 w-28 flex-col justify-center rounded-lg bg-slate-50 px-2 ring-1 ring-slate-200">
                    <FileText className="h-4 w-4 text-rose-500" />
                    <span className="truncate text-[0.6875rem] font-medium text-slate-700">{s.file.name}</span>
                    <span className="text-[0.625rem] text-slate-500">{sizeText(s.file.size)}</span>
                  </div>
                )}
              <button type="button" aria-label={t('Hatayein')} onClick={() => setStaged((prev) => prev.filter((x) => x.id !== s.id))}
                className="absolute -end-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-white shadow">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {voice.state === 'recording' ? (
        <div className="flex items-center gap-2">
          <button type="button" onClick={cancelRecording} aria-label={t('Voice note cancel karein')} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-rose-50 hover:text-rose-600">
            <Trash2 className="h-[1.125rem] w-[1.125rem]" />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-rose-50 px-3 py-2" dir="ltr">
            <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-rose-500" />
            <span className="w-10 shrink-0 text-[0.8125rem] font-semibold tabular-nums text-rose-700">{clock(voice.seconds)}</span>
            <div className="flex h-6 min-w-0 flex-1 items-center justify-end gap-[2px] overflow-hidden">
              {voice.levels.map((v, i) => <span key={i} className="w-[3px] shrink-0 rounded-full bg-rose-400" style={{ height: `${Math.max(12, v * 100)}%` }} />)}
            </div>
            <span className="hidden shrink-0 text-[0.6875rem] text-rose-500 sm:inline">{t('{{max}} tak', { max: clock(MAX_VOICE_SECONDS) })}</span>
          </div>
          <button type="button" onClick={() => void stopRecording()} aria-label={t('Recording rokein')} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white shadow hover:bg-rose-700">
            <Square className="h-4 w-4" fill="currentColor" />
          </button>
        </div>
      ) : voice.state === 'preview' ? (
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setVoice({ state: 'idle' })} aria-label={t('Voice note delete karein')} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-rose-50 hover:text-rose-600">
            <Trash2 className="h-[1.125rem] w-[1.125rem]" />
          </button>
          <div className="min-w-0 flex-1 rounded-2xl bg-slate-50 px-3 py-1 ring-1 ring-slate-200">
            <VoicePlayer url={voice.url} durationSec={voice.rec.durationSec} waveform={voice.rec.waveform} mine />
          </div>
          <button type="button" onClick={() => { const rec = voice.rec; setVoice({ state: 'idle' }); void sendVoice(rec); }} aria-label={t('Voice note bhejein')}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-brand-fg shadow hover:bg-brand-700">
            <SendHorizontal className="h-[1.125rem] w-[1.125rem] rtl-flip" />
          </button>
        </div>
      ) : (
        <div className="relative flex items-end gap-1">
          <div className="relative">
            <button type="button" onClick={() => setEmojiOpen((o) => !o)} aria-label={t('Emoji')} aria-expanded={emojiOpen}
              className="flex h-10 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800">
              <Smile className="h-5 w-5" />
            </button>
            {emojiOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setEmojiOpen(false)} aria-hidden />
                <div className="absolute bottom-12 start-0 z-20 grid w-[17rem] grid-cols-8 gap-0.5 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-slate-200">
                  {EMOJIS.map((e) => (
                    <button key={e} type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-[1.125rem] hover:bg-slate-100"
                      onClick={() => {
                        const el = box.current;
                        const at = el?.selectionStart ?? text.length;
                        setText((v) => v.slice(0, at) + e + v.slice(el?.selectionEnd ?? at));
                        setEmojiOpen(false);
                        requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(at + e.length, at + e.length); });
                      }}>
                      {e}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          {!editing && (
            <button type="button" onClick={() => fileInput.current?.click()} aria-label={t('Screenshot ya file bhejein')} title={t('Screenshot ya file bhejein')}
              className="flex h-10 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800">
              <Paperclip className="h-5 w-5" />
            </button>
          )}
          <input ref={fileInput} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" className="hidden"
            onChange={(e) => { addFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
          <textarea
            ref={box}
            rows={1}
            value={text}
            disabled={disabled}
            maxLength={SUPPORT_LIMITS.maxTextChars}
            placeholder={staged.length ? t('Kuch likhna ho to likhein…') : t('Apna message likhein…')}
            onChange={(e) => { setText(e.target.value); if (e.target.value) setTyping(true); }}
            onBlur={() => setTyping(false)}
            onPaste={(e) => {
              const files = filesFrom(e.clipboardData?.items);
              if (files.length && !editing) { e.preventDefault(); addFiles(files); }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void submit(); }
              if (e.key === 'Escape') {
                if (editing) { setEditing(null); setText(''); e.stopPropagation(); }
                else if (replyTo) { setReplyTo(null); e.stopPropagation(); }
              }
            }}
            className="max-h-[150px] min-h-[2.5rem] flex-1 resize-none rounded-2xl border-0 bg-slate-100 px-3.5 py-2.5 text-[0.875rem] leading-5 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60"
          />
          {hasContent || editing ? (
            <button type="button" onClick={() => void submit()} disabled={disabled} aria-label={editing ? t('Save') : t('Bhejein')}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-brand-fg shadow transition hover:bg-brand-700 disabled:opacity-60">
              <SendHorizontal className="h-[1.125rem] w-[1.125rem] rtl-flip" />
            </button>
          ) : (
            <button type="button" onClick={() => void startRecording()} disabled={disabled} aria-label={t('Voice note record karein')} title={t('Voice note record karein')}
              className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-brand-fg shadow transition hover:bg-brand-700 disabled:opacity-60')}>
              <Mic className="h-[1.125rem] w-[1.125rem]" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
