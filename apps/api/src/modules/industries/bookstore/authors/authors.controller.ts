import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { AuthorsService } from './authors.service';
import { UpsertAuthorDto } from './dto/upsert-author.dto';

@ApiTags('Bookstore - Authors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookstore/authors')
export class AuthorsController {
  constructor(private readonly service: AuthorsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertAuthorDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('search') search?: string, @Query('nationality') nationality?: string, @Query('genre') genre?: string, @Query('language') language?: string, @Query('featured') featured?: string, @Query('active') active?: string) {
    return this.service.list(user, {
      search, nationality, genre, language,
      featured: featured === 'true' ? true : undefined,
      active: active === 'true' ? true : active === 'false' ? false : undefined,
    });
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertAuthorDto) { return this.service.update(user, id, dto); }
  @Post(':id/toggle-featured') toggle(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.toggleFeatured(user, id); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
