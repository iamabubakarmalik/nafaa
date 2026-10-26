/**
 * Compliance pages (/compliance/{slug}): one file per authority under
 * `pages/`, built by `_compliance.ts`. These are the pages where FBR, PRA,
 * SRB, KPRA and DRAP rules are explained in full; other pages link here.
 */

import type { SeedEntry, SeedFaq } from '../../lib/types';
import { complianceFaqs, compliancePage, type ComplianceSpec } from './_compliance';
import drap from './pages/drap-pharmacy';
import fbr from './pages/fbr-pos-integration';
import kpra from './pages/kpra-khyber-pakhtunkhwa';
import pra from './pages/pra-punjab';
import srb from './pages/srb-sindh';

/** Display order. */
const PAGES: ComplianceSpec[] = [fbr, pra, srb, kpra, drap];

export const compliance: SeedEntry[] = PAGES.map(compliancePage);
export const complianceFaqList: SeedFaq[] = PAGES.flatMap(complianceFaqs);
