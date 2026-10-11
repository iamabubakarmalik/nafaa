/**
 * Bookstore numbers for the dashboard: book rentals, school lists, textbook
 * grades and catalog counts. Every bookstore widget calls this; React Query
 * shares the single request between them.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { bookstoreDashboardApi } from '../api/dashboard.api';

const MINUTE = 60_000;
const DAY = 86_400_000;

interface OverdueRental {
  id: string;
  rentalNumber: string;
  customerName?: string | null;
  customerPhone?: string | null;
  dueDate: string;
  quantity?: number;
  finePerDay?: number;
  fineAmount?: number;
}

interface PublisherCount {
  publisher?: { id: string; name: string; country?: string | null } | null;
  count: number;
}

/** Prisma groupBy rows; the count key is the grouped field (or `_all`). */
interface GroupRow {
  _count?: Record<string, number>;
}

interface BookstoreOverview {
  totals?: { publishers: number; authors: number; books: number; stationery: number; artSupplies: number; schools: number };
  operations?: { activeSchoolLists: number; activeRentals: number; overdueRentals: number };
  catalog?: { bestSellers: number; newArrivals: number; featuredBooks: number };
  overdueDetail?: OverdueRental[];
  booksByPublisher?: PublisherCount[];
  textbooksByGrade?: Array<GroupRow & { grade: string | null }>;
}

const groupCount = (r: GroupRow) => {
  const c = r._count ?? {};
  return Number(c._all ?? Object.values(c)[0] ?? 0);
};

export function useBookstoreOps() {
  const overview = useQuery({
    queryKey: ['bookstore-dashboard'],
    queryFn: () => bookstoreDashboardApi.overview().catch(() => null) as Promise<BookstoreOverview | null>,
    refetchInterval: MINUTE,
  });

  return useMemo(() => {
    const d: BookstoreOverview = overview.data ?? {};
    const totals = d.totals ?? { publishers: 0, authors: 0, books: 0, stationery: 0, artSupplies: 0, schools: 0 };
    const ops = d.operations ?? { activeSchoolLists: 0, activeRentals: 0, overdueRentals: 0 };
    const catalog = d.catalog ?? { bestSellers: 0, newArrivals: 0, featuredBooks: 0 };

    const overdue = (d.overdueDetail ?? []).map((r) => {
      const daysLate = Math.max(Math.floor((Date.now() - new Date(r.dueDate).getTime()) / DAY), 0);
      // Stored fineAmount is only set on return; estimate it while the book is still out.
      const fine = Number(r.fineAmount || 0) || daysLate * Number(r.finePerDay || 0) * Number(r.quantity || 1);
      return { ...r, daysLate, fine };
    });

    const grades = (d.textbooksByGrade ?? [])
      .filter((g) => g.grade)
      .map((g) => ({ grade: g.grade as string, count: groupCount(g) }))
      .sort((a, b) => b.count - a.count);

    return {
      totals,
      rentals: {
        active: ops.activeRentals,
        overdue: ops.overdueRentals,
        list: overdue,
        fine: overdue.reduce((s, r) => s + r.fine, 0),
        weekLate: overdue.filter((r) => r.daysLate >= 7).length,
      },
      school: { lists: ops.activeSchoolLists, schools: totals.schools, grades },
      catalog,
      publishers: (d.booksByPublisher ?? []).filter((p) => p.publisher),
      loading: overview.isLoading,
    };
  }, [overview.data, overview.isLoading]);
}
