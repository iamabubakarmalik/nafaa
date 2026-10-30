/** Languages the apps can show: English, Urdu script, and Roman Urdu. */
export const APP_LANGUAGES = ['en', 'ur', 'roman'] as const;
export type AppLanguage = (typeof APP_LANGUAGES)[number];

/** New accounts start in English; existing accounts were moved to Roman Urdu. */
export const DEFAULT_APP_LANGUAGE: AppLanguage = 'en';

export const isAppLanguage = (value: unknown): value is AppLanguage =>
  typeof value === 'string' && (APP_LANGUAGES as readonly string[]).includes(value);
