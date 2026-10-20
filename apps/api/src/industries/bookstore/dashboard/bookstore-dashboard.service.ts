import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { dayStart } from '../bookstore-common';

@Injectable()
export class BookstoreDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: AuthenticatedUser, scope?: ShopScope) {
    // A rental is overdue from the shop day after its due date (same rule as the rentals list).
    const today = dayStart();
    const late = { status: { in: ['ACTIVE', 'OVERDUE'] as Array<'ACTIVE' | 'OVERDUE'> }, dueDate: { lt: today } };

    const tenantFilter = { tenantId: user.tenantId };
    // Rentals of the selected branch; rentals without a branch show everywhere.
    const rentalFilter = { ...tenantFilter, ...(scope?.shopId && { AND: [scope.whereLoose] }) };

    // Parallel queries (fast)
    const [
      totalPublishers,
      totalAuthors,
      totalBooks,
      totalStationery,
      totalArtSupplies,
      totalSchools,
      activeSchoolLists,
      activeRentals,
      overdueRentals,
      bestSellers,
      newArrivals,
      featuredBooks,
    ] = await Promise.all([
      this.prisma.publisher.count({ where: { ...tenantFilter, isActive: true } }),
      this.prisma.author.count({ where: { ...tenantFilter, isActive: true } }),
      this.prisma.bookProfile.count({ where: tenantFilter }),
      this.prisma.stationeryProfile.count({ where: tenantFilter }),
      this.prisma.artSupplyProfile.count({ where: tenantFilter }),
      this.prisma.school.count({ where: { ...tenantFilter, isActive: true } }),
      this.prisma.schoolBookList.count({ where: { ...tenantFilter, status: 'ACTIVE' } }),
      this.prisma.bookRental.count({ where: { ...rentalFilter, status: { in: ['ACTIVE', 'OVERDUE'] } } }),
      this.prisma.bookRental.count({ where: { ...rentalFilter, ...late } }),
      this.prisma.bookProfile.count({ where: { ...tenantFilter, isBestSeller: true } }),
      this.prisma.bookProfile.count({ where: { ...tenantFilter, isNewArrival: true } }),
      this.prisma.bookProfile.count({ where: { ...tenantFilter, isFeatured: true } }),
    ]);

    // Overdue rentals detail
    const overdueDetail = await this.prisma.bookRental.findMany({
      where: { ...rentalFilter, ...late },
      orderBy: { dueDate: 'asc' },
      take: 10,
    });

    // Books by category
    const booksByCategory = await this.prisma.bookProfile.groupBy({
      by: ['category'],
      where: tenantFilter,
      _count: { category: true },
      orderBy: {
        _count: { category: 'desc' },
      },
    });

    // Books by publisher (FIXED)
    const booksByPublisherRaw = await this.prisma.bookProfile.groupBy({
      by: ['publisherId'],
      where: {
        ...tenantFilter,
        publisherId: { not: null },
      },
      _count: {
        publisherId: true,
      },
      orderBy: {
        _count: {
          publisherId: 'desc',
        },
      },
      take: 5,
    });

    const pubIds = booksByPublisherRaw.map(p => p.publisherId!) as string[];

    const publishers = await this.prisma.publisher.findMany({
      where: { tenantId: user.tenantId, id: { in: pubIds } },
    });

    const pubMap = new Map(publishers.map(p => [p.id, p]));

    const booksByPublisher = booksByPublisherRaw.map(p => ({
      publisher: pubMap.get(p.publisherId!),
      count: p._count.publisherId,
    }));

    // Textbooks by grade
    const textbooksByGrade = await this.prisma.bookProfile.groupBy({
      by: ['grade'],
      where: {
        ...tenantFilter,
        isTextbook: true,
        grade: { not: null },
      },
      _count: { grade: true },
      orderBy: {
        _count: { grade: 'desc' },
      },
    });

    // Final response
    return {
      totals: {
        publishers: totalPublishers,
        authors: totalAuthors,
        books: totalBooks,
        stationery: totalStationery,
        artSupplies: totalArtSupplies,
        schools: totalSchools,
      },

      operations: {
        activeSchoolLists,
        activeRentals,
        overdueRentals,
      },

      catalog: {
        bestSellers,
        newArrivals,
        featuredBooks,
      },

      overdueDetail,
      booksByCategory,
      booksByPublisher,
      textbooksByGrade,
    };
  }
}