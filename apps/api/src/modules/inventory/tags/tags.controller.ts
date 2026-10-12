import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { TagsService } from './tags.service';
import { UpdateTagDto, UpsertTagDto } from './dto/upsert-tag.dto';
import { MergeTaxonomyDto } from '../taxonomy/merge.dto';

@ApiTags('Tags')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tags')
export class TagsController {
  constructor(private readonly service: TagsService) {}

  @Get()
  list(@GetUser() user: AuthenticatedUser) {
    return this.service.list(user);
  }

  @Get('insights')
  insights(@GetUser() user: AuthenticatedUser, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.insights(user, from, to);
  }

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertTagDto) {
    return this.service.create(user, dto);
  }

  @Patch(':id')
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateTagDto) {
    return this.service.update(user, id, dto);
  }

  @Post(':id/merge')
  merge(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: MergeTaxonomyDto) {
    return this.service.merge(user, id, dto.intoId);
  }

  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
