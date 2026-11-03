/**
 * Per-area copies of `t` and `Trans`.
 *
 * Files import `t` and `Trans` from '@/core/i18n' as usual. At build time
 * scripts/i18n/babel-area-plugin.js replaces those two imports with the
 * helpers below, bound to the file's area (the same area the extractor uses),
 * so a key is looked up in the catalog file it was extracted to.
 */

import type { ReactNode } from 'react';
import { renderTrans, type TransProps } from './Trans';
import { translateIn, type Params } from './runtime';

type Helpers = { t: (text: string, params?: Params) => string; Trans: (props: TransProps) => ReactNode };
const helpers = new Map<string, Helpers>();

export function areaHelpers(area: string): Helpers {
  let bound = helpers.get(area);
  if (!bound) {
    const Trans = (props: TransProps) => renderTrans(area, props);
    bound = { t: (text, params) => translateIn(area, text, params), Trans };
    helpers.set(area, bound);
  }
  return bound;
}
