'use client';

/**
 * Animated chat for the AI assistant section (decorative, aria-hidden; the
 * section's heading and list carry the real content).
 *
 * Each scene types a question into the box, sends it, shows the assistant
 * thinking, then answers with a short line and a mini chart. Scenes switch
 * between Roman Urdu and English. The server renders the first scene fully
 * answered, which is also what reduced-motion and no-JS visitors keep. The
 * loop runs only while the chat is on screen and the tab is visible.
 *
 * Icons arrive as server-rendered nodes (`icons`), so this island does not
 * ship the icon map to the browser.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cx } from '@/components/ui/cx';
import s from './aichat.module.css';

type Answer =
  | { kind: 'bars'; text: string; rows: { name: string; w: number }[] }
  | { kind: 'line'; text: string; points: number[]; labels: string[] }
  | { kind: 'stock'; text: string; rows: { name: string; w: number }[]; action: string };

interface Scene {
  q: string;
  urdu: boolean;
  answer: Answer;
}

const FIXED: Scene[] = [
  {
    q: 'How did sales go this week?',
    urdu: false,
    answer: { kind: 'line', text: 'Sales are up on last week. Saturday was the busiest day.', points: [38, 46, 41, 55, 52, 74, 63], labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'] },
  },
  {
    q: 'Kaun si cheezein khatam hone wali hain?',
    urdu: true,
    answer: {
      kind: 'stock',
      text: 'Yeh cheezein is hafte khatam ho sakti hain:',
      rows: [
        { name: 'Chakki Atta 10kg', w: 18 },
        { name: 'Cooking Oil 5L', w: 12 },
        { name: 'Butter 200g', w: 8 },
      ],
      action: 'Reorder list banayein',
    },
  },
];

type Phase = 'typing' | 'sent' | 'thinking' | 'answer';

export interface AiChatIcons {
  alert: ReactNode;
  list: ReactNode;
  sparkles: ReactNode;
  sparklesSmall: ReactNode;
  chart: ReactNode;
  send: ReactNode;
}

const TYPE_MS = 38;
const HOLD_MS = 5200;

function AnswerView({ a, icons }: { a: Answer; icons: AiChatIcons }) {
  if (a.kind === 'line') {
    const max = Math.max(...a.points);
    const w = 260;
    const h = 70;
    const step = w / (a.points.length - 1);
    const pts = a.points.map((p, i) => [i * step, h - (p / max) * (h - 8)] as const);
    const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');
    const area = `${d}L${w} ${h}L0 ${h}Z`;
    const [bx, by] = pts[5] ?? [0, 0];
    return (
      <div className="mt-3">
        <svg viewBox={`0 0 ${w} ${h + 16}`} className="h-auto w-full overflow-visible">
          <defs>
            <linearGradient id="aichat-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(16 185 129)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="rgb(16 185 129)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#aichat-area)" className={s.areaIn} />
          <path d={d} pathLength={1} className={s.line} />
          <circle cx={bx} cy={by} r="4.5" className={s.peak} />
          {a.labels.map((l, i) => (
            <text key={i} x={i * step} y={h + 14} textAnchor="middle" className={s.axis}>
              {l}
            </text>
          ))}
        </svg>
      </div>
    );
  }
  const stock = a.kind === 'stock';
  return (
    <>
      <ul className="mt-3 space-y-2.5">
        {a.rows.map((row, i) => (
          <li key={row.name} className={s.row} style={{ '--i': i }}>
            <span className={cx(s.rank, stock && s.rankWarn)}>{stock ? icons.alert : i + 1}</span>
            <span className="w-[7.5rem] shrink-0 truncate text-xs font-medium text-fg">{row.name}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-fg/[0.07]">
              <span className={cx(s.bar, stock ? s.barWarn : i === 0 ? s.barTop : s.barRest)} style={{ '--w': `${row.w}%`, '--i': i }} />
            </span>
          </li>
        ))}
      </ul>
      {stock ? (
        <span className={s.action}>
          {icons.list}
          {a.action}
        </span>
      ) : null}
    </>
  );
}

export function AiChat({ question, answerText, rows, icons }: { question: string; answerText: string; rows: { name: string; w: number }[]; icons: AiChatIcons }) {
  const scenes: Scene[] = [{ q: question, urdu: true, answer: { kind: 'bars', text: answerText, rows } }, ...FIXED];
  const [scene, setScene] = useState(0);
  const [phase, setPhase] = useState<Phase>('answer');
  const [typed, setTyped] = useState(question.length);
  const [running, setRunning] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  // Run only on screen, with motion allowed and the tab visible.
  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let onScreen = false;
    const update = () => setRunning(onScreen && !document.hidden);
    const io = new IntersectionObserver(([entry]) => {
      onScreen = Boolean(entry?.isIntersecting);
      update();
    }, { threshold: 0.3 });
    io.observe(el);
    document.addEventListener('visibilitychange', update);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  // The first time it runs, start the current scene from an empty box.
  const started = useRef(false);
  useEffect(() => {
    if (running && !started.current) {
      started.current = true;
      setPhase('typing');
      setTyped(0);
    }
  }, [running]);

  const current = scenes[scene] ?? scenes[0]!;
  useEffect(() => {
    if (!running) return;
    let t: number;
    if (phase === 'typing') {
      if (typed < current.q.length) t = window.setTimeout(() => setTyped((n) => n + 1), TYPE_MS);
      else t = window.setTimeout(() => setPhase('sent'), 380);
    } else if (phase === 'sent') {
      t = window.setTimeout(() => setPhase('thinking'), 450);
    } else if (phase === 'thinking') {
      t = window.setTimeout(() => setPhase('answer'), 1100);
    } else {
      t = window.setTimeout(() => {
        setScene((i) => (i + 1) % scenes.length);
        setTyped(0);
        setPhase('typing');
      }, HOLD_MS);
    }
    return () => window.clearTimeout(t);
  }, [running, phase, typed, current.q.length, scenes.length]);

  const asked = phase !== 'typing';
  const inBox = phase === 'typing' ? current.q.slice(0, typed) : '';

  return (
    <div ref={root} dir="ltr" aria-hidden className={s.chat}>
      <span className={s.glow} />
      <div className="flex items-center gap-3 border-b border-line pb-4">
        <span className={s.avatar}>
          {icons.sparkles}
        </span>
        <span className="flex-1">
          <span className="block text-small font-semibold text-fg-strong">Nafaa AI</span>
          <span className="flex items-center gap-1.5 text-xs text-fg-subtle">
            <span className={s.online} />
            Reads your own business data
          </span>
        </span>
        <span className={s.newTag}>New</span>
      </div>

      <div className={s.thread}>
        {asked ? (
          <p key={`q${scene}`} lang={current.urdu ? 'ur-Latn' : 'en'} className={cx(s.msg, s.user)}>
            {current.q}
          </p>
        ) : null}
        {phase === 'thinking' ? (
          <span className={cx(s.msg, s.thinking)}>
            <span />
            <span />
            <span />
          </span>
        ) : null}
        {phase === 'answer' ? (
          <div key={`a${scene}`} className={cx(s.msg, s.bot)}>
            <p lang={current.urdu ? 'ur-Latn' : 'en'} className="flex items-start gap-2 text-small font-medium text-fg-strong">
              <span className="mt-0.5 shrink-0 text-brand-600 ink:text-brand-300">{icons.sparklesSmall}</span>
              {current.answer.text}
            </p>
            <AnswerView a={current.answer} icons={icons} />
            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-fg-subtle">
              {icons.chart}
              From your sales, stock and purchase records
            </p>
          </div>
        ) : null}
      </div>

      <div className={cx(s.box, phase === 'typing' && s.boxActive)}>
        <span className={cx('flex-1 truncate text-small', inBox ? 'text-fg-strong' : 'text-fg-subtle')}>
          {inBox || 'Apne karobar ke baare me poochhein…'}
          {phase === 'typing' ? <span className={s.caret} /> : null}
        </span>
        <span className={cx(s.send, phase === 'sent' && s.sendPressed)}>
          {icons.send}
        </span>
      </div>
    </div>
  );
}
