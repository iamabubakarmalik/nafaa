/**
 * Plain names, areas and one-line explanations for background jobs, and a
 * reader for cron schedules. A job that is not listed here still shows, with
 * a name made from its code name.
 */

export type JobArea = 'Online store' | 'Marketing and ads' | 'Billing and tax' | 'Shops' | 'Marketplace' | 'Messages' | 'Website' | 'Platform';

interface JobInfo { label: string; area: JobArea; text: string }

const INFO: Record<string, JobInfo> = {
  'AccountingService.nightly': { label: 'Accounting sync', area: 'Billing and tax', text: 'Sends the day’s sales to connected accounting software.' },
  'AdminDeletionRequestsService.notifyDue': { label: 'Deletion request reminders', area: 'Platform', text: 'Tells admins about account deletion requests that are due. Never deletes anything.' },
  'AdRulesService.runAll': { label: 'Ad rules', area: 'Marketing and ads', text: 'Applies shops’ automatic rules to their Meta ads.' },
  'BillVoidService.sweep': { label: 'Voided bill settle', area: 'Shops', text: 'Settles stock and totals for restaurant bills that were voided.' },
  'CatalogWatchService.fresh': { label: 'New channel product check', area: 'Online store', text: 'Reads products from channels that were just connected.' },
  'CatalogWatchService.publishSweep': { label: 'Publish new products', area: 'Online store', text: 'Puts new Nafaa products on the shop’s website when auto-publish is on.' },
  'CatalogWatchService.sweep': { label: 'Channel product check', area: 'Online store', text: 'Reads each connected channel’s products to link and import them.' },
  'ChannelOpsService.pullAll': { label: 'Order pull', area: 'Online store', text: 'Fetches new online orders from every connected store.' },
  'CmsMediaService.purgeDeleted': { label: 'Website media clean-up', area: 'Website', text: 'Removes website images deleted more than 30 days ago.' },
  'CmsPublishingService.runScheduled': { label: 'Scheduled website posts', area: 'Website', text: 'Publishes website pages and posts at their scheduled time.' },
  'ConversionService.daily': { label: 'Automatic coupons', area: 'Online store', text: 'Makes coupon codes for shops that turned on automatic coupons.' },
  'CourierAccountsService.syncAll': { label: 'Courier tracking', area: 'Online store', text: 'Updates parcel status from connected courier accounts.' },
  'DailySummaryCronService.tick': { label: 'Day-end summary', area: 'Shops', text: 'Sends each shop its closing summary at the time it chose.' },
  'DarazService.stockAll': { label: 'Daraz stock push', area: 'Online store', text: 'Sends stock levels to Daraz.' },
  'DarazService.syncAll': { label: 'Daraz order sync', area: 'Online store', text: 'Fetches new Daraz orders.' },
  'DataRetentionService.purgeOldCustomerData': { label: 'Old customer data clean-up', area: 'Online store', text: 'Removes online customers’ personal data after the retention period.' },
  'FbrService.handleRetryQueue': { label: 'FBR invoice retry', area: 'Billing and tax', text: 'Sends invoices again that FBR did not accept the first time.' },
  'ForecastService.nightly': { label: 'Stock forecast', area: 'Shops', text: 'Works out how long stock will last and what to reorder.' },
  'IdempotencyService.cleanup': { label: 'Duplicate-guard clean-up', area: 'Platform', text: 'Clears stored request keys used to stop double sales.' },
  'IndexNowService.flush': { label: 'Search engine ping', area: 'Website', text: 'Tells search engines about changed website pages.' },
  'LoyaltyService.expireAll': { label: 'Loyalty point expiry', area: 'Shops', text: 'Expires customer loyalty points past their date.' },
  'MetaAdsService.pullAll': { label: 'Meta ads numbers', area: 'Marketing and ads', text: 'Fetches spend and results for shops’ Meta ads.' },
  'MetaCapiService.sweep': { label: 'Meta conversions', area: 'Marketing and ads', text: 'Sends sales events to Meta for ad tracking.' },
  'MetaCatalogService.daily': { label: 'Meta catalog full sync', area: 'Marketing and ads', text: 'Sends every product to the shop’s Facebook and Instagram catalog.' },
  'MetaCatalogService.sweep': { label: 'Meta catalog changes', area: 'Marketing and ads', text: 'Sends changed products to the Facebook and Instagram catalog.' },
  'MetaPublishService.tick': { label: 'Scheduled social posts', area: 'Marketing and ads', text: 'Publishes Facebook and Instagram posts at their time.' },
  'MetaService.healthCheck': { label: 'Meta connection check', area: 'Marketing and ads', text: 'Checks that each shop’s Meta connection still works.' },
  'MorningSummaryService.tick': { label: 'Nafaa AI morning summary', area: 'Shops', text: 'Prepares the morning business summary for shops that use it.' },
  'PaymentLinksService.sweep': { label: 'Payment link status', area: 'Online store', text: 'Checks whether customers paid their payment links.' },
  'PushDeliveryService.checkReceipts': { label: 'Push delivery check', area: 'Messages', text: 'Confirms mobile notifications reached phones and drops dead devices.' },
  'ReservationsService.sweep': { label: 'Expired reservations', area: 'Shops', text: 'Releases garment reservations that ran out.' },
  'SchedulerService.cancelUnpaidOrders': { label: 'Unpaid order cancel', area: 'Marketplace', text: 'Cancels marketplace orders left unpaid.' },
  'SchedulerService.closeAuctions': { label: 'Close auctions', area: 'Marketplace', text: 'Ends auctions whose time is up.' },
  'SchedulerService.dailyCleanup': { label: 'Daily clean-up', area: 'Platform', text: 'Removes expired sessions and old one-time codes.' },
  'SchedulerService.deactivateInactivePushTokens': { label: 'Old device clean-up', area: 'Messages', text: 'Stops sending notifications to phones not seen for a long time.' },
  'SchedulerService.expireBargains': { label: 'Expire bargains', area: 'Marketplace', text: 'Closes price offers nobody answered in time.' },
  'SchedulerService.finalizeGroupBuys': { label: 'Finish group buys', area: 'Marketplace', text: 'Completes or cancels group buys whose time is up.' },
  'SchedulerService.recomputeShopRatings': { label: 'Shop ratings', area: 'Marketplace', text: 'Recalculates each seller’s rating from reviews.' },
  'SchedulerService.remindReviews': { label: 'Review reminders', area: 'Marketplace', text: 'Asks buyers to review orders they received.' },
  'SchedulerService.startAuctions': { label: 'Start auctions', area: 'Marketplace', text: 'Opens auctions at their start time.' },
  'SchedulerService.syncIntegrations': { label: 'Integration sync', area: 'Online store', text: 'Runs due syncs for connected integrations.' },
  'SchedulerService.triggerCartRecovery': { label: 'Abandoned cart reminders', area: 'Marketplace', text: 'Reminds buyers about carts left for an hour.' },
  'ShopifyService.syncAll': { label: 'Shopify sync', area: 'Online store', text: 'Fetches Shopify orders and sends stock.' },
  'SocialService.sendReminders': { label: 'Social post reminders', area: 'Marketing and ads', text: 'Sends a notification when a planned social post is due.' },
  'StockPushService.sweep': { label: 'Stock push', area: 'Online store', text: 'Sends stock changes to every connected store within a minute.' },
  'SubscriptionCronService.dailyExpiryCheck': { label: 'Plan expiry check', area: 'Billing and tax', text: 'Ends expired plans and emails shops before their plan runs out.' },
  'TaxAuthorityService.sweep': { label: 'Tax authority retry', area: 'Billing and tax', text: 'Sends pending invoices to provincial tax systems.' },
  'TenantDigestsCronService.handleLowStockDigest': { label: 'Low stock email', area: 'Shops', text: 'Emails each shop the items running low.' },
  'TradeSyncService.sweep': { label: 'Wholesale network sync', area: 'Shops', text: 'Moves orders and stock between linked wholesale and retail shops.' },
  'WebhooksService.tick': { label: 'Developer webhooks', area: 'Platform', text: 'Delivers events to shops’ developer webhook links.' },
  'WhatsappService.syncPending': { label: 'WhatsApp message status', area: 'Messages', text: 'Updates delivery status of WhatsApp messages.' },
  'WooCommerceService.syncAll': { label: 'WooCommerce sync', area: 'Online store', text: 'Fetches WooCommerce orders and sends stock.' },
};

const words = (s: string) => s.replace(/Service$|CronService$/, '').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();

export function jobInfo(key: string): JobInfo {
  const known = INFO[key];
  if (known) return known;
  const [cls, method] = key.split('.');
  const label = `${words(cls)}: ${words(method ?? '')}`;
  return { label: label.charAt(0).toUpperCase() + label.slice(1), area: 'Platform', text: '' };
}

export const JOB_AREAS: JobArea[] = ['Online store', 'Shops', 'Billing and tax', 'Marketing and ads', 'Messages', 'Marketplace', 'Website', 'Platform'];

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const pad = (n: number) => String(n).padStart(2, '0');
const isNum = (s: string) => /^\d+$/.test(s);

/** Turns a cron schedule into words ("Every 5 minutes", "Daily at 9:00 AM"). Times without a zone run on server time (UTC) and are shown in Pakistan time. */
export function describeSchedule(expr: string, timeZone: string | null): string {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5 && parts.length !== 6) return expr;
  const [sec, min, hour, dom, mon, dow] = parts.length === 6 ? parts : ['0', ...parts];
  const step = (f: string) => (f === '*' ? 1 : /^\*\/(\d+)$/.test(f) ? Number(f.slice(2)) : /^0-23\/(\d+)$/.test(f) ? Number(f.split('/')[1]) : null);
  const everyDay = dom === '*' && mon === '*' && dow === '*';

  if (!everyDay && !(isNum(dow) && dom === '*' && mon === '*')) return expr;

  const sStep = step(sec);
  if (sStep && sStep > 1 && min === '*' && hour === '*') return `Every ${sStep} seconds`;
  if (sStep === 1 && min === '*' && hour === '*') return 'Every second';

  const mStep = step(min);
  if (mStep && hour === '*') return mStep === 1 ? 'Every minute' : `Every ${mStep} minutes`;
  if (/^\d+(,\d+)+$/.test(min) && hour === '*') return `${min.split(',').length} times an hour (${min.split(',').map((m) => `:${pad(Number(m))}`).join(', ')})`;
  const hStep = step(hour);
  if (isNum(min) && hStep) return hStep === 1 ? `Every hour at :${pad(Number(min))}` : `Every ${hStep} hours at :${pad(Number(min))}`;

  if (isNum(min) && isNum(hour)) {
    let h = Number(hour);
    let m = Number(min);
    if (!timeZone) { // server runs on UTC; show Pakistan time (UTC+5)
      const total = (h * 60 + m + 300) % 1440;
      h = Math.floor(total / 60); m = total % 60;
    }
    const at = `${((h + 11) % 12) + 1}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`;
    return isNum(dow) ? `Every ${DAYS[Number(dow) % 7]} at ${at}` : `Daily at ${at}`;
  }
  return expr;
}

export const formatDuration = (ms: number | null) => {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.floor(ms / 60_000)} min ${Math.round((ms % 60_000) / 1000)} s`;
};
