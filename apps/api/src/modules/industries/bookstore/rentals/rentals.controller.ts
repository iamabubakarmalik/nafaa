import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { RentalsService } from './rentals.service';

@ApiTags('Bookstore - Rentals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookstore/rentals')
export class RentalsController {
  constructor(private readonly service: RentalsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query() query: any) {
    return this.service.list(user, { ...query, overdue: query.overdue === 'true' });
  }
  @Post(':id/return') return(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.returnBook(user, id, dto); }
  @Post(':id/lost') lost(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.markLost(user, id); }
  @Post(':id/cancel') cancel(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.cancel(user, id); }
  @Post('update-overdue') updateOverdue(@GetUser() user: AuthenticatedUser) { return this.service.updateOverdueStatus(user); }
}
