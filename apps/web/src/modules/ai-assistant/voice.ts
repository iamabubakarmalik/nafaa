/**
 * Voice for Nafaa AI.
 *
 *   useSpeechInput   speech-to-text with the browser's SpeechRecognition
 *                    (Chrome, Edge). Interim words stream out as they are
 *                    heard; it stops by itself after a short silence.
 *   speak / stopSpeaking / useSpeaking
 *                    reads an answer aloud with speechSynthesis, one answer
 *                    at a time, preferring an Urdu (ur-PK) voice.
 *
 * The spoken language (اردو or English) is remembered on the device.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { create } from 'zustand';

export type VoiceLang = 'ur-PK' | 'en-PK';

const LANG_KEY = 'nafaa-ai-voice-lang';
const readLang = (): VoiceLang => {
  try { return localStorage.getItem(LANG_KEY) === 'en-PK' ? 'en-PK' : 'ur-PK'; } catch { return 'ur-PK'; }
};

interface VoiceState {
  lang: VoiceLang;
  setLang: (lang: VoiceLang) => void;
  /** Id of the answer being read aloud, if any. */
  speakingId: string | null;
}

export const useVoiceStore = create<VoiceState>((set) => ({
  lang: readLang(),
  setLang: (lang) => {
    try { localStorage.setItem(LANG_KEY, lang); } catch { /* storage unavailable */ }
    set({ lang });
  },
  speakingId: null,
}));

/* ─── Speech to text ─── */

interface RecognitionResultLike { isFinal: boolean; 0: { transcript: string } }
interface RecognitionEventLike { resultIndex: number; results: ArrayLike<RecognitionResultLike> }
interface RecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: RecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}
type RecognitionCtor = new () => RecognitionLike;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const speechInputSupported = () => !!recognitionCtor();

/** Silence after the last heard words before listening stops. */
const SILENCE_MS = 2500;
/** Wait for the first words a little longer. */
const FIRST_WORDS_MS = 6000;

export function useSpeechInput({ lang, onInterim, onFinal, onError }: {
  lang: VoiceLang;
  /** Everything heard so far (final + interim). */
  onInterim: (text: string) => void;
  /** The whole utterance once listening ends; empty when nothing was heard. */
  onFinal: (text: string) => void;
  onError?: (message: string) => void;
}) {
  const [listening, setListening] = useState(false);
  const rec = useRef<RecognitionLike | null>(null);
  const timer = useRef<number | null>(null);
  const heard = useRef('');
  const cb = useRef({ onInterim, onFinal, onError });
  cb.current = { onInterim, onFinal, onError };
  const supported = speechInputSupported();

  const clearTimer = () => { if (timer.current) { window.clearTimeout(timer.current); timer.current = null; } };
  const armTimer = (ms: number) => { clearTimer(); timer.current = window.setTimeout(() => rec.current?.stop(), ms); };

  const stop = useCallback(() => { clearTimer(); rec.current?.stop(); }, []);

  const start = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor || rec.current) return;
    const r = new Ctor();
    r.lang = lang;
    r.interimResults = true;
    r.continuous = true;
    r.maxAlternatives = 1;
    heard.current = '';
    r.onresult = (e) => {
      let text = '';
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      heard.current = text.replace(/\s+/g, ' ').trim();
      cb.current.onInterim(heard.current);
      armTimer(SILENCE_MS);
    };
    r.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      cb.current.onError?.(e.error === 'not-allowed' || e.error === 'service-not-allowed'
        ? 'Mic ki ijazat nahi — browser me mic allow karein'
        : 'Awaaz samajh nahi aayi — dobara koshish karein');
    };
    r.onend = () => {
      clearTimer();
      rec.current = null;
      setListening(false);
      cb.current.onFinal(heard.current);
    };
    rec.current = r;
    try {
      r.start();
      setListening(true);
      armTimer(FIRST_WORDS_MS);
    } catch {
      rec.current = null;
      cb.current.onError?.('Mic shuru nahi ho saka');
    }
  }, [lang]);

  const toggle = useCallback(() => { if (rec.current) stop(); else start(); }, [start, stop]);

  useEffect(() => () => { clearTimer(); rec.current?.abort(); rec.current = null; }, []);

  return { supported, listening, start, stop, toggle };
}

/* ─── Text to speech ─── */

export const speechOutputSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

/** Answer text as it should be read: no Markdown marks, tables or links. */
export function speakableText(markdown: string): string {
  return markdown
    .split('\n')
    .filter((l) => !/^\s*\|/.test(l) && !/^\s*[-=]{3,}\s*$/.test(l))
    .join('\n')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, '$1$2')
    .replace(/(^|[^\w])[*_]([^*_\n]+)[*_](?=[^\w]|$)/g, '$1$2')
    .replace(/^\s*#{1,4}\s+/gm, '')
    .replace(/^\s*(?:[-*•]|\d+[.)])\s+/gm, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const by = (re: RegExp) => voices.find((v) => re.test(v.lang));
  return by(/^ur(-|_)?PK/i) ?? by(/^ur/i) ?? by(/^en(-|_)?(PK|IN)/i) ?? by(/^en/i) ?? null;
}

export function stopSpeaking() {
  if (speechOutputSupported()) window.speechSynthesis.cancel();
  useVoiceStore.setState({ speakingId: null });
}

/** Reads `text` aloud; a second call with the same id stops it. Only one answer speaks at a time. */
export function speak(id: string, text: string) {
  if (!speechOutputSupported()) return;
  const synth = window.speechSynthesis;
  const current = useVoiceStore.getState().speakingId;
  synth.cancel();
  if (current === id) { useVoiceStore.setState({ speakingId: null }); return; }
  const clean = speakableText(text);
  if (!clean) return;
  const voice = pickVoice();
  // Short pieces: some browsers cut off long utterances.
  const parts = clean.match(/[^.!?۔\n]+[.!?۔]?/g)?.map((p) => p.trim()).filter(Boolean) ?? [clean];
  useVoiceStore.setState({ speakingId: id });
  parts.forEach((part, i) => {
    const u = new SpeechSynthesisUtterance(part);
    if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = 'ur-PK';
    u.rate = 1;
    if (i === parts.length - 1) {
      u.onend = () => { if (useVoiceStore.getState().speakingId === id) useVoiceStore.setState({ speakingId: null }); };
    }
    u.onerror = () => { if (useVoiceStore.getState().speakingId === id) useVoiceStore.setState({ speakingId: null }); };
    synth.speak(u);
  });
}

/** Loads voices early (Chrome fills the list asynchronously). */
export function useWarmVoices() {
  useEffect(() => {
    if (!speechOutputSupported()) return;
    const synth = window.speechSynthesis;
    synth.getVoices();
    const on = () => synth.getVoices();
    synth.addEventListener?.('voiceschanged', on);
    return () => synth.removeEventListener?.('voiceschanged', on);
  }, []);
}
