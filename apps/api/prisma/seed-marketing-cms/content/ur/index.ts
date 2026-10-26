/**
 * Urdu (ur) entries and FAQs. Each file translates one English entry with
 * the same slug, blocks and media, and carries its own Urdu FAQs (the
 * English FAQ keys are not reused, so each page's own FAQs count once).
 * Urdu pages are served at /ur/... once settings `site.locales` lists "ur".
 */
import type { SeedEntry, SeedFaq } from '../../lib/types';
import * as i_kiryana from './industries/kiryana';
import * as i_retail from './industries/retail';
import * as i_bakery from './industries/bakery';
import * as i_restaurant from './industries/restaurant';
import * as i_pharmacy from './industries/pharmacy';
import * as i_garments from './industries/garments';
import * as i_mobileShop from './industries/mobile-shop';
import * as i_agri from './industries/agri';
import * as i_appliances from './industries/appliances';
import * as i_autoparts from './industries/autoparts';
import * as i_bookstore from './industries/bookstore';
import * as i_carpet from './industries/carpet';
import * as i_clinic from './industries/clinic';
import * as i_cosmetics from './industries/cosmetics';
import * as i_dairy from './industries/dairy';
import * as i_electronics from './industries/electronics';
import * as i_florist from './industries/florist';
import * as i_furniture from './industries/furniture';
import * as i_gaming from './industries/gaming';
import * as i_gym from './industries/gym';
import * as i_hardware from './industries/hardware';
import * as i_hotel from './industries/hotel';
import * as i_jewelry from './industries/jewelry';
import * as i_meat from './industries/meat';
import * as i_optical from './industries/optical';
import * as i_petshop from './industries/petshop';
import * as i_salon from './industries/salon';
import * as i_servicesBiz from './industries/services-biz';
import * as i_shoe from './industries/shoe';
import * as i_sports from './industries/sports';
import * as i_toystore from './industries/toystore';
import * as c_lahore from './cities/lahore';
import * as c_bahawalpur from './cities/bahawalpur';
import * as c_faisalabad from './cities/faisalabad';
import * as c_gujranwala from './cities/gujranwala';
import * as c_hyderabad from './cities/hyderabad';
import * as c_islamabad from './cities/islamabad';
import * as c_karachi from './cities/karachi';
import * as c_multan from './cities/multan';
import * as c_peshawar from './cities/peshawar';
import * as c_quetta from './cities/quetta';
import * as c_rawalpindi from './cities/rawalpindi';
import * as c_sialkot from './cities/sialkot';
import * as p_aiAssistant from './products/ai-assistant';
import * as p_fbr from './products/fbr';
import * as p_inventory from './products/inventory';
import * as p_khata from './products/khata';
import * as p_loyalty from './products/loyalty';
import * as p_multiShop from './products/multi-shop';
import * as p_offlinePos from './products/offline-pos';
import * as p_onlineStore from './products/online-store';
import * as p_payments from './products/payments';
import * as p_pos from './products/pos';
import * as p_purchasing from './products/purchasing';
import * as p_reports from './products/reports';
import * as p_staff from './products/staff';
import * as p_whatsappSms from './products/whatsapp-sms';
import * as s_ecommerce from './solutions/ecommerce';
import * as s_enterprise from './solutions/enterprise';
import * as s_manufacturing from './solutions/manufacturing';
import * as s_restaurants from './solutions/restaurants';
import * as s_retailChains from './solutions/retail-chains';
import * as s_singleShop from './solutions/single-shop';
import * as s_wholesaleDistribution from './solutions/wholesale-distribution';
import * as v_customSoftware from './services/custom-software';
import * as v_dataMigration from './services/data-migration';
import * as v_fbrIntegrationSetup from './services/fbr-integration-setup';
import * as v_hardware from './services/hardware';
import * as v_mobileApps from './services/mobile-apps';
import * as v_onlineStoreSetup from './services/online-store-setup';
import * as v_training from './services/training';
import * as v_websites from './services/websites';
import * as pg_home from './pages/home';
import * as pg_faq from './pages/faq';
import * as pg_contact from './pages/contact';
import * as pg_demo from './pages/demo';
import * as pg_pricing from './pages/pricing';
import * as pg_product from './pages/product';
import * as pg_solutions from './pages/solutions';
import * as pg_services from './pages/services';
import * as pg_industries from './pages/industries';
import * as pg_integrations from './pages/integrations';
import * as pg_marketplace from './pages/marketplace';
import * as pg_roadmap from './pages/roadmap';

const modules: { entry: SeedEntry; faqs: SeedFaq[] }[] = [
  i_kiryana,
  i_retail,
  i_bakery,
  i_restaurant,
  i_pharmacy,
  i_garments,
  i_mobileShop,
  i_agri,
  i_appliances,
  i_autoparts,
  i_bookstore,
  i_carpet,
  i_clinic,
  i_cosmetics,
  i_dairy,
  i_electronics,
  i_florist,
  i_furniture,
  i_gaming,
  i_gym,
  i_hardware,
  i_hotel,
  i_jewelry,
  i_meat,
  i_optical,
  i_petshop,
  i_salon,
  i_servicesBiz,
  i_shoe,
  i_sports,
  i_toystore,
  c_lahore,
  c_bahawalpur,
  c_faisalabad,
  c_gujranwala,
  c_hyderabad,
  c_islamabad,
  c_karachi,
  c_multan,
  c_peshawar,
  c_quetta,
  c_rawalpindi,
  c_sialkot,
  p_aiAssistant,
  p_fbr,
  p_inventory,
  p_khata,
  p_loyalty,
  p_multiShop,
  p_offlinePos,
  p_onlineStore,
  p_payments,
  p_pos,
  p_purchasing,
  p_reports,
  p_staff,
  p_whatsappSms,
  s_ecommerce,
  s_enterprise,
  s_manufacturing,
  s_restaurants,
  s_retailChains,
  s_singleShop,
  s_wholesaleDistribution,
  v_customSoftware,
  v_dataMigration,
  v_fbrIntegrationSetup,
  v_hardware,
  v_mobileApps,
  v_onlineStoreSetup,
  v_training,
  v_websites,
  pg_home,
  pg_faq,
  pg_contact,
  pg_demo,
  pg_pricing,
  pg_product,
  pg_solutions,
  pg_services,
  pg_industries,
  pg_integrations,
  pg_marketplace,
  pg_roadmap,
];

export const urEntries: SeedEntry[] = modules.map((m) => m.entry);
export const urFaqs: SeedFaq[] = modules.flatMap((m) => m.faqs);
