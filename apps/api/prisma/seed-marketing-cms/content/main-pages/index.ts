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

export { mainPageFaqs } from './faqs';

export const mainPageEntries: SeedEntry[] = [...products, ...solutions, ...services, ...mainPages, ...hubs];
