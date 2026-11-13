/**
 * Shared caption plus a tab per chosen platform. A platform tab starts from
 * the shared caption; typing there keeps a separate version for that
 * platform. Each tab shows a live count against the platform's limit
 * (with hashtags added, as they will be posted).
 */

import { useMemo, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RotateCcw, Smile, Sparkles, X } from 'lucide-react';
import { Button } from '@/design-system/components';
import { brandSocialApi, type HashtagSet, type SocialPlatform } from '@/api/admin-brand-social.api';
import { cn } from '@/lib/cn';
import { apiError } from '@/lib/errors';
import { PLATFORM, PlatformMark } from '../../lib/platforms';
import { captionFor, charCount, fullText, normaliseTags, parseTags, tagsIn } from '../../lib/post';

type Captions = Partial<Record<SocialPlatform, string>>;

const EMOJI = ['🔥', '✅', '👉', '📈', '💰', '🛒', '🎉', '⭐', '📱', '🧾', '💡', '🙌', '❤️', '🇵🇰'];

function Counter({ used, limit, tags, tagLimit }: { used: number; limit: number; tags?: number; tagLimit?: number }) {
  const pct = Math.min(1, used / limit);
  const over = used > limit;
  const near = !over && pct > 0.9;
  const r = 8;
  const c = 2 * Math.PI * r;
  return (
    <span className="inline-flex items-center gap-2 text-[0.75rem] tabular-nums">
      {tagLimit != null && <span className={cn((tags ?? 0) > tagLimit ? 'font-semibold text-rose-600' : 'text-slate-500')}>#{tags ?? 0}/{tagLimit}</span>}
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
        <circle cx="10" cy="10" r={r} fill="none" stroke="currentColor" className="text-slate-200" strokeWidth="2.5" />
        <circle cx="10" cy="10" r={r} fill="none" strokeWidth="2.5" strokeLinecap="round" transform="rotate(-90 10 10)"
          stroke="currentColor" className={over ? 'text-rose-600' : near ? 'text-amber-600' : 'text-brand-500'} strokeDasharray={c} strokeDashoffset={c * (1 - pct)} />
      </svg>
      <span className={cn(over ? 'font-semibold text-rose-600' : near ? 'font-semibold text-amber-700' : 'text-slate-500')}>
        {over ? `−${(used - limit).toLocaleString('en-PK')}` : `${used.toLocaleString('en-PK')} / ${limit.toLocaleString('en-PK')}`}
      </span>
    </span>
  );
}

export function CaptionEditor({ platforms, caption, captions, hashtags, hashtagSets, title, onCaption, onCaptions, onHashtags, disabled }: {
  platforms: SocialPlatform[];
  caption: string;
  captions: Captions;
  hashtags: string[];
  hashtagSets: HashtagSet[];
  title: string;
  onCaption: (v: string) => void;
  onCaptions: (v: Captions) => void;
  onHashtags: (v: string[]) => void;
  disabled?: boolean;
}) {
  const [tab, setTab] = useState<'ALL' | SocialPlatform>('ALL');
  const [tagDraft, setTagDraft] = useState('');
  const [ideas, setIdeas] = useState<string[]>([]);
  const area = useRef<HTMLTextAreaElement>(null);
  const active: 'ALL' | SocialPlatform = tab !== 'ALL' && !platforms.includes(tab) ? 'ALL' : tab;
  const custom = active !== 'ALL' && !!captions[active]?.trim();
  const value = active === 'ALL' ? caption : captionFor(caption, captions, active);

  const set = (v: string) => {
    if (active === 'ALL') onCaption(v);
    else onCaptions({ ...captions, [active]: v });
  };

  const counts = useMemo(() => Object.fromEntries(platforms.map((p) => {
    const t = fullText(captionFor(caption, captions, p), hashtags);
    return [p, { used: charCount(t, p), tags: tagsIn(t) }];
  })) as Record<SocialPlatform, { used: number; tags: number }>, [platforms, caption, captions, hashtags]);

  // On the shared tab, count against the tightest chosen platform.
  const tightest = platforms.length ? platforms.reduce((a, b) => (PLATFORM[a].limit <= PLATFORM[b].limit ? a : b)) : null;
  const meter = active === 'ALL' ? tightest : active;

  const insert = (s: string) => {
    const el = area.current;
    if (!el) { set(value + s); return; }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    set(value.slice(0, start) + s + value.slice(end));
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start + s.length, start + s.length); });
  };

  const ai = useMutation({
    mutationFn: () => brandSocialApi.aiCaption({ brief: [title, value].filter(Boolean).join('\n\n') || 'Nafaa POS for Pakistani shops', platform: active === 'ALL' ? (platforms[0] ?? 'INSTAGRAM') : active, tone: 'friendly' }),
    onSuccess: (r) => {
      if (!r.captions?.length) { toast.error('Nafaa AI did not return a caption. Try a longer brief.'); return; }
      setIdeas(r.captions);
      set(r.captions[0]);
      if (r.hashtags?.length) onHashtags(normaliseTags([...hashtags, ...r.hashtags]));
      toast.success('Caption written by Nafaa AI. Read it before saving.');
    },
    onError: (e) => toast.error(apiError(e, 'Nafaa AI could not write a caption right now.')),
  });

  const addTags = (s: string) => { const t = parseTags(s); if (t.length) onHashtags(normaliseTags([...hashtags, ...t])); setTagDraft(''); };

  return (
    <div className="space-y-3">
      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5" role="tablist" aria-label="Caption per platform">
        {(['ALL', ...platforms] as const).map((t) => {
          const over = t !== 'ALL' && counts[t] && counts[t].used > PLATFORM[t].limit;
          const own = t !== 'ALL' && !!captions[t]?.trim();
          return (
            <button key={t} type="button" role="tab" aria-selected={active === t} onClick={() => setTab(t)}
              className={cn('flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[0.75rem] font-semibold transition',
                active === t ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100')}>
              {t === 'ALL' ? 'All platforms' : <><PlatformMark p={t} size={14} />{PLATFORM[t].label}</>}
              {own && <span className={cn('h-1.5 w-1.5 rounded-full', active === t ? 'bg-white' : 'bg-brand-500')} title="Own caption" />}
              {over && <span className="h-1.5 w-1.5 rounded-full bg-rose-500" title="Over the limit" />}
            </button>
          );
        })}
      </div>

      <div className={cn('overflow-hidden rounded-xl bg-white ring-1 focus-within:ring-2 focus-within:ring-brand-500', meter && counts[meter]?.used > PLATFORM[meter].limit ? 'ring-rose-300' : 'ring-slate-300')}>
        <textarea
          ref={area}
          value={value}
          disabled={disabled}
          onChange={(e) => set(e.target.value)}
          rows={8}
          placeholder={active === 'ALL' ? 'Write the caption every platform starts from…' : `Write a ${PLATFORM[active].label} version, or leave it as the shared caption`}
          className="block min-h-[11rem] w-full resize-y border-0 bg-transparent px-3.5 py-3 text-[0.875rem] leading-relaxed text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
        />
        <div className="flex flex-wrap items-center gap-1 border-t border-slate-100 bg-slate-50/70 px-2 py-1.5">
          <span className="me-1 flex items-center gap-0.5">
            <Smile className="h-4 w-4 text-slate-400" />
            {EMOJI.map((e) => <button key={e} type="button" disabled={disabled} onClick={() => insert(e)} className="rounded px-0.5 text-[0.9375rem] hover:bg-slate-200">{e}</button>)}
          </span>
          <span className="ms-auto flex items-center gap-2">
            {custom && <button type="button" onClick={() => onCaptions({ ...captions, [active as SocialPlatform]: '' })} className="inline-flex items-center gap-1 text-[0.75rem] font-medium text-slate-500 hover:text-slate-800"><RotateCcw className="h-3.5 w-3.5" />Use shared caption</button>}
            <Button type="button" size="xs" variant="ghost" loading={ai.isPending} disabled={disabled} leftIcon={<Sparkles className="h-3.5 w-3.5" />} onClick={() => ai.mutate()}>Nafaa AI</Button>
            {meter && <Counter used={counts[meter]?.used ?? 0} limit={PLATFORM[meter].limit} tags={counts[meter]?.tags} tagLimit={PLATFORM[meter].hashtagLimit} />}
          </span>
        </div>
      </div>
      {ideas.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[0.75rem] text-slate-500">Other versions:</span>
          {ideas.map((c, i) => (
            <button key={i} type="button" onClick={() => set(c)} title={c} className={cn('h-6 rounded-full px-2.5 text-[0.75rem] font-medium', value === c ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}>Version {i + 1}</button>
          ))}
          <button type="button" onClick={() => setIdeas([])} className="text-[0.75rem] text-slate-400 hover:text-slate-700">Hide</button>
        </div>
      )}
      {active === 'ALL' && platforms.length > 1 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[0.75rem]">
          {platforms.map((p) => {
            const c = counts[p];
            const over = c.used > PLATFORM[p].limit;
            return (
              <button key={p} type="button" onClick={() => setTab(p)} className={cn('inline-flex items-center gap-1 tabular-nums hover:underline', over ? 'font-semibold text-rose-600' : 'text-slate-500')}>
                <PlatformMark p={p} size={12} />{c.used.toLocaleString('en-PK')}/{PLATFORM[p].limit.toLocaleString('en-PK')}
              </button>
            );
          })}
        </div>
      )}

      {/* Hashtags */}
      <div>
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-white px-2 py-1.5 ring-1 ring-slate-300 focus-within:ring-2 focus-within:ring-brand-500">
          {hashtags.map((t) => (
            <span key={t} className="inline-flex h-6 items-center gap-1 rounded-md bg-brand-50 ps-2 pe-1 text-[0.75rem] font-medium text-brand-700">
              {t}
              <button type="button" disabled={disabled} onClick={() => onHashtags(hashtags.filter((x) => x !== t))} aria-label={`Remove ${t}`} className="rounded p-0.5 hover:bg-brand-100"><X className="h-3 w-3" /></button>
            </span>
          ))}
          <input
            value={tagDraft}
            disabled={disabled}
            onChange={(e) => { const v = e.target.value; if (/[\s,]$/.test(v)) addTags(v); else setTagDraft(v); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); addTags(tagDraft); }
              if (e.key === 'Backspace' && !tagDraft && hashtags.length) onHashtags(hashtags.slice(0, -1));
            }}
            onBlur={() => tagDraft && addTags(tagDraft)}
            onPaste={(e) => { e.preventDefault(); addTags(e.clipboardData.getData('text')); }}
            placeholder={hashtags.length ? 'Add more…' : 'Add hashtags (space or Enter between them)'}
            className="h-6 min-w-[10rem] flex-1 border-0 bg-transparent p-0 text-[0.8125rem] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
          />
        </div>
        {!!hashtagSets.length && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[0.75rem] text-slate-500">Sets:</span>
            {hashtagSets.map((s) => (
              <button key={s.name} type="button" disabled={disabled} onClick={() => onHashtags(normaliseTags([...hashtags, ...s.tags]))} title={normaliseTags(s.tags).join(' ')}
                className="h-6 rounded-full bg-slate-100 px-2.5 text-[0.75rem] font-medium text-slate-700 hover:bg-slate-200">+ {s.name} <span className="text-slate-400">{s.tags.length}</span></button>
            ))}
            {!!hashtags.length && <button type="button" onClick={() => onHashtags([])} className="ms-1 text-[0.75rem] font-medium text-slate-500 hover:text-rose-600">Clear</button>}
          </div>
        )}
      </div>
    </div>
  );
}
