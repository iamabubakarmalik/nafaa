/**
 * Pakistan ke courier — naam aur tracking ka safha. Tracking link par CN
 * number copy ho jata hai (har courier ke safhe ka URL format alag hai).
 * RIDER = dukaan ka apna rider: deliver hote hi paisa haath me.
 */
export const COURIERS = [
  { code: 'RIDER', name: 'Apna rider', site: null },
  { code: 'TCS', name: 'TCS', site: 'https://www.tcsexpress.com' },
  { code: 'LEOPARDS', name: 'Leopards', site: 'https://www.leopardscourier.com' },
  { code: 'POSTEX', name: 'PostEx', site: 'https://postex.pk' },
  { code: 'TRAX', name: 'Trax', site: 'https://trax.pk' },
  { code: 'MNP', name: 'M&P', site: 'https://www.mulphilog.com' },
  { code: 'BLUE_EX', name: 'BlueEx', site: 'https://www.blue-ex.com' },
  { code: 'CALL_COURIER', name: 'Call Courier', site: 'https://callcourier.com.pk' },
  { code: 'DAEWOO', name: 'Daewoo FastEx', site: 'https://fastex.pk' },
  { code: 'TPL_RIDER', name: 'Rider (TPL)', site: 'https://track.withrider.com' },
  // TRANZO … FORRUN: no public merchant API yet (API_SOON below), except InstaWorld and ShipNOC (Beta adapters).
  { code: 'TRANZO', name: 'Tranzo', site: 'https://tranzo.pk' },
  { code: 'SWYFT', name: 'Swyft', site: null },
  { code: 'BARQRAFTAR', name: 'BarqRaftar', site: 'https://barqraftar.pk' },
  { code: 'ZOOM', name: 'Zoom COD', site: 'https://zoomcod.com' },
  { code: 'INSTAWORLD', name: 'InstaWorld', site: 'https://www.instaworld.pk' },
  { code: 'SHIPNOC', name: 'ShipNOC', site: 'https://shipnoc.com' },
  { code: 'BYKEA', name: 'Bykea', site: 'https://www.bykea.com' },
  { code: 'MOVEX', name: 'MoveX', site: 'https://www.movex.pk' },
  { code: 'FORRUN', name: 'Forrun', site: 'https://forrun.co' },
  // No merchant API: the shop books at the post office and types the article number.
  { code: 'PAKPOST', name: 'Pakistan Post', site: 'https://ep.gov.pk' },
  { code: 'XTREME', name: 'Xtreme Ecom', site: 'https://xtremeecomlogistics.com' },
  { code: 'RUN', name: 'Run Courier', site: 'https://runcourier.com' },
  { code: 'OTHER', name: 'Doosra', site: null },
] as const;

/**
 * Public tracking pages that take the CN in the link ({cn} is replaced).
 * Only patterns read from the courier's own tracking form or page; a courier
 * missing here gets its home page instead.
 */
const TRACK_URLS: Partial<Record<string, string>> = {
  PAKPOST: 'https://ep.gov.pk/emtts/EPTrack_Live.aspx?ArticleIDz={cn}',
  BLUE_EX: 'https://www.blue-ex.com/tracking?trackno={cn}',
  DAEWOO: 'https://fastex.pk/trackingDetail?trackingNo={cn}',
  TPL_RIDER: 'https://track.withrider.com/#/track/{cn}',
  BARQRAFTAR: 'https://barqraftar.pk/track?tracking_number={cn}',
  ZOOM: 'https://portal.zoomcod.com/track-details.php?track_code={cn}',
  RUN: 'https://portal.runcourier.com/track-details.php?track_code={cn}',
};

/** The courier's tracking page for one CN, or null when it has no linkable page. */
export function courierTrackUrl(code?: string | null, cn?: string | null): string | null {
  const pattern = code ? TRACK_URLS[code] : undefined;
  const n = cn?.trim();
  return pattern && n ? pattern.replace('{cn}', encodeURIComponent(n)) : null;
}

/** Tracking link for the order, else the courier's home page. */
export const courierLink = (code?: string | null, cn?: string | null) =>
  courierTrackUrl(code, cn) ?? COURIERS.find((c) => c.code === code)?.site ?? null;

/**
 * Couriers with no public, documented merchant API (researched 9 Nov 2026,
 * see ~/nafaa-backups/wip/courier-apis.md). They work as manual couriers;
 * the page asks the shop to send the courier's API key and docs so a direct
 * connection can be built and checked.
 */
export const API_SOON: ReadonlySet<string> = new Set([
  'TRANZO', 'SWYFT', 'BARQRAFTAR', 'TPL_RIDER', 'DAEWOO', 'BLUE_EX', 'ZOOM', 'BYKEA', 'MOVEX', 'FORRUN', 'XTREME', 'RUN',
]);

export type CourierCode = (typeof COURIERS)[number]['code'];

export const courierName = (code?: string | null) => COURIERS.find((c) => c.code === code)?.name ?? code ?? null;

/** Courier khud paisa jama karwata hai (settlement) — apna rider nahi */
export const courierHoldsCash = (code?: string | null) => !!code && code !== 'RIDER';
