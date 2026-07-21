import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { MembersService } from './members.service';
import { UpsertMemberDto } from './dto/upsert-member.dto';

@ApiTags('Gym - Members')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gym/members')
export class MembersController {
  constructor(private readonly service: MembersService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertMemberDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('goal') goal?: string, @Query('search') search?: string, @Query('hasActiveMembership') hasActiveMembership?: string) {
    return this.service.list(user, {
      status, goal, search,
      hasActiveMembership: hasActiveMembership === 'true' ? true : hasActiveMembership === 'false' ? false : undefined,
    });
  }
  @Get('summary') summary(@GetUser() user: AuthenticatedUser) { return this.service.summary(user); }
  @Get('by-qr/:qrCode') byQr(@GetUser() user: AuthenticatedUser, @Param('qrCode') qrCode: string) { return this.service.byQrCode(user, qrCode); }
  @Get('by-rfid/:rfidCard') byRfid(@GetUser() user: AuthenticatedUser, @Param('rfidCard') rfidCard: string) { return this.service.byRfid(user, rfidCard); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertMemberDto) { return this.service.update(user, id, dto); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
