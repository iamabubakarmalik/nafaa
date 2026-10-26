/**
 * /faq (PAGE, template "hub"; the route renders templates/hub/FaqHub).
 * The page supplies the hero and a closing call to action; the questions are
 * every published FAQ, grouped by topic, so nothing is repeated here.
 */
import type { SeedEntry } from '../../lib/types';

export const faqHub: SeedEntry = {
  type: 'PAGE',
  slug: 'faq',
  relations: [
    { ref: 'PAGE:pricing', kind: 'RELATED' },
    { ref: 'PAGE:contact', kind: 'RELATED' },
    { ref: 'PAGE:demo', kind: 'RELATED' },
    { ref: 'PAGE:product', kind: 'RELATED' },
  ],
  title: 'Frequently asked questions',
  summary:
    'Answers about Nafaa: who it is for, devices, working offline, prices and the free trial, FBR and PRA invoicing, khata, online selling and the trade screens for each kind of business.',
  data: { template: 'hub' },
  seoTitle: 'Nafaa FAQ: POS, Khata, FBR, Offline Billing and Pricing',
  seoDescription:
    'Answers about Nafaa business software: devices, offline billing, prices and free trial, FBR & PRA invoicing, khata, online selling and trade screens.',
  focusKeyword: 'nafaa faq',
  blocks: [
    {
      id: 'faq-hero',
      type: 'hero',
      layout: 'centered',
      eyebrow: 'Help',
      heading: 'Questions, answered',
      sub: 'What people ask before they start with Nafaa, grouped by topic. Cannot find yours? Ask us on WhatsApp and a person will reply.',
      primaryCta: { label: 'Ask on WhatsApp', href: 'whatsapp', variant: 'primary', trackAs: 'faq-hero:whatsapp' },
      secondaryCta: { label: 'Book a demo', href: 'demo', variant: 'secondary', trackAs: 'faq-hero:demo' },
    },
    {
      id: 'faq-cta',
      type: 'cta',
      heading: 'Still have a question?',
      body: 'Try Nafaa free for 7 days, or talk to the team first.',
      primaryCta: { label: 'Start 7-day free trial', href: 'signup', variant: 'primary', trackAs: 'faq-closing:trial' },
      secondaryCta: { label: 'Contact us', href: '/contact', variant: 'secondary', trackAs: 'faq-closing:contact' },
    },
  ] as SeedEntry['blocks'],
  origin: 'new (D1, 20 Oct 2026)',
  evidence: ['apps/site/src/app/faq/page.tsx', 'apps/site/src/templates/hub/FaqHub.tsx'],
  factCheck: { checkedOn: '2026-10-20', note: 'The page holds no claims of its own; each FAQ carries its own source note.' },
  dropped: [],
  needsOwner: [],
};
