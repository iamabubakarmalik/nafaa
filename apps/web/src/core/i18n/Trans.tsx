/**
 * Translates text that contains React elements (bold names, links, badges).
 *
 *   <Trans text="Pehle {{shop}} chunein, phir {{link}}" values={{ shop: <b>{name}</b>, link: <a href="/x">{t('yahan')}</a> }} />
 *
 * The whole sentence is one catalog entry, so translators can move the
 * placeholders to wherever the language needs them.
 */

import { Fragment, type ReactNode } from 'react';
import { t } from './runtime';

const SPLIT = /(\{\{\s*\w+\s*\}\})/;

export function Trans({ text, values = {} }: { text: string; values?: Record<string, ReactNode> }) {
  const plain: Record<string, string | number> = {};
  for (const [name, value] of Object.entries(values)) {
    if (typeof value === 'string' || typeof value === 'number') plain[name] = value;
  }
  const translated = t(text, plain);
  const parts = translated.split(SPLIT);
  return (
    <>
      {parts.map((part, i) => {
        const name = /^\{\{\s*(\w+)\s*\}\}$/.exec(part)?.[1];
        return <Fragment key={i}>{name && name in values ? values[name] : part}</Fragment>;
      })}
    </>
  );
}
