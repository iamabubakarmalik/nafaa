import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { MarketCustomersService } from './market-customers.service';

@ApiTags('Marketplace Customers (Shop-side)')
@Controller('marketplace/manage/customers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MarketCustomersController {
  constructor(private readonly svc: MarketCustomersService) {}

  @Get()
  @ApiOperation({ summary: 'Customers who ordered from this shop on Nafaa Market' })
  list(@Req() req: Request, @Query() q: { search?: string; page?: string; limit?: string }) {
    return this.svc.list((req as any).user as AuthenticatedUser, { search: q.search, page: Number(q.page), limit: Number(q.limit) });
  }
}
