import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ApplianceWarrantyClaimsService } from './warranty-claims.service';
import {
  BrandResponseDto, CreateClaimDto, SettleClaimDto, SubmitClaimDto, UpdateClaimDto,
} from './dto/upsert-claim.dto';

const bool = (v?: string) => (v === 'true' ? true : v === 'false' ? false : undefined);

@ApiTags('Appliances - Warranty Claims')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('appliances/warranty-claims')
export class ApplianceWarrantyClaimsController {
  constructor(private readonly service: ApplianceWarrantyClaimsService) {}

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateClaimDto) {
    return this.service.create(user, dto);
  }

  /** Mukammal warranty repair se claim khud bhar kar banayein */
  @Post('from-service/:serviceRequestId')
  fromService(@GetUser() user: AuthenticatedUser, @Param('serviceRequestId') serviceRequestId: string) {
    return this.service.createFromService(user, serviceRequestId);
  }

  @Get()
  list(
    @GetUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('open') open?: string,
    @Query('brandId') brandId?: string,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list(user, {
      status, brandId, search, from, to,
      open: bool(open),
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('summary')
  summary(@GetUser() user: AuthenticatedUser) {
    return this.service.summary(user);
  }

  /** Jin warranty repairs ka claim banaya hi nahi gaya */
  @Get('missing')
  missing(@GetUser() user: AuthenticatedUser) {
    return this.service.missingClaims(user);
  }

  @Get(':id')
  getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.getOne(user, id);
  }

  @Patch(':id')
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateClaimDto) {
    return this.service.update(user, id, dto);
  }

  /** Brand ko bhej diya */
  @Post(':id/submit')
  submit(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: SubmitClaimDto) {
    return this.service.submit(user, id, dto);
  }

  /** Brand ka jawab aa gaya */
  @Post(':id/brand-response')
  brandResponse(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: BrandResponseDto) {
    return this.service.brandResponse(user, id, dto);
  }

  /** Brand se paisa mil gaya */
  @Post(':id/settle')
  settle(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: SettleClaimDto) {
    return this.service.settle(user, id, dto);
  }

  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
