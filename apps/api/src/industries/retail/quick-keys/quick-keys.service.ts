/**
 * POS quick keys: one-tap buttons for a product (optionally a variant or a
 * pack unit) or a combo. Keys are shared by default, can be limited to one
 * branch, or kept personal. Every referenced id is checked against the
 * tenant before saving.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { assertShopAccess } from '../../../common/shop-scope';
import { QuickKeyPositionDto, UpdateQuickKeyDto, UpsertQuickKeyDto } from './dto/upsert-quick-key.dto';

const clean = (s?: string | null) => (s?.trim() ? s.trim() : null);

@Injectable()
export class QuickKeysService {
  constructor(private readonly prisma: PrismaService) {}

  /** Keys this person sees: shared or own, for the branch (or every branch). `manage` adds switched-off keys. */
  async list(user: AuthenticatedUser, shopId?: string, manage = false) {
    return this.prisma.retailQuickKey.findMany({
      where: {
        tenantId: user.tenantId,
        ...(!manage && { isActive: true }),
        AND: [
          { OR: [{ userId: user.id }, { userId: null }] },
          ...(shopId ? [{ OR: [{ shopId }, { shopId: null }] }] : []),
        ],
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(user: AuthenticatedUser, dto: UpsertQuickKeyDto) {
    if (!dto.productId && !dto.comboId) throw new BadRequestException('Product ya combo chunein');
    const refs = await this.checkRefs(user, dto);
    const position = dto.position ?? ((await this.prisma.retailQuickKey.aggregate({ where: { tenantId: user.tenantId }, _max: { position: true } }))._max.position ?? -1) + 1;
    return this.prisma.retailQuickKey.create({
      data: {
        tenantId: user.tenantId,
        userId: dto.personal ? user.id : null,
        ...refs,
        label: dto.label.trim(),
        color: dto.color ?? null,
        icon: clean(dto.icon),
        hotkey: clean(dto.hotkey),
        group: clean(dto.group),
        position,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateQuickKeyDto) {
    const existing = await this.own(user, id);
    const merged = {
      productId: dto.productId !== undefined ? dto.productId : existing.productId ?? undefined,
      comboId: dto.comboId !== undefined ? dto.comboId : existing.comboId ?? undefined,
      variantId: dto.variantId !== undefined ? dto.variantId : existing.variantId ?? undefined,
      unitId: dto.unitId !== undefined ? dto.unitId : existing.unitId ?? undefined,
      shopId: dto.shopId !== undefined ? dto.shopId : existing.shopId ?? undefined,
    };
    const touchesRefs = ['productId', 'comboId', 'variantId', 'unitId', 'shopId'].some((k) => (dto as Record<string, unknown>)[k] !== undefined);
    const refs = touchesRefs ? await this.checkRefs(user, merged) : {};
    if (touchesRefs && !refs.productId && !refs.comboId) throw new BadRequestException('Product ya combo chunein');
    return this.prisma.retailQuickKey.update({
      where: { id },
      data: {
        ...refs,
        ...(dto.label !== undefined && { label: dto.label.trim() }),
        ...(dto.color !== undefined && { color: dto.color || null }),
        ...(dto.icon !== undefined && { icon: clean(dto.icon) }),
        ...(dto.hotkey !== undefined && { hotkey: clean(dto.hotkey) }),
        ...(dto.group !== undefined && { group: clean(dto.group) }),
        ...(dto.position !== undefined && { position: dto.position }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.personal !== undefined && { userId: dto.personal ? user.id : null }),
      },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    await this.own(user, id);
    return this.prisma.retailQuickKey.delete({ where: { id } });
  }

  /** New order in one transaction; every id must be a key this person can edit. */
  async reorder(user: AuthenticatedUser, items: QuickKeyPositionDto[]) {
    const ids = [...new Set(items.map((i) => i.id))];
    const found = await this.prisma.retailQuickKey.count({
      where: { id: { in: ids }, tenantId: user.tenantId, OR: [{ userId: user.id }, { userId: null }] },
    });
    if (found !== ids.length) throw new NotFoundException('Kuch quick keys nahi milin — page refresh karein');
    await this.prisma.$transaction(async (tx) => {
      for (const it of items) {
        await tx.retailQuickKey.update({ where: { id: it.id }, data: { position: it.position } });
      }
    });
    return { updated: items.length };
  }

  /** A key this person may change: shared, or their own. */
  private async own(user: AuthenticatedUser, id: string) {
    const existing = await this.prisma.retailQuickKey.findFirst({
      where: { id, tenantId: user.tenantId, OR: [{ userId: user.id }, { userId: null }] },
    });
    if (!existing) throw new NotFoundException('Quick key nahi mili');
    if (existing.shopId) assertShopAccess(user, existing.shopId, 'Quick key badalna');
    return existing;
  }

  /** Checks product, variant, unit, combo and branch belong to this tenant. */
  private async checkRefs(user: AuthenticatedUser, d: { productId?: string; comboId?: string; variantId?: string; unitId?: string; shopId?: string }) {
    const out: Pick<Prisma.RetailQuickKeyUncheckedCreateInput, 'productId' | 'comboId' | 'variantId' | 'unitId' | 'shopId'> = {
      productId: null, comboId: null, variantId: null, unitId: null, shopId: null,
    };
    if (d.productId && d.comboId) throw new BadRequestException('Ek key par product ya combo — dono nahi');
    if (d.productId) {
      const p = await this.prisma.product.findFirst({ where: { id: d.productId, tenantId: user.tenantId }, select: { id: true } });
      if (!p) throw new NotFoundException('Product nahi mila');
      out.productId = p.id;
      if (d.variantId) {
        const v = await this.prisma.productVariant.findFirst({ where: { id: d.variantId, productId: p.id }, select: { id: true } });
        if (!v) throw new NotFoundException('Variant is product ka nahi');
        out.variantId = v.id;
      }
      if (d.unitId) {
        const u = await this.prisma.productUnit.findFirst({ where: { id: d.unitId, productId: p.id, tenantId: user.tenantId }, select: { id: true } });
        if (!u) throw new NotFoundException('Unit is product ka nahi');
        out.unitId = u.id;
      }
    } else if (d.comboId) {
      const c = await this.prisma.productCombo.findFirst({ where: { id: d.comboId, tenantId: user.tenantId }, select: { id: true } });
      if (!c) throw new NotFoundException('Combo nahi mila');
      out.comboId = c.id;
    }
    if (d.shopId) {
      const s = await this.prisma.shop.findFirst({ where: { id: d.shopId, tenantId: user.tenantId }, select: { id: true } });
      if (!s) throw new NotFoundException('Branch nahi mili');
      assertShopAccess(user, s.id, 'Quick key');
      out.shopId = s.id;
    }
    return out;
  }
}
