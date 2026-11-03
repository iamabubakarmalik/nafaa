/**
 * Bookstore endpoints (same paths and shapes as apps/web/src/industries/bookstore/api):
 * schools and their book lists, publishers, authors, book / stationery / art
 * profiles, rentals and the dashboard. They need the server; screens show the
 * last saved data offline.
 */

import { apiClient } from '@/core/api/client';

export interface School {
  id: string; name: string; code?: string; type?: string; board?: string; medium?: string; address?: string; city?: string; phone?: string; email?: string;
  principalName?: string; contactPerson?: string; contactPhone?: string; discountPct: number; creditDays: number; creditLimit: number; notes?: string;
  totalOrders: number; totalRevenue: number; outstandingAmount: number; isActive: boolean; _count?: { bookLists: number };
  customer?: { id: string; balance: number; creditLimit: number } | null;
}
export interface SchoolListItem {
  id: string; productId?: string | null; itemName: string; itemType: string; quantity: number; unit: string; unitPrice: number; discount: number; total: number;
  subject?: string | null; isRequired: boolean; isOptional: boolean; notes?: string | null; displayOrder: number;
}
export type ListStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
export interface SchoolBookList {
  id: string; schoolId: string; session: string; grade: string; section?: string | null; medium?: string | null; title: string; description?: string | null;
  status: ListStatus; discountPct: number; bundlePrice?: number | null; totalItems: number; totalOrders: number; totalRevenue: number; items: SchoolListItem[];
  school?: { id: string; name: string; board?: string | null };
}
/** An active list as the counter sees it, with today's product prices. */
export interface PosSchoolList {
  id: string; title: string; grade: string; section?: string | null; session: string; school: { id: string; name: string }; bundlePrice: number | null; discountPct: number;
  items: Array<{ id: string; productId: string | null; itemName: string; itemType: string; quantity: number; unitPrice: number; total: number; isOptional: boolean; subject?: string | null; currentPrice?: number }>;
}

export interface Publisher {
  id: string; name: string; code?: string; country?: string; city?: string; phone?: string; email?: string; contactPerson?: string; defaultDiscountPct: number; paymentTerms?: string;
  creditDays: number; totalBooks: number; totalRevenue: number; isActive: boolean; _count?: { books: number }; supplierId?: string | null;
  supplier?: { id: string; name: string; outstandingDue: number; totalPurchased: number } | null;
}
export interface Author {
  id: string; name: string; penName?: string; nationality?: string; bornYear?: number; diedYear?: number; bio?: string; genres: string[]; languages: string[];
  totalBooks: number; isFeatured: boolean; isActive: boolean; _count?: { bookAuthors: number };
}

export interface BookProfile {
  id: string; productId: string; isbn10?: string; isbn13?: string; title: string; category: string; binding: string; condition: string; publisherId?: string; edition?: string;
  publishYear?: number; language: string; isTextbook: boolean; grade?: string; subject?: string; board?: string; mrp?: number; reorderLevel: number;
  isRentable: boolean; rentalPricePerWeek: number; rentalDeposit: number; publisher?: { id: string; name: string } | null; bookAuthors?: Array<{ authorId: string; author?: { name: string } }>;
  product?: { id: string; name: string; price: number; stock: number; lowStockAlert?: number | null; unit?: string } | null;
}
export type BookFact =
  | { kind: 'BOOK'; productId: string; isbn10?: string | null; isbn13?: string | null; category: string; edition?: string | null; publishYear?: number | null; language?: string | null; isTextbook: boolean;
      grade?: string | null; subject?: string | null; board?: string | null; isRentable: boolean; rentalPricePerWeek: number; rentalDeposit: number; condition: string; publisher: string | null; authors: string[] }
  | { kind: 'STATIONERY'; productId: string; category: string; brand?: string | null; color?: string | null; size?: string | null; isSchoolItem: boolean }
  | { kind: 'ART'; productId: string; category: string; brand?: string | null; color?: string | null; size?: string | null; grade?: string | null };
export interface SupplyProfile {
  id: string; productId: string; category: string; brand?: string | null; color?: string | null; size?: string | null; reorderLevel?: number; isSchoolItem?: boolean; isProfessional?: boolean;
  product?: { name: string; price: number; stock: number; lowStockAlert?: number | null; unit?: string };
}

export interface BookRental {
  id: string; rentalNumber: string; customerId?: string; productId: string; customerName?: string; customerPhone?: string; quantity: number; rentalPrice: number; depositAmount: number;
  issuedAt: string; dueDate: string; returnedAt?: string; status: 'ACTIVE' | 'RETURNED' | 'OVERDUE' | 'LOST' | 'DAMAGED' | 'CANCELLED'; fineAmount: number; finePerDay: number; notes?: string;
}

export interface BookstoreOverview {
  totals?: { publishers: number; authors: number; books: number; stationery: number; artSupplies: number; schools: number };
  operations?: { activeSchoolLists: number; activeRentals: number; overdueRentals: number };
  catalog?: { bestSellers: number; newArrivals: number; featuredBooks: number };
  overdueDetail?: Array<{ id: string; rentalNumber: string; customerName?: string | null; customerPhone?: string | null; dueDate: string; quantity?: number; finePerDay?: number; fineAmount?: number }>;
  booksByPublisher?: Array<{ publisher?: { id: string; name: string } | null; count: number }>;
  textbooksByGrade?: Array<{ grade: string | null; _count?: Record<string, number> }>;
}

const get = <T>(path: string, params?: object) => apiClient.get<T>(path, { params }).then((r) => r.data);
const post = <T>(path: string, body?: object) => apiClient.post<T>(path, body ?? {}).then((r) => r.data);
const patch = <T>(path: string, body?: object) => apiClient.patch<T>(path, body ?? {}).then((r) => r.data);
const del = <T>(path: string) => apiClient.delete<T>(path).then((r) => r.data);

export const schoolsApi = {
  create: (data: Partial<School>) => post<School>('/bookstore/schools', data),
  list: (params?: object) => get<School[]>('/bookstore/schools', params),
  update: (id: string, data: Partial<School>) => patch<School>(`/bookstore/schools/${id}`, data),
  openKhata: (id: string) => post<{ id: string; name: string; balance: number }>(`/bookstore/schools/${id}/khata`),
  remove: (id: string) => del(`/bookstore/schools/${id}`),
};
export const schoolListsApi = {
  create: (data: object) => post<SchoolBookList>('/bookstore/school-lists', data),
  list: (params?: object) => get<SchoolBookList[]>('/bookstore/school-lists', params),
  forPos: () => get<PosSchoolList[]>('/bookstore/school-lists/for-pos'),
  update: (id: string, data: object) => patch<SchoolBookList>(`/bookstore/school-lists/${id}`, data),
  updateStatus: (id: string, status: string) => post<SchoolBookList>(`/bookstore/school-lists/${id}/status`, { status }),
  duplicate: (id: string, newSession: string) => post<SchoolBookList>(`/bookstore/school-lists/${id}/duplicate`, { newSession }),
  remove: (id: string) => del(`/bookstore/school-lists/${id}`),
};
export interface PublisherPurchaseCosts { lines: Array<{ productId: string; cost: number }>; publishers: Array<{ name: string; discountPct: number }> }
export const publishersApi = {
  create: (data: Partial<Publisher>) => post<Publisher>('/bookstore/publishers', data),
  list: (params?: { search?: string; active?: boolean }) => get<Publisher[]>('/bookstore/publishers', params),
  seedPakistani: () => post<{ created: number; total: number }>('/bookstore/publishers/seed-pakistani'),
  update: (id: string, data: Partial<Publisher>) => patch<Publisher>(`/bookstore/publishers/${id}`, data),
  openSupplier: (id: string) => post<{ id: string; name: string }>(`/bookstore/publishers/${id}/supplier`),
  /** Cost of each of a publisher's books bought from this supplier (list price less its discount). */
  purchaseCosts: (supplierId: string) => get<PublisherPurchaseCosts>('/bookstore/publishers/purchase-costs', { supplierId }),
  remove: (id: string) => del(`/bookstore/publishers/${id}`),
};
export const authorsApi = {
  create: (data: Partial<Author>) => post<Author>('/bookstore/authors', data),
  list: (params?: object) => get<Author[]>('/bookstore/authors', params),
  update: (id: string, data: Partial<Author>) => patch<Author>(`/bookstore/authors/${id}`, data),
  toggleFeatured: (id: string) => post<Author>(`/bookstore/authors/${id}/toggle-featured`),
  remove: (id: string) => del(`/bookstore/authors/${id}`),
};
export const bookProfilesApi = {
  upsert: (data: object) => post<BookProfile>('/bookstore/book-profiles', data),
  list: (params?: object) => get<BookProfile[]>('/bookstore/book-profiles', params),
  facts: () => get<BookFact[]>('/bookstore/book-profiles/facts'),
  byProduct: (productId: string) => get<BookProfile | null>(`/bookstore/book-profiles/by-product/${productId}`),
  byIsbn: (isbn: string) => get<BookProfile | null>(`/bookstore/book-profiles/by-isbn/${encodeURIComponent(isbn)}`),
  byAcademic: (params: { board?: string; grade?: string; subject?: string }) => get<BookProfile[]>('/bookstore/book-profiles/by-academic', params),
};
export const stationeryApi = {
  upsert: (data: object) => post<SupplyProfile>('/bookstore/stationery-profiles', data),
  list: (params?: object) => get<SupplyProfile[]>('/bookstore/stationery-profiles', params),
  byProduct: (productId: string) => get<SupplyProfile | null>(`/bookstore/stationery-profiles/by-product/${productId}`),
};
export const artApi = {
  upsert: (data: object) => post<SupplyProfile>('/bookstore/art-supply-profiles', data),
  list: (params?: object) => get<SupplyProfile[]>('/bookstore/art-supply-profiles', params),
  byProduct: (productId: string) => get<SupplyProfile | null>(`/bookstore/art-supply-profiles/by-product/${productId}`),
};
export const rentalsApi = {
  create: (data: object) => post<BookRental>('/bookstore/rentals', data),
  list: (params?: object) => get<BookRental[]>('/bookstore/rentals', params),
  return: (id: string, data: object) => post<BookRental>(`/bookstore/rentals/${id}/return`, data),
  markLost: (id: string) => post<BookRental>(`/bookstore/rentals/${id}/lost`),
  cancel: (id: string) => post<BookRental>(`/bookstore/rentals/${id}/cancel`),
};
export const bookstoreDashboardApi = { overview: () => get<BookstoreOverview>('/bookstore/dashboard/overview') };
