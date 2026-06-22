import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';

export interface StockReportRow {
  productId: string;
  productName: string;
  sku?: string | null;
  barcode?: string | null;
  unit: string;
  category?: string | null;
  categoryColor?: string | null;
  brand?: string | null;

  // Pricing
  costPrice: number;
  salePrice: number;
  wholesalePrice?: number | null;

  // Stock (smart per industry)
  stock: number;              // Total available (sqft for carpet, count for IMEI, qty for standard)
  lowStockAlert: number;
  stockValue: number;         // stock × costPrice
  retailValue: number;        // stock × salePrice
  potentialProfit: number;    // retailValue - stockValue

  // Industry-specific extras
  industryType: 'STANDARD' | 'CARPET' | 'MOBILE' | 'WEIGHT_BASED';
  carpetRollCount?: number;
  carpetCutPiecesCount?: number;
  imeiCount?: number;
  variantCount?: number;

  // Status
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  isActive: boolean;
  isFeatured: boolean;

  // Images
  primaryImage?: string | null;
  variants?: Array<{
    id: string;
    name: string;
    stock: number;
    imageUrl?: string | null;
    colorHex?: string | null;
  }>;
}

export interface StockReportSummary {
  totalProducts: number;
  totalActiveProducts: number;
  totalStockValue: number;
  totalRetailValue: number;
  totalPotentialProfit: number;

  // Status counts
  inStockCount: number;
  lowStockCount: number;
  outOfStockCount: number;

  // Industry counts
  standardCount: number;
  carpetCount: number;
  mobileCount: number;

  // Category breakdown
  categoryBreakdown: Array<{
    categoryName: string;
    productCount: number;
    stockValue: number;
  }>;
}

export interface StockReportResponse {
  rows: StockReportRow[];
  summary: StockReportSummary;
  generatedAt: string;
  tenantName?: string;
}

@Injectable()
export class StockReportService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(
    user: AuthenticatedUser,
    filters?: {
      categoryId?: string;
      brandId?: string;
      stockStatus?: 'all' | 'in' | 'low' | 'out';
      isActive?: boolean;
      shopId?: string;
    },
  ): Promise<StockReportResponse> {
    // Fetch all products with their relationships
    const products = await this.prisma.product.findMany({
      where: {
        tenantId: user.tenantId,
        ...(filters?.categoryId && { categoryId: filters.categoryId }),
        ...(filters?.brandId && { brandId: filters.brandId }),
        ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
      },
      include: {
        category: true,
        brand: true,
        images: {
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
          take: 1,
        },
        variants: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            stock: true,
            imageUrl: true,
            colorHex: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Fetch carpet data (rolls + cut pieces aggregated)
    const productIds = products.map((p) => p.id);

    const [carpetRolls, carpetCutPieces, imeis] = await Promise.all([
      this.prisma.carpetRoll.groupBy({
        by: ['productId'],
        where: {
          tenantId: user.tenantId,
          productId: { in: productIds },
          status: 'ACTIVE',
        },
        _sum: { remainingSqft: true },
        _count: { id: true },
      }),
      this.prisma.carpetCutPiece.groupBy({
        by: ['productId'],
        where: {
          tenantId: user.tenantId,
          productId: { in: productIds },
          status: 'AVAILABLE',
        },
        _sum: { totalSqft: true },
        _count: { id: true },
      }),
      this.prisma.productImei.groupBy({
        by: ['productId'],
        where: {
          tenantId: user.tenantId,
          productId: { in: productIds },
          status: 'IN_STOCK',
        },
        _count: { id: true },
      }),
    ]);

    const carpetRollsMap = new Map<string, { sqft: number; count: number }>();
    carpetRolls.forEach((r) => {
      carpetRollsMap.set(r.productId, {
        sqft: Number(r._sum.remainingSqft || 0),
        count: r._count.id,
      });
    });

    const carpetCutsMap = new Map<string, { sqft: number; count: number }>();
    carpetCutPieces.forEach((r) => {
      carpetCutsMap.set(r.productId, {
        sqft: Number(r._sum.totalSqft || 0),
        count: r._count.id,
      });
    });

    const imeiMap = new Map<string, number>();
    imeis.forEach((r) => {
      imeiMap.set(r.productId, r._count.id);
    });

    // Build rows
    const rows: StockReportRow[] = products.map((p) => {
      const unit = (p.unit || 'pcs').toLowerCase();
      const isCarpet = ['sqft', 'sqm', 'sqyd'].includes(unit);
      const isMobileWithImei = imeiMap.has(p.id);
      const isWeightBased = ['kg', 'gram', 'liter', 'ml'].includes(unit);

      let industryType: StockReportRow['industryType'] = 'STANDARD';
      let stock = Number(p.stock || 0);
      let carpetRollCount: number | undefined;
      let carpetCutPiecesCount: number | undefined;
      let imeiCount: number | undefined;

      if (isCarpet) {
        industryType = 'CARPET';
        const rollData = carpetRollsMap.get(p.id) || { sqft: 0, count: 0 };
        const cutData = carpetCutsMap.get(p.id) || { sqft: 0, count: 0 };
        stock = Number((rollData.sqft + cutData.sqft).toFixed(2));
        carpetRollCount = rollData.count;
        carpetCutPiecesCount = cutData.count;
      } else if (isMobileWithImei) {
        industryType = 'MOBILE';
        imeiCount = imeiMap.get(p.id) || 0;
        stock = imeiCount;
      } else if (isWeightBased) {
        industryType = 'WEIGHT_BASED';
      }

      const lowStockAlert = Number(p.lowStockAlert || 5);
      const costPrice = Number(p.costPrice || 0);
      const salePrice = Number(p.price || 0);
      const stockValue = Number((stock * costPrice).toFixed(2));
      const retailValue = Number((stock * salePrice).toFixed(2));
      const potentialProfit = Number((retailValue - stockValue).toFixed(2));

      let stockStatus: StockReportRow['stockStatus'] = 'IN_STOCK';
      if (stock <= 0) stockStatus = 'OUT_OF_STOCK';
      else if (stock <= lowStockAlert) stockStatus = 'LOW_STOCK';

      return {
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        barcode: p.barcode,
        unit: p.unit,
        category: p.category?.name || null,
        categoryColor: p.category?.color || null,
        brand: p.brand?.name || null,

        costPrice,
        salePrice,
        wholesalePrice: p.wholesalePrice ? Number(p.wholesalePrice) : null,

        stock,
        lowStockAlert,
        stockValue,
        retailValue,
        potentialProfit,

        industryType,
        carpetRollCount,
        carpetCutPiecesCount,
        imeiCount,
        variantCount: p.variants.length,

        stockStatus,
        isActive: p.isActive,
        isFeatured: p.isFeatured,

        primaryImage: p.images[0]?.url || null,
        variants: p.variants.map((v) => ({
          id: v.id,
          name: v.name,
          stock: Number(v.stock || 0),
          imageUrl: v.imageUrl,
          colorHex: v.colorHex,
        })),
      };
    });

    // Apply status filter
    let filteredRows = rows;
    if (filters?.stockStatus === 'in') {
      filteredRows = rows.filter((r) => r.stockStatus === 'IN_STOCK');
    } else if (filters?.stockStatus === 'low') {
      filteredRows = rows.filter((r) => r.stockStatus === 'LOW_STOCK');
    } else if (filters?.stockStatus === 'out') {
      filteredRows = rows.filter((r) => r.stockStatus === 'OUT_OF_STOCK');
    }

    // Build summary
    const summary: StockReportSummary = {
      totalProducts: filteredRows.length,
      totalActiveProducts: filteredRows.filter((r) => r.isActive).length,
      totalStockValue: filteredRows.reduce((sum, r) => sum + r.stockValue, 0),
      totalRetailValue: filteredRows.reduce((sum, r) => sum + r.retailValue, 0),
      totalPotentialProfit: filteredRows.reduce((sum, r) => sum + r.potentialProfit, 0),

      inStockCount: filteredRows.filter((r) => r.stockStatus === 'IN_STOCK').length,
      lowStockCount: filteredRows.filter((r) => r.stockStatus === 'LOW_STOCK').length,
      outOfStockCount: filteredRows.filter((r) => r.stockStatus === 'OUT_OF_STOCK').length,

      standardCount: filteredRows.filter((r) => r.industryType === 'STANDARD').length,
      carpetCount: filteredRows.filter((r) => r.industryType === 'CARPET').length,
      mobileCount: filteredRows.filter((r) => r.industryType === 'MOBILE').length,

      categoryBreakdown: this.buildCategoryBreakdown(filteredRows),
    };

    // Fetch tenant name
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { name: true },
    });

    return {
      rows: filteredRows,
      summary,
      generatedAt: new Date().toISOString(),
      tenantName: tenant?.name,
    };
  }

  private buildCategoryBreakdown(rows: StockReportRow[]) {
    const map = new Map<string, { count: number; value: number }>();
    for (const row of rows) {
      const cat = row.category || 'Uncategorized';
      const existing = map.get(cat) || { count: 0, value: 0 };
      existing.count += 1;
      existing.value += row.stockValue;
      map.set(cat, existing);
    }
    return Array.from(map.entries())
      .map(([categoryName, data]) => ({
        categoryName,
        productCount: data.count,
        stockValue: Number(data.value.toFixed(2)),
      }))
      .sort((a, b) => b.stockValue - a.stockValue);
  }


  // ═══════════════════════════════════════════════════════
  // GET PRODUCT DETAIL — Variants/Rolls/IMEIs for expand view
  // ═══════════════════════════════════════════════════════

  async getProductDetail(user: AuthenticatedUser, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId: user.tenantId },
      include: {
        variants: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        },
      },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    const unit = (product.unit || 'pcs').toLowerCase();
    const isCarpet = ['sqft', 'sqm', 'sqyd'].includes(unit);

    // Fetch carpet rolls if applicable
    let carpetRolls: any[] = [];
    let carpetCutPieces: any[] = [];
    if (isCarpet) {
      [carpetRolls, carpetCutPieces] = await Promise.all([
        this.prisma.carpetRoll.findMany({
          where: {
            tenantId: user.tenantId,
            productId,
            status: 'ACTIVE',
          },
          include: {
            variant: {
              select: { id: true, name: true, colorHex: true },
            },
            shop: {
              select: { id: true, name: true },
            },
          },
          orderBy: { rollNumber: 'asc' },
        }),
        this.prisma.carpetCutPiece.findMany({
          where: {
            tenantId: user.tenantId,
            productId,
            status: 'AVAILABLE',
          },
          include: {
            variant: {
              select: { id: true, name: true, colorHex: true },
            },
            sourceRoll: {
              select: { id: true, rollNumber: true },
            },
          },
          orderBy: { pieceCode: 'asc' },
        }),
      ]);
    }

    // Fetch IMEIs if applicable
    const imeis = await this.prisma.productImei.findMany({
      where: {
        tenantId: user.tenantId,
        productId,
        status: 'IN_STOCK',
      },
      include: {
        variant: {
          select: { id: true, name: true, colorHex: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return {
      productId: product.id,
      productName: product.name,
      unit: product.unit,
      variants: product.variants.map((v) => ({
        id: v.id,
        name: v.name,
        sku: v.sku,
        barcode: v.barcode,
        color: v.color,
        colorHex: v.colorHex,
        size: v.size,
        price: Number(v.price),
        costPrice: Number(v.costPrice),
        stock: Number(v.stock),
        lowStockAlert: Number(v.lowStockAlert),
        imageUrl: v.imageUrl,
        isActive: v.isActive,
      })),
      carpetRolls: carpetRolls.map((r) => ({
        id: r.id,
        rollNumber: r.rollNumber,
        designCode: r.designCode,
        widthFt: Number(r.widthFt),
        widthInch: Number(r.widthInch),
        originalLengthFt: Number(r.originalLengthFt),
        remainingLengthFt: Number(r.remainingLengthFt),
        remainingSqft: Number(r.remainingSqft),
        costPerSqft: Number(r.costPerSqft),
        salePricePerSqft: Number(r.salePricePerSqft),
        status: r.status,
        rackNumber: r.rackNumber,
        quality: r.quality,
        pile: r.pile,
        variantName: r.variant?.name,
        variantColorHex: r.variant?.colorHex,
        shopName: r.shop?.name,
      })),
      carpetCutPieces: carpetCutPieces.map((cp) => ({
        id: cp.id,
        pieceCode: cp.pieceCode,
        widthFt: Number(cp.widthFt),
        lengthFt: Number(cp.lengthFt),
        totalSqft: Number(cp.totalSqft),
        salePrice: Number(cp.salePrice),
        status: cp.status,
        condition: cp.condition,
        rackNumber: cp.rackNumber,
        variantName: cp.variant?.name,
        variantColorHex: cp.variant?.colorHex,
        sourceRollNumber: cp.sourceRoll?.rollNumber,
      })),
      imeis: imeis.map((i) => ({
        id: i.id,
        imei1: i.imei1,
        imei2: i.imei2,
        ptaStatus: i.ptaStatus,
        color: i.color,
        costPrice: Number(i.costPrice),
        warrantyExpiry: i.warrantyExpiry,
        variantName: i.variant?.name,
      })),
    };
  }

}
