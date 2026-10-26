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
import * as pg_blog from './pages/blog';
import * as pg_glossary from './pages/glossary';
import * as pg_templates from './pages/templates';
import * as pg_tools from './pages/tools';
import * as t_barcodeGenerator from './tools/barcode-generator';
import * as t_breakEvenCalculator from './tools/break-even-calculator';
import * as t_discountCalculator from './tools/discount-calculator';
import * as t_foodCostCalculator from './tools/food-cost-calculator';
import * as t_gstCalculator from './tools/gst-calculator';
import * as t_khataAgeingCalculator from './tools/khata-ageing-calculator';
import * as t_profitMarginCalculator from './tools/profit-margin-calculator';
import * as t_receiptMaker from './tools/receipt-maker';
import * as t_reorderLevelCalculator from './tools/reorder-level-calculator';
import * as t_zakatCalculator from './tools/zakat-calculator';
import * as tp_dailyCashClosingSheet from './templates/daily-cash-closing-sheet';
import * as tp_khataUdhaarRegister from './templates/khata-udhaar-register';
import * as tp_priceListTemplate from './templates/price-list-template';
import * as tp_productImportTemplate from './templates/product-import-template';
import * as tp_purchaseOrderTemplate from './templates/purchase-order-template';
import * as tp_simpleInvoiceTemplate from './templates/simple-invoice-template';
import * as tp_stockTakeSheet from './templates/stock-take-sheet';
import * as bc_business from './blog-categories/business';
import * as bc_guides from './blog-categories/guides';
import * as bc_industry from './blog-categories/industry';
import * as b_cashVsCreditSales from './blog/cash-vs-credit-sales';
import * as b_dailyCashClosingRoutine from './blog/daily-cash-closing-routine';
import * as b_digitalKhataVsPaperLedger from './blog/digital-khata-vs-paper-ledger';
import * as b_digitalPaymentsJazzcashEasypaisaRaast from './blog/digital-payments-jazzcash-easypaisa-raast';
import * as b_howToCalculateProfitMargin from './blog/how-to-calculate-profit-margin';
import * as b_howToReduceUdhaar from './blog/how-to-reduce-udhaar';
import * as b_howToStartABakeryPakistan from './blog/how-to-start-a-bakery-pakistan';
import * as b_howToStartAPharmacyPakistan from './blog/how-to-start-a-pharmacy-pakistan';
import * as b_howToStartKiryanaStorePakistan from './blog/how-to-start-kiryana-store-pakistan';
import * as b_loadSheddingProofBilling from './blog/load-shedding-proof-billing';
import * as b_pricingStrategySmallShop from './blog/pricing-strategy-small-shop';
import * as b_ramadanEidRetailStrategy from './blog/ramadan-eid-retail-strategy';
import * as b_staffTheftPreventionCounter from './blog/staff-theft-prevention-counter';
import * as b_stockTakingGuide from './blog/stock-taking-guide';
import * as b_whatsappBusinessForShops from './blog/whatsapp-business-for-shops';
import * as g_barcode from './glossary/barcode';
import * as g_cashFlow from './glossary/cash-flow';
import * as g_cod from './glossary/cod';
import * as g_cogs from './glossary/cogs';
import * as g_deadStock from './glossary/dead-stock';
import * as g_discount from './glossary/discount';
import * as g_easypaisa from './glossary/easypaisa';
import * as g_expiryManagement from './glossary/expiry-management';
import * as g_fbrPos from './glossary/fbr-pos';
import * as g_fifo from './glossary/fifo';
import * as g_galla from './glossary/galla';
import * as g_grossMargin from './glossary/gross-margin';
import * as g_holdBill from './glossary/hold-bill';
import * as g_imei from './glossary/imei';
import * as g_invoice from './glossary/invoice';
import * as g_jazzcash from './glossary/jazzcash';
import * as g_khata from './glossary/khata';
import * as g_kot from './glossary/kot';
import * as g_loyaltyPoints from './glossary/loyalty-points';
import * as g_markup from './glossary/markup';
import * as g_mrp from './glossary/mrp';
import * as g_multiBranch from './glossary/multi-branch';
import * as g_netProfit from './glossary/net-profit';
import * as g_ntn from './glossary/ntn';
import * as g_pettyCash from './glossary/petty-cash';
import * as g_pos from './glossary/pos';
import * as g_profitAndLoss from './glossary/profit-and-loss';
import * as g_raast from './glossary/raast';
import * as g_receipt from './glossary/receipt';
import * as g_recipeCosting from './glossary/recipe-costing';
import * as g_refund from './glossary/refund';
import * as g_reorderLevel from './glossary/reorder-level';
import * as g_salesTax from './glossary/sales-tax';
import * as g_sku from './glossary/sku';
import * as g_splitPayment from './glossary/split-payment';
import * as g_stockTake from './glossary/stock-take';
import * as g_strn from './glossary/strn';
import * as g_udhaar from './glossary/udhaar';
import * as g_wholesalePrice from './glossary/wholesale-price';
import * as g_zReport from './glossary/z-report';

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
  pg_blog,
  pg_glossary,
  pg_templates,
  pg_tools,
  t_barcodeGenerator,
  t_breakEvenCalculator,
  t_discountCalculator,
  t_foodCostCalculator,
  t_gstCalculator,
  t_khataAgeingCalculator,
  t_profitMarginCalculator,
  t_receiptMaker,
  t_reorderLevelCalculator,
  t_zakatCalculator,
  tp_dailyCashClosingSheet,
  tp_khataUdhaarRegister,
  tp_priceListTemplate,
  tp_productImportTemplate,
  tp_purchaseOrderTemplate,
  tp_simpleInvoiceTemplate,
  tp_stockTakeSheet,
  bc_business,
  bc_guides,
  bc_industry,
  b_cashVsCreditSales,
  b_dailyCashClosingRoutine,
  b_digitalKhataVsPaperLedger,
  b_digitalPaymentsJazzcashEasypaisaRaast,
  b_howToCalculateProfitMargin,
  b_howToReduceUdhaar,
  b_howToStartABakeryPakistan,
  b_howToStartAPharmacyPakistan,
  b_howToStartKiryanaStorePakistan,
  b_loadSheddingProofBilling,
  b_pricingStrategySmallShop,
  b_ramadanEidRetailStrategy,
  b_staffTheftPreventionCounter,
  b_stockTakingGuide,
  b_whatsappBusinessForShops,
  g_barcode,
  g_cashFlow,
  g_cod,
  g_cogs,
  g_deadStock,
  g_discount,
  g_easypaisa,
  g_expiryManagement,
  g_fbrPos,
  g_fifo,
  g_galla,
  g_grossMargin,
  g_holdBill,
  g_imei,
  g_invoice,
  g_jazzcash,
  g_khata,
  g_kot,
  g_loyaltyPoints,
  g_markup,
  g_mrp,
  g_multiBranch,
  g_netProfit,
  g_ntn,
  g_pettyCash,
  g_pos,
  g_profitAndLoss,
  g_raast,
  g_receipt,
  g_recipeCosting,
  g_refund,
  g_reorderLevel,
  g_salesTax,
  g_sku,
  g_splitPayment,
  g_stockTake,
  g_strn,
  g_udhaar,
  g_wholesalePrice,
  g_zReport,
];

export const urEntries: SeedEntry[] = modules.map((m) => m.entry);
export const urFaqs: SeedFaq[] = modules.flatMap((m) => m.faqs);
