/**
 * Site menus (PLAN 2.3). Seeded only when a menu does not exist yet; the D1
 * redesign script saves them over the starter menus on a local CMS.
 *
 * How the site renders them (apps/site/src/components/layout/MegaMenu.tsx):
 * - A top-level item with children opens a mega panel. Its own url becomes
 *   the "overview" link at the foot of the panel.
 * - Children that have children render as columns (group heading + links).
 *   Children without children that sit next to columns render in the panel's
 *   side rail as highlighted cards.
 * - A description that starts with "Coming soon:" shows a "Coming soon" badge
 *   (owner rule: unbuilt features are never shown as live).
 *
 * Industries use `auto` lists per industry group, so new industry pages
 * appear without editing the menu. Paths follow PLAN 2.2; pages that are not
 * published yet are listed in the D1 report.
 */

import type { SeedMenu } from '../lib/types';

export const menus: SeedMenu[] = [
  {
    key: 'header',
    title: 'Header',
    items: [
      {
        id: 'products',
        kind: 'url',
        label: 'Products',
        url: '/product',
        children: [
          {
            id: 'p-sell',
            kind: 'group',
            label: 'Sell',
            children: [
              { id: 'p-pos', kind: 'url', label: 'POS & billing', url: '/product/pos', icon: 'scan-barcode', description: 'Fast counter with barcode, units and receipts' },
              { id: 'p-payments', kind: 'url', label: 'Payments', url: '/product/payments', icon: 'wallet', description: 'Cash, card, JazzCash, Easypaisa and QR' },
              { id: 'p-store', kind: 'url', label: 'Online store', url: '/product/online-store', icon: 'shopping-bag', description: 'Website, Shopify and WooCommerce orders' },
              { id: 'p-bazaar', kind: 'url', label: 'Nafaa Bazaar', url: '/marketplace', icon: 'store', description: 'Sell on the Nafaa marketplace' },
              { id: 'p-offline', kind: 'url', label: 'Works offline', url: '/product/offline-pos', icon: 'wifi-off', description: 'Keep billing when the internet drops' },
            ],
          },
          {
            id: 'p-manage',
            kind: 'group',
            label: 'Manage',
            children: [
              { id: 'p-inventory', kind: 'url', label: 'Inventory', url: '/product/inventory', icon: 'boxes', description: 'Stock in every unit, transfers and alerts' },
              { id: 'p-purchasing', kind: 'url', label: 'Purchasing', url: '/product/purchasing', icon: 'clipboard-list', description: 'Suppliers, purchase bills and payables' },
              { id: 'p-khata', kind: 'url', label: 'Digital khata', url: '/product/khata', icon: 'notebook-pen', description: 'Udhaar with WhatsApp reminders' },
              { id: 'p-staff', kind: 'url', label: 'Staff & payroll', url: '/product/staff', icon: 'users', description: 'Roles, attendance, commission, payroll' },
              { id: 'p-branches', kind: 'url', label: 'Multi-branch', url: '/product/multi-shop', icon: 'building-2', description: 'Every branch in one account' },
            ],
          },
          {
            id: 'p-grow',
            kind: 'group',
            label: 'Grow & comply',
            children: [
              { id: 'p-reports', kind: 'url', label: 'Reports', url: '/product/reports', icon: 'chart-column', description: 'Profit, P&L, stock and day book' },
              { id: 'p-fbr', kind: 'url', label: 'Tax invoicing', url: '/product/fbr', icon: 'receipt', description: 'Optional FBR/PRA integration' },
              { id: 'p-whatsapp', kind: 'url', label: 'WhatsApp & SMS', url: '/product/whatsapp-sms', icon: 'message-circle', description: 'Receipts and reminders to customers' },
              { id: 'p-loyalty', kind: 'url', label: 'Loyalty', url: '/product/loyalty', icon: 'award', description: 'Points and tiers for regular customers' },
              { id: 'p-ai', kind: 'url', label: 'AI assistant', url: '/product/ai-assistant', icon: 'sparkles', description: 'New: ask your business in plain words' },
            ],
          },
          { id: 'p-feature-pricing', kind: 'url', label: 'Plans and pricing', url: '/pricing', icon: 'tag', description: '7-day free trial. Every module in one account.' },
        ],
      },
      {
        id: 'solutions',
        kind: 'url',
        label: 'Solutions',
        url: '/solutions',
        children: [
          {
            id: 's-type',
            kind: 'group',
            label: 'By business type',
            children: [
              { id: 's-retail', kind: 'url', label: 'Retail & shops', url: '/solutions/single-shop', icon: 'store', description: 'One counter, fast billing, stock and khata' },
              { id: 's-chains', kind: 'url', label: 'Retail chains', url: '/solutions/retail-chains', icon: 'building-2', description: 'Branches, transfers and one view of all' },
              { id: 's-ecommerce', kind: 'url', label: 'E-commerce sellers', url: '/solutions/ecommerce', icon: 'shopping-bag', description: 'Online store + marketplace, one stock' },
              { id: 's-restaurants', kind: 'url', label: 'Restaurants & cafés', url: '/solutions/restaurants', icon: 'utensils-crossed', description: 'Tables, KOT, delivery and split bills' },
            ],
          },
          {
            id: 's-type-2',
            kind: 'group',
            label: 'Growing companies',
            children: [
              { id: 's-wholesale', kind: 'url', label: 'Wholesale & distribution', url: '/solutions/wholesale-distribution', icon: 'truck', description: 'Carton prices, credit limits, suppliers' },
              { id: 's-manufacturing', kind: 'url', label: 'Manufacturing', url: '/solutions/manufacturing', icon: 'factory', description: 'Stock and purchasing, built around your process' },
              { id: 's-services', kind: 'url', label: 'Service businesses', url: '/industries/services-biz', icon: 'briefcase', description: 'Bookings, memberships and commission' },
              { id: 's-enterprise', kind: 'url', label: 'Enterprise', url: '/solutions/enterprise', icon: 'landmark', description: 'Roles, API, accounting export, onboarding' },
            ],
          },
          { id: 's-feature-demo', kind: 'url', label: 'Book a demo', url: '/demo', icon: 'calendar-check', description: 'See Nafaa set up for your kind of business.' },
          { id: 's-feature-custom', kind: 'url', label: 'Need it custom?', url: '/services/custom-software', icon: 'code-xml', description: 'Our team builds the parts your business needs.' },
        ],
      },
      {
        id: 'industries',
        kind: 'url',
        label: 'Industries',
        url: '/industries',
        children: [
          { id: 'i-retail', kind: 'group', label: 'Retail shops', children: [{ id: 'i-retail-auto', kind: 'auto', auto: { entryType: 'INDUSTRY', group: 'retail', limit: 6, sort: 'order' } }] },
          { id: 'i-food', kind: 'group', label: 'Food & beverage', children: [{ id: 'i-food-auto', kind: 'auto', auto: { entryType: 'INDUSTRY', group: 'food', limit: 6, sort: 'order' } }] },
          { id: 'i-health', kind: 'group', label: 'Health & medical', children: [{ id: 'i-health-auto', kind: 'auto', auto: { entryType: 'INDUSTRY', group: 'health', limit: 6, sort: 'order' } }] },
          { id: 'i-service', kind: 'group', label: 'Services', children: [{ id: 'i-service-auto', kind: 'auto', auto: { entryType: 'INDUSTRY', group: 'service', limit: 6, sort: 'order' } }] },
          { id: 'i-specialty', kind: 'group', label: 'Specialty trade', children: [{ id: 'i-specialty-auto', kind: 'auto', auto: { entryType: 'INDUSTRY', group: 'specialty', limit: 6, sort: 'order' } }] },
          { id: 'i-lifestyle', kind: 'group', label: 'Lifestyle & leisure', children: [{ id: 'i-lifestyle-auto', kind: 'auto', auto: { entryType: 'INDUSTRY', group: 'lifestyle', limit: 6, sort: 'order' } }] },
          { id: 'i-feature-any', kind: 'url', label: 'Don’t see your business?', url: '/contact', icon: 'message-circle', description: 'The standard setup works for any shop. Tell us what your trade needs.' },
          { id: 'i-feature-solutions', kind: 'url', label: 'Solutions by business type', url: '/solutions', icon: 'layout-grid', description: 'Retail chains, e-commerce, wholesale, restaurants and enterprise.' },
        ],
      },
      {
        id: 'marketplace',
        kind: 'url',
        label: 'Marketplace',
        url: '/marketplace',
        children: [
          {
            id: 'm-sell',
            kind: 'group',
            label: 'Sell online',
            children: [
              { id: 'm-bazaar', kind: 'url', label: 'Sell on Nafaa Bazaar', url: '/marketplace', icon: 'store', description: 'List your products on the Nafaa marketplace and reach new buyers' },
              { id: 'm-store', kind: 'url', label: 'Your own online store', url: '/product/online-store', icon: 'shopping-bag', description: 'Website orders land on the counter' },
              { id: 'm-channels', kind: 'url', label: 'Shopify & WooCommerce', url: '/integrations', icon: 'plug', description: 'Bring store orders into the same stock' },
            ],
          },
          {
            id: 'm-ship',
            kind: 'group',
            label: 'Ship every order',
            children: [
              { id: 'm-pipeline', kind: 'url', label: 'Order pipeline', url: '/solutions/ecommerce', icon: 'list-checks', description: 'Confirm, prepare, dispatch and deliver from one screen' },
              { id: 'm-couriers', kind: 'url', label: 'Couriers & COD', url: '/solutions/ecommerce', icon: 'truck', description: 'TCS, Leopards, PostEx, Trax or your own rider' },
              { id: 'm-paylinks', kind: 'url', label: 'Payment links', url: '/product/payments', icon: 'link', description: 'Send a link with the order and get paid first' },
            ],
          },
          { id: 'm-ecommerce', kind: 'url', label: 'For e-commerce sellers', url: '/solutions/ecommerce', icon: 'package-check', description: 'Website, Bazaar and counter sales from one stock, with a risk check on cash-on-delivery customers.' },
        ],
      },
      {
        id: 'services',
        kind: 'url',
        label: 'Services',
        url: '/services',
        children: [
          {
            id: 'sv-build',
            kind: 'group',
            label: 'We build',
            children: [
              { id: 'sv-custom', kind: 'url', label: 'Custom software', url: '/services/custom-software', icon: 'code-xml', description: 'ERP modules, portals and internal tools' },
              { id: 'sv-web', kind: 'url', label: 'Websites', url: '/services/websites', icon: 'globe', description: 'Company sites, designed and hosted' },
              { id: 'sv-store', kind: 'url', label: 'E-commerce stores', url: '/services/online-store-setup', icon: 'shopping-cart', description: 'Online stores tied to your stock' },
              { id: 'sv-apps', kind: 'url', label: 'Mobile apps', url: '/services/mobile-apps', icon: 'smartphone', description: 'Android and iOS apps' },
            ],
          },
          {
            id: 'sv-setup',
            kind: 'group',
            label: 'We set up',
            children: [
              { id: 'sv-migration', kind: 'url', label: 'Data migration', url: '/services/data-migration', icon: 'database', description: 'From Excel or old software' },
              { id: 'sv-fbr', kind: 'url', label: 'Tax integration setup', url: '/services/fbr-integration-setup', icon: 'shield-check', description: 'Tax integration done for you' },
              { id: 'sv-hardware', kind: 'url', label: 'Hardware', url: '/services/hardware', icon: 'printer', description: 'Printers, scanners and cash drawers' },
              { id: 'sv-training', kind: 'url', label: 'Training', url: '/services/training', icon: 'graduation-cap', description: 'On-site and online for your team' },
            ],
          },
          { id: 'sv-feature-quote', kind: 'url', label: 'Quote lein', url: '/services#quote', icon: 'send', description: 'Worldwide. Tell us your idea; we reply with a plan and a price.' },
        ],
      },
      {
        id: 'resources',
        kind: 'group',
        label: 'Resources',
        children: [
          {
            id: 'r-learn',
            kind: 'group',
            label: 'Learn',
            children: [
              { id: 'r-blog', kind: 'url', label: 'Blog', url: '/blog', icon: 'book-open', description: 'Guides for running a business' },
              { id: 'r-guides', kind: 'url', label: 'Guides', url: '/guides', icon: 'notebook-pen', description: 'Step-by-step playbooks' },
              { id: 'r-glossary', kind: 'url', label: 'Glossary', url: '/glossary', icon: 'list', description: 'Business and tax terms explained' },
              { id: 'r-tools', kind: 'url', label: 'Free tools', url: '/tools', icon: 'calculator', description: 'GST, margin and invoice tools' },
            ],
          },
          {
            id: 'r-compare',
            kind: 'group',
            label: 'Compare & comply',
            children: [
              { id: 'r-compare-all', kind: 'url', label: 'Compare', url: '/compare', icon: 'arrow-left-right', description: 'Nafaa next to other tools' },
              { id: 'r-compliance', kind: 'url', label: 'Tax compliance', url: '/compliance', icon: 'landmark', description: 'FBR, PRA, SRB and KPRA rules' },
              { id: 'r-cities', kind: 'url', label: 'POS by city', url: '/pos-software', icon: 'map-pin', description: 'Local support and tax facts' },
            ],
          },
          {
            id: 'r-company',
            kind: 'group',
            label: 'Company',
            children: [
              { id: 'r-roadmap', kind: 'url', label: 'Roadmap', url: '/roadmap', icon: 'flag', description: 'What we are building next' },
              { id: 'r-changelog', kind: 'url', label: 'Changelog', url: '/changelog', icon: 'git-branch', description: 'What shipped recently' },
              { id: 'r-faq', kind: 'url', label: 'FAQ', url: '/faq', icon: 'circle-question-mark', description: 'Answers to common questions' },
              { id: 'r-contact', kind: 'url', label: 'Contact', url: '/contact', icon: 'phone', description: 'Sales, support and partnerships' },
            ],
          },
        ],
      },
      {
        id: 'developers',
        kind: 'url',
        label: 'Developers',
        url: '/developers',
        children: [
          { id: 'd-api', kind: 'url', label: 'API reference', url: '/developers', icon: 'braces', description: 'Products, stock, customers, sales and orders over REST' },
          { id: 'd-webhooks', kind: 'url', label: 'Webhooks', url: '/developers/webhooks', icon: 'webhook', description: 'Get events when sales and orders change' },
          { id: 'd-integrations', kind: 'url', label: 'Integrations', url: '/integrations', icon: 'plug-zap', description: 'Accounting, payments, tax and stores' },
          { id: 'd-changelog', kind: 'url', label: 'Changelog', url: '/changelog', icon: 'git-branch', description: 'API and product updates' },
        ],
      },
      { id: 'pricing', kind: 'url', label: 'Pricing', url: '/pricing' },
    ],
  },
  {
    key: 'footer',
    title: 'Footer',
    items: [
      {
        id: 'f-product',
        kind: 'group',
        label: 'Product',
        children: [
          { id: 'f-pos', kind: 'url', label: 'POS & billing', url: '/product/pos' },
          { id: 'f-inventory', kind: 'url', label: 'Inventory', url: '/product/inventory' },
          { id: 'f-khata', kind: 'url', label: 'Digital khata', url: '/product/khata' },
          { id: 'f-fbr', kind: 'url', label: 'Tax invoicing', url: '/product/fbr' },
          { id: 'f-store', kind: 'url', label: 'Online store', url: '/product/online-store' },
          { id: 'f-bazaar', kind: 'url', label: 'Nafaa Bazaar', url: '/marketplace' },
          { id: 'f-staff', kind: 'url', label: 'Staff & payroll', url: '/product/staff' },
          { id: 'f-reports', kind: 'url', label: 'Reports', url: '/product/reports' },
          { id: 'f-ai', kind: 'url', label: 'AI assistant', url: '/product/ai-assistant' },
          { id: 'f-pricing', kind: 'url', label: 'Pricing', url: '/pricing' },
        ],
      },
      {
        id: 'f-solutions',
        kind: 'group',
        label: 'Solutions',
        children: [
          { id: 'f-s-retail', kind: 'url', label: 'Retail & shops', url: '/solutions/single-shop' },
          { id: 'f-s-chains', kind: 'url', label: 'Retail chains', url: '/solutions/retail-chains' },
          { id: 'f-s-ecommerce', kind: 'url', label: 'E-commerce sellers', url: '/solutions/ecommerce' },
          { id: 'f-s-restaurants', kind: 'url', label: 'Restaurants & cafés', url: '/solutions/restaurants' },
          { id: 'f-s-wholesale', kind: 'url', label: 'Wholesale', url: '/solutions/wholesale-distribution' },
          { id: 'f-s-manufacturing', kind: 'url', label: 'Manufacturing', url: '/solutions/manufacturing' },
          { id: 'f-s-enterprise', kind: 'url', label: 'Enterprise', url: '/solutions/enterprise' },
        ],
      },
      {
        id: 'f-industries',
        kind: 'group',
        label: 'Industries',
        children: [
          { id: 'f-industries-auto', kind: 'auto', auto: { entryType: 'INDUSTRY', featured: true, limit: 9, sort: 'order' } },
          { id: 'f-industries-all', kind: 'url', label: 'All industries', url: '/industries' },
        ],
      },
      {
        id: 'f-services',
        kind: 'group',
        label: 'Services',
        children: [
          { id: 'f-sv-custom', kind: 'url', label: 'Custom software', url: '/services/custom-software' },
          { id: 'f-sv-web', kind: 'url', label: 'Websites', url: '/services/websites' },
          { id: 'f-sv-store', kind: 'url', label: 'E-commerce stores', url: '/services/online-store-setup' },
          { id: 'f-sv-apps', kind: 'url', label: 'Mobile apps', url: '/services/mobile-apps' },
          { id: 'f-sv-migration', kind: 'url', label: 'Data migration', url: '/services/data-migration' },
          { id: 'f-sv-hardware', kind: 'url', label: 'Hardware', url: '/services/hardware' },
          { id: 'f-sv-quote', kind: 'url', label: 'Quote lein', url: '/services#quote' },
        ],
      },
      {
        id: 'f-resources',
        kind: 'group',
        label: 'Resources',
        children: [
          { id: 'f-blog', kind: 'url', label: 'Blog', url: '/blog' },
          { id: 'f-guides', kind: 'url', label: 'Guides', url: '/guides' },
          { id: 'f-glossary', kind: 'url', label: 'Glossary', url: '/glossary' },
          { id: 'f-tools', kind: 'url', label: 'Free tools', url: '/tools' },
          { id: 'f-compare', kind: 'url', label: 'Compare', url: '/compare' },
          { id: 'f-compliance', kind: 'url', label: 'Tax compliance', url: '/compliance' },
          { id: 'f-developers', kind: 'url', label: 'Developers', url: '/developers' },
        ],
      },
      { id: 'f-cities', kind: 'group', label: 'Cities', children: [{ id: 'f-cities-auto', kind: 'auto', auto: { entryType: 'CITY', limit: 12, sort: 'order' } }] },
      {
        id: 'f-company',
        kind: 'group',
        label: 'Company',
        children: [
          { id: 'f-about', kind: 'url', label: 'About', url: '/about' },
          { id: 'f-roadmap', kind: 'url', label: 'Roadmap', url: '/roadmap' },
          { id: 'f-changelog', kind: 'url', label: 'Changelog', url: '/changelog' },
          { id: 'f-faq', kind: 'url', label: 'FAQ', url: '/faq' },
          { id: 'f-demo', kind: 'url', label: 'Book a demo', url: '/demo' },
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
