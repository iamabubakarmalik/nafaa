import { apiClient } from '@/api/client';

export type BookingStatus = 'INQUIRY' | 'QUOTED' | 'TENTATIVE' | 'CONFIRMED'
  | 'CHECKED_IN' | 'CHECKED_OUT' | 'NO_SHOW' | 'CANCELLED' | 'EXTENDED';

export type BookingSource = 'DIRECT' | 'WALK_IN' | 'PHONE' | 'WEBSITE' | 'BOOKING_COM'
  | 'AGODA' | 'EXPEDIA' | 'AIRBNB' | 'TRAVEL_AGENT' | 'CORPORATE' | 'GOVT' | 'REFERRAL' | 'OTHER';

export type MealPlan = 'ROOM_ONLY' | 'BED_BREAKFAST' | 'HALF_BOARD' | 'FULL_BOARD' | 'ALL_INCLUSIVE';

export interface BookedRoom {
  id?: string;
  roomId?: string;
  roomTypeId: string;
  roomNumber?: string;
  ratePerNight: number;
  totalNights: number;
  totalAmount: number;
  adults: number;
  children: number;
  extraBeds: number;
  isComplimentary: boolean;
  discount: number;
  notes?: string;
  roomType?: any;
  room?: any;
}

export interface HotelBooking {
  id: string;
  bookingNumber: string;
  confirmationCode?: string;
  primaryGuestId?: string;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  totalAdults: number;
  totalChildren: number;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  actualCheckIn?: string;
  actualCheckOut?: string;
  earlyCheckIn: boolean;
  lateCheckOut: boolean;
  source: BookingSource;
  sourceRef?: string;
  bookedBy?: string;
  agentName?: string;
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
  specialRequests?: string;
  arrivalTime?: string;
  purposeOfVisit?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  refundAmount: number;
  notes?: string;
  bookedRooms: BookedRoom[];
  folioCharges?: any[];
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const bookingsApi = {
  create: (data: any) => apiClient.post('/hotel/bookings', data).then(unwrap<HotelBooking>),
  list: (params?: any) => apiClient.get('/hotel/bookings', { params }).then(unwrap<HotelBooking[]>),
  arrivalsToday: () => apiClient.get('/hotel/bookings/arrivals/today').then(unwrap<HotelBooking[]>),
  departuresToday: () => apiClient.get('/hotel/bookings/departures/today').then(unwrap<HotelBooking[]>),
  inHouse: () => apiClient.get('/hotel/bookings/in-house').then(unwrap<HotelBooking[]>),
  getOne: (id: string) => apiClient.get('/hotel/bookings/' + id).then(unwrap<HotelBooking>),
  updateStatus: (id: string, status: string, reason?: string) =>
    apiClient.patch('/hotel/bookings/' + id + '/status', { status, reason }).then(unwrap<HotelBooking>),
  checkIn: (id: string) => apiClient.post('/hotel/bookings/' + id + '/check-in').then(unwrap<HotelBooking>),
  checkOut: (id: string) => apiClient.post('/hotel/bookings/' + id + '/check-out').then(unwrap<HotelBooking>),
  addPayment: (id: string, amount: number) => apiClient.post('/hotel/bookings/' + id + '/payment', { amount }).then(unwrap<HotelBooking>),
  extend: (id: string, newCheckOutDate: string) => apiClient.post('/hotel/bookings/' + id + '/extend', { newCheckOutDate }).then(unwrap<HotelBooking>),
};
