/**
 * Pieces reused across fixtures: CTAs as the public API returns them (the
 * `signup` and `demo` keywords already resolved), FAQs copied from the
 * fact-checked seed (apps/api/prisma/seed-marketing-cms/content/faqs), and
 * cards for real industry slugs from the industry seed.
 */
import type { Cta, PublicFaq } from '@/lib/cms/contract/cms-contract';
import { card } from './factory';

export const SIGNUP: Cta = { label: 'Start free trial', href: 'https://app.nafaa.pk/register', variant: 'primary', trackAs: 'hero_signup' };
export const DEMO: Cta = { label: 'Book a demo', href: '/demo', variant: 'secondary', trackAs: 'hero_demo' };

export const SEED_FAQS = {
  devices: {
    id: 'fixture__faq-devices',
    topic: 'getting-started',
    question: 'Do I need a computer to use Nafaa?',
    answer:
      'No. Nafaa runs in a web browser, so the phone, tablet or computer you already have will do. A barcode scanner and a receipt printer can be added later but are not required to start. The counter also keeps working without internet and sends the sales to your account when the connection returns.',
  },
  offline: {
    id: 'fixture__faq-offline',
    topic: 'getting-started',
    question: 'Does Nafaa work without internet?',
    answer:
      'Yes, the counter keeps billing when the internet drops. Sales made offline are saved on the device and sent to your account automatically when the connection comes back, and you can see the sales still waiting to be sent. Reports and other branches see those sales once they have synced.',
  },
  pricing: {
    id: 'fixture__faq-pricing',
    topic: 'pricing',
    question: 'How much does Nafaa cost?',
    answer:
      'Paid plans start at {{price:min.monthly}} a month. The pricing page lists every plan with its price and limits, taken straight from our plan settings, so it is always current. You can start with the free trial first, and no credit card is needed to sign up.',
  },
  khata: {
    id: 'fixture__faq-khata',
    topic: 'khata',
    question: 'Can Nafaa send udhaar reminders on WhatsApp?',
    answer:
      "Yes. The khata keeps each customer's udhaar, payments and balances brought over from the old register. From the khata you send a customer a WhatsApp reminder with their balance in one tap. Reminders go one by one from your own WhatsApp, and the wording gets firmer as the udhaar gets older.",
  },
} satisfies Record<string, PublicFaq>;

export const INDUSTRY_CARDS = {
  kiryana: card({ type: 'INDUSTRY', path: '/industries/kiryana', title: 'Kiryana & Grocery Store', shortName: 'Kiryana', icon: 'store', color: '#065f46', group: 'retail', summary: 'Barcode counter, piece, dozen and carton units, and a digital khata with WhatsApp reminders.' }),
  pharmacy: card({ type: 'INDUSTRY', path: '/industries/pharmacy', title: 'Pharmacy & Medical Store', shortName: 'Pharmacy', icon: 'pill', color: '#166534', group: 'health', summary: 'Batch and expiry tracking, prescriptions and the doctors whose prescriptions you fill.' }),
  restaurant: card({ type: 'INDUSTRY', path: '/industries/restaurant', title: 'Restaurant & Cafe', shortName: 'Restaurant', icon: 'utensils-crossed', color: '#9a3412', group: 'food', summary: 'KOT per station, a kitchen display and add-ons priced on the bill.' }),
  mobile: card({ type: 'INDUSTRY', path: '/industries/mobile-shop', title: 'Mobile Phone Shop', shortName: 'Mobile shop', icon: 'smartphone', color: '#1d4ed8', group: 'retail', summary: 'PTA status per IMEI, used phones and trade-ins, and repair job cards.' }),
  bakery: card({ type: 'INDUSTRY', path: '/industries/bakery', title: 'Bakery & Sweets', shortName: 'Bakery', icon: 'cake-slice', color: '#be185d', group: 'food' }),
  garments: card({ type: 'INDUSTRY', path: '/industries/garments', title: 'Garments & Boutique', shortName: 'Garments', icon: 'shirt', color: '#db2777', group: 'retail' }),
};

/** Placeholder marker used wherever a real fact or source still has to be written. */
export const SAMPLE = 'Sample text.';
