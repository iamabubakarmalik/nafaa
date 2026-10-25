'use client';

/**
 * Site locale for the shell.
 *
 * The root layout renders the English shell (header, <main>, footer).
 * Pages under /ur bring their own Urdu shell (app/ur/layout.tsx), so on
 * those paths the English header and footer render nothing and the root
 * <main> steps aside for the Urdu one. The locale is read from the
 * pathname, which is known while a page is prerendered, so static HTML
 * carries only the right shell and the right <html lang dir>.
 *
 * Urdu counts only while settings `site.locales` lists it (`urLive`);
 * before that /ur paths are ordinary English paths (and 404).
 */
import { usePathname } from 'next/navigation';
import { createContext, useContext, type ReactNode } from 'react';
import { localeOfPath, type SiteLocale } from '@/lib/i18n/shell';

const UrLiveContext = createContext(false);

export function useSiteLocale(): SiteLocale {
  const live = useContext(UrLiveContext);
  const fromPath = localeOfPath(usePathname());
  return live && fromPath === 'ur' ? 'ur' : 'en';
}

/** True when Urdu pages are live (settings `site.locales`). */
export function useUrduLive(): boolean {
  return useContext(UrLiveContext);
}

/** <html> with lang and dir for the current locale. */
export function LocaleHtml({ urLive, className, children }: { urLive: boolean; className?: string; children: ReactNode }) {
  return (
    <UrLiveContext.Provider value={urLive}>
      <LocaleHtmlInner className={className}>{children}</LocaleHtmlInner>
    </UrLiveContext.Provider>
  );
}

function LocaleHtmlInner({ className, children }: { className?: string; children: ReactNode }) {
  const locale = useSiteLocale();
  return (
    <html lang={locale} dir={locale === 'ur' ? 'rtl' : 'ltr'} className={className} suppressHydrationWarning>
      {children}
    </html>
  );
}

/** Renders its children on English pages only. */
export function EnglishOnly({ children }: { children: ReactNode }) {
  return useSiteLocale() === 'en' ? <>{children}</> : null;
}

/** The root <main> on English pages; a plain pass-through under /ur (the Urdu layout has its own <main>). */
export function LocaleMain({ children }: { children: ReactNode }) {
  if (useSiteLocale() !== 'en') return <>{children}</>;
  return (
    <main id="main" tabIndex={-1} className="flex-1 outline-none">
      {children}
    </main>
  );
}
