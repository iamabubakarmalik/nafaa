/**
 * Pages owned by the home/header/footer work (D1): home, FAQ hub, contact
 * and demo; plus the legal pages carried over from the old site.
 */
import type { SeedEntry } from '../../lib/types';
import { contact, demo } from './contact';
import { faqHub } from './faq';
import { home } from './home';
import { legalPages } from './legal';

export const pageEntries: SeedEntry[] = [home, faqHub, contact, demo, ...legalPages];
