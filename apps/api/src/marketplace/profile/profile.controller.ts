import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CustomerAuthGuard } from '../_shared/guards/customer-auth.guard';
import { GetCustomer } from '../_shared/decorators/get-customer.decorator';
import { AuthenticatedCustomer } from '../auth/interfaces/customer-jwt.interface';
import { MarketplaceProfileService } from './profile.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { SaveCardDto } from './dto/save-card.dto';
import { RegisterPushTokenDto } from './dto/push-token.dto';

@ApiTags('Marketplace / Profile')
@Controller('marketplace/profile')
@UseGuards(CustomerAuthGuard)
@ApiBearerAuth()
export class MarketplaceProfileController {
  constructor(private readonly svc: MarketplaceProfileService) {}

  // ─── ADDRESSES ───
  @Get('addresses')
  @ApiOperation({ summary: 'List all saved addresses' })
  listAddresses(@GetCustomer() c: AuthenticatedCustomer) {
    return this.svc.listAddresses(c.id);
  }

  @Post('addresses')
  @ApiOperation({ summary: 'Add new address' })
  addAddress(@GetCustomer() c: AuthenticatedCustomer, @Body() dto: CreateAddressDto) {
    return this.svc.createAddress(c.id, dto);
  }

  @Patch('addresses/:id')
  @ApiOperation({ summary: 'Update address' })
  updateAddress(
    @GetCustomer() c: AuthenticatedCustomer,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.svc.updateAddress(c.id, id, dto);
  }

  @Delete('addresses/:id')
  @ApiOperation({ summary: 'Delete address' })
  deleteAddress(@GetCustomer() c: AuthenticatedCustomer, @Param('id') id: string) {
    return this.svc.deleteAddress(c.id, id);
  }

  @Post('addresses/:id/default')
  @ApiOperation({ summary: 'Set an address as default' })
  setDefault(@GetCustomer() c: AuthenticatedCustomer, @Param('id') id: string) {
    return this.svc.setDefaultAddress(c.id, id);
  }

  // ─── SAVED CARDS ───
  @Get('cards')
  @ApiOperation({ summary: 'List saved payment cards' })
  listCards(@GetCustomer() c: AuthenticatedCustomer) {
    return this.svc.listSavedCards(c.id);
  }

  @Post('cards')
  @ApiOperation({ summary: 'Save a tokenized card' })
  saveCard(@GetCustomer() c: AuthenticatedCustomer, @Body() dto: SaveCardDto) {
    return this.svc.saveCard(c.id, dto);
  }

  @Delete('cards/:id')
  @ApiOperation({ summary: 'Delete a saved card' })
  deleteCard(@GetCustomer() c: AuthenticatedCustomer, @Param('id') id: string) {
    return this.svc.deleteCard(c.id, id);
  }

  // ─── WALLET & LOYALTY ───
  @Get('wallet')
  @ApiOperation({ summary: 'Wallet balance, loyalty points, recent transactions' })
  wallet(@GetCustomer() c: AuthenticatedCustomer) {
    return this.svc.getWallet(c.id);
  }

  @Get('wallet/history')
  @ApiOperation({ summary: 'Full wallet transaction history' })
  walletHistory(
    @GetCustomer() c: AuthenticatedCustomer,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.svc.getWalletHistory(c.id, +(limit ?? 50), +(offset ?? 0));
  }

  // ─── REFERRALS ───
  @Get('referrals')
  @ApiOperation({ summary: 'Referral code + stats' })
  referrals(@GetCustomer() c: AuthenticatedCustomer) {
    return this.svc.getReferralStats(c.id);
  }

  // ─── PUSH ───
  @Post('push-tokens')
  @ApiOperation({ summary: 'Register a push notification token' })
  registerPush(@GetCustomer() c: AuthenticatedCustomer, @Body() dto: RegisterPushTokenDto) {
    return this.svc.registerPushToken(c.id, dto);
  }

  @Delete('push-tokens')
  @ApiOperation({ summary: 'Remove a push token' })
  removePush(@GetCustomer() c: AuthenticatedCustomer, @Body() body: { token: string }) {
    return this.svc.removePushToken(c.id, body.token);
  }

  @Get('push-tokens')
  @ApiOperation({ summary: 'List active push tokens (devices)' })
  listPush(@GetCustomer() c: AuthenticatedCustomer) {
    return this.svc.listPushTokens(c.id);
  }

  // ─── MARKETING PREFS ───
  @Patch('marketing-prefs')
  @ApiOperation({ summary: 'Update marketing channel preferences' })
  marketingPrefs(
    @GetCustomer() c: AuthenticatedCustomer,
    @Body() body: { emails?: boolean; sms?: boolean; push?: boolean; whatsapp?: boolean },
  ) {
    return this.svc.updateMarketingPrefs(c.id, body);
  }
}
