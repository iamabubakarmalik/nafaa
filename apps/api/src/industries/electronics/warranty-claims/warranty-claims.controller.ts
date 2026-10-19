import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { WarrantyClaimsService } from './warranty-claims.service';
import { BrandContactDto, CreateClaimDto, ListClaimsDto, ResolveClaimDto, UpdateClaimStatusDto } from './dto/create-claim.dto';

/** Reading and changing claims follow the warranty permissions (permission-routes). */
@ApiTags('Electronics - Warranty Claims')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('electronics/warranty-claims')
export class WarrantyClaimsController {
  constructor(private readonly service: WarrantyClaimsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateClaimDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('customerId') customerId?: string, @Query('sentToBrand') sentToBrand?: string, @Query('from') from?: string, @Query('to') to?: string, @Query('search') search?: string) {
    return this.service.list(user, {
      status, customerId, from, to, search,
      sentToBrand: sentToBrand === 'true' ? true : sentToBrand === 'false' ? false : undefined,
    });
  }
  @Get('page') page(@GetUser() user: AuthenticatedUser, @Query() q: ListClaimsDto) { return this.service.page(user, q); }
  @Get('summary') summary(@GetUser() user: AuthenticatedUser) { return this.service.summary(user); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateClaimStatusDto) { return this.service.updateStatus(user, id, dto); }
  @Post(':id/contact-brand') contactBrand(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: BrandContactDto) { return this.service.contactBrand(user, id, dto); }
  /** Settling can post a bill and pay from the drawer, so it also needs POS use; a replacement also needs stock adjustment (checked in the service). */
  @RequirePermissions(PERMISSIONS.ELECTRONICS_WARRANTY_MANAGE, PERMISSIONS.POS_USE)
  @Post(':id/resolve') resolve(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ResolveClaimDto) { return this.service.resolve(user, id, dto); }
  /** Cancels the claim; nothing is deleted. */
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
