/**
 * Languages: English at "/", Urdu (RTL) at "/ur", Roman Urdu at "/roman".
 * Every visible string lives in src/i18n/<lang>.json; t() reads a dotted key
 * and fills {placeholders}.
 */
import en from '../i18n/en.json';
import roman from '../i18n/roman.json';
import ur from '../i18n/ur.json';
import type { L3, Lang } from './types';

export type Dict = typeof en;
export const LANGS: Lang[] = ['en', 'ur', 'roman'];
const DICTS: Record<Lang, Dict> = { en, ur: ur as Dict, roman: roman as Dict };

export function isLang(v: unknown): v is Lang {
  return v === 'en' || v === 'ur' || v === 'roman';
}

export function getDict(lang: Lang): Dict {
  return DICTS[lang] ?? en;
}

export type TFn = (key: string, vars?: Record<string, string | number>) => string;

export function makeT(dict: Dict): TFn {
  return (key, vars) => {
    let node: unknown = dict;
    for (const part of key.split('.')) node = (node as Record<string, unknown> | undefined)?.[part];
    let out = typeof node === 'string' ? node : key;
    if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
    return out;
  };
}

/** Path for a language: "/cart" → "/ur/cart". */
export function href(lang: Lang, path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (lang === 'en') return p;
  return p === '/' ? `/${lang}` : `/${lang}${p}`;
}

/** Same page in another language, from a pathname that may carry a prefix. */
export function switchLang(pathname: string, to: Lang): string {
  const bare = pathname.replace(/^\/(ur|roman)(?=\/|$)/, '') || '/';
  return href(to, bare);
}

export const dirOf = (lang: Lang) => (lang === 'ur' ? 'rtl' : 'ltr');
export const htmlLang = (lang: Lang) => (lang === 'ur' ? 'ur' : lang === 'roman' ? 'ur-Latn' : 'en');
export const pick = (l: L3 | null | undefined, lang: Lang) => (l ? l[lang] || l.en : '');
