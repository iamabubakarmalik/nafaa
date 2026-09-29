import { CourierState } from './types';

/**
 * Courier ke lafz → Nafaa status. PostEx: "Picked By PostEx", "PostEx WareHouse",
 * "Out For Delivery", "Delivery Under Review", "Out For Return", "Returned"…
 * Leopards: "Pickup Request Sent", "Arrived at Station", "Being Return",
 * "Returned to shipper"… Trax: "Shipment - Delivery Unsuccessful", "Return -
 * Delivered to Shipper". TCS: "Return To Origin". Tartib zaroori hai: "under review" deliver nahi hai,
 * "out for return" wapas pahuncha nahi hai.
 */
export function normalizeCourierStatus(raw?: string | null): CourierState {
  const s = String(raw ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (!s) return 'UNKNOWN';
  if (/cancel|un-?assigned by me|expired|void/.test(s)) return 'CANCELLED';
  if (/return|rto/.test(s)) {
    if (/out for return|being return|ready for return|return(ing)? in transit|en-?route|in process|initiated|request/.test(s)) return 'RETURNING';
    if (/return submitted|returned|return delivered|return to (shipper|merchant|vendor|origin)|delivered to (shipper|merchant|vendor|origin)|rto delivered/.test(s)) return 'RETURNED';
    return 'RETURNING';
  }
  if (/under review|pending delivery/.test(s)) return 'IN_TRANSIT';
  if (/out for delivery|on delivery|on route|with rider|delivery in progress/.test(s)) return 'OUT_FOR_DELIVERY';
  if (/attempt|refused|not available|unable to deliver|un-? ?delivered|not delivered|unsuccessful|failed|hold|awaiting receiver/.test(s)) return 'ATTEMPTED';
  if (/delivered/.test(s)) return 'DELIVERED';
  if (/booked|^booking$|^pending$|pickup request|order created|shipment created/.test(s)) return 'BOOKED';
  if (/picked|pick ?up done|collected from/.test(s)) return 'PICKED_UP';
  return 'IN_TRANSIT';
}

/** Courier ne parcel utha liya — order "raste me" hona chahiye */
export const isDispatched = (s: CourierState) =>
  s === 'PICKED_UP' || s === 'IN_TRANSIT' || s === 'OUT_FOR_DELIVERY' || s === 'ATTEMPTED' || s === 'DELIVERED' || s === 'RETURNING' || s === 'RETURNED';

/** Aage koi tabdeeli nahi aani — tracking band */
export const isFinal = (s?: string | null) => s === 'RETURNED' || s === 'CANCELLED';
