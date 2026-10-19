import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { MembersService } from './members.service';
import { UpsertMemberDto } from './dto/upsert-member.dto';

const P = PERMISSIONS;

@ApiTags('Gym - Members')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gym/members')
export class MembersController {
  constructor(private readonly service: MembersService) {}

  @Post() @RequirePermissions(P.CUSTOMERS_EDIT)
  create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertMemberDto) { return this.service.create(user, dto); }

  @Get() @RequirePermissions(P.CUSTOMERS_VIEW)
  list(
    @GetUser() user: AuthenticatedUser,
    @Query('status') status?: string, @Query('goal') goal?: string, @Query('search') search?: string,
    @Query('hasActiveMembership') hasActiveMembership?: string,
    @Query('view') view?: string, @Query('page') page?: string, @Query('limit') limit?: string,
    @Query('expiringDays') expiringDays?: string, @Query('planId') planId?: string, @Query('customerId') customerId?: string,
  ) {
    return this.service.list(user, {
      status, goal, search, view, page, limit, expiringDays, planId, customerId,
      hasActiveMembership: hasActiveMembership === 'true' ? true : hasActiveMembership === 'false' ? false : undefined,
    });
  }

  @Get('summary') @RequirePermissions(P.CUSTOMERS_VIEW)
  summary(@GetUser() user: AuthenticatedUser) { return this.service.summary(user); }

  @Get('by-qr/:qrCode') @RequirePermissions(P.CUSTOMERS_VIEW)
  byQr(@GetUser() user: AuthenticatedUser, @Param('qrCode') qrCode: string) { return this.service.byQrCode(user, qrCode); }

  @Get('by-rfid/:rfidCard') @RequirePermissions(P.CUSTOMERS_VIEW)
  byRfid(@GetUser() user: AuthenticatedUser, @Param('rfidCard') rfidCard: string) { return this.service.byRfid(user, rfidCard); }

  @Get(':id') @RequirePermissions(P.CUSTOMERS_VIEW)
  getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }

  @Patch(':id') @RequirePermissions(P.CUSTOMERS_EDIT)
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertMemberDto) { return this.service.update(user, id, dto); }

  /** Marks the member as left; nothing is deleted. */
  @Delete(':id') @RequirePermissions(P.CUSTOMERS_EDIT)
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
