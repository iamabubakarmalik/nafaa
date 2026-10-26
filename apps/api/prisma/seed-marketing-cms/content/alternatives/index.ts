/**
 * Alternative pages (/alternatives/{slug}): what to use instead of Excel, a
 * paper khata register or an installed desktop POS. One file per page under
 * `pages/`, built by `_alternative.ts`.
 */

import type { SeedEntry, SeedFaq } from '../../lib/types';
import { alternativeFaqs, alternativePage, type AlternativeSpec } from './_alternative';
import desktopPos from './pages/desktop-pos-alternative';
import excel from './pages/excel-alternative';
import paperKhata from './pages/paper-khata-register';

/** Display order. */
const PAGES: AlternativeSpec[] = [paperKhata, excel, desktopPos];

export const alternatives: SeedEntry[] = PAGES.map(alternativePage);
export const alternativeFaqList: SeedFaq[] = PAGES.flatMap(alternativeFaqs);
