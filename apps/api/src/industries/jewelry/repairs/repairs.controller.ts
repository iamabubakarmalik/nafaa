import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { RepairsService } from './repairs.service';

/** Repairs are counter work: taking the piece, the advance and the bill all need pos.use. */
@ApiTags('Jewelry - Repairs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('jewelry/repairs')
export class RepairsController {
  constructor(private readonly service: RepairsService) {}

  @RequirePermissions(PERMISSIONS.POS_USE)
  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto ?? {}); }

  @RequirePermissions(PERMISSIONS.POS_USE)
  @Get('page') page(@GetUser() user: AuthenticatedUser, @Query() q: any) {
    return this.service.page(user, { view: q.view, search: q.search, karigarId: q.karigarId, page: Number(q.page), limit: Number(q.limit) });
  }

  @RequirePermissions(PERMISSIONS.POS_USE)
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }

  @RequirePermissions(PERMISSIONS.POS_USE)
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.update(user, id, dto ?? {}); }

  @RequirePermissions(PERMISSIONS.POS_USE)
  @Patch(':id/status') status(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { status: string; reason?: string }) {
    return this.service.setStatus(user, id, String(body?.status ?? ''), body?.reason);
  }

  @RequirePermissions(PERMISSIONS.POS_USE)
  @Post(':id/payment') payment(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { amount: number; paymentMethod?: string }) {
    return this.service.addPayment(user, id, body?.amount, body?.paymentMethod);
  }

  @RequirePermissions(PERMISSIONS.POS_USE)
  @Post(':id/deliver') deliver(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: any) {
    return this.service.deliver(user, id, body ?? {});
  }
}
