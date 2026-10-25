'use client';

/**
 * English / اردو switch (footer group and a compact header link).
 *
 * It keeps the reader on the same page: /pricing ↔ /ur/pricing, offered
 * only when that page is published in both languages (`paired`, CMS paths
 * without the prefix). A page without a translation shows no switch.
 * Before Urdu is live (settings `site.locales`), the footer shows Urdu as
 * "coming soon" and the header shows nothing.
 *
 * Plain <a> links, so the other language loads with its own shell and font.
 */
import { usePathname } from 'next/navigation';
import { cx } from '@/components/ui/cx';
import { cmsPathOf, pathIn, shellStrings, type SiteLocale } from '@/lib/i18n/shell';
import { LanguagesGlyph } from './glyphs';
import { useSiteLocale, useUrduLive } from './LocaleGate';

const LABEL: Record<SiteLocale, string> = { en: 'English', ur: 'اردو' };

function useTwin(paired: readonly string[]): { current: SiteLocale; other: SiteLocale; path: string; href: string } | null {
  const current = useSiteLocale();
  const path = cmsPathOf(usePathname() ?? '/');
  if (!paired.includes(path)) return null;
  const other: SiteLocale = current === 'ur' ? 'en' : 'ur';
  return { current, other, path, href: pathIn(other, path) };
}

function Option({ locale, href, active }: { locale: SiteLocale; href: string; active: boolean }) {
  return (
    <a
      href={href}
      hrefLang={locale}
      lang={locale}
      aria-current={active ? 'true' : undefined}
      data-track="language_switch"
      data-track-label={`Language: ${locale === 'ur' ? 'Urdu' : 'English'}`}
      className={cx(
        'inline-flex h-7 items-center rounded px-2',
        locale === 'ur' && 'font-urdu',
        active ? 'bg-surface-3 font-medium text-fg-strong' : 'text-fg-subtle hover:text-fg-strong',
      )}
    >
      {LABEL[locale]}
    </a>
  );
}

/** Footer control: both languages side by side. */
export function LanguageSwitch({ paired, className }: { paired: readonly string[]; className?: string }) {
  const live = useUrduLive();
  const twin = useTwin(paired);
  const current = useSiteLocale();
  const t = shellStrings(current);

  if (!live) {
    return (
      <div role="group" aria-label={t.language} className={cx('inline-flex items-center rounded-md border border-line p-0.5 text-xs', className)}>
        <span aria-current="true" className="inline-flex h-7 items-center gap-1.5 rounded bg-surface-3 px-2 font-medium text-fg-strong">
          <LanguagesGlyph size={14} />
          English
        </span>
        <span className="inline-flex h-7 items-center gap-1.5 px-2 text-fg-subtle" title={t.urduSoon}>
          <span lang="ur" dir="rtl">
            اردو
          </span>
          <span className="rounded-full bg-amber-500/15 px-1.5 text-[10px] font-semibold leading-4 text-amber-700 ink:text-amber-300">{t.soon}</span>
        </span>
      </div>
    );
  }
  if (!twin) return null;

  return (
    <div role="group" aria-label={t.language} dir="ltr" className={cx('inline-flex items-center rounded-md border border-line p-0.5 text-xs', className)}>
      <LanguagesGlyph size={14} className="mx-1.5 text-fg-subtle" />
      <Option locale="en" href={pathIn('en', twin.path)} active={current === 'en'} />
      <Option locale="ur" href={pathIn('ur', twin.path)} active={current === 'ur'} />
    </div>
  );
}

/** Header link to this page in the other language; nothing when there is no translation. */
export function LanguageLink({ paired, className }: { paired: readonly string[]; className?: string }) {
  const live = useUrduLive();
  const twin = useTwin(paired);
  if (!live || !twin) return null;
  const t = shellStrings(twin.current);
  return (
    <a
      href={twin.href}
      hrefLang={twin.other}
      lang={twin.other}
      title={`${t.readIn}: ${LABEL[twin.other]}`}
      data-track="language_switch"
      data-track-label={`Header language: ${twin.other === 'ur' ? 'Urdu' : 'English'}`}
      className={cx(
        'inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-small font-medium text-fg-muted transition-colors duration-fast hover:bg-surface-3 hover:text-fg-strong',
        twin.other === 'ur' && 'font-urdu',
        className,
      )}
    >
      <LanguagesGlyph size={16} className="shrink-0" />
      {LABEL[twin.other]}
    </a>
  );
}
