/**
 * Public entry for translations. Import from '@core/i18n' only.
 *
 *   t('Naya product')                       plain text
 *   t('{{count}} items', { count })         placeholders and plural forms
 *   <Trans text="..." values={{ name: <b/> }} />   text around React elements
 *   msg('Pending')                          mark text for extraction, translate later with t()
 *
 * Language switching lives in './sync' (it needs the API client and auth store,
 * which must not be pulled into every module that only translates text).
 * See README.md in this folder for the conventions and the conversion tools.
 */

export { t, msg, currentLocale, isRtl, hasTranslation, interpolate, type Params } from './runtime';
export { Trans } from './Trans';
export { LOCALES, DEFAULT_LOCALE, localeInfo, normalizeLocale, type Locale, type LocaleInfo } from './locales';
