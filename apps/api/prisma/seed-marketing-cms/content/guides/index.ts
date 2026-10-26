/**
 * Pillar guides (/guides/{slug}): long practical guides that link out to the
 * blog posts, glossary terms and product pages for each chapter. One file
 * per guide under `pages/`, built by `_guide.ts`.
 */

import type { SeedEntry, SeedFaq } from '../../lib/types';
import { guideFaqs, guidePage, type GuideSpec } from './_guide';
import inventory from './pages/inventory-management-small-business';
import udhaar from './pages/managing-udhaar-and-khata';
import retail from './pages/running-a-retail-shop-pakistan';
import online from './pages/start-selling-online-pakistan';

/** Display order. */
const PAGES: GuideSpec[] = [retail, udhaar, inventory, online];

export const guides: SeedEntry[] = PAGES.map(guidePage);
export const guideFaqList: SeedFaq[] = PAGES.flatMap(guideFaqs);
