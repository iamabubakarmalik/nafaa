/** hreflang alternates for a code page in both languages (/tour, /search); Urdu only while it is live. */
import { getLayout } from '@/lib/cms/client';
import { absoluteUrl } from '@/lib/cms/env';
import { DEFAULT_LOCALE, hreflangFor, localizePath } from '@/lib/cms/locale';

export async function pageAlternates(path: string): Promise<Record<string, string>> {
  const { site } = await getLayout(DEFAULT_LOCALE);
  const locales = site.locales.includes('ur') ? [DEFAULT_LOCALE, 'ur'] : [DEFAULT_LOCALE];
  const out: Record<string, string> = {};
  for (const locale of locales) out[hreflangFor(locale)] = absoluteUrl(localizePath(locale, path));
  out['x-default'] = absoluteUrl(path);
  return out;
}
