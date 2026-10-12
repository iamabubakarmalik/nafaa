import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { MergeTaxonomyDto } from '../taxonomy/merge.dto';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/create-category.dto';

@ApiTags('Categories')
@ApiBearerAuth()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(user, dto);
  }

  @Get()
  findAll(@GetUser() user: AuthenticatedUser) {
    return this.categoriesService.findAll(user);
  }

  @Get('insights')
  insights(@GetUser() user: AuthenticatedUser, @Query('from') from?: string, @Query('to') to?: string) {
    return this.categoriesService.insights(user, from, to);
  }

  @Patch(':id')
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(user, id, dto);
  }

  @Post(':id/merge')
  merge(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: MergeTaxonomyDto) {
    return this.categoriesService.merge(user, id, dto.intoId);
  }

  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.categoriesService.remove(user, id);
  }
}
