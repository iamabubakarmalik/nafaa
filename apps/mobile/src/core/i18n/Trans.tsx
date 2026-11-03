/**
 * Translates text that contains React elements (bold names, links).
 *
 *   <Trans text="Pehle {{shop}} chunein" values={{ shop: <Text weight="bold">{name}</Text> }} />
 *
 * The whole sentence is one catalog entry, so translators can move the
 * placeholders. Render it inside a <Text>.
 */

import { Fragment, type ReactNode } from 'react';
import { translateIn } from './runtime';

const SPLIT = /(\{\{\s*\w+\s*\}\})/;

export interface TransProps {
  text: string;
  values?: Record<string, ReactNode>;
}

export function Trans(props: TransProps) {
  return renderTrans(undefined, props);
}

export function renderTrans(area: string | undefined, { text, values = {} }: TransProps) {
  const plain: Record<string, string | number> = {};
  for (const [name, value] of Object.entries(values)) {
    if (typeof value === 'string' || typeof value === 'number') plain[name] = value;
  }
  const translated = translateIn(area, text, plain);
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
