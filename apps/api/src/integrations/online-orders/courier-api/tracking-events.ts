/**
 * Courier tracking as one event list, the same shape for every courier:
 *
 *   { at: ISO | null, status, text, city?, rider? }
 *
 * `status` is Nafaa's step (BOOKED … DELIVERED / RETURNED), `text` the
 * courier's own words. Each courier has a pure mapper from its raw tracking
 * reply to events; `finalizeEvents` removes duplicates and sorts oldest
 * first. Times without a zone are Pakistan time (couriers send local time).
 * Used for the order timeline and the parcel map.
 */

export const TRACK_EVENT_STATUSES = [
  'BOOKED', 'PICKED_UP', 'AT_ORIGIN_HUB', 'IN_TRANSIT', 'AT_DESTINATION_HUB', 'OUT_FOR_DELIVERY', 'DELIVERED',
  'ATTEMPT_FAILED', 'RETURNING', 'RETURNED', 'CANCELLED', 'OTHER',
] as const;
export type TrackEventStatus = (typeof TRACK_EVENT_STATUSES)[number];

export interface TrackEvent {
  at: string | null;
  status: TrackEventStatus;
  text: string;
  city?: string;
  rider?: { name?: string; phone?: string };
}

/** Courier wording → step. 'HUB' is an arrival whose side (origin or destination) is decided by its place in the list. */
export function eventStatus(raw?: string | null): TrackEventStatus | 'HUB' {
  const s = String(raw ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (!s) return 'OTHER';
  if (/cancel|expired|\bvoid/.test(s)) return 'CANCELLED';
  if (/return|rto/.test(s)) {
    if (/out for return|being return|ready for return|return(ing)? in transit|en-?route|in process|initiated|request/.test(s)) return 'RETURNING';
    if (/return submitted|returned|return delivered|return to (shipper|merchant|vendor|origin)|delivered to (shipper|merchant|vendor|origin)|rto delivered/.test(s)) return 'RETURNED';
    return 'RETURNING';
  }
  if (/out for delivery|on delivery|on route|with rider|delivery in progress|assigned to rider|rider assigned/.test(s)) return 'OUT_FOR_DELIVERY';
  if (/attempt|refused|not available|unable to deliver|un-? ?delivered|not delivered|unsuccessful|failed|on hold|awaiting receiver|address (issue|not found)|consignee not/.test(s)) return 'ATTEMPT_FAILED';
  if (/delivered/.test(s)) return 'DELIVERED';
  if (/booked|^booking$|^pending$|pickup request|order created|shipment created|order received|consignment created/.test(s)) return 'BOOKED';
  if (/picked|pick ?up done|collected from|received from (shipper|merchant|vendor)/.test(s)) return 'PICKED_UP';
  if (/destination|delivery (station|centre|center|hub|facility)|arrived at delivery/.test(s)) return 'AT_DESTINATION_HUB';
  if (/origin/.test(s)) return 'AT_ORIGIN_HUB';
  if (/in transit|transit|dispatched|departed|forwarded|en ?route|on the way|left|linehaul|line haul|sent to|moved to|under review|pending delivery/.test(s)) return 'IN_TRANSIT';
  if (/warehouse|hub|arrived|received at|facility|station|sorting|processing centre|processing center/.test(s)) return 'HUB';
  return 'OTHER';
}

const PK_OFFSET = '+05:00';
const pad = (n: string | number) => String(n).padStart(2, '0');

/** A courier timestamp → ISO (UTC). Zone-less times are Pakistan time. null when unreadable. */
export function parseCourierTime(v: unknown, time?: unknown): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date) return isNaN(+v) ? null : v.toISOString();
  if (typeof v === 'number' || /^\d{9,13}$/.test(String(v))) {
    const n = Number(v);
    const d = new Date(n < 1e12 ? n * 1000 : n);
    return isNaN(+d) ? null : d.toISOString();
  }
  let s = String(v).trim();
  const net = /\/Date\((\d+)([+-]\d{4})?\)\//.exec(s);
  if (net) return new Date(Number(net[1])).toISOString();
  if (time !== undefined && time !== null && String(time).trim() && !/\d{1,2}:\d{2}/.test(s)) s = `${s} ${String(time).trim()}`;
  // YYYY-MM-DD[ T]HH:mm[:ss] or DD-MM-YYYY / DD/MM/YYYY [HH:mm[:ss]] [AM|PM], no zone
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?\s*(am|pm)?)?$/i.exec(s);
  let y: string, mo: string, d: string;
  if (m) { [, y, mo, d] = m; } else {
    m = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?)?$/i.exec(s);
    if (m) { [, d, mo, y] = m; }
  }
  if (m) {
    let h = Number(m[4] ?? 0);
    if (m[7]) { const pm = m[7].toLowerCase() === 'pm'; if (pm && h < 12) h += 12; if (!pm && h === 12) h = 0; }
    const out = new Date(`${y!}-${pad(mo!)}-${pad(d!)}T${pad(h)}:${pad(m[5] ?? 0)}:${pad(m[6] ?? 0)}${PK_OFFSET}`);
    return isNaN(+out) ? null : out.toISOString();
  }
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(s)) {
    const out = new Date(s);
    return isNaN(+out) ? null : out.toISOString();
  }
  const out = new Date(`${s} GMT${PK_OFFSET}`);
  if (!isNaN(+out)) return out.toISOString();
  const plain = new Date(s);
  return isNaN(+plain) ? null : plain.toISOString();
}

const str = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim());
const PHONE = /(?:\+?92|0)3\d{2}[-\s]?\d{7}/;

/** Rider name and phone from the row's own fields, else from "Rider: Ali 0300…" in the text. */
export function riderOf(row: any, text: string): TrackEvent['rider'] | undefined {
  const name = str(row?.riderName ?? row?.rider_name ?? row?.RiderName ?? row?.rider?.name ?? row?.courier_name ?? row?.CourierName);
  let phone = str(row?.riderPhone ?? row?.rider_phone ?? row?.RiderPhone ?? row?.rider_contact ?? row?.rider?.phone ?? row?.CourierPhone);
  let fromText = '';
  if (/rider|courier boy/i.test(text)) {
    fromText = /(?:rider|courier boy)(?:\s*name)?\s*[:\-]\s*([A-Za-z][A-Za-z .]{1,30}?)(?=\s*(?:[,(|\-]|(?:\+?92|0)3\d|$))/i.exec(text)?.[1]?.trim() ?? '';
    if (!phone) phone = PHONE.exec(text)?.[0]?.replace(/[-\s]/g, '') ?? '';
  }
  const n = name || fromText;
  if (!n && !phone) return undefined;
  return { ...(n ? { name: n.slice(0, 60) } : {}), ...(phone ? { phone: phone.slice(0, 20) } : {}) };
}

function ev(text: string, at: string | null, city?: unknown, row?: any): TrackEvent & { hub?: boolean } {
  const st = eventStatus(text);
  const c = str(city);
  const e: TrackEvent & { hub?: boolean } = { at, status: st === 'HUB' ? 'AT_ORIGIN_HUB' : st, text: text.slice(0, 300) };
  if (st === 'HUB') e.hub = true;
  if (c) e.city = c.slice(0, 60);
  const r = riderOf(row, text);
  if (r && (e.status === 'OUT_FOR_DELIVERY' || e.status === 'ATTEMPT_FAILED' || e.status === 'DELIVERED' || e.status === 'PICKED_UP')) e.rider = r;
  return e;
}

/**
 * Drops empty and repeated events, sorts oldest first (events with no time
 * keep their place after the one before them), and decides each plain hub
 * arrival: before the parcel left the first city it is the origin hub,
 * after it is the destination hub.
 */
export function finalizeEvents(list: Array<TrackEvent & { hub?: boolean }>, cap = 200): TrackEvent[] {
  let key = -Infinity;
  const keyed = list.filter((e) => e && str(e.text)).map((e, i) => {
    const t = e.at ? Date.parse(e.at) : NaN;
    if (!isNaN(t)) key = t;
    return { e, key, i };
  });
  keyed.sort((a, b) => a.key - b.key || a.i - b.i);
  const seen = new Set<string>();
  const out: TrackEvent[] = [];
  let left = false;
  for (const { e } of keyed) {
    const status: TrackEventStatus = e.hub ? (left ? 'AT_DESTINATION_HUB' : 'AT_ORIGIN_HUB') : e.status;
    if (status === 'IN_TRANSIT' || status === 'AT_DESTINATION_HUB' || status === 'OUT_FOR_DELIVERY') left = true;
    const k = `${e.at ?? ''}|${str(e.text).toLowerCase()}`;
    if (seen.has(k)) continue;
    seen.add(k);
    const { hub: _hub, ...rest } = e as TrackEvent & { hub?: boolean };
    out.push({ ...rest, status });
  }
  return out.slice(-cap);
}

/** Saved events plus new ones, one clean list. */
export const mergeEvents = (saved: unknown, fresh: TrackEvent[]) =>
  finalizeEvents([...(Array.isArray(saved) ? (saved as TrackEvent[]) : []), ...fresh]);

const arr = (v: unknown): any[] => (Array.isArray(v) ? v : []);

/** One pure mapper per courier: its raw tracking reply for one parcel → events. */
export const TRACKING_MAPPERS: Record<string, (raw: any) => TrackEvent[]> = {
  /** PostEx track-order `dist`: transactionStatusHistory, oldest first. */
  POSTEX: (d) => finalizeEvents(arr(d?.transactionStatusHistory).map((h) =>
    ev(str(h?.transactionStatusMessage ?? h?.status), parseCourierTime(h?.modifiedDatetime ?? h?.updatedAt ?? h?.createdDatetime), h?.city ?? h?.cityName, h))),

  /** Leopards packet: "Tracking Detail", oldest first. */
  LEOPARDS: (p) => finalizeEvents(arr(p?.['Tracking Detail']).map((h) => {
    const text = [str(h?.Status), str(h?.Reason)].filter(Boolean).join(' — ');
    return ev(text, parseCourierTime(h?.Activity_datetime ?? h?.Activity_Date, h?.Activity_datetime ? undefined : h?.Activity_Time), h?.Station ?? h?.City ?? h?.Location, h);
  })),

  /** TCS dynamic track detail: checkpoints and delivery info, newest first. */
  TCS: (b) => finalizeEvents([...arr(b?.checkpoints), ...arr(b?.deliveryinfo)].reverse().map((h) =>
    ev(str(h?.status), parseCourierTime(h?.datetime ?? h?.dateTime), h?.station ?? h?.location ?? h?.city, h))),

  /** Trax shipment/track: details.tracking_history, newest first. */
  TRAX: (b) => finalizeEvents([...arr(b?.details?.tracking_history)].reverse().map((h) => {
    const text = `${str(h?.status)}${h?.status_reason ? ` (${str(h.status_reason)})` : ''}`;
    return ev(text, parseCourierTime(h?.timestamp ?? h?.date_time), h?.city ?? h?.location, h);
  })),

  /** M&P public tracking: tracking_Details[0].Details, oldest first. */
  MNP: (d) => finalizeEvents(arr(d?.Details).map((h) => {
    const text = `${str(h?.Status)}${h?.Detail ? ` — ${str(h.Detail)}` : ''}`;
    return ev(text, parseCourierTime(h?.DateTime), h?.Location, h);
  })),

  /** Call Courier GetTackingHistory: array, oldest first. */
  CALL_COURIER: (list) => finalizeEvents(arr(list).map((h) => {
    const text = `${str(h?.ProcessDescForPortal ?? h?.OperationDesc)}${h?.ReasonDesc ? ` (${str(h.ReasonDesc)})` : ''}`;
    return ev(text, parseCourierTime(h?.TransactionDate), h?.StationName ?? h?.CityName ?? h?.Location, h);
  })),
};

/** Events from the label/time pairs every adapter already returns (fallback for couriers without a mapper). */
export const eventsFromHistory = (history: Array<{ label: string; at?: string | null }>) =>
  finalizeEvents(history.map((h) => ev(str(h.label), parseCourierTime(h.at))));
