import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { assertCan } from '../common/gym-common';
import { CancelPtPackageDto, SellPtPackageDto } from './dto/pt.dto';
import { PtPackagesService } from './pt-packages.service';

const P = PERMISSIONS;
const SEE = [P.SERVICE_BOOKINGS_VIEW, P.SERVICE_BOOKINGS_MANAGE, P.CUSTOMERS_VIEW];

/** Selling a package is a booking (service.bookings.manage) and a bill (pos.use, checked in the service). */
@ApiTags('Gym - PT Packages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gym/pt-packages')
export class PtPackagesController {
  constructor(private readonly service: PtPackagesService) {}

  @Post() @RequirePermissions(P.SERVICE_BOOKINGS_MANAGE)
  sell(@GetUser() user: AuthenticatedUser, @Body() dto: SellPtPackageDto) { return this.service.sell(user, dto); }

  @Get()
  list(
    @GetUser() user: AuthenticatedUser,
    @Query('memberId') memberId?: string, @Query('trainerId') trainerId?: string, @Query('status') status?: string,
    @Query('search') search?: string, @Query('page') page?: string, @Query('limit') limit?: string,
  ) {
    assertCan(user, SEE, 'PT packages dekhne');
    return this.service.list(user, { memberId, trainerId, status, search, page, limit });
  }

  @Get(':id')
  getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    assertCan(user, SEE, 'PT package dekhne');
    return this.service.getOne(user, id);
  }

  @Post(':id/cancel') @RequirePermissions(P.SERVICE_BOOKINGS_MANAGE)
  cancel(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CancelPtPackageDto) { return this.service.cancel(user, id, dto); }
}
