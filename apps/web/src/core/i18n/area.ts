/**
 * Per-area copies of `t` and `Trans`.
 *
 * App code imports `t` and `Trans` from '@core/i18n' as usual. At build time
 * (and in the dev server) scripts/i18n/vite-area-plugin.mjs points that import
 * at a small generated module for the file's area, which re-exports
 * '@core/i18n' with these bound helpers in place of the plain ones. The area
 * comes from the file path by the same rule the extractor uses, so a key is
 * looked up in the catalog file it was extracted to.
 */

import type { ReactNode } from 'react';
import { renderTrans, type TransProps } from './Trans';
import { translateIn, type Params } from './runtime';

const helpers = new Map<string, { t: (text: string, params?: Params) => string; Trans: (props: TransProps) => ReactNode }>();

export function areaHelpers(area: string) {
  let bound = helpers.get(area);
  if (!bound) {
    const Trans = (props: TransProps) => renderTrans(area, props);
    Object.defineProperty(Trans, 'name', { value: 'Trans' });
    bound = { t: (text, params) => translateIn(area, text, params), Trans };
    helpers.set(area, bound);
  }
  return bound;
}
