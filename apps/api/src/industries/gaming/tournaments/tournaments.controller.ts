import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { TournamentsService } from './tournaments.service';
import { CancelTournamentDto, CompleteTournamentDto, PayPrizeDto, RegisterPlayerDto, UpsertTournamentDto } from './dto/tournament.dto';

/** Setting up an event (fee, prizes, seats) is like pricing a product; taking entry fees is counter work; prizes are expenses. */
@ApiTags('Gaming - Tournaments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gaming/tournaments')
export class TournamentsController {
  constructor(private readonly service: TournamentsService) {}

  @Post() @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertTournamentDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('platform') platform?: string, @Query('upcoming') upcoming?: string, @Query('search') search?: string) {
    return this.service.list(user, { status, platform, upcoming: upcoming === 'true', search });
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Get(':id/players') players(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.players(user, id); }
  @Patch(':id') @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertTournamentDto) { return this.service.update(user, id, dto); }
  @Post(':id/register') @RequirePermissions(PERMISSIONS.POS_USE)
  register(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: RegisterPlayerDto) { return this.service.registerParticipant(user, id, dto); }
  @Post(':id/prize') @RequirePermissions(PERMISSIONS.EXPENSES_CREATE)
  prize(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('id') id: string, @Body() dto: PayPrizeDto) { return this.service.payPrize(user, shop, id, dto); }
  @Post(':id/start') @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  start(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.start(user, id); }
  @Post(':id/complete') @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  complete(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CompleteTournamentDto) { return this.service.completeTournament(user, id, dto); }
  @Post(':id/cancel') @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  cancel(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CancelTournamentDto) { return this.service.cancel(user, id, dto.reason); }
  /** Older screens: cancels instead of deleting. */
  @Delete(':id') @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.cancel(user, id, 'Hata diya'); }
}
