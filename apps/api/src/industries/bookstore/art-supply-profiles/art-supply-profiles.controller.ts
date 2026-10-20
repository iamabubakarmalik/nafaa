import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ArtSupplyProfilesService } from './art-supply-profiles.service';

/** Art supply details are catalog data. */
@ApiTags('Bookstore - Art Supply Profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookstore/art-supply-profiles')
export class ArtSupplyProfilesController {
  constructor(private readonly service: ArtSupplyProfilesService) {}

  @Post() @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT) upsert(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.upsert(user, dto); }
  @Get() @RequirePermissions(PERMISSIONS.PRODUCTS_VIEW) list(@GetUser() user: AuthenticatedUser, @Query() query: any) {
    return this.service.list(user, {
      ...query,
      isProfessional: query.isProfessional === 'true' ? true : undefined,
      isBeginner: query.isBeginner === 'true' ? true : undefined,
    });
  }
  @Get('by-product/:productId') @RequirePermissions(PERMISSIONS.PRODUCTS_VIEW) byProduct(@GetUser() user: AuthenticatedUser, @Param('productId') productId: string) { return this.service.byProduct(user, productId); }
  @Delete(':id') @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT) remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
