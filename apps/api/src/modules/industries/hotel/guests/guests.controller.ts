import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { GuestsService } from './guests.service';

@ApiTags('Hotel - Guests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hotel/guests')
export class GuestsController {
  constructor(private readonly service: GuestsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query() q: any) {
    return this.service.list(user, {
      nationality: q.nationality, search: q.search,
      isVIP: q.isVIP === 'true' ? true : q.isVIP === 'false' ? false : undefined,
      isBlacklisted: q.isBlacklisted === 'true' ? true : q.isBlacklisted === 'false' ? false : undefined,
    });
  }
  @Get('stats') stats(@GetUser() user: AuthenticatedUser) { return this.service.stats(user); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.update(user, id, dto); }
  @Post(':id/blacklist') blacklist(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { reason: string }) { return this.service.blacklist(user, id, body.reason); }
  @Post(':id/unblacklist') unblacklist(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.unblacklist(user, id); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
