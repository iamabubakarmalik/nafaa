import { Body, Controller, ForbiddenException, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS, hasPermission, type PermissionKey } from '../../../common/constants/permissions.constants';
import { ExchangesService, REPAIR_TYPES } from './exchanges.service';

/** Counter work (old repairs, gold weighed in for a bill) needs pos.use; buying old metal needs the purchase right. */
function need(user: AuthenticatedUser, counter: boolean, write: boolean) {
  const perm: PermissionKey = counter ? PERMISSIONS.POS_USE : write ? PERMISSIONS.PURCHASES_CREATE : PERMISSIONS.PURCHASES_VIEW;
  if (!hasPermission(user.role, user.permissions, perm)) {
    throw new ForbiddenException('Is kaam ki permission aap ke paas nahi — dukaan ke malik se kehein ke de dein');
  }
}
const isRepair = (type: unknown) => REPAIR_TYPES.includes(type as (typeof REPAIR_TYPES)[number]);

/** Buying old gold is a purchase; gold taken toward a bill and old repairs are counter work (pos.use). */
@ApiTags('Jewelry - Exchanges')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('jewelry/exchanges')
export class ExchangesController {
  constructor(private readonly service: ExchangesService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: any) {
    need(user, dto?.forBill === true, true);
    return this.service.create(user, dto);
  }

  @RequirePermissions(PERMISSIONS.PURCHASES_VIEW)
  @Get() list(@GetUser() user: AuthenticatedUser, @Query() q: any) {
    return this.service.list(user, { customerId: q.customerId, exchangeType: q.exchangeType, from: q.from, to: q.to, search: q.search });
  }

  @Get('page') page(@GetUser() user: AuthenticatedUser, @Query() q: any) {
    need(user, String(q.kind ?? '').startsWith('repair') || q.kind === 'bill-open', false);
    return this.service.page(user, { kind: q.kind, search: q.search, from: q.from, to: q.to, page: Number(q.page), limit: Number(q.limit) });
  }

  @RequirePermissions(PERMISSIONS.PURCHASES_VIEW)
  @Get('summary') summary(@GetUser() user: AuthenticatedUser, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.summary(user, from, to);
  }

  @Get(':id') async getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    const e = await this.service.getOne(user, id);
    need(user, isRepair(e.exchangeType) || e.purpose === 'SALE', false);
    return e;
  }

  @RequirePermissions(PERMISSIONS.POS_USE)
  @Post(':id/deliver') deliver(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: any) {
    return this.service.deliverRepair(user, id, body ?? {});
  }

  /** Gold weighed in for a bill that the customer takes back. */
  @RequirePermissions(PERMISSIONS.POS_USE)
  @Post(':id/give-back') giveBack(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.giveBack(user, id);
  }

  @RequirePermissions(PERMISSIONS.PURCHASES_CREATE)
  @Post(':id/link-sale') linkSale(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { saleId: string }) {
    return this.service.linkToSale(user, id, body.saleId);
  }
}
