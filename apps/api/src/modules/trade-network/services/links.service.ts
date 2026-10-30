/**
 * Links between businesses: a buyer asks (invite code or link, the seller's
 * phone, or the directory), the seller approves with terms, and either side
 * can later pause (seller) or unlink. On approval the buyer becomes, or is
 * matched to, a Customer in the seller's books and the seller a Supplier in
 * the buyer's books. Sellers also keep their network profile here: invite
 * code and the opt-in directory listing.
 */

import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TradeLink } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import type { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { DistributionAccessService } from '../../distribution/distribution-access';
import {
  BuyerSettingsDto, DirectoryQueryDto, FindSellerDto, LinkRequestDto, LinkTermsDto, ProfileDto, RejectDto,
} from '../dto/trade.dto';
import { REOPENABLE, cleanInviteCode, newInviteCode, phoneKey, r2, type LinkStatus } from '../helpers/trade-rules';
import { businessCards, can, linkFor, notify, requirePerm, type BusinessCard } from '../trade-network.support';

@Injectable()
export class TradeLinksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: DistributionAccessService,
    private readonly notifications: NotificationsService,
  ) {}

  /* ───────────── seller profile ───────────── */

  /** The seller's profile, made on first use with a fresh invite code. */
  async profileOf(tenantId: string) {
    const found = await this.prisma.tradeProfile.findUnique({ where: { tenantId } });
    if (found) return found;
    for (let i = 0; i < 8; i++) {
      try {
        return await this.prisma.tradeProfile.create({ data: { tenantId, inviteCode: newInviteCode() } });
      } catch (e) {
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
        const again = await this.prisma.tradeProfile.findUnique({ where: { tenantId } });
        if (again) return again;
      }
    }
    throw new ConflictException('Invite code nahi bana, dobara koshish karein');
  }

  async getProfile(user: AuthenticatedUser) {
    const access = await this.access.read(user.tenantId);
    const profile = await this.profileOf(user.tenantId);
    const card = (await businessCards(this.prisma, [user.tenantId])).get(user.tenantId) ?? null;
    return { profile, card, canSell: access.enabled && access.planAllows, access };
  }

  async updateProfile(user: AuthenticatedUser, dto: ProfileDto) {
    await this.access.assertOpen(user.tenantId);
    const p = await this.profileOf(user.tenantId);
    const tidy = (list?: string[]) => (list ? [...new Set(list.map((x) => x.trim()).filter(Boolean))] : undefined);
    if (dto.phone !== undefined && dto.phone && !phoneKey(dto.phone)) throw new BadRequestException('Phone number sahi nahi');
    await this.prisma.tradeProfile.update({
      where: { id: p.id },
      data: {
        ...(dto.acceptRequests !== undefined && { acceptRequests: dto.acceptRequests }),
        ...(dto.listed !== undefined && { listed: dto.listed }),
        ...(dto.displayName !== undefined && { displayName: dto.displayName.trim() || null }),
        ...(dto.phone !== undefined && { phone: dto.phone.trim() || null }),
        ...(dto.city !== undefined && { city: dto.city.trim() || null }),
        ...(dto.area !== undefined && { area: dto.area.trim() || null }),
        ...(dto.categories !== undefined && { categories: tidy(dto.categories) }),
        ...(dto.brands !== undefined && { brands: tidy(dto.brands) }),
        ...(dto.about !== undefined && { about: dto.about.trim() || null }),
        ...(dto.minOrderValue !== undefined && { minOrderValue: dto.minOrderValue && dto.minOrderValue > 0 ? r2(dto.minOrderValue) : null }),
        ...(dto.catalogScope !== undefined && { catalogScope: dto.catalogScope }),
      },
    });
    if (dto.listed) {
      const fresh = await this.prisma.tradeProfile.findUniqueOrThrow({ where: { id: p.id } });
      if (!fresh.city) throw new BadRequestException('Directory me aane ke liye shehar (city) likhein');
    }
    return this.getProfile(user);
  }

  async newCode(user: AuthenticatedUser) {
    await this.access.assertOpen(user.tenantId);
    const p = await this.profileOf(user.tenantId);
    for (let i = 0; i < 8; i++) {
      try {
        await this.prisma.tradeProfile.update({ where: { id: p.id }, data: { inviteCode: newInviteCode() } });
        return this.getProfile(user);
      } catch (e) {
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
      }
    }
    throw new ConflictException('Naya code nahi bana, dobara koshish karein');
  }

  /* ───────────── finding a seller ───────────── */

  /** Sellers that can take requests now: distribution open and requests on. */
  private async openSeller(tenantId: string) {
    const a = await this.access.read(tenantId);
    if (!a.enabled || !a.planAllows) return false;
    const p = await this.prisma.tradeProfile.findUnique({ where: { tenantId }, select: { acceptRequests: true } });
    return p ? p.acceptRequests : true;
  }

  private async sellerByCode(code: string) {
    const clean = cleanInviteCode(code);
    if (!clean) throw new BadRequestException('Invite code sahi nahi — NF- ke baad 6 harf/number');
    const p = await this.prisma.tradeProfile.findUnique({ where: { inviteCode: clean }, select: { tenantId: true } });
    return p?.tenantId ?? null;
  }

  /** Businesses whose network, shop or owner phone is this number. */
  private async sellersByPhone(phone: string): Promise<string[]> {
    const key = phoneKey(phone);
    if (!key) throw new BadRequestException('Phone number sahi nahi');
    const tail = key.slice(-7);
    const [profiles, tenants, owners, settings] = await Promise.all([
      this.prisma.tradeProfile.findMany({ where: { phone: { contains: tail } }, select: { tenantId: true, phone: true }, take: 50 }),
      this.prisma.tenant.findMany({ where: { phone: { contains: tail } }, select: { id: true, phone: true }, take: 50 }),
      this.prisma.user.findMany({ where: { phone: { contains: tail }, role: 'OWNER', isActive: true }, select: { tenantId: true, phone: true }, take: 50 }),
      this.prisma.tenantSettings.findMany({ where: { shopPhone: { contains: tail } }, select: { tenantId: true, shopPhone: true }, take: 50 }),
    ]);
    const hits = new Set<string>();
    for (const p of profiles) if (phoneKey(p.phone) === key) hits.add(p.tenantId);
    for (const t of tenants) if (phoneKey(t.phone) === key) hits.add(t.id);
    for (const o of owners) if (o.tenantId && phoneKey(o.phone) === key) hits.add(o.tenantId);
    for (const s of settings) if (phoneKey(s.shopPhone) === key) hits.add(s.tenantId);
    return [...hits];
  }

  /** Looks a seller up before asking; shows only a business card. */
  async find(user: AuthenticatedUser, q: FindSellerDto) {
    let ids: string[] = [];
    if (q.code) {
      const id = await this.sellerByCode(q.code);
      ids = id ? [id] : [];
    } else if (q.phone) {
      ids = await this.sellersByPhone(q.phone);
    } else {
      throw new BadRequestException('Invite code ya phone likhein');
    }
    ids = ids.filter((id) => id !== user.tenantId);
    const open: string[] = [];
    for (const id of ids) if (await this.openSeller(id)) open.push(id);
    if (!open.length) throw new NotFoundException(q.code ? 'Is code ka koi distributor nahi mila' : 'Is number par Nafaa par koi distributor nahi mila');
    const cards = await businessCards(this.prisma, open);
    const links = await this.prisma.tradeLink.findMany({ where: { buyerTenantId: user.tenantId, sellerTenantId: { in: open } }, select: { id: true, sellerTenantId: true, status: true } });
    return open.slice(0, 5).map((id) => ({
      seller: this.publicCard(cards.get(id)),
      link: links.find((l) => l.sellerTenantId === id) ?? null,
    }));
  }

  /** What one business may see of another before they are linked. */
  private publicCard(c: BusinessCard | undefined) {
    if (!c) return null;
    return { tenantId: c.tenantId, name: c.name, city: c.city, area: c.area, logoUrl: c.logoUrl, phone: c.phone ? `${'*'.repeat(Math.max(0, c.phone.length - 4))}${c.phone.slice(-4)}` : null };
  }

  /** The opt-in directory: listed sellers with distribution open. */
  async directory(user: AuthenticatedUser, q: DirectoryQueryDto) {
    const search = q.search?.trim();
    const rows = await this.prisma.tradeProfile.findMany({
      where: {
        listed: true, acceptRequests: true, tenantId: { not: user.tenantId },
        ...(q.city?.trim() && { city: { equals: q.city.trim(), mode: 'insensitive' } }),
        ...(q.category?.trim() && { categories: { has: q.category.trim() } }),
        ...(search && {
          OR: [
            { displayName: { contains: search, mode: 'insensitive' } },
            { about: { contains: search, mode: 'insensitive' } },
            { brands: { has: search } },
            { categories: { has: search } },
          ],
        }),
      },
      orderBy: { updatedAt: 'desc' },
      take: 60,
    });
    const open: typeof rows = [];
    for (const r of rows) if (await this.openSeller(r.tenantId)) open.push(r);
    const [cards, links, cities] = await Promise.all([
      businessCards(this.prisma, open.map((r) => r.tenantId)),
      this.prisma.tradeLink.findMany({ where: { buyerTenantId: user.tenantId, sellerTenantId: { in: open.map((r) => r.tenantId) } }, select: { id: true, sellerTenantId: true, status: true } }),
      this.prisma.tradeProfile.findMany({ where: { listed: true, city: { not: null } }, select: { city: true }, distinct: ['city'], take: 100 }),
    ]);
    return {
      cities: cities.map((c) => c.city!).sort(),
      sellers: open.map((r) => ({
        profileId: r.id,
        seller: this.publicCard(cards.get(r.tenantId)),
        categories: r.categories, brands: r.brands, about: r.about, minOrderValue: r.minOrderValue,
        link: links.find((l) => l.sellerTenantId === r.tenantId) ?? null,
      })),
    };
  }

  /* ───────────── requests ───────────── */

  /** Buyer asks a seller to link. A pair has one link row; a closed one is opened again. */
  async request(user: AuthenticatedUser, dto: LinkRequestDto) {
    let sellerId: string | null = null;
    let via = 'CODE';
    if (dto.code) sellerId = await this.sellerByCode(dto.code);
    else if (dto.profileId) {
      via = 'DIRECTORY';
      const p = await this.prisma.tradeProfile.findFirst({ where: { id: dto.profileId, listed: true }, select: { tenantId: true } });
      sellerId = p?.tenantId ?? null;
    } else if (dto.phone) {
      via = 'PHONE';
      const ids = (await this.sellersByPhone(dto.phone)).filter((id) => id !== user.tenantId);
      if (ids.length > 1) throw new BadRequestException('Is number par ek se zyada business hain — invite code se jorein');
      sellerId = ids[0] ?? null;
    } else throw new BadRequestException('Invite code, phone ya directory se distributor chunein');

    if (!sellerId) throw new NotFoundException('Distributor nahi mila');
    if (sellerId === user.tenantId) throw new BadRequestException('Apne aap se link nahi ho sakta');
    if (!(await this.openSeller(sellerId))) throw new BadRequestException('Yeh distributor abhi naye requests nahi le raha');

    const existing = await this.prisma.tradeLink.findUnique({ where: { sellerTenantId_buyerTenantId: { sellerTenantId: sellerId, buyerTenantId: user.tenantId } } });
    let link: TradeLink;
    if (existing && !REOPENABLE.includes(existing.status as LinkStatus)) {
      if (existing.status === 'PENDING') return this.linkView(user.tenantId, existing.id);
      throw new ConflictException(existing.status === 'PAUSED' ? 'Link abhi distributor ne rok rakha hai' : 'Aap pehle se jure hue hain');
    }
    const data = {
      status: 'PENDING', requestedVia: via, requestedById: user.id, requestNote: dto.note?.trim() || null, requestedAt: new Date(),
      decidedById: null, decidedAt: null, rejectReason: null, closedBy: null,
    };
    link = existing
      ? await this.prisma.tradeLink.update({ where: { id: existing.id }, data })
      : await this.prisma.tradeLink.create({ data: { ...data, sellerTenantId: sellerId, buyerTenantId: user.tenantId } });

    const me = (await businessCards(this.prisma, [user.tenantId])).get(user.tenantId);
    void notify(this.notifications, {
      tenantId: sellerId, kind: 'LINK_REQUEST', refId: link.id, type: 'INFO',
      title: 'Network: naya link request', message: `${me?.name ?? 'Ek dukaan'} aap se maal mangwana chahti hai — approve karein`,
      link: '/network/customers?tab=requests',
    });
    return this.linkView(user.tenantId, link.id);
  }

  async cancelRequest(user: AuthenticatedUser, id: string) {
    const link = await linkFor(this.prisma, user.tenantId, id, 'BUYER');
    const done = await this.prisma.tradeLink.updateMany({ where: { id: link.id, status: 'PENDING' }, data: { status: 'CANCELLED', closedBy: 'BUYER' } });
    if (!done.count) throw new BadRequestException('Sirf pending request wapas ho sakti hai');
    return this.linkView(user.tenantId, id);
  }

  async incoming(user: AuthenticatedUser) {
    const rows = await this.prisma.tradeLink.findMany({ where: { sellerTenantId: user.tenantId, status: 'PENDING' }, orderBy: { requestedAt: 'desc' }, take: 200 });
    const cards = await businessCards(this.prisma, rows.map((r) => r.buyerTenantId));
    const suggestions = await this.customerSuggestions(user.tenantId, rows.map((r) => cards.get(r.buyerTenantId)));
    return rows.map((r) => ({
      id: r.id, status: r.status, requestedVia: r.requestedVia, requestNote: r.requestNote, requestedAt: r.requestedAt,
      buyer: cards.get(r.buyerTenantId) ?? null,
      suggestedCustomer: suggestions.get(r.buyerTenantId) ?? null,
    }));
  }

  /** An existing customer of the seller that looks like each buyer (same phone, else same name). */
  private async customerSuggestions(sellerTenantId: string, buyers: Array<BusinessCard | undefined>) {
    const out = new Map<string, { id: string; name: string; phone: string | null; balance: number }>();
    for (const b of buyers) {
      if (!b) continue;
      const hit = await this.matchCustomer(this.prisma, sellerTenantId, b);
      if (hit) out.set(b.tenantId, hit);
    }
    return out;
  }

  private async matchCustomer(db: Prisma.TransactionClient, sellerTenantId: string, b: BusinessCard) {
    const select = { id: true, name: true, phone: true, balance: true } as const;
    const key = phoneKey(b.phone);
    if (key) {
      const list = await db.customer.findMany({ where: { tenantId: sellerTenantId, isActive: true, phone: { contains: key.slice(-7) } }, select, take: 20 });
      const hit = list.find((c) => phoneKey(c.phone) === key);
      if (hit) return hit;
    }
    return db.customer.findFirst({
      where: { tenantId: sellerTenantId, isActive: true, OR: [{ name: { equals: b.name, mode: 'insensitive' } }, { businessName: { equals: b.name, mode: 'insensitive' } }] },
      select,
    });
  }

  private async matchSupplier(db: Prisma.TransactionClient, buyerTenantId: string, s: BusinessCard) {
    const select = { id: true } as const;
    const key = phoneKey(s.phone);
    if (key) {
      const list = await db.supplier.findMany({ where: { tenantId: buyerTenantId, isActive: true, phone: { contains: key.slice(-7) } }, select: { id: true, phone: true }, take: 20 });
      const hit = list.find((x) => phoneKey(x.phone) === key);
      if (hit) return hit;
    }
    return db.supplier.findFirst({ where: { tenantId: buyerTenantId, isActive: true, name: { equals: s.name, mode: 'insensitive' } }, select });
  }

  /** Price list, route, credit limit and days on the buyer's customer record, all checked to be the seller's own. */
  private async applyTerms(db: Prisma.TransactionClient, sellerTenantId: string, customerId: string, dto: LinkTermsDto) {
    const data: Prisma.CustomerUncheckedUpdateInput = {};
    if (dto.priceListId !== undefined) {
      if (dto.priceListId) {
        const ok = await db.priceList.findFirst({ where: { id: dto.priceListId, tenantId: sellerTenantId }, select: { id: true } });
        if (!ok) throw new BadRequestException('Price list nahi mili');
      }
      data.priceListId = dto.priceListId || null;
    }
    if (dto.routeId !== undefined) {
      if (dto.routeId) {
        const ok = await db.distRoute.findFirst({ where: { id: dto.routeId, tenantId: sellerTenantId }, select: { id: true } });
        if (!ok) throw new BadRequestException('Route nahi mila');
      }
      data.routeId = dto.routeId || null;
    }
    if (dto.creditLimit !== undefined) data.creditLimit = r2(dto.creditLimit);
    if (dto.creditDays !== undefined) data.creditDays = dto.creditDays || null;
    if (Object.keys(data).length) await db.customer.update({ where: { id: customerId }, data });
  }

  /** Seller approves: customer and supplier records are matched or made, terms set, link ACTIVE. */
  async approve(user: AuthenticatedUser, id: string, dto: LinkTermsDto) {
    await this.access.assertOpen(user.tenantId);
    const link = await linkFor(this.prisma, user.tenantId, id, 'SELLER');
    if (link.status !== 'PENDING') throw new BadRequestException('Sirf pending request approve hoti hai');
    const cards = await businessCards(this.prisma, [link.buyerTenantId, link.sellerTenantId]);
    const buyer = cards.get(link.buyerTenantId)!;
    const seller = cards.get(link.sellerTenantId)!;
    const bookedById = dto.bookedById
      ? (await this.prisma.user.findFirst({ where: { id: dto.bookedById, tenantId: user.tenantId, isActive: true }, select: { id: true } }))?.id
      : user.id;
    if (!bookedById) throw new BadRequestException('Booker nahi mila');

    await this.prisma.$transaction(async (tx) => {
      // Seller side: the buyer as a customer.
      let customerId: string;
      if (dto.customerId) {
        const c = await tx.customer.findFirst({ where: { id: dto.customerId, tenantId: user.tenantId }, select: { id: true } });
        if (!c) throw new BadRequestException('Customer nahi mila');
        customerId = c.id;
      } else {
        const hit = await this.matchCustomer(tx, user.tenantId, buyer);
        customerId = hit?.id ?? (await tx.customer.create({
          data: {
            tenantId: user.tenantId, name: buyer.name, businessName: buyer.name, phone: buyer.phone, address: buyer.address, city: buyer.city, area: buyer.area,
            notes: 'Nafaa network se jura', priceTier: 'WHOLESALE',
          },
          select: { id: true },
        })).id;
      }
      const taken = await tx.tradeLink.findFirst({ where: { sellerTenantId: user.tenantId, customerId, id: { not: link.id }, status: { in: ['ACTIVE', 'PAUSED'] } }, select: { id: true } });
      if (taken) throw new ConflictException('Yeh customer pehle hi kisi aur network link se jura hai');
      await this.applyTerms(tx, user.tenantId, customerId, dto);

      // Buyer side: the seller as a supplier (kept from an earlier link when there is one).
      let supplierId = link.supplierId
        ? (await tx.supplier.findFirst({ where: { id: link.supplierId, tenantId: link.buyerTenantId }, select: { id: true } }))?.id ?? null
        : null;
      if (!supplierId) {
        const hit = await this.matchSupplier(tx, link.buyerTenantId, seller);
        supplierId = hit?.id ?? (await tx.supplier.create({
          data: { tenantId: link.buyerTenantId, name: seller.name, phone: seller.phone, address: seller.address, city: seller.city, area: seller.area, notes: 'Nafaa network supplier' },
          select: { id: true },
        })).id;
      }

      const done = await tx.tradeLink.updateMany({
        where: { id: link.id, status: 'PENDING' },
        data: {
          status: 'ACTIVE', decidedById: user.id, decidedAt: new Date(), activatedAt: link.activatedAt ?? new Date(),
          customerId, supplierId, bookedById, closedBy: null, rejectReason: null,
        },
      });
      if (!done.count) throw new BadRequestException('Request pehle hi badal chuki');
    });

    void notify(this.notifications, {
      tenantId: link.buyerTenantId, kind: 'LINK_APPROVED', refId: link.id, type: 'SUCCESS',
      title: 'Supplier jur gaya', message: `${seller.name} ne aap ka request approve kar diya — ab Order bhej sakte hain`,
      link: `/network/order/${link.id}`,
    });
    return this.linkView(user.tenantId, id);
  }

  async reject(user: AuthenticatedUser, id: string, dto: RejectDto) {
    const link = await linkFor(this.prisma, user.tenantId, id, 'SELLER');
    const done = await this.prisma.tradeLink.updateMany({
      where: { id: link.id, status: 'PENDING' },
      data: { status: 'REJECTED', decidedById: user.id, decidedAt: new Date(), rejectReason: dto.reason?.trim() || null, closedBy: 'SELLER' },
    });
    if (!done.count) throw new BadRequestException('Sirf pending request reject hoti hai');
    const seller = (await businessCards(this.prisma, [user.tenantId])).get(user.tenantId);
    void notify(this.notifications, {
      tenantId: link.buyerTenantId, kind: 'LINK_REJECTED', refId: link.id, type: 'WARNING',
      title: 'Link request reject', message: `${seller?.name ?? 'Distributor'} ne request reject ki${dto.reason ? `: ${dto.reason}` : ''}`,
      link: '/network',
    });
    return this.linkView(user.tenantId, id);
  }

  /** Seller stops new orders for a while; tracking, receiving and payments go on. */
  async pause(user: AuthenticatedUser, id: string) {
    const link = await linkFor(this.prisma, user.tenantId, id, 'SELLER');
    const done = await this.prisma.tradeLink.updateMany({ where: { id: link.id, status: 'ACTIVE' }, data: { status: 'PAUSED', closedBy: 'SELLER' } });
    if (!done.count) throw new BadRequestException('Sirf chalta hua link roka ja sakta hai');
    const seller = (await businessCards(this.prisma, [user.tenantId])).get(user.tenantId);
    void notify(this.notifications, {
      tenantId: link.buyerTenantId, kind: 'LINK_PAUSED', refId: link.id, type: 'WARNING',
      title: 'Supplier ne Order rok diye', message: `${seller?.name ?? 'Supplier'} ne naye Order abhi rok diye hain`, link: '/network',
    });
    return this.linkView(user.tenantId, id);
  }

  async resume(user: AuthenticatedUser, id: string) {
    await this.access.assertOpen(user.tenantId);
    const link = await linkFor(this.prisma, user.tenantId, id, 'SELLER');
    const done = await this.prisma.tradeLink.updateMany({ where: { id: link.id, status: 'PAUSED' }, data: { status: 'ACTIVE', closedBy: null } });
    if (!done.count) throw new BadRequestException('Sirf ruka hua link dobara chalta hai');
    const seller = (await businessCards(this.prisma, [user.tenantId])).get(user.tenantId);
    void notify(this.notifications, {
      tenantId: link.buyerTenantId, kind: 'LINK_RESUMED', refId: link.id, type: 'SUCCESS',
      title: 'Supplier ne Order khol diye', message: `${seller?.name ?? 'Supplier'} ab dobara Order le raha hai`, link: `/network/order/${link.id}`,
    });
    return this.linkView(user.tenantId, id);
  }

  /** Either side ends the link. Orders already placed still track, receive and settle. */
  async unlink(user: AuthenticatedUser, id: string) {
    const link = await linkFor(this.prisma, user.tenantId, id);
    const done = await this.prisma.tradeLink.updateMany({ where: { id: link.id, status: { in: ['ACTIVE', 'PAUSED'] } }, data: { status: 'UNLINKED', closedBy: link.side } });
    if (!done.count) throw new BadRequestException('Link pehle hi band hai');
    const me = (await businessCards(this.prisma, [user.tenantId])).get(user.tenantId);
    void notify(this.notifications, {
      tenantId: link.side === 'SELLER' ? link.buyerTenantId : link.sellerTenantId, kind: 'LINK_UNLINKED', refId: link.id, type: 'WARNING',
      title: 'Network link khatam', message: `${me?.name ?? 'Doosri party'} ne link khatam kar diya. Purane Order aur khata wese hi rahenge.`,
      link: link.side === 'SELLER' ? '/network' : '/network/customers',
    });
    return this.linkView(user.tenantId, id);
  }

  async setTerms(user: AuthenticatedUser, id: string, dto: LinkTermsDto) {
    const link = await linkFor(this.prisma, user.tenantId, id, 'SELLER');
    if (!link.customerId) throw new BadRequestException('Pehle request approve karein');
    await this.prisma.$transaction(async (tx) => {
      await this.applyTerms(tx, user.tenantId, link.customerId!, dto);
      if (dto.bookedById) {
        const u = await tx.user.findFirst({ where: { id: dto.bookedById, tenantId: user.tenantId, isActive: true }, select: { id: true } });
        if (!u) throw new BadRequestException('Booker nahi mila');
        await tx.tradeLink.update({ where: { id: link.id }, data: { bookedById: u.id } });
      }
    });
    return this.linkView(user.tenantId, id);
  }

  async buyerSettings(user: AuthenticatedUser, id: string, dto: BuyerSettingsDto) {
    const link = await linkFor(this.prisma, user.tenantId, id, 'BUYER');
    if (dto.receiveShopId) {
      const s = await this.prisma.shop.findFirst({ where: { id: dto.receiveShopId, tenantId: user.tenantId, isActive: true }, select: { id: true } });
      if (!s) throw new BadRequestException('Shop nahi mili');
    }
    await this.prisma.tradeLink.update({
      where: { id: link.id },
      data: {
        ...(dto.autoReceive !== undefined && { autoReceive: dto.autoReceive }),
        ...(dto.receiveShopId !== undefined && { receiveShopId: dto.receiveShopId || null }),
      },
    });
    return this.linkView(user.tenantId, id);
  }

  /* ───────────── lists ───────────── */

  /** One link as the caller sees it. Each side sees only its own record of the other. */
  async linkView(tenantId: string, id: string) {
    const link = await linkFor(this.prisma, tenantId, id);
    const other = link.side === 'SELLER' ? link.buyerTenantId : link.sellerTenantId;
    const card = (await businessCards(this.prisma, [other])).get(other) ?? null;
    const base = {
      id: link.id, side: link.side, status: link.status, requestedVia: link.requestedVia, requestNote: link.requestNote,
      requestedAt: link.requestedAt, decidedAt: link.decidedAt, rejectReason: link.rejectReason, activatedAt: link.activatedAt, closedBy: link.closedBy,
      other: link.status === 'ACTIVE' || link.status === 'PAUSED' || link.side === 'SELLER' ? card : this.publicCard(card ?? undefined),
    };
    if (link.side === 'SELLER') {
      const customer = link.customerId
        ? await this.prisma.customer.findFirst({
          where: { id: link.customerId, tenantId },
          select: { id: true, name: true, balance: true, creditLimit: true, creditDays: true, priceListId: true, routeId: true, isActive: true },
        })
        : null;
      const [list, route] = await Promise.all([
        customer?.priceListId ? this.prisma.priceList.findFirst({ where: { id: customer.priceListId, tenantId }, select: { name: true } }) : null,
        customer?.routeId ? this.prisma.distRoute.findFirst({ where: { id: customer.routeId, tenantId }, select: { name: true } }) : null,
      ]);
      return { ...base, customer: customer ? { ...customer, priceListName: list?.name ?? null, routeName: route?.name ?? null } : null, bookedById: link.bookedById };
    }
    const supplier = link.supplierId
      ? await this.prisma.supplier.findFirst({ where: { id: link.supplierId, tenantId }, select: { id: true, name: true, outstandingDue: true } })
      : null;
    return { ...base, supplier, autoReceive: link.autoReceive, receiveShopId: link.receiveShopId };
  }

  private async counts(where: Prisma.TradeOrderWhereInput) {
    const rows = await this.prisma.tradeOrder.groupBy({ by: ['linkId', 'status'], where, _count: { _all: true } });
    return rows;
  }

  /** Buyer: linked suppliers with open orders, waiting receipts and pending payments. */
  async suppliers(user: AuthenticatedUser) {
    requirePerm(user, PERMISSIONS.TRADE_BUY, PERMISSIONS.TRADE_LINKS_MANAGE, PERMISSIONS.TRADE_PAYMENTS_MANAGE);
    const links = await this.prisma.tradeLink.findMany({ where: { buyerTenantId: user.tenantId }, orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }], take: 300 });
    const ids = links.map((l) => l.id);
    const [cards, counts, receive, payments, suppliers] = await Promise.all([
      businessCards(this.prisma, links.map((l) => l.sellerTenantId)),
      this.counts({ linkId: { in: ids } }),
      this.prisma.tradeOrder.groupBy({ by: ['linkId'], where: { linkId: { in: ids }, receiveState: { in: ['DRAFT', 'NEEDS_MAP'] } }, _count: { _all: true } }),
      this.prisma.tradePayment.groupBy({ by: ['linkId'], where: { linkId: { in: ids }, status: 'PENDING', source: 'SELLER' }, _count: { _all: true }, _sum: { amount: true } }),
      this.prisma.supplier.findMany({ where: { tenantId: user.tenantId, id: { in: links.map((l) => l.supplierId).filter((x): x is string => !!x) } }, select: { id: true, name: true, outstandingDue: true } }),
    ]);
    return links.map((l) => {
      const c = cards.get(l.sellerTenantId);
      const live = l.status === 'ACTIVE' || l.status === 'PAUSED';
      return {
        id: l.id, status: l.status, requestedAt: l.requestedAt, activatedAt: l.activatedAt, rejectReason: l.rejectReason, autoReceive: l.autoReceive,
        seller: live ? c ?? null : this.publicCard(c),
        supplier: suppliers.find((s) => s.id === l.supplierId) ?? null,
        openOrders: counts.filter((x) => x.linkId === l.id && ['BOOKED', 'APPROVED', 'INVOICED', 'LOADED'].includes(x.status)).reduce((s, x) => s + x._count._all, 0),
        toReceive: receive.find((x) => x.linkId === l.id)?._count._all ?? 0,
        paymentsToConfirm: payments.find((x) => x.linkId === l.id)?._count._all ?? 0,
      };
    });
  }

  /** Seller: linked buyers with their khata and order activity. */
  async customers(user: AuthenticatedUser, status?: string) {
    const links = await this.prisma.tradeLink.findMany({
      where: { sellerTenantId: user.tenantId, ...(status ? { status: { in: status.split(',') } } : { status: { in: ['ACTIVE', 'PAUSED', 'UNLINKED'] } }) },
      orderBy: { updatedAt: 'desc' }, take: 500,
    });
    const ids = links.map((l) => l.id);
    const since = new Date(Date.now() - 30 * 86_400_000);
    const [cards, customers, recent, payments] = await Promise.all([
      businessCards(this.prisma, links.map((l) => l.buyerTenantId)),
      this.prisma.customer.findMany({
        where: { tenantId: user.tenantId, id: { in: links.map((l) => l.customerId).filter((x): x is string => !!x) } },
        select: { id: true, name: true, balance: true, creditLimit: true, creditDays: true, priceListId: true, routeId: true },
      }),
      this.prisma.tradeOrder.groupBy({ by: ['linkId'], where: { linkId: { in: ids }, createdAt: { gte: since }, status: { not: 'CANCELLED' } }, _count: { _all: true }, _sum: { total: true } }),
      this.prisma.tradePayment.groupBy({ by: ['linkId'], where: { linkId: { in: ids }, status: 'PENDING', source: 'BUYER' }, _count: { _all: true } }),
    ]);
    const lists = await this.prisma.priceList.findMany({ where: { tenantId: user.tenantId }, select: { id: true, name: true } });
    const routes = await this.prisma.distRoute.findMany({ where: { tenantId: user.tenantId }, select: { id: true, name: true } });
    return links.map((l) => {
      const c = customers.find((x) => x.id === l.customerId) ?? null;
      const r = recent.find((x) => x.linkId === l.id);
      return {
        id: l.id, status: l.status, activatedAt: l.activatedAt, closedBy: l.closedBy,
        buyer: cards.get(l.buyerTenantId) ?? null,
        customer: c ? { ...c, priceListName: lists.find((x) => x.id === c.priceListId)?.name ?? null, routeName: routes.find((x) => x.id === c.routeId)?.name ?? null } : null,
        orders30d: r?._count._all ?? 0, value30d: r2(r?._sum.total ?? 0),
        paymentsToConfirm: payments.find((x) => x.linkId === l.id)?._count._all ?? 0,
      };
    });
  }

  /** Counts for the network home and the sidebar, for both sides at once. */
  async overview(user: AuthenticatedUser) {
    const t = user.tenantId;
    const access = await this.access.read(t);
    const canSell = access.enabled && access.planAllows;
    const [buyLinks, toReceive, buyPay, openBuy, sellLinks, requests, sellPay, newOrders] = await Promise.all([
      this.prisma.tradeLink.count({ where: { buyerTenantId: t, status: { in: ['ACTIVE', 'PAUSED'] } } }),
      this.prisma.tradeOrder.count({ where: { buyerTenantId: t, receiveState: { in: ['DRAFT', 'NEEDS_MAP'] } } }),
      this.prisma.tradePayment.count({ where: { buyerTenantId: t, status: 'PENDING', source: 'SELLER' } }),
      this.prisma.tradeOrder.count({ where: { buyerTenantId: t, status: { in: ['BOOKED', 'APPROVED', 'INVOICED', 'LOADED'] } } }),
      canSell ? this.prisma.tradeLink.count({ where: { sellerTenantId: t, status: { in: ['ACTIVE', 'PAUSED'] } } }) : 0,
      canSell ? this.prisma.tradeLink.count({ where: { sellerTenantId: t, status: 'PENDING' } }) : 0,
      canSell ? this.prisma.tradePayment.count({ where: { sellerTenantId: t, status: 'PENDING', source: 'BUYER' } }) : 0,
      canSell ? this.prisma.tradeOrder.count({ where: { sellerTenantId: t, status: 'BOOKED' } }) : 0,
    ]);
    return {
      buyer: { suppliers: buyLinks, openOrders: openBuy, toReceive, paymentsToConfirm: buyPay },
      seller: { canSell, access, customers: sellLinks, requests, paymentsToConfirm: sellPay, newOrders },
      perms: {
        buy: can(user, PERMISSIONS.TRADE_BUY), receive: can(user, PERMISSIONS.TRADE_RECEIVE), sell: can(user, PERMISSIONS.TRADE_SELL),
        links: can(user, PERMISSIONS.TRADE_LINKS_MANAGE), payments: can(user, PERMISSIONS.TRADE_PAYMENTS_MANAGE),
      },
    };
  }

  /** For the seller's approve screen: price lists, routes and staff to pick from. */
  async sellerOptions(user: AuthenticatedUser) {
    if (!can(user, PERMISSIONS.TRADE_LINKS_MANAGE) && !can(user, PERMISSIONS.TRADE_SELL)) throw new ForbiddenException('Is kaam ki permission nahi');
    const t = user.tenantId;
    const [priceLists, routes, staff] = await Promise.all([
      this.prisma.priceList.findMany({ where: { tenantId: t, isActive: true }, select: { id: true, name: true, isDefault: true }, orderBy: { name: 'asc' } }),
      this.prisma.distRoute.findMany({ where: { tenantId: t, isActive: true }, select: { id: true, name: true, area: true }, orderBy: { name: 'asc' } }),
      this.prisma.user.findMany({ where: { tenantId: t, isActive: true }, select: { id: true, fullName: true, role: true }, orderBy: { fullName: 'asc' }, take: 200 }),
    ]);
    return { priceLists, routes, staff };
  }
}
