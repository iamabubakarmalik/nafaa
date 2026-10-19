import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpdateStationDto, UpsertStationDto } from './dto/upsert-station.dto';

type StationInput = UpsertStationDto | UpdateStationDto;

@Injectable()
export class StationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Trims text, checks the categories belong to the shop and are not on another station. */
  private async clean(tenantId: string, dto: StationInput, selfId?: string) {
    const data: Prisma.KitchenStationUncheckedUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.code !== undefined) data.code = dto.code.trim().toUpperCase() || null;
    if (dto.printerName !== undefined) data.printerName = dto.printerName.trim() || null;
    if (dto.displayOrder !== undefined) data.displayOrder = dto.displayOrder;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.categoryIds !== undefined) {
      const ids = [...new Set(dto.categoryIds)];
      const found = ids.length ? await this.prisma.category.count({ where: { id: { in: ids }, tenantId } }) : 0;
      if (found !== ids.length) throw new NotFoundException('Ek ya zyada category nahi mili');
      const taken = await this.prisma.kitchenStation.findFirst({
        where: { tenantId, isActive: true, categoryIds: { hasSome: ids }, ...(selfId && { id: { not: selfId } }) },
        select: { name: true },
      });
      if (taken) throw new BadRequestException(`Kuch category pehle se "${taken.name}" station par hain — ek category ek hi station par jati hai`);
      data.categoryIds = ids;
    }
    return data;
  }

  private async save<T>(run: () => Promise<T>) {
    try {
      return await run();
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictException('Is naam ka station pehle se hai');
      throw e;
    }
  }

  async create(user: AuthenticatedUser, dto: UpsertStationDto) {
    const data = await this.clean(user.tenantId, dto);
    // A station switched off earlier under the same name comes back instead of clashing.
    const old = await this.prisma.kitchenStation.findFirst({ where: { tenantId: user.tenantId, name: data.name as string, isActive: false } });
    if (old) return this.save(() => this.prisma.kitchenStation.update({ where: { id: old.id }, data: { ...data, isActive: true } }));
    return this.save(() => this.prisma.kitchenStation.create({ data: { ...(data as Prisma.KitchenStationUncheckedCreateInput), tenantId: user.tenantId } }));
  }

  list(user: AuthenticatedUser) {
    return this.prisma.kitchenStation.findMany({ where: { tenantId: user.tenantId, isActive: true }, orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }] });
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateStationDto) {
    const s = await this.prisma.kitchenStation.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Station nahi mila');
    const data = await this.clean(user.tenantId, dto, id);
    return this.save(() => this.prisma.kitchenStation.update({ where: { id }, data }));
  }

  /** Switched off, not deleted: old KOTs keep the station name. */
  async remove(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.kitchenStation.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Station nahi mila');
    return this.prisma.kitchenStation.update({ where: { id }, data: { isActive: false, categoryIds: [] } });
  }

  /**
   * Which station cooks each product, from its category. Products whose
   * category is on no station go to `fallback` (the first station), so a
   * KOT is never lost.
   */
  async routeProducts(tenantId: string, productIds: string[]) {
    const [stations, products] = await Promise.all([
      this.prisma.kitchenStation.findMany({ where: { tenantId, isActive: true }, orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }] }),
      this.prisma.product.findMany({ where: { tenantId, id: { in: [...new Set(productIds)] } }, select: { id: true, categoryId: true } }),
    ]);
    const byCategory = new Map<string, (typeof stations)[number]>();
    for (const s of stations) for (const c of s.categoryIds) if (!byCategory.has(c)) byCategory.set(c, s);
    const fallback = stations[0] ?? null;
    const route = new Map<string, { id: string; name: string; code: string | null; printerName: string | null } | null>();
    for (const p of products) {
      const s = (p.categoryId && byCategory.get(p.categoryId)) || fallback;
      route.set(p.id, s ? { id: s.id, name: s.name, code: s.code, printerName: s.printerName } : null);
    }
    return route;
  }

  /** Station map for the screens: categories per station, the ones on none, and dish counts. */
  async routing(user: AuthenticatedUser, productIds: string[] = []) {
    const [stations, categories, dishes] = await Promise.all([
      this.list(user),
      this.prisma.category.findMany({ where: { tenantId: user.tenantId, isActive: true }, select: { id: true, name: true, color: true }, orderBy: { name: 'asc' } }),
      this.prisma.product.groupBy({
        by: ['categoryId'],
        where: { tenantId: user.tenantId, isActive: true, isRawMaterial: false, menuItem: { isNot: null } },
        _count: { _all: true },
      }),
    ]);
    const dishCount = new Map(dishes.map((d) => [d.categoryId ?? 'none', d._count._all]));
    const onStation = new Map<string, string>();
    for (const s of stations) for (const c of s.categoryIds) if (!onStation.has(c)) onStation.set(c, s.id);
    const byProduct = productIds.length ? Object.fromEntries(await this.routeProducts(user.tenantId, productIds)) : {};
    return {
      byProduct,
      stations: stations.map((s) => ({ ...s, dishes: s.categoryIds.reduce((n, c) => n + (dishCount.get(c) ?? 0), 0) })),
      categories: categories.map((c) => ({ ...c, stationId: onStation.get(c.id) ?? null, dishes: dishCount.get(c.id) ?? 0 })),
      uncategorisedDishes: dishCount.get('none') ?? 0,
      fallback: stations[0] ? { id: stations[0].id, name: stations[0].name } : null,
    };
  }
}
