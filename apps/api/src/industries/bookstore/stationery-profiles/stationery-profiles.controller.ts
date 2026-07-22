import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { StationeryProfilesService } from './stationery-profiles.service';

@ApiTags('Bookstore - Stationery Profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookstore/stationery-profiles')
export class StationeryProfilesController {
  constructor(private readonly service: StationeryProfilesService) {}

  @Post() upsert(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.upsert(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query() query: any) {
    return this.service.list(user, {
      ...query,
      isSchoolItem: query.isSchoolItem === 'true' ? true : undefined,
      isOfficeItem: query.isOfficeItem === 'true' ? true : undefined,
      isFastMoving: query.isFastMoving === 'true' ? true : undefined,
    });
  }
  @Get('by-product/:productId') byProduct(@GetUser() user: AuthenticatedUser, @Param('productId') productId: string) { return this.service.byProduct(user, productId); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
