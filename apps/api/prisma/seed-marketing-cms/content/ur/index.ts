/**
 * Urdu (ur) entries and FAQs. Each file translates one English entry with
 * the same slug, blocks and media, and carries its own Urdu FAQs (the
 * English FAQ keys are not reused, so each page's own FAQs count once).
 * Urdu pages are served at /ur/... once settings `site.locales` lists "ur".
 */
import type { SeedEntry, SeedFaq } from '../../lib/types';
import * as home from './pages/home';
import * as contact from './pages/contact';
import * as demo from './pages/demo';
import * as faq from './pages/faq';
import * as kiryana from './industries/kiryana';
import * as retail from './industries/retail';
import * as bakery from './industries/bakery';
import * as restaurant from './industries/restaurant';
import * as pharmacy from './industries/pharmacy';
import * as garments from './industries/garments';
import * as mobileShop from './industries/mobile-shop';
import * as lahore from './cities/lahore';

const modules: { entry: SeedEntry; faqs: SeedFaq[] }[] = [kiryana, retail, bakery, restaurant, pharmacy, garments, mobileShop, lahore, home, faq, contact, demo];

export const urEntries: SeedEntry[] = modules.map((m) => m.entry);
export const urFaqs: SeedFaq[] = modules.flatMap((m) => m.faqs);
