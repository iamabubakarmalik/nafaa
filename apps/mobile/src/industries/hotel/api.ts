/** Hotel endpoints (same paths and shapes as apps/web/src/industries/hotel/api). They need the server; screens show the last saved data offline. */

import { http } from '../_shared/serviceKit';

export type BookingStatus = 'INQUIRY' | 'QUOTED' | 'TENTATIVE' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'NO_SHOW' | 'CANCELLED' | 'EXTENDED';
export type BookingView = 'all' | 'arrivals' | 'inhouse' | 'departures' | 'upcoming' | 'due';
export type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING' | 'MAINTENANCE' | 'OUT_OF_ORDER' | 'BLOCKED';
export type HousekeepingStatus = 'DIRTY' | 'CLEAN' | 'INSPECTED' | 'OUT_OF_ORDER' | 'MAINTENANCE_REQUIRED';

export interface HotelRoomType { id: string; code: string; name: string; type: string; maxAdults: number; maxChildren: number; extraBedAllowed: boolean; extraBedPrice: number; basePrice: number; weekendPrice?: number | null; isActive: boolean; rooms?: Array<{ id: string; roomNumber: string }> }
export interface BookedRoom { id: string; roomId?: string | null; roomNumber?: string | null; roomTypeName?: string | null; ratePerNight: number; totalNights: number; totalAmount: number; adults: number; children: number; extraBeds: number; discount: number }
export interface HotelBooking {
  id: string; bookingNumber: string; guestName: string; guestPhone: string; totalAdults: number; totalChildren: number; checkInDate: string; checkOutDate: string; nights: number; status: BookingStatus; source: string;
  roomTotal: number; taxAmount: number; serviceCharge: number; discount: number; extraCharges: number; grandTotal: number; advancePaid: number; paidAmount: number; balanceAmount: number; paymentStatus: string;
  specialRequests?: string | null; bookedRooms: BookedRoom[]; saleNumber?: string | null; customerId?: string | null; bookedBy?: string | null;
}
export interface FolioCharge { id: string; chargeNumber: string; chargeDate: string; chargeType: string; description: string; quantity: number; unitPrice: number; totalAmount: number; isVoid: boolean }
export interface BookingDetail extends HotelBooking {
  folioCharges: FolioCharge[];
  khata: { id: string; name: string; balance: number } | null; billTo: { id: string; name: string; balance: number } | null;
  money: { khataPaid: number; legacyPaid: number; refunded: number; due: number; advanceLeft: number };
  bill: { lines: Array<{ label: string; amount: number }>; discount: number; total: number };
  today: string; overdueNights: number; earlyNights: number | null;
}
export interface BookingPage { items: HotelBooking[]; total: number; summary: { byStatus: Partial<Record<BookingStatus, number>>; billed: number; paid: number; due: number; views: Record<string, number> } }
export interface QuoteType { roomTypeId: string; name: string; maxAdults: number; extraBedAllowed: boolean; extraBedPrice: number; basePrice: number; nightly: Array<{ date: string; rate: number; label: string }>; total: number; avgRate: number; roomsTotal: number; free: Array<{ id: string; roomNumber: string; floor?: string | null; total: number }> }
export interface Quote { checkInDate: string; checkOutDate: string; nights: number; types: QuoteType[] }
export interface CreateBooking {
  guestName: string; guestPhone: string; idType?: string; idNumber?: string; totalAdults?: number; totalChildren?: number; checkInDate: string; checkOutDate: string;
  rooms: Array<{ roomId?: string; roomTypeId?: string; ratePerNight?: number; adults?: number; extraBeds?: number }>; source?: string; mealPlan?: string; status?: 'TENTATIVE' | 'CONFIRMED';
  discount?: number; specialRequests?: string; advancePaid?: number; paymentMethod?: string; checkInNow?: boolean;
}
export interface CheckOutResult extends HotelBooking { sale: { id: string; saleNumber: string; total: number }; change: number; onKhata: number }
export interface BoardStay { id: string; bookingNumber: string; guestName: string; checkInDate: string; checkOutDate: string; balanceAmount: number }
export interface BoardRoom { id: string; roomNumber: string; floor?: string | null; status: RoomStatus; housekeepingStatus: HousekeepingStatus; live: RoomStatus; current: BoardStay | null; arrival: BoardStay | null; departingToday: boolean; overdue: boolean; nightsLeft: number | null; roomType?: HotelRoomType; roomTypeId: string; customPrice?: number | null }
export interface RoomSummary { total: number; available: number; occupied: number; reserved: number; cleaning: number; maintenance: number; dirty: number; occupancyPct: number }
export interface HotelGuest { id: string; guestNumber: string; fullName: string; firstName: string; lastName?: string | null; phone: string; email?: string | null; idType?: string | null; idNumber?: string | null; city?: string | null; isVIP: boolean; isBlacklisted: boolean; totalStays: number; totalNights: number; totalSpent: number; lastStayAt?: string | null; notes?: string | null }
export interface HousekeepingTask { id: string; taskNumber: string; roomId?: string | null; roomNumber: string; taskType: string; priority: string; status: string; assignedName?: string | null; notes?: string | null; scheduledFor?: string | null }
export interface RatePlan { id: string; description?: string | null; mealPlan?: string; maxNights?: number | null; applicableDays?: number[]; applicableRoomTypeIds?: string[]; applicableSources?: string[]; code: string; name: string; startDate: string; endDate: string; planType: string; isPercentage: boolean; adjustment: number; minNights?: number | null; isActive: boolean }
export interface HotelOverview {
  rooms?: Partial<RoomSummary>;
  operations?: { arrivalsToday?: number; departuresToday?: number; inHouse?: number; todayBookings?: number; pendingHK?: number };
  revenue?: { today?: number; monthly?: number; collected?: number; outstanding?: number; advancesToday?: number };
}
export interface NightAudit {
  date: string; rooms: number; night: { sold: number; revenue: number; occupancyPct: number; adr: number; revpar: number };
  inHouse: Array<{ id: string; bookingNumber: string; guestName: string; rooms: string; due: number; overdue: boolean; leavingToday: boolean }>;
  arrivalsPending: Array<{ id: string; bookingNumber: string; guestName: string; rooms: string; late: boolean }>;
  checkedOut: Array<{ id: string; bookingNumber: string; guestName: string; rooms: string; grandTotal: number }>;
  inHouseDue: number; openTasks: number; closed: { id: string; notes: string | null } | null;
  money: { bills: number; billed: number; takenAtBill: number; onKhata: number; advances: number; refunds: number; byMethod: Record<string, number> };
}

export interface OccupancyDay { date: string; sold: number; booked: number; revenue: number; rooms: number; occupancyPct: number; adr: number; revpar: number }
export interface OccupancyReport {
  from: string; to: string; rooms: number; series: OccupancyDay[];
  byType: Array<{ roomTypeId: string; name: string; rooms: number; nights: number; revenue: number; adr: number; occupancyPct: number }>;
  totals: { roomNights: number; available: number; revenue: number; occupancyPct: number; adr: number; revpar: number };
}

export const hotelApi = {
  occupancy: (p: { from?: string; to?: string }) => http.get<OccupancyReport>('/hotel/reports/occupancy', p),
  overview: () => http.get<HotelOverview>('/hotel/dashboard/overview'),
  nightAudit: (date?: string) => http.get<NightAudit>('/hotel/reports/night-audit', { date }),
  closeDay: (d: { date?: string; notes?: string }) => http.post('/hotel/reports/night-audit/close', d),
  bookings: {
    page: (p: { view?: BookingView; search?: string; page?: number; limit?: number }) => http.get<BookingPage>('/hotel/bookings/page', p),
    inHouse: () => http.get<HotelBooking[]>('/hotel/bookings/in-house'),
    quote: (p: { checkInDate: string; checkOutDate: string; roomTypeId?: string; source?: string; exceptBookingId?: string }) => http.get<Quote>('/hotel/bookings/quote', p),
    getOne: (id: string) => http.get<BookingDetail>(`/hotel/bookings/${id}`),
    create: (d: CreateBooking) => http.post<HotelBooking>('/hotel/bookings', d),
    checkIn: (id: string, d: { idType?: string; idNumber?: string; adults?: number; children?: number } = {}) => http.post<HotelBooking>(`/hotel/bookings/${id}/check-in`, d),
    checkOut: (id: string, d: { payments?: Array<{ method: string; amount: number }>; onCredit?: boolean; customerId?: string; paidAmount?: number; keepBookedNights?: boolean }) => http.post<CheckOutResult>(`/hotel/bookings/${id}/check-out`, d),
    addPayment: (id: string, amount: number, paymentMethod?: string) => http.post<HotelBooking>(`/hotel/bookings/${id}/payment`, { amount, paymentMethod }),
    changeRoom: (id: string, d: { bookedRoomId: string; roomId: string; ratePerNight?: number; reason?: string }) => http.post<HotelBooking>(`/hotel/bookings/${id}/change-room`, d),
    extend: (id: string, newCheckOutDate: string) => http.post<HotelBooking>(`/hotel/bookings/${id}/extend`, { newCheckOutDate }),
    cancel: (id: string, d: { reason: string; charge?: number; noShow?: boolean }) => http.post(`/hotel/bookings/${id}/cancel`, d),
    refund: (id: string, d: { amount?: number }) => http.post(`/hotel/bookings/${id}/refund`, d),
  },
  folio: {
    add: (d: { bookingId: string; chargeType: string; description: string; quantity?: number; unitPrice?: number; discount?: number }) => http.post<FolioCharge>('/hotel/folio', d),
    void: (id: string, reason: string) => http.post<FolioCharge>(`/hotel/folio/${id}/void`, { reason }),
  },
  rooms: {
    board: () => http.get<{ today: string; rooms: BoardRoom[] }>('/hotel/rooms/board'),
    summary: () => http.get<RoomSummary>('/hotel/rooms/summary'),
    create: (d: Record<string, unknown>) => http.post('/hotel/rooms', d),
    update: (id: string, d: Record<string, unknown>) => http.patch(`/hotel/rooms/${id}`, d),
    status: (id: string, status: RoomStatus, notes?: string) => http.patch(`/hotel/rooms/${id}/status`, { status, notes }),
    housekeeping: (id: string, housekeepingStatus: HousekeepingStatus) => http.patch(`/hotel/rooms/${id}/housekeeping`, { housekeepingStatus }),
  },
  roomTypes: {
    list: () => http.get<HotelRoomType[]>('/hotel/room-types'),
    create: (d: Record<string, unknown>) => http.post('/hotel/room-types', d),
    update: (id: string, d: Record<string, unknown>) => http.patch(`/hotel/room-types/${id}`, d),
  },
  guests: {
    page: (p: { view?: string; search?: string; page?: number; limit?: number }) => http.get<{ items: Array<HotelGuest & { inHouse: { rooms: string } | null }>; total: number }>('/hotel/guests/page', p),
    create: (d: Record<string, unknown>) => http.post<HotelGuest>('/hotel/guests', d),
    update: (id: string, d: Record<string, unknown>) => http.patch<HotelGuest>(`/hotel/guests/${id}`, d),
    blacklist: (id: string, reason: string) => http.post(`/hotel/guests/${id}/blacklist`, { reason }),
    unblacklist: (id: string) => http.post(`/hotel/guests/${id}/unblacklist`),
  },
  housekeeping: {
    list: (p?: { view?: 'open' | 'done' | 'all' }) => http.get<HousekeepingTask[]>('/hotel/housekeeping', p),
    create: (d: { roomId: string; taskType: string; priority?: string; assignedName?: string; notes?: string }) => http.post('/hotel/housekeeping', d),
    assign: (id: string, assignedName: string) => http.post(`/hotel/housekeeping/${id}/assign`, { assignedName }),
    start: (id: string) => http.post(`/hotel/housekeeping/${id}/start`),
    complete: (id: string, d: { notes?: string; issueFound?: string }) => http.post(`/hotel/housekeeping/${id}/complete`, d),
    cancel: (id: string, reason: string) => http.post(`/hotel/housekeeping/${id}/cancel`, { reason }),
  },
  ratePlans: {
    list: () => http.get<RatePlan[]>('/hotel/rate-plans'),
    create: (d: Record<string, unknown>) => http.post('/hotel/rate-plans', d),
    update: (id: string, d: Record<string, unknown>) => http.patch(`/hotel/rate-plans/${id}`, d),
    remove: (id: string) => http.del(`/hotel/rate-plans/${id}`),
  },
};
