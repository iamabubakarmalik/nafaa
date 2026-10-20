/**
 * SEO tab: SERP preview (desktop and mobile, truncated by pixel width), title
 * and description counters, the final title after the pattern, focus keyword
 * checks, score with issues, canonical and robots, OG image with a 1200×630
 * card preview, and the quality gate state.
 */
import { useMemo, useState } from 'react';
import { CircleAlert, CircleCheck, CircleX, Monitor, Smartphone, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  DEFAULT_QUALITY_GATES,
  DEFAULT_SEO_SETTINGS,
  ENTRY_TYPE_META,
  TEXT_LIMITS,
  patternIncludesBrand,
  titlePatternFor,
  titlePatternVariant,
  type AdminEntry,
  type Issue,
  type SeoReport,
} from '../../contract/cms-contract';
import { blockText, robotsReasonLabel, slugify } from '../lib';
import { MediaField, MediaThumb } from '../../fields/MediaField';
import { useEditor } from '../EditorContext';
import { Section, TextArea, TextField, Toggle } from '../../fields/ui';
import { ScoreRing } from '../../entries/StatusChip';
import type { DraftPatch } from '../useEntryDraft';

// Google result widths (approximate): desktop title 600px at 20px Arial,
// description 920px at 14px; mobile title two lines of ~340px at 18px.
const SERP = {
  desktop: { titlePx: 600, titleFont: '20px Arial', descPx: 920, descFont: '14px Arial' },
  mobile: { titlePx: 680, titleFont: '18px Arial', descPx: 760, descFont: '14px Arial' },
} as const;

let canvas: HTMLCanvasElement | null = null;
function textWidth(text: string, font: string): number {
  canvas ??= document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return text.length * 8;
  ctx.font = font;
  return ctx.measureText(text).width;
}
function truncateToPx(text: string, maxPx: number, font: string): { text: string; cut: boolean; px: number } {
  const px = textWidth(text, font);
  if (px <= maxPx) return { text, cut: false, px };
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (textWidth(`${text.slice(0, mid)} …`, font) <= maxPx) lo = mid;
    else hi = mid - 1;
  }
  return { text: `${text.slice(0, lo).trimEnd()} …`, cut: true, px };
}

/** Local stand-in for the API's final title until the first save returns one. */
function localFinalTitle(entry: AdminEntry): string {
  const pattern = entry.seoTitle?.trim() || titlePatternFor(DEFAULT_SEO_SETTINGS.titlePatterns, entry.type, titlePatternVariant(entry.type, entry.data));
  const data = (entry.data ?? {}) as Record<string, unknown>;
  const filled = pattern.replace(/\{([a-zA-Z]+(?:\.[a-zA-Z]+)?)\}/g, (_m, key: string) => {
    if (key === 'title') return entry.title;
    if (key === 'year') return String(new Date().getFullYear());
    if (key.startsWith('data.')) {
      const v = data[key.slice(5)];
      return typeof v === 'string' || typeof v === 'number' ? String(v) : '…';
    }
    return '…';
  });
  return patternIncludesBrand(filled) ? filled : DEFAULT_SEO_SETTINGS.titleTemplate.replace('%s', filled);
}

function hostFromSiteUrl(siteUrl: string | undefined): string {
  try {
    return new URL(siteUrl || 'https://nafaa.pk').host;
  } catch {
    return 'nafaa.pk';
  }
}

export function SeoPanel({ entry, seo, update, onSelectBlock }: { entry: AdminEntry; seo: SeoReport | null; update: (p: DraftPatch) => void; onSelectBlock: (id: string) => void }) {
  const { config } = useEditor();
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const host = hostFromSiteUrl(config?.siteUrl);

  const finalTitle = seo?.finalTitle || localFinalTitle(entry);
  const finalDescription = seo?.finalDescription || entry.seoDescription || entry.summary || '';
  const s = SERP[device];
  const t = truncateToPx(finalTitle, s.titlePx, s.titleFont);
  const d = truncateToPx(finalDescription, s.descPx, s.descFont);
  const crumbs = entry.path.split('/').filter(Boolean);

  // Focus keyword checks (ARCH 13: title, H1, first 100 words, description, slug).
  const checks = useMemo(() => {
    const kw = entry.focusKeyword?.trim().toLowerCase();
    if (!kw) return null;
    const blocks = (entry.blocks ?? []).filter((b) => !b.hidden);
    const hero = blocks.find((b) => b.type === 'hero') as { heading?: string } | undefined;
    const h1 = (hero?.heading || entry.title).toLowerCase();
    const first100 = blocks.map(blockText).join(' ').split(/\s+/).slice(0, 100).join(' ').toLowerCase();
    return [
      { label: 'Final title me', ok: finalTitle.toLowerCase().includes(kw) },
      { label: 'H1 me', ok: h1.includes(kw) },
      { label: 'Pehle 100 alfaaz me', ok: first100.includes(kw) },
      { label: 'Description me', ok: finalDescription.toLowerCase().includes(kw) },
      { label: 'Slug me', ok: entry.slug.includes(slugify(kw)) },
    ];
  }, [entry, finalTitle, finalDescription]);

  const issues = seo?.issues ?? [];
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const passes = issues.filter((i) => i.severity === 'pass');
  const score = seo?.score ?? entry.seoScore;
  const gate = seo?.gate ?? { words: entry.wordCount, required: DEFAULT_QUALITY_GATES[entry.type]?.minWords ?? null };
  const robots = seo?.robots;
  const ogMedia = entry.ogImageId ? entry.mediaRefs[entry.ogImageId] : undefined;

  return (
    <div className="space-y-7">
      {/* SERP preview */}
      <Section
        title="Google preview"
        actions={
          <div className="inline-flex rounded-lg bg-neutral-100 p-0.5">
            {(['desktop', 'mobile'] as const).map((k) => (
              <button key={k} type="button" onClick={() => setDevice(k)} className={cn('inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium', device === k ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500')}>
                {k === 'desktop' ? <Monitor className="h-3 w-3" /> : <Smartphone className="h-3 w-3" />}
                {k === 'desktop' ? 'Desktop' : 'Mobile'}
              </button>
            ))}
          </div>
        }
      >
        <div className={cn('rounded-xl border border-neutral-200 bg-white p-4 font-[Arial,sans-serif]', device === 'mobile' && 'max-w-[380px]')}>
          <div className="mb-1 flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-600 text-[11px] font-bold text-white">N</span>
            <div className="min-w-0 leading-tight">
              <p className="text-[13px] text-[#202124]">Nafaa</p>
              <p className="truncate text-[12px] text-[#4d5156]">
                {host}
                {crumbs.length > 0 && ` › ${crumbs.join(' › ')}`}
              </p>
            </div>
          </div>
          <p className={cn('text-[#1a0dab]', device === 'desktop' ? 'text-[20px] leading-[26px]' : 'text-[18px] leading-[24px]')}>{t.text}</p>
          <p className="mt-1 text-[14px] leading-[22px] text-[#4d5156]">{d.text || <span className="italic text-neutral-400">Description khali hai: summary ya SEO description likhein</span>}</p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-neutral-500">
          <span className={t.cut ? 'font-semibold text-amber-600' : ''}>
            Title {Math.round(t.px)}/{s.titlePx}px {t.cut && '— kat jayega'}
          </span>
          <span className={d.cut ? 'font-semibold text-amber-600' : ''}>
            Description {Math.round(d.px)}/{s.descPx}px {d.cut && '— kat jayegi'}
          </span>
          <span>Pixel naap andazan hai</span>
        </div>
      </Section>

      {/* Score and issues */}
      <Section title="SEO score" description={seo ? 'Pichli save ke waqt API ka hisaab' : 'Save hone par API score bhejegi'}>
        <div className="flex items-center gap-4 rounded-xl border border-neutral-200 p-3">
          <ScoreRing score={score} size={54} />
          <div className="grid flex-1 grid-cols-3 gap-2 text-center">
            <Tally icon={<CircleX className="h-3.5 w-3.5" />} n={errors.length} label="Errors" tone="rose" />
            <Tally icon={<TriangleAlert className="h-3.5 w-3.5" />} n={warnings.length} label="Warnings" tone="amber" />
            <Tally icon={<CircleCheck className="h-3.5 w-3.5" />} n={passes.length} label="Theek" tone="emerald" />
          </div>
        </div>
        {[...errors, ...warnings].length > 0 && (
          <ul className="space-y-1.5">
            {[...errors, ...warnings].map((i, n) => (
              <IssueRow key={n} issue={i} onSelectBlock={onSelectBlock} />
            ))}
          </ul>
        )}
        {passes.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer text-xs font-medium text-neutral-500 hover:text-neutral-800">{passes.length} checks theek hain</summary>
            <ul className="mt-1.5 space-y-1">
              {passes.map((i, n) => (
                <li key={n} className="flex items-start gap-1.5 text-xs text-emerald-800">
                  <CircleCheck className="mt-0.5 h-3 w-3 shrink-0" /> {i.message}
                </li>
              ))}
            </ul>
          </details>
        )}
      </Section>

      {/* Title and description */}
      <Section title="Title aur description">
        <TextField
          label="SEO title (pattern)"
          value={entry.seoTitle}
          onChange={(v) => update({ seoTitle: v || null })}
          placeholder={titlePatternFor(DEFAULT_SEO_SETTINGS.titlePatterns, entry.type, titlePatternVariant(entry.type, entry.data))}
          hint="Khali ho to type ka pattern lagta hai. {title}, {year}, {data.field} chalte hain."
          maxLength={120}
        />
        <div className="rounded-lg bg-neutral-50 px-3 py-2 ring-1 ring-neutral-200">
          <div className="flex items-center justify-between text-[11px] text-neutral-500">
            <span>Final title</span>
            <span className={cn('tabular-nums', (finalTitle.length < TEXT_LIMITS.titleChars.min || finalTitle.length > TEXT_LIMITS.titleChars.max) && 'font-semibold text-amber-600')}>
              {finalTitle.length}/{TEXT_LIMITS.titleChars.min}-{TEXT_LIMITS.titleChars.max}
            </span>
          </div>
          <p className="mt-0.5 text-sm font-medium text-neutral-900">{finalTitle}</p>
        </div>
        <TextArea
          label="Meta description"
          value={entry.seoDescription}
          onChange={(v) => update({ seoDescription: v || null })}
          chars={TEXT_LIMITS.descriptionChars}
          rows={3}
          placeholder={entry.summary ?? 'Khali ho to summary use hoga'}
          maxLength={320}
        />
      </Section>

      {/* Focus keyword */}
      <Section title="Focus keyword">
        <TextField value={entry.focusKeyword} onChange={(v) => update({ focusKeyword: v || null })} placeholder="pharmacy software pakistan" maxLength={80} />
        {checks && (
          <div className="grid grid-cols-2 gap-1.5">
            {checks.map((c) => (
              <span key={c.label} className={cn('inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs', c.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-neutral-100 text-neutral-500')}>
                {c.ok ? <CircleCheck className="h-3.5 w-3.5" /> : <CircleAlert className="h-3.5 w-3.5" />}
                {c.label}
              </span>
            ))}
          </div>
        )}
      </Section>

      {/* Quality gate */}
      <Section title="Quality gate" description="Kam alfaaz par page publish ho sakta hai magar noindex rahega">
        <GateBar words={gate.words} required={gate.required} />
        {gate.similarity !== undefined && (
          <p className={cn('text-xs', gate.similarity >= 0.5 ? 'font-semibold text-rose-600' : 'text-neutral-600')}>
            Doosre {ENTRY_TYPE_META[entry.type].labelPlural.toLowerCase()} se milta julta: {Math.round(gate.similarity * 100)}% (had 50%)
          </p>
        )}
        {robots && (
          <p className="text-xs text-neutral-600">
            Robots: <b>{robots.index ? 'index' : 'noindex'}</b>, <b>{robots.follow ? 'follow' : 'nofollow'}</b>
            {robots.reason && <span className="text-violet-700"> · {robotsReasonLabel(robots.reason)}</span>}
          </p>
        )}
      </Section>

      {/* Canonical and robots */}
      <Section title="Canonical aur robots">
        <TextField label="Canonical URL" type="url" mono value={entry.canonicalUrl} onChange={(v) => update({ canonicalUrl: v || null })} placeholder="Khali = page ka apna URL" />
        <Toggle checked={entry.noindex} onChange={(noindex) => update({ noindex })} label="noindex" hint="Google is page ko index na kare" />
        <Toggle checked={entry.nofollow} onChange={(nofollow) => update({ nofollow })} label="nofollow" hint="Is page ke links follow na hon" />
      </Section>

      {/* OG image */}
      <Section title="Social share image (OG)" description="Khali ho to site title aur summary se card khud banati hai">
        <MediaField value={entry.ogImageId} onChange={(id) => update({ ogImageId: id ?? null })} kinds={['IMAGE', 'SCREENSHOT', 'ILLUSTRATION']} />
        <div className="overflow-hidden rounded-xl border border-neutral-200">
          <div className="relative aspect-[1200/630] w-full bg-neutral-900">
            {ogMedia ? (
              <MediaThumb media={ogMedia} className="h-full w-full" />
            ) : (
              <div className="flex h-full flex-col justify-between bg-gradient-to-br from-emerald-950 via-neutral-900 to-neutral-900 p-[5%] text-white">
                <div className="flex items-center gap-2 text-[11px] font-bold tracking-wide">
                  <span className="grid h-5 w-5 place-items-center rounded bg-emerald-500 text-[10px]">N</span> Nafaa
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">{ENTRY_TYPE_META[entry.type].label}</p>
                  <p className="mt-1 line-clamp-2 text-base font-bold leading-tight">{entry.title || 'Title'}</p>
                  {entry.summary && <p className="mt-1 line-clamp-2 text-[11px] text-neutral-300">{entry.summary}</p>}
                </div>
                <p className="font-mono text-[10px] text-neutral-400">
                  {host}
                  {entry.path}
                </p>
              </div>
            )}
          </div>
          <p className="border-t border-neutral-100 px-3 py-1.5 text-[11px] text-neutral-500">1200 × 630 · andazan preview</p>
        </div>
      </Section>

      {/* JSON-LD */}
      <Section title="Structured data" description="Page ka @graph site template banata hai (FAQPage, Breadcrumbs, type ka schema). Yahan sirf izafi JSON-LD.">
        <SchemaExtraField value={entry.schemaExtra} onChange={(schemaExtra) => update({ schemaExtra })} />
        <p className="text-[11px] text-neutral-500">Rating ya review schema kabhi nahi lagta (sirf asal data).</p>
      </Section>
    </div>
  );
}

function Tally({ icon, n, label, tone }: { icon: React.ReactNode; n: number; label: string; tone: 'rose' | 'amber' | 'emerald' }) {
  const c = { rose: 'text-rose-600', amber: 'text-amber-600', emerald: 'text-emerald-600' }[tone];
  return (
    <div>
      <p className={cn('flex items-center justify-center gap-1 text-lg font-bold tabular-nums', n ? c : 'text-neutral-300')}>
        {icon}
        {n}
      </p>
      <p className="text-[10px] uppercase tracking-wide text-neutral-500">{label}</p>
    </div>
  );
}

export function IssueRow({ issue, onSelectBlock }: { issue: Issue; onSelectBlock?: (id: string) => void }) {
  const error = issue.severity === 'error';
  return (
    <li className={cn('flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-xs', error ? 'bg-rose-50 text-rose-800' : 'bg-amber-50 text-amber-900')}>
      {error ? <CircleX className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
      <span className="flex-1">
        {issue.message}
        {issue.field && <span className="ml-1 font-mono text-[10px] opacity-60">{issue.field}</span>}
      </span>
      {issue.blockId && onSelectBlock && (
        <button type="button" onClick={() => onSelectBlock(issue.blockId as string)} className="shrink-0 font-medium underline">
          Block
        </button>
      )}
    </li>
  );
}

export function GateBar({ words, required }: { words: number; required: number | null }) {
  if (!required) return <p className="text-xs text-neutral-500">{words} alfaaz · is type par gate nahi</p>;
  const pct = Math.min(100, Math.round((words / required) * 100));
  const ok = words >= required;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className={ok ? 'font-medium text-emerald-700' : 'font-medium text-amber-700'}>{ok ? 'Gate paar' : 'Gate se neeche (noindex)'}</span>
        <span className="tabular-nums text-neutral-600">
          {words}/{required} alfaaz
        </span>
      </div>
      <div className="h-2 rounded-full bg-neutral-100">
        <div className={cn('h-2 rounded-full transition-all', ok ? 'bg-emerald-500' : 'bg-amber-500')} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SchemaExtraField({ value, onChange }: { value: AdminEntry['schemaExtra']; onChange: (v: AdminEntry['schemaExtra']) => void }) {
  const [text, setText] = useState(() => (value && value.length ? JSON.stringify(value, null, 2) : ''));
  const [bad, setBad] = useState(false);
  return (
    <TextArea
      mono
      rows={4}
      value={text}
      placeholder='[{ "@type": "HowTo", ... }]'
      error={bad ? 'JSON array hona chahiye' : undefined}
      onChange={(v) => {
        setText(v);
        if (!v.trim()) {
          setBad(false);
          onChange(null);
          return;
        }
        try {
          const parsed = JSON.parse(v) as unknown;
          if (!Array.isArray(parsed) || !parsed.every((x) => x && typeof x === 'object' && !Array.isArray(x))) throw new Error('not array');
          setBad(false);
          onChange(parsed as Record<string, unknown>[]);
        } catch {
          setBad(true);
        }
      }}
    />
  );
}
