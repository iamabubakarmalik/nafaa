/**
 * Guest register: the people who stay, with their ID for the police record,
 * company, VIP and blacklist flags and stay totals. Profiles are never
 * deleted; removing one only hides it, so old stays keep their guest.
 */

import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { cleanIdNumber, cleanPhone, dayOf, found, nextGuestNumber, r2, type Db } from '../common/hotel-common';
import { GuestDto } from '../common/hotel.dto';

@Injectable()
export class GuestsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Fields of the form, cleaned; `base` fills the name when only part of it changes. */
  private fields(dto: GuestDto, base?: { firstName: string; lastName: string | null; idType: string | null }) {
    const firstName = (dto.firstName ?? base?.firstName ?? dto.fullName?.trim().split(/\s+/)[0] ?? '').trim();
    const lastName = (dto.lastName !== undefined ? dto.lastName : base?.lastName ?? dto.fullName?.trim().split(/\s+/).slice(1).join(' ') ?? '')?.trim() || null;
    if (!firstName) throw new BadRequestException('Guest ka naam likhein');
    const idType = dto.idType ?? (base?.idType as GuestDto['idType']) ?? (dto.idNumber ? 'CNIC' : undefined);
    const data: Prisma.HotelGuestUncheckedUpdateInput = {
      firstName, lastName, fullName: [firstName, lastName].filter(Boolean).join(' '),
      ...(dto.title !== undefined && { title: dto.title.trim() || null }),
      ...(dto.phone !== undefined && { phone: cleanPhone(dto.phone, 'Guest ka phone') }),
      ...(dto.altPhone !== undefined && { altPhone: dto.altPhone.trim() || null }),
      ...(dto.email !== undefined && { email: dto.email.trim() || null }),
      ...(dto.idNumber !== undefined && { idType: dto.idNumber.trim() ? idType ?? 'CNIC' : null, idNumber: cleanIdNumber(idType, dto.idNumber) }),
      ...(dto.idType !== undefined && dto.idNumber === undefined && { idType: dto.idType }),
      ...(dto.idExpiryDate !== undefined && { idExpiryDate: dto.idExpiryDate ? dayOf(dto.idExpiryDate, 'ID expiry') : null }),
      ...(dto.dateOfBirth !== undefined && { dateOfBirth: dto.dateOfBirth ? dayOf(dto.dateOfBirth, 'Date of birth') : null }),
      ...(dto.gender !== undefined && { gender: dto.gender || null }),
      ...(dto.nationality !== undefined && { nationality: dto.nationality.trim() || null }),
      ...(dto.address !== undefined && { address: dto.address.trim() || null }),
      ...(dto.city !== undefined && { city: dto.city.trim() || null }),
      ...(dto.country !== undefined && { country: dto.country.trim() || null }),
      ...(dto.companyName !== undefined && { companyName: dto.companyName.trim() || null }),
      ...(dto.designation !== undefined && { designation: dto.designation.trim() || null }),
      ...(dto.isVIP !== undefined && { isVIP: dto.isVIP }),
      ...(dto.specialRequests !== undefined && { specialRequests: dto.specialRequests.trim() || null }),
      ...(dto.notes !== undefined && { notes: dto.notes.trim() || null }),
    };
    return data;
  }

  private async assertUniqueId(tenantId: string, idNumber: string | null | undefined, exceptId?: string) {
    if (!idNumber) return;
    const dup = await this.prisma.hotelGuest.findFirst({ where: { tenantId, idNumber, isActive: true, ...(exceptId && { id: { not: exceptId } }) }, select: { fullName: true, guestNumber: true } });
    if (dup) throw new BadRequestException(`Ye ID pehle se ${dup.fullName} (${dup.guestNumber}) ke naam hai`);
  }

  private async linkCustomer(tenantId: string, customerId?: string) {
    if (!customerId) return undefined;
    found(await this.prisma.customer.findFirst({ where: { id: customerId, tenantId }, select: { id: true } }), 'Customer');
    return customerId;
  }

  async create(user: AuthenticatedUser, dto: GuestDto) {
    if (!dto.phone) throw new BadRequestException('Guest ka phone likhein');
    const data = this.fields(dto);
    await this.assertUniqueId(user.tenantId, data.idNumber as string | null);
    const customerId = await this.linkCustomer(user.tenantId, dto.customerId);
    return this.prisma.$transaction(async (tx) => tx.hotelGuest.create({
      data: {
        ...(data as Prisma.HotelGuestUncheckedCreateInput),
        tenantId: user.tenantId, guestNumber: await nextGuestNumber(tx as Db, user.tenantId), ...(customerId && { customerId }),
      },
    }));
  }

  /** Paged register with counts for the cards. */
  async page(user: AuthenticatedUser, q: Record<string, string | undefined>) {
    const page = Math.max(Number(q.page) || 1, 1);
    const limit = Math.min(Math.max(Number(q.limit) || 30, 1), 200);
    const search = q.search?.trim();
    const base: Prisma.HotelGuestWhereInput = { tenantId: user.tenantId, isActive: true };
    const where: Prisma.HotelGuestWhereInput = {
      ...base,
      ...(q.view === 'vip' && { isVIP: true }),
      ...(q.view === 'blacklisted' && { isBlacklisted: true }),
      ...(q.view === 'company' && { companyName: { not: null } }),
      ...(q.view === 'repeat' && { totalStays: { gte: 2 } }),
      ...(q.view === 'noid' && { OR: [{ idNumber: null }, { idNumber: '' }] }),
      ...(search && {
        AND: [{
          OR: [
            { guestNumber: { contains: search, mode: 'insensitive' } },
            { fullName: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
            { idNumber: { contains: search } },
            { companyName: { contains: search, mode: 'insensitive' } },
            { city: { contains: search, mode: 'insensitive' } },
          ],
        }],
      }),
    };
    const sort = q.sort === 'spent' ? { totalSpent: 'desc' as const } : q.sort === 'stays' ? { totalStays: 'desc' as const } : q.sort === 'name' ? { fullName: 'asc' as const } : { updatedAt: 'desc' as const };
    const [items, total, counts] = await Promise.all([
      this.prisma.hotelGuest.findMany({ where, orderBy: [sort, { createdAt: 'desc' }], skip: (page - 1) * limit, take: limit }),
      this.prisma.hotelGuest.count({ where }),
      this.stats(user),
    ]);
    const inHouse = items.length
      ? await this.prisma.hotelBooking.findMany({ where: { tenantId: user.tenantId, primaryGuestId: { in: items.map((g) => g.id) }, status: { in: ['CHECKED_IN', 'EXTENDED'] } }, select: { id: true, primaryGuestId: true, bookedRooms: { select: { roomNumber: true } } } })
      : [];
    const stay = new Map(inHouse.map((b) => [b.primaryGuestId!, { bookingId: b.id, rooms: b.bookedRooms.map((r) => r.roomNumber).filter(Boolean).join(', ') }]));
    return { items: items.map((g) => ({ ...g, inHouse: stay.get(g.id) ?? null })), total, page, limit, pages: Math.max(Math.ceil(total / limit), 1), counts };
  }

  /** Short list for pickers and older screens (latest 200). */
  async list(user: AuthenticatedUser, params: { isVIP?: boolean; isBlacklisted?: boolean; nationality?: string; search?: string; customerId?: string }) {
    const search = params.search?.trim();
    return this.prisma.hotelGuest.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.isVIP !== undefined && { isVIP: params.isVIP }),
        ...(params.isBlacklisted !== undefined && { isBlacklisted: params.isBlacklisted }),
        ...(params.nationality && { nationality: { contains: params.nationality, mode: 'insensitive' } }),
        ...(search && {
          OR: [
            { guestNumber: { contains: search, mode: 'insensitive' } },
            { fullName: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
            { email: { contains: search, mode: 'insensitive' } },
            { idNumber: { contains: search } },
            { companyName: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
  }

  /** Profile with stays and the khata it is linked to. */
  async getOne(user: AuthenticatedUser, id: string) {
    const g = found(await this.prisma.hotelGuest.findFirst({ where: { id, tenantId: user.tenantId } }), 'Guest');
    const [stays, khata] = await Promise.all([
      this.prisma.hotelBooking.findMany({
        where: { tenantId: user.tenantId, primaryGuestId: id },
        select: { id: true, bookingNumber: true, status: true, checkInDate: true, checkOutDate: true, nights: true, grandTotal: true, balanceAmount: true, bookedRooms: { select: { roomNumber: true } } },
        orderBy: { checkInDate: 'desc' }, take: 50,
      }),
      g.customerId ? this.prisma.customer.findFirst({ where: { id: g.customerId, tenantId: user.tenantId }, select: { id: true, name: true, balance: true } }) : null,
    ]);
    return { ...g, stays, khata: khata ? { ...khata, balance: r2(Number(khata.balance)) } : null };
  }

  async update(user: AuthenticatedUser, id: string, dto: GuestDto) {
    const g = found(await this.prisma.hotelGuest.findFirst({ where: { id, tenantId: user.tenantId } }), 'Guest');
    const data = this.fields(dto, g);
    if (dto.idNumber !== undefined) await this.assertUniqueId(user.tenantId, data.idNumber as string | null, id);
    const customerId = await this.linkCustomer(user.tenantId, dto.customerId);
    return this.prisma.hotelGuest.update({ where: { id }, data: { ...data, ...(customerId && { customerId }) } });
  }

  async blacklist(user: AuthenticatedUser, id: string, reason: string) {
    found(await this.prisma.hotelGuest.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } }), 'Guest');
    const why = reason?.trim();
    if (!why) throw new BadRequestException('Blacklist ki wajah likhein');
    return this.prisma.hotelGuest.update({ where: { id }, data: { isBlacklisted: true, blacklistReason: why } });
  }

  async unblacklist(user: AuthenticatedUser, id: string) {
    found(await this.prisma.hotelGuest.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } }), 'Guest');
    return this.prisma.hotelGuest.update({ where: { id }, data: { isBlacklisted: false, blacklistReason: null } });
  }

  /** Hides the profile; a guest in the hotel or with a coming booking stays. */
  async remove(user: AuthenticatedUser, id: string) {
    found(await this.prisma.hotelGuest.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } }), 'Guest');
    const open = await this.prisma.hotelBooking.findFirst({
      where: { tenantId: user.tenantId, primaryGuestId: id, status: { in: ['INQUIRY', 'QUOTED', 'TENTATIVE', 'CONFIRMED', 'CHECKED_IN', 'EXTENDED'] } },
      select: { bookingNumber: true },
    });
    if (open) throw new BadRequestException(`Is guest ki booking ${open.bookingNumber} chal rahi hai — pehle use band karein`);
    return this.prisma.hotelGuest.update({ where: { id }, data: { isActive: false } });
  }

  async stats(user: AuthenticatedUser) {
    const where = { tenantId: user.tenantId, isActive: true };
    const [total, vip, blacklisted, company, repeat, noId, inHouse, byNationality] = await Promise.all([
      this.prisma.hotelGuest.count({ where }),
      this.prisma.hotelGuest.count({ where: { ...where, isVIP: true } }),
      this.prisma.hotelGuest.count({ where: { ...where, isBlacklisted: true } }),
      this.prisma.hotelGuest.count({ where: { ...where, companyName: { not: null } } }),
      this.prisma.hotelGuest.count({ where: { ...where, totalStays: { gte: 2 } } }),
      this.prisma.hotelGuest.count({ where: { ...where, OR: [{ idNumber: null }, { idNumber: '' }] } }),
      this.prisma.hotelBooking.count({ where: { tenantId: user.tenantId, status: { in: ['CHECKED_IN', 'EXTENDED'] } } }),
      this.prisma.hotelGuest.groupBy({
        by: ['nationality'], where: { ...where, nationality: { not: null } }, _count: { _all: true }, orderBy: { _count: { nationality: 'desc' } }, take: 10,
      }),
    ]);
    return { total, vip, blacklisted, company, repeat, noId, inHouse, byNationality };
  }
}
