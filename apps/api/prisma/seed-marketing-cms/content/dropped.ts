/**
 * Source items from apps/marketing that were not imported at all, with the
 * reason. Items that were imported but trimmed list their drops on the entry
 * itself (`dropped`). The runner prints both in the drop report.
 */

import type { DroppedItem } from '../lib/types';

const D = 'apps/marketing/src/lib/data';

export const droppedItems: DroppedItem[] = [
  { origin: `${D}/glossary.ts#aeo`, what: 'Glossary term "AEO (Answer Engine Optimization)"', why: 'Marketing jargon, not shop vocabulary (ARCH 12).' },
  { origin: `${D}/glossary.ts#geo-seo`, what: 'Glossary term "GEO (Generative Engine Optimization)"', why: 'Marketing jargon, not shop vocabulary (ARCH 12).' },
  { origin: `${D}/testimonials.ts`, what: 'All testimonials', why: 'No recorded consent. Real customers are added in the admin with consent (CmsCustomer).' },
  { origin: `${D}/case-studies.ts`, what: 'All case studies', why: 'Unverified; CASE_STUDY needs CmsCustomer consent.' },
  { origin: `${D}/stats.ts`, what: 'Site stats', why: 'Invented counts; numbers come only from API-computed metrics.' },
  { origin: `${D}/plans.ts`, what: 'Plans and prices (Rs 2,500 / 5,500 / 15,000)', why: 'Prices come from the Plan table only.' },
  { origin: `${D}/blog.ts`, what: '8 old blog posts', why: 'Content dropped; the slugs become 301s (content/redirects.ts).' },
  { origin: `${D}/blog/types.ts#authors`, what: 'Authors Fatima Khan, Ahmed Malik, Hassan Raza, Zara Ahmed, Bilal Sheikh', why: 'Fake personas. Authors will be real PERSON entries (O4).' },
  { origin: `${D}/blog/types.ts#case-study`, what: 'Blog category "Success stories"', why: 'No real, consented stories to list.' },
  { origin: `${D}/industry-content.ts#*.keyMetrics`, what: 'Key metrics on the 7 deep industry pages (+42% revenue, 95% recovery, ...)', why: 'No measurement behind any of them.' },
  { origin: `${D}/industry-content.ts#*.testimonialIds`, what: 'Testimonial links on industry pages', why: 'No consent on record.' },
  { origin: `${D}/industry-content.ts#*.integrationSlugs`, what: 'Integration links (JazzCash, Easypaisa, Raast, WhatsApp Business, Foodpanda, FBR)', why: 'Integrations are a W2 area; only verified ones become INTEGRATION entries.' },
  { origin: `${D}/industry-content.ts#bakery.faqs[1]`, what: 'FAQ "Does it work with Foodpanda for delivery?"', why: 'Foodpanda integration not confirmed by the owner.' },
  { origin: `${D}/industry-content.ts#restaurant.faqs[0]`, what: 'FAQ "Does it work with Foodpanda?"', why: 'Foodpanda integration not confirmed by the owner.' },
  { origin: `${D}/industry-content.ts#kiryana.faqs[1]`, what: 'FAQ "What if I do not know how to type in English?"', why: 'Answer claimed full Urdu screens and voice input; not found in the app.' },
  { origin: `${D}/industry-content.ts#mobile-shop.faqs[1]`, what: 'FAQ "Can it handle PTA compliance?"', why: 'Answer claimed automatic tax calculation; the app records PTA status only (IMEI FAQ covers it).' },
  { origin: `${D}/industry-content.ts#salon.faqs[0]`, what: 'FAQ "How does online appointment booking work?"', why: 'Customer self-booking with SMS not found.' },
  { origin: `${D}/industry-content.ts#*.pains/solutions/workflowSteps`, what: 'Pains, solution cards and workflow steps of the 7 deep pages', why: 'Rewritten as verified feature cards; the deep copy is Phase 4 work (W3) from real app flows.' },
  { origin: `${D}/content-defaults.ts`, what: 'Boilerplate capabilities and FAQs', why: 'Generic, repeated on every page (ARCH 12).' },
  { origin: `${D}/cities.ts#*.activeShops`, what: 'Active shop counts per city', why: 'Invented.' },
];
