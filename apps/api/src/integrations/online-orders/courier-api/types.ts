/**
 * Courier API adapters ka mushtarka roop. Har courier (PostEx, Leopards, …)
 * yahi interface poora karta hai — service ko courier ka farq nahi pata.
 */

/** Courier ka status, Nafaa ki zabaan me */
export type CourierState =
  | 'BOOKED'            // CN ban gaya, abhi utha nahi
  | 'PICKED_UP'         // courier le gaya
  | 'IN_TRANSIT'        // raste me / warehouse
  | 'OUT_FOR_DELIVERY'  // rider ke paas, aaj deliver
  | 'ATTEMPTED'         // deliver ki koshish hui, customer nahi mila
  | 'DELIVERED'
  | 'RETURNING'         // wapas aa raha hai
  | 'RETURNED'          // dukaan ko wapas mil gaya (RTO)
  | 'CANCELLED'
  | 'UNKNOWN';

/**
 * Courier ki keys. apiKey hamesha; baqi courier ke hisaab se (Leopards:
 * apiSecret, TCS: accountNo/costCenter…). Sab encrypted save hoti hain.
 */
export type CourierCreds = { apiKey: string } & Record<string, string | undefined>;

export interface CourierSettings {
  /** Pickup address ka code (PostEx, Trax, …) */
  pickupAddressCode?: string | null;
  /** Origin city id ('self' = account ka shehar) */
  originCityId?: string | null;
  defaultWeightKg?: number | null;
  /** Har booking par courier ke liye note */
  bookingNote?: string | null;
  /** Courier ki service (Overnight, Economy, …) */
  serviceType?: string | null;
  [key: string]: string | number | boolean | null | undefined;
}

export interface CourierCity {
  id: string;
  name: string;
}

export interface PickupAddress {
  code: string;
  address: string;
  city?: string | null;
}

export interface BookInput {
  orderRef: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  address: string;
  /** Courier ki list wala shehar (naam + id) */
  city: CourierCity;
  codAmount: number;
  pieces: number;
  weightKg: number;
  description: string;
  notes?: string | null;
}

export interface BookResult {
  trackingNumber: string;
  labelUrl?: string | null;
  raw?: unknown;
}

export interface TrackResult {
  trackingNumber: string;
  state: CourierState;
  /** Courier ka apna lafz, jaisa unhon ne likha */
  label: string;
  at?: Date | null;
  history: { label: string; at?: string | null }[];
}

/** Courier portal par book hua parcel (Nafaa se ho ya seedha portal se) */
export interface PortalShipment {
  trackingNumber: string;
  orderRef: string | null;
  customerName: string | null;
  customerPhone: string | null;
  city: string | null;
  address: string | null;
  codAmount: number;
  statusLabel: string;
  bookedAt: Date | null;
}

export interface TestResult {
  cities: number;
  pickupAddresses?: PickupAddress[];
}

export interface CourierAdapter {
  code: string;
  /** Courier ki services (Overnight, Same day…) — booking form ke liye */
  services?(creds: CourierCreds): Promise<{ code: string; name: string }[]>;
  test(creds: CourierCreds): Promise<TestResult>;
  cities(creds: CourierCreds): Promise<CourierCity[]>;
  /** Pickup addresses — kuch couriers (Call Courier) me settings ke shehar ke hisaab se */
  pickupAddresses?(creds: CourierCreds, settings?: CourierSettings): Promise<PickupAddress[]>;
  book(creds: CourierCreds, settings: CourierSettings, input: BookInput): Promise<BookResult>;
  track(creds: CourierCreds, trackingNumbers: string[]): Promise<TrackResult[]>;
  cancel(creds: CourierCreds, trackingNumber: string, settings?: CourierSettings): Promise<void>;
  /** Label: PDF bytes (token chahiye) ya public URL */
  label(creds: CourierCreds, trackingNumber: string, savedUrl?: string | null): Promise<{ pdf?: Buffer; url?: string }>;
  /** Courier portal ke saare parcels (tareekh ke beech) — Nafaa ke bahar book hue bhi */
  listShipments?(creds: CourierCreds, from: string, to: string): Promise<PortalShipment[]>;
  /** Kai CN ka ek hi label PDF */
  bulkLabel?(creds: CourierCreds, trackingNumbers: string[]): Promise<{ pdf?: Buffer; url?: string }>;
  /** COD settle hua? null = pata nahi (courier ye nahi batata) */
  paymentSettled?(creds: CourierCreds, trackingNumber: string): Promise<{ settled: boolean; reference?: string | null } | null>;
}

/** Courier ne mana kiya — message dukandar ko dikhana hai */
export class CourierApiError extends Error {
  constructor(message: string, readonly auth = false) {
    super(message);
  }
}
