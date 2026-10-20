/**
 * Live animals: each one is its own record (health, cage, price) and, once
 * it goes to the counter, a catalogue line with stock 1 so its bill, profit
 * and returns work like any sale. A bill voided or returned puts the animal
 * back on sale; a death writes its cost off as a loss. Records are never
 * deleted: removing one marks it "wapas" (gone back) and takes it off the counter.
 */
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PERMISSIONS, hasPermission } from '../../../common/constants/permissions.constants';
import { PetSaleStatus, PetSpeciesType, Prisma, StockMovementType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ShopScope, applyStockDelta, resolveWriteShopId } from '../../../common/shop-scope';
import { SalesService } from '../../../modules/sales/sales/sales.service';
import { ExpensesService } from '../../../modules/finance/expenses/expenses.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { AddMedicalRecordDto, SellAnimalDto, UpdateAnimalStatusDto, UpsertLiveAnimalDto } from './dto/upsert-live-animal.dto';
import { addDaysTz, cleanInput, dayEnd, dayKey, dayRange, dayStart, parseDay } from '../petshop-common';

const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

@Injectable()
export class LiveAnimalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sales: SalesService,
    private readonly expenses: ExpensesService,
  ) {}

  /** SKU that ties an animal to the catalogue line its bill uses. */
  private skuFor(animalNumber: string) {
    return `PET-${animalNumber}`;
  }

  /**
   * Catalogue line the counter sells this animal through.
   *
   * A bill needs a product. Before this, animals were only flagged "sold",
   * so the money never reached the cash drawer, the khata or any report.
   * One product per animal (stock 1, the animal's own cost) keeps sales
   * and profit right and lets a normal return bring the animal back.
   */
  async counterItem(user: AuthenticatedUser, scope: ShopScope, id: string) {
    // Same branch the sale picks, so the unit is where the bill is rung.
    const shopId = await resolveWriteShopId(this.prisma, user.tenantId, scope);
    const a = await this.prisma.petLiveAnimal.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Animal not found');
    if (a.status === 'SOLD') throw new BadRequestException('Ye janwar pehle hi bik chuka hai');
    if (a.status === 'DECEASED') throw new BadRequestException('Ye janwar zinda nahi');

    const sku = this.skuFor(a.animalNumber);
    const label = `${[a.name, a.breed || a.species].filter(Boolean).join(' · ')} (${a.animalNumber})`;
    const cost = a.costPrice ?? 0;

    return this.prisma.$transaction(async (tx) => {
      let product = await tx.product.findFirst({ where: { tenantId: user.tenantId, sku, productType: 'PET_ANIMAL' } });
      if (!product) {
        product = await tx.product.create({
          data: {
            tenantId: user.tenantId, name: label, sku, unit: 'pcs', productType: 'PET_ANIMAL',
            price: a.askingPrice, costPrice: cost, stock: 0, lowStockAlert: 0, isActive: true,
          },
        });
      } else if (product.price !== a.askingPrice || product.costPrice !== cost || !product.isActive) {
        product = await tx.product.update({
          where: { id: product.id },
          data: { price: a.askingPrice, costPrice: cost, isActive: true },
        });
      }

      // Exactly one unit, at the branch ringing the bill.
      const rows = await tx.shopStock.findMany({ where: { productId: product.id, variantId: null }, select: { shopId: true, stock: true } });
      for (const row of rows) {
        if (row.shopId !== shopId && row.stock !== 0) {
          await applyStockDelta({
            tx, tenantId: user.tenantId, shopId: row.shopId, productId: product.id, delta: -row.stock,
            movementType: 'OPENING_BALANCE', reference: a.animalNumber, note: 'Janwar dusri branch ke counter par', userId: user.id, unitCost: cost,
          });
        }
      }
      const here = rows.find((r) => r.shopId === shopId)?.stock ?? 0;
      if (here !== 1) {
        await applyStockDelta({
          tx, tenantId: user.tenantId, shopId, productId: product.id, delta: 1 - here,
          movementType: 'OPENING_BALANCE', reference: a.animalNumber, note: 'Zinda janwar counter par', userId: user.id, unitCost: cost,
        });
      }

      return { animalId: a.id, productId: product.id, name: label, price: a.askingPrice, cost };
    });
  }

  async create(user: AuthenticatedUser, dto: UpsertLiveAnimalDto) {
    const count = await this.prisma.petLiveAnimal.count({ where: { tenantId: user.tenantId } });
    const prefix = dto.species.slice(0, 3).toUpperCase();
    // A deleted record frees a count, so step past numbers already taken.
    let n = count + 1;
    let animalNumber = `${prefix}-${String(n).padStart(4, '0')}`;
    while (await this.prisma.petLiveAnimal.findFirst({ where: { tenantId: user.tenantId, animalNumber }, select: { id: true } })) {
      n += 1;
      animalNumber = `${prefix}-${String(n).padStart(4, '0')}`;
    }

    return this.prisma.petLiveAnimal.create({
      data: {
        ...cleanInput(dto),
        tenantId: user.tenantId,
        animalNumber,
        imageUrls: dto.imageUrls ?? [],
        birthDate: parseDay(dto.birthDate),
        acquiredDate: parseDay(dto.acquiredDate) ?? new Date(),
        status: 'AVAILABLE',
      },
    });
  }

  async list(user: AuthenticatedUser, params: {
    species?: string; status?: string; breed?: string; featured?: boolean;
    vaccinated?: boolean; minPrice?: number; maxPrice?: number; search?: string;
  }) {
    return this.prisma.petLiveAnimal.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.species && { species: params.species as any }),
        ...(params.status && { status: params.status as any }),
        ...(params.breed && { breed: { contains: params.breed, mode: 'insensitive' } }),
        ...(params.featured !== undefined && { isFeatured: params.featured }),
        ...(params.vaccinated !== undefined && { isVaccinated: params.vaccinated }),
        ...(params.minPrice || params.maxPrice ? {
          askingPrice: {
            ...(params.minPrice && { gte: params.minPrice }),
            ...(params.maxPrice && { lte: params.maxPrice }),
          },
        } : {}),
        ...(params.search && {
          OR: [
            { animalNumber: { contains: params.search, mode: 'insensitive' } },
            { name: { contains: params.search, mode: 'insensitive' } },
            { breed: { contains: params.search, mode: 'insensitive' } },
            { color: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [{ status: 'asc' }, { isFeatured: 'desc' }, { createdAt: 'desc' }],
      take: 300,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const a = await this.prisma.petLiveAnimal.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Animal not found');

    const ageDays = a.birthDate ? Math.floor((Date.now() - new Date(a.birthDate).getTime()) / 86400000) : null;
    const daysInStore = a.acquiredDate ? Math.floor((Date.now() - new Date(a.acquiredDate).getTime()) / 86400000) : null;
    const profit = a.soldPrice && a.costPrice ? a.soldPrice - a.costPrice : null;

    return {
      ...a,
      computed: {
        ageDays,
        ageMonthsComputed: ageDays != null ? Math.floor(ageDays / 30) : a.ageMonths,
        daysInStore,
        profit,
        isLongStay: daysInStore != null && daysInStore > 60 && a.status === 'AVAILABLE',
      },
    };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertLiveAnimalDto) {
    const a = await this.prisma.petLiveAnimal.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Animal not found');
    if (a.status === 'SOLD') throw new BadRequestException('Bika hua janwar badla nahi ja sakta');

    const updated = await this.prisma.petLiveAnimal.update({
      where: { id },
      data: {
        ...cleanInput(dto),
        birthDate: dto.birthDate ? parseDay(dto.birthDate) : undefined,
        acquiredDate: dto.acquiredDate ? parseDay(dto.acquiredDate) ?? undefined : undefined,
      },
    });
    // Keep its counter line's price and cost in step with the record.
    await this.prisma.product.updateMany({
      where: { tenantId: user.tenantId, sku: this.skuFor(a.animalNumber), productType: 'PET_ANIMAL' },
      data: { price: updated.askingPrice, costPrice: updated.costPrice ?? 0 },
    });
    return updated;
  }

  async reserve(user: AuthenticatedUser, id: string, customerName?: string) {
    const a = await this.prisma.petLiveAnimal.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Animal not found');
    if (a.status !== 'AVAILABLE') throw new BadRequestException(`Animal is ${a.status}, cannot reserve`);

    return this.prisma.petLiveAnimal.update({
      where: { id },
      data: {
        status: 'RESERVED',
        notes: customerName ? ((a.notes || '') + `\nReserved for ${customerName}`).trim() : a.notes,
      },
    });
  }

  async unreserve(user: AuthenticatedUser, id: string) {
    const a = await this.prisma.petLiveAnimal.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Animal not found');
    if (a.status !== 'RESERVED') throw new BadRequestException('Animal is not reserved');
    return this.prisma.petLiveAnimal.update({ where: { id }, data: { status: 'AVAILABLE' } });
  }

  /**
   * Sell an animal. With `saleId` the bill was already rung up at the POS
   * and only the animal is closed; without it a bill is made here, so the
   * money always lands in the drawer, khata and reports.
   */
  async sell(user: AuthenticatedUser, scope: ShopScope, id: string, dto: SellAnimalDto) {
    const a = await this.prisma.petLiveAnimal.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Animal not found');
    if (a.status === 'SOLD') throw new BadRequestException('Animal already sold');
    if (a.status === 'DECEASED') throw new BadRequestException('Animal is deceased');

    const sku = this.skuFor(a.animalNumber);
    let billNumber: string | null = null;
    let soldPrice = dto.soldPrice;

    if (dto.saleId) {
      const sale = await this.prisma.sale.findFirst({
        where: { id: dto.saleId, tenantId: user.tenantId },
        select: { saleNumber: true, status: true, items: { select: { total: true, product: { select: { sku: true, productType: true } } } } },
      });
      if (!sale) throw new NotFoundException('Bill nahi mila');
      if (sale.status === 'VOIDED') throw new BadRequestException('Ye bill void ho chuka hai');
      const line = sale.items.find((i) => i.product?.sku === sku && i.product?.productType === 'PET_ANIMAL');
      if (!line) throw new BadRequestException('Is bill me ye janwar nahi');
      billNumber = sale.saleNumber;
      soldPrice = line.total;
    } else {
      const item = await this.counterItem(user, scope, id);
      const paid = dto.paidAmount ?? dto.soldPrice;
      const sale: any = await this.sales.create(user, scope, {
        shopId: scope.shopId ?? undefined,
        customerId: dto.soldToCustomerId || undefined,
        paymentMethod: dto.paymentMethod ?? 'CASH',
        paidAmount: paid,
        allowCredit: paid < dto.soldPrice - 0.01 ? true : undefined,
        note: dto.notes || undefined,
        items: [{ productId: item.productId, quantity: 1, priceOverride: dto.soldPrice }],
      } as any);
      billNumber = sale.saleNumber ?? null;
    }

    const updated = await this.prisma.petLiveAnimal.update({
      where: { id },
      data: {
        status: 'SOLD',
        soldPrice,
        soldAt: new Date(),
        soldToCustomerId: dto.soldToCustomerId || undefined,
        soldToCustomerName: dto.soldToCustomerName,
        notes: [a.notes, billNumber ? `Bill ${billNumber}` : null, dto.notes].filter(Boolean).join('\n') || null,
      },
    });

    // The animal's catalogue line has done its job; keep it off lists and alerts.
    await this.prisma.product.updateMany({
      where: { tenantId: user.tenantId, sku, productType: 'PET_ANIMAL', stock: { lte: 0 } },
      data: { isActive: false },
    });

    return updated;
  }

  /**
   * Vaccine, deworming or vet visit on the record. A cost paid now is a shop
   * expense (cash from the drawer, or the chosen account) so it shows in
   * profit; it does not change the animal's cost.
   */
  async addMedicalRecord(user: AuthenticatedUser, scope: ShopScope, id: string, dto: AddMedicalRecordDto) {
    const a = await this.prisma.petLiveAnimal.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Animal not found');

    if (a.status === 'DECEASED') throw new BadRequestException('Is janwar ka record band hai');
    const paying = !!dto.paidNow && Number(dto.cost) > 0;
    if (paying && !hasPermission(user.role, user.permissions, PERMISSIONS.EXPENSES_CREATE)) {
      throw new ForbiddenException('Kharcha likhne ki permission nahi — "abhi diya" hata kar record save karein');
    }
    const history = Array.isArray(a.medicalHistory) ? (a.medicalHistory as Prisma.JsonArray) : [];
    history.push({
      at: new Date().toISOString(),
      type: dto.type,
      description: dto.description,
      vetName: dto.vetName,
      cost: dto.cost ?? 0,
      nextDueDate: dto.nextDueDate ? dayKey(dto.nextDueDate) : null,
    } as Prisma.JsonObject);

    const patch: any = { medicalHistory: history };
    const t = dto.type.toUpperCase();
    if (t.includes('VACCIN')) {
      patch.isVaccinated = true;
      patch.vaccinationDetails = ((a.vaccinationDetails || '') + `\n${dto.description}`).trim();
    }
    if (t.includes('DEWORM')) {
      patch.isDewormed = true;
      patch.dewormingDetails = ((a.dewormingDetails || '') + `\n${dto.description}`).trim();
    }

    if (paying) {
      await this.expenses.create(user, scope, {
        title: `${dto.type}: ${a.name || a.breed || a.species} (${a.animalNumber})`, amount: r2(Number(dto.cost)),
        paymentMethod: dto.paymentMethod ?? 'CASH', description: [dto.description, dto.vetName].filter(Boolean).join(' · '),
      } as Parameters<ExpensesService['create']>[2]);
    }
    return this.prisma.petLiveAnimal.update({ where: { id }, data: patch });
  }

  /** Takes the animal's counter line to zero everywhere (no longer for sale). */
  private async clearCounter(tx: Prisma.TransactionClient, user: AuthenticatedUser, a: { animalNumber: string; costPrice: number | null }, movementType: StockMovementType, note: string) {
    const product = await tx.product.findFirst({ where: { tenantId: user.tenantId, sku: this.skuFor(a.animalNumber), productType: 'PET_ANIMAL' }, select: { id: true } });
    if (!product) return;
    const rows = await tx.shopStock.findMany({ where: { productId: product.id, variantId: null, stock: { not: 0 } }, select: { shopId: true, stock: true } });
    for (const row of rows) {
      await applyStockDelta({
        tx, tenantId: user.tenantId, shopId: row.shopId, productId: product.id, delta: -row.stock,
        movementType, reference: a.animalNumber, note, userId: user.id, unitCost: a.costPrice ?? 0,
      });
    }
    await tx.product.update({ where: { id: product.id }, data: { isActive: false } });
  }

  /**
   * Shelf states only. SOLD comes from a bill (counter or Sell); a death
   * writes the animal's cost off as a loss and takes it off the counter.
   */
  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateAnimalStatusDto) {
    const a = await this.prisma.petLiveAnimal.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Animal not found');
    if (dto.status === 'SOLD') throw new BadRequestException('Bechne ke liye counter par bill banayein ya "Bechein" dabayein');
    if (a.status === 'SOLD') throw new BadRequestException('Bika hua janwar bill ke Return se wapas aata hai');
    if (a.status === 'DECEASED') throw new BadRequestException('Is janwar ka record band hai');
    if (a.status === dto.status) return a;

    return this.prisma.$transaction(async (tx) => {
      if (dto.status === 'DECEASED') await this.clearCounter(tx, user, a, 'LOSS', `Janwar mar gaya${dto.reason ? `: ${dto.reason}` : ''}`);
      if (dto.status === 'RETURNED') await this.clearCounter(tx, user, a, 'ADJUSTMENT_OUT', `Janwar wapas gaya${dto.reason ? `: ${dto.reason}` : ''}`);
      return tx.petLiveAnimal.update({
        where: { id },
        data: {
          status: dto.status,
          notes: dto.reason ? ((a.notes || '') + `\n[${dto.status}] ${dto.reason}`).trim() : a.notes,
        },
      });
    });
  }

  /** DELETE keeps its route but marks the animal "wapas" (gone back); the record stays. */
  async remove(user: AuthenticatedUser, id: string) {
    const a = await this.prisma.petLiveAnimal.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Animal not found');
    if (a.status === 'SOLD') throw new BadRequestException('Bika hua janwar hataya nahi ja sakta');
    if (a.status === 'RETURNED' || a.status === 'DECEASED') return a;
    return this.updateStatus(user, id, { status: 'RETURNED', reason: 'Record hataya' });
  }

  /**
   * Every animal on a counter bill marked sold (the POS calls this after the
   * sale). Animals already marked are skipped; the rest get the bill's price.
   */
  async fromSale(user: AuthenticatedUser, saleId: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id: saleId, tenantId: user.tenantId },
      select: { id: true, saleNumber: true, status: true, customer: { select: { id: true, name: true } }, items: { select: { total: true, product: { select: { sku: true, productType: true } } } } },
    });
    if (!sale) throw new NotFoundException('Bill nahi mila');
    if (sale.status === 'VOIDED') throw new BadRequestException('Ye bill void ho chuka hai');
    const lines = sale.items.filter((i) => i.product?.productType === 'PET_ANIMAL' && i.product.sku?.startsWith('PET-'));
    const marked: string[] = [];
    for (const line of lines) {
      const animalNumber = line.product!.sku!.slice(4);
      const a = await this.prisma.petLiveAnimal.findFirst({ where: { tenantId: user.tenantId, animalNumber } });
      if (!a || a.status === 'SOLD') continue;
      await this.prisma.petLiveAnimal.update({
        where: { id: a.id },
        data: {
          status: 'SOLD', soldPrice: line.total, soldAt: new Date(),
          soldToCustomerId: sale.customer?.id, soldToCustomerName: sale.customer?.name,
          notes: [a.notes, `Bill ${sale.saleNumber}`].filter(Boolean).join('\n'),
        },
      });
      marked.push(a.animalNumber);
    }
    return { saleNumber: sale.saleNumber, marked };
  }

  /** A bill with animals voided or returned: those animals are on sale again. */
  async backOnSale(tenantId: string, saleId: string, kind: 'void' | 'return') {
    const sale = await this.prisma.sale.findFirst({
      where: { id: saleId, tenantId },
      select: { saleNumber: true, status: true, items: { select: { quantity: true, returnedQty: true, product: { select: { sku: true, productType: true } } } } },
    });
    if (!sale || (kind === 'void' && sale.status !== 'VOIDED')) return [];
    const why = kind === 'void' ? 'Bill void' : 'Bill wapas';
    const back: string[] = [];
    for (const it of sale.items) {
      if (it.product?.productType !== 'PET_ANIMAL' || !it.product.sku?.startsWith('PET-')) continue;
      if (kind === 'return' && !(Number(it.returnedQty ?? 0) >= it.quantity)) continue;
      const animalNumber = it.product.sku.slice(4);
      const done = await this.prisma.petLiveAnimal.updateMany({
        where: { tenantId, animalNumber, status: 'SOLD' },
        data: { status: 'AVAILABLE', soldPrice: null, soldAt: null, soldToCustomerId: null, soldToCustomerName: null },
      });
      if (done.count) {
        back.push(animalNumber);
        await this.prisma.product.updateMany({ where: { tenantId, sku: it.product.sku, productType: 'PET_ANIMAL' }, data: { isActive: true } });
      }
    }
    if (back.length) {
      for (const n of back) {
        const a = await this.prisma.petLiveAnimal.findFirst({ where: { tenantId, animalNumber: n }, select: { id: true, notes: true } });
        if (a) await this.prisma.petLiveAnimal.update({ where: { id: a.id }, data: { notes: [a.notes, `${why} (${sale.saleNumber}) — dobara bikne ke liye`].filter(Boolean).join('\n') } });
      }
    }
    return back;
  }

  private where(user: AuthenticatedUser, params: { species?: string; status?: string; search?: string; vaccinated?: boolean }): Prisma.PetLiveAnimalWhereInput {
    const known = (v: string | undefined, all: string[]) => (v && all.includes(v) ? v : undefined);
    const status = params.status === 'ON_SALE'
      ? { in: ['AVAILABLE', 'RESERVED'] as PetSaleStatus[] }
      : known(params.status, Object.values(PetSaleStatus)) as PetSaleStatus | undefined;
    const species = known(params.species, Object.values(PetSpeciesType)) as PetSpeciesType | undefined;
    return {
      tenantId: user.tenantId,
      ...(status && { status }),
      ...(species && { species }),
      ...(params.vaccinated !== undefined && { isVaccinated: params.vaccinated }),
      ...(params.search && {
        OR: [
          { animalNumber: { contains: params.search, mode: 'insensitive' } },
          { name: { contains: params.search, mode: 'insensitive' } },
          { breed: { contains: params.search, mode: 'insensitive' } },
          { color: { contains: params.search, mode: 'insensitive' } },
          { currentCage: { contains: params.search, mode: 'insensitive' } },
          { soldToCustomerName: { contains: params.search, mode: 'insensitive' } },
        ],
      }),
    };
  }

  /** Paged record with status counts and stock value for the animals page. */
  async paged(user: AuthenticatedUser, params: { species?: string; status?: string; search?: string; vaccinated?: boolean; page?: number; limit?: number }) {
    const page = Math.max(1, Math.floor(Number(params.page) || 1));
    const limit = Math.min(100, Math.max(1, Math.floor(Number(params.limit) || 24)));
    const where = this.where(user, params);
    const [items, total, byStatus] = await Promise.all([
      this.prisma.petLiveAnimal.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: [{ status: 'asc' }, { isFeatured: 'desc' }, { createdAt: 'desc' }] }),
      this.prisma.petLiveAnimal.count({ where }),
      this.prisma.petLiveAnimal.groupBy({ by: ['status'], where: this.where(user, { ...params, status: undefined }), _count: { _all: true } }),
    ]);
    return { items, total, page, limit, counts: Object.fromEntries(byStatus.map((b) => [b.status, b._count._all])) };
  }

  /** Animals sold, by species and month part, with profit from cost (analytics tab). */
  async analytics(user: AuthenticatedUser, params: { from?: string; to?: string }) {
    const range = dayRange(params.from, params.to) ?? { gte: dayStart(dayKey().slice(0, 8) + '01'), lte: dayEnd() };
    const [sold, deaths, inStock] = await Promise.all([
      this.prisma.petLiveAnimal.findMany({ where: { tenantId: user.tenantId, status: 'SOLD', soldAt: range }, select: { species: true, soldPrice: true, costPrice: true, soldAt: true, acquiredDate: true } }),
      this.prisma.petLiveAnimal.findMany({ where: { tenantId: user.tenantId, status: 'DECEASED', updatedAt: range }, select: { species: true, costPrice: true } }),
      this.prisma.petLiveAnimal.groupBy({ by: ['species'], where: { tenantId: user.tenantId, status: { in: ['AVAILABLE', 'RESERVED'] } }, _count: { _all: true }, _sum: { askingPrice: true, costPrice: true } }),
    ]);
    const bySpecies = new Map<string, { sold: number; revenue: number; profit: number }>();
    for (const x of sold) {
      const v = bySpecies.get(x.species) ?? { sold: 0, revenue: 0, profit: 0 };
      v.sold += 1; v.revenue = r2(v.revenue + (x.soldPrice ?? 0)); v.profit = r2(v.profit + (x.soldPrice ?? 0) - (x.costPrice ?? 0));
      bySpecies.set(x.species, v);
    }
    const daysToSell = sold.filter((x) => x.soldAt && x.acquiredDate).map((x) => (x.soldAt!.getTime() - x.acquiredDate!.getTime()) / 86_400_000);
    return {
      sold: sold.length,
      revenue: r2(sold.reduce((t, x) => t + (x.soldPrice ?? 0), 0)),
      profit: r2(sold.reduce((t, x) => t + (x.soldPrice ?? 0) - (x.costPrice ?? 0), 0)),
      deaths: deaths.length,
      deathLoss: r2(deaths.reduce((t, x) => t + (x.costPrice ?? 0), 0)),
      avgDaysToSell: daysToSell.length ? Math.round(daysToSell.reduce((t, d) => t + d, 0) / daysToSell.length) : null,
      bySpecies: [...bySpecies.entries()].map(([species, v]) => ({ species, ...v })).sort((a, b) => b.revenue - a.revenue),
      inStock: inStock.map((g) => ({ species: g.species, count: g._count._all, value: r2(g._sum.askingPrice ?? 0), cost: r2(g._sum.costPrice ?? 0) })),
    };
  }

  async summary(user: AuthenticatedUser) {
    const monthStart = dayStart(dayKey().slice(0, 8) + '01');

    const [available, reserved, sold, deceased, financials, monthlySales] = await Promise.all([
      this.prisma.petLiveAnimal.count({ where: { tenantId: user.tenantId, status: 'AVAILABLE' } }),
      this.prisma.petLiveAnimal.count({ where: { tenantId: user.tenantId, status: 'RESERVED' } }),
      this.prisma.petLiveAnimal.count({ where: { tenantId: user.tenantId, status: 'SOLD' } }),
      this.prisma.petLiveAnimal.count({ where: { tenantId: user.tenantId, status: 'DECEASED' } }),
      this.prisma.petLiveAnimal.aggregate({
        where: { tenantId: user.tenantId, status: { in: ['AVAILABLE', 'RESERVED'] } },
        _sum: { askingPrice: true, costPrice: true },
      }),
      this.prisma.petLiveAnimal.aggregate({
        where: { tenantId: user.tenantId, status: 'SOLD', soldAt: { gte: monthStart } },
        _sum: { soldPrice: true, costPrice: true },
        _count: { _all: true },
      }),
    ]);

    const revenue = monthlySales._sum.soldPrice ?? 0;
    const cost = monthlySales._sum.costPrice ?? 0;

    const bySpecies = await this.prisma.petLiveAnimal.groupBy({
      by: ['species'],
      where: { tenantId: user.tenantId, status: 'AVAILABLE' },
      _count: { _all: true },
    });

    return {
      available, reserved, sold, deceased,
      inventoryValue: financials._sum.askingPrice ?? 0,
      inventoryCost: financials._sum.costPrice ?? 0,
      monthly: { count: monthlySales._count._all, revenue, cost, profit: revenue - cost },
      bySpecies: bySpecies.map((s) => ({ species: s.species, count: s._count._all })),
    };
  }

  /** Animals sitting in store too long — discount candidates */
  async longStay(user: AuthenticatedUser, days = 60) {
    const cutoff = addDaysTz(dayStart(), -Math.max(1, Math.floor(days) || 60));
    return this.prisma.petLiveAnimal.findMany({
      where: { tenantId: user.tenantId, status: 'AVAILABLE', acquiredDate: { lte: cutoff } },
      orderBy: { acquiredDate: 'asc' },
    });
  }

  /** Animals needing vaccination / deworming */
  async healthAlerts(user: AuthenticatedUser) {
    return this.prisma.petLiveAnimal.findMany({
      where: {
        tenantId: user.tenantId,
        status: { in: ['AVAILABLE', 'RESERVED'] },
        OR: [{ isVaccinated: false }, { isDewormed: false }],
      },
      orderBy: { acquiredDate: 'asc' },
    });
  }
}
