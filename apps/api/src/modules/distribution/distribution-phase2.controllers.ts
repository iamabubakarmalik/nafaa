/**
 * HTTP routes of distribution phase 2, under /api/distribution: vans, market
 * returns, principals and claims, targets and the cheque register.
 * Permissions come from the `distribution/...` rules in
 * common/constants/permission-routes.ts; the services narrow further where
 * noted (a salesman sees his own van, a collector his own returns).
 */

import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { DistributionEnabledGuard } from './distribution-access';
import {
  ChequeActionDto, ClaimRangeDto, CopyTargetsDto, CreateClaimDto, CreateMarketReturnDto, ListChequesDto, ListClaimsDto, ListMarketReturnsDto,
  ReceiveClaimDto, ReturnIdsDto, SaveTargetDto, SaveVanDto, SetPrincipalBrandsDto, SubmitClaimDto, TargetsQueryDto,
  UpdateTargetDto, UpdateVanDto, VanCloseDto, VanLoadDto, VanOpenDto, VanSellDto,
} from './dto/phase2.dto';
import { VansService } from './services/vans.service';
import { MarketReturnsService } from './services/market-returns.service';
import { PrincipalsService } from './services/principals.service';
import { ClaimsService } from './services/claims.service';
import { TargetsService } from './services/targets.service';
import { ChequesService } from './services/cheques.service';

@ApiTags('Distribution — vans')
@ApiBearerAuth()
@UseGuards(DistributionEnabledGuard)
@Controller('distribution/vans')
export class VansController {
  constructor(private readonly vans: VansService) {}

  @Get()
  list(@GetUser() user: AuthenticatedUser) {
    return this.vans.list(user);
  }

  /** The caller's own van(s) with the open day: the salesman's phone starts here. */
  @Get('mine')
  mine(@GetUser() user: AuthenticatedUser) {
    return this.vans.list(user, { mine: true });
  }

  @Get('sessions/:sessionId')
  session(@GetUser() user: AuthenticatedUser, @Param('sessionId') sessionId: string) {
    return this.vans.session(user, sessionId);
  }

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: SaveVanDto) {
    return this.vans.create(user, dto);
  }

  @Get(':id')
  get(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.vans.get(user, id);
  }

  @Patch(':id')
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateVanDto) {
    return this.vans.update(user, id, dto);
  }

  @Post(':id/open')
  open(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: VanOpenDto) {
    return this.vans.open(user, id, dto);
  }

  @Post(':id/load')
  load(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: VanLoadDto) {
    return this.vans.load(user, id, dto);
  }

  /** Spot invoice from the van (distribution.vans.sell). */
  @Post(':id/sell')
  sell(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: VanSellDto) {
    return this.vans.sell(user, id, dto);
  }

  @Get(':id/close')
  closePreview(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.vans.closePreview(user, id);
  }

  @Post(':id/close')
  close(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: VanCloseDto) {
    return this.vans.close(user, id, dto);
  }

  @Get(':id/sessions')
  sessions(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.vans.sessions(user, id);
  }
}

@ApiTags('Distribution — market returns')
@ApiBearerAuth()
@UseGuards(DistributionEnabledGuard)
@Controller('distribution/returns')
export class MarketReturnsController {
  constructor(private readonly returns: MarketReturnsService) {}

  @Get()
  list(@GetUser() user: AuthenticatedUser, @Query() q: ListMarketReturnsDto) {
    return this.returns.list(user, q);
  }

  /** Rates and principal of each line, saving nothing. */
  @Post('preview')
  preview(@GetUser() user: AuthenticatedUser, @Body() dto: CreateMarketReturnDto) {
    return this.returns.preview(user, dto);
  }

  @Post('approve')
  approve(@GetUser() user: AuthenticatedUser, @Body() dto: ReturnIdsDto) {
    return this.returns.approve(user, dto.ids, dto.managerPin);
  }

  @Post('reject')
  reject(@GetUser() user: AuthenticatedUser, @Body() dto: ReturnIdsDto) {
    return this.returns.reject(user, dto.ids, dto.reason);
  }

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateMarketReturnDto) {
    return this.returns.create(user, dto);
  }

  @Get(':id')
  get(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.returns.get(user, id);
  }
}

@ApiTags('Distribution — principals')
@ApiBearerAuth()
@UseGuards(DistributionEnabledGuard)
@Controller('distribution/principals')
export class PrincipalsController {
  constructor(private readonly principals: PrincipalsService) {}

  @Get()
  list(@GetUser() user: AuthenticatedUser) {
    return this.principals.list(user);
  }

  @Put(':supplierId/brands')
  setBrands(@GetUser() user: AuthenticatedUser, @Param('supplierId') supplierId: string, @Body() dto: SetPrincipalBrandsDto) {
    return this.principals.setBrands(user, supplierId, dto.brandIds);
  }
}

@ApiTags('Distribution — claims')
@ApiBearerAuth()
@UseGuards(DistributionEnabledGuard)
@Controller('distribution/claims')
export class ClaimsController {
  constructor(private readonly claims: ClaimsService) {}

  @Get()
  list(@GetUser() user: AuthenticatedUser, @Query() q: ListClaimsDto) {
    return this.claims.list(user, q);
  }

  /** Unclaimed totals per principal for a period. */
  @Get('pending')
  pending(@GetUser() user: AuthenticatedUser, @Query() q: ClaimRangeDto) {
    return this.claims.pending(user, q);
  }

  /** The lines a claim would carry (supplierId required). */
  @Get('preview')
  preview(@GetUser() user: AuthenticatedUser, @Query() q: ClaimRangeDto) {
    return this.claims.preview(user, q);
  }

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateClaimDto) {
    return this.claims.create(user, dto);
  }

  /** Claim statement (print kind claim-statement); the web makes the CSV from it. */
  @Get(':id')
  get(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.claims.get(user, id);
  }

  @Post(':id/submit')
  submit(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: SubmitClaimDto) {
    return this.claims.submit(user, id, dto);
  }

  @Post(':id/receive')
  receive(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ReceiveClaimDto) {
    return this.claims.receive(user, id, dto);
  }

  @Post(':id/cancel')
  cancel(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.claims.cancel(user, id);
  }
}

@ApiTags('Distribution — targets')
@ApiBearerAuth()
@UseGuards(DistributionEnabledGuard)
@Controller('distribution/targets')
export class TargetsController {
  constructor(private readonly targets: TargetsService) {}

  @Get()
  list(@GetUser() user: AuthenticatedUser, @Query() q: TargetsQueryDto) {
    return this.targets.list(user, q);
  }

  @Post('copy')
  copy(@GetUser() user: AuthenticatedUser, @Body() dto: CopyTargetsDto) {
    return this.targets.copy(user, dto);
  }

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: SaveTargetDto) {
    return this.targets.create(user, dto);
  }

  @Patch(':id')
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateTargetDto) {
    return this.targets.update(user, id, dto);
  }

  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.targets.remove(user, id);
  }
}

@ApiTags('Distribution — cheques')
@ApiBearerAuth()
@UseGuards(DistributionEnabledGuard)
@Controller('distribution/cheques')
export class ChequesController {
  constructor(private readonly cheques: ChequesService) {}

  @Get()
  list(@GetUser() user: AuthenticatedUser, @Query() q: ListChequesDto) {
    return this.cheques.list(user, q);
  }

  @Post(':id/deposit')
  deposit(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ChequeActionDto) {
    return this.cheques.deposit(user, id, dto);
  }

  @Post(':id/clear')
  clear(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ChequeActionDto) {
    return this.cheques.clear(user, id, dto);
  }

  @Post(':id/bounce')
  bounce(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ChequeActionDto) {
    return this.cheques.bounce(user, id, dto);
  }

  @Post(':id/cancel')
  cancel(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ChequeActionDto) {
    return this.cheques.cancel(user, id, dto);
  }
}
