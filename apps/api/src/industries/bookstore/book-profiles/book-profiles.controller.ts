import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { BookProfilesService } from './book-profiles.service';
import { UpsertBookDto } from './dto/upsert-book.dto';

@ApiTags('Bookstore - Book Profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookstore/book-profiles')
export class BookProfilesController {
  constructor(private readonly service: BookProfilesService) {}

  @Post() upsert(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertBookDto) { return this.service.upsert(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query() query: any) {
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
  @Get('by-product/:productId') byProduct(@GetUser() user: AuthenticatedUser, @Param('productId') productId: string) { return this.service.byProduct(user, productId); }
  @Get('by-isbn/:isbn') byIsbn(@GetUser() user: AuthenticatedUser, @Param('isbn') isbn: string) { return this.service.byIsbn(user, isbn); }
  @Get('by-academic') byAcademic(@GetUser() user: AuthenticatedUser, @Query('board') board?: string, @Query('grade') grade?: string, @Query('subject') subject?: string) {
    return this.service.findByAcademic(user, { board, grade, subject });
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
