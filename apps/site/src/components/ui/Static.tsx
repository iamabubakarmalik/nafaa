/**
 * <Static>: a part of a server-rendered page written as static HTML inside
 * its outer element (lib/static-html `staticElement`). The page HTML stays
 * the same; the RSC payload carries the content as one string instead of a
 * JSON tree, and React has nothing to hydrate inside it. Links inside become
 * plain anchors. A part that holds a client island (forms, tabs, toggles)
 * cannot be static and renders as usual.
 *
 * A plain (not async) server component, so components inside it may use
 * useId while they are written out.
 */
import type { ReactElement } from 'react';
import { staticElement } from '@/lib/static-html';

export function Static({ children }: { children: ReactElement }): ReactElement {
  return staticElement(children);
}
