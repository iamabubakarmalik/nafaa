/**
 * Starter menus (PLAN 2.3), seeded only when a menu does not exist yet.
 * They use `auto` and `url` items so they need no entry ids; editors swap in
 * entry items in the admin once pages are published.
 */

import type { SeedMenu } from '../lib/types';

export const menus: SeedMenu[] = [
  {
    key: 'header',
    title: 'Header',
    items: [
      { id: 'product', kind: 'url', label: 'Product', url: '/product' },
      {
        id: 'industries',
        kind: 'group',
        label: 'Industries',
        children: [
          { id: 'industries-top', kind: 'auto', auto: { entryType: 'INDUSTRY', featured: true, limit: 8, sort: 'order' } },
          { id: 'industries-all', kind: 'url', label: 'All industries', url: '/industries' },
        ],
      },
      { id: 'pricing', kind: 'url', label: 'Pricing', url: '/pricing' },
      {
        id: 'resources',
        kind: 'group',
        label: 'Resources',
        children: [
          { id: 'res-blog', kind: 'url', label: 'Blog', url: '/blog' },
          { id: 'res-glossary', kind: 'url', label: 'Glossary', url: '/glossary' },
          { id: 'res-compare', kind: 'url', label: 'Compare', url: '/compare' },
          { id: 'res-cities', kind: 'url', label: 'POS by city', url: '/pos-software' },
        ],
      },
      { id: 'contact', kind: 'url', label: 'Contact', url: '/contact' },
    ],
  },
  {
    key: 'footer',
    title: 'Footer',
    items: [
      { id: 'f-industries', kind: 'group', label: 'Industries', children: [{ id: 'f-industries-auto', kind: 'auto', auto: { entryType: 'INDUSTRY', limit: 12, sort: 'order' } }] },
      { id: 'f-cities', kind: 'group', label: 'Cities', children: [{ id: 'f-cities-auto', kind: 'auto', auto: { entryType: 'CITY', limit: 12, sort: 'order' } }] },
      {
        id: 'f-resources',
        kind: 'group',
        label: 'Resources',
        children: [
          { id: 'f-blog', kind: 'url', label: 'Blog', url: '/blog' },
          { id: 'f-glossary', kind: 'url', label: 'Glossary', url: '/glossary' },
          { id: 'f-compare', kind: 'url', label: 'Compare', url: '/compare' },
        ],
      },
      {
        id: 'f-company',
        kind: 'group',
        label: 'Company',
        children: [
          { id: 'f-pricing', kind: 'url', label: 'Pricing', url: '/pricing' },
          { id: 'f-contact', kind: 'url', label: 'Contact', url: '/contact' },
        ],
      },
    ],
  },
  {
    key: 'legal',
    title: 'Legal',
    items: [
      { id: 'privacy', kind: 'url', label: 'Privacy', url: '/privacy' },
      { id: 'terms', kind: 'url', label: 'Terms', url: '/terms' },
      { id: 'refund', kind: 'url', label: 'Refund policy', url: '/refund' },
    ],
  },
];
