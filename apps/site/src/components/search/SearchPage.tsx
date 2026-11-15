/**
 * /search and /ur/search: the search panel on its own page (noindex). The
 * query comes from ?q= in the browser, so the page itself stays static.
 */
import type { SiteLocale } from '@/lib/i18n/shell';
import { searchStrings } from '@/lib/i18n/search';
import { SearchPanel } from './SearchPanel';

export function SearchPage({ locale }: { locale: SiteLocale }) {
  const t = searchStrings(locale);
  return (
    <section aria-labelledby="search-heading" className="mx-auto box-content min-h-[70vh] max-w-[48rem] px-gutter pb-section pt-12 md:pt-20">
      <h1 id="search-heading" className="text-h1 text-fg-strong">
        {t.heading}
      </h1>
      <p className="mt-3 text-body-lg text-fg-muted">{t.intro}</p>
      <div className="mt-8">
        <SearchPanel locale={locale} variant="page" />
      </div>
    </section>
  );
}
