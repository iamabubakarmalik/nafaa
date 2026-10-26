/**
 * Header block of Settings → Appearance: how the colored box at the top of
 * every page (PageHero) looks.
 *
 * Style tiles are miniature headers drawn with the same CSS variables as the
 * real one; the live preview below renders PageHero itself with page-style
 * content (white-text buttons included) so the owner sees exactly what each
 * page will show. Both use the theme of the layer being edited, so a
 * business-default accent shows even while the user's own look differs.
 */

import { type CSSProperties, type ReactNode } from 'react';
import { Download, Package, Plus, RefreshCw, ScanLine } from 'lucide-react';
import { HeroBackdrop, PageHero, Segmented, heroButton, heroIconButton, heroPrimaryButton } from '@/design-system/components';
import {
  HERO_PATTERNS, HERO_SIZES, HERO_STATS_LAYOUTS, HERO_STYLES, PLAIN_HERO_STYLES, isDarkMode, themeVariables, useAppearanceStore,
  type HeroPattern, type HeroSize, type HeroStatsLayout, type HeroStyle, type ResolvedAppearance,
} from '@/design-system';
import { cn } from '@core/lib/cn';
import type { AppearanceEditor } from '../hooks/useAppearanceEditor';
import { ChoiceGrid } from './ChoiceGrid';

/** Theme variables of the edited layer, applied to a preview region. */
function useScopeTheme(a: ResolvedAppearance) {
  const systemPrefersDark = useAppearanceStore((s) => s.systemPrefersDark);
  const dark = isDarkMode(a, systemPrefersDark);
  return { style: themeVariables(a, dark) as CSSProperties, className: dark ? 'dark' : 'light' };
}

/** A miniature header: title, a button, the primary button and two numbers. */
function HeroSwatch({ style, pattern, theme }: { style: HeroStyle; pattern: HeroPattern; theme: ReturnType<typeof useScopeTheme> }) {
  const shown = PLAIN_HERO_STYLES.includes(style) ? 'none' : pattern;
  return (
    <div className={cn('bg-shell-canvas p-2', theme.className)} style={theme.style}>
      <div className="nafaa-hero relative rounded-xl px-2.5 py-2" data-hero-style={style}>
        <HeroBackdrop pattern={shown} small />
        <div className="relative flex items-center justify-between gap-1.5">
          <span className="nafaa-hero-title truncate text-[0.6875rem] font-bold">Maal</span>
          <span className="flex shrink-0 items-center gap-1">
            <span className="h-3.5 w-5 rounded bg-[color:var(--hero-btn-bg)] ring-1 ring-[color:var(--hero-btn-ring)]" />
            <span className="flex h-3.5 w-6 items-center justify-center rounded bg-[color:var(--hero-primary-bg)] text-[0.625rem] font-bold leading-none text-[color:var(--hero-primary-fg)]">+</span>
          </span>
        </div>
        <div className="relative mt-1.5 flex items-end gap-2">
          <span className="min-w-0">
            <span className="nafaa-hero-muted block text-[0.625rem] leading-tight">Cost</span>
            <span className="block text-[0.8125rem] font-bold leading-tight tabular-nums">Rs 48k</span>
          </span>
          <span className="nafaa-hero-line min-w-0 border-l pl-2">
            <span className="nafaa-hero-muted block text-[0.625rem] leading-tight">Kam</span>
            <span className="block text-[0.6875rem] font-bold leading-tight tabular-nums">12</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
      <span className="min-w-0">
        <span className="block text-[0.8125rem] font-semibold text-slate-700">{label}</span>
        {hint && <span className="block text-[0.75rem] text-slate-500">{hint}</span>}
      </span>
      {children}
    </div>
  );
}

export function HeroSettings({ ed }: { ed: AppearanceEditor }) {
  const a = ed.resolved;
  const theme = useScopeTheme(a);
  const plain = PLAIN_HERO_STYLES.includes(a.heroStyle);
  const look = { style: a.heroStyle, pattern: a.heroPattern, size: a.heroSize, stats: a.heroStats };

  return (
    <div className="space-y-4">
      <ChoiceGrid<HeroStyle> label="Header ka style" columns={3} value={a.heroStyle} onChange={(v) => ed.set('heroStyle', v)}
        options={(Object.entries(HERO_STYLES) as [HeroStyle, (typeof HERO_STYLES)[HeroStyle]][]).map(([value, s]) => ({
          value,
          label: s.label,
          description: s.description,
          visual: <HeroSwatch style={value} pattern={a.heroPattern} theme={theme} />,
        }))} />

      <div className="space-y-3 rounded-xl border border-slate-200 p-3">
        <Row label="Pattern" hint={plain ? 'Simple style me pattern nahi hota' : 'Peechhe ki halki design'}>
          <Segmented<HeroPattern> label="Pattern" value={a.heroPattern} onChange={(v) => ed.set('heroPattern', v)}
            items={(Object.entries(HERO_PATTERNS) as [HeroPattern, { label: string }][]).map(([value, p]) => ({ value, label: p.label, disabled: plain }))} />
        </Row>
        <Row label="Size" hint={HERO_SIZES[a.heroSize].description}>
          <Segmented<HeroSize> label="Size" value={a.heroSize} onChange={(v) => ed.set('heroSize', v)}
            items={(Object.entries(HERO_SIZES) as [HeroSize, { label: string }][]).map(([value, s]) => ({ value, label: s.label }))} />
        </Row>
        <Row label="Numbers" hint={HERO_STATS_LAYOUTS[a.heroStats].description}>
          <Segmented<HeroStatsLayout> label="Numbers" value={a.heroStats} onChange={(v) => ed.set('heroStats', v)}
            items={(Object.entries(HERO_STATS_LAYOUTS) as [HeroStatsLayout, { label: string }][]).map(([value, s]) => ({ value, label: s.label }))} />
        </Row>
        <p className="text-[0.75rem] text-slate-500">Kone (corners) upar wali Corners setting ke saath chalte hain.</p>
      </div>

      <div>
        <span className="mb-2 block text-[0.75rem] font-semibold uppercase tracking-wide text-slate-400">Live preview</span>
        <div className={cn('rounded-2xl bg-shell-canvas p-3 ring-1 ring-slate-200', theme.className)} style={theme.style} aria-label="Header preview">
          <PageHero
            look={look}
            title="Maal"
            chip={<><Package />1,248 products</>}
            meta="Aaj 10:42 tak"
            actions={(
              <>
                <span className={heroButton}><ScanLine className="h-4 w-4" />Scan</span>
                <span className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/15 px-2.5 text-[0.8125rem] font-semibold text-white ring-1 ring-white/25"><Download className="h-4 w-4" />CSV</span>
                <span className={heroIconButton}><RefreshCw className="h-4 w-4" /></span>
                <span className={heroPrimaryButton}><Plus className="h-4 w-4" />Naya</span>
              </>
            )}
            stats={[
              { label: 'Stock ki cost', value: 'Rs 4,82,500', hint: '3,410 units' },
              { label: 'Kam stock', value: '12' },
              { label: 'Khatam', value: '3' },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
