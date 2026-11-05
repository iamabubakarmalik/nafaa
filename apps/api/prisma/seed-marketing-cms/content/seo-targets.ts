/**
 * Buyer-keyword SEO targets for the money pages. Applied after the entries
 * are assembled: sets seoTitle (60 characters or fewer) and focusKeyword so
 * every trade page names its trade plus "software in Pakistan".
 */

import type { SeedEntry } from '../lib/types';

/** [seoTitle, focusKeyword] by "TYPE:slug". */
export const SEO_TARGETS: Record<string, [string, string]> = {
  'INDUSTRY:agri': ['Agri Store Software in Pakistan: Farmer Khata & POS', 'agri store software pakistan'],
  'INDUSTRY:appliances': ['Appliance Shop Software in Pakistan: POS & Service', 'appliance shop software pakistan'],
  'INDUSTRY:autoparts': ['Auto Parts Shop Software in Pakistan: POS & Workshop', 'auto parts shop software pakistan'],
  'INDUSTRY:bakery': ['Bakery Software in Pakistan: POS, Cake Orders & Stock', 'bakery software pakistan'],
  'INDUSTRY:bookstore': ['Bookstore Software in Pakistan: POS & School Lists', 'bookstore software pakistan'],
  'INDUSTRY:carpet': ['Carpet Shop Software in Pakistan: Roll Stock & POS', 'carpet shop software pakistan'],
  'INDUSTRY:clinic': ['Clinic Software in Pakistan: Appointments & Billing', 'clinic software pakistan'],
  'INDUSTRY:cosmetics': ['Cosmetics Shop Software in Pakistan: POS & Expiry', 'cosmetics shop software pakistan'],
  'INDUSTRY:dairy': ['Dairy Shop Software in Pakistan: Delivery & Billing', 'dairy shop software pakistan'],
  'INDUSTRY:electronics': ['Electronics Shop Software Pakistan: Serial & Warranty', 'electronics shop software pakistan'],
  'INDUSTRY:florist': ['Florist Software in Pakistan: Orders, POS & Delivery', 'florist software pakistan'],
  'INDUSTRY:furniture': ['Furniture Shop Software in Pakistan: POS & Orders', 'furniture shop software pakistan'],
  'INDUSTRY:gaming': ['Gaming Zone Software in Pakistan: Timer & POS', 'gaming zone software pakistan'],
  'INDUSTRY:garments': ['Garments Shop Software in Pakistan: POS & Sizes', 'garments shop software pakistan'],
  'INDUSTRY:gym': ['Gym Management Software in Pakistan: Fees & Check-in', 'gym management software pakistan'],
  'INDUSTRY:hotel': ['Hotel Software in Pakistan: Bookings, Rooms & Billing', 'hotel software pakistan'],
  'INDUSTRY:jewelry': ['Jewellery Shop Software in Pakistan: Gold Rate & POS', 'jewellery shop software pakistan'],
  'INDUSTRY:kiryana': ['Kiryana Store Software in Pakistan: POS, Khata & Stock', 'kiryana store software pakistan'],
  'INDUSTRY:meat': ['Meat Shop Software in Pakistan: Daily Rates & POS', 'meat shop software pakistan'],
  'INDUSTRY:mobile-shop': ['Mobile Shop Software in Pakistan: IMEI, PTA & Qist', 'mobile shop software pakistan'],
  'INDUSTRY:optical': ['Optical Shop Software in Pakistan: Eye Tests & POS', 'optical shop software pakistan'],
  'INDUSTRY:petshop': ['Pet Shop Software in Pakistan: POS & Grooming', 'pet shop software pakistan'],
  'INDUSTRY:pharmacy': ['Pharmacy Software in Pakistan: Batch, Expiry & POS', 'pharmacy software pakistan'],
  'INDUSTRY:restaurant': ['Restaurant POS Pakistan: Tables, KOT & Billing', 'restaurant pos pakistan'],
  'INDUSTRY:retail': ['Retail POS Software in Pakistan: Billing, Stock & Khata', 'retail pos software pakistan'],
  'INDUSTRY:salon': ['Salon Software in Pakistan: Bookings & Billing', 'salon software pakistan'],
  'INDUSTRY:services-biz': ['Service Business Software in Pakistan: Jobs & Billing', 'service business software pakistan'],
  'INDUSTRY:shoe': ['Shoe Shop Software in Pakistan: Sizes, POS & Stock', 'shoe shop software pakistan'],
  'INDUSTRY:sports': ['Sports Shop Software in Pakistan: POS & Team Orders', 'sports shop software pakistan'],
  'INDUSTRY:toystore': ['Toy Store Software in Pakistan: POS & Gift Packs', 'toy store software pakistan'],
  'PRODUCT:pos': ['POS & Billing Software in Pakistan: Works Offline', 'billing software pakistan'],
  'PRODUCT:inventory': ['Inventory Management Software in Pakistan: Stock Control', 'inventory management software pakistan'],
  'SERVICE:custom-software': ['Custom Software Development in Pakistan for Business', 'custom software development pakistan'],
};

export function applySeoTargets(all: SeedEntry[]): SeedEntry[] {
  return all.map((e) => {
    if (e.locale === 'ur') return e;
    const t = SEO_TARGETS[`${e.type}:${e.slug}`];
    if (!t) return e;
    return { ...e, seoTitle: t[0], focusKeyword: t[1] };
  });
}
