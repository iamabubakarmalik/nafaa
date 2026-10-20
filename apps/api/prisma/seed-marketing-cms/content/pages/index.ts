/**
 * Pages owned by the home/header/footer work (D1): home, FAQ hub, contact
 * and demo.
 */
import type { SeedEntry } from '../../lib/types';
import { contact, demo } from './contact';
import { faqHub } from './faq';
import { home } from './home';

export const pageEntries: SeedEntry[] = [home, faqHub, contact, demo];
