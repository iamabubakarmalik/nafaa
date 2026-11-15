/**
 * Voice note player: play/pause, the waveform bars filling as it plays
 * (click a bar to jump there), the time, and a 1x / 1.5x / 2x speed switch.
 */

import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { WAVEFORM_BARS, clock } from '../lib/recorder';

const SPEEDS = [1, 1.5, 2] as const;

let current: HTMLAudioElement | null = null;

export function VoicePlayer({ url, durationSec, waveform, mine }: {
  url: string;
  durationSec?: number | null;
  waveform?: number[] | null;
  /** Merchant's own bubble (brand colors). */
  mine?: boolean;
}) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [at, setAt] = useState(0);
  const [length, setLength] = useState(durationSec ?? 0);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const bars = waveform?.length ? waveform : Array.from({ length: WAVEFORM_BARS }, (_, i) => 0.25 + 0.2 * Math.abs(Math.sin(i * 0.7)));

  useEffect(() => () => { audio.current?.pause(); }, []);

  const el = () => {
    if (!audio.current) {
      const a = new Audio(url);
      a.preload = 'metadata';
      a.onloadedmetadata = () => { if (Number.isFinite(a.duration) && a.duration > 0) setLength(a.duration); };
      a.ontimeupdate = () => setAt(a.currentTime);
      a.onended = () => { setPlaying(false); setAt(0); };
      a.onpause = () => setPlaying(false);
      a.onplay = () => setPlaying(true);
      audio.current = a;
    }
    return audio.current;
  };

  const toggle = () => {
    const a = el();
    if (playing) { a.pause(); return; }
    // One voice note at a time.
    if (current && current !== a) current.pause();
    current = a;
    a.playbackRate = speed;
    void a.play().catch(() => setPlaying(false));
  };

  const seek = (fraction: number) => {
    const a = el();
    const total = length || a.duration || 0;
    if (!total) return;
    a.currentTime = fraction * total;
    setAt(a.currentTime);
  };

  const nextSpeed = () => {
    const s = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setSpeed(s);
    if (audio.current) audio.current.playbackRate = s;
  };

  const progress = length ? Math.min(1, at / length) : 0;

  return (
    <div className="flex min-w-[13rem] max-w-full items-center gap-2.5 py-0.5" dir="ltr">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? t('Rokein') : t('Sunein')}
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
          mine ? 'bg-brand-600 text-brand-fg hover:bg-brand-700' : 'bg-slate-700 text-white hover:bg-slate-800',
        )}
      >
        {playing ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="ms-0.5 h-4 w-4" fill="currentColor" />}
      </button>
      <div className="min-w-0 flex-1">
        <div
          className="flex h-7 cursor-pointer items-center gap-[2px]"
          role="slider"
          aria-label={t('Voice note')}
          aria-valuemin={0}
          aria-valuemax={Math.round(length)}
          aria-valuenow={Math.round(at)}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') seek(Math.min(1, progress + 0.05));
            if (e.key === 'ArrowLeft') seek(Math.max(0, progress - 0.05));
          }}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            seek(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
          }}
        >
          {bars.map((v, i) => (
            <span
              key={i}
              className={cn(
                'w-[3px] shrink-0 rounded-full transition-colors',
                i / bars.length < progress
                  ? (mine ? 'bg-brand-700' : 'bg-slate-700')
                  : (mine ? 'bg-brand-300' : 'bg-slate-300'),
              )}
              style={{ height: `${Math.max(12, Math.min(100, v * 100))}%` }}
            />
          ))}
        </div>
        <div className="mt-0.5 flex items-center justify-between text-[0.6875rem] tabular-nums text-slate-500">
          <span>{clock(playing || at ? at : length)}</span>
          <button type="button" onClick={nextSpeed} className="rounded-full bg-slate-900/5 px-1.5 font-semibold text-slate-600 hover:bg-slate-900/10">
            {speed}x
          </button>
        </div>
      </div>
    </div>
  );
}
