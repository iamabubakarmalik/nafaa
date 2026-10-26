/**
 * Help center entries in apply order: the root (/help), the topic pages
 * (/help/{topic}) and the task articles (/help/{topic}/{article}). Parents
 * come first so the seed can give each child its parent id. Articles live in
 * `articles/<topic>.ts`, built by `_help.ts`.
 */

import { withIds } from '../../lib/blocks';
import type { SeedEntry, SeedFaq } from '../../lib/types';
import {
  CHECKED_ON,
  ORIGIN,
  TOPICS,
  helpArticle,
  helpFaqs,
  helpTopic,
  note,
  prose,
  type HelpArticle,
  type HelpTopic,
  type HelpTopicSpec,
} from './_help';
import byBusinessType from './articles/by-business-type';
import gettingStarted from './articles/getting-started';
import grow from './articles/grow';
import khataAndCustomers from './articles/khata-and-customers';
import posCounter from './articles/pos-counter';
import productsAndStock from './articles/products-and-stock';
import reportsAndCash from './articles/reports-and-cash';

const ARTICLES: Record<HelpTopic, HelpArticle[]> = {
  'getting-started': gettingStarted,
  'products-and-stock': productsAndStock,
  'pos-counter': posCounter,
  'khata-and-customers': khataAndCustomers,
  'reports-and-cash': reportsAndCash,
  grow,
  'by-business-type': byBusinessType,
};

const TOPIC_SPECS: Record<HelpTopic, Omit<HelpTopicSpec, 'slug'>> = {
  'getting-started': {
    title: 'Getting started',
    summary: 'Create your Nafaa account, set up the shop, add your staff with their own logins and roles, and get the counter running on the computer, tablet or phone you already have.',
    intro:
      'Start here if you are new to Nafaa. These articles take you from sign-up to a shop that is ready to bill: the account and the 7-day trial, the shop details that print on every bill, staff logins with roles, and the devices the counter runs on.',
    related: ['PRODUCT:pos', 'PRODUCT:staff', 'PAGE:pricing'],
    evidence: ['apps/web/src/modules/auth', 'apps/web/src/modules/onboarding'],
  },
  'products-and-stock': {
    title: 'Products and stock',
    summary: 'Add products one by one or from Excel, sell in units and packs, print barcode labels, keep stock correct with adjustments and transfers, and buy from suppliers with purchase orders and goods received notes.',
    intro:
      'Everything about the items you sell and the stock behind them: adding products, units and packs, bulk import and bulk edit, barcodes, low stock alerts, stock adjustments, transfers between branches, and purchasing from suppliers.',
    related: ['PRODUCT:inventory', 'PRODUCT:purchasing', 'GUIDE:inventory-management-small-business'],
    evidence: ['apps/web/src/modules/inventory', 'apps/web/src/modules/purchasing'],
  },
  'pos-counter': {
    title: 'Counter and POS',
    summary: 'Make bills fast at the counter: keyboard shortcuts, layouts, hold and recall, discounts, split payments, returns with the refund PIN, billing without internet, and receipt printers.',
    intro:
      'How the POS counter works day to day. Each article covers one task at the till, with the keys and buttons exactly as they appear on the counter screen.',
    related: ['PRODUCT:pos', 'PRODUCT:offline-pos', 'PRODUCT:payments'],
    evidence: ['apps/web/src/modules/pos'],
  },
  'khata-and-customers': {
    title: 'Khata and customers',
    summary: 'Keep customer udhaar in the digital khata: add customers, carry over opening balances from the old register, sell on credit, record payments, send WhatsApp reminders and set credit limits.',
    intro:
      'The digital khata replaces the paper udhaar register. These articles cover the customer record, opening balances, credit sales at the counter, receiving payments, reminders on WhatsApp and the credit limit that stops a balance from growing too far.',
    related: ['PRODUCT:khata', 'GUIDE:managing-udhaar-and-khata', 'TEMPLATE:khata-udhaar-register'],
    evidence: ['apps/web/src/modules/customers'],
  },
  'reports-and-cash': {
    title: 'Reports and cash',
    summary: 'Read the day’s sales, see profit by product and for the whole business, and close the cash drawer at the end of the day with the expected amount and the difference.',
    intro:
      'The reports most shops open every day: the daily sales summary, profit reports and the cash closing that checks the galla against what the system expects.',
    related: ['PRODUCT:reports', 'TEMPLATE:daily-cash-closing-sheet', 'TOOL:profit-margin-calculator'],
    evidence: ['apps/web/src/modules/reports', 'apps/web/src/modules/finance'],
  },
  grow: {
    title: 'Branches, online and loyalty',
    summary: 'Run more than one branch from one account, take orders from an online store, reward regular customers with loyalty points, and ask the AI assistant about your business in plain words.',
    intro:
      'Tools for a growing business: more branches, an online store whose orders land in the same stock, loyalty points for regular customers, and the AI assistant.',
    related: ['PRODUCT:multi-shop', 'PRODUCT:online-store', 'PRODUCT:loyalty', 'PRODUCT:ai-assistant'],
    evidence: ['apps/web/src/modules/multi-branch', 'apps/web/src/modules/ai-assistant'],
  },
  'by-business-type': {
    title: 'By business type',
    summary: 'Tasks that belong to one kind of business: restaurant KOT and tables, pharmacy batches and expiry, mobile phone IMEI tracking, garments sizes and colours, bakery orders and salon bookings.',
    intro:
      'Nafaa switches on extra screens for your business type (Settings → Business type). These articles cover the most used ones. Everything in the other topics works for these businesses too.',
    related: ['PAGE:industries', 'INDUSTRY:restaurant', 'INDUSTRY:pharmacy', 'INDUSTRY:mobile-shop'],
    evidence: ['apps/web/src/industries'],
  },
};

const root: SeedEntry = {
  type: 'PAGE',
  slug: 'help',
  title: 'Nafaa Help Center',
  summary:
    'Step-by-step answers for running your business on Nafaa: setting up the shop, products and stock, billing at the counter, khata and udhaar, daily reports and cash closing, branches, the online store and the screens for your type of business.',
  data: { template: 'default' },
  seoDescription: 'How to do each task in Nafaa, step by step: shop setup, products and stock, POS billing, khata, reports, cash closing, branches and online orders.',
  focusKeyword: 'nafaa help',
  blocks: withIds('PAGE:help', [
    prose(
      [
        'Each article here covers one task, with the steps as they appear in the app. Button and menu names are quoted exactly as Nafaa shows them, so some are in Roman Urdu (for example **Din ka hisaab** is the day report).',
        '',
        'New to Nafaa? Start with [Getting started](/help/getting-started). Most shops then read [how to add a product](/help/products-and-stock/add-a-product), [how to make a bill](/help/pos-counter/make-a-bill) and [how to sell on udhaar](/help/khata-and-customers/udhaar-sale).',
      ].join('\n'),
    ),
    note(
      'Ask the in-app **Help center** (bottom of the sidebar), message us on WhatsApp, or [contact support](/contact). The [FAQ](/faq) answers questions about plans, payments and data.',
      'Can’t find your answer?',
    ),
    { type: 'relatedLinks', heading: 'Product pages', source: 'related', limit: 6 },
  ]),
  relations: [
    { ref: 'PRODUCT:pos', kind: 'RELATED' },
    { ref: 'PRODUCT:inventory', kind: 'RELATED' },
    { ref: 'PRODUCT:khata', kind: 'RELATED' },
    { ref: 'PRODUCT:reports', kind: 'RELATED' },
    { ref: 'PAGE:faq', kind: 'RELATED' },
    { ref: 'PAGE:guides', kind: 'RELATED' },
  ],
  sortOrder: 1,
  origin: ORIGIN,
  evidence: ['apps/web/src/modules/help/content.ts'],
  factCheck: { checkedOn: CHECKED_ON, note: 'Hub page; the articles carry the checked steps.' },
  dropped: [],
  needsOwner: ['content/redirects.ts still has /help → /faq. The redirect only applies when no entry exists at /help, so it is a safe fallback; remove it once the help center is published.'],
};

const topicEntries = TOPICS.map((slug, i) => helpTopic({ slug, ...TOPIC_SPECS[slug] }, i));
const articleEntries = TOPICS.flatMap((topic) => ARTICLES[topic].map((a, i) => helpArticle(topic, a, i)));

export const helpEntries: SeedEntry[] = [root, ...topicEntries, ...articleEntries];
export const helpFaqList: SeedFaq[] = TOPICS.flatMap((topic) => ARTICLES[topic].flatMap(helpFaqs));
