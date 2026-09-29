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

export interface CourierCreds {
  apiKey: string;
  apiSecret?: string | null;
}

export interface CourierSettings {
  /** PostEx: pickup address ka code */
  pickupAddressCode?: string | null;
  /** Leopards: origin city id ('self' = account ka shehar) */
  originCityId?: string | null;
  defaultWeightKg?: number | null;
  /** Har booking par courier ke liye note */
  bookingNote?: string | null;
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

export interface TestResult {
  cities: number;
  pickupAddresses?: PickupAddress[];
}

export interface CourierAdapter {
  code: string;
  test(creds: CourierCreds): Promise<TestResult>;
  cities(creds: CourierCreds): Promise<CourierCity[]>;
  pickupAddresses?(creds: CourierCreds): Promise<PickupAddress[]>;
  book(creds: CourierCreds, settings: CourierSettings, input: BookInput): Promise<BookResult>;
  track(creds: CourierCreds, trackingNumbers: string[]): Promise<TrackResult[]>;
  cancel(creds: CourierCreds, trackingNumber: string): Promise<void>;
  /** Label: PDF bytes (token chahiye) ya public URL */
  label(creds: CourierCreds, trackingNumber: string, savedUrl?: string | null): Promise<{ pdf?: Buffer; url?: string }>;
  /** COD settle hua? null = pata nahi (courier ye nahi batata) */
  paymentSettled?(creds: CourierCreds, trackingNumber: string): Promise<{ settled: boolean; reference?: string | null } | null>;
}

/** Courier ne mana kiya — message dukandar ko dikhana hai */
export class CourierApiError extends Error {
  constructor(message: string, readonly auth = false) {
    super(message);
  }
}
