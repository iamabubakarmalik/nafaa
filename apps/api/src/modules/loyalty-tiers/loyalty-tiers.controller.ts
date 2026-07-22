import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LoyaltyTierLevel } from '@prisma/client';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CustomerAuthGuard } from '../../marketplace/_shared/guards/customer-auth.guard';
import { GetCustomer } from '../../marketplace/_shared/decorators/get-customer.decorator';
import { AuthenticatedCustomer } from '../../marketplace/auth/interfaces/customer-jwt.interface';
import { LoyaltyTiersService } from './loyalty-tiers.service';

@ApiTags('Loyalty Tiers')
@Controller('loyalty-tiers')
export class LoyaltyTiersController {
  constructor(private readonly svc: LoyaltyTiersService) {}

  // ADMIN
  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @Post('seed') seed() { return this.svc.seedDefaultConfigs(); }

  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @Get('configs') configs() { return this.svc.getAllConfigs(); }

  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @Patch('configs/:level') update(@Param('level') level: LoyaltyTierLevel, @Body() body: any) { return this.svc.updateConfig(level, body); }

  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @Get('customers')
  listCustomers(@Query('tier') tier?: LoyaltyTierLevel, @Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.svc.listByTier(tier, +(limit ?? 50), +(offset ?? 0));
  }

  // CUSTOMER
  @UseGuards(CustomerAuthGuard) @ApiBearerAuth()
  @Get('me') me(@GetCustomer() c: AuthenticatedCustomer) { return this.svc.getCustomerState(c.id); }

  @UseGuards(CustomerAuthGuard) @ApiBearerAuth()
  @Post('me/recompute') recompute(@GetCustomer() c: AuthenticatedCustomer) { return this.svc.recomputeTier(c.id); }

  @UseGuards(CustomerAuthGuard) @ApiBearerAuth()
  @Get('me/history') history(@GetCustomer() c: AuthenticatedCustomer) { return this.svc.getTierHistory(c.id); }
}
