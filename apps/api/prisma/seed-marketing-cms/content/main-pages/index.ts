/**
 * Main marketing pages (D2): products, solutions, services, pricing and the
 * Nafaa Bazaar page, plus the FAQs they use.
 */

import type { SeedEntry } from '../../lib/types';
import { mainPages } from './pages';
import { products } from './products';
import { services } from './services';
import { solutions } from './solutions';
import { hubs } from './hubs';
import { moreHubFaqs, moreHubs } from './hubs-more';
import { mainPageFaqs as baseFaqs } from './faqs';

export const mainPageFaqs = [...baseFaqs, ...moreHubFaqs];

export const mainPageEntries: SeedEntry[] = [...products, ...solutions, ...services, ...mainPages, ...hubs, ...moreHubs];
