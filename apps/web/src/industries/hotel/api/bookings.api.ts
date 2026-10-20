import { apiClient } from '@core/api/client';
import type { HotelGuest } from './guests.api';
import type { HotelRoom } from './rooms.api';
import type { HotelRoomType } from './room-types.api';
import type { FolioCharge } from './folio.api';

export type BookingStatus = 'INQUIRY' | 'QUOTED' | 'TENTATIVE' | 'CONFIRMED'
  | 'CHECKED_IN' | 'CHECKED_OUT' | 'NO_SHOW' | 'CANCELLED' | 'EXTENDED';

export type BookingSource = 'DIRECT' | 'WALK_IN' | 'PHONE' | 'WEBSITE' | 'BOOKING_COM'
  | 'AGODA' | 'EXPEDIA' | 'AIRBNB' | 'TRAVEL_AGENT' | 'CORPORATE' | 'GOVT' | 'REFERRAL' | 'OTHER';

export type MealPlan = 'ROOM_ONLY' | 'BED_BREAKFAST' | 'HALF_BOARD' | 'FULL_BOARD' | 'ALL_INCLUSIVE';
export type PayMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'JAZZCASH' | 'EASYPAISA';
export type BookingView = 'all' | 'arrivals' | 'inhouse' | 'departures' | 'upcoming' | 'due';

export interface BookedRoom {
  id: string;
  roomId?: string | null;
  roomTypeId: string;
  roomNumber?: string | null;
  roomTypeName?: string | null;
  ratePerNight: number;
  totalNights: number;
  totalAmount: number;
  adults: number;
  children: number;
  extraBeds: number;
  isComplimentary: boolean;
  discount: number;
  notes?: string | null;
  roomType?: HotelRoomType | null;
  room?: HotelRoom | null;
}

export interface HotelBooking {
  id: string;
  shopId?: string | null;
  bookingNumber: string;
  confirmationCode?: string | null;
  primaryGuestId?: string | null;
  guestName: string;
  guestPhone: string;
  guestEmail?: string | null;
  totalAdults: number;
  totalChildren: number;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  actualCheckIn?: string | null;
  actualCheckOut?: string | null;
  source: BookingSource;
  sourceRef?: string | null;
  bookedBy?: string | null;
  /** Company / regular khata the stay is billed to at check-out. */
  customerId?: string | null;
  agentName?: string | null;
  agentCommission: number;
  mealPlan: MealPlan;
  status: BookingStatus;
  roomTotal: number;
  taxAmount: number;
  serviceCharge: number;
  discount: number;
  extraCharges: number;
  grandTotal: number;
  advancePaid: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: string;
  specialRequests?: string | null;
  arrivalTime?: string | null;
  purposeOfVisit?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  refundAmount: number;
  notes?: string | null;
  bookedRooms: BookedRoom[];
  /** Latest live bill of the booking. */
  saleId?: string | null;
  saleNumber?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BillLine { label: string; amount: number; quantity?: number; cost?: number }

/** One booking with its folio, bills, khata and what is still to pay. */
export interface BookingDetail extends HotelBooking {
  folioCharges: FolioCharge[];
  guest: HotelGuest | null;
  sales: Array<{ id: string; saleNumber: string; total: number; paidAmount: number; creditAmount: number; status: string; createdAt: string }>;
  khata: { id: string; name: string; phone?: string | null; balance: number } | null;
  billTo: { id: string; name: string; phone?: string | null; balance: number } | null;
  money: { khataPaid: number; legacyPaid: number; refunded: number; due: number; advanceLeft: number };
  bill: { lines: BillLine[]; discount: number; total: number };
  today: string;
  overdueNights: number;
  /** Nights stayed so far when the guest leaves before the booked date. */
  earlyNights: number | null;
}

export interface BookingPage {
  items: HotelBooking[];
  total: number;
  page: number;
  limit: number;
  summary: { byStatus: Partial<Record<BookingStatus, number>>; billed: number; paid: number; due: number; views: Record<Exclude<BookingView, 'all'>, number> };
}

export interface QuoteType {
  roomTypeId: string;
  name: string;
  code: string;
  type: string;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  extraBedAllowed: boolean;
  extraBedPrice: number;
  basePrice: number;
  weekendPrice?: number | null;
  nightly: Array<{ date: string; rate: number; label: string }>;
  total: number;
  avgRate: number;
  roomsTotal: number;
  free: Array<{ id: string; roomNumber: string; floor?: string | null; status: string; housekeepingStatus: string; total: number }>;
}

export interface Quote { checkInDate: string; checkOutDate: string; nights: number; types: QuoteType[] }

export interface BookingRoomInput {
  roomId?: string;
  roomTypeId?: string;
  ratePerNight?: number;
  adults?: number;
  children?: number;
  extraBeds?: number;
  discount?: number;
  isComplimentary?: boolean;
  notes?: string;
}

export interface GuestIdInput {
  idType?: string;
  idNumber?: string;
  adults?: number;
  children?: number;
  nationality?: string;
  address?: string;
  city?: string;
  purposeOfVisit?: string;
  notes?: string;
}

export interface CreateBookingInput extends GuestIdInput {
  primaryGuestId?: string;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  totalAdults?: number;
  totalChildren?: number;
  checkInDate: string;
  checkOutDate: string;
  rooms: BookingRoomInput[];
  source?: BookingSource;
  sourceRef?: string;
  bookedBy?: string;
  mealPlan?: MealPlan;
  status?: 'TENTATIVE' | 'CONFIRMED';
  taxAmount?: number;
  serviceCharge?: number;
  discount?: number;
  specialRequests?: string;
  arrivalTime?: string;
  advancePaid?: number;
  paymentMethod?: PayMethod;
  customerId?: string;
  checkInNow?: boolean;
}

export type UpdateBookingInput = Partial<Pick<CreateBookingInput,
  'guestName' | 'guestPhone' | 'guestEmail' | 'totalAdults' | 'totalChildren' | 'checkInDate' | 'checkOutDate' | 'source' | 'sourceRef'
  | 'bookedBy' | 'mealPlan' | 'status' | 'taxAmount' | 'serviceCharge' | 'discount' | 'specialRequests' | 'arrivalTime' | 'purposeOfVisit' | 'notes'>>
  & { customerId?: string | null };

export interface TenderInput {
  payments?: Array<{ method: PayMethod; amount: number; reference?: string }>;
  paymentMethod?: PayMethod;
  paidAmount?: number;
  onCredit?: boolean;
  customerId?: string;
  keepBookedNights?: boolean;
}

export interface CheckOutResult extends HotelBooking {
  sale: { id: string; saleNumber: string; total: number };
  change: number;
  onKhata: number;
}

const unwrap = <T,>(res: { data: unknown }): T => ((res.data as { data?: T })?.data ?? res.data) as T;

export const bookingsApi = {
  create: (data: CreateBookingInput) => apiClient.post('/hotel/bookings', data).then(unwrap<HotelBooking>),
  /** Latest 300 (receipt engine and pickers); `saleId` finds the booking of a bill. */
  list: (params?: { status?: string; search?: string; saleId?: string; guestId?: string }) => apiClient.get('/hotel/bookings', { params }).then(unwrap<HotelBooking[]>),
  page: (params: { view?: BookingView; status?: string; source?: string; search?: string; from?: string; to?: string; guestId?: string; customerId?: string; page?: number; limit?: number }) =>
    apiClient.get('/hotel/bookings/page', { params }).then(unwrap<BookingPage>),
  quote: (params: { checkInDate: string; checkOutDate: string; roomTypeId?: string; source?: string; exceptBookingId?: string }) =>
    apiClient.get('/hotel/bookings/quote', { params }).then(unwrap<Quote>),
  inHouse: () => apiClient.get('/hotel/bookings/in-house').then(unwrap<HotelBooking[]>),
  getOne: (id: string) => apiClient.get('/hotel/bookings/' + id).then(unwrap<BookingDetail>),
  update: (id: string, data: UpdateBookingInput) => apiClient.patch('/hotel/bookings/' + id, data).then(unwrap<HotelBooking>),
  updateStatus: (id: string, status: string, reason?: string) => apiClient.patch('/hotel/bookings/' + id + '/status', { status, reason }).then(unwrap<HotelBooking>),
  checkIn: (id: string, body: GuestIdInput = {}) => apiClient.post('/hotel/bookings/' + id + '/check-in', body).then(unwrap<HotelBooking>),
  checkOut: (id: string, body: TenderInput = {}) => apiClient.post('/hotel/bookings/' + id + '/check-out', body).then(unwrap<CheckOutResult>),
  addPayment: (id: string, amount: number, paymentMethod?: PayMethod, customerId?: string) =>
    apiClient.post('/hotel/bookings/' + id + '/payment', { amount, paymentMethod, customerId }).then(unwrap<HotelBooking>),
  extend: (id: string, newCheckOutDate: string) => apiClient.post('/hotel/bookings/' + id + '/extend', { newCheckOutDate }).then(unwrap<HotelBooking>),
  changeRoom: (id: string, body: { bookedRoomId: string; roomId: string; ratePerNight?: number; reason?: string }) =>
    apiClient.post('/hotel/bookings/' + id + '/change-room', body).then(unwrap<HotelBooking>),
  cancel: (id: string, body: { reason: string; charge?: number; noShow?: boolean }) =>
    apiClient.post('/hotel/bookings/' + id + '/cancel', body).then(unwrap<HotelBooking & { sale: { id: string; saleNumber: string } | null; advanceLeft: number }>),
  refund: (id: string, body: { amount?: number; managerPin?: string }) =>
    apiClient.post('/hotel/bookings/' + id + '/refund', body).then(unwrap<HotelBooking & { refunded: number }>),
};
