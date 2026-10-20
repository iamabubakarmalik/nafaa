import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { AuthorsService } from './authors.service';
import { UpsertAuthorDto } from './dto/upsert-author.dto';

/** Authors are catalog data: products.view to read, products.edit to change. */
@ApiTags('Bookstore - Authors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookstore/authors')
export class AuthorsController {
  constructor(private readonly service: AuthorsService) {}

  @Post() @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT) create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertAuthorDto) { return this.service.create(user, dto); }
  @Get() @RequirePermissions(PERMISSIONS.PRODUCTS_VIEW) list(@GetUser() user: AuthenticatedUser, @Query('search') search?: string, @Query('nationality') nationality?: string, @Query('genre') genre?: string, @Query('language') language?: string, @Query('featured') featured?: string, @Query('active') active?: string) {
    return this.service.list(user, {
      search, nationality, genre, language,
      featured: featured === 'true' ? true : undefined,
      active: active === 'true' ? true : active === 'false' ? false : undefined,
    });
  }
  @Get(':id') @RequirePermissions(PERMISSIONS.PRODUCTS_VIEW) getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT) update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertAuthorDto) { return this.service.update(user, id, dto); }
  @Post(':id/toggle-featured') @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT) toggle(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.toggleFeatured(user, id); }
  @Delete(':id') @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT) remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
