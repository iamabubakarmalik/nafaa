/**
 * Public entry for translations. Import from '@/core/i18n' only.
 *
 *   t('Naya product')                         plain text
 *   t('{{count}} items', { count })           placeholders and plural forms
 *   <Trans text="..." values={{ name: <Text/> }} />   text around elements
 *   msg('Pending')                            mark for extraction, translate later with t()
 *
 * Switching language lives in './sync' (it needs the API client).
 * See README.md in this folder.
 */

export { t, msg, currentLocale, isRtl, isLayoutRtl, hasTranslation, interpolate, translateIn, type Params } from './runtime';
export { Trans } from './Trans';
export { LOCALES, DEFAULT_LOCALE, localeInfo, normalizeLocale, type Locale, type LocaleInfo } from './locales';
