/** Shared helpers for server pages: language from params, dictionary, location cookie. */
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { getDict, href, isLang, makeT } from './i18n';
import { LOC_COOKIE, parseLoc } from './location';
import type { Lang } from './types';

export type LangParams = Promise<{ lang: string }>;

export async function pageLang(params: Promise<{ lang: string }>) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const l: Lang = lang;
  return { lang: l, t: makeT(getDict(l)), h: (p: string) => href(l, p) };
}

export async function readLoc() {
  return parseLoc((await cookies()).get(LOC_COOKIE)?.value);
}
