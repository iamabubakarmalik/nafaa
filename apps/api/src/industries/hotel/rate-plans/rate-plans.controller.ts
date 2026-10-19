import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { requireAny } from '../common/hotel-common';
import { RatePlanDto } from '../common/hotel.dto';
import { RatePlansService } from './rate-plans.service';

/** Room rates are catalog pricing: products edit sets them; the desk reads them to quote. */
const READ = [PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.SERVICE_BOOKINGS_VIEW];

@ApiTags('Hotel - Rate Plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hotel/rate-plans')
export class RatePlansController {
  constructor(private readonly service: RatePlansService) {}

  @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: RatePlanDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('active') active?: string, @Query('planType') planType?: string) {
    requireAny(user, READ, 'Rate plans dekhne');
    return this.service.list(user, { active: active === 'true' ? true : active === 'false' ? false : undefined, planType });
  }
  @Get('applicable') applicable(@GetUser() user: AuthenticatedUser, @Query() q: Record<string, string | undefined>) {
    requireAny(user, READ, 'Rate plans dekhne');
    return this.service.applicableFor(user, { date: q.date ?? '', roomTypeId: q.roomTypeId, source: q.source });
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { requireAny(user, READ, 'Rate plans dekhne'); return this.service.getOne(user, id); }
  @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: RatePlanDto) { return this.service.update(user, id, dto); }
  @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
