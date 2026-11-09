/**
 * Sync errors in plain words. The API stores one sentence per failed link
 * (see friendlySyncError in the API); this maps it to a cause so the screen
 * shows a short label and a translated explanation instead of the stored
 * text, and groups problems by cause.
 */

import { t } from '@core/i18n';

export type SyncCause = 'auth' | 'disabled' | 'timeout' | 'offline' | 'location' | 'size' | 'sku' | 'other';

const RULES: Array<[SyncCause, RegExp]> = [
  ['auth', /permission khatam|ijazat|login|token|unauthori[sz]ed|forbidden|\b40[13]\b/i],
  ['disabled', /band hai — support|server par nahi lagi/i],
  ['timeout', /waqt par jawab|timeout|timed out|abort/i],
  ['offline', /nahi pahunch|internet|network|ENOTFOUND|ECONNREFUSED|fetch failed/i],
  ['location', /location/i],
  ['size', /\bsize\b|variant/i],
  ['sku', /\bsku\b|not found|nahi mila|does not exist|\b404\b|deleted/i],
];

export function syncCause(error: string | null | undefined): SyncCause {
  const text = String(error ?? '');
  for (const [cause, re] of RULES) if (re.test(text)) return cause;
  return 'other';
}

/** Short label for a grid cell, e.g. "Nahi gaya". */
export function causeShort(cause: SyncCause): string {
  switch (cause) {
    case 'auth': return t('Login khatam');
    case 'offline': return t('Channel band');
    case 'timeout': return t('Der ho gayi');
    case 'location': return t('Location nahi');
    case 'size': return t('Size ka masla');
    case 'sku': return t('Channel par nahi');
    case 'disabled': return t('Ruka hua');
    default: return t('Nahi gaya');
  }
}

/** Title and one line of advice for the problems drawer and the product panel. */
export function causeInfo(cause: SyncCause): { title: string; text: string } {
  switch (cause) {
    case 'auth': return { title: t('Channel ki permission khatam'), text: t('Channel ka login purana ho gaya. Channel ke safhe par "Dobara jorein" dabayein.') };
    case 'offline': return { title: t('Channel tak nahi pahunch sake'), text: t('Website band hai ya internet ka masla hai. Website chal rahi ho to "Dobara bhejein" dabayein.') };
    case 'timeout': return { title: t('Channel ne waqt par jawab nahi diya'), text: t('Thori der baad Nafaa khud dobara bhejega. Abhi chahiye to "Dobara bhejein".') };
    case 'location': return { title: t('Stock ki location nahi mili'), text: t('Shopify par stock ki jagah (location) nahi mili. Channel ke safhe par "Webhooks check" dabayein.') };
    case 'size': return { title: t('Size ke baghair jura'), text: t('Product ke sizes hain magar channel par poora product ek saath jura hai. Link hata kar har size alag jorein.') };
    case 'sku': return { title: t('Channel par product nahi mila'), text: t('Shayad channel par product mita diya gaya. Dobara jorein ya Nafaa se channel par banayein.') };
    case 'disabled': return { title: t('Ye channel abhi band hai'), text: t('Nafaa ne is channel ka bhejna roka hua hai. Support se baat karein.') };
    default: return { title: t('Channel ne mana kar diya'), text: t('Neeche channel ka jawab dekhein, theek kar ke "Dobara bhejein".') };
  }
}

/** True when the stored text is one Nafaa wrote (Roman Urdu); channel replies in English are shown as they are. */
export const isNafaaText = (error: string | null | undefined) => !!error && syncCause(error) !== 'other';
