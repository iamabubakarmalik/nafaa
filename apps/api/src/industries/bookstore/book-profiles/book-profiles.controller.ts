import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { BookProfilesService } from './book-profiles.service';
import { UpsertBookDto } from './dto/upsert-book.dto';

/** Book details are catalog data: products.view to read, products.edit to change. */
@ApiTags('Bookstore - Book Profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookstore/book-profiles')
export class BookProfilesController {
  constructor(private readonly service: BookProfilesService) {}

  @Post() @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT) upsert(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertBookDto) { return this.service.upsert(user, dto); }
  @Get() @RequirePermissions(PERMISSIONS.PRODUCTS_VIEW) list(@GetUser() user: AuthenticatedUser, @Query() query: any) {
    return this.service.list(user, {
      ...query,
      isTextbook: query.isTextbook === 'true' ? true : query.isTextbook === 'false' ? false : undefined,
      isBestSeller: query.isBestSeller === 'true' ? true : undefined,
      isNewArrival: query.isNewArrival === 'true' ? true : undefined,
      isFeatured: query.isFeatured === 'true' ? true : undefined,
      isAwardWinner: query.isAwardWinner === 'true' ? true : undefined,
      isRentable: query.isRentable === 'true' ? true : undefined,
    });
  }
  @Get('facts') @RequirePermissions(PERMISSIONS.PRODUCTS_VIEW) facts(@GetUser() user: AuthenticatedUser) { return this.service.facts(user); }
  @Get('by-product/:productId') @RequirePermissions(PERMISSIONS.PRODUCTS_VIEW) byProduct(@GetUser() user: AuthenticatedUser, @Param('productId') productId: string) { return this.service.byProduct(user, productId); }
  @Get('by-isbn/:isbn') @RequirePermissions(PERMISSIONS.PRODUCTS_VIEW) byIsbn(@GetUser() user: AuthenticatedUser, @Param('isbn') isbn: string) { return this.service.byIsbn(user, isbn); }
  @Get('by-academic') @RequirePermissions(PERMISSIONS.PRODUCTS_VIEW) byAcademic(@GetUser() user: AuthenticatedUser, @Query('board') board?: string, @Query('grade') grade?: string, @Query('subject') subject?: string) {
    return this.service.findByAcademic(user, { board, grade, subject });
  }
  @Get(':id') @RequirePermissions(PERMISSIONS.PRODUCTS_VIEW) getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Delete(':id') @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT) remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
