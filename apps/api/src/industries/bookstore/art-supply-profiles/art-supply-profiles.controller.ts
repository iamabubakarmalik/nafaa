import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ArtSupplyProfilesService } from './art-supply-profiles.service';

@ApiTags('Bookstore - Art Supply Profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookstore/art-supply-profiles')
export class ArtSupplyProfilesController {
  constructor(private readonly service: ArtSupplyProfilesService) {}

  @Post() upsert(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.upsert(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query() query: any) {
    return this.service.list(user, {
      ...query,
      isProfessional: query.isProfessional === 'true' ? true : undefined,
      isBeginner: query.isBeginner === 'true' ? true : undefined,
    });
  }
  @Get('by-product/:productId') byProduct(@GetUser() user: AuthenticatedUser, @Param('productId') productId: string) { return this.service.byProduct(user, productId); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
