import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { assertCan } from '../common/gym-common';
import { CreateTrainerDto, TrainerPayoutDto, UpdateTrainerDto } from './dto/trainer.dto';
import { TrainersService } from './trainers.service';

const P = PERMISSIONS;
/** The desk books PT with a trainer, so members or bookings view is enough to see the list. */
const SEE = [P.STAFF_VIEW, P.SERVICE_BOOKINGS_VIEW, P.SERVICE_BOOKINGS_MANAGE, P.CUSTOMERS_VIEW];

/** Trainers are staff: changing them needs staff.manage; commission routes check commission rights in the service. */
@ApiTags('Gym - Trainers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gym/trainers')
export class TrainersController {
  constructor(private readonly service: TrainersService) {}

  @Post() @RequirePermissions(P.STAFF_MANAGE)
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateTrainerDto) { return this.service.create(user, dto); }

  @Get()
  list(@GetUser() user: AuthenticatedUser, @Query('role') role?: string, @Query('available') available?: string, @Query('search') search?: string, @Query('includeLeft') includeLeft?: string) {
    return this.service.list(user, {
      role, search, includeLeft: includeLeft === 'true',
      available: available === 'true' ? true : available === 'false' ? false : undefined,
    });
  }

  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { assertCan(user, SEE, 'Trainer dekhne'); return this.service.getOne(user, id); }

  @Get(':id/availability') availability(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Query('date') date: string) { assertCan(user, SEE, 'Trainer dekhne'); return this.service.availability(user, id, date); }

  @Get(':id/commission')
  commission(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Query('from') from?: string, @Query('to') to?: string) { return this.service.commission(user, id, from, to); }

  @Get(':id/payouts')
  payouts(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.payouts(user, id); }

  @Post(':id/payout')
  pay(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('id') id: string, @Body() dto: TrainerPayoutDto) { return this.service.pay(user, shop, id, dto); }

  @Patch(':id') @RequirePermissions(P.STAFF_MANAGE)
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateTrainerDto) { return this.service.update(user, id, dto); }

  /** Marks the trainer as left; nothing is deleted. */
  @Delete(':id') @RequirePermissions(P.STAFF_MANAGE)
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
