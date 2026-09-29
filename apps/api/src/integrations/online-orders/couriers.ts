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
  { code: 'OTHER', name: 'Doosra', site: null },
] as const;

export type CourierCode = (typeof COURIERS)[number]['code'];

export const courierName = (code?: string | null) => COURIERS.find((c) => c.code === code)?.name ?? code ?? null;

/** Courier khud paisa jama karwata hai (settlement) — apna rider nahi */
export const courierHoldsCash = (code?: string | null) => !!code && code !== 'RIDER';
