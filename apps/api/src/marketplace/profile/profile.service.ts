import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { SaveCardDto } from './dto/save-card.dto';
import { RegisterPushTokenDto } from './dto/push-token.dto';

@Injectable()
export class MarketplaceProfileService {
  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════
  // ADDRESSES
  // ═══════════════════════════════════════════════════════════

  async listAddresses(customerId: string) {
    return this.prisma.customerAddress.findMany({
      where: { customerId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createAddress(customerId: string, dto: CreateAddressDto) {
    // First address becomes default automatically
    const existingCount = await this.prisma.customerAddress.count({ where: { customerId } });
    const shouldBeDefault = dto.isDefault || existingCount === 0;

    return this.prisma.$transaction(async (tx) => {
      if (shouldBeDefault) {
        await tx.customerAddress.updateMany({
          where: { customerId, isDefault: true },
          data: { isDefault: false },
        });
      }
      const address = await tx.customerAddress.create({
        data: {
          customerId,
          label: dto.label,
          fullName: dto.fullName,
          phone: dto.phone,
          addressLine1: dto.addressLine1,
          addressLine2: dto.addressLine2,
          landmark: dto.landmark,
          city: dto.city,
          area: dto.area,
          province: dto.province,
          postalCode: dto.postalCode,
          lat: dto.lat,
          lng: dto.lng,
          addressType: dto.addressType ?? 'HOME',
          isDefault: shouldBeDefault,
          deliveryNotes: dto.deliveryNotes,
        },
      });
      if (shouldBeDefault) {
        await tx.marketplaceCustomer.update({
          where: { id: customerId },
          data: { defaultAddressId: address.id },
        });
      }
      return address;
    });
  }

  async updateAddress(customerId: string, addressId: string, dto: UpdateAddressDto) {
    const address = await this.prisma.customerAddress.findFirst({
      where: { id: addressId, customerId },
    });
    if (!address) throw new NotFoundException('Address not found');

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.customerAddress.updateMany({
          where: { customerId, isDefault: true, id: { not: addressId } },
          data: { isDefault: false },
        });
        await tx.marketplaceCustomer.update({
          where: { id: customerId },
          data: { defaultAddressId: addressId },
        });
      }
      return tx.customerAddress.update({
        where: { id: addressId },
        data: {
          label: dto.label,
          fullName: dto.fullName,
          phone: dto.phone,
          addressLine1: dto.addressLine1,
          addressLine2: dto.addressLine2,
          landmark: dto.landmark,
          city: dto.city,
          area: dto.area,
          province: dto.province,
          postalCode: dto.postalCode,
          lat: dto.lat,
          lng: dto.lng,
          addressType: dto.addressType,
          isDefault: dto.isDefault,
          deliveryNotes: dto.deliveryNotes,
        },
      });
    });
  }

  async deleteAddress(customerId: string, addressId: string) {
    const address = await this.prisma.customerAddress.findFirst({
      where: { id: addressId, customerId },
    });
    if (!address) throw new NotFoundException('Address not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.customerAddress.delete({ where: { id: addressId } });
      if (address.isDefault) {
        // Promote another to default
        const next = await tx.customerAddress.findFirst({
          where: { customerId },
          orderBy: { createdAt: 'desc' },
        });
        if (next) {
          await tx.customerAddress.update({
            where: { id: next.id },
            data: { isDefault: true },
          });
          await tx.marketplaceCustomer.update({
            where: { id: customerId },
            data: { defaultAddressId: next.id },
          });
        } else {
          await tx.marketplaceCustomer.update({
            where: { id: customerId },
            data: { defaultAddressId: null },
          });
        }
      }
    });
    return { success: true };
  }

  async setDefaultAddress(customerId: string, addressId: string) {
    const address = await this.prisma.customerAddress.findFirst({
      where: { id: addressId, customerId },
    });
    if (!address) throw new NotFoundException('Address not found');

    await this.prisma.$transaction([
      this.prisma.customerAddress.updateMany({
        where: { customerId, isDefault: true },
        data: { isDefault: false },
      }),
      this.prisma.customerAddress.update({
        where: { id: addressId },
        data: { isDefault: true },
      }),
      this.prisma.marketplaceCustomer.update({
        where: { id: customerId },
        data: { defaultAddressId: addressId },
      }),
    ]);
    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════
  // SAVED CARDS
  // ═══════════════════════════════════════════════════════════

  async listSavedCards(customerId: string) {
    return this.prisma.customerSavedCard.findMany({
      where: { customerId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true, cardBrand: true, last4: true,
        expiryMonth: true, expiryYear: true, holderName: true,
        gatewayProvider: true, isDefault: true, createdAt: true,
      },
    });
  }

  async saveCard(customerId: string, dto: SaveCardDto) {
    const count = await this.prisma.customerSavedCard.count({ where: { customerId } });
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault || count === 0) {
        await tx.customerSavedCard.updateMany({
          where: { customerId, isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.customerSavedCard.create({
        data: {
          customerId, ...dto,
          isDefault: dto.isDefault || count === 0,
        },
      });
    });
  }

  async deleteCard(customerId: string, cardId: string) {
    const card = await this.prisma.customerSavedCard.findFirst({
      where: { id: cardId, customerId },
    });
    if (!card) throw new NotFoundException('Card not found');
    await this.prisma.customerSavedCard.delete({ where: { id: cardId } });
    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════
  // WALLET & LOYALTY
  // ═══════════════════════════════════════════════════════════

  async getWallet(customerId: string) {
    const customer = await this.prisma.marketplaceCustomer.findUnique({
      where: { id: customerId },
      select: { walletBalance: true, loyaltyPoints: true, currency: true },
    });
    if (!customer) throw new NotFoundException();

    const recentTxns = await this.prisma.customerWalletTxn.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return {
      balance: Number(customer.walletBalance),
      loyaltyPoints: customer.loyaltyPoints,
      loyaltyValue: customer.loyaltyPoints * 0.5,
      currency: customer.currency,
      recentTransactions: recentTxns,
    };
  }

  async getWalletHistory(customerId: string, limit = 50, offset = 0) {
    const [items, total] = await Promise.all([
      this.prisma.customerWalletTxn.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
        take: limit, skip: offset,
      }),
      this.prisma.customerWalletTxn.count({ where: { customerId } }),
    ]);
    return { items, total, limit, offset };
  }

  // ═══════════════════════════════════════════════════════════
  // REFERRALS
  // ═══════════════════════════════════════════════════════════

  async getReferralStats(customerId: string) {
    const customer = await this.prisma.marketplaceCustomer.findUnique({
      where: { id: customerId },
      select: {
        referralCode: true,
        referrals: {
          select: {
            id: true, fullName: true, createdAt: true,
          },
        },
      },
    });
    if (!customer) throw new NotFoundException();

    return {
      referralCode: customer.referralCode,
      totalReferrals: customer.referrals.length,
      referredCustomers: customer.referrals,
      bonusPerReferral: 100,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // PUSH TOKENS
  // ═══════════════════════════════════════════════════════════

  async registerPushToken(customerId: string, dto: RegisterPushTokenDto) {
    return this.prisma.customerPushToken.upsert({
      where: { token: dto.token },
      update: {
        customerId, platform: dto.platform,
        deviceInfo: dto.deviceInfo, isActive: true, lastUsedAt: new Date(),
      },
      create: {
        customerId, token: dto.token, platform: dto.platform,
        deviceInfo: dto.deviceInfo, isActive: true,
      },
    });
  }

  async removePushToken(customerId: string, token: string) {
    await this.prisma.customerPushToken.deleteMany({
      where: { customerId, token },
    });
    return { success: true };
  }

  async listPushTokens(customerId: string) {
    return this.prisma.customerPushToken.findMany({
      where: { customerId, isActive: true },
      select: {
        id: true, platform: true, deviceInfo: true, lastUsedAt: true, createdAt: true,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════
  // MARKETING PREFERENCES
  // ═══════════════════════════════════════════════════════════

  async updateMarketingPrefs(
    customerId: string,
    prefs: { emails?: boolean; sms?: boolean; push?: boolean; whatsapp?: boolean },
  ) {
    return this.prisma.marketplaceCustomer.update({
      where: { id: customerId },
      data: {
        marketingEmails: prefs.emails,
        marketingSms: prefs.sms,
        marketingPush: prefs.push,
        marketingWhatsapp: prefs.whatsapp,
      },
      select: {
        marketingEmails: true, marketingSms: true,
        marketingPush: true, marketingWhatsapp: true,
      },
    });
  }
}
