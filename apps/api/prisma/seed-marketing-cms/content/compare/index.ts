/**
 * Compare pages. One file per page under `pages/`; the shared shape and
 * builder are in `_compare.ts`.
 *
 * The four slugs come from apps/marketing compare.ts (URL continuity). Every
 * competitor cell from the old page was dropped (none had a dated source)
 * and rewritten from the competitor's own site, read on the date in
 * `_compare.ts`. COMPARE needs a fact-check stamp to publish, so the pages
 * stay unpublished until the owner verifies the facts listed in needsOwner.
 */

import type { SeedEntry } from '../../lib/types';
import { comparePage, type CompareSpec } from './_compare';
import excel from './pages/nafaa-vs-excel';
import paperRegister from './pages/nafaa-vs-paper-register';
import quickbooks from './pages/nafaa-vs-quickbooks';
import tally from './pages/nafaa-vs-tally';

/** Display order. */
const PAGES: CompareSpec[] = [tally, excel, quickbooks, paperRegister];

export const compare: SeedEntry[] = PAGES.map(comparePage);
