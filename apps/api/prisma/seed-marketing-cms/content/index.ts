/**
 * Everything the seed imports, in the order it is applied.
 * Industry files are one per slug so the Phase 4 writers (W3, W4) can
 * extend them without touching each other.
 */

import type { SeedEntry } from '../lib/types';
import i_agri from './industries/agri';
import i_appliances from './industries/appliances';
import i_autoparts from './industries/autoparts';
import i_bakery from './industries/bakery';
import i_bookstore from './industries/bookstore';
import i_carpet from './industries/carpet';
import i_clinic from './industries/clinic';
import i_cosmetics from './industries/cosmetics';
import i_dairy from './industries/dairy';
import i_electronics from './industries/electronics';
import i_florist from './industries/florist';
import i_furniture from './industries/furniture';
import i_gaming from './industries/gaming';
import i_garments from './industries/garments';
import i_gym from './industries/gym';
import i_hardware from './industries/hardware';
import i_hotel from './industries/hotel';
import i_jewelry from './industries/jewelry';
import i_kiryana from './industries/kiryana';
import i_meat from './industries/meat';
import i_mobileShop from './industries/mobile-shop';
import i_optical from './industries/optical';
import i_petshop from './industries/petshop';
import i_pharmacy from './industries/pharmacy';
import i_restaurant from './industries/restaurant';
import i_retail from './industries/retail';
import i_salon from './industries/salon';
import i_servicesBiz from './industries/services-biz';
import i_shoe from './industries/shoe';
import i_sports from './industries/sports';
import i_toystore from './industries/toystore';
import { cities } from './cities';
import { glossary } from './glossary';
import { changelogEntries } from './changelog';
import { compare } from './compare';
import { blogCategories, blogPosts } from './blog';
import { mainPageEntries, mainPageFaqs } from './main-pages';
import { pageEntries } from './pages';
import { faqs as libraryFaqs } from './faqs';
import { exportedEntries } from './exported';
import { urEntries, urFaqs } from './ur';
import { toolEntries, toolsFaqs } from './tools';
import { templateEntries, templatesFaqs } from './templates';
import { compliance, complianceFaqList } from './compliance';
import { bestOf, bestOfFaqList } from './bestof';
import { alternatives, alternativeFaqList } from './alternatives';
import { guides, guideFaqList } from './guides';
import { cityIndustry } from './city-industry';
import { helpEntries, helpFaqList } from './help';
import { romanEntries, romanFaqList } from './roman';

/** Shared FAQ library plus the main pages' own FAQs. */
export const faqs = [...libraryFaqs, ...mainPageFaqs, ...urFaqs, ...toolsFaqs, ...templatesFaqs, ...complianceFaqList, ...bestOfFaqList, ...alternativeFaqList, ...guideFaqList, ...romanFaqList, ...helpFaqList];
export { settings } from './settings';
export { menus } from './menus';
export { redirects, redirectsNeedingOwner } from './redirects';
export { droppedItems } from './dropped';

const industries: SeedEntry[] = [
  i_agri,
  i_appliances,
  i_autoparts,
  i_bakery,
  i_bookstore,
  i_carpet,
  i_clinic,
  i_cosmetics,
  i_dairy,
  i_electronics,
  i_florist,
  i_furniture,
  i_gaming,
  i_garments,
  i_gym,
  i_hardware,
  i_hotel,
  i_jewelry,
  i_kiryana,
  i_meat,
  i_mobileShop,
  i_optical,
  i_petshop,
  i_pharmacy,
  i_restaurant,
  i_retail,
  i_salon,
  i_servicesBiz,
  i_shoe,
  i_sports,
  i_toystore,
];

/**
 * Entries in apply order: categories before posts, so TAG relations resolve on
 * the same run. Exported admin entries (developer docs) come last, parents first.
 */
export const entries: SeedEntry[] = [...industries, ...cities, ...glossary, ...compare, ...blogCategories, ...blogPosts, ...mainPageEntries, ...changelogEntries, ...pageEntries, ...exportedEntries, ...urEntries, ...toolEntries, ...templateEntries, ...compliance, ...bestOf, ...alternatives, ...guides, ...romanEntries, ...helpEntries, ...cityIndustry];
