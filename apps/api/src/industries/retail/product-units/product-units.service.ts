import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CreateProductUnitDto } from './dto/create-product-unit.dto';
import { UpdateProductUnitDto } from './dto/update-product-unit.dto';

@Injectable()
export class ProductUnitsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateProductUnitDto) {
    // Verify product belongs to tenant
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId: user.tenantId },
    });
    if (!product) throw new NotFoundException('Product not found');

    // If setting as base, unset other base units
    if (dto.isBase) {
      await this.prisma.productUnit.updateMany({
        where: {
          productId: dto.productId,
          variantId: dto.variantId ?? null,
          isBase: true,
        },
        data: { isBase: false },
      });
    }

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.productUnit.updateMany({
        where: {
          productId: dto.productId,
          variantId: dto.variantId ?? null,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    // Barcode uniqueness check within tenant
    if (dto.barcode) {
      const dup = await this.prisma.productUnit.findFirst({
        where: { tenantId: user.tenantId, barcode: dto.barcode },
      });
      if (dup) throw new BadRequestException(`Barcode ${dto.barcode} already exists`);
    }

    return this.prisma.productUnit.create({
      data: {
        tenantId: user.tenantId,
        ...dto,
      },
    });
  }

  /**
   * Tenant ki sari chalti hui units — POS ek dafa le kar rakh leta hai.
   *
   * Har scan par server se poochna do wajah se bura tha: counter par
   * har beep ke baad aadha second ka intezaar, aur net jate hi dozen/
   * carton ka barcode bilkul kaam chhor deta tha. Ab list POS ke paas
   * hoti hai, match wahin ho jata hai.
   *
   * Sirf zaroori khaane — 5000 units ka payload bhi chhota rehta hai.
   */
  async findAll(user: AuthenticatedUser) {
    return this.prisma.productUnit.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      select: {
        id: true, productId: true, variantId: true,
        unitName: true, unitLabel: true,
        conversionRate: true, isBase: true, isDefault: true,
        price: true, wholesalePrice: true, mrpPrice: true,
        barcode: true, sku: true, sortOrder: true,
      },
      orderBy: [{ productId: 'asc' }, { isBase: 'desc' }, { sortOrder: 'asc' }],
    });
  }

  async findByProduct(user: AuthenticatedUser, productId: string, variantId?: string) {
    return this.prisma.productUnit.findMany({
      where: {
        tenantId: user.tenantId,
        productId,
        variantId: variantId ?? null,
      },
      orderBy: [{ isBase: 'desc' }, { sortOrder: 'asc' }],
    });
  }

  /**
   * Scanner ne jo parha, us se unit dhoondna.
   *
   * Barcode ke sath SKU bhi dekhte hain: bohat si dukaanon me carton par
   * barcode ki jagah sirf SKU chhapa hota hai, aur gun dono ko ek hi
   * tarah parhti hai. Baray-chhote huroof ka farq bhi nahi — label par
   * "COLG-DZN" hota hai aur dukaan-daar "colg-dzn" type kar deta hai.
   *
   * Product ki poori tafseel sath aati hai (stock, unit, tasveer) kyunke
   * POS ko line banane ke liye yahi chahiye — ek aur request na lage.
   */
  async findByBarcode(user: AuthenticatedUser, barcode: string) {
    const code = barcode.trim();
    if (!code) throw new NotFoundException('Barcode khaali hai');

    const unit = await this.prisma.productUnit.findFirst({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        OR: [
          { barcode: { equals: code, mode: 'insensitive' } },
          { sku: { equals: code, mode: 'insensitive' } },
        ],
      },
      include: {
        product: {
          include: {
            category: true,
            brand: true,
            images: { where: { isPrimary: true }, take: 1 },
          },
        },
        variant: true,
      },
    });
    if (!unit) throw new NotFoundException(`No unit with barcode ${code}`);
    return unit;
  }

  /**
   * Unit ka apna barcode khud bana do.
   *
   * Product ke liye ye pehle se mojood tha (`/products/:id/generate-barcode`),
   * unit ke liye nahi — is liye dozen/carton ke label kabhi ban hi nahi
   * sakte thay aur har label par product wala hi barcode chhapta tha.
   *
   * Wohi tarz: `200` se shuru (in-store range, kisi asli EAN se nahi
   * takrata) aur kul 13 hindsay.
   */
  async generateBarcode(user: AuthenticatedUser, id: string) {
    const unit = await this.prisma.productUnit.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!unit) throw new NotFoundException('Unit not found');
    if (unit.barcode) return unit;

    for (let attempt = 0; attempt < 5; attempt++) {
      const timestamp = Date.now().toString().slice(-8);
      const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      const candidate = `200${timestamp}${random}`.slice(0, 13);

      const clash = await this.prisma.productUnit.findFirst({
        where: { tenantId: user.tenantId, barcode: candidate },
        select: { id: true },
      });
      const productClash = await this.prisma.product.findFirst({
        where: { tenantId: user.tenantId, barcode: candidate },
        select: { id: true },
      });
      if (clash || productClash) continue;

      return this.prisma.productUnit.update({
        where: { id },
        data: { barcode: candidate },
      });
    }

    throw new BadRequestException('Barcode ban nahi saka — dobara koshish karein');
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateProductUnitDto) {
    const existing = await this.prisma.productUnit.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!existing) throw new NotFoundException('Unit not found');

    if (dto.isBase && !existing.isBase) {
      await this.prisma.productUnit.updateMany({
        where: {
          productId: existing.productId,
          variantId: existing.variantId,
          isBase: true,
          id: { not: id },
        },
        data: { isBase: false },
      });
    }

    if (dto.isDefault && !existing.isDefault) {
      await this.prisma.productUnit.updateMany({
        where: {
          productId: existing.productId,
          variantId: existing.variantId,
          isDefault: true,
          id: { not: id },
        },
        data: { isDefault: false },
      });
    }

    if (dto.barcode && dto.barcode !== existing.barcode) {
      const dup = await this.prisma.productUnit.findFirst({
        where: {
          tenantId: user.tenantId,
          barcode: dto.barcode,
          id: { not: id },
        },
      });
      if (dup) throw new BadRequestException(`Barcode ${dto.barcode} already exists`);
    }

    return this.prisma.productUnit.update({
      where: { id },
      data: dto,
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const existing = await this.prisma.productUnit.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!existing) throw new NotFoundException('Unit not found');
    if (existing.isBase) {
      throw new BadRequestException('Cannot delete base unit');
    }
    return this.prisma.productUnit.delete({ where: { id } });
  }

  /**
   * Convert quantity from one unit to another (via base unit)
   * e.g., 2 dozens → pieces = 24
   */
  async convertQuantity(
    user: AuthenticatedUser,
    fromUnitId: string,
    toUnitId: string,
    quantity: number,
  ): Promise<number> {
    const [fromUnit, toUnit] = await Promise.all([
      this.prisma.productUnit.findFirst({
        where: { id: fromUnitId, tenantId: user.tenantId },
      }),
      this.prisma.productUnit.findFirst({
        where: { id: toUnitId, tenantId: user.tenantId },
      }),
    ]);

    if (!fromUnit || !toUnit) throw new NotFoundException('Unit not found');
    if (fromUnit.productId !== toUnit.productId) {
      throw new BadRequestException('Units belong to different products');
    }

    const baseQuantity = quantity * fromUnit.conversionRate;
    return baseQuantity / toUnit.conversionRate;
  }
}
