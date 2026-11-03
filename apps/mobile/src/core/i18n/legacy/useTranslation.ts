/**
 * Dotted-key lookups for screens written before the source-text catalogs
 * (t('pos.title')). Only screens that are not rebuilt yet use it; each
 * rebuilt screen moves to `t()` from '@/core/i18n' and this folder is deleted
 * when the last caller is gone. Roman Urdu reads the English text here.
 */

import { currentLocale } from '../runtime';
import en from './en.json';
import ur from './ur.json';

const messages = { en, ur } as const;

function getNested(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => (acc as Record<string, unknown> | undefined)?.[key], obj);
}

export function useTranslation() {
  const locale = currentLocale() === 'ur' ? 'ur' : 'en';
  const t = (key: string, vars?: Record<string, string | number>): string => {
    let val = getNested(messages[locale], key);
    if (typeof val !== 'string') val = getNested(messages.en, key) ?? key;
    let out = String(val);
    if (vars) for (const [k, v] of Object.entries(vars)) out = out.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    return out;
  };
  return { t, locale };
}
