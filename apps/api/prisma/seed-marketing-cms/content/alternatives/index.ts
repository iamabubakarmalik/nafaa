/**
 * Alternative pages (/alternatives/{slug}): what to use instead of Excel, a
 * paper khata register, an installed desktop POS, DigiKhata, Udhaar Book,
 * Loyverse or Tally. One file per page under `pages/`, built by
 * `_alternative.ts`.
 */

import type { SeedEntry, SeedFaq } from '../../lib/types';
import { alternativeFaqs, alternativePage, type AlternativeSpec } from './_alternative';
import desktopPos from './pages/desktop-pos-alternative';
import digikhata from './pages/digikhata-alternative';
import excel from './pages/excel-alternative';
import loyverse from './pages/loyverse-alternative-pakistan';
import paperKhata from './pages/paper-khata-register';
import tally from './pages/tally-alternative';
import udhaarBook from './pages/udhaar-book-alternative';

/** Display order. */
const PAGES: AlternativeSpec[] = [paperKhata, excel, desktopPos, digikhata, udhaarBook, loyverse, tally];

export const alternatives: SeedEntry[] = PAGES.map(alternativePage);
export const alternativeFaqList: SeedFaq[] = PAGES.flatMap(alternativeFaqs);
