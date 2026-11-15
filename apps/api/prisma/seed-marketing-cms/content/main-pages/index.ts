/**
 * Main marketing pages (D2): products, solutions, services, pricing and the
 * Nafaa Market page, plus the FAQs they use.
 */

import type { SeedEntry } from '../../lib/types';
import { mainPages } from './pages';
import { products } from './products';
import { services } from './services';
import { solutions } from './solutions';
import { hubs } from './hubs';
import { moreHubFaqs, moreHubs } from './hubs-more';
import { mainPageFaqs as baseFaqs } from './faqs';
import { novFaqs, novPages } from './features-nov';

export const mainPageFaqs = [...baseFaqs, ...moreHubFaqs, ...novFaqs];

export const mainPageEntries: SeedEntry[] = [...products, ...solutions, ...services, ...mainPages, ...hubs, ...moreHubs, ...novPages];
