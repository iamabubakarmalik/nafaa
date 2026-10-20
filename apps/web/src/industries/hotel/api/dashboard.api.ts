import { apiClient } from '@core/api/client';
import type { BookingSource, BookingStatus } from './bookings.api';
import type { RoomSummary } from './rooms.api';

export interface OccupancyDay { date: string; sold: number; booked: number; revenue: number; rooms: number; occupancyPct: number; adr: number; revpar: number }

export interface OccupancyReport {
  from: string;
  to: string;
  rooms: number;
  series: OccupancyDay[];
  byType: Array<{ roomTypeId: string; name: string; rooms: number; nights: number; revenue: number; adr: number; occupancyPct: number }>;
  totals: { roomNights: number; available: number; revenue: number; occupancyPct: number; adr: number; revpar: number };
}

export interface AuditStay {
  id: string; bookingNumber: string; guestName: string; guestPhone: string; status: BookingStatus; checkInDate: string; checkOutDate: string;
  nights: number; grandTotal: number; paidAmount: number; bookedBy?: string | null; rooms: string; due: number;
}

export interface NightAudit {
  date: string;
  isToday: boolean;
  rooms: number;
  board: RoomSummary | null;
  night: { sold: number; revenue: number; occupancyPct: number; adr: number; revpar: number };
  inHouse: Array<AuditStay & { overdue: boolean; leavingToday: boolean }>;
  arrivalsPending: Array<AuditStay & { late: boolean }>;
  checkedOut: AuditStay[];
  inHouseDue: number;
  openTasks: number;
  shopId: string | null;
  /** The saved close of this day for the branch, if it was closed. */
  closed: ClosedDay | null;
  money: {
    bills: number; billed: number; takenAtBill: number; onKhata: number; advances: number; refunds: number;
    byMethod: Record<string, number>;
    sales: Array<{ id: string; saleNumber: string; bookingNumber: string | null; total: number; creditAmount: number }>;
  };
}

/** A business day closed by the night audit, with the numbers saved at closing. */
export interface ClosedDay {
  id: string; shopId: string | null; businessDate: string; date?: string; occupiedRooms: number; revenue: number; roomRevenue: number;
  adr: number; occupancyPct: number; notes: string | null; closedById: string | null; closedByName: string | null; shopName?: string | null; createdAt: string;
}

export interface HotelOverview {
  rooms?: Partial<RoomSummary>;
  operations?: { arrivalsToday?: number; departuresToday?: number; inHouse?: number; todayBookings?: number; pendingHK?: number };
  revenue?: { today?: number; monthly?: number; collected?: number; outstanding?: number; advancesToday?: number };
  occupancyTrend?: Array<{ date: string; occupied: number; total: number; pct: number }>;
  bySource?: Array<{ source: BookingSource; _count?: { _all?: number }; _sum?: { grandTotal?: number | null } }>;
}

const unwrap = <T,>(res: { data: unknown }): T => ((res.data as { data?: T })?.data ?? res.data) as T;

export const hotelDashboardApi = {
  overview: () => apiClient.get('/hotel/dashboard/overview').then(unwrap<HotelOverview>),
  occupancy: (params: { from?: string; to?: string }) => apiClient.get('/hotel/reports/occupancy', { params }).then(unwrap<OccupancyReport>),
  nightAudit: (date?: string) => apiClient.get('/hotel/reports/night-audit', { params: { date } }).then(unwrap<NightAudit>),
  closeDay: (body: { date?: string; notes?: string }) => apiClient.post('/hotel/reports/night-audit/close', body).then(unwrap<ClosedDay>),
  closedDays: (params?: { from?: string; to?: string }) => apiClient.get('/hotel/reports/night-audit/closed', { params }).then(unwrap<ClosedDay[]>),
};
