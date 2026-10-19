import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { requireAny } from '../common/hotel-common';
import { GuestDto, ReasonDto } from '../common/hotel.dto';
import { GuestsService } from './guests.service';

/** The front desk looks guests up for bookings; the register itself is customer records. */
const READ = [PERMISSIONS.CUSTOMERS_VIEW, PERMISSIONS.SERVICE_BOOKINGS_VIEW];

@ApiTags('Hotel - Guests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hotel/guests')
export class GuestsController {
  constructor(private readonly service: GuestsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: GuestDto) {
    requireAny(user, [PERMISSIONS.CUSTOMERS_EDIT, PERMISSIONS.SERVICE_BOOKINGS_MANAGE], 'Guest banane');
    return this.service.create(user, dto);
  }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query() q: Record<string, string | undefined>) {
    requireAny(user, READ, 'Guests dekhne');
    return this.service.list(user, {
      nationality: q.nationality, search: q.search, customerId: q.customerId,
      isVIP: q.isVIP === 'true' ? true : q.isVIP === 'false' ? false : undefined,
      isBlacklisted: q.isBlacklisted === 'true' ? true : q.isBlacklisted === 'false' ? false : undefined,
    });
  }
  @Get('page') page(@GetUser() user: AuthenticatedUser, @Query() q: Record<string, string | undefined>) { requireAny(user, READ, 'Guests dekhne'); return this.service.page(user, q); }
  @Get('stats') stats(@GetUser() user: AuthenticatedUser) { requireAny(user, READ, 'Guests dekhne'); return this.service.stats(user); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { requireAny(user, READ, 'Guests dekhne'); return this.service.getOne(user, id); }
  @RequirePermissions(PERMISSIONS.CUSTOMERS_EDIT)
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: GuestDto) { return this.service.update(user, id, dto); }
  @RequirePermissions(PERMISSIONS.CUSTOMERS_EDIT)
  @Post(':id/blacklist') blacklist(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: ReasonDto) { return this.service.blacklist(user, id, body.reason); }
  @RequirePermissions(PERMISSIONS.CUSTOMERS_EDIT)
  @Post(':id/unblacklist') unblacklist(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.unblacklist(user, id); }
  @RequirePermissions(PERMISSIONS.CUSTOMERS_EDIT)
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
