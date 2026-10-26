/**
 * Compare pages. One file per page under `pages/`; the shared shape and
 * builder are in `_compare.ts`.
 *
 * The first four slugs come from apps/marketing compare.ts (URL continuity);
 * the vendor comparisons after them were added on 26 Oct 2026. Every
 * competitor cell from the old page was dropped (none had a dated source)
 * and rewritten from the competitor's own site, read on the date in
 * `_compare.ts`. COMPARE needs a fact-check stamp to publish, so the pages
 * stay unpublished until the owner verifies the facts listed in needsOwner.
 */

import type { SeedEntry } from '../../lib/types';
import { comparePage, type CompareSpec } from './_compare';
import cornpos from './pages/nafaa-vs-cornpos';
import digikhata from './pages/nafaa-vs-digikhata';
import excel from './pages/nafaa-vs-excel';
import lightspeed from './pages/nafaa-vs-lightspeed';
import loyverse from './pages/nafaa-vs-loyverse';
import odoo from './pages/nafaa-vs-odoo';
import oscar from './pages/nafaa-vs-oscar-pos';
import paperRegister from './pages/nafaa-vs-paper-register';
import quickbooks from './pages/nafaa-vs-quickbooks';
import tally from './pages/nafaa-vs-tally';
import udhaarBook from './pages/nafaa-vs-udhaar-book';
import zohoInventory from './pages/nafaa-vs-zoho-inventory';

/** Display order. */
const PAGES: CompareSpec[] = [
  tally,
  excel,
  quickbooks,
  paperRegister,
  digikhata,
  udhaarBook,
  loyverse,
  oscar,
  cornpos,
  odoo,
  zohoInventory,
  lightspeed,
];

export const compare: SeedEntry[] = PAGES.map(comparePage);
