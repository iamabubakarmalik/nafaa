import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { WarrantyService } from './warranty.service';
import { ApproveClaimDto, CreateClaimDto, ListClaimsQuery, RejectClaimDto } from './dto/claim.dto';

/** Warranty view/manage permissions through the shared `services-biz/warranty` rule. */
@ApiTags('Service Business - Warranty')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('services-biz/warranty')
export class WarrantyController {
  constructor(private readonly service: WarrantyService) {}

  @Get('register') register(@GetUser() user: AuthenticatedUser, @Query('search') search?: string) { return this.service.register(user, search); }
  @Post('claims') create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateClaimDto) { return this.service.createClaim(user, dto); }
  @Get('claims') list(@GetUser() user: AuthenticatedUser, @Query() q: ListClaimsQuery) { return this.service.listClaims(user, q); }
  @Get('claims/:id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getClaim(user, id); }
  @Post('claims/:id/approve') approve(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: ApproveClaimDto) { return this.service.approve(user, id, body); }
  @Post('claims/:id/reject') reject(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: RejectClaimDto) { return this.service.reject(user, id, body.reason); }
  @Post('claims/:id/create-job') createJob(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.createServiceJob(user, id); }
}
