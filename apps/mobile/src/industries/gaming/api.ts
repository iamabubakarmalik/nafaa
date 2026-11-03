/** Gaming endpoints (same paths and shapes as apps/web/src/industries/gaming/api). They need the server; screens show the last saved data offline. */

import { http } from '../_shared/serviceKit';

export interface GamingStation {
  id: string; stationNumber: string; name: string; stationType: string; location?: string; pricePerHour: number; minimumMinutes: number; isActive: boolean; isUnderMaintenance: boolean;
  totalHoursUsed: number; totalRevenue: number; installedGames: string[];
  currentSession?: { id: string; sessionNumber: string; status: string; startedAt: string; customerName?: string | null } | null;
}
export interface GamingSession {
  id: string; stationId: string; sessionNumber: string; status: 'ACTIVE' | 'PAUSED' | 'ENDED' | 'CANCELLED'; customerName?: string; customerPhone?: string; playerCount: number; gameSelected?: string;
  startedAt: string; pausedAt?: string; totalPauseMinutes: number; ratePerHour: number; totalAmount: number; paidAmount: number; billableMinutes?: number;
  station?: GamingStation | null; liveBilling?: { actualMinutes: number; billableMinutes: number; pauseMinutes?: number; currentAmount: number };
}
export interface GamingRental {
  id: string; rentalNumber: string; customerName: string; customerPhone?: string; productName: string; serialNumber?: string; status: string; rentalStartDate: string; rentalEndDate: string; daysRented: number;
  pricePerDay: number; totalPrice: number; depositAmount: number; depositRefunded: number; paidAmount: number; remainingAmount: number; lateFee: number; damageFee: number;
}
export interface RentalSummary { active: number; overdue: number; returned: number; totalRevenue: number; collected: number; due: number; depositsHeld: number }
export interface GamingTournament { id: string; tournamentNumber: string; name: string; gameName: string; platform: string; maxParticipants: number; currentParticipants: number; entryFee: number; prizePool: number; scheduledDate: string; status: string; winnerName?: string }
export interface TopupInventoryRow { provider: string; topupType: string; denomination: number; count: number; sellingPrice: number; avgCost: number; nearestExpiry?: string | null }
export interface TopupSummary { totalCards: number; available: number; sold: number; redeemed: number; totalRevenue: number; totalProfit: number; stockValue: number }
export interface GamingOverview {
  totals?: { totalStations: number; activeStations: number; activeSessions: number };
  inventory?: { availableTopups: number; upcomingTournaments: number };
  rentals?: { active: number; overdue: number };
  today?: { cafeRevenue: number; topupRevenue: number; rentalRevenue: number; totalRevenue: number; sessionsCount: number };
  monthly?: { totalRevenue: number; topupProfit: number };
}

export interface CounterCardKind extends TopupInventoryRow { productId: string; name: string; sku: string }
export interface GivenCard { id: string; topupNumber: string; provider: string; topupType: string; denominationValue: number; cardCode?: string | null; cardPin?: string | null; cardSerial?: string | null; expiryDate?: string | null }
export interface GamingProductProfile {
  id: string; productId: string; categoryType?: string; platform: string; conditionType: string; publisher?: string; genre: string[]; ageRating?: string; region?: string; playerCount?: string;
  onlineMultiplayer: boolean; includedAccessories: string[]; numberOfControllers: number; isRentable: boolean; rentalPricePerHour?: number; rentalPricePerDay?: number; rentalDeposit?: number;
  usedPrice?: number; tradeInValue?: number; isFeatured: boolean; isBestSeller: boolean; isNewRelease: boolean; isPreOrder: boolean; notes?: string; product?: { id: string; name: string; price: number } | null;
}

export const gamingApi = {
  profiles: {
    list: () => http.get<GamingProductProfile[]>('/gaming/products'),
    upsert: (d: Record<string, unknown>) => http.post<GamingProductProfile>('/gaming/products', d),
  },
  overview: () => http.get<GamingOverview>('/gaming/dashboard/overview'),
  stations: {
    list: (p?: { active?: boolean }) => http.get<GamingStation[]>('/gaming/stations', p),
    create: (d: Record<string, unknown>) => http.post<GamingStation>('/gaming/stations', d),
    update: (id: string, d: Record<string, unknown>) => http.patch<GamingStation>(`/gaming/stations/${id}`, d),
    maintenance: (id: string, notes?: string) => http.post<GamingStation>(`/gaming/stations/${id}/toggle-maintenance`, { notes }),
  },
  sessions: {
    active: () => http.get<GamingSession[]>('/gaming/cafe-sessions/active'),
    start: (d: { stationId: string; customerName?: string; customerPhone?: string; playerCount?: number; gameSelected?: string; ratePerHour?: number }) => http.post<GamingSession>('/gaming/cafe-sessions/start', d),
    counter: () => http.get<{ timeProductId: string; sessions: GamingSession[] }>('/gaming/cafe-sessions/counter'),
    closeSale: (saleId: string, sessions: Array<{ id: string; amount: number; minutes: number }>) => http.post<{ saleNumber: string; sessions: unknown[] }>('/gaming/cafe-sessions/close-sale', { saleId, sessions }),
    pause: (id: string) => http.post<GamingSession>(`/gaming/cafe-sessions/${id}/pause`),
    resume: (id: string) => http.post<GamingSession>(`/gaming/cafe-sessions/${id}/resume`),
    end: (id: string, d: { foodCharges?: number; additionalCharges?: number; discount?: number; paidAmount?: number; paymentMethod?: string }) => http.post<GamingSession & { saleId?: string | null; change?: number }>(`/gaming/cafe-sessions/${id}/end`, d),
    cancel: (id: string, reason: string) => http.post<GamingSession>(`/gaming/cafe-sessions/${id}/cancel`, { reason }),
    page: (p: { status?: string; page: number; limit: number }) => http.get<{ items: GamingSession[]; total: number; totals: { ended: number; amount: number; minutes: number } }>('/gaming/cafe-sessions', p),
  },
  rentals: {
    page: (p: { status?: string; search?: string; page: number; limit: number }) => http.get<{ items: GamingRental[]; total: number }>('/gaming/rentals', p),
    summary: () => http.get<RentalSummary>('/gaming/rentals/summary'),
    create: (d: Record<string, unknown>) => http.post<GamingRental>('/gaming/rentals', d),
    returnRental: (id: string, d: { conditionAtReturn?: string; damageFee?: number; lateFee?: number; paidAmount?: number; paymentMethod?: string }) => http.post<GamingRental>(`/gaming/rentals/${id}/return`, d),
  },
  tournaments: {
    list: () => http.get<GamingTournament[]>('/gaming/tournaments'),
    create: (d: Record<string, unknown>) => http.post<GamingTournament>('/gaming/tournaments', d),
    register: (id: string, d: { name: string; phone?: string; paidAmount?: number; paymentMethod?: string }) => http.post(`/gaming/tournaments/${id}/register`, d),
    start: (id: string) => http.post<GamingTournament>(`/gaming/tournaments/${id}/start`),
    complete: (id: string, winnerName: string, runnerUpName?: string) => http.post<GamingTournament>(`/gaming/tournaments/${id}/complete`, { winnerName, runnerUpName }),
    cancel: (id: string, reason: string) => http.post<GamingTournament>(`/gaming/tournaments/${id}/cancel`, { reason }),
  },
  topups: {
    counter: () => http.get<CounterCardKind[]>('/gaming/digital-topups/counter'),
    assignSale: (saleId: string) => http.post<{ saleNumber: string; missing: number; cards: GivenCard[] }>('/gaming/digital-topups/assign-sale', { saleId }),
    inventory: () => http.get<TopupInventoryRow[]>('/gaming/digital-topups/inventory'),
    summary: () => http.get<TopupSummary>('/gaming/digital-topups/summary'),
    bulkCreate: (d: { provider: string; topupType: string; denominationValue: number; costPrice: number; sellingPrice: number; cards: Array<{ cardCode: string; cardPin?: string }> }) => http.post<{ created: number }>('/gaming/digital-topups/bulk', d),
  },
};
