/**
 * /contact and /demo (PAGE, template "contact").
 *
 * The contact template shows WhatsApp, email and phone from settings above
 * the blocks, so the copy here never repeats a number or an address. Forms
 * post to the existing public endpoints (contact-form, demo-booking); every
 * submission becomes a MarketingLead in the admin.
 */
import type { SeedEntry } from '../../lib/types';

const evidence = [
  'apps/api/src/admin-marketing/public-tracking/public-tracking.controller.ts',
  'apps/site/src/components/islands/LeadForm.tsx',
  'apps/api/prisma/seed-marketing-cms/content/settings.ts',
];

export const contact: SeedEntry = {
  type: 'PAGE',
  slug: 'contact',
  title: 'Contact Nafaa',
  summary:
    'Talk to the Nafaa team on WhatsApp, by email or by phone, or send a message with the form. We help with plans, setup, FBR and PRA invoicing, moving from another system and custom software projects.',
  data: { template: 'contact' },
  seoTitle: 'Contact Nafaa: WhatsApp, Email and Sales',
  seoDescription:
    'Reach the Nafaa team on WhatsApp, email or phone. Questions about plans, setup, FBR & PRA invoicing, data migration or a custom software project.',
  focusKeyword: 'contact nafaa',
  blocks: [
    {
      id: 'contact-hero',
      type: 'hero',
      layout: 'centered',
      eyebrow: 'Contact',
      heading: 'Talk to the people who build Nafaa',
      sub: 'Questions about plans, setup, tax invoicing or a project of your own: message us on WhatsApp for the fastest reply, or write to us below.',
      primaryCta: { label: 'Message on WhatsApp', href: 'whatsapp', variant: 'primary', trackAs: 'contact-hero:whatsapp' },
      secondaryCta: { label: 'Book a demo', href: 'demo', variant: 'secondary', trackAs: 'contact-hero:demo' },
      badges: ['English, Urdu & Roman Urdu', 'Help on WhatsApp'],
    },
    {
      id: 'contact-topics',
      type: 'featuresGrid',
      heading: 'What we can help with',
      columns: 3,
      items: [
        { icon: 'tag', title: 'Plans and pricing', body: 'Which plan fits your products, users and branches.', href: '/pricing' },
        { icon: 'shield-check', title: 'FBR & PRA invoicing', body: 'Connecting FBR, PRA, SRB or KPRA and printing the fiscal QR code.', href: '/product/fbr' },
        { icon: 'database', title: 'Moving your data', body: 'Products, customers and khata from Excel or another system.', href: '/services/data-migration' },
        { icon: 'building-2', title: 'Many branches', body: 'Setup, roles and training for chains and larger teams.', href: '/solutions/enterprise' },
        { icon: 'code-xml', title: 'Custom software', body: 'Websites, online stores, mobile apps and tools built for you, worldwide.', href: '/services/custom-software' },
        { icon: 'circle-question-mark', title: 'Help with the app', body: 'Already using Nafaa? The help center in the app, or WhatsApp.' },
      ],
    },
    {
      id: 'contact-form',
      type: 'leadForm',
      form: 'contact',
      formType: 'GENERAL',
      heading: 'Send us a message',
      intro: 'Tell us about your business and what you need. We reply by email or WhatsApp, usually the same working day.',
      successMessage: 'Thank you. Your message has reached the Nafaa team and we will get back to you soon. Shukriya!',
      whatsapp: true,
    },
  ] as SeedEntry['blocks'],
  origin: 'new (D1, 20 Oct 2026)',
  evidence,
  factCheck: { checkedOn: '2026-10-20', note: 'Form fields and endpoints checked in apps/site and apps/api; contact details come from settings only.' },
  dropped: ['Office address: not shown until the owner adds a real office in settings.'],
  needsOwner: ['"Usually the same working day" reply time: confirm the team can keep it.'],
};

export const demo: SeedEntry = {
  type: 'PAGE',
  slug: 'demo',
  title: 'Book a demo',
  summary:
    'Book a free live demo of Nafaa. Someone from our team shows you the counter, stock, khata, FBR and PRA invoicing, online orders and reports set up for your type of business, and answers your questions.',
  data: { template: 'contact' },
  seoTitle: 'Book a Free Nafaa Demo: POS & Business Software',
  seoDescription:
    'See Nafaa set up for your business: POS, stock, khata, FBR & PRA invoicing, online store and reports. Pick a day and time; the demo is free.',
  focusKeyword: 'pos software demo',
  blocks: [
    {
      id: 'demo-hero',
      type: 'hero',
      layout: 'centered',
      eyebrow: 'Free demo',
      heading: 'See Nafaa running your kind of business',
      sub: 'Pick a day and a time. We show you the screens your business would use, with your questions answered live, in English, Urdu or Roman Urdu.',
      primaryCta: { label: 'Pick a time', href: '#demo-form', variant: 'primary', trackAs: 'demo-hero:form' },
      secondaryCta: { label: 'Start 7-day free trial', href: 'signup', variant: 'secondary', trackAs: 'demo-hero:trial' },
      badges: ['Free', 'Online or on WhatsApp video', 'No card needed'],
    },
    {
      id: 'demo-steps',
      type: 'steps',
      heading: 'How the demo works',
      items: [
        { title: 'Book a time', body: 'Fill in the form with the day and time that suit you.' },
        { title: 'We confirm', body: 'Our team confirms on WhatsApp or by email and asks what you sell.' },
        { title: 'See it live', body: 'We walk through billing, stock, khata, tax invoices and reports for your business.' },
        { title: 'Start when ready', body: 'Begin the 7-day free trial; we can help bring your product list across.' },
      ],
    },
    {
      id: 'demo-form',
      anchor: 'demo-form',
      type: 'leadForm',
      form: 'demo',
      heading: 'Book your demo',
      intro: 'Tell us when to call and a little about your business: what you sell, how many branches and whether you need FBR or PRA invoicing.',
      successMessage: 'Your demo request is in. We will confirm the time with you on WhatsApp or by email. Shukriya!',
      whatsapp: true,
    },
  ] as SeedEntry['blocks'],
  origin: 'new (D1, 20 Oct 2026)',
  evidence,
  factCheck: { checkedOn: '2026-10-20', note: 'Demo form fields (date, time slot, city) checked in apps/site LeadForm; bookings land in admin demo-bookings.' },
  dropped: [],
  needsOwner: ['Demo channel: "online or on WhatsApp video" is the assumed format; confirm, or add in-person demos per city.'],
};
