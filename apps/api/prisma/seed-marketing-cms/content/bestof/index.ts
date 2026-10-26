/**
 * Best-of pages (/best/{slug}): buyer's guides that compare Nafaa with other
 * products fairly. One file per page under `pages/`, built by `_bestof.ts`.
 */

import type { SeedEntry, SeedFaq } from '../../lib/types';
import { bestOfFaqs, bestOfPage, type BestOfSpec } from './_bestof';
import inventory from './pages/inventory-software-pakistan';
import khata from './pages/khata-apps-compared';
import pos from './pages/pos-software-pakistan';

/** Display order. */
const PAGES: BestOfSpec[] = [pos, inventory, khata];

export const bestOf: SeedEntry[] = PAGES.map(bestOfPage);
export const bestOfFaqList: SeedFaq[] = PAGES.flatMap(bestOfFaqs);
